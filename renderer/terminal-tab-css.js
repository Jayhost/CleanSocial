(function() {
  'use strict';

  function getTabCSS() {
    return `
      .terminal-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #0a0a0a;
        color: #e0e0e0;
        font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
      }

      .terminal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #1a1a1a;
        border-bottom: 1px solid #333;
        flex-shrink: 0;
      }

      .terminal-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #22c55e;
        font-weight: 600;
        font-size: 14px;
      }

      .terminal-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .terminal-select {
        padding: 6px 10px;
        background: #252525;
        border: 1px solid #333;
        border-radius: 6px;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        outline: none;
      }

      .terminal-select:hover,
      .terminal-select:focus {
        border-color: #22c55e;
      }

      .terminal-btn {
        padding: 6px 10px;
        background: transparent;
        border: 1px solid #333;
        border-radius: 6px;
        color: #888;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }

      .terminal-btn:hover {
        background: #252525;
        border-color: #22c55e;
        color: #22c55e;
      }

      .terminal-tabs {
        display: flex;
        gap: 2px;
        padding: 4px 8px;
        background: #151515;
        border-bottom: 1px solid #252525;
        overflow-x: auto;
        flex-shrink: 0;
        min-height: 32px;
      }

      .terminal-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #1a1a1a;
        border: 1px solid transparent;
        border-bottom: none;
        border-radius: 6px 6px 0 0;
        color: #888;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
      }

      .terminal-tab:hover {
        background: #252525;
        color: #ccc;
      }

      .terminal-tab.active {
        background: #0a0a0a;
        color: #22c55e;
        border-color: #333;
      }

      .terminal-tab .close-btn {
        opacity: 0;
        padding: 2px;
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .terminal-tab:hover .close-btn {
        opacity: 1;
      }

      .terminal-tab .close-btn:hover {
        background: #ef4444;
        color: #fff;
      }

      .terminal-container {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #0a0a0a;
      }

      .terminal-instance {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 8px;
        background: #0a0a0a;
      }

      .terminal-instance.active {
        display: block;
      }

      /* xterm.js container must have size */
      .terminal-instance .xterm {
        height: 100%;
        width: 100%;
      }

      .terminal-instance .xterm-viewport {
        overflow-y: auto !important;
      }

      .terminal-instance .xterm-screen {
        height: 100%;
      }

      /* Scrollbar styling */
      .terminal-instance .xterm-viewport::-webkit-scrollbar {
        width: 10px;
      }

      .terminal-instance .xterm-viewport::-webkit-scrollbar-track {
        background: #1a1a1a;
      }

      .terminal-instance .xterm-viewport::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 5px;
      }

      .terminal-instance .xterm-viewport::-webkit-scrollbar-thumb:hover {
        background: #444;
      }
    `;
  }

  window.TerminalTabCSS = { getTabCSS };
  console.log('✅ TerminalTabCSS loaded');
})();