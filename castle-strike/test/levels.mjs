import { generateLevel, asciiMap, LEVELS } from '../src/levelgen.js';

for (let i = 0; i < LEVELS.length; i++) {
  const t0 = Date.now();
  const lv = generateLevel(i);
  console.log(`L${i + 1} ${LEVELS[i].name} 嘗試${lv.tries}次 ${Date.now() - t0}ms 房間${lv.rooms.length} 門${lv.doors.size} 敵人${lv.enemies.length} 寶物${lv.treasure} 隱藏${lv.secrets} 火把${lv.torches.length} 窗${lv.windows.length} 旗${lv.banners.length}`);
}
const which = Number(process.argv[2] ?? 1);
console.log(asciiMap(generateLevel(which)));
