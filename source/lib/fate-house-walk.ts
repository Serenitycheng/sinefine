import type { ActorId } from './street';
import {
  interiorDepth,
  interiorProject,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import type { CityPoint } from './fate-city-layout';
import {
  CHARACTER_WORLD_SCALE,
  ILLYA_DISPLAY_SCALE,
} from './fate-actor-proportions';

/** Measure travel in painted model units, independent of zoom and floor depth. */
export function houseWalkDistance(
  from: CityPoint,
  to: CityPoint,
  floor: CityInteriorScene['floor'],
) {
  const a = interiorProject(from, floor),
    b = interiorProject(to, floor);
  const depth = (interiorDepth(from, floor) + interiorDepth(to, floor)) / 2;
  return Math.hypot(b.x - a.x, b.y - a.y) / Math.max(0.01, depth);
}

/** A full left/right stride, rather than a timer which keeps stepping at a wall. */
export function houseGaitFrame(
  actor: ActorId | undefined,
  distance: number,
  moving: boolean,
  frames = 6,
) {
  if (!moving || !Number.isFinite(distance)) return 0;
  const cycle =
    actor === 'kiritsugu'
      ? 190 * CHARACTER_WORLD_SCALE
      : actor === 'illya'
        ? 175 * ILLYA_DISPLAY_SCALE
        : 220 * CHARACTER_WORLD_SCALE;
  const phase = ((Math.max(0, distance) / cycle) * frames) % frames;
  // Formal six-phase bodies are deformable rigs, so preserve the fraction.
  // The legacy five-cell atlas still needs an integer crop index.
  return 1 + (frames === 6 || actor === 'kiritsugu' ? phase : Math.floor(phase));
}

/** Ground distance drives the gait, including user pace changes and collisions. */
export function houseWalkSpeed(actor?: ActorId) {
  return actor === 'kiritsugu' ? 135 : 185;
}

export function houseWalkPhase(
  actor: ActorId | undefined,
  travelled: number,
  moving: boolean,
  frames = 6,
) {
  if (!moving) return 0;
  const distancePerFrame = actor === 'kiritsugu' ? 26 : 22;
  if (actor === 'kiritsugu')
    return 1 + ((Math.max(0, travelled) / distancePerFrame) % frames);
  return 1 + (Math.floor(Math.max(0, travelled) / distancePerFrame) % frames);
}
