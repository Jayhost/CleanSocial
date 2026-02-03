(function() {
  'use strict';

  function getTabHTML() {
    return `
      <div class="terminal-page">
        <div class="terminal-header">
          <div class="terminal-logo">
            <i data-lucide="terminal" width="20" height="20"></i>
            <span>Terminal</span>
          </div>
          <div class="terminal-controls">
            <select id="terminal-shell-select" class="terminal-select">
              <option value="default">Default Shell</option>
              <option value="powershell">PowerShell</option>
              <option value="cmd">CMD</option>
              <option value="bash">Bash</option>
            </select>
            <button id="terminal-new-btn" class="terminal-btn" title="New Terminal">
              <i data-lucide="plus" width="16" height="16"></i>
            </button>
            <button id="terminal-clear-btn" class="terminal-btn" title="Clear">
              <i data-lucide="trash-2" width="16" height="16"></i>
            </button>
          </div>
        </div>

        <div class="terminal-tabs" id="terminal-tabs"></div>

        <div class="terminal-container" id="terminal-container"></div>
      </div>
    `;
  }

  window.TerminalTabHTML = { getTabHTML };
  console.log('✅ TerminalTabHTML loaded');
})();