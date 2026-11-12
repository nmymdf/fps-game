import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2000);
const L = +process.env.LV;
await p.evaluate((L) => { __g.G.manual = true; __g.newGame(L, 0); }, L);
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
console.log('loaded');
const t0 = Date.now();
const r = await p.evaluate(() => { const g=__g,G=g.G,P=g.P; G.wave.t=0.2; const log=[]; let n=0;
  for (let i=0;i<700 && !G.wave.done;i++){ P.hp=100; g.step(0.1); n++;
    for (const e of G.enemies.list) if(!e.dead&&e.wave&&Math.hypot(e.x-P.x,e.z-P.z)<9) G.enemies.hurt(e,999,false);
    if (G.wave.state==='prep') G.wave.t=Math.min(G.wave.t,0.2);
    if (i%60===0) log.push([i,G.wave.n,G.wave.state,G.enemies.list.filter(e=>e.wave&&!e.dead).length]); }
  return {n,done:G.wave.done,kills:G.kills,log}; });
const dbg = await p.evaluate(() => { const G=__g.G,P=__g.P; return G.enemies.list.filter(e=>e.wave).slice(0,4).map(e=>({t:e.type,st:e.state,d:Math.hypot(e.x-P.x,e.z-P.z).toFixed(1),cell:e.cell,f:G.enemies.field? G.enemies.field[e.cell[1]*G.world.W+e.cell[0]]:null,x:e.x.toFixed(1),z:e.z.toFixed(1),sp:G.lv.spawns.length})); });
console.log(JSON.stringify(dbg));
console.log(JSON.stringify(r), (Date.now()-t0)/1000+'s');

await b.close();
