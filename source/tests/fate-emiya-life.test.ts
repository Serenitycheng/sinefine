import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EmiyaLifeSession,
  EMIYA_LIFE_KEY,
  createEmiyaLifeSave,
  parseEmiyaLifeSave,
} from '../lib/fate-emiya-life';
import {
  EMIYA_ACTIVITIES,
  EMIYA_ENTRY,
  EMIYA_ROOMS,
} from '../lib/fate-emiya-house';
import { indoorRoom } from '../lib/fate-indoor-map';
import {
  SHIROU_LIFE_SPRITES,
  emiyaActivityPose,
} from '../lib/fate-emiya-actions';
import { FATE_STORAGE_KEY } from '../lib/fate-state';
import { homeOf } from '../lib/fate-housing';

void test('the local playtest copies the actual life engine without changing the original save or identities', () => {
  const original = createEmiyaLifeSave();
  const before = JSON.stringify(original);
  const session = new EmiyaLifeSession(original);
  session.wait(30);
  assert.equal(JSON.stringify(original), before);
  assert.notEqual(EMIYA_LIFE_KEY, FATE_STORAGE_KEY);
  assert.equal(homeOf('shirou', session.life.housing), 'emiya');
  assert.equal(homeOf('illya', session.life.housing), 'einzbern');
  assert.ok(session.life.minutes > original.life.minutes);
});

void test('the sample location restores exactly while formal room IDs and pavement coordinates retain their meaning', () => {
  const session = new EmiyaLifeSession();
  const street = { ...session.life.positions.shirou };
  for (const room of Object.values(EMIYA_ROOMS)) {
    const location = { room: room.id, point: { x: 500, y: 560 } };
    session.move(location, true);
    if (room.zone)
      assert.equal(indoorRoom(session.life.indoor!, 'emiya'), room.zone);
    if (room.id === 'forecourt' || room.id === 'garden')
      assert.equal(session.life.indoor, undefined);
    const restored = new EmiyaLifeSession(
      parseEmiyaLifeSave(JSON.parse(JSON.stringify(session.save()))),
    );
    assert.deepEqual(restored.location, location);
    assert.equal(restored.meal, true);
    assert.deepEqual(restored.life.positions.shirou, street);
  }
});

void test('care requires the real furniture approach and meal, then applies the existing twenty-minute recovery', () => {
  const session = new EmiyaLifeSession();
  const sit = EMIYA_ACTIVITIES.find((a) => a.id === 'sit')!;
  const eat = EMIYA_ACTIVITIES.find((a) => a.id === 'eat')!;
  const start = session.life.minutes;
  assert.equal(session.complete(sit, EMIYA_ENTRY, false).ok, false);
  assert.equal(
    session.complete(eat, { room: eat.room, point: eat.point }, false).ok,
    false,
  );
  assert.equal(session.life.minutes, start);
  session.life.people.shirou.energy = 30;
  const result = session.complete(
    sit,
    { room: sit.room, point: sit.point },
    false,
  );
  assert.equal(result.ok, true);
  assert.ok(Math.abs(session.life.minutes - start - 20) < 1e-5);
  assert.ok(session.life.people.shirou.energy > 30);
  assert.equal(session.life.events.at(-1)?.care?.person, 'shirou');
  assert.equal(session.life.events.at(-1)?.care?.duration, 20);
});

void test('cancelled presentation has no completion reward and pause or zero foreground time cannot catch up', () => {
  const session = new EmiyaLifeSession();
  const start = session.life.minutes;
  session.running = false;
  session.tick(40, EMIYA_ENTRY, false);
  session.running = true;
  session.tick(0, EMIYA_ENTRY, false);
  assert.equal(session.life.minutes, start);
  assert.equal(session.life.events.filter((e) => e.care).length, 0);
  session.tick(40, EMIYA_ENTRY, false);
  assert.ok(
    session.life.minutes > start && session.life.minutes - start < 0.01,
  );
});

void test('an entire day retains finite needs, real NPC decisions and a parseable restorable snapshot', () => {
  const session = new EmiyaLifeSession();
  const start = session.life.minutes;
  session.wait(720);
  session.wait(720);
  assert.ok(Math.abs(session.life.minutes - start - 1440) < 1e-5);
  assert.ok(session.life.people.saber.choices > 0);
  assert.ok(session.life.people.rin.choices > 0);
  for (const person of Object.values(session.life.people)) {
    for (const value of [person.hunger, person.energy, person.social])
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 100);
  }
  const parsed = parseEmiyaLifeSave(JSON.parse(JSON.stringify(session.save())));
  assert.equal(parsed.life.minutes, session.life.minutes);
  assert.deepEqual(parsed.life.housing, session.life.housing);
  assert.ok(parsed.life.events.length > 0);
});

void test('invalid or blocked playtest coordinates are rejected without modifying the source record', () => {
  const source = createEmiyaLifeSave();
  source.location = { room: 'rest', point: { x: 682, y: 410 } };
  const before = JSON.stringify(source);
  assert.throws(() => parseEmiyaLifeSave(source), /存档无效/);
  assert.equal(JSON.stringify(source), before);
  assert.throws(
    () => parseEmiyaLifeSave({ ...source, version: 2 }),
    /存档无效/,
  );
});

void test('Shirou actions retain transparent complete frame bounds and never use Illya identity pixels', () => {
  const sheet = SHIROU_LIFE_SPRITES;
  const png = readFileSync(resolve('public', sheet.path.slice(1)));
  assert.equal(png.readUInt32BE(16), sheet.width);
  assert.equal(png.readUInt32BE(20), sheet.height);
  assert.equal(png[25], 6);
  for (const frames of Object.values(sheet.frames))
    for (const frame of frames) {
      assert.ok(frame.bounds.x > 0 && frame.bounds.y > 0);
      assert.ok(frame.bounds.x + frame.bounds.width < frame.width);
      assert.ok(frame.bounds.y + frame.bounds.height < frame.height);
      assert.ok(
        frame.x + frame.width <= sheet.width &&
          frame.y + frame.height <= sheet.height,
      );
    }
  for (const activity of EMIYA_ACTIVITIES) {
    const pose = emiyaActivityPose(activity, 0, 'shirou');
    assert.deepEqual(pose.frame, sheet.frames[pose.pose][0]);
  }
});
