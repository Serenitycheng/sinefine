import data from './fate-tohsaka-sprite-data.json';
import poses from './fate-tohsaka-pose-data.json';
import archerClips from './fate-emiya-frame-clips.json';
import nativeClips from './fate-tohsaka-frame-clips.json';
import type { TohsakaActorId } from './fate-tohsaka-house';
type Direction = 'up' | 'down' | 'left' | 'right';
type Clip = { x: number; y: number; width: number; height: number };
const registeredClips = nativeClips as {
  walk: Record<string, Record<string, Clip>>;
  pose: Record<string, Record<string, Clip>>;
};
const polygon = (c: Clip) => [
  [c.x, c.y],
  [c.x + c.width, c.y],
  [c.x + c.width, c.y + c.height],
  [c.x, c.y + c.height],
];

/** Actual pixel frames. Side gait is six native phases; right is mirrored.
 * Front/back have three native phases reused twice, never claimed as six drawings. */
export function tohsakaSprite(
  actor: TohsakaActorId,
  direction: Direction,
  phase: number,
  pose?: 'sit' | 'read',
) {
  if (pose) {
    const sheet = poses[actor],
      index = pose === 'sit' ? 0 : 1;
    return {
      ...sheet.frames[index],
      ...sheet,
      ...(registeredClips.pose[actor]?.[index]
        ? { clip: polygon(registeredClips.pose[actor][index]) }
        : {}),
      frames: undefined,
      index,
      mirror: false,
      columns: 4,
      rows: 2,
    };
  }
  const sheet = data[actor];
  const moving = phase > 0;
  const index = !moving
    ? { down: 0, up: 1, left: 2, right: 3 }[direction]
    : direction === 'left' || direction === 'right'
      ? 6 + ((phase - 1) % 6)
      : 12 + (direction === 'up' ? 3 : 0) + ((phase - 1) % 3);
  const frame = sheet.frames[index];
  const clip =
    actor === 'emiya'
      ? (
          archerClips as Record<
            string,
            { x: number; y: number; width: number; height: number }
          >
        )[index]
      : registeredClips.walk[actor]?.[index];
  const bounds = clip ?? frame.bounds;
  const mirror = moving && direction === 'right';
  return {
    ...frame,
    ...sheet,
    frames: undefined,
    index,
    mirror,
    anchorX: mirror ? sheet.cellWidth - frame.anchorX : frame.anchorX,
    ...(clip
      ? {
          clip: [
            [clip.x, clip.y],
            [clip.x + clip.width, clip.y],
            [clip.x + clip.width, clip.y + clip.height],
            [clip.x, clip.y + clip.height],
          ],
        }
      : {}),
    bounds: mirror
      ? {
          ...bounds,
          x: sheet.cellWidth - bounds.x - bounds.width,
        }
      : bounds,
    columns: 6,
    rows: 3,
  };
}
