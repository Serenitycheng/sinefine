import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CREATIVE_STORAGE_KEY,
  CREATIVE_TEMPLATES,
  CREATIVE_TRAITS,
  CREATIVE_STEP_MINUTES,
  MAX_CREATIVE_EVENTS,
  MAX_CREATIVE_IMPORT_BYTES,
  MAX_CREATIVE_WORLDS,
  activateCreativeWorld,
  advanceCreativeWorld,
  createCreativeBackup,
  createCreativeWorld,
  creativePlaceName,
  creativeTemplateDraft,
  creativeTime,
  emptyCreativeLibrary,
  parseCreativeBackup,
  parseCreativeLibrary,
  parseCreativeWorld,
  parseCreativeWorldDraft,
  readCreativeBackupText,
  readCreativeLibrary,
  readCreativeLibrarySnapshot,
  removeCreativeWorld,
  restoreCreativeLibrary,
  restoreCreativeRecovery,
  serializeCreativeBackup,
  updateCreativeRules,
  updateCreativeWorldDetails,
  upsertCreativeWorld,
  writeCreativeLibrary,
  type CreativeStorage,
  type CreativeTemplateId,
  type CreativeWorld,
} from '../lib/creative-world';

const now = new Date('2026-09-26T08:00:00.000Z');
function world(template: CreativeTemplateId = 'coastal', id = 'test-world') {
  return createCreativeWorld(creativeTemplateDraft(template), {
    id,
    seed: 12345,
    now,
  });
}
function memoryStorage(entries: [string, string][] = []) {
  const values = new Map(entries),
    writes: [string, string][] = [];
  const storage: CreativeStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      writes.push([key, value]);
      values.set(key, value);
    },
  };
  return { values, writes, storage };
}

void test('all three original settings and the custom draft create isolated, editable worlds without prototype data', () => {
  assert.deepEqual(
    CREATIVE_TEMPLATES.map((item) => item.id),
    ['coastal', 'academy', 'orbital', 'custom'],
  );
  assert.equal(CREATIVE_TRAITS.length, 5);
  const draft = creativeTemplateDraft('coastal');
  const original = structuredClone(draft);
  const created = createCreativeWorld(draft, { id: 'one', seed: 4, now });
  assert.deepEqual(draft, original);
  draft.residents[0].name = '改过的草稿';
  draft.residents[0].traits.push('active');
  assert.notEqual(created.residents[0].name, draft.residents[0].name);
  assert.equal(created.residents[0].traits.length, 2);
  assert.deepEqual(creativeTemplateDraft('coastal'), original);
  for (const template of CREATIVE_TEMPLATES) {
    const saved = world(template.id);
    assert.deepEqual(parseCreativeWorld(saved), saved);
    assert.equal(saved.minutes, 480);
    assert.ok(saved.residents.length >= 1);
    assert.ok(
      saved.residents.every((p) => p.money === saved.rules.dailyAllowance),
    );
    assert.ok(creativePlaceName(template.id, 'home').length > 0);
    assert.equal('running' in saved, false);
  }
  assert.equal(creativeTime(1440), '第 2 天 00:00');
});

void test('custom creation validates text, character count, traits and the three explicit rule boundaries', () => {
  const maximum = creativeTemplateDraft('custom');
  maximum.name = '界'.repeat(40);
  maximum.premise = '设'.repeat(1200);
  maximum.rules = { workHours: 12, mealCost: 30, dailyAllowance: 200 };
  maximum.residents = Array.from({ length: 12 }, () => ({
    name: '名'.repeat(32),
    role: '人'.repeat(80),
    goal: '愿'.repeat(160),
    traits: ['curious', 'kind', 'steady'],
  }));
  assert.equal(
    createCreativeWorld(maximum, { id: 'maximum', seed: 0, now }).residents
      .length,
    12,
  );
  const invalid = [
    { ...maximum, name: '界'.repeat(41) },
    { ...maximum, premise: '设'.repeat(1201) },
    { ...maximum, residents: [] },
    { ...maximum, residents: [...maximum.residents, maximum.residents[0]] },
    {
      ...maximum,
      residents: [{ ...maximum.residents[0], traits: ['kind', 'kind'] }],
    },
    { ...maximum, residents: [{ ...maximum.residents[0], role: '' }] },
    { ...maximum, rules: { ...maximum.rules, workHours: 0.5 } },
    { ...maximum, rules: { ...maximum.rules, workHours: 13 } },
    { ...maximum, rules: { ...maximum.rules, mealCost: -1 } },
    { ...maximum, rules: { ...maximum.rules, dailyAllowance: 201 } },
    { ...maximum, running: true },
  ];
  for (const candidate of invalid)
    assert.throws(() => parseCreativeWorldDraft(candidate));
});

void test('fixed ten-minute advancement is deterministic across batching, reloading and an explicit paused step', () => {
  const initial = world();
  const before = structuredClone(initial);
  const batched = advanceCreativeWorld(initial, 144);
  let repeated = initial;
  for (let i = 0; i < 144; i++) repeated = advanceCreativeWorld(repeated);
  assert.deepEqual(batched, repeated);
  assert.deepEqual(initial, before);
  assert.equal(batched.minutes, initial.minutes + CREATIVE_STEP_MINUTES * 144);
  assert.deepEqual(advanceCreativeWorld(initial, 0), initial);
  const paused = JSON.stringify(batched);
  const reloaded = parseCreativeWorld(JSON.parse(paused));
  assert.deepEqual(reloaded, batched);
  assert.deepEqual(
    advanceCreativeWorld(reloaded, 12),
    advanceCreativeWorld(batched, 12),
  );
  assert.throws(() => advanceCreativeWorld(initial, 0.5));
  assert.throws(() => advanceCreativeWorld(initial, 145));
  assert.throws(() => advanceCreativeWorld(initial, -1));
});

void test('midnight gives each resident one daily allowance, and changing rules or reloading never pays twice', () => {
  let current = updateCreativeRules(world(), {
    workHours: 0,
    mealCost: 0,
    dailyAllowance: 11,
  });
  const initialMoney = current.residents.map((p) => p.money);
  assert.equal(current.allowanceDay, 0);
  assert.deepEqual(
    current.residents.map((p) => p.money),
    initialMoney,
  );
  current = advanceCreativeWorld(current, 95);
  assert.equal(current.minutes, 1430);
  assert.deepEqual(
    current.residents.map((p) => p.money),
    initialMoney,
  );
  current = advanceCreativeWorld(current);
  assert.equal(current.minutes, 1440);
  assert.equal(current.allowanceDay, 1);
  assert.deepEqual(
    current.residents.map((p) => p.money),
    initialMoney.map((n) => n + 11),
  );
  const loaded = parseCreativeWorld(current);
  assert.deepEqual(loaded, current);
  current = advanceCreativeWorld(loaded, 144);
  current = advanceCreativeWorld(current, 144);
  assert.equal(current.allowanceDay, 3);
  assert.deepEqual(
    current.residents.map((p) => p.money),
    initialMoney.map((n) => n + 33),
  );
  assert.equal(
    current.events.filter((e) => e.kind === 'income' && e.minute === 4320)
      .length,
    1,
  );
});

void test('work rewards, meal costs and insufficient balances are applied once per simulated action without debt', () => {
  const initial = world();
  const mealWorld = updateCreativeRules(initial, {
    workHours: 0,
    mealCost: 8,
    dailyAllowance: 35,
  });
  mealWorld.residents[0].hunger = 65;
  const afterMeal = advanceCreativeWorld(mealWorld);
  assert.equal(afterMeal.residents[0].action.id, 'eat');
  assert.equal(afterMeal.residents[0].money, 27);
  assert.ok(afterMeal.residents[0].hunger < 20);
  const afterNext = advanceCreativeWorld(afterMeal);
  assert.equal(afterNext.residents[0].money, 27);
  const poor = structuredClone(mealWorld);
  poor.residents[0].money = 0;
  poor.residents[0].hunger = 95;
  const waiting = advanceCreativeWorld(poor);
  assert.equal(waiting.residents[0].money, 0);
  assert.notEqual(waiting.residents[0].action.id, 'eat');
  const working = updateCreativeRules(initial, {
    workHours: 1,
    mealCost: 0,
    dailyAllowance: 35,
  });
  const atNine = advanceCreativeWorld(working, 6);
  assert.equal(atNine.minutes, 540);
  assert.equal(atNine.residents[0].action.id, 'work');
  assert.equal(atNine.residents[0].money, 37);
  assert.equal(advanceCreativeWorld(atNine).residents[0].money, 39);
});

void test('traits change daily needs and mood while local conversations update actual relationship pairs', () => {
  const draft = creativeTemplateDraft('custom');
  draft.rules = { workHours: 0, mealCost: 0, dailyAllowance: 20 };
  draft.residents = [
    { name: '安静的人', role: '记录者', goal: '整理日记', traits: ['quiet'] },
    { name: '温和的人', role: '照料者', goal: '了解邻居', traits: ['kind'] },
    { name: '活跃的人', role: '探索者', goal: '走遍街区', traits: ['active'] },
  ];
  const initial = createCreativeWorld(draft, { id: 'traits', seed: 7, now });
  initial.residents.forEach((p) => {
    p.social = 40;
  });
  const first = advanceCreativeWorld(initial);
  assert.equal(first.residents[2].hunger - initial.residents[2].hunger, 3);
  assert.equal(first.residents[0].hunger - initial.residents[0].hunger, 2);
  assert.ok(
    first.events.some(
      (e) => e.kind === 'conversation' && e.people.length === 2,
    ),
  );
  assert.ok(
    first.relationships.some((r) => r.closeness > 20 && r.lastTalk === 490),
  );
  assert.equal(first.residents.filter((p) => p.action.id === 'talk').length, 2);
  assert.ok(
    first.residents.some(
      (p) =>
        p.mood !== initial.residents.find((before) => before.id === p.id)!.mood,
    ),
  );
  const samePair = first.relationships.find((r) => r.lastTalk === 490)!;
  const next = advanceCreativeWorld(first);
  assert.equal(
    next.relationships.find((r) => r.a === samePair.a && r.b === samePair.b)!
      .lastTalk,
    490,
  );
  assert.deepEqual(parseCreativeWorld(next), next);
});

void test('a one-person world runs safely for many days with bounded needs, money and event history', () => {
  const draft = creativeTemplateDraft('custom');
  draft.residents = draft.residents.slice(0, 1);
  draft.rules = { workHours: 0, mealCost: 0, dailyAllowance: 200 };
  let current = createCreativeWorld(draft, { id: 'solo', seed: 42, now });
  current.residents[0].money = 99990;
  for (let day = 0; day < 30; day++)
    current = advanceCreativeWorld(current, 144);
  assert.equal(current.relationships.length, 0);
  assert.equal(current.allowanceDay, 30);
  assert.equal(current.residents[0].money, 100000);
  assert.equal(current.events.length, MAX_CREATIVE_EVENTS);
  assert.equal(current.events.at(-1)!.id, current.nextEventId - 1);
  for (const need of ['hunger', 'energy', 'social', 'mood'] as const)
    assert.ok(
      current.residents[0][need] >= 0 && current.residents[0][need] <= 100,
    );
  assert.equal(
    current.events.some((event) => event.kind === 'conversation'),
    false,
  );
  assert.deepEqual(parseCreativeWorld(current), current);
});

void test('strict parsing rejects damaged IDs, actions, enums, references, next IDs and allowance markers', () => {
  const initial = advanceCreativeWorld(world(), 12);
  const corruptions: ((value: CreativeWorld) => void)[] = [
    (value) => {
      value.residents[1].id = value.residents[0].id;
    },
    (value) => {
      value.relationships[0].a = 'missing';
    },
    (value) => {
      value.relationships.push(value.relationships[0]);
    },
    (value) => {
      value.events[0].people = ['missing'];
    },
    (value) => {
      value.events[0].id = value.nextEventId;
    },
    (value) => {
      value.nextEventId += 1;
    },
    (value) => {
      value.events[1].id = value.events[0].id;
    },
    (value) => {
      value.minutes += 1;
    },
    (value) => {
      value.allowanceDay += 1;
    },
    (value) => {
      value.residents[0].money = -1;
    },
    (value) => {
      value.residents[0].energy = NaN;
    },
    (value) => {
      value.residents[0].action.since = value.minutes + 10;
    },
    (value) => {
      value.residents[0].action.place = 'table';
      value.residents[0].action.id = 'sleep';
    },
    (value) => {
      Object.assign(value.events[0], { kind: ['world'] });
    },
    (value) => {
      Object.assign(value, { running: true });
    },
    (value) => {
      Reflect.deleteProperty(value.residents[0], 'goal');
    },
  ];
  for (const corrupt of corruptions) {
    const candidate = structuredClone(initial);
    corrupt(candidate);
    assert.throws(() => parseCreativeWorld(candidate));
  }
  assert.deepEqual(parseCreativeWorld(initial), initial);
});

void test('editing world and character descriptions keeps life state and relationships attached to the same IDs', () => {
  const current = advanceCreativeWorld(world(), 40);
  const updated = updateCreativeWorldDetails(current, {
    name: '新的海边名字',
    premise: '加入一条小巷',
    residents: [...current.residents].reverse().map((p) => ({
      id: p.id,
      name: `${p.name}的新名字`,
      role: '邻里记录者',
      goal: '写一本共同日记',
      traits: ['quiet'],
    })),
  });
  assert.equal(updated.minutes, current.minutes);
  assert.deepEqual(updated.relationships, current.relationships);
  assert.deepEqual(
    updated.residents.map((p) => p.id),
    current.residents.map((p) => p.id),
  );
  current.residents.forEach((before, i) => {
    const after = updated.residents[i];
    for (const field of [
      'money',
      'hunger',
      'energy',
      'social',
      'mood',
      'action',
    ] as const)
      assert.deepEqual(after[field], before[field]);
    assert.equal(after.goal, '写一本共同日记');
  });
  const details = {
    name: current.name,
    premise: current.premise,
    residents: current.residents.map(({ id, name, role, goal, traits }) => ({
      id,
      name,
      role,
      goal,
      traits,
    })),
  };
  assert.throws(() =>
    updateCreativeWorldDetails(current, {
      ...details,
      residents: details.residents.slice(1),
    }),
  );
  assert.throws(() =>
    updateCreativeWorldDetails(current, {
      ...details,
      residents: details.residents.map((p) => ({ ...p, id: 'replacement' })),
    }),
  );
  assert.deepEqual(parseCreativeWorld(updated), updated);
});

void test('world archives keep independent progress, unique IDs, a valid active selection and an eight-world cap', () => {
  let library = emptyCreativeLibrary();
  for (let i = 0; i < MAX_CREATIVE_WORLDS; i++)
    library = upsertCreativeWorld(library, world('custom', `world-${i}`));
  assert.equal(library.worlds.length, 8);
  assert.throws(() =>
    upsertCreativeWorld(library, world('custom', 'world-nine')),
  );
  const active = activateCreativeWorld(library, 'world-0');
  const secondBefore = structuredClone(active.worlds[1]);
  const progressed = upsertCreativeWorld(
    active,
    advanceCreativeWorld(active.worlds[0], 12),
  );
  assert.deepEqual(progressed.worlds[1], secondBefore);
  assert.equal(progressed.worlds[0].minutes, 600);
  assert.equal(library.worlds[0].minutes, 480);
  const removed = removeCreativeWorld(progressed, 'world-0');
  assert.equal(removed.activeId, 'world-1');
  assert.deepEqual(removed.recovery!.worlds, progressed.worlds);
  removed.worlds[0].residents[0].name = '删除后继续编辑';
  assert.notEqual(
    removed.recovery!.worlds[1].residents[0].name,
    '删除后继续编辑',
  );
  assert.throws(() => activateCreativeWorld(removed, 'world-0'));
  assert.throws(() =>
    parseCreativeLibrary({
      ...library,
      worlds: [library.worlds[0], library.worlds[0]],
      activeId: 'world-0',
    }),
  );
  assert.throws(() => parseCreativeLibrary({ ...library, activeId: null }));
  const only = upsertCreativeWorld(emptyCreativeLibrary(), world());
  const deleted = removeCreativeWorld(only, 'test-world', now);
  assert.equal(deleted.activeId, null);
  assert.deepEqual(deleted.worlds, []);
  assert.deepEqual(deleted.recovery!.worlds, only.worlds);
  assert.deepEqual(restoreCreativeRecovery(deleted, now).worlds, only.worlds);
});

void test('creative storage uses only its own namespace and a damaged original can never be overwritten by default state', () => {
  const local = memoryStorage([
    ['sine-fine-fate-v1', 'Fate must stay byte-for-byte intact'],
    [
      'sinefine-prototype-worlds',
      'old prototype must stay byte-for-byte intact',
    ],
  ]);
  assert.deepEqual(readCreativeLibrary(local.storage), emptyCreativeLibrary());
  assert.equal(local.writes.length, 0);
  const library = upsertCreativeWorld(emptyCreativeLibrary(), world());
  writeCreativeLibrary(local.storage, library);
  assert.deepEqual(readCreativeLibrary(local.storage), library);
  assert.deepEqual(
    local.writes.map(([key]) => key),
    [CREATIVE_STORAGE_KEY],
  );
  assert.equal(
    local.values.get('sine-fine-fate-v1'),
    'Fate must stay byte-for-byte intact',
  );
  assert.equal(
    local.values.get('sinefine-prototype-worlds'),
    'old prototype must stay byte-for-byte intact',
  );
  for (const broken of [
    '{broken JSON',
    JSON.stringify({ ...library, version: 99 }),
    JSON.stringify({ ...library, recovery: {} }),
  ]) {
    const damaged = memoryStorage([[CREATIVE_STORAGE_KEY, broken]]);
    assert.throws(() => readCreativeLibrary(damaged.storage));
    assert.throws(() =>
      writeCreativeLibrary(damaged.storage, emptyCreativeLibrary()),
    );
    assert.equal(damaged.values.get(CREATIVE_STORAGE_KEY), broken);
    assert.equal(damaged.writes.length, 0);
  }
});

void test('a loaded snapshot keeps the exact raw baseline even if another page replaces storage immediately after the read', () => {
  const previous = upsertCreativeWorld(
    emptyCreativeLibrary(),
    world('coastal', 'previous'),
  );
  const other = upsertCreativeWorld(
    emptyCreativeLibrary(),
    world('orbital', 'other'),
  );
  const previousRaw = JSON.stringify(previous),
    otherRaw = JSON.stringify(other);
  let stored = previousRaw,
    reads = 0;
  const storage: CreativeStorage = {
    getItem: () => {
      reads++;
      const observed = stored;
      stored = otherRaw;
      return observed;
    },
    setItem: () => {
      assert.fail('Reading a snapshot must never write');
    },
  };
  const snapshot = readCreativeLibrarySnapshot(storage);
  assert.equal(reads, 1);
  assert.deepEqual(snapshot.library, previous);
  assert.equal(snapshot.raw, previousRaw);
  assert.notEqual(snapshot.raw, stored);
});

void test('a write returns its own exact baseline instead of claiming a racing page replacement', () => {
  const previous = upsertCreativeWorld(emptyCreativeLibrary(), world());
  const next = upsertCreativeWorld(
    previous,
    advanceCreativeWorld(previous.worlds[0]),
  );
  const other = upsertCreativeWorld(
    emptyCreativeLibrary(),
    world('orbital', 'other'),
  );
  const otherRaw = JSON.stringify(other);
  let stored = JSON.stringify(previous),
    writes = 0;
  const storage: CreativeStorage = {
    getItem: () => stored,
    setItem: (key, text) => {
      assert.equal(key, CREATIVE_STORAGE_KEY);
      writes++;
      stored = text;
      // Simulate another tab replacing the record immediately after this write.
      stored = otherRaw;
    },
  };
  const writtenRaw = writeCreativeLibrary(storage, next);
  assert.equal(writes, 1);
  assert.equal(writtenRaw, JSON.stringify(next));
  assert.equal(stored, otherRaw);
  assert.notEqual(writtenRaw, stored);
});

void test('backup parsing is a read-only preview, rejects other game formats and enforces the real UTF-8 byte limit', () => {
  const library = upsertCreativeWorld(
    emptyCreativeLibrary(),
    advanceCreativeWorld(world(), 20),
  );
  const before = structuredClone(library);
  const backup = createCreativeBackup(library, now);
  const text = serializeCreativeBackup(backup);
  const preview = readCreativeBackupText('\uFEFF' + text);
  assert.deepEqual(preview, backup);
  assert.deepEqual(library, before);
  assert.equal('recovery' in backup, false);
  assert.equal('running' in backup, false);
  assert.throws(() =>
    parseCreativeBackup({
      format: 'sine-fine/fate-backup',
      version: 1,
      save: {},
    }),
  );
  assert.throws(() =>
    parseCreativeBackup({ ...backup, apiKey: 'test-only-extra-field' }),
  );
  assert.throws(() =>
    parseCreativeBackup({
      ...backup,
      worlds: [...backup.worlds, backup.worlds[0]],
    }),
  );
  const tooLarge = '界'.repeat(Math.ceil(MAX_CREATIVE_IMPORT_BYTES / 3));
  assert.ok(tooLarge.length < MAX_CREATIVE_IMPORT_BYTES);
  assert.throws(() => readCreativeBackupText(tooLarge), /2 MB/);
});

void test('confirmed restore preserves the full previous archive and failed atomic writes leave it unchanged', () => {
  const previous = upsertCreativeWorld(
    emptyCreativeLibrary(),
    advanceCreativeWorld(world('coastal', 'home'), 12),
  );
  const other = upsertCreativeWorld(
    emptyCreativeLibrary(),
    world('orbital', 'away'),
  );
  const backup = createCreativeBackup(other, now);
  const restored = restoreCreativeLibrary(previous, backup, now);
  assert.deepEqual(restored.worlds, other.worlds);
  assert.equal(restored.activeId, 'away');
  assert.deepEqual(restored.recovery!.worlds, previous.worlds);
  assert.equal(restored.recovery!.activeId, 'home');
  const local = memoryStorage([
    [CREATIVE_STORAGE_KEY, JSON.stringify(previous)],
  ]);
  const originalRaw = local.values.get(CREATIVE_STORAGE_KEY);
  const fullStorage: CreativeStorage = {
    getItem: local.storage.getItem,
    setItem: () => {
      throw new Error('quota exceeded');
    },
  };
  assert.throws(() => writeCreativeLibrary(fullStorage, restored), /quota/);
  assert.equal(local.values.get(CREATIVE_STORAGE_KEY), originalRaw);
  assert.equal(local.writes.length, 0);
  writeCreativeLibrary(local.storage, restored);
  assert.equal(local.writes.length, 1);
  const loaded = readCreativeLibrary(local.storage);
  assert.deepEqual(loaded.recovery, restored.recovery);
  const returned = restoreCreativeRecovery(loaded, now);
  assert.deepEqual(returned.worlds, previous.worlds);
  assert.equal(returned.activeId, 'home');
  assert.deepEqual(returned.recovery!.worlds, other.worlds);
  assert.deepEqual(restoreCreativeRecovery(returned, now).worlds, other.worlds);
  assert.throws(() => restoreCreativeRecovery(emptyCreativeLibrary()));
});
