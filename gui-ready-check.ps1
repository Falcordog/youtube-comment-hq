# tools/ci/gui-ready-check.ps1
# Fail fast, human-readable guard for GUI readiness.
$ErrorActionPreference = 'Stop'

function Fail($msg) {
  Write-Host "::error:: $msg"
  throw $msg
}

# Resolve paths relative to repo root (this script resides in tools/ci/)
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

$rootPkg = Join-Path $repoRoot "package.json"
$lock    = Join-Path $repoRoot "package-lock.json"
$tauri   = Join-Path $repoRoot "src-tauri/tauri.conf.json"
$guiDir  = Join-Path $repoRoot "tools/bundleme-gui"

if (!(Test-Path $rootPkg)) {
  Fail "package.json not found at repo root. Commit your root package.json."
}
if (!(Test-Path $lock)) {
  Fail "package-lock.json is missing. Commit a lockfile for deterministic CI (`npm ci`)."
}
if (!(Test-Path $tauri)) {
  Fail "src-tauri/tauri.conf.json is missing. Ensure the Tauri project is present and committed."
}
if (!(Test-Path $guiDir)) {
  Write-Host "::warning:: tools/bundleme-gui not found. Continuing (not fatal), but GUI packaging may be incomplete."
}

Write-Host "GUI_READY = TRUE"
