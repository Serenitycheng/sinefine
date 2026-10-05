/** A single painted art study. Its coordinates never enter the game's saves. */
export type SamplePoint = { x: number; y: number };
export type SampleDirection = 'down' | 'left' | 'right' | 'up';
export type SampleCamera = SamplePoint & { scale: number };

export const ART_SAMPLE = {
  width: 1672,
  height: 941,
  background: '/fate/art-sample/residential-cafe-v1.png',
  sprite: '/fate/art-sample/illya-walk-v1.png',
  start: { x: 832, y: 566 },
  walkSpeed: 66,
  stride: 70,
} as const;

// Foot positions traced on this painting, including the paving in front of doors.
// Roofs, plants, bicycles and courtyard walls are outside the navigable surface.
export const SAMPLE_GROUND: readonly (readonly SamplePoint[])[] = [
  [
    { x: 120, y: 696 },
    { x: 1618, y: 285 },
    { x: 1640, y: 406 },
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
    { x: 1013, y: 372 },
    { x: 1056, y: 350 },
    { x: 1133, y: 405 },
    { x: 1090, y: 462 },
    { x: 1038, y: 454 },
  ],
];

export const SAMPLE_PLACES = [
  {
    id: 'home',
    name: '住宅门前',
    point: { x: 545, y: 558 },
    description: '树影越过院墙，落在石阶和木门上。',
  },
  {
    id: 'cafe',
    name: '街角咖啡店',
    point: { x: 1360, y: 336 },
    description: '蓝灰色雨棚下，暖光照着木质门框。',
  },
] as const;
export type SamplePlace = (typeof SAMPLE_PLACES)[number];

const JUNCTIONS: readonly SamplePoint[] = [
  { x: 235, y: 690 },
  { x: 545, y: 598 },
  ART_SAMPLE.start,
  { x: 1085, y: 464 },
  { x: 1360, y: 383 },
  { x: 1480, y: 377 },
  ...SAMPLE_PLACES.map((place) => place.point),
  { x: 1076, y: 395 },
  { x: 1047, y: 365 },
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

export function onSampleGround(point: SamplePoint) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    SAMPLE_GROUND.some((polygon) => inPolygon(point, polygon))
  );
}

export function sampleSegmentClear(from: SamplePoint, to: SamplePoint) {
  const pieces = Math.max(1, Math.ceil(sampleDistance(from, to) / 3));
  if (!onSampleGround(from) || !onSampleGround(to)) return false;
  for (let i = 1; i < pieces; i++) {
    if (
      !onSampleGround({
        x: from.x + ((to.x - from.x) * i) / pieces,
        y: from.y + ((to.y - from.y) * i) / pieces,
      })
    )
      return false;
  }
  return true;
}

/** Visibility routing uses the same painted surface as keyboard movement. */
export function sampleRoute(
  from: SamplePoint,
  to: SamplePoint,
): SamplePoint[] | null {
  if (!onSampleGround(from) || !onSampleGround(to)) return null;
  if (sampleSegmentClear(from, to)) return [{ ...to }];
  const nodes = [from, to, ...JUNCTIONS.filter(onSampleGround)];
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
      if (seen.has(next) || !sampleSegmentClear(nodes[current], nodes[next]))
        continue;
      const cost = costs[current] + sampleDistance(nodes[current], nodes[next]);
      if (cost < costs[next]) {
        costs[next] = cost;
        previous[next] = current;
      }
    }
  }
  return null;
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
