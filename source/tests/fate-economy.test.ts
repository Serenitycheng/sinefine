import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STREET_PARTNERS, type PartnerId } from '../lib/fate-cast';
import {
  advanceEconomy,
  canAfford,
  createEconomy,
  DAILY_BUDGET,
  economySummary,
  MAX_BALANCE,
  MAX_ECONOMY_ENTRIES,
  parseEconomy,
  purchaseSupply,
  SUPPLY_PRICES,
} from '../lib/fate-economy';
import {
  belongingsPlan,
  finishInterest,
  shoppingChoice,
  type ItemEvent,
} from '../lib/fate-belongings';
import {
  advanceDailyLife,
  createDailyLife,
  decideLife,
  parseDailyLife,
  snapshotLife,
} from '../lib/fate-life';
import { createStreetActors } from '../lib/street';
import { homeOf } from '../lib/fate-housing';

void test('21 residents receive separate integer game budgets on the current day only', () => {
  const minutes = 1440 * 250 + 800;
  const economy = createEconomy(minutes);
  assert.equal(Object.keys(economy.accounts).length, 21);
  for (const id of STREET_PARTNERS) {
    assert.equal(economy.accounts[id].balance, DAILY_BUDGET);
    assert.equal(economy.accounts[id].lastBudgetDay, 250);
    assert.equal(economy.accounts[id].recent.length, 1);
    assert.equal(economy.accounts[id].recent[0].minute, minutes);
    assert.match(economySummary(economy, id), /游戏设定，非真实物价/);
  }
  purchaseSupply(economy, 'emiya', 'book', minutes, 1);
  assert.equal(
    economy.accounts.emiya.balance,
    DAILY_BUDGET - SUPPLY_PRICES.book,
  );
  assert.equal(economy.accounts.shirou.balance, DAILY_BUDGET);
  assert.notEqual(economy.accounts.emiya, economy.accounts.shirou);
});

void test('one new day grants one allowance and parsing or refreshing never grants it again', () => {
  const economy = createEconomy(1439);
  advanceEconomy(economy, 1439.9);
  assert.equal(economy.accounts.rin.balance, DAILY_BUDGET);
  advanceEconomy(economy, 1440);
  assert.equal(economy.accounts.rin.balance, DAILY_BUDGET * 2);
  const loaded = parseEconomy(JSON.parse(JSON.stringify(economy)), 1440);
  const before = structuredClone(loaded);
  advanceEconomy(loaded, 1440);
  advanceEconomy(loaded, 2000);
  assert.deepEqual(loaded, before);
  assert.deepEqual(parseEconomy(loaded, 2000), before);
  // A jump or an old save does not accumulate unplayed days as income.
  advanceEconomy(loaded, 1440 * 20);
  assert.equal(loaded.accounts.rin.balance, DAILY_BUDGET * 3);
  assert.equal(loaded.accounts.rin.lastBudgetDay, 20);
});

void test('successful and insufficient shopping completions cannot be retried after loading', () => {
  let economy = createEconomy(980);
  assert.equal(purchaseSupply(economy, 'sakura', 'book', 980, 1), 'bought');
  assert.equal(purchaseSupply(economy, 'sakura', 'paper', 980, 1), 'duplicate');
  economy = parseEconomy(economy, 980);
  assert.equal(purchaseSupply(economy, 'sakura', 'parts', 980, 1), 'duplicate');
  assert.equal(economy.accounts.sakura.balance, 70);
  assert.equal(economy.accounts.sakura.recent.length, 2);
  for (let choice = 2; choice <= 6; choice++)
    assert.equal(
      purchaseSupply(economy, 'sakura', 'paper', 980, choice),
      'bought',
    );
  assert.equal(economy.accounts.sakura.balance, 10);
  const before = structuredClone(economy.accounts.sakura.recent);
  assert.equal(canAfford(economy, 'sakura', 'paper'), false);
  assert.equal(
    purchaseSupply(economy, 'sakura', 'paper', 980, 7),
    'insufficient',
  );
  assert.equal(economy.accounts.sakura.balance, 10);
  assert.deepEqual(economy.accounts.sakura.recent, before);
  economy = parseEconomy(economy, 980);
  advanceEconomy(economy, 1440);
  assert.equal(
    purchaseSupply(economy, 'sakura', 'paper', 1440, 7),
    'duplicate',
  );
  assert.equal(purchaseSupply(economy, 'sakura', 'paper', 1440, 8), 'bought');
});

void test('long-running budgets remain capped and the bounded ledger remains reloadable', () => {
  const economy = createEconomy(0);
  for (let day = 1; day <= 10000; day++) advanceEconomy(economy, day * 1440);
  for (const id of STREET_PARTNERS) {
    assert.equal(economy.accounts[id].balance, MAX_BALANCE);
    assert.equal(economy.accounts[id].recent.length, MAX_ECONOMY_ENTRIES);
  }
  const loaded = parseEconomy(economy, 10000 * 1440);
  purchaseSupply(loaded, 'rin', 'book', 10000 * 1440, 1);
  advanceEconomy(loaded, 10000 * 1440);
  assert.equal(loaded.accounts.rin.balance, MAX_BALANCE - SUPPLY_PRICES.book);
  advanceEconomy(loaded, 10001 * 1440);
  assert.equal(loaded.accounts.rin.balance, MAX_BALANCE);
  assert.equal(loaded.accounts.rin.recent.at(-1)!.amount, SUPPLY_PRICES.book);
  assert.deepEqual(parseEconomy(loaded, 10001 * 1440), loaded);
});

void test('damaged or contradictory balances, receipts and daily markers are rejected without mutation', () => {
  const economy = createEconomy(980);
  purchaseSupply(economy, 'rin', 'book', 990, 1);
  advanceEconomy(economy, 1440);
  const cases: ((value: typeof economy) => void)[] = [
    (v) => {
      delete (v.accounts as Partial<typeof v.accounts>).medusa;
    },
    (v) => {
      v.accounts.rin.balance = -1;
    },
    (v) => {
      v.accounts.rin.balance = 12.5;
    },
    (v) => {
      v.accounts.rin.balance += 1;
    },
    (v) => {
      v.accounts.rin.lastBudgetDay = 2;
    },
    (v) => {
      v.accounts.rin.lastBudgetDay = 0;
    },
    (v) => {
      v.accounts.rin.lastShopChoice = null;
    },
    (v) => {
      v.accounts.rin.recent[1].amount = -1;
    },
    (v) => {
      v.accounts.rin.recent[1].item = 'paper';
    },
    (v) => {
      v.accounts.rin.recent[1].choice = 2;
    },
    (v) => {
      v.accounts.rin.recent[1].minute = 970;
    },
    (v) => {
      v.accounts.rin.recent[2].minute = 1441;
    },
    (v) => {
      v.accounts.rin.recent[2].minute = 1000;
    },
    (v) => {
      v.accounts.rin.recent[2].item = 'book';
    },
    (v) => {
      v.accounts.rin.recent = [];
    },
    (v) => {
      v.accounts.rin.recent = Array(MAX_ECONOMY_ENTRIES + 1).fill(
        v.accounts.rin.recent[0],
      );
    },
  ];
  for (const mutate of cases) {
    const broken = structuredClone(economy);
    mutate(broken);
    const before = structuredClone(broken);
    assert.throws(() => parseEconomy(broken, 1440));
    assert.deepEqual(broken, before);
  }
  assert.throws(() => parseEconomy(undefined, 1440));
  assert.throws(() => createEconomy(Number.NaN));
});

function activeShop(id: PartnerId = 'medusa') {
  const life = createDailyLife();
  const actors = createStreetActors();
  life.minutes = 1000;
  life.nextEncounter = 1200;
  for (const other of STREET_PARTNERS) {
    life.people[other].activity = {
      kind: 'sleep',
      phase: 'doing',
      remaining: 100,
      home: homeOf(other, life.housing),
      reason: '正在休息。',
      source: 'rules',
    };
  }
  life.belongings[id].wish = 'book';
  life.people[id].choices = 1;
  life.people[id].activity = {
    kind: 'shop',
    phase: 'doing',
    remaining: 0.05,
    reason: '挑选读物。',
    source: 'rules',
  };
  return { life, actors };
}

void test('the real shopping completion charges once, grants its item and survives reload', () => {
  const { life, actors } = activeShop();
  advanceDailyLife(life, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: 'admin',
  });
  assert.equal(
    life.economy.accounts.medusa.balance,
    DAILY_BUDGET - SUPPLY_PRICES.book,
  );
  assert.equal(life.belongings.medusa.book?.topic, 'medusa');
  assert.equal(life.belongings.medusa.next, 'read');
  assert.equal(life.people.medusa.activity, null);
  const loaded = parseDailyLife(snapshotLife(life, actors));
  const before = structuredClone(loaded);
  finishInterest(loaded, 'medusa', 'shop', () =>
    assert.fail('duplicate completion logged'),
  );
  assert.deepEqual(loaded, before);
  advanceDailyLife(loaded, actors, 0.05, {
    running: true,
    speed: 1,
    controlled: 'admin',
  });
  assert.equal(
    loaded.economy.accounts.medusa.balance,
    DAILY_BUDGET - SUPPLY_PRICES.book,
  );
  assert.equal(loaded.people.medusa.activity?.kind, 'read');
});

void test('walking, pausing or taking control before completion never spends a shopping budget', () => {
  for (const mode of ['walking', 'paused', 'controlled'] as const) {
    const { life, actors } = activeShop();
    if (mode === 'walking') life.people.medusa.activity!.phase = 'going';
    advanceDailyLife(life, actors, 0.05, {
      running: mode !== 'paused',
      speed: 1,
      controlled: mode === 'controlled' ? 'medusa' : 'admin',
    });
    assert.equal(life.economy.accounts.medusa.balance, DAILY_BUDGET);
    assert.equal(life.economy.accounts.medusa.lastShopChoice, null);
    assert.equal(life.belongings.medusa.book, null);
  }
});

void test('an unaffordable wish stays available for later without items, debt or forced repeat shopping', () => {
  const { life } = activeShop();
  for (let choice = 1; choice <= 8; choice++)
    purchaseSupply(life.economy, 'medusa', 'paper', life.minutes, choice);
  life.people.medusa.choices = 9;
  const beforeItems = structuredClone(life.belongings.medusa);
  const receipts = life.economy.accounts.medusa.recent.length;
  const logs: ItemEvent[] = [];
  finishInterest(life, 'medusa', 'shop', (_text, event) => logs.push(event));
  assert.deepEqual(life.belongings.medusa, beforeItems);
  assert.equal(life.economy.accounts.medusa.balance, 4);
  assert.equal(life.economy.accounts.medusa.recent.length, receipts);
  assert.equal(logs[0].kind, 'browsed');
  assert.equal(belongingsPlan(life, 'medusa'), undefined);
  assert.notEqual(decideLife(life, 'medusa').action, 'shop');
  life.people.medusa.hunger = 80;
  assert.equal(decideLife(life, 'medusa').action, 'eat');
  life.minutes = 1440 + 500;
  advanceEconomy(life.economy, life.minutes);
  assert.equal(belongingsPlan(life, 'medusa')?.action, 'shop');
});

void test('cheaper useful supplies remain purchasable without erasing an expensive book wish', () => {
  const { life } = activeShop();
  for (let choice = 1; choice <= 7; choice++)
    purchaseSupply(life.economy, 'medusa', 'paper', life.minutes, choice);
  life.people.medusa.choices = 8;
  assert.equal(life.economy.accounts.medusa.balance, 16);
  assert.equal(shoppingChoice(life, 'medusa'), 'paper');
  finishInterest(life, 'medusa', 'shop', () => {});
  assert.equal(life.belongings.medusa.paper, 2);
  assert.equal(life.belongings.medusa.book, null);
  assert.equal(life.belongings.medusa.wish, 'book');
  assert.equal(life.economy.accounts.medusa.balance, 4);
});
