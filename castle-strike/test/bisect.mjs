import { chromium } from 'playwright-core';
const [html, query, viewJson] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('file://' + html + query);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const r = await page.evaluate((v) => {
  window.__view(...v);
  const eng = window.__eng, w = window.__world, canvas = eng.renderer.domElement;
  const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height;
  const ctx = c2.getContext('2d', { willReadFrequently: true });
  const sx = canvas.width / 1280, sy = canvas.height / 720;
  const metric = () => {
    eng.composer.render();
    ctx.drawImage(canvas, 0, 0);
    const d = ctx.getImageData(700 * sx, 560 * sy, 300 * sx, 160 * sy).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] * 2 + d[i + 2];
    return s;
  };
  const base = metric();
  const out = [];
  w.group.children.forEach((c, i) => {
    const was = c.visible; c.visible = false;
    const m = metric();
    c.visible = was;
    if (c.type === "Mesh" && Math.abs(m - base) / base > 0.001) out.push({ i, type: c.type, geo: c.geometry?.type, verts: c.geometry?.attributes?.position?.count, delta: ((m - base) / base).toFixed(3) });
  });
  return { base, out, n: w.group.children.length };
}, JSON.parse(viewJson));
console.log(JSON.stringify(r, null, 1));
await browser.close();
