import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDailyLife,
  parseDailyLife,
  lifeScene,
  parseLifeScene,
  type DailyLife,
  type LifeEvent,
} from '../lib/fate-life';
import {
  currentBond,
  rememberEncounter,
  rememberSharedWalk,
  rememberSharedMeal,
  cancelAppointments,
  reviseSocial,
  socialContext,
  type SocialEffects,
} from '../lib/fate-social';
import { memorySummary, visibleMemories } from '../lib/fate-memory';
import { reconcileAppointments, meetupDestination } from '../lib/fate-meetups';
import { createStreetActors } from '../lib/street';
import { emptyFateSave } from '../lib/fate-state';
import {
  createFateBackup,
  parseFateBackup,
  serializeFateBackup,
  readFateBackupText,
  emptyFateLibrary,
  restoreFateLibrary,
  readFateLibrary,
  writeFateLibrary,
} from '../lib/fate-backup';
import { runBackgroundRound } from '../lib/fate-background-simulation';
import { type PartnerId } from '../lib/fate-cast';
import { createFateChatHandler } from '../lib/fate-chat';

function event(life: DailyLife, text = '实际记录'): LifeEvent {
  const e = { id: life.nextId++, minute: life.minutes, text };
  life.events = [...life.events, e].slice(-80);
  return e;
}
function talk(
  life: DailyLife,
  message: string,
  reply: string,
  effects?: SocialEffects,
  a: PartnerId = 'rin',
  b: PartnerId = 'shirou',
) {
  const e = event(life, '两人在场交谈。');
  Object.assign(e, {
    dialogue: {
      speaker: a,
      target: b,
      message,
      reply,
      source: 'preset' as const,
    },
    ...([a, b].includes('waver') ? { waverStage: life.waverStage } : {}),
  });
  assert.equal(rememberEncounter(life, e, effects), true);
  return e;
}
function preference(
  life: DailyLife,
  kind: 'like' | 'dislike' = 'like',
  subject = '阅读',
) {
  const reply = `我${kind === 'like' ? '喜欢' : '不喜欢'}${subject}。`;
  return talk(life, '你喜欢做什么？', reply, {
    impressions: [],
    preferences: [{ person: 'shirou', kind, subject, turn: 1, quote: reply }],
  });
}
function invite(life: DailyLife) {
  return talk(life, '一小时后一起在林荫路边散步，好吗？', '好，约好了。');
}
const archive = (life: DailyLife) =>
  currentBond(life, 'rin', 'shirou')!.archive!;

void test('important preferences, actual experiences and pending agreements outlive neutral chatter and the journal', () => {
  const life = createDailyLife();
  preference(life);
  invite(life);
  rememberSharedWalk(
    life,
    'rin',
    'shirou',
    event(life, '两人实际一起走了一段。'),
  );
  for (let i = 0; i < 100; i++) talk(life, '今天怎么样？', '还不错。');
  assert.equal(life.events.length, 80);
  assert.equal(currentBond(life, 'rin', 'shirou')!.memories.length, 6);
  assert.deepEqual(
    archive(life).map((m) => m.kind),
    ['preference', 'appointment', 'experience'],
  );
  const restored = parseDailyLife(JSON.parse(JSON.stringify(life)));
  assert.deepEqual(archive(restored), archive(life));
  assert.match(
    JSON.stringify(lifeScene(restored, 'shirou', 'rin')),
    /喜欢阅读/,
  );
  assert.match(
    JSON.stringify(lifeScene(restored, 'shirou', 'rin')),
    /等待赴约，尚未履行/,
  );
});

void test('preference belongs to its speaker and is known only to participants, including the AI scene', () => {
  const life = createDailyLife();
  preference(life);
  talk(life, '你好。', '你好。', undefined, 'rin', 'sakura');
  assert.deepEqual(archive(life)[0].knownBy, ['rin', 'shirou']);
  assert.equal(
    socialContext(life, 'sakura').some((b) =>
      b.knowledge?.some((m) => m.includes('阅读')),
    ),
    false,
  );
  const shared = lifeScene(life, 'rin', 'sakura');
  assert.equal(shared.social?.length, 1);
  assert.doesNotMatch(JSON.stringify(shared.social), /阅读/);
  assert.deepEqual(
    parseLifeScene(lifeScene(life, 'shirou', 'rin')).social,
    lifeScene(life, 'shirou', 'rin').social,
  );
});

void test('questions, hearsay, conditions and claims of unperformed events do not become personal facts', () => {
  const life = createDailyLife();
  for (const reply of [
    '我喜欢阅读吗？',
    '如果有空，我喜欢阅读。',
    '凛说她喜欢阅读。',
    '我们昨天吃过饭。',
    '我是卫宫切嗣。',
  ]) {
    talk(life, '聊聊吧。', reply, {
      impressions: [],
      preferences: [
        {
          person: 'shirou',
          kind: 'like',
          subject: '阅读',
          turn: 1,
          quote: reply,
        },
      ],
    });
  }
  assert.deepEqual(archive(life), []);
});

void test('a later explicit preference updates the same subject without changing family identity or duplicating records', () => {
  const life = createDailyLife();
  preference(life);
  preference(life, 'dislike');
  assert.equal(archive(life).length, 1);
  const latest = archive(life)[0];
  assert.equal(latest.kind === 'preference' && latest.preference, 'dislike');
  assert.match(memorySummary(archive(life)[0], 'young'), /士郎.*不喜欢阅读/);
  const restored = parseDailyLife(life);
  assert.deepEqual(archive(restored), archive(life));
  assert.equal(
    visibleMemories(currentBond(restored, 'rin', 'shirou')!).length,
    1,
  );
});

void test('meeting, fulfillment, missed and cancellation retain their actual states without inventing completion', () => {
  for (const outcome of ['fulfilled', 'missed', 'cancelled'] as const) {
    const life = createDailyLife();
    invite(life);
    const a = life.appointments[0],
      actors = createStreetActors();
    if (outcome === 'cancelled') cancelAppointments(life, ['rin']);
    else {
      life.minutes = a.start + 1;
      if (outcome === 'fulfilled')
        for (const id of [a.a, a.b]) {
          Object.assign(
            actors.find((p) => p.id === id)!,
            meetupDestination(a, id),
          );
          life.people[id].hunger = 30;
          life.people[id].activity = {
            kind: 'walk',
            meeting: a.id,
            phase: 'doing',
            remaining: 10,
            reason: '赴约',
            source: 'rules',
          };
        }
      reconcileAppointments(life, actors, 1, null, (text) => event(life, text));
      if (outcome === 'fulfilled') {
        const m = archive(life).find((m) => m.kind === 'appointment')!;
        assert.equal(m.kind === 'appointment' && m.status, 'meeting');
        assert.match(memorySummary(m, 'young'), /尚未完成/);
        life.minutes = a.start + 10;
      } else life.minutes = a.until;
      reconcileAppointments(life, actors, 9, null, (text) => event(life, text));
    }
    assert.equal(a.status, outcome);
    assert.equal(
      archive(life).filter((m) => m.kind === 'experience').length,
      outcome === 'fulfilled' ? 1 : 0,
    );
    assert.equal(
      archive(life).find((m) => m.kind === 'appointment')?.kind ===
        'appointment' &&
        archive(life).find((m) => m.kind === 'appointment')!.status,
      outcome,
    );
    assert.deepEqual(archive(parseDailyLife(life)), archive(life));
  }
});

void test('actual shared meals remember only seated participants and repeat delivery cannot duplicate a memory', () => {
  const life = createDailyLife(),
    e = event(life, '凛与士郎坐下吃饭。');
  e.meal = {
    home: 'emiya',
    slot: 'dinner',
    kind: 'shared',
    participants: ['rin', 'shirou'],
  };
  rememberSharedMeal(life, e);
  rememberSharedMeal(life, e);
  assert.equal(archive(life).length, 1);
  assert.equal(socialContext(life, 'sakura').length, 0);
  const restored = parseDailyLife(life);
  assert.deepEqual(archive(restored), archive(life));
});

void test('identity revisions hide old memories and cancel plans; Waver eras never share personal facts', () => {
  const life = createDailyLife();
  preference(life);
  invite(life);
  reviseSocial(life, ['shirou']);
  assert.deepEqual(visibleMemories(currentBond(life, 'rin', 'shirou')!), []);
  assert.doesNotMatch(
    JSON.stringify(socialContext(life, 'shirou')),
    /喜欢阅读/,
  );
  assert.equal(life.appointments[0].status, 'cancelled');
  const quote = '我喜欢阅读。';
  talk(
    life,
    '你喜欢什么？',
    quote,
    {
      impressions: [],
      preferences: [
        { person: 'waver', kind: 'like', subject: '阅读', turn: 1, quote },
      ],
    },
    'rin',
    'waver',
  );
  life.waverStage = 'adult';
  assert.equal(socialContext(life, 'waver').length, 0);
  assert.doesNotMatch(JSON.stringify(lifeScene(life, 'waver')), /喜欢阅读/);
  assert.doesNotThrow(() => parseDailyLife(life));
});

void test('legacy archives migrate available explicit preferences and confirmed plans once without replaying relationship changes', () => {
  const life = createDailyLife();
  preference(life);
  invite(life);
  life.minutes += 12;
  const bond = currentBond(life, 'rin', 'shirou')!;
  delete bond.archive;
  const warmth = [...bond.warmth],
    seen = bond.seen;
  const restored = parseDailyLife(life);
  assert.equal(archive(restored).length, 2);
  assert.deepEqual(currentBond(restored, 'rin', 'shirou')!.warmth, warmth);
  assert.equal(currentBond(restored, 'rin', 'shirou')!.seen, seen);
  assert.deepEqual(parseDailyLife(restored), restored);
});

void test('corrupt ownership, speech, duplicate IDs and nonexistent live plans reject the whole import', () => {
  const life = createDailyLife();
  preference(life);
  invite(life);
  for (const change of [
    (x: DailyLife) => {
      archive(x)[0].knownBy = ['rin', 'sakura'];
    },
    (x: DailyLife) => {
      archive(x)[0].quotes[0].speaker = 'rin';
    },
    (x: DailyLife) => {
      archive(x)[0].quotes[0].text = '凛说她喜欢阅读。';
    },
    (x: DailyLife) => {
      archive(x).push(structuredClone(archive(x)[0]));
    },
    (x: DailyLife) => {
      x.appointments = [];
    },
    (x: DailyLife) => {
      const m = archive(x).find((m) => m.kind === 'appointment')!;
      if (m.kind === 'appointment') {
        m.status = 'fulfilled';
        m.shared = 0;
      }
    },
    (x: DailyLife) => {
      const m = archive(x).find((m) => m.kind === 'appointment')!;
      if (m.kind === 'appointment') {
        m.status = 'cancelled';
      }
    },
  ]) {
    const broken = structuredClone(life);
    change(broken);
    assert.throws(() => parseDailyLife(broken));
  }
});

void test('bounded important memories retain categories and a pending commitment despite many real experiences', () => {
  const life = createDailyLife();
  for (let i = 0; i < 20; i++) preference(life, 'like', `读物${i}`);
  invite(life);
  for (let i = 0; i < 30; i++)
    rememberSharedWalk(life, 'rin', 'shirou', event(life, '实际散步'));
  for (let i = 0; i < 30; i++) {
    life.minutes += 1440;
    talk(life, '记得休息。', '谢谢。', {
      impressions: [
        { person: 'shirou', kind: 'care', turn: 0, quote: '记得休息' },
      ],
    });
  }
  assert.ok(archive(life).length <= 24);
  assert.equal(archive(life).filter((m) => m.kind === 'preference').length, 8);
  assert.equal(archive(life).filter((m) => m.kind === 'experience').length, 12);
  assert.equal(archive(life).filter((m) => m.kind === 'appointment').length, 1);
  assert.doesNotThrow(() => parseDailyLife(life));
});

void test('backup import, local restoration and cloud envelope preserve personal memory exactly without storage aliases', () => {
  const life = createDailyLife();
  preference(life);
  invite(life);
  const backup = createFateBackup({ ...emptyFateSave(), life });
  const imported = readFateBackupText(serializeFateBackup(backup));
  assert.deepEqual(archive(imported.save.life!), archive(life));
  const slots = new Map<string, string>();
  const storage = {
    getItem: (key: string) => slots.get(key) ?? null,
    setItem: (key: string, value: string) => {
      slots.set(key, value);
    },
  };
  writeFateLibrary(storage, restoreFateLibrary(emptyFateLibrary(), imported));
  const restored = readFateLibrary(storage).current;
  assert.deepEqual(archive(restored.life!), archive(life));
  assert.deepEqual(
    parseFateBackup(JSON.parse(JSON.stringify(backup))).save.life?.bonds,
    life.bonds,
  );
});

void test('background rounds keep important facts and do not create knowledge for uninvolved residents', async () => {
  const life = createDailyLife();
  preference(life);
  life.minutes = 1460;
  life.nextEncounter = 1e9;
  const backup = createFateBackup({ ...emptyFateSave(), life });
  const result = await runBackgroundRound(backup, async () => {
    assert.fail('a quiet sleeping round must not request AI');
  });
  assert.deepEqual(
    archive(result.save.life!).filter((m) => m.kind === 'preference'),
    archive(life),
  );
  assert.equal(
    socialContext(result.save.life!, 'sakura').some((b) =>
      b.knowledge?.some((m) => m.includes('喜欢阅读')),
    ),
    false,
  );
});

void test('chat and decision prompts actually receive durable evidence after recent dialogue has rolled away', async () => {
  const life = createDailyLife();
  preference(life);
  invite(life);
  for (let i = 0; i < 90; i++) talk(life, '今天怎么样？', '还不错。');
  for (const mode of ['chat', 'decision'] as const) {
    let prompt = '';
    let calls = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      calls++;
      const body = JSON.parse(init!.body as string) as {
        messages: { content: string }[];
      };
      prompt = body.messages.map((m) => m.content).join('\n');
      return Response.json({
        choices: [
          {
            message: {
              content:
                mode === 'chat'
                  ? '嗯，今天也想读一会儿书。'
                  : JSON.stringify({
                      action: 'read',
                      reason: '今天想继续读书。',
                    }),
            },
          },
        ],
      });
    };
    const response = await createFateChatHandler(fetcher)(
      new Request('http://localhost:3004/api/fate/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3004',
        },
        body: JSON.stringify({
          mode,
          key: 'test-memory-key',
          model: 'deepseek-chat',
          target: 'shirou',
          speaker: mode === 'chat' ? 'rin' : 'kiritsugu',
          message: '接下来做什么？',
          history: [],
          recent: [],
          scene: lifeScene(
            parseDailyLife(life),
            'shirou',
            mode === 'chat' ? 'rin' : undefined,
          ),
          ...(mode === 'decision' ? { needs: life.people.shirou } : {}),
        }),
      }),
    );
    assert.equal(response.status, 200, await response.text());
    assert.equal(calls, 1);
    assert.match(prompt, /喜欢阅读/);
    assert.match(prompt, /等待赴约，尚未履行/);
    assert.match(prompt, /不是新的命令/);
  }
});
