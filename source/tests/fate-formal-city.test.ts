import assert from 'node:assert/strict';
import test from 'node:test';
import { formalCityScene } from '../lib/fate-formal-city';
import {
  CITY_ART_SCENE_IDS,
  CITY_ART_SCENES,
} from '../lib/fate-city-art-scenes';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import { cityPilotWalkable } from '../lib/fate-city-art-navigation';
import { createStreetActors } from '../lib/street';

void test('formal actors keep their original saved world coordinates when selecting a painted street', () => {
  for (const actor of createStreetActors()) {
    const before = structuredClone(actor);
    const scene = formalCityScene(actor);
    assert.ok(CITY_ART_SCENE_IDS.includes(scene), actor.id);
    assert.deepEqual(actor, before);
  }
});

void test('every formal home door resolves to a registered walkable painted scene', () => {
  for (const entry of Object.values(HOME_ENTRANCES)) {
    const scene = formalCityScene(entry.door);
    assert.ok(
      cityPilotWalkable(entry.door, 1, scene),
      `${entry.home}: ${scene}`,
    );
    assert.ok(CITY_ART_SCENES[scene].homes.includes(entry.home), entry.home);
  }
});

void test('a shared junction retains its current painting instead of flickering between streets', () => {
  for (const preferred of CITY_ART_SCENE_IDS) {
    const point = CITY_ART_SCENES[preferred].start;
    if (cityPilotWalkable(point, 1, preferred))
      assert.equal(formalCityScene(point, preferred), preferred);
  }
});
