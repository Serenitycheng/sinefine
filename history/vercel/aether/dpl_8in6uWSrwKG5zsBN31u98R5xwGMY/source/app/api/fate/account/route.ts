import { accountEmail, newRecoveryCode, normalizeUsername, privateHash, recoveryMatches } from '@/lib/fate-cloud-crypto';
import { CloudError, cloudAdmin, cloudConfig, cloudFailure, cloudIdentity, cloudSession, privateHeaders, readCloudConnection, requestIdentity, smallCloudBody, takeQuota } from '@/lib/fate-cloud';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  try {
    cloudConfig();
    const identity = await cloudIdentity(false);
    if (!identity) return Response.json({ configured: true, username: null, connection: null }, { headers: privateHeaders });
    const connection = await readCloudConnection(identity);
    return Response.json({ configured: true, username: identity.account.username, connection: connection ? { model: connection.model, updatedAt: connection.updated_at } : null }, { headers: privateHeaders });
  } catch (error) { return cloudFailure(error); }
}

export async function POST(request: Request) {
  try {
    const body = await smallCloudBody(request);
    const session = await cloudSession();
    if (body.action === 'logout') {
      const { error } = await session.auth.signOut({ scope: 'local' });
      if (error) throw new CloudError('退出暂未完成，请重试。');
      return Response.json({ ok: true }, { headers: privateHeaders });
    }
    if (!['signup', 'login', 'recover'].includes(String(body.action))) throw new CloudError('账号操作无效。', 400);
    let username: string;
    try { username = normalizeUsername(body.username); } catch (error) { throw new CloudError((error as Error).message, 400); }
    if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) throw new CloudError('密码请使用10–128个字符。', 400);
    const ip = requestIdentity(request);
    await takeQuota(`auth-ip-${String(body.action)}`, ip, 900, body.action === 'signup' ? 5 : 25);
    await takeQuota(`auth-user-${String(body.action)}`, username, 900, 10);
    const admin = cloudAdmin(), email = accountEmail(username);
    let recoveryCode: string | undefined;
    if (body.action === 'signup') {
      const { data, error } = await admin.auth.admin.createUser({ email, password: body.password, email_confirm: true, user_metadata: { game_name: username } });
      if (error || !data.user) throw new CloudError('未能创建账号。用户名可能已被使用；已有账号请直接登录。', 400);
      recoveryCode = newRecoveryCode();
      const { error: accountError } = await admin.from('fate_accounts').insert({ user_id: data.user.id, username, recovery_hash: privateHash(`recovery:${data.user.id}:${recoveryCode.replaceAll('-', '')}`, cloudConfig().secret) });
      if (accountError) {
        // Roll back only the account created by this failed request.
        await admin.auth.admin.deleteUser(data.user.id);
        throw new CloudError('账号创建未完成，请稍后重试。');
      }
    }
    if (body.action === 'recover') {
      const { data: account, error } = await admin.from('fate_accounts').select('user_id,recovery_hash').eq('username', username).maybeSingle();
      if (error) throw new CloudError('暂时无法恢复账号，请稍后重试。');
      if (!account || !recoveryMatches(body.recoveryCode, account.recovery_hash, account.user_id, cloudConfig().secret)) throw new CloudError('用户名或恢复码不正确。', 401);
      recoveryCode = newRecoveryCode();
      const replacementHash = privateHash(`recovery:${account.user_id}:${recoveryCode.replaceAll('-', '')}`, cloudConfig().secret);
      // Claim the old code atomically before changing the password. Two requests
      // using the same recovery code must not both reset this account.
      const saved = await admin.from('fate_accounts').update({ recovery_hash: replacementHash }).eq('user_id', account.user_id).eq('recovery_hash', account.recovery_hash).select('user_id').maybeSingle();
      if (saved.error) throw new CloudError('恢复操作暂未完成，请重试。');
      if (!saved.data) throw new CloudError('恢复码已被使用，请使用最新的恢复码。', 401);
      const updated = await admin.auth.admin.updateUserById(account.user_id, { password: body.password });
      if (updated.error) {
        await admin.from('fate_accounts').update({ recovery_hash: account.recovery_hash }).eq('user_id', account.user_id).eq('recovery_hash', replacementHash);
        throw new CloudError('密码暂未更改，请稍后重试。');
      }
    }
    const { data, error } = await session.auth.signInWithPassword({ email, password: body.password });
    if (error || !data.user) throw new CloudError(body.action === 'signup' ? '账号已创建，请使用刚才的账号密码登录。' : '用户名或密码不正确。', 401);
    if (body.action === 'recover' && data.session) await admin.auth.admin.signOut(data.session.access_token, 'others');
    return Response.json({ username, ...(recoveryCode ? { recoveryCode } : {}) }, { headers: privateHeaders });
  } catch (error) { return cloudFailure(error); }
}
