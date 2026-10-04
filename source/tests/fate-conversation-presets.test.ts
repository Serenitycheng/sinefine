import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDailyLife,
  parseDailyLife,
  type DailyLife,
  type LifeEvent,
} from '../lib/fate-life';
import { lifeTopic } from '../lib/fate-conversation-presets';
import { rememberEncounter, type SocialEffects } from '../lib/fate-social';
import { knownPreferences } from '../lib/fate-memory-behavior';

function record(life: DailyLife, reply: string, effects: SocialEffects) {
  const e: LifeEvent = {
    id: life.nextId++,
    minute: life.minutes,
    text: '凛与士郎交谈。',
    dialogue: {
      speaker: 'rin',
      target: 'shirou',
      source: 'preset',
      message: '有空的时候，你更喜欢做什么？',
      reply,
    },
  };
  life.events.push(e);
  rememberEncounter(life, e, effects);
}

function preference(
  life: DailyLife,
  subject: string,
  kind: 'like' | 'dislike',
) {
  const quote = `我${kind === 'dislike' ? '不' : ''}喜欢${subject}。`;
  record(life, quote, {
    impressions: [],
    preferences: [{ person: 'shirou', subject, kind, quote, turn: 1 }],
  });
}

void test('asking about interests respects explicit dislikes and reuses remembered likes after save restore', () => {
  const life = createDailyLife();
  const initial = lifeTopic(life, 'rin', 'shirou', 'preference').effects
    .preferences![0].subject;
  preference(life, initial, 'dislike');
  const answered = lifeTopic(life, 'rin', 'shirou', 'preference');
  assert.notEqual(answered.effects.preferences![0].subject, initial);
  record(life, answered.reply, answered.effects);
  assert.equal(
    knownPreferences(life, 'rin', 'shirou').find((p) => p.subject === initial)!
      .preference,
    'dislike',
  );
  preference(life, '阅读', 'like');
  const restored = parseDailyLife(JSON.parse(JSON.stringify(life)));
  assert.equal(
    lifeTopic(restored, 'rin', 'shirou', 'preference').reply,
    '我喜欢阅读。',
  );
  assert.equal(knownPreferences(restored, 'sakura', 'shirou').length, 0);
});

void test('declining every authored interest does not invent a new like to answer the same question', () => {
  const life = createDailyLife();
  for (const subject of [
    '散步',
    '阅读',
    '逛小店',
    '整理笔记',
    '料理',
    '修理日常器具',
  ])
    preference(life, subject, 'dislike');
  const answer = lifeTopic(life, 'rin', 'shirou', 'preference');
  assert.match(answer.reply, /没有特别想做/);
  assert.equal(answer.effects.preferences, undefined);
  record(life, answer.reply, answer.effects);
  assert.equal(
    knownPreferences(life, 'rin', 'shirou').filter(
      (p) => p.preference === 'dislike',
    ).length,
    6,
  );
});
