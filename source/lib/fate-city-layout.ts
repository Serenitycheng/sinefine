// One road geometry drives drawing, collision, walking and nearby conversation.
// Distances are compressed for play; the arrangement follows district relations.
export type CityPoint = { x: number; y: number };
export type CityRoad = {
  id: string;
  name: string;
  width: number;
  kind: 'lane' | 'avenue' | 'hill' | 'bridge';
  points: readonly CityPoint[];
};
export const CITY_SIZE = { width: 3100, height: 1660 };
const road = (
  id: string,
  name: string,
  width: number,
  kind: CityRoad['kind'],
  points: number[][],
): CityRoad => ({
  id,
  name,
  width,
  kind,
  points: points.map(([x, y]) => ({ x, y })),
});

export const CITY_ROADS: readonly CityRoad[] = [
  // Preserve the established Emiya-home and school entrance coordinates.
  road('school-slope', '学园通学坡道', 80, 'hill', [
    [890.5, 440],
    [890.5, 495],
    [890.5, 650],
    [890.5, 760],
    [890.5, 907.5],
  ]),
  road('residential-slope', '深山住宅坂', 110, 'lane', [
    [420, 320],
    [470, 390],
    [535, 450],
    [720, 485],
    [890.5, 495],
    [1060, 585],
    [1180, 680],
    [1240, 740],
    [1160, 840],
  ]),
  road('old-lanes', '深山旧街巷', 100, 'lane', [
    [470, 390],
    [405, 515],
    [410, 650],
    [270, 780],
    [350, 905],
    [520, 950],
    [620, 1050],
    [620, 1160],
  ]),
  road('school-junction', '深山中心交叉口', 112, 'lane', [
    [890.5, 760],
    [1020, 810],
    [1160, 840],
  ]),
  road('bridge-approach', '冬木大桥西引道', 120, 'avenue', [
    [1160, 840],
    [1300, 905],
    [1500, 907],
  ]),
  road('fuyuki-bridge', '冬木大桥', 95, 'bridge', [
    [1500, 907],
    [1770, 907],
  ]),
  road('bridge-east', '冬木大桥东引道', 120, 'avenue', [
    [1770, 907],
    [1880, 907],
  ]),
  road('mount-miyama', '深山商店街', 120, 'lane', [
    [1160, 840],
    [1320, 1000],
    [1240, 1080],
    [1230, 1165],
    [1310, 1280],
    [1450, 1375],
    [1500, 1375],
  ]),
  road('estate-lane', '洋馆丘陵小路', 110, 'hill', [
    [620, 1160],
    [790, 1210],
    [960, 1200],
    [1120, 1130],
    [1240, 1080],
  ]),
  road('temple-path', '圆藏山参道', 85, 'hill', [
    [620, 1160],
    [535, 1270],
    [390, 1330],
    [330, 1430],
    [260, 1480],
  ]),
  road('west-residential', '深山西住宅巷', 105, 'lane', [
    [350, 905],
    [290, 1015],
    [310, 1100],
    [430, 1150],
    [620, 1160],
  ]),
  // The second crossing belongs to this project's daily-life adaptation.
  road('south-bridge', '南桥 · 日常分支', 100, 'bridge', [
    [1500, 1375],
    [1770, 1375],
  ]),
  road('riverside', '新都河岸步道', 95, 'lane', [
    [2010, 330],
    [1880, 430],
    [1840, 650],
    [1880, 907],
    [1860, 1070],
    [1900, 1220],
    [1840, 1375],
    [1770, 1375],
  ]),
  road('shinto-main', '新都主街', 135, 'avenue', [
    [1880, 907],
    [2120, 935],
    [2290, 1000],
    [2460, 1020],
    [2670, 950],
    [2880, 950],
  ]),
  road('station-avenue', '新都站前街', 120, 'avenue', [
    [2120, 935],
    [2140, 1170],
    [2180, 1330],
    [2465, 1392.6],
    [2700, 1370],
    [2910, 1240],
  ]),
  road('church-slope', '教会丘陵路', 120, 'hill', [
    [2290, 1000],
    [2250, 830],
    [2360, 680],
    [2580, 630],
    [2703, 495],
    [2840, 440],
  ]),
  road('shinto-north', '新都北街', 100, 'avenue', [
    [1880, 430],
    [2170, 465],
    [2350, 520],
    [2580, 630],
  ]),
  road('central-park', '中央公园外沿', 100, 'lane', [
    [2360, 680],
    [2570, 780],
    [2670, 950],
  ]),
  road('shinto-residential', '新都住宅街', 100, 'lane', [
    [2460, 1020],
    [2450, 1160],
    [2465, 1392.6],
  ]),
];
export type CitySegment = {
  a: CityPoint;
  b: CityPoint;
  radius: number;
  road: CityRoad;
};
export const CITY_SEGMENTS: CitySegment[] = CITY_ROADS.flatMap((r) =>
  r.points
    .slice(1)
    .map((b, i) => ({ a: r.points[i], b, radius: r.width / 2, road: r })),
);

export function projectOnSegment(p: CityPoint, a: CityPoint, b: CityPoint) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return { x: a.x + t * dx, y: a.y + t * dy };
}
export function onCitySegment(p: CityPoint, s: CitySegment) {
  const q = projectOnSegment(p, s.a, s.b);
  return Math.hypot(p.x - q.x, p.y - q.y) <= s.radius + 1e-7;
}
export function cityWalkable(p: CityPoint) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    CITY_SEGMENTS.some((s) => onCitySegment(p, s))
  );
}
// A capsule is convex. Sharing one guarantees that the complete sightline is
// pavement, including on diagonals, with no shortcut through a house or river.
export function shareCityPavement(a: CityPoint, b: CityPoint) {
  return CITY_SEGMENTS.some((s) => onCitySegment(a, s) && onCitySegment(b, s));
}
export function closestCityPavement(p: CityPoint): CityPoint {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
    return { x: 1160, y: 840 };
  let best = { x: 1160, y: 840 },
    distance = Infinity;
  for (const s of CITY_SEGMENTS) {
    const q = projectOnSegment(p, s.a, s.b),
      d = Math.hypot(p.x - q.x, p.y - q.y);
    const gap = Math.max(0, d - s.radius);
    if (gap < distance) {
      const scale = d ? Math.min(1, s.radius / d) : 1;
      best = { x: q.x + (p.x - q.x) * scale, y: q.y + (p.y - q.y) * scale };
      distance = gap;
    }
  }
  return best;
}
export function closestSegmentPair(
  a: CitySegment,
  b: CitySegment,
): [CityPoint, CityPoint] {
  const ax = a.b.x - a.a.x,
    ay = a.b.y - a.a.y;
  const bx = b.b.x - b.a.x,
    by = b.b.y - b.a.y;
  const cross = ax * by - ay * bx;
  if (Math.abs(cross) > 1e-8) {
    const dx = b.a.x - a.a.x,
      dy = b.a.y - a.a.y;
    const t = (dx * by - dy * bx) / cross,
      u = (dx * ay - dy * ax) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const p = { x: a.a.x + t * ax, y: a.a.y + t * ay };
      return [p, p];
    }
  }
  return [
    [a.a, projectOnSegment(a.a, b.a, b.b)],
    [a.b, projectOnSegment(a.b, b.a, b.b)],
    [projectOnSegment(b.a, a.a, a.b), b.a],
    [projectOnSegment(b.b, a.a, a.b), b.b],
  ].sort(
    (p, q) =>
      Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) -
      Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y),
  )[0] as [CityPoint, CityPoint];
}
export function cityJunctions() {
  const points = CITY_ROADS.flatMap((r) => [...r.points]);
  for (let i = 0; i < CITY_SEGMENTS.length; i++)
    for (let j = i + 1; j < CITY_SEGMENTS.length; j++) {
      const a = CITY_SEGMENTS[i],
        b = CITY_SEGMENTS[j],
        [p, q] = closestSegmentPair(a, b);
      if (Math.hypot(p.x - q.x, p.y - q.y) > a.radius + b.radius) continue;
      const t = a.radius / (a.radius + b.radius);
      points.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  return points.filter(
    (p, i) =>
      !points.slice(0, i).some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1),
  );
}

export function cityRoadTouchesRect(
  left: number,
  right: number,
  top: number,
  bottom: number,
  margin = 12,
) {
  const corners = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
  return CITY_SEGMENTS.some((s) => {
    if (
      [s.a, s.b].some(
        (p) => p.x >= left && p.x <= right && p.y >= top && p.y <= bottom,
      )
    )
      return true;
    return corners.some((p, i) => {
      const [a, b] = closestSegmentPair(s, {
        a: p,
        b: corners[(i + 1) % 4],
        radius: 0,
        road: s.road,
      });
      return Math.hypot(a.x - b.x, a.y - b.y) < s.radius + margin;
    });
  });
}
