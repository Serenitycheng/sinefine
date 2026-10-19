import { HOUSE_PREVIEWS } from './fate-preview-houses';
import {
  EMIYA_ACTIVITIES,
  EMIYA_DOORS,
  EMIYA_ROOMS,
  emiyaFurnitureTarget,
  emiyaPieceApproach,
  type EmiyaRoom,
} from './fate-emiya-house';
import {
  registeredInterior,
  registeredInteriorActions,
} from './fate-interior-contacts';
import type { PreviewHouse, PreviewRoom } from './fate-preview-house';

const emiyaInspections = (room: EmiyaRoom) =>
  room.pieces
    .filter(
      (piece) =>
        piece.solid !== false &&
        !EMIYA_ACTIVITIES.some(
          (a) => a.room === room.id && a.piece === piece.id,
        ),
    )
    .flatMap((piece) => {
      const point = emiyaPieceApproach(room.id, piece);
      return point
        ? [
            {
              id: `inspect:${piece.id}`,
              object: piece.id,
              label: `看看${piece.label}`,
              point,
              target: emiyaFurnitureTarget(room.id, piece),
              detail: piece.label,
            },
          ]
        : [];
    });

/** Formal visitors reuse the same paintings, ground, furniture and room doors.
 * Shirou keeps the existing Emiya life engine and its separate scene save. */
const emiyaRooms = Object.fromEntries(
  Object.values(EMIYA_ROOMS).map((room): [string, PreviewRoom] => [
    room.id,
    {
      scene: {
        ...room.scene,
        // Procedural pieces are drawn by their existing renderer, not by
        // copying empty background pixels over the visitor.
        furniture: room.scene.furniture,
        spots: [
          ...EMIYA_ACTIVITIES.filter(
            (activity) => activity.room === room.id,
          ).map((activity) => ({
            id: activity.id,
            object: activity.piece,
            label:
              activity.id === 'sit'
                ? '在和室歇一会'
                : activity.id === 'cook'
                  ? '看看灶台'
                  : activity.id === 'eat'
                    ? '看看餐桌'
                    : activity.label,
            point: activity.point,
            target: emiyaFurnitureTarget(
              room.id,
              room.pieces.find((piece) => piece.id === activity.piece)!,
            ),
            detail: room.name,
          })),
          ...emiyaInspections(room),
        ],
      },
      doors: [
        ...EMIYA_DOORS.filter((door) => door.from === room.id).map((door) => ({
          id: door.id,
          label: door.label,
          point: door.at,
          to: door.to,
          arrival: door.arrival,
        })),
        ...(room.id === 'forecourt'
          ? [
              {
                id: 'street',
                label: '回到街道',
                point: { x: 500, y: 632 },
                to: null,
                arrival: { x: 500, y: 632 },
              },
            ]
          : []),
      ],
      // The visitor's existing walking art is not substituted for seated poses.
      actions: [],
    },
  ]),
);

const plans: Record<
  keyof typeof HOUSE_PREVIEWS | 'emiya',
  Omit<PreviewHouse, 'cast' | 'sprite'>
> = {
  ...HOUSE_PREVIEWS,
  emiya: {
    name: '卫宫宅',
    rooms: emiyaRooms,
    routeSummary: '前庭 → 玄关／和室／厨房／书房／卧室／缘侧',
  },
};

export const FORMAL_HOUSE_PLANS = Object.fromEntries(
  Object.entries(plans).map(([site, plan]) => [
    site,
    {
      ...plan,
      rooms: Object.fromEntries(
        Object.entries(plan.rooms).map(([id, room]) => [
          id,
          {
            ...room,
            scene: registeredInterior(
              site,
              id,
              room.scene,
              registeredInteriorActions(site, id, room.actions),
            ),
            actions: registeredInteriorActions(site, id, room.actions),
          },
        ]),
      ),
    },
  ]),
) as typeof plans;
