import type { CityPoint } from './fate-city-layout';
import { cityArtScenePlaces, type CityArtPlace } from './fate-city-art-map';
import { CITY_ART_SCENE_IDS, type CityArtScene } from './fate-city-art-scenes';
import { cityArtJourney, cityPilotWalkable } from './fate-city-art-navigation';

export type CityArtDestinationRequest =
  | { type: 'place'; id: string }
  | { type: 'point'; point: CityPoint };

/** Map labels resolve to the same real thresholds as street wayfinding. */
export function cityArtMapDestination(
  request: CityArtDestinationRequest,
  current: CityArtScene,
): {
  scene: CityArtScene;
  point: CityPoint;
  place: CityArtPlace | null;
} | null {
  const scenes = [
    current,
    ...CITY_ART_SCENE_IDS.filter((id) => id !== current),
  ];
  for (const scene of scenes) {
    if (request.type === 'place') {
      const place = cityArtScenePlaces(scene).find((p) => p.id === request.id);
      if (place && cityPilotWalkable(place.point, 1, scene))
        return { scene, point: { ...place.point }, place };
    } else if (cityPilotWalkable(request.point, 1, scene)) {
      return { scene, point: { ...request.point }, place: null };
    }
  }
  return null;
}

export function cityArtMapJourney(
  scene: CityArtScene,
  from: CityPoint,
  request: CityArtDestinationRequest,
) {
  const destination = cityArtMapDestination(request, scene);
  if (!destination) return null;
  const legs = cityArtJourney(
    scene,
    from,
    destination.scene,
    destination.point,
  );
  return legs ? { destination, legs } : null;
}
