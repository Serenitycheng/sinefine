import {
  ROAD_CONTROL_POINTS,
  ROAD_TRIANGLES,
} from './fate-art-view-registration';
import {
  ART_SAMPLE,
  advanceSampleRoute,
  sampleDistance,
  onSampleStreetGround,
  type SamplePoint,
} from './fate-art-sample';
import {
  ALLEY_PAINTING,
  NEIGHBORHOOD_PAINTING,
  onSideScenePaving,
  onNeighborhoodRoadForeground,
  sampleScenePoint,
  sampleSceneWorld,
  sampleSceneIndex,
  sampleViewWalkScale,
  type SampleScene,
} from './fate-art-alley';
import { onRoadFloor, onRoadSidewalk } from './fate-art-road-ground';
import { SLOPE_REGISTRATION, SLOPE_TRIANGLES } from './fate-art-extension';

export const ROAD_MODES = ['overview', 'along', 'eye'] as const;
export type RoadMode = (typeof ROAD_MODES)[number];
export const ROAD_MODE_LABELS: Record<RoadMode, string> = {
  overview: '斜俯看',
  along: '沿路看',
  eye: '平视前路',
};
export const PAINTED_VIEWS = [
  'street',
  'alley',
  'neighborhood',
  'street-along',
  'neighborhood-along',
  'street-eye',
  'neighborhood-eye',
  'slope',
  'slope-along',
  'slope-eye',
] as const;
export type PaintedView = (typeof PAINTED_VIEWS)[number];
export const VIEW_PAINTINGS: Record<PaintedView, string> = {
  street: ART_SAMPLE.background,
  alley: ALLEY_PAINTING,
  neighborhood: NEIGHBORHOOD_PAINTING,
  'street-along': '/fate/art-sample/main-road-along-v4.png',
  'neighborhood-along': '/fate/art-sample/leafy-road-along-v4.png',
  'street-eye': '/fate/art-sample/main-road-eye-v4.png',
  'neighborhood-eye': '/fate/art-sample/leafy-road-eye-v4.png',
  slope: '/fate/block/zelkova-slope-v1.png',
  'slope-along': '/fate/block/zelkova-along-v1.png',
  'slope-eye': '/fate/block/zelkova-eye-v1.png',
};
export function viewArea(view: PaintedView): SampleScene {
  if (view.startsWith('slope')) return 'slope';
  return view.startsWith('street')
    ? 'street'
    : view === 'alley'
      ? 'alley'
      : 'neighborhood';
}
export function viewForArea(area: SampleScene, mode: RoadMode): PaintedView {
  return area === 'alley' || mode === 'overview' ? area : `${area}-${mode}`;
}
export function isRoadView(view: PaintedView) {
  // The returning street's oblique painting also has a curved registration.
  return view === 'slope' || view.includes('-');
}

type Pair = { source: SamplePoint; target: SamplePoint };
type Triangle = readonly [number, number, number];
type RegisteredView = {
  pairs: readonly Pair[];
  triangles: readonly Triangle[];
};
const p = (x: number, y: number): SamplePoint => ({ x, y });
function registered(view: keyof typeof ROAD_CONTROL_POINTS): RegisteredView {
  return {
    pairs: ROAD_CONTROL_POINTS[view].map(([x, y, a, b]) => ({
      source: p(x, y),
      target: p(a, b),
    })),
    triangles: ROAD_TRIANGLES[view],
  };
}
function registeredSlope(
  view: keyof typeof SLOPE_REGISTRATION,
): RegisteredView {
  return {
    pairs: SLOPE_REGISTRATION[view].map(([x, y, a, b]) => ({
      source: p(x, y),
      target: p(a, b),
    })),
    triangles: SLOPE_TRIANGLES,
  };
}
export const ROAD_REGISTRATION = {
  'street-along': registered('street-along'),
  'street-eye': registered('street-eye'),
  'neighborhood-along': registered('neighborhood-along'),
  'neighborhood-eye': registered('neighborhood-eye'),
  slope: registeredSlope('slope'),
  'slope-along': registeredSlope('slope-along'),
  'slope-eye': registeredSlope('slope-eye'),
} as const;
type RoadView = keyof typeof ROAD_REGISTRATION;

function compileRegistration(view: RoadView, inverse: boolean) {
  const { pairs, triangles } = ROAD_REGISTRATION[view];
  const from = inverse ? 'target' : 'source',
    to = inverse ? 'source' : 'target';
  return triangles.map(([i, j, k]) => {
    const a = pairs[i][from],
      b = pairs[j][from],
      c = pairs[k][from];
    const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return {
      wx: (b.y - c.y) / area,
      wy: (c.x - b.x) / area,
      w0: (b.x * c.y - b.y * c.x) / area,
      vx: (c.y - a.y) / area,
      vy: (a.x - c.x) / area,
      v0: (c.x * a.y - c.y * a.x) / area,
      a: pairs[i][to],
      b: pairs[j][to],
      c: pairs[k][to],
    };
  });
}
const compiled = Object.fromEntries(
  Object.keys(ROAD_REGISTRATION).map((key) => {
    const view = key as RoadView;
    return [
      view,
      [compileRegistration(view, false), compileRegistration(view, true)],
    ];
  }),
) as Record<RoadView, ReturnType<typeof compileRegistration>[]>;

function mapRegistration(point: SamplePoint, view: RoadView, inverse = false) {
  let best = Infinity,
    value = p(0, 0);
  for (const tri of compiled[view][inverse ? 1 : 0]) {
    const w = tri.wx * point.x + tri.wy * point.y + tri.w0;
    const v = tri.vx * point.x + tri.vy * point.y + tri.v0;
    const u = 1 - w - v;
    const penalty = Math.max(0, -w) + Math.max(0, -v) + Math.max(0, -u);
    if (penalty < best) {
      best = penalty;
      value = {
        x: tri.a.x * w + tri.b.x * v + tri.c.x * u,
        y: tri.a.y * w + tri.b.y * v + tri.c.y * u,
      };
      if (best < 1e-10) break;
    }
  }
  return { value, inside: best < 1e-10 };
}

export function sampleViewPoint(
  world: SamplePoint,
  view: PaintedView,
): SamplePoint {
  const local = sampleScenePoint(world, viewArea(view));
  return isRoadView(view)
    ? mapRegistration(local, view as RoadView).value
    : local;
}
export function sampleViewWorld(
  local: SamplePoint,
  view: PaintedView,
): SamplePoint {
  return sampleSceneWorld(
    isRoadView(view)
      ? mapRegistration(local, view as RoadView, true).value
      : local,
    viewArea(view),
  );
}

/** Split a straight painted line at its registration edges. Each resulting
 * world segment stays affine, so walking to a nearby screen point cannot
 * curve around an unrelated world-space junction. */
export function paintedSampleLine(
  from: SamplePoint,
  to: SamplePoint,
  view: PaintedView,
): SamplePoint[] {
  if (!isRoadView(view)) return [{ ...to }];
  const a = sampleViewPoint(from, view),
    b = sampleViewPoint(to, view);
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const { pairs, triangles } = ROAD_REGISTRATION[view as RoadView];
  const splits = [1];
  const edges = new Set<string>();
  for (const tri of triangles)
    for (let i = 0; i < 3; i++) {
      const j = tri[i],
        k = tri[(i + 1) % 3];
      const key = j < k ? `${j}:${k}` : `${k}:${j}`;
      if (edges.has(key)) continue;
      edges.add(key);
      const c = pairs[j].target,
        d = pairs[k].target;
      const ex = d.x - c.x,
        ey = d.y - c.y;
      const det = dx * ey - dy * ex;
      if (Math.abs(det) < 1e-10) continue;
      const ox = c.x - a.x,
        oy = c.y - a.y;
      const t = (ox * ey - oy * ex) / det;
      const u = (ox * dy - oy * dx) / det;
      if (t > 1e-8 && t < 1 - 1e-8 && u >= -1e-8 && u <= 1 + 1e-8)
        splits.push(t);
    }
  splits.sort((x, y) => x - y);
  return splits
    .filter((t, i) => !i || t - splits[i - 1] > 1e-8)
    .map((t) =>
      t === 1
        ? { ...to }
        : sampleViewWorld({ x: a.x + dx * t, y: a.y + dy * t }, view),
    );
}
export function onViewPaving(point: SamplePoint, view: PaintedView) {
  if (isRoadView(view) && !onRoadFloor(point, view as RoadView)) return false;
  const mapped = isRoadView(view)
    ? mapRegistration(point, view as RoadView, true)
    : { value: point, inside: true };
  if (!mapped.inside) return false;
  const area = viewArea(view);
  // Barycentric round-trips may land a few ulps outside a polygon vertex.
  const ground = {
    x: Math.round(mapped.value.x * 1e7) / 1e7,
    y: Math.round(mapped.value.y * 1e7) / 1e7,
  };
  const original =
    area === 'street'
      ? onSampleStreetGround(ground)
      : onSideScenePaving(ground, area) ||
        (isRoadView(view) && onNeighborhoodRoadForeground(ground));
  if (original || !isRoadView(view)) return original;
  if (area === 'alley' || area === 'slope' || !onRoadSidewalk(ground, area))
    return false;
  // A facing painting shows sidewalk between the old overview's separate
  // doorway polygons. Do not turn that visible paving into an invisible wall.
  // Extend only where the other facing painting independently has pavement;
  // a wall mapped onto the road in just one registration stays blocked.
  const other = viewForArea(area, view.endsWith('eye') ? 'along' : 'eye');
  const paint = mapRegistration(ground, other as RoadView).value;
  const restored = mapRegistration(paint, other as RoadView, true);
  return (
    restored.inside &&
    sampleDistance(restored.value, ground) < 1e-6 &&
    onRoadFloor(paint, other as RoadView)
  );
}

export function roadPaintedHeight(point: SamplePoint, view: PaintedView) {
  // Facing paintings already contain perspective. Keep one planar panorama;
  // treating the sky/facades as floor relief would tilt all the buildings.
  void point;
  void view;
  return 0;
}
export function viewActorScale(point: SamplePoint, view: PaintedView) {
  if (!isRoadView(view) || view === 'slope') return 1;
  const y = sampleViewPoint(point, view).y;
  return view.endsWith('eye')
    ? Math.max(0.65, Math.min(2.9, (y - 340) / 190))
    : Math.max(0.38, Math.min(1.45, (y + 300) / 950));
}
export function viewTravelScale(
  point: SamplePoint,
  delta: SamplePoint,
  view: PaintedView,
) {
  const length = Math.hypot(delta.x, delta.y);
  if (length < 1e-8) return 1;
  const a = sampleViewPoint(point, view);
  const b = sampleViewPoint(
    { x: point.x + delta.x / length, y: point.y + delta.y / length },
    view,
  );
  return Math.max(
    0.15,
    Math.hypot(b.x - a.x, b.y - a.y) / viewActorScale(point, view),
  );
}

/** Spend walking distance in the painted view, including each projection seam.
 * A derivative at just the starting point can jump across a compressed doorway.
 * Bounded substeps and a final bisection keep motion continuous at those seams.
 */
export function advanceViewRoute(
  from: SamplePoint,
  path: readonly SamplePoint[],
  travel: number,
  view: PaintedView,
) {
  if (!isRoadView(view)) {
    const scale = sampleViewWalkScale(sampleSceneIndex(viewArea(view)));
    const advanced = advanceSampleRoute(from, path, travel / scale);
    let previous = from,
      spent = 0;
    for (let i = 0; i < advanced.used; i++) {
      spent += sampleDistance(previous, path[i]) * scale;
      previous = path[i];
    }
    spent += sampleDistance(previous, advanced.point) * scale;
    return { ...advanced, spent };
  }
  let point = from,
    remaining = Math.max(0, travel),
    used = 0;
  for (
    let count = 0;
    count < 1024 && used < path.length && remaining > 1e-7;
    count++
  ) {
    const target = path[used],
      length = sampleDistance(point, target);
    if (length < 1e-7) {
      point = target;
      used++;
      continue;
    }
    const amount = Math.min(0.75, length);
    const at = (fraction: number) => ({
      x: point.x + ((target.x - point.x) * amount * fraction) / length,
      y: point.y + ((target.y - point.y) * amount * fraction) / length,
    });
    const startPaint = sampleViewPoint(point, view),
      startScale = viewActorScale(point, view);
    const cost = (p: SamplePoint) =>
      sampleDistance(startPaint, sampleViewPoint(p, view)) /
      ((startScale + viewActorScale(p, view)) / 2);
    const next = at(1),
      needed = cost(next);
    if (needed > remaining) {
      let low = 0,
        high = 1;
      for (let i = 0; i < 18; i++) {
        const mid = (low + high) / 2;
        if (cost(at(mid)) > remaining) high = mid;
        else low = mid;
      }
      point = at(low);
      remaining -= cost(point);
      break;
    }
    remaining -= needed;
    point = next;
    if (amount === length) {
      point = target;
      used++;
    }
  }
  return { point, used, spent: Math.max(0, travel) - remaining };
}

export type ViewCut = {
  shown: PaintedView;
  target: PaintedView;
  phase: number;
  changing: boolean;
};
export function beginViewCut(shown: PaintedView): ViewCut {
  return { shown, target: shown, phase: 0, changing: false };
}
export function stepViewCut(
  state: ViewCut,
  target: PaintedView,
  dt: number,
  reduced = false,
): ViewCut {
  if (reduced) return beginViewCut(target);
  if (!state.changing && state.shown === target) return state;
  const active = state.changing
    ? state
    : { ...state, target, phase: 0, changing: true };
  const phase = Math.min(
    1,
    active.phase + Math.max(0, Math.min(dt, 0.05)) / 0.48,
  );
  const shown = phase >= 0.5 ? active.target : active.shown;
  if (phase === 1) return beginViewCut(shown);
  return { ...active, shown, phase };
}
export function viewCutCover(cut: ViewCut) {
  if (!cut.changing) return 0;
  const t = Math.min(1, Math.min(cut.phase / 0.35, (1 - cut.phase) / 0.35));
  return t * t * (3 - 2 * t);
}
