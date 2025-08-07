// orchestrator.js
// Portable local server + GUI for YouTube Comment HQ.
// - Run with: orchestrator.exe --ui
// - Serves a local web app at http://127.0.0.1:43117
// - Proxies to Ollama for rewrites and lists models
// - Generates UI files into workspace on first run
// - No repo assumptions

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");

// Node 18+ has global fetch
async function safeFetch(resource, options) {
  try { return await fetch(resource, options); }
  catch (e) { return { ok: false, status: 0, text: async () => String(e) }; }
}

function pauseIfInteractive() {
  if (process.argv.includes("--no-pause")) return;
  process.stdin.setRawMode && process.stdin.setRawMode(false);
  process.stdout.write("\nPress Enter to exit...");
  process.stdin.once("data", () => {});
}

function ensureDir(p) { try { fs.mkdirSync(p, { recursive: true }); } catch {} }

function getWorkspace() {
  const ix = process.argv.indexOf("--workspace");
  if (ix > -1 && process.argv[ix + 1]) {
    const p = path.resolve(process.argv[ix + 1]); ensureDir(p); return p;
  }
  if (process.env.COMMENTHQ_WORKSPACE) {
    const p = path.resolve(process.env.COMMENTHQ_WORKSPACE); ensureDir(p); return p;
  }
  const exeDir = path.dirname(process.execPath);
  const w = path.join(exeDir, "workspace"); ensureDir(w); return w;
}

function openBrowser(target) {
  try {
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", target], { detached: true });
    else if (process.platform === "darwin") spawn("open", [target], { detached: true });
    else spawn("xdg-open", [target], { detached: true });
  } catch {}
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
}

function json(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { resolve({}); }
    });
  });
}

// Simple risk scoring based on keyword triggers (tuned for geopolitics)
function computeRisk(text) {
  const triggers = [
    "propaganda","psyop","shill","bot","rigged","fraud",
    "censored","shadowban","ban","nazi","terrorist","genocide",
    "traitor","treason","lies","lying","fake","paid","astroturf",
    "disinformation","misinformation","agenda","puppet","war crime"
  ];
  const lower = (text || "").toLowerCase();
  let hits = 0;
  for (const t of triggers) {
    const re = new RegExp("\\b" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b","g");
    const m = lower.match(re);
    if (m) hits += m.length;
  }
  const len = Math.max(1, lower.split(/\s+/).length);
  const score = Math.min(100, Math.round((hits * 18) + (len > 60 ? 10 : 0)));
  // heuristic suggestions
  const tips = [];
  if (hits > 0) tips.push("Consider euphemisms or indirection for hot words.");
  if (len > 60) tips.push("Shorten the comment; long rants trigger filters.");
  tips.push("Soften absolutes, avoid labeling; use questions and hedging.");
  return { score, tips };
}

function systemPrompt(tone, profile) {
  const base =
    "You are a YouTube comment strategist. Rewrite the message so it is more likely to pass automated moderation and shadow filters. Keep it brief, natural, and human. Avoid slurs, direct accusations, and trigger words; prefer questions, indirection, euphemisms, or hedging. Preserve the user's intent.";
  const toneMap = {
    neutral: "Use a balanced, calm tone.",
    affirm: "Be supportive and concise.",
    counter: "Offer a pointed but civil counterpoint without labeling.",
    ridicule: "Use light irony without insults; stay subtle.",
    humor: "Use mild humor; avoid sarcasm that could be flagged.",
    sarcastic: "Use very light sarcasm, keep it indirect.",
  };
  const prof = profile === "geopolitics"
    ? "Context profile: geopolitics. Emphasize neutrality, policy framing, and verifiable framing without direct claims."
    : "Context profile: general.";
  return base + "\n" + (toneMap[tone] || toneMap.neutral) + "\n" + prof;
}

async function proxyOllamaGenerate(base, model, prompt, context, tone, profile) {
  const sp = systemPrompt(tone, profile);
  const full = context && context.trim().length
    ? sp + "\n---\nComment to respond to: \"" + context + "\"\nUser's message: \"" + prompt + "\""
    : sp + "\n---\nUser's message: \"" + prompt + "\"";
  const res = await safeFetch(base.replace(/\/+$/,"") + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: full, stream: false })
  });
  if (!res.ok) {
    return { ok: false, error: "Ollama request failed: " + res.status + " " + (await res.text()) };
  }
  const j = await res.json().catch(() => null);
  if (!j || typeof j.response !== "string") return { ok: false, error: "Malformed Ollama response" };
  return { ok: true, text: j.response.trim() };
}

async function proxyOllamaModels(base) {
  const res = await safeFetch(base.replace(/\/+$/,"") + "/api/tags");
  if (!res.ok) return { ok: false, models: [] };
  const j = await res.json().catch(() => null);
  const names = j && Array.isArray(j.models) ? j.models.map(m => m.name) : [];
  return { ok: true, models: names };
}

function startServer(workspace) {
  const uiDir = path.join(workspace, "ui");
  ensureDir(uiDir);

  // Write UI files if missing
  writeIfMissing(path.join(uiDir, "index.html"), INDEX_HTML);
  writeIfMissing(path.join(uiDir, "styles.css"), STYLES_CSS);
  writeIfMissing(path.join(uiDir, "ui.js"), UI_JS);

  const port = 43117;
  const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    const send = (code, body, headers) => {
      res.writeHead(code, Object.assign({ "Content-Type": "application/json" }, headers || {}));
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    };

    if (req.method === "GET" && (parsed.pathname === "/" || parsed.pathname === "/index.html")) {
      const f = path.join(uiDir, "index.html");
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(f).pipe(res);
      return;
    }
    if (req.method === "GET" && parsed.pathname === "/styles.css") {
      const f = path.join(uiDir, "styles.css");
      res.writeHead(200, { "Content-Type": "text/css" });
      fs.createReadStream(f).pipe(res);
      return;
    }
    if (req.method === "GET" && parsed.pathname === "/ui.js") {
      const f = path.join(uiDir, "ui.js");
      res.writeHead(200, { "Content-Type": "application/javascript" });
      fs.createReadStream(f).pipe(res);
      return;
    }

    if (req.method === "GET" && parsed.pathname === "/api/ping") {
      return send(200, { ok: true });
    }

    if (req.method === "GET" && parsed.pathname === "/api/models") {
      const base = parsed.query.base || "http://localhost:11434";
      const result = await proxyOllamaModels(base);
      return send(200, result);
    }

    if (req.method === "POST" && parsed.pathname === "/api/risk") {
      const body = await json(req);
      const txt = String(body && body.text || "");
      return send(200, computeRisk(txt));
    }

    if (req.method === "POST" && parsed.pathname === "/api/rewrite") {
      const body = await json(req);
      const base = body.base || "http://localhost:11434";
      const model = body.model || "vdelv/phi-2:latest";
      const prompt = String(body.prompt || "");
      const context = String(body.context || "");
      const tone = String(body.tone || "neutral");
      const profile = String(body.profile || "geopolitics");
      if (!prompt.trim()) return send(400, { ok: false, error: "Empty prompt" });
      const result = await proxyOllamaGenerate(base, model, prompt, context, tone, profile);
      return send(200, result);
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  server.listen(port, "127.0.0.1", () => {
    const target = "http://127.0.0.1:" + port + "/";
    console.log("GUI running at " + target);
    openBrowser(target);
  });

  return server;
}

// UI assets (ASCII only)
const INDEX_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Comment HQ</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="./styles.css" rel="stylesheet">
</head>
<body>
  <div id="app">
    <header>
      <h1>Comment HQ</h1>
      <div class="status">
        <label>Ollama Base</label>
        <input id="baseUrl" type="text" value="http://localhost:11434">
        <button id="probeBtn">Probe</button>
        <span id="probeStatus">unknown</span>
      </div>
    </header>

    <section class="controls">
      <div class="row">
        <div class="col">
          <label>Model</label>
          <select id="modelSelect">
            <option>(load models)</option>
          </select>
        </div>
        <div class="col">
          <label>Tone</label>
          <select id="toneSelect">
            <option value="neutral">Neutral</option>
            <option value="affirm">Affirm</option>
            <option value="counter">Counter</option>
            <option value="ridicule">Ridicule</option>
            <option value="humor">Humor</option>
            <option value="sarcastic">Sarcastic</option>
          </select>
        </div>
        <div class="col">
          <label>Profile</label>
          <select id="profileSelect">
            <option value="geopolitics" selected>Geopolitics</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>
    </section>

    <section class="inputs">
      <div class="col">
        <label>Your Draft</label>
        <textarea id="draft" rows="6" placeholder="Type your comment..."></textarea>
      </div>
      <div class="col">
        <label>Context (other user's comment, optional)</label>
        <textarea id="context" rows="6" placeholder="Paste target comment..."></textarea>
      </div>
    </section>

    <section class="actions">
      <button id="rewriteBtn">Rewrite</button>
      <button id="copyBtn">Copy</button>
      <button id="clearBtn">Clear</button>
      <label class="tts"><input id="ttsToggle" type="checkbox"> TTS</label>
    </section>

    <section class="risk">
      <div class="bar"><div id="riskBar"></div></div>
      <div id="riskLabel">Risk: 0</div>
      <ul id="tips"></ul>
    </section>

    <footer>
      <div id="result"></div>
    </footer>
  </div>
  <script src="./ui.js"></script>
</body>
</html>`;

const STYLES_CSS = String.raw`*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;background:#0f1115;color:#e4e6eb}
#app{max-width:1100px;margin:0 auto;padding:16px}
header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
header h1{margin:0;font-size:20px}
.status{display:flex;gap:8px;align-items:center}
.status input{width:320px;padding:6px;background:#1b1e26;border:1px solid #2a2f3a;color:#cfd3dc}
.status button{padding:6px 10px;background:#1f6feb;border:0;color:#fff;cursor:pointer}
.controls .row{display:flex;gap:12px}
.controls .col{flex:1}
.controls select{width:100%;padding:8px;background:#1b1e26;border:1px solid #2a2f3a;color:#cfd3dc}
.inputs{display:flex;gap:12px;margin-top:12px}
.inputs .col{flex:1;display:flex;flex-direction:column}
.inputs textarea{width:100%;padding:10px;background:#12141a;border:1px solid #2a2f3a;color:#e4e6eb;border-radius:4px}
.actions{display:flex;gap:10px;margin-top:12px;align-items:center}
.actions button{padding:8px 12px;background:#1f6feb;border:0;color:#fff;border-radius:4px;cursor:pointer}
.actions .tts{margin-left:auto}
.risk{margin:14px 0}
.bar{height:10px;background:#2a2f3a;border-radius:5px;overflow:hidden}
#riskBar{height:10px;width:0;background:#2ea043}
#riskLabel{margin-top:6px}
#tips{margin:6px 0 0 16px;padding:0}
#result{white-space:pre-wrap;background:#0b0d12;border:1px solid #2a2f3a;padding:10px;border-radius:4px;min-height:48px}
`;

const UI_JS = String.raw`(function(){
  const baseEl = document.getElementById("baseUrl");
  const probeBtn = document.getElementById("probeBtn");
  const probeStatus = document.getElementById("probeStatus");
  const modelSelect = document.getElementById("modelSelect");
  const tone = document.getElementById("toneSelect");
  const profile = document.getElementById("profileSelect");
  const draft = document.getElementById("draft");
  const context = document.getElementById("context");
  const rewriteBtn = document.getElementById("rewriteBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const riskBar = document.getElementById("riskBar");
  const riskLabel = document.getElementById("riskLabel");
  const tips = document.getElementById("tips");
  const result = document.getElementById("result");
  const ttsToggle = document.getElementById("ttsToggle");

  async function loadModels() {
    modelSelect.innerHTML = "<option>Loading...</option>";
    const r = await fetch("/api/models?base=" + encodeURIComponent(baseEl.value));
    const j = await r.json().catch(()=>({ok:false,models:[]}));
    if (j.ok && j.models && j.models.length) {
      modelSelect.innerHTML = j.models.map(n => "<option>"+n+"</option>").join("");
    } else {
      modelSelect.innerHTML = "<option>vdelv/phi-2:latest</option>";
    }
  }

  function updateRisk() {
    fetch("/api/risk", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ text: draft.value })
    }).then(r=>r.json()).then(j=>{
      const s = j.score || 0;
      riskBar.style.width = Math.min(100, s) + "%";
      riskBar.style.background = s < 40 ? "#2ea043" : (s < 70 ? "#c69026" : "#d64242");
      riskLabel.textContent = "Risk: " + s;
      tips.innerHTML = (j.tips||[]).map(t => "<li>"+t+"</li>").join("");
    });
  }

  draft.addEventListener("input", () => {
    updateRisk();
  });

  probeBtn.addEventListener("click", async () => {
    probeStatus.textContent = "probing...";
    await loadModels();
    const ok = modelSelect.options.length > 0;
    probeStatus.textContent = ok ? "connected" : "offline";
  });

  rewriteBtn.addEventListener("click", async () => {
    const body = {
      base: baseEl.value,
      model: modelSelect.value || "vdelv/phi-2:latest",
      prompt: draft.value,
      context: context.value,
      tone: tone.value,
      profile: profile.value
    };
    result.textContent = "[Rewriting...]";
    const r = await fetch("/api/rewrite", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(()=>({ok:false,error:"Bad JSON"}));
    if (j.ok) {
      result.textContent = j.text;
      if (ttsToggle.checked && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(j.text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } else {
      result.textContent = "[Rewrite failed] " + (j.error || "Unknown error");
    }
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(result.textContent || draft.value);
    } catch {}
  });

  clearBtn.addEventListener("click", () => {
    draft.value = "";
    context.value = "";
    result.textContent = "";
    updateRisk();
  });

  // initial boot
  updateRisk();
  loadModels();
})();`;

function main() {
  const exeDir = path.dirname(process.execPath);
  try { process.chdir(exeDir); } catch {}
  const workspace = getWorkspace();
  const wantUI = process.argv.includes("--ui") || process.argv.includes("--serve");

  if (!wantUI) {
    console.log("Comment HQ Orchestrator (portable)");
    console.log("Workspace:", workspace);
    console.log("Run with --ui to open the local GUI.");
    return pauseIfInteractive();
  }

  const server = startServer(workspace);
  process.on("SIGINT", () => { server.close(() => process.exit(0)); });
}

try { main(); } catch (e) { console.error("Fatal error:", e && e.message ? e.message : e); pauseIfInteractive(); }
