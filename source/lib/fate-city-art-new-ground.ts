import { CITY_ART_SCENES, type CityArtScene } from './fate-city-art-scenes';
import { HOME_ENTRANCES } from './fate-home-entrances';
import { projectOnSegment, type CityPoint } from './fate-city-layout';
import type { CityArtMode } from './fate-city-art-camera';
import measurements from './fate-city-art-ground-data.json';

export type NewArtScene = Exclude<CityArtScene, 'residential' | 'old-street'>;
export type ArtFloor = {
  pairs: { world: CityPoint; paint: CityPoint }[];
  faces: [number, number, number][];
  paving: CityPoint[][];
  horizon: number;
  heightReference: number;
};
type Measurement = {
  centers: number[][];
  upper: number[][];
  lower: number[][];
  doors?: Record<string, number[]>;
  horizon?: number;
  heightReference?: number;
};
const point = (xy: readonly number[]): CityPoint => ({ x: xy[0], y: xy[1] });
const dist = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const mix = (a: CityPoint, b: CityPoint, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const reverse = new Set<NewArtScene>(['west-residential', 'temple-path']);
const cross = (a: CityPoint, b: CityPoint, c: CityPoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export function newCityArtFloor(
  scene: NewArtScene,
  mode: CityArtMode,
): ArtFloor {
  const config = CITY_ART_SCENES[scene];
  const road = reverse.has(scene)
    ? [...config.points].reverse()
    : [...config.points];
  const measure = (
    measurements as unknown as Record<
      NewArtScene,
      Record<CityArtMode, Measurement>
    >
  )[scene][mode];
  const lengths = [0];
  for (let i = 1; i < road.length; i++)
    lengths.push(lengths[i - 1] + dist(road[i - 1], road[i]));
  const total = lengths.at(-1)!;
  const radius = config.width / 2;
  const normals = road.slice(1).map((b, i) => {
    const a = road[i],
      n = dist(a, b);
    return { x: (b.y - a.y) / n, y: -(b.x - a.x) / n };
  });
  const offsets = road.map((_, i) => {
    const a = normals[Math.max(0, i - 1)],
      b = normals[Math.min(normals.length - 1, i)];
    const x = a.x + b.x,
      y = a.y + b.y,
      den = x * b.x + y * b.y;
    return den < 1e-6
      ? { x: b.x * radius, y: b.y * radius }
      : { x: (x / den) * radius, y: (y / den) * radius };
  });
  const at = (s: number) => {
    let i = 0;
    while (i < road.length - 2 && lengths[i + 1] < s) i++;
    return mix(
      road[i],
      road[i + 1],
      (s - lengths[i]) / (lengths[i + 1] - lengths[i]),
    );
  };
  const closest = (p: CityPoint) => {
    const options = road.slice(1).map((b, i) => {
      const foot = projectOnSegment(p, road[i], b);
      return {
        point: foot,
        s: lengths[i] + dist(road[i], foot),
        d: dist(p, foot),
      };
    });
    return options.sort((a, b) => a.d - b.d)[0];
  };
  const entries = config.privateApproach
    ? []
    : config.homes.map((home) => ({
        home,
        entry: HOME_ENTRANCES[home],
        projection: closest(HOME_ENTRANCES[home].points[0]),
      }));
  const padding = config.privateApproach ? 4 : radius;
  const station = [
    -padding,
    ...lengths,
    total + padding,
    ...entries.map((e) => e.projection.s),
  ];
  // Long paths get intermediate stations; tight corners use the same mitered
  // cross-section in every camera, rather than changing collision with view.
  for (let s = 65; s < total; s += 65) station.push(s);
  station.sort((a, b) => a - b);
  const stations = station.filter((s, i) => !i || s - station[i - 1] > 1e-5);
  const guide = (kind: 'centers' | 'upper' | 'lower', s: number): CityPoint => {
    if (kind !== 'centers' && (s < 0 || s > total)) {
      const end = s < 0 ? 0 : measure[kind].length - 1;
      const base = guide('centers', s),
        center = point(measure.centers[end]),
        edge = point(measure[kind][end]);
      return { x: base.x + edge.x - center.x, y: base.y + edge.y - center.y };
    }
    const list = measure[kind].map(point),
      f = (s / total) * (list.length - 1),
      i = Math.max(0, Math.min(list.length - 2, Math.floor(f)));
    return mix(list[i], list[i + 1], f - i);
  };
  const pairs: ArtFloor['pairs'] = [],
    faces: ArtFloor['faces'] = [],
    paving: CityPoint[][] = [];
  for (const s of stations) {
    const world = at(s);
    let segment = 0;
    while (segment < road.length - 2 && lengths[segment + 1] < s) segment++;
    const t = Math.max(
      0,
      Math.min(
        1,
        (s - lengths[segment]) / (lengths[segment + 1] - lengths[segment]),
      ),
    );
    const offset = mix(offsets[segment], offsets[segment + 1], t);
    const upper = { x: world.x + offset.x, y: world.y + offset.y };
    pairs.push(
      { world, paint: guide('centers', s) },
      { world: upper, paint: guide('upper', s) },
      {
        world: { x: world.x - offset.x, y: world.y - offset.y },
        paint: guide('lower', s),
      },
    );
  }
  for (let i = 0; i < stations.length - 1; i++) {
    const c = i * 3,
      n = c + 3;
    faces.push(
      [c + 1, c, n + 1],
      [c, n, n + 1],
      [c, c + 2, n],
      [c + 2, n + 2, n],
    );
  }
  for (const { home, entry, projection } of entries) {
    const row = stations.findIndex((s) => Math.abs(s - projection.s) < 1e-5);
    const doorPaint = measure.doors?.[home];
    if (!doorPaint)
      throw new Error(`Missing painted doorstep: ${scene}/${mode}/${home}`);
    const door = pairs.length;
    pairs.push({ world: entry.door, paint: point(doorPaint) });
    // Each apron shares the actual road boundary. Physics still restricts the
    // route to HOME_ENTRANCES, so this fan cannot cut across an adjacent wall.
    const reach =
      scene === 'west-residential' || scene === 'temple-path' ? 2 : 1;
    for (
      let i = Math.max(0, row - reach);
      i < Math.min(stations.length - 1, row + reach);
      i++
    )
      faces.push([i * 3 + 1, (i + 1) * 3 + 1, door]);
  }
  // Collapsed corner triangles are ignored, never used for inverse input.
  const valid = faces.filter(
    ([a, b, c]) =>
      Math.abs(cross(pairs[a].world, pairs[b].world, pairs[c].world)) > 1e-6 &&
      Math.abs(cross(pairs[a].paint, pairs[b].paint, pairs[c].paint)) > 1e-6,
  );
  // The hand-painted centerline need not bisect a cross-section. Using an
  // outer quad would cut off its curved edge and falsely block the road.
  paving.push(...valid.map((face) => face.map((index) => pairs[index].paint)));
  return {
    pairs,
    faces: valid,
    paving,
    horizon:
      measure.horizon ?? (mode === 'eye' ? 430 : mode === 'along' ? 200 : 0),
    heightReference:
      measure.heightReference ??
      (mode === 'eye' ? 185 : mode === 'along' ? 300 : 1),
  };
}
