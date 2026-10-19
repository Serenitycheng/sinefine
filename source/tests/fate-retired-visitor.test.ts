import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTOR_IDS, createStreetActors, isActorId } from '../lib/street';
import { STREET_CAST } from '../lib/fate-street-cast';
import { createDailyLife, parseDailyLife } from '../lib/fate-life';
import { emptyFateSave, parseFateSave } from '../lib/fate-state';
import { recordOnsiteConversation } from '../lib/fate-interaction';
import { createFateChatHandler } from '../lib/fate-chat';

void test('the removed identity cannot call chat or incur an AI request', async () => {
  let requests = 0;
  const handler = createFateChatHandler(async () => {
    requests++;
    throw new Error('must not call provider');
  });
  const response = await handler(
    new Request('http://localhost:3000/api/fate/chat', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000' },
      body: JSON.stringify({
        mode: 'chat',
        key: 'fixture-not-real',
        model: 'deepseek-chat',
        speaker: 'admin',
        target: 'kiritsugu',
        message: '早。',
        history: [],
      }),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(requests, 0);
});

void test('the retired visitor is neither a current identity nor a spawned resident', () => {
  assert.equal(isActorId('admin'), false);
  assert.ok(!ACTOR_IDS.some((id) => (id as string) === 'admin'));
  assert.ok(!STREET_CAST.some((person) => (person.id as string) === 'admin'));
  assert.ok(!createStreetActors().some((person) => person.id === 'admin'));
});

void test('old visitor coordinates are discarded without rewriting old conversation authorship or resident progress', () => {
  const old = createDailyLife();
  old.positions.admin = { x: 1160, y: 840 };
  const parsed = parseDailyLife(old);
  assert.equal(parsed.positions.admin, undefined);
  assert.deepEqual(parsed.people, old.people);
  const save = parseFateSave({
    ...emptyFateSave(),
    life: old,
    history: [
      {
        id: 'legacy-visitor',
        createdAt: '2026-10-01T00:00:00.000Z',
        speaker: 'admin',
        target: 'kiritsugu',
        message: '早上好。',
        reply: '早。',
        source: 'preset',
      },
    ],
  });
  assert.equal(save.history[0].speaker, 'admin');
  assert.equal(save.history[0].message, '早上好。');
  assert.equal(save.life?.positions.admin, undefined);
});

void test('a removed identity cannot create new onsite conversations', () => {
  const life = createDailyLife();
  const result = recordOnsiteConversation(life, createStreetActors(), 'admin', {
    id: 'retired-new',
    createdAt: '2026-10-19T00:00:00.000Z',
    speaker: 'admin',
    target: 'kiritsugu',
    message: '早上好。',
    reply: '早。',
    source: 'preset',
  });
  assert.equal(result.ok, false);
  assert.equal(
    life.events.some(
      (event) => event.interaction?.exchangeId === 'retired-new',
    ),
    false,
  );
});
