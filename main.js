const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

let mainWindow;

// ============== AD BLOCKER ==============
class AdBlocker {
  constructor() {
    this.enabled = true;
    this.blockedCount = 0;
    this.rules = new Set();
    this.domainRules = new Set();
    this.regexRules = [];
    
    // Essential ad/tracking domains to block
    this.defaultBlockList = [
      // Ad networks
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'google-analytics.com',
      'googletagmanager.com',
      'googletagservices.com',
      'adservice.google.com',
      'pagead2.googlesyndication.com',
      'adnxs.com',
      'adsrvr.org',
      'adform.net',
      'advertising.com',
      'ads-twitter.com',
      'ads.twitter.com',
      'analytics.twitter.com',
      'ads.facebook.com',
      'facebook.com/tr',
      'connect.facebook.net/en_US/fbevents.js',
      'pixel.facebook.com',
      'an.facebook.com',
      
      // Tracking
      'scorecardresearch.com',
      'quantserve.com',
      'outbrain.com',
      'taboola.com',
      'criteo.com',
      'criteo.net',
      'amazon-adsystem.com',
      'moatads.com',
      'hotjar.com',
      'fullstory.com',
      'mouseflow.com',
      'luckyorange.com',
      'crazyegg.com',
      'clicktale.com',
      'optimizely.com',
      'mixpanel.com',
      'segment.com',
      'segment.io',
      'amplitude.com',
      'branch.io',
      'adjust.com',
      'appsflyer.com',
      'kochava.com',
      'singular.net',
      
      // Popup/redirect ads
      'popads.net',
      'popcash.net',
      'propellerads.com',
      'revcontent.com',
      'mgid.com',
      'zergnet.com',
      
      // More trackers
      'newrelic.com',
      'nr-data.net',
      'sentry.io',
      'bugsnag.com',
      'rollbar.com',
      'loggly.com',
      'sumologic.com',
      
      // Social trackers
      'platform.twitter.com/widgets',
      'staticxx.facebook.com',
      'connect.facebook.net',
      'platform.linkedin.com',
      'snap.licdn.com',
      
      // Ad-related
      'adskeeper.co.uk',
      'adsterra.com',
      'bidvertiser.com',
      'infolinks.com',
      'media.net',
      'revenuecat.com',
      
      // Annoyances
      'intercomcdn.com',
      'intercom.io',
      'drift.com',
      'driftt.com',
      'tidiochat.com',
      'zendesk.com/embeddable',
      'zopim.com',
      'livechatinc.com',
      'olark.com',
      'crisp.chat',
      'pushcrew.com',
      'pushengage.com',
      'onesignal.com',
      'subscribers.com',
      'webpushr.com',
      
      // YouTube ads
      'youtube.com/api/stats/ads',
      'youtube.com/pagead',
      'youtube.com/ptracking',
      'youtubei.googleapis.com/youtubei/v1/log_event',
      's.youtube.com/api/stats/watchtime',
      
      // Instagram/Facebook ads
      'instagram.com/api/v1/ads',
      'i.instagram.com/api/v1/ads',
      
      // TikTok
      'analytics.tiktok.com',
      'log.tiktokv.com',
      'mon.tiktokv.com'
    ];

    // URL patterns to block (regex)
    this.defaultPatterns = [
      /\/ads\//i,
      /\/ad\//i,
      /\/advert/i,
      /\/advertisement/i,
      /\/banner[s]?\//i,
      /\/sponsor/i,
      /\/tracking\//i,
      /\/tracker/i,
      /\/pixel/i,
      /\/analytics/i,
      /\/beacon/i,
      /\.gif\?.*(?:ad|track|pixel)/i,
      /prebid/i,
      /\/pagead\//i,
      /\/adserver/i,
      /smartadserver/i,
      /adnxs\.com/i,
      /rubiconproject/i,
      /pubmatic\.com/i,
      /openx\.net/i,
      /casalemedia\.com/i,
      /advertising\.com/i,
      /adsymptotic/i,
      /adform/i,
      /bidswitch/i,
      /sharethrough/i
    ];

    this.loadRules();
  }

  loadRules() {
    // Add default domains
    this.defaultBlockList.forEach(domain => {
      this.domainRules.add(domain.toLowerCase());
    });

    // Add patterns
    this.regexRules = [...this.defaultPatterns];

    console.log(`🛡️ AdBlocker loaded: ${this.domainRules.size} domains, ${this.regexRules.length} patterns`);
  }

  shouldBlock(url) {
    if (!this.enabled) return false;

    try {
      const urlLower = url.toLowerCase();
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Check domain rules
      for (const domain of this.domainRules) {
        if (hostname.includes(domain) || urlLower.includes(domain)) {
          this.blockedCount++;
          return true;
        }
      }

      // Check regex patterns
      for (const pattern of this.regexRules) {
        if (pattern.test(urlLower)) {
          this.blockedCount++;
          return true;
        }
      }

      // Block by resource type hints in URL
      if (urlLower.includes('ad.') || 
          urlLower.includes('.ad.') ||
          urlLower.includes('/ads/') ||
          urlLower.includes('/ad/') ||
          urlLower.includes('?ad=') ||
          urlLower.includes('&ad=') ||
          urlLower.includes('pagead') ||
          urlLower.includes('doubleclick') ||
          urlLower.includes('googlesyndication')) {
        this.blockedCount++;
        return true;
      }

    } catch (e) {
      // Invalid URL, don't block
    }

    return false;
  }

  getBlockedCount() {
    return this.blockedCount;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`🛡️ AdBlocker ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create global adblocker instance
const adBlocker = new AdBlocker();

// ============== WINDOW CREATION ==============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload', 'main-preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  // Window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window-close', () => mainWindow.close());

  // AdBlocker controls
  ipcMain.handle('adblock-get-count', () => adBlocker.getBlockedCount());
  ipcMain.handle('adblock-set-enabled', (event, enabled) => {
    adBlocker.setEnabled(enabled);
    return enabled;
  });
  ipcMain.handle('adblock-is-enabled', () => adBlocker.enabled);

  ipcMain.handle('file-save', async (event, content) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Code',
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });
    if (filePath) {
      await fs.promises.writeFile(filePath, content);
      return filePath;
    }
    return null;
  });
  
  ipcMain.handle('file-open', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile']
    });
    if (filePaths.length > 0) {
      return await fs.promises.readFile(filePaths[0], 'utf-8');
    }
    return null;
  });
}

ipcMain.handle('save-editor-file', async (event, content) => {
  const { filePath } = await dialog.showSaveDialog({
      title: 'Save AI Generated Code',
      defaultPath: 'script.js',
      filters: [{ name: 'Javascript', extensions: ['js'] }, { name: 'All Files', extensions: ['*'] }]
  });

  if (filePath) {
      fs.writeFileSync(filePath, content);
      return true;
  }
  return false;
});

// Disable certain Chromium features that bypass blocking
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

app.whenReady().then(() => {
  
  // ============== NETWORK-LEVEL BLOCKING ==============
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // Check if should block
    if (adBlocker.shouldBlock(details.url)) {
      // console.log('🚫 Blocked:', details.url.substring(0, 80));
      callback({ cancel: true });
      return;
    }
    
    callback({ cancel: false });
  });

  // Remove tracking headers and fix CORS for embedding
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    
    // Remove headers that block framing
    const headersToRemove = [
      'x-frame-options',
      'X-Frame-Options',
      'content-security-policy',
      'Content-Security-Policy',
      'cross-origin-opener-policy',
      'Cross-Origin-Opener-Policy',
      'cross-origin-embedder-policy',
      'Cross-Origin-Embedder-Policy',
      'cross-origin-resource-policy',
      'Cross-Origin-Resource-Policy'
    ];
    
    headersToRemove.forEach(header => {
      delete headers[header];
    });
    
    callback({ responseHeaders: headers });
  });

  // Set proper user agent
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Remove some tracking headers
    delete details.requestHeaders['X-Client-Data'];
    
    callback({ requestHeaders: details.requestHeaders });
  });

  // ============== LLAMA.CPP SERVER MANAGER ==============
const { spawn, execFile } = require('child_process');
const { EventEmitter } = require('events');

class LlamaServer extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.port = 8765; // Default port for local LLM server
    this.isRunning = false;
    this.currentModel = null;
    this.logBuffer = [];
  }

  getBinaryPath() {
    const platform = process.platform;
    const arch = process.arch;
    
    let binaryName;
    switch(platform) {
      case 'win32': 
        binaryName = 'llama-server.exe'; 
        break;
      case 'darwin': 
        binaryName = 'llama-server'; 
        break;
      case 'linux': 
        binaryName = 'llama-server'; 
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    return path.join(__dirname, 'llama', 'bin', platform, binaryName);
  }

  async checkBinaryExists() {
    const binaryPath = this.getBinaryPath();
    try {
      await fs.promises.access(binaryPath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  async start(modelPath, options = {}) {
    if (this.isRunning) return;
  
    const binaryPath = this.getBinaryPath();
    const resolvedModelPath = path.resolve(modelPath);
  
    const args = [
      '-m', resolvedModelPath,
      '--port', this.port.toString(),
      '--host', '127.0.0.1',
      '--n-gpu-layers', '999', 
      '--ctx-size', (options.ctxSize || 2048).toString(),
    ];
  
    this.process = spawn(binaryPath, args, { cwd: path.dirname(binaryPath) });
    this.isRunning = true;
  
    return new Promise((resolve, reject) => {
      // 60-second timeout for large models/GPU init
      const timeout = setTimeout(() => {
        if (this.isRunning) {
          console.log("🦙 Timeout reached, but process is still alive. Proceeding...");
          resolve(); // Resolve anyway if the process didn't crash
        } else {
          reject(new Error('Llama server failed to start'));
        }
      }, 60000);
  
      // Llama uses STDERR for almost ALL logs (including "Ready" messages)
      const handleLog = (data) => {
        const log = data.toString();
        console.log('🦙 Server:', log.trim());
        
        // Look for the "Ready" signal in either stream
        if (log.includes('HTTP server listening') || log.includes('llama server listening')) {
          clearTimeout(timeout);
          resolve();
        }
      };
  
      this.process.stdout.on('data', handleLog);
      this.process.stderr.on('data', handleLog);
  
      this.process.on('error', (err) => {
        clearTimeout(timeout);
        this.isRunning = false;
        reject(err);
      });
  
      this.process.on('close', (code) => {
        this.isRunning = false;
        if (code !== 0 && code !== null) {
          console.error(`🦙 Server exited with code ${code}`);
        }
      });
    });
  }

  async stop() {
    if (!this.isRunning || !this.process) return;

    return new Promise((resolve) => {
      this.process.once('close', () => {
        this.isRunning = false;
        resolve();
      });
      
      // Try graceful shutdown first
      if (process.platform === 'win32') {
        execFile('taskkill', ['/PID', this.process.pid.toString(), '/T', '/F']);
      } else {
        this.process.kill('SIGTERM');
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
        }, 5000);
      }
    });
  }

  async generate(prompt, options = {}) {
    if (!this.isRunning) {
      throw new Error('Llama server not running');
    }

    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.port,
        path: '/completion',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.content || response);
          } catch (e) {
            reject(new Error(`Invalid LLM response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      
      req.write(JSON.stringify({
        prompt: prompt,
        n_predict: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        stop: options.stop || ['\n\nHuman:', '\n\nAssistant:'],
        ...options
      }));
      
      req.end();
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      currentModel: this.currentModel,
      logTail: this.logBuffer.slice(-20).join('')
    };
  }
}

// Create global instance
const llamaServer = new LlamaServer();

// ============== IPC HANDLERS FOR LLAMA ==============
ipcMain.handle('llama-check-binary', async () => {
  return await llamaServer.checkBinaryExists();
});

ipcMain.handle('llama-start', async (event, modelPath, options) => {
  try {
    await llamaServer.start(modelPath, options);
    return llamaServer.getStatus();
  } catch (err) {
    console.error('🦙 Start error:', err);
    throw err;
  }
});

ipcMain.handle('llama-stop', async () => {
  await llamaServer.stop();
  return llamaServer.getStatus();
});

ipcMain.handle('llama-generate', async (event, prompt, options) => {
  return await llamaServer.generate(prompt, options);
});

ipcMain.handle('llama-get-status', () => {
  return llamaServer.getStatus();
});

// ADD THIS IN main.js AFTER your other ipcMain.handle calls
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
        console.warn(`⚠️ Failed to stat ${file}:`, err.message);
        return null;
      }
    })
  );
  
  return models.filter(m => m !== null);
});

  createWindow();
});

// Handle webview permissions and popups
app.on('web-contents-created', (event, contents) => {
  
  contents.setWindowOpenHandler(({ url }) => {
    // OAuth URLs - open in new window
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});