// Vercel serverless function — /api/tts
// Proxies text to ElevenLabs and streams MP3 back
const https = require('https');

const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text' });
  if (!process.env.ELEVENLABS_API_KEY) return res.status(503).json({ error: 'ElevenLabs key not configured' });

  const body = JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${VOICE_ID}`,
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Accept': 'audio/mpeg'
    }
  };

  const elReq = https.request(options, function(elRes) {
    if (elRes.statusCode !== 200) {
      let err = '';
      elRes.on('data', d => err += d);
      elRes.on('end', () => res.status(elRes.statusCode).json({ error: 'ElevenLabs error', detail: err }));
      return;
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    elRes.pipe(res);
  });

  elReq.on('error', function(err) {
    res.status(500).json({ error: err.message });
  });

  elReq.write(body);
  elReq.end();
};
