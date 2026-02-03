(function() {
  'use strict';

  class TerminalTab {
    constructor() {
      this.container = null;
      this.el = {};
      this.terminals = new Map();
      this.activeTerminalId = null;
      this.terminalCounter = 0;
      this.xtermLoaded = false;
    }

    getTabHTML() {
      return window.TerminalTabHTML?.getTabHTML?.() || '<div>Terminal not loaded</div>';
    }

    getTabCSS() {
      return window.TerminalTabCSS?.getTabCSS?.() || '';
    }

    async init(container) {
      console.log('🚀 Initializing Terminal Tab...');

      if (!document.getElementById('terminal-tab-styles')) {
        const style = document.createElement('style');
        style.id = 'terminal-tab-styles';
        style.textContent = this.getTabCSS();
        document.head.appendChild(style);
      }

      this.container = container;
      this.cacheElements();
      this.bindEvents();

      try {
        await this.loadXterm();
        this.xtermLoaded = true;
        console.log('✅ xterm.js ready');
      } catch (e) {
        console.error('❌ Failed to load xterm.js:', e);
        if (this.el.container) {
          this.el.container.innerHTML = '<div style="color: red; padding: 20px;">Failed to load terminal: ' + e.message + '</div>';
        }
        return;
      }

      await this.createTerminal();

      if (window.lucide) lucide.createIcons();
      console.log('✅ Terminal Tab initialized');
    }

    cacheElements() {
      const $ = (sel) => this.container.querySelector(sel);
      this.el = {
        shellSelect: $('#terminal-shell-select'),
        newBtn: $('#terminal-new-btn'),
        clearBtn: $('#terminal-clear-btn'),
        tabs: $('#terminal-tabs'),
        container: $('#terminal-container')
      };
    }

    bindEvents() {
      this.el.newBtn?.addEventListener('click', () => this.createTerminal());
      this.el.clearBtn?.addEventListener('click', () => this.clearActiveTerminal());
    }

    loadXterm() {
      const self = this;
      return new Promise((resolve, reject) => {
        if (window.Terminal) {
          resolve();
          return;
        }

        // Load CSS
        if (!document.querySelector('link[href*="xterm"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
          document.head.appendChild(link);
        }

        const loadScript = (src) => {
          return new Promise((res, rej) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => res();
            script.onerror = () => rej(new Error('Failed to load ' + src));
            document.head.appendChild(script);
          });
        };

        loadScript('https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js')
          .then(() => loadScript('https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js'))
          .then(() => {
            console.log('✅ xterm scripts loaded');
            resolve();
          })
          .catch(reject);
      });
    }

    async createTerminal() {
      const self = this;

      if (!window.Terminal) {
        console.error('Terminal class not available');
        return null;
      }

      const id = 'term-' + this.terminalCounter++;
      const shell = this.el.shellSelect?.value || 'default';

      // Deactivate others
      if (this.el.tabs) {
        this.el.tabs.querySelectorAll('.terminal-tab').forEach(t => t.classList.remove('active'));
      }
      if (this.el.container) {
        this.el.container.querySelectorAll('.terminal-instance').forEach(t => t.classList.remove('active'));
      }

      // Create tab
      const tab = document.createElement('div');
      tab.className = 'terminal-tab active';
      tab.dataset.terminalId = id;
      tab.innerHTML = 
        '<i data-lucide="terminal" width="12" height="12"></i>' +
        '<span>Terminal ' + this.terminalCounter + '</span>' +
        '<span class="close-btn"><i data-lucide="x" width="12" height="12"></i></span>';
      
      if (this.el.tabs) {
        this.el.tabs.appendChild(tab);
      }

      // Create container
      const termDiv = document.createElement('div');
      termDiv.className = 'terminal-instance active';
      termDiv.id = id;
      if (this.el.container) {
        this.el.container.appendChild(termDiv);
      }

      // Create terminal
      const term = new Terminal({
        theme: {
          background: '#0a0a0a',
          foreground: '#e0e0e0',
          cursor: '#22c55e',
          cursorAccent: '#0a0a0a',
          selectionBackground: 'rgba(255, 255, 255, 0.3)',
          black: '#000000',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e0e0e0',
          brightBlack: '#666666',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff'
        },
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 5000
      });

      term.open(termDiv);

      // Fit addon
      let fitAddon = null;
      const FitAddonClass = window.FitAddon?.FitAddon || window.FitAddon;
      if (FitAddonClass) {
        fitAddon = new FitAddonClass();
        term.loadAddon(fitAddon);
        
        setTimeout(function() {
          try { fitAddon.fit(); } catch (e) {}
        }, 150);

        const ro = new ResizeObserver(function() {
          try { fitAddon.fit(); } catch (e) {}
        });
        ro.observe(termDiv);
      }

      this.terminals.set(id, { term: term, fitAddon: fitAddon, ptyId: null, cleanup: null });
      this.activeTerminalId = id;

      // Connect PTY
      await this.startPtyConnection(id, shell, term);

      // Tab events
      tab.addEventListener('click', function(e) {
        if (e.target.closest('.close-btn')) {
          e.stopPropagation();
          self.closeTerminal(id);
        } else {
          self.switchToTerminal(id);
        }
      });

      if (window.lucide) lucide.createIcons();
      term.focus();

      return id;
    }

    async startPtyConnection(id, shell, term) {
      try {
        if (!window.electronAPI || !window.electronAPI.ptyCreate) {
          term.writeln('\x1b[31m❌ PTY API not available\x1b[0m');
          term.writeln('\x1b[33mCheck preload.js has ptyCreate, ptyWrite, ptyKill, onPtyData\x1b[0m');
          return;
        }

        const ptyId = await window.electronAPI.ptyCreate(shell);

        if (!ptyId) {
          term.writeln('\x1b[31m❌ Failed to create terminal session\x1b[0m');
          term.writeln('\x1b[33mMake sure node-pty is installed:\x1b[0m');
          term.writeln('\x1b[36m  npm install node-pty\x1b[0m');
          term.writeln('\x1b[36m  npx electron-rebuild -f -w node-pty\x1b[0m');
          return;
        }

        const termData = this.terminals.get(id);
        if (termData) {
          termData.ptyId = ptyId;
        }

        // Receive data from PTY
        const cleanup = window.electronAPI.onPtyData(ptyId, function(data) {
          term.write(data);
        });

        if (termData) {
          termData.cleanup = cleanup;
        }

        // Send input to PTY
        term.onData(function(data) {
          window.electronAPI.ptyWrite(ptyId, data);
        });

        // Handle resize
        term.onResize(function(size) {
          window.electronAPI.ptyResize(ptyId, size.cols, size.rows);
        });

        // Initial resize
        setTimeout(function() {
          if (term.cols && term.rows) {
            window.electronAPI.ptyResize(ptyId, term.cols, term.rows);
          }
        }, 200);

        console.log('✅ PTY connected:', ptyId);

      } catch (e) {
        console.error('PTY connection failed:', e);
        term.writeln('\x1b[31m❌ Error: ' + e.message + '\x1b[0m');
      }
    }

    switchToTerminal(id) {
      if (this.activeTerminalId === id) return;

      if (this.el.tabs) {
        this.el.tabs.querySelectorAll('.terminal-tab').forEach(function(t) {
          t.classList.toggle('active', t.dataset.terminalId === id);
        });
      }

      if (this.el.container) {
        this.el.container.querySelectorAll('.terminal-instance').forEach(function(t) {
          t.classList.toggle('active', t.id === id);
        });
      }

      this.activeTerminalId = id;

      const termData = this.terminals.get(id);
      if (termData && termData.term) {
        termData.term.focus();
        if (termData.fitAddon) {
          try { termData.fitAddon.fit(); } catch (e) {}
        }
      }
    }

    closeTerminal(id) {
      const termData = this.terminals.get(id);

      if (termData) {
        if (termData.ptyId && window.electronAPI) {
          window.electronAPI.ptyKill(termData.ptyId);
        }
        if (termData.cleanup) {
          termData.cleanup();
        }
        if (termData.term) {
          termData.term.dispose();
        }
      }

      if (this.el.tabs) {
        const tabEl = this.el.tabs.querySelector('[data-terminal-id="' + id + '"]');
        if (tabEl) tabEl.remove();
      }
      
      const termEl = document.getElementById(id);
      if (termEl) termEl.remove();
      
      this.terminals.delete(id);

      if (this.activeTerminalId === id) {
        const remaining = Array.from(this.terminals.keys());
        if (remaining.length > 0) {
          this.switchToTerminal(remaining[remaining.length - 1]);
        } else {
          this.createTerminal();
        }
      }
    }

    clearActiveTerminal() {
      const termData = this.terminals.get(this.activeTerminalId);
      if (termData && termData.term) {
        termData.term.clear();
      }
    }

    destroy() {
      const self = this;
      this.terminals.forEach(function(termData) {
        if (termData.ptyId && window.electronAPI) {
          window.electronAPI.ptyKill(termData.ptyId);
        }
        if (termData.cleanup) {
          termData.cleanup();
        }
        if (termData.term) {
          termData.term.dispose();
        }
      });
      this.terminals.clear();
      this.container = null;
      this.el = {};
    }
  }

  window.TerminalTab = TerminalTab;
  console.log('✅ TerminalTab class registered');
})();