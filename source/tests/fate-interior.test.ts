import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interiorResidents, interiorZone } from '../lib/fate-interior';
import { createDailyLife, type LifePerson } from '../lib/fate-life';

function activity(
  values: Partial<NonNullable<LifePerson['activity']>> = {},
): NonNullable<LifePerson['activity']> {
  return {
    kind: 'rest',
    phase: 'doing',
    remaining: 25,
    source: 'rules',
    reason: '在家休息一会儿。',
    ...values,
  };
}

void test('an interior is a read-only view of actual presence, including visitors but not moving or sleeping elsewhere', () => {
  const life = createDailyLife();
  life.people.shirou.activity = activity({ kind: 'cook', home: 'emiya' });
  life.people.saber.activity = activity({
    kind: 'eat',
    phase: 'going',
    home: 'emiya',
  });
  life.people.kiritsugu.activity = activity({ kind: 'visit', home: 'emiya' });
  life.people.irisviel.activity = activity({ kind: 'sleep', home: 'einzbern' });
  const before = structuredClone(life);
  const people = interiorResidents(life, 'emiya');
  assert.deepEqual(
    people
      .filter((person) => person.presence === 'inside')
      .map((person) => person.id)
      .sort(),
    ['kiritsugu', 'shirou'],
  );
  assert.equal(
    people.find((person) => person.id === 'kiritsugu')?.visitor,
    true,
  );
  assert.equal(
    people.find((person) => person.id === 'saber')?.presence,
    'arriving',
  );
  assert.ok(!people.some((person) => person.id === 'irisviel'));
  const otherHome = interiorResidents(life, 'einzbern');
  assert.equal(
    otherHome.find((person) => person.id === 'kiritsugu')?.presence,
    'away',
  );
  assert.equal(
    otherHome.find((person) => person.id === 'irisviel')?.zone,
    'rest',
  );
  assert.deepEqual(
    life,
    before,
    'switching the observed home must not move people or alter their plans',
  );
});

void test('school attendance and a controlled resident never appear in a room even if a previous home activity remains in the published view', () => {
  const life = createDailyLife();
  life.people.rin.activity = activity({ kind: 'study', school: true });
  life.people.tokiomi.activity = activity({ kind: 'study', home: 'tohsaka' });
  const residents = interiorResidents(life, 'tohsaka', 'tokiomi');
  assert.equal(
    residents.find((person) => person.id === 'rin')?.presence,
    'away',
  );
  assert.equal(
    residents.find((person) => person.id === 'tokiomi')?.presence,
    'controlled',
  );
  assert.ok(!residents.some((person) => person.presence === 'inside'));
});

void test('household membership follows sisters and servant housing while preserving a guest actual location', () => {
  const life = createDailyLife();
  life.housing.sistersTogether = true;
  life.people.sakura.activity = activity({ kind: 'study' });
  life.people.medusa.activity = activity({ kind: 'visit', home: 'emiya' });
  const home = interiorResidents(life, 'tohsaka');
  assert.equal(
    home.find((person) => person.id === 'sakura')?.presence,
    'inside',
  );
  assert.equal(home.find((person) => person.id === 'medusa')?.presence, 'away');
  assert.ok(
    !interiorResidents(life, 'matou').some((person) => person.id === 'sakura'),
  );
  assert.equal(
    interiorResidents(life, 'emiya').find((person) => person.id === 'medusa')
      ?.visitor,
    true,
  );
});

void test('table, study, rest and lounge show the current activity and a waiting diner keeps the waiting status', () => {
  for (const [kind, expected] of [
    ['eat', 'table'],
    ['cook', 'table'],
    ['study', 'study'],
    ['read', 'study'],
    ['sleep', 'rest'],
    ['rest', 'rest'],
    ['visit', 'lounge'],
  ] as const)
    assert.equal(interiorZone(activity({ kind })), expected);
  const life = createDailyLife();
  life.people.shirou.activity = activity({
    kind: 'eat',
    home: 'emiya',
    meal: 'waiting-meal',
    waiting: true,
  });
  const person = interiorResidents(life, 'emiya').find(
    (item) => item.id === 'shirou',
  )!;
  assert.equal(person.presence, 'inside');
  assert.equal(person.zone, 'table');
  assert.match(person.status, /等饭做好/);
});
