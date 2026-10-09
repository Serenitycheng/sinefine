import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_ART_SCENE_IDS,
  CITY_ART_SCENES,
} from '../lib/fate-city-art-scenes';
import { cityArtScenePlaces } from '../lib/fate-city-art-map';
import {
  cityArtMapDestination,
  cityArtMapJourney,
} from '../lib/fate-city-art-destinations';
import {
  cityPilotRoute,
  type CityArtJourneyLeg,
} from '../lib/fate-city-art-navigation';

const places = [
  ...new Map(
    CITY_ART_SCENE_IDS.flatMap((scene) =>
      cityArtScenePlaces(scene).map((place) => [place.id, place] as const),
    ),
  ).values(),
];
const start = CITY_ART_SCENES.residential.start;
const gap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

void test('all 19 map destinations resolve to their real threshold and a continuous street journey', () => {
  assert.equal(places.length, 19);
  for (const place of places) {
    const trip = cityArtMapJourney('residential', start, {
      type: 'place',
      id: place.id,
    });
    assert.ok(trip, place.id);
    assert.deepEqual(trip.destination.point, place.point);
    assert.equal(trip.destination.place?.id, place.id);
    let point = start;
    for (let i = 0; i < trip.legs.length; i++) {
      const leg: CityArtJourneyLeg = trip.legs[i];
      for (const next of leg.path) {
        assert.ok(
          cityPilotRoute(point, next, leg.scene),
          `${place.id}/${leg.scene}`,
        );
        point = next;
      }
      if (leg.nextScene) {
        assert.equal(leg.nextScene, trip.legs[i + 1].scene);
        assert.ok(cityPilotRoute(point, point, leg.nextScene));
      }
    }
    assert.ok(gap(point, place.point) < 1e-5, place.id);
  }
});

void test('cross-river map travel uses an actual bridge instead of moving the player directly', () => {
  const trip = cityArtMapJourney('residential', start, {
    type: 'place',
    id: 'church',
  });
  assert.ok(trip);
  assert.ok(trip.legs.length > 2);
  assert.ok(trip.legs.some((leg) => leg.scene.includes('bridge')));
  assert.equal(trip.legs[0].scene, 'residential');
  assert.deepEqual(start, CITY_ART_SCENES.residential.start);
});

void test('road clicks prefer the current street and invalid areas never become destinations', () => {
  const road = cityArtMapDestination(
    { type: 'point', point: start },
    'residential',
  );
  assert.ok(road);
  assert.equal(road.scene, 'residential');
  assert.equal(road.place, null);
  for (const point of [
    { x: 0, y: 0 },
    { x: 1640, y: 600 },
    { x: NaN, y: 500 },
  ])
    assert.equal(
      cityArtMapJourney('residential', start, { type: 'point', point }),
      null,
    );
  assert.equal(
    cityArtMapDestination({ type: 'place', id: 'missing' }, 'residential'),
    null,
  );
});

void test('selecting the doorway the player already reached remains a valid arrival', () => {
  const destination = cityArtMapDestination(
    { type: 'place', id: 'emiya' },
    'residential',
  );
  assert.ok(destination);
  const trip = cityArtMapJourney(destination.scene, destination.point, {
    type: 'place',
    id: 'emiya',
  });
  assert.ok(trip);
  assert.equal(trip.legs.length, 1);
  assert.equal(trip.destination.place?.id, 'emiya');
});
