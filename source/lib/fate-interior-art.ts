import { FATE_HOMES, type HomeId } from './fate-housing';
import { HOME_ROOMS, type RoomZone } from './fate-indoor-layout';
import { HOME_ENTRANCES } from './fate-home-entrances';
import { CITY_INTERIOR_SCENES } from './fate-city-interior-scenes';

const THEMES: Record<
  HomeId,
  { materials: string; signature: string; plants: string }
> = {
  emiya: {
    materials: '杉木、榻榻米、纸拉门',
    signature: '能一起做饭的厨房与起居间，庭院透进日光',
    plants: '庭院樟树、檐边栀子',
  },
  einzbern: {
    materials: '暖木地板、浅色墙面、柔软织物',
    signature: '切嗣一家在冬木的生活住处；家庭餐桌、书架与女儿的物品',
    plants: '院门栀子、窗台小花',
  },
  tohsaka: {
    materials: '深木、旧铜件、米色织物',
    signature: '有年代感的洋馆书房、茶具和规整的会客区',
    plants: '窗外枫树与蔷薇',
  },
  matou: {
    materials: '旧木、暗绿织物、灰白墙面',
    signature: '较深的走廊和厚窗帘；压抑但不能黑到看不清',
    plants: '院墙常青藤、蕨',
  },
  waver: {
    materials: '旧木、棉织物、纸与书',
    signature: '资料、地图、桌灯和日常茶杯；保留普通住家的尺度',
    plants: '庭院榉树、窗台绿植',
  },
  temple: {
    materials: '木梁、榻榻米、障子、石基',
    signature: '寺院居所、安静阅览角和朴素饭桌',
    plants: '窗外杉松与苔',
  },
  church: {
    materials: '浅石、深木、素色织物',
    signature: '教会生活与会客空间；门厅、桌案与侧窗光',
    plants: '窗外常青树',
  },
  kayneth: {
    materials: '石与木、整洁织物、金属小件',
    signature: '新都较现代的住所、工作资料与正式会客区',
    plants: '窗外银杏、室内少量花艺',
  },
  fujimura: {
    materials: '木、榻榻米、纸门',
    signature: '温暖热闹的日式家庭厨房与起居间',
    plants: '庭院枫与杜鹃',
  },
  natalia: {
    materials: '旧木、朴素墙面、耐用织物',
    signature: '实用收纳与工具桌，留出真实可走动的空间',
    plants: '旧街榉树、蕨与香草盆栽',
  },
};
export const INTERIOR_ROOM_PURPOSES: Record<RoomZone, string> = {
  lounge: '交谈、会客与一起休息',
  table: '备餐、进餐和收拾',
  study: '阅读、学习与处理资料',
  rest: '睡眠、更衣与私人物品',
};

/** Retain home IDs, room order, furnishing collision and care activities.
 * Art is an authored visual layer, not a silent indoor save migration. */
export const INTERIOR_ART = (Object.keys(FATE_HOMES) as HomeId[]).map((id) => ({
  id,
  name: FATE_HOMES[id].name,
  entrance: HOME_ENTRANCES[id].door,
  rooms: HOME_ROOMS[id].map((zone) => ({
    zone,
    purpose: INTERIOR_ROOM_PURPOSES[zone],
  })),
  ...THEMES[id],
  mainPainting: CITY_INTERIOR_SCENES[id].painting,
  mainRoom: CITY_INTERIOR_SCENES[id].room,
  mainStage: 'ready' as const,
  stage: 'to-refine' as const,
}));
const STORE_IDS = [
  'cafe',
  'shops',
  'miyama-florist',
  'old-bookshop',
  'miyama-bakery',
  'old-repair',
  'shinto-convenience',
] as const;
export const STORE_INTERIOR_ART = STORE_IDS.map((id) => ({
  id,
  name: CITY_INTERIOR_SCENES[id].name,
  purpose: CITY_INTERIOR_SCENES[id].description,
  painting: CITY_INTERIOR_SCENES[id].painting,
  stage: 'main-ready' as const,
}));
