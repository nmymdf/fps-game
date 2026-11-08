import { chromium } from 'playwright-core';
const html = process.argv[2];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
await page.goto('file://' + html); await page.waitForTimeout(2500);
let n = 0;
for (const [L, types] of [[1, ['officer', 'dog']], [3, ['heavy']], [5, ['boss']], [0, ['guard']]]) {
  await page.evaluate((L) => { __g.G.manual = false; __g.newGame(L, 0); }, L); await page.waitForTimeout(3500);
  for (const t of types) {
    const ok = await page.evaluate((t) => {
      const g = __g, w = g.G.world, P = g.P, e = g.G.enemies.list.find((q) => q.type === t); if (!e) return false;
      g.G.manual = true;
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const d of [4.5, 4, 3.6]) { const x = e.x + dx * d, z = e.z + dz * d; if (!w.collides(x, z, 0.4) && w.los(x, z, e.x, e.z)) { P.x = x; P.z = z; P.yaw = Math.atan2(-dx, dz); P.pitch = 0.0; e.state = 'idle'; e.face = Math.atan2(dx, dz); g.step(0.016); g.step(0.016); return true; } }
      return false;
    }, t);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `/tmp/foe_${t}.png`, clip: { x: 240, y: 90, width: 480, height: 300 } }); console.log(t, ok);
    await page.evaluate(() => { __g.G.manual = false; });
  }
}
console.log(logs.join('\n')); await browser.close();
