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
  emptyFateSave,
  FATE_STORAGE_KEY,
  parseFateSave,
  updateFateSettings,
  type FateSave,
  type Exchange,
} from '@/lib/fate-state';
import type { FateSettings } from '@/lib/fate-world';
import type { DailyLife } from '@/lib/fate-life';
type FateContextValue = {
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
  saveLife: (life: DailyLife) => void;
};
const FateContext = createContext<FateContextValue | null>(null);
export function FateProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<FateSave>(emptyFateSave);
  const [loaded, setLoaded] = useState(false);
  const [persist, setPersist] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');
  const [apiKey, setKey] = useState(''),
    [model, setModel] = useState(''),
    [models, setModels] = useState<string[]>([]),
    [verified, setVerified] = useState(false);
  const [requests, setRequests] = useState(0),
    [tokens, setTokens] = useState(0);
  const requestCount = useRef(0);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const raw = localStorage.getItem(FATE_STORAGE_KEY);
        if (raw) setSave(parseFateSave(JSON.parse(raw)));
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
    if (!loaded || !persist) return;
    try {
      localStorage.setItem(FATE_STORAGE_KEY, JSON.stringify(save));
    } catch {
      queueMicrotask(() => {
        setPersist(false);
        setStorageNotice('浏览器无法保存记录，本次设定与对话暂存在当前页面。');
      });
    }
  }, [loaded, persist, save]);
  function setApiKey(key: string) {
    setKey(key);
    setVerified(false);
    setModels([]);
    setModel('');
  }
  function append(entry: Exchange) {
    setSave((previous) => ({
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
        loaded,
        storageNotice,
        apiKey,
        setApiKey,
        model,
        setModel,
        models,
        setModels,
        verified,
        setVerified,
        requests,
        tokens,
        reserveRequest: () => {
          if (requestCount.current >= 20) return false;
          setRequests(++requestCount.current);
          return true;
        },
        trackTokens: (n) => setTokens((total) => total + n),
        append,
        saveLife: (life) => setSave((previous) => ({ ...previous, life })),
        updateSettings: (settings) => {
          if (loaded)
            setSave((previous) => updateFateSettings(previous, settings));
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
