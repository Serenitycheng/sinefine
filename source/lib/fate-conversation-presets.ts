import { type PartnerId } from './fate-cast';
import { lifeRoutine } from './fate-habits';
import type { DailyLife } from './fate-life';
import { DUTIES, dutyIds, isWorkday } from './fate-schedule';
import { activityPreference } from './fate-memory-behavior';
import { visibleMemories } from './fate-memory';
import { pastimeRecollection } from './fate-pastime-voices';
import {
  currentBond,
  liveAppointment,
  currentAppointment,
  MEETUPS,
  type MeetupKind,
  type SocialEffects,
} from './fate-social';

export type LifeTopic = 'care' | 'preference' | 'recall' | MeetupKind;
export const LIFE_TOPICS = [
  { id: 'care', label: '关心身体' },
  { id: 'preference', label: '问问喜欢做什么' },
  { id: 'recall', label: '聊聊上次一起做的事' },
  { id: 'walk', label: '约一小时后散步' },
  { id: 'read', label: '约一小时后看书' },
  { id: 'eat', label: '约一小时后吃饭' },
] as const;

/** Authored free dialogue uses the same evidence and appointment rules as AI. */
export function lifeTopic(
  life: DailyLife,
  speaker: PartnerId,
  target: PartnerId,
  topic: LifeTopic,
) {
  if (topic === 'recall') {
    const bond = currentBond(life, speaker, target);
    const latest = bond
      ? visibleMemories(bond).find(
          (m) =>
            m.kind === 'experience' &&
            !['care', 'friction'].includes(m.activity),
        )
      : undefined;
    const recollections = {
      eat: '记得。那次我们确实一起坐下来吃了饭，忙完手头的事，以后还可以再约。',
      'shared-meal':
        '记得。那次我们确实一起坐下来吃了饭，忙完手头的事，以后还可以再约。',
      repair: '记得。那次一起检修器具后，用起来顺手了一些。下次也一起看看吧。',
      walk: '记得。那次一起在街区散步。有空还可以再走走。',
      read: '记得。那次一起看了会儿书，以后有空还可以再约。',
    };
    return {
      message: '还记得我们上次一起做的事吗？',
      reply:
        latest?.kind === 'experience' && latest.activity in recollections
          ? ((latest.activity === 'repair' || latest.activity === 'eat'
              ? pastimeRecollection(
                  life,
                  speaker,
                  target,
                  latest.activity === 'repair' ? 'repair' : 'meal',
                  latest.minute,
                )
              : undefined) ??
            recollections[latest.activity as keyof typeof recollections])
          : '我们之后可以一起做点什么，等真正做过，再慢慢聊。',
      effects: { impressions: [] } as SocialEffects,
    };
  }
  if (topic === 'care') {
    const message = '忙起来也记得吃饭和休息，别勉强自己。';
    const replies: Partial<Record<PartnerId, string>> = {
      shirou: '嗯，知道了。我也会留时间休息，你也要照顾好自己。',
      rin: '知道了。我会照顾好自己，你也别总忘了休息。',
      kiritsugu: '……嗯。你也一样。',
      illya: '知道啦。你也要陪我好好吃饭，不许只提醒我哦。',
      gilgamesh: '本王的日程自会安排。你的提醒，听到了。',
      kuzuki: '明白。按时用餐和休息，不应省略。',
      cu: '放心，饿了就吃，累了就歇。你也别绷得太紧。',
      taiga: '收到！你也是，忙起来也要好好吃饭呀。',
    };
    const reply = replies[target] ?? '谢谢你惦记。我会把吃饭和休息也安排好。';
    const effects: SocialEffects = {
      impressions: [{ person: target, kind: 'care', turn: 0, quote: message }],
    };
    return { message, reply, effects };
  }
  if (topic === 'preference') {
    const routine = lifeRoutine(target, life.waverStage);
    const subjects = {
      walk: '散步',
      read: '阅读',
      shop: '逛小店',
      study: '整理笔记',
      cook: '料理',
      repair: '修理日常器具',
    };
    const choices = (Object.keys(subjects) as (keyof typeof subjects)[])
      .map((action) => ({
        action,
        memory: activityPreference(life, target, action),
      }))
      .filter(({ memory }) => memory?.preference !== 'dislike')
      .sort(
        (a, b) =>
          (b.memory?.eventId ?? -1) - (a.memory?.eventId ?? -1) ||
          routine.weights[b.action] - routine.weights[a.action],
      );
    const choice = choices[0];
    if (!choice)
      return {
        message: '有空的时候，你更喜欢做什么？',
        reply: '现在没有特别想做的事，等有兴致再告诉你。',
        effects: { impressions: [] } as SocialEffects,
      };
    const subject = choice.memory?.subject ?? subjects[choice.action];
    const reply = `我喜欢${subject}。`;
    return {
      message: '有空的时候，你更喜欢做什么？',
      reply,
      effects: {
        impressions: [],
        preferences: [
          {
            person: target,
            kind: 'like' as const,
            subject,
            turn: 1,
            quote: reply,
          },
        ],
      },
    };
  }
  const meetup = MEETUPS[topic];
  const message = `一小时后一起在${meetup.place}${meetup.label}，好吗？`;
  const start = life.minutes + 60;
  const time = start % 1440;
  const busy = life.appointments.some(
    (a) =>
      currentAppointment(life, a) &&
      liveAppointment(a) &&
      [a.a, a.b].some((id) => id === speaker || id === target),
  );
  const duty = [speaker, target].some(
    (id) =>
      isWorkday(start) &&
      dutyIds(id, life.waverStage).some(
        (key) => time < DUTIES[key].end && time + 30 > DUTIES[key].depart,
      ),
  );
  let reply: string;
  if (busy) reply = '不了，已经有约好的安排了。先把之前答应的事情做好吧。';
  else if (time < 360 || time >= 1320)
    reply = '不了，那时该休息了。留到白天再说吧。';
  else if (duty) reply = '不了，那时还有课业安排，今天先不约这一场。';
  else if (life.people[target].hunger >= 85 || life.people[target].energy <= 10)
    reply = '不了，我现在需要先吃饭和休息。等照顾好自己再说吧。';
  else if (activityPreference(life, target, topic)?.preference === 'dislike')
    reply = `不了，我不太喜欢${meetup.label}。下次可以再商量别的活动。`;
  else
    reply =
      target === 'kiritsugu' || target === 'kuzuki'
        ? '好，一小时后见。'
        : target === 'rin'
          ? '好，约好了。你可要记得时间。'
          : target === 'illya'
            ? '好，约好了！我会准时来哦。'
            : '好，约好了。我会把手边的事安排好。';
  return { message, reply, effects: { impressions: [] } };
}
