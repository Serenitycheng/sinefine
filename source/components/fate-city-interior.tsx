'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events -- This floor application supports keyboard walking through the modal's key listener and accessible destination buttons. */

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  DoorOpen,
  Minus,
  Plus,
} from 'lucide-react';
import { ART_SPRITE_FRAMES } from '@/lib/fate-art-sprite';
import { ILLYA_ART_SPRITE } from '@/lib/fate-character-art';
import type { CityPoint } from '@/lib/fate-city-layout';
import {
  INTERIOR_ART_ENTRY,
  INTERIOR_PAINT,
  interiorDepth,
  interiorProject,
  interiorUnproject,
  type CityInteriorScene,
} from '@/lib/fate-city-interior-scenes';
import {
  interiorMove,
  interiorRoute,
} from '@/lib/fate-city-interior-navigation';
import styles from './fate-city-interior.module.css';
import FateEmiyaHouse from './fate-emiya-house';

type Direction = 'up' | 'down' | 'left' | 'right';
const INPUTS = [
  { label: '向左', x: -1, y: 0, icon: ArrowLeft },
  { label: '向上', x: 0, y: -1, icon: ArrowUp },
  { label: '向下', x: 0, y: 1, icon: ArrowDown },
  { label: '向右', x: 1, y: 0, icon: ArrowRight },
];
const MOVE_KEYS = new Set([
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'w',
  'a',
  's',
  'd',
]);
const distance = (a: CityPoint, b: CityPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export default function FateCityInterior({
  scene,
  onExit,
}: {
  scene: CityInteriorScene;
  onExit: () => void;
}) {
  return scene.id === 'emiya' ? (
    <FateEmiyaHouse onExit={onExit} />
  ) : (
    <SingleRoomInterior scene={scene} onExit={onExit} />
  );
}

function SingleRoomInterior({
  scene,
  onExit,
}: {
  scene: CityInteriorScene;
  onExit: () => void;
}) {
  const [view, setView] = useState({
    point: { ...INTERIOR_ART_ENTRY },
    direction: 'up' as Direction,
    frame: 0,
  });
  const [size, setSize] = useState({ width: 1000, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState(
    '点地面沿路走；方向键或 WASD 行走，走近出口按 E 返回。',
  );
  const surface = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDialogElement>(null);
  const position = useRef<CityPoint>({ ...INTERIOR_ART_ENTRY });
  const keys = useRef(new Set<string>());
  const held = useRef<CityPoint>({ x: 0, y: 0 });
  const route = useRef<CityPoint[]>([]);
  const destination = useRef<string | null>(null);
  const facing = useRef<Direction>('up');
  const walked = useRef(0);
  const exit = useRef(onExit);
  const stop = () => {
    keys.current.clear();
    held.current = { x: 0, y: 0 };
    route.current = [];
    destination.current = null;
  };
  const canExit = distance(view.point, INTERIOR_ART_ENTRY) < 48;
  const fit = Math.min(
    size.width / INTERIOR_PAINT.width,
    size.height / INTERIOR_PAINT.height,
  );
  const scale = fit * zoom;
  const foot = interiorProject(view.point, scene.floor);
  const origin = {
    x:
      scale * INTERIOR_PAINT.width <= size.width
        ? (size.width - scale * INTERIOR_PAINT.width) / 2
        : Math.max(
            size.width - scale * INTERIOR_PAINT.width,
            Math.min(0, size.width / 2 - foot.x * scale),
          ),
    y:
      scale * INTERIOR_PAINT.height <= size.height
        ? (size.height - scale * INTERIOR_PAINT.height) / 2
        : Math.max(
            size.height - scale * INTERIOR_PAINT.height,
            Math.min(0, size.height * 0.7 - foot.y * scale),
          ),
  };
  const anchor = ART_SPRITE_FRAMES[view.direction][view.frame];
  const spriteScale = interiorDepth(view.point, scene.floor) * anchor.scale;
  const walkTo = (point: CityPoint, id: string | null = null) => {
    if (load !== 'ready') return;
    stop();
    const path = interiorRoute(position.current, point, scene);
    if (!path) {
      setMessage('这里是家具或墙边，请点空出的地面。');
      return;
    }
    route.current = path;
    destination.current = id;
    setMessage(id === 'exit' ? '沿地面走回入口。' : '沿室内通路前往。');
    surface.current?.focus({ preventScroll: true });
  };
  const actions = useRef({ walkTo, stop });
  useEffect(() => {
    actions.current = { walkTo, stop };
    exit.current = onExit;
  });
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (load === 'ready') surface.current?.focus({ preventScroll: true });
  }, [load]);
  useEffect(() => {
    const clear = () => actions.current.stop();
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'tab') {
        const buttons = shell.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"]',
        );
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (key === 'escape') {
        event.preventDefault();
        clear();
        setMessage('已停止行走；点击「走回出口」可沿路返回。');
        return;
      }
      if (load !== 'ready') return;
      if (key === 'e' && distance(position.current, INTERIOR_ART_ENTRY) < 48) {
        event.preventDefault();
        clear();
        exit.current();
        return;
      }
      if (!MOVE_KEYS.has(key)) return;
      event.preventDefault();
      route.current = [];
      destination.current = null;
      keys.current.add(key);
    };
    const keyup = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      clear();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [load]);
  useEffect(() => {
    if (load !== 'ready') return;
    let raf = 0,
      last = 0,
      published = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const input = keys.current;
      let dx =
        held.current.x +
        Number(input.has('arrowright') || input.has('d')) -
        Number(input.has('arrowleft') || input.has('a'));
      let dy =
        held.current.y +
        Number(input.has('arrowdown') || input.has('s')) -
        Number(input.has('arrowup') || input.has('w'));
      const step = 185 * dt;
      let moving = false;
      if (dx || dy) {
        const norm = Math.hypot(dx, dy);
        dx /= norm;
        dy /= norm;
        const previous = position.current;
        position.current = interiorMove(
          previous,
          { x: dx * step, y: dy * step },
          scene,
        );
        moving = distance(previous, position.current) > 0.01;
        facing.current =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'right'
              : 'left'
            : dy > 0
              ? 'down'
              : 'up';
      } else if (route.current.length) {
        const next = route.current[0],
          previous = position.current;
        const gap = distance(previous, next);
        if (gap <= step) {
          position.current = { ...next };
          route.current.shift();
        } else
          position.current = {
            x: previous.x + ((next.x - previous.x) * step) / gap,
            y: previous.y + ((next.y - previous.y) * step) / gap,
          };
        moving = distance(previous, position.current) > 0.01;
        dx = next.x - previous.x;
        dy = next.y - previous.y;
        if (moving)
          facing.current =
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? 'right'
                : 'left'
              : dy > 0
                ? 'down'
                : 'up';
      }
      if (moving) walked.current += step;
      if (!route.current.length && destination.current) {
        const id = destination.current;
        destination.current = null;
        if (id === 'exit') {
          exit.current();
          return;
        }
        setMessage(scene.spots.find((s) => s.id === id)?.detail ?? '已到达。');
      }
      if (now - published > 45 || !moving) {
        published = now;
        const point = { ...position.current };
        const frame = moving ? 1 + (Math.floor(walked.current / 22) % 5) : 0;
        setView((old) =>
          distance(old.point, point) > 0.001 ||
          old.frame !== frame ||
          old.direction !== facing.current
            ? { point, direction: facing.current, frame }
            : old,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, load]);

  return (
    <dialog
      ref={shell}
      open
      aria-modal="true"
      aria-label={`${scene.name} · ${scene.room}`}
      className={styles.shell}
      data-interior-id={scene.id}
    >
      <header className={styles.header}>
        <div>
          <h2>
            {scene.name} <span>· {scene.room}</span>
          </h2>
          <p>{scene.basis}</p>
        </div>
        <button
          type="button"
          onClick={() => walkTo(INTERIOR_ART_ENTRY, 'exit')}
          disabled={load !== 'ready'}
        >
          <DoorOpen size={17} />
          走回出口
        </button>
      </header>
      <div
        ref={surface}
        className={styles.surface}
        role="application"
        tabIndex={0}
        aria-label={`${scene.name}室内行走：点击地面、方向键或 WASD，出口按 E`}
        data-interior-load={load}
        data-interior-x={view.point.x.toFixed(3)}
        data-interior-y={view.point.y.toFixed(3)}
        data-interior-zoom={zoom}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const point = interiorUnproject(
            {
              x: (event.clientX - rect.left - origin.x) / scale,
              y: (event.clientY - rect.top - origin.y) / scale,
            },
            scene.floor,
          );
          if (point) walkTo(point);
          else setMessage('请点房间的地面，门窗与墙面不能直接穿过。');
        }}
      >
        <div
          className={styles.world}
          style={{
            width: INTERIOR_PAINT.width,
            height: INTERIOR_PAINT.height,
            transform: `translate(${origin.x}px,${origin.y}px) scale(${scale})`,
          }}
          data-interior-origin-x={origin.x}
          data-interior-origin-y={origin.y}
          data-interior-scale={scale}
        >
          <Image
            key={attempt}
            src={scene.painting}
            width={1600}
            height={900}
            alt={`${scene.name}的${scene.room}：${scene.description}`}
            unoptimized
            loading="eager"
            draggable={false}
            className={styles.painting}
            onLoad={() => setLoad('ready')}
            onError={() => setLoad('error')}
          />
          {load === 'ready' && (
            <>
              <div
                className={styles.actor}
                style={{
                  left: foot.x,
                  top: foot.y,
                  zIndex: Math.round(view.point.y) + 10,
                }}
                aria-label="伊莉雅的室内站位"
              >
                <span
                  className={styles.shadow}
                  style={{
                    transform: `scale(${interiorDepth(view.point, scene.floor)})`,
                  }}
                />
                <span
                  className={styles.sprite}
                  style={{
                    width: 256 * spriteScale,
                    height: 256 * spriteScale,
                    backgroundImage: `url(${ILLYA_ART_SPRITE})`,
                    backgroundPosition: `${(view.frame / 5) * 100}% ${(['down', 'left', 'right', 'up'].indexOf(view.direction) / 3) * 100}%`,
                    transform: `translate(${-anchor.x * spriteScale}px,${-anchor.y * spriteScale}px)`,
                  }}
                />
              </div>
              {scene.furniture
                .filter((f) => f.silhouette)
                .map((f) => (
                  <div
                    key={f.id}
                    className={styles.occluder}
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url(${scene.painting})`,
                      zIndex:
                        Math.round(f.footprint.y + f.footprint.height) + 10,
                      clipPath: `polygon(${f.silhouette!.map((p) => `${p.x / 16}% ${p.y / 9}%`).join(',')})`,
                    }}
                  />
                ))}
              <button
                type="button"
                className={styles.exit}
                style={{
                  left: interiorProject(INTERIOR_ART_ENTRY, scene.floor).x,
                  top: interiorProject(INTERIOR_ART_ENTRY, scene.floor).y,
                  transform: `translate(-50%,-35%) scale(${1 / scale})`,
                }}
                onClick={() => walkTo(INTERIOR_ART_ENTRY, 'exit')}
              >
                <DoorOpen size={19} />
                出口
              </button>
            </>
          )}
        </div>
        {load !== 'ready' && (
          <output className={styles.loading}>
            {load === 'loading' ? (
              '正在打开室内原画…'
            ) : (
              <>
                <span>室内图片暂未载入。</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoad('loading');
                    setAttempt((a) => a + 1);
                  }}
                >
                  重新载入
                </button>
                <button type="button" onClick={onExit}>
                  返回门口
                </button>
              </>
            )}
          </output>
        )}
        <div className={styles.zoom}>
          <button
            type="button"
            aria-label="缩小室内视角"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          >
            <Minus size={17} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="显示完整室内"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="放大室内视角"
            disabled={zoom >= 2.5}
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
          >
            <Plus size={17} />
          </button>
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.spots}>
          {scene.spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              disabled={load !== 'ready'}
              onClick={() => walkTo(spot.point, spot.id)}
            >
              {spot.label}
            </button>
          ))}
          <button
            type="button"
            disabled={!canExit || load !== 'ready'}
            onClick={() => {
              stop();
              onExit();
            }}
          >
            从门口出去
          </button>
          <button
            type="button"
            onClick={() => {
              stop();
              setMessage('已停止行走。');
            }}
          >
            停下
          </button>
        </div>
        <div className={styles.bottom}>
          <output aria-live="polite">{message}</output>
          <div className={styles.dpad} aria-label="室内方向控制">
            {INPUTS.map(({ label, x, y, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={`室内${label}`}
                disabled={load !== 'ready'}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  route.current = [];
                  destination.current = null;
                  held.current = { x, y };
                }}
                onPointerUp={() => {
                  held.current = { x: 0, y: 0 };
                }}
                onPointerCancel={() => {
                  held.current = { x: 0, y: 0 };
                }}
                onLostPointerCapture={() => {
                  held.current = { x: 0, y: 0 };
                }}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    route.current = [];
                    destination.current = null;
                    held.current = { x, y };
                  }
                }}
                onKeyUp={() => {
                  held.current = { x: 0, y: 0 };
                }}
                onBlur={() => {
                  held.current = { x: 0, y: 0 };
                }}
              >
                <Icon size={19} />
              </button>
            ))}
          </div>
        </div>
      </footer>
    </dialog>
  );
}
