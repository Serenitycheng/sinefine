import { isPartner, fatePerson, type PartnerId } from './fate-cast';
import {
  lifeStatus,
  parseDailyLife,
  type DailyLife,
  type LifePerson,
} from './fate-life';
import { lifeTopic } from './fate-conversation-presets';
import { activeMeal, type HomeMeal } from './fate-meals';
import { dueDuty } from './fate-schedule';
import { dueAppointment } from './fate-meetups';
import { activityPreference } from './fate-memory-behavior';
import {
  EMIYA_ROOMS,
  EMIYA_ACTIVITIES,
  type EmiyaActivity,
} from './fate-emiya-house';
import { interiorWalkable } from './fate-city-interior-navigation';

export type EmiyaTopic =
  | 'greet'
  | 'today'
  | 'scene'
  | 'care'
  | 'preference'
  | 'recall';
export const EMIYA_TOPICS = [
  { id: 'today', label: '问问今天的安排' },
  { id: 'scene', label: '聊聊眼前的事' },
  { id: 'care', label: '关心吃饭和休息' },
  { id: 'preference', label: '问问喜欢做什么' },
  { id: 'recall', label: '聊聊上次一起做的事' },
] as const;
export const EMIYA_HOUSEHOLD_ACTIVITIES: readonly EmiyaActivity[] = [
  {
    id: 'set-table',
    label: '摆好碗筷',
    room: 'table',
    zone: 'table',
    piece: 'kitchen-table',
    point: { x: 695, y: 455 },
    kind: 'cook',
    seconds: 4,
    progress: '正在摆碗筷，把每个人的位置留好…',
    complete: '碗筷摆好了。',
  },
  {
    id: 'clear-table',
    label: '收拾餐桌',
    room: 'table',
    zone: 'table',
    piece: 'kitchen-table',
    point: { x: 695, y: 455 },
    kind: 'cook',
    seconds: 5,
    progress: '正在收碗、擦桌并把碗筷放好…',
    complete: '碗筷收好，餐桌也擦干净了。',
  },
];
export const EMIYA_LIFE_ACTIVITIES = [
  ...EMIYA_ACTIVITIES,
  ...EMIYA_HOUSEHOLD_ACTIVITIES,
];
export type EmiyaInvitation = {
  key: string;
  person: PartnerId;
  minute: number;
  updated: number;
  status: 'walking' | 'seated' | 'deferred' | 'declined' | 'cancelled' | 'done';
  reply: string;
  previous?: LifePerson['activity'];
};
export type EmiyaNotice = {
  key: string;
  person: PartnerId;
  minute: number;
  text: string;
};
export type EmiyaHouseholdSave = {
  table: { key: string | null; set: boolean; dirty: boolean };
  invitations: EmiyaInvitation[];
  notices: EmiyaNotice[];
  help: {
    activity: 'set-table' | 'clear-table';
    person: PartnerId;
    key: string;
    point: { x: number; y: number };
    previous: LifePerson['activity'];
  } | null;
  failed: 'set-table' | 'clear-table' | null;
};
export const emiyaMealKey = (meal: HomeMeal) => `${meal.id}@${meal.startedAt}`;
export const emptyEmiyaHousehold = (): EmiyaHouseholdSave => ({
  table: { key: null, set: false, dirty: false },
  invitations: [],
  notices: [],
  help: null,
  failed: null,
});

export function parseEmiyaHousehold(
  value: unknown,
  life: DailyLife,
): EmiyaHouseholdSave {
  if (value === undefined) return emptyEmiyaHousehold();
  const data = value as EmiyaHouseholdSave;
  const key = (v: unknown): v is string =>
    typeof v === 'string' && v.length > 0 && v.length <= 150;
  const minute = (v: unknown): v is number =>
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v >= 0 &&
    v <= life.minutes + 1e-6;
  if (
    !data ||
    !data.table ||
    (data.table.key !== null && !key(data.table.key)) ||
    typeof data.table.set !== 'boolean' ||
    typeof data.table.dirty !== 'boolean' ||
    !Array.isArray(data.invitations) ||
    data.invitations.length > 32 ||
    !Array.isArray(data.notices) ||
    data.notices.length > 32
  )
    throw new Error('家庭互动记录无效，原记录已保留。');
  if (
    data.failed !== undefined &&
    data.failed !== null &&
    !['set-table', 'clear-table'].includes(data.failed)
  )
    throw new Error('共同家务记录无效，原记录已保留。');
  const seen = new Set<string>();
  for (const invite of data.invitations) {
    if (
      !invite ||
      !key(invite.key) ||
      !isPartner(invite.person) ||
      invite.person === 'shirou' ||
      !minute(invite.minute) ||
      !minute(invite.updated) ||
      invite.updated < invite.minute ||
      ![
        'walking',
        'seated',
        'deferred',
        'declined',
        'cancelled',
        'done',
      ].includes(invite.status) ||
      typeof invite.reply !== 'string' ||
      invite.reply.length > 300 ||
      seen.has(`${invite.key}:${invite.person}`)
    )
      throw new Error('家庭邀请记录无效，原记录已保留。');
    seen.add(`${invite.key}:${invite.person}`);
    if (invite.status === 'walking' && invite.previous !== undefined) {
      const checked = structuredClone(life);
      checked.people[invite.person].activity = invite.previous;
      parseDailyLife(checked);
    }
  }
  seen.clear();
  for (const notice of data.notices) {
    if (
      !notice ||
      !key(notice.key) ||
      !isPartner(notice.person) ||
      notice.person === 'shirou' ||
      !minute(notice.minute) ||
      typeof notice.text !== 'string' ||
      !notice.text.trim() ||
      notice.text.length > 300 ||
      seen.has(notice.key)
    )
      throw new Error('家人提醒记录无效，原记录已保留。');
    seen.add(notice.key);
  }
  if (data.help !== null) {
    const help = data.help;
    if (
      !help ||
      !['set-table', 'clear-table'].includes(help.activity) ||
      !isPartner(help.person) ||
      help.person === 'shirou' ||
      !key(help.key) ||
      !help.point ||
      !interiorWalkable(help.point, EMIYA_ROOMS.table.scene)
    )
      throw new Error('共同家务记录无效，原记录已保留。');
    const checked = structuredClone(life);
    checked.people[help.person].activity = help.previous;
    parseDailyLife(checked);
  }
  const result = { ...structuredClone(data), failed: data.failed ?? null };
  for (const invite of result.invitations)
    if (invite.status !== 'walking') delete invite.previous;
  return result;
}

export function emiyaInvitationDecision(life: DailyLife, id: PartnerId) {
  const person = life.people[id],
    activity = person.activity;
  if (
    dueDuty(life, id) ||
    dueAppointment(life, id) ||
    activity?.school ||
    activity?.routine ||
    activity?.kind === 'sleep' ||
    activity?.kind === 'cook' ||
    person.hunger >= 85
  )
    return {
      status: 'deferred' as const,
      reply: '现在手边还有安排，先给我留一份；忙完以后再来。',
    };
  if (
    person.energy <= 10 ||
    activityPreference(life, id, 'eat')?.preference === 'dislike'
  )
    return {
      status: 'declined' as const,
      reply:
        person.energy <= 10
          ? '今天先不坐下来吃了，我得先休息。谢谢你给我留饭。'
          : '这次我先不一起吃，之后再安排吧。',
    };
  return {
    status: 'walking' as const,
    reply:
      id === 'saber'
        ? '好，士郎。我把手边的事收好，就到餐桌来。'
        : id === 'illya'
          ? '好呀！碗筷给我留一份，我这就过去。'
          : '好，我把手边的事收好，过去吃饭。',
  };
}

export function emiyaContextDialogue(
  life: DailyLife,
  id: PartnerId,
  topic: Exclude<EmiyaTopic, 'greet'>,
) {
  if (topic === 'care' || topic === 'preference' || topic === 'recall')
    return lifeTopic(life, 'shirou', id, topic);
  if (topic === 'today')
    return {
      message: '今天接下来怎么安排？',
      reply: `我现在${lifeStatus(life.people[id])}。${life.people[id].energy < 30 ? '做完先休息一会儿。' : life.people[id].hunger >= 65 ? '之后想先好好吃一餐。' : '先把手边这件事做好，再看接下来的安排。'}`,
    };
  const kind = life.people[id].activity?.kind;
  const meal = life.meals.find(
    (m) => m.home === 'emiya' && activeMeal(life, m.id)?.phase === 'ready',
  );
  return kind === 'eat'
    ? {
        message: '今天的饭吃得还好吗？',
        reply:
          id === 'saber'
            ? '很好，士郎。坐下来慢慢吃，你也别只顾着照料别人。'
            : '能坐下来好好吃一餐，很舒服。你也一起吃吧。',
      }
    : kind === 'study' || kind === 'read'
      ? {
          message: '手边的书和笔记看到哪里了？',
          reply: '还有一小段想看完。等收好以后，就能歇一会儿。',
        }
      : meal
        ? {
            message: '饭菜已经摆到小餐桌了。',
            reply: '闻到香气了。等我收好手边的事，你可以来叫我。',
          }
        : {
            message: '在家里歇一会儿还舒服吗？',
            reply: '嗯，能留一点安静的时间很好。你也坐一会儿吧。',
          };
}

export const emiyaPersonName = (life: DailyLife, id: PartnerId) =>
  fatePerson(id, life.waverStage)!.name;
