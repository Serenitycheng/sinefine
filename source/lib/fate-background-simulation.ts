import { parseFateBackup, type FateBackup } from './fate-backup';
import {
  advanceDailyLife,
  applyLifePlan,
  createDailyLife,
  lifeScene,
  parseLifePlan,
  recentLifeEvents,
  snapshotLife,
  type LifeEvent,
} from './fate-life';
import { createStreetActors } from './street';
import { isPartner } from './fate-cast';
import { pairConversationHistory } from './fate-state';
import { commitSocialDialogue } from './fate-social';

/** One scheduler invocation advances 30 game minutes. Never replay a day's
 * missed timers or manufacture conversations between absent people. */
export async function runBackgroundRound(
  backup: FateBackup,
  generate: (body: Record<string, unknown>) => Promise<Record<string, unknown>>,
  now = new Date(),
): Promise<FateBackup> {
  const clean = parseFateBackup(backup);
  const save = structuredClone(clean.save);
  const life = save.life ?? createDailyLife();
  const actors = createStreetActors();
  for (const actor of actors) {
    Object.assign(actor, life.positions[actor.id], {
      path: [],
      frame: 0,
      rest: 0,
    });
    // Each schedule/appointment/ordinary activity restores its own route on
    // the first simulation step. Don't seed a cafe route for a school journey.
  }
  const until = life.minutes + 30;
  let called = false;
  const remember = (event: LifeEvent) => {
    if (!event.dialogue) return;
    save.history = [
      ...save.history.filter((e) => e.id !== `life-${event.id}`),
      {
        id: `life-${event.id}`,
        ...event.dialogue,
        createdAt: now.toISOString(),
      },
    ].slice(-120);
  };
  while (life.minutes + 0.00001 < until) {
    const before = life.nextId;
    const encounter = advanceDailyLife(
      life,
      actors,
      Math.min(0.05, (until - life.minutes) / 8),
      { running: true, speed: 4, controlled: life.indoor?.actor ?? null },
    );
    const decision = life.events.find(
      (e) =>
        e.id >= before &&
        e.decision &&
        life.people[e.decision.person].activity?.phase === 'going',
    );
    const event = encounter ?? decision;
    // Prioritize actual encounters. A decision can be used near the end of a
    // quiet round; at most one upstream call is made per 30-minute round.
    if (!called && event && (encounter || life.minutes >= until - 5)) {
      called = true;
      const target = event.dialogue?.target ?? event.decision!.person;
      const speaker = event.dialogue?.speaker ?? 'admin';
      const data = await generate({
        mode: event.dialogue ? 'encounter' : 'decision',
        target,
        speaker,
        message:
          event.dialogue?.message ??
          '根据当前性格、身体需求和实际经历，选择接下来要做的事。',
        history: isPartner(speaker)
          ? pairConversationHistory(save, target, speaker).slice(-4)
          : [],
        worldNote: save.worldNote,
        characterNotes: save.characterNotes,
        relationshipNotes: save.relationshipNotes,
        waverStage: life.waverStage,
        housing: life.housing,
        scene: lifeScene(
          snapshotLife(life, actors),
          target,
          isPartner(speaker) ? speaker : undefined,
        ),
        ...(event.decision ? { needs: life.people[target] } : {}),
        recent: recentLifeEvents(life, target)
          .filter((e) => e.id !== event.id)
          .map((e) => e.text.slice(0, 300)),
      });
      if (event.dialogue)
        commitSocialDialogue(life, event.id, data.turns, data.effects);
      else applyLifePlan(life, actors, event.id, parseLifePlan(data.plan));
    }
    if (encounter) remember(encounter);
  }
  save.life = snapshotLife(life, actors);
  return parseFateBackup({
    ...clean,
    title: '后台日常进度',
    createdAt: now.toISOString(),
    save,
  });
}
