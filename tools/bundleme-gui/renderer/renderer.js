const $ = (s, r=document) => r.querySelector(s);
const ownerEl = document.createElement("input");
const repoEl = document.createElement("input");
const tokenEl = document.createElement("input");
const saveBtn = document.createElement("button");
const statusBtn = document.createElement("button");
const pubBtn = document.createElement("button");
const prvBtn = document.createElement("button");
const out = document.createElement("pre");

ownerEl.placeholder = "owner (e.g., Falcordog)";
repoEl.placeholder = "repo (e.g., youtube-comment-hq)";
tokenEl.placeholder = "Paste GitHub PAT (fine-grained, repo admin)";
tokenEl.type = "password";
saveBtn.textContent = "Save token";
statusBtn.textContent = "Check Status";
pubBtn.textContent = "Make Public";
prvBtn.textContent = "Make Private";

const wrap = document.getElementById("app");
wrap.innerHTML = `
  <h1>CommentHQ — Repo Visibility</h1>
  <p>Provide owner/repo and a PAT with repo:admin. Your token is stored with keytar when available (fallback to a local user-only file).</p>
`;
const form = document.createElement("div");
form.style.display = "grid";
form.style.gridTemplateColumns = "1fr 1fr";
form.style.gap = "8px";
const row = (label, node, colSpan=2) => {
  const l = document.createElement("label");
  l.textContent = label;
  l.style.fontWeight = "600";
  const c = document.createElement("div");
  c.appendChild(node);
  const box = document.createElement("div");
  box.style.display = "contents";
  box.appendChild(l); box.appendChild(c);
  if (colSpan===2) { box.style.gridColumn = "1 / span 2"; }
  form.appendChild(box);
};
row("Owner", ownerEl, 1); row("Repo", repoEl, 1);
row("Token", tokenEl, 2);
const btns = document.createElement("div");
btns.style.display = "flex"; btns.style.gap = "8px";
btns.appendChild(saveBtn); btns.appendChild(statusBtn); btns.appendChild(pubBtn); btns.appendChild(prvBtn);
form.appendChild(btns);
wrap.appendChild(form);
wrap.appendChild(out);

(async () => {
  ownerEl.value = "Falcordog";
  repoEl.value = "youtube-comment-hq";
  const t = await window.chq.loadToken();
  if (t && t.trim()) { tokenEl.placeholder = "Token present (hidden)"; }
})();

function show(obj){ out.textContent = (typeof obj === "string") ? obj : JSON.stringify(obj, null, 2); }

saveBtn.onclick = async () => {
  const ok = await window.chq.saveToken(tokenEl.value||"");
  show(ok ? "Token saved." : "No token provided.");
  tokenEl.value = "";
  tokenEl.placeholder = "Token present (hidden)";
};
statusBtn.onclick = async () => {
  try {
    const j = await window.chq.status(ownerEl.value, repoEl.value);
    show({ private: j.private, full_name: j.full_name, visibility: j.visibility });
  } catch (e) { show(String(e)); }
};
pubBtn.onclick = async () => {
  try { const j = await window.chq.makePublic(ownerEl.value, repoEl.value); show({ private: j.private }); }
  catch (e) { show(String(e)); }
};
prvBtn.onclick = async () => {
  try { const j = await window.chq.makePrivate(ownerEl.value, repoEl.value); show({ private: j.private }); }
  catch (e) { show(String(e)); }
};