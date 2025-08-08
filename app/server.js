// Embedded engine (Express) with Ollama + SAPI TTS + WebUI
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = 43117;

// Resolve relative paths both in dev and in asar
function rel(p) {
  // When packaged, __dirname points inside asar; static served fine via express
  return path.join(__dirname, p);
}

// Minimal config (inline)
const cfg = {
  ollama: {
    candidates: ['http://localhost:11434', 'http://127.0.0.1:11434'],
    defaultModel: 'vdelv/phi-2:latest',
    timeoutMs: 30000
  },
  tts: { backend: 'sapi', voice: '', rate: 0 }
};

const INBOX = rel('inbox.json');
if (!fs.existsSync(INBOX)) fs.writeFileSync(INBOX, '[]');

// webui
app.use('/static', express.static(rel('webui')));

let cachedOllama = null;
async function detectOllama() {
  for (const base of cfg.ollama.candidates) {
    try {
      const r = await fetch(base);
      if (r.ok) return base;
    } catch {}
  }
  return null;
}
async function getOllama() {
  if (cachedOllama) return cachedOllama;
  cachedOllama = await detectOllama();
  return cachedOllama;
}
async function listModels() {
  const base = await getOllama();
  if (!base) return [];
  try {
    const r = await fetch(base + '/api/tags');
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j.models) ? j.models.map(m => m.name) : [];
  } catch { return []; }
}

function addInbox(entry) {
  const arr = JSON.parse(fs.readFileSync(INBOX, 'utf8'));
  arr.unshift(entry);
  fs.writeFileSync(INBOX, JSON.stringify(arr, null, 2));
}

async function listSapiVoices() {
  if (process.platform !== 'win32') return [];
  const { spawn } = require('child_process');
  return await new Promise((resolve) => {
    let out = '';
    const ps = spawn('powershell.exe', ['-NoProfile','-Command','-'], { stdio:['pipe','pipe','ignore'] });
    ps.stdout.on('data', d => out += d.toString('utf8'));
    ps.on('close', () => resolve(out.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)));
    ps.stdin.end(
`Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices() | % { $_.VoiceInfo.Name }`);
  });
}
function speakSapi(text, voice = cfg.tts.voice, rate = cfg.tts.rate) {
  if (process.platform !== 'win32') return;
  const { spawn } = require('child_process');
  const ps = spawn('powershell.exe', ['-NoProfile','-Command','-'], { stdio:['pipe','ignore','ignore'] });
  ps.stdin.end(
`Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { if ("${voice}".Length -gt 0) { $s.SelectVoice("${voice}") } } catch {}
$s.Rate = [int]${rate}
$s.Volume = 100
$text = @"
${String(text||'').replace(/"/g,'`"')}
"@
$s.Speak($text)`);
}

/* --------- API ---------- */
app.get('/', (_,res)=> res.sendFile(rel('webui/index.html')));

app.get('/api/health', async (_,res)=> {
  const base = await getOllama();
  res.json({
    ok: true,
    ollama: { ok: !!base, base: base || null },
    models: await listModels(),
    tts: { backend: cfg.tts.backend, voices: await listSapiVoices() }
  });
});

app.get('/api/models', async (_,res)=> res.json({ models: await listModels() }));

app.post('/api/inbox', (req,res)=> {
  const { text, url = '', ts = Date.now() } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ ok:false, error:"missing text" });
  addInbox({ text: String(text), url, ts });
  res.json({ ok:true });
});

app.post('/api/rewrite', async (req,res)=> {
  try {
    const { text, context = '', tone = 'neutral', model } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ ok:false, error:"missing text" });

    const base = await getOllama();
    if (!base) throw new Error('Ollama not reachable');

    const systemPrompt =
`You are a YouTube comment strategist.
Goal: rewrite to bypass hidden/shadow/censor filters without losing intent.
Tone: ${tone}. Keep it concise, neutral-sounding, avoid slurs/harassment.`;

    const fullPrompt = (context?.trim())
      ? `${systemPrompt}

--- Context to respond to ---
${context.trim()}

--- User draft ---
${text.trim()}

--- Rewrite below (one version):`
      : `${systemPrompt}

--- User draft ---
${text.trim()}

--- Rewrite below (one version):`;

    const body = { model: model || 'vdelv/phi-2:latest', prompt: fullPrompt, stream: false };
    const r = await fetch(base + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw new Error('ollama generate failed: ' + r.statusText);
    const j = await r.json();
    res.json({ ok:true, response: (j.response||'').trim() });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message || String(e) });
  }
});

app.get('/api/voices', async (_,res)=> res.json({ ok:true, voices: await listSapiVoices() }));

app.post('/api/tts', async (req,res)=> {
  const { text, voice = '', rate = 0 } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ ok:false, error:"missing text" });
  speakSapi(text, voice, rate);
  res.json({ ok:true });
});

app.listen(PORT, () => {
  console.log('CommentHQ engine listening on ' + `http://127.0.0.1:${PORT}/`);
});

module.exports = app;
