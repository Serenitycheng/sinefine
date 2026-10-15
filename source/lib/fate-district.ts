// Conversion retained only for imports from the old single-block saves.
export function cityPoint(point: { x: number; y: number }) {
  return {
    x: point.x * 1.7 + (point.x > 810 ? 340 : 100),
    y: point.y * 1.65,
  };
}

export const LEGACY_CITY_HOMES = {
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

export const LEGACY_CITY_PLACES = {
  school: { name: '穗群原学园', ...cityPoint({ x: 465, y: 550 }) },
  cafe: { name: '街角咖啡店', ...cityPoint({ x: 1250, y: 844 }) },
  shops: { name: '商店侧巷', ...cityPoint({ x: 893, y: 740 }) },
  park: { name: '林荫路边 · 河岸公园', x: 1880, y: 907 },
} as const;

export const DISTRICT_HOMES = {
  einzbern: { name: '切嗣一家 · 新居', x: 470, y: 390 },
  emiya: { ...LEGACY_CITY_HOMES.emiya },
  tohsaka: { name: '远坂宅', x: 620, y: 1160 },
  matou: { name: '间桐宅', x: 960, y: 1200 },
  waver: { name: '韦伯的住处', x: 410, y: 650 },
  temple: { name: '柳洞寺 · 葛木的住处', x: 260, y: 1480 },
  church: { ...LEGACY_CITY_HOMES.church },
  kayneth: { name: '肯尼斯的住处', x: 2450, y: 1160 },
  fujimura: { name: '藤村家', x: 1180, y: 680 },
  natalia: { name: '娜塔莉亚的旧居', x: 310, y: 1100 },
} as const;
export const DISTRICT_PLACES = {
  school: { ...LEGACY_CITY_PLACES.school },
  cafe: { ...LEGACY_CITY_PLACES.cafe },
  shops: { name: '深山商店街 · 侧巷', x: 1240, y: 1080 },
  park: { ...LEGACY_CITY_PLACES.park },
} as const;

type DistrictPlaceId =
  | keyof typeof DISTRICT_HOMES
  | keyof typeof DISTRICT_PLACES;

// Earlier painted corridor assets. The playable street now uses the continuous
// world and CITY_ROADS; retain these links for the original art references.
export const STREET_CLOSEUP_LINKS = [
  {
    from: 'temple',
    to: 'einzbern',
    image: '/fate/street/scenes/temple-hill-link.png',
  },
  {
    from: 'einzbern',
    to: 'emiya',
    image: '/fate/street/scenes/miyama-residential-link.png',
  },
  {
    from: 'einzbern',
    to: 'matou',
    image: '/fate/street/scenes/miyama-south-lane-link.png',
  },
  {
    from: 'emiya',
    to: 'school',
    image: '/fate/street/scenes/miyama-residential-link.png',
  },
  {
    from: 'emiya',
    to: 'tohsaka',
    image: '/fate/street/scenes/miyama-estate-link.png',
  },
  {
    from: 'school',
    to: 'fujimura',
    image: '/fate/street/scenes/miyama-residential-link.png',
  },
  {
    from: 'school',
    to: 'kayneth',
    image: '/fate/street/scenes/miyama-south-road-link.png',
  },
  {
    from: 'tohsaka',
    to: 'fujimura',
    image: '/fate/street/scenes/miyama-estate-link.png',
  },
  {
    from: 'matou',
    to: 'natalia',
    image: '/fate/street/scenes/miyama-south-lane-link.png',
  },
  {
    from: 'natalia',
    to: 'kayneth',
    image: '/fate/street/scenes/miyama-south-road-link.png',
  },
  {
    from: 'fujimura',
    to: 'park',
    image: '/fate/street/scenes/fuyuki-bridge-link.png',
  },
  { from: 'park', to: 'shops', image: '/fate/street/scenes/new-city-link.png' },
  {
    from: 'park',
    to: 'waver',
    image: '/fate/street/scenes/shinto-residential-link.png',
  },
  {
    from: 'waver',
    to: 'shops',
    image: '/fate/street/scenes/shinto-residential-link.png',
  },
  {
    from: 'waver',
    to: 'church',
    image: '/fate/street/scenes/church-slope-link.png',
  },
  { from: 'shops', to: 'cafe', image: '/fate/street/scenes/new-city-link.png' },
] as const satisfies ReadonlyArray<{
  from: DistrictPlaceId;
  to: DistrictPlaceId;
  image: string;
}>;

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
export type DistrictLandmark = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: 'home' | 'park' | 'public';
};

export function streetLinksFrom(placeId: string) {
  return STREET_CLOSEUP_LINKS.flatMap((link) => {
    const otherId =
      link.from === placeId ? link.to : link.to === placeId ? link.from : null;
    const place =
      otherId &&
      DISTRICT_LANDMARKS.find((candidate) => candidate.id === otherId);
    return place ? [{ place, image: link.image }] : [];
  });
}

export function streetRoute(fromId: string, toId: string): DistrictLandmark[] {
  const origin = DISTRICT_LANDMARKS.find((place) => place.id === fromId);
  if (!origin || !DISTRICT_LANDMARKS.some((place) => place.id === toId))
    return [];
  const previous = new Map<string, string | null>([[fromId, null]]);
  const queue = [fromId];
  while (queue.length && !previous.has(toId)) {
    const id = queue.shift()!;
    for (const { place } of streetLinksFrom(id)) {
      if (previous.has(place.id)) continue;
      previous.set(place.id, id);
      queue.push(place.id);
    }
  }
  if (!previous.has(toId)) return [];
  const route: DistrictLandmark[] = [];
  for (let id: string | null = toId; id; id = previous.get(id) ?? null)
    route.unshift(DISTRICT_LANDMARKS.find((place) => place.id === id)!);
  return route;
}

// The continuous street artwork and actors share the same scrollable world.
// Map coordinates remain the source of truth for movement, schedules and saves.
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
  if (p.x < 1500) {
    if (p.y > 1300 && p.x < 600) return '冬木 · 圆藏山参道';
    if (p.y > 1020 && p.x < 1120) return '冬木 · 深山町洋馆丘陵';
    if (p.y > 980 && p.x > 1120) return '冬木 · 深山商店街';
    return p.y < 740 ? '冬木 · 深山町住宅坂' : '冬木 · 深山町';
  }
  if (p.x < 1775)
    return p.y < 1150 ? '冬木 · 冬木大桥' : '冬木 · 南桥（日常分支）';
  if (p.y < 670) return '冬木 · 新都教会丘陵';
  if (p.x > 2320 && p.y < 1000) return '冬木 · 新都中央公园周边';
  if (p.y < 1200)
    return p.x < 2050 ? '冬木 · 新都河岸公园' : '冬木 · 新都住宅区';
  return '冬木 · 新都商业街';
}
