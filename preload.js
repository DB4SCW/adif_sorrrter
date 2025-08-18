// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adifAPI', {
  openFile: () => ipcRenderer.invoke('open-adif'),
  saveFile: (opts) => ipcRenderer.invoke('save-adif', opts),
  readPath: (p) => ipcRenderer.invoke('read-path', p)
});
