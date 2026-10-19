import { cityPilotPaint } from './fate-city-art';
import type { CityArtMode } from './fate-city-art-camera';
import type { CityArtScene } from './fate-city-art-scenes';
import type { CityPoint } from './fate-city-layout';
import {
  cityWalkFacing,
  type CityWalkDirection,
} from './fate-city-art-controls';
import { ILLYA_DISPLAY_SCALE } from './fate-actor-proportions';
import { bodyFacing, type BodyFacing } from './fate-body-facing';

/** Both observers and players face the displacement in the current painting. */
export function cityActorMotion(
  from: CityPoint,
  to: CityPoint,
  mode: CityArtMode,
  scene: CityArtScene,
  previous: CityWalkDirection,
  actorScale: number,
  previousBody: BodyFacing = previous,
) {
  const a = cityPilotPaint(from, mode, scene),
    b = cityPilotPaint(to, mode, scene);
  const delta = { x: b.x - a.x, y: b.y - a.y };
  return {
    direction: cityWalkFacing(delta, previous),
    bodyFacing: bodyFacing(delta, previousBody),
    // Match the existing indoor gait in model units, including perspective.
    travel:
      (Math.hypot(delta.x, delta.y) * ILLYA_DISPLAY_SCALE) /
      Math.max(0.01, actorScale),
  };
}
