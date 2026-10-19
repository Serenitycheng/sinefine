import type { PreviewSprite } from './fate-preview-house';

// Display calibration, not a change to the character's canonical profile or world position.
export const CHARACTER_WORLD_SCALE = 1.35;
export const ILLYA_DISPLAY_SCALE = CHARACTER_WORLD_SCALE * 1.06;
export function actorProportions(
  id: string,
  sprite: PreviewSprite,
  standing: PreviewSprite,
  seated: boolean,
): PreviewSprite {
  const multiplier =
    id === 'illya'
      ? ILLYA_DISPLAY_SCALE
      : CHARACTER_WORLD_SCALE *
        Math.max(1, 300 / (standing.bounds.height * standing.scale));
  const standingHeight = standing.bounds.height * standing.scale * multiplier;
  return {
    ...sprite,
    scale: sprite.scale * multiplier,
    standingHeight,
    seated,
  };
}

export function poseDisplayScale(sprite: PreviewSprite, furnitureScale = 1) {
  if (!sprite.seated || !sprite.standingHeight)
    return sprite.scale * furnitureScale;
  // A chair cannot enlarge its visitor. Only a small local perspective correction is allowed.
  const perspective = Math.max(0.96, Math.min(1.08, furnitureScale));
  return (
    (sprite.standingHeight * (sprite.poseHeightRatio ?? 0.77) * perspective) /
    sprite.bounds.height
  );
}
