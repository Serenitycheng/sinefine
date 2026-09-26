import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createNatureWorld,
  interveneNature,
  MAX_NATURE_TICK,
  NATURE_BACKUP_KEY,
  NATURE_CAPS,
  NATURE_ORIGINAL_RECOVERY_KEY,
  NATURE_STORAGE_KEY,
  NatureStorageConflict,
  natureSnapshot,
  natureTime,
  parseNatureSave,
  replaceNatureSave,
  serializeNature,
  setNatureParameters,
  stepNature,
  type NatureStorage,
  type NatureWorld,
} from '../lib/nature-world';

function run(world: NatureWorld, steps: number) {
  for (let index = 0; index < steps; index++) world = stepNature(world);
  return world;
}

void test('a seed and the same interventions reproduce the full ecology without mutating previous frames', () => {
  const start = createNatureWorld('moss-and-rain');
  const untouched = structuredClone(start);
  const sequence = (world: NatureWorld) =>
    run(
      interveneNature(
        run(
          setNatureParameters(world, {
            rainfall: 75,
            fertility: 130,
            refuge: 60,
          }),
          22,
        ),
        'water',
      ),
      29,
    );
  assert.deepEqual(
    sequence(start),
    sequence(createNatureWorld('moss-and-rain')),
  );
  assert.deepEqual(start, untouched);
  assert.notDeepEqual(
    start.patches,
    createNatureWorld('another-valley').patches,
  );
  assert.throws(() => createNatureWorld('   '));
  assert.throws(() => createNatureWorld('x'.repeat(41)));
});

void test('without water or food, animals lose energy and die; no extinct species appears without intervention', () => {
  const world = createNatureWorld('dry-valley');
  world.animals = world.animals.slice(0, 1);
  world.animals[0].energy = 1;
  world.patches.fill(0);
  world.water = 0;
  world.weather = 'dry';
  world.tick = 2;
  const after = stepNature(world);
  assert.equal(after.animals.length, 0);
  assert.equal(after.deaths, 1);
  assert.match(
    after.events.map((event) => event.text).join(' '),
    /缺乏食物|水分/,
  );
  assert.equal(run(after, 100).animals.length, 0);
  assert.equal(interveneNature(after, 'grazer').animals.length, 6);
  const predator = createNatureWorld('hungry-predator');
  predator.animals = predator.animals
    .filter((animal) => animal.species === 'predator')
    .slice(0, 1);
  predator.animals[0].energy = 1;
  assert.equal(stepNature(predator).animals.length, 0);
});

void test('adequate resources support plant growth and births, while hunting and old age cause real losses', () => {
  let fertile = createNatureWorld('new-life');
  fertile = setNatureParameters(fertile, {
    rainfall: 100,
    fertility: 180,
    refuge: 80,
  });
  fertile.animals = fertile.animals.filter(
    (animal) => animal.species === 'grazer',
  );
  fertile.water = 100;
  fertile = run(fertile, 80);
  assert.ok(fertile.births > 0, 'well-fed grazers should reproduce');
  const bare = createNatureWorld('green-again');
  bare.patches.fill(0);
  bare.animals = [];
  bare.water = 100;
  bare.parameters.rainfall = 100;
  assert.ok(natureSnapshot(run(bare, 12)).plants > 0);
  const hunt = run(createNatureWorld('hunt'), 20);
  assert.ok(hunt.events.some((event) => event.text.includes('被捕食')));
  const old = createNatureWorld('old');
  old.animals = old.animals.slice(0, 1);
  old.animals[0].age = 179;
  old.animals[0].energy = 100;
  assert.equal(stepNature(old).animals.length, 0);
});

void test('population, map, resources and records remain bounded during repeated introductions and extreme weather', () => {
  let world = createNatureWorld('bounded');
  for (let index = 0; index < 400; index++) {
    if (index % 10 === 0) {
      world = setNatureParameters(world, {
        rainfall: index % 20 ? 0 : 100,
        fertility: index % 20 ? 20 : 180,
        refuge: index % 20 ? 0 : 80,
      });
      world = interveneNature(
        interveneNature(
          interveneNature(interveneNature(world, 'grazer'), 'predator'),
          'water',
        ),
        'seed',
      );
    }
    world = stepNature(world);
    const summary = natureSnapshot(world);
    assert.ok(
      summary.grazers <= NATURE_CAPS.grazer &&
        summary.predators <= NATURE_CAPS.predator,
    );
    assert.ok(world.water >= 0 && world.water <= 100);
    assert.ok(world.patches.every((amount) => amount >= 0 && amount <= 9));
    assert.ok(world.events.length <= 60 && world.history.length <= 96);
    assert.deepEqual(parseNatureSave(serializeNature(world)), world);
  }
  for (let index = 0; index < 30; index++)
    world = interveneNature(interveneNature(world, 'grazer'), 'predator');
  assert.equal(natureSnapshot(world).grazers, NATURE_CAPS.grazer);
  assert.equal(natureSnapshot(world).predators, NATURE_CAPS.predator);
  const limit = { ...world, tick: MAX_NATURE_TICK };
  assert.equal(stepNature(limit), limit);
  assert.throws(() =>
    setNatureParameters(world, { rainfall: 101, fertility: 100, refuge: 40 }),
  );
});

void test('a cross-day save preserves clock, random state, animals and deterministic continuation', () => {
  const world = run(createNatureWorld('several-days'), 53);
  assert.equal(natureTime(world.tick), '第 9 天 · 20:00');
  const restored = parseNatureSave(serializeNature(world));
  assert.deepEqual(restored, world);
  assert.deepEqual(run(restored, 37), run(world, 37));
  const envelope = JSON.parse(serializeNature(world)) as Record<
    string,
    unknown
  >;
  assert.deepEqual(Object.keys(envelope).sort(), [
    'format',
    'version',
    'world',
  ]);
  assert.ok(
    !('running' in restored),
    'running state is never persisted or replayed after reopening',
  );
});

void test('strict import rejects malformed, foreign, oversized, inconsistent and disguised values', () => {
  const original = serializeNature(createNatureWorld('schema'));
  const invalid: ((save: {
    format: string;
    version: number;
    world: Record<string, unknown>;
  }) => void)[] = [
    (save) => {
      save.format = 'fate';
    },
    (save) => {
      save.version = 2;
    },
    (save) => {
      save.world.extra = true;
    },
    (save) => {
      save.world.weather = 'toString';
    },
    (save) => {
      save.world.water = -1;
    },
    (save) => {
      save.world.rng = 2 ** 32;
    },
    (save) => {
      save.world.parameters = { rainfall: 10, fertility: 100, refuge: 81 };
    },
    (save) => {
      (save.world.patches as number[])[0] = 10;
    },
    (save) => {
      (save.world.patches as number[]).pop();
    },
    (save) => {
      const animals = save.world.animals as Record<string, unknown>[];
      animals[1].id = animals[0].id;
    },
    (save) => {
      (save.world.animals as Record<string, unknown>[])[0].x = 18;
    },
    (save) => {
      (save.world.events as Record<string, unknown>[])[0].kind = ['life'];
    },
    (save) => {
      (save.world.events as Record<string, unknown>[])[0].tick = 9;
    },
    (save) => {
      (save.world.history as Record<string, unknown>[])[0].plants = 1;
    },
    (save) => {
      save.world.history = [];
    },
  ];
  for (const mutate of invalid) {
    const save = JSON.parse(original) as {
      format: string;
      version: number;
      world: Record<string, unknown>;
    };
    mutate(save);
    assert.throws(() => parseNatureSave(JSON.stringify(save)));
  }
  for (const raw of ['', '{', 'null', '[]', '{}', ' '.repeat(1_000_001)])
    assert.throws(() => parseNatureSave(raw));
  assert.deepEqual(parseNatureSave(original), createNatureWorld('schema'));
});

void test('valid imported counter boundaries remain readable after new life and interventions', () => {
  const world = createNatureWorld('counter-boundary');
  world.nextId = 1_000_000_000;
  world.nextEvent = 1_000_000_000;
  world.births = 1_000_000_000;
  world.deaths = 1_000_000_000;
  const imported = parseNatureSave(serializeNature(world));
  const next = run(interveneNature(imported, 'grazer'), 30);
  assert.deepEqual(parseNatureSave(serializeNature(next)), next);
  assert.equal(
    new Set(next.animals.map((animal) => animal.id)).size,
    next.animals.length,
  );
});

class MemoryStorage implements NatureStorage {
  values = new Map<string, string>();
  failure: string | null = null;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (key === this.failure) throw new Error('storage quota');
    this.values.set(key, value);
  }
}

void test('confirmed replacement preserves latest in-memory progress and can restore it later', () => {
  const storage = new MemoryStorage();
  const initial = createNatureWorld('old');
  storage.setItem(NATURE_STORAGE_KEY, serializeNature(initial));
  const current = run(initial, 15),
    next = createNatureWorld('new');
  replaceNatureSave(storage, next, current);
  assert.deepEqual(parseNatureSave(storage.getItem(NATURE_STORAGE_KEY)!), next);
  assert.deepEqual(
    parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!),
    current,
  );
  replaceNatureSave(
    storage,
    parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!),
    next,
  );
  assert.deepEqual(
    parseNatureSave(storage.getItem(NATURE_STORAGE_KEY)!),
    current,
  );
  assert.deepEqual(parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!), next);
  assert.deepEqual(
    [...storage.values.keys()].sort(),
    [NATURE_BACKUP_KEY, NATURE_STORAGE_KEY].sort(),
  );
});

void test('backup or primary write failure cannot destroy the previous primary, and damaged originals are retained exactly', () => {
  const previous = serializeNature(createNatureWorld('protected'));
  for (const failedKey of [NATURE_BACKUP_KEY, NATURE_STORAGE_KEY]) {
    const storage = new MemoryStorage();
    storage.setItem(NATURE_STORAGE_KEY, previous);
    storage.failure = failedKey;
    assert.throws(() =>
      replaceNatureSave(storage, createNatureWorld('incoming')),
    );
    assert.equal(storage.getItem(NATURE_STORAGE_KEY), previous);
  }
  for (const damaged of ['', '{broken']) {
    const storage = new MemoryStorage();
    storage.setItem(NATURE_STORAGE_KEY, damaged);
    replaceNatureSave(storage, createNatureWorld('restart'));
    assert.equal(storage.getItem(NATURE_BACKUP_KEY), damaged);
    assert.equal(storage.getItem(NATURE_ORIGINAL_RECOVERY_KEY), damaged);
  }
});

void test('repair keeps damaged original bytes and playable in-memory progress separately', () => {
  const current = run(createNatureWorld('still-on-screen'), 17);
  const next = createNatureWorld('recovered');
  for (const damaged of ['', '  {broken\r\n山谷原文  ']) {
    const storage = new MemoryStorage();
    storage.setItem(NATURE_STORAGE_KEY, damaged);
    const written = replaceNatureSave(storage, next, current, damaged);
    assert.equal(written, serializeNature(next));
    assert.equal(storage.getItem(NATURE_STORAGE_KEY), written);
    assert.equal(storage.getItem(NATURE_ORIGINAL_RECOVERY_KEY), damaged);
    assert.deepEqual(
      parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!),
      current,
    );
  }
});

void test('every failed repair write leaves the damaged primary intact and keeps prior protections until their replacement succeeds', () => {
  const damaged = '{original-broken';
  const previousBackup = serializeNature(createNatureWorld('earlier-backup'));
  const current = run(createNatureWorld('unsaved-life'), 9);
  for (const failedKey of [
    NATURE_ORIGINAL_RECOVERY_KEY,
    NATURE_BACKUP_KEY,
    NATURE_STORAGE_KEY,
  ]) {
    const storage = new MemoryStorage();
    storage.setItem(NATURE_STORAGE_KEY, damaged);
    storage.setItem(NATURE_ORIGINAL_RECOVERY_KEY, '{earlier-original');
    storage.setItem(NATURE_BACKUP_KEY, previousBackup);
    storage.failure = failedKey;
    assert.throws(
      () =>
        replaceNatureSave(
          storage,
          createNatureWorld('incoming-repair'),
          current,
          damaged,
        ),
      /storage quota/,
    );
    assert.equal(storage.getItem(NATURE_STORAGE_KEY), damaged);
    assert.equal(
      storage.getItem(NATURE_ORIGINAL_RECOVERY_KEY),
      failedKey === NATURE_ORIGINAL_RECOVERY_KEY
        ? '{earlier-original'
        : damaged,
    );
    assert.equal(
      storage.getItem(NATURE_BACKUP_KEY),
      failedKey === NATURE_STORAGE_KEY
        ? serializeNature(current)
        : previousBackup,
    );
  }
});

void test('changed, removed and newly created primaries reject stale confirmation before any protection is written', () => {
  const old = serializeNature(createNatureWorld('before-preview'));
  const incoming = serializeNature(createNatureWorld('other-page'));
  for (const [expected, actual] of [
    [old, incoming],
    [old, null],
    [null, incoming],
    ['', '{new-corruption'],
  ] as const) {
    const storage = new MemoryStorage();
    if (actual !== null) storage.setItem(NATURE_STORAGE_KEY, actual);
    storage.setItem(NATURE_ORIGINAL_RECOVERY_KEY, '{keep-protected');
    storage.setItem(NATURE_BACKUP_KEY, old);
    const before = new Map(storage.values);
    const writes: string[] = [];
    const observed: NatureStorage = {
      getItem: (key) => storage.getItem(key),
      setItem(key, value) {
        writes.push(key);
        storage.setItem(key, value);
      },
    };
    assert.throws(
      () =>
        replaceNatureSave(
          observed,
          createNatureWorld('stale-preview'),
          createNatureWorld('my-page'),
          expected,
        ),
      NatureStorageConflict,
    );
    assert.deepEqual(writes, []);
    assert.deepEqual(storage.values, before);
  }
});

void test('invalid incoming or in-memory worlds cannot overwrite either protected record', () => {
  const valid = createNatureWorld('valid');
  const invalid = { ...valid, water: -1 };
  for (const [next, current] of [
    [invalid, valid],
    [valid, invalid],
  ]) {
    const storage = new MemoryStorage();
    storage.setItem(NATURE_STORAGE_KEY, '{damaged');
    storage.setItem(NATURE_ORIGINAL_RECOVERY_KEY, '{earlier-original');
    storage.setItem(
      NATURE_BACKUP_KEY,
      serializeNature(createNatureWorld('earlier-backup')),
    );
    const before = new Map(storage.values);
    const writes: string[] = [];
    const observed: NatureStorage = {
      getItem: (key) => storage.getItem(key),
      setItem(key, value) {
        writes.push(key);
        storage.setItem(key, value);
      },
    };
    assert.throws(() => replaceNatureSave(observed, next, current, '{damaged'));
    assert.deepEqual(writes, []);
    assert.deepEqual(storage.values, before);
  }
});

void test('another page updating or clearing primary during protection cannot be overwritten by repair', () => {
  const damaged = '{broken-on-opening';
  const current = run(createNatureWorld('pending-progress'), 3);
  const external = serializeNature(createNatureWorld('repaired-elsewhere'));
  for (const intervenedKey of [
    NATURE_ORIGINAL_RECOVERY_KEY,
    NATURE_BACKUP_KEY,
  ]) {
    for (const externalRaw of [external, null]) {
      const storage = new MemoryStorage();
      storage.setItem(NATURE_STORAGE_KEY, damaged);
      const observed: NatureStorage = {
        getItem: (key) => storage.getItem(key),
        setItem(key, value) {
          storage.setItem(key, value);
          if (key !== intervenedKey) return;
          if (externalRaw === null) storage.values.delete(NATURE_STORAGE_KEY);
          else storage.values.set(NATURE_STORAGE_KEY, externalRaw);
        },
      };
      assert.throws(
        () =>
          replaceNatureSave(
            observed,
            createNatureWorld('cancelled-repair'),
            current,
            damaged,
          ),
        NatureStorageConflict,
      );
      assert.equal(storage.getItem(NATURE_STORAGE_KEY), externalRaw);
      assert.equal(storage.getItem(NATURE_ORIGINAL_RECOVERY_KEY), damaged);
      assert.deepEqual(
        parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!),
        current,
      );
    }
  }
});

void test('ordinary replacements and restoring playable progress retain the separately protected damaged original', () => {
  const storage = new MemoryStorage();
  const damaged = '{preserve-after-repair';
  storage.setItem(NATURE_STORAGE_KEY, damaged);
  const current = run(createNatureWorld('recoverable-life'), 21);
  const repaired = createNatureWorld('fresh-valley');
  const repairedRaw = replaceNatureSave(storage, repaired, current, damaged);
  const restored = parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!);
  const restoredRaw = replaceNatureSave(
    storage,
    restored,
    repaired,
    repairedRaw,
  );
  assert.equal(restoredRaw, serializeNature(current));
  assert.deepEqual(
    parseNatureSave(storage.getItem(NATURE_STORAGE_KEY)!),
    current,
  );
  assert.deepEqual(
    parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!),
    repaired,
  );
  assert.equal(storage.getItem(NATURE_ORIGINAL_RECOVERY_KEY), damaged);
  replaceNatureSave(storage, createNatureWorld('another-valley'));
  assert.deepEqual(
    parseNatureSave(storage.getItem(NATURE_BACKUP_KEY)!),
    current,
  );
  assert.equal(storage.getItem(NATURE_ORIGINAL_RECOVERY_KEY), damaged);
});
