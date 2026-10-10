import { FATE_CAST } from './fate-cast';
import { STREET_CAST } from './fate-street-cast';
import type { ActorId } from './street';

export type CharacterArt = {
  id: ActorId;
  name: string;
  reference: string | null;
  stage: 'study-ready' | 'to-refine';
  model: string | null;
  scope: 'city-sample' | 'emiya-sample' | 'legacy';
  frames: 'four-direction-six-frame' | 'four-direction-reused-frame' | 'legacy';
  height: number;
  variants: readonly string[];
};
const modelAssets: Partial<Record<ActorId, string>> = {
  illya: '/fate/art-sample/illya-walk-v1.png',
  shirou: '/fate/character-art/shirou-walk-side-soft-v2.png',
  saber: '/fate/character-art/saber-walk-soft-v1.png',
  sakura: '/fate/character-art/sakura-visit-soft-v1.png',
  taiga: '/fate/character-art/taiga-visit-soft-v1.png',
};
/** Cover every selectable identity; old chibi sheets are a fallback, never
 * counted as finished 2.5D character models. Existing identity IDs stay intact. */
export const CHARACTER_ART: readonly CharacterArt[] = STREET_CAST.map(
  (actor) => ({
    id: actor.id,
    name: actor.name,
    reference:
      FATE_CAST.find((person) => person.id === actor.id)?.portraits[0]?.file ??
      null,
    stage: modelAssets[actor.id] ? 'study-ready' : 'to-refine',
    model: modelAssets[actor.id] ?? null,
    scope:
      actor.id === 'illya'
        ? 'city-sample'
        : modelAssets[actor.id]
          ? 'emiya-sample'
          : 'legacy',
    frames: ['illya', 'shirou', 'saber'].includes(actor.id)
      ? 'four-direction-six-frame'
      : ['sakura', 'taiga'].includes(actor.id)
        ? 'four-direction-reused-frame'
        : 'legacy',
    height: actor.id === 'illya' ? 132 : actor.id === 'iskandar' ? 193 : 165,
    variants:
      actor.id === 'waver'
        ? ['青年', '埃尔梅罗二世']
        : actor.id === 'gilgamesh'
          ? ['黄金铠甲', '黑色服装']
          : actor.id === 'sakura'
            ? ['日常', '黑樱（保留独立形象）']
            : actor.id === 'iskandar'
              ? ['步行', '骑马（分别验收）']
              : ['日常'],
  }),
);
export function characterArt(id: ActorId) {
  return CHARACTER_ART.find((actor) => actor.id === id)!;
}
export const CHARACTER_ART_ACTIONS = [
  '四方向站立与行走',
  '自然转身与停步',
  '交谈',
  '坐下／起身',
  '读书',
  '进餐',
  '休息',
] as const;
export const ILLYA_ART_SPRITE = '/fate/art-sample/illya-walk-v1.png';
