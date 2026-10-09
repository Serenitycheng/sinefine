import { fatePerson, isPartner, type PartnerId } from './fate-cast';
import type { DialogueTurn } from './fate-dialogue';
import type { DailyLife } from './fate-life';
import { recentImpression } from './fate-memory-behavior';
import { samePavement, type Actor, type ActorId } from './street';

export type PassingGreeting = {
  speaker: PartnerId;
  target: PartnerId;
  turns: DialogueTurn[];
};
export const GREETING_COOLDOWN = 90;
export const GREETING_DURATION = 6;

// Familiarity permits a greeting, not an automatic reconciliation or promise.
const family: readonly [PartnerId, PartnerId, string, string][] = [
  [
    'kiritsugu',
    'natalia',
    '娜塔莉亚，出门了。……路上小心。',
    '切嗣。别只顾着忙，记得吃饭。',
  ],
  [
    'kiritsugu',
    'illya',
    '伊莉雅。……我看见你了。',
    '切嗣，这次别装作没看见我。',
  ],
  ['kiritsugu', 'irisviel', '爱丽。……今天天气不错。', '切嗣，你也出来走走了？'],
  [
    'kiritsugu',
    'shirou',
    '士郎。……别忙得忘了吃饭。',
    '老爹，你也是。路上慢点。',
  ],
  ['irisviel', 'illya', '伊莉雅，玩得开心，路上小心。', '妈妈，我知道啦。'],
  ['taiga', 'shirou', '士郎！别又把午饭忘了。', '藤姐，我记着呢。'],
];

/** A brief outdoor greeting never stops a route or supplies the player's reply. */
export function passingGreeting(
  life: DailyLife,
  actors: readonly Actor[],
  controlled: ActorId | null,
  moving: ReadonlySet<ActorId>,
  outside: (id: PartnerId) => boolean,
): PassingGreeting | null {
  if (life.minutes < life.holdUntil) return null;
  // Do not stack bubbles when several family members pass the same junction.
  if (
    life.events.some(
      (e) => e.greeting && life.minutes - e.minute < GREETING_DURATION,
    )
  )
    return null;
  for (const [a, b, aLine, bLine] of family) {
    if (!moving.has(a) && !moving.has(b)) continue;
    if (!outside(a) || !outside(b)) continue;
    if (
      [a, b].some((id) => {
        const action = life.people[id].activity;
        return (
          action?.school ||
          (action?.phase === 'doing' &&
            (['sleep', 'cook'].includes(action.kind) ||
              (action.routine !== undefined && action.kind === 'study')))
        );
      })
    )
      continue;
    if ([a, b].some((id) => life.people[id].activity?.meeting !== undefined))
      continue;
    const key = [a, b].sort().join('|');
    const last = life.lastGreetings?.[key];
    if (last !== undefined && life.minutes < last + GREETING_COOLDOWN) continue;
    const previousConversation = life.lastEncounters[key];
    if (
      previousConversation !== undefined &&
      life.minutes - previousConversation < 15
    )
      continue;
    const friction = recentImpression(life, a, b);
    if (
      friction?.kind === 'experience' &&
      friction.activity === 'friction' &&
      life.minutes - friction.minute < 90
    )
      continue;
    const first = actors.find((actor) => actor.id === a);
    const second = actors.find((actor) => actor.id === b);
    if (
      !first ||
      !second ||
      Math.hypot(first.x - second.x, first.y - second.y) > 105 ||
      !samePavement(first, second)
    )
      continue;
    const playerInPair = isPartner(controlled) && [a, b].includes(controlled);
    const speaker = controlled === a ? b : a;
    const target = speaker === a ? b : a;
    const turns = playerInPair
      ? [{ speaker, text: speaker === a ? aLine : bLine }]
      : [
          { speaker: a, text: aLine },
          { speaker: b, text: bLine },
        ];
    return { speaker, target, turns };
  }
  return null;
}

export function greetingJournal(life: DailyLife, greeting: PassingGreeting) {
  return `${fatePerson(greeting.speaker, life.waverStage)!.name}路过${fatePerson(greeting.target, life.waverStage)!.name}，打了个招呼：${greeting.turns[0].text}`;
}

export function parsePassingGreeting(value: unknown): PassingGreeting {
  if (!value || typeof value !== 'object') throw new Error('路过招呼记录无效');
  const g = value as PassingGreeting;
  if (
    !isPartner(g.speaker) ||
    !isPartner(g.target) ||
    g.speaker === g.target ||
    !Array.isArray(g.turns) ||
    g.turns.length < 1 ||
    g.turns.length > 2 ||
    g.turns[0]?.speaker !== g.speaker ||
    g.turns.some(
      (turn, i) =>
        !turn ||
        turn.speaker !== (i === 0 ? g.speaker : g.target) ||
        typeof turn.text !== 'string' ||
        !turn.text.trim() ||
        turn.text.length > 120,
    )
  )
    throw new Error('路过招呼记录无效');
  return {
    speaker: g.speaker,
    target: g.target,
    turns: g.turns.map((t) => ({ speaker: t.speaker, text: t.text })),
  };
}
