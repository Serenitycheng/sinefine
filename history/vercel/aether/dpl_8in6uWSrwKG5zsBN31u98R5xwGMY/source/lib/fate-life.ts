import { LIFE_ROUTINES, LEISURE_ACTIONS, lifeRoutine } from './fate-habits';
import { addedEncounters } from './fate-new-encounters';
import { storedDialogueTurns, type DialogueTurn } from './fate-dialogue';
import {
  activeMeal,
  availableMeal,
  planMeals,
  mealActivity,
  reconcileMeals,
  serveMeal,
  joinMeal,
  mealName,
  homeMealSummary,
  parseMeals,
  parseMealEvent,
  type HomeMeal,
  type MealEvent,
} from './fate-meals';
import {
  FATE_HOMES,
  defaultHousing,
  homeOf,
  isHomeId,
  parseHousing,
  type HomeId,
  type FateHousing,
} from './fate-housing';
import {
  fatePerson,
  isPartner,
  STREET_PARTNERS,
  type PartnerId,
  type WaverStage,
  parseWaverStage,
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
  study: { label: '整理笔记', place: 'home', duration: 40 },
  shop: { label: '买日用品', place: 'shops', duration: 25 },
  walk: { label: '散步', place: 'street', duration: 20 },
  cook: { label: '做饭并用餐', place: 'home', duration: 45 },
  repair: { label: '检修日常器具', place: 'shops', duration: 35 },
  visit: { label: '探望家人', place: 'home', duration: 45 },
} as const;
export type LifeAction = keyof typeof LIFE_ACTIONS;
export type LifePerson = {
  hunger: number;
  energy: number;
  social: number;
  choices: number;
  activity: {
    meal?: string;
    waiting?: boolean;
    home?: HomeId;
    kind: LifeAction;
    phase: 'going' | 'doing';
    remaining: number;
    reason: string;
    source: 'rules' | 'deepseek';
  } | null;
};
export type LifeDialogue = {
  turns?: DialogueTurn[];
  waverStage?: WaverStage;
  speaker: PartnerId;
  target: PartnerId;
  message: string;
  reply: string;
  source: 'preset' | 'deepseek';
};
export type LifePlan = { action: LifeAction; reason: string };
export type LifeEvent = {
  meal?: MealEvent;
  waverStage?: WaverStage;
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
  meals: HomeMeal[];
  housing: FateHousing;
  familyVisitDay: number;
  version: 8;
  waverStage: WaverStage;
  minutes: number;
  people: Record<PartnerId, LifePerson>;
  positions: Record<ActorId, Point>;
  events: LifeEvent[];
  nextId: number;
  nextEncounter: number;
  holdUntil: number;
  encounters: number;
  lastEncounters: Record<string, number>;
};
export const LIFE_IDS = STREET_PARTNERS;
export function lifeHabits(id: PartnerId, stage: WaverStage = 'young') {
  return lifeRoutine(id, stage).habits;
}
export function changeWaverStage(
  life: DailyLife,
  stage: WaverStage,
): DailyLife {
  parseWaverStage(stage);
  if (life.waverStage === stage) return life;
  const next = structuredClone(life);
  next.waverStage = stage;
  next.people.waver.activity = null;
  const dialogue = next.events
    .slice()
    .reverse()
    .find((event) => event.dialogue)?.dialogue;
  if (dialogue && [dialogue.speaker, dialogue.target].includes('waver'))
    next.holdUntil = 0;
  addEvent(
    next,
    `韦伯已切换为${stage === 'adult' ? '成年 · 埃尔梅罗二世' : 'Fate/Zero 青年'}版本。`,
  );
  return next;
}
export function recentLifeEvents(life: DailyLife, id: PartnerId) {
  return life.events
    .filter((e) => {
      const belongs =
        e.decision?.person === id ||
        e.dialogue?.speaker === id ||
        e.dialogue?.target === id ||
        e.meal?.participants.includes(id);
      const hasWaver =
        e.decision?.person === 'waver' ||
        e.dialogue?.speaker === 'waver' ||
        e.dialogue?.target === 'waver' ||
        e.meal?.participants.includes('waver');
      return (
        belongs &&
        (!hasWaver ||
          (e.waverStage ?? e.dialogue?.waverStage ?? 'young') ===
            life.waverStage)
      );
    })
    .slice(-8);
}
export function createDailyLife(): DailyLife {
  const positions = Object.fromEntries(
    createStreetActors().map((a) => [a.id, { x: a.x, y: a.y }]),
  ) as Record<ActorId, Point>;
  return {
    meals: [],
    housing: defaultHousing(),
    familyVisitDay: -1,
    version: 8,
    waverStage: 'young',
    minutes: 980,
    people: {
      medea: { hunger: 26, energy: 73, social: 26, choices: 0, activity: null },
      kuzuki: {
        hunger: 29,
        energy: 79,
        social: 18,
        choices: 0,
        activity: null,
      },
      iskandar: {
        hunger: 42,
        energy: 86,
        social: 74,
        choices: 0,
        activity: null,
      },
      diarmuid: {
        hunger: 27,
        energy: 82,
        social: 32,
        choices: 0,
        activity: null,
      },
      cu: { hunger: 39, energy: 83, social: 60, choices: 0, activity: null },
      waver: { hunger: 31, energy: 64, social: 29, choices: 0, activity: null },
      illya: { hunger: 30, energy: 82, social: 65, choices: 0, activity: null },
      taiga: { hunger: 44, energy: 75, social: 58, choices: 0, activity: null },
      kiritsugu: {
        hunger: 28,
        energy: 61,
        social: 22,
        choices: 0,
        activity: null,
      },
      irisviel: {
        hunger: 32,
        energy: 78,
        social: 55,
        choices: 0,
        activity: null,
      },
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
    lastEncounters: {},
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
export function lifeDestination(
  id: PartnerId,
  kind: LifeAction,
  home?: HomeId,
): Point {
  if (home) {
    const point = FATE_HOMES[home];
    return {
      x: point.x + ((STREET_PARTNERS.indexOf(id) % 3) - 1) * 18,
      y: point.y + (STREET_PARTNERS.indexOf(id) % 2) * 12,
    };
  }
  const place = LIFE_PLACES[LIFE_ACTIONS[kind].place];
  return {
    x:
      place.x +
      {
        saber: 0,
        rin: 35,
        shirou: -35,
        sakura: 18,
        kiritsugu: -48,
        irisviel: 48,
        illya: -18,
        taiga: 0,
        diarmuid: -50,
        cu: 50,
        waver: 15,
        iskandar: 0,
        medea: -28,
        kuzuki: 28,
      }[id],
    y:
      place.y +
      {
        saber: 0,
        rin: 9,
        shirou: 15,
        sakura: -10,
        kiritsugu: -12,
        irisviel: 18,
        illya: -20,
        taiga: 23,
        diarmuid: 30,
        cu: -5,
        waver: 36,
        iskandar: -32,
        medea: -27,
        kuzuki: -18,
      }[id],
  };
}
export function lifeIndoors(person: LifePerson) {
  return (
    person.activity?.phase === 'doing' &&
    (Boolean(person.activity.home) ||
      ['sleep', 'rest', 'study', 'cook', 'visit'].includes(
        person.activity.kind,
      ))
  );
}
export function lifeStatus(person: LifePerson) {
  const action = person.activity;
  if (!action) return '决定接下来做什么';
  if (action.meal && action.kind === 'eat')
    return action.phase === 'going'
      ? `回${action.home ? FATE_HOMES[action.home].name : '家'}吃饭`
      : `${action.waiting ? '摆好碗筷，等饭做好' : '在家用餐'} · ${action.home ? FATE_HOMES[action.home].name : '餐桌'}`;
  if (action.meal && action.kind === 'cook' && action.phase === 'doing')
    return `准备家常饭 · ${FATE_HOMES[action.home!].name}`;
  const def = LIFE_ACTIONS[action.kind];
  return action.phase === 'going'
    ? `前往${action.home ? FATE_HOMES[action.home].name : LIFE_PLACES[def.place].name} · ${def.label}`
    : `${def.label}${lifeIndoors(person) ? ` · ${action.home ? FATE_HOMES[action.home].name : '室内'}` : ''}`;
}
function addEvent(
  life: DailyLife,
  text: string,
  dialogue?: LifeDialogue,
): LifeEvent {
  const event = {
    id: life.nextId++,
    waverStage: life.waverStage,
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
  const routine = lifeRoutine(id, life.waverStage);
  if (hour >= 22 || hour < 6)
    return { action: 'sleep', reason: routine.reasons.sleep };
  if (person.hunger >= 55)
    return { action: 'eat', reason: routine.reasons.eat };
  if (person.energy < 35)
    return { action: 'rest', reason: routine.reasons.rest };
  const day = Math.floor(life.minutes / 1440);
  if (
    id === 'kiritsugu' &&
    hour >= 17 &&
    hour < 20 &&
    day % 2 === 0 &&
    life.familyVisitDay !== day
  )
    return {
      action: 'visit',
      reason:
        '去卫宫宅看看士郎。和爱丽、伊莉雅一起生活，也仍然惦记着养子的日常。',
    };
  const previous = life.events
    .filter(
      (e) =>
        e.decision?.person === id &&
        (id !== 'waver' || (e.waverStage ?? 'young') === life.waverStage),
    )
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
function encounterKey(a: PartnerId, b: PartnerId) {
  return [a, b].sort().join('|');
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
  const mealLog = (text: string, meal: MealEvent) => {
    addEvent(life, text).meal = parseMealEvent(meal);
  };
  reconcileMeals(life, options.controlled, mealLog);
  for (const meal of planMeals(life, options.controlled)) {
    const person = life.people[meal.cook],
      actor = actors.find((a) => a.id === meal.cook)!;
    person.activity = mealActivity(meal, true);
    person.activity.reason = `${lifeRoutine(meal.cook, life.waverStage).reasons.cook} 给同住的人也留一份${mealName(meal)}。`;
    person.choices++;
    actor.path = pathTo(actor, lifeDestination(meal.cook, 'cook', meal.home));
    mealLog(
      `${fatePerson(meal.cook, life.waverStage)!.name}准备回${FATE_HOMES[meal.home].name}做${mealName(meal)}。`,
      { ...meal, kind: 'planned', participants: [meal.cook] },
    );
  }
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
    const invitation = availableMeal(life, id);
    if (
      invitation &&
      person.hunger >= 12 &&
      person.hunger < 85 &&
      person.energy >= 15 &&
      (!person.activity ||
        (person.activity.kind === 'visit' && person.activity.phase === 'doing'))
    ) {
      const visiting =
        person.activity?.kind === 'visit' &&
        person.activity.home === invitation.home;
      person.activity = mealActivity(invitation);
      if (visiting)
        person.activity.reason = '探望时正赶上这餐，留下来一起吃饭。';
      person.choices++;
      actor.path = pathTo(actor, lifeDestination(id, 'eat', invitation.home));
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
        ...(LIFE_ACTIONS[kind].place === 'home'
          ? {
              home: homeOf(
                kind === 'visit' && id === 'kiritsugu' ? 'shirou' : id,
                life.housing,
              ),
            }
          : {}),
      };
      if (kind === 'visit' && id === 'kiritsugu')
        life.familyVisitDay = Math.floor(life.minutes / 1440);
      if (kind === 'sleep')
        person.activity.remaining = (1800 - (life.minutes % 1440)) % 1440 || 1;
      person.choices++;
      actor.path = pathTo(
        actor,
        lifeDestination(id, kind, person.activity.home),
      );
      const event = addEvent(
        life,
        `${fatePerson(id, life.waverStage)!.name}准备去${person.activity.home ? FATE_HOMES[person.activity.home].name : LIFE_PLACES[LIFE_ACTIONS[kind].place].name}${LIFE_ACTIONS[kind].label}。`,
      );
      event.decision = {
        person: id,
        action: kind,
        reason: plan.reason,
        source: 'rules',
      };
    }
    const action = person.activity;
    if (!action.home && LIFE_ACTIONS[action.kind].place === 'home') {
      action.home = homeOf(id, life.housing);
      const home = lifeDestination(id, action.kind, action.home);
      if (Math.hypot(actor.x - home.x, actor.y - home.y) >= 2)
        action.phase = 'going';
    }
    if (action.phase === 'going') {
      const destination = lifeDestination(id, action.kind, action.home);
      if (Math.hypot(actor.x - destination.x, actor.y - destination.y) < 2) {
        actor.path = [];
        actor.frame = 0;
        action.phase = 'doing';
        addEvent(
          life,
          `${fatePerson(id, life.waverStage)!.name}到了${action.home ? FATE_HOMES[action.home].name : LIFE_PLACES[LIFE_ACTIONS[action.kind].place].name}，${action.meal ? (action.kind === 'cook' ? '开始准备餐食' : action.waiting ? '摆好碗筷等饭做好' : '坐下用餐') : `开始${LIFE_ACTIONS[action.kind].label}`}。`,
        );
      } else {
        if (!actor.path.length) actor.path = pathTo(actor, destination);
        stepActor(actor, seconds, undefined, 55 * options.speed);
      }
    } else {
      actor.frame = 0;
      if (action.meal && action.kind === 'eat') {
        joinMeal(life, id, options.controlled, mealLog);
        if (action.waiting) continue;
      }
      action.remaining -= elapsed;
      if (action.kind === 'eat' || (action.kind === 'cook' && !action.meal))
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
        if (action.meal && action.kind === 'cook') {
          serveMeal(life, id, mealLog);
          joinMeal(life, id, options.controlled, mealLog);
          continue;
        }
        addEvent(
          life,
          `${fatePerson(id, life.waverStage)!.name}${action.kind === 'sleep' ? '醒来了' : `结束了${LIFE_ACTIONS[action.kind].label}`}。`,
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
      life.people[id].activity?.kind !== 'sleep',
  );
  const pairs = eligible.flatMap((a, index) =>
    eligible.slice(index + 1).map((b) => [a, b] as const),
  );
  // Rotate ties so the first roster pair cannot monopolize encounters.
  for (let offset = 0; offset < pairs.length; offset++) {
    const [first, second] = pairs[(life.encounters + offset) % pairs.length];
    const a = actors.find((actor) => actor.id === first)!,
      b = actors.find((actor) => actor.id === second)!;
    const key = encounterKey(first, second);
    const previous = life.lastEncounters[key];
    if (previous !== undefined && life.minutes - previous < 100) continue;
    const homeA = occupiedHome(life, first),
      homeB = occupiedHome(life, second);
    if ((homeA || homeB) && (!homeA || homeA !== homeB)) continue;
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
    const dialogue = encounterDialogue(first, second, life.waverStage);
    const table = activeMeal(life, life.people[first].activity?.meal);
    const dining =
      table?.phase === 'ready' &&
      life.people[second].activity?.meal === table.id &&
      [first, second].every(
        (id) =>
          life.people[id].activity?.kind === 'eat' &&
          !life.people[id].activity?.waiting,
      );
    if (homeA) {
      // Indoors, a conversation starts from shared life rather than a street-window script.
      if (dialogue.speaker === 'illya' && dialogue.target === 'kiritsugu') {
        dialogue.message = '爸爸，你今天会留在家里吗？……我可不是随便问问。';
        dialogue.reply =
          '伊莉雅，我听见了。出门前会告诉你，也会说清楚什么时候回来。';
      } else if (
        dialogue.speaker === 'illya' &&
        dialogue.target === 'irisviel'
      ) {
        dialogue.message =
          '妈妈，等你忙完，可以陪我一会儿吗？有件事只想先告诉你。';
        dialogue.reply = '当然，伊莉雅。你先说，我在听。';
      } else if (
        dialogue.speaker === 'irisviel' &&
        dialogue.target === 'kiritsugu'
      ) {
        dialogue.message =
          '切嗣，难得都在家里，先把手边的东西放一放吧。陪我坐一会儿？';
        dialogue.reply = '……嗯，爱丽。今天想聊些什么？';
      } else if (dialogue.speaker === 'medea' && dialogue.target === 'kuzuki') {
        dialogue.message =
          '宗一郎，这些笔记我还想再看一会儿。你要休息的话，我会把灯挪开。';
        dialogue.reply = '不用。你继续，我在这里看讲义。';
      } else if (
        [first, second].includes('waver') &&
        [first, second].includes('iskandar')
      ) {
        dialogue.message =
          dialogue.speaker === 'waver'
            ? life.waverStage === 'adult'
              ? 'Rider，至少先把东西放好。桌上那叠是明天要用的讲义。'
              : 'Rider，别把东西随手堆在我的笔记上！我还没看完呢。'
            : '回到住处也别一直盯着书嘛。歇一会儿，和本王说说你在想什么？';
        dialogue.reply =
          dialogue.target === 'iskandar'
            ? '哦，是本王疏忽了。你看你的，等会儿可要给我讲讲！'
            : life.waverStage === 'adult'
              ? '……先让我把这一页读完。然后，说给你听。'
              : '再一页！说好了，不许嫌我讲得慢。';
      } else if (
        [first, second].includes('rin') &&
        [first, second].includes('sakura')
      ) {
        dialogue.message =
          dialogue.speaker === 'rin'
            ? '樱，厨房的东西用不顺手就告诉我。……不用事事都先问。'
            : '姐姐，这些东西我可以换个地方放吗？这样做饭会顺手一些。';
        dialogue.reply =
          dialogue.target === 'sakura'
            ? '嗯，谢谢姐姐。那……我想把茶杯放到容易拿的地方。'
            : '当然。这也是你住的地方，照你的习惯来就好。';
      } else if (
        [first, second].includes('saber') &&
        [first, second].includes('shirou')
      ) {
        dialogue.message =
          dialogue.speaker === 'saber'
            ? '士郎，晚饭需要我帮忙吗？不能一直让你独自忙碌。'
            : 'Saber，先坐一下吧。今天想吃点什么？';
        dialogue.reply =
          dialogue.target === 'shirou'
            ? '那就帮我摆一下碗筷吧。两个人会快一些，谢谢你。'
            : '士郎做的料理我都很期待。不过，先让我帮你摆好餐具。';
      } else if (
        [first, second].includes('shirou') &&
        [first, second].includes('kiritsugu')
      ) {
        dialogue.message =
          dialogue.speaker === 'shirou'
            ? '老爸，回来啦。要不要留下来吃点东西？'
            : '士郎，我来看看你。没有又忙得忘了吃饭吧？';
        dialogue.reply =
          dialogue.target === 'kiritsugu'
            ? '嗯，士郎。你也坐一会儿，别只顾着忙。'
            : '没有，我有照顾自己。老爸也是，坐下来歇会儿吧。';
      } else {
        dialogue.message = `${fatePerson(dialogue.target, life.waverStage)!.name}，你手边的事忙完了吗？想和你说会儿话。`;
        dialogue.reply = '可以。你说，我在听。';
      }
    }
    if (dining) {
      if (
        [first, second].includes('illya') &&
        [first, second].includes('kiritsugu')
      ) {
        dialogue.message =
          '爸爸，今天先把饭吃完再走，好不好？……我还有事情想跟你说。';
        dialogue.reply = '嗯，伊莉雅。我先坐在这里听你说，慢慢吃。';
      } else if (
        [first, second].includes('illya') &&
        [first, second].includes('irisviel')
      ) {
        dialogue.message = '妈妈，你也坐下来嘛。再忙下去，你那份就要凉了。';
        dialogue.reply = '好，听伊莉雅的。今天想先和妈妈聊什么？';
      } else if (
        [first, second].includes('saber') &&
        [first, second].includes('shirou')
      ) {
        dialogue.message =
          dialogue.speaker === 'saber'
            ? '士郎，这一餐很美味。你也好好吃，不要只顾着替我添饭。'
            : 'Saber，今天的味道怎么样？不用急，锅里还留着。';
        dialogue.reply =
          dialogue.target === 'shirou'
            ? '嗯，我也在吃。你喜欢的话，明天还可以换一种做法。'
            : '非常美味。不过，士郎也请先吃完自己那份。';
      } else if (
        [first, second].includes('rin') &&
        [first, second].includes('sakura')
      ) {
        dialogue.message =
          dialogue.speaker === 'rin'
            ? '樱，先坐下吃吧。……有些小事，吃着饭说也可以。'
            : '姐姐，这次我可以和你一起慢慢吃吗？碗筷等会儿再收就好。';
        dialogue.reply =
          dialogue.target === 'sakura'
            ? '嗯，姐姐。那我先给自己盛一碗。'
            : '当然。我也没说要你一个人收拾，先吃。';
      } else if (
        [first, second].includes('medea') &&
        [first, second].includes('kuzuki')
      ) {
        dialogue.message =
          '宗一郎，今天的味道还合适吗？……不必迁就我，你照实说就好。';
        dialogue.reply = '很好。你也坐下来吃。';
      } else if (
        [first, second].includes('irisviel') &&
        [first, second].includes('kiritsugu')
      ) {
        dialogue.message =
          '切嗣，吃饭的时候就先别想别的了。只陪我吃完这一餐，可以吗？';
        dialogue.reply = '……嗯，爱丽。你也慢慢吃。';
      } else if (
        [first, second].includes('shirou') &&
        [first, second].includes('kiritsugu')
      ) {
        dialogue.message =
          '老爸，难得回来，今天就坐着吃吧。也让我看看你有没有好好照顾自己。';
        dialogue.reply = '知道了，士郎。你也坐下，不用总照顾我。';
      } else if (
        [first, second].includes('waver') &&
        [first, second].includes('iskandar')
      ) {
        dialogue.message =
          dialogue.speaker === 'waver'
            ? life.waverStage === 'adult'
              ? 'Rider，慢些吃。剩下的那份也有人要吃，不能全由着你。'
              : 'Rider！至少等我坐下来再动那份啊，我还没吃呢！'
            : '哦，终于肯放下笔记了！来，坐下一起吃，吃完再听你说今天的事。';
        dialogue.reply =
          dialogue.target === 'iskandar'
            ? '哈哈，是本王心急了！你的那份留着，快坐下吧。'
            : life.waverStage === 'adult'
              ? '……先吃饭。笔记上的问题，等会儿再说。'
              : '不用你提醒！我自己也知道要吃饭的。';
      }
    }
    life.encounters++;
    life.lastEncounters[key] = life.minutes;
    life.nextEncounter = life.minutes + 15;
    life.holdUntil = life.minutes + 10;
    for (const id of [first, second])
      life.people[id].social = clamp(life.people[id].social - 25, 0, 100);
    return addEvent(
      life,
      `${fatePerson(first, life.waverStage)!.name}与${fatePerson(second, life.waverStage)!.name}${homeA ? `在${FATE_HOMES[homeA].name}` : '偶遇'}，${dining ? '一边吃饭，一边聊起日常' : '停下来聊了几句'}。`,
      dialogue,
    );
  }
  return null;
}

export function occupiedHome(life: DailyLife, id: PartnerId): HomeId | null {
  const activity = life.people[id].activity;
  return activity?.phase === 'doing' &&
    (activity.home || LIFE_ACTIONS[activity.kind].place === 'home')
    ? (activity.home ?? homeOf(id, life.housing))
    : null;
}

export function changeHousing(life: DailyLife, value: FateHousing): DailyLife {
  const next = structuredClone(life);
  next.housing = parseHousing(value);
  next.meals = [];
  for (const id of LIFE_IDS)
    if (
      next.people[id].activity &&
      (next.people[id].activity!.home ||
        LIFE_ACTIONS[next.people[id].activity!.kind].place === 'home')
    )
      next.people[id].activity = null;
  next.holdUntil = 0;
  addEvent(next, '住处安排已更新，居民会按新的住址继续生活。');
  return next;
}

/** Relationship-specific local openings; never infer a romance ending or hidden memories. */
export function encounterDialogue(
  a: PartnerId,
  b: PartnerId,
  stage: WaverStage = 'young',
): LifeDialogue {
  const lines: {
    pair: readonly [PartnerId, PartnerId];
    message: string;
    reply: string;
  }[] = [
    ...addedEncounters(stage),
    {
      pair: ['illya', 'irisviel'],
      message:
        '妈妈，我想再看看那边的橱窗。等我挑好了，再听听你喜欢哪一个，好不好？',
      reply:
        '好呀，伊莉雅。先选你自己喜欢的，我也想看看你的眼光。我们可以慢慢来。',
    },
    {
      pair: ['illya', 'kiritsugu'],
      message: '爸爸，你今天也只是路过吗？……我还想在这里待一会儿。',
      reply: '伊莉雅……我陪你。慢慢走，不用赶。',
    },
    {
      pair: ['illya', 'shirou'],
      message:
        '士郎，今天总该有点自己的时间了吧？别又说要先帮所有人把事情做完哦。',
      reply: '今天会留出时间的。你想去哪里看看？我也想听听你的安排。',
    },
    {
      pair: ['illya', 'saber'],
      message:
        'Saber，你站得这么认真，是在等什么吗？难得天气好，也看看橱窗嘛。',
      reply:
        '只是习惯留意周围。你说得对，今天也可以把目光放在这些平常的小事上。',
    },
    {
      pair: ['illya', 'rin'],
      message:
        '凛，你是不是连逛街都要先列一张清单？偶尔看到有趣的东西才决定，也不错吧。',
      reply: '清单只是防止多花钱，又不是命令。真遇到喜欢的，我当然会自己决定。',
    },
    {
      pair: ['illya', 'sakura'],
      message: '樱，你看东西总是很仔细呢。有喜欢的就说出来呀，我也想知道。',
      reply: '嗯，刚才那几样小东西都很可爱。我还想再看看，再挑自己最喜欢的。',
    },
    {
      pair: ['taiga', 'shirou'],
      message:
        '士郎，今天没有又替别人忙得忘了自己吧？我可不想到了饭点才发现你还空着肚子。',
      reply:
        '藤姐，我会按时吃饭的。你也别备课到忘了休息，晚一点再继续也没关系。',
    },
    {
      pair: ['taiga', 'sakura'],
      message:
        '樱，今天有给自己放个假吗？家里的事慢慢来，你也该挑点自己喜欢的事情做。',
      reply: '谢谢藤村老师。今天想先看看书，再慢慢逛一会儿，不急着回去。',
    },
    {
      pair: ['taiga', 'rin'],
      message:
        '远坂同学，放学之后也别把安排塞得太满呀。休息可不是偷懒，老师也得认真练习。',
      reply: '我有安排休息，藤村老师。倒是您，别一说到有趣的东西就把备课忘了。',
    },
    {
      pair: ['taiga', 'kiritsugu'],
      message:
        '切嗣先生，今天有好好吃饭吗？总是安安静静的，让人忍不住想多问一句。',
      reply: '有的，谢谢。你也忙了一天吧，自己的事情也别落下。',
    },
    {
      pair: ['taiga', 'irisviel'],
      message:
        '爱丽丝菲尔小姐，看起来逛得很开心嘛！这条街慢慢走，确实能发现不少小东西。',
      reply:
        '是呀，能自己挑选日用品也很有趣。藤村老师有空的话，也说说你喜欢什么吧。',
    },
    {
      pair: ['taiga', 'saber'],
      message: 'Saber，要不要在这里歇一会儿？一直站得这么笔直，看着都替你累。',
      reply: '谢谢你，藤村老师。我并不疲倦，不过能坐下来聊几句，也很好。',
    },
    {
      pair: ['illya', 'taiga'],
      message: '大河，你说话好有精神呀。老师每天都要这样吗？那也很辛苦吧。',
      reply:
        '也有安静备课的时候哦！谢谢你关心。你今天想逛哪里？走累了就一起歇歇。',
    },
    {
      pair: ['irisviel', 'kiritsugu'],
      message: '切嗣，今天有想做的事吗？只是陪我走一小段，也可以。',
      reply: '……嗯。你想往哪边走？今天可以慢一点。',
    },
    {
      pair: ['shirou', 'kiritsugu'],
      message: '老爹，今天别只顾着看书，晚饭也记得好好吃。',
      reply: '知道了。士郎，你也一样。别总把自己的事放到最后。',
    },
    {
      pair: ['saber', 'kiritsugu'],
      message:
        '切嗣，我会按自己的判断留意街道。若有需要说明的事，请直接告诉我。',
      reply: '……这里没有任务。我也只是走走。其他的事，各自判断吧。',
    },
    {
      pair: ['rin', 'kiritsugu'],
      message:
        '卫宫先生，如果是日常的事，可以直接说。远坂家的事，我会自己作判断。',
      reply: '我明白。没有别的事，只是路过。你照自己的安排就好。',
    },
    {
      pair: ['sakura', 'kiritsugu'],
      message: '卫宫先生，打扰了。想请问一下，咖啡店是在街角那边吗？',
      reply: '嗯，沿着这条路就能看见。不远，慢慢走就好。',
    },
    {
      pair: ['irisviel', 'saber'],
      message:
        'Saber，今天也给自己留一点时间吧。想看什么、想尝什么，都可以慢慢选。',
      reply: '爱丽丝菲尔，谢谢你的提醒。既然如此，我想先看看街角的点心。',
    },
    {
      pair: ['irisviel', 'shirou'],
      message: '士郎，也说说你自己想做的事吧。不必每次都先想着替别人准备什么。',
      reply: '嗯……想先逛逛，再看看有没有值得读的书。谢谢你提醒我。',
    },
    {
      pair: ['irisviel', 'rin'],
      message:
        '远坂小姐，有没有你喜欢的书可以推荐？我想看看和魔术笔记不同的东西。',
      reply:
        '倒是有几本。既然是休息时读的，就选自己感兴趣的，不必把阅读也当作功课。',
    },
    {
      pair: ['irisviel', 'sakura'],
      message:
        '这家店看着很有趣。你有看到自己喜欢的东西吗？我还想慢慢挑一会儿。',
      reply: '有几样小东西很可爱。我也还没决定，想再看看。',
    },
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
    ...(entry.pair.includes('waver') ? { waverStage: stage } : {}),
    speaker: entry.pair[0],
    target: entry.pair[1],
    message: entry.message,
    reply: entry.reply,
    source: 'preset',
  };
}

export type LifeScene = {
  meal?: string;
  home?: HomeId;
  minutes: number;
  place: LifePlace;
  saber: string;
  rin: string;
  shirou: string;
  sakura: string;
  kiritsugu: string;
  irisviel: string;
  illya: string;
  taiga: string;
  diarmuid: string;
  cu: string;
  waver: string;
  iskandar: string;
  medea: string;
  kuzuki: string;
};
export function lifeScene(life: DailyLife, target: PartnerId): LifeScene {
  const p = life.positions[target];
  const home = occupiedHome(life, target);
  const place = home
    ? 'home'
    : p.x > 1080
      ? 'cafe'
      : p.x < 530
        ? 'home'
        : p.y < 790
          ? 'shops'
          : 'street';
  return {
    ...(home &&
    life.meals.find((m) => m.home === home && activeMeal(life, m.id))
      ? {
          meal: homeMealSummary(
            life,
            life.meals.find((m) => m.home === home && activeMeal(life, m.id))!,
          ),
        }
      : {}),
    ...(home ? { home } : {}),
    minutes: life.minutes,
    place,
    saber: lifeStatus(life.people.saber),
    rin: lifeStatus(life.people.rin),
    shirou: lifeStatus(life.people.shirou),
    sakura: lifeStatus(life.people.sakura),
    kiritsugu: lifeStatus(life.people.kiritsugu),
    irisviel: lifeStatus(life.people.irisviel),
    illya: lifeStatus(life.people.illya),
    taiga: lifeStatus(life.people.taiga),
    diarmuid: lifeStatus(life.people.diarmuid),
    cu: lifeStatus(life.people.cu),
    waver: lifeStatus(life.people.waver),
    iskandar: lifeStatus(life.people.iskandar),
    medea: lifeStatus(life.people.medea),
    kuzuki: lifeStatus(life.people.kuzuki),
  };
}
export function parseLifeScene(value: unknown): LifeScene {
  if (!value || typeof value !== 'object') throw new Error('日常场景无效');
  const x = value as Record<string, unknown>;
  if (
    x.meal !== undefined &&
    (typeof x.meal !== 'string' || x.meal.length > 250 || x.home === undefined)
  )
    throw new Error('餐桌场景无效');
  if (x.home !== undefined && (!isHomeId(x.home) || x.place !== 'home'))
    throw new Error('场景住址无效');
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
    [
      'shirou',
      'sakura',
      'kiritsugu',
      'irisviel',
      'illya',
      'taiga',
      'diarmuid',
      'cu',
      'waver',
      'iskandar',
      'medea',
      'kuzuki',
    ].some(
      (id) =>
        x[id] !== undefined &&
        (typeof x[id] !== 'string' || (x[id] as string).length > 120),
    )
  )
    throw new Error('日常场景无效');
  return {
    ...(typeof x.meal === 'string' ? { meal: x.meal } : {}),
    minutes: x.minutes,
    place: x.place as LifePlace,
    ...(x.home === undefined ? {} : { home: x.home as HomeId }),
    saber: x.saber,
    rin: x.rin,
    shirou: typeof x.shirou === 'string' ? x.shirou : '尚未记录',
    sakura: typeof x.sakura === 'string' ? x.sakura : '尚未记录',
    kiritsugu: typeof x.kiritsugu === 'string' ? x.kiritsugu : '尚未记录',
    irisviel: typeof x.irisviel === 'string' ? x.irisviel : '尚未记录',
    illya: typeof x.illya === 'string' ? x.illya : '尚未记录',
    taiga: typeof x.taiga === 'string' ? x.taiga : '尚未记录',
    diarmuid: typeof x.diarmuid === 'string' ? x.diarmuid : '尚未记录',
    cu: typeof x.cu === 'string' ? x.cu : '尚未记录',
    waver: typeof x.waver === 'string' ? x.waver : '尚未记录',
    iskandar: typeof x.iskandar === 'string' ? x.iskandar : '尚未记录',
    medea: typeof x.medea === 'string' ? x.medea : '尚未记录',
    kuzuki: typeof x.kuzuki === 'string' ? x.kuzuki : '尚未记录',
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
  if (id === 'waver' && (event.waverStage ?? 'young') !== life.waverStage)
    return false;
  if (
    life.events
      .filter(
        (e) =>
          e.decision?.person === id &&
          (id !== 'waver' || (e.waverStage ?? 'young') === life.waverStage),
      )
      .at(-1)?.id !== eventId
  )
    return false;
  if (
    person.activity?.meal ||
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
    ...(LIFE_ACTIONS[plan.action].place === 'home'
      ? {
          home: homeOf(
            plan.action === 'visit' && id === 'kiritsugu' ? 'shirou' : id,
            life.housing,
          ),
        }
      : {}),
  };
  actor.path = pathTo(
    actor,
    lifeDestination(id, plan.action, person.activity.home),
  );
  event.decision = { person: id, ...plan, source: 'deepseek' };
  event.text = `${fatePerson(id, life.waverStage)!.name}准备去${LIFE_PLACES[LIFE_ACTIONS[plan.action].place].name}${LIFE_ACTIONS[plan.action].label}。`;
  return true;
}

export function parseDailyLife(value: unknown): DailyLife {
  if (!value || typeof value !== 'object') throw new Error('日常存档无效');
  const x = value as Omit<DailyLife, 'version'> & { version: number };
  const number = (v: unknown, max = 1e9) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  if (
    ![1, 2, 3, 4, 5, 6, 7, 8].includes(x.version) ||
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
  if (x.version >= 8) result.meals = parseMeals(x.meals, x.minutes);
  result.housing = parseHousing(x.housing);
  if (x.familyVisitDay !== undefined) {
    if (
      !Number.isSafeInteger(x.familyVisitDay) ||
      x.familyVisitDay < -1 ||
      x.familyVisitDay > Math.floor(x.minutes / 1440)
    )
      throw new Error('探望记录无效');
    result.familyVisitDay = x.familyVisitDay;
  }
  if (x.version >= 5) result.waverStage = parseWaverStage(x.waverStage);
  if (x.version >= 3) {
    if (
      !x.lastEncounters ||
      typeof x.lastEncounters !== 'object' ||
      Array.isArray(x.lastEncounters) ||
      Object.keys(x.lastEncounters).length >
        (LIFE_IDS.length * (LIFE_IDS.length - 1)) / 2
    )
      throw new Error('相遇时间记录无效');
    for (const [key, minute] of Object.entries(x.lastEncounters)) {
      const [a, b, extra] = key.split('|');
      if (
        extra !== undefined ||
        !isPartner(a) ||
        !isPartner(b) ||
        a === b ||
        key !== encounterKey(a, b) ||
        !number(minute, x.minutes)
      )
        throw new Error('相遇时间记录无效');
      result.lastEncounters[key] = minute;
    }
  }
  const ids: readonly PartnerId[] =
    x.version === 1
      ? ['saber', 'rin']
      : x.version === 2
        ? ['saber', 'rin', 'shirou', 'sakura']
        : x.version === 3
          ? ['saber', 'rin', 'shirou', 'sakura', 'kiritsugu', 'irisviel']
          : x.version === 4
            ? [
                'saber',
                'rin',
                'shirou',
                'sakura',
                'kiritsugu',
                'irisviel',
                'illya',
                'taiga',
              ]
            : x.version === 5
              ? [
                  'saber',
                  'rin',
                  'shirou',
                  'sakura',
                  'kiritsugu',
                  'irisviel',
                  'illya',
                  'taiga',
                  'diarmuid',
                  'cu',
                  'waver',
                ]
              : x.version === 6
                ? [
                    'saber',
                    'rin',
                    'shirou',
                    'sakura',
                    'kiritsugu',
                    'irisviel',
                    'illya',
                    'taiga',
                    'diarmuid',
                    'cu',
                    'waver',
                    'iskandar',
                  ]
                : LIFE_IDS;
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
        ...(a.meal === undefined ? {} : { meal: a.meal }),
        ...(a.waiting === undefined ? {} : { waiting: a.waiting }),
        ...(a.home === undefined
          ? {}
          : {
              home:
                isHomeId(a.home) &&
                (LIFE_ACTIONS[a.kind].place === 'home' ||
                  (a.kind === 'eat' && Boolean(a.meal)))
                  ? a.home
                  : (() => {
                      throw new Error('行动住址无效');
                    })(),
            }),
        kind: a.kind,
        phase: a.phase,
        remaining: a.remaining,
        reason: a.reason,
        source: a.source,
      };
      if (a.meal !== undefined) {
        const meal = result.meals.find((m) => m.id === a.meal);
        if (
          !meal ||
          a.home !== meal.home ||
          !['eat', 'cook'].includes(a.kind) ||
          (a.kind === 'cook' && meal.cook !== id) ||
          (a.waiting !== undefined &&
            (typeof a.waiting !== 'boolean' || a.kind !== 'eat'))
        )
          throw new Error('用餐行动无效');
      } else if (a.waiting !== undefined) throw new Error('等候用餐记录无效');
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
    if (event.waverStage !== undefined) parseWaverStage(event.waverStage);
    const clean: LifeEvent = {
      ...(event.meal === undefined ? {} : { meal: parseMealEvent(event.meal) }),
      ...(event.waverStage === undefined
        ? {}
        : { waverStage: event.waverStage }),
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
      if (d.waverStage !== undefined) {
        parseWaverStage(d.waverStage);
        if (
          ![d.speaker, d.target].includes('waver') ||
          (event.waverStage !== undefined && event.waverStage !== d.waverStage)
        )
          throw new Error('相遇时期不匹配');
      }
      clean.dialogue = {
        ...(d.waverStage === undefined ? {} : { waverStage: d.waverStage }),
        speaker: d.speaker,
        target: d.target,
        message: d.message,
        reply: d.reply,
        ...storedDialogueTurns(
          d.turns,
          d.speaker,
          d.target,
          d.message,
          d.reply,
        ),
        source: d.source,
      };
    }
    return clean;
  });
  // Older saves had only the journal. Preserve every encounter time still available there.
  for (const event of result.events) {
    if (!event.dialogue) continue;
    const key = encounterKey(event.dialogue.speaker, event.dialogue.target);
    result.lastEncounters[key] = Math.max(
      result.lastEncounters[key] ?? 0,
      event.minute,
    );
  }
  return {
    ...result,
    minutes: x.minutes,
    nextId: x.nextId,
    nextEncounter: x.nextEncounter,
    holdUntil: x.holdUntil,
    encounters: x.encounters,
  };
}
