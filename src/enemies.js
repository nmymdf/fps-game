import * as THREE from 'three';
import { metal, plain } from './decor.js';
import { sprites } from './textures.js';
import { CELL } from './const.js';

const BOXG = new Map();
function bg(w, h, d) { const k = w + ',' + h + ',' + d; if (!BOXG.has(k)) BOXG.set(k, new THREE.BoxGeometry(w, h, d)); return BOXG.get(k); }
const B = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(bg(w, h, d), m); o.position.set(x, y, z); return o; };
const SPH = new THREE.SphereGeometry(1, 14, 10);
const S = (r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(SPH, m); o.scale.set(r * sx, r * sy, r * sz); o.position.set(x, y, z); return o; };
const C = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 12) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); return o; };

export const TYPES = {
  guard:   { name: '衛兵', hp: 28, r: 0.36, h: 1.8, speed: 2.6, score: 100, range: 17, dmg: [4, 8], cd: [0.8, 1.6], wind: 0.4, burst: 1, pain: 0.7, acc: 0.8, sight: 20 },
  officer: { name: '軍官', hp: 48, r: 0.36, h: 1.85, speed: 3.3, score: 400, range: 19, dmg: [7, 12], cd: [0.45, 1.0], wind: 0.28, burst: 2, pain: 0.55, acc: 0.95, sight: 24 },
  heavy:   { name: '重裝兵', hp: 110, r: 0.5, h: 2.0, speed: 2.0, score: 700, range: 14, dmg: [16, 24], cd: [1.2, 2.0], wind: 0.5, burst: 1, pain: 0.2, acc: 0.8, sight: 20, pellets: 3 },
  dog:     { name: '軍犬', hp: 20, r: 0.45, h: 1.1, speed: 5.4, score: 200, range: 1.7, dmg: [6, 10], cd: [0.7, 0.9], wind: 0.2, burst: 1, pain: 0.8, acc: 1, sight: 18, melee: true },
  boss:    { name: '城堡統領', hp: 700, r: 0.62, h: 2.6, speed: 2.4, score: 5000, range: 22, dmg: [6, 10], cd: [0.9, 1.4], wind: 0.5, burst: 7, pain: 0, acc: 0.9, sight: 40 },
};

// ---------- 模型 ----------
import { RB, CY, SP, CAP, TOR, CONE, addOutline } from './shapes.js';
import { buildGun } from './weapons.js';
const litCache = new Map();
const L = (c, rough = 0.8, k = 0.3, met = 0) => { const key = c + ':' + rough + ':' + k + ':' + met; if (!litCache.has(key)) litCache.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: met, emissive: c, emissiveIntensity: k })); return litCache.get(key); };
const steel = (c, k = 0.2) => L(c, 0.42, k, 0.55);
const glow = (c) => new THREE.MeshBasicMaterial({ color: c });
const PAL = {
  guard:   { coat: 0x5878b0, coat2: 0x3e5688, pants: 0x30405e, trim: 0xb8a060, cap: 0x7a828e },
  officer: { coat: 0xf0ead8, coat2: 0xc8c0a8, pants: 0x4a4638, trim: 0xe8c040, cap: 0x1a1c24 },
  heavy:   { coat: 0x5a6676, coat2: 0x3a4452, pants: 0x262c36, trim: 0xa8aeb8, cap: 0x4a525e },
  boss:    { coat: 0xc02a36, coat2: 0x7a1a22, pants: 0x2a1a20, trim: 0xe8b848, cap: 0xd8a838 },
};
function limb(g, mat, r, len, x, y, z) { g.add(CAP(r, len, mat, x, y, z)); }
function humanoid(kind) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const P = {}; const pal = PAL[kind];
  const big = kind === 'heavy' || kind === 'boss';
  const sc = kind === 'boss' ? 1.45 : kind === 'heavy' ? 1.18 : 1.04; body.scale.setScalar(sc);
  const coat = L(pal.coat, 0.8, 0.34), coat2 = L(pal.coat2, 0.85, 0.3), pants = L(pal.pants, 0.85, 0.3), trim = steel(pal.trim, 0.3), cap = kind === 'officer' ? L(pal.cap, 0.6, 0.25) : steel(pal.cap, 0.22);
  const skin = L(0xf2c4a2, 0.55, 0.38), skin2 = L(0xd89c7c, 0.6, 0.3), boot = L(0x1c1410, 0.5, 0.3), bootT = L(0x070504, 0.7, 0.1);
  const leather = L(0x6a4426, 0.7, 0.3), glove = kind === 'officer' ? L(0xf4f4f4, 0.6, 0.35) : L(0x2c2218, 0.7, 0.3), red = L(0xd01818, 0.6, 0.45), white = L(0xf4f4f0, 0.5, 0.3), dark = L(0x0a0a0c, 0.5, 0.1), gold = steel(0xe8c040, 0.35);
  // ---- 腿 ----
  const mkLeg = (sx) => {
    const leg = new THREE.Group(); leg.position.set(sx * 0.115, 0.92, 0);
    leg.add(CAP(0.088, 0.26, pants, 0, -0.23, 0));
    if (kind === 'officer') { leg.add(RB(0.2, 0.2, 0.14, 0.06, L(0x6a644e, 0.8, 0.3), sx * 0.03, -0.17, 0.0)); } // 馬褲膨出
    const knee = new THREE.Group(); knee.position.set(0, -0.46, 0); leg.add(knee);
    knee.add(SP(0.07, pants, 0, 0, 0));
    knee.add(CAP(0.07, 0.26, kind === 'officer' ? boot : pants, 0, -0.2, 0));
    knee.add(RB(0.15, 0.13, 0.27, 0.05, boot, 0, -0.42, 0.045));
    knee.add(RB(0.155, 0.03, 0.285, 0.012, bootT, 0, -0.486, 0.045));
    knee.add(RB(0.14, 0.05, 0.1, 0.02, boot, 0, -0.36, 0.1));  // 鞋頭隆起
    knee.add(TOR(0.074, 0.012, leather, 0, -0.33, 0, 'y'));    // 綁腿帶
    if (big) knee.add(RB(0.13, 0.16, 0.1, 0.03, steel(pal.trim, 0.2), 0, -0.04, 0.07));
    leg.add(knee); body.add(leg); return [leg, knee];
  };
  [P.legL, P.kneeL] = mkLeg(-1); [P.legR, P.kneeR] = mkLeg(1);
  // ---- 軀幹 ----
  const torso = new THREE.Group(); torso.position.y = 0.92; body.add(torso); P.torso = torso;
  torso.add(RB(0.36, 0.17, 0.25, 0.07, pants, 0, 0.05, 0));
  torso.add(RB(0.47, 0.52, 0.27, 0.11, coat, 0, 0.4, 0));
  torso.add(RB(0.46, 0.2, 0.275, 0.07, coat2, 0, 0.18, 0));               // 下擺
  torso.add(RB(0.5, 0.065, 0.29, 0.02, leather, 0, 0.12, 0.0));           // 腰帶
  torso.add(RB(0.07, 0.055, 0.02, 0.008, gold, 0, 0.12, 0.148));           // 帶扣
  for (const sx of [-1, 1]) { torso.add(RB(0.085, 0.1, 0.055, 0.02, leather, sx * 0.14, 0.12, 0.15)); torso.add(RB(0.075, 0.03, 0.058, 0.01, L(0x4a2e18, 0.7, 0.3), sx * 0.14, 0.16, 0.152)); } // 彈袋
  torso.add(RB(0.11, 0.15, 0.06, 0.02, leather, 0.26, 0.05, 0.02));        // 槍套
  torso.add(CY(0.05, 0.05, 0.13, L(0x5a6a3a, 0.7, 0.3), -0.26, 0.04, -0.1, 'y'));    // 水壺
  for (let i = 0; i < 4; i++) torso.add(SP(0.012, gold, 0.0, 0.28 + i * 0.1, 0.136));                // 鈕釦
  torso.add(RB(0.012, 0.44, 0.012, 0.004, coat2, 0, 0.4, 0.137));
  for (const sx of [-1, 1]) { torso.add(RB(0.1, 0.09, 0.03, 0.01, coat2, sx * 0.13, 0.48, 0.135)); torso.add(RB(0.1, 0.022, 0.034, 0.008, coat, sx * 0.13, 0.52, 0.136)); } // 胸口袋
  for (const sx of [-1, 1]) torso.add(RB(0.03, 0.43, 0.012, 0.004, leather, sx * 0.12, 0.4, 0.143));      // 背帶（前）
  torso.add(RB(0.2, 0.07, 0.2, 0.025, coat2, 0, 0.675, 0));                // 領座
  for (const sx of [-1, 1]) torso.add(RB(0.07, 0.06, 0.03, 0.01, kind === 'officer' ? red : kind === 'guard' ? red : trim, sx * 0.07, 0.66, 0.1)); // 領章
  for (const sx of [-1, 1]) { const sb = RB(0.14, 0.02, 0.1, 0.008, kind === 'officer' ? gold : coat2, sx * 0.25, 0.66, 0); sb.rotation.z = -sx * 0.18; torso.add(sb); } // 肩章
  if (kind === 'officer') {
    const sash = RB(0.06, 0.62, 0.012, 0.004, red, 0.0, 0.4, 0.141); sash.rotation.z = 0.7; torso.add(sash);
    for (let i = 0; i < 3; i++) torso.add(SP(0.013, gold, -0.12 + i * 0.03, 0.46 - i * 0.03, 0.15));
    torso.add(CY(0.006, 0.006, 0.26, gold, -0.2, 0.44, 0.1, 'y'));   // 飾繩
    torso.add(RB(0.07, 0.08, 0.03, 0.01, gold, 0.1, 0.5, 0.145));    // 勳章
  }
  if (big) {
    torso.add(RB(0.58, 0.36, 0.34, 0.1, steel(pal.trim, 0.12), 0, 0.46, 0.0));                // 胸甲
    torso.add(RB(0.3, 0.3, 0.05, 0.03, steel(pal.coat, 0.22), 0, 0.42, 0.18));
    for (let i = 0; i < 4; i++) { torso.add(SP(0.015, gold, -0.2 + (i % 2) * 0.4, 0.33 + Math.floor(i / 2) * 0.2, 0.18)); }
    torso.add(RB(0.34, 0.5, 0.03, 0.01, L(0x7a1c1c, 0.85, 0.3), 0, 0.02, 0.17));              // 前垂布
    torso.add(RB(0.1, 0.1, 0.034, 0.01, gold, 0, 0.02, 0.19));                                  // 徽
    for (const sx of [-1, 1]) torso.add(SP(0.17, steel(pal.trim, 0.14), sx * 0.34, 0.64, 0, 1, 0.75, 1.1));   // 肩甲
    if (kind === 'boss') for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) torso.add(CONE(0.025, 0.1, gold, sx * (0.34 + i * 0.02), 0.78 + (i === 1 ? 0.03 : 0), 0 - i * 0.04, 'y'));
  }
  if (kind === 'boss') { const cape = RB(0.5, 0.95, 0.03, 0.01, L(0x6a1018, 0.85, 0.28), 0, 0.15, -0.17); cape.rotation.x = 0.1; torso.add(cape); P.cape = cape; torso.add(RB(0.5, 0.05, 0.05, 0.02, gold, 0, 0.62, -0.15)); }
  else torso.add(RB(0.3, 0.3, 0.1, 0.04, L(0x4a4034, 0.8, 0.3), 0, 0.38, -0.18));                  // 背包
  // ---- 頭 ----
  const head = new THREE.Group(); head.position.set(0, 0.76, 0); torso.add(head); P.head = head;
  head.add(CY(0.058, 0.066, 0.1, skin2, 0, 0.0, 0));
  head.add(SP(0.125, skin, 0, 0.15, 0.01, 0.9, 1.08, 1.0));
  head.add(SP(0.07, skin, 0, 0.065, 0.075, 1.0, 0.7, 0.75));                         // 下顎
  head.add(RB(0.026, 0.045, 0.04, 0.012, skin, 0, 0.14, 0.118));                      // 鼻
  for (const sx of [-1, 1]) {
    head.add(SP(0.03, white, sx * 0.05, 0.175, 0.098, 1, 0.8, 0.5)); head.add(SP(0.015, L(0x3a78b8, 0.3, 0.4), sx * 0.05, 0.175, 0.116, 1, 1, 0.5)); head.add(SP(0.007, dark, sx * 0.05, 0.175, 0.121));
    head.add(RB(0.06, 0.012, 0.02, 0.005, kind === 'officer' ? L(0x6a5030, 0.8, 0.2) : L(0x5a3a1c, 0.8, 0.2), sx * 0.05, 0.212, 0.108));   // 眉
    head.add(SP(0.028, skin2, sx * 0.112, 0.15, 0, 0.4, 1, 0.8));                       // 耳
  }
  head.add(RB(0.05, 0.01, 0.015, 0.004, L(0x6a2a20, 0.6, 0.2), 0, 0.085, 0.118));    // 嘴
  if (kind === 'officer') head.add(RB(0.045, 0.012, 0.015, 0.005, L(0x6a5030, 0.8, 0.2), 0, 0.103, 0.118)); // 小鬍
  // 頭盔 / 帽
  if (kind === 'guard') {
    const hg = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const h = new THREE.Mesh(hg, cap); h.scale.set(0.15, 0.135, 0.165); h.position.set(0, 0.2, 0.0); head.add(h);
    head.add(TOR(0.145, 0.014, cap, 0, 0.195, 0.0, 'y'));
    head.add(RB(0.22, 0.04, 0.05, 0.015, cap, 0, 0.19, -0.16));                                // 後頸護
    head.add(SP(0.025, L(0xd0d0d0, 0.4, 0.3), 0.115, 0.22, 0.05, 0.3, 1, 1));                      // 盔徽
    head.add(RB(0.014, 0.1, 0.01, 0.004, leather, -0.1, 0.1, 0.07), RB(0.014, 0.1, 0.01, 0.004, leather, 0.1, 0.1, 0.07));   // 下巴帶
  } else if (kind === 'officer') {
    head.add(CY(0.14, 0.145, 0.07, cap, 0, 0.225, 0, 'y', 24));
    const top = CY(0.19, 0.145, 0.06, cap, 0, 0.275, 0.01, 'y', 24); head.add(top);
    head.add(TOR(0.145, 0.008, gold, 0, 0.215, 0, 'y'));
    head.add(RB(0.22, 0.012, 0.1, 0.005, L(0x0c0c10, 0.3, 0.2), 0, 0.2, 0.13));                    // 帽簷
    head.add(SP(0.028, gold, 0, 0.25, 0.145, 1, 1, 0.4));                                        // 帽徽
    head.add(RB(0.012, 0.03, 0.01, 0.004, red, 0, 0.22, 0.147));
  } else if (kind === 'heavy') {
    const hg = new THREE.CylinderGeometry(0.15, 0.165, 0.34, 20); const h = new THREE.Mesh(hg, cap); h.position.set(0, 0.17, 0); head.add(h);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cap); dome.scale.set(0.15, 0.1, 0.15); dome.position.set(0, 0.34, 0); head.add(dome);
    head.add(RB(0.25, 0.04, 0.02, 0.01, dark, 0, 0.16, 0.162)); head.add(RB(0.25, 0.02, 0.022, 0.008, glow(0xff4020), 0, 0.16, 0.166));   // 面罩縫（發紅光）
    head.add(RB(0.03, 0.2, 0.02, 0.008, dark, 0, 0.12, 0.162));
    head.add(RB(0.05, 0.36, 0.3, 0.02, trim, 0, 0.2, 0.0));                                   // 盔脊
    for (let i = 0; i < 4; i++) head.add(SP(0.012, gold, 0.1 - i * 0.065, 0.28, 0.155));
  } else {
    const hg = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const h = new THREE.Mesh(hg, cap); h.scale.set(0.16, 0.15, 0.17); h.position.set(0, 0.2, 0); head.add(h);
    head.add(TOR(0.155, 0.016, trim, 0, 0.2, 0, 'y'));
    head.add(RB(0.24, 0.045, 0.02, 0.01, dark, 0, 0.17, 0.16)); head.add(RB(0.03, 0.17, 0.022, 0.01, dark, 0, 0.12, 0.16));
    head.add(RB(0.22, 0.016, 0.022, 0.006, glow(0xff5030), 0, 0.17, 0.166));
    for (const sx of [-1, 1]) { const hn = CONE(0.045, 0.34, trim, sx * 0.16, 0.34, 0, 'y'); hn.rotation.z = -sx * 0.9; head.add(hn); head.add(SP(0.045, trim, sx * 0.14, 0.24, 0)); }
    head.add(RB(0.04, 0.22, 0.3, 0.02, trim, 0, 0.3, -0.01));
    head.add(CONE(0.035, 0.14, red, 0, 0.45, -0.03, 'y'));
  }
  // ---- 手臂 ----
  const mkArm = (sx) => {
    const a = new THREE.Group(); a.position.set(sx * 0.31, 1.36, 0);
    a.add(SP(0.075, coat, 0, 0, 0));
    a.add(CAP(0.057, 0.2, coat, 0, -0.17, 0));
    if (kind === 'guard' && sx < 0) a.add(TOR(0.06, 0.02, red, 0, -0.14, 0, 'y'));           // 紅色臂章
    if (kind === 'guard' && sx < 0) a.add(TOR(0.062, 0.006, white, 0, -0.14, 0, 'y'));
    const elbow = new THREE.Group(); elbow.position.set(0, -0.35, 0); elbow.rotation.x = -0.2; a.add(elbow);
    elbow.add(SP(0.05, coat, 0, 0, 0));
    elbow.add(CAP(0.049, 0.2, coat2, 0, -0.16, 0));
    elbow.add(TOR(0.052, 0.012, kind === 'officer' ? gold : leather, 0, -0.29, 0, 'y'));    // 袖口
    // 手
    elbow.add(RB(0.075, 0.09, 0.05, 0.022, glove, 0, -0.37, 0.0));
    for (let i = 0; i < 4; i++) elbow.add(CAP(0.011, 0.03, glove, -0.025 + i * 0.0165, -0.435, 0.0));
    elbow.add(CAP(0.012, 0.035, glove, sx * -0.045, -0.37, 0.025, 'z'));
    if (big) { a.add(SP(0.1, steel(pal.trim, 0.14), 0, 0.02, 0, 1, 0.9, 1)); elbow.add(RB(0.12, 0.2, 0.12, 0.04, steel(pal.trim, 0.14), 0, -0.14, 0)); }
    body.add(a); a.userData.elbow = elbow; return a;
  };
  P.armL = mkArm(-1); P.armR = mkArm(1);
  // ---- 武器（握在右手）----
  const wp = new THREE.Group(); wp.position.set(0, -0.38, 0.0);
  P.armR.userData.elbow.add(wp);
  let gun, muzzleZ;
  if (kind === 'boss') {
    gun = new THREE.Group();
    const gm = steel(0x2a2e36, 0.25);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; gun.add(CY(0.017, 0.017, 0.75, gm, Math.cos(a) * 0.055, Math.sin(a) * 0.055, -0.4, 'z', 10)); }
    const hub = CY(0.095, 0.095, 0.16, steel(0x3a3f4a, 0.2), 0, 0, -0.04, 'z'); gun.add(hub);
    gun.add(CY(0.07, 0.07, 0.1, steel(0x555b66, 0.2), 0, 0, -0.75, 'z'), RB(0.1, 0.16, 0.22, 0.03, steel(0x2a2e36, 0.2), 0, -0.1, 0.1));
    gun.add(CY(0.1, 0.1, 0.22, L(0x6a5a2a, 0.5, 0.3, 0.3), 0, -0.2, 0.15, 'x')); // 彈鼓
    P.barrels = gun; muzzleZ = -0.82; gun.scale.setScalar(0.9);
  } else {
    const id = kind === 'guard' ? 'rifle' : kind === 'officer' ? 'pistol' : 'shotgun';
    gun = buildGun(id, true, { noScope: true }).group; const sx_ = kind === 'officer' ? 1.0 : 0.82; gun.scale.setScalar(sx_);
    muzzleZ = id === 'rifle' ? -0.93 * sx_ : id === 'pistol' ? -0.2 * sx_ : -0.8 * sx_;
  }
  const holder = new THREE.Group(); holder.rotation.set(-Math.PI / 2, 0, Math.PI); holder.position.set(0, -0.04, 0.0); holder.add(gun); wp.add(holder);
  const mz = new THREE.Object3D(); mz.position.set(0, 0, muzzleZ); gun.add(mz); P.muzzle = mz;
  P.armLBase = true;
  addOutline(root, kind === 'boss' ? 0x1a0408 : 0x07090e, 0.013);
  return { root, body, P, sc, kind };
}

function dogModel() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body); body.scale.setScalar(1.25);
  const fur = L(0xd09a58, 0.85, 0.36), fur2 = L(0x4a3018, 0.9, 0.3), cream = L(0xf0dcb0, 0.85, 0.38), tooth = L(0xffffff, 0.4, 0.5), dark = L(0x0a0806, 0.5, 0.1), red = L(0xd01818, 0.5, 0.45), gold = steel(0xe8c040, 0.4);
  const P = {};
  // 軀幹：胸、腰
  body.add(CAP(0.17, 0.4, fur, 0, 0.62, 0, 'z'));
  body.add(SP(0.19, fur, 0, 0.63, 0.28, 1, 1, 1.0));               // 胸
  body.add(SP(0.16, fur, 0, 0.62, -0.3, 1, 1, 1.1));               // 臀
  const saddle = CAP(0.14, 0.45, fur2, 0, 0.72, -0.02, 'z'); saddle.scale.set(1, 0.55, 1); body.add(saddle); // 黑色馬鞍紋
  body.add(SP(0.15, cream, 0, 0.55, 0.32, 0.9, 0.9, 0.9));        // 胸前淺色
  // 頸、頭
  const neck = CAP(0.1, 0.16, fur, 0, 0.78, 0.4, 'y'); neck.rotation.x = 0.7; body.add(neck);
  const collar = TOR(0.105, 0.017, red, 0, 0.8, 0.36, 'y'); collar.rotation.x = Math.PI / 2 - 0.55; body.add(collar);   // 紅項圈
  body.add(SP(0.02, gold, 0, 0.7, 0.44));                                                   // 狗牌
  const head = new THREE.Group(); head.position.set(0, 0.9, 0.5); body.add(head); P.head = head;
  head.add(SP(0.13, fur, 0, 0, 0, 1, 0.95, 1.05));
  head.add(CAP(0.07, 0.1, fur2, 0, -0.04, 0.17, 'z'));              // 口鼻
  head.add(SP(0.04, dark, 0, 0.0, 0.29, 1, 0.8, 0.8));              // 鼻
  const jaw = new THREE.Group(); jaw.position.set(0, -0.07, 0.1); jaw.add(CAP(0.05, 0.1, fur2, 0, -0.01, 0.1, 'z')); jaw.add(RB(0.06, 0.012, 0.1, 0.004, L(0xd05060, 0.5, 0.4), 0, 0.03, 0.1));
  for (const sx of [-1, 1]) jaw.add(CONE(0.009, 0.03, tooth, sx * 0.035, 0.05, 0.16, 'y'));
  head.add(jaw); P.jaw = jaw;
  for (const sx of [-1, 1]) {
    head.add(CONE(0.009, 0.03, tooth, sx * 0.04, -0.06, 0.25, 'y'));
    const ear = CONE(0.055, 0.2, fur2, sx * 0.075, 0.17, -0.03, 'y'); ear.rotation.z = -sx * 0.25; ear.rotation.x = 0.15; head.add(ear);
    head.add(SP(0.028, L(0xffa020, 0.3, 0.9), sx * 0.07, 0.06, 0.12, 1, 0.8, 0.6)); head.add(SP(0.012, dark, sx * 0.072, 0.06, 0.135));
    const brow = RB(0.06, 0.014, 0.02, 0.005, fur2, sx * 0.07, 0.11, 0.12); brow.rotation.z = sx * 0.3; head.add(brow);
  }
  // 尾巴
  const tail = new THREE.Group(); tail.position.set(0, 0.7, -0.42); tail.add(CAP(0.035, 0.28, fur2, 0, 0.1, -0.05)); tail.rotation.x = 0.9; body.add(tail); P.tail = tail;
  // 四肢
  P.legs = [];
  for (const [x, z, front] of [[-0.11, 0.3, 1], [0.11, 0.3, 1], [-0.11, -0.3, 0], [0.11, -0.3, 0]]) {
    const l = new THREE.Group(); l.position.set(x, 0.55, z);
    l.add(CAP(front ? 0.055 : 0.07, 0.18, fur, 0, -0.14, 0));
    l.add(CAP(0.038, 0.2, fur2, 0, -0.38, front ? 0.0 : -0.02));
    l.add(RB(0.085, 0.05, 0.14, 0.022, cream, 0, -0.53, 0.03));
    for (let i = -1; i <= 1; i++) l.add(SP(0.012, dark, i * 0.025, -0.545, 0.1));
    body.add(l); P.legs.push(l);
  }
  addOutline(root, 0x0a0604, 0.012, 0.03);
  return { root, body, P, sc: 1.25, kind: 'dog' };
}

const FLASHMAT = new THREE.MeshBasicMaterial({ color: 0xff6a5a });

export class Enemy {
  constructor(def, mgr) {
    this.mgr = mgr; this.type = def.type; this.T = TYPES[def.type];
    this.hp = this.T.hp; this.maxHp = this.T.hp;
    this.x = (def.gx + 0.5) * CELL; this.z = (def.gz + 0.5) * CELL;
    this.face = Math.atan2(Math.cos(def.angle), Math.sin(def.angle)); // 模型 +z 為正面
    this.state = 'idle'; this.t = Math.random() * 3; this.react = 0; this.cool = 1; this.windT = 0; this.shots = 0; this.burstLeft = 0;
    this.pain = 0; this.dead = false; this.deadT = 0; this.flashT = 0; this.walkP = Math.random() * 6; this.aimed = 0;
    this.stuck = 0; this.sigX = this.x; this.sigZ = this.z; this.openT = 0; this.stateTimer = 0; this.alertT = 0;
    const m = def.type === 'dog' ? dogModel() : humanoid(def.type);
    this.m = m; this.group = m.root; this.group.position.set(this.x, 0, this.z);
    this.group.traverse((o) => { if (o.isMesh) o.userData.orig = o.material; });
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4 * m.sc, 1.4 * m.sc), new THREE.MeshBasicMaterial({ map: sprites().blob, transparent: true, depthWrite: false, opacity: 0.8 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; this.group.add(blob); this.blob = blob;
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprites().flash, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    fl.visible = false; fl.scale.setScalar(def.type === 'boss' ? 0.9 : 0.5); this.fl = fl; mgr.scene.add(fl); this.flT = 0;
    this.light = null;
    mgr.scene.add(this.group);
    this.boss = def.type === 'boss';
    this.drop = null;
  }
  get cell() { return [Math.floor(this.x / CELL), Math.floor(this.z / CELL)]; }
  setFlash(on) {
    this.group.traverse((o) => { if (o.isMesh && o.userData.orig) o.material = on ? FLASHMAT : o.userData.orig; });
  }
  // ---- 動畫 ----
  animate(dt, moving) {
    const P = this.m.P, T = this.T, g = this.group, body = this.m.body;
    this.walkP += dt * (moving ? T.speed * 3.3 : 0);
    const s = Math.sin(this.walkP), c = Math.cos(this.walkP);
    g.position.x = this.x; g.position.z = this.z;
    let rotY = this.face;
    if (this.type === 'dog') {
      const gallop = moving ? 1 : 0;
      P.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.walkP * 1.4 + (i < 2 ? 0 : 2.4) + (i % 2) * 0.6) * 0.9 * gallop; });
      body.position.y = gallop ? Math.abs(Math.cos(this.walkP * 1.4)) * 0.08 : 0;
      P.tail.rotation.z = Math.sin(this.t * 6) * 0.4;
      P.jaw.rotation.x = this.state === 'attack' ? 0.5 + Math.sin(this.t * 25) * 0.3 : 0;
      if (this.state === 'attack') body.position.z = 0.3 * Math.sin(Math.min(1, this.windT / 0.3) * Math.PI);
      else body.position.z = 0;
    } else {
      const aiming = this.state === 'attack' || (this.state === 'alert' && this.react > 0);
      P.legL.rotation.x = moving ? s * 0.8 : 0; P.legR.rotation.x = moving ? -s * 0.8 : 0;
      P.kneeL.rotation.x = moving ? Math.max(0, -s) * 1.0 : 0; P.kneeR.rotation.x = moving ? Math.max(0, s) * 1.0 : 0;
      if (P.cape) P.cape.rotation.x = 0.1 + (moving ? 0.25 + Math.sin(this.walkP * 0.5) * 0.08 : Math.sin(this.t * 1.5) * 0.03);
      body.position.y = moving ? Math.abs(c) * 0.04 : (Math.sin(this.t * 1.7) * 0.004);
      P.torso.rotation.y = 0; P.torso.rotation.x = 0;
      if (this.state === 'attack') {
        const aim = Math.min(1, this.aimed);
        P.armR.rotation.set(-1.45 * aim + (1 - aim) * 0, 0.0, 0);
        P.armL.rotation.set(-1.25 * aim, 0.5 * aim, 0);
        if (this.m.P.armLBase) P.armL.rotation.set(-1.25 * aim, 0.6 * aim, 0);
        const kick = Math.max(0, 1 - this.sinceShot * 8);
        P.armR.rotation.x -= kick * 0.18; P.torso.rotation.x = -kick * 0.06;
        if (this.type === 'boss' && P.barrels) P.barrels.rotation.z += dt * 18 * (this.sinceShot < 0.2 ? 1 : 0.1);
      } else if (this.state === 'pain') {
        P.armR.rotation.set(-0.3, 0, 0); P.armL.rotation.set(-0.5, 0, 0); P.torso.rotation.x = -0.3;
      } else {
        P.armR.rotation.set(moving ? -s * 0.5 - 0.6 : -0.5, 0, 0); P.armL.rotation.set(moving ? s * 0.6 : 0.1, 0, 0);
        if (this.state === 'chase') { P.armR.rotation.x = -1.0 - s * 0.15; }
      }
      P.head.rotation.y = 0;
    }
    if (this.dead) {
      const k = Math.min(1, this.deadT / 0.7), e = 1 - Math.pow(1 - k, 3);
      if (this.type === 'dog') { g.rotation.set(0, rotY, e * 1.45); g.position.y = e * 0.28; }
      else {
        g.rotation.set(-e * 1.5, rotY, 0, 'YXZ'); g.position.y = e * 0.18 * this.m.sc;
        P.armL.rotation.x = -0.6 * e; P.armR.rotation.z = -0.5 * e;
        P.legL.rotation.x = -0.3 * e; P.legR.rotation.x = 0.4 * e; P.kneeL.rotation.x = 0.5 * e; P.kneeR.rotation.x = 0.2 * e;
      }
      this.blob.scale.setScalar(1 + e * 0.7);
    } else {
      g.rotation.set(0, rotY, 0); g.position.y = 0;
    }
  }
}

export class Enemies {
  constructor(scene, world, level, ctx) {
    this.scene = scene; this.world = world; this.level = level; this.ctx = ctx;
    this.list = level.enemies.map((d) => new Enemy(d, this));
    this.field = null; this.fieldKey = -1; this.fieldT = 0;
    this.flashes = [];
  }
  get alive() { return this.list.filter((e) => !e.dead).length; }
  dispose() { for (const e of this.list) { this.scene.remove(e.group); this.scene.remove(e.fl); } }
  makeField(px, pz) {
    const gx = Math.floor(px / CELL), gz = Math.floor(pz / CELL), key = gz * this.world.W + gx;
    if (key !== this.fieldKey) { this.field = this.world.distField(gx, gz, 120); this.fieldKey = key; }
  }
  // 聲響：槍聲讓附近（路徑距離）的敵人警覺
  noise(px, pz, cells = 14) {
    this.makeField(px, pz);
    const W = this.world.W;
    for (const e of this.list) {
      if (e.dead || e.state !== 'idle') continue;
      const [gx, gz] = e.cell, d = this.field[gz * W + gx];
      if (d >= 0 && d <= cells) this.wake(e, 0.3 + Math.random() * 0.6);
    }
  }
  wake(e, delay = 0.4) {
    if (e.state !== 'idle') return;
    e.state = 'alert'; e.react = delay; this.ctx.sfx && this.ctx.sfx('alert_' + e.type, e.x, e.z);
  }
  // 射線檢查
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null, bt = maxT;
    const lh = Math.hypot(dx, dz);
    for (const e of this.list) {
      if (e.dead) continue;
      const fx = ox - e.x, fz = oz - e.z, r = e.T.r + 0.08;
      const a = lh * lh, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - r * r;
      if (a < 1e-9) continue;
      const disc = b * b - 4 * a * c; if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t < 0 || t > bt) continue;
      const y = oy + dy * t; if (y < 0 || y > e.T.h) continue;
      bt = t; best = { e, t, head: y > e.T.h * 0.78 && e.type !== 'dog', y };
    }
    return best ? { enemy: best.e, t: best.t, head: best.head, y: best.y } : null;
  }
  hurt(e, dmg, head = false, fromX, fromZ) {
    if (e.dead) return false;
    if (head) dmg *= 2;
    e.hp -= dmg; e.flashT = 0.09; e.setFlash(true);
    if (e.state === 'idle') { e.state = 'chase'; e.react = 0; }
    if (e.state === 'alert') { e.state = 'chase'; e.react = 0; }
    if (e.hp <= 0) { this.kill(e); return true; }
    this.ctx.sfx && this.ctx.sfx('hurt_' + e.type, e.x, e.z);
    if (Math.random() < e.T.pain && e.state !== 'pain') { e.state = 'pain'; e.stateTimer = 0.32; e.windT = 0; e.aimed = 0; }
    return false;
  }
  kill(e) {
    e.dead = true; e.deadT = 0; e.state = 'dead'; e.setFlash(false);
    e.fl.visible = false;
    this.ctx.sfx && this.ctx.sfx('die_' + e.type, e.x, e.z);
    this.ctx.onKill && this.ctx.onKill(e);
  }
  moveToward(e, tx, tz, speed, dt) {
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
    if (d < 0.02) return false;
    const st = Math.min(d, speed * dt), r = e.T.r;
    const [nx, nz] = this.world.tryMove(e.x, e.z, dx / d * st, dz / d * st, r);
    const moved = Math.hypot(nx - e.x, nz - e.z);
    e.x = nx; e.z = nz;
    // 其他敵人推開
    for (const o of this.list) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz), min = e.T.r + o.T.r;
      if (od < min && od > 0.001) { const p = (min - od) * 0.5; const [ax, az] = this.world.tryMove(e.x, e.z, ox / od * p, oz / od * p, r); e.x = ax; e.z = az; }
    }
    return moved > st * 0.25;
  }
  turnTo(e, ang, dt, rate = 9) {
    let d = ang - e.face; d = Math.atan2(Math.sin(d), Math.cos(d));
    e.face += Math.max(-rate * dt, Math.min(rate * dt, d));
  }
  follow(e, dt, speed) {
    const W = this.world.W, [gx, gz] = e.cell, f = this.field;
    let best = f[gz * W + gx], bx = -1, bz = -1;
    if (best < 0) best = 1e9;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (!this.world.inb(nx, nz)) continue;
      const d = f[nz * W + nx]; if (d < 0) continue;
      if (dx && dz && (f[gz * W + nx] < 0 || f[nz * W + gx] < 0)) continue;
      if (dx && dz && (this.world.rawSolid(nx, gz) || this.world.rawSolid(gx, nz))) continue;
      const score = d + (dx && dz ? 0.4 : 0);
      if (score < best) { best = score; bx = nx; bz = nz; }
    }
    if (bx < 0) return false;
    // 門
    const di = bz * W + bx, door = this.world.doorAt.get(di);
    if (door && door.target === 0) this.world.openDoor(door, { gold: true, silver: true });
    const tx = (bx + 0.5) * CELL, tz = (bz + 0.5) * CELL;
    this.turnTo(e, Math.atan2(tx - e.x, tz - e.z), dt, 8);
    return this.moveToward(e, tx, tz, speed, dt);
  }
  shoot(e, p) {
    const T = e.T, dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
    e.sinceShot = 0;
    const m = e.m.P.muzzle; e.group.updateMatrixWorld(true);
    const wp = new THREE.Vector3(); m.getWorldPosition(wp);
    e.fl.position.copy(wp); e.fl.visible = true; e.flT = 0.06; e.fl.material.rotation = Math.random() * 6;
    this.ctx.sfx && this.ctx.sfx('shot_' + e.type, e.x, e.z);
    const pellets = T.pellets || 1;
    let hits = 0;
    for (let i = 0; i < pellets; i++) {
      let chance = T.acc * Math.max(0.12, 1 - d / 24) * (p.moving ? 0.72 : 1) * (this.world.los(e.x, e.z, p.x, p.z) ? 1 : 0);
      if (e.type === 'heavy') chance *= 0.9;
      if (Math.random() < chance) hits++;
    }
    if (hits) {
      const dmg = Math.round((T.dmg[0] + Math.random() * (T.dmg[1] - T.dmg[0])) * (pellets > 1 ? hits / pellets * 1.4 : 1));
      this.ctx.hitPlayer(Math.max(1, dmg), e.x, e.z, e);
    } else this.ctx.sfx && this.ctx.sfx('whiz', p.x, p.z);
  }
  update(dt, p) {
    this.makeField(p.x, p.z);
    const W = this.world.W;
    for (const e of this.list) {
      e.t += dt; e.sinceShot = (e.sinceShot ?? 9) + dt;
      if (e.flashT > 0) { e.flashT -= dt; if (e.flashT <= 0) e.setFlash(false); }
      if (e.flT > 0) { e.flT -= dt; if (e.flT <= 0) e.fl.visible = false; }
      if (e.dead) { e.deadT += dt; e.animate(dt, false); continue; }
      const T = e.T, dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz);
      const los = p.alive && dist < 60 && this.world.los(e.x, e.z, p.x, p.z);
      const toP = Math.atan2(dx, dz);
      let moving = false;
      switch (e.state) {
        case 'idle': {
          if (!p.alive) break;
          // 偶爾轉頭
          const dot = Math.sin(e.face) * dx / (dist || 1) + Math.cos(e.face) * dz / (dist || 1);
          const seeRange = p.moving || p.firing ? T.sight : T.sight * 0.6;
          if (los && ((dot > 0.15 && dist < seeRange) || dist < 4.5)) this.wake(e, 0.25 + Math.random() * 0.5);
          break;
        }
        case 'alert': {
          this.turnTo(e, toP, dt, 7);
          e.react -= dt; if (e.react <= 0) { e.state = 'chase'; e.stateTimer = 0; }
          break;
        }
        case 'pain': {
          e.stateTimer -= dt; if (e.stateTimer <= 0) e.state = 'chase';
          break;
        }
        case 'chase': {
          if (!p.alive) { e.state = 'idle'; break; }
          e.cool -= dt;
          const inRange = los && dist < T.range;
          if (T.melee) {
            if (dist < 1.5 && los) { e.state = 'attack'; e.windT = 0; e.hitDone = false; break; }
            if (los) { this.turnTo(e, toP, dt, 12); moving = this.moveToward(e, p.x, p.z, T.speed, dt); }
            else moving = this.follow(e, dt, T.speed);
          } else if (inRange && e.cool <= 0 && (dist > 3 || Math.random() < 0.5)) {
            e.state = 'attack'; e.windT = 0; e.aimed = 0; e.burstLeft = T.burst; e.shotT = 0;
          } else if (los && dist < T.range * 0.34 && dist > 3.5) {
            // 保持距離、微調面向
            this.turnTo(e, toP, dt, 6);
          } else if (los && dist > 3) {
            this.turnTo(e, toP, dt, 5);
            moving = this.follow(e, dt, T.speed * (e.type === 'boss' ? 0.9 : 1));
          } else moving = this.follow(e, dt, T.speed);
          if (!moving && !los && dist > 1.5) { e.stuck += dt; if (e.stuck > 1.2) { e.stuck = 0; /* 抖動脫困 */ const a = Math.random() * 6.28; this.moveToward(e, e.x + Math.cos(a), e.z + Math.sin(a), T.speed, 0.3); } } else e.stuck = 0;
          if (los && dist < 10 && e.cool < 0.2 && Math.random() < 0.01) e.cool = 0;
          break;
        }
        case 'attack': {
          if (!p.alive) { e.state = 'idle'; break; }
          this.turnTo(e, toP, dt, 10);
          if (T.melee) {
            e.windT += dt;
            if (!e.hitDone && e.windT > T.wind) {
              e.hitDone = true;
              if (dist < 1.9 && los) { this.ctx.hitPlayer(Math.round(T.dmg[0] + Math.random() * (T.dmg[1] - T.dmg[0])), e.x, e.z, e); this.ctx.sfx && this.ctx.sfx('bite', e.x, e.z); }
            }
            if (e.windT > 0.55) { e.state = 'chase'; e.cool = T.cd[0] + Math.random() * (T.cd[1] - T.cd[0]); }
          } else {
            e.windT += dt; e.aimed = Math.min(1, e.windT / T.wind * 1.3);
            if (e.windT >= T.wind) {
              e.shotT -= dt;
              if (e.shotT <= 0 && e.burstLeft > 0) {
                this.shoot(e, p); e.burstLeft--; e.shotT = e.type === 'boss' ? 0.09 : (T.burst > 1 ? 0.2 : 0.1);
              }
              if (e.burstLeft <= 0 && e.sinceShot > 0.25) {
                e.state = 'chase'; e.cool = T.cd[0] + Math.random() * (T.cd[1] - T.cd[0]);
                if (!los) e.cool *= 0.4;
              }
            }
            if (e.type === 'boss' && e.windT > 0.3) { /* 邊打邊逼近 */ if (dist > 6) moving = this.moveToward(e, p.x, p.z, T.speed * 0.5, dt); }
            if (e.type === 'heavy' && dist > 7) moving = this.moveToward(e, p.x, p.z, T.speed * 0.4, dt);
          }
          break;
        }
      }
      e.animate(dt, moving);
    }
  }
}
