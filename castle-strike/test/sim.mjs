import { chromium } from 'playwright-core';
const html = process.argv[2];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const logs = []; page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); }); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
await page.goto('file://' + html); await page.waitForTimeout(2500);
await page.keyboard.press('Enter'); await page.waitForTimeout(4000);
const res = await page.evaluate(() => {
  const g = __g, w = g.G.world, P = g.P, E = g.G.enemies; const out = [];
  g.G.mode = 'paused'; // 停掉真實 frame 的更新，手動模擬
  const list = E.list;
  // 玩家站到最近敵人前方
  const e0 = list[0];
  let placed = false;
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const d of [9, 7, 5]) { const x = e0.x + dx * d, z = e0.z + dz * d; if (!placed && !w.collides(x, z, 0.4) && w.los(x, z, e0.x, e0.z)) { P.x = x; P.z = z; P.yaw = Math.atan2(-dx, dz); placed = true; } }
  P.hp = 100; P.alive = true; g.G.mode = 'playing';
  const dt = 0.05;
  // 手動模擬：暫停實際 frame 影響 -> 直接呼叫 update
  for (let i = 0; i < 400; i++) {
    E.update(dt, { x: P.x, z: P.z, alive: P.alive, moving: false, firing: false });
    w.updateDoors(dt, [{ x: P.x, z: P.z }]);
    if (i % 40 === 0) out.push({ t: (i * dt).toFixed(1), hp: P.hp, e0: e0.state, d: Math.hypot(e0.x - P.x, e0.z - P.z).toFixed(1), alerted: list.filter((e) => e.state !== 'idle').length });
  }
  return { placed, out, hp: P.hp };
});
console.log(JSON.stringify(res, null, 0));
console.log(logs.join('\n')); await browser.close();
