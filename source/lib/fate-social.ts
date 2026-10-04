import { DISTRICT_PLACES } from './fate-district';
import {
  fatePerson,
  isPartner,
  type PartnerId,
  type WaverStage,
} from './fate-cast';
import { parseDialogueTurns, type DialogueTurn } from './fate-dialogue';
import { recentImpression } from './fate-memory-behavior';
import type { DailyLife, LifeEvent } from './fate-life';
import {
  rememberConversationFacts,
  rememberCommitment,
  rememberRealExperience,
  visibleMemories,
  memorySummary,
  type PersonalMemory,
} from './fate-memory';

export const MEETUPS = {
  walk: {
    label: '散步',
    place: '林荫路边',
    x: DISTRICT_PLACES.park.x,
    y: DISTRICT_PLACES.park.y,
  },
  read: { label: '看书', place: '街角咖啡店', ...DISTRICT_PLACES.cafe },
  eat: { label: '吃饭', place: '街角咖啡店', ...DISTRICT_PLACES.cafe },
} as const;
export type MeetupKind = keyof typeof MEETUPS;
export type Impression = {
  person: PartnerId;
  kind: 'care' | 'friction';
  turn: number;
  quote: string;
};
export type PromiseOffer = {
  activity: MeetupKind;
  delay: 60 | 120 | 180;
  proposal: number;
  acceptance: number;
  proposalQuote: string;
  acceptanceQuote: string;
};
export type SocialEffects = {
  impressions: Impression[];
  preferences?: {
    person: PartnerId;
    kind: 'like' | 'dislike';
    subject: string;
    turn: number;
    quote: string;
  }[];
  promise?: PromiseOffer;
};
export type ConversationOutcome = {
  effects: SocialEffects;
  invitation?:
    | 'scheduled'
    | 'declined'
    | 'unconfirmed'
    | 'changed'
    | 'unsupported'
    | 'busy'
    | 'outside-hours';
};
export type BondMemory = {
  id: number;
  minute: number;
  source: 'preset' | 'deepseek' | 'life';
  kind: 'conversation' | 'fulfilled' | 'missed';
  quotes: DialogueTurn[];
  impressions: Pick<Impression, 'person' | 'kind' | 'quote'>[];
  text: string;
};
export type Bond = {
  a: PartnerId;
  b: PartnerId;
  stage: WaverStage | null;
  warmth: [number, number];
  tension: [number, number];
  familiarity: number;
  day: number;
  changes: number;
  seen: number;
  cutoff: number;
  memories: BondMemory[];
  archive?: PersonalMemory[];
};
export type Appointment = {
  id: number;
  a: PartnerId;
  b: PartnerId;
  stage: WaverStage | null;
  activity: MeetupKind;
  createdAt: number;
  start: number;
  until: number;
  shared: number;
  talked: boolean;
  attending?: PartnerId;
  notice?: string;
  status: 'pending' | 'meeting' | 'fulfilled' | 'missed' | 'cancelled';
  quotes: DialogueTurn[];
};
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const era = (a: PartnerId, b: PartnerId, stage: WaverStage) =>
  a === 'waver' || b === 'waver' ? stage : null;
export function bondKey(a: PartnerId, b: PartnerId, stage: WaverStage) {
  return [...[a, b].sort(), era(a, b, stage) ?? 'shared'].join('|');
}
export const currentBond = (life: DailyLife, a: PartnerId, b: PartnerId) =>
  life.bonds[bondKey(a, b, life.waverStage)];
export const currentAppointment = (life: DailyLife, a: Appointment) =>
  a.stage === null || a.stage === life.waverStage;
export const liveAppointment = (a: Appointment) =>
  a.status === 'pending' || a.status === 'meeting';
function proof(turns: DialogueTurn[], index: unknown, quote: unknown) {
  if (
    !Number.isInteger(index) ||
    Number(index) < 0 ||
    Number(index) >= turns.length ||
    typeof quote !== 'string' ||
    quote.length < 2 ||
    quote.length > 120 ||
    !turns[Number(index)].text.includes(quote)
  )
    throw new Error('交谈依据无效');
  return turns[Number(index)];
}

/** Only thrown after the previous save format's evidence checks have passed. */
export class ConflictingMeetupError extends Error {
  constructor() {
    super('双方提到的活动或地点不一致，暂不安排见面。');
    this.name = 'ConflictingMeetupError';
  }
}

const meetupActions: Record<MeetupKind, readonly string[]> = {
  walk: ['散步', '走走', '逛逛'],
  read: ['看书', '读书', '阅读'],
  eat: ['吃饭', '用餐'],
};
function conflictsWithMeetup(text: string, activity: MeetupKind) {
  const actions = meetupActions[activity];
  const places = activity === 'walk' ? ['林荫路边'] : ['街角咖啡店', '咖啡店'];
  const references = [...places, '那里', '那儿'];
  if (
    Object.entries(meetupActions).some(
      ([kind, words]) =>
        kind !== activity && words.some((word) => text.includes(word)),
    ) ||
    Object.values(MEETUPS).some(
      (meetup) =>
        meetup.place !== MEETUPS[activity].place && text.includes(meetup.place),
    )
  )
    return true;
  // A named destination must still be the proposed place. Plain agreement and
  // references such as "到时候见" or "在那里等你" need not repeat the whole plan.
  for (const [, destination] of text.matchAll(
    /(?:在|到|去)(?!时)([^，。！？!?；;\s]+)/g,
  )) {
    if (
      [...references, ...actions].some((word) => destination.startsWith(word))
    )
      continue;
    // "过去等你" and "有你在就放心" name no destination. Only an
    // identifiable place phrase can contradict the proposed meeting place.
    if (
      /^.{0,16}?(?:公园|学校|学园|咖啡店|咖啡馆|图书馆|书店|商店|餐厅|教会|住处|路边|河边|广场|家里|家中|宅|寺)/.test(
        destination,
      )
    )
      return true;
  }
  // Do not treat "好，一起打球" as agreement to one of the supported activities.
  for (const [, plan] of text.matchAll(/一起([^，。！？!?；;\s]*)/g)) {
    let rest = plan
      .replace(/^[一二两三\d]+小时后/, '')
      .replace(/^[在到去]/, '');
    const place = references.find((word) => rest.startsWith(word));
    if (place) rest = rest.slice(place.length);
    rest = rest.replace(/^去/, '');
    if (
      rest &&
      !actions.some((word) => rest.startsWith(word)) &&
      !/^(?:吧|呀|啊|见|碰面|等你)/.test(rest)
    )
      return true;
  }
  return false;
}
/** Effects must cite this conversation; missing annotations remain a neutral remembered encounter. */
export function parseSocialEffects(
  value: unknown,
  turns: DialogueTurn[],
): SocialEffects {
  if (value === undefined) return { impressions: [] };
  const e = value as SocialEffects;
  if (!e || !Array.isArray(e.impressions) || e.impressions.length > 2)
    throw new Error('交谈印象无效');
  const people = new Set<PartnerId>();
  const impressions = e.impressions.map((i) => {
    if (
      !i ||
      !isPartner(i.person) ||
      !turns.some((t) => t.speaker === i.person) ||
      people.has(i.person) ||
      !['care', 'friction'].includes(i.kind) ||
      proof(turns, i.turn, i.quote).speaker === i.person
    )
      throw new Error('交谈印象无效');
    people.add(i.person);
    return { person: i.person, kind: i.kind, turn: i.turn, quote: i.quote };
  });
  const preferences =
    e.preferences === undefined
      ? undefined
      : (() => {
          if (!Array.isArray(e.preferences) || e.preferences.length > 2)
            throw new Error('偏好依据无效');
          const seen = new Set<PartnerId>();
          return e.preferences.map((p) => {
            const turn = proof(turns, p?.turn, p?.quote);
            if (
              !p ||
              !isPartner(p.person) ||
              seen.has(p.person) ||
              turn.speaker !== p.person ||
              !['like', 'dislike'].includes(p.kind) ||
              typeof p.subject !== 'string' ||
              !p.subject.trim() ||
              p.subject.length > 30 ||
              p.quote !== turn.text.trim() ||
              !p.quote.startsWith(
                `我${p.kind === 'like' ? '喜欢' : '不喜欢'}${p.subject}`,
              ) ||
              p.quote.replace(/[。！!]$/, '') !==
                `我${p.kind === 'like' ? '喜欢' : '不喜欢'}${p.subject}` ||
              /[？?]|如果|要是|但是|不过|以前|不再|喜欢/.test(p.subject)
            )
              throw new Error('偏好必须是本人明确的表达');
            seen.add(p.person);
            return {
              person: p.person,
              kind: p.kind,
              subject: p.subject,
              turn: p.turn,
              quote: p.quote,
            };
          });
        })();
  const base = {
    impressions,
    ...(preferences === undefined ? {} : { preferences }),
  };
  if (e.promise === undefined || e.promise === null) return base;
  const p = e.promise;
  if (!Object.hasOwn(MEETUPS, p.activity) || ![60, 120, 180].includes(p.delay))
    throw new Error('约定内容无效');
  const first = proof(turns, p.proposal, p.proposalQuote),
    second = proof(turns, p.acceptance, p.acceptanceQuote);
  const time = { 60: '一小时后', 120: '两小时后', 180: '三小时后' }[p.delay];
  if (
    p.acceptance !== p.proposal + 1 ||
    p.proposalQuote !== first.text.trim() ||
    p.acceptanceQuote !== second.text.trim() ||
    first.speaker === second.speaker ||
    !p.proposalQuote.includes(time) ||
    !p.proposalQuote.includes('一起') ||
    !p.proposalQuote.includes(MEETUPS[p.activity].label) ||
    !p.proposalQuote.includes(MEETUPS[p.activity].place) ||
    !/^(好[啊的呀]?|可以|约好了|就这么定)(?:[，。！!\s]|$)/.test(
      second.text.trim(),
    ) ||
    /[不没别但改换]|而是|还是|算了|再看|再说|取消|拒绝|要是|如果|到时候看|明天|后天|[\d一二两三四五六七八九十]+[点:：]|？|\?/.test(
      second.text,
    ) ||
    /不要|不想|不能|没空|取消|拒绝|算了|改天|要是|如果/.test(first.text) ||
    [
      ...first.text.matchAll(/[一二两三四五六七八九十\d]+小时后/g),
      ...second.text.matchAll(/[一二两三四五六七八九十\d]+小时后/g),
    ].some((match) => match[0] !== time)
  )
    throw new Error('约定尚未明确同意');
  if (
    conflictsWithMeetup(first.text, p.activity) ||
    conflictsWithMeetup(second.text, p.activity) ||
    turns
      .slice(p.acceptance + 1)
      .some((t) => /改成|改到|改时间|改地点|换成|换到|还是去/.test(t.text))
  )
    throw new ConflictingMeetupError();
  if (
    turns
      .slice(p.acceptance + 1)
      .some((t) => /取消|不去了|还是不去|算了/.test(t.text))
  )
    throw new Error('约定在本次交谈中已撤回');
  return {
    ...base,
    promise: {
      activity: p.activity,
      delay: p.delay,
      proposal: p.proposal,
      acceptance: p.acceptance,
      proposalQuote: p.proposalQuote,
      acceptanceQuote: p.acceptanceQuote,
    },
  };
}

/** Validate each annotation separately: a bad promise must not erase valid care. */
export function resolveSocialEffects(
  value: unknown,
  turns: DialogueTurn[],
): SocialEffects {
  const data =
    value && typeof value === 'object' ? (value as SocialEffects) : undefined;
  const result: SocialEffects = { impressions: [] };
  const seen = new Set<PartnerId>();
  if (Array.isArray(data?.impressions) && data.impressions.length <= 2)
    for (const impression of data.impressions) {
      try {
        const valid = parseSocialEffects({ impressions: [impression] }, turns)
          .impressions[0];
        if (!seen.has(valid.person)) {
          result.impressions.push(valid);
          seen.add(valid.person);
        }
      } catch {
        /* Unproven metadata does not affect readable speech. */
      }
    }
  if (Array.isArray(data?.preferences) && data.preferences.length <= 2) {
    const preferences: NonNullable<SocialEffects['preferences']> = [];
    for (const preference of data.preferences) {
      try {
        const valid = parseSocialEffects(
          { impressions: [], preferences: [preference] },
          turns,
        ).preferences![0];
        if (!preferences.some((p) => p.person === valid.person))
          preferences.push(valid);
      } catch {
        /* Questions, conditional preferences and attributed speech are not facts. */
      }
    }
    if (preferences.length) result.preferences = preferences;
  }
  // Explicit, supported agreement is sufficient even when a model omits annotations.
  const invitation = inspectInvitation(turns);
  if (invitation.promise) result.promise = invitation.promise;
  // Keep every cited effect inside the existing four-quote memory format.
  const cited = new Set(result.impressions.map((i) => i.turn));
  if (result.promise) {
    cited.add(result.promise.proposal);
    cited.add(result.promise.acceptance);
  }
  if (result.preferences)
    result.preferences = result.preferences.filter((p) => {
      if (!cited.has(p.turn) && cited.size >= 4) return false;
      cited.add(p.turn);
      return true;
    });
  return result;
}

function inspectInvitation(turns: DialogueTurn[]): {
  status?: ConversationOutcome['invitation'];
  promise?: PromiseOffer;
} {
  for (let i = turns.length - 2; i >= 0; i--) {
    const first = turns[i],
      second = turns[i + 1];
    if (
      first.speaker === second.speaker ||
      !first.text.includes('一起') ||
      !/(?:一|两|三)小时后|明天|后天|要不要|好吗|有空/.test(first.text) ||
      !/散步|走走|看书|读书|阅读|吃饭|用餐|打球|逛/.test(first.text)
    )
      continue;
    if (/不要|不想|不能|没空|取消|拒绝|算了/.test(first.text)) continue;
    const later = turns
      .slice(i + 2)
      .map((t) => t.text)
      .join(' ');
    if (/取消|不去了|还是不去|算了/.test(later)) return { status: 'declined' };
    if (/改成|改到|改时间|改地点|换成|换到|还是去/.test(later))
      return { status: 'changed' };
    if (/不去|不想|不能|没空|不行|不了|不要|拒绝/.test(second.text))
      return { status: 'declined' };
    for (const activity of Object.keys(MEETUPS) as MeetupKind[])
      for (const delay of [60, 120, 180] as const) {
        try {
          const promise = parseSocialEffects(
            {
              impressions: [],
              promise: {
                activity,
                delay,
                proposal: i,
                acceptance: i + 1,
                proposalQuote: first.text.trim(),
                acceptanceQuote: second.text.trim(),
              },
            },
            turns,
          ).promise!;
          return { promise };
        } catch {
          /* Try only the three existing places and three time offsets. */
        }
      }
    if (
      /改|换|还是|两小时后|三小时后/.test(second.text) ||
      (Object.keys(MEETUPS) as MeetupKind[]).some(
        (kind) =>
          first.text.includes(MEETUPS[kind].label) &&
          conflictsWithMeetup(second.text, kind),
      )
    )
      return { status: 'changed' };
    const specified =
      Object.values(MEETUPS).some(
        (p) => first.text.includes(p.place) && first.text.includes(p.label),
      ) && /一小时后|两小时后|三小时后/.test(first.text);
    return { status: specified ? 'unconfirmed' : 'unsupported' };
  }
  return {};
}

export function conversationSummary(
  outcome: ConversationOutcome,
  stage: WaverStage,
): string[] {
  const names = (id: PartnerId) => fatePerson(id, stage)!.name;
  const lines = outcome.effects.impressions.map(
    (i) =>
      `${names(i.person)}${i.kind === 'care' ? '感受到了关心' : '有些话让人在意'}。`,
  );
  for (const p of outcome.effects.preferences ?? [])
    lines.push(
      `${names(p.person)}说自己${p.kind === 'like' ? '喜欢' : '不喜欢'}${p.subject}。`,
    );
  const promise = outcome.effects.promise;
  const invitation = {
    scheduled: promise
      ? `约好了：${promise.delay / 60} 小时后在${MEETUPS[promise.activity].place}一起${MEETUPS[promise.activity].label}。`
      : '',
    declined: '对方谢绝了邀请，未安排见面。',
    unconfirmed: '还没有明确约好，未安排见面。',
    changed: '对方提出了不同的安排，原邀请未成立。',
    unsupported: '这项邀请还不能执行，先保留在交谈里。',
    busy: '已经有待履行的约定，未增加新的安排。',
    'outside-hours': '约定时间在休息时段，未安排见面。',
  };
  if (outcome.invitation) lines.push(invitation[outcome.invitation]);
  return lines.length ? lines : ['聊了几句，留下了这次交谈；没有新增约定。'];
}

export function parseConversationOutcome(
  value: unknown,
  turns: DialogueTurn[],
): ConversationOutcome {
  if (!value || typeof value !== 'object') throw new Error('交谈结果无效');
  const o = value as ConversationOutcome;
  if (!o.effects) throw new Error('交谈结果缺少依据');
  const effects = parseSocialEffects(o.effects, turns);
  if (
    new Set([
      ...effects.impressions.map((i) => i.turn),
      ...(effects.preferences ?? []).map((p) => p.turn),
      ...(effects.promise
        ? [effects.promise.proposal, effects.promise.acceptance]
        : []),
    ]).size > 4
  )
    throw new Error('交谈结果依据过多');
  const inspected = inspectInvitation(turns);
  if (
    o.invitation !== undefined &&
    (effects.promise
      ? !['scheduled', 'busy', 'outside-hours'].includes(o.invitation)
      : o.invitation !== inspected.status)
  )
    throw new Error('邀请结果与交谈不一致');
  if (effects.promise && o.invitation === undefined)
    throw new Error('约定结果缺失');
  return {
    effects,
    ...(o.invitation === undefined ? {} : { invitation: o.invitation }),
  };
}
function ensureBond(life: DailyLife, a: PartnerId, b: PartnerId): Bond {
  const key = bondKey(a, b, life.waverStage),
    [first, second] = [a, b].sort() as [PartnerId, PartnerId];
  return (
    life.bonds[key] ??
    (life.bonds[key] = {
      a: first,
      b: second,
      stage: era(a, b, life.waverStage),
      warmth: [0, 0],
      tension: [0, 0],
      familiarity: 0,
      day: -1,
      changes: 0,
      seen: 0,
      cutoff: 0,
      memories: [],
      archive: [],
    })
  );
}
function beginDay(bond: Bond, minute: number) {
  const day = Math.floor(minute / 1440);
  if (bond.day !== day) {
    bond.day = day;
    bond.changes = 0;
    bond.familiarity = Math.min(12, bond.familiarity + 1);
  }
}
function shift(bond: Bond, person: PartnerId, kind: 'care' | 'friction') {
  const index = person === bond.a ? 0 : 1;
  bond.warmth[index] = clamp(
    bond.warmth[index] + (kind === 'care' ? 1 : -1),
    -6,
    6,
  );
  bond.tension[index] = clamp(
    bond.tension[index] + (kind === 'care' ? -0.5 : 1),
    0,
    6,
  );
}
export function rememberEncounter(
  life: DailyLife,
  event: LifeEvent,
  effectValue?: unknown,
) {
  const d = event.dialogue ?? event.interaction;
  if (!d || !isPartner(d.speaker)) return false;
  if (
    (d.speaker === 'waver' || d.target === 'waver') &&
    (event.waverStage ??
      ('waverStage' in d ? d.waverStage : undefined) ??
      'young') !== life.waverStage
  )
    return false;
  const bond = ensureBond(life, d.speaker, d.target),
    old = bond.memories.find((m) => m.id === event.id);
  if (
    event.id < bond.cutoff ||
    (!old && event.id <= bond.seen) ||
    (old && (old.source !== 'preset' || d.source !== 'deepseek'))
  )
    return false;
  beginDay(bond, event.minute);
  const turns: DialogueTurn[] =
    'turns' in d && d.turns
      ? d.turns
      : [
          { speaker: d.speaker, text: d.message },
          { speaker: d.target, text: d.reply },
        ];
  const effects = resolveSocialEffects(effectValue, turns),
    selected = effects.promise
      ? [effects.promise.proposal, effects.promise.acceptance]
      : [];
  selected.push(
    ...effects.impressions.map((i) => i.turn),
    ...(effects.preferences ?? []).map((p) => p.turn),
    0,
    1,
  );
  const quotes = [...new Set(selected)].slice(0, 4).map((i) => ({
    speaker: turns[i].speaker,
    text:
      effects.promise?.proposal === i
        ? effects.promise.proposalQuote
        : effects.promise?.acceptance === i
          ? effects.promise.acceptanceQuote
          : (effects.impressions.find((e) => e.turn === i)?.quote ??
            effects.preferences?.find((p) => p.turn === i)?.quote ??
            turns[i].text.slice(0, 120)),
  }));
  const memory: BondMemory = {
    id: event.id,
    minute: event.minute,
    source: d.source,
    kind: 'conversation',
    quotes,
    impressions: effects.impressions.map(({ person, kind, quote }) => ({
      person,
      kind,
      quote,
    })),
    text: '曾在街区里交谈',
  };
  bond.memories = [...bond.memories.filter((m) => m.id !== event.id), memory]
    .sort((a, b) => a.id - b.id)
    .slice(-6);
  bond.seen = Math.max(bond.seen, event.id);
  if (effects.impressions.length && bond.changes < 2) {
    for (const i of effects.impressions) shift(bond, i.person, i.kind);
    bond.changes++;
  }
  const invitation = inspectInvitation(turns);
  const outcome: ConversationOutcome = {
    effects,
    ...(invitation.status ? { invitation: invitation.status } : {}),
  };
  const p = effects.promise;
  if (p) outcome.invitation = 'busy';
  if (
    p &&
    !life.appointments.some(
      (a) =>
        liveAppointment(a) &&
        currentAppointment(life, a) &&
        [a.a, a.b].some((id) => id === d.speaker || id === d.target),
    ) &&
    !life.appointments.some((a) => a.id === event.id)
  ) {
    const start = event.minute + p.delay,
      time = start % 1440;
    if (time >= 360 && time < 1320) {
      outcome.invitation = 'scheduled';
      life.appointments = [
        ...life.appointments.filter(liveAppointment),
        ...life.appointments.filter((a) => !liveAppointment(a)).slice(-12),
        {
          id: event.id,
          a: d.speaker,
          b: d.target,
          stage: era(d.speaker, d.target, life.waverStage),
          activity: p.activity,
          createdAt: event.minute,
          start,
          until: start + 60,
          shared: 0,
          talked: false,
          status: 'pending' as const,
          quotes: [
            { speaker: turns[p.proposal].speaker, text: p.proposalQuote },
            { speaker: turns[p.acceptance].speaker, text: p.acceptanceQuote },
          ],
        },
      ].sort((a, b) => a.id - b.id);
    } else outcome.invitation = 'outside-hours';
  }
  event.conversation = outcome;
  memory.text = conversationSummary(outcome, life.waverStage)
    .join(' ')
    .slice(0, 300);
  rememberConversationFacts(bond, event, effects, turns);
  const arranged = life.appointments.find((a) => a.id === event.id);
  if (arranged) rememberCommitment(bond, arranged, life.minutes, d.source);
  return true;
}
/** Replace the provisional local transcript once; late or repeated model replies cannot apply a second change. */
export function commitSocialDialogue(
  life: DailyLife,
  eventId: number,
  value: unknown,
  effectValue: unknown,
) {
  const event = life.events.find((e) => e.id === eventId),
    d = event?.dialogue;
  if (
    !event ||
    !d ||
    d.source === 'deepseek' ||
    life.minutes - event.minute > 1 ||
    ((d.speaker === 'waver' || d.target === 'waver') &&
      (event.waverStage ?? 'young') !== life.waverStage)
  )
    return false;
  const turns = parseDialogueTurns(value, d.speaker, d.target);
  event.dialogue = {
    ...d,
    turns,
    message: turns[0].text,
    reply: turns[1].text,
    source: 'deepseek',
  };
  rememberEncounter(life, event, effectValue);
  return true;
}
export function rememberAppointment(
  life: DailyLife,
  a: Appointment,
  event: LifeEvent,
) {
  const bond = ensureBond(life, a.a, a.b);
  if (event.id <= bond.seen) return;
  rememberCommitment(bond, a, event.minute);
  if (a.status === 'fulfilled') rememberRealExperience(bond, event, a.activity);
  beginDay(bond, event.minute);
  const memory: BondMemory = {
    id: event.id,
    minute: event.minute,
    source: 'life',
    kind: a.status === 'fulfilled' ? 'fulfilled' : 'missed',
    quotes: [],
    impressions: [],
    text: event.text,
  };
  bond.memories = [...bond.memories, memory].slice(-6);
  bond.seen = Math.max(bond.seen, event.id);
  if (a.status === 'fulfilled' && bond.changes < 2) {
    shift(bond, a.a, 'care');
    shift(bond, a.b, 'care');
    bond.changes++;
  }
}
/** A walk shared on site is a real encounter, without inventing a future appointment. */
export function rememberSharedWalk(
  life: DailyLife,
  a: PartnerId,
  b: PartnerId,
  event: LifeEvent,
  activity: 'walk' | 'repair' = 'walk',
) {
  const bond = ensureBond(life, a, b);
  if (event.id <= bond.seen) return;
  beginDay(bond, event.minute);
  rememberRealExperience(bond, event, activity);
  bond.memories = [
    ...bond.memories,
    {
      id: event.id,
      minute: event.minute,
      source: 'life' as const,
      kind: 'fulfilled' as const,
      quotes: [],
      impressions: [],
      text: event.text,
    },
  ].slice(-6);
  bond.seen = event.id;
  if (bond.changes < 2) {
    shift(bond, a, 'care');
    shift(bond, b, 'care');
    bond.changes++;
  }
}
export function socialAffinity(life: DailyLife, a: PartnerId, b: PartnerId) {
  const s = currentBond(life, a, b);
  const m = recentImpression(life, a, b);
  const recent =
    m?.kind === 'experience' ? (m.activity === 'care' ? 2 : -3) : 0;
  return s
    ? recent +
        s.familiarity * 0.15 +
        (s.warmth[0] + s.warmth[1]) * 0.3 -
        (s.tension[0] + s.tension[1]) * 0.6
    : 0;
}
export function socialCooldown(life: DailyLife, a: PartnerId, b: PartnerId) {
  const s = currentBond(life, a, b);
  const m = recentImpression(life, a, b);
  return (
    100 +
    (s ? Math.max(...s.tension) * 10 : 0) +
    (m?.kind === 'experience' ? (m.activity === 'friction' ? 90 : -20) : 0)
  );
}
export function bondSummary(bond: Bond, person: PartnerId) {
  const i = person === bond.a ? 0 : 1;
  return `${bond.warmth[i] > 0 ? '多了一些信任' : bond.warmth[i] < 0 ? '信任有所保留' : '相处仍在延续'}${bond.tension[i] > 0 ? '，有些话还让人在意' : ''}；原有身份与关系仍然保留。`;
}
export function socialContext(life: DailyLife, id: PartnerId) {
  return Object.values(life.bonds)
    .filter(
      (b) =>
        (b.a === id || b.b === id) &&
        (b.stage === null || b.stage === life.waverStage),
    )
    .map((b) => ({
      person: b.a === id ? b.b : b.a,
      state: `${fatePerson(b.a, life.waverStage)!.name}：${bondSummary(b, b.a)} ${fatePerson(b.b, life.waverStage)!.name}：${bondSummary(b, b.b)}`,
      memories: b.memories
        .filter((m) => m.id >= b.cutoff)
        .slice(-3)
        .map(
          (m) =>
            `${m.text}${m.quotes.map((q) => `${fatePerson(q.speaker, life.waverStage)!.name}：“${q.text}”`).join('；')}`,
        ),
      ...(b.archive === undefined
        ? {}
        : {
            knowledge: ['appointment', 'preference', 'experience'].flatMap(
              (kind) =>
                visibleMemories(b)
                  .filter((m) => m.kind === kind)
                  .slice(0, 2)
                  .map(
                    (m) =>
                      `第${Math.floor(m.minute / 1440) + 1}天记下：${memorySummary(m, life.waverStage)}${m.quotes.map((q) => `${fatePerson(q.speaker, life.waverStage)!.name}曾说：“${q.text}”`).join('；')}`,
                  ),
            ),
          }),
    }));
}
export function appointmentSummary(a: Appointment, stage: WaverStage) {
  const time = `第${Math.floor(a.start / 1440) + 1}天 ${String(Math.floor((a.start % 1440) / 60)).padStart(2, '0')}:${String(Math.floor(a.start % 60)).padStart(2, '0')}`;
  return `${fatePerson(a.a, stage)!.name}与${fatePerson(a.b, stage)!.name} · ${time}在${MEETUPS[a.activity].place}一起${MEETUPS[a.activity].label} · ${{ pending: '等待赴约', meeting: '已经碰面', fulfilled: '已一起度过这段时间', missed: '这次未能碰面，原因不作推断', cancelled: '安排已取消' }[a.status]}${a.notice ? ` · ${a.notice}` : ''}`;
}
export function cancelAppointments(life: DailyLife, ids: PartnerId[]) {
  for (const p of life.pastimes ?? [])
    if (
      ['ready', 'invited', 'active'].includes(p.phase) &&
      [p.host, p.target].some((id) => ids.includes(id))
    ) {
      p.phase = 'cancelled';
      p.updatedAt = life.minutes;
      p.reply = '相关人物设定已调整，原活动已收起，之后可重新商量。';
    }
  for (const a of life.appointments)
    if (liveAppointment(a) && [a.a, a.b].some((id) => ids.includes(id))) {
      a.status = 'cancelled';
      for (const id of [a.a, a.b])
        if (life.people[id].activity?.meeting === a.id)
          life.people[id].activity = null;
      const bond = life.bonds[bondKey(a.a, a.b, a.stage ?? life.waverStage)];
      if (bond) rememberCommitment(bond, a, life.minutes);
    }
}
/** Record only people actually sitting together, not everybody living in the house. */
export function rememberSharedMeal(life: DailyLife, event: LifeEvent) {
  const meal = event.meal;
  if (meal?.kind !== 'shared') return;
  for (let i = 0; i < meal.participants.length; i++)
    for (let j = i + 1; j < meal.participants.length; j++) {
      const bond = ensureBond(life, meal.participants[i], meal.participants[j]);
      rememberRealExperience(bond, event, 'shared-meal');
    }
}
export function reviseSocial(life: DailyLife, ids: PartnerId[]) {
  for (const b of Object.values(life.bonds))
    if (ids.includes(b.a) || ids.includes(b.b)) {
      b.warmth = [0, 0];
      b.tension = [0, 0];
      b.cutoff = life.nextId;
      b.changes = 0;
    }
  cancelAppointments(life, ids);
}
