import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STREET_PARTNERS } from '../lib/fate-cast';
import {
  createEconomy,
  DAILY_BUDGET,
  SUPPLY_PRICES,
} from '../lib/fate-economy';
import {
  advanceDailyLife,
  applyLifePlan,
  createDailyLife,
  decideLife,
  lifeDestination,
  lifeScene,
  parseDailyLife,
  parseLifeScene,
  snapshotLife,
} from '../lib/fate-life';
import { createStreetActors, isWalkable } from '../lib/street';
import { legacyDistrictPositions } from './legacy-district';

void test('v12 progress preserves all 21 residents and initializes only the current day budget', () => {
  const old = createDailyLife();
  old.minutes = 20 * 1440 + 600;
  old.people.medusa.hunger = 71;
  old.people.natalia.choices = 15;
  old.belongings.emiya.notes = 8;
  const legacy = { ...old, version: 12, economy: undefined, positions: legacyDistrictPositions(old.positions) };
  const restored = parseDailyLife(JSON.parse(JSON.stringify(legacy)));
  assert.equal(restored.version, 15);
  assert.deepEqual(restored.people, old.people);
  for (const [id, point] of Object.entries(old.positions)) {
    const moved = restored.positions[id as keyof typeof old.positions];
    if (id !== 'medea' && id !== 'kuzuki') assert.deepEqual(moved, point);
    assert.ok(isWalkable(moved), id);
  }
  assert.deepEqual(restored.belongings, old.belongings);
  for (const id of STREET_PARTNERS) {
    assert.equal(restored.economy.accounts[id].balance, DAILY_BUDGET);
    assert.equal(restored.economy.accounts[id].lastBudgetDay, 20);
    assert.equal(restored.economy.accounts[id].recent.length, 1);
  }
  assert.deepEqual(parseDailyLife(restored), restored);
});

void test('paused time earns nothing; crossing midnight grants one budget and reload does not repeat it', () => {
  const life = createDailyLife();
  life.minutes = 1439.95;
  life.economy = createEconomy(life.minutes);
  const actors = createStreetActors();
  const before = structuredClone(life.economy);
  advanceDailyLife(life, actors, 0.05, {
    running: false,
    speed: 4,
    controlled: null,
  });
  assert.equal(life.minutes, 1439.95);
  assert.deepEqual(life.economy, before);
  advanceDailyLife(life, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: null,
  });
  for (const id of STREET_PARTNERS) {
    assert.equal(life.economy.accounts[id].balance, DAILY_BUDGET * 2);
    assert.equal(life.economy.accounts[id].recent.length, 2);
  }
  const restored = parseDailyLife(snapshotLife(life, actors));
  advanceDailyLife(restored, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: null,
  });
  assert.deepEqual(restored.economy, life.economy);
});

void test('the daily engine charges only a completed shopping action and persists the receipt', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.nextEncounter = life.minutes + 500;
  life.people.rin.choices = 5;
  life.people.rin.activity = {
    kind: 'shop',
    phase: 'doing',
    remaining: 0.01,
    reason: '挑选读物',
    source: 'rules',
  };
  life.belongings.rin.wish = 'book';
  Object.assign(
    actors.find((a) => a.id === 'rin')!,
    lifeDestination('rin', 'shop'),
  );
  advanceDailyLife(life, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: null,
  });
  assert.equal(
    life.economy.accounts.rin.balance,
    DAILY_BUDGET - SUPPLY_PRICES.book,
  );
  assert.equal(life.economy.accounts.rin.lastShopChoice, 5);
  assert.equal(life.belongings.rin.book?.volume, 1);
  assert.equal(life.economy.accounts.rin.recent.at(-1)?.item, 'book');
  const restored = parseDailyLife(snapshotLife(life, actors));
  advanceDailyLife(restored, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: null,
  });
  assert.deepEqual(restored.economy.accounts.rin, life.economy.accounts.rin);
});

void test('taking control cancels shopping before completion without money or item changes', () => {
  const life = createDailyLife();
  life.people.rin.choices = 5;
  life.people.rin.activity = {
    kind: 'shop',
    phase: 'doing',
    remaining: 0.01,
    reason: '挑选读物',
    source: 'rules',
  };
  const before = structuredClone(life.economy.accounts.rin);
  const items = structuredClone(life.belongings.rin);
  advanceDailyLife(life, createStreetActors(), 0.05, {
    running: true,
    speed: 1,
    controlled: 'rin',
  });
  assert.equal(life.people.rin.activity, null);
  assert.deepEqual(life.economy.accounts.rin, before);
  assert.deepEqual(life.belongings.rin, items);
});

void test('current saves reject missing ledgers and future shopping tokens, including a damaged v12 resident', () => {
  const current = createDailyLife();
  assert.throws(() => parseDailyLife({ ...current, economy: undefined }));
  const damaged = structuredClone(current);
  damaged.economy.accounts.rin.lastShopChoice = damaged.people.rin.choices + 1;
  assert.throws(() => parseDailyLife(damaged), /购物记录/);
  const old = { ...current, version: 12, economy: undefined, positions: legacyDistrictPositions(current.positions) };
  Reflect.deleteProperty(old.people, 'medusa');
  assert.throws(() => parseDailyLife(old), /人物状态/);
});

void test('free daily choices and AI context reflect an empty budget without losing needs or belongings', () => {
  const life = createDailyLife();
  life.economy.accounts.medusa.balance = 0;
  life.belongings.medusa.wish = 'book';
  life.people.medusa.hunger = 20;
  life.people.medusa.energy = 90;
  assert.notEqual(decideLife(life, 'medusa').action, 'shop');
  const scene = parseLifeScene(lifeScene(life, 'medusa'));
  assert.match(scene.belongings!.medusa!, /余额 0 生活点/);
  assert.match(scene.belongings!.medusa!, /还没有自购读物/);
  life.people.medusa.hunger = 95;
  assert.equal(decideLife(life, 'medusa').action, 'eat');
});

void test('an AI shopping proposal cannot replace a free plan when the resident has no budget', () => {
  const life = createDailyLife();
  life.economy.accounts.rin.balance = 0;
  life.people.rin.activity = {
    kind: 'read',
    phase: 'going',
    remaining: 35,
    reason: '读公共读物',
    source: 'rules',
  };
  const event = {
    id: life.nextId++,
    minute: life.minutes,
    text: '准备读书',
    decision: {
      person: 'rin' as const,
      action: 'read' as const,
      reason: '读公共读物',
      source: 'rules' as const,
    },
  };
  life.events.push(event);
  const before = structuredClone(life);
  assert.equal(
    applyLifePlan(life, createStreetActors(), event.id, {
      action: 'shop',
      reason: '去买书',
    }),
    false,
  );
  assert.deepEqual(life, before);
});
