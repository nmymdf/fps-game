import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2500);
const load = async (L) => { await p.evaluate((L) => { __g.G.manual = true; __g.newGame(L, 0); }, L); await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); };
// ---- defense
await load(9);
const d = await p.evaluate(() => { const g=__g,G=g.G,P=g.P; P.hp=100; const log=[]; let minD=99, t=0, lastN=-1;
  G.wave.t=1; while (t<150 && !G.wave.done) { P.hp=100; g.step(0.1); t+=0.1; if (G.wave.state==='prep') G.wave.t=Math.min(G.wave.t,1);
    for (const e of G.enemies.list) if(!e.dead && e.wave){ const d=Math.hypot(e.x-P.x,e.z-P.z); minD=Math.min(minD,d); if(d<9) G.enemies.hurt(e,999,false); }
    if (G.wave.n!==lastN){ lastN=G.wave.n; log.push([t.toFixed(0),G.wave.n,G.wave.state]); } }
  return { done:G.wave.done, t:t.toFixed(0), minD:minD.toFixed(1), kills:G.kills, kT:G.lv.enemyCount, log }; });
console.log('defense', JSON.stringify(d));
await p.screenshot({ path: '/tmp/m_def.png' });
// ---- escape
await load(6);
const e1 = await p.evaluate(() => { const g=__g,G=g.G; g.step(0.05); return { t:G.timeLeft.toFixed(0), clocks:G.lv.items.filter(i=>i.type==='clock').length, traps:G.lv.traps.length }; });
console.log('escape', JSON.stringify(e1));
await p.screenshot({ path: '/tmp/m_esc.png' });
const e2 = await p.evaluate(() => { const g=__g,G=g.G; G.timeLeft=0.1; for(let i=0;i<6;i++) g.step(0.05); return G.mode; });
console.log('timeout mode', e2);
// ---- sneak
await load(3);
const s1 = await p.evaluate(() => { const g=__g,G=g.G,P=g.P; g.step(0.05);
  const e=G.enemies.list.find(e=>!e.dead&&e.type==='guard'); e.state='idle'; e.x=P.x+Math.sin(P.yaw)*1.1; e.z=P.z-Math.cos(P.yaw)*1.1; e.face=P.yaw; P.cur='knife'; g.step(0.05);
  return { st:e.state, alarm:G.alarm, hud:document.getElementById('modehud').textContent }; });
console.log('sneak before', JSON.stringify(s1));
await p.screenshot({ path: '/tmp/m_sneak.png' });
const s2 = await p.evaluate(() => { const g=__g,G=g.G,P=g.P; const e=G.enemies.list.find(e=>!e.dead&&e.state==='idle'); G.enemies.wake(e,0.1); for(let i=0;i<4;i++) g.step(0.05); const n=G.enemies.list.filter(e=>!e.dead&&e.state==='chase'||e.state==='alert').length; return { alarm:G.alarm, chasing:n, hud:document.getElementById('modehud').textContent }; });
console.log('sneak alarm', JSON.stringify(s2));
await p.screenshot({ path: '/tmp/m_alarm.png' });
await b.close();
