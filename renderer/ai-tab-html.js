(function() {
  'use strict';

  function getTabHTML() {
    return `
      <div class="ai-page">
        <div class="ai-header">
          <div class="ai-logo">
            <i data-lucide="bot" width="24" height="24"></i>
            <span>AI Assistant</span>
          </div>
          <div class="ai-controls">
            <div class="model-group">
              <label>Model</label>
              <select id="ai-model-select"></select>
            </div>
            <div class="model-group">
  <label>GPU Mode</label>
  <select id="ai-gpu-mode">
    <option value="full" selected>Full GPU</option>
    <option value="gpt-oss">gpt-oss</option>
    <option value="GLM">GLM</option>
    <option value="cpu">CPU Only</option>
  </select>
</div>
            <button id="ai-toggle-btn" class="control-btn">Start</button>
            <div class="ai-status" id="ai-status">
              <span class="dot"></span>
              <span class="text">Offline</span>
            </div>
          </div>
        </div>

        <div class="ai-body">
          <div class="chat-section">
            <div class="messages" id="messages">
              <div class="welcome" id="welcome">
                <div class="welcome-icon">🤖</div>
                <h2>AI Assistant</h2>
                <p>Chat, generate code, or search the web</p>
                
                <div class="mode-hints">
                  <div class="mode-hint">
                    <span class="mode-icon">💬</span>
                    <div><strong>Chat</strong><small>Just type normally</small></div>
                  </div>
                  <div class="mode-hint">
                    <span class="mode-icon">💻</span>
                    <div><strong>Code</strong><small>"write a python server"</small></div>
                  </div>
                  <div class="mode-hint">
                    <span class="mode-icon">🔍</span>
                    <div><strong>Search</strong><small>Start with ? or /search</small></div>
                  </div>
                </div>

                <div class="examples">
                  <button class="example">Hi, how are you?</button>
                  <button class="example">Write a React useState hook</button>
                  <button class="example">?What is quantum computing</button>
                  <button class="example">Python async web scraper</button>
                </div>
              </div>
            </div>

            <div class="input-section">
              <div class="input-mode" id="input-mode">💬 Chat</div>
              <textarea id="user-input" placeholder="Chat, ask for code, or search with ?..." rows="1"></textarea>
              <button id="send-btn" disabled>
                <i data-lucide="send" width="20" height="20"></i>
              </button>
            </div>
          </div>

          <div class="code-section" id="code-section">
            <div class="code-header">
              <span>💻 Generated Code</span>
              <div class="code-actions">
                <button id="copy-btn" title="Copy"><i data-lucide="copy" width="14" height="14"></i></button>
                <button id="save-btn" title="Save"><i data-lucide="save" width="14" height="14"></i></button>
                <button id="apply-diff-btn" title="Apply Changes" style="display:none;"><i data-lucide="check" width="14" height="14"></i> Apply</button>
                <button id="reject-diff-btn" title="Reject Changes" style="display:none;"><i data-lucide="x" width="14" height="14"></i></button>
                <button id="close-code-btn" title="Close"><i data-lucide="x" width="14" height="14"></i></button>
              </div>
            </div>
            <pre id="code-display"><code id="code-content"></code></pre>
            <div class="diff-view" id="diff-view"></div>
            <div class="verification-bar" id="verification-bar"></div>
          </div>
        </div>
      </div>
    `;
  }

  window.AITabHTML = {
    getTabHTML: getTabHTML
  };

  console.log('✅ AITabHTML loaded');
})();