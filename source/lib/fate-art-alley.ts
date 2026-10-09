import type { SamplePoint } from './fate-art-sample';
import { slopePoint, slopeWorld, onSlopePaving } from './fate-art-extension';

/** Authored views of one connected neighborhood. Positions stay in one world. */
export const SAMPLE_SCENES = [
  'street',
  'alley',
  'neighborhood',
  'slope',
] as const;
export type SampleScene = (typeof SAMPLE_SCENES)[number];
export const ALLEY_PAINTING = '/fate/art-sample/cafe-alley-facing-v4.png';
export const NEIGHBORHOOD_PAINTING = '/fate/art-sample/leafy-lane-v4.png';
const worldOrigin = { x: 1114, y: 391 };
const paintedOrigin = { x: 840, y: 815 };
const worldLength = Math.hypot(56, 63);
const forward = { x: -56 / worldLength, y: -63 / worldLength };
const right = { x: -forward.y, y: forward.x };
const paintedForward = { x: 0.13, y: -Math.sqrt(1 - 0.13 ** 2) };
const paintedRight = { x: -paintedForward.y, y: paintedForward.x };
export const ALLEY_PAINT_SCALE = 2.55;

/** Camera-facing coordinates, not a new character or a teleport destination. */
export function sampleAlleyPoint(point: SamplePoint): SamplePoint {
  const dx = point.x - worldOrigin.x;
  const dy = point.y - worldOrigin.y;
  const along = (dx * forward.x + dy * forward.y) * ALLEY_PAINT_SCALE;
  const across = (dx * right.x + dy * right.y) * ALLEY_PAINT_SCALE;
  return {
    x: paintedOrigin.x + along * paintedForward.x + across * paintedRight.x,
    y: paintedOrigin.y + along * paintedForward.y + across * paintedRight.y,
  };
}

export function sampleAlleyWorld(point: SamplePoint): SamplePoint {
  const dx = point.x - paintedOrigin.x;
  const dy = point.y - paintedOrigin.y;
  const along =
    (dx * paintedForward.x + dy * paintedForward.y) / ALLEY_PAINT_SCALE;
  const across =
    (dx * paintedRight.x + dy * paintedRight.y) / ALLEY_PAINT_SCALE;
  return {
    x: worldOrigin.x + along * forward.x + across * right.x,
    y: worldOrigin.y + along * forward.y + across * right.y,
  };
}

// Keep feet away from the bicycle, pots, fences and the far garden. The art's
// visible paving is wider than this conservative walking corridor.
export const ALLEY_PAVING: readonly SamplePoint[] = [
  { x: 555, y: 920 },
  { x: 557, y: 850 },
  { x: 682, y: 565 },
  { x: 785, y: 330 },
  { x: 881, y: 266 },
  { x: 943, y: 241 },
  { x: 992, y: 200 },
  { x: 1010, y: 205 },
  { x: 1020, y: 240 },
  { x: 993, y: 280 },
  { x: 981, y: 375 },
  { x: 1031, y: 602 },
  { x: 1133, y: 845 },
  { x: 1160, y: 920 },
];

function onPolygon(point: SamplePoint, polygon: readonly SamplePoint[]) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cross) < 0.0001 &&
      point.x >= Math.min(a.x, b.x) &&
      point.x <= Math.max(a.x, b.x) &&
      point.y >= Math.min(a.y, b.y) &&
      point.y <= Math.max(a.y, b.y)
    )
      return true;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

export function onAlleyPaving(point: SamplePoint) {
  return onPolygon(point, ALLEY_PAVING);
}

const neighborhoodEntrance = { x: 875, y: 875 };
const alleyExit = { x: 992, y: 212 };
const neighborhoodScale = 0.75;

export function sampleNeighborhoodPoint(world: SamplePoint): SamplePoint {
  const alley = sampleAlleyPoint(world);
  return {
    x: neighborhoodEntrance.x + (alley.x - alleyExit.x) * neighborhoodScale,
    y: neighborhoodEntrance.y + (alley.y - alleyExit.y) * neighborhoodScale,
  };
}

export function sampleNeighborhoodWorld(point: SamplePoint): SamplePoint {
  return sampleAlleyWorld({
    x: alleyExit.x + (point.x - neighborhoodEntrance.x) / neighborhoodScale,
    y: alleyExit.y + (point.y - neighborhoodEntrance.y) / neighborhoodScale,
  });
}

// Traced conservatively on the complete new painting. The bench, hedges,
// cafe bicycle, roofs and garden interiors are outside the walking surface.
export const NEIGHBORHOOD_PAVING: readonly (readonly SamplePoint[])[] = [
  [
    { x: 676, y: 938 },
    { x: 722, y: 620 },
    { x: 743, y: 574 },
    { x: 874, y: 510 },
    { x: 946, y: 524 },
    { x: 1036, y: 740 },
    { x: 1082, y: 938 },
  ],
  [
    { x: 190, y: 490 },
    { x: 1610, y: 170 },
    { x: 1650, y: 175 },
    { x: 1650, y: 270 },
    { x: 1510, y: 320 },
    { x: 1350, y: 370 },
    { x: 1120, y: 455 },
    { x: 946, y: 524 },
    { x: 743, y: 574 },
    { x: 680, y: 570 },
    { x: 530, y: 585 },
    { x: 425, y: 590 },
    { x: 335, y: 560 },
    { x: 240, y: 530 },
  ],
  [
    { x: 270, y: 430 },
    { x: 343, y: 403 },
    { x: 400, y: 435 },
    { x: 338, y: 463 },
  ],
  [
    { x: 715, y: 305 },
    { x: 815, y: 283 },
    { x: 844, y: 356 },
    { x: 742, y: 380 },
  ],
  [
    { x: 1100, y: 445 },
    { x: 1140, y: 435 },
    { x: 1160, y: 513 },
    { x: 1162, y: 542 },
    { x: 1254, y: 565 },
    { x: 1316, y: 549 },
    { x: 1350, y: 577 },
    { x: 1290, y: 619 },
    { x: 1200, y: 589 },
    { x: 1120, y: 549 },
  ],
];

export function onNeighborhoodPaving(point: SamplePoint) {
  return NEIGHBORHOOD_PAVING.some((polygon) => onPolygon(point, polygon));
}

/** The facing paintings include open foreground between the left street arm
 * and the entrance. Only that continuation can extend the overview outline;
 * building fronts and the right-hand garden pocket retain their old bounds.
 * Each facing painting still supplies its independent wall/prop collision. */
export function onNeighborhoodRoadForeground(point: SamplePoint) {
  return onPolygon(point, [
    { x: 190, y: 490 },
    { x: 946, y: 524 },
    { x: 1082, y: 938 },
    { x: 190, y: 938 },
  ]);
}

export const NEIGHBORHOOD_WORLD_PAVING = NEIGHBORHOOD_PAVING.map((polygon) =>
  polygon.flatMap((point, i) => {
    const next = polygon[(i + 1) % polygon.length];
    const clipped = point.y <= 882 ? [point] : [];
    if (point.y <= 882 !== next.y <= 882) {
      const t = (882 - point.y) / (next.y - point.y);
      clipped.push({ x: point.x + (next.x - point.x) * t, y: 882 });
    }
    return clipped.map(sampleNeighborhoodWorld);
  }),
);

export const NEIGHBORHOOD_PLACES = [
  {
    id: 'lane-home',
    name: '支路住宅门前',
    point: sampleNeighborhoodWorld({ x: 785, y: 332 }),
    description: '院门藏在蓝瓦与枝叶下，石板步道接着街边的人行道。',
  },
  {
    id: 'corner-shop',
    name: '支路街角店',
    point: sampleNeighborhoodWorld({ x: 340, y: 437 }),
    description: '雨棚遮着门前石板，暖灯和自行车让这处街角有了生活气息。',
  },
  {
    id: 'bench',
    name: '树下长椅',
    point: sampleNeighborhoodWorld({ x: 1270, y: 578 }),
    description: '长椅边有一小块铺石空地，走进来可以看树影与远处的住宅。',
  },
] as const;

export const NEIGHBORHOOD_CENTER = sampleNeighborhoodWorld({ x: 865, y: 481 });
export const NEIGHBORHOOD_JUNCTIONS = [
  { x: 875, y: 888 },
  { x: 875, y: 800 },
  { x: 865, y: 660 },
  { x: 865, y: 550 },
  { x: 865, y: 481 },
  { x: 750, y: 350 },
  { x: 785, y: 372 },
  { x: 520, y: 482 },
  { x: 340, y: 437 },
  { x: 366, y: 459 },
  { x: 1140, y: 420 },
  { x: 1137, y: 475 },
  { x: 1148, y: 535 },
  { x: 1200, y: 562 },
  { x: 1270, y: 578 },
  { x: 1400, y: 304 },
].map(sampleNeighborhoodWorld);

export function sampleScenePoint(point: SamplePoint, scene: SampleScene) {
  if (scene === 'slope') return slopePoint(point);
  return scene === 'street'
    ? point
    : scene === 'alley'
      ? sampleAlleyPoint(point)
      : sampleNeighborhoodPoint(point);
}

export function sampleSceneWorld(point: SamplePoint, scene: SampleScene) {
  if (scene === 'slope') return slopeWorld(point);
  return scene === 'street'
    ? point
    : scene === 'alley'
      ? sampleAlleyWorld(point)
      : sampleNeighborhoodWorld(point);
}

export function onSideScenePaving(point: SamplePoint, scene: SampleScene) {
  if (scene === 'slope') return onSlopePaving(point);
  return scene === 'alley' ? onAlleyPaving(point) : onNeighborhoodPaving(point);
}

export function sampleSceneIndex(scene: SampleScene) {
  return SAMPLE_SCENES.indexOf(scene);
}

// The original entrance supplies the overlap. New ground starts behind that
// entrance, so a street click cannot shortcut through an unseen garden.
const paintedWorld = ALLEY_PAVING.map(sampleAlleyWorld);
export const ALLEY_WORLD_PAVING: readonly SamplePoint[] = paintedWorld.flatMap(
  (p, i) => {
    const next = paintedWorld[(i + 1) % paintedWorld.length];
    const result: SamplePoint[] = p.y <= 388 ? [p] : [];
    if (p.y <= 388 !== next.y <= 388) {
      const t = (388 - p.y) / (next.y - p.y);
      result.push({ x: p.x + (next.x - p.x) * t, y: 388 });
    }
    return result;
  },
);

export const ALLEY_AHEAD = sampleAlleyWorld({ x: 950, y: 275 });
export const ALLEY_JUNCTIONS = [
  paintedOrigin,
  { x: 870, y: 620 },
  { x: 898, y: 410 },
  { x: 926, y: 315 },
  { x: 950, y: 275 },
].map(sampleAlleyWorld);

/** Hysteresis keeps stopping or turning around at the threshold from flashing. */
export function sampleAlleyScene(
  scene: SampleScene,
  point: SamplePoint,
): SampleScene {
  if (!onAlleyPaving(sampleAlleyPoint(point))) return 'street';
  if (scene === 'alley') return point.y > 416 ? 'street' : 'alley';
  return point.y < 388 ? 'alley' : 'street';
}

export function sampleViewWalkScale(blend: number) {
  const amount = Math.max(0, Math.min(2, blend));
  return amount <= 1
    ? 1 + (ALLEY_PAINT_SCALE - 1) * amount
    : ALLEY_PAINT_SCALE * (1 - (1 - neighborhoodScale) * (amount - 1));
}

export function sampleConnectedScene(
  scene: SampleScene,
  world: SamplePoint,
): SampleScene {
  const alley = sampleAlleyPoint(world);
  if (
    onNeighborhoodPaving(sampleNeighborhoodPoint(world)) &&
    alley.y < (scene === 'neighborhood' ? 245 : 222)
  )
    return 'neighborhood';
  return sampleAlleyScene(scene === 'neighborhood' ? 'alley' : scene, world);
}

/** A brief, fully covered cut avoids double-exposed houses or a visible snap. */
export function sampleSceneTransition(blend: number) {
  const amount = Math.max(0, Math.min(2, blend));
  const progress = amount - Math.floor(amount);
  const ease = (value: number) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  return {
    scene: SAMPLE_SCENES[Math.round(amount)],
    cover: Math.min(
      ease((progress - 0.15) / 0.28),
      ease((0.9 - progress) / 0.33),
    ),
  };
}

/** Side facades have modest depth; the center passage is always level. */
export function alleyPaintedHeight(point: SamplePoint) {
  if (onAlleyPaving(point)) return 0;
  return sideFacadeHeight(point, [ALLEY_PAVING]);
}

export function neighborhoodPaintedHeight(point: SamplePoint) {
  if (onNeighborhoodPaving(point)) return 0;
  // The far-side frontage is one continuous affine plane. Taking the minimum
  // of disconnected doorway/pocket polygons creates depth cliffs and folds
  // a painted storefront into stripes when looking sideways.
  const frontage = 545 - point.x * 0.25;
  const facade =
    Math.max(0, frontage - point.y) / (100 * Math.cos((40 * Math.PI) / 180));
  const nearRoof = Math.max(0, point.y - (760 - point.x * 0.2)) * 0.004;
  let distance = Infinity;
  for (const polygon of NEIGHBORHOOD_PAVING)
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
        ),
      );
      distance = Math.min(
        distance,
        Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy),
      );
    }
  return Math.min(Math.max(facade, nearRoof), distance * 0.018);
}

function sideFacadeHeight(
  point: SamplePoint,
  polygons: readonly (readonly SamplePoint[])[],
) {
  let frontage = 941;
  for (const polygon of polygons)
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      if (
        a.x === b.x ||
        point.x < Math.min(a.x, b.x) ||
        point.x > Math.max(a.x, b.x)
      )
        continue;
      const t = (point.x - a.x) / (b.x - a.x);
      frontage = Math.min(frontage, a.y + (b.y - a.y) * t);
    }
  return (
    Math.max(0, frontage - point.y) / (100 * Math.cos((40 * Math.PI) / 180))
  );
}
