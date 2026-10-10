import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EmiyaGameSession,
  parseEmiyaGameSave,
  type EmiyaStreetReturn,
} from '../lib/fate-emiya-game';
import {
  emptyFateSave,
  parseFateSave,
  FATE_STORAGE_KEY,
  type FateSave,
} from '../lib/fate-state';
import { createDailyLife, lifeDestination } from '../lib/fate-life';
import {
  EMIYA_ENTRY,
  EMIYA_ROOMS,
  EMIYA_ACTIVITIES,
} from '../lib/fate-emiya-house';
import { HOME_ENTRANCES } from '../lib/fate-home-entrances';
import { indoorRoom } from '../lib/fate-indoor-map';
import { DEFAULT_ZOOM } from '../lib/fate-camera';
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

function fixture() {
  const life = createDailyLife();
  const street: EmiyaStreetReturn = {
    actor: 'shirou',
    point: { ...HOME_ENTRANCES.emiya.door },
    scene: 'map',
    zoom: { street: DEFAULT_ZOOM * 2, map: DEFAULT_ZOOM * 3 },
    camera: { x: 200, y: 300, scale: 0.8 },
    manual: { x: 2800, y: 1000 },
  };
  life.positions.shirou = { ...street.point };
  return new EmiyaGameSession(life, street);
}
function formal(session = fixture()): FateSave {
  return {
    ...emptyFateSave(),
    version: 2,
    ...session.gameSave(),
    worldNote: '保留原世界',
    characterNotes: { kiritsugu: '保留原角色' },
  };
}

void test('v1 remains readable without changing identities or importing the independent playtest', () => {
  const legacy = { ...emptyFateSave(), life: createDailyLife() };
  const raw = JSON.stringify(legacy);
  const parsed = parseFateSave(JSON.parse(raw));
  assert.equal(parsed.version, 1);
  assert.equal(parsed.emiya, undefined);
  assert.deepEqual(parsed.life?.positions, legacy.life.positions);
  assert.equal(JSON.stringify(legacy), raw);
  assert.throws(() => parseFateSave({ ...formal(), version: 1 }));
  assert.throws(() => parseFateSave({ ...legacy, version: 2 }));
});

void test('all seven exact house locations round-trip inside the one main world and original four room identities', () => {
  const session = fixture();
  const point = { ...session.street.point };
  for (const room of Object.values(EMIYA_ROOMS)) {
    const location = { room: room.id, point: { x: 500, y: 560 } };
    session.move(location, false);
    const parsed = parseFateSave(JSON.parse(JSON.stringify(formal(session))));
    const restored = new EmiyaGameSession(
      parsed.life!,
      parsed.emiya!.street,
      parsed.emiya,
    );
    assert.deepEqual(restored.location, location);
    assert.deepEqual(restored.life.positions.shirou, point);
    assert.deepEqual(restored.street, session.street);
    assert.equal(restored.running, false);
    if (room.zone)
      assert.equal(indoorRoom(restored.life.indoor!, 'emiya'), room.zone);
    else if (room.id !== 'hall') assert.equal(restored.life.indoor, undefined);
  }
});

void test('house care changes survive return without changing the street footpoint or granting exit rewards', () => {
  const session = fixture();
  const sit = EMIYA_ACTIVITIES.find((action) => action.id === 'sit')!;
  session.life.people.shirou.energy = 30;
  assert.equal(
    session.complete(sit, { room: sit.room, point: sit.point }, false).ok,
    true,
  );
  const minute = session.life.minutes,
    energy = session.life.people.shirou.energy,
    events = session.life.events.length;
  const result = session.release();
  assert.equal(result.emiya.active, false);
  assert.equal(result.life.indoor, undefined);
  assert.deepEqual(result.life.positions.shirou, session.street.point);
  assert.equal(result.life.minutes, minute);
  assert.equal(result.life.people.shirou.energy, energy);
  assert.equal(result.life.events.length, events);
  assert.ok(parseFateSave({ ...emptyFateSave(), version: 2, ...result }));
  const reentry = new EmiyaGameSession(
    result.life,
    session.street,
    result.emiya,
  );
  assert.deepEqual(reentry.location, EMIYA_ENTRY);
  assert.equal(reentry.life.people.shirou.energy, energy);
});

void test('unsupported sidecar versions and invalid coordinates never become a fresh valid world', () => {
  const source = formal();
  for (const mutate of [
    (save: FateSave) => {
      save.emiya!.version = 2 as 1;
    },
    (save: FateSave) => {
      save.emiya!.location.point.x = Number.NaN;
    },
    (save: FateSave) => {
      save.emiya!.street.point.x = 1;
    },
    (save: FateSave) => {
      save.emiya!.street.camera.scale = 0;
    },
    (save: FateSave) => {
      save.emiya!.street.zoom.map = 1000;
    },
    (save: FateSave) => {
      save.emiya!.location.room = 'missing' as 'hall';
    },
    (save: FateSave) => {
      save.emiya!.street.manual = { x: Infinity, y: 20 };
    },
  ]) {
    const broken = structuredClone(source);
    mutate(broken);
    assert.throws(() => parseFateSave(broken));
  }
  assert.equal(source.worldNote, '保留原世界');
});

void test('active scenes reject mismatched control, pavement or formal room data', () => {
  const session = fixture();
  session.move({ room: 'table', point: { x: 500, y: 560 } }, false);
  for (const mutate of [
    (save: FateSave) => {
      save.life!.positions.shirou.x += 1;
    },
    (save: FateSave) => {
      save.life!.indoor!.actor = 'illya';
    },
    (save: FateSave) => {
      save.life!.indoor!.home = 'tohsaka';
    },
    (save: FateSave) => {
      delete save.life!.indoor;
    },
    (save: FateSave) => {
      Object.assign(save.life!.indoor!, { x: 238, y: 186 });
    },
  ]) {
    const save = structuredClone(formal(session));
    mutate(save);
    assert.throws(() => parseFateSave(save));
  }
});

void test('inactive house data coexists with another controlled actor in an existing interior', () => {
  const result = fixture().release();
  result.life.indoor = {
    actor: 'illya',
    home: 'einzbern',
    layout: 2,
    x: 360,
    y: 230,
  };
  const parsed = parseFateSave({ ...emptyFateSave(), version: 2, ...result });
  assert.equal(parsed.life!.indoor!.actor, 'illya');
  assert.equal(parsed.emiya!.active, false);
});

void test('backups, checkpoints and the cloud parser retain v2 house state without changing envelopes', () => {
  const save = formal();
  const backup = createFateBackup(save);
  assert.equal(backup.version, 1);
  assert.deepEqual(
    readFateBackupText(serializeFateBackup(backup)).save,
    parseFateSave(save),
  );
  assert.deepEqual(
    parseCloudSaveSlot({
      backup,
      revision: 2,
      updatedAt: new Date().toISOString(),
    }).backup.save,
    parseFateSave(save),
  );
  const library = checkpointFateLibrary(
    { version: 1, current: save, checkpoints: [] },
    '卫宫宅',
  );
  assert.deepEqual(library.checkpoints[0].save.emiya, save.emiya);
});

void test('v2 writes remain atomic, preserve the legacy fallback and reject stale other-page writes', () => {
  const records = new Map<string, string>([
    [FATE_STORAGE_KEY, JSON.stringify(emptyFateSave())],
  ]);
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
  const first = readFateLocalSnapshot(storage),
    stale = readFateLocalSnapshot(storage);
  const legacy = records.get(FATE_STORAGE_KEY);
  first.library.current = formal();
  writeFateLocalSnapshot(storage, first.library, first.stamp);
  const atomic = records.get(FATE_LIBRARY_KEY);
  assert.throws(
    () => writeFateLocalSnapshot(storage, stale.library, stale.stamp),
    FateStorageConflict,
  );
  assert.equal(records.get(FATE_STORAGE_KEY), legacy);
  assert.equal(records.get(FATE_LIBRARY_KEY), atomic);
  const restored = readFateLocalSnapshot(storage).library.current;
  assert.equal(restored.version, 2);
  assert.equal(restored.emiya!.active, true);
  assert.equal(restored.worldNote, '保留原世界');
});

void test('parsing does not mutate the original source object', () => {
  const session = fixture();
  const save = formal(session);
  const raw = JSON.stringify(save);
  const parsed = parseEmiyaGameSave(save.emiya, save.life!);
  parsed.street.point.x += 1;
  parsed.location.point.x += 1;
  assert.equal(JSON.stringify(save), raw);
});

void test('leaving cancels a real pending household invitation and restores the original resident schedule', () => {
  const base = fixture();
  const life = structuredClone(base.life);
  life.people.saber.activity = {
    kind: 'study',
    home: 'emiya',
    phase: 'doing',
    remaining: 30,
    source: 'rules',
    reason: '在家里安排日常。',
  };
  life.positions.saber = lifeDestination('saber', 'study', 'emiya');
  life.meals = [
    {
      id: '0:dinner:emiya',
      day: 0,
      slot: 'dinner',
      home: 'emiya',
      cook: 'shirou',
      phase: 'ready',
      startedAt: life.minutes,
      expiresAt: life.minutes + 150,
      participants: [],
    },
  ];
  const original = structuredClone(life.people.saber.activity);
  const session = new EmiyaGameSession(life, base.street);
  const resident = session.house.all().find((body) => body.id === 'saber')!;
  session.move(
    {
      room: resident.room,
      point: { x: resident.point.x - 80, y: resident.point.y },
    },
    false,
  );
  assert.equal(session.inviteToMeal('saber').status, 'walking');
  const pending = parseFateSave(formal(session));
  assert.equal(pending.emiya!.household!.invitations[0].status, 'walking');
  const restored = new EmiyaGameSession(
    pending.life!,
    pending.emiya!.street,
    pending.emiya,
  );
  const result = restored.release();
  assert.equal(result.emiya.household!.invitations[0].status, 'cancelled');
  assert.equal(result.life.meals[0].participants.includes('saber'), false);
  assert.deepEqual(result.life.people.saber.activity, original);
  assert.ok(parseFateSave({ ...emptyFateSave(), version: 2, ...result }));
});

void test('the controlled house uses the selected formal clock speed and paused time does not advance', () => {
  const session = fixture();
  const before = session.life.minutes;
  session.clockSpeed = 4;
  session.tick(0.05, session.location, false);
  assert.equal(session.life.minutes, before);
  session.running = true;
  for (let i = 0; i < 120; i++) session.tick(0.05, session.location, false);
  assert.ok(Math.abs(session.life.minutes - before - 4) < 0.00001);
  assert.deepEqual(session.life.positions.shirou, session.street.point);
});
