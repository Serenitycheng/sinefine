import { fatePerson, isPartner, type PartnerId } from './fate-cast';
import {
  clamp,
  createStreetActors,
  isWalkable,
  pathTo,
  stepActor,
  WALK_AREAS,
  type Actor,
  type ActorId,
  type Point,
} from './street';

export const LIFE_PLACES = {
  cafe: { name: '街角咖啡店', x: 1250, y: 844 },
  home: { name: '住宅', x: 307, y: 779 },
  shops: { name: '商店侧巷', x: 893, y: 740 },
  street: { name: '林荫路边', x: 666, y: 859 },
} as const;
export type LifePlace = keyof typeof LIFE_PLACES;
export const LIFE_ACTIONS = {
  eat: { label: '用餐', place: 'cafe', duration: 30 },
  rest: { label: '休息', place: 'home', duration: 45 },
  sleep: { label: '睡觉', place: 'home', duration: 120 },
  read: { label: '阅读', place: 'cafe', duration: 35 },
  study: { label: '整理魔术笔记', place: 'home', duration: 40 },
  shop: { label: '买日用品', place: 'shops', duration: 25 },
  walk: { label: '散步', place: 'street', duration: 20 },
} as const;
export type LifeAction = keyof typeof LIFE_ACTIONS;
export type LifePerson = {
  hunger: number;
  energy: number;
  social: number;
  choices: number;
  activity: {
    kind: LifeAction;
    phase: 'going' | 'doing';
    remaining: number;
    reason: string;
    source: 'rules' | 'deepseek';
  } | null;
};
export type LifeDialogue = {
  speaker: PartnerId;
  target: PartnerId;
  message: string;
  reply: string;
  source: 'preset' | 'deepseek';
};
export type LifePlan = { action: LifeAction; reason: string };
export type LifeEvent = {
  id: number;
  minute: number;
  text: string;
  dialogue?: LifeDialogue;
  decision?: {
    person: PartnerId;
    action: LifeAction;
    reason: string;
    source: 'rules' | 'deepseek';
  };
};
export const LIFE_HABITS: Record<PartnerId, string> = {
  saber:
    '认真守时，习惯巡视周围、在意同伴，期待好好用餐；经历过长期战斗，正在学习普通的阅读、散步与休息。',
  rin: '自律务实，重视魔术学习与日常开销，习惯先安排事务；继承远坂家的责任，也需要给自己留下放松和与人相处的时间。',
};
export type DailyLife = {
  version: 1;
  minutes: number;
  people: Record<PartnerId, LifePerson>;
  positions: Record<ActorId, Point>;
  events: LifeEvent[];
  nextId: number;
  nextEncounter: number;
  holdUntil: number;
  encounters: number;
};
export const LIFE_IDS: PartnerId[] = ['saber', 'rin'];
export function createDailyLife(): DailyLife {
  const positions = Object.fromEntries(
    createStreetActors().map((a) => [a.id, { x: a.x, y: a.y }]),
  ) as Record<ActorId, Point>;
  return {
    version: 1,
    minutes: 980,
    people: {
      saber: { hunger: 68, energy: 76, social: 35, choices: 0, activity: null },
      rin: { hunger: 59, energy: 67, social: 28, choices: 0, activity: null },
    },
    positions,
    events: [],
    nextId: 1,
    nextEncounter: 980,
    holdUntil: 0,
    encounters: 0,
  };
}
export function lifeTime(minutes: number) {
  const minute = Math.floor(minutes % 1440);
  return `第 ${Math.floor(minutes / 1440) + 1} 天 · ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
export function lifePeriod(minutes: number) {
  const hour = (minutes % 1440) / 60;
  return hour < 6 || hour >= 20
    ? '夜间'
    : hour < 11
      ? '上午'
      : hour < 17
        ? '午后'
        : '傍晚';
}
export function lifeDestination(id: PartnerId, kind: LifeAction): Point {
  const place = LIFE_PLACES[LIFE_ACTIONS[kind].place];
  return {
    x: place.x + (id === 'rin' ? 35 : 0),
    y: place.y + (id === 'rin' ? 9 : 0),
  };
}
export function lifeIndoors(person: LifePerson) {
  return (
    person.activity?.phase === 'doing' &&
    ['sleep', 'rest', 'study'].includes(person.activity.kind)
  );
}
export function lifeStatus(person: LifePerson) {
  const action = person.activity;
  if (!action) return '决定接下来做什么';
  const def = LIFE_ACTIONS[action.kind];
  return action.phase === 'going'
    ? `前往${LIFE_PLACES[def.place].name} · ${def.label}`
    : `${def.label}${lifeIndoors(person) ? ' · 室内' : ''}`;
}
function addEvent(
  life: DailyLife,
  text: string,
  dialogue?: LifeDialogue,
): LifeEvent {
  const event = {
    id: life.nextId++,
    minute: life.minutes,
    text,
    ...(dialogue ? { dialogue } : {}),
  };
  life.events = [...life.events, event].slice(-80);
  return event;
}
export function decideLife(life: DailyLife, id: PartnerId): LifePlan {
  const person = life.people[id],
    hour = (life.minutes % 1440) / 60;
  if (hour >= 22 || hour < 6)
    return {
      action: 'sleep',
      reason:
        id === 'saber'
          ? '夜深了。养足精神，明天才能照顾好自己和身边的人。'
          : '今天先到这里。把休息也安排好，明天才有精神继续。',
    };
  if (person.hunger >= 55)
    return {
      action: 'eat',
      reason:
        id === 'saber'
          ? '走了一段路，开始期待热腾腾的食物。现在可以认真享受一顿饭。'
          : '有些饿了。先在附近吃一点，安排好花销和剩下的时间。',
    };
  if (person.energy < 35)
    return {
      action: 'rest',
      reason:
        id === 'saber'
          ? '身体已经有些疲倦。没有战斗要赶，也可以允许自己休息。'
          : '继续勉强自己效率也不会好，先回去歇一会儿。',
    };
  const weights: Record<PartnerId, Record<string, number>> = {
    saber: { walk: 0.9, read: 0.55, shop: 0.35, study: 0.15 },
    rin: { walk: 0.4, read: 0.45, shop: 0.75, study: 0.95 },
  };
  const previous = life.events
    .filter((e) => e.decision?.person === id)
    .slice(-2)
    .map((e) => e.decision!.action);
  const candidates = ['walk', 'read', 'shop', 'study'] as const;
  const action = candidates
    .map((kind, i) => ({
      kind,
      score:
        weights[id][kind] +
        ((person.choices * 7 + i * 3) % 11) / 30 +
        (kind === 'walk' || kind === 'read' ? person.social / 180 : 0) +
        (kind === 'study' && hour < 17 ? 0.25 : 0) -
        (previous.includes(kind) ? 0.85 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0].kind;
  const reasons: Record<
    PartnerId,
    Record<(typeof candidates)[number], string>
  > = {
    saber: {
      walk: '留意周围是长久以来的习惯。沿着街道走一走，也看看大家的日常。',
      read: '如今不必总为战斗做准备，想借一本书了解普通人的生活。',
      shop: '看看日常用品是否齐全，是照顾生活的一部分。',
      study: '整理见闻和魔术知识，以便在同伴需要时能帮上忙。',
    },
    rin: {
      walk: '该办的事不能占满一整天。换条路走走，顺便看看附近的变化。',
      read: '找个安静的位置读一会儿书，让紧绷的精神放松下来。',
      shop: '先看看日用品和价格。远坂家的日常账目也得认真打理。',
      study: '魔术学习不能荒废。把笔记整理清楚，是对自己和家族的责任。',
    },
  };
  return { action, reason: reasons[id][action] };
}
export function snapshotLife(life: DailyLife, actors: Actor[]): DailyLife {
  const copy = structuredClone(life);
  for (const actor of actors)
    copy.positions[actor.id] = { x: actor.x, y: actor.y };
  return copy;
}
/** Simulation time and NPC movement advance together; never catch up while the tab is absent. */
export function advanceDailyLife(
  life: DailyLife,
  actors: Actor[],
  dt: number,
  options: { running: boolean; speed: 1 | 4; controlled: ActorId | null },
): LifeEvent | null {
  const seconds = Number.isFinite(dt) ? clamp(dt, 0, 0.05) : 0;
  if (isPartner(options.controlled))
    life.people[options.controlled].activity = null;
  if (!options.running || !seconds) {
    for (const actor of actors)
      if (actor.id !== options.controlled) actor.frame = 0;
    return null;
  }
  const elapsed = seconds * options.speed * 2;
  life.minutes += elapsed;
  for (const id of LIFE_IDS) {
    const actor = actors.find((a) => a.id === id)!;
    const person = life.people[id];
    if (id === options.controlled) {
      person.activity = null;
      continue;
    }
    person.hunger = clamp(person.hunger + elapsed * 0.09, 0, 100);
    person.energy = clamp(person.energy - elapsed * 0.035, 0, 100);
    person.social = clamp(person.social + elapsed * 0.04, 0, 100);
    if (life.minutes < life.holdUntil) {
      actor.frame = 0;
      continue;
    }
    if (!person.activity) {
      const plan = decideLife(life, id),
        kind = plan.action;
      person.activity = {
        kind,
        phase: 'going',
        remaining: LIFE_ACTIONS[kind].duration,
        reason: plan.reason,
        source: 'rules',
      };
      if (kind === 'sleep')
        person.activity.remaining = (1800 - (life.minutes % 1440)) % 1440 || 1;
      person.choices++;
      actor.path = pathTo(actor, lifeDestination(id, kind));
      const event = addEvent(
        life,
        `${fatePerson(id)!.name}准备去${LIFE_PLACES[LIFE_ACTIONS[kind].place].name}${LIFE_ACTIONS[kind].label}。`,
      );
      event.decision = {
        person: id,
        action: kind,
        reason: plan.reason,
        source: 'rules',
      };
    }
    const action = person.activity;
    if (action.phase === 'going') {
      const destination = lifeDestination(id, action.kind);
      if (Math.hypot(actor.x - destination.x, actor.y - destination.y) < 2) {
        actor.path = [];
        actor.frame = 0;
        action.phase = 'doing';
        addEvent(
          life,
          `${fatePerson(id)!.name}到了${LIFE_PLACES[LIFE_ACTIONS[action.kind].place].name}，开始${LIFE_ACTIONS[action.kind].label}。`,
        );
      } else {
        if (!actor.path.length) actor.path = pathTo(actor, destination);
        stepActor(actor, seconds, undefined, 55 * options.speed);
      }
    } else {
      actor.frame = 0;
      action.remaining -= elapsed;
      if (action.kind === 'eat')
        person.hunger = clamp(person.hunger - elapsed * 2.3, 0, 100);
      if (action.kind === 'sleep' || action.kind === 'rest')
        person.energy = clamp(
          person.energy + elapsed * (action.kind === 'sleep' ? 0.4 : 1.2),
          0,
          100,
        );
      if (action.remaining <= 0) {
        addEvent(
          life,
          `${fatePerson(id)!.name}${action.kind === 'sleep' ? '醒来了' : `结束了${LIFE_ACTIONS[action.kind].label}`}。`,
        );
        person.activity = null;
      }
    }
  }
  const [a, b] = LIFE_IDS.map((id) => actors.find((actor) => actor.id === id)!);
  if (
    life.minutes >= life.nextEncounter &&
    options.controlled !== 'saber' &&
    options.controlled !== 'rin' &&
    LIFE_IDS.every(
      (id) =>
        life.people[id].activity?.phase === 'doing' &&
        !lifeIndoors(life.people[id]),
    ) &&
    Math.hypot(a.x - b.x, a.y - b.y) <= 105 &&
    WALK_AREAS.some((r) =>
      [a, b].every(
        (p) =>
          p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom,
      ),
    )
  ) {
    life.encounters++;
    life.nextEncounter = life.minutes + 100;
    life.holdUntil = life.minutes + 10;
    for (const id of LIFE_IDS)
      life.people[id].social = clamp(life.people[id].social - 25, 0, 100);
    const speaker = life.encounters % 2 ? 'rin' : 'saber';
    const target = speaker === 'rin' ? 'saber' : 'rin';
    const atCafe =
      life.people[speaker].activity?.kind === 'eat' ||
      life.people[speaker].activity?.kind === 'read';
    const opening =
      speaker === 'rin'
        ? atCafe
          ? '正好碰见你。要在这儿坐一会儿吗？我也想歇歇脚。'
          : '你也走到这边来了？今天似乎可以慢慢逛，不用赶时间。'
        : atCafe
          ? '这里的香气不错。凛，如果你不赶时间，要一起坐一会儿吗？'
          : '凛，今天的街道很安静。愿意一同走一段吗？';
    const reply =
      target === 'saber'
        ? '当然。能有这样平静的时间，我也想好好珍惜。'
        : '可以啊。既然碰上了，就一起待一会儿吧。';
    return addEvent(life, 'Saber 与凛偶遇，停下来聊了几句。', {
      speaker,
      target,
      message: opening,
      reply,
      source: 'preset',
    });
  }
  return null;
}
export type LifeScene = {
  minutes: number;
  place: LifePlace;
  saber: string;
  rin: string;
};
export function lifeScene(life: DailyLife, target: PartnerId): LifeScene {
  const p = life.positions[target];
  const place =
    p.x > 1080 ? 'cafe' : p.x < 530 ? 'home' : p.y < 790 ? 'shops' : 'street';
  return {
    minutes: life.minutes,
    place,
    saber: lifeStatus(life.people.saber),
    rin: lifeStatus(life.people.rin),
  };
}
export function parseLifeScene(value: unknown): LifeScene {
  if (!value || typeof value !== 'object') throw new Error('日常场景无效');
  const x = value as Record<string, unknown>;
  if (
    typeof x.minutes !== 'number' ||
    !Number.isFinite(x.minutes) ||
    x.minutes < 0 ||
    x.minutes > 1e9 ||
    typeof x.place !== 'string' ||
    !Object.hasOwn(LIFE_PLACES, x.place) ||
    typeof x.saber !== 'string' ||
    x.saber.length > 120 ||
    typeof x.rin !== 'string' ||
    x.rin.length > 120
  )
    throw new Error('日常场景无效');
  return {
    minutes: x.minutes,
    place: x.place as LifePlace,
    saber: x.saber,
    rin: x.rin,
  };
}
export function canAutoReply(x: {
  enabled: boolean;
  running: boolean;
  visible: boolean;
  verified: boolean;
  busy: boolean;
  used: number;
  limit: number;
  total: number;
  sinceLast: number;
}) {
  return (
    x.enabled &&
    x.running &&
    x.visible &&
    x.verified &&
    !x.busy &&
    x.used < x.limit &&
    x.total < 20 &&
    x.sinceLast >= 30000
  );
}
export function parseLifePlan(value: unknown): LifePlan {
  if (!value || typeof value !== 'object') throw new Error('没有有效行动');
  const x = value as Record<string, unknown>;
  if (
    typeof x.action !== 'string' ||
    !Object.hasOwn(LIFE_ACTIONS, x.action) ||
    typeof x.reason !== 'string' ||
    !x.reason.trim() ||
    x.reason.length > 200
  )
    throw new Error('行动超出当前可执行范围');
  return { action: x.action as LifeAction, reason: x.reason.trim() };
}
export function applyLifePlan(
  life: DailyLife,
  actors: Actor[],
  eventId: number,
  plan: LifePlan,
) {
  const event = life.events.find((e) => e.id === eventId);
  if (!event?.decision) return false;
  const id = event.decision.person,
    person = life.people[id],
    actor = actors.find((a) => a.id === id)!;
  if (
    life.events.filter((e) => e.decision?.person === id).at(-1)?.id !== eventId
  )
    return false;
  if (
    person.activity?.phase !== 'going' ||
    (person.hunger >= 90 && plan.action !== 'eat') ||
    (person.energy <= 10 && !['rest', 'sleep', 'eat'].includes(plan.action))
  )
    return false;
  person.activity = {
    kind: plan.action,
    phase: 'going',
    remaining: LIFE_ACTIONS[plan.action].duration,
    reason: plan.reason,
    source: 'deepseek',
  };
  actor.path = pathTo(actor, lifeDestination(id, plan.action));
  event.decision = { person: id, ...plan, source: 'deepseek' };
  event.text = `${fatePerson(id)!.name}准备去${LIFE_PLACES[LIFE_ACTIONS[plan.action].place].name}${LIFE_ACTIONS[plan.action].label}。`;
  return true;
}

export function parseDailyLife(value: unknown): DailyLife {
  if (!value || typeof value !== 'object') throw new Error('日常存档无效');
  const x = value as DailyLife;
  const number = (v: unknown, max = 1e9) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  if (
    x.version !== 1 ||
    !number(x.minutes) ||
    !number(x.nextEncounter) ||
    !number(x.holdUntil) ||
    !Number.isSafeInteger(x.nextId) ||
    x.nextId < 1 ||
    !Number.isSafeInteger(x.encounters) ||
    x.encounters < 0 ||
    !Array.isArray(x.events) ||
    x.events.length > 80
  )
    throw new Error('日常存档无效');
  const result = createDailyLife();
  for (const id of ['admin', ...LIFE_IDS] as ActorId[]) {
    const p = x.positions?.[id];
    if (!p || !isWalkable(p)) throw new Error('人物位置无效');
    result.positions[id] = { x: p.x, y: p.y };
  }
  for (const id of LIFE_IDS) {
    const p = x.people?.[id];
    if (
      !p ||
      !number(p.hunger, 100) ||
      !number(p.energy, 100) ||
      !number(p.social, 100) ||
      !Number.isSafeInteger(p.choices) ||
      p.choices < 0
    )
      throw new Error('人物状态无效');
    let activity: LifePerson['activity'] = null;
    if (p.activity !== null) {
      const a = p.activity;
      if (
        !a ||
        !Object.hasOwn(LIFE_ACTIONS, a.kind) ||
        !['going', 'doing'].includes(a.phase) ||
        !number(a.remaining, 1440) ||
        typeof a.reason !== 'string' ||
        a.reason.length > 200 ||
        !['rules', 'deepseek'].includes(a.source)
      )
        throw new Error('日常行动无效');
      activity = {
        kind: a.kind,
        phase: a.phase,
        remaining: a.remaining,
        reason: a.reason,
        source: a.source,
      };
    }
    result.people[id] = {
      hunger: p.hunger,
      energy: p.energy,
      social: p.social,
      choices: p.choices,
      activity,
    };
  }
  let previousId = 0;
  result.events = x.events.map((event) => {
    if (
      !event ||
      !Number.isSafeInteger(event.id) ||
      event.id <= previousId ||
      event.id >= x.nextId ||
      !number(event.minute, x.minutes) ||
      typeof event.text !== 'string' ||
      event.text.length > 300
    )
      throw new Error('日常记录无效');
    previousId = event.id;
    const clean: LifeEvent = {
      id: event.id,
      minute: event.minute,
      text: event.text,
    };
    if (event.decision !== undefined) {
      const d = event.decision;
      if (
        !d ||
        !isPartner(d.person) ||
        !['rules', 'deepseek'].includes(d.source)
      )
        throw new Error('行动记录无效');
      clean.decision = {
        person: d.person,
        ...parseLifePlan(d),
        source: d.source,
      };
    }
    if (event.dialogue !== undefined) {
      const d = event.dialogue;
      if (
        !d ||
        !isPartner(d.speaker) ||
        !isPartner(d.target) ||
        d.speaker === d.target ||
        typeof d.message !== 'string' ||
        d.message.length > 1200 ||
        typeof d.reply !== 'string' ||
        d.reply.length > 2400 ||
        !['preset', 'deepseek'].includes(d.source)
      )
        throw new Error('相遇对话无效');
      clean.dialogue = {
        speaker: d.speaker,
        target: d.target,
        message: d.message,
        reply: d.reply,
        source: d.source,
      };
    }
    return clean;
  });
  return {
    ...result,
    minutes: x.minutes,
    nextId: x.nextId,
    nextEncounter: x.nextEncounter,
    holdUntil: x.holdUntil,
    encounters: x.encounters,
  };
}
