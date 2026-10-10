import { EMIYA_ROOMS, type EmiyaFurniture } from './fate-emiya-house';
import { SABER_LIFE_SPRITES, type EmiyaPose } from './fate-emiya-actions';
import {
  saberWalkSprite,
  emiyaVisitorSprite,
  EMIYA_VISITOR_SPRITES,
} from './fate-emiya-walk';
import type { EmiyaResidentBody } from './fate-emiya-residents';

/** Presentation contacts never replace the resident's safe navigation position. */
export function emiyaResidentPose(body: EmiyaResidentBody) {
  if (
    (body.id !== 'saber' && body.id !== 'sakura' && body.id !== 'taiga') ||
    body.phase !== 'doing'
  )
    return null;
  const pieces = EMIYA_ROOMS[body.room].pieces;
  const near = (piece: EmiyaFurniture, margin = 125) => {
    const r = piece.footprint;
    const dx = Math.max(r.x - body.point.x, 0, body.point.x - r.x - r.width);
    const dy = Math.max(r.y - body.point.y, 0, body.point.y - r.y - r.height);
    return Math.hypot(dx, dy) <= margin;
  };
  let pose: EmiyaPose | null = null;
  let piece: EmiyaFurniture | undefined;
  if (body.kind === 'sleep' && body.room === 'rest') {
    piece = pieces.find((p) => p.kind === 'futon' && near(p));
    pose = piece ? 'sleep' : null;
  } else if (body.kind === 'eat' && body.room === 'table') {
    piece = pieces.find((p) => p.id === 'kitchen-table' && near(p));
    pose = piece ? 'eat' : null;
  } else if (body.kind === 'cook' && body.room === 'table') {
    piece = pieces.find((p) => p.kind === 'counter' && near(p));
    pose = piece ? 'cook' : null;
  } else if (
    (body.kind === 'read' || body.kind === 'study') &&
    body.room === 'study'
  ) {
    piece = pieces.find((p) => p.id === 'writing-desk' && near(p));
    pose = piece ? 'read' : null;
  } else if (body.kind === 'rest' || body.kind === 'visit') {
    piece = pieces.find((p) => p.kind === 'bench' && near(p, 90));
    if (piece) pose = 'bench';
    else if (body.room === 'lounge') {
      piece = pieces.find((p) => p.id === 'family-table' && near(p));
      pose = piece ? 'sit' : null;
    }
  }
  if (!pose || !piece) return null;
  const frame =
    body.id === 'saber'
      ? SABER_LIFE_SPRITES.frames[pose][
          Math.floor(Math.max(0, body.seconds) / 0.85) %
            SABER_LIFE_SPRITES.frames[pose].length
        ]
      : pose === 'sit' || pose === 'eat'
        ? EMIYA_VISITOR_SPRITES[body.id].actions[pose]
        : null;
  if (!frame) return null;
  const raised = pose === 'sleep' || pose === 'bench';
  const r = piece.footprint;
  return {
    pose,
    frame,
    point: raised
      ? {
          x: r.x + r.width / 2,
          y: r.y + r.height * (pose === 'sleep' ? 0.6 : 0.82),
        }
      : body.point,
    elevation: raised ? piece.height : 0,
    z: Math.round(raised ? r.y + r.height : body.point.y) + (raised ? 12 : 10),
  };
}

export function emiyaResidentPresentation(body: EmiyaResidentBody) {
  if (body.id !== 'saber' && body.id !== 'sakura' && body.id !== 'taiga')
    return null;
  const contact = emiyaResidentPose(body);
  const phase = body.phase === 'doing' ? 0 : body.frame;
  const walk =
    body.id === 'saber'
      ? { ...saberWalkSprite(body.direction, phase), mirror: false }
      : emiyaVisitorSprite(body.id, body.direction, phase);
  const sheet =
    body.id === 'saber' ? SABER_LIFE_SPRITES : EMIYA_VISITOR_SPRITES[body.id];
  return {
    contact,
    frame: contact?.frame ?? walk.frame,
    sheet: contact ? sheet : walk.sheet,
    scale: contact
      ? body.id === 'saber'
        ? SABER_LIFE_SPRITES.scales[contact.pose]
        : EMIYA_VISITOR_SPRITES[body.id].actionScale
      : walk.scale,
    mirror: contact ? false : walk.mirror,
  };
}
