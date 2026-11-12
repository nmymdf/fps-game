// 機關陷阱：尖刺地板、噴火牆、爆炸桶、掉落吊燈
import * as THREE from 'three';
import { CELL, WALL_H } from './const.js';
import { sprites } from './textures.js';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.3, ...o });
const glow = (color, size, op = 0.8) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprites().glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op }));
  s.scale.set(size, size, 1); return s;
};

export class Traps {
  // H: { P, enemies(), hurtPlayer(dmg,x,z), sfx(name,x,z), fx(x,y,z,kind,n), noise(x,z,r) }
  constructor(level, world, H) {
    this.H = H; this.world = world; this.t = 0;
    this.group = new THREE.Group(); world.group.add(this.group);
    this.spikes = []; this.flames = []; this.barrels = []; this.lusters = []; this.fire = [];
    for (const tr of level.traps || []) {
      if (tr.type === 'spike') this.addSpike(tr);
      else if (tr.type === 'flame') this.addFlame(tr);
      else if (tr.type === 'barrel') this.addBarrel(tr);
      else if (tr.type === 'chandelier') this.addLuster(tr);
    }
  }

  // ---------------- 尖刺 ----------------
  addSpike(tr) {
    const g = new THREE.Group(); g.position.set((tr.gx + 0.5) * CELL, 0, (tr.gz + 0.5) * CELL);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 2.6), new THREE.MeshBasicMaterial({ color: 0x2a1a14 }));
    plate.position.y = 0.025; g.add(plate);
    const cm = mat(0xc4c8d0, { metalness: 0.85, roughness: 0.28 }), cones = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.17, 10), new THREE.MeshBasicMaterial({ color: 0x050403 }));
      hole.rotation.x = -Math.PI / 2; hole.position.set(i * 0.8, 0.05, j * 0.8); g.add(hole);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.9, 6), cm); c.position.set(i * 0.8, 0.03, j * 0.8); c.scale.y = 0.06; cones.push(c); g.add(c);
    }
    this.group.add(g);
    this.spikes.push({ x: g.position.x, z: g.position.z, plate, cones, ph: tr.ph || 0, hit: false, up: false });
  }
  updateSpikes(dt) {
    const P = this.H.P;
    for (const s of this.spikes) {
      const p = (this.t + s.ph) % 4; let k = 0.06;
      if (p >= 2 && p < 2.7) { k = 0.06 + 0.12 * Math.abs(Math.sin(this.t * 25)); s.plate.material.color.setHex(Math.sin(this.t * 20) > 0 ? 0x8a1a10 : 0x2a1a14); }
      else if (p >= 2.7 && p < 3.5) { k = Math.min(1, 0.06 + (p - 2.7) / 0.07); s.plate.material.color.setHex(0x2a1a14); }
      else if (p >= 3.5) { k = Math.max(0.06, 1 - (p - 3.5) / 0.4); s.plate.material.color.setHex(0x2a1a14); }
      else s.plate.material.color.setHex(0x2a1a14);
      for (const c of s.cones) { c.scale.y = k; c.position.y = 0.45 * k + 0.03; }
      const upNow = p >= 2.7 && p < 3.5;
      if (upNow && !s.up) { s.hit = false; if (Math.hypot(s.x - P.x, s.z - P.z) < 22) this.H.sfx('spike', s.x, s.z); }
      s.up = upNow;
      if (upNow && !s.hit && P.alive && Math.abs(P.x - s.x) < 1.45 && Math.abs(P.z - s.z) < 1.45) { s.hit = true; this.H.hurtPlayer(18, s.x, s.z); }
    }
  }

  // ---------------- 噴火牆 ----------------
  addFlame(tr) {
    const dx = -tr.wx, dz = -tr.wz;
    const nx = (tr.gx + 0.5) * CELL + tr.wx * 1.42, nz = (tr.gz + 0.5) * CELL + tr.wz * 1.42;
    const g = new THREE.Group(); g.position.set(nx, 0.95, nz); g.rotation.y = Math.atan2(dx, dz);
    const iron = mat(0x2a2a30, { metalness: 0.7, roughness: 0.45 });
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.08), iron); bp.position.z = 0.04; g.add(bp);
    const nz2 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.32, 12), iron); nz2.rotation.x = Math.PI / 2; nz2.position.z = 0.2; g.add(nz2);
    for (const [px, py] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mat(0x9a7a3a)); b.position.set(px, py, 0.1); g.add(b); }
    const pilot = glow(0xff7a30, 0.3, 0.5); pilot.position.z = 0.4; g.add(pilot);
    const fl = [];
    for (let i = 0; i < 13; i++) {
      const o = glow(0xff6a20, 1, 0), c = glow(0xffe080, 0.6, 0); o.position.z = c.position.z = 0.45 + i * 0.44; g.add(o, c); fl.push({ o, c, i });
    }
    this.group.add(g);
    this.flames.push({ x: nx, z: nz, dx, dz, g, pilot, fl, ph: tr.ph || 0, st: 'idle', tick: 0 });
  }
  updateFlames(dt) {
    const P = this.H.P;
    for (const f of this.flames) {
      const p = (this.t + f.ph) % 5;
      const st = p >= 3.3 && p < 4.5 ? 'burn' : p >= 2.4 && p < 3.3 ? 'warn' : 'idle';
      if (st !== f.st) {
        const near = Math.hypot(f.x - P.x, f.z - P.z) < 24;
        if (near && st === 'warn') this.H.sfx('flame_warn', f.x, f.z);
        if (near && st === 'burn') this.H.sfx('flame', f.x, f.z);
        f.st = st;
      }
      f.pilot.material.opacity = (st === 'idle' ? 0.35 : st === 'warn' ? 0.9 : 0.2) * (0.8 + 0.2 * Math.sin(this.t * 30));
      f.pilot.scale.setScalar(st === 'warn' ? 0.55 + 0.25 * Math.sin(this.t * 22) : 0.3);
      for (const q of f.fl) {
        if (st === 'burn') {
          const w = 0.85 + 0.15 * Math.sin(this.t * 33 + q.i * 1.7), s = (1.15 + q.i * 0.2) * w;
          q.o.scale.setScalar(s); q.c.scale.setScalar(s * 0.55);
          q.o.material.opacity = 0.62 - q.i * 0.035; q.c.material.opacity = 0.75 - q.i * 0.055;
        } else { q.o.material.opacity = 0; q.c.material.opacity = 0; }
      }
      if (st === 'burn' && P.alive) {
        f.tick -= dt;
        if (f.tick <= 0) {
          f.tick = 0.3;
          const rx = P.x - f.x, rz = P.z - f.z, along = rx * f.dx + rz * f.dz, lat = Math.abs(rx * f.dz - rz * f.dx);
          if (along > 0 && along < 6 && lat < 0.85) this.H.hurtPlayer(7, f.x, f.z);
        }
      }
    }
  }

  // ---------------- 爆炸桶 ----------------
  addBarrel(tr) {
    const cx = (tr.gx + 0.5) * CELL, cz = (tr.gz + 0.5) * CELL, OFF = [[-0.55, -0.4], [0.55, -0.3], [0.0, 0.65]];
    const red = mat(0xa82418, { roughness: 0.5, metalness: 0.45 }), dark = mat(0x2a1210, { metalness: 0.6 });
    for (let k = 0; k < (tr.n || 2); k++) {
      const x = cx + OFF[k][0], z = cz + OFF[k][1];
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = k * 1.7;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.95, 18), red); body.position.y = 0.475; g.add(body);
      for (const y of [0.15, 0.8]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.375, 0.025, 6, 20), dark); b.rotation.x = Math.PI / 2; b.position.y = y; g.add(b); }
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ color: 0xf0c020 })); patch.position.set(0, 0.5, 0.375); g.add(patch);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.22), new THREE.MeshBasicMaterial({ color: 0x1a1008 })); mark.position.set(0, 0.5, 0.378); g.add(mark);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), new THREE.MeshBasicMaterial({ color: 0x1a1008 })); dot.position.set(0, 0.34, 0.378); g.add(dot);
      this.group.add(g);
      const circle = { x, z, r: 0.45 }; this.world.decorCircles.push(circle);
      this.world.decorCell.add(tr.gz * this.world.W + tr.gx);
      this.barrels.push({ x, z, g, circle, hp: 25, dead: false, fuse: -1 });
    }
  }
  // 子彈打到桶子（落點在桶子旁）
  shotAt(px, pz, dmg) {
    for (const b of this.barrels) {
      if (b.dead) continue;
      if (Math.hypot(px - b.x, pz - b.z) < b.circle.r + 0.22) {
        b.hp -= dmg; this.H.fx(px, 0.6, pz, 'spark', 4);
        if (b.hp <= 0 && b.fuse < 0) b.fuse = 0.05;
        return true;
      }
    }
    return false;
  }
  explode(b) {
    b.dead = true; this.group.remove(b.g);
    const i = this.world.decorCircles.indexOf(b.circle); if (i >= 0) this.world.decorCircles.splice(i, 1);
    const H = this.H, P = H.P, R = 4.6;
    H.sfx('explode', b.x, b.z);
    const fb = glow(0xff7a20, 2, 1); fb.position.set(b.x, 0.9, b.z); this.group.add(fb);
    const fl = glow(0xfff0b0, 1, 1); fl.position.set(b.x, 0.9, b.z); this.group.add(fl);
    this.fire.push({ s: fb, s2: fl, life: 0, max: 0.55 });
    H.fx(b.x, 0.8, b.z, 'spark', 16); H.fx(b.x, 0.8, b.z, 'smoke', 10); H.fx(b.x, 0.5, b.z, 'dust', 4);
    H.noise(b.x, b.z, 26);
    const en = H.enemies();
    if (en) for (const e of en.list) {
      if (e.dead) continue; const d = Math.hypot(e.x - b.x, e.z - b.z);
      if (d < R) en.hurt(e, Math.round(95 * (1 - d / R) + 15), false);
    }
    const dp = Math.hypot(P.x - b.x, P.z - b.z);
    if (P.alive && dp < R) { H.hurtPlayer(Math.round(45 * (1 - dp / R) + 8), b.x, b.z); P.shake = Math.min(2, P.shake + 1.2); }
    for (const o of this.barrels) if (!o.dead && o !== b && o.fuse < 0 && Math.hypot(o.x - b.x, o.z - b.z) < 4.2) o.fuse = 0.12 + Math.hypot(o.x - b.x, o.z - b.z) * 0.05;
  }
  updateBarrels(dt) {
    for (const b of this.barrels) {
      if (b.dead) continue;
      if (b.fuse >= 0) { b.fuse -= dt; if (b.fuse <= 0) this.explode(b); }
    }
    for (let i = this.fire.length - 1; i >= 0; i--) {
      const f = this.fire[i]; f.life += dt; const k = f.life / f.max;
      if (k >= 1) { this.group.remove(f.s, f.s2); this.fire.splice(i, 1); continue; }
      f.s.scale.setScalar(2 + k * 6.5); f.s.material.opacity = 1 - k * k;
      f.s2.scale.setScalar(1 + k * 3.5); f.s2.material.opacity = Math.max(0, 1 - k * 2.2);
    }
  }

  // ---------------- 掉落吊燈 ----------------
  addLuster(tr) {
    const cx = (tr.gx + 0.5) * CELL, cz = (tr.gz + 0.5) * CELL, gm = mat(0xd8aa3a, { metalness: 0.9, roughness: 0.3 });
    const body = new THREE.Group(); body.position.set(cx, WALL_H - 1.15, cz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 8, 28), gm); ring.rotation.x = Math.PI / 2; body.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 20), gm); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.18; body.add(ring2);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), gm); hub.position.y = 0.3; body.add(hub);
    const flames = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.283, c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8), mat(0xf0e8d0, { metalness: 0 }));
      c.position.set(Math.cos(a) * 0.75, 0.14, Math.sin(a) * 0.75); body.add(c);
      const f = glow(0xffb050, 0.34, 0.9); f.position.set(c.position.x, 0.34, c.position.z); body.add(f); flames.push(f);
    }
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 6), gm); chain.position.set(cx, WALL_H - 0.575, cz);
    const ringW = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.8, 36), new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    ringW.rotation.x = -Math.PI / 2; ringW.position.set(cx, 0.04, cz);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.35, 28), new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(cx, 0.035, cz);
    this.group.add(body, chain, ringW, disc);
    this.lusters.push({ x: cx, z: cz, body, chain, ringW, disc, flames, st: 'idle', tm: 0, vy: 0, y0: body.position.y });
  }
  updateLusters(dt) {
    const H = this.H, P = H.P;
    for (const l of this.lusters) {
      if (l.st === 'idle') {
        for (const f of l.flames) f.material.opacity = 0.75 + 0.2 * Math.sin(this.t * 14 + f.position.x * 5);
        if (P.alive && Math.hypot(P.x - l.x, P.z - l.z) < 2.3) { l.st = 'warn'; l.tm = 0.95; H.sfx('creak', l.x, l.z); }
      } else if (l.st === 'warn') {
        l.tm -= dt; const k = 1 - l.tm / 0.95;
        l.body.position.x = l.x + Math.sin(this.t * 60) * 0.03 * k; l.body.rotation.z = Math.sin(this.t * 45) * 0.05 * k;
        l.ringW.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(this.t * 16)); l.disc.material.opacity = 0.08 + 0.14 * k;
        if (l.tm <= 0) { l.st = 'fall'; l.vy = 0; l.chain.visible = false; l.body.rotation.z = 0; l.body.position.x = l.x; }
      } else if (l.st === 'fall') {
        l.vy += 22 * dt; l.body.position.y -= l.vy * dt;
        if (l.body.position.y <= 0.32) {
          l.body.position.y = 0.3; l.body.rotation.z = 0.18; l.st = 'done';
          l.ringW.material.opacity = 0; l.disc.material.opacity = 0;
          H.sfx('crash', l.x, l.z); H.fx(l.x, 0.4, l.z, 'spark', 14); H.fx(l.x, 0.3, l.z, 'dust', 8);
          H.noise(l.x, l.z, 22); P.shake = Math.min(2, P.shake + (Math.hypot(P.x - l.x, P.z - l.z) < 7 ? 0.8 : 0));
          const dp = Math.hypot(P.x - l.x, P.z - l.z); if (P.alive && dp < 1.9) H.hurtPlayer(35, l.x, l.z);
          const en = H.enemies(); if (en) for (const e of en.list) if (!e.dead && Math.hypot(e.x - l.x, e.z - l.z) < 2.0) en.hurt(e, 70, false);
          for (const f of l.flames) f.material.opacity = 0;
        }
      }
    }
  }

  update(dt) {
    this.t += dt;
    this.updateSpikes(dt); this.updateFlames(dt); this.updateBarrels(dt); this.updateLusters(dt);
  }
}
