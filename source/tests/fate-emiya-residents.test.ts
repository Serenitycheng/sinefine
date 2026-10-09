import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SABER_WALK_SPRITES,
  SABER_LIFE_SPRITES,
} from '../lib/fate-emiya-actions';
import {
  createEmiyaLifeSave,
  EmiyaLifeSession,
  parseEmiyaLifeSave,
} from '../lib/fate-emiya-life';
import {
  EmiyaResidents,
  parseEmiyaResidents,
} from '../lib/fate-emiya-residents';
import {
  EMIYA_ENTRY,
  EMIYA_ROOMS,
  EMIYA_ACTIVITIES,
  emiyaRoomDoors,
  emiyaHouseRoute,
  emiyaAdvanceRoute,
  type EmiyaLocation,
} from '../lib/fate-emiya-house';
import {
  lifeDestination,
  encounterDialogue,
  type LifeAction,
} from '../lib/fate-life';
import { interiorWalkable } from '../lib/fate-city-interior-navigation';
import { bondKey } from '../lib/fate-social';
import { STREET_PARTNERS } from '../lib/fate-cast';

function fixture(kind: LifeAction = 'study') {
  const save = createEmiyaLifeSave();
  save.running = false;
  save.life.people.saber.activity = {
    kind,
    home: 'emiya',
    phase: 'doing',
    remaining: 30,
    source: 'rules',
    reason: '正在家里安排日常。',
  };
  save.life.positions.saber = lifeDestination('saber', kind, 'emiya');
  return save;
}
const close = (a: EmiyaLocation, b: EmiyaLocation) =>
  a.room === b.room
    ? Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y)
    : Infinity;

void test('physical residents follow actual presence, not assigned housing, and retain a visitor identity', () => {
  const save = fixture();
  save.life.people.sakura.activity = {
    kind: 'visit',
    home: 'emiya',
    phase: 'doing',
    remaining: 30,
    source: 'rules',
    reason: '来卫宫宅坐坐。',
  };
  save.life.positions.sakura = lifeDestination('sakura', 'visit', 'emiya');
  const house = new EmiyaResidents(save.life, EMIYA_ENTRY);
  assert.deepEqual(
    house
      .all()
      .map((body) => body.id)
      .sort(),
    ['saber', 'sakura'],
  );
  assert.equal(
    house.all().some((body) => body.id === 'shirou'),
    false,
  );
  assert.equal(
    house.all().some((body) => body.id === 'taiga'),
    false,
  );
});

void test('a change of activity crosses real doors continuously and never jumps between room contacts', () => {
  const save = fixture();
  const house = new EmiyaResidents(save.life, EMIYA_ENTRY);
  save.life.people.saber.activity!.kind = 'eat';
  const rooms = [house.all()[0].room];
  for (let step = 0; step < 1800; step++) {
    const before = structuredClone(house.save()[0]);
    house.step(save.life, EMIYA_ENTRY, 0.05);
    const body = house.all()[0];
    assert.ok(interiorWalkable(body.point, EMIYA_ROOMS[body.room].scene));
    if (body.room === before.room)
      assert.ok(close(before, body) <= 7.25 + 1e-6);
    else {
      assert.ok(
        emiyaRoomDoors(before.room).some((door) => door.to === body.room),
      );
      rooms.push(body.room);
    }
    if (body.room === 'table' && body.phase === 'doing') break;
  }
  assert.deepEqual(rooms, ['study', 'table']);
  assert.equal(house.all()[0].phase, 'doing');
});

void test('leaving residents walk to the front gate before their body disappears', () => {
  const save = fixture();
  const house = new EmiyaResidents(save.life, EMIYA_ENTRY);
  save.life.people.saber.activity = null;
  const player = { room: 'garden' as const, point: { x: 500, y: 560 } };
  const rooms: string[] = [];
  for (let step = 0; step < 2400 && house.all().length; step++) {
    rooms.push(house.all()[0].room);
    house.step(save.life, player, 0.05);
  }
  assert.ok(
    rooms.includes('study') &&
      rooms.includes('hall') &&
      rooms.includes('forecourt'),
  );
  assert.equal(house.all().length, 0);
});

void test('routing and continuous advancement respect multiple residents including a blocked door', () => {
  const occupied: EmiyaLocation[] = [
    { room: 'garden', point: { x: 158.234, y: 433.971 } },
    { room: 'hall', point: { x: 500, y: 280 } },
  ];
  let location: EmiyaLocation = {
    room: 'garden',
    point: { x: 184.801, y: 416.386 },
  };
  let legs = emiyaHouseRoute(location, EMIYA_ENTRY, occupied)!;
  assert.ok(legs);
  for (let i = 0; i < 5000 && legs.length; i++) {
    const moved = emiyaAdvanceRoute(location, legs, 7.25, occupied);
    location = moved.location;
    legs = moved.legs;
    assert.equal(moved.blocked, false);
    for (const person of occupied)
      assert.ok(close(location, person) >= 30 - 1e-6);
  }
  assert.ok(close(location, EMIYA_ENTRY) < 0.001);
});

void test('near conversation reuses original identity, busy and duplicate checks and records real relationship memory', () => {
  const session = new EmiyaLifeSession(fixture());
  const body = session.house.all()[0];
  const before = JSON.stringify(session.life.positions);
  assert.equal(session.talk('saber').ok, false);
  assert.equal(
    session.life.events.some((event) => event.interaction),
    false,
  );
  session.move(
    { room: body.room, point: { x: body.point.x, y: body.point.y + 55 } },
    false,
  );
  const formal = { ...session.life.indoor! };
  const result = session.talk('saber');
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(session.life.positions), before);
  assert.deepEqual(session.life.indoor, formal);
  const event = session.life.events.at(-1)!;
  const preset = encounterDialogue('shirou', 'saber');
  assert.equal(
    event.interaction?.message,
    preset.speaker === 'shirou' ? preset.message : preset.reply,
  );
  assert.equal(event.interaction?.speaker, 'shirou');
  assert.ok(
    session.life.bonds[bondKey('shirou', 'saber', session.life.waverStage)]
      .memories.length > 0,
  );
  assert.equal(session.talk('saber').ok, false);
  const asleep = new EmiyaLifeSession(fixture('sleep'));
  const sleeper = asleep.house.all()[0];
  asleep.move(
    {
      room: sleeper.room,
      point: { x: sleeper.point.x, y: sleeper.point.y + 55 },
    },
    false,
  );
  assert.equal(asleep.talk('saber').ok, false);
  assert.equal(
    asleep.life.events.some((event) => event.interaction),
    false,
  );
});

function mealFixture() {
  const save = fixture('eat');
  const day = Math.floor(save.life.minutes / 1440);
  const meal = {
    id: `${day}:dinner:emiya`,
    home: 'emiya' as const,
    day,
    slot: 'dinner' as const,
    cook: 'saber' as const,
    phase: 'ready' as const,
    startedAt: save.life.minutes,
    expiresAt: save.life.minutes + 150,
    participants: ['saber' as const],
  };
  save.life.meals.push(meal);
  save.life.people.saber.activity!.meal = meal.id;
  return save;
}

void test('completed shared food uses original meal, needs and memory once and survives parsing', () => {
  const session = new EmiyaLifeSession(mealFixture());
  session.house.step(session.life, EMIYA_ENTRY, 0.05);
  assert.equal(session.hasFood(), true);
  const eat = EMIYA_ACTIVITIES.find((activity) => activity.id === 'eat')!;
  session.move({ room: eat.room, point: eat.point }, false);
  const started = session.life.minutes;
  const result = session.complete(eat, session.location, false);
  assert.equal(result.ok, true);
  assert.ok(Math.abs(session.life.minutes - started - 20) < 1e-5);
  const shared = session.life.events.filter(
    (event) =>
      event.meal?.kind === 'shared' &&
      event.meal.participants.includes('shirou'),
  );
  assert.equal(shared.length, 1);
  assert.deepEqual(shared[0].meal?.participants.sort(), ['saber', 'shirou']);
  assert.ok(
    session.life.bonds[
      bondKey('shirou', 'saber', session.life.waverStage)
    ].archive?.some((memory) => memory.id === `experience:${shared[0].id}`),
  );
  assert.equal(session.hasFood(), false);
  assert.equal(session.complete(eat, session.location, false).ok, false);
  assert.equal(
    parseEmiyaLifeSave(session.save()).life.minutes,
    session.life.minutes,
  );
});

void test('a resident still crossing rooms is never fabricated as present at the shared table', () => {
  const save = mealFixture();
  save.residents = [
    {
      id: 'saber',
      room: 'lounge',
      point: { x: 190, y: 545 },
      direction: 'up',
      walked: 0,
    },
  ];
  const session = new EmiyaLifeSession(save);
  const eat = EMIYA_ACTIVITIES.find((activity) => activity.id === 'eat')!;
  session.move({ room: eat.room, point: eat.point }, false);
  assert.equal(session.complete(eat, session.location, false).ok, true);
  assert.equal(
    session.life.events.some(
      (event) =>
        event.meal?.kind === 'shared' &&
        event.meal.participants.includes('shirou'),
    ),
    false,
  );
});

void test('residents restore exact safe positions, pause freezes them and old records remain compatible', () => {
  const session = new EmiyaLifeSession(fixture());
  session.life.people.saber.activity!.kind = 'eat';
  for (let i = 0; i < 40; i++)
    session.house.step(session.life, session.location, 0.05);
  const saved = session.save();
  const restored = new EmiyaLifeSession(parseEmiyaLifeSave(saved));
  assert.deepEqual(restored.house.save(), session.house.save());
  const before = JSON.stringify(restored.house.save());
  restored.tick(40, restored.location, false);
  assert.equal(JSON.stringify(restored.house.save()), before);
  const old = createEmiyaLifeSave();
  assert.equal(parseEmiyaLifeSave(old).residents?.length, 0);
  assert.throws(
    () => parseEmiyaResidents([saved.residents![0], saved.residents![0]]),
    /人物记录无效/,
  );
});

void test('Saber keeps complete transparent walking and living frames inside their native sheets', () => {
  assert.deepEqual(Object.keys(SABER_WALK_SPRITES.frames).sort(), [
    'down',
    'left',
    'right',
    'up',
  ]);
  assert.deepEqual(Object.keys(SABER_LIFE_SPRITES.frames).sort(), [
    'bench',
    'cook',
    'eat',
    'read',
    'sit',
    'sleep',
  ]);
  assert.equal(
    SABER_LIFE_SPRITES.path,
    '/fate/character-art/saber-life-soft-v2.png',
  );
  for (const sheet of [SABER_WALK_SPRITES, SABER_LIFE_SPRITES]) {
    const png = readFileSync(resolve('public', sheet.path.slice(1)));
    assert.equal(png.readUInt32BE(16), sheet.width);
    assert.equal(png.readUInt32BE(20), sheet.height);
    assert.equal(png[25], 6);
    for (const frames of Object.values(sheet.frames)) {
      assert.equal(frames.length, sheet === SABER_WALK_SPRITES ? 6 : 2);
      for (const frame of frames) {
        assert.ok(frame.bounds.x > 0 && frame.bounds.y > 0);
        assert.ok(frame.bounds.x + frame.bounds.width < frame.width);
        assert.ok(frame.bounds.y + frame.bounds.height < frame.height);
        assert.ok(frame.x >= 0 && frame.y >= 0);
        assert.ok(
          frame.x + frame.width <= sheet.width &&
            frame.y + frame.height <= sheet.height,
        );
        assert.ok(
          frame.anchorX >= 0 &&
            frame.anchorX < frame.width &&
            frame.anchorY >= 0 &&
            frame.anchorY < frame.height,
        );
      }
    }
  }
});

void test('physical residents stay on safe separate floor contacts across a full simulated day', () => {
  const session = new EmiyaLifeSession();
  const start = session.life.minutes;
  for (let hour = 0; hour < 24; hour++) {
    session.wait(60);
    const residents = session.house.save();
    for (const body of residents) {
      assert.ok(interiorWalkable(body.point, EMIYA_ROOMS[body.room].scene));
      assert.ok(close(body, session.location) >= 30 - 1e-6);
      for (const other of residents)
        if (body.id !== other.id) assert.ok(close(body, other) >= 30 - 1e-6);
    }
    assert.deepEqual(parseEmiyaLifeSave(session.save()).residents, residents);
  }
  assert.ok(Math.abs(session.life.minutes - start - 1440) < 1e-5);
});

void test('residents sharing the same activity reserve separate endpoints instead of walking forever', () => {
  const save = fixture();
  const slot = STREET_PARTNERS.indexOf('saber') % 3;
  const ids = STREET_PARTNERS.filter(
    (id, index) => id !== 'shirou' && index % 3 === slot,
  ).slice(0, 3);
  for (const id of ids) {
    save.life.people[id].activity = structuredClone(
      save.life.people.saber.activity,
    );
    save.life.positions[id] = lifeDestination(id, 'study', 'emiya');
  }
  const house = new EmiyaResidents(save.life, EMIYA_ENTRY);
  for (let step = 0; step < 100; step++)
    house.step(save.life, EMIYA_ENTRY, 0.05);
  for (const id of ids) {
    const body = house.all().find((body) => body.id === id)!;
    assert.equal(body.phase, 'doing');
    for (const other of house.all())
      if (body.id !== other.id)
        assert.ok(close(body.target, other.target) >= 36);
  }
});
