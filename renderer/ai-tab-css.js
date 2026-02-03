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

    /* ADD THESE NEW STYLES */
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
      }

      .chat-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 350px;
      }

      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
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