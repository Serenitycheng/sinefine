import {
  SAMPLE_ALLEY,
  advanceSampleRoute,
  type SamplePoint,
} from './fate-art-sample';
import type { SampleLook } from './fate-art-depth';
import { onAlleyPaving, sampleAlleyPoint } from './fate-art-alley';

export type SampleSpring = { value: number; velocity: number };

/** Exact critically damped step: momentum stays continuous when a target turns. */
export function stepSampleSpring(
  state: SampleSpring,
  target: number,
  dt: number,
  frequency = 7,
): SampleSpring {
  if (!(dt > 0) || !Number.isFinite(dt)) return state;
  const offset = state.value - target;
  const term = state.velocity + frequency * offset;
  const decay = Math.exp(-frequency * dt);
  const value = target + (offset + term * dt) * decay;
  const velocity = (state.velocity - frequency * term * dt) * decay;
  return Math.abs(value - target) < 0.0001 && Math.abs(velocity) < 0.0001
    ? { value: target, velocity: 0 }
    : { value, velocity };
}

/** Look a little beyond a bend, without rotating the entire street by 90 degrees. */
export function sampleAlleyLook(point: SamplePoint): SampleLook {
  const { mouth, inside } = SAMPLE_ALLEY;
  const dx = inside.x - mouth.x;
  const dy = inside.y - mouth.y;
  const length = Math.hypot(dx, dy);
  const along =
    ((point.x - mouth.x) * dx + (point.y - mouth.y) * dy) / (length * length);
  const across =
    Math.abs((point.x - mouth.x) * dy - (point.y - mouth.y) * dx) / length;
  const ease = (v: number) => {
    const t = Math.max(0, Math.min(1, v));
    return t * t * (3 - 2 * t);
  };
  const amount = ease(along) * (1 - ease((across - 35) / 60));
  return { yaw: amount ? -6 * amount : 0, tilt: 0.6 * amount };
}

/** Route-aware anticipation is bounded so the person stays comfortably in view. */
export function sampleTravelLead(
  point: SamplePoint,
  path: readonly SamplePoint[],
  movement: SamplePoint,
  dt: number,
): SamplePoint {
  if (Math.hypot(movement.x, movement.y) < 0.001 || dt <= 0)
    return { x: 0, y: 0 };
  if (path.length) {
    const future = advanceSampleRoute(point, path, 36).point;
    return { x: future.x - point.x, y: future.y - point.y };
  }
  const distance = Math.hypot(movement.x, movement.y);
  const lead = Math.min(36, (distance / dt) * 0.55);
  return {
    x: (movement.x / distance) * lead,
    y: (movement.y / distance) * lead,
  };
}

export function sampleInAlley(point: SamplePoint) {
  return point.y < 402 && onAlleyPaving(sampleAlleyPoint(point));
}
