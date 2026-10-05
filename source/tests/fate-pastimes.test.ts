import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDailyLife,
  parseDailyLife,
  advanceDailyLife,
  snapshotLife,
  changeWaverStage,
} from '../lib/fate-life';
import { createStreetActors, stepActor } from '../lib/street';
import { actOnPastime, advancePastimes } from '../lib/fate-pastimes';
import { DISTRICT_PLACES } from '../lib/fate-district';
import {
  playerAppointment,
  meetupDestination,
  reconcileAppointments,
} from '../lib/fate-meetups';
import { currentBond } from '../lib/fate-social';
import {
  createFateBackup,
  readFateBackupText,
  serializeFateBackup,
} from '../lib/fate-backup';
import { emptyFateSave } from '../lib/fate-state';
import { runBackgroundRound } from '../lib/fate-background-simulation';
import { lifeTopic } from '../lib/fate-conversation-presets';
function setup() {
  const life = createDailyLife(),
    actors = createStreetActors();
  for (const id of ['rin', 'shirou'] as const) {
    Object.assign(
      actors.find((a) => a.id === id)!,
      DISTRICT_PLACES.cafe,
    );
    life.people[id].activity = null;
    life.people[id].energy = 90;
    life.people[id].hunger = 10;
  }
  return { life, actors };
}
function finishPlayerRepair(
  life: ReturnType<typeof createDailyLife>,
  actors: ReturnType<typeof createStreetActors>,
) {
  for (const command of [
    'repair-look',
    'repair-adjust',
    'repair-test',
  ] as const)
    assert.equal(
      actOnPastime(life, actors, 'rin', command, 'shirou').ok,
      true,
      command,
    );
}
void test('free meal follows preparation, consent, physical attendance and remembered completion exactly once', () => {
  const { life, actors } = setup();
  assert.equal(
    actOnPastime(life, actors, 'rin', 'prepare-simple', 'shirou').ok,
    true,
  );
  assert.equal(life.appointments.length, 0);
  assert.equal(actOnPastime(life, actors, 'rin', 'invite', 'shirou').ok, true);
  const p = life.pastimes![0],
    a = life.appointments[0];
  assert.equal(p.phase, 'invited');
  assert.equal(p.appointment, a.id);
  life.minutes = a.start + 1;
  for (const id of [a.a, a.b]) {
    Object.assign(
      actors.find((x) => x.id === id)!,
      meetupDestination(a, id),
    );
    life.people[id].activity = {
      kind: 'eat',
      phase: 'doing',
      meeting: a.id,
      remaining: 10,
      source: 'rules',
      reason: '吃饭',
    };
  }
  playerAppointment(life, actors, 'rin', a.id, 'attend');
  const log = (text: string) => {
    const e = { id: life.nextId++, minute: life.minutes, text };
    life.events.push(e);
    return e;
  };
  reconcileAppointments(life, actors, 10, 'rin', log);
  advancePastimes(life, actors, 1, 'rin');
  assert.equal(p.phase, 'done');
  assert.match(p.reply, /普通的饭/);
  const n = life.events.length;
  advancePastimes(life, actors, 20, 'rin');
  assert.equal(life.events.length, n);
  assert.ok(
    currentBond(life, 'rin', 'shirou')!.archive!.some(
      (m) => m.kind === 'experience' && m.activity === 'eat',
    ),
  );
  assert.match(lifeTopic(life, 'rin', 'shirou', 'recall').reply, /确实一起/);
  assert.doesNotMatch(
    lifeTopic(life, 'sakura', 'shirou', 'recall').reply,
    /确实一起/,
  );
  assert.deepEqual(
    parseDailyLife(JSON.parse(JSON.stringify(snapshotLife(life, actors))))
      .pastimes,
    life.pastimes,
  );
  assert.equal(
    actOnPastime(life, actors, 'rin', 'prepare-simple', 'shirou').ok,
    false,
  );
});
void test('prepared meal does not override refusal and ingredients are spent once', () => {
  const { life, actors } = setup();
  life.belongings.rin.groceries = 1;
  assert.equal(
    actOnPastime(life, actors, 'rin', 'prepare-vegetable', 'shirou').ok,
    true,
  );
  assert.equal(
    actOnPastime(life, actors, 'rin', 'prepare-vegetable', 'shirou').ok,
    false,
  );
  assert.equal(life.belongings.rin.groceries, 0);
  life.people.shirou.energy = 5;
  assert.equal(actOnPastime(life, actors, 'rin', 'invite', 'shirou').ok, true);
  assert.equal(life.appointments.length, 0);
  assert.equal(life.pastimes![0].phase, 'cancelled');
  assert.equal(life.belongings.rin.groceries, 0);
  assert.ok(
    parseDailyLife(JSON.parse(JSON.stringify(snapshotLife(life, actors)))),
  );
});
void test('repair pauses on departure and refresh; replacement requires actual steps with no repeat reward', () => {
  const { life, actors } = setup();
  life.belongings.rin.parts = 1;
  assert.equal(
    actOnPastime(life, actors, 'rin', 'repair-replace', 'shirou').ok,
    true,
  );
  assert.equal(life.belongings.rin.parts, 0);
  const before = life.belongings.shirou.condition;
  actOnPastime(life, actors, 'rin', 'repair-look', 'shirou');
  assert.equal(life.pastimes![0].progress, 3);
  const actor = actors.find((a) => a.id === 'rin')!;
  actor.x += 200;
  advancePastimes(life, actors, 5, 'rin');
  assert.equal(life.pastimes![0].progress, 3);
  assert.equal(
    actOnPastime(life, actors, 'rin', 'repair-adjust', 'shirou').ok,
    false,
  );
  Object.assign(actor, DISTRICT_PLACES.cafe);
  const restored = parseDailyLife(
    JSON.parse(JSON.stringify(snapshotLife(life, actors))),
  );
  actOnPastime(restored, actors, 'rin', 'repair-adjust', 'shirou');
  assert.equal(restored.pastimes![0].phase, 'active');
  assert.equal(restored.belongings.shirou.condition, before);
  actOnPastime(restored, actors, 'rin', 'repair-test', 'shirou');
  assert.equal(restored.pastimes![0].phase, 'done');
  assert.equal(
    restored.belongings.shirou.condition,
    Math.min(100, before + 40),
  );
  const condition = restored.belongings.shirou.condition;
  advancePastimes(restored, actors, 12, 'rin');
  assert.equal(restored.belongings.shirou.condition, condition);
  assert.equal(restored.belongings.rin.parts, 0);
  assert.ok(
    currentBond(restored, 'rin', 'shirou')!.archive!.some(
      (m) => m.kind === 'experience' && m.activity === 'repair',
    ),
  );
  assert.ok(parseDailyLife(JSON.parse(JSON.stringify(restored))));
});
void test('free inspection, cancellation, no materials and existing plans have distinct honest outcomes', () => {
  const { life, actors } = setup();
  assert.equal(
    actOnPastime(life, actors, 'rin', 'repair-replace', 'shirou').ok,
    false,
  );
  assert.equal(
    actOnPastime(life, actors, 'rin', 'repair-inspect', 'shirou').ok,
    true,
  );
  const before = life.belongings.shirou.condition;
  finishPlayerRepair(life, actors);
  assert.equal(life.belongings.shirou.condition, before + 12);
  assert.match(life.pastimes![0].reply, /松动/);
  const other = setup();
  actOnPastime(other.life, other.actors, 'rin', 'repair-inspect', 'shirou');
  actOnPastime(other.life, other.actors, 'rin', 'cancel', 'shirou');
  advancePastimes(other.life, other.actors, 20, 'rin');
  assert.equal(other.life.belongings.shirou.condition, 60);
  assert.equal(other.life.pastimes![0].phase, 'cancelled');
});
void test('waiting, control changes and stopped time do not secretly perform player work', () => {
  const { life, actors } = setup();
  actOnPastime(life, actors, 'rin', 'repair-inspect', 'shirou');
  advanceDailyLife(life, actors, 0.05, {
    running: false,
    speed: 4,
    controlled: 'rin',
  });
  assert.equal(life.pastimes![0].progress, 0);
  advancePastimes(life, actors, 20, 'sakura');
  assert.equal(life.pastimes![0].progress, 0);
  life.minutes += 121;
  advancePastimes(life, actors, 1, 'rin');
  assert.equal(life.pastimes![0].phase, 'cancelled');
  assert.equal(life.belongings.shirou.condition, 60);
});
void test('malformed activities cannot turn unperformed work into a completed save or refer to foreign appointments', () => {
  const { life, actors } = setup();
  actOnPastime(life, actors, 'rin', 'repair-inspect', 'shirou');
  for (const change of [
    { progress: -1 },
    { phase: 'done' },
    { target: 'rin' },
    { choice: 'vegetable' },
    { appointment: 2 },
    { updatedAt: 1e9 },
  ]) {
    const bad = snapshotLife(life, actors);
    Object.assign(bad.pastimes![0], change);
    assert.throws(() => parseDailyLife(bad));
  }
});

void test('the full engine walks both participants to an actual cafe meal without manually completing activities', () => {
  const { life, actors } = setup();
  actOnPastime(life, actors, 'rin', 'prepare-simple', 'shirou');
  actOnPastime(life, actors, 'rin', 'invite', 'shirou');
  playerAppointment(life, actors, 'rin', life.appointments[0].id, 'attend');
  const start = life.minutes,
    trace: unknown[] = [];
  for (let i = 0; i < 1201; i++) {
    advanceDailyLife(life, actors, 0.05, {
      running: true,
      controlled: 'rin',
      speed: 1,
    });
    stepActor(
      actors.find((a) => a.id === 'rin')!,
      0.05,
      undefined,
      55,
    );
    if (i % 100 === 0)
      trace.push({
        time: life.minutes - start,
        a: life.appointments[0].status,
        shared: life.appointments[0].shared,
        shirou: life.people.shirou.activity,
        pos: actors
          .filter((a) => ['rin', 'shirou'].includes(a.id))
          .map(({ id, x, y }) => ({ id, x, y })),
      });
    if (life.pastimes![0].phase === 'done') break;
  }
  assert.equal(life.pastimes![0].phase, 'done', JSON.stringify(trace));
});

void test('three simulated days preserve completed help across bounded journals and backup restore', () => {
  const { life, actors } = setup();
  actOnPastime(life, actors, 'rin', 'repair-inspect', 'shirou');
  finishPlayerRepair(life, actors);
  for (let i = 0; i < 10800; i++)
    advanceDailyLife(life, actors, 0.05, {
      running: true,
      speed: 4,
      controlled: null,
    });
  const backup = createFateBackup({
    ...emptyFateSave(),
    life: snapshotLife(life, actors),
  });
  const restored = readFateBackupText(serializeFateBackup(backup));
  assert.deepEqual(restored.save.life!.pastimes, life.pastimes);
  assert.equal(life.pastimes![0].phase, 'done');
  assert.match(
    lifeTopic(restored.save.life!, 'rin', 'shirou', 'recall').reply,
    /检修/,
  );
  assert.ok(life.events.length <= 80);
});
void test('background time cannot complete a player repair while the player is absent', async () => {
  const { life, actors } = setup();
  life.minutes = 1450;
  life.nextEncounter = 1e9;
  actOnPastime(life, actors, 'rin', 'repair-inspect', 'shirou');
  const before = life.pastimes![0].progress;
  const backup = createFateBackup({
    ...emptyFateSave(),
    life: snapshotLife(life, actors),
  });
  const result = await runBackgroundRound(backup, async () => {
    assert.fail('quiet test must not call paid AI');
  });
  assert.equal(result.save.life!.pastimes![0].progress, before);
  assert.notEqual(result.save.life!.pastimes![0].phase, 'done');
});
void test('changing the era cancels unfinished Waver activities and restores without stale cross-era obligations', () => {
  const { life, actors } = setup();
  Object.assign(
    actors.find((a) => a.id === 'waver')!,
    DISTRICT_PLACES.cafe,
  );
  life.people.waver.activity = null;
  assert.equal(
    actOnPastime(life, actors, 'rin', 'repair-inspect', 'waver').ok,
    true,
  );
  const changed = changeWaverStage(snapshotLife(life, actors), 'adult');
  assert.equal(changed.pastimes![0].phase, 'cancelled');
  assert.ok(parseDailyLife(changed));
  assert.doesNotMatch(
    lifeTopic(changed, 'rin', 'waver', 'recall').reply,
    /那次一起检修/,
  );
});

void test("a full activity journal evicts finished records before another resident's unfinished preparation", () => {
  const { life, actors } = setup();
  actOnPastime(life, actors, 'rin', 'prepare-simple', 'shirou');
  const preparation = life.pastimes![0];
  Object.assign(
    actors.find((a) => a.id === 'sakura')!,
    DISTRICT_PLACES.cafe,
  );
  for (let i = 0; i < 40; i++) {
    assert.equal(
      actOnPastime(life, actors, 'sakura', 'prepare-simple', 'cu').ok,
      true,
    );
    assert.equal(actOnPastime(life, actors, 'sakura', 'cancel', 'cu').ok, true);
  }
  assert.equal(life.pastimes!.length, 32);
  assert.ok(life.pastimes!.includes(preparation));
  const restored = parseDailyLife(
    JSON.parse(JSON.stringify(snapshotLife(life, actors))),
  );
  assert.equal(
    actOnPastime(restored, actors, 'rin', 'invite', 'shirou').ok,
    true,
  );
  assert.equal(
    restored.pastimes!.find((p) => p.id === preparation.id)!.phase,
    'invited',
  );
});

void test('real shared memories still inform recall after completed activities leave the bounded journal', () => {
  const { life, actors } = setup();
  actOnPastime(life, actors, 'rin', 'repair-inspect', 'shirou');
  finishPlayerRepair(life, actors);
  const completedId = life.pastimes![0].id;
  Object.assign(
    actors.find((a) => a.id === 'sakura')!,
    DISTRICT_PLACES.cafe,
  );
  for (let i = 0; i < 40; i++) {
    actOnPastime(life, actors, 'sakura', 'prepare-simple', 'cu');
    actOnPastime(life, actors, 'sakura', 'cancel', 'cu');
  }
  assert.ok(!life.pastimes!.some((p) => p.id === completedId));
  const restored = parseDailyLife(
    JSON.parse(JSON.stringify(snapshotLife(life, actors))),
  );
  assert.match(
    lifeTopic(restored, 'rin', 'shirou', 'recall').reply,
    /一起检修/,
  );
  assert.doesNotMatch(
    lifeTopic(restored, 'sakura', 'shirou', 'recall').reply,
    /一起检修/,
  );
});
