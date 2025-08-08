(function () {
  const dir = document.getElementById("dir");
  const allow = document.getElementById("allow");
  const logEl = document.getElementById("log");
  const btnRun = document.getElementById("run");
  const btnAuth = document.getElementById("auth");
  const btnBrowse = document.getElementById("browse");

  function log(msg){ logEl.textContent += msg + "\n"; logEl.scrollTop = logEl.scrollHeight; }

  // For 0.7.0, GUI is informational — CLI does the heavy lifting.
  btnRun.onclick = () => {
    log("Use CLI mode for now:");
    log("  CommentHQ-BundleMe-GUI-0.7.0-portable.exe --dir \"" + dir.value + "\" --allow_workflows " + (allow.checked ? "true" : "false"));
  };

  btnAuth.onclick = () => {
    log("CLI auth check:");
    log("  CommentHQ-BundleMe-GUI-0.7.0-portable.exe --check-auth");
  };

  btnBrowse.onclick = () => {
    log("Browse not wired yet — paste the path for now.");
  };

  log("Ready. Drag/drop planned for 0.7.1.");
})();
