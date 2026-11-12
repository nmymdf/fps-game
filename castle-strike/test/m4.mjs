import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file:///home/claude/castle-strike/dist/index.html'); await p.waitForTimeout(2000);
await p.evaluate(() => { __g.G.manual = true; __g.newGame(3, 0); });
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
// backstab via real mouse click with knife
const r = await p.evaluate(() => { const g=__g,G=g.G,P=g.P; g.step(0.05); P.cur='knife'; P.weapons.knife=true; if (g.vm) g.vm.show('knife');
  const e=G.enemies.list.find(e=>!e.dead&&e.type==='guard'); e.state='idle'; e.x=P.x+Math.sin(P.yaw)*1.0; e.z=P.z-Math.cos(P.yaw)*1.0; e.face=Math.atan2(Math.sin(P.yaw),-Math.cos(P.yaw)); for(let i=0;i<6;i++) g.step(0.05); window.__e=e; return {st:e.state,hp:e.hp}; });
console.log('before', JSON.stringify(r));
await p.evaluate(() => { __g.P.cd = 0; __g.fire(); });
await p.evaluate(() => { for(let i=0;i<20;i++) __g.step(0.05); });
console.log('after', JSON.stringify(await p.evaluate(() => ({ st:window.__e.state, hp:window.__e.hp, alarm:__g.G.alarm, cur:__g.P.cur }))));
// shop
await p.evaluate(() => { __g.P.coins = 9000; __g.P.hp = 50; __g.finishLevel(); });
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
console.log('mode', await p.evaluate(() => __g.G.mode));
await p.keyboard.press('ArrowDown'); await p.keyboard.press('Space'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Space'); await p.waitForTimeout(200);
await p.screenshot({ path: '/tmp/m_shop1.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
console.log('bought', JSON.stringify(await p.evaluate(() => ({ coins:__g.P.coins, hp:__g.P.hp, shells:__g.P.ammo.shells, mode:__g.G.mode }))));
await p.screenshot({ path: '/tmp/m_shop2.png' });
await b.close();
