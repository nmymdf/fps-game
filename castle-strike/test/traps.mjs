import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERR', e.message));
p.on('console', m => { if (m.type()==='error') console.log('CON', m.text().slice(0,150)); });
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2500);
const LV = +(process.env.LV||3);
await p.evaluate((L) => { __g.G.manual = true; __g.newGame(L, 0); }, LV);
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
const info = await p.evaluate(() => { const c={}; for (const t of __g.G.lv.traps) c[t.type]=(c[t.type]||0)+1; const it={}; for (const i of __g.G.lv.items) if(['potion_speed','shield','power'].includes(i.type)) it[i.type]=(it[i.type]||0)+1; return {c,it}; });
console.log('LV',LV,JSON.stringify(info));
async function look(kind, dist, name, yawFix) {
  const ok = await p.evaluate(({kind,dist,yawFix}) => {
    const g=__g,G=g.G,T=G.traps,P=g.P; P.hp=100; P.buff.shield=0;
    let tg; if(kind==='spike') tg=T.spikes[0]; if(kind==='flame') tg=T.flames[0]; if(kind==='barrel') tg=T.barrels[0]; if(kind==='luster') tg=T.lusters[0];
    if(!tg) return false;
    const W=G.world; let best=null;
    for (let a=0;a<16&&!best;a++){ const ang=a*Math.PI/8, px=tg.x+Math.cos(ang)*dist, pz=tg.z+Math.sin(ang)*dist; if(!W.collides(px,pz,0.4)&&W.los(px,pz,tg.x,tg.z)) best=[px,pz]; }
    if(!best) return false;
    P.x=best[0]; P.z=best[1]; P.yaw=Math.atan2(tg.x-P.x,-(tg.z-P.z)); P.pitch=-0.12;
    if(kind==='flame'){ T.t=0; T.flames[0].ph=3.6-0; }
    if(kind==='spike'){ T.spikes[0].ph=3.0-T.t; }
    for(let i=0;i<6;i++) g.step(0.05); return true; }, {kind,dist});
  console.log(kind, ok);
  if (ok) await p.screenshot({ path: '/tmp/t_'+name+'.png' });
}
await look('spike',4.5,'spike'); await look('flame',5,'flame'); await look('barrel',3,'barrel'); await look('luster',5,'luster');
// barrel explosion test
const ex = await p.evaluate(() => { const g=__g,G=g.G,T=G.traps,P=g.P; if(!T.barrels.length) return null; const b=T.barrels[0]; const en=G.enemies.list.filter(e=>!e.dead); let e0=en.sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z))[0];
  e0.x=b.x+1.5; e0.z=b.z; const hp0=e0.hp; P.hp=100;P.armor=0; P.x=b.x-3; P.z=b.z; b.fuse=0.01; for(let i=0;i<10;i++) g.step(0.05); return {enHp:[hp0,e0.hp,e0.dead], php:P.hp, dead:b.dead}; });
console.log('explosion', JSON.stringify(ex));
await p.screenshot({ path: '/tmp/t_boom.png' });
// chandelier fall
const ch = await p.evaluate(() => { const g=__g,G=g.G,T=G.traps,P=g.P; if(!T.lusters.length) return null; const l=T.lusters[0]; P.hp=100;P.armor=0;P.x=l.x;P.z=l.z; for(let i=0;i<40;i++) g.step(0.05); return {st:l.st, hp:P.hp}; });
console.log('luster', JSON.stringify(ch));
// shield/speed/power
const bf = await p.evaluate(() => { const g=__g,P=g.P; P.buff.shield=6;P.buff.speed=12;P.buff.power=15; P.hp=100; g.step(0.05); return document.getElementById('buffs').innerText.replace(/\n/g,'|'); });
console.log('buffs', bf);
await p.screenshot({ path: '/tmp/t_buff.png' });
await b.close();
