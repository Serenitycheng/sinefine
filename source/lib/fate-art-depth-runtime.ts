import * as T from 'three';
import {
  ART_SAMPLE,
  type SampleDirection,
  type SamplePoint,
} from './fate-art-sample';
import { ART_SPRITE_FRAMES } from './fate-art-sprite';
import { isRoadView, onViewPaving, type PaintedView } from './fate-art-views';
import {
  paintedPosition,
  sampleLookBasis,
  sampleSurfaceData,
  roadLookBasis,
  ROAD_FOCAL_LENGTH,
  type SampleLook,
} from './fate-art-depth';

export type PaintedFrame = {
  point: SamplePoint;
  direction: SampleDirection;
  frame: number;
  look: SampleLook;
  actorVisible?: boolean;
  view: PaintedView;
  actorScale?: number;
};
export type PaintedRenderer = {
  draw: (frame: PaintedFrame) => void;
  groundAt: (point: SamplePoint) => SamplePoint | null;
  dispose: () => void;
};

/** Reprojects the original painting without changing its palette or lighting. */
export function mountPaintedRelief(
  host: HTMLDivElement,
  backgrounds: Record<PaintedView, HTMLImageElement>,
  sprite: HTMLImageElement,
  onFailure: () => void,
): PaintedRenderer {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(ART_SAMPLE.width, ART_SAMPLE.height, false);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  renderer.setClearColor('#202c29', 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.width = canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.dataset.renderer = 'painted-relief';
  let sceneName: PaintedView = 'street';
  const surfaces = new Map<
    PaintedView,
    T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>
  >();
  const getSurface = (view: PaintedView) => {
    const cached = surfaces.get(view);
    if (cached) return cached;
    const geometry = new T.BufferGeometry();
    const data = sampleSurfaceData(8, view);
    geometry.setAttribute('position', new T.BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new T.BufferAttribute(data.uv, 2));
    geometry.setIndex(data.indices);
    const painting = new T.Texture(backgrounds[view]);
    painting.colorSpace = T.SRGBColorSpace;
    painting.needsUpdate = true;
    const mesh = new T.Mesh(
      geometry,
      new T.MeshBasicMaterial({ map: painting, side: T.DoubleSide }),
    );
    surfaces.set(view, mesh);
    return mesh;
  };
  const scene = new T.Scene();
  let surface = getSurface(sceneName);
  scene.add(surface);
  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();
  const overviewCamera = new T.OrthographicCamera(
    -ART_SAMPLE.width / 200,
    ART_SAMPLE.width / 200,
    ART_SAMPLE.height / 200,
    -ART_SAMPLE.height / 200,
    0.1,
    100,
  );
  const facingCamera = new T.PerspectiveCamera(
    (2 * Math.atan(ART_SAMPLE.height / (2 * ROAD_FOCAL_LENGTH)) * 180) /
      Math.PI,
    ART_SAMPLE.width / ART_SAMPLE.height,
    0.1,
    100,
  );
  facingCamera.position.set(0, 0, ROAD_FOCAL_LENGTH / 100);
  let camera: T.Camera = overviewCamera;

  const atlas = new T.Texture(sprite);
  atlas.colorSpace = T.SRGBColorSpace;
  atlas.repeat.set(1 / 6, 1 / 4);
  atlas.needsUpdate = true;
  const actorGeometry = new T.PlaneGeometry(1, 1);
  const actorMaterial = new T.MeshBasicMaterial({
    map: atlas,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: false,
    // Authored side views sort the person on the already validated paving.
    // Their shallow painted facades do not represent real occluding solids.
    depthTest: sceneName === 'street',
  });
  const actor = new T.Mesh(actorGeometry, actorMaterial);
  actor.renderOrder = 1;
  scene.add(actor);
  const shadowGeometry = new T.CircleGeometry(1, 32);
  const shadowMaterial = new T.MeshBasicMaterial({
    color: '#293c4a',
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    depthTest: sceneName === 'street',
  });
  const shadow = new T.Mesh(shadowGeometry, shadowMaterial);
  shadow.renderOrder = 0.5;
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.155, 0.075, 1);
  scene.add(shadow);
  let disposed = false;
  const lost = (event: Event) => {
    event.preventDefault();
    onFailure();
  };
  canvas.addEventListener('webglcontextlost', lost);
  host.appendChild(canvas);
  return {
    groundAt: (point) => {
      if (disposed) return null;
      pointer.set(
        (point.x / ART_SAMPLE.width) * 2 - 1,
        1 - (point.y / ART_SAMPLE.height) * 2,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(surface, false)[0];
      if (!hit?.uv || (!isRoadView(sceneName) && hit.point.y > 0.005))
        return null;
      const ground = {
        x: hit.uv.x * ART_SAMPLE.width,
        y: (1 - hit.uv.y) * ART_SAMPLE.height,
      };
      return onViewPaving(ground, sceneName) ? ground : null;
    },
    draw: ({
      point,
      look,
      direction,
      frame,
      view,
      actorScale = 1,
      actorVisible = true,
    }) => {
      if (disposed) return;
      if (view !== sceneName) {
        scene.remove(surface);
        surface = getSurface(view);
        scene.add(surface);
        sceneName = view;
        actorMaterial.depthTest = shadowMaterial.depthTest = view === 'street';
      }
      const { eye, right } = sampleLookBasis(look);
      actor.visible = shadow.visible = actorVisible;
      const facing = isRoadView(view);
      camera = facing ? facingCamera : overviewCamera;
      if (facing) {
        facingCamera.rotation.set(
          (look.tilt * Math.PI) / 180,
          (look.yaw * Math.PI) / 180,
          0,
          'YXZ',
        );
        facingCamera.updateProjectionMatrix();
        const { offset } = roadLookBasis(look);
        facingCamera.projectionMatrix.elements[8] =
          (2 * ROAD_FOCAL_LENGTH * offset.x) / ART_SAMPLE.width;
        facingCamera.projectionMatrix.elements[9] =
          (2 * ROAD_FOCAL_LENGTH * offset.y) / ART_SAMPLE.height;
        facingCamera.projectionMatrixInverse
          .copy(facingCamera.projectionMatrix)
          .invert();
      } else {
        camera.position.set(eye.x * 40, eye.y * 40, eye.z * 40);
        camera.lookAt(0, 0, 0);
      }
      camera.updateMatrixWorld();
      const foot = paintedPosition(point);
      const anchor = ART_SPRITE_FRAMES[direction][frame];
      const scale = 0.48 * anchor.scale * actorScale;
      const dx = ((128 - anchor.x) * scale) / 100;
      const dy = ((anchor.y - 128) * scale) / 100;
      const verticalProjection = Math.hypot(eye.x, eye.z);
      // A standing character rotates around the vertical axis only. A spherical
      // billboard leans backwards into the facade when approaching a doorway.
      actor.position.set(
        foot.x + right.x * dx,
        foot.y + dy / verticalProjection + 0.003,
        foot.z + right.z * dx,
      );
      actor.rotation.set(0, Math.atan2(eye.x, eye.z), 0);
      actor.scale.set(
        (256 * scale) / 100,
        (256 * scale) / (100 * verticalProjection),
        1,
      );
      if (facing) {
        actor.position.set(
          (point.x - ART_SAMPLE.width / 2) / 100 + dx,
          (ART_SAMPLE.height / 2 - point.y) / 100 + dy,
          0.002,
        );
        actor.rotation.set(0, 0, 0);
        actor.scale.set((256 * scale) / 100, (256 * scale) / 100, 1);
      }
      atlas.offset.set(
        frame / 6,
        (3 - ['down', 'left', 'right', 'up'].indexOf(direction)) / 4,
      );
      shadow.position.set(foot.x, 0.004, foot.z);
      shadow.rotation.x = facing ? 0 : -Math.PI / 2;
      if (facing)
        shadow.position.set(
          (point.x - ART_SAMPLE.width / 2) / 100,
          (ART_SAMPLE.height / 2 - point.y) / 100,
          0.001,
        );
      shadow.scale.set(0.155 * actorScale, 0.075 * actorScale, 1);
      canvas.dataset.scene = sceneName;
      canvas.dataset.yaw = look.yaw.toFixed(2);
      canvas.dataset.tilt = look.tilt.toFixed(2);
      renderer.render(scene, camera);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', lost);
      for (const resource of [
        atlas,
        actorGeometry,
        actorMaterial,
        shadowGeometry,
        shadowMaterial,
      ])
        resource.dispose();
      for (const mesh of surfaces.values()) {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.dispose();
      }
      surfaces.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
