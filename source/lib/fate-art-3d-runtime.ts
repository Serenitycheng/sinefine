import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStreetStudy } from './fate-art-3d-scene';
import {
  STREET_STUDY,
  studyCamera,
  studySafeCamera,
  type StreetStudyView,
} from './fate-art-3d-layout';

export type StudyController = {
  view: (view: StreetStudyView) => void;
  rotate: (angle: number) => void;
  zoom: (factor: number) => void;
  autoRotate: (enabled: boolean) => void;
  dispose: () => void;
};

export async function mountStreetStudy(
  host: HTMLElement,
  onView: (view: StreetStudyView | 'free') => void,
  onFailure: (message: string) => void,
  signal: AbortSignal,
  onManual: () => void,
): Promise<StudyController | null> {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', '可旋转的住宅街3D场景');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-describedby', 'street-study-controls');
  canvas.tabIndex = 0;
  canvas.style.width = canvas.style.height = '100%';
  canvas.style.display = 'block';
  host.appendChild(canvas);
  const controlsCamera = new T.PerspectiveCamera(36, 1, 0.15, 170);
  let asphalt: T.Texture;
  try {
    asphalt = await new T.TextureLoader().loadAsync(
      '/fate/art-sample/asphalt-v1.png',
    );
  } catch (error) {
    canvas.remove();
    renderer.dispose();
    throw error;
  }
  if (signal.aborted) {
    asphalt.dispose();
    renderer.dispose();
    canvas.remove();
    return null;
  }
  asphalt.colorSpace = T.SRGBColorSpace;
  asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping;
  asphalt.repeat.set(36, 2);
  asphalt.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const world = createStreetStudy({ asphalt });
  const controls = new OrbitControls(controlsCamera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.65;
  controls.panSpeed = 0.65;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = STREET_STUDY.minPolar;
  controls.maxPolarAngle = STREET_STUDY.maxPolar;
  controls.minDistance = STREET_STUDY.minDistance;
  controls.maxDistance = STREET_STUDY.maxDistance;
  controls.cursor.set(0, 1.1, -4);
  controls.maxTargetRadius = 30;
  controls.autoRotateSpeed = 0.45;
  // No page-wide keys: keyboard camera operation is scoped to the focused canvas.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  type Transition = {
    started: number;
    fromPosition: T.Vector3;
    fromTarget: T.Vector3;
    toPosition: T.Vector3;
    toTarget: T.Vector3;
  };
  let transition: Transition | null = null;
  let frame = 0;
  let lastTime = 0;
  let dirty = true;
  let disposed = false;
  let contextLost = false;
  let metricTime = 0;
  function size() {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    controlsCamera.aspect = width / height;
    controlsCamera.updateProjectionMatrix();
    dirty = true;
  }
  size();
  const initialView = controlsCamera.aspect < 0.85 ? 'cafe' : 'street';
  const initial = studyCamera(initialView, controlsCamera.aspect);
  controlsCamera.position.fromArray(initial.position);
  controls.target.fromArray(initial.target);
  controls.update();
  onView(initialView);

  function render(now: number) {
    if (disposed || document.hidden || contextLost) {
      frame = 0;
      return;
    }
    const delta = Math.min(0.05, (now - (lastTime || now)) / 1000);
    lastTime = now;
    if (transition) {
      const t = Math.min(1, (now - transition.started) / 720);
      const eased = t * t * (3 - 2 * t);
      controlsCamera.position.lerpVectors(
        transition.fromPosition,
        transition.toPosition,
        eased,
      );
      controls.target.lerpVectors(
        transition.fromTarget,
        transition.toTarget,
        eased,
      );
      dirty = true;
      if (t === 1) transition = null;
    }
    const changing = controls.update(delta);
    const safePosition = studySafeCamera(
      controlsCamera.position.toArray(),
      controls.target.toArray(),
    );
    if (
      safePosition.some(
        (value, i) =>
          Math.abs(value - controlsCamera.position.getComponent(i)) > 0.0001,
      )
    ) {
      controlsCamera.position.fromArray(safePosition);
      controls.update(0);
      dirty = true;
    }
    if (dirty || changing) {
      renderer.render(world.scene, controlsCamera);
      dirty = false;
      if (now - metricTime > 160) {
        // Read-only verification hooks; these do not change game state.
        canvas.dataset.azimuth = controls.getAzimuthalAngle().toFixed(3);
        canvas.dataset.elevation = (
          Math.PI / 2 -
          controls.getPolarAngle()
        ).toFixed(3);
        canvas.dataset.distance = controls.getDistance().toFixed(2);
        canvas.dataset.target = controls.target
          .toArray()
          .map((n) => n.toFixed(2))
          .join(',');
        canvas.dataset.drawCalls = String(renderer.info.render.calls);
        canvas.dataset.triangles = String(renderer.info.render.triangles);
        metricTime = now;
      }
    }
    frame = requestAnimationFrame(render);
  }
  function start() {
    if (!frame && !disposed && !document.hidden && !contextLost)
      frame = requestAnimationFrame(render);
  }
  function handleStart() {
    transition = null;
    controls.autoRotate = false;
    onManual();
    onView('free');
    canvas.focus({ preventScroll: true });
  }
  function handleChange() {
    dirty = true;
  }
  controls.addEventListener('start', handleStart);
  controls.addEventListener('change', handleChange);
  const resize = new ResizeObserver(size);
  resize.observe(host);
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      lastTime = 0;
      dirty = true;
      start();
    }
  }
  function lost(event: Event) {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    onFailure('画面连接中断，请重新加载小样。');
  }
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('webglcontextlost', lost);

  const api: StudyController = {
    view(view) {
      const next = studyCamera(view, controlsCamera.aspect);
      controls.autoRotate = false;
      // Flush residual user damping before a smooth, explicit camera composition.
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
      onView(view);
      if (reducedMotion.matches) {
        controlsCamera.position.fromArray(next.position);
        controls.target.fromArray(next.target);
        dirty = true;
      } else {
        transition = {
          started: performance.now(),
          fromPosition: controlsCamera.position.clone(),
          fromTarget: controls.target.clone(),
          toPosition: new T.Vector3().fromArray(next.position),
          toTarget: new T.Vector3().fromArray(next.target),
        };
      }
    },
    rotate(angle) {
      transition = null;
      controls.autoRotate = false;
      onManual();
      onView('free');
      controls.rotateLeft(angle);
      dirty = true;
    },
    zoom(factor) {
      transition = null;
      controls.autoRotate = false;
      onManual();
      if (factor > 1) controls.dollyIn(1 / factor);
      else controls.dollyOut(factor);
      dirty = true;
    },
    autoRotate(enabled) {
      transition = null;
      controls.autoRotate = enabled;
      if (enabled) onView('free');
      dirty = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('keydown', key);
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('change', handleChange);
      controls.dispose();
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
  function key(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      api.rotate(event.key === 'ArrowLeft' ? 0.12 : -0.12);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      api.zoom(1.15);
    } else if (event.key === '-') {
      event.preventDefault();
      api.zoom(1 / 1.15);
    } else if (event.key === 'Home') {
      event.preventDefault();
      api.view('street');
    }
  }
  canvas.addEventListener('keydown', key);
  start();
  return api;
}
