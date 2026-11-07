import { chromium } from 'playwright-core';
const html = process.argv[2], out = process.argv[3] || '/tmp/gun';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
await page.goto('file://' + html); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
await page.evaluate(() => __g.newGame(0, 0)); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(2500);
await page.evaluate(() => { const P = __g.P; for (const k of ['smg','shotgun','rifle']) { P.weapons[k] = true; P.mag[k] = 5; } P.ammo.shells = 20; });
for (const id of (process.env.W || 'knife,pistol,smg,shotgun,rifle').split(',')) {
  await page.evaluate((id) => { __g.P.cur = id; __g.vm.show(id); __g.vm.next = null; __g.vm.switchT = 1; }, id);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}_${id}.png`, fullPage: false });
}
console.log(logs.join('\n')); await browser.close();
