import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2000);
await p.evaluate(() => { __g.G.manual = true; __g.newGame(2, 0); });
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => { const g=__g,G=g.G,P=g.P,W=G.world; const e=G.enemies.list.find(e=>e.elite); const n=G.enemies.list.find(o=>!o.elite&&o.type===e.type&&o!==e);
  n.x=e.x+1.4; n.z=e.z; for (const o of G.enemies.list) o.state='idle';
  let done=false; for (let a=0;a<32&&!done;a++){ const ang=a*Math.PI/16, px=e.x+0.7+Math.cos(ang)*4.5, pz=e.z+Math.sin(ang)*4.5; if(!W.collides(px,pz,0.4)&&W.los(px,pz,e.x,e.z)&&W.los(px,pz,n.x,n.z)){ P.x=px;P.z=pz;P.yaw=Math.atan2(e.x+0.7-px,-(e.z-pz));P.pitch=-0.05; done=true; } }
  P.hp=100; g.step(0.02); return { type:e.type, hp:e.hp, nhp:n.hp, done }; })));
await p.screenshot({ path: '/tmp/b5.png' });
await b.close();
