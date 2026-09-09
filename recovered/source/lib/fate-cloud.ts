import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { privateHash, unsealKey } from './fate-cloud-crypto';
import { FateConnectionError } from './fate-chat';
import { sameOriginRequest } from './fate-origin';

export class CloudError extends FateConnectionError {}
export const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export function cloudConfig() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.FATE_VAULT_SECRET;
  if (!url || !anon || !admin || !secret) throw new CloudError('云端连接尚未配置完成，请先使用本浏览器连接。');
  return { url, anon, admin, secret };
}
export function cloudAdmin() {
  const config = cloudConfig();
  return createClient(config.url, config.admin, { auth: { autoRefreshToken: false, persistSession: false } });
}
export async function cloudSession() {
  const config = cloudConfig(), jar = await cookies();
  return createServerClient(config.url, config.anon, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 },
    cookies: { getAll: () => jar.getAll(), setAll: (values) => { for (const { name, value, options } of values) jar.set(name, value, options); } },
  });
}
export async function cloudIdentity(required = true) {
  const session = await cloudSession();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) {
    if (required) throw new CloudError('请先登录游戏账号，再使用云端连接。', 401);
    return null;
  }
  const admin = cloudAdmin();
  const { data: account, error: failure } = await admin.from('fate_accounts').select('user_id,username').eq('user_id', user.id).maybeSingle();
  if (failure) throw new CloudError('暂时无法读取账号，请稍后重试。');
  if (!account) throw new CloudError('此账号尚未完成游戏注册。', 401);
  return { user, account, admin, session };
}
export function assertSameOrigin(request: Request) {
  if (!sameOriginRequest(request, true)) throw new CloudError('请求来源不匹配。', 403);
}
export async function smallCloudBody(request: Request) {
  assertSameOrigin(request);
  if (Number(request.headers.get('content-length') || 0) > 4096) throw new CloudError('提交内容过长。', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CloudError('提交内容为空。', 400);
  let size = 0, text = ''; const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new CloudError('提交内容过长。', 413); }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new CloudError('提交格式无效。', 400); }
}
export function cloudFailure(error: unknown) {
  return Response.json({ error: error instanceof CloudError ? error.message : '云端服务暂时不可用，请稍后重试。' }, { status: error instanceof CloudError ? error.status : 503, headers: privateHeaders });
}
export async function takeQuota(scope: string, identity: string, seconds: number, limit: number) {
  const { data, error } = await cloudAdmin().rpc('fate_take_quota', { p_scope: scope, p_identity: privateHash(identity, cloudConfig().secret), p_seconds: seconds, p_limit: limit });
  if (error) throw new CloudError('暂时无法验证请求，请稍后重试。');
  if (!data) throw new CloudError('操作较频繁，请稍后再试。', 429);
}
export function requestIdentity(request: Request) {
  return (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
}
export async function readCloudConnection(identity: NonNullable<Awaited<ReturnType<typeof cloudIdentity>>>) {
  const { data, error } = await identity.admin.from('fate_connections').select('encrypted_key,model,updated_at').eq('user_id', identity.user.id).maybeSingle();
  if (error) throw new CloudError('暂时无法读取已保存的连接，请稍后重试。');
  return data;
}
export async function resolveCloudKey(request: Request) {
  assertSameOrigin(request);
  const identity = (await cloudIdentity())!;
  await takeQuota('cloud-chat', identity.user.id, 60, 20);
  const connection = await readCloudConnection(identity);
  if (!connection) throw new CloudError('此账号尚未保存 DeepSeek 密钥。', 400);
  return unsealKey(connection.encrypted_key, identity.user.id, cloudConfig().secret);
}
