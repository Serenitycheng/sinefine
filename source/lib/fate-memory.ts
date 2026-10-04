import { fatePerson, type PartnerId, type WaverStage } from './fate-cast';
import type { DialogueTurn } from './fate-dialogue';
import type { DailyLife, LifeEvent } from './fate-life';
import {
  MEETUPS,
  parseSocialEffects,
  type Appointment,
  type Bond,
  type SocialEffects,
} from './fate-social';

type MemoryBase = {
  id: string;
  eventId: number;
  minute: number;
  source: 'preset' | 'deepseek' | 'life';
  knownBy: [PartnerId, PartnerId];
  quotes: DialogueTurn[];
};
export type PersonalMemory = MemoryBase &
  (
    | {
        kind: 'preference';
        person: PartnerId;
        subject: string;
        preference: 'like' | 'dislike';
      }
    | {
        kind: 'experience';
        activity:
          | 'care'
          | 'friction'
          | 'walk'
          | 'read'
          | 'eat'
          | 'shared-meal'
          | 'repair';
        person?: PartnerId;
      }
    | {
        kind: 'appointment';
        appointmentId: number;
        activity: keyof typeof MEETUPS;
        start: number;
        until: number;
        status: Appointment['status'];
        updatedAt: number;
        shared: number;
      }
  );

/** Ordinary chatter cannot displace preferences or pending commitments. */
function keep(bond: Bond, memory: PersonalMemory) {
  if (
    (bond.archive ?? []).some(
      (m) => m.id === memory.id && m.eventId > memory.eventId,
    )
  )
    return;
  const records = [
    ...(bond.archive ?? []).filter((m) => m.id !== memory.id),
    memory,
  ];
  const preferences = records
    .filter((m) => m.kind === 'preference')
    .sort((a, b) => b.eventId - a.eventId)
    .slice(0, 8);
  const appointments = records
    .filter((m) => m.kind === 'appointment')
    .sort((a, b) => {
      const active = (m: PersonalMemory) =>
        m.kind === 'appointment' && ['pending', 'meeting'].includes(m.status)
          ? 1
          : 0;
      return active(b) - active(a) || b.eventId - a.eventId;
    })
    .slice(0, 4);
  const experiences = records
    .filter((m) => m.kind === 'experience')
    .sort((a, b) => b.eventId - a.eventId);
  const impressions = experiences
    .filter(
      (m) =>
        m.kind === 'experience' && ['care', 'friction'].includes(m.activity),
    )
    .slice(0, 4);
  const actual = experiences
    .filter(
      (m) =>
        m.kind === 'experience' && !['care', 'friction'].includes(m.activity),
    )
    .slice(0, 12 - impressions.length);
  bond.archive = [
    ...preferences,
    ...appointments,
    ...actual,
    ...impressions,
  ].sort((a, b) => a.eventId - b.eventId || a.id.localeCompare(b.id));
}
function base(
  bond: Bond,
  eventId: number,
  minute: number,
  source: MemoryBase['source'],
  quotes: DialogueTurn[],
): MemoryBase {
  return {
    id: '',
    eventId,
    minute,
    source,
    knownBy: [bond.a, bond.b],
    quotes: quotes.map((q) => ({ ...q })),
  };
}
export function rememberConversationFacts(
  bond: Bond,
  event: LifeEvent,
  effects: SocialEffects,
  turns: DialogueTurn[],
) {
  const source = (event.dialogue ?? event.interaction)!.source;
  for (const p of effects.preferences ?? [])
    keep(bond, {
      ...base(bond, event.id, event.minute, source, [
        { speaker: p.person, text: p.quote },
      ]),
      id: `preference:${p.person}:${p.subject}`,
      kind: 'preference',
      person: p.person,
      subject: p.subject,
      preference: p.kind,
    });
  for (const i of effects.impressions)
    keep(bond, {
      ...base(bond, event.id, event.minute, source, [
        { speaker: turns[i.turn].speaker, text: i.quote },
      ]),
      id: `impression:${i.person}:${i.kind}:${Math.floor(event.minute / 1440)}`,
      kind: 'experience',
      activity: i.kind,
      person: i.person,
    });
}
export function rememberCommitment(
  bond: Bond,
  a: Appointment,
  now: number,
  source?: MemoryBase['source'],
) {
  try {
    parseSocialEffects(
      {
        impressions: [],
        promise: {
          activity: a.activity,
          delay: a.start - a.createdAt,
          proposal: 0,
          acceptance: 1,
          proposalQuote: a.quotes[0]?.text,
          acceptanceQuote: a.quotes[1]?.text,
        },
      },
      a.quotes,
    );
  } catch {
    return; /* Legacy counterproposals are history, not reliable commitments. */
  }
  keep(bond, {
    ...base(
      bond,
      a.id,
      a.createdAt,
      source ??
        (bond.archive ?? []).find((m) => m.id === `appointment:${a.id}`)
          ?.source ??
        'life',
      a.quotes,
    ),
    id: `appointment:${a.id}`,
    kind: 'appointment',
    appointmentId: a.id,
    activity: a.activity,
    start: a.start,
    until: a.until,
    status: a.status,
    updatedAt: now,
    shared: a.shared,
  });
}
export function rememberRealExperience(
  bond: Bond,
  event: LifeEvent,
  activity: 'walk' | 'read' | 'eat' | 'shared-meal' | 'repair',
) {
  keep(bond, {
    ...base(bond, event.id, event.minute, 'life', []),
    id: `experience:${event.id}`,
    kind: 'experience',
    activity,
  });
}
export function visibleMemories(bond: Bond) {
  return (bond.archive ?? [])
    .filter((m) => m.eventId >= bond.cutoff)
    .slice()
    .reverse();
}
export function memorySummary(m: PersonalMemory, stage: WaverStage): string {
  if (m.kind === 'preference')
    return `${fatePerson(m.person, stage)!.name}明确说自己${m.preference === 'like' ? '喜欢' : '不喜欢'}${m.subject}。`;
  if (m.kind === 'experience') {
    if (m.person)
      return `${fatePerson(m.person, stage)!.name}${m.activity === 'care' ? '在这次交谈中感受到了关心' : '在这次交谈中有些话让人在意'}。`;
    if (m.activity === 'repair')
      return '实际一起检修了日常器具，物品状况得到改善。';
    return m.activity === 'shared-meal'
      ? '实际在同一张餐桌坐下用餐。'
      : `实际一起${MEETUPS[m.activity as keyof typeof MEETUPS].label}，留下了共同经历。`;
  }
  const time = `第 ${Math.floor(m.start / 1440) + 1} 天 ${String(Math.floor((m.start % 1440) / 60)).padStart(2, '0')}:${String(Math.floor(m.start % 60)).padStart(2, '0')}`;
  const status = {
    pending: '等待赴约，尚未履行',
    meeting: '正在碰面，尚未完成',
    fulfilled: '已实际一起度过这段时间',
    missed: '未能碰面，不推断原因',
    cancelled: '安排已取消',
  }[m.status];
  return `${time} · ${MEETUPS[m.activity].place} · 一起${MEETUPS[m.activity].label} · ${status}。`;
}

/** Restore only evidence still present in old saves; never replay relationship changes. */
export function migratePersonalMemories(life: DailyLife) {
  for (const bond of Object.values(life.bonds)) {
    if (bond.archive !== undefined) continue;
    bond.archive = [];
    for (const m of bond.memories.filter((m) => m.id >= bond.cutoff)) {
      const event: LifeEvent = {
        id: m.id,
        minute: m.minute,
        text: m.text,
        dialogue: {
          speaker: bond.a,
          target: bond.b,
          message: '旧记录',
          reply: '旧记录',
          source: m.source === 'life' ? 'preset' : m.source,
        },
      };
      const preferences: NonNullable<SocialEffects['preferences']> = [];
      m.quotes.forEach((q, turn) => {
        const match = /^我(不喜欢|喜欢)([^。！!？?]+)[。！!]?$/.exec(q.text);
        if (match)
          preferences.push({
            person: q.speaker,
            kind: match[1] === '喜欢' ? 'like' : 'dislike',
            subject: match[2],
            turn,
            quote: q.text,
          });
      });
      for (const p of preferences) {
        try {
          rememberConversationFacts(
            bond,
            event,
            parseSocialEffects({ impressions: [], preferences: [p] }, m.quotes),
            m.quotes,
          );
        } catch {
          /* Ambiguous legacy speech remains recent history. */
        }
      }
    }
    for (const e of life.events) {
      const d = e.dialogue ?? e.interaction;
      if (
        !d ||
        e.id < bond.cutoff ||
        ![bond.a, bond.b].includes(d.speaker as PartnerId) ||
        ![bond.a, bond.b].includes(d.target) ||
        d.speaker === d.target ||
        (bond.stage !== null &&
          (e.waverStage ??
            ('waverStage' in d ? d.waverStage : undefined) ??
            'young') !== bond.stage) ||
        !e.conversation
      )
        continue;
      const turns =
        'turns' in d && d.turns
          ? d.turns
          : [
              { speaker: d.speaker as PartnerId, text: d.message },
              { speaker: d.target, text: d.reply },
            ];
      rememberConversationFacts(bond, e, e.conversation.effects, turns);
    }
    for (const a of life.appointments.filter(
      (a) =>
        [a.a, a.b].includes(bond.a) &&
        [a.a, a.b].includes(bond.b) &&
        a.stage === bond.stage &&
        a.id >= bond.cutoff,
    )) {
      // Older releases allowed counterproposals: do not promote those into reliable memory.
      try {
        const delay = a.start - a.createdAt;
        parseSocialEffects(
          {
            impressions: [],
            promise: {
              activity: a.activity,
              delay,
              proposal: 0,
              acceptance: 1,
              proposalQuote: a.quotes[0].text,
              acceptanceQuote: a.quotes[1].text,
            },
          },
          a.quotes,
        );
        rememberCommitment(bond, a, life.minutes);
      } catch {
        /* Preserve legacy appointment history without claiming agreement. */
      }
    }
  }
}

export function parsePersonalMemories(
  value: unknown,
  a: PartnerId,
  b: PartnerId,
  minutes: number,
  nextId: number,
): PersonalMemory[] {
  if (!Array.isArray(value) || value.length > 24)
    throw new Error('个人记忆无效');
  const seen = new Set<string>();
  const integer = (n: unknown, max: number) =>
    typeof n === 'number' && Number.isSafeInteger(n) && n >= 1 && n <= max;
  const time = (n: unknown, max = minutes) =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
  const records = value.map((m: PersonalMemory): PersonalMemory => {
    if (
      !m ||
      typeof m.id !== 'string' ||
      seen.has(m.id) ||
      !integer(m.eventId, nextId - 1) ||
      !time(m.minute) ||
      !['preset', 'deepseek', 'life'].includes(m.source) ||
      !Array.isArray(m.knownBy) ||
      m.knownBy.length !== 2 ||
      m.knownBy[0] !== a ||
      m.knownBy[1] !== b ||
      !Array.isArray(m.quotes) ||
      m.quotes.length > 2 ||
      !m.quotes.every(
        (q) =>
          q &&
          [a, b].includes(q.speaker) &&
          typeof q.text === 'string' &&
          q.text.length >= 2 &&
          q.text.length <= 120,
      )
    )
      throw new Error('个人记忆依据无效');
    seen.add(m.id);
    const clean = base(
      { a, b } as Bond,
      m.eventId,
      m.minute,
      m.source,
      m.quotes,
    );
    clean.id = m.id;
    if (m.kind === 'preference') {
      if (
        m.id !== `preference:${m.person}:${m.subject}` ||
        ![a, b].includes(m.person) ||
        !['like', 'dislike'].includes(m.preference) ||
        m.quotes.length !== 1 ||
        m.source === 'life'
      )
        throw new Error('偏好记忆无效');
      parseSocialEffects(
        {
          impressions: [],
          preferences: [
            {
              person: m.person,
              kind: m.preference,
              subject: m.subject,
              turn: 0,
              quote: m.quotes[0].text,
            },
          ],
        },
        m.quotes,
      );
      return {
        ...clean,
        kind: m.kind,
        person: m.person,
        subject: m.subject,
        preference: m.preference,
      };
    }
    if (m.kind === 'experience') {
      if (['care', 'friction'].includes(m.activity)) {
        if (
          !m.person ||
          ![a, b].includes(m.person) ||
          m.id !==
            `impression:${m.person}:${m.activity}:${Math.floor(m.minute / 1440)}` ||
          m.quotes.length !== 1 ||
          m.quotes[0].speaker === m.person ||
          m.source === 'life'
        )
          throw new Error('相处记忆无效');
      } else if (
        !['walk', 'read', 'eat', 'shared-meal', 'repair'].includes(
          m.activity,
        ) ||
        m.id !== `experience:${m.eventId}` ||
        m.source !== 'life' ||
        m.person !== undefined ||
        m.quotes.length
      )
        throw new Error('经历记忆无效');
      return {
        ...clean,
        kind: m.kind,
        activity: m.activity,
        ...(m.person ? { person: m.person } : {}),
      };
    }
    if (
      m.kind !== 'appointment' ||
      m.id !== `appointment:${m.appointmentId}` ||
      m.appointmentId !== m.eventId ||
      !Object.hasOwn(MEETUPS, m.activity) ||
      !time(m.start, minutes + 180) ||
      !time(m.until, minutes + 240) ||
      m.until - m.start !== 60 ||
      !time(m.updatedAt) ||
      m.updatedAt < m.minute ||
      !time(m.shared, 10) ||
      !['pending', 'meeting', 'fulfilled', 'missed', 'cancelled'].includes(
        m.status,
      ) ||
      (m.status === 'fulfilled' && (m.shared < 10 || m.updatedAt < m.start)) ||
      m.quotes.length !== 2
    )
      throw new Error('约定记忆无效');
    parseSocialEffects(
      {
        impressions: [],
        promise: {
          activity: m.activity,
          delay: m.start - m.minute,
          proposal: 0,
          acceptance: 1,
          proposalQuote: m.quotes[0].text,
          acceptanceQuote: m.quotes[1].text,
        },
      },
      m.quotes,
    );
    return {
      ...clean,
      kind: m.kind,
      appointmentId: m.appointmentId,
      activity: m.activity,
      start: m.start,
      until: m.until,
      status: m.status,
      updatedAt: m.updatedAt,
      shared: m.shared,
    };
  });
  if (
    records.filter((m) => m.kind === 'preference').length > 8 ||
    records.filter((m) => m.kind === 'experience').length > 12 ||
    records.filter((m) => m.kind === 'appointment').length > 4
  )
    throw new Error('个人记忆数量无效');
  return records;
}
