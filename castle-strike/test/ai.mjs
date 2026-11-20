import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2000);
await p.evaluate((L) => { __g.G.manual = true; __g.G.noRender = true; __g.newGame(L, 0); }, +(process.env.LV || 1));
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate(() => { const g=__g,G=g.G,P=g.P,E=G.enemies;
  const st={ shouted:0, flank:new Set(), strafe:new Set(), dmg:0, woke:0 }; const orig=E.shout.bind(E); E.shout=(e)=>{ st.shouted++; orig(e); };
  // 找第一個敵人，讓玩家站到他房間門口附近讓他看到
  const e0=E.list.find(e=>e.type==='guard'); P.x=e0.x+ (Math.random()<2? 5:0); P.z=e0.z; if (G.world.collides(P.x,P.z,0.4)) { P.x=e0.x; P.z=e0.z+5; }
  E.wake(e0,0.2); let hp0=0;
  for (let i=0;i<600;i++){ P.hp=100; P.armor=0; const before=P.hp; g.step(0.05); st.dmg += Math.max(0, before - P.hp);
    for (const e of E.list){ if(e.flankF) st.flank.add(e); if(e.strafeT>0) st.strafe.add(e); } }
  const act=E.list.filter(e=>!e.dead&&e.state!=='idle').length;
  return { shouts:st.shouted, active:act, total:E.list.length, flankers:st.flank.size, strafers:st.strafe.size, dmgPer30s:st.dmg, diff:null }; })));
await b.close();
