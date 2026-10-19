import type { CityPoint } from './fate-city-layout';
import {
  interiorProject,
  interiorDepth,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import type { PreviewAction, PreviewSprite } from './fate-preview-house';
import { poseDisplayScale } from './fate-actor-proportions';

/** Navigation stays at the safe approach; the rendered body can touch a painted seat. */
export function previewPresentation(
  scene: CityInteriorScene,
  point: CityPoint,
  sprite: PreviewSprite,
  action?: PreviewAction | null,
) {
  const contact = action?.contact ?? point;
  const foot = interiorProject(contact, scene.floor);
  const depth = interiorDepth(contact, scene.floor);
  const spriteScale =
    depth *
    (scene.figureScale ?? 1) *
    poseDisplayScale(sprite, action?.scale ?? 1);
  foot.y -= (action?.elevation ?? 0) * depth;
  if (action?.seat && sprite.seat) {
    foot.x = action.seat.x - (sprite.seat.x - sprite.anchorX) * spriteScale;
    foot.y = action.seat.y - (sprite.seat.y - sprite.anchorY) * spriteScale;
  }
  const body = {
    x: foot.x + (sprite.bounds.x - sprite.anchorX) * spriteScale,
    y: foot.y + (sprite.bounds.y - sprite.anchorY) * spriteScale,
    width: sprite.bounds.width * spriteScale,
    height: sprite.bounds.height * spriteScale,
  };
  const front = scene.furniture.reduce(
    (depth, furniture) =>
      action?.inFrontOf?.includes(furniture.id)
        ? Math.max(
            depth,
            furniture.footprint.y + furniture.footprint.height + 1,
          )
        : depth,
    point.y,
  );
  const layer = scene.furniture.reduce(
    (depth, furniture) =>
      action?.behind?.includes(furniture.id)
        ? Math.min(
            depth,
            furniture.footprint.y + furniture.footprint.height - 1,
          )
        : depth,
    front,
  );
  return { foot, spriteScale, body, layer };
}
