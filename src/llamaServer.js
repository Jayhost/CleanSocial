const { EventEmitter } = require('events');
const { spawn, execFile } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

class LlamaServer extends EventEmitter {
  constructor(port = 8080) {
    super();
    this.process = null;
    this.port = port;
    this.isRunning = false;
    this.currentModel = null;
  }

  getBinaryPath() {
    const platform = process.platform;
    let binaryName;
    switch (platform) {
      case 'win32':
        binaryName = 'llama-server.exe';
        break;
      case 'darwin':
      case 'linux':
        binaryName = 'llama-server';
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    return path.join(__dirname, '..', 'llama', 'bin', platform, binaryName);
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
    if (this.isRunning) {
      console.log('Server already running');
      return;
    }

    const binaryPath = this.getBinaryPath();
    const resolvedModelPath = path.resolve(modelPath);

    const args = [
      '-m', resolvedModelPath,
      '--port', this.port.toString(),
      '--host', '127.0.0.1',
      '-ngl', (options.ngl ?? 25).toString(),
      '-c', (options.ctxSize || 32000).toString(),
      '--batch-size', (options.batchSize || 256).toString(),
      '--ubatch-size', (options.ubatchSize || 256).toString()
    ];

    // Add jinja template if provided
    if (options.chatTemplateFile) {
      const templatePath = path.resolve(options.chatTemplateFile);
      if (fs.existsSync(templatePath)) {
        args.push('--chat-template-file', templatePath);
        args.push('--jinja');
        console.log(`📝 Using chat template: ${templatePath}`);
      }
    }

    // Add chat template kwargs if provided
    if (options.chatTemplateKwargs) {
      args.push('--chat-template-kwargs', options.chatTemplateKwargs);
      args.push('--jinja');
    }

    // Add tensor offload pattern for mixed GPU/CPU layers
    // This is crucial for fitting large models in limited VRAM
    if (options.tensorOffload) {
      args.push('-ot', options.tensorOffload);
      console.log(`📊 Tensor offload: ${options.tensorOffload.substring(0, 50)}...`);
    }
    

    // Add any extra args
    if (options.extraArgs && Array.isArray(options.extraArgs)) {
      args.push(...options.extraArgs);
    }

    console.log(`🚀 Starting server on port ${this.port}`);
    console.log(`   Model: ${path.basename(resolvedModelPath)}`);
    console.log(`   GPU layers: ${options.ngl ?? 25}`);
    console.log(`   Context: ${options.ctxSize || 32000}`);

    this.process = spawn(binaryPath, args, {
      cwd: path.dirname(binaryPath),
      env: { ...process.env }
    });

    this.currentModel = modelPath;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('⏱️ Timeout reached, checking health...');
          this.healthCheck().then(healthy => {
            if (healthy) {
              this.isRunning = true;
              resolve();
            } else {
              reject(new Error('Server failed to start'));
            }
          });
        }
      }, 180000); // 3 min timeout for large models

      const handleLog = (data) => {
        const log = data.toString();
        console.log('[llama]:', log.trim());

        if (log.includes('HTTP server listening') ||
            log.includes('llama server listening') ||
            log.includes('starting the main loop')) {
          clearTimeout(timeout);
          this.isRunning = true;
          console.log('✅ Server ready');
          resolve();
        }

        if (log.includes('CUDA out of memory') || log.includes('CUDA error')) {
          console.error('❌ CUDA memory error - try reducing ngl or using tensor offload');
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
        clearTimeout(timeout);
        this.isRunning = false;
        this.currentModel = null;
        console.log(`Server exited with code ${code}`);
      });
    });
  }

  async stop() {
    if (!this.isRunning || !this.process) return;

    console.log('🛑 Stopping server...');

    return new Promise((resolve) => {
      const forceKillTimeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing...');
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.process.once('close', () => {
        clearTimeout(forceKillTimeout);
        this.isRunning = false;
        this.currentModel = null;
        console.log('✅ Server stopped');
        resolve();
      });

      if (process.platform === 'win32') {
        execFile('taskkill', ['/PID', this.process.pid.toString(), '/T', '/F']);
      } else {
        this.process.kill('SIGTERM');
      }
    });
  }

  async healthCheck() {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.port,
        path: '/health',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  async chat(messages, options = {}) {
    if (!this.isRunning) {
      throw new Error('Server not running');
    }

    const body = JSON.stringify({
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      stream: false
    });

    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.port,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 300000 // 5 min for long generations
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message || JSON.stringify(json.error)));
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON: ${data.substring(0, 300)}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  streamChat(messages, options = {}) {
    const emitter = new EventEmitter();
  
    if (!this.isRunning) {
      setTimeout(() => emitter.emit('error', new Error('Server not running')), 0);
      return emitter;
    }
  
    const body = JSON.stringify({
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      stream: true  // Enable streaming
    });
  
    const req = http.request({
      hostname: '127.0.0.1',
      port: this.port,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let buffer = '';
  
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
  
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'data: [DONE]') {
            emitter.emit('done');
            return;
          }
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                emitter.emit('chunk', content);
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      });
  
      res.on('end', () => emitter.emit('done'));
      res.on('error', (err) => emitter.emit('error', err));
    });
  
    req.on('error', (err) => emitter.emit('error', err));
    req.write(body);
    req.end();
  
    return emitter;
  }

  async generate(prompt, options = {}) {
    if (!this.isRunning) {
      throw new Error('Server not running');
    }

    const body = JSON.stringify({
      prompt,
      n_predict: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stop: options.stop || [],
      stream: false
    });

    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.port,
        path: '/completion',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 300000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.content || json);
          } catch (e) {
            reject(new Error(`Invalid response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  streamCompletion(prompt, options = {}) {
    const emitter = new EventEmitter();

    if (!this.isRunning) {
      setTimeout(() => emitter.emit('error', new Error('Server not running')), 0);
      return emitter;
    }

    const body = JSON.stringify({
      prompt,
      n_predict: options.maxTokens || 512,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stop: options.stop || [],
      stream: true
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: this.port,
      path: '/completion',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.content) {
                emitter.emit('chunk', json.content);
              }
              if (json.stop) {
                emitter.emit('done');
                return;
              }
            } catch (e) {}
          }
        }
      });

      res.on('end', () => emitter.emit('done'));
      res.on('error', (err) => emitter.emit('error', err));
    });

    req.on('error', (err) => emitter.emit('error', err));
    req.write(body);
    req.end();

    return emitter;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      currentModel: this.currentModel
    };
  }
}

module.exports = LlamaServer;