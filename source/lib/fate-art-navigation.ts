import {
  SAMPLE_STREET_GROUND,
  onSampleGround,
  sampleDistance,
  sampleRoute,
  sampleSegmentClear,
  softenSampleRoute,
  type SamplePoint,
} from './fate-art-sample';
import {
  NEIGHBORHOOD_PAVING,
  onAlleyPaving,
  sampleAlleyPoint,
  sampleNeighborhoodPoint,
  sampleNeighborhoodWorld,
  sampleConnectedScene,
  type SampleScene,
} from './fate-art-alley';
import { onRoadFloor, type RoadFloorView } from './fate-art-road-ground';
import {
  NEUTRAL_LOOK,
  projectPaintedPoint,
  unprojectPaintedGround,
  sampleSceneInput,
  type SampleLook,
} from './fate-art-depth';
import {
  sampleViewPoint,
  sampleViewWorld,
  onViewPaving,
  viewForArea,
  viewActorScale,
  paintedSampleLine,
  isRoadView,
  viewArea,
  advanceViewRoute,
  type PaintedView,
  type RoadMode,
} from './fate-art-views';
import {
  onSlopeWorld,
  slopeProgress,
  SLOPE_WORLD_PAVING,
} from './fate-art-extension';

type RoadGround = {
  floors: { view: RoadFloorView; paint: SamplePoint; radius: number }[];
  margins: Map<number, boolean>;
};
const registeredGroundCache = new Map<string, RoadGround>();

/** Facing modes share a registered floor, including the open foreground that
 * the older overview outline clipped. Both paintings must contain the feet. */
function onRegisteredRoadGround(
  point: SamplePoint,
  area: 'street' | 'neighborhood' | 'slope',
  margin = 0,
) {
  const key = `${area}:${point.x},${point.y}`;
  let ground = registeredGroundCache.get(key);
  if (!ground) {
    const floors: RoadGround['floors'] = [];
    for (const mode of ['along', 'eye'] as const) {
      const view: RoadFloorView = `${area}-${mode}`;
      const paint = sampleViewPoint(point, view);
      if (!onViewPaving(paint, view)) break;
      floors.push({ view, paint, radius: 2 * viewActorScale(point, view) });
    }
    ground = { floors, margins: new Map() };
    if (registeredGroundCache.size >= 8192) registeredGroundCache.clear();
    registeredGroundCache.set(key, ground);
  }
  if (ground.floors.length !== 2) return false;
  const cached = ground.margins.get(margin);
  if (cached !== undefined) return cached;
  const allowed = ground.floors.every(({ paint, radius: base, view }) => {
    const radius = base + margin;
    return [
      paint,
      { x: paint.x - radius, y: paint.y },
      { x: paint.x + radius, y: paint.y },
      { x: paint.x, y: paint.y + radius },
    ].every((foot) => onRoadFloor(foot, view));
  });
  ground.margins.set(margin, allowed);
  return allowed;
}

function navigationArea(point: SamplePoint): SampleScene {
  const nearSlope =
    point.x > 890 && point.x < 1840 && point.y > -470 && point.y < 450;
  const progress = nearSlope ? slopeProgress(point) : -1;
  if (
    nearSlope &&
    onSlopeWorld(point) &&
    progress > 0.015 &&
    progress < 0.985 &&
    onRegisteredRoadGround(point, 'slope')
  )
    return 'slope';
  const alley = sampleAlleyPoint(point);
  if (
    // The road paintings continue to source Y=938 (alley Y=296). Classify
    // their actual shared ground before the old Y=245 cut to avoid a narrow
    // collision gap where the alley's right edge ends first.
    sampleNeighborhoodPoint(point).y <= 938 &&
    onRegisteredRoadGround(point, 'neighborhood')
  )
    return 'neighborhood';
  if (point.y < 426 && onAlleyPaving(alley)) return 'alley';
  return 'street';
}

/** Both road paintings constrain the same walking space, so changing the
 * camera never relocates the person or leaves them standing inside a wall. */
export function onVisibleSampleGround(
  point: SamplePoint,
  margin = 0,
  view?: PaintedView,
) {
  if (view && !onViewPaving(sampleViewPoint(point, view), view)) return false;
  const area = navigationArea(point);
  if (area === 'alley') return onSampleGround(point);
  return onRegisteredRoadGround(point, area, margin);
}

/** Screen clicks must contain the whole foot in the shown and shared floor.
 * Named destinations may deliberately route into another connected scene. */
export function sampleClickTarget(paint: SamplePoint, view: PaintedView) {
  if (!onViewPaving(paint, view)) return null;
  const point = sampleViewWorld(paint, view);
  return onVisibleSampleGround(point, 0, view) ? point : null;
}

export function visibleSampleSegmentClear(from: SamplePoint, to: SamplePoint) {
  // The two traced facing floors share sidewalks beyond the old overview
  // outline. Validate their whole segment below instead of reintroducing that
  // outline as a hidden curb. Connected alley crossings retain their bounds.
  const fromArea = navigationArea(from),
    toArea = navigationArea(to);
  const sharedRoad =
    fromArea !== 'alley' &&
    fromArea === toArea &&
    onRegisteredRoadGround(from, fromArea) &&
    onRegisteredRoadGround(to, fromArea);
  if (!sharedRoad && !sampleSegmentClear(from, to)) return false;
  const steps = Math.max(1, Math.ceil(sampleDistance(from, to) * 2));
  for (let i = 0; i <= steps; i++) {
    const amount = i / steps;
    const point = {
      x: from.x + (to.x - from.x) * amount,
      y: from.y + (to.y - from.y) * amount,
    };
    // The extra planning clearance eases in from a legal wall contact. The
    // actual footprint is still checked throughout, including both endpoints.
    const margin =
      1.25 *
      Math.min(
        1,
        sampleDistance(from, point) / 8,
        sampleDistance(to, point) / 8,
      );
    if (!onVisibleSampleGround(point, margin)) return false;
  }
  return true;
}

const detours = [
  ...SAMPLE_STREET_GROUND,
  ...NEIGHBORHOOD_PAVING.map((polygon) => polygon.map(sampleNeighborhoodWorld)),
  ...SLOPE_WORLD_PAVING,
]
  .flatMap((polygon) => {
    const center = polygon.reduce(
      (sum, p) => ({
        x: sum.x + p.x / polygon.length,
        y: sum.y + p.y / polygon.length,
      }),
      { x: 0, y: 0 },
    );
    return [
      center,
      ...polygon.map((p) => ({
        x: p.x * 0.65 + center.x * 0.35,
        y: p.y * 0.65 + center.y * 0.35,
      })),
    ];
  })
  .concat(
    [
      [810, 441],
      [832, 438],
      [852, 438],
      [868, 440],
      [890, 440],
      [903, 434],
    ].map(([x, y]) => sampleViewWorld({ x, y }, 'street-eye')),
    [
      { x: 1120, y: 450 },
      { x: 1118, y: 475 },
      { x: 1120, y: 490 },
      { x: 1130, y: 490 },
      { x: 1135, y: 505 },
      { x: 1140, y: 532 },
    ].map(sampleNeighborhoodWorld),
  );

export function visibleSampleRoute(
  from: SamplePoint,
  to: SamplePoint,
  view?: PaintedView,
) {
  const road =
    view &&
    isRoadView(view) &&
    navigationArea(from) === viewArea(view) &&
    navigationArea(to) === viewArea(view)
      ? view
      : null;
  const allowed = (point: SamplePoint) =>
    (!view || isRoadView(view) || onSampleGround(point)) &&
    (!road || navigationArea(point) === viewArea(road)) &&
    onVisibleSampleGround(
      point,
      sampleDistance(point, from) < 1e-6 || sampleDistance(point, to) < 1e-6
        ? 0
        : 1.25,
    );
  if (road) {
    const clear = (a: SamplePoint, b: SamplePoint) =>
      cachedPaintedClear(a, b, road);
    const path = sampleRoute(from, to, {
      allowed,
      clear,
      junctions: detours,
      cost: (a, b) =>
        sampleDistance(sampleViewPoint(a, road), sampleViewPoint(b, road)),
    });
    if (path) {
      // Round real obstacles in painted space, not at projection-only seams.
      const paintFrom = sampleViewPoint(from, road);
      const rounded = softenSampleRoute(
        paintFrom,
        path.map((p) => sampleViewPoint(p, road)),
        (a, b) => clear(sampleViewWorld(a, road), sampleViewWorld(b, road)),
      );
      let previous = from;
      return rounded.flatMap((p) => {
        const next = sampleViewWorld(p, road);
        const line = paintedSampleLine(previous, next, road);
        previous = next;
        return line;
      });
    }
  }
  // Narrow doorways can need a curved projected approach. Preserve a verified
  // world corridor when the painted visibility graph has no connection.
  const clear = (a: SamplePoint, b: SamplePoint) =>
    (!view || isRoadView(view) || sampleSegmentClear(a, b)) &&
    cachedClear(a, b);
  // Connected areas normally need only their authored doorway junctions.
  // Scan the extra painted obstacle points only if that smaller graph fails;
  // otherwise a first cross-area click would synchronously inspect thousands
  // of irrelevant pairs while the character and controls appear frozen.
  const path =
    sampleRoute(from, to, { allowed, clear, cost: blockRouteCost }) ??
    sampleRoute(from, to, {
      allowed,
      clear,
      cost: blockRouteCost,
      junctions: detours,
    });
  return path ? softenSampleRoute(from, path, clear) : null;
}

// The returning road's curved coordinate strip is longer than its painted
// walking distance. Charging its debug coordinates would always send people
// backwards through the alley instead of using the visibly shorter next exit.
function blockRouteCost(a: SamplePoint, b: SamplePoint) {
  if (navigationArea(a) === 'slope' && navigationArea(b) === 'slope')
    return sampleDistance(
      sampleViewPoint(a, 'slope'),
      sampleViewPoint(b, 'slope'),
    );
  return sampleDistance(a, b);
}

const paintedClearCache = new Map<string, boolean>();
function cachedPaintedClear(
  from: SamplePoint,
  to: SamplePoint,
  view: PaintedView,
) {
  const a = `${from.x.toFixed(7)},${from.y.toFixed(7)}`;
  const b = `${to.x.toFixed(7)},${to.y.toFixed(7)}`;
  const key = `${view}:${a < b ? `${a}|${b}` : `${b}|${a}`}`;
  const cached = paintedClearCache.get(key);
  if (cached !== undefined) return cached;
  const line = paintedSampleLine(from, to, view);
  const clear = line.every((p, i) =>
    visibleSampleSegmentClear(i ? line[i - 1] : from, p),
  );
  if (paintedClearCache.size >= 8192) paintedClearCache.clear();
  paintedClearCache.set(key, clear);
  return clear;
}

// The fixed junctions share the same edges between clicks. Cache those checks
// only for route planning; walking still checks every new foot position.
const clearCache = new Map<string, boolean>();
function cachedClear(from: SamplePoint, to: SamplePoint) {
  const a = `${from.x.toFixed(7)},${from.y.toFixed(7)}`;
  const b = `${to.x.toFixed(7)},${to.y.toFixed(7)}`;
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const cached = clearCache.get(key);
  if (cached !== undefined) return cached;
  const clear = visibleSampleSegmentClear(from, to);
  if (clearCache.size >= 8192) clearCache.clear();
  clearCache.set(key, clear);
  return clear;
}

/** Trace the whole footprint in short steps. Click routes stop at contact;
 * manual input may follow a boundary when aimed predominantly along it. */
export function moveOnVisibleSampleGround(
  from: SamplePoint,
  delta: SamplePoint,
  slideView?: PaintedView,
  allowSlide = true,
  slideLook: SampleLook = NEUTRAL_LOOK,
) {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return from;
  const length = Math.hypot(delta.x, delta.y);
  if (length < 1e-8) return from;
  const steps = Math.ceil(length / 0.5);
  if (steps > 2048) return from;
  let point = from;
  for (let i = 1; i <= steps; i++) {
    const next = {
      x: from.x + (delta.x * i) / steps,
      y: from.y + (delta.y * i) / steps,
    };
    const floorView =
      slideView && isRoadView(slideView) ? slideView : undefined;
    if (!onVisibleSampleGround(next, 0, floorView)) {
      // Reach contact rather than leaving a substep-wide invisible barrier.
      // This also puts the boundary probes close enough to find its tangent.
      const start = point;
      let low = 0,
        high = 1;
      for (let j = 0; j < 16; j++) {
        const t = (low + high) / 2;
        const candidate = {
          x: start.x + (next.x - start.x) * t,
          y: start.y + (next.y - start.y) * t,
        };
        if (onVisibleSampleGround(candidate, 0, floorView)) low = t;
        else high = t;
      }
      point = {
        x: start.x + (next.x - start.x) * low,
        y: start.y + (next.y - start.y) * low,
      };
      break;
    }
    point = next;
  }
  if (
    allowSlide &&
    slideView &&
    sampleDistance(point, { x: from.x + delta.x, y: from.y + delta.y }) > 1e-7
  )
    return slideOnPaintedBoundary(
      point,
      { x: from.x + delta.x, y: from.y + delta.y },
      slideView,
      slideLook,
    );
  return point;
}

/** Follow a wall only when the player is aiming along it. A head-on input
 * must stop at contact, not get turned sideways by a sloped curb. World axis
 * sliding is unsuitable here: one axis can stretch across a doorway. */
function slideOnPaintedBoundary(
  contact: SamplePoint,
  wanted: SamplePoint,
  view: PaintedView,
  look: SampleLook,
) {
  const paint = sampleViewPoint(contact, view),
    target = sampleViewPoint(wanted, view);
  const radius = Math.max(0.8, Math.min(2, viewActorScale(contact, view)));
  const blockedAt = (angle: number) =>
    !onVisibleSampleGround(
      sampleViewWorld(
        {
          x: paint.x + Math.cos(angle) * radius,
          y: paint.y + Math.sin(angle) * radius,
        },
        view,
      ),
      0,
      view,
    );
  const blocked = Array.from({ length: 16 }, (_, i) =>
    blockedAt((i * Math.PI) / 8),
  );
  const edges = [0, Math.PI * 2];
  for (let i = 0; i < 16; i++) {
    if (blocked[i] === blocked[(i + 1) % 16]) continue;
    let low = (i * Math.PI) / 8,
      high = ((i + 1) * Math.PI) / 8;
    for (let j = 0; j < 12; j++) {
      const mid = (low + high) / 2;
      if (blockedAt(mid) === blocked[i]) low = mid;
      else high = mid;
    }
    edges.push((low + high) / 2);
  }
  edges.sort((a, b) => a - b);
  let nx = 0,
    ny = 0;
  for (let i = 1; i < edges.length; i++) {
    const a = edges[i - 1],
      b = edges[i];
    if (!blockedAt((a + b) / 2)) continue;
    nx -= Math.sin(b) - Math.sin(a);
    ny += Math.cos(b) - Math.cos(a);
  }
  const length = Math.hypot(nx, ny);
  if (length < 1e-7) return contact;
  nx /= length;
  ny /= length;
  const dx = target.x - paint.x,
    dy = target.y - paint.y;
  const normal = dx * nx + dy * ny;
  if (normal >= 0) return contact;
  const tangent = { x: dx - normal * nx, y: dy - normal * ny };
  const tangentLength = Math.hypot(tangent.x, tangent.y);
  if (tangentLength < 0.02) return contact;
  // Compare intent on screen, including the current observation angle. A
  // mostly head-on press must not be deflected over 30 degrees along a curb;
  // comparing in the unturned painting could still redirect a vertical key.
  const screen = projectPaintedPoint(paint, look, 0, view);
  const desired = projectPaintedPoint(target, look, 0, view);
  const along = projectPaintedPoint(
    { x: paint.x + tangent.x, y: paint.y + tangent.y },
    look,
    0,
    view,
  );
  const desiredX = desired.x - screen.x,
    desiredY = desired.y - screen.y,
    alongX = along.x - screen.x,
    alongY = along.y - screen.y;
  if (
    desiredX * alongX + desiredY * alongY <
    Math.hypot(desiredX, desiredY) *
      Math.hypot(alongX, alongY) *
      Math.cos(Math.PI / 6)
  )
    return contact;
  // The traced contact and angle are finite-precision. A subpixel inward skin
  // prevents a tangent from immediately colliding with the same boundary.
  const skin = Math.max(0.0001, tangentLength * 0.001);
  tangent.x += nx * skin;
  tangent.y += ny * skin;
  const endPaint = { x: paint.x + tangent.x, y: paint.y + tangent.y };
  const end = sampleViewWorld(endPaint, view);
  // Outside a registration mesh, nearest-triangle extrapolation need not be
  // invertible. Never let such a tangent relocate the person to another edge.
  if (sampleDistance(sampleViewPoint(end, view), endPaint) > 1e-5)
    return contact;
  let point = contact;
  for (const waypoint of paintedSampleLine(contact, end, view)) {
    const next = moveOnVisibleSampleGround(
      point,
      { x: waypoint.x - point.x, y: waypoint.y - point.y },
      view,
      false,
    );
    point = next;
    if (sampleDistance(point, waypoint) > 1e-7) break;
  }
  return point;
}

/** Consume a frame segment by segment. Each corner is collision checked;
 * reaching several short points never turns them into one diagonal shortcut. */
export function advanceVisibleSampleRoute(
  from: SamplePoint,
  path: readonly SamplePoint[],
  travel: number,
  view: PaintedView,
) {
  let point = from,
    used = 0,
    remaining = Math.max(0, travel),
    blocked = false;
  for (const target of path) {
    if (remaining < 1e-7) break;
    const step = advanceViewRoute(point, [target], remaining, view);
    const next = moveOnVisibleSampleGround(
      point,
      { x: step.point.x - point.x, y: step.point.y - point.y },
      view,
      false,
    );
    point = next;
    if (sampleDistance(next, step.point) > 1e-5) {
      blocked = true;
      break;
    }
    remaining = Math.max(0, remaining - step.spent);
    used += step.used;
    if (!step.used) break;
  }
  return { point, used, blocked };
}

/** Keep a held direction straight through projection seams. Applying a local
 * world derivative to a full frame could reverse direction in the next triangle. */
export function moveVisibleSampleInput(
  from: SamplePoint,
  input: SamplePoint,
  travel: number,
  view: PaintedView,
  look: SampleLook = NEUTRAL_LOOK,
  keyView: PaintedView = view,
) {
  if (travel <= 0 || !Number.isFinite(travel)) return from;
  const inputLength = Math.hypot(input.x, input.y);
  if (!Number.isFinite(inputLength) || inputLength < 1e-8) return from;
  const direction = { x: input.x / inputLength, y: input.y / inputLength };
  let path: SamplePoint[];
  if (isRoadView(view)) {
    const paint = sampleViewPoint(from, view);
    const reach = travel * 4 + 1;
    let ahead: SamplePoint;
    if (keyView === view) {
      // Invert the screen direction before the registration warp, never an
      // inverse world derivative that could belong to the adjoining triangle.
      const screen = projectPaintedPoint(paint, look, 0, view);
      ahead = unprojectPaintedGround(
        {
          x: screen.x + direction.x * reach,
          y: screen.y + direction.y * reach,
        },
        look,
        view,
      );
    } else {
      // A key held through an automatic camera cut keeps its world direction
      // until released. A fresh press uses the new camera's screen direction.
      const world = sampleSceneInput(direction, look, keyView, from);
      const small = sampleViewPoint(
        { x: from.x + world.x * 0.0001, y: from.y + world.y * 0.0001 },
        view,
      );
      const length = sampleDistance(paint, small);
      if (length < 1e-10) return from;
      ahead = {
        x: paint.x + ((small.x - paint.x) / length) * reach,
        y: paint.y + ((small.y - paint.y) / length) * reach,
      };
    }
    const target = sampleViewWorld(ahead, view);
    path = paintedSampleLine(from, target, view);
  } else {
    const world = sampleSceneInput(direction, look, keyView, from);
    path = [{ x: from.x + world.x * 256, y: from.y + world.y * 256 }];
  }
  const advanced = advanceVisibleSampleRoute(from, path, travel, view);
  let point = advanced.point;
  if (advanced.blocked) {
    const wanted = advanceViewRoute(from, path, travel, view).point;
    point = moveOnVisibleSampleGround(
      advanced.point,
      {
        x: wanted.x - advanced.point.x,
        y: wanted.y - advanced.point.y,
      },
      view,
      true,
      look,
    );
  }
  // Tiny world-space contact corrections can become large in compressed gate
  // triangles. Collision response must obey the same visible frame budget.
  const cost = (p: SamplePoint) =>
    sampleDistance(sampleViewPoint(from, view), sampleViewPoint(p, view)) /
    ((viewActorScale(from, view) + viewActorScale(p, view)) / 2);
  if (cost(point) <= travel * 1.002 + 1e-7) return point;
  const bounded = advanceVisibleSampleRoute(
    from,
    paintedSampleLine(from, point, view),
    travel,
    view,
  ).point;
  return cost(bounded) <= travel * 1.002 + 1e-7 ? bounded : from;
}

/** Face down the alley at its mouth, before a road painting's wall can hide it. */
export function sampleNavigableScene(
  scene: SampleScene,
  point: SamplePoint,
  mode: RoadMode,
) {
  const area = navigationArea(point);
  const progress = slopeProgress(point);
  if (scene === 'slope') {
    if (progress < 0.015 && onRegisteredRoadGround(point, 'neighborhood'))
      return 'neighborhood';
    if (progress > 0.96 && onRegisteredRoadGround(point, 'street'))
      return 'street';
    if (onSlopeWorld(point)) return 'slope';
  }
  if (area === 'slope') {
    // Use distinct entry/exit edges inside the shared road overlap, before
    // the outgoing painting's curb is reached. Keep the selected camera mode.
    if (
      scene === 'street' &&
      progress > 0.94 &&
      onRegisteredRoadGround(point, 'street')
    )
      return 'street';
    if (
      scene === 'neighborhood' &&
      progress < 0.035 &&
      onRegisteredRoadGround(point, 'neighborhood')
    )
      return 'neighborhood';
    return 'slope';
  }
  const alley = sampleAlleyPoint(point);
  // Keep separate entrance/exit edges in the shared neighborhood doorway.
  // The newly opened foreground must not become an exit through a garden;
  // switching back into the alley requires its actual paving as well.
  if (scene === 'neighborhood') {
    if (alley.y > 280 && onAlleyPaving(alley)) return 'alley';
    if (area === 'neighborhood') return 'neighborhood';
    return sampleConnectedScene(scene, point);
  }
  if (area === 'neighborhood' && (alley.y < 260 || !onAlleyPaving(alley)))
    return 'neighborhood';
  if (mode === 'overview') return sampleConnectedScene(scene, point);
  // A straight manual exit can reach the painting's bottom edge while world Y
  // is still behind the old exit threshold. Cut in the shared paved overlap,
  // before the person leaves the alley image, and retain a separate enter edge.
  const streetView = viewForArea('street', mode);
  if (
    alley.y > (scene === 'alley' ? 900 : 880) &&
    onViewPaving(sampleViewPoint(point, streetView), streetView)
  )
    return 'street';
  if (onAlleyPaving(alley)) {
    if (scene === 'alley') return point.y > 434 ? 'street' : 'alley';
    // The along-road doorway reaches its facade before the old world-Y entry.
    // Enter in the shared ground overlap, with a deeper alley edge than exit
    // so a new screen-relative key after leaving cannot immediately reenter.
    if (point.y < 426 && alley.y < 810) return 'alley';
  }
  return sampleConnectedScene(scene, point);
}

/** Keep the selected road angle while finding a painting with visible paving.
 * A transient area mismatch must not turn an eye-level view into an overview. */
export function sampleNavigableView(
  scene: SampleScene,
  point: SamplePoint,
  mode: RoadMode,
): PaintedView {
  const requested = viewForArea(scene, mode);
  if (onViewPaving(sampleViewPoint(point, requested), requested))
    return requested;
  const fallbacks: PaintedView[] =
    mode === 'overview'
      ? [
          viewForArea(scene, 'eye'),
          viewForArea(scene, 'along'),
          scene,
          'alley',
          'street',
          'neighborhood',
          'slope',
        ]
      : [
          viewForArea(navigationArea(point), mode),
          'alley',
          viewForArea('street', mode),
          viewForArea('neighborhood', mode),
          viewForArea('slope', mode),
        ];
  for (const fallback of fallbacks)
    if (onViewPaving(sampleViewPoint(point, fallback), fallback))
      return fallback;
  return requested;
}
