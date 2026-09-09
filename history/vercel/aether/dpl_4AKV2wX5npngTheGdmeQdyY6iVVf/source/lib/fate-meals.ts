import {
  fatePerson,
  isPartner,
  STREET_PARTNERS,
  type PartnerId,
} from './fate-cast';
import { FATE_HOMES, homeOf, isHomeId, type HomeId } from './fate-housing';
import { lifeRoutine } from './fate-habits';
import type { DailyLife, LifePerson } from './fate-life';
import type { ActorId } from './street';

export type HomeMeal = {
  id: string;
  home: HomeId;
  day: number;
  slot: 'breakfast' | 'dinner';
  cook: PartnerId;
  phase: 'preparing' | 'ready' | 'finished' | 'cancelled';
  startedAt: number;
  expiresAt: number;
  participants: PartnerId[];
};
export type MealEvent = {
  home: HomeId;
  slot: HomeMeal['slot'];
  kind: 'planned' | 'prepared' | 'joined' | 'shared' | 'finished' | 'cancelled';
  participants: PartnerId[];
};
export type MealLog = (text: string, meal: MealEvent) => void;
export const mealName = (meal: Pick<HomeMeal, 'slot'>) =>
  meal.slot === 'breakfast' ? '早饭' : '晚饭';
const peopleNames = (life: DailyLife, ids: PartnerId[]) =>
  ids.map((id) => fatePerson(id, life.waverStage)!.name).join('、');
export function activeMeal(life: DailyLife, id?: string) {
  return id
    ? life.meals.find(
        (m) =>
          m.id === id &&
          ['preparing', 'ready'].includes(m.phase) &&
          life.minutes < m.expiresAt,
      )
    : undefined;
}
export function mealWindow(minutes: number): HomeMeal['slot'] | null {
  const time = minutes % 1440;
  return time >= 420 && time < 510
    ? 'breakfast'
    : time >= 1080 && time < 1170
      ? 'dinner'
      : null;
}
export function availableMeal(life: DailyLife, id: PartnerId) {
  const activity = life.people[id].activity;
  const visiting =
    activity?.kind === 'visit' && activity.phase === 'doing'
      ? activity.home
      : undefined;
  const candidate = (m: HomeMeal) =>
    activeMeal(life, m.id) && !m.participants.includes(id) && m.cook !== id;
  return (
    (visiting
      ? life.meals.find((m) => candidate(m) && m.home === visiting)
      : undefined) ??
    life.meals.find((m) => candidate(m) && m.home === homeOf(id, life.housing))
  );
}

// Reserve one cook per household and meal. Busy residents finish their current
// activity; sleeping and player-controlled residents do not get recruited.
export function planMeals(
  life: DailyLife,
  controlled: ActorId | null,
): HomeMeal[] {
  const slot = mealWindow(life.minutes),
    day = Math.floor(life.minutes / 1440);
  if (!slot) return [];
  const planned: HomeMeal[] = [];
  for (const home of Object.keys(FATE_HOMES) as HomeId[]) {
    const residents = STREET_PARTNERS.filter(
      (id) => homeOf(id, life.housing) === home,
    );
    if (
      residents.length < 2 ||
      life.meals.some(
        (m) => m.home === home && m.day === day && m.slot === slot,
      )
    )
      continue;
    const cook = residents
      .filter(
        (id) =>
          id !== controlled &&
          id !== 'illya' &&
          !life.people[id].activity &&
          !dueDuty(life, id) &&
          life.people[id].hunger < 85 &&
          life.people[id].energy >= 35,
      )
      .sort(
        (a, b) =>
          lifeRoutine(b, life.waverStage).weights.cook -
          lifeRoutine(a, life.waverStage).weights.cook,
      )[0];
    if (!cook) continue;
    const meal: HomeMeal = {
      id: `${day}:${slot}:${home}`,
      home,
      day,
      slot,
      cook,
      phase: 'preparing',
      startedAt: life.minutes,
      expiresAt: life.minutes + 150,
      participants: [],
    };
    life.meals = [...life.meals.filter((m) => m.home !== home), meal];
    planned.push(meal);
  }
  return planned;
}
export function mealActivity(
  meal: HomeMeal,
  cook = false,
): NonNullable<LifePerson['activity']> {
  return {
    kind: cook ? 'cook' : 'eat',
    home: meal.home,
    meal: meal.id,
    ...(cook ? {} : { waiting: meal.phase === 'preparing' }),
    phase: 'going',
    remaining: 30,
    source: 'rules',
    reason: cook
      ? `准备一份家常${mealName(meal)}，给同住的人也留一份。`
      : `回去吃${mealName(meal)}；如果还没做好，就先摆碗筷，等一会儿。`,
  };
}
export function reconcileMeals(
  life: DailyLife,
  controlled: ActorId | null,
  log: MealLog,
) {
  for (const meal of life.meals) {
    if (!['preparing', 'ready'].includes(meal.phase)) continue;
    if (
      meal.phase === 'preparing' &&
      (meal.cook === controlled ||
        life.people[meal.cook].activity?.meal !== meal.id)
    ) {
      meal.phase = 'cancelled';
      log(
        `${FATE_HOMES[meal.home].name}的${mealName(meal)}准备中断，大家可以另作安排。`,
        { ...meal, kind: 'cancelled', participants: [meal.cook] },
      );
    } else if (life.minutes >= meal.expiresAt) {
      meal.phase = 'finished';
      log(
        `${FATE_HOMES[meal.home].name}收起了这餐的餐桌，大家继续各自的日常。`,
        { ...meal, kind: 'finished' },
      );
    }
  }
  for (const id of STREET_PARTNERS) {
    const action = life.people[id].activity;
    if (
      action?.meal &&
      (!activeMeal(life, action.meal) ||
        (action.waiting && life.people[id].hunger >= 90))
    )
      life.people[id].activity = null;
  }
}
export function serveMeal(life: DailyLife, id: PartnerId, log: MealLog) {
  const person = life.people[id],
    meal = activeMeal(life, person.activity?.meal);
  if (
    !meal ||
    meal.cook !== id ||
    person.activity?.phase !== 'doing' ||
    person.activity.home !== meal.home
  )
    return;
  meal.phase = 'ready';
  log(
    `${fatePerson(id, life.waverStage)!.name}把${mealName(meal)}端上桌，给还没到家的人留了饭。`,
    { ...meal, kind: 'prepared', participants: [id] },
  );
  person.activity = {
    ...mealActivity(meal),
    phase: 'doing',
    waiting: false,
    reason: '饭已经做好，自己也坐下来好好吃一餐。',
  };
}
export function joinMeal(
  life: DailyLife,
  id: PartnerId,
  controlled: ActorId | null,
  log: MealLog,
) {
  const action = life.people[id].activity,
    meal = activeMeal(life, action?.meal);
  if (
    !meal ||
    meal.phase !== 'ready' ||
    action?.phase !== 'doing' ||
    action.kind !== 'eat' ||
    action.home !== meal.home ||
    id === controlled
  )
    return;
  action.waiting = false;
  if (meal.participants.includes(id)) return;
  meal.participants.push(id);
  const together = meal.participants.filter((other) => {
    const a = life.people[other].activity;
    return (
      other !== controlled &&
      a?.meal === meal.id &&
      a.phase === 'doing' &&
      a.kind === 'eat'
    );
  });
  log(
    together.length > 1
      ? `${peopleNames(life, together)}在${FATE_HOMES[meal.home].name}坐到一起，吃起了${mealName(meal)}。`
      : `${fatePerson(id, life.waverStage)!.name}在${FATE_HOMES[meal.home].name}坐下吃${mealName(meal)}。`,
    {
      ...meal,
      kind: together.length > 1 ? 'shared' : 'joined',
      participants: together,
    },
  );
  if (together.length > 1)
    for (const person of together)
      life.people[person].social = Math.max(0, life.people[person].social - 8);
}
export function homeMealSummary(life: DailyLife, meal: HomeMeal) {
  if (meal.phase === 'cancelled') return `${mealName(meal)}准备中断，另作安排`;
  if (meal.phase === 'finished') return `${mealName(meal)}已结束`;
  if (meal.phase === 'preparing')
    return `${fatePerson(meal.cook, life.waverStage)!.name}正在准备${mealName(meal)}`;
  const seated = STREET_PARTNERS.filter(
    (id) =>
      life.people[id].activity?.meal === meal.id &&
      life.people[id].activity?.kind === 'eat' &&
      life.people[id].activity?.phase === 'doing',
  );
  return seated.length
    ? `${peopleNames(life, seated)}正在用餐`
    : `${mealName(meal)}已备好，留饭至 ${String(Math.floor((meal.expiresAt % 1440) / 60)).padStart(2, '0')}:${String(Math.floor(meal.expiresAt % 60)).padStart(2, '0')}`;
}
export function parseMealEvent(value: unknown): MealEvent {
  if (!value || typeof value !== 'object') throw new Error('用餐记录无效');
  const m = value as MealEvent;
  if (
    !isHomeId(m.home) ||
    !['breakfast', 'dinner'].includes(m.slot) ||
    ![
      'planned',
      'prepared',
      'joined',
      'shared',
      'finished',
      'cancelled',
    ].includes(m.kind) ||
    !Array.isArray(m.participants) ||
    m.participants.length > STREET_PARTNERS.length ||
    m.participants.some((id) => !isPartner(id)) ||
    new Set(m.participants).size !== m.participants.length
  )
    throw new Error('用餐记录无效');
  return {
    home: m.home,
    slot: m.slot,
    kind: m.kind,
    participants: [...m.participants],
  };
}
export function parseMeals(value: unknown, minutes: number): HomeMeal[] {
  if (!Array.isArray(value) || value.length > Object.keys(FATE_HOMES).length)
    throw new Error('家庭餐桌无效');
  const homes = new Set<HomeId>();
  return value.map((m: HomeMeal) => {
    const event = parseMealEvent({ ...m, kind: 'planned' });
    if (
      !isPartner(m.cook) ||
      !Number.isSafeInteger(m.day) ||
      m.day < 0 ||
      m.day > Math.floor(minutes / 1440) ||
      m.id !== `${m.day}:${m.slot}:${m.home}` ||
      !['preparing', 'ready', 'finished', 'cancelled'].includes(m.phase) ||
      !Number.isFinite(m.startedAt) ||
      m.startedAt < 0 ||
      m.startedAt > minutes ||
      Math.floor(m.startedAt / 1440) !== m.day ||
      !Number.isFinite(m.expiresAt) ||
      m.expiresAt !== m.startedAt + 150 ||
      homes.has(m.home)
    )
      throw new Error('家庭餐桌无效');
    homes.add(m.home);
    return {
      id: m.id,
      home: event.home,
      slot: event.slot,
      cook: m.cook,
      day: m.day,
      phase: m.phase,
      startedAt: m.startedAt,
      expiresAt: m.expiresAt,
      participants: event.participants,
    };
  });
}
import { dueDuty } from './fate-schedule';
