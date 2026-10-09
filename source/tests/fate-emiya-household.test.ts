import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmiyaLifeSave,
  EmiyaLifeSession,
  parseEmiyaLifeSave,
} from '../lib/fate-emiya-life';
import {
  EMIYA_ACTIVITIES,
  EMIYA_ROOMS,
  type EmiyaLocation,
} from '../lib/fate-emiya-house';
import {
  EMIYA_HOUSEHOLD_ACTIVITIES,
  emiyaContextDialogue,
  emiyaMealKey,
} from '../lib/fate-emiya-household';
import { lifeDestination, type LifeAction } from '../lib/fate-life';
import { interiorWalkable } from '../lib/fate-city-interior-navigation';
import { bondKey } from '../lib/fate-social';

function fixture(kind: LifeAction = 'study', food = true) {
  const save = createEmiyaLifeSave();
  save.running = false;
  save.life.people.saber.activity = {
    kind,
    home: 'emiya',
    phase: 'doing',
    remaining: 30,
    source: 'rules',
    reason: '在家里安排日常。',
  };
  save.life.positions.saber = lifeDestination('saber', kind, 'emiya');
  if (food)
    save.life.meals = [
      {
        id: '0:dinner:emiya',
        day: 0,
        slot: 'dinner',
        home: 'emiya',
        cook: 'shirou',
        phase: 'ready',
        startedAt: save.life.minutes,
        expiresAt: save.life.minutes + 150,
        participants: [],
      },
    ];
  return new EmiyaLifeSession(save);
}
function approach(session: EmiyaLifeSession) {
  const b = session.house.all().find((b) => b.id === 'saber')!;
  const location: EmiyaLocation = {
    room: b.room,
    point: { x: b.point.x + (b.kind === 'cook' ? 80 : -80), y: b.point.y },
  };
  assert.ok(interiorWalkable(location.point, EMIYA_ROOMS[location.room].scene));
  session.move(location, session.meal);
}
function seated(session: EmiyaLifeSession) {
  approach(session);
  assert.equal(session.inviteToMeal('saber').status, 'walking');
  session.running = true;
  const rooms: string[] = [];
  for (let step = 0; step < 1500; step++) {
    const before = session.house.save()[0];
    session.tick(0.05, session.location, false);
    const b = session.house.all().find((b) => b.id === 'saber')!;
    assert.ok(interiorWalkable(b.point, EMIYA_ROOMS[b.room].scene));
    if (before.room === b.room)
      assert.ok(
        Math.hypot(before.point.x - b.point.x, before.point.y - b.point.y) <=
          7.25 + 1e-6,
      );
    if (rooms.at(-1) !== b.room) rooms.push(b.room);
    if (session.household.invitations[0].status === 'seated') break;
    assert.equal(session.life.meals[0].participants.includes('saber'), false);
  }
  assert.equal(session.household.invitations[0].status, 'seated');
  assert.deepEqual(rooms, ['study', 'table']);
  session.running = false;
}
const action = (id: string) =>
  [...EMIYA_ACTIVITIES, ...EMIYA_HOUSEHOLD_ACTIVITIES].find(
    (a) => a.id === id,
  )!;
function complete(session: EmiyaLifeSession, id: string) {
  const a = action(id);
  session.move({ room: a.room, point: a.point }, false);
  return session.complete(a, session.location, false);
}

void test('house topics reuse actual routine, care, preferences and shared memories without outside appointments', () => {
  const session = fixture();
  approach(session);
  const positions = JSON.stringify(session.life.positions);
  assert.equal(session.talk('saber', 'today').ok, true);
  assert.match(session.life.events.at(-1)!.interaction!.reply, /整理笔记/);
  assert.equal(session.talk('saber', 'today').ok, false);
  assert.equal(session.talk('saber', 'care').ok, true);
  assert.equal(session.talk('saber', 'preference').ok, true);
  assert.equal(session.life.appointments.length, 0);
  assert.equal(JSON.stringify(session.life.positions), positions);
  assert.ok(
    session.life.bonds[
      bondKey('shirou', 'saber', session.life.waverStage)
    ].memories.some((m) => m.impressions.some((i) => i.kind === 'care')),
  );
  assert.match(
    emiyaContextDialogue(session.life, 'saber', 'recall').reply,
    /真正做过/,
  );
});
void test('invitation requires actual proximity and a prepared household serving', () => {
  const session = fixture();
  assert.equal(session.inviteToMeal('saber').ok, false);
  assert.equal(session.household.invitations.length, 0);
  const noFood = fixture('study', false);
  approach(noFood);
  assert.equal(noFood.inviteToMeal('saber').ok, false);
  assert.equal(noFood.life.events.filter((e) => e.interaction).length, 0);
});
void test('accepted invitation walks through real doors and records dining only after physical arrival', () => {
  const session = fixture();
  seated(session);
  assert.equal(session.life.people.saber.activity?.kind, 'eat');
  assert.equal(session.life.meals[0].participants.includes('saber'), true);
  assert.equal(
    session.life.events.filter(
      (e) => e.meal?.kind === 'joined' && e.meal.participants.includes('saber'),
    ).length,
    1,
  );
  assert.equal(
    session.life.events.filter((e) => e.meal?.kind === 'shared').length,
    0,
  );
  const count = session.life.events.length;
  approach(session);
  assert.equal(session.inviteToMeal('saber').ok, false);
  assert.equal(session.life.events.length, count);
});
void test('busy and exhausted residents defer or decline without being recruited or rewarded', () => {
  const busy = fixture('cook');
  approach(busy);
  const before = JSON.stringify(busy.life.people.saber.activity);
  assert.equal(busy.inviteToMeal('saber').status, 'deferred');
  assert.equal(JSON.stringify(busy.life.people.saber.activity), before);
  assert.equal(busy.life.events.filter((e) => e.interaction).length, 0);
  const tired = fixture();
  tired.life.people.saber.energy = 5;
  approach(tired);
  assert.equal(tired.inviteToMeal('saber').status, 'declined');
  assert.equal(tired.life.people.saber.activity?.kind, 'study');
  assert.equal(tired.life.meals[0].participants.length, 0);
});
void test('cancel and expiry restore the interrupted activity and never teleport the resident', () => {
  const session = fixture();
  approach(session);
  const activity = structuredClone(session.life.people.saber.activity),
    body = JSON.stringify(session.house.save());
  assert.equal(session.inviteToMeal('saber').ok, true);
  assert.equal(session.cancelInvitation('saber').ok, true);
  assert.deepEqual(session.life.people.saber.activity, activity);
  assert.equal(JSON.stringify(session.house.save()), body);
  session.life.minutes += 3;
  assert.equal(session.inviteToMeal('saber').ok, true);
  session.life.minutes = session.life.meals[0].expiresAt + 1;
  session.tick(0.01, session.location, false);
  assert.equal(session.household.invitations.at(-1)!.status, 'done');
  assert.equal(session.life.meals[0].participants.includes('saber'), false);
});
void test('mid-walk invitation survives save, restores positions and stays still while paused', () => {
  const session = fixture();
  approach(session);
  session.inviteToMeal('saber');
  session.running = true;
  for (let i = 0; i < 30; i++) session.tick(0.05, session.location, false);
  session.running = false;
  const save = JSON.parse(JSON.stringify(session.save())),
    restored = new EmiyaLifeSession(parseEmiyaLifeSave(save));
  assert.deepEqual(restored.house.save(), session.house.save());
  assert.equal(restored.household.invitations[0].status, 'walking');
  const before = JSON.stringify(restored.house.save());
  restored.tick(10, restored.location, false);
  assert.equal(JSON.stringify(restored.house.save()), before);
  assert.equal(restored.life.meals[0].participants.length, 0);
});
void test('shared table setting, actual meal, waiting and cleanup complete a finite household cycle', () => {
  const session = fixture();
  seated(session);
  approach(session);
  assert.equal(session.requestHelp('set-table', 'saber').ok, true);
  const start = session.life.minutes;
  assert.equal(complete(session, 'set-table').ok, true);
  assert.ok(Math.abs(session.life.minutes - start - 4) < 1e-5);
  assert.equal(session.household.table.set, true);
  assert.equal(complete(session, 'set-table').ok, false);
  assert.equal(complete(session, 'eat').ok, true);
  assert.equal(session.household.table.dirty, true);
  assert.equal(
    session.life.events.filter(
      (e) =>
        e.meal?.kind === 'shared' && e.meal.participants.includes('shirou'),
    ).length,
    1,
  );
  approach(session);
  assert.equal(session.requestHelp('clear-table', 'saber').ok, true);
  assert.equal(session.activityPlan(action('clear-table')).ok, false);
  assert.equal(session.household.table.dirty, true);
  session.wait(12);
  assert.equal(session.household.help?.person, 'saber');
  assert.equal(complete(session, 'clear-table').ok, true);
  assert.equal(session.household.table.dirty, false);
  assert.equal(session.household.help, null);
  const finished = session.life.minutes;
  assert.equal(complete(session, 'clear-table').ok, false);
  assert.equal(session.life.minutes, finished);
  assert.match(
    emiyaContextDialogue(session.life, 'saber', 'recall').reply,
    /确实一起/,
  );
  assert.equal(
    parseEmiyaLifeSave(session.save()).household?.table.dirty,
    false,
  );
});
void test('help cancellation and absence never complete chores or grant completion care', () => {
  const session = fixture();
  seated(session);
  approach(session);
  const before = session.life.minutes;
  assert.equal(session.requestHelp('set-table', 'saber').ok, true);
  session.cancelHelp();
  assert.equal(session.household.table.set, false);
  assert.equal(session.life.minutes, before);
  assert.equal(
    session.life.events.some(
      (e) => e.text === '士郎与阿尔托莉雅一起摆好碗筷。',
    ),
    false,
  );
  session.life.minutes += 3;
  assert.equal(session.requestHelp('set-table', 'saber').ok, true);
  session.life.people.saber.activity = {
    kind: 'walk',
    phase: 'going',
    remaining: 20,
    source: 'rules',
    reason: '出门走走。',
  };
  session.tick(0.01, session.location, false);
  assert.equal(session.household.help, null);
  assert.equal(session.household.table.set, false);
  assert.equal(complete(session, 'set-table').ok, false);
  assert.equal(session.household.table.set, false);
});
void test('pending shared work survives parsing, but completion still requires both real bodies', () => {
  const session = fixture();
  seated(session);
  approach(session);
  session.requestHelp('set-table', 'saber');
  const restored = new EmiyaLifeSession(
    parseEmiyaLifeSave(JSON.parse(JSON.stringify(session.save()))),
  );
  assert.equal(restored.household.help?.activity, 'set-table');
  assert.deepEqual(restored.house.save(), session.house.save());
  restored.household.help!.point = { x: 430, y: 420 };
  restored.tick(0.01, restored.location, false);
  assert.equal(complete(restored, 'set-table').ok, false);
  assert.equal(restored.household.table.set, false);
});
void test('finished invitations and interrupted help cannot retain or restore an obsolete meal', () => {
  const busy = fixture('cook');
  busy.life.meals[0].cook = 'saber';
  busy.life.people.saber.activity!.meal = busy.life.meals[0].id;
  approach(busy);
  assert.equal(busy.inviteToMeal('saber').status, 'deferred');
  assert.equal(busy.household.invitations[0].previous, undefined);
  busy.life.people.saber.activity = null;
  busy.life.meals = [];
  assert.equal(
    parseEmiyaLifeSave(busy.save()).household!.invitations.length,
    1,
  );

  const session = fixture();
  seated(session);
  assert.equal(session.household.invitations[0].previous, undefined);
  approach(session);
  assert.equal(session.requestHelp('set-table', 'saber').ok, true);
  assert.equal(session.household.help!.previous!.kind, 'eat');
  session.life.meals = [];
  assert.equal(
    parseEmiyaLifeSave(session.save()).household!.help!.previous,
    null,
  );
  session.cancelHelp();
  assert.equal(session.life.people.saber.activity, null);
  assert.doesNotThrow(() => parseEmiyaLifeSave(session.save()));
});
void test('real resident reminders are deduplicated and do not fabricate relationship memories', () => {
  const session = fixture('study', false);
  approach(session);
  session.life.people.shirou.energy = 20;
  const events = session.life.events.length;
  for (let i = 0; i < 30; i++) session.tick(0.01, session.location, false);
  assert.equal(session.household.notices.length, 1);
  assert.equal(session.life.events.length, events);
  session.life.minutes += 121;
  session.tick(0.01, session.location, false);
  assert.equal(session.household.notices.length, 2);
  assert.equal(parseEmiyaLifeSave(session.save()).household?.notices.length, 2);
});
void test('invalid household and duplicate invitation records are rejected without replacing the source', () => {
  const session = fixture();
  approach(session);
  session.inviteToMeal('saber');
  const saved = session.save();
  const before = JSON.stringify(saved);
  assert.throws(
    () =>
      parseEmiyaLifeSave({
        ...saved,
        household: {
          ...saved.household!,
          invitations: [
            ...saved.household!.invitations,
            ...saved.household!.invitations,
          ],
        },
      }),
    /邀请记录无效/,
  );
  assert.throws(
    () =>
      parseEmiyaLifeSave({
        ...saved,
        household: {
          ...saved.household!,
          help: {
            activity: 'set-table',
            person: 'saber',
            key: emiyaMealKey(saved.life.meals[0]),
            point: { x: 800, y: 450 },
            previous: null,
          },
        },
      }),
    /共同家务记录无效/,
  );
  assert.equal(JSON.stringify(saved), before);
  assert.equal(parseEmiyaLifeSave(createEmiyaLifeSave()).household?.help, null);
});
