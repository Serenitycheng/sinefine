// Shared playable geography for the city, destinations and street views.
// Old single-block coordinates are mapped onto two banks of the river.
export function cityPoint(point: { x: number; y: number }) {
  return {
    x: point.x * 1.7 + (point.x > 810 ? 340 : 100),
    y: point.y * 1.65,
  };
}

export const DISTRICT_HOMES = {
  einzbern: { name: '切嗣一家 · 新居', ...cityPoint({ x: 230, y: 300 }) },
  emiya: { name: '卫宫宅 · 士郎的家', ...cityPoint({ x: 465, y: 300 }) },
  tohsaka: { name: '远坂宅', ...cityPoint({ x: 680, y: 300 }) },
  matou: { name: '间桐宅', ...cityPoint({ x: 230, y: 550 }) },
  waver: { name: '韦伯的住处', ...cityPoint({ x: 1120, y: 550 }) },
  temple: { name: '柳洞寺 · 葛木的住处', x: 350, y: 350 },
  church: { name: '教会 · 绮礼的住处', ...cityPoint({ x: 1390, y: 300 }) },
  kayneth: { name: '肯尼斯的住处', ...cityPoint({ x: 480, y: 850 }) },
  fujimura: { name: '藤村家', ...cityPoint({ x: 680, y: 550 }) },
  natalia: { name: '娜塔莉亚的住处', ...cityPoint({ x: 230, y: 850 }) },
} as const;

export const DISTRICT_PLACES = {
  school: { name: '穗群原学园', ...cityPoint({ x: 465, y: 550 }) },
  cafe: { name: '街角咖啡店', ...cityPoint({ x: 1250, y: 844 }) },
  shops: { name: '商店侧巷', ...cityPoint({ x: 893, y: 740 }) },
  park: { name: '林荫路边 · 河岸公园', x: 1880, y: 907 },
} as const;

export const DISTRICT_LANDMARKS = [
  ...Object.entries(DISTRICT_HOMES).map(([id, point]) => ({
    id,
    ...point,
    kind: 'home' as const,
  })),
  ...Object.entries(DISTRICT_PLACES).map(([id, point]) => ({
    id,
    ...point,
    kind: id === 'park' ? ('park' as const) : ('public' as const),
  })),
];
export type DistrictLandmark = (typeof DISTRICT_LANDMARKS)[number];

// Street artwork lives in one scrollable world. Map coordinates remain the
// source of truth for movement, schedules and saves.
export const STREET_SCENE_SCALE = 2;

export function nearestDistrictLandmark(
  point: { x: number; y: number },
  previous?: DistrictLandmark,
): DistrictLandmark {
  const distance = (place: DistrictLandmark) =>
    Math.hypot(point.x - place.x, point.y - place.y);
  const nearest = DISTRICT_LANDMARKS.reduce((best, place) =>
    distance(place) < distance(best) ? place : best,
  );
  // Keep the current-place label stable while walking along a boundary.
  return previous && distance(previous) <= distance(nearest) + 24
    ? previous
    : nearest;
}

export function districtSceneImage(place: DistrictLandmark) {
  return place.id === 'cafe'
    ? '/fate/street/street.png'
    : `/fate/street/scenes/${place.id}.png`;
}

export function streetScenePoint(point: { x: number; y: number }) {
  return {
    x: point.x * STREET_SCENE_SCALE,
    y: point.y * STREET_SCENE_SCALE,
  };
}

export function districtAt(p: { x: number; y: number }) {
  if (p.x < 1500) return p.y < 850 ? '冬木 · 深山町北丘' : '冬木 · 深山町';
  if (p.x < 1800) return p.y < 1150 ? '冬木 · 冬木大桥' : '冬木 · 未远川南桥';
  if (p.y < 850) return '冬木 · 新都教会区';
  if (p.y < 1200) return p.x < 2050 ? '冬木 · 新都河岸公园' : '冬木 · 新都住宅区';
  return '冬木 · 新都商业街';
}
