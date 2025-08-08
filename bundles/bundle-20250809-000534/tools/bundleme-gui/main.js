const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let tray, win;

function createWindow() {
  win = new BrowserWindow({
    width: 900, height: 600,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  tray = new Tray(process.platform === 'win32' ? 'C:\\Windows\\System32\\shell32.dll' : undefined);
  const menu = Menu.buildFromTemplate([
    { label: 'Check auth', click: () => win.webContents.send('action', 'check-auth') },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('CommentHQ BundleMe');
  tray.setContextMenu(menu);
});