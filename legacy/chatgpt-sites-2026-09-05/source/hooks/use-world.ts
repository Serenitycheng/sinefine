'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  newWorld,
  type World,
  type Resident,
  event,
  dateText,
  clockText,
  PLACES,
} from '@/lib/world';
import {
  advance,
  applyDecisions,
  perception,
  type AiDecision,
} from '@/lib/simulation';
import { saveWorld, loadWorld } from '@/lib/storage';
export type AiSettings = {
  key: string;
  model: string;
  enabled: boolean;
  models: string[];
  limit: number;
  calls: number;
  tokens: number;
  connected: boolean;
};
export type Recap = {
  from: number;
  to: number;
  births: number;
  deaths: number;
  important: string[];
  stopped: boolean;
};
export function useWorld() {
  const [world, setWorld] = useState(() => newWorld()),
    worldRef = useRef(world),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(''),
    [saving, setSaving] = useState('本机存档'),
    [autoPause, setAutoPause] = useState(true),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState<number | null>(null),
    [recap, setRecap] = useState<Recap | null>(null);
  const [ai, setAi] = useState<AiSettings>({
    key: '',
    model: '',
    enabled: false,
    models: [],
    limit: 30,
    calls: 0,
    tokens: 0,
    connected: false,
  });
  const aiRef = useRef(ai),
    busyRef = useRef(false),
    cancelRef = useRef(false),
    abortRef = useRef<AbortController | null>(null),
    epoch = useRef(0),
    cursor = useRef(0),
    autosave = useRef(true);
  useEffect(() => {
    aiRef.current = ai;
  }, [ai]);
  const notify = useCallback((message: string) => setNotice(message), []);
  const commit = useCallback((next: World | ((w: World) => void)) => {
    const result =
      typeof next === 'function' ? structuredClone(worldRef.current) : next;
    if (typeof next === 'function') next(result);
    worldRef.current = result;
    setWorld(result);
    return result;
  }, []);
  const resetWorld = useCallback(
    (next: World) => {
      epoch.current++;
      abortRef.current?.abort();
      cancelRef.current = true;
      setPlaying(false);
      commit(next);
      autosave.current = true;
    },
    [commit],
  );
  useEffect(() => {
    try {
      const saved = loadWorld();
      if (saved) commit(saved);
    } catch (e) {
      autosave.current = false;
      setNotice(e instanceof Error ? e.message : '存档读取失败。');
    }
    setReady(true);
  }, [commit]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  const save = useCallback(() => {
    try {
      saveWorld(worldRef.current);
      autosave.current = true;
      setSaving(
        `已保存 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
      );
      return true;
    } catch (e) {
      setSaving('保存未成功');
      notify(e instanceof Error ? e.message : '保存未成功');
      return false;
    }
  }, [notify]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      if (autosave.current) save();
    }, 20000);
    const leave = () => {
      if (autosave.current) save();
    };
    window.addEventListener('beforeunload', leave);
    return () => {
      clearInterval(t);
      window.removeEventListener('beforeunload', leave);
    };
  }, [ready, save]);
  const importantSince = useCallback(
    (w: World, time: number) =>
      w.events.filter(
        (e) =>
          e.time > time &&
          e.important &&
          (e.kind === '特殊事件' ||
            (e.kind === '人生' &&
              e.people.some(
                (id) => w.residents.find((p) => p.id === id)?.focus,
              ))),
      ),
    [],
  );
  useEffect(() => {
    if (!playing || !ready || progress !== null) return;
    const t = setInterval(() => {
      const before = worldRef.current.minutes;
      const next = commit((w) => advance(w, 10 * speed));
      if (autoPause && importantSince(next, before).length) {
        setPlaying(false);
        notify('关注的居民发生重要变化，世界已自动暂停。');
      }
    }, 800);
    return () => clearInterval(t);
  }, [
    playing,
    speed,
    ready,
    progress,
    commit,
    autoPause,
    importantSince,
    notify,
  ]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.code !== 'Space' ||
        (e.target as HTMLElement).closest(
          'input,textarea,button,[role="dialog"],[role="combobox"]',
        ) ||
        document.querySelector('[role="dialog"]')
      )
        return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const fastForward = useCallback(
    async (days: number) => {
      if (
        !Number.isInteger(days) ||
        days < 1 ||
        days > 3600 ||
        progress !== null
      )
        return;
      setPlaying(false);
      cancelRef.current = false;
      abortRef.current?.abort();
      epoch.current++;
      const start = structuredClone(worldRef.current),
        next = structuredClone(start);
      setProgress(0);
      let stopped = false;
      for (let day = 0; day < days; day++) {
        if (cancelRef.current) {
          stopped = true;
          break;
        }
        const from = next.minutes;
        advance(next, 1440);
        if (autoPause && importantSince(next, from).length) {
          stopped = true;
          setProgress((day + 1) / days);
          break;
        }
        if (day % 5 === 0) {
          setProgress((day + 1) / days);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      commit(next);
      setProgress(null);
      save();
      setRecap({
        from: start.minutes,
        to: next.minutes,
        births: next.stats.births - start.stats.births,
        deaths: next.stats.deaths - start.stats.deaths,
        important: next.events
          .filter((e) => e.time > start.minutes && e.important)
          .slice(0, 50)
          .map((e) => e.id),
        stopped,
      });
    },
    [autoPause, commit, importantSince, progress, save],
  );
  const aiRequest = useCallback(
    async (mode: string, payload: Record<string, unknown>) => {
      const current = aiRef.current;
      if (busyRef.current) throw Error('上一条 AI 请求还在处理中。');
      if (!current.key) throw Error('请在设置里填写 DeepSeek 密钥。');
      if (mode !== 'test' && (!current.connected || !current.model))
        throw Error('请先验证连接并选择模型。');
      if (mode !== 'test' && current.calls >= current.limit)
        throw Error('已达到本次 AI 调用上限，可在设置中调整。');
      busyRef.current = true;
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 65000);
      if (mode !== 'test') {
        aiRef.current = { ...current, calls: current.calls + 1 };
        setAi(aiRef.current);
      }
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: current.key,
            model: current.model,
            mode,
            ...payload,
          }),
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          error?: string;
          models?: string[];
          result: any;
          usage?: { total_tokens?: number };
        };
        if (!response.ok || data.error)
          throw Error(data.error || 'AI 请求失败。');
        const usage = data.usage;
        if (usage) {
          setAi((a) => ({
            ...a,
            tokens: a.tokens + (Number(usage.total_tokens) || 0),
          }));
        }
        return data;
      } finally {
        clearTimeout(timeout);
        busyRef.current = false;
        setBusy(false);
      }
    },
    [],
  );
  const runAi = useCallback(
    async (person?: Resident) => {
      const w = worldRef.current,
        token = epoch.current,
        from = w.minutes;
      const pool = w.residents.filter((p) => p.alive && p.focus);
      if (!pool.length) return;
      if (cursor.current >= pool.length) cursor.current = 0;
      const actors = person
        ? [person]
        : Array.from(
            { length: Math.min(4, pool.length) },
            (_, i) => pool[(cursor.current + i) % pool.length],
          );
      cursor.current += actors.length;
      try {
        const data = await aiRequest('decisions', {
          people: actors.map((p) => perception(w, p)),
          places: PLACES,
          rules: w.rules,
          time: `${dateText(w.minutes)} ${clockText(w.minutes)}`,
        });
        if (token !== epoch.current || worldRef.current.minutes - from > 180) {
          notify('世界已变化，本次较早的 AI 决策未应用。');
          return;
        }
        const allowed = new Set(actors.map((p) => p.id));
        let applied = 0;
        commit((next) => {
          applied = applyDecisions(
            next,
            (data.result.decisions as AiDecision[]).filter((d) =>
              allowed.has(d.id),
            ),
          );
        });
        if (!applied) notify('AI 没有给出当前可执行的行动，居民继续本地生活。');
        else if (person) notify(`${person.name}已作出新的决定。`);
      } catch (e) {
        setAi((a) => ({ ...a, enabled: false }));
        notify(
          e instanceof Error && e.name === 'AbortError'
            ? 'AI 请求已取消。'
            : e instanceof Error
              ? e.message
              : 'AI 调用失败。',
        );
      }
    },
    [aiRequest, commit, notify],
  );
  useEffect(() => {
    if (
      !playing ||
      !ai.enabled ||
      !ai.connected ||
      speed > 4 ||
      progress !== null
    )
      return;
    const t = setInterval(() => {
      if (!busyRef.current) void runAi();
    }, 20000);
    return () => clearInterval(t);
  }, [playing, ai.enabled, ai.connected, speed, progress, runAi]);
  useEffect(
    () => () => {
      cancelRef.current = true;
      abortRef.current?.abort();
    },
    [],
  );
  const follow = useCallback(
    (id: string, focus: boolean) =>
      commit((w) => {
        const p = w.residents.find((p) => p.id === id);
        if (p) {
          p.focus = focus;
          event(
            w,
            '世界',
            `${p.name}${focus ? '成为重点观察对象，已有经历继续保留。' : '转为背景居民，继续在街区生活。'}`,
            [id],
            false,
            'user',
          );
        }
      }),
    [commit],
  );
  return {
    world,
    worldRef,
    commit,
    resetWorld,
    playing,
    setPlaying,
    speed,
    setSpeed,
    ready,
    notice,
    notify,
    saving,
    save,
    autoPause,
    setAutoPause,
    progress,
    fastForward,
    cancelFast: () => {
      cancelRef.current = true;
    },
    recap,
    setRecap,
    ai,
    setAi,
    busy,
    aiRequest,
    runAi,
    follow,
  };
}
