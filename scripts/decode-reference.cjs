// Development helper; the instrument itself has no dependency on Playwright.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  if (!process.argv[2]) throw new Error('Usage: node scripts/decode-reference.cjs <video-path>');
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(async encoded => {
      const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      const context = new OfflineAudioContext(1, 1, 22050);
      const buffer = await context.decodeAudioData(bytes.buffer);
      const mono = new Float32Array(buffer.length);
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const samples = buffer.getChannelData(channel);
        for (let i = 0; i < mono.length; i++) mono[i] += samples[i] / buffer.numberOfChannels;
      }
      const raw = new Uint8Array(mono.buffer);
      let binary = '';
      for (let i = 0; i < raw.length; i += 8192) binary += String.fromCharCode(...raw.subarray(i, i + 8192));
      return { duration: buffer.duration, sampleRate: buffer.sampleRate, data: btoa(binary) };
    }, fs.readFileSync(process.argv[2]).toString('base64'));
    const output = path.join(__dirname, '..', 'test-results');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'reference.f32'), Buffer.from(result.data, 'base64'));
    console.log(`Decoded ${result.duration.toFixed(2)} seconds at ${result.sampleRate} Hz to test-results/reference.f32`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
