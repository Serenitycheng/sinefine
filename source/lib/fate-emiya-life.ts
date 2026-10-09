import {
  advanceDailyLife,
  createDailyLife,
  parseDailyLife,
  snapshotLife,
  type DailyLife,
} from './fate-life';
import { createStreetActors, type Actor } from './street';
import { nearestIndoorPoint } from './fate-indoor-map';
import { interiorResidents } from './fate-interior';
import { homeCarePlan, takeHomeCare } from './fate-self-care';
import { spendPlayerTime } from './fate-player-time';
import { clockRate } from './fate-clock';
import { interiorWalkable } from './fate-city-interior-navigation';
import {
  EMIYA_ACTIVITIES,
  EMIYA_ENTRY,
  EMIYA_ROOMS,
  type EmiyaActivity,
  type EmiyaLocation,
  type EmiyaRoomId,
} from './fate-emiya-house';

/** A separate local playtest; this key is never read by the main save provider. */
export const EMIYA_LIFE_KEY = 'sinefine-emiya-life-playtest-v1';
export type EmiyaLifeSave = {
  version: 1;
  life: DailyLife;
  location: EmiyaLocation;
  meal: boolean;
  running?: boolean;
};
const formalContacts = {
  lounge: { x: 238, y: 186 },
  table: { x: 620, y: 190 },
  study: { x: 240, y: 390 },
  rest: { x: 565, y: 395 },
};
export const EMIYA_LIFE_MINUTES: Record<string, number> = {
  sit: 20,
  cook: 45,
  eat: 20,
  read: 35,
  study: 40,
  rest: 60,
  garden: 20,
};

export function createEmiyaLifeSave(): EmiyaLifeSave {
  return {
    version: 1,
    life: createDailyLife(),
    location: structuredClone(EMIYA_ENTRY),
    meal: false,
    running: true,
  };
}
export function parseEmiyaLifeSave(value: unknown): EmiyaLifeSave {
  const save = value as EmiyaLifeSave;
  if (
    !save ||
    save.version !== 1 ||
    typeof save.meal !== 'boolean' ||
    (save.running !== undefined && typeof save.running !== 'boolean') ||
    !save.location ||
    !Object.hasOwn(EMIYA_ROOMS, save.location.room) ||
    !save.location.point ||
    !interiorWalkable(
      save.location.point,
      EMIYA_ROOMS[save.location.room].scene,
    )
  )
    throw new Error('卫宫宅试玩存档无效，原记录已保留。');
  return {
    version: 1,
    life: parseDailyLife(save.life),
    location: structuredClone(save.location),
    meal: save.meal,
    running: save.running ?? false,
  };
}

/** Reuses the actual daily engine, clock and home-care rules. Sample floor
 * coordinates live in a sidecar; the four existing room identities stay intact. */
export class EmiyaLifeSession {
  life: DailyLife;
  actors: Actor[];
  location: EmiyaLocation;
  meal: boolean;
  running = true;
  constructor(save: EmiyaLifeSave = createEmiyaLifeSave()) {
    this.life = structuredClone(save.life);
    this.location = structuredClone(save.location);
    this.meal = save.meal;
    this.running = save.running ?? false;
    this.actors = createStreetActors().map((actor) => ({
      ...actor,
      ...this.life.positions[actor.id],
    }));
    this.move(this.location, this.meal);
  }
  move(location: EmiyaLocation, meal: boolean) {
    this.location = { room: location.room, point: { ...location.point } };
    this.meal = meal;
    const zone = EMIYA_ROOMS[location.room].zone;
    if (location.room === 'forecourt' || location.room === 'garden') {
      delete this.life.indoor;
    } else {
      const point = nearestIndoorPoint(
        zone ? formalContacts[zone] : { x: 360, y: 230 },
        'emiya',
      );
      this.life.indoor = {
        actor: 'shirou',
        home: 'emiya',
        layout: 2,
        ...point,
      };
    }
  }
  tick(dt: number, location: EmiyaLocation, meal: boolean) {
    this.move(location, meal);
    advanceDailyLife(this.life, this.actors, dt, {
      running: this.running,
      speed: 1,
      clockRate: clockRate(1),
      controlled: 'shirou',
    });
  }
  complete(activity: EmiyaActivity, location: EmiyaLocation, meal: boolean) {
    this.move(location, meal);
    if (
      activity.room !== location.room ||
      Math.hypot(
        activity.point.x - location.point.x,
        activity.point.y - location.point.y,
      ) > 2
    )
      return { ok: false, message: '先沿路走到家具旁。' };
    const care =
      activity.id === 'sit'
        ? 'rest'
        : activity.id === 'rest'
          ? 'nap'
          : activity.id === 'eat'
            ? 'meal'
            : null;
    if (care) {
      if (activity.id === 'eat' && !meal)
        return { ok: false, message: '先备餐，再到餐桌用餐。' };
      const plan = homeCarePlan(this.life, 'shirou', care);
      if (!plan.ok) return plan;
      const result = takeHomeCare(this.life, this.actors, 'shirou', care);
      if (result.ok && activity.id === 'eat') this.meal = false;
      return result;
    }
    const minutes = EMIYA_LIFE_MINUTES[activity.id];
    if (!EMIYA_ACTIVITIES.some((a) => a.id === activity.id) || !minutes)
      return { ok: false, message: '没有这项活动。' };
    const { elapsed } = spendPlayerTime(
      this.life,
      this.actors,
      'shirou',
      minutes,
    );
    if (activity.id === 'cook') this.meal = true;
    const message = `士郎${activity.label}，经过 ${Math.round(elapsed)} 分钟。`;
    this.life.events = [
      ...this.life.events,
      {
        id: this.life.nextId++,
        minute: this.life.minutes,
        waverStage: this.life.waverStage,
        text: message,
      },
    ].slice(-80);
    return { ok: true, message };
  }
  wait(minutes: number) {
    return spendPlayerTime(this.life, this.actors, 'shirou', minutes);
  }
  toggleRunning() {
    this.running = !this.running;
  }
  residents() {
    return interiorResidents(this.life, 'emiya', 'shirou');
  }
  save(): EmiyaLifeSave {
    return {
      version: 1,
      life: snapshotLife(this.life, this.actors),
      location: structuredClone(this.location),
      meal: this.meal,
      running: this.running,
    };
  }
}

export function isEmiyaRoom(value: string): value is EmiyaRoomId {
  return Object.hasOwn(EMIYA_ROOMS, value);
}
