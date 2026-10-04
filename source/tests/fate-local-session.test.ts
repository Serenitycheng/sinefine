import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkpointFateLibrary,
  emptyFateLibrary,
  FATE_LIBRARY_KEY,
  type FateStorage,
} from '../lib/fate-backup';
import { createDailyLife } from '../lib/fate-life';
import { legacyDistrictPositions } from './legacy-district';
import {
  FateStorageConflict,
  FATE_ORIGINAL_RECOVERY_KEY,
  isFateStorageKey,
  matchesFateStorageStamp,
  parseFateLocalSnapshot,
  readFateLocalSnapshot,
  readFateStorageStamp,
  recoverFateLocalSnapshot,
  writeFateLocalSnapshot,
} from '../lib/fate-local-session';
import { emptyFateSave, FATE_STORAGE_KEY } from '../lib/fate-state';

function memoryStorage(entries: [string, string][] = []) {
  const records = new Map(entries);
  const reads: string[] = [];
  const writes: [string, string][] = [];
  const storage: FateStorage = {
    getItem(key) {
      reads.push(key);
      return records.get(key) ?? null;
    },
    setItem(key, value) {
      writes.push([key, value]);
      records.set(key, value);
    },
  };
  return { storage, records, reads, writes };
}

void test('empty snapshots do not write or read unrelated world archives', () => {
  const untouched: [string, string][] = [
    ['sinefine-creative-worlds-v1', 'creative progress'],
    ['sinefine-nature-v1', 'nature progress'],
    ['lumen-world-v1', 'prototype progress'],
  ];
  const { storage, records, reads, writes } = memoryStorage(untouched);
  assert.deepEqual(readFateLocalSnapshot(storage), {
    library: emptyFateLibrary(),
    stamp: { library: null, legacy: null },
  });
  assert.deepEqual(reads, [FATE_LIBRARY_KEY, FATE_STORAGE_KEY]);
  assert.equal(writes.length, 0);
  assert.deepEqual([...records], untouched);
  assert.equal(isFateStorageKey(FATE_LIBRARY_KEY), true);
  assert.equal(isFateStorageKey(FATE_STORAGE_KEY), true);
  assert.equal(isFateStorageKey(null), true);
  assert.equal(isFateStorageKey('sinefine-nature-v1'), false);
  assert.equal(isFateStorageKey(''), false);
});

void test('a stale page cannot erase a newer world note or checkpoint; reload permits retry', () => {
  const { storage, records, writes } = memoryStorage();
  const pageA = readFateLocalSnapshot(storage);
  const pageB = readFateLocalSnapshot(storage);
  pageB.library.current.worldNote = '另一页已保存的设定';
  const kept = checkpointFateLibrary(pageB.library, '另一页的备份');
  const saved = writeFateLocalSnapshot(storage, kept, pageB.stamp);
  const original = records.get(FATE_LIBRARY_KEY);

  pageA.library.current.characterNotes.kiritsugu = '旧页面只改人物备注';
  assert.throws(
    () => writeFateLocalSnapshot(storage, pageA.library, pageA.stamp),
    FateStorageConflict,
  );
  assert.equal(records.get(FATE_LIBRARY_KEY), original);
  assert.equal(writes.length, 1);
  assert.deepEqual(pageA.stamp, { library: null, legacy: null });

  const latest = readFateLocalSnapshot(storage);
  latest.library.current.characterNotes.kiritsugu = '重新读取后修改';
  const retried = writeFateLocalSnapshot(storage, latest.library, latest.stamp);
  assert.equal(retried.library.current.worldNote, '另一页已保存的设定');
  assert.equal(
    retried.library.checkpoints[0].id,
    saved.library.checkpoints[0].id,
  );
  assert.equal(retried.stamp.library, records.get(FATE_LIBRARY_KEY));
  assert.equal(writes.length, 2);
  latest.library.current.worldNote = '改变传入对象';
  assert.equal(retried.library.current.worldNote, '另一页已保存的设定');
});

void test('cleared, damaged and unsupported replacement bytes are never overwritten by a stale page', () => {
  for (const replacement of [null, '', '{broken', '{"version":99}']) {
    const original = JSON.stringify(emptyFateLibrary());
    const { storage, records, writes } = memoryStorage([
      [FATE_LIBRARY_KEY, original],
    ]);
    const page = readFateLocalSnapshot(storage);
    if (replacement === null) records.delete(FATE_LIBRARY_KEY);
    else records.set(FATE_LIBRARY_KEY, replacement);
    assert.throws(
      () => writeFateLocalSnapshot(storage, page.library, page.stamp),
      FateStorageConflict,
    );
    assert.equal(storage.getItem(FATE_LIBRARY_KEY), replacement);
    assert.equal(writes.length, 0);
    if (replacement !== null)
      assert.throws(() => readFateLocalSnapshot(storage));
  }
});

void test('legacy migration retains exact original bytes and rejects a changed fallback', () => {
  const legacy = { ...emptyFateSave(), worldNote: '旧版设定' };
  const raw = JSON.stringify(legacy, null, 2);
  const { storage, records, writes } = memoryStorage([[FATE_STORAGE_KEY, raw]]);
  const original = readFateLocalSnapshot(storage);
  assert.equal(original.stamp.legacy, raw);
  assert.equal(original.stamp.library, null);
  assert.equal(writes.length, 0);

  const changed = JSON.stringify({
    ...legacy,
    worldNote: '另一页改过的旧版设定',
  });
  records.set(FATE_STORAGE_KEY, changed);
  assert.throws(
    () => writeFateLocalSnapshot(storage, original.library, original.stamp),
    FateStorageConflict,
  );
  assert.equal(writes.length, 0);
  const latest = readFateLocalSnapshot(storage);
  const migrated = writeFateLocalSnapshot(
    storage,
    latest.library,
    latest.stamp,
  );
  assert.equal(migrated.library.current.worldNote, '另一页改过的旧版设定');
  assert.deepEqual(
    writes.map(([key]) => key),
    [FATE_LIBRARY_KEY],
  );
  assert.equal(records.get(FATE_STORAGE_KEY), changed);
  assert.equal(migrated.stamp.legacy, null);
});

void test('a newly created library supersedes fallback, while inactive legacy changes do not conflict', () => {
  const { storage, records, reads } = memoryStorage([
    [FATE_STORAGE_KEY, JSON.stringify(emptyFateSave())],
  ]);
  const legacyPage = readFateLocalSnapshot(storage);
  const other = emptyFateLibrary();
  other.current.worldNote = '新库优先';
  const raw = JSON.stringify(other, null, 2);
  records.set(FATE_LIBRARY_KEY, raw);
  assert.throws(
    () => writeFateLocalSnapshot(storage, legacyPage.library, legacyPage.stamp),
    FateStorageConflict,
  );
  records.set(FATE_STORAGE_KEY, '{broken fallback');
  reads.length = 0;
  const latest = readFateLocalSnapshot(storage);
  assert.deepEqual(reads, [FATE_LIBRARY_KEY]);
  assert.deepEqual(latest.stamp, { library: raw, legacy: null });
  records.set(FATE_STORAGE_KEY, 'another irrelevant legacy value');
  writeFateLocalSnapshot(storage, latest.library, latest.stamp);
  assert.equal(
    readFateLocalSnapshot(storage).library.current.worldNote,
    '新库优先',
  );
});

void test('invalid proposed worlds and failed storage writes leave the previous archive intact', () => {
  const raw = JSON.stringify(emptyFateLibrary());
  const { storage, records, writes } = memoryStorage([[FATE_LIBRARY_KEY, raw]]);
  const page = readFateLocalSnapshot(storage);
  const invalid = structuredClone(page.library);
  invalid.current.worldNote = 'x'.repeat(2001);
  assert.throws(() => writeFateLocalSnapshot(storage, invalid, page.stamp));
  assert.equal(writes.length, 0);
  let attempts = 0;
  const quota = new Error('QuotaExceededError');
  const failedStorage: FateStorage = {
    getItem: storage.getItem,
    setItem() {
      attempts++;
      throw quota;
    },
  };
  page.library.current.worldNote = '尚未成功保存';
  assert.throws(
    () => writeFateLocalSnapshot(failedStorage, page.library, page.stamp),
    (error) => error === quota,
  );
  assert.equal(attempts, 1);
  assert.equal(records.get(FATE_LIBRARY_KEY), raw);
  assert.equal(page.stamp.library, raw);
  const saved = writeFateLocalSnapshot(storage, page.library, page.stamp);
  assert.equal(saved.library.current.worldNote, '尚未成功保存');
});

void test('daily-life migration keeps the exact stored baseline until an explicit single write', () => {
  const { economy: _economy, ...v12Life } = createDailyLife();
  v12Life.positions = legacyDistrictPositions(v12Life.positions);
  const raw = JSON.stringify(
    {
      ...emptyFateLibrary(),
      current: { ...emptyFateSave(), life: { ...v12Life, version: 12 } },
    },
    null,
    2,
  );
  const { storage, writes } = memoryStorage([[FATE_LIBRARY_KEY, raw]]);
  const snapshot = readFateLocalSnapshot(storage);
  assert.equal(snapshot.library.current.life!.version, 16);
  assert.equal(snapshot.stamp.library, raw);
  assert.equal(writes.length, 0);
  const saved = writeFateLocalSnapshot(
    storage,
    snapshot.library,
    snapshot.stamp,
  );
  assert.equal(writes.length, 1);
  assert.notEqual(saved.stamp.library, raw);
  assert.deepEqual(readFateLocalSnapshot(storage), saved);
});

void test('unchanged worlds avoid writes but still check the current stored baseline', () => {
  const raw = JSON.stringify(emptyFateLibrary());
  const { storage, records, writes } = memoryStorage([[FATE_LIBRARY_KEY, raw]]);
  const snapshot = readFateLocalSnapshot(storage);
  assert.equal(matchesFateStorageStamp(storage, snapshot.stamp), true);
  assert.deepEqual(
    writeFateLocalSnapshot(storage, snapshot.library, snapshot.stamp),
    snapshot,
  );
  assert.equal(writes.length, 0);
  records.delete(FATE_LIBRARY_KEY);
  assert.equal(matchesFateStorageStamp(storage, snapshot.stamp), false);
  assert.throws(
    () => writeFateLocalSnapshot(storage, snapshot.library, snapshot.stamp),
    FateStorageConflict,
  );
  assert.equal(writes.length, 0);
});

void test('explicit recovery protects exact damaged and empty primary or legacy bytes before replacement', () => {
  for (const key of [FATE_LIBRARY_KEY, FATE_STORAGE_KEY]) {
    for (const raw of ['', '{damaged原文']) {
      const { storage, records, writes } = memoryStorage([[key, raw]]);
      const original = readFateStorageStamp(storage);
      assert.deepEqual(
        original,
        key === FATE_LIBRARY_KEY
          ? { library: raw, legacy: null }
          : { library: null, legacy: raw },
      );
      assert.throws(() => readFateLocalSnapshot(storage));
      const next = emptyFateLibrary();
      next.current.worldNote = '从有效备份恢复的世界';
      const recovered = recoverFateLocalSnapshot(storage, next, original);
      assert.deepEqual(
        writes.map(([writtenKey]) => writtenKey),
        [FATE_ORIGINAL_RECOVERY_KEY, FATE_LIBRARY_KEY],
      );
      assert.deepEqual(
        JSON.parse(records.get(FATE_ORIGINAL_RECOVERY_KEY)!),
        original,
      );
      assert.deepEqual(readFateLocalSnapshot(storage), recovered);
      if (key === FATE_STORAGE_KEY) assert.equal(records.get(key), raw);
    }
  }
});

void test('recovery rejects invalid imports and stale originals before replacing the protection copy', () => {
  const { storage, records, writes } = memoryStorage([
    [FATE_LIBRARY_KEY, '{broken'],
    [FATE_ORIGINAL_RECOVERY_KEY, 'previous protected original'],
  ]);
  const stamp = readFateStorageStamp(storage);
  const invalid = emptyFateLibrary();
  invalid.current.worldNote = 'x'.repeat(2001);
  assert.throws(() => recoverFateLocalSnapshot(storage, invalid, stamp));
  assert.equal(writes.length, 0);
  records.set(FATE_LIBRARY_KEY, '{another writer');
  assert.throws(
    () => recoverFateLocalSnapshot(storage, emptyFateLibrary(), stamp),
    FateStorageConflict,
  );
  assert.equal(writes.length, 0);
  assert.equal(
    records.get(FATE_ORIGINAL_RECOVERY_KEY),
    'previous protected original',
  );
  assert.equal(records.get(FATE_LIBRARY_KEY), '{another writer');
});

void test('failure to protect originals or save the recovered world cannot change the previous main record', () => {
  for (const failedKey of [FATE_ORIGINAL_RECOVERY_KEY, FATE_LIBRARY_KEY]) {
    const { storage, records } = memoryStorage([
      [FATE_LIBRARY_KEY, '{broken'],
      [FATE_ORIGINAL_RECOVERY_KEY, 'previous protected original'],
    ]);
    const stamp = readFateStorageStamp(storage);
    const attempts: string[] = [];
    const quota = new Error('QuotaExceededError');
    const failing: FateStorage = {
      getItem: storage.getItem,
      setItem(key, value) {
        attempts.push(key);
        if (key === failedKey) throw quota;
        storage.setItem(key, value);
      },
    };
    assert.throws(
      () => recoverFateLocalSnapshot(failing, emptyFateLibrary(), stamp),
      (error) => error === quota,
    );
    assert.equal(records.get(FATE_LIBRARY_KEY), '{broken');
    if (failedKey === FATE_ORIGINAL_RECOVERY_KEY) {
      assert.deepEqual(attempts, [FATE_ORIGINAL_RECOVERY_KEY]);
      assert.equal(
        records.get(FATE_ORIGINAL_RECOVERY_KEY),
        'previous protected original',
      );
    } else {
      assert.deepEqual(attempts, [
        FATE_ORIGINAL_RECOVERY_KEY,
        FATE_LIBRARY_KEY,
      ]);
      assert.deepEqual(
        JSON.parse(records.get(FATE_ORIGINAL_RECOVERY_KEY)!),
        stamp,
      );
    }
  }
});

void test('recovery checks again after protecting bytes and cannot overwrite a concurrent repair', () => {
  const { storage, records, writes } = memoryStorage([
    [FATE_LIBRARY_KEY, '{broken'],
  ]);
  const stamp = readFateStorageStamp(storage);
  const other = emptyFateLibrary();
  other.current.worldNote = '另一页已修复并保存';
  const otherRaw = JSON.stringify(other);
  const competing: FateStorage = {
    getItem: storage.getItem,
    setItem(key, value) {
      storage.setItem(key, value);
      if (key === FATE_ORIGINAL_RECOVERY_KEY)
        records.set(FATE_LIBRARY_KEY, otherRaw);
    },
  };
  assert.throws(
    () => recoverFateLocalSnapshot(competing, emptyFateLibrary(), stamp),
    FateStorageConflict,
  );
  assert.deepEqual(
    writes.map(([key]) => key),
    [FATE_ORIGINAL_RECOVERY_KEY],
  );
  assert.equal(records.get(FATE_LIBRARY_KEY), otherRaw);
  assert.deepEqual(JSON.parse(records.get(FATE_ORIGINAL_RECOVERY_KEY)!), stamp);
});

void test('a parse failure stays bound to the captured original even if another page has repaired storage', () => {
  const { storage, records, writes } = memoryStorage([
    [FATE_LIBRARY_KEY, '{broken at read'],
  ]);
  const captured = readFateStorageStamp(storage);
  const repaired = emptyFateLibrary();
  repaired.current.worldNote = '读取之后另一页修好的记录';
  const repairedRaw = JSON.stringify(repaired);
  records.set(FATE_LIBRARY_KEY, repairedRaw);
  assert.throws(() => parseFateLocalSnapshot(captured));
  assert.equal(captured.library, '{broken at read');
  assert.throws(
    () => recoverFateLocalSnapshot(storage, emptyFateLibrary(), captured),
    FateStorageConflict,
  );
  assert.equal(records.get(FATE_LIBRARY_KEY), repairedRaw);
  assert.equal(writes.length, 0);
});
