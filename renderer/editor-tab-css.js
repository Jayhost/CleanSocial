(function() {
  'use strict';

  function getTabCSS() {
    return `
      .editor-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e1e;
        color: #cccccc;
        font-family: system-ui, -apple-system, sans-serif;
      }

      /* Header */
      .editor-header {
        display: flex;
        align-items: center;
        padding: 6px 12px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        gap: 12px;
      }

      .editor-logo {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #8a6bff;
        font-weight: 600;
        font-size: 13px;
        padding-right: 12px;
        border-right: 1px solid #3c3c3c;
      }

      .editor-tabs {
        display: flex;
        flex: 1;
        gap: 2px;
        overflow-x: auto;
      }

      .editor-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #2d2d2d;
        border: 1px solid transparent;
        border-bottom: none;
        border-radius: 4px 4px 0 0;
        color: #888;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
      }

      .editor-tab:hover {
        background: #333;
        color: #ccc;
      }

      .editor-tab.active {
        background: #1e1e1e;
        color: #fff;
        border-color: #3c3c3c;
      }

      .editor-tab.modified::after {
        content: "●";
        color: #8a6bff;
        margin-left: 4px;
      }

      .editor-tab .close-tab {
        opacity: 0;
        padding: 2px;
        border-radius: 3px;
        transition: opacity 0.2s;
      }

      .editor-tab:hover .close-tab {
        opacity: 1;
      }

      .editor-tab .close-tab:hover {
        background: #555;
      }

      .editor-controls {
        display: flex;
        gap: 4px;
      }

      .editor-btn {
        padding: 6px 10px;
        background: transparent;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #888;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }

      .editor-btn:hover {
        background: #333;
        color: #fff;
        border-color: #555;
      }

      .editor-btn.ai {
        border-color: #8a6bff;
        color: #8a6bff;
      }

      .editor-btn.ai:hover {
        background: #8a6bff;
        color: #fff;
      }

      /* Body */
      .editor-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      /* File Explorer */
      .file-explorer {
        width: 220px;
        background: #252526;
        border-right: 1px solid #3c3c3c;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }

      .file-explorer.collapsed {
        width: 0;
        overflow: hidden;
        border: none;
      }

      .explorer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: #888;
        border-bottom: 1px solid #3c3c3c;
      }

      .file-tree {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }

      .empty-explorer {
        padding: 20px;
        text-align: center;
        color: #666;
      }

      .open-folder-btn {
        margin-top: 12px;
        padding: 8px 16px;
        background: #8a6bff;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      }

      .open-folder-btn:hover {
        background: #7a5bef;
      }

      .file-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        cursor: pointer;
        font-size: 13px;
        color: #ccc;
      }

      .file-item:hover {
        background: #2a2d2e;
      }

      .file-item.folder > .file-icon {
        color: #dcb67a;
      }

      .file-item.file > .file-icon {
        color: #8a6bff;
      }

      /* Main Editor */
      .editor-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .editor-info-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 12px;
        background: #2d2d2d;
        border-bottom: 1px solid #3c3c3c;
        font-size: 11px;
        color: #888;
      }

      #language-select {
        padding: 2px 6px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 3px;
        color: #ccc;
        font-size: 11px;
      }

      #monaco-container {
        flex: 1;
        overflow: hidden;
      }

      /* AI Sidebar */
      .ai-sidebar {
        width: 300px;
        background: #252526;
        border-left: 1px solid #3c3c3c;
        display: none;
        flex-direction: column;
      }

      .ai-sidebar.visible {
        display: flex;
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid #3c3c3c;
        font-weight: 600;
        color: #8a6bff;
      }

      .ai-chat {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
      }

      .ai-input-area {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #3c3c3c;
      }

      .ai-input-area textarea {
        flex: 1;
        padding: 8px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        color: #ccc;
        resize: none;
        font-family: inherit;
        font-size: 12px;
      }

      .ai-input-area button {
        padding: 8px 12px;
        background: #8a6bff;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      }

      /* Status Bar */
      .editor-statusbar {
        display: flex;
        gap: 16px;
        padding: 4px 12px;
        background: #007acc;
        font-size: 11px;
        color: white;
      }

      .icon-btn {
        background: transparent;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
      }

      .icon-btn:hover {
        background: #3c3c3c;
        color: #fff;
      }
    `;
  }

  window.EditorTabCSS = { getTabCSS };
  console.log('✅ EditorTabCSS loaded');
})();