import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOKS, bookTopic, finishInterest } from '../lib/fate-belongings';
import {
  FATE_CAST,
  LEGACY_STREET_PARTNERS,
  STREET_PARTNERS,
  type PartnerId,
} from '../lib/fate-cast';
import { lifeRoutine } from '../lib/fate-habits';
import { homeOf } from '../lib/fate-housing';
import {
  advanceDailyLife,
  createDailyLife,
  LIFE_ACTIONS,
  lifeDestination,
  lifeScene,
  parseDailyLife,
  parseLifeScene,
  snapshotLife,
  type LifeAction,
} from '../lib/fate-life';
import { dutyIds } from '../lib/fate-schedule';
import { parseSocialEffects, rememberEncounter } from '../lib/fate-social';
import {
  createStreetActors,
  isWalkable,
  migrateCityPoint,
} from '../lib/street';
import { cityPoint } from '../lib/fate-district';
import { legacyDistrictPositions } from './legacy-district';

const newcomers = [
  'gilgamesh',
  'medusa',
  'tokiomi',
  'kirei',
  'kariya',
  'emiya',
  'natalia',
] as const;

function legacySave(version: number) {
  const life = createDailyLife();
  const count = [2, 4, 6, 8, 11, 12][version - 1] ?? 14;
  const ids = LEGACY_STREET_PARTNERS.slice(0, count);
  life.people.rin.hunger = 42;
  life.positions.rin = { x: 700, y: 850 };
  life.belongings.rin.paper = 3;
  life.belongings.rin.notes = 7;
  return {
    ...life,
    version,
    people: Object.fromEntries(ids.map((id) => [id, life.people[id]])),
    positions: legacyDistrictPositions(
      Object.fromEntries(
        ['admin' as const, ...ids].map((id) => [id, life.positions[id]]),
      ),
    ),
    belongings: Object.fromEntries(
      LEGACY_STREET_PARTNERS.map((id) => [id, life.belongings[id]]),
    ),
  };
}

void test('all 21 configured residents have individual daily states, belongings and walkable destinations', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  assert.equal(STREET_PARTNERS.length, 21);
  assert.deepEqual(
    [...STREET_PARTNERS].sort(),
    FATE_CAST.map((p) => p.id).sort(),
  );
  assert.equal(life.version, 16);
  assert.equal(actors.length, 22);
  assert.deepEqual(
    Object.keys(life.people).sort(),
    [...STREET_PARTNERS].sort(),
  );
  assert.deepEqual(
    Object.keys(life.belongings).sort(),
    [...STREET_PARTNERS].sort(),
  );
  for (const id of STREET_PARTNERS) {
    assert.ok(actors.some((a) => a.id === id));
    assert.ok(isWalkable(life.positions[id]), id);
    for (const kind of Object.keys(LIFE_ACTIONS) as LifeAction[]) {
      const home =
        LIFE_ACTIONS[kind].place === 'home'
          ? homeOf(id, life.housing)
          : undefined;
      assert.ok(isWalkable(lifeDestination(id, kind, home)), `${id}:${kind}`);
    }
  }
  life.people.medusa.hunger = 90;
  life.belongings.medusa.paper = 2;
  assert.notEqual(life.people.sakura.hunger, 90);
  assert.equal(life.belongings.sakura.paper, 0);
  assert.deepEqual(parseDailyLife(life), life);
});

void test('early daily-life schemas upgrade to v16 while preserving their recorded residents', () => {
  const defaults = createDailyLife();
  for (let version = 1; version <= 11; version++) {
    const saved = legacySave(version);
    const migrated = parseDailyLife(JSON.parse(JSON.stringify(saved)));
    assert.equal(migrated.version, 16);
    assert.equal(migrated.minutes, saved.minutes);
    for (const [id, person] of Object.entries(saved.people)) {
      assert.deepEqual(
        migrated.people[id as PartnerId],
        person,
        `v${version}:${id}`,
      );
      assert.ok(
        Math.hypot(
          migrated.positions[id as PartnerId].x -
            migrateCityPoint(cityPoint(saved.positions[id])).x,
          migrated.positions[id as PartnerId].y -
            migrateCityPoint(cityPoint(saved.positions[id])).y,
        ) < 1e-9,
      );
    }
    for (const id of newcomers) {
      assert.deepEqual(migrated.people[id], defaults.people[id]);
      assert.deepEqual(migrated.positions[id], defaults.positions[id]);
      assert.deepEqual(migrated.belongings[id], defaults.belongings[id]);
    }
    if (version >= 10) {
      assert.equal(migrated.belongings.rin.paper, 3);
      assert.equal(migrated.belongings.rin.notes, 7);
    }
    assert.deepEqual(parseDailyLife(migrated), migrated);
  }
});

void test('v11 migration retains existing relationship memories and a pending appointment', () => {
  const life = createDailyLife();
  const turns = [
    { speaker: 'rin' as const, text: '一小时后在林荫路边一起散步吧。' },
    { speaker: 'shirou' as const, text: '好，约好了。' },
  ];
  const event = {
    id: life.nextId++,
    minute: life.minutes,
    text: '约好一起散步。',
    dialogue: {
      speaker: 'rin' as const,
      target: 'shirou' as const,
      message: turns[0].text,
      reply: turns[1].text,
      source: 'preset' as const,
    },
  };
  life.events.push(event);
  life.lastEncounters['rin|shirou'] = life.minutes;
  rememberEncounter(
    life,
    event,
    parseSocialEffects(
      {
        impressions: [],
        promise: {
          activity: 'walk',
          delay: 60,
          proposal: 0,
          acceptance: 1,
          proposalQuote: turns[0].text,
          acceptanceQuote: turns[1].text,
        },
      },
      turns,
    ),
  );
  const saved = {
    ...legacySave(11),
    bonds: life.bonds,
    appointments: life.appointments,
    events: life.events,
    nextId: life.nextId,
    lastEncounters: life.lastEncounters,
  };
  const migrated = parseDailyLife(saved);
  assert.deepEqual(migrated.bonds, life.bonds);
  assert.deepEqual(migrated.appointments, life.appointments);
  assert.equal(migrated.appointments[0].status, 'pending');
  assert.deepEqual(migrated.events, life.events);
  assert.equal(
    Object.values(migrated.bonds).some((b) =>
      newcomers.some((id) => b.a === id || b.b === id),
    ),
    false,
  );
});

void test('current saves never treat missing or damaged new-resident state as an older save to repair silently', () => {
  for (const id of newcomers) {
    for (const field of ['people', 'positions', 'belongings'] as const) {
      const corrupted = createDailyLife();
      Reflect.deleteProperty(corrupted[field], id);
      assert.throws(() => parseDailyLife(corrupted), `${field}:${id}`);
    }
    const badPerson = createDailyLife();
    badPerson.people[id].energy = -1;
    assert.throws(() => parseDailyLife(badPerson));
    const badPosition = createDailyLife();
    badPosition.positions[id] = { x: 0, y: 0 };
    assert.throws(() => parseDailyLife(badPosition));
    const badItem = createDailyLife();
    badItem.belongings[id].paper = 9;
    assert.throws(() => parseDailyLife(badItem));
  }
  assert.throws(() => parseDailyLife({ ...createDailyLife(), version: 17 }));
});

void test('new residents have their own reading choices and motivations without borrowing school roles', () => {
  const life = createDailyLife();
  const books = new Set<string>();
  const motivations = new Set<string>();
  for (const id of newcomers) {
    assert.equal(bookTopic(id, 'young'), id);
    books.add(BOOKS[id]);
    const routine = lifeRoutine(id);
    assert.ok(routine.habits.length > 60);
    motivations.add(routine.reasons.read);
    assert.deepEqual(dutyIds(id, 'young'), []);
    life.belongings[id].wish = 'book';
    finishInterest(life, id, 'shop', () => {});
    assert.equal(life.belongings[id].book?.topic, id);
    assert.equal(life.belongings[id].next, 'read');
  }
  assert.equal(books.size, newcomers.length);
  assert.equal(motivations.size, newcomers.length);
  assert.ok(
    lifeRoutine('emiya').weights.cook > lifeRoutine('gilgamesh').weights.cook,
  );
  assert.ok(
    lifeRoutine('medusa').weights.read > lifeRoutine('medusa').weights.repair,
  );
  assert.ok(
    lifeRoutine('natalia').weights.repair >
      lifeRoutine('natalia').weights.study,
  );
  assert.deepEqual(parseDailyLife(life), life);
});

void test('AI scene context includes the seven additions and supports all 20 relationship partners', () => {
  const life = createDailyLife();
  const scene = lifeScene(life, 'medusa');
  for (const id of newcomers) assert.equal(scene[id], '决定接下来做什么');
  assert.deepEqual(parseLifeScene(scene), scene);
  const fullSocial = STREET_PARTNERS.filter((id) => id !== 'medusa').map(
    (person) => ({ person, state: '保留既有关系。', memories: [] }),
  );
  assert.equal(
    parseLifeScene({ ...scene, social: fullSocial }).social?.length,
    20,
  );
  const oldScene = parseLifeScene({
    minutes: 980,
    place: 'street',
    saber: '散步',
    rin: '看书',
  });
  for (const id of newcomers) assert.equal(oldScene[id], '尚未记录');
  assert.throws(() => parseLifeScene({ ...scene, natalia: 123 }));
});

void test('a full set of resident relationships and both Waver eras can be saved and restored', () => {
  const life = createDailyLife();
  for (const stage of ['young', 'adult'] as const) {
    life.waverStage = stage;
    for (let first = 0; first < STREET_PARTNERS.length; first++) {
      for (const target of STREET_PARTNERS.slice(first + 1)) {
        const speaker = STREET_PARTNERS[first];
        if (stage === 'adult' && speaker !== 'waver' && target !== 'waver')
          continue;
        rememberEncounter(life, {
          id: life.nextId++,
          minute: life.minutes,
          text: '一起沿街走了一段。',
          waverStage: stage,
          dialogue: {
            speaker,
            target,
            message: '一起走一会儿。',
            reply: '好，慢慢来。',
            source: 'preset',
          },
        });
      }
    }
  }
  assert.equal(Object.keys(life.bonds).length, 230);
  assert.equal(lifeScene(life, 'rin').social?.length, 20);
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(life))), life);
});

void test('all new residents autonomously progress through a complete day and remain reloadable', () => {
  const life = createDailyLife();
  const actors = createStreetActors();
  for (let frame = 0; frame < 4200; frame++) {
    advanceDailyLife(life, actors, 0.05, {
      running: true,
      speed: 4,
      controlled: 'admin',
    });
  }
  assert.ok(life.minutes > 1440 + 980);
  for (const id of newcomers) {
    assert.ok(life.people[id].choices >= 3, id);
    assert.ok(isWalkable(actors.find((a) => a.id === id)!), id);
    assert.ok(life.people[id].hunger >= 0 && life.people[id].hunger <= 100, id);
    assert.ok(life.people[id].energy >= 0 && life.people[id].energy <= 100, id);
  }
  const saved = snapshotLife(life, actors);
  assert.deepEqual(parseDailyLife(JSON.parse(JSON.stringify(saved))), saved);
});
