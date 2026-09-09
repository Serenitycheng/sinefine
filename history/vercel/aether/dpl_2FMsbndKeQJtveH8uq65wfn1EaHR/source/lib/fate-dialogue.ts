import { isPartner, type PartnerId } from './fate-cast';

export type DialogueTurn = { speaker: PartnerId; text: string };

/** Both people must speak in order. Never persist extra actors or partial scenes. */
export function parseDialogueTurns(
  value: unknown,
  speaker: string,
  target: string,
): DialogueTurn[] {
  if (
    !isPartner(speaker) ||
    !isPartner(target) ||
    speaker === target ||
    !Array.isArray(value) ||
    ![4, 6].includes(value.length)
  )
    throw new Error('自主交谈需要两个人交替发言，共四句或六句。');
  const turns = value.map((turn: unknown, i) => {
    if (!turn || typeof turn !== 'object') throw new Error('交谈内容无效');
    const t = turn as Record<string, unknown>;
    const expected = i % 2 === 0 ? speaker : target;
    if (
      t.speaker !== expected ||
      typeof t.text !== 'string' ||
      !t.text.trim() ||
      t.text.length > 300
    )
      throw new Error('交谈人物或台词无效');
    return { speaker: expected, text: t.text.trim() };
  });
  if (turns.reduce((n, t) => n + t.text.length, 0) > 1800)
    throw new Error('交谈过长');
  return turns;
}

export function storedDialogueTurns(
  value: unknown,
  speaker: string,
  target: string,
  message: string,
  reply: string,
) {
  if (value === undefined) return {};
  const turns = parseDialogueTurns(value, speaker, target);
  if (turns[0].text !== message || turns[1].text !== reply)
    throw new Error('交谈摘要与完整记录不一致');
  return { turns };
}

export function dialogueLines<T extends string>(dialogue: {
  speaker: T;
  target: T;
  message: string;
  reply: string;
  turns?: DialogueTurn[];
}) {
  return (
    dialogue.turns ?? [
      { speaker: dialogue.speaker, text: dialogue.message },
      { speaker: dialogue.target, text: dialogue.reply },
    ]
  );
}
