import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2000);
await p.evaluate((L) => { __g.G.manual = true; __g.newGame(L, 0); }, +(process.env.LV || 1));
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => { const B=__g.G.breakables; const c={}; for (const x of B.list) c[x.d.type]=(c[x.d.type]||0)+1; return { brk:c, pics:B.pics.length, elites:__g.G.enemies.list.filter(e=>e.elite).length }; })));
// look at a breakable
const ok = await p.evaluate(() => { const g=__g,G=g.G,P=g.P,W=G.world,B=G.breakables; for (const e of G.enemies.list) if(!e.dead) G.enemies.hurt(e,1e5,false);
  const t = B.list.find(x=>x.d.type==='urn') || B.list[0]; window.__t=t;
  for (let a=0;a<16;a++){ const ang=a*Math.PI/8, px=t.x+Math.cos(ang)*2.6, pz=t.z+Math.sin(ang)*2.6; if(!W.collides(px,pz,0.4)){ P.x=px;P.z=pz;P.yaw=Math.atan2(t.x-px,-(t.z-pz));P.pitch=-0.2; for(let i=0;i<4;i++) g.step(0.05); return t.d.type; } } return false; });
console.log('look', ok); await p.screenshot({ path: '/tmp/b1.png' });
const r = await p.evaluate(() => { const g=__g,P=g.P; P.cur='rifle'; P.weapons.rifle=true; P.mag.rifle=10; let n=0; for(let k=0;k<4&&!window.__t.broken;k++){ P.cd=0; g.fire(); n++; for(let i=0;i<8;i++) g.step(0.05);} for(let i=0;i<4;i++) g.step(0.05); return { broken: window.__t.broken, shots:n, items: g.G.items.filter(i=>i.bonus).map(i=>i.type), chips:g.G.breakables.chips.length }; });
console.log('shoot', JSON.stringify(r)); await p.screenshot({ path: '/tmp/b2.png' });
// painting
const pr = await p.evaluate(() => { const g=__g,G=g.G,P=g.P,W=G.world,B=G.breakables; const q=B.pics[0]; if(!q) return null; q.loot=true;
  let px=0,pz=0; for (const dd of [3.5,3,2.5,2,1.6]) { px=q.x - q.n[0]*dd; pz=q.z - q.n[1]*dd; if(!W.collides(px,pz,0.4)) break; } P.x=px;P.z=pz;P.yaw=Math.atan2(q.x-px,-(q.z-pz)); P.pitch=0.0; for(let i=0;i<4;i++) g.step(0.05); window.__q=q; return [W.collides(px,pz,0.4)]; });
console.log('pic', JSON.stringify(pr)); await p.screenshot({ path: '/tmp/b3.png' });
console.log('picshot', JSON.stringify(await p.evaluate(() => { const g=__g,P=g.P; P.cd=0; P.mag.rifle=10; g.fire(); for(let i=0;i<14;i++) g.step(0.05); return { broken: window.__q.broken }; })));
await p.screenshot({ path: '/tmp/b4.png' });
// elite look
console.log('elite', JSON.stringify(await p.evaluate(() => { const g=__g,G=g.G,P=g.P,W=G.world; const e=G.enemies.list.find(e=>e.elite)||G.enemies.list.find(e=>e.type==='officer'); if(!e) return null; e.state='idle'; e.dead=false;
  for (let a=0;a<16;a++){ const ang=a*Math.PI/8, px=e.x+Math.cos(ang)*4, pz=e.z+Math.sin(ang)*4; if(!W.collides(px,pz,0.4)&&W.los(px,pz,e.x,e.z)){ P.x=px;P.z=pz;P.yaw=Math.atan2(e.x-px,-(e.z-pz));P.pitch=-0.05; break; } }
  e.group.visible=true; for(let i=0;i<3;i++) g.step(0.05); return { elite:!!e.elite, hp:e.hp, type:e.type }; })));
await p.screenshot({ path: '/tmp/b5.png' });
await b.close();
