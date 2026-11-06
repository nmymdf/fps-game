import { chromium } from 'playwright-core';
import fs from 'node:fs';

// 用法: node test/shot.mjs <html> <outPrefix> <json views>   views: [[gx,gz,yaw,pitch],...] 或 'auto'
const [html, prefix, viewsArg, query = ''] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--disable-gpu-sandbox', '--allow-file-access-from-files'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '')));
const t0 = Date.now();
await page.goto('file://' + html + query);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }).catch(() => {});
console.log('ready in', Date.now() - t0, 'ms');
if (process.env.PRE) await page.evaluate(process.env.PRE);
let views = viewsArg === 'auto' ? null : JSON.parse(viewsArg);
if (!views) {
  const info = await page.evaluate(() => window.__info());
  const s = info.start;
  const yawTo = (dx, dz) => Math.atan2(dx, -dz);
  views = [[s.x, s.z, yawTo(Math.cos(s.angle), Math.sin(s.angle)), 0]];
  const big = info.rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 3);
  for (const r of big) { views.push([r.x + 1, r.z + 1, yawTo(1, 1), 0]); views.push([r.x + r.w - 2, r.z + r.h - 2, yawTo(-1, -0.5), 0]); }
}
let n = 0;
for (const v of views) {
  const t1 = Date.now();
  await page.evaluate((v) => (v.length === 5 ? window.__cam(...v) : window.__view(...v)), v);
  await page.screenshot({ path: `${prefix}${n++}.png` });
  console.log('shot', n - 1, Date.now() - t1, 'ms');
}
console.log(logs.slice(0, 30).join('\n'));
await browser.close();
