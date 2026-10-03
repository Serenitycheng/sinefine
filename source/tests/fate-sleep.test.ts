import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceDailyLife,
  applyLifePlan,
  createDailyLife,
  LIFE_ACTIONS,
  parseDailyLife,
  type LifeAction,
} from '../lib/fate-life';
import { createStreetActors } from '../lib/street';
import { legacyDistrictPositions } from './legacy-district';

for (const { label, minute, expected } of [
  { label: '22:01', minute: 1321, expected: 479 },
  { label: 'midnight', minute: 1440, expected: 360 },
  { label: '03:15', minute: 1635, expected: 165 },
  { label: '05:59 on a later day', minute: 3239, expected: 1 },
]) {
  void test(`an AI sleep plan at ${label} preserves the local duration until 06:00`, () => {
    const life = createDailyLife();
    const actors = createStreetActors();
    life.minutes = minute - 0.1;
    life.nextEncounter = minute + 100;
    advanceDailyLife(life, actors, 0.05, {
      running: true,
      speed: 1,
      controlled: 'admin',
    });
    const event = life.events.find((e) => e.decision?.person === 'cu');
    assert.ok(event);
    assert.equal(life.people.cu.activity?.kind, 'sleep');
    const localRemaining = life.people.cu.activity.remaining;
    assert.ok(Math.abs(localRemaining - expected) < 1e-8);
    assert.equal(
      applyLifePlan(life, actors, event.id, {
        action: 'sleep',
        reason: '今晚好好休息，明早再出门。',
      }),
      true,
    );
    assert.equal(life.people.cu.activity.source, 'deepseek');
    assert.equal(life.people.cu.activity.remaining, localRemaining);
    assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(life))), life);
  });
}

function pendingDecision(minutes: number) {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = minutes;
  life.nextEncounter = minutes + 100;
  life.people.cu.activity = {
    kind: 'walk',
    phase: 'going',
    remaining: 20,
    reason: '沿街走走。',
    source: 'rules',
  };
  life.events.push({
    id: life.nextId++,
    minute: minutes,
    text: '准备沿街走走。',
    decision: {
      person: 'cu',
      action: 'walk',
      reason: '沿街走走。',
      source: 'rules',
    },
  });
  return { life, actors, eventId: life.events[0].id };
}

void test('daytime AI sleep keeps the existing two-hour duration, including the 06:00 boundary', () => {
  for (const minute of [360, 720, 1319, 1800]) {
    const { life, actors, eventId } = pendingDecision(minute);
    assert.equal(
      applyLifePlan(life, actors, eventId, {
        action: 'sleep',
        reason: '补一会儿觉。',
      }),
      true,
    );
    assert.equal(life.people.cu.activity?.remaining, 120);
  }
});

void test('other AI actions retain their existing duration and urgent needs still block sleep', () => {
  for (const action of Object.keys(LIFE_ACTIONS) as LifeAction[]) {
    if (action === 'sleep') continue;
    const { life, actors, eventId } = pendingDecision(1321);
    assert.equal(
      applyLifePlan(life, actors, eventId, {
        action,
        reason: '继续自己的日常安排。',
      }),
      true,
    );
    assert.equal(
      life.people.cu.activity?.remaining,
      LIFE_ACTIONS[action].duration,
    );
  }
  const { life, actors, eventId } = pendingDecision(1321);
  life.people.cu.hunger = 95;
  const before = structuredClone(life.people.cu.activity);
  assert.equal(
    applyLifePlan(life, actors, eventId, {
      action: 'sleep',
      reason: '想先睡一会儿。',
    }),
    false,
  );
  assert.deepEqual(life.people.cu.activity, before);
});

void test('loading older and current saves preserves an already-running sleep countdown', () => {
  const { life, actors, eventId } = pendingDecision(1450);
  assert.equal(
    applyLifePlan(life, actors, eventId, {
      action: 'sleep',
      reason: '休息到早晨。',
    }),
    true,
  );
  life.people.cu.activity!.phase = 'doing';
  // Old AI plans used 120 minutes. Loading must not reinterpret existing progress.
  life.people.cu.activity!.remaining = 91.5;
  for (const version of [10, 11, 12]) {
    const loaded = parseDailyLife(
      JSON.parse(
        JSON.stringify({
          ...life,
          version,
          positions: legacyDistrictPositions(life.positions),
        }),
      ),
    );
    assert.deepEqual(loaded.people.cu.activity, life.people.cu.activity);
    assert.equal(loaded.version, 16);
    assert.equal(loaded.minutes, 1450);
  }
});
