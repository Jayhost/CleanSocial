(function() {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMessage(content) {
    if (!content) return '';

    let formatted = escapeHtml(content);

    // Code blocks
    formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  function formatSearchResults(results, query) {
    if (!results || results.length === 0) {
      return `<div class="search-no-results">No results found for "${escapeHtml(query)}"</div>`;
    }

    let html = `<div class="search-results-header">🔍 Search results for: <strong>${escapeHtml(query)}</strong></div>`;
    html += '<div class="search-results-grid">';

    results.slice(0, 6).forEach((r, i) => {
      const domain = extractDomain(r.url);
      const hasImage = r.image && !r.image.includes('data:');

      html += `
        <div class="search-result-card">
          ${hasImage ? `
            <div class="search-result-image">
              <img src="${escapeHtml(r.image)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
          ` : ''}
          <div class="search-result-content">
            <div class="search-result-header">
              ${r.favicon ? `<img src="${escapeHtml(r.favicon)}" class="search-result-favicon" onerror="this.style.display='none'">` : ''}
              <span class="search-result-domain">${escapeHtml(domain)}</span>
            </div>
            <a href="${escapeHtml(r.url)}" target="_blank" class="search-result-title">${escapeHtml(r.title)}</a>
            ${r.snippet ? `<p class="search-result-snippet">${escapeHtml(r.snippet)}</p>` : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  function extractDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  function detectMode(input) {
    if (!input) return 'chat';

    const trimmed = input.trim().toLowerCase();

    // Search mode
    if (trimmed.startsWith('?') || trimmed.startsWith('/search ')) {
      return 'search';
    }

    // Code mode
    const codeKeywords = [
      'write', 'create', 'build', 'make', 'generate', 'code',
      'function', 'class', 'script', 'program', 'implement',
      'python', 'javascript', 'html', 'css', 'react', 'node'
    ];

    if (codeKeywords.some(kw => trimmed.includes(kw))) {
      return 'code';
    }

    return 'chat';
  }

  function looksLikeCodeRequest(input) {
    return detectMode(input) === 'code';
  }

  // Expose to global namespace
  window.AIUtils = {
    escapeHtml,
    formatMessage,
    formatSearchResults,
    extractDomain,
    detectMode,
    looksLikeCodeRequest
  };
})();