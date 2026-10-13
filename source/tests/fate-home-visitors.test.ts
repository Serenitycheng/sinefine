import assert from 'node:assert/strict';
import test from 'node:test';
import { FORMAL_HOUSE_PLANS } from '../lib/fate-formal-house-plans';
import { formalEntrance, type HouseSiteId } from '../lib/fate-formal-buildings';
import {
  HouseGameSession,
  type HouseHomeId,
  type HouseRoomId,
  type HouseStreetReturn,
} from '../lib/fate-house-game';
import {
  formalHousePlan,
  houseResidentSprite,
} from '../lib/fate-house-sprites';
import { emptyFateSave, parseFateSave, type FateSave } from '../lib/fate-state';
import { createDailyLife } from '../lib/fate-life';
import { STREET_PARTNERS, type PartnerId } from '../lib/fate-cast';
import { homeOf } from '../lib/fate-housing';
import { DISTRICT_PLACES } from '../lib/fate-district';
import {
  interiorClearSegment,
  interiorRoute,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';
import {
  EMIYA_DOORS,
  EMIYA_ENTRY,
  EMIYA_ROOMS,
  emiyaFurnitureSilhouette,
  type EmiyaRoomId,
} from '../lib/fate-emiya-house';
import { runBackgroundRound } from '../lib/fate-background-simulation';
import {
  createFateBackup,
  readFateBackupText,
  serializeFateBackup,
} from '../lib/fate-backup';

const HOMES: HouseHomeId[] = [
  'emiya',
  'tohsaka',
  'matou',
  'einzbern',
  'waver',
  'temple',
  'church',
];
function fixture(
  home: HouseSiteId,
  actor: PartnerId = 'shirou',
  guest?: PartnerId,
) {
  const life = createDailyLife();
  life.waverStage = 'adult';
  for (const id of STREET_PARTNERS) {
    life.people[id].activity = null;
    life.positions[id] = { ...DISTRICT_PLACES.park };
  }
  const street: HouseStreetReturn = {
    actor,
    point: formalEntrance(home),
    scene: 'street',
    zoom: { street: 2.48, map: 1.24 },
    camera: { x: 530, y: 780, scale: 1.3 },
    manual: { x: 300, y: 280 },
  };
  life.positions[actor] = { ...street.point };
  if (guest && guest !== actor && HOMES.includes(home as HouseHomeId))
    life.people[guest].activity = {
      kind: 'visit',
      home: home as HouseHomeId,
      phase: 'doing',
      remaining: 1000,
      reason: '实际在屋内',
      source: 'rules',
    };
  return new HouseGameSession(life, street, undefined, home);
}
const formal = (session: HouseGameSession): FateSave => ({
  ...emptyFateSave(),
  version: 3,
  ...session.gameSave(),
  worldNote: '保留世界设定',
  characterNotes: { shirou: '保留人物备注' },
});

for (const home of HOMES) {
  void test(`${home}: every existing identity can visit every room without changing housing or the street return`, () => {
    for (const actor of STREET_PARTNERS) {
      const session = fixture(home, actor),
        housing = structuredClone(session.life.housing);
      const assigned = homeOf(actor, housing),
        plan = formalHousePlan(home, actor, 'adult');
      for (const [room, config] of Object.entries(plan.rooms)) {
        const arrival =
          Object.values(plan.rooms)
            .flatMap((r) => r.doors)
            .find((door) => door.to === room)?.arrival ?? EMIYA_ENTRY.point;
        session.location.room = room as HouseRoomId;
        session.move(arrival, 'down', null);
        session.setZoom(2.1);
        const save = parseFateSave(JSON.parse(JSON.stringify(formal(session))));
        const restored = new HouseGameSession(
          save.life!,
          save.house!.street,
          save.house,
        );
        assert.equal(restored.controlled, actor);
        assert.equal(restored.home, home);
        assert.deepEqual(restored.location, session.location);
        assert.equal(restored.zoom, 2.1);
        assert.equal(restored.running, false);
        assert.deepEqual(restored.street, session.street);
        assert.deepEqual(restored.life.housing, housing);
        assert.equal(homeOf(actor, restored.life.housing), assigned);
        assert.deepEqual(restored.life.positions[actor], session.street.point);
        assert.ok(interiorWalkable(restored.location.point, config.scene));
        assert.equal(save.worldNote, '保留世界设定');
        assert.equal(save.characterNotes.shirou, '保留人物备注');
        if (home === 'emiya' && ['forecourt', 'garden'].includes(room))
          assert.equal(restored.life.indoor, undefined);
        else assert.equal(restored.life.indoor?.actor, actor);
        if (assigned !== home) {
          assert.equal(restored.careRoom('meal'), null);
          assert.equal(restored.care('meal').ok, false);
        }
      }
      const backup = readFateBackupText(
        serializeFateBackup(createFateBackup(formal(session))),
      );
      assert.deepEqual(backup.save.house, formal(session).house);
      const released = session.release();
      assert.equal(released.house.active, false);
      assert.equal(released.life.indoor, undefined);
      assert.deepEqual(released.life.positions[actor], session.street.point);
      assert.deepEqual(released.life.housing, housing);
    }
  });
  void test(`${home}: real visitors of every identity appear; absent homeowners never fabricate presence`, () => {
    for (const guest of STREET_PARTNERS) {
      const controlled = guest === 'shirou' ? 'rin' : 'shirou';
      const session = fixture(home, controlled, guest);
      assert.deepEqual(
        session.bodies.map((body) => body.id),
        [guest],
      );
      assert.equal(session.personInside(guest), true);
      assert.ok(houseResidentSprite(guest, 'down', 0, 'adult', home));
      session.life.people[guest].activity = null;
      session.life.positions[guest] = { ...DISTRICT_PLACES.park };
      assert.equal(session.personInside(guest), false);
      assert.equal(session.conversation(guest).ok, false);
    }
  });
}

void test('Emiya visitors reuse all seven existing scenes and sixteen room-door directions, including furniture masks', () => {
  const plan = FORMAL_HOUSE_PLANS.emiya,
    session = fixture('emiya', 'saber');
  assert.deepEqual(session.location, EMIYA_ENTRY);
  assert.equal(session.life.indoor, undefined);
  assert.equal(Object.keys(plan.rooms).length, 7);
  for (const [id, source] of Object.entries(EMIYA_ROOMS)) {
    const config = plan.rooms[id];
    assert.equal(config.scene.painting, source.scene.painting);
    assert.deepEqual(config.scene.floor, source.scene.floor);
    for (const furniture of config.scene.furniture)
      assert.deepEqual(
        furniture.silhouette,
        emiyaFurnitureSilhouette(
          source.id,
          source.pieces.find((piece) => piece.id === furniture.id)!,
        ),
      );
    for (const door of config.doors) {
      const entry =
        Object.values(plan.rooms)
          .flatMap((room) => room.doors)
          .find((d) => d.to === id)?.arrival ?? EMIYA_ENTRY.point;
      const route = interiorRoute(entry, door.point, config.scene);
      assert.ok(route, `${id}/${door.id}`);
      let previous = entry;
      for (const point of route) {
        assert.ok(interiorClearSegment(previous, point, config.scene));
        previous = point;
      }
      session.location.room = id as EmiyaRoomId;
      const distant = [420, 500, 560]
        .flatMap((y) => [400, 500, 600].map((x) => ({ x, y })))
        .find(
          (point) =>
            interiorWalkable(point, config.scene) &&
            Math.hypot(point.x - door.point.x, point.y - door.point.y) >= 80,
        )!;
      assert.ok(distant);
      session.move(distant, 'up', null);
      assert.equal(
        session.door(door),
        false,
        'the player must approach the door',
      );
      session.move(door.point, 'up', null);
      assert.equal(session.door(door), true);
      if (door.to)
        assert.deepEqual(session.location, {
          room: door.to,
          point: door.arrival,
        });
    }
  }
  assert.equal(EMIYA_DOORS.length, 16);
  assert.deepEqual(
    Object.entries(plan.rooms)
      .filter(([, room]) => room.doors.some((door) => door.to === null))
      .map(([id]) => id),
    ['forecourt'],
  );
});

void test('Emiya residents walk through the connected rooms when their activity changes and return through the forecourt when leaving', () => {
  const session = fixture('emiya', 'rin', 'saber');
  session.running = true;
  session.life.people.saber.activity!.kind = 'eat';
  const visited = new Set<string>();
  let body = session.bodies.find((resident) => resident.id === 'saber')!;
  for (let i = 0; i < 2500 && body.room !== 'table'; i++) {
    session.tick(0.05);
    visited.add(body.room);
  }
  assert.equal(body.room, 'table');
  assert.ok(visited.has('lounge'));
  session.location.room = 'garden';
  session.move({ x: 400, y: 400 }, 'down', null);
  session.life.people.saber.activity = null;
  session.life.positions.saber = { ...DISTRICT_PLACES.park };
  for (
    let i = 0;
    i < 2500 && session.bodies.some((resident) => resident.id === 'saber');
    i++
  ) {
    session.tick(0.05);
    body = session.bodies.find((resident) => resident.id === 'saber') ?? body;
    visited.add(body.room);
  }
  assert.equal(
    session.bodies.some((resident) => resident.id === 'saber'),
    false,
  );
  assert.ok(visited.has('hall'));
  assert.ok(visited.has('forecourt'));
});

void test('Young Waver remains young in every residence and has no fabricated seated pose', () => {
  for (const home of HOMES) {
    const session = fixture(home, 'waver');
    session.life.waverStage = 'young';
    const plan = formalHousePlan(home, 'waver', 'young');
    assert.ok(
      Object.values(plan.rooms).every((room) => room.actions.length === 0),
    );
    assert.deepEqual(
      plan.sprite('waver', 'left', 2),
      houseResidentSprite('waver', 'left', 2, 'young'),
    );
    const saved = parseFateSave(formal(session));
    assert.equal(saved.life!.waverStage, 'young');
  }
});

void test('A visiting actor also owns the only active clock, including Emiya outdoor areas', async () => {
  for (const home of HOMES) {
    const session = fixture(home, 'waver');
    let called = false;
    await assert.rejects(
      runBackgroundRound(createFateBackup(formal(session)), async () => {
        called = true;
        return {};
      }),
      /先走回街道/,
    );
    assert.equal(called, false);
  }
});
