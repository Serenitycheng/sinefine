import { isPartner, type PartnerId } from './fate-cast';
import { parseFateSettings, type FateSettings } from './fate-world';
import type { ActorId, Actor } from './street';
import { WALK_AREAS, isActorId } from './street';
import { parseDailyLife, type DailyLife } from './fate-life';
export type Exchange = {
  id: string;
  target: PartnerId;
  speaker: ActorId;
  message: string;
  reply: string;
  source: 'preset' | 'deepseek';
  createdAt: string;
};
export type FateSave = FateSettings & {
  version: 1;
  history: Exchange[];
  life?: DailyLife;
};
export const FATE_STORAGE_KEY = 'sine-fine-fate-v1';
export function emptyFateSave(): FateSave {
  return {
    version: 1,
    worldNote: '',
    characterNotes: {},
    relationshipNotes: {},
    history: [],
  };
}
export function parseFateSave(input: unknown): FateSave {
  if (!input || typeof input !== 'object') throw new Error('存档格式不正确');
  const x = input as Record<string, unknown>;
  if (
    x.version !== 1 ||
    typeof x.worldNote !== 'string' ||
    x.worldNote.length > 2000 ||
    !Array.isArray(x.history) ||
    x.history.length > 120
  )
    throw new Error('存档版本或内容不正确');
  const history: Exchange[] = x.history.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('对话记录不正确');
    const e = value as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      e.id.length > 80 ||
      !isPartner(e.target) ||
      !isActorId(e.speaker) ||
      e.speaker === e.target ||
      typeof e.message !== 'string' ||
      e.message.length > 1200 ||
      typeof e.reply !== 'string' ||
      e.reply.length > 2400 ||
      !['preset', 'deepseek'].includes(String(e.source)) ||
      typeof e.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(e.createdAt))
    )
      throw new Error('对话记录超出范围');
    return {
      id: e.id,
      target: e.target,
      speaker: e.speaker as ActorId,
      message: e.message,
      reply: e.reply,
      source: e.source as Exchange['source'],
      createdAt: e.createdAt,
    };
  });
  return {
    version: 1,
    ...parseFateSettings(x as FateSettings),
    history,
    ...(x.life === undefined ? {} : { life: parseDailyLife(x.life) }),
  };
}
export function updateFateSettings(
  save: FateSave,
  settings: FateSettings,
): FateSave {
  return { ...save, ...parseFateSettings(settings) };
}
export function nearestPartner(
  actors: Actor[],
  active: ActorId,
): PartnerId | null {
  const player = actors.find((a) => a.id === active);
  if (!player) return null;
  const candidate = actors
    .filter(
      (a) =>
        isPartner(a.id) &&
        a.id !== active &&
        Math.hypot(a.x - player.x, a.y - player.y) <= 135 &&
        WALK_AREAS.some((r) =>
          [a, player].every(
            (p) =>
              p.x >= r.left &&
              p.x <= r.right &&
              p.y >= r.top &&
              p.y <= r.bottom,
          ),
        ),
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) -
        Math.hypot(b.x - player.x, b.y - player.y),
    )[0];
  return candidate && isPartner(candidate.id) ? candidate.id : null;
}
export function conversationHistory(
  save: FateSave,
  target: PartnerId,
  speaker: ActorId,
) {
  return save.history
    .filter((e) => e.target === target && e.speaker === speaker)
    .slice(-8);
}
