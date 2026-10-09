import type { SamplePoint } from './fate-art-sample';

/** The returning street closes the block. All cameras use these same world
 * coordinates; neither the painting nor a cut is a teleport destination. */
const centers = [
  [924.0947741909217, -250.08901037717055],
  [1060, -365],
  [1290, -375],
  [1530, -215],
  [1740, 25],
  [1720, 215],
  [1535, 382],
] as const;
const worldPairs: SamplePoint[] = centers.flatMap(([x, y], i) => {
  if (i === 0)
    return [
      { x: 932.525422466281, y: -246.24564032783746 },
      { x: 915.6641259155626, y: -253.93238042650358 },
    ];
  if (i === centers.length - 1)
    return [
      { x: 1525, y: 348 },
      { x: 1545, y: 416 },
    ];
  const before = centers[i - 1],
    after = centers[i + 1];
  const dx = after[0] - before[0],
    dy = after[1] - before[1],
    length = Math.hypot(dx, dy);
  const nx = (-dy / length) * 42,
    ny = (dx / length) * 42;
  return [
    { x: x + nx, y: y + ny },
    { x: x - nx, y: y - ny },
  ];
});
const overview = [
  [24, 744],
  [1660, 920],
  [250, 654],
  [1660, 780],
  [500, 530],
  [1630, 635],
  [820, 443],
  [1560, 570],
  [1050, 354],
  [1450, 440],
  [1230, 267],
  [1390, 302],
  [1390, 170],
  [1460, 202],
] as const;
const along = [
  [18, 688],
  [1660, 922],
  [240, 624],
  [1660, 806],
  [500, 548],
  [1615, 685],
  [810, 438],
  [1540, 593],
  [1035, 363],
  [1420, 457],
  [1210, 292],
  [1350, 330],
  [1300, 261],
  [1340, 281],
] as const;
const eye = [
  [18, 772],
  [1660, 923],
  [240, 705],
  [1660, 844],
  [500, 621],
  [1615, 751],
  [810, 534],
  [1540, 679],
  [1035, 477],
  [1415, 575],
  [1190, 437],
  [1300, 485],
  [1260, 422],
  [1300, 440],
] as const;

export const SLOPE_TRIANGLES: readonly (readonly [number, number, number])[] =
  Array.from({ length: centers.length - 1 }, (_, i) => [
    [i * 2, i * 2 + 2, i * 2 + 1] as const,
    [i * 2 + 1, i * 2 + 2, i * 2 + 3] as const,
  ]).flat();
const p = ([x, y]: readonly [number, number]) => ({ x, y });
const localPairs = overview.map(p);

function compile(from: readonly SamplePoint[], to: readonly SamplePoint[]) {
  return SLOPE_TRIANGLES.map(([i, j, k]) => {
    const a = from[i],
      b = from[j],
      c = from[k];
    const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return {
      wx: (b.y - c.y) / area,
      wy: (c.x - b.x) / area,
      w0: (b.x * c.y - b.y * c.x) / area,
      vx: (c.y - a.y) / area,
      vy: (a.x - c.x) / area,
      v0: (c.x * a.y - c.y * a.x) / area,
      a: to[i],
      b: to[j],
      c: to[k],
      progress: [
        Math.floor(i / 2) / 6,
        Math.floor(j / 2) / 6,
        Math.floor(k / 2) / 6,
      ],
    };
  });
}
const forward = compile(worldPairs, localPairs),
  inverse = compile(localPairs, worldPairs);
function map(point: SamplePoint, triangles: ReturnType<typeof compile>) {
  let best = Infinity,
    value = { x: 0, y: 0 },
    progress = 0;
  for (const t of triangles) {
    const w = t.wx * point.x + t.wy * point.y + t.w0;
    const v = t.vx * point.x + t.vy * point.y + t.v0,
      u = 1 - w - v;
    const penalty = Math.max(0, -w) + Math.max(0, -v) + Math.max(0, -u);
    if (penalty < best) {
      best = penalty;
      value = {
        x: t.a.x * w + t.b.x * v + t.c.x * u,
        y: t.a.y * w + t.b.y * v + t.c.y * u,
      };
      progress = t.progress[0] * w + t.progress[1] * v + t.progress[2] * u;
      if (best < 1e-9) break;
    }
  }
  return { value, inside: best < 1e-8, progress };
}
export const slopePoint = (world: SamplePoint) => map(world, forward).value;
export const slopeWorld = (local: SamplePoint) => map(local, inverse).value;
export const slopeProgress = (world: SamplePoint) =>
  map(world, forward).progress;
export const SLOPE_CENTER = slopeWorld({ x: 1040, y: 580 });
export const SLOPE_ENDS = [
  { x: centers[0][0], y: centers[0][1] },
  { x: centers[6][0], y: centers[6][1] },
] as const;

export const SLOPE_FLOORS = {
  slope: [
    [30, 744],
    [248, 660],
    [475, 574],
    [505, 548],
    [547, 543],
    [576, 548],
    [820, 462],
    [1045, 374],
    [1248, 278],
    [1370, 152],
    [1466, 198],
    [1370, 337],
    [1345, 436],
    [1400, 547],
    [1515, 608],
    [1530, 669],
    [1590, 753],
    [1640, 791],
    [1660, 920],
    [960, 920],
    [30, 920],
  ],
  'slope-along': [
    [20, 688],
    [260, 617],
    [452, 559],
    [504, 539],
    [565, 524],
    [811, 446],
    [1033, 367],
    [1216, 293],
    [1280, 245],
    [1350, 288],
    [1304, 363],
    [1303, 425],
    [1319, 482],
    [1391, 574],
    [1485, 638],
    [1555, 722],
    [1640, 814],
    [1660, 921],
    [20, 921],
  ],
  'slope-eye': [
    [20, 772],
    [248, 700],
    [456, 643],
    [502, 620],
    [557, 611],
    [809, 542],
    [1033, 478],
    [1193, 436],
    [1250, 413],
    [1305, 445],
    [1253, 508],
    [1260, 566],
    [1335, 647],
    [1444, 721],
    [1560, 831],
    [1660, 923],
    [20, 923],
  ],
} as const;
export function onSlopePaving(local: SamplePoint) {
  return slopePolygonContains(local, SLOPE_FLOORS.slope.map(p));
}
export function onSlopeWorld(world: SamplePoint) {
  const local = map(world, forward);
  return local.inside && onSlopePaving(local.value);
}
export function slopePolygonContains(
  point: SamplePoint,
  polygon: readonly SamplePoint[],
) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export const SLOPE_WORLD_PAVING = SLOPE_TRIANGLES.map((triangle) =>
  triangle.map((i) => worldPairs[i]),
);
// A straight painted centreline bends at the world-registration diagonals.
// Retain those bends as navigation points; a straight world chord can hit the
// inside curb even though both of its endpoints are on the road.
const guide = centers.map((_, i) => ({
  x: (localPairs[i * 2].x + localPairs[i * 2 + 1].x) / 2,
  y: (localPairs[i * 2].y + localPairs[i * 2 + 1].y) / 2,
}));
export const SLOPE_GUIDE = guide.flatMap((a, index) => {
  if (!index) return [slopeWorld(a)];
  const before = guide[index - 1],
    dx = a.x - before.x,
    dy = a.y - before.y;
  const left = localPairs[index * 2],
    right = localPairs[index * 2 - 1];
  const ex = right.x - left.x,
    ey = right.y - left.y;
  const det = dx * ey - dy * ex;
  const ox = left.x - before.x,
    oy = left.y - before.y;
  const t = (ox * ey - oy * ex) / det;
  return [
    slopeWorld({ x: before.x + dx * t, y: before.y + dy * t }),
    slopeWorld(a),
  ];
});
export const SLOPE_JUNCTIONS = [
  ...SLOPE_GUIDE,
  ...[
    [530, 553],
    [1450, 634],
  ].map(([x, y]) => slopeWorld({ x, y })),
];
export const SLOPE_PLACES = [
  {
    id: 'slope-home',
    name: '榉树庭院门前',
    point: slopeWorld({ x: 531, y: 560 }),
    description: '榉树的细碎叶影落在灰白院墙上，绣球花沿门边开放。',
  },
  {
    id: 'bakery',
    name: '坡道面包店',
    point: slopeWorld({ x: 1450, y: 638 }),
    description: '陶红色布棚下的木门透出烤面包的暖香，白茉莉藏在门边的花盆里。',
  },
] as const;
export const SLOPE_REGISTRATION = {
  slope: overview.map(([x, y], i) => [x, y, ...overview[i]] as const),
  'slope-along': overview.map(([x, y], i) => [x, y, ...along[i]] as const),
  'slope-eye': overview.map(([x, y], i) => [x, y, ...eye[i]] as const),
};
