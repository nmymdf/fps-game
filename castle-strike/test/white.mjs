import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto('file:///home/claude/castle-strike/dist/castle-strike-v1.1.html'); await page.waitForTimeout(2500);
await page.evaluate(() => { __g.newGame(5, 0); }); await page.waitForTimeout(3500);
const info = await page.evaluate(() => { __g.G.manual = true; const g = __g, P = g.P; const r = g.G.lv.rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h)[1]; P.x = (r.x + 1.5) * 3; P.z = (r.z + 1.5) * 3; P.yaw = Math.atan2(1, -1); for (const e of g.G.enemies.list) e.state = 'idle';
  const near = []; g.G.items.forEach((it) => { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < 4) near.push([it.type, d.toFixed(1)]); });
  const near2 = g.G.enemies.list.filter((e) => Math.hypot(e.x - P.x, e.z - P.z) < 5).map((e) => e.type + ':' + Math.hypot(e.x - P.x, e.z - P.z).toFixed(1));
  g.step(0.016); return { room: [r.x, r.z, r.w, r.h], P: [P.x, P.z], near, near2 }; });
console.log(JSON.stringify(info));
const tests = { base: () => {}, noBeams: () => __g.G.world.beams.forEach((b) => b.mesh.visible = false), noEnemies: () => __g.G.enemies.list.forEach((e) => { e.group.visible = false; e.fl.visible = false; }), noItems: () => __g.G.items.forEach((i) => i.obj.visible = false), noBloom: () => { __g.eng.bloom.enabled = false; } };
for (const [k, f] of Object.entries(tests)) { await page.evaluate(f); await page.evaluate(() => { __g.step(0.016); __g.step(0.016); }); await page.waitForTimeout(200); await page.screenshot({ path: `/tmp/w_${k}.png` }); }
await browser.close();
