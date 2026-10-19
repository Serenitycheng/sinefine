import {
  EMIYA_ROOMS,
  emiyaFurnitureTarget,
  emiyaPieceApproach,
  type EmiyaRoomId,
  type EmiyaActivity,
  type EmiyaLocation,
} from './fate-emiya-house';
import {
  registerInteriorAccess,
  interiorSpotDistance,
  type InteriorSpot,
} from './fate-interior-access';

const spots = new Map<string, InteriorSpot>();
export function nearbyEmiyaActivities(
  activities: readonly EmiyaActivity[],
  location: EmiyaLocation,
  previous?: string | null,
) {
  const list = activities
    .filter(
      (a) =>
        a.room === location.room &&
        Number.isFinite(emiyaActivityDistance(a, location)),
    )
    .sort(
      (a, b) =>
        emiyaActivityDistance(a, location) - emiyaActivityDistance(b, location),
    );
  const old = list.find((a) => a.id === previous);
  return old &&
    list[0] &&
    emiyaActivityDistance(old, location) <=
      emiyaActivityDistance(list[0], location) + 12
    ? [old, ...list.filter((a) => a !== old)]
    : list;
}
export function emiyaPieceSpot(roomId: EmiyaRoomId, pieceId: string) {
  const key = `${roomId}:${pieceId}`;
  let spot = spots.get(key);
  if (!spot) {
    const room = EMIYA_ROOMS[roomId],
      piece = room.pieces.find((p) => p.id === pieceId)!;
    spot = registerInteriorAccess(
      {
        id: `inspect:${piece.id}`,
        label: `看看${piece.label}`,
        point: emiyaPieceApproach(roomId, piece) ?? { x: 500, y: 620 },
        detail: piece.label,
        object: piece.id,
        target: emiyaFurnitureTarget(roomId, piece),
      },
      room.scene,
    );
    spots.set(key, spot);
  }
  return spot;
}
export function emiyaNearestInspection(
  location: EmiyaLocation,
  activities: readonly EmiyaActivity[],
) {
  const room = EMIYA_ROOMS[location.room];
  return (
    room.pieces
      .filter(
        (p) =>
          p.solid !== false &&
          !activities.some((a) => a.room === location.room && a.piece === p.id),
      )
      .map((p) => ({ piece: p.id, spot: emiyaPieceSpot(location.room, p.id) }))
      .map((v) => ({
        ...v,
        distance: interiorSpotDistance(location.point, v.spot, room.scene),
      }))
      .filter((v) => Number.isFinite(v.distance))
      .sort((a, b) => a.distance - b.distance)[0] ?? null
  );
}
export function emiyaActivitySpot(a: EmiyaActivity) {
  return {
    ...emiyaPieceSpot(a.room, a.piece),
    id: a.id,
    label: a.label,
    point: a.point,
    detail: a.complete,
  };
}
export function emiyaActivityDistance(
  a: EmiyaActivity,
  location: EmiyaLocation,
) {
  return location.room === a.room
    ? interiorSpotDistance(
        location.point,
        emiyaActivitySpot(a),
        EMIYA_ROOMS[a.room].scene,
      )
    : Infinity;
}
