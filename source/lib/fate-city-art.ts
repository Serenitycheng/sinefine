import { CITY_ROADS, type CityPoint } from './fate-city-layout';
import { DISTRICT_LANDMARKS } from './fate-district';
import { HOME_ENTRANCES } from './fate-home-entrances';
import { projectCityArtPoint } from './fate-city-art-registration';
import type { CityArtMode } from './fate-city-art-camera';
import {
  citySceneForRoad,
  cityScenesForRoad,
  OLD_BOOKSHOP_DOOR,
  type CityArtScene,
} from './fate-city-art-scenes';

/** Geography is the source of truth. An art scene references existing roads,
 * rather than inventing a second city or migrating saved actor positions. */
export const CITY_ART_QUARTERS = [
  {
    id: 'miyama-home',
    name: '深山 · 住宅与通学坂',
    roads: ['residential-slope', 'school-slope', 'school-junction'],
    places: ['einzbern', 'emiya', 'fujimura', 'school'],
    character: '日式院墙与木门 · 樟树、栀子与季节花店',
  },
  {
    id: 'miyama-old',
    name: '深山 · 旧街与西住宅巷',
    roads: ['old-lanes', 'west-residential'],
    places: ['waver', 'natalia'],
    character: '旧木屋与石基 · 榉树、蕨叶和生活小店',
  },
  {
    id: 'miyama-estate',
    name: '深山 · 洋馆坡地',
    roads: ['estate-lane', 'mount-miyama'],
    places: ['tohsaka', 'matou', 'shops'],
    character: '远坂、间桐宅各有轮廓 · 枫、蔷薇与商店街',
  },
  {
    id: 'temple-hill',
    name: '圆藏山 · 柳洞寺参道',
    roads: ['temple-path'],
    places: ['temple'],
    character: '石阶、寺门和林间山路 · 松、杉与苔',
  },
  {
    id: 'river',
    name: '未远川 · 桥与河岸',
    roads: [
      'bridge-approach',
      'fuyuki-bridge',
      'bridge-east',
      'south-bridge',
      'riverside',
    ],
    places: ['park'],
    character: '大桥、双岸和开放步道 · 柳与河边草木',
  },
  {
    id: 'shinto-town',
    name: '新都 · 主街与站前住宅',
    roads: ['shinto-main', 'station-avenue', 'shinto-residential'],
    places: ['cafe', 'kayneth'],
    character: '现代店面与较宽街道 · 银杏、街边花坛',
  },
  {
    id: 'shinto-hill',
    name: '新都 · 教会丘陵',
    roads: ['church-slope', 'shinto-north', 'central-park'],
    places: ['church'],
    character: '教会、坡路与公园边缘 · 长青树与低矮花境',
  },
] as const;
export type CityArtQuarter = (typeof CITY_ART_QUARTERS)[number];

export function cityArtQuarter(roadId: string) {
  return CITY_ART_QUARTERS.find((quarter) =>
    quarter.roads.some((id) => id === roadId),
  );
}

export const CITY_ART_ROADS = CITY_ROADS.map((road) => ({
  road,
  quarter: cityArtQuarter(road.id)!,
  stage: citySceneForRoad(road.id) ? ('pilot' as const) : ('planned' as const),
  scene: citySceneForRoad(road.id),
  scenes: cityScenesForRoad(road.id),
}));

export const CITY_ART_PLACES = DISTRICT_LANDMARKS.map((place) => ({
  ...place,
  // A home uses the existing safe doorstep, not its schematic map label.
  entrance: Object.hasOwn(HOME_ENTRANCES, place.id)
    ? HOME_ENTRANCES[place.id as keyof typeof HOME_ENTRANCES].door
    : { x: place.x, y: place.y },
}));

export type LocalArtPlace = {
  id: string;
  name: string;
  roadId: string;
  point: CityPoint;
  entrance?: CityPoint;
  note: string;
};
/** Original small places belong to a named road. They do not replace an
 * existing game place or silently become a new public-activity/save ID. */
export const CITY_LOCAL_PLACES: readonly LocalArtPlace[] = [
  {
    id: 'miyama-florist',
    name: '深山花店',
    roadId: 'residential-slope',
    point: { x: 780, y: 449 },
    note: '住宅坂上的小花店；季节花束与院门盆栽。原创地点，购物玩法待接入。',
  },
  {
    id: 'old-bookshop',
    name: '旧街书店',
    roadId: 'old-lanes',
    point: { x: 405, y: 580 },
    entrance: OLD_BOOKSHOP_DOOR,
    note: '旧街的小书店，门前陈列让出通路。原创地点，购书玩法待接入；韦伯住宅的原位置保持。',
  },
  {
    id: 'miyama-bakery',
    name: '商店街面包铺',
    roadId: 'mount-miyama',
    point: { x: 1280, y: 1040 },
    note: '深山商店街的面包铺；保留独立店面和地点，购物玩法待接入。',
  },
  {
    id: 'old-repair',
    name: '旧街修理铺',
    roadId: 'old-lanes',
    point: { x: 350, y: 905 },
    note: '旧街南段的生活小店，工具与门前陈列留出通路。',
  },
  {
    id: 'shinto-convenience',
    name: '新都便利店',
    roadId: 'shinto-north',
    point: { x: 2350, y: 520 },
    note: '现代街区的小店，预览不新增正式存档地点。',
  },
] as const;

export const MIYAMA_PILOT = {
  id: 'miyama-residential-west',
  name: '深山住宅坂 · 西段',
  roadId: 'residential-slope',
  widthOnMap: CITY_ROADS.find((road) => road.id === 'residential-slope')!.width,
  points: CITY_ROADS.find(
    (road) => road.id === 'residential-slope',
  )!.points.slice(0, 6),
  homes: ['einzbern', 'emiya'] as const,
  start: { x: 720, y: 485 },
  painting: '/fate/city-art/miyama-residential-west-soft-v2.png',
  width: 1672,
  height: 941,
  exits: [
    {
      id: 'old-lanes',
      name: '通向深山旧街 · 韦伯住处',
      point: { x: 470, y: 390 },
    },
    { id: 'school-slope', name: '通向穗群原学园', point: { x: 890.5, y: 495 } },
    {
      id: 'residential-east',
      name: '住宅坂东段 · 藤村家方向',
      point: { x: 1060, y: 585 },
    },
  ],
} as const;

/** Orthographic oblique ground projection for the first geography-bound
 * painting. Input, art, map and routes all keep the original city coordinates. */
export function cityPilotLayoutPoint(point: CityPoint): CityPoint {
  return {
    x: 80 + (point.x - 420) * 1.8 + (point.y - 320) * 0.25,
    y: 880 - (point.x - 420) * 0.65 + (point.y - 320) * 0.65,
  };
}
export function cityPilotLayoutWorld(point: CityPoint): CityPoint {
  const x = point.x - 80,
    y = point.y - 880;
  const determinant = 1.8 * 0.65 + 0.25 * 0.65;
  return {
    x: 420 + (0.65 * x - 0.25 * y) / determinant,
    y: 320 + (0.65 * x + 1.8 * y) / determinant,
  };
}
export const cityPilotPaint = (
  point: CityPoint,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) => projectCityArtPoint(point, false, mode, scene);
export const cityPilotWorld = (
  point: CityPoint,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) => projectCityArtPoint(point, true, mode, scene);
