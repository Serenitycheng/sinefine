import type { CityPoint } from './fate-city-layout';
import { houseCamera } from './fate-tohsaka-house';
import { cityCameraZoomAnchor } from './fate-city-art-controls';
type Size = { width: number; height: number };
type Rect = CityPoint & Size;

export function roomArrivalCamera(
  anchor: CityPoint | undefined,
  foot: CityPoint,
  scale: number,
  size: Size,
  body: Rect,
  fallback: CityPoint,
) {
  return houseCamera(
    anchor
      ? {
          x:
            Math.max(0.15, Math.min(0.85, anchor.x)) * size.width -
            foot.x * scale,
          y:
            Math.max(0.3, Math.min(0.8, anchor.y)) * size.height -
            foot.y * scale,
        }
      : fallback,
    scale,
    size,
    body,
  );
}
export function roomFollowCamera(
  origin: CityPoint,
  foot: CityPoint,
  scale: number,
  size: Size,
  body: Rect,
  dt: number,
) {
  const gain = 1 - Math.exp(-7 * Math.max(0, Math.min(dt, 0.1)));
  const x = origin.x + foot.x * scale,
    y = origin.y + foot.y * scale;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  return houseCamera(
    {
      x: origin.x + (clamp(x, size.width * 0.36, size.width * 0.66) - x) * gain,
      y:
        origin.y +
        (clamp(y, size.height * 0.54, size.height * 0.77) - y) * gain,
    },
    scale,
    size,
    body,
  );
}
export function roomResizeCamera(
  origin: CityPoint,
  foot: CityPoint,
  previous: { scale: number; size: Size },
  scale: number,
  size: Size,
  body: Rect,
) {
  const old = {
    x: origin.x + foot.x * previous.scale,
    y: origin.y + foot.y * previous.scale,
  };
  const anchor = {
    x: (old.x / previous.size.width) * size.width,
    y: (old.y / previous.size.height) * size.height,
  };
  return houseCamera(
    cityCameraZoomAnchor(origin, previous.scale, scale, old, anchor),
    scale,
    size,
    body,
  );
}
