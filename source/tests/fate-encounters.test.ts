import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STREET_PARTNERS } from '../lib/fate-cast';
import { varyEncounter } from '../lib/fate-encounter-variation';
import {
  advanceDailyLife,
  changeWaverStage,
  createDailyLife,
  encounterDialogue,
  parseDailyLife,
  snapshotLife,
  type DailyLife,
  type LifeDialogue,
} from '../lib/fate-life';
import {
  commitSocialDialogue,
  currentBond,
  rememberEncounter,
} from '../lib/fate-social';
import { createStreetActors } from '../lib/street';

const street = { indoors: false, dining: false };
function remember(life: DailyLife, dialogue: LifeDialogue) {
  const event = {
    id: life.nextId++,
    minute: life.minutes,
    text: '停下来聊了几句。',
    dialogue,
  };
  life.events.push(event);
  life.encounters++;
  life.lastEncounters[[dialogue.speaker, dialogue.target].sort().join('|')] =
    life.minutes;
  rememberEncounter(life, event);
  return event;
}

void test('every resident pair keeps its first opening, then avoids recent lines in either direction', () => {
  for (const stage of ['young', 'adult'] as const) {
    for (const [index, a] of STREET_PARTNERS.entries()) {
      for (const b of STREET_PARTNERS.slice(index + 1)) {
        const life = createDailyLife();
        life.waverStage = stage;
        const recent: LifeDialogue[] = [];
        for (let n = 0; n < 8; n++) {
          const base =
            n % 2
              ? encounterDialogue(b, a, stage)
              : encounterDialogue(a, b, stage);
          const chosen = varyEncounter(life, base, street);
          if (n === 0) assert.deepEqual(chosen, base);
          assert.equal(chosen.speaker, base.speaker);
          assert.equal(chosen.target, base.target);
          assert.equal(chosen.source, 'preset');
          assert.equal(chosen.turns, undefined);
          for (const previous of recent.slice(-2)) {
            assert.notEqual(
              chosen.message,
              previous.message,
              `${a}/${b}/${stage}/${n}`,
            );
            assert.notEqual(
              chosen.reply,
              previous.reply,
              `${a}/${b}/${stage}/${n}`,
            );
          }
          assert.ok(chosen.message.length <= 120);
          assert.ok(chosen.reply.length <= 120);
          remember(life, chosen);
          recent.push(chosen);
        }
        assert.deepEqual(
          parseDailyLife(JSON.parse(JSON.stringify(life))),
          life,
        );
      }
    }
  }
});

void test('pair memories prevent immediate repetition after older events leave the save window', () => {
  const life = createDailyLife();
  const base = encounterDialogue('rin', 'shirou');
  remember(life, base);
  life.events = [];
  const loaded = parseDailyLife(JSON.parse(JSON.stringify(life)));
  assert.notEqual(varyEncounter(loaded, base, street).message, base.message);
  // Other people's recent conversations do not consume this pair's opening.
  const unrelated = encounterDialogue('cu', 'diarmuid');
  assert.deepEqual(varyEncounter(loaded, unrelated, street), unrelated);
});

void test('Waver eras and reset cutoffs isolate history without erasing shared non-Waver memories', () => {
  const life = createDailyLife();
  const young = encounterDialogue('waver', 'iskandar');
  remember(life, young);
  const shared = encounterDialogue('rin', 'shirou');
  remember(life, shared);
  const adult = changeWaverStage(life, 'adult');
  const adultBase = encounterDialogue('waver', 'iskandar', 'adult');
  assert.deepEqual(varyEncounter(adult, adultBase, street), adultBase);
  assert.notEqual(varyEncounter(adult, shared, street).message, shared.message);
  const bond = currentBond(adult, 'rin', 'shirou')!;
  bond.cutoff = adult.nextId;
  assert.deepEqual(varyEncounter(adult, shared, street), shared);
});

void test('repeat openings use the current meal, home or time context and family address', () => {
  for (const [context, expected] of [
    [{ indoors: true, dining: true }, /爸爸，吃饭/],
    [{ indoors: true, dining: false }, /爸爸，在屋里/],
    [street, /爸爸，天色渐晚/],
  ] as const) {
    const life = createDailyLife();
    life.minutes = 1150;
    const base = encounterDialogue('illya', 'kiritsugu');
    remember(life, base);
    const chosen = varyEncounter(life, base, context);
    assert.match(chosen.message, expected);
    assert.equal(chosen.speaker, 'illya');
    assert.equal(chosen.target, 'kiritsugu');
    assert.ok(chosen.reply.length < 40, 'Kiritsugu remains brief');
  }
});

void test('the real daily engine varies a repeated meeting and keeps the result reloadable', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  for (const id of STREET_PARTNERS) {
    const talking = id === 'cu' || id === 'diarmuid';
    life.people[id].activity = {
      kind: talking ? 'walk' : 'sleep',
      phase: 'doing',
      remaining: 1000,
      reason: talking ? '沿街走走' : '正在休息',
      source: 'rules',
    };
    if (talking)
      Object.assign(
        actors.find((actor) => actor.id === id)!,
        { x: 1160, y: 840 },
      );
  }
  life.nextEncounter = life.minutes;
  const first = advanceDailyLife(life, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: 'admin',
  });
  assert.ok(first?.dialogue);
  life.minutes += 101;
  const second = advanceDailyLife(life, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: 'admin',
  });
  assert.ok(second?.dialogue);
  assert.notEqual(second.dialogue.message, first.dialogue.message);
  assert.notEqual(second.dialogue.reply, first.dialogue.reply);
  assert.deepEqual(
    parseDailyLife(snapshotLife(life, actors)),
    snapshotLife(life, actors),
  );
});

void test('a varied local transcript can still be replaced by AI exactly once without creating effects', () => {
  const life = createDailyLife();
  const base = encounterDialogue('rin', 'shirou');
  remember(life, base);
  const varied = varyEncounter(life, base, street);
  const event = remember(life, varied);
  const turns = [
    { speaker: varied.speaker, text: '士郎，先听我说完这一件事。' },
    { speaker: varied.target, text: '嗯，我在听。' },
    { speaker: varied.speaker, text: '只是想问问，你自己有什么打算。' },
    { speaker: varied.target, text: '那我也认真想一想。' },
  ];
  assert.equal(commitSocialDialogue(life, event.id, turns, undefined), true);
  assert.deepEqual(event.dialogue?.turns, turns);
  assert.equal(event.dialogue?.source, 'deepseek');
  assert.equal(commitSocialDialogue(life, event.id, turns, undefined), false);
  assert.equal(life.appointments.length, 0);
  assert.equal(
    currentBond(life, 'rin', 'shirou')!.memories.at(-1)?.source,
    'deepseek',
  );
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(life))), life);
});
