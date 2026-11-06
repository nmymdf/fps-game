import * as THREE from 'three';
import { createEngine } from './engine.js';
import { generateLevel, LEVELS } from './levelgen.js';
import { World } from './world.js';
import { Enemies, TYPES } from './enemies.js';
import { ViewModel, WEAPONS, WEAPON_ORDER } from './weapons.js';
import { buildItem, TREASURE_SCORE, TREASURE_NAME, ITEM_NAME } from './items.js';
import { AudioEngine, TRACKS } from './audio.js';
import { mountUI, drawFace } from './ui.js';
import { CELL, EYE, WALL_H, THEMES, VERSION } from './const.js';
import { flames } from './decor.js';
import { sprites, getSet, setTexSize } from './textures.js';

// ======================= 基本設定 =======================
const SAVE = 'castleStrike.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch { return {}; } };
const save = (o) => { try { localStorage.setItem(SAVE, JSON.stringify({ ...load(), ...o })); } catch { /* 無法存檔也沒關係 */ } };
const settings = Object.assign({ music: 70, sfx: 90, sens: 100, quality: 'high', diff: 'easy' }, load().settings || {});

setTexSize(settings.quality === 'high' ? 1024 : 512);
const ui = mountUI(); const $ = ui.$;
const canvas = document.getElementById('c');
const eng = createEngine(canvas, settings.quality);
const { scene, camera } = eng;
const audio = new AudioEngine(); audio.setVolumes(settings.music / 100 * 1.1, settings.sfx / 100);
const vm = new ViewModel(eng.vmScene);
const fxSprites = sprites();

// ======================= 狀態 =======================
const G = {
  mode: 'title', levelIndex: 0, lv: null, world: null, enemies: null, items: [], time: 0, levelTime: 0,
  P: null, snapshot: null, kills: 0, treasure: 0, secrets: 0, mapSeen: null, bossDead: false, winT: 0, deadT: 0, locked: false,
};
const keys = new Set(); let mouseDown = false;
const P = G.P = { x: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, hp: 100, armor: 0, alive: true, moving: false, firing: false,
  weapons: { knife: true, pistol: true }, mag: { pistol: 12, smg: 0, shotgun: 0, rifle: 0 }, ammo: { bullets: 48, shells: 0 }, cur: 'pistol', cd: 0, reload: 0, reloadShell: 0,
  keys: { gold: false, silver: false }, score: 0, bob: 0, stepT: 0, shake: 0, hurtT: 0, hurtFlash: 0, flash: 0, mood: 'normal', moodT: 0, look: 0, lookT: 0, meleeT: 0 };

// ======================= 粒子 =======================
const fxPool = [];
for (let i = 0; i < 90; i++) {
  const m = new THREE.SpriteMaterial({ map: fxSprites.spark, transparent: true, depthWrite: false, fog: true });
  const s = new THREE.Sprite(m); s.visible = false; scene.add(s); fxPool.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, g: 0, grow: 0, size: 0.1, a: 1 });
}
let fxI = 0;
function spawnFx(x, y, z, kind, n = 1) {
  for (let k = 0; k < n; k++) {
    const f = fxPool[fxI++ % fxPool.length], m = f.s.material;
    f.s.visible = true; f.s.position.set(x, y, z); f.life = 0;
    if (kind === 'spark') { m.map = fxSprites.spark; m.blending = THREE.AdditiveBlending; m.color.set(0xffd890); f.max = 0.25 + Math.random() * 0.2; f.vx = (Math.random() - 0.5) * 3; f.vy = Math.random() * 2.2; f.vz = (Math.random() - 0.5) * 3; f.g = 8; f.size = 0.1 + Math.random() * 0.1; f.grow = -0.1; f.a = 1; }
    else if (kind === 'smoke') { m.map = fxSprites.glow; m.blending = THREE.NormalBlending; m.color.set(0x9a9288); f.max = 0.7 + Math.random() * 0.4; f.vx = (Math.random() - 0.5) * 0.4; f.vy = 0.3 + Math.random() * 0.3; f.vz = (Math.random() - 0.5) * 0.4; f.g = 0; f.size = 0.2; f.grow = 0.9; f.a = 0.35; }
    else if (kind === 'blood') { m.map = fxSprites.glow; m.blending = THREE.NormalBlending; m.color.set(0xb01818); f.max = 0.5 + Math.random() * 0.3; f.vx = (Math.random() - 0.5) * 2.6; f.vy = Math.random() * 2; f.vz = (Math.random() - 0.5) * 2.6; f.g = 7; f.size = 0.14 + Math.random() * 0.1; f.grow = 0; f.a = 0.9; }
    else if (kind === 'dust') { m.map = fxSprites.glow; m.blending = THREE.NormalBlending; m.color.set(0xb0a090); f.max = 0.6; f.vx = (Math.random() - 0.5) * 0.8; f.vy = 0.4; f.vz = (Math.random() - 0.5) * 0.8; f.g = 0; f.size = 0.15; f.grow = 0.7; f.a = 0.3; }
    m.opacity = f.a; f.s.scale.setScalar(f.size);
  }
}
function updateFx(dt) {
  for (const f of fxPool) {
    if (!f.s.visible) continue;
    f.life += dt; if (f.life >= f.max) { f.s.visible = false; continue; }
    f.vy -= f.g * dt; f.s.position.x += f.vx * dt; f.s.position.y = Math.max(0.03, f.s.position.y + f.vy * dt); f.s.position.z += f.vz * dt;
    const k = f.life / f.max; f.size = Math.max(0.01, f.size + f.grow * dt); f.s.scale.setScalar(f.size); f.s.material.opacity = f.a * (1 - k);
  }
}

// ======================= 提示 =======================
const toastsEl = $('toasts');
function toast(msg, cls = '') {
  const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = msg; toastsEl.appendChild(d);
  while (toastsEl.children.length > 4) toastsEl.firstChild.remove();
  setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 500); }, 2600);
}

// ======================= 關卡載入 =======================
function disposeWorld() {
  if (G.enemies) G.enemies.dispose();
  for (const it of G.items) scene.remove(it.obj);
  G.items = [];
  if (G.world) {
    scene.remove(G.world.group);
    G.world.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
  flames.length = 0; G.world = null; G.enemies = null;
}
function enableShadows(root) {
  root.traverse((o) => { if (o.isMesh && o.material && !o.material.isMeshBasicMaterial && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = true; } });
}
function loadWorld(i) {
  disposeWorld();
  G.levelIndex = i;
  G.lv = generateLevel(i);
  G.world = new World(G.lv, scene, settings.quality);
  enableShadows(G.world.group);
  G.world.onDoor = (a, x, z, kind) => audio.sfx(a === 'open' ? 'door_open' : 'door_close', x, z);
  G.world.onPush = (x, z) => { audio.sfx('push', x, z); if (G.mode === 'playing') { G.secrets++; toast('發現秘密！', 'good'); setTimeout(() => audio.sfx('secret'), 700); } };
  G.mapSeen = new Uint8Array(G.lv.W * G.lv.H);
}
function loadoutFor(i) {
  const w = { knife: true, pistol: true }, mag = { pistol: 12, smg: 0, shotgun: 0, rifle: 0 };
  const ammo = { bullets: 48, shells: 0 };
  if (i >= 1) { w.smg = true; mag.smg = 30; ammo.bullets += 30; }
  if (i >= 2) { w.shotgun = true; mag.shotgun = 6; ammo.shells = 12; }
  if (i >= 3) { w.rifle = true; mag.rifle = 10; ammo.bullets += 10; }
  return { weapons: w, mag, ammo, hp: 100, armor: i >= 3 ? 25 : 0, cur: i >= 3 ? 'rifle' : i >= 2 ? 'shotgun' : i >= 1 ? 'smg' : 'pistol' };
}
function applyLoadout(l) {
  P.weapons = { ...l.weapons }; P.mag = { ...l.mag }; P.ammo = { ...l.ammo }; P.hp = l.hp; P.armor = l.armor; P.cur = l.cur;
}
function populate(fresh) {
  const lv = G.lv, w = G.world;
  P.x = (lv.start.x + 0.5) * CELL; P.z = (lv.start.z + 0.5) * CELL;
  P.yaw = Math.atan2(Math.cos(lv.start.angle), -Math.sin(lv.start.angle)); P.pitch = 0; P.vx = P.vz = 0;
  P.alive = true; P.keys = { gold: false, silver: false }; P.cd = 0; P.reload = 0; P.meleeT = 0; P.hurtFlash = 0; P.shake = 0;
  G.kills = 0; G.treasure = 0; G.secrets = 0; G.levelTime = 0; G.bossDead = false; G.winT = 0; G.deadT = 0;
  G.enemies = new Enemies(scene, w, lv, enemyCtx);
  for (const e of G.enemies.list) { enableShadows(e.group); e.blob.visible = false; }
  for (const it of lv.items) addItem(it.type, (it.gx + 0.5) * CELL, (it.gz + 0.5) * CELL, it.sub);
  if (G.mode !== 'title') {
    vm.show(P.cur); vm.next = null; vm.switchT = 1;
  }
  refreshWeaponList();
}
function addItem(type, x, z, sub, drop = false) {
  const b = buildItem(type, sub);
  b.obj.position.set(x, b.y, z); scene.add(b.obj);
  enableShadows(b.obj);
  const it = { type, sub, x, z, y: b.y, obj: b.obj, t: Math.random() * 6, taken: false, drop };
  G.items.push(it); return it;
}

const enemyCtx = {
  sfx: (n, x, z) => audio.sfx(n, x, z),
  hitPlayer: (dmg, fx, fz) => damagePlayer(dmg, fx, fz),
  onKill: (e) => {
    G.kills++; P.score += e.T.score;
    P.mood = 'grin'; P.moodT = 0.9;
    spawnFx(e.x, 1.0, e.z, 'blood', 8);
    if (e.type === 'guard' || e.type === 'officer') addItem('ammo', e.x, e.z, null, true);
    else if (e.type === 'heavy') addItem('shells', e.x, e.z, null, true);
    if (e.type === 'boss') { G.bossDead = true; G.winT = 3.5; toast('統領倒下了！', 'good'); }
  },
};

const DIFF = { easy: 0.5, normal: 0.8, hard: 1.2 };
function damagePlayer(dmg, fx, fz) {
  if (!P.alive || G.mode !== 'playing') return;
  dmg = Math.max(1, Math.round(dmg * (DIFF[settings.diff] || 0.8)));
  if (P.armor > 0) { const ab = Math.min(P.armor, Math.round(dmg * 0.5)); P.armor -= ab; dmg -= ab; }
  P.hp -= dmg; P.hurtFlash = Math.min(1, P.hurtFlash + 0.25 + dmg / 35); P.shake = Math.min(1.5, P.shake + 0.5 + dmg / 25);
  P.mood = 'hurt'; P.moodT = 0.6;
  audio.sfx('hurt_player');
  if (P.hp <= 0) { P.hp = 0; die(); }
}
function die() {
  P.alive = false; G.mode = 'dying'; G.deadT = 0; P.mood = 'dead';
  audio.sfx('die_player'); audio.stop(0.3); setTimeout(() => audio.jingle('death'), 400);
  if (document.pointerLockElement) document.exitPointerLock();
}

// ======================= 武器 =======================
function refreshWeaponList() {
  const el = $('wlist'); el.innerHTML = '';
  WEAPON_ORDER.forEach((id, i) => {
    const d = document.createElement('div'); d.className = 'wslot' + (P.weapons[id] ? ' own' : '') + (P.cur === id ? ' cur' : ''); d.textContent = String(i + 1); d.title = WEAPONS[id].name; el.appendChild(d);
  });
}
function switchWeapon(id) {
  if (!P.weapons[id] || id === P.cur || !P.alive) return;
  P.cur = id; P.reload = 0; vm.reloadT = 0; vm.setWeapon(id); P.cd = Math.max(P.cd, 0.2);
  audio.sfx('switch'); refreshWeaponList(); lastHud.cur = null;
}
function cycleWeapon(dir) {
  const owned = WEAPON_ORDER.filter((id) => P.weapons[id]);
  let i = owned.indexOf(P.cur); i = (i + dir + owned.length) % owned.length; switchWeapon(owned[i]);
}
function aimDir(yawOff = 0, pitchOff = 0) {
  const yaw = P.yaw + yawOff, pitch = P.pitch + pitchOff, cp = Math.cos(pitch);
  return [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}
const eyeY = () => EYE - 0.12;
function hitscan(dx, dy, dz, maxT = 70) {
  const w = G.world, ox = P.x, oy = eyeY(), oz = P.z, lh = Math.hypot(dx, dz);
  let wallT = maxT;
  if (lh > 1e-6) wallT = Math.min(wallT, w.rayDist(ox, oz, dx / lh, dz / lh, maxT * lh) / lh);
  if (dy < -1e-6) wallT = Math.min(wallT, oy / -dy); else if (dy > 1e-6) wallT = Math.min(wallT, (WALL_H - oy) / dy);
  const hit = G.enemies.raycast(ox, oy, oz, dx, dy, dz, wallT);
  const t = hit ? hit.t : wallT;
  return { hit, t, px: ox + dx * t, py: oy + dy * t, pz: oz + dz * t, wall: !hit };
}
function aimAssist() {
  // 輕微輔助：準心附近有敵人時，把垂直角度修正到胸口
  let best = null, bd = 1e9;
  const fx = Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const e of G.enemies.list) {
    if (e.dead) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < 0.8 || d > 40) continue;
    const dot = (dx * fx + dz * fz) / d; if (dot < 0.9) continue;
    const lat = Math.abs(dx * fz - dz * fx);
    if (lat > e.T.r + 0.3) continue;
    if (!G.world.los(P.x, P.z, e.x, e.z)) continue;
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) return [0, 0];
  const d = bd, ty = best.T.h * 0.62, pitch = Math.atan2(ty - eyeY(), d);
  const ex = best.x - P.x, ez = best.z - P.z; const bearing = Math.atan2(ex, -ez);
  let dyaw = bearing - P.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  return [Math.abs(dyaw) < 0.06 ? dyaw : 0, pitch - P.pitch];
}
function fire() {
  const W = WEAPONS[P.cur];
  if (!P.alive || P.cd > 0 || vm.next || vm.switchT < 1) return false;
  if (W.melee) {
    P.cd = W.rate; vm.melee(); audio.sfx('knife'); P.meleeT = 0.12; return true;
  }
  if (P.reload > 0 && !(W.perShell && P.mag[P.cur] > 0)) return false;
  if (P.reload > 0 && W.perShell) { P.reload = 0; vm.reloadT = 0; }
  if (P.mag[P.cur] <= 0) {
    if (P.ammo[W.ammo] > 0) startReload(); else { audio.sfx('empty'); P.cd = 0.3; toast('沒子彈了！', 'bad'); }
    return false;
  }
  P.mag[P.cur]--; P.cd = W.rate;
  const [ay, ap] = P.cur === 'shotgun' ? [0, 0] : aimAssist();
  const spreadK = P.moving ? 1.4 : 1;
  let killedAny = false, hitAny = false;
  for (let k = 0; k < (W.pellets || 1); k++) {
    const sy = (Math.random() - 0.5) * 2 * W.spread * spreadK + (k === 0 ? ay : ay * 0.5), sp = (Math.random() - 0.5) * 2 * W.spread * spreadK * 0.7 + (k === 0 ? ap : ap * 0.5);
    const [dx, dy, dz] = aimDir(sy, sp); const r = hitscan(dx, dy, dz);
    if (r.hit) {
      const dmg = W.dmg[0] + Math.random() * (W.dmg[1] - W.dmg[0]);
      const dist = r.t; const falloff = P.cur === 'shotgun' ? Math.max(0.25, 1 - dist / 22) : 1;
      const kill = G.enemies.hurt(r.hit.enemy, Math.round(dmg * falloff), r.hit.head);
      spawnFx(r.px, r.py, r.pz, 'blood', 3); hitAny = true; killedAny = killedAny || kill;
    } else { spawnFx(r.px, r.py, r.pz, 'spark', 3); spawnFx(r.px, r.py, r.pz, 'dust', 1); }
  }
  vm.fire(W); audio.sfx(P.cur); if (P.cur === 'shotgun') setTimeout(() => audio.sfx('pump'), 380);
  P.pitch += W.kick * 0.5 * (0.6 + Math.random() * 0.4); P.yaw += (Math.random() - 0.5) * W.kick * 0.3;
  G.enemies.noise(P.x, P.z, P.cur === 'knife' ? 0 : 16);
  P.firing = true; P.firingT = 0.5;
  if (hitAny) { const c = $('cross'); c.classList.add('hit'); setTimeout(() => c.classList.remove('hit'), 110); }
  if (P.mag[P.cur] <= 0 && P.ammo[W.ammo] > 0) setTimeout(() => { if (P.alive && P.mag[P.cur] <= 0) startReload(); }, W.rate * 1000 + 50);
  return true;
}
function startReload() {
  const W = WEAPONS[P.cur];
  if (W.melee || P.reload > 0 || P.mag[P.cur] >= W.mag || P.ammo[W.ammo] <= 0 || !P.alive) return;
  P.reload = W.perShell ? 0.0001 : W.reload; P.reloadShell = W.perShell ? W.reload : 0;
  if (W.perShell) { P.reloadT = W.reload; } else { vm.startReload(W.reload); audio.sfx('reload'); }
  P.reloadT = W.reload;
}
function updateReload(dt) {
  if (P.reload <= 0) return;
  const W = WEAPONS[P.cur];
  P.reloadT -= dt;
  if (P.reloadT > 0) return;
  if (W.perShell) {
    P.mag[P.cur]++; P.ammo[W.ammo]--; audio.sfx('reload');
    if (P.mag[P.cur] >= W.mag || P.ammo[W.ammo] <= 0) { P.reload = 0; vm.pumpT = 0; audio.sfx('pump'); } else P.reloadT = W.reload;
  } else {
    const need = W.mag - P.mag[P.cur], take = Math.min(need, P.ammo[W.ammo]);
    P.mag[P.cur] += take; P.ammo[W.ammo] -= take; P.reload = 0;
  }
}
function meleeStrike() {
  const W = WEAPONS.knife;
  let hitSomething = false;
  for (const off of [-0.12, 0, 0.12]) {
    const [dx, dy, dz] = aimDir(off, 0), r = hitscan(dx, dy, dz, W.reach);
    if (r.hit && r.t <= W.reach) {
      G.enemies.hurt(r.hit.enemy, Math.round(W.dmg[0] + Math.random() * (W.dmg[1] - W.dmg[0])), false); spawnFx(r.px, r.py, r.pz, 'blood', 4); hitSomething = true; break;
    }
  }
  if (hitSomething) { audio.sfx('knife_hit'); G.enemies.noise(P.x, P.z, 6); }
}

// ======================= 撿道具 =======================
function collect(it) {
  switch (it.type) {
    case 'food': if (P.hp >= 100) return false; P.hp = Math.min(100, P.hp + 10); audio.sfx('health'); toast('補充體力 +10', 'good'); break;
    case 'medkit': if (P.hp >= 100) return false; P.hp = Math.min(100, P.hp + 25); audio.sfx('health'); toast('急救包 +25', 'good'); break;
    case 'ammo': P.ammo.bullets = Math.min(250, P.ammo.bullets + 12); audio.sfx('pickup'); toast('子彈 +12'); break;
    case 'shells': P.ammo.shells = Math.min(60, P.ammo.shells + 6); audio.sfx('pickup'); toast('散彈 +6'); break;
    case 'armor': if (P.armor >= 100) return false; P.armor = Math.min(100, P.armor + 30); audio.sfx('pickup'); toast('護甲 +30', 'good'); break;
    case 'key_gold': P.keys.gold = true; audio.sfx('key'); toast('拿到金鑰匙！', 'good'); break;
    case 'key_silver': P.keys.silver = true; audio.sfx('key'); toast('拿到銀鑰匙！', 'good'); break;
    case 'treasure': { const s = TREASURE_SCORE[it.sub] || 500; P.score += s; G.treasure++; audio.sfx('treasure'); toast(`${TREASURE_NAME[it.sub] || '寶物'} +${s}`, 'good'); break; }
    default:
      if (it.type.startsWith('weapon_')) {
        const id = it.type.slice(7), W = WEAPONS[id];
        if (!P.weapons[id]) { P.weapons[id] = true; P.mag[id] = W.mag; toast(`得到 ${W.name}！按 ${W.slot} 切換`, 'good'); audio.sfx('weapon'); P.mood = 'grin'; P.moodT = 1.2; refreshWeaponList(); setTimeout(() => switchWeapon(id), 50); }
        else toast('補充彈藥');
        if (W.ammo === 'shells') P.ammo.shells = Math.min(60, P.ammo.shells + 8); else P.ammo.bullets = Math.min(250, P.ammo.bullets + 30);
      }
  }
  P.flash = 0.35; P.score += it.type === 'treasure' ? 0 : 0;
  return true;
}
function updateItems(dt) {
  for (const it of G.items) {
    if (it.taken) continue;
    it.t += dt; const wr = it.obj.userData.spin; wr.rotation.y += dt * 1.7; it.obj.position.y = it.y + Math.sin(it.t * 2.2) * 0.07;
    const dx = it.x - P.x, dz = it.z - P.z;
    { const gl = it.obj.userData.glow, dd = Math.hypot(dx, dz), k = Math.min(1, Math.max(0, (dd - 0.9) / 2.2)); gl.material.opacity = gl.userData.base * k * k; }
    if (dx * dx + dz * dz < 1.15 * 1.15 && P.alive) { if (collect(it)) { it.taken = true; scene.remove(it.obj); } }
  }
}

// ======================= 玩家移動 / 互動 =======================
function updatePlayer(dt) {
  const w = G.world;
  let fwd = 0, str = 0, turn = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) fwd += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) fwd -= 1;
  if (keys.has('KeyD')) str += 1; if (keys.has('KeyA')) str -= 1;
  if (keys.has('ArrowRight')) turn += 1; if (keys.has('ArrowLeft')) turn -= 1;
  P.yaw += turn * 2.3 * dt;
  const fx = Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = Math.sin(P.yaw);
  let wx = fx * fwd + rx * str, wz = fz * fwd + rz * str; const l = Math.hypot(wx, wz); if (l > 0) { wx /= l; wz /= l; }
  const speed = 6.0, acc = l > 0 ? 14 : 12;
  P.vx += (wx * speed - P.vx) * Math.min(1, acc * dt); P.vz += (wz * speed - P.vz) * Math.min(1, acc * dt);
  const before = [P.x, P.z];
  [P.x, P.z] = w.tryMove(P.x, P.z, P.vx * dt, P.vz * dt, 0.38);
  const moved = Math.hypot(P.x - before[0], P.z - before[1]) / dt;
  P.moving = moved > 1.0;
  // 敵人互相擠壓玩家
  for (const e of G.enemies.list) { if (e.dead) continue; const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), m = 0.38 + e.T.r; if (d < m && d > 0.001) { [P.x, P.z] = w.tryMove(P.x, P.z, dx / d * (m - d), dz / d * (m - d), 0.38); } }
  if (P.moving) { P.bob += dt * 9.5; P.stepT -= dt; if (P.stepT <= 0) { P.stepT = 0.36; audio.sfx('step', undefined, undefined, 0.8); } } else P.bob += dt * 1.5;
  // 自動開普通門
  for (const d of w.doors) {
    if (d.kind !== 'door' || d.target === 1) continue;
    const dx = d.x - P.x, dz = d.z - P.z, dist = Math.hypot(dx, dz);
    if (dist < 1.9 && (P.vx * dx + P.vz * dz) > 0.3 * dist * 3) w.openDoor(d, P.keys);
  }
  if (P.pitch > 1.15) P.pitch = 1.15; if (P.pitch < -1.15) P.pitch = -1.15;
  P.pitch += (0 - P.pitch) * Math.min(1, dt * 0.0); // 不自動回正
  if (P.firingT > 0) { P.firingT -= dt; if (P.firingT <= 0) P.firing = false; }
}
function interact() {
  if (!P.alive) return;
  const w = G.world, hit = w.findInteract(P.x, P.z, P.yaw, 3.4); if (!hit) return;
  if (hit.type === 'door') {
    const r = w.openDoor(hit.door, P.keys);
    if (r === 'locked_gold') { toast('需要金鑰匙', 'bad'); audio.sfx('locked'); }
    else if (r === 'locked_silver') { toast('需要銀鑰匙', 'bad'); audio.sfx('locked'); }
  } else if (hit.type === 'push') { w.push(hit.pw); }
  else if (hit.type === 'exit') {
    if (G.levelIndex === LEVELS.length - 1 && !G.bossDead) { toast('統領還在城裡！先打倒他', 'bad'); audio.sfx('locked'); return; }
    finishLevel();
  }
}

// ======================= 關卡完成 / 結算 =======================
const fmtTime = (s) => { s = Math.floor(s); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function stats() {
  const lv = G.lv;
  return { kills: G.kills, kTotal: lv.enemyCount, tr: G.treasure, tTotal: lv.treasure, sec: G.secrets, sTotal: lv.secrets, time: G.levelTime };
}
function finishLevel() {
  const s = stats(); let bonus = 0; const notes = [];
  if (s.kills >= s.kTotal) { bonus += 1000; notes.push('全部殲滅 +1000'); }
  if (s.tr >= s.tTotal && s.tTotal > 0) { bonus += 1000; notes.push('寶物全拿 +1000'); }
  if (s.sec >= s.sTotal && s.sTotal > 0) { bonus += 1000; notes.push('秘密全找到 +1000'); }
  P.score += bonus;
  G.mode = 'sum'; audio.stop(0.3); audio.jingle('clear'); if (document.pointerLockElement) document.exitPointerLock();
  $('sum-t').textContent = `第 ${G.levelIndex + 1} 關　${G.lv.cfg.name}　完成`;
  $('sum-rows').innerHTML = `<div class="row"><span>擊倒敵人</span><span>${s.kills} / ${s.kTotal}</span></div><div class="row"><span>找到寶物</span><span>${s.tr} / ${s.tTotal}</span></div><div class="row"><span>發現秘密</span><span>${s.sec} / ${s.sTotal}</span></div><div class="row"><span>花費時間</span><span>${fmtTime(s.time)}</span></div>${notes.map((n) => `<div class="row gold"><span>${n}</span><span></span></div>`).join('')}<div class="row"><span>目前分數</span><span>${P.score}</span></div>`;
  $('sum-h').textContent = G.levelIndex < LEVELS.length - 1 ? '按 Enter 前往下一關' : '按 Enter 繼續';
  save({ level: Math.min(LEVELS.length - 1, G.levelIndex + 1), score: P.score });
  showScreen('s-sum');
}
function victory() {
  G.mode = 'win'; audio.stop(0.5); audio.jingle('victory'); if (document.pointerLockElement) document.exitPointerLock();
  const s = stats();
  $('win-rows').innerHTML = `<div class="row"><span>擊倒敵人</span><span>${s.kills} / ${s.kTotal}</span></div><div class="row"><span>最終分數</span><span>${P.score}</span></div>`;
  save({ level: 0, score: 0, best: Math.max(load().best || 0, P.score) });
  showMenu('m-win', [{ label: '回主選單', act: toTitle }]);
  showScreen('s-win');
}

// ======================= 畫面 / 選單 =======================
const screens = ['s-title', 's-help', 's-pause', 's-sum', 's-dead', 's-win', 's-load'];
const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
async function prefetch(theme, label) {
  showScreen('s-load'); $('load-t').textContent = label || '準備中…'; $('load-b').style.width = '0%';
  const th = THEMES[theme], names = new Set(['door', 'doorGold', 'doorSilver', 'exit']);
  const walk = (v) => { if (typeof v === 'string') names.add(v); else if (Array.isArray(v)) v.forEach(walk); };
  for (const k of ['walls', 'corridorWall', 'window', 'floors', 'corridorFloor', 'ceil', 'pillar']) walk(th[k]);
  const list = [...names]; await raf2();
  for (let i = 0; i < list.length; i++) { $('load-b').style.width = Math.round(i / list.length * 90) + '%'; await raf2(); try { getSet(list[i]); } catch (e) { /* 不是材質名稱 */ } }
  $('load-b').style.width = '95%'; await raf2();
}
function showScreen(id) { for (const s of screens) $(s).classList.toggle('on', s === id); setHudVisible(false); }
function hideScreens() { for (const s of screens) $(s).classList.remove('on'); }
function setHudVisible(v) { for (const id of ['hud', 'mini', 'wlist', 'cross', 'toasts']) $(id).style.display = v ? '' : 'none'; if (!v) $('prompt').classList.remove('on'); }
let menuSel = {}, menuItems = {}, menuActive = null;
function showMenu(id, items) {
  const el = $(id); el.innerHTML = ''; menuItems[id] = items; menuSel[id] = 0; menuActive = id;
  items.forEach((it, i) => {
    const b = document.createElement('button'); b.className = 'btn' + (i === 0 ? ' sel' : ''); b.textContent = it.label;
    b.onmouseenter = () => { menuSel[id] = i; paintMenu(id); };
    b.onclick = () => { audio.init(); audio.sfx('ui_ok'); it.act(); };
    el.appendChild(b);
  });
}
function paintMenu(id) { [...$(id).children].forEach((b, i) => b.classList.toggle('sel', i === menuSel[id])); }
function menuKey(code) {
  const id = menuActive; if (!id || !menuItems[id]) return false;
  const n = menuItems[id].length;
  if (code === 'ArrowDown' || code === 'KeyS') { menuSel[id] = (menuSel[id] + 1) % n; paintMenu(id); audio.sfx('ui'); return true; }
  if (code === 'ArrowUp' || code === 'KeyW') { menuSel[id] = (menuSel[id] + n - 1) % n; paintMenu(id); audio.sfx('ui'); return true; }
  if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') { audio.sfx('ui_ok'); menuItems[id][menuSel[id]].act(); return true; }
  return false;
}

function toTitle() {
  G.mode = 'title'; audio.stop(0.4); loadWorld(0); populateTitle();
  const sv = load(); const items = [{ label: '開始新遊戲', act: () => diffMenu(0, 0) }];
  if (sv.level > 0) items.push({ label: `繼續遊戲（第 ${sv.level + 1} 關）`, act: () => diffMenu(sv.level, sv.score || 0) });
  items.push({ label: '操作說明', act: () => { menuReturn = 'title'; showHelp(); } });
  showMenu('m-title', items); showScreen('s-title'); $('fade').style.opacity = 0;
  setTimeout(() => { audio.play('courtyard', 0.35); }, 100);
}
let menuReturn = 'title';
function diffMenu(lvl, score) {
  const go = (d) => () => { settings.diff = d; save({ settings }); newGame(lvl, score); };
  showMenu('m-title', [{ label: '輕鬆（推薦）', act: go('easy') }, { label: '普通', act: go('normal') }, { label: '困難', act: go('hard') }, { label: '返回', act: () => toTitleMenu() }]);
  menuSel['m-title'] = settings.diff === 'normal' ? 1 : settings.diff === 'hard' ? 2 : 0; paintMenu('m-title');
}
function toTitleMenu() {
  const sv = load(); const items = [{ label: '開始新遊戲', act: () => diffMenu(0, 0) }];
  if (sv.level > 0) items.push({ label: `繼續遊戲（第 ${sv.level + 1} 關）`, act: () => diffMenu(sv.level, sv.score || 0) });
  items.push({ label: '操作說明', act: () => { menuReturn = 'title'; showHelp(); } });
  showMenu('m-title', items);
}
function showHelp() { G.prevMode = G.mode; G.mode = 'help'; menuActive = 'help'; menuItems.help = [{ label: '返回', act: closeHelp }]; menuSel.help = 0; showScreen('s-help'); }
function closeHelp() { if (G.prevMode === 'title') { G.mode = 'title'; showScreen('s-title'); menuActive = 'm-title'; } else { G.mode = 'paused'; showScreen('s-pause'); menuActive = 'm-pause'; } }
function populateTitle() {
  // 標題背景：關卡 1 不放敵人與道具
  const lv = G.lv; P.x = (lv.start.x + 0.5) * CELL; P.z = (lv.start.z + 0.5) * CELL;
  G.titleYaw = 0.6;
}

function newGame(levelIdx, score) {
  audio.init(); applyLoadout(loadoutFor(levelIdx)); P.score = score; P.lives = 3; startLevel(levelIdx, true);
}
function startLevel(i, fresh) {
  $('fade').style.opacity = 1;
  G.mode = 'loading'; audio.stop(0.4);
  setTimeout(async () => {
    await prefetch(LEVELS[i].theme, `第 ${i + 1} 關　${LEVELS[i].name}`);
    loadWorld(i);
    $('load-b').style.width = '100%'; await raf2();
    G.snapshot = { weapons: { ...P.weapons }, mag: { ...P.mag }, ammo: { ...P.ammo }, hp: Math.max(P.hp, 60), armor: P.armor, cur: P.cur };
    P.hp = Math.max(P.hp, 60); P.ammo.bullets = Math.max(P.ammo.bullets, 40);
    G.snapshot.ammo = { ...P.ammo }; G.snapshot.hp = P.hp;
    G.mode = 'playing';
    populate(fresh);
    vm.show(P.cur); vm.next = null; vm.switchT = 1; vm.reloadT = 0;
    hideScreens(); setHudVisible(true);
    $('lvname').textContent = `第 ${i + 1} 關`; $('boss').classList.toggle('on', false);
    toast(`第 ${i + 1} 關　${G.lv.cfg.name}`);
    if (i === 0 && fresh) setTimeout(() => toast('找到金色/銀色鑰匙，打開鎖住的門'), 600);
    audio.play(G.lv.cfg.theme, i === 5 ? 0.5 : 0.22);
    $('fade').style.opacity = 0;
    requestLock();
  }, 650);
}
function retryLevel() {
  const s = G.snapshot; applyLoadout(s); startLevel(G.levelIndex, false);
}
function nextLevel() {
  if (G.levelIndex >= LEVELS.length - 1) { victory(); return; }
  startLevel(G.levelIndex + 1, false);
}

function pauseGame() {
  if (G.mode !== 'playing') return;
  G.mode = 'paused'; if (document.pointerLockElement) document.exitPointerLock();
  $('r-music').value = settings.music; $('r-sfx').value = settings.sfx; $('r-sens').value = settings.sens;
  for (const k of ['music', 'sfx', 'sens']) $('v-' + k).textContent = settings[k];
  paintQuality(); paintDiff();
  showMenu('m-pause', [{ label: '繼續遊戲', act: resumeGame }, { label: '重玩本關', act: () => { retryLevel(); } }, { label: '操作說明', act: () => { G.prevMode = 'paused'; showHelp(); } }, { label: '回主選單', act: toTitle }]);
  showScreen('s-pause'); $('hud').style.display = '';
}
function resumeGame() { if (G.mode !== 'paused') return; G.mode = 'playing'; hideScreens(); setHudVisible(true); requestLock(); }
function requestLock() {
  let p; try { p = canvas.requestPointerLock && canvas.requestPointerLock(); } catch (e) { /* ignore */ }
  if (p && p.catch) p.catch(() => { if (G.mode === 'playing' && !navigator.webdriver) pauseGame(); });
}
document.addEventListener('pointerlockchange', () => {
  G.locked = document.pointerLockElement === canvas;
  if (G.locked) $('click').classList.remove('on');
  else if (G.mode === 'playing') pauseGame();
});
$('click').addEventListener('click', () => { requestLock(); });
$('s-help').querySelector('.btn').addEventListener('click', () => closeHelp());

// 設定
const sv = { music: 'r-music', sfx: 'r-sfx', sens: 'r-sens' };
for (const k in sv) $(sv[k]).addEventListener('input', (e) => {
  settings[k] = Number(e.target.value); $('v-' + k).textContent = settings[k];
  audio.setVolumes(settings.music / 100 * 1.1, settings.sfx / 100); save({ settings });
});
function paintDiff() { [...$('seg-d').children].forEach((b) => b.classList.toggle('on', b.dataset.d === settings.diff)); }
function paintQuality() { [...$('seg-q').children].forEach((b) => b.classList.toggle('on', b.dataset.q === settings.quality)); }
$('seg-d').addEventListener('click', (e) => { const d = e.target.dataset && e.target.dataset.d; if (!d) return; settings.diff = d; paintDiff(); save({ settings }); });
$('seg-q').addEventListener('click', (e) => { const q = e.target.dataset && e.target.dataset.q; if (!q) return; settings.quality = q; eng.setQuality(q); paintQuality(); save({ settings }); });

// ======================= 輸入 =======================
window.addEventListener('keydown', (e) => {
  if (e.repeat && !['ArrowDown', 'ArrowUp'].includes(e.code)) { if (G.mode === 'playing') e.preventDefault(); return; }
  audio.init();
  const c = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c)) e.preventDefault();
  if (G.mode === 'title') { menuKey(c); return; }
  if (G.mode === 'help') { if (c === 'Enter' || c === 'Escape' || c === 'Space' || c === 'Backspace') closeHelp(); return; }
  if (G.mode === 'sum') { if (c === 'Enter' || c === 'Space') { hideScreens(); nextLevel(); } return; }
  if (G.mode === 'win') { menuKey(c); return; }
  if (G.mode === 'dead') { if (c === 'Enter' || c === 'Space') retryLevel(); else menuKey(c); return; }
  if (G.mode === 'paused') { if (c === 'Escape') resumeGame(); else menuKey(c); return; }
  if (G.mode !== 'playing') return;
  keys.add(c);
  if (c === 'Escape') { pauseGame(); return; }
  if (c === 'KeyE' || c === 'Space') interact();
  if (c === 'KeyR') startReload();
  if (c === 'KeyM' || c === 'Tab') toggleMap();
  if (c === 'KeyF') mouseDown = true;
  if (c.startsWith('Digit')) { const n = Number(c.slice(5)); const id = WEAPON_ORDER[n - 1]; if (id) switchWeapon(id); }
  if (c === 'KeyQ') cycleWeapon(-1);
});
window.addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyF') mouseDown = false; });
window.addEventListener('blur', () => { keys.clear(); mouseDown = false; if (G.mode === 'playing') pauseGame(); });
canvas.addEventListener('mousedown', (e) => { audio.init(); if (G.mode === 'playing') { if (!G.locked) { requestLock(); return; } if (e.button === 0) mouseDown = true; } });
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
document.addEventListener('mousemove', (e) => {
  if (G.mode !== 'playing' || !G.locked) return;
  const k = 0.0022 * settings.sens / 100;
  P.yaw += e.movementX * k; P.pitch -= e.movementY * k;
});
window.addEventListener('wheel', (e) => { if (G.mode === 'playing') { e.preventDefault(); cycleWeapon(e.deltaY > 0 ? 1 : -1); } }, { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ======================= 地圖 =======================
let mapOn = false;
function toggleMap() { mapOn = !mapOn; $('map').classList.toggle('on', mapOn); if (mapOn) { $('mapt').textContent = `第 ${G.levelIndex + 1} 關　${G.lv.cfg.name}`; drawMap(ui.mapc, false); } }
function markSeen() {
  const w = G.world, W = w.W, gx = Math.floor(P.x / CELL), gz = Math.floor(P.z / CELL), R = 7;
  for (let z = gz - R; z <= gz + R; z++) for (let x = gx - R; x <= gx + R; x++) {
    if (!w.inb(x, z)) continue;
    if (w.cells[z * W + x] === 1 && !w.solidCell(x, z)) { /* 隱藏牆保持牆樣 */ }
    const cx = (x + 0.5) * CELL, cz = (z + 0.5) * CELL;
    if (w.cells[z * W + x] === 1) { // 牆：只要鄰近可見的地板被看到
      let vis = false; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (w.inb(nx, nz) && G.mapSeen[nz * W + nx] === 1 && w.cells[nz * W + nx] === 0) vis = true; }
      if (vis && (x - gx) ** 2 + (z - gz) ** 2 < R * R) G.mapSeen[z * W + x] = 1;
    } else if ((x - gx) ** 2 + (z - gz) ** 2 <= R * R && w.los(P.x, P.z, cx, cz)) G.mapSeen[z * W + x] = 1;
  }
}
function drawMap(cv, mini) {
  const w = G.world, lv = G.lv, W = w.W, H = w.H, c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  let x0 = 0, z0 = 0, vw = W, vh = H;
  if (mini) { const R = 10, gx = Math.floor(P.x / CELL), gz = Math.floor(P.z / CELL); x0 = gx - R; z0 = gz - R; vw = vh = R * 2 + 1; }
  const cs = Math.floor(Math.min(cv.width / vw, cv.height / vh));
  const ox = Math.floor((cv.width - cs * vw) / 2), oy = Math.floor((cv.height - cs * vh) / 2);
  for (let z = 0; z < vh; z++) for (let x = 0; x < vw; x++) {
    const gx = x0 + x, gz = z0 + z; if (!w.inb(gx, gz)) continue; const i = gz * W + gx; if (!G.mapSeen[i]) continue;
    const solid = w.cells[i] === 1; const door = w.doorAt.get(i);
    c.fillStyle = door ? (door.kind === 'gold' ? '#e8c040' : door.kind === 'silver' ? '#c8d8f0' : '#9a6a30') : solid ? '#6a6258' : '#2c241c';
    if (lv.exit.x === gx && lv.exit.z === gz) c.fillStyle = '#4ad06a';
    c.fillRect(ox + x * cs, oy + z * cs, cs, cs);
    if (!solid && !door) { c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(ox + x * cs, oy + z * cs, cs - 1, cs - 1); }
  }
  // 玩家
  const px = ox + (P.x / CELL - x0) * cs, pz = oy + (P.z / CELL - z0) * cs;
  c.save(); c.translate(px, pz); c.rotate(P.yaw); c.fillStyle = '#ff5a3a'; c.beginPath(); c.moveTo(0, -cs * 0.9); c.lineTo(cs * 0.6, cs * 0.6); c.lineTo(0, cs * 0.25); c.lineTo(-cs * 0.6, cs * 0.6); c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); c.restore();
}

// ======================= HUD 更新 =======================
const lastHud = {};
function setTxt(id, v, key = id) { if (lastHud[key] !== v) { lastHud[key] = v; $(id).textContent = v; } }
function updateHud(dt) {
  setTxt('hp', Math.ceil(P.hp)); $('hp').classList.toggle('low', P.hp > 0 && P.hp <= 25);
  setTxt('ar', Math.ceil(P.armor));
  const W = WEAPONS[P.cur]; setTxt('wname', W.name, 'wn');
  const am = W.melee ? '—' : `${P.mag[P.cur]}`; const rs = W.melee ? '' : ` / ${P.ammo[W.ammo]}`;
  const key = am + rs + (P.reload > 0 ? 'r' : ''); if (lastHud.ammo !== key) { lastHud.ammo = key; $('ammo').innerHTML = `${am}<span style="font-size:.5em;color:#bba773">${rs}${P.reload > 0 ? '　換彈中' : ''}</span>`; $('ammo').classList.toggle('low', !W.melee && P.mag[P.cur] === 0 && P.ammo[W.ammo] === 0); }
  if (lastHud.cur !== P.cur) { lastHud.cur = P.cur; refreshWeaponList(); }
  setTxt('lives', P.lives); setTxt('score', P.score); setTxt('kills', `${G.kills}/${G.lv ? G.lv.enemyCount : 0}`);
  $('kg').classList.toggle('on', P.keys.gold); $('ks').classList.toggle('on', P.keys.silver);
  // 臉
  P.lookT -= dt; if (P.lookT <= 0) { P.lookT = 0.8 + Math.random() * 1.8; P.look = [-1, 0, 0, 1][Math.floor(Math.random() * 4)]; }
  if (P.moodT > 0) { P.moodT -= dt; if (P.moodT <= 0 && P.alive) P.mood = 'normal'; }
  drawFace(ui.face, Math.max(0, P.hp / 100), P.look, P.mood, G.time);
}
let prompt = '';
function updatePrompt() {
  let t = '';
  if (G.mode === 'playing' && P.alive) {
    const h = G.world.findInteract(P.x, P.z, P.yaw, 3.0);
    if (h) {
      if (h.type === 'door') { const d = h.door; t = d.kind === 'gold' && !P.keys.gold ? '需要 金鑰匙' : d.kind === 'silver' && !P.keys.silver ? '需要 銀鑰匙' : '按 <kbd>E</kbd> 開門'; }
      else if (h.type === 'exit') t = G.levelIndex === LEVELS.length - 1 && !G.bossDead ? '先打倒統領' : '按 <kbd>E</kbd> 搭電梯離開';
    }
  }
  if (t !== prompt) { prompt = t; const el = $('prompt'); el.innerHTML = t; el.classList.toggle('on', !!t); }
}

// ======================= 主迴圈 =======================
let last = performance.now(), fpsEma = 1 / 60, slowT = 0, titleT = 0, musicT = 0, mapT = 0, bossShown = false;
function frame(now, dtOv) {
  if (dtOv === undefined) { requestAnimationFrame(frame); if (G.manual) return; }
  let dt = dtOv !== undefined ? dtOv : Math.min(0.05, (now - last) / 1000); last = now; G.time += dt;
  fpsEma += (dt - fpsEma) * 0.05;
  slowT += dt; if (slowT > 2) { slowT = 0; if (fpsEma > 1 / 30 && eng.scale > 0.56 && (G.mode === 'playing' || G.mode === 'title')) eng.setScale(eng.scale - 0.12); }
  if (G.mode === 'loading') return;
  const w = G.world; if (!w || (!G.enemies && G.mode !== 'title' && G.mode !== 'help')) { eng.composer.render(); return; }
  const g = eng.grade.uniforms;
  if (G.mode === 'title' || G.mode === 'help' && G.prevMode === 'title') {
    titleT += dt; G.titleYaw += dt * 0.12;
    camera.position.set(P.x, EYE, P.z); camera.rotation.set(-0.02, -G.titleYaw, 0);
    w.update(dt, camera); w.updateDoors(dt, []);
    audio.setListener(P.x, P.z, G.titleYaw);
  } else if (G.mode === 'playing' || G.mode === 'dying' || G.mode === 'paused' || G.mode === 'sum' || G.mode === 'win' || G.mode === 'dead' || G.mode === 'help') {
    const run = G.mode === 'playing' || G.mode === 'dying';
    if (G.mode === 'playing') {
      G.levelTime += dt;
      updatePlayer(dt);
      P.cd = Math.max(0, P.cd - dt); updateReload(dt);
      if (P.meleeT > 0) { P.meleeT -= dt; if (P.meleeT <= 0) meleeStrike(); }
      if ((mouseDown) && (WEAPONS[P.cur].auto || !P.fireLatch)) { if (fire() && !WEAPONS[P.cur].auto) P.fireLatch = true; }
      if (!mouseDown) P.fireLatch = false;
      updateItems(dt);
      updatePrompt();
      mapT -= dt; if (mapT <= 0) { mapT = 0.2; markSeen(); if (mapOn) drawMap(ui.mapc, false); }
      musicT -= dt;
      if (musicT <= 0) { musicT = 0.5; let danger = 0; for (const e of G.enemies.list) if (!e.dead && (e.state === 'chase' || e.state === 'attack') && Math.hypot(e.x - P.x, e.z - P.z) < 28) danger = Math.max(danger, e.boss ? 1 : 0.85); const base = G.levelIndex === 5 ? 0.5 : 0.2; audio.setIntensity(Math.max(base, danger)); }
      if (G.bossDead) { G.winT -= dt; if (G.winT <= 0) { G.bossDead = false; finishLevel(); } }
    }
    if (G.mode === 'dying') { G.deadT += dt; if (G.deadT > 1.7) { G.mode = 'dead'; P.lives--; const over = P.lives < 0; $('dead-t').textContent = over ? '遊戲結束' : '你倒下了'; $('dead-s').textContent = over ? '三條命都用完了' : `還剩 ${P.lives} 條命`; showMenu('m-dead', over ? [{ label: '從第 1 關重來', act: () => newGame(0, 0) }, { label: '回主選單', act: toTitle }] : [{ label: '再試一次', act: retryLevel }, { label: '回主選單', act: toTitle }]); showScreen('s-dead'); setHudVisible(false); } }
    if (G.mode !== 'help' && G.mode !== 'paused') {
      G.enemies.update(dt, { x: P.x, z: P.z, alive: P.alive, moving: P.moving, firing: P.firing });
      w.updateDoors(dt, [{ x: P.x, z: P.z }, ...G.enemies.list.filter((e) => !e.dead)]);
      w.update(dt, camera);
    }
    // 攝影機
    P.shake = Math.max(0, P.shake - dt * 3.2); P.hurtFlash = Math.max(0, P.hurtFlash - dt * 1.6); P.flash = Math.max(0, P.flash - dt * 2.6);
    const bobY = P.moving ? Math.sin(P.bob) * 0.045 : Math.sin(P.bob) * 0.006;
    let cy = EYE + bobY, roll = P.moving ? Math.sin(P.bob * 0.5) * 0.004 : 0;
    let pitch = P.pitch;
    if (G.mode === 'dying' || G.mode === 'dead') { const k = Math.min(1, G.deadT / 0.9); cy = EYE - k * 1.1; roll = k * 0.7; pitch = P.pitch * (1 - k) + 0.25 * k; }
    camera.position.set(P.x + (Math.random() - 0.5) * P.shake * 0.03, cy + (Math.random() - 0.5) * P.shake * 0.03, P.z);
    camera.rotation.set(pitch + (Math.random() - 0.5) * P.shake * 0.01, -P.yaw, roll);
    vm.update(dt, P.moving, 1);
    updateFx(dt);
    audio.setListener(P.x, P.z, P.yaw);
    // HUD
    if (G.mode === 'playing' || G.mode === 'dying') updateHud(dt);
    if (G.mode === 'playing') drawMap(ui.mini, true);
    // Boss bar
    const boss = G.enemies.list.find((e) => e.boss);
    const showBoss = !!boss && !boss.dead && boss.state !== 'idle';
    if (showBoss !== bossShown) { bossShown = showBoss; $('boss').classList.toggle('on', showBoss); }
    if (boss && showBoss) $('boss').querySelector('.bar div').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
  }
  g.hurt.value = P.hurtFlash * (G.mode === 'title' ? 0 : 1); g.flash.value.set(P.flash * 0.22, P.flash * 0.17, P.flash * 0.05); g.time.value = G.time % 100;
  vm.root.visible = G.mode === 'playing' || G.mode === 'paused' || G.mode === 'sum';
  vm.light.visible = vm.root.visible;
  if (!(dtOv !== undefined && G.noRender)) eng.composer.render();
}

// 啟動
G.mode = 'loading';
requestAnimationFrame(frame);
(async () => { await prefetch('courtyard', '載入中…'); toTitle(); })();

// 測試／除錯接口
window.__g = { step: (dt) => frame(performance.now(), dt), G, P, keys, camera, eng, vm, fire, interact, startLevel, newGame, toTitle, pauseGame, switchWeapon, finishLevel, victory, damagePlayer, audio, WEAPONS, TYPES, settings, drawMap };
