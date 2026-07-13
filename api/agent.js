// Vercel serverless function — /api/agent
// Proxies chat to Groq LLM with tool support
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

const tools = [
  { type:'function', function:{ name:'create_task', description:'Create a new task', parameters:{ type:'object', properties:{ title:{type:'string'}, priority:{type:'string',enum:['high','medium','low']}, due_time:{type:'string'}, dept:{type:'string'} }, required:['title'] } } },
  { type:'function', function:{ name:'send_message', description:'Send a message to a channel or person', parameters:{ type:'object', properties:{ to:{type:'string'}, message:{type:'string'} }, required:['to','message'] } } },
  { type:'function', function:{ name:'set_reminder', description:'Set a reminder', parameters:{ type:'object', properties:{ text:{type:'string'}, time:{type:'string'} }, required:['text','time'] } } },
  { type:'function', function:{ name:'get_tasks', description:'Get tasks', parameters:{ type:'object', properties:{ filter:{type:'string',enum:['today','week','high_priority','pending']} }, required:['filter'] } } },
  { type:'function', function:{ name:'complete_task', description:'Mark a task complete', parameters:{ type:'object', properties:{ task_title:{type:'string'} }, required:['task_title'] } } },
  { type:'function', function:{ name:'schedule_meeting', description:'Schedule a meeting', parameters:{ type:'object', properties:{ title:{type:'string'}, time:{type:'string'}, attendees:{type:'string'}, description:{type:'string'} }, required:['title','time'] } } },
  { type:'function', function:{ name:'summarise_day', description:"Summarise the user's day", parameters:{ type:'object', properties:{}, required:[] } } }
];

const SYSTEM = `You are an intelligent office copilot assistant for Employee Copilot.
The user's name is Sara Ahmed, Product Manager at the PMO department.
Team: Khalid Al-Rashid (Engineering), Layla Hassan (UX), Omar Yousef (Finance), Rania Saleh (HR).
Channels: #general, #engineering, #finance, #hr, #pmo.
Use tools when asked to act. Keep responses short — they will be spoken aloud.
Respond in whatever language the user uses (English, Kazakh, or Russian).`;

// Simple in-memory session store (resets on cold start — acceptable for serverless)
const sessions = {};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, sessionId, context } = req.body;
    if (!message) return res.status(400).json({ error: 'No message' });

    const sid = sessionId || 'default';
    if (!sessions[sid]) sessions[sid] = [];

    const userMsg = context ? `[Context: ${JSON.stringify(context)}]\n\n${message}` : message;

    const messages = [
      { role: 'system', content: SYSTEM },
      ...sessions[sid],
      { role: 'user', content: userMsg }
    ];

    const response = await groq.chat.completions.create({ model: MODEL, messages, tools, tool_choice: 'auto', temperature: 0.7, max_tokens: 512 });
    const msg = response.choices[0].message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const call = msg.tool_calls[0];
      const fn = call.function.name;
      const args = JSON.parse(call.function.arguments || '{}');
      const confirmMap = {
        create_task: `Done! Added "${args.title}"${args.priority ? ` (${args.priority} priority)` : ''}${args.due_time ? ` due ${args.due_time}` : ''}.`,
        send_message: `Message sent to ${args.to}: "${args.message}"`,
        set_reminder: `Reminder set: "${args.text}" ${args.time}.`,
        get_tasks: `Showing your ${args.filter} tasks.`,
        complete_task: `Marked "${args.task_title}" as complete!`,
        schedule_meeting: `Meeting "${args.title}" scheduled ${args.time}${args.attendees ? ` with ${args.attendees}` : ''}.`,
        summarise_day: `Here's your day summary.`
      };
      const text = confirmMap[fn] || 'Done!';
      sessions[sid].push({ role: 'user', content: userMsg }, { role: 'assistant', content: text });
      if (sessions[sid].length > 40) sessions[sid] = sessions[sid].slice(-40);
      return res.json({ text, action: { type: fn, args } });
    }

    const text = msg.content || '';
    sessions[sid].push({ role: 'user', content: userMsg }, { role: 'assistant', content: text });
    if (sessions[sid].length > 40) sessions[sid] = sessions[sid].slice(-40);
    res.json({ text, action: null });

  } catch (err) {
    console.error('Agent error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
