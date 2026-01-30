document.addEventListener('DOMContentLoaded', () => {
  // State
  let tabs = [];
  let activeTabId = -1;
  let tabCounter = 0;
  let typingTimeout = null;

  // Search engines
  const searchEngines = {
    startpage: 'https://www.startpage.com/do/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    google: 'https://www.google.com/search?q='
  };
  let currentSearchEngine = 'startpage';

  // DOM Elements
  const tabBar = document.getElementById('tab-bar');
  const viewContainer = document.getElementById('view-container');
  const urlBar = document.getElementById('url-bar');
  const settingsPanel = document.getElementById('settings-panel');
  const loading = document.getElementById('loading');
  const typingIndicator = document.getElementById('typing-indicator');
  const urlSecurity = document.getElementById('url-security');
  const blockedCountEl = document.getElementById('blocked-count');
  const totalBlockedEl = document.getElementById('total-blocked');
  const adblockIndicator = document.getElementById('adblock-indicator');

  // Clear existing elements
  document.querySelectorAll('.tab:not(.new-tab-btn)').forEach(t => t.remove());
  document.querySelectorAll('.browser-view').forEach(v => v.remove());

  // Load settings
  loadSettings();

  // Initialize first tab
  setTimeout(() => {
    createTab('https://x.com', 'Twitter/X');
  }, 300);

  // Update adblock counter periodically
  setInterval(updateAdblockCount, 1000);

  // ============== EVENT LISTENERS ==============

  // URL Bar typing
  urlBar.addEventListener('input', () => {
    if (window.soundFX) window.soundFX.playType();
    
    typingIndicator.classList.add('active');
    urlSecurity.classList.remove('visible');
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingIndicator.classList.remove('active');
    }, 500);
  });

  urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      typingIndicator.classList.remove('active');
      const url = urlBar.value.trim();
      if (url) {
        if (window.soundFX) window.soundFX.playNavigate();
        navigateTo(url);
      }
    }
  });

  urlBar.addEventListener('focus', () => {
    urlBar.select();
    if (window.soundFX) window.soundFX.playClick();
  });

  // Go button
  document.getElementById('url-go').addEventListener('click', () => {
    const url = urlBar.value.trim();
    if (url) {
      if (window.soundFX) window.soundFX.playNavigate();
      navigateTo(url);
    }
  });

  // Nav buttons
  document.getElementById('btn-back').addEventListener('click', () => {
    const wv = getActiveWebview();
    if (wv && wv.canGoBack()) {
      if (window.soundFX) window.soundFX.playClick();
      wv.goBack();
    } else if (window.soundFX) {
      window.soundFX.playError();
    }
  });

  document.getElementById('btn-forward').addEventListener('click', () => {
    const wv = getActiveWebview();
    if (wv && wv.canGoForward()) {
      if (window.soundFX) window.soundFX.playClick();
      wv.goForward();
    } else if (window.soundFX) {
      window.soundFX.playError();
    }
  });

  document.getElementById('btn-refresh').addEventListener('click', () => {
    const wv = getActiveWebview();
    if (wv) {
      if (window.soundFX) window.soundFX.playClick();
      wv.reload();
    }
  });

  document.getElementById('btn-home').addEventListener('click', () => {
    if (window.soundFX) window.soundFX.playNavigate();
    navigateTo('https://www.startpage.com');
  });

  // New tab
  document.getElementById('new-tab').addEventListener('click', () => {
    if (window.soundFX) window.soundFX.playClick();
    createTab('https://www.startpage.com', 'New Tab');
  });

  // Quick sites
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) {
        if (window.soundFX) window.soundFX.playNavigate();
        navigateTo(url);
      }
    });
  });

  // Settings
  document.getElementById('settings-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.soundFX) window.soundFX.playClick();
    settingsPanel.classList.add('open');
    updateAdblockCount();
  });

  document.getElementById('settings-close').addEventListener('click', () => {
    if (window.soundFX) window.soundFX.playClick();
    settingsPanel.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (settingsPanel.classList.contains('open') &&
        !settingsPanel.contains(e.target) && 
        !document.getElementById('settings-toggle').contains(e.target)) {
      settingsPanel.classList.remove('open');
    }
  });

  // AdBlock toggle
  document.getElementById('adblock-toggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await window.browserAPI.adblock.setEnabled(enabled);
    adblockIndicator.classList.toggle('disabled', !enabled);
    if (window.soundFX) window.soundFX.playClick();
  });

  // Save settings
  document.getElementById('save-settings').addEventListener('click', saveSettings);

  // ============== FUNCTIONS ==============

  async function updateAdblockCount() {
    try {
      const count = await window.browserAPI.adblock.getCount();
      blockedCountEl.textContent = count;
      if (totalBlockedEl) totalBlockedEl.textContent = count;
    } catch (e) {}
  }

  function createTab(url, title = 'New Tab') {
    const id = tabCounter++;
    
    const webview = document.createElement('webview');
    webview.id = `webview-${id}`;
    webview.className = 'browser-view';
    webview.setAttribute('partition', 'persist:main');
    webview.setAttribute('allowpopups', 'true');
    
    viewContainer.appendChild(webview);

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.tab = id.toString();
    tab.innerHTML = `
      <span class="tab-icon"><svg data-lucide="globe" width="14" height="14"></svg></span>
      <span class="tab-title">${title}</span>
      <span class="tab-close"><svg data-lucide="x" width="14" height="14"></svg></span>
    `;

    const newTabBtn = document.getElementById('new-tab');
    tabBar.insertBefore(tab, newTabBtn);

    // Re-initialize icons for new tab
    if (window.lucide) lucide.createIcons();

    tab.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) {
        e.stopPropagation();
        closeTab(id);
      } else {
        if (window.soundFX) window.soundFX.playTabSwitch();
        switchToTab(id);
      }
    });

    // Webview events
    webview.addEventListener('did-start-loading', () => {
      if (id === activeTabId) loading.classList.add('show');
      updateTabIcon(id, 'loader');
    });

    webview.addEventListener('did-stop-loading', () => {
      loading.classList.remove('show');
    });

    webview.addEventListener('dom-ready', () => {
      injectFilters(webview);
      updateTabIcon(id, getIconForUrl(webview.getURL()));
    });

    webview.addEventListener('did-finish-load', () => {
      loading.classList.remove('show');
    });

    webview.addEventListener('did-fail-load', (e) => {
      loading.classList.remove('show');
    });

    webview.addEventListener('did-navigate', (e) => {
      if (id === activeTabId) {
        urlBar.value = e.url;
        updateSecurityIndicator(e.url);
      }
      updateTabIcon(id, getIconForUrl(e.url));
      try {
        const hostname = new URL(e.url).hostname.replace('www.', '');
        updateTabTitle(id, hostname);
      } catch (err) {}
    });

    webview.addEventListener('page-title-updated', (e) => {
      updateTabTitle(id, e.title);
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (id === activeTabId && e.isMainFrame) {
        urlBar.value = e.url;
        updateSecurityIndicator(e.url);
      }
    });

    tabs.push({ id, url, title });
    switchToTab(id);

    setTimeout(() => {
      webview.src = url;
    }, 100);

    return id;
  }

  function getIconForUrl(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter';
      if (hostname.includes('instagram')) return 'instagram';
      if (hostname.includes('youtube')) return 'youtube';
      if (hostname.includes('reddit')) return 'message-circle';
      if (hostname.includes('facebook')) return 'facebook';
      if (hostname.includes('github')) return 'github';
      if (hostname.includes('twitch')) return 'twitch';
      if (hostname.includes('discord')) return 'message-square';
      if (hostname.includes('linkedin')) return 'linkedin';
      if (hostname.includes('startpage') || hostname.includes('duckduckgo') || hostname.includes('google')) return 'search';
      return 'globe';
    } catch {
      return 'globe';
    }
  }

  function updateTabIcon(id, iconName) {
    const tab = document.querySelector(`.tab[data-tab="${id}"]`);
    if (tab) {
      const iconContainer = tab.querySelector('.tab-icon');
      if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="${iconName}"></i>`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  function updateSecurityIndicator(url) {
    try {
      if (url.startsWith('https://')) {
        urlSecurity.classList.add('visible');
      } else {
        urlSecurity.classList.remove('visible');
      }
    } catch {}
  }

  function switchToTab(id) {
    activeTabId = id;

    document.querySelectorAll('.tab').forEach(tab => {
      const tabId = parseInt(tab.dataset.tab);
      tab.classList.toggle('active', tabId === id);
    });

    document.querySelectorAll('.browser-view').forEach(wv => {
      wv.classList.toggle('active', wv.id === `webview-${id}`);
    });

    const webview = getActiveWebview();
    if (webview) {
      setTimeout(() => {
        try {
          const url = webview.getURL();
          if (url && url !== 'about:blank') {
            urlBar.value = url;
            updateSecurityIndicator(url);
          }
        } catch {}
      }, 100);
    }
  }

  function closeTab(id) {
    if (tabs.length <= 1) {
      navigateTo('https://www.startpage.com');
      return;
    }

    if (window.soundFX) window.soundFX.playClick();

    const index = tabs.findIndex(t => t.id === id);
    if (index === -1) return;
    
    tabs.splice(index, 1);

    document.querySelector(`.tab[data-tab="${id}"]`)?.remove();
    document.getElementById(`webview-${id}`)?.remove();

    if (activeTabId === id) {
      const newIndex = Math.min(index, tabs.length - 1);
      switchToTab(tabs[newIndex].id);
    }
  }

  function updateTabTitle(id, title) {
    const tab = document.querySelector(`.tab[data-tab="${id}"]`);
    if (tab) {
      const titleEl = tab.querySelector('.tab-title');
      if (titleEl) {
        const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
        titleEl.textContent = shortTitle;
        titleEl.title = title;
      }
    }
  }

  function navigateTo(input) {
    let url = input.trim();
    if (!url) return;

    if (!url.match(/^https?:\/\//i)) {
      if (url.match(/^[\w-]+(\.[\w-]+)+/) && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = searchEngines[currentSearchEngine] + encodeURIComponent(url);
      }
    }

    const webview = getActiveWebview();
    if (webview) {
      urlBar.value = url;
      webview.src = url;
    } else {
      createTab(url, 'Loading...');
    }
  }

  function getActiveWebview() {
    return document.getElementById(`webview-${activeTabId}`);
  }

  function injectFilters(webview) {
    if (!webview) return;
    
    const settings = JSON.parse(localStorage.getItem('cleanSocialSettings') || '{}');
    const keywords = settings.blockedKeywords || [];
    
    const css = generateFilterCSS(settings);
    const js = generateFilterJS(settings, keywords);

    webview.insertCSS(css).catch(() => {});
    webview.executeJavaScript(js).catch(() => {});
  }

  function generateFilterCSS(settings) {
    let css = `
      [aria-label="Grok"], [data-testid="grok"], a[href*="/i/grok"],
      [data-testid="GrokDrawer"], button[aria-label*="Grok"], div[aria-label*="Grok"] { 
        display: none !important; 
      }
    `;

    if (settings['twitter.hideGrok'] !== false) {
      css += `[aria-label*="Grok" i], button[aria-label*="grok" i], a[href*="grok"] { display: none !important; }`;
    }
    if (settings['twitter.hidePremium'] !== false) {
      css += `[aria-label="Subscribe to Premium"], a[href*="/i/premium"], a[href*="/i/verified"], [data-testid="premium"], aside[aria-label*="Premium"] { display: none !important; }`;
    }
    if (settings['twitter.hideTrends']) {
      css += `[data-testid="trend"], [aria-label*="Trending"], [aria-label="Timeline: Trending now"] { display: none !important; }`;
    }
    if (settings['insta.hideReels']) {
      css += `a[href*="/reels"], [aria-label*="Reels"], svg[aria-label="Reels"] { display: none !important; }`;
    }
    if (settings['youtube.hideShorts']) {
      css += `[title="Shorts"], ytd-reel-shelf-renderer, a[href*="/shorts"], ytd-mini-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }`;
    }
    if (settings['youtube.hideComments']) {
      css += `#comments, ytd-comments { display: none !important; }`;
    }

    return css;
  }

  function generateFilterJS(settings, keywords) {
    return `
      (function() {
        if (window.__cleanSocialActive) return;
        window.__cleanSocialActive = true;

        const keywords = ${JSON.stringify(keywords)};
        
        const hideElement = (el) => {
          if (el) el.style.setProperty('display', 'none', 'important');
        };

        const checkContent = () => {
          // Twitter/X promoted content
          document.querySelectorAll('article:not([data-clean-checked])').forEach(el => {
            el.setAttribute('data-clean-checked', '1');
            const text = (el.innerText || '').toLowerCase();
            
            if (text.includes('promoted') || text.includes('sponsored') || 
                text.includes('ad ·') || text.includes('ad·')) {
              hideElement(el);
              return;
            }
            
            for (const kw of keywords) {
              if (kw && text.includes(kw.toLowerCase())) {
                hideElement(el);
                return;
              }
            }
          });

          // Instagram sponsored
          document.querySelectorAll('article:not([data-ig-checked])').forEach(el => {
            el.setAttribute('data-ig-checked', '1');
            const text = el.innerText || '';
            if (text.includes('Sponsored')) {
              hideElement(el);
            }
          });

          // YouTube ads in feed
          document.querySelectorAll('ytd-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer').forEach(el => {
            hideElement(el);
          });

          // YouTube video ads overlay
          document.querySelectorAll('.ytp-ad-module, .ytp-ad-overlay-container, .ytp-ad-text-overlay').forEach(el => {
            hideElement(el);
          });

          // Reddit promoted posts
          document.querySelectorAll('[data-promoted="true"], .promotedlink, [data-is-promo="true"]').forEach(el => {
            hideElement(el);
          });

          // Facebook sponsored
          document.querySelectorAll('[data-testid="fbfeed_story"]:not([data-fb-checked])').forEach(el => {
            el.setAttribute('data-fb-checked', '1');
            const text = el.innerText || '';
            if (text.includes('Sponsored') || text.includes('Suggested for you')) {
              hideElement(el);
            }
          });

          // TikTok promoted
          document.querySelectorAll('[data-e2e="recommend-list-item-container"]:not([data-tt-checked])').forEach(el => {
            el.setAttribute('data-tt-checked', '1');
            const text = el.innerText || '';
            if (text.includes('Sponsored') || text.includes('Promoted')) {
              hideElement(el);
            }
          });

          // LinkedIn ads
          document.querySelectorAll('.feed-shared-update-v2:not([data-li-checked])').forEach(el => {
            el.setAttribute('data-li-checked', '1');
            const text = el.innerText || '';
            if (text.includes('Promoted') || text.includes('Sponsored')) {
              hideElement(el);
            }
          });

          // Generic "Suggested" and "Recommended" sections
          document.querySelectorAll('[aria-label*="Suggested"], [aria-label*="Recommended"]').forEach(el => {
            if (!el.closest('article')) { // Don't hide if inside an article
              hideElement(el);
            }
          });
        };

        // Run immediately
        checkContent();
        
        // Watch for new content
        const observer = new MutationObserver(() => {
          requestAnimationFrame(checkContent);
        });
        
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        }

        // Also check on scroll (for infinite scroll feeds)
        let scrollTimeout;
        window.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(checkContent, 100);
        }, { passive: true });

        console.log('🧹 Clean Social filters active');
      })();
    `;
  }

  function saveSettings() {
    const settings = {};
    
    // Toggle switches
    document.querySelectorAll('[data-filter]').forEach(input => {
      settings[input.dataset.filter] = input.checked;
    });
    
    // Search engine
    const searchRadio = document.querySelector('input[name="search"]:checked');
    if (searchRadio) {
      settings.searchEngine = searchRadio.dataset.search;
      currentSearchEngine = searchRadio.dataset.search;
    }
    
    // Keywords
    const keywordsEl = document.getElementById('blocked-keywords');
    if (keywordsEl) {
      settings.blockedKeywords = keywordsEl.value
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }

    localStorage.setItem('cleanSocialSettings', JSON.stringify(settings));

    // Update sound settings
    if (window.soundFX) {
      window.soundFX.setEnabled(settings['sound.enabled'] !== false);
      window.soundFX.setNavigationEnabled(settings['sound.navigation'] !== false);
      window.soundFX.playSuccess();
    }

    // Re-inject filters into all webviews
    document.querySelectorAll('.browser-view').forEach(wv => {
      injectFilters(wv);
    });

    settingsPanel.classList.remove('open');
    
    // Visual feedback
    const btn = document.getElementById('save-settings');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check"></i> SAVED!';
    btn.style.background = 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)';
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      if (window.lucide) lucide.createIcons();
    }, 1500);
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('cleanSocialSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        
        // Load toggles
        Object.entries(settings).forEach(([key, value]) => {
          if (key === 'blockedKeywords') {
            const textarea = document.getElementById('blocked-keywords');
            if (textarea && Array.isArray(value)) {
              textarea.value = value.join('\n');
            }
          } else if (key === 'searchEngine') {
            currentSearchEngine = value;
            const radio = document.querySelector(`input[data-search="${value}"]`);
            if (radio) radio.checked = true;
          } else {
            const input = document.querySelector(`[data-filter="${key}"]`);
            if (input) input.checked = value;
          }
        });

        // Apply sound settings
        if (window.soundFX) {
          window.soundFX.setEnabled(settings['sound.enabled'] !== false);
          window.soundFX.setNavigationEnabled(settings['sound.navigation'] !== false);
        }
      }

      // Check initial adblock status
      window.browserAPI.adblock.isEnabled().then(enabled => {
        const toggle = document.getElementById('adblock-toggle');
        if (toggle) toggle.checked = enabled;
        adblockIndicator.classList.toggle('disabled', !enabled);
      });

    } catch (e) {
      console.log('Error loading settings:', e);
    }
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + T = New Tab
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      if (window.soundFX) window.soundFX.playClick();
      createTab('https://www.startpage.com', 'New Tab');
    }
    
    // Ctrl/Cmd + W = Close Tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      closeTab(activeTabId);
    }
    
    // Ctrl/Cmd + L = Focus URL bar
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      urlBar.focus();
      urlBar.select();
    }
    
    // Ctrl/Cmd + R = Refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      const wv = getActiveWebview();
      if (wv) wv.reload();
    }
    
    // F5 = Refresh
    if (e.key === 'F5') {
      e.preventDefault();
      const wv = getActiveWebview();
      if (wv) wv.reload();
    }
    
    // Escape = Close settings
    if (e.key === 'Escape') {
      settingsPanel.classList.remove('open');
    }
    
    // Ctrl/Cmd + Tab = Next tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      const nextIndex = (currentIndex + 1) % tabs.length;
      if (window.soundFX) window.soundFX.playTabSwitch();
      switchToTab(tabs[nextIndex].id);
    }
    
    // Ctrl/Cmd + 1-9 = Switch to tab
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (tabs[index]) {
        if (window.soundFX) window.soundFX.playTabSwitch();
        switchToTab(tabs[index].id);
      }
    }
  });

  console.log('⚡ Clean Social Browser initialized');
});