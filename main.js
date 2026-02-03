const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AdBlocker = require('./src/adBlocker');
const LlamaServer = require('./src/llamaServer');
const BrowserSearchManager = require('./src/browserSearch');
const CodeReviser = require('./src/codeReviser');

let mainWindow;

// Initialize services
const adBlocker = new AdBlocker();
const llamaServer = new LlamaServer(8080);
const browserSearch = new BrowserSearchManager();
const codeReviser = new CodeReviser(browserSearch);

// Tensor offload pattern for GPT-OSS 20B on limited VRAM
// Offloads FFN layers 12-24 to CPU
const TENSOR_OFFLOAD_PATTERN = [
  'blk\\.12\\.ffn_(gate|down).*=CPU',
  'blk\\.13\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.14\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.15\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.16\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.17\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.18\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.19\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.20\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.21\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.22\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.23\\.ffn_(up|down|gate)_(ch|)exps=CPU',
  'blk\\.24\\.ffn_(up|down|gate)_(ch|)exps=CPU'
].join(',');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, './preload/preload.js'),
      partition: 'persist:main',
      webviewTag: true
    }
  });

  mainWindow.loadFile('index.html');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// ==================== IPC HANDLERS ====================

// Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// AdBlock Handlers
ipcMain.handle('adblock-get-count', () => adBlocker.getBlockedCount());
ipcMain.handle('adblock-set-enabled', (event, enabled) => {
  adBlocker.setEnabled(enabled);
  return { success: true };
});
ipcMain.handle('adblock-is-enabled', () => adBlocker.enabled);

// ==================== LLAMA SERVER HANDLERS ====================

ipcMain.handle('llama-check-binary', async () => {
  return await llamaServer.checkBinaryExists();
});

ipcMain.handle('llama-start', async (event, modelPath, options = {}) => {
  try {
    await llamaServer.start(modelPath, {
      ngl: options.ngl ?? 25,
      ctxSize: options.ctxSize || 32000,
      batchSize: options.batchSize || 256,
      ubatchSize: options.ubatchSize || 256,
      chatTemplateFile: options.chatTemplateFile || path.join(__dirname, 'harmony.jinja'),
      chatTemplateKwargs: options.chatTemplateKwargs || { reasoning_effort: 'low' },
      tensorOffload: options.tensorOffload || TENSOR_OFFLOAD_PATTERN
    });
    return llamaServer.getStatus();
  } catch (err) {
    console.error('Server start error:', err);
    throw err;
  }
});

ipcMain.handle('llama-stop', async () => {
  await llamaServer.stop();
  return llamaServer.getStatus();
});

ipcMain.handle('llama-get-status', () => {
  return llamaServer.getStatus();
});

ipcMain.handle('llama-generate', async (event, prompt, options) => {
  return await llamaServer.generate(prompt, options);
});

ipcMain.handle('llama-chat', async (event, messages, options) => {
  return await llamaServer.chat(messages, options);
});

// Streaming chat handler
ipcMain.handle('llama-stream-chat', async (event, messages, options) => {
  const channelId = `llama-stream-${Date.now()}`;
  
  const stream = llamaServer.streamChat(messages, options);
  
  stream.on('chunk', (content) => {
    event.sender.send(channelId, { type: 'chunk', content });
  });
  
  stream.on('done', () => {
    event.sender.send(channelId, { type: 'done' });
  });
  
  stream.on('error', (err) => {
    event.sender.send(channelId, { type: 'error', error: err.message });
  });
  
  return channelId;
});

ipcMain.handle('llama-stream', async (event, prompt, options) => {
  const responseChannel = `llama-stream-response-${Date.now()}`;

  try {
    const stream = llamaServer.streamCompletion(prompt, options);

    stream.on('chunk', (content) => {
      event.sender.send(responseChannel, { content });
    });

    stream.on('done', () => {
      event.sender.send(responseChannel, { done: true });
    });

    stream.on('error', (err) => {
      event.sender.send(responseChannel, { error: err.message });
    });

  } catch (err) {
    event.sender.send(responseChannel, { error: err.message });
  }

  return responseChannel;
});

// Code Revision
ipcMain.handle('code-revise', async (event, originalCode, searchQuery) => {
  if (!llamaServer.isRunning) {
    throw new Error('Server not running. Start it first.');
  }

  const result = await codeReviser.revise(
    originalCode,
    searchQuery,
    (messages, options) => llamaServer.chat(messages, options)
  );

  return result;
});

// Model list
ipcMain.handle('llama-get-models', async () => {
  const modelsDir = path.join(__dirname, 'llama', 'models');
  try {
    await fs.promises.access(modelsDir, fs.constants.F_OK);
  } catch {
    await fs.promises.mkdir(modelsDir, { recursive: true });
  }

  const files = await fs.promises.readdir(modelsDir);
  const ggufFiles = files.filter(f => f.toLowerCase().endsWith('.gguf'));

  const models = await Promise.all(
    ggufFiles.map(async (file) => {
      const filePath = path.join(modelsDir, file);
      try {
        const stat = await fs.promises.stat(filePath);
        return { name: file, path: filePath, size: stat.size };
      } catch (err) {
        return null;
      }
    })
  );

  return models.filter(m => m !== null);
});

// Browser Search Handlers
ipcMain.handle('browser-search', async (event, query, options) => {
  return await browserSearch.search(query, options);
});

ipcMain.handle('browser-search-multiple', async (event, query, engines) => {
  return await browserSearch.searchMultiple(query, engines);
});

ipcMain.handle('browser-fetch-content', async (event, url) => {
  return await browserSearch.fetchPageContent(url);
});


// Open file dialog
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Code Files', extensions: ['js', 'ts', 'py', 'html', 'css', 'json', 'md', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths[0]) return null;

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  
  return {
    path: filePath,
    name: path.basename(filePath),
    content
  };
});

// Save file dialog
ipcMain.handle('save-file', async (event, { path: filePath, name, content }) => {
  let savePath = filePath;

  if (!savePath) {
    const result = await dialog.showSaveDialog({
      defaultPath: name || 'untitled.txt',
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) return null;
    savePath = result.filePath;
  }

  fs.writeFileSync(savePath, content, 'utf-8');
  
  return {
    path: savePath,
    name: path.basename(savePath)
  };
});

// Read file
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
});

// Open folder
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths[0]) return null;

  const folderPath = result.filePaths[0];
  
  function readDir(dirPath) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items
      .filter(item => !item.name.startsWith('.'))
      .map(item => {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          return {
            type: 'folder',
            name: item.name,
            path: itemPath,
            children: readDir(itemPath)
          };
        }
        return {
          type: 'file',
          name: item.name,
          path: itemPath
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return {
    path: folderPath,
    name: path.basename(folderPath),
    children: readDir(folderPath)
  };
});

// File Save Handler
ipcMain.handle('save-editor-file', async (event, content) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save File',
    defaultPath: path.join(app.getPath('documents'), 'code.txt'),
    filters: [
      { name: 'Text Files', extensions: ['txt', 'js', 'py', 'html', 'css'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (filePath) {
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true, path: filePath };
  }

  return { success: false };
});

// ============ TERMINAL (PTY) HANDLERS ============
let pty;
try {
  pty = require('node-pty');
  console.log('✅ node-pty loaded');
} catch (e) {
  console.warn('⚠️ node-pty not available:', e.message);
  pty = null;
}

const ptyProcesses = new Map();

ipcMain.handle('pty-create', async (event, shellType) => {
  if (!pty) {
    throw new Error('node-pty not installed. Run: npm install node-pty');
  }

  const id = `pty-${Date.now()}`;

  // Determine shell
  let shell, args;
  if (process.platform === 'win32') {
    switch (shellType) {
      case 'powershell':
        shell = 'powershell.exe';
        args = [];
        break;
      case 'cmd':
        shell = 'cmd.exe';
        args = [];
        break;
      case 'bash':
        shell = 'bash.exe';
        args = [];
        break;
      default:
        shell = process.env.COMSPEC || 'cmd.exe';
        args = [];
    }
  } else {
    shell = process.env.SHELL || '/bin/bash';
    args = [];
  }

  try {
    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || process.env.USERPROFILE || '/',
      env: process.env
    });

    ptyProcesses.set(id, ptyProcess);

    // Send data to renderer
    ptyProcess.onData((data) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`pty-data-${id}`, data);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`pty-data-${id}`, `\r\n\x1b[33mProcess exited with code ${exitCode}\x1b[0m\r\n`);
      }
      ptyProcesses.delete(id);
    });

    console.log(`✅ PTY created: ${id} (${shell})`);
    return id;

  } catch (e) {
    console.error('Failed to create PTY:', e);
    throw e;
  }
});

ipcMain.handle('pty-write', (event, id, data) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

ipcMain.handle('pty-resize', (event, id, cols, rows) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
    } catch (e) {
      console.error('Failed to resize PTY:', e);
    }
  }
});

ipcMain.handle('pty-kill', (event, id) => {
  const ptyProcess = ptyProcesses.get(id);
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcesses.delete(id);
    console.log(`✅ PTY killed: ${id}`);
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  ptyProcesses.forEach((pty, id) => {
    try { pty.kill(); } catch {}
  });
  ptyProcesses.clear();
});

// ==================== APP LIFECYCLE ====================

app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (adBlocker.shouldBlock(details.url)) {
      callback({ cancel: true });
      return;
    }
    callback({ cancel: false });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    const headersToRemove = [
      'x-frame-options', 'X-Frame-Options',
      'content-security-policy', 'Content-Security-Policy',
      'cross-origin-opener-policy', 'Cross-Origin-Opener-Policy',
      'cross-origin-embedder-policy', 'Cross-Origin-Embedder-Policy',
      'cross-origin-resource-policy', 'Cross-Origin-Resource-Policy'
    ];
    headersToRemove.forEach(header => delete headers[header]);
    callback({ responseHeaders: headers });
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    delete details.requestHeaders['X-Client-Data'];
    callback({ requestHeaders: details.requestHeaders });
  });

  createWindow();
});

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.includes('accounts.google.com') ||
        url.includes('api.twitter.com') ||
        url.includes('oauth') ||
        url.includes('login') ||
        url.includes('signin') ||
        url.includes('auth')) {

      const authWin = new BrowserWindow({
        width: 500,
        height: 700,
        autoHideMenuBar: true,
        parent: mainWindow,
        modal: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: 'persist:main'
        }
      });

      authWin.loadURL(url);

      authWin.webContents.on('will-navigate', (e, navUrl) => {
        if ((navUrl.includes('twitter.com') || navUrl.includes('x.com') ||
            navUrl.includes('instagram.com') || navUrl.includes('youtube.com') ||
            navUrl.includes('facebook.com')) && !navUrl.includes('accounts.google')) {
          setTimeout(() => {
            if (!authWin.isDestroyed()) authWin.close();
          }, 1000);
        }
      });

      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  contents.session.setPermissionCheckHandler(() => true);
});

app.on('before-quit', () => {
  browserSearch.destroy();
  llamaServer.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});