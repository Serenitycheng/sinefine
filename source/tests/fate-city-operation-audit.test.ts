import assert from 'node:assert/strict';
import test from 'node:test';
import {
  interiorDoorGuides,
  interiorWalkFacing,
} from '../lib/fate-interior-controls';
import { HOUSE_PREVIEWS } from '../lib/fate-preview-houses';
import { mirrorPreviewSprite } from '../lib/fate-preview-house';
import { previewPresentation } from '../lib/fate-preview-presentation';
import { houseCamera, houseZoom } from '../lib/fate-tohsaka-house';
import { interiorProject } from '../lib/fate-city-interior-scenes';
import {
  cityArtMapJourney,
  cityArtMapDestination,
} from '../lib/fate-city-art-destinations';
import { CITY_ART_SCENE_IDS } from '../lib/fate-city-art-scenes';
import { cityArtScenePlaces } from '../lib/fate-city-art-map';
import { cityPilotWalkable } from '../lib/fate-city-art-navigation';
import type { CityArtJourneyLeg } from '../lib/fate-city-art-navigation';

const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: typeof a,
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

void test('all 19 thresholds support return trips and pairwise journeys through the original paving', () => {
  const places = [
    ...new Map(
      CITY_ART_SCENE_IDS.flatMap((scene) =>
        cityArtScenePlaces(scene).map((p) => [p.id, p] as const),
      ),
    ).values(),
  ];
  assert.equal(places.length, 19);
  for (const from of places)
    for (const to of places) {
      const start = cityArtMapDestination(
        { type: 'place', id: from.id },
        'residential',
      );
      assert.ok(start);
      const trip = cityArtMapJourney(start.scene, start.point, {
        type: 'place',
        id: to.id,
      });
      assert.ok(trip, `${from.id} → ${to.id}`);
      let point = start.point;
      for (let i = 0; i < trip.legs.length; i++) {
        const leg: CityArtJourneyLeg = trip.legs[i];
        assert.ok(cityPilotWalkable(point, 1, leg.scene));
        for (const next of leg.path) {
          assert.ok(cityPilotWalkable(next, 1, leg.scene));
          point = next;
        }
        if (leg.nextScene) assert.equal(leg.nextScene, trip.legs[i + 1].scene);
      }
      assert.ok(Math.hypot(point.x - to.point.x, point.y - to.point.y) < 1e-5);
    }
});

void test('all shared rooms keep visible door labels inside the viewport and clear of bodies, other labels and zoom controls', () => {
  let checked = 0;
  for (const plan of Object.values(HOUSE_PREVIEWS))
    for (const room of Object.values(plan.rooms)) {
      for (const actor of plan.cast)
        for (const action of [null, ...room.actions]) {
          const point = action
            ? room.scene.spots.find((p) => p.id === action.id)!.point
            : { x: 500, y: 560 };
          let sprite = plan.sprite(actor.id, 'up', 0, action?.pose);
          if (action?.mirror) sprite = mirrorPreviewSprite(sprite);
          const p = previewPresentation(room.scene, point, sprite, action);
          for (const size of [
            { width: 1280, height: 560 },
            { width: 390, height: 450 },
            { width: 320, height: 180 },
          ]) {
            const fit = Math.min(size.width / 1600, size.height / 900);
            for (const requested of [1, 2.5]) {
              const scale =
                fit *
                houseZoom(requested, size, action?.seat ? p.body.height : 330);
              const origin = houseCamera(
                {
                  x: size.width / 2 - p.foot.x * scale,
                  y: size.height * 0.7 - p.foot.y * scale,
                },
                scale,
                size,
                p.body,
              );
              const body = {
                x: origin.x + p.body.x * scale,
                y: origin.y + p.body.y * scale,
                width: p.body.width * scale,
                height: p.body.height * scale,
              };
              const screens = room.doors.map((d) => {
                const pt = interiorProject(d.point, room.scene.floor);
                return {
                  x: origin.x + pt.x * scale,
                  y: origin.y + pt.y * scale,
                };
              });
              const marks = interiorDoorGuides(screens, size, body),
                rects: (typeof body)[] = [];
              for (const mark of marks)
                if (mark) {
                  const rect = {
                    x: mark.x - mark.width / 2,
                    y: mark.y - 18,
                    width: mark.width,
                    height: 36,
                  };
                  assert.ok(
                    rect.x >= 11.9 &&
                      rect.y >= 11.9 &&
                      rect.x + rect.width <= size.width - 11.9 &&
                      rect.y + 36 <= size.height - 11.9,
                  );
                  assert.ok(
                    !overlap(rect, body),
                    `${plan.name}/${room.scene.room}/${actor.id}/${action?.id}`,
                  );
                  assert.ok(
                    !overlap(rect, {
                      x: size.width - 212,
                      y: 0,
                      width: 212,
                      height: 64,
                    }),
                  );
                  assert.ok(rects.every((other) => !overlap(rect, other)));
                  rects.push(rect);
                }
              checked++;
            }
          }
        }
    }
  assert.ok(checked > 1000);
});

void test('an offscreen doorway has a pinned arrow while a nearby uncrowded doorway stays registered', () => {
  const size = { width: 800, height: 500 },
    body = { x: 300, y: 200, width: 70, height: 160 };
  const [outside, near] = interiorDoorGuides(
    [
      { x: -200, y: 290 },
      { x: 600, y: 350 },
    ],
    size,
    body,
  );
  assert.ok(outside?.pinned);
  assert.ok(near && !near.pinned);
  assert.equal(near.x, 600);
  assert.equal(near.y, 312);
});

void test('indoor facing follows actual wall-slide displacement and has the same diagonal dead band as the street', () => {
  const floor = {
    backLeft: 0,
    backRight: 1600,
    backY: 0,
    frontLeft: 0,
    frontRight: 1600,
    frontY: 900,
  };
  const from = { x: 500, y: 300 };
  assert.equal(
    interiorWalkFacing(from, { x: 500, y: 315 }, floor, 'right'),
    'down',
  );
  assert.equal(
    interiorWalkFacing(from, { x: 500, y: 285 }, floor, 'left'),
    'up',
  );
  assert.equal(interiorWalkFacing(from, from, floor, 'right'), 'right');
  const scaleX = 1600 / 1000,
    scaleY = 900 / 650;
  const previous = 'right' as const;
  for (const ratio of [0.98, 1.02, 0.99, 1.04])
    assert.equal(
      interiorWalkFacing(
        from,
        { x: 501, y: 300 + (scaleX / scaleY) * ratio },
        floor,
        previous,
      ),
      'right',
    );
});
