import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('file:///home/claude/castle-strike/dist/castle-strike-v1.2.html'); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
await page.evaluate(() => __g.newGame(3, 0)); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/h2_cellar.png' });
await page.evaluate(() => { __g.G.manual = true; document.getElementById('gunfl').style.opacity = 1; }); await page.screenshot({ path: '/tmp/h2_flash.png', clip: { x: 380, y: 250, width: 500, height: 300 } });
await browser.close();
