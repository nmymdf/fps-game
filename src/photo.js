// 照片材質：把實拍／高畫質圖片變成遊戲材質（顏色 + 由亮度推出的凹凸）
import * as THREE from 'three';
import wallBrick from './img/wall_brick.jpg';
import wallStone from './img/wall_stone.jpg';
import floorHex from './img/floor_hex.jpg';
import doorImg from './img/door.jpg';

const SRC = { brick: wallBrick, stone: wallStone, floorHex, door: doorImg };
const canv = {};
export function loadPhotos() {
  return Promise.all(Object.entries(SRC).map(([k, url]) => new Promise((res) => {
    const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); canv[k] = c; res(); };
    im.onerror = () => res(); im.src = url;
  })));
}
export const hasPhoto = (k) => !!canv[k];

// 調色：乘上色彩、亮度；回傳新畫布
function tinted(src, mul, bright = 1, size = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.drawImage(src, 0, 0, size, size);
  const d = x.getImageData(0, 0, size, size), a = d.data;
  for (let i = 0; i < a.length; i += 4) { a[i] = Math.min(255, a[i] * mul[0] * bright); a[i + 1] = Math.min(255, a[i + 1] * mul[1] * bright); a[i + 2] = Math.min(255, a[i + 2] * mul[2] * bright); }
  x.putImageData(d, 0, 0); return c;
}
function heightNormal(c, str) {
  const s = c.width, d = c.getContext('2d').getImageData(0, 0, s, s).data, h = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) h[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const nc = document.createElement('canvas'); nc.width = nc.height = s; const nx = nc.getContext('2d'), ni = nx.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const xl = (x - 1 + s) % s, xr = (x + 1) % s, yu = (y - 1 + s) % s, yd = (y + 1) % s;
    const dx = (h[y * s + xr] - h[y * s + xl]) * str, dy = (h[yd * s + x] - h[yu * s + x]) * str, l = Math.sqrt(dx * dx + dy * dy + 1), i = (y * s + x) * 4;
    ni.data[i] = (-dx / l * 0.5 + 0.5) * 255; ni.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; ni.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; ni.data[i + 3] = 255;
  }
  nx.putImageData(ni, 0, 0); return nc;
}
export function photoSet(key, o = {}) {
  const base = canv[key]; if (!base) return null;
  const size = o.size || 1024;
  const c = tinted(base, o.mul || [1, 1, 1], o.bright ?? 1, size);
  const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t; };
  const nc = heightNormal(c, o.normal ?? 2.2);
  return { map: mk(c, true), normal: mk(nc, false), emissive: null, rough: o.rough ?? 0.88, nstr: o.nstr ?? 1.0 };
}
