import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  CITY_ROADS,
  projectOnSegment,
  type CityPoint,
} from '../lib/fate-city-layout';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import {
  CITY_ART_SCENES,
  CITY_ART_SCENE_IDS,
  cityScenesForRoad,
} from '../lib/fate-city-art-scenes';
import { CITY_ART_MODES, cityArtCamera } from '../lib/fate-city-art-camera';
import { CITY_ART_PORTALS, cityArtExits } from '../lib/fate-city-art-portals';
import {
  cityArtFloor,
  projectCityArtPoint,
  onCityArtPaving,
} from '../lib/fate-city-art-registration';
import {
  cityArtJourney,
  cityPilotRoute,
  cityPilotWalkable,
  advanceCityPilotRoute,
} from '../lib/fate-city-art-navigation';
import measurements from '../lib/fate-city-art-ground-data.json';

const gap = (a: CityPoint, b: CityPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const length = (points: readonly CityPoint[]) =>
  points.slice(1).reduce((sum, p, i) => sum + gap(p, points[i]), 0);
const cross = (a: CityPoint, b: CityPoint, c: CityPoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

void test('all original roads are painted in full without dropping ends, replacing geography, or bypassing private home paths', () => {
  assert.equal(CITY_ROADS.length, 19);
  assert.equal(CITY_ART_SCENE_IDS.length, 23);
  for (const road of CITY_ROADS) {
    const scenes = cityScenesForRoad(road.id)
      .map((id) => CITY_ART_SCENES[id])
      .filter((scene) => !scene.privateApproach);
    assert.ok(scenes.length, road.id);
    assert.ok(
      Math.abs(
        scenes.reduce((sum, scene) => sum + length(scene.points), 0) -
          length(road.points),
      ) < 1e-7,
      `${road.id}: full centerline length`,
    );
    for (const vertex of road.points)
      assert.ok(
        scenes.some((scene) => scene.points.some((p) => gap(vertex, p) < 1e-7)),
        `${road.id}: original vertex`,
      );
  }
  for (const home of ['tohsaka', 'matou'] as const) {
    const scene = CITY_ART_SCENES[`${home}-approach`];
    assert.deepEqual(scene.points.slice(1), HOME_ENTRANCES[home].points);
    assert.deepEqual(scene.points.at(-1), HOME_ENTRANCES[home].door);
  }
});

void test('every city view has its own native PNG and completed measurements, rather than repeating one sample street', () => {
  const hashes = new Set<string>();
  for (const scene of CITY_ART_SCENE_IDS)
    for (const mode of CITY_ART_MODES) {
      const camera = cityArtCamera(mode, scene);
      const png = readFileSync(join(process.cwd(), 'public', camera.painting));
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(
        png.readUInt32BE(16),
        camera.width,
        `${scene}/${mode}: native width`,
      );
      assert.equal(
        png.readUInt32BE(20),
        camera.height,
        `${scene}/${mode}: native height`,
      );
      hashes.add(createHash('sha256').update(png).digest('hex'));
      if (scene !== 'residential' && scene !== 'old-street')
        assert.equal(
          measurements[scene][mode].calibrated,
          true,
          `${scene}/${mode}: measured actual painting`,
        );
    }
  assert.equal(hashes.size, 69);
});

void test('all streets, bridges and private approaches form one network through actual shared world positions', () => {
  const seen = new Set<string>(['residential']),
    queue = ['residential' as const] as (typeof CITY_ART_SCENE_IDS)[number][];
  while (queue.length)
    for (const exit of cityArtExits(queue.shift()!)) {
      if (!seen.has(exit.scene)) {
        seen.add(exit.scene);
        queue.push(exit.scene);
      }
    }
  assert.equal(seen.size, CITY_ART_SCENE_IDS.length);
  for (const portal of CITY_ART_PORTALS)
    for (const scene of [portal.a, portal.b]) {
      const config = CITY_ART_SCENES[scene];
      assert.ok(
        config.points
          .slice(1)
          .some(
            (b, i) =>
              gap(
                projectOnSegment(portal.point, config.points[i], b),
                portal.point,
              ) < 1e-5,
          ),
        `${portal.id}: real shared centerline`,
      );
      assert.ok(
        cityPilotWalkable(portal.point, 1, scene),
        `${portal.id}: rendered floor at crossing`,
      );
    }
  for (const destination of [
    'tohsaka-approach',
    'matou-approach',
    'fuyuki-bridge',
    'church-slope',
    'station-avenue',
  ] as const) {
    const legs = cityArtJourney(
      'residential',
      CITY_ART_SCENES.residential.start,
      destination,
    );
    assert.ok(legs?.length);
    assert.equal(legs[0].scene, 'residential');
    assert.equal(legs.at(-1)!.scene, destination);
    for (let i = 0; i < legs.length - 1; i++) {
      assert.equal(legs[i].nextScene, legs[i + 1].scene);
      const end = legs[i].path.at(-1)!;
      assert.ok(
        cityArtExits(legs[i].scene).some(
          (exit) =>
            exit.scene === legs[i + 1].scene && gap(exit.point, end) < 1e-5,
        ),
        'no implicit relocation at a street boundary',
      );
    }
  }
});

void test('all three ground projections remain unfolded and preserve feet, inverse clicks and reachable home thresholds', () => {
  let checked = 0;
  for (const scene of CITY_ART_SCENE_IDS) {
    const config = CITY_ART_SCENES[scene];
    for (const mode of CITY_ART_MODES) {
      const floor = cityArtFloor(mode, scene),
        camera = cityArtCamera(mode, scene);
      const signs = floor.faces.map(([a, b, c]) =>
        Math.sign(
          cross(
            floor.pairs[a].world,
            floor.pairs[b].world,
            floor.pairs[c].world,
          ) *
            cross(
              floor.pairs[a].paint,
              floor.pairs[b].paint,
              floor.pairs[c].paint,
            ),
        ),
      );
      assert.ok(
        signs.every((sign) => sign !== 0 && sign === signs[0]),
        `${scene}/${mode}: folded floor`,
      );
      for (const face of floor.faces)
        for (const weights of [
          [0.33, 0.33, 0.34],
          [0.1, 0.45, 0.45],
          [0.45, 0.1, 0.45],
          [0.45, 0.45, 0.1],
        ]) {
          const world = { x: 0, y: 0 };
          face.forEach((index, i) => {
            world.x += floor.pairs[index].world.x * weights[i];
            world.y += floor.pairs[index].world.y * weights[i];
          });
          if (!cityPilotWalkable(world, 1, scene)) continue;
          const paint = projectCityArtPoint(world, false, mode, scene),
            back = projectCityArtPoint(paint, true, mode, scene);
          assert.ok(
            gap(world, back) < 1e-5,
            `${scene}/${mode}: inverse click changed world position`,
          );
          assert.ok(onCityArtPaving(paint, mode, scene));
          assert.ok(
            paint.x >= 0 &&
              paint.y >= 0 &&
              paint.x <= camera.width &&
              paint.y <= camera.height,
            `${scene}/${mode}: invisible foot`,
          );
          checked++;
        }
    }
    for (const goal of [
      ...config.points,
      ...config.homes.map((home) => HOME_ENTRANCES[home].door),
    ]) {
      assert.ok(
        cityPilotWalkable(goal, 1, scene),
        `${scene}: endpoint and doorstep available in every view`,
      );
      const path = cityPilotRoute(config.start, goal, scene);
      assert.ok(path, `${scene}: reachable doorstep`);
    }
    // Advance actual steps, not just the path planner, through every street's
    // last turn or home approach in the eye-level camera.
    const goal = config.homes.length
      ? HOME_ENTRANCES[config.homes[0]].door
      : config.points.at(-1)!;
    let point = { ...config.start },
      path = cityPilotRoute(point, goal, scene)!;
    for (let frame = 0; path.length && frame < 250; frame++) {
      const next = advanceCityPilotRoute(point, path, 66, 'eye', scene);
      assert.equal(
        next.blocked,
        false,
        `${scene}: planned route stalled at a curb or doorstep`,
      );
      assert.ok(
        next.used || gap(point, next.point) > 1e-7,
        `${scene}: route made no progress`,
      );
      point = next.point;
      path = path.slice(next.used);
    }
    assert.equal(path.length, 0, `${scene}: finished walk`);
    assert.ok(gap(point, goal) < 1e-5, `${scene}: reached actual goal`);
  }
  assert.ok(
    checked > 10000,
    'dense checks include corners and both sides of all streets',
  );
});
