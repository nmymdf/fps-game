import { chromium } from 'playwright-core';
const [html, query, viewJson, px, py] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('file://' + html + query);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const r = await page.evaluate(([v, px, py]) => {
  window.__view(...v);
  const T = window.__THREE, eng = window.__eng, w = window.__world;
  const rc = new T.Raycaster();
  rc.setFromCamera(new T.Vector2(px / 1280 * 2 - 1, -(py / 720) * 2 + 1), eng.camera);
  const hits = rc.intersectObjects(w.group.children, true).slice(0, 4);
  return hits.map((h) => ({ d: h.distance.toFixed(2), type: h.object.type, geo: h.object.geometry?.type, verts: h.object.geometry?.attributes?.position?.count, pos: h.point.toArray().map((n) => +n.toFixed(2)), mat: h.object.material?.type, y: h.object.position.toArray() }));
}, [JSON.parse(viewJson), Number(px), Number(py)]);
console.log(JSON.stringify(r, null, 1));
await browser.close();
