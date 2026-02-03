class AdBlocker {
    constructor() {
      this.enabled = true;
      this.blockedCount = 0;
      this.rules = new Set();
      this.domainRules = new Set();
      this.regexRules = [];
      
      this.defaultBlockList = [
        'doubleclick.net',
        'googlesyndication.com',
        'googleadservices.com',
        'google-analytics.com',
        'googletagmanager.com',
        'googletagservices.com',
        'adservice.google.com',
        'pagead2.googlesyndication.com',
        'adnxs.com',
        'adsrvr.org',
        'adform.net',
        'advertising.com',
        'ads-twitter.com',
        'ads.twitter.com',
        'analytics.twitter.com',
        'ads.facebook.com',
        'facebook.com/tr',
        'connect.facebook.net/en_US/fbevents.js',
        'pixel.facebook.com',
        'an.facebook.com',
        'scorecardresearch.com',
        'quantserve.com',
        'outbrain.com',
        'taboola.com',
        'criteo.com',
        'criteo.net',
        'amazon-adsystem.com',
        'moatads.com',
        'hotjar.com',
        'fullstory.com',
        'mouseflow.com',
        'luckyorange.com',
        'crazyegg.com',
        'clicktale.com',
        'optimizely.com',
        'mixpanel.com',
        'segment.com',
        'segment.io',
        'amplitude.com',
        'branch.io',
        'adjust.com',
        'appsflyer.com',
        'kochava.com',
        'singular.net',
        'popads.net',
        'popcash.net',
        'propellerads.com',
        'revcontent.com',
        'mgid.com',
        'zergnet.com',
        'newrelic.com',
        'nr-data.net',
        'sentry.io',
        'bugsnag.com',
        'rollbar.com',
        'loggly.com',
        'sumologic.com',
        'platform.twitter.com/widgets',
        'staticxx.facebook.com',
        'connect.facebook.net',
        'platform.linkedin.com',
        'snap.licdn.com',
        'adskeeper.co.uk',
        'adsterra.com',
        'bidvertiser.com',
        'infolinks.com',
        'media.net',
        'revenuecat.com',
        'intercomcdn.com',
        'intercom.io',
        'drift.com',
        'driftt.com',
        'tidiochat.com',
        'zendesk.com/embeddable',
        'zopim.com',
        'livechatinc.com',
        'olark.com',
        'crisp.chat',
        'pushcrew.com',
        'pushengage.com',
        'onesignal.com',
        'subscribers.com',
        'webpushr.com',
        'youtube.com/api/stats/ads',
        'youtube.com/pagead',
        'youtube.com/ptracking',
        'youtubei.googleapis.com/youtubei/v1/log_event',
        's.youtube.com/api/stats/watchtime',
        'instagram.com/api/v1/ads',
        'i.instagram.com/api/v1/ads',
        'analytics.tiktok.com',
        'log.tiktokv.com',
        'mon.tiktokv.com'
      ];
  
      this.defaultPatterns = [
        /\/ads\//i,
        /\/ad\//i,
        /\/advert/i,
        /\/advertisement/i,
        /\/banner[s]?\//i,
        /\/sponsor/i,
        /\/tracking\//i,
        /\/tracker/i,
        /\/pixel/i,
        /\/analytics/i,
        /\/beacon/i,
        /\.gif\?.*(?:ad|track|pixel)/i,
        /prebid/i,
        /\/pagead\//i,
        /\/adserver/i,
        /smartadserver/i,
        /adnxs\.com/i,
        /rubiconproject/i,
        /pubmatic\.com/i,
        /openx\.net/i,
        /casalemedia\.com/i,
        /advertising\.com/i,
        /adsymptotic/i,
        /adform/i,
        /bidswitch/i,
        /sharethrough/i
      ];
  
      this.loadRules();
    }
  
    loadRules() {
      this.defaultBlockList.forEach(domain => {
        this.domainRules.add(domain.toLowerCase());
      });
      this.regexRules = [...this.defaultPatterns];
      console.log(`AdBlocker loaded: ${this.domainRules.size} domains, ${this.regexRules.length} patterns`);
    }
  
    shouldBlock(url) {
      if (!this.enabled) return false;
  
      try {
        const urlLower = url.toLowerCase();
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
  
        for (const domain of this.domainRules) {
          if (hostname.includes(domain) || urlLower.includes(domain)) {
            this.blockedCount++;
            return true;
          }
        }
  
        for (const pattern of this.regexRules) {
          if (pattern.test(urlLower)) {
            this.blockedCount++;
            return true;
          }
        }
  
        if (urlLower.includes('ad.') || 
            urlLower.includes('.ad.') ||
            urlLower.includes('/ads/') ||
            urlLower.includes('/ad/') ||
            urlLower.includes('?ad=') ||
            urlLower.includes('&ad=') ||
            urlLower.includes('pagead') ||
            urlLower.includes('doubleclick') ||
            urlLower.includes('googlesyndication')) {
          this.blockedCount++;
          return true;
        }
      } catch (e) {
        // Invalid URL
      }
  
      return false;
    }
  
    getBlockedCount() {
      return this.blockedCount;
    }
  
    setEnabled(enabled) {
      this.enabled = enabled;
      console.log(`AdBlocker ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  module.exports = AdBlocker;