export type WorldId = 0 | 1 | 2;

export interface PlatformDef { x: number; y: number; width: number; }
export interface EnemyDef { x: number; min: number; max: number; }
export interface WorldDef {
  id: WorldId;
  name: string;
  subtitle: string;
  story: string;
  palette: { sky: number; horizon: number; hill: number; ground: number; grass: number; brick: number; hero: number; enemy: number; accent: number; };
  start: { x: number; y: number };
  portalX: number;
  crystal: { x: number; y: number };
  platforms: PlatformDef[];
  coins: Array<[number, number]>;
  enemies: EnemyDef[];
  boss?: { x: number; min: number; max: number };
}

const ground = (segments: Array<[number, number]>): PlatformDef[] => segments.map(([x, width]) => ({ x, y: 492, width }));

export const WORLDS: WorldDef[] = [
  {
    id: 0,
    name: 'Лес Люмии',
    subtitle: 'Мир 1',
    story: 'Первая искра спрятана в ветвях светящегося дерева. Найди осколок и открой портал.',
    palette: { sky: 0x4b43bd, horizon: 0x766add, hill: 0x3a3194, ground: 0x8c4a85, grass: 0x7ee27b, brick: 0xf1a95b, hero: 0xff5f9d, enemy: 0xa14478, accent: 0x69e7ff },
    start: { x: 86, y: 420 }, portalX: 2220, crystal: { x: 1280, y: 220 },
    platforms: [...ground([[0, 360], [450, 270], [780, 380], [1210, 380], [1650, 720]]), { x: 180, y: 362, width: 128 }, { x: 520, y: 330, width: 128 }, { x: 820, y: 384, width: 160 }, { x: 1180, y: 275, width: 128 }, { x: 1430, y: 360, width: 160 }, { x: 1760, y: 300, width: 160 }, { x: 2020, y: 375, width: 128 }],
    coins: [[192, 318], [230, 318], [268, 318], [530, 286], [585, 286], [838, 340], [900, 340], [1196, 231], [1240, 231], [1448, 316], [1510, 316], [1780, 256], [1842, 256], [2035, 331]],
    enemies: [{ x: 570, min: 470, max: 680 }, { x: 920, min: 800, max: 1120 }, { x: 1460, min: 1230, max: 1570 }, { x: 1900, min: 1670, max: 2180 }]
  },
  {
    id: 1,
    name: 'Пещеры Эха',
    subtitle: 'Мир 2',
    story: 'Эхо Тени сбивает путников с пути. Следуй за искрами — они приведут к осколку.',
    palette: { sky: 0x21135c, horizon: 0x4b2c8c, hill: 0x34236f, ground: 0x534782, grass: 0xa87bf1, brick: 0xb481e4, hero: 0x5ee4ff, enemy: 0xe16383, accent: 0xff91cb },
    start: { x: 86, y: 420 }, portalX: 2220, crystal: { x: 2020, y: 155 },
    platforms: [...ground([[0, 290], [385, 210], [700, 260], [1030, 200], [1310, 360], [1730, 640]]), { x: 130, y: 350, width: 100 }, { x: 420, y: 290, width: 150 }, { x: 710, y: 355, width: 120 }, { x: 1000, y: 230, width: 165 }, { x: 1350, y: 315, width: 135 }, { x: 1650, y: 245, width: 145 }, { x: 1980, y: 210, width: 180 }],
    coins: [[148, 306], [195, 306], [436, 246], [490, 246], [548, 246], [728, 311], [780, 311], [1016, 186], [1070, 186], [1140, 186], [1368, 271], [1428, 271], [1665, 201], [1720, 201], [2000, 166], [2075, 166]],
    enemies: [{ x: 460, min: 400, max: 570 }, { x: 740, min: 715, max: 940 }, { x: 1090, min: 1045, max: 1210 }, { x: 1450, min: 1320, max: 1650 }, { x: 1860, min: 1740, max: 2300 }]
  },
  {
    id: 2,
    name: 'Небесный Замок',
    subtitle: 'Мир 3',
    story: 'Последний осколок охраняет Король Тени. Собери Свет и одолей его, чтобы вернуть цвета миру.',
    palette: { sky: 0x197eb8, horizon: 0x66c7df, hill: 0x2889af, ground: 0x7553a5, grass: 0xf6e47b, brick: 0xe5a8d2, hero: 0xffdb62, enemy: 0x8553a6, accent: 0xfff6bd },
    start: { x: 86, y: 420 }, portalX: 2260, crystal: { x: 1830, y: 154 },
    platforms: [...ground([[0, 250], [345, 220], [650, 250], [970, 230], [1280, 240], [1600, 820]]), { x: 100, y: 330, width: 110 }, { x: 390, y: 240, width: 150 }, { x: 690, y: 345, width: 160 }, { x: 1000, y: 235, width: 155 }, { x: 1325, y: 320, width: 130 }, { x: 1580, y: 245, width: 160 }, { x: 1770, y: 210, width: 150 }],
    coins: [[115, 286], [160, 286], [405, 196], [465, 196], [520, 196], [710, 301], [776, 301], [1018, 191], [1070, 191], [1130, 191], [1342, 276], [1402, 276], [1595, 201], [1655, 201], [1785, 166], [1850, 166]],
    enemies: [{ x: 390, min: 355, max: 550 }, { x: 710, min: 660, max: 880 }, { x: 1040, min: 980, max: 1180 }, { x: 1380, min: 1290, max: 1490 }],
    boss: { x: 2040, min: 1910, max: 2140 }
  }
];

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 540;
