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
import { houseCamera, houseZoom } from '@/lib/fate-tohsaka-house';
import { HOUSE_PREVIEWS } from '@/lib/fate-preview-houses';
import {
  nearestPreviewDoor,
  mirrorPreviewSprite,
  type PreviewHouse,
  type PreviewDoor,
  type PreviewAction,
} from '@/lib/fate-preview-house';
import type { ActorId } from '@/lib/street';

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
  ) : scene.id === 'tohsaka' ||
    scene.id === 'matou' ||
    scene.id === 'einzbern' ||
    scene.id === 'waver' ||
    scene.id === 'temple' ||
    scene.id === 'church' ? (
    <HouseInterior
      key={scene.id}
      plan={HOUSE_PREVIEWS[scene.id]}
      onExit={onExit}
    />
  ) : (
    <SingleRoomInterior scene={scene} onExit={onExit} />
  );
}

type HouseSession = {
  plan: PreviewHouse;
  room: string;
  entry: CityPoint;
  actor: ActorId;
  zoom: number;
  onZoom: (zoom: number) => void;
  onActor: (actor: ActorId) => void;
  onDoor: (door: PreviewDoor) => void;
};
function HouseInterior({
  plan,
  onExit,
}: {
  plan: PreviewHouse;
  onExit: () => void;
}) {
  const [location, setLocation] = useState({
    room: 'hall',
    entry: { x: 500, y: 560 },
    visit: 0,
  });
  const [actor, setActor] = useState<ActorId>(plan.cast[0].id);
  const [zoom, setZoom] = useState(1.5);
  const session: HouseSession = {
    plan,
    ...location,
    actor,
    zoom,
    onZoom: setZoom,
    onActor: setActor,
    onDoor: (door) => {
      if (!door.to) {
        onExit();
        return;
      }
      setLocation((old) => ({
        room: door.to!,
        entry: { ...door.arrival },
        visit: old.visit + 1,
      }));
    },
  };
  return (
    <SingleRoomInterior
      key={location.visit}
      scene={plan.rooms[location.room].scene}
      onExit={onExit}
      house={session}
    />
  );
}

function SingleRoomInterior({
  scene,
  onExit,
  house,
}: {
  scene: CityInteriorScene;
  onExit: () => void;
  house?: HouseSession;
}) {
  const entry = house?.entry ?? INTERIOR_ART_ENTRY;
  const [view, setView] = useState({
    point: { ...entry },
    direction: 'up' as Direction,
    frame: 0,
  });
  const [size, setSize] = useState({ width: 1000, height: 600 });
  const [layoutReady, setLayoutReady] = useState(false);
  const [localZoom, setLocalZoom] = useState(1);
  const zoom = house ? houseZoom(house.zoom, size) : localZoom;
  const setZoom = (value: number | ((value: number) => number)) => {
    const next = typeof value === 'function' ? value(zoom) : value;
    if (house) house.onZoom(next);
    else setLocalZoom(next);
  };
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const modelActor = house?.actor;
  const modelPlan = house?.plan;
  const modelKey = modelActor ? `${modelActor}:${attempt}` : 'legacy';
  const [modelStatus, setModelStatus] = useState<{
    key: string;
    status: 'ready' | 'error';
  }>({ key: 'legacy', status: 'ready' });
  const modelLoad =
    modelStatus.key === modelKey ? modelStatus.status : 'loading';
  const [pose, setPose] = useState<PreviewAction | null>(null);
  const ready = layoutReady && load === 'ready' && modelLoad === 'ready';
  const [message, setMessage] = useState(
    '点地面沿路走；方向键或 WASD 行走，走近出口按 E 返回。',
  );
  const surface = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDialogElement>(null);
  const position = useRef<CityPoint>({ ...entry });
  const keys = useRef(new Set<string>());
  const held = useRef<CityPoint>({ x: 0, y: 0 });
  const route = useRef<CityPoint[]>([]);
  const destination = useRef<string | null>(null);
  const facing = useRef<Direction>('up');
  const walked = useRef(0);
  const fingers = useRef(new Map<number, CityPoint>());
  const pinch = useRef<{ gap: number; zoom: number } | null>(null);
  const cameraGesture = useRef(false);
  const exit = useRef(onExit);
  const session = useRef(house);
  const camera = useRef({ zoom, size });
  const currentPose = useRef<PreviewAction | null>(null);
  const stop = () => {
    keys.current.clear();
    held.current = { x: 0, y: 0 };
    route.current = [];
    destination.current = null;
    fingers.current.clear();
    pinch.current = null;
    currentPose.current = null;
    setPose(null);
  };
  const doors = house
    ? house.plan.rooms[house.room].doors
    : [
        {
          id: 'exit',
          label: '出口',
          point: INTERIOR_ART_ENTRY,
          to: null,
          arrival: INTERIOR_ART_ENTRY,
        },
      ];
  const returnDoor = house
    ? doors.find((d) => d.id === (house.room === 'hall' ? 'street' : 'hall'))!
    : doors[0];
  const canExit = distance(view.point, returnDoor.point) < 48;
  const fit = Math.min(
    size.width / INTERIOR_PAINT.width,
    size.height / INTERIOR_PAINT.height,
  );
  const scale = fit * zoom;
  const renderedPoint = pose?.contact ?? view.point;
  const foot = interiorProject(renderedPoint, scene.floor);
  const depth = interiorDepth(renderedPoint, scene.floor);
  foot.y -= (pose?.elevation ?? 0) * depth;
  const legacyAnchor =
    ART_SPRITE_FRAMES[view.direction][Math.min(5, view.frame)];
  const originalModel = house
    ? house.plan.sprite(house.actor, view.direction, view.frame, pose?.pose)
    : null;
  const model =
    originalModel && pose?.mirror
      ? mirrorPreviewSprite(originalModel)
      : originalModel;
  const anchor = model
    ? { x: model.anchorX, y: model.anchorY, scale: model.scale }
    : legacyAnchor;
  const spriteScale = depth * anchor.scale * (pose?.scale ?? 1);
  const cameraTarget = {
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
  const origin =
    house && model
      ? houseCamera(cameraTarget, scale, size, {
          x: foot.x + (model.bounds.x - anchor.x) * spriteScale,
          y: foot.y + (model.bounds.y - anchor.y) * spriteScale,
          width: model.bounds.width * spriteScale,
          height: model.bounds.height * spriteScale,
        })
      : cameraTarget;
  const walkTo = (point: CityPoint, id: string | null = null) => {
    if (!ready) return;
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
    session.current = house;
    camera.current = { zoom, size };
  });
  const isHouse = Boolean(house);
  useEffect(() => {
    const element = surface.current;
    if (!element || !isHouse) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY === 0) return;
      const current = camera.current;
      session.current?.onZoom(
        houseZoom(
          current.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12),
          current.size,
        ),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [isHouse]);
  useEffect(() => {
    if (!modelActor || !modelPlan) return;
    let cancelled = false;
    const files = [
      ...new Set([
        modelPlan.sprite(modelActor, 'down', 0).file,
        modelPlan.sprite(modelActor, 'left', 1).file,
        modelPlan.sprite(modelActor, 'down', 0, 'sit').file,
        modelPlan.sprite(modelActor, 'down', 0, 'read').file,
      ]),
    ];
    Promise.all(
      files.map(
        (file) =>
          new Promise<void>((resolve, reject) => {
            const image = new window.Image();
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Model image unavailable'));
            image.src = file;
          }),
      ),
    ).then(
      () => {
        if (!cancelled) setModelStatus({ key: modelKey, status: 'ready' });
      },
      () => {
        if (!cancelled) setModelStatus({ key: modelKey, status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [modelActor, modelKey, modelPlan]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
      setLayoutReady(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (ready) surface.current?.focus({ preventScroll: true });
  }, [ready]);
  useEffect(() => {
    const clear = () => actions.current.stop();
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'tab') {
        const buttons = shell.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select:not(:disabled), [tabindex="0"]',
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
      if (
        (event.target as HTMLElement | null)?.closest('select,input,textarea')
      )
        return;
      if (key === 'escape') {
        event.preventDefault();
        clear();
        setMessage('已停止行走；点击「走回出口」可沿路返回。');
        return;
      }
      if (!ready) return;
      const near = session.current
        ? nearestPreviewDoor(
            position.current,
            session.current.plan.rooms[session.current.room],
          )
        : null;
      if (
        key === 'e' &&
        (near ||
          (!session.current &&
            distance(position.current, INTERIOR_ART_ENTRY) < 48))
      ) {
        event.preventDefault();
        clear();
        if (near) session.current!.onDoor(near);
        else exit.current();
        return;
      }
      if (key === 'e' && session.current) {
        const spot = scene.spots.find(
          (s) => distance(s.point, position.current) < 48,
        );
        if (spot) {
          event.preventDefault();
          actions.current.walkTo(spot.point, spot.id);
        }
        return;
      }
      if (!MOVE_KEYS.has(key)) return;
      event.preventDefault();
      route.current = [];
      destination.current = null;
      currentPose.current = null;
      setPose(null);
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
  }, [ready, scene]);
  useEffect(() => {
    if (!ready) return;
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
      const tickStart = position.current;
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
      if (moving) walked.current += distance(tickStart, position.current);
      if (!route.current.length && destination.current) {
        const id = destination.current;
        destination.current = null;
        if (id === 'exit') {
          exit.current();
          return;
        }
        if (id.startsWith('door:') && session.current) {
          const door = session.current.plan.rooms[
            session.current.room
          ].doors.find((d) => d.id === id.slice(5));
          if (door && distance(position.current, door.point) < 48) {
            actions.current.stop();
            session.current.onDoor(door);
            return;
          }
        }
        const action =
          session.current &&
          session.current.plan.rooms[session.current.room].actions.find(
            (a) => a.id === id,
          );
        if (action) {
          currentPose.current = action;
          setPose(action);
        }
        setMessage(scene.spots.find((s) => s.id === id)?.detail ?? '已到达。');
      }
      if (now - published > (session.current ? 16 : 45) || !moving) {
        published = now;
        const point = { ...position.current };
        const frame = moving
          ? 1 + (Math.floor(walked.current / 22) % (session.current ? 6 : 5))
          : 0;
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
  }, [scene, ready]);

  return (
    <dialog
      ref={shell}
      open
      aria-modal="true"
      aria-label={`${scene.name} · ${scene.room}`}
      className={styles.shell}
      data-interior-id={scene.id}
      data-house-room={house?.room}
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
          onClick={() =>
            walkTo(returnDoor.point, house ? `door:${returnDoor.id}` : 'exit')
          }
          disabled={!ready}
        >
          <DoorOpen size={17} />
          {house && house.room !== 'hall' ? '走回玄关' : '走回出口'}
        </button>
      </header>
      <div
        ref={surface}
        className={styles.surface}
        style={house ? { touchAction: 'none' } : undefined}
        role="application"
        tabIndex={0}
        aria-label={`${scene.name}室内行走：点击地面、方向键或 WASD，出口按 E`}
        data-interior-load={
          load === 'error' || modelLoad === 'error'
            ? 'error'
            : ready
              ? 'ready'
              : 'loading'
        }
        data-interior-x={view.point.x.toFixed(3)}
        data-interior-y={view.point.y.toFixed(3)}
        data-interior-zoom={zoom}
        data-interior-actor={house?.actor}
        data-interior-frame={view.frame}
        data-interior-direction={view.direction}
        data-interior-pose={pose?.pose ?? 'stand'}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (!house) return;
          if (event.pointerType !== 'touch') {
            cameraGesture.current = false;
            return;
          }
          if (!fingers.current.size) cameraGesture.current = false;
          fingers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (fingers.current.size === 2) {
            const [a, b] = [...fingers.current.values()];
            pinch.current = { gap: distance(a, b), zoom };
            cameraGesture.current = true;
            for (const id of fingers.current.keys())
              event.currentTarget.setPointerCapture(id);
            keys.current.clear();
            held.current = { x: 0, y: 0 };
            route.current = [];
            destination.current = null;
          }
        }}
        onPointerMove={(event) => {
          if (!fingers.current.has(event.pointerId)) return;
          fingers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (pinch.current && fingers.current.size === 2) {
            const [a, b] = [...fingers.current.values()];
            if (pinch.current.gap > 1)
              setZoom(
                houseZoom(
                  (pinch.current.zoom * distance(a, b)) / pinch.current.gap,
                  size,
                ),
              );
          }
        }}
        onPointerUp={(event) => {
          fingers.current.delete(event.pointerId);
          pinch.current = null;
        }}
        onPointerCancel={(event) => {
          fingers.current.delete(event.pointerId);
          pinch.current = null;
        }}
        onLostPointerCapture={(event) => {
          fingers.current.delete(event.pointerId);
          pinch.current = null;
        }}
        onClick={(event) => {
          if (house && cameraGesture.current) return;
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
          {ready && (
            <>
              <div
                className={styles.actor}
                style={{
                  left: foot.x,
                  top: foot.y,
                  zIndex: Math.round(view.point.y) + 10,
                }}
                aria-label={`${house ? house.plan.cast.find((a) => a.id === house.actor)!.name : '伊莉雅'}的室内站位`}
                data-house-actor={house?.actor}
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
                    width: (model?.cellWidth ?? 256) * spriteScale,
                    height: (model?.cellHeight ?? 256) * spriteScale,
                    backgroundImage: `url(${model?.file ?? ILLYA_ART_SPRITE})`,
                    backgroundSize: model
                      ? `${model.imageWidth * spriteScale}px ${model.imageHeight * spriteScale}px`
                      : undefined,
                    backgroundPosition: model
                      ? `${-model.cropX * spriteScale}px ${-model.cropY * spriteScale}px`
                      : `${(view.frame / 5) * 100}% ${(['down', 'left', 'right', 'up'].indexOf(view.direction) / 3) * 100}%`,
                    transform: `translate(${-anchor.x * spriteScale}px,${-anchor.y * spriteScale}px)${model?.mirror ? ' scaleX(-1)' : ''}`,
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
              {doors.map((door) => (
                <button
                  key={door.id}
                  type="button"
                  className={styles.exit}
                  style={{
                    left: interiorProject(door.point, scene.floor).x,
                    top: interiorProject(door.point, scene.floor).y,
                    transform: `translate(-50%,-35%) scale(${1 / scale})`,
                  }}
                  data-house-door={house ? door.id : undefined}
                  onClick={() =>
                    walkTo(door.point, house ? `door:${door.id}` : 'exit')
                  }
                >
                  <DoorOpen size={19} />
                  {door.label}
                </button>
              ))}
            </>
          )}
        </div>
        {!ready && (
          <output className={styles.loading}>
            {load !== 'error' && modelLoad !== 'error' ? (
              '正在打开室内原画…'
            ) : (
              <>
                <span>室内或人物图片暂未载入。</span>
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
        {house && (
          <div className={styles.houseTools}>
            <label>
              预览人物{' '}
              <select
                aria-label={`${house.plan.name}预览人物`}
                value={house.actor}
                onChange={(event) => {
                  stop();
                  house.onActor(event.target.value as ActorId);
                }}
              >
                {house.plan.cast.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name}
                  </option>
                ))}
              </select>
            </label>
            <span>{house.plan.routeSummary}</span>
          </div>
        )}
        {house && (
          <nav
            className={styles.spots}
            aria-label={`${house.plan.name}房间通路`}
          >
            {doors.map((door) => (
              <button
                key={door.id}
                type="button"
                disabled={!ready}
                onClick={() => walkTo(door.point, `door:${door.id}`)}
              >
                {door.label}
              </button>
            ))}
          </nav>
        )}
        <div className={styles.spots}>
          {scene.spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              disabled={!ready}
              onClick={() => walkTo(spot.point, spot.id)}
            >
              {spot.label}
            </button>
          ))}
          <button
            type="button"
            disabled={!canExit || !ready}
            onClick={() => {
              stop();
              if (house) house.onDoor(returnDoor);
              else onExit();
            }}
          >
            {house && house.room !== 'hall' ? '从门口回玄关' : '从门口出去'}
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
                disabled={!ready}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  currentPose.current = null;
                  setPose(null);
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
                    currentPose.current = null;
                    setPose(null);
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
