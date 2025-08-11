const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chq", {
  saveToken: (t) => ipcRenderer.invoke("token:save", t),
  loadToken: () => ipcRenderer.invoke("token:load"),
  status: (owner, repo) => ipcRenderer.invoke("repo:status", { owner, repo }),
  makePublic: (owner, repo) => ipcRenderer.invoke("repo:makePublic", { owner, repo }),
  makePrivate: (owner, repo) => ipcRenderer.invoke("repo:makePrivate", { owner, repo })
});