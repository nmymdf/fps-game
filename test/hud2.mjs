import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
await page.goto('file:///home/claude/castle-strike/dist/castle-strike-v1.2.html'); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
for (const L of (process.env.L || '0').split(',').map(Number)) {
  await page.evaluate((L) => __g.newGame(L, 0), L); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(2000);
  await page.screenshot({ path: `/tmp/h2_${L}.png` });
}
await page.evaluate(() => { __g.fire(); }); await page.waitForTimeout(25); await page.screenshot({ path: '/tmp/h2_fire.png' });
console.log(logs.join('\n')); await browser.close();
