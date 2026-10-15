import data from './fate-einzbern-sprite-data.json';
import poses from './fate-einzbern-pose-data.json';
import { kiritsuguRig } from './fate-kiritsugu-rig';
import { ART_SPRITE_FRAMES } from './fate-art-sprite';
import type { EinzbernActorId } from './fate-einzbern-house';
import {
  mirrorPreviewSprite,
  type PreviewDirection,
  type PreviewSprite,
} from './fate-preview-house';

export function einzbernSprite(
  actor: EinzbernActorId,
  direction: PreviewDirection,
  phase: number,
  pose?: 'sit' | 'read',
): PreviewSprite {
  if (pose) {
    const index = pose === 'sit' ? 0 : 1;
    if (actor === 'illya') {
      const sheet = poses.illya[pose];
      return {
        ...sheet.frame,
        file: sheet.file,
        imageWidth: sheet.imageWidth,
        imageHeight: sheet.imageHeight,
        scale: sheet.scale,
        mirror: false,
        index,
      };
    }
    const sheet = poses[actor];
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
  const moving = phase > 0;
  if (actor === 'kiritsugu' && moving) {
    return kiritsuguRig(direction, phase);
  }
  if (actor === 'illya') {
    const col = moving ? (phase - 1) % 6 : 0;
    const row = ['down', 'left', 'right', 'up'].indexOf(direction);
    const sheet = data.illya,
      frame = sheet.frames[row * 6 + col];
    const original = ART_SPRITE_FRAMES[direction][col];
    return {
      ...frame,
      anchorX: original.x - (frame.cropX - col * 256),
      anchorY: original.y - (frame.cropY - row * 256),
      file: sheet.file,
      imageWidth: sheet.imageWidth,
      imageHeight: sheet.imageHeight,
      scale: original.scale,
      mirror: false,
      index: row * 6 + col,
    };
  }
  const sheet = data[actor];
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
