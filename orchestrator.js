// orchestrator.js
// Minimal, packaged-safe CLI. Works when double-clicked.
// - Uses EXE folder as working directory
// - Requires only package.json (not orchestrator.js on disk)
// - Pauses before exit unless --no-pause is passed

const fs = require("fs");
const path = require("path");
const readline = require("readline");

function pauseIfInteractive() {
  if (process.argv.includes("--no-pause")) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("\nPress Enter to exit...", () => rl.close());
}

function exists(p) {
  try { return fs.existsSync(path.resolve(p)); } catch { return false; }
}

function main() {
  // Ensure we run from the folder where the EXE lives
  const exeDir = path.dirname(process.execPath);
  try { process.chdir(exeDir); } catch {}

  console.log("YouTube Comment HQ Orchestrator");
  console.log("- exeDir:", exeDir);
  console.log("- cwd:", process.cwd());

  // For a packaged exe, orchestrator.js is inside the binary.
  // Only require package.json to be present in repo root.
  if (!exists("package.json")) {
    console.error("Error: package.json not found in this folder.");
    console.error("Tip: place orchestrator.exe in your repo root, or run it from a terminal in the repo root.");
    return pauseIfInteractive();
  }

  // TODO: add real tasks behind flags (kept minimal per directive)
  console.log("Detected package.json. CLI is ready for tasks in future patches.");
  pauseIfInteractive();
}

try { main(); } catch (err) { console.error("Fatal error:", err && err.message ? err.message : err); pauseIfInteractive(); }
