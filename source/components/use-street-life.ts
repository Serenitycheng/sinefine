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
  LIFE_IDS,
  parseLifePlan,
  snapshotLife,
  recentLifeEvents,
  type LifeEvent,
} from '@/lib/fate-life';
import { isPartner, type PartnerId } from '@/lib/fate-cast';
import { pairConversationHistory } from '@/lib/fate-state';
import { commitSocialDialogue } from '@/lib/fate-social';
import {
  visitPublicPlace,
  type PublicPlaceId,
  type PublicVisitAction,
} from '@/lib/fate-public-places';
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
  const engineRevision = useRef(fate.saveRevision);
  const initialized = useRef(false);
  const [view, setView] = useState(createDailyLife);
  const [running, setRunning] = useState(false),
    [speed, setSpeed] = useState<1 | 4>(1);
  const [auto, setAuto] = useState(false),
    [limit, setLimit] = useState(10),
    [used, setUsed] = useState(0);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [pendingDialogue, setPendingDialogue] = useState<number | null>(null);
  const controlled = options.mode === 'control' ? options.active : null;
  const config = useRef({
    running: false,
    speed: 1 as 1 | 4,
    auto: false,
    limit: 10,
    used: 0,
    decisionsUsed: 0,
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
    ctx.current.saveLife(next, engineRevision.current);
    sincePublish.current = 0;
  }, [actors]);
  const cancel = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setPendingDialogue(null);
  }, []);
  useEffect(() => {
    if (!fate.loaded || initialized.current) return;
    let alive = true;
    const saved = fate.save.life;
    queueMicrotask(() => {
      if (!alive || initialized.current) return;
      life.current = saved ? structuredClone(saved) : createDailyLife();
      initialized.current = true;
      for (const actor of actors.current)
        Object.assign(actor, life.current.positions[actor.id], {
          path: [],
          frame: 0,
        });
      publish();
    });
    return () => {
      alive = false;
    };
  }, [fate.loaded, fate.save.life, actors, publish]);
  useEffect(() => {
    queueMicrotask(cancel);
  }, [
    controlled,
    options.mode,
    options.overlay,
    fate.apiKey,
    fate.cloudMode,
    fate.cloudUsername,
    fate.verified,
    fate.model,
    cancel,
  ]);
  const saveLatest = useCallback(() => {
    if (initialized.current)
      ctx.current.saveLife(
        snapshotLife(life.current, actors.current),
        engineRevision.current,
        true,
      );
  }, [actors]);
  useEffect(() => {
    const stop = () => {
      config.current.running = false;
      setRunning(false);
      cancel();
      publish();
    };
    const pauseForAbsence = () => {
      cancel();
      publish();
    };
    const hidden = () => {
      if (document.hidden) pauseForAbsence();
    };
    window.addEventListener('blur', pauseForAbsence);
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      request.current?.abort();
      saveLatest();
      window.removeEventListener('blur', pauseForAbsence);
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
      if (!event.dialogue && !event.decision) return;
      const current = ctx.current,
        cfg = config.current,
        opt = opts.current;
      // Encounters get the first call and at least three quarters of the budget.
      // Local habits keep ordinary life moving between a few AI choices.
      if (
        event.decision &&
        (life.current.encounters === 0 ||
          cfg.decisionsUsed >= Math.floor(cfg.limit / 4))
      )
        return;
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
      if (event.decision) cfg.decisionsUsed++;
      setUsed(cfg.used);
      setBusy(true);
      setPendingDialogue(event.dialogue ? event.id : null);
      setNotice('');
      try {
        const response = await fetch('/api/fate/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: event.dialogue ? 'encounter' : 'decision',
            ...(current.cloudMode
              ? { connection: 'cloud' }
              : { key: current.apiKey.trim() }),
            model: current.model,
            target,
            speaker,
            message:
              event.dialogue?.message ??
              '根据当前性格、背景、住处、习惯和真实经历，选择我接下来要做的事。',
            history: isPartner(speaker)
              ? pairConversationHistory(current.save, target, speaker)
                  .filter((e) => e.id !== `life-${event.id}`)
                  .map(({ message, reply, turns, speaker, target }) => ({
                    message,
                    reply,
                    turns,
                    speaker,
                    target,
                  }))
              : [],
            worldNote: current.save.worldNote,
            characterNotes: current.save.characterNotes,
            relationshipNotes: current.save.relationshipNotes,
            waverStage: life.current.waverStage,
            housing: life.current.housing,
            scene: lifeScene(
              snapshotLife(life.current, actors.current),
              target,
            ),
            ...(event.decision ? { needs: life.current.people[target] } : {}),
            recent: [
              ...new Map(
                [
                  ...recentLifeEvents(life.current, target),
                  ...(isPartner(speaker)
                    ? recentLifeEvents(life.current, speaker)
                    : []),
                ]
                  .filter((e) => e.id !== event.id)
                  .map((e) => [e.id, e]),
              ).values(),
            ]
              .sort((a, b) => a.id - b.id)
              .slice(-8)
              .map((e) => `${e.text}${e.decision?.reason || ''}`.slice(0, 300)),
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          turns?: unknown;
          effects?: unknown;
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
            setNotice('状态已经变化，人物继续当前安排。');
        } else {
          const original = life.current.events.find((e) => e.id === event.id);
          if (!original?.dialogue) throw new Error('没有找到这次相遇记录。');
          if (
            !commitSocialDialogue(
              life.current,
              event.id,
              data.turns,
              data.effects,
            )
          )
            throw new Error('这段相处已更新，保留当前记录。');
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
          setPendingDialogue(null);
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
      const planned = life.current.events.filter(
        (e) => e.id >= before && e.decision,
      );
      const selectedPlan =
        planned[life.current.encounters % (planned.length || 1)];
      if (encounter || selectedPlan)
        void generate((encounter ?? selectedPlan)!);
      sincePublish.current += dt;
      if (life.current.nextId !== before || sincePublish.current >= 1)
        publish();
    },
    [actors, generate, publish, remember],
  );

  function toggleRunning() {
    const next = !config.current.running;
    if (next) staggerFirstDepartures();
    config.current.running = next;
    setRunning(next);
    if (!next) cancel();
    publish();
  }
  function changeSpeed(value: 1 | 4) {
    config.current.speed = value;
    setSpeed(value);
  }
  function staggerFirstDepartures() {
    actors.current.forEach((actor, index) => {
      if (
        isPartner(actor.id) &&
        !life.current.people[actor.id].activity &&
        life.current.people[actor.id].choices === 0
      )
        actor.rest = ((index * 7) % 13) * 0.4;
    });
  }
  function changeAuto(value: boolean) {
    config.current.auto = value;
    setAuto(value);
    setNotice('');
    if (value && !config.current.running) {
      staggerFirstDepartures();
      config.current.running = true;
      setRunning(true);
      publish();
    }
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
  const visitPublic = useCallback(
    (place: PublicPlaceId, action: PublicVisitAction, target?: PartnerId) => {
      const opt = opts.current;
      if (!initialized.current || !opt.ready || opt.mode !== 'control')
        return { ok: false, message: '请先进入角色并等待街区加载。' };
      const result = visitPublicPlace(
        life.current,
        actors.current,
        opt.active,
        place,
        action,
        target,
      );
      if (result.ok) publish();
      return result;
    },
    [actors, publish],
  );
  function resetPlans() {
    cancel();
    for (const id of LIFE_IDS) life.current.people[id].activity = null;
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
    pendingDialogue,
    notice,
    advance,
    toggleRunning,
    changeSpeed,
    changeAuto,
    changeLimit,
    cancel,
    isInside,
    visitPublic,
    resetPlans,
  };
}
export type StreetLife = ReturnType<typeof useStreetLife>;
