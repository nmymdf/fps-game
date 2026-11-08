import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
const t0 = Date.now();
await page.goto('file:///home/claude/castle-strike/dist/castle-strike-v1.1.html');
await page.waitForFunction(() => window.__g, null, { timeout: 120000 }); console.log('title ready', Date.now() - t0);
for (const L of [0, 3]) { const t1 = Date.now(); await page.evaluate((L) => __g.newGame(L, 0), L); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 180000 }); console.log('level', L + 1, 'ready', Date.now() - t1); }
console.log(logs.slice(0, 5).join('\n')); await browser.close();
