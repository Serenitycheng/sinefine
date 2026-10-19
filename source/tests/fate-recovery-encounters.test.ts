import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LEGACY_STREET_PARTNERS,
  STREET_PARTNERS,
  TOPICS,
  type PartnerId,
} from '../lib/fate-cast';
import { varyEncounter } from '../lib/fate-encounter-variation';
import {
  advanceDailyLife,
  createDailyLife,
  encounterDialogue,
  type LifeDialogue,
} from '../lib/fate-life';
import { FATE_HOMES, homeOf, type HomeId } from '../lib/fate-housing';
import { createStreetActors } from '../lib/street';
import { recoveryEncounter } from '../lib/fate-recovery-encounters';
import { RECOVERY_IDS, RECOVERY_PRESETS } from '../lib/fate-recovery-presets';
import { familyTopic, relationshipContext } from '../lib/fate-relationships';

void test('all 210 resident pairs have complete local dialogue in either era and input order', () => {
  assert.equal(STREET_PARTNERS.length, 21);
  for (const stage of ['young', 'adult'] as const) {
    let pairs = 0;
    let restoredPairs = 0;
    for (const [index, a] of STREET_PARTNERS.entries()) {
      assert.equal(recoveryEncounter(a, a, stage), undefined);
      for (const b of STREET_PARTNERS.slice(index + 1)) {
        pairs++;
        const legacyPair = [a, b].every((id) =>
          (LEGACY_STREET_PARTNERS as readonly string[]).includes(id),
        );
        if (!legacyPair) restoredPairs++;
        for (const [first, second] of [
          [a, b],
          [b, a],
        ] as const) {
          const added = recoveryEncounter(first, second, stage);
          assert.equal(added === undefined, legacyPair);
          const dialogue = encounterDialogue(first, second, stage);
          assert.deepEqual(
            [dialogue.speaker, dialogue.target].sort(),
            [a, b].sort(),
          );
          assert.equal(dialogue.source, 'preset');
          for (const line of [dialogue.message, dialogue.reply]) {
            assert.ok(line.trim().length > 0 && line.length <= 120);
            assert.doesNotMatch(line, /undefined|null|\[object Object\]/);
          }
          if (added) {
            assert.deepEqual(dialogue, added);
            assert.equal(
              dialogue.waverStage,
              [a, b].includes('waver') ? stage : undefined,
            );
          }
        }
      }
    }
    assert.equal(pairs, 210);
    assert.equal(restoredPairs, 119);
  }
});

void test('seven restored residents each have three distinct local topic replies', () => {
  assert.equal(RECOVERY_IDS.length, 7);
  for (const id of RECOVERY_IDS) {
    const replies = TOPICS.map(({ id: topic }) => RECOVERY_PRESETS[id][topic]);
    assert.equal(new Set(replies).size, 3);
    assert.ok(replies.every((line) => line.length > 10));
  }
});

void test('relationship prompts cover all residents without inventing intimacy for unfamiliar pairs', () => {
  for (const speaker of STREET_PARTNERS) {
    for (const target of STREET_PARTNERS) {
      if (speaker === target) continue;
      const context = relationshipContext(speaker, target);
      assert.ok(context.发起者口吻.length > 0);
      assert.ok(context.回应者口吻.length > 0);
      assert.ok(context.发起者兴趣.length > 0);
      assert.ok(context.回应者兴趣.length > 0);
      assert.ok(context.发起者对回应者.length > 0);
      assert.ok(context.回应者对发起者.length > 0);
    }
  }
  const unfamiliar = relationshipContext('natalia', 'kuzuki');
  assert.match(unfamiliar.关系, /未明确的亲密、仇恨或秘密不自行添加/);
  assert.match(
    relationshipContext('natalia', 'medusa').关系,
    /未明确的亲密、仇恨或秘密不自行添加/,
  );
});

void test('important restored relationships retain family roles, distance and independent identities', () => {
  assert.match(relationshipContext('tokiomi', 'rin').关系, /父女/);
  assert.match(relationshipContext('sakura', 'tokiomi').发起者对回应者, /父亲/);
  assert.match(relationshipContext('tokiomi', 'sakura').关系, /不能.*自动和解/);
  assert.match(
    relationshipContext('sakura', 'kariya').发起者对回应者,
    /雁夜叔叔/,
  );
  assert.match(relationshipContext('kirei', 'tokiomi').发起者对回应者, /老师/);
  assert.match(
    relationshipContext('natalia', 'kiritsugu').关系,
    /养母与养子、师父与学生/,
  );
  assert.match(relationshipContext('kirei', 'rin').关系, /并非凛的父亲/);
  assert.match(relationshipContext('sakura', 'medusa').发起者对回应者, /Rider/);
  assert.match(relationshipContext('rin', 'emiya').发起者对回应者, /Archer/);
  assert.match(relationshipContext('emiya', 'shirou').关系, /两个独立行动的人/);
  assert.match(
    relationshipContext('shirou', 'emiya').发起者对回应者,
    /秘密不默认/,
  );
  assert.match(
    relationshipContext('gilgamesh', 'saber').关系,
    /未设定.*恋爱关系/,
  );
  // Existing branch decisions survive expanding the cast.
  assert.match(relationshipContext('rin', 'shirou').关系, /已确认的情侣/);
  assert.match(familyTopic('rin', 'shirou', 'greeting')!.reply, /远坂/);
  assert.match(familyTopic('illya', 'kiritsugu', 'street')!.message, /爸爸/);
});

void test('new important encounters speak with the right roles and preserve personal choices', () => {
  const cases: [PartnerId, PartnerId, RegExp, RegExp][] = [
    ['tokiomi', 'rin', /凛/, /父亲.*自己来决定/],
    ['tokiomi', 'sakura', /樱/, /父亲.*需要一点时间/],
    ['kariya', 'sakura', /樱/, /雁夜叔叔/],
    ['medusa', 'sakura', /由你来选/, /Rider/],
    ['rin', 'emiya', /Archer/, /凛/],
    ['emiya', 'shirou', /卫宫士郎/, /Archer.*自己判断/],
    ['natalia', 'kiritsugu', /切嗣/, /娜塔莉亚/],
    ['tokiomi', 'kirei', /绮礼/, /老师/],
    ['gilgamesh', 'saber', /骑士王/, /由我自己决定/],
  ];
  for (const [a, b, message, reply] of cases) {
    const dialogue = encounterDialogue(a, b);
    assert.equal(dialogue.speaker, a);
    assert.equal(dialogue.target, b);
    assert.match(dialogue.message, message);
    assert.match(dialogue.reply, reply);
    assert.deepEqual(encounterDialogue(b, a), dialogue);
  }
});

void test('repeat variants retain restored family and class names in both speaking directions', () => {
  const cases: [PartnerId, PartnerId, string][] = [
    ['rin', 'tokiomi', '父亲'],
    ['sakura', 'tokiomi', '父亲'],
    ['sakura', 'kariya', '雁夜叔叔'],
    ['sakura', 'medusa', 'Rider'],
    ['rin', 'emiya', 'Archer'],
    ['shirou', 'emiya', 'Archer'],
    ['emiya', 'shirou', '卫宫士郎'],
    ['kirei', 'tokiomi', '老师'],
    ['kiritsugu', 'natalia', '娜塔莉亚'],
    ['natalia', 'kiritsugu', '切嗣'],
    ['tokiomi', 'gilgamesh', '王'],
    ['gilgamesh', 'saber', '骑士王'],
  ];
  for (const [speaker, target, address] of cases) {
    const life = createDailyLife();
    const base: LifeDialogue = {
      speaker,
      target,
      message: '现在有空吗？',
      reply: '有空。',
      source: 'preset',
    };
    life.events.push({
      id: life.nextId++,
      minute: life.minutes,
      text: '聊了几句。',
      dialogue: base,
    });
    const result = varyEncounter(life, base, { indoors: false, dining: false });
    assert.ok(result.message.startsWith(`${address}，`));
    assert.ok(result.reply.length > 0);
    assert.notEqual(result.message, base.message);
    assert.notEqual(result.reply, base.reply);
  }
});

void test('new encounters with Waver use the selected era without teaching memories in youth', () => {
  for (const id of RECOVERY_IDS) {
    const young = recoveryEncounter(id, 'waver', 'young')!;
    const adult = recoveryEncounter(id, 'waver', 'adult')!;
    assert.equal(young.target, 'waver');
    assert.equal(adult.target, 'waver');
    assert.notEqual(young.reply, adult.reply);
    assert.doesNotMatch(young.reply, /学生|教课|教授|二世/);
    assert.equal(young.waverStage, 'young');
    assert.equal(adult.waverStage, 'adult');
  }
});

function meetAtHome(a: PartnerId, b: PartnerId, home: HomeId, dining: boolean) {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = dining ? 1100 : 1000;
  life.nextEncounter = life.minutes;
  const mealId = `0:dinner:${home}`;
  if (dining)
    life.meals.push({
      id: mealId,
      home,
      day: 0,
      slot: 'dinner',
      cook: a,
      phase: 'ready',
      startedAt: 1080,
      expiresAt: 1230,
      participants: [a, b],
    });
  for (const id of STREET_PARTNERS) {
    const talking = id === a || id === b;
    life.people[id].activity = {
      kind: talking ? (dining ? 'eat' : 'rest') : 'sleep',
      phase: 'doing',
      home: talking ? home : homeOf(id, life.housing),
      remaining: 100,
      reason: talking ? '在家休息用餐。' : '正在休息。',
      source: 'rules',
      ...(talking && dining ? { meal: mealId, waiting: false } : {}),
    };
    if (talking)
      Object.assign(
        actors.find((actor) => actor.id === id)!,
        FATE_HOMES[home],
      );
  }
  const event = advanceDailyLife(life, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: 'admin',
  });
  assert.ok(event?.dialogue);
  assert.match(event.text, dining ? /一边吃饭/ : /停下来聊了几句/);
  assert.ok(event.text.includes(`在${FATE_HOMES[home].name}`));
  return event.dialogue;
}

void test('the daily engine preserves restored father-daughter and Rider dialogue at home and at the table', () => {
  for (const dining of [false, true]) {
    const father = meetAtHome('tokiomi', 'rin', 'tohsaka', dining);
    assert.deepEqual(father, encounterDialogue('tokiomi', 'rin'));
    assert.match(father.reply, /父亲.*自己来决定/);
    const rider = meetAtHome('medusa', 'sakura', 'matou', dining);
    assert.deepEqual(rider, encounterDialogue('medusa', 'sakura'));
    assert.match(rider.reply, /Rider/);
  }
});

void test('new residents use indoor versions of shop and street-specific conversation while at home', () => {
  for (const dining of [false, true]) {
    const kings = meetAtHome('gilgamesh', 'iskandar', 'waver', dining);
    assert.match(kings.message, /征服王/);
    assert.doesNotMatch(kings.message, /寻常店铺也值得你如此留意/);
    assert.match(kings.reply, /休息/);
    const reader = meetAtHome('shirou', 'medusa', 'emiya', dining);
    assert.match(reader.message, /Rider/);
    assert.doesNotMatch(reader.message, /街角/);
    assert.match(reader.reply, /士郎/);
  }
});
