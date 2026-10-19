import type { CityPoint } from './fate-city-layout';
import { EMIYA_ROOMS, type EmiyaLocation } from './fate-emiya-house';
import {
  emiyaActivityPose,
  EMIYA_LIFE_SPRITES,
  SHIROU_LIFE_SPRITES,
} from './fate-emiya-actions';
import { EMIYA_LIFE_ACTIVITIES } from './fate-emiya-household';
import { interiorDepth, interiorProject } from './fate-city-interior-scenes';
import { bodyArtSprite } from './fate-body-art';
import type { BodyFacing } from './fate-body-facing';
import type { CityWalkDirection } from './fate-city-art-controls';
import {
  CHARACTER_WORLD_SCALE,
  ILLYA_DISPLAY_SCALE,
} from './fate-actor-proportions';

type Size = { width: number; height: number };
type Rect = CityPoint & Size;

/** Keep the whole character visible without changing its scale or ground position. */
export function emiyaCameraZoom(value: number, size: Size) {
  const fit = Math.min(size.width / 1600, size.height / 900);
  if (!(fit > 0)) return 1;
  const maximum = Math.max(
    1,
    Math.min(
      2.5,
      (size.height - 40) / (340 * CHARACTER_WORLD_SCALE * fit),
      (size.width - 32) / (420 * CHARACTER_WORLD_SCALE * fit),
    ),
  );
  return Math.max(1, Math.min(maximum, Number.isFinite(value) ? value : 1));
}

export function emiyaCameraBody(
  location: EmiyaLocation,
  active: { id: string; seconds: number } | null,
  actor: 'shirou' | 'illya',
  direction: CityWalkDirection = 'down',
  phase = 0,
  facing: BodyFacing = direction,
): Rect {
  const activity =
    active && EMIYA_LIFE_ACTIVITIES.find((a) => a.id === active.id);
  const pose = activity
    ? emiyaActivityPose(activity, active!.seconds, actor)
    : null;
  const floor = EMIYA_ROOMS[location.room].scene.floor;
  const point = pose?.point ?? location.point;
  const foot = interiorProject(point, floor);
  const depth = interiorDepth(point, floor);
  if (!pose) {
    const model = bodyArtSprite(
      actor,
      direction,
      phase,
      'adult',
      undefined,
      facing,
    )!;
    const scale = depth * model.scale;
    return {
      x: foot.x + (model.bounds.x - model.anchorX) * scale,
      y: foot.y + (model.bounds.y - model.anchorY) * scale,
      width: model.bounds.width * scale,
      height: model.bounds.height * scale,
    };
  }
  const frame = pose.frame;
  const scale =
    (actor === 'illya' ? ILLYA_DISPLAY_SCALE : CHARACTER_WORLD_SCALE) *
    depth *
    (actor === 'shirou' ? SHIROU_LIFE_SPRITES : EMIYA_LIFE_SPRITES).scale;
  return {
    x: foot.x + (frame.bounds.x - frame.anchorX) * scale,
    y:
      foot.y -
      (pose?.elevation ?? 0) * depth * 0.85 +
      (frame.bounds.y - frame.anchorY) * scale,
    width: frame.bounds.width * scale,
    height: frame.bounds.height * scale,
  };
}

/** Clamp both the painting and body using the actual displayed transform.
 * A cached, unclamped follow target must not accumulate outside the painting. */
export function emiyaClampCamera(
  origin: CityPoint,
  scale: number,
  size: Size,
  body: Rect,
): CityPoint {
  const axis = (
    p: number,
    viewport: number,
    painting: number,
    start: number,
    extent: number,
  ) => {
    if (painting * scale <= viewport) return (viewport - painting * scale) / 2;
    const minBackground = viewport - painting * scale;
    const min = Math.max(minBackground, 14 - start * scale);
    const max = Math.min(0, viewport - 14 - (start + extent) * scale);
    return min <= max
      ? Math.max(min, Math.min(max, p))
      : Math.max(minBackground, Math.min(0, p));
  };
  return {
    x: axis(origin.x, size.width, 1600, body.x, body.width),
    y: axis(origin.y, size.height, 900, body.y, body.height),
  };
}
