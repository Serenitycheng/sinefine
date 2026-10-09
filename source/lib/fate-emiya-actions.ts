import spriteData from './fate-emiya-sprite-data.json';
import shirouLife from './fate-shirou-life-data.json';
import {
  EMIYA_ROOMS,
  EMIYA_ACTIVITIES,
  type EmiyaActivity,
  type EmiyaLocation,
  type EmiyaRoomId,
} from './fate-emiya-house';
import type { CityPoint } from './fate-city-layout';

export type EmiyaPose = 'sit' | 'read' | 'cook' | 'eat' | 'sleep' | 'bench';
export type SpriteFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  bounds: { x: number; y: number; width: number; height: number };
};
export const EMIYA_LIFE_SPRITES = spriteData.actions;
export const SHIROU_WALK_SPRITES = spriteData.walking;
export const SHIROU_LIFE_SPRITES = shirouLife;
export const EMIYA_MATERIAL_ATLAS =
  '/fate/interior-art/emiya-materials-soft-v1.png';
export const EMIYA_REQUIRED_ART = [
  ...new Set([
    ...Object.values(EMIYA_ROOMS).map((room) => room.scene.painting),
    EMIYA_MATERIAL_ATLAS,
    EMIYA_LIFE_SPRITES.path,
    SHIROU_WALK_SPRITES.path,
  ]),
];
export const SHIROU_REQUIRED_ART = [
  ...EMIYA_REQUIRED_ART.filter((url) => url !== EMIYA_LIFE_SPRITES.path),
  SHIROU_LIFE_SPRITES.path,
];

/** Activity presentation has its own contact on the furniture. The safe floor
 * approach is retained so cancelling can immediately resume normal walking. */
export function emiyaActivityPose(
  activity: EmiyaActivity,
  seconds: number,
  actor: 'illya' | 'shirou' = 'illya',
) {
  const pose: EmiyaPose =
    activity.id === 'rest'
      ? 'sleep'
      : activity.id === 'garden'
        ? 'bench'
        : activity.id === 'study'
          ? 'read'
          : activity.id === 'sit'
            ? 'sit'
            : activity.id === 'cook'
              ? 'cook'
              : activity.id === 'eat'
                ? 'eat'
                : 'read';
  const frames = (actor === 'shirou' ? SHIROU_LIFE_SPRITES : EMIYA_LIFE_SPRITES)
    .frames[pose];
  const phase = Math.floor(Math.max(0, seconds) / 0.85) % frames.length;
  const frame: SpriteFrame = frames[phase];
  const piece = EMIYA_ROOMS[activity.room].pieces.find(
    (piece) => piece.id === activity.piece,
  )!;
  const point: CityPoint =
    pose === 'sleep'
      ? {
          x: piece.footprint.x + piece.footprint.width * 0.5,
          y: piece.footprint.y + piece.footprint.height * 0.6,
        }
      : pose === 'bench'
        ? {
            x: piece.footprint.x + piece.footprint.width * 0.5,
            y: piece.footprint.y + piece.footprint.height * 0.82,
          }
        : activity.point;
  const elevation = pose === 'sleep' || pose === 'bench' ? piece.height : 0;
  const z =
    pose === 'sleep' || pose === 'bench'
      ? Math.round(piece.footprint.y + piece.footprint.height) + 12
      : Math.round(point.y) + 10;
  return { pose, phase, frame, point, elevation, z };
}

export function emiyaHasPaperWindow(room: EmiyaRoomId) {
  return room !== 'forecourt' && room !== 'garden' && room !== 'lounge';
}

export function emiyaActorContact(
  location: EmiyaLocation,
  active: { id: string; seconds: number } | null,
) {
  const activity =
    active && EMIYA_ACTIVITIES.find((activity) => activity.id === active.id);
  const pose = activity ? emiyaActivityPose(activity, active!.seconds) : null;
  return {
    point: pose?.point ?? location.point,
    elevation: pose?.elevation ?? 0,
  };
}
