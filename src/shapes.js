import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const gc = new Map();
const cached = (k, f) => { if (!gc.has(k)) gc.set(k, f()); return gc.get(k); };
const place = (o, x, y, z) => { o.position.set(x, y, z); return o; };

// 圓角方塊
export function RB(w, h, d, r, m, x = 0, y = 0, z = 0) {
  const rr = Math.max(0.0005, Math.min(r, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005));
  const g = cached(`rb${w},${h},${d},${rr}`, () => new RoundedBoxGeometry(w, h, d, 3, rr));
  return place(new THREE.Mesh(g, m), x, y, z);
}
// 圓柱（軸向 x / y / z）
export function CY(rt, rb, len, m, x = 0, y = 0, z = 0, axis = 'y', seg = 18) {
  const g = cached(`cy${rt},${rb},${len},${seg}`, () => new THREE.CylinderGeometry(rt, rb, len, seg));
  const o = new THREE.Mesh(g, m);
  if (axis === 'z') o.rotation.x = Math.PI / 2; else if (axis === 'x') o.rotation.z = Math.PI / 2;
  return place(o, x, y, z);
}
const SPH = cached('sph', () => new THREE.SphereGeometry(1, 20, 14));
export function SP(r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(SPH, m); o.scale.set(r * sx, r * sy, r * sz); return place(o, x, y, z);
}
// 膠囊（兩端圓）
export function CAP(r, len, m, x = 0, y = 0, z = 0, axis = 'y') {
  const g = cached(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 5, 14));
  const o = new THREE.Mesh(g, m);
  if (axis === 'z') o.rotation.x = Math.PI / 2; else if (axis === 'x') o.rotation.z = Math.PI / 2;
  return place(o, x, y, z);
}
export function TOR(R, r, m, x = 0, y = 0, z = 0, axis = 'y', arc = Math.PI * 2) {
  const g = cached(`tor${R},${r},${arc}`, () => new THREE.TorusGeometry(R, r, 8, 24, arc));
  const o = new THREE.Mesh(g, m);
  if (axis === 'y') o.rotation.x = Math.PI / 2; else if (axis === 'x') o.rotation.y = Math.PI / 2;
  return place(o, x, y, z);
}
export function CONE(r, h, m, x = 0, y = 0, z = 0, axis = 'y', seg = 14) {
  const g = cached(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
  const o = new THREE.Mesh(g, m);
  if (axis === 'z') o.rotation.x = Math.PI / 2; else if (axis === '-z') o.rotation.x = -Math.PI / 2; else if (axis === 'x') o.rotation.z = -Math.PI / 2;
  return place(o, x, y, z);
}

// 外框描邊：背面膨脹殼，讓角色和牆面明顯分開
const outlineMats = new Map();
function outlineMat(color, thick) {
  const k = color + ':' + thick;
  if (!outlineMats.has(k)) {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normalize(normal) * ${thick.toFixed(4)};`); };
    m.customProgramCacheKey = () => 'ol' + thick;
    outlineMats.set(k, m);
  }
  return outlineMats.get(k);
}
export function addOutline(root, color = 0x0a0604, thick = 0.014, minR = 0.05) {
  const mat = outlineMat(color, thick); const list = [];
  root.traverse((o) => { if (o.isMesh && o.geometry && (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) >= minR) && !o.userData.noOutline && o.material !== mat && !(o.material && o.material.isMeshBasicMaterial && o.material.side === THREE.BackSide)) list.push(o); });
  for (const o of list) { const s = new THREE.Mesh(o.geometry, mat); s.userData.noOutline = true; s.userData.isOutline = true; o.add(s); }
}
