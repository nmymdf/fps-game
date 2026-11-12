// 關卡產生器：房間 + 走廊 + 鑰匙門 + 隱藏房 + 敵人 + 道具，並驗證可通關
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]; // 0:+x 1:-x 2:+z 3:-z

export const DEFENSE_WAVES = [
  { guard: 6, dog: 2 }, { guard: 6, officer: 4, dog: 3 }, { guard: 5, officer: 6, heavy: 3 }, { guard: 6, officer: 6, heavy: 5, dog: 4 },
];

export const LEVELS = [
  { name: '城門庭園', size: 38, rooms: 8, minRoom: 5, maxW: 10, maxH: 8, gates: 1, dens: 24, theme: 'courtyard', trap: 0.3, seed: 1101,
    foes: { guard: 80, dog: 20 }, weapon: 'smg' },
  { name: '迎賓大廳', size: 44, rooms: 10, minRoom: 5, maxW: 11, maxH: 9, gates: 2, dens: 20, theme: 'hall', seed: 2202,
    foes: { guard: 58, dog: 14, officer: 28 }, weapon: 'shotgun' },
  { name: '藏書閣', size: 46, rooms: 11, minRoom: 5, maxW: 11, maxH: 9, gates: 2, dens: 18, theme: 'library', seed: 3303,
    foes: { guard: 42, dog: 18, officer: 40 }, weapon: 'rifle' },
  { name: '夜襲潛行', size: 46, rooms: 11, minRoom: 5, maxW: 11, maxH: 9, gates: 1, dens: 26, theme: 'courtyard', mode: 'sneak', trap: 0.3, seed: 1717,
    foes: { guard: 70, officer: 30 }, weapon: null },
  { name: '地下酒窖', size: 48, rooms: 12, minRoom: 5, maxW: 11, maxH: 9, gates: 2, dens: 16, theme: 'cellar', hostage: true, seed: 4404,
    foes: { guard: 34, dog: 16, officer: 28, heavy: 22 }, weapon: null },
  { name: '禮拜塔', size: 48, rooms: 12, minRoom: 5, maxW: 11, maxH: 9, gates: 2, dens: 15, theme: 'chapel', seed: 5505,
    foes: { guard: 26, dog: 14, officer: 30, heavy: 30 }, weapon: null },
  { name: '限時逃脫', size: 52, rooms: 13, minRoom: 5, maxW: 11, maxH: 9, gates: 1, dens: 40, theme: 'hall', mode: 'escape', trap: 1.0, seed: 2929,
    foes: { guard: 60, dog: 20, officer: 20 }, weapon: null },
  { name: '城牆哨塔', size: 50, rooms: 12, minRoom: 5, maxW: 11, maxH: 9, gates: 2, dens: 14, theme: 'courtyard', seed: 7707,
    foes: { guard: 30, dog: 16, officer: 30, heavy: 24 }, weapon: null },
  { name: '軍械地牢', size: 52, rooms: 13, minRoom: 5, maxW: 11, maxH: 9, gates: 2, dens: 13, theme: 'cellar', seed: 8808,
    foes: { guard: 22, dog: 14, officer: 28, heavy: 36 }, weapon: null },
  { name: '守城之夜', size: 42, rooms: 8, minRoom: 6, maxW: 12, maxH: 10, gates: 0, dens: 20, theme: 'chapel', mode: 'defense', noFoes: true, trap: 0.4, seed: 3131,
    foes: { guard: 1 }, weapon: null },
  { name: '貴賓長廊', size: 50, rooms: 12, minRoom: 5, maxW: 12, maxH: 9, gates: 2, dens: 13, theme: 'hall', hostage: true, seed: 9909,
    foes: { guard: 24, dog: 12, officer: 38, heavy: 26 }, weapon: null },
  { name: '皇家藏經室', size: 52, rooms: 13, minRoom: 5, maxW: 11, maxH: 9, gates: 2, dens: 12, theme: 'library', seed: 1313,
    foes: { guard: 20, dog: 12, officer: 36, heavy: 32 }, weapon: null },
  { name: '王座廳', size: 44, rooms: 9, minRoom: 6, maxW: 12, maxH: 10, gates: 1, dens: 14, theme: 'throne', seed: 6606,
    foes: { guard: 28, officer: 34, heavy: 38 }, weapon: null, boss: true },
];

const idx = (W, x, z) => z * W + x;

function pickWeighted(rnd, table) {
  let sum = 0; for (const k in table) sum += table[k];
  let r = rnd() * sum;
  for (const k in table) { r -= table[k]; if (r <= 0) return k; }
  return Object.keys(table)[0];
}

function gen(index, seed) {
  const cfg = LEVELS[index];
  const rnd = mulberry32(seed);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const W = cfg.size, H = cfg.size;
  const cells = new Uint8Array(W * H).fill(1);
  const roomId = new Int16Array(W * H).fill(-1);
  const rooms = [];

  for (let t = 0; t < 800 && rooms.length < cfg.rooms; t++) {
    const w = ri(cfg.minRoom, cfg.maxW), h = ri(cfg.minRoom, cfg.maxH);
    const x = ri(3, W - w - 4), z = ri(3, H - h - 4);
    let ok = true;
    for (const r of rooms) {
      if (x < r.x + r.w + 3 && x + w + 3 > r.x && z < r.z + r.h + 3 && z + h + 3 > r.z) { ok = false; break; }
    }
    if (!ok) continue;
    rooms.push({ id: rooms.length, x, z, w, h, cx: x + (w >> 1), cz: z + (h >> 1) });
  }
  if (rooms.length < cfg.rooms - 1 || rooms.length < 5) return null;
  for (const r of rooms) for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) {
    cells[idx(W, x, z)] = 0; roomId[idx(W, x, z)] = r.id;
  }

  // 房間順序：起點(左上) -> 最近鄰 -> 最大房間當終點
  const rest = rooms.slice().sort((a, b) => (a.cx + a.cz) - (b.cx + b.cz));
  const start = rest.shift();
  let bi = 0; rest.forEach((r, i) => { if (r.w * r.h > rest[bi].w * rest[bi].h) bi = i; });
  const last = rest.splice(bi, 1)[0];
  const chain = [start];
  let cur = start;
  while (rest.length) {
    let best = 0, bd = 1e9;
    rest.forEach((r, i) => { const d = (r.cx - cur.cx) ** 2 + (r.cz - cur.cz) ** 2; if (d < bd) { bd = d; best = i; } });
    cur = rest.splice(best, 1)[0]; chain.push(cur);
  }
  chain.push(last);
  const n = chain.length;
  const bounds = [];
  for (let k = 1; k <= cfg.gates; k++) bounds.push(Math.round(n * k / (cfg.gates + 1)));
  const chainIdx = new Map(chain.map((r, i) => [r.id, i]));
  const zoneOfChain = (i) => bounds.filter((b) => b <= i).length;
  const zoneOf = (r) => zoneOfChain(chainIdx.get(r.id));

  const doors = new Map(); // idx -> {kind, orient, x, z}
  const connections = [];

  function makePath(a, b, hFirst) {
    const path = []; let x = a.cx, z = a.cz;
    path.push([x, z]);
    const sx = () => { while (x !== b.cx) { x += Math.sign(b.cx - x); path.push([x, z]); } };
    const sz = () => { while (z !== b.cz) { z += Math.sign(b.cz - z); path.push([x, z]); } };
    if (hFirst) { sx(); sz(); } else { sz(); sx(); }
    return path;
  }
  function pathOk(path, a, b) {
    for (const [x, z] of path) {
      for (const r of rooms) {
        if (r === a || r === b) continue;
        if (x >= r.x - 1 && x <= r.x + r.w && z >= r.z - 1 && z <= r.z + r.h) return false;
      }
    }
    return true;
  }
  function connect(a, b, gateKind) {
    let path = null;
    const order = rnd() < 0.5 ? [true, false] : [false, true];
    for (const hf of order) { const p = makePath(a, b, hf); if (pathOk(p, a, b)) { path = p; break; } }
    if (!path) return false;
    for (const [x, z] of path) cells[idx(W, x, z)] = 0;
    connections.push({ a, b, path, gateKind });
    return true;
  }
  for (let i = 0; i < n - 1; i++) {
    const g = bounds.indexOf(i + 1);
    if (!connect(chain[i], chain[i + 1], g >= 0 ? (g === 0 ? 'gold' : 'silver') : null)) return null;
  }
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (zoneOfChain(i) !== zoneOfChain(j)) continue;
    if (rnd() < 0.3) connect(chain[i], chain[j], null);
  }

  // 門
  function doorOk(x, z, path, k) {
    const p = path[k - 1], q = path[k + 1];
    if (!p || !q) return null;
    const dx = q[0] - p[0], dz = q[1] - p[1];
    if (dx !== 0 && dz !== 0) return null;
    if (dz === 0) { // 東西向行走
      if (cells[idx(W, x, z - 1)] === 1 && cells[idx(W, x, z + 1)] === 1) return 'ew';
    } else {
      if (cells[idx(W, x - 1, z)] === 1 && cells[idx(W, x + 1, z)] === 1) return 'ns';
    }
    return null;
  }
  const gateDoors = [];
  for (const c of connections) {
    const P = c.path;
    let ia = -1, ib = -1;
    for (let k = 0; k < P.length; k++) { if (roomId[idx(W, P[k][0], P[k][1])] !== c.a.id) { ia = k; break; } }
    for (let k = P.length - 1; k >= 0; k--) { if (roomId[idx(W, P[k][0], P[k][1])] !== c.b.id) { ib = k; break; } }
    const cand = [];
    if (c.gateKind) {
      if (ib >= 0) cand.push(ib);
      if (ia >= 0) cand.push(ia);
      for (let k = P.length - 2; k > 0; k--) cand.push(k);
    }
    let placedGate = false;
    if (c.gateKind) {
      for (const k of cand) {
        const [x, z] = P[k];
        if (roomId[idx(W, x, z)] >= 0 || doors.has(idx(W, x, z))) continue;
        const o = doorOk(x, z, P, k);
        if (o) { doors.set(idx(W, x, z), { kind: c.gateKind, orient: o, x, z }); placedGate = true; gateDoors.push(idx(W, x, z)); break; }
      }
      if (!placedGate) return null;
    }
    for (const k of [ia, ib]) {
      if (k < 1 || k >= P.length - 1) continue;
      const [x, z] = P[k];
      if (roomId[idx(W, x, z)] >= 0 || doors.has(idx(W, x, z))) continue;
      const o = doorOk(x, z, P, k);
      if (o) doors.set(idx(W, x, z), { kind: 'door', orient: o, x, z });
    }
  }
  // 重新檢查門方向
  for (const [k, d] of [...doors]) {
    const { x, z } = d;
    const okEW = cells[idx(W, x, z - 1)] === 1 && cells[idx(W, x, z + 1)] === 1 && cells[idx(W, x - 1, z)] === 0 && cells[idx(W, x + 1, z)] === 0;
    const okNS = cells[idx(W, x - 1, z)] === 1 && cells[idx(W, x + 1, z)] === 1 && cells[idx(W, x, z - 1)] === 0 && cells[idx(W, x, z + 1)] === 0;
    if (okEW) d.orient = 'ew'; else if (okNS) d.orient = 'ns';
    else { if (d.kind !== 'door') return null; doors.delete(k); }
  }
  for (const gk of gateDoors) if (!doors.has(gk)) return null;

  // 門前格（不可放障礙物）
  const front = new Set();
  for (const d of doors.values()) {
    for (const [dx, dz] of DIRS) {
      const x = d.x + dx, z = d.z + dz;
      for (let ax = -1; ax <= 1; ax++) for (let az = -1; az <= 1; az++) front.add(idx(W, x + ax, z + az));
    }
    front.add(idx(W, d.x, d.z));
  }

  const occ = new Set();
  const level = {
    cfg, index, seed, W, H, cells, roomId, rooms, chain, doors, front,
    torches: [], windows: [], banners: [], paintings: [], decor: [], items: [], enemies: [],
    pushwalls: [], exit: null, start: null, secrets: 0, treasure: 0,
    zoneOf: (r) => zoneOf(r), gates: cfg.gates,
  };

  // 起點
  const sr = chain[0];
  level.start = { x: sr.cx, z: sr.cz, angle: 0 };
  for (let k = -2; k <= 2; k++) for (let m = -2; m <= 2; m++) occ.add(idx(W, sr.cx + k, sr.cz + m));

  // 出口牆：最後房間離入口最遠的環牆
  const lr = last;
  const lastConn = connections.find((c) => c.b === lr && chain.indexOf(c.a) === n - 2);
  const enter = lastConn ? lastConn.path[lastConn.path.length - 1] : [lr.cx, lr.cz];
  let bestExit = null, bestD = -1;
  const ringCells = (r) => {
    const out = [];
    for (let x = r.x; x < r.x + r.w; x++) { out.push([x, r.z - 1, 2]); out.push([x, r.z + r.h, 3]); }
    for (let z = r.z; z < r.z + r.h; z++) { out.push([r.x - 1, z, 0]); out.push([r.x + r.w, z, 1]); }
    return out; // [wallX, wallZ, dir pointing to open neighbor]
  };
  for (const [x, z, d] of ringCells(lr)) {
    if (cells[idx(W, x, z)] !== 1 || doors.has(idx(W, x, z))) continue;
    const ox = x + DIRS[d][0], oz = z + DIRS[d][1];
    if (front.has(idx(W, ox, oz))) continue;
    const dist = Math.abs(x - enter[0]) + Math.abs(z - enter[1]);
    if (dist > bestD) { bestD = dist; bestExit = { x, z, d }; }
  }
  if (!bestExit) return null;
  level.exit = bestExit;
  const exitFrontX = bestExit.x + DIRS[bestExit.d][0], exitFrontZ = bestExit.z + DIRS[bestExit.d][1];
  occ.add(idx(W, exitFrontX, exitFrontZ));

  // 隱藏房
  const nSecret = index === 0 ? 1 : (index < 4 ? 2 : 3);
  const closets = [];
  const secretRooms = rooms.filter((r) => r !== sr).sort(() => rnd() - 0.5);
  for (const r of secretRooms) {
    if (closets.length >= nSecret) break;
    for (const [x, z, d] of ringCells(r).sort(() => rnd() - 0.5)) {
      if (cells[idx(W, x, z)] !== 1 || doors.has(idx(W, x, z))) continue;
      const [dx, dz] = DIRS[d];
      // 往外為 -dir
      const ox = -dx, oz = -dz;
      // 檢查 5 寬 x 4 深 區域全實心
      let ok = true;
      for (let depth = 1; depth <= 4 && ok; depth++) for (let wd = -2; wd <= 2 && ok; wd++) {
        const px = x + ox * depth + (dz !== 0 ? wd : 0);
        const pz = z + oz * depth + (dx !== 0 ? wd : 0);
        if (px < 1 || pz < 1 || px >= W - 1 || pz >= H - 1 || cells[idx(W, px, pz)] !== 1) ok = false;
      }
      if (ok) {
        // ring 兩側也需實心且不是出口
        const sideA = [x + (dz !== 0 ? 1 : 0), z + (dx !== 0 ? 1 : 0)];
        const sideB = [x - (dz !== 0 ? 1 : 0), z - (dx !== 0 ? 1 : 0)];
        if (cells[idx(W, sideA[0], sideA[1])] !== 1 || cells[idx(W, sideB[0], sideB[1])] !== 1) continue;
        if (level.exit.x === x && level.exit.z === z) continue;
        const cl = [];
        for (let depth = 1; depth <= 3; depth++) for (let wd = -1; wd <= 1; wd++) {
          const px = x + ox * depth + (dz !== 0 ? wd : 0);
          const pz = z + oz * depth + (dx !== 0 ? wd : 0);
          cells[idx(W, px, pz)] = 0; cl.push([px, pz]);
        }
        level.pushwalls.push({ x, z, dx: ox, dz: oz });
        closets.push({ cells: cl, room: r });
        occ.add(idx(W, x + dx, z + dz));
        break;
      }
    }
  }
  level.secrets = level.pushwalls.length;

  // 房間風格
  const wallStyles = cfg.theme === 'cellar' ? [0, 1] : [0, 1, 2];
  for (const r of rooms) {
    r.wall = wallStyles[ri(0, wallStyles.length - 1)];
    r.floor = rnd() < 0.5 ? 0 : 1;
    r.big = r.w >= 8 && r.h >= 7;
  }
  rooms[chain[n - 1].id].floor = 1;

  const isBlockFree = (x, z) => {
    const i = idx(W, x, z);
    return cells[i] === 0 && !occ.has(i) && !front.has(i);
  };
  const free = (x, z) => cells[idx(W, x, z)] === 0 && !occ.has(idx(W, x, z));
  const take = (x, z) => occ.add(idx(W, x, z));

  // 柱子（大房間）
  for (const r of rooms) {
    if (r === sr) continue;
    if (r.big && cfg.theme !== 'cellar') {
      for (let x = r.x + 2; x <= r.x + r.w - 3; x += 3) for (let z = r.z + 2; z <= r.z + r.h - 3; z += 3) {
        if (isBlockFree(x, z)) { level.decor.push({ type: 'pillar', gx: x, gz: z, block: true }); take(x, z); }
      }
    }
  }
  // 角落擺設
  const cornerTypes = {
    courtyard: ['plant', 'crate', 'barrel'], hall: ['statue', 'table', 'plant'], library: ['table', 'statue', 'crate'],
    cellar: ['barrel', 'crate', 'barrel', 'barrel'], chapel: ['candelabra', 'statue', 'candelabra'], throne: ['statue', 'candelabra'],
  }[cfg.theme];
  for (const r of rooms) {
    if (r === sr) continue;
    const corners = [[r.x, r.z], [r.x + r.w - 1, r.z], [r.x, r.z + r.h - 1], [r.x + r.w - 1, r.z + r.h - 1]];
    for (const [x, z] of corners) {
      if (rnd() < 0.7 && isBlockFree(x, z)) {
        level.decor.push({ type: cornerTypes[ri(0, cornerTypes.length - 1)], gx: x, gz: z, block: true, rot: rnd() * 6.28 });
        take(x, z);
      }
    }
    if (cfg.theme === 'cellar') {
      for (let k = 0; k < 4; k++) {
        const x = ri(r.x, r.x + r.w - 1), z = ri(r.z, r.z + r.h - 1);
        if (isBlockFree(x, z) && (x === r.x || x === r.x + r.w - 1 || z === r.z || z === r.z + r.h - 1)) {
          level.decor.push({ type: rnd() < 0.6 ? 'barrel' : 'crate', gx: x, gz: z, block: true, rot: rnd() * 6.28 }); take(x, z);
        }
      }
    }
    if (r.big) level.decor.push({ type: 'chandelier', gx: r.cx, gz: r.cz, block: false });
  }

  // 牆面裝飾：火把、窗、旗幟、畫
  const wallSpotsOf = (r) => ringCells(r).filter(([x, z, d]) => {
    if (cells[idx(W, x, z)] !== 1 || doors.has(idx(W, x, z))) return false;
    const ox = x + DIRS[d][0], oz = z + DIRS[d][1];
    if (front.has(idx(W, ox, oz))) return false;
    if (level.exit.x === x && level.exit.z === z) return false;
    if (level.pushwalls.some((p) => p.x === x && p.z === z)) return false;
    return true;
  });
  const used = new Set();
  const useSpot = (x, z, d) => { const k = idx(W, x, z) * 4 + d; if (used.has(k)) return false; used.add(k); return true; };
  for (const r of rooms) {
    const spots = wallSpotsOf(r);
    // 依邊分組間隔
    const sides = [[], [], [], []];
    for (const s of spots) sides[s[2]].push(s);
    for (const side of sides) {
      side.sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]));
      for (let k = 1; k < side.length; k += 4) {
        const [x, z, d] = side[k];
        if (useSpot(x, z, d)) level.torches.push({ x, z, d });
      }
      for (let k = 3; k < side.length; k += 4) {
        const [x, z, d] = side[k];
        if (!useSpot(x, z, d)) continue;
        const roll = rnd();
        if (['courtyard', 'hall', 'chapel', 'throne'].includes(cfg.theme) && roll < 0.55) level.windows.push({ x, z, d });
        else if (roll < 0.8) level.banners.push({ x, z, d, c: ri(0, 2) });
        else level.paintings.push({ x, z, d, p: ri(0, 3) });
      }
    }
  }
  // 走廊火把
  const corridorTorch = [];
  for (const c of connections) {
    let step = 0;
    for (const [x, z] of c.path) {
      if (roomId[idx(W, x, z)] >= 0) continue;
      step++;
      if (step % 7 !== 3) continue;
      for (let d = 0; d < 4; d++) {
        const wx = x + DIRS[d][0], wz = z + DIRS[d][1];
        if (cells[idx(W, wx, wz)] === 1 && !doors.has(idx(W, wx, wz)) && roomId[idx(W, wx, wz)] < 0) {
          const nd = d ^ 1; // 面向走廊
          if (useSpot(wx, wz, nd)) { corridorTorch.push({ x: wx, z: wz, d: nd }); }
          break;
        }
      }
    }
  }
  level.torches.push(...corridorTorch);

  // 鑰匙
  const zoneRooms = (zn) => chain.filter((r) => zoneOf(r) === zn);
  const randCell = (r) => {
    for (let t = 0; t < 60; t++) {
      const x = ri(r.x, r.x + r.w - 1), z = ri(r.z, r.z + r.h - 1);
      if (free(x, z) && !front.has(idx(W, x, z))) return [x, z];
    }
    for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) if (free(x, z)) return [x, z];
    return null;
  };
  const place = (type, r, extra) => {
    const c = randCell(r); if (!c) return false;
    level.items.push({ type, gx: c[0], gz: c[1], ...(extra || {}) }); take(c[0], c[1]); return true;
  };
  const z0 = zoneRooms(0).filter((r) => r !== sr);
  const keyRoomG = z0.length ? z0[ri(0, z0.length - 1)] : sr;
  if (cfg.gates >= 1) { if (!place('key_gold', keyRoomG)) return null; }
  if (cfg.gates >= 2) {
    const z1 = zoneRooms(1);
    if (!place('key_silver', z1[ri(0, z1.length - 1)])) return null;
  }

  // 武器
  if (cfg.weapon) {
    const pool = zoneRooms(Math.min(1, cfg.gates)).filter((r) => r !== sr);
    const r = pool[ri(0, pool.length - 1)] || rooms[1];
    place('weapon_' + cfg.weapon, r);
  }
  // 一般道具
  const treasureTypes = ['cup', 'cross', 'crown', 'chest'];
  for (const r of rooms) {
    const area = r.w * r.h;
    if (r !== sr) {
      const nt = ri(1, area > 50 ? 3 : 2);
      for (let k = 0; k < nt; k++) place('treasure', r, { sub: treasureTypes[ri(0, 3)] });
    }
    if (rnd() < 0.8) place(rnd() < 0.3 ? 'medkit' : 'food', r);
    if (rnd() < 0.7) place(rnd() < 0.78 ? 'ammo' : 'shells', r);
    if (rnd() < 0.18) place('armor', r);
  }
  // 起點房補給
  place('ammo', sr); place('food', sr);
  if (cfg.mode === 'defense') { for (let k = 0; k < 3; k++) place('ammo', sr); for (let k = 0; k < 2; k++) { place('shells', sr); place('medkit', sr); } place('armor', sr); place('armor', sr); }
  // 人質
  if (cfg.hostage) {
    const cand = rooms.filter((r) => r !== sr).sort((a, b) => Math.hypot(b.x - sr.x, b.z - sr.z) - Math.hypot(a.x - sr.x, a.z - sr.z));
    for (const r of cand) { const c = randCell(r); if (c) { level.hostage = { gx: c[0], gz: c[1] }; take(c[0], c[1]); break; } }
    if (!level.hostage) return null;
  }

  // 隱藏房內容
  for (const cl of closets) {
    const cs = cl.cells.slice(3).concat(cl.cells.slice(0, 3));
    let k = 0;
    const put = (type, sub) => { if (k < cs.length) { const [x, z] = cs[k++]; level.items.push({ type, gx: x, gz: z, sub, secret: true }); take(x, z); } };
    put('treasure', 'chest'); put('treasure', 'crown'); put('medkit'); put('ammo'); put('shells');
  }
  for (const it of level.items) if (it.type === 'treasure') level.treasure++;

  // 敵人
  const startPathBlock = new Set();
  for (const r of rooms) {
    const area = r.w * r.h;
    let count = Math.max(1, Math.round(area / cfg.dens));
    if (r === sr || cfg.noFoes) count = 0;
    if (r === chain[1] && index === 0) count = Math.min(count, 2);
    if (r === last && cfg.boss) count = Math.max(count, 5);
    for (let k = 0; k < count; k++) {
      const c = randCell(r); if (!c) break;
      const [x, z] = c;
      if (Math.abs(x - sr.cx) + Math.abs(z - sr.cz) < 7) continue;
      const type = pickWeighted(rnd, cfg.foes);
      const ang = Math.atan2(r.cz - z, r.cx - x);
      level.enemies.push({ type, gx: x, gz: z, angle: ang + (rnd() - 0.5) });
      take(x, z);
    }
  }
  // 走廊守衛
  let cg = 0;
  for (const c of connections) {
    if (cfg.noFoes || cg >= 3 + index) break;
    const cand = c.path.filter(([x, z]) => roomId[idx(W, x, z)] < 0 && !doors.has(idx(W, x, z)) && free(x, z) && Math.abs(x - sr.cx) + Math.abs(z - sr.cz) > 12);
    if (cand.length > 6 && rnd() < 0.6) {
      const [x, z] = cand[ri(2, cand.length - 3)];
      level.enemies.push({ type: rnd() < 0.2 ? 'dog' : 'guard', gx: x, gz: z, angle: rnd() * 6.28 }); take(x, z); cg++;
    }
  }
  if (cfg.boss) {
    // 王座旁
    const ex = exitFrontX, ez = exitFrontZ;
    let bx = ex, bz = ez;
    for (let k = 0; k < 40; k++) {
      const x = ri(last.x + 1, last.x + last.w - 2), z = ri(last.z + 1, last.z + last.h - 2);
      if (Math.abs(x - ex) + Math.abs(z - ez) <= 5 && free(x, z)) { bx = x; bz = z; break; }
    }
    level.enemies.push({ type: 'boss', gx: bx, gz: bz, angle: Math.atan2(last.cz - bz, last.cx - bx), boss: true });
    take(bx, bz);
  }

  // 機關陷阱與新道具（獨立亂數，不影響既有配置）
  level.traps = [];
  {
    const r2 = mulberry32(seed + 4242), dens = cfg.trap ?? 0.6;
    const ecell = new Set(level.enemies.map((e) => idx(W, e.gx, e.gz)));
    const ok = (x, z) => free(x, z) && !front.has(idx(W, x, z)) && !ecell.has(idx(W, x, z));
    const pickc = (r) => { for (let t = 0; t < 40; t++) { const x = r.x + Math.floor(r2() * r.w), z = r.z + Math.floor(r2() * r.h); if (ok(x, z)) return [x, z]; } return null; };
    const WD = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const r of rooms) {
      if (r === sr) continue;
      const area = r.w * r.h;
      const n = (r2() < dens ? 1 : 0) + (area > 60 && r2() < dens * 0.7 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const roll = r2();
        if (roll < 0.3) {
          const c = pickc(r); if (c) { level.traps.push({ type: 'spike', gx: c[0], gz: c[1], ph: r2() * 4 }); take(c[0], c[1]); }
        } else if (roll < 0.6) {
          const c = pickc(r); if (c) { level.traps.push({ type: 'barrel', gx: c[0], gz: c[1], n: 2 + (r2() < 0.5 ? 1 : 0) }); take(c[0], c[1]); }
        } else if (roll < 0.82) {
          const cand = [];
          for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) {
            if (!ok(x, z)) continue;
            for (const [dx, dz] of WD) { const wi = idx(W, x + dx, z + dz); if (cells[wi] === 1 && roomId[wi] < 0) cand.push([x, z, dx, dz]); }
          }
          if (cand.length) { const c = cand[Math.floor(r2() * cand.length)]; level.traps.push({ type: 'flame', gx: c[0], gz: c[1], wx: c[2], wz: c[3], ph: r2() * 5 }); take(c[0], c[1]); }
        } else if (area >= 30) {
          const c = ok(r.cx, r.cz) ? [r.cx, r.cz] : pickc(r); if (c) { level.traps.push({ type: 'chandelier', gx: c[0], gz: c[1] }); take(c[0], c[1]); }
        }
      }
      if (cfg.mode === 'escape' && r2() < 0.6) { const c = pickc(r); if (c) { level.items.push({ type: 'clock', gx: c[0], gz: c[1] }); take(c[0], c[1]); } }
      if (r2() < 0.3) {
        const c = pickc(r);
        if (c) { level.items.push({ type: ['potion_speed', 'shield', 'power'][Math.floor(r2() * 3)], gx: c[0], gz: c[1] }); take(c[0], c[1]); }
      }
    }
  }

  // 啟動資訊
  level.start.angle = Math.atan2(chain[1].cz - sr.cz, chain[1].cx - sr.cx);
  level.enemyCount = level.enemies.length;
  if (cfg.mode === 'defense') {
    level.enemyCount = DEFENSE_WAVES.reduce((a, w) => a + Object.values(w).reduce((x, y) => x + y, 0), 0);
    const r3 = mulberry32(seed + 5151); level.spawns = [];
    for (const r of rooms) {
      if (r === sr) continue;
      for (let t = 0; t < 14; t++) { const x = r.x + Math.floor(r3() * r.w), z = r.z + Math.floor(r3() * r.h); if (cells[idx(W, x, z)] === 0 && Math.abs(x - sr.cx) + Math.abs(z - sr.cz) > 10) { level.spawns.push([x, z]); if (t > 4) break; } }
    }
    if (level.spawns.length < 6) return null;
  }
  level.connections = connections;
  return level;
}

// 驗證：鑰匙可取得、出口可到達、道具皆可達
export function validate(level) {
  const { W, H, cells, doors } = level;
  const reach = (keys) => {
    const seen = new Uint8Array(W * H);
    const q = [[level.start.x, level.start.z]];
    seen[idx(W, level.start.x, level.start.z)] = 1;
    while (q.length) {
      const [x, z] = q.pop();
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const i = idx(W, nx, nz);
        if (seen[i] || cells[i] !== 0) continue;
        const d = doors.get(i);
        if (d && d.kind === 'gold' && !keys.has('gold')) continue;
        if (d && d.kind === 'silver' && !keys.has('silver')) continue;
        seen[i] = 1; q.push([nx, nz]);
      }
    }
    return seen;
  };
  const ex = level.exit;
  const exitFront = idx(W, ex.x + DIRS[ex.d][0], ex.z + DIRS[ex.d][1]);
  const R0 = reach(new Set()), R1 = reach(new Set(['gold'])), R2 = reach(new Set(['gold', 'silver']));
  const goldKey = level.items.find((i) => i.type === 'key_gold');
  const silverKey = level.items.find((i) => i.type === 'key_silver');
  const errs = [];
  if (goldKey && !R0[idx(W, goldKey.gx, goldKey.gz)]) errs.push('金鑰匙拿不到');
  if (silverKey && !R1[idx(W, silverKey.gx, silverKey.gz)]) errs.push('銀鑰匙拿不到');
  if (silverKey && R0[idx(W, silverKey.gx, silverKey.gz)]) errs.push('銀鑰匙不需金鑰匙');
  if (!R2[exitFront]) errs.push('出口到不了');
  if (level.gates >= 1 && R0[exitFront]) errs.push('不用鑰匙就能到出口');
  if (level.gates >= 2 && R1[exitFront]) errs.push('只用金鑰匙就能到出口');
  for (const it of level.items) if (!it.secret && !R2[idx(W, it.gx, it.gz)]) errs.push('道具到不了 ' + it.type);
  for (const e of level.enemies) if (!R2[idx(W, e.gx, e.gz)]) errs.push('敵人在封閉處');
  for (const r of level.rooms) if (!R2[idx(W, r.cx, r.cz)]) errs.push('房間到不了');
  // 鑰匙需在對應的門之前：金鑰匙不能在金門之後
  return errs;
}

export function generateLevel(index) {
  const base = LEVELS[index].seed;
  for (let t = 0; t < 400; t++) {
    const lv = gen(index, base + t * 7919);
    if (!lv) continue;
    const errs = validate(lv);
    if (errs.length === 0) { lv.tries = t + 1; return lv; }
  }
  throw new Error('level generation failed ' + index);
}

export function asciiMap(lv) {
  const { W, H, cells, doors } = lv;
  let s = '';
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const i = idx(W, x, z);
      let ch = cells[i] ? '#' : '.';
      const d = doors.get(i);
      if (d) ch = d.kind === 'gold' ? 'G' : d.kind === 'silver' ? 'S' : 'D';
      if (lv.start.x === x && lv.start.z === z) ch = '@';
      if (lv.exit.x === x && lv.exit.z === z) ch = 'X';
      for (const p of lv.pushwalls) if (p.x === x && p.z === z) ch = 'P';
      for (const d2 of lv.decor) if (d2.gx === x && d2.gz === z && d2.block) ch = 'o';
      for (const it of lv.items) if (it.gx === x && it.gz === z) ch = it.type.startsWith('key') ? 'K' : it.type === 'treasure' ? '$' : 'i';
      for (const e of lv.enemies) if (e.gx === x && e.gz === z) ch = e.type === 'boss' ? 'B' : 'e';
      s += ch;
    }
    s += '\n';
  }
  return s;
}
