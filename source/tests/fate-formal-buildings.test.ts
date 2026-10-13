import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  HouseGameSession,
  houseHomeForActor,
  type HouseRoomId,
  type HouseStreetReturn,
} from '../lib/fate-house-game';
import {
  FORMAL_LANDMARKS,
  FORMAL_PUBLIC_SITES,
  formalEntrance,
  formalPlaceImage,
  isFormalPublicSite,
} from '../lib/fate-formal-buildings';
import { HOUSE_PREVIEWS } from '../lib/fate-preview-houses';
import { FORMAL_HOUSE_PLANS } from '../lib/fate-formal-house-plans';
import { emptyFateSave, parseFateSave, type FateSave } from '../lib/fate-state';
import { createDailyLife, type LifeAction } from '../lib/fate-life';
import { STREET_PARTNERS, type PartnerId } from '../lib/fate-cast';
import { DISTRICT_LANDMARKS, DISTRICT_PLACES } from '../lib/fate-district';
import { CITY_LOCAL_PLACES } from '../lib/fate-city-art';
import {
  interiorRoute,
  interiorWalkable,
  interiorClearSegment,
} from '../lib/fate-city-interior-navigation';
import {
  formalHousePlan,
  houseResidentSprite,
} from '../lib/fate-house-sprites';
import { insidePublicBuilding } from '../lib/fate-building-presence';
import {
  createFateBackup,
  serializeFateBackup,
  readFateBackupText,
} from '../lib/fate-backup';
import { runBackgroundRound } from '../lib/fate-background-simulation';
import { currentPublicOuting } from '../lib/fate-public-outings';
import { pathTo, isWalkable, samePavement, type Point } from '../lib/street';

const SITES = ['waver', 'temple', 'church', ...FORMAL_PUBLIC_SITES] as const;
const gap = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function fixture(
  site: keyof typeof HOUSE_PREVIEWS,
  actor = HOUSE_PREVIEWS[site].cast[0].id as PartnerId,
) {
  const life = createDailyLife();
  life.waverStage = 'adult';
  for (const id of STREET_PARTNERS) {
    life.people[id].activity = null;
    life.positions[id] = { ...DISTRICT_PLACES.park };
  }
  const street: HouseStreetReturn = {
    actor,
    point: { ...formalEntrance(site) },
    scene: 'map',
    zoom: { street: 2.48, map: 1.24 },
    camera: { x: 150, y: 380, scale: 0.9 },
    manual: { x: 2000, y: 1000 },
  };
  life.positions[actor] = { ...street.point };
  return new HouseGameSession(life, street, undefined, site);
}
const formal = (s: HouseGameSession): FateSave => ({
  ...emptyFateSave(),
  version: 3,
  ...s.gameSave(),
  worldNote: '保留世界设定',
  characterNotes: { waver: '保留人物备注' },
});
function room(s: HouseGameSession, id: string, point?: Point) {
  const entry =
    id === 'hall'
      ? { x: 500, y: 560 }
      : FORMAL_HOUSE_PLANS[s.home].rooms.hall.doors.find((d) => d.to === id)!
          .arrival;
  s.location.room = id as HouseRoomId;
  s.move(point ?? entry, 'down', null);
}
function atHome(
  s: HouseGameSession,
  id: PartnerId,
  kind: LifeAction = 'visit',
) {
  assert.ok(s.home === 'waver' || s.home === 'temple' || s.home === 'church');
  s.life.people[id].activity = {
    kind,
    home: s.home,
    phase: 'doing',
    remaining: 180,
    reason: '在家',
    source: 'rules',
  };
}

for (const site of SITES) {
  void test(`${site}: every room and qualified actor retain the main save, exact feet, pose, camera and housing`, () => {
    for (const cast of HOUSE_PREVIEWS[site].cast) {
      const s = fixture(site, cast.id as PartnerId),
        housing = structuredClone(s.life.housing);
      for (const [id, config] of Object.entries(HOUSE_PREVIEWS[site].rooms)) {
        room(s, id);
        s.setZoom(1.9);
        const poses = [null, ...config.actions.map((a) => a.id)];
        for (const pose of poses) {
          if (pose)
            s.move(
              config.scene.spots.find((p) => p.id === pose)!.point,
              'right',
              pose,
            );
          const saved = parseFateSave(JSON.parse(JSON.stringify(formal(s))));
          const restored = new HouseGameSession(
            saved.life!,
            saved.house!.street,
            saved.house,
          );
          assert.equal(restored.home, site);
          assert.equal(restored.controlled, cast.id);
          assert.deepEqual(restored.location, s.location);
          assert.equal(restored.action, pose);
          assert.equal(restored.zoom, 1.9);
          assert.equal(restored.running, false);
          assert.deepEqual(restored.street, s.street);
          assert.deepEqual(restored.life.housing, housing);
          assert.deepEqual(
            restored.life.positions[cast.id as PartnerId],
            s.street.point,
          );
          assert.equal(saved.worldNote, '保留世界设定');
          assert.equal(saved.characterNotes.waver, '保留人物备注');
          if (isFormalPublicSite(site))
            assert.equal(restored.life.indoor, undefined);
          else assert.equal(restored.life.indoor?.home, site);
        }
      }
      const backup = readFateBackupText(
        serializeFateBackup(createFateBackup(formal(s))),
      );
      assert.deepEqual(backup.save.house, formal(s).house);
    }
  });
  void test(`${site}: all room doors require real approach, have collision-safe routes and return to the same street`, () => {
    const s = fixture(site),
      rooms = HOUSE_PREVIEWS[site].rooms;
    for (const [id, config] of Object.entries(rooms)) {
      room(s, id);
      for (const door of config.doors) {
        room(s, id);
        const distant = config.scene.spots.find(
          (spot) =>
            gap(spot.point, door.point) >= 80 &&
            interiorWalkable(spot.point, config.scene),
        )!.point;
        s.move(distant, 'down', null);
        assert.equal(
          s.door(door),
          false,
          'a door cannot teleport from across the room',
        );
        room(s, id);
        const route = interiorRoute(s.location.point, door.point, config.scene);
        assert.ok(route, `${site}/${id}/${door.id}`);
        let previous = s.location.point;
        for (const point of route) {
          assert.ok(interiorClearSegment(previous, point, config.scene));
          previous = point;
        }
        s.move(door.point, 'up', null);
        assert.equal(s.door(door), true);
        if (door.to) {
          assert.equal(s.location.room, door.to);
          assert.deepEqual(s.location.point, door.arrival);
          assert.ok(interiorWalkable(s.location.point, rooms[door.to].scene));
        } else assert.equal(id, 'hall');
      }
    }
    const saved = s.release();
    assert.equal(saved.house.active, false);
    assert.equal(saved.life.indoor, undefined);
    assert.deepEqual(saved.life.positions[s.controlled], s.street.point);
  });
}

void test('formal map preserves every original landmark and registers the five existing local shop doors with real image files', () => {
  assert.equal(FORMAL_LANDMARKS.length, 19);
  for (const original of DISTRICT_LANDMARKS)
    assert.deepEqual(
      FORMAL_LANDMARKS.find((p) => p.id === original.id),
      original,
    );
  for (const shop of CITY_LOCAL_PLACES) {
    const p = FORMAL_LANDMARKS.find((p) => p.id === shop.id)!;
    assert.deepEqual({ x: p.x, y: p.y }, shop.entrance ?? shop.point);
    assert.ok(existsSync(join(process.cwd(), 'public', formalPlaceImage(p))));
    const start = DISTRICT_PLACES.park;
    for (const [from, to] of [
      [start, p],
      [p, start],
    ]) {
      assert.ok(isWalkable(from));
      const route = pathTo(from, to);
      assert.ok(route.length);
      assert.deepEqual(route.at(-1), { x: to.x, y: to.y });
      let previous: Point = from;
      for (const point of route) {
        assert.ok(samePavement(previous, point));
        previous = point;
      }
    }
  }
});
void test('public interiors accept every existing playable identity without changing ages, identity or housing', () => {
  for (const site of FORMAL_PUBLIC_SITES)
    for (const actor of STREET_PARTNERS) {
      const s = fixture(site, actor),
        save = parseFateSave(formal(s));
      assert.equal(save.house!.street.actor, actor);
      for (const direction of ['up', 'down', 'left', 'right'] as const)
        for (let phase = 0; phase <= 6; phase++) {
          const sprite = houseResidentSprite(
            actor,
            direction,
            phase,
            'adult',
            site,
          )!;
          assert.ok(
            sprite && existsSync(join(process.cwd(), 'public', sprite.file)),
          );
          assert.ok(
            sprite.cropX >= 0 &&
              sprite.cropY >= 0 &&
              sprite.cropX + sprite.cellWidth <= sprite.imageWidth + 0.01 &&
              sprite.cropY + sprite.cellHeight <= sprite.imageHeight + 0.01,
            `${actor}/${site}/${phase}`,
          );
        }
    }
  const s = fixture('waver');
  s.life.waverStage = 'young';
  const plan = formalHousePlan('waver', 'waver', 'young');
  assert.equal(plan.cast[0].name, '韦伯·维尔维特');
  assert.equal(plan.rooms.lounge.actions.length, 0);
  assert.notEqual(
    plan.sprite('waver', 'down', 0).file,
    formalHousePlan('waver', 'waver', 'adult').sprite('waver', 'down', 0).file,
  );
  assert.equal(parseFateSave(formal(s)).life!.waverStage, 'young');
  room(
    s,
    'lounge',
    HOUSE_PREVIEWS.waver.rooms.lounge.scene.spots.find(
      (p) => p.id === HOUSE_PREVIEWS.waver.rooms.lounge.actions[0].id,
    )!.point,
  );
  s.action = HOUSE_PREVIEWS.waver.rooms.lounge.actions[0].id;
  assert.throws(() => parseFateSave(formal(s)), /动作记录/);
});

void test('new households map their own residents, meals and rest without changing anyone home assignment', () => {
  for (const site of ['waver', 'temple', 'church'] as const)
    for (const cast of HOUSE_PREVIEWS[site].cast) {
      const s = fixture(site, cast.id as PartnerId),
        housing = structuredClone(s.life.housing);
      assert.equal(houseHomeForActor(cast.id), site);
      assert.equal(s.care('meal').ok, false);
      room(s, s.careRoom('meal')!);
      s.life.people[s.controlled].hunger = 80;
      const time = s.life.minutes;
      assert.equal(s.care('meal').ok, true);
      assert.ok(s.life.minutes > time);
      assert.ok(s.life.people[s.controlled].hunger < 80);
      room(s, s.careRoom('nap')!);
      assert.equal(s.care('nap').ok, true);
      assert.deepEqual(s.life.housing, housing);
      assert.ok(parseFateSave(formal(s)));
    }
  const s = fixture('church');
  atHome(s, 'cu', 'eat');
  const loaded = new HouseGameSession(s.life, s.street);
  assert.equal(loaded.bodies.find((b) => b.id === 'cu')!.room, 'quarters');
});

void test('actual residents cross real thresholds, wait for an occupied doorway and obey local conversation distance and age', () => {
  for (const site of ['waver', 'temple', 'church'] as const) {
    const s = fixture(site),
      other = HOUSE_PREVIEWS[site].cast[1].id as PartnerId;
    atHome(s, other);
    const loaded = new HouseGameSession(s.life, s.street);
    const body = loaded.bodies.find((b) => b.id === other)!;
    room(loaded, body.room);
    assert.equal(loaded.conversation(other).ok, false);
    loaded.move(loaded.residentApproach(other)!, 'up', null);
    const talk = loaded.conversation(other);
    assert.equal(talk.ok, true);
    if (talk.ok && 'life' in talk) {
      if (site === 'waver') assert.equal(talk.entry.waverStage, 'adult');
      loaded.life = talk.life;
      assert.equal(loaded.conversation(other).ok, false);
    }
    room(loaded, 'hall');
    atHome(loaded, other, 'sleep');
    loaded.running = true;
    const crossed: string[] = [];
    for (let i = 0; i < 1000 && body.room !== loaded.careRoom('nap'); i++) {
      const from = body.room,
        previous = { ...body.point };
      loaded.tick(0.05);
      if (from === body.room) {
        assert.ok(gap(previous, body.point) <= 6.00001);
        assert.ok(
          interiorClearSegment(
            previous,
            body.point,
            HOUSE_PREVIEWS[site].rooms[from].scene,
          ),
        );
      } else {
        assert.ok(
          HOUSE_PREVIEWS[site].rooms[from].doors.some(
            (d) => d.to === body.room && gap(previous, d.point) <= 6.00001,
          ),
        );
        crossed.push(body.room);
      }
    }
    assert.deepEqual(crossed, ['hall', loaded.careRoom('nap')]);
    assert.equal(loaded.residentApproach(other), null);
    const back = HOUSE_PREVIEWS[site].rooms[body.room].doors[0];
    body.point = { ...back.point };
    room(loaded, 'hall', back.arrival);
    atHome(loaded, other);
    loaded.tick(0.05);
    assert.notEqual(body.room, 'hall');
    room(loaded, 'hall');
    loaded.tick(0.05);
    assert.equal(body.room, 'hall');
  }
});

void test('public visitors require actual arrival, exclude other interiors, and keep school busy rules', () => {
  const s = fixture('school', 'shirou'),
    door = formalEntrance('school');
  for (const id of ['rin', 'taiga', 'sakura'] as const)
    s.life.positions[id] = { ...door };
  s.life.people.rin.activity = {
    kind: 'study',
    school: true,
    phase: 'doing',
    remaining: 60,
    reason: '上课',
    source: 'rules',
  };
  s.life.people.taiga.activity = { ...s.life.people.rin.activity! };
  s.life.people.sakura.activity = {
    kind: 'visit',
    home: 'matou',
    phase: 'doing',
    remaining: 60,
    reason: '在家',
    source: 'rules',
  };
  const loaded = new HouseGameSession(s.life, s.street, undefined, 'school');
  assert.equal(loaded.bodies.find((b) => b.id === 'rin')!.room, 'classroom');
  assert.equal(loaded.bodies.find((b) => b.id === 'taiga')!.room, 'staffroom');
  assert.equal(
    loaded.bodies.some((b) => b.id === 'sakura'),
    false,
  );
  room(loaded, 'classroom');
  loaded.move(loaded.residentApproach('rin')!, 'up', null);
  assert.match(loaded.conversation('rin').message, /上课/);
  loaded.life.people.rin.activity!.phase = 'going';
  assert.equal(insidePublicBuilding(loaded.life, 'rin', 'school'), false);
  assert.equal(loaded.residentApproach('rin'), null);
});

void test('public self-study and shopping use existing rewards and cooldowns; small shops add no invented economy', () => {
  const s = fixture('school', 'shirou');
  assert.equal(s.publicAction({ type: 'study' }).ok, false);
  room(s, 'library');
  assert.equal(s.publicAction({ type: 'study' }).ok, true);
  const after = JSON.stringify(s.life);
  assert.equal(s.publicAction({ type: 'study' }).ok, false);
  assert.equal(JSON.stringify(s.life), after);
  const shop = fixture('shops', 'shirou');
  assert.equal(shop.publicAction({ type: 'shop' }).ok, true);
  const purchased = JSON.stringify(shop.life);
  assert.equal(shop.publicAction({ type: 'shop' }).ok, false);
  assert.equal(JSON.stringify(shop.life), purchased);
  for (const site of FORMAL_PUBLIC_SITES.filter(
    (id) => !['school', 'shops', 'cafe'].includes(id),
  )) {
    const local = fixture(site),
      initial = JSON.stringify(local.life);
    assert.equal(local.publicAction({ type: 'shop' }).ok, false);
    assert.equal(local.care('meal').ok, false);
    assert.equal(JSON.stringify(local.life), initial);
  }
});

void test('cafe ordering pauses, needs an actual choice and finish, and cancellation grants no meal', () => {
  const s = fixture('cafe', 'shirou');
  s.life.people.shirou.hunger = 80;
  assert.equal(s.publicAction({ type: 'order', order: 'set-meal' }).ok, true);
  assert.equal(s.life.people.shirou.hunger, 80);
  assert.equal(s.publicAction({ type: 'finish' }).ok, false);
  const outing = currentPublicOuting(s.life, s.controlled)!;
  for (let i = 0; i < 30; i++) s.tick(0.05);
  assert.equal(outing.progress, 0);
  s.running = true;
  s.clockSpeed = 4;
  for (let i = 0; i < 500 && outing.phase === 'ongoing'; i++) s.tick(0.05);
  assert.equal(outing.phase, 'choice');
  room(s, 'prep');
  assert.equal(s.publicAction({ type: 'choose', choice: 'slow' }).ok, false);
  room(s, 'window');
  assert.equal(s.publicAction({ type: 'choose', choice: 'slow' }).ok, true);
  for (
    let i = 0;
    i < 600 && currentPublicOuting(s.life, s.controlled)?.phase !== 'ready';
    i++
  )
    s.tick(0.05);
  assert.equal(outing.phase, 'ready');
  const beforeFinish = s.life.people.shirou.hunger;
  assert.equal(s.publicAction({ type: 'finish' }).ok, true);
  assert.ok(s.life.people.shirou.hunger < beforeFinish);
  assert.equal(s.publicAction({ type: 'finish' }).ok, false);
  assert.ok(parseFateSave(formal(s)));
  const cancelled = fixture('cafe', 'shirou'),
    hunger = cancelled.life.people.shirou.hunger;
  cancelled.publicAction({ type: 'order', order: 'set-meal' });
  assert.equal(cancelled.publicAction({ type: 'cancel' }).ok, true);
  assert.equal(cancelled.life.people.shirou.hunger, hunger);
  assert.equal(currentPublicOuting(cancelled.life, 'shirou'), undefined);
});

void test('public saves reject impossible room, entry, identity and conflicting indoor state without changing the original', () => {
  const save = formal(fixture('cafe', 'shirou')),
    original = JSON.stringify(save);
  const edits: ((s: FateSave) => void)[] = [
    (s) => {
      s.house!.home = 'waver';
    },
    (s) => {
      s.house!.location.room = 'classroom';
    },
    (s) => {
      s.house!.location.point = { x: -10, y: 0 };
    },
    (s) => {
      s.house!.street.point = { x: 0, y: 0 };
    },
    (s) => {
      s.life!.indoor = {
        actor: 'shirou',
        home: 'emiya',
        layout: 2,
        x: 360,
        y: 230,
      };
    },
    (s) => {
      s.life!.positions.shirou.x += 1;
    },
  ];
  for (const edit of edits) {
    const broken = structuredClone(save);
    edit(broken);
    assert.throws(() => parseFateSave(broken));
  }
  assert.equal(JSON.stringify(save), original);
});
void test('all new formal rooms block a second background clock before any upstream call', async () => {
  for (const site of SITES) {
    const backup = createFateBackup(formal(fixture(site)));
    let called = false;
    await assert.rejects(
      runBackgroundRound(backup, async () => {
        called = true;
        return {};
      }),
      /先走回街道/,
    );
    assert.equal(called, false);
  }
});
