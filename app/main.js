// Electron main + tray + embedded engine
const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let win, tray, server, healthTimer;
const PORT = 43117;
const ENGINE_URL = `http://127.0.0.1:${PORT}/`;
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'engine.log');

// Simple log writer
function log(line) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`);
}

// Start embedded server (same process) by requiring server.js
function startEmbeddedServer() {
  try {
    const srv = require('./server'); // starts express on import
    log('Engine started (embedded).');
    return srv;
  } catch (e) {
    log('Engine failed: ' + (e.stack || e.message || String(e)));
    return null;
  }
}

async function pingHealth() {
  try {
    const res = await fetch(ENGINE_URL + 'api/health');
    if (!res.ok) throw new Error(res.statusText);
    const j = await res.json();
    const tip = [
      'CommentHQ',
      `Ollama: ${j.ollama.ok ? 'OK' : 'DOWN'}`,
      `Models: ${(j.models || []).length}`,
      `TTS: ${j.tts.backend || '?'}`
    ].join('  |  ');
    tray.setToolTip(tip);
  } catch {
    tray.setToolTip('CommentHQ  |  Engine: DOWN');
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 560, height: 760,
    minWidth: 420, minHeight: 500,
    frame: true, alwaysOnTop: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  win.loadURL(ENGINE_URL); // load the web UI from the embedded server
}

function createTray() {
  // Use an empty icon; Windows requires some icon—even transparent.
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open', click: ()=> { if (!win) createWindow(); else win.show(); } },
    { label: 'Hide', click: ()=> win && win.hide() },
    { type: 'separator' },
    { label: 'Status', click: async ()=> { await pingHealth(); } },
    { label: 'Restart Engine', click: ()=> {
        try {
          delete require.cache[require.resolve('./server')];
          startEmbeddedServer();
          pingHealth();
        } catch (e) {
          dialog.showErrorBox('Restart failed', String(e));
        }
      }
    },
    { label: 'Open Logs Folder', click: ()=> require('electron').shell.showItemInFolder(LOG_FILE) },
    { type: 'separator' },
    { label: 'Quit', click: ()=> app.quit() }
  ]);
  tray.setContextMenu(menu);

  tray.on('click', () => { // single-click: quick status tooltip refresh
    pingHealth();
  });

  tray.on('double-click', () => { // double-click: open/restore GUI
    if (!win) createWindow(); else { win.show(); win.focus(); }
  });
}

app.whenReady().then(async () => {
  startEmbeddedServer();
  createTray();
  healthTimer = setInterval(pingHealth, 3000);
  // Do not auto-open window; user can double-click tray to open.
});

app.on('window-all-closed', () => { /* keep running in tray */ });
app.on('before-quit', () => { clearInterval(healthTimer); });
