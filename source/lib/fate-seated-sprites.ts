import type { PreviewAction, PreviewSprite } from './fate-preview-house';
import { mirrorPreviewSprite } from './fate-preview-house';
import { bodyPoseFacing } from './fate-body-art';

// Hip landmarks in each approved crop. Values are fractions of its alpha bounds,
// not a universal foot offset; long hair and coats are intentionally excluded.
const hips: Record<string, readonly [number, number, number, number]> = {
  rin: [0.68, 0.64, 0.69, 0.65],
  tokiomi: [0.73, 0.67, 0.73, 0.69],
  gilgamesh: [0.7, 0.65, 0.7, 0.67],
  emiya: [0.73, 0.68, 0.73, 0.7],
  sakura: [0.66, 0.7, 0.69, 0.7],
  medusa: [0.53, 0.66, 0.53, 0.67],
  kariya: [0.73, 0.66, 0.73, 0.67],
  kiritsugu: [0.3, 0.62, 0.3, 0.61],
  irisviel: [0.47, 0.65, 0.47, 0.65],
  waver: [0.7, 0.66, 0.7, 0.65],
  iskandar: [0.7, 0.66, 0.7, 0.68],
  cu: [0.34, 0.61, 0.34, 0.61],
  kirei: [0.24, 0.63, 0.24, 0.63],
};
const rightFacing = new Set(['kiritsugu', 'irisviel', 'cu', 'kirei']);

export function registeredSeatedSprite(
  id: string,
  sprite: PreviewSprite,
  pose: 'sit' | 'read',
): PreviewSprite {
  const hip = hips[id];
  // School/visitor crops have their own registered landmarks and orientation.
  if (!hip || (sprite.seat && id !== 'waver' && id !== 'kiritsugu'))
    return sprite;
  const b = sprite.bounds,
    offset = pose === 'sit' ? 0 : 2;
  return {
    ...sprite,
    seat: {
      x: b.x + b.width * (sprite.mirror ? 1 - hip[offset] : hip[offset]),
      y: b.y + b.height * hip[offset + 1],
    },
    seatedFacing: rightFacing.has(id) !== sprite.mirror ? 'right' : 'left',
  };
}

/** Orient toward the authored chair/desk without rotating a flat body image. */
export function seatedSpriteForAction(
  sprite: PreviewSprite,
  action?: PreviewAction | null,
) {
  if (sprite.materialVersion === 'body-v2' && sprite.seatedFacing) {
    const facing =
      action?.facing ??
      (action?.mirror
        ? sprite.seatedFacing === 'left'
          ? 'right'
          : 'left'
        : sprite.seatedFacing);
    return bodyPoseFacing(sprite, facing);
  }
  const mirror =
    action?.facing && sprite.seatedFacing
      ? action.facing !== sprite.seatedFacing
      : action?.mirror;
  return mirror ? mirrorPreviewSprite(sprite) : sprite;
}
