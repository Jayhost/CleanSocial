(function() {
  'use strict';

  // Defensive loading - get these INSIDE methods, not at top level
  function getFormatMessage() {
    return window.AIUtils?.formatMessage || ((s) => s || '');
  }
  
  function getDetectMode() {
    return window.AIUtils?.detectMode || (() => 'chat');
  }
  
  function getFormatSearchResults() {
    return window.AIUtils?.formatSearchResults || ((r, q) => `Results for: ${q}`);
  }
  
  function getTabHTML() {
    return window.AITabHTML?.getTabHTML?.() || '<div class="ai-page"><p>AI Tab HTML not loaded</p></div>';
  }
  
  function getTabCSS() {
    return window.AITabCSS?.getTabCSS?.() || '';
  }
  
  function getCodePanel() {
    return window.CodePanel || class DummyCodePanel { 
      constructor() {} 
      show() {} 
      hide() {} 
      setStatus() {} 
      showDiffResult() {} 
    };
  }

  class AISearchTab {
    constructor() {
      this.isRunning = false;
      this.isProcessing = false;
      this.conversationHistory = [];
      this.el = null;
      this.container = null;
      this.statusInterval = null;
      this.codePanel = null;
    }

    getTabHTML() { return getTabHTML(); }
    getTabCSS() { return getTabCSS(); }

    async init(container) {
      console.log('🚀 Initializing AI Search Tab...');

      if (!document.getElementById('ai-tab-styles')) {
        const style = document.createElement('style');
        style.id = 'ai-tab-styles';
        style.textContent = this.getTabCSS();
        document.head.appendChild(style);
      }

      this.container = container;
      this.cacheElements();

      const CodePanelClass = getCodePanel();
      this.codePanel = new CodePanelClass({
        codeSection: this.el.codeSection,
        codeContent: this.el.codeContent,
        copyBtn: this.el.copyBtn,
        saveBtn: this.el.saveBtn,
        closeCodeBtn: this.el.closeCodeBtn,
        applyDiffBtn: this.el.applyDiffBtn,
        rejectDiffBtn: this.el.rejectDiffBtn,
        diffView: this.el.diffView,
        verificationBar: this.el.verificationBar
      });

      await this.loadModels();
      await this.updateStatus();
      this.bindEvents();

      this.statusInterval = setInterval(() => this.updateStatus(), 5000);

      if (window.lucide) lucide.createIcons();

      console.log('✅ AI Search Tab initialized');
    }

    cacheElements() {
      const $ = (sel) => this.container.querySelector(sel);

      this.el = {
        modelSelect: $('#ai-model-select'),
        gpuMode: $('#ai-gpu-mode'), 
        toggleBtn: $('#ai-toggle-btn'),
        status: $('#ai-status'),
        messages: $('#messages'),
        welcome: $('#welcome'),
        input: $('#user-input'),
        inputMode: $('#input-mode'),
        sendBtn: $('#send-btn'),
        codeSection: $('#code-section'),
        codeContent: $('#code-content'),
        verificationBar: $('#verification-bar'),
        diffView: $('#diff-view'),
        copyBtn: $('#copy-btn'),
        saveBtn: $('#save-btn'),
        closeCodeBtn: $('#close-code-btn'),
        applyDiffBtn: $('#apply-diff-btn'),
        rejectDiffBtn: $('#reject-diff-btn'),
        examples: this.container.querySelectorAll('.example')
      };
    }

    bindEvents() {
      this.el.toggleBtn?.addEventListener('click', () => this.toggleServer());
      this.el.sendBtn?.addEventListener('click', () => this.handleSubmit());

      this.el.input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSubmit();
        }
      });

      this.el.input?.addEventListener('input', () => {
        this.el.input.style.height = 'auto';
        this.el.input.style.height = Math.min(this.el.input.scrollHeight, 120) + 'px';
        this.updateInputMode();
      });

      this.el.examples?.forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.el.input) {
            this.el.input.value = btn.textContent;
            this.updateInputMode();
            this.handleSubmit();
          }
        });
      });
    }

    async loadModels() {
      if (!window.electronAPI?.llamaGetModels) {
        if (this.el.modelSelect) this.el.modelSelect.innerHTML = '<option>API not available</option>';
        return;
      }

      try {
        const models = await window.electronAPI.llamaGetModels();

        if (!this.el.modelSelect) return;
        this.el.modelSelect.innerHTML = '';

        if (!models?.length) {
          this.el.modelSelect.innerHTML = '<option>No models found</option>';
          return;
        }

        models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.path || m.name;
          opt.textContent = m.name?.replace('.gguf', '') || 'Unknown';
          this.el.modelSelect.appendChild(opt);
        });
      } catch (e) {
        console.error('Model load failed:', e);
      }
    }

    async updateStatus() {
      if (!window.electronAPI?.llamaGetStatus) return;

      try {
        const s = await window.electronAPI.llamaGetStatus();
        this.isRunning = s.isRunning;

        if (this.el.status) {
          this.el.status.classList.toggle('online', s.isRunning);
          const text = this.el.status.querySelector('.text');
          if (text) text.textContent = s.isRunning ? 'Online' : 'Offline';
        }

        if (this.el.toggleBtn) {
          this.el.toggleBtn.textContent = s.isRunning ? 'Stop' : 'Start';
          this.el.toggleBtn.classList.toggle('running', s.isRunning);
        }

        if (this.el.sendBtn) this.el.sendBtn.disabled = !s.isRunning;
      } catch (e) {
        console.error('Status check failed:', e);
      }
    }

   

    async toggleServer() {
      if (!window.electronAPI) return;
    
      if (this.isRunning) {
        await window.electronAPI.llamaStop();
      } else {
        const modelPath = this.el.modelSelect?.value;
        if (!modelPath || modelPath.includes('not available') || modelPath.includes('No models')) {
          this.addMsg('assistant', 'Please select a valid model first');
          return;
        }
    
        if (this.el.toggleBtn) {
          this.el.toggleBtn.disabled = true;
          this.el.toggleBtn.textContent = 'Starting...';
        }
    
        const gpuMode = this.el.gpuMode?.value || 'auto';
        const gpuSettings = this.getGpuSettings(gpuMode);
        console.log(`🎮 GPU Mode: ${gpuMode}`, gpuSettings);
    
        try {
          await window.electronAPI.llamaStart(modelPath, {
            ctxSize: 4000,
            ...gpuSettings  
          });
        } catch (e) {
          this.addMsg('assistant', `Failed to start: ${e.message}`);
        }
    
        if (this.el.toggleBtn) this.el.toggleBtn.disabled = false;
      }
    
      await this.updateStatus();
    }

    updateInputMode() {
      if (!this.el.input || !this.el.inputMode) return;

      const detectMode = getDetectMode();
      const mode = detectMode(this.el.input.value);
      const config = {
        chat: { text: '💬 Chat', class: 'chat' },
        code: { text: '💻 Code', class: 'code' },
        search: { text: '🔍 Search', class: 'search' }
      }[mode];

      this.el.inputMode.textContent = config.text;
      this.el.inputMode.className = `input-mode ${config.class}`;
    }

    getGpuSettings(mode) {
      switch (mode) {
        case 'full':
          return {
            ngl: 99,
          };
        case 'gpt-oss':
          return {
            ngl: 25,
            c: 4000,
            tensorOffload: 'blk\.12\.ffn_(gate|down).*=CPU,blk\.13\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.14\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.15\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.16\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.17\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.18\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.19\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.20\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.21\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.22\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.23\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.24\.ffn_(up|down|gate)_(ch|)exps=CPU'
          };

          case 'GLM':
            return {
              ngl: 48,
              chatTemplateKwargs: '{"enable_thinking": false}',
              tensorOffload: 'blk\.21\.ffn_(gate|down).*=CPU,blk\.22\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.23\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.24\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.25\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.26\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.27\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.28\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.29\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.30\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.31\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.32\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.33\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.34\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.35\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.36\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.37\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.38\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.39\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.40\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.41\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.42\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.43\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.44\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.45\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.46\.ffn_(up|down|gate)_(ch|)exps=CPU,blk\.47\.ffn_(up|down|gate)_(ch|)exps=CPU'

            };
        
        case 'cpu':
          return {
            ngl: 0,
          };
        
        default:
          return { ngl: 25 };
      }
    }

    hideWelcome() {
      if (this.el.welcome) this.el.welcome.style.display = 'none';
    }

    addMsg(role, content, className = '') {
      this.hideWelcome();

      const formatMessage = getFormatMessage();
      const div = document.createElement('div');
      div.className = `msg ${role} ${className}`.trim();
      div.innerHTML = formatMessage(content);

      if (this.el.messages) {
        this.el.messages.appendChild(div);
        this.el.messages.scrollTop = this.el.messages.scrollHeight;
      }
      return div;
    }

    addThinking(text = '') {
      this.hideWelcome();

      const div = document.createElement('div');
      div.className = 'msg assistant streaming';
      div.textContent = text;

      if (this.el.messages) {
        this.el.messages.appendChild(div);
        this.el.messages.scrollTop = this.el.messages.scrollHeight;
      }
      return div;
    }

    updateMsg(el, content, className = '') {
      if (el) {
        const formatMessage = getFormatMessage();
        el.className = `msg assistant ${className}`.trim();
        el.innerHTML = formatMessage(content);
      }
    }

    async handleSubmit() {
      if (!this.el.input) return;

      const rawInput = this.el.input.value.trim();
      if (!rawInput || !this.isRunning || this.isProcessing) return;

      this.isProcessing = true;
      this.el.input.value = '';
      this.el.input.style.height = 'auto';
      if (this.el.sendBtn) this.el.sendBtn.disabled = true;
      this.updateInputMode();

      const detectMode = getDetectMode();
      const mode = detectMode(rawInput);
      let query = rawInput;

      if (mode === 'search') {
        query = rawInput.replace(/^\?/, '').replace(/^\/search\s+/i, '').trim();
      }

      this.addMsg('user', rawInput);

      try {
        switch (mode) {
          case 'search':
            await this.handleSearch(query);
            break;
          case 'code':
            await this.handleCode(query);
            break;
          default:
            await this.handleChat(query);
        }
      } catch (e) {
        console.error('Error:', e);
        this.addMsg('assistant', `Error: ${e.message || 'Something went wrong'}`);
      } finally {
        this.isProcessing = false;
        if (this.el.sendBtn) this.el.sendBtn.disabled = !this.isRunning;
      }
    }

    async handleChat(query) {
      const msgEl = this.addThinking('');
    
      const messages = [
        { role: 'system', content: 'You are a helpful assistant. Give clear, concise responses.' }
      ];
    
      for (const msg of this.conversationHistory.slice(-6)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    
      messages.push({ role: 'user', content: query });
    
      try {
        // Start streaming
        const channelId = await window.electronAPI.llamaStreamChat(messages, {
          temperature: 0.7,
          max_tokens: 512
        });
    
        let fullContent = '';
        
        // Listen for stream events
        const cleanup = window.electronAPI.onLlamaStream(channelId, (data) => {
          if (data.type === 'chunk') {
            fullContent += data.content;
            // Update the message element with accumulated content
            msgEl.textContent = fullContent;
            // Auto-scroll
            if (this.el.messages) {
              this.el.messages.scrollTop = this.el.messages.scrollHeight;
            }
          } else if (data.type === 'done') {
            // Final formatting pass
            fullContent = this.cleanResponse(fullContent);
            this.updateMsg(msgEl, fullContent);
            
            this.conversationHistory.push({ role: 'user', content: query });
            this.conversationHistory.push({ role: 'assistant', content: fullContent });
            
            cleanup(); // Remove listener
          } else if (data.type === 'error') {
            this.updateMsg(msgEl, `Error: ${data.error}`);
            cleanup();
          }
        });
    
      } catch (e) {
        console.error('Chat error:', e);
        this.updateMsg(msgEl, `Error: ${e.message}`);
      }
    }

    async handleCode(query) {
      const msgEl = this.addThinking('Generating code...');

      const language = this.detectLanguage(query);

      const messages = [
        { role: 'system', content: `You are a coding assistant. Write clean, working ${language} code. Output ONLY the code, no explanations.` },
        { role: 'user', content: `Write ${language} code for: ${query}` }
      ];

      try {
        const response = await window.electronAPI.llamaChat(messages, {
          temperature: 0.3,
          max_tokens: 2048
        });

        let content = '';
        if (response?.choices?.[0]?.message?.content) {
          content = response.choices[0].message.content;
        } else if (typeof response === 'string') {
          content = response;
        }

        let code = this.extractCode(content, language);

        if (!code || code.length < 20) {
          this.updateMsg(msgEl, 'Could not generate code. Please try again.');
          return;
        }

        this.conversationHistory.push({ role: 'user', content: query });
        this.conversationHistory.push({ role: 'assistant', content: code });

        this.updateMsg(msgEl, `Generated code:\n\n\`\`\`${language}\n${code}\n\`\`\``);
        this.codePanel.show(code);

        if (code.length > 50) {
          await this.verifyCode(query, code);
        }
      } catch (e) {
        this.updateMsg(msgEl, `Error: ${e.message}`);
      }
    }

    extractCode(response, language) {
      if (!response) return '';

      let code = response;
      const codeBlockMatch = code.match(/```(?:\w+)?\n?([\s\S]*?)```/);
      if (codeBlockMatch) {
        code = codeBlockMatch[1];
      }

      code = code.trim();

      const lines = code.split('\n');
      while (lines.length > 0) {
        const lastLine = lines[lines.length - 1].trim();
        if (lastLine === '' ||
            lastLine.startsWith('This ') ||
            lastLine.startsWith('The ') ||
            lastLine.startsWith('Note:') ||
            lastLine.startsWith('Output:') ||
            lastLine.startsWith('Explanation:')) {
          lines.pop();
        } else {
          break;
        }
      }

      return lines.join('\n').trim();
    }

    detectLanguage(query) {
      const q = query.toLowerCase();
      if (q.includes('python') || q.includes('pygame') || q.includes('flask')) return 'python';
      if (q.includes('javascript') || q.includes('node') || q.includes('react')) return 'javascript';
      if (q.includes('typescript')) return 'typescript';
      if (q.includes('java ') || q.includes('spring')) return 'java';
      if (q.includes('c++') || q.includes('cpp')) return 'cpp';
      if (q.includes('rust')) return 'rust';
      if (q.includes('go ') || q.includes('golang')) return 'go';
      if (q.includes('html')) return 'html';
      if (q.includes('css')) return 'css';
      if (q.includes('sql')) return 'sql';
      if (q.includes('bash') || q.includes('shell')) return 'bash';
      return 'python';
    }

    cleanResponse(text) {
      if (!text) return '';

      let result = text.trim();

      const thinkingPatterns = [
        /^(The user (says|asks|wants|might).*?\n)+/gm,
        /<think>[\s\S]*?<\/think>/g,
        /<reasoning>[\s\S]*?<\/reasoning>/g,
      ];

      for (const pattern of thinkingPatterns) {
        result = result.replace(pattern, '');
      }

      const lines = result.split('\n');
      const seen = new Set();
      const cleaned = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!seen.has(trimmed) || trimmed === '') {
          seen.add(trimmed);
          cleaned.push(line);
        }
      }

      return cleaned.join('\n').trim();
    }

    async handleSearch(query) {
      const msgEl = this.addThinking('🔍 Searching...');

      try {
        const results = await window.electronAPI.browserSearch(query, {
          numResults: 8,
          fetchImages: true
        });

        if (results?.length > 0) {
          const formatSearchResults = getFormatSearchResults();
          const html = formatSearchResults(results, query);

          this.conversationHistory.push({ role: 'user', content: `?${query}` });
          this.conversationHistory.push({ role: 'assistant', content: `Search results for: ${query}` });

          msgEl.className = 'msg assistant search-result';
          msgEl.innerHTML = html;
        } else {
          this.updateMsg(msgEl, `No results found for "${query}".`, 'search-result');
        }
      } catch (e) {
        this.updateMsg(msgEl, `Search error: ${e.message}`);
      }
    }

    async verifyCode(request, generatedCode) {
      if (!this.isRunning) {
        this.codePanel.setStatus('success', '✅ Generated');
        return;
      }

      this.codePanel.setStatus('searching', '🔍 Checking for bugs...');

      try {
        const searchQuery = request
          .toLowerCase()
          .replace(/write|create|build|make|generate|a|an|the|in|using/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const result = await window.electronAPI.codeRevise(generatedCode, searchQuery);

        if (!result || !result.changed) {
          this.codePanel.setStatus('success', '✅ ' + (result?.message || 'No bugs found'));
          return;
        }

        this.codePanel.showDiffResult(result);
      } catch (err) {
        console.error('Verification failed:', err);
        this.codePanel.setStatus('success', '✅ Generated');
      }
    }

    destroy() {
      if (this.statusInterval) clearInterval(this.statusInterval);
      this.el = null;
      this.container = null;
      this.codePanel = null;
    }
  }

  // This MUST execute even if dependencies are missing
  window.AISearchTab = AISearchTab;
  console.log('✅ AISearchTab class registered');
  
})();