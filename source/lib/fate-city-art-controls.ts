import type { CityPoint } from './fate-city-layout';

export type CityWalkDirection = 'down' | 'left' | 'right' | 'up';

/** A small diagonal dead band prevents a four-direction sprite from spinning
 * between two rows on nearly diagonal projected paths. Reversals stay instant. */
export function cityWalkFacing(
  delta: CityPoint,
  previous: CityWalkDirection,
): CityWalkDirection {
  const x = Math.abs(delta.x),
    y = Math.abs(delta.y);
  if (!Number.isFinite(x + y) || x + y < 1e-7) return previous;
  const horizontal = delta.x > 0 ? 'right' : 'left';
  const vertical = delta.y > 0 ? 'down' : 'up';
  if (previous === horizontal && y <= x * 1.25) return previous;
  if (previous === vertical && x <= y * 1.25) return previous;
  return x > y ? horizontal : vertical;
}

/** Zoom in the displayed camera's coordinates, preserving the pointer (or
 * actor) anchor. A moving two-finger midpoint also pans the same ground point. */
export function cityCameraZoomAnchor(
  origin: CityPoint,
  scale: number,
  nextScale: number,
  anchor: CityPoint,
  nextAnchor: CityPoint = anchor,
): CityPoint {
  if (![scale, nextScale].every((v) => Number.isFinite(v) && v > 0))
    return { ...origin };
  const ratio = nextScale / scale;
  return {
    x: nextAnchor.x - (anchor.x - origin.x) * ratio,
    y: nextAnchor.y - (anchor.y - origin.y) * ratio,
  };
}

/** Keep a comfortable walking window before scrolling. Time-based damping
 * gives the same response at different frame rates; collision and clicks still
 * use the exact rendered transform, never a delayed CSS animation. */
export function cityCameraFollow(
  origin: CityPoint,
  foot: CityPoint,
  scale: number,
  size: { width: number; height: number },
  seconds: number,
): CityPoint {
  const gain = 1 - Math.exp(-12 * Math.max(0, Math.min(seconds, 0.1)));
  const clamp = (n: number, a: number, b: number) =>
    Math.max(a, Math.min(b, n));
  const screen = { x: origin.x + foot.x * scale, y: origin.y + foot.y * scale };
  return {
    x:
      origin.x +
      (clamp(screen.x, size.width * 0.38, size.width * 0.66) - screen.x) * gain,
    y:
      origin.y +
      (clamp(screen.y, size.height * 0.52, size.height * 0.74) - screen.y) *
        gain,
  };
}
