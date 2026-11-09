import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto('file://' + process.argv[2]); await page.waitForFunction(() => window.__g, null, { timeout: 60000 });
await page.keyboard.press('KeyM'); await page.waitForTimeout(300);
console.log('btn:', await page.textContent('#musicbtn'));
for (const lv of [0, 3, 5]) {
  await page.evaluate((lv) => { __g.audio && __g.audio.init(); __g.newGame(lv, 0); }, lv);
  await page.waitForFunction(() => __g.G.mode === 'playing', null, { timeout: 120000 }); await page.waitForTimeout(9000);
  console.log('lv', lv, JSON.stringify(await page.evaluate(() => ({ gen: __g.audio.gen, bufs: Object.keys(__g.audio._bufs||{}), track: __g.audio?.track, file: !!__g.audio?.fileSrc, state: __g.audio?.ctx?.state, mbus: __g.audio?.mBus?.gain.value })) ));
}
console.log(logs.join('\n') || 'no errors');
await browser.close();
