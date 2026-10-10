import {
  advanceDailyLife,
  createDailyLife,
  parseDailyLife,
  snapshotLife,
  encounterDialogue,
  occupiedHome,
  type DailyLife,
} from './fate-life';
import { createStreetActors, type Actor } from './street';
import { nearestIndoorPoint } from './fate-indoor-map';
import { interiorResidents, interiorResidentPoint } from './fate-interior';
import { recordOnsiteConversation } from './fate-interaction';
import type { PartnerId } from './fate-cast';
import {
  emiyaMealKey,
  emptyEmiyaHousehold,
  parseEmiyaHousehold,
  emiyaInvitationDecision,
  emiyaContextDialogue,
  emiyaPersonName,
  type EmiyaTopic,
  type EmiyaHouseholdSave,
} from './fate-emiya-household';
import { dueDuty } from './fate-schedule';
import { dueAppointment } from './fate-meetups';
import { nearHomeEntrance } from './fate-indoor-map';
import {
  activeMeal,
  joinMeal,
  mealActivity,
  parseMealEvent,
  type MealEvent,
} from './fate-meals';
import { rememberSharedMeal } from './fate-social';
import {
  EmiyaResidents,
  parseEmiyaResidents,
  type EmiyaResidentSave,
  type EmiyaResidentIntents,
} from './fate-emiya-residents';
import { homeCarePlan, takeHomeCare } from './fate-self-care';
import { spendPlayerTime } from './fate-player-time';
import {
  clockRate,
  type FateClockSpeed,
  type FateWalkPace,
} from './fate-clock';
import {
  interiorWalkable,
  interiorClearSegment,
} from './fate-city-interior-navigation';
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
  residents?: EmiyaResidentSave[];
  household?: EmiyaHouseholdSave;
};
const INVITE_REASON = '答应同桌用餐，正沿屋内通路走向小餐桌。';
const HELP_REASON = '答应在餐桌旁帮忙，等士郎就位后一起动手。';
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
  const residents = parseEmiyaResidents(save.residents);
  if (
    residents.some(
      (body) =>
        body.room === save.location.room &&
        Math.hypot(
          body.point.x - save.location.point.x,
          body.point.y - save.location.point.y,
        ) <
          30 - 1e-6,
    )
  )
    throw new Error('人物与屋内居民位置重叠，原记录已保留。');
  const life = parseDailyLife(save.life);
  return {
    version: 1,
    life,
    location: structuredClone(save.location),
    meal: save.meal,
    running: save.running ?? false,
    residents,
    household: parseEmiyaHousehold(save.household, life),
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
  clockSpeed: FateClockSpeed = 1;
  walkPace: FateWalkPace = 1;
  house: EmiyaResidents;
  household: EmiyaHouseholdSave;
  constructor(save: EmiyaLifeSave = createEmiyaLifeSave()) {
    this.life = structuredClone(save.life);
    this.household = save.household
      ? structuredClone(save.household)
      : emptyEmiyaHousehold();
    this.location = structuredClone(save.location);
    this.meal = save.meal;
    this.running = save.running ?? false;
    this.actors = createStreetActors().map((actor) => ({
      ...actor,
      ...this.life.positions[actor.id],
    }));
    this.move(this.location, this.meal);
    this.house = new EmiyaResidents(this.life, this.location, save.residents);
    this.stepHouse(0.001, false);
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
  tick(dt: number, location: EmiyaLocation, _meal: boolean) {
    this.move(location, this.meal);
    advanceDailyLife(this.life, this.actors, dt, {
      running: this.running,
      speed: 1,
      clockRate: clockRate(this.clockSpeed),
      motionRate: this.walkPace,
      controlled: 'shirou',
    });
    return this.stepHouse(dt, this.running);
  }
  private logMeal = (text: string, meal: MealEvent) => {
    const event = {
      id: this.life.nextId++,
      minute: this.life.minutes,
      waverStage: this.life.waverStage,
      text,
      meal: parseMealEvent(meal),
    };
    this.life.events = [...this.life.events, event].slice(-80);
    rememberSharedMeal(this.life, event);
  };
  private notice(key: string, person: PartnerId, text: string) {
    if (this.household.notices.some((n) => n.key === key)) return false;
    this.household.notices = [
      ...this.household.notices,
      { key, person, minute: this.life.minutes, text },
    ].slice(-32);
    return true;
  }
  private currentHouseMeal() {
    return this.life.meals.find(
      (m) =>
        m.home === 'emiya' && activeMeal(this.life, m.id)?.phase === 'ready',
    );
  }
  private restorableActivity(
    id: PartnerId,
    activity: DailyLife['people'][PartnerId]['activity'] | undefined,
  ) {
    const checked = structuredClone(this.life);
    checked.people[id].activity = structuredClone(activity ?? null);
    try {
      return parseDailyLife(checked).people[id].activity;
    } catch {
      // An interrupted meal or routine may have expired while waiting.
      return null;
    }
  }
  private refreshHousehold() {
    let changed = false;
    const meal = this.currentHouseMeal(),
      table = this.household.table;
    if (meal && !table.dirty && table.key !== emiyaMealKey(meal)) {
      this.household.table = {
        key: emiyaMealKey(meal),
        set: false,
        dirty: false,
      };
      changed = true;
    }
    for (const invite of this.household.invitations) {
      if (invite.status !== 'walking' && invite.status !== 'seated') continue;
      if (!meal || invite.key !== emiyaMealKey(meal)) {
        if (
          invite.status === 'walking' &&
          this.life.people[invite.person].activity?.reason === INVITE_REASON
        )
          this.life.people[invite.person].activity = this.restorableActivity(
            invite.person,
            invite.previous,
          );
        invite.status = 'done';
        delete invite.previous;
        invite.updated = this.life.minutes;
        changed = true;
      } else if (
        invite.status === 'walking' &&
        (occupiedHome(this.life, invite.person) !== 'emiya' ||
          dueDuty(this.life, invite.person) ||
          dueAppointment(this.life, invite.person) ||
          this.life.people[invite.person].hunger >= 85)
      ) {
        this.cancelInvitation(invite.person);
        changed = true;
      }
    }
    const help = this.household.help;
    if (help) {
      const p = this.life.people[help.person],
        body = this.house.all().find((b) => b.id === help.person);
      const waiting =
        help.activity === 'clear-table' &&
        p.activity?.kind === 'eat' &&
        p.activity.meal &&
        p.activity.remaining > 0;
      const finishedDining =
        help.activity === 'clear-table' &&
        help.previous?.kind === 'eat' &&
        p.activity === null;
      if (
        !body ||
        body.room !== 'table' ||
        (occupiedHome(this.life, help.person) !== 'emiya' && !finishedDining) ||
        this.household.table.key !== help.key ||
        dueDuty(this.life, help.person) ||
        dueAppointment(this.life, help.person) ||
        p.energy <= 10 ||
        p.hunger >= 85 ||
        p.activity?.kind === 'sleep' ||
        p.activity?.kind === 'cook' ||
        !nearHomeEntrance(this.life.positions[help.person], 'emiya')
      ) {
        this.cancelHelp();
        this.household.failed = help.activity;
        changed = true;
      } else if (!waiting && p.activity?.reason !== HELP_REASON) {
        help.previous = structuredClone(p.activity);
        p.activity = {
          kind: 'study',
          home: 'emiya',
          phase: 'doing',
          remaining: 30,
          source: 'rules',
          reason: HELP_REASON,
        };
        changed = true;
      }
    }
    if (meal) {
      const cook = this.house
        .all()
        .find(
          (b) =>
            b.id === meal.cook && b.room === 'table' && b.phase === 'doing',
        );
      if (cook)
        changed =
          this.notice(
            `ready:${emiyaMealKey(meal)}`,
            cook.id,
            '饭菜做好了。你也坐下来吃一点吧，我给你留了位置。',
          ) || changed;
    }
    const near = this.house
      .all()
      .find(
        (b) =>
          b.room === this.location.room &&
          b.phase === 'doing' &&
          b.kind !== 'sleep' &&
          b.kind !== 'cook' &&
          Math.hypot(
            b.point.x - this.location.point.x,
            b.point.y - this.location.point.y,
          ) <= 85 &&
          interiorClearSegment(
            b.point,
            this.location.point,
            EMIYA_ROOMS[b.room].scene,
          ),
      );
    if (near && this.life.people.shirou.energy < 30)
      changed =
        this.notice(
          `tired:${Math.floor(this.life.minutes / 120)}`,
          near.id,
          '你看起来有些累。先歇一会儿，剩下的事晚点再做。',
        ) || changed;
    return changed;
  }
  private residentIntents(): EmiyaResidentIntents {
    const intents = new Map<
      PartnerId,
      { kind: 'eat' | 'cook'; location?: EmiyaLocation }
    >();
    for (const i of this.household.invitations)
      if (i.status === 'walking') intents.set(i.person, { kind: 'eat' });
    const help = this.household.help;
    if (help && this.life.people[help.person].activity?.reason === HELP_REASON)
      intents.set(help.person, {
        kind: 'cook',
        location: { room: 'table', point: help.point },
      });
    return intents;
  }
  private stepHouse(dt: number, running: boolean) {
    let changed = this.refreshHousehold();
    changed =
      this.house.step(
        this.life,
        this.location,
        dt,
        running,
        this.residentIntents(),
      ) || changed;
    const meal = this.currentHouseMeal();
    for (const invite of this.household.invitations) {
      if (
        invite.status !== 'walking' ||
        !meal ||
        invite.key !== emiyaMealKey(meal)
      )
        continue;
      const body = this.house.all().find((b) => b.id === invite.person);
      if (
        !body ||
        body.room !== 'table' ||
        body.phase !== 'doing' ||
        body.kind !== 'eat'
      )
        continue;
      this.life.people[invite.person].activity = {
        ...mealActivity(meal),
        phase: 'doing',
        waiting: false,
      };
      const previous = meal.participants;
      meal.participants = previous.filter((id) =>
        this.house
          .all()
          .some(
            (b) =>
              b.id === id &&
              b.room === 'table' &&
              b.phase === 'doing' &&
              b.kind === 'eat',
          ),
      );
      try {
        joinMeal(this.life, invite.person, 'shirou', this.logMeal);
      } finally {
        meal.participants = [...new Set([...previous, ...meal.participants])];
      }
      invite.status = 'seated';
      delete invite.previous;
      invite.updated = this.life.minutes;
      changed = true;
      this.notice(
        `seated:${invite.key}:${invite.person}`,
        invite.person,
        '我已经到餐桌了。你也坐下来，我们慢慢吃。',
      );
    }
    return changed;
  }
  readyMeal() {
    return this.life.meals.find(
      (meal) =>
        meal.home === 'emiya' &&
        activeMeal(this.life, meal.id)?.phase === 'ready' &&
        !meal.participants.includes('shirou'),
    );
  }
  hasFood() {
    return this.meal || !!this.readyMeal();
  }
  inviteToMeal(id: PartnerId): {
    ok: boolean;
    message: string;
    status?: EmiyaHouseholdSave['invitations'][number]['status'];
  } {
    const near = this.talkStatus(id);
    if (!near.ok) return near;
    const meal = this.currentHouseMeal();
    if (!meal || !this.readyMeal())
      return { ok: false, message: '先备好饭菜，再亲口叫家人到餐桌。' };
    if (this.household.table.dirty)
      return { ok: false, message: '先把上一餐的餐桌收拾好，再叫家人。' };
    const key = emiyaMealKey(meal),
      old = this.household.invitations.find(
        (i) => i.key === key && i.person === id,
      );
    if (
      meal.participants.includes(id) ||
      old?.status === 'walking' ||
      old?.status === 'seated'
    )
      return {
        ok: false,
        message: '这位家人已经在吃饭或正在过来，不用重复叫。',
      };
    if (old && this.life.minutes - old.updated < 2)
      return { ok: false, message: '刚刚已经问过了，稍等一会儿再叫。' };
    const decision = emiyaInvitationDecision(this.life, id);
    const previous = structuredClone(this.life.people[id].activity);
    const result = this.recordExchange(id, {
      message: '饭菜做好了，我给你留了一份。来小餐桌吃饭吧。',
      reply: decision.reply,
    });
    const status = result.ok ? decision.status : 'deferred';
    const invitation = {
      key,
      person: id,
      minute: old?.minute ?? this.life.minutes,
      updated: this.life.minutes,
      status,
      reply: result.ok ? decision.reply : result.message,
      ...(status === 'walking' ? { previous } : {}),
    };
    this.household.invitations = [
      ...this.household.invitations.filter((i) => i !== old),
      invitation,
    ].slice(-32);
    if (status === 'walking') {
      // Keep the canonical resident at home without claiming dining attendance.
      // The actual body follows an eat intent; only arrival begins the meal.
      this.life.people[id].activity = {
        kind: 'study',
        home: 'emiya',
        phase: 'doing',
        remaining: Math.min(150, meal.expiresAt - this.life.minutes),
        source: 'rules',
        reason: INVITE_REASON,
      };
      this.stepHouse(0.001, false);
    }
    return {
      ok: result.ok,
      message: result.ok
        ? `${emiyaPersonName(this.life, id)}：${decision.reply}`
        : result.message,
      status,
    };
  }
  cancelInvitation(id: PartnerId) {
    const invite = this.household.invitations.findLast(
      (i) => i.person === id && i.status === 'walking',
    );
    if (!invite) return { ok: false, message: '目前没有等待中的邀请。' };
    if (this.life.people[id].activity?.reason === INVITE_REASON)
      this.life.people[id].activity = this.restorableActivity(
        id,
        invite.previous,
      );
    invite.status = 'cancelled';
    delete invite.previous;
    invite.updated = this.life.minutes;
    invite.reply = '这次先不等，家人继续原来的安排。';
    this.house.reconcile(this.life, this.location, this.residentIntents());
    return { ok: true, message: invite.reply };
  }
  cancelHelp() {
    const help = this.household.help;
    if (help && this.life.people[help.person].activity?.reason === HELP_REASON)
      this.life.people[help.person].activity = this.restorableActivity(
        help.person,
        help.previous,
      );
    this.household.help = null;
  }
  requestHelp(activity: 'set-table' | 'clear-table', id: PartnerId) {
    const near = this.talkStatus(id);
    if (!near.ok) return near;
    if (this.household.help)
      return { ok: false, message: '先完成或取消手头的共同家务。' };
    const table = this.household.table,
      body = this.house.all().find((b) => b.id === id)!;
    if (body.room !== 'table')
      return { ok: false, message: '先叫家人到餐桌，实际到场后再一起动手。' };
    if (
      !table.key ||
      (activity === 'set-table'
        ? table.dirty || table.set || !this.readyMeal()
        : !table.dirty)
    )
      return {
        ok: false,
        message:
          activity === 'set-table'
            ? '目前没有需要摆碗筷的餐食。'
            : '这张餐桌已经收拾好了。',
      };
    if (dueDuty(this.life, id) || dueAppointment(this.life, id))
      return {
        ok: false,
        message: '家人还有安排，这次先自己做，之后再请帮忙。',
      };
    const title = activity === 'set-table' ? '摆好碗筷' : '收拾餐桌';
    const waiting =
      activity === 'clear-table' &&
      this.life.people[id].activity?.kind === 'eat';
    const result = this.recordExchange(id, {
      message: `餐桌这边还需要${title}，你能帮忙吗？`,
      reply: waiting
        ? '好。等我吃完，我们再收拾，不急着把碗收走。'
        : '好，我就在桌边。你也过来，我们把手边这点事做好。',
    });
    if (result.ok) {
      this.household.failed = null;
      this.household.help = {
        activity,
        person: id,
        key: table.key,
        point: { ...body.point },
        previous: structuredClone(this.life.people[id].activity),
      };
      this.stepHouse(0.001, false);
    }
    return result;
  }
  activityPlan(activity: EmiyaActivity) {
    if (this.household.failed === activity.id)
      return {
        ok: false,
        message:
          '家人临时离开或有其他安排，这次共同家务没有完成；可以重新选择自己做。',
      };
    if (this.household.invitations.some((i) => i.status === 'walking'))
      return {
        ok: false,
        message: '家人还在走来，先等实际到场，或取消这次邀请。',
      };
    if (activity.id === 'set-table' || activity.id === 'clear-table') {
      const table = this.household.table,
        help = this.household.help;
      if (
        activity.id === 'set-table' &&
        (!this.readyMeal() || table.set || table.dirty)
      )
        return {
          ok: false,
          message: '先备好饭菜，并空出干净餐桌；已经摆好的碗筷不用重复摆。',
        };
      if (activity.id === 'clear-table' && !table.dirty)
        return { ok: false, message: '餐桌现在是干净的，不用重复收拾。' };
      const stillEating = this.house
        .all()
        .some(
          (b) =>
            b.room === 'table' &&
            this.life.people[b.id].activity?.kind === 'eat' &&
            !!this.life.people[b.id].activity?.meal &&
            this.life.people[b.id].activity!.remaining > 0,
        );
      if (activity.id === 'clear-table' && stillEating)
        return {
          ok: false,
          waiting: !!help,
          message: '家人还没吃完，等放下碗筷后再收拾。',
        };
      if (help && help.activity !== activity.id)
        return { ok: false, message: '先完成或取消另一项共同家务。' };
      if (help) {
        const b = this.house.all().find((b) => b.id === help.person);
        if (
          !b ||
          b.room !== 'table' ||
          occupiedHome(this.life, b.id) !== 'emiya'
        )
          return { ok: false, message: '帮忙的家人已经离开，这次没有完成。' };
        if (b.phase !== 'doing' || b.kind !== 'cook')
          return {
            ok: false,
            waiting: true,
            message: '等家人收好手边的事，再一起动手。',
          };
      }
      return { ok: true, message: '' };
    }
    if (this.household.help)
      return { ok: false, message: '先完成或取消共同家务，再做其他活动。' };
    if (activity.id === 'cook' && this.household.table.dirty)
      return { ok: false, message: '上一餐的碗筷还没收，先收拾好餐桌。' };
    if (
      activity.id === 'cook' &&
      this.house
        .all()
        .some(
          (body) =>
            body.room === 'table' &&
            body.phase === 'doing' &&
            body.kind === 'cook',
        )
    )
      return { ok: false, message: '灶台正在使用，等忙完后再备餐。' };
    if (
      activity.id === 'rest' &&
      this.house
        .all()
        .some(
          (body) =>
            body.room === 'rest' &&
            body.phase === 'doing' &&
            body.kind === 'sleep',
        )
    )
      return { ok: false, message: '卧具有人正在休息，先到和室坐一会儿。' };
    if (
      activity.id === 'cook' &&
      this.life.meals.some(
        (meal) => meal.home === 'emiya' && activeMeal(this.life, meal.id),
      )
    )
      return { ok: false, message: '家里已有备餐或留饭，先到餐桌看看。' };
    if (activity.id === 'eat' && !this.hasFood())
      return { ok: false, message: '桌上还没有饭；先备餐或等家人做好。' };
    return { ok: true, message: '' };
  }
  beginActivity(id: string) {
    if (this.household.failed === id) this.household.failed = null;
  }
  talkStatus(id: PartnerId) {
    const body = this.house.all().find((body) => body.id === id);
    if (!body || occupiedHome(this.life, id) !== 'emiya')
      return { ok: false, message: '这位居民目前不在屋内。' };
    if (body.room !== this.location.room)
      return { ok: false, message: '先走进同一个房间，再靠近交谈。' };
    if (
      Math.hypot(
        body.point.x - this.location.point.x,
        body.point.y - this.location.point.y,
      ) > 85
    )
      return { ok: false, message: '再走近一些，才能面对面交谈。' };
    if (body.phase !== 'doing')
      return { ok: false, message: '正在走动，等停下来再聊。' };
    if (
      !interiorClearSegment(
        this.location.point,
        body.point,
        EMIYA_ROOMS[body.room].scene,
      )
    )
      return { ok: false, message: '请绕到同一侧，不能隔着家具交谈。' };
    return { ok: true, message: '' };
  }
  talk(id: PartnerId, topic: EmiyaTopic = 'greet') {
    const status = this.talkStatus(id);
    if (!status.ok) return status;
    if (topic !== 'greet')
      return this.recordExchange(
        id,
        emiyaContextDialogue(this.life, id, topic),
      );
    const preset = encounterDialogue('shirou', id, this.life.waverStage);
    return this.recordExchange(id, {
      message: preset.speaker === 'shirou' ? preset.message : preset.reply,
      reply: preset.speaker === 'shirou' ? preset.reply : preset.message,
    });
  }
  private recordExchange(
    id: PartnerId,
    dialogue: { message: string; reply: string; effects?: unknown },
  ) {
    const next = structuredClone(this.life);
    const point = interiorResidentPoint(next, 'emiya', id, 'shirou');
    if (!point) return { ok: false, message: '居民已离开，稍后再聊。' };
    const position = next.indoor;
    // The physical gate above is authoritative. Adapt to the existing room
    // contact for its busy/identity/cooldown checks, then restore the save point.
    next.indoor = { actor: 'shirou', home: 'emiya', layout: 2, ...point };
    const result = recordOnsiteConversation(
      next,
      this.actors,
      'shirou',
      {
        id: `emiya:${next.nextId}:${next.minutes}`,
        speaker: 'shirou',
        target: id,
        message: dialogue.message,
        reply: dialogue.reply,
        source: 'preset',
        createdAt: new Date().toISOString(),
        ...(['shirou', id].includes('waver')
          ? { waverStage: next.waverStage }
          : {}),
      },
      dialogue.effects,
    );
    next.indoor = position;
    if (result.ok) this.life = next;
    return { ...result, ...(result.ok ? { dialogue } : {}) };
  }
  complete(activity: EmiyaActivity, location: EmiyaLocation, _meal: boolean) {
    this.move(location, this.meal);
    if (
      activity.room !== location.room ||
      Math.hypot(
        activity.point.x - location.point.x,
        activity.point.y - location.point.y,
      ) > 2
    )
      return { ok: false, message: '先沿路走到家具旁。' };
    const allowed = this.activityPlan(activity);
    if (!allowed.ok) return allowed;
    if (activity.id === 'set-table' || activity.id === 'clear-table') {
      const help = this.household.help;
      const title = activity.id === 'set-table' ? '摆好碗筷' : '收拾餐桌';
      if (help) {
        const body = this.house.all().find((b) => b.id === help.person)!;
        if (
          Math.hypot(
            body.point.x - location.point.x,
            body.point.y - location.point.y,
          ) > 240
        )
          return { ok: false, message: '先在同一张餐桌旁就位。' };
        const message = `谢谢你帮我${title}，两个人做起来轻松些。`;
        const result = this.recordExchange(help.person, {
          message,
          reply: '嗯，这点家务已经做好了。你也记得留一点休息的时间。',
          effects: {
            impressions: [
              { person: help.person, kind: 'care', turn: 0, quote: message },
            ],
          },
        });
        if (!result.ok) return result;
      }
      if (activity.id === 'set-table') this.household.table.set = true;
      else {
        this.household.table.dirty = false;
        this.household.table.set = false;
      }
      const text = `士郎${help ? `与${emiyaPersonName(this.life, help.person)}一起` : ''}${title}。`;
      this.life.events = [
        ...this.life.events,
        {
          id: this.life.nextId++,
          minute: this.life.minutes,
          waverStage: this.life.waverStage,
          text,
        },
      ].slice(-80);
      this.cancelHelp();
      spendPlayerTime(
        this.life,
        this.actors,
        'shirou',
        activity.id === 'set-table' ? 4 : 8,
        undefined,
        () => {
          this.stepHouse(0.05, true);
          return false;
        },
      );
      return { ok: true, message: text };
    }
    const care =
      activity.id === 'sit'
        ? 'rest'
        : activity.id === 'rest'
          ? 'nap'
          : activity.id === 'eat'
            ? 'meal'
            : null;
    if (care) {
      if (activity.id === 'eat' && !this.hasFood())
        return { ok: false, message: '先备餐，再到餐桌用餐。' };
      const plan = homeCarePlan(this.life, 'shirou', care);
      if (!plan.ok) return plan;
      let shared = '';
      if (activity.id === 'eat') {
        const familyMeal = this.readyMeal();
        if (familyMeal) {
          const seated = this.house
            .all()
            .filter(
              (body) =>
                body.room === 'table' &&
                body.phase === 'doing' &&
                body.kind === 'eat' &&
                Math.hypot(
                  body.point.x - location.point.x,
                  body.point.y - location.point.y,
                ) <= 150 &&
                this.life.people[body.id].activity?.meal === familyMeal.id,
            );
          const participants = familyMeal.participants;
          const previous = this.life.people.shirou.activity;
          familyMeal.participants = participants.filter((id) =>
            seated.some((body) => body.id === id),
          );
          this.life.people.shirou.activity = {
            ...mealActivity(familyMeal),
            phase: 'doing',
            waiting: false,
          };
          try {
            joinMeal(this.life, 'shirou', null, (text, mealEvent) => {
              const event = {
                id: this.life.nextId++,
                minute: this.life.minutes,
                waverStage: this.life.waverStage,
                text,
                meal: parseMealEvent(mealEvent),
              };
              this.life.events = [...this.life.events, event].slice(-80);
              rememberSharedMeal(this.life, event);
              if (mealEvent.kind === 'shared') shared = text;
            });
          } finally {
            familyMeal.participants = [
              ...new Set([...participants, ...familyMeal.participants]),
            ];
            this.life.people.shirou.activity = previous;
          }
        }
      }
      const result = takeHomeCare(this.life, this.actors, 'shirou', care);
      if (result.ok && activity.id === 'eat') {
        this.meal = false;
        this.household.table.dirty = true;
      }
      this.stepHouse(0.001, false);
      return {
        ...result,
        message: `${shared ? `${shared} ` : ''}${result.message}${result.ok && activity.id === 'eat' ? ' 餐桌还有碗筷，吃完后记得收拾。' : ''}`,
      };
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
    if (activity.id === 'cook') {
      const day = Math.floor(this.life.minutes / 1440);
      const slot =
        this.life.minutes % 1440 < 660
          ? ('breakfast' as const)
          : ('dinner' as const);
      // A completed player meal joins the same household table; no duplicate
      // home records or automatic attendance for absent residents are created.
      const existing = this.life.meals.some(
        (meal) => meal.home === 'emiya' && activeMeal(this.life, meal.id),
      );
      if (
        !this.life.meals.some(
          (meal) => meal.home === 'emiya' && activeMeal(this.life, meal.id),
        )
      )
        this.life.meals = [
          ...this.life.meals.filter((meal) => meal.home !== 'emiya'),
          {
            id: `${day}:${slot}:emiya`,
            home: 'emiya',
            day,
            slot,
            cook: 'shirou',
            phase: 'ready',
            startedAt: this.life.minutes,
            expiresAt: this.life.minutes + 150,
            participants: [],
          },
        ];
      this.meal = existing;
    }
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
    return spendPlayerTime(
      this.life,
      this.actors,
      'shirou',
      minutes,
      undefined,
      () => {
        this.stepHouse(0.05, true);
        return false;
      },
    );
  }
  toggleRunning() {
    this.running = !this.running;
  }
  residents() {
    return interiorResidents(this.life, 'emiya', 'shirou');
  }
  save(): EmiyaLifeSave {
    const household = structuredClone(this.household);
    for (const invite of household.invitations) {
      if (invite.status === 'walking')
        invite.previous = this.restorableActivity(
          invite.person,
          invite.previous,
        );
      else delete invite.previous;
    }
    if (household.help)
      household.help.previous = this.restorableActivity(
        household.help.person,
        household.help.previous,
      );
    return {
      version: 1,
      life: snapshotLife(this.life, this.actors),
      location: structuredClone(this.location),
      meal: this.meal,
      running: this.running,
      residents: this.house.save(),
      household,
    };
  }
}

export function isEmiyaRoom(value: string): value is EmiyaRoomId {
  return Object.hasOwn(EMIYA_ROOMS, value);
}
