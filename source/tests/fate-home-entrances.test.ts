import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HOME_ENTRANCES,
  HOME_APPROACH_SEGMENTS,
  overlapsHomeApproach,
} from '../lib/fate-home-entrances';
import {
  CITY_ROADS,
  CITY_SIZE,
  cityWalkable,
  closestSegmentPair,
} from '../lib/fate-city-layout';
import {
  LANDMARK_BUILDINGS,
  NEIGHBOURHOOD_BUILDINGS,
} from '../lib/fate-environment';
import { FATE_HOMES } from '../lib/fate-housing';
import { INDOOR_ENTRY, nearHomeEntrance } from '../lib/fate-indoor-map';
import { createDailyLife, parseDailyLife } from '../lib/fate-life';
import {
  createStreetActors,
  isWalkable,
  nearestWalkable,
  pathTo,
  stepActor,
} from '../lib/street';

void test('all ten visible residential doorways are joined to city pavement without moving old save anchors', () => {
  assert.equal(Object.keys(HOME_ENTRANCES).length, 10);
  for (const entry of Object.values(HOME_ENTRANCES)) {
    const building = LANDMARK_BUILDINGS.find((b) => b.id === entry.home)!;
    assert.deepEqual(entry.door, { x: building.x, y: building.y + 18 });
    assert.ok(cityWalkable(entry.points[0]), entry.home);
    assert.deepEqual(entry.points.at(-1), entry.door);
    assert.ok(isWalkable(entry.door), entry.home);
    assert.deepEqual(nearestWalkable(entry.door), entry.door);
    assert.ok(
      nearHomeEntrance(entry.door, entry.home),
      'the visible door permits entry',
    );
    assert.ok(
      nearHomeEntrance(FATE_HOMES[entry.home], entry.home),
      'old NPC and saved entrance coordinates remain accepted',
    );
    assert.ok(
      cityWalkable(FATE_HOMES[entry.home]),
      'the old entrance has not been moved out of the city road',
    );
  }
});

void test('the full width of every entrance path avoids every painted building, the river and world boundaries', () => {
  const buildings = [...LANDMARK_BUILDINGS, ...NEIGHBOURHOOD_BUILDINGS];
  for (const segment of HOME_APPROACH_SEGMENTS) {
    const roadSegment = { ...segment, road: CITY_ROADS[0] };
    for (const b of buildings) {
      const corners = [
        { x: b.x - b.width / 2, y: b.y - b.height },
        { x: b.x + b.width / 2, y: b.y - b.height },
        { x: b.x + b.width / 2, y: b.y },
        { x: b.x - b.width / 2, y: b.y },
      ];
      for (let index = 0; index < 4; index++) {
        const [a, c] = closestSegmentPair(roadSegment, {
          a: corners[index],
          b: corners[(index + 1) % 4],
          radius: 0,
          road: CITY_ROADS[0],
        });
        assert.ok(
          Math.hypot(a.x - c.x, a.y - c.y) >= segment.radius + 2.99,
          `walkway clips ${b.frame}`,
        );
      }
    }
    for (const p of [segment.a, segment.b]) {
      assert.ok(
        p.x >= segment.radius && p.x <= CITY_SIZE.width - segment.radius,
      );
      assert.ok(
        p.y >= 170 + segment.radius && p.y <= CITY_SIZE.height - segment.radius,
      );
      assert.ok(
        p.x + segment.radius <= 1500 || p.x - segment.radius >= 1775,
        'a residential walkway cannot cut across water',
      );
    }
    assert.equal(
      segment.a.x < 1500,
      segment.b.x < 1500,
      'both ends stay on their own bank',
    );
    assert.ok(
      overlapsHomeApproach(
        (segment.a.x + segment.b.x) / 2,
        (segment.a.y + segment.b.y) / 2,
        4,
        4,
      ),
      'props on the path can be excluded',
    );
  }
});

void test('click routes and collision movement reach every real front door and return to the established street', () => {
  const actor = createStreetActors().find((a) => a.id === 'illya')!;
  for (const entry of Object.values(HOME_ENTRANCES)) {
    for (const target of [entry.door, FATE_HOMES[entry.home]]) {
      actor.path = pathTo(actor, target);
      assert.ok(actor.path.length, `no route to ${entry.home}`);
      let frame = 0;
      while (actor.path.length && frame++ < 8000) {
        stepActor(actor, 0.05, { x: 0, y: 0 });
        assert.ok(isWalkable(actor), `${entry.home} left the road`);
      }
      assert.equal(
        actor.path.length,
        0,
        `${entry.home} stuck on an approach corner`,
      );
      assert.ok(Math.hypot(actor.x - target.x, actor.y - target.y) < 1);
      assert.ok(nearHomeEntrance(actor, entry.home));
    }
  }
});

void test('new approaches do not make building interiors walkable and reject nonfinite input', () => {
  for (const entry of Object.values(HOME_ENTRANCES)) {
    const b = LANDMARK_BUILDINGS.find(
      (building) => building.id === entry.home,
    )!;
    const middle = { x: b.x, y: b.y - b.height / 2 };
    assert.equal(isWalkable(middle), false, entry.home);
    assert.ok(isWalkable(nearestWalkable(middle)), entry.home);
    assert.equal(
      overlapsHomeApproach(middle.x, middle.y, 1, 1),
      false,
      entry.home,
    );
  }
  assert.equal(isWalkable({ x: NaN, y: Infinity }), false);
  assert.ok(isWalkable(nearestWalkable({ x: NaN, y: Infinity })));
});

void test('entering from each visible doorstep remains a valid indoor save and preserves the outside return point', () => {
  for (const entry of Object.values(HOME_ENTRANCES)) {
    const life = createDailyLife();
    life.positions.shirou = { ...entry.door };
    life.indoor = {
      actor: 'shirou',
      home: entry.home,
      ...INDOOR_ENTRY,
      layout: 2,
    };
    const restored = parseDailyLife(JSON.parse(JSON.stringify(life)));
    assert.deepEqual(restored.indoor, life.indoor, entry.home);
    assert.deepEqual(restored.positions.shirou, entry.door, entry.home);
  }
});
