import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DISTRICT_PLACES } from '../lib/fate-district';
import {
  createDailyLife,
  parseDailyLife,
  snapshotLife,
} from '../lib/fate-life';
import { visitPublicPlace } from '../lib/fate-public-places';
import { currentBond } from '../lib/fate-social';
import { createStreetActors, nearestWalkable } from '../lib/street';
import {
  advancePublicOutings,
  cancelPublicOuting,
  choosePublicOuting,
  currentPublicOuting,
  interactPublicOuting,
  publicOutingPoint,
} from '../lib/fate-public-outings';

void test('four public places change daily state and survive a save reload', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  const rin = actors.find((actor) => actor.id === 'rin')!;
  const move = (place: keyof typeof DISTRICT_PLACES) =>
    Object.assign(rin, nearestWalkable(DISTRICT_PLACES[place]));

  move('school');
  life.belongings.rin.paper = 1;
  assert.equal(
    visitPublicPlace(life, actors, 'rin', 'school', 'study').ok,
    true,
  );
  assert.equal(life.belongings.rin.paper, 0);
  assert.equal(life.belongings.rin.notes, 1);
  assert.equal(life.events.at(-1)?.publicVisit?.place, 'school');

  move('cafe');
  life.people.rin.hunger = 80;
  const balance = life.economy.accounts.rin.balance;
  assert.equal(visitPublicPlace(life, actors, 'rin', 'cafe', 'eat').ok, true);
  assert.equal(life.people.rin.hunger, 80);
  assert.equal(currentPublicOuting(life, 'rin')?.order, 'set-meal');
  life.minutes += 3;
  advancePublicOutings(life, actors, 'rin', 3);
  assert.equal(choosePublicOuting(life, actors, 'rin', 'quick').ok, true);
  life.minutes += 3;
  advancePublicOutings(life, actors, 'rin', 3);
  assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
  assert.equal(life.people.rin.hunger, 50);
  assert.equal(life.economy.accounts.rin.balance, balance);

  move('shops');
  assert.equal(visitPublicPlace(life, actors, 'rin', 'shops', 'shop').ok, true);
  const receipt = life.economy.accounts.rin.recent.at(-1)!;
  assert.equal(receipt.kind, 'purchase');
  assert.equal(life.economy.accounts.rin.balance, balance + receipt.amount);
  assert.equal(life.events.at(-1)?.item?.kind, 'bought');

  move('park');
  const shirou = actors.find((actor) => actor.id === 'shirou')!;
  Object.assign(shirou, nearestWalkable(DISTRICT_PLACES.park));
  assert.equal(visitPublicPlace(life, actors, 'rin', 'park', 'walk').ok, true);
  assert.equal(currentPublicOuting(life, 'rin')?.kind, 'river');
  assert.equal(currentBond(life, 'rin', 'shirou'), undefined);
  assert.equal(cancelPublicOuting(life, 'rin', actors).ok, true);
  assert.equal(
    visitPublicPlace(life, actors, 'rin', 'park', 'together', 'shirou').ok,
    true,
  );
  assert.equal(currentBond(life, 'rin', 'shirou'), undefined);
  for (const step of [0, 1]) {
    const point = publicOutingPoint(currentPublicOuting(life, 'rin')!);
    Object.assign(rin, point);
    Object.assign(shirou, point);
    life.minutes += 1;
    advancePublicOutings(life, actors, 'rin', 1);
    assert.equal(interactPublicOuting(life, actors, 'rin').ok, true);
    if (step === 0)
      assert.equal(choosePublicOuting(life, actors, 'rin', 'wait').ok, true);
  }
  assert.equal(
    currentBond(life, 'rin', 'shirou')?.memories.at(-1)?.kind,
    'fulfilled',
  );

  const restored = parseDailyLife(snapshotLife(life, actors));
  assert.deepEqual(restored.events, life.events);
  assert.deepEqual(restored.economy, life.economy);
  assert.deepEqual(restored.bonds, life.bonds);
  assert.deepEqual(restored.publicOutings, life.publicOutings);
  assert.equal(restored.belongings.rin.notes, 1);
});

void test('distance, companion presence and repeat checks prevent false visits', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  const rin = actors.find((actor) => actor.id === 'rin')!;
  Object.assign(rin, nearestWalkable(DISTRICT_PLACES.cafe));
  const before = structuredClone(life);
  assert.equal(
    visitPublicPlace(life, actors, 'rin', 'school', 'study').ok,
    false,
  );
  assert.equal(
    visitPublicPlace(life, actors, 'admin', 'cafe', 'eat').ok,
    false,
  );
  assert.deepEqual(life, before);
  assert.equal(visitPublicPlace(life, actors, 'rin', 'cafe', 'eat').ok, true);
  const count = life.events.length;
  assert.equal(visitPublicPlace(life, actors, 'rin', 'cafe', 'eat').ok, false);
  assert.equal(life.events.length, count);
  Object.assign(rin, nearestWalkable(DISTRICT_PLACES.park));
  assert.equal(
    visitPublicPlace(life, actors, 'rin', 'park', 'together', 'shirou').ok,
    false,
  );
  assert.equal(life.events.length, count);
});
