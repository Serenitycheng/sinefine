import { STREET_SCENE_SCALE } from './fate-district';
import { STREET, clamp, type Point } from './street';
export type Camera = Point & { scale: number };
export type CameraScene = 'street' | 'map';
export const DEFAULT_ZOOM = 1.24;
export const ZOOM_LIMITS = {
  street: { min: DEFAULT_ZOOM * 0.35, max: DEFAULT_ZOOM * 2.5 },
  map: { min: DEFAULT_ZOOM * 0.8, max: DEFAULT_ZOOM * 5 },
} as const;
export function clampZoom(zoom: number, scene: CameraScene) {
  const { min, max } = ZOOM_LIMITS[scene];
  return clamp(Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM, min, max);
}

/** Actual visible camera is also used for pointer-to-world conversion. */
export function sceneCameraFor(
  point: Point,
  width: number,
  height: number,
  zoom: number,
  scene: CameraScene,
): Camera {
  const factor = scene === 'street' ? STREET_SCENE_SCALE : 1;
  const world = { x: STREET.width * factor, y: STREET.height * factor };
  const base =
    scene === 'street'
      ? clamp(width / 1450, 0.6, 0.8)
      : Math.min(width / world.x, height / world.y);
  const level = clampZoom(zoom, scene);
  const scale = Math.max(
    0.01,
    base * (scene === 'map' ? level / DEFAULT_ZOOM : level),
  );
  const visible = { x: width / scale, y: height / scale };
  const origin = (center: number, size: number, viewport: number) =>
    viewport >= size
      ? (size - viewport) / 2
      : clamp(center - viewport / 2, 0, size - viewport);
  return {
    x: origin(point.x * factor, world.x, visible.x),
    // Street compositions leave more room above the actor for facades and
    // entrances; the overview keeps its neutral center.
    y: origin(
      point.y * factor - visible.y * (scene === 'street' ? 0.2 : 0.06),
      world.y,
      visible.y,
    ),
    scale,
  };
}

export function easeCamera(
  current: Camera,
  target: Camera,
  dt: number,
  snap = false,
): Camera {
  if (snap) return target;
  const alpha = 1 - Math.exp(-12 * clamp(dt, 0, 0.05));
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
    scale: current.scale + (target.scale - current.scale) * alpha,
  };
}
