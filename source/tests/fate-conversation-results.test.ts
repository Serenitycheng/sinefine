import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDailyLife,
  parseDailyLife,
  snapshotLife,
  type LifeEvent,
} from '../lib/fate-life';
import { createStreetActors } from '../lib/street';
import { recordOnsiteConversation } from '../lib/fate-interaction';
import { type Exchange, emptyFateSave, parseFateSave } from '../lib/fate-state';
import { type DialogueTurn } from '../lib/fate-dialogue';
import {
  currentBond,
  rememberEncounter,
  commitSocialDialogue,
  resolveSocialEffects,
  parseSocialEffects,
} from '../lib/fate-social';
import { LIFE_TOPICS, lifeTopic } from '../lib/fate-conversation-presets';
import { STREET_PARTNERS } from '../lib/fate-cast';
import { createFateChatHandler } from '../lib/fate-chat';

function setup() {
  const life = createDailyLife(),
    actors = createStreetActors();
  Object.assign(
    actors.find((a) => a.id === 'rin')!,
    { x: 1600, y: 907 },
  );
  Object.assign(
    actors.find((a) => a.id === 'shirou')!,
    { x: 1630, y: 907 },
  );
  return { life, actors };
}
function exchange(
  message: string,
  reply: string,
  patch: Partial<Exchange> = {},
): Exchange {
  return {
    id: 'manual-result-1',
    speaker: 'rin',
    target: 'shirou',
    message,
    reply,
    source: 'preset',
    createdAt: '2026-10-04T04:00:00Z',
    ...patch,
  };
}
function turns(message: string, reply: string): DialogueTurn[] {
  return [
    { speaker: 'rin', text: message },
    { speaker: 'shirou', text: reply },
  ];
}
function autoEvent(life: ReturnType<typeof createDailyLife>): LifeEvent {
  const event: LifeEvent = {
    id: life.nextId++,
    minute: life.minutes,
    text: '凛与士郎交谈。',
    dialogue: {
      speaker: 'rin',
      target: 'shirou',
      message: '今天怎么样？',
      reply: '还不错。',
      source: 'preset',
    },
  };
  life.events.push(event);
  rememberEncounter(life, event);
  return event;
}

void test('manual and autonomous conversations share care, promises and evidence without changing speaker roles', () => {
  const manual = setup(),
    auto = setup();
  const message = '忙起来也记得休息。一小时后一起在街角咖啡店吃饭，好吗？';
  const reply = '好，约好了。';
  const effects = {
    impressions: [
      { person: 'shirou', kind: 'care', turn: 0, quote: '忙起来也记得休息' },
    ],
  };
  const entry = exchange(message, reply);
  const result = recordOnsiteConversation(
    manual.life,
    manual.actors,
    'rin',
    entry,
    effects,
  );
  assert.equal(result.ok, true);
  assert.equal(result.outcome!.invitation, 'scheduled');
  assert.equal(
    manual.life.events[0].dialogue,
    undefined,
    'manual speech is not autonomous speech',
  );
  assert.equal(manual.life.encounters, 0);
  const event = autoEvent(auto.life);
  const complete = [
    ...turns(message, reply),
    { speaker: 'rin' as const, text: '先把手边的事做好。' },
    { speaker: 'shirou' as const, text: '嗯，一会儿见。' },
  ];
  assert.equal(
    commitSocialDialogue(auto.life, event.id, complete, effects),
    true,
  );
  assert.deepEqual(event.conversation, result.outcome);
  assert.deepEqual(auto.life.appointments, manual.life.appointments);
  const a = currentBond(auto.life, 'rin', 'shirou')!,
    m = currentBond(manual.life, 'rin', 'shirou')!;
  assert.deepEqual(a.warmth, m.warmth);
  assert.deepEqual(a.tension, m.tension);
  assert.deepEqual(a.memories[0].quotes, m.memories[0].quotes);
  assert.equal(a.memories[0].text, m.memories[0].text);
  const save = {
    ...emptyFateSave(),
    life: snapshotLife(manual.life, manual.actors),
    history: [entry],
  };
  assert.deepEqual(parseFateSave(JSON.parse(JSON.stringify(save))), save);
});

void test('a refusal is neutral, changing conditions cannot schedule the old plan, and ordinary small talk needs no effects', () => {
  const cases = [
    ['一小时后一起在街角咖啡店吃饭，好吗？', '不了，我现在没空。', 'declined'],
    ['一小时后一起在街角咖啡店吃饭，好吗？', '好，两小时后去。', 'changed'],
    [
      '一小时后一起在街角咖啡店吃饭，好吗？',
      '好，那我们去林荫路边散步。',
      'changed',
    ],
    [
      '一小时后一起在街角咖啡店吃饭，好吗？',
      '好，不过到时候再看。',
      'unconfirmed',
    ],
    ['明天一起去公园打球，好吗？', '好，明天见。', 'unsupported'],
    ['今天过得怎么样？', '还不错。', undefined],
  ];
  for (const [message, reply, status] of cases) {
    const { life, actors } = setup();
    const result = recordOnsiteConversation(
      life,
      actors,
      'rin',
      exchange(message!, reply!),
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome!.invitation, status);
    assert.equal(life.appointments.length, 0);
    const bond = currentBond(life, 'rin', 'shirou')!;
    assert.deepEqual(bond.warmth, [0, 0]);
    assert.deepEqual(bond.tension, [0, 0]);
    assert.deepEqual(parseDailyLife(life), life);
  }
});

void test('withdrawal or changing a plan later in the same autonomous conversation invalidates the earlier agreement', () => {
  for (const [later, status] of [
    ['算了，我不去了。', 'declined'],
    ['改到卫宫宅吧。', 'changed'],
  ] as const) {
    const { life } = setup(),
      event = autoEvent(life);
    assert.equal(
      commitSocialDialogue(
        life,
        event.id,
        [
          ...turns('一小时后一起在街角咖啡店吃饭，好吗？', '好，约好了。'),
          { speaker: 'rin', text: later },
          { speaker: 'shirou', text: '那就先不安排了。' },
        ],
        undefined,
      ),
      true,
    );
    assert.equal(event.conversation!.invitation, status);
    assert.equal(life.appointments.length, 0);
  }
});

void test('one malformed annotation cannot erase separately proven care or create a promise from partial agreement', () => {
  const text = '记得休息。一小时后一起在街角咖啡店吃饭，好吗？';
  const dialogue = turns(text, '好，但我想先回家。');
  const effects = resolveSocialEffects(
    {
      impressions: [
        { person: 'shirou', kind: 'care', turn: 0, quote: '记得休息' },
        { person: 'rin', kind: 'friction', turn: 0, quote: '记得休息' },
      ],
      promise: {
        activity: 'eat',
        delay: 60,
        proposal: 0,
        acceptance: 1,
        proposalQuote: text,
        acceptanceQuote: '好',
      },
    },
    dialogue,
  );
  assert.deepEqual(effects.impressions, [
    { person: 'shirou', kind: 'care', turn: 0, quote: '记得休息' },
  ]);
  assert.equal(effects.promise, undefined);
});

void test('explicit personal preference uses the correct owner and survives alongside manual history; questions and attributed claims do not', () => {
  const { life, actors } = setup();
  const reply = '我喜欢阅读。';
  const metadata = {
    impressions: [],
    preferences: [
      {
        person: 'shirou',
        kind: 'like',
        subject: '阅读',
        turn: 1,
        quote: reply,
      },
    ],
  };
  const result = recordOnsiteConversation(
    life,
    actors,
    'rin',
    exchange('你喜欢做什么？', reply),
    metadata,
  );
  assert.equal(result.outcome!.effects.preferences![0].person, 'shirou');
  assert.match(result.message, /卫宫士郎说自己喜欢阅读/);
  assert.deepEqual(parseDailyLife(life), life);
  assert.deepEqual(currentBond(life, 'rin', 'shirou')!.warmth, [0, 0]);
  for (const [text, owner, kind] of [
    ['我喜欢阅读。', 'rin', 'like'],
    ['你喜欢阅读吗？', 'shirou', 'like'],
    ['如果我喜欢阅读，就会去。', 'shirou', 'like'],
    ['他说：“我喜欢阅读。”', 'shirou', 'like'],
    ['我不喜欢阅读。', 'shirou', 'like'],
  ])
    assert.deepEqual(
      resolveSocialEffects(
        {
          impressions: [],
          preferences: [
            {
              person: owner,
              kind,
              subject: '阅读',
              turn: 1,
              quote: '我喜欢阅读。',
            },
          ],
        },
        turns('聊聊日常。', text),
      ).preferences,
      undefined,
    );
  const dislike = parseSocialEffects(
    {
      impressions: [],
      preferences: [
        {
          person: 'shirou',
          kind: 'dislike',
          subject: '阅读',
          turn: 1,
          quote: '我不喜欢阅读。',
        },
      ],
    },
    turns('聊聊日常。', '我不喜欢阅读。'),
  );
  assert.equal(dislike.preferences![0].kind, 'dislike');
});

void test('duplicate requests, a changed player, leaving the scene and stale autonomous replies cannot double-apply effects', () => {
  const { life, actors } = setup();
  const data = lifeTopic(life, 'rin', 'shirou', 'care');
  const entry = exchange(data.message, data.reply);
  assert.equal(
    recordOnsiteConversation(life, actors, 'rin', entry, data.effects).ok,
    true,
  );
  const before = structuredClone(life);
  assert.equal(
    recordOnsiteConversation(life, actors, 'rin', entry, data.effects).ok,
    false,
  );
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'rin',
      { ...entry, id: 'another-id' },
      data.effects,
    ).ok,
    false,
  );
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'illya',
      { ...entry, id: 'late' },
      data.effects,
    ).ok,
    false,
  );
  actors.find((a) => a.id === 'shirou')!.x += 500;
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'rin',
      { ...entry, id: 'left' },
      data.effects,
    ).ok,
    false,
  );
  assert.deepEqual(life, before);
  const automatic = setup();
  const event = autoEvent(automatic.life);
  automatic.life.minutes += 2;
  const stale = structuredClone(automatic.life);
  assert.equal(
    commitSocialDialogue(
      automatic.life,
      event.id,
      [...turns(data.message, data.reply), ...turns('明天见。', '嗯。')],
      data.effects,
    ),
    false,
  );
  assert.deepEqual(automatic.life, stale);
});

void test('care has a daily limit, and already promised or resting-hour appointments remain unscheduled', () => {
  const { life, actors } = setup();
  const care = lifeTopic(life, 'rin', 'shirou', 'care');
  for (let i = 0; i < 4; i++) {
    life.minutes += 3;
    recordOnsiteConversation(
      life,
      actors,
      'rin',
      exchange(care.message, care.reply, { id: `care-${i}` }),
      care.effects,
    );
  }
  const bond = currentBond(life, 'rin', 'shirou')!;
  assert.equal(bond.changes, 2);
  assert.ok(Math.max(...bond.warmth) <= 2);
  const accepted = lifeTopic(life, 'rin', 'shirou', 'eat');
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'rin',
      exchange(accepted.message, accepted.reply, { id: 'first-date' }),
    ).outcome!.invitation,
    'scheduled',
  );
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'rin',
      exchange('一小时后一起在街角咖啡店看书，好吗？', '好，约好了。', {
        id: 'busy-date',
      }),
    ).outcome!.invitation,
    'busy',
  );
  assert.equal(life.appointments.length, 1);
  const late = setup();
  late.life.minutes = 1290;
  assert.equal(
    recordOnsiteConversation(
      late.life,
      late.actors,
      'rin',
      exchange('一小时后一起在街角咖啡店吃饭，好吗？', '好，约好了。'),
    ).outcome!.invitation,
    'outside-hours',
  );
  assert.equal(late.life.appointments.length, 0);
});

void test('authored presets cover every resident, respect current needs and future classes, and do not charge for dialogue', () => {
  for (const target of STREET_PARTNERS) {
    const life = createDailyLife();
    const speaker = target === 'rin' ? 'shirou' : 'rin';
    for (const topic of LIFE_TOPICS) {
      const data = lifeTopic(life, speaker, target, topic.id);
      const effects = resolveSocialEffects(data.effects, [
        { speaker, text: data.message },
        { speaker: target, text: data.reply },
      ]);
      if (topic.id === 'preference')
        assert.equal(effects.preferences?.[0].person, target);
      if (['walk', 'read', 'eat'].includes(topic.id))
        assert.ok(effects.promise, `${target}: ${topic.id}: ${data.reply}`);
    }
    life.people[target].hunger = 90;
    const refused = lifeTopic(life, speaker, target, 'read');
    assert.match(refused.reply, /不了/);
    assert.equal(
      resolveSocialEffects(refused.effects, [
        { speaker, text: refused.message },
        { speaker: target, text: refused.reply },
      ]).promise,
      undefined,
    );
  }
  const life = createDailyLife();
  life.minutes = 450;
  assert.match(lifeTopic(life, 'rin', 'shirou', 'read').reply, /课业/);
});

void test('saved feedback cannot detach from its evidence or fabricate a scheduled invitation; neutral old saves still load', () => {
  const { life, actors } = setup();
  recordOnsiteConversation(
    life,
    actors,
    'rin',
    exchange('今天怎么样？', '还不错。'),
  );
  const changed = structuredClone(life);
  changed.events[0].conversation!.invitation = 'scheduled';
  assert.throws(() => parseDailyLife(changed));
  changed.events[0].conversation = {
    effects: {
      impressions: [
        { person: 'shirou', kind: 'care', turn: 0, quote: '伪造的关心' },
      ],
    },
  };
  assert.throws(() => parseDailyLife(changed));
  const old = structuredClone(life);
  delete old.events[0].conversation;
  assert.deepEqual(parseDailyLife(old), old);
});

void test('admin visits preserve dialogue without inventing a resident bond or allowing annotations to masquerade as resident speech', () => {
  const { life, actors } = setup();
  Object.assign(
    actors.find((a) => a.id === 'admin')!,
    { x: 1600, y: 907 },
  );
  const entry = exchange('记得休息。', '谢谢。', { speaker: 'admin' });
  const result = recordOnsiteConversation(life, actors, 'admin', entry, {
    impressions: [
      { person: 'shirou', kind: 'care', turn: 0, quote: entry.message },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.outcome, undefined);
  assert.deepEqual(life.bonds, {});
});

void test('manual AI returns one reply and proven effects in a single call; plain-text legacy answers remain readable', async () => {
  for (const structured of [true, false]) {
    let calls = 0;
    let sent: Record<string, unknown> = {};
    const reply = '好，约好了。';
    const fetcher: typeof fetch = async (_input, init) => {
      calls++;
      assert.equal(typeof init?.body, 'string');
      sent = JSON.parse(init!.body as string);
      return Response.json({
        choices: [
          {
            message: {
              content: structured
                ? JSON.stringify({ reply, effects: { impressions: [] } })
                : reply,
            },
          },
        ],
        usage: { total_tokens: 33 },
      });
    };
    const handler = createFateChatHandler(fetcher);
    const response = await handler(
      new Request('http://localhost:3000/api/fate/chat', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000' },
        body: JSON.stringify({
          mode: 'chat',
          key: 'fixture-not-a-real-key',
          model: 'deepseek-chat',
          speaker: 'rin',
          target: 'shirou',
          message: '一小时后一起在街角咖啡店吃饭，好吗？',
          history: [],
          socialEffects: true,
        }),
      }),
    );
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.reply, reply);
    assert.equal(data.effects.promise.activity, 'eat');
    assert.deepEqual(sent.response_format, { type: 'json_object' });
    assert.equal(calls, 1);
    assert.equal(data.tokens, 33);
    assert.equal(
      JSON.stringify(data).includes('fixture-not-a-real-key'),
      false,
    );
  }
});

void test('annotated AI still rejects confused identities and malformed structured replies without a second paid retry', async () => {
  for (const content of [
    JSON.stringify({ reply: '我是切嗣。', effects: { impressions: [] } }),
    '{"reply":',
    JSON.stringify({ reply: '' }),
  ]) {
    let calls = 0;
    const handler = createFateChatHandler(async () => {
      calls++;
      return Response.json({ choices: [{ message: { content } }] });
    });
    const response = await handler(
      new Request('http://localhost:3000/api/fate/chat', {
        method: 'POST',
        headers: { Origin: 'http://localhost:3000' },
        body: JSON.stringify({
          mode: 'chat',
          key: 'fixture-not-a-real-key',
          model: 'deepseek-chat',
          speaker: 'kiritsugu',
          target: 'shirou',
          message: '今天怎么样？',
          history: [],
          socialEffects: true,
        }),
      }),
    );
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
  }
});
