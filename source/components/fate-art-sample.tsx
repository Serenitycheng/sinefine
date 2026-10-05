'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- A focusable game surface receives movement keys. */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Coffee,
  Expand,
  Eye,
  EyeOff,
  Focus,
  Footprints,
  House,
  Box,
  Minus,
  Plus,
  Square,
  X,
} from 'lucide-react';
import {
  ART_SAMPLE,
  SAMPLE_PLACES,
  constrainSampleCamera,
  moveInSample,
  sampleCamera,
  sampleDirection,
  sampleDistance,
  sampleFrame,
  sampleRoute,
  sampleScreenToWorld,
  sampleZoom,
  type SampleCamera,
  type SampleDirection,
  type SamplePlace,
  type SamplePoint,
} from '@/lib/fate-art-sample';
import { ART_SPRITE_FRAMES } from '@/lib/fate-art-sprite';
import styles from './fate-art-sample.module.css';

type View = {
  point: SamplePoint;
  camera: SampleCamera;
  direction: SampleDirection;
  frame: number;
  moving: boolean;
};
type Drag = {
  id: number;
  start: SamplePoint;
  camera: SampleCamera;
  moved: boolean;
};
const ARROWS = [
  { key: 'ArrowUp', label: '向上行走', Icon: ArrowUp },
  { key: 'ArrowLeft', label: '向左行走', Icon: ArrowLeft },
  { key: 'ArrowDown', label: '向下行走', Icon: ArrowDown },
  { key: 'ArrowRight', label: '向右行走', Icon: ArrowRight },
] as const;

function directionKeys(keys: Set<string>) {
  const x =
    Number(keys.has('d') || keys.has('ArrowRight')) -
    Number(keys.has('a') || keys.has('ArrowLeft'));
  const y =
    Number(keys.has('s') || keys.has('ArrowDown')) -
    Number(keys.has('w') || keys.has('ArrowUp'));
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

export default function FateArtSample() {
  const surface = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dimensions = useRef({ width: 1, height: 1 });
  const point = useRef<SamplePoint>({ ...ART_SAMPLE.start });
  const camera = useRef<SampleCamera>({ x: 0, y: 0, scale: 1 });
  const panCamera = useRef<SampleCamera | null>(null);
  const cameraMode = useRef<'follow' | 'pan'>('follow');
  const keys = useRef(new Set<string>());
  const keyOrigins = useRef(new Map<string, SamplePoint>());
  const pendingTap = useRef<SamplePoint>({ x: 0, y: 0 });
  const route = useRef<SamplePoint[]>([]);
  const routePlace = useRef<SamplePlace | null>(null);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, SamplePoint>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const zoomRef = useRef(1.05);
  const direction = useRef<SampleDirection>('down');
  const distance = useRef(0);
  const modal = useRef<SamplePlace | null>(null);
  const [zoom, setZoom] = useState(1.05);
  const [paintingReady, setPaintingReady] = useState(false);
  const [spriteReady, setSpriteReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [markers, setMarkers] = useState(true);
  const [place, setPlace] = useState<SamplePlace | null>(null);
  const [target, setTarget] = useState<SamplePoint | null>(null);
  const [notice, setNotice] = useState('沿街走走，看看住宅与咖啡店。');
  const [view, setView] = useState<View>({
    point: { ...ART_SAMPLE.start },
    camera: { x: 0, y: 0, scale: 1 },
    direction: 'down',
    frame: 0,
    moving: false,
  });
  const ready = paintingReady && spriteReady && !failed;
  const nearest = SAMPLE_PLACES.find(
    (p) => sampleDistance(p.point, view.point) < 45,
  );

  const stop = useCallback(() => {
    keys.current.clear();
    keyOrigins.current.clear();
    pendingTap.current = { x: 0, y: 0 };
    route.current = [];
    routePlace.current = null;
    setTarget(null);
  }, []);

  const pressWalkKey = useCallback((key: string) => {
    if (!keys.current.has(key))
      keyOrigins.current.set(key, { ...point.current });
    keys.current.add(key);
  }, []);

  const releaseWalkKey = useCallback((key: string) => {
    const origin = keyOrigins.current.get(key);
    if (origin && sampleDistance(origin, point.current) < 0.001) {
      const tap = directionKeys(new Set([key]));
      pendingTap.current = {
        x: pendingTap.current.x + tap.x,
        y: pendingTap.current.y + tap.y,
      };
    }
    keys.current.delete(key);
    keyOrigins.current.delete(key);
  }, []);

  const focusPerson = useCallback(() => {
    cameraMode.current = 'follow';
    panCamera.current = null;
    surface.current?.focus({ preventScroll: true });
  }, []);

  const closePlace = useCallback(() => {
    modal.current = null;
    setPlace(null);
    surface.current?.focus({ preventScroll: true });
  }, []);

  const inspect = useCallback(
    (p: SamplePlace) => {
      stop();
      modal.current = p;
      setPlace(p);
    },
    [stop],
  );

  useEffect(() => {
    if (place) closeButton.current?.focus({ preventScroll: true });
  }, [place]);

  const walkTo = useCallback(
    (target: SamplePoint, destination: SamplePlace | null = null) => {
      const path = sampleRoute(point.current, target);
      if (!path) {
        setNotice('这里是围墙或庭院，请点击路面或门前步道。');
        return;
      }
      stop();
      route.current = path;
      routePlace.current = destination;
      setTarget(target);
      setNotice(
        destination
          ? `正走向${destination.name}，可随时停下或改向。`
          : '正走向这里，可随时停下或改向。',
      );
      focusPerson();
    },
    [focusPerson, stop],
  );

  const changeZoom = useCallback((value: number, at?: SamplePoint) => {
    const next = sampleZoom(value);
    const size = dimensions.current;
    const anchor = at ?? { x: size.width / 2, y: size.height / 2 };
    const world = sampleScreenToWorld(anchor, camera.current);
    const scale = sampleCamera(
      point.current,
      size.width,
      size.height,
      next,
    ).scale;
    zoomRef.current = next;
    setZoom(next);
    camera.current = constrainSampleCamera(
      { x: world.x - anchor.x / scale, y: world.y - anchor.y / scale, scale },
      size.width,
      size.height,
    );
    cameraMode.current = 'pan';
    panCamera.current = camera.current;
    setView((current) => ({ ...current, camera: camera.current }));
  }, []);

  const showWhole = () => {
    const { width, height } = dimensions.current;
    const fit = Math.min(width / ART_SAMPLE.width, height / ART_SAMPLE.height);
    const cover = Math.max(
      width / ART_SAMPLE.width,
      height / ART_SAMPLE.height,
    );
    // Full composition can be smaller than the ordinary zoom-out limit on a phone.
    const next = fit / cover;
    zoomRef.current = next;
    setZoom(next);
    camera.current = {
      x: (ART_SAMPLE.width - width / fit) / 2,
      y: (ART_SAMPLE.height - height / fit) / 2,
      scale: fit,
    };
    cameraMode.current = 'pan';
    panCamera.current = camera.current;
    setView((current) => ({ ...current, camera: camera.current }));
  };

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      dimensions.current = { width, height };
      camera.current = sampleCamera(
        point.current,
        width,
        height,
        zoomRef.current,
      );
      cameraMode.current = 'follow';
      panCamera.current = null;
      setView((current) => ({ ...current, camera: camera.current }));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready) return;
    let frameId = 0;
    let last = 0;
    let wasMoving = false;
    const draw = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      let input = directionKeys(keys.current);
      let tap = false;
      if (
        !input.x &&
        !input.y &&
        (pendingTap.current.x || pendingTap.current.y)
      ) {
        const length = Math.hypot(pendingTap.current.x, pendingTap.current.y);
        input = {
          x: pendingTap.current.x / length,
          y: pendingTap.current.y / length,
        };
        tap = true;
      }
      pendingTap.current = { x: 0, y: 0 };
      let delta = { x: 0, y: 0 };
      if (!modal.current && (input.x || input.y)) {
        if (route.current.length) {
          setTarget(null);
          setNotice('已改为手动行走。');
        }
        route.current = [];
        routePlace.current = null;
        cameraMode.current = 'follow';
        delta = {
          x: input.x * (tap ? 2 : ART_SAMPLE.walkSpeed * dt),
          y: input.y * (tap ? 2 : ART_SAMPLE.walkSpeed * dt),
        };
      } else if (!modal.current && route.current.length) {
        const target = route.current[0];
        const remaining = sampleDistance(point.current, target);
        const travel = Math.min(remaining, ART_SAMPLE.walkSpeed * dt);
        if (remaining > 0)
          delta = {
            x: ((target.x - point.current.x) / remaining) * travel,
            y: ((target.y - point.current.y) / remaining) * travel,
          };
        if (remaining <= travel + 0.01) {
          route.current.shift();
          if (!route.current.length) {
            setTarget(null);
            const destination = routePlace.current;
            setNotice(
              destination
                ? `已到${destination.name}，可按 E 看看这里。`
                : '已走到这里。',
            );
            routePlace.current = null;
          }
        }
      }
      const next = moveInSample(point.current, delta);
      const travelled = sampleDistance(point.current, next);
      const moving = travelled > 0.001;
      if (moving) {
        direction.current = sampleDirection({
          x: next.x - point.current.x,
          y: next.y - point.current.y,
        });
        distance.current += travelled;
        point.current = next;
      }
      const { width, height } = dimensions.current;
      const targetCamera =
        cameraMode.current === 'follow'
          ? sampleCamera(point.current, width, height, zoomRef.current)
          : (panCamera.current ?? camera.current);
      const blend = 1 - Math.exp(-dt * 9);
      const changed =
        sampleDistance(camera.current, targetCamera) > 0.01 ||
        Math.abs(camera.current.scale - targetCamera.scale) > 0.00001;
      if (changed)
        camera.current = {
          x: camera.current.x + (targetCamera.x - camera.current.x) * blend,
          y: camera.current.y + (targetCamera.y - camera.current.y) * blend,
          scale:
            camera.current.scale +
            (targetCamera.scale - camera.current.scale) * blend,
        };
      if (moving || changed || wasMoving !== moving)
        setView({
          point: point.current,
          camera: camera.current,
          direction: direction.current,
          frame: sampleFrame(distance.current, moving),
          moving,
        });
      wasMoving = moving;
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [ready]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, [contenteditable="true"]')
      )
        return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (modal.current && key === 'Tab') {
        const buttons = closeButton.current
          ?.closest('dialog')
          ?.querySelectorAll<HTMLButtonElement>('button');
        if (buttons?.length) {
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (key === 'Escape') {
        if (modal.current) closePlace();
        else {
          stop();
          setNotice('已停下，可以再选一个方向。');
        }
        return;
      }
      if (modal.current || !ready) return;
      if (
        [
          'w',
          'a',
          's',
          'd',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(key)
      ) {
        event.preventDefault();
        pressWalkKey(key);
      } else if (key === 'e' && !event.repeat) {
        const p = SAMPLE_PLACES.find(
          (candidate) => sampleDistance(candidate.point, point.current) < 45,
        );
        if (p) {
          event.preventDefault();
          inspect(p);
        } else setNotice('走近住宅木门或咖啡店门前，就能查看这里。');
      }
    };
    const up = (event: KeyboardEvent) =>
      releaseWalkKey(
        event.key.length === 1 ? event.key.toLowerCase() : event.key,
      );
    const pause = () => {
      stop();
      pointers.current.clear();
      drag.current = null;
      pinch.current = null;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', pause);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', pause);
    };
  }, [closePlace, inspect, pressWalkKey, ready, releaseWalkKey, stop]);

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (
        !ready ||
        modal.current ||
        (event.target instanceof Element && event.target.closest('button'))
      )
        return;
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      changeZoom(
        zoomRef.current *
          Math.exp(-Math.max(-160, Math.min(160, event.deltaY)) * 0.0015),
        { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [changeZoom, ready]);

  const localPoint = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !ready ||
      modal.current ||
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button'))
    )
      return;
    const at = localPoint(event);
    pointers.current.set(event.pointerId, at);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: sampleDistance(a, b), zoom: zoomRef.current };
      drag.current = null;
      stop();
    } else if (pointers.current.size === 1) {
      drag.current = {
        id: event.pointerId,
        start: at,
        camera: camera.current,
        moved: false,
      };
    }
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const at = localPoint(event);
    pointers.current.set(event.pointerId, at);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = sampleDistance(a, b);
      if (pinch.current.distance > 0)
        changeZoom((pinch.current.zoom * distance) / pinch.current.distance, {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        });
      return;
    }
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.moved && sampleDistance(current.start, at) < 6) return;
    if (!current.moved) stop();
    current.moved = true;
    cameraMode.current = 'pan';
    const { width, height } = dimensions.current;
    camera.current = constrainSampleCamera(
      {
        ...current.camera,
        x: current.camera.x - (at.x - current.start.x) / current.camera.scale,
        y: current.camera.y - (at.y - current.start.y) / current.camera.scale,
      },
      width,
      height,
    );
    panCamera.current = camera.current;
    setView((v) => ({ ...v, camera: camera.current }));
  };
  const pointerEnd = (
    event: PointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const current = drag.current;
    const wasPinch = Boolean(pinch.current);
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (
      !cancelled &&
      !wasPinch &&
      current?.id === event.pointerId &&
      !current.moved
    )
      walkTo(sampleScreenToWorld(localPoint(event), camera.current));
    drag.current = null;
    if (!pointers.current.size) pinch.current = null;
  };

  const anchor = ART_SPRITE_FRAMES[view.direction][view.frame];
  const spriteScale = 0.48 * anchor.scale;
  const row = ['down', 'left', 'right', 'up'].indexOf(view.direction);
  const spriteStyle: CSSProperties = {
    width: 256 * spriteScale,
    height: 256 * spriteScale,
    backgroundImage: `url(${ART_SAMPLE.sprite})`,
    backgroundPosition: `${(view.frame / 5) * 100}% ${(row / 3) * 100}%`,
    transform: `translate(${-anchor.x * spriteScale}px, ${-anchor.y * spriteScale}px)`,
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header} inert={Boolean(place)}>
        <div className={styles.identity}>
          <span className={styles.brand}>SINE FINE</span>
          <h1>街道美术小样</h1>
        </div>
        <p className={styles.sampleNote}>独立预览 · 不改变日常进度</p>
        <Link href="/fate/art-sample-3d" className={styles.comparison}>
          <Box size={17} />
          <span>3D 对照</span>
        </Link>
        <Link href="/fate/street" className={styles.return}>
          <ArrowLeft size={17} />
          <span>返回游戏</span>
        </Link>
      </header>
      <div
        className={styles.viewport}
        ref={surface}
        role="application"
        tabIndex={0}
        aria-label="住宅街美术小样，WASD 或方向键行走，点击路面前往，拖动查看，E 查看门前"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => pointerEnd(event)}
        onPointerCancel={(event) => pointerEnd(event, true)}
      >
        <div
          className={styles.world}
          style={{
            width: ART_SAMPLE.width,
            height: ART_SAMPLE.height,
            transform: `scale(${view.camera.scale}) translate(${-view.camera.x}px, ${-view.camera.y}px)`,
            visibility: ready ? 'visible' : 'hidden',
          }}
        >
          <Image
            className={styles.painting}
            src={ART_SAMPLE.background}
            width={ART_SAMPLE.width}
            height={ART_SAMPLE.height}
            unoptimized
            loading="eager"
            alt="蓝瓦日式住宅与街角咖啡店连在同一条树影街道上"
            draggable={false}
            decoding="async"
            onLoad={() => setPaintingReady(true)}
            onError={() => setFailed(true)}
          />
          <Image
            hidden
            src={ART_SAMPLE.sprite}
            width={1536}
            height={1024}
            unoptimized
            loading="eager"
            alt=""
            onLoad={() => setSpriteReady(true)}
            onError={() => setFailed(true)}
          />
          {markers &&
            SAMPLE_PLACES.filter(
              (p) => sampleDistance(p.point, view.point) > 45,
            ).map((p) => (
              <button
                type="button"
                className={styles.placeMarker}
                key={p.id}
                style={{ left: p.point.x, top: p.point.y }}
                onClick={() => inspect(p)}
                aria-label={`查看${p.name}`}
              >
                <span className={styles.placeDot} />
                <span className={styles.placeName}>
                  {p.id === 'home' ? '住宅' : '咖啡店'}
                </span>
              </button>
            ))}
          {target && (
            <span
              className={styles.target}
              style={{
                left: target.x,
                top: target.y,
              }}
            />
          )}
          <div
            className={styles.character}
            style={{ left: view.point.x, top: view.point.y }}
            data-x={view.point.x.toFixed(1)}
            data-y={view.point.y.toFixed(1)}
            data-direction={view.direction}
            data-frame={view.frame}
            aria-label={`伊莉雅${view.moving ? '正在行走' : '已停下'}`}
          >
            <span className={styles.shadow} />
            <span className={styles.sprite} style={spriteStyle} />
          </div>
        </div>
        {!ready && (
          <output className={styles.loading}>
            {failed ? '画面未能载入，请刷新重试。' : '正在铺开这段街道…'}
          </output>
        )}
        <div className={styles.sceneTitle}>
          <span className={styles.sunDot} />
          <span>住宅街</span>
          <span className={styles.season}>初夏的午后</span>
        </div>
        <div
          className={styles.cameraTools}
          aria-label="画面缩放与定位"
          inert={Boolean(place)}
        >
          <button
            type="button"
            aria-label="缩小画面"
            onClick={() => changeZoom(zoomRef.current / 1.2)}
            disabled={!ready}
          >
            <Minus size={18} />
          </button>
          <span className={styles.zoom}>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="放大画面"
            onClick={() => changeZoom(zoomRef.current * 1.2)}
            disabled={!ready}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            aria-label="查看完整画面"
            title="完整画面"
            onClick={showWhole}
            disabled={!ready}
          >
            <Expand size={18} />
          </button>
          <button
            type="button"
            aria-label="定位人物，保留缩放"
            title="定位人物"
            onClick={focusPerson}
            disabled={!ready}
          >
            <Focus size={18} />
          </button>
          <button
            type="button"
            aria-label={markers ? '隐藏地点标记' : '显示地点标记'}
            title="地点标记"
            aria-pressed={markers}
            onClick={() => setMarkers((v) => !v)}
            disabled={!ready}
          >
            {markers ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div className={styles.personStatus}>
          <Footprints size={17} />
          <span>伊莉雅</span>
          <span className={styles.personAction}>
            {view.moving ? '沿街慢走' : '停在树影里'}
          </span>
        </div>
        {nearest && !place && (
          <button
            type="button"
            className={styles.nearby}
            onClick={() => inspect(nearest)}
          >
            {nearest.id === 'home' ? <House size={18} /> : <Coffee size={18} />}
            <span>看看{nearest.id === 'home' ? '住宅门前' : '咖啡店门前'}</span>
            <kbd>E</kbd>
          </button>
        )}
        <div className={styles.directionPad} aria-label="触控行走">
          {ARROWS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              disabled={!ready || Boolean(place)}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                focusPerson();
                pressWalkKey(key);
              }}
              onPointerUp={() => releaseWalkKey(key)}
              onPointerCancel={() => {
                keys.current.delete(key);
                keyOrigins.current.delete(key);
              }}
              onLostPointerCapture={() => releaseWalkKey(key)}
            >
              <Icon size={19} />
            </button>
          ))}
        </div>
        {place && (
          <dialog
            open
            className={styles.placeCard}
            aria-modal="true"
            aria-labelledby="art-place-title"
          >
            <button
              type="button"
              ref={closeButton}
              className={styles.close}
              aria-label="关闭地点预览"
              onClick={closePlace}
            >
              <X size={20} />
            </button>
            <span className={styles.cardEyebrow}>门前一角</span>
            <h2 id="art-place-title">{place.name}</h2>
            <p>{place.description}</p>
            <p className={styles.indoorNote}>
              本次小样展示街道与门前，室内另行打磨。
            </p>
            <button
              className={styles.goButton}
              type="button"
              onClick={() => {
                const p = place;
                const arrived = sampleDistance(p.point, point.current) < 4;
                closePlace();
                if (!arrived) walkTo(p.point, p);
              }}
            >
              <Footprints size={17} />
              {sampleDistance(place.point, view.point) < 4
                ? '再沿街走走'
                : '走到门前'}
            </button>
          </dialog>
        )}
      </div>
      <footer className={styles.footer} inert={Boolean(place)}>
        <div className={styles.destinations} aria-label="小样地点">
          <button
            type="button"
            disabled={!ready}
            onClick={() => walkTo(SAMPLE_PLACES[0].point, SAMPLE_PLACES[0])}
          >
            <House size={16} />
            住宅门前
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => walkTo(SAMPLE_PLACES[1].point, SAMPLE_PLACES[1])}
          >
            <Coffee size={16} />
            咖啡店
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              stop();
              setNotice('已停下，可以再选一个方向。');
            }}
            aria-label="停止行走"
          >
            <Square size={14} />
          </button>
        </div>
        <div className={styles.message}>
          <output aria-live="polite">{notice}</output>
          <p className={styles.instructions}>
            WASD / 方向键行走 · 点击路面前往 · 拖动画面 · E 查看门前
          </p>
        </div>
      </footer>
    </main>
  );
}
