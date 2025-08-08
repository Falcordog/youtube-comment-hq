const repo   = document.getElementById('repo');
const dir    = document.getElementById('dir');
const pick   = document.getElementById('pick');
const allow  = document.getElementById('allow');
const runBtn = document.getElementById('run');
const status = document.getElementById('status');
const docs   = document.getElementById('docs');

docs.onclick = () => window.api.openLink('https://github.com/Falcordog/youtube-comment-hq');
pick.onclick = async () => {
  const chosen = await window.api.chooseDir();
  if (chosen) dir.value = chosen;
};

runBtn.onclick = async () => {
  status.textContent = 'Working...';
  const payload = {
    repo: repo.value.trim(),
    folder: dir.value.trim(),
    allow_workflows: !!allow.checked
  };
  const res = await window.api.runBundle(payload);
  if (res?.ok) {
    status.textContent = 'Bundle posted (GUI-side echo). Use your local undleme CLI to actually push.';
  } else {
    status.textContent = 'Something failed. Check logs.';
  }
};