import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2500);
for (const L of [3,7]) {
await p.evaluate((L) => { __g.G.manual = true; __g.newGame(L, 0); }, L);
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
const r = await p.evaluate(() => {
  const g=__g,G=g.G,h=G.hostage,W=G.world,out={};
  out.start=[h.x.toFixed(2),h.z.toFixed(2)]; out.cell=W.cells[Math.floor(h.z/3)*W.W+Math.floor(h.x/3)];
  g.P.x=1e3; for(let i=0;i<400;i++) g.step(0.05);
  out.idle=[h.x.toFixed(2),h.z.toFixed(2),h.freed,h.sp.visible];
  // freed run: track min clearance & wall cells
  h.freed=true; h.t=0; let bad=0,n=0,last=null;
  for(let i=0;i<200 && h.sp.visible;i++){ g.step(0.05); n++; const c=W.cells[Math.floor(h.z/3)*W.W+Math.floor(h.x/3)]; if(c!==0 && c!==undefined) bad++; last=[h.x.toFixed(1),h.z.toFixed(1)]; }
  const ex=G.lv.exit; out.run={n,bad,last,exit:[ex.x,ex.z],vis:h.sp.visible,cellval:W.cells[Math.floor(h.z/3)*W.W+Math.floor(h.x/3)]};
  return out; }); console.log(L, JSON.stringify(r)); }
await b.close();
