'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- This application surface implements keyboard walking; controls and modal dialogs remain semantic elements. */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  advanceCityPilotInput,
  advanceCityPilotRoute,
  cityPilotFrameTravel,
  CITY_PILOT_STRIDE,
  cityPilotWalkable,
  cityPilotInputCrossing,
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
import { CHARACTER_ART, CHARACTER_ART_ACTIONS } from '@/lib/fate-character-art';
import { INTERIOR_ART, STORE_INTERIOR_ART } from '@/lib/fate-interior-art';
import type { CityPoint } from '@/lib/fate-city-layout';
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

export default function FateCityArt() {
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
  const loadingImages = useRef(new Map<string, HTMLImageElement>());
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
  const [following, setFollowing] = useState(false),
    [message, setMessage] = useState('选择门口沿路前往，也可以直接行走。');
  const [browsing, setBrowsing] = useState(false);
  const [opened, setOpened] = useState<ArtPlace | null>(null);
  const surface = useRef<HTMLDivElement>(null),
    position = useRef<CityPoint>({ ...MIYAMA_PILOT.start });
  const initiallyFramed = useRef(false);
  const previousSize = useRef({ width: 1000, height: 650 });
  const framing = useRef({ zoom: 1, following: false });
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
  } | null>(null);
  const hold = useRef<CityPoint>({ x: 0, y: 0 });
  const painting = cityArtCamera(mode, scene);
  const scale =
    Math.min(size.width / painting.width, size.height / painting.height) * zoom;
  const player = cityPilotPaint(view.point, mode, scene);
  // At normal scale show the entire painting. Following is an explicit option
  // at close range; returning to the map never resets world position or zoom.
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
  const transform = useRef({ origin, scale });
  useEffect(() => {
    transform.current = { origin, scale };
    framing.current = { zoom, following };
  });
  useEffect(() => {
    // Only decode this street's three views and neighboring street fronts.
    // Loading every city painting at startup would use hundreds of MB.
    const views = [
      ...CITY_ART_MODES.map((mode) => ({ scene, mode })),
      ...cityArtExits(scene).map((exit) => ({ scene: exit.scene, mode })),
      ...(requestedScene
        ? CITY_ART_MODES.map((mode) => ({ scene: requestedScene, mode }))
        : []),
    ];
    for (const { scene: cameraScene, mode: cameraMode } of views) {
      const key = viewKey(cameraScene, cameraMode);
      if (ready.current[key] || loadingImages.current.has(key)) continue;
      const image = new window.Image();
      loadingImages.current.set(key, image);
      setLoad((old) => ({ ...old, [key]: 'pending' }));
      const finish = (status: 'ready' | 'failed') => {
        loadingImages.current.delete(key);
        if (!mounted.current) return;
        ready.current[key] = status === 'ready';
        setLoad((old) => ({ ...old, [key]: status }));
      };
      image.onload = () => {
        void image
          .decode()
          .then(() => finish('ready'))
          .catch(() => finish('failed'));
      };
      image.onerror = () => finish('failed');
      image.src = cityArtCamera(cameraMode, cameraScene).painting;
    }
  }, [scene, mode, retry, requestedScene]);
  useEffect(() => {
    mounted.current = true;
    const images = loadingImages.current;
    return () => {
      mounted.current = false;
      for (const image of images.values()) {
        image.onload = null;
        image.onerror = null;
      }
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
      view: { point, direction: direction.current, frame: 0 },
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
    if (keys.current.size || hold.current.x || hold.current.y) {
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
    direction.current = nextDirection;
    setView({ point, direction: nextDirection, frame: 0 });
    setMode(next);
    setScene(nextScene);
    setMessage(
      nextScene === scene
        ? `切到「${nextCamera.label}」，人物位置与路线保持。`
        : `已走进${CITY_ART_SCENES[nextScene].name}，保留取景和站位。`,
    );
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 1
      : 380;
    transitionTimer.current = setTimeout(() => {
      transitioning.current = false;
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
  };
  const switchTab = (next: typeof tab) => {
    stop();
    setOpened(null);
    setTab(next);
  };
  const inspect = () => {
    const nearest = registeredPlaces[
      activeScene.current
    ].reduce<ArtPlace | null>(
      (best, place) =>
        distance(position.current, place.point) < 22 &&
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
    const path = cityPilotRoute(position.current, point, activeScene.current);
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
    setMessage(`预览${CITY_ART_SCENES[nextScene].name}，不改变游戏存档。`);
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
      keys.current.clear();
      hold.current = { x: 0, y: 0 };
      heldHeading.current = null;
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
      if (transitioning.current) return;
      if (key === 'e' && !event.repeat) {
        event.preventDefault();
        inspectRef.current();
      } else if (key === 'v' && !event.repeat) {
        event.preventDefault();
        const current = CITY_ART_MODES.indexOf(activeMode.current);
        switchCameraRef.current(
          CITY_ART_MODES[(current + 1) % CITY_ART_MODES.length],
        );
      } else if (key === 'escape') {
        event.preventDefault();
        clear();
        route.current = [];
        setTab('map');
      }
    };
    const up = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    const tick = (now: number) => {
      const travel = cityPilotFrameTravel(last ? (now - last) / 1000 : 0);
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
        !transitioning.current &&
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
        direction.current = face(
          cityPilotPaint(old, cameraMode, cameraScene),
          cityPilotPaint(next, cameraMode, cameraScene),
        );
        travelled.current += walked;
      }
      position.current = next;
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
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, [tab, opened]);
  useEffect(() => {
    const element = surface.current;
    if (!element || tab !== 'street') return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((old) => clamp(old * Math.exp(-event.deltaY * 0.001), 0.5, 8));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [tab]);
  const close = () => {
    setOpened(null);
    surface.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!opened) return;
    const element =
      surface.current?.querySelector<HTMLButtonElement>('[data-close-place]');
    element?.focus();
    const key = (event: KeyboardEvent) => {
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
  }, [opened]);
  const nearby = places.find((place) => distance(view.point, place.point) < 22);

  return (
    <main className={styles.shell}>
      <header className={styles.header} inert={Boolean(opened)}>
        <div className={styles.brand}>
          SINE FINE <h1>冬木街区制作</h1>
        </div>
        <nav aria-label="美术预览方式">
          <button
            type="button"
            aria-pressed={tab === 'map'}
            onClick={() => switchTab('map')}
          >
            <MapIcon size={16} />
            2D 冬木总览
          </button>
          <button
            type="button"
            aria-pressed={tab === 'street'}
            onClick={() => switchTab('street')}
          >
            <Footprints size={16} />
            2.5D 街区
          </button>
          <button
            type="button"
            aria-pressed={tab === 'catalog'}
            onClick={() => switchTab('catalog')}
          >
            <Palette size={16} />
            人物与室内
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
        aria-label={`${CITY_ART_SCENES[scene].name}，WASD行走，点路面前往，拖动浏览，滚轮缩放，V切换取景，E查看门口，Escape打开地图`}
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
        data-city-load={load[viewKey(scene, mode)]}
        onPointerDown={(event) => {
          if (
            tab !== 'street' ||
            opened ||
            transitioning.current ||
            !ready.current[viewKey(activeScene.current, activeMode.current)] ||
            event.button !== 0 ||
            (event.target as HTMLElement).closest(
              'button,input,select,a,[role="dialog"]',
            )
          )
            return;
          surface.current?.focus({ preventScroll: true });
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            pan: { ...effectivePan },
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d || d.id !== event.pointerId) return;
          const x = event.clientX - d.x,
            y = event.clientY - d.y;
          if (Math.hypot(x, y) > 5) d.moved = true;
          if (d.moved) {
            setBrowsing(true);
            setPan({ x: d.pan.x + x, y: d.pan.y + y });
          }
        }}
        onPointerUp={(event) => {
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
          hold.current = { x: 0, y: 0 };
        }}
        onLostPointerCapture={() => {
          drag.current = null;
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
            <div>
              <span className={styles.eyebrow}>
                三个制作部分 · 共用融合版画风
              </span>
              <h2>人物、街区与室内一起成形</h2>
              <p>
                全城街道已按地图扩展；人物和室内继续分别制作。已有生活、记忆和存档继续保留。
              </p>
            </div>
            <section>
              <h3>全角色 · 2.5D 形象与动作</h3>
              <p>{CHARACTER_ART_ACTIONS.join(' · ')}</p>
              <div className={styles.cast}>
                {CHARACTER_ART.map((actor) => (
                  <article key={actor.id}>
                    <strong>{actor.name}</strong>
                    <span>
                      {actor.stage === 'study-ready'
                        ? '四方向动作样板已接入'
                        : '形象与动作待精修'}
                    </span>
                    {actor.variants.length > 1 && (
                      <small>{actor.variants.join(' / ')}</small>
                    )}
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h3>各家室内 · 房间与生活用品</h3>
              <p>
                门口对应实际住处；房间功能与家具碰撞沿用已有机制，分别绘制外观。
              </p>
              <div className={styles.interiors}>
                {INTERIOR_ART.map((home) => (
                  <article key={home.id}>
                    <h4>{home.name}</h4>
                    <p>{home.signature}</p>
                    <span>{home.materials}</span>
                    <small>
                      {home.rooms.map((room) => room.purpose).join(' · ')}
                    </small>
                    <b>原画待制作</b>
                  </article>
                ))}
              </div>
              <p className={styles.note}>
                店面室内：
                {STORE_INTERIOR_ART.map((store) => store.name).join(' · ')}
                ，各自制作柜台、座位或陈列区。
              </p>
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
                onClick={() => setZoom((old) => clamp(old / 1.2, 0.5, 8))}
              >
                <Minus size={17} />
              </button>
              <output>{Math.round(zoom * 100)}%</output>
              <button
                type="button"
                aria-label="放大街景"
                disabled={Boolean(outgoing)}
                onClick={() => setZoom((old) => clamp(old * 1.2, 0.5, 8))}
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                aria-label="显示完整街景"
                disabled={Boolean(outgoing)}
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setFollowing(false);
                  setBrowsing(false);
                }}
              >
                <Focus size={17} />
              </button>
              <button
                type="button"
                aria-pressed={following}
                disabled={Boolean(outgoing)}
                onClick={() => {
                  setFollowing((old) => !old);
                  setPan({ x: 0, y: 0 });
                  setBrowsing(false);
                }}
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
        {opened && (
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
              <span className={styles.eyebrow}>已走到门前</span>
              <h2>{opened.name}</h2>
              <p>{opened.note}</p>
              {INTERIOR_ART.find((home) => home.id === opened.id) && (
                <>
                  <p>
                    {
                      INTERIOR_ART.find((home) => home.id === opened.id)!
                        .signature
                    }
                  </p>
                  <p className={styles.note}>
                    本页用于美术和道路验收，室内原画与居民日常尚未接入这条新街段。
                  </p>
                </>
              )}
              <button type="button" className={styles.primary} onClick={close}>
                继续走走
              </button>
            </dialog>
          </div>
        )}
      </div>
      <footer className={styles.footer} inert={Boolean(opened)}>
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
                  disabled={
                    Boolean(outgoing) || load[viewKey(scene, mode)] !== 'ready'
                  }
                  onClick={() => walkConnection(exit.scene)}
                >
                  <Footprints size={14} /> 前往
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
              {tab === 'street'
                ? message
                : tab === 'map'
                  ? mapMessage
                  : '制作覆盖所有角色、住宅与店面。'}
            </output>
          </p>
          <span>
            {tab === 'street'
              ? 'WASD 行走 · 点路面前往 · 拖动浏览 · 滚轮缩放 · V 换取景 · E 查看'
              : '美术预览不改变游戏进度'}
          </span>
        </div>
        <Link href="/fate/art-sample">原融合版样板</Link>
      </footer>
    </main>
  );
}
