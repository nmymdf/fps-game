import { chromium } from 'playwright-core';
const html = process.argv[2], out = process.argv[3] || '/tmp/q';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); }); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
await page.goto('file://' + html);
await page.waitForTimeout(3000);
await page.keyboard.press('Enter');
await page.waitForTimeout(4500);
// 找出最近的敵人並面對它，站在 LOS 內 ~7 格距離
const info = await page.evaluate(() => {
  const g = __g, w = g.G.world; const P = g.P;
  const list = g.G.enemies.list;
  // 找出有直視線的敵人，從其前方 6m 站位
  for (const e of list) {
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const d of [8, 6, 5, 4]) {
      const x = e.x + dx * d, z = e.z + dz * d;
      if (!w.collides(x, z, 0.4) && w.los(x, z, e.x, e.z)) { P.x = x; P.z = z; P.yaw = Math.atan2(-dx, dz); P.pitch = 0; return { type: e.type, x, z, ex: e.x, ez: e.z }; }
    }
  }
  return null;
});
console.log('setup', JSON.stringify(info));
await page.waitForTimeout(600);
await page.screenshot({ path: out + '_enemy1.png' });
await page.waitForTimeout(6000);
await page.screenshot({ path: out + '_enemy2.png' });
console.log(JSON.stringify(await page.evaluate(() => ({ hp: __g.P.hp, states: __g.G.enemies.list.map((e) => e.state).join(',') }))));
// 開槍連續
for (let i = 0; i < 6; i++) { await page.evaluate(() => { __g.P.cd = 0; __g.fire(); }); await page.waitForTimeout(250); }
await page.screenshot({ path: out + '_enemy3.png' });
console.log(JSON.stringify(await page.evaluate(() => ({ hp: __g.P.hp, kills: __g.G.kills, states: __g.G.enemies.list.map((e) => e.state + ':' + Math.round(e.hp)).join(',') }))));
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
