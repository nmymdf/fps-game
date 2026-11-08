import * as THREE from 'three';
import { CELL, WALL_H, THEMES } from './const.js';
import { DIRS, mulberry32 } from './levelgen.js';
import { matFor, bannerTex, paintingTex, sprites } from './textures.js';
import { buildDecor, decorRadius, makeFlame, flames, metal, plain } from './decor.js';

const RV = [[0, 0, -1], [0, 0, 1], [1, 0, 0], [-1, 0, 0]]; // 由開放側看牆，向右的方向

class Bucket {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; }
  quad(p, n, uv, col) {
    const b = this.pos.length / 3;
    for (let i = 0; i < 4; i++) {
      this.pos.push(p[i][0], p[i][1], p[i][2]); this.nor.push(n[0], n[1], n[2]);
      this.uv.push(uv[i][0], uv[i][1]); this.col.push(col[i], col[i], col[i]);
    }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  strip(vs) { // vs: [{p,n,uv,c}] 兩兩一排 (左,右)
    const b = this.pos.length / 3;
    for (const v of vs) { this.pos.push(...v.p); this.nor.push(...v.n); this.uv.push(...v.uv); this.col.push(v.c, v.c, v.c); }
    const rows = vs.length / 2;
    for (let r = 0; r < rows - 1; r++) {
      const l0 = b + r * 2, r0 = l0 + 1, l1 = l0 + 2, r1 = l0 + 3;
      this.idx.push(l0, r0, r1, l0, r1, l1);
    }
  }
  build(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  }
}

export class World {
  constructor(level, scene, quality = 'high') {
    this.level = level; this.scene = scene; this.quality = quality;
    this.theme = THEMES[level.cfg.theme];
    this.W = level.W; this.H = level.H;
    this.cells = new Uint8Array(level.cells); // 可變：隱藏門移動後會改
    this.group = new THREE.Group(); scene.add(this.group);
    this.rnd = mulberry32(level.seed + 99);
    this.doors = []; this.doorAt = new Map();
    this.pushwalls = []; this.pushAt = new Map();
    this.decorCircles = []; this.decorCell = new Set();
    this.torchData = [];
    this.beams = [];
    this.items = [];
    this.mats = new Map();
    this.time = 0;
    this.onDoor = null; this.onPush = null;
    this.buildStatic();
    this.buildDoors();
    this.buildPush();
    this.buildProps();
    this.buildTorches();
    this.buildDecor();
    this.buildLighting();
    this.buildDust();
  }

  // ---------- 格子查詢 ----------
  inb(gx, gz) { return gx >= 0 && gz >= 0 && gx < this.W && gz < this.H; }
  rawSolid(gx, gz) { return !this.inb(gx, gz) || this.cells[gz * this.W + gx] === 1; }
  solidCell(gx, gz) {
    if (!this.inb(gx, gz)) return true;
    const i = gz * this.W + gx;
    if (this.cells[i] === 1) return true;
    const d = this.doorAt.get(i);
    return !!d && d.open < 0.85;
  }
  passable(gx, gz) { // 供路徑搜尋：門算可通過，大型擺設不可
    if (!this.inb(gx, gz)) return false;
    const i = gz * this.W + gx;
    return this.cells[i] === 0 && !this.decorCell.has(i);
  }
  cellOf(x) { return Math.floor(x / CELL); }
  center(g) { return (g + 0.5) * CELL; }

  // ---------- 建立靜態幾何 ----------
  matFor(name) {
    if (!this.mats.has(name)) this.mats.set(name, matFor(name, { vertexColors: true, emissiveIntensity: 1.5 }));
    return this.mats.get(name);
  }
  faceTile(gx, gz, d, ov) {
    const k = (gz * this.W + gx) * 4 + d;
    if (ov.has(k)) return ov.get(k);
    const nx = gx + DIRS[d][0], nz = gz + DIRS[d][1];
    const rid = this.level.roomId[nz * this.W + nx];
    return rid >= 0 ? this.theme.walls[this.level.rooms[rid].wall] : this.theme.corridorWall;
  }
  buildStatic() {
    const lv = this.level, W = this.W, H = this.H;
    const ov = new Map();
    for (const w of lv.windows) ov.set((w.z * W + w.x) * 4 + w.d, this.theme.window);
    ov.set((lv.exit.z * W + lv.exit.x) * 4 + lv.exit.d, 'exit');
    const pwSet = new Set(lv.pushwalls.map((p) => p.z * W + p.x));
    const buckets = new Map();
    const bk = (n) => { if (!buckets.has(n)) buckets.set(n, new Bucket()); return buckets.get(n); };
    const ts = [0, 0.22, 0.78, 1], aoV = [0.55, 0.93, 1.0, 0.72];
    for (let gz = 0; gz < H; gz++) for (let gx = 0; gx < W; gx++) {
      const i = gz * W + gx;
      if (lv.cells[i] !== 1 || pwSet.has(i)) continue;
      for (let d = 0; d < 4; d++) {
        const nx = gx + DIRS[d][0], nz = gz + DIRS[d][1];
        if (!this.inb(nx, nz) || lv.cells[nz * W + nx] !== 0) continue;
        const name = this.faceTile(gx, gz, d, ov);
        const rv = RV[d];
        const cx = (gx + 0.5) * CELL + DIRS[d][0] * CELL / 2, cz = (gz + 0.5) * CELL + DIRS[d][1] * CELL / 2;
        const L = [cx - rv[0] * CELL / 2, cz - rv[2] * CELL / 2], R = [cx + rv[0] * CELL / 2, cz + rv[2] * CELL / 2];
        const lAO = this.rawSolid(nx - rv[0], nz - rv[2]) ? 0.7 : 1, rAO = this.rawSolid(nx + rv[0], nz + rv[2]) ? 0.7 : 1;
        const n = [DIRS[d][0], 0, DIRS[d][1]];
        const vs = [];
        for (let r = 0; r < 4; r++) {
          const y = ts[r] * WALL_H;
          vs.push({ p: [L[0], y, L[1]], n, uv: [0, ts[r]], c: aoV[r] * lAO });
          vs.push({ p: [R[0], y, R[1]], n, uv: [1, ts[r]], c: aoV[r] * rAO });
        }
        bk(name).strip(vs);
      }
    }
    // 地板與天花板
    const floorB = new Map(), ceilB = new Bucket();
    const fb = (n) => { if (!floorB.has(n)) floorB.set(n, new Bucket()); return floorB.get(n); };
    const aoAt = (vx, vz, base) => {
      let c = 0;
      for (const [ax, az] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (this.rawSolid(vx + ax, vz + az)) c++;
      return Math.max(0.5, base - 0.15 * c);
    };
    for (let gz = 0; gz < H; gz++) for (let gx = 0; gx < W; gx++) {
      const i = gz * W + gx;
      if (lv.cells[i] !== 0) continue;
      const rid = lv.roomId[i];
      const fname = rid >= 0 ? this.theme.floors[lv.rooms[rid].floor] : this.theme.corridorFloor;
      const x0 = gx * CELL, x1 = x0 + CELL, z0 = gz * CELL, z1 = z0 + CELL;
      const up = [0, 1, 0];
      fb(fname).quad([[x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0]], up, [[0, 0], [0, 1], [1, 1], [1, 0]],
        [aoAt(gx, gz, 1), aoAt(gx, gz + 1, 1), aoAt(gx + 1, gz + 1, 1), aoAt(gx + 1, gz, 1)]);
      ceilB.quad([[x0, WALL_H, z0], [x1, WALL_H, z0], [x1, WALL_H, z1], [x0, WALL_H, z1]], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]],
        [aoAt(gx, gz, 0.85), aoAt(gx + 1, gz, 0.85), aoAt(gx + 1, gz + 1, 0.85), aoAt(gx, gz + 1, 0.85)]);
    }
    for (const [n, b] of buckets) this.group.add(b.build(this.matFor(n)));
    for (const [n, b] of floorB) this.group.add(b.build(this.matFor(n)));
    this.group.add(ceilB.build(this.matFor(this.theme.ceil)));
  }

  // ---------- 門 ----------
  buildDoors() {
    const edge = plain(0x241a12, 0.8);
    for (const [i, d] of this.level.doors) {
      const big = { door: 'door', gold: 'doorGold', silver: 'doorSilver' }[d.kind];
      const m = matFor(big);
      const ew = d.orient === 'ew';
      const geo = new THREE.BoxGeometry(ew ? 0.32 : CELL, WALL_H, ew ? CELL : 0.32);
      const mats = ew ? [m, m, edge, edge, edge, edge] : [edge, edge, edge, edge, m, m];
      const mesh = new THREE.Mesh(geo, mats);
      const x = (d.x + 0.5) * CELL, z = (d.z + 0.5) * CELL;
      mesh.position.set(x, WALL_H / 2, z);
      this.group.add(mesh);
      const door = { i, gx: d.x, gz: d.z, x, z, kind: d.kind, orient: d.orient, open: 0, target: 0, timer: 0, mesh, dir: this.rnd() < 0.5 ? 1 : -1, locked: d.kind !== 'door' };
      this.doors.push(door); this.doorAt.set(i, door);
    }
  }
  updateDoors(dt, occupants) {
    for (const d of this.doors) {
      if (d.target === 1 && d.open >= 1) {
        d.timer -= dt;
        if (d.timer <= 0) {
          let blocked = false;
          for (const o of occupants) if (Math.abs(o.x - d.x) < CELL * 0.7 && Math.abs(o.z - d.z) < CELL * 0.7) { blocked = true; break; }
          if (blocked) d.timer = 0.5; else { d.target = 0; if (this.onDoor) this.onDoor('close', d.x, d.z, d.kind); }
        }
      }
      if (d.open !== d.target) {
        const s = dt * 1.5;
        d.open = d.target > d.open ? Math.min(d.target, d.open + s) : Math.max(d.target, d.open - s);
        const off = d.open * CELL * 0.97 * d.dir;
        if (d.orient === 'ew') d.mesh.position.z = d.z + off; else d.mesh.position.x = d.x + off;
      }
    }
  }
  openDoor(d, keys) {
    if (d.target === 1) return 'already';
    if (d.kind === 'gold' && !keys.gold) return 'locked_gold';
    if (d.kind === 'silver' && !keys.silver) return 'locked_silver';
    d.target = 1; d.timer = 4.5;
    if (this.onDoor) this.onDoor('open', d.x, d.z, d.kind);
    return 'opened';
  }

  // ---------- 隱藏牆 ----------
  buildPush() {
    const lv = this.level;
    for (const p of lv.pushwalls) {
      const rx = p.x - p.dx, rz = p.z - p.dz; // 房內側格
      const rid = lv.roomId[rz * this.W + rx];
      const name = rid >= 0 ? this.theme.walls[lv.rooms[rid].wall] : this.theme.corridorWall;
      const m = matFor(name);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(CELL, WALL_H, CELL), [m, m, plain(0x222222), plain(0x222222), m, m]);
      mesh.position.set((p.x + 0.5) * CELL, WALL_H / 2, (p.z + 0.5) * CELL);
      this.group.add(mesh);
      const pw = { gx: p.x, gz: p.z, dx: p.dx, dz: p.dz, mesh, t: 0, state: 'idle', x0: mesh.position.x, z0: mesh.position.z };
      this.pushwalls.push(pw); this.pushAt.set(p.z * this.W + p.x, pw);
    }
  }
  push(pw) {
    if (pw.state !== 'idle') return false;
    pw.state = 'moving'; pw.t = 0;
    if (this.onPush) this.onPush(pw.x0, pw.z0);
    return true;
  }
  updatePush(dt) {
    for (const pw of this.pushwalls) {
      if (pw.state !== 'moving') continue;
      pw.t += dt / 1.4;
      const k = Math.min(1, pw.t);
      pw.mesh.position.x = pw.x0 + pw.dx * CELL * k;
      pw.mesh.position.z = pw.z0 + pw.dz * CELL * k;
      if (k >= 1) {
        pw.state = 'done';
        const o = pw.gz * this.W + pw.gx, dest = (pw.gz + pw.dz) * this.W + (pw.gx + pw.dx);
        this.cells[o] = 0; this.cells[dest] = 1;
        this.pushAt.delete(o);
      } else if (k > 0.35) {
        const o = pw.gz * this.W + pw.gx;
        this.cells[o] = 0; this.cells[(pw.gz + pw.dz) * this.W + (pw.gx + pw.dx)] = 1;
      }
    }
  }

  // ---------- 牆面飾物：旗、畫、出口燈 ----------
  buildProps() {
    const lv = this.level;
    const place = (o, w) => {
      const n = DIRS[o.d];
      const x = (o.x + 0.5) * CELL + n[0] * (CELL / 2), z = (o.z + 0.5) * CELL + n[1] * (CELL / 2);
      w.rotation.y = Math.atan2(n[0], n[1]);
      w.position.x = x + n[0] * 0.05; w.position.z = z + n[1] * 0.05;
      this.group.add(w);
      return w;
    };
    const bm = {};
    for (const b of lv.banners) {
      const g = new THREE.Group();
      bm[b.c] = bm[b.c] || new THREE.MeshStandardMaterial({ map: bannerTex(b.c), roughness: 0.95, side: THREE.DoubleSide });
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.3), bm[b.c]); cloth.position.y = 1.85; g.add(cloth);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8), metal(0xc9a24a, 0.35)); rod.rotation.z = Math.PI / 2; rod.position.set(0, 3.03, 0.02); g.add(rod);
      for (const sx of [-0.75, 0.75]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), metal(0xc9a24a, 0.35)); k.position.set(sx, 3.03, 0.02); g.add(k); }
      place(b, g);
    }
    const frameM = metal(0xb48a38, 0.4);
    for (const p of lv.paintings) {
      const g = new THREE.Group();
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), new THREE.MeshStandardMaterial({ map: paintingTex(p.p), roughness: 0.6 }));
      pic.position.set(0, 1.85, 0.01); g.add(pic);
      for (const [w, h, x, y] of [[1.6, 0.1, 0, 1.85 + 0.575], [1.6, 0.1, 0, 1.85 - 0.575], [0.1, 1.05, -0.75, 1.85], [0.1, 1.05, 0.75, 1.85]]) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), frameM); f.position.set(x, y, 0.03); g.add(f);
      }
      place(p, g);
    }
    // 出口綠燈
    const ex = lv.exit, n = DIRS[ex.d];
    const el = new THREE.PointLight(0x60ffa0, 7, 10, 2);
    el.position.set((ex.x + 0.5) * CELL + n[0] * (CELL / 2 + 0.8), 2.2, (ex.z + 0.5) * CELL + n[1] * (CELL / 2 + 0.8));
    this.group.add(el);
    // 出口上方牌子（發光門框）
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.12), new THREE.MeshBasicMaterial({ color: 0x3cff90 }));
    frame.position.set((ex.x + 0.5) * CELL + n[0] * (CELL / 2 + 0.05), 2.95, (ex.z + 0.5) * CELL + n[1] * (CELL / 2 + 0.05));
    frame.rotation.y = Math.atan2(n[0], n[1]);
    this.group.add(frame);
  }

  // ---------- 火把 ----------
  buildTorches() {
    const iron = metal(0x2a2a30, 0.5), gold = metal(0xc9a24a, 0.35);
    for (const t of this.level.torches) {
      const n = DIRS[t.d];
      const g = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.05), iron); plate.position.set(0, 2.0, 0.025); g.add(plate);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.32), iron); arm.position.set(0, 2.12, 0.18); g.add(arm);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.16, 10), gold); cup.position.set(0, 2.2, 0.33); g.add(cup);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.24, 8), plain(0x4a3220, 0.9)); stick.position.set(0, 2.34, 0.33); g.add(stick);
      const f = makeFlame(1.15); f.position.set(0, 2.62, 0.33); g.add(f);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprites().glow, color: this.theme.torch, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.4, fog: false }));
      gl.scale.set(1.8, 1.8, 1); gl.position.set(0, 2.6, 0.38); g.add(gl);
      const bx = (t.x + 0.5) * CELL + n[0] * (CELL / 2), bz = (t.z + 0.5) * CELL + n[1] * (CELL / 2);
      g.position.set(bx, 0, bz); g.rotation.y = Math.atan2(n[0], n[1]);
      this.group.add(g);
      this.torchData.push({ pos: new THREE.Vector3(bx + n[0] * 0.42, 2.55, bz + n[1] * 0.42), ph: Math.random() * 100 });
    }
  }

  // ---------- 擺設 ----------
  buildDecor() {
    for (const d of this.level.decor) {
      const o = buildDecor(d.type, this.theme, this.rnd);
      o.position.set((d.gx + 0.5) * CELL, 0, (d.gz + 0.5) * CELL);
      if (d.rot) o.rotation.y = d.rot;
      this.group.add(o);
      if (d.block) {
        const r = decorRadius(d.type);
        this.decorCircles.push({ x: o.position.x, z: o.position.z, r });
        this.decorCell.add(d.gz * this.W + d.gx);
      }
    }
  }

  // ---------- 燈光 ----------
  buildLighting() {
    const th = this.theme;
    this.scene.fog = new THREE.FogExp2(th.fog, th.fogD);
    this.scene.background = new THREE.Color(th.fog);
    this.amb = new THREE.AmbientLight(th.ambient, th.ambI * 1.5);
    this.hemi = new THREE.HemisphereLight(th.hemiSky, th.hemiGround, th.hemiI * 1.1);
    this.group.add(this.amb, this.hemi);
    this.slots = [];
    const K = this.quality === 'high' ? 8 : 5;
    const SHN = { high: 3, mid: 1, low: 0 }[this.quality] ?? 0;
    for (let k = 0; k < K; k++) {
      const l = new THREE.PointLight(th.torch, 0, 20, 1.5);
      if (k < SHN) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.camera.near = 0.25; l.shadow.camera.far = 22; l.shadow.bias = -0.0008; l.shadow.normalBias = 0.05; l.shadow.radius = 3; }
      this.group.add(l);
      this.slots.push({ light: l, torch: -1, i: 0, target: 0 });
    }
    this.lantern = new THREE.PointLight(0xffe2b8, 9, 15, 1.6);
    if (this.quality !== 'low') { this.lantern.castShadow = true; this.lantern.shadow.mapSize.set(1024, 1024); this.lantern.shadow.camera.near = 0.2; this.lantern.shadow.camera.far = 18; this.lantern.shadow.bias = -0.0008; this.lantern.shadow.normalBias = 0.04; this.lantern.shadow.radius = 3; }
    this.group.add(this.lantern);
    this.lightTimer = 0;
    // 窗口光柱
    const sp = sprites();
    const col = new THREE.Color(th.beam);
    for (const w of this.level.windows) {
      const n = DIRS[w.d], rv = RV[w.d];
      const fx = (w.x + 0.5) * CELL + n[0] * (CELL / 2), fz = (w.z + 0.5) * CELL + n[1] * (CELL / 2);
      const S = [fx + n[0] * 0.15, 2.0, fz + n[1] * 0.15];
      const E = [fx + n[0] * 3.6, 0.02, fz + n[1] * 3.6];
      const g = new THREE.BufferGeometry();
      const hw0 = 0.55, hw1 = 0.95;
      const pos = [
        S[0] - rv[0] * hw0, S[1] + 0.55, S[2] - rv[2] * hw0, S[0] + rv[0] * hw0, S[1] + 0.55, S[2] + rv[2] * hw0,
        E[0] + rv[0] * hw1, E[1], E[2] + rv[2] * hw1, E[0] - rv[0] * hw1, E[1], E[2] - rv[2] * hw1,
        S[0], S[1] + 0.7, S[2], S[0], S[1] - 0.55, S[2], E[0] + n[0] * 0.9, E[1], E[2] + n[1] * 0.9, E[0] - n[0] * 0.6, E[1], E[2] - n[1] * 0.6,
      ];
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0], 2));
      g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
      const m = new THREE.MeshBasicMaterial({ map: sp.beam, color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
      this.group.add(mesh); this.beams.push({ mesh, ph: Math.random() * 10 });
    }
  }
  updateLights(dt, cam) {
    this.lantern.position.copy(cam.position);
    this.lightTimer -= dt;
    if (this.lightTimer <= 0) {
      this.lightTimer = 0.12;
      const arr = [];
      for (let i = 0; i < this.torchData.length; i++) {
        const t = this.torchData[i];
        const dx = t.pos.x - cam.position.x, dz = t.pos.z - cam.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 24 * 24) arr.push([d2, i]);
      }
      arr.sort((a, b) => a[0] - b[0]);
      const want = new Set(arr.slice(0, this.slots.length).map((a) => a[1]));
      for (const s of this.slots) {
        if (s.torch >= 0 && !want.has(s.torch)) s.target = 0;
        if (s.target === 0 && s.i < 0.03) s.torch = -1;
      }
      const have = new Set(this.slots.filter((s) => s.torch >= 0 && s.target === 1).map((s) => s.torch));
      for (const idx of want) {
        if (have.has(idx)) continue;
        const s = this.slots.find((q) => q.torch < 0);
        if (!s) break;
        s.torch = idx; s.target = 1; s.light.position.copy(this.torchData[idx].pos);
      }
    }
    for (const s of this.slots) {
      s.i += (s.target - s.i) * Math.min(1, dt * 7);
      const ph = s.torch >= 0 ? this.torchData[s.torch].ph : 0;
      const fl = 0.88 + 0.12 * Math.sin(this.time * 9 + ph) * Math.sin(this.time * 5.3 + ph * 1.7) + 0.05 * Math.sin(this.time * 23 + ph);
      s.light.intensity = 40 * s.i * fl;
    }
  }
  buildDust() {
    const N = this.quality === 'high' ? 260 : 120;
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { arr[i * 3] = (Math.random() - 0.5) * 28; arr[i * 3 + 1] = Math.random() * 3.2; arr[i * 3 + 2] = (Math.random() - 0.5) * 28; }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ map: sprites().dust, size: 0.1, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6c0 }));
    this.dust.frustumCulled = false;
    this.dustBase = arr.slice();
    this.group.add(this.dust);
  }
  update(dt, cam) {
    this.time += dt;
    this.updateLights(dt, cam);
    this.updatePush(dt);
    for (const f of flames) {
      const b = f.userData.base, t = this.time * 11 + f.userData.ph;
      f.scale.set((0.55 + 0.06 * Math.sin(t) + 0.03 * Math.sin(t * 2.3)) * b, (0.8 + 0.1 * Math.sin(t * 1.3) + 0.06 * Math.sin(t * 3.1)) * b, 1);
    }
    for (const b of this.beams) b.mesh.material.opacity = 0.42 + 0.08 * Math.sin(this.time * 0.7 + b.ph);
    // 灰塵
    const p = this.dust.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const ox = this.dustBase[i], oy = this.dustBase[i + 1], oz = this.dustBase[i + 2];
      const t = this.time * 0.15;
      let x = ox + Math.sin(t + oy * 3) * 0.6, y = (oy + this.time * 0.05) % 3.2, z = oz + Math.cos(t * 1.1 + ox) * 0.6;
      x = cam.position.x + ((((x - cam.position.x + 14) % 28) + 28) % 28) - 14;
      z = cam.position.z + ((((z - cam.position.z + 14) % 28) + 28) % 28) - 14;
      p[i] = x; p[i + 1] = y; p[i + 2] = z;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- 碰撞與射線 ----------
  collides(x, z, r) {
    const gx0 = Math.floor((x - r) / CELL), gx1 = Math.floor((x + r) / CELL);
    const gz0 = Math.floor((z - r) / CELL), gz1 = Math.floor((z + r) / CELL);
    for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
      if (!this.solidCell(gx, gz)) continue;
      const cx = Math.max(gx * CELL, Math.min(x, (gx + 1) * CELL)), cz = Math.max(gz * CELL, Math.min(z, (gz + 1) * CELL));
      if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) return true;
    }
    for (const c of this.decorCircles) {
      const dx = x - c.x, dz = z - c.z, rr = r + c.r;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }
  tryMove(x, z, dx, dz, r) {
    let nx = x + dx;
    if (!this.collides(nx, z, r)) x = nx;
    let nz = z + dz;
    if (!this.collides(x, nz, r)) z = nz;
    return [x, z];
  }
  castCell(ox, oz, dx, dz, maxD) { // 回傳 {t,gx,gz} 第一個擋住射線的格
    let gx = Math.floor(ox / CELL), gz = Math.floor(oz / CELL);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(CELL / dx) : 1e30, tdz = dz !== 0 ? Math.abs(CELL / dz) : 1e30;
    let tx = dx !== 0 ? ((dx > 0 ? (gx + 1) * CELL - ox : ox - gx * CELL) / Math.abs(dx)) : 1e30;
    let tz = dz !== 0 ? ((dz > 0 ? (gz + 1) * CELL - oz : oz - gz * CELL) / Math.abs(dz)) : 1e30;
    let t = 0;
    for (let k = 0; k < 200; k++) {
      if (tx < tz) { t = tx; tx += tdx; gx += sx; } else { t = tz; tz += tdz; gz += sz; }
      if (t >= maxD) return { t: maxD, gx: -1, gz: -1 };
      if (!this.inb(gx, gz)) return { t, gx, gz };
      const i = gz * this.W + gx;
      if (this.cells[i] === 1) return { t, gx, gz };
      const d = this.doorAt.get(i);
      if (d && d.open < 0.6) return { t, gx, gz };
    }
    return { t: maxD, gx: -1, gz: -1 };
  }
  rayDist(ox, oz, dx, dz, maxD, useDecor = true) {
    let t = this.castCell(ox, oz, dx, dz, maxD).t;
    if (useDecor) {
      for (const c of this.decorCircles) {
        const px = c.x - ox, pz = c.z - oz;
        const proj = px * dx + pz * dz;
        if (proj < 0 || proj > t + c.r) continue;
        const perp2 = px * px + pz * pz - proj * proj;
        if (perp2 > c.r * c.r) continue;
        const th = proj - Math.sqrt(c.r * c.r - perp2);
        if (th > 0 && th < t) t = th;
      }
    }
    return t;
  }
  los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
    if (d < 0.01) return true;
    return this.rayDist(ax, az, dx / d, dz / d, d - 0.05, true) >= d - 0.06;
  }
  findInteract(px, pz, yaw, reach = 3.4) {
    const dx = Math.sin(yaw), dz = -Math.cos(yaw);
    const hit = this.castCell(px, pz, dx, dz, reach);
    if (hit.gx < 0) return null;
    const i = hit.gz * this.W + hit.gx;
    const d = this.doorAt.get(i);
    if (d && d.target === 0) return { type: 'door', door: d };
    const pw = this.pushAt.get(i);
    if (pw && pw.state === 'idle') return { type: 'push', pw };
    const ex = this.level.exit;
    if (ex.x === hit.gx && ex.z === hit.gz) return { type: 'exit' };
    return null;
  }
  // 由某格出發的步行距離場（敵人追擊／聲音傳播用）
  distField(gx, gz, maxD = 80) {
    const W = this.W, H = this.H;
    const dist = new Int16Array(W * H).fill(-1);
    const q = [gz * W + gx]; dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, z = (i / W) | 0, nd = dist[i] + 1;
      if (nd > maxD) continue;
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz;
        if (!this.inb(nx, nz)) continue;
        const j = nz * W + nx;
        if (dist[j] !== -1 || this.cells[j] !== 0) continue;
        dist[j] = nd; q.push(j);
      }
    }
    return dist;
  }
}
