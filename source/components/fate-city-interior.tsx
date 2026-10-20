'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events -- This floor application supports keyboard walking through the modal's key listener and accessible destination buttons. */

import Image from 'next/image';
import { runtimeArt } from '@/lib/fate-runtime-art';
import { interiorOcclusionLayers } from '@/lib/fate-interior-occlusion';
import { useArtAssets } from './use-art-assets';
import { useRoomCamera } from './use-room-camera';
import { FateGameFrame } from './fate-game-frame';
import { FateFullscreenButton } from './fate-fullscreen-button';
import { FateInteriorDetail } from './fate-interior-detail';
import { FateInteractionMotion } from './fate-interaction-motion';
import { interactionMotion } from '@/lib/fate-interaction-motion';
import { seatedSpriteForAction } from '@/lib/fate-seated-sprites';
import { fateAudio, roomAcoustics } from '@/lib/fate-audio';
import { FateSoundButton } from './fate-sound-button';
import { useFateAudio } from './use-fate-audio';
import { usePlayChrome } from './use-play-chrome';
import { warmArtImages } from '@/lib/fate-art-loader';
import { houseWalkingArt, houseRoomWarmArt } from '@/lib/fate-interior-loading';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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
  interiorClearSegment,
  interiorMove,
  interiorRoute,
} from '@/lib/fate-city-interior-navigation';
import styles from './fate-city-interior.module.css';
import { houseZoom } from '@/lib/fate-tohsaka-house';
import { cityPreviewVisit } from '@/lib/fate-city-preview-visit';
import { previewPresentation } from '@/lib/fate-preview-presentation';
import {
  interiorDoorGuides,
  interiorWalkFacing,
} from '@/lib/fate-interior-controls';
import type { PartnerId } from '@/lib/fate-cast';
import {
  nearestPreviewDoor,
  type PreviewHouse,
  type PreviewDoor,
  type PreviewAction,
} from '@/lib/fate-preview-house';
import type { ActorId } from '@/lib/street';
import {
  houseGaitFrame,
  houseWalkDistance,
  houseWalkSpeed,
} from '@/lib/fate-house-walk';
import {
  interiorCrossedDoor,
  interiorDoorGuard,
  interiorInteractionHint,
  interiorObjectFacing,
  nearestInteriorSpot,
  nearbyInteriorSpots,
} from '@/lib/fate-interior-interaction';
import { FateArtRig } from './fate-art-rig';
import { bodyFacing, type BodyFacing } from '@/lib/fate-body-facing';
import { EMIYA_ROOMS, type EmiyaRoomId } from '@/lib/fate-emiya-house';
import { FateEmiyaFurniture } from './fate-emiya-room';
import {
  interiorHitSpot,
  interiorSpotDistance,
  interiorSpotRoute,
} from '@/lib/fate-interior-access';

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
  actor = 'illya',
  onExit,
}: {
  scene: CityInteriorScene;
  actor?: PartnerId;
  onExit: () => void;
}) {
  const visit = useMemo(() => cityPreviewVisit(scene, actor), [scene, actor]);
  return (
    <HouseInterior key={`${scene.id}:${actor}`} visit={visit} onExit={onExit} />
  );
}

export type HouseSession = {
  plan: PreviewHouse;
  room: string;
  entry: CityPoint;
  actor: ActorId;
  zoom: number;
  onZoom: (zoom: number) => void;
  onActor: (actor: ActorId) => void;
  onDoor: (door: PreviewDoor, anchor?: CityPoint) => boolean | void;
  arrivalAnchor?: CityPoint;
  formal?: {
    direction: Direction;
    action: string | null;
    suspended: boolean;
    walkPace: number;
    tick: (dt: number) => boolean;
    move: (
      point: CityPoint,
      direction: Direction,
      action: string | null,
    ) => void;
    occupied: () => CityPoint[];
    constrain: (from: CityPoint, to: CityPoint) => CityPoint;
    nearest: () => PartnerId | null;
    talk: (id: PartnerId) => string;
    bodies: (
      walkTo: (point: CityPoint, id?: string | null) => void,
    ) => ReactNode;
    art?: () => string[];
    controls: (actions: {
      walkTo: (point: CityPoint, id?: string | null) => void;
      stop: () => void;
      say: (text: string) => void;
    }) => ReactNode;
  };
};
type FormalHouse = NonNullable<HouseSession['formal']>;
function HouseBodies({
  render,
  walkTo,
}: {
  render: FormalHouse['bodies'];
  walkTo: Parameters<FormalHouse['bodies']>[0];
}) {
  return render(walkTo);
}
function HouseControls({
  render,
  walkTo,
  stop,
  say,
}: {
  render: FormalHouse['controls'];
} & Parameters<FormalHouse['controls']>[0]) {
  return render({ walkTo, stop, say });
}
export function FateHouseScene({
  house,
  onExit,
}: {
  house: HouseSession;
  onExit: () => void;
}) {
  return (
    <SingleRoomInterior
      key={house.room}
      scene={house.plan.rooms[house.room].scene}
      onExit={onExit}
      house={house}
    />
  );
}
function HouseInterior({
  visit,
  onExit,
}: {
  visit: ReturnType<typeof cityPreviewVisit>;
  onExit: () => void;
}) {
  const [location, setLocation] = useState({
    room: visit.room,
    entry: visit.entry,
    visit: 0,
  });
  const [zoom, setZoom] = useState(1.25);
  const [arrivalAnchor, setArrivalAnchor] = useState<CityPoint | undefined>(
    undefined,
  );
  const session: HouseSession = {
    plan: visit.plan,
    ...location,
    actor: visit.actor,
    zoom,
    arrivalAnchor,
    onZoom: setZoom,
    onActor: () => {},
    onDoor: (door, anchor) => {
      if (!door.to) {
        onExit();
        return;
      }
      setArrivalAnchor(anchor);
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
      scene={visit.plan.rooms[location.room].scene}
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
  const nativeRoom =
    scene.id === 'emiya' && house && Object.hasOwn(EMIYA_ROOMS, house.room)
      ? (house.room as EmiyaRoomId)
      : null;
  const [view, setView] = useState({
    point: { ...entry },
    direction: house?.formal?.direction ?? ('up' as Direction),
    bodyFacing: (house?.formal?.direction ?? 'up') as BodyFacing,
    frame: 0,
    revision: 0,
  });
  const [size, setSize] = useState({ width: 1000, height: 600 });
  const [layoutReady, setLayoutReady] = useState(false);
  const [localZoom, setLocalZoom] = useState(1);
  const setZoom = (value: number | ((value: number) => number)) => {
    if (house?.formal?.suspended) return;
    const next = typeof value === 'function' ? value(zoom) : value;
    if (house) house.onZoom(houseZoom(next, size, bodyHeight));
    else setLocalZoom(next);
  };
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const modelActor = house?.actor;
  const modelPlan = house?.plan;
  const modelRoom = house?.room;
  const initialPose = house?.formal?.action
    ? (house.plan.rooms[house.room].actions.find(
        (a) => a.id === house.formal?.action,
      ) ?? null)
    : null;
  const [pose, setPose] = useState<PreviewAction | null>(initialPose);
  const modelLoad = useArtAssets(
    [
      ...(modelActor && modelPlan
        ? [
            ...houseWalkingArt(modelPlan, modelActor),
            ...(pose
              ? [modelPlan.sprite(modelActor, 'down', 0, pose.pose).file]
              : []),
          ]
        : [ILLYA_ART_SPRITE]),
      ...(house?.formal?.art?.() ?? []),
      ...(nativeRoom ? ['/fate/interior-art/emiya-materials-soft-v1.png'] : []),
    ],
    attempt,
  );
  const ready = layoutReady && load === 'ready' && modelLoad === 'ready';
  const inputReady = useRef(ready);
  useLayoutEffect(() => {
    inputReady.current = ready;
  }, [ready]);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState({ id: '', revision: 0 });
  const [closedDetail, setClosedDetail] = useState(0);
  const [hintId, setHintId] = useState<string | null>(null);
  const hintMemory = useRef<string | null>(null);
  const [focusedSpot, setFocusedSpot] = useState<string | null>(null);
  const focusedObject = useRef<string | null>(null);
  useEffect(() => {
    if (!message || feedback.id) return;
    const timeout = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timeout);
  }, [message, feedback.id, feedback.revision]);
  useEffect(() => {
    if (!ready || !modelPlan || !modelActor || !modelRoom) return;
    let active = true;
    warmArtImages(
      houseRoomWarmArt(modelPlan, modelRoom, modelActor),
      () => active,
    );
    return () => {
      active = false;
    };
  }, [ready, modelPlan, modelActor, modelRoom]);
  const surface = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDialogElement>(null);
  const chrome = usePlayChrome(shell);
  const position = useRef<CityPoint>({ ...entry });
  useFateAudio({
    key: `interior:${scene.id}:${house?.room ?? scene.room}`,
    ambient: roomAcoustics(scene.name, scene.room).ambient,
    ground: nativeRoom
      ? EMIYA_ROOMS[nativeRoom].material === 'tatami'
        ? 'tatami'
        : EMIYA_ROOMS[nativeRoom].material === 'stone'
          ? 'stone'
          : 'wood'
      : roomAcoustics(scene.name, scene.room).ground,
    active: ready,
    position: () => position.current,
    floor: scene.floor,
  });
  const keys = useRef(new Set<string>());
  const held = useRef<CityPoint>({ x: 0, y: 0 });
  const route = useRef<CityPoint[]>([]);
  const rerouteAt = useRef(0);
  const waitingDoor = useRef<{
    door: PreviewDoor;
    until: number;
    retry: number;
  } | null>(null);
  const destination = useRef<string | null>(null);
  const facing = useRef<Direction>(house?.formal?.direction ?? 'up');
  const bodyDirection = useRef<BodyFacing>(house?.formal?.direction ?? 'up');
  const walked = useRef(0);
  const fingers = useRef(new Map<number, CityPoint>());
  const pinch = useRef<{ gap: number; zoom: number } | null>(null);
  const cameraGesture = useRef(false);
  const touchedDoor = useRef<{ id: string; at: number } | null>(null);
  const exit = useRef(onExit);
  const session = useRef(house);
  const camera = useRef({
    zoom: house?.zoom ?? localZoom,
    size,
    bodyHeight: 330,
    anchor: { x: 0.5, y: 0.7 },
  });
  const currentPose = useRef<PreviewAction | null>(initialPose);
  const stop = () => {
    keys.current.clear();
    held.current = { x: 0, y: 0 };
    route.current = [];
    destination.current = null;
    waitingDoor.current = null;
    fingers.current.clear();
    pinch.current = null;
    currentPose.current = null;
    setPose(null);
    setFeedback((old) => (old.id ? { ...old, id: '' } : old));
    focusedObject.current = null;
    setFocusedSpot(null);
    session.current?.formal?.move(position.current, facing.current, null);
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
    ? (doors.find(
        (d) => d.id === (house.room === 'hall' ? 'street' : 'hall'),
      ) ??
      doors.find((d) => d.to === null) ??
      doors.find((d) => d.to === 'hall') ??
      doors[0])
    : doors[0];
  const doorGuard = useRef(interiorDoorGuard(entry, doors));
  const roomDoors = useRef(doors);
  const fit = Math.min(
    size.width / INTERIOR_PAINT.width,
    size.height / INTERIOR_PAINT.height,
  );
  const renderedPoint = pose?.contact ?? view.point;
  const foot = interiorProject(renderedPoint, scene.floor);
  const depth = interiorDepth(renderedPoint, scene.floor);
  foot.y -= (pose?.elevation ?? 0) * depth;
  const legacyAnchor =
    ART_SPRITE_FRAMES[view.direction][Math.min(5, view.frame)];
  const originalModel = house
    ? house.plan.sprite(
        house.actor,
        view.direction,
        view.frame,
        pose?.pose,
        view.bodyFacing,
      )
    : null;
  const model = originalModel
    ? seatedSpriteForAction(originalModel, pose)
    : null;
  const anchor = model
    ? { x: model.anchorX, y: model.anchorY, scale: model.scale }
    : legacyAnchor;
  const presentation = model
    ? previewPresentation(scene, view.point, model, pose)
    : null;
  if (presentation) {
    foot.x = presentation.foot.x;
    foot.y = presentation.foot.y;
  }
  const spriteScale =
    presentation?.spriteScale ?? depth * anchor.scale * (pose?.scale ?? 1);
  const bodyHeight = presentation?.body.height ?? 330;
  const zoom = house ? houseZoom(house.zoom, size, bodyHeight) : localZoom;
  const scale = fit * zoom;
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
  const body = presentation?.body ?? {
    x: foot.x - anchor.x * spriteScale,
    y: foot.y - anchor.y * spriteScale,
    width: 256 * spriteScale,
    height: 256 * spriteScale,
  };
  const origin = useRoomCamera({
    target: cameraTarget,
    foot,
    body,
    scale,
    size,
    anchor: house?.arrivalAnchor,
    ready,
  });
  const doorScreens = doors.map((door) => {
    const paint = interiorProject(door.point, scene.floor);
    return { x: origin.x + paint.x * scale, y: origin.y + paint.y * scale };
  });
  const nearDoor = house
    ? nearestPreviewDoor(view.point, house.plan.rooms[house.room])
    : distance(view.point, INTERIOR_ART_ENTRY) < 48
      ? doors[0]
      : null;
  const nearbySpots = nearbyInteriorSpots(
    view.point,
    scene,
    focusedSpot,
    hintId,
  );
  const nearSpot = nearbySpots[0] ?? null;
  const inspected =
    !pose && message && feedback.revision !== closedDetail
      ? nearbySpots.find((spot) => spot.id === feedback.id && spot.target)
      : null;
  const hintHeight =
    (pose ? 1 : Math.min(3, nearbySpots.length)) * 44 +
    (message && !inspected ? 96 : 0);
  const interactionHint = interiorInteractionHint(
    {
      x: origin.x + body.x * scale,
      y: origin.y + body.y * scale,
      width: body.width * scale,
      height: body.height * scale,
    },
    size,
    { width: 280, height: hintHeight },
  );
  const reservedObjects = scene.spots
    .filter((s) => s.target && s.id !== pose?.id)
    .map((s) => ({
      x: origin.x + s.target!.x * scale - 24,
      y: origin.y + s.target!.y * scale - 24,
      width: 48,
      height: 48,
    }))
    .filter(
      (r) =>
        r.x >= 0 &&
        r.y >= 0 &&
        r.x + r.width <= size.width &&
        r.y + r.height <= size.height,
    );
  const doorGuides = interiorDoorGuides(
    doorScreens,
    size,
    {
      x: origin.x + body.x * scale,
      y: origin.y + body.y * scale,
      width: body.width * scale,
      height: body.height * scale,
    },
    [
      ...reservedObjects,
      ...(nearSpot || pose
        ? [
            {
              x: interactionHint.x - 140,
              y: interactionHint.y - hintHeight / 2,
              width: 280,
              height: hintHeight,
            },
          ]
        : []),
    ],
  );
  const walkTo = (point: CityPoint, id: string | null = null) => {
    if (!ready || house?.formal?.suspended) return;
    stop();
    const spot = scene.spots.find(
      (s) => s.id === id || `approach:${s.id}` === id,
    );
    focusedObject.current = spot?.id ?? null;
    setFocusedSpot(spot?.id ?? null);
    const path = spot
      ? id === spot.id &&
        Number.isFinite(interiorSpotDistance(position.current, spot, scene))
        ? []
        : interiorSpotRoute(
            position.current,
            spot,
            scene,
            house?.formal?.occupied(),
          )
      : interiorRoute(
          position.current,
          point,
          scene,
          house?.formal?.occupied(),
        );
    if (!path) {
      setMessage('这边暂时走不过去。');
      return;
    }
    route.current = path;
    destination.current = id;
    setMessage('');
    surface.current?.focus({ preventScroll: true });
  };
  const actions = useRef({ walkTo, stop });
  useEffect(() => {
    actions.current = { walkTo, stop };
    exit.current = onExit;
    session.current = house;
    camera.current = {
      zoom,
      size,
      bodyHeight,
      anchor: {
        x: (origin.x + foot.x * scale) / size.width,
        y: (origin.y + foot.y * scale) / size.height,
      },
    };
    hintMemory.current = nearSpot?.id ?? null;
  });
  const isHouse = Boolean(house);
  useEffect(() => {
    const element = surface.current;
    if (!element || !isHouse) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY === 0 || session.current?.formal?.suspended) return;
      const current = camera.current;
      session.current?.onZoom(
        houseZoom(
          current.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12),
          current.size,
          current.bodyHeight,
        ),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [isHouse]);
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
    const pauseInput = () => {
      keys.current.clear();
      held.current = { x: 0, y: 0 };
      route.current = [];
      destination.current = null;
      fingers.current.clear();
      pinch.current = null;
    };
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
        setMessage('已停步。');
        return;
      }
      if (!inputReady.current) return;
      if (session.current?.formal?.suspended) return;
      if (key === 'e' && event.repeat) {
        event.preventDefault();
        return;
      }
      if (key === 'e') {
        event.preventDefault();
        if (currentPose.current) {
          clear();
          setMessage('已起身。');
          return;
        }
        const spot = nearestInteriorSpot(
          position.current,
          scene,
          focusedObject.current ?? hintMemory.current,
        );
        if (spot) {
          actions.current.walkTo(spot.point, spot.id);
          return;
        }
        const resident = session.current?.formal?.nearest();
        if (resident) {
          clear();
          setMessage(session.current!.formal!.talk(resident));
          return;
        }
        const near = session.current
          ? nearestPreviewDoor(
              position.current,
              session.current.plan.rooms[session.current.room],
            )
          : null;
        if (
          near ||
          (!session.current &&
            distance(position.current, INTERIOR_ART_ENTRY) < 48)
        ) {
          clear();
          if (near) {
            if (
              session.current!.onDoor(near, camera.current.anchor) === false
            ) {
              const now = performance.now();
              waitingDoor.current = {
                door: near,
                until: now + 6000,
                retry: now + 300,
              };
              setMessage('等门口让开…');
            }
          } else exit.current();
          return;
        }
        setMessage('再靠近一点，或点物件走过去。');
        return;
      }
      if (!MOVE_KEYS.has(key)) return;
      focusedObject.current = null;
      setFocusedSpot(null);
      event.preventDefault();
      route.current = [];
      destination.current = null;
      currentPose.current = null;
      setPose(null);
      setMessage('');
      keys.current.add(key);
    };
    const keyup = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    const hidden = () => {
      if (document.hidden) pauseInput();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', pauseInput);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      pauseInput();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', pauseInput);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [scene]);
  useEffect(() => {
    if (!ready) return;
    let raf = 0,
      last = 0,
      published = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const formal = session.current?.formal;
      if (
        formal &&
        (formal.suspended || document.hidden || !document.hasFocus())
      ) {
        keys.current.clear();
        held.current = { x: 0, y: 0 };
        route.current = [];
        destination.current = null;
        setView((old) => (old.frame ? { ...old, frame: 0 } : old));
        raf = requestAnimationFrame(tick);
        return;
      }
      const modelChanged = formal?.tick(dt) ?? false;
      const waiting = waitingDoor.current;
      if (waiting && now >= waiting.retry) {
        if (now >= waiting.until) {
          waitingDoor.current = null;
          setMessage('门口还被挡着，可以换个位置再试。');
        } else {
          waiting.retry = now + 300;
          if (
            session.current?.onDoor(waiting.door, camera.current.anchor) !==
            false
          )
            return;
        }
      }
      const input = keys.current;
      let dx =
        held.current.x +
        Number(input.has('arrowright') || input.has('d')) -
        Number(input.has('arrowleft') || input.has('a'));
      let dy =
        held.current.y +
        Number(input.has('arrowdown') || input.has('s')) -
        Number(input.has('arrowup') || input.has('w'));
      const step =
        houseWalkSpeed(session.current?.actor) * dt * (formal?.walkPace ?? 1);
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
        if (formal)
          position.current = formal.constrain(previous, position.current);
        moving = distance(previous, position.current) > 0.01;
      } else if (route.current.length) {
        if (
          formal &&
          now >= rerouteAt.current &&
          !interiorClearSegment(
            position.current,
            route.current[0],
            scene,
            formal.occupied(),
          )
        ) {
          const path = interiorRoute(
            position.current,
            route.current.at(-1)!,
            scene,
            formal.occupied(),
          );
          if (path) route.current = path;
          rerouteAt.current = now + 300;
        }
        const next = route.current[0],
          previous = position.current;
        const gap = distance(previous, next);
        if (gap <= step) {
          position.current = { ...next };
        } else
          position.current = {
            x: previous.x + ((next.x - previous.x) * step) / gap,
            y: previous.y + ((next.y - previous.y) * step) / gap,
          };
        if (formal)
          position.current = formal.constrain(previous, position.current);
        if (gap <= step && distance(position.current, next) < 1e-5)
          route.current.shift();
        moving = distance(previous, position.current) > 0.01;
      }
      if (moving) {
        walked.current +=
          houseWalkDistance(tickStart, position.current, scene.floor) /
          (scene.figureScale ?? 1);
        facing.current = interiorWalkFacing(
          tickStart,
          position.current,
          scene.floor,
          facing.current,
        );
        const beforePaint = interiorProject(tickStart, scene.floor),
          afterPaint = interiorProject(position.current, scene.floor);
        bodyDirection.current = bodyFacing(
          { x: afterPaint.x - beforePaint.x, y: afterPaint.y - beforePaint.y },
          bodyDirection.current,
        );
      }
      formal?.move(
        position.current,
        facing.current,
        currentPose.current?.id ?? null,
      );
      // Doorways are passages. Explicit object/resident approaches must not
      // accidentally take a nearby doorway while their route passes it.
      const active = session.current;
      const wanted = destination.current;
      if (moving && (!wanted || wanted.startsWith('door:'))) {
        const candidates = active
          ? active.plan.rooms[active.room].doors
          : roomDoors.current;
        const door = interiorCrossedDoor(
          tickStart,
          position.current,
          wanted
            ? candidates.filter((d) => `door:${d.id}` === wanted)
            : candidates,
          doorGuard.current,
        );
        if (door) {
          actions.current.stop();
          if (!active) {
            exit.current();
            return;
          }
          if (active.onDoor(door, camera.current.anchor) !== false) return;
          waitingDoor.current = { door, until: now + 6000, retry: now + 300 };
          setMessage('等门口让开…');
        }
      }
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
            if (session.current.onDoor(door, camera.current.anchor) !== false)
              return;
            waitingDoor.current = { door, until: now + 6000, retry: now + 300 };
            setMessage('等门口让开…');
          }
        }
        if (id.startsWith('resident:') && formal)
          setMessage(formal.talk(id.slice(9) as PartnerId));
        const action =
          session.current &&
          session.current.plan.rooms[session.current.room].actions.find(
            (a) => a.id === id,
          );
        if (action) {
          if (action.facing) {
            facing.current = action.facing;
            bodyDirection.current = action.facing;
          }
          currentPose.current = action;
          setPose(action);
          formal?.move(position.current, facing.current, action.id);
        }
        if (
          !id.startsWith('resident:') &&
          !id.startsWith('approach:') &&
          !id.startsWith('door:')
        ) {
          const spot = scene.spots.find((s) => s.id === id);
          if (!action && spot) {
            facing.current = interiorObjectFacing(
              position.current,
              spot.target,
              scene,
              facing.current,
            );
            if (spot.target) {
              const at = interiorProject(position.current, scene.floor);
              bodyDirection.current = bodyFacing(
                { x: spot.target.x - at.x, y: spot.target.y - at.y },
                bodyDirection.current,
              );
            } else bodyDirection.current = facing.current;
            formal?.move(position.current, facing.current, null);
          }
          setMessage(spot?.detail ?? '已到达。');
          if (spot)
            setFeedback((old) => ({ id: spot.id, revision: old.revision + 1 }));
          if (spot) fateAudio.interact(interactionMotion(spot.label));
        }
      }
      if (now - published > (session.current ? 16 : 45) || !moving) {
        published = now;
        const point = { ...position.current };
        const frame = houseGaitFrame(
          session.current?.actor,
          walked.current,
          moving,
          session.current ? 6 : 5,
        );
        setHintId(
          (previous) =>
            nearbyInteriorSpots(
              point,
              scene,
              focusedObject.current,
              previous,
            )[0]?.id ?? null,
        );
        setView((old) =>
          distance(old.point, point) > 0.001 ||
          old.frame !== frame ||
          old.direction !== facing.current ||
          old.bodyFacing !== bodyDirection.current ||
          modelChanged
            ? {
                point,
                direction: facing.current,
                bodyFacing: bodyDirection.current,
                frame,
                revision: old.revision + Number(modelChanged),
              }
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
      className={`${styles.shell} ${chrome}`}
      data-interior-id={scene.id}
      data-house-room={house?.room}
      data-house-formal={!!house?.formal}
    >
      <header className={styles.header}>
        <div>
          <h2>
            {scene.name} <span>· {scene.room}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() =>
            walkTo(returnDoor.point, house ? `door:${returnDoor.id}` : 'exit')
          }
          disabled={!ready}
        >
          <DoorOpen size={17} />
          {house && house.room !== 'hall' ? returnDoor.label : '走回出口'}
        </button>
      </header>
      <FateGameFrame>
        <div
          ref={surface}
          className={styles.surface}
          style={house ? { touchAction: 'none' } : undefined}
          role="application"
          tabIndex={0}
          aria-label={`${scene.name}室内行走：点击地面、方向键或 WASD，走进房门通行，E 交互附近物件`}
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
          data-interior-event={feedback.revision}
          data-interior-feedback-target={feedback.id || undefined}
          data-interior-direction={view.direction}
          data-body-facing={model?.bodyFacing}
          data-body-art={model?.materialVersion}
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
                    bodyHeight,
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
            if ((event.target as Element).closest('button, [data-game-detail]'))
              return;
            const rect = event.currentTarget.getBoundingClientRect();
            const paint = {
              x: (event.clientX - rect.left - origin.x) / scale,
              y: (event.clientY - rect.top - origin.y) / scale,
            };
            const object = interiorHitSpot(paint, scene);
            if (object) {
              walkTo(
                object.point,
                Number.isFinite(
                  interiorSpotDistance(position.current, object, scene),
                )
                  ? object.id
                  : `approach:${object.id}`,
              );
              return;
            }
            const point = interiorUnproject(paint, scene.floor);
            if (point) walkTo(point);
            else setMessage('这里没有通路。');
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
              src={runtimeArt(scene.painting)}
              width={1600}
              height={900}
              alt={`${scene.name}的${scene.room}：${scene.description}`}
              unoptimized
              loading="eager"
              fetchPriority="high"
              draggable={false}
              className={styles.painting}
              onLoad={() => setLoad('ready')}
              onError={() => setLoad('error')}
            />
            {ready && (
              <>
                {house?.formal && (
                  <HouseBodies render={house.formal.bodies} walkTo={walkTo} />
                )}
                <div
                  className={styles.actor}
                  style={{
                    left: foot.x,
                    top: foot.y,
                    zIndex:
                      Math.round(presentation?.layer ?? view.point.y) + 10,
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
                  <div
                    key={`${pose?.id ?? 'stand'}:${feedback.revision}`}
                    className={styles.gesture}
                    data-body-art={model?.materialVersion}
                    data-gesture={
                      pose
                        ? 'settle'
                        : feedback.id
                          ? /整理|备餐|包装|工作|水槽/.test(
                              scene.spots.find((s) => s.id === feedback.id)
                                ?.label ?? '',
                            )
                            ? 'work'
                            : 'look'
                          : undefined
                    }
                  >
                    {model && feedback.id && !pose && !view.frame ? (
                      <FateInteractionMotion
                        sprite={model}
                        scale={spriteScale}
                        motion={interactionMotion(
                          scene.spots.find((s) => s.id === feedback.id)
                            ?.label ?? '',
                        )}
                      />
                    ) : model?.rig ? (
                      <FateArtRig sprite={model} scale={spriteScale} />
                    ) : (
                      <span
                        className={styles.sprite}
                        style={{
                          width: (model?.cellWidth ?? 256) * spriteScale,
                          height: (model?.cellHeight ?? 256) * spriteScale,
                          backgroundImage: `url(${runtimeArt(model?.file ?? ILLYA_ART_SPRITE)})`,
                          backgroundSize: model
                            ? `${model.imageWidth * spriteScale}px ${model.imageHeight * spriteScale}px`
                            : undefined,
                          backgroundPosition: model
                            ? `${-model.cropX * spriteScale}px ${-model.cropY * spriteScale}px`
                            : `${(view.frame / 5) * 100}% ${(['down', 'left', 'right', 'up'].indexOf(view.direction) / 3) * 100}%`,
                          clipPath: model?.clip
                            ? `polygon(${model.clip.map(([x, y]) => `${(x / model.cellWidth) * 100}% ${(y / model.cellHeight) * 100}%`).join(',')})`
                            : undefined,
                          transform: `translate(${-anchor.x * spriteScale}px,${-anchor.y * spriteScale}px)${model?.mirror ? ' scaleX(-1)' : ''}`,
                        }}
                      />
                    )}
                  </div>
                </div>
                {nativeRoom
                  ? EMIYA_ROOMS[nativeRoom].pieces.map((piece) => (
                      <FateEmiyaFurniture
                        key={piece.id}
                        room={nativeRoom}
                        piece={piece}
                        active={false}
                        mealReady={false}
                      />
                    ))
                  : interiorOcclusionLayers(scene).map((layer, index) => (
                      <div
                        key={`${layer.id}:${index}`}
                        data-interior-occluder={layer.id}
                        className={styles.occluder}
                        aria-hidden="true"
                        style={{
                          backgroundImage: `url(${runtimeArt(scene.painting)})`,
                          zIndex: Math.round(layer.depth) + 10,
                          clipPath: `polygon(${layer.polygon.map((p) => `${p.x / 16}% ${p.y / 9}%`).join(',')})`,
                        }}
                      />
                    ))}
              </>
            )}
          </div>
          {ready && (
            <div className={styles.doorGuides}>
              {doors.map((door, index) => {
                const screen = doorScreens[index],
                  mark = doorGuides[index];
                if (!mark) return null;
                return (
                  <button
                    key={door.id}
                    type="button"
                    className={styles.doorGuide}
                    style={{ left: mark.x, top: mark.y, width: mark.width }}
                    data-house-door={house ? door.id : undefined}
                    data-door-pinned={mark.pinned}
                    data-door-near={nearDoor?.id === door.id}
                    title={door.label}
                    onPointerEnter={() => {
                      if (house && door.to)
                        warmArtImages([
                          house.plan.rooms[door.to].scene.painting,
                        ]);
                    }}
                    onFocus={() => {
                      if (house && door.to)
                        warmArtImages([
                          house.plan.rooms[door.to].scene.painting,
                        ]);
                    }}
                    onPointerUp={(event) => {
                      if (
                        event.pointerType !== 'touch' ||
                        cameraGesture.current
                      )
                        return;
                      touchedDoor.current = {
                        id: door.id,
                        at: performance.now(),
                      };
                      walkTo(door.point, house ? `door:${door.id}` : 'exit');
                    }}
                    onClick={(event) => {
                      if (
                        event.detail > 0 &&
                        (cameraGesture.current ||
                          (touchedDoor.current?.id === door.id &&
                            performance.now() - touchedDoor.current.at < 350))
                      )
                        return;
                      walkTo(door.point, house ? `door:${door.id}` : 'exit');
                    }}
                  >
                    {mark.pinned ? (
                      <ArrowUp
                        size={16}
                        style={{
                          transform: `rotate(${(Math.atan2(screen.y - mark.y, screen.x - mark.x) * 180) / Math.PI + 90}deg)`,
                        }}
                      />
                    ) : (
                      <DoorOpen size={16} />
                    )}
                    <span>{door.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {ready && (
            <div className={styles.objectGuides} aria-label="室内物件">
              {feedback.id &&
                message &&
                (() => {
                  const target = scene.spots.find(
                    (s) => s.id === feedback.id,
                  )?.target;
                  return target ? (
                    <span
                      key={feedback.revision}
                      className={styles.objectResponse}
                      style={{
                        left: origin.x + target.x * scale,
                        top: origin.y + target.y * scale,
                      }}
                      aria-hidden="true"
                    />
                  ) : null;
                })()}
              {scene.spots.map((spot) => {
                if (
                  pose?.id === spot.id ||
                  nearbySpots.some((s) => s.id === spot.id)
                )
                  return null;
                const action = house?.plan.rooms[house.room].actions.find(
                  (a) => a.id === spot.id,
                );
                const target =
                  spot.target ??
                  action?.seat ??
                  (() => {
                    const p = interiorProject(
                      action?.contact ?? spot.point,
                      scene.floor,
                    );
                    p.y -=
                      (action?.elevation ?? 0) *
                      interiorDepth(action?.contact ?? spot.point, scene.floor);
                    return p;
                  })();
                const x = origin.x + target.x * scale,
                  y = origin.y + target.y * scale;
                if (
                  x < 22 ||
                  y < 22 ||
                  x > size.width - 22 ||
                  y > size.height - 22
                )
                  return null;
                const approach = () =>
                  walkTo(
                    spot.point,
                    Number.isFinite(
                      interiorSpotDistance(position.current, spot, scene),
                    )
                      ? spot.id
                      : `approach:${spot.id}`,
                  );
                return (
                  <button
                    key={spot.id}
                    type="button"
                    className={styles.objectGuide}
                    style={{ left: x, top: y }}
                    data-interior-object={spot.id}
                    aria-label={spot.label}
                    title={spot.label}
                    onPointerUp={(event) => {
                      if (
                        event.pointerType !== 'touch' ||
                        cameraGesture.current
                      )
                        return;
                      touchedDoor.current = {
                        id: `spot:${spot.id}`,
                        at: performance.now(),
                      };
                      approach();
                    }}
                    onClick={(event) => {
                      if (
                        event.detail > 0 &&
                        (cameraGesture.current ||
                          (touchedDoor.current?.id === `spot:${spot.id}` &&
                            performance.now() - touchedDoor.current.at < 350))
                      )
                        return;
                      approach();
                    }}
                  >
                    <span aria-hidden="true">◇</span>
                    <span className={styles.objectLabel}>{spot.label}</span>
                  </button>
                );
              })}
              {(nearSpot || pose) && (
                <div
                  className={styles.interactionBubble}
                  style={{
                    left: interactionHint.x,
                    top: interactionHint.y,
                  }}
                >
                  {pose ? (
                    <button
                      type="button"
                      className={styles.nearInteraction}
                      data-interior-near={pose.id}
                      onClick={() => {
                        if (cameraGesture.current) return;
                        if (pose) stop();
                        else if (nearSpot) walkTo(nearSpot.point, nearSpot.id);
                      }}
                    >
                      起身
                      <kbd aria-hidden="true">Esc</kbd>
                    </button>
                  ) : (
                    <div
                      className={styles.nearChoices}
                      aria-label="附近可操作物件"
                    >
                      {nearbySpots.map((spot, index) => (
                        <button
                          key={spot.id}
                          type="button"
                          className={styles.nearInteraction}
                          data-interior-near={index === 0 ? spot.id : undefined}
                          data-interior-choice={spot.id}
                          onClick={() => {
                            if (!cameraGesture.current)
                              walkTo(spot.point, spot.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key.toLowerCase() !== 'e') return;
                            event.preventDefault();
                            event.stopPropagation();
                            if (!event.repeat && !cameraGesture.current)
                              walkTo(spot.point, spot.id);
                          }}
                        >
                          {spot.label}
                          {index === 0 && <kbd aria-hidden="true">E</kbd>}
                        </button>
                      ))}
                    </div>
                  )}
                  {message && !inspected && (
                    <output
                      className={styles.contextMessage}
                      aria-live="polite"
                      data-interior-feedback
                    >
                      {message}
                    </output>
                  )}
                </div>
              )}
            </div>
          )}
          {!ready && (
            <output className={styles.loading}>
              {load !== 'error' && modelLoad !== 'error' ? (
                '正在进入…'
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
          <div className={styles.zoom} data-game-toolbar>
            <FateFullscreenButton />
            <FateSoundButton />
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
              disabled={
                zoom >= (house ? houseZoom(2.5, size, bodyHeight) : 2.5) - 0.001
              }
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            >
              <Plus size={17} />
            </button>
          </div>
          {inspected?.target && (
            <FateInteriorDetail
              key={feedback.revision}
              painting={scene.painting}
              target={inspected.detailTarget ?? inspected.target}
              frame={inspected.detailFrame}
              layers={
                nativeRoom
                  ? EMIYA_ROOMS[nativeRoom].pieces
                      .filter((piece) => piece.id === inspected.object)
                      .map((piece) => (
                        <FateEmiyaFurniture
                          key={piece.id}
                          room={nativeRoom}
                          piece={piece}
                          active={false}
                          mealReady={false}
                        />
                      ))
                  : undefined
              }
              title={inspected.label}
              detail={message}
              onClose={() => {
                setClosedDetail(feedback.revision);
                surface.current?.focus({ preventScroll: true });
              }}
            />
          )}
          {message && !nearSpot && !pose && (
            <output
              className={styles.feedback}
              aria-live="polite"
              data-interior-feedback
            >
              {message}
            </output>
          )}
        </div>
      </FateGameFrame>
      <footer className={styles.footer}>
        <div className={styles.footerActions}>
          {house && !house.formal && house.plan.cast.length > 1 && (
            <div className={styles.houseTools}>
              <label>
                人物{' '}
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
            </div>
          )}
          <details className={styles.destinations}>
            <summary>房间与物件</summary>
            <div className={styles.destinationList}>
              {house && (
                <nav
                  className={styles.spots}
                  aria-label={`${house.plan.name}房间通路`}
                >
                  {doors
                    .filter((door) => door.id !== returnDoor.id)
                    .map((door) => (
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
                  onClick={() => {
                    stop();
                    setMessage('已停止行走。');
                  }}
                >
                  停下
                </button>
              </div>
            </div>
          </details>
          {house?.formal && (
            <HouseControls
              render={house.formal.controls}
              walkTo={walkTo}
              stop={stop}
              say={setMessage}
            />
          )}
        </div>
        <div className={styles.bottom}>
          <details className={styles.controlsHelp}>
            <summary>操作</summary>
            <p>
              点物件走近，E
              或点身旁提示交互。直接走进房门即可通行。WASD／方向键行走，Esc
              停步；滚轮或双指缩放。
            </p>
          </details>
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
                  focusedObject.current = null;
                  setFocusedSpot(null);
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
                    focusedObject.current = null;
                    setFocusedSpot(null);
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
