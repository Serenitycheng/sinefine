import gait from './fate-shirou-gait-data.json';
import original from './fate-emiya-sprite-data.json';
import saber from './fate-saber-sprite-data.json';
import visitors from './fate-emiya-visitor-data.json';
import { EMIYA_ROOMS, type EmiyaLocation } from './fate-emiya-house';
import { interiorDepth, interiorProject } from './fate-city-interior-scenes';
import type { CityWalkDirection } from './fate-city-art-controls';

export const SHIROU_SIDE_GAIT = gait;
const frontCycle = [1, 2, 0, 4, 3, 5];
export const SABER_GAIT = {
  frames: 5,
  cycleDistance: gait.cycleDistance * (295 / 306),
};
export const EMIYA_VISITOR_SPRITES = visitors.characters;

export function emiyaVisitorSprite(
  id: 'sakura' | 'taiga',
  direction: CityWalkDirection,
  phase: number,
) {
  const sheet = EMIYA_VISITOR_SPRITES[id];
  const moving = sheet.walking[direction];
  return {
    sheet,
    frame:
      phase > 0
        ? moving.frames[(Math.trunc(phase) - 1) % moving.frames.length]
        : sheet.idle[direction],
    scale: phase > 0 ? moving.scale : sheet.idleScale,
    mirror: phase > 0 ? moving.mirror : sheet.idleMirrors[direction],
  };
}

/** The sheet retains its pose proportions across frames and directions. */
export function saberWalkSprite(direction: CityWalkDirection, phase: number) {
  return {
    sheet: saber.walking,
    frame:
      saber.walking.frames[direction][
        phase > 0 ? 1 + ((Math.trunc(phase) - 1) % SABER_GAIT.frames) : 0
      ],
    scale: 295 / saber.walking.frames.down[0].bounds.height,
  };
}

/** Six alternating contact/support/passing phases; standing is independent.
 * One scale per row keeps natural pose height changes instead of stretching
 * every frame to the same silhouette height. */
export function shirouWalkSprite(direction: CityWalkDirection, phase: number) {
  const side = phase > 0 && (direction === 'left' || direction === 'right');
  const sheet = side ? gait : original.walking;
  const index = Math.max(0, Math.trunc(phase) - 1) % 6;
  const frame = side
    ? gait.frames[index]
    : original.walking.frames[direction][phase > 0 ? frontCycle[index] : 0];
  const mirror = side && direction === 'right';
  return {
    sheet,
    frame,
    mirror,
    anchorX: mirror ? frame.width - frame.anchorX : frame.anchorX,
    scale: side
      ? gait.scale
      : 306 / original.walking.frames[direction][0].bounds.height,
  };
}

/** Convert real collision-safe ground travel into the sprite's model units.
 * Ground projection and body depth share one scale; zoom, camera motion and
 * the screen jump across a door cannot add phantom steps. */
export function emiyaWalkAdvance(
  walked: number,
  before: EmiyaLocation,
  travelled: number,
  cycle = { frames: 6, cycleDistance: gait.cycleDistance },
) {
  if (!Number.isFinite(travelled) || travelled <= 0.001)
    return { walked: 0, frame: 0 };
  const floor = EMIYA_ROOMS[before.room].scene.floor;
  const at = interiorProject(before.point, floor);
  const next = interiorProject(
    { x: before.point.x + 1, y: before.point.y },
    floor,
  );
  const unit =
    Math.hypot(next.x - at.x, next.y - at.y) /
    interiorDepth(before.point, floor);
  const distance =
    (Number.isFinite(walked) ? Math.max(0, walked) : 0) + travelled * unit;
  return {
    walked: distance,
    frame:
      1 +
      (Math.floor((distance / cycle.cycleDistance) * cycle.frames) %
        cycle.frames),
  };
}
