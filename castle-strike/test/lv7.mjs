import { chromium } from 'playwright-core';
const file = process.argv[2], L = +process.argv[3];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', e => console.log('ERR', e.message)); p.on('crash', () => console.log('CRASH'));
await p.goto('file://' + file); await p.waitForTimeout(2500);
try {
await p.evaluate((L) => { __g.G.manual = true; __g.newGame(L, 0); }, L);
await p.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 });
console.log('loaded', await p.evaluate(() => { const T=__g.G.traps; return T? [T.spikes.length,T.flames.length,T.barrels.length,T.lusters.length]:null; }));
for (let k=0;k<6;k++){ await p.evaluate(() => { for(let i=0;i<40;i++) __g.step(0.05); }); }
console.log('stepped ok');
} catch(e){ console.log('FAIL', e.message.slice(0,100)); }
await b.close();
