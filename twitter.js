const { ipcRenderer } = require('electron');

let blockedCount = 0;
let settings = {};

// Report blocked content to main window
const reportBlocked = (count = 1) => {
  blockedCount += count;
  ipcRenderer.sendToHost('content-blocked', count);
};

window.addEventListener('DOMContentLoaded', () => {
  
  // Inject aggressive CSS blocking
  const style = document.createElement('style');
  style.id = 'clean-social-styles';
  style.innerHTML = `
    /* Grok - Nuclear option */
    [aria-label="Grok"],
    [data-testid="GrokDrawer"],
    a[href*="/i/grok"],
    [aria-label*="grok" i],
    div:has(> a[href*="grok"]) {
      display: none !important;
    }

    /* Premium upsells */
    [aria-label="Subscribe to Premium"],
    a[href*="/i/premium"],
    a[href*="/i/verified"],
    [data-testid="verifiedFollowersModule"],
    div[aria-label*="Premium"],
    aside[aria-label*="Subscribe"] {
      display: none !important;
    }

    /* Analytics and monetization */
    a[href*="/analytics"],
    a[href*="/i/monetization"],
    [data-testid="analyticsButton"] {
      display: none !important;
    }

    /* Trends sidebar (optional - controlled by settings) */
    .hide-trends [data-testid="trend"],
    .hide-trends [aria-label="Timeline: Trending now"],
    .hide-trends section[aria-labelledby*="accessible-list"] {
      display: none !important;
    }

    /* Who to follow */
    .hide-who-to-follow [data-testid="UserCell"],
    .hide-who-to-follow [aria-label*="Who to follow"] {
      display: none !important;
    }

    /* Promoted tweets - marked with CSS class */
    article.promoted-tweet {
      display: none !important;
    }

    /* Clean up sidebar clutter */
    [aria-label="Footer"] {
      display: none !important;
    }

    /* Highlight that we're filtering */
    .clean-social-active::before {
      content: "🧹";
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 99999;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add('clean-social-active');

  // MutationObserver for dynamic content
  const observer = new MutationObserver((mutations) => {
    let blocked = 0;

    // Find and hide promoted tweets
    document.querySelectorAll('article:not([data-checked])').forEach(article => {
      article.setAttribute('data-checked', 'true');
      
      const text = article.innerText.toLowerCase();
      
      // Check for promoted content
      if (text.includes('promoted') || text.includes('ad')) {
        const socialContext = article.querySelector('[data-testid="socialContext"]');
        if (socialContext?.innerText.toLowerCase().includes('promoted')) {
          article.classList.add('promoted-tweet');
          blocked++;
        }
      }

      // Check for Grok mentions in tweets
      if (text.includes('grok') && settings.hideGrok !== false) {
        const grokButtons = article.querySelectorAll('[aria-label*="Grok"]');
        grokButtons.forEach(btn => btn.style.display = 'none');
      }
    });

    // Hide Grok buttons in tweet actions
    document.querySelectorAll('[data-testid="grok"]').forEach(el => {
      el.style.display = 'none';
      blocked++;
    });

    if (blocked > 0) reportBlocked(blocked);
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });

  // Listen for settings updates
  ipcRenderer.on('settings-updated', (event, newSettings) => {
    settings = newSettings;
    applySettings();
  });

  function applySettings() {
    document.body.classList.toggle('hide-trends', settings['twitter.hideTrends'] !== false);
    document.body.classList.toggle('hide-who-to-follow', settings['twitter.hideWhoToFollow']);
  }

  // Initial settings application
  applySettings();

  console.log('🧹 Clean Social: Twitter filters active');
});