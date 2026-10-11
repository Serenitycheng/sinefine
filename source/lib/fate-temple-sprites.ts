import data from './fate-temple-sprite-data.json';
import poses from './fate-temple-pose-data.json';
import type { TempleActorId } from './fate-temple-house';
import {
  mirrorPreviewSprite,
  type PreviewDirection,
  type PreviewSprite,
} from './fate-preview-house';

export function templeSprite(
  actor: TempleActorId,
  direction: PreviewDirection,
  phase: number,
  pose?: 'sit' | 'read',
): PreviewSprite {
  if (pose) {
    const sheet = poses[actor],
      index = pose === 'sit' ? 0 : 1;
    return {
      ...sheet.frames[index],
      file: sheet.file,
      imageWidth: sheet.imageWidth,
      imageHeight: sheet.imageHeight,
      scale: sheet.scale,
      mirror: false,
      index,
    };
  }
  const sheet = data[actor],
    moving = phase > 0;
  const group = !moving
    ? 'idle'
    : direction === 'left' || direction === 'right'
      ? 'side'
      : direction === 'up'
        ? 'back'
        : 'front';
  const index = !moving
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
  };
  return moving && direction === 'right' ? mirrorPreviewSprite(sprite) : sprite;
}
