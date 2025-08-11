const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
let keytar = null;
try { keytar = require("keytar"); } catch { keytar = null; }

const SERVICE = "CommentHQ-Repo-Admin";
const ACCOUNT = "repo-token";
const FALLBACK_FILE = () => path.join(app.getPath("userData"), "repo-token.txt");

async function saveToken(token) {
  if (!token || !token.trim()) return false;
  if (keytar) {
    await keytar.setPassword(SERVICE, ACCOUNT, token.trim());
    return true;
  }
  const fs = require("fs");
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(FALLBACK_FILE(), token.trim(), { encoding: "utf8" });
  return true;
}
async function loadToken() {
  if (keytar) {
    const v = await keytar.getPassword(SERVICE, ACCOUNT);
    return v || "";
  }
  const fs = require("fs");
  try {
    return fs.readFileSync(FALLBACK_FILE(), "utf8");
  } catch { return ""; }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 980, height: 700,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// GitHub calls use global fetch (Node 20)
async function ghFetch(token, url, method="GET", body) {
  const headers = { "Accept": "application/vnd.github+json", "User-Agent": "CommentHQ-BundleMe-GUI" };
  if (token && token.trim()) headers["Authorization"] = `Bearer ${token.trim()}`;
  const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await resp.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  if (!resp.ok) {
    const msg = (json && (json.message || json.error)) || text || `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return json;
}

ipcMain.handle("token:save", async (_e, token) => { return saveToken(token); });
ipcMain.handle("token:load", async () => { return loadToken(); });

ipcMain.handle("repo:status", async (_e, { owner, repo }) => {
  const token = await loadToken();
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  return ghFetch(token, url, "GET");
});

ipcMain.handle("repo:makePublic", async (_e, { owner, repo }) => {
  const token = await loadToken();
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  return ghFetch(token, url, "PATCH", { private: false });
});

ipcMain.handle("repo:makePrivate", async (_e, { owner, repo }) => {
  const token = await loadToken();
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  return ghFetch(token, url, "PATCH", { private: true });
});