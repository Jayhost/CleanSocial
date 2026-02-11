// src/adBlocker.js
const { session } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { TWITCH_ADBLOCK_SCRIPT } = require('./twitchAdblock');

class AdBlocker {
  constructor() {
    this.enabled = true;
    this.blockedCount = 0;
    this.domainSet = new Set();
    this.regexRules = [];
    this.cosmeticRules = new Map(); // domain -> selectors
    this.whitelistDomains = new Set();
    this.initialized = false;
    this.cacheDir = path.join(__dirname, '..', 'cache');
    this.cacheFile = path.join(this.cacheDir, 'adblock-domains.json');
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

    // Block these resource types aggressively
    this.blockedResourceTypes = new Set([
      'script', 'image', 'stylesheet', 'xmlhttprequest',
      'sub_frame', 'media', 'font', 'ping', 'other'
    ]);

    // Filter list URLs - multiple sources for reliability
    this.filterListURLs = [
      // EasyList - most popular
      'https://easylist.to/easylist/easylist.txt',
      // EasyPrivacy
      'https://easylist.to/easylist/easyprivacy.txt',
      // Peter Lowe's blocklist
      'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext',
      // Steven Black unified hosts
      'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts',
      // AdGuard base
      'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt',
      // AdGuard tracking
      'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt',
      // Fanboy annoyances (cookie popups, social widgets)
      'https://easylist.to/easylist/fanboy-annoyance.txt',
      // URLHaus malware filter
      'https://urlhaus.abuse.ch/downloads/hostfile/',
    ];

    // Hardcoded domains that should ALWAYS be blocked
    this.hardcodedDomains = [
      // Google Ads
      'pagead2.googlesyndication.com',
      'googleads.g.doubleclick.net',
      'ad.doubleclick.net',
      'ads.google.com',
      'adservice.google.com',
      'adservice.google.co.uk',
      'adclick.g.doubleclick.net',
      'googleadservices.com',
      'www.googleadservices.com',
      'securepubads.g.doubleclick.net',
      'tpc.googlesyndication.com',
      'partner.googleadservices.com',
      
      // Facebook/Meta Ads
      'an.facebook.com',
      'pixel.facebook.com',
      'www.facebook.com/tr',
      'connect.facebook.net',
      
      // Amazon Ads
      'aax.amazon-adsystem.com',
      'z-na.amazon-adsystem.com',
      'fls-na.amazon-adsystem.com',
      'rcm-na.amazon-adsystem.com',
      
      // Twitter/X Ads
      'ads-api.twitter.com',
      'ads-twitter.com',
      'analytics.twitter.com',
      
      // Major ad networks
      'doubleclick.net',
      'ad.doubleclick.net',
      'adnxs.com',
      'adsrvr.org',
      'advertising.com',
      'outbrain.com',
      'taboola.com',
      'criteo.com',
      'criteo.net',
      'pubmatic.com',
      'rubiconproject.com',
      'openx.net',
      'appnexus.com',
      'moatads.com',
      'mediavine.com',
      'adthrive.com',
      'ad-delivery.net',
      'serving-sys.com',
      'smartadserver.com',
      'bidswitch.net',
      'casalemedia.com',
      'contextweb.com',
      'indexww.com',
      'lijit.com',
      'mathtag.com',
      'mookie1.com',
      'richaudience.com',
      'turn.com',
      'yieldmo.com',
      'zedo.com',
      
      // Tracking
      'google-analytics.com',
      'www.google-analytics.com',
      'ssl.google-analytics.com',
      'analytics.google.com',
      'hotjar.com',
      'script.hotjar.com',
      'static.hotjar.com',
      'fullstory.com',
      'rs.fullstory.com',
      'mouseflow.com',
      'clarity.ms',
      'luckyorange.com',
      'crazyegg.com',
      'newrelic.com',
      'nr-data.net',
      'mixpanel.com',
      'cdn.mxpnl.com',
      'amplitude.com',
      'heapanalytics.com',
      'segment.io',
      'segment.com',
      'cdn.segment.com',
      'sc-static.net',
      'sentry.io',
      'bugsnag.com',
      'quantserve.com',
      'scorecardresearch.com',
      'sb.scorecardresearch.com',
      'b.scorecardresearch.com',
      'comscore.com',
      'bluekai.com',
      'exelator.com',
      'demdex.net',
      'krxd.net',
      'adsymptotic.com',
      'omtrdc.net',
      'everesttech.net',
      
      // Popups / Overlays
      'popads.net',
      'popcash.net',
      'propellerads.com',
      'juicyads.com',
      'exoclick.com',
      'trafficjunky.com',
      'adcash.com',
      'clickadu.com',
      
      // Video ads
      'imasdk.googleapis.com',
      'youtube.cleverads.vn',
      'static.ads-twitter.com',
      
      // Cookie consent annoyances
      'cdn.cookielaw.org',
      'consent.cookiebot.com',
      'consentframework.com',
      
      // Misc trackers
      'bat.bing.com',
      'pixel.wp.com',
      'stats.wp.com',
      'beacon.krxd.net',
      'widgets.outbrain.com',
      'cdn.taboola.com',
      'trc.taboola.com',
      'match.adsrvr.org',
      'cm.g.doubleclick.net',
    ];

    // URL path patterns to block
    // In the constructor, replace pathPatterns with these more precise ones:
    this.pathPatterns = [
      /\/ads\/(?!assets)/i,           // /ads/ but not /ads/assets
      /\/ad\/(?!min|vanced)/i,        // /ad/ but not /admin /advanced
      /\/advert[is]/i,                // /adverti... /adverts
      /\/banner[s]?\/\d/i,            // /banners/123
      /\/sponsor[ed]/i,               // /sponsored
      /\/tracking[./?]/i,             // /tracking. /tracking/ /tracking?
      /\/tracker[./?]/i,
      /\/pixel[./?]/i,
      /\/beacon[./?]/i,
      /\/analytics\.js/i,
      /\/ga\.js$/i,
      /\/gtag\/js/i,
      /\/gtm\.js/i,
      /\/fbevents\.js/i,
      /\/pagead\//i,
      /\/adsbygoogle\.js/i,
      /\/show_ads/i,
      /\/doubleclick\//i,
      /\/prebid[.-]/i,
      /\/adsense\//i,
      /\/adserver\//i,
      /\/admanager\//i,
      /\/ad_click/i,
      /\/ad_impression/i,
      /\/popunder[./?]/i,
      /\/popup_handler/i,
      /\/piwik\.js/i,
      /\/matomo\.js/i,
      /collect\?.*tid=UA-/i,
    ];

    // File extension patterns (ad-related resources)
    this.blockedExtensions = new Set([
      '.gif', '.swf'  // Often used for tracking pixels
    ]);
  }

  async initialize() {
    if (this.initialized) return;

    console.log('🛡️ AdBlocker: Initializing...');

    // Load hardcoded domains first (instant protection)
    this.hardcodedDomains.forEach(d => this.domainSet.add(d.toLowerCase()));
    console.log(`🛡️ AdBlocker: ${this.hardcodedDomains.length} hardcoded domains loaded`);

    // Try loading from cache
    const cacheLoaded = this._loadCache();
    
    // Fetch fresh lists in background
    this._fetchFilterLists().catch(err => {
      console.error('🛡️ AdBlocker: Background fetch failed:', err.message);
    });

    if (!cacheLoaded) {
      // If no cache, do a blocking fetch of at least one list
      try {
        await this._fetchSingleList(this.filterListURLs[2]); // Peter Lowe's is small & fast
        console.log('🛡️ AdBlocker: Quick-loaded initial blocklist');
      } catch (e) {
        console.warn('🛡️ AdBlocker: Could not fetch initial list, using hardcoded only');
      }
    }

    this.initialized = true;
    console.log(`🛡️ AdBlocker: Ready with ${this.domainSet.size} blocked domains, ${this.regexRules.length} regex rules`);
  }

  // ==================== FILTER LIST MANAGEMENT ====================

  _loadCache() {
    try {
      if (!fs.existsSync(this.cacheFile)) return false;
      
      const stat = fs.statSync(this.cacheFile);
      const age = Date.now() - stat.mtimeMs;
      
      if (age > this.cacheTTL) {
        console.log('🛡️ AdBlocker: Cache expired');
        return false;
      }

      const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      
      if (data.domains && Array.isArray(data.domains)) {
        data.domains.forEach(d => this.domainSet.add(d));
        console.log(`🛡️ AdBlocker: Loaded ${data.domains.length} domains from cache`);
      }
      
      if (data.regexRules && Array.isArray(data.regexRules)) {
        data.regexRules.forEach(r => {
          try {
            this.regexRules.push(new RegExp(r, 'i'));
          } catch {}
        });
      }

      return true;
    } catch (e) {
      console.warn('🛡️ AdBlocker: Cache load failed:', e.message);
      return false;
    }
  }

  _saveCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      const data = {
        timestamp: Date.now(),
        domains: Array.from(this.domainSet),
        regexRules: this.regexRules.map(r => r.source)
      };

      fs.writeFileSync(this.cacheFile, JSON.stringify(data), 'utf-8');
      console.log(`🛡️ AdBlocker: Cache saved (${this.domainSet.size} domains)`);
    } catch (e) {
      console.warn('🛡️ AdBlocker: Cache save failed:', e.message);
    }
  }

  async _fetchFilterLists() {
    console.log('🛡️ AdBlocker: Fetching filter lists...');
    
    const results = await Promise.allSettled(
      this.filterListURLs.map(url => this._fetchSingleList(url))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`🛡️ AdBlocker: Fetched ${succeeded}/${this.filterListURLs.length} lists (${failed} failed)`);
    console.log(`🛡️ AdBlocker: Total domains: ${this.domainSet.size}`);

    this._saveCache();
  }

  _fetchSingleList(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const timeout = 15000;

      const req = client.get(url, { timeout }, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this._fetchSingleList(res.headers.location).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }

        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const count = this._parseFilterList(data, url);
            resolve(count);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout fetching ${url}`));
      });

      req.on('error', reject);
    });
  }

  _parseFilterList(text, sourceUrl = '') {
    const lines = text.split('\n');
    let added = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('!') || line.startsWith('#') || line.startsWith('[')) {
        continue;
      }

      // HOSTS file format: "0.0.0.0 domain.com" or "127.0.0.1 domain.com"
      const hostsMatch = line.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(\S+)/);
      if (hostsMatch) {
        const domain = hostsMatch[1].toLowerCase();
        if (domain && domain !== 'localhost' && domain !== 'local' &&
            domain.includes('.') && !domain.startsWith('#')) {
          this.domainSet.add(domain);
          added++;
        }
        continue;
      }

      // AdBlock Plus / uBlock Origin format
      if (line.startsWith('||') && line.includes('^')) {
        // Domain block rule: ||example.com^
        const domainMatch = line.match(/^\|\|([a-z0-9._-]+)\^/i);
        if (domainMatch) {
          const domain = domainMatch[1].toLowerCase();
          if (domain.includes('.')) {
            this.domainSet.add(domain);
            added++;
          }
        }
        continue;
      }

      // Simple domain-only lines (some lists)
      if (/^[a-z0-9][a-z0-9._-]*\.[a-z]{2,}$/i.test(line)) {
        this.domainSet.add(line.toLowerCase());
        added++;
        continue;
      }

      // Cosmetic filter rules (element hiding)
      // Format: domain.com##.ad-class or ##.generic-ad
      const cosmeticMatch = line.match(/^([^#]*?)##(.+)$/);
      if (cosmeticMatch) {
        const domains = cosmeticMatch[1];
        const selector = cosmeticMatch[2];
        
        if (!domains) {
          // Generic cosmetic rule
          if (!this.cosmeticRules.has('*')) {
            this.cosmeticRules.set('*', new Set());
          }
          this.cosmeticRules.get('*').add(selector);
        } else {
          // Domain-specific cosmetic rule
          domains.split(',').forEach(d => {
            const cleanDomain = d.trim().toLowerCase();
            if (cleanDomain && !cleanDomain.startsWith('~')) {
              if (!this.cosmeticRules.has(cleanDomain)) {
                this.cosmeticRules.set(cleanDomain, new Set());
              }
              this.cosmeticRules.get(cleanDomain).add(selector);
            }
          });
        }
      }
    }

    return added;
  }

  // ==================== BLOCKING LOGIC ====================

  shouldBlock(url) {
    if (!this.enabled || !url) return false;

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const fullUrl = parsed.href.toLowerCase();

      // Never block essential resources
      if (this._isWhitelisted(hostname, fullUrl)) return false;

      // --- ADD THIS: Extra safety - log what we're blocking for debugging ---
      const blockAndLog = (reason) => {
        this.blockedCount++;
        // Uncomment next line to debug what's being blocked:
        // console.log(`🛡️ BLOCKED [${reason}]: ${hostname} — ${url.substring(0, 100)}`);
        return true;
      };

      // 1. Direct domain match
      if (this.domainSet.has(hostname)) {
        return blockAndLog('domain');
      }

      // 2. Subdomain matching
      const parts = hostname.split('.');
      for (let i = 1; i < parts.length - 1; i++) {
        const parent = parts.slice(i).join('.');
        if (this.domainSet.has(parent)) {
          return blockAndLog('subdomain:' + parent);
        }
      }

      // 3. URL path pattern matching
      const pathAndQuery = parsed.pathname + parsed.search;
      for (const pattern of this.pathPatterns) {
        if (pattern.test(pathAndQuery)) {
          return blockAndLog('path:' + pattern.source);
        }
      }

      // 4. Regex rules
      for (const regex of this.regexRules) {
        if (regex.test(fullUrl)) {
          return blockAndLog('regex');
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  _isWhitelisted(hostname, fullUrl) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    const majorSites = [
      'x.com',
      'twitter.com',
      'facebook.com',
      'instagram.com',
      'reddit.com',
      'linkedin.com',
      'tiktok.com',
      'pinterest.com',
      'tumblr.com',
      'discord.com',
      'twitch.tv',
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'netflix.com',
      'disneyplus.com',
      'google.com',
      'bing.com',
      'duckduckgo.com',
      'github.com',
      'gitlab.com',
      'stackoverflow.com',
      'wikipedia.org',
      'medium.com',
      'notion.so',
      'amazon.com',
      'ebay.com',
      'etsy.com',
      'walmart.com',
      'gmail.com',
      'outlook.com',
      'outlook.live.com',
      'proton.me',
      'protonmail.com',
      'bbc.com',
      'cnn.com',
      'reuters.com',
      'nytimes.com',
      'theguardian.com',
      'npmjs.com',
      'codepen.io',
      'jsfiddle.net',
      'replit.com',
      'aws.amazon.com',
      'vercel.com',
      'netlify.com',
      'heroku.com',
    ];

    for (const site of majorSites) {
      if (hostname === site || hostname.endsWith('.' + site)) return true;
    }

    const essentialDomains = [
      // General CDNs
      'cdn.jsdelivr.net',
      'cdnjs.cloudflare.com',
      'unpkg.com',
      'cloudflare.com',
      'fastly.net',
      'akamaihd.net',
      'akamaized.net',
      'cloudfront.net',
      'azureedge.net',
      'stackpath.bootstrapcdn.com',
      'maxcdn.bootstrapcdn.com',
      
      // Google / YouTube ecosystem
      'googleapis.com',
      'gstatic.com',
      'ggpht.com',
      'googlevideo.com',
      'ytimg.com',
      'youtube-nocookie.com',
      'googleusercontent.com',
      'google.com',
      'goog.com',
      'googlesyndication.com',  // needed for some YouTube player components
      'youtube-ui.l.google.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'ajax.googleapis.com',
      'lh3.googleusercontent.com',
      'play.google.com',
      'accounts.google.com',
      'jnn-pa.googleapis.com',
      'wide-youtube.l.google.com',
      
      // Twitter/X CDNs
      'twimg.com',
      'abs.twimg.com',
      'pbs.twimg.com',
      'video.twimg.com',
      'ton.twimg.com',
      'api.twitter.com',
      'api.x.com',
      
      // Facebook/Meta CDNs
      'fbcdn.net',
      'cdninstagram.com',
      'fbsbx.com',
      
      // Reddit CDNs
      'redditmedia.com',
      'redditstatic.com',
      'redd.it',
      
      // Image hosting
      'imgur.com',
      'i.imgur.com',
      'giphy.com',
      'pinimg.com',
      
      // Font providers
      'use.fontawesome.com',
      'kit.fontawesome.com',
      'use.typekit.net',
      
      // Auth providers
      'login.microsoftonline.com',
      'appleid.apple.com',
      'auth0.com',
      'okta.com',
      
      // Captcha
      'challenges.cloudflare.com',
      'hcaptcha.com',
      'www.recaptcha.net',
      
      // Payment
      'js.stripe.com',
      'checkout.stripe.com',
      'www.paypal.com',
      'paypalobjects.com',
      
      // Microsoft
      'microsoft.com',
      'microsoftonline.com',
      'msftauth.net',
      'live.com',
      'office.com',
      'office365.com',
    ];

    for (const domain of essentialDomains) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return true;
    }

    if (this.whitelistDomains.has(hostname)) return true;

    return false;
  }

  _hasTrackingParams(parsed) {
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid',
      'mc_cid', 'mc_eid', 'yclid', 'twclid',
      '_ga', '_gl', '_hsenc', '_hsmi',
      'vero_id', 'mkt_tok'
    ];

    for (const param of trackingParams) {
      if (parsed.searchParams.has(param)) return true;
    }
    return false;
  }

  // ==================== COSMETIC FILTERING ====================

  getCosmeticCSS(hostname) {
    if (!this.enabled) return '';

    const selectors = new Set();

    // Generic rules
    const generic = this.cosmeticRules.get('*');
    if (generic) {
      generic.forEach(s => selectors.add(s));
    }

    // Domain-specific rules
    if (hostname) {
      const parts = hostname.split('.');
      for (let i = 0; i < parts.length - 1; i++) {
        const domain = parts.slice(i).join('.');
        const rules = this.cosmeticRules.get(domain);
        if (rules) {
          rules.forEach(s => selectors.add(s));
        }
      }
    }

    // Always hide common ad elements
    const defaultSelectors = [
      '[id*="google_ads"]',
      '[id*="GoogleAds"]',
      '[class*="google-ad"]',
      '[id*="ad-slot"]',
      '[id*="ad_slot"]',
      '[class*="ad-slot"]',
      '[class*="ad-banner"]',
      '[class*="ad-container"]',
      '[class*="ad-wrapper"]',
      '[class*="adsbygoogle"]',
      'ins.adsbygoogle',
      '[id*="taboola"]',
      '[class*="taboola"]',
      '[id*="outbrain"]',
      '[class*="outbrain"]',
      '[data-ad]',
      '[data-ad-slot]',
      '[data-ad-client]',
      '[data-google-query-id]',
      '[aria-label="advertisement"]',
      '[aria-label="Advertisement"]',
      '[aria-label="Ads"]',
      'div[id^="div-gpt-ad"]',
      'div[data-dfp-ad]',
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]',
      'iframe[id*="google_ads"]',
      'amp-ad',
      'amp-auto-ads',
      '.sponsored-content',
      '.promoted-content',
      '[class*="sponsor"]',
      // Cookie popups
      '#cookie-banner',
      '#cookie-consent',
      '#cookie-notice',
      '[class*="cookie-banner"]',
      '[class*="cookie-consent"]',
      '[class*="cookie-notice"]',
      '[id*="consent-banner"]',
      '[class*="consent-banner"]',
      '#gdpr-banner',
      '[class*="gdpr"]',
      // Newsletter popups
      '[class*="newsletter-popup"]',
      '[class*="subscribe-popup"]',
      '[class*="email-popup"]',
      // Social share floating bars
      '[class*="share-bar"]',
      '[class*="social-share-float"]',
    ];

    defaultSelectors.forEach(s => selectors.add(s));

    if (selectors.size === 0) return '';

    // Build CSS that hides all matched elements
    const selectorStr = Array.from(selectors)
      .filter(s => {
        // Validate selector safety
        try {
          if (s.length > 200) return false;
          if (s.includes('\\') && !s.match(/\\[.#:[\]]/)) return false;
          return true;
        } catch {
          return false;
        }
      })
      .join(',\n');

    return `${selectorStr} { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }`;
  }

  // ==================== YOUTUBE AD BLOCKING ====================

  getYouTubeScript() {
    return `
    (function() {
      'use strict';
      
      // Skip ads automatically
      const skipAd = () => {
        // Click skip button
        const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, [class*="skip-button"]');
        if (skipBtn) {
          skipBtn.click();
          return true;
        }

        // Fast-forward video ads
        const video = document.querySelector('video');
        const adOverlay = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
        if (video && adOverlay) {
          video.currentTime = video.duration || 999;
          video.playbackRate = 16;
          return true;
        }

        // Remove ad overlays
        const overlays = document.querySelectorAll(
          '.ytp-ad-overlay-container, .ytp-ad-text-overlay, ' +
          '.video-ads, .ytp-ad-module, #player-ads, ' +
          '#masthead-ad, #panels .ytd-ads-engagement-panel-content-renderer, ' +
          'ytd-ad-slot-renderer, ytd-banner-promo-renderer, ' +
          'ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer, ' +
          'ytd-display-ad-renderer, ytd-statement-banner-renderer, ' +
          'ytd-in-feed-ad-layout-renderer, ytd-action-companion-ad-renderer, ' +
          '.ytd-merch-shelf-renderer, ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]'
        );
        overlays.forEach(el => el.remove());

        return false;
      };

      // Run frequently
      setInterval(skipAd, 500);

      // Also observe DOM changes
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length) {
            skipAd();
          }
        }
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });

      // Override ad-related fetch requests
      const origFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0]?.url || args[0] || '';
        if (typeof url === 'string' && 
            (url.includes('/pagead/') || 
             url.includes('/ptracking') || 
             url.includes('doubleclick.net') ||
             url.includes('/api/stats/ads') ||
             url.includes('googlevideo.com/initplayback'))) {
          return Promise.resolve(new Response('', { status: 200 }));
        }
        return origFetch.apply(this, args);
      };

      // Override XMLHttpRequest for ads
      const origXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string' &&
            (url.includes('/pagead/') ||
             url.includes('doubleclick.net') ||
             url.includes('/api/stats/ads'))) {
          url = 'about:blank';
        }
        return origXHROpen.call(this, method, url, ...rest);
      };

      console.log('🛡️ YouTube ad blocker active');
    })();
    `;
  }

  // ==================== INTEGRATION WITH ELECTRON ====================

  setupSession(ses) {
    if (!ses) ses = session.defaultSession;

    // Network-level blocking
    ses.webRequest.onBeforeRequest((details, callback) => {
      if (this.shouldBlock(details.url)) {
        callback({ cancel: true });
        return;
      }
      callback({ cancel: false });
    });

    // Strip tracking headers
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };
      
      // Remove tracking headers
      delete headers['X-Client-Data'];
      
      // Set generic user agent
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      callback({ requestHeaders: headers });
    });

    // Remove security headers that block webview embedding + strip tracking
    ses.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      
      const headersToRemove = [
        'x-frame-options', 'X-Frame-Options',
        'content-security-policy', 'Content-Security-Policy',
        'cross-origin-opener-policy', 'Cross-Origin-Opener-Policy',
        'cross-origin-embedder-policy', 'Cross-Origin-Embedder-Policy',
        'cross-origin-resource-policy', 'Cross-Origin-Resource-Policy'
      ];
      headersToRemove.forEach(header => delete headers[header]);

      callback({ responseHeaders: headers });
    });

    console.log('🛡️ AdBlocker: Session handlers installed');
  }

  // Inject cosmetic filtering into a webview/webContents
  injectCosmetic(webContents, hostname) {
    if (!this.enabled || !webContents) return;

    const css = this.getCosmeticCSS(hostname);
    if (css) {
      webContents.insertCSS(css).catch(() => {});
    }

    // Inject YouTube-specific blocking
    if (hostname && (hostname.includes('youtube.com') || hostname.includes('youtu.be'))) {
      webContents.executeJavaScript(this.getYouTubeScript()).catch(() => {});
    }
    if (hostname && (hostname.includes('twitch.tv'))) {
      webContents.executeJavaScript(TWITCH_ADBLOCK_SCRIPT).catch(() => {});
      console.log('🎮 Twitch ad blocker injected for', hostname);
    }

    // Generic page-level ad cleanup
    webContents.executeJavaScript(`
      (function() {
        // Remove elements with ad-related attributes
        const adSelectors = [
          'iframe[src*="ad"]',
          'iframe[src*="doubleclick"]',
          'iframe[src*="googlesyndication"]',
          'div[id*="google_ads"]',
          'ins.adsbygoogle',
          '[data-ad-slot]',
          '[data-ad-client]'
        ];
        
        adSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            el.style.display = 'none';
            el.remove();
          });
        });

        // Block pop-unders by preventing window.open abuse
        const origOpen = window.open;
        let openCount = 0;
        window.open = function(...args) {
          openCount++;
          if (openCount > 3) return null; // Block excessive popups
          return origOpen.apply(this, args);
        };
      })();
    `).catch(() => {});
  }

  // ==================== PUBLIC API ====================

  setEnabled(enabled) {
    this.enabled = enabled;
    console.log('🛡️ AdBlocker:', enabled ? 'Enabled' : 'Disabled');
  }

  getBlockedCount() {
    return this.blockedCount;
  }

  resetCount() {
    this.blockedCount = 0;
  }

  addWhitelist(domain) {
    this.whitelistDomains.add(domain.toLowerCase());
  }

  removeWhitelist(domain) {
    this.whitelistDomains.delete(domain.toLowerCase());
  }

  getStats() {
    return {
      enabled: this.enabled,
      blockedCount: this.blockedCount,
      totalDomains: this.domainSet.size,
      regexRules: this.regexRules.length,
      cosmeticRules: this.cosmeticRules.size,
      whitelisted: this.whitelistDomains.size
    };
  }
}

module.exports = AdBlocker;