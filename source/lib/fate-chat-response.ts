function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Only completed assistant speech is usable; reasoning is never a reply. */
export function completionReply(data: unknown, maxLength: number): string {
  const payload = object(data);
  const choice = Array.isArray(payload?.choices)
    ? object(payload.choices[0])
    : undefined;
  const reason = choice?.finish_reason;
  if (reason === 'length')
    throw new Error(
      'DeepSeek 本次回复达到长度上限，被中途截断。请重试；本次未写入记录。',
    );
  if (reason !== undefined && reason !== 'stop')
    throw new Error('DeepSeek 本次未正常完成回应。请重试；本次未写入记录。');
  const message = object(choice?.message);
  if (
    (message?.role !== undefined && message.role !== 'assistant') ||
    message?.refusal
  )
    throw new Error(
      'DeepSeek 本次没有返回可用的角色回应。请重试；本次未写入记录。',
    );
  const content = message?.content;
  if (content === null || (typeof content === 'string' && !content.trim()))
    throw new Error('DeepSeek 本次返回了空回应。请重试；本次未写入记录。');
  if (typeof content !== 'string')
    throw new Error(
      'DeepSeek 返回的回应格式无法识别。请重试；本次未写入记录。',
    );
  if (content.length > maxLength)
    throw new Error(
      'DeepSeek 本次回应过长，无法保存为短对话。请重试；本次未写入记录。',
    );
  return content.trim();
}

/** Accept a complete JSON fence, but never salvage a fragment or double-speaker script. */
export function manualChatReply(content: string): {
  reply: string;
  effects?: unknown;
} {
  let raw = content.trim();
  if (raw.startsWith('```')) {
    const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(raw);
    if (!fence || !fence[1].trim().startsWith('{')) throw new Error('无效回应');
    raw = fence[1].trim();
  }
  if (raw.startsWith('{')) {
    const value = object(JSON.parse(raw));
    if (
      !value ||
      typeof value.reply !== 'string' ||
      !value.reply.trim() ||
      value.reply.length > 2400 ||
      Object.hasOwn(value, 'turns')
    )
      throw new Error('无效回应');
    return { reply: value.reply.trim(), effects: value.effects };
  }
  if (!raw || raw.length > 2400 || /^\[\s*(?:\{|\[|"|\])/.test(raw))
    throw new Error('无效回应');
  return { reply: raw };
}
