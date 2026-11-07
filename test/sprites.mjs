import { chromium } from 'playwright-core';
const html = process.argv[2];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').slice(0, 500))); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto('file://' + html); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
for (const [L, t] of (process.env.LV ? JSON.parse(process.env.LV) : [[0, 'guard'], [1, 'officer'], [3, 'heavy']])) {
  await page.evaluate((L) => { __g.G.manual = false; __g.newGame(L, 0); }, L); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(1500);
  const modes = (process.env.MODES || 'front,sideA,fire,dead').split(',');
  for (const md of modes) {
    const ok = await page.evaluate(([t, md, DIST]) => {
      const g = __g, w = g.G.world, P = g.P, e = g.G.enemies.list.find((q) => q.type === t); if (!e) return false;
      g.G.manual = true; e.dead = false; e.state = 'idle';
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const d of DIST) { const x = e.x + dx * d, z = e.z + dz * d; if (!w.collides(x, z, 0.4) && w.los(x, z, e.x, e.z)) {
        P.x = x; P.z = z; P.yaw = Math.atan2(-dx, dz); P.pitch = 0;
        const toP = Math.atan2(dx, dz); const off = { front: 0, sideA: Math.PI / 2, sideB: -Math.PI / 2, back: Math.PI, fire: 0, dead: 0 }[md];
        e.face = toP + off; if (md === 'fire') { e.state = 'attack'; e.sinceShot = 0.05; e.aimed = 1; }
        if (md === 'dead') { e.dead = true; e.deadT = 2; e.state = 'dead'; }
        e.t = 0; for (let i = 0; i < 3; i++) { g.step(0.016); if (md === 'fire') e.sinceShot = 0.05; }
        return true; } }
      return false;
    }, [t, md, process.env.DIST ? JSON.parse(process.env.DIST) : [6.5, 6, 5, 4.5, 4]]);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `/tmp/sp_${t}_${md}.png`, clip: { x: 230, y: 130, width: 500, height: 410 } });
  }
  console.log(t);
}
console.log(logs.join('\n')); await browser.close();
