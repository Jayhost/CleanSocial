(function() {
  'use strict';

  function getTabHTML() {
    return `
      <div class="editor-page">
        <div class="editor-header">
          <div class="editor-logo">
            <i data-lucide="code-2" width="20" height="20"></i>
            <span>Code Editor</span>
          </div>
          <div class="editor-tabs" id="editor-tabs">
            <!-- File tabs go here -->
          </div>
          <div class="editor-controls">
            <button id="editor-new-btn" class="editor-btn" title="New File">
              <i data-lucide="file-plus" width="16" height="16"></i>
            </button>
            <button id="editor-open-btn" class="editor-btn" title="Open File">
              <i data-lucide="folder-open" width="16" height="16"></i>
            </button>
            <button id="editor-save-btn" class="editor-btn" title="Save">
              <i data-lucide="save" width="16" height="16"></i>
            </button>
            <button id="editor-ai-btn" class="editor-btn ai" title="AI Assist">
              <i data-lucide="sparkles" width="16" height="16"></i>
            </button>
          </div>
        </div>

        <div class="editor-body">
          <div class="file-explorer" id="file-explorer">
            <div class="explorer-header">
              <span>Explorer</span>
              <button id="explorer-toggle" class="icon-btn">
                <i data-lucide="panel-left-close" width="14" height="14"></i>
              </button>
            </div>
            <div class="file-tree" id="file-tree">
              <div class="empty-explorer">
                <p>No folder open</p>
                <button id="open-folder-btn" class="open-folder-btn">Open Folder</button>
              </div>
            </div>
          </div>

          <div class="editor-main">
            <div class="editor-info-bar">
              <span id="current-file">Untitled</span>
              <span id="cursor-position">Ln 1, Col 1</span>
              <select id="language-select">
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="markdown">Markdown</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="plaintext">Plain Text</option>
              </select>
            </div>
            <div id="monaco-container"></div>
          </div>

          <div class="ai-sidebar" id="ai-sidebar">
            <div class="sidebar-header">
              <span>AI Assistant</span>
              <button id="ai-sidebar-close" class="icon-btn">
                <i data-lucide="x" width="14" height="14"></i>
              </button>
            </div>
            <div class="ai-chat" id="ai-editor-chat"></div>
            <div class="ai-input-area">
              <textarea id="ai-editor-input" placeholder="Ask AI about your code..."></textarea>
              <button id="ai-editor-send">
                <i data-lucide="send" width="16" height="16"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="editor-statusbar">
          <span id="file-status">Ready</span>
          <span id="file-encoding">UTF-8</span>
          <span id="file-type">JavaScript</span>
        </div>
      </div>
    `;
  }

  window.EditorTabHTML = { getTabHTML };
  console.log('✅ EditorTabHTML loaded');
})();