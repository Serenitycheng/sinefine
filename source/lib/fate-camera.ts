import { STREET_SCENE_SCALE } from './fate-district';
import { STREET, clamp, type Point } from './street';
export type Camera = Point & { scale: number };

/** Actual visible camera is also used for pointer-to-world conversion. */
export function sceneCameraFor(point: Point, width: number, height: number, zoom: number, scene: 'street' | 'map'): Camera {
  const factor = scene === 'street' ? STREET_SCENE_SCALE : 1;
  const world = { x: STREET.width * factor, y: STREET.height * factor };
  const base = scene === 'street' ? clamp(width / 1450, 0.6, 0.8) : Math.min(width / world.x, height / world.y);
  const scale = Math.max(0.01, base * (scene === 'map' ? clamp(zoom, 1, 1.8) / 1.24 : clamp(zoom, 1, 1.8)));
  const visible = { x: width / scale, y: height / scale };
  const origin = (center: number, size: number, viewport: number) => viewport >= size ?
    (size - viewport) / 2 : clamp(center - viewport / 2, 0, size - viewport);
  return {
    x: origin(point.x * factor, world.x, visible.x),
    y: origin(point.y * factor - visible.y * 0.06, world.y, visible.y), scale,
  };
}

export function easeCamera(current: Camera, target: Camera, dt: number, snap = false): Camera {
  if (snap) return target;
  const alpha = 1 - Math.exp(-12 * clamp(dt, 0, 0.05));
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
    scale: current.scale + (target.scale - current.scale) * alpha,
  };
}
