import raw from './fate-body-art-data.json';
import type { PreviewSprite, PreviewDirection } from './fate-preview-house';
import type { PartnerId, WaverStage } from './fate-cast';
import type { BodyFacing } from './fate-body-facing';
import { bodyGait } from './fate-body-gait';

type Frame = Pick<
  PreviewSprite,
  | 'cropX'
  | 'cropY'
  | 'cellWidth'
  | 'cellHeight'
  | 'anchorX'
  | 'anchorY'
  | 'bounds'
  | 'clip'
  | 'seat'
  | 'seatedFacing'
> &
  Partial<Pick<PreviewSprite, 'file' | 'imageWidth' | 'imageHeight'>>;
type Model = {
  file: string;
  imageWidth: number;
  imageHeight: number;
  height: number;
  keys: Record<BodyFacing, number>;
  layout: {
    chair: number | null;
    floor: number | null;
    work: number | null;
    standingRead: number | null;
  };
  frames: Frame[];
};
const data = raw as unknown as Record<string, Model>;
const byFile = new Map(
  Object.values(data).flatMap(
    (model) =>
      [
        [model.file, model],
        ...model.frames.flatMap((frame) =>
          frame.file ? [[frame.file, model] as const] : [],
        ),
      ] as const,
  ),
);
const keyFor = (id: PartnerId, stage: WaverStage) =>
  id === 'waver' && stage === 'young' ? 'waver-young' : id;
const walkingCache = new Map<string, PreviewSprite>();
export function hasBodyPose(
  id: PartnerId,
  stage: WaverStage,
  surface: 'chair' | 'floor',
) {
  return data[keyFor(id, stage)]?.layout[surface] != null;
}
export function bodyArtSprite(
  id: PartnerId,
  direction: PreviewDirection,
  phase: number,
  stage: WaverStage = 'adult',
  pose?: 'sit' | 'read',
  facing: BodyFacing = direction,
  surface: 'chair' | 'floor' = 'chair',
): PreviewSprite | null {
  const key = keyFor(id, stage),
    model = data[key];
  if (!model) return null;
  const cacheKey = `${key}:${facing}:${phase}`;
  if (!pose && Number.isInteger(phase) && walkingCache.has(cacheKey))
    return walkingCache.get(cacheKey)!;
  const poseBase = model.layout[surface];
  if (pose && poseBase == null) return null;
  const right = !pose && facing.includes('right');
  const index = pose
    ? poseBase! + (pose === 'read' ? 2 : 0) + Number(right)
    : model.keys[facing];
  const frame = model.frames[index];
  if (!frame) return null;
  const standing = model.frames[0].bounds.height;
  const sprite: PreviewSprite = {
    ...frame,
    file: frame.file ?? model.file,
    imageWidth: frame.imageWidth ?? model.imageWidth,
    imageHeight: frame.imageHeight ?? model.imageHeight,
    scale: model.height / (pose ? standing : frame.bounds.height),
    standingHeight: model.height,
    mirror: false,
    index,
    seated: Boolean(pose),
    ...(pose ? { seatedFacing: 'left' as const } : {}),
    materialVersion: 'body-v2',
    bodyFacing: facing,
    ...(pose
      ? {
          poseHeightRatio:
            surface === 'floor'
              ? Math.max(0.35, Math.min(0.58, frame.bounds.height / standing))
              : 0.77,
        }
      : {}),
  };
  const result = pose ? sprite : bodyGait(sprite, facing, phase);
  if (!pose && Number.isInteger(phase)) walkingCache.set(cacheKey, result);
  return result;
}

/** Authored whole-body working poses replace the former rectangular arm cut. */
export function bodyInteractionSprite(
  sprite: PreviewSprite,
  motion: string,
): PreviewSprite {
  if (
    sprite.materialVersion !== 'body-v2' ||
    sprite.seated ||
    motion === 'look'
  )
    return sprite;
  const model = byFile.get(sprite.file);
  if (!model) return sprite;
  const base =
    motion === 'read' ? model.layout.standingRead : model.layout.work;
  if (base == null) return sprite;
  const right = sprite.bodyFacing?.includes('right') ?? false,
    frame = model.frames[base + Number(right)];
  if (!frame) return sprite;
  return {
    ...sprite,
    ...frame,
    rig: undefined,
    index: base + Number(right),
    scale: model.height / model.frames[0].bounds.height,
  };
}

export function bodyInteractionArt(sprite: PreviewSprite) {
  const model = byFile.get(sprite.file);
  if (!model) return [];
  return [
    ...new Set(
      model.frames.flatMap((frame) => (frame.file ? [frame.file] : [])),
    ),
  ];
}

/** Use the painted opposite pose, preserving asymmetrical armor and clothing. */
export function bodyPoseFacing(
  sprite: PreviewSprite,
  facing: 'left' | 'right',
): PreviewSprite {
  if (
    sprite.materialVersion !== 'body-v2' ||
    !sprite.seated ||
    sprite.seatedFacing === facing
  )
    return sprite;
  const model = byFile.get(sprite.file),
    index = sprite.index + (facing === 'right' ? 1 : -1),
    frame = model?.frames[index];
  if (!model || !frame) return sprite;
  return {
    ...sprite,
    ...frame,
    file: frame.file ?? model.file,
    imageWidth: frame.imageWidth ?? model.imageWidth,
    imageHeight: frame.imageHeight ?? model.imageHeight,
    index,
    mirror: false,
    seatedFacing: facing,
    bodyFacing: facing,
  };
}
