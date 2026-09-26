import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEGACY_STREET_PARTNERS, STREET_PARTNERS } from '../lib/fate-cast';
import type { DialogueTurn } from '../lib/fate-dialogue';
import { parseDailyLife, createDailyLife } from '../lib/fate-life';
import {
  commitSocialDialogue,
  parseSocialEffects,
  rememberEncounter,
  type Appointment,
  type SocialEffects,
} from '../lib/fate-social';
import { parseAppointments } from '../lib/fate-social-storage';

const proposal = '一小时后一起在街角咖啡店看书，好吗？';
const changedPlan = '好，那我们一起在林荫路边散步。';
function conversation(reply: string, message = proposal) {
  const turns: DialogueTurn[] = [
    { speaker: 'rin', text: message },
    { speaker: 'shirou', text: reply },
    { speaker: 'rin', text: '那就先把手边的事做好。' },
    { speaker: 'shirou', text: '嗯，我记住了。' },
  ];
  const effects: SocialEffects = {
    impressions: [],
    promise: {
      activity: 'read',
      delay: 60,
      proposal: 0,
      acceptance: 1,
      proposalQuote: message,
      acceptanceQuote: reply,
    },
  };
  return { turns, effects };
}
function appointment(
  reply = changedPlan,
  status: Appointment['status'] = 'pending',
): Appointment {
  return {
    id: 1,
    a: 'rin',
    b: 'shirou',
    stage: null,
    activity: 'read',
    createdAt: 980,
    start: 1040,
    until: 1100,
    shared: status === 'fulfilled' ? 10 : 0,
    talked: false,
    status,
    quotes: conversation(reply).turns.slice(0, 2),
  };
}

void test('a reply changing the promised activity or place cannot schedule the original plan', () => {
  for (const reply of [
    changedPlan,
    '好，那我们一起在街角咖啡店吃饭。',
    '好，那我们一起在林荫路边看书。',
    '好，一小时后在卫宫宅看书。',
    '好，我会在公园等你。',
    '好，一小时后到学校见。',
    '好，一小时后我们一起打球。',
  ]) {
    const { turns, effects } = conversation(reply);
    assert.throws(() => parseSocialEffects(effects, turns), reply);
  }
});

void test('plain agreement and an unchanged explicit plan remain executable', () => {
  for (const reply of [
    '好，约好了。',
    '可以，一小时后见。',
    '好，那我们一小时后一起在街角咖啡店看书。',
    '好，一小时后我在咖啡店等你。',
    '好，到时候见。',
    '好，我会准时过去等你。',
    '好，有你在就放心了。',
    '好，一起在那里看书。',
  ]) {
    const { turns, effects } = conversation(reply);
    assert.deepEqual(parseSocialEffects(effects, turns), effects, reply);
  }
});

void test('a cafe destination cannot replace the proposed walk at the roadside', () => {
  const { turns, effects } = conversation(
    '好，那我们去咖啡店。',
    '一小时后一起在林荫路边散步，好吗？',
  );
  effects.promise!.activity = 'walk';
  assert.throws(() => parseSocialEffects(effects, turns));
});

void test('refusal, uncertainty, a changed time and truncated acceptance still cannot create a promise', () => {
  for (const reply of [
    '不，我没空。',
    '好，但我想先回家。',
    '好，到时候再看。',
    '好，如果忙完我就来。',
    '好，两小时后一起在街角咖啡店看书。',
    '也许吧。',
  ]) {
    const { turns, effects } = conversation(reply);
    assert.throws(() => parseSocialEffects(effects, turns), reply);
  }
  const { turns, effects } = conversation('好，但我想先回家。');
  effects.promise!.acceptanceQuote = '好';
  assert.throws(() => parseSocialEffects(effects, turns));
});

void test('a counterproposal remains readable dialogue without becoming an appointment', () => {
  const life = createDailyLife();
  life.nextId = 2;
  life.events.push({
    id: 1,
    minute: life.minutes,
    text: '凛与士郎交谈。',
    dialogue: {
      speaker: 'rin',
      target: 'shirou',
      message: '今天有空吗？',
      reply: '刚忙完。',
      source: 'preset',
    },
  });
  const { turns, effects } = conversation(changedPlan);
  assert.equal(commitSocialDialogue(life, 1, turns, effects), true);
  assert.equal(life.events[0].dialogue!.reply, changedPlan);
  assert.equal(life.events[0].dialogue!.source, 'deepseek');
  assert.deepEqual(life.appointments, []);
});

void test('legacy conflicting pending and meeting appointments cancel without losing their evidence', () => {
  for (const status of ['pending', 'meeting'] as const) {
    const old = appointment(changedPlan, status);
    const cancelled: number[] = [];
    const migrated = parseAppointments([old], 980, 2, (id) =>
      cancelled.push(id),
    );
    assert.deepEqual(migrated, [{ ...old, status: 'cancelled' }]);
    assert.deepEqual(cancelled, [1]);
    assert.equal(old.status, status, 'must not mutate the input save');
    assert.deepEqual(parseAppointments(migrated, 980, 2), migrated);
  }
});

void test('legacy completed and cancelled appointment history remains readable and unchanged', () => {
  for (const status of ['fulfilled', 'missed', 'cancelled'] as const) {
    const old = appointment(changedPlan, status);
    const cancelled: number[] = [];
    assert.deepEqual(
      parseAppointments([old], 980, 2, (id) => cancelled.push(id)),
      [old],
    );
    assert.deepEqual(cancelled, []);
  }
  const valid = appointment('好，约好了。');
  assert.deepEqual(parseAppointments([valid], 980, 2), [valid]);
});

void test('legacy migration still rejects damaged promise evidence and invalid appointment fields', () => {
  const missingProposal = appointment();
  missingProposal.quotes[0].text = '你今天好吗？';
  const sameSpeaker = appointment();
  sameSpeaker.quotes[1].speaker = 'rin';
  const damagedTime = appointment();
  damagedTime.start += 1;
  for (const bad of [
    missingProposal,
    sameSpeaker,
    damagedTime,
    appointment('不，我不想去。'),
    { ...appointment(), shared: Number.NaN },
  ]) {
    assert.throws(() => parseAppointments([bad], 980, 2));
  }
  assert.throws(() =>
    parseAppointments(
      [appointment(), { ...appointment('好，约好了。'), id: 2 }],
      980,
      3,
    ),
  );
});

function legacyLife() {
  const life = createDailyLife();
  life.nextId = 2;
  life.appointments = [appointment()];
  const event = {
    id: 1,
    minute: life.minutes,
    text: '凛与士郎讨论了稍后的安排。',
    dialogue: {
      speaker: 'rin' as const,
      target: 'shirou' as const,
      message: proposal,
      reply: changedPlan,
      source: 'deepseek' as const,
    },
  };
  life.events.push(event);
  life.lastEncounters['rin|shirou'] = life.minutes;
  rememberEncounter(life, event);
  for (const id of ['rin', 'shirou'] as const)
    life.people[id].activity = {
      kind: 'read',
      meeting: 1,
      phase: 'going',
      remaining: 10,
      reason: '前往约定地点。',
      source: 'rules',
    };
  life.people.saber.activity = {
    kind: 'eat',
    phase: 'going',
    remaining: 30,
    reason: '去咖啡店吃饭。',
    source: 'rules',
  };
  return {
    ...life,
    version: 11,
    people: Object.fromEntries(
      LEGACY_STREET_PARTNERS.map((id) => [id, life.people[id]]),
    ),
    positions: Object.fromEntries(
      ['admin' as const, ...LEGACY_STREET_PARTNERS].map((id) => [
        id,
        life.positions[id],
      ]),
    ),
    belongings: Object.fromEntries(
      LEGACY_STREET_PARTNERS.map((id) => [id, life.belongings[id]]),
    ),
  };
}

void test('a full legacy save clears only travel towards the cancelled counterproposal and remains reloadable', () => {
  const life = legacyLife();
  assert.equal(life.version, 11);
  assert.equal(Object.keys(life.people).length, 14);
  assert.equal(Object.keys(life.positions).length, 15);
  assert.equal(Object.keys(life.belongings).length, 14);
  const restored = parseDailyLife(life);
  assert.equal(restored.version, 13);
  assert.equal(Object.keys(restored.people).length, STREET_PARTNERS.length);
  assert.equal(restored.appointments[0].status, 'cancelled');
  assert.equal(restored.people.rin.activity, null);
  assert.equal(restored.people.shirou.activity, null);
  assert.deepEqual(restored.people.saber, life.people.saber);
  assert.deepEqual(restored.bonds, life.bonds);
  assert.deepEqual(restored.events, life.events);
  assert.deepEqual(parseDailyLife(restored), restored);
});

void test('full save migration still validates every field of a cancelled travel activity', () => {
  const wrongActivity = legacyLife();
  wrongActivity.people.rin.activity!.kind = 'eat';
  const wrongRemaining = legacyLife();
  wrongRemaining.people.rin.activity!.remaining = -1;
  const wrongMember = legacyLife();
  wrongMember.people.saber.activity = structuredClone(
    wrongMember.people.rin.activity,
  );
  const unrelatedCancellation = legacyLife();
  unrelatedCancellation.appointments[0].status = 'cancelled';
  for (const invalid of [
    wrongActivity,
    wrongRemaining,
    wrongMember,
    unrelatedCancellation,
  ])
    assert.throws(() => parseDailyLife(invalid));
});
