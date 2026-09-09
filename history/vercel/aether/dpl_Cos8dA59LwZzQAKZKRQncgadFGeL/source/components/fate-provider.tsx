'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  emptyFateSave,
  FATE_STORAGE_KEY,
  parseFateSave,
  type FateSave,
  type Exchange,
} from '@/lib/fate-state';
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
  trackRequest: () => void;
  trackTokens: (n: number) => void;
  append: (entry: Exchange) => void;
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
          '未能读取本地记录，本次对话仅保存在当前页面。原记录未被覆盖。',
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
        setStorageNotice('浏览器无法保存记录，本次对话暂存在当前页面。');
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
      history: [...previous.history, entry].slice(-120),
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
        trackRequest: () => setRequests((n) => n + 1),
        trackTokens: (n) => setTokens((total) => total + n),
        append,
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
