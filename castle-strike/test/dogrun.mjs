import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto('file://' + process.argv[2]); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
await page.evaluate(() => __g.newGame(1, 0)); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(1000);
await page.evaluate(() => { const g = __g, w = g.G.world, P = g.P, e = g.G.enemies.list.find((q) => q.type === 'dog'); g.G.manual = true;
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const d of [5, 4.5, 4]) { const x = e.x + dx * d, z = e.z + dz * d; if (!w.collides(x, z, 0.4) && w.los(x, z, e.x, e.z)) { P.x = x; P.z = z; P.yaw = Math.atan2(-dx, dz); P.pitch = 0; e.face = Math.atan2(dx, dz); window.__dog = e; g.step(0.016); return; } } });
let i = 0;
for (const ph of [0, 1.2, 2.4, 3.6]) {
  await page.evaluate((ph) => { const e = window.__dog; e.state = 'chase'; e.walkP = ph / 1.05 * 1.0 + 0; e.animate(0.0001, true); __g.eng.composer.render(); }, ph);
  await page.screenshot({ path: `/tmp/dr_${i++}.png`, clip: { x: 340, y: 200, width: 600, height: 400 } });
}
console.log(logs.join('\n')); await browser.close();
