'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- This application surface implements keyboard walking; controls and modal dialogs remain semantic elements. */

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Map as MapIcon,
  Footprints,
  Palette,
  Focus,
  Minus,
  Plus,
  X,
  Home,
  Flower2,
  BookOpen,
  Square,
} from 'lucide-react';
import FateCityAtlas from './fate-city-atlas';
import FateCityInterior from './fate-city-interior';
import FateCityMinimap from './fate-city-minimap';
import FateCityWayfinding from './fate-city-wayfinding';
import FateCityArtLayer, { type CityArtActorView } from './fate-city-art-layer';
import {
  CITY_ART_MODES,
  cityArtCamera,
  cityCameraPan,
  cityCameraResizePan,
  cityCameraActorScale,
  cityCameraOrigin,
  type CityArtMode,
} from '@/lib/fate-city-art-camera';
import {
  MIYAMA_PILOT,
  cityPilotPaint,
  cityPilotWorld,
} from '@/lib/fate-city-art';
import {
  cityPilotRoute,
  cityPilotClickRoute,
  cityPilotLine,
  advanceCityPilotInput,
  advanceCityPilotRoute,
  cityPilotFrameTravel,
  CITY_PILOT_STRIDE,
  cityPilotWalkable,
  cityPilotInputCrossing,
  cityPilotJunctionChoices,
  cityArtJourney,
  type CityArtJourneyLeg,
} from '@/lib/fate-city-art-navigation';
import {
  CITY_ART_SCENES,
  CITY_ART_SCENE_IDS,
  type CityArtScene,
} from '@/lib/fate-city-art-scenes';
import { cityArtExits } from '@/lib/fate-city-art-portals';
import {
  cityArtRegistered,
  cityArtDepth,
} from '@/lib/fate-city-art-registration';
import { cityArtScenePlaces, type CityArtPlace } from '@/lib/fate-city-art-map';
import {
  cityArtMapJourney,
  type CityArtDestinationRequest,
} from '@/lib/fate-city-art-destinations';
import { CHARACTER_ART, ILLYA_ART_SPRITE } from '@/lib/fate-character-art';
import { loadArtImages } from '@/lib/fate-art-loader';
import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
  cityInteriorScene,
  type CityInteriorScene,
} from '@/lib/fate-city-interior-scenes';
import type { CityPoint } from '@/lib/fate-city-layout';
import { ART_SPRITE_FRAMES } from '@/lib/fate-art-sprite';
import {
  cityWalkFacing,
  cityCameraFollow,
  cityCameraZoomAnchor,
} from '@/lib/fate-city-art-controls';
import styles from './fate-city-art.module.css';

type Direction = 'down' | 'left' | 'right' | 'up';
type ArtPlace = CityArtPlace;
const registeredPlaces = Object.fromEntries(
  CITY_ART_SCENE_IDS.map((scene) => [scene, cityArtScenePlaces(scene)]),
) as Record<CityArtScene, ArtPlace[]>;
const viewKey = (scene: CityArtScene, mode: CityArtMode) => `${scene}:${mode}`;
const allSceneViews = Object.keys(CITY_ART_SCENES).flatMap((scene) =>
  CITY_ART_MODES.map((mode) => ({ scene: scene as CityArtScene, mode })),
);
const distance = (a: CityPoint, b: CityPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const face = (a: CityPoint, b: CityPoint): Direction =>
  Math.abs(b.x - a.x) > Math.abs(b.y - a.y)
    ? b.x > a.x
      ? 'right'
      : 'left'
    : b.y > a.y
      ? 'down'
      : 'up';
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function FateCityArt({
  appearance = 'classic',
}: {
  appearance?: 'classic' | 'paper';
}) {
  const [scene, setScene] = useState<CityArtScene>('residential');
  const activeScene = useRef<CityArtScene>('residential');
  const places = registeredPlaces[scene];
  const [tab, setTab] = useState<'map' | 'street' | 'catalog'>('street');
  const [mapMessage, setMapMessage] = useState(
    '点击建筑、店面或道路，从当前位置沿路前往。',
  );
  const [view, setView] = useState<CityArtActorView>({
    point: MIYAMA_PILOT.start,
    direction: 'right',
    frame: 0,
  });
  const [mode, setMode] = useState<CityArtMode>('overview');
  const [load, setLoad] = useState<
    Record<string, 'pending' | 'ready' | 'failed'>
  >(() =>
    Object.fromEntries(
      allSceneViews.map(({ scene, mode }) => [viewKey(scene, mode), 'pending']),
    ),
  );
  const [retry, setRetry] = useState(0);
  const [requestedScene, setRequestedScene] = useState<CityArtScene | null>(
    null,
  );
  const loadingImages = useRef(new Map<string, Promise<void>>());
  const mounted = useRef(true);
  const [outgoing, setOutgoing] = useState<{
    mode: CityArtMode;
    scene: CityArtScene;
    view: CityArtActorView;
    origin: CityPoint;
    scale: number;
    actorScale: number;
  } | null>(null);
  const activeMode = useRef<CityArtMode>('overview');
  const ready = useRef<Record<string, boolean>>({});
  const transitioning = useRef(false);
  const changingAngle = useRef(false);
  const trackingCamera = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heading = useRef<CityPoint>({ x: 1, y: 0 });
  const heldHeading = useRef<{ input: string; vector: CityPoint } | null>(null);
  const journey = useRef<CityArtJourneyLeg[]>([]);
  const recentCrossing = useRef<{
    previous: CityArtScene;
    point: CityPoint;
    time: number;
  } | null>(null);
  const waitingForStreet = useRef<CityArtScene | null>(null);
  const [zoom, setZoom] = useState(1),
    [size, setSize] = useState({ width: 1000, height: 650 }),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const [following, setFollowing] = useState(true),
    [message, setMessage] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [opened, setOpened] = useState<ArtPlace | null>(null);
  const [interior, setInterior] = useState<CityInteriorScene | null>(null);
  const surface = useRef<HTMLDivElement>(null),
    position = useRef<CityPoint>({ ...MIYAMA_PILOT.start });
  const initiallyFramed = useRef(false);
  const previousSize = useRef({ width: 1000, height: 650 });
  const framing = useRef({ zoom: 1, following: true });
  const browsingRef = useRef(false);
  const pointers = useRef(new Map<number, CityPoint>());
  const pinch = useRef<{ span: number; center: CityPoint } | null>(null);
  const gestureClick = useRef(false);
  const direction = useRef<Direction>('right'),
    travelled = useRef(0),
    route = useRef<CityPoint[]>([]),
    keys = useRef(new Set<string>());
  const target = useRef<ArtPlace | null>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    pan: CityPoint;
    moved: boolean;
    stopped: boolean;
  } | null>(null);
  const hold = useRef<CityPoint>({ x: 0, y: 0 });
  const painting = cityArtCamera(mode, scene);
  const scale =
    Math.min(size.width / painting.width, size.height / painting.height) * zoom;
  const player = cityPilotPaint(view.point, mode, scene);
  // Following scrolls only outside the comfortable walking window. The full
  // painting still fits at normal scale; browsing never changes world position.
  const baseOrigin = following
    ? {
        x: size.width * 0.52 - player.x * scale,
        y: size.height * 0.66 - player.y * scale,
      }
    : {
        x: (size.width - painting.width * scale) / 2,
        y: (size.height - painting.height * scale) / 2,
      };
  const actorScale = cityCameraActorScale(
    cityArtDepth(view.point, mode, scene),
    scale,
    size,
  );
  const origin = cityCameraOrigin(
    { x: baseOrigin.x + pan.x, y: baseOrigin.y + pan.y },
    player,
    scale,
    size,
    painting,
    actorScale,
    !browsing,
  );
  const effectivePan = {
    x: origin.x - baseOrigin.x,
    y: origin.y - baseOrigin.y,
  };
  const spriteAnchor = ART_SPRITE_FRAMES[view.direction][view.frame];
  const visibleSpriteScale = actorScale * spriteAnchor.scale * scale;
  const actorBounds = {
    x: origin.x + player.x * scale - spriteAnchor.x * visibleSpriteScale - 10,
    y: origin.y + player.y * scale - spriteAnchor.y * visibleSpriteScale - 10,
    width: 256 * visibleSpriteScale + 20,
    height: 256 * visibleSpriteScale + 20,
  };
  const transform = useRef({ origin, scale });
  useLayoutEffect(() => {
    transform.current = { origin, scale };
    framing.current = { zoom, following };
    browsingRef.current = browsing;
  });
  useEffect(() => {
    let cancelled = false;
    const views = [
      ...CITY_ART_MODES.map((mode) => ({ scene, mode })),
      ...cityArtExits(scene).map((exit) => ({ scene: exit.scene, mode })),
      ...(requestedScene
        ? CITY_ART_MODES.map((mode) => ({ scene: requestedScene, mode }))
        : []),
    ];
    const loadView = (
      cameraScene: CityArtScene,
      cameraMode: CityArtMode,
      priority: 'high' | 'low',
    ) => {
      const key = viewKey(cameraScene, cameraMode);
      if (ready.current[key]) return Promise.resolve();
      const pending = loadingImages.current.get(key);
      if (pending) {
        if (priority === 'high')
          void loadArtImages([
            cityArtCamera(cameraMode, cameraScene).painting,
            ILLYA_ART_SPRITE,
          ]).catch(() => {});
        return pending;
      }
      setLoad((old) => ({ ...old, [key]: 'pending' }));
      const finish = (status: 'ready' | 'failed') => {
        loadingImages.current.delete(key);
        if (!mounted.current) return;
        ready.current[key] = status === 'ready';
        setLoad((old) => ({ ...old, [key]: status }));
      };
      const promise = loadArtImages(
        [cityArtCamera(cameraMode, cameraScene).painting, ILLYA_ART_SPRITE],
        priority,
      ).then(
        () => finish('ready'),
        () => finish('failed'),
      );
      loadingImages.current.set(key, promise);
      return promise;
    };
    // Current view and destination take precedence; other paintings share one warm-up lane.
    void Promise.all([
      loadView(scene, mode, 'high'),
      ...(requestedScene ? [loadView(requestedScene, mode, 'high')] : []),
    ]).then(async () => {
      if (!ready.current[viewKey(scene, mode)]) return;
      for (const view of views) {
        if (cancelled) return;
        await loadView(view.scene, view.mode, 'low');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scene, mode, retry, requestedScene]);
  useEffect(() => {
    mounted.current = true;
    const images = loadingImages.current;
    return () => {
      mounted.current = false;
      images.clear();
    };
  }, []);
  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    [],
  );
  const switchCamera = (
    next: CityArtMode,
    nextScene: CityArtScene = activeScene.current,
  ) => {
    if (next === mode && nextScene === scene) {
      surface.current?.focus({ preventScroll: true });
      return;
    }
    if (
      transitioning.current ||
      opened ||
      !ready.current[viewKey(nextScene, next)] ||
      !cityPilotWalkable(position.current, 1, nextScene)
    )
      return;
    // Disabled camera buttons lose focus in Chromium. Return it before the
    // transition renders, retaining held directions so walking resumes.
    if (!hold.current.x && !hold.current.y)
      surface.current?.focus({ preventScroll: true });
    drag.current = null;
    setBrowsing(false);
    const point = { ...position.current };
    const currentPaint = cityPilotPaint(point, mode, scene);
    const screenFoot = {
      x: transform.current.origin.x + currentPaint.x * transform.current.scale,
      y: transform.current.origin.y + currentPaint.y * transform.current.scale,
    };
    const nextCamera = cityArtCamera(next, nextScene);
    const nextScale =
      Math.min(size.width / nextCamera.width, size.height / nextCamera.height) *
      zoom;
    const nextPaint = cityPilotPaint(point, next, nextScene);
    const nextDirection = face(
      nextPaint,
      cityPilotPaint(
        { x: point.x + heading.current.x, y: point.y + heading.current.y },
        next,
        nextScene,
      ),
    );
    setOutgoing({
      mode,
      scene,
      view: { point, direction: direction.current, frame: view.frame },
      origin: transform.current.origin,
      scale: transform.current.scale,
      actorScale,
    });
    setPan(
      cityCameraPan(
        screenFoot,
        nextPaint,
        nextScale,
        size,
        nextCamera,
        following,
      ),
    );
    activeMode.current = next;
    activeScene.current = nextScene;
    // Hold world heading across a street boundary. An explicit angle change
    // must immediately rebind keys to the new visible directions instead.
    heldHeading.current = null;
    if (
      nextScene !== scene &&
      (keys.current.size || hold.current.x || hold.current.y)
    ) {
      const k = keys.current;
      const x =
        Number(k.has('d') || k.has('arrowright')) -
        Number(k.has('a') || k.has('arrowleft')) +
        hold.current.x;
      const y =
        Number(k.has('s') || k.has('arrowdown')) -
        Number(k.has('w') || k.has('arrowup')) +
        hold.current.y;
      heldHeading.current = {
        input: `${x}:${y}`,
        vector: { ...heading.current },
      };
    }
    transitioning.current = true;
    changingAngle.current = next !== mode;
    direction.current = nextDirection;
    setView({ point, direction: nextDirection, frame: view.frame });
    setMode(next);
    setScene(nextScene);
    setMessage('');
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 1
      : 220;
    transitionTimer.current = setTimeout(() => {
      transitioning.current = false;
      changingAngle.current = false;
      setOutgoing(null);
      transitionTimer.current = null;
    }, duration);
  };
  const switchCameraRef = useRef(switchCamera);
  useEffect(() => {
    switchCameraRef.current = switchCamera;
  });
  const stop = () => {
    keys.current.clear();
    hold.current = { x: 0, y: 0 };
    route.current = [];
    target.current = null;
    journey.current = [];
    waitingForStreet.current = null;
    heldHeading.current = null;
    trackingCamera.current = false;
  };
  const zoomCamera = (
    nextZoom: number,
    anchor?: CityPoint,
    nextAnchor?: CityPoint,
  ) => {
    if (opened || transitioning.current) return;
    const next = clamp(nextZoom, 0.5, 8);
    const current = transform.current;
    const camera = cityArtCamera(activeMode.current, activeScene.current);
    const foot = cityPilotPaint(
      position.current,
      activeMode.current,
      activeScene.current,
    );
    const at = anchor ?? {
      x: current.origin.x + foot.x * current.scale,
      y: current.origin.y + foot.y * current.scale,
    };
    const nextScale = (current.scale * next) / framing.current.zoom;
    const desired = cityCameraZoomAnchor(
      current.origin,
      current.scale,
      nextScale,
      at,
      nextAnchor,
    );
    const safe = cityCameraOrigin(
      desired,
      foot,
      nextScale,
      size,
      camera,
      cityCameraActorScale(
        cityArtDepth(position.current, activeMode.current, activeScene.current),
        nextScale,
        size,
      ),
      !browsingRef.current,
    );
    const base = framing.current.following
      ? {
          x: size.width * 0.52 - foot.x * nextScale,
          y: size.height * 0.66 - foot.y * nextScale,
        }
      : {
          x: (size.width - camera.width * nextScale) / 2,
          y: (size.height - camera.height * nextScale) / 2,
        };
    // Wheel events may be batched: update the input transform synchronously so
    // consecutive gestures all refer to the camera that is about to be drawn.
    framing.current.zoom = next;
    transform.current = { origin: safe, scale: nextScale };
    trackingCamera.current = false;
    setZoom(next);
    setPan({ x: safe.x - base.x, y: safe.y - base.y });
    surface.current?.focus({ preventScroll: true });
  };
  const resetCamera = () => {
    trackingCamera.current = false;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFollowing(false);
    setBrowsing(false);
    surface.current?.focus({ preventScroll: true });
  };
  const toggleFollowing = () => {
    const next = !following;
    const foot = cityPilotPaint(
      position.current,
      activeMode.current,
      activeScene.current,
    );
    const base = next
      ? {
          x: size.width * 0.52 - foot.x * scale,
          y: size.height * 0.66 - foot.y * scale,
        }
      : {
          x: (size.width - painting.width * scale) / 2,
          y: (size.height - painting.height * scale) / 2,
        };
    setPan({ x: origin.x - base.x, y: origin.y - base.y });
    trackingCamera.current = next;
    setFollowing(next);
    setBrowsing(false);
    surface.current?.focus({ preventScroll: true });
  };
  const cameraControls = useRef({
    zoomCamera,
    resetCamera,
    toggleFollowing,
    blocked: false,
  });
  useLayoutEffect(() => {
    cameraControls.current = {
      zoomCamera,
      resetCamera,
      toggleFollowing,
      blocked: Boolean(opened) || transitioning.current,
    };
  });
  const switchTab = (next: typeof tab) => {
    stop();
    setInterior(null);
    setOpened(null);
    setTab(next);
  };
  const inspect = () => {
    const nearest = registeredPlaces[
      activeScene.current
    ].reduce<ArtPlace | null>(
      (best, place) =>
        distance(position.current, place.point) < 22 &&
        cityPilotLine(position.current, place.point, activeScene.current) &&
        (!best ||
          distance(position.current, place.point) <
            distance(position.current, best.point))
          ? place
          : best,
      null,
    );
    if (nearest) {
      stop();
      setOpened(nearest);
    } else setMessage('走近门口后，可以按 E 查看。');
  };
  const inspectRef = useRef(inspect);
  useEffect(() => {
    inspectRef.current = inspect;
  });
  const walkTo = (point: CityPoint, place: ArtPlace | null = null) => {
    if (
      transitioning.current ||
      !ready.current[viewKey(activeScene.current, activeMode.current)]
    )
      return;
    stop();
    setBrowsing(false);
    const path = place
      ? cityPilotRoute(position.current, point, activeScene.current)
      : cityPilotClickRoute(
          position.current,
          point,
          activeMode.current,
          activeScene.current,
        );
    if (!path) {
      setMessage('这里没有可达的铺装通路，请选择路面或门口。');
      return;
    }
    route.current = path;
    target.current = place;
    setMessage(
      place ? `沿路前往${place.name.split(' · ')[0]}。` : '沿路走向选定位置。',
    );
    surface.current?.focus({ preventScroll: true });
  };
  const walkConnection = (
    nextScene: CityArtScene,
    crossingPoint?: CityPoint,
  ) => {
    if (nextScene === activeScene.current || transitioning.current) return;
    const legs = cityArtJourney(
      activeScene.current,
      position.current,
      nextScene,
      crossingPoint ?? CITY_ART_SCENES[nextScene].start,
    );
    if (!legs) {
      setMessage('未找到连通的铺装路线，请选择其他街道。');
      return;
    }
    stop();
    setBrowsing(false);
    const first = legs.shift()!;
    route.current = first.path;
    journey.current = [first, ...legs];
    setRequestedScene(first.nextScene ?? nextScene);
    setMessage(`沿路前往${CITY_ART_SCENES[nextScene].name}。`);
    surface.current?.focus({ preventScroll: true });
  };
  const walkFromMap = (request: CityArtDestinationRequest) => {
    if (transitioning.current) return;
    const trip = cityArtMapJourney(
      activeScene.current,
      position.current,
      request,
    );
    if (!trip) {
      setMapMessage('这里没有可达通路。请点击建筑、店面或开放道路。');
      return;
    }
    switchTab('street');
    setBrowsing(false);
    route.current = trip.legs[0].path;
    journey.current = trip.legs;
    target.current = trip.destination.place;
    setRequestedScene(trip.legs[0].nextScene ?? trip.destination.scene);
    setMessage(
      trip.destination.place
        ? `沿路前往${trip.destination.place.name.split(' · ')[0]}。`
        : '沿路前往地图上选定的位置。',
    );
    setMapMessage('点击建筑、店面或道路，从当前位置沿路前往。');
  };
  const walkConnectionRef = useRef(walkConnection);
  useLayoutEffect(() => {
    walkConnectionRef.current = walkConnection;
  });
  const previewScene = (nextScene: CityArtScene) => {
    stop();
    const point = { ...CITY_ART_SCENES[nextScene].start };
    position.current = point;
    activeScene.current = nextScene;
    setScene(nextScene);
    setView({ point, direction: 'up', frame: 0 });
    setPan({ x: 0, y: 0 });
    setFollowing(false);
    setBrowsing(false);
    setOpened(null);
    setTab('street');
    setRequestedScene(nextScene);
    setMessage('');
  };
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      const nextSize = { width, height };
      const oldSize = previousSize.current;
      if (
        initiallyFramed.current &&
        (width !== oldSize.width || height !== oldSize.height)
      ) {
        const camera = cityArtCamera(activeMode.current, activeScene.current);
        const foot = cityPilotPaint(
          position.current,
          activeMode.current,
          activeScene.current,
        );
        setPan((old) =>
          cityCameraResizePan(
            old,
            oldSize,
            nextSize,
            camera,
            framing.current.zoom,
            framing.current.following,
            foot,
          ),
        );
      }
      previousSize.current = nextSize;
      setSize({ width, height });
      // Portrait starts close to the child instead of letterboxing the whole
      // landscape painting into a narrow strip. Fit remains an explicit option.
      // This runs once, so resize and map return cannot overwrite chosen zoom.
      if (!initiallyFramed.current && width > 0 && height > 0) {
        initiallyFramed.current = true;
        if (width < 520) {
          const camera = cityArtCamera(activeMode.current, activeScene.current);
          const x = width / camera.width,
            y = height / camera.height;
          setZoom(clamp(Math.max(x, y) / Math.min(x, y), 1, 3));
          setFollowing(true);
        }
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [tab]);
  useEffect(() => {
    if (tab !== 'street' || opened) return;
    surface.current?.focus({ preventScroll: true });
    let raf = 0,
      last = 0,
      wasMoving = false;
    const clear = () => {
      stop();
      drag.current = null;
      pointers.current.clear();
      pinch.current = null;
      last = 0;
    };
    const down = (event: KeyboardEvent) => {
      if (!surface.current?.contains(document.activeElement)) return;
      const key = event.key.toLowerCase();
      if (!ready.current[viewKey(activeScene.current, activeMode.current)])
        return;
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowleft',
          'arrowdown',
          'arrowright',
        ].includes(key)
      ) {
        event.preventDefault();
        keys.current.add(key);
        setBrowsing(false);
        route.current = [];
        target.current = null;
        journey.current = [];
        // The frame loop pauses movement during the dissolve. Still remember
        // directions pressed here, without requiring a second press afterward.
        return;
      }
      if (key === 'escape') {
        event.preventDefault();
        clear();
        setMessage('已停步。');
        return;
      }
      if (transitioning.current) return;
      if (/^[1-4]$/.test(key) && !event.repeat) {
        const exit = cityPilotJunctionChoices(
          position.current,
          activeScene.current,
        )[Number(key) - 1];
        if (exit) {
          event.preventDefault();
          walkConnectionRef.current(exit.scene, exit.point);
        }
      } else if (key === 'e' && !event.repeat) {
        event.preventDefault();
        inspectRef.current();
      } else if (['v', 'q', 'r'].includes(key) && !event.repeat) {
        event.preventDefault();
        const current = CITY_ART_MODES.indexOf(activeMode.current);
        switchCameraRef.current(
          CITY_ART_MODES[
            (current + (key === 'q' ? 2 : 1)) % CITY_ART_MODES.length
          ],
        );
      } else if (
        ['+', '=', '-', 'home', 'f', 'm'].includes(key) &&
        !event.repeat
      ) {
        event.preventDefault();
        if (key === 'home') cameraControls.current.resetCamera();
        else if (key === 'f') cameraControls.current.toggleFollowing();
        else if (key === 'm') {
          stop();
          setTab('map');
        } else
          cameraControls.current.zoomCamera(
            framing.current.zoom * (key === '-' ? 1 / 1.2 : 1.2),
          );
      }
    };
    const up = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const blur = () => {
      clear();
      setMessage('已暂停行走，点击路面或方向键继续。');
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    const tick = (now: number) => {
      const seconds = last
        ? Math.max(0, Math.min((now - last) / 1000, 0.1))
        : 0;
      const travel = cityPilotFrameTravel(seconds);
      last = now;
      const old = position.current;
      let next = { ...old };
      let arrived = false;
      let walked = 0;
      let manualInput: CityPoint | null = null;
      const k = keys.current;
      const input = {
        x:
          Number(k.has('d') || k.has('arrowright')) -
          Number(k.has('a') || k.has('arrowleft')) +
          hold.current.x,
        y:
          Number(k.has('s') || k.has('arrowdown')) -
          Number(k.has('w') || k.has('arrowup')) +
          hold.current.y,
      };
      const cameraMode = activeMode.current;
      const cameraScene = activeScene.current;
      if (
        !document.hidden &&
        (!transitioning.current || !changingAngle.current) &&
        ready.current[viewKey(cameraScene, cameraMode)]
      ) {
        if (input.x || input.y) {
          const identity = `${input.x}:${input.y}`;
          if (heldHeading.current?.input !== identity)
            heldHeading.current = null;
          let directed = input;
          if (heldHeading.current) {
            const a = cityPilotPaint(old, cameraMode, cameraScene),
              b = cityPilotPaint(
                {
                  x: old.x + heldHeading.current.vector.x,
                  y: old.y + heldHeading.current.vector.y,
                },
                cameraMode,
                cameraScene,
              );
            directed = { x: b.x - a.x, y: b.y - a.y };
          }
          manualInput = directed;
          const step = advanceCityPilotInput(
            old,
            directed,
            travel,
            cameraMode,
            cameraScene,
          );
          next = step.point;
          walked = step.spent;
        } else if (route.current.length) {
          const step = advanceCityPilotRoute(
            old,
            route.current,
            travel,
            cameraMode,
            cameraScene,
          );
          next = step.point;
          walked = step.spent;
          route.current.splice(0, step.used);
          if (step.blocked) {
            route.current = [];
            target.current = null;
            journey.current = [];
            setMessage('前路受阻，已停步。请选择另一处开放铺装。');
          }
        }
        // Intermediate streets keep the destination. A zero-length route can
        // arrive when the player is already at the selected threshold.
        if (
          !input.x &&
          !input.y &&
          !route.current.length &&
          journey.current.length <= 1 &&
          target.current &&
          distance(next, target.current.point) < 2
        ) {
          const place = target.current;
          target.current = null;
          journey.current = [];
          setOpened(place);
          arrived = true;
          setMessage(`已到${place.name.split(' · ')[0]}门前。`);
        }
      }
      const moved = distance(old, next) > 1e-6;
      if (moved) {
        heading.current = { x: next.x - old.x, y: next.y - old.y };
        const a = cityPilotPaint(old, cameraMode, cameraScene),
          b = cityPilotPaint(next, cameraMode, cameraScene);
        direction.current = cityWalkFacing(
          { x: b.x - a.x, y: b.y - a.y },
          direction.current,
        );
        travelled.current += walked;
      }
      position.current = next;
      if (moved && !browsingRef.current) trackingCamera.current = true;
      if (
        framing.current.following &&
        !browsingRef.current &&
        !transitioning.current &&
        trackingCamera.current
      ) {
        const camera = cityArtCamera(cameraMode, cameraScene);
        const foot = cityPilotPaint(next, cameraMode, cameraScene);
        const current = transform.current;
        const wanted = cityCameraFollow(
          current.origin,
          foot,
          current.scale,
          previousSize.current,
          seconds,
        );
        const safe = cityCameraOrigin(
          wanted,
          foot,
          current.scale,
          previousSize.current,
          camera,
          cityCameraActorScale(
            cityArtDepth(next, cameraMode, cameraScene),
            current.scale,
            previousSize.current,
          ),
        );
        const base = {
          x: previousSize.current.width * 0.52 - foot.x * current.scale,
          y: previousSize.current.height * 0.66 - foot.y * current.scale,
        };
        const offset = { x: safe.x - base.x, y: safe.y - base.y };
        // Keep the previous origin by adjusting pan even inside the dead zone.
        // Otherwise the old base expression would glue the camera to the feet.
        setPan((old) => (distance(old, offset) > 1e-6 ? offset : old));
      }
      if (!input.x && !input.y) heldHeading.current = null;
      const leg = journey.current[0];
      const queued =
        leg?.nextScene && !route.current.length ? leg.nextScene : null;
      const prior = recentCrossing.current;
      const excluded =
        prior && now - prior.time < 1000 && distance(prior.point, next) < 14
          ? prior.previous
          : null;
      const manual = manualInput
        ? cityPilotInputCrossing(
            next,
            manualInput,
            cameraMode,
            cameraScene,
            excluded,
          )
        : null;
      const crossing =
        !transitioning.current && !arrived
          ? (queued ?? manual?.scene ?? null)
          : null;
      if (
        crossing &&
        !ready.current[viewKey(crossing, cameraMode)] &&
        waitingForStreet.current !== crossing
      ) {
        waitingForStreet.current = crossing;
        setRequestedScene(crossing);
        setMessage(`已到岔路，正在准备${CITY_ART_SCENES[crossing].name}。`);
      }
      if (
        crossing &&
        ready.current[viewKey(crossing, cameraMode)] &&
        cityPilotWalkable(next, 1, crossing)
      ) {
        recentCrossing.current = {
          previous: cameraScene,
          point: { ...next },
          time: now,
        };
        waitingForStreet.current = null;
        if (queued) {
          journey.current.shift();
          const nextLeg = journey.current[0];
          route.current = nextLeg?.path ?? [];
          if (nextLeg?.nextScene) setRequestedScene(nextLeg.nextScene);
        }
        if (!queued && manual) heading.current = manual.direction;
        switchCameraRef.current(cameraMode, crossing);
        wasMoving = false;
        raf = requestAnimationFrame(tick);
        return;
      }
      // Publish each actual display frame. A separate 32ms timer alternated
      // between two and three refreshes and made steady motion look uneven.
      if (arrived || moved || wasMoving) {
        setView({
          point: next,
          direction: direction.current,
          frame: moved
            ? Math.floor(travelled.current / (CITY_PILOT_STRIDE / 6)) % 6
            : 0,
        });
      }
      wasMoving = moved;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clear();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [tab, opened]);
  useEffect(() => {
    const element = surface.current;
    if (!element || tab !== 'street') return;
    const wheel = (event: WheelEvent) => {
      if (cameraControls.current.blocked) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      cameraControls.current.zoomCamera(
        framing.current.zoom * Math.exp(-event.deltaY * 0.001),
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    const context = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('button,a,dialog'))
        event.preventDefault();
    };
    element.addEventListener('contextmenu', context);
    return () => {
      element.removeEventListener('wheel', wheel);
      element.removeEventListener('contextmenu', context);
    };
  }, [tab]);
  const close = () => {
    setOpened(null);
    surface.current?.focus({ preventScroll: true });
  };
  const exitInterior = () => {
    stop();
    setInterior(null);
    setOpened(null);
    setMessage('');
    requestAnimationFrame(() =>
      surface.current?.focus({ preventScroll: true }),
    );
  };
  useEffect(() => {
    if (!opened || interior) return;
    const element =
      surface.current?.querySelector<HTMLButtonElement>(
        '[data-enter-interior]',
      ) ??
      surface.current?.querySelector<HTMLButtonElement>('[data-close-place]');
    element?.focus();
    const key = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === 'e' &&
        !event.repeat &&
        cityInteriorScene(opened.id)
      ) {
        event.preventDefault();
        stop();
        setInterior(cityInteriorScene(opened.id));
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpened(null);
        surface.current?.focus({ preventScroll: true });
      }
      if (event.key === 'Tab') {
        const buttons =
          surface.current?.querySelectorAll<HTMLButtonElement>('dialog button');
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
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [opened, interior]);
  const nearby = places.find(
    (place) =>
      distance(view.point, place.point) < 22 &&
      cityPilotLine(view.point, place.point, scene),
  );
  const junctionChoices = cityPilotJunctionChoices(view.point, scene);

  return (
    <main
      className={`${styles.shell} ${appearance === 'paper' ? styles.paper : ''}`}
    >
      <header className={styles.header} inert={Boolean(opened)}>
        <div className={styles.brand}>
          SINE FINE{' '}
          <h1>{appearance === 'paper' ? '冬木市' : '冬木 2.5D 街区'}</h1>
        </div>
        <nav aria-label="冬木场景视图">
          <button
            type="button"
            aria-pressed={tab === 'map'}
            onClick={() => switchTab('map')}
          >
            <MapIcon size={16} />
            {appearance === 'paper' ? '地图' : '2D 冬木总览'}
          </button>
          <button
            type="button"
            aria-pressed={tab === 'street'}
            onClick={() => switchTab('street')}
          >
            <Footprints size={16} />
            {appearance === 'paper' ? '漫游' : '2.5D 街区'}
          </button>
          <button
            type="button"
            aria-pressed={tab === 'catalog'}
            onClick={() => switchTab('catalog')}
          >
            <Palette size={16} />
            {appearance === 'paper' ? '人物与住宅' : '人物与室内'}
          </button>
        </nav>
        <Link href="/fate/street">
          <ArrowLeft size={16} />
          返回游戏
        </Link>
      </header>
      <div
        className={styles.stage}
        ref={surface}
        role="application"
        tabIndex={0}
        aria-label={`${CITY_ART_SCENES[scene].name}，WASD行走，点路面或入口前往，拖动浏览，滚轮或双指缩放，Q/R或V切换取景，E交互，Escape停止，M打开地图`}
        data-city-road={CITY_ART_SCENES[scene].roadId}
        data-city-scene={scene}
        data-city-mode={mode}
        data-view-transition={Boolean(outgoing)}
        data-world-x={view.point.x.toFixed(3)}
        data-world-y={view.point.y.toFixed(3)}
        data-world-x-exact={view.point.x}
        data-world-y-exact={view.point.y}
        data-city-zoom={zoom.toFixed(3)}
        data-city-following={following}
        data-city-browsing={browsing}
        data-camera-origin-x={origin.x}
        data-camera-origin-y={origin.y}
        data-camera-scale={scale}
        data-city-load={load[viewKey(scene, mode)]}
        onPointerDownCapture={(event) => {
          if (!pointers.current.size) gestureClick.current = false;
          if (
            event.pointerType !== 'touch' ||
            !pointers.current.size ||
            tab !== 'street' ||
            opened ||
            transitioning.current
          )
            return;
          if (!pinch.current && pointers.current.size === 1) {
            // Catch a second finger before entrance labels or the direction pad
            // interpret it as their own action. Overlay labels must not break
            // a pinch that began on the street.
            event.preventDefault();
            event.stopPropagation();
            pointers.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
            event.currentTarget.setPointerCapture(event.pointerId);
            const [a, b] = [...pointers.current.values()];
            const rect = event.currentTarget.getBoundingClientRect();
            pinch.current = {
              span: distance(a, b),
              center: {
                x: (a.x + b.x) / 2 - rect.left,
                y: (a.y + b.y) / 2 - rect.top,
              },
            };
            gestureClick.current = true;
            drag.current = null;
            stop();
            setBrowsing(true);
          } else if (pinch.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onClickCapture={(event) => {
          if (gestureClick.current && event.detail > 0) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerDown={(event) => {
          const touchLabel =
            event.pointerType === 'touch' &&
            Boolean(
              (event.target as HTMLElement).closest(
                '[data-street-exit],[data-street-entrance]',
              ),
            );
          if (
            tab !== 'street' ||
            opened ||
            transitioning.current ||
            !ready.current[viewKey(activeScene.current, activeMode.current)] ||
            ![0, 1, 2].includes(event.button) ||
            (!touchLabel &&
              (event.target as HTMLElement).closest(
                'button,input,select,a,dialog,[role="dialog"]',
              ))
          )
            return;
          if (touchLabel) {
            // A single tap keeps the label's ordinary button action. Remember
            // its finger only so a second touch can promote it to a pinch.
            pointers.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
            return;
          }
          surface.current?.focus({ preventScroll: true });
          event.preventDefault();
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          event.currentTarget.setPointerCapture(event.pointerId);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const rect = event.currentTarget.getBoundingClientRect();
            pinch.current = {
              span: distance(a, b),
              center: {
                x: (a.x + b.x) / 2 - rect.left,
                y: (a.y + b.y) / 2 - rect.top,
              },
            };
            drag.current = null;
            stop();
            setBrowsing(true);
            return;
          }
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            pan: { ...effectivePan },
            moved: event.button !== 0,
            stopped: false,
          };
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (pinch.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const rect = event.currentTarget.getBoundingClientRect();
            const span = distance(a, b);
            const center = {
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
            return;
          }
          const d = drag.current;
          if (!d || d.id !== event.pointerId) return;
          const x = event.clientX - d.x,
            y = event.clientY - d.y;
          if (!d.moved && Math.hypot(x, y) > 5) {
            d.moved = true;
          }
          if (d.moved) {
            if (!d.stopped) {
              stop();
              d.stopped = true;
              setMessage('浏览街景中，点击路面继续行走。');
            }
            trackingCamera.current = false;
            setBrowsing(true);
            setPan({ x: d.pan.x + x, y: d.pan.y + y });
          }
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          if (pinch.current) {
            pinch.current = null;
            pointers.current.clear();
            drag.current = null;
            return;
          }
          const d = drag.current;
          drag.current = null;
          if (!d || d.id !== event.pointerId) return;
          if (d.moved) return;
          const rect = event.currentTarget.getBoundingClientRect(),
            camera = transform.current;
          const paint = {
            x: (event.clientX - rect.left - camera.origin.x) / camera.scale,
            y: (event.clientY - rect.top - camera.origin.y) / camera.scale,
          };
          // The painted doorstep itself is clickable, as well as its label.
          // Use a screen-sized touch target rather than an invisible world radius.
          const place = registeredPlaces[activeScene.current]
            .filter(
              (place) =>
                distance(
                  cityPilotPaint(
                    place.point,
                    activeMode.current,
                    activeScene.current,
                  ),
                  paint,
                ) *
                  camera.scale <=
                24,
            )
            .sort(
              (a, b) =>
                distance(
                  cityPilotPaint(
                    a.point,
                    activeMode.current,
                    activeScene.current,
                  ),
                  paint,
                ) -
                distance(
                  cityPilotPaint(
                    b.point,
                    activeMode.current,
                    activeScene.current,
                  ),
                  paint,
                ),
            )[0];
          if (place) {
            walkTo(place.point, place);
            return;
          }
          if (
            !cityArtRegistered(
              paint,
              true,
              activeMode.current,
              activeScene.current,
            )
          ) {
            setMessage('这里是建筑或画面边缘，请选择开放路面。');
            return;
          }
          walkTo(
            cityPilotWorld(paint, activeMode.current, activeScene.current),
          );
        }}
        onPointerCancel={() => {
          drag.current = null;
          pointers.current.clear();
          pinch.current = null;
          hold.current = { x: 0, y: 0 };
        }}
        onLostPointerCapture={(event) => {
          pointers.current.delete(event.pointerId);
          if (drag.current?.id === event.pointerId) drag.current = null;
        }}
      >
        {tab === 'map' ? (
          <FateCityAtlas
            point={view.point}
            scene={scene}
            onDestination={walkFromMap}
            onEnter={(nextScene) => {
              switchTab('street');
              if (nextScene !== activeScene.current) walkConnection(nextScene);
            }}
            onPreview={previewScene}
          />
        ) : tab === 'catalog' ? (
          <section className={styles.catalog}>
            <h2>人物与地点</h2>
            <section>
              <h3>人物</h3>
              <div className={styles.cast}>
                {CHARACTER_ART.map((actor) => (
                  <article key={actor.id}>
                    <strong>{actor.name}</strong>
                    <span>
                      {actor.stage === 'study-ready' ? '可用' : '制作中'}
                    </span>
                    {actor.variants.length > 1 && (
                      <small>{actor.variants.join(' / ')}</small>
                    )}
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h3>地点</h3>
              <div className={styles.interiors}>
                {CITY_INTERIOR_IDS.map((id) => CITY_INTERIOR_SCENES[id]).map(
                  (home) => (
                    <article key={home.id}>
                      <h4>{home.name}</h4>
                      <span>{home.room}</span>
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() =>
                          walkFromMap({ type: 'place', id: home.id })
                        }
                      >
                        沿路前往门口
                      </button>
                    </article>
                  ),
                )}
              </div>
            </section>
          </section>
        ) : (
          <>
            {outgoing && <FateCityArtLayer {...outgoing} departing />}
            <FateCityArtLayer
              scene={scene}
              mode={mode}
              view={view}
              origin={origin}
              scale={scale}
              actorScale={actorScale}
              actorReady={load[viewKey(scene, mode)] === 'ready'}
              arriving={Boolean(outgoing)}
              inert={
                Boolean(opened) ||
                Boolean(outgoing) ||
                load[viewKey(scene, mode)] !== 'ready'
              }
            />
            <FateCityWayfinding
              scene={scene}
              mode={mode}
              origin={origin}
              scale={scale}
              size={size}
              places={places}
              actorBounds={actorBounds}
              onPlace={(place) => walkTo(place.point, place)}
              onExit={walkConnection}
              inert={
                Boolean(opened) ||
                Boolean(outgoing) ||
                load[viewKey(scene, mode)] !== 'ready'
              }
            />
            <FateCityMinimap
              point={view.point}
              scene={scene}
              onOpen={() => switchTab('map')}
              inert={Boolean(opened)}
            />
            <div className={styles.sceneBadge}>
              {CITY_ART_SCENES[scene].name}
              <span>柔和初夏 · {cityArtCamera(mode, scene).label}</span>
            </div>
            <fieldset
              className={styles.cameraModes}
              inert={Boolean(opened)}
              aria-label="街道取景"
            >
              {CITY_ART_MODES.map((cameraMode) => (
                <button
                  key={cameraMode}
                  type="button"
                  aria-pressed={mode === cameraMode}
                  disabled={
                    load[viewKey(scene, cameraMode)] !== 'ready' ||
                    Boolean(outgoing)
                  }
                  title={
                    load[viewKey(scene, cameraMode)] === 'pending'
                      ? '正在准备完整街景'
                      : load[viewKey(scene, cameraMode)] === 'failed'
                        ? '画面未能加载，请重试'
                        : undefined
                  }
                  onClick={() => switchCamera(cameraMode)}
                >
                  {cityArtCamera(cameraMode, scene).label}
                </button>
              ))}
            </fieldset>
            {load[viewKey(scene, mode)] !== 'ready' && (
              <output className={styles.loadNotice}>
                {load[viewKey(scene, mode)] === 'failed'
                  ? '街景未能加载。'
                  : '正在准备完整街景…'}
                {load[viewKey(scene, mode)] === 'failed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoad((old) => ({
                        ...old,
                        [viewKey(scene, mode)]: 'pending',
                      }));
                      setRetry((old) => old + 1);
                    }}
                  >
                    重新加载
                  </button>
                )}
              </output>
            )}
            {load[viewKey(scene, mode)] === 'ready' &&
              CITY_ART_MODES.some(
                (cameraMode) => load[viewKey(scene, cameraMode)] === 'failed',
              ) && (
                <button
                  className={styles.loadNotice}
                  type="button"
                  onClick={() => {
                    setRetry((old) => old + 1);
                  }}
                >
                  其他取景未能加载，点击重试
                </button>
              )}
            <div
              className={styles.mapTools}
              inert={Boolean(opened) || Boolean(outgoing)}
            >
              <button
                type="button"
                aria-label="缩小街景"
                disabled={Boolean(outgoing)}
                onClick={() => zoomCamera(framing.current.zoom / 1.2)}
              >
                <Minus size={17} />
              </button>
              <output>{Math.round(zoom * 100)}%</output>
              <button
                type="button"
                aria-label="放大街景"
                disabled={Boolean(outgoing)}
                onClick={() => zoomCamera(framing.current.zoom * 1.2)}
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                aria-label="显示完整街景"
                disabled={Boolean(outgoing)}
                title="显示完整街景（Home）"
                onClick={resetCamera}
              >
                <Focus size={17} />
              </button>
              <button
                type="button"
                aria-pressed={following}
                disabled={Boolean(outgoing)}
                title="自动跟随，走出画面中心后平滑移动（F）"
                onClick={toggleFollowing}
              >
                跟随
              </button>
            </div>
            {nearby && !opened && (
              <button type="button" className={styles.nearby} onClick={inspect}>
                查看{nearby.name.split(' · ')[0]} <kbd>E</kbd>
              </button>
            )}
            <div
              className={styles.directionPad}
              inert={Boolean(opened) || load[viewKey(scene, mode)] !== 'ready'}
            >
              {[
                { label: '向上行走', x: 0, y: -1, icon: '↑' },
                { label: '向左行走', x: -1, y: 0, icon: '←' },
                { label: '向下行走', x: 0, y: 1, icon: '↓' },
                { label: '向右行走', x: 1, y: 0, icon: '→' },
              ].map((input) => (
                <button
                  key={input.label}
                  type="button"
                  aria-label={input.label}
                  disabled={load[viewKey(scene, mode)] !== 'ready'}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    stop();
                    setBrowsing(false);
                    hold.current = { x: input.x, y: input.y };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerUp={() => {
                    hold.current = { x: 0, y: 0 };
                  }}
                  onPointerCancel={() => {
                    hold.current = { x: 0, y: 0 };
                  }}
                  onLostPointerCapture={() => {
                    hold.current = { x: 0, y: 0 };
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      stop();
                      setBrowsing(false);
                      hold.current = { x: input.x, y: input.y };
                    }
                  }}
                  onKeyUp={() => {
                    hold.current = { x: 0, y: 0 };
                  }}
                  onBlur={() => {
                    hold.current = { x: 0, y: 0 };
                  }}
                >
                  {input.icon}
                </button>
              ))}
            </div>
          </>
        )}
        {interior && (
          <FateCityInterior
            key={interior.id}
            scene={interior}
            onExit={exitInterior}
          />
        )}
        {opened && !interior && (
          <div className={styles.dialogShade}>
            <dialog
              open
              aria-modal="true"
              aria-label={opened.name}
              className={styles.dialog}
            >
              <button
                data-close-place
                type="button"
                className={styles.close}
                aria-label="关闭地点"
                onClick={close}
              >
                <X size={21} />
              </button>
              <h2>{opened.name}</h2>
              {opened.id === 'park' && <p>{opened.note}</p>}
              {cityInteriorScene(opened.id) && (
                <>
                  <button
                    data-enter-interior
                    type="button"
                    className={styles.primary}
                    onClick={() => {
                      stop();
                      setInterior(cityInteriorScene(opened.id));
                    }}
                  >
                    进入室内
                  </button>
                </>
              )}
              <button type="button" className={styles.primary} onClick={close}>
                继续走走
              </button>
            </dialog>
          </div>
        )}
      </div>
      <footer className={styles.footer} hidden={Boolean(opened)}>
        {tab === 'street' && (
          <div className={styles.quickPlaces}>
            {places.map((place) => (
              <button
                key={place.id}
                type="button"
                disabled={
                  Boolean(outgoing) || load[viewKey(scene, mode)] !== 'ready'
                }
                onClick={() => walkTo(place.point, place)}
              >
                {place.id === 'miyama-florist' ? (
                  <Flower2 size={14} />
                ) : place.id === 'old-bookshop' ? (
                  <BookOpen size={14} />
                ) : (
                  <Home size={14} />
                )}{' '}
                {place.name.split(' · ')[0]}
              </button>
            ))}
            {cityArtExits(scene)
              .filter(
                (exit, index, all) =>
                  all.findIndex((item) => item.scene === exit.scene) === index,
              )
              .map((exit) => (
                <button
                  key={exit.scene}
                  type="button"
                  data-junction-choice={
                    junctionChoices.some(
                      (choice) => choice.scene === exit.scene,
                    )
                      ? exit.scene
                      : undefined
                  }
                  disabled={
                    Boolean(outgoing) || load[viewKey(scene, mode)] !== 'ready'
                  }
                  onClick={() => walkConnection(exit.scene)}
                >
                  <Footprints size={14} />
                  {junctionChoices.some(
                    (choice) => choice.scene === exit.scene,
                  ) && (
                    <kbd>
                      {junctionChoices.findIndex(
                        (choice) => choice.scene === exit.scene,
                      ) + 1}
                    </kbd>
                  )}
                  前往
                  {CITY_ART_SCENES[exit.scene].name}
                </button>
              ))}
            {requestedScene &&
              requestedScene !== scene &&
              load[viewKey(requestedScene, mode)] === 'failed' && (
                <button
                  type="button"
                  onClick={() => setRetry((old) => old + 1)}
                >
                  重新加载相邻街景
                </button>
              )}
            <button
              type="button"
              aria-label="停止行走"
              onClick={() => {
                stop();
                setMessage('已停步。');
              }}
            >
              <Square size={15} />
            </button>
          </div>
        )}
        <div>
          <p>
            <output>
              {tab === 'street' ? message : tab === 'map' ? mapMessage : ''}
            </output>
          </p>
        </div>
        <details className={styles.controlsHelp}>
          <summary>操作</summary>
          <p>点道路或建筑沿路前往；WASD 行走，E 交互，Esc 停步。</p>
          <p>拖动查看，滚轮或双指缩放；Q/R 换取景，F 跟随，M 地图。</p>
        </details>
      </footer>
    </main>
  );
}
