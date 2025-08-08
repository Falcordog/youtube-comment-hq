const { app, BrowserWindow } = require("electron");
const path = require("path");
const minimist = require("minimist");
const core = require("./lib/bundleme-core");

// CLI mode — run headless if flags present
const argv = minimist(process.argv.slice(1));
const isCli = argv.bundle || argv.dir || argv.zip || argv["check-auth"];

async function runCli() {
  try {
    if (argv["check-auth"]) {
      await core.checkAuth();
      process.exit(0);
    }
    const allowWorkflows = String(argv.allow_workflows || "false").toLowerCase() === "true";
    if (argv.dir) {
      await core.bundleFromDir({
        dir: path.resolve(argv.dir),
        allowWorkflows
      });
      process.exit(0);
    }
    if (argv.zip) {
      await core.bundleFromZip({
        zipPath: path.resolve(argv.zip),
        allowWorkflows
      });
      process.exit(0);
    }
    console.error("No actionable flags. Use --dir <folder>, --zip <file.zip> or --check-auth");
    process.exit(2);
  } catch (err) {
    console.error("FATAL:", err?.message || err);
    process.exit(1);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 680,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

if (isCli) {
  // no Electron UI — headless
  runCli();
} else {
  // normal GUI
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
