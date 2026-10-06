import {
  ART_SAMPLE,
  SAMPLE_STREET_GROUND,
  onSampleStreetGround,
  sampleCamera,
  type SamplePoint,
} from './fate-art-sample';
import {
  alleyPaintedHeight,
  neighborhoodPaintedHeight,
} from './fate-art-alley';
import {
  isRoadView,
  roadPaintedHeight,
  sampleViewPoint,
  sampleViewWorld,
  type PaintedView,
} from './fate-art-views';

export type SampleLook = { yaw: number; tilt: number };
export type PaintedPosition = { x: number; y: number; z: number };

export const SAMPLE_LOOK = {
  yaw: 18,
  tilt: 5,
  elevation: 40,
  pixelsPerUnit: 100,
} as const;
export const NEUTRAL_LOOK: SampleLook = { yaw: 0, tilt: 0 };
const radians = Math.PI / 180;
const baseElevation = SAMPLE_LOOK.elevation * radians;
const center = { x: ART_SAMPLE.width / 2, y: ART_SAMPLE.height / 2 };
export const ROAD_FOCAL_LENGTH = 1000;

export function roadLookBasis(value: SampleLook) {
  const look = constrainSampleLook(value);
  const yaw = look.yaw * radians,
    tilt = look.tilt * radians;
  return {
    right: { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) },
    up: {
      x: Math.sin(yaw) * Math.sin(tilt),
      y: Math.cos(tilt),
      z: Math.cos(yaw) * Math.sin(tilt),
    },
    forward: {
      x: -Math.sin(yaw) * Math.cos(tilt),
      y: Math.sin(tilt),
      z: -Math.cos(yaw) * Math.cos(tilt),
    },
    offset: { x: Math.tan(yaw) / Math.cos(tilt), y: -Math.tan(tilt) },
  };
}

export function constrainSampleLook(look: SampleLook): SampleLook {
  const limit = (n: number, range: number) =>
    Number.isFinite(n) ? Math.max(-range, Math.min(range, n)) : 0;
  return {
    yaw: limit(look.yaw, SAMPLE_LOOK.yaw),
    tilt: limit(look.tilt, SAMPLE_LOOK.tilt),
  };
}

/** This ray construction preserves every painted pixel at the reference view. */
export function paintedPosition(
  point: SamplePoint,
  height = 0,
): PaintedPosition {
  return {
    x: (point.x - center.x) / SAMPLE_LOOK.pixelsPerUnit,
    y: height,
    z:
      (point.y - center.y) /
        (SAMPLE_LOOK.pixelsPerUnit * Math.sin(baseElevation)) +
      height / Math.tan(baseElevation),
  };
}

export function sampleLookBasis(value: SampleLook) {
  const look = constrainSampleLook(value);
  const yaw = look.yaw * radians;
  const elevation = (SAMPLE_LOOK.elevation + look.tilt) * radians;
  return {
    right: { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) },
    up: {
      x: -Math.sin(yaw) * Math.sin(elevation),
      y: Math.cos(elevation),
      z: -Math.cos(yaw) * Math.sin(elevation),
    },
    eye: {
      x: Math.sin(yaw) * Math.cos(elevation),
      y: Math.sin(elevation),
      z: Math.cos(yaw) * Math.cos(elevation),
    },
  };
}

export function projectPaintedPoint(
  point: SamplePoint,
  look: SampleLook,
  height = 0,
  view: PaintedView = 'street',
): SamplePoint {
  if (isRoadView(view)) {
    const p = {
      x: point.x - center.x,
      y: center.y - point.y,
      z: -ROAD_FOCAL_LENGTH,
    };
    const { right, up, forward, offset } = roadLookBasis(look);
    const dot = (a: typeof p) => p.x * a.x + p.y * a.y + p.z * a.z;
    const depth = dot(forward);
    return {
      x: center.x + ROAD_FOCAL_LENGTH * (dot(right) / depth - offset.x),
      y: center.y - ROAD_FOCAL_LENGTH * (dot(up) / depth - offset.y),
    };
  }
  const p = paintedPosition(point, height);
  const { right, up } = sampleLookBasis(look);
  return {
    x: center.x + (p.x * right.x + p.y * right.y + p.z * right.z) * 100,
    y: center.y - (p.x * up.x + p.y * up.y + p.z * up.z) * 100,
  };
}

/** Inverse of the ground projection, shared by pointer and screen-relative keys. */
export function unprojectPaintedGround(
  point: SamplePoint,
  look: SampleLook,
  view: PaintedView = 'street',
) {
  if (isRoadView(view)) {
    const { right, up, forward, offset } = roadLookBasis(look);
    const x = (point.x - center.x) / ROAD_FOCAL_LENGTH + offset.x;
    const y = (center.y - point.y) / ROAD_FOCAL_LENGTH + offset.y;
    const ray = {
      x: forward.x + x * right.x + y * up.x,
      y: forward.y + x * right.y + y * up.y,
      z: forward.z + x * right.z + y * up.z,
    };
    const t = -ROAD_FOCAL_LENGTH / ray.z;
    return { x: center.x + ray.x * t, y: center.y - ray.y * t };
  }
  const { right, up } = sampleLookBasis(look);
  const a = right.x;
  const b = right.z / Math.sin(baseElevation);
  const c = -up.x;
  const d = -up.z / Math.sin(baseElevation);
  const determinant = a * d - b * c;
  const x = point.x - center.x;
  const y = point.y - center.y;
  return {
    x: center.x + (d * x - b * y) / determinant,
    y: center.y + (-c * x + a * y) / determinant,
  };
}

export function sampleLookInput(input: SamplePoint, look: SampleLook) {
  const origin = unprojectPaintedGround(center, look);
  const offset = unprojectPaintedGround(
    { x: center.x + input.x, y: center.y + input.y },
    look,
  );
  const dx = offset.x - origin.x;
  const dy = offset.y - origin.y;
  const length = Math.hypot(dx, dy);
  return length > 1e-8 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
}

function edgeDistance(point: SamplePoint) {
  let best = Infinity;
  for (const polygon of SAMPLE_STREET_GROUND) {
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
        ),
      );
      best = Math.min(
        best,
        Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t),
      );
    }
  }
  return best;
}

/**
 * A shallow, continuous painted relief, not a complete building model.
 * Architectural surfaces use affine depth: straight doors, poles and roof lines
 * must remain straight while turning. Rounded depth fields bend painted walls.
 * The pavement and entrances stay flat; all regions share a single mesh.
 */
export function paintedHeight(point: SamplePoint) {
  if (onSampleStreetGround(point)) return 0;
  const streetFrontage = 704 - point.x * 0.271;
  // The rear wall is recessed along the lane. Treating it as part of the
  // street-facing facade puts it in front of a person standing inside the alley.
  // The setback varies with x only, so vertical wall edges remain vertical.
  const setback = Math.max(
    0,
    Math.min(1, (point.x - 1020) / 25, (1204 - point.x) / 39),
  );
  const alleyFrontage = 294 + (point.x - 1047) * 0.72;
  const frontage =
    streetFrontage + Math.min(0, alleyFrontage - streetFrontage) * setback;
  const nearSide = 945 - point.x * 0.271;
  // Vertical facades and poles stay vertical with a level camera. The original
  // oblique painting supplies their foreshortening at the neutral elevation.
  const facade =
    Math.max(0, frontage - point.y) /
    (SAMPLE_LOOK.pixelsPerUnit * Math.cos(baseElevation));
  const foreground = Math.max(0, point.y - nearSide) * 0.005;
  // Only the recessed alley and pavement need a local transition. Do not use
  // distance-to-road as the building height: it bends the door above its path.
  const margin = Math.min(1, Math.max(0, edgeDistance(point) - 4) / 10);
  return Math.max(facade, foreground) * margin;
}

export function sampleSurfaceData(step = 8, scene: PaintedView = 'street') {
  if (isRoadView(scene))
    return {
      positions: new Float32Array([
        -8.36, 4.705, 0, 8.36, 4.705, 0, -8.36, -4.705, 0, 8.36, -4.705, 0,
      ]),
      uv: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
      indices: [0, 2, 1, 1, 2, 3],
    };
  const columns = Math.ceil(ART_SAMPLE.width / step);
  const rows = Math.ceil(ART_SAMPLE.height / step);
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const uv = new Float32Array((columns + 1) * (rows + 1) * 2);
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const i = row * (columns + 1) + col;
      const point = {
        x: (col / columns) * ART_SAMPLE.width,
        y: (row / rows) * ART_SAMPLE.height,
      };
      const p = paintedPosition(point, scenePaintedHeight(point, scene));
      positions.set([p.x, p.y, p.z], i * 3);
      uv.set([col / columns, 1 - row / rows], i * 2);
      if (row < rows && col < columns) {
        const next = i + columns + 1;
        indices.push(i, next, i + 1, i + 1, next, next + 1);
      }
    }
  }
  return { positions, uv, indices };
}

const frameEdges = new Map<PaintedView, PaintedPosition[][]>();

/** Inscribed coverage of the turned painting, excluding its transparent edges. */
export function paintedFrameBounds(
  look: SampleLook,
  scene: PaintedView = 'street',
) {
  if (isRoadView(scene)) {
    const [a, b, c, d] = [
      { x: 0, y: 0 },
      { x: ART_SAMPLE.width, y: 0 },
      { x: 0, y: ART_SAMPLE.height },
      { x: ART_SAMPLE.width, y: ART_SAMPLE.height },
    ].map((p) => projectPaintedPoint(p, look, 0, scene));
    return {
      left: Math.max(0, a.x, c.x),
      right: Math.min(ART_SAMPLE.width, b.x, d.x),
      top: Math.max(0, a.y, b.y),
      bottom: Math.min(ART_SAMPLE.height, c.y, d.y),
    };
  }
  let edges = frameEdges.get(scene);
  if (!edges) {
    const { width, height } = ART_SAMPLE;
    const vertical = Array.from({ length: 129 }, (_, i) => (height * i) / 128);
    const horizontal = Array.from({ length: 257 }, (_, i) => (width * i) / 256);
    edges = [
      vertical.map((y) => ({ x: 0, y })),
      vertical.map((y) => ({ x: width, y })),
      horizontal.map((x) => ({ x, y: 0 })),
      horizontal.map((x) => ({ x, y: height })),
    ].map((edge) =>
      edge.map((p) => paintedPosition(p, scenePaintedHeight(p, scene))),
    );
    frameEdges.set(scene, edges);
  }
  const { right, up } = sampleLookBasis(look);
  const x = (p: PaintedPosition) =>
    center.x + (p.x * right.x + p.z * right.z) * 100;
  const y = (p: PaintedPosition) =>
    center.y - (p.x * up.x + p.y * up.y + p.z * up.z) * 100;
  return {
    left: Math.max(0, ...edges[0].map(x)),
    right: Math.min(ART_SAMPLE.width, ...edges[1].map(x)),
    top: Math.max(0, ...edges[2].map(y)),
    bottom: Math.min(ART_SAMPLE.height, ...edges[3].map(y)),
  };
}

export function paintedFollowCamera(
  point: SamplePoint,
  look: SampleLook,
  width: number,
  height: number,
  zoom: number,
  upcomingLook: SampleLook = look,
  scene: PaintedView = 'street',
) {
  const camera = sampleCamera(point, width, height, zoom);
  // Explicit zoom-out remains available for viewing the complete composition.
  if (zoom < 1) return camera;
  const current = paintedFrameBounds(look, scene);
  const upcoming = paintedFrameBounds(upcomingLook, scene);
  const bounds = {
    left: Math.max(current.left, upcoming.left),
    right: Math.min(current.right, upcoming.right),
    top: Math.max(current.top, upcoming.top),
    bottom: Math.min(current.bottom, upcoming.bottom),
  };
  const scale = Math.max(
    camera.scale,
    width / (bounds.right - bounds.left),
    height / (bounds.bottom - bounds.top),
  );
  return {
    scale,
    x: Math.max(
      bounds.left,
      Math.min(bounds.right - width / scale, point.x - (width / scale) * 0.5),
    ),
    y: Math.max(
      bounds.top,
      Math.min(
        bounds.bottom - height / scale,
        point.y - (height / scale) * 0.68,
      ),
    ),
  };
}

/** Screen-relative walking remains continuous while the authored view changes. */
export function sampleSceneInput(
  input: SamplePoint,
  look: SampleLook,
  blend: number | PaintedView,
  at: SamplePoint = ART_SAMPLE.start,
) {
  const scene =
    typeof blend === 'string'
      ? blend
      : blend >= 1.5
        ? 'neighborhood'
        : blend >= 0.5
          ? 'alley'
          : 'street';
  if (!input.x && !input.y) return { x: 0, y: 0 };
  const origin = projectPaintedPoint(
    sampleViewPoint(at, scene),
    look,
    0,
    scene,
  );
  // Inverting the desired screen direction also works at registration seams;
  // separate x/y derivatives can select different triangles at a doorway.
  const next = sampleViewWorld(
    unprojectPaintedGround(
      {
        x: origin.x + input.x * 0.01,
        y: origin.y + input.y * 0.01,
      },
      look,
      scene,
    ),
    scene,
  );
  const dx = next.x - at.x;
  const dy = next.y - at.y;
  const length = Math.hypot(dx, dy);
  return length > 1e-8 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
}

export function scenePaintedHeight(point: SamplePoint, scene: PaintedView) {
  if (isRoadView(scene)) return roadPaintedHeight(point, scene);
  return scene === 'street'
    ? paintedHeight(point)
    : scene === 'alley'
      ? alleyPaintedHeight(point)
      : neighborhoodPaintedHeight(point);
}
