import type { CityPoint } from './fate-city-layout';
import {
  interiorProject,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import type { PreviewDoor, PreviewDirection } from './fate-preview-house';
import { cityWalkFacing } from './fate-city-art-controls';
import {
  interiorSpotDistance,
  interiorPhysicalSpotDistance,
} from './fate-interior-access';

const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const DOOR_RADIUS = 32;
const REARM_DISTANCE = 72;

/** Inspect the visible object instead of keeping the last walking direction. */
export function interiorObjectFacing(
  point: CityPoint,
  target: CityPoint | undefined,
  scene: CityInteriorScene,
  previous: PreviewDirection,
) {
  if (!target) return previous;
  const from = interiorProject(point, scene.floor);
  return cityWalkFacing(
    { x: target.x - from.x, y: target.y - from.y },
    previous,
  );
}

/** Spawned near a door? Leave its arrival area before walking back through it. */
export function interiorDoorGuard(
  entry: CityPoint,
  doors: readonly PreviewDoor[],
) {
  return new Set(
    doors.filter((d) => gap(entry, d.point) < REARM_DISTANCE).map((d) => d.id),
  );
}

/** Swept crossing also handles a long frame without requiring an E press. */
export function interiorCrossedDoor(
  from: CityPoint,
  to: CityPoint,
  doors: readonly PreviewDoor[],
  guard: Set<string>,
) {
  for (const door of doors)
    if (gap(from, door.point) >= REARM_DISTANCE) guard.delete(door.id);
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = dx * dx + dy * dy;
  if (length < 1e-8) return null;
  return (
    doors.find((door) => {
      if (guard.has(door.id) || gap(to, door.point) >= gap(from, door.point))
        return false;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((door.point.x - from.x) * dx + (door.point.y - from.y) * dy) /
            length,
        ),
      );
      return (
        gap(door.point, { x: from.x + t * dx, y: from.y + t * dy }) <=
        DOOR_RADIUS
      );
    }) ?? null
  );
}

/** Keep the contextual action beside the complete body, including seated feet. */
export function interiorInteractionHint(
  body: CityPoint & { width: number; height: number },
  size: { width: number; height: number },
  options: { width?: number; height?: number } = {},
) {
  const width = Math.min(options.width ?? 250, size.width - 24),
    height = options.height ?? 44,
    gap = 10;
  const candidates = [
    { x: body.x + body.width / 2, y: body.y + body.height + gap + height / 2 },
    { x: body.x + body.width + gap + width / 2, y: body.y + body.height / 2 },
    { x: body.x - gap - width / 2, y: body.y + body.height / 2 },
    { x: body.x + body.width / 2, y: body.y - gap - height / 2 },
  ].map((p) => ({
    x: Math.max(12 + width / 2, Math.min(size.width - 12 - width / 2, p.x)),
    y: p.y,
  }));
  return (
    candidates.find(
      (p) =>
        p.y - height / 2 >= 8 &&
        p.y + height / 2 <= size.height - 8 &&
        (p.x + width / 2 <= body.x - gap ||
          p.x - width / 2 >= body.x + body.width + gap ||
          p.y + height / 2 <= body.y - gap ||
          p.y - height / 2 >= body.y + body.height + gap),
    ) ?? {
      x: Math.max(
        width / 2 + 12,
        Math.min(size.width - width / 2 - 12, body.x + body.width / 2),
      ),
      y: size.height - height / 2 - 8,
    }
  );
}

/** Keep every reachable action available when a desk/counter has several uses. */
export function nearbyInteriorSpots(
  point: CityPoint,
  scene: CityInteriorScene,
  preferred?: string | null,
  previous?: string | null,
) {
  const ranked = scene.spots
    .map((spot) => ({
      spot,
      distance: interiorSpotDistance(point, spot, scene),
      physicalDistance: interiorPhysicalSpotDistance(point, spot, scene),
    }))
    .filter((s) => Number.isFinite(s.distance))
    .sort((a, b) =>
      a.spot.id === preferred
        ? -1
        : b.spot.id === preferred
          ? 1
          : Number.isFinite(a.physicalDistance) !==
              Number.isFinite(b.physicalDistance)
            ? Number.isFinite(a.physicalDistance)
              ? -1
              : 1
            : Number.isFinite(a.physicalDistance)
              ? a.physicalDistance - b.physicalDistance
              : a.distance - b.distance,
    )
    .map((item) => item.spot);
  if (!preferred && previous && ranked[0]?.id !== previous) {
    const old = ranked.find((s) => s.id === previous);
    if (
      old &&
      interiorSpotDistance(point, old, scene) <=
        interiorSpotDistance(point, ranked[0], scene) + 12
    )
      return [old, ...ranked.filter((s) => s !== old)];
  }
  return ranked;
}

export function nearestInteriorSpot(
  point: CityPoint,
  scene: CityInteriorScene,
  preferred?: string | null,
) {
  return nearbyInteriorSpots(point, scene, preferred)[0] ?? null;
}
