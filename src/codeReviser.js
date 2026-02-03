const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class CodeReviser {
  constructor(browserSearch) {
    this.browserSearch = browserSearch;
    this.cache = new Map();
    this.maxCacheSize = 50;
    this.maxContextTokens = 2000;
  }

  // ==================== CACHE ====================

  getCacheKey(url) {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  getCached(url) {
    const key = this.getCacheKey(url);
    return this.cache.has(key) ? this.cache.get(key) : null;
  }

  setCached(url, data) {
    const key = this.getCacheKey(url);
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, data);
  }

  // ==================== SEARCH ====================

  async searchForPatterns(query) {
    console.log(`🔍 Searching: "${query}"`);

    const results = await this.browserSearch.search(
      query + ' code example',
      { engine: 'duckduckgo', numResults: 8 }
    ).catch(() => []);

    const prioritySources = [
      'github.com', 'stackoverflow.com', 'geeksforgeeks.org',
      'realpython.com', 'programiz.com'
    ];

    return results
      .filter(r => r?.url)
      .sort((a, b) => {
        const aIdx = prioritySources.findIndex(s => a.url.includes(s));
        const bIdx = prioritySources.findIndex(s => b.url.includes(s));
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      })
      .slice(0, 3);
  }

  async fetchCodeExamples(urls) {
    console.log(`📄 Fetching ${urls.length} pages...`);

    const results = await Promise.all(
      urls.map(async (urlData) => {
        const cached = this.getCached(urlData.url);
        if (cached) return cached;

        try {
          const data = await this.browserSearch.fetchPageContent(urlData.url);
          if (data?.codeBlocks?.length > 0) {
            const blocks = data.codeBlocks
              .filter(cb => cb.code?.length > 100)
              .sort((a, b) => b.code.length - a.code.length)
              .slice(0, 1);
            this.setCached(urlData.url, blocks);
            return blocks;
          }
        } catch (err) {}
        return [];
      })
    );

    return results.flat().slice(0, 1);
  }

  // ==================== BUILD MESSAGES ====================

  buildMessages(originalCode, referenceCode) {
    const maxChars = this.maxContextTokens * 4;
    const available = maxChars - 200;

    const ref = referenceCode.substring(0, Math.floor(available * 0.35));
    const orig = originalCode.substring(0, Math.floor(available * 0.65));

    return [
      {
        role: 'system',
        content: 'You are a code reviewer. Fix bugs in the provided code using the reference as a guide. Output ONLY the corrected code with no explanations, no markdown, no code fences.'
      },
      {
        role: 'user',
        content: `Reference code:\n${ref}\n\nCode to fix:\n${orig}`
      }
    ];
  }

  // ==================== EXTRACT CODE ====================

  extractCode(response) {
    if (!response || typeof response !== 'string') return '';

    let text = response.trim();

    // Remove markdown code blocks if present
    const codeBlockMatch = text.match(/```[\w]*\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    // Remove common prefixes
    text = text
      .replace(/^(Here's the fixed code:|Fixed code:|Corrected code:)\s*/i, '')
      .trim();

    return text;
  }

  // ==================== DIFF ====================

  async computeDiff(original, fixed) {
    const tmpDir = os.tmpdir();
    const id = Date.now();
    const origFile = path.join(tmpDir, `orig_${id}.txt`);
    const fixedFile = path.join(tmpDir, `fixed_${id}.txt`);

    try {
      await fs.writeFile(origFile, original);
      await fs.writeFile(fixedFile, fixed);

      const diffOutput = await this.runCommand('diff', ['-u', origFile, fixedFile]);

      await fs.unlink(origFile).catch(() => {});
      await fs.unlink(fixedFile).catch(() => {});

      return diffOutput;
    } catch (err) {
      await fs.unlink(origFile).catch(() => {});
      await fs.unlink(fixedFile).catch(() => {});

      if (err.output) return err.output;
      console.error('Diff error:', err);
      return null;
    }
  }

  runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        if (code === 0 || (code === 1 && stdout)) {
          resolve(stdout);
        } else {
          reject({ code, stderr, output: stdout });
        }
      });

      proc.on('error', reject);
    });
  }

  parseDiff(diffOutput) {
    if (!diffOutput || typeof diffOutput !== 'string') return [];

    const lines = diffOutput.split('\n');
    const hunks = [];
    let currentHunk = null;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        if (currentHunk) hunks.push(currentHunk);

        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        currentHunk = {
          origStart: match ? parseInt(match[1]) : 0,
          removed: [],
          added: []
        };
      } else if (line.startsWith('-') && !line.startsWith('---') && currentHunk) {
        currentHunk.removed.push(line.substring(1));
      } else if (line.startsWith('+') && !line.startsWith('+++') && currentHunk) {
        currentHunk.added.push(line.substring(1));
      }
    }

    if (currentHunk) hunks.push(currentHunk);
    return hunks;
  }

  // ==================== MAIN ====================

  async revise(originalCode, searchQuery, llamaChat) {
    const startTime = Date.now();

    if (!originalCode || originalCode.length < 20) {
      return this.createResult(originalCode, false, 'No code to revise');
    }

    try {
      // Search
      const urls = await this.searchForPatterns(searchQuery);
      if (!urls.length) {
        return this.createResult(originalCode, false, 'No references found');
      }

      // Fetch
      const codeExamples = await this.fetchCodeExamples(urls);
      if (!codeExamples.length) {
        return this.createResult(originalCode, false, 'No code examples found');
      }

      const refCode = codeExamples[0].code;
      console.log(`📚 Reference: ${refCode.length} chars`);
      console.log(`📄 Original: ${originalCode.length} chars`);

      // Build messages for chat API
      const messages = this.buildMessages(originalCode, refCode);

      console.time('🤖 LLM');
      const response = await llamaChat(messages, {
        temperature: 0.1,
        max_tokens: 2048
      });
      console.timeEnd('🤖 LLM');

      // Extract response content
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response?.choices?.[0]?.message?.content) {
        // OpenAI-style response
        responseText = response.choices[0].message.content;
      } else if (response?.content) {
        responseText = response.content;
      } else if (response?.text) {
        responseText = response.text;
      }

      const fixedCode = this.extractCode(responseText);
      if (!fixedCode || fixedCode.length < 20) {
        return this.createResult(originalCode, false, 'No valid output');
      }

      // Compute diff
      const diff = await this.computeDiff(originalCode, fixedCode);
      const hunks = this.parseDiff(diff);

      if (hunks.length === 0) {
        return this.createResult(originalCode, false, 'No changes needed');
      }

      console.log(`🔧 Found ${hunks.length} change(s)`);

      const blocks = hunks.map(hunk => ({
        lineNum: hunk.origStart,
        search: hunk.removed.join('\n'),
        replace: hunk.added.join('\n')
      }));

      return {
        changed: true,
        code: fixedCode,
        original: originalCode,
        diff,
        blocks,
        applied: blocks,
        failed: [],
        elapsed: Date.now() - startTime,
        message: `Found ${hunks.length} change(s)`
      };

    } catch (err) {
      console.error('❌ Revision error:', err);
      return this.createResult(originalCode, false, `Error: ${err.message}`);
    }
  }

  createResult(code, changed, message) {
    return {
      changed,
      code,
      original: code,
      diff: '',
      blocks: [],
      applied: [],
      failed: [],
      elapsed: 0,
      message
    };
  }
}

module.exports = CodeReviser;