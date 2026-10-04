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
  WALK_SPEED,
} from '../lib/street';

void test('movement stays on the street, slides along walls and cannot jump between disconnected alleys', () => {
  const original = { x: 851.5, y: 650 };
  const edge = moveWithinStreet(original, -500, 0);
  assert.ok(isWalkable(edge));
  assert.ok(edge.x >= 850.5 && edge.x < 854);
  assert.deepEqual(original, { x: 851.5, y: 650 });
  const slide = moveWithinStreet({ x: 850.5, y: 650 }, -20, 20);
  assert.equal(slide.x, 850.5);
  assert.ok(Math.abs(slide.y - 670) < 1e-6);
  const blocked = moveWithinStreet({ x: 890.5, y: 650 }, 590, 0);
  assert.ok(blocked.x <= 930.5);
  assert.ok(isWalkable(blocked));
  assert.ok(isWalkable(nearestWalkable({ x: Number.NaN, y: Infinity })));
});

void test('click navigation travels through the main street and reaches the opposite alley safely', () => {
  const actor = createStreetActors()[0];
  Object.assign(actor, { x: 620, y: 1160 });
  const destination = { x: 1880, y: 907 };
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
  assert.ok(Math.abs(actor.x - (start.x - WALK_SPEED * 0.05)) < 1e-6);
  assert.equal(actor.y, start.y);
});

void test('walking animation follows movement pace with a bounded cadence and resets at rest', () => {
  for (const rate of [0.4, 1, 2, 4]) {
    const actor = createStreetActors()[0];
    Object.assign(actor, { x: 620, y: 1160 });
    stepActor(actor, 0.05, { x: 1, y: 0 }, WALK_SPEED * rate);
    assert.ok(Math.abs(actor.x - (620 + WALK_SPEED * rate * 0.05)) < 1e-6);
    assert.ok(Math.abs(actor.phase - 0.05 * Math.min(rate, 2)) < 1e-6);
    assert.ok(actor.frame >= 1 && actor.frame <= 3);
    stepActor(actor, 0.05, undefined, WALK_SPEED * rate);
    assert.equal(actor.phase, 0);
    assert.equal(actor.frame, 0);
  }
});
