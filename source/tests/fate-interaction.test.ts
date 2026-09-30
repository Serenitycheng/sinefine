import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDailyLife,
  parseDailyLife,
  recentLifeEvents,
  type DailyLife,
} from '../lib/fate-life';
import {
  interactionStatus,
  liveEncounter,
  liveSpeech,
  nearbyResident,
  recordOnsiteConversation,
} from '../lib/fate-interaction';
import { interiorResidentPoint } from '../lib/fate-interior';
import { indoorRoom, isIndoorWalkable } from '../lib/fate-indoor-map';
import { STREET_PARTNERS } from '../lib/fate-cast';
import { FATE_HOMES, type HomeId } from '../lib/fate-housing';
import { createStreetActors, WALK_AREAS } from '../lib/street';
import { emptyFateSave, parseFateSave, type Exchange } from '../lib/fate-state';

function outside() {
  const life = createDailyLife(),
    actors = createStreetActors();
  const road = WALK_AREAS.find((r) => r.right - r.left > 200)!;
  const a = actors.find((actor) => actor.id === 'illya')!,
    b = actors.find((actor) => actor.id === 'shirou')!;
  Object.assign(a, {
    x: (road.left + road.right) / 2,
    y: (road.top + road.bottom) / 2,
  });
  Object.assign(b, { x: a.x + 30, y: a.y });
  for (const id of STREET_PARTNERS)
    if (id !== 'illya' && id !== 'shirou')
      life.people[id].activity = {
        kind: 'rest',
        home: 'tohsaka',
        phase: 'doing',
        remaining: 25,
        source: 'rules',
        reason: '在家休息。',
      };
  life.positions.illya = { x: a.x, y: a.y };
  life.positions.shirou = { x: b.x, y: b.y };
  return { life, actors, a, b };
}
function entry(values: Partial<Exchange> = {}): Exchange {
  return {
    id: 'onsite-1',
    speaker: 'illya',
    target: 'shirou',
    message: '今天过得怎么样？',
    reply: '还不错，想在街上走一会儿。',
    source: 'preset',
    createdAt: '2026-09-30T05:00:00.000Z',
    ...values,
  };
}
function indoors(life: DailyLife, home: HomeId = 'emiya') {
  life.people.shirou.activity = {
    kind: 'study',
    home,
    phase: 'doing',
    remaining: 20,
    source: 'rules',
    reason: '读一会儿书。',
  };
  const point = interiorResidentPoint(life, home, 'shirou', 'illya')!;
  life.indoor = { actor: 'illya', home, ...point };
  return point;
}

void test('onsite availability uses live footpoints, rejects observation, self, remote and separated roads', () => {
  const { life, actors, a, b } = outside();
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, true);
  assert.equal(nearbyResident(life, actors, 'illya'), 'shirou');
  assert.equal(interactionStatus(life, actors, null, 'shirou').ok, false);
  assert.equal(interactionStatus(life, actors, 'shirou', 'shirou').ok, false);
  b.x += 400;
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, false);
  assert.equal(nearbyResident(life, actors, 'illya'), null);
  b.x = a.x;
  b.y = a.y;
  a.x = b.x = -10;
  a.y = b.y = -10;
  assert.match(
    interactionStatus(life, actors, 'illya', 'shirou').message,
    /同一条道路/,
  );
});
void test('indoor presence requires same home, same room and proximity; NPC school and departure remain off scene', () => {
  const { life, actors } = outside();
  const point = indoors(life);
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, true);
  assert.equal(nearbyResident(life, actors, 'illya'), 'shirou');
  life.indoor!.x = 360;
  life.indoor!.y = 390;
  assert.match(
    interactionStatus(life, actors, 'illya', 'shirou').message,
    /房间/,
  );
  Object.assign(life.indoor!, { x: 55, y: 400 });
  assert.match(
    interactionStatus(life, actors, 'illya', 'shirou').message,
    /走近/,
  );
  Object.assign(life.indoor!, point);
  life.people.shirou.activity!.home = 'tohsaka';
  assert.match(
    interactionStatus(life, actors, 'illya', 'shirou').message,
    /离开/,
  );
  life.people.shirou.activity!.home = 'emiya';
  life.people.shirou.activity!.phase = 'going';
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, false);
  life.people.shirou.activity!.phase = 'doing';
  life.people.shirou.activity!.school = true;
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, false);
  delete life.indoor;
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, false);
});
void test('busy and sleeping residents stay locatable but cannot be interrupted; waking restores interaction', () => {
  const { life, actors } = outside();
  for (const kind of ['sleep', 'cook'] as const) {
    indoors(life);
    life.people.shirou.activity!.kind = kind;
    Object.assign(
      life.indoor!,
      interiorResidentPoint(life, 'emiya', 'shirou', 'illya'),
    );
    assert.equal(nearbyResident(life, actors, 'illya'), 'shirou');
    assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, false);
    const before = structuredClone(life);
    assert.equal(
      recordOnsiteConversation(life, actors, 'illya', entry()).ok,
      false,
    );
    assert.deepEqual(life, before);
  }
  indoors(life);
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, true);
});
void test('resident footpoints are shared by drawing and rules and lie on usable floors in all ten homes', () => {
  const life = createDailyLife();
  for (const home of Object.keys(FATE_HOMES) as HomeId[])
    for (const kind of ['visit', 'cook', 'read', 'sleep'] as const) {
      for (const id of STREET_PARTNERS)
        life.people[id].activity = {
          kind,
          home,
          phase: 'doing',
          remaining: 20,
          source: 'rules',
          reason: '室内活动。',
        };
      for (const id of STREET_PARTNERS) {
        const p = interiorResidentPoint(life, home, id, 'admin')!;
        assert.ok(isIndoorWalkable(p), `${home}: ${id}: ${kind}`);
        assert.equal(
          indoorRoom(p),
          kind === 'visit'
            ? 'lounge'
            : kind === 'cook'
              ? 'table'
              : kind === 'read'
                ? 'study'
                : 'rest',
        );
      }
    }
});
void test('a real manual conversation records the controlled identity and restores alongside history without pretending it was autonomous AI', () => {
  const { life, actors } = outside();
  assert.equal(
    recordOnsiteConversation(life, actors, 'illya', entry()).ok,
    true,
  );
  assert.equal(life.events.length, 1);
  assert.equal(life.events[0].interaction?.speaker, 'illya');
  assert.equal(life.events[0].dialogue, undefined);
  assert.equal(life.encounters, 0);
  assert.equal(recentLifeEvents(life, 'illya').length, 1);
  assert.equal(recentLifeEvents(life, 'shirou').length, 1);
  const restored = parseFateSave(
    JSON.parse(
      JSON.stringify({ ...emptyFateSave(), life, history: [entry()] }),
    ),
  );
  assert.deepEqual(restored.life, parseDailyLife(life));
  assert.equal(
    restored.history[0].id,
    restored.life!.events[0].interaction!.exchangeId,
  );
});
void test('repeated preset clicks and repeated exchange IDs cannot create events; different topics and later visits remain valid', () => {
  const { life, actors } = outside();
  assert.equal(
    recordOnsiteConversation(life, actors, 'illya', entry()).ok,
    true,
  );
  const before = structuredClone(life);
  assert.equal(
    recordOnsiteConversation(life, actors, 'illya', entry()).ok,
    false,
  );
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'illya',
      entry({ id: 'second-click' }),
    ).ok,
    false,
  );
  assert.deepEqual(life, before);
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'illya',
      entry({ id: 'different-topic', message: '要不要出去走走？' }),
    ).ok,
    true,
  );
  life.minutes += 2;
  assert.equal(
    recordOnsiteConversation(life, actors, 'illya', entry({ id: 'later' })).ok,
    true,
  );
});
void test('state changes while awaiting an AI reply reject the reply without journal, counters or needs changing', () => {
  const { life, actors, b } = outside();
  b.x += 500;
  let before = structuredClone(life);
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'illya',
      entry({ source: 'deepseek' }),
    ).ok,
    false,
  );
  assert.deepEqual(life, before);
  b.x -= 500;
  before = structuredClone(life);
  assert.equal(
    recordOnsiteConversation(life, actors, 'saber', entry()).ok,
    false,
  );
  assert.equal(recordOnsiteConversation(life, actors, null, entry()).ok, false);
  assert.equal(
    recordOnsiteConversation(life, actors, 'illya', entry({ reply: '' })).ok,
    false,
  );
  assert.deepEqual(life, before);
});
void test('live conversation bubbles and busy state expire, reject old eras and disappear when a participant leaves', () => {
  const { life, actors, b } = outside();
  life.events.push({
    id: life.nextId++,
    minute: life.minutes,
    text: '士郎与凛交谈。',
    dialogue: {
      speaker: 'shirou',
      target: 'rin',
      message: '你好。',
      reply: '你好。',
      source: 'preset',
    },
  });
  life.holdUntil = life.minutes + 10;
  life.people.rin.activity = null;
  life.positions.rin = { x: b.x + 20, y: b.y };
  assert.ok(liveEncounter(life));
  assert.equal(liveSpeech(life)?.speaker, 'shirou');
  life.minutes += 6;
  assert.equal(liveSpeech(life)?.speaker, 'rin');
  assert.equal(liveSpeech(life)?.text, '你好。');
  assert.match(
    interactionStatus(life, actors, 'illya', 'shirou').message,
    /别人交谈/,
  );
  life.minutes = life.holdUntil;
  assert.equal(liveEncounter(life), null);
  assert.equal(liveSpeech(life), null);
  assert.equal(interactionStatus(life, actors, 'illya', 'shirou').ok, true);
  life.holdUntil += 10;
  life.positions.rin.x += 400;
  assert.equal(liveEncounter(life), null);
  const dialogue = life.events[0].dialogue!;
  dialogue.target = 'waver';
  dialogue.waverStage = 'young';
  life.waverStage = 'adult';
  assert.equal(liveEncounter(life), null);
});
void test('legacy saves need no interaction field, but invalid onsite records and mismatched Waver identity are rejected', () => {
  const { life, actors } = outside();
  assert.doesNotThrow(() => parseDailyLife(life));
  assert.equal(
    recordOnsiteConversation(life, actors, 'illya', entry()).ok,
    true,
  );
  const forged = structuredClone(life);
  forged.events[0].interaction!.speaker = 'unknown' as Exchange['speaker'];
  assert.throws(() => parseDailyLife(forged), /现场交谈/);
  const other = structuredClone(life);
  other.events[0].interaction!.reply = '';
  assert.throws(() => parseDailyLife(other), /现场交谈/);
  assert.equal(
    recordOnsiteConversation(
      life,
      actors,
      'illya',
      entry({ id: 'era', target: 'waver', waverStage: 'adult' }),
    ).ok,
    false,
  );
});
