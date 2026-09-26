import {
  emptyFateLibrary,
  FATE_LIBRARY_KEY,
  parseFateLibrary,
  type FateLibrary,
  type FateStorage,
} from './fate-backup';
import { FATE_STORAGE_KEY, parseFateSave } from './fate-state';

export const FATE_ORIGINAL_RECOVERY_KEY = 'sine-fine-fate-original-recovery-v1';

export type FateStorageStamp = {
  library: string | null;
  legacy: string | null;
};

export type FateLocalSnapshot = {
  library: FateLibrary;
  stamp: FateStorageStamp;
};

export class FateStorageConflict extends Error {
  constructor() {
    super('另一页面已修改或清空 Fate 记录，请先重新读取最新进度。');
    this.name = 'FateStorageConflict';
  }
}

export function readFateStorageStamp(storage: FateStorage): FateStorageStamp {
  const library = storage.getItem(FATE_LIBRARY_KEY);
  return {
    library,
    // Once the library exists, the old migration fallback is no longer active.
    legacy: library === null ? storage.getItem(FATE_STORAGE_KEY) : null,
  };
}

function sameStamp(
  current: FateStorageStamp,
  expected: FateStorageStamp,
): boolean {
  return (
    current.library === expected.library &&
    (current.library !== null || current.legacy === expected.legacy)
  );
}

export function isFateStorageKey(key: string | null): boolean {
  return key === null || key === FATE_LIBRARY_KEY || key === FATE_STORAGE_KEY;
}

export function matchesFateStorageStamp(
  storage: FateStorage,
  expected: FateStorageStamp,
): boolean {
  return sameStamp(readFateStorageStamp(storage), expected);
}

/** Parse captured bytes without reading a potentially changed storage value again. */
export function parseFateLocalSnapshot(
  stamp: FateStorageStamp,
): FateLocalSnapshot {
  const library =
    stamp.library !== null
      ? parseFateLibrary(JSON.parse(stamp.library))
      : stamp.legacy !== null
        ? {
            version: 1 as const,
            current: parseFateSave(JSON.parse(stamp.legacy)),
            checkpoints: [],
          }
        : emptyFateLibrary();
  return { library, stamp };
}

/** Read and parse the same captured bytes, preserving the pre-migration baseline. */
export function readFateLocalSnapshot(storage: FateStorage): FateLocalSnapshot {
  return parseFateLocalSnapshot(readFateStorageStamp(storage));
}

/** Reject a stale page before replacing the complete library in one storage write. */
export function writeFateLocalSnapshot(
  storage: FateStorage,
  library: FateLibrary,
  expectedStamp: FateStorageStamp,
): FateLocalSnapshot {
  if (!matchesFateStorageStamp(storage, expectedStamp))
    throw new FateStorageConflict();

  const clean = parseFateLibrary(library);
  const raw = JSON.stringify(clean);
  if (raw !== expectedStamp.library) storage.setItem(FATE_LIBRARY_KEY, raw);
  // Do not adopt a later writer's bytes as the baseline for our in-memory world.
  return { library: clean, stamp: { library: raw, legacy: null } };
}

/** Explicit recovery keeps unreadable original bytes before replacing the active save. */
export function recoverFateLocalSnapshot(
  storage: FateStorage,
  library: FateLibrary,
  expectedStamp: FateStorageStamp,
): FateLocalSnapshot {
  const original = readFateStorageStamp(storage);
  if (!sameStamp(original, expectedStamp)) throw new FateStorageConflict();
  const clean = parseFateLibrary(library);
  storage.setItem(FATE_ORIGINAL_RECOVERY_KEY, JSON.stringify(original));
  // A competing page can change the main save while its original is being protected.
  return writeFateLocalSnapshot(storage, clean, expectedStamp);
}
