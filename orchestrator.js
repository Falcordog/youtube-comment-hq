// orchestrator.js
// Minimal, safe entry point that can be packaged to a Windows EXE via GitHub Actions.
// Follows the primary directive: root-only, ASCII-only, validate-first.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function run(cmd, opts = {}) {
  console.log("> " + cmd);
  execSync(cmd, { stdio: "inherit", shell: true, ...opts });
}

function exists(p) {
  return fs.existsSync(path.resolve(p));
}

function main() {
  console.log("YouTube Comment HQ Orchestrator - minimal build target");

  // Guardrails: never mutate repo structure here.
  // This binary is for packaging and future automation hooks only.

  // Example dry-run tasks. Expand later via PRs:
  console.log("- Repo root check:", process.cwd());
  console.log("- Node version:", process.version);

  // Sanity checks
  const required = ["package.json", "orchestrator.js"];
  const missing = required.filter(f => !exists(f));
  if (missing.length) {
    console.error("Missing required files:", missing.join(", "));
    process.exit(1);
  }

  console.log("Ready. This orchestrator is packaged by CI to a Windows EXE.");
  console.log("Next steps (future PRs): add tasks (scaffold GUI, manage patches) behind explicit flags.");
}

try {
  main();
} catch (err) {
  console.error("Fatal error:", err && err.message ? err.message : err);
  process.exit(1);
}
