import type { CityPoint } from './fate-city-layout';
import groundData from './fate-city-interior-ground.json';

export const CITY_INTERIOR_IDS = [
  'emiya',
  'einzbern',
  'tohsaka',
  'matou',
  'waver',
  'temple',
  'church',
  'kayneth',
  'fujimura',
  'natalia',
  'school',
  'cafe',
  'shops',
  'miyama-florist',
  'old-bookshop',
  'miyama-bakery',
  'old-repair',
  'shinto-convenience',
] as const;
export type CityInteriorId = (typeof CITY_INTERIOR_IDS)[number];
export type InteriorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type InteriorFloor = {
  backLeft: number;
  backRight: number;
  backY: number;
  frontLeft: number;
  frontRight: number;
  frontY: number;
};
export type InteriorFurniture = {
  id: string;
  footprint: InteriorRect;
  /** Painted silhouette of this piece, in the 1600×900 authored view. */
  silhouette?: readonly CityPoint[];
};
export type CityInteriorScene = {
  id: CityInteriorId;
  name: string;
  room: string;
  basis: string;
  description: string;
  painting: string;
  floor: InteriorFloor;
  furniture: readonly InteriorFurniture[];
  spots: readonly {
    id: string;
    label: string;
    point: CityPoint;
    detail: string;
  }[];
};

export const INTERIOR_WORLD = { width: 1000, height: 660 };
export const INTERIOR_PAINT = { width: 1600, height: 900 };
export const INTERIOR_ART_ENTRY: CityPoint = { x: 500, y: 632 };
export const INTERIOR_PLAYER_RADIUS = 13;
type SceneInput = Omit<
  CityInteriorScene,
  'id' | 'painting' | 'floor' | 'spots' | 'furniture'
>;
const householdSpots: CityInteriorScene['spots'] = [
  {
    id: 'left',
    label: '看看起居角',
    point: { x: 150, y: 505 },
    detail: '这里的陈设供室内美术预览；居民交谈将沿用正式游戏的生活机制。',
  },
  {
    id: 'rear',
    label: '走到房间深处',
    point: { x: 500, y: 75 },
    detail: '主要房间可以绕行；侧门、卧室与其他楼层仍待逐间制作。',
  },
  {
    id: 'right',
    label: '看看窗边',
    point: { x: 865, y: 520 },
    detail: '窗光和庭院植物随建筑区别绘制。',
  },
];
const INPUTS: Record<CityInteriorId, SceneInput> = {
  emiya: {
    name: '卫宫宅',
    room: '和室与厨房',
    basis: '原作建筑形制参考 · 房间布局创作',
    description: '杉木、榻榻米与纸拉门；厨房连着家庭饭桌，庭院透入日光。',
  },
  einzbern: {
    name: '切嗣一家 · 新居',
    room: '家庭起居间',
    basis: '项目改编的冬木家庭新居',
    description:
      '浅墙暖木、家庭餐桌与女儿的生活物品；冬木的新家保留欧洲家族的小陈设。',
  },
  tohsaka: {
    name: '远坂宅',
    room: '书房会客厅',
    basis: '原作洋馆形制参考 · 陈设布局创作',
    description: '深木书柜、旧铜件、茶具与规整的会客区，窗外是枫树和蔷薇。',
  },
  matou: {
    name: '间桐宅',
    room: '旧宅起居厅',
    basis: '原作旧宅气氛参考 · 地面会客间创作',
    description: '旧木、暗绿织物、厚窗帘与深走廊；日光保留可读的行走空间。',
  },
  waver: {
    name: '韦伯的住处',
    room: '借住处与资料角',
    basis: '普通借住处尺度参考 · 资料角创作',
    description: '普通日式家屋中的书、地图、桌灯和茶杯，保留居家的尺度。',
  },
  temple: {
    name: '柳洞寺 · 葛木的住处',
    room: '寺院共用生活间',
    basis: '原作寺院木构参考 · 僧房布局创作',
    description: '木梁、障子与朴素饭桌；缘侧向杉松和苔庭打开。',
  },
  church: {
    name: '教会 · 绮礼的住处',
    room: '礼拜堂',
    basis: '原作教会形制参考 · 比例布局创作',
    description:
      '浅石、深木与窄长侧窗；两侧长椅留出贯通的中轴过道，教会住处尚待补充。',
  },
  kayneth: {
    name: '肯尼斯的住处',
    room: '会客与研究室',
    basis: '角色身份参考 · 冬木居所为项目改编',
    description: '有高档套间气质的正式会客区与整洁研究桌，面向新都银杏街景。',
  },
  fujimura: {
    name: '藤村家',
    room: '家庭和室',
    basis: '日式大家庭氛围参考 · 室内布局创作',
    description: '暖木、榻榻米、家庭厨房和宽饭桌，枫与杜鹃庭院映入缘侧。',
  },
  natalia: {
    name: '娜塔莉亚的住处',
    room: '实用工作起居间',
    basis: '角色气质参考 · 原创冬木住所',
    description: '耐用木地板、工具桌、旅行物品和实用收纳，窗台有蕨与香草。',
  },
  school: {
    name: '穗群原学园',
    room: '教室与走廊口',
    basis: '原作学园日常参考 · 教室布局创作',
    description: '木地板、黑板、课桌与明亮侧窗，中央过道连到走廊门。',
  },
  cafe: {
    name: '街角咖啡店',
    room: '咖啡店大厅',
    basis: '项目原创公共店面',
    description: '木吧台、咖啡器具、窗边座位与一条清楚的点单通路。',
  },
  shops: {
    name: '深山商店街店面',
    room: '杂货店面',
    basis: '项目改编的共用商店街店面',
    description: '沿墙货架、日常杂货与木柜台，中央留出购物通路。',
  },
  'miyama-florist': {
    name: '深山花店',
    room: '花店与包装台',
    basis: '项目原创店面',
    description: '栀子、绣球与季节切花分别陈列；后侧包装台保留通道。',
  },
  'old-bookshop': {
    name: '旧街书店',
    room: '书店与阅读角',
    basis: '项目原创店面',
    description: '高木书架、翻书台和台灯，旧榉树在窗外投下柔和树影。',
  },
  'miyama-bakery': {
    name: '商店街面包铺',
    room: '面包铺与售卖台',
    basis: '项目原创店面',
    description: '面包木架、左侧玻璃售卖台和后方烤炉，暖光照进顾客通路。',
  },
  'old-repair': {
    name: '旧街修理铺',
    room: '修理工作店面',
    basis: '项目原创店面',
    description: '靠墙工作台、零件抽屉与旧家电，工具收在台上和架上。',
  },
  'shinto-convenience': {
    name: '新都便利店',
    room: '便利店卖场',
    basis: '项目原创店面',
    description: '浅色砖地、冷饮柜和两侧低货架，中央走道连到收银区。',
  },
};

export const CITY_INTERIOR_SCENES = Object.fromEntries(
  CITY_INTERIOR_IDS.map((id): [CityInteriorId, CityInteriorScene] => {
    const input = INPUTS[id];
    const authored = groundData[id];
    const f = authored.floor.map((value) => value * 2.5);
    const floor: InteriorFloor = {
      backLeft: f[0],
      backRight: f[1],
      backY: f[2],
      frontLeft: f[3],
      frontRight: f[4],
      frontY: f[5],
    };
    const furniture: InteriorFurniture[] = authored.pieces.map((piece) => {
      const [left, top, right, bottom] = piece.ground.map(
        (value) => value * 2.5,
      );
      const corners = [
        floorInverse({ x: left, y: top }, floor),
        floorInverse({ x: right, y: top }, floor),
        floorInverse({ x: left, y: bottom }, floor),
        floorInverse({ x: right, y: bottom }, floor),
      ];
      const x = Math.max(0, Math.min(...corners.map((p) => p.x)));
      const y = Math.max(0, Math.min(...corners.map((p) => p.y)));
      const maxX = Math.min(
        INTERIOR_WORLD.width,
        Math.max(...corners.map((p) => p.x)),
      );
      const maxY = Math.min(
        INTERIOR_WORLD.height,
        Math.max(...corners.map((p) => p.y)),
      );
      return {
        id: piece.id,
        footprint: {
          x,
          y,
          width: Math.max(0, maxX - x),
          height: Math.max(0, maxY - y),
        },
        silhouette:
          'mask' in piece
            ? (piece.mask as number[][]).map(([px, py]) => ({
                x: px * 2.5,
                y: py * 2.5,
              }))
            : undefined,
      };
    });
    const shop = [
      'cafe',
      'shops',
      'miyama-florist',
      'old-bookshop',
      'miyama-bakery',
      'old-repair',
      'shinto-convenience',
    ].includes(id);
    const spots: CityInteriorScene['spots'] = householdSpots.map((spot) => ({
      ...spot,
      point:
        spot.id === 'left'
          ? { x: id === 'shinto-convenience' ? 350 : 150, y: 600 }
          : spot.id === 'right'
            ? { x: id === 'shinto-convenience' ? 650 : 850, y: 600 }
            : { x: 500, y: 60 },
      label:
        spot.id === 'rear'
          ? id === 'church'
            ? '走到礼拜堂前方'
            : id === 'school'
              ? '看看黑板与走廊口'
              : shop
                ? '走到店内后侧'
                : '走到房间深处'
          : spot.id === 'left'
            ? shop
              ? '看看左侧陈列'
              : id === 'school'
                ? '看看课桌'
                : id === 'church'
                  ? '看看长椅'
                  : '看看起居角'
            : '看看窗边',
    }));
    return [
      id,
      {
        ...input,
        id,
        painting: `/fate/interior-art/${id}-main-soft-v1.png`,
        floor,
        furniture,
        spots,
      },
    ];
  }),
) as Record<CityInteriorId, CityInteriorScene>;

export function cityInteriorScene(id: string): CityInteriorScene | null {
  return Object.hasOwn(CITY_INTERIOR_SCENES, id)
    ? CITY_INTERIOR_SCENES[id as CityInteriorId]
    : null;
}

/** Perspective registration belongs only to this art preview. Existing indoor
 * room coordinates and saves are untouched. */
export function interiorProject(
  point: CityPoint,
  floor: InteriorFloor,
): CityPoint {
  const v = point.y / INTERIOR_WORLD.height;
  const ratio =
    (floor.backRight - floor.backLeft) / (floor.frontRight - floor.frontLeft);
  const t = (ratio * v) / (1 - v + ratio * v);
  const left = floor.backLeft + (floor.frontLeft - floor.backLeft) * t;
  const right = floor.backRight + (floor.frontRight - floor.backRight) * t;
  return {
    x: left + (point.x / INTERIOR_WORLD.width) * (right - left),
    y: floor.backY + (floor.frontY - floor.backY) * t,
  };
}

export function interiorUnproject(
  point: CityPoint,
  floor: InteriorFloor,
): CityPoint | null {
  const t = (point.y - floor.backY) / (floor.frontY - floor.backY);
  if (t < 0 || t > 1) return null;
  const result = floorInverse(point, floor);
  return result.x < 0 || result.x > INTERIOR_WORLD.width ? null : result;
}

function floorInverse(point: CityPoint, floor: InteriorFloor): CityPoint {
  const t = (point.y - floor.backY) / (floor.frontY - floor.backY);
  const ratio =
    (floor.backRight - floor.backLeft) / (floor.frontRight - floor.frontLeft);
  const v = t / (ratio + (1 - ratio) * t);
  const left = floor.backLeft + (floor.frontLeft - floor.backLeft) * t;
  const right = floor.backRight + (floor.frontRight - floor.backRight) * t;
  const u = (point.x - left) / (right - left);
  return { x: u * INTERIOR_WORLD.width, y: v * INTERIOR_WORLD.height };
}

export function interiorDepth(point: CityPoint, floor: InteriorFloor) {
  const left = interiorProject({ x: 0, y: point.y }, floor);
  const right = interiorProject({ x: INTERIOR_WORLD.width, y: point.y }, floor);
  return (right.x - left.x) / (floor.frontRight - floor.frontLeft);
}
