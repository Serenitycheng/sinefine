import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FATE_CLOCK_SPEEDS,
  FATE_WALK_PACES,
  FATE_CLOCK_SPEED_KEY,
  FATE_WALK_PACE_KEY,
  clockRate,
  clockSpeedLabel,
  parseFateClockSpeed,
  parseFateWalkPace,
  walkPaceLabel,
} from '../lib/fate-clock';
import { advanceDailyLife, createDailyLife } from '../lib/fate-life';
import { createStreetActors } from '../lib/street';
import { homeOf } from '../lib/fate-housing';
import { rememberEncounter } from '../lib/fate-social';

function walkingScene() {
  const life = createDailyLife();
  const actors = createStreetActors();
  const walker = actors.find((actor) => actor.id === 'cu')!;
  Object.assign(walker, { x: 1550, y: 907, path: [{ x: 1700, y: 907 }] });
  Object.assign(life.people.cu, {
    hunger: 10,
    energy: 90,
    activity: {
      kind: 'walk',
      phase: 'going',
      remaining: 20,
      reason: '继续走过桥面。',
      source: 'rules',
    },
  });
  life.nextEncounter = life.minutes + 10000;
  return { life, actors, walker, started: life.minutes };
}

function simulateSeconds(
  scene: ReturnType<typeof walkingScene>,
  rates: { clockRate?: number; motionRate?: number },
) {
  for (let frame = 0; frame < 20; frame++)
    advanceDailyLife(scene.life, scene.actors, 0.05, {
      running: true,
      speed: 1,
      controlled: 'admin',
      ...rates,
    });
}

void test('each clock choice matches its displayed wall time and defaults to six seconds per game minute', () => {
  const seconds = [12, 6, 3, 1.5];
  FATE_CLOCK_SPEEDS.forEach((speed, index) => {
    assert.equal(clockRate(speed) * seconds[index], 1);
    assert.equal(
      clockSpeedLabel(speed),
      `现实 ${seconds[index]} 秒 = 游戏 1 分钟`,
    );
    assert.equal(parseFateClockSpeed(String(speed)), speed);
    assert.equal(parseFateClockSpeed(speed), speed);
  });
  assert.equal(1 / clockRate(parseFateClockSpeed(null)), 6);
});

void test('walk pace has its own valid settings and malformed stored values cannot create extreme speed', () => {
  assert.notEqual(FATE_WALK_PACE_KEY, FATE_CLOCK_SPEED_KEY);
  assert.deepEqual(FATE_WALK_PACES.map(walkPaceLabel), [
    '慢走',
    '正常',
    '快走',
  ]);
  for (const pace of FATE_WALK_PACES) {
    assert.equal(parseFateWalkPace(pace), pace);
    assert.equal(parseFateWalkPace(String(pace)), pace);
  }
  for (const value of [
    null,
    undefined,
    NaN,
    Infinity,
    -1,
    0,
    100,
    '',
    'fast',
    {},
    true,
  ]) {
    assert.equal(parseFateWalkPace(value), 1);
    assert.equal(parseFateClockSpeed(value), 1);
  }
  assert.equal(parseFateWalkPace(4), 1);
  assert.equal(parseFateClockSpeed(1.4), 1);
});

void test('clock selections advance different game time while the same real second moves an NPC equally far', () => {
  const scenes = FATE_CLOCK_SPEEDS.map((speed) => {
    const scene = walkingScene();
    simulateSeconds(scene, { clockRate: clockRate(speed), motionRate: 1 });
    assert.ok(
      Math.abs(scene.life.minutes - scene.started - clockRate(speed)) < 1e-8,
    );
    assert.ok(Math.abs(scene.walker.x - 1550 - 55) < 1e-8);
    assert.equal(scene.walker.y, 907);
    return scene;
  });
  assert.ok(scenes[3].life.minutes > scenes[0].life.minutes);
  assert.equal(scenes[3].walker.x, scenes[0].walker.x);
});

void test('walk pace changes real distance without changing the clock, including a 50ms frame', () => {
  const scenes = FATE_WALK_PACES.map((pace) => {
    const scene = walkingScene();
    simulateSeconds(scene, { clockRate: clockRate(1), motionRate: pace });
    assert.ok(Math.abs(scene.life.minutes - scene.started - 1 / 6) < 1e-8);
    assert.ok(
      Math.abs(scene.walker.x - 1550 - 55 * pace) < 1e-8,
      `${pace} walking must retain its pace in 50ms frames`,
    );
    return scene;
  });
  assert.equal(scenes[0].life.minutes, scenes[2].life.minutes);
  assert.ok(scenes[0].walker.x < scenes[1].walker.x);
  assert.ok(scenes[1].walker.x < scenes[2].walker.x);
});

void test('schedule travel and promised meetings use the selected pace through the same engine', () => {
  for (const mode of ['schedule', 'appointment'] as const) {
    const scene = walkingScene();
    if (mode === 'schedule') {
      // Rin is returning from an attended afternoon class; this uses the
      // schedule movement branch rather than the ordinary leisure branch.
      scene.walker = scene.actors.find((a) => a.id === 'rin')!;
      Object.assign(scene.walker, {
        x: 1550,
        y: 907,
        path: [{ x: 1400, y: 907 }],
      });
      scene.life.agenda.push({
        id: '0:rin:student-pm',
        day: 0,
        person: 'rin',
        duty: 'student-pm',
        attended: 150,
        status: 'finished',
        returned: false,
      });
      Object.assign(scene.life.people.rin, {
        hunger: 10,
        energy: 90,
        activity: {
          kind: 'rest',
          phase: 'going',
          remaining: 30,
          source: 'rules',
          routine: '0:rin:student-pm',
          returning: true,
          home: homeOf('rin', scene.life.housing),
          reason: '放学后回家。',
        },
      });
    } else {
      const event = {
        id: scene.life.nextId++,
        minute: scene.life.minutes,
        text: '约好一起散步。',
        dialogue: {
          speaker: 'cu' as const,
          target: 'diarmuid' as const,
          source: 'preset' as const,
          message: '一小时后在林荫路边一起散步吧。',
          reply: '好，约好了。',
        },
      };
      scene.life.events.push(event);
      rememberEncounter(scene.life, event);
      const appointment = scene.life.appointments[0];
      assert.ok(appointment);
      scene.life.minutes = appointment.start - 10;
      scene.started = scene.life.minutes;
      scene.life.people.cu.activity!.meeting = appointment.id;
    }
    simulateSeconds(scene, { clockRate: clockRate(1), motionRate: 1.4 });
    assert.ok(Math.abs(scene.life.minutes - scene.started - 1 / 6) < 1e-8);
    assert.ok(
      Math.abs(Math.abs(scene.walker.x - 1550) - 77) < 1e-8,
      `${mode} must move at the selected fast pace`,
    );
    assert.equal(scene.walker.y, 907);
  }
});

void test('paused or invalid frames never advance time or routes, regardless of selected rates', () => {
  const scene = walkingScene();
  const before = structuredClone({ life: scene.life, actors: scene.actors });
  advanceDailyLife(scene.life, scene.actors, 0.05, {
    running: false,
    speed: 1,
    controlled: 'admin',
    clockRate: clockRate(4),
    motionRate: 1.4,
  });
  for (const dt of [NaN, Infinity, -1, 0])
    advanceDailyLife(scene.life, scene.actors, dt, {
      running: true,
      speed: 1,
      controlled: 'admin',
      clockRate: clockRate(4),
      motionRate: 1.4,
    });
  assert.deepEqual({ life: scene.life, actors: scene.actors }, before);
});

void test('invalid rate inputs stay finite and omitted rates retain the legacy simulation clock', () => {
  const legacy = walkingScene();
  simulateSeconds(legacy, {});
  assert.ok(Math.abs(legacy.life.minutes - legacy.started - 2) < 1e-8);
  assert.equal(legacy.walker.x, 1605);
  for (const value of [NaN, Infinity, -Infinity]) {
    const scene = walkingScene();
    simulateSeconds(scene, { clockRate: value, motionRate: value });
    assert.equal(scene.life.minutes, legacy.life.minutes);
    assert.equal(scene.walker.x, legacy.walker.x);
  }
  for (const value of [-100, 0, 100]) {
    const scene = walkingScene();
    simulateSeconds(scene, { clockRate: value, motionRate: value });
    const elapsed = scene.life.minutes - scene.started;
    assert.ok(elapsed >= 1 / 24 - 1e-8 && elapsed <= 8 + 1e-8);
    assert.ok(scene.walker.x - 1550 >= 22 - 1e-8);
    assert.ok(scene.walker.x - 1550 <= 110 + 1e-8);
  }
});
