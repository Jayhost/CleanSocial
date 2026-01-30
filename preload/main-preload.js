const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  llamaCheckBinary: () => ipcRenderer.invoke('llama-check-binary'),
  llamaStart: (p, o) => ipcRenderer.invoke('llama-start', p, o),
  llamaStop: () => ipcRenderer.invoke('llama-stop'),
  llamaGenerate: (p, o) => ipcRenderer.invoke('llama-generate', p, o),
  llamaGetStatus: () => ipcRenderer.invoke('llama-get-status'),
  llamaGetModels: () => ipcRenderer.invoke('llama-get-models')
});