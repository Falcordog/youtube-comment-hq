// orchestrator.js (portable)
// Portable CLI that works when double-clicked (no repo required).
// - Uses EXE directory or %LOCALAPPDATA%\CommentHQ as workspace
// - No dependency on orchestrator.js/package.json on disk
// - Flags: --status, --workspace <path>, --open, --no-pause

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const readline = require("readline");

function pauseIfInteractive() {
  if (process.argv.includes("--no-pause")) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("\nPress Enter to exit...", () => rl.close());
}

function safeMkdir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

function canWrite(dir) {
  try {
    const test = path.join(dir, ".wtest");
    fs.writeFileSync(test, "ok");
    fs.unlinkSync(test);
    return true;
  } catch { return false; }
}

function resolveWorkspace() {
  // 1) explicit flag
  const ix = process.argv.indexOf("--workspace");
  if (ix > -1 && process.argv[ix + 1]) {
    const p = path.resolve(process.argv[ix + 1]);
    safeMkdir(p);
    return p;
  }
  // 2) env
  if (process.env.COMMENTHQ_WORKSPACE) {
    const p = path.resolve(process.env.COMMENTHQ_WORKSPACE);
    safeMkdir(p);
    return p;
  }
  // 3) exe folder
  const exeDir = path.dirname(process.execPath);
  const exeWorkspace = path.join(exeDir, "workspace");
  if (canWrite(exeDir)) {
    safeMkdir(exeWorkspace);
    return exeWorkspace;
  }
  // 4) LocalAppData
  const appData = process.env.LOCALAPPDATA || process.env.APPDATA || exeDir;
  const fallback = path.join(appData, "CommentHQ");
  safeMkdir(fallback);
  return fallback;
}

function openFolder(p) {
  try {
    if (process.platform === "win32") cp.spawn("explorer.exe", [p], { detached: true });
    else if (process.platform === "darwin") cp.spawn("open", [p], { detached: true });
    else cp.spawn("xdg-open", [p], { detached: true });
  } catch {}
}

function main() {
  // Lock working dir to EXE folder for predictable behavior
  const exeDir = path.dirname(process.execPath);
  try { process.chdir(exeDir); } catch {}

  const workspace = resolveWorkspace();
  const cfgPath = path.join(workspace, "commenthq.json");

  // ensure config exists
  if (!fs.existsSync(cfgPath)) {
    const cfg = {
      createdAt: new Date().toISOString(),
      workspace,
      version: "0.1.0",
      notes: "Portable mode config. No repo required."
    };
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  }

  // status mode
  if (process.argv.includes("--status")) {
    console.log("Comment HQ Orchestrator (portable)");
    console.log("exeDir:", exeDir);
    console.log("cwd:", process.cwd());
    console.log("workspace:", workspace);
    console.log("config:", cfgPath);
    if (process.argv.includes("--open")) openFolder(workspace);
    return pauseIfInteractive();
  }

  // default behavior: show quick info and create folders we need.
  console.log("Comment HQ Orchestrator (portable)");
  console.log("Workspace:", workspace);
  safeMkdir(path.join(workspace, "logs"));
  safeMkdir(path.join(workspace, "drafts"));
  console.log("Ready. Future tasks will run here without repo assumptions.");

  if (process.argv.includes("--open")) openFolder(workspace);
  pauseIfInteractive();
}

try { main(); } catch (err) { console.error("Fatal error:", err && err.message ? err.message : err); pauseIfInteractive(); }
