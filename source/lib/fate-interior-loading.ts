import type { ActorId } from './street';
import type { PreviewHouse } from './fate-preview-house';

/** Entry waits for walking art only; optional poses warm after the room is playable. */
export function houseWalkingArt(plan: PreviewHouse, actor: ActorId) {
  return [
    ...new Set(
      (['up', 'down', 'left', 'right'] as const).flatMap((d) => [
        plan.sprite(actor, d, 0).file,
        plan.sprite(actor, d, 1).file,
      ]),
    ),
  ];
}
export function houseRoomWarmArt(
  plan: PreviewHouse,
  room: string,
  actor: ActorId,
) {
  const config = plan.rooms[room];
  return [
    ...new Set([
      ...config.actions.map((a) => plan.sprite(actor, 'down', 0, a.pose).file),
      ...config.doors
        .flatMap((d) =>
          d.to && plan.rooms[d.to] ? [plan.rooms[d.to].scene.painting] : [],
        )
        .slice(0, 2),
    ]),
  ];
}
