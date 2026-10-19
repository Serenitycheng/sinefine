import { HOUSE_PREVIEWS } from './fate-preview-houses';
import { FORMAL_HOUSE_PLANS } from './fate-formal-house-plans';
import {
  shirouWalkSprite,
  saberWalkSprite,
  emiyaVisitorSprite,
} from './fate-emiya-walk';
import { STREET_CAST } from './fate-street-cast';
import { fatePerson, type WaverStage } from './fate-cast';
import type { HouseSiteId } from './fate-formal-buildings';
import type { PreviewHouse } from './fate-preview-house';
import {
  mirrorPreviewSprite,
  type PreviewDirection,
  type PreviewSprite,
} from './fate-preview-house';
import type { PartnerId } from './fate-cast';
import nataliaClips from './fate-natalia-frame-clips.json';
import { actorProportions } from './fate-actor-proportions';
import { registeredSeatedSprite } from './fate-seated-sprites';
import { bodyArtSprite, hasBodyPose } from './fate-body-art';
import type { BodyFacing } from './fate-body-facing';

/** Formal visitors keep their existing everyday outfits and registered crops. */
export function houseResidentSprite(
  id: PartnerId,
  direction: PreviewDirection,
  phase: number,
  stage: WaverStage = 'adult',
  site?: HouseSiteId,
  pose?: 'sit' | 'read',
  bodyFacing: BodyFacing = direction,
): PreviewSprite | null {
  // Preserve the already accepted articulated cardinal gait for Kiritsugu.
  const nativeGait =
    id === 'kiritsugu' && phase > 0 && !bodyFacing.includes('-') && !pose;
  const body = nativeGait
    ? null
    : bodyArtSprite(
        id,
        direction,
        phase,
        stage,
        pose,
        bodyFacing,
        site === 'temple' ? 'floor' : 'chair',
      );
  if (body) return body;
  const sprite = rawResidentSprite(
    id,
    direction,
    phase,
    stage,
    nativeGait ? undefined : site,
    pose,
  );
  if (!sprite) return null;
  const standing = rawResidentSprite(id, 'down', 0, stage, site);
  return {
    ...actorProportions(
      id,
      pose ? registeredSeatedSprite(id, sprite, pose) : sprite,
      standing!,
      Boolean(pose && houseActorHasPose(id, stage, site ?? 'einzbern')),
    ),
    bodyFacing,
  };
}

function rawResidentSprite(
  id: PartnerId,
  direction: PreviewDirection,
  phase: number,
  stage: WaverStage = 'adult',
  site?: HouseSiteId,
  pose?: 'sit' | 'read',
): PreviewSprite | null {
  if (id === 'waver' && stage === 'young')
    return legacySprite(id, direction, phase);
  if (
    site &&
    site !== 'emiya' &&
    HOUSE_PREVIEWS[site].cast.some((person) => person.id === id)
  )
    return HOUSE_PREVIEWS[site].sprite(id, direction, phase, pose);
  for (const home of [
    'tohsaka',
    'matou',
    'einzbern',
    'waver',
    'temple',
    'church',
  ] as const) {
    const plan = HOUSE_PREVIEWS[home];
    if (plan.cast.some((person) => person.id === id))
      return plan.sprite(id, direction, phase, pose);
  }
  if (id === 'shirou') {
    const { sheet, frame, scale, mirror } = shirouWalkSprite(direction, phase);
    const sprite: PreviewSprite = {
      file: sheet.path,
      imageWidth: sheet.width,
      imageHeight: sheet.height,
      cellWidth: frame.width,
      cellHeight: frame.height,
      cropX: frame.x,
      cropY: frame.y,
      anchorX: frame.anchorX,
      anchorY: frame.anchorY,
      bounds: frame.bounds,
      scale,
      mirror: false,
      index: phase,
    };
    return mirror ? mirrorPreviewSprite(sprite) : sprite;
  }
  if (id === 'saber' || id === 'taiga') {
    const sample =
      id === 'saber'
        ? saberWalkSprite(direction, phase)
        : emiyaVisitorSprite(id, direction, phase);
    const { sheet, frame, scale } = sample;
    const sprite: PreviewSprite = {
      file: sheet.path,
      imageWidth: sheet.width,
      imageHeight: sheet.height,
      cellWidth: frame.width,
      cellHeight: frame.height,
      cropX: frame.x,
      cropY: frame.y,
      anchorX: frame.anchorX,
      anchorY: frame.anchorY,
      bounds: frame.bounds,
      scale,
      mirror: false,
      index: phase,
    };
    return 'mirror' in sample && sample.mirror
      ? mirrorPreviewSprite(sprite)
      : sprite;
  }
  return legacySprite(id, direction, phase);
}

/** Existing four-frame street art is retained for identities without a full model. */
function legacySprite(
  id: PartnerId,
  direction: PreviewDirection,
  phase: number,
): PreviewSprite {
  const actor = STREET_CAST.find((person) => person.id === id)!;
  const columns = id === 'natalia' ? 3 : 4;
  const frame = phase > 0 ? 1 + ((Math.trunc(phase) - 1) % (columns - 1)) : 0;
  const clip =
    id === 'natalia'
      ? (
          nataliaClips as Record<
            string,
            {
              x: number;
              y: number;
              width: number;
              height: number;
              polygon: readonly (readonly number[])[];
            }
          >
        )[frame]
      : undefined;
  return {
    file: actor.image,
    imageWidth: columns * 100,
    imageHeight: 100 * actor.rows,
    cellWidth: 100,
    cellHeight: 100,
    cropX: frame * 100,
    cropY: actor.row * 100,
    anchorX: 50,
    anchorY: 95,
    bounds: clip
      ? {
          x: direction === 'left' ? 100 - clip.x - clip.width : clip.x,
          y: clip.y,
          width: clip.width,
          height: clip.height,
        }
      : { x: 0, y: 0, width: 100, height: 100 },
    ...(clip
      ? {
          clip: clip.polygon,
        }
      : {}),
    scale: 2.5,
    mirror: direction === 'left',
    index: frame,
  };
}
export function houseActorHasPose(
  id: PartnerId,
  stage: WaverStage,
  site: HouseSiteId,
) {
  if (site === 'emiya') return false;
  if (hasBodyPose(id, stage, site === 'temple' ? 'floor' : 'chair'))
    return true;
  if (id === 'waver' && stage === 'young') return false;
  return (
    HOUSE_PREVIEWS[site].cast.some((p) => p.id === id) ||
    (
      ['tohsaka', 'matou', 'einzbern', 'waver', 'temple', 'church'] as const
    ).some((home) => HOUSE_PREVIEWS[home].cast.some((p) => p.id === id))
  );
}
export function formalHousePlan(
  site: HouseSiteId,
  actor: PartnerId,
  stage: WaverStage,
): PreviewHouse {
  const plan = FORMAL_HOUSE_PLANS[site],
    supportsPose = houseActorHasPose(actor, stage, site);
  const matchingPose =
    supportsPose &&
    (site !== 'temple' ||
      hasBodyPose(actor, stage, 'floor') ||
      actor === 'medea' ||
      actor === 'kuzuki');
  return {
    ...plan,
    cast: [{ id: actor, name: fatePerson(actor, stage)!.name }],
    sprite: (id, direction, phase, pose, bodyFacing) =>
      houseResidentSprite(
        id as PartnerId,
        direction,
        phase,
        stage,
        site,
        pose,
        bodyFacing,
      )!,
    rooms: Object.fromEntries(
      Object.entries(plan.rooms).map(([id, room]) => [
        id,
        {
          ...room,
          actions: room.actions
            .filter(() => matchingPose)
            .map((action) => ({
              ...action,
              facing:
                action.facing ??
                ((site === 'einzbern' || site === 'church') !==
                Boolean(action.mirror)
                  ? 'right'
                  : 'left'),
            })),
          scene: {
            ...room.scene,
            spots: room.scene.spots.map((spot) =>
              !matchingPose && room.actions.some((a) => a.id === spot.id)
                ? {
                    ...spot,
                    label: /读|书|手册|笔记|杂志/.test(spot.label)
                      ? '在这里翻阅'
                      : '在这里歇一会',
                    detail: spot.detail,
                  }
                : spot,
            ),
          },
        },
      ]),
    ),
  };
}
