const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

function sh(cmd, cwd){
  execSync(cmd, { stdio: "inherit", cwd: cwd || process.cwd(), shell: true });
}

function nowTag(){
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Best-effort gh/git auth checks
async function checkAuth(){
  try { sh("gh --version"); } catch {}
  try { sh("gh auth status"); } catch {}
  try { sh("git --version"); } catch {}
}

async function bundleCommon({ allowWorkflows }){
  const repo = process.env.REPO_SLUG || "Falcordog/youtube-comment-hq";
  const token = process.env.GITHUB_TOKEN || "";
  const tag = `bundle-${nowTag()}`;
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "commenthq-"));
  const cloneDir = path.join(tmpRoot, "clone");

  console.log("🔁 Cloning:", repo);
  sh(`git clone --depth 1 https://github.com/${repo}.git "${cloneDir}"`);

  const branch = `ai/${tag}`;
  sh(`git checkout -B "${branch}"`, cloneDir);

  return { repo, token, branch, cloneDir, tag };
}

async function bundleFromDir({ dir, allowWorkflows }){
  if (!fs.existsSync(dir)) throw new Error(`--dir not found: ${dir}`);
  const { repo, token, branch, cloneDir, tag } = await bundleCommon({ allowWorkflows });

  // Copy folder to bundles/<tag> AND mirror into root
  const destSub = path.join(cloneDir, "bundles", tag);
  fs.ensureDirSync(destSub);
  console.log("📦 Copying from", dir);
  fs.copySync(dir, destSub, { overwrite: true, errorOnExist: false });

  // Also copy files that are under "tools/" or ".github/" up to root, preserving their relative paths
  // This lets the bundle actually add/update buildable assets.
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(dir, e.name);
    if (e.isDirectory() && (e.name === ".github" || e.name === "tools")) {
      fs.copySync(srcPath, path.join(cloneDir, e.name), { overwrite: true });
    } else if (e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".txt"))) {
      fs.copyFileSync(srcPath, path.join(cloneDir, e.name));
    }
  }

  sh("git add -A", cloneDir);
  try {
    sh(`git commit -m "CommentHQ GUI 0.7.0 bundle\nsession: ${tag}"`, cloneDir);
  } catch {
    console.error("Nothing to commit.");
    return;
  }

  // push (use token if present)
  if (token) {
    sh(`git remote set-url origin https://${token}@github.com/${repo}.git`, cloneDir);
  }
  sh(`git push --set-upstream origin "${branch}"`, cloneDir);

  // create PR
  const wfNote = allowWorkflows ? " (workflows allowed)" : "";
  try {
    sh(`gh pr create --title "BundleMe GUI 0.7.0${wfNote}" --body "Automated bundle ${tag}" --base main --head "${branch}"`, cloneDir);
  } catch {
    console.log("PR creation via gh failed; open PR URL manually if needed.");
    console.log(`https://github.com/${repo}/pull/new/${encodeURIComponent(branch)}`);
  }

  console.log("DONE ✅  Branch:", branch);
}

async function bundleFromZip({ zipPath, allowWorkflows }){
  // optional for 0.7.0: expand zip to temp and call bundleFromDir
  const unzipDir = path.join(os.tmpdir(), "commenthq-zip-" + nowTag());
  fs.ensureDirSync(unzipDir);
  console.log("🔓 Unzip not implemented in 0.7.0. Please use --dir for now.");
  console.log("Tip: Right-click → Extract, then pass --dir <folder>.");
  return;
}

module.exports = { checkAuth, bundleFromDir, bundleFromZip };
