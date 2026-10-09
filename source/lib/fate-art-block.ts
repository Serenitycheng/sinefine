import {
  ART_SAMPLE,
  SAMPLE_ALLEY,
  SAMPLE_PLACES,
  SAMPLE_STREET_GROUND,
  type SamplePoint,
  type SamplePlace,
} from './fate-art-sample';
import {
  ALLEY_AHEAD,
  ALLEY_WORLD_PAVING,
  NEIGHBORHOOD_CENTER,
  NEIGHBORHOOD_PLACES,
  NEIGHBORHOOD_WORLD_PAVING,
  sampleNeighborhoodWorld,
  type SampleScene,
} from './fate-art-alley';
import {
  SLOPE_CENTER,
  SLOPE_ENDS,
  SLOPE_PLACES,
  SLOPE_WORLD_PAVING,
} from './fate-art-extension';
import { viewForArea, type PaintedView, type RoadMode } from './fate-art-views';

/** Scene, place and connection IDs are art-module IDs. City save IDs stay in
 * the game adapter; painted pixel positions are never written into a save. */
export type BlockArea = {
  id: SampleScene;
  name: string;
  character: string;
  center: SamplePoint;
  paving: readonly (readonly SamplePoint[])[];
  places: readonly SamplePlace[];
  views: Record<RoadMode, PaintedView>;
};
const views = (area: SampleScene) => ({
  overview: viewForArea(area, 'overview'),
  along: viewForArea(area, 'along'),
  eye: viewForArea(area, 'eye'),
});
export const BLOCK_AREAS: Record<SampleScene, BlockArea> = {
  street: {
    id: 'street',
    name: '住宅主街',
    character: '蓝灰布棚 · 栀子与天竺葵',
    center: { ...ART_SAMPLE.start },
    paving: SAMPLE_STREET_GROUND,
    places: SAMPLE_PLACES,
    views: views('street'),
  },
  alley: {
    id: 'alley',
    name: '咖啡店小巷',
    character: '石板与院墙 · 蕨叶和常春藤',
    center: { ...SAMPLE_ALLEY.inside },
    paving: [ALLEY_WORLD_PAVING],
    places: [],
    views: views('alley'),
  },
  neighborhood: {
    id: 'neighborhood',
    name: '林荫支路',
    character: '绣球花 · 树下长椅',
    center: NEIGHBORHOOD_CENTER,
    paving: NEIGHBORHOOD_WORLD_PAVING,
    places: NEIGHBORHOOD_PLACES,
    views: views('neighborhood'),
  },
  slope: {
    id: 'slope',
    name: '榉树坡道',
    character: '榉树与银杏 · 面包店白茉莉',
    center: SLOPE_CENTER,
    paving: SLOPE_WORLD_PAVING,
    places: SLOPE_PLACES,
    views: views('slope'),
  },
};
export type BlockConnection = {
  id: string;
  a: SampleScene;
  b: SampleScene;
  at: SamplePoint;
  approaches: Record<string, SamplePoint>;
  landmark: string;
};
export const BLOCK_CONNECTIONS: readonly BlockConnection[] = [
  {
    id: 'cafe-alley',
    a: 'street',
    b: 'alley',
    at: { ...SAMPLE_ALLEY.mouth },
    approaches: {
      street: { ...SAMPLE_ALLEY.street },
      alley: { ...SAMPLE_ALLEY.inside },
    },
    landmark: '咖啡店旁的石板入口',
  },
  {
    id: 'alley-leafy',
    a: 'alley',
    b: 'neighborhood',
    at: ALLEY_AHEAD,
    approaches: { alley: ALLEY_AHEAD, neighborhood: NEIGHBORHOOD_CENTER },
    landmark: '巷尾的绣球花路口',
  },
  {
    id: 'leafy-slope',
    a: 'neighborhood',
    b: 'slope',
    at: SLOPE_ENDS[0],
    approaches: {
      neighborhood: sampleNeighborhoodWorld({ x: 1420, y: 285 }),
      slope: SLOPE_CENTER,
    },
    landmark: '林荫路尽头的榉树坡道',
  },
  {
    id: 'slope-main',
    a: 'slope',
    b: 'street',
    at: SLOPE_ENDS[1],
    approaches: { slope: SLOPE_CENTER, street: { x: 1460, y: 407 } },
    landmark: '坡道回到住宅主街的路口',
  },
];
export const BLOCK_PLACES = Object.values(BLOCK_AREAS).flatMap(
  (area) => area.places,
);
export function blockAreaForPlace(id: SamplePlace['id']) {
  return Object.values(BLOCK_AREAS).find((area) =>
    area.places.some((place) => place.id === id),
  )!;
}
export function blockExits(area: SampleScene) {
  return BLOCK_CONNECTIONS.filter((c) => c.a === area || c.b === area).map(
    (c) => {
      const to = c.a === area ? c.b : c.a;
      return {
        ...c,
        to,
        destination: c.approaches[to],
        name: BLOCK_AREAS[to].name,
      };
    },
  );
}
