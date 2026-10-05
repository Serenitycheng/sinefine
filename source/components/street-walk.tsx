'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- This keyboard-controlled game uses a focusable application surface, not a document region. */

import { LifeReminder } from './street-life-reminder';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
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
  House,
  Palette,
  Map as MapIcon,
} from 'lucide-react';
import {
  STREET,
  clamp,
  createStreetActors,
  directionFromKeys,
  placeName,
  screenToWorld,
  stepActor,
  WALK_SPEED,
  type ActorId,
  type Point,
} from '@/lib/street';
import { pickGamepad, readGamepad, type PadHistory } from '@/lib/gamepad';
import {
  sceneCameraFor,
  cameraAnchor,
  panCamera,
  easeCamera,
  DEFAULT_ZOOM,
  ZOOM_LIMITS,
  clampZoom,
  type CameraScene,
} from '@/lib/fate-camera';
import { BUILDING_ATLAS } from '@/lib/fate-environment';
import {
  liveEncounter,
  liveSpeech,
  type InteractionStatus,
} from '@/lib/fate-interaction';
import { fatePerson, isPartner, type PartnerId } from '@/lib/fate-cast';
import { FateAISettings, FateConversation } from './fate-conversation';
import { useFate } from './fate-provider';
import { useStreetLife } from './use-street-life';
import { LifeControls, LifePanel, type LifeSection } from './street-life-panel';
import { StreetObserver } from './street-observer';
import { lifePeriod, lifeStatus, lifeTime } from '@/lib/fate-life';
import { shoppingChoice, SUPPLIES } from '@/lib/fate-belongings';
import { SUPPLY_PRICES, canAfford } from '@/lib/fate-economy';
import {
  PUBLIC_VISIT_RADIUS,
  type PublicPlaceId,
  type PublicVisitAction,
} from '@/lib/fate-public-places';
import { FateInterior, type InteriorView } from './fate-interior';
import {
  INDOOR_SPEED,
  indoorRoute,
  nearHomeEntrance,
  nearbyHomeEntrance,
} from '@/lib/fate-indoor-map';
import {
  planStreetWalk,
  streetJourneyStatus,
  type StreetJourney,
} from '@/lib/fate-navigation';
import { HOME_ENTRANCES } from '@/lib/fate-home-entrances';
import { FATE_HOMES } from '@/lib/fate-housing';
import { DistrictAtlas, DistrictPlaceCard } from './fate-district-map';
import { StreetOutingPanel } from './street-outing-panel';
import {
  currentPublicOuting,
  publicOutingPoint,
  publicOutingTitle,
} from '@/lib/fate-public-outings';
import { FateStreetScenery } from './fate-street-scenery';
import { FateCityScenery } from './fate-city-scenery';
import {
  DISTRICT_LANDMARKS,
  nearestDistrictLandmark,
  STREET_SCENE_SCALE,
  streetScenePoint,
  type DistrictLandmark,
} from '@/lib/fate-district';
import interiorStyles from './fate-interior.module.css';
import styles from './street-walk.module.css';
import { STREET_CAST } from '@/lib/fate-street-cast';

const BASE_CAST = STREET_CAST;

const ASSETS = [BUILDING_ATLAS, ...new Set(BASE_CAST.map((p) => p.image))];
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

function placeDestination(place: DistrictLandmark): Point {
  return place.kind === 'home'
    ? HOME_ENTRANCES[place.id as keyof typeof HOME_ENTRANCES].door
    : place;
}
function nearbyStreetPlace(point: Point, previous?: DistrictLandmark) {
  return (
    DISTRICT_LANDMARKS.find(
      (place) =>
        place.kind === 'home' &&
        nearHomeEntrance(point, place.id as keyof typeof FATE_HOMES),
    ) ?? nearestDistrictLandmark(point, previous)
  );
}

function spriteStyle(
  person: (typeof BASE_CAST)[number],
  frame = 0,
): CSSProperties {
  return {
    backgroundImage: `url(${person.image})`,
    backgroundSize: `400% ${person.rows * 100}%`,
    backgroundPosition: `${(frame / 3) * 100}% ${person.row * 100}%`,
    aspectRatio: String(person.aspect),
  };
}

export default function StreetWalk({
  suspended = false,
}: {
  suspended?: boolean;
}) {
  const fate = useFate();
  const waverStage = fate.save.life?.waverStage ?? 'young';
  const CAST = useMemo(
    () =>
      BASE_CAST.map((person) =>
        person.id === 'waver'
          ? {
              ...person,
              name: fatePerson('waver', waverStage)!.name,
              caption:
                waverStage === 'adult'
                  ? '成年 · 埃尔梅罗二世'
                  : 'Fate/Zero 青年',
              row: waverStage === 'adult' ? 1 : 0,
            }
          : person,
      ),
    [waverStage],
  );
  const [nearby, setNearby] = useState<PartnerId | null>(null);
  const [nearbyHome, setNearbyHome] = useState<keyof typeof FATE_HOMES | null>(
    null,
  );
  const journey = useRef<StreetJourney | null>(null);
  const [journeyLabel, setJourneyLabel] = useState<string | null>(null);
  const [routeNotice, setRouteNotice] = useState('');
  const [nearbyStatus, setNearbyStatus] = useState<InteractionStatus | null>(
    null,
  );
  const [dialog, setDialog] = useState<'settings' | PartnerId | null>(null);
  const [dialogSpeaker, setDialogSpeaker] = useState<ActorId>('admin');
  const [interiorView, setInteriorView] = useState<InteriorView | null>(null);
  const [indoorMoving, setIndoorMoving] = useState(false);
  const interiorSurface = useRef<HTMLDivElement>(null);
  const indoorPath = useRef<Point[]>([]);
  const overlay = useRef(false);
  const [active, setActive] = useState<ActorId>('illya');
  const [mode, setMode] = useState<'control' | 'observe'>('observe');
  const [scene, setScene] = useState<'street' | 'map'>('street');
  const [scenePlace, setScenePlace] = useState<DistrictLandmark>(
    DISTRICT_LANDMARKS.find((place) => place.id === 'cafe')!,
  );
  const [zoomLevels, setZoomLevels] = useState({
    street: DEFAULT_ZOOM,
    map: DEFAULT_ZOOM,
  });
  const zoom = zoomLevels[scene];
  const zoomLimits = ZOOM_LIMITS[scene];
  const zoomPercent = Math.round((zoom / DEFAULT_ZOOM) * 100);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<DistrictLandmark | null>(
    null,
  );
  const [publicNotice, setPublicNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [location, setLocation] = useState('冬木市 · 商业街');
  const [hint, setHint] = useState(
    '点击「开始日常」旁观他们的一天；选择人物只跟随镜头',
  );
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
  }, [active, CAST]);
  const world = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const actors = useRef(createStreetActors());
  const [lifePanel, setLifePanel] = useState(false);
  const [lifeSection, setLifeSection] = useState<LifeSection>('today');
  const daily = useStreetLife(actors, {
    active,
    mode,
    overlay: Boolean(dialog) || suspended,
    ready: ready && !suspended,
  });
  const outing = currentPublicOuting(
    daily.view,
    mode === 'control' ? active : null,
  );
  const outingPoint =
    outing && outing.kind !== 'cafe' ? publicOutingPoint(outing) : null;
  const dailyActions = useRef({
    advance: daily.advance,
    walkPace: daily.walkPace,
    isInside: daily.isInside,
    cancel: daily.cancel,
    currentIndoor: daily.currentIndoor,
    moveInside: daily.moveInside,
    nearestResident: daily.nearestResident,
    interaction: daily.interaction,
  });
  useEffect(() => {
    dailyActions.current = {
      advance: daily.advance,
      walkPace: daily.walkPace,
      isInside: daily.isInside,
      cancel: daily.cancel,
      currentIndoor: daily.currentIndoor,
      moveInside: daily.moveInside,
      nearestResident: daily.nearestResident,
      interaction: daily.interaction,
    };
  }, [
    daily.advance,
    daily.walkPace,
    daily.isInside,
    daily.cancel,
    daily.currentIndoor,
    daily.moveInside,
    daily.nearestResident,
    daily.interaction,
  ]);
  const actorElements = useRef(new Map<ActorId, HTMLDivElement>());
  const spriteElements = useRef(new Map<ActorId, HTMLDivElement>());
  const keys = useRef(new Set<string>());
  const touchKeys = useRef(new Set<string>());
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  const cameraScene = useRef<'street' | 'map' | null>(null);
  const viewport = useRef({ width: 1000, height: 600 });
  const freeView = useRef<Point>({
    ...DISTRICT_LANDMARKS.find((place) => place.id === 'cafe')!,
  });
  const scenePlaceRef = useRef(scenePlace);
  const following = useRef<ActorId | null>(null);
  const manualCamera = useRef<Point | null>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    latest: Point;
    world: Point;
    scale: number;
    scene: CameraScene;
    dragged: boolean;
  } | null>(null);
  const pinch = useRef<{
    first: number;
    second: number;
    firstPoint: Point;
    secondPoint: Point;
    distance: number;
    zoom: number;
  } | null>(null);
  const settings = useRef({
    active,
    mode,
    scene,
    zoom,
    ready,
    interior: false,
  });
  const setZoom = useCallback(
    (
      next: number | ((current: number) => number),
      view?: CameraScene,
      fromPinch = false,
    ) => {
      if (!fromPinch) {
        pointer.current = null;
        pinch.current = null;
      }
      const targetScene = view ?? settings.current.scene;
      setZoomLevels((levels) => ({
        ...levels,
        [targetScene]: clampZoom(
          typeof next === 'function' ? next(levels[targetScene]) : next,
          targetScene,
        ),
      }));
    },
    [],
  );
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
  const period = lifePeriod(daily.view.minutes);
  const restoredIndoor = useRef(false);

  useEffect(() => {
    settings.current = {
      active,
      mode,
      scene,
      zoom,
      ready: ready && !suspended,
      interior: Boolean(interiorView),
    };
  }, [active, mode, scene, zoom, ready, interiorView, suspended]);
  useEffect(() => {
    if (!fate.loaded || restoredIndoor.current) return;
    const saved = fate.save.life?.indoor;
    if (!saved) return;
    let alive = true;
    queueMicrotask(() => {
      if (!alive || restoredIndoor.current) return;
      restoredIndoor.current = true;
      setActive(saved.actor);
      setMode('control');
      setScene('street');
      setInteriorView(saved.home);
      settings.current = {
        ...settings.current,
        active: saved.actor,
        mode: 'control',
        scene: 'street',
        interior: true,
      };
    });
    return () => {
      alive = false;
    };
  }, [fate.loaded, fate.save.life]);
  useEffect(() => {
    if (interiorView) interiorSurface.current?.focus({ preventScroll: true });
    else stage.current?.focus({ preventScroll: true });
  }, [interiorView]);
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
      cameraScene.current = null;
    });
    resize.observe(host);
    const stop = () => {
      keys.current.clear();
      touchKeys.current.clear();
      padHistory.current = null;
      pinch.current = null;
      pointer.current = null;
    };
    const wheel = (event: WheelEvent) => {
      if (
        !settings.current.ready ||
        settings.current.interior ||
        overlay.current ||
        event.ctrlKey ||
        event.metaKey ||
        !event.deltaY
      )
        return;
      event.preventDefault();
      setZoom((current) => current * Math.exp(-Math.sign(event.deltaY) * 0.1));
    };
    host.addEventListener('wheel', wheel, { passive: false });
    const keyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[role="listbox"]',
        )
      )
        return;
      const key = e.key.toLowerCase();
      // Keep native navigation inside the notebook; game controls do not steal movement.
      if (
        key.startsWith('arrow') &&
        (e.target as HTMLElement)?.closest(
          'summary,aside,[role="tablist"],[role="radiogroup"]',
        )
      )
        return;
      if (overlay.current) return;
      if (key === 'escape' && !e.repeat && !settings.current.interior) {
        e.preventDefault();
        padActions.current?.back();
        return;
      }
      if (settings.current.interior) {
        if (key === 'e' && !e.repeat && settings.current.mode === 'control') {
          e.preventDefault();
          padActions.current?.talk();
        }
        if (key === 'escape' && !e.repeat) {
          e.preventDefault();
          padActions.current?.back();
        }
        if (MOVE_KEYS.has(key) && settings.current.mode === 'control') {
          e.preventDefault();
          keys.current.add(key);
        }
        return;
      }
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
      if (!settings.current.ready) return;
      e.preventDefault();
      keys.current.add(key);
    };
    const keyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    const focusChanged = (event: FocusEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"]',
        )
      ) {
        keys.current.clear();
        touchKeys.current.clear();
      }
    };
    document.addEventListener('focusin', focusChanged);
    document.addEventListener('visibilitychange', stop);
    let raf = 0,
      last = 0,
      reported = '';
    let reportedPad = '';
    let reportedIndoorMoving = false;
    let reportedInteraction = '',
      interactionCheckedAt = 0;
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
          if (settings.current.interior) {
            if (action === 'back') padActions.current?.back();
            if (action === 'talk') padActions.current?.talk();
            continue;
          }
          if (action === 'talk') {
            padActions.current?.talk();
            continue;
          }
          if (action === 'back') {
            padActions.current?.back();
            continue;
          }
          if (action === 'previous' || action === 'next') {
            const index = BASE_CAST.findIndex(
              (p) => p.id === settings.current.active,
            );
            padActions.current?.choose(
              BASE_CAST[
                (index + (action === 'next' ? 1 : BASE_CAST.length - 1)) %
                  BASE_CAST.length
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
        if (opts.interior) {
          dailyActions.current.advance(dt);
          const keyboard = directionFromKeys(
            new Set([...keys.current, ...touchKeys.current]),
          );
          const manual = keyboard.x || keyboard.y ? keyboard : sampled.move;
          if (manual.x || manual.y) indoorPath.current = [];
          const position = dailyActions.current.currentIndoor();
          let input = manual;
          if (position && !manual.x && !manual.y) {
            while (
              indoorPath.current.length &&
              Math.hypot(
                indoorPath.current[0].x - position.x,
                indoorPath.current[0].y - position.y,
              ) < 2
            )
              indoorPath.current.shift();
            const next = indoorPath.current[0];
            if (next && dt) {
              input = {
                x:
                  (next.x - position.x) /
                  (INDOOR_SPEED * dailyActions.current.walkPace * dt),
                y:
                  (next.y - position.y) /
                  (INDOOR_SPEED * dailyActions.current.walkPace * dt),
              };
            }
          }
          dailyActions.current.moveInside(dt, input);
          const updated = dailyActions.current.currentIndoor();
          const walking = Boolean(
            position &&
            updated &&
            (position.x !== updated.x || position.y !== updated.y),
          );
          if (walking !== reportedIndoorMoving) {
            reportedIndoorMoving = walking;
            setIndoorMoving(walking);
          }
          raf = requestAnimationFrame(tick);
          return;
        }
        if (reportedIndoorMoving) {
          reportedIndoorMoving = false;
          setIndoorMoving(false);
        }
        const keyboard = directionFromKeys(
          new Set([...keys.current, ...touchKeys.current]),
        );
        const input = keyboard.x || keyboard.y ? keyboard : sampled.move;
        const walkingInput = input;
        if (opts.mode === 'control' && (input.x || input.y))
          manualCamera.current = null;
        if (opts.mode === 'observe') {
          const look =
            keyboard.x || keyboard.y
              ? keyboard
              : sampled.look.x || sampled.look.y
                ? sampled.look
                : sampled.move;
          if (look.x || look.y) {
            following.current = null;
            if (manualCamera.current) freeView.current = manualCamera.current;
            manualCamera.current = null;
          }
          freeView.current = {
            x: clamp(freeView.current.x + look.x * 350 * dt, 0, STREET.width),
            y: clamp(freeView.current.y + look.y * 350 * dt, 0, STREET.height),
          };
        }
        dailyActions.current.advance(dt);
        for (const actor of actors.current) {
          const controlled =
            opts.mode === 'control' && actor.id === opts.active;
          if (controlled)
            stepActor(
              actor,
              dt,
              walkingInput,
              WALK_SPEED * dailyActions.current.walkPace,
            );
          else if (actor.id === 'admin') actor.frame = 0;
          const node = actorElements.current.get(actor.id),
            sprite = spriteElements.current.get(actor.id);
          if (node) {
            const projected =
              opts.scene === 'street' ? streetScenePoint(actor) : actor;
            node.style.visibility =
              !controlled && dailyActions.current.isInside(actor.id)
                ? 'hidden'
                : 'visible';
            node.style.left = `${projected.x}px`;
            node.style.top = `${projected.y}px`;
            node.style.zIndex = String(Math.round(projected.y));
          }
          if (sprite) {
            sprite.style.backgroundPositionX = `${(actor.frame / 3) * 100}%`;
            sprite.style.transform = `scaleX(${actor.facing})`;
          }
        }
        const selected = actors.current.find((p) => p.id === opts.active)!;
        const route = journey.current;
        if (route) {
          const status =
            opts.mode === 'control'
              ? streetJourneyStatus(route, selected, walkingInput)
              : 'cancelled';
          if (status !== 'walking') {
            journey.current = null;
            setJourneyLabel(null);
            const message =
              status === 'arrived'
                ? `已到达${route.label}；可查看附近入口或活动。`
                : status === 'manual'
                  ? '已改为手动行走。'
                  : '已停止沿路前往。';
            setHint(message);
            setRouteNotice(status === 'manual' ? '' : message);
          }
        }
        if (now - interactionCheckedAt >= 120) {
          interactionCheckedAt = now;
          const near = dailyActions.current.nearestResident();
          const status = near ? dailyActions.current.interaction(near) : null;
          const home =
            opts.mode === 'control' ? nearbyHomeEntrance(selected) : null;
          const signature = `${near ?? ''}:${status?.message ?? ''}:${home ?? ''}`;
          if (signature !== reportedInteraction) {
            reportedInteraction = signature;
            setNearby(near);
            setNearbyStatus(status);
            setNearbyHome(home);
          }
          for (const actor of actors.current) {
            const node = actorElements.current.get(actor.id);
            if (node)
              node.dataset.crowded = String(
                actors.current.some(
                  (other) =>
                    other.id !== actor.id &&
                    !dailyActions.current.isInside(other.id) &&
                    Math.abs(other.x - actor.x) < 65 &&
                    Math.abs(other.y - actor.y) < 45,
                ),
              );
          }
        }
        const followed = following.current
          ? actors.current.find((p) => p.id === following.current)
          : undefined;
        if (opts.mode === 'observe' && followed)
          freeView.current = { x: followed.x, y: followed.y };
        const point =
          manualCamera.current ??
          (opts.mode === 'control' ? selected : freeView.current);
        if (opts.scene === 'street') {
          const place = nearbyStreetPlace(point, scenePlaceRef.current);
          if (place.id !== scenePlaceRef.current.id) {
            scenePlaceRef.current = place;
            setScenePlace(place);
          }
        }
        const target = sceneCameraFor(
          point,
          viewport.current.width,
          viewport.current.height,
          opts.zoom,
          opts.scene,
        );
        const next = easeCamera(
          camera.current,
          target,
          dt,
          cameraScene.current !== opts.scene ||
            Boolean(pointer.current?.dragged && !pinch.current) ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
        cameraScene.current = opts.scene;
        camera.current = next;
        if (world.current) {
          world.current.style.transform = `translate(${-next.x * next.scale}px,${-next.y * next.scale}px) scale(${next.scale})`;
          world.current.style.setProperty('--world-scale', String(next.scale));
        }
        if (marker.current) {
          const destination =
            opts.mode === 'control' ? selected.path.at(-1) : null;
          const visibleDestination = destination;
          marker.current.style.display = visibleDestination ? 'block' : 'none';
          if (visibleDestination) {
            const projected =
              opts.scene === 'street'
                ? streetScenePoint(destination)
                : destination;
            marker.current.style.left = `${projected.x}px`;
            marker.current.style.top = `${projected.y}px`;
          }
        }
        const nextPlace =
          opts.scene === 'street'
            ? scenePlaceRef.current.name
            : placeName(point);
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
      document.removeEventListener('focusin', focusChanged);
      document.removeEventListener('visibilitychange', stop);
      host.removeEventListener('wheel', wheel);
    };
  }, [setZoom]);

  function choose(id: ActorId) {
    manualCamera.current = null;
    setRouteNotice('');
    journey.current = null;
    setJourneyLabel(null);
    if (settings.current.mode === 'control') dailyActions.current.cancel();
    // Watching somebody must not interrupt that person or clear everyone else's route.
    const old = actors.current.find((p) => p.id === settings.current.active)!;
    if (settings.current.mode === 'control') old.path = [];
    const selected = actors.current.find((p) => p.id === id)!;
    if (settings.current.scene === 'street') {
      const place = nearbyStreetPlace(selected);
      scenePlaceRef.current = place;
      setScenePlace(place);
    }
    freeView.current = { x: selected.x, y: selected.y };
    following.current = id;
    keys.current.clear();
    touchKeys.current.clear();
    settings.current = { ...settings.current, active: id };
    setActive(id);
    setHint(
      settings.current.mode === 'observe'
        ? `正在跟随${CAST.find((p) => p.id === id)!.name}，人物仍自主生活；拖动画面可自由观察`
        : `正在控制${CAST.find((p) => p.id === id)!.name} · 摇杆、方向键或点击路面`,
    );
    if (!settings.current.interior)
      stage.current?.focus({ preventScroll: true });
  }
  function switchMode() {
    manualCamera.current = null;
    setRouteNotice('');
    journey.current = null;
    setJourneyLabel(null);
    dailyActions.current.cancel();
    const next = settings.current.mode === 'control' ? 'observe' : 'control';
    const selected = actors.current.find(
      (p) => p.id === settings.current.active,
    )!;
    if (settings.current.scene === 'street') {
      const place = nearbyStreetPlace(selected);
      scenePlaceRef.current = place;
      setScenePlace(place);
    }
    freeView.current = { x: selected.x, y: selected.y };
    selected.path = [];
    following.current = selected.id;
    keys.current.clear();
    touchKeys.current.clear();
    setMode(next);
    settings.current = { ...settings.current, mode: next };
    setHint(
      next === 'observe'
        ? '拖动画面或使用右摇杆；点击「开始日常」观察他们的生活'
        : 'WASD / 方向键在街景中行走；地图可选择远处目的地，路线仍在街景中显示',
    );
    stage.current?.focus({ preventScroll: true });
  }
  function recenter() {
    manualCamera.current = null;
    const selected = actors.current.find(
      (p) => p.id === settings.current.active,
    )!;
    if (settings.current.scene === 'street') {
      const place = nearbyStreetPlace(selected);
      scenePlaceRef.current = place;
      setScenePlace(place);
    }
    freeView.current = { x: selected.x, y: selected.y };
    following.current = selected.id;
  }
  function openDialog(
    value: 'settings' | PartnerId,
    speaker: ActorId = settings.current.active,
    preserveRoutes = settings.current.interior,
  ) {
    journey.current = null;
    setJourneyLabel(null);
    dailyActions.current.cancel();
    overlay.current = true;
    keys.current.clear();
    touchKeys.current.clear();
    pointer.current = null;
    if (!preserveRoutes && settings.current.mode === 'control')
      actors.current.find(
        (actor) => actor.id === settings.current.active,
      )!.path = [];
    setDialogSpeaker(speaker);
    setDialog(value);
  }
  function closeDialog() {
    overlay.current = false;
    setDialog(null);
    keys.current.clear();
    touchKeys.current.clear();
    if (settings.current.interior)
      interiorSurface.current?.focus({ preventScroll: true });
    else stage.current?.focus({ preventScroll: true });
  }
  function visitInterior(value: InteriorView) {
    if (daily.currentIndoor()) daily.leaveHome();
    keys.current.clear();
    touchKeys.current.clear();
    indoorPath.current = [];
    pointer.current = null;
    setAtlasOpen(false);
    setSelectedPlace(null);
    settings.current = { ...settings.current, interior: true };
    setInteriorView(value);
  }
  function enterInterior(home: keyof typeof FATE_HOMES) {
    if (!daily.enterHome(home)) {
      setHint('请先进入角色，沿街走到住宅门前。');
      return;
    }
    journey.current = null;
    setJourneyLabel(null);
    setRouteNotice('');
    keys.current.clear();
    touchKeys.current.clear();
    indoorPath.current = [];
    pointer.current = null;
    setAtlasOpen(false);
    setSelectedPlace(null);
    settings.current = { ...settings.current, interior: true, scene: 'street' };
    setScene('street');
    setInteriorView(home);
    setHint(`已进入${FATE_HOMES[home].name}，可在室内沿走廊移动。`);
  }
  function leaveInterior() {
    daily.leaveHome();
    keys.current.clear();
    touchKeys.current.clear();
    indoorPath.current = [];
    setIndoorMoving(false);
    pointer.current = null;
    settings.current = { ...settings.current, interior: false };
    setInteriorView(null);
  }
  function walkInside(point: Point) {
    const position = daily.currentIndoor();
    if (!position) return;
    indoorPath.current = indoorRoute(position, point, position.home);
    interiorSurface.current?.focus({ preventScroll: true });
  }
  function indoorDirection(key: string, pressed: boolean) {
    if (pressed) {
      indoorPath.current = [];
      touchKeys.current.add(key);
    } else touchKeys.current.delete(key);
  }
  function talkInside(id: PartnerId) {
    if (!interiorView || interiorView === 'directory') return;
    const status = daily.interaction(id);
    if (!status.ok) {
      setHint(status.message);
      return;
    }
    openDialog(id, settings.current.active, true);
  }
  function talk() {
    if (settings.current.mode !== 'control') return;
    const near = dailyActions.current.nearestResident();
    const status = near ? dailyActions.current.interaction(near) : null;
    if (!settings.current.interior && !status?.ok) {
      const actor = actors.current.find(
        (item) => item.id === settings.current.active,
      )!;
      const home = nearbyHomeEntrance(actor);
      if (home) {
        enterInterior(home);
        return;
      }
    }
    if (!near) {
      setHint('靠近人物或住宅入口，再按 E 或点击提示操作。');
      return;
    }
    if (!status?.ok) {
      setHint(status?.message ?? '请再靠近一些。');
      return;
    }
    openDialog(near, settings.current.active, settings.current.interior);
  }
  function stopWalking() {
    if (settings.current.mode !== 'control') return;
    const actor = actors.current.find(
      (item) => item.id === settings.current.active,
    )!;
    actor.path = [];
    indoorPath.current = [];
    keys.current.clear();
    touchKeys.current.clear();
    journey.current = null;
    setJourneyLabel(null);
    setRouteNotice('已停下；点击路面或使用方向键继续。');
    setHint('已停下；点击路面或使用方向键继续。');
    stage.current?.focus({ preventScroll: true });
  }
  function goBack() {
    if (dialog) closeDialog();
    else if (selectedPlace) setSelectedPlace(null);
    else if (atlasOpen) setAtlasOpen(false);
    else if (lifePanel) setLifePanel(false);
    else if (settings.current.interior) leaveInterior();
    else stopWalking();
  }
  useEffect(() => {
    padActions.current = {
      choose,
      toggle: switchMode,
      center: recenter,
      talk,
      back: goBack,
    };
  });
  function selectHomeEntrance(event: { currentTarget: HTMLButtonElement }) {
    const home = event.currentTarget.dataset.home as keyof typeof FATE_HOMES;
    if (!Object.hasOwn(FATE_HOMES, home)) return;
    if (
      mode === 'control' &&
      nearHomeEntrance(daily.view.positions[active], home)
    )
      enterInterior(home);
    else selectPlace(DISTRICT_LANDMARKS.find((place) => place.id === home)!);
  }
  function selectPlace(place: DistrictLandmark) {
    setSelectedPlace(place);
    setPublicNotice('');
    setAtlasOpen(false);
    if (settings.current.mode === 'observe') {
      manualCamera.current = null;
      following.current = null;
      freeView.current = { ...placeDestination(place) };
    }
    setHint('已选择' + place.name + '；点击地点卡即可让当前人物沿路前往');
  }
  function toggleScene() {
    if (settings.current.scene === 'street') {
      settings.current = { ...settings.current, scene: 'map' };
      setScene('map');
      setAtlasOpen(true);
      setLifePanel(false);
      setHint('冬木市地图已打开；选择地点或人物定位');
      return;
    }
    const point =
      manualCamera.current ??
      (settings.current.mode === 'control'
        ? actors.current.find((p) => p.id === settings.current.active)!
        : freeView.current);
    const place = nearbyStreetPlace(point);
    scenePlaceRef.current = place;
    setScenePlace(place);
    settings.current = { ...settings.current, scene: 'street' };
    setScene('street');
    setAtlasOpen(false);
    setSelectedPlace(null);
    keys.current.clear();
    touchKeys.current.clear();
    setHint('已进入连续街区；沿道路行走可经过不同区域');
    stage.current?.focus({ preventScroll: true });
  }
  function travelToPlace(destination: DistrictLandmark) {
    if (settings.current.mode === 'observe') switchMode();
    if (!startWalking(placeDestination(destination), destination.name)) return;
    settings.current = { ...settings.current, scene: 'street' };
    setScene('street');
    setAtlasOpen(false);
    setSelectedPlace(null);
  }
  function startWalking(point: Point, label: string, groundClick = false) {
    if (
      !settings.current.ready ||
      settings.current.mode !== 'control' ||
      overlay.current
    )
      return false;
    const actor = actors.current.find(
      (item) => item.id === settings.current.active,
    )!;
    const plan = planStreetWalk(actor, point, groundClick);
    if (plan.status !== 'walking') {
      if (plan.status === 'arrived') {
        actor.path = [];
        journey.current = null;
        setJourneyLabel(null);
      }
      const previous = journey.current;
      const message =
        previous && actor.path.length
          ? `${plan.message}仍在前往${previous.label}，可点“停止行走”。`
          : plan.message;
      setHint(message);
      setRouteNotice(message);
      return false;
    }
    keys.current.clear();
    touchKeys.current.clear();
    actor.path = plan.path;
    manualCamera.current = null;
    journey.current = { actor: actor.id, destination: plan.destination, label };
    setJourneyLabel(label);
    setRouteNotice('');
    setHint(`正在前往${label}；方向键可改向，Esc 可停止。`);
    stage.current?.focus({ preventScroll: true });
    return true;
  }
  function walkToPlace() {
    if (selectedPlace) travelToPlace(selectedPlace);
  }
  function teleportToPlace() {
    if (!selectedPlace) return;
    const result = daily.teleport(placeDestination(selectedPlace));
    setPublicNotice(result.message);
    if (!result.ok) return;
    keys.current.clear();
    touchKeys.current.clear();
    pointer.current = null;
    pinch.current = null;
    indoorPath.current = [];
    journey.current = null;
    setJourneyLabel(null);
    recenter();
    cameraScene.current = null;
    const message = `已传送到${selectedPlace.name}，可在附近互动。`;
    setRouteNotice(message);
    setHint(message);
    setAtlasOpen(false);
    setSelectedPlace(null);
    stage.current?.focus({ preventScroll: true });
  }
  function doPublicAction(action: PublicVisitAction, target?: PartnerId) {
    if (!selectedPlace || selectedPlace.kind === 'home') return;
    const result = daily.visitPublic(
      selectedPlace.id as PublicPlaceId,
      action,
      target,
    );
    setPublicNotice(result.message);
    setHint(result.message);
  }
  function walkToOutingPoint(point: Point) {
    if (!startWalking(point, '河岸观察点')) return;
    setSelectedPlace(null);
    setAtlasOpen(false);
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0 || !ready) return;
    stage.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch' && pointer.current) {
      const first = pointer.current;
      first.dragged = true;
      pinch.current = {
        first: first.id,
        second: e.pointerId,
        firstPoint: { ...first.latest },
        secondPoint: { x: e.clientX, y: e.clientY },
        distance: Math.max(
          1,
          Math.hypot(first.latest.x - e.clientX, first.latest.y - e.clientY),
        ),
        zoom: settings.current.zoom,
      };
      return;
    }
    pointer.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      latest: { x: e.clientX, y: e.clientY },
      world: cameraAnchor(
        camera.current,
        viewport.current.width,
        viewport.current.height,
        settings.current.scene,
      ),
      scale: camera.current.scale,
      scene: settings.current.scene,
      dragged: false,
    };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = pointer.current;
    if (p?.id === e.pointerId) p.latest = { x: e.clientX, y: e.clientY };
    const gesture = pinch.current;
    if (
      gesture &&
      (e.pointerId === gesture.first || e.pointerId === gesture.second)
    ) {
      const point = { x: e.clientX, y: e.clientY };
      if (e.pointerId === gesture.first) gesture.firstPoint = point;
      else gesture.secondPoint = point;
      const distance = Math.hypot(
        gesture.firstPoint.x - gesture.secondPoint.x,
        gesture.firstPoint.y - gesture.secondPoint.y,
      );
      setZoom((gesture.zoom * distance) / gesture.distance, undefined, true);
      return;
    }
    if (!p || p.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) p.dragged = true;
    if (p.dragged) {
      following.current = null;
      manualCamera.current = panCamera(
        p.world,
        { x: e.clientX - p.x, y: e.clientY - p.y },
        p.scale,
        p.scene,
      );
    }
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (pinch.current) {
      pinch.current = null;
      pointer.current = null;
      return;
    }
    const p = pointer.current;
    pointer.current = null;
    if (!p || p.id !== e.pointerId || p.dragged || mode !== 'control') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const wanted = screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
      camera.current,
    );
    const requested =
      scene === 'street'
        ? { x: wanted.x / STREET_SCENE_SCALE, y: wanted.y / STREET_SCENE_SCALE }
        : wanted;
    startWalking(requested, '选中的路面', true);
  }
  function reset() {
    manualCamera.current = null;
    journey.current = null;
    setJourneyLabel(null);
    dailyActions.current.cancel();
    actors.current = createStreetActors();
    daily.resetPlans();
    keys.current.clear();
    touchKeys.current.clear();
    setAtlasOpen(false);
    setSelectedPlace(null);
    settings.current = {
      ...settings.current,
      scene: 'street',
      mode: 'observe',
    };
    setScene('street');
    setMode('observe');
    const cafe = DISTRICT_LANDMARKS.find((place) => place.id === 'cafe')!;
    scenePlaceRef.current = cafe;
    setScenePlace(cafe);
    freeView.current = { x: cafe.x, y: cafe.y };
    following.current = null;
    setZoomLevels({ street: DEFAULT_ZOOM, map: DEFAULT_ZOOM });
    setHint('已回到街道起点');
    stage.current?.focus({ preventScroll: true });
  }
  const selectedShopItem =
    selectedPlace?.id === 'shops' && isPartner(active)
      ? shoppingChoice(daily.view, active)
      : undefined;

  const encounter = liveEncounter(daily.view)?.dialogue;
  const speech = liveSpeech(daily.view);
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="返回世界">
          <span className={styles.wordmark}>
            SINE<span> / </span>FINE
          </span>
          <span className={styles.brandChinese}>无终之庭</span>
        </Link>
        <div className={styles.location}>
          <MapPin size={16} />
          <span>
            {interiorView
              ? interiorView === 'directory'
                ? '冬木 · 住宅'
                : FATE_HOMES[interiorView].name
              : location}
          </span>
          <small>{lifePeriod(daily.view.minutes)}</small>
        </div>
        <div className={styles.headerActions}>
          <Link
            href="/fate/art-sample"
            className={styles.aiButton}
            aria-label="查看街道美术小样"
          >
            <Palette size={16} />
            <span>美术小样</span>
          </Link>
          <button
            type="button"
            className={styles.aiButton}
            aria-label={scene === 'street' ? '查看冬木市地图' : '返回街区行走'}
            aria-pressed={scene === 'map'}
            disabled={!ready || !fate.loaded}
            onClick={() => {
              if (interiorView) leaveInterior();
              toggleScene();
            }}
          >
            <MapIcon size={16} />
            <span>{scene === 'street' ? '地图' : '街区'}</span>
          </button>
          <button
            type="button"
            className={styles.aiButton}
            onClick={() => visitInterior('directory')}
            disabled={!ready || !fate.loaded}
            aria-label="查看住宅"
            aria-pressed={Boolean(interiorView)}
          >
            <House size={16} />
            <span>住宅</span>
          </button>
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
            aria-label={fate.verified ? 'DeepSeek 已连接' : '连接 DeepSeek'}
            onClick={() => openDialog('settings')}
          >
            <Settings2 size={16} />
            <span>{fate.verified ? 'DeepSeek 已连接' : '连接 DeepSeek'}</span>
          </button>
          <Link href="/" className={styles.back} aria-label="返回世界">
            <ArrowLeft size={16} />
            <span>返回世界</span>
          </Link>
        </div>
      </header>
      <LifeControls
        walkPace={daily.walkPace}
        onWalkPace={daily.changeWalkPace}
        life={daily}
        disabled={!ready || !fate.loaded}
        open={lifePanel}
        onToggle={() => {
          setAtlasOpen(false);
          setSelectedPlace(null);
          setLifePanel((v) => !v);
        }}
        verified={fate.verified}
        onSettings={() => openDialog('settings')}
      />
      {!outing && (
        <LifeReminder
          key={mode === 'control' ? active : 'observe'}
          life={daily}
          controlled={mode === 'control' ? active : null}
          onOpen={(section) => {
            setLifeSection(section);
            setAtlasOpen(false);
            setSelectedPlace(null);
            setLifePanel(true);
          }}
        />
      )}
      {outing && (
        <div className={styles.outingReminder}>
          <span>
            {publicOutingTitle(outing)} ·{' '}
            {outing.phase === 'choice'
              ? '有一个选择等着你'
              : outing.phase === 'ready'
                ? '可以看看这次的发现'
                : '正在进行'}
          </span>
          <button
            onClick={() =>
              selectPlace(
                DISTRICT_LANDMARKS.find(
                  (place) =>
                    place.id === (outing.kind === 'cafe' ? 'cafe' : 'park'),
                )!,
              )
            }
          >
            继续这段小日常
          </button>
        </div>
      )}
      <div className={styles.streetBody}>
        <div className={styles.stageWrap}>
          <div
            ref={stage}
            className={`${styles.stage} ${mode === 'observe' ? styles.observing : ''}`}
            tabIndex={interiorView ? -1 : 0}
            inert={Boolean(interiorView)}
            aria-hidden={Boolean(interiorView)}
            style={{
              opacity: interiorView ? 0 : 1,
              pointerEvents: interiorView ? 'none' : undefined,
            }}
            role="application"
            aria-label="冬木市连续街道；拖动查看地图，点击路面或方向键控制人物行走"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointer.current = null;
              pinch.current = null;
            }}
          >
            <div
              ref={world}
              className={`${styles.world} ${scene === 'map' ? styles.mapWorld : ''}`}
              style={{
                width:
                  STREET.width * (scene === 'street' ? STREET_SCENE_SCALE : 1),
                height:
                  STREET.height * (scene === 'street' ? STREET_SCENE_SCALE : 1),
              }}
            >
              {scene === 'street' ? (
                <FateStreetScenery period={period} />
              ) : (
                <div className={styles.background}>
                  <FateCityScenery period={period} />
                </div>
              )}
              {ready && outingPoint && (
                <button
                  className={styles.outingMarker}
                  style={{
                    left:
                      outingPoint.x *
                      (scene === 'street' ? STREET_SCENE_SCALE : 1),
                    top:
                      outingPoint.y *
                      (scene === 'street' ? STREET_SCENE_SCALE : 1),
                  }}
                  onClick={() => walkToOutingPoint(outingPoint)}
                  aria-label={`走到第 ${outing!.step + 1} 处观察点`}
                >
                  <MapPin size={16} />
                  观察点 {outing!.step + 1}
                </button>
              )}
              {ready &&
                scene === 'map' &&
                DISTRICT_LANDMARKS.map((place) => (
                  <button
                    type="button"
                    key={place.id}
                    className={styles.landmark}
                    style={{
                      left: placeDestination(place).x,
                      top: placeDestination(place).y - 24,
                    }}
                    aria-label={'查看' + place.name}
                    onClick={() => selectPlace(place)}
                  >
                    <MapPin size={13} />
                    <span>
                      {place.id === 'einzbern'
                        ? '切嗣新居'
                        : place.id === 'temple'
                          ? '柳洞寺'
                          : place.id === 'school'
                            ? '穗群原学园'
                            : place.id === 'shops'
                              ? '商店侧巷'
                              : place.id === 'park'
                                ? '河岸公园'
                                : place.name
                                    .split(' · ')[0]
                                    .replace('士郎的家', '')}
                    </span>
                  </button>
                ))}
              {ready &&
                scene === 'street' &&
                Object.values(HOME_ENTRANCES).map((entrance) => (
                  <button
                    key={`door-${entrance.home}`}
                    type="button"
                    className={styles.homeEntrance}
                    style={{
                      left: entrance.door.x * STREET_SCENE_SCALE,
                      top: entrance.door.y * STREET_SCENE_SCALE,
                    }}
                    aria-label={`${FATE_HOMES[entrance.home].name} · 住宅入口`}
                    data-home={entrance.home}
                    onClick={selectHomeEntrance}
                  >
                    <House size={14} />
                    {FATE_HOMES[entrance.home].name.split(' · ')[0]}
                    <small>入口</small>
                  </button>
                ))}
              {ready &&
                CAST.map((person) => {
                  const height =
                    scene === 'street'
                      ? person.id === 'iskandar'
                        ? 166
                        : 138
                      : person.id === 'iskandar'
                        ? 130
                        : 108;
                  return (
                    <div
                      key={person.id}
                      ref={(node) => {
                        if (node) actorElements.current.set(person.id, node);
                        else actorElements.current.delete(person.id);
                      }}
                      className={`${styles.actor} ${person.id === 'iskandar' ? styles.mounted : ''} ${person.id === active ? styles.selectedActor : ''} ${person.id === active && mode === 'control' ? styles.controlled : ''} ${person.id === nearby ? styles.nearbyActor : ''}`}
                      style={{
                        width: height * person.aspect,
                        height,
                      }}
                    >
                      <div className={styles.groundShadow} />
                      {speech?.speaker === person.id && (
                        <span
                          className={styles.speechBubble}
                          title={
                            speech.source === 'deepseek'
                              ? 'AI 现场交谈'
                              : '预设现场交谈'
                          }
                        >
                          {speech.text}
                        </span>
                      )}
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
                              : encounter &&
                                  [
                                    encounter.speaker,
                                    encounter.target,
                                  ].includes(person.id)
                                ? '停下脚步 · 交谈中'
                                : lifeStatus(daily.view.people[person.id])}
                          </small>
                        )}
                      </span>
                    </div>
                  );
                })}

              <div ref={marker} className={styles.destination} />
            </div>
          </div>
          {!interiorView && (
            <>
              <div className={styles.modeBadge}>
                <span className={styles.liveDot} />
                {mode === 'control' ? `正在控制 · ${current.name}` : '自由观察'}
                <span className={styles.preview}>
                  {lifeTime(daily.view.minutes).split(' · ')[1]}
                </span>
              </div>
              {scene === 'map' && (
                <button
                  type="button"
                  className={styles.mapDirectoryButton}
                  aria-label="打开地图目录"
                  aria-expanded={atlasOpen}
                  onClick={() => {
                    setLifePanel(false);
                    setSelectedPlace(null);
                    setAtlasOpen((open) => !open);
                  }}
                >
                  <MapPin size={15} /> 地点目录
                </button>
              )}
              {scene === 'street' && !selectedPlace && (
                <div className={styles.streetPlaceBadge}>
                  <MapPin size={15} />
                  <span>{scenePlace.name}</span>
                  <button
                    type="button"
                    onClick={() => travelToPlace(scenePlace)}
                  >
                    沿街前往
                  </button>
                  {scenePlace.kind !== 'home' && (
                    <button
                      type="button"
                      onClick={() => selectPlace(scenePlace)}
                    >
                      到场活动
                    </button>
                  )}
                  {scenePlace.kind === 'home' && (
                    <button
                      type="button"
                      disabled={
                        mode === 'control' &&
                        !nearHomeEntrance(
                          daily.view.positions[active],
                          scenePlace.id as keyof typeof FATE_HOMES,
                        )
                      }
                      onClick={() =>
                        mode === 'control'
                          ? enterInterior(
                              scenePlace.id as keyof typeof FATE_HOMES,
                            )
                          : visitInterior(
                              scenePlace.id as keyof typeof FATE_HOMES,
                            )
                      }
                    >
                      {mode === 'control' ? '进入住宅' : '观察住宅'}
                    </button>
                  )}
                </div>
              )}
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
                  disabled={!fate.loaded || (!nearbyStatus?.ok && !nearbyHome)}
                  title={
                    !nearbyStatus?.ok && nearbyHome
                      ? '按 E 或手柄 A 进入住宅'
                      : nearbyStatus?.message
                  }
                >
                  {!nearbyStatus?.ok && nearbyHome ? (
                    <House size={16} />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                  {!nearbyStatus?.ok && nearbyHome
                    ? `进入${FATE_HOMES[nearbyHome].name}`
                    : nearby
                      ? nearbyStatus?.ok
                        ? `与${fatePerson(nearby, waverStage)!.name}交谈`
                        : nearbyStatus?.message
                      : '靠近人物交谈，或走到住宅入口'}
                  <kbd>E / A</kbd>
                </button>
              )}
              {mode === 'control' && (journeyLabel || routeNotice) && (
                <div className={styles.navigationNotice}>
                  <output>{routeNotice || `正在前往 · ${journeyLabel}`}</output>
                  {journeyLabel ? (
                    <button type="button" onClick={stopWalking}>
                      停止行走 <kbd>Esc</kbd>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRouteNotice('')}
                      aria-label="收起行走提示"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <div className={styles.cameraTools}>
                <button
                  onClick={() => setZoom((v) => v / 1.15)}
                  disabled={zoom <= zoomLimits.min}
                  aria-label="拉远镜头"
                  title={zoom <= zoomLimits.min ? '已拉到最远' : '拉远镜头'}
                >
                  <Minus size={19} />
                </button>
                <button
                  onClick={recenter}
                  aria-label="镜头回到人物"
                  title="镜头回到人物，保留当前缩放"
                >
                  <Focus size={14} />
                </button>
                <button
                  type="button"
                  className={styles.zoomReset}
                  onClick={() => setZoom(DEFAULT_ZOOM)}
                  aria-label="恢复默认缩放"
                  title={`当前 ${zoomPercent}%；点击恢复 100%`}
                >
                  <span>{zoomPercent}%</span>
                </button>
                <button
                  onClick={() => setZoom((v) => v * 1.15)}
                  disabled={zoom >= zoomLimits.max}
                  aria-label="拉近镜头"
                  title={zoom >= zoomLimits.max ? '已拉到最近' : '拉近镜头'}
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
            </>
          )}
          {!interiorView && selectedPlace && (
            <DistrictPlaceCard
              place={selectedPlace}
              control={mode === 'control'}
              traveler={
                CAST.find((person) => person.id === active)?.name ?? '当前人物'
              }
              arrived={
                selectedPlace.kind === 'home'
                  ? nearHomeEntrance(
                      daily.view.positions[active],
                      selectedPlace.id as keyof typeof FATE_HOMES,
                    )
                  : Math.hypot(
                      daily.view.positions[active].x - selectedPlace.x,
                      daily.view.positions[active].y - selectedPlace.y,
                    ) <= PUBLIC_VISIT_RADIUS
              }
              onWalk={walkToPlace}
              onTeleport={teleportToPlace}
              onPublicAction={doPublicAction}
              activity={
                selectedPlace.id === 'cafe' || selectedPlace.id === 'park' ? (
                  <StreetOutingPanel
                    key={`${active}:${selectedPlace.id}`}
                    daily={daily}
                    actor={active}
                    place={selectedPlace.id}
                    control={mode === 'control'}
                    arrived={
                      Math.hypot(
                        daily.view.positions[active].x - selectedPlace.x,
                        daily.view.positions[active].y - selectedPlace.y,
                      ) <= PUBLIC_VISIT_RADIUS
                    }
                    onWalk={walkToOutingPoint}
                  />
                ) : undefined
              }
              shopLabel={
                selectedShopItem
                  ? `购买${SUPPLIES[selectedShopItem]} · ${SUPPLY_PRICES[selectedShopItem]} 生活点`
                  : null
              }
              shopAffordable={
                selectedShopItem !== undefined &&
                isPartner(active) &&
                canAfford(daily.view.economy, active, selectedShopItem)
              }
              notice={publicNotice}
              onVisit={(home) => {
                setSelectedPlace(null);
                visitInterior(home);
              }}
              onEnter={(home) => {
                setSelectedPlace(null);
                enterInterior(home);
              }}
              onClose={() => setSelectedPlace(null)}
            />
          )}
          {interiorView && (
            <div
              ref={interiorSurface}
              className={interiorStyles.surface}
              tabIndex={-1}
            >
              <FateInterior
                view={interiorView}
                life={daily.view}
                controlled={mode === 'control' ? active : null}
                running={daily.running}
                onVisit={visitInterior}
                onReturn={leaveInterior}
                onTalk={talkInside}
                onStreet={(id) => {
                  leaveInterior();
                  if (settings.current.mode === 'control') switchMode();
                  choose(id);
                }}
                indoor={daily.view.indoor}
                sprite={current}
                moving={indoorMoving}
                onWalkTo={walkInside}
                onDirection={indoorDirection}
                onCare={(action) => {
                  keys.current.clear();
                  touchKeys.current.clear();
                  indoorPath.current = [];
                  setIndoorMoving(false);
                  return daily.homeCare(action);
                }}
              />
            </div>
          )}
        </div>
        {atlasOpen && scene === 'map' && !interiorView ? (
          <DistrictAtlas
            life={daily.view}
            active={active}
            onClose={() => setAtlasOpen(false)}
            onSelect={selectPlace}
            onFind={(id) => {
              if (settings.current.mode === 'control') switchMode();
              setSelectedPlace(null);
              setAtlasOpen(false);
              choose(id);
              const home = daily.view.people[id].activity?.home;
              if (home && dailyActions.current.isInside(id))
                visitInterior(home);
            }}
          />
        ) : lifePanel ? (
          <LifePanel
            key={`${mode}-${active}`}
            section={lifeSection}
            onSectionChange={setLifeSection}
            life={daily}
            controlled={mode === 'control' ? active : null}
            verified={fate.verified}
            storageNotice={fate.storageNotice}
            onSettings={() => openDialog('settings')}
            onClose={() => setLifePanel(false)}
            onHome={(home) => {
              const place = DISTRICT_LANDMARKS.find(
                (place) => place.id === home,
              )!;
              if (daily.view.indoor) {
                setLifePanel(false);
                setHint('已经在屋内，走到餐桌或休息间即可安排日常。');
              } else {
                setLifePanel(false);
                travelToPlace(place);
              }
            }}
          />
        ) : !interiorView ? (
          <StreetObserver
            life={daily}
            watched={active}
            onFocus={(id) => {
              if (settings.current.mode === 'control') switchMode();
              choose(id);
            }}
          />
        ) : null}
      </div>
      {!interiorView && (
        <footer className={styles.footer}>
          <div className={styles.controlIntro}>
            <span className={styles.eyebrow}>
              {mode === 'control' ? '暂时进入角色' : '观察人物'}
            </span>
            <p>{mode === 'control' ? '随时返回观察' : '选择人物跟随镜头'}</p>
          </div>
          <div
            ref={castList}
            className={styles.cast}
            aria-label="横向浏览人物，观察模式下选择只跟随镜头"
          >
            {CAST.map((person) => (
              <button
                key={person.id}
                disabled={!ready}
                onClick={() => choose(person.id)}
                className={`${styles.castCard} ${active === person.id ? styles.selected : ''}`}
                aria-pressed={active === person.id}
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
              {mode === 'control' ? (
                <Eye size={18} />
              ) : (
                <Footprints size={18} />
              )}
              <span>{mode === 'control' ? '返回观察' : '进入角色'}</span>
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
                <p>默认旁观自主生活，选择人物只跟随镜头</p>
                <p>「地图」查看冬木市两岸道路；选地点后可沿桥和街道步行前往</p>
                <p>选地点后可直接带当前人物前往；WASD / 方向键可随时改走向</p>
                <p>
                  街区是一张连续场景；镜头会跟随人物，经过路口和桥梁时不会切换画面
                </p>
                <p>
                  拖动画面可查看其他地区，控制人物时也能拖动；开始行走或点定位恢复跟随
                </p>
                <p>
                  右上角 ＋ /
                  −、滚轮或双指：缩放；定位按钮只回到人物，倍率按钮恢复 100%
                </p>
                <p>
                  街区可调 5%—1000%，地图可调 25%—2000%；两种视图分别保留倍率
                </p>
                <p className={styles.helpLabel}>手柄 · 连接后按任意按钮</p>
                <p>左摇杆 / 十字键：走动</p>
                <p>LB / RB（L1 / R1）：切换人物</p>
                <p>Y（△）：切换自由观察</p>
                <p>右摇杆：自由观察时移动镜头</p>
                <p>Menu / Options：镜头回到人物</p>
                <p>E / A（×）：与附近可交谈人物交谈；住宅门前可直接进屋</p>
                <p>B（○）/ Esc：关闭当前面板；沿路行走时停止</p>
                <p>
                  点击「开始日常」观察二十一位 Fate 人物自主行动。连接 DeepSeek
                  并开启「AI
                  自主交谈」也会启动日常；相遇的两个人会自由接话，显示在旁听栏里。进入角色可主动干预。离开页面后日常暂停。
                </p>
              </div>
            </details>
          </div>
        </footer>
      )}
      {dialog === 'settings' ? (
        <FateAISettings onClose={closeDialog} />
      ) : dialog ? (
        <FateConversation
          key={`${dialog}-${dialogSpeaker}`}
          target={dialog}
          speaker={dialogSpeaker}
          onClose={closeDialog}
          onSettings={() => openDialog('settings')}
          onsite={{
            check: () => daily.interaction(dialog),
            commit: daily.commitConversation,
          }}
        />
      ) : null}
    </main>
  );
}
