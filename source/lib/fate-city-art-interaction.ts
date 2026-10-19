import type { CityPoint } from './fate-city-layout';
import type { CityArtScene } from './fate-city-art-scenes';
import { cityArtScenePlaces, type CityArtPlace } from './fate-city-art-map';
import { cityPilotLine } from './fate-city-art-navigation';

/** The entrance prompt and E use exactly the same unobstructed approach. */
export function cityArtNearbyPlace(
  point: CityPoint,
  scene: CityArtScene,
  places: readonly CityArtPlace[] = cityArtScenePlaces(scene),
) {
  return (
    places
      .map((place) => ({
        place,
        distance: Math.hypot(point.x - place.point.x, point.y - place.point.y),
      }))
      .filter(
        (item) =>
          item.distance < 22 && cityPilotLine(point, item.place.point, scene),
      )
      .sort((a, b) => a.distance - b.distance)[0]?.place ?? null
  );
}
