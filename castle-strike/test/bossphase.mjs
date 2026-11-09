import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('file://' + process.argv[2]); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
await page.evaluate(() => __g.newGame(9, 0)); await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
const r = await page.evaluate(() => { const g=__g, G=g.G; const boss=G.enemies.list.find(e=>e.boss); const n0=G.enemies.list.length;
  boss.hp=boss.maxHp*0.6; G.enemies.bossPhase(boss); const n1=G.enemies.list.length; boss.hp=boss.maxHp*0.2; G.enemies.bossPhase(boss);
  return {n0,n1,n2:G.enemies.list.length,phase:boss.phase,kills:G.kills}; });
console.log(JSON.stringify(r), errs.join('|')||'no errors'); await b.close();
