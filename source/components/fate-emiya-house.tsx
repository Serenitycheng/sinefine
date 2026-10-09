'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events -- The room surface provides keyboard walking and accessible alternatives for every destination. */

import Image from 'next/image';
import Link from 'next/link';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EmiyaLifeSession } from '@/lib/fate-emiya-life';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  DoorOpen,
  Map as MapIcon,
  Minus,
  Plus,
  Square,
  Sun,
  Users,
} from 'lucide-react';
import { ART_SPRITE_FRAMES } from '@/lib/fate-art-sprite';
import { ILLYA_ART_SPRITE } from '@/lib/fate-character-art';
import {
  EMIYA_REQUIRED_ART,
  EMIYA_LIFE_SPRITES,
  SHIROU_WALK_SPRITES,
  SHIROU_LIFE_SPRITES,
  SHIROU_REQUIRED_ART,
  emiyaActivityPose,
  emiyaHasPaperWindow,
  emiyaActorContact,
} from '@/lib/fate-emiya-actions';
import {
  cityWalkFacing,
  cityCameraFollow,
  cityCameraZoomAnchor,
} from '@/lib/fate-city-art-controls';
import type { CityPoint } from '@/lib/fate-city-layout';
import {
  INTERIOR_PAINT,
  interiorDepth,
  interiorProject,
  interiorUnproject,
} from '@/lib/fate-city-interior-scenes';
import { interiorMove } from '@/lib/fate-city-interior-navigation';
import {
  EMIYA_ACTIVITIES,
  EMIYA_ENTRY,
  EMIYA_RESIDENT_ROUTINE,
  EMIYA_ROOMS,
  emiyaAdvanceRoute,
  emiyaHouseRoute,
  emiyaRoomDoors,
  emiyaDoorReached,
  emiyaScreenDirection,
  emiyaFurnitureSilhouette,
  emiyaDoorSilhouette,
  emiyaPieceApproach,
  type EmiyaActivity,
  type EmiyaDoor,
  type EmiyaLeg,
  type EmiyaLocation,
  type EmiyaRoomId,
} from '@/lib/fate-emiya-house';
import {
  EmiyaHouseMap,
  FateEmiyaDoorFrame,
  FateEmiyaFurniture,
  FateEmiyaRoomBackdrop,
  emiyaDoorKey,
} from './fate-emiya-room';
import base from './fate-city-interior.module.css';
import styles from './fate-emiya-house.module.css';

type Direction = 'up' | 'down' | 'left' | 'right';
type Entity = EmiyaLocation & {
  direction: Direction;
  walked: number;
  legs: EmiyaLeg[];
  frame: number;
};
type Goal =
  | { kind: 'exit' }
  | { kind: 'activity'; id: string }
  | { kind: 'walk' }
  | { kind: 'inspect'; piece: string };
type Engine = {
  player: Entity;
  resident: Entity;
  residentOn: boolean;
  residentVisible: boolean;
  routine: number;
  resting: number;
  activity: { id: string; seconds: number } | null;
  goal: Goal | null;
  meal: boolean;
  closedWindows: Set<EmiyaRoomId>;
  doors: Set<string>;
  returnDoor: string | null;
  transition: { room: EmiyaRoomId; until: number } | null;
};
const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const inputs = [
  { label: '向左', x: -1, y: 0, icon: ArrowLeft },
  { label: '向上', x: 0, y: -1, icon: ArrowUp },
  { label: '向下', x: 0, y: 1, icon: ArrowDown },
  { label: '向右', x: 1, y: 0, icon: ArrowRight },
];
const movement = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowleft',
  'arrowdown',
  'arrowright',
]);
const entity = (location: EmiyaLocation): Entity => ({
  ...location,
  point: { ...location.point },
  direction: 'up',
  walked: 0,
  legs: [],
  frame: 0,
});
const createEngine = (life?: EmiyaLifeSession): Engine => ({
  player: entity(life?.location ?? EMIYA_ENTRY),
  resident: entity(EMIYA_RESIDENT_ROUTINE[0]),
  residentOn: false,
  residentVisible: false,
  routine: 0,
  resting: 0,
  activity: null,
  goal: null,
  meal: life?.meal ?? false,
  closedWindows: new Set(),
  doors: new Set(),
  returnDoor: null,
  transition: null,
});
const hitShape = (points: readonly CityPoint[]) => {
  const left = Math.min(...points.map((p) => p.x)),
    top = Math.min(...points.map((p) => p.y));
  const width = Math.max(...points.map((p) => p.x)) - left,
    height = Math.max(...points.map((p) => p.y)) - top;
  return {
    left,
    top,
    width,
    height,
    clipPath: `polygon(${points.map((p) => `${((p.x - left) / width) * 100}% ${((p.y - top) / height) * 100}%`).join(',')})`,
  };
};
const snapshot = (e: Engine) => ({
  player: { ...e.player, point: { ...e.player.point } },
  resident: { ...e.resident, point: { ...e.resident.point } },
  residentOn: e.residentOn,
  residentVisible: e.residentVisible,
  routine: e.routine,
  resting: e.resting,
  meal: e.meal,
  activity: e.activity ? { ...e.activity } : null,
  closedWindows: new Set(e.closedWindows),
  doors: new Set(e.doors),
  transition: e.transition ? { ...e.transition } : null,
});

export default function FateEmiyaHouse({
  onExit,
  life,
  lifeControls,
}: {
  onExit: () => void;
  life?: EmiyaLifeSession;
  lifeControls?: ReactNode;
}) {
  const engine = useRef<Engine | null>(null);
  const [view, setView] = useState(() => snapshot(createEngine(life)));
  useLayoutEffect(() => {
    engine.current = createEngine(life);
  }, [life]);
  const [size, setSize] = useState({ width: 1000, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [mapVisible, setMapVisible] = useState(true);
  const [artStatus, setArtStatus] = useState<Record<string, 'ready' | 'error'>>(
    {},
  );
  const requiredArt = life ? SHIROU_REQUIRED_ART : EMIYA_REQUIRED_ART;
  const load = requiredArt.some((url) => artStatus[url] === 'error')
    ? 'error'
    : requiredArt.every((url) => artStatus[url] === 'ready')
      ? 'ready'
      : 'loading';
  const [attempt, setAttempt] = useState(0);
  const artAttempt = useRef(0);
  const [message, setMessage] = useState(
    '从门前庭院出发。沿踏石进玄关；点房间、门或家具沿路过去，E 交互，Escape 停下。',
  );
  const surface = useRef<HTMLDivElement>(null),
    shell = useRef<HTMLDialogElement>(null);
  const initialFraming = useRef(false);
  const held = useRef<CityPoint>({ x: 0, y: 0 }),
    keys = useRef(new Set<string>());
  const exit = useRef(onExit);
  const camera = useRef<CityPoint | null>(null);
  const [pan, setPan] = useState<CityPoint | null>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const activeWindow = useRef(true);
  const pointers = useRef(new Map<number, CityPoint>());
  const pinch = useRef<{ span: number; center: CityPoint } | null>(null);
  const suppressClick = useRef(false);
  const room = EMIYA_ROOMS[view.player.room];
  const floor = room.scene.floor,
    foot = interiorProject(view.player.point, floor);
  const fit = Math.min(
    size.width / INTERIOR_PAINT.width,
    size.height / INTERIOR_PAINT.height,
  );
  const scale = fit * zoom;
  const clampCamera = (p: CityPoint) => ({
    x:
      scale * 1600 <= size.width
        ? (size.width - scale * 1600) / 2
        : Math.max(size.width - scale * 1600, Math.min(0, p.x)),
    y:
      scale * 900 <= size.height
        ? (size.height - scale * 900) / 2
        : Math.max(size.height - scale * 900, Math.min(0, p.y)),
  });
  const origin = clampCamera(
    pan ?? {
      x: size.width / 2 - foot.x * scale,
      y: size.height * 0.7 - foot.y * scale,
    },
  );
  const framing = useRef({ origin, size, scale, zoom });
  const publish = () => setView(snapshot(engine.current!));
  const stop = (feedback = false) => {
    keys.current.clear();
    held.current = { x: 0, y: 0 };
    const e = engine.current!;
    e.player.legs = [];
    e.goal = null;
    e.activity = null;
    e.player.frame = 0;
    if (feedback) {
      publish();
      setMessage('已停下；活动也已取消。');
    }
  };
  const walkTo = (target: EmiyaLocation, goal: Goal = { kind: 'walk' }) => {
    if (load !== 'ready') return;
    stop();
    const e = engine.current!,
      route = emiyaHouseRoute(
        e.player,
        target,
        e.residentVisible && !e.residentOn ? e.resident : undefined,
      );
    if (!route) {
      setMessage('这处是家具或墙边，请选择空出的通路。');
      publish();
      return;
    }
    e.player.legs = route;
    e.goal = goal;
    setMessage(`沿室内通路前往${EMIYA_ROOMS[target.room].name}。`);
    surface.current?.focus({ preventScroll: true });
    publish();
  };
  const activity = (a: EmiyaActivity) => {
    if (a.id === 'eat' && !engine.current!.meal) {
      setMessage('先在灶台做好家常饭，再到小餐桌用餐。');
      return;
    }
    walkTo({ room: a.room, point: a.point }, { kind: 'activity', id: a.id });
  };
  const choosePiece = (id: string) => {
    const a = EMIYA_ACTIVITIES.find(
      (a) => a.room === room.id && a.piece === id,
    );
    if (a) {
      activity(a);
      return;
    }
    const piece = room.pieces.find((p) => p.id === id)!;
    const point = emiyaPieceApproach(room.id, piece);
    if (point) walkTo({ room: room.id, point }, { kind: 'inspect', piece: id });
  };
  const goDoor = (door: EmiyaDoor) =>
    walkTo({ room: door.to, point: door.arrival });
  const interact = () => {
    const e = engine.current!,
      player = e.player;
    if (
      player.room === EMIYA_ENTRY.room &&
      gap(player.point, EMIYA_ENTRY.point) < 48
    ) {
      stop();
      exit.current();
      return;
    }
    const nearDoor = emiyaRoomDoors(player.room)
      .filter((d) => gap(player.point, d.at) < 68)
      .sort((a, b) => gap(player.point, a.at) - gap(player.point, b.at))[0];
    if (nearDoor) {
      goDoor(nearDoor);
      return;
    }
    const a = EMIYA_ACTIVITIES.filter(
      (a) => a.room === player.room && (a.id !== 'eat' || e.meal),
    ).sort(
      (a, b) => gap(player.point, a.point) - gap(player.point, b.point),
    )[0];
    if (a && gap(player.point, a.point) < 70) activity(a);
    else if (
      e.residentVisible &&
      player.room === e.resident.room &&
      gap(player.point, e.resident.point) < 90
    ) {
      stop();
      publish();
      setMessage('士郎：「可以先去和室坐坐。饭做好以后，我会端过去。」');
    } else setMessage('走近门、家具或士郎，再按 E。也可以点下方活动沿路过去。');
  };
  const zoomCamera = (value: number, at?: CityPoint, nextAt?: CityPoint) => {
    const frame = framing.current,
      e = engine.current!;
    const nextZoom = Math.max(1, Math.min(2.5, value)),
      nextScale = (frame.scale * nextZoom) / frame.zoom;
    const contact = emiyaActorContact(e.player, e.activity);
    const activeFloor = EMIYA_ROOMS[e.player.room].scene.floor;
    const p = interiorProject(contact.point, activeFloor);
    p.y -= contact.elevation * interiorDepth(contact.point, activeFloor) * 0.85;
    const anchor = at ?? {
      x: frame.origin.x + p.x * frame.scale,
      y: frame.origin.y + p.y * frame.scale,
    };
    const next = cityCameraZoomAnchor(
      frame.origin,
      frame.scale,
      nextScale,
      anchor,
      nextAt ?? anchor,
    );
    setZoom(nextZoom);
    camera.current = next;
    setPan(next);
  };
  const commands = useRef({ stop, interact, walkTo, publish, zoomCamera });
  useLayoutEffect(() => {
    commands.current = { stop, interact, walkTo, publish, zoomCamera };
    exit.current = onExit;
    framing.current = { origin, size, scale, zoom };
  });
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
      if (!initialFraming.current && entry.contentRect.width > 0) {
        initialFraming.current = true;
        if (entry.contentRect.width < 600) setZoom(2);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (load === 'ready') surface.current?.focus({ preventScroll: true });
  }, [load]);
  useEffect(() => {
    const clear = () => {
      commands.current.stop(true);
      pointer.current = null;
    };
    const blur = () => {
      activeWindow.current = false;
      engine.current!.resident.frame = 0;
      clear();
    };
    const focus = () => {
      activeWindow.current = true;
    };
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
        return;
      }
      if (key === 'm') {
        event.preventDefault();
        if (!event.repeat) setMapVisible((v) => !v);
        return;
      }
      if (key === 'home') {
        event.preventDefault();
        setZoom(1);
        camera.current = null;
        setPan(null);
        return;
      }
      if (key === '+' || key === '=' || key === '-') {
        event.preventDefault();
        commands.current.zoomCamera(
          framing.current.zoom + (key === '-' ? -0.25 : 0.25),
        );
        return;
      }
      if (load !== 'ready') return;
      if (key === 'e') {
        event.preventDefault();
        if (!event.repeat) commands.current.interact();
        return;
      }
      if (!movement.has(key)) return;
      event.preventDefault();
      const e = engine.current!;
      e.player.legs = [];
      e.goal = null;
      if (e.activity) {
        e.activity = null;
        setMessage('已起身，继续行走。');
      }
      keys.current.add(key);
    };
    const keyup = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    const hidden = () => {
      activeWindow.current = !document.hidden;
      if (document.hidden) clear();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      commands.current.stop();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [load]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = element.getBoundingClientRect();
      commands.current.zoomCamera(
        framing.current.zoom * Math.exp(-event.deltaY * 0.001),
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);

  useEffect(() => {
    if (load !== 'ready') return;
    let raf = 0,
      last = 0,
      published = 0,
      blockedSeconds = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const e = engine.current!,
        player = e.player;
      const wasWalking = player.frame !== 0;
      const wasActive = !!e.activity,
        wasTransitioning = !!e.transition;
      const previous: EmiyaLocation = {
        room: player.room,
        point: { ...player.point },
      };
      const input = {
        x:
          held.current.x +
          Number(keys.current.has('d') || keys.current.has('arrowright')) -
          Number(keys.current.has('a') || keys.current.has('arrowleft')),
        y:
          held.current.y +
          Number(keys.current.has('s') || keys.current.has('arrowdown')) -
          Number(keys.current.has('w') || keys.current.has('arrowup')),
      };
      let travelled = 0,
        blocked = false;
      const cross = (door: EmiyaDoor) => {
        e.doors.add(emiyaDoorKey(door));
        e.returnDoor = `${door.to}-${door.from}`;
        e.transition = { room: door.from, until: now + 160 };
        // Reposition the camera with the same actor screen anchor and zoom.
        const frame = framing.current,
          nextFoot = interiorProject(
            player.point,
            EMIYA_ROOMS[player.room].scene.floor,
          );
        const oldFoot = interiorProject(
          previous.point,
          EMIYA_ROOMS[previous.room].scene.floor,
        );
        camera.current = {
          x: frame.origin.x + (oldFoot.x - nextFoot.x) * frame.scale,
          y: frame.origin.y + (oldFoot.y - nextFoot.y) * frame.scale,
        };
        setPan(camera.current);
      };
      if (input.x || input.y) {
        const delta = emiyaScreenDirection(player.point, input, player.room);
        const currentScene = EMIYA_ROOMS[player.room].scene;
        const collisionScene =
          e.residentVisible && player.room === e.resident.room
            ? {
                ...currentScene,
                furniture: [
                  ...currentScene.furniture,
                  {
                    id: 'resident',
                    footprint: {
                      x: e.resident.point.x - 15,
                      y: e.resident.point.y - 15,
                      width: 30,
                      height: 30,
                    },
                  },
                ],
              }
            : currentScene;
        player.point = interiorMove(
          player.point,
          { x: delta.x * 185 * dt, y: delta.y * 185 * dt },
          collisionScene,
        );
        travelled = gap(previous.point, player.point);
        const returning = emiyaRoomDoors(player.room).find(
          (d) => d.id === e.returnDoor,
        );
        if (!returning || gap(player.point, returning.at) > 82)
          e.returnDoor = null;
        const door = emiyaRoomDoors(player.room).find(
          (d) => d.id !== e.returnDoor && emiyaDoorReached(player.point, d),
        );
        if (
          door &&
          (!e.residentVisible ||
            door.to !== e.resident.room ||
            gap(door.arrival, e.resident.point) >= 30)
        ) {
          player.room = door.to;
          player.point = { ...door.arrival };
          cross(door);
        }
      } else if (player.legs.length) {
        const advanced = emiyaAdvanceRoute(
          player,
          player.legs,
          185 * dt,
          e.residentVisible ? e.resident : undefined,
        );
        player.room = advanced.location.room;
        player.point = advanced.location.point;
        player.legs = advanced.legs;
        travelled = advanced.travelled;
        blocked = advanced.blocked;
        for (const door of advanced.crossed) cross(door);
      }
      const moving = travelled > 0.001;
      if (moving) {
        const delta =
          player.room === previous.room
            ? (() => {
                const a = interiorProject(
                    previous.point,
                    EMIYA_ROOMS[player.room].scene.floor,
                  ),
                  b = interiorProject(
                    player.point,
                    EMIYA_ROOMS[player.room].scene.floor,
                  );
                return { x: b.x - a.x, y: b.y - a.y };
              })()
            : input;
        if (delta.x || delta.y)
          player.direction = cityWalkFacing(delta, player.direction);
        player.walked += travelled;
      }
      player.frame = moving ? 1 + (Math.floor(player.walked / 22) % 5) : 0;
      if (!player.legs.length && e.goal) {
        const goal = e.goal;
        e.goal = null;
        if (
          goal.kind === 'exit' &&
          player.room === EMIYA_ENTRY.room &&
          gap(player.point, EMIYA_ENTRY.point) < 2
        ) {
          commands.current.stop();
          life?.move(player, e.meal);
          exit.current();
          return;
        }
        if (goal.kind === 'activity') {
          const a = EMIYA_ACTIVITIES.find((a) => a.id === goal.id)!;
          if (player.room === a.room && gap(player.point, a.point) < 2) {
            e.activity = { id: a.id, seconds: 0 };
            setMessage(a.progress);
          }
        } else if (goal.kind === 'inspect')
          setMessage(
            `${EMIYA_ROOMS[player.room].pieces.find((p) => p.id === goal.piece)?.label}：${EMIYA_ROOMS[player.room].description}`,
          );
        else
          setMessage(
            `已到${EMIYA_ROOMS[player.room].name}。走近家具按 E 交互。`,
          );
      }
      if (e.activity) {
        const a = EMIYA_ACTIVITIES.find((a) => a.id === e.activity!.id)!;
        e.activity.seconds += dt;
        if (e.activity.seconds >= a.seconds) {
          const result = life?.complete(a, player, e.meal);
          if (!result || result.ok) {
            if (a.id === 'cook') e.meal = true;
            if (a.id === 'eat') e.meal = false;
          }
          e.activity = null;
          setMessage(result?.message ?? a.complete);
        }
      }
      life?.tick(
        activeWindow.current && !document.hidden ? dt : 0,
        player,
        e.meal,
      );
      if (e.residentOn && activeWindow.current && !document.hidden) {
        const resident = e.resident,
          old: EmiyaLocation = {
            room: resident.room,
            point: { ...resident.point },
          };
        if (resident.legs.length) {
          const advanced = emiyaAdvanceRoute(
            resident,
            resident.legs,
            145 * dt,
            player,
          );
          resident.room = advanced.location.room;
          resident.point = advanced.location.point;
          resident.legs = advanced.legs;
          for (const door of advanced.crossed) e.doors.add(emiyaDoorKey(door));
          if (advanced.travelled > 0.001 && old.room === resident.room) {
            const a = interiorProject(
                old.point,
                EMIYA_ROOMS[old.room].scene.floor,
              ),
              b = interiorProject(
                resident.point,
                EMIYA_ROOMS[resident.room].scene.floor,
              );
            resident.direction = cityWalkFacing(
              { x: b.x - a.x, y: b.y - a.y },
              resident.direction,
            );
          }
          resident.walked += advanced.travelled;
          resident.frame =
            advanced.travelled > 0.001
              ? 1 + (Math.floor(resident.walked / 18) % 5)
              : 0;
          if (!resident.legs.length) e.resting = 0;
        } else {
          resident.frame = 0;
          e.resting += dt;
          if (e.resting >= EMIYA_RESIDENT_ROUTINE[e.routine].seconds) {
            e.routine = (e.routine + 1) % EMIYA_RESIDENT_ROUTINE.length;
            const route = emiyaHouseRoute(
              resident,
              EMIYA_RESIDENT_ROUTINE[e.routine],
            );
            resident.legs = route ?? [];
            e.resting = 0;
          }
        }
      }
      if (e.transition && e.transition.until <= now) e.transition = null;
      const frame = framing.current;
      const contact = emiyaActorContact(player, e.activity);
      const activeFloor = EMIYA_ROOMS[player.room].scene.floor;
      const p = interiorProject(contact.point, activeFloor);
      p.y -=
        contact.elevation * interiorDepth(contact.point, activeFloor) * 0.85;
      const current = camera.current ?? frame.origin;
      const next = cityCameraFollow(current, p, frame.scale, frame.size, dt);
      camera.current = next;
      if (gap(current, next) > 0.01) setPan(next);
      const changed =
        moving ||
        (e.residentOn && activeWindow.current) ||
        wasActive ||
        !!e.activity ||
        wasTransitioning ||
        !!e.transition;
      if (
        (changed && now - published >= (moving || e.residentOn ? 15 : 100)) ||
        previous.room !== player.room ||
        (wasWalking && !moving) ||
        wasActive !== !!e.activity ||
        wasTransitioning !== !!e.transition
      ) {
        published = now;
        setView(snapshot(e));
      }
      if (blocked) {
        blockedSeconds += dt;
        if (blockedSeconds >= 0.8 && blockedSeconds - dt < 0.8)
          setMessage('前面有人，稍等一下或用方向键绕行。');
      } else blockedSeconds = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [load, life]);

  const playerFrame = life
    ? SHIROU_WALK_SPRITES.frames[view.player.direction][view.player.frame]
    : null;
  const anchor = playerFrame
    ? {
        x: playerFrame.anchorX,
        y: playerFrame.anchorY,
        scale: 306 / playerFrame.bounds.height,
      }
    : ART_SPRITE_FRAMES[view.player.direction][view.player.frame];
  const playerSheet = life ? SHIROU_LIFE_SPRITES : EMIYA_LIFE_SPRITES;
  const bodyScale = interiorDepth(view.player.point, floor) * anchor.scale;
  const currentActivity = view.activity
    ? EMIYA_ACTIVITIES.find((a) => a.id === view.activity!.id)!
    : null;
  const pose = currentActivity
    ? emiyaActivityPose(
        currentActivity,
        view.activity!.seconds,
        life ? 'shirou' : 'illya',
      )
    : null;
  const playerFoot = pose ? interiorProject(pose.point, floor) : foot;
  const poseScale = pose
    ? interiorDepth(pose.point, floor) * playerSheet.scale
    : 1;
  const poseElevation = pose
    ? pose.elevation * interiorDepth(pose.point, floor) * 0.85
    : 0;
  const residentFrame =
    SHIROU_WALK_SPRITES.frames[view.resident.direction][view.resident.frame];
  const canExit =
    view.player.room === EMIYA_ENTRY.room &&
    gap(view.player.point, EMIYA_ENTRY.point) < 48;
  const residentFoot = interiorProject(view.resident.point, floor);
  const residentScale =
    interiorDepth(view.resident.point, floor) *
    (306 / residentFrame.bounds.height);
  const chooseRoom = (id: EmiyaRoomId) =>
    walkTo({ room: id, point: { x: 500, y: 560 } });
  const zoomTo = (value: number) => {
    zoomCamera(value);
    surface.current?.focus({ preventScroll: true });
  };
  const labelPosition = (point: CityPoint, width = 145) => {
    const p = { x: origin.x + point.x * scale, y: origin.y + point.y * scale };
    let x = Math.max(width / 2 + 5, Math.min(size.width - width / 2 - 5, p.x));
    let y = Math.max(30, Math.min(size.height - 5, p.y - 10));
    const body = pose
      ? {
          x:
            origin.x +
            (playerFoot.x - pose.frame.anchorX * poseScale) * scale -
            8,
          y:
            origin.y +
            (playerFoot.y - poseElevation - pose.frame.anchorY * poseScale) *
              scale -
            8,
          width: pose.frame.width * poseScale * scale + 16,
          height: pose.frame.height * poseScale * scale + 16,
        }
      : {
          x: origin.x + (foot.x - anchor.x * bodyScale) * scale - 8,
          y: origin.y + (foot.y - anchor.y * bodyScale) * scale - 8,
          width: (playerFrame?.width ?? 256) * bodyScale * scale + 16,
          height: (playerFrame?.height ?? 256) * bodyScale * scale + 16,
        };
    if (
      x + width / 2 > body.x &&
      x - width / 2 < body.x + body.width &&
      y > body.y &&
      y - 28 < body.y + body.height
    ) {
      if (body.y > 33) y = body.y - 5;
      else if (body.y + body.height + 36 < size.height)
        y = body.y + body.height + 36;
      else
        x =
          body.x > width + 8
            ? body.x - width / 2 - 5
            : body.x + body.width + width / 2 + 5;
    }
    return { left: x, top: y };
  };
  return (
    <dialog
      ref={shell}
      open
      aria-modal="true"
      aria-label={`卫宫宅 · ${room.name}`}
      className={`${base.shell} ${styles.shell}`}
      data-interior-id="emiya"
      data-house-room={room.id}
    >
      <header className={base.header}>
        <div>
          <h2>
            卫宫宅 <span>· {room.name}</span>
          </h2>
          <p>
            {life
              ? '卫宫士郎 · 家庭生活试玩 · 独立记录'
              : '日式家屋形制参考 · 连通布局创作 · 室内样板'}
          </p>
          {lifeControls}
        </div>
        <button
          type="button"
          disabled={load !== 'ready'}
          onClick={() => walkTo(EMIYA_ENTRY, { kind: 'exit' })}
        >
          <DoorOpen size={17} />
          走回出口
        </button>
      </header>
      <div
        ref={surface}
        className={`${base.surface} ${styles.surface}`}
        role="application"
        tabIndex={0}
        aria-label="卫宫宅室内行走：点击地面、方向键或 WASD，E 交互，Escape 停止"
        data-interior-load={load}
        data-interior-x={view.player.point.x.toFixed(3)}
        data-interior-y={view.player.point.y.toFixed(3)}
        data-interior-zoom={zoom}
        data-house-room={room.id}
        data-house-activity={view.activity?.id ?? ''}
        data-house-route={view.player.legs.length}
        data-house-meal={view.meal}
        data-house-transition={!!view.transition}
        data-resident-room={view.residentVisible ? view.resident.room : ''}
        data-resident-x={view.resident.point.x.toFixed(3)}
        data-resident-y={view.resident.point.y.toFixed(3)}
        data-resident-phase={
          view.residentVisible && !view.residentOn
            ? 'paused'
            : view.resident.legs.length
              ? 'walking'
              : 'doing'
        }
        onPointerDownCapture={(event) => {
          if (!pointers.current.size) suppressClick.current = false;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (pointers.current.size !== 2) return;
          const [a, b] = [...pointers.current.values()],
            rect = event.currentTarget.getBoundingClientRect();
          pinch.current = {
            span: gap(a, b),
            center: {
              x: (a.x + b.x) / 2 - rect.left,
              y: (a.y + b.y) / 2 - rect.top,
            },
          };
          stop();
          pointer.current = null;
          suppressClick.current = true;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMoveCapture={(event) => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (!pinch.current || pointers.current.size !== 2) return;
          const [a, b] = [...pointers.current.values()],
            rect = event.currentTarget.getBoundingClientRect();
          const span = gap(a, b),
            center = {
              x: (a.x + b.x) / 2 - rect.left,
              y: (a.y + b.y) / 2 - rect.top,
            };
          if (span > 5 && pinch.current.span > 5)
            zoomCamera(
              (framing.current.zoom * span) / pinch.current.span,
              pinch.current.center,
              center,
            );
          pinch.current = { span, center };
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerUpCapture={(event) => {
          pointers.current.delete(event.pointerId);
          if (pinch.current) {
            pinch.current = null;
            pointers.current.clear();
            pointer.current = null;
          }
        }}
        onClickCapture={(event) => {
          if (suppressClick.current || pointer.current?.moved) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
            pointer.current = null;
          }
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          pointer.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const p = pointer.current;
          if (
            p?.id === event.pointerId &&
            gap({ x: p.x, y: p.y }, { x: event.clientX, y: event.clientY }) > 7
          ) {
            p.moved = true;
            stop(true);
          }
        }}
        onPointerCancel={() => {
          pointer.current = null;
          pointers.current.clear();
          pinch.current = null;
          stop(true);
        }}
        onClick={(event) => {
          if (
            (event.target as HTMLElement).closest('button') ||
            pointer.current?.moved
          ) {
            pointer.current = null;
            return;
          }
          pointer.current = null;
          const rect = event.currentTarget.getBoundingClientRect();
          const point = interiorUnproject(
            {
              x: (event.clientX - rect.left - origin.x) / scale,
              y: (event.clientY - rect.top - origin.y) / scale,
            },
            floor,
          );
          if (point) walkTo({ room: room.id, point });
          else setMessage('请点地面，或点门和家具沿路前往。');
        }}
      >
        {requiredArt.map((url) => (
          <Image
            key={`${attempt}:${url}`}
            src={url}
            width={1}
            height={1}
            alt=""
            unoptimized
            loading="eager"
            aria-hidden="true"
            className={styles.preload}
            data-house-art={url}
            onLoad={() => {
              if (attempt === artAttempt.current)
                setArtStatus((status) => ({ ...status, [url]: 'ready' }));
            }}
            onError={() => {
              if (attempt === artAttempt.current)
                setArtStatus((status) => ({ ...status, [url]: 'error' }));
            }}
          />
        ))}
        <div
          className={base.world}
          style={{
            width: 1600,
            height: 900,
            transform: `translate(${origin.x}px,${origin.y}px) scale(${scale})`,
          }}
          data-interior-origin-x={origin.x}
          data-interior-origin-y={origin.y}
          data-interior-scale={scale}
        >
          <FateEmiyaRoomBackdrop
            room={room.id}
            windowOpen={!view.closedWindows.has(room.id)}
          />
          {view.transition && (
            <div className={styles.outgoing} key={view.transition.until}>
              <FateEmiyaRoomBackdrop
                room={view.transition.room}
                windowOpen={!view.closedWindows.has(view.transition.room)}
              />
            </div>
          )}
          {load === 'ready' && (
            <>
              {room.pieces.map((piece) => (
                <FateEmiyaFurniture
                  key={piece.id}
                  room={room.id}
                  piece={piece}
                  active={currentActivity?.piece === piece.id}
                  mealReady={view.meal}
                />
              ))}
              {emiyaRoomDoors(room.id).map((door) => (
                <FateEmiyaDoorFrame
                  key={door.id}
                  room={room.id}
                  door={door}
                  open={view.doors.has(emiyaDoorKey(door))}
                />
              ))}
              {room.pieces.map((piece) => (
                <button
                  key={piece.id}
                  type="button"
                  className={styles.modelTarget}
                  aria-label={`与${piece.label}交互`}
                  title={piece.label}
                  data-house-furniture={piece.id}
                  style={{
                    ...hitShape(emiyaFurnitureSilhouette(room.id, piece)),
                    zIndex:
                      Math.round(piece.footprint.y + piece.footprint.height) +
                      11,
                  }}
                  onClick={() => choosePiece(piece.id)}
                />
              ))}
              {emiyaRoomDoors(room.id).map((door) => (
                <button
                  key={door.id}
                  type="button"
                  className={styles.modelTarget}
                  aria-label={`打开通往${EMIYA_ROOMS[door.to].name}的门`}
                  data-house-door-model={door.id}
                  style={{ ...hitShape(emiyaDoorSilhouette(door)), zIndex: 3 }}
                  onClick={() => goDoor(door)}
                />
              ))}
              <div
                className={base.actor}
                style={{
                  left: playerFoot.x,
                  top: playerFoot.y - poseElevation,
                  zIndex: pose?.z ?? Math.round(view.player.point.y) + 10,
                }}
                aria-label={life ? '士郎的室内站位' : '伊莉雅的室内站位'}
                data-player-id={life ? 'shirou' : 'illya'}
                data-house-player
                data-player-direction={view.player.direction}
                data-player-pose={pose?.pose ?? 'walk'}
                data-player-pose-phase={pose?.phase ?? ''}
                data-pose-x={pose?.point.x ?? ''}
                data-pose-y={pose?.point.y ?? ''}
              >
                <span
                  className={base.shadow}
                  style={{
                    transform: `scale(${interiorDepth(view.player.point, floor)})`,
                    opacity: pose && pose.elevation > 0 ? 0 : 1,
                  }}
                />
                {pose ? (
                  <span
                    className={styles.lifeSprite}
                    style={{
                      width: pose.frame.width * poseScale,
                      height: pose.frame.height * poseScale,
                      backgroundImage: `url(${playerSheet.path})`,
                      backgroundSize: `${playerSheet.width * poseScale}px ${playerSheet.height * poseScale}px`,
                      backgroundPosition: `${-pose.frame.x * poseScale}px ${-pose.frame.y * poseScale}px`,
                      transform: `translate(${-pose.frame.anchorX * poseScale}px,${-pose.frame.anchorY * poseScale}px)`,
                    }}
                  />
                ) : (
                  <span
                    className={base.sprite}
                    style={{
                      width: (playerFrame?.width ?? 256) * bodyScale,
                      height: (playerFrame?.height ?? 256) * bodyScale,
                      backgroundImage: `url(${life ? SHIROU_WALK_SPRITES.path : ILLYA_ART_SPRITE})`,
                      backgroundSize: playerFrame
                        ? `${SHIROU_WALK_SPRITES.width * bodyScale}px ${SHIROU_WALK_SPRITES.height * bodyScale}px`
                        : undefined,
                      backgroundPosition: playerFrame
                        ? `${-playerFrame.x * bodyScale}px ${-playerFrame.y * bodyScale}px`
                        : `${(view.player.frame / 5) * 100}% ${(['down', 'left', 'right', 'up'].indexOf(view.player.direction) / 3) * 100}%`,
                      transform: `translate(${-anchor.x * bodyScale}px,${-anchor.y * bodyScale}px)`,
                    }}
                  />
                )}
              </div>
              {view.residentVisible && view.resident.room === room.id && (
                <div
                  className={base.actor}
                  aria-label={`卫宫士郎 · ${view.resident.legs.length ? '沿路行走' : EMIYA_RESIDENT_ROUTINE[view.routine].label}`}
                  data-house-resident
                  style={{
                    left: residentFoot.x,
                    top: residentFoot.y,
                    zIndex: Math.round(view.resident.point.y) + 10,
                  }}
                >
                  <span
                    className={base.shadow}
                    style={{
                      transform: `scale(${interiorDepth(view.resident.point, floor)})`,
                    }}
                  />
                  <span
                    className={styles.residentSprite}
                    style={{
                      width: residentFrame.width * residentScale,
                      height: residentFrame.height * residentScale,
                      transform: `translate(${-residentFrame.anchorX * residentScale}px,${-residentFrame.anchorY * residentScale}px)`,
                      backgroundImage: `url(${SHIROU_WALK_SPRITES.path})`,
                      backgroundSize: `${SHIROU_WALK_SPRITES.width * residentScale}px ${SHIROU_WALK_SPRITES.height * residentScale}px`,
                      backgroundPosition: `${-residentFrame.x * residentScale}px ${-residentFrame.y * residentScale}px`,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
        {load === 'ready' && (
          <div className={styles.labels}>
            {emiyaRoomDoors(room.id).map((door) => (
              <button
                key={door.id}
                type="button"
                className={styles.doorLabel}
                style={labelPosition(interiorProject(door.at, floor))}
                data-house-door={door.id}
                onClick={() => goDoor(door)}
              >
                <DoorOpen size={14} />
                {door.label}
              </button>
            ))}
            {room.id === EMIYA_ENTRY.room && (
              <button
                type="button"
                className={styles.doorLabel}
                style={labelPosition(
                  interiorProject(EMIYA_ENTRY.point, floor),
                  95,
                )}
                onClick={() => walkTo(EMIYA_ENTRY, { kind: 'exit' })}
              >
                <DoorOpen size={14} />
                回街道
              </button>
            )}
          </div>
        )}
        {mapVisible && (
          <EmiyaHouseMap
            room={room.id}
            point={view.player.point}
            resident={view.residentVisible ? view.resident : null}
            onChoose={chooseRoom}
          />
        )}
        <div className={base.zoom}>
          <button
            type="button"
            aria-label="显示室内地图"
            onClick={() => setMapVisible((v) => !v)}
            aria-pressed={mapVisible}
          >
            <MapIcon size={17} />
          </button>
          <button
            type="button"
            aria-label="缩小室内视角"
            disabled={zoom <= 1}
            onClick={() => zoomTo(zoom - 0.25)}
          >
            <Minus size={17} />
          </button>
          <button
            type="button"
            aria-label="显示完整室内"
            onClick={() => zoomTo(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="放大室内视角"
            disabled={zoom >= 2.5}
            onClick={() => zoomTo(zoom + 0.25)}
          >
            <Plus size={17} />
          </button>
        </div>
        {load !== 'ready' && (
          <output className={base.loading}>
            {load === 'loading' ? (
              '正在打开卫宫宅…'
            ) : (
              <>
                <span>室内原画暂未载入。</span>
                <button
                  type="button"
                  onClick={() => {
                    artAttempt.current += 1;
                    setArtStatus({});
                    setAttempt(artAttempt.current);
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
        {currentActivity && (
          <output className={styles.progress}>
            <span>{currentActivity.progress}</span>
            <progress
              aria-label={currentActivity.label}
              value={view.activity!.seconds}
              max={currentActivity.seconds}
            />
            <button type="button" onClick={() => stop(true)}>
              起身／取消
            </button>
          </output>
        )}
      </div>
      <footer className={base.footer}>
        <div className={`${base.spots} ${styles.activities}`}>
          {EMIYA_ACTIVITIES.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={load !== 'ready'}
              onClick={() => activity(a)}
              data-house-action={a.id}
              aria-pressed={view.activity?.id === a.id}
            >
              {a.label}
            </button>
          ))}
          <button type="button" disabled={load !== 'ready'} onClick={interact}>
            <DoorOpen size={14} />E · 交互
          </button>
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
          <button type="button" onClick={() => stop(true)}>
            <Square size={12} />
            停下
          </button>
        </div>
        <div className={styles.options}>
          {!life && (
            <Link href="/fate/emiya-life" target="_blank" rel="noreferrer">
              试玩士郎生活
            </Link>
          )}
          <button
            type="button"
            disabled={load !== 'ready' || !emiyaHasPaperWindow(room.id)}
            onClick={() => {
              const e = engine.current!;
              if (e.closedWindows.has(room.id)) e.closedWindows.delete(room.id);
              else e.closedWindows.add(room.id);
              publish();
              setMessage(
                e.closedWindows.has(room.id)
                  ? '纸窗合上，窗光变柔。'
                  : '推开纸窗，庭院日光照进来。',
              );
            }}
            aria-pressed={!view.closedWindows.has(room.id)}
          >
            <Sun size={14} />
            {view.closedWindows.has(room.id) ? '开窗' : '合上纸窗'}
          </button>
          {!life && (
            <button
              type="button"
              disabled={load !== 'ready' || !!life}
              aria-pressed={view.residentOn}
              onClick={() => {
                const e = engine.current!;
                if (
                  !e.residentOn &&
                  e.player.room === e.resident.room &&
                  gap(e.player.point, e.resident.point) < 45
                ) {
                  setMessage('先离开士郎的站位，再开始观察。');
                  return;
                }
                e.residentOn = !e.residentOn;
                e.residentVisible = true;
                if (!e.residentOn) {
                  e.resident.frame = 0;
                  const lastLeg = e.player.legs.at(-1),
                    target = lastLeg?.points.at(-1);
                  if (lastLeg && target) {
                    const route = emiyaHouseRoute(
                      e.player,
                      { room: lastLeg.room, point: target },
                      e.resident,
                    );
                    if (route) e.player.legs = route;
                  }
                }
                publish();
                setMessage(
                  e.residentOn
                    ? '观察士郎：做饭、去和室、整理笔记、缘侧休息，均沿实际通路。'
                    : '已暂停士郎的日常演示。',
                );
              }}
            >
              <Users size={14} />
              {view.residentOn
                ? '暂停士郎日常'
                : view.residentVisible
                  ? '继续士郎日常'
                  : '观察士郎日常'}
            </button>
          )}
          {view.residentVisible && (
            <span>
              士郎：{EMIYA_ROOMS[view.resident.room].name} ·{' '}
              {!view.residentOn
                ? '暂停中'
                : view.resident.legs.length
                  ? '沿路前往'
                  : EMIYA_RESIDENT_ROUTINE[view.routine].label}
            </span>
          )}
        </div>
        <div className={base.bottom}>
          <output aria-live="polite">{message}</output>
          <div className={base.dpad} aria-label="室内方向控制">
            {inputs.map(({ label, x, y, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={`室内${label}`}
                disabled={load !== 'ready'}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  stop();
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
                    stop();
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
