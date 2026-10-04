import { isPartner, STREET_PARTNERS, type PartnerId } from './fate-cast';
import {
  bondKey,
  ConflictingMeetupError,
  MEETUPS,
  parseSocialEffects,
  type Appointment,
  type Bond,
  type BondMemory,
} from './fate-social';
import type { DialogueTurn } from './fate-dialogue';
import { parsePersonalMemories } from './fate-memory';
const number = (x: unknown, max = 1e9) =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;
const int = (x: unknown, max = 1e9) =>
  number(x, max) && Number.isSafeInteger(x);
function members(a: unknown, b: unknown, stage: unknown) {
  return (
    isPartner(a) &&
    isPartner(b) &&
    a !== b &&
    (a === 'waver' || b === 'waver'
      ? ['young', 'adult'].includes(String(stage))
      : stage === null)
  );
}
function quotes(
  value: unknown,
  a: PartnerId,
  b: PartnerId,
  max: number,
): DialogueTurn[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error('记忆引文无效');
  return value.map((q) => {
    if (
      !q ||
      ![a, b].includes(q.speaker) ||
      typeof q.text !== 'string' ||
      !q.text.trim() ||
      q.text.length > 120
    )
      throw new Error('记忆引文无效');
    return { speaker: q.speaker, text: q.text };
  });
}
export function parseBonds(
  value: unknown,
  minutes: number,
  nextId: number,
): Record<string, Bond> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length >
      (STREET_PARTNERS.length * (STREET_PARTNERS.length - 1)) / 2 +
        STREET_PARTNERS.length -
        1
  )
    throw new Error('相处记录无效');
  const result: Record<string, Bond> = {};
  for (const [key, data] of Object.entries(value)) {
    const b = data as Bond;
    if (
      !b ||
      !members(b.a, b.b, b.stage) ||
      b.a >= b.b ||
      key !== bondKey(b.a, b.b, b.stage ?? 'young') ||
      !Array.isArray(b.warmth) ||
      b.warmth.length !== 2 ||
      !b.warmth.every((n) => Number.isFinite(n) && n >= -6 && n <= 6) ||
      !Array.isArray(b.tension) ||
      b.tension.length !== 2 ||
      !b.tension.every((n) => number(n, 6)) ||
      !int(b.familiarity, 12) ||
      !Number.isSafeInteger(b.day) ||
      b.day < -1 ||
      b.day > Math.floor(minutes / 1440) ||
      !int(b.changes, 2) ||
      !int(b.seen, nextId - 1) ||
      !int(b.cutoff, nextId) ||
      !Array.isArray(b.memories) ||
      b.memories.length > 6
    )
      throw new Error('相处记录无效');
    let previous = 0;
    const memories = b.memories.map((m): BondMemory => {
      if (
        !m ||
        !int(m.id, nextId - 1) ||
        m.id <= previous ||
        m.id > b.seen ||
        !number(m.minute, minutes) ||
        !['preset', 'deepseek', 'life'].includes(m.source) ||
        !['conversation', 'fulfilled', 'missed'].includes(m.kind) ||
        typeof m.text !== 'string' ||
        m.text.length > 300 ||
        !Array.isArray(m.impressions) ||
        m.impressions.length > 2
      )
        throw new Error('共同记忆无效');
      previous = m.id;
      const q = quotes(m.quotes, b.a, b.b, 4),
        seen = new Set<PartnerId>();
      const impressions = m.impressions.map((i) => {
        if (
          !i ||
          ![b.a, b.b].includes(i.person) ||
          seen.has(i.person) ||
          !['care', 'friction'].includes(i.kind) ||
          typeof i.quote !== 'string' ||
          i.quote.length < 2 ||
          i.quote.length > 120 ||
          !q.some((t) => t.speaker !== i.person && t.text.includes(i.quote))
        )
          throw new Error('记忆印象无效');
        seen.add(i.person);
        return { person: i.person, kind: i.kind, quote: i.quote };
      });
      return {
        id: m.id,
        minute: m.minute,
        source: m.source,
        kind: m.kind,
        text: m.text,
        quotes: q,
        impressions,
      };
    });
    result[key] = {
      a: b.a,
      b: b.b,
      stage: b.stage,
      warmth: [...b.warmth],
      tension: [...b.tension],
      familiarity: b.familiarity,
      day: b.day,
      changes: b.changes,
      seen: b.seen,
      cutoff: b.cutoff,
      memories,
      ...(b.archive === undefined
        ? {}
        : {
            archive: parsePersonalMemories(
              b.archive,
              b.a,
              b.b,
              minutes,
              nextId,
            ),
          }),
    };
  }
  return result;
}
export function parseAppointments(
  value: unknown,
  minutes: number,
  nextId: number,
  onLegacyCancelled?: (id: number) => void,
): Appointment[] {
  if (!Array.isArray(value) || value.length > 20)
    throw new Error('约定记录无效');
  const seen = new Set<number>(),
    busy = new Set<PartnerId>();
  return value.map((a: Appointment) => {
    if (
      !a ||
      !int(a.id, nextId - 1) ||
      a.id < 1 ||
      seen.has(a.id) ||
      !members(a.a, a.b, a.stage) ||
      !Object.hasOwn(MEETUPS, a.activity) ||
      !number(a.createdAt, minutes) ||
      !number(a.start, minutes + 180) ||
      a.start % 1440 < 360 ||
      a.start % 1440 >= 1320 ||
      !number(a.until, minutes + 240) ||
      Math.abs(a.until - a.start - 60) > 1e-6 ||
      !number(a.shared, 10) ||
      typeof a.talked !== 'boolean' ||
      !['pending', 'meeting', 'fulfilled', 'missed', 'cancelled'].includes(
        a.status,
      ) ||
      (a.status === 'fulfilled' && a.shared < 10) ||
      (a.attending !== undefined && ![a.a, a.b].includes(a.attending)) ||
      (a.notice !== undefined &&
        (typeof a.notice !== 'string' ||
          !a.notice.trim() ||
          a.notice.length > 200))
    )
      throw new Error('约定记录无效');
    seen.add(a.id);
    const q = quotes(a.quotes, a.a, a.b, 2);
    const delay = [60, 120, 180].find(
      (d) => Math.abs(a.start - a.createdAt - d) < 1e-6,
    ) as 60 | 120 | 180 | undefined;
    if (q.length !== 2 || !delay) throw new Error('约定依据无效');
    if (a.status === 'pending' || a.status === 'meeting') {
      if (busy.has(a.a) || busy.has(a.b)) throw new Error('约定时间冲突');
      busy.add(a.a);
      busy.add(a.b);
    }
    let status = a.status;
    try {
      parseSocialEffects(
        {
          impressions: [],
          promise: {
            activity: a.activity,
            delay,
            proposal: 0,
            acceptance: 1,
            proposalQuote: q[0].text,
            acceptanceQuote: q[1].text,
          },
        },
        q,
      );
    } catch (error) {
      // Older versions accepted a counterproposal as agreement. Keep its quotes
      // and completed history, but stop a still-live plan from moving residents.
      // All other malformed evidence must continue to reject the save.
      if (!(error instanceof ConflictingMeetupError)) throw error;
      if (status === 'pending' || status === 'meeting') {
        status = 'cancelled';
        onLegacyCancelled?.(a.id);
      }
    }
    return {
      id: a.id,
      a: a.a,
      b: a.b,
      stage: a.stage,
      activity: a.activity,
      createdAt: a.createdAt,
      start: a.start,
      until: a.until,
      shared: a.shared,
      talked: a.talked,
      status,
      ...(a.attending === undefined ? {} : { attending: a.attending }),
      ...(a.notice === undefined ? {} : { notice: a.notice }),
      quotes: q,
    };
  });
}
