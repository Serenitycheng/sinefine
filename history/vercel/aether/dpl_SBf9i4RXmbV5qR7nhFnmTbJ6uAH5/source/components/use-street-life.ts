'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useFate } from './fate-provider';
import {
  advanceDailyLife,
  applyLifePlan,
  canAutoReply,
  createDailyLife,
  lifeIndoors,
  lifeScene,
  parseLifePlan,
  snapshotLife,
  type LifeEvent,
} from '@/lib/fate-life';
import { isPartner } from '@/lib/fate-cast';
import { conversationHistory } from '@/lib/fate-state';
import type { Actor, ActorId } from '@/lib/street';

export function useStreetLife(
  actors: RefObject<Actor[]>,
  options: {
    active: ActorId;
    mode: 'control' | 'observe';
    overlay: boolean;
    ready: boolean;
  },
) {
  const fate = useFate();
  const ctx = useRef(fate),
    opts = useRef(options);
  const life = useRef(createDailyLife());
  const initialized = useRef(false);
  const [view, setView] = useState(createDailyLife);
  const [running, setRunning] = useState(false),
    [speed, setSpeed] = useState<1 | 4>(1);
  const [auto, setAuto] = useState(false),
    [limit, setLimit] = useState(3),
    [used, setUsed] = useState(0);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const config = useRef({
    running: false,
    speed: 1 as 1 | 4,
    auto: false,
    limit: 3,
    used: 0,
    lastCall: -Infinity,
  });
  const request = useRef<AbortController | null>(null);
  const sincePublish = useRef(0);
  useEffect(() => {
    ctx.current = fate;
    opts.current = options;
  });
  const publish = useCallback(() => {
    if (!initialized.current) return;
    const next = snapshotLife(life.current, actors.current);
    setView(next);
    ctx.current.saveLife(next);
    sincePublish.current = 0;
  }, [actors]);
  const cancel = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
  }, []);
  useEffect(() => {
    if (!fate.loaded || initialized.current) return;
    initialized.current = true;
    const saved = fate.save.life;
    queueMicrotask(() => {
      life.current = saved ? structuredClone(saved) : createDailyLife();
      for (const actor of actors.current)
        Object.assign(actor, life.current.positions[actor.id], {
          path: [],
          frame: 0,
        });
      publish();
    });
  }, [fate.loaded, fate.save.life, actors, publish]);
  useEffect(() => {
    queueMicrotask(cancel);
  }, [
    options.active,
    options.mode,
    options.overlay,
    fate.apiKey,
    fate.model,
    cancel,
  ]);
  const saveLatest = useCallback(() => {
    if (initialized.current)
      ctx.current.saveLife(snapshotLife(life.current, actors.current));
  }, [actors]);
  useEffect(() => {
    const stop = () => {
      config.current.running = false;
      setRunning(false);
      cancel();
      publish();
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('blur', stop);
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      request.current?.abort();
      saveLatest();
      window.removeEventListener('blur', stop);
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [cancel, publish, saveLatest]);
  const remember = useCallback((event: LifeEvent) => {
    if (!event.dialogue) return;
    ctx.current.append({
      id: `life-${event.id}`,
      ...event.dialogue,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const generate = useCallback(
    async (event: LifeEvent) => {
      const current = ctx.current,
        cfg = config.current,
        opt = opts.current;
      if (
        !canAutoReply({
          enabled: cfg.auto,
          running: cfg.running && !opt.overlay,
          visible: !document.hidden && document.hasFocus(),
          verified: current.verified,
          busy: Boolean(request.current),
          used: cfg.used,
          limit: cfg.limit,
          total: current.requests,
          sinceLast: Date.now() - cfg.lastCall,
        }) ||
        !current.reserveRequest()
      )
        return;
      const target = event.dialogue?.target ?? event.decision!.person;
      const speaker = event.dialogue?.speaker ?? 'admin';
      const controller = new AbortController();
      request.current = controller;
      cfg.lastCall = Date.now();
      cfg.used++;
      setUsed(cfg.used);
      setBusy(true);
      setNotice('');
      try {
        const response = await fetch('/api/fate/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: event.decision ? 'decision' : 'chat',
            key: current.apiKey.trim(),
            model: current.model,
            target,
            speaker,
            message:
              event.dialogue?.message ??
              '请根据我的性格、习惯、经历和现在的状态选择下一项日常行动。',
            history: event.decision
              ? []
              : conversationHistory(current.save, target, speaker)
                  .filter((e) => e.id !== `life-${event.id}`)
                  .map((e) => ({ message: e.message, reply: e.reply })),
            worldNote: current.save.worldNote,
            characterNotes: current.save.characterNotes,
            relationshipNotes: current.save.relationshipNotes,
            scene: lifeScene(
              snapshotLife(life.current, actors.current),
              target,
            ),
            ...(event.decision
              ? {
                  needs: life.current.people[target],
                  recent: life.current.events
                    .slice(-8)
                    .map((e) =>
                      `${e.text}${e.decision?.reason || ''}`.slice(0, 300),
                    ),
                }
              : {}),
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          reply?: string;
          plan?: unknown;
          tokens?: number;
        };
        if (controller.signal.aborted) return;
        if (!response.ok)
          throw new Error(data.error || '自主 AI 暂时没有回应。');
        if (event.decision) {
          if (
            !applyLifePlan(
              life.current,
              actors.current,
              event.id,
              parseLifePlan(data.plan),
            )
          )
            setNotice('AI 建议与当前身体状态不符，继续原计划。');
        } else {
          const original = life.current.events.find((e) => e.id === event.id);
          if (
            !original?.dialogue ||
            typeof data.reply !== 'string' ||
            !data.reply.trim() ||
            data.reply.length > 2400
          )
            throw new Error('没有收到完整的相遇回复。');
          original.dialogue = {
            ...original.dialogue,
            reply: data.reply,
            source: 'deepseek',
          };
          remember(original);
        }
        if (typeof data.tokens === 'number') current.trackTokens(data.tokens);
        publish();
      } catch (error) {
        if (!controller.signal.aborted) {
          config.current.auto = false;
          setAuto(false);
          setNotice(
            `${error instanceof Error ? error.message : '自主 AI 暂时不可用。'} 已关闭自主 AI，生活按性格与习惯继续。`,
          );
        }
      } finally {
        if (request.current === controller) {
          request.current = null;
          setBusy(false);
        }
      }
    },
    [actors, publish, remember],
  );

  const advance = useCallback(
    (dt: number) => {
      if (!initialized.current) return;
      const opt = opts.current,
        cfg = config.current;
      const before = life.current.nextId;
      const encounter = advanceDailyLife(life.current, actors.current, dt, {
        running:
          cfg.running &&
          opt.ready &&
          !opt.overlay &&
          !request.current &&
          !document.hidden &&
          document.hasFocus(),
        speed: cfg.speed,
        controlled: opt.mode === 'control' ? opt.active : null,
      });
      if (encounter) remember(encounter);
      const planned = life.current.events.find(
        (e) => e.id >= before && e.decision,
      );
      if (encounter || planned) void generate((encounter || planned)!);
      sincePublish.current += dt;
      if (life.current.nextId !== before || sincePublish.current >= 1)
        publish();
    },
    [actors, generate, publish, remember],
  );

  function toggleRunning() {
    const next = !config.current.running;
    config.current.running = next;
    setRunning(next);
    if (!next) cancel();
    publish();
  }
  function changeSpeed(value: 1 | 4) {
    config.current.speed = value;
    setSpeed(value);
  }
  function changeAuto(value: boolean) {
    config.current.auto = value;
    setAuto(value);
    setNotice('');
    if (!value) cancel();
  }
  function changeLimit(value: number) {
    config.current.limit = value;
    setLimit(value);
  }
  const isInside = useCallback(
    (id: ActorId) => isPartner(id) && lifeIndoors(life.current.people[id]),
    [],
  );
  function resetPlans() {
    cancel();
    life.current.people.saber.activity = null;
    life.current.people.rin.activity = null;
    life.current.holdUntil = 0;
    publish();
  }
  return {
    view,
    running,
    speed,
    auto,
    used,
    limit,
    busy,
    notice,
    advance,
    toggleRunning,
    changeSpeed,
    changeAuto,
    changeLimit,
    cancel,
    isInside,
    resetPlans,
  };
}
export type StreetLife = ReturnType<typeof useStreetLife>;
