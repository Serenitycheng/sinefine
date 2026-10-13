import { FORMAL_HOUSE_PLANS } from './fate-formal-house-plans';
import { CITY_LOCAL_PLACES } from './fate-city-art';
import {
  DISTRICT_LANDMARKS,
  DISTRICT_PLACES,
  districtSceneImage,
  type DistrictLandmark,
} from './fate-district';
import { HOME_ENTRANCES } from './fate-home-entrances';
import { isHomeId } from './fate-housing';
import { nearHomeEntrance } from './fate-indoor-map';
import type { Point } from './street';

export type HouseSiteId = keyof typeof FORMAL_HOUSE_PLANS;
export const FORMAL_PUBLIC_SITES = [
  'school',
  'cafe',
  'shops',
  'miyama-florist',
  'old-bookshop',
  'miyama-bakery',
  'old-repair',
  'shinto-convenience',
] as const;
export type FormalPublicSiteId = (typeof FORMAL_PUBLIC_SITES)[number];
export function isFormalSite(value: unknown): value is HouseSiteId {
  return typeof value === 'string' && Object.hasOwn(FORMAL_HOUSE_PLANS, value);
}
export function isFormalPublicSite(
  value: unknown,
): value is FormalPublicSiteId {
  return FORMAL_PUBLIC_SITES.some((id) => id === value);
}
/** Reuse the art map's original shop IDs and doors without changing life-place IDs. */
export const FORMAL_LANDMARKS: DistrictLandmark[] = [
  ...DISTRICT_LANDMARKS,
  ...CITY_LOCAL_PLACES.map((place) => ({
    id: place.id,
    name: place.name,
    ...(place.entrance ?? place.point),
    kind: 'public' as const,
  })),
];
export function formalPlaceImage(place: DistrictLandmark) {
  return CITY_LOCAL_PLACES.some((local) => local.id === place.id) &&
    isFormalSite(place.id)
    ? FORMAL_HOUSE_PLANS[place.id].rooms.hall.scene.painting
    : districtSceneImage(place);
}
export function formalEntrance(site: HouseSiteId): Point {
  if (isHomeId(site)) return HOME_ENTRANCES[site].door;
  const local = CITY_LOCAL_PLACES.find((place) => place.id === site);
  const point = local
    ? (local.entrance ?? local.point)
    : DISTRICT_PLACES[site as 'school' | 'cafe' | 'shops'];
  return { x: point.x, y: point.y };
}
export function nearFormalEntrance(point: Point, site: HouseSiteId) {
  if (isHomeId(site)) return nearHomeEntrance(point, site);
  const door = formalEntrance(site);
  return Math.hypot(point.x - door.x, point.y - door.y) <= 75;
}
