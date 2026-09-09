import { FATE_CAST, fatePerson, type WaverStage } from './fate-cast';

export type FateSettings = {
  worldNote: string;
  characterNotes: Record<string, string>;
  relationshipNotes: Record<string, string>;
};

export const FATE_OPENING = [
  {
    title: '故事从这里延续',
    detail:
      '以 Fate/Zero 与 UBW 为背景，走入 UBW 之后的冬木日常。具体日期与历史分歧暂不定死。',
  },
  {
    title: '每个人都能继续生活',
    detail:
      '首批 21 人全部可以在此生活，包括原作已故人物。保留各自过去，不强制重演死亡或战争。',
  },
  {
    title: '从者能够常驻',
    detail:
      '日常生活不依赖御主供魔。原有契约与人际联系可以保留，不因此消除彼此的感情或矛盾。',
  },
  {
    title: '凛与士郎，恋人之间',
    detail:
      '本分支中凛与士郎已是情侣，并保持这段关系。日常可以有默契、关心和小摩擦，普通争执不会自动导致分手；旧记录中的关系未定说法不再适用。各自住处维持现有安排。其他人的关系沿用现有设定。',
  },
  {
    title: '熟悉的人，未定的明天',
    detail:
      '先维持原有性格和关系，允许以后变化。具体事件的记忆范围暂未确定，不统一成全知或失忆。',
  },
] as const;

export function parseFateNotes(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('人物设定格式不正确');
  const result: Record<string, string> = {};
  for (const [id, note] of Object.entries(value)) {
    if (!fatePerson(id) || typeof note !== 'string' || note.length > 1000)
      throw new Error('人物设定超出范围');
    if (note.trim()) result[id] = note;
  }
  return result;
}

export function parseFateSettings(value: FateSettings): FateSettings {
  if (typeof value.worldNote !== 'string' || value.worldNote.length > 2000)
    throw new Error('世界补充须在 2000 字以内');
  return {
    worldNote: value.worldNote,
    characterNotes: parseFateNotes(value.characterNotes),
    relationshipNotes: parseFateNotes(value.relationshipNotes),
  };
}

export function fateWorldContext(
  settings: FateSettings,
  stage: WaverStage = 'young',
) {
  return {
    开局规则: FATE_OPENING.map((rule) => rule.detail),
    可以继续生活的人物: FATE_CAST.map(
      (person) => fatePerson(person.id, stage)!.name,
    ),
    世界补充: settings.worldNote,
    人物与关系调整: FATE_CAST.filter(
      (person) =>
        settings.characterNotes[person.id] ||
        settings.relationshipNotes[person.id],
    ).map((person) => ({
      人物: fatePerson(person.id, stage)!.name,
      人物补充: settings.characterNotes[person.id] || '',
      关系补充: settings.relationshipNotes[person.id] || '',
    })),
  };
}
