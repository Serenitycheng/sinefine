import { fatePerson, type PartnerId } from './fate-cast';
import type { DailyLife, LifeAction } from './fate-life';
import { visibleMemories } from './fate-memory';

const interests: Partial<Record<LifeAction, readonly string[]>> = {
  walk: ['散步', '安静地散步'],
  read: ['阅读', '看书'],
  study: ['整理笔记', '学习'],
  cook: ['料理', '做饭'],
  repair: ['修理日常器具', '修理物品'],
  shop: ['逛小店', '购物'],
};

/** Read only memories this observer actually knows; never infer a taste from identity. */
export function knownPreferences(
  life: DailyLife,
  observer: PartnerId,
  person = observer,
) {
  const latest = new Map<
    string,
    { subject: string; preference: 'like' | 'dislike'; eventId: number }
  >();
  for (const bond of Object.values(life.bonds)) {
    if (
      ![bond.a, bond.b].includes(observer) ||
      (bond.stage !== null && bond.stage !== life.waverStage)
    )
      continue;
    for (const m of visibleMemories(bond)) {
      if (m.kind !== 'preference' || m.person !== person) continue;
      if ((latest.get(m.subject)?.eventId ?? -1) < m.eventId)
        latest.set(m.subject, m);
    }
  }
  return [...latest.values()].sort((a, b) => b.eventId - a.eventId);
}
export function activityPreference(
  life: DailyLife,
  person: PartnerId,
  action: LifeAction,
) {
  return knownPreferences(life, person).find((m) =>
    interests[action]?.includes(m.subject),
  );
}
export function preferenceWeight(
  life: DailyLife,
  person: PartnerId,
  action: LifeAction,
) {
  const p = activityPreference(life, person, action);
  return p ? (p.preference === 'like' ? 1.25 : -2) : 0;
}
export function recentImpression(life: DailyLife, a: PartnerId, b: PartnerId) {
  const bond = Object.values(life.bonds).find(
    (s) =>
      [s.a, s.b].includes(a) &&
      [s.a, s.b].includes(b) &&
      (s.stage === null || s.stage === life.waverStage),
  );
  return bond
    ? visibleMemories(bond).find(
        (m) =>
          m.kind === 'experience' &&
          m.person &&
          ['care', 'friction'].includes(m.activity) &&
          life.minutes - m.minute < 360,
      )
    : undefined;
}
export function behaviorNotes(life: DailyLife, person: PartnerId) {
  const notes = knownPreferences(life, person)
    .filter((p) =>
      Object.values(interests).some((words) => words?.includes(p.subject)),
    )
    .slice(0, 2)
    .map(
      (p) =>
        `${p.preference === 'like' ? '闲暇时会更倾向' : '闲暇时会少选'}${p.subject}；吃饭、休息和固定作息优先。`,
    );
  for (const bond of Object.values(life.bonds)) {
    if (
      ![bond.a, bond.b].includes(person) ||
      (bond.stage !== null && bond.stage !== life.waverStage)
    )
      continue;
    const other = bond.a === person ? bond.b : bond.a;
    const m = recentImpression(life, person, other);
    if (m?.kind === 'experience' && m.person === person)
      notes.push(
        m.activity === 'friction'
          ? `与${fatePerson(other, life.waverStage)!.name}刚有些不愉快，暂时少主动搭话；已答应的约定仍会认真对待。`
          : `记得${fatePerson(other, life.waverStage)!.name}的关心，碰面时更愿意聊几句。`,
      );
  }
  return notes.slice(0, 4);
}
