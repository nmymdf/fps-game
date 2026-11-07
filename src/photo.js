// 照片材質：把實拍／高畫質圖片變成遊戲材質（顏色 + 由亮度推出的凹凸），以及精靈圖（敵人／道具）
import * as THREE from 'three';
import wallBrick from './img/wall_brick.jpg';
import wallBrick2 from './img/wall_brick2.jpg';
import wallStone from './img/wall_stone.jpg';
import wallMarble from './img/wall_marble.jpg';
import floorHex from './img/floor_hex.jpg';
import floorCobble from './img/floor_cobble.jpg';
import ceilBeams from './img/ceil_beams.jpg';
import doorWood from './img/door_wood.jpg';
import doorIron from './img/door_iron.jpg';
import doorExit from './img/door_exit.jpg';
const SPRITES = {};
import gF from './img/guard_front.webp'; import gB from './img/guard_back.webp'; import gS from './img/guard_side.webp'; import gX from './img/guard_fire.webp'; import gD from './img/guard_dead.webp';
import oF from './img/officer_front.webp'; import oB from './img/officer_back.webp'; import oS from './img/officer_side.webp'; import oX from './img/officer_fire.webp'; import oD from './img/officer_dead.webp';
import hF from './img/heavy_front.webp'; import hB from './img/heavy_back.webp'; import hS from './img/heavy_side.webp'; import hX from './img/heavy_fire.webp'; import hD from './img/heavy_dead.webp';
import iAmmo from './img/item_ammo.webp'; import iCup from './img/item_cup.webp'; import iFood from './img/item_food.webp'; import iKg from './img/item_key_gold.webp'; import iKs from './img/item_key_silver.webp'; import iMed from './img/item_medkit.webp';
Object.assign(SPRITES, { heavy_front: hF, heavy_back: hB, heavy_side: hS, heavy_fire: hX, heavy_dead: hD, guard_front: gF, guard_back: gB, guard_side: gS, guard_fire: gX, guard_dead: gD, officer_front: oF, officer_back: oB, officer_side: oS, officer_fire: oX, officer_dead: oD, item_ammo: iAmmo, item_cup: iCup, item_food: iFood, item_key_gold: iKg, item_key_silver: iKs, item_medkit: iMed });

const SRC = { brick: wallBrick, brick2: wallBrick2, stone: wallStone, marble: wallMarble, floorHex, floorCobble, ceil: ceilBeams, doorWood, doorIron, doorExit };
const canv = {}, imgs = {};
const loadImg = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
export function loadPhotos() {
  return Promise.all([
    ...Object.entries(SRC).map(([k, url]) => loadImg(url).then((im) => { if (!im) return; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); canv[k] = c; })),
    ...Object.entries(SPRITES).map(([k, url]) => loadImg(url).then((im) => { if (im) imgs[k] = im; })),
  ]);
}
export const hasPhoto = (k) => !!canv[k];
const texCache = {};
// 精靈貼圖（透明背景）
export function spriteTex(k) {
  if (texCache[k]) return texCache[k]; const im = imgs[k]; if (!im) return null;
  const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  t.userData = { w: im.naturalWidth, h: im.naturalHeight }; return (texCache[k] = t);
}
const boxCache = {};
// 精靈圖不透明區域的範圍（0~1），用來把「看得到的人」對齊到實際身高
export function spriteBox(k) {
  if (boxCache[k]) return boxCache[k]; const im = imgs[k]; if (!im) return [0, 0, 1, 1];
  const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, w, h).data; let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let j = 0; j < h; j += 2) for (let i = 0; i < w; i += 2) if (d[(j * w + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  return (boxCache[k] = [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h]);
}
export const spriteSize = (k) => imgs[k] ? [imgs[k].naturalWidth, imgs[k].naturalHeight] : [1, 1];

// 調色：乘上色彩、亮度；回傳新畫布
function tinted(src, mul, bright = 1, size = 1024, keepAspect = false) {
  const W = keepAspect ? Math.min(size, src.width) : size, H = keepAspect ? Math.round(W * src.height / src.width) : size;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.drawImage(src, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), a = d.data;
  for (let i = 0; i < a.length; i += 4) { a[i] = Math.min(255, a[i] * mul[0] * bright); a[i + 1] = Math.min(255, a[i + 1] * mul[1] * bright); a[i + 2] = Math.min(255, a[i + 2] * mul[2] * bright); }
  x.putImageData(d, 0, 0); return c;
}
function heightNormal(c, str) {
  const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data, h = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) h[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H; const nx = nc.getContext('2d'), ni = nx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xl = (x - 1 + W) % W, xr = (x + 1) % W, yu = (y - 1 + H) % H, yd = (y + 1) % H;
    const dx = (h[y * W + xr] - h[y * W + xl]) * str, dy = (h[yd * W + x] - h[yu * W + x]) * str, l = Math.sqrt(dx * dx + dy * dy + 1), i = (y * W + x) * 4;
    ni.data[i] = (-dx / l * 0.5 + 0.5) * 255; ni.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; ni.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; ni.data[i + 3] = 255;
  }
  nx.putImageData(ni, 0, 0); return nc;
}
export function photoSet(key, o = {}) {
  const base = canv[key]; if (!base) return null;
  const size = o.size || 1024;
  const c = tinted(base, o.mul || [1, 1, 1], o.bright ?? 1, size, !!o.aspect);
  if (o.plate) plate(c, o.plate);
  const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = o.aspect ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t; };
  const nc = heightNormal(c, o.normal ?? 2.2);
  return { map: mk(c, true), normal: mk(nc, false), emissive: null, rough: o.rough ?? 0.88, nstr: o.nstr ?? 1.0 };
}

// 門中央的鑰匙孔金屬牌（金／銀門）
function plate(c, kind) {
  const x = c.getContext('2d'), W = c.width, H = c.height, cx = W / 2, cy = H * 0.5, r = W * 0.13;
  const col = kind === 'gold' ? ['#fff0a8', '#e0a820', '#7a4e08'] : ['#ffffff', '#c4ccd8', '#58606c'];
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r * 1.1); g.addColorStop(0, col[0]); g.addColorStop(0.55, col[1]); g.addColorStop(1, col[2]);
  x.save(); x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = r * 0.35; x.shadowOffsetY = r * 0.12;
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = g; x.fill(); x.restore();
  x.lineWidth = r * 0.12; x.strokeStyle = col[2]; x.beginPath(); x.arc(cx, cy, r * 0.92, 0, 7); x.stroke();
  x.fillStyle = '#1a0f06'; x.beginPath(); x.arc(cx, cy - r * 0.18, r * 0.2, 0, 7); x.fill();
  x.beginPath(); x.moveTo(cx - r * 0.1, cy - r * 0.1); x.lineTo(cx + r * 0.1, cy - r * 0.1); x.lineTo(cx + r * 0.16, cy + r * 0.5); x.lineTo(cx - r * 0.16, cy + r * 0.5); x.fill();
}
