import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BACKGROUND_MODEL,
  backgroundDay,
  backgroundFingerprint,
  backgroundReservation,
  backgroundUsageCost,
  parseBackgroundView,
} from '../lib/fate-background';
import { runBackgroundRound } from '../lib/fate-background-simulation';
import { createFateBackup } from '../lib/fate-backup';
import { emptyFateSave } from '../lib/fate-state';
import { createDailyLife, LIFE_IDS } from '../lib/fate-life';
import { FATE_HOMES } from '../lib/fate-housing';

const now = new Date('2026-09-30T03:00:00Z');
const payload = (extra = {}) =>
  JSON.stringify({
    model: BACKGROUND_MODEL,
    max_tokens: 1800,
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: '你好，冬木。' }],
    ...extra,
  });
function backup() {
  return createFateBackup(
    { ...emptyFateSave(), life: createDailyLife() },
    '测试',
    now,
  );
}

void test('background spending reserves the whole input and maximum output before sending; uncertain responses retain it', () => {
  const amount = backgroundReservation(payload(), now);
  assert.ok(amount > 1800 * 8);
  assert.deepEqual(backgroundUsageCost(undefined, amount), {
    cost: amount,
    tokens: 0,
  });
  assert.deepEqual(
    backgroundUsageCost({ prompt_tokens: 100, completion_tokens: 200 }, amount),
    { cost: 1800, tokens: 300 },
  );
  assert.equal(
    backgroundUsageCost({ prompt_tokens: -1, completion_tokens: 100 }, amount)
      .cost,
    amount,
  );
  assert.throws(() =>
    backgroundReservation(payload({ model: 'other-expensive-model' }), now),
  );
  assert.throws(() =>
    backgroundReservation(payload({ max_tokens: 1801 }), now),
  );
  assert.throws(() =>
    backgroundReservation(payload({ thinking: { type: 'enabled' } }), now),
  );
  assert.throws(
    () =>
      backgroundReservation(payload({ messages: ['字'.repeat(60000)] }), now),
    /过长/,
  );
  assert.throws(
    () =>
      backgroundReservation(payload(), new Date('2026-10-30T00:00:00+08:00')),
    /到期/,
  );
  assert.equal(backgroundDay(new Date('2026-09-30T15:59:59Z')), '2026-09-30');
  assert.equal(backgroundDay(new Date('2026-09-30T16:00:00Z')), '2026-10-01');
});

void test('cloud round advances one bounded interval, persists real encounters and makes no more than one AI call', async () => {
  const original = backup();
  let calls = 0;
  const result = await runBackgroundRound(
    original,
    async (body) => {
      calls++;
      if (body.mode === 'decision')
        return { plan: { action: 'walk', reason: '想沿着河岸散步。' } };
      return {
        turns: [
          { speaker: body.speaker, text: '今天就在这边慢慢走吧。' },
          { speaker: body.target, text: '好，我们还有些时间。' },
          { speaker: body.speaker, text: '那就沿河岸走一段。' },
          { speaker: body.target, text: '我也想看看这边的景色。' },
        ],
        effects: { impressions: [] },
      };
    },
    now,
  );
  assert.ok(
    Math.abs(result.save.life!.minutes - original.save.life!.minutes - 30) <
      0.001,
  );
  assert.ok(calls <= 1);
  assert.ok(
    result.save.life!.events.length > original.save.life!.events.length,
  );
  assert.equal(
    original.save.life!.minutes,
    980,
    'the original snapshot stays untouched',
  );
  for (const exchange of result.save.history)
    assert.ok(
      result.save.life!.events.some(
        (e) => `life-${e.id}` === exchange.id && e.dialogue,
      ),
      'history must correspond to an actual onsite event',
    );
});

void test('quiet sleeping rounds do not force billable conversations or move the indoor player', async () => {
  const original = backup(),
    life = original.save.life!;
  life.minutes = 23 * 60;
  life.indoor = { actor: 'shirou', home: 'emiya', x: 235, y: 379 };
  life.positions.shirou = { x: FATE_HOMES.emiya.x, y: FATE_HOMES.emiya.y };
  for (const id of LIFE_IDS) {
    life.people[id].activity = {
      kind: 'sleep',
      phase: 'doing',
      remaining: 120,
      reason: '休息。',
      source: 'rules',
      home: id === 'shirou' ? 'emiya' : undefined,
    };
    life.people[id].energy = 10;
  }
  let calls = 0;
  const result = await runBackgroundRound(
    original,
    async () => {
      calls++;
      throw new Error('sleeping residents should not converse');
    },
    now,
  );
  assert.equal(calls, 0);
  assert.deepEqual(result.save.life!.indoor, life.indoor);
  assert.deepEqual(result.save.life!.positions.shirou, life.positions.shirou);
});

void test('background fingerprints track gameplay changes while ignoring backup timestamps, and reject malformed cloud views', async () => {
  const original = backup();
  assert.equal(
    await backgroundFingerprint(original),
    await backgroundFingerprint({
      ...original,
      title: '另一个标题',
      createdAt: now.toISOString(),
      id: 'other',
    }),
  );
  const changed = structuredClone(original);
  changed.save.worldNote = '已改变';
  assert.notEqual(
    await backgroundFingerprint(original),
    await backgroundFingerprint(changed),
  );
  assert.throws(() =>
    parseBackgroundView({
      username: 'alice',
      session: { enabled: true, spentMicros: 5_000_001 },
    }),
  );
  assert.deepEqual(parseBackgroundView({ username: 'alice', session: null }), {
    username: 'alice',
    session: null,
  });
});
