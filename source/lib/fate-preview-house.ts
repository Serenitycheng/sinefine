import type { CityPoint } from './fate-city-layout';
import {
  interiorUnproject,
  type CityInteriorScene,
} from './fate-city-interior-scenes';
import type { ActorId } from './street';

export type PreviewDirection = 'up' | 'down' | 'left' | 'right';
export type PreviewDoor = {
  id: string;
  label: string;
  point: CityPoint;
  to: string | null;
  arrival: CityPoint;
};
export type PreviewAction = {
  id: string;
  pose: 'sit' | 'read';
  contact: CityPoint;
  elevation: number;
  mirror?: boolean;
  /** The drawn chair can have a different local perspective from the ground. */
  scale?: number;
  /** Seat surface in the authored painting; registered sprites attach their hips here. */
  seat?: CityPoint;
  /** Furniture behind the seated body, independent of its safe walking approach. */
  inFrontOf?: readonly string[];
};
export type PreviewRoom = {
  scene: CityInteriorScene;
  doors: readonly PreviewDoor[];
  actions: readonly PreviewAction[];
};
/** Real crop coordinates support both reused irregular sheets and new atlases. */
export type PreviewSprite = {
  rig?: {
    phase: number;
    layers: {
      part: string;
      clip: readonly (readonly number[])[];
      matrix: readonly number[];
      shade?: number;
    }[];
    legs: { hip: CityPoint; knee: CityPoint; ankle: CityPoint; bend: number }[];
  };
  file: string;
  cellWidth: number;
  cellHeight: number;
  anchorX: number;
  anchorY: number;
  bounds: { x: number; y: number; width: number; height: number };
  scale: number;
  mirror: boolean;
  cropX: number;
  cropY: number;
  imageWidth: number;
  imageHeight: number;
  index: number;
  /** Hip contact in local crop coordinates, independent of the walking foot anchor. */
  seat?: CityPoint;
  /** Local crop coordinates exclude neighbouring ink when rectangular cuts overlap. */
  clip?: readonly (readonly number[])[];
};
export type PreviewHouse = {
  name: string;
  rooms: Record<string, PreviewRoom>;
  cast: readonly { id: ActorId; name: string }[];
  routeSummary: string;
  sprite: (
    actor: ActorId,
    direction: PreviewDirection,
    phase: number,
    pose?: 'sit' | 'read',
  ) => PreviewSprite;
};
export function nearestPreviewDoor(point: CityPoint, room: PreviewRoom) {
  return room.doors.find(
    (door) => Math.hypot(door.point.x - point.x, door.point.y - point.y) < 48,
  );
}

export function mirrorPreviewSprite(sprite: PreviewSprite): PreviewSprite {
  return {
    ...sprite,
    mirror: !sprite.mirror,
    anchorX: sprite.cellWidth - sprite.anchorX,
    bounds: {
      ...sprite.bounds,
      x: sprite.cellWidth - sprite.bounds.x - sprite.bounds.width,
    },
    ...(sprite.seat
      ? { seat: { x: sprite.cellWidth - sprite.seat.x, y: sprite.seat.y } }
      : {}),
  };
}

export function paintedPoint(scene: CityInteriorScene, x: number, y: number) {
  return interiorUnproject({ x, y }, scene.floor)!;
}

/** The footprint is the bounds of all four inverse-projected floor corners. */
export function paintedFurniture(
  scene: CityInteriorScene,
  id: string,
  rect: readonly number[],
  mask: readonly number[][],
) {
  // Wall-side furniture can extend beyond the projected playable floor.
  // Register its solid part inside that floor instead of accepting a null inverse.
  const corner = (x: number, y: number) => {
    const py = Math.max(
      scene.floor.backY + 1,
      Math.min(scene.floor.frontY - 1, y * 9),
    );
    const t =
      (py - scene.floor.backY) / (scene.floor.frontY - scene.floor.backY);
    const left =
      scene.floor.backLeft + (scene.floor.frontLeft - scene.floor.backLeft) * t;
    const right =
      scene.floor.backRight +
      (scene.floor.frontRight - scene.floor.backRight) * t;
    return paintedPoint(
      scene,
      Math.max(left + 1, Math.min(right - 1, x * 16)),
      py,
    );
  };
  const corners = [
    corner(rect[0], rect[1]),
    corner(rect[2], rect[1]),
    corner(rect[0], rect[3]),
    corner(rect[2], rect[3]),
  ];
  const minX = Math.min(...corners.map((p) => p.x));
  const minY = Math.min(...corners.map((p) => p.y));
  return {
    id,
    footprint: {
      x: minX,
      y: minY,
      width: Math.max(...corners.map((p) => p.x)) - minX,
      height: Math.max(...corners.map((p) => p.y)) - minY,
    },
    silhouette: mask.map(([x, y]) => ({ x: x * 16, y: y * 9 })),
  };
}
