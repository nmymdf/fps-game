export const CELL = 3;
export const WALL_H = 3.2;
export const EYE = 1.62;
export const VERSION = 'v1.6';
export const TITLE = '城堡突襲';
export const AUTHOR = '作者：ArchieKUO';

export const THEMES = {
  courtyard: {
    walls: ['stoneGrey', 'stoneSand', 'roughStone'], corridorWall: 'stoneGrey', window: 'window',
    floors: ['floorCobble', 'floorFlag'], corridorFloor: 'floorFlag', ceil: 'ceilStone', pillar: 'stoneSand',
    ambient: 0x9aa4d0, ambI: 0.55, hemiSky: 0x8f9ac8, hemiGround: 0x3a2e30, hemiI: 0.9,
    fog: 0x15131c, fogD: 0.016, torch: 0xffa850, beam: 0xffe2a8, track: 0, name: '城門庭園',
  },
  hall: {
    walls: ['hallBlue', 'hallStone', 'hallGreen'], corridorWall: 'stoneBlue', window: 'windowSand',
    floors: ['floorParquet', 'carpetRed'], corridorFloor: 'floorFlag', ceil: 'ceilPlaster', pillar: 'marbleWhite',
    ambient: 0xa8aedc, ambI: 0.5, hemiSky: 0x9aa0cf, hemiGround: 0x3d2c2a, hemiI: 0.85,
    fog: 0x16131a, fogD: 0.015, torch: 0xffa24a, beam: 0xffdca0, track: 1, name: '迎賓大廳',
  },
  library: {
    walls: ['libShelf', 'libWood', 'libShelf2'], corridorWall: 'libWood', window: 'window',
    floors: ['floorParquetDark', 'carpetGreen'], corridorFloor: 'floorParquetDark', ceil: 'ceilDark', pillar: 'libWood',
    ambient: 0xb09878, ambI: 0.5, hemiSky: 0xb09c80, hemiGround: 0x3a2a1e, hemiI: 0.85,
    fog: 0x16110d, fogD: 0.017, torch: 0xffb060, beam: 0xffd89a, track: 2, name: '藏書閣',
  },
  cellar: {
    walls: ['cellarBrick', 'cellarStone', 'cellarBrickDark'], corridorWall: 'cellarStone', window: 'window',
    floors: ['floorCobbleDark', 'floorFlagDark'], corridorFloor: 'floorFlagDark', ceil: 'ceilStone', pillar: 'cellarStone',
    ambient: 0x8c7a8c, ambI: 0.5, hemiSky: 0x7c6c80, hemiGround: 0x2a1c1c, hemiI: 0.8,
    fog: 0x0f0b0c, fogD: 0.022, torch: 0xff9040, beam: 0xffc890, track: 3, name: '地下酒窖',
  },
  chapel: {
    walls: ['marbleWhite', 'marbleBlue', 'stoneBlue'], corridorWall: 'stoneBlue', window: 'window',
    floors: ['floorChecker', 'floorFlag'], corridorFloor: 'floorFlag', ceil: 'ceilPlaster', pillar: 'marbleWhite',
    ambient: 0xb4bce8, ambI: 0.6, hemiSky: 0xa8b4e4, hemiGround: 0x363040, hemiI: 0.95,
    fog: 0x14141e, fogD: 0.014, torch: 0xffb86a, beam: 0xcfe0ff, track: 4, name: '禮拜塔',
  },
  throne: {
    walls: ['throneRed', 'marbleDark', 'throneNavy'], corridorWall: 'marbleDark', window: 'window',
    floors: ['floorCheckerDark', 'carpetRed'], corridorFloor: 'floorFlagDark', ceil: 'ceilDark', pillar: 'marbleDark',
    ambient: 0xb09cc0, ambI: 0.5, hemiSky: 0xa88cc0, hemiGround: 0x341822, hemiI: 0.85,
    fog: 0x120c14, fogD: 0.016, torch: 0xffa040, beam: 0xffcf90, track: 5, name: '王座廳',
  },
};
