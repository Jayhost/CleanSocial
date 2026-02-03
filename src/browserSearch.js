const { BrowserWindow } = require('electron');

class BrowserSearchManager {
  constructor() {
    this.fetchId = 0;
  }

  // ==================== SEARCH ====================

  async search(query, options = {}) {
    const engine = options.engine || 'duckduckgo';
    const numResults = options.numResults || 10;
    const fetchImages = options.fetchImages !== false; // Default true

    console.log(`🔍 Searching ${engine}: "${query}"`);

    try {
      const results = await this.searchDuckDuckGo(query, numResults);
      console.log(`✅ Found ${results.length} results from ${engine}`);

      // Fetch preview images for results
      if (fetchImages && results.length > 0) {
        await this.fetchPreviewImages(results.slice(0, 6)); // Only first 6
      }

      return results;
    } catch (err) {
      console.error(`❌ Search failed:`, err.message);
      return [];
    }
  }

  async searchDuckDuckGo(query, limit = 10) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });

      const timeout = setTimeout(() => {
        win.destroy();
        reject(new Error('Search timeout'));
      }, 15000);

      win.webContents.on('did-finish-load', async () => {
        try {
          const results = await win.webContents.executeJavaScript(`
            (function() {
              const results = [];
              document.querySelectorAll('.result__a').forEach((link, i) => {
                if (i >= ${limit}) return;
                
                const snippetEl = link.closest('.result')?.querySelector('.result__snippet');
                let href = link.href;
                
                if (href.includes('duckduckgo.com/l/?')) {
                  const match = href.match(/uddg=([^&]+)/);
                  if (match) href = decodeURIComponent(match[1]);
                }
                
                results.push({
                  title: link.textContent?.trim() || '',
                  url: href,
                  snippet: snippetEl?.textContent?.trim() || '',
                  image: null,
                  favicon: null
                });
              });
              return results;
            })()
          `);

          clearTimeout(timeout);
          win.destroy();
          resolve(results);
        } catch (err) {
          clearTimeout(timeout);
          win.destroy();
          reject(err);
        }
      });

      win.webContents.on('did-fail-load', (e, code, desc) => {
        if (desc === 'ERR_BLOCKED_BY_CLIENT') return;
        clearTimeout(timeout);
        win.destroy();
        reject(new Error(desc));
      });

      win.loadURL(url);
    });
  }

  // ==================== FETCH PREVIEW IMAGES ====================

  async fetchPreviewImages(results) {
    console.log(`🖼️ Fetching preview images for ${results.length} results...`);

    const promises = results.map(async (result, index) => {
      try {
        const imageData = await this.fetchOpenGraphImage(result.url);
        if (imageData) {
          result.image = imageData.image;
          result.favicon = imageData.favicon;
          result.siteName = imageData.siteName;
        }
      } catch (err) {
        // Silently fail for individual images
        console.log(`⚠️ No image for ${result.url}: ${err.message}`);
      }
    });

    // Wait for all with a timeout
    await Promise.race([
      Promise.allSettled(promises),
      new Promise(resolve => setTimeout(resolve, 8000)) // 8s max for all images
    ]);

    const withImages = results.filter(r => r.image).length;
    console.log(`✅ Got ${withImages}/${results.length} preview images`);
  }

  async fetchOpenGraphImage(url) {
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });

      const timeout = setTimeout(() => {
        win.destroy();
        resolve(null);
      }, 5000); // 5s timeout per page

      win.webContents.on('did-finish-load', async () => {
        try {
          const data = await win.webContents.executeJavaScript(`
            (function() {
              // Get OG image
              const ogImage = document.querySelector('meta[property="og:image"]')?.content
                || document.querySelector('meta[name="og:image"]')?.content
                || document.querySelector('meta[property="twitter:image"]')?.content
                || document.querySelector('meta[name="twitter:image"]')?.content
                || document.querySelector('meta[property="twitter:image:src"]')?.content;
              
              // Get site name
              const siteName = document.querySelector('meta[property="og:site_name"]')?.content
                || document.querySelector('meta[name="application-name"]')?.content
                || '';
              
              // Get favicon
              let favicon = document.querySelector('link[rel="icon"]')?.href
                || document.querySelector('link[rel="shortcut icon"]')?.href
                || document.querySelector('link[rel="apple-touch-icon"]')?.href;
              
              // Fallback favicon
              if (!favicon) {
                try {
                  favicon = new URL('/favicon.ico', window.location.origin).href;
                } catch(e) {}
              }
              
              // Try to find a large image if no OG image
              let fallbackImage = null;
              if (!ogImage) {
                const images = Array.from(document.querySelectorAll('img'));
                for (const img of images) {
                  if (img.naturalWidth >= 200 && img.naturalHeight >= 150) {
                    fallbackImage = img.src;
                    break;
                  }
                }
              }
              
              return {
                image: ogImage || fallbackImage,
                favicon: favicon,
                siteName: siteName
              };
            })()
          `);

          clearTimeout(timeout);
          win.destroy();

          // Validate image URL
          if (data.image && !data.image.startsWith('data:')) {
            // Make relative URLs absolute
            try {
              data.image = new URL(data.image, url).href;
            } catch (e) {}
          }

          resolve(data.image ? data : null);
        } catch (err) {
          clearTimeout(timeout);
          win.destroy();
          resolve(null);
        }
      });

      win.webContents.on('did-fail-load', (e, code, desc, vUrl, isMain) => {
        if (desc === 'ERR_BLOCKED_BY_CLIENT' || !isMain) return;
        clearTimeout(timeout);
        win.destroy();
        resolve(null);
      });

      win.loadURL(url).catch(() => {
        clearTimeout(timeout);
        win.destroy();
        resolve(null);
      });
    });
  }

  // ==================== FETCH PAGE ====================

  async fetchPageContent(url) {
    console.log(`📄 Fetching: ${url}`);

    // GitHub raw content
    if (url.includes('github.com') && url.includes('/blob/')) {
      return this.fetchGitHubRaw(url);
    }

    return this.fetchGenericPage(url);
  }

  async fetchGitHubRaw(url) {
    const rawUrl = url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');

    try {
      const response = await fetch(rawUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const code = await response.text();
      const filename = url.split('/').pop() || 'code';

      console.log(`✅ Extracted 1 code block from ${url}`);

      return {
        url,
        title: filename,
        codeBlocks: [{ language: this.detectLanguage(filename), code: code.trim() }]
      };
    } catch (err) {
      console.error(`❌ GitHub fetch failed: ${err.message}`);
      return { url, title: '', codeBlocks: [] };
    }
  }

  detectLanguage(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map = {
      py: 'python', js: 'javascript', ts: 'typescript',
      jsx: 'javascript', tsx: 'typescript', rb: 'ruby',
      go: 'go', rs: 'rust', java: 'java', cpp: 'cpp',
      c: 'c', cs: 'csharp', php: 'php', swift: 'swift'
    };
    return map[ext] || 'text';
  }

  async fetchGenericPage(url) {
    const fetchId = ++this.fetchId;

    return new Promise((resolve) => {
      const win = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });

      const timeout = setTimeout(() => {
        win.destroy();
        resolve({ url, title: '', codeBlocks: [] });
      }, 20000);

      win.webContents.on('did-fail-load', (e, code, desc, vUrl, isMain) => {
        if (desc === 'ERR_BLOCKED_BY_CLIENT' || !isMain) return;
      });

      win.webContents.on('did-finish-load', async () => {
        try {
          const result = await win.webContents.executeJavaScript(`
            (function() {
              const blocks = [];
              const selectors = [
                'pre code', 'pre.code', '.highlight pre',
                '.codehilite pre', '.sourceCode pre', 'code.sourceCode'
              ];
              
              document.querySelectorAll(selectors.join(', ')).forEach(el => {
                const code = el.textContent?.trim();
                if (code && code.length > 50 && code.length < 15000) {
                  let lang = 'text';
                  const classes = (el.className || '') + ' ' + (el.parentElement?.className || '');
                  const match = classes.match(/language-(\\w+)|lang-(\\w+)/);
                  if (match) lang = match[1] || match[2];
                  
                  blocks.push({ language: lang, code });
                }
              });
              
              // Fallback to pre tags
              if (blocks.length === 0) {
                document.querySelectorAll('pre').forEach(el => {
                  const code = el.textContent?.trim();
                  if (code && code.length > 50 && code.length < 15000) {
                    if (/def |function |class |import |const |let /.test(code)) {
                      blocks.push({ language: 'text', code });
                    }
                  }
                });
              }
              
              // Dedupe
              const seen = new Set();
              return {
                title: document.title || '',
                codeBlocks: blocks.filter(b => {
                  const key = b.code.substring(0, 100);
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                }).slice(0, 5)
              };
            })()
          `);

          clearTimeout(timeout);
          win.destroy();
          console.log(`✅ Extracted ${result.codeBlocks.length} code blocks from ${url}`);
          resolve({ url, ...result });
        } catch (err) {
          clearTimeout(timeout);
          win.destroy();
          resolve({ url, title: '', codeBlocks: [] });
        }
      });

      win.loadURL(url).catch(() => {
        clearTimeout(timeout);
        win.destroy();
        resolve({ url, title: '', codeBlocks: [] });
      });
    });
  }

  destroy() {}
}

module.exports = BrowserSearchManager;