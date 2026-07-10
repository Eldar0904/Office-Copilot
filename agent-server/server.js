require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';

/* ─── Agent tools ─── */
const tools = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task and add it to the task list',
      parameters: {
        type: 'object',
        properties: {
          title:    { type: 'string', description: 'Task title' },
          priority: { type: 'string', description: 'Priority: high, medium, or low', enum: ['high','medium','low'] },
          due_time: { type: 'string', description: 'Due time, e.g. "10:00 AM" or "Today"' },
          dept:     { type: 'string', description: 'Department: Finance, Engineering, HR, PMO, Sales, Design, IT' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_message',
      description: 'Send a message to a channel or person in the app',
      parameters: {
        type: 'object',
        properties: {
          to:      { type: 'string', description: 'Channel name (e.g. #general, #engineering) or person name' },
          message: { type: 'string', description: 'The message text to send' }
        },
        required: ['to', 'message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: 'Set a reminder for the user',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'What to remind about' },
          time: { type: 'string', description: 'When to remind, e.g. "in 30 minutes", "at 3pm"' }
        },
        required: ['text', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Get tasks for today or this week',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['today','week','high_priority','pending'] }
        },
        required: ['filter']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as completed',
      parameters: {
        type: 'object',
        properties: {
          task_title: { type: 'string', description: 'Title or partial title of the task' }
        },
        required: ['task_title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'schedule_meeting',
      description: 'Schedule a meeting with team members',
      parameters: {
        type: 'object',
        properties: {
          title:      { type: 'string', description: 'Meeting title' },
          time:       { type: 'string', description: 'When, e.g. "tomorrow at 10am"' },
          attendees:  { type: 'string', description: 'Who to invite' },
          description:{ type: 'string', description: 'Optional agenda' }
        },
        required: ['title', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'summarise_day',
      description: "Summarise the user's day: tasks done, pending, key items",
      parameters: { type: 'object', properties: {}, required: [] }
    }
  }
];

/* ─── System prompt ─── */
const SYSTEM_PROMPT = `You are an intelligent office copilot assistant for Employee Copilot.
You help the user manage their work day by taking actions on their behalf.

The user's name is Sara Ahmed, Product Manager at the PMO department.
Team members: Khalid Al-Rashid (Engineering Manager), Layla Hassan (UX Designer), Omar Yousef (Finance Lead), Rania Saleh (HR Business Partner).
Channels: #general, #engineering, #finance, #hr, #pmo.

When the user asks you to do something, use the appropriate tool.
Always confirm what action you took in a brief, friendly response (1-2 sentences max).
If the user asks a question without needing an action, answer conversationally.
Keep responses short — they will be spoken aloud via voice.
Respond in whatever language the user uses (English, Kazakh, or Russian).`;

/* ─── Chat history per session ─── */
const sessions = {};

/* ─── /agent endpoint ─── */
app.post('/agent', async (req, res) => {
  try {
    const { message, sessionId, context } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const sid = sessionId || 'default';
    if (!sessions[sid]) sessions[sid] = [];

    const userMsg = context
      ? `[Context: ${JSON.stringify(context)}]\n\nUser: ${message}`
      : message;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...sessions[sid],
      { role: 'user', content: userMsg }
    ];

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 512
    });

    const msg = response.choices[0].message;

    // Tool call?
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const call = msg.tool_calls[0];
      const fnName = call.function.name;
      const fnArgs = JSON.parse(call.function.arguments || '{}');

      let confirmText = '';
      switch (fnName) {
        case 'create_task':
          confirmText = `Done! I've added "${fnArgs.title}" to your task list` +
            (fnArgs.priority ? ` with ${fnArgs.priority} priority` : '') +
            (fnArgs.due_time ? ` due at ${fnArgs.due_time}` : '') + '.';
          break;
        case 'send_message':
          confirmText = `Message sent to ${fnArgs.to}: "${fnArgs.message}"`;
          break;
        case 'set_reminder':
          confirmText = `Reminder set! I'll remind you to "${fnArgs.text}" ${fnArgs.time}.`;
          break;
        case 'get_tasks':
          confirmText = `Showing your ${fnArgs.filter} tasks.`;
          break;
        case 'complete_task':
          confirmText = `Marked "${fnArgs.task_title}" as complete. Great work!`;
          break;
        case 'schedule_meeting':
          confirmText = `Meeting scheduled: "${fnArgs.title}" ${fnArgs.time}` +
            (fnArgs.attendees ? ` with ${fnArgs.attendees}` : '') + '.';
          break;
        case 'summarise_day':
          confirmText = `Here\'s your day summary.`;
          break;
        default:
          confirmText = 'Done!';
      }

      sessions[sid].push(
        { role: 'user', content: userMsg },
        { role: 'assistant', content: confirmText }
      );
      if (sessions[sid].length > 40) sessions[sid] = sessions[sid].slice(-40);

      return res.json({ text: confirmText, action: { type: fnName, args: fnArgs } });
    }

    // Plain text response
    const text = msg.content || '';
    sessions[sid].push(
      { role: 'user', content: userMsg },
      { role: 'assistant', content: text }
    );
    if (sessions[sid].length > 40) sessions[sid] = sessions[sid].slice(-40);

    res.json({ text, action: null });

  } catch (err) {
    console.error('Agent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─── /tts endpoint — ElevenLabs ─── */
// Voice: "Rachel" (en) — warm, natural, professional
const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

app.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    if (!process.env.ELEVENLABS_API_KEY) return res.status(503).json({ error: 'No ElevenLabs key configured' });

    const body = JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'audio/mpeg'
      }
    };

    const elReq = https.request(options, (elRes) => {
      if (elRes.statusCode !== 200) {
        let errBody = '';
        elRes.on('data', d => errBody += d);
        elRes.on('end', () => {
          console.error('ElevenLabs error:', elRes.statusCode, errBody);
          res.status(elRes.statusCode).json({ error: 'ElevenLabs error', detail: errBody });
        });
        return;
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      elRes.pipe(res);
    });

    elReq.on('error', (err) => {
      console.error('TTS request error:', err.message);
      res.status(500).json({ error: err.message });
    });

    elReq.write(body);
    elReq.end();

  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', model: MODEL, tts: !!process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'none' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🤖 Copilot Agent running on http://localhost:${PORT}`));
