'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- This keyboard-controlled game uses a focusable application surface, not a document region. */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Map as MapIcon,
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
  WALK_SPEED,
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
import { StreetObserver } from './street-observer';
import { lifePeriod, lifeStatus, lifeTime } from '@/lib/fate-life';
import { FateInterior, type InteriorView } from './fate-interior';
import { FATE_HOMES } from '@/lib/fate-housing';
import {
  DistrictAtlas,
  DistrictPlaceCard,
} from './fate-district-map';
import { FateStreetScenery } from './fate-street-scenery';
import { FateCityScenery } from './fate-city-scenery';
import {
  DISTRICT_LANDMARKS,
  districtSceneImage,
  nearestDistrictLandmark,
  streetLinksFrom,
  STREET_SCENE_SCALE,
  streetScenePoint,
  type DistrictLandmark,
} from '@/lib/fate-district';
import { interiorResidents } from '@/lib/fate-interior';
import interiorStyles from './fate-interior.module.css';
import styles from './street-walk.module.css';

const BASE_CAST = [
  // Keep the order aligned with the available street residents and gamepad cycling.
  {
    id: 'admin' as const,
    name: '管理员',
    caption: '可选的来访身份',
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
  {
    id: 'diarmuid' as const,
    name: '迪卢木多',
    caption: '第四次 · Lancer',
    image: '/fate/street/lancers-walk.png',
    row: 0,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'cu' as const,
    name: '库·丘林',
    caption: '第五次 · Lancer',
    image: '/fate/street/lancers-walk.png',
    row: 1,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'waver' as const,
    name: '韦伯',
    caption: 'Fate/Zero 青年',
    image: '/fate/street/waver-walk.png',
    row: 0,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'iskandar' as const,
    name: '伊斯坎达尔',
    caption: '征服王 · 骑乘布塞法拉斯',
    image: '/fate/street/iskandar-walk.png',
    row: 0,
    rows: 1,
    aspect: 1,
  },
  {
    id: 'medea' as const,
    name: '美狄亚',
    caption: 'Caster · 摘下兜帽',
    image: '/fate/street/medea-kuzuki-walk.png',
    row: 0,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'kuzuki' as const,
    name: '葛木宗一郎',
    caption: '以行动表达选择',
    image: '/fate/street/medea-kuzuki-walk.png',
    row: 1,
    rows: 2,
    aspect: 1,
  },
  {
    id: 'gilgamesh' as const,
    name: '吉尔伽美什',
    caption: 'Archer · 英雄王',
    image: '/fate/street/gilgamesh-walk.png',
    row: 0,
    rows: 1,
    aspect: 0.75,
  },
  {
    id: 'medusa' as const,
    name: '美杜莎',
    caption: 'Rider · 安静的守望',
    image: '/fate/street/medusa-walk.png',
    row: 0,
    rows: 1,
    aspect: 0.75,
  },
  {
    id: 'tokiomi' as const,
    name: '远坂时臣',
    caption: '远坂家的父亲',
    image: '/fate/street/tokiomi-walk.png',
    row: 0,
    rows: 1,
    aspect: 0.75,
  },
  {
    id: 'kirei' as const,
    name: '言峰绮礼',
    caption: '教会里的倾听者',
    image: '/fate/street/kirei-walk.png',
    row: 0,
    rows: 1,
    aspect: 0.75,
  },
  {
    id: 'kariya' as const,
    name: '间桐雁夜',
    caption: '有希望的日常',
    image: '/fate/street/kariya-walk.png',
    row: 0,
    rows: 1,
    aspect: 0.75,
  },
  {
    id: 'emiya' as const,
    name: 'EMIYA',
    caption: 'Archer · 务实的料理人',
    image: '/fate/street/emiya-walk.png',
    row: 0,
    rows: 1,
    aspect: 0.75,
  },
  {
    id: 'natalia' as const,
    name: '娜塔莉亚',
    caption: '切嗣的养母与师父',
    image: '/fate/street/natalia-walk.png',
    row: 0,
    rows: 1,
    aspect: 0.75,
  },
];
const ASSETS = [
  ...new Set(BASE_CAST.map((p) => p.image)),
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

export default function StreetWalk() {
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
  const [dialog, setDialog] = useState<'settings' | PartnerId | null>(null);
  const [dialogSpeaker, setDialogSpeaker] = useState<ActorId>('admin');
  const [interiorView, setInteriorView] = useState<InteriorView | null>(null);
  const interiorSurface = useRef<HTMLDivElement>(null);
  const overlay = useRef(false);
  const [active, setActive] = useState<ActorId>('illya');
  const [mode, setMode] = useState<'control' | 'observe'>('observe');
  const [scene, setScene] = useState<'street' | 'map'>('street');
  const [scenePlace, setScenePlace] = useState<DistrictLandmark>(
    DISTRICT_LANDMARKS.find((place) => place.id === 'cafe')!,
  );
  const [zoom, setZoom] = useState(1.24);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<DistrictLandmark | null>(
    null,
  );
  const [closeupPlace, setCloseupPlace] = useState<DistrictLandmark | null>(null);
  const [leavingCloseupPlace, setLeavingCloseupPlace] = useState<DistrictLandmark | null>(null);
  const [streetJourney, setStreetJourney] = useState<{
    from: DistrictLandmark;
    to: DistrictLandmark;
    total: number;
    image: string;
    startX: number;
    direction: 1 | -1;
  } | null>(null);
  const [streetTransitionImage, setStreetTransitionImage] = useState<string | null>(null);
  const [loadedSceneImage, setLoadedSceneImage] = useState<string | null>(null);
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
  const closeupElements = useRef(new Map<ActorId, HTMLDivElement>());
  const closeupSprites = useRef(new Map<ActorId, HTMLDivElement>());
  const journeyArtwork = useRef<HTMLImageElement>(null);
  const reducedMotion = useRef(false);
  const closeupPlaceRef = useRef<DistrictLandmark | null>(null);
  const streetJourneyRef = useRef<typeof streetJourney>(null);
  const pendingCloseup = useRef<DistrictLandmark | null>(null);
  const closeupExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keys = useRef(new Set<string>());
  const touchKeys = useRef(new Set<string>());
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  const viewport = useRef({ width: 1000, height: 600 });
  const freeView = useRef<Point>({ ...DISTRICT_LANDMARKS.find((place) => place.id === 'cafe')! });
  const scenePlaceRef = useRef(scenePlace);
  const following = useRef<ActorId | null>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    world: Point;
    dragged: boolean;
  } | null>(null);
  const settings = useRef({
    active,
    mode,
    scene,
    zoom,
    ready,
    interior: false,
  });
  const padHistory = useRef<PadHistory>(null);
  const padIndex = useRef<number | null>(null);
  const padActions = useRef<{
    choose: (id: ActorId) => void;
    toggle: () => void;
    center: () => void;
    talk: () => void;
    back: () => void;
    leaveInterior: () => void;
  } | null>(null);
  const current = CAST.find((p) => p.id === active)!;
  const connectedStreetPlaces = closeupPlace ? streetLinksFrom(closeupPlace.id) : [];
  const shownCloseupPlace = closeupPlace || leavingCloseupPlace;
  const shownCloseupImage = streetJourney?.image ?? (shownCloseupPlace ? districtSceneImage(shownCloseupPlace) : null);
  const period = lifePeriod(daily.view.minutes);
  const closeupLight = period === '夜间' ? styles.closeupNight : period === '傍晚' ? styles.closeupDusk : '';

  function crossfadeFrom(image: string | null) {
    if (streetTransitionTimer.current) clearTimeout(streetTransitionTimer.current);
    setStreetTransitionImage(image);
    streetTransitionTimer.current = image ? setTimeout(() => {
      setStreetTransitionImage(null);
      streetTransitionTimer.current = null;
    }, 4000) : null;
  }

  function finishStreetCrossfade() {
    if (!streetTransitionTimer.current) return;
    clearTimeout(streetTransitionTimer.current);
    streetTransitionTimer.current = setTimeout(() => {
      setStreetTransitionImage(null);
      streetTransitionTimer.current = null;
    }, 720);
  }

  function leaveCloseup() {
    crossfadeFrom(null);
    if (closeupExitTimer.current) clearTimeout(closeupExitTimer.current);
    const place = closeupPlaceRef.current;
    if (place) {
      setLeavingCloseupPlace(place);
      closeupExitTimer.current = setTimeout(() => {
        setLeavingCloseupPlace(null);
        closeupExitTimer.current = null;
      }, 480);
    }
    closeupPlaceRef.current = null;
    pendingCloseup.current = null;
    if (streetJourneyRef.current) {
      const actor = actors.current.find((a) => a.id === settings.current.active);
      if (actor) actor.path = [];
    }
    streetJourneyRef.current = null;
    setStreetJourney(null);
    setCloseupPlace(null);
  }
  function showCloseup(place: DistrictLandmark) {
    if (closeupExitTimer.current) clearTimeout(closeupExitTimer.current);
    closeupExitTimer.current = null;
    setLeavingCloseupPlace(null);
    crossfadeFrom(streetJourneyRef.current?.image ?? null);
    streetJourneyRef.current = null;
    setStreetJourney(null);
    pendingCloseup.current = null;
    closeupPlaceRef.current = place;
    setCloseupPlace(place);
    setHint(`已进入${place.name}街景 · 用方向键或点击路面移动，走出边缘可返回街区`);
    stage.current?.focus({ preventScroll: true });
  }

  function followStreetTo(destination: DistrictLandmark) {
    const from = closeupPlaceRef.current;
    const link = from && streetLinksFrom(from.id).find((candidate) => candidate.place.id === destination.id);
    if (!from || !link) return;
    const actor = actors.current.find((a) => a.id === settings.current.active)!;
    actor.path = pathTo(actor, destination);
    if (!actor.path.length) {
      setHint('当前位置没有可通行的街道路段');
      return;
    }
    const total = actor.path.reduce(
      (distance, point, index) => {
        const previous = index ? actor.path[index - 1] : actor;
        return distance + Math.hypot(point.x - previous.x, point.y - previous.y);
      },
      0,
    );
    const direction: 1 | -1 = (destination.x !== from.x ? destination.x > from.x : destination.y > from.y) ? 1 : -1;
    const journey = {
      from,
      to: destination,
      total: Math.max(1, total),
      image: link.image,
      startX: clamp(50 + (actor.x - from.x) / 4.5, 20, 80),
      direction,
    };
    crossfadeFrom(districtSceneImage(from));
    streetJourneyRef.current = journey;
    setStreetJourney(journey);
    setHint(`沿街前往${destination.name}；到达后直接进入下一处街景`);
    stage.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    settings.current = {
      active,
      mode,
      scene,
      zoom,
      ready,
      interior: Boolean(interiorView),
    };
  }, [active, mode, scene, zoom, ready, interiorView]);
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
          'input,textarea,select,button,a,[contenteditable="true"],summary',
        )
      )
        return;
      const key = e.key.toLowerCase();
      if (overlay.current) return;
      if (settings.current.interior) {
        if (key === 'escape' && !e.repeat) {
          e.preventDefault();
          padActions.current?.leaveInterior();
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
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
          if (settings.current.interior) {
            if (action === 'back') padActions.current?.leaveInterior();
            continue;
          }
          if (action === 'talk') {
            padActions.current?.talk();
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
          // Keep the same daily simulation alive while the street surface is covered.
          // Only direct street controls are suspended; nobody is moved into this view.
          dailyActions.current.advance(dt);
          raf = requestAnimationFrame(tick);
          return;
        }
        const keyboard = directionFromKeys(
          new Set([...keys.current, ...touchKeys.current]),
        );
        const input = keyboard.x || keyboard.y ? keyboard : sampled.move;
        const walkingInput = streetJourneyRef.current ? { x: 0, y: 0 } : input;
        if (opts.mode === 'control' && (walkingInput.x || walkingInput.y))
          pendingCloseup.current = null;
        if (opts.mode === 'observe') {
          const look =
            keyboard.x || keyboard.y
              ? keyboard
              : sampled.look.x || sampled.look.y
                ? sampled.look
                : sampled.move;
          if (look.x || look.y) following.current = null;
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
              actor.path.length && !walkingInput.x && !walkingInput.y ? 115 : WALK_SPEED,
            );
          else if (actor.id === 'admin') actor.frame = 0;
          const node = actorElements.current.get(actor.id),
            sprite = spriteElements.current.get(actor.id);
          if (node) {
            const projected = opts.scene === 'street' ? streetScenePoint(actor) : actor;
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
          const closeupNode = closeupElements.current.get(actor.id);
          const closeupSprite = closeupSprites.current.get(actor.id);
          const place = closeupPlaceRef.current;
          const journey = streetJourneyRef.current;
          if (closeupNode && place) {
            if (journey && controlled) {
              let remaining = 0;
              let previous: Point = actor;
              for (const point of actor.path) {
                remaining += Math.hypot(point.x - previous.x, point.y - previous.y);
                previous = point;
              }
              const progress = clamp(1 - remaining / journey.total, 0, 1);
              closeupNode.style.visibility = 'visible';
              closeupNode.style.left = `${clamp(journey.startX + (50 - journey.startX) * progress + journey.direction * Math.sin(Math.PI * progress) * 7, 20, 80)}%`;
              closeupNode.style.top = '82%';
              if (journeyArtwork.current)
                journeyArtwork.current.style.transform = reducedMotion.current
                  ? 'none'
                  : `translate3d(${journey.direction * (0.5 - progress) * 12}%, 0, 0) scale(1.16)`;
            } else if (journey) {
              closeupNode.style.visibility = 'hidden';
            } else {
              const dx = actor.x - place.x;
              const dy = actor.y - place.y;
              closeupNode.style.visibility =
                Math.abs(dx) <= 145 &&
                Math.abs(dy) <= 100 &&
                (controlled || !dailyActions.current.isInside(actor.id))
                  ? 'visible'
                  : 'hidden';
              closeupNode.style.left = `${50 + dx / 4.5}%`;
              closeupNode.style.top = `${82 + dy * 0.07}%`;
            }
            closeupNode.style.zIndex = String(Math.round(actor.y));
          }
          if (closeupSprite) {
            closeupSprite.style.backgroundPositionX = `${(actor.frame / 3) * 100}%`;
            closeupSprite.style.transform = `scaleX(${journey && controlled ? journey.direction : actor.facing})`;
          }
        }
        const selected = actors.current.find((p) => p.id === opts.active)!;
        const journey = streetJourneyRef.current;
        if (
          journey &&
          selected.path.length === 0 &&
          Math.hypot(selected.x - journey.to.x, selected.y - journey.to.y) < 30
        ) showCloseup(journey.to);
        const pending = pendingCloseup.current;
        if (
          pending &&
          opts.mode === 'control' &&
          selected.path.length === 0 &&
          Math.hypot(selected.x - pending.x, selected.y - pending.y) < 30
        ) {
          showCloseup(pending);
        }
        const opened = closeupPlaceRef.current;
        if (
          opened && !streetJourneyRef.current &&
          Math.hypot(selected.x - opened.x, selected.y - opened.y) > 155
        ) {
          leaveCloseup();
          setHint('已离开地点近景，返回连续街区道路');
        }
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
        const followed = following.current
          ? actors.current.find((p) => p.id === following.current)
          : undefined;
        if (opts.mode === 'observe' && followed)
          freeView.current = { x: followed.x, y: followed.y };
        const point = opts.mode === 'control' ? selected : freeView.current;
        if (opts.scene === 'street') {
          const place = nearestDistrictLandmark(point, scenePlaceRef.current);
          if (place.id !== scenePlaceRef.current.id) {
            scenePlaceRef.current = place;
            setScenePlace(place);
          }
        }
        const next = cameraFor(
          opts.scene === 'street' ? streetScenePoint(point) : point,
          viewport.current.width,
          viewport.current.height,
          opts.zoom,
          opts.scene === 'street'
            ? { x: STREET.width * STREET_SCENE_SCALE, y: STREET.height * STREET_SCENE_SCALE }
            : { x: STREET.width, y: STREET.height },
        );
        camera.current = next;
        if (world.current)
          world.current.style.transform = `translate(${-next.x * next.scale}px,${-next.y * next.scale}px) scale(${next.scale})`;
        if (marker.current) {
          const destination =
            opts.mode === 'control' ? selected.path.at(-1) : null;
          const visibleDestination = destination;
          marker.current.style.display = visibleDestination ? 'block' : 'none';
          if (visibleDestination) {
            const projected = opts.scene === 'street' ? streetScenePoint(destination) : destination;
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
      document.removeEventListener('visibilitychange', stop);
      if (closeupExitTimer.current) clearTimeout(closeupExitTimer.current);
      if (streetTransitionTimer.current) clearTimeout(streetTransitionTimer.current);
    };
  }, []);

  function choose(id: ActorId) {
    leaveCloseup();
    if (settings.current.mode === 'control') dailyActions.current.cancel();
    // Watching somebody must not interrupt that person or clear everyone else's route.
    const old = actors.current.find((p) => p.id === settings.current.active)!;
    if (settings.current.mode === 'control') old.path = [];
    const selected = actors.current.find((p) => p.id === id)!;
    if (settings.current.scene === 'street') {
      const place = nearestDistrictLandmark(selected);
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
    leaveCloseup();
    dailyActions.current.cancel();
    const next = settings.current.mode === 'control' ? 'observe' : 'control';
    const selected = actors.current.find(
      (p) => p.id === settings.current.active,
    )!;
    if (settings.current.scene === 'street') {
      const place = nearestDistrictLandmark(selected);
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
        : 'WASD / 方向键在街景中行走；地图可选择远处目的地',
    );
    stage.current?.focus({ preventScroll: true });
  }
  function recenter() {
    const selected = actors.current.find(
      (p) => p.id === settings.current.active,
    )!;
    if (settings.current.scene === 'street') {
      const place = nearestDistrictLandmark(selected);
      scenePlaceRef.current = place;
      setScenePlace(place);
    }
    freeView.current = { x: selected.x, y: selected.y };
    following.current = selected.id;
    settings.current = { ...settings.current, zoom: 1.24 };
    setZoom(1.24);
  }
  function openDialog(
    value: 'settings' | PartnerId,
    speaker: ActorId = settings.current.active,
    preserveRoutes = settings.current.interior,
  ) {
    if (streetJourneyRef.current) leaveCloseup();
    dailyActions.current.cancel();
    overlay.current = true;
    keys.current.clear();
    touchKeys.current.clear();
    pointer.current = null;
    if (!preserveRoutes)
      actors.current = actors.current.map((actor) => ({
        ...actor,
        path: [],
        frame: 0,
        rest: 4,
      }));
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
    leaveCloseup();
    keys.current.clear();
    touchKeys.current.clear();
    pointer.current = null;
    setAtlasOpen(false);
    setSelectedPlace(null);
    settings.current = { ...settings.current, interior: true };
    setInteriorView(value);
  }
  function leaveInterior() {
    keys.current.clear();
    touchKeys.current.clear();
    pointer.current = null;
    settings.current = { ...settings.current, interior: false };
    setInteriorView(null);
  }
  function talkInside(id: PartnerId) {
    if (!interiorView || interiorView === 'directory') return;
    const person = interiorResidents(
      daily.view,
      interiorView,
      mode === 'control' ? active : null,
    ).find((item) => item.id === id && item.presence === 'inside');
    if (
      !person ||
      !dailyActions.current.isInside(id) ||
      daily.view.people[id].activity?.kind === 'sleep'
    )
      return;
    openDialog(id, 'admin', true);
  }
  function talk() {
    if (settings.current.mode !== 'control' || streetJourneyRef.current) return;
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
      leaveInterior,
    };
  });
  function selectPlace(place: DistrictLandmark) {
    setSelectedPlace(place);
    setAtlasOpen(false);
    if (settings.current.mode === 'observe') {
      following.current = null;
      freeView.current = { x: place.x, y: place.y };
    }
    setHint('已选择' + place.name + '；点击地点卡即可让当前人物沿路前往');
  }
  function toggleScene() {
    leaveCloseup();
    if (settings.current.scene === 'street') {
      settings.current = { ...settings.current, scene: 'map' };
      setScene('map');
      setAtlasOpen(true);
      setHint('冬木市地图已打开；选择地点或人物定位');
      return;
    }
    const point =
      settings.current.mode === 'control'
        ? actors.current.find((p) => p.id === settings.current.active)!
        : freeView.current;
    const place = nearestDistrictLandmark(point);
    scenePlaceRef.current = place;
    setScenePlace(place);
    settings.current = { ...settings.current, scene: 'street' };
    setScene('street');
    setAtlasOpen(false);
    setSelectedPlace(null);
    keys.current.clear();
    touchKeys.current.clear();
    setHint('已进入冬木市连续街区；沿道路行走可经过不同区域');
    stage.current?.focus({ preventScroll: true });
  }
  function travelToPlace(destination: DistrictLandmark) {
    if (settings.current.mode === 'observe') switchMode();
    const actor = actors.current.find((a) => a.id === settings.current.active)!;
    actor.path = pathTo(actor, destination);
    pendingCloseup.current = destination;
    const place = nearestDistrictLandmark(actor);
    scenePlaceRef.current = place;
    setScenePlace(place);
    settings.current = { ...settings.current, scene: 'street' };
    setScene('street');
    setAtlasOpen(false);
    setHint('正在前往' + destination.name + ' · 到达后进入可行走街景');
    setSelectedPlace(null);
    if (Math.hypot(actor.x - destination.x, actor.y - destination.y) < 30)
      showCloseup(destination);
    stage.current?.focus({ preventScroll: true });
  }
  function walkToPlace() {
    if (selectedPlace) travelToPlace(selectedPlace);
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
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
    if (mode === 'observe' && p.dragged) {
      following.current = null;
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
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = pointer.current;
    pointer.current = null;
    if (!p || p.dragged || mode !== 'control') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const closeup = closeupPlaceRef.current;
    if (closeup) {
      if (streetJourneyRef.current) {
        setHint('正在沿街前往下一处街景；到达后可继续自由行走');
        return;
      }
      if ((e.clientY - rect.top) / rect.height < 0.62) {
        setHint('点击画面下方的街道移动人物');
        return;
      }
      const actor = actors.current.find((a) => a.id === active)!;
      const requested = nearestWalkable({
        x: closeup.x + ((e.clientX - rect.left) / rect.width - 0.5) * 300,
        y: actor.y,
      });
      actor.path = pathTo(actor, requested);
      setHint('正在沿街道前往 · 方向键可随时改变路线');
      return;
    }
    const wanted = screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
      camera.current,
    );
    const actor = actors.current.find((a) => a.id === active)!;
    const requested = scene === 'street'
      ? { x: wanted.x / STREET_SCENE_SCALE, y: wanted.y / STREET_SCENE_SCALE }
      : wanted;
    const destination = nearestWalkable(requested);
    if (
      Math.hypot(requested.x - destination.x, requested.y - destination.y) > 145
    ) {
      setHint('点一下人物脚边的路面，就能走过去');
      return;
    }
    actor.path = pathTo(actor, destination);
    setHint('正在前往 · 随时按方向键改变方向');
  }
  function reset() {
    leaveCloseup();
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
        verified={fate.verified}
        onSettings={() => openDialog('settings')}
      />
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
            aria-label={closeupPlace
              ? `${closeupPlace.name}可行走街景；方向键、触屏方向键或点击路面移动人物`
              : '冬木市连续街道，默认观察他们自主生活；拖动或方向键移动镜头，进入角色后可控制走路'}
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
              style={{
                width: STREET.width * (scene === 'street' ? STREET_SCENE_SCALE : 1),
                height: STREET.height * (scene === 'street' ? STREET_SCENE_SCALE : 1),
              }}
            >
              {scene === 'street' ? (
                <FateStreetScenery
                  period={lifePeriod(daily.view.minutes)}
                />
              ) : (
                <div className={styles.background}>
                  <FateCityScenery />
                </div>
              )}
              {ready &&
                scene === 'map' &&
                DISTRICT_LANDMARKS.map((place) => (
                  <button
                    type="button"
                    key={place.id}
                    className={styles.landmark}
                    style={{ left: place.x, top: place.y - 147 }}
                    aria-label={'查看' + place.name}
                    onClick={() => selectPlace(place)}
                  >
                    <MapPin size={13} />
                    {place.name}
                  </button>
                ))}
              {ready &&
                CAST.map((person) => {
                  const height =
                    scene === 'street'
                      ? person.id === 'iskandar'
                        ? 320
                        : 270
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
                      className={`${styles.actor} ${person.id === 'iskandar' ? styles.mounted : ''} ${person.id === active && mode === 'control' ? styles.controlled : ''}`}
                      style={{
                        width: height * person.aspect,
                        height,
                      }}
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
                  );
                })}

              <div ref={marker} className={styles.destination} />
            </div>
            {streetTransitionImage && (
              <div className={`${styles.closeupScene} ${closeupLight}`} aria-hidden="true">
                <Image src={streetTransitionImage} alt="" fill sizes="(max-width: 800px) 100vw, 85vw" draggable={false} className={styles.closeupArtwork} />
              </div>
            )}
            {shownCloseupImage && (
              <div key={streetJourney ? `${streetJourney.from.id}-${streetJourney.to.id}` : shownCloseupPlace!.id} className={`${styles.closeupScene} ${closeupLight} ${closeupPlace ? styles.closeupEntering : styles.closeupLeaving}`} aria-hidden="true">
                <Image
                  ref={streetJourney ? journeyArtwork : null}
                  src={shownCloseupImage}
                  alt=""
                  fill
                  sizes="(max-width: 800px) 100vw, 85vw"
                  draggable={false}
                  className={`${styles.closeupArtwork} ${styles.activeCloseupArtwork} ${loadedSceneImage === shownCloseupImage ? styles.closeupArtworkReady : ''}`}
                  onLoad={() => {
                    setLoadedSceneImage(shownCloseupImage);
                    finishStreetCrossfade();
                  }}
                />
                <div className={styles.closeupRoad} />
              </div>
            )}
            {shownCloseupPlace && (
              <div className={`${styles.closeupActors} ${closeupLight} ${closeupPlace ? '' : styles.closeupLeaving}`} aria-hidden="true">
                {CAST.map((person) => (
                  <div
                    key={person.id}
                    ref={(node) => {
                      if (node) closeupElements.current.set(person.id, node);
                      else closeupElements.current.delete(person.id);
                    }}
                    className={styles.closeupActor}
                    style={{ aspectRatio: String(person.aspect) }}
                  >
                    <div className={styles.groundShadow} />
                    <div
                      ref={(node) => {
                        if (node) closeupSprites.current.set(person.id, node);
                        else closeupSprites.current.delete(person.id);
                      }}
                      className={styles.sprite}
                      style={spriteStyle(person)}
                    />
                    <span className={styles.actorName}>{person.name}</span>
                  </div>
                ))}
              </div>
            )}
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
                  onClick={() => setAtlasOpen((open) => !open)}
                >
                  <MapPin size={15} /> 地点目录
                </button>
              )}
              {closeupPlace && (
                <div className={styles.closeupControls}>
                  <strong>{streetJourney ? `沿街前往${streetJourney.to.name}` : `${closeupPlace.name} · 街景`}</strong>
                  {!streetJourney && connectedStreetPlaces.map(({ place }) => (
                    <button key={place.id} type="button" className={styles.streetLinkButton} onClick={() => followStreetTo(place)}>
                      沿街去{place.name}
                    </button>
                  ))}
                  <button type="button" onClick={() => {
                    leaveCloseup();
                    stage.current?.focus({ preventScroll: true });
                  }}>
                    返回街区
                  </button>
                </div>
              )}
              {scene === 'street' && !closeupPlace && (
                <div className={styles.streetPlaceBadge}>
                  <MapPin size={15} />
                  <span>{scenePlace.name}</span>
                  <button type="button" onClick={() => travelToPlace(scenePlace)}>
                    进入街景
                  </button>
                  {scenePlace.kind === 'home' && (
                    <button
                      type="button"
                      disabled={
                        mode === 'control' &&
                        Math.hypot(
                          daily.view.positions[active].x - scenePlace.x,
                          daily.view.positions[active].y - scenePlace.y,
                        ) > 75
                      }
                      onClick={() =>
                        visitInterior(scenePlace.id as keyof typeof FATE_HOMES)
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
              {ready && mode === 'control' && !streetJourney && (
                <button
                  className={styles.talkButton}
                  onClick={talk}
                  disabled={!nearby || !fate.loaded}
                >
                  <MessageCircle size={16} />
                  {nearby
                    ? `与${fatePerson(nearby, waverStage)!.name}交谈`
                    : '靠近街道上的人物交谈'}
                  <kbd>E / A</kbd>
                </button>
              )}
              {!closeupPlace && <div className={styles.cameraTools}>
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
              </div>}
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
              {ready && mode === 'control' && !streetJourney && (
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
              traveler={CAST.find((person) => person.id === active)?.name ?? '当前人物'}
              arrived={
                Math.hypot(
                  daily.view.positions[active].x - selectedPlace.x,
                  daily.view.positions[active].y - selectedPlace.y,
                ) < 25
              }
              onWalk={walkToPlace}
              onVisit={(home) => {
                setSelectedPlace(null);
                visitInterior(home);
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
            life={daily}
            controlled={mode === 'control' ? active : null}
            verified={fate.verified}
            storageNotice={fate.storageNotice}
            onSettings={() => openDialog('settings')}
            onClose={() => setLifePanel(false)}
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
                  人物沿连续街区移动；点「进入街景」可在当前地点近景中行走
                </p>
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
                  点击「开始日常」观察二十一位 Fate 人物自主行动。连接 DeepSeek
                  并开启「AI
                  自主交谈」后，相遇的两个人会自由接话，显示在旁听栏里。进入角色可主动干预。离开页面后日常暂停。
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
        />
      ) : null}
    </main>
  );
}
