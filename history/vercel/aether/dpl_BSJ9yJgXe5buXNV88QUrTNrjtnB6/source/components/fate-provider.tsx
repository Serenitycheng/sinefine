'use client';
import {
  createContext,
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
  readFateLibrary,
  restoreFateLibrary,
  writeFateLibrary,
  type FateBackup,
  type FateLibrary,
} from '@/lib/fate-backup';
type FateContextValue = {
  rememberKey: boolean;
  setRememberKey: (value: boolean) => void;
  checkingConnection: boolean;
  connectionNotice: string;
  clearConnection: () => void;
  save: FateSave;
  loaded: boolean;
  storageNotice: string;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
  models: string[];
  setModels: (models: string[]) => void;
  verified: boolean;
  setVerified: (value: boolean) => void;
  requests: number;
  tokens: number;
  reserveRequest: () => boolean;
  trackTokens: (n: number) => void;
  append: (entry: Exchange) => void;
  updateSettings: (settings: FateSettings) => void;
  saveLife: (life: DailyLife, revision: number) => void;
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
  const save = library.current;
  const [saveRevision, setSaveRevision] = useState(0);
  const revisionRef = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [persist, setPersist] = useState(false);
  const persistence = useRef(false);
  const [storageNotice, setStorageNotice] = useState('');
  const connection = useDeepSeekConnection();
  const [requests, setRequests] = useState(0),
    [tokens, setTokens] = useState(0);
  const requestCount = useRef(0);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const restored = readFateLibrary(localStorage);
        libraryRef.current = restored;
        setLibrary(restored);
        persistence.current = true;
        setPersist(true);
      } catch {
        setStorageNotice(
          '未能读取本地记录，本次设定与对话仅保存在当前页面。原记录未被覆盖。',
        );
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || !persist || library !== libraryRef.current) return;
    try {
      writeFateLibrary(localStorage, library);
    } catch {
      persistence.current = false;
      queueMicrotask(() => {
        setPersist(false);
        setStorageNotice('浏览器无法保存记录，本次设定与对话暂存在当前页面。');
      });
    }
  }, [loaded, persist, library]);
  function updateCurrent(
    transform: (current: FateSave) => FateSave,
    revision = saveRevision,
  ) {
    if (!loaded || revision !== revisionRef.current) return;
    const next = {
      ...libraryRef.current,
      current: transform(libraryRef.current.current),
    };
    libraryRef.current = next;
    setLibrary(next);
  }
  function commitLibrary(next: FateLibrary, restoring = false) {
    if (!loaded) throw new Error('正在读取原有进度，请稍候。');
    const clean = parseFateLibrary(next);
    if (persistence.current) {
      try {
        writeFateLibrary(localStorage, clean);
      } catch {
        throw new Error(
          '浏览器未能保存这次操作，原进度保持不变。请先下载备份，或检查浏览器的可用空间。',
        );
      }
    }
    if (restoring) {
      revisionRef.current++;
      setSaveRevision(revisionRef.current);
    }
    libraryRef.current = clean;
    setLibrary(clean);
  }
  function append(entry: Exchange) {
    updateCurrent((previous) => ({
      ...previous,
      history: [
        ...previous.history.filter((e) => e.id !== entry.id),
        entry,
      ].slice(-120),
    }));
  }
  return (
    <FateContext.Provider
      value={{
        save,
        saveRevision,
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
          if (life === current.life) return;
          commitLibrary(
            { ...libraryRef.current, current: { ...current, life } },
            true,
          );
        },
        checkpoints: library.checkpoints,
        persistent: persist,
        exportBackup: (title) =>
          createFateBackup(libraryRef.current.current, title),
        checkpoint: (title) =>
          commitLibrary(checkpointFateLibrary(libraryRef.current, title)),
        restoreBackup: (backup) =>
          commitLibrary(restoreFateLibrary(libraryRef.current, backup), true),
        loaded,
        storageNotice,
        ...connection,
        requests,
        tokens,
        reserveRequest: () => {
          if (requestCount.current >= 20) return false;
          setRequests(++requestCount.current);
          return true;
        },
        trackTokens: (n) => setTokens((total) => total + n),
        append,
        saveLife: (life, revision) =>
          updateCurrent((previous) => ({ ...previous, life }), revision),
        updateSettings: (settings) => {
          if (loaded)
            updateCurrent((previous) => updateFateSettings(previous, settings));
        },
      }}
    >
      {children}
    </FateContext.Provider>
  );
}
export function useFate() {
  const context = useContext(FateContext);
  if (!context) throw new Error('Missing FateProvider');
  return context;
}
