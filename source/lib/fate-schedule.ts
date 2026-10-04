import { DISTRICT_PLACES } from './fate-district';
import {
  fatePerson,
  isPartner,
  STREET_PARTNERS,
  type PartnerId,
  type WaverStage,
} from './fate-cast';
import { FATE_HOMES, homeOf } from './fate-housing';
import { pathTo, stepActor, type Actor, type Point } from './street';
import type { DailyLife } from './fate-life';

export const SCHOOL_GATE = DISTRICT_PLACES.school;
export const DUTIES = {
  'student-am': {
    label: '上午上课',
    depart: 480,
    start: 510,
    end: 720,
    school: true,
    returnHome: false,
  },
  'student-pm': {
    label: '下午上课',
    depart: 770,
    start: 780,
    end: 930,
    school: true,
    returnHome: true,
  },
  'teacher-am': {
    label: '上午授课',
    depart: 450,
    start: 480,
    end: 720,
    school: true,
    returnHome: false,
  },
  'teacher-pm': {
    label: '下午授课与整理讲义',
    depart: 760,
    start: 780,
    end: 960,
    school: true,
    returnHome: true,
  },
  'waver-study': {
    label: '自主研习',
    depart: 540,
    start: 540,
    end: 690,
    school: false,
    returnHome: false,
  },
  'waver-prep-am': {
    label: '备课与核对资料',
    depart: 540,
    start: 540,
    end: 690,
    school: false,
    returnHome: false,
  },
  'waver-prep-pm': {
    label: '整理教学讲义',
    depart: 840,
    start: 840,
    end: 960,
    school: false,
    returnHome: false,
  },
} as const;
export type DutyId = keyof typeof DUTIES;
export type AgendaEntry = {
  id: string;
  day: number;
  person: PartnerId;
  duty: DutyId;
  attended: number;
  status: 'pending' | 'active' | 'paused' | 'finished' | 'missed';
  returned: boolean;
};
export type ScheduleEvent = {
  person: PartnerId;
  duty: DutyId;
  kind:
    | 'departure'
    | 'arrival'
    | 'paused'
    | 'finished'
    | 'missed'
    | 'returning'
    | 'returned';
};
type ScheduleLog = (text: string, event: ScheduleEvent) => void;
export const isDuty = (value: unknown): value is DutyId =>
  typeof value === 'string' && Object.hasOwn(DUTIES, value);
export function dutyIds(id: PartnerId, stage: WaverStage): DutyId[] {
  if (['shirou', 'rin', 'sakura'].includes(id))
    return ['student-am', 'student-pm'];
  if (['taiga', 'kuzuki'].includes(id)) return ['teacher-am', 'teacher-pm'];
  if (id === 'waver')
    return stage === 'adult'
      ? ['waver-prep-am', 'waver-prep-pm']
      : ['waver-study'];
  return [];
}
export const weekdayName = (minutes: number) =>
  ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][
    Math.floor(minutes / 1440) % 7
  ];
export const isWorkday = (minutes: number) =>
  Math.floor(minutes / 1440) % 7 < 5;
export function dueDuty(life: DailyLife, id: PartnerId) {
  if (!isWorkday(life.minutes)) return undefined;
  const day = Math.floor(life.minutes / 1440),
    time = life.minutes % 1440;
  return dutyIds(id, life.waverStage).find(
    (key) =>
      time >= DUTIES[key].depart &&
      time < DUTIES[key].end &&
      !life.agenda.some(
        (a) =>
          a.person === id &&
          a.day === day &&
          a.duty === key &&
          ['finished', 'missed'].includes(a.status),
      ),
  );
}
export function routineDestination(
  life: DailyLife,
  id: PartnerId,
  entry: AgendaEntry,
  returning = false,
): Point {
  const point =
    !returning && DUTIES[entry.duty].school
      ? SCHOOL_GATE
      : FATE_HOMES[homeOf(id, life.housing)];
  return {
    x: point.x + ((STREET_PARTNERS.indexOf(id) % 3) - 1) * 18,
    y: point.y + (STREET_PARTNERS.indexOf(id) % 2) * 12,
  };
}
function reason(id: PartnerId, stage: WaverStage) {
  return (
    {
      shirou:
        '先把今天的课程上好。帮助别人也要安排时间，不能总把自己的事放到最后。',
      rin: '课业也有自己的安排。先完成学校的事，其他计划留到之后。',
      sakura: '先按自己的步调去上课。除了照顾别人，今天也有属于自己的安排。',
      taiga: '学生们还等着上课呢！先把今天的课程带好，休息时再聊别的。',
      kuzuki: '按课程安排授课。手头的工作，应当按次序完成。',
      waver:
        stage === 'adult'
          ? '核对论证，整理能让学生听明白的讲义。不能把含糊的结论交给学生。'
          : '先把不明白的地方查清楚。想证明自己，就得认真做自己的功课。',
    } as Partial<Record<PartnerId, string>>
  )[id]!;
}
export function prepareAgenda(life: DailyLife, log: ScheduleLog) {
  const day = Math.floor(life.minutes / 1440);
  life.agenda = life.agenda.filter(
    (a) => a.day === day || life.people[a.person].activity?.routine === a.id,
  );
  for (const id of STREET_PARTNERS) {
    const duty = dueDuty(life, id);
    if (
      duty &&
      !life.agenda.some(
        (a) => a.person === id && a.day === day && a.duty === duty,
      )
    )
      life.agenda.push({
        id: `${day}:${id}:${duty}`,
        day,
        person: id,
        duty,
        attended: 0,
        status: 'pending',
        returned: false,
      });
  }
  for (const entry of life.agenda) {
    const p = life.people[entry.person],
      def = DUTIES[entry.duty];
    if (
      life.minutes >= entry.day * 1440 + def.end &&
      !['finished', 'missed'].includes(entry.status)
    ) {
      entry.status = entry.attended > 0 ? 'finished' : 'missed';
      if (p.activity?.routine === entry.id && !p.activity.returning)
        p.activity = null;
      log(
        entry.attended > 0
          ? `${fatePerson(entry.person, life.waverStage)!.name}结束了${def.label}，实际参与约${Math.floor(entry.attended)}分钟。`
          : `${fatePerson(entry.person, life.waverStage)!.name}今天错过了这段${def.label}。`,
        {
          person: entry.person,
          duty: entry.duty,
          kind: entry.attended > 0 ? 'finished' : 'missed',
        },
      );
    } else if (entry.status === 'active' && p.activity?.routine !== entry.id) {
      entry.status = 'paused';
      log(
        `${fatePerson(entry.person, life.waverStage)!.name}暂时中断了${def.label}。`,
        { person: entry.person, duty: entry.duty, kind: 'paused' },
      );
    }
  }
}
export function advanceSchedule(
  life: DailyLife,
  actor: Actor,
  elapsed: number,
  seconds: number,
  speed: number,
  log: ScheduleLog,
) {
  const id = actor.id;
  if (!isPartner(id)) return false;
  const person = life.people[id],
    day = Math.floor(life.minutes / 1440),
    time = life.minutes % 1440;
  const due = dueDuty(life, id);
  let entry = person.activity?.routine
    ? life.agenda.find((a) => a.id === person.activity!.routine)
    : undefined;
  if (!person.activity && person.hunger < 55 && person.energy >= 35) {
    if (due)
      entry = life.agenda.find(
        (a) => a.day === day && a.person === id && a.duty === due,
      );
    if (!entry)
      entry = life.agenda.find(
        (a) =>
          a.person === id &&
          a.day === day &&
          a.attended > 0 &&
          a.status === 'finished' &&
          DUTIES[a.duty].returnHome &&
          !a.returned &&
          time < 1320,
      );
    if (entry) {
      const returning = entry.status === 'finished';
      person.activity = {
        kind: returning ? 'rest' : 'study',
        phase: 'going',
        routine: entry.id,
        returning,
        ...(returning || !DUTIES[entry.duty].school
          ? { home: homeOf(id, life.housing) }
          : { school: true }),
        remaining: returning
          ? 30
          : Math.max(
              0,
              entry.day * 1440 + DUTIES[entry.duty].end - life.minutes,
            ),
        source: 'rules',
        reason: returning
          ? '今天的安排结束，先回家放好东西，歇一会儿。'
          : reason(id, life.waverStage),
      };
      if (!returning) entry.status = 'active';
      person.choices++;
      actor.path = pathTo(
        actor,
        routineDestination(life, id, entry, returning),
      );
      log(
        `${fatePerson(id, life.waverStage)!.name}${returning ? '结束外出安排，准备回家' : `动身去${DUTIES[entry.duty].school ? '穗群原学园' : '自己的住处'}，准备${DUTIES[entry.duty].label}`}。`,
        {
          person: id,
          duty: entry.duty,
          kind: returning ? 'returning' : 'departure',
        },
      );
    }
  }
  const action = person.activity;
  if (!action?.routine || !entry) return false;
  if (!action.returning && (person.hunger >= 78 || person.energy < 20)) {
    entry.status = 'paused';
    person.activity = null;
    actor.path = [];
    log(
      `${fatePerson(id, life.waverStage)!.name}因${person.hunger >= 78 ? '太饿' : '疲惫'}暂停${DUTIES[entry.duty].label}，先照顾身体。`,
      { person: id, duty: entry.duty, kind: 'paused' },
    );
    return false;
  }
  const point = routineDestination(life, id, entry, action.returning);
  if (Math.hypot(actor.x - point.x, actor.y - point.y) >= 2) {
    action.phase = 'going';
    if (!actor.path.length) actor.path = pathTo(actor, point);
    stepActor(actor, seconds, undefined, 55 * speed);
    return true;
  }
  actor.frame = 0;
  actor.path = [];
  if (action.returning) {
    entry.returned = true;
    person.activity = {
      kind: 'rest',
      home: homeOf(id, life.housing),
      phase: 'doing',
      remaining: 30,
      source: 'rules',
      reason: '已经到家，先放好东西，休息一下。',
    };
    log(
      `${fatePerson(id, life.waverStage)!.name}回到了${FATE_HOMES[homeOf(id, life.housing)].name}，放下东西休息。`,
      { person: id, duty: entry.duty, kind: 'returned' },
    );
    return true;
  }
  if (action.phase === 'going') {
    action.phase = 'doing';
    const late = Math.floor(
      Math.max(0, life.minutes - entry.day * 1440 - DUTIES[entry.duty].start),
    );
    log(
      `${fatePerson(id, life.waverStage)!.name}到了${DUTIES[entry.duty].school ? '穗群原学园' : '住处'}，${late > 0 ? `比原定时间晚约${late}分钟，` : ''}准备${DUTIES[entry.duty].label}。`,
      { person: id, duty: entry.duty, kind: 'arrival' },
    );
  }
  if (time >= DUTIES[entry.duty].start)
    entry.attended += Math.min(
      elapsed,
      Math.max(0, life.minutes - entry.day * 1440 - DUTIES[entry.duty].start),
    );
  action.remaining = Math.max(
    0,
    entry.day * 1440 + DUTIES[entry.duty].end - life.minutes,
  );
  return true;
}
export function agendaSummary(life: DailyLife, id: PartnerId) {
  const keys = dutyIds(id, life.waverStage);
  if (!keys.length) return '按个人习惯安排今天';
  if (!isWorkday(life.minutes)) return '休息日 · 今天没有固定课业安排';
  const action = life.people[id].activity,
    entry = life.agenda.find((a) => a.id === action?.routine);
  if (entry)
    return action?.returning
      ? '外出安排结束，正在回家'
      : `${DUTIES[entry.duty].label} · ${action?.phase === 'going' ? '途中' : '已到场'}`;
  const time = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return keys
    .map(
      (key) =>
        `${time(DUTIES[key].start)}–${time(DUTIES[key].end)} ${DUTIES[key].label}`,
    )
    .join('；');
}
export function parseScheduleEvent(value: unknown): ScheduleEvent {
  const e = value as ScheduleEvent;
  if (
    !e ||
    !isPartner(e.person) ||
    !isDuty(e.duty) ||
    ![
      'departure',
      'arrival',
      'paused',
      'finished',
      'missed',
      'returning',
      'returned',
    ].includes(e.kind)
  )
    throw new Error('作息经历无效');
  return { person: e.person, duty: e.duty, kind: e.kind };
}
export function parseAgenda(value: unknown, minutes: number): AgendaEntry[] {
  if (!Array.isArray(value) || value.length > 30)
    throw new Error('作息记录无效');
  const seen = new Set<string>();
  return value.map((e: AgendaEntry) => {
    if (
      !e ||
      !isPartner(e.person) ||
      !isDuty(e.duty) ||
      !Number.isSafeInteger(e.day) ||
      e.day < 0 ||
      e.day > Math.floor(minutes / 1440) ||
      e.id !== `${e.day}:${e.person}:${e.duty}` ||
      seen.has(e.id) ||
      !Number.isFinite(e.attended) ||
      e.attended < 0 ||
      e.attended > DUTIES[e.duty].end - DUTIES[e.duty].start + 1 ||
      !['pending', 'active', 'paused', 'finished', 'missed'].includes(
        e.status,
      ) ||
      typeof e.returned !== 'boolean' ||
      ![...dutyIds(e.person, 'young'), ...dutyIds(e.person, 'adult')].includes(
        e.duty,
      )
    )
      throw new Error('作息记录无效');
    seen.add(e.id);
    return {
      id: e.id,
      person: e.person,
      day: e.day,
      duty: e.duty,
      attended: e.attended,
      status: e.status,
      returned: e.returned,
    };
  });
}
