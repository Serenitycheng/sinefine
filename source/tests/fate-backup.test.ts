import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkpointFateLibrary,
  createFateBackup,
  emptyFateLibrary,
  FATE_LIBRARY_KEY,
  MAX_BACKUP_BYTES,
  MAX_CHECKPOINTS,
  parseFateLibrary,
  readFateBackupFile,
  readFateBackupText,
  readFateLibrary,
  restoreFateLibrary,
  serializeFateBackup,
  writeFateLibrary,
  type FateStorage,
} from '../lib/fate-backup';
import { createDailyLife, LIFE_IDS } from '../lib/fate-life';
import { legacyDistrictPoint } from './legacy-district';
import {
  emptyFateSave,
  FATE_STORAGE_KEY,
  type FateSave,
} from '../lib/fate-state';

function savedWorld(): FateSave {
  return {
    ...emptyFateSave(),
    worldNote: '雨后的冬木',
    characterNotes: { rin: '今天想去书店。' },
    relationshipNotes: { shirou: '和凛一起散步。' },
    history: [
      {
        id: 'conversation-1',
        target: 'rin',
        speaker: 'shirou',
        message: '一起去书店吗？',
        reply: '好，走吧。',
        source: 'preset',
        createdAt: '2026-09-26T08:00:00.000Z',
      },
    ],
    life: createDailyLife(),
  };
}

function memoryStorage(entries: [string, string][] = []) {
  const records = new Map(entries);
  const writes: [string, string][] = [];
  const storage: FateStorage = {
    getItem: (key) => records.get(key) ?? null,
    setItem(key, value) {
      writes.push([key, value]);
      records.set(key, value);
    },
  };
  return { storage, records, writes };
}

void test('backup export/import preserves settings, conversations and daily life without aliases', () => {
  const save = savedWorld();
  const backup = createFateBackup(
    save,
    '  我的冬木  ',
    new Date('2026-09-26T08:00:00Z'),
  );
  const imported = readFateBackupText('\uFEFF' + serializeFateBackup(backup));
  assert.deepEqual(imported, backup);
  assert.deepEqual(imported.save, save);
  assert.equal(imported.title, '我的冬木');
  save.characterNotes.rin = '改变原对象';
  save.life!.people.rin.hunger = 99;
  assert.equal(imported.save.characterNotes.rin, '今天想去书店。');
  assert.equal(imported.save.life!.people.rin.hunger, 59);
});

void test('raw v1 saves and the original two-resident daily life migrate without losing progress', () => {
  const baseline = createDailyLife();
  const legacy = {
    ...emptyFateSave(),
    worldNote: '旧存档保留的设定',
    life: {
      version: 1,
      minutes: 1080,
      nextId: 2,
      nextEncounter: 1095,
      holdUntil: 0,
      encounters: 1,
      people: { saber: baseline.people.saber, rin: baseline.people.rin },
      positions: {
        admin: legacyDistrictPoint(baseline.positions.admin),
        saber: legacyDistrictPoint(baseline.positions.saber),
        rin: legacyDistrictPoint(baseline.positions.rin),
      },
      events: [
        {
          id: 1,
          minute: 1070,
          text: '曾在街道相遇',
          dialogue: {
            speaker: 'saber',
            target: 'rin',
            message: '晚上好。',
            reply: '晚上好。',
            source: 'preset',
          },
        },
      ],
    },
  };
  const backup = readFateBackupText(JSON.stringify(legacy));
  assert.equal(backup.createdAt, null);
  assert.equal(backup.save.worldNote, legacy.worldNote);
  assert.equal(backup.save.life!.version, 15);
  assert.equal(backup.save.life!.minutes, 1080);
  assert.equal(backup.save.life!.lastEncounters['rin|saber'], 1070);
  assert.equal(backup.save.life!.waverStage, 'young');
  assert.deepEqual(
    Object.keys(backup.save.life!.people).sort(),
    [...LIFE_IDS].sort(),
  );
  assert.deepEqual(backup.save.life!.people.rin, baseline.people.rin);
});

void test('library migration reads legacy progress, gives current library priority and never writes on read', () => {
  const legacy = savedWorld();
  const { storage, records, writes } = memoryStorage([
    [FATE_STORAGE_KEY, JSON.stringify(legacy)],
  ]);
  assert.deepEqual(readFateLibrary(storage).current, legacy);
  const library = emptyFateLibrary();
  library.current.worldNote = '新存档';
  records.set(FATE_LIBRARY_KEY, JSON.stringify(library));
  assert.equal(readFateLibrary(storage).current.worldNote, '新存档');
  records.set(FATE_LIBRARY_KEY, '{damaged');
  assert.throws(() => readFateLibrary(storage));
  assert.deepEqual(writes, []);
  assert.equal(records.get(FATE_STORAGE_KEY), JSON.stringify(legacy));
});

void test('invalid imports cannot overwrite current progress or its checkpoints', () => {
  const library = checkpointFateLibrary(
    { ...emptyFateLibrary(), current: savedWorld() },
    '安全备份',
  );
  const original = JSON.stringify(library);
  const { storage, records, writes } = memoryStorage([
    [FATE_LIBRARY_KEY, original],
  ]);
  for (const text of [
    '{broken',
    JSON.stringify({ version: 1, residents: [] }),
    JSON.stringify({
      ...createFateBackup(savedWorld()),
      save: { ...savedWorld(), worldNote: 'x'.repeat(2001) },
    }),
  ]) {
    assert.throws(() =>
      writeFateLibrary(
        storage,
        restoreFateLibrary(library, readFateBackupText(text)),
      ),
    );
  }
  assert.equal(JSON.stringify(library), original);
  assert.equal(records.get(FATE_LIBRARY_KEY), original);
  assert.deepEqual(writes, []);
});

void test('failed atomic storage writes leave both the previous world and legacy fallback intact', () => {
  const library = { ...emptyFateLibrary(), current: savedWorld() };
  const oldText = JSON.stringify(library);
  const { storage, records } = memoryStorage([
    [FATE_LIBRARY_KEY, oldText],
    [FATE_STORAGE_KEY, JSON.stringify(library.current)],
  ]);
  let attempts = 0;
  storage.setItem = () => {
    attempts++;
    throw new Error('QuotaExceededError');
  };
  const restored = restoreFateLibrary(
    library,
    createFateBackup(emptyFateSave()),
  );
  assert.throws(
    () => writeFateLibrary(storage, restored),
    /QuotaExceededError/,
  );
  assert.equal(attempts, 1);
  assert.equal(records.get(FATE_LIBRARY_KEY), oldText);
  assert.equal(records.get(FATE_STORAGE_KEY), JSON.stringify(library.current));
  assert.equal(JSON.stringify(library), oldText);
});

void test('restoring keeps a pre-restore checkpoint and commits the bounded library in one write', () => {
  let library = { ...emptyFateLibrary(), current: savedWorld() };
  for (let i = 0; i < MAX_CHECKPOINTS + 2; i++)
    library = checkpointFateLibrary(library, `备份 ${i}`);
  assert.equal(library.checkpoints.length, MAX_CHECKPOINTS);
  assert.deepEqual(
    library.checkpoints.map((b) => b.title),
    ['备份 4', '备份 3', '备份 2'],
  );
  const previous = structuredClone(library.current);
  const target = { ...savedWorld(), worldNote: '恢复的世界' };
  const restored = restoreFateLibrary(library, createFateBackup(target));
  const { storage, writes } = memoryStorage();
  writeFateLibrary(storage, restored);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], FATE_LIBRARY_KEY);
  assert.deepEqual(readFateLibrary(storage), restored);
  assert.deepEqual(restored.current, target);
  assert.deepEqual(restored.checkpoints[0].save, previous);
  assert.equal(restored.checkpoints[0].title, '恢复前的进度');
  assert.equal(restored.checkpoints.length, MAX_CHECKPOINTS);
  assert.deepEqual(library.current, previous);
});

void test('backup limits reject duplicate IDs, unsupported versions and oversized UTF-8/file content', async () => {
  const backup = createFateBackup(savedWorld());
  assert.throws(
    () =>
      parseFateLibrary({
        version: 1,
        current: savedWorld(),
        checkpoints: [backup, backup],
      }),
    /重复/,
  );
  assert.throws(
    () => readFateBackupText(JSON.stringify({ ...backup, version: 2 })),
    /版本/,
  );
  assert.throws(
    () => readFateBackupText('冬'.repeat(Math.floor(MAX_BACKUP_BYTES / 3) + 1)),
    /5 MB/,
  );
  let read = false;
  await assert.rejects(
    readFateBackupFile({
      size: MAX_BACKUP_BYTES + 1,
      async text() {
        read = true;
        return '';
      },
    }),
    /5 MB/,
  );
  assert.equal(read, false);
});
