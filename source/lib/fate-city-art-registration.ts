import { projectOnSegment, type CityPoint } from './fate-city-layout';
import { HOME_ENTRANCES } from './fate-home-entrances';
import { CITY_ART_MODES, type CityArtMode } from './fate-city-art-camera';
import { CITY_ART_GROUND } from './fate-city-art-view-ground';
import { OLD_STREET_GROUND } from './fate-city-old-ground';
import {
  newCityArtFloor,
  type NewArtScene,
  type ArtFloor,
} from './fate-city-art-new-ground';
import {
  OLD_STREET_CENTERS,
  OLD_BOOKSHOP_DOOR,
  type CityArtScene,
} from './fate-city-art-scenes';

type Pair = { world: CityPoint; paint: CityPoint };
type Face = readonly [number, number, number];
const p = (x: number, y: number): CityPoint => ({ x, y });
const cross = (a: CityPoint, b: CityPoint, c: CityPoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const centers = [
  p(420, 320),
  p(470, 390),
  p(535, 450),
  p(651.0098730606488, 471.9478138222849),
  p(720, 485),
  projectOnSegment(p(780, 449), p(720, 485), p(890.5, 495)),
  p(890.5, 495),
  p(991.460657340094, 548.6074286761561),
  p(1060, 585),
];
function registration(mode: CityArtMode) {
  const {
    centers: imageCenters,
    upper: imageUpper,
    lower: imageLower,
    doors,
  } = CITY_ART_GROUND[mode];
  const pairs: Pair[] = [];
  for (let i = 0; i < centers.length; i++) {
    const a = centers[Math.max(0, i - 1)],
      b = centers[Math.min(centers.length - 1, i + 1)];
    const dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy);
    pairs.push({ world: centers[i], paint: imageCenters[i] });
    const upper =
      i === 3
        ? HOME_ENTRANCES.einzbern.points[0]
        : i === 7
          ? HOME_ENTRANCES.emiya.points[0]
          : p(centers[i].x + (dy / d) * 55, centers[i].y - (dx / d) * 55);
    pairs.push({ world: upper, paint: imageUpper[i] });
    pairs.push({
      world: p(centers[i].x - (dy / d) * 55, centers[i].y + (dx / d) * 55),
      paint: imageLower[i],
    });
  }
  // A road strip keeps adjacent floor triangles on shared edges. Do not form
  // long triangles across the lawn between separate door approaches: those can
  // fold the inverse map and make a clicked sidewalk turn into a wall position.
  const faces: Face[] = [];
  for (let i = 0; i < centers.length - 1; i++) {
    const c = i * 3,
      n = c + 3;
    faces.push(
      [c + 1, c, n + 1],
      [c, n, n + 1],
      [c, c + 2, n],
      [c + 2, n + 2, n],
    );
  }
  for (const [index, home, paint] of [
    [3, 'einzbern', doors.einzbern],
    [7, 'emiya', doors.emiya],
  ] as const) {
    const door = pairs.length;
    pairs.push({ world: HOME_ENTRANCES[home].door, paint });
    const upper = index * 3 + 1;
    faces.push([upper - 3, upper, door], [upper, upper + 3, door]);
  }
  return { pairs, faces };
}
export const CITY_PILOT_REGISTRATIONS = Object.fromEntries(
  CITY_ART_MODES.map((mode) => [mode, registration(mode)]),
) as Record<CityArtMode, { pairs: Pair[]; faces: Face[] }>;
export const CITY_PILOT_REGISTRATION = CITY_PILOT_REGISTRATIONS.overview;
function oldRegistration(mode: CityArtMode) {
  const ground = OLD_STREET_GROUND[mode],
    pairs: Pair[] = [],
    faces: Face[] = [];
  for (let i = 0; i < OLD_STREET_CENTERS.length; i++) {
    const a = OLD_STREET_CENTERS[Math.max(0, i - 1)],
      b = OLD_STREET_CENTERS[Math.min(OLD_STREET_CENTERS.length - 1, i + 1)];
    const dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy),
      center = OLD_STREET_CENTERS[i];
    pairs.push(
      { world: center, paint: ground.centers[i] },
      {
        world: p(center.x + (dy / d) * 50, center.y - (dx / d) * 50),
        paint: ground.east[i],
      },
      {
        world:
          i === 5
            ? HOME_ENTRANCES.waver.points[0]
            : p(center.x - (dy / d) * 50, center.y + (dx / d) * 50),
        paint: ground.west[i],
      },
    );
    if (i) {
      const c = (i - 1) * 3,
        n = i * 3;
      faces.push(
        [c + 1, c, n + 1],
        [c, n, n + 1],
        [c, c + 2, n],
        [c + 2, n + 2, n],
      );
    }
  }
  for (const [index, world, paint] of [
    [3, OLD_BOOKSHOP_DOOR, ground.doors.bookshop],
    [5, HOME_ENTRANCES.waver.door, ground.doors.waver],
  ] as const) {
    const door = pairs.length,
      west = index * 3 + 2;
    pairs.push({ world, paint });
    faces.push([west - 3, door, west], [west, door, west + 3]);
  }
  return { pairs, faces };
}
export const OLD_STREET_REGISTRATIONS = Object.fromEntries(
  CITY_ART_MODES.map((mode) => [mode, oldRegistration(mode)]),
) as typeof CITY_PILOT_REGISTRATIONS;
const newFloors = new Map<string, ArtFloor>();
export function cityArtFloor(mode: CityArtMode, scene: CityArtScene) {
  if (scene === 'residential')
    return { ...CITY_PILOT_REGISTRATIONS[mode], ...CITY_ART_GROUND[mode] };
  if (scene === 'old-street')
    return { ...OLD_STREET_REGISTRATIONS[mode], ...OLD_STREET_GROUND[mode] };
  const key = `${scene}:${mode}`;
  if (!newFloors.has(key))
    newFloors.set(key, newCityArtFloor(scene as NewArtScene, mode));
  return newFloors.get(key)!;
}
const floor = cityArtFloor;
export function cityArtRegistered(
  point: CityPoint,
  inverse = false,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  const { pairs, faces } = floor(mode, scene);
  const key = inverse ? 'paint' : 'world';
  return faces.some(([i, j, k]) => {
    const a = pairs[i][key],
      b = pairs[j][key],
      c = pairs[k][key],
      area = cross(a, b, c);
    const wb = cross(a, point, c) / area,
      wc = cross(a, b, point) / area;
    return wb >= -1e-9 && wc >= -1e-9 && wb + wc <= 1 + 1e-9;
  });
}
export function projectCityArtPoint(
  point: CityPoint,
  inverse = false,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  const { pairs, faces } = floor(mode, scene);
  let best = Infinity,
    result = { ...point };
  for (const [i, j, k] of faces) {
    const source = inverse ? 'paint' : 'world',
      target = inverse ? 'world' : 'paint';
    const a = pairs[i][source],
      b = pairs[j][source],
      c = pairs[k][source];
    const area = cross(a, b, c);
    if (Math.abs(area) < 1e-7) continue;
    const wb = cross(a, point, c) / area,
      wc = cross(a, b, point) / area,
      wa = 1 - wb - wc;
    const penalty = Math.max(0, -wa) + Math.max(0, -wb) + Math.max(0, -wc);
    if (penalty < best) {
      best = penalty;
      result = p(
        wa * pairs[i][target].x +
          wb * pairs[j][target].x +
          wc * pairs[k][target].x,
        wa * pairs[i][target].y +
          wb * pairs[j][target].y +
          wc * pairs[k][target].y,
      );
      if (best < 1e-9) break;
    }
  }
  return result;
}

/** Invert a held screen direction at each shared floor edge. A derivative
 * taken in one triangle cannot be carried into a different doorway triangle. */
export function cityArtPaintedLine(
  from: CityPoint,
  toPaint: CityPoint,
  mode: CityArtMode,
  scene: CityArtScene = 'residential',
): CityPoint[] {
  const start = projectCityArtPoint(from, false, mode, scene);
  const dx = toPaint.x - start.x,
    dy = toPaint.y - start.y;
  const { pairs, faces } = floor(mode, scene);
  const splits = [0, 1],
    edges = new Set<string>();
  for (const face of faces)
    for (let i = 0; i < 3; i++) {
      const j = face[i],
        k = face[(i + 1) % 3];
      const key = j < k ? `${j}:${k}` : `${k}:${j}`;
      if (edges.has(key)) continue;
      edges.add(key);
      const a = pairs[j].paint,
        b = pairs[k].paint;
      const ex = b.x - a.x,
        ey = b.y - a.y,
        determinant = dx * ey - dy * ex;
      if (Math.abs(determinant) < 1e-10) continue;
      const ox = a.x - start.x,
        oy = a.y - start.y;
      const t = (ox * ey - oy * ex) / determinant,
        u = (ox * dy - oy * dx) / determinant;
      if (t > 1e-8 && t < 1 - 1e-8 && u >= -1e-8 && u <= 1 + 1e-8)
        splits.push(t);
    }
  splits.sort((a, b) => a - b);
  const unique = splits.filter((t, i) => !i || t - splits[i - 1] > 1e-8);
  const at = (t: number) => p(start.x + dx * t, start.y + dy * t);
  const path: CityPoint[] = [];
  for (let i = 1; i < unique.length; i++) {
    if (
      !cityArtRegistered(at((unique[i - 1] + unique[i]) / 2), true, mode, scene)
    )
      break;
    const paint = at(unique[i]),
      world = projectCityArtPoint(paint, true, mode, scene),
      back = projectCityArtPoint(world, false, mode, scene);
    if (Math.hypot(back.x - paint.x, back.y - paint.y) > 1e-6) break;
    path.push(world);
  }
  return path;
}

export function onCityArtPaving(
  point: CityPoint,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  return cityArtFloor(mode, scene).paving.some((polygon) => {
    if (
      polygon.some(
        (a, i) =>
          Math.hypot(
            point.x -
              projectOnSegment(point, a, polygon[(i + 1) % polygon.length]).x,
            point.y -
              projectOnSegment(point, a, polygon[(i + 1) % polygon.length]).y,
          ) < 1e-7,
      )
    )
      return true;
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
  });
}

/** Perspective scale follows the painted ground height continuously, including
 * at shared triangle edges. Sprite animation never changes the foot anchor. */
export function cityArtDepth(
  point: CityPoint,
  mode: CityArtMode = 'overview',
  scene: CityArtScene = 'residential',
) {
  if (mode === 'overview') return 1;
  const { horizon, heightReference } = cityArtFloor(mode, scene);
  return Math.max(
    0.4,
    Math.min(
      2.8,
      (projectCityArtPoint(point, false, mode, scene).y - horizon) /
        heightReference,
    ),
  );
}
