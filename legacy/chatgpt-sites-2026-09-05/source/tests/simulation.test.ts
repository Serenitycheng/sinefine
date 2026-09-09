import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, createResident, PLACES, type World } from '../lib/world';
import {
  advance,
  pathBetween,
  startSpecial,
  applyDecisions,
  intervene,
  canPerform,
} from '../lib/simulation';
import { validateWorld } from '../lib/storage';
import { applyRule, parseLocalRule, validatePatch } from '../lib/rules';
test('initial world has 80 unique residents and 20 named Japanese focus characters', () => {
  const w = newWorld();
  assert.equal(w.residents.length, 80);
  assert.equal(w.residents.filter((p) => p.focus).length, 20);
  assert.equal(new Set(w.residents.map((p) => p.id)).size, 80);
  assert.equal(w.residents[0].name, '月見 澪');
  assert.equal(w.special.active, false);
  assert.ok(w.residents.every((p) => p.name.includes(' ')));
  assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w))), w);
});
test('a full year advances actual life, bounded needs, and preserves a valid save', () => {
  const w = newWorld();
  const ages = w.residents.map((p) => p.age);
  advance(w, 360 * 1440);
  for (let i = 0; i < 80; i++) {
    const p = w.residents[i];
    assert.ok(p.age >= ages[i]);
    if (p.alive) assert.ok(Math.abs(p.age - ages[i] - 1) < 0.001);
    for (const key of [
      'health',
      'energy',
      'hunger',
      'mood',
      'mana',
      'magic',
      'talent',
      'dragon',
    ] as const)
      assert.ok(
        Number.isFinite(p[key]) && p[key] >= 0 && p[key] <= 100,
        `${p.name} ${key} ${p[key]}`,
      );
    assert.ok(p.money >= 0);
  }
  assert.ok(w.events.length > 20);
  assert.equal(w.minutes, 480 + 360 * 1440);
  validateWorld(JSON.parse(JSON.stringify(w)));
  console.log(
    'YEAR',
    JSON.stringify({
      alive: w.residents.filter((p) => p.alive).length,
      births: w.stats.births,
      deaths: w.stats.deaths,
      orgs: w.organizations.length,
      events: w.events.length,
      friendships: w.residents.reduce(
        (s, p) => s + Object.values(p.relations).filter((v) => v > 65).length,
        0,
      ),
    }),
  );
});
test('same seed and same step schedule are reproducible', () => {
  const a = newWorld(99),
    b = newWorld(99);
  advance(a, 1440 * 10);
  advance(b, 1440 * 10);
  assert.deepEqual(a, b);
});
test('routes connect every pair of places with walkable waypoints', () => {
  for (const a of PLACES)
    for (const b of PLACES) {
      const route = pathBetween(a, b);
      assert.ok(route.length >= 2);
      assert.deepEqual(route.at(-1), b);
      assert.ok(
        route.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100),
      );
    }
});
test('rule interpretation never silently applies unknown clauses', () => {
  const result = parseLocalRule(
    '施法消耗改为8；诊所免费治疗；所有人都能瞬间移动',
  );
  assert.deepEqual(result.patch, { magicCost: 8, freeHealing: true });
  assert.deepEqual(result.unsupported, ['所有人都能瞬间移动']);
  assert.throws(() => validatePatch({ magicCost: -1 }));
  assert.throws(() => validatePatch({ admin: true }));
  assert.throws(() => validatePatch({ inherit: 55 }));
  const w = newWorld();
  applyRule(w, '税率设为15%', parseLocalRule('税率设为15%').patch);
  assert.equal(w.rules.tax, 0.15);
  assert.equal(w.ruleHistory.length, 1);
});
test('special events honor adult eligibility, preserve rules, and finish at the deadline', () => {
  const w = newWorld();
  w.residents[0].age = 10;
  startSpecial(w, {
    name: '月影约定',
    count: 7,
    duration: 1,
    reward: 80,
    minMagic: 0,
    objective: '合作',
  });
  assert.equal(w.special.participants.length, 7);
  assert.ok(!w.special.participants.includes(w.residents[0].id));
  assert.throws(() => startSpecial(w, {}));
  advance(w, 1440);
  assert.equal(w.special.active, false);
  assert.equal(w.special.finished, true);
  assert.ok(w.special.winner);
  assert.ok(w.events.some((e) => e.text.includes('落幕')));
  validateWorld(JSON.parse(JSON.stringify(w)));
});
test('interventions change real resources and stay within healthy bounds', () => {
  const w = newWorld();
  const p = w.residents[0],
    money = p.money;
  intervene(w, '星币', p.id);
  assert.equal(p.money, money + 100);
  intervene(w, '治愈', p.id);
  assert.equal(p.health, 100);
  const food = w.food;
  intervene(w, '物资');
  assert.equal(w.food, food + 300);
  assert.equal(w.stats.interventions, 3);
  assert.ok(w.events.some((e) => e.source === 'user'));
});
test('AI cannot use nonexistent locations, decide for background characters or force event participation', () => {
  const w = newWorld(),
    p = w.residents[0];
  assert.equal(
    applyDecisions(w, [
      { id: p.id, action: '参与事件', target: 'park', reason: '想参与' },
    ]),
    0,
  );
  assert.equal(
    applyDecisions(w, [
      {
        id: w.residents[30].id,
        action: '工作',
        target: 'market',
        reason: '工作',
      },
    ]),
    0,
  );
  assert.equal(
    applyDecisions(w, [
      { id: p.id, action: '工作', target: 'moon', reason: '飞上月亮' },
    ]),
    0,
  );
  assert.equal(
    applyDecisions(w, [
      {
        id: p.id,
        action: '学习魔法',
        target: 'academy',
        reason: '想学会照顾植物',
      },
    ]),
    1,
  );
  assert.equal(p.source, 'ai');
  assert.ok(p.aiUntil! > w.minutes);
});
test('babies inherit bounded talents without inheriting learned magic; close kin do not become partners', () => {
  const w = newWorld(23),
    a = w.residents[0],
    b = w.residents[1];
  a.age = 25;
  b.age = 26;
  a.partner = b.id;
  b.partner = a.id;
  a.relations[b.id] = 100;
  b.relations[a.id] = 100;
  a.health = 100;
  a.money = 100000;
  b.money = 100000;
  a.empathy = 0.95;
  b.empathy = 0.95;
  for (let i = 0; i < 5 && !a.children.length; i++) advance(w, 360 * 1440);
  assert.ok(w.stats.births > 0);
  const child = w.residents.find((p) => p.parents.includes(a.id));
  assert.ok(child);
  assert.equal(child.parents.length, 2);
  assert.ok(child.talent >= 0 && child.talent <= 100);
  assert.ok(a.children.includes(child.id));
  assert.ok(b.children.includes(child.id));
  assert.ok(child.age < 5);
  assert.equal(child.partner, undefined);
  validateWorld(JSON.parse(JSON.stringify(w)));
});
test('natural aging and death leave traceable memories and update surviving family', () => {
  const w = newWorld();
  const a = w.residents[0],
    b = w.residents[1];
  a.age = 106;
  a.partner = b.id;
  b.partner = a.id;
  advance(w, 1440);
  assert.equal(a.alive, false);
  assert.equal(b.partner, undefined);
  assert.equal(w.stats.deaths, 1);
  assert.ok(
    a.memories.some((id) =>
      w.events.find((e) => e.id === id)?.text.includes('自然衰老'),
    ),
  );
});
test('malformed saves fail before replacing live state', () => {
  const w = newWorld();
  assert.throws(() => validateWorld({}));
  const bad = JSON.parse(JSON.stringify(w));
  bad.residents[0].relations = null;
  assert.throws(() => validateWorld(bad));
  const bad2 = JSON.parse(JSON.stringify(w));
  bad2.special.scores = { x: 'invalid' };
  assert.throws(() => validateWorld(bad2));
  assert.equal(w.residents.length, 80);
});
test('work, rest, healing and training respect physical locations', () => {
  const p = newWorld().residents[0];
  assert.equal(canPerform(p, '工作', 'park'), false);
  assert.equal(canPerform(p, '治疗', 'cafe'), false);
  assert.equal(canPerform(p, '休息', p.home), true);
  assert.equal(canPerform(p, '学习魔法', 'academy'), true);
});
test('children mature on the 360th day with an adult occupation and new goal', () => {
  const w = newWorld();
  const p = w.residents[0];
  p.age = 17;
  p.job = '学生';
  p.goal = '在照料与陪伴中长大。';
  advance(w, 360 * 1440);
  assert.equal(p.age, 18);
  assert.notEqual(p.job, '学生');
  assert.notEqual(p.goal, '在照料与陪伴中长大。');
  assert.ok(
    w.events.some((e) => e.people.includes(p.id) && e.text.includes('成年了')),
  );
});
