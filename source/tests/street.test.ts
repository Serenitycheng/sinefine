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
  const original = { x: 56, y: 850 };
  const edge = moveWithinStreet(original, -500, 0);
  assert.ok(isWalkable(edge));
  assert.ok(edge.x >= 55 && edge.x < 59);
  assert.deepEqual(original, { x: 56, y: 850 });
  const slide = moveWithinStreet({ x: 55, y: 850 }, -20, 20);
  assert.equal(slide.x, 55);
  assert.ok(Math.abs(slide.y - 870) < 1e-6);
  const blocked = moveWithinStreet({ x: 300, y: 760 }, 590, 0);
  assert.ok(blocked.x <= 369);
  assert.ok(isWalkable(blocked));
  assert.ok(isWalkable(nearestWalkable({ x: Number.NaN, y: Infinity })));
});

void test('click navigation travels through the main street and reaches the opposite alley safely', () => {
  const actor = createStreetActors()[0];
  Object.assign(actor, { x: 300, y: 760 });
  const destination = { x: 890, y: 710 };
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
  actor.path = [{ x: 800, y: 863 }];
  stepActor(actor, 60, { x: -1, y: 0 });
  assert.equal(actor.path.length, 0);
  assert.equal(actor.facing, -1);
  assert.ok(Math.abs(actor.x - (start.x - 165 * 0.05)) < 1e-6);
  assert.equal(actor.y, start.y);
});
