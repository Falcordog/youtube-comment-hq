#!/usr/bin/env node
const inquirer = require('inquirer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
async function main() {
  console.clear(); console.log('🔧 Orchestrator CLI');
  const { act } = await inquirer.prompt({ name:'act', type:'list', message:'Action?', choices:['apply','merge','undo','exit'] });
  if (act === 'apply') {
    const files = fs.existsSync('patches') ? fs.readdirSync('patches').filter(f => f.endsWith('.diff')) : [];
    if (!files.length) { console.error('❌ No patches found'); return; }
    const { p } = await inquirer.prompt({ name:'p', type:'list', message:'Select patch', choices:files });
    const id = path.basename(p, '.diff');
    const { ok } = await inquirer.prompt({ name:'ok', type:'confirm', message:`Apply ${p}?`, default:false });
    if (ok) execSync(`node ai-agent.js apply ${id}`, { stdio:'inherit' });
  } else if (act === 'merge') {
    const { confirm } = await inquirer.prompt({ name:'confirm', type:'confirm', message:'Merge latest AI PR?', default:false });
    if (confirm) execSync('node ai-agent.js merge', { stdio:'inherit' });
  } else if (act === 'undo') {
    console.log('Reverting last commit...'); execSync('git reset --hard HEAD~1', { stdio:'inherit' }); console.log('✅ Undone.');
  } else process.exit();
  await inquirer.prompt({ name:'enter', type:'input', message:'Press Enter to continue...' });
  main();
}
main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
