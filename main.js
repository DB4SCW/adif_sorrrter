//define electron and dependencies
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const https = require('https');
const semver = require('semver');
const path = require('path');
const fs = require('fs');

//define data for version check
const OWNER = 'DB4SCW';
const REPO  = 'adif_sorrrter';

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

//define version check behaviour
ipcMain.handle('app:getVersion', () => app.getVersion());

//define release check behaviour
ipcMain.handle('app:checkLatestRelease', async (_evt, currentVersion) => {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

  //small helper with timeout + safe fallbacks
  function getJsonWithTimeout(url, timeoutMs = 1500) {
    return new Promise((resolve, _reject) => {
      const req = https.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': `${REPO}-updater`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); } catch { resolve(null); }
          } else {
            //treat non-2xx as "no update info" instead of an error
            resolve(null);
          }
        });
      });

      //hard timeout so we never block startup on flaky networks
      const to = setTimeout(() => {
        req.destroy(); //abort the request
        resolve(null); //fail gently
      }, timeoutMs);

      //shut everything down nicely
      req.on('error', () => { clearTimeout(to); resolve(null); });
      req.on('close', () => clearTimeout(to));
      req.end();
    });
  }

  //check github for new version - null means “couldn’t check”
  const latest = await getJsonWithTimeout(url, 1500);
  if (!latest) {
    return { isNewer: false, latestVersion: null, htmlUrl: null, body: '' };
  }

  //get the tag from the json
  const tag = latest.tag_name || latest.name || '';
  
  //remove a leading "v" if present including optional dot
  const latestVersion = tag.replace(/^v\.?/i, '');

  //check if version is newer
  const isNewer = semver.valid(latestVersion) && semver.valid(currentVersion)
    ? semver.gt(latestVersion, currentVersion)
    : (latestVersion !== currentVersion);

  //return info for further handling
  return {
    isNewer,
    latestVersion: tag,
    htmlUrl: latest.html_url || null,
    body: latest.body || ''
  };
});
