import {
  TOHSAKA_ROOMS,
  TOHSAKA_CAST,
  type TohsakaActorId,
} from './fate-tohsaka-house';
import { tohsakaSprite } from './fate-tohsaka-sprites';
import { MATOU_ROOMS, MATOU_CAST, type MatouActorId } from './fate-matou-house';
import { matouSprite } from './fate-matou-sprites';
import {
  EINZBERN_ROOMS,
  EINZBERN_CAST,
  type EinzbernActorId,
} from './fate-einzbern-house';
import { einzbernSprite } from './fate-einzbern-sprites';
import { WAVER_ROOMS, WAVER_CAST, type WaverActorId } from './fate-waver-house';
import { waverSprite } from './fate-waver-sprites';
import {
  TEMPLE_ROOMS,
  TEMPLE_CAST,
  type TempleActorId,
} from './fate-temple-house';
import { templeSprite } from './fate-temple-sprites';
import {
  CHURCH_ROOMS,
  CHURCH_CAST,
  type ChurchActorId,
} from './fate-church-house';
import { churchSprite } from './fate-church-sprites';
import type { PreviewHouse } from './fate-preview-house';

export const HOUSE_PREVIEWS: Record<
  'tohsaka' | 'matou' | 'einzbern' | 'waver' | 'temple' | 'church',
  PreviewHouse
> = {
  tohsaka: {
    name: '远坂宅',
    rooms: TOHSAKA_ROOMS,
    cast: TOHSAKA_CAST,
    routeSummary: '玄关 → 会客书房／餐厅／楼上卧室／地下工房',
    sprite: (actor, direction, phase, pose) => {
      const sprite = tohsakaSprite(
        actor as TohsakaActorId,
        direction,
        phase,
        pose,
      );
      return {
        ...sprite,
        cropX: sprite.col * sprite.cellWidth,
        cropY: sprite.row * sprite.cellHeight,
        imageWidth: sprite.columns * sprite.cellWidth,
        imageHeight: sprite.rows * sprite.cellHeight,
      };
    },
  },
  matou: {
    name: '间桐宅',
    rooms: MATOU_ROOMS,
    cast: MATOU_CAST,
    routeSummary: '玄关 → 起居厅／餐厨／楼上卧室／地下资料间',
    sprite: (actor, direction, phase, pose) =>
      matouSprite(actor as MatouActorId, direction, phase, pose),
  },
  einzbern: {
    name: '切嗣一家 · 新居',
    rooms: EINZBERN_ROOMS,
    cast: EINZBERN_CAST,
    routeSummary: '玄关 → 家庭起居间／厨房早餐间／父母卧室／伊莉雅房间／书房',
    sprite: (actor, direction, phase, pose) =>
      einzbernSprite(actor as EinzbernActorId, direction, phase, pose),
  },
  waver: {
    name: '韦伯的住处',
    rooms: WAVER_ROOMS,
    cast: WAVER_CAST,
    routeSummary: '玄关 → 起居资料角／厨房餐间／借住卧室／庭边缘侧',
    sprite: (actor, direction, phase, pose) =>
      waverSprite(actor as WaverActorId, direction, phase, pose),
  },
  temple: {
    name: '柳洞寺',
    rooms: TEMPLE_ROOMS,
    cast: TEMPLE_CAST,
    routeSummary: '木廊 → 共用生活间／斋堂／葛木僧房／手作静室／庭边木廊',
    sprite: (actor, direction, phase, pose) =>
      templeSprite(actor as TempleActorId, direction, phase, pose),
  },
  church: {
    name: '冬木教会',
    rooms: CHURCH_ROOMS,
    cast: CHURCH_CAST,
    routeSummary: '门厅 → 礼拜堂／祭衣间／绮礼生活间／地下资料室',
    sprite: (actor, direction, phase, pose) =>
      churchSprite(actor as ChurchActorId, direction, phase, pose),
  },
};
