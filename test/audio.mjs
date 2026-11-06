import { chromium } from 'playwright-core'; import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage(); const logs = []; page.on('pageerror', (e) => logs.push(e.message));
await page.goto('file:///tmp/audiotest.html'); await page.waitForTimeout(500);
for (const [id, bars, inten, j] of [['courtyard', 8, 0.2], ['courtyard', 8, 1], ['hall', 8, 0.8], ['library', 8, 0.5], ['cellar', 8, 1], ['chapel', 8, 0.6], ['throne', 8, 1], ['title', 0, 0, true], ['victory', 0, 0, true], ['clear', 0, 0, true], ['death', 0, 0, true]]) {
  const r = await page.evaluate(async ([id, bars, inten, j]) => window.renderTrack(id, bars, inten, j), [id, bars, inten, j]);
  console.log(id, inten, 'peak', r.peak.toFixed(2), 'rms', r.rms.toFixed(3), 'nan', r.nan, 'dur', r.dur.toFixed(1));
  const buf = Buffer.from(r.pcm, 'base64'); const hdr = Buffer.alloc(44); hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + buf.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(r.sr, 24); hdr.writeUInt32LE(r.sr * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(buf.length, 40);
  fs.writeFileSync(`/tmp/mus_${id}_${inten}.wav`, Buffer.concat([hdr, buf]));
}
console.log(logs.join('\n')); await browser.close();
