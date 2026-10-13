import { HOUSE_PREVIEWS } from './fate-preview-houses';
import {
  EMIYA_ACTIVITIES,
  EMIYA_DOORS,
  EMIYA_ROOMS,
  emiyaFurnitureSilhouette,
} from './fate-emiya-house';
import type { PreviewHouse, PreviewRoom } from './fate-preview-house';

/** Formal visitors reuse the same paintings, ground, furniture and room doors.
 * Shirou keeps the existing Emiya life engine and its separate scene save. */
const emiyaRooms = Object.fromEntries(
  Object.values(EMIYA_ROOMS).map((room): [string, PreviewRoom] => [
    room.id,
    {
      scene: {
        ...room.scene,
        furniture: room.scene.furniture.map((furniture) => ({
          ...furniture,
          silhouette: emiyaFurnitureSilhouette(
            room.id,
            room.pieces.find((piece) => piece.id === furniture.id)!,
          ),
        })),
        spots: EMIYA_ACTIVITIES.filter(
          (activity) => activity.room === room.id,
        ).map((activity) => ({
          id: activity.id,
          label:
            activity.id === 'sit'
              ? '在和室歇一会'
              : activity.id === 'cook'
                ? '看看灶台'
                : activity.id === 'eat'
                  ? '看看餐桌'
                  : activity.label,
          point: activity.point,
          detail: room.name,
        })),
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

export const FORMAL_HOUSE_PLANS: Record<
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
