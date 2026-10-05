/** An isolated art study. Coordinates never enter the main game's save. */
export const STREET_STUDY = {
  length: 34,
  roadWidth: 5.8,
  pavementWidth: 1.12,
  house: { x: -6.6, z: -8.1, width: 8.5, depth: 6.4, height: 4.35 },
  cafe: { x: 7.8, z: -6.9, width: 6.5, depth: 6.0, height: 6.1 },
  neighbour: { x: 13, z: 10.8, width: 8.5, depth: 6.5, height: 3.35 },
  sun: [-14, 20, 24] as const,
  minDistance: 9,
  maxDistance: 100,
  minPolar: Math.PI / 4.5,
  maxPolar: Math.PI / 3,
} as const;

export type StreetStudyView = 'street' | 'house' | 'cafe';
export const STUDY_VIEWS = [
  { id: 'street', label: '整段街道' },
  { id: 'house', label: '住宅门前' },
  { id: 'cafe', label: '街角咖啡店' },
] as const;

export function studyCamera(view: StreetStudyView, aspect = 16 / 9) {
  const narrow = aspect < 0.85;
  const target =
    view === 'house'
      ? [-6.6, 2, -6.6]
      : view === 'cafe'
        ? [7.8, 2.1, -6.2]
        : [0, 1.8, -6];
  const offset =
    view === 'street'
      ? [-12.4, 14.6, 20.5]
      : view === 'house'
        ? [-8.5, 11.8, 17.5]
        : [-7.8, 11, 17];
  const fit =
    narrow && view === 'street'
      ? Math.min(3.25, 1.6 / Math.max(aspect, 0.4))
      : 1;
  return {
    target,
    position: target.map((v, i) => v + offset[i] * fit),
  };
}

/** Reproducible layout variations, no runtime sparkle or random regeneration. */
export function studyRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export const STUDY_CAMERA_SOLIDS = [
  { ...STREET_STUDY.house, width: 9.3, depth: 7.4, top: 6.7 },
  { ...STREET_STUDY.cafe, width: 7.15, depth: 6.8, top: 8.05 },
  { ...STREET_STUDY.neighbour, width: 9.15, depth: 7.15, top: 5.7 },
] as const;

/** Keep an orbit camera outside roof volumes while preserving its viewing ray. */
export function studySafeCamera(position: number[], target: number[]) {
  if (
    position.length !== 3 ||
    target.length !== 3 ||
    ![...position, ...target].every(Number.isFinite)
  )
    return studyCamera('street').position;
  let result = [...position];
  for (let pass = 0; pass < STUDY_CAMERA_SOLIDS.length + 1; pass++) {
    const solid = STUDY_CAMERA_SOLIDS.find(
      (box) =>
        Math.abs(result[0] - box.x) < box.width / 2 + 0.25 &&
        Math.abs(result[2] - box.z) < box.depth / 2 + 0.25 &&
        result[1] < box.top,
    );
    if (!solid) break;
    const dy = result[1] - target[1];
    if (dy <= 0) return studyCamera('street').position;
    const factor = (solid.top + 0.15 - target[1]) / dy;
    result = result.map(
      (coordinate, i) => target[i] + (coordinate - target[i]) * factor,
    );
  }
  return result;
}
