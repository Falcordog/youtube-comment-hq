const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('chooseDir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('openLink', async (e, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('runBundle', async (e, payload) => {
  // This GUI *posts* a directory to your CLI later; for now we just echo the payload
  // Actual orchestration is handled by your local bundleme tool; the GUI is a front-end.
  return { ok: true, echo: payload };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });