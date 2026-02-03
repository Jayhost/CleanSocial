(function() {
  'use strict';

  class CodePanel {
    constructor(elements) {
      this.el = elements;
      this.currentCode = '';
      this.originalCode = '';
      this.pendingResult = null;
      this.bindEvents();
    }

    bindEvents() {
      this.el.copyBtn?.addEventListener('click', () => this.copyCode());
      this.el.saveBtn?.addEventListener('click', () => this.saveCode());
      this.el.closeCodeBtn?.addEventListener('click', () => this.hide());
      this.el.applyDiffBtn?.addEventListener('click', () => this.applyDiff());
      this.el.rejectDiffBtn?.addEventListener('click', () => this.rejectDiff());
    }

    show(code) {
      this.currentCode = code;
      this.originalCode = code;
      if (this.el.codeContent) this.el.codeContent.textContent = code;
      if (this.el.codeSection) this.el.codeSection.classList.add('visible');
      this.hideDiff();
    }

    hide() {
      if (this.el.codeSection) this.el.codeSection.classList.remove('visible');
      this.hideDiff();
    }

    copyCode() {
      navigator.clipboard.writeText(this.currentCode);
      const icon = this.el.copyBtn?.querySelector('i');
      if (icon && window.lucide) {
        icon.setAttribute('data-lucide', 'check');
        lucide.createIcons();
        setTimeout(() => {
          icon.setAttribute('data-lucide', 'copy');
          lucide.createIcons();
        }, 1500);
      }
    }

    async saveCode() {
      if (window.electronAPI?.saveEditorFile) {
        await window.electronAPI.saveEditorFile(this.currentCode);
      } else {
        const blob = new Blob([this.currentCode], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'code.txt';
        a.click();
      }
    }

    setStatus(type, text) {
      if (this.el.verificationBar) {
        this.el.verificationBar.className = `verification-bar visible ${type}`;
        this.el.verificationBar.textContent = text;
      }
    }

    showDiffResult(result) {
      if (!result.changed || !result.applied?.length) {
        this.setStatus('success', '✅ ' + (result.message || 'No changes needed'));
        this.hideDiff();
        return;
      }

      this.pendingResult = result;
      this.originalCode = result.original;
      this.renderDiff(result.applied);
      this.setStatus('has-changes', `📝 ${result.applied.length} fix(es) • ${result.elapsed}ms`);
      this.showButtons();
    }

    renderDiff(blocks) {
      const esc = window.AIUtils?.escapeHtml || (s => 
        (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      );

      let html = '';
      for (const b of blocks) {
        html += `
          <div class="diff-block">
            <div class="diff-header">📍 Line ${b.lineNum || '?'}</div>
            <div class="diff-remove">
              <div class="diff-line"><span class="diff-marker">-</span>${esc(b.search)}</div>
            </div>
            <div class="diff-add">
              <div class="diff-line"><span class="diff-marker">+</span>${esc(b.replace)}</div>
            </div>
          </div>
        `;
      }

      if (this.el.diffView) {
        this.el.diffView.innerHTML = html;
        this.el.diffView.classList.add('visible');
      }
    }

    hideDiff() {
      if (this.el.diffView) {
        this.el.diffView.classList.remove('visible');
        this.el.diffView.innerHTML = '';
      }
      this.hideButtons();
    }

    showButtons() {
      if (this.el.applyDiffBtn) this.el.applyDiffBtn.style.display = 'flex';
      if (this.el.rejectDiffBtn) this.el.rejectDiffBtn.style.display = 'flex';
    }

    hideButtons() {
      if (this.el.applyDiffBtn) this.el.applyDiffBtn.style.display = 'none';
      if (this.el.rejectDiffBtn) this.el.rejectDiffBtn.style.display = 'none';
      this.pendingResult = null;
    }

    applyDiff() {
      if (!this.pendingResult) return;
      this.currentCode = this.pendingResult.code;
      if (this.el.codeContent) this.el.codeContent.textContent = this.currentCode;
      this.setStatus('success', `✅ Applied ${this.pendingResult.applied.length} fix(es)`);
      this.hideDiff();
    }

    rejectDiff() {
      this.currentCode = this.originalCode;
      if (this.el.codeContent) this.el.codeContent.textContent = this.currentCode;
      this.setStatus('success', '✅ Changes rejected');
      this.hideDiff();
    }
  }

  window.CodePanel = CodePanel;
  console.log('✅ CodePanel loaded');
})();