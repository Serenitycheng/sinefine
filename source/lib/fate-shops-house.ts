import {
  CITY_INTERIOR_SCENES,
  type CityInteriorScene,
  type InteriorFloor,
} from './fate-city-interior-scenes';
import {
  paintedPoint,
  paintedFurniture,
  mirrorPreviewSprite,
  type PreviewHouse,
  type PreviewRoom,
  type PreviewAction,
  type PreviewDirection,
} from './fate-preview-house';
import { schoolSprite } from './fate-school-sprites';
import { waverSprite } from './fate-waver-sprites';
import { einzbernSprite } from './fate-einzbern-sprites';
import type { ActorId } from './street';

export const SHOP_BUILDING_IDS = [
  'shops',
  'miyama-florist',
  'old-bookshop',
  'miyama-bakery',
  'old-repair',
  'shinto-convenience',
] as const;
export type ShopBuildingId = (typeof SHOP_BUILDING_IDS)[number];
type Pair = readonly [number, number];
type Piece = readonly [
  id: string,
  box: readonly number[],
  mask?: readonly number[][],
];
type Spot = {
  id: string;
  label: string;
  point: Pair;
  detail: string;
  pose?: PreviewAction['pose'];
  contact?: Pair;
  seat?: Pair;
  scale?: number;
  mirror?: boolean;
  inFrontOf?: readonly string[];
};
type Layout = {
  floor?: InteriorFloor;
  pieces: readonly Piece[];
  spots: readonly Spot[];
};
type Shop = {
  annex: string;
  painting: string;
  cast: readonly ActorId[];
  door: Pair;
  street?: Pair;
  back: Pair;
  arrivalOffset?: number;
  hall: Layout;
  extra: Layout;
};
const mainFloor = (backY: number): InteriorFloor => ({
  backLeft: 100,
  backRight: 1500,
  backY,
  frontLeft: 10,
  frontRight: 1590,
  frontY: 890,
});
const extraFloor = mainFloor(330);
const NAMES: Partial<Record<ActorId, string>> = {
  shirou: '卫宫士郎',
  rin: '远坂凛',
  sakura: '间桐樱',
  waver: '成年韦伯',
  kiritsugu: '卫宫切嗣',
};
const authored: Record<ShopBuildingId, Shop> = {
  shops: {
    annex: '备货与整理间',
    painting: 'shops-stock-soft-v1.png',
    cast: ['shirou', 'rin'],
    door: [47, 39],
    back: [48, 54],
    hall: {
      floor: mainFloor(300),
      pieces: [
        [
          'produce',
          [3, 55, 39, 79],
          [
            [3, 38],
            [37, 40],
            [39, 79],
            [3, 79],
          ],
        ],
        [
          'left-shelves',
          [0, 42, 16, 81],
          [
            [0, 0],
            [16, 0],
            [16, 81],
            [0, 81],
          ],
        ],
        [
          'counter',
          [18, 40, 42, 46],
          [
            [18, 25],
            [42, 25],
            [42, 46],
            [18, 46],
          ],
        ],
        [
          'right-shelves',
          [72, 43, 99, 86],
          [
            [72, 20],
            [99, 17],
            [99, 86],
            [72, 62],
          ],
        ],
        [
          'back-shelves',
          [52, 29, 72, 42],
          [
            [52, 8],
            [72, 8],
            [72, 42],
            [52, 42],
          ],
        ],
      ],
      spots: [
        {
          id: 'produce',
          label: '看看蔬果',
          point: [43, 81],
          detail: '木箱里放着萝卜、卷心菜和橘子。',
        },
        {
          id: 'bags',
          label: '看看日常杂货',
          point: [45, 64],
          detail: '纸袋和玻璃瓶整齐摆在木架上。',
        },
        {
          id: 'counter',
          label: '看看柜台',
          point: [48, 49],
          detail: '秤和收银机放在柜台里侧。',
        },
        {
          id: 'drinks',
          label: '看看冷饮柜',
          point: [65, 49],
          detail: '玻璃柜里收着瓶装冷饮。',
        },
        {
          id: 'plants',
          label: '看看门边盆栽',
          point: [57, 91],
          detail: '盆栽放在靠街的一侧。',
        },
      ],
    },
    extra: {
      pieces: [
        [
          'left-shelves',
          [0, 66, 26, 90],
          [
            [0, 0],
            [25, 0],
            [26, 90],
            [0, 90],
          ],
        ],
        [
          'back-cabinet',
          [27, 45, 36, 58],
          [
            [27, 13],
            [36, 13],
            [36, 58],
            [27, 58],
          ],
        ],
        [
          'crates',
          [62, 45, 69, 58],
          [
            [62, 39],
            [69, 39],
            [69, 58],
            [62, 58],
          ],
        ],
        [
          'desk',
          [85, 62, 100, 93],
          [
            [78, 42],
            [100, 46],
            [100, 93],
            [85, 93],
          ],
        ],
        [
          'chair',
          [73.5, 64, 86, 82],
          [
            [73.5, 42],
            [76, 43],
            [79, 61],
            [86, 63],
            [86, 81],
            [84, 81],
            [83, 70],
            [76, 69],
            [76, 82],
            [74, 82],
          ],
        ],
      ],
      spots: [
        {
          id: 'notes',
          label: '坐下看看便笺',
          point: [69, 90],
          detail: '翻看桌上的便笺。',
          pose: 'read',
          contact: [81.5, 80],
          seat: [81.5, 61],
          scale: 1.65,
          inFrontOf: ['desk', 'chair'],
        },
        {
          id: 'pack',
          label: '看看包装台',
          point: [71, 78],
          detail: '纸袋、绳子和竹篮收在桌边。',
        },
        {
          id: 'crates',
          label: '看看整理好的木箱',
          point: [59, 65],
          detail: '几只木箱沿墙叠放。',
        },
        {
          id: 'shelf',
          label: '看看备品架',
          point: [34, 81],
          detail: '架上放着干净毛巾和封好的纸袋。',
        },
      ],
    },
  },
  'miyama-florist': {
    annex: '花艺工作间',
    painting: 'miyama-florist-work-soft-v1.png',
    cast: ['sakura', 'rin'],
    door: [48, 34],
    back: [49, 47],
    hall: {
      floor: mainFloor(260),
      pieces: [
        [
          'left-flowers',
          [0, 47, 34, 77],
          [
            [0, 17],
            [31, 16],
            [34, 77],
            [0, 77],
          ],
        ],
        [
          'right-flowers',
          [79, 51, 100, 85],
          [
            [79, 29],
            [100, 26],
            [100, 85],
            [79, 74],
          ],
        ],
        [
          'wrapping-counter',
          [53, 40, 77, 46],
          [
            [53, 26],
            [77, 25],
            [77, 46],
            [53, 46],
          ],
        ],
        [
          'back-shelves',
          [28, 32, 40, 42],
          [
            [28, 8],
            [40, 8],
            [40, 42],
            [28, 42],
          ],
        ],
      ],
      spots: [
        {
          id: 'gardenia',
          label: '看看栀子',
          point: [39, 73],
          detail: '白色栀子摆在蓝紫色绣球旁。',
        },
        {
          id: 'hydrangea',
          label: '看看绣球',
          point: [42, 58],
          detail: '蓝紫色绣球分在几只花桶里。',
        },
        {
          id: 'wrap',
          label: '看看包装台',
          point: [62, 51],
          detail: '牛皮纸铺在台上，丝带挂在墙边。',
        },
        {
          id: 'vases',
          label: '看看花器',
          point: [69, 78],
          detail: '玻璃瓶和白瓷花器靠窗陈列。',
        },
        {
          id: 'cut',
          label: '看看季节切花',
          point: [52, 85],
          detail: '新鲜切花还带着水珠。',
        },
      ],
    },
    extra: {
      pieces: [
        [
          'potting-counter',
          [0, 61, 32, 89],
          [
            [0, 27],
            [30, 28],
            [32, 89],
            [0, 89],
          ],
        ],
        [
          'left-plant',
          [29, 51, 36, 66],
          [
            [29, 30],
            [36, 34],
            [36, 66],
            [29, 66],
          ],
        ],
        [
          'desk',
          [85, 59, 100, 93],
          [
            [77, 36],
            [100, 36],
            [100, 93],
            [85, 93],
          ],
        ],
        [
          'chair',
          [74, 62, 89, 80],
          [
            [74, 35],
            [77, 36],
            [79, 57],
            [89, 61],
            [89, 78],
            [87, 78],
            [86, 68],
            [77, 67],
            [77, 80],
            [74, 80],
          ],
        ],
        [
          'back-plant',
          [63, 44, 70, 56],
          [
            [63, 23],
            [70, 30],
            [70, 56],
            [63, 56],
          ],
        ],
      ],
      spots: [
        {
          id: 'sit',
          label: '在花艺台旁坐下',
          point: [68, 87],
          detail: '在木椅上坐下。',
          pose: 'sit',
          contact: [82, 78],
          seat: [82, 55],
          scale: 1.75,
          inFrontOf: ['desk', 'chair'],
        },
        {
          id: 'ribbons',
          label: '看看丝带',
          point: [71, 72],
          detail: '几卷丝带按颜色收在架上。',
        },
        {
          id: 'sink',
          label: '看看水槽与花桶',
          point: [39, 72],
          detail: '剪下的花枝放在盛水的桶里。',
        },
        {
          id: 'pots',
          label: '看看陶盆',
          point: [44, 87],
          detail: '小陶盆沿工作台下方收好。',
        },
      ],
    },
  },
  'old-bookshop': {
    annex: '阅读室',
    painting: 'old-bookshop-reading-soft-v1.png',
    cast: ['waver', 'rin'],
    door: [71, 34],
    back: [49, 46],
    hall: {
      floor: mainFloor(250),
      pieces: [
        [
          'left-books',
          [0, 50, 17, 94],
          [
            [0, 0],
            [17, 0],
            [17, 94],
            [0, 94],
          ],
        ],
        [
          'right-books',
          [89, 44, 100, 94],
          [
            [89, 0],
            [100, 0],
            [100, 94],
            [89, 94],
          ],
        ],
        [
          'display',
          [26, 61, 60, 73],
          [
            [26, 42],
            [60, 41],
            [60, 73],
            [26, 73],
          ],
        ],
        [
          'back-books',
          [37, 32, 57, 40],
          [
            [37, 21],
            [57, 21],
            [57, 40],
            [37, 40],
          ],
        ],
        [
          'counter',
          [61, 42, 83, 47],
          [
            [61, 26],
            [83, 26],
            [83, 47],
            [61, 47],
          ],
        ],
        [
          'reading-chair',
          [26, 31, 35, 42],
          [
            [26, 22],
            [34, 22],
            [35, 42],
            [26, 42],
          ],
        ],
      ],
      spots: [
        {
          id: 'read',
          label: '在阅读角坐下',
          point: [30, 48],
          detail: '翻开阅读角的旧书。',
          pose: 'read',
          contact: [30, 42],
          seat: [30, 31.5],
          scale: 0.95,
          inFrontOf: ['reading-chair'],
        },
        {
          id: 'display',
          label: '看看翻书台',
          point: [65, 77],
          detail: '台上摊着旧杂志和几本薄册。',
        },
        {
          id: 'shelf',
          label: '看看木书架',
          point: [22, 82],
          detail: '书页边缘已有些发黄。',
        },
        {
          id: 'counter',
          label: '看看柜台',
          point: [76, 53],
          detail: '台灯旁放着书签和几本收好的书。',
        },
        {
          id: 'window',
          label: '看看窗边书柜',
          point: [52, 45],
          detail: '窗外的榉树影落在书脊上。',
        },
      ],
    },
    extra: {
      pieces: [
        [
          'left-shelves',
          [0, 56, 13, 91],
          [
            [0, 0],
            [13, 0],
            [13, 91],
            [0, 91],
          ],
        ],
        [
          'right-shelves',
          [86, 53, 100, 94],
          [
            [86, 0],
            [100, 0],
            [100, 94],
            [86, 94],
          ],
        ],
        [
          'left-back-shelf',
          [30, 31, 35, 48],
          [
            [30, 0],
            [35, 0],
            [35, 48],
            [30, 48],
          ],
        ],
        [
          'left-chair',
          [17.5, 54, 30.5, 66],
          [
            [25, 34],
            [30, 34],
            [30.5, 66],
            [28, 66],
            [27, 57],
            [18, 56],
            [18, 63],
            [16, 63],
            [17.5, 48],
            [24, 48],
          ],
        ],
        [
          'left-table',
          [9, 43, 20, 58],
          [
            [9, 34],
            [20, 34],
            [20, 58],
            [9, 58],
          ],
        ],
        [
          'right-chair',
          [67, 55, 80, 68],
          [
            [67, 35],
            [70, 36],
            [73, 52],
            [80, 53],
            [80, 68],
            [78, 68],
            [77, 60],
            [69, 60],
            [69, 67],
            [67, 67],
          ],
        ],
        [
          'right-table',
          [79, 48, 85, 67],
          [
            [76, 38],
            [85, 38],
            [85, 67],
            [79, 67],
          ],
        ],
        [
          'back-plant',
          [61, 45, 67, 55],
          [
            [61, 26],
            [67, 30],
            [67, 55],
            [61, 55],
          ],
        ],
      ],
      spots: [
        {
          id: 'left-read',
          label: '在左窗边读书',
          point: [39, 78],
          detail: '翻开台灯下的书。',
          pose: 'read',
          contact: [25.5, 65],
          seat: [25.5, 50],
          scale: 1.1,
          mirror: true,
          inFrontOf: ['left-chair', 'left-table'],
        },
        {
          id: 'right-sit',
          label: '在右窗边坐下',
          point: [61, 81],
          detail: '在绿垫木椅上坐下。',
          pose: 'sit',
          contact: [74, 68],
          seat: [74, 50.5],
          scale: 1.25,
          inFrontOf: ['right-chair', 'right-table'],
        },
        {
          id: 'books',
          label: '看看阅读室书架',
          point: [36, 62],
          detail: '几本旧文集放在矮书架上。',
        },
        {
          id: 'window',
          label: '看看榉树',
          point: [55, 71],
          detail: '窗外榉树的叶子轻轻晃动。',
        },
      ],
    },
  },
  'miyama-bakery': {
    annex: '烘焙准备间',
    painting: 'miyama-bakery-prep-soft-v1.png',
    cast: ['shirou', 'sakura'],
    door: [30, 34],
    back: [52, 46],
    hall: {
      floor: mainFloor(270),
      pieces: [
        [
          'bread-shelves',
          [0, 37, 23, 59],
          [
            [0, 0],
            [23, 0],
            [23, 59],
            [0, 59],
          ],
        ],
        [
          'display',
          [8, 62, 40, 71],
          [
            [8, 34],
            [40, 34],
            [40, 71],
            [8, 71],
          ],
        ],
        [
          'counter',
          [25, 42, 64, 46],
          [
            [25, 27],
            [64, 26],
            [64, 46],
            [25, 46],
          ],
        ],
        [
          'oven',
          [54, 27, 73, 36],
          [
            [54, 0],
            [73, 0],
            [73, 36],
            [54, 36],
          ],
        ],
        [
          'window-table',
          [85, 53, 95, 59],
          [
            [85, 48],
            [95, 48],
            [95, 59],
            [85, 59],
          ],
        ],
        [
          'front-chair',
          [87, 60, 97, 80],
          [
            [92, 57],
            [96, 57],
            [97, 80],
            [95, 80],
            [94, 70],
            [88, 69],
            [88, 76],
            [86, 76],
            [87, 62],
          ],
        ],
        [
          'back-chair',
          [81, 51, 87, 68],
          [
            [81, 44],
            [87, 44],
            [87, 68],
            [81, 68],
          ],
        ],
      ],
      spots: [
        {
          id: 'bread',
          label: '看看面包',
          point: [45, 75],
          detail: '玻璃柜里摆着可颂和圆面包。',
        },
        {
          id: 'counter',
          label: '看看售卖台',
          point: [53, 53],
          detail: '纸袋和夹子放在柜台一侧。',
        },
        {
          id: 'oven',
          label: '看看烤炉',
          point: [78, 48],
          detail: '烤炉前留着搬放烤盘的通道。',
        },
        {
          id: 'window',
          label: '看看窗边花瓶',
          point: [77, 73],
          detail: '小花瓶放在靠窗的桌上。',
        },
        {
          id: 'sit',
          label: '在窗边小桌坐下',
          point: [79, 87],
          detail: '在窗边木椅上坐下。',
          pose: 'sit',
          contact: [93, 78],
          seat: [93, 64],
          scale: 1.25,
          mirror: true,
          inFrontOf: ['front-chair', 'window-table'],
        },
      ],
    },
    extra: {
      pieces: [
        [
          'kneading-counter',
          [0, 65, 31, 84],
          [
            [0, 35],
            [31, 34],
            [31, 84],
            [0, 84],
          ],
        ],
        [
          'back-counter',
          [23, 43, 40, 53],
          [
            [23, 30],
            [40, 30],
            [40, 53],
            [23, 53],
          ],
        ],
        [
          'desk',
          [74, 45, 83, 66],
          [
            [68, 34],
            [83, 34],
            [83, 66],
            [74, 66],
          ],
        ],
        [
          'tray-shelves',
          [82, 53, 100, 86],
          [
            [82, 0],
            [100, 0],
            [100, 86],
            [82, 86],
          ],
        ],
        [
          'chair',
          [64, 53, 74, 69],
          [
            [64, 34],
            [67, 35],
            [69, 49],
            [74, 50],
            [74, 68],
            [72, 68],
            [71, 59],
            [66, 59],
            [66, 69],
            [64, 69],
          ],
        ],
      ],
      spots: [
        {
          id: 'sit',
          label: '在准备台旁坐下',
          point: [56, 81],
          detail: '在准备台旁的木椅上坐下。',
          pose: 'sit',
          contact: [70, 67],
          seat: [70, 49.5],
          scale: 1.3,
          inFrontOf: ['chair', 'desk'],
        },
        {
          id: 'flour',
          label: '看看揉面台',
          point: [38, 80],
          detail: '揉面台上放着面团和搅拌碗。',
        },
        {
          id: 'oven',
          label: '看看烤盘架',
          point: [43, 61],
          detail: '烤盘靠着烤炉整齐收好。',
        },
        {
          id: 'trays',
          label: '看看盖好的托盘',
          point: [76, 79],
          detail: '干净布巾盖在托盘上。',
        },
      ],
    },
  },
  'old-repair': {
    annex: '维修工作间',
    painting: 'old-repair-work-soft-v1.png',
    cast: ['shirou', 'kiritsugu'],
    door: [63, 41],
    street: [76, 43],
    back: [53, 46],
    hall: {
      floor: mainFloor(300),
      pieces: [
        [
          'left-workbench',
          [0, 44, 31, 64],
          [
            [0, 31],
            [31, 31],
            [31, 64],
            [0, 64],
          ],
        ],
        [
          'center-table',
          [21, 60, 42, 65],
          [
            [21, 45],
            [42, 45],
            [42, 65],
            [21, 65],
          ],
        ],
        [
          'back-drawers',
          [45, 28, 59, 45],
          [
            [45, 20],
            [59, 20],
            [59, 45],
            [45, 45],
          ],
        ],
        [
          'back-cabinet',
          [25, 30, 42, 44],
          [
            [25, 0],
            [42, 0],
            [42, 44],
            [25, 44],
          ],
        ],
        [
          'right-shelves',
          [82, 43, 100, 78],
          [
            [82, 31],
            [100, 25],
            [100, 78],
            [82, 78],
          ],
        ],
      ],
      spots: [
        {
          id: 'radio',
          label: '看看旧收音机',
          point: [37, 69],
          detail: '旧收音机放在绿色台灯下。',
        },
        {
          id: 'fan',
          label: '看看电风扇',
          point: [36, 52],
          detail: '金属风扇已经停下。',
        },
        {
          id: 'tools',
          label: '看看工具墙',
          point: [46, 78],
          detail: '扳手和螺丝刀各有自己的挂钩。',
        },
        {
          id: 'parts',
          label: '看看零件柜',
          point: [63, 57],
          detail: '小抽屉里分开收着零件。',
        },
        {
          id: 'bike',
          label: '看看旧自行车',
          point: [68, 50],
          detail: '旧自行车靠在工作间门边。',
        },
      ],
    },
    extra: {
      pieces: [
        [
          'workbench',
          [0, 65, 25, 87],
          [
            [0, 35],
            [25, 34],
            [25, 87],
            [0, 87],
          ],
        ],
        [
          'back-drawers',
          [29, 42, 39, 50],
          [
            [29, 20],
            [39, 20],
            [39, 50],
            [29, 50],
          ],
        ],
        [
          'desk',
          [85, 59, 100, 88],
          [
            [78, 39],
            [100, 40],
            [100, 88],
            [85, 88],
          ],
        ],
        [
          'chair',
          [73, 63, 87, 81],
          [
            [74, 38],
            [77, 39],
            [80, 59],
            [87, 61],
            [87, 80],
            [85, 80],
            [84, 69],
            [77, 69],
            [77, 81],
            [73, 81],
          ],
        ],
        [
          'right-shelves',
          [69, 48, 79, 57],
          [
            [69, 20],
            [79, 20],
            [79, 57],
            [69, 57],
          ],
        ],
      ],
      spots: [
        {
          id: 'manual',
          label: '坐下看维修手册',
          point: [67, 91],
          detail: '翻开桌上的维修手册。',
          pose: 'read',
          contact: [81.5, 81],
          seat: [81.5, 59.5],
          scale: 1.7,
          inFrontOf: ['chair', 'desk'],
        },
        {
          id: 'radio',
          label: '看看工作台',
          point: [34, 78],
          detail: '一台旧收音机摊放在工具旁。',
        },
        {
          id: 'tools',
          label: '看看常用工具',
          point: [43, 62],
          detail: '常用工具收在台面边缘。',
        },
        {
          id: 'parts',
          label: '看看分类抽屉',
          point: [62, 69],
          detail: '小零件分别装在浅抽屉里。',
        },
      ],
    },
  },
  'shinto-convenience': {
    annex: '店内休息间',
    painting: 'shinto-convenience-rest-soft-v1.png',
    cast: ['shirou', 'rin'],
    door: [26, 29],
    street: [91, 43],
    back: [44.5, 47],
    arrivalOffset: 5,
    hall: {
      floor: mainFloor(220),
      pieces: [
        [
          'left-shelves',
          [0, 43, 8, 65],
          [
            [0, 0],
            [8, 0],
            [8, 65],
            [0, 65],
          ],
        ],
        [
          'checkout',
          [9, 31, 35, 39],
          [
            [9, 20],
            [35, 20],
            [35, 39],
            [9, 39],
          ],
        ],
        [
          'coolers',
          [36, 30, 73, 38],
          [
            [36, 6],
            [73, 6],
            [73, 38],
            [36, 38],
          ],
        ],
        [
          'left-island',
          [10, 54, 41, 64],
          [
            [10, 31],
            [41, 31],
            [41, 64],
            [10, 64],
          ],
        ],
        [
          'right-island',
          [62, 54, 87, 66],
          [
            [62, 30],
            [87, 30],
            [87, 66],
            [62, 66],
          ],
        ],
        [
          'front-left',
          [0, 82, 17, 99],
          [
            [0, 66],
            [17, 66],
            [17, 99],
            [0, 99],
          ],
        ],
        [
          'front-right',
          [83, 85, 100, 99],
          [
            [83, 75],
            [100, 71],
            [100, 99],
            [83, 99],
          ],
        ],
      ],
      spots: [
        {
          id: 'snacks',
          label: '看看零食架',
          point: [47, 69],
          detail: '几种小包装零食分排摆好。',
        },
        {
          id: 'drinks',
          label: '看看冷饮柜',
          point: [52, 43],
          detail: '饮料隔着玻璃排在冷柜里。',
        },
        {
          id: 'bread',
          label: '看看便当与面包',
          point: [55, 74],
          detail: '便当和面包放在低货架上。',
        },
        {
          id: 'fruit',
          label: '看看水果',
          point: [72, 87],
          detail: '几只苹果和香蕉放在浅篮里。',
        },
        {
          id: 'papers',
          label: '看看杂志架',
          point: [88, 76],
          detail: '杂志收在靠门的窄架上。',
        },
      ],
    },
    extra: {
      pieces: [
        [
          'kettle-counter',
          [0, 65, 22, 85],
          [
            [0, 33],
            [22, 32],
            [22, 85],
            [0, 85],
          ],
        ],
        [
          'back-shelf',
          [20, 45, 25, 53],
          [
            [20, 10],
            [25, 10],
            [25, 53],
            [20, 53],
          ],
        ],
        [
          'window-table',
          [88, 57, 100, 96],
          [
            [75, 36],
            [100, 43],
            [100, 96],
            [88, 96],
          ],
        ],
        [
          'chair',
          [69, 70, 89, 86],
          [
            [70, 37],
            [74, 38],
            [78, 62],
            [89, 64],
            [89, 85],
            [87, 85],
            [85, 73],
            [72, 73],
            [72, 86],
            [69, 86],
          ],
        ],
        [
          'plant',
          [66, 49, 71, 65],
          [
            [66, 24],
            [71, 29],
            [71, 65],
            [66, 65],
          ],
        ],
      ],
      spots: [
        {
          id: 'magazine',
          label: '坐下翻看杂志',
          point: [61, 93],
          detail: '翻开窗边桌上的杂志。',
          pose: 'read',
          contact: [79, 88],
          seat: [79, 60],
          scale: 1.9,
          inFrontOf: ['chair', 'window-table'],
        },
        {
          id: 'kettle',
          label: '看看热水台',
          point: [30, 76],
          detail: '纸杯叠在热水壶旁。',
        },
        {
          id: 'cup',
          label: '看看窗边小桌',
          point: [61, 80],
          detail: '桌上放着一只杯子和纸袋。',
        },
        {
          id: 'window',
          label: '看看新都街道',
          point: [57, 69],
          detail: '窗外有行道树和缓缓经过的车。',
        },
      ],
    },
  },
};

function room(scene: CityInteriorScene, layout: Layout): PreviewRoom {
  const result: PreviewRoom = {
    scene: {
      ...scene,
      floor: { ...(layout.floor ?? extraFloor) },
      furniture: [],
      spots: [],
    },
    doors: [],
    actions: [],
  };
  const point = ([x, y]: Pair) => paintedPoint(result.scene, x * 16, y * 9);
  result.scene.furniture = layout.pieces.map(([id, box, mask = []]) =>
    paintedFurniture(result.scene, id, box, mask),
  );
  result.scene.spots = layout.spots.map((spot) => ({
    id: spot.id,
    label: spot.label,
    detail: spot.detail,
    point: point(spot.point),
  }));
  result.actions = layout.spots
    .filter((spot) => spot.pose)
    .map((spot) => ({
      id: spot.id,
      pose: spot.pose!,
      contact: point(spot.contact!),
      elevation: 0,
      seat: { x: spot.seat![0] * 16, y: spot.seat![1] * 9 },
      scale: spot.scale,
      mirror: spot.mirror,
      inFrontOf: spot.inFrontOf,
    }));
  return result;
}

function visitorSprite(
  actor: ActorId,
  direction: PreviewDirection,
  phase: number,
  pose?: 'sit' | 'read',
) {
  if (actor === 'waver') {
    const model = waverSprite(actor, direction, phase, pose);
    // Reuse the native crop, registering hips and feet locally for actual chairs.
    return pose
      ? mirrorPreviewSprite({
          ...model,
          anchorX: 90,
          anchorY: model.cellHeight - 5,
          seat: {
            x: pose === 'sit' ? 198 : 202,
            y: pose === 'sit' ? 370 : 350,
          },
        })
      : model;
  }
  if (actor === 'kiritsugu') {
    const model = einzbernSprite(actor, direction, phase, pose);
    return pose === 'read'
      ? { ...model, anchorX: 270, anchorY: 486, seat: { x: 143, y: 322 } }
      : model;
  }
  return schoolSprite(
    actor as 'shirou' | 'rin' | 'sakura',
    direction,
    phase,
    pose,
  );
}

export const SHOP_PREVIEWS = Object.fromEntries(
  SHOP_BUILDING_IDS.map((id) => {
    const spec = authored[id],
      original = CITY_INTERIOR_SCENES[id];
    const hall = room(original, spec.hall);
    const annex = room(
      {
        ...original,
        room: spec.annex,
        painting: `/fate/interior-art/${spec.painting}`,
        description: spec.annex,
      },
      spec.extra,
    );
    const threshold = paintedPoint(
      hall.scene,
      spec.door[0] * 16,
      spec.door[1] * 9,
    );
    const back = paintedPoint(annex.scene, spec.back[0] * 16, spec.back[1] * 9);
    const street = paintedPoint(
      hall.scene,
      (spec.street?.[0] ?? 50) * 16,
      (spec.street?.[1] ?? 95) * 9,
    );
    // This boundary prevents walking into the next room depicted beyond its open door.
    for (const [space, door] of [
      [hall, threshold],
      [annex, back],
    ] as const)
      space.scene.furniture = [
        ...space.scene.furniture,
        {
          id: 'room-boundary',
          footprint: { x: door.x - 70, y: door.y - 60, width: 140, height: 25 },
        },
      ];
    hall.doors = [
      {
        id: 'street',
        label: '走出店门',
        point: street,
        to: null,
        arrival: street,
      },
      {
        id: 'annex',
        label: spec.annex,
        point: threshold,
        to: 'annex',
        arrival: { ...back, y: back.y + 65 },
      },
    ];
    annex.doors = [
      {
        id: 'hall',
        label: '回店面',
        point: back,
        to: 'hall',
        arrival: { ...threshold, y: threshold.y + (spec.arrivalOffset ?? 65) },
      },
    ];
    const plan: PreviewHouse = {
      name: original.name,
      rooms: { hall, annex },
      cast: spec.cast.map((actor) => ({ id: actor, name: NAMES[actor]! })),
      routeSummary: `${original.room} → ${spec.annex}`,
      sprite: visitorSprite,
    };
    return [id, plan];
  }),
) as Record<ShopBuildingId, PreviewHouse>;
