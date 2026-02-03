const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  // AdBlock
  adblockGetCount: () => ipcRenderer.invoke('adblock-get-count'),
  adblockSetEnabled: (enabled) => ipcRenderer.invoke('adblock-set-enabled', enabled),
  adblockIsEnabled: () => ipcRenderer.invoke('adblock-is-enabled'),

  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  openFolder: () => ipcRenderer.invoke('open-folder'),

  // Llama
  llamaCheckBinary: () => ipcRenderer.invoke('llama-check-binary'),
  llamaStart: (modelPath, options) => ipcRenderer.invoke('llama-start', modelPath, options),
  llamaStop: () => ipcRenderer.invoke('llama-stop'),
  llamaGenerate: (prompt, options) => ipcRenderer.invoke('llama-generate', prompt, options),
  llamaChat: (messages, options) => ipcRenderer.invoke('llama-chat', messages, options),  // ADD THIS
  llamaGetStatus: () => ipcRenderer.invoke('llama-get-status'),
  llamaStreamChat: (messages, options) => ipcRenderer.invoke('llama-stream-chat', messages, options),
  llamaGetModels: () => ipcRenderer.invoke('llama-get-models'),
  llamaStream: (prompt, options) => ipcRenderer.invoke('llama-stream', prompt, options),
  onLlamaStream: (channel, callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Code revision
  codeRevise: (code, query) => ipcRenderer.invoke('code-revise', code, query),

  // Browser search
  browserSearch: (query, options) => ipcRenderer.invoke('browser-search', query, options),
  browserSearchMultiple: (query, engines) => ipcRenderer.invoke('browser-search-multiple', query, engines),
  browserFetchContent: (url) => ipcRenderer.invoke('browser-fetch-content', url),

  // File operations
  saveEditorFile: (content) => ipcRenderer.invoke('save-editor-file', content),
  ptyCreate: (shell) => ipcRenderer.invoke('pty-create', shell),
  ptyWrite: (id, data) => ipcRenderer.invoke('pty-write', id, data),
  ptyResize: (id, cols, rows) => ipcRenderer.invoke('pty-resize', id, cols, rows),
  ptyKill: (id) => ipcRenderer.invoke('pty-kill', id),
  onPtyData: (id, callback) => {
    const channel = 'pty-data-' + id;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }

});