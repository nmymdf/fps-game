import * as THREE from 'three';
import { metal, plain, texMat } from './decor.js';
import { sprites } from './textures.js';

export const WEAPONS = {
  knife: { id: 'knife', name: '小刀', slot: 1, melee: true, dmg: [22, 30], rate: 0.42, reach: 2.8, noise: 0 },
  pistol: { id: 'pistol', name: '手槍', slot: 2, ammo: 'bullets', mag: 12, dmg: [13, 19], rate: 0.27, spread: 0.010, auto: false, reload: 1.05, pellets: 1, kick: 0.07 },
  smg: { id: 'smg', name: '衝鋒槍', slot: 3, ammo: 'bullets', mag: 30, dmg: [9, 13], rate: 0.085, spread: 0.032, auto: true, reload: 1.5, pellets: 1, kick: 0.035 },
  shotgun: { id: 'shotgun', name: '散彈槍', slot: 4, ammo: 'shells', mag: 6, dmg: [7, 10], rate: 0.85, spread: 0.075, auto: false, reload: 0.5, pellets: 9, perShell: true, kick: 0.14 },
  rifle: { id: 'rifle', name: '步槍', slot: 5, ammo: 'bullets', mag: 10, dmg: [52, 64], rate: 0.66, spread: 0.002, auto: false, reload: 1.7, pellets: 1, kick: 0.1 },
};
export const WEAPON_ORDER = ['knife', 'pistol', 'smg', 'shotgun', 'rifle'];


import { RB, CY, SP, CAP, TOR, CONE } from './shapes.js';

const M = {};
function mats() {
  if (M.steel) return M;
  const st = (color, met, rough, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness: met, roughness: rough, ...extra });
  M.steel = st(0x2c323c, 0.85, 0.32); M.steelL = st(0x9aa2b0, 0.9, 0.25); M.steelD = st(0x15181e, 0.7, 0.45);
  M.brass = st(0xd2a640, 0.9, 0.28); M.black = st(0x0b0c0e, 0.3, 0.6);
  M.wood = texMat('libWood', 0.5, { roughness: 0.5, color: 0xd8b088 }); M.woodD = st(0x4a2a14, 0.1, 0.55);
  M.bake = st(0x2a1a10, 0.2, 0.4);
  M.skin = st(0xe0b090, 0, 0.6); M.glove = st(0x2a2018, 0.05, 0.75); M.glove2 = st(0x453527, 0.05, 0.8);
  M.sleeve = st(0x3a4234, 0, 0.9); M.sleeveD = st(0x262c22, 0, 0.95); M.cuff = st(0x3a2a1c, 0.05, 0.7);
  M.lens = new THREE.MeshStandardMaterial({ color: 0x3a78d8, emissive: 0x1a3a80, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.05 });
  M.red = st(0xc02a22, 0.1, 0.5);
  return M;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// 手：手掌＋四指包住＋拇指，附前臂袖子（往鏡頭後方延伸）
function makeHand(m, o = {}) {
  const g = new THREE.Group(); const s = o.s ?? 1, glove = o.glove ?? m.glove;
  // 手掌（略圓）
  g.add(RB(0.082 * s, 0.05 * s, 0.09 * s, 0.022 * s, glove, 0, 0, 0));
  g.add(RB(0.07 * s, 0.03 * s, 0.05 * s, 0.014 * s, glove, 0, 0.022 * s, 0.04 * s)); // 手背隆起
  // 四指：沿 x 方向橫握，繞在握把前
  for (let i = 0; i < 4; i++) {
    const f = CAP(0.0125 * s, 0.05 * s, glove, 0, (-0.03 + i * 0.0215) * s * (o.fingerDir ?? 1), -0.052 * s, 'x');
    f.scale.set(1, 1, 1 - i * 0.04);
    g.add(f);
    g.add(TOR(0.0125 * s, 0.003 * s, m.glove2, 0.05 * s, (-0.03 + i * 0.0215) * s * (o.fingerDir ?? 1), -0.052 * s, 'x')); // 指節縫
  }
  // 拇指
  const th = CAP(0.0135 * s, 0.045 * s, glove, -0.05 * s * (o.side ?? 1), 0.012 * s, -0.012 * s, 'z'); th.rotation.y = 0.35 * (o.side ?? 1); g.add(th);
  // 腕口皮帶 + 袖子
  const dir = o.dir ?? V(0.35, -0.3, 0.9).normalize();
  const sl = new THREE.Group();
  sl.add(CY(0.036 * s, 0.05 * s, 0.7, m.sleeve, 0, 0.35, 0, 'y'));
  sl.add(TOR(0.039 * s, 0.009 * s, m.cuff, 0, 0.005, 0, 'y'));        // 袖口束帶
  sl.add(CY(0.041 * s, 0.041 * s, 0.05, m.sleeveD, 0, 0.09, 0, 'y')); // 縫線帶
  sl.add(CY(0.045 * s, 0.045 * s, 0.03, m.sleeveD, 0, 0.24, 0, 'y'));
  sl.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
  sl.position.set(0, 0.0, 0.03 * s);
  g.add(sl);
  return g;
}
const fx = { grips: [], };

export function buildGun(id, forItem = false, opts = {}) {
  const m = mats();
  const g = new THREE.Group(); const parts = {}; let muzzleZ = -0.3, muzzleY = 0.02;
  const add = (...a) => { for (const o of a) g.add(o); };
  const screw = (x, y, z) => SP(0.0045, m.brass, x, y, z);
  const hand = (x, y, z, o) => { if (forItem) return; const h = makeHand(m, o); h.position.set(x, y, z); g.add(h); };
  switch (id) {
    case 'knife': {
      // 刀身（擠出）：帶刀背與尖
      const sh = new THREE.Shape(); sh.moveTo(0, 0.028); sh.lineTo(0.2, 0.028); sh.quadraticCurveTo(0.29, 0.02, 0.33, -0.004); sh.lineTo(0.2, -0.026); sh.lineTo(0, -0.026); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
      geo.translate(0, 0, -0.003); geo.rotateY(Math.PI / 2);
      const blade = new THREE.Mesh(geo, m.steelL); blade.position.set(0, 0.02, -0.07);
      const edge = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe8eef8, metalness: 1, roughness: 0.1 })); edge.scale.set(1.15, 0.28, 0.5); edge.position.set(0, -0.005, -0.07);
      const fuller = RB(0.003, 0.012, 0.18, 0.001, m.steelD, 0.0062, 0.032, -0.2); const fuller2 = fuller.clone(); fuller2.position.x = -0.0062;
      const guard = RB(0.012, 0.08, 0.02, 0.006, m.brass, 0, 0.02, -0.06);
      const handle = CY(0.02, 0.023, 0.16, m.glove2, 0, 0, 0.03, 'z');
      add(blade, edge, fuller, fuller2, guard, handle);
      for (let i = 0; i < 6; i++) add(TOR(0.0225, 0.004, m.black, 0, 0, -0.03 + i * 0.027, 'z'));
      add(SP(0.028, m.brass, 0, 0, 0.125, 1, 1, 0.8));
      hand(0, -0.012, 0.035, { s: 0.95, fingerDir: 1 });
      parts.blade = blade; muzzleZ = -0.35; break;
    }
    case 'pistol': {
      const frame = RB(0.036, 0.052, 0.19, 0.01, m.steel, 0, 0, -0.03);
      const slideG = new THREE.Group();
      slideG.add(RB(0.04, 0.042, 0.2, 0.01, m.steel, 0, 0.05, -0.035));
      slideG.add(RB(0.012, 0.008, 0.18, 0.003, m.steelL, 0, 0.074, -0.035));          // 上緣高光
      slideG.add(RB(0.004, 0.022, 0.06, 0.002, m.black, 0.0205, 0.056, -0.05));       // 拋殼口
      for (let i = 0; i < 7; i++) slideG.add(RB(0.0415, 0.03, 0.003, 0.0005, m.steelD, 0, 0.05, 0.03 + i * 0.011)); // 後防滑紋
      slideG.add(CY(0.0115, 0.0115, 0.05, m.steelL, 0, 0.05, -0.15, 'z'));            // 槍管露出
      slideG.add(CY(0.006, 0.006, 0.004, m.black, 0, 0.05, -0.176, 'z'));              // 槍口孔
      slideG.add(RB(0.012, 0.014, 0.012, 0.003, m.steelL, 0, 0.078, 0.06));             // 後準星
      slideG.add(RB(0.005, 0.014, 0.01, 0.002, m.steelL, 0, 0.079, -0.125));            // 前準星
      slideG.add(RB(0.01, 0.01, 0.02, 0.003, m.steelD, 0, 0.043, 0.088));               // 擊錘
      const grip = new THREE.Group(); grip.rotation.x = 0.2; grip.position.set(0, -0.085, 0.04);
      grip.add(RB(0.036, 0.13, 0.058, 0.012, m.steel, 0, 0, 0));
      grip.add(RB(0.044, 0.11, 0.05, 0.012, m.wood, 0, -0.005, 0.0));                   // 木握把片
      for (let i = 0; i < 5; i++) grip.add(RB(0.046, 0.004, 0.044, 0.001, m.woodD, 0, 0.04 - i * 0.02, 0));
      grip.add(screw(0.023, 0.025, 0), screw(0.023, -0.03, 0), screw(-0.023, 0.025, 0), screw(-0.023, -0.03, 0));
      grip.add(RB(0.034, 0.012, 0.06, 0.004, m.steelD, 0, -0.07, 0.0)); // 彈匣底
      grip.add(TOR(0.01, 0.0025, m.steelL, 0, -0.078, 0.032, 'x'));      // 吊環
      const guard = TOR(0.026, 0.0045, m.steel, 0, -0.04, -0.056, 'x', Math.PI); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, -0.045, -0.05);
      const trig = RB(0.006, 0.026, 0.008, 0.003, m.steelL, 0, -0.037, -0.032); trig.rotation.x = 0.25;
      add(frame, slideG, grip, guard, trig);
      hand(0, -0.1, 0.07, { s: 1, dir: V(0.4, -0.35, 0.85).normalize() });
      parts.slide = slideG; parts.mag = null; muzzleZ = -0.2; muzzleY = 0.05; break;
    }
    case 'smg': {
      const body = RB(0.05, 0.062, 0.3, 0.014, m.steel, 0, 0, -0.1);
      const top = CY(0.026, 0.026, 0.3, m.steel, 0, 0.034, -0.1, 'z'); top.scale.set(1, 1, 0.8);
      const cover = RB(0.03, 0.008, 0.2, 0.003, m.steelL, 0, 0.058, -0.1);
      const shroud = CY(0.027, 0.027, 0.25, m.steel, 0, 0.012, -0.375, 'z');
      add(body, top, cover, shroud);
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const h = CY(0.006, 0.006, 0.006, m.black, sx * 0.0268, 0.012, -0.28 - i * 0.034, 'x'); add(h); }
      for (let i = 0; i < 6; i++) { const h = CY(0.006, 0.006, 0.006, m.black, 0, 0.0385, -0.28 - i * 0.034, 'y'); add(h); }
      add(CY(0.016, 0.016, 0.04, m.steelL, 0, 0.012, -0.505, 'z'), CY(0.008, 0.008, 0.005, m.black, 0, 0.012, -0.527, 'z'));
      add(RB(0.01, 0.026, 0.012, 0.003, m.steelL, 0, 0.056, -0.45)); // 前準星
      add(RB(0.026, 0.02, 0.014, 0.003, m.steelL, 0, 0.056, 0.03)); // 後照門
      const grip = RB(0.04, 0.11, 0.052, 0.014, m.bake, 0, -0.085, 0.03); grip.rotation.x = 0.15; add(grip);
      for (let i = 0; i < 4; i++) { const r = RB(0.042, 0.004, 0.046, 0.001, m.black, 0, -0.06 - i * 0.02, 0.03); r.rotation.x = 0.15; add(r); }
      const magG = new THREE.Group(); magG.position.set(0, -0.15, -0.12);
      magG.add(RB(0.03, 0.19, 0.046, 0.008, m.steelD, 0, 0, 0));
      for (let i = 0; i < 5; i++) magG.add(RB(0.032, 0.004, 0.048, 0.001, m.steel, 0, -0.07 + i * 0.03, 0));
      magG.add(RB(0.036, 0.012, 0.052, 0.004, m.steel, 0, -0.098, 0)); add(magG); parts.mag = magG;
      add(RB(0.044, 0.05, 0.1, 0.01, m.steel, 0, -0.04, -0.12)); // 彈匣座
      const guardA = TOR(0.028, 0.0045, m.steel, 0, -0.055, -0.0, 'x', Math.PI); guardA.rotation.set(0, Math.PI / 2, Math.PI); add(guardA);
      add(CY(0.005, 0.005, 0.2, m.steelL, 0.02, 0.02, 0.2, 'z'), CY(0.005, 0.005, 0.2, m.steelL, -0.02, 0.02, 0.2, 'z')); // 折疊肩托
      add(RB(0.012, 0.075, 0.02, 0.004, m.steel, 0, 0.0, 0.31));
      add(CY(0.007, 0.007, 0.022, m.steelL, 0.034, 0.025, -0.02, 'x'), SP(0.012, m.steelL, 0.05, 0.025, -0.02)); // 拉機柄
      hand(0, -0.1, 0.075, { s: 1, dir: V(0.4, -0.35, 0.85).normalize() });
      hand(0, -0.065, -0.12, { s: 0.95, dir: V(-0.5, -0.6, 0.62).normalize(), side: -1, fingerDir: 1 });
      parts.mag0 = magG; muzzleZ = -0.53; muzzleY = 0.012; break;
    }
    case 'shotgun': {
      const recv = RB(0.058, 0.075, 0.22, 0.016, m.steel, 0, 0, -0.04);
      add(recv, RB(0.004, 0.026, 0.07, 0.002, m.black, 0.0305, 0.012, -0.03));    // 拋殼口
      add(RB(0.006, 0.03, 0.03, 0.002, m.brass, 0.0305, -0.02, 0.02));            // 裝彈口蓋
      const b1 = CY(0.0195, 0.0195, 0.62, m.steel, 0, 0.026, -0.47, 'z'), b2 = CY(0.0155, 0.0155, 0.5, m.steelL, 0, -0.022, -0.43, 'z');
      add(b1, b2, RB(0.01, 0.006, 0.55, 0.002, m.steelL, 0, 0.049, -0.46));
      add(SP(0.0065, m.brass, 0, 0.056, -0.76), CY(0.0125, 0.0125, 0.01, m.black, 0, 0.026, -0.78, 'z'));
      add(TOR(0.022, 0.004, m.steelL, 0, 0.0, -0.64, 'z'), TOR(0.022, 0.004, m.steelL, 0, 0, -0.36, 'z'));
      const pump = new THREE.Group(); pump.add(RB(0.07, 0.056, 0.2, 0.022, m.wood, 0, -0.018, -0.4));
      for (let i = 0; i < 6; i++) pump.add(RB(0.074, 0.06, 0.004, 0.001, m.woodD, 0, -0.018, -0.48 + i * 0.03));
      add(pump); parts.pump = pump;
      const grip = RB(0.04, 0.095, 0.05, 0.016, m.wood, 0, -0.065, 0.085); grip.rotation.x = 0.35; add(grip);
      const stock = RB(0.046, 0.088, 0.3, 0.02, m.wood, 0, -0.025, 0.27); stock.rotation.x = 0.1; add(stock);
      add(RB(0.052, 0.125, 0.022, 0.008, m.black, 0, -0.045, 0.43));             // 肩墊
      for (let i = 0; i < 5; i++) { const r = RB(0.049, 0.003, 0.05, 0.001, m.woodD, 0, -0.015 + i * 0.0, 0.18 + i * 0.02); }
      const guard = TOR(0.027, 0.0045, m.steel, 0, -0.045, 0.03, 'x', Math.PI); guard.rotation.set(0, Math.PI / 2, Math.PI); add(guard);
      add(RB(0.006, 0.03, 0.01, 0.003, m.steelL, 0, -0.036, 0.012));
      add(TOR(0.009, 0.0025, m.steelL, 0, -0.055, 0.35, 'x'));
      for (let i = 0; i < 3; i++) add(CY(0.011, 0.011, 0.03, m.red, 0.034, -0.01 + i * 0.0, -0.02 - i * 0.035, 'x')); // 側掛彈殼
      hand(0, -0.09, 0.11, { s: 1.02, dir: V(0.4, -0.35, 0.85).normalize() });
      hand(0, -0.02, -0.37, { s: 1.0, dir: V(-0.55, -0.65, 0.6).normalize(), side: -1 });
      muzzleZ = -0.8; muzzleY = 0.026; break;
    }
    case 'rifle': {
      const wood = m.wood;
      const body = RB(0.046, 0.06, 0.22, 0.012, m.steel, 0, 0.0, -0.04);
      const barrel = CY(0.0125, 0.0125, 0.74, m.steelL, 0, 0.018, -0.52, 'z');
      const hg = RB(0.046, 0.044, 0.36, 0.016, wood, 0, -0.016, -0.4);
      add(body, barrel, hg, CY(0.0075, 0.0075, 0.008, m.black, 0, 0.018, -0.9, 'z'));
      add(TOR(0.0275, 0.0045, m.steel, 0, -0.012, -0.3, 'z'), TOR(0.0275, 0.0045, m.steel, 0, -0.012, -0.5, 'z'), TOR(0.0275, 0.0045, m.brass, 0, -0.012, -0.6, 'z'));
      add(RB(0.008, 0.016, 0.01, 0.003, m.steelL, 0, 0.04, -0.88)); // 前準星
      const stock = RB(0.044, 0.094, 0.34, 0.02, wood, 0, -0.03, 0.26); stock.rotation.x = 0.07; add(stock);
      add(RB(0.04, 0.03, 0.2, 0.012, wood, 0, 0.012, 0.18)); // 貼腮
      add(RB(0.05, 0.11, 0.016, 0.006, m.steelD, 0, -0.04, 0.435));
      const grip = RB(0.04, 0.095, 0.05, 0.016, wood, 0, -0.07, 0.1); grip.rotation.x = 0.3; add(grip);
      const sc = new THREE.Group();
      sc.add(CY(0.022, 0.022, 0.2, m.steelD, 0, 0.0, -0.0, 'z'));
      sc.add(CY(0.034, 0.022, 0.07, m.steelD, 0, 0, -0.135, 'z'), CY(0.027, 0.022, 0.05, m.steelD, 0, 0, 0.125, 'z'));
      const l1 = new THREE.Mesh(new THREE.CircleGeometry(0.031, 20), m.lens); l1.position.set(0, 0, -0.171); l1.rotation.y = Math.PI;
      const l2 = new THREE.Mesh(new THREE.CircleGeometry(0.019, 20), m.lens); l2.position.set(0, 0, 0.151);
      sc.add(l1, l2, CY(0.012, 0.012, 0.03, m.steelL, 0, 0.034, 0, 'y'), CY(0.012, 0.012, 0.03, m.steelL, 0.034, 0, 0, 'x'));
      sc.add(TOR(0.024, 0.004, m.steelL, 0, 0, -0.05, 'z'), TOR(0.024, 0.004, m.steelL, 0, 0, 0.06, 'z'));
      sc.position.set(0, 0.078, -0.08); add(sc);
      add(RB(0.016, 0.03, 0.022, 0.005, m.steel, 0, 0.05, -0.02), RB(0.016, 0.03, 0.022, 0.005, m.steel, 0, 0.05, -0.15));
      const bolt = new THREE.Group(); bolt.add(CY(0.007, 0.007, 0.075, m.steelL, 0.055, 0.022, 0.0, 'x'), SP(0.016, m.steelL, 0.098, 0.022, 0.0)); bolt.add(RB(0.03, 0.02, 0.05, 0.006, m.steel, 0.0, 0.03, 0.0)); add(bolt); parts.bolt = bolt;
      const mag = RB(0.034, 0.05, 0.09, 0.008, m.steelD, 0, -0.058, -0.05); add(mag, RB(0.036, 0.008, 0.09, 0.003, m.brass, 0, -0.085, -0.05)); parts.mag = mag;
      const gd = TOR(0.027, 0.0045, m.steel, 0, -0.045, 0.045, 'x', Math.PI); gd.rotation.set(0, Math.PI / 2, Math.PI); add(gd);
      add(TOR(0.01, 0.0025, m.steelL, 0, -0.07, -0.55, 'x'), TOR(0.01, 0.0025, m.steelL, 0, -0.07, 0.42, 'x'));
      hand(0, -0.09, 0.115, { s: 1.0, dir: V(0.4, -0.35, 0.85).normalize() });
      hand(0, -0.045, -0.36, { s: 1.0, dir: V(-0.55, -0.65, 0.6).normalize(), side: -1 });
      if (opts.noScope) { sc.visible = false; add(RB(0.01, 0.02, 0.012, 0.003, m.steelL, 0, 0.044, -0.02)); }
      muzzleZ = -0.93; muzzleY = 0.018; break;
    }
  }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, muzzleY, muzzleZ); g.add(muzzle);
  return { group: g, parts, muzzle };
}

export class ViewModel {
  constructor(vmScene) {
    this.root = new THREE.Group(); vmScene.add(this.root);
    this.models = {};
    for (const id of WEAPON_ORDER) {
      const m = buildGun(id); m.group.visible = false; this.root.add(m.group); this.models[id] = m;
    }
    const sp = sprites();
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: sp.flash, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }));
    this.flash.visible = false; this.flash.renderOrder = 999; this.root.add(this.flash);
    this.light = new THREE.PointLight(0xffc880, 0, 6, 1.6); vmScene.add(this.light); this.light.position.set(0.2, -0.05, -0.9);
    this.cur = 'pistol'; this.next = null;
    this.t = 0; this.kick = 0; this.sway = new THREE.Vector2(); this.bob = 0; this.flashT = 0;
    this.switchT = 1; this.reloadT = 0; this.reloadDur = 0; this.swing = 0;
    this.show('pistol');
  }
  show(id) { for (const k in this.models) this.models[k].group.visible = k === id; this.cur = id; }
  setWeapon(id) { if (id === this.cur && !this.next) return; this.next = id; this.switchT = 0; }
  fire(w) {
    this.kick = Math.min(1.4, this.kick + 1);
    const m = this.models[this.cur];
    this.flashT = 0.055;
    m.group.updateMatrixWorld(true);
    const p = new THREE.Vector3(); m.muzzle.getWorldPosition(p); this.root.worldToLocal(p);
    this.flash.position.copy(p); this.flash.scale.setScalar(this.cur === 'shotgun' ? 0.5 : this.cur === 'rifle' ? 0.42 : 0.3);
    this.flash.material.rotation = Math.random() * 6;
    this.flash.visible = true; this.light.intensity = this.cur === 'shotgun' ? 7 : 4;
    if (this.cur === 'shotgun') this.pumpT = 0.0;
  }
  melee() { this.swing = 0.0001; }
  startReload(dur) { this.reloadT = 0.0001; this.reloadDur = dur; }
  update(dt, moving, speedFactor) {
    this.t += dt;
    this.bob += dt * (moving ? 9 : 1.6) ;
    // 換槍動畫
    if (this.next) {
      this.switchT += dt / 0.22;
      if (this.switchT >= 1) { this.show(this.next); this.next = null; this.switchT = 0; this.switchDir = 1; }
    } else if (this.switchT < 1) this.switchT = Math.min(1, this.switchT + dt / 0.22);
    const lower = this.next ? this.switchT : (1 - this.switchT);
    this.kick = Math.max(0, this.kick - dt * 9);
    const k = this.kick;
    const m = this.models[this.cur];
    const amp = moving ? 0.012 : 0.003;
    const PL = { knife: [0.05, -0.09, -0.5, 0.3, -0.25, 1.15], pistol: [0.04, -0.045, -0.56, 0.22, 0, 1.0], smg: [0.03, -0.07, -0.6, 0.0, 0, 1], shotgun: [0.03, -0.07, -0.6, 0.0, 0, 1], rifle: [0.03, -0.07, -0.6, 0.0, 0, 1] }[this.cur];
    let px = PL[0] + Math.sin(this.bob * 0.5) * amp * 1.4, py = PL[1] + Math.abs(Math.sin(this.bob * 0.5)) * amp - lower * 0.35, pz = PL[2] + k * 0.05;
    let rx = k * 0.07 - lower * 0.5, ry = PL[3], rz = PL[4];
    // 換彈動畫
    if (this.reloadT > 0) {
      this.reloadT += dt / this.reloadDur;
      const t = Math.min(1, this.reloadT);
      const dip = Math.sin(t * Math.PI);
      py -= dip * 0.12; rz += dip * 0.5; rx -= dip * 0.25; px -= dip * 0.05;
      const mg = m.parts.mag;
      if (mg && !mg.userData.y0) mg.userData.y0 = mg.position.y;
      if (mg) mg.position.y = mg.userData.y0 - (t > 0.25 && t < 0.6 ? Math.sin((t - 0.25) / 0.35 * Math.PI) * 0.1 : 0);
      if (t >= 1) { this.reloadT = 0; if (mg) mg.position.y = mg.userData.y0; }
    }
    // 近戰
    if (this.swing > 0) {
      this.swing += dt / 0.28;
      const s = this.swing, e = Math.sin(Math.min(1, s) * Math.PI);
      px -= e * 0.18; pz -= e * 0.28; ry += e * 0.8; rz += e * 0.5; rx += e * 0.25;
      if (this.swing >= 1) this.swing = 0;
    }
    // 滑套/泵動
    if (m.parts.slide) m.parts.slide.position.z = k > 0.4 ? 0.05 * Math.min(1, k) : 0;
    if (m.parts.pump && this.pumpT !== undefined) {
      this.pumpT += dt / 0.7; const t = this.pumpT;
      m.parts.pump.position.z = t > 0.25 && t < 0.7 ? Math.sin((t - 0.25) / 0.45 * Math.PI) * 0.12 : 0;
      if (t >= 1) { this.pumpT = undefined; m.parts.pump.position.z = 0; }
    }
    this.root.position.set(px, py, pz);
    this.root.rotation.set(rx, ry, rz); this.root.scale.setScalar(PL[5]);
    // 手槍改用照片圖：把動作量交給 2D 層，3D 手槍與火光隱藏
    this.anim = { dx: px - PL[0], dy: py - PL[1], k, rz: rz - PL[4], lower, flash: this.flashT > 0, swing: this.swing > 0 ? Math.sin(Math.min(1, this.swing) * Math.PI) : 0, reload: this.reloadT > 0 ? Math.sin(Math.min(1, this.reloadT) * Math.PI) : 0, pump: this.pumpT !== undefined ? this.pumpT : -1, cur: this.cur };
    m.group.visible = false; this.flash.visible = false;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) { this.flash.visible = false; } }
    this.light.intensity = Math.max(0, this.light.intensity - dt * 60);
  }
  get busy() { return !!this.next || this.switchT < 1 || this.reloadT > 0 || this.swing > 0; }
}
