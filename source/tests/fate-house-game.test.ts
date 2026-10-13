import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HouseGameSession,
  HOUSE_LIFE_ZONES,
  parseHouseGameSave,
  type HouseStreetReturn,
  type HouseRoomId,
} from '../lib/fate-house-game';
import {
  emptyFateSave,
  parseFateSave,
  FATE_STORAGE_KEY,
  type FateSave,
} from '../lib/fate-state';
import { createDailyLife, type LifeAction } from '../lib/fate-life';
import { TOHSAKA_ROOMS, TOHSAKA_ROOM_IDS, type TohsakaRoomId } from '../lib/fate-tohsaka-house';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import { indoorRoom } from '../lib/fate-indoor-map';
import { DEFAULT_ZOOM } from '../lib/fate-camera';
import { clockRate } from '../lib/fate-clock';
import {
  interiorClearSegment,
  interiorRoute,
  interiorWalkable,
} from '../lib/fate-city-interior-navigation';
import {
  createFateBackup,
  serializeFateBackup,
  readFateBackupText,
  checkpointFateLibrary,
  FATE_LIBRARY_KEY,
} from '../lib/fate-backup';
import {
  readFateLocalSnapshot,
  writeFateLocalSnapshot,
  FateStorageConflict,
} from '../lib/fate-local-session';
import { parseCloudSaveSlot } from '../lib/fate-cloud-save';
import { runBackgroundRound } from '../lib/fate-background-simulation';
import { EmiyaGameSession } from '../lib/fate-emiya-game';
import type { PartnerId } from '../lib/fate-cast';
import type { Point } from '../lib/street';

function inside(
  session: HouseGameSession,
  id: PartnerId,
  kind: LifeAction = 'visit',
) {
  session.life.people[id].activity = {
    kind,
    home: 'tohsaka',
    phase: 'doing',
    remaining: 80,
    reason: '宅内验证',
    source: 'rules',
  };
}
function fixture(residents = false) {
  const life = createDailyLife();
  const street: HouseStreetReturn = {
    actor: 'rin',
    point: { ...HOME_ENTRANCES.tohsaka.door },
    scene: 'map',
    zoom: { street: DEFAULT_ZOOM * 2, map: DEFAULT_ZOOM * 3 },
    camera: { x: 200, y: 300, scale: 0.8 },
    manual: { x: 2600, y: 1100 },
  };
  life.positions.rin = { ...street.point };
  if (residents)
    life.people.tokiomi.activity = {
      kind: 'visit',
      home: 'tohsaka',
      phase: 'doing',
      remaining: 80,
      reason: '宅内验证',
      source: 'rules',
    };
  return new HouseGameSession(life, street);
}
function formal(session = fixture()): FateSave {
  return {
    ...emptyFateSave(),
    version: 3,
    ...session.gameSave(),
    worldNote: '原世界笔记',
    characterNotes: { kiritsugu: '原人物备注' },
  };
}
function moveRoom(
  session: HouseGameSession,
  room: HouseRoomId,
  point: Point = { x: 500, y: 560 },
) {
  session.location.room = room;
  session.move(point, 'left', null);
}
const gap = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

void test('legacy versions stay readable and v3 requires exactly one active formal scene', () => {
  const old = { ...emptyFateSave(), life: createDailyLife() };
  const raw = JSON.stringify(old);
  assert.equal(parseFateSave(old).version, 1);
  assert.equal(JSON.stringify(old), raw);
  assert.equal(parseFateSave(old).house, undefined);
  assert.throws(() => parseFateSave({ ...formal(), version: 1 }));
  assert.throws(() => parseFateSave({ ...formal(), version: 2 }));
  assert.throws(() => parseFateSave({ ...old, version: 3 }));
  const life = createDailyLife();
  life.positions.shirou = { ...HOME_ENTRANCES.emiya.door };
  const emiya = new EmiyaGameSession(life, {
    ...fixture().street,
    actor: 'shirou',
    point: HOME_ENTRANCES.emiya.door,
  });
  const v2 = { ...old, version: 2 as const, ...emiya.gameSave() };
  assert.equal(parseFateSave(v2).version, 2);
  assert.throws(() => parseFateSave({ ...formal(), emiya: v2.emiya }));
});

void test('all five rooms round-trip exact local feet, facing and camera while preserving world coordinates', () => {
  const session = fixture();
  for (const room of TOHSAKA_ROOM_IDS) {
    moveRoom(
      session,
      room,
      room === 'study' ? { x: 160, y: 85 } : { x: 500, y: 560 },
    );
    session.zoom = 1.9;
    const save = parseFateSave(JSON.parse(JSON.stringify(formal(session))));
    const restored = new HouseGameSession(
      save.life!,
      save.house!.street,
      save.house,
    );
    assert.deepEqual(restored.location, session.location);
    assert.deepEqual(restored.street, session.street);
    assert.deepEqual(restored.life.positions.rin, HOME_ENTRANCES.tohsaka.door);
    assert.equal(
      indoorRoom(restored.life.indoor!, 'tohsaka'),
      HOUSE_LIFE_ZONES[room],
    );
    assert.equal(restored.direction, 'left');
    assert.equal(restored.zoom, 1.9);
    assert.equal(restored.running, false);
    assert.equal(save.worldNote, '原世界笔记');
  }
});

void test('real doors require proximity and return through the correct doorway in both directions', () => {
  const session = fixture();
  for (const room of TOHSAKA_ROOM_IDS.filter((id) => id !== 'hall')) {
    moveRoom(session, 'hall');
    const out = TOHSAKA_ROOMS.hall.doors.find((d) => d.to === room)!;
    assert.equal(session.door(out), false);
    assert.ok(
      interiorRoute(
        session.location.point,
        out.point,
        TOHSAKA_ROOMS.hall.scene,
      ),
    );
    session.move(out.point, 'up', null);
    assert.equal(session.door(out), true);
    assert.equal(session.location.room, room);
    assert.deepEqual(session.location.point, out.arrival);
    const back = TOHSAKA_ROOMS[room].doors[0];
    assert.ok(
      interiorRoute(
        session.location.point,
        back.point,
        TOHSAKA_ROOMS[room].scene,
      ),
    );
    session.move(back.point, 'down', null);
    assert.equal(session.door(back), true);
    assert.equal(session.location.room, 'hall');
    assert.deepEqual(session.location.point, back.arrival);
  }
});

void test('furniture poses survive refresh only at their registered physical interaction points', () => {
  const session = fixture();
  for (const room of TOHSAKA_ROOM_IDS)
    for (const action of TOHSAKA_ROOMS[room].actions) {
      const spot = TOHSAKA_ROOMS[room].scene.spots.find(
        (s) => s.id === action.id,
      )!;
      moveRoom(session, room, spot.point);
      session.move(spot.point, 'right', action.id);
      const save = parseFateSave(formal(session));
      assert.equal(
        new HouseGameSession(save.life!, save.house!.street, save.house).action,
        action.id,
      );
      const bad = structuredClone(save);
      bad.house!.location.point.y += 10;
      assert.throws(() => parseFateSave(bad));
    }
});

void test('invalid native locations, collisions and mismatched life records fail without changing source data', () => {
  const save = formal(fixture(true));
  const raw = JSON.stringify(save);
  const mutations: ((value: FateSave) => void)[] = [
    (v) => {
      v.house!.version = 2 as 1;
    },
    (v) => {
      v.house!.street.point.x = 1;
    },
    (v) => {
      v.house!.street.camera.scale = 0;
    },
    (v) => {
      v.house!.street.manual = { x: Infinity, y: 1 };
    },
    (v) => {
      v.house!.zoom = 3;
    },
    (v) => {
      v.house!.location.room = 'missing' as HouseRoomId;
    },
    (v) => {
      v.house!.location.point = { x: -100, y: 0 };
    },
    (v) => {
      v.house!.residents[0].point = { x: -100, y: 0 };
    },
    (v) => {
      v.house!.residents.push(structuredClone(v.house!.residents[0]));
    },
    (v) => {
      v.house!.residents[0].id = 'missing' as PartnerId;
    },
    (v) => {
      v.house!.residents[0].room = v.house!.location.room;
      v.house!.residents[0].point = { ...v.house!.location.point };
    },
    (v) => {
      v.life!.positions.rin.x += 1;
    },
    (v) => {
      v.life!.indoor!.actor = 'shirou';
    },
    (v) => {
      delete v.life!.indoor;
    },
    (v) => {
      v.life!.indoor = {
        actor: 'rin',
        home: 'tohsaka',
        layout: 2,
        x: 40,
        y: 40,
      };
    },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(save);
    mutate(bad);
    assert.throws(() => parseFateSave(bad));
  }
  assert.equal(JSON.stringify(save), raw);
});

void test('residence never fabricates presence and native visitors appear only after actually arriving', () => {
  const session = fixture();
  assert.equal(session.bodies.length, 0);
  session.life.people.tokiomi.activity = {
    kind: 'visit',
    home: 'tohsaka',
    phase: 'going',
    remaining: 80,
    reason: '回家途中',
    source: 'rules',
  };
  session.tick(0.05);
  assert.equal(session.bodies.length, 0);
  inside(session, 'sakura', 'study');
  session.tick(0.05);
  assert.equal(session.bodies.length, 1);
  assert.equal(session.bodies[0].id, 'sakura');
  assert.equal(session.bodies[0].room, 'hall');
  assert.equal(session.bodies[0].walking, false);
});

void test('residents cross the actual hall doors at bounded speed and retain separation instead of teleporting rooms', () => {
  const session = fixture(true);
  moveRoom(session, 'hall', { x: 750, y: 550 });
  inside(session, 'tokiomi', 'rest');
  session.running = true;
  session.life.nextEncounter = session.life.minutes + 100;
  const crossed: string[] = [];
  for (let i = 0; i < 500 && session.bodies[0].room !== 'bedroom'; i++) {
    const body = session.bodies[0],
      room = body.room,
      point = { ...body.point };
    session.tick(0.05);
    assert.ok(interiorWalkable(body.point, TOHSAKA_ROOMS[body.room as TohsakaRoomId].scene));
    if (body.room === room) assert.ok(gap(point, body.point) <= 6.00001);
    else {
      const door = TOHSAKA_ROOMS[room as TohsakaRoomId].doors.find((d) => d.to === body.room)!;
      assert.ok(door);
      assert.ok(gap(point, door.point) <= 6.00001);
      assert.deepEqual(body.point, door.arrival);
      crossed.push(body.room);
    }
    parseHouseGameSave(session.gameSave().house, session.gameSave().life);
  }
  assert.deepEqual(crossed, ['hall', 'bedroom']);
  assert.ok(session.bodies[0].travelled > 100);
});

void test('occupied arrival waits at the door and resumes when the controlled character moves away', () => {
  const session = fixture(true),
    back = TOHSAKA_ROOMS.study.doors[0];
  session.bodies[0].point = { ...back.point };
  moveRoom(session, 'hall', back.arrival);
  inside(session, 'tokiomi', 'rest');
  session.running = true;
  session.tick(0.05);
  assert.equal(session.bodies[0].room, 'study');
  moveRoom(session, 'hall', { x: 700, y: 500 });
  session.tick(0.05);
  assert.equal(session.bodies[0].room, 'hall');
  assert.deepEqual(session.bodies[0].point, back.arrival);
});

void test('controlled walking and conversational approach stay outside the resident body', () => {
  const session = fixture(true),
    body = session.bodies[0];
  moveRoom(session, body.room, { x: body.point.x, y: body.point.y + 90 });
  const from = { ...session.location.point };
  const stopped = session.constrain(from, body.point);
  assert.ok(gap(stopped, body.point) >= 30 - 1e-6);
  assert.ok(
    interiorClearSegment(
      from,
      stopped,
      TOHSAKA_ROOMS[body.room as TohsakaRoomId].scene,
      session.occupied(),
    ),
  );
  const near = session.residentApproach(body.id)!;
  assert.ok(near);
  assert.ok(gap(near, body.point) >= 30 && gap(near, body.point) <= 85);
  assert.ok(
    interiorRoute(
      from,
      near,
      TOHSAKA_ROOMS[body.room as TohsakaRoomId].scene,
      session.occupied(),
    ),
  );
  assert.equal(session.conversation('tokiomi').ok, false);
  session.move(near, 'up', null);
  const result = session.conversation('tokiomi');
  assert.equal(result.ok, true);
  if (!result.ok || !('life' in result)) return;
  assert.equal(result.entry.speaker, 'rin');
  assert.equal(result.entry.target, 'tokiomi');
  assert.ok(
    result.life.events.some(
      (e) => e.interaction?.exchangeId === result.entry.id,
    ),
  );
  session.life = result.life;
  assert.equal(session.conversation('tokiomi').ok, false);
});

void test('main home care uses existing room restrictions, world time and needs without creating inventory', () => {
  const session = fixture();
  const belongings = structuredClone(session.life.belongings);
  session.life.people.rin.hunger = 70;
  const minute = session.life.minutes;
  assert.equal(session.care('meal').ok, false);
  assert.equal(session.life.minutes, minute);
  moveRoom(session, 'dining');
  assert.equal(session.care('meal').ok, true);
  assert.ok(Math.abs(session.life.minutes - minute - 20) < 1e-8);
  assert.ok(session.life.people.rin.hunger < 70);
  assert.ok(
    session.life.events.some(
      (e) => e.care?.action === 'meal' && e.care.person === 'rin',
    ),
  );
  assert.deepEqual(session.life.positions.rin, session.street.point);
  assert.deepEqual(session.life.belongings.rin, belongings.rin);
  assert.ok(parseFateSave(formal(session)));
});

void test('only the scene clock advances once, paused scenes do not walk and bad frame times are ignored', () => {
  const session = fixture(),
    minutes = session.life.minutes;
  session.tick(0.05);
  assert.equal(session.life.minutes, minutes);
  session.running = true;
  session.life.nextEncounter = minutes + 100;
  for (let i = 0; i < 20; i++) session.tick(0.05);
  assert.ok(Math.abs(session.life.minutes - minutes - clockRate(1)) < 1e-8);
  const advanced = session.life.minutes;
  session.tick(Number.NaN);
  session.tick(-10);
  assert.equal(session.life.minutes, advanced);
});

void test('explicit time skips reconcile actual residents instead of leaving departed people in a paused room', () => {
  const session = fixture(true);
  session.life.people.tokiomi.activity = {
    kind: 'walk',
    phase: 'doing',
    remaining: 80,
    reason: '已经外出',
    source: 'rules',
  };
  moveRoom(session, 'dining');
  assert.equal(session.running, false);
  assert.equal(session.care('meal').ok, true);
  assert.equal(
    session.bodies.some((b) => b.id === 'tokiomi'),
    false,
  );
  const saved = session.gameSave();
  assert.ok(parseHouseGameSave(saved.house, saved.life));
});

void test('return keeps world progress and last camera, and the inactive sidecar can coexist with Emiya', () => {
  const session = fixture();
  moveRoom(session, 'dining');
  session.care('meal');
  const minutes = session.life.minutes,
    returned = session.release();
  assert.equal(returned.house.active, false);
  assert.equal(returned.life.indoor, undefined);
  assert.deepEqual(returned.life.positions.rin, session.street.point);
  assert.equal(returned.life.minutes, minutes);
  const reentry = new HouseGameSession(
    returned.life,
    session.street,
    returned.house,
  );
  assert.equal(reentry.location.room, 'hall');
  const street = {
    ...session.street,
    actor: 'shirou' as const,
    point: { ...HOME_ENTRANCES.emiya.door },
  };
  returned.life.positions.shirou = { ...street.point };
  const emiya = new EmiyaGameSession(returned.life, street);
  const save = parseFateSave({
    ...emptyFateSave(),
    version: 3,
    house: returned.house,
    ...emiya.gameSave(),
  });
  assert.equal(save.emiya!.active, true);
  assert.equal(save.house!.active, false);
  assert.equal(save.life!.minutes, minutes);
});

void test('backups, cloud parsing and checkpoints preserve v3 scenes and existing notes', () => {
  const save = formal(fixture(true)),
    backup = createFateBackup(save);
  const restored = readFateBackupText(serializeFateBackup(backup)).save;
  assert.deepEqual(restored, parseFateSave(save));
  assert.deepEqual(
    parseCloudSaveSlot({
      backup,
      revision: 3,
      updatedAt: new Date().toISOString(),
    }).backup.save,
    restored,
  );
  const library = checkpointFateLibrary(
    { version: 1, current: save, checkpoints: [] },
    '远坂宅',
  );
  assert.deepEqual(library.checkpoints[0].save.house, save.house);
  assert.equal(
    library.checkpoints[0].save.characterNotes.kiritsugu,
    '原人物备注',
  );
});

void test('active formal rooms cannot start a second background clock or call upstream AI', async () => {
  const backup = createFateBackup(formal(fixture(true))), original = JSON.stringify(backup);
  let called = false;
  await assert.rejects(runBackgroundRound(backup, async () => { called = true; return {}; }), /先走回街道/);
  assert.equal(called, false);
  assert.equal(JSON.stringify(backup), original);
});

void test('v3 main writes stay atomic and stale pages cannot replace saved indoor progress', () => {
  const records = new Map<string, string>([
    [FATE_STORAGE_KEY, JSON.stringify(emptyFateSave())],
  ]);
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
  const fresh = readFateLocalSnapshot(storage),
    stale = readFateLocalSnapshot(storage);
  const legacy = records.get(FATE_STORAGE_KEY);
  fresh.library.current = formal(fixture(true));
  writeFateLocalSnapshot(storage, fresh.library, fresh.stamp);
  const raw = records.get(FATE_LIBRARY_KEY);
  assert.throws(
    () => writeFateLocalSnapshot(storage, stale.library, stale.stamp),
    FateStorageConflict,
  );
  assert.equal(records.get(FATE_STORAGE_KEY), legacy);
  assert.equal(records.get(FATE_LIBRARY_KEY), raw);
  assert.equal(readFateLocalSnapshot(storage).library.current.version, 3);
});
