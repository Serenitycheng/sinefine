import { CITY_ART_PLACES, CITY_LOCAL_PLACES } from './fate-city-art';
import { CITY_ART_SCENES, type CityArtScene } from './fate-city-art-scenes';
import { cityArtExits } from './fate-city-art-portals';
import { HOME_ENTRANCES } from './fate-home-entrances';
import type { CityPoint } from './fate-city-layout';

export const CITY_ART_RIVER_PATH =
  'M1520 85Q1545 370 1500 725L1500 1510Q1655 1610 1740 1780L1810 1780Q1728 1510 1770 1390L1770 900Q1792 650 1745 370L1720 110Z';
export const CITY_ART_SEA_PATH =
  'M-500-100H3700V140Q2900 72 2350 100T1500 120T-500 85Z';

/** The atlas, street guides and local map share real thresholds, not labels. */
export function cityArtScenePlaces(scene: CityArtScene) {
  const config = CITY_ART_SCENES[scene];
  return [
    ...CITY_ART_PLACES.filter(
      (place) =>
        config.homes.some((id) => id === place.id) ||
        config.publicPlaces?.includes(place.id),
    ).map((place) => ({
      id: place.id,
      name: place.name,
      point: place.entrance,
      kind: place.kind === 'home' ? ('home' as const) : ('public' as const),
      note:
        place.id === 'park'
          ? '河岸公园是室外地点，可继续沿林荫路行走。'
          : '已到真实门口，可以进入这处建筑的主要室内。',
    })),
    ...CITY_LOCAL_PLACES.filter((place) =>
      config.locals.includes(place.id),
    ).map((place) => ({
      ...place,
      point: place.entrance ?? place.point,
      kind: 'local' as const,
    })),
  ];
}
export type CityArtPlace = ReturnType<typeof cityArtScenePlaces>[number];

export function cityArtMapBounds(scene: CityArtScene, point: CityPoint) {
  const config = CITY_ART_SCENES[scene];
  const points = [
    point,
    ...config.points,
    ...config.homes.flatMap((home) => HOME_ENTRANCES[home].points),
    ...config.extraApproaches.flat(),
    ...cityArtScenePlaces(scene).map((place) => place.point),
    ...cityArtExits(scene).map((exit) => exit.point),
  ];
  const left = Math.min(...points.map((p) => p.x)) - 75;
  const top = Math.min(...points.map((p) => p.y)) - 75;
  const right = Math.max(...points.map((p) => p.x)) + 75;
  const bottom = Math.max(...points.map((p) => p.y)) + 75;
  const width = Math.max(420, right - left, (bottom - top) * 1.6);
  const height = width / 1.6;
  return {
    x: (left + right - width) / 2,
    y: (top + bottom - height) / 2,
    width,
    height,
  };
}

/** Screen-space guide labels remain reachable when their threshold is offscreen. */
export function cityArtGuidePosition(
  screen: CityPoint,
  size: { width: number; height: number },
) {
  const edge = Math.min(76, size.width / 4);
  const top = Math.min(size.width <= 520 ? 135 : 190, size.height - 50);
  const bottom = Math.max(top, size.height - 118);
  const x = Math.max(edge, Math.min(size.width - edge, screen.x));
  const y = Math.max(top, Math.min(bottom, screen.y - 42));
  return { x, y, pinned: Math.hypot(x - screen.x, y + 42 - screen.y) > 2 };
}

export function cityArtGuidePositions(
  screens: readonly CityPoint[],
  size: { width: number; height: number },
  actor?: { x: number; y: number; width: number; height: number },
) {
  const edge = Math.min(76, size.width / 4);
  const top = cityArtGuidePosition({ x: 0, y: -10000 }, size).y;
  const bottom = cityArtGuidePosition({ x: 0, y: 10000 }, size).y;
  const occupied: CityPoint[] = [];
  const coversActor = (p: CityPoint) =>
    Boolean(
      actor &&
      p.x + 75 > actor.x &&
      p.x - 75 < actor.x + actor.width &&
      p.y + 17 > actor.y &&
      p.y - 17 < actor.y + actor.height,
    );
  return screens.map((screen) => {
    const wanted = cityArtGuidePosition(screen, size);
    const xs = [wanted.x, edge, size.width - edge];
    for (let x = edge + 150; x < size.width - edge; x += 150) xs.push(x);
    const ys = [wanted.y, bottom];
    for (let y = top; y < bottom; y += 36) ys.push(y);
    const candidates = xs
      .flatMap((x) => ys.map((y) => ({ x, y })))
      .sort(
        (a, b) =>
          Math.hypot(a.x - wanted.x, a.y - wanted.y) -
          Math.hypot(b.x - wanted.x, b.y - wanted.y),
      );
    const mark =
      candidates.find(
        (p) =>
          !coversActor(p) &&
          !occupied.some(
            (q) => Math.abs(p.x - q.x) < 150 && Math.abs(p.y - q.y) < 34,
          ),
      ) ??
      candidates.find((p) => !coversActor(p)) ??
      wanted;
    occupied.push(mark);
    return {
      ...mark,
      pinned: Math.hypot(mark.x - screen.x, mark.y + 42 - screen.y) > 2,
    };
  });
}
