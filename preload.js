// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adifAPI', {
  openFile: () => ipcRenderer.invoke('open-adif'),
  saveFile: (opts) => ipcRenderer.invoke('save-adif', opts),
  readPath: (p) => ipcRenderer.invoke('read-path', p)
});

//expose version check handling
contextBridge.exposeInMainWorld('versioncheck', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkLatestRelease: (currentVersion) =>
    ipcRenderer.invoke('app:checkLatestRelease', currentVersion),
});