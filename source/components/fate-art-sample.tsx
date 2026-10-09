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
  Camera,
  Map as MapIcon,
  RotateCcw,
  CornerUpLeft,
  Minus,
  Plus,
  Square,
  Armchair,
  X,
} from 'lucide-react';
import {
  ART_SAMPLE,
  SAMPLE_ALLEY,
  SAMPLE_PLACES,
  constrainSampleCamera,
  sampleCamera,
  sampleDirection,
  sampleDistance,
  sampleFrame,
  sampleScreenToWorld,
  sampleZoom,
  type SampleCamera,
  type SampleDirection,
  type SamplePlace,
  type SamplePoint,
} from '@/lib/fate-art-sample';
import { ART_SPRITE_FRAMES } from '@/lib/fate-art-sprite';
import {
  SAMPLE_BENCH,
  BENCH_SPRITE,
  BENCH_SPRITE_CELL,
  atSampleBench,
  arriveAtSampleBench,
  sampleBenchSeat,
  type BenchPosture,
} from '@/lib/fate-art-bench';
import {
  NEUTRAL_LOOK,
  SAMPLE_LOOK,
  constrainSampleLook,
  paintedFollowCamera,
  projectPaintedPoint,
  unprojectPaintedGround,
  type SampleLook,
} from '@/lib/fate-art-depth';
import type { PaintedRenderer } from '@/lib/fate-art-depth-runtime';
import { sampleAlleyLook, stepSampleSpring } from '@/lib/fate-art-camera';
import {
  ALLEY_AHEAD,
  NEIGHBORHOOD_CENTER,
  sampleSceneIndex,
  sampleViewWalkScale,
  type SampleScene,
} from '@/lib/fate-art-alley';
import {
  PAINTED_VIEWS,
  ROAD_MODES,
  ROAD_MODE_LABELS,
  VIEW_PAINTINGS,
  beginViewCut,
  stepViewCut,
  viewCutCover,
  viewArea,
  viewForArea,
  isRoadView,
  sampleViewPoint,
  onViewPaving,
  viewActorScale,
  type PaintedView,
  type RoadMode,
  type ViewCut,
} from '@/lib/fate-art-views';
import {
  advanceVisibleSampleRoute,
  visibleSampleRoute,
  moveVisibleSampleInput,
  sampleNavigableScene,
  sampleNavigableView,
  sampleClickTarget,
} from '@/lib/fate-art-navigation';
import styles from './fate-art-sample.module.css';
import FateBlockMap from './fate-block-map';
import {
  BLOCK_AREAS,
  BLOCK_PLACES,
  blockAreaForPlace,
  blockExits,
} from '@/lib/fate-art-block';
import { SLOPE_CENTER, SLOPE_PLACES } from '@/lib/fate-art-extension';

type View = {
  point: SamplePoint;
  camera: SampleCamera;
  direction: SampleDirection;
  frame: number;
  moving: boolean;
  posture: BenchPosture;
  look: SampleLook;
  scene: SampleScene;
  cut: ViewCut;
};
type Drag = {
  id: number;
  start: SamplePoint;
  camera: SampleCamera;
  moved: boolean;
  mode: 'pan' | 'look';
  look: SampleLook;
  view: PaintedView;
};
const ARROWS = [
  { key: 'ArrowUp', label: '向上行走', Icon: ArrowUp },
  { key: 'ArrowLeft', label: '向左行走', Icon: ArrowLeft },
  { key: 'ArrowDown', label: '向下行走', Icon: ArrowDown },
  { key: 'ArrowRight', label: '向右行走', Icon: ArrowRight },
] as const;
const AREA_PLACES = BLOCK_PLACES;
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
  const images = useRef<Partial<Record<PaintedView, HTMLImageElement>>>({});
  const spriteImage = useRef<HTMLImageElement>(null);
  const depthHost = useRef<HTMLDivElement>(null);
  const depthRenderer = useRef<PaintedRenderer | null>(null);
  const point = useRef<SamplePoint>({ ...ART_SAMPLE.start });
  const scene = useRef<SampleScene>('street');
  const roadModeRef = useRef<RoadMode>('overview');
  const cut = useRef(beginViewCut('street'));
  const look = useRef<SampleLook>({ ...NEUTRAL_LOOK });
  const desiredLook = useRef<SampleLook>({ ...NEUTRAL_LOOK });
  const lookVelocity = useRef({ yaw: 0, tilt: 0 });
  const turnFollow = useRef(true);
  const reducedMotion = useRef(false);
  const dimensions = useRef({ width: 1, height: 1 });
  const camera = useRef<SampleCamera>({ x: 0, y: 0, scale: 1 });
  const cameraVelocity = useRef({ x: 0, y: 0 });
  const panCamera = useRef<SampleCamera | null>(null);
  const cameraMode = useRef<'follow' | 'pan'>('follow');
  const travelLead = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const keyOrigins = useRef(new Map<string, SamplePoint>());
  const keyView = useRef<PaintedView>('street');
  const pendingTap = useRef({ x: 0, y: 0 });
  const route = useRef<SamplePoint[]>([]);
  const routePlace = useRef<SamplePlace | null>(null);
  const routeRetries = useRef(0);
  const posture = useRef<BenchPosture>('standing');
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, SamplePoint>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const zoomRef = useRef(1.05);
  const direction = useRef<SampleDirection>('down');
  const distance = useRef(0);
  const modal = useRef<SamplePlace | null>(null);
  const overviewRef = useRef(false);
  const [overview, setOverview] = useState(false);
  const [loaded, setLoaded] = useState<Partial<Record<PaintedView, boolean>>>(
    {},
  );
  const [spriteReady, setSpriteReady] = useState(false);
  const [benchReady, setBenchReady] = useState(false);
  const [benchFailed, setBenchFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [depthStatus, setDepthStatus] = useState<
    'loading' | 'ready' | 'unavailable'
  >('loading');
  const [zoom, setZoom] = useState(1.05);
  const [roadMode, setRoadMode] = useState<RoadMode>('overview');
  const [lookSetting, setLookSetting] = useState<SampleLook>({
    ...NEUTRAL_LOOK,
  });
  const [cameraPanel, setCameraPanel] = useState(false);
  const [turnDrag, setTurnDrag] = useState(false);
  const [followTurns, setFollowTurns] = useState(true);
  const [markers, setMarkers] = useState(true);
  const [place, setPlace] = useState<SamplePlace | null>(null);
  const [target, setTarget] = useState<SamplePoint | null>(null);
  const [notice, setNotice] = useState('沿街走走，也可以切到沿路或平视前路。');
  const [view, setView] = useState<View>({
    point: { ...ART_SAMPLE.start },
    camera: { x: 0, y: 0, scale: 1 },
    direction: 'down',
    frame: 0,
    moving: false,
    posture: 'standing',
    look: { ...NEUTRAL_LOOK },
    scene: 'street',
    cut: beginViewCut('street'),
  });
  const ready =
    PAINTED_VIEWS.every((name) => loaded[name]) && spriteReady && !failed;
  const nearest = AREA_PLACES.find(
    (p) =>
      blockAreaForPlace(p.id).id === view.scene &&
      (view.scene === 'slope'
        ? sampleDistance(
            sampleViewPoint(p.point, view.cut.shown),
            sampleViewPoint(view.point, view.cut.shown),
          ) /
            viewActorScale(view.point, view.cut.shown) <
          55
        : sampleDistance(p.point, view.point) <
          45 / sampleViewWalkScale(sampleSceneIndex(view.scene))),
  );
  const inAlley = view.scene === 'alley';
  const inNeighborhood = view.scene === 'neighborhood';

  const changeRoadMode = useCallback((next: RoadMode) => {
    const selected = sampleNavigableView(scene.current, point.current, next);
    roadModeRef.current = next;
    setRoadMode(next);
    desiredLook.current = { ...NEUTRAL_LOOK };
    setLookSetting({ ...NEUTRAL_LOOK });
    cameraMode.current = 'follow';
    panCamera.current = null;
    setNotice(
      scene.current === 'alley'
        ? `离开小巷后使用「${ROAD_MODE_LABELS[next]}」。`
        : selected !== viewForArea(scene.current, next)
          ? '这里暂用沿路或平视取景，回到路口后恢复所选角度。'
          : `切到「${ROAD_MODE_LABELS[next]}」，人物位置和目的地保持不变。`,
    );
  }, []);
  const changeLook = useCallback((value: SampleLook) => {
    if (!depthRenderer.current) return;
    turnFollow.current = false;
    setFollowTurns(false);
    desiredLook.current = constrainSampleLook(value);
    setLookSetting(desiredLook.current);
  }, []);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotion.current = preference.matches;
    };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let renderer: PaintedRenderer | null = null;
    const fallback = () => {
      if (cancelled) return;
      renderer?.dispose();
      depthRenderer.current = null;
      look.current = desiredLook.current = { ...NEUTRAL_LOOK };
      lookVelocity.current = { yaw: 0, tilt: 0 };
      setLookSetting({ ...NEUTRAL_LOOK });
      setView((v) => ({ ...v, look: { ...NEUTRAL_LOOK } }));
      setDepthStatus('unavailable');
      setTurnDrag(false);
    };
    void import('@/lib/fate-art-depth-runtime')
      .then(({ mountPaintedRelief }) => {
        if (cancelled || !depthHost.current || !spriteImage.current) return;
        renderer = mountPaintedRelief(
          depthHost.current,
          images.current as Record<PaintedView, HTMLImageElement>,
          spriteImage.current,
          fallback,
        );
        depthRenderer.current = renderer;
        renderer.draw({
          point: sampleViewPoint(point.current, cut.current.shown),
          view: cut.current.shown,
          direction: direction.current,
          frame: 0,
          look: look.current,
          actorScale: viewActorScale(point.current, cut.current.shown),
          actorVisible:
            posture.current !== 'sitting' &&
            !isRoadView(cut.current.shown) &&
            onViewPaving(
              sampleViewPoint(point.current, cut.current.shown),
              cut.current.shown,
            ),
        });
        setDepthStatus('ready');
      })
      .catch(fallback);
    return () => {
      cancelled = true;
      renderer?.dispose();
      if (depthRenderer.current === renderer) depthRenderer.current = null;
    };
  }, [ready]);

  const stop = useCallback(() => {
    keys.current.clear();
    keyOrigins.current.clear();
    pendingTap.current = { x: 0, y: 0 };
    route.current = [];
    routePlace.current = null;
    routeRetries.current = 0;
    if (posture.current === 'approaching') {
      posture.current = 'standing';
      setView((v) => ({ ...v, posture: 'standing' }));
    }
    setTarget(null);
  }, []);
  const pressWalkKey = useCallback((key: string) => {
    if (posture.current !== 'standing') {
      const wasSeated = posture.current === 'sitting';
      posture.current = 'standing';
      route.current = [];
      routePlace.current = null;
      setTarget(null);
      setView((v) => ({ ...v, posture: 'standing' }));
      setNotice(
        wasSeated ? '已起身，继续沿街走走。' : '已取消坐下，改为手动行走。',
      );
    }
    if (!keys.current.size) keyView.current = cut.current.shown;
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
      stop();
      posture.current = 'standing';
      setView((v) => ({ ...v, posture: 'standing' }));
      const path = visibleSampleRoute(point.current, target, cut.current.shown);
      if (!path) {
        setNotice('这里是围墙或庭院，请点击路面或门前步道。');
        return false;
      }
      route.current = path;
      routePlace.current = destination;
      setTarget(target);
      setNotice(
        destination
          ? `正走向${destination.name}，可随时停下或改向。`
          : '正走向这里，可随时停下或改向。',
      );
      focusPerson();
      return true;
    },
    [focusPerson, stop],
  );
  const standUp = useCallback(() => {
    stop();
    posture.current = 'standing';
    setView((v) => ({ ...v, posture: 'standing' }));
    setNotice('已起身，可以继续走路。');
    focusPerson();
  }, [focusPerson, stop]);
  const sitOnBench = useCallback(() => {
    if (posture.current === 'sitting') {
      standUp();
      return;
    }
    if (!benchReady) {
      setNotice(benchFailed ? '坐姿未能载入，请刷新重试。' : '正在准备坐姿…');
      return;
    }
    if (atSampleBench(point.current)) {
      stop();
      posture.current = 'sitting';
      setView((v) => ({ ...v, posture: 'sitting', moving: false }));
      setNotice('坐在树下歇一会儿。按 E 起身，方向键也可以继续走。');
      focusPerson();
    } else if (walkTo(SAMPLE_BENCH.point, SAMPLE_BENCH)) {
      posture.current = 'approaching';
      setView((v) => ({ ...v, posture: 'approaching' }));
      setNotice('正走向树下长椅，到椅边后坐下。改向或停下可取消。');
    }
  }, [benchFailed, benchReady, focusPerson, standUp, stop, walkTo]);
  const walkAlley = () => {
    const returning = scene.current !== 'street';
    walkTo(returning ? SAMPLE_ALLEY.street : SAMPLE_ALLEY.inside);
    setNotice(
      returning
        ? '沿石板路返回主街，镜头会恢复你选的取景。'
        : '从咖啡店旁转入小巷，镜头会自动看向前路。',
    );
  };
  const changeZoom = useCallback((value: number, at?: SamplePoint) => {
    const next = sampleZoom(value),
      size = dimensions.current,
      anchor = at ?? { x: size.width / 2, y: size.height / 2 };
    const ground = sampleScreenToWorld(anchor, camera.current),
      scale = sampleCamera(point.current, size.width, size.height, next).scale;
    zoomRef.current = next;
    setZoom(next);
    camera.current = panCamera.current = constrainSampleCamera(
      { x: ground.x - anchor.x / scale, y: ground.y - anchor.y / scale, scale },
      size.width,
      size.height,
    );
    cameraMode.current = 'pan';
    cameraVelocity.current = { x: 0, y: 0 };
    setView((v) => ({ ...v, camera: camera.current }));
  }, []);
  const showWhole = () => {
    const { width, height } = dimensions.current,
      fit = Math.min(width / ART_SAMPLE.width, height / ART_SAMPLE.height),
      cover = Math.max(width / ART_SAMPLE.width, height / ART_SAMPLE.height);
    zoomRef.current = fit / cover;
    setZoom(zoomRef.current);
    camera.current = panCamera.current = {
      x: (ART_SAMPLE.width - width / fit) / 2,
      y: (ART_SAMPLE.height - height / fit) / 2,
      scale: fit,
    };
    cameraMode.current = 'pan';
    cameraVelocity.current = { x: 0, y: 0 };
    setView((v) => ({ ...v, camera: camera.current }));
  };
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      dimensions.current = { width, height };
      const shown = cut.current.shown;
      const seat =
        posture.current === 'sitting' ? sampleBenchSeat(shown) : null;
      camera.current = paintedFollowCamera(
        projectPaintedPoint(
          seat?.point ?? sampleViewPoint(point.current, shown),
          look.current,
          seat?.height ?? 0,
          shown,
        ),
        look.current,
        width,
        height,
        zoomRef.current,
        look.current,
        shown,
      );
      cameraMode.current = 'follow';
      cameraVelocity.current = { x: 0, y: 0 };
      panCamera.current = null;
      setView((v) => ({ ...v, camera: camera.current }));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready) return;
    let frameId = 0,
      last = 0,
      wasMoving = false,
      lastPosture: BenchPosture = 'standing',
      first = true;
    const draw = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const oldCut = cut.current,
        shown = oldCut.shown;
      let input = directionKeys(keys.current),
        tap = false;
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
      const walkingInput = input.x || input.y;
      const frameTravel = ART_SAMPLE.walkSpeed * dt;
      let next = point.current;
      // Both the camera and steering swap while fully covered. A held key keeps
      // its world direction until released; a new key follows the new camera.
      if (
        !overviewRef.current &&
        !modal.current &&
        !oldCut.changing &&
        walkingInput
      ) {
        if (route.current.length) {
          setTarget(null);
          setNotice('已改为手动行走。');
        }
        route.current = [];
        routePlace.current = null;
        routeRetries.current = 0;
        posture.current = 'standing';
        cameraMode.current = 'follow';
        next = moveVisibleSampleInput(
          point.current,
          input,
          tap ? 2 : frameTravel,
          shown,
          look.current,
          keyView.current,
        );
      } else if (
        !overviewRef.current &&
        !modal.current &&
        !oldCut.changing &&
        route.current.length
      ) {
        const destination = route.current.at(-1)!;
        const advanced = advanceVisibleSampleRoute(
          point.current,
          route.current,
          frameTravel,
          shown,
        );
        next = advanced.point;
        route.current.splice(0, advanced.used);
        if (advanced.blocked) {
          const retry =
            routeRetries.current < 2
              ? visibleSampleRoute(next, destination, shown)
              : null;
          routeRetries.current++;
          if (retry) {
            route.current = retry;
          } else {
            route.current = [];
            routePlace.current = null;
            posture.current = 'standing';
            setTarget(null);
            setNotice('前方被挡住了，请重新选择路面上的位置。');
          }
        } else if (!route.current.length) {
          setTarget(null);
          posture.current = arriveAtSampleBench(posture.current, next, true);
          setNotice(
            posture.current === 'sitting'
              ? '坐在树下歇一会儿。按 E 起身，方向键也可以继续走。'
              : routePlace.current
                ? `已到${routePlace.current.name}，可按 E 看看这里。`
                : '已走到这里。',
          );
          routePlace.current = null;
        }
      }
      const travelled = sampleDistance(point.current, next);
      let screenMovement = { x: 0, y: 0 };
      if (travelled > 1e-10) {
        const a = projectPaintedPoint(
            sampleViewPoint(point.current, shown),
            look.current,
            0,
            shown,
          ),
          b = projectPaintedPoint(
            sampleViewPoint(next, shown),
            look.current,
            0,
            shown,
          );
        screenMovement = { x: b.x - a.x, y: b.y - a.y };
        distance.current +=
          Math.hypot(screenMovement.x, screenMovement.y) /
          viewActorScale(next, shown);
        point.current = next;
      }
      const moving = Math.hypot(screenMovement.x, screenMovement.y) > 0.001;
      if (moving) direction.current = sampleDirection(screenMovement);
      const oldScene = scene.current;
      const nextScene = sampleNavigableScene(
        oldScene,
        point.current,
        roadModeRef.current,
      );
      const targetView = sampleNavigableView(
        nextScene,
        point.current,
        roadModeRef.current,
      );
      // Keep area controls consistent with the painting selected at a seam.
      scene.current = viewArea(targetView);
      cut.current = stepViewCut(oldCut, targetView, dt, reducedMotion.current);
      const switched = shown !== cut.current.shown,
        viewName = cut.current.shown;
      if (switched) {
        travelLead.current = { x: 0, y: 0 };
        cameraMode.current = 'follow';
        panCamera.current = null;
        cameraVelocity.current = { x: 0, y: 0 };
      }
      const oldLook = look.current;
      const seat =
        posture.current === 'sitting' ? sampleBenchSeat(viewName) : null;
      const actorPoint =
        seat?.point ?? sampleViewPoint(point.current, viewName);
      const lookTarget = !depthRenderer.current
        ? NEUTRAL_LOOK
        : turnFollow.current && !reducedMotion.current
          ? viewName === 'street'
            ? sampleAlleyLook(point.current)
            : NEUTRAL_LOOK
          : desiredLook.current;
      const nextLook = { ...oldLook };
      for (const axis of ['yaw', 'tilt'] as const) {
        const spring = reducedMotion.current
          ? { value: lookTarget[axis], velocity: 0 }
          : stepSampleSpring(
              { value: oldLook[axis], velocity: lookVelocity.current[axis] },
              lookTarget[axis],
              dt,
              turnFollow.current ? 5 : 9,
            );
        nextLook[axis] = spring.value;
        lookVelocity.current[axis] = spring.velocity;
      }
      const lookChanged =
        Math.abs(nextLook.yaw - oldLook.yaw) +
          Math.abs(nextLook.tilt - oldLook.tilt) >
        0.00001;
      const { width, height } = dimensions.current;
      if (lookChanged && !switched) {
        const pivot =
          cameraMode.current === 'follow'
            ? actorPoint
            : unprojectPaintedGround(
                {
                  x: camera.current.x + width / camera.current.scale / 2,
                  y: camera.current.y + height / camera.current.scale / 2,
                },
                oldLook,
                viewName,
              );
        const anchorHeight =
          cameraMode.current === 'follow' ? (seat?.height ?? 0) : 0;
        const before = projectPaintedPoint(
            pivot,
            oldLook,
            anchorHeight,
            viewName,
          ),
          after = projectPaintedPoint(pivot, nextLook, anchorHeight, viewName),
          shift = { x: after.x - before.x, y: after.y - before.y };
        camera.current = {
          ...camera.current,
          x: camera.current.x + shift.x,
          y: camera.current.y + shift.y,
        };
        if (panCamera.current)
          panCamera.current = {
            ...panCamera.current,
            x: panCamera.current.x + shift.x,
            y: panCamera.current.y + shift.y,
          };
      }
      look.current = nextLook;
      const foot = projectPaintedPoint(
        actorPoint,
        nextLook,
        seat?.height ?? 0,
        viewName,
      );
      const moveLength = Math.hypot(screenMovement.x, screenMovement.y);
      const leadTarget =
        moving && !switched && !reducedMotion.current
          ? {
              x: (screenMovement.x / moveLength) * 36,
              y: (screenMovement.y / moveLength) * 36,
            }
          : { x: 0, y: 0 };
      const blend = 1 - Math.exp(-dt * 3.5);
      travelLead.current = {
        x: travelLead.current.x + (leadTarget.x - travelLead.current.x) * blend,
        y: travelLead.current.y + (leadTarget.y - travelLead.current.y) * blend,
      };
      const targetCamera =
        cameraMode.current === 'follow'
          ? paintedFollowCamera(
              {
                x: foot.x + travelLead.current.x,
                y: foot.y + travelLead.current.y,
              },
              nextLook,
              width,
              height,
              zoomRef.current,
              lookTarget,
              viewName,
            )
          : (panCamera.current ?? camera.current);
      let changed =
        sampleDistance(camera.current, targetCamera) > 0.01 ||
        Math.abs(camera.current.scale - targetCamera.scale) > 0.00001 ||
        Math.hypot(cameraVelocity.current.x, cameraVelocity.current.y) > 0.01;
      if (switched || reducedMotion.current) {
        camera.current = targetCamera;
        cameraVelocity.current = { x: 0, y: 0 };
        changed = true;
      } else if (changed) {
        const x = stepSampleSpring(
            { value: camera.current.x, velocity: cameraVelocity.current.x },
            targetCamera.x,
            dt,
            8,
          ),
          y = stepSampleSpring(
            { value: camera.current.y, velocity: cameraVelocity.current.y },
            targetCamera.y,
            dt,
            8,
          );
        camera.current = {
          x: x.value,
          y: y.value,
          scale:
            camera.current.scale +
            (targetCamera.scale - camera.current.scale) *
              (1 - Math.exp(-dt * 8)),
        };
        cameraVelocity.current = { x: x.velocity, y: y.velocity };
      }
      if (
        first ||
        moving ||
        changed ||
        lookChanged ||
        cut.current !== oldCut ||
        scene.current !== oldScene ||
        posture.current !== lastPosture ||
        wasMoving !== moving
      ) {
        const frame = sampleFrame(distance.current, moving);
        depthRenderer.current?.draw({
          point: sampleViewPoint(point.current, viewName),
          direction: direction.current,
          frame,
          look: nextLook,
          view: viewName,
          actorScale: viewActorScale(point.current, viewName),
          actorVisible:
            posture.current !== 'sitting' &&
            !isRoadView(viewName) &&
            onViewPaving(sampleViewPoint(point.current, viewName), viewName),
        });
        setView({
          point: point.current,
          camera: camera.current,
          direction: direction.current,
          frame,
          moving,
          posture: posture.current,
          look: nextLook,
          scene: scene.current,
          cut: cut.current,
        });
      }
      first = false;
      wasMoving = moving;
      lastPosture = posture.current;
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [ready, depthStatus]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (event.key === 'Escape') {
        if (overviewRef.current) {
          overviewRef.current = false;
          setOverview(false);
          surface.current?.focus({ preventScroll: true });
        } else if (modal.current) closePlace();
        else if (cameraPanel) setCameraPanel(false);
        else {
          stop();
          setNotice('已停下，可以再选一个方向。');
        }
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,[contenteditable="true"]')
      )
        return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (modal.current && key === 'Tab') {
        const buttons = closeButton.current
          ?.closest('dialog')
          ?.querySelectorAll<HTMLButtonElement>('button');
        if (buttons?.length) {
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
        return;
      }
      if (modal.current || overviewRef.current || !ready) return;
      if (key === 'v' && !event.repeat) {
        event.preventDefault();
        changeRoadMode(
          ROAD_MODES[
            (ROAD_MODES.indexOf(roadModeRef.current) + 1) % ROAD_MODES.length
          ],
        );
        return;
      }
      if (key === 'q' || key === 'r' || key === 'c') {
        event.preventDefault();
        changeLook(
          key === 'c'
            ? { ...NEUTRAL_LOOK }
            : {
                ...(turnFollow.current ? look.current : desiredLook.current),
                yaw:
                  (turnFollow.current
                    ? look.current.yaw
                    : desiredLook.current.yaw) + (key === 'q' ? -2 : 2),
              },
        );
        return;
      }
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
        const p = AREA_PLACES.find(
          (p) =>
            sampleDistance(p.point, point.current) <
            45 / sampleViewWalkScale(sampleSceneIndex(scene.current)),
        );
        if (p) {
          event.preventDefault();
          if (p.id === 'bench') sitOnBench();
          else inspect(p);
        } else setNotice('走近门前或树下长椅，就能查看这里。');
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
  }, [
    cameraPanel,
    changeRoadMode,
    changeLook,
    closePlace,
    inspect,
    sitOnBench,
    pressWalkKey,
    ready,
    releaseWalkKey,
    stop,
  ]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (
        !ready ||
        overviewRef.current ||
        modal.current ||
        cut.current.changing ||
        (event.target instanceof Element &&
          event.target.closest('button,[data-camera-ui]'))
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
    const contextMenu = (event: Event) => {
      if (ready) event.preventDefault();
    };
    element.addEventListener('wheel', wheel, { passive: false });
    element.addEventListener('contextmenu', contextMenu);
    return () => {
      element.removeEventListener('wheel', wheel);
      element.removeEventListener('contextmenu', contextMenu);
    };
  }, [changeZoom, ready]);
  const localPoint = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !ready ||
      overviewRef.current ||
      modal.current ||
      cut.current.changing ||
      (event.button !== 0 && event.button !== 2) ||
      (event.target instanceof Element &&
        event.target.closest('button,[data-camera-ui]'))
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
    } else if (pointers.current.size === 1)
      drag.current = {
        id: event.pointerId,
        start: at,
        camera: camera.current,
        moved: false,
        mode:
          depthStatus === 'ready' &&
          (turnDrag || event.button === 2 || event.shiftKey)
            ? 'look'
            : 'pan',
        look: { ...(turnFollow.current ? look.current : desiredLook.current) },
        view: cut.current.shown,
      };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (overviewRef.current) return;
    if (!pointers.current.has(event.pointerId)) return;
    const at = localPoint(event);
    pointers.current.set(event.pointerId, at);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      if (pinch.current.distance > 0)
        changeZoom(
          (pinch.current.zoom * sampleDistance(a, b)) / pinch.current.distance,
          { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        );
      return;
    }
    const current = drag.current;
    if (
      !current ||
      current.id !== event.pointerId ||
      current.view !== cut.current.shown ||
      cut.current.changing
    )
      return;
    if (!current.moved && sampleDistance(current.start, at) < 6) return;
    if (current.mode === 'look') {
      current.moved = true;
      changeLook({
        yaw: current.look.yaw + (at.x - current.start.x) * 0.065,
        tilt: current.look.tilt + (at.y - current.start.y) * 0.025,
      });
      return;
    }
    if (!current.moved) stop();
    current.moved = true;
    cameraMode.current = 'pan';
    camera.current = panCamera.current = constrainSampleCamera(
      {
        ...current.camera,
        x: current.camera.x - (at.x - current.start.x) / current.camera.scale,
        y: current.camera.y - (at.y - current.start.y) / current.camera.scale,
      },
      dimensions.current.width,
      dimensions.current.height,
    );
    cameraVelocity.current = { x: 0, y: 0 };
    setView((v) => ({ ...v, camera: camera.current }));
  };
  const pointerEnd = (
    event: PointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    if (overviewRef.current) return;
    const current = drag.current,
      wasPinch = Boolean(pinch.current);
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (
      !cancelled &&
      !wasPinch &&
      current?.id === event.pointerId &&
      !current.moved &&
      current.mode === 'pan' &&
      event.button === 0 &&
      current.view === cut.current.shown &&
      !cut.current.changing
    ) {
      const projected = sampleScreenToWorld(localPoint(event), camera.current);
      const local = depthRenderer.current
        ? depthRenderer.current.groundAt(projected)
        : unprojectPaintedGround(projected, look.current, cut.current.shown);
      const target = local && sampleClickTarget(local, cut.current.shown);
      if (target) walkTo(target);
      else setNotice('这里是建筑或树丛，请选择看得见的路面。');
    }
    drag.current = null;
    if (!pointers.current.size) pinch.current = null;
  };
  const shown = view.cut.shown;
  const seat = view.posture === 'sitting' ? sampleBenchSeat(shown) : null;
  const projected = (p: SamplePoint) =>
    projectPaintedPoint(sampleViewPoint(p, shown), view.look, 0, shown);
  const visiblePerson = seat
    ? projectPaintedPoint(seat.point, view.look, seat.height, shown)
    : projected(view.point);
  const screenPerson = {
    x: (visiblePerson.x - view.camera.x) * view.camera.scale,
    y: (visiblePerson.y - view.camera.y) * view.camera.scale,
  };
  const actorScale = viewActorScale(view.point, shown);
  const grounded = onViewPaving(sampleViewPoint(view.point, shown), shown);
  const anchor = ART_SPRITE_FRAMES[view.direction][view.frame],
    spriteScale = 0.48 * anchor.scale * actorScale;
  const row = ['down', 'left', 'right', 'up'].indexOf(view.direction);
  const spriteStyle: CSSProperties = {
    width: 256 * spriteScale,
    height: 256 * spriteScale,
    backgroundImage: `url(${ART_SAMPLE.sprite})`,
    backgroundPosition: `${(view.frame / 5) * 100}% ${(row / 3) * 100}%`,
    transform: `translate(${-anchor.x * spriteScale}px, ${-anchor.y * spriteScale}px)`,
  };
  const seatedStyle: CSSProperties | undefined = seat
    ? {
        width: BENCH_SPRITE_CELL * seat.scale,
        height: BENCH_SPRITE_CELL * seat.scale,
        backgroundImage: `url(${BENCH_SPRITE})`,
        backgroundPosition: `${seat.column * 100}% ${seat.row * 100}%`,
        transform: `translate(${-seat.hip.x * seat.scale}px, ${-seat.hip.y * seat.scale}px)`,
      }
    : undefined;
  const visiblePlaces = BLOCK_AREAS[viewArea(shown)].places;
  const toggleOverview = (value: boolean) => {
    keys.current.clear();
    keyOrigins.current.clear();
    pendingTap.current = { x: 0, y: 0 };
    drag.current = null;
    pointers.current.clear();
    pinch.current = null;
    setCameraPanel(false);
    overviewRef.current = value;
    setOverview(value);
    if (!value) surface.current?.focus({ preventScroll: true });
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header} inert={Boolean(place)}>
        <div className={styles.identity}>
          <span className={styles.brand}>SINE FINE</span>
          <h1>融合版样板街区</h1>
        </div>
        <p className={styles.sampleNote}>独立画风与操作样板 · 不改变日常进度</p>
        <div className={styles.presentations} aria-label="街区呈现方式">
          <button
            type="button"
            aria-pressed={overview}
            onClick={() => toggleOverview(true)}
          >
            <MapIcon size={15} />
            2D 总览
          </button>
          <button
            type="button"
            aria-pressed={!overview}
            onClick={() => toggleOverview(false)}
          >
            <Footprints size={15} />
            2.5D 街区
          </button>
        </div>
        <Link href="/fate/city-art" className={styles.comparison}>
          <Box size={17} />
          <span>冬木街区制作</span>
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
        aria-label="住宅街区试点，WASD行走，V切换取景，右键拖动或Q/R转向，C回正，E查看地点或坐下起身"
        data-camera-yaw={view.look.yaw.toFixed(2)}
        data-camera-tilt={view.look.tilt.toFixed(2)}
        data-camera-mode={turnDrag ? 'turn' : 'pan'}
        data-camera-follow={followTurns ? 'turns' : 'manual'}
        data-area={view.scene}
        data-painted-view={shown}
        data-view-transition={view.cut.changing ? 'changing' : 'settled'}
        data-view-cover={viewCutCover(view.cut).toFixed(3)}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(e) => pointerEnd(e)}
        onPointerCancel={(e) => pointerEnd(e, true)}
      >
        <div
          className={styles.sceneLayer}
          inert={overview}
          aria-hidden={overview}
        >
          <div
            className={styles.world}
            style={{
              width: ART_SAMPLE.width,
              height: ART_SAMPLE.height,
              transform: `scale(${view.camera.scale}) translate(${-view.camera.x}px, ${-view.camera.y}px)`,
              visibility: ready ? 'visible' : 'hidden',
            }}
            inert={Boolean(place) || view.cut.changing}
          >
            {PAINTED_VIEWS.map((name) => (
              <Image
                key={name}
                ref={(node) => {
                  if (node) images.current[name] = node;
                  else delete images.current[name];
                }}
                className={styles.painting}
                style={{
                  visibility:
                    depthStatus !== 'ready' && shown === name
                      ? 'visible'
                      : 'hidden',
                }}
                src={VIEW_PAINTINGS[name]}
                width={ART_SAMPLE.width}
                height={ART_SAMPLE.height}
                unoptimized
                loading="eager"
                alt=""
                draggable={false}
                decoding="async"
                onLoad={() => setLoaded((v) => ({ ...v, [name]: true }))}
                onError={() => setFailed(true)}
              />
            ))}
            <Image
              ref={spriteImage}
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
            <div
              ref={depthHost}
              className={styles.depthLayer}
              aria-hidden="true"
            />
            <Image
              hidden
              src={BENCH_SPRITE}
              width={BENCH_SPRITE_CELL * 2}
              height={BENCH_SPRITE_CELL * 2}
              unoptimized
              loading="eager"
              alt=""
              onLoad={() => setBenchReady(true)}
              onError={() => setBenchFailed(true)}
            />
            {markers &&
              !view.cut.changing &&
              visiblePlaces
                .filter((p) => p !== nearest)
                .map((p) => {
                  const at = projected(p.point);
                  return (
                    <button
                      type="button"
                      className={styles.placeMarker}
                      key={p.id}
                      style={{ left: at.x, top: at.y }}
                      onClick={() => inspect(p)}
                      aria-label={`查看${p.name}`}
                    >
                      <span className={styles.placeDot} />
                      <span className={styles.placeName}>{p.name}</span>
                    </button>
                  );
                })}
            {markers &&
              !view.cut.changing &&
              blockExits(viewArea(shown))
                .filter((c) => c.to === 'slope' || viewArea(shown) === 'slope')
                .map((c) => {
                  const at = projected(c.at);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.placeMarker}
                      style={{ left: at.x, top: at.y }}
                      onClick={() => walkTo(c.destination)}
                      aria-label={`沿路前往${c.name}`}
                    >
                      <span className={styles.placeDot} />
                      <span className={styles.placeName}>{c.name} ↗</span>
                    </button>
                  );
                })}
            {target && (
              <span
                className={styles.target}
                style={{ left: projected(target).x, top: projected(target).y }}
              />
            )}
            {markers && viewArea(shown) === 'street' && !view.cut.changing && (
              <button
                type="button"
                className={styles.placeMarker}
                style={{
                  left: projected(SAMPLE_ALLEY.bend).x,
                  top: projected(SAMPLE_ALLEY.bend).y,
                }}
                onClick={walkAlley}
                aria-label="走进咖啡店旁的小巷"
              >
                <span className={styles.placeDot} />
                <span className={styles.placeName}>小巷</span>
              </button>
            )}
            {markers && shown === 'alley' && !view.cut.changing && (
              <button
                type="button"
                className={styles.placeMarker}
                style={{
                  left: projected(ALLEY_AHEAD).x,
                  top: projected(ALLEY_AHEAD).y,
                }}
                onClick={() => walkTo(NEIGHBORHOOD_CENTER)}
                aria-label="穿过小巷前往林荫支路"
              >
                <span className={styles.placeDot} />
                <span className={styles.placeName}>林荫支路</span>
              </button>
            )}
          </div>
          <div
            className={styles.character}
            style={{
              left: screenPerson.x,
              top: screenPerson.y,
              transform: `scale(${view.camera.scale})`,
            }}
            data-x={view.point.x.toFixed(1)}
            data-y={view.point.y.toFixed(1)}
            data-direction={view.direction}
            data-frame={view.frame}
            data-grounded={grounded ? 'true' : 'false'}
            data-posture={view.posture}
            data-supported-by={seat ? 'bench' : 'pavement'}
            aria-label={`伊莉雅${seat ? '坐在长椅上' : view.moving ? '正在行走' : '已停下'}`}
          >
            {seat && (
              <span
                className={`${styles.sprite} ${styles.seatedSprite}`}
                style={seatedStyle}
              />
            )}
            {!seat &&
              grounded &&
              (depthStatus !== 'ready' || isRoadView(shown)) && (
                <>
                  <span
                    className={styles.shadow}
                    style={{ transform: `scale(${actorScale})` }}
                  />
                  <span className={styles.sprite} style={spriteStyle} />
                </>
              )}
          </div>
          <div
            className={styles.sceneTransition}
            style={{ opacity: viewCutCover(view.cut) }}
            aria-hidden="true"
          />
          {!ready && (
            <output className={styles.loading}>
              {failed ? '画面未能载入，请刷新重试。' : '正在铺开这段街道…'}
            </output>
          )}
          <fieldset
            className={styles.roadModes}
            aria-label="街道取景"
            data-camera-ui
            inert={Boolean(place)}
          >
            {ROAD_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={!ready}
                aria-pressed={
                  inAlley
                    ? roadMode === mode
                    : shown === viewForArea(view.scene, mode)
                }
                onClick={() => changeRoadMode(mode)}
              >
                {ROAD_MODE_LABELS[mode]}
              </button>
            ))}
            {inAlley && <span>小巷自动取景 · 出巷后恢复</span>}
          </fieldset>
          <div className={styles.sceneTitle}>
            <span className={styles.sunDot} />
            <span>{BLOCK_AREAS[view.scene].name}</span>
            <span className={styles.season}>初夏的午后</span>
          </div>
          <div
            className={styles.cameraTools}
            aria-label="画面缩放与定位"
            inert={Boolean(place)}
            data-camera-ui
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
              aria-label="调整观察角度"
              title="观察角度"
              aria-expanded={cameraPanel}
              aria-controls="sample-camera-panel"
              onClick={() => setCameraPanel((value) => !value)}
              disabled={!ready}
            >
              <Camera size={18} />
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
          {cameraPanel && (
            <section
              id="sample-camera-panel"
              className={styles.cameraPanel}
              data-camera-ui
              inert={Boolean(place)}
              aria-label="观察角度"
            >
              <div className={styles.cameraPanelTitle}>
                <span>沿街看看</span>
                <button
                  type="button"
                  aria-label="关闭观察角度"
                  onClick={() => setCameraPanel(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <button
                className={styles.followTurns}
                type="button"
                disabled={depthStatus !== 'ready'}
                aria-pressed={followTurns}
                onClick={() => {
                  const enabled = !turnFollow.current;
                  turnFollow.current = enabled;
                  setFollowTurns(enabled);
                  if (!enabled) {
                    desiredLook.current = { ...look.current };
                    setLookSetting(desiredLook.current);
                  }
                }}
              >
                <CornerUpLeft size={15} />
                {followTurns ? '转弯随行：开启' : '转弯随行：关闭'}
              </button>
              <div className={styles.lookPresets}>
                <button
                  type="button"
                  disabled={depthStatus !== 'ready'}
                  onClick={() => changeLook({ yaw: -14, tilt: 0 })}
                >
                  <ArrowLeft size={15} />
                  左看
                </button>
                <button
                  type="button"
                  disabled={depthStatus !== 'ready'}
                  onClick={() => changeLook({ ...NEUTRAL_LOOK })}
                >
                  <RotateCcw size={14} />
                  回正
                </button>
                <button
                  type="button"
                  disabled={depthStatus !== 'ready'}
                  onClick={() => changeLook({ yaw: 14, tilt: 0 })}
                >
                  右看
                  <ArrowRight size={15} />
                </button>
              </div>
              <label>
                左右转向{' '}
                <output>
                  {(followTurns ? view.look.yaw : lookSetting.yaw).toFixed(0)}°
                </output>
                <input
                  aria-label="左右转向角度"
                  type="range"
                  min={-SAMPLE_LOOK.yaw}
                  max={SAMPLE_LOOK.yaw}
                  step="0.5"
                  value={followTurns ? view.look.yaw : lookSetting.yaw}
                  disabled={depthStatus !== 'ready'}
                  onChange={(event) =>
                    changeLook({
                      ...(turnFollow.current
                        ? look.current
                        : desiredLook.current),
                      yaw: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                上下观察{' '}
                <output>
                  {(followTurns ? view.look.tilt : lookSetting.tilt) > 0
                    ? '+'
                    : ''}
                  {(followTurns ? view.look.tilt : lookSetting.tilt).toFixed(0)}
                  °
                </output>
                <input
                  aria-label="上下观察角度"
                  type="range"
                  min={-SAMPLE_LOOK.tilt}
                  max={SAMPLE_LOOK.tilt}
                  step="0.5"
                  value={followTurns ? view.look.tilt : lookSetting.tilt}
                  disabled={depthStatus !== 'ready'}
                  onChange={(event) =>
                    changeLook({
                      ...(turnFollow.current
                        ? look.current
                        : desiredLook.current),
                      tilt: Number(event.target.value),
                    })
                  }
                />
              </label>
              <button
                className={styles.turnMode}
                type="button"
                disabled={depthStatus !== 'ready'}
                aria-pressed={turnDrag}
                onClick={() => setTurnDrag((value) => !value)}
              >
                {turnDrag ? '拖动：转动镜头' : '拖动：浏览街道'}
              </button>
              <p>
                {depthStatus === 'unavailable'
                  ? '当前设备使用原画视角，仍可行走、拖动与缩放。'
                  : depthStatus === 'loading'
                    ? '正在准备观察角度…'
                    : 'V 切换取景 · 右键拖动观察 · Q / R 左右转向 · C 回正。平视和沿路都可继续行走。'}
              </p>
            </section>
          )}
          <div className={styles.personStatus}>
            <Footprints size={17} />
            <span>伊莉雅</span>
            <span className={styles.personAction}>
              {view.posture === 'sitting'
                ? '坐在树下休息'
                : view.posture === 'approaching'
                  ? '走向树下长椅'
                  : view.moving
                    ? inAlley
                      ? '沿石板路慢走'
                      : '沿街慢走'
                    : '停在树影里'}
            </span>
          </div>
          {nearest && !place && (
            <button
              type="button"
              className={styles.nearby}
              disabled={nearest.id === 'bench' && !benchReady}
              onClick={() =>
                nearest.id === 'bench' ? sitOnBench() : inspect(nearest)
              }
            >
              {nearest.id === 'home' ||
              nearest.id === 'lane-home' ||
              nearest.id === 'slope-home' ? (
                <House size={18} />
              ) : nearest.id === 'bench' ? (
                <Armchair size={18} />
              ) : (
                <Coffee size={18} />
              )}
              <span>
                {nearest.id === 'bench'
                  ? view.posture === 'sitting'
                    ? '起身继续走'
                    : '坐在长椅上'
                  : `看看${nearest.name}`}
              </span>
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
              <span className={styles.cardEyebrow}>
                {place.id === 'bench' ? '树影下的一角' : '门前一角'}
              </span>
              <h2 id="art-place-title">{place.name}</h2>
              <p>{place.description}</p>
              <p className={styles.indoorNote}>
                {place.id === 'bench'
                  ? '走到椅边就能坐下。坐着可以换取景，按 E 或方向键起身。'
                  : '本次试点展示街道与门前，室内另行打磨。'}
              </p>
              <button
                className={styles.goButton}
                type="button"
                disabled={place.id === 'bench' && !benchReady}
                onClick={() => {
                  const p = place;
                  const arrived = sampleDistance(p.point, point.current) < 4;
                  closePlace();
                  if (p.id === 'bench') sitOnBench();
                  else if (!arrived) walkTo(p.point, p);
                }}
              >
                <Footprints size={17} />
                {place.id === 'bench'
                  ? view.posture === 'sitting'
                    ? '起身继续走'
                    : atSampleBench(view.point)
                      ? '坐下休息'
                      : '走过去坐下'
                  : sampleDistance(place.point, view.point) < 4
                    ? '再沿街走走'
                    : '走到门前'}
              </button>
            </dialog>
          )}
        </div>
        {overview && (
          <FateBlockMap
            point={view.point}
            area={view.scene}
            onReturn={() => toggleOverview(false)}
            onWalk={(p, destination) => {
              toggleOverview(false);
              walkTo(p, destination);
            }}
          />
        )}
      </div>
      <footer className={styles.footer} inert={Boolean(place) || overview}>
        <div
          className={styles.destinations}
          aria-label="街区地点与相邻道路"
          hidden={overview}
        >
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
          <button type="button" disabled={!ready} onClick={walkAlley}>
            <CornerUpLeft size={16} />
            {view.scene !== 'street' ? '返回主街' : '走进小巷'}
          </button>
          {!inNeighborhood && (
            <button
              type="button"
              disabled={!ready}
              onClick={() => walkTo(NEIGHBORHOOD_CENTER)}
            >
              <Footprints size={16} />
              林荫支路
            </button>
          )}
          {inNeighborhood && (
            <button
              type="button"
              disabled={!ready || !benchReady}
              onClick={sitOnBench}
            >
              <Armchair size={16} />
              树下长椅
            </button>
          )}
          {view.scene === 'slope' ? (
            SLOPE_PLACES.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!ready}
                onClick={() => walkTo(p.point, p)}
              >
                {p.id === 'bakery' ? <Coffee size={16} /> : <House size={16} />}
                {p.name}
              </button>
            ))
          ) : view.scene === 'alley' ? (
            <button
              type="button"
              disabled={!ready}
              onClick={() => walkTo(SLOPE_CENTER)}
            >
              <Footprints size={16} />
              榉树坡道
            </button>
          ) : null}
          {blockExits(view.scene)
            .filter((c) => c.to === 'slope' || view.scene === 'slope')
            .map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={!ready}
                onClick={() => walkTo(c.destination)}
              >
                <CornerUpLeft size={16} />
                前往{c.name}
              </button>
            ))}
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
          <output aria-live="polite">
            {overview
              ? '总览中可拖动、缩放或选择地点。返回街区后继续原来的路线。'
              : notice}
          </output>
          <p className={styles.instructions}>
            {overview
              ? 'Esc 返回街区 · 地点目录沿路前往 · 浏览地图不会移动人物'
              : 'WASD 行走 · V 换取景 · 拖动浏览 · 右键转向 · E 查看'}
          </p>
        </div>
      </footer>
    </main>
  );
}
