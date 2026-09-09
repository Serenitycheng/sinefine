import {
  emptyFateSave,
  FATE_STORAGE_KEY,
  parseFateSave,
  type FateSave,
} from './fate-state';

export const FATE_LIBRARY_KEY = 'sine-fine-fate-library-v1';
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_CHECKPOINTS = 3;
export type FateBackup = {
  format: 'sine-fine/fate-backup';
  version: 1;
  id: string;
  title: string;
  createdAt: string | null;
  save: FateSave;
};
export type FateLibrary = {
  version: 1;
  current: FateSave;
  checkpoints: FateBackup[];
};
export type FateStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function emptyFateLibrary(): FateLibrary {
  return { version: 1, current: emptyFateSave(), checkpoints: [] };
}
export function createFateBackup(
  save: FateSave,
  title = '我的冬木',
  date = new Date(),
): FateBackup {
  return {
    format: 'sine-fine/fate-backup',
    version: 1,
    id: crypto.randomUUID(),
    title: title.trim().slice(0, 60) || '我的冬木',
    createdAt: date.toISOString(),
    save: parseFateSave(save),
  };
}
export function parseFateBackup(value: unknown): FateBackup {
  if (!value || typeof value !== 'object')
    throw new Error('这不是有效的 Fate 存档。');
  const x = value as Record<string, unknown>;
  if (x.format !== 'sine-fine/fate-backup' || x.version !== 1)
    throw new Error('这份文件不属于当前支持的 Fate 备份版本。');
  if (
    typeof x.id !== 'string' ||
    !x.id ||
    x.id.length > 80 ||
    typeof x.title !== 'string' ||
    x.title.length > 60 ||
    (x.createdAt !== null &&
      (typeof x.createdAt !== 'string' ||
        x.createdAt.length > 40 ||
        !Number.isFinite(Date.parse(x.createdAt))))
  )
    throw new Error('备份信息不完整或已损坏。');
  return {
    format: 'sine-fine/fate-backup',
    version: 1,
    id: x.id,
    title: x.title,
    createdAt: typeof x.createdAt === 'string' ? x.createdAt : null,
    save: parseFateSave(x.save),
  };
}
export function parseFateLibrary(value: unknown): FateLibrary {
  if (!value || typeof value !== 'object') throw new Error('本地存档库无效。');
  const x = value as Record<string, unknown>;
  if (
    x.version !== 1 ||
    !Array.isArray(x.checkpoints) ||
    x.checkpoints.length > MAX_CHECKPOINTS
  )
    throw new Error('本地存档库版本无效。');
  const checkpoints = x.checkpoints.map(parseFateBackup);
  if (new Set(checkpoints.map((item) => item.id)).size !== checkpoints.length)
    throw new Error('备份编号重复。');
  return { version: 1, current: parseFateSave(x.current), checkpoints };
}
/** Prefer the new atomic library; leave the legacy record untouched as a migration fallback. */
export function readFateLibrary(storage: FateStorage): FateLibrary {
  const raw = storage.getItem(FATE_LIBRARY_KEY);
  if (raw !== null) return parseFateLibrary(JSON.parse(raw));
  const legacy = storage.getItem(FATE_STORAGE_KEY);
  return legacy === null
    ? emptyFateLibrary()
    : {
        version: 1,
        current: parseFateSave(JSON.parse(legacy)),
        checkpoints: [],
      };
}
export function readFateBackupText(text: string): FateBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error('文件超过 5 MB，请选择单份 Fate 存档。');
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('文件无法读取，请选择完整的存档文件。');
  }
  if (value && typeof value === 'object' && !Object.hasOwn(value, 'format')) {
    // A raw v1 Fate save is supported; unrelated prototype saves fail the strict parser.
    return {
      ...createFateBackup(parseFateSave(value), '旧版 Fate 存档'),
      createdAt: null,
    };
  }
  return parseFateBackup(value);
}
export async function readFateBackupFile(
  file: Pick<File, 'size' | 'text'>,
): Promise<FateBackup> {
  if (file.size > MAX_BACKUP_BYTES)
    throw new Error('文件超过 5 MB，请选择单份 Fate 存档。');
  return readFateBackupText(await file.text());
}
export function serializeFateBackup(backup: FateBackup): string {
  return JSON.stringify(parseFateBackup(backup), null, 2);
}
export function backupFilename(backup: FateBackup): string {
  return `sine-fine-fate-${(backup.createdAt ? new Date(backup.createdAt) : new Date()).toISOString().replace(/[:.]/g, '-')}.json`;
}
export function checkpointFateLibrary(
  library: FateLibrary,
  title: string,
): FateLibrary {
  const clean = parseFateLibrary(library);
  const backup = createFateBackup(clean.current, title);
  return {
    ...clean,
    checkpoints: [backup, ...clean.checkpoints].slice(0, MAX_CHECKPOINTS),
  };
}
export function restoreFateLibrary(
  library: FateLibrary,
  backup: FateBackup,
): FateLibrary {
  const clean = parseFateBackup(backup);
  const protectedLibrary = checkpointFateLibrary(library, '恢复前的进度');
  return { ...protectedLibrary, current: clean.save };
}
/** One storage write commits both the protected old world and the restored current world. */
export function writeFateLibrary(
  storage: FateStorage,
  library: FateLibrary,
): FateLibrary {
  const clean = parseFateLibrary(library);
  storage.setItem(FATE_LIBRARY_KEY, JSON.stringify(clean));
  return clean;
}
export function summarizeFateSave(save: FateSave) {
  const editedPeople = new Set([
    ...Object.keys(save.characterNotes),
    ...Object.keys(save.relationshipNotes),
  ]);
  return {
    minutes: save.life?.minutes ?? null,
    conversations: save.history.length,
    events: save.life?.events.length ?? 0,
    people: editedPeople.size,
    hasWorldNote: Boolean(save.worldNote.trim()),
  };
}
