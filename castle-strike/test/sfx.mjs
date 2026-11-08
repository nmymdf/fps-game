import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message + (e.stack || '').slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto('file:///home/claude/castle-strike/dist/castle-strike-v1.1.html'); await page.waitForTimeout(2500);
await page.keyboard.press('Enter'); await page.waitForTimeout(3500);
const r = await page.evaluate(async () => {
  const a = __g.audio; a.init(); await new Promise((r) => setTimeout(r, 300));
  const names = ['pistol','smg','shotgun','rifle','shot_guard','shot_officer','shot_heavy','shot_boss','whiz','knife','knife_hit','empty','reload','switch','pump','step','door_open','door_close','locked','push','secret','pickup','treasure','health','key','weapon','hurt_player','die_player','bite','hit','ui','ui_ok','step_dog'];
  for (const t of ['guard','officer','heavy','dog','boss']) for (const p of ['alert_','hurt_','die_']) names.push(p + t);
  const errs = [];
  for (const n of names) { try { a.sfx(n); a.sfx(n, 50, 50); } catch (e) { errs.push(n + ':' + e.message); } }
  a.play('hall', 0.9); await new Promise((r) => setTimeout(r, 1200));
  for (const j of ['title','clear','victory','death']) { try { a.jingle(j); } catch (e) { errs.push(j + ':' + e.message); } }
  return { state: a.ctx.state, errs, n: names.length, track: a.track };
});
console.log(JSON.stringify(r)); console.log(logs.join('\n')); await browser.close();
