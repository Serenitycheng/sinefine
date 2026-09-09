import { LIFE_ROUTINES, LEISURE_ACTIONS } from './fate-habits';
import {
  fatePerson,
  isPartner,
  STREET_PARTNERS,
  type PartnerId,
} from './fate-cast';
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
  cook: { label: '做饭并用餐', place: 'home', duration: 45 },
  repair: { label: '检修日常器具', place: 'shops', duration: 35 },
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
export const LIFE_HABITS = Object.fromEntries(
  STREET_PARTNERS.map((id) => [id, LIFE_ROUTINES[id].habits]),
) as Record<PartnerId, string>;
export type DailyLife = {
  version: 2;
  minutes: number;
  people: Record<PartnerId, LifePerson>;
  positions: Record<ActorId, Point>;
  events: LifeEvent[];
  nextId: number;
  nextEncounter: number;
  holdUntil: number;
  encounters: number;
};
export const LIFE_IDS = STREET_PARTNERS;
export function createDailyLife(): DailyLife {
  const positions = Object.fromEntries(
    createStreetActors().map((a) => [a.id, { x: a.x, y: a.y }]),
  ) as Record<ActorId, Point>;
  return {
    version: 2,
    minutes: 980,
    people: {
      saber: { hunger: 68, energy: 76, social: 35, choices: 0, activity: null },
      rin: { hunger: 59, energy: 67, social: 28, choices: 0, activity: null },
      shirou: {
        hunger: 32,
        energy: 72,
        social: 38,
        choices: 0,
        activity: null,
      },
      sakura: {
        hunger: 35,
        energy: 75,
        social: 40,
        choices: 0,
        activity: null,
      },
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
    x: place.x + { saber: 0, rin: 35, shirou: -35, sakura: 18 }[id],
    y: place.y + { saber: 0, rin: 9, shirou: 15, sakura: -10 }[id],
  };
}
export function lifeIndoors(person: LifePerson) {
  return (
    person.activity?.phase === 'doing' &&
    ['sleep', 'rest', 'study', 'cook'].includes(person.activity.kind)
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
  const routine = LIFE_ROUTINES[id];
  if (hour >= 22 || hour < 6)
    return { action: 'sleep', reason: routine.reasons.sleep };
  if (person.hunger >= 55)
    return { action: 'eat', reason: routine.reasons.eat };
  if (person.energy < 35)
    return { action: 'rest', reason: routine.reasons.rest };
  const previous = life.events
    .filter((e) => e.decision?.person === id)
    .slice(-2)
    .map((e) => e.decision!.action);
  const candidates = LEISURE_ACTIONS;
  const action = candidates
    .map((kind, i) => ({
      kind,
      score:
        routine.weights[kind] +
        ((person.choices * 7 + i * 3) % 11) / 30 +
        (kind === 'walk' || kind === 'read' ? person.social / 180 : 0) +
        (kind === 'study' && hour < 17 ? 0.25 : 0) -
        (kind === 'cook' && person.hunger < 20 ? 1.1 : 0) -
        (previous.includes(kind) ? 0.85 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0].kind;
  return { action, reason: routine.reasons[action] };
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
  const conversation = life.events
    .slice()
    .reverse()
    .find((e) => e.dialogue)?.dialogue;
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
    if (
      life.minutes < life.holdUntil &&
      conversation &&
      [conversation.speaker, conversation.target].includes(id) &&
      options.controlled !== conversation.speaker &&
      options.controlled !== conversation.target
    ) {
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
      if (action.kind === 'eat' || action.kind === 'cook')
        person.hunger = clamp(
          person.hunger - elapsed * (action.kind === 'eat' ? 2.3 : 1.5),
          0,
          100,
        );
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
  if (life.minutes < life.nextEncounter) return null;
  const eligible = LIFE_IDS.filter(
    (id) =>
      id !== options.controlled &&
      life.people[id].activity?.phase === 'doing' &&
      !lifeIndoors(life.people[id]),
  );
  const pairs = eligible.flatMap((a, index) =>
    eligible.slice(index + 1).map((b) => [a, b] as const),
  );
  // Rotate ties so the first roster pair cannot monopolize encounters.
  for (let offset = 0; offset < pairs.length; offset++) {
    const [first, second] = pairs[(life.encounters + offset) % pairs.length];
    const a = actors.find((actor) => actor.id === first)!,
      b = actors.find((actor) => actor.id === second)!;
    const previous = life.events
      .slice()
      .reverse()
      .find(
        (e) =>
          e.dialogue &&
          [e.dialogue.speaker, e.dialogue.target].includes(first) &&
          [e.dialogue.speaker, e.dialogue.target].includes(second),
      );
    if (previous && life.minutes - previous.minute < 100) continue;
    if (
      Math.hypot(a.x - b.x, a.y - b.y) > 105 ||
      !WALK_AREAS.some((r) =>
        [a, b].every(
          (p) =>
            p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom,
        ),
      )
    )
      continue;
    const dialogue = encounterDialogue(first, second);
    life.encounters++;
    life.nextEncounter = life.minutes + 15;
    life.holdUntil = life.minutes + 10;
    for (const id of [first, second])
      life.people[id].social = clamp(life.people[id].social - 25, 0, 100);
    return addEvent(
      life,
      `${fatePerson(first)!.name}与${fatePerson(second)!.name}偶遇，停下来聊了几句。`,
      dialogue,
    );
  }
  return null;
}

/** Relationship-specific local openings; never infer a romance ending or hidden memories. */
export function encounterDialogue(a: PartnerId, b: PartnerId): LifeDialogue {
  const lines: {
    pair: readonly [PartnerId, PartnerId];
    message: string;
    reply: string;
  }[] = [
    {
      pair: ['rin', 'saber'],
      message: '正好碰见你。今天不用赶时间，要一起待一会儿吗？',
      reply: '当然。能有这样平静的时间，我也想好好珍惜。',
    },
    {
      pair: ['shirou', 'saber'],
      message: 'Saber，今天还顺利吗？别总顾着留意周围，你也可以放松一点。',
      reply: '士郎，你也是。照顾同伴固然重要，也别忘了自己的休息。',
    },
    {
      pair: ['sakura', 'shirou'],
      message: '前辈，今天有没有把自己的事情也安排进去？不必每次都先顾着别人。',
      reply: '嗯，我记住了。樱也是，想做什么就去做，不用总替大家操心。',
    },
    {
      pair: ['rin', 'shirou'],
      message: '卫宫同学，今天可别又把别人的事全揽下来。自己的时间也要算进去。',
      reply: '知道了，远坂。我会量力而行的。你也别把日程排得太满。',
    },
    {
      pair: ['rin', 'sakura'],
      message: '樱，今天有看到喜欢的东西吗？难得不赶时间，可以慢慢看看。',
      reply: '嗯，想给自己挑点东西。凛前辈要是有空，也一起看看吧。',
    },
    {
      pair: ['saber', 'sakura'],
      message: '樱，今天过得如何？如果你想找个安静的地方，我可以陪你走一段。',
      reply: '谢谢你，Saber。今天想慢慢逛一会儿，看看自己平时没留意的地方。',
    },
  ];
  const entry = lines.find(({ pair }) => pair.includes(a) && pair.includes(b))!;
  return {
    speaker: entry.pair[0],
    target: entry.pair[1],
    message: entry.message,
    reply: entry.reply,
    source: 'preset',
  };
}

export type LifeScene = {
  minutes: number;
  place: LifePlace;
  saber: string;
  rin: string;
  shirou: string;
  sakura: string;
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
    shirou: lifeStatus(life.people.shirou),
    sakura: lifeStatus(life.people.sakura),
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
    x.rin.length > 120 ||
    ['shirou', 'sakura'].some(
      (id) =>
        x[id] !== undefined &&
        (typeof x[id] !== 'string' || (x[id] as string).length > 120),
    )
  )
    throw new Error('日常场景无效');
  return {
    minutes: x.minutes,
    place: x.place as LifePlace,
    saber: x.saber,
    rin: x.rin,
    shirou: typeof x.shirou === 'string' ? x.shirou : '尚未记录',
    sakura: typeof x.sakura === 'string' ? x.sakura : '尚未记录',
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
  const x = value as Omit<DailyLife, 'version'> & { version: number };
  const number = (v: unknown, max = 1e9) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  if (
    ![1, 2].includes(x.version) ||
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
  const ids: readonly PartnerId[] =
    x.version === 1 ? ['saber', 'rin'] : LIFE_IDS;
  for (const id of ['admin', ...ids] as ActorId[]) {
    const p = x.positions?.[id];
    if (!p || !isWalkable(p)) throw new Error('人物位置无效');
    result.positions[id] = { x: p.x, y: p.y };
  }
  for (const id of ids) {
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
