import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
await page.goto('file:///home/claude/castle-strike/'+process.argv[2]); await page.waitForTimeout(2500);
for (const L of [0,1,2,3,4,5]) {
  await page.evaluate((L) => { __g.G.manual = false; __g.newGame(L, 0); }, L); await page.waitForTimeout(3500);
  await page.evaluate(() => { __g.G.manual = true; const g = __g, w = g.G.world, P = g.P; const r = g.G.lv.rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h)[1]; P.x = (r.x + 1.5) * 3; P.z = (r.z + 1.5) * 3; P.yaw = Math.atan2(1, -1); P.pitch = -0.02; for (const e of g.G.enemies.list) e.state = 'idle'; g.step(0.016); g.step(0.016); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/lvs${L}.png` });
}
console.log(logs.join('\n')); await browser.close();
