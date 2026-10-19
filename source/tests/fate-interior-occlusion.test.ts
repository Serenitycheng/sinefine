import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CITY_INTERIOR_IDS,
  CITY_INTERIOR_SCENES,
  interiorUnproject,
} from '../lib/fate-city-interior-scenes';
import { cityPreviewVisit } from '../lib/fate-city-preview-visit';
import { FATE_CAST, isPartner } from '../lib/fate-cast';
import {
  interiorSpotRoute,
  insideInteriorShape,
} from '../lib/fate-interior-access';
import { interiorObjectFacing } from '../lib/fate-interior-interaction';
import { previewPresentation } from '../lib/fate-preview-presentation';
import {
  interiorBodyOcclusion,
  interiorOcclusionLayers,
} from '../lib/fate-interior-occlusion';

const visits = CITY_INTERIOR_IDS.map((site) => ({
  site,
  plan: cityPreviewVisit(CITY_INTERIOR_SCENES[site], 'illya').plan,
}));

void test('a long L-shaped kitchen counter occludes by its local front edge, not its farthest corner', () => {
  const scene = visits.find((v) => v.site === 'einzbern')!.plan.rooms.kitchen
    .scene;
  const point = interiorUnproject({ x: 54 * 16, y: 57 * 9 }, scene.floor)!;
  const bands = interiorOcclusionLayers(scene).filter(
    (p) =>
      p.id === 'counter' &&
      p.bounds.x <= 54 * 16 &&
      p.bounds.x + p.bounds.width >= 54 * 16,
  );
  assert.ok(bands.length > 0);
  assert.ok(
    bands.every((p) => p.depth < point.y),
    'a person in front of this part of the counter stays in front',
  );
  const counter = scene.furniture.find((f) => f.id === 'counter')!;
  assert.ok(
    counter.footprint.y + counter.footprint.height > point.y,
    'the old whole-object depth would incorrectly cover the person',
  );
});

void test('split depth bands preserve every painted silhouette and all gaps between furniture parts', () => {
  for (const { site, plan } of visits)
    for (const [room, config] of Object.entries(plan.rooms)) {
      const layers = interiorOcclusionLayers(config.scene);
      for (const piece of config.scene.furniture) {
        const masks =
          piece.silhouettes ?? (piece.silhouette ? [piece.silhouette] : []);
        const own = layers.filter((p) => p.id === piece.id);
        for (const mask of masks) {
          const xs = mask.map((p) => p.x),
            ys = mask.map((p) => p.y);
          for (let x = 0; x < 9; x++)
            for (let y = 0; y < 9; y++) {
              const p = {
                x:
                  Math.min(...xs) +
                  ((x + 0.41) * (Math.max(...xs) - Math.min(...xs))) / 9,
                y:
                  Math.min(...ys) +
                  ((y + 0.37) * (Math.max(...ys) - Math.min(...ys))) / 9,
              };
              assert.equal(
                own.some((l) => insideInteriorShape(p, l.polygon)),
                masks.some((m) => insideInteriorShape(p, m)),
                `${site}/${room}:${piece.id}`,
              );
            }
        }
      }
    }
});

void test('all 21 identities have readable standing arrivals at all 177 interactions', () => {
  let checks = 0;
  for (const { site, plan } of visits)
    for (const [room, config] of Object.entries(plan.rooms))
      for (const spot of config.scene.spots) {
        const path = interiorSpotRoute(
          config.doors[0].point,
          spot,
          config.scene,
        );
        assert.ok(path, `${site}/${room}:${spot.id}`);
        const point = path.at(-1) ?? config.doors[0].point;
        const direction = interiorObjectFacing(
          point,
          spot.target,
          config.scene,
          'down',
        );
        for (const person of FATE_CAST) {
          assert.ok(isPartner(person.id));
          const sprite = plan.sprite(person.id, direction, 0);
          const view = previewPresentation(config.scene, point, sprite, null);
          assert.ok(
            interiorBodyOcclusion(point, view.body, config.scene) <= 0.35,
            `${site}/${room}:${spot.id}:${person.id} is not swallowed by furniture`,
          );
          checks++;
        }
      }
  assert.equal(checks, 177 * 21);
});
