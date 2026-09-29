import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createStreetActors,
  directionFromKeys,
  isWalkable,
  moveWithinStreet,
  nearestWalkable,
  pathTo,
  stepActor,
} from '../lib/street';

void test('movement stays on the street, slides along walls and cannot jump between disconnected alleys', () => {
  const original = { x: 151, y: 1400 };
  const edge = moveWithinStreet(original, -500, 0);
  assert.ok(isWalkable(edge));
  assert.ok(edge.x >= 150 && edge.x < 154);
  assert.deepEqual(original, { x: 151, y: 1400 });
  const slide = moveWithinStreet({ x: 150, y: 1400 }, -20, 20);
  assert.equal(slide.x, 150);
  assert.ok(Math.abs(slide.y - 1420) < 1e-6);
  const blocked = moveWithinStreet({ x: 500, y: 1210 }, 590, 0);
  assert.ok(blocked.x <= 540);
  assert.ok(isWalkable(blocked));
  assert.ok(isWalkable(nearestWalkable({ x: Number.NaN, y: Infinity })));
});

void test('click navigation travels through the main street and reaches the opposite alley safely', () => {
  const actor = createStreetActors()[0];
  Object.assign(actor, { x: 500, y: 1210 });
  const destination = { x: 1870, y: 1221 };
  actor.path = pathTo(actor, destination);
  assert.ok(actor.path.length > 1);
  for (let frame = 0; frame < 1000 && actor.path.length; frame++) {
    stepActor(actor, 0.05);
    assert.ok(isWalkable(actor), `position left the street at frame ${frame}`);
  }
  assert.equal(actor.path.length, 0);
  assert.ok(Math.hypot(actor.x - destination.x, actor.y - destination.y) < 1);
});

void test('keyboard movement normalizes diagonals, cancels click paths and caps a resumed frame', () => {
  const diagonal = directionFromKeys(new Set(['w', 'd']));
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
  assert.deepEqual(directionFromKeys(new Set(['w', 's', 'a', 'd'])), {
    x: 0,
    y: 0,
  });
  const actor = createStreetActors()[0];
  const start = { x: actor.x, y: actor.y };
  actor.path = [{ x: start.x + 100, y: start.y }];
  stepActor(actor, 60, { x: -1, y: 0 });
  assert.equal(actor.path.length, 0);
  assert.equal(actor.facing, -1);
  assert.ok(Math.abs(actor.x - (start.x - 90 * 0.05)) < 1e-6);
  assert.equal(actor.y, start.y);
});
