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
import type { EmiyaResidentBody } from '@/lib/fate-emiya-residents';
import {
  emiyaCameraBody,
  emiyaCameraZoom,
  emiyaClampCamera,
} from '@/lib/fate-emiya-camera';
import type { PartnerId } from '@/lib/fate-cast';
import { EMIYA_LIFE_ACTIVITIES } from '@/lib/fate-emiya-household';
import { emiyaWalkAdvance, shirouWalkSprite } from '@/lib/fate-emiya-walk';
import FateEmiyaResident from './fate-emiya-resident';
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
import {
  interiorMove,
  interiorClearSegment,
} from '@/lib/fate-city-interior-navigation';
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
  | { kind: 'resident'; id: PartnerId }
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
  inhabitants: EmiyaResidentBody[];
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
  meal: life?.hasFood() ?? false,
  inhabitants: life?.house.all() ?? [],
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
  inhabitants: e.inhabitants.map((body) => ({
    ...body,
    point: { ...body.point },
  })),
  activity: e.activity ? { ...e.activity } : null,
  closedWindows: new Set(e.closedWindows),
  doors: new Set(e.doors),
  transition: e.transition ? { ...e.transition } : null,
});

export default function FateEmiyaHouse({
  onExit,
  life,
  lifeControls,
  lifeInteractions,
  onResidentSelect,
  residentRequest,
  actionRequest,
  lifeLabel,
  suspended = false,
}: {
  onExit: () => void;
  life?: EmiyaLifeSession;
  lifeControls?: ReactNode;
  lifeInteractions?: ReactNode;
  onResidentSelect?: (id: PartnerId) => void;
  residentRequest?: { id: PartnerId; serial: number } | null;
  actionRequest?: { id: string; serial: number } | null;
  lifeLabel?: string;
  suspended?: boolean;
}) {
  const activities = life ? EMIYA_LIFE_ACTIVITIES : EMIYA_ACTIVITIES;
  const paused = useRef(suspended);
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
  const cameraBody = emiyaCameraBody(
    view.player,
    view.activity,
    life ? 'shirou' : 'illya',
    view.player.direction,
    view.player.frame,
  );
  const clampCamera = (p: CityPoint) =>
    emiyaClampCamera(p, scale, size, cameraBody);
  const origin = clampCamera(
    pan ?? {
      x: size.width / 2 - foot.x * scale,
      y: size.height * 0.7 - foot.y * scale,
    },
  );
  const framing = useRef({ origin, size, scale, zoom });
  const publish = () => setView(snapshot(engine.current!));
  const stop = (feedback = false, keepHelp = false) => {
    if (!keepHelp) life?.cancelHelp();
    keys.current.clear();
    held.current = { x: 0, y: 0 };
    const e = engine.current!;
    e.player.legs = [];
    e.goal = null;
    e.activity = null;
    e.player.frame = 0;
    e.player.walked = 0;
    publish();
    if (feedback) {
      setMessage('已停下；活动也已取消。');
    }
  };
  const walkTo = (target: EmiyaLocation, goal: Goal = { kind: 'walk' }) => {
    if (load !== 'ready') return;
    stop(
      false,
      goal.kind === 'activity' && life?.household.help?.activity === goal.id,
    );
    const e = engine.current!,
      route = emiyaHouseRoute(e.player, target, [
        ...e.inhabitants,
        ...(e.residentVisible && !e.residentOn ? [e.resident] : []),
      ]);
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
    life?.beginActivity(a.id);
    const plan = life?.activityPlan(a);
    if (plan && !plan.ok && !('waiting' in plan && plan.waiting)) {
      setMessage(plan.message);
      return;
    }
    if (a.id === 'eat' && !engine.current!.meal) {
      setMessage('先在灶台做好家常饭，再到小餐桌用餐。');
      return;
    }
    walkTo({ room: a.room, point: a.point }, { kind: 'activity', id: a.id });
  };
  const choosePiece = (id: string) => {
    const a =
      life && id === 'kitchen-table'
        ? activities.find(
            (a) =>
              a.id ===
              (life.household.table.dirty
                ? 'clear-table'
                : life.hasFood() && !life.household.table.set
                  ? 'set-table'
                  : 'eat'),
          )
        : activities.find((a) => a.room === room.id && a.piece === id);
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
  const chooseResident = (id: PartnerId) => {
    const body = engine.current!.inhabitants.find((body) => body.id === id);
    if (!body) return;
    onResidentSelect?.(id);
    const e = engine.current!;
    if (body.room === e.player.room && gap(body.point, e.player.point) <= 85) {
      stop();
      publish();
      return;
    }
    const candidates = [
      [-80, 0],
      [80, 0],
      [-60, 55],
      [60, 55],
      [0, 60],
      [0, -60],
    ].map(([x, y]) => ({
      room: body.room,
      point: { x: body.point.x + x, y: body.point.y + y },
    }));
    // Side-by-side contact keeps both bodies visible; a safe vertical fallback
    // remains available for narrow passages.
    const target = candidates.find(
      (location) =>
        interiorClearSegment(
          location.point,
          body.point,
          EMIYA_ROOMS[body.room].scene,
        ) && emiyaHouseRoute(e.player, location, e.inhabitants),
    );
    if (target) walkTo(target, { kind: 'resident', id });
    else setMessage('人物附近暂时没有空出的接近点，稍等一下或沿路绕行。');
  };
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
    const nearby = e.inhabitants
      .filter(
        (body) =>
          body.room === player.room && gap(player.point, body.point) < 85,
      )
      .sort(
        (a, b) => gap(player.point, a.point) - gap(player.point, b.point),
      )[0];
    if (nearby) {
      chooseResident(nearby.id);
      return;
    }
    const nearDoor = emiyaRoomDoors(player.room)
      .filter((d) => gap(player.point, d.at) < 68)
      .sort((a, b) => gap(player.point, a.at) - gap(player.point, b.at))[0];
    if (nearDoor) {
      goDoor(nearDoor);
      return;
    }
    const a = activities
      .filter((a) => a.room === player.room && (a.id !== 'eat' || e.meal))
      .sort(
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
    const nextZoom = emiyaCameraZoom(value, frame.size),
      nextScale = (frame.scale * nextZoom) / frame.zoom;
    const contact = emiyaActorContact(e.player, e.activity);
    const activeFloor = EMIYA_ROOMS[e.player.room].scene.floor;
    const p = interiorProject(contact.point, activeFloor);
    p.y -= contact.elevation * interiorDepth(contact.point, activeFloor) * 0.85;
    const anchor = at ?? {
      x: frame.origin.x + p.x * frame.scale,
      y: frame.origin.y + p.y * frame.scale,
    };
    const next = emiyaClampCamera(
      cityCameraZoomAnchor(
        frame.origin,
        frame.scale,
        nextScale,
        anchor,
        nextAt ?? anchor,
      ),
      nextScale,
      frame.size,
      emiyaCameraBody(
        e.player,
        e.activity,
        life ? 'shirou' : 'illya',
        e.player.direction,
        e.player.frame,
      ),
    );
    setZoom(nextZoom);
    camera.current = next;
    setPan(next);
  };
  const commands = useRef({
    stop,
    interact,
    walkTo,
    publish,
    zoomCamera,
    chooseResident,
    activity,
  });
  useLayoutEffect(() => {
    paused.current = suspended;
    if (suspended) {
      keys.current.clear();
      held.current = { x: 0, y: 0 };
      const current = engine.current;
      if (current) {
        current.player.legs = [];
        current.player.frame = 0;
        current.player.walked = 0;
        current.goal = null;
        current.activity = null;
        setView(snapshot(current));
      }
    }
  }, [suspended]);
  useLayoutEffect(() => {
    commands.current = {
      stop,
      interact,
      walkTo,
      publish,
      zoomCamera,
      chooseResident,
      activity,
    };
    exit.current = onExit;
    framing.current = { origin, size, scale, zoom };
  });
  useEffect(() => {
    if (residentRequest && load === 'ready')
      commands.current.chooseResident(residentRequest.id);
  }, [residentRequest, load]);
  useEffect(() => {
    if (!actionRequest || load !== 'ready') return;
    if (actionRequest.id === 'stop') commands.current.stop(true);
    else {
      const a = activities.find((a) => a.id === actionRequest.id);
      if (a) commands.current.activity(a);
    }
  }, [actionRequest, load, activities]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      setSize(nextSize);
      const mobileStart =
        !initialFraming.current && nextSize.width > 0 && nextSize.width < 600;
      setZoom((value) => emiyaCameraZoom(mobileStart ? 2 : value, nextSize));
      if (!initialFraming.current && entry.contentRect.width > 0) {
        initialFraming.current = true;
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
      if (paused.current) return;
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
      if (paused.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
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
          (e.residentVisible && player.room === e.resident.room) ||
          e.inhabitants.some((body) => body.room === player.room)
            ? {
                ...currentScene,
                furniture: [
                  ...currentScene.furniture,
                  ...[
                    ...(e.residentVisible ? [e.resident] : []),
                    ...e.inhabitants,
                  ]
                    .filter((body) => body.room === player.room)
                    .map((body, index) => ({
                      id: `resident-${index}`,
                      footprint: {
                        x: body.point.x - 15,
                        y: body.point.y - 15,
                        width: 30,
                        height: 30,
                      },
                    })),
                ],
              }
            : currentScene;
        player.point = interiorMove(
          player.point,
          {
            x: delta.x * 185 * dt * (life?.walkPace ?? 1),
            y: delta.y * 185 * dt * (life?.walkPace ?? 1),
          },
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
          [...e.inhabitants, ...(e.residentVisible ? [e.resident] : [])].every(
            (body) =>
              door.to !== body.room || gap(door.arrival, body.point) >= 30,
          )
        ) {
          player.room = door.to;
          player.point = { ...door.arrival };
          cross(door);
        }
      } else if (player.legs.length) {
        const advanced = emiyaAdvanceRoute(
          player,
          player.legs,
          185 * dt * (life?.walkPace ?? 1),
          [...e.inhabitants, ...(e.residentVisible ? [e.resident] : [])],
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
        if (!life) player.walked += travelled;
      }
      if (life)
        Object.assign(
          player,
          emiyaWalkAdvance(player.walked, previous, travelled),
        );
      else player.frame = moving ? 1 + (Math.floor(player.walked / 22) % 5) : 0;
      if (!player.legs.length && e.goal) {
        const goal = e.goal;
        e.goal = null;
        if (
          goal.kind === 'exit' &&
          player.room === EMIYA_ENTRY.room &&
          gap(player.point, EMIYA_ENTRY.point) < 2
        ) {
          commands.current.stop();
          life?.move(player, life.meal);
          exit.current();
          return;
        }
        if (goal.kind === 'activity') {
          const a = activities.find((a) => a.id === goal.id)!;
          if (player.room === a.room && gap(player.point, a.point) < 2) {
            const plan = life?.activityPlan(a);
            if (!plan || plan.ok) {
              e.activity = { id: a.id, seconds: 0 };
              setMessage(a.progress);
            } else {
              if ('waiting' in plan && plan.waiting) e.goal = goal;
              setMessage(plan.message);
            }
          }
        } else if (goal.kind === 'resident') onResidentSelect?.(goal.id);
        else if (goal.kind === 'inspect')
          setMessage(
            `${EMIYA_ROOMS[player.room].pieces.find((p) => p.id === goal.piece)?.label}：${EMIYA_ROOMS[player.room].description}`,
          );
        else
          setMessage(
            `已到${EMIYA_ROOMS[player.room].name}。走近家具按 E 交互。`,
          );
      }
      if (e.activity) {
        const a = activities.find((a) => a.id === e.activity!.id)!;
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
      const lifeChanged = life?.tick(
        activeWindow.current && !document.hidden ? dt : 0,
        player,
        e.meal,
      );
      e.inhabitants = life?.house.all() ?? [];
      const foodChanged = !!life && e.meal !== life.hasFood();
      if (life) e.meal = life.hasFood();
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
          Object.assign(
            resident,
            emiyaWalkAdvance(resident.walked, old, advanced.travelled),
          );
          if (!resident.legs.length) e.resting = 0;
        } else {
          resident.frame = 0;
          resident.walked = 0;
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
      const current =
        previous.room !== player.room
          ? (camera.current ?? frame.origin)
          : frame.origin;
      const next = emiyaClampCamera(
        cityCameraFollow(current, p, frame.scale, frame.size, dt),
        frame.scale,
        frame.size,
        emiyaCameraBody(
          player,
          e.activity,
          life ? 'shirou' : 'illya',
          player.direction,
          player.frame,
        ),
      );
      camera.current = next;
      if (gap(current, next) > 0.01) setPan(next);
      const changed =
        moving ||
        lifeChanged ||
        foodChanged ||
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
        if (
          life &&
          blockedSeconds >= 0.5 &&
          blockedSeconds - dt < 0.5 &&
          player.legs.length
        ) {
          const last = player.legs.at(-1)!;
          const destination = last.points.at(-1);
          if (destination)
            player.legs =
              emiyaHouseRoute(
                player,
                { room: last.room, point: destination },
                e.inhabitants,
              ) ?? player.legs;
        }
        if (blockedSeconds >= 0.8 && blockedSeconds - dt < 0.8)
          setMessage('前面有人，稍等一下或用方向键绕行。');
      } else blockedSeconds = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [load, life, onResidentSelect, activities]);

  const playerWalk = life
    ? shirouWalkSprite(view.player.direction, view.player.frame)
    : null;
  const playerFrame = playerWalk?.frame ?? null;
  const anchor = playerFrame
    ? {
        x: playerWalk!.anchorX,
        y: playerFrame.anchorY,
        scale: playerWalk!.scale,
      }
    : ART_SPRITE_FRAMES[view.player.direction][view.player.frame];
  const playerSheet = life ? SHIROU_LIFE_SPRITES : EMIYA_LIFE_SPRITES;
  const bodyScale = interiorDepth(view.player.point, floor) * anchor.scale;
  const currentActivity = view.activity
    ? activities.find((a) => a.id === view.activity!.id)!
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
  const residentWalk = shirouWalkSprite(
    view.resident.direction,
    view.resident.frame,
  );
  const residentFrame = residentWalk.frame;
  const canExit =
    view.player.room === EMIYA_ENTRY.room &&
    gap(view.player.point, EMIYA_ENTRY.point) < 48;
  const residentFoot = interiorProject(view.resident.point, floor);
  const residentScale =
    interiorDepth(view.resident.point, floor) * residentWalk.scale;
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
    const bodies = [
      body,
      ...view.inhabitants
        .filter((resident) => resident.room === room.id)
        .map((resident) => {
          const at = interiorProject(resident.point, floor),
            depth = interiorDepth(resident.point, floor) * scale;
          return {
            x: origin.x + at.x * scale - 160 * depth - 8,
            y: origin.y + at.y * scale - 350 * depth - 8,
            width: 320 * depth + 16,
            height: 350 * depth + 16,
          };
        }),
    ];
    const clear = (at: CityPoint) =>
      bodies.every(
        (b) =>
          at.x + width / 2 <= b.x ||
          at.x - width / 2 >= b.x + b.width ||
          at.y <= b.y ||
          at.y - 28 >= b.y + b.height,
      );
    if (!clear({ x, y })) {
      const options = bodies.flatMap((b) => [
        { x, y: b.y - 5 },
        { x, y: b.y + b.height + 33 },
        { x: b.x - width / 2 - 5, y },
        { x: b.x + b.width + width / 2 + 5, y },
      ]);
      const candidate = options
        .filter(
          (at) =>
            at.x >= width / 2 + 5 &&
            at.x <= size.width - width / 2 - 5 &&
            at.y >= 30 &&
            at.y <= size.height - 5 &&
            clear(at),
        )
        .sort((a, b) => gap(a, { x, y }) - gap(b, { x, y }))[0];
      if (candidate) ({ x, y } = candidate);
    }
    return { left: x, top: y };
  };
  return (
    <dialog
      ref={shell}
      open
      inert={suspended}
      aria-modal="true"
      aria-label={`卫宫宅 · ${room.name}`}
      className={`${base.shell} ${styles.shell}`}
      data-interior-id="emiya"
      data-house-room={room.id}
      data-house-suspended={suspended}
    >
      <header className={base.header}>
        <div>
          <h2>
            卫宫宅 <span>· {room.name}</span>
          </h2>
          <p>
            {life
              ? (lifeLabel ?? '卫宫士郎 · 家庭生活试玩 · 独立记录')
              : '日式家屋形制参考 · 连通布局创作 · 室内样板'}
          </p>
          {lifeControls}
          {suspended && <output>正在确认正式进度，室内已暂停。</output>}
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
        data-life-table={
          life ? JSON.stringify(life.household.table) : undefined
        }
        data-life-invitations={
          life
            ? JSON.stringify(
                life.household.invitations.map(({ person, status, key }) => ({
                  person,
                  status,
                  key,
                })),
              )
            : undefined
        }
        data-life-help={life?.household.help?.activity ?? ''}
        data-life-failed-task={life?.household.failed ?? ''}
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
        data-life-residents={JSON.stringify(
          view.inhabitants.map(
            ({ id, room, point, phase, kind, direction }) => ({
              id,
              room,
              point,
              phase,
              kind,
              direction,
            }),
          ),
        )}
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
                data-player-frame={view.player.frame}
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
                      backgroundImage: `url(${playerWalk ? playerWalk.sheet.path : ILLYA_ART_SPRITE})`,
                      backgroundSize: playerFrame
                        ? `${playerWalk!.sheet.width * bodyScale}px ${playerWalk!.sheet.height * bodyScale}px`
                        : undefined,
                      backgroundPosition: playerFrame
                        ? `${-playerFrame.x * bodyScale}px ${-playerFrame.y * bodyScale}px`
                        : `${(view.player.frame / 5) * 100}% ${(['down', 'left', 'right', 'up'].indexOf(view.player.direction) / 3) * 100}%`,
                      transform: `translate(${-anchor.x * bodyScale}px,${-anchor.y * bodyScale}px)${playerWalk?.mirror ? ' scaleX(-1)' : ''}`,
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
                      transform: `translate(${-residentWalk.anchorX * residentScale}px,${-residentFrame.anchorY * residentScale}px)${residentWalk.mirror ? ' scaleX(-1)' : ''}`,
                      backgroundImage: `url(${residentWalk.sheet.path})`,
                      backgroundSize: `${residentWalk.sheet.width * residentScale}px ${residentWalk.sheet.height * residentScale}px`,
                      backgroundPosition: `${-residentFrame.x * residentScale}px ${-residentFrame.y * residentScale}px`,
                    }}
                  />
                </div>
              )}
              {view.inhabitants
                .filter((body) => body.room === room.id)
                .map((body) => (
                  <FateEmiyaResident
                    key={body.id}
                    body={body}
                    onChoose={chooseResident}
                  />
                ))}
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
            residents={view.inhabitants}
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
          {activities.map((a) => (
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
          {lifeInteractions}
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
