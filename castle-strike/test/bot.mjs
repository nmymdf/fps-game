import { chromium } from 'playwright-core';
const html = process.argv[2]; const startL = Number(process.argv[3] || 0); const endL = Number(process.argv[4] || 5);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const logs = []; page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); }); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').slice(0, 500)));
await page.goto('file://' + html); await page.waitForTimeout(2500);
await page.evaluate(() => { __g.G.manual = true; __g.G.noRender = true; });
for (let L = startL; L <= endL; L++) {
  await page.evaluate((L) => { __g.newGame(L, 0); }, L);
  await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const g = __g, G = g.G, P = g.P; G.manual = true;
    return { mode: G.mode, lvl: G.levelIndex };
  });
  const res = await page.evaluate(async () => {
    const g = __g, G = g.G, P = g.P;
    const W = G.world, lv = G.lv, Wd = W.W;
    const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
    const step = (dt) => { P.hp = 100; g.step(dt); };
    const bfs = (sx, sz, goal, keys) => {
      const prev = new Map(); const q = [[sx, sz]]; prev.set(sz * Wd + sx, -1);
      for (let h = 0; h < q.length; h++) {
        const [x, z] = q[h]; if (goal(x, z)) { const path = []; let k = z * Wd + x; while (k !== -1) { path.push([k % Wd, (k / Wd) | 0]); k = prev.get(k); } return path.reverse(); }
        for (const [dx, dz] of DIRS) { const nx = x + dx, nz = z + dz; if (!W.inb(nx, nz)) continue; const i = nz * Wd + nx; if (prev.has(i)) continue; if (W.cells[i] !== 0) continue; const d = W.doorAt.get(i); if (d && ((d.kind === 'gold' && !keys.gold) || (d.kind === 'silver' && !keys.silver))) continue; if (W.decorCell && W.decorCell.has(i)) continue; prev.set(i, z * Wd + x); q.push([nx, nz]); }
      }
      return null;
    };
    const walk = (path) => {
      for (let i = 1; i < path.length; i++) {
        const [gx, gz] = path[i]; const tx = (gx + 0.5) * 3, tz = (gz + 0.5) * 3;
        const door = W.doorAt.get(gz * Wd + gx); if (door) W.openDoor(door, P.keys);
        let guard = 0;
        while (Math.hypot(tx - P.x, tz - P.z) > 0.35 && guard++ < 400) {
          const dx = tx - P.x, dz = tz - P.z; const d = Math.hypot(dx, dz);
          P.yaw = Math.atan2(dx, -dz); P.vx = dx / d * 6; P.vz = dz / d * 6;
          const bx = P.x, bz = P.z;
          [P.x, P.z] = W.tryMove(P.x, P.z, P.vx * 0.05, P.vz * 0.05, 0.38);
          step(0.05);
          if (Math.hypot(P.x - bx, P.z - bz) < 0.001 && guard > 60) break;
        }
      }
    };
    const log = [];
    // 收集所有鑰匙 + 寶物 (走過去)
    let safety = 0;
    while (safety++ < 40) {
      const here = [Math.floor(P.x / 3), Math.floor(P.z / 3)];
      const want = G.items.filter((it) => !it.taken && (it.type.startsWith('key') || it.type === 'treasure' || it.type.startsWith('weapon')));
      if (!want.length) break;
      let best = null;
      for (const it of want) { const path = bfs(here[0], here[1], (x, z) => x === Math.floor(it.x / 3) && z === Math.floor(it.z / 3), P.keys); if (path && (!best || path.length < best.length)) best = path; }
      if (!best) break;
      walk(best);
    }
    // 秘密牆：推
    for (const pw of W.pushwalls) { if (pw.state === 'idle') { W.push(pw); for (let i = 0; i < 40; i++) step(0.05); } }
    const items2 = G.items.filter((it) => !it.taken && it.type === 'treasure').length;
    // 殺光敵人（測試統計用）
    for (const e of G.enemies.list) if (!e.dead) G.enemies.hurt(e, 99999, false);
    for (let i = 0; i < 20; i++) step(0.05);
    let hostInfo = null;
    if (G.hostage) {
      const h = G.hostage, hh = [Math.floor(P.x / 3), Math.floor(P.z / 3)];
      const hp = bfs(hh[0], hh[1], (x, z) => x === Math.floor(h.x / 3) && z === Math.floor(h.z / 3), P.keys);
      if (!hp) return { error: 'no path to hostage' };
      walk(hp); P.yaw = Math.atan2(h.x - P.x, -(h.z - P.z)); step(0.05); g.interact(); step(0.05);
      for (let i = 0; i < 80; i++) step(0.05);
      hostInfo = { freed: h.freed, vis: h.sp.visible };
    }
    // 去出口前一格
    const ex = lv.exit, fx = ex.x + DIRS[ex.d][0], fz = ex.z + DIRS[ex.d][1];
    const here = [Math.floor(P.x / 3), Math.floor(P.z / 3)];
    const path = bfs(here[0], here[1], (x, z) => x === fx && z === fz, P.keys);
    if (!path) return { error: 'no path to exit', keys: P.keys };
    walk(path);
    // 面對出口並互動
    P.x = (fx + 0.5) * 3; P.z = (fz + 0.5) * 3; P.yaw = Math.atan2(-DIRS[ex.d][0], DIRS[ex.d][1]) ;
    // exit 在 (ex.x,ex.z)，從 front 看向牆：方向 = -DIRS[d]
    const dirx = -DIRS[ex.d][0], dirz = -DIRS[ex.d][1]; P.yaw = Math.atan2(dirx, -dirz);
    step(0.05);
    g.interact();
    step(0.05);
    return { mode: G.mode, kills: G.kills, kT: lv.enemyCount, tr: G.treasure, tT: lv.treasure, sec: G.secrets, sT: lv.secrets, score: P.score, treasureLeft: items2, time: G.levelTime.toFixed(1), keys: P.keys, hostInfo };
  });
  console.log('L' + (L + 1), JSON.stringify(res));
}
console.log(logs.slice(0, 10).join('\n'));
await browser.close();
