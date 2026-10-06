import {
  NEIGHBORHOOD_PLACES,
  neighborhoodPaintedHeight,
} from './fate-art-alley';
import { sampleDistance, type SamplePoint } from './fate-art-sample';
import { type PaintedView } from './fate-art-views';

export const SAMPLE_BENCH = NEIGHBORHOOD_PLACES[2];
export type BenchPosture = 'standing' | 'approaching' | 'sitting';
export const BENCH_SPRITE = '/fate/art-sample/illya-sit-v1.png';
export const BENCH_SPRITE_CELL = 627;

// Hips are anchored to the actual wooden seat in each complete painting.
// The navigation position stays on the paved apron, never inside the bench.
const seats = {
  neighborhood: {
    point: { x: 1395, y: 532 },
    column: 0,
    row: 0,
    hip: { x: 350, y: 449 },
    scale: 0.22,
  },
  'neighborhood-along': {
    point: { x: 1331, y: 363 },
    column: 1,
    row: 0,
    hip: { x: 350, y: 465 },
    scale: 0.18,
  },
  'neighborhood-eye': {
    point: { x: 1377, y: 479 },
    column: 0,
    row: 1,
    hip: { x: 336, y: 454 },
    scale: 0.2,
  },
} as const;

export function sampleBenchSeat(view: PaintedView) {
  if (!(view in seats)) return null;
  const seat = seats[view as keyof typeof seats];
  return {
    ...seat,
    height: view === 'neighborhood' ? neighborhoodPaintedHeight(seat.point) : 0,
  };
}

export function atSampleBench(point: SamplePoint) {
  return sampleDistance(point, SAMPLE_BENCH.point) < 1;
}

/** A cancelled or blocked approach must never turn into a delayed sit. */
export function arriveAtSampleBench(
  posture: BenchPosture,
  point: SamplePoint,
  routeFinished: boolean,
): BenchPosture {
  return posture === 'approaching' && routeFinished && atSampleBench(point)
    ? 'sitting'
    : posture;
}
