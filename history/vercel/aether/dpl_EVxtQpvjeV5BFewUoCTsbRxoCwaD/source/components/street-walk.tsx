'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- This keyboard-controlled game uses a focusable application surface, not a document region. */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Eye,
  Footprints,
  Focus,
  Minus,
  Plus,
  RotateCcw,
  HelpCircle,
  MapPin,
  Gamepad2,
  MessageCircle,
  Settings2,
} from 'lucide-react';
import {
  STREET,
  cameraFor,
  clamp,
  createStreetActors,
  directionFromKeys,
  nearestWalkable,
  pathTo,
  placeName,
  screenToWorld,
  stepActor,
  type ActorId,
  type Point,
} from '@/lib/street';
import { pickGamepad, readGamepad, type PadHistory } from '@/lib/gamepad';
import { nearestPartner } from '@/lib/fate-state';
import { fatePerson, isPartner, type PartnerId } from '@/lib/fate-cast';
import { FateAISettings, FateConversation } from './fate-conversation';
import { useFate } from './fate-provider';
import { useStreetLife } from './use-street-life';
import { LifeControls, LifePanel } from './street-life-panel';
import { lifePeriod, lifeStatus, lifeTime } from '@/lib/fate-life';
import styles from './street-walk.module.css';

const CAST = [
  // Keep the order aligned with the available street residents and gamepad cycling.
  {
    id: 'admin' as const,
    name: '管理员',
    caption: '你的主控',
    image: '/fate/street/admin-walk.png',
    row: 0,
    rows: 1,
    aspect: 1,
  },
  {
    id: 'saber' as const,
    name: 'Saber',
    caption: '阿尔托莉雅',
    image: '/fate/street/fate-walk.png',
    row: 1,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'rin' as const,
    name: '远坂凛',
    caption: '远坂家的魔术师',
    image: '/fate/street/fate-walk.png',
    row: 0,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'shirou' as const,
    name: '卫宫士郎',
    caption: '把日常照顾好',
    image: '/fate/street/shirou-sakura-walk.png',
    row: 0,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'sakura' as const,
    name: '间桐樱',
    caption: '也为自己停留',
    image: '/fate/street/shirou-sakura-walk.png',
    row: 1,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'kiritsugu' as const,
    name: '卫宫切嗣',
    caption: '寡言的守望者',
    image: '/fate/street/kiritsugu-irisviel-walk.png',
    row: 0,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'irisviel' as const,
    name: '爱丽丝菲尔',
    caption: '探索平常的日子',
    image: '/fate/street/kiritsugu-irisviel-walk.png',
    row: 1,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'illya' as const,
    name: '伊莉雅',
    caption: '想把今天再留长一点',
    image: '/fate/street/illya-taiga-walk.png',
    row: 0,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'taiga' as const,
    name: '藤村大河',
    caption: '热心的藤村老师',
    image: '/fate/street/illya-taiga-walk.png',
    row: 1,
    rows: 2,
    aspect: 1,
  },
];
const ASSETS = [
  '/fate/street/street.png',
  ...new Set(CAST.map((p) => p.image)),
];
const MOVE_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowleft',
  'arrowdown',
  'arrowright',
]);

function spriteStyle(person: (typeof CAST)[number], frame = 0): CSSProperties {
  return {
    backgroundImage: `url(${person.image})`,
    backgroundSize: `400% ${person.rows * 100}%`,
    backgroundPosition: `${(frame / 3) * 100}% ${person.row * 100}%`,
    aspectRatio: String(person.aspect),
  };
}

export default function StreetWalk() {
  const fate = useFate();
  const [nearby, setNearby] = useState<PartnerId | null>(null);
  const [dialog, setDialog] = useState<'settings' | PartnerId | null>(null);
  const overlay = useRef(false);
  const [active, setActive] = useState<ActorId>('admin');
  const [mode, setMode] = useState<'control' | 'observe'>('control');
  const [zoom, setZoom] = useState(1.24);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [location, setLocation] = useState('冬木 · 生活街道');
  const [hint, setHint] = useState('点击街道前往，也可以使用 WASD 或方向键');
  const [padStatus, setPadStatus] = useState('连接手柄后，按任意按钮');
  const [padConnected, setPadConnected] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const castList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = castList.current;
    const card = list?.children[CAST.findIndex((p) => p.id === active)] as
      | HTMLElement
      | undefined;
    if (!list || !card) return;
    const bounds = list.getBoundingClientRect(),
      item = card.getBoundingClientRect();
    if (item.left < bounds.left) list.scrollLeft -= bounds.left - item.left + 2;
    else if (item.right > bounds.right)
      list.scrollLeft += item.right - bounds.right + 2;
  }, [active]);
  const world = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const actors = useRef(createStreetActors());
  const [lifePanel, setLifePanel] = useState(false);
  const daily = useStreetLife(actors, {
    active,
    mode,
    overlay: Boolean(dialog),
    ready,
  });
  const dailyActions = useRef({
    advance: daily.advance,
    isInside: daily.isInside,
    cancel: daily.cancel,
  });
  useEffect(() => {
    dailyActions.current = {
      advance: daily.advance,
      isInside: daily.isInside,
      cancel: daily.cancel,
    };
  }, [daily.advance, daily.isInside, daily.cancel]);
  const actorElements = useRef(new Map<ActorId, HTMLDivElement>());
  const spriteElements = useRef(new Map<ActorId, HTMLDivElement>());
  const keys = useRef(new Set<string>());
  const touchKeys = useRef(new Set<string>());
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  const viewport = useRef({ width: 1000, height: 600 });
  const freeView = useRef<Point>({ x: 837, y: 850 });
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    world: Point;
    dragged: boolean;
  } | null>(null);
  const settings = useRef({ active, mode, zoom, ready });
  const padHistory = useRef<PadHistory>(null);
  const padIndex = useRef<number | null>(null);
  const padActions = useRef<{
    choose: (id: ActorId) => void;
    toggle: () => void;
    center: () => void;
    talk: () => void;
    back: () => void;
  } | null>(null);
  const current = CAST.find((p) => p.id === active)!;

  useEffect(() => {
    settings.current = { active, mode, zoom, ready };
  }, [active, mode, zoom, ready]);
  useEffect(() => {
    let alive = true;
    const images = ASSETS.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(src));
          img.src = src;
          if (img.complete && img.naturalWidth) resolve();
        }),
    );
    Promise.all(images)
      .then(() => {
        if (alive) {
          setReady(true);
          if (!overlay.current) stage.current?.focus({ preventScroll: true });
        }
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    const host = stage.current;
    if (!host) return;
    const resize = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      viewport.current = { width: r.width, height: r.height };
    });
    resize.observe(host);
    const stop = () => {
      keys.current.clear();
      touchKeys.current.clear();
      padHistory.current = null;
      for (const p of actors.current) p.path = [];
    };
    const keyDown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable="true"],summary',
        )
      )
        return;
      const key = e.key.toLowerCase();
      if (overlay.current) return;
      if (
        key === 'e' &&
        !e.repeat &&
        settings.current.ready &&
        settings.current.mode === 'control'
      ) {
        e.preventDefault();
        padActions.current?.talk();
        return;
      }
      if (!MOVE_KEYS.has(key)) return;
      if (settings.current.mode !== 'control' || !settings.current.ready)
        return;
      e.preventDefault();
      keys.current.add(key);
    };
    const keyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    let raf = 0,
      last = 0,
      reported = '';
    let reportedPad = '';
    let reportedPartner: PartnerId | null = null;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      let opts = settings.current;
      if (opts.ready && !document.hidden) {
        let pad = null;
        let status = '连接手柄后，按任意按钮';
        try {
          if (typeof navigator.getGamepads === 'function') {
            pad = pickGamepad(
              Array.from(navigator.getGamepads()),
              padIndex.current,
            );
            if (pad) {
              padIndex.current = pad.index;
              status =
                pad.mapping === 'standard'
                  ? '手柄已连接'
                  : '手柄已连接 · 基础摇杆模式';
            }
          } else status = '当前浏览器不支持手柄';
        } catch {
          status = '浏览器未开放手柄访问';
        }
        if (status !== reportedPad) {
          reportedPad = status;
          setPadStatus(status);
          setPadConnected(Boolean(pad));
        }
        const sampled = readGamepad(
          document.hasFocus() ? pad : null,
          padHistory.current,
        );
        padHistory.current = sampled.history;
        for (const action of sampled.actions) {
          if (overlay.current) {
            if (action === 'back') padActions.current?.back();
            continue;
          }
          if (action === 'talk') {
            padActions.current?.talk();
            continue;
          }
          if (action === 'previous' || action === 'next') {
            const index = CAST.findIndex(
              (p) => p.id === settings.current.active,
            );
            padActions.current?.choose(
              CAST[
                (index + (action === 'next' ? 1 : CAST.length - 1)) %
                  CAST.length
              ].id,
            );
          } else if (action === 'observe') padActions.current?.toggle();
          else if (action === 'center') padActions.current?.center();
        }
        if (overlay.current) {
          raf = requestAnimationFrame(tick);
          return;
        }
        opts = settings.current;
        const keyboard = directionFromKeys(
          new Set([...keys.current, ...touchKeys.current]),
        );
        const input = keyboard.x || keyboard.y ? keyboard : sampled.move;
        if (opts.mode === 'observe') {
          const look =
            sampled.look.x || sampled.look.y ? sampled.look : sampled.move;
          freeView.current = {
            x: clamp(freeView.current.x + look.x * 350 * dt, 0, STREET.width),
            y: clamp(freeView.current.y + look.y * 350 * dt, 0, STREET.height),
          };
        }
        dailyActions.current.advance(dt);
        for (const actor of actors.current) {
          const controlled =
            opts.mode === 'control' && actor.id === opts.active;
          if (controlled) stepActor(actor, dt, input, 165);
          else if (actor.id === 'admin') actor.frame = 0;
          const node = actorElements.current.get(actor.id),
            sprite = spriteElements.current.get(actor.id);
          if (node) {
            node.style.visibility =
              !controlled && dailyActions.current.isInside(actor.id)
                ? 'hidden'
                : 'visible';
            node.style.left = `${actor.x}px`;
            node.style.top = `${actor.y}px`;
            node.style.zIndex = String(Math.round(actor.y));
          }
          if (sprite) {
            sprite.style.backgroundPositionX = `${(actor.frame / 3) * 100}%`;
            sprite.style.transform = `scaleX(${actor.facing})`;
          }
        }
        const selected = actors.current.find((p) => p.id === opts.active)!;
        const near =
          opts.mode === 'control'
            ? nearestPartner(
                actors.current.filter(
                  (a) =>
                    a.id === opts.active ||
                    !dailyActions.current.isInside(a.id),
                ),
                opts.active,
              )
            : null;
        if (near !== reportedPartner) {
          reportedPartner = near;
          setNearby(near);
        }
        const point = opts.mode === 'control' ? selected : freeView.current;
        const next = cameraFor(
          point,
          viewport.current.width,
          viewport.current.height,
          opts.zoom,
        );
        camera.current = next;
        if (world.current)
          world.current.style.transform = `translate(${-next.x * next.scale}px,${-next.y * next.scale}px) scale(${next.scale})`;
        if (marker.current) {
          const destination =
            opts.mode === 'control' ? selected.path.at(-1) : null;
          marker.current.style.display = destination ? 'block' : 'none';
          if (destination) {
            marker.current.style.left = `${destination.x}px`;
            marker.current.style.top = `${destination.y}px`;
          }
        }
        const nextPlace = placeName(selected);
        if (nextPlace !== reported) {
          reported = nextPlace;
          setLocation(nextPlace);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      stop();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, []);

  function choose(id: ActorId) {
    dailyActions.current.cancel();
    actors.current = actors.current.map((p) => ({ ...p, path: [], rest: 4 }));
    keys.current.clear();
    touchKeys.current.clear();
    settings.current = { ...settings.current, active: id, mode: 'control' };
    setActive(id);
    setMode('control');
    setHint(
      `正在控制${CAST.find((p) => p.id === id)!.name} · 摇杆、方向键或点击路面`,
    );
    stage.current?.focus({ preventScroll: true });
  }
  function switchMode() {
    dailyActions.current.cancel();
    const next = settings.current.mode === 'control' ? 'observe' : 'control';
    const selected = actors.current.find(
      (p) => p.id === settings.current.active,
    )!;
    freeView.current = { x: selected.x, y: selected.y };
    actors.current = actors.current.map((p) => ({ ...p, path: [], rest: 3 }));
    keys.current.clear();
    touchKeys.current.clear();
    setMode(next);
    settings.current = { ...settings.current, mode: next };
    setHint(
      next === 'observe'
        ? '拖动画面或使用右摇杆；点击「开始日常」观察他们的生活'
        : '点击街道前往，也可以使用 WASD 或方向键',
    );
    stage.current?.focus({ preventScroll: true });
  }
  function recenter() {
    const selected = actors.current.find(
      (p) => p.id === settings.current.active,
    )!;
    freeView.current = { x: selected.x, y: selected.y };
    settings.current = { ...settings.current, zoom: 1.24 };
    setZoom(1.24);
  }
  function openDialog(value: 'settings' | PartnerId) {
    dailyActions.current.cancel();
    overlay.current = true;
    keys.current.clear();
    touchKeys.current.clear();
    pointer.current = null;
    actors.current = actors.current.map((actor) => ({
      ...actor,
      path: [],
      frame: 0,
      rest: 4,
    }));
    setDialog(value);
  }
  function closeDialog() {
    overlay.current = false;
    setDialog(null);
    keys.current.clear();
    touchKeys.current.clear();
    stage.current?.focus({ preventScroll: true });
  }
  function talk() {
    if (settings.current.mode !== 'control') return;
    const near = nearestPartner(
      actors.current.filter(
        (a) =>
          a.id === settings.current.active ||
          !dailyActions.current.isInside(a.id),
      ),
      settings.current.active,
    );
    if (near) openDialog(near);
    else setHint('靠近街道上的人物后，按 E 或点击交谈');
  }
  useEffect(() => {
    padActions.current = {
      choose,
      toggle: switchMode,
      center: recenter,
      talk,
      back: closeDialog,
    };
  });
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !ready) return;
    stage.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      world: { ...freeView.current },
      dragged: false,
    };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) p.dragged = true;
    if (mode === 'observe')
      freeView.current = {
        x: clamp(
          p.world.x - (e.clientX - p.x) / camera.current.scale,
          0,
          STREET.width,
        ),
        y: clamp(
          p.world.y - (e.clientY - p.y) / camera.current.scale,
          0,
          STREET.height,
        ),
      };
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = pointer.current;
    pointer.current = null;
    if (!p || p.dragged || mode !== 'control') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const wanted = screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
      camera.current,
    );
    const destination = nearestWalkable(wanted);
    if (Math.hypot(wanted.x - destination.x, wanted.y - destination.y) > 145) {
      setHint('点一下人物脚边的路面，就能走过去');
      return;
    }
    const actor = actors.current.find((a) => a.id === active)!;
    actor.path = pathTo(actor, destination);
    setHint('正在前往 · 随时按方向键改变方向');
  }
  function reset() {
    dailyActions.current.cancel();
    actors.current = createStreetActors();
    daily.resetPlans();
    keys.current.clear();
    touchKeys.current.clear();
    freeView.current = { x: 837, y: 850 };
    setZoom(1.24);
    setHint('已回到街道起点');
    stage.current?.focus({ preventScroll: true });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="返回世界">
          <span className={styles.wordmark}>
            SINE<span> / </span>FINE
          </span>
          <span className={styles.brandChinese}>无中之庭</span>
        </Link>
        <div className={styles.location}>
          <MapPin size={16} />
          <span>{location}</span>
          <small>{lifePeriod(daily.view.minutes)}</small>
        </div>
        <div className={styles.headerActions}>
          <Link
            href="/fate/world"
            className={styles.back}
            aria-label="世界设定"
          >
            <Settings2 size={16} />
            <span>世界设定</span>
          </Link>
          <button
            className={styles.aiButton}
            onClick={() => openDialog('settings')}
          >
            <Settings2 size={16} />
            <span>{fate.verified ? 'DeepSeek 已连接' : '连接 DeepSeek'}</span>
          </button>
          <Link href="/" className={styles.back}>
            <ArrowLeft size={16} />
            <span>返回世界</span>
          </Link>
        </div>
      </header>
      <LifeControls
        life={daily}
        disabled={!ready || !fate.loaded}
        open={lifePanel}
        onToggle={() => setLifePanel((v) => !v)}
      />
      <div className={styles.streetBody}>
        <div className={styles.stageWrap}>
          <div
            ref={stage}
            className={`${styles.stage} ${mode === 'observe' ? styles.observing : ''}`}
            tabIndex={0}
            role="application"
            aria-label="可操作的冬木街道，使用手柄左摇杆、WASD 或方向键移动，也可点击路面前往"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointer.current = null;
            }}
          >
            <div
              ref={world}
              className={styles.world}
              style={{ width: STREET.width, height: STREET.height }}
            >
              <Image
                className={styles.background}
                src="/fate/street/street.png"
                alt="暖阳下的冬木街道，左侧是住宅庭院，右侧是街角咖啡店"
                width={STREET.width}
                height={STREET.height}
                unoptimized
                preload
                draggable={false}
                style={{
                  filter:
                    lifePeriod(daily.view.minutes) === '夜间'
                      ? 'brightness(0.48) saturate(0.7)'
                      : lifePeriod(daily.view.minutes) === '傍晚'
                        ? 'brightness(0.85) sepia(0.15)'
                        : 'none',
                }}
              />
              {ready &&
                CAST.map((person) => (
                  <div
                    key={person.id}
                    ref={(node) => {
                      if (node) actorElements.current.set(person.id, node);
                      else actorElements.current.delete(person.id);
                    }}
                    className={`${styles.actor} ${person.id === active && mode === 'control' ? styles.controlled : ''}`}
                    style={{ width: 270 * person.aspect, height: 270 }}
                  >
                    <div className={styles.groundShadow} />
                    <div
                      ref={(node) => {
                        if (node) spriteElements.current.set(person.id, node);
                        else spriteElements.current.delete(person.id);
                      }}
                      className={styles.sprite}
                      style={spriteStyle(person)}
                    />
                    <span className={styles.actorName}>
                      {person.id === active && mode === 'control' && (
                        <span className={styles.activeDot} />
                      )}{' '}
                      {person.name}
                      {isPartner(person.id) && (
                        <small className={styles.actorActivity}>
                          {mode === 'control' && person.id === active
                            ? '由你控制'
                            : lifeStatus(daily.view.people[person.id])}
                        </small>
                      )}
                    </span>
                  </div>
                ))}
              <div ref={marker} className={styles.destination} />
            </div>
          </div>
          <div className={styles.modeBadge}>
            <span className={styles.liveDot} />
            {mode === 'control' ? `正在控制 · ${current.name}` : '自由观察'}
            <span className={styles.preview}>
              {lifeTime(daily.view.minutes).split(' · ')[1]}
            </span>
          </div>
          <output
            className={`${styles.gamepadStatus} ${padConnected ? styles.gamepadConnected : ''}`}
          >
            <Gamepad2 size={17} aria-hidden="true" />
            <span>{padStatus}</span>
          </output>
          {ready && mode === 'control' && (
            <button
              className={styles.talkButton}
              onClick={talk}
              disabled={!nearby || !fate.loaded}
            >
              <MessageCircle size={16} />
              {nearby
                ? `与${fatePerson(nearby)!.name}交谈`
                : '靠近街道上的人物交谈'}
              <kbd>E / A</kbd>
            </button>
          )}
          <div className={styles.cameraTools}>
            <button
              onClick={() => setZoom((v) => clamp(v - 0.12, 1, 1.8))}
              disabled={zoom <= 1}
              aria-label="拉远镜头"
              title="拉远镜头"
            >
              <Minus size={19} />
            </button>
            <button
              onClick={recenter}
              aria-label="镜头回到人物"
              title="镜头回到人物"
            >
              <Focus size={19} />
            </button>
            <button
              onClick={() => setZoom((v) => clamp(v + 0.12, 1, 1.8))}
              disabled={zoom >= 1.8}
              aria-label="拉近镜头"
              title="拉近镜头"
            >
              <Plus size={19} />
            </button>
          </div>
          {!ready && (
            <div className={styles.assetState}>
              <span>{error ? '街景素材未能载入' : '正在进入街道…'}</span>
              {error && (
                <button
                  onClick={() => {
                    setReady(false);
                    setError(false);
                    setAttempt((v) => v + 1);
                  }}
                >
                  重新载入
                </button>
              )}
            </div>
          )}
          {ready && mode === 'control' && (
            <div className={styles.dpad} aria-label="触屏方向键">
              {[
                { key: 'arrowup', label: '向上走', Icon: ArrowUp },
                { key: 'arrowleft', label: '向左走', Icon: ArrowLeft },
                { key: 'arrowdown', label: '向下走', Icon: ArrowDown },
                { key: 'arrowright', label: '向右走', Icon: ArrowRight },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className={styles[key]}
                  aria-label={label}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    touchKeys.current.add(key);
                  }}
                  onPointerUp={() => touchKeys.current.delete(key)}
                  onPointerCancel={() => touchKeys.current.delete(key)}
                  onLostPointerCapture={() => touchKeys.current.delete(key)}
                >
                  <Icon size={22} />
                </button>
              ))}
            </div>
          )}
        </div>
        {lifePanel && (
          <LifePanel
            life={daily}
            controlled={mode === 'control' ? active : null}
            verified={fate.verified}
            storageNotice={fate.storageNotice}
            onSettings={() => openDialog('settings')}
            onClose={() => setLifePanel(false)}
          />
        )}
      </div>
      <footer className={styles.footer}>
        <div className={styles.controlIntro}>
          <span className={styles.eyebrow}>主控角色</span>
          <p>{mode === 'control' ? '随时切换人物' : '正在自由观察'}</p>
        </div>
        <div
          ref={castList}
          className={styles.cast}
          aria-label="横向浏览并选择主控角色"
        >
          {CAST.map((person) => (
            <button
              key={person.id}
              disabled={!ready}
              onClick={() => choose(person.id)}
              className={`${styles.castCard} ${active === person.id ? styles.selected : ''}`}
              aria-pressed={mode === 'control' && active === person.id}
            >
              <span className={styles.portrait} style={spriteStyle(person)} />
              <span>
                <strong>{person.name}</strong>
                <small>{person.caption}</small>
              </span>
              {mode === 'control' && active === person.id && (
                <Footprints size={15} />
              )}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            className={styles.observeButton}
            disabled={!ready}
            onClick={switchMode}
          >
            {mode === 'control' ? <Eye size={18} /> : <Footprints size={18} />}
            <span>{mode === 'control' ? '自由观察' : '控制人物'}</span>
          </button>
          <button
            className={styles.resetButton}
            onClick={reset}
            aria-label="回到初始位置"
            title="回到初始位置"
          >
            <RotateCcw size={17} />
          </button>
        </div>
        <div className={styles.instructions}>
          <span aria-live="polite">{hint}</span>
          <details className={styles.help}>
            <summary>
              <HelpCircle size={14} />
              操作说明
            </summary>
            <div>
              <p>WASD / 方向键：走动</p>
              <p>点击路面：自动走过去</p>
              <p>自由观察：拖动画面</p>
              <p>右上角 ＋ / −：调整镜头</p>
              <p className={styles.helpLabel}>手柄 · 连接后按任意按钮</p>
              <p>左摇杆 / 十字键：走动</p>
              <p>LB / RB（L1 / R1）：切换人物</p>
              <p>Y（△）：切换自由观察</p>
              <p>右摇杆：自由观察时移动镜头</p>
              <p>Menu / Options：镜头回到人物</p>
              <p>E / A（×）：靠近人物后交谈</p>
              <p>B（○）/ Esc：关闭交谈</p>
              <p>
                右上角连接 DeepSeek 后，可与街道上的八位 Fate
                人物自由交谈。点击「开始日常」观察自主行动，在「日常与记录」里开启自主
                AI。离开页面后日常暂停。
              </p>
            </div>
          </details>
        </div>
      </footer>
      {dialog === 'settings' ? (
        <FateAISettings onClose={closeDialog} />
      ) : dialog ? (
        <FateConversation
          key={`${dialog}-${active}`}
          target={dialog}
          speaker={active}
          onClose={closeDialog}
          onSettings={() => openDialog('settings')}
        />
      ) : null}
    </main>
  );
}
