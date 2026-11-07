import { spriteTex } from './photo.js';
import * as THREE from 'three';
import { metal, plain } from './decor.js';
import { sprites, crossTex } from './textures.js';
import { buildGun } from './weapons.js';

export const TREASURE_SCORE = { cup: 500, cross: 1000, crown: 2000, chest: 5000 };
export const TREASURE_NAME = { cup: '金杯', cross: '十字架', crown: '王冠', chest: '寶箱' };

const gold = () => metal(0xe0b440, 0.25);
const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 18);

function glowSprite(color, size = 1.4, opacity = 0.55) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprites().glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false }));
  s.scale.set(size, size, 1); return s;
}

// 回傳 { obj, y (離地高度), glow }
export function buildItem(type, sub) {
  const g = new THREE.Group(); let y = 0.95, glow = 0xffe0a0, scale = 1;
  switch (type) {
    case 'food': {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.04, 20), plain(0xf2f0e8, 0.4)));
      const roast = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), plain(0x8a4a22, 0.6)); roast.scale.set(1.2, 0.8, 0.9); roast.position.y = 0.14; g.add(roast);
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), plain(0xf0e8d0, 0.5)); bone.rotation.z = 1.2; bone.position.set(0.2, 0.2, 0); g.add(bone);
      for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), plain(0x3a8a3a, 0.7)); l.position.set(-0.18 + i * 0.05, 0.07, 0.12); g.add(l); }
      glow = 0x9aff80; scale = 1.5; break;
    }
    case 'medkit': {
      const m = new THREE.MeshStandardMaterial({ map: crossTex(), roughness: 0.5 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.34), [m, m, m, plain(0xdddddd, 0.5), m, m]); g.add(b);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), plain(0x888888, 0.4))).position.set(0, 0.2, 0);
      glow = 0xff6a6a; scale = 1.4; break;
    }
    case 'ammo': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.32), plain(0x4a5a30, 0.7)));
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8), gold()); b.position.set(-0.15 + i * 0.1, 0.22, 0); g.add(b); const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 8), metal(0xb06a30, 0.4)); t.position.set(-0.15 + i * 0.1, 0.34, 0); g.add(t); }
      glow = 0xffe070; scale = 1.5; break;
    }
    case 'shells': {
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Group();
        s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10), plain(0xc02a22, 0.5)));
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10), gold()); base.position.y = -0.1; s.add(base);
        s.position.set(-0.16 + i * 0.105, 0.05, (i % 2) * 0.03); s.rotation.z = 1.57; g.add(s);
      }
      glow = 0xff8a50; scale = 1.5; break;
    }
    case 'armor': {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.08, 6), metal(0x7a96c8, 0.3)); sh.rotation.x = Math.PI / 2; g.add(sh);
      const em = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 6), gold()); em.rotation.x = Math.PI / 2; g.add(em);
      glow = 0x80b0ff; scale = 1.4; break;
    }
    case 'treasure': {
      if (sub === 'cup') {
        g.add(new THREE.Mesh(lathe([[0.001, 0], [0.14, 0], [0.14, 0.03], [0.04, 0.06], [0.035, 0.2], [0.14, 0.26], [0.17, 0.4], [0.15, 0.42], [0.001, 0.36]]), gold()));
        const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 14), gold()); h.position.set(0.18, 0.3, 0); g.add(h);
        const h2 = h.clone(); h2.position.x = -0.18; g.add(h2);
      } else if (sub === 'cross') {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.06), gold()));
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.06), gold()); a.position.y = 0.1; g.add(a);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), new THREE.MeshStandardMaterial({ color: 0xd02030, emissive: 0x500008, roughness: 0.2 })); gem.position.set(0, 0.1, 0.04); g.add(gem);
      } else if (sub === 'crown') {
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.12, 20, 1, true), gold()));
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const c = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), gold()); c.position.set(Math.cos(a) * 0.19, 0.12, Math.sin(a) * 0.19); g.add(c); const gm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: [0xd02030, 0x2050d0, 0x20a050][i % 3], roughness: 0.2, emissive: 0x111111 })); gm.position.set(Math.cos(a) * 0.19, 0.22, Math.sin(a) * 0.19); g.add(gm); }
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.015, 8, 24), gold()); band.rotation.x = Math.PI / 2; band.position.y = -0.04; g.add(band);
      } else {
        const wood = plain(0x6a3e1c, 0.7);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.32), wood));
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14, 1, false, 0, Math.PI), wood); lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.y = 0.13; lid.rotation.set(0, 0, Math.PI / 2); lid.scale.set(1, 1, 1);
        lid.rotation.x = 0; lid.position.set(0, 0.13, 0);
        const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14, 1, false, -Math.PI / 2, Math.PI), wood); lidMesh.rotation.z = Math.PI / 2; lidMesh.position.y = 0.13; lidMesh.rotation.x = 0; g.add(lidMesh);
        for (const x of [-0.18, 0.18]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.34), gold()); b.position.set(x, 0.12, 0); g.add(b); }
        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.03), gold()); lock.position.set(0, 0.1, 0.17); g.add(lock);
        for (let i = 0; i < 5; i++) { const gm = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: [0xd02030, 0x2050d0, 0x20a050, 0xe0c030, 0xc040c0][i], roughness: 0.2 })); gm.position.set(-0.16 + i * 0.08, 0.3, 0.02 * (i % 2)); g.add(gm); }
      }
      glow = 0xffd060; scale = sub === 'chest' ? 1.2 : 1.5; break;
    }
    case 'key_gold': case 'key_silver': {
      const m = type === 'key_gold' ? metal(0xf0c040, 0.2) : metal(0xdce4f0, 0.18);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 20), m); bow.position.y = 0.3; g.add(bow);
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), m)).position.y = 0;
      for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.04), m); t.position.set(0.07, -0.12 - i * 0.07, 0); g.add(t); }
      glow = type === 'key_gold' ? 0xffd040 : 0xb8d8ff; scale = 1.9; y = 1.1; break;
    }
    default: {
      if (type.startsWith('weapon_')) {
        const gun = buildGun(type.slice(7), true).group;
        gun.rotation.y = Math.PI / 2; g.add(gun); glow = 0xffffff; scale = 1.5; y = 1.0;
      }
    }
  }
  const SK = { food: ['item_food', 0.62], medkit: ['item_medkit', 0.6], ammo: ['item_ammo', 0.56], shells: ['item_shells', 0.5], armor: ['item_armor', 0.7], key_gold: ['item_key_gold', 0.8], key_silver: ['item_key_silver', 0.8],
    weapon_smg: ['item_gun_smg', 0.28], weapon_shotgun: ['item_gun_shotgun', 0.15], weapon_rifle: ['item_gun_rifle', 0.17] };
  const TK = { cup: ['item_cup', 0.72], cross: ['item_cross', 0.75], crown: ['item_crown', 0.6], chest: ['item_chest', 0.7] };
  const sk = type === 'treasure' ? TK[sub] : SK[type];
  if (sk && spriteTex(sk[0])) {
    const tx = spriteTex(sk[0]), asp = tx.userData.w / tx.userData.h;
    while (g.children.length) g.remove(g.children[0]);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, alphaTest: 0.35, transparent: false }));
    sp.scale.set(sk[1] * asp, sk[1], 1); g.add(sp); scale = 1.25;
  }
  g.scale.setScalar(scale);
  const wrap = new THREE.Group(); wrap.add(g);
  const gs = glowSprite(glow, 1.9 * scale * 0.8, 0.38); wrap.add(gs);
  wrap.userData.spin = g; wrap.userData.glow = gs; gs.userData.base = 0.38;
  return { obj: wrap, y };
}

export const ITEM_NAME = {
  food: '食物', medkit: '急救包', ammo: '子彈', shells: '散彈', armor: '護甲', key_gold: '金鑰匙', key_silver: '銀鑰匙',
  weapon_smg: '衝鋒槍', weapon_shotgun: '散彈槍', weapon_rifle: '步槍',
};
