import { actOnPastime, advancePastimes } from '../lib/fate-pastimes';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createFateBackup,
  emptyFateLibrary,
  readFateBackupText,
  readFateLibrary,
  restoreFateLibrary,
  serializeFateBackup,
  writeFateLibrary,
  type FateBackup,
} from '../lib/fate-backup';
import { createDailyLife, snapshotLife } from '../lib/fate-life';
import { emptyFateSave } from '../lib/fate-state';
import { DISTRICT_PLACES } from '../lib/fate-district';
import { FATE_HOMES } from '../lib/fate-housing';
import { roomPoint } from '../lib/fate-indoor-layout';
import { visitPublicPlace } from '../lib/fate-public-places';
import { createStreetActors, nearestWalkable } from '../lib/street';
import { STREET_PARTNERS, type WaverStage } from '../lib/fate-cast';
import { bondKey, rememberEncounter } from '../lib/fate-social';
import {
  CloudSaveError,
  createCloudSaveHandlers,
  MAX_CLOUD_SAVE_BYTES,
  parseCloudSaveView,
  type CloudSaveBackend,
  type CloudSaveSlot,
} from '../lib/fate-cloud-save';

const origin = 'https://garden.test';
function snapshot(title = '保留下雨的冬木') {
  return createFateBackup(
    {
      ...emptyFateSave(),
      worldNote: title,
      characterNotes: { natalia: '今天留在庭院修理收音机。' },
      life: createDailyLife(),
    },
    title,
    new Date('2026-09-26T08:00:00Z'),
  );
}
function upload(
  backup: unknown = snapshot(),
  expectedRevision: number | null = null,
  expectedAccount = 'alice',
) {
  return { backup, expectedRevision, expectedAccount };
}

function nearLimitSnapshot() {
  const life = createDailyLife();
  life.nextId = 10;
  for (let i = 0; i < STREET_PARTNERS.length; i++) {
    for (let j = i + 1; j < STREET_PARTNERS.length; j++) {
      const [a, b] = [STREET_PARTNERS[i], STREET_PARTNERS[j]].sort();
      const stages: (WaverStage | null)[] =
        a === 'waver' || b === 'waver' ? ['young', 'adult'] : [null];
      for (const stage of stages) {
        life.bonds[bondKey(a, b, stage ?? 'young')] = {
          a,
          b,
          stage,
          warmth: [0, 0],
          tension: [0, 0],
          familiarity: 0,
          day: 0,
          changes: 0,
          seen: 6,
          cutoff: 0,
          memories: Array.from({ length: 6 }, (_, index) => ({
            id: index + 1,
            minute: 980,
            source: 'preset',
            kind: 'conversation',
            text: '冬'.repeat(110),
            quotes: [a, b, a, b].map((speaker) => ({
              speaker,
              text: '冬'.repeat(120),
            })),
            impressions: [a, b].map((person) => ({
              person,
              kind: 'care',
              quote: '冬'.repeat(120),
            })),
          })),
        };
      }
    }
  }
  return createFateBackup({
    ...emptyFateSave(),
    life,
    history: Array.from({ length: 120 }, (_, index) => ({
      id: `h${index}`,
      speaker: 'rin',
      target: 'shirou',
      message: '冬'.repeat(1200),
      reply: '冬'.repeat(2400),
      source: 'preset',
      createdAt: '2026-09-26T00:00:00.000Z',
    })),
  });
}
function request(
  method: 'GET' | 'PUT',
  body?: unknown,
  account: string | null = 'alice',
  overrides: Record<string, string> = {},
) {
  return new Request(`${origin}/api/fate/save`, {
    method,
    headers: {
      ...(method === 'PUT'
        ? { Origin: origin, 'Content-Type': 'application/json' }
        : {}),
      ...(account ? { 'X-Test-Account': account } : {}),
      ...overrides,
    },
    ...(method === 'PUT'
      ? { body: typeof body === 'string' ? body : JSON.stringify(body) }
      : {}),
  });
}
function memoryBackend() {
  const slots = new Map<string, CloudSaveSlot>();
  const writes: { account: string; backup: FateBackup }[] = [];
  let connections = 0;
  const connect: CloudSaveBackend = async (req) => {
    connections++;
    const account = req.headers.get('X-Test-Account');
    if (!account)
      throw new CloudSaveError('请先登录游戏账号。', 401, 'unauthenticated');
    return {
      username: account,
      read: async () => structuredClone(slots.get(account) ?? null),
      async compareAndSwap(backup, expectedRevision) {
        // Model the database's atomic statement: comparison and write have no await between them.
        const current = slots.get(account);
        if ((current?.revision ?? null) !== expectedRevision) return null;
        const stored = {
          backup: structuredClone(backup),
          revision: (current?.revision ?? 0) + 1,
          updatedAt: new Date(
            Date.UTC(2026, 8, 26, 9, 0, writes.length),
          ).toISOString(),
        };
        writes.push({ account, backup: structuredClone(backup) });
        slots.set(account, stored);
        return structuredClone(stored);
      },
    };
  };
  return {
    ...createCloudSaveHandlers(connect),
    slots,
    writes,
    connections: () => connections,
  };
}
function privateResponse(response: Response) {
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('vary'), 'Cookie');
}

void test('cloud saves require authenticated accounts for both reads and writes, including first creation', async () => {
  const store = memoryBackend();
  for (const response of [
    await store.GET(request('GET', undefined, null)),
    await store.PUT(request('PUT', upload(), null)),
  ]) {
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'unauthenticated');
    privateResponse(response);
  }
  assert.equal(store.writes.length, 0);
  assert.equal(store.slots.size, 0);
});

void test('unconfigured and failed cloud backends fail privately without exposing internal details', async () => {
  for (const [error, code] of [
    [
      new CloudSaveError('云端游戏存档尚未配置。', 503, 'not_configured'),
      'not_configured',
    ],
    [
      new Error('internal fake service credential must never be returned'),
      'unavailable',
    ],
  ] as const) {
    const handlers = createCloudSaveHandlers(async () => {
      throw error;
    });
    const response = await handlers.GET(request('GET'));
    assert.equal(response.status, 503);
    privateResponse(response);
    const body = await response.json();
    assert.equal(body.code, code);
    assert.doesNotMatch(body.error, /credential/);
  }
});

void test('same-origin reads and explicit versioned uploads round-trip the complete game snapshot', async () => {
  const store = memoryBackend();
  const empty = await store.GET(request('GET'));
  assert.deepEqual(await empty.json(), { username: 'alice', slot: null });
  assert.equal(store.writes.length, 0);
  const backup = snapshot();
  const created = await store.PUT(request('PUT', upload(backup)));
  assert.equal(created.status, 201);
  privateResponse(created);
  const first = parseCloudSaveView(await created.json());
  assert.equal(first.slot!.revision, 1);
  assert.deepEqual(first.slot!.backup, backup);
  assert.equal(Object.keys(first.slot!.backup.save.life!.people).length, 21);
  const next = snapshot('第二天的散步');
  const updated = await store.PUT(
    request('PUT', upload(next, first.slot!.revision)),
  );
  assert.equal(updated.status, 200);
  const second = parseCloudSaveView(await updated.json());
  assert.equal(second.slot!.revision, 2);
  assert.notEqual(second.slot!.updatedAt, first.slot!.updatedAt);
  const read = await store.GET(request('GET'));
  privateResponse(read);
  assert.deepEqual(parseCloudSaveView(await read.json()), second);
  assert.equal(store.writes.length, 2);
});

void test('cloud upload and authenticated restore keep personal preference evidence and private participants', async () => {
  const store = memoryBackend();
  const life = createDailyLife();
  const e = {
    id: life.nextId++,
    minute: life.minutes,
    text: '凛与士郎交谈。',
    dialogue: {
      speaker: 'rin' as const,
      target: 'shirou' as const,
      message: '你喜欢做什么？',
      reply: '我喜欢阅读。',
      source: 'preset' as const,
    },
  };
  life.events.push(e);
  rememberEncounter(life, e, {
    impressions: [],
    preferences: [
      {
        person: 'shirou',
        kind: 'like',
        subject: '阅读',
        turn: 1,
        quote: '我喜欢阅读。',
      },
    ],
  });
  const backup = createFateBackup({ ...emptyFateSave(), life });
  assert.equal((await store.PUT(request('PUT', upload(backup)))).status, 201);
  const restored = parseCloudSaveView(
    await (await store.GET(request('GET'))).json(),
  );
  assert.deepEqual(
    restored.slot!.backup.save.life!.bonds,
    backup.save.life!.bonds,
  );
  assert.deepEqual(
    (await store.GET(request('GET', undefined, 'bob'))).status,
    200,
  );
  assert.equal(
    parseCloudSaveView(
      await (await store.GET(request('GET', undefined, 'bob'))).json(),
    ).slot,
    null,
  );
});

void test('a public visit and a non-Emiya interior survive export, cloud upload and local restore together', async () => {
  const store = memoryBackend();
  const life = createDailyLife();
  const actors = createStreetActors();
  const rin = actors.find((actor) => actor.id === 'rin')!;
  Object.assign(rin, nearestWalkable(DISTRICT_PLACES.park));
  assert.equal(visitPublicPlace(life, actors, 'rin', 'park', 'walk').ok, true);
  const visit = structuredClone(life.events.at(-1));

  Object.assign(rin, FATE_HOMES.tohsaka);
  const savedLife = snapshotLife(life, actors);
  const room = roomPoint('tohsaka', 'study', { x: 240, y: 390 });
  savedLife.indoor = { actor: 'rin', home: 'tohsaka', ...room, layout: 2 };
  const backup = readFateBackupText(
    serializeFateBackup(
      createFateBackup({
        ...emptyFateSave(),
        worldNote: '凛从河岸公园回到远坂宅',
        life: savedLife,
      }),
    ),
  );

  const written = await store.PUT(request('PUT', upload(backup)));
  assert.equal(written.status, 201);
  const cloud = parseCloudSaveView(
    await (await store.GET(request('GET'))).json(),
  );
  assert.deepEqual(cloud.slot?.backup, backup);

  const local = new Map<string, string>();
  const storage = {
    getItem: (key: string) => local.get(key) ?? null,
    setItem: (key: string, value: string) => {
      local.set(key, value);
    },
  };
  const before = { ...emptyFateLibrary(), current: emptyFateSave() };
  before.current.worldNote = '恢复前的本地进度';
  writeFateLibrary(storage, restoreFateLibrary(before, cloud.slot!.backup));
  const restored = readFateLibrary(storage);
  assert.equal(restored.checkpoints[0].save.worldNote, '恢复前的本地进度');
  assert.deepEqual(restored.current.life?.indoor, savedLife.indoor);
  assert.deepEqual(restored.current.life?.positions.rin, {
    x: FATE_HOMES.tohsaka.x,
    y: FATE_HOMES.tohsaka.y,
  });
  assert.deepEqual(restored.current.life?.events.at(-1), visit);
  assert.equal(restored.current.worldNote, '凛从河岸公园回到远坂宅');
});

void test('cloud saves store only parsed game fields and never persist connection settings', async () => {
  const store = memoryBackend();
  const backup = snapshot();
  const marker = 'TEST_CONNECTION_VALUE';
  const response = await store.PUT(
    request('PUT', {
      ...upload({
        ...backup,
        apiKey: marker,
        connections: { key: marker },
        save: { ...backup.save, apiKey: marker, model: marker },
      }),
      apiKey: marker,
    }),
  );
  assert.equal(response.status, 201);
  assert.deepEqual(store.writes[0].backup, backup);
  assert.doesNotMatch(
    JSON.stringify(store.slots.get('alice')),
    /TEST_CONNECTION_VALUE/,
  );
  assert.doesNotMatch(await response.text(), /TEST_CONNECTION_VALUE/);
});

void test('corrupt backups, invalid envelopes and malformed JSON cannot overwrite an existing cloud slot', async () => {
  const store = memoryBackend();
  const backup = snapshot();
  await store.PUT(request('PUT', upload(backup)));
  const before = structuredClone(store.slots.get('alice'));
  for (const body of [
    upload({ ...backup, version: 999 }, 1),
    upload({ ...backup, save: { ...backup.save, history: 'broken' } }, 1),
    upload(
      {
        ...backup,
        save: { ...backup.save, life: { ...backup.save.life, people: {} } },
      },
      1,
    ),
    { backup, expectedAccount: 'alice' },
    { backup, expectedRevision: -1, expectedAccount: 'alice' },
    { backup, expectedRevision: 1.5, expectedAccount: 'alice' },
    '{broken JSON',
    '[]',
  ]) {
    const response = await store.PUT(request('PUT', body));
    assert.equal(response.status, 400);
    privateResponse(response);
    assert.deepEqual(store.slots.get('alice'), before);
  }
  assert.equal(store.writes.length, 1);
});

void test('upload byte limits reject oversized declared and streamed bodies before any write', async () => {
  const store = memoryBackend();
  // Multibyte text exceeds the byte limit even though JS string.length is below it.
  const text = JSON.stringify({
    ...upload(),
    padding: '庭'.repeat(Math.ceil(MAX_CLOUD_SAVE_BYTES / 3)),
  });
  assert.ok(text.length < MAX_CLOUD_SAVE_BYTES);
  assert.ok(new TextEncoder().encode(text).length > MAX_CLOUD_SAVE_BYTES);
  for (const req of [
    request('PUT', upload(), 'alice', {
      'Content-Length': String(MAX_CLOUD_SAVE_BYTES + 1),
    }),
    request('PUT', text),
    request('PUT', text, 'alice', { 'Content-Length': '1' }),
  ]) {
    const response = await store.PUT(req);
    assert.equal(response.status, 413);
    assert.equal((await response.json()).code, 'too_large');
    privateResponse(response);
  }
  assert.equal(store.writes.length, 0);
});

void test('a valid near-limit game snapshot stays intact even when normalized JSON spacing exceeds 5 MB', async () => {
  const backup = nearLimitSnapshot();
  const body = JSON.stringify(upload(backup));
  const bytes = new TextEncoder().encode(body).byteLength;
  assert.ok(bytes < MAX_CLOUD_SAVE_BYTES);
  assert.ok(bytes > MAX_CLOUD_SAVE_BYTES - 50000);
  // Normalization overhead is structural, not part of the user text. SQL allows 8 MB
  // for its JSONB text representation while the actual HTTP request remains capped at 5 MB.
  function spaced(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(spaced).join(', ')}]`;
    if (value && typeof value === 'object')
      return `{${Object.entries(value)
        .map(([key, child]) => `${JSON.stringify(key)}: ${spaced(child)}`)
        .join(', ')}}`;
    return JSON.stringify(value);
  }
  assert.ok(
    new TextEncoder().encode(spaced(backup)).byteLength > MAX_CLOUD_SAVE_BYTES,
  );
  const store = memoryBackend();
  const response = await store.PUT(request('PUT', body));
  assert.equal(response.status, 201);
  assert.deepEqual(store.slots.get('alice')!.backup, backup);
});

void test('NUL and isolated UTF-16 surrogates in nested story text are rejected before database writes', async () => {
  const store = memoryBackend();
  const original = snapshot();
  await store.PUT(request('PUT', upload(original)));
  for (const invalidText of [
    '前文\u0000后文',
    '截断表情\ud83d',
    '\ude00没有起始字符',
  ]) {
    for (const field of ['setting', 'dialogue'] as const) {
      const backup = snapshot();
      if (field === 'setting') backup.save.characterNotes.natalia = invalidText;
      else
        backup.save.history = [
          {
            id: 'malformed-text',
            speaker: 'rin',
            target: 'shirou',
            message: '今天好吗？',
            reply: invalidText,
            source: 'deepseek',
            createdAt: '2026-09-26T08:00:00Z',
          },
        ];
      const response = await store.PUT(request('PUT', upload(backup, 1)));
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, 'invalid_backup');
      assert.deepEqual(store.slots.get('alice')!.backup, original);
    }
  }
  assert.equal(store.writes.length, 1);
  const validEmoji = snapshot('完整表情 🌱 与换行\n仍然保留');
  assert.equal(
    (await store.PUT(request('PUT', upload(validEmoji, 1)))).status,
    200,
  );
  assert.deepEqual(store.slots.get('alice')!.backup, validEmoji);
});

void test('cross-site reads and writes are rejected before authentication or backend access', async () => {
  const store = memoryBackend();
  for (const req of [
    request('GET', undefined, 'alice', { Origin: 'https://elsewhere.test' }),
    request('GET', undefined, 'alice', { 'Sec-Fetch-Site': 'cross-site' }),
    request('PUT', upload(), 'alice', { Origin: 'https://elsewhere.test' }),
    request('PUT', upload(), 'alice', { Origin: '' }),
    request('PUT', upload(), 'alice', { 'Sec-Fetch-Site': 'cross-site' }),
  ]) {
    const response = await (req.method === 'GET'
      ? store.GET(req)
      : store.PUT(req));
    assert.equal(response.status, 403);
    privateResponse(response);
  }
  assert.equal(store.connections(), 0);
  assert.equal(store.writes.length, 0);
});

void test('authenticated user isolation ignores client user IDs and rejects an account changed after preview', async () => {
  const store = memoryBackend();
  const alice = snapshot('Alice 的冬木');
  const bob = snapshot('Bob 的冬木');
  await store.PUT(request('PUT', { ...upload(alice), user_id: 'bob' }));
  assert.equal(store.slots.has('bob'), false);
  const bobRead = await store.GET(request('GET', undefined, 'bob'));
  assert.deepEqual(await bobRead.json(), { username: 'bob', slot: null });
  assert.equal(
    (await store.PUT(request('PUT', upload(bob, null, 'bob'), 'bob'))).status,
    201,
  );
  const switched = await store.PUT(
    request('PUT', upload(alice, 1, 'alice'), 'bob'),
  );
  assert.equal(switched.status, 409);
  assert.equal((await switched.json()).code, 'account_changed');
  assert.deepEqual(store.slots.get('bob')!.backup, bob);
  assert.deepEqual(store.slots.get('alice')!.backup, alice);
  assert.equal(store.writes.length, 2);
});

void test('two devices racing to create an empty slot cannot silently replace the first snapshot', async () => {
  const store = memoryBackend();
  const backups = [snapshot('设备 A'), snapshot('设备 B')];
  const responses = await Promise.all(
    backups.map((backup) => store.PUT(request('PUT', upload(backup)))),
  );
  assert.deepEqual(
    responses.map((r) => r.status).sort((a, b) => a - b),
    [201, 409],
  );
  const winner = responses.findIndex((r) => r.status === 201);
  assert.deepEqual(store.slots.get('alice')!.backup, backups[winner]);
  assert.equal(store.slots.get('alice')!.revision, 1);
  assert.equal(store.writes.length, 1);
});

void test('two devices editing the same reviewed revision require a new read after one wins', async () => {
  const store = memoryBackend();
  await store.PUT(request('PUT', upload()));
  const readA = parseCloudSaveView(
    await (await store.GET(request('GET'))).json(),
  );
  const readB = parseCloudSaveView(
    await (await store.GET(request('GET'))).json(),
  );
  const backups = [snapshot('设备 A 的后续'), snapshot('设备 B 的后续')];
  const responses = await Promise.all(
    [readA, readB].map((view, i) =>
      store.PUT(request('PUT', upload(backups[i], view.slot!.revision))),
    ),
  );
  assert.deepEqual(
    responses.map((r) => r.status).sort((a, b) => a - b),
    [200, 409],
  );
  const winner = responses.findIndex((r) => r.status === 200);
  const conflict = responses[1 - winner];
  assert.equal((await conflict.json()).code, 'conflict');
  assert.deepEqual(store.slots.get('alice')!.backup, backups[winner]);
  assert.equal(store.slots.get('alice')!.revision, 2);
  assert.equal(
    (await store.PUT(request('PUT', upload(backups[1 - winner], 1)))).status,
    409,
  );
  const latest = parseCloudSaveView(
    await (await store.GET(request('GET'))).json(),
  );
  assert.equal(
    (
      await store.PUT(
        request('PUT', upload(backups[1 - winner], latest.slot!.revision)),
      )
    ).status,
    200,
  );
  assert.equal(store.slots.get('alice')!.revision, 3);
});

void test('invalid stored records are rejected instead of being offered as restore previews', async () => {
  const handlers = createCloudSaveHandlers(async () => ({
    username: 'alice',
    read: async () => ({
      backup: snapshot(),
      revision: 0,
      updatedAt: 'not-a-date',
    }),
    compareAndSwap: async () => {
      assert.fail('GET must not write');
    },
  }));
  const response = await handlers.GET(request('GET'));
  assert.equal(response.status, 503);
  privateResponse(response);
  assert.equal((await response.json()).code, 'unavailable');
  assert.throws(() =>
    parseCloudSaveView({
      username: 'alice',
      slot: { backup: {}, revision: 1, updatedAt: '2026-09-26T08:00:00Z' },
    }),
  );
});

void test('reading a remote snapshot leaves local progress alone and confirmed restore preserves the previous story', async () => {
  const store = memoryBackend();
  const remote = snapshot('来自另一台设备');
  await store.PUT(request('PUT', upload(remote)));
  const library = {
    ...emptyFateLibrary(),
    current: snapshot('本机尚未上传的故事').save,
  };
  const before = structuredClone(library);
  const preview = parseCloudSaveView(
    await (await store.GET(request('GET'))).json(),
  );
  assert.deepEqual(library, before);
  const restored = restoreFateLibrary(library, preview.slot!.backup);
  assert.deepEqual(restored.current, remote.save);
  assert.deepEqual(restored.checkpoints.at(-1)!.save, before.current);
  assert.equal(restored.checkpoints.at(-1)!.title, '恢复前的进度');
  assert.deepEqual(library, before);
  assert.equal(store.writes.length, 1);
});

void test('completed and in-progress small activities survive the cloud API and local restore without replaying item changes', async () => {
  const life = createDailyLife(),
    actors = createStreetActors();
  for (const id of ['rin', 'shirou', 'irisviel', 'illya'] as const) {
    Object.assign(
      actors.find((a) => a.id === id)!,
      DISTRICT_PLACES.cafe,
    );
    life.people[id].activity = null;
  }
  life.belongings.rin.parts = 1;
  assert.equal(
    actOnPastime(life, actors, 'rin', 'repair-replace', 'shirou').ok,
    true,
  );
  advancePastimes(life, actors, 12, 'rin');
  assert.equal(
    actOnPastime(life, actors, 'illya', 'repair-inspect', 'irisviel').ok,
    true,
  );
  advancePastimes(life, actors, 4, 'illya');
  const remote = createFateBackup({
    ...emptyFateSave(),
    life: snapshotLife(life, actors),
  });
  const store = memoryBackend();
  const response = await store.PUT(request('PUT', upload(remote)));
  assert.equal(response.status, 201);
  const preview = parseCloudSaveView(
    await (await store.GET(request('GET'))).json(),
  );
  const restored = restoreFateLibrary(emptyFateLibrary(), preview.slot!.backup)
    .current.life!;
  assert.deepEqual(restored.pastimes, life.pastimes);
  assert.deepEqual(restored.belongings, life.belongings);
  assert.equal(restored.belongings.rin.parts, 0);
  assert.equal(restored.belongings.shirou.repairs, 1);
});
