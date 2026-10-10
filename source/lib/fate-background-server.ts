import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  cloudAdmin,
  cloudConfig,
  cloudIdentity,
  readCloudConnection,
  assertSameOrigin,
  CloudError,
  privateHeaders,
} from './fate-cloud';
import { unsealKey } from './fate-cloud-crypto';
import { createFateChatHandler, FateConnectionError } from './fate-chat';
import {
  databaseStrings,
  readCloudUpload,
  CloudSaveError,
} from './fate-cloud-save';
import { parseFateBackup } from './fate-backup';
import {
  BACKGROUND_MODEL,
  backgroundReservation,
  backgroundUsageCost,
  parseBackgroundView,
  type BackgroundSession,
} from './fate-background';
import { runBackgroundRound } from './fate-background-simulation';

type Row = {
  user_id: string;
  enabled: boolean;
  revision: number;
  backup: unknown;
  origin: string;
  updated_at: string;
  next_run_at: string;
  budget_day: string;
  spent_micros: number;
  tokens: number;
  rounds: number;
  notice: string;
  lease: string;
};
function toSession(row: Row): BackgroundSession {
  return {
    enabled: row.enabled,
    revision: row.revision,
    backup: parseFateBackup(row.backup),
    origin: row.origin,
    updatedAt: row.updated_at,
    nextRunAt: row.next_run_at,
    budgetDay: row.budget_day,
    spentMicros: row.spent_micros,
    tokens: row.tokens,
    rounds: row.rounds,
    notice: row.notice,
  };
}
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof CloudError || error instanceof CloudSaveError
          ? error.message
          : '后台日常尚未配置完成，请查看仓库中的后台配置说明。',
    },
    {
      status:
        error instanceof CloudError || error instanceof CloudSaveError
          ? error.status
          : 503,
      headers: privateHeaders,
    },
  );
}
export async function readBackground(request: Request) {
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site')
      throw new CloudError('请求来源不匹配。', 403);
    const identity = (await cloudIdentity())!;
    const { data, error } = await identity.admin
      .from('fate_background_sessions')
      .select('*')
      .eq('user_id', identity.user.id)
      .maybeSingle();
    if (error) throw new Error();
    return Response.json(
      parseBackgroundView({
        username: identity.account.username,
        session: data ? toSession(data as Row) : null,
      }),
      { headers: privateHeaders },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function configureBackground(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = (await cloudIdentity())!;
    const body = await readCloudUpload(request);
    if (body.expectedAccount !== identity.account.username)
      throw new CloudError('账号已改变，请重新读取后台进度。', 409);
    if (
      typeof body.enabled !== 'boolean' ||
      (body.expectedRevision !== null &&
        (!Number.isSafeInteger(body.expectedRevision) ||
          Number(body.expectedRevision) < 1))
    )
      throw new CloudError('请先读取后台进度再操作。', 400);
    const backup = body.enabled ? parseFateBackup(body.backup) : null;
    if (backup?.save.emiya?.active)
      throw new CloudError('请先从卫宫宅走回街道，再开启后台日常。', 400);
    if (backup && !databaseStrings(backup))
      throw new CloudError('存档含无效文字字符，请先修复后再开启后台。', 400);
    if (body.enabled) {
      if ((process.env.FATE_BACKGROUND_CRON_SECRET?.length ?? 0) < 32)
        throw new CloudError('后台定时任务尚未配置，请先完成后台配置说明。');
      const { data: ready, error: cronError } = await identity.admin.rpc(
        'fate_background_ready',
      );
      if (cronError || !ready)
        throw new CloudError(
          'Supabase 后台时钟尚未启用，请先完成后台配置说明。',
        );
      if (!(await readCloudConnection(identity)))
        throw new CloudError(
          '请先在 AI 设置登录账号并保存 DeepSeek 连接。',
          400,
        );
    }
    const origin = backup
      ? createHash('sha256').update(JSON.stringify(backup.save)).digest('hex')
      : null;
    const { data, error } = await identity.admin
      .rpc('fate_configure_background', {
        p_user_id: identity.user.id,
        p_expected: body.expectedRevision,
        p_enabled: body.enabled,
        p_backup: backup,
        p_origin: origin,
      })
      .maybeSingle();
    if (error) throw new Error();
    if (!data)
      throw new CloudError('后台进度已更新，请重新读取；本次没有覆盖。', 409);
    return Response.json(
      parseBackgroundView({
        username: identity.account.username,
        session: toSession(data as Row),
      }),
      { headers: privateHeaders },
    );
  } catch (error) {
    return failure(error);
  }
}
function validCron(request: Request): boolean {
  const secret = process.env.FATE_BACKGROUND_CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function tickBackground(request: Request) {
  if (!validCron(request))
    return Response.json({ error: '未经授权的定时请求。' }, { status: 401 });
  try {
    const admin = cloudAdmin();
    const { data, error } = await admin
      .rpc('fate_claim_background')
      .maybeSingle();
    if (error) throw new Error();
    if (!data)
      return Response.json({ processed: 0 }, { headers: privateHeaders });
    const row = data as Row;
    let reserved = 0,
      cost = 0,
      tokens = 0,
      notice = '',
      budget = false;
    let backup = null;
    try {
      const { data: connection, error: keyError } = await admin
        .from('fate_connections')
        .select('encrypted_key')
        .eq('user_id', row.user_id)
        .maybeSingle();
      if (keyError || !connection)
        throw new Error('云端连接已移除，请重新保存连接后开启后台。');
      const key = unsealKey(
        connection.encrypted_key,
        row.user_id,
        cloudConfig().secret,
      );
      const meteredFetch: typeof fetch = async (url, options) => {
        if (typeof options?.body !== 'string')
          throw new FateConnectionError('后台请求格式超出计费范围。');
        const amount = backgroundReservation(options.body);
        const { data: allowed, error: quotaError } = await admin.rpc(
          'fate_reserve_background',
          { p_user_id: row.user_id, p_lease: row.lease, p_amount: amount },
        );
        if (quotaError)
          throw new FateConnectionError('暂时无法核对后台预算，已暂停。');
        if (!allowed) {
          budget = true;
          throw new FateConnectionError(
            '今日预算不足以进行下一次调用，次日自动继续。',
            429,
          );
        }
        reserved = cost = amount;
        const response = await fetch(url, options);
        // Keep the full reservation when a timeout/unknown response prevents
        // verifying usage. A malformed game reply can still be billed upstream.
        try {
          const payload = (await response.clone().json()) as {
            usage?: unknown;
          };
          const measured = backgroundUsageCost(payload.usage, amount);
          cost = measured.cost;
          tokens = measured.tokens;
        } catch {
          /* Conservative reservation retained. */
        }
        return response;
      };
      const handler = createFateChatHandler(meteredFetch, async () => key);
      backup = await runBackgroundRound(
        parseFateBackup(row.backup),
        async (body) => {
          const response = await handler(
            new Request('https://sinefine.internal/api/fate/chat', {
              method: 'POST',
              headers: {
                Origin: 'https://sinefine.internal',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...body,
                model: BACKGROUND_MODEL,
                connection: 'cloud',
              }),
            }),
          );
          const payload = (await response.json()) as Record<string, unknown>;
          if (!response.ok)
            throw new Error(
              typeof payload.error === 'string'
                ? payload.error
                : '后台 AI 暂时没有回应。',
            );
          return payload;
        },
      );
    } catch (error) {
      notice = (
        error instanceof Error ? error.message : '后台日常运行失败，已暂停。'
      ).slice(0, 300);
    }
    const { error: finishError, data: finished } = await admin.rpc(
      'fate_finish_background',
      {
        p_user_id: row.user_id,
        p_lease: row.lease,
        p_backup: backup,
        p_cost: reserved ? cost : 0,
        p_tokens: tokens,
        p_notice: notice,
        p_budget: budget,
      },
    );
    if (finishError) throw new Error();
    return Response.json(
      { processed: finished ? 1 : 0 },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: '后台任务未完成，请检查云端配置。' },
      { status: 503, headers: privateHeaders },
    );
  }
}
