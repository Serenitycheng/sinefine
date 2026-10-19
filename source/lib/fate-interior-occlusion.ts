import type { CityPoint } from './fate-city-layout';
import {
  interiorDepth,
  interiorProject,
  interiorUnproject,
  type CityInteriorScene,
  type InteriorFurniture,
} from './fate-city-interior-scenes';
import { furnitureSolids, insideInteriorShape } from './fate-interior-geometry';

export type InteriorOccluder = {
  id: string;
  polygon: readonly CityPoint[];
  depth: number;
  bounds: { x: number; y: number; width: number; height: number };
};
const bounds = (p: readonly CityPoint[]) => {
  const xs = p.map((q) => q.x),
    ys = p.map((q) => q.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};
const distanceToEdge = (p: CityPoint, poly: readonly CityPoint[]) =>
  insideInteriorShape(p, poly)
    ? 0
    : Math.min(
        ...poly.map((a, i) => {
          const b = poly[(i + 1) % poly.length],
            dx = b.x - a.x,
            dy = b.y - a.y;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
            ),
          );
          return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
        }),
      );
const clipX = (poly: readonly CityPoint[], edge: number, direction: number) => {
  const out: CityPoint[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    const da = (a.x - edge) * direction,
      db = (b.x - edge) * direction;
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({ x: edge, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
};

/** Each painted band follows its own ground contact, not the farthest cabinet corner. */
function furnitureLayers(
  furniture: InteriorFurniture,
  scene: CityInteriorScene,
): InteriorOccluder[] {
  const grounds = furnitureSolids(furniture).map((poly) =>
    poly.map((p) => interiorProject(p, scene.floor)),
  );
  return (
    furniture.silhouettes ??
    (furniture.silhouette ? [furniture.silhouette] : [])
  ).flatMap((mask) => {
    const box = bounds(mask),
      contact = { x: box.x + box.width / 2, y: box.y + box.height };
    const ground = [...grounds].sort(
      (a, b) => distanceToEdge(contact, a) - distanceToEdge(contact, b),
    )[0];
    const floorBox = bounds(ground),
      layers: InteriorOccluder[] = [];
    for (let left = box.x; left < box.x + box.width; left += 48) {
      const right = Math.min(left + 48, box.x + box.width);
      const polygon = clipX(clipX(mask, left, 1), right, -1);
      if (polygon.length < 3) continue;
      const x = Math.max(
        floorBox.x + 0.0001,
        Math.min(floorBox.x + floorBox.width - 0.0001, (left + right) / 2),
      );
      const contacts: number[] = [];
      for (let i = 0; i < ground.length; i++) {
        const a = ground[i],
          b = ground[(i + 1) % ground.length];
        if (x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x)) continue;
        if (Math.abs(b.x - a.x) < 1e-8) contacts.push(a.y, b.y);
        else contacts.push(a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x));
      }
      const depth = contacts.length
        ? interiorUnproject({ x, y: Math.max(...contacts) }, scene.floor)?.y
        : undefined;
      layers.push({
        id: furniture.id,
        polygon,
        depth: depth ?? furniture.footprint.y + furniture.footprint.height,
        bounds: bounds(polygon),
      });
    }
    return layers;
  });
}
const layersCache = new WeakMap<
  CityInteriorScene,
  readonly InteriorOccluder[]
>();
export function interiorOcclusionLayers(scene: CityInteriorScene) {
  let layers = layersCache.get(scene);
  if (!layers) {
    layers = scene.furniture.flatMap((f) => furnitureLayers(f, scene));
    layersCache.set(scene, layers);
  }
  return layers;
}

export function interiorBodyOcclusion(
  point: CityPoint,
  body: { x: number; y: number; width: number; height: number },
  scene: CityInteriorScene,
) {
  const front = interiorOcclusionLayers(scene).filter(
    (layer) => layer.depth >= point.y,
  );
  let covered = 0;
  for (let x = 0; x < 5; x++)
    for (let y = 0; y < 7; y++) {
      const p = {
        x: body.x + ((x + 0.5) * body.width) / 5,
        y: body.y + ((y + 0.5) * body.height) / 7,
      };
      if (
        front.some(
          (layer) =>
            p.x >= layer.bounds.x &&
            p.x <= layer.bounds.x + layer.bounds.width &&
            p.y >= layer.bounds.y &&
            p.y <= layer.bounds.y + layer.bounds.height &&
            insideInteriorShape(p, layer.polygon),
        )
      )
        covered++;
    }
  return covered / 35;
}
const standingCache = new WeakMap<CityInteriorScene, Map<string, number>>();
export function interiorStandingOcclusion(
  point: CityPoint,
  scene: CityInteriorScene,
) {
  let cache = standingCache.get(scene);
  if (!cache) {
    cache = new Map();
    standingCache.set(scene, cache);
  }
  const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}`;
  let amount = cache.get(key);
  if (amount === undefined) {
    const foot = interiorProject(point, scene.floor),
      scale = interiorDepth(point, scene.floor);
    amount = interiorBodyOcclusion(
      point,
      {
        x: foot.x - 125 * scale,
        y: foot.y - 330 * scale,
        width: 250 * scale,
        height: 343 * scale,
      },
      scene,
    );
    cache.set(key, amount);
  }
  return amount;
}
