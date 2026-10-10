import data from './fate-matou-sprite-data.json';
import poses from './fate-matou-pose-data.json';
import { emiyaVisitorSprite } from './fate-emiya-walk';
import type { MatouActorId } from './fate-matou-house';
import {
  mirrorPreviewSprite,
  type PreviewDirection,
  type PreviewSprite,
} from './fate-preview-house';

/** Reuse Sakura's real registered crops; do not reinterpret her uneven sheet as a grid. */
export function matouSprite(
  actor: MatouActorId,
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
  if (actor === 'sakura') {
    const { sheet, frame, mirror, scale } = emiyaVisitorSprite(
      actor,
      direction,
      phase,
    );
    const sprite: PreviewSprite = {
      file: sheet.path,
      imageWidth: sheet.width,
      imageHeight: sheet.height,
      cellWidth: frame.width,
      cellHeight: frame.height,
      cropX: frame.x,
      cropY: frame.y,
      anchorX: frame.anchorX,
      anchorY: frame.anchorY,
      bounds: frame.bounds,
      mirror: false,
      scale,
      index:
        phase > 0
          ? 4 + sheet.walking[direction].frames.indexOf(frame)
          : ['down', 'up', 'left', 'right'].indexOf(direction),
    };
    return mirror ? mirrorPreviewSprite(sprite) : sprite;
  }
  const sheet = data[actor],
    moving = phase > 0;
  if (
    actor === 'kariya' &&
    moving &&
    (direction === 'left' || direction === 'right')
  ) {
    const side = data.kariya.side,
      index = (phase - 1) % 6;
    const sprite: PreviewSprite = {
      ...side.frames[index],
      file: side.file,
      imageWidth: side.imageWidth,
      imageHeight: side.imageHeight,
      scale: side.scale,
      mirror: false,
      index: 6 + index,
    };
    return direction === 'right' ? mirrorPreviewSprite(sprite) : sprite;
  }
  const group = !moving
    ? 'idle'
    : direction === 'left' || direction === 'right'
      ? 'side'
      : direction === 'up'
        ? 'back'
        : 'front';
  const index = !moving
    ? { down: 0, up: 1, left: 2, right: 3 }[direction]
    : group === 'side'
      ? 6 + ((phase - 1) % 6)
      : 12 + (direction === 'up' ? 3 : 0) + ((phase - 1) % 3);
  const sprite: PreviewSprite = {
    ...sheet.frames[index],
    file: sheet.file,
    imageWidth: sheet.imageWidth,
    imageHeight: sheet.imageHeight,
    scale: sheet.scales[group],
    mirror: false,
    index,
  };
  return moving && direction === 'right' ? mirrorPreviewSprite(sprite) : sprite;
}
