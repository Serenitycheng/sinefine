import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emiyaCameraBody,
  emiyaCameraZoom,
  emiyaClampCamera,
} from '../lib/fate-emiya-camera';
import {
  emiyaResidentPresentation,
  emiyaResidentPose,
} from '../lib/fate-emiya-presentation';
import {
  emiyaWalkAdvance,
  saberWalkSprite,
  SABER_GAIT,
  EMIYA_VISITOR_SPRITES,
  emiyaVisitorSprite,
} from '../lib/fate-emiya-walk';
import { readFileSync } from 'node:fs';
import {
  EMIYA_DOORS,
  EMIYA_ENTRY,
  EMIYA_ROOMS,
  EMIYA_ACTIVITIES,
  type EmiyaLocation,
} from '../lib/fate-emiya-house';
import {
  createEmiyaLifeSave,
  parseEmiyaLifeSave,
} from '../lib/fate-emiya-life';
import { joinMeal, mealActivity, type HomeMeal } from '../lib/fate-meals';
import { SABER_LIFE_SPRITES } from '../lib/fate-emiya-actions';
import {
  EmiyaResidents,
  type EmiyaResidentBody,
} from '../lib/fate-emiya-residents';
import { lifeDestination, type LifeAction } from '../lib/fate-life';
import { interiorDepth } from '../lib/fate-city-interior-scenes';
import { cityCameraFollow } from '../lib/fate-city-art-controls';

function resident(kind: LifeAction = 'study') {
  const save = createEmiyaLifeSave();
  save.life.people.saber.activity = {
    kind,
    home: 'emiya',
    phase: 'doing',
    remaining: 30,
    source: 'rules',
    reason: '正在家里。',
  };
  save.life.positions.saber = lifeDestination('saber', kind, 'emiya');
  const house = new EmiyaResidents(save.life, EMIYA_ENTRY);
  return { save, house, body: house.all()[0] };
}

void test('Saber keeps a single model scale across walking phases and direction changes, with a separate idle frame', () => {
  const scales = new Set<number>();
  for (const direction of ['down', 'left', 'right', 'up'] as const) {
    const idle = saberWalkSprite(direction, 0);
    for (let frame = 1; frame <= 5; frame++) {
      const walking = saberWalkSprite(direction, frame);
      scales.add(walking.scale);
      assert.notDeepEqual(walking.frame, idle.frame);
      assert.ok(
        Math.abs(
          walking.frame.anchorY -
            walking.frame.bounds.y -
            walking.frame.bounds.height,
        ) <= 2,
      );
    }
    assert.deepEqual(
      saberWalkSprite(direction, 6),
      saberWalkSprite(direction, 1),
    );
  }
  assert.equal(scales.size, 1);
});

void test('Saber folded poses retain one scale per action pair and a body size consistent with her standing model', () => {
  const sheet = SABER_LIFE_SPRITES;
  const heights = (pose: keyof typeof sheet.frames) =>
    sheet.frames[pose].map((frame) => frame.bounds.height * sheet.scales[pose]);
  assert.ok(Math.abs(Math.max(...heights('cook')) - 295) < 1e-7);
  for (const pose of ['sit', 'read', 'eat'] as const) {
    for (const height of heights(pose)) assert.ok(height > 160 && height < 205);
  }
  const sleepLength = Math.max(
    ...sheet.frames.sleep.map(
      (frame) => frame.bounds.width * sheet.scales.sleep,
    ),
  );
  assert.ok(Math.abs(sleepLength - 295) < 1e-7);
  const { body } = resident('eat');
  for (const seconds of [0, 0.86])
    assert.equal(
      emiyaResidentPresentation({ ...body, seconds })!.scale,
      sheet.scales.eat,
    );
});

void test('Saber cadence follows real travel at different frame rates and depths, and blocking immediately gives the idle phase', () => {
  const before: EmiyaLocation = { room: 'table', point: { x: 500, y: 250 } };
  const single = emiyaWalkAdvance(0, before, 275, SABER_GAIT);
  for (const count of [30, 60, 144]) {
    let state = { walked: 0, frame: 0 };
    for (let i = 0; i < count; i++)
      state = emiyaWalkAdvance(state.walked, before, 275 / count, SABER_GAIT);
    assert.ok(Math.abs(state.walked - single.walked) < 1e-7);
    assert.equal(state.frame, single.frame);
    assert.deepEqual(emiyaWalkAdvance(state.walked, before, 0, SABER_GAIT), {
      walked: 0,
      frame: 0,
    });
  }
  const far = emiyaWalkAdvance(
    0,
    { room: 'table', point: { x: 500, y: 560 } },
    275,
    SABER_GAIT,
  );
  assert.ok(Math.abs(far.walked - single.walked) < 1e-7);
  const { house, save, body } = resident();
  save.life.people.saber.activity!.kind = 'eat';
  assert.equal(house.step(save.life, EMIYA_ENTRY, 0.05), true);
  assert.ok(body.frame > 0);
  house.step(save.life, EMIYA_ENTRY, 0.05, false);
  assert.equal(body.frame, 0);
  assert.equal(
    emiyaResidentPresentation(body)!.frame,
    saberWalkSprite(body.direction, 0).frame,
  );
});

void test('a visitor waiting in the hall and a helper at the table do not pretend to sit or cook at an absent piece', () => {
  const { body } = resident('visit');
  const waiting = {
    ...body,
    room: 'hall' as const,
    point: { x: 480, y: 445 },
    phase: 'doing' as const,
  };
  assert.equal(emiyaResidentPose(waiting), null);
  const helper = {
    ...body,
    room: 'table' as const,
    point: { x: 695, y: 455 },
    kind: 'cook' as const,
  };
  assert.equal(emiyaResidentPose(helper), null);
  assert.equal(emiyaResidentPose({ ...body, id: 'rin' }), null);
});

void test('sleep and bench sprites sit on their actual furniture, share contact depth, and leave navigation coordinates untouched', () => {
  const { body } = resident('sleep');
  const bench: EmiyaResidentBody = {
    ...body,
    room: 'garden',
    point: { x: 600, y: 320 },
    kind: 'rest',
  };
  for (const person of [body, bench]) {
    const before = JSON.stringify(person);
    const presentation = emiyaResidentPresentation(person)!;
    const contact = presentation.contact!;
    assert.ok(contact);
    const furniture = EMIYA_ROOMS[person.room].pieces.find(
      (p) => p.kind === (person.room === 'rest' ? 'futon' : 'bench'),
    )!;
    assert.ok(
      contact.point.x > furniture.footprint.x &&
        contact.point.x < furniture.footprint.x + furniture.footprint.width,
    );
    assert.ok(
      contact.point.y > furniture.footprint.y &&
        contact.point.y < furniture.footprint.y + furniture.footprint.height,
    );
    assert.equal(contact.elevation, furniture.height);
    assert.ok(contact.z > furniture.footprint.y + furniture.footprint.height);
    assert.equal(JSON.stringify(person), before);
    const floor = EMIYA_ROOMS[person.room].scene.floor;
    assert.ok(interiorDepth(contact.point, floor) > 0);
    assert.equal(emiyaResidentPose({ ...person, phase: 'walking' }), null);
  }
});

void test('desktop and phone cameras preserve full bodies at every door arrival and raised furniture pose while respecting painting edges', () => {
  const targets = [
    ...EMIYA_DOORS.map((door) => ({
      location: { room: door.to, point: door.arrival },
      active: null,
    })),
    ...EMIYA_ACTIVITIES.map((activity) => ({
      location: { room: activity.room, point: activity.point },
      active: { id: activity.id, seconds: 1 },
    })),
  ];
  for (const size of [
    { width: 1280, height: 580 },
    { width: 390, height: 460 },
    { width: 320, height: 280 },
    { width: 760, height: 180 },
  ]) {
    const zoom = emiyaCameraZoom(100, size);
    assert.ok(zoom >= 1 && zoom <= 2.5);
    const scale = Math.min(size.width / 1600, size.height / 900) * zoom;
    for (const target of targets) {
      const before = JSON.stringify(target);
      const body = emiyaCameraBody(target.location, target.active, 'shirou');
      const origin = emiyaClampCamera(
        { x: -100000, y: 100000 },
        scale,
        size,
        body,
      );
      assert.ok(origin.x + body.x * scale >= -1e-6, target.location.room);
      assert.ok(origin.y + body.y * scale >= -1e-6, target.location.room);
      assert.ok(
        origin.x + (body.x + body.width) * scale <= size.width + 1e-6,
        target.location.room,
      );
      assert.ok(
        origin.y + (body.y + body.height) * scale <= size.height + 1e-6,
        target.location.room,
      );
      if (1600 * scale > size.width)
        assert.ok(origin.x <= 0 && origin.x >= size.width - 1600 * scale);
      if (900 * scale > size.height)
        assert.ok(origin.y <= 0 && origin.y >= size.height - 900 * scale);
      assert.equal(JSON.stringify(target), before);
    }
  }
});

void test('following at a background edge settles on the rendered origin without accumulating an invisible pan offset', () => {
  const size = { width: 1280, height: 580 };
  const scale =
    Math.min(size.width / 1600, size.height / 900) * emiyaCameraZoom(2.5, size);
  const location: EmiyaLocation = {
    room: 'forecourt',
    point: { x: 960, y: 550 },
  };
  const body = emiyaCameraBody(location, null, 'shirou');
  const foot = { x: body.x + body.width / 2, y: body.y + body.height };
  let origin = emiyaClampCamera({ x: 0, y: 0 }, scale, size, body);
  for (let i = 0; i < 300; i++)
    origin = emiyaClampCamera(
      cityCameraFollow(origin, foot, scale, size, 1 / 60),
      scale,
      size,
      body,
    );
  const settled = { ...origin };
  for (let i = 0; i < 300; i++)
    origin = emiyaClampCamera(
      cityCameraFollow(origin, foot, scale, size, 1 / 60),
      scale,
      size,
      body,
    );
  assert.ok(
    Math.abs(origin.x - settled.x) < 0.001 &&
      Math.abs(origin.y - settled.y) < 0.001,
  );
});

void test('new visitor sprites keep their native alpha, complete figures and fixed gait-row scale, including mirrored right walking', () => {
  for (const id of ['sakura', 'taiga'] as const) {
    const sheet = EMIYA_VISITOR_SPRITES[id];
    const png = readFileSync(`public${sheet.path}`);
    assert.equal(png[25], 6);
    assert.equal(png.readUInt32BE(16), sheet.width);
    assert.equal(png.readUInt32BE(20), sheet.height);
    for (const direction of ['down', 'left', 'right', 'up'] as const) {
      const scales = new Set<number>();
      for (let phase = 0; phase <= 6; phase++) {
        const draw = emiyaVisitorSprite(id, direction, phase);
        const f = draw.frame;
        assert.ok(
          f.x >= 0 &&
            f.y >= 0 &&
            f.x + f.width <= sheet.width &&
            f.y + f.height <= sheet.height,
        );
        assert.ok(
          f.bounds.x > 0 &&
            f.bounds.y > 0 &&
            f.bounds.x + f.bounds.width < f.width &&
            f.bounds.y + f.bounds.height < f.height,
        );
        if (phase > 0) scales.add(draw.scale);
        assert.ok(
          f.bounds.height * draw.scale > 270 &&
            f.bounds.height * draw.scale <= 295.01,
        );
      }
      assert.equal(scales.size, 1);
    }
    for (let phase = 1; phase <= 6; phase++) {
      const left = emiyaVisitorSprite(id, 'left', phase),
        right = emiyaVisitorSprite(id, 'right', phase);
      assert.deepEqual(left.frame, right.frame);
      assert.equal(left.mirror, false);
      assert.equal(right.mirror, true);
    }
    assert.ok(
      sheet.walking.left.frames[0].bounds.width >
        sheet.walking.left.frames[2].bounds.width * 1.1,
    );
  }
});

void test('the three actual family visitors use separate meal contacts and the new art does not invent attendance', () => {
  const { save } = resident('eat');
  let house = new EmiyaResidents(save.life, EMIYA_ENTRY);
  assert.deepEqual(
    house.all().map((body) => body.id),
    ['saber'],
  );
  const day = Math.floor(save.life.minutes / 1440);
  const meal: HomeMeal = {
    id: `${day}:dinner:emiya`,
    home: 'emiya',
    day,
    slot: 'dinner',
    cook: 'shirou',
    phase: 'ready',
    startedAt: save.life.minutes,
    expiresAt: save.life.minutes + 150,
    participants: [],
  };
  save.life.meals = [meal];
  for (const id of ['saber', 'sakura', 'taiga'] as const) {
    save.life.people[id].activity = { ...mealActivity(meal), phase: 'doing' };
    save.life.positions[id] = lifeDestination(id, 'eat', 'emiya');
    joinMeal(save.life, id, 'shirou', () => {});
  }
  assert.doesNotThrow(() => parseEmiyaLifeSave(save));
  house = new EmiyaResidents(save.life, {
    room: 'table',
    point: { x: 695, y: 455 },
  });
  const bodies = house.all();
  assert.equal(bodies.length, 3);
  for (const body of bodies) {
    assert.equal(emiyaResidentPresentation(body)?.contact?.pose, 'eat');
    for (const other of bodies)
      if (body.id !== other.id)
        assert.ok(
          Math.hypot(
            body.point.x - other.point.x,
            body.point.y - other.point.y,
          ) > 100,
        );
  }
  assert.equal(emiyaResidentPresentation({ ...bodies[0], id: 'rin' }), null);
});
