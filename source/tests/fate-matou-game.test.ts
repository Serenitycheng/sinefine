import assert from 'node:assert/strict';
import { FORMAL_HOUSE_PLANS } from '../lib/fate-formal-house-plans';
import test from 'node:test';
import {
  HouseGameSession,
  MATOU_LIFE_ZONES,
  houseHomeForActor,
  parseHouseGameSave,
  type HouseActorId,
  type HouseStreetReturn,
} from '../lib/fate-house-game';
import {
  MATOU_ROOMS,
  MATOU_ROOM_IDS,
  type MatouRoomId,
} from '../lib/fate-matou-house';
import { TOHSAKA_ROOMS } from '../lib/fate-tohsaka-house';
import { emptyFateSave, parseFateSave } from '../lib/fate-state';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import {
  createDailyLife,
  type DailyLife,
  type LifeAction,
} from '../lib/fate-life';
import { homeOf } from '../lib/fate-housing';
import { indoorRoom } from '../lib/fate-indoor-map';
import {
  interiorRoute,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';
import { DEFAULT_ZOOM } from '../lib/fate-camera';
import { clockRate } from '../lib/fate-clock';
import {
  createFateBackup,
  serializeFateBackup,
  readFateBackupText,
} from '../lib/fate-backup';
import type { PartnerId } from '../lib/fate-cast';
import type { Point } from '../lib/street';

const CAST = ['sakura', 'kariya', 'medusa'] as const;
const gap = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function atHome(life: DailyLife, id: PartnerId, kind: LifeAction = 'visit') {
  life.people[id].activity = {
    kind,
    home: 'matou',
    phase: 'doing',
    remaining: 80,
    reason: '在家',
    source: 'rules',
  };
}
function fixture(actor: HouseActorId = 'sakura', residents = false) {
  const life = createDailyLife();
  if (residents) for (const id of CAST) atHome(life, id);
  const street: HouseStreetReturn = {
    actor,
    point: { ...HOME_ENTRANCES.matou.door },
    scene: 'street',
    zoom: { street: DEFAULT_ZOOM * 2, map: DEFAULT_ZOOM },
    camera: { x: 150, y: 380, scale: 0.9 },
    manual: { x: 2000, y: 1000 },
  };
  life.positions[actor] = { ...street.point };
  life.people[actor].activity = null;
  return new HouseGameSession(life, street);
}
const formal = (session: HouseGameSession) => ({
  ...emptyFateSave(),
  version: 3 as const,
  ...session.gameSave(),
  worldNote: '保持世界笔记',
});
function room(
  session: HouseGameSession,
  id: MatouRoomId,
  point: Point = { x: 500, y: 560 },
) {
  session.location.room = id;
  session.move(
    id === 'lounge' && point.y === 560 ? { x: 500, y: 85 } : point,
    'left',
    null,
  );
}

void test('Matou saves restore all three actual identities and five rooms without changing world coordinates or housing', () => {
  for (const actor of CAST) {
    const session = fixture(actor),
      housing = structuredClone(session.life.housing);
    assert.equal(session.home, 'matou');
    assert.equal(session.controlled, actor);
    for (const id of MATOU_ROOM_IDS) {
      room(session, id);
      session.setZoom(1.8);
      const save = parseFateSave(JSON.parse(JSON.stringify(formal(session))));
      const restored = new HouseGameSession(
        save.life!,
        save.house!.street,
        save.house,
      );
      assert.deepEqual(restored.location, session.location);
      assert.deepEqual(restored.street, session.street);
      assert.deepEqual(
        restored.life.positions[actor],
        HOME_ENTRANCES.matou.door,
      );
      assert.equal(
        indoorRoom(restored.life.indoor!, 'matou'),
        MATOU_LIFE_ZONES[id],
      );
      assert.equal(restored.direction, 'left');
      assert.equal(restored.zoom, 1.8);
      assert.equal(restored.running, false);
      assert.equal(save.worldNote, '保持世界笔记');
      assert.deepEqual(restored.life.housing, housing);
    }
  }
  assert.equal(houseHomeForActor('rin'), 'tohsaka');
  assert.equal(houseHomeForActor('shirou'), null);
});

void test('Matou real hall doors require approach and all four branches return at their actual doorway', () => {
  const session = fixture();
  for (const id of MATOU_ROOM_IDS.filter((id) => id !== 'hall')) {
    room(session, 'hall');
    const out = MATOU_ROOMS.hall.doors.find((d) => d.to === id)!;
    assert.equal(session.door(out), false);
    assert.ok(
      interiorRoute(session.location.point, out.point, MATOU_ROOMS.hall.scene),
    );
    session.move(out.point, 'up', null);
    assert.equal(session.door(out), true);
    assert.equal(session.location.room, id);
    assert.deepEqual(session.location.point, out.arrival);
    const back = MATOU_ROOMS[id].doors[0];
    assert.ok(
      interiorRoute(session.location.point, back.point, MATOU_ROOMS[id].scene),
    );
    session.move(back.point, 'down', null);
    assert.equal(session.door(back), true);
    assert.deepEqual(session.location.point, back.arrival);
  }
  const street = MATOU_ROOMS.hall.doors.find((d) => d.to === null)!;
  session.move(street.point, 'down', null);
  assert.equal(session.door(street), true);
  const released = session.release();
  assert.equal(released.house.active, false);
  assert.equal(released.life.indoor, undefined);
  assert.deepEqual(released.life.positions.sakura, session.street.point);
});

void test('Matou furniture actions for all three models retain registered contacts on refresh', () => {
  for (const actor of CAST)
    for (const id of MATOU_ROOM_IDS)
      for (const action of MATOU_ROOMS[id].actions) {
        const session = fixture(actor),
          spot = MATOU_ROOMS[id].scene.spots.find((s) => s.id === action.id)!;
        room(session, id, spot.point);
        session.move(spot.point, 'right', action.id);
        const save = parseFateSave(formal(session));
        assert.equal(
          new HouseGameSession(save.life!, save.house!.street, save.house)
            .action,
          action.id,
        );
        const bad = structuredClone(save);
        bad.house!.location.point = { x: 20, y: 620 };
        assert.throws(() => parseFateSave(bad));
      }
});

void test('Matou parser rejects cross-house rooms, actors, entrances, self bodies and mismatched life without mutating source', () => {
  const save = formal(fixture('medusa', true)),
    raw = JSON.stringify(save);
  for (const mutate of [
    (v: typeof save) => {
      v.house.home = 'tohsaka';
    },
    (v: typeof save) => {
      v.house.street.actor = 'rin';
    },
    (v: typeof save) => {
      v.house.location.room = 'workshop';
    },
    (v: typeof save) => {
      v.house.street.point = { ...HOME_ENTRANCES.tohsaka.door };
    },
    (v: typeof save) => {
      v.life.indoor!.actor = 'sakura';
    },
    (v: typeof save) => {
      v.life.positions.medusa.x++;
    },
    (v: typeof save) => {
      v.house.residents[0].id = 'medusa';
    },
    (v: typeof save) => {
      v.house.residents[0].room = 'study';
    },
  ]) {
    const bad = structuredClone(save);
    mutate(bad);
    assert.throws(() => parseFateSave(bad));
  }
  assert.equal(JSON.stringify(save), raw);
});

void test('actual presence controls Matou bodies, and sisters/master changes never force anybody into the house', () => {
  const session = fixture('kariya');
  session.life.housing.sistersTogether = true;
  assert.equal(homeOf('sakura', session.life.housing), 'tohsaka');
  assert.equal(homeOf('medusa', session.life.housing), 'tohsaka');
  session.life.people.sakura.activity = {
    kind: 'visit',
    home: 'matou',
    phase: 'going',
    remaining: 80,
    reason: '途中',
    source: 'rules',
  };
  session.tick(0.05);
  assert.equal(session.bodies.length, 0);
  atHome(session.life, 'sakura');
  atHome(session.life, 'medusa');
  atHome(session.life, 'rin');
  session.tick(0.05);
  assert.deepEqual(session.bodies.map((b) => b.id).sort(), [
    'medusa',
    'rin',
    'sakura',
  ]);
  assert.ok(session.bodies.every((b) => b.room === 'hall' && !b.walking));
  assert.ok(
    parseHouseGameSave(session.gameSave().house, session.gameSave().life),
  );
  const visitor = fixture();
  visitor.life.housing.sistersTogether = true;
  room(visitor, 'dining');
  assert.equal(visitor.care('meal').ok, false);
  assert.equal(visitor.life.housing.sistersTogether, true);
  visitor.life.housing.masters.medusa = 'kariya';
  assert.equal(homeOf('medusa', visitor.life.housing), 'matou');
});

void test('Matou resident changes rooms through registered doors at bounded speed and waits for occupied arrivals', () => {
  const session = fixture('sakura', true);
  session.bodies = session.bodies.filter((b) => b.id === 'kariya');
  room(session, 'hall', { x: 800, y: 530 });
  atHome(session.life, 'kariya', 'study');
  session.running = true;
  session.life.nextEncounter = session.life.minutes + 100;
  const crossed: string[] = [];
  for (let i = 0; i < 700 && session.bodies[0].room !== 'archive'; i++) {
    const body = session.bodies[0],
      before = { ...body.point },
      from = body.room;
    session.tick(0.05);
    assert.ok(
      interiorWalkable(
        body.point,
        FORMAL_HOUSE_PLANS.matou.rooms[body.room].scene,
      ),
    );
    if (from === body.room) assert.ok(gap(before, body.point) <= 6.00001);
    else {
      const door = MATOU_ROOMS[from as MatouRoomId].doors.find(
        (d) => d.to === body.room,
      )!;
      assert.ok(door);
      assert.ok(gap(before, door.point) <= 6.00001);
      assert.deepEqual(body.point, door.arrival);
      crossed.push(body.room);
    }
    parseHouseGameSave(session.gameSave().house, session.gameSave().life);
  }
  assert.deepEqual(crossed, ['hall', 'archive']);
  const back = MATOU_ROOMS.archive.doors[0];
  session.bodies[0].point = { ...back.point };
  room(session, 'hall', back.arrival);
  atHome(session.life, 'kariya');
  session.tick(0.05);
  assert.equal(session.bodies[0].room, 'archive');
  room(session, 'hall', { x: 800, y: 530 });
  session.tick(0.05);
  assert.equal(session.bodies[0].room, 'hall');
});

void test('each controlled Matou identity approaches real residents and writes the correct speaker to existing social rules', () => {
  for (const actor of CAST) {
    const session = fixture(actor, true),
      body = session.bodies[0];
    assert.ok(session.bodies.every((b) => b.id !== actor));
    room(session, body.room as MatouRoomId, {
      x: body.point.x,
      y: body.point.y + 95,
    });
    assert.ok(
      gap(session.constrain(session.location.point, body.point), body.point) >=
        30 - 1e-6,
    );
    assert.equal(session.conversation(body.id).ok, false);
    const approach = session.residentApproach(body.id)!;
    assert.ok(approach);
    session.move(approach, 'up', null);
    const result = session.conversation(body.id);
    assert.equal(result.ok, true);
    if (!result.ok || !('life' in result)) continue;
    assert.equal(result.entry.speaker, actor);
    assert.equal(result.entry.target, body.id);
    assert.ok(
      result.life.events.some(
        (e) => e.interaction?.exchangeId === result.entry.id,
      ),
    );
    session.life = result.life;
    assert.equal(session.conversation(body.id).ok, false);
  }
});

void test('Matou care and unique clock use the selected identity and existing needs, leaving saved world feet fixed', () => {
  for (const actor of CAST) {
    const session = fixture(actor),
      start = session.life.minutes;
    session.life.people[actor].hunger = 80;
    assert.equal(session.care('meal').ok, false);
    room(session, 'dining');
    assert.equal(session.care('meal').ok, true);
    assert.ok(Math.abs(session.life.minutes - start - 20) < 1e-8);
    assert.ok(session.life.people[actor].hunger < 80);
    assert.ok(
      session.life.events.some(
        (e) => e.care?.person === actor && e.care.home === 'matou',
      ),
    );
    const minute = session.life.minutes;
    session.tick(0.05);
    assert.equal(session.life.minutes, minute);
    session.running = true;
    session.life.nextEncounter = minute + 100;
    for (let i = 0; i < 20; i++) session.tick(0.05);
    assert.ok(Math.abs(session.life.minutes - minute - clockRate(1)) < 1e-8);
    assert.deepEqual(session.life.positions[actor], session.street.point);
    assert.ok(parseFateSave(formal(session)));
  }
});

void test('existing Rin v3 remains readable and Matou v3 survives main backup parsing with its own room map', () => {
  const life = createDailyLife(),
    street = {
      ...fixture().street,
      actor: 'rin' as const,
      point: { ...HOME_ENTRANCES.tohsaka.door },
    };
  life.positions.rin = { ...street.point };
  const rin = new HouseGameSession(life, street);
  rin.location.room = 'study';
  rin.move({ x: 160, y: 85 }, 'up', null);
  assert.ok(interiorWalkable(rin.location.point, TOHSAKA_ROOMS.study.scene));
  assert.equal(indoorRoom(rin.gameSave().life.indoor!, 'tohsaka'), 'lounge');
  assert.equal(parseFateSave(formal(rin)).house!.home, 'tohsaka');
  const matou = formal(fixture('medusa'));
  const backup = readFateBackupText(
    serializeFateBackup(createFateBackup(matou)),
  );
  assert.equal(backup.save.house!.home, 'matou');
  assert.deepEqual(backup.save.house, matou.house);
});
