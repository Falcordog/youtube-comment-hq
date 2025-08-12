# tools/ci/sha256.ps1
param(
  [Parameter(Mandatory=$true)][string]$InputDir,
  [Parameter(Mandatory=$true)][string]$OutFile
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $InputDir)) {
  throw "InputDir not found: $InputDir"
}

$hashes = @()
Get-ChildItem -Path $InputDir -Recurse -File | ForEach-Object {
  $h = Get-FileHash -Algorithm SHA256 -Path $_.FullName
  $rel = Resolve-Path $_.FullName
  $hashes += [pscustomobject]@{
    file = $rel.Path
    sha256 = $h.Hash.ToLower()
  }
}

$hashes | ConvertTo-Json -Depth 3 | Out-File -FilePath $OutFile -Encoding utf8
Write-Host "Wrote $OutFile with $($hashes.Count) entries."
