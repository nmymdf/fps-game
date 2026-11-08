import * as THREE from 'three';
import { getSet, sprites } from './textures.js';
import { CELL, WALL_H } from './const.js';

let ENV = null;
export function setEnv(t) { ENV = t; }

const matCache = new Map();
function std(key, make) { if (!matCache.has(key)) matCache.set(key, make()); return matCache.get(key); }
export function texMat(name, rep = 1, extra = {}) {
  return std(`tex:${name}:${rep}:${JSON.stringify(extra)}`, () => {
    const s = getSet(name);
    const map = s.map.clone(), nm = s.normal.clone();
    for (const t of [map, nm]) { t.repeat.set(rep, rep); t.needsUpdate = true; }
    return new THREE.MeshStandardMaterial({ map, normalMap: nm, roughness: s.rough, ...extra });
  });
}
export const metal = (color, rough = 0.4) => std('m' + color + rough, () => new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: rough, envMap: ENV, envMapIntensity: 1.0 }));
export const plain = (color, rough = 0.8) => std('p' + color + rough, () => new THREE.MeshStandardMaterial({ color, roughness: rough }));
export const glowMat = (color) => std('g' + color, () => new THREE.MeshBasicMaterial({ color }));

export const flames = []; // 由 world 逐幀動畫
export function makeFlame(scale = 1) {
  const sp = sprites();
  const mat = new THREE.SpriteMaterial({ map: sp.flame, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.55 * scale, 0.8 * scale, 1);
  s.userData = { base: scale, ph: Math.random() * 10 };
  flames.push(s);
  return s;
}
const G = {}; // 共用幾何
function geo(key, make) { if (!G[key]) G[key] = make(); return G[key]; }

function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; }

export function buildDecor(type, theme, rnd) {
  const g = new THREE.Group();
  switch (type) {
    case 'pillar': {
      const m = texMat(theme.pillar, 1);
      g.add(mesh(geo('pbase', () => new THREE.BoxGeometry(1.3, 0.35, 1.3)), m, 0, 0.175, 0));
      g.add(mesh(geo('pshaft', () => new THREE.CylinderGeometry(0.46, 0.5, WALL_H - 0.7, 20)), m, 0, 0.35 + (WALL_H - 0.7) / 2, 0));
      g.add(mesh(geo('pcap', () => new THREE.BoxGeometry(1.3, 0.35, 1.3)), m, 0, WALL_H - 0.175, 0));
      g.add(mesh(geo('pring', () => new THREE.CylinderGeometry(0.54, 0.54, 0.1, 20)), metal(0xc9a24a, 0.35), 0, 0.42, 0));
      g.add(mesh(geo('pring', () => new THREE.CylinderGeometry(0.54, 0.54, 0.1, 20)), metal(0xc9a24a, 0.35), 0, WALL_H - 0.42, 0));
      break;
    }
    case 'barrel': {
      const m = texMat('libWood', 1);
      const pts = [[0.001, 0], [0.4, 0], [0.48, 0.2], [0.55, 0.55], [0.48, 0.92], [0.4, 1.12], [0.001, 1.12]].map(([r, y]) => new THREE.Vector2(r, y));
      g.add(mesh(geo('barrel', () => new THREE.LatheGeometry(pts, 20)), m));
      const ring = geo('bring', () => new THREE.TorusGeometry(0.5, 0.035, 8, 24));
      for (const y of [0.22, 0.9]) { const r = mesh(ring, metal(0x2c2c32, 0.5), 0, y, 0); r.rotation.x = Math.PI / 2; r.scale.set(0.97 + (y > 0.5 ? 0 : 0.0), 0.97, 1); g.add(r); }
      const mid = mesh(geo('bring', () => new THREE.TorusGeometry(0.5, 0.035, 8, 24)), metal(0x2c2c32, 0.5), 0, 0.56, 0); mid.rotation.x = Math.PI / 2; mid.scale.set(1.1, 1.1, 1); g.add(mid);
      g.scale.setScalar(1.15);
      break;
    }
    case 'crate': {
      const m = texMat('libWood', 1);
      g.add(mesh(geo('crate', () => new THREE.BoxGeometry(1.15, 1.15, 1.15)), m, 0, 0.575, 0));
      const bat = plain(0x3a2616, 0.9);
      for (const sx of [-0.55, 0.55]) for (const sz of [-0.55, 0.55]) g.add(mesh(geo('cb', () => new THREE.BoxGeometry(0.1, 1.2, 0.1)), bat, sx, 0.575, sz));
      for (const y of [0.04, 1.11]) g.add(mesh(geo('cb2', () => new THREE.BoxGeometry(1.2, 0.08, 1.2)), bat, 0, y, 0));
      if (rnd() < 0.5) { const s = mesh(geo('crate2', () => new THREE.BoxGeometry(0.7, 0.7, 0.7)), m, 0.1, 1.5, 0.05); s.rotation.y = 0.5; g.add(s); }
      break;
    }
    case 'table': {
      const m = texMat('libWood', 1);
      g.add(mesh(geo('ttop', () => new THREE.BoxGeometry(1.8, 0.1, 1.1)), m, 0, 0.88, 0));
      for (const sx of [-0.8, 0.8]) for (const sz of [-0.45, 0.45]) g.add(mesh(geo('tleg', () => new THREE.CylinderGeometry(0.06, 0.07, 0.88, 8)), m, sx, 0.44, sz));
      const cloth = mesh(geo('tcloth', () => new THREE.BoxGeometry(1.3, 0.02, 0.75)), plain(0x7a1620, 0.9), 0, 0.94, 0);
      g.add(cloth);
      g.add(mesh(geo('candle', () => new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8)), plain(0xf2e8c8, 0.6), -0.25, 1.09, 0));
      const f = makeFlame(0.5); f.position.set(-0.25, 1.36, 0); g.add(f);
      g.add(mesh(geo('goblet', () => new THREE.CylinderGeometry(0.07, 0.04, 0.16, 12)), metal(0xd6aa44, 0.3), 0.3, 1.04, 0.1));
      break;
    }
    case 'statue': {
      const stone = texMat('stoneGrey', 1), steel = metal(0x9aa4b4, 0.35), gold = metal(0xc9a24a, 0.35);
      g.add(mesh(geo('sped', () => new THREE.BoxGeometry(1.0, 0.5, 1.0)), stone, 0, 0.25, 0));
      g.add(mesh(geo('stor', () => new THREE.CylinderGeometry(0.26, 0.2, 0.75, 14)), steel, 0, 1.2, 0));
      g.add(mesh(geo('shipp', () => new THREE.CylinderGeometry(0.22, 0.26, 0.2, 14)), gold, 0, 0.82, 0));
      for (const sx of [-0.12, 0.12]) g.add(mesh(geo('sleg', () => new THREE.CylinderGeometry(0.075, 0.07, 0.6, 10)), steel, sx, 0.8, 0));
      for (const sx of [-0.34, 0.34]) { const a = mesh(geo('sarm', () => new THREE.CylinderGeometry(0.06, 0.055, 0.6, 10)), steel, sx, 1.22, 0.03); a.rotation.z = sx > 0 ? -0.2 : 0.2; g.add(a); }
      g.add(mesh(geo('shead', () => new THREE.SphereGeometry(0.17, 16, 12)), steel, 0, 1.78, 0));
      g.add(mesh(geo('svis', () => new THREE.BoxGeometry(0.22, 0.05, 0.08)), plain(0x0a0a0a, 1), 0, 1.78, 0.14));
      const plume = mesh(geo('splume', () => new THREE.ConeGeometry(0.06, 0.35, 8)), plain(0xa8283a, 0.9), 0, 2.05, -0.05); g.add(plume);
      const spear = mesh(geo('sspear', () => new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6)), plain(0x4a3220, 0.8), 0.42, 1.7, 0.1); g.add(spear);
      g.add(mesh(geo('stip', () => new THREE.ConeGeometry(0.05, 0.2, 8)), steel, 0.42, 2.95, 0.1));
      const sh = mesh(geo('sshield', () => new THREE.BoxGeometry(0.06, 0.55, 0.4)), gold, -0.42, 1.2, 0.08); g.add(sh);
      break;
    }
    case 'plant': {
      g.add(mesh(geo('pot', () => new THREE.CylinderGeometry(0.4, 0.28, 0.6, 14)), plain(0x9a5a3a, 0.85), 0, 0.3, 0));
      g.add(mesh(geo('soil', () => new THREE.CylinderGeometry(0.37, 0.37, 0.05, 14)), plain(0x2c1c12, 1), 0, 0.6, 0));
      const lm = plain(0x2f7a3c, 0.7), lm2 = plain(0x3f9a4c, 0.7);
      const lg = geo('leaf', () => { const s = new THREE.SphereGeometry(0.5, 10, 8); s.scale(0.18, 1, 0.07); return s; });
      for (let i = 0; i < 11; i++) {
        const l = mesh(lg, i % 2 ? lm : lm2, 0, 1.15, 0);
        const a = (i / 11) * 6.283, tilt = 0.35 + (i % 3) * 0.2;
        l.position.set(Math.cos(a) * 0.18, 0.95 + (i % 3) * 0.15, Math.sin(a) * 0.18);
        l.rotation.set(Math.sin(a) * tilt, a, -Math.cos(a) * tilt, 'YXZ');
        l.rotation.order = 'YXZ'; l.rotation.y = -a; l.rotation.z = tilt; l.rotation.x = 0;
        g.add(l);
      }
      break;
    }
    case 'candelabra': {
      const gold = metal(0xc9a24a, 0.3);
      g.add(mesh(geo('cbase', () => new THREE.CylinderGeometry(0.34, 0.4, 0.15, 14)), gold, 0, 0.075, 0));
      g.add(mesh(geo('cpole', () => new THREE.CylinderGeometry(0.05, 0.08, 1.6, 10)), gold, 0, 0.9, 0));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * 6.283 + 0.5, x = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3;
        const arm = mesh(geo('carm', () => new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6)), gold, x / 2, 1.62, z / 2); arm.rotation.set(0, 0, 0); arm.lookAt(x, 1.62, z); arm.rotateX(Math.PI / 2); g.add(arm);
        g.add(mesh(geo('ccup', () => new THREE.CylinderGeometry(0.06, 0.04, 0.08, 8)), gold, x, 1.64, z));
        g.add(mesh(geo('ccandle', () => new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8)), plain(0xf2e8c8, 0.6), x, 1.78, z));
        const f = makeFlame(0.5); f.position.set(x, 2.02, z); g.add(f);
      }
      const f = makeFlame(0.55); f.position.set(0, 1.92, 0); g.add(f);
      g.add(mesh(geo('ccandle', () => new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8)), plain(0xf2e8c8, 0.6), 0, 1.78, 0));
      break;
    }
    case 'chandelier': {
      const gold = metal(0xc9a24a, 0.3);
      const y = WALL_H - 1.2;
      const ring = mesh(geo('chring', () => new THREE.TorusGeometry(0.9, 0.05, 8, 32)), gold, 0, y, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
      const ring2 = mesh(geo('chring2', () => new THREE.TorusGeometry(0.5, 0.04, 8, 24)), gold, 0, y + 0.18, 0); ring2.rotation.x = Math.PI / 2; g.add(ring2);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.283; const c = mesh(geo('chain', () => new THREE.CylinderGeometry(0.015, 0.015, 1.4, 5)), gold, Math.cos(a) * 0.5, y + 0.7, Math.sin(a) * 0.5); c.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(c); }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283, x = Math.cos(a) * 0.9, z = Math.sin(a) * 0.9;
        g.add(mesh(geo('chcandle', () => new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8)), plain(0xf2e8c8, 0.6), x, y + 0.12, z));
        const f = makeFlame(0.45); f.position.set(x, y + 0.36, z); g.add(f);
      }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprites().glow, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false }));
      gl.scale.set(4.2, 4.2, 1); gl.position.y = y + 0.2; g.add(gl);
      break;
    }
  }
  return g;
}

export function decorRadius(type) {
  return { pillar: 0.62, barrel: 0.66, crate: 0.7, table: 0.95, statue: 0.62, plant: 0.45, candelabra: 0.4, chandelier: 0 }[type] ?? 0.5;
}
