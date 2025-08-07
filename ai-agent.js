# scaffold-repo.ps1
<#
.SYNOPSIS
Audits and scaffolds the YouTube-Comment-HQ repo, installing dependencies,
ensuring required files/folders, and updating package.json in one go.
#>

# Install Inquirer
Write-Host "🔧 Installing Inquirer..."
npm install inquirer@latest

# Ensure patches/ exists
if (-not (Test-Path './patches')) {
  New-Item -ItemType Directory -Path './patches' | Out-Null
  Write-Host "✅ Created 'patches/' directory"
} else {
  Write-Host "ℹ️ 'patches/' already exists"
}

# Write ai-agent.js if missing
if (-not (Test-Path './ai-agent.js')) {
@'
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
function run(cmd){ console.log(`> ${cmd}`); execSync(cmd,{stdio:'inherit'}); }
function applyPatch(id){
  const p=path.join('patches',id+'.diff');
  if(!fs.existsSync(p)){console.error('Patch not found:',p);process.exit(1);}
  run('git fetch origin main');
  run('git checkout -B ai/'+id+' origin/main');
  run('git apply '+p);
  run('git commit -am "AI: apply '+id+'"');
  run('git push --set-upstream origin ai/'+id);
  run('gh pr create --fill --title "AI: apply '+id+'" --body "Automated patch '+id+'"');
  console.log('✅ Applied patch',id);
}
function mergePR(){
  const list=JSON.parse(execSync('gh pr list --state open --json number,headRefName',{encoding:'utf8'}));
  const pr=list.find(x=>x.headRefName.startsWith('ai/'));
  if(!pr){console.error('No AI PR found');process.exit(1);}
  run('gh pr merge '+pr.number+' --merge --delete-branch');
  console.log('✅ Merged PR #'+pr.number);
}
const [,,c,a]=process.argv;
if(c==='apply'&&a)applyPatch(a);
else if(c==='merge')mergePR();
else console.log('Usage: node ai-agent.js apply <patch-id>\\n       node ai-agent.js merge');
