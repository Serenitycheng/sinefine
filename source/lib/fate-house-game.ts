import { TOHSAKA_ROOMS } from './fate-tohsaka-house';
import { MATOU_ROOMS } from './fate-matou-house';
import { EINZBERN_ROOMS } from './fate-einzbern-house';
import { FORMAL_HOUSE_PLANS } from './fate-formal-house-plans';
import { EMIYA_ENTRY, type EmiyaRoomId } from './fate-emiya-house';
import { WAVER_ROOMS } from './fate-waver-house';
import { TEMPLE_ROOMS } from './fate-temple-house';
import { CHURCH_ROOMS } from './fate-church-house';
import {
  FORMAL_PUBLIC_SITES,
  isFormalPublicSite,
  isFormalSite,
  nearFormalEntrance,
  type HouseSiteId,
} from './fate-formal-buildings';
import {
  insidePublicBuilding,
  publicResidentRoom,
} from './fate-building-presence';
import { homeOf, isHomeId } from './fate-housing';
import { houseActorHasPose } from './fate-house-sprites';
import { visitPublicPlace } from './fate-public-places';
import {
  startPublicOuting,
  choosePublicOuting,
  interactPublicOuting,
  cancelPublicOuting,
  type CafeOrder,
  type OutingChoice,
} from './fate-public-outings';
import {
  interiorClearSegment,
  interiorMove,
  interiorRoute,
  interiorWalkable,
} from './fate-city-interior-navigation';
import { interiorWalkFacing } from './fate-interior-controls';
import { interiorResidents, interiorZone } from './fate-interior';
import { indoorRoom, nearestIndoorPoint } from './fate-indoor-map';
import { roomPoint } from './fate-indoor-layout';
import {
  advanceDailyLife,
  encounterDialogue,
  occupiedHome,
  snapshotLife,
  type DailyLife,
  type LifeAction,
} from './fate-life';
import {
  clockRate,
  type FateClockSpeed,
  type FateWalkPace,
} from './fate-clock';
import { createStreetActors, STREET, type Actor, type Point } from './street';
import { clampZoom, type Camera, type CameraScene } from './fate-camera';
import { isPartner, STREET_PARTNERS, type PartnerId } from './fate-cast';
import { recordOnsiteConversation } from './fate-interaction';
import { HOME_CARE, takeHomeCare, type HomeCareAction } from './fate-self-care';
import type { Exchange } from './fate-state';
import type {
  PreviewDirection,
  PreviewDoor,
  PreviewRoom,
} from './fate-preview-house';
import type { IndoorRoom } from './fate-indoor-map';

export type HouseHomeId =
  | 'emiya'
  | 'tohsaka'
  | 'matou'
  | 'einzbern'
  | 'waver'
  | 'temple'
  | 'church';
export type HouseActorId = PartnerId;
export type HouseRoomId =
  | EmiyaRoomId
  | keyof typeof TOHSAKA_ROOMS
  | keyof typeof MATOU_ROOMS
  | keyof typeof EINZBERN_ROOMS
  | keyof typeof WAVER_ROOMS
  | keyof typeof TEMPLE_ROOMS
  | keyof typeof CHURCH_ROOMS
  | 'classroom'
  | 'archery'
  | 'staffroom'
  | 'library'
  | 'window'
  | 'prep'
  | 'annex';
export type HouseStreetReturn = {
  actor: HouseActorId;
  point: Point;
  scene: CameraScene;
  zoom: { street: number; map: number };
  camera: Camera;
  manual: Point | null;
};
export type HouseResidentBody = {
  id: PartnerId;
  room: HouseRoomId;
  point: Point;
  direction: PreviewDirection;
  travelled: number;
  walking: boolean;
};
export type HouseGameSave = {
  version: 1;
  active: boolean;
  home: HouseSiteId;
  street: HouseStreetReturn;
  location: { room: HouseRoomId; point: Point };
  direction: PreviewDirection;
  action: string | null;
  zoom: number;
  residents: Omit<HouseResidentBody, 'walking'>[];
};

/** These remain the existing four life-room identities, not sample coordinates. */
export const HOUSE_LIFE_ZONES = {
  hall: 'hall',
  study: 'lounge',
  dining: 'table',
  bedroom: 'rest',
  workshop: 'study',
} as const;
const CONTACTS = {
  lounge: { x: 238, y: 186 },
  table: { x: 620, y: 190 },
  study: { x: 240, y: 390 },
  rest: { x: 565, y: 395 },
};
const DIRECTIONS = ['up', 'down', 'left', 'right'];
export const HOUSE_RESIDENT_IDS = [
  'emiya',
  'tokiomi',
  'gilgamesh',
  'sakura',
] as const;
export const MATOU_LIFE_ZONES = {
  hall: 'hall',
  lounge: 'lounge',
  dining: 'table',
  bedroom: 'rest',
  archive: 'study',
} as const;
export const EINZBERN_LIFE_ZONES = {
  hall: 'hall',
  lounge: 'lounge',
  kitchen: 'table',
  parents: 'rest',
  illya: 'rest',
  study: 'study',
} as const;
type HouseRules = {
  name: string;
  rooms: Record<string, PreviewRoom>;
  lifeZones: Partial<Record<HouseRoomId, IndoorRoom>>;
  residents: readonly PartnerId[];
  restRooms?: Partial<Record<PartnerId, HouseRoomId>>;
  careRooms?: Partial<Record<HomeCareAction, HouseRoomId>>;
  activityRooms?: Partial<Record<LifeAction, HouseRoomId>>;
};
const publicRule = (id: (typeof FORMAL_PUBLIC_SITES)[number]): HouseRules => ({
  name: FORMAL_HOUSE_PLANS[id].name,
  rooms: FORMAL_HOUSE_PLANS[id].rooms,
  lifeZones: {},
  residents: STREET_PARTNERS,
});
const PUBLIC_RULES = Object.fromEntries(
  FORMAL_PUBLIC_SITES.map((id) => [id, publicRule(id)]),
) as Record<(typeof FORMAL_PUBLIC_SITES)[number], HouseRules>;
const HOUSE_RULES: Record<HouseSiteId, HouseRules> = {
  ...PUBLIC_RULES,
  emiya: {
    name: '卫宫宅',
    rooms: FORMAL_HOUSE_PLANS.emiya.rooms,
    lifeZones: {
      hall: 'hall',
      lounge: 'lounge',
      table: 'table',
      study: 'study',
      rest: 'rest',
    },
    residents: STREET_PARTNERS,
  },
  tohsaka: {
    name: '远坂宅',
    rooms: TOHSAKA_ROOMS,
    lifeZones: HOUSE_LIFE_ZONES,
    residents: [
      ...HOUSE_RESIDENT_IDS,
      ...STREET_PARTNERS.filter(
        (id) => !HOUSE_RESIDENT_IDS.some((native) => native === id),
      ),
    ],
  },
  matou: {
    name: '间桐宅',
    rooms: MATOU_ROOMS,
    lifeZones: MATOU_LIFE_ZONES,
    residents: [
      'sakura',
      'kariya',
      'medusa',
      'rin',
      ...STREET_PARTNERS.filter(
        (id) => !['sakura', 'kariya', 'medusa', 'rin'].includes(id),
      ),
    ],
  },
  einzbern: {
    name: '切嗣一家新居',
    rooms: EINZBERN_ROOMS,
    lifeZones: EINZBERN_LIFE_ZONES,
    residents: [
      'kiritsugu',
      'irisviel',
      'illya',
      'shirou',
      ...STREET_PARTNERS.filter(
        (id) => !['kiritsugu', 'irisviel', 'illya', 'shirou'].includes(id),
      ),
    ],
    restRooms: { kiritsugu: 'parents', irisviel: 'parents', illya: 'illya' },
  },
  waver: {
    name: '韦伯的住处',
    rooms: WAVER_ROOMS,
    lifeZones: {
      hall: 'hall',
      lounge: 'lounge',
      kitchen: 'table',
      bedroom: 'rest',
      engawa: 'study',
    },
    residents: STREET_PARTNERS,
    activityRooms: { read: 'lounge', study: 'lounge' },
  },
  temple: {
    name: '柳洞寺',
    rooms: TEMPLE_ROOMS,
    lifeZones: {
      hall: 'hall',
      lounge: 'lounge',
      kitchen: 'table',
      quarters: 'rest',
      craft: 'study',
      engawa: 'lounge',
    },
    residents: STREET_PARTNERS,
  },
  church: {
    name: '冬木教会',
    rooms: CHURCH_ROOMS,
    lifeZones: {
      hall: 'hall',
      chapel: 'lounge',
      vestry: 'study',
      quarters: 'rest',
      cellar: 'study',
    },
    residents: STREET_PARTNERS,
    careRooms: { meal: 'quarters' },
    activityRooms: { eat: 'quarters', cook: 'quarters' },
  },
};
export function houseHomeForActor(actor: string): HouseHomeId | null {
  return actor === 'rin'
    ? 'tohsaka'
    : ['sakura', 'kariya', 'medusa'].includes(actor)
      ? 'matou'
      : ['kiritsugu', 'irisviel', 'illya'].includes(actor)
        ? 'einzbern'
        : ['waver', 'iskandar'].includes(actor)
          ? 'waver'
          : ['kuzuki', 'medea'].includes(actor)
            ? 'temple'
            : ['kirei', 'cu'].includes(actor)
              ? 'church'
              : null;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const validPoint = (p: Point | undefined, world = false) =>
  !!p &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  (!world ||
    (p.x >= 0 && p.y >= 0 && p.x <= STREET.width && p.y <= STREET.height));
const validRoom = (room: string, home: HouseSiteId): room is HouseRoomId =>
  Object.hasOwn(HOUSE_RULES[home].rooms, room);
export function houseLifePoint(
  room: HouseRoomId,
  home: HouseHomeId = 'tohsaka',
) {
  const zone = HOUSE_RULES[home].lifeZones[room];
  if (!zone) throw new Error('房间与住宅不一致。');
  return nearestIndoorPoint(
    zone === 'hall'
      ? { x: 360, y: 230 }
      : roomPoint(home, zone, CONTACTS[zone]),
    home,
  );
}
export function parseHouseGameSave(
  value: unknown,
  life: DailyLife,
): HouseGameSave {
  const save = value as HouseGameSave,
    street = save?.street;
  if (!save || !Object.hasOwn(HOUSE_RULES, save.home))
    throw new Error('宅内场景记录无效，原存档已保留。');
  const rules = HOUSE_RULES[save.home],
    name = rules.name;
  if (
    !save ||
    save.version !== 1 ||
    typeof save.active !== 'boolean' ||
    !street ||
    !isPartner(street.actor) ||
    !validPoint(street.point, true) ||
    !nearFormalEntrance(street.point, save.home) ||
    !['street', 'map'].includes(street.scene) ||
    !street.zoom ||
    !['street', 'map'].every((key) => {
      const scene = key as CameraScene,
        zoom = street.zoom[scene];
      return Number.isFinite(zoom) && clampZoom(zoom, scene) === zoom;
    }) ||
    !validPoint(street.camera) ||
    !Number.isFinite(street.camera.scale) ||
    street.camera.scale <= 0 ||
    street.camera.scale > 100 ||
    (street.manual !== null && !validPoint(street.manual, true)) ||
    !save.location ||
    !validRoom(save.location.room, save.home) ||
    !validPoint(save.location.point) ||
    !interiorWalkable(
      save.location.point,
      rules.rooms[save.location.room].scene,
    ) ||
    !DIRECTIONS.includes(save.direction) ||
    !Number.isFinite(save.zoom) ||
    save.zoom < 0.7 ||
    save.zoom > 2.5 ||
    !Array.isArray(save.residents) ||
    save.residents.length > 21
  )
    throw new Error(`${name}场景记录无效，原存档已保留。`);
  const room = rules.rooms[save.location.room];
  if (
    save.action !== null &&
    (!houseActorHasPose(street.actor, life.waverStage, save.home) ||
      !room.actions.some((a) => a.id === save.action) ||
      !room.scene.spots.some(
        (s) =>
          s.id === save.action && distance(s.point, save.location.point) < 2,
      ))
  )
    throw new Error(`${name}动作记录无效，原存档已保留。`);
  const ids = new Set<string>();
  for (const body of save.residents) {
    if (
      !body ||
      !isPartner(body.id) ||
      !rules.residents.includes(body.id) ||
      body.id === street.actor ||
      ids.has(body.id) ||
      !validRoom(body.room, save.home) ||
      !validPoint(body.point) ||
      !interiorWalkable(body.point, rules.rooms[body.room].scene) ||
      !DIRECTIONS.includes(body.direction) ||
      !Number.isFinite(body.travelled) ||
      body.travelled < 0
    )
      throw new Error(`${name}居民位置记录无效，原存档已保留。`);
    ids.add(body.id);
    if (
      (save.active &&
        body.room === save.location.room &&
        distance(body.point, save.location.point) < 30 - 1e-6) ||
      save.residents.some(
        (other) =>
          other !== body &&
          other.room === body.room &&
          distance(other.point, body.point) < 30 - 1e-6,
      )
    )
      throw new Error(`${name}人物位置重叠，原存档已保留。`);
  }
  if (
    save.active &&
    (life.positions[street.actor].x !== street.point.x ||
      life.positions[street.actor].y !== street.point.y ||
      (!rules.lifeZones[save.location.room]
        ? life.indoor !== undefined
        : life.indoor?.actor !== street.actor ||
          life.indoor.home !== save.home ||
          indoorRoom(life.indoor, save.home) !==
            rules.lifeZones[save.location.room]))
  )
    throw new Error(`${name}与人物位置不一致，原存档已保留。`);
  return structuredClone(save);
}

/** Formal houses share navigation and life rules, never art-preview storage. */
export class HouseGameSession {
  life: DailyLife;
  actors: Actor[];
  readonly street: HouseStreetReturn;
  readonly home: HouseSiteId;
  readonly controlled: HouseActorId;
  private readonly rules: HouseRules;
  location: HouseGameSave['location'];
  direction: PreviewDirection;
  action: string | null;
  zoom: number;
  bodies: HouseResidentBody[];
  running = false;
  clockSpeed: FateClockSpeed = 1;
  walkPace: FateWalkPace = 1;
  private routes = new Map<
    PartnerId,
    { goal: string; path: Point[]; retryAt: number }
  >();
  private elapsed = 0;

  constructor(
    life: DailyLife,
    street: HouseStreetReturn,
    previous?: HouseGameSave,
    destination?: HouseSiteId,
  ) {
    this.life = structuredClone(life);
    const saved = previous?.active ? parseHouseGameSave(previous, life) : null;
    this.street = structuredClone(saved?.street ?? street);
    const home =
      saved?.home ?? destination ?? houseHomeForActor(this.street.actor);
    if (!home || !isFormalSite(home))
      throw new Error('这个人物尚未接入这处正式室内。');
    this.home = home;
    this.controlled = this.street.actor;
    this.rules = HOUSE_RULES[home];
    this.location =
      saved?.location ??
      (home === 'emiya'
        ? structuredClone(EMIYA_ENTRY)
        : {
            room: 'hall',
            point: { x: 500, y: 560 },
          });
    this.direction = saved?.direction ?? 'up';
    this.action = saved?.action ?? null;
    this.zoom = saved?.zoom ?? 1.5;
    this.actors = createStreetActors().map((actor) => ({
      ...actor,
      ...this.life.positions[actor.id],
    }));
    this.bodies =
      saved?.residents.map((body) => ({ ...body, walking: false })) ?? [];
    this.syncIndoor();
    if (!saved) {
      for (const resident of this.residents()) {
        if (
          resident.presence !== 'inside' ||
          !this.rules.residents.includes(resident.id)
        )
          continue;
        const room = this.residentRoom(resident.id);
        this.bodies.push(this.makeBody(resident.id, room));
      }
    }
  }
  private syncIndoor() {
    if (isHomeId(this.home) && this.rules.lifeZones[this.location.room])
      this.life.indoor = {
        actor: this.controlled,
        home: this.home,
        layout: 2,
        ...houseLifePoint(this.location.room, this.home),
      };
    else delete this.life.indoor;
    this.life.positions[this.controlled] = { ...this.street.point };
  }
  personInside(id: PartnerId) {
    return isFormalPublicSite(this.home)
      ? insidePublicBuilding(this.life, id, this.home)
      : occupiedHome(this.life, id) === this.home;
  }
  residents() {
    if (isHomeId(this.home))
      return interiorResidents(this.life, this.home, this.controlled);
    return STREET_PARTNERS.filter(
      (id) => id !== this.controlled && this.personInside(id),
    ).map((id) => ({
      id,
      presence: 'inside' as const,
      visitor: true,
      zone: 'lounge' as const,
      status: '在这里',
    }));
  }
  lifeZone(room: HouseRoomId) {
    return this.rules.lifeZones[room];
  }
  careRoom(action: HomeCareAction) {
    if (
      !isHomeId(this.home) ||
      homeOf(this.controlled, this.life.housing) !== this.home ||
      !Object.hasOwn(HOME_CARE, action)
    )
      return null;
    const explicit = this.rules.careRooms?.[action];
    if (explicit) return explicit;
    if (HOME_CARE[action].room === 'rest') {
      const personal = this.rules.restRooms?.[this.controlled];
      if (personal) return personal;
    }
    return Object.entries(this.rules.lifeZones).find(
      ([, zone]) => zone === HOME_CARE[action].room,
    )![0] as HouseRoomId;
  }
  move(point: Point, direction: PreviewDirection, action: string | null) {
    this.location.point = { ...point };
    this.direction = direction;
    this.action = action;
    this.syncIndoor();
  }
  setZoom(value: number) {
    this.zoom = value;
  }
  toggleRunning() {
    this.running = !this.running;
  }
  door(door: PreviewDoor) {
    const actual = this.rules.rooms[this.location.room].doors.find(
      (d) => d.id === door.id,
    );
    if (!actual || distance(this.location.point, actual.point) >= 48)
      return false;
    if (!actual.to) return true;
    if (!validRoom(actual.to, this.home)) return false;
    const occupied = this.bodies
      .filter((b) => b.room === actual.to)
      .map((b) => b.point);
    if (occupied.some((p) => distance(p, actual.arrival) < 30)) return false;
    const arrivalRoom = this.rules.rooms[actual.to];
    const back = arrivalRoom.doors.find((d) => d.to === this.location.room);
    if (back)
      this.direction = interiorWalkFacing(
        back.point,
        actual.arrival,
        arrivalRoom.scene.floor,
        this.direction,
      );
    this.location = { room: actual.to, point: { ...actual.arrival } };
    this.action = null;
    this.syncIndoor();
    return true;
  }
  occupied() {
    return this.bodies
      .filter((b) => b.room === this.location.room)
      .map((b) => b.point);
  }
  constrain(from: Point, to: Point) {
    const clear = (p: Point) =>
      interiorClearSegment(
        from,
        p,
        this.rules.rooms[this.location.room].scene,
        this.occupied(),
      );
    if (clear(to)) return to;
    let low = 0,
      high = 1;
    for (let i = 0; i < 18; i++) {
      const t = (low + high) / 2,
        p = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        };
      if (clear(p)) low = t;
      else high = t;
    }
    return {
      x: from.x + (to.x - from.x) * low,
      y: from.y + (to.y - from.y) * low,
    };
  }
  private residentRoom(id: PartnerId): HouseRoomId {
    if (isFormalPublicSite(this.home))
      return publicResidentRoom(this.life, id, this.home);
    const kind = this.life.people[id].activity?.kind,
      assigned = kind && this.rules.activityRooms?.[kind];
    if (assigned) return assigned;
    const zone = interiorZone(this.life.people[id].activity);
    if (zone === 'rest' && this.rules.restRooms?.[id])
      return this.rules.restRooms[id];
    return Object.entries(this.rules.lifeZones).find(
      ([, lifeZone]) => lifeZone === zone,
    )![0] as HouseRoomId;
  }
  private safePoint(room: HouseRoomId, preferred: Point, exclude?: PartnerId) {
    const occupied = this.bodies
      .filter((b) => b.room === room && b.id !== exclude)
      .map((b) => b.point);
    if (this.location.room === room) occupied.push(this.location.point);
    const scene = this.rules.rooms[room].scene;
    const candidates = [preferred];
    for (let y = 420; y >= 100; y -= 40)
      for (let x = 200; x <= 800; x += 40) candidates.push({ x, y });
    return (
      candidates.find(
        (p) =>
          interiorWalkable(p, scene) &&
          occupied.every((q) => distance(p, q) >= 46),
      ) ?? null
    );
  }
  private makeBody(id: PartnerId, room: HouseRoomId): HouseResidentBody {
    const point = this.safePoint(
      room,
      { x: 340 + this.bodies.length * 70, y: 400 },
      id,
    );
    if (!point) throw new Error('屋内没有空闲的安全站位。');
    return { id, room, point, direction: 'down', walking: false, travelled: 0 };
  }
  private residentDoor(from: HouseRoomId, target: HouseRoomId | null) {
    const queue: { room: HouseRoomId; first: PreviewDoor | null }[] = [
      { room: from, first: null },
    ];
    const seen = new Set<HouseRoomId>([from]);
    for (const step of queue) {
      if (step.room === target) return step.first;
      for (const door of this.rules.rooms[step.room].doors) {
        if (!door.to) {
          if (target === null) return step.first ?? door;
        } else if (validRoom(door.to, this.home) && !seen.has(door.to)) {
          seen.add(door.to);
          queue.push({ room: door.to, first: step.first ?? door });
        }
      }
    }
    return null;
  }
  tick(dt: number) {
    const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(0.05, dt)) : 0;
    this.elapsed += seconds;
    const encounter = advanceDailyLife(this.life, this.actors, seconds, {
      running: this.running,
      speed: 1,
      clockRate: clockRate(this.clockSpeed),
      motionRate: this.walkPace,
      controlled: this.controlled,
    });
    this.syncIndoor();
    const present = this.residents().filter(
      (r) => r.presence === 'inside' && this.rules.residents.includes(r.id),
    );
    for (const person of present)
      if (!this.bodies.some((b) => b.id === person.id))
        this.bodies.push(
          this.makeBody(
            person.id,
            this.home === 'emiya' ? 'forecourt' : 'hall',
          ),
        );
    for (const body of this.bodies) {
      body.walking = false;
      const inside = this.personInside(body.id);
      const targetRoom = inside ? this.residentRoom(body.id) : null;
      const room = this.rules.rooms[body.room];
      const door =
        targetRoom === body.room
          ? null
          : this.residentDoor(body.room, targetRoom);
      const anchor = {
        x: 340 + this.rules.residents.indexOf(body.id) * 70,
        y: 400,
      };
      const target =
        door?.point ??
        (targetRoom === body.room
          ? this.safePoint(body.room, anchor, body.id)
          : null);
      if (!target || !this.running) continue;
      const occupied = this.bodies
        .filter((b) => b.id !== body.id && b.room === body.room)
        .map((b) => b.point);
      if (this.location.room === body.room) occupied.push(this.location.point);
      const key = `${targetRoom}:${target.x}:${target.y}`;
      let planned = this.routes.get(body.id);
      if (
        distance(body.point, target) > 1e-6 &&
        (planned?.goal !== key ||
          (this.elapsed >= planned.retryAt &&
            (!planned.path.length ||
              !interiorClearSegment(
                body.point,
                planned.path[0],
                room.scene,
                occupied,
              ))))
      ) {
        planned = {
          goal: key,
          path: interiorRoute(body.point, target, room.scene, occupied) ?? [],
          retryAt: this.elapsed + 0.3,
        };
        this.routes.set(body.id, planned);
      }
      let remaining = 120 * seconds * this.walkPace;
      while (remaining > 1e-6 && planned?.path.length) {
        const next = planned.path[0],
          gap = distance(body.point, next);
        if (gap < 1e-6) {
          planned.path.shift();
          continue;
        }
        const amount = Math.min(gap, remaining),
          from = body.point;
        const moved = interiorMove(
          from,
          {
            x: ((next.x - from.x) * amount) / gap,
            y: ((next.y - from.y) * amount) / gap,
          },
          room.scene,
        );
        if (occupied.some((p) => distance(moved, p) < 30)) break;
        const spent = distance(from, moved);
        body.point = moved;
        remaining -= amount;
        body.travelled += spent;
        body.walking ||= spent > 0.01;
        if (spent)
          body.direction = interiorWalkFacing(
            from,
            moved,
            room.scene.floor,
            body.direction,
          );
        if (amount === gap) planned.path.shift();
      }
      if (door && distance(body.point, door.point) < 1e-5) {
        if (!door.to) {
          this.bodies = this.bodies.filter((b) => b !== body);
          this.routes.delete(body.id);
        } else if (
          !this.bodies.some(
            (b) =>
              b !== body &&
              b.room === door.to &&
              distance(b.point, door.arrival) < 30,
          ) &&
          !(
            this.location.room === door.to &&
            distance(this.location.point, door.arrival) < 30
          )
        ) {
          if (!validRoom(door.to, this.home)) continue;
          body.room = door.to;
          body.point = { ...door.arrival };
          this.routes.delete(body.id);
        }
      }
    }
    return encounter;
  }
  residentApproach(id: PartnerId) {
    const body = this.bodies.find(
      (b) => b.id === id && b.room === this.location.room,
    );
    if (!body || !this.personInside(id)) return null;
    const scene = this.rules.rooms[body.room].scene;
    const candidates = Array.from({ length: 16 }, (_, i) => ({
      x: body.point.x + Math.cos((i * Math.PI) / 8) * 55,
      y: body.point.y + Math.sin((i * Math.PI) / 8) * 55,
    }));
    return (
      candidates
        .sort(
          (a, b) =>
            distance(a, this.location.point) - distance(b, this.location.point),
        )
        .find((p) =>
          interiorRoute(this.location.point, p, scene, this.occupied()),
        ) ?? null
    );
  }
  conversation(id: PartnerId) {
    const body = this.bodies.find(
      (b) => b.id === id && b.room === this.location.room,
    );
    if (
      !body ||
      distance(body.point, this.location.point) > 85 ||
      !this.personInside(id)
    )
      return { ok: false as const, message: '先走到人物身边。' };
    const life = structuredClone(this.life),
      dialogue = encounterDialogue(this.controlled, id, life.waverStage);
    const entry: Exchange = {
      ...([this.controlled, id].includes('waver')
        ? { waverStage: life.waverStage }
        : {}),
      id: `house-${life.nextId}-${life.minutes}-${id}`,
      target: id,
      speaker: this.controlled,
      message: dialogue.message,
      reply: dialogue.reply,
      source: 'preset',
      createdAt: new Date().toISOString(),
    };
    const result = recordOnsiteConversation(
      life,
      this.actors,
      this.controlled,
      entry,
      undefined,
      {
        speaker: this.location.point,
        target: body.point,
        place: `${this.rules.name}·${this.rules.rooms[this.location.room].scene.room}`,
      },
    );
    return result.ok
      ? {
          ok: true as const,
          life,
          entry,
          message: `${dialogue.message}\n${dialogue.reply}`,
        }
      : result;
  }
  care(action: HomeCareAction) {
    const room = this.careRoom(action);
    if (!room || this.location.room !== room)
      return {
        ok: false,
        message: room
          ? `先走到${this.rules.rooms[room].scene.room}。`
          : '这里没有这项居家活动。',
        encounters: [],
      };
    // A shared living room may contain both a dining table and sleeping area.
    if (isHomeId(this.home) && this.life.indoor) {
      const zone = HOME_CARE[action].room;
      Object.assign(
        this.life.indoor,
        nearestIndoorPoint(
          roomPoint(this.home, zone, CONTACTS[zone]),
          this.home,
        ),
      );
    }
    const result = takeHomeCare(
      this.life,
      this.actors,
      this.controlled,
      action,
    );
    this.syncIndoor();
    if (result.ok) {
      // A care action skips whole game minutes, so reconcile to the new world state.
      const present = this.residents().filter(
        (r) => r.presence === 'inside' && this.rules.residents.includes(r.id),
      );
      const previous = this.bodies;
      this.bodies = [];
      this.routes.clear();
      for (const person of present) {
        const room = this.residentRoom(person.id),
          body = previous.find((b) => b.id === person.id && b.room === room);
        const point = body && this.safePoint(room, body.point, body.id);
        this.bodies.push(
          body && point
            ? { ...body, point, walking: false }
            : this.makeBody(person.id, room),
        );
      }
    }
    return result;
  }
  publicAction(command: HousePublicCommand) {
    if (!isFormalPublicSite(this.home))
      return { ok: false, message: '这里没有这项活动。' };
    if (command.type === 'study') {
      if (
        this.home !== 'school' ||
        !['classroom', 'library', 'staffroom'].includes(this.location.room)
      )
        return { ok: false, message: '走进教室或图书室后再自习。' };
      return visitPublicPlace(
        this.life,
        this.actors,
        this.controlled,
        'school',
        'study',
      );
    }
    if (command.type === 'shop') {
      if (this.home !== 'shops' || this.location.room !== 'hall')
        return { ok: false, message: '先回到卖场。' };
      return visitPublicPlace(
        this.life,
        this.actors,
        this.controlled,
        'shops',
        'shop',
      );
    }
    if (this.home !== 'cafe') return { ok: false, message: '先到咖啡店。' };
    if (command.type === 'cancel')
      return cancelPublicOuting(this.life, this.controlled, this.actors);
    if (!['hall', 'window'].includes(this.location.room))
      return { ok: false, message: '先回到座席区。' };
    if (command.type === 'order')
      return startPublicOuting(
        this.life,
        this.actors,
        this.controlled,
        'cafe',
        { order: command.order },
      );
    if (command.type === 'choose')
      return choosePublicOuting(
        this.life,
        this.actors,
        this.controlled,
        command.choice,
      );
    return interactPublicOuting(this.life, this.actors, this.controlled);
  }
  gameSave(active = true): { life: DailyLife; house: HouseGameSave } {
    this.syncIndoor();
    return {
      life: snapshotLife(this.life, this.actors),
      house: {
        version: 1,
        active,
        home: this.home,
        street: structuredClone(this.street),
        location: structuredClone(this.location),
        direction: this.direction,
        action: this.action,
        zoom: this.zoom,
        residents: this.bodies.map(({ walking: _walking, ...body }) =>
          structuredClone(body),
        ),
      },
    };
  }
  release() {
    this.running = false;
    const result = this.gameSave(false);
    delete result.life.indoor;
    result.life.positions[this.controlled] = { ...this.street.point };
    return result;
  }
}
export type HousePublicCommand =
  | { type: 'study' | 'shop' | 'finish' | 'cancel' }
  | { type: 'order'; order: CafeOrder }
  | { type: 'choose'; choice: OutingChoice };
