import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2000);
await p.evaluate(() => { __g.G.manual = true; __g.newGame(1, 0); });
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => { const g=__g,G=g.G,P=g.P,W=G.world,B=G.breakables; for (const e of G.enemies.list) if(!e.dead) G.enemies.hurt(e,1e5,false);
  const q=B.pics[0]; q.loot=true; const out={q:[q.x.toFixed(2),q.z.toFixed(2)],n:q.n};
  for (const s of [1,-1]) { const px=q.x - s*q.n[0]*2.5, pz=q.z - s*q.n[1]*2.5; out['s'+s]=[px.toFixed(1),pz.toFixed(1),W.collides(px,pz,0.4), W.cells[Math.floor(pz/3)*W.W+Math.floor(px/3)]]; }
  const s = out['s1'][2] ? -1 : 1; P.x=q.x - s*q.n[0]*2.5; P.z=q.z - s*q.n[1]*2.5; P.yaw=Math.atan2(q.x-P.x,-(q.z-P.z)); P.pitch=0.05; for(let i=0;i<4;i++) g.step(0.05);
  const [dx,dy,dz]=[Math.sin(P.yaw)*Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw)*Math.cos(P.pitch)]; const h = g.hitscan ? g.hitscan(dx,dy,dz) : null; out.hs = h ? [h.wall, h.px.toFixed(2), h.py.toFixed(2), h.pz.toFixed(2)] : 'nohitscan';
  return out; })));
await p.screenshot({ path: '/tmp/b3.png' });
console.log(JSON.stringify(await p.evaluate(() => { const g=__g,P=g.P; P.cur='rifle'; P.weapons.rifle=true; P.mag.rifle=10; P.cd=0; g.fire(); for(let i=0;i<14;i++) g.step(0.05); return { broken: __g.G.breakables.pics[0].broken, items: __g.G.items.filter(i=>i.bonus).map(i=>i.type) }; })));
await p.screenshot({ path: '/tmp/b4.png' });
await b.close();
