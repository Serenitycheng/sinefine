import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HouseGameSession,
  EINZBERN_LIFE_ZONES,
  houseHomeForActor,
  parseHouseGameSave,
  type HouseStreetReturn,
} from '../lib/fate-house-game';
import {
  EINZBERN_ROOMS,
  EINZBERN_ROOM_IDS,
  type EinzbernActorId,
  type EinzbernRoomId,
} from '../lib/fate-einzbern-house';
import { emptyFateSave, parseFateSave, type FateSave } from '../lib/fate-state';
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
  interiorClearSegment,
} from '../lib/fate-city-interior-navigation';
import { clockRate } from '../lib/fate-clock';
import {
  createFateBackup,
  serializeFateBackup,
  readFateBackupText,
} from '../lib/fate-backup';
import { houseResidentSprite } from '../lib/fate-house-sprites';
import { shirouWalkSprite } from '../lib/fate-emiya-walk';
import { mirrorPreviewSprite } from '../lib/fate-preview-house';
import { EmiyaGameSession } from '../lib/fate-emiya-game';
import { runBackgroundRound } from '../lib/fate-background-simulation';
import type { PartnerId } from '../lib/fate-cast';
import type { Point } from '../lib/street';

const CAST = ['kiritsugu', 'irisviel', 'illya'] as const;
const gap = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function atHome(life: DailyLife, id: PartnerId, kind: LifeAction = 'visit') {
  life.people[id].activity = {
    kind,
    home: 'einzbern',
    phase: 'doing',
    remaining: 180,
    reason: '在家',
    source: 'rules',
  };
}
function fixture(actor: EinzbernActorId = 'kiritsugu', residents = false) {
  const life = createDailyLife();
  if (residents) for (const id of CAST) atHome(life, id);
  const street: HouseStreetReturn = {
    actor,
    point: { ...HOME_ENTRANCES.einzbern.door },
    scene: 'map',
    zoom: { street: 2.48, map: 1.24 },
    camera: { x: 150, y: 380, scale: 0.9 },
    manual: { x: 2000, y: 1000 },
  };
  life.positions[actor] = { ...street.point };
  life.people[actor].activity = null;
  return new HouseGameSession(life, street);
}
const formal = (session: HouseGameSession): FateSave => ({
  ...emptyFateSave(),
  version: 3,
  ...session.gameSave(),
  worldNote: '家庭设定保持',
  characterNotes: { shirou: '仍住卫宫宅' },
});
function room(session: HouseGameSession, id: EinzbernRoomId, point?: Point) {
  const arrival =
    id === 'hall'
      ? { x: 500, y: 560 }
      : EINZBERN_ROOMS.hall.doors.find((d) => d.to === id)!.arrival;
  session.location.room = id;
  session.move(point ?? arrival, 'left', null);
}

void test('family house restores all three identities in six rooms with exact local feet, main coordinates and original housing', () => {
  for (const actor of CAST) {
    const session = fixture(actor),
      housing = structuredClone(session.life.housing);
    assert.equal(houseHomeForActor(actor), 'einzbern');
    for (const id of EINZBERN_ROOM_IDS) {
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
      assert.equal(restored.controlled, actor);
      assert.equal(restored.home, 'einzbern');
      assert.equal(
        indoorRoom(restored.life.indoor!, 'einzbern'),
        EINZBERN_LIFE_ZONES[id],
      );
      assert.equal(restored.direction, 'left');
      assert.equal(restored.zoom, 1.8);
      assert.equal(restored.running, false);
      assert.deepEqual(restored.life.housing, housing);
      assert.deepEqual(restored.life.positions[actor], session.street.point);
      assert.equal(save.characterNotes.shirou, '仍住卫宫宅');
    }
  }
});

void test('five family branches have real walkable thresholds and only the front hall exits to the original street footpoint', () => {
  const session = fixture();
  for (const id of EINZBERN_ROOM_IDS.filter((id) => id !== 'hall')) {
    room(session, 'hall');
    const out = EINZBERN_ROOMS.hall.doors.find((d) => d.to === id)!;
    assert.equal(session.door(out), false);
    assert.ok(
      interiorRoute(
        session.location.point,
        out.point,
        EINZBERN_ROOMS.hall.scene,
      ),
    );
    session.move(out.point, 'up', null);
    assert.equal(session.door(out), true);
    assert.equal(session.location.room, id);
    assert.deepEqual(session.location.point, out.arrival);
    const back = EINZBERN_ROOMS[id].doors[0];
    assert.ok(
      interiorRoute(
        session.location.point,
        back.point,
        EINZBERN_ROOMS[id].scene,
      ),
    );
    session.move(back.point, 'down', null);
    assert.equal(session.door(back), true);
    assert.equal(session.location.room, 'hall');
    assert.deepEqual(session.location.point, back.arrival);
  }
  const exit = EINZBERN_ROOMS.hall.doors.find((d) => d.to === null)!;
  session.move(exit.point, 'down', null);
  assert.equal(session.door(exit), true);
  const released = session.release();
  assert.equal(released.house.active, false);
  assert.equal(released.life.indoor, undefined);
  assert.deepEqual(released.life.positions.kiritsugu, session.street.point);
});

void test('family furniture poses survive refresh only at the registered physical interaction point', () => {
  for (const actor of CAST)
    for (const id of EINZBERN_ROOM_IDS)
      for (const action of EINZBERN_ROOMS[id].actions) {
        const session = fixture(actor),
          spot = EINZBERN_ROOMS[id].scene.spots.find(
            (s) => s.id === action.id,
          )!;
        room(session, id, spot.point);
        session.move(spot.point, 'right', action.id);
        const save = parseFateSave(formal(session));
        assert.equal(
          new HouseGameSession(save.life!, save.house!.street, save.house)
            .action,
          action.id,
        );
        save.house!.location.point.y += 10;
        assert.throws(() => parseFateSave(save));
      }
});

void test('family saves reject mismatched home, actor, doorway, room, overlapping bodies and duplicate controlled actor', () => {
  const save = formal(fixture('illya', true)),
    raw = JSON.stringify(save);
  for (const mutate of [
    (v: FateSave) => {
      v.house!.home = 'matou';
    },
    (v: FateSave) => {
      v.house!.street.actor = 'rin';
    },
    (v: FateSave) => {
      v.house!.location.room = 'archive';
    },
    (v: FateSave) => {
      v.house!.street.point = { ...HOME_ENTRANCES.emiya.door };
    },
    (v: FateSave) => {
      v.life!.indoor!.actor = 'kiritsugu';
    },
    (v: FateSave) => {
      v.house!.residents[0].id = 'illya';
    },
    (v: FateSave) => {
      v.house!.residents[1].point = { ...v.house!.residents[0].point };
    },
  ]) {
    const bad = structuredClone(save);
    mutate(bad);
    assert.throws(() => parseFateSave(bad));
  }
  assert.equal(JSON.stringify(save), raw);
});

void test('parents and Illya rest in their own rooms while Shirou remains an actual visitor with a different home', () => {
  const session = fixture('kiritsugu', true);
  atHome(session.life, 'irisviel', 'sleep');
  atHome(session.life, 'illya', 'sleep');
  session.life.people.shirou.activity = {
    kind: 'visit',
    home: 'einzbern',
    phase: 'going',
    remaining: 80,
    reason: '来访途中',
    source: 'rules',
  };
  const loaded = new HouseGameSession(session.life, session.street);
  assert.equal(loaded.bodies.find((b) => b.id === 'irisviel')!.room, 'parents');
  assert.equal(loaded.bodies.find((b) => b.id === 'illya')!.room, 'illya');
  assert.equal(
    loaded.bodies.some((b) => b.id === 'kiritsugu' || b.id === 'shirou'),
    false,
  );
  atHome(loaded.life, 'shirou');
  loaded.tick(0.05);
  assert.equal(loaded.bodies.find((b) => b.id === 'shirou')!.room, 'hall');
  assert.equal(homeOf('shirou', loaded.life.housing), 'emiya');
  assert.equal(homeOf('kiritsugu', loaded.life.housing), 'einzbern');
  assert.ok(parseFateSave(formal(loaded)));
});

void test('Illya walks from the lounge through the hall to her bedroom and waits at an occupied doorway', () => {
  const session = fixture();
  atHome(session.life, 'illya');
  const loaded = new HouseGameSession(session.life, session.street);
  room(loaded, 'hall', { x: 500, y: 560 });
  atHome(loaded.life, 'illya', 'sleep');
  loaded.running = true;
  loaded.life.nextEncounter = loaded.life.minutes + 100;
  const crossed: string[] = [];
  for (let i = 0; i < 900 && loaded.bodies[0].room !== 'illya'; i++) {
    const body = loaded.bodies[0],
      before = { ...body.point },
      from = body.room as EinzbernRoomId;
    loaded.tick(0.05);
    assert.ok(
      interiorWalkable(
        body.point,
        EINZBERN_ROOMS[body.room as EinzbernRoomId].scene,
      ),
    );
    if (from === body.room) {
      assert.ok(gap(before, body.point) <= 6.00001);
      assert.ok(
        interiorClearSegment(before, body.point, EINZBERN_ROOMS[from].scene),
      );
    } else {
      const door = EINZBERN_ROOMS[from].doors.find((d) => d.to === body.room)!;
      assert.ok(door);
      assert.ok(gap(before, door.point) <= 6.00001);
      assert.deepEqual(body.point, door.arrival);
      crossed.push(body.room);
    }
    parseHouseGameSave(loaded.gameSave().house, loaded.gameSave().life);
  }
  assert.deepEqual(crossed, ['hall', 'illya']);
  const back = EINZBERN_ROOMS.illya.doors[0];
  loaded.bodies[0].point = { ...back.point };
  room(loaded, 'hall', back.arrival);
  atHome(loaded.life, 'illya');
  loaded.tick(0.05);
  assert.equal(loaded.bodies[0].room, 'illya');
  room(loaded, 'hall', { x: 500, y: 560 });
  loaded.tick(0.05);
  assert.equal(loaded.bodies[0].room, 'hall');
});

void test('each family member approaches a real person and records the actual speaker, including a visiting Shirou', () => {
  for (const actor of CAST) {
    const session = fixture(actor);
    atHome(session.life, 'shirou');
    const loaded = new HouseGameSession(session.life, session.street),
      body = loaded.bodies[0];
    room(loaded, 'lounge');
    assert.equal(loaded.conversation(body.id).ok, false);
    const approach = loaded.residentApproach(body.id)!;
    assert.ok(approach);
    assert.ok(
      interiorRoute(
        loaded.location.point,
        approach,
        EINZBERN_ROOMS.lounge.scene,
        loaded.occupied(),
      ),
    );
    loaded.move(approach, 'left', null);
    const result = loaded.conversation(body.id);
    assert.equal(result.ok, true);
    if (!result.ok || !('life' in result)) continue;
    assert.equal(result.entry.speaker, actor);
    assert.equal(result.entry.target, 'shirou');
    assert.ok(
      result.life.events.some(
        (e) => e.interaction?.exchangeId === result.entry.id,
      ),
    );
    loaded.life = result.life;
    assert.equal(loaded.conversation(body.id).ok, false);
  }
});

void test('family meals keep existing needs and world time; naps require the controlled family member own bedroom', () => {
  for (const actor of CAST) {
    const session = fixture(actor),
      start = session.life.minutes,
      own = actor === 'illya' ? 'illya' : 'parents';
    session.life.people[actor].hunger = 80;
    assert.equal(session.care('meal').ok, false);
    room(session, 'kitchen');
    assert.equal(session.care('meal').ok, true);
    assert.ok(Math.abs(session.life.minutes - start - 20) < 1e-8);
    assert.ok(session.life.people[actor].hunger < 80);
    assert.ok(
      session.life.events.some(
        (e) => e.care?.person === actor && e.care.home === 'einzbern',
      ),
    );
    assert.equal(session.careRoom('nap'), own);
    room(session, actor === 'illya' ? 'parents' : 'illya');
    const before = JSON.stringify(session.life);
    assert.equal(session.care('nap').ok, false);
    assert.equal(JSON.stringify(session.life), before);
    room(session, own);
    assert.equal(session.care('nap').ok, true);
    assert.ok(Math.abs(session.life.minutes - start - 80) < 1e-8);
    assert.deepEqual(session.life.positions[actor], session.street.point);
    assert.ok(parseFateSave(formal(session)));
  }
});

void test('family single clock stays paused on reload and cannot start a second background simulation', async () => {
  const session = fixture(),
    minute = session.life.minutes;
  session.tick(0.05);
  assert.equal(session.life.minutes, minute);
  session.running = true;
  session.life.nextEncounter = minute + 100;
  for (let i = 0; i < 20; i++) session.tick(0.05);
  assert.ok(Math.abs(session.life.minutes - minute - clockRate(1)) < 1e-8);
  const save = parseFateSave(formal(session)),
    loaded = new HouseGameSession(save.life!, save.house!.street, save.house);
  assert.equal(loaded.running, false);
  loaded.tick(0.05);
  assert.equal(loaded.life.minutes, save.life!.minutes);
  let called = false;
  await assert.rejects(
    runBackgroundRound(createFateBackup(save), async () => {
      called = true;
      throw new Error('Unexpected AI call');
    }),
    /先走回街道/,
  );
  assert.equal(called, false);
});

void test('family v3 backup and inactive scene coexist with Emiya while original Rin and Sakura saves stay readable', () => {
  const session = fixture('irisviel'),
    save = formal(session),
    backup = readFateBackupText(serializeFateBackup(createFateBackup(save)));
  assert.deepEqual(backup.save.house, save.house);
  const released = session.release();
  released.life.positions.shirou = { ...HOME_ENTRANCES.emiya.door };
  const emiya = new EmiyaGameSession(released.life, {
    ...session.street,
    actor: 'shirou',
    point: { ...HOME_ENTRANCES.emiya.door },
  });
  const both = { ...save, ...emiya.gameSave(), house: released.house };
  assert.ok(parseFateSave(both));
  assert.throws(() => parseFateSave({ ...both, house: save.house }));
  for (const [actor, home] of [
    ['rin', 'tohsaka'],
    ['sakura', 'matou'],
  ] as const) {
    const life = createDailyLife();
    life.positions[actor] = { ...HOME_ENTRANCES[home].door };
    const old = new HouseGameSession(life, {
      ...session.street,
      actor,
      point: { ...HOME_ENTRANCES[home].door },
    });
    assert.equal(parseFateSave(formal(old)).house!.home, home);
  }
});

void test('Shirou visitor reuses the approved daily gait, full registered crop and one mirror transform', () => {
  for (const direction of ['up', 'down', 'left', 'right'] as const)
    for (let phase = 0; phase <= 6; phase++) {
      const sprite = houseResidentSprite('shirou', direction, phase)!,
        original = shirouWalkSprite(direction, phase);
      assert.equal(sprite.file, original.sheet.path);
      assert.equal(sprite.cropX, original.frame.x);
      assert.equal(sprite.cropY, original.frame.y);
      assert.equal(sprite.cellWidth, original.frame.width);
      assert.equal(sprite.cellHeight, original.frame.height);
      assert.equal(sprite.anchorX, original.anchorX);
      assert.equal(sprite.scale, original.scale);
      assert.deepEqual(
        original.mirror ? mirrorPreviewSprite(sprite).bounds : sprite.bounds,
        original.frame.bounds,
      );
      assert.equal(sprite.mirror, original.mirror);
      assert.doesNotMatch(sprite.file, /school/);
    }
  for (const actor of CAST) assert.ok(houseResidentSprite(actor, 'down', 0));
  assert.ok(houseResidentSprite('rin', 'down', 0));
  assert.ok(houseResidentSprite('sakura', 'down', 0));
});
