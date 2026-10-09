import {
  CITY_ROADS,
  projectOnSegment,
  type CityPoint,
} from './fate-city-layout';
import { HOME_ENTRANCES } from './fate-home-entrances';

export type CityArtScene =
  | 'residential'
  | 'old-street'
  | 'residential-east'
  | 'old-south'
  | 'west-residential'
  | 'school-slope'
  | 'school-junction'
  | 'estate-lane'
  | 'mount-miyama'
  | 'temple-path'
  | 'bridge-approach'
  | 'fuyuki-bridge'
  | 'bridge-east'
  | 'south-bridge'
  | 'riverside'
  | 'shinto-main'
  | 'station-avenue'
  | 'shinto-residential'
  | 'church-slope'
  | 'shinto-north'
  | 'central-park'
  | 'tohsaka-approach'
  | 'matou-approach';
export type CityArtSceneConfig = {
  id: CityArtScene;
  name: string;
  roadId: string;
  points: readonly CityPoint[];
  width: number;
  homes: readonly (keyof typeof HOME_ENTRANCES)[];
  locals: readonly string[];
  publicPlaces?: readonly string[];
  extraApproaches: readonly (readonly CityPoint[])[];
  start: CityPoint;
  description: string;
  privateApproach?: boolean;
};
export const CITY_ART_JUNCTION = { x: 470, y: 390 };
const oldRoad = CITY_ROADS.find((road) => road.id === 'old-lanes')!;
export const OLD_STREET_CENTERS = [
  oldRoad.points[0],
  { x: 437.5, y: 452.5 },
  oldRoad.points[1],
  projectOnSegment({ x: 405, y: 580 }, oldRoad.points[1], oldRoad.points[2]),
  oldRoad.points[2],
  projectOnSegment(
    HOME_ENTRANCES.waver.points[0],
    oldRoad.points[2],
    oldRoad.points[3],
  ),
  oldRoad.points[3],
];
export const OLD_BOOKSHOP_DOOR = { x: 350, y: 582 };
export const OLD_BOOKSHOP_APPROACH = [{ x: 405, y: 580 }, OLD_BOOKSHOP_DOOR];
const street = (
  id: CityArtScene,
  roadId: string,
  name: string,
  homes: CityArtSceneConfig['homes'] = [],
  locals: readonly string[] = [],
  publicPlaces: readonly string[] = [],
  description = name,
): CityArtSceneConfig => {
  const road = CITY_ROADS.find((item) => item.id === roadId)!;
  return {
    id,
    roadId,
    name,
    homes,
    locals,
    publicPlaces,
    points: road.points,
    width: road.width,
    extraApproaches: [],
    start: road.points[Math.floor(road.points.length / 2)],
    description,
  };
};
const privateWalk = (
  home: 'tohsaka' | 'matou',
  roadId: string,
  name: string,
): CityArtSceneConfig => {
  const entry = HOME_ENTRANCES[home];
  const road = CITY_ROADS.find((item) => item.id === roadId)!;
  const foot = entry.points[0];
  const join = road.points
    .slice(1)
    .map((b, i) => projectOnSegment(foot, road.points[i], b))
    .sort(
      (a, b) =>
        Math.hypot(a.x - foot.x, a.y - foot.y) -
        Math.hypot(b.x - foot.x, b.y - foot.y),
    )[0];
  return {
    id: `${home}-approach`,
    roadId,
    name,
    points: [join, ...entry.points],
    width: entry.width,
    homes: [home],
    locals: [],
    extraApproaches: [],
    start: join,
    description: '沿用原地图的庭前通路与门口，不移动住宅坐标',
    privateApproach: true,
  };
};
export const CITY_ART_SCENES: Record<CityArtScene, CityArtSceneConfig> = {
  residential: {
    id: 'residential' as const,
    name: '深山住宅坂 · 西段',
    roadId: 'residential-slope',
    points: CITY_ROADS.find(
      (road) => road.id === 'residential-slope',
    )!.points.slice(0, 6),
    width: 110,
    homes: ['einzbern', 'emiya'] as const,
    locals: ['miyama-florist'],
    extraApproaches: [] as readonly (readonly CityPoint[])[],
    start: { x: 720, y: 485 },
    description: '日式院墙、花店与两户家庭住宅',
  },
  'old-street': {
    id: 'old-street' as const,
    name: '深山旧街 · 北段',
    roadId: 'old-lanes',
    points: oldRoad.points.slice(0, 4),
    width: oldRoad.width,
    homes: ['waver'] as const,
    locals: ['old-bookshop'],
    extraApproaches: [OLD_BOOKSHOP_APPROACH],
    start: CITY_ART_JUNCTION,
    description: '旧木住宅、石基与书店 · 榉树、枫和蕨类',
  },
  'residential-east': {
    ...street(
      'residential-east',
      'residential-slope',
      '深山住宅坂 · 东段',
      ['fujimura'],
      [],
      [],
      '藤村家的木门、樟树与紫薇，连接通学路',
    ),
    points: CITY_ROADS.find((r) => r.id === 'residential-slope')!.points.slice(
      5,
    ),
    start: { x: 1180, y: 680 },
  },
  'old-south': {
    ...street(
      'old-south',
      'old-lanes',
      '深山旧街 · 南段',
      [],
      ['old-repair'],
      [],
      '石基木屋、修理铺、枫与蕨',
    ),
    points: oldRoad.points.slice(3),
    start: oldRoad.points[4],
  },
  'west-residential': street(
    'west-residential',
    'west-residential',
    '深山西住宅巷',
    ['natalia'],
    [],
    [],
    '朴素租屋、枇杷、山茶和庭前小径',
  ),
  'school-slope': street(
    'school-slope',
    'school-slope',
    '学园通学坡道',
    [],
    [],
    ['school'],
    '普通日式学园、校门广场与夏日樟树',
  ),
  'school-junction': street(
    'school-junction',
    'school-junction',
    '深山中心交叉口',
    [],
    [],
    [],
    '不规则四岔口、告示板与榉树',
  ),
  'estate-lane': street(
    'estate-lane',
    'estate-lane',
    '洋馆丘陵小路',
    [],
    [],
    [],
    '克制的砖石洋馆院墙、枫与蔷薇',
  ),
  'mount-miyama': street(
    'mount-miyama',
    'mount-miyama',
    '深山商店街',
    [],
    ['miyama-bakery'],
    ['shops'],
    '面包铺、日用品店、梧桐与天竺葵',
  ),
  'temple-path': street(
    'temple-path',
    'temple-path',
    '圆藏山参道',
    ['temple'],
    [],
    [],
    '日本寺门、石径、松杉与苔',
  ),
  'bridge-approach': street(
    'bridge-approach',
    'bridge-approach',
    '冬木大桥西引道',
    [],
    [],
    [],
    '深山町低层街道向桥面渐变',
  ),
  'fuyuki-bridge': street(
    'fuyuki-bridge',
    'fuyuki-bridge',
    '冬木大桥',
    [],
    [],
    [],
    '钢桥、未远川与两岸城景',
  ),
  'bridge-east': street(
    'bridge-east',
    'bridge-east',
    '冬木大桥东引道',
    [],
    [],
    ['park'],
    '新都桥头、柳树与开放的小公园入口',
  ),
  'south-bridge': street(
    'south-bridge',
    'south-bridge',
    '南桥 · 日常分支',
    [],
    [],
    [],
    '保留原地图日常支路的朴素混凝土桥',
  ),
  riverside: street(
    'riverside',
    'riverside',
    '新都河岸步道',
    [],
    [],
    [],
    '未远川、低栏杆、柳与鸢尾',
  ),
  'shinto-main': street(
    'shinto-main',
    'shinto-main',
    '新都主街',
    [],
    [],
    [],
    '现代店面、宽路、银杏与鼠尾草',
  ),
  'station-avenue': street(
    'station-avenue',
    'station-avenue',
    '新都站前街',
    ['kayneth'],
    [],
    ['cafe'],
    '车站雨棚、咖啡店与日式现代公寓',
  ),
  'shinto-residential': street(
    'shinto-residential',
    'shinto-residential',
    '新都住宅街',
    [],
    [],
    [],
    '低层公寓、独立阳台与粉绣球',
  ),
  'church-slope': street(
    'church-slope',
    'church-slope',
    '教会丘陵路',
    ['church'],
    [],
    [],
    '朴素石教堂、院门、杉与白百合',
  ),
  'shinto-north': street(
    'shinto-north',
    'shinto-north',
    '新都北街',
    [],
    ['shinto-convenience'],
    [],
    '混凝土与木饰住宅、街角便利店、白桦',
  ),
  'central-park': street(
    'central-park',
    'central-park',
    '中央公园外沿',
    [],
    [],
    [],
    '街区边的开放绿地、榉树、枫与木长椅',
  ),
  'tohsaka-approach': privateWalk(
    'tohsaka',
    'temple-path',
    '远坂宅 · 庭前通路',
  ),
  'matou-approach': privateWalk('matou', 'estate-lane', '间桐宅 · 庭前通路'),
};

export const CITY_ART_SCENE_IDS = Object.keys(
  CITY_ART_SCENES,
) as CityArtScene[];
export function cityScenesForRoad(roadId: string) {
  return CITY_ART_SCENE_IDS.filter(
    (id) => CITY_ART_SCENES[id].roadId === roadId,
  );
}

export function citySceneForRoad(roadId: string): CityArtScene | null {
  return (
    Object.values(CITY_ART_SCENES).find((scene) => scene.roadId === roadId)
      ?.id ?? null
  );
}

/** A crossing needs intent as well as proximity. Standing near a junction or
 * walking past it along the original street never changes scenery. */
export function citySceneCrossing(
  scene: CityArtScene,
  from: CityPoint,
  to: CityPoint,
) {
  if (Math.hypot(to.x - CITY_ART_JUNCTION.x, to.y - CITY_ART_JUNCTION.y) > 12)
    return null;
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy);
  const sign = scene === 'residential' ? 1 : -1;
  if (
    length < 1e-6 ||
    ((-65 * dx + 125 * dy) * sign) / (Math.hypot(65, 125) * length) < 0.8
  )
    return null;
  return scene === 'residential' ? 'old-street' : 'residential';
}
