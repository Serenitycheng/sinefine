import {
  ALLEY_JUNCTIONS,
  ALLEY_WORLD_PAVING,
  NEIGHBORHOOD_JUNCTIONS,
  NEIGHBORHOOD_WORLD_PAVING,
  NEIGHBORHOOD_PLACES,
} from './fate-art-alley';

/** A connected painted art study. Its coordinates never enter the game's saves. */
export type SamplePoint = { x: number; y: number };
export type SampleDirection = 'down' | 'left' | 'right' | 'up';
export type SampleCamera = SamplePoint & { scale: number };

export const ART_SAMPLE = {
  width: 1672,
  height: 941,
  background: '/fate/art-sample/residential-cafe-v5.png',
  sprite: '/fate/art-sample/illya-walk-v1.png',
  start: { x: 832, y: 566 },
  walkSpeed: 66,
  stride: 70,
} as const;

// Entrance coordinates shared by the street painting and the alley-facing view.
export const SAMPLE_ALLEY = {
  mouth: { x: 1118, y: 427 },
  bend: { x: 1114, y: 391 },
  inside: { x: 1058, y: 328 },
  street: { x: 992, y: 490 },
} as const;

// Foot positions traced on this painting, including the paving in front of doors.
// Roofs, plants, bicycles and courtyard walls are outside the navigable surface.
export const SAMPLE_STREET_GROUND: readonly (readonly SamplePoint[])[] = [
  [
    { x: 120, y: 696 },
    { x: 1618, y: 285 },
    { x: 1640, y: 420 },
    { x: 1450, y: 467 },
    { x: 1260, y: 528 },
    { x: 1140, y: 582 },
    { x: 1000, y: 614 },
    { x: 910, y: 636 },
    { x: 850, y: 632 },
    { x: 790, y: 653 },
    { x: 700, y: 694 },
    { x: 335, y: 757 },
    { x: 307, y: 732 },
    { x: 154, y: 770 },
    { x: 111, y: 728 },
  ],
  [
    { x: 484, y: 558 },
    { x: 576, y: 535 },
    { x: 605, y: 574 },
    { x: 490, y: 610 },
  ],
  [
    { x: 1283, y: 350 },
    { x: 1372, y: 311 },
    { x: 1434, y: 330 },
    { x: 1455, y: 369 },
    { x: 1306, y: 414 },
  ],
  [
    { x: 1025, y: 294 },
    { x: 1047, y: 290 },
    { x: 1158, y: 369 },
    { x: 1170, y: 398 },
    { x: 1141, y: 451 },
    { x: 1082, y: 469 },
    { x: 1071, y: 416 },
    { x: 1040, y: 391 },
    { x: 1042, y: 358 },
    { x: 1010, y: 325 },
  ],
];

export const SAMPLE_GROUND: readonly (readonly SamplePoint[])[] = [
  ...SAMPLE_STREET_GROUND,
  ALLEY_WORLD_PAVING,
  ...NEIGHBORHOOD_WORLD_PAVING,
];

export const SAMPLE_PLACES = [
  {
    id: 'home',
    name: '住宅门前',
    point: { x: 545, y: 568 },
    description: '树影越过院墙，落在石阶和木门上。',
  },
  {
    id: 'cafe',
    name: '街角咖啡店',
    point: { x: 1360, y: 351 },
    description: '蓝灰色雨棚下，暖光照着木质门框。',
  },
] as const;
export type SamplePlace =
  | (typeof SAMPLE_PLACES)[number]
  | (typeof NEIGHBORHOOD_PLACES)[number];

const JUNCTIONS: readonly SamplePoint[] = [
  { x: 235, y: 690 },
  { x: 545, y: 598 },
  ART_SAMPLE.start,
  SAMPLE_ALLEY.mouth,
  SAMPLE_ALLEY.bend,
  SAMPLE_ALLEY.inside,
  SAMPLE_ALLEY.street,
  { x: 1360, y: 383 },
  { x: 1480, y: 377 },
  ...SAMPLE_PLACES.map((place) => place.point),
  { x: 1076, y: 395 },
  { x: 1047, y: 365 },
  ...ALLEY_JUNCTIONS,
  ...NEIGHBORHOOD_JUNCTIONS,
  ...NEIGHBORHOOD_PLACES.map((place) => place.point),
];

export function sampleDistance(a: SamplePoint, b: SamplePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function inPolygon(point: SamplePoint, polygon: readonly SamplePoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cross) < 0.01 &&
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

export function onSampleStreetGround(point: SamplePoint) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    SAMPLE_STREET_GROUND.some((polygon) => inPolygon(point, polygon))
  );
}

export function onSampleGround(point: SamplePoint) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    SAMPLE_GROUND.some((polygon) => inPolygon(point, polygon))
  );
}

export function sampleSegmentClear(from: SamplePoint, to: SamplePoint) {
  if (!onSampleGround(from) || !onSampleGround(to)) return false;
  const delta = { x: to.x - from.x, y: to.y - from.y };
  const crossings = [0, 1];
  // Trace each boundary, rather than sampling every few pixels. At narrow
  // gates a sampled segment can miss a tiny wall gap and choose a stuck path.
  for (const polygon of SAMPLE_GROUND)
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const edge = { x: b.x - a.x, y: b.y - a.y };
      const det = delta.x * edge.y - delta.y * edge.x;
      if (Math.abs(det) < 1e-10) continue;
      const offset = { x: a.x - from.x, y: a.y - from.y };
      const t = (offset.x * edge.y - offset.y * edge.x) / det;
      const u = (offset.x * delta.y - offset.y * delta.x) / det;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) crossings.push(t);
    }
  crossings.sort((a, b) => a - b);
  return crossings.slice(1).every((value, i) => {
    const t = (value + crossings[i]) / 2;
    return onSampleGround({ x: from.x + delta.x * t, y: from.y + delta.y * t });
  });
}

/** Visibility routing uses the same painted surface as keyboard movement. */
export function sampleRoute(
  from: SamplePoint,
  to: SamplePoint,
  constraints?: {
    allowed: (point: SamplePoint) => boolean;
    clear: (from: SamplePoint, to: SamplePoint) => boolean;
    cost?: (from: SamplePoint, to: SamplePoint) => number;
    junctions?: readonly SamplePoint[];
    onlyJunctions?: boolean;
  },
): SamplePoint[] | null {
  const allowed = constraints?.allowed ?? onSampleGround;
  const clear = constraints?.clear ?? sampleSegmentClear;
  if (!allowed(from) || !allowed(to)) return null;
  if (clear(from, to)) return [{ ...to }];
  const nodes = [
    from,
    to,
    ...[
      ...(constraints?.onlyJunctions ? [] : JUNCTIONS),
      ...(constraints?.junctions ?? []),
    ].filter(allowed),
  ];
  const costs = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const seen = new Set<number>();
  costs[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!seen.has(i) && (current < 0 || costs[i] < costs[current]))
        current = i;
    }
    if (current < 0 || !Number.isFinite(costs[current])) break;
    if (current === 1) {
      const path: SamplePoint[] = [];
      for (let i = 1; i !== 0; i = previous[i]) path.unshift({ ...nodes[i] });
      return path;
    }
    seen.add(current);
    for (let next = 0; next < nodes.length; next++) {
      if (seen.has(next) || !clear(nodes[current], nodes[next])) continue;
      const cost =
        costs[current] +
        (constraints?.cost ?? sampleDistance)(nodes[current], nodes[next]);
      if (cost < costs[next]) {
        costs[next] = cost;
        previous[next] = current;
      }
    }
  }
  return null;
}

/** Round visible path corners only when the entire curve stays on paving. */
export function softenSampleRoute(
  from: SamplePoint,
  path: SamplePoint[],
  clear = sampleSegmentClear,
) {
  const rounded: SamplePoint[] = [];
  let previous = from;
  for (let i = 0; i < path.length; i++) {
    const corner = path[i];
    const after = path[i + 1];
    const incoming = sampleDistance(previous, corner);
    const outgoing = after ? sampleDistance(corner, after) : 0;
    let curve: SamplePoint[] | null = null;
    let radius = Math.min(26, incoming * 0.35, outgoing * 0.35);
    while (after && radius >= 2) {
      const entry = {
        x: corner.x + ((previous.x - corner.x) * radius) / incoming,
        y: corner.y + ((previous.y - corner.y) * radius) / incoming,
      };
      const exit = {
        x: corner.x + ((after.x - corner.x) * radius) / outgoing,
        y: corner.y + ((after.y - corner.y) * radius) / outgoing,
      };
      const candidate = [entry];
      const count = Math.max(4, Math.ceil(radius / 2));
      for (let step = 1; step <= count; step++) {
        const t = step / count;
        candidate.push({
          x:
            (1 - t) ** 2 * entry.x +
            2 * t * (1 - t) * corner.x +
            t ** 2 * exit.x,
          y:
            (1 - t) ** 2 * entry.y +
            2 * t * (1 - t) * corner.y +
            t ** 2 * exit.y,
        });
      }
      if (
        candidate.every((p, n) => clear(n ? candidate[n - 1] : previous, p)) &&
        clear(candidate[candidate.length - 1], after)
      ) {
        curve = candidate;
        break;
      }
      radius *= 0.5;
    }
    if (curve) rounded.push(...curve);
    else rounded.push(corner);
    previous = rounded[rounded.length - 1];
  }
  return rounded;
}

/** Spend the whole frame's distance, including across small curve segments. */
export function advanceSampleRoute(
  from: SamplePoint,
  route: readonly SamplePoint[],
  travel: number,
) {
  let point = { ...from };
  let used = 0;
  let distance = Math.max(0, travel);
  for (const target of route) {
    const remaining = sampleDistance(point, target);
    if (remaining <= distance + 1e-7) {
      point = { ...target };
      distance -= remaining;
      used++;
    } else {
      point = {
        x: point.x + ((target.x - point.x) * distance) / remaining,
        y: point.y + ((target.y - point.y) * distance) / remaining,
      };
      break;
    }
  }
  return { point, used };
}

/** Substeps and axis sliding prevent walking through walls or sticking at corners. */
export function moveInSample(
  from: SamplePoint,
  delta: SamplePoint,
): SamplePoint {
  if (
    !onSampleGround(from) ||
    !Number.isFinite(delta.x) ||
    !Number.isFinite(delta.y)
  )
    return from;
  const pieces = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 2));
  if (pieces > 2048) return from;
  let point = { ...from };
  const dx = delta.x / pieces;
  const dy = delta.y / pieces;
  for (let i = 0; i < pieces; i++) {
    const both = { x: point.x + dx, y: point.y + dy };
    const horizontal = { x: point.x + dx, y: point.y };
    const vertical = { x: point.x, y: point.y + dy };
    if (onSampleGround(both)) point = both;
    else if (onSampleGround(horizontal)) point = horizontal;
    else if (onSampleGround(vertical)) point = vertical;
  }
  return point;
}

export function sampleDirection(delta: SamplePoint): SampleDirection {
  if (Math.abs(delta.x) > Math.abs(delta.y) * 1.25)
    return delta.x < 0 ? 'left' : 'right';
  return delta.y < 0 ? 'up' : 'down';
}

export function sampleFrame(distance: number, moving: boolean) {
  return moving ? Math.floor(distance / (ART_SAMPLE.stride / 6)) % 6 : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function sampleZoom(value: number) {
  return Number.isFinite(value) ? clamp(value, 0.1, 3.5) : 1;
}

export function constrainSampleCamera(
  camera: SampleCamera,
  width: number,
  height: number,
): SampleCamera {
  const viewWidth = width / camera.scale;
  const viewHeight = height / camera.scale;
  return {
    scale: camera.scale,
    x:
      viewWidth > ART_SAMPLE.width
        ? (ART_SAMPLE.width - viewWidth) / 2
        : clamp(camera.x, 0, ART_SAMPLE.width - viewWidth),
    y:
      viewHeight > ART_SAMPLE.height
        ? (ART_SAMPLE.height - viewHeight) / 2
        : clamp(camera.y, 0, ART_SAMPLE.height - viewHeight),
  };
}

export function sampleCamera(
  point: SamplePoint,
  width: number,
  height: number,
  zoom: number,
): SampleCamera {
  const scale =
    Math.max(width / ART_SAMPLE.width, height / ART_SAMPLE.height, 0.01) *
    sampleZoom(zoom);
  return constrainSampleCamera(
    {
      x: point.x - (width / scale) * 0.5,
      y: point.y - (height / scale) * 0.68,
      scale,
    },
    width,
    height,
  );
}

export function sampleScreenToWorld(
  point: SamplePoint,
  camera: SampleCamera,
): SamplePoint {
  return {
    x: camera.x + point.x / camera.scale,
    y: camera.y + point.y / camera.scale,
  };
}
