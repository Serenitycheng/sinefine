import type { CityPoint } from './fate-city-layout';
import type { PreviewDirection } from './fate-preview-house';

/** Painting-space body views; the four-direction save/input contract stays unchanged. */
export type BodyFacing =
  | PreviewDirection
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';
export const BODY_FACINGS: readonly BodyFacing[] = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
];

export function bodyFacing(delta: CityPoint, previous: BodyFacing): BodyFacing {
  if (Math.hypot(delta.x, delta.y) < 0.001) return previous;
  // Screen y points down. Eight sectors prevent diagonal roads snapping to profiles.
  const angle = Math.atan2(-delta.x, delta.y);
  // Keep the current view near a sector boundary instead of alternating crops
  // with tiny path/collision corrections. A deliberate turn still switches.
  const previousAngle = BODY_FACINGS.indexOf(previous) * (Math.PI / 4);
  const difference = Math.atan2(
    Math.sin(angle - previousAngle),
    Math.cos(angle - previousAngle),
  );
  if (Math.abs(difference) <= Math.PI / 6) return previous;
  const sector = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  return BODY_FACINGS[sector];
}
