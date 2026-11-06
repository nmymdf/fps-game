import * as THREE from 'three';
import { createEngine } from './engine.js';
import { generateLevel } from './levelgen.js';
import { World } from './world.js';
import { CELL, EYE } from './const.js';
import { setAniso } from './textures.js';

const canvas = document.getElementById('c');
const eng = createEngine(canvas, 'high');
const q = new URLSearchParams(location.search);
const li = Number(q.get('level') ?? 0);
if (q.get('aniso')) setAniso(Number(q.get('aniso')));
const lv = generateLevel(li);
const world = new World(lv, eng.scene, 'high');
window.__world = world; window.__lv = lv; window.__THREE = THREE; window.__eng = eng;
let last = performance.now();
window.__view = (gx, gz, yaw, pitch = 0) => {
  eng.camera.position.set((gx + 0.5) * CELL, EYE, (gz + 0.5) * CELL);
  eng.camera.rotation.set(pitch, -yaw, 0);
  for (let k = 0; k < 8; k++) world.update(0.1, eng.camera);
  eng.grade.uniforms.time.value = 0;
  eng.composer.render();
  eng.composer.render();
};
window.__cam = (x, y, z, yaw, pitch) => { eng.camera.position.set(x, y, z); eng.camera.rotation.set(pitch, -yaw, 0); for (let k = 0; k < 4; k++) world.update(0.1, eng.camera); eng.composer.render(); eng.composer.render(); };
window.__start = lv.start;
window.__info = () => ({ rooms: lv.rooms.map(r=>({cx:r.cx,cz:r.cz,x:r.x,z:r.z,w:r.w,h:r.h})), chain: lv.chain.map(r=>r.id), start: lv.start, exit: lv.exit });
window.__ready = true;
