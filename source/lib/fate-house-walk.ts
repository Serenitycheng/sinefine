import type { ActorId } from './street';

/** Ground distance drives the gait, including user pace changes and collisions. */
export function houseWalkSpeed(actor?: ActorId) {
  return actor === 'kiritsugu' ? 135 : 185;
}

export function houseWalkPhase(
  actor: ActorId | undefined,
  travelled: number,
  moving: boolean,
  frames = 6,
) {
  if (!moving) return 0;
  const distancePerFrame = actor === 'kiritsugu' ? 26 : 22;
  if (actor === 'kiritsugu')
    return 1 + ((Math.max(0, travelled) / distancePerFrame) % frames);
  return 1 + (Math.floor(Math.max(0, travelled) / distancePerFrame) % frames);
}
