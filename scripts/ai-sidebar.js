// scripts/ai-sidebar.js - Full Fixed Logic
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const aiToggle = document.getElementById('ai-toggle');
    const sidebar = document.getElementById('ai-sidebar');
    const closeBtn = document.getElementById('close-ai-sidebar');
    const chatContainer = document.getElementById('ai-chat-container');
    const chatInput = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-send-btn');
    const modelSelect = document.getElementById('ai-model-select');
    const modelSize = document.getElementById('ai-model-size');
    const startBtn = document.getElementById('ai-start-btn');
    const statusDot = document.getElementById('ai-status-dot');
    const statusText = document.getElementById('ai-status-text');
  
    let isLlamaRunning = false;
    let models = [];
    let isInitialized = false;
  
    // --- 1. THE TOGGLE LOGIC ---
    if (aiToggle) {
      aiToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation(); // Kills interference from app.js
        
        const isOpen = sidebar.classList.toggle('open');
        aiToggle.classList.toggle('active', isOpen);
        
        if (isOpen && !isInitialized) {
          initSidebar();
        }
      });
    }
  
    closeBtn?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      aiToggle.classList.remove('active');
    });
  
    // --- 2. INITIALIZATION ---
    async function initSidebar() {
      if (isInitialized) return;
      try {
        const api = window.electronAPI;
        if (!api) throw new Error("Electron API not found. Check preload script.");
  
        const hasBinary = await api.llamaCheckBinary();
        if (!hasBinary) {
          statusText.textContent = 'Binary missing';
          addMessage('⚠️ llama-server binary not found in llama/bin/', false);
          return;
        }
  
        await loadModels();
        await updateStatus();
        isInitialized = true;
      } catch (err) {
        console.error('AI init error:', err);
        addMessage(`❌ Init Error: ${err.message}`, false);
      }
    }

    // Add this helper to extract code from AI response
function extractCode(text) {
    const regex = /```(?:\w+)?\n([\s\S]+?)\n```/;
    const match = text.match(regex);
    return match ? match[1] : null;
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !isLlamaRunning) return;

    addMessage(message, true);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('chat-message', 'ai-message', 'loading');
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    chatInput.disabled = true;
    sendBtn.disabled = true;

    try {
        // Updated prompt for better code generation
        const prompt = `[INST] Write the following code. Use triple backticks for code blocks. \nQuestion: ${message} [/INST]`;
        
        const response = await window.electronAPI.llamaGenerate(prompt, { 
            maxTokens: 1024,
            temperature: 0.2, // Lower temperature is better for code
            stop: ['[/INST]', '</s>']
        });
        
        loadingDiv.remove();
        
        // --- THE MAGIC PART ---
        const code = extractCode(response);
        if (code && window.setEditorContent) {
            window.setEditorContent(code);
            addMessage(response.replace(/```[\s\S]*?```/g, "*(Code sent to editor)*"), false);
        } else {
            addMessage(response.trim(), false);
        }
        
    } catch (err) {
        console.error('Generation error:', err);
        loadingDiv.textContent = `❌ Error: ${err.message}`;
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}
  
    // --- 3. MODEL MANAGEMENT ---
    async function loadModels() {
      try {
        models = await window.electronAPI.llamaGetModels() || [];
        modelSelect.innerHTML = '';
  
        if (models.length === 0) {
          modelSelect.innerHTML = '<option>No models found</option>';
          return;
        }
  
        models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.path;
          opt.textContent = m.name.replace('.gguf', '');
          modelSelect.appendChild(opt);
        });
  
        modelSelect.value = models[0].path;
        modelSize.textContent = formatBytes(models[0].size);
        modelSelect.disabled = false;
      } catch (err) {
        console.error('Model load error:', err);
      }
    }
  
    // --- 4. SERVER CONTROL ---
    startBtn.addEventListener('click', async () => {
      if (isLlamaRunning) {
        await window.electronAPI.llamaStop();
        await updateStatus();
        return;
      }
  
      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';
  
      try {
        await window.electronAPI.llamaStart(modelSelect.value, {
          ctxSize: 2048,
          useCuda: true
        });
        await updateStatus();
        addMessage("✅ AI Ready.", false);
      } catch (err) {
        addMessage(`❌ Failed: ${err.message}`, false);
      } finally {
        startBtn.disabled = false;
      }
    });
  
    async function updateStatus() {
      const status = await window.electronAPI.llamaGetStatus();
      isLlamaRunning = status.isRunning;
      statusDot.className = `status-dot ${isLlamaRunning ? 'online' : 'offline'}`;
      statusText.textContent = isLlamaRunning ? 'Online' : 'Offline';
      startBtn.textContent = isLlamaRunning ? 'Stop AI' : 'Start AI';
      chatInput.disabled = !isLlamaRunning;
      sendBtn.disabled = !isLlamaRunning;
    }
  
    // --- 5. CHAT LOGIC ---
    async function sendMessage() {
      const text = chatInput.value.trim();
      if (!text || !isLlamaRunning) return;
  
      addMessage(text, true);
      chatInput.value = '';
  
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'chat-message ai-message loading';
      chatContainer.appendChild(loadingDiv);
  
      try {
        // Ministral format: [INST] prompt [/INST]
        const prompt = `[INST] ${text} [/INST]`;
        const response = await window.electronAPI.llamaGenerate(prompt, {
          maxTokens: 512,
          stop: ["[/INST]", "</s>"]
        });
        loadingDiv.remove();
        addMessage(response.trim(), false);
      } catch (err) {
        loadingDiv.textContent = "Error generating response.";
      }
    }
  
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  
    function addMessage(content, isUser) {
      const div = document.createElement('div');
      div.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
      div.textContent = content;
      chatContainer.appendChild(div);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  
    function formatBytes(b) {
      return (b / (1024 ** 3)).toFixed(2) + ' GB';
    }
  
    setInterval(() => { if (isInitialized) updateStatus(); }, 5000);
  });