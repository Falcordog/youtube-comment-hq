const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseDir: () => ipcRenderer.invoke('chooseDir'),
  openLink: (url) => ipcRenderer.invoke('openLink', url),
  runBundle: (p) => ipcRenderer.invoke('runBundle', p)
});