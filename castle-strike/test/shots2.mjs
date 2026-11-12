import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2500);
await p.evaluate(() => { __g.G.manual = true; __g.newGame(6, 0); });
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
const r = await p.evaluate(() => { const g=__g,G=g.G,T=G.traps,P=g.P,W=G.world; const b=T.barrels[0]; let ok=false;
  for (let a=0;a<16&&!ok;a++){ const ang=a*Math.PI/8; for (const d of [3.5,3,2.5]) { const px=b.x+Math.cos(ang)*d, pz=b.z+Math.sin(ang)*d; if(!W.collides(px,pz,0.4)){ P.x=px;P.z=pz;P.yaw=Math.atan2(b.x-px,-(b.z-pz));P.pitch=-0.15;ok=true;break; } } }
  for(let i=0;i<4;i++) g.step(0.05); return ok; });
console.log(r); await p.screenshot({ path: '/tmp/s_barrel.png' });
// shoot it
await p.evaluate(() => { const g=__g; g.P.cur='rifle'; g.P.mag.rifle=10; g.G.traps.barrels[0].hp=1; });
await p.mouse.move(480,270); await p.evaluate(() => { for(let i=0;i<3;i++) __g.step(0.05); });
await p.evaluate(() => { __g.G.traps.shotAt(__g.G.traps.barrels[0].x, __g.G.traps.barrels[0].z, 99); for(let i=0;i<5;i++) __g.step(0.05); });
await p.screenshot({ path: '/tmp/s_boom.png' });
await b.close();
