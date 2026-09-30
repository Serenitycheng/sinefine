import { parseFateBackup, type FateBackup } from './fate-backup';

export const BACKGROUND_PATH = '/api/fate/background';
export const BACKGROUND_INTERVAL = 30;
export const BACKGROUND_MODEL = 'deepseek-flash';
export const BACKGROUND_BUDGET_MICROS = 5_000_000;
// Official CNY peak/cache-miss prices checked 2026-09-30. Expire rather than
// silently continuing with a stale price book after a provider price change.
export const BACKGROUND_PRICING_UNTIL = '2026-10-30T00:00:00+08:00';
export const BACKGROUND_INPUT_PRICE = 2;
export const BACKGROUND_OUTPUT_PRICE = 8;
export type BackgroundSession = {
  enabled: boolean;
  revision: number;
  backup: FateBackup;
  origin: string;
  updatedAt: string;
  nextRunAt: string;
  budgetDay: string;
  spentMicros: number;
  tokens: number;
  rounds: number;
  notice: string;
};
export type BackgroundView = {
  username: string;
  session: BackgroundSession | null;
};

export function backgroundDay(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
export function backgroundReservation(
  payload: string,
  now = new Date(),
): number {
  if (now.getTime() >= Date.parse(BACKGROUND_PRICING_UNTIL))
    throw new Error('后台 AI 价格表已到期，请更新定价后再开启。');
  const body = JSON.parse(payload) as {
    model: string;
    max_tokens: number;
    thinking?: { type: string };
    messages: unknown;
  };
  if (
    body.model !== BACKGROUND_MODEL ||
    body.thinking?.type !== 'disabled' ||
    !Number.isInteger(body.max_tokens) ||
    body.max_tokens < 1 ||
    body.max_tokens > 1800
  )
    throw new Error('后台调用超出费用控制范围。');
  // A UTF-8 byte is a conservative upper bound on a byte-tokenizer token.
  // Include JSON and a 2048-token framing margin, count all input as cache miss.
  const bytes = new TextEncoder().encode(payload).byteLength;
  if (bytes > 160_000)
    throw new Error('后台上下文过长，请缩短世界和人物设定。');
  return (
    (bytes + 2048) * BACKGROUND_INPUT_PRICE +
    body.max_tokens * BACKGROUND_OUTPUT_PRICE
  );
}
export function backgroundUsageCost(
  usage: unknown,
  reservation: number,
): { cost: number; tokens: number } {
  if (!usage || typeof usage !== 'object')
    return { cost: reservation, tokens: 0 };
  const x = usage as Record<string, unknown>;
  const input = x.prompt_tokens,
    output = x.completion_tokens;
  if (
    typeof input !== 'number' ||
    typeof output !== 'number' ||
    !Number.isSafeInteger(input) ||
    !Number.isSafeInteger(output) ||
    input < 0 ||
    output < 0
  )
    return { cost: reservation, tokens: 0 };
  return {
    cost: Math.min(
      reservation,
      input * BACKGROUND_INPUT_PRICE + output * BACKGROUND_OUTPUT_PRICE,
    ),
    tokens: input + output,
  };
}
export function parseBackgroundView(value: unknown): BackgroundView {
  if (!value || typeof value !== 'object')
    throw new Error('后台进度信息无效。');
  const x = value as Record<string, unknown>;
  if (typeof x.username !== 'string' || !/^[a-z0-9_]{3,32}$/.test(x.username))
    throw new Error('后台账号信息无效。');
  if (x.session === null) return { username: x.username, session: null };
  const s = x.session as BackgroundSession;
  if (
    !s ||
    typeof s.enabled !== 'boolean' ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 1 ||
    typeof s.origin !== 'string' ||
    !/^[a-f0-9]{64}$/.test(s.origin) ||
    !Number.isFinite(Date.parse(s.updatedAt)) ||
    !Number.isFinite(Date.parse(s.nextRunAt)) ||
    typeof s.budgetDay !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s.budgetDay) ||
    !Number.isSafeInteger(s.spentMicros) ||
    s.spentMicros < 0 ||
    s.spentMicros > BACKGROUND_BUDGET_MICROS ||
    !Number.isSafeInteger(s.tokens) ||
    s.tokens < 0 ||
    !Number.isSafeInteger(s.rounds) ||
    s.rounds < 0 ||
    typeof s.notice !== 'string' ||
    s.notice.length > 300
  )
    throw new Error('后台进度信息无效。');
  return {
    username: x.username,
    session: { ...s, backup: parseFateBackup(s.backup) },
  };
}
export async function backgroundFingerprint(
  backup: FateBackup,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify(parseFateBackup(backup).save),
  );
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
}
