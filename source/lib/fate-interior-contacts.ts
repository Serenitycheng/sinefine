import registrations from './fate-interior-contact-data.json';
import closeups from './fate-interior-closeup-data.json';
import type {
  CityInteriorScene,
  InteriorFurniture,
} from './fate-city-interior-scenes';
import type { PreviewAction } from './fate-preview-house';
import { paintedPoint } from './fate-preview-house';
import { registerInteriorAccess } from './fate-interior-access';

const groundPoint = (scene: CityInteriorScene, x: number, y: number) => {
  const py = Math.max(
    scene.floor.backY + 1,
    Math.min(scene.floor.frontY - 1, y * 9),
  );
  const t = (py - scene.floor.backY) / (scene.floor.frontY - scene.floor.backY);
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

type Polygon = readonly (readonly number[])[];
type Piece = {
  masks?: readonly Polygon[];
  ground?: Polygon;
  grounds?: readonly Polygon[];
};
type Registration = {
  targets: Record<string, readonly number[]>;
  closeups?: Record<string, readonly number[]>;
  details?: Record<string, string>;
  furniture?: Record<string, Piece>;
  add?: Record<string, Piece>;
  seats?: Record<string, readonly number[]>;
  approaches?: Record<string, Polygon>;
  hitboxes?: Record<string, readonly number[]>;
  objects?: Record<string, string>;
  remove?: readonly string[];
};

export function registeredInteriorActions(
  site: string,
  room: string,
  actions: readonly PreviewAction[],
): readonly PreviewAction[] {
  const seats = (registrations as Record<string, Registration>)[
    `${site}/${room}`
  ]?.seats;
  return actions.map((action) =>
    seats?.[action.id]
      ? {
          ...action,
          seat: { x: seats[action.id][0] * 16, y: seats[action.id][1] * 9 },
        }
      : action,
  );
}

/** Authored corrections use painting coordinates, never world/save transforms. */
export function registeredInterior(
  site: string,
  room: string,
  scene: CityInteriorScene,
  actions: readonly PreviewAction[] = [],
): CityInteriorScene {
  const data: Registration = (registrations as Record<string, Registration>)[
    `${site}/${room}`
  ] ?? { targets: {} };
  const update = (f: InteriorFurniture, change: Piece): InteriorFurniture => {
    const masks = change.masks?.map((poly) =>
      poly.map(([x, y]) => ({ x: x * 16, y: y * 9 })),
    );
    const shapes = change.grounds ?? (change.ground ? [change.ground] : null);
    if (shapes) {
      const collisions = shapes.map((poly) =>
        poly.map(([x, y]) => groundPoint(scene, x, y)),
      );
      const points = collisions.flat(),
        xs = points.map((p) => p.x),
        ys = points.map((p) => p.y);
      return {
        ...f,
        collision: undefined,
        collisions,
        footprint: {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        },
        ...(masks ? { silhouette: undefined, silhouettes: masks } : {}),
      };
    }
    return {
      ...f,
      ...(masks ? { silhouette: undefined, silhouettes: masks } : {}),
    };
  };
  const calibrated: CityInteriorScene = {
    ...scene,
    furniture: [
      ...scene.furniture
        .filter((f) => !data.remove?.includes(f.id))
        .map((f) =>
          data.furniture?.[f.id] ? update(f, data.furniture[f.id]) : f,
        ),
      ...Object.entries(data.add ?? {}).map(([id, change]) =>
        update({ id, footprint: { x: 0, y: 0, width: 0, height: 0 } }, change),
      ),
    ],
    spots: scene.spots.map((spot) => ({
      ...spot,
      ...(() => {
        const crop = (closeups as Record<string, Record<string, number[]>>)[
          `${site}/${room}`
        ]?.[spot.id];
        return crop
          ? {
              detailFrame: {
                x: crop[0],
                y: crop[1],
                width: crop[2],
                height: crop[3],
              },
            }
          : {};
      })(),
      ...(data.closeups?.[spot.id]
        ? {
            detailTarget: {
              x: data.closeups[spot.id][0] * 16,
              y: data.closeups[spot.id][1] * 9,
            },
          }
        : {}),
      ...(data.details?.[spot.id] ? { detail: data.details[spot.id] } : {}),
      ...(data.targets[spot.id]
        ? {
            target: {
              x: data.targets[spot.id][0] * 16,
              y: data.targets[spot.id][1] * 9,
            },
          }
        : {}),
      ...(data.approaches?.[spot.id]
        ? {
            point: groundPoint(
              scene,
              data.approaches[spot.id][0][0],
              data.approaches[spot.id][0][1],
            ),
            approaches: data.approaches[spot.id].map(([x, y]) =>
              groundPoint(scene, x, y),
            ),
          }
        : {}),
      ...(data.hitboxes?.[spot.id]
        ? {
            hitbox: {
              x: data.hitboxes[spot.id][0] * 16,
              y: data.hitboxes[spot.id][1] * 9,
              width:
                (data.hitboxes[spot.id][2] - data.hitboxes[spot.id][0]) * 16,
              height:
                (data.hitboxes[spot.id][3] - data.hitboxes[spot.id][1]) * 9,
            },
          }
        : {}),
      ...(data.objects?.[spot.id] ? { object: data.objects[spot.id] } : {}),
    })),
  };
  return {
    ...calibrated,
    spots: calibrated.spots.map((spot) =>
      registerInteriorAccess(
        actions.find((a) => a.id === spot.id)?.seat
          ? { ...spot, target: actions.find((a) => a.id === spot.id)!.seat }
          : spot,
        calibrated,
      ),
    ),
  };
}
