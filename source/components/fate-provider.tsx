'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import {
  updateFateSettings,
  type FateSave,
  type Exchange,
} from '@/lib/fate-state';
import type { FateSettings } from '@/lib/fate-world';
import {
  changeWaverStage,
  changeHousing,
  createDailyLife,
  type DailyLife,
} from '@/lib/fate-life';
import type { WaverStage } from '@/lib/fate-cast';
import type { FateHousing } from '@/lib/fate-housing';
import { useDeepSeekConnection } from './use-deepseek-connection';
import {
  checkpointFateLibrary,
  createFateBackup,
  emptyFateLibrary,
  parseFateLibrary,
  restoreFateLibrary,
  MAX_CHECKPOINTS,
  type FateBackup,
  type FateLibrary,
} from '@/lib/fate-backup';
import {
  FateStorageConflict,
  isFateStorageKey,
  matchesFateStorageStamp,
  readFateLocalSnapshot,
  readFateStorageStamp,
  parseFateLocalSnapshot,
  recoverFateLocalSnapshot,
  FATE_ORIGINAL_RECOVERY_KEY,
  writeFateLocalSnapshot,
  type FateStorageStamp,
} from '@/lib/fate-local-session';
import { FateStorageNotice } from './fate-storage-notice';
import type { EmiyaGameSave } from '@/lib/fate-emiya-game';

type StorageStatus =
  | 'loading'
  | 'ready'
  | 'temporary'
  | 'conflict'
  | 'unreadable';
type FateContextValue = ReturnType<typeof useDeepSeekConnection> & {
  save: FateSave;
  loaded: boolean;
  storageNotice: string;
  storageStatus: StorageStatus;
  storageBlocked: boolean;
  reloadLocal: () => void;
  retryPersistence: () => void;
  hasOriginalRecovery: boolean;
  requests: number;
  tokens: number;
  reserveRequest: () => boolean;
  trackTokens: (n: number) => void;
  append: (entry: Exchange, life?: DailyLife, revision?: number) => boolean;
  updateSettings: (settings: FateSettings) => void;
  saveLife: (life: DailyLife, revision: number, final?: boolean) => void;
  saveEmiya: (
    life: DailyLife,
    emiya: EmiyaGameSave,
    revision: number,
    final?: boolean,
  ) => void;
  saveRevision: number;
  setWaverStage: (stage: WaverStage) => void;
  setHousing: (housing: FateHousing) => void;
  checkpoints: FateBackup[];
  persistent: boolean;
  exportBackup: (title?: string) => FateBackup;
  checkpoint: (title: string) => void;
  restoreBackup: (backup: FateBackup) => void;
};
const FateContext = createContext<FateContextValue | null>(null);

export function FateProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<FateLibrary>(emptyFateLibrary);
  const libraryRef = useRef(library);
  const [saveRevision, setSaveRevision] = useState(0);
  const revisionRef = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);
  const hasProgress = useRef(false);
  const mounted = useRef(false);
  const stamp = useRef<FateStorageStamp | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('loading');
  const statusRef = useRef<StorageStatus>('loading');
  const [storageNotice, setStorageNotice] = useState('');
  const [hasOriginalRecovery, setHasOriginalRecovery] = useState(false);
  const connection = useDeepSeekConnection();
  const [requests, setRequests] = useState(0),
    [tokens, setTokens] = useState(0);
  const requestCount = useRef(0);

  const invalidate = useCallback(() => {
    revisionRef.current++;
    if (mounted.current) setSaveRevision(revisionRef.current);
  }, []);
  const reportFailure = useCallback(
    (error: unknown) => {
      const conflict =
        error instanceof FateStorageConflict ||
        statusRef.current === 'conflict';
      const nextStatus = conflict
        ? 'conflict'
        : hasProgress.current
          ? 'temporary'
          : 'unreadable';
      if (statusRef.current !== nextStatus) invalidate();
      statusRef.current = nextStatus;
      if (mounted.current) {
        setStorageStatus(nextStatus);
        setStorageNotice(
          conflict
            ? '另一页面已更新或清空 Fate 进度。本页已暂停写入，请先保留本页进度，再读取最新记录。'
            : hasProgress.current
              ? '浏览器未能保存进度，自动日常已暂停。本页记录仍在，请下载留存，或重试保存。'
              : '未能读取原始记录，写入仍暂停。可先下载原文，或到存档页从有效备份恢复。',
        );
      }
    },
    [invalidate],
  );

  useEffect(() => {
    mounted.current = true;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        stamp.current = readFateStorageStamp(localStorage);
        const restored = parseFateLocalSnapshot(stamp.current);
        hasProgress.current = true;
        libraryRef.current = restored.library;
        setLibrary(restored.library);
        statusRef.current = 'ready';
        setStorageStatus('ready');
      } catch {
        statusRef.current = 'unreadable';
        setStorageStatus('unreadable');
        setStorageNotice(
          '未能读取本地 Fate 记录，原始内容未被覆盖。可下载原文保留，或到存档页预览一份有效备份后恢复。',
        );
      }
      try {
        setHasOriginalRecovery(
          localStorage.getItem(FATE_ORIGINAL_RECOVERY_KEY) !== null,
        );
      } catch {
        /* Main read already reports storage access failures. */
      }
      hydrated.current = true;
      setLoaded(true);
    });
    function changed(event: StorageEvent) {
      if (!isFateStorageKey(event.key) || !hydrated.current) return;
      try {
        if (event.storageArea !== localStorage) return;
        if (
          stamp.current &&
          matchesFateStorageStamp(localStorage, stamp.current)
        )
          return;
        reportFailure(new FateStorageConflict());
      } catch (error) {
        reportFailure(error);
      }
    }
    window.addEventListener('storage', changed);
    return () => {
      alive = false;
      mounted.current = false;
      window.removeEventListener('storage', changed);
    };
  }, [reportFailure]);

  function accept(next: FateLibrary) {
    hasProgress.current = true;
    libraryRef.current = next;
    if (mounted.current) setLibrary(next);
  }
  function canMutate() {
    return (
      hydrated.current &&
      hasProgress.current &&
      (statusRef.current === 'ready' || statusRef.current === 'temporary')
    );
  }
  function persist(next: FateLibrary) {
    if (!stamp.current) throw new Error('尚未读取原有记录。');
    const written = writeFateLocalSnapshot(localStorage, next, stamp.current);
    stamp.current = written.stamp;
    return written.library;
  }
  function updateCurrent(
    transform: (current: FateSave) => FateSave,
    revision = saveRevision,
    final = false,
  ) {
    if (
      (!mounted.current && !final) ||
      !canMutate() ||
      revision !== revisionRef.current
    )
      return false;
    const next = {
      ...libraryRef.current,
      current: transform(libraryRef.current.current),
    };
    if (statusRef.current === 'temporary') {
      accept(next);
      return true;
    }
    try {
      accept(persist(next));
    } catch (error) {
      // Keep unsaved life/dialogue available for export, but never adopt another page's version.
      if (!(error instanceof FateStorageConflict)) accept(next);
      reportFailure(error);
      return !(error instanceof FateStorageConflict);
    }
    return true;
  }
  function commitLibrary(next: FateLibrary, restoring = false) {
    if (!mounted.current || !hydrated.current)
      throw new Error('正在读取原有进度，请稍候。');
    if (!canMutate())
      throw new Error('本页写入已暂停，请先处理上方的存档提示。');
    let clean = parseFateLibrary(next);
    if (statusRef.current === 'ready') {
      try {
        clean = persist(clean);
      } catch (error) {
        reportFailure(error);
        throw new Error(
          error instanceof FateStorageConflict
            ? '另一页面已更新进度，本次操作未应用。请读取最新记录后重试。'
            : '浏览器未能保存这次操作，原进度保持不变。请先下载备份，再检查可用空间。',
        );
      }
    }
    if (restoring) invalidate();
    accept(clean);
  }
  function reloadLocal() {
    try {
      const latest = readFateLocalSnapshot(localStorage);
      let next = latest.library;
      if (
        hasProgress.current &&
        JSON.stringify(libraryRef.current.current) !==
          JSON.stringify(next.current)
      ) {
        const backup = createFateBackup(
          libraryRef.current.current,
          '读取最新前的本页进度',
        );
        next = {
          ...next,
          checkpoints: [backup, ...next.checkpoints].slice(0, MAX_CHECKPOINTS),
        };
        const written = writeFateLocalSnapshot(
          localStorage,
          next,
          latest.stamp,
        );
        next = written.library;
        stamp.current = written.stamp;
      } else stamp.current = latest.stamp;
      invalidate();
      accept(next);
      statusRef.current = 'ready';
      setStorageStatus('ready');
      setStorageNotice(
        '已读取最新进度，日常保持暂停。本页有差异的旧进度已保留为「读取最新前的本页进度」。',
      );
    } catch (error) {
      if (error instanceof FateStorageConflict) reportFailure(error);
      throw new Error(
        '未能安全读取并保留进度，当前页面与原始记录保持不变。请先下载本页或原始记录。',
      );
    }
  }
  function retryPersistence() {
    if (statusRef.current !== 'temporary') return;
    try {
      const clean = persist(libraryRef.current);
      invalidate();
      accept(clean);
      statusRef.current = 'ready';
      setStorageStatus('ready');
      setStorageNotice('本页进度已保存，日常保持暂停。');
    } catch (error) {
      reportFailure(error);
      throw new Error('重试保存未完成，当前记录仍保留在本页。');
    }
  }
  function restoreBackup(backup: FateBackup) {
    if (statusRef.current !== 'unreadable') {
      commitLibrary(restoreFateLibrary(libraryRef.current, backup), true);
      return;
    }
    if (!stamp.current)
      throw new Error('无法访问原始记录，请恢复浏览器存储访问后重试读取。');
    const next = parseFateLibrary({
      ...emptyFateLibrary(),
      current: backup.save,
    });
    try {
      const recovered = recoverFateLocalSnapshot(
        localStorage,
        next,
        stamp.current,
      );
      stamp.current = recovered.stamp;
      invalidate();
      accept(recovered.library);
      statusRef.current = 'ready';
      setStorageStatus('ready');
      setHasOriginalRecovery(true);
      setStorageNotice(
        '有效备份已恢复。无法读取的旧记录已保留为原文，可在存档页下载；原文不保证可以恢复。',
      );
    } catch (error) {
      if (error instanceof FateStorageConflict) reportFailure(error);
      throw new Error(
        '未能安全保留原文并恢复，原始记录保持不变。请先下载原文，再检查浏览器存储空间。',
      );
    }
  }

  return (
    <FateContext.Provider
      value={{
        save: library.current,
        saveRevision,
        loaded,
        storageNotice,
        storageStatus,
        storageBlocked:
          storageStatus === 'conflict' || storageStatus === 'unreadable',
        persistent: storageStatus === 'ready',
        reloadLocal,
        retryPersistence,
        hasOriginalRecovery,
        setHousing: (housing) => {
          const current = libraryRef.current.current;
          const life = changeHousing(
            current.life ?? createDailyLife(),
            housing,
          );
          commitLibrary(
            { ...libraryRef.current, current: { ...current, life } },
            true,
          );
        },
        setWaverStage: (stage) => {
          const current = libraryRef.current.current;
          const life = changeWaverStage(
            current.life ?? createDailyLife(),
            stage,
          );
          if (life !== current.life)
            commitLibrary(
              { ...libraryRef.current, current: { ...current, life } },
              true,
            );
        },
        checkpoints: library.checkpoints,
        exportBackup: (title) => {
          if (!hasProgress.current)
            throw new Error(
              '尚未读到有效的本页进度，请先下载原始记录或恢复有效备份。',
            );
          return createFateBackup(libraryRef.current.current, title);
        },
        checkpoint: (title) =>
          commitLibrary(checkpointFateLibrary(libraryRef.current, title)),
        restoreBackup,
        ...connection,
        requests,
        tokens,
        reserveRequest: () => {
          if (!mounted.current || !canMutate() || requestCount.current >= 20)
            return false;
          setRequests(++requestCount.current);
          return true;
        },
        trackTokens: (n) => {
          if (mounted.current) setTokens((total) => total + n);
        },
        append: (entry, life, revision) =>
          updateCurrent(
            (previous) => ({
              ...previous,
              ...(life ? { life } : {}),
              history: [
                ...previous.history.filter((e) => e.id !== entry.id),
                entry,
              ].slice(-120),
            }),
            revision,
          ),
        saveLife: (life, revision, final) =>
          updateCurrent((previous) => ({ ...previous, life }), revision, final),
        saveEmiya: (life, emiya, revision, final) =>
          updateCurrent(
            (previous) => ({ ...previous, version: 2, life, emiya }),
            revision,
            final,
          ),
        updateSettings: (settings) => {
          try {
            commitLibrary(
              {
                ...libraryRef.current,
                current: updateFateSettings(
                  libraryRef.current.current,
                  settings,
                ),
              },
              true,
            );
            if (statusRef.current === 'ready') setStorageNotice('');
          } catch (error) {
            setStorageNotice(
              error instanceof Error
                ? error.message
                : '这次修改未能保存，原进度仍然保留。',
            );
          }
        },
      }}
    >
      <FateStorageNotice />
      {children}
    </FateContext.Provider>
  );
}
export function useFate() {
  const context = useContext(FateContext);
  if (!context) throw new Error('Missing FateProvider');
  return context;
}
