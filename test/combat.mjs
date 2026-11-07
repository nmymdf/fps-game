import { chromium } from 'playwright-core';
const html = process.argv[2];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto('file://' + html); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
await page.evaluate(() => __g.newGame(1, 0)); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(1500);
const ok = await page.evaluate(() => {
  const g = __g, w = g.G.world, P = g.P, e = g.G.enemies.list.find((q) => q.type === 'officer'); g.G.manual = true;
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const d of [6, 5, 4.5, 4]) { const x = e.x + dx * d, z = e.z + dz * d; if (!w.collides(x, z, 0.4) && w.los(x, z, e.x, e.z)) {
    P.x = x; P.z = z; P.yaw = Math.atan2(-dx, dz); P.pitch = 0.0; e.state = 'idle'; e.face = Math.atan2(dx, dz); P.cur = 'pistol'; g.vm.show('pistol'); g.vm.next = null; g.vm.switchT = 1;
    g.step(0.016); g.step(0.016); return true; } } return false; });
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/cb_before.png' });
await page.evaluate(() => { __g.G.manual = false; });
console.log(await page.evaluate(() => { __g.fire(); return document.getElementById('cross').className + ' hp=' + __g.G.enemies.list.find((q) => q.type === 'officer').hp; }));
await page.waitForTimeout(60);
await page.screenshot({ path: '/tmp/cb_hit.png' });
console.log(ok, logs.join('\n')); await browser.close();
