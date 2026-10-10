import {
  EmiyaLifeSession,
  parseEmiyaLifeSave,
  type EmiyaLifeSave,
} from './fate-emiya-life';
import { EMIYA_ENTRY, EMIYA_ROOMS } from './fate-emiya-house';
import { indoorRoom, nearHomeEntrance } from './fate-indoor-map';
import { clampZoom, type Camera, type CameraScene } from './fate-camera';
import { STREET, type Point } from './street';
import type { DailyLife } from './fate-life';

/** Versioned scene data only. DailyLife remains the one authoritative world. */
export type EmiyaStreetReturn = {
  actor: 'shirou';
  point: Point;
  scene: CameraScene;
  zoom: { street: number; map: number };
  camera: Camera;
  manual: Point | null;
};
export type EmiyaGameSave = Omit<EmiyaLifeSave, 'life' | 'running'> & {
  active: boolean;
  street: EmiyaStreetReturn;
};
const validPoint = (point: Point, world = false) =>
  point &&
  typeof point.x === 'number' &&
  typeof point.y === 'number' &&
  Number.isFinite(point.x) &&
  Number.isFinite(point.y) &&
  (!world ||
    (point.x >= 0 &&
      point.y >= 0 &&
      point.x <= STREET.width &&
      point.y <= STREET.height));

export function parseEmiyaGameSave(
  value: unknown,
  life: DailyLife,
): EmiyaGameSave {
  const save = value as EmiyaGameSave;
  const street = save?.street;
  if (
    !save ||
    typeof save.active !== 'boolean' ||
    !street ||
    street.actor !== 'shirou' ||
    !validPoint(street.point, true) ||
    !nearHomeEntrance(street.point, 'emiya') ||
    !['street', 'map'].includes(street.scene) ||
    !street.zoom ||
    !['street', 'map'].every((scene) => {
      const key = scene as CameraScene;
      return (
        typeof street.zoom[key] === 'number' &&
        Number.isFinite(street.zoom[key]) &&
        clampZoom(street.zoom[key], key) === street.zoom[key]
      );
    }) ||
    !validPoint(street.camera) ||
    !Number.isFinite(street.camera.scale) ||
    street.camera.scale <= 0 ||
    street.camera.scale > 100 ||
    (street.manual !== null && !validPoint(street.manual, true)) ||
    !validPoint(save.location?.point)
  )
    throw new Error('卫宫宅场景记录无效，原存档已保留。');
  if (
    save.active &&
    (life.positions.shirou.x !== street.point.x ||
      life.positions.shirou.y !== street.point.y ||
      (['forecourt', 'garden'].includes(save.location.room)
        ? !!life.indoor
        : life.indoor?.actor !== 'shirou' || life.indoor.home !== 'emiya'))
  )
    throw new Error('卫宫宅与角色位置不一致，原存档已保留。');
  const parsed = parseEmiyaLifeSave({ ...save, life, running: false });
  if (
    save.active &&
    life.indoor &&
    indoorRoom(life.indoor, 'emiya') !==
      (EMIYA_ROOMS[parsed.location.room].zone ?? 'hall')
  )
    throw new Error('卫宫宅房间记录不一致，原存档已保留。');
  return {
    version: 1,
    active: save.active,
    street: structuredClone(street),
    location: parsed.location,
    meal: parsed.meal,
    residents: parsed.residents,
    household: parsed.household,
  };
}

/** Exclusive control is given to this engine until release; no playtest key is read. */
export class EmiyaGameSession extends EmiyaLifeSession {
  readonly street: EmiyaStreetReturn;
  constructor(
    life: DailyLife,
    street: EmiyaStreetReturn,
    previous?: EmiyaGameSave,
  ) {
    super({
      version: 1,
      life,
      location: previous?.active
        ? previous.location
        : structuredClone(EMIYA_ENTRY),
      meal: previous?.meal ?? false,
      running: false,
      residents: previous?.active ? previous.residents : undefined,
      household: previous?.household,
    });
    this.street = structuredClone(street);
  }
  gameSave(active = true): { life: DailyLife; emiya: EmiyaGameSave } {
    const { life, running: _running, ...scene } = this.save();
    return {
      life,
      emiya: { ...scene, active, street: structuredClone(this.street) },
    };
  }
  release() {
    this.running = false;
    this.cancelHelp();
    for (const invitation of this.household.invitations)
      if (invitation.status === 'walking')
        this.cancelInvitation(invitation.person);
    const result = this.gameSave(false);
    delete result.life.indoor;
    // The canonical street footpoint was never replaced by sample coordinates.
    result.life.positions.shirou = { ...this.street.point };
    return result;
  }
}
