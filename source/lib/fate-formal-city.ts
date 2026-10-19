import type { RefObject } from 'react';
import type { Actor, ActorId, Point } from './street';
import type { WaverStage } from './fate-cast';
import {
  CITY_ART_SCENE_IDS,
  CITY_ART_SCENES,
  type CityArtScene,
} from './fate-city-art-scenes';
import { cityPilotWalkable } from './fate-city-art-navigation';
import { projectOnSegment } from './fate-city-layout';

/** Presentation bridge only: the formal street remains the sole life/save owner. */
export type FormalCityBridge = {
  actors: RefObject<Actor[]>;
  active: ActorId;
  control: boolean;
  blocked: boolean;
  stage: WaverStage;
  walkPace: number;
  input: RefObject<Point>;
  inside: (id: ActorId) => boolean;
  interact: () => void;
  loaded: (ready: boolean) => void;
  interactionLabel?: string;
  enter: (id: string) => void;
  moved: (
    point: Point,
    direction: 'down' | 'left' | 'right' | 'up',
    frame: number,
  ) => void;
};

/** Classify existing world coordinates without translating or rewriting saves. */
export function formalCityScene(
  point: Point,
  preferred?: CityArtScene,
): CityArtScene {
  if (preferred && cityPilotWalkable(point, 1, preferred)) return preferred;
  const cost = (id: CityArtScene) => {
    const points = CITY_ART_SCENES[id].points;
    return Math.min(
      ...points.slice(1).map((p, index) => {
        const foot = projectOnSegment(point, points[index], p);
        return Math.hypot(foot.x - point.x, foot.y - point.y);
      }),
    );
  };
  const candidates = CITY_ART_SCENE_IDS.filter((id) =>
    cityPilotWalkable(point, 1, id),
  );
  return [...(candidates.length ? candidates : CITY_ART_SCENE_IDS)].sort(
    (a, b) => cost(a) - cost(b),
  )[0];
}
