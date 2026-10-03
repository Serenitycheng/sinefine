import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFateChatHandler, FateConnectionError } from '../lib/fate-chat';
import { createDailyLife, lifeScene } from '../lib/fate-life';

const localKey = 'test-local-key-only';
const cloudKey = 'test-cloud-key-only';
const url = 'http://localhost:3000/api/fate/chat';

function chatBody(overrides: Record<string, unknown> = {}) {
  return {
    key: localKey,
    mode: 'chat',
    model: 'deepseek-chat',
    speaker: 'shirou',
    target: 'rin',
    message: '今天想去哪里？',
    history: [],
    ...overrides,
  };
}

function request(body: unknown, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  if (!headers.has('Origin')) headers.set('Origin', 'http://localhost:3000');
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
    headers,
  });
}

function answer(content: unknown, tokens: unknown = 42) {
  return Response.json({
    choices: [{ message: { content } }],
    usage: { total_tokens: tokens },
  });
}

function stubFetch(respond: () => Response = () => answer('那就去书店吧。')) {
  const calls: { input: string; init: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({
      input: input instanceof Request ? input.url : input.toString(),
      init: init ?? {},
    });
    return respond();
  };
  return { fetcher, calls };
}

function bodyText(init: RequestInit) {
  assert.ok(typeof init.body === 'string');
  return init.body;
}

type CompletionRequest = {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  response_format?: { type: string };
};

void test('model validation returns supported model IDs and disables response caching', async () => {
  const { fetcher, calls } = stubFetch(() =>
    Response.json({
      data: [
        { id: 'deepseek-chat' },
        { id: 'deepseek-reasoner' },
        { id: 123 },
        {},
        { id: 'x'.repeat(101) },
      ],
    }),
  );
  const response = await createFateChatHandler(fetcher)(
    request({ mode: 'test', key: localKey }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    models: ['deepseek-chat', 'deepseek-reasoner'],
  });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('vary'), 'Cookie');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, 'https://api.deepseek.com/models');
  assert.equal(
    new Headers(calls[0].init.headers).get('authorization'),
    `Bearer ${localKey}`,
  );
});

void test('manual chat includes the new title, saved context and both history directions without exposing the key', async () => {
  const { fetcher, calls } = stubFetch(() => answer('  那就去书店吧。  '));
  const response = await createFateChatHandler(fetcher)(
    request(
      chatBody({
        worldNote: '今天是雨后的休息日。',
        characterNotes: { rin: '想找一本新书。', shirou: '已经忙完家务。' },
        relationshipNotes: { rin: '和士郎约好慢慢散步。' },
        scene: lifeScene(createDailyLife(), 'rin'),
        history: [
          {
            speaker: 'shirou',
            target: 'rin',
            message: '家务做好了。',
            reply: '那就休息一下。',
          },
          {
            speaker: 'rin',
            target: 'shirou',
            message: '带伞了吗？',
            reply: '带好了。',
          },
        ],
      }),
    ),
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.reply, '那就去书店吧。');
  assert.equal(result.model, 'deepseek-chat');
  assert.equal(result.tokens, 42);
  assert.match(result.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(calls[0].input, 'https://api.deepseek.com/chat/completions');
  assert.equal(calls[0].init.method, 'POST');
  const sent = JSON.parse(bodyText(calls[0].init)) as CompletionRequest;
  assert.equal(sent.model, 'deepseek-chat');
  assert.equal(sent.stream, false);
  assert.match(sent.messages[0].content, /SINE FINE｜无终之庭/);
  assert.doesNotMatch(sent.messages[0].content, /无中之庭/);
  assert.match(sent.messages[0].content, /凛与士郎在本分支已是情侣/);
  const contextText = sent.messages[1].content;
  assert.match(contextText, /今天是雨后的休息日/);
  assert.match(contextText, /想找一本新书/);
  assert.match(contextText, /已经忙完家务/);
  assert.match(contextText, /和士郎约好慢慢散步/);
  assert.match(contextText, /当前时间/);
  assert.deepEqual(sent.messages.slice(2, -2), [
    { role: 'user', content: '【卫宫士郎（shirou）的历史发言】家务做好了。' },
    { role: 'assistant', content: '【远坂凛（rin）的历史发言】那就休息一下。' },
    { role: 'assistant', content: '【远坂凛（rin）的历史发言】带伞了吗？' },
    { role: 'user', content: '【卫宫士郎（shirou）的历史发言】带好了。' },
  ]);
  assert.equal(sent.messages.at(-2)!.role, 'system');
  assert.match(sent.messages.at(-2)!.content, /只扮演回复者远坂凛（rin）/);
  assert.equal(
    sent.messages.at(-1)!.content,
    '【卫宫士郎（shirou）现在说】今天想去哪里？',
  );
  assert.equal(bodyText(calls[0].init).includes(localKey), false);
  assert.equal(JSON.stringify(result).includes(localKey), false);
});

void test('Emiya father and son retain responder identity, directional voice and attributed history in both directions', async () => {
  for (const [speaker, target, reply, roleName, otherName, voice] of [
    [
      'kiritsugu',
      'shirou',
      '老爹，先回家吧。我去热一下饭。',
      '卫宫士郎',
      '卫宫切嗣',
      '坦率、认真',
    ],
    [
      'shirou',
      'kiritsugu',
      '……士郎，你也歇一会儿吧。',
      '卫宫切嗣',
      '卫宫士郎',
      '寡言、克制',
    ],
  ]) {
    const history = [
      { speaker, target, message: '你是谁？', reply: `我是${otherName}。` },
    ];
    const before = structuredClone(history);
    const { fetcher, calls } = stubFetch(() => answer(reply));
    const response = await createFateChatHandler(fetcher)(
      request(
        chatBody({ speaker, target, history, message: '我才是你爸爸。' }),
      ),
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reply, reply);
    const sent = JSON.parse(bodyText(calls[0].init)) as CompletionRequest;
    const context = JSON.parse(
      sent.messages[1].content.slice('以下为虚构背景资料：'.length),
    );
    assert.equal(context.角色.id, target);
    assert.equal(context.交谈对象.id, speaker);
    assert.match(
      context.双方关系与表达.回应者对发起者,
      target === 'shirou' ? /士郎是切嗣的养子/ : /切嗣是士郎的养父/,
    );
    for (const binding of [sent.messages[0], sent.messages.at(-2)!]) {
      assert.equal(binding.role, 'system');
      assert.ok(
        binding.content.includes(`只扮演回复者${roleName}（${target}）`),
      );
      assert.ok(
        binding.content.includes(`交谈对象是${otherName}（${speaker}）`),
      );
      assert.ok(binding.content.includes(voice));
    }
    assert.ok(
      !sent.messages.some(
        (m) => m.role === 'assistant' && m.content.includes(`我是${otherName}`),
      ),
    );
    assert.deepEqual(
      history,
      before,
      'bad saved replies are excluded from the prompt without deleting history',
    );
    assert.ok(
      sent.messages
        .at(-1)!
        .content.startsWith(`【${otherName}（${speaker}）现在说】`),
    );
    assert.equal(calls.length, 1, 'no extra paid retry');
  }
});

void test('explicit swapped Emiya self-introductions are rejected without blocking correct kinship or questions', async () => {
  for (const [target, speaker, text, status] of [
    ['shirou', 'kiritsugu', '（看了你一眼）我是切嗣。先跟我回去。', 502],
    ['kiritsugu', 'shirou', '我是卫宫士郎。', 502],
    ['shirou', 'kiritsugu', '我是切嗣的养子。老爹，回去吧。', 200],
    ['shirou', 'kiritsugu', '我是切嗣吗？老爹，你在开玩笑吧。', 200],
  ] as const) {
    const { fetcher, calls } = stubFetch(() => answer(text));
    const response = await createFateChatHandler(fetcher)(
      request(chatBody({ target, speaker })),
    );
    assert.equal(response.status, status, text);
    const result = await response.json();
    if (status === 502) {
      assert.match(result.error, /混淆了人物身份/);
      assert.equal(result.reply, undefined);
    } else assert.equal(result.reply, text);
    assert.equal(calls.length, 1);
  }
});

void test('autonomous father-son dialogue binds both speaker IDs and rejects a misidentified speaker', async () => {
  const turns = [
    { speaker: 'kiritsugu', text: '士郎，今天也忙了一天吧。' },
    { speaker: 'shirou', text: '还好，老爹。我去热一下饭。' },
    { speaker: 'kiritsugu', text: '……那我收拾桌子。' },
    { speaker: 'shirou', text: '嗯，马上就好。' },
  ];
  for (const confused of [false, true]) {
    const supplied = structuredClone(turns);
    if (confused) supplied[1].text = '我是切嗣。';
    const { fetcher, calls } = stubFetch(() =>
      answer(JSON.stringify({ turns: supplied })),
    );
    const response = await createFateChatHandler(fetcher)(
      request(
        chatBody({
          mode: 'encounter',
          speaker: 'kiritsugu',
          target: 'shirou',
          scene: lifeScene(createDailyLife(), 'shirou'),
          recent: [],
        }),
      ),
    );
    assert.equal(response.status, confused ? 502 : 200);
    const result = await response.json();
    if (confused) assert.equal(result.turns, undefined);
    else assert.deepEqual(result.turns, turns);
    const sent = JSON.parse(bodyText(calls[0].init)) as CompletionRequest;
    assert.match(
      sent.messages[0].content,
      /发起者是卫宫切嗣（kiritsugu），回应者是卫宫士郎（shirou）/,
    );
    assert.equal(calls.length, 1);
  }
});

void test('every added resident can speak and respond while all seven distinct activity states reach the model', async () => {
  const residents = [
    { id: 'gilgamesh', name: '吉尔伽美什', action: 'walk' },
    { id: 'medusa', name: '美杜莎', action: 'read' },
    { id: 'tokiomi', name: '远坂时臣', action: 'study' },
    { id: 'kirei', name: '言峰绮礼', action: 'shop' },
    { id: 'kariya', name: '间桐雁夜', action: 'rest' },
    { id: 'emiya', name: 'EMIYA', action: 'cook' },
    { id: 'natalia', name: '娜塔莉亚', action: 'repair' },
  ] as const;
  const life = createDailyLife();
  for (const { id, action } of residents) {
    life.people[id].activity = {
      kind: action,
      phase: 'going',
      remaining: 20,
      reason: '按各自安排前往下一处。',
      source: 'rules',
    };
  }
  const { fetcher, calls } = stubFetch();
  const handle = createFateChatHandler(fetcher);
  for (let i = 0; i < residents.length; i++) {
    const speaker = residents[i];
    const target = residents[(i + 1) % residents.length];
    const scene = lifeScene(life, target.id);
    const response = await handle(
      request(
        chatBody({
          speaker: speaker.id,
          target: target.id,
          scene,
          history: [
            {
              speaker: speaker.id,
              target: target.id,
              message: '先忙自己的安排。',
              reply: '之后再聊。',
            },
          ],
        }),
      ),
    );
    assert.equal(response.status, 200, `${speaker.id} -> ${target.id}`);
    const sent = JSON.parse(bodyText(calls[i].init)) as CompletionRequest;
    const prefix = '以下为虚构背景资料：';
    assert.ok(sent.messages[1].content.startsWith(prefix));
    const context = JSON.parse(
      sent.messages[1].content.slice(prefix.length),
    ) as {
      角色: { name: string };
      交谈对象: { id: string; name: string };
      街道人物的行动: Record<string, string>;
    };
    assert.equal(context.角色.name, target.name);
    assert.equal(context.交谈对象.id, speaker.id);
    assert.equal(context.交谈对象.name, speaker.name);
    assert.equal(Object.keys(context.街道人物的行动).length, 21);
    const activities = residents.map(({ id }) => context.街道人物的行动[id]);
    assert.equal(
      new Set(activities).size,
      7,
      'individual activity fields must not share a fallback value',
    );
    for (const { id } of residents)
      assert.equal(context.街道人物的行动[id], scene[id], id);
  }
  assert.equal(calls.length, residents.length);
});

void test('cloud chat resolves credentials from the authenticated Request while local chat never calls the resolver', async () => {
  const { fetcher, calls } = stubFetch();
  const resolved: Request[] = [];
  const handle = createFateChatHandler(fetcher, async (incoming) => {
    resolved.push(incoming);
    return cloudKey;
  });
  const cloudRequest = request(
    chatBody({
      connection: 'cloud',
      userId: 'untrusted-body-user',
      key: 'ignored-body-key',
    }),
  );
  assert.equal((await handle(cloudRequest)).status, 200);
  assert.equal((await handle(request(chatBody()))).status, 200);
  assert.deepEqual(resolved, [cloudRequest]);
  assert.equal(
    new Headers(calls[0].init.headers).get('authorization'),
    `Bearer ${cloudKey}`,
  );
  assert.equal(
    new Headers(calls[1].init.headers).get('authorization'),
    `Bearer ${localKey}`,
  );
  assert.equal(bodyText(calls[0].init).includes('untrusted-body-user'), false);
  assert.equal(bodyText(calls[0].init).includes(cloudKey), false);
});

void test('cloud connection failures preserve authentication status and never contact the model', async () => {
  const { fetcher, calls } = stubFetch();
  const unavailable = await createFateChatHandler(fetcher)(
    request(chatBody({ connection: 'cloud' })),
  );
  assert.equal(unavailable.status, 503);
  const unauthorized = await createFateChatHandler(fetcher, async () => {
    throw new FateConnectionError('请先登录。', 401);
  })(request(chatBody({ connection: 'cloud' })));
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await unauthorized.json(), { error: '请先登录。' });
  const unexpected = await createFateChatHandler(fetcher, async () => {
    throw new Error(`Internal connection failure: ${cloudKey}`);
  })(request(chatBody({ connection: 'cloud' })));
  assert.equal(unexpected.status, 502);
  assert.equal((await unexpected.text()).includes(cloudKey), false);
  assert.equal(calls.length, 0);
});

void test('cross-origin and malformed origins are rejected before credential resolution, while the dev host alias is accepted', async () => {
  const { fetcher, calls } = stubFetch();
  let resolved = 0;
  const handle = createFateChatHandler(fetcher, async () => {
    resolved++;
    return cloudKey;
  });
  for (const headers of [
    { Origin: 'https://other.example' },
    { Origin: 'null' },
    { Origin: 'http://localhost:3000/path' },
    { Origin: 'http://localhost:3000', 'Sec-Fetch-Site': 'cross-site' },
  ] as Record<string, string>[]) {
    const response = await handle(
      request(chatBody({ connection: 'cloud' }), { headers }),
    );
    assert.equal(response.status, 403);
  }
  assert.equal(calls.length, 0);
  assert.equal(resolved, 0);
  const alias = await handle(
    request(chatBody(), {
      headers: { Origin: 'http://127.0.0.1:3000', Host: '127.0.0.1:3000' },
    }),
  );
  assert.equal(alias.status, 200);
  assert.equal(calls.length, 1);
});

void test('invalid request JSON, oversized input, history and character fields fail before any model call', async () => {
  const { fetcher, calls } = stubFetch();
  const handle = createFateChatHandler(fetcher);
  const malformed = new Request(url, { method: 'POST', body: '{broken' });
  assert.equal((await handle(malformed)).status, 400);
  const oversized = new Request(url, {
    method: 'POST',
    body: 'x'.repeat(96001),
  });
  assert.equal((await handle(oversized)).status, 413);
  for (const body of [
    [],
    null,
    chatBody({ key: 'short' }),
    chatBody({ key: 'contains whitespace' }),
    chatBody({ mode: 'unsupported' }),
    chatBody({ target: 'not-a-resident' }),
    chatBody({ speaker: 'rin' }),
    chatBody({ model: '../bad model' }),
    chatBody({ message: '  ' }),
    chatBody({ message: '文'.repeat(1201) }),
    chatBody({ worldNote: '文'.repeat(2001) }),
    chatBody({ history: Array(9).fill({ message: '早安', reply: '早安' }) }),
    chatBody({
      history: [
        { speaker: 'saber', target: 'rin', message: '早安', reply: '早安' },
      ],
    }),
    chatBody({ waverStage: 'unknown' }),
    chatBody({ housing: [] }),
    chatBody({ scene: { minutes: -1 } }),
    chatBody({ characterNotes: { nobody: '无效角色' } }),
    chatBody({ mode: 'encounter', speaker: 'admin' }),
    chatBody({
      mode: 'decision',
      needs: { hunger: 101, energy: 50, social: 50 },
    }),
  ]) {
    assert.equal(
      (await handle(request(body))).status,
      400,
      JSON.stringify(body),
    );
  }
  assert.equal(calls.length, 0);
});

void test('model listing and chat map upstream errors to safe actionable responses', async () => {
  for (const [status, expected] of [
    [401, /密钥未通过验证/],
    [402, /余额不足/],
    [429, /请求过于频繁/],
    [400, /模型不可用/],
    [404, /模型不可用/],
    [500, /暂时无法响应/],
  ] as const) {
    for (const body of [{ mode: 'test', key: localKey }, chatBody()]) {
      const { fetcher } = stubFetch(
        () => new Response(`upstream debug ${localKey}`, { status }),
      );
      const response = await createFateChatHandler(fetcher)(request(body));
      assert.equal(response.status, 502);
      const payload = await response.json();
      assert.match(payload.error, expected);
      assert.equal(JSON.stringify(payload).includes(localKey), false);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
    }
  }
});

void test('missing models, malformed upstream JSON and invalid chat content never produce a successful reply', async () => {
  for (const upstream of [
    () => Response.json({ data: [] }),
    () => Response.json({ data: [{ id: 123 }] }),
    () => new Response('{broken'),
  ]) {
    const { fetcher } = stubFetch(upstream);
    assert.equal(
      (
        await createFateChatHandler(fetcher)(
          request({ mode: 'test', key: localKey }),
        )
      ).status,
      502,
    );
  }
  for (const upstream of [
    () => new Response('{broken'),
    () => Response.json({}),
    () => Response.json(null),
    () => answer(''),
    () => answer('  '),
    () => answer(42),
    () => answer('文'.repeat(2401)),
  ]) {
    const { fetcher } = stubFetch(upstream);
    const response = await createFateChatHandler(fetcher)(request(chatBody()));
    assert.equal(response.status, 502);
    assert.equal('reply' in (await response.json()), false);
  }
});

void test('invalid token accounting is reported as unknown without discarding a valid response', async () => {
  for (const tokens of [-1, '42', null]) {
    const { fetcher } = stubFetch(() => answer('去书店吧。', tokens));
    const response = await createFateChatHandler(fetcher)(request(chatBody()));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.tokens, null);
    assert.equal(payload.reply, '去书店吧。');
  }
});

void test('request cancellation reaches the upstream signal and returns a controlled timeout response', async () => {
  const controller = new AbortController();
  let called = false;
  const fetcher: typeof fetch = async (_input, init) => {
    called = true;
    const signal = init?.signal;
    assert.ok(signal instanceof AbortSignal);
    assert.equal(signal.aborted, false);
    controller.abort(new DOMException('User cancelled', 'AbortError'));
    assert.equal(signal.aborted, true);
    throw signal.reason;
  };
  const response = await createFateChatHandler(fetcher)(
    request(chatBody(), { signal: controller.signal }),
  );
  assert.equal(called, true);
  assert.equal(response.status, 504);
  assert.match((await response.json()).error, /取消或响应超时/);
});

void test('autonomous decisions accept executable actions and reject malformed or unsupported plans', async () => {
  const body = chatBody({
    mode: 'decision',
    scene: lifeScene(createDailyLife(), 'rin'),
    recent: ['刚结束一段散步。'],
    needs: { hunger: 30, energy: 70, social: 40 },
  });
  const { fetcher, calls } = stubFetch(() =>
    answer(JSON.stringify({ action: 'read', reason: '想把那本书读完。' })),
  );
  const response = await createFateChatHandler(fetcher)(request(body));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).plan, {
    action: 'read',
    reason: '想把那本书读完。',
  });
  const sent = JSON.parse(bodyText(calls[0].init)) as CompletionRequest;
  assert.deepEqual(sent.response_format, { type: 'json_object' });
  assert.match(sent.messages[0].content, /无终之庭/);
  for (const content of [
    '{broken',
    JSON.stringify({ action: 'teleport', reason: '瞬移。' }),
    JSON.stringify({ action: 'read', reason: '' }),
  ]) {
    const stub = stubFetch(() => answer(content));
    assert.equal(
      (await createFateChatHandler(stub.fetcher)(request(body))).status,
      502,
    );
  }
});

void test('autonomous encounters validate alternating speakers and keep valid speech when effects lack evidence', async () => {
  const body = chatBody({
    mode: 'encounter',
    scene: lifeScene(createDailyLife(), 'rin'),
    recent: [],
  });
  const turns = [
    { speaker: 'shirou', text: '家务都忙完了。' },
    { speaker: 'rin', text: '那就给自己留点时间吧。' },
    { speaker: 'shirou', text: '想一起去看看书。' },
    { speaker: 'rin', text: '好，我也正想去。' },
  ];
  const { fetcher, calls } = stubFetch(() =>
    answer(
      JSON.stringify({
        turns,
        effects: {
          impressions: [
            { person: 'rin', kind: 'care', turn: 0, quote: '凭空编造的关心' },
          ],
        },
      }),
    ),
  );
  const response = await createFateChatHandler(fetcher)(request(body));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.turns, turns);
  assert.deepEqual(payload.effects, { impressions: [] });
  const sent = JSON.parse(bodyText(calls[0].init)) as CompletionRequest;
  assert.match(sent.messages[0].content, /无终之庭/);
  for (const content of [
    '{broken',
    JSON.stringify({ turns: turns.slice(0, 2) }),
    JSON.stringify({
      turns: [
        { speaker: 'saber', text: '不在场的人插话。' },
        ...turns.slice(1),
      ],
    }),
  ]) {
    const stub = stubFetch(() => answer(content));
    assert.equal(
      (await createFateChatHandler(stub.fetcher)(request(body))).status,
      502,
    );
  }
});
