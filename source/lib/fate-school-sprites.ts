import data from './fate-school-sprite-data.json';
import { matouSprite } from './fate-matou-sprites';
import type { SchoolActorId } from './fate-school-house';
import {
  mirrorPreviewSprite,
  type PreviewDirection,
  type PreviewSprite,
} from './fate-preview-house';

const seats = {
  shirou: { sit: { x: 27, y: 145 }, read: { x: 25, y: 142 } },
  rin: { sit: { x: 65, y: 165 }, read: { x: 65, y: 164 } },
  sakura: { sit: { x: 160, y: 356 }, read: { x: 140, y: 333 } },
} as const;

/** Uniform variants stay local to the school; approved home outfits remain intact. */
export function schoolSprite(
  actor: SchoolActorId,
  direction: PreviewDirection,
  phase: number,
  pose?: 'sit' | 'read',
): PreviewSprite {
  if (actor === 'sakura') {
    const sprite = matouSprite(actor, direction, phase, pose);
    return pose
      ? { ...sprite, seat: seats.sakura[pose], scale: 245 / sprite.bounds.height }
      : sprite;
  }
  const sheet = data[actor];
  const moving = phase > 0;
  const group = pose || !moving
    ? 'idle'
    : direction === 'left' || direction === 'right'
      ? 'side'
      : direction === 'up' ? 'back' : 'front';
  const index = pose
    ? pose === 'sit' ? 4 : 5
    : !moving
      ? { down: 0, up: 1, left: 2, right: 3 }[direction]
      : (group === 'side' ? 6 : group === 'front' ? 12 : 18) + ((phase - 1) % 6);
  const sprite: PreviewSprite = {
    ...sheet.frames[index]!,
    file: sheet.file,
    imageWidth: sheet.imageWidth,
    imageHeight: sheet.imageHeight,
    scale: sheet.scales[group],
    mirror: false,
    index,
    ...(pose ? { seat: seats[actor][pose] } : {}),
  };
  return !pose && moving && direction === 'right'
    ? mirrorPreviewSprite(sprite)
    : sprite;
}
