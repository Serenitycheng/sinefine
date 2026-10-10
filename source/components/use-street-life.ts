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
import { actOnPastime, type PastimeCommand } from '@/lib/fate-pastimes';
import { takeHomeCare, type HomeCareAction } from '@/lib/fate-self-care';
import { playerAppointment } from '@/lib/fate-meetups';
import { isPartner, type PartnerId } from '@/lib/fate-cast';
import { pairConversationHistory, type Exchange } from '@/lib/fate-state';
import {
  interactionStatus,
  nearbyResident,
  recordOnsiteConversation,
} from '@/lib/fate-interaction';
import { commitSocialDialogue } from '@/lib/fate-social';
import {
  visitPublicPlace,
  type PublicPlaceId,
  type PublicVisitAction,
} from '@/lib/fate-public-places';
import type { Actor, ActorId } from '@/lib/street';
import type { HomeId } from '@/lib/fate-housing';
import {
  INDOOR_ENTRY,
  nearHomeEntrance,
  stepIndoor,
  type IndoorPosition,
} from '@/lib/fate-indoor-map';
import type { Point } from '@/lib/street';
import {
  EmiyaGameSession,
  type EmiyaStreetReturn,
} from '@/lib/fate-emiya-game';
import { teleportStreetActor } from '@/lib/fate-navigation';
import {
  startPublicOuting,
  choosePublicOuting,
  interactPublicOuting,
  cancelPublicOuting,
  type PublicOutingKind,
  type CafeOrder,
  type OutingChoice,
} from '@/lib/fate-public-outings';
import {
  clockRate,
  FATE_CLOCK_SPEED_KEY,
  FATE_WALK_PACE_KEY,
  parseFateClockSpeed,
  parseFateWalkPace,
  type FateClockSpeed,
  type FateWalkPace,
} from '@/lib/fate-clock';

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
  const emiyaRef = useRef<EmiyaGameSession | null>(null);
  const [emiya, setEmiya] = useState<EmiyaGameSession | null>(null);
  const [view, setView] = useState(createDailyLife);
  const [running, setRunning] = useState(false),
    [speed, setSpeed] = useState<FateClockSpeed>(1);
  const [walkPace, setWalkPace] = useState<FateWalkPace>(1);
  const [auto, setAuto] = useState(false),
    [limit, setLimit] = useState(10),
    [used, setUsed] = useState(0);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [pendingDialogue, setPendingDialogue] = useState<number | null>(null);
  const controlled = options.mode === 'control' ? options.active : null;
  const config = useRef({
    running: false,
    speed: 1 as FateClockSpeed,
    walkPace: 1 as FateWalkPace,
    auto: false,
    limit: 10,
    used: 0,
    decisionsUsed: 0,
    lastCall: -Infinity,
  });
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      try {
        const savedSpeed = parseFateClockSpeed(
          localStorage.getItem(FATE_CLOCK_SPEED_KEY),
        );
        const savedPace = parseFateWalkPace(
          localStorage.getItem(FATE_WALK_PACE_KEY),
        );
        config.current.speed = savedSpeed;
        config.current.walkPace = savedPace;
        setSpeed(savedSpeed);
        setWalkPace(savedPace);
      } catch {
        /* Storage can be unavailable; the current session stays playable. */
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  const request = useRef<AbortController | null>(null);
  const sincePublish = useRef(0);
  const sinceIndoorView = useRef(0);
  const sinceIndoorSave = useRef(0);
  useEffect(() => {
    ctx.current = fate;
    opts.current = options;
  });
  const publish = useCallback(() => {
    if (!initialized.current) return;
    if (emiyaRef.current) {
      const next = emiyaRef.current.gameSave();
      setView(next.life);
      ctx.current.saveEmiya(next.life, next.emiya, engineRevision.current);
      sincePublish.current = 0;
      return;
    }
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
      const house = ctx.current.save.emiya;
      if (house?.active) {
        const session = new EmiyaGameSession(life.current, house.street, house);
        session.clockSpeed = config.current.speed;
        session.walkPace = config.current.walkPace;
        emiyaRef.current = session;
        setEmiya(session);
      }
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
    if (initialized.current && emiyaRef.current) {
      const next = emiyaRef.current.gameSave();
      ctx.current.saveEmiya(
        next.life,
        next.emiya,
        engineRevision.current,
        true,
      );
      return;
    }
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
      if (emiyaRef.current) emiyaRef.current.running = false;
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
              isPartner(speaker) ? speaker : undefined,
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
      if (emiyaRef.current) {
        // The house owns movement and the daily clock. This loop only persists it.
        sincePublish.current += dt;
        if (sincePublish.current >= 1) publish();
        return;
      }
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
        speed: 1,
        clockRate: clockRate(cfg.speed),
        motionRate: cfg.walkPace,
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
  function changeSpeed(value: FateClockSpeed) {
    const next = parseFateClockSpeed(value);
    config.current.speed = next;
    setSpeed(next);
    try {
      localStorage.setItem(FATE_CLOCK_SPEED_KEY, String(next));
    } catch {
      /* Session setting still applies. */
    }
  }
  function changeWalkPace(value: FateWalkPace) {
    const next = parseFateWalkPace(value);
    config.current.walkPace = next;
    setWalkPace(next);
    try {
      localStorage.setItem(FATE_WALK_PACE_KEY, String(next));
    } catch {
      /* Session setting still applies. */
    }
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
  const currentIndoor = useCallback(
    (): IndoorPosition | undefined =>
      emiyaRef.current?.life.indoor ?? life.current.indoor,
    [],
  );
  const enterEmiya = useCallback(
    (street: EmiyaStreetReturn) => {
      const opt = opts.current;
      const actor = actors.current.find(
        (candidate) => candidate.id === 'shirou',
      );
      if (
        !initialized.current ||
        !opt.ready ||
        opt.mode !== 'control' ||
        opt.active !== 'shirou' ||
        !actor ||
        !nearHomeEntrance(actor, 'emiya') ||
        life.current.indoor ||
        emiyaRef.current ||
        ctx.current.storageBlocked ||
        engineRevision.current !== ctx.current.saveRevision
      )
        return false;
      cancel();
      life.current.people.shirou.activity = null;
      actor.path = [];
      const session = new EmiyaGameSession(
        snapshotLife(life.current, actors.current),
        street,
        ctx.current.save.emiya,
      );
      session.clockSpeed = config.current.speed;
      session.walkPace = config.current.walkPace;
      session.running = config.current.running;
      emiyaRef.current = session;
      setEmiya(session);
      publish();
      return true;
    },
    [actors, cancel, publish],
  );
  const leaveEmiya = useCallback(() => {
    const session = emiyaRef.current;
    if (!session) return null;
    const running = session.running;
    const next = session.release();
    life.current = next.life;
    for (const actor of actors.current)
      Object.assign(actor, next.life.positions[actor.id], {
        path: [],
        frame: 0,
      });
    config.current.running = running;
    setRunning(running);
    emiyaRef.current = null;
    setEmiya(null);
    setView(next.life);
    ctx.current.saveEmiya(next.life, next.emiya, engineRevision.current);
    return session.street;
  }, [actors]);
  const enterHome = useCallback(
    (home: HomeId) => {
      const opt = opts.current;
      const actor = actors.current.find(
        (candidate) => candidate.id === opt.active,
      );
      if (
        !initialized.current ||
        !opt.ready ||
        opt.mode !== 'control' ||
        !actor ||
        life.current.indoor
      )
        return false;
      if (!nearHomeEntrance(actor, home)) return false;
      if (isPartner(actor.id)) life.current.people[actor.id].activity = null;
      actor.path = [];
      life.current.indoor = {
        actor: actor.id,
        home,
        ...INDOOR_ENTRY,
        layout: 2,
      };
      publish();
      return true;
    },
    [actors, publish],
  );
  const leaveHome = useCallback(() => {
    if (!life.current.indoor) return false;
    delete life.current.indoor;
    sinceIndoorView.current = 0;
    sinceIndoorSave.current = 0;
    publish();
    return true;
  }, [publish]);
  const moveInside = useCallback(
    (dt: number, input: Point) => {
      if (emiyaRef.current) return;
      const position = life.current.indoor;
      const opt = opts.current;
      if (
        !position ||
        opt.mode !== 'control' ||
        opt.active !== position.actor ||
        !opt.ready
      )
        return;
      const next = stepIndoor(
        position,
        input,
        dt,
        position.home,
        config.current.walkPace,
      );
      if (next.x !== position.x || next.y !== position.y) {
        life.current.indoor = { ...position, ...next };
        sinceIndoorView.current += dt;
        if (sinceIndoorView.current >= 0.08) {
          setView(snapshotLife(life.current, actors.current));
          sinceIndoorView.current = 0;
        }
        sinceIndoorSave.current = Math.max(sinceIndoorSave.current, 0.001);
      }
      if (sinceIndoorSave.current > 0) {
        sinceIndoorSave.current += dt;
        if (sinceIndoorSave.current >= 0.4) {
          publish();
          sinceIndoorSave.current = 0;
        }
      }
    },
    [actors, publish],
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
  const teleport = useCallback(
    (destination: Point) => {
      const opt = opts.current;
      if (
        !initialized.current ||
        !opt.ready ||
        opt.mode !== 'control' ||
        opt.overlay ||
        ctx.current.storageBlocked ||
        engineRevision.current !== ctx.current.saveRevision
      )
        return { ok: false, message: '请先进入角色，或处理存档提示。' };
      const result = teleportStreetActor(
        life.current,
        actors.current,
        opt.active,
        destination,
      );
      if (result.ok) {
        cancel();
        sinceIndoorView.current = 0;
        sinceIndoorSave.current = 0;
        publish();
        saveLatest();
      }
      return result;
    },
    [actors, cancel, publish, saveLatest],
  );
  const outing = useCallback(
    (
      command:
        | {
            type: 'start';
            kind: PublicOutingKind;
            order?: CafeOrder;
            companion?: PartnerId;
          }
        | { type: 'choose'; choice: OutingChoice }
        | { type: 'interact' | 'cancel' },
    ) => {
      const opt = opts.current;
      if (
        !initialized.current ||
        !opt.ready ||
        opt.mode !== 'control' ||
        ctx.current.storageBlocked ||
        engineRevision.current !== ctx.current.saveRevision
      )
        return { ok: false, message: '请先进入角色，或处理存档提示。' };
      const result =
        command.type === 'start'
          ? startPublicOuting(
              life.current,
              actors.current,
              opt.active,
              command.kind,
              command,
            )
          : command.type === 'choose'
            ? choosePublicOuting(
                life.current,
                actors.current,
                opt.active,
                command.choice,
              )
            : command.type === 'cancel'
              ? cancelPublicOuting(life.current, opt.active, actors.current)
              : interactPublicOuting(life.current, actors.current, opt.active);
      if (result.ok) publish();
      return result;
    },
    [actors, publish],
  );
  const interaction = useCallback(
    (target: PartnerId) => {
      const opt = opts.current;
      if (
        !initialized.current ||
        !opt.ready ||
        ctx.current.storageBlocked ||
        engineRevision.current !== ctx.current.saveRevision
      )
        return { ok: false, message: '请等待场景加载，或先处理存档提示。' };
      return interactionStatus(
        life.current,
        actors.current,
        opt.mode === 'control' ? opt.active : null,
        target,
      );
    },
    [actors],
  );
  const nearestResident = useCallback(() => {
    const opt = opts.current;
    return opt.ready && opt.mode === 'control'
      ? nearbyResident(life.current, actors.current, opt.active)
      : null;
  }, [actors]);
  const commitConversation = useCallback(
    (entry: Exchange, effects?: unknown) => {
      const status = interaction(entry.target);
      if (!status.ok) return status;
      const opt = opts.current;
      const next = snapshotLife(life.current, actors.current);
      const result = recordOnsiteConversation(
        next,
        actors.current,
        opt.mode === 'control' ? opt.active : null,
        entry,
        effects,
      );
      if (!result.ok) return result;
      if (!ctx.current.append(entry, next, engineRevision.current))
        return {
          ok: false,
          message: '进度已改变，本次交谈未写入；请先处理存档提示。',
        };
      life.current = next;
      setView(next);
      sincePublish.current = 0;
      return result;
    },
    [actors, interaction],
  );
  const manageAppointment = useCallback(
    (id: number, action: 'attend' | 'cancel') => {
      const opt = opts.current;
      if (
        !initialized.current ||
        !opt.ready ||
        ctx.current.storageBlocked ||
        engineRevision.current !== ctx.current.saveRevision
      )
        return { ok: false, message: '请等待街区载入，或先处理存档提示。' };
      const result = playerAppointment(
        life.current,
        actors.current,
        opt.mode === 'control' ? opt.active : null,
        id,
        action,
      );
      if (result.ok) publish();
      return result;
    },
    [actors, publish],
  );
  const pastime = useCallback(
    (command: PastimeCommand, target: PartnerId) => {
      const opt = opts.current;
      if (
        !initialized.current ||
        !opt.ready ||
        ctx.current.storageBlocked ||
        engineRevision.current !== ctx.current.saveRevision
      )
        return { ok: false, message: '请等待街区载入，或先处理存档提示。' };
      const result = actOnPastime(
        life.current,
        actors.current,
        opt.mode === 'control' ? opt.active : null,
        command,
        target,
      );
      if (result.ok) publish();
      return result;
    },
    [actors, publish],
  );
  const homeCare = useCallback(
    (action: HomeCareAction) => {
      const opt = opts.current;
      if (
        !initialized.current ||
        !opt.ready ||
        opt.mode !== 'control' ||
        opt.overlay ||
        ctx.current.storageBlocked ||
        engineRevision.current !== ctx.current.saveRevision
      )
        return {
          ok: false,
          message: '先处理当前对话或存档提示，再安排居家时间。',
        };
      cancel();
      const result = takeHomeCare(
        life.current,
        actors.current,
        opt.active,
        action,
      );
      if (result.ok) {
        for (const encounter of result.encounters) remember(encounter);
        publish();
        saveLatest();
      }
      return result;
    },
    [actors, cancel, publish, remember, saveLatest],
  );
  function resetPlans() {
    cancel();
    for (const id of LIFE_IDS) life.current.people[id].activity = null;
    life.current.holdUntil = 0;
    publish();
  }
  return {
    view,
    emiya,
    enterEmiya,
    leaveEmiya,
    saveEmiya: publish,
    running,
    speed,
    walkPace,
    changeWalkPace,
    outing,
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
    currentIndoor,
    enterHome,
    leaveHome,
    moveInside,
    visitPublic,
    teleport,
    interaction,
    nearestResident,
    commitConversation,
    manageAppointment,
    pastime,
    homeCare,
    resetPlans,
  };
}
export type StreetLife = ReturnType<typeof useStreetLife>;
