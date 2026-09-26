import {
  MAX_BACKUP_BYTES,
  parseFateBackup,
  type FateBackup,
} from './fate-backup';
import { sameOriginRequest } from './fate-origin';

export const CLOUD_SAVE_PATH = '/api/fate/save';
export const MAX_CLOUD_SAVE_BYTES = MAX_BACKUP_BYTES;
export type CloudSaveSlot = {
  backup: FateBackup;
  revision: number;
  updatedAt: string;
};
export type CloudSaveView = { username: string; slot: CloudSaveSlot | null };
export type CloudSaveWrite = {
  backup: FateBackup;
  expectedRevision: number | null;
  expectedAccount: string;
};

/** The server authenticates once and closes both operations over that user's ID. */
export type CloudSaveSession = {
  username: string;
  /** Returns the stored slot, or null when this account has no save. */
  read: () => Promise<unknown>;
  compareAndSwap: (
    backup: FateBackup,
    expectedRevision: number | null,
  ) => Promise<unknown>;
};
export type CloudSaveBackend = (request: Request) => Promise<CloudSaveSession>;
export class CloudSaveError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const usernamePattern = /^[a-z0-9_]{3,32}$/;
const validRevision = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 2147483647;

function databaseText(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit === 0) return false;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}
function databaseStrings(value: unknown): boolean {
  if (typeof value === 'string') return databaseText(value);
  if (!value || typeof value !== 'object') return true;
  return Object.entries(value).every(
    ([key, child]) => databaseText(key) && databaseStrings(child),
  );
}

export function parseCloudSaveSlot(value: unknown): CloudSaveSlot {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('云端存档信息不完整，请重新读取。');
  const x = value as Record<string, unknown>;
  if (
    !validRevision(x.revision) ||
    typeof x.updatedAt !== 'string' ||
    x.updatedAt.length > 40 ||
    !Number.isFinite(Date.parse(x.updatedAt))
  )
    throw new Error('云端存档信息不完整，请重新读取。');
  return {
    backup: parseFateBackup(x.backup),
    revision: x.revision,
    updatedAt: x.updatedAt,
  };
}

export function parseCloudSaveView(value: unknown): CloudSaveView {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('未能读取云端账号，请重试。');
  const x = value as Record<string, unknown>;
  if (typeof x.username !== 'string' || !usernamePattern.test(x.username))
    throw new Error('未能读取云端账号，请重试。');
  return {
    username: x.username,
    slot: x.slot === null ? null : parseCloudSaveSlot(x.slot),
  };
}

async function readUpload(request: Request): Promise<Record<string, unknown>> {
  if (
    request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase() !== 'application/json'
  )
    throw new CloudSaveError(
      '请使用本站生成的存档上传。',
      400,
      'invalid_request',
    );
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_CLOUD_SAVE_BYTES)
    throw new CloudSaveError(
      '云端存档最大支持 5 MB，请保留较小的单份进度。',
      413,
      'too_large',
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new CloudSaveError('没有收到存档内容。', 400, 'invalid_request');
  let size = 0,
    text = '';
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_CLOUD_SAVE_BYTES) {
      await reader.cancel();
      throw new CloudSaveError(
        '云端存档最大支持 5 MB，请保留较小的单份进度。',
        413,
        'too_large',
      );
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new CloudSaveError(
      '存档提交格式无效，云端原进度未改变。',
      400,
      'invalid_request',
    );
  }
}

function failure(error: unknown) {
  const known = error instanceof CloudSaveError;
  return Response.json(
    {
      error: known ? error.message : '云端服务暂时不可用，请稍后重新读取。',
      code: known ? error.code : 'unavailable',
    },
    { status: known ? error.status : 503, headers },
  );
}

function checkOrigin(request: Request, requireOrigin: boolean) {
  // Same-origin browser GETs can omit Origin, but cross-site navigation cannot read a slot.
  if (
    request.headers.get('sec-fetch-site') === 'cross-site' ||
    !sameOriginRequest(request, requireOrigin)
  )
    throw new CloudSaveError('请求来源不匹配。', 403, 'origin');
}

export function createCloudSaveHandlers(connect: CloudSaveBackend) {
  return {
    async GET(request: Request): Promise<Response> {
      try {
        checkOrigin(request, false);
        const session = await connect(request);
        const stored = await session.read();
        const view = parseCloudSaveView({
          username: session.username,
          slot: stored,
        });
        return Response.json(view, { headers });
      } catch (error) {
        return failure(error);
      }
    },
    async PUT(request: Request): Promise<Response> {
      try {
        checkOrigin(request, true);
        const session = await connect(request);
        const body = await readUpload(request);
        if (
          typeof body.expectedAccount !== 'string' ||
          !usernamePattern.test(body.expectedAccount)
        )
          throw new CloudSaveError(
            '请先读取云端账号与存档，再确认上传。',
            400,
            'invalid_request',
          );
        if (body.expectedAccount !== session.username)
          throw new CloudSaveError(
            '登录账号已改变，请重新读取并确认要保存到的账号。',
            409,
            'account_changed',
          );
        if (
          body.expectedRevision !== null &&
          !validRevision(body.expectedRevision)
        )
          throw new CloudSaveError(
            '缺少有效的云端存档版本，请重新读取后上传。',
            400,
            'invalid_request',
          );
        let backup: FateBackup;
        try {
          backup = parseFateBackup(body.backup);
        } catch {
          throw new CloudSaveError(
            '这份存档已损坏或版本不受支持，云端原进度未改变。',
            400,
            'invalid_backup',
          );
        }
        // JSON accepts NUL and isolated UTF-16 surrogates, but PostgreSQL JSONB does not.
        // Reject them without silently altering story text or its matching quotations.
        if (!databaseStrings(backup))
          throw new CloudSaveError(
            '存档含空字符或不完整的文字字符，暂不能上传。请下载文件保留；云端原进度未改变。',
            400,
            'invalid_backup',
          );
        // The parser rebuilds only game fields. Connection keys and other extra data are discarded.
        if (
          new TextEncoder().encode(JSON.stringify(backup)).byteLength >
          MAX_CLOUD_SAVE_BYTES
        )
          throw new CloudSaveError('云端存档最大支持 5 MB。', 413, 'too_large');
        const stored = await session.compareAndSwap(
          backup,
          body.expectedRevision,
        );
        if (stored === null)
          throw new CloudSaveError(
            '云端已被另一台设备更新，本次没有覆盖。请重新读取云端进度，再决定保留哪一份。',
            409,
            'conflict',
          );
        const view = parseCloudSaveView({
          username: session.username,
          slot: stored,
        });
        return Response.json(view, {
          status: body.expectedRevision === null ? 201 : 200,
          headers,
        });
      } catch (error) {
        return failure(error);
      }
    },
  };
}
