// main.js
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

//create window
function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 760,
    minHeight: 520,
    title: 'ADIF Sorter',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

//main handler when app is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

//handle closing
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

//IPC Handlers
ipcMain.handle('open-adif', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Open ADIF-file',
    properties: ['openFile'],
    filters: [{ name: 'ADIF', extensions: ['adi', 'adif', 'txt'] }]
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };

  try {
    const filePath = filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    return { canceled: false, filePath, content };
  } catch (err) {
    return { canceled: false, error: String(err) };
  }
});

ipcMain.handle('save-adif', async (_evt, { defaultPath, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save sorted ADIF file',
    defaultPath: defaultPath || 'sorted.adi',
    filters: [{ name: 'ADIF', extensions: ['adi', 'adif', 'txt'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { canceled: false, filePath };
  } catch (err) {
    return { canceled: false, error: String(err) };
  }
});

//direct read by path (for Drag&Drop) 
ipcMain.handle('read-path', async (_evt, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { content, filePath };
  } catch (e) { return { error: String(e) }; }
});
