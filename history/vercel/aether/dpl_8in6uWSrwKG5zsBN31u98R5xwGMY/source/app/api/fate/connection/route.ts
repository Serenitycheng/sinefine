import { createFateChatHandler } from '@/lib/fate-chat';
import { sealKey } from '@/lib/fate-cloud-crypto';
import { assertSameOrigin, CloudError, cloudConfig, cloudFailure, cloudIdentity, privateHeaders, resolveCloudKey, smallCloudBody, takeQuota } from '@/lib/fate-cloud';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await smallCloudBody(request);
    const identity = (await cloudIdentity())!;
    await takeQuota('save-key', identity.user.id, 60, 6);
    if (typeof body.key !== 'string' || !/^[\x21-\x7e]{8,256}$/.test(body.key)) throw new CloudError('请填写完整的 DeepSeek 密钥。', 400);
    // Verify with the official models endpoint before replacing the previous key.
    const result = await createFateChatHandler()(new Request(new URL('/api/fate/chat', request.url), { method: 'POST', headers: { origin: new URL(request.url).origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'test', key: body.key }), signal: request.signal }));
    const data = await result.json() as { models?: string[]; error?: string };
    if (!result.ok || !data.models?.length) throw new CloudError(data.error || '密钥验证失败，原有连接保持不变。', 400);
    const models = data.models.filter(model => /^[a-zA-Z0-9._:/-]{1,100}$/.test(model));
    if (!models.length) throw new CloudError('没有可用模型，原有连接保持不变。', 400);
    const model = typeof body.model === 'string' && models.includes(body.model) ? body.model : models[0];
    const updatedAt = new Date().toISOString();
    const { error } = await identity.admin.from('fate_connections').upsert({ user_id: identity.user.id, encrypted_key: sealKey(body.key, identity.user.id, cloudConfig().secret), model, updated_at: updatedAt });
    if (error) throw new CloudError('云端保存失败，原有连接未被替换，请重试。');
    return Response.json({ saved: true, model, models, updatedAt }, { headers: privateHeaders });
  } catch (error) { return cloudFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = (await cloudIdentity())!;
    const { error } = await identity.admin.from('fate_connections').delete().eq('user_id', identity.user.id);
    if (error) throw new CloudError('云端连接暂未删除，请重试。');
    return Response.json({ deleted: true }, { headers: privateHeaders });
  } catch (error) { return cloudFailure(error); }
}
export async function PATCH(request: Request) {
  try {
    const body = await smallCloudBody(request);
    const identity = (await cloudIdentity())!;
    if (typeof body.model !== 'string' || !/^[a-zA-Z0-9._:/-]{1,100}$/.test(body.model)) throw new CloudError('请选择有效模型。', 400);
    const key = await resolveCloudKey(request);
    const check = await createFateChatHandler()(new Request(request.url, { method: 'POST', headers: { origin: new URL(request.url).origin }, body: JSON.stringify({ mode: 'test', key }), signal: request.signal }));
    const result = await check.json();
    if (!check.ok || !result.models?.includes(body.model)) throw new CloudError('所选模型暂不可用，请重新验证。', 400);
    const { error } = await identity.admin.from('fate_connections').update({ model: body.model, updated_at: new Date().toISOString() }).eq('user_id', identity.user.id);
    if (error) throw new CloudError('模型选择暂未保存。');
    return Response.json({ model: body.model }, { headers: privateHeaders });
  } catch (error) { return cloudFailure(error); }
}
