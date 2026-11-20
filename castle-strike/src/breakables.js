// 可打破的雜物：木箱、木桶、陶甕、盆栽、牆上的畫
import * as THREE from 'three';
import { CELL } from './const.js';
import { sprites } from './textures.js';

const KINDS = {
  crate:  { hp: 30, h: 1.25, chips: [0x8a5a2e, 0x6a4222, 0x3a2616], snd: 'wood_break' },
  barrel: { hp: 30, h: 1.3,  chips: [0x7a4a26, 0x5a3418, 0x2c2c32], snd: 'wood_break' },
  urn:    { hp: 8,  h: 1.1,  chips: null, snd: 'pot_break' },
  plant:  { hp: 8,  h: 1.5,  chips: [0x9a5a3a, 0x2f7a3c, 0x3f9a4c], snd: 'pot_break' },
};
const chipGeo = new THREE.BoxGeometry(1, 1, 1);
const chipMats = new Map();
const chipMat = (c) => { if (!chipMats.has(c)) chipMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); return chipMats.get(c); };

export class Breakables {
  // H: { P, sfx(n,x,z), fx(x,y,z,k,n), drop(type,x,z,sub), dog(x,z), hurtPlayer(d,x,z), toast(t,c), noise(x,z,r) }
  constructor(level, world, H) {
    this.world = world; this.H = H; this.list = []; this.pics = []; this.chips = []; this.gas = [];
    for (const d of level.decor) {
      if (!KINDS[d.type] || !d._obj) continue;
      const K = KINDS[d.type];
      const circle = world.decorCircles.find((c) => Math.abs(c.x - d._obj.position.x) < 0.01 && Math.abs(c.z - d._obj.position.z) < 0.01);
      this.list.push({ d, K, obj: d._obj, circle, x: d._obj.position.x, z: d._obj.position.z, hp: K.hp, broken: false });
    }
    for (const p of level.paintings) {
      if (!p._obj) continue;
      const ry = p._obj.rotation.y, n = [Math.round(Math.sin(ry)), Math.round(Math.cos(ry))];
      this.pics.push({ p, obj: p._obj, n, x: p._obj.position.x, z: p._obj.position.z, broken: false, loot: Math.random() < 0.5 });
    }
  }

  // 子彈打到牆或擺設的落點；回傳 true 表示打中可破壞物
  shotAt(px, py, pz, dmg) {
    for (const b of this.list) {
      if (b.broken) continue;
      const r = b.circle ? b.circle.r : 0.6;
      if (Math.hypot(px - b.x, pz - b.z) < r + 0.2 && py < b.K.h + 0.4) {
        b.hp -= dmg; this.H.fx(px, py, pz, 'dust', 2);
        this.H.sfx(b.K.snd === 'pot_break' ? 'pot_hit' : 'wood_hit', b.x, b.z);
        b.obj.rotation.z = (Math.random() - 0.5) * 0.06; b.shakeT = 0.15;
        if (b.hp <= 0) this.breakObj(b);
        return true;
      }
    }
    for (const q of this.pics) {
      if (q.broken) continue;
      const rx = px - q.x, rz = pz - q.z, along = Math.abs(rx * q.n[1] - rz * q.n[0]), perp = Math.abs(rx * q.n[0] + rz * q.n[1]);
      if (along < 0.85 && perp < 0.35 && Math.abs(py - 1.85) < 0.65) { this.breakPic(q); return true; }
    }
    return false;
  }
  // 小刀：前方一小段距離內的雜物
  meleeAt(x, z, fx, fz, reach, dmg) {
    for (const b of this.list) {
      if (b.broken) continue;
      const rx = b.x - x, rz = b.z - z, along = rx * fx + rz * fz, lat = Math.abs(rx * fz - rz * fx);
      if (along > 0 && along < reach + (b.circle ? b.circle.r : 0.6) && lat < 0.7) { this.shotAt(b.x - fx * 0.3, 0.8, b.z - fz * 0.3, dmg); return true; }
    }
    return false;
  }

  chipBurst(x, y, z, colors, n, spread = 1) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(chipGeo, chipMat(colors[i % colors.length]));
      const s = 0.06 + Math.random() * 0.14; m.scale.set(s * (1 + Math.random() * 1.5), s * 0.6, s);
      m.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.6);
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const a = Math.random() * 6.283, v = (1.5 + Math.random() * 3) * spread;
      this.world.group.add(m);
      this.chips.push({ m, vx: Math.cos(a) * v, vy: 2 + Math.random() * 3.5, vz: Math.sin(a) * v, wr: (Math.random() - 0.5) * 18, life: 0, max: 1.6 + Math.random() * 0.8 });
    }
  }

  breakObj(b) {
    b.broken = true; this.world.group.remove(b.obj);
    if (b.circle) { const i = this.world.decorCircles.indexOf(b.circle); if (i >= 0) this.world.decorCircles.splice(i, 1); }
    this.world.decorCell.delete(b.d.gz * this.world.W + b.d.gx);
    const H = this.H, cols = b.K.chips || [b.obj.children[0]?.material?.color?.getHex?.() ?? 0xb0623a, 0xd4a640];
    this.chipBurst(b.x, 0.3, b.z, cols, b.d.type === 'crate' || b.d.type === 'barrel' ? 16 : 12);
    H.fx(b.x, 0.6, b.z, 'dust', 5); H.sfx(b.K.snd, b.x, b.z); H.noise(b.x, b.z, 5);
    this.loot(b.x, b.z, false);
  }

  breakPic(q) {
    q.broken = true; this.world.group.remove(q.obj);
    const x = q.x, z = q.z, H = this.H;
    this.chipBurst(x + q.n[0] * 0.3, 1.6, z + q.n[1] * 0.3, [0xb48a38, 0x6a4a2a, 0x3a5a7a, 0x9a3a2a], 10, 0.5);
    H.sfx('wood_break', x, z); H.fx(x, 1.8, z, 'dust', 4);
    // 牆上露出暗格
    const nx = q.n[0], nz = q.n[1]; // 指向房間內
    const niche = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
    niche.position.set(x - nx * 0.03, 1.85, z - nz * 0.03); niche.rotation.y = Math.atan2(nx, nz); this.world.group.add(niche);
    const stone = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 });
    for (const [w, h, ox, oy] of [[1.24, 0.08, 0, 0.44], [1.24, 0.08, 0, -0.44], [0.08, 0.96, -0.6, 0], [0.08, 0.96, 0.6, 0]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), stone); f.position.set(ox, oy, 0.01); niche.add(f);
    }
    if (q.loot) {
      const dx = x + nx * 0.9, dz = z + nz * 0.9;
      const r = Math.random();
      if (r < 0.45) H.drop('treasure', dx, dz, ['crown', 'chest', 'cross'][Math.floor(Math.random() * 3)]);
      else if (r < 0.75) H.drop(['potion_speed', 'shield', 'power'][Math.floor(Math.random() * 3)], dx, dz);
      else H.drop('armor', dx, dz);
      H.toast('畫後面有暗格！', 'good'); H.sfx('secret', x, z);
    }
  }

  loot(x, z) {
    const H = this.H, r = Math.random();
    if (r < 0.40) return;
    if (r < 0.65) { if (Math.random() < 0.3) H.drop('shells', x, z); else H.drop('ammo', x, z); return; }
    if (r < 0.80) { H.drop('treasure', x, z, ['cup', 'cross'][Math.floor(Math.random() * 2)]); return; }
    if (r < 0.90) { H.drop(['medkit', 'armor', 'food'][Math.floor(Math.random() * 3)], x, z); return; }
    if (r < 0.96) { H.drop(['potion_speed', 'shield', 'power'][Math.floor(Math.random() * 3)], x, z); return; }
    if (Math.random() < 0.5) { H.dog(x, z); H.toast('裡面躲著一隻狗！', 'bad'); }
    else this.makeGas(x, z);
  }

  makeGas(x, z) {
    const H = this.H, puffs = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprites().glow, color: 0x7ad040, transparent: true, opacity: 0, depthWrite: false }));
      s.position.set(x + (Math.random() - 0.5) * 1.4, 0.6 + Math.random() * 0.8, z + (Math.random() - 0.5) * 1.4);
      s.userData.ph = Math.random() * 6; this.world.group.add(s); puffs.push(s);
    }
    this.gas.push({ x, z, puffs, life: 0, max: 4.5, tick: 0.3 });
    H.sfx('gas', x, z); H.toast('毒氣！快離開', 'bad');
  }

  update(dt) {
    for (const b of this.list) if (b.shakeT > 0) { b.shakeT -= dt; if (b.shakeT <= 0) b.obj.rotation.z = 0; }
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const c = this.chips[i]; c.life += dt;
      if (c.life >= c.max) { this.world.group.remove(c.m); this.chips.splice(i, 1); continue; }
      if (c.m.position.y > 0.04 || c.vy > 0) {
        c.vy -= 14 * dt; c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt;
        c.m.rotation.x += c.wr * dt; c.m.rotation.z += c.wr * 0.7 * dt;
        if (c.m.position.y < 0.04) { c.m.position.y = 0.04; c.vy = -c.vy * 0.3; c.vx *= 0.5; c.vz *= 0.5; c.wr *= 0.4; if (Math.abs(c.vy) < 0.6) c.vy = 0; }
      }
      if (c.life > c.max - 0.4) c.m.scale.multiplyScalar(0.9);
    }
    const P = this.H.P;
    for (let i = this.gas.length - 1; i >= 0; i--) {
      const g = this.gas[i]; g.life += dt; const k = g.life / g.max;
      for (const s of g.puffs) {
        const sc = 1.2 + k * 3.2 + Math.sin(g.life * 2 + s.userData.ph) * 0.2; s.scale.set(sc, sc, 1);
        s.material.opacity = Math.min(0.55, g.life * 2) * (1 - k); s.position.y += dt * 0.15;
      }
      g.tick -= dt;
      if (g.tick <= 0) { g.tick = 0.5; if (P.alive && Math.hypot(P.x - g.x, P.z - g.z) < 2.6 * (0.6 + k)) this.H.hurtPlayer(4, g.x, g.z); }
      if (k >= 1) { for (const s of g.puffs) this.world.group.remove(s); this.gas.splice(i, 1); }
    }
  }
}
