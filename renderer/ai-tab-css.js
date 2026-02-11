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

</div> <button id="ai-toggle-btn" class="control-btn">Start</button> <div class="ai-status" id="ai-status"> <span class="dot"></span> <span class="text">Offline</span> </div> </div> </div>


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

// CSS for AI tab
// Browser-compatible (IIFE pattern)

(function() {
'use strict';

function getTabCSS() {
    return `
      /* ==================== AI PAGE LAYOUT ==================== */
      
      .ai-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #0a0a0a;
        color: #e0e0e0;
        font-family: system-ui, -apple-system, sans-serif;
        /* FIX: Constrain this container absolutely if parent has no height */
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
      }

      .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px;
        background: #111;
        border-bottom: 1px solid #252525;
        flex-shrink: 0;
      }

      .ai-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #8a6bff;
      }

      .ai-controls {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .model-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .model-group label {
        font-size: 10px;
        color: #888;
        white-space: nowrap;
      }

      .model-group select {
        padding: 6px 10px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 6px;
        color: #ccc;
        font-size: 12px;
        max-width: 180px;
      }

      #ai-gpu-mode {
        max-width: 140px;
      }

      #ai-gpu-mode option {
        background: #1a1a1a;
        color: #ccc;
      }

      .model-group select:hover,
      .model-group select:focus {
        border-color: #8a6bff;
        outline: none;
      }

      .control-btn {
        padding: 6px 14px;
        background: #8a6bff;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .control-btn:hover { background: #7a5bef; }
      .control-btn.running { background: #ef4444; }
      .control-btn:disabled { opacity: 0.6; cursor: not-allowed; }

      .reviser-btn { background: #22c55e; }
      .reviser-btn:hover { background: #16a34a; }
      .reviser-btn.running { background: #ef4444; }

      .status-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .ai-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #888;
      }

      .ai-status .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ef4444;
      }

      .ai-status.online .dot {
        background: #22c55e;
        box-shadow: 0 0 6px #22c55e;
      }

      /* ==================== CHAT AREA ==================== */

      .ai-body {
        flex: 1;
        display: flex;
        overflow: hidden;
        min-height: 0;           /* FIX: Allow flex child to shrink */
      }

      .chat-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 350px;
        min-height: 0;           /* FIX: Allow flex child to shrink */
        overflow: hidden;        /* FIX: Constrain children */
      }

      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        min-height: 0;           /* FIX: Critical for scroll to work */
      }

      /* ==================== CUSTOM SCROLLBARS ==================== */

      .messages::-webkit-scrollbar,
      #code-display::-webkit-scrollbar,
      .diff-view::-webkit-scrollbar {
        width: 8px;
      }

      .messages::-webkit-scrollbar-track,
      #code-display::-webkit-scrollbar-track,
      .diff-view::-webkit-scrollbar-track {
        background: #111;
      }

      .messages::-webkit-scrollbar-thumb,
      #code-display::-webkit-scrollbar-thumb,
      .diff-view::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
      }

      .messages::-webkit-scrollbar-thumb:hover,
      #code-display::-webkit-scrollbar-thumb:hover,
      .diff-view::-webkit-scrollbar-thumb:hover {
        background: #666;
      }

      /* Firefox */
      .messages,
      #code-display,
      .diff-view {
        scrollbar-width: thin;
        scrollbar-color: #444 #111;
      }

      .welcome {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #888;
      }

      .welcome-icon { font-size: 48px; margin-bottom: 16px; }
      .welcome h2 { margin: 0 0 8px; color: #e0e0e0; font-size: 1.5rem; }
      .welcome p { margin: 0 0 24px; color: #666; }

      .mode-hints {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .mode-hint {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: #151515;
        border: 1px solid #252525;
        border-radius: 10px;
        text-align: left;
      }

      .mode-hint .mode-icon { font-size: 24px; }
      .mode-hint strong { display: block; color: #e0e0e0; font-size: 13px; }
      .mode-hint small { color: #666; font-size: 11px; }

      .examples {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        max-width: 500px;
      }

      .ai-page .example {
        padding: 8px 14px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 16px;
        color: #aaa;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .ai-page .example:hover {
        background: #252525;
        border-color: #8a6bff;
        color: #fff;
      }

      /* ==================== MESSAGES ==================== */

      .msg {
        max-width: 85%;
        padding: 12px 16px;
        margin-bottom: 12px;
        border-radius: 16px;
        line-height: 1.6;
        font-size: 14px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .msg.user {
        margin-left: auto;
        background: #1e3a5f;
        border-bottom-right-radius: 4px;
      }

      .msg.assistant {
        background: #1a1a1a;
        border-bottom-left-radius: 4px;
      }

      .msg.assistant.streaming::after {
        content: "▌";
        animation: blink 1s infinite;
        color: #8a6bff;
      }

      @keyframes blink { 50% { opacity: 0; } }

      .msg.search-result {
        background: #151520;
        border-left: 3px solid #8a6bff;
      }

      .msg code {
        background: #252525;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Fira Code', monospace;
        font-size: 12px;
      }

      .msg pre {
        background: #151515;
        padding: 12px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 10px 0;
      }

      .msg pre code { background: none; padding: 0; }

      /* ==================== INPUT AREA ==================== */

      .input-section {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        background: #111;
        border-top: 1px solid #252525;
        align-items: flex-end;
        flex-shrink: 0;
      }

      .input-mode {
        padding: 8px 12px;
        background: #1a1a1a;
        border-radius: 8px;
        font-size: 11px;
        color: #888;
        white-space: nowrap;
        align-self: center;
      }

      .input-mode.chat { color: #8a6bff; }
      .input-mode.code { color: #22c55e; }
      .input-mode.search { color: #f59e0b; }

      .ai-page #user-input {
        flex: 1;
        padding: 12px 16px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        color: #e0e0e0;
        font-size: 14px;
        resize: none;
        outline: none;
        min-height: 24px;
        max-height: 120px;
        font-family: inherit;
        line-height: 1.5;
      }

      .ai-page #user-input:focus { border-color: #8a6bff; }

      .ai-page #send-btn {
        padding: 12px 16px;
        background: #8a6bff;
        border: none;
        border-radius: 12px;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .ai-page #send-btn:hover:not(:disabled) { background: #7a5bef; }
      .ai-page #send-btn:disabled { background: #333; cursor: not-allowed; }

      /* ==================== CODE PANEL ==================== */

      .code-section {
        width: 45%;
        max-width: 700px;
        display: none;
        flex-direction: column;
        background: #0d0d0d;
        border-left: 1px solid #252525;
        min-height: 0;           /* FIX */
      }

      .code-section.visible { display: flex; }

      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: #151515;
        border-bottom: 1px solid #252525;
        font-size: 13px;
        color: #888;
        flex-shrink: 0;
      }

      .code-actions {
        display: flex;
        gap: 6px;
      }

      .code-actions button {
        padding: 4px 8px;
        background: transparent;
        border: 1px solid #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }

      .code-actions button:hover {
        background: #252525;
        color: #fff;
      }

      #apply-diff-btn {
        border-color: #22c55e;
        color: #22c55e;
      }

      #apply-diff-btn:hover {
        background: #22c55e;
        color: #fff;
      }

      #reject-diff-btn {
        border-color: #ef4444;
        color: #ef4444;
      }

      #reject-diff-btn:hover {
        background: #ef4444;
        color: #fff;
      }

      #code-display {
        flex: 1;
        margin: 0;
        padding: 16px;
        overflow: auto;
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        background: #0a0a0a;
        min-height: 0;           /* FIX */
      }

      #code-content { color: #abb2bf; }

      /* ==================== DIFF VIEW ==================== */

      .diff-view {
        display: none;
        max-height: 300px;
        overflow-y: auto;
        border-top: 1px solid #333;
        background: #0d0d0d;
      }

      .diff-view.visible { display: block; }

      .diff-block {
        border-bottom: 1px solid #252525;
      }

      .diff-block:last-child {
        border-bottom: none;
      }

      .diff-header {
        padding: 8px 12px;
        background: #1a1a1a;
        font-size: 12px;
        font-weight: 500;
        color: #888;
        border-bottom: 1px solid #252525;
      }

      .diff-remove {
        background: #1a0a0a;
        border-left: 3px solid #ef4444;
      }

      .diff-add {
        background: #0a1a0a;
        border-left: 3px solid #22c55e;
      }

      .diff-line {
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 12px;
        padding: 2px 12px;
        white-space: pre;
        overflow-x: auto;
      }

      .diff-remove .diff-line {
        color: #f87171;
      }

      .diff-add .diff-line {
        color: #4ade80;
      }

      .diff-marker {
        display: inline-block;
        width: 16px;
        font-weight: bold;
        user-select: none;
      }

      .diff-remove .diff-marker { color: #ef4444; }
      .diff-add .diff-marker { color: #22c55e; }

      /* ==================== VERIFICATION BAR ==================== */

      .verification-bar {
        padding: 10px 14px;
        background: #151515;
        border-top: 1px solid #252525;
        font-size: 12px;
        display: none;
        flex-shrink: 0;
      }

      .verification-bar.visible {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .verification-bar.searching { color: #888; }
      .verification-bar.success { color: #22c55e; }
      .verification-bar.has-changes { color: #f59e0b; }
      .verification-bar.error { color: #ef4444; }
    `;
  }

// Expose globally
window.AITabCSS = { getTabCSS };
console.log('✅ AITabCSS loaded');
})();