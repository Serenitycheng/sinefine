import { isPartner, STREET_PARTNERS, type PartnerId } from './fate-cast';
import { occupiedHome, type DailyLife, type LifeAction } from './fate-life';
import { interiorZone } from './fate-interior';
import { nearHomeEntrance } from './fate-indoor-map';
import { interiorWalkable } from './fate-city-interior-navigation';
import { interiorProject } from './fate-city-interior-scenes';
import { cityWalkFacing } from './fate-city-art-controls';
import {
  interiorYieldRoute,
  advanceInteriorYield,
} from './fate-interior-traffic';
import { interiorWalkFacing } from './fate-interior-controls';
import {
  emiyaWalkAdvance,
  SABER_GAIT,
  EMIYA_VISITOR_SPRITES,
} from './fate-emiya-walk';
import {
  EMIYA_ENTRY,
  EMIYA_ROOMS,
  emiyaHouseRoute,
  emiyaAdvanceRoute,
  type EmiyaLocation,
  type EmiyaLeg,
  type EmiyaRoomId,
} from './fate-emiya-house';

export type EmiyaResidentSave = EmiyaLocation & {
  id: PartnerId;
  direction: 'up' | 'down' | 'left' | 'right';
  walked: number;
};
export type EmiyaResidentIntents = ReadonlyMap<
  PartnerId,
  { kind: LifeAction; location?: EmiyaLocation }
>;
export type EmiyaResidentBody = EmiyaResidentSave & {
  frame: number;
  seconds: number;
  kind: LifeAction | null;
  phase: 'walking' | 'doing' | 'leaving';
  legs: EmiyaLeg[];
  target: EmiyaLocation;
  intent: string;
  blocked: number;
  cooldown: number;
};
const distance = (a: EmiyaLocation, b: EmiyaLocation) =>
  a.room === b.room
    ? Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y)
    : Infinity;
const offsets = [
  [0, 0],
  [45, 0],
  [-45, 0],
  [0, 45],
  [0, -45],
  [75, 40],
  [-75, 40],
  [75, -40],
  [-75, -40],
  [0, 90],
  [0, -90],
];

/** Choose a floor contact, never a point inside the drawn furniture. */
export function emiyaResidentDestination(
  life: DailyLife,
  id: PartnerId,
  kind = life.people[id].activity?.kind,
): EmiyaLocation {
  const activity = life.people[id].activity;
  const room = interiorZone(
    activity && kind ? { ...activity, kind } : activity,
  );
  if (room === 'table' && kind === 'eat') {
    const seats = {
      saber: { x: 808, y: 550 },
      sakura: { x: 945, y: 455 },
      taiga: { x: 815, y: 335 },
    };
    if (id === 'saber' || id === 'sakura' || id === 'taiga')
      return { room, point: { ...seats[id] } };
  }
  const base = {
    lounge: { x: 190, y: 545 },
    table: kind === 'cook' ? { x: 290, y: 290 } : { x: 850, y: 550 },
    study: { x: 570, y: 355 },
    rest: { x: 490, y: 385 },
  }[room];
  const slot = STREET_PARTNERS.indexOf(id) % 3;
  const preferred = {
    room,
    point: { x: base.x + (slot - 1) * 42, y: base.y + slot * 8 },
  };
  for (const [dx, dy] of offsets) {
    const point = { x: preferred.point.x + dx, y: preferred.point.y + dy };
    if (interiorWalkable(point, EMIYA_ROOMS[room].scene))
      return { room, point };
  }
  return { room, point: { x: 500, y: 560 } };
}

export function parseEmiyaResidents(value: unknown): EmiyaResidentSave[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > STREET_PARTNERS.length - 1)
    throw new Error('屋内人物记录无效，原记录已保留。');
  const ids = new Set<PartnerId>();
  const result: EmiyaResidentSave[] = [];
  for (const item of value) {
    if (
      !item ||
      !isPartner(item.id) ||
      item.id === 'shirou' ||
      ids.has(item.id) ||
      !Object.hasOwn(EMIYA_ROOMS, item.room) ||
      !item.point ||
      !interiorWalkable(
        item.point,
        EMIYA_ROOMS[item.room as EmiyaRoomId].scene,
      ) ||
      !['up', 'down', 'left', 'right'].includes(item.direction) ||
      !Number.isFinite(item.walked) ||
      item.walked < 0 ||
      item.walked > 1e9
    )
      throw new Error('屋内人物记录无效，原记录已保留。');
    const body = {
      id: item.id,
      room: item.room as EmiyaRoomId,
      point: { ...item.point },
      direction: item.direction,
      walked: item.walked,
    };
    if (result.some((other) => distance(body, other) < 30 - 1e-6))
      throw new Error('屋内人物位置重叠，原记录已保留。');
    ids.add(item.id);
    result.push(body);
  }
  return result;
}

/** A presentation of real presence and activities, separate from world save coordinates. */
export class EmiyaResidents {
  private bodies = new Map<PartnerId, EmiyaResidentBody>();
  private yielding = new Map<
    PartnerId,
    { path: import('./fate-city-layout').CityPoint[]; seconds: number }
  >();
  requestPassage(player: EmiyaLocation, toward: EmiyaLocation) {
    for (const body of this.all()) {
      if (body.room !== toward.room || this.yielding.has(body.id)) continue;
      const from = player.room === toward.room ? player.point : toward.point;
      const next =
        Math.hypot(from.x - toward.point.x, from.y - toward.point.y) > 0.001
          ? toward.point
          : { x: from.x, y: from.y - 80 };
      if (Math.hypot(body.point.x - from.x, body.point.y - from.y) > 90)
        continue;
      const dx = next.x - from.x,
        dy = next.y - from.y;
      if (
        (body.point.x - from.x) * dx + (body.point.y - from.y) * dy < -1 ||
        Math.abs((body.point.x - from.x) * dy - (body.point.y - from.y) * dx) /
          Math.hypot(dx, dy) >
          36
      )
        continue;
      const occupied = this.all()
        .filter((b) => b !== body && b.room === body.room)
        .map((b) => b.point);
      if (player.room === body.room) occupied.push(player.point);
      const path = interiorYieldRoute(
        body.point,
        from,
        next,
        EMIYA_ROOMS[body.room].scene,
        occupied,
      );
      if (path?.length) this.yielding.set(body.id, { path, seconds: 2.5 });
    }
  }
  private stepYield(player: EmiyaLocation, dt: number) {
    let changed = false;
    for (const [id, ticket] of this.yielding) {
      ticket.seconds -= dt;
      const body = this.bodies.get(id);
      if (!body || ticket.seconds <= 0) {
        this.yielding.delete(id);
        continue;
      }
      const scene = EMIYA_ROOMS[body.room].scene;
      const occupied = this.all()
        .filter((b) => b !== body && b.room === body.room)
        .map((b) => b.point);
      if (player.room === body.room) occupied.push(player.point);
      const before = { room: body.room, point: { ...body.point } };
      const advanced = advanceInteriorYield(
        body.point,
        ticket.path,
        120 * dt,
        scene,
        occupied,
      );
      body.point = advanced.point;
      ticket.path = advanced.path;
      body.frame = 0;
      if (advanced.travelled > 0) {
        body.direction = interiorWalkFacing(
          before.point,
          body.point,
          scene.floor,
          body.direction,
        );
        const cycle =
          body.id === 'saber'
            ? SABER_GAIT
            : body.id === 'sakura' || body.id === 'taiga'
              ? {
                  frames: 6,
                  cycleDistance: EMIYA_VISITOR_SPRITES[body.id].cycleDistance,
                }
              : { frames: 5, cycleDistance: 150 };
        Object.assign(
          body,
          emiyaWalkAdvance(body.walked, before, advanced.travelled, cycle),
        );
        changed = true;
      }
      body.phase = 'walking';
      body.seconds = 0;
    }
    return changed;
  }
  constructor(
    life: DailyLife,
    player: EmiyaLocation,
    saved: EmiyaResidentSave[] = [],
  ) {
    for (const body of saved) this.add(body);
    this.sync(life, player, true);
    const contacts = this.contacts(life);
    for (const body of this.all()) {
      const activity = life.people[body.id].activity;
      const inside = occupiedHome(life, body.id) === 'emiya';
      const arriving =
        activity?.phase === 'going' &&
        activity.home === 'emiya' &&
        !activity.school;
      body.target = inside
        ? contacts.get(body.id)!
        : arriving
          ? { room: 'hall', point: { x: 480, y: 445 } }
          : EMIYA_ENTRY;
      body.kind = activity?.kind ?? null;
      body.phase =
        !inside && !arriving
          ? 'leaving'
          : distance(body, body.target) < 1
            ? 'doing'
            : 'walking';
    }
  }
  all(): EmiyaResidentBody[] {
    return [...this.bodies.values()];
  }
  save(): EmiyaResidentSave[] {
    return this.all().map(({ id, room, point, direction, walked }) => ({
      id,
      room,
      point: { ...point },
      direction,
      walked,
    }));
  }
  private add(save: EmiyaResidentSave) {
    this.bodies.set(save.id, {
      ...save,
      point: { ...save.point },
      frame: 0,
      seconds: 0,
      kind: null,
      phase: 'walking',
      legs: [],
      target: { room: save.room, point: { ...save.point } },
      intent: '',
      blocked: 0,
      cooldown: 0,
    });
  }
  private clearNear(
    location: EmiyaLocation,
    occupied: readonly EmiyaLocation[],
  ) {
    for (const [dx, dy] of offsets) {
      const next = {
        room: location.room,
        point: { x: location.point.x + dx, y: location.point.y + dy },
      };
      if (
        interiorWalkable(next.point, EMIYA_ROOMS[next.room].scene) &&
        occupied.every((other) => distance(next, other) >= 36)
      )
        return next;
    }
    return null;
  }
  private sync(life: DailyLife, player: EmiyaLocation, initial = false) {
    for (const id of STREET_PARTNERS) {
      if (id === 'shirou' || this.bodies.has(id)) continue;
      const activity = life.people[id].activity;
      const inside = occupiedHome(life, id) === 'emiya';
      const arriving =
        activity?.phase === 'going' &&
        !activity.school &&
        activity.home === 'emiya' &&
        nearHomeEntrance(life.positions[id], 'emiya');
      if (!inside && !arriving) continue;
      const location = this.clearNear(
        initial && inside ? emiyaResidentDestination(life, id) : EMIYA_ENTRY,
        [player, ...this.all()],
      );
      if (location) this.add({ ...location, id, direction: 'up', walked: 0 });
    }
  }
  private contacts(life: DailyLife, intents?: EmiyaResidentIntents) {
    const contacts = new Map<PartnerId, EmiyaLocation>();
    for (const body of this.all()) {
      if (occupiedHome(life, body.id) !== 'emiya') continue;
      const preferred =
        intents?.get(body.id)?.location ??
        emiyaResidentDestination(life, body.id, intents?.get(body.id)?.kind);
      // Reserve distinct activity contacts so two residents do not endlessly
      // seek the same occupied endpoint. Reservations stay stable while walking.
      const contact = this.clearNear(preferred, [...contacts.values()]);
      contacts.set(
        body.id,
        contact ?? { room: body.room, point: { ...body.point } },
      );
    }
    return contacts;
  }
  step(
    life: DailyLife,
    player: EmiyaLocation,
    dt: number,
    running = true,
    intents?: EmiyaResidentIntents,
  ) {
    if (!Number.isFinite(dt) || dt <= 0) return false;
    if (!running) {
      const changed = this.reconcile(life, player, intents);
      return this.stepYield(player, Math.min(dt, 0.05)) || changed;
    }
    dt = Math.min(dt, 0.05);
    const count = this.bodies.size;
    this.sync(life, player);
    const contacts = this.contacts(life, intents);
    let changed = this.stepYield(player, dt) || this.bodies.size !== count;
    for (const body of this.all()) {
      if (this.yielding.has(body.id)) continue;
      const activity = life.people[body.id].activity;
      const inside = occupiedHome(life, body.id) === 'emiya';
      const arriving =
        activity?.phase === 'going' &&
        !activity.school &&
        activity.home === 'emiya';
      const leaving = !inside && !arriving;
      const target = leaving
        ? EMIYA_ENTRY
        : inside
          ? contacts.get(body.id)!
          : { room: 'hall' as const, point: { x: 480, y: 445 } };
      const kind = intents?.get(body.id)?.kind ?? activity?.kind;
      const intent = `${leaving}:${target.room}:${kind}:${target.point.x}:${target.point.y}`;
      const occupied = [
        player,
        ...this.all().filter((other) => other.id !== body.id),
      ];
      body.cooldown = Math.max(0, body.cooldown - dt);
      body.kind = kind ?? null;
      if (intent !== body.intent) {
        body.target = target;
        body.intent = intent;
        body.legs = [];
        body.cooldown = 0;
        changed = true;
      }
      if (
        !body.legs.length &&
        distance(body, body.target) > 1 &&
        body.cooldown === 0
      ) {
        body.legs = emiyaHouseRoute(body, body.target, occupied) ?? [];
        body.cooldown = 0.8;
      }
      const before = { room: body.room, point: { ...body.point } };
      const previousFrame = body.frame;
      const previousBodyPhase = body.phase;
      const advanced = emiyaAdvanceRoute(body, body.legs, 145 * dt, occupied);
      body.room = advanced.location.room;
      body.point = advanced.location.point;
      body.legs = advanced.legs;
      body.blocked = advanced.blocked ? body.blocked + dt : 0;
      if (body.blocked >= 0.8 && body.cooldown === 0) {
        // Give the player passage by physically walking to a nearby free spot.
        const parking = this.clearNear(
          {
            room: body.room,
            point: {
              x: body.point.x + (body.id.charCodeAt(0) % 2 ? 70 : -70),
              y: body.point.y + 60,
            },
          },
          occupied,
        );
        body.legs =
          (parking && emiyaHouseRoute(body, parking, occupied)) ||
          emiyaHouseRoute(body, body.target, occupied) ||
          [];
        body.blocked = 0;
        body.cooldown = 1.2;
      }
      if (advanced.travelled > 0) {
        if (before.room === body.room) {
          const floor = EMIYA_ROOMS[body.room].scene.floor;
          const a = interiorProject(before.point, floor),
            b = interiorProject(body.point, floor);
          body.direction = cityWalkFacing(
            { x: b.x - a.x, y: b.y - a.y },
            body.direction,
          );
        }
        if (body.id !== 'saber' && body.id !== 'sakura' && body.id !== 'taiga')
          body.walked += advanced.travelled;
        changed = true;
      }
      if (body.id === 'saber')
        Object.assign(
          body,
          emiyaWalkAdvance(body.walked, before, advanced.travelled, SABER_GAIT),
        );
      else if (body.id === 'sakura' || body.id === 'taiga')
        Object.assign(
          body,
          emiyaWalkAdvance(body.walked, before, advanced.travelled, {
            frames: 6,
            cycleDistance: EMIYA_VISITOR_SPRITES[body.id].cycleDistance,
          }),
        );
      else
        body.frame =
          advanced.travelled > 0 ? 1 + (Math.floor(body.walked / 22) % 5) : 0;
      body.phase = leaving
        ? 'leaving'
        : body.legs.length || distance(body, body.target) > 1
          ? 'walking'
          : 'doing';
      if (body.frame !== previousFrame || body.phase !== previousBodyPhase)
        changed = true;
      const previousPhase = Math.floor(body.seconds / 0.85);
      body.seconds = body.phase === 'doing' ? body.seconds + dt : 0;
      if (Math.floor(body.seconds / 0.85) !== previousPhase) changed = true;
      if (leaving && distance(body, EMIYA_ENTRY) < 1) {
        this.bodies.delete(body.id);
        changed = true;
      }
    }
    return changed;
  }
  reconcile(
    life: DailyLife,
    player: EmiyaLocation,
    intents?: EmiyaResidentIntents,
  ) {
    const count = this.bodies.size;
    this.sync(life, player);
    const contacts = this.contacts(life, intents);
    let changed = this.bodies.size !== count;
    for (const body of this.all()) {
      const activity = life.people[body.id].activity;
      const inside = occupiedHome(life, body.id) === 'emiya';
      const arriving =
        activity?.phase === 'going' &&
        !activity.school &&
        activity.home === 'emiya';
      const leaving = !inside && !arriving;
      const target = leaving
        ? EMIYA_ENTRY
        : inside
          ? contacts.get(body.id)!
          : { room: 'hall' as const, point: { x: 480, y: 445 } };
      const kind = intents?.get(body.id)?.kind ?? activity?.kind;
      const intent = `${leaving}:${target.room}:${kind}:${target.point.x}:${target.point.y}`;
      if (body.intent !== intent) {
        body.target = target;
        body.intent = intent;
        body.legs = [];
        body.cooldown = 0;
        body.seconds = 0;
        changed = true;
      }
      body.kind = kind ?? null;
      body.phase = leaving
        ? 'leaving'
        : distance(body, target) < 1
          ? 'doing'
          : 'walking';
      body.frame = 0;
    }
    return changed;
  }
}
