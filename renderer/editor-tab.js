(function() {
  'use strict';

  class EditorTab {
    constructor() {
      this.container = null;
      this.editor = null;
      this.el = {};
      this.files = new Map(); // path -> { content, modified }
      this.currentFile = null;
      this.openTabs = [];
    }

    getTabHTML() {
      return window.EditorTabHTML?.getTabHTML?.() || '<div>Editor not loaded</div>';
    }

    getTabCSS() {
      return window.EditorTabCSS?.getTabCSS?.() || '';
    }

    async init(container) {
      console.log('🚀 Initializing Editor Tab...');
      console.log('📦 Container:', container);
      console.log('📦 Container innerHTML length:', container?.innerHTML?.length);
    
      // Check if HTML is actually there
      if (!container.querySelector('.editor-page')) {
        console.error('❌ Editor HTML not found in container!');
        console.log('Container contents:', container.innerHTML.substring(0, 200));
        return;
      }
    
      // Add CSS
      if (!document.getElementById('editor-tab-styles')) {
        const style = document.createElement('style');
        style.id = 'editor-tab-styles';
        style.textContent = this.getTabCSS();
        document.head.appendChild(style);
        console.log('✅ CSS added');
      }
    
      this.container = container;
      this.cacheElements();
      
      console.log('📦 Cached elements:', {
        monacoContainer: !!this.el.monacoContainer,
        editorTabs: !!this.el.editorTabs,
        newBtn: !!this.el.newBtn
      });
    
      if (!this.el.monacoContainer) {
        console.error('❌ Monaco container not found!');
        return;
      }
    
      this.bindEvents();
    
      // Load Monaco
      try {
        await this.loadMonaco();
        console.log('✅ Monaco loaded');
      } catch (e) {
        console.error('❌ Monaco failed to load:', e);
        this.el.monacoContainer.innerHTML = `<div style="color: red; padding: 20px;">Failed to load editor: ${e.message}</div>`;
        return;
      }
    
      if (window.lucide) lucide.createIcons();
      console.log('✅ Editor Tab initialized');
    }
    
    async loadMonaco() {
      console.log('📦 Loading Monaco...');
      console.log('📦 window.monaco exists:', !!window.monaco);
      console.log('📦 window.require exists:', !!window.require);
    
      if (window.monaco) {
        console.log('✅ Monaco already loaded, initializing editor');
        this.initEditor();
        return;
      }
    
      return new Promise((resolve, reject) => {
        // Check if loader already exists
        if (window.require && window.require.config) {
          console.log('✅ Loader already exists, configuring...');
          this.configureAndLoadMonaco(resolve, reject);
          return;
        }
    
        console.log('📦 Loading Monaco loader script...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
        
        script.onload = () => {
          console.log('✅ Loader script loaded');
          this.configureAndLoadMonaco(resolve, reject);
        };
        
        script.onerror = (e) => {
          console.error('❌ Failed to load Monaco loader:', e);
          reject(new Error('Failed to load Monaco loader script'));
        };
        
        document.head.appendChild(script);
      });
    }
    
    configureAndLoadMonaco(resolve, reject) {
      console.log('📦 Configuring Monaco paths...');
      
      require.config({ 
        paths: { 
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
        }
      });
    
      console.log('📦 Loading Monaco editor module...');
      
      require(['vs/editor/editor.main'], () => {
        console.log('✅ Monaco editor module loaded');
        console.log('📦 window.monaco:', !!window.monaco);
        
        if (!window.monaco) {
          reject(new Error('Monaco not available after loading'));
          return;
        }
        
        this.initEditor();
        resolve();
      }, (err) => {
        console.error('❌ Monaco require error:', err);
        reject(err);
      });
    }
    
    initEditor() {
      console.log('📦 Initializing Monaco editor...');
      console.log('📦 Container element:', this.el.monacoContainer);
      console.log('📦 Container dimensions:', {
        width: this.el.monacoContainer?.offsetWidth,
        height: this.el.monacoContainer?.offsetHeight
      });
    
      if (!this.el.monacoContainer) {
        console.error('❌ Monaco container is null!');
        return;
      }
    
      // Make sure container has dimensions
      if (this.el.monacoContainer.offsetHeight === 0) {
        console.warn('⚠️ Monaco container has 0 height, setting minimum');
        this.el.monacoContainer.style.minHeight = '400px';
      }
    
      try {
        // Set theme
        monaco.editor.defineTheme('customDark', {
          base: 'vs-dark',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': '#1e1e1e',
            'editor.foreground': '#d4d4d4',
            'editorCursor.foreground': '#8a6bff',
            'editor.lineHighlightBackground': '#2a2a2a',
            'editor.selectionBackground': '#264f78',
          }
        });
    
        this.editor = monaco.editor.create(this.el.monacoContainer, {
          value: '// Welcome to the Code Editor\n// Press Ctrl+N for new file, Ctrl+O to open\n\nconsole.log("Hello, World!");',
          language: 'javascript',
          theme: 'customDark',
          fontSize: 14,
          fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
        });
    
        console.log('✅ Monaco editor created:', !!this.editor);
    
        // Track cursor position
        this.editor.onDidChangeCursorPosition((e) => {
          if (this.el.cursorPosition) {
            this.el.cursorPosition.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
          }
        });
    
        // Track content changes
        this.editor.onDidChangeModelContent(() => {
          if (this.currentFile) {
            const fileData = this.files.get(this.currentFile);
            if (fileData) {
              fileData.modified = true;
              this.updateTabState(this.currentFile, true);
            }
          }
          if (this.el.fileStatus) {
            this.el.fileStatus.textContent = 'Modified';
          }
        });
    
        // Create initial untitled file
        this.newFile();
        
      } catch (e) {
        console.error('❌ Failed to create Monaco editor:', e);
        throw e;
      }
    }
    cacheElements() {
      const $ = (sel) => this.container.querySelector(sel);
      
      this.el = {
        monacoContainer: $('#monaco-container'),
        editorTabs: $('#editor-tabs'),
        newBtn: $('#editor-new-btn'),
        openBtn: $('#editor-open-btn'),
        saveBtn: $('#editor-save-btn'),
        aiBtn: $('#editor-ai-btn'),
        languageSelect: $('#language-select'),
        currentFile: $('#current-file'),
        cursorPosition: $('#cursor-position'),
        fileStatus: $('#file-status'),
        fileExplorer: $('#file-explorer'),
        fileTree: $('#file-tree'),
        openFolderBtn: $('#open-folder-btn'),
        explorerToggle: $('#explorer-toggle'),
        aiSidebar: $('#ai-sidebar'),
        aiSidebarClose: $('#ai-sidebar-close'),
        aiEditorInput: $('#ai-editor-input'),
        aiEditorSend: $('#ai-editor-send'),
        aiEditorChat: $('#ai-editor-chat')
      };
    }

    bindEvents() {
      this.el.newBtn?.addEventListener('click', () => this.newFile());
      this.el.openBtn?.addEventListener('click', () => this.openFile());
      this.el.saveBtn?.addEventListener('click', () => this.saveFile());
      this.el.aiBtn?.addEventListener('click', () => this.toggleAiSidebar());
      
      this.el.openFolderBtn?.addEventListener('click', () => this.openFolder());
      this.el.explorerToggle?.addEventListener('click', () => this.toggleExplorer());
      
      this.el.aiSidebarClose?.addEventListener('click', () => this.toggleAiSidebar());
      this.el.aiEditorSend?.addEventListener('click', () => this.sendAiMessage());
      this.el.aiEditorInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendAiMessage();
        }
      });

      this.el.languageSelect?.addEventListener('change', () => {
        if (this.editor) {
          const lang = this.el.languageSelect.value;
          monaco.editor.setModelLanguage(this.editor.getModel(), lang);
        }
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 's') {
            e.preventDefault();
            this.saveFile();
          } else if (e.key === 'o') {
            e.preventDefault();
            this.openFile();
          } else if (e.key === 'n') {
            e.preventDefault();
            this.newFile();
          }
        }
      });
    }

    newFile() {
      const id = `untitled-${Date.now()}`;
      this.files.set(id, {
        name: 'Untitled',
        path: null,
        content: '',
        modified: false
      });
      
      this.addTab(id, 'Untitled');
      this.switchToFile(id);
    }

    addTab(id, name) {
      const tab = document.createElement('div');
      tab.className = 'editor-tab active';
      tab.dataset.fileId = id;
      tab.innerHTML = `
        <span class="tab-name">${name}</span>
        <span class="close-tab"><i data-lucide="x" width="12" height="12"></i></span>
      `;

      // Deactivate other tabs
      this.el.editorTabs.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
      
      this.el.editorTabs.appendChild(tab);
      this.openTabs.push(id);

      // Tab click
      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.close-tab')) {
          this.switchToFile(id);
        }
      });

      // Close tab
      tab.querySelector('.close-tab').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(id);
      });

      if (window.lucide) lucide.createIcons();
    }

    switchToFile(id) {
      const fileData = this.files.get(id);
      if (!fileData) return;

      // Save current content
      if (this.currentFile && this.editor) {
        const current = this.files.get(this.currentFile);
        if (current) {
          current.content = this.editor.getValue();
        }
      }

      // Switch
      this.currentFile = id;
      this.editor.setValue(fileData.content);
      this.el.currentFile.textContent = fileData.name;

      // Update tab state
      this.el.editorTabs.querySelectorAll('.editor-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.fileId === id);
      });

      // Detect language
      const ext = fileData.name.split('.').pop()?.toLowerCase();
      const langMap = {
        js: 'javascript', ts: 'typescript', py: 'python',
        html: 'html', css: 'css', json: 'json', md: 'markdown',
        rs: 'rust', go: 'go', cpp: 'cpp', java: 'java'
      };
      const lang = langMap[ext] || 'plaintext';
      this.el.languageSelect.value = lang;
      monaco.editor.setModelLanguage(this.editor.getModel(), lang);
    }

    closeTab(id) {
      const fileData = this.files.get(id);
      
      // Check if modified
      if (fileData?.modified) {
        if (!confirm(`${fileData.name} has unsaved changes. Close anyway?`)) {
          return;
        }
      }

      // Remove tab
      const tab = this.el.editorTabs.querySelector(`[data-file-id="${id}"]`);
      tab?.remove();

      // Remove from tracking
      this.files.delete(id);
      this.openTabs = this.openTabs.filter(t => t !== id);

      // Switch to another tab or create new
      if (this.currentFile === id) {
        if (this.openTabs.length > 0) {
          this.switchToFile(this.openTabs[this.openTabs.length - 1]);
        } else {
          this.newFile();
        }
      }
    }

    updateTabState(id, modified) {
      const tab = this.el.editorTabs.querySelector(`[data-file-id="${id}"]`);
      tab?.classList.toggle('modified', modified);
    }

    async openFile() {
      if (!window.electronAPI?.openFile) {
        alert('File API not available');
        return;
      }

      try {
        const result = await window.electronAPI.openFile();
        if (result) {
          const id = result.path || `file-${Date.now()}`;
          this.files.set(id, {
            name: result.name,
            path: result.path,
            content: result.content,
            modified: false
          });
          
          this.addTab(id, result.name);
          this.switchToFile(id);
          this.el.fileStatus.textContent = 'Opened';
        }
      } catch (e) {
        console.error('Failed to open file:', e);
      }
    }

    async saveFile() {
      if (!this.currentFile || !this.editor) return;

      const fileData = this.files.get(this.currentFile);
      if (!fileData) return;

      fileData.content = this.editor.getValue();

      try {
        if (window.electronAPI?.saveFile) {
          const result = await window.electronAPI.saveFile({
            path: fileData.path,
            name: fileData.name,
            content: fileData.content
          });

          if (result) {
            fileData.path = result.path;
            fileData.name = result.name;
            fileData.modified = false;
            
            this.updateTabState(this.currentFile, false);
            this.el.currentFile.textContent = fileData.name;
            this.el.fileStatus.textContent = 'Saved';

            // Update tab name
            const tab = this.el.editorTabs.querySelector(`[data-file-id="${this.currentFile}"]`);
            if (tab) {
              tab.querySelector('.tab-name').textContent = fileData.name;
            }
          }
        }
      } catch (e) {
        console.error('Failed to save:', e);
        this.el.fileStatus.textContent = 'Save failed';
      }
    }

    async openFolder() {
      if (!window.electronAPI?.openFolder) {
        alert('Folder API not available');
        return;
      }

      try {
        const folder = await window.electronAPI.openFolder();
        if (folder) {
          this.renderFileTree(folder);
        }
      } catch (e) {
        console.error('Failed to open folder:', e);
      }
    }

    renderFileTree(folder) {
      this.el.fileTree.innerHTML = '';
      this.renderTreeItems(folder.children, this.el.fileTree, 0);
    }

    renderTreeItems(items, container, depth) {
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = `file-item ${item.type}`;
        div.style.paddingLeft = `${12 + depth * 16}px`;
        div.innerHTML = `
          <i data-lucide="${item.type === 'folder' ? 'folder' : 'file'}" 
             width="14" height="14" class="file-icon"></i>
          <span>${item.name}</span>
        `;

        if (item.type === 'file') {
          div.addEventListener('click', () => this.openFileFromTree(item));
        } else if (item.type === 'folder' && item.children) {
          div.addEventListener('click', () => {
            div.classList.toggle('expanded');
            const childContainer = div.nextElementSibling;
            if (childContainer) {
              childContainer.style.display = childContainer.style.display === 'none' ? 'block' : 'none';
            }
          });
        }

        container.appendChild(div);

        if (item.type === 'folder' && item.children) {
          const childContainer = document.createElement('div');
          childContainer.className = 'folder-children';
          this.renderTreeItems(item.children, childContainer, depth + 1);
          container.appendChild(childContainer);
        }
      });

      if (window.lucide) lucide.createIcons();
    }

    async openFileFromTree(item) {
      if (!window.electronAPI?.readFile) return;

      try {
        const content = await window.electronAPI.readFile(item.path);
        const id = item.path;
        
        // Check if already open
        if (this.files.has(id)) {
          this.switchToFile(id);
          return;
        }

        this.files.set(id, {
          name: item.name,
          path: item.path,
          content: content,
          modified: false
        });
        
        this.addTab(id, item.name);
        this.switchToFile(id);
      } catch (e) {
        console.error('Failed to read file:', e);
      }
    }

    toggleExplorer() {
      this.el.fileExplorer.classList.toggle('collapsed');
    }

    toggleAiSidebar() {
      this.el.aiSidebar.classList.toggle('visible');
    }

    async sendAiMessage() {
      const input = this.el.aiEditorInput?.value.trim();
      if (!input) return;

      this.el.aiEditorInput.value = '';

      // Get selected code or all code
      const selection = this.editor?.getModel().getValueInRange(this.editor.getSelection());
      const code = selection || this.editor?.getValue() || '';

      // Add user message
      this.addAiMessage('user', input);

      // Create assistant message
      const msgEl = this.addAiMessage('assistant', 'Thinking...');

      try {
        const messages = [
          { 
            role: 'system', 
            content: 'You are a helpful coding assistant. Help the user with their code. Be concise.' 
          },
          { 
            role: 'user', 
            content: `Code:\n\`\`\`\n${code}\n\`\`\`\n\nQuestion: ${input}` 
          }
        ];

        const response = await window.electronAPI?.llamaChat(messages, {
          temperature: 0.3,
          max_tokens: 1024
        });

        const content = response?.choices?.[0]?.message?.content || 'No response';
        msgEl.innerHTML = this.formatAiResponse(content);
      } catch (e) {
        msgEl.textContent = `Error: ${e.message}`;
      }
    }

    addAiMessage(role, content) {
      const div = document.createElement('div');
      div.className = `ai-msg ${role}`;
      div.textContent = content;
      this.el.aiEditorChat.appendChild(div);
      this.el.aiEditorChat.scrollTop = this.el.aiEditorChat.scrollHeight;
      return div;
    }

    formatAiResponse(text) {
      // Basic markdown to HTML
      return text
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }

    destroy() {
      if (this.editor) {
        this.editor.dispose();
      }
      this.container = null;
      this.el = {};
    }
  }

  window.EditorTab = EditorTab;
  console.log('✅ EditorTab class registered');
})();