Set-Content -Path .\orchestrator.js -Encoding ascii -Value @'
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const AUTO = process.argv.includes("--all") || process.argv.includes("-y");

function run(cmd, options = {}) {
  console.log("> " + cmd);
  execSync(cmd, { stdio: "inherit", shell: true, ...options });
}

function cleanup() {
  console.log("Cleaning previous scaffold...");
  ["patches", "tauri-gui"].forEach((name) => {
    const p = path.join(process.cwd(), name);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log("Removed " + name + "/");
    }
  });
}

const steps = [
  {
    name: "Cleanup",
    action: cleanup,
  },
  {
    name: "Create patches folder",
    action: () => {
      const dir = path.join(process.cwd(), "patches");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, ".gitkeep"), "");
      console.log("Created patches/");
    },
  },
  {
    name: "Write package.json",
    action: () => {
      const pkg = {
        name: "youtube-comment-hq",
        version: "0.1.0",
        private: true,
        scripts: {
          ai: "node ai-agent.js",
          orchestrate: "node orchestrator.js",
          "gui:dev": "cd tauri-gui && npm run dev",
          "gui:tauri": "cd tauri-gui && npx tauri dev"
        },
        dependencies: { "prompt-sync": "^4.2.0" }
      };
      fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
      console.log("Wrote package.json");
    },
  },
  {
    name: "Install dependencies",
    action: () => run("npm install"),
  },
  {
    name: "Scaffold Tauri GUI",
    action: () => {
      const guiDir = path.join(process.cwd(), "tauri-gui");
      run("npm create vite@latest tauri-gui -- --template react-ts");
      run("npm install", { cwd: guiDir });
      run("npx tauri init --force", { cwd: guiDir });
    },
  },
];

(function main() {
  console.log("YouTube Comment HQ Orchestrator (one-click)");
  for (const step of steps) {
    if (AUTO) {
      console.log("Auto: " + step.name);
      step.action();
    } else {
      // no prompts, run sequentially
      step.action();
    }
  }
  console.log("Done.");
})();
'@
