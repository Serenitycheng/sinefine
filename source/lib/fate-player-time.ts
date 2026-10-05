import { advanceDailyLife, type DailyLife, type LifeEvent } from './fate-life';
import { isPartner } from './fate-cast';
import type { Actor } from './street';

export type PlayerCare = 'eat' | 'rest' | 'sleep';

/** An explicit player choice passes game time through the ordinary simulation.
 * No AI requests, wall-clock catch-up, player movement or fabricated attendance.
 */
export function spendPlayerTime(
  life: DailyLife,
  actors: Actor[],
  controlled: string | null,
  minutes: number,
  care?: PlayerCare,
  stop?: () => boolean,
) {
  const encounters: LifeEvent[] = [];
  if (
    !isPartner(controlled) ||
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    minutes > 720
  )
    return { elapsed: 0, encounters };
  const start = life.minutes;
  const end = start + minutes;
  // Same 2 game minutes per second as the original life simulation, at 4x.
  // Bounded substeps retain movement, meals, appointments and daily transitions.
  for (let step = 0; step < 1801 && life.minutes < end - 1e-6; step++) {
    if (stop?.()) break;
    const dt = Math.min(0.05, (end - life.minutes) / 8);
    const encounter = advanceDailyLife(life, actors, dt, {
      running: true,
      speed: 4,
      clockRate: 2,
      controlled,
      controlledCare: care,
    });
    if (encounter) encounters.push(encounter);
  }
  return { elapsed: life.minutes - start, encounters };
}
