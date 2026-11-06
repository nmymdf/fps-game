import { chromium } from 'playwright-core';
const html = process.argv[2], out = process.argv[3] || '/tmp/p';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('console', (m) => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').slice(0, 400)));
await page.goto('file://' + html);
await page.waitForTimeout(4000);
await page.screenshot({ path: out + '_title.png' });
await page.keyboard.press('Enter');
await page.waitForTimeout(5000);
console.log('mode', await page.evaluate(() => __g.G.mode));
await page.screenshot({ path: out + '_play1.png' });
// 走動 + 開槍
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
await page.evaluate(() => { __g.fire(); });
await page.waitForTimeout(150);
await page.screenshot({ path: out + '_fire.png' });
console.log(JSON.stringify(await page.evaluate(() => ({ mode: __g.G.mode, hp: __g.P.hp, x: __g.P.x, z: __g.P.z, en: __g.G.enemies.list.length, items: __g.G.items.length }))));
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
