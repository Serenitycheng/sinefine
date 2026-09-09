import { FATE_CAST, fatePerson, type WaverStage } from './fate-cast';

// Entrances stand for addresses in the wider district, not finished interior maps.
export const FATE_HOMES = {
  einzbern: { name: '切嗣一家 · 新居', x: 307, y: 779 },
  emiya: { name: '卫宫宅 · 士郎的家', x: 465, y: 835 },
  tohsaka: { name: '远坂宅', x: 630, y: 835 },
  matou: { name: '间桐宅', x: 990, y: 835 },
  waver: { name: '韦伯的住处', x: 1120, y: 835 },
  temple: { name: '柳洞寺 · 葛木的住处', x: 1430, y: 835 },
  church: { name: '教会 · 绮礼的住处', x: 1570, y: 835 },
  kayneth: { name: '肯尼斯的住处', x: 1300, y: 835 },
  fujimura: { name: '藤村家', x: 130, y: 835 },
  natalia: { name: '娜塔莉亚的住处', x: 790, y: 835 },
} as const;
export type HomeId = keyof typeof FATE_HOMES;
export const SERVANT_MASTERS: Record<string, string> = {
  saber: 'shirou',
  emiya: 'rin',
  medusa: 'sakura',
  medea: 'kuzuki',
  iskandar: 'waver',
  diarmuid: 'kayneth',
  cu: 'kirei',
  gilgamesh: 'tokiomi',
};
export const HUMAN_HOMES: Record<string, HomeId> = {
  kiritsugu: 'einzbern',
  irisviel: 'einzbern',
  illya: 'einzbern',
  shirou: 'emiya',
  rin: 'tohsaka',
  sakura: 'matou',
  tokiomi: 'tohsaka',
  kariya: 'matou',
  kuzuki: 'temple',
  waver: 'waver',
  kirei: 'church',
  taiga: 'fujimura',
  natalia: 'natalia',
  kayneth: 'kayneth',
};
export type FateHousing = {
  sistersTogether: boolean;
  masters: Record<string, string>;
};
export function defaultHousing(): FateHousing {
  return { sistersTogether: false, masters: { ...SERVANT_MASTERS } };
}
export function isHomeId(value: unknown): value is HomeId {
  return typeof value === 'string' && Object.hasOwn(FATE_HOMES, value);
}
export function parseHousing(value: unknown): FateHousing {
  if (value === undefined) return defaultHousing();
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('住处设定无效');
  const x = value as Record<string, unknown>;
  if (
    typeof x.sistersTogether !== 'boolean' ||
    !x.masters ||
    typeof x.masters !== 'object' ||
    Array.isArray(x.masters)
  )
    throw new Error('同住与御主设定无效');
  const masters = { ...SERVANT_MASTERS };
  for (const [servant, master] of Object.entries(x.masters)) {
    if (
      !Object.hasOwn(SERVANT_MASTERS, servant) ||
      typeof master !== 'string' ||
      !Object.hasOwn(HUMAN_HOMES, master)
    )
      throw new Error('从者的居住关联无效');
    masters[servant] = master;
  }
  return { sistersTogether: x.sistersTogether, masters };
}
export function homeOf(
  id: string,
  housing: FateHousing = defaultHousing(),
): HomeId {
  const resident = housing.masters[id] ?? id;
  return resident === 'sakura' && housing.sistersTogether
    ? 'tohsaka'
    : (HUMAN_HOMES[resident] ?? 'emiya');
}
export function housingContext(
  housing: FateHousing,
  stage: WaverStage = 'young',
) {
  return {
    同住安排: Object.entries(FATE_HOMES)
      .map(([id, home]) => ({
        住处: home.name,
        居民: FATE_CAST.filter((p) => homeOf(p.id, housing) === id).map(
          (p) => fatePerson(p.id, stage)!.name,
        ),
      }))
      .filter((home) => home.居民.length),
    生活来往: '切嗣与爱丽丝菲尔、伊莉雅一起住，士郎在卫宫宅生活。切嗣偶尔回卫宫宅探望养子；同住不代表时时刻刻都在家，是否在场看当前行动。同住或入住不自动消除原有心结，也不自动改变恋爱关系。',
    从者居住关联: Object.entries(housing.masters).map(
      ([servant, master]) =>
        `${fatePerson(servant, stage)!.name}随${fatePerson(master, stage)?.name ?? '肯尼斯'}居住`,
    ),
    说明: '这是一条可调整的生活分支，居住关联不自行改写圣杯战争契约或历史。未登场者的住址是预留设定，不声称已在街道行动。',
  };
}
