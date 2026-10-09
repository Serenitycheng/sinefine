import { projectOnSegment, type CityPoint } from './fate-city-layout';
import { HOME_ENTRANCES } from './fate-home-entrances';
import { cityPilotPaint } from './fate-city-art';
import {
  CITY_ART_MODES,
  cityArtCamera,
  type CityArtMode,
} from './fate-city-art-camera';
import {
  CITY_ART_SCENES,
  CITY_ART_SCENE_IDS,
  type CityArtScene,
} from './fate-city-art-scenes';
import {
  CITY_ART_PORTALS,
  cityArtExits,
  cityArtCrossing,
  cityArtScreenCrossing,
} from './fate-city-art-portals';
import {
  onCityArtPaving,
  cityArtRegistered,
  cityArtDepth,
  cityArtPaintedLine,
  projectCityArtPoint,
} from './fate-city-art-registration';

const sceneSegments = (scene: CityArtScene) => {
  const config = CITY_ART_SCENES[scene];
  return [
    ...config.points.slice(1).map((b, index) => ({
      a: config.points[index],
      b,
      radius: config.width / 2,
    })),
    ...config.homes.flatMap((home) => {
      const entry = HOME_ENTRANCES[home];
      return entry.points.slice(1).map((b, index) => ({
        a: entry.points[index],
        b,
        radius: entry.width / 2,
      }));
    }),
    ...config.extraApproaches.flatMap((points) =>
      points.slice(1).map((b, index) => ({ a: points[index], b, radius: 11 })),
    ),
  ];
};
const segments = Object.fromEntries(
  CITY_ART_SCENE_IDS.map((scene) => [scene, sceneSegments(scene)]),
) as Record<CityArtScene, ReturnType<typeof sceneSegments>>;
const distance = (a: CityPoint, b: CityPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const onSegment = (
  p: CityPoint,
  s: (typeof segments.residential)[number],
  margin = 0,
) => distance(p, projectOnSegment(p, s.a, s.b)) <= s.radius - margin + 1e-7;
export function cityPilotWalkable(
  point: CityPoint,
  margin = 1,
  scene: CityArtScene = 'residential',
) {
  return (
    [point.x, point.y].every(Number.isFinite) &&
    segments[scene].some((s) => onSegment(point, s, margin)) &&
    cityArtRegistered(point, false, 'overview', scene) &&
    onCityArtPaving(
      cityPilotPaint(point, 'overview', scene),
      'overview',
      scene,
    ) &&
    (scene === 'residential' ||
      CITY_ART_MODES.every((mode) => {
        const paint = cityPilotPaint(point, mode, scene),
          camera = cityArtCamera(mode, scene);
        return (
          cityArtRegistered(point, false, mode, scene) &&
          paint.x >= 1 &&
          paint.y >= 1 &&
          paint.x < camera.width - 1 &&
          paint.y < camera.height - 1 &&
          onCityArtPaving(paint, mode, scene)
        );
      }))
  );
}

/** Crossing intent survives a blocked frame. Never change the position or
 * relax wall collision; the incoming painting must already contain this foot. */
export function cityPilotInputCrossing(
  point: CityPoint,
  input: CityPoint,
  mode: CityArtMode,
  scene: CityArtScene,
  excluded: CityArtScene | null = null,
) {
  const length = Math.hypot(input.x, input.y);
  if (!Number.isFinite(length) || length < 1e-8) return null;
  const paint = cityPilotPaint(point, mode, scene);
  const intended = projectCityArtPoint(
    {
      x: paint.x + (input.x / length) * 0.25,
      y: paint.y + (input.y / length) * 0.25,
    },
    true,
    mode,
    scene,
  );
  const discrete = [input.x, input.y].every(
    (value) => value === -1 || value === 0 || value === 1,
  );
  const screenExit = cityArtScreenCrossing(
    scene,
    point,
    input,
    (p) => cityPilotPaint(p, mode, scene),
    excluded,
  );
  const worldExit = cityArtCrossing(scene, point, intended, excluded);
  const exit = discrete ? (screenExit ?? worldExit) : (worldExit ?? screenExit);
  return exit &&
    cityPilotWalkable(point, 1, scene) &&
    cityPilotWalkable(point, 1, exit.scene)
    ? {
        ...exit,
        direction:
          'direction' in exit
            ? (exit.direction as CityPoint)
            : { x: intended.x - point.x, y: intended.y - point.y },
      }
    : null;
}
export function cityPilotLine(
  from: CityPoint,
  to: CityPoint,
  scene: CityArtScene = 'residential',
) {
  // Point sampling can miss a tiny gap between a road and a doorstep apron.
  // Cover the whole line with the actual road/walkway capsules before choosing
  // an automatic shortcut; changing frame rate must not expose a late blockage.
  if (!coveredByPavement(from, to, scene)) return false;
  const count = Math.max(1, Math.ceil(distance(from, to) / 1.5));
  for (let i = 0; i <= count; i++) {
    const p = {
      x: from.x + ((to.x - from.x) * i) / count,
      y: from.y + ((to.y - from.y) * i) / count,
    };
    if (!cityPilotWalkable(p, 1, scene)) return false;
  }
  return true;
}
function coveredByPavement(
  from: CityPoint,
  to: CityPoint,
  scene: CityArtScene,
) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    square = dx * dx + dy * dy;
  if (square < 1e-14) return segments[scene].some((s) => onSegment(from, s, 1));
  const intervals: [number, number][] = [];
  const add = (low: number, high: number) => {
    const a = Math.max(0, low),
      b = Math.min(1, high);
    if (a <= b + 1e-10) intervals.push([a, b]);
  };
  const clip = (start: number, rate: number, low: number, high: number) => {
    if (Math.abs(rate) < 1e-12)
      return start >= low && start <= high ? [-Infinity, Infinity] : null;
    const a = (low - start) / rate,
      b = (high - start) / rate;
    return [Math.min(a, b), Math.max(a, b)];
  };
  for (const segment of segments[scene]) {
    const radius = segment.radius - 1;
    for (const center of [segment.a, segment.b]) {
      const x = from.x - center.x,
        y = from.y - center.y,
        middle = x * dx + y * dy,
        discriminant =
          middle * middle - square * (x * x + y * y - radius * radius);
      if (discriminant >= -1e-8) {
        const root = Math.sqrt(Math.max(0, discriminant));
        add((-middle - root) / square, (-middle + root) / square);
      }
    }
    const sx = segment.b.x - segment.a.x,
      sy = segment.b.y - segment.a.y,
      length = Math.hypot(sx, sy);
    if (length < 1e-8) continue;
    const x = from.x - segment.a.x,
      y = from.y - segment.a.y;
    const along = clip(
      (x * sx + y * sy) / length,
      (dx * sx + dy * sy) / length,
      0,
      length,
    );
    const across = clip(
      (x * sy - y * sx) / length,
      (dx * sy - dy * sx) / length,
      -radius,
      radius,
    );
    if (along && across)
      add(Math.max(along[0], across[0]), Math.min(along[1], across[1]));
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let end = 0;
  for (const [low, high] of intervals) {
    if (low > end + 1e-9) return false;
    end = Math.max(end, high);
    if (end >= 1 - 1e-9) return true;
  }
  return false;
}
const sceneNodes = (scene: CityArtScene) => [
  ...CITY_ART_SCENES[scene].points,
  ...CITY_ART_SCENES[scene].homes.flatMap(
    (home) => HOME_ENTRANCES[home].points,
  ),
  ...CITY_ART_SCENES[scene].extraApproaches.flat(),
  ...cityArtExits(scene).map((exit) => exit.point),
];
const nodes = Object.fromEntries(
  CITY_ART_SCENE_IDS.map((scene) => [scene, sceneNodes(scene)]),
) as Record<CityArtScene, CityPoint[]>;
export function cityPilotRoute(
  from: CityPoint,
  destination: CityPoint,
  scene: CityArtScene = 'residential',
): CityPoint[] | null {
  if (
    !cityPilotWalkable(from, 1, scene) ||
    !cityPilotWalkable(destination, 1, scene)
  )
    return null;
  const all = [...nodes[scene], from, destination];
  const origin = all.length - 2,
    end = origin + 1;
  const costs = all.map(() => Infinity),
    previous = all.map(() => -1),
    seen = new Set<number>();
  costs[origin] = 0;
  for (let n = 0; n < all.length; n++) {
    let next = -1;
    for (let i = 0; i < all.length; i++)
      if (!seen.has(i) && (next < 0 || costs[i] < costs[next])) next = i;
    if (next < 0 || !Number.isFinite(costs[next])) return null;
    if (next === end) break;
    seen.add(next);
    for (let i = 0; i < all.length; i++) {
      const cost = costs[next] + distance(all[next], all[i]);
      if (
        seen.has(i) ||
        cost >= costs[i] ||
        !cityPilotLine(all[next], all[i], scene)
      )
        continue;
      costs[i] = cost;
      previous[i] = next;
    }
  }
  const path: CityPoint[] = [];
  for (let i = end; i !== origin; i = previous[i]) {
    if (i < 0) return null;
    path.unshift({ ...all[i] });
  }
  return path;
}
export type CityArtJourneyLeg = {
  scene: CityArtScene;
  path: CityPoint[];
  nextScene?: CityArtScene;
};
const portalRoutes = new Map<string, CityPoint[] | null>();
/** Travel between real shared junctions. A new painting is entered at the same
 * world point; the atlas never invents a shortcut across the river or a lawn. */
export function cityArtJourney(
  fromScene: CityArtScene,
  from: CityPoint,
  toScene: CityArtScene,
  destination: CityPoint = CITY_ART_SCENES[toScene].start,
): CityArtJourneyLeg[] | null {
  const graph = CITY_ART_PORTALS.flatMap((portal) => [
    { scene: portal.a, point: portal.point, portal: portal.id },
    { scene: portal.b, point: portal.point, portal: portal.id },
  ]);
  const start = graph.length,
    end = start + 1;
  graph.push(
    { scene: fromScene, point: from, portal: 'start' },
    { scene: toScene, point: destination, portal: 'end' },
  );
  const costs = graph.map(() => Infinity),
    previous = graph.map(() => -1),
    paths = new Map<number, CityPoint[]>(),
    seen = new Set<number>();
  costs[start] = 0;
  for (let n = 0; n < graph.length; n++) {
    let next = -1;
    for (let i = 0; i < graph.length; i++)
      if (!seen.has(i) && (next < 0 || costs[i] < costs[next])) next = i;
    if (next < 0 || !Number.isFinite(costs[next])) return null;
    if (next === end) break;
    seen.add(next);
    const a = graph[next];
    for (let i = 0; i < graph.length; i++) {
      if (seen.has(i)) continue;
      const b = graph[i];
      if (a.scene !== b.scene) {
        if (
          a.portal === b.portal &&
          a.portal !== 'start' &&
          a.portal !== 'end' &&
          costs[next] < costs[i]
        ) {
          costs[i] = costs[next];
          previous[i] = next;
          paths.set(i, []);
        }
        continue;
      }
      if (costs[next] + distance(a.point, b.point) >= costs[i]) continue;
      const key = `${a.scene}:${a.portal}:${b.portal}`;
      const cacheable = next < start && i < start;
      const path =
        cacheable && portalRoutes.has(key)
          ? portalRoutes.get(key)!
          : cityPilotRoute(a.point, b.point, a.scene);
      if (cacheable) portalRoutes.set(key, path);
      if (!path) continue;
      let cost = costs[next],
        last = a.point;
      for (const point of path) {
        cost += distance(last, point);
        last = point;
      }
      if (cost < costs[i]) {
        costs[i] = cost;
        previous[i] = next;
        paths.set(i, path);
      }
    }
  }
  if (!Number.isFinite(costs[end])) return null;
  const chain: number[] = [];
  for (let i = end; i !== start; i = previous[i]) {
    if (i < 0) return null;
    chain.unshift(i);
  }
  const legs: CityArtJourneyLeg[] = [];
  let current: CityArtJourneyLeg = { scene: fromScene, path: [] };
  for (const i of chain) {
    if (graph[i].scene !== current.scene) {
      current.nextScene = graph[i].scene;
      legs.push(current);
      current = { scene: graph[i].scene, path: [] };
    } else current.path.push(...(paths.get(i) ?? []));
  }
  legs.push(current);
  return legs;
}
// Match the accepted sample's unhurried pace. The budget is painted distance
// divided by actor size, not schematic city distance or zoomed screen pixels.
export const CITY_PILOT_WALK_SPEED = 66;
export const CITY_PILOT_STRIDE = 70;
export function cityPilotFrameTravel(seconds: number) {
  return Number.isFinite(seconds)
    ? CITY_PILOT_WALK_SPEED * Math.max(0, Math.min(seconds, 0.1))
    : 0;
}
export function cityPilotStrideDistance(
  from: CityPoint,
  to: CityPoint,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  return (
    distance(
      cityPilotPaint(from, mode, scene),
      cityPilotPaint(to, mode, scene),
    ) /
    ((cityArtDepth(from, mode, scene) + cityArtDepth(to, mode, scene)) / 2)
  );
}

/** Spend the same visible walking budget on keys and click routes. Small
 * collision-checked steps and a final bisection cross projection seams without
 * a speed burst, wall shortcut, or an unrequested sideways slide. */
export function advanceCityPilotRoute(
  from: CityPoint,
  path: readonly CityPoint[],
  travel: number,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  let point = { ...from },
    remaining = Number.isFinite(travel) ? Math.max(0, travel) : 0,
    spent = 0,
    used = 0,
    blocked = false;
  for (let count = 0; count < 2048 && used < path.length; count++) {
    const target = path[used],
      gap = distance(point, target);
    if (gap < 1e-7) {
      point = { ...target };
      used++;
      continue;
    }
    if (remaining < 1e-7) break;
    const amount = Math.min(0.5, gap);
    const at = (fraction: number): CityPoint => ({
      x: point.x + ((target.x - point.x) * amount * fraction) / gap,
      y: point.y + ((target.y - point.y) * amount * fraction) / gap,
    });
    const cost = (next: CityPoint) =>
      cityPilotStrideDistance(point, next, mode, scene);
    const next = at(1),
      needed = cost(next),
      clear = cityPilotWalkable(next, 1, scene);
    if (!clear || needed > remaining) {
      let low = 0,
        high = 1;
      for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2,
          candidate = at(mid);
        if (
          !cityPilotWalkable(candidate, 1, scene) ||
          cost(candidate) > remaining
        )
          high = mid;
        else low = mid;
      }
      const contact = at(low),
        charged = cost(contact);
      point = contact;
      spent += charged;
      // A clear step shortened only by this frame's budget is never a wall.
      // Strong doorstep perspective can magnify bisection round-off past 1e-5.
      blocked = !clear && charged < remaining - 1e-5;
      break;
    }
    remaining -= needed;
    spent += needed;
    point = next;
    if (amount === gap) {
      point = { ...target };
      used++;
    }
  }
  return { point, used, spent, blocked };
}

export function advanceCityPilotInput(
  from: CityPoint,
  input: CityPoint,
  travel: number,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  const length = Math.hypot(input.x, input.y);
  if (
    !Number.isFinite(length) ||
    length < 1e-8 ||
    !Number.isFinite(travel) ||
    travel <= 0
  )
    return { point: { ...from }, used: 0, spent: 0, blocked: false };
  const paint = cityPilotPaint(from, mode, scene);
  // Depth is capped at 2.8, so this ray always covers the complete frame budget.
  const reach = travel * 2.8 + 1;
  const path = cityArtPaintedLine(
    from,
    {
      x: paint.x + (input.x / length) * reach,
      y: paint.y + (input.y / length) * reach,
    },
    mode,
    scene,
  );
  return advanceCityPilotRoute(from, path, travel, mode, scene);
}

export function moveCityPilot(
  point: CityPoint,
  screenInput: CityPoint,
  travel: number,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  return advanceCityPilotInput(point, screenInput, travel, mode, scene).point;
}
