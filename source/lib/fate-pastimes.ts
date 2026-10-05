import {
  fatePerson,
  isPartner,
  type PartnerId,
  type WaverStage,
} from './fate-cast';
import { lifeIndoors, type DailyLife, type LifeEvent } from './fate-life';
import { DISTRICT_PLACES } from './fate-district';
import { pathTo, type Actor } from './street';
import { deviceName, SUPPLIES } from './fate-belongings';
import { purchaseSupply } from './fate-economy';
import {
  interactionStatus,
  recordOnsiteConversation,
} from './fate-interaction';
import { lifeTopic } from './fate-conversation-presets';
import {
  currentAppointment,
  liveAppointment,
  rememberSharedWalk,
} from './fate-social';
import { playerAppointment } from './fate-meetups';
import { meetupDestination } from './fate-meetups';
import { spendPlayerTime } from './fate-player-time';
import { pastimeVoice } from './fate-pastime-voices';
import { dueDuty } from './fate-schedule';
import { knownPreferences } from './fate-memory-behavior';

export type Pastime = {
  id: number;
  host: PartnerId;
  target: PartnerId;
  stage: WaverStage | null;
  kind: 'meal' | 'repair';
  choice: 'simple' | 'vegetable' | 'inspect' | 'replace';
  phase: 'ready' | 'invited' | 'active' | 'done' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  progress: number;
  appointment?: number;
  work?: {
    stage: 'diagnose' | 'adjust' | 'test';
    approach?: 'listen' | 'look';
  };
  reply: string;
};
export type PastimeCommand =
  | 'go-cafe'
  | 'go-shops'
  | 'go-target'
  | 'buy-parts'
  | 'buy-groceries'
  | 'prepare-simple'
  | 'prepare-vegetable'
  | 'invite'
  | 'repair-inspect'
  | 'repair-replace'
  | 'repair-listen'
  | 'repair-look'
  | 'repair-adjust'
  | 'repair-test'
  | 'wait-meal'
  | 'cancel';
export const currentPastime = (life: DailyLife, p: Pastime) =>
  p.stage === null || p.stage === life.waverStage;
export const livePastime = (p: Pastime) =>
  !['done', 'cancelled'].includes(p.phase);
const names = (life: DailyLife, id: PartnerId) =>
  fatePerson(id, life.waverStage)!.name;
function log(life: DailyLife, text: string): LifeEvent {
  const e = {
    id: life.nextId++,
    minute: life.minutes,
    text,
    waverStage: life.waverStage,
  };
  life.events = [...life.events, e].slice(-80);
  return e;
}
const no = (message: string) => ({ ok: false, message });
const ok = (message: string) => ({ ok: true, message });
function close(life: DailyLife, p: Pastime, message: string) {
  p.phase = 'cancelled';
  p.reply = message;
  p.updatedAt = life.minutes;
  log(life, `${names(life, p.host)}与${names(life, p.target)}：${message}`);
}
export function pastimeSummary(life: DailyLife, p: Pastime) {
  const title =
    p.kind === 'meal' ? '一起吃饭' : `帮忙检修${deviceName(p.target)}`;
  const phase = {
    ready: '已准备，等你邀请',
    invited: '已约好，等待到场',
    active: '一起动手中',
    done: '已完成',
    cancelled: '已结束',
  }[p.phase];
  return `${title} · ${names(life, p.target)} · ${phase}`;
}
export function actOnPastime(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
  command: PastimeCommand,
  target: PartnerId,
) {
  if (!isPartner(controlled))
    return no('先进入一位居民，再选择想一起做事的人。');
  if (!isPartner(target) || target === controlled)
    return no('请选择另一位居民。');
  const actor = actors.find((p) => p.id === controlled),
    other = actors.find((p) => p.id === target);
  if (!actor || !other) return no('人物还没有进入街区。');
  const current = (life.pastimes ?? []).find(
    (p) => p.host === controlled && currentPastime(life, p) && livePastime(p),
  );
  if (command === 'cancel') {
    if (!current) return no('目前没有待处理的活动。');
    if (current.appointment !== undefined)
      playerAppointment(
        life,
        actors,
        controlled,
        current.appointment,
        'cancel',
      );
    close(life, current, '这次先放下，之后再做安排；已用掉的材料不会返还。');
    return ok(current.reply);
  }
  if (life.indoor?.actor === controlled)
    return no('请先回到街道，再准备这项活动。');
  if (command === 'wait-meal') {
    if (!current || current.kind !== 'meal' || current.phase !== 'invited')
      return no('先邀请对方并确认约定，才能在店里等。');
    const a = life.appointments.find((a) => a.id === current.appointment);
    if (!a || !liveAppointment(a)) return no('这次约定已经结束。');
    const seat = meetupDestination(a, controlled);
    if (
      a.attending !== controlled ||
      Math.hypot(actor.x - seat.x, actor.y - seat.y) >= 42 ||
      actor.path.length
    )
      return no('先点「前往赴约」，实际走到咖啡店的约定位置再等。');
    const minutes =
      a.status === 'meeting'
        ? 10 - a.shared
        : life.minutes < a.start
          ? a.start - life.minutes
          : Math.min(5, a.until - life.minutes);
    const { elapsed } = spendPlayerTime(
      life,
      actors,
      controlled,
      Math.max(0.01, minutes),
      undefined,
      () => !livePastime(current),
    );
    return ok(
      !livePastime(current)
        ? current.reply
        : `在咖啡店度过 ${Math.round(elapsed)} 分钟；${a.status === 'meeting' ? '对方已经到场，可以继续这顿饭。' : '还未实际同桌，等对方到场后才算一起吃饭。'}`,
    );
  }
  if (
    ['repair-listen', 'repair-look', 'repair-adjust', 'repair-test'].includes(
      command,
    )
  ) {
    if (
      !current ||
      current.kind !== 'repair' ||
      !current.work ||
      current.phase !== 'active'
    )
      return no('先走近对方，开始这次检修。');
    if (target !== current.target) return no('先完成眼前这位居民的检修。');
    const status = interactionStatus(life, actors, controlled, current.target);
    if (!status.ok) return no(status.message);
    const stage = current.work.stage;
    if (
      command === 'repair-listen' || command === 'repair-look'
        ? stage !== 'diagnose'
        : command === 'repair-adjust'
          ? stage !== 'adjust'
          : stage !== 'test'
    )
      return no('这一步已经做过，请继续下一步。');
    const approach = command === 'repair-listen' ? 'listen' : 'look';
    actor.path = [];
    other.path = [];
    const minutes = stage === 'adjust' ? 6 : 3;
    spendPlayerTime(
      life,
      actors,
      controlled,
      minutes,
      undefined,
      () => current.phase !== 'active',
    );
    if (current.phase !== 'active') return no(current.reply);
    current.progress += minutes;
    current.updatedAt = life.minutes;
    if (stage === 'diagnose') {
      current.work.approach = approach;
      current.work.stage = 'adjust';
      current.reply = pastimeVoice(life, current, approach);
    } else if (stage === 'adjust') {
      current.work.stage = 'test';
      current.reply = `处理完连接处${current.choice === 'replace' ? '并换上零件' : '的松动'}；还要一起试用，才能确认结果。`;
    } else finishRepair(life, current);
    return ok(current.reply);
  }
  if (command.startsWith('go-')) {
    actor.path = pathTo(
      actor,
      command === 'go-cafe'
        ? DISTRICT_PLACES.cafe
        : command === 'go-shops'
          ? DISTRICT_PLACES.shops
          : other,
    );
    return ok(
      command === 'go-target'
        ? '沿街前往对方目前的位置；到场后再确认他是否有空。'
        : '正在沿街前往，途中可以用方向键自行改变路线。',
    );
  }
  if (command.startsWith('buy-')) {
    if (
      Math.hypot(
        actor.x - DISTRICT_PLACES.shops.x,
        actor.y - DISTRICT_PLACES.shops.y,
      ) > 75
    )
      return no('先到商店门口，再购买所需材料。');
    const item = command === 'buy-parts' ? 'parts' : 'groceries';
    if (life.belongings[controlled][item] >= 4)
      return no('材料已经足够，先用掉一些再买。');
    const person = life.people[controlled],
      account = life.economy.accounts[controlled];
    const choice = Math.max(
      person.choices + 1,
      (account.lastShopChoice ?? -1) + 1,
    );
    const result = purchaseSupply(
      life.economy,
      controlled,
      item,
      life.minutes,
      choice,
    );
    if (result !== 'bought')
      return no('生活点不足，先选不消耗材料的基础活动也可以。');
    person.choices = choice;
    life.belongings[controlled][item]++;
    const e = log(
      life,
      `${names(life, controlled)}买了一份${SUPPLIES[item]}，准备与人一起做点事。`,
    );
    e.item = { person: controlled, kind: 'bought', item };
    return ok(e.text);
  }
  if (command === 'invite') {
    if (
      !current ||
      current.kind !== 'meal' ||
      current.phase !== 'ready' ||
      current.target !== target
    )
      return no('先为这位居民准备一份两人餐食。');
    if (life.minutes - current.createdAt >= 180) {
      close(life, current, '准备放得太久，这次先取消；下次重新准备。');
      return ok(current.reply);
    }
    const reply = lifeTopic(life, controlled, target, 'eat');
    const entry = {
      ...reply,
      id: `pastime-${current.id}`,
      speaker: controlled,
      target,
      source: 'preset' as const,
      createdAt: new Date().toISOString(),
      ...([controlled, target].includes('waver')
        ? { waverStage: life.waverStage }
        : {}),
    };
    const result = recordOnsiteConversation(
      life,
      actors,
      controlled,
      entry,
      reply.effects,
    );
    if (!result.ok) return result;
    const appointment = life.appointments.find(
      (a) => a.id === life.events.at(-1)?.id && a.activity === 'eat',
    );
    current.reply = reply.reply;
    current.updatedAt = life.minutes;
    if (appointment) {
      current.phase = 'invited';
      current.appointment = appointment.id;
    } else current.phase = 'cancelled';
    return ok(`${names(life, target)}：${reply.reply}`);
  }
  if (current) return no('先完成或取消手头的活动，再准备下一件事。');
  if (
    (life.pastimes ?? []).some(
      (p) =>
        p.host === controlled &&
        p.target === target &&
        p.phase === 'done' &&
        currentPastime(life, p) &&
        p.kind === (command.startsWith('prepare-') ? 'meal' : 'repair') &&
        Math.floor(p.updatedAt / 1440) === Math.floor(life.minutes / 1440),
    )
  )
    return no('今天已经一起完成过这件事了，换件事做，或明天再约。');
  let choice: Pastime['choice'], reply: string;
  const isMeal = command.startsWith('prepare-');
  if (isMeal) {
    if (
      Math.hypot(
        actor.x - DISTRICT_PLACES.cafe.x,
        actor.y - DISTRICT_PLACES.cafe.y,
      ) > 75
    )
      return no('先到街角咖啡店，选餐并备好两人的位置。');
    choice = command === 'prepare-simple' ? 'simple' : 'vegetable';
    if (choice === 'vegetable') {
      if (!life.belongings[controlled].groceries)
        return no('缺少时蔬。可以先去商店买一篮，或改选免费简餐。');
      life.belongings[controlled].groceries--;
    }
    reply =
      choice === 'simple'
        ? '两份基础简餐已经备好。走近对方，亲口邀请一小时后在这里一起吃饭。'
        : '已用一篮时蔬备好配菜。走近对方，亲口邀请一小时后一起吃饭；取消也不会退回材料。';
  } else {
    const status = interactionStatus(life, actors, controlled, target);
    if (!status.ok) return status;
    if (
      dueDuty(life, target) ||
      life.people[target].hunger >= 85 ||
      life.people[target].energy < 20 ||
      life.appointments.some(
        (a) =>
          currentAppointment(life, a) &&
          liveAppointment(a) &&
          [a.a, a.b].includes(target),
      )
    )
      return no(`${names(life, target)}：现在手头还有安排，晚些再帮我检查吧。`);
    if (
      (life.pastimes ?? []).some(
        (p) =>
          currentPastime(life, p) &&
          livePastime(p) &&
          [p.host, p.target].includes(target),
      )
    )
      return no('对方正在参与另一件事，先等等。');
    if (life.belongings[target].condition >= 90)
      return no(`${names(life, target)}：这件东西现在还好好的，暂时不用修。`);
    choice = command === 'repair-replace' ? 'replace' : 'inspect';
    if (choice === 'replace') {
      if (!life.belongings[controlled].parts)
        return no('缺少修理零件。可以先做免费检查，或到商店补一份零件。');
      life.belongings[controlled].parts--;
    }
    reply = `${names(life, target)}：好，${deviceName(target)}最近确实有些不顺手。${choice === 'inspect' ? '一起检查一下吧。' : '那就一起把旧零件换掉。'}`;
    life.people[target].activity = null;
    actor.path = [];
    other.path = [];
  }
  const e = log(
    life,
    `${names(life, controlled)}${isMeal ? '准备邀请一起吃饭' : `开始帮${names(life, target)}检修器具`}。${reply}`,
  );
  const p: Pastime = {
    id: e.id,
    host: controlled,
    target,
    stage: [controlled, target].includes('waver') ? life.waverStage : null,
    kind: isMeal ? 'meal' : 'repair',
    choice,
    phase: isMeal ? 'ready' : 'active',
    createdAt: life.minutes,
    updatedAt: life.minutes,
    progress: 0,
    ...(!isMeal ? { work: { stage: 'diagnose' as const } } : {}),
    reply,
  };
  const records = [...(life.pastimes ?? []), p];
  let excess = Math.max(0, records.length - 32);
  // A bounded journal must never discard somebody else's unfinished preparation.
  life.pastimes = records.filter((record) => {
    if (excess && (!livePastime(record) || !currentPastime(life, record))) {
      excess--;
      return false;
    }
    return true;
  });
  return ok(reply);
}

/** Shared repair uses game time and live proximity; absence or switching control never performs work. */
export function advancePastimes(
  life: DailyLife,
  actors: Actor[],
  elapsed: number,
  controlled: string | null,
) {
  for (const p of life.pastimes ?? []) {
    if (!livePastime(p)) continue;
    if (!currentPastime(life, p)) {
      close(life, p, '人物时期已改变，这次活动已取消。');
      continue;
    }
    if (p.kind === 'meal' && p.appointment !== undefined) {
      const a = life.appointments.find((a) => a.id === p.appointment);
      if (a?.status === 'fulfilled') {
        p.phase = 'done';
        p.progress = 10;
        p.updatedAt = life.minutes;
        const avoids = knownPreferences(life, p.host, p.target).some(
          (m) => m.preference === 'dislike' && /时蔬|蔬菜/.test(m.subject),
        );
        p.reply = pastimeVoice(
          life,
          p,
          p.choice === 'vegetable' ? (avoids ? 'avoids' : 'vegetable') : 'meal',
        );
        for (const id of [p.host, p.target]) {
          life.people[id].hunger = Math.max(0, life.people[id].hunger - 25);
          life.people[id].energy = Math.min(100, life.people[id].energy + 5);
        }
        log(
          life,
          `${names(life, p.host)}与${names(life, p.target)}实际吃完饭。${p.reply}`,
        );
      } else if (!a || ['missed', 'cancelled'].includes(a.status))
        close(
          life,
          p,
          a?.notice ?? '这次没有实际一起吃饭，准备已收起；没有记成共同用餐。',
        );
    } else if (life.minutes - p.createdAt >= (p.kind === 'meal' ? 180 : 120))
      close(life, p, '这次没能继续，先收起手边的准备；未把它记为完成。');
    else if (p.kind === 'repair') {
      if (
        dueDuty(life, p.target) ||
        life.people[p.target].hunger >= 85 ||
        life.people[p.target].energy < 15
      ) {
        close(
          life,
          p,
          `${names(life, p.target)}有作息或身体需要，这次先暂停检修，之后可以重新约。`,
        );
        continue;
      }
      const host = actors.find((a) => a.id === p.host),
        target = actors.find((a) => a.id === p.target);
      if (
        controlled !== p.host ||
        !host ||
        !target ||
        life.indoor ||
        lifeIndoors(life.people[p.target]) ||
        Math.hypot(host.x - target.x, host.y - target.y) > 130
      )
        continue;
      // New activities advance only after a player chooses each actual work step.
      // Older saved progress keeps its original timed completion rule.
      if (p.work) continue;
      p.progress = Math.min(12, p.progress + elapsed);
      p.updatedAt = life.minutes;
      if (p.progress >= 12) finishRepair(life, p);
    }
  }
}
function finishRepair(life: DailyLife, p: Pastime) {
  p.phase = 'done';
  const belongings = life.belongings[p.target],
    before = belongings.condition;
  const attention = p.work?.approach === 'listen' ? 6 : 0;
  belongings.condition = Math.min(
    100,
    before + (p.choice === 'replace' ? 40 : 12) + attention,
  );
  belongings.repairs = Math.min(999999, belongings.repairs + 1);
  life.people[p.host].energy = Math.max(0, life.people[p.host].energy - 4);
  p.reply = pastimeVoice(
    life,
    p,
    p.choice === 'replace' ? 'repaired' : 'adjusted',
  );
  const e = log(
    life,
    `${names(life, p.host)}帮忙检修了${names(life, p.target)}的${deviceName(p.target)}，状况由${Math.round(before)}改善到${Math.round(belongings.condition)}。${p.work?.approach === 'listen' ? '先听清了使用时的问题，连接处也检查得更仔细。' : ''}${p.reply}`,
  );
  rememberSharedWalk(life, p.host, p.target, e, 'repair');
}
export function pastimeHolds(
  life: DailyLife,
  id: PartnerId,
  controlled: string | null,
  actors: Actor[],
) {
  return (life.pastimes ?? []).some((p) => {
    if (
      p.kind !== 'repair' ||
      p.phase !== 'active' ||
      p.target !== id ||
      p.host !== controlled ||
      !currentPastime(life, p)
    )
      return false;
    const a = actors.find((a) => a.id === p.host),
      b = actors.find((a) => a.id === id);
    return a && b && !life.indoor && Math.hypot(a.x - b.x, a.y - b.y) <= 130;
  });
}
export function parsePastimes(value: unknown, life: DailyLife): Pastime[] {
  if (!Array.isArray(value) || value.length > 32)
    throw new Error('共同活动记录无效');
  const seen = new Set<number>(),
    busy = new Set<PartnerId>();
  return value.map((p: Pastime) => {
    if (
      !p ||
      !Number.isSafeInteger(p.id) ||
      p.id < 1 ||
      p.id >= life.nextId ||
      seen.has(p.id) ||
      !isPartner(p.host) ||
      !isPartner(p.target) ||
      p.host === p.target ||
      (p.stage !== null && !['young', 'adult'].includes(p.stage)) ||
      ([p.host, p.target].includes('waver')
        ? p.stage === null
        : p.stage !== null) ||
      !['meal', 'repair'].includes(p.kind) ||
      !(
        p.kind === 'meal' ? ['simple', 'vegetable'] : ['inspect', 'replace']
      ).includes(p.choice) ||
      !['ready', 'invited', 'active', 'done', 'cancelled'].includes(p.phase) ||
      !Number.isFinite(p.createdAt) ||
      p.createdAt < 0 ||
      p.createdAt > life.minutes ||
      !Number.isFinite(p.updatedAt) ||
      p.updatedAt < p.createdAt ||
      p.updatedAt > life.minutes ||
      !Number.isFinite(p.progress) ||
      p.progress < 0 ||
      p.progress > (p.kind === 'meal' ? 10 : 12) ||
      typeof p.reply !== 'string' ||
      p.reply.length > 600 ||
      (p.phase === 'done' && p.progress !== (p.kind === 'meal' ? 10 : 12)) ||
      (p.kind === 'repair' &&
        (p.appointment !== undefined ||
          ['ready', 'invited'].includes(p.phase))) ||
      (p.kind === 'meal' && p.phase === 'active')
    )
      throw new Error('共同活动记录无效');
    seen.add(p.id);
    if (p.work !== undefined) {
      const w = p.work;
      if (
        p.kind !== 'repair' ||
        !w ||
        !['diagnose', 'adjust', 'test'].includes(w.stage) ||
        (w.approach !== undefined &&
          !['listen', 'look'].includes(w.approach)) ||
        (w.stage === 'diagnose'
          ? w.approach !== undefined || p.progress !== 0
          : w.approach === undefined) ||
        (p.phase === 'active' &&
          p.progress !==
            (w.stage === 'diagnose' ? 0 : w.stage === 'adjust' ? 3 : 9)) ||
        (p.phase === 'done' && w.stage !== 'test')
      )
        throw new Error('检修步骤记录无效');
    }
    if (livePastime(p) && currentPastime(life, p)) {
      if (busy.has(p.host)) throw new Error('共同活动重复');
      busy.add(p.host);
    }
    if (
      p.kind === 'meal' &&
      ['invited', 'done'].includes(p.phase) &&
      p.appointment === undefined
    )
      throw new Error('缺少用餐约定');
    if (p.appointment !== undefined) {
      const a = life.appointments.find((a) => a.id === p.appointment);
      if (
        !Number.isSafeInteger(p.appointment) ||
        p.appointment <= p.id ||
        p.appointment >= life.nextId ||
        (a &&
          (a.activity !== 'eat' ||
            a.stage !== p.stage ||
            ![a.a, a.b].includes(p.host) ||
            ![a.a, a.b].includes(p.target))) ||
        (p.phase === 'invited' && (!a || !liveAppointment(a))) ||
        (p.phase === 'done' && a && a.status !== 'fulfilled')
      )
        throw new Error('共同活动与约定不一致');
    }
    return {
      id: p.id,
      host: p.host,
      target: p.target,
      stage: p.stage,
      kind: p.kind,
      choice: p.choice,
      phase: p.phase,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      progress: p.progress,
      reply: p.reply,
      ...(p.appointment === undefined ? {} : { appointment: p.appointment }),
      ...(p.work === undefined
        ? {}
        : {
            work: {
              stage: p.work.stage,
              ...(p.work.approach === undefined
                ? {}
                : { approach: p.work.approach }),
            },
          }),
    };
  });
}
