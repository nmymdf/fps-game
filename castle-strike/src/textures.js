import * as THREE from 'three';

let ANISO = 8;
let TEXN = 1024;
export function setTexSize(n) { TEXN = n; }
export function setAniso(a) { ANISO = a; }

// ---------- 雜訊 ----------
function hash2(ix, iy, s) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(s | 0, 1013904223)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, per, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const xa = ((x0 % per) + per) % per, xb = (xa + 1) % per;
  const ya = ((y0 % per) + per) % per, yb = (ya + 1) % per;
  const a = hash2(xa, ya, s), b = hash2(xb, ya, s), c = hash2(xa, yb, s), d = hash2(xb, yb, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(u, v, f, oct, s) {
  let a = 0, amp = 0.5, t = 0, fr = f;
  for (let o = 0; o < oct; o++) { a += amp * vnoise(u * fr, v * fr, fr, s + o * 17); t += amp; amp *= 0.5; fr *= 2; }
  return a / t;
}
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

const B = { row: 0, col: 0, e: 0, fu: 0, fv: 0 };
function brick(u, v, rows, cols, stagger = 0.5) {
  const fr = v * rows, row = Math.floor(fr), fv = fr - row;
  const off = (((row % 2) + 2) % 2) * stagger;
  const fc = u * cols + off, col = Math.floor(fc), fu = fc - col;
  const du = Math.min(fu, 1 - fu) / cols, dv = Math.min(fv, 1 - fv) / rows;
  B.row = row; B.col = ((col % cols) + cols) % cols; B.e = Math.min(du, dv); B.fu = fu; B.fv = fv;
  return B;
}
const C = { f1: 0, f2: 0, id: 0 };
function cellular(u, v, n, s) {
  const x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy;
    const wx = ((cx % n) + n) % n, wy = ((cy % n) + n) % n;
    const px = cx + hash2(wx, wy, s) * 0.8 + 0.1, py = cy + hash2(wx, wy, s + 11) * 0.8 + 0.1;
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < f1) { f2 = f1; f1 = d; id = hash2(wx, wy, s + 5); } else if (d < f2) f2 = d;
  }
  C.f1 = Math.sqrt(f1); C.f2 = Math.sqrt(f2); C.id = id;
  return C;
}

// ---------- 貼圖組合：顏色 + 凹凸 -> 法線 ----------
function makeSet(size, shader, o = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const hb = new Float32Array(size * size);
  let ec = null, eimg = null, ectx = null;
  if (o.emissive) {
    ec = document.createElement('canvas'); ec.width = ec.height = size;
    ectx = ec.getContext('2d'); eimg = ectx.createImageData(size, size);
  }
  const out = { r: 0, g: 0, b: 0, h: 0.5, er: 0, eg: 0, eb: 0 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      out.er = out.eg = out.eb = 0; out.h = 0.5;
      shader((x + 0.5) / size, (y + 0.5) / size, out);
      const i = (y * size + x) * 4;
      img.data[i] = clamp(out.r, 0, 255); img.data[i + 1] = clamp(out.g, 0, 255); img.data[i + 2] = clamp(out.b, 0, 255); img.data[i + 3] = 255;
      hb[y * size + x] = out.h;
      if (eimg) { eimg.data[i] = clamp(out.er, 0, 255); eimg.data[i + 1] = clamp(out.eg, 0, 255); eimg.data[i + 2] = clamp(out.eb, 0, 255); eimg.data[i + 3] = 255; }
    }
  }
  ctx.putImageData(img, 0, 0);
  if (ectx) ectx.putImageData(eimg, 0, 0);
  const nc = document.createElement('canvas'); nc.width = nc.height = size;
  const nctx = nc.getContext('2d'); const nimg = nctx.createImageData(size, size);
  const str = (o.normal ?? 3) * size / 128;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = (x - 1 + size) % size, xr = (x + 1) % size, yu = (y - 1 + size) % size, yd = (y + 1) % size;
    const dx = (hb[y * size + xr] - hb[y * size + xl]) * str;
    const dy = (hb[yd * size + x] - hb[yu * size + x]) * str;
    const len = Math.sqrt(dx * dx + dy * dy + 1);
    const i = (y * size + x) * 4;
    nimg.data[i] = (-dx / len * 0.5 + 0.5) * 255;
    nimg.data[i + 1] = (dy / len * 0.5 + 0.5) * 255; // three.js: +Y up in tangent space; canvas y goes down
    nimg.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; nimg.data[i + 3] = 255;
  }
  nctx.putImageData(nimg, 0, 0);
  const tex = (cv, srgb) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  };
  return { map: tex(c, true), normal: tex(nc, false), emissive: ec ? tex(ec, true) : null, rough: o.rough ?? 0.9, nstr: o.nstr ?? 1.0 };
}

// ---------- 牆面 ----------
function stoneWall(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const b = brick(u, v, o.rows, o.cols, 0.5);
    const id = hash2(b.col, b.row, seed), id2 = hash2(b.col, b.row, seed + 9);
    const g = fbm(u, v, 8, 4, seed) * 0.55 + fbm(u, v, 40, 2, seed + 3) * 0.45;
    const edge = smooth(b.e, 0.0035, o.bevel ?? 0.016);
    let k = 0.82 + (id - 0.5) * 0.42 + (g - 0.5) * 0.55;
    k *= 0.55 + 0.45 * edge;
    let r = o.base[0] * k, gg = o.base[1] * k, bl = o.base[2] * k;
    r += (id2 - 0.5) * 18; bl -= (id2 - 0.5) * 12;
    if (o.moss) {
      const m = smooth(fbm(u, v, 5, 3, seed + 21) + (v > 0.5 ? (v - 0.5) * 0.9 : 0) - 0.35, 0.18, 0.55) * o.moss;
      r = mix(r, 52 * k, m); gg = mix(gg, 98 * k, m); bl = mix(bl, 40 * k, m);
    }
    const mort = 1 - smooth(b.e, 0.0018, 0.0055);
    if (mort > 0) {
      const mk = 0.5 + 0.2 * fbm(u, v, 64, 2, seed + 4);
      r = mix(r, o.mortar[0] * mk, mort); gg = mix(gg, o.mortar[1] * mk, mort); bl = mix(bl, o.mortar[2] * mk, mort);
    }
    out.r = r; out.g = gg; out.b = bl;
    out.h = edge * 0.7 + g * 0.3 - mort * 0.4;
  }, { normal: 5 });
}
function roughStone(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const c = cellular(u, v, o.n, seed);
    const edge = smooth(c.f2 - c.f1, 0.02, 0.11);
    const g = fbm(u, v, 12, 4, seed + 2);
    let k = 0.8 + (c.id - 0.5) * 0.5 + (g - 0.5) * 0.6;
    k *= 0.45 + 0.55 * edge;
    let r = o.base[0] * k, gg = o.base[1] * k, bl = o.base[2] * k;
    if (o.moss) {
      const m = smooth(fbm(u, v, 4, 3, seed + 8) + (v - 0.5) * 0.7 - 0.3, 0.15, 0.55) * o.moss;
      r = mix(r, 48 * k, m); gg = mix(gg, 92 * k, m); bl = mix(bl, 38 * k, m);
    }
    out.r = r; out.g = gg; out.b = bl;
    out.h = edge * 0.8 + g * 0.35;
  }, { normal: 6 });
}
function woodGrain(u, v, along, seed, scale = 1) {
  // along: 0 = grain along v (vertical planks), 1 = along u
  const a = along ? u : v, b = along ? v : u;
  const w = fbm(b * 28 * scale, a * 2.2 * scale, 8, 3, seed);
  const ring = Math.sin((b * 40 + w * 6) * Math.PI) * 0.5 + 0.5;
  return 0.55 + 0.25 * w + 0.2 * ring;
}
function hallWall(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const split = 0.64;
    if (v < split - 0.035) {
      const b = brick(u, v / (split - 0.035), 5, 3, 0.5);
      const id = hash2(b.col, b.row, seed);
      const g = fbm(u, v, 10, 4, seed);
      const edge = smooth(b.e, 0.002, 0.012);
      let k = 0.85 + (id - 0.5) * 0.3 + (g - 0.5) * 0.4;
      k *= 0.55 + 0.45 * edge;
      out.r = o.stone[0] * k; out.g = o.stone[1] * k; out.b = o.stone[2] * k;
      out.h = edge * 0.6 + g * 0.2;
    } else if (v < split) {
      const t = (v - (split - 0.035)) / 0.035;
      const gl = 0.7 + 0.3 * Math.sin(t * Math.PI);
      out.r = 205 * gl; out.g = 160 * gl; out.b = 62 * gl;
      out.h = 0.9 + 0.1 * Math.sin(t * Math.PI);
    } else {
      const vv = (v - split) / (1 - split);
      const col = Math.floor(u * 3), fu = u * 3 - col;
      const inset = Math.min(fu, 1 - fu) < 0.1 || vv < 0.06 || vv > 0.94;
      const innerEdge = Math.min(Math.min(fu, 1 - fu) - 0.1, Math.min(vv - 0.06, 0.94 - vv) * 0.8);
      const gr = woodGrain(u, v, 0, seed + col, 1);
      let k = (inset ? 0.55 : 0.85) * gr + 0.05;
      k *= 0.7 + 0.3 * smooth(innerEdge, 0, 0.06);
      out.r = o.wood[0] * k * 1.4; out.g = o.wood[1] * k * 1.4; out.b = o.wood[2] * k * 1.4;
      out.h = (inset ? 0.35 : 0.6) + 0.1 * gr;
    }
  }, { normal: 4 });
}
function bookshelf(o) {
  const seed = o.seed;
  const rows = 5;
  const palette = [[122, 28, 32], [30, 72, 52], [28, 44, 94], [160, 112, 38], [86, 46, 30], [110, 40, 80], [38, 84, 98], [150, 130, 96]];
  return makeSet(TEXN, (u, v, out) => {
    const frameW = 0.045;
    if (u < frameW || u > 1 - frameW || v < 0.03 || v > 0.97) {
      const gr = woodGrain(u, v, u < frameW || u > 1 - frameW ? 0 : 1, seed + 3);
      out.r = 78 * gr * 1.3; out.g = 46 * gr * 1.3; out.b = 28 * gr * 1.3; out.h = 0.75; return;
    }
    const rv = (v - 0.03) / 0.94 * rows, row = Math.floor(rv), fv = rv - row;
    if (fv > 0.93) { // 層板
      const gr = woodGrain(u, v, 1, seed + 4);
      out.r = 96 * gr * 1.3; out.g = 58 * gr * 1.3; out.b = 34 * gr * 1.3; out.h = 0.7; return;
    }
    const back = 0.18 + 0.1 * fbm(u, v, 20, 2, seed);
    out.r = 40 * back * 3; out.g = 24 * back * 3; out.b = 16 * back * 3; out.h = 0.1;
    // 書本：沿 u 切成寬度不一的書脊
    let x = (u - frameW) / (1 - 2 * frameW) * 24 + hash2(row, 7, seed) * 5;
    let acc = 0, bi = 0;
    for (let k = 0; k < 60; k++) {
      const w = 0.55 + hash2(row, k, seed + 1) * 0.9;
      if (x < acc + w) { bi = k; break; }
      acc += w;
      if (k === 59) bi = 59;
    }
    const w = 0.55 + hash2(row, bi, seed + 1) * 0.9;
    const fu = (x - acc) / w;
    const ht = 0.62 + hash2(row, bi, seed + 2) * 0.33;
    const empty = hash2(row, bi, seed + 6) < 0.07;
    if (!empty && (1 - fv / 0.93) < ht + 0.0 && fu > 0.04 && fu < 0.96) {
      const topY = fv / 0.93; // 0 頂 1 底
      if (topY > 1 - ht) {
        const pal = palette[Math.floor(hash2(row, bi, seed + 3) * palette.length)];
        const sh = 0.55 + 0.6 * Math.sin(fu * Math.PI);
        let k = sh * (0.85 + 0.25 * hash2(row, bi, seed + 4));
        let r = pal[0] * k, g = pal[1] * k, b = pal[2] * k;
        const by = (topY - (1 - ht)) / ht;
        if ((by > 0.12 && by < 0.17) || (by > 0.78 && by < 0.83)) { r = 200 * sh; g = 160 * sh; b = 70 * sh; }
        if (by > 0.32 && by < 0.55 && fu > 0.25 && fu < 0.75 && hash2(row, bi, seed + 7) < 0.7) { r = mix(r, 215, 0.55); g = mix(g, 190, 0.55); b = mix(b, 140, 0.55); }
        out.r = r; out.g = g; out.b = b; out.h = 0.55 + 0.25 * Math.sin(fu * Math.PI);
      }
    }
  }, { normal: 5 });
}
function woodPanel(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const plank = Math.floor(u * 6), fu = u * 6 - plank;
    const gr = woodGrain(u, v, 0, seed + plank * 7, 1);
    let k = 0.7 + 0.5 * (gr - 0.5) + (hash2(plank, 1, seed) - 0.5) * 0.25;
    const joint = smooth(Math.min(fu, 1 - fu), 0.0, 0.05);
    k *= 0.5 + 0.5 * joint;
    // 嵌板框
    const fx = Math.abs(u - 0.5), fy = Math.abs(v - 0.5);
    const frame = Math.max(fx, fy);
    let r = o.wood[0] * k * 1.5, g = o.wood[1] * k * 1.5, b = o.wood[2] * k * 1.5;
    let h = 0.5 + 0.12 * gr - (1 - joint) * 0.2;
    if (frame > 0.40 && frame < 0.43) { r = 210; g = 165; b = 70; h = 0.9; }
    if (frame > 0.43) { k *= 0.78; r *= 0.78; g *= 0.78; b *= 0.78; h -= 0.15; }
    out.r = r; out.g = g; out.b = b; out.h = h;
  }, { normal: 4 });
}
function cellarBrick(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const b = brick(u, v, 14, 6, 0.5);
    const id = hash2(b.col, b.row, seed);
    const g = fbm(u, v, 12, 4, seed);
    const edge = smooth(b.e, 0.002, 0.009);
    let k = 0.85 + (id - 0.5) * 0.5 + (g - 0.5) * 0.5;
    k *= 0.5 + 0.5 * edge;
    let r = o.base[0] * k, gg = o.base[1] * k, bl = o.base[2] * k;
    const soot = smooth(fbm(u, v, 3, 3, seed + 5) - 0.2 + (1 - v) * 0.2, 0.2, 0.7);
    r *= 1 - soot * 0.45; gg *= 1 - soot * 0.4; bl *= 1 - soot * 0.35;
    const m = smooth(fbm(u, v, 6, 3, seed + 21) + (v - 0.5) * 0.9 - 0.45, 0.1, 0.5) * 0.8;
    r = mix(r, 40 * k, m); gg = mix(gg, 80 * k, m); bl = mix(bl, 36 * k, m);
    const mort = 1 - smooth(b.e, 0.0012, 0.004);
    r = mix(r, 70, mort * 0.8); gg = mix(gg, 64, mort * 0.8); bl = mix(bl, 60, mort * 0.8);
    out.r = r; out.g = gg; out.b = bl; out.h = edge * 0.7 + g * 0.3 - mort * 0.3;
  }, { normal: 5 });
}
function marble(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const sx = 2, sy = 2;
    const fu = (u * sx) % 1, fv = (v * sy) % 1;
    const gap = smooth(Math.min(fu, 1 - fu) / sx, 0.0008, 0.004) * smooth(Math.min(fv, 1 - fv) / sy, 0.0008, 0.004);
    const w = fbm(u, v, 4, 4, seed);
    const vein = Math.abs(Math.sin((u * 3 + v * 2 + w * 3.2) * Math.PI));
    const vein2 = Math.abs(Math.sin((u * 5 - v * 3 + w * 5) * Math.PI));
    const vv = smooth(1 - vein, 0.86, 1) * 0.5 + smooth(1 - vein2, 0.92, 1) * 0.3;
    const cloud = fbm(u, v, 6, 4, seed + 4);
    let k = (o.light ? 0.92 : 0.38) + (cloud - 0.5) * 0.25;
    let r = o.base[0] * k, g = o.base[1] * k, b = o.base[2] * k;
    r = mix(r, o.vein[0], vv); g = mix(g, o.vein[1], vv); b = mix(b, o.vein[2], vv);
    r *= 0.5 + 0.5 * gap; g *= 0.5 + 0.5 * gap; b *= 0.5 + 0.5 * gap;
    // 金色腰線
    if (v > 0.70 && v < 0.725) { r = 214; g = 172; b = 70; }
    out.r = r; out.g = g; out.b = b; out.h = 0.5 + 0.1 * cloud + 0.2 * gap + ((v > 0.70 && v < 0.725) ? 0.2 : 0);
  }, { normal: 2, rough: 0.35 });
}
function damask(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const split = 0.7;
    if (v < split) {
      const a = (u * 4) % 1, b2 = (v / split * 5) % 1;
      const dx = Math.abs(a - 0.5), dy = Math.abs(b2 - 0.5);
      const diamond = dx + dy;
      const motif = smooth(0.3, diamond, diamond + 0.02) - smooth(0.2, diamond, diamond + 0.02) * 0.0;
      const ring = Math.abs(diamond - 0.36) < 0.025 ? 1 : 0;
      const dot = (dx * dx + dy * dy) < 0.0035 ? 1 : 0;
      const n = fbm(u, v, 24, 2, seed);
      let k = 0.75 + (n - 0.5) * 0.35;
      let r = o.base[0] * k, g = o.base[1] * k, bl = o.base[2] * k;
      if (ring || dot) { r = mix(r, 200, 0.6); g = mix(g, 156, 0.6); bl = mix(bl, 62, 0.6); }
      else if (diamond < 0.3) { r *= 1.18; g *= 1.12; bl *= 1.12; }
      out.r = r; out.g = g; out.b = bl; out.h = 0.5 + (ring || dot ? 0.15 : 0) + n * 0.1;
    } else if (v < split + 0.03) {
      out.r = 210; out.g = 165; out.b = 66; out.h = 0.9;
    } else {
      const vv = (v - split) / (1 - split);
      const col = Math.floor(u * 3), fu = u * 3 - col;
      const inset = Math.min(fu, 1 - fu) < 0.1 || vv < 0.08 || vv > 0.92;
      const gr = woodGrain(u, v, 0, seed + col);
      const k = (inset ? 0.5 : 0.8) * gr + 0.05;
      out.r = 70 * k * 1.5; out.g = 40 * k * 1.5; out.b = 28 * k * 1.5; out.h = inset ? 0.3 : 0.55;
    }
  }, { normal: 3, rough: 0.7 });
}
function windowWall(o) {
  const seed = o.seed;
  const pal = [[40, 90, 190], [220, 150, 40], [190, 40, 50], [50, 150, 90], [120, 60, 170], [230, 200, 90]];
  return makeSet(TEXN, (u, v, out) => {
    // 石牆底
    const b = brick(u, v, 8, 4, 0.5);
    const id = hash2(b.col, b.row, seed);
    const g = fbm(u, v, 10, 4, seed);
    const edge = smooth(b.e, 0.0035, 0.015);
    let k = (0.82 + (id - 0.5) * 0.35 + (g - 0.5) * 0.5) * (0.55 + 0.45 * edge);
    out.r = o.base[0] * k; out.g = o.base[1] * k; out.b = o.base[2] * k; out.h = edge * 0.6 + g * 0.2;
    // 拱窗
    const cx = 0.5, r0 = 0.2, top = 0.36, bot = 0.9;
    const dx = u - cx;
    let inside = false, frame = false;
    const arcD = Math.sqrt(dx * dx + (v - top) * (v - top));
    if (v >= top && v <= bot && Math.abs(dx) <= r0) inside = true;
    else if (v < top && arcD <= r0) inside = true;
    if (!inside) {
      const fr = 0.035;
      if (v >= top && v <= bot + 0.03 && Math.abs(dx) <= r0 + fr) frame = true;
      else if (v < top && arcD <= r0 + fr) frame = true;
    }
    if (frame) { const kk = 0.95 + 0.2 * Math.sin(u * 40); out.r = 150 * kk; out.g = 146 * kk; out.b = 140 * kk; out.h = 0.85; }
    if (v > bot && v < bot + 0.05 && Math.abs(dx) < r0 + 0.07) { out.r = 140; out.g = 136; out.b = 130; out.h = 0.9; }
    if (inside) {
      // 菱形鉛條格
      const gu = (u + v) * 9, gv = (u - v) * 9;
      const fu = gu - Math.floor(gu), fv = gv - Math.floor(gv);
      const lead = Math.min(fu, 1 - fu, fv, 1 - fv) < 0.07 ? 1 : 0;
      const cid = hash2(Math.floor(gu), Math.floor(gv), seed + 2);
      const p = pal[Math.floor(cid * pal.length)];
      const cen = 0.65 + 0.35 * (1 - Math.max(Math.abs(fu - 0.5), Math.abs(fv - 0.5)) * 2);
      if (lead || Math.abs(dx) < 0.006) { out.r = 22; out.g = 22; out.b = 26; out.h = 0.8; }
      else {
        out.r = p[0] * 0.55; out.g = p[1] * 0.55; out.b = p[2] * 0.55; out.h = 0.45;
        out.er = p[0] * cen * 1.3; out.eg = p[1] * cen * 1.3; out.eb = p[2] * cen * 1.3;
      }
    }
  }, { normal: 4, emissive: true });
}
function doorTex(kind) {
  const seed = kind === 'gold' ? 61 : kind === 'silver' ? 62 : 60;
  const metal = kind === 'gold' ? [214, 172, 66] : kind === 'silver' ? [200, 206, 216] : [58, 58, 64];
  return makeSet(TEXN, (u, v, out) => {
    const plank = Math.floor(u * 5), fu = u * 5 - plank;
    const gr = woodGrain(u, v, 0, seed + plank * 3);
    let k = 0.55 + 0.5 * (gr - 0.5) + (hash2(plank, 2, seed) - 0.5) * 0.22;
    const joint = smooth(Math.min(fu, 1 - fu), 0, 0.04);
    k *= 0.45 + 0.55 * joint;
    let r = 92 * k * 1.4, g = 58 * k * 1.4, b = 36 * k * 1.4, h = 0.5 + 0.1 * gr - (1 - joint) * 0.2;
    const frame = Math.min(u, 1 - u, v, 1 - v);
    if (frame < 0.05) { r *= 0.6; g *= 0.6; b *= 0.6; h = 0.75; }
    for (const by of [0.2, 0.8]) {
      if (Math.abs(v - by) < 0.035) {
        const sh = 0.8 + 0.2 * Math.sin((v - by) * 90);
        r = metal[0] * sh; g = metal[1] * sh; b = metal[2] * sh; h = 0.85;
        const rx = (u * 10) % 1;
        if (Math.abs(rx - 0.5) < 0.12 && Math.abs(v - by) < 0.015) { r *= 1.25; g *= 1.25; b *= 1.25; h = 1; }
      }
    }
    if (kind !== 'door') {
      const dx = u - 0.5, dy = v - 0.5;
      if (Math.abs(dx) < 0.13 && Math.abs(dy) < 0.16) {
        const sh = 0.85 + 0.25 * Math.sin(dx * 40);
        r = metal[0] * sh; g = metal[1] * sh; b = metal[2] * sh; h = 0.95;
        if (dx * dx * 5 + (dy + 0.02) * (dy + 0.02) * 1.2 < 0.0032 || (Math.abs(dx) < 0.012 && dy > 0 && dy < 0.08)) { r = 12; g = 10; b = 10; h = 0.2; }
      }
    } else {
      const dx = u - 0.88, dy = v - 0.52;
      if (dx * dx + dy * dy < 0.0016) { r = 168; g = 150; b = 100; h = 0.95; }
    }
    out.r = r; out.g = g; out.b = b; out.h = h;
  }, { normal: 4, rough: 0.7 });
}
function exitTex(o) {
  const c = document.createElement('canvas'); c.width = c.height = TEXN;
  const ctx = c.getContext('2d');
  const set = makeSet(TEXN, (u, v, out) => {
    const n = fbm(u * 6, v * 0.4, 6, 3, 90);
    let k = 0.62 + 0.18 * n + 0.1 * Math.sin(u * 3.14);
    const seam = Math.abs(u - 0.5);
    if (seam < 0.006) k = 0.15;
    else if (seam < 0.02) k *= 0.8;
    const panel = (v > 0.1 && v < 0.93) && (Math.abs(seam - 0.25) < 0.2) ? 0.9 : 1;
    const frame = Math.min(u, 1 - u, v, 1 - v);
    if (frame < 0.035) k *= 0.55;
    let r = 150 * k * panel, g = 156 * k * panel, b = 166 * k * panel;
    let er = 0, eg = 0, eb = 0;
    // 上方綠色燈條
    if (v > 0.04 && v < 0.13 && u > 0.2 && u < 0.8) {
      r = 30; g = 160; b = 80; er = 70; eg = 255; eb = 140;
    }
    // 箭頭
    const ax = (u - 0.5) * 2, ay = (v - 0.5);
    const arrow = (ay > -0.12 && ay < 0.12 && Math.abs(ax) < 0.12) || (ay >= 0.12 && ay < 0.30 && Math.abs(ax) < (0.30 - ay) * 1.0 + 0.0);
    if (v > 0.38 && v < 0.70 && arrow) { r = 40; g = 190; b = 100; er = 40; eg = 220; eb = 110; }
    out.r = r; out.g = g; out.b = b; out.er = er; out.eg = eg; out.eb = eb;
    out.h = 0.5 + 0.05 * n - (seam < 0.006 ? 0.3 : 0);
  }, { normal: 3, emissive: true, rough: 0.35 });
  return set;
}

// ---------- 地板 / 天花板 ----------
function flagFloor(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const b = brick(u, v, 3, 3, 0.5);
    const id = hash2(b.col, b.row, seed);
    const g = fbm(u, v, 10, 5, seed);
    const edge = smooth(b.e, 0.004, 0.016);
    let k = (0.82 + (id - 0.5) * 0.4 + (g - 0.5) * 0.6) * (0.5 + 0.5 * edge);
    const wear = smooth(fbm(u, v, 3, 3, seed + 6), 0.45, 0.8);
    k *= 1 - wear * 0.18;
    out.r = o.base[0] * k; out.g = o.base[1] * k; out.b = o.base[2] * k; out.h = edge * 0.7 + g * 0.3;
  }, { normal: 4, rough: 0.8 });
}
function cobbleFloor(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const c = cellular(u, v, 7, seed);
    const edge = smooth(c.f2 - c.f1, 0.01, 0.07);
    const g = fbm(u, v, 14, 4, seed + 1);
    let k = (0.8 + (c.id - 0.5) * 0.55 + (g - 0.5) * 0.5) * (0.4 + 0.6 * edge);
    out.r = o.base[0] * k; out.g = o.base[1] * k; out.b = o.base[2] * k; out.h = edge * 0.9 + g * 0.2;
  }, { normal: 7, rough: 0.85 });
}
function parquet(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const bx = Math.floor(u * 4), by = Math.floor(v * 4);
    const fu = u * 4 - bx, fv = v * 4 - by;
    const horiz = (bx + by) % 2 === 0;
    const pl = horiz ? Math.floor(fv * 4) : Math.floor(fu * 4);
    const pf = horiz ? fv * 4 - pl : fu * 4 - pl;
    const gr = horiz ? woodGrain(fu, fv, 1, seed + bx * 5 + by * 3 + pl, 1.4) : woodGrain(fu, fv, 0, seed + bx * 5 + by * 3 + pl, 1.4);
    const joint = smooth(Math.min(pf, 1 - pf), 0, 0.07);
    const tone = 0.75 + (hash2(bx * 4 + pl, by, seed) - 0.5) * 0.35;
    let k = (0.6 + 0.6 * (gr - 0.5)) * tone * (0.5 + 0.5 * joint);
    const blockEdge = Math.min(Math.min(fu, 1 - fu), Math.min(fv, 1 - fv));
    k *= 0.65 + 0.35 * smooth(blockEdge, 0, 0.03);
    out.r = o.base[0] * k * 1.5; out.g = o.base[1] * k * 1.5; out.b = o.base[2] * k * 1.5; out.h = joint * 0.6 + gr * 0.2;
  }, { normal: 3, rough: 0.5 });
}
function checkerMarble(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const cx = Math.floor(u * 2), cy = Math.floor(v * 2);
    const dark = (cx + cy) % 2 === 1;
    const fu = (u * 2) % 1, fv = (v * 2) % 1;
    const gap = smooth(Math.min(fu, 1 - fu, fv, 1 - fv), 0.0, 0.012);
    const w = fbm(u, v, 4, 4, seed + cx * 3 + cy);
    const vein = smooth(1 - Math.abs(Math.sin((u * 5 + v * 3 + w * 4) * Math.PI)), 0.9, 1) * 0.5;
    const base = dark ? o.dark : o.light;
    let k = 0.88 + (w - 0.5) * 0.3;
    let r = base[0] * k, g = base[1] * k, b = base[2] * k;
    const vc = dark ? [190, 176, 150] : [140, 140, 150];
    r = mix(r, vc[0], vein); g = mix(g, vc[1], vein); b = mix(b, vc[2], vein);
    r *= 0.45 + 0.55 * gap; g *= 0.45 + 0.55 * gap; b *= 0.45 + 0.55 * gap;
    out.r = r; out.g = g; out.b = b; out.h = 0.5 + 0.1 * w + 0.3 * gap;
  }, { normal: 2, rough: 0.28 });
}
function carpet(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const a = (u * 4) % 1, b2 = (v * 4) % 1;
    const dx = Math.abs(a - 0.5), dy = Math.abs(b2 - 0.5);
    const d = dx + dy;
    const ring = Math.abs(d - 0.34) < 0.03 ? 1 : 0;
    const dot = dx * dx + dy * dy < 0.004 ? 1 : 0;
    const fibre = fbm(u, v, 96, 2, seed) * 0.3 + 0.85;
    let k = fibre * (d < 0.34 ? 1.12 : 0.9);
    let r = o.base[0] * k, g = o.base[1] * k, b = o.base[2] * k;
    if (ring || dot) { r = mix(r, o.trim[0], 0.7); g = mix(g, o.trim[1], 0.7); b = mix(b, o.trim[2], 0.7); }
    out.r = r; out.g = g; out.b = b; out.h = 0.5 + fibre * 0.2 + (ring || dot ? 0.1 : 0);
  }, { normal: 2, rough: 0.95 });
}
function ceilingPlaster(o) {
  const seed = o.seed;
  return makeSet(TEXN, (u, v, out) => {
    const g = fbm(u, v, 8, 5, seed);
    const beam = Math.min(Math.abs(u - 0.5), 0.5) > 0.4 || Math.min(Math.abs(v - 0.5), 0.5) > 0.4;
    let k = 0.7 + (g - 0.5) * 0.4;
    let r = o.base[0] * k, gg = o.base[1] * k, b = o.base[2] * k, h = g * 0.3;
    if (o.beams && beam) {
      const gr = woodGrain(u, v, Math.abs(u - 0.5) > 0.4 ? 0 : 1, seed + 4);
      r = 60 * gr * 1.3; gg = 36 * gr * 1.3; b = 24 * gr * 1.3; h = 0.7;
    }
    out.r = r; out.g = gg; out.b = b; out.h = h;
  }, { normal: 2, rough: 1 });
}

// ---------- 2D 畫的圖 ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = ANISO;
  return t;
}
export function bannerTex(c) {
  const cols = [['#7a1620', '#a8283a'], ['#14305e', '#2a58a0'], ['#1c4a2c', '#2f7c48']][c % 3];
  return canvasTex(256, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, cols[1]); g.addColorStop(1, cols[0]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, 0, 1 + Math.random() * 2, h); }
    ctx.strokeStyle = '#d6aa44'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.lineWidth = 2; ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.fillStyle = '#d6aa44';
    // 王冠
    ctx.beginPath(); ctx.moveTo(78, 230); ctx.lineTo(70, 150); ctx.lineTo(108, 190); ctx.lineTo(128, 130); ctx.lineTo(148, 190); ctx.lineTo(186, 150); ctx.lineTo(178, 230); ctx.closePath(); ctx.fill();
    ctx.fillRect(76, 232, 104, 18);
    ctx.fillStyle = cols[0]; for (const x of [100, 128, 156]) { ctx.beginPath(); ctx.arc(x, 241, 5, 0, 6.28); ctx.fill(); }
    // 交叉劍
    ctx.strokeStyle = '#e8d49a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(70, 290); ctx.lineTo(186, 410); ctx.moveTo(186, 290); ctx.lineTo(70, 410); ctx.stroke();
    ctx.strokeStyle = '#d6aa44'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(62, 304); ctx.lineTo(86, 280); ctx.moveTo(194, 304); ctx.lineTo(170, 280); ctx.stroke();
    // 流蘇
    ctx.fillStyle = '#d6aa44'; for (let x = 18; x < w - 10; x += 14) ctx.fillRect(x, h - 22, 6, 18);
  });
}
export function paintingTex(p) {
  return canvasTex(256, 256, (ctx, w, h) => {
    const skies = [['#f6c98a', '#b6c8e8'], ['#e9b3a0', '#7e9ccf'], ['#c8d8ee', '#f4e4c0'], ['#2c3a66', '#e8a860']][p % 4];
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, skies[1]); g.addColorStop(1, skies[0]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.beginPath(); ctx.arc(w * (0.3 + 0.1 * (p % 3)), h * 0.32, 20, 0, 6.28); ctx.fill();
    const hills = ['#6a7a90', '#4b6a58', '#33523e'];
    for (let l = 0; l < 3; l++) {
      ctx.fillStyle = hills[l]; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * (0.52 + l * 0.12) - Math.sin(x * 0.03 + l * 2 + p) * 22 - Math.sin(x * 0.011 + p) * 16);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#243a2a';
    for (let i = 0; i < 7; i++) { const x = 20 + i * 36 + (p * 13) % 20, y = h * 0.78 + (i % 2) * 10; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x - 11, y); ctx.lineTo(x + 11, y); ctx.fill(); }
  });
}
export function crossTex() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c42a2a'; ctx.fillRect(w * 0.4, h * 0.18, w * 0.2, h * 0.64); ctx.fillRect(w * 0.18, h * 0.4, w * 0.64, h * 0.2);
    ctx.strokeStyle = '#9a9a96'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, h - 4);
  });
}
function radial(size, stops) {
  return canvasTex(size, size, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (const [t, c] of stops) g.addColorStop(t, c);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}
let spriteCache = null;
export function sprites() {
  if (spriteCache) return spriteCache;
  spriteCache = {
    flame: canvasTex(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.62, w * 0.46);
      g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.25, 'rgba(255,200,90,0.95)'); g.addColorStop(0.6, 'rgba(255,110,30,0.45)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.save(); ctx.translate(w / 2, h * 0.6); ctx.scale(0.62, 1.15); ctx.translate(-w / 2, -h * 0.6); ctx.fillRect(0, 0, w, h); ctx.restore();
    }),
    glow: radial(128, [[0, 'rgba(255,255,255,0.9)'], [0.35, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]),
    blob: radial(128, [[0, 'rgba(0,0,0,0.65)'], [0.6, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]),
    dust: radial(32, [[0, 'rgba(255,240,210,1)'], [1, 'rgba(255,240,210,0)']]),
    beam: canvasTex(64, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,236,190,0.0)'); g.addColorStop(0.12, 'rgba(255,236,190,0.55)'); g.addColorStop(1, 'rgba(255,236,190,0.06)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const gh = ctx.createLinearGradient(0, 0, w, 0);
      gh.addColorStop(0, 'rgba(0,0,0,1)'); gh.addColorStop(0.35, 'rgba(0,0,0,0)'); gh.addColorStop(0.65, 'rgba(0,0,0,0)'); gh.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = gh; ctx.fillRect(0, 0, w, h);
    }),
    flash: radial(128, [[0, 'rgba(255,255,230,1)'], [0.3, 'rgba(255,210,110,0.9)'], [1, 'rgba(255,120,30,0)']]),
    spark: radial(32, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,230,160,0.7)'], [1, 'rgba(255,200,100,0)']]),
  };
  return spriteCache;
}

// ---------- 材質庫 ----------
const lib = new Map();
function cached(name, fn) { if (!lib.has(name)) lib.set(name, fn()); return lib.get(name); }

import { photoSet, hasPhoto } from './photo.js';
const PHOTO = {
  stoneGrey: ['stone', { }], stoneSand: ['stone', { mul: [1.22, 1.02, 0.78], bright: 1.05 }], stoneBlue: ['stone', { mul: [0.82, 0.94, 1.22] }],
  roughStone: ['stone', { bright: 0.85 }], cellarStone: ['stone', { bright: 0.62, mul: [1, 0.95, 0.95] }],
  cellarBrick: ['brick', { }], cellarBrickDark: ['brick2', { mul: [0.8, 0.72, 0.72], bright: 0.75 }],
  marbleWhite: ['marble', { normal: 0.8, rough: 0.45 }], marbleBlue: ['marble', { mul: [0.82, 0.92, 1.2], normal: 0.8, rough: 0.45 }], marbleDark: ['marble', { mul: [0.42, 0.45, 0.62], bright: 0.9, normal: 0.8, rough: 0.4 }],
  floorFlag: ['floorHex', { mul: [0.9, 0.86, 0.9], bright: 0.95 }], floorCobble: ['floorCobble', { }], floorFlagDark: ['floorHex', { mul: [0.72, 0.68, 0.76], bright: 0.7 }], floorCobbleDark: ['floorCobble', { bright: 0.6 }],
  ceilStone: ['ceil', { bright: 0.8, mul: [0.9, 0.9, 0.95] }], ceilPlaster: ['ceil', { mul: [1.1, 1.0, 0.9] }], ceilDark: ['ceil', { bright: 0.55 }],
  door: ['doorWood', { aspect: true, normal: 1.6, size: 784 }],
  doorGold: ['doorIron', { aspect: true, normal: 1.6, size: 784, mul: [1.55, 1.2, 0.55], bright: 1.05, plate: 'gold' }],
  doorSilver: ['doorIron', { aspect: true, normal: 1.6, size: 784, mul: [1.1, 1.15, 1.3], bright: 1.15, plate: 'silver' }],
  exit: ['doorExit', { aspect: true, normal: 1.4, size: 784 }],
};
export function getSet(name) {
  return cached(name, () => {
    const pp = PHOTO[name]; if (pp && hasPhoto(pp[0])) { const s = photoSet(pp[0], pp[1]); if (s) return s; }
    switch (name) {
      case 'stoneGrey': return stoneWall({ seed: 11, rows: 8, cols: 4, base: [132, 130, 136], mortar: [118, 114, 110], moss: 0.4 });
      case 'stoneSand': return stoneWall({ seed: 12, rows: 6, cols: 3, base: [170, 150, 118], mortar: [140, 128, 108], moss: 0 , bevel: 0.02});
      case 'stoneBlue': return stoneWall({ seed: 13, rows: 8, cols: 4, base: [108, 118, 142], mortar: [96, 100, 112], moss: 0.15 });
      case 'roughStone': return roughStone({ seed: 14, n: 5, base: [128, 122, 118], moss: 0.5 });
      case 'cellarStone': return roughStone({ seed: 15, n: 5, base: [92, 88, 88], moss: 0.7 });
      case 'cellarBrick': return cellarBrick({ seed: 16, base: [128, 66, 54] });
      case 'cellarBrickDark': return cellarBrick({ seed: 17, base: [92, 56, 50] });
      case 'hallBlue': return hallWall({ seed: 21, stone: [112, 124, 154], wood: [84, 50, 32] });
      case 'hallStone': return hallWall({ seed: 22, stone: [168, 150, 124], wood: [70, 42, 28] });
      case 'hallGreen': return hallWall({ seed: 23, stone: [96, 132, 118], wood: [80, 48, 30] });
      case 'libShelf': return bookshelf({ seed: 31 });
      case 'libShelf2': return bookshelf({ seed: 32 });
      case 'libWood': return woodPanel({ seed: 33, wood: [96, 58, 34] });
      case 'marbleWhite': return marble({ seed: 41, light: true, base: [236, 232, 224], vein: [150, 150, 160] });
      case 'marbleBlue': return marble({ seed: 42, light: true, base: [206, 220, 236], vein: [110, 130, 170] });
      case 'marbleDark': return marble({ seed: 43, light: false, base: [120, 124, 140], vein: [214, 176, 80] });
      case 'throneRed': return damask({ seed: 51, base: [132, 24, 34] });
      case 'throneNavy': return damask({ seed: 52, base: [28, 44, 104] });
      case 'window': return windowWall({ seed: 71, base: [136, 134, 140] });
      case 'windowSand': return windowWall({ seed: 72, base: [172, 152, 120] });
      case 'door': return doorTex('door');
      case 'doorGold': return doorTex('gold');
      case 'doorSilver': return doorTex('silver');
      case 'exit': return exitTex();
      case 'floorFlag': return flagFloor({ seed: 81, base: [128, 126, 130] });
      case 'floorFlagDark': return flagFloor({ seed: 82, base: [86, 84, 90] });
      case 'floorCobble': return cobbleFloor({ seed: 83, base: [118, 112, 106] });
      case 'floorCobbleDark': return cobbleFloor({ seed: 84, base: [84, 78, 76] });
      case 'floorParquet': return parquet({ seed: 85, base: [112, 70, 40] });
      case 'floorParquetDark': return parquet({ seed: 86, base: [76, 48, 30] });
      case 'floorChecker': return checkerMarble({ seed: 87, light: [232, 228, 218], dark: [60, 64, 84] });
      case 'floorCheckerDark': return checkerMarble({ seed: 88, light: [150, 150, 160], dark: [34, 36, 48] });
      case 'carpetRed': return carpet({ seed: 89, base: [128, 24, 34], trim: [214, 170, 66] });
      case 'carpetGreen': return carpet({ seed: 90, base: [30, 82, 58], trim: [214, 170, 66] });
      case 'carpetNavy': return carpet({ seed: 91, base: [28, 44, 108], trim: [214, 170, 66] });
      case 'ceilPlaster': return ceilingPlaster({ seed: 95, base: [150, 138, 120], beams: true });
      case 'ceilStone': return ceilingPlaster({ seed: 96, base: [86, 82, 84], beams: false });
      case 'ceilDark': return ceilingPlaster({ seed: 97, base: [64, 56, 52], beams: true });
      default: throw new Error('no texture ' + name);
    }
  });
}

export function matFor(name, extra = {}) {
  const s = getSet(name);
  const m = new THREE.MeshStandardMaterial({
    map: s.map, normalMap: s.normal, normalScale: new THREE.Vector2(s.nstr, s.nstr),
    roughness: s.rough, metalness: 0, vertexColors: !!extra.vertexColors, ...extra,
  });
  if (s.emissive) { m.emissiveMap = s.emissive; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = extra.emissiveIntensity ?? 1.4; }
  return m;
}
