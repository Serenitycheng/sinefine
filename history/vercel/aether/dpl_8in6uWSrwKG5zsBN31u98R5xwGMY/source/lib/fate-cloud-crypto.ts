import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function secretKey(secret: string) {
  const key = Buffer.from(secret, 'base64');
  if (key.length !== 32) throw new Error('云端加密配置无效');
  return key;
}
export function sealKey(key: string, userId: string, secret: string) {
  if (!/^[\x21-\x7e]{8,256}$/.test(key)) throw new Error('密钥格式无效');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secretKey(secret), iv);
  cipher.setAAD(Buffer.from(`sine-fine:deepseek:v1:${userId}`));
  const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function unsealKey(value: string, userId: string, secret: string) {
  const [version, iv, tag, data, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data || extra || value.length > 1024) throw new Error('保存的连接无效');
  const decipher = createDecipheriv('aes-256-gcm', secretKey(secret), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(`sine-fine:deepseek:v1:${userId}`));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  const key = Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  if (!/^[\x21-\x7e]{8,256}$/.test(key)) throw new Error('保存的连接无效');
  return key;
}
export function normalizeUsername(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(value.trim())) throw new Error('用户名请使用3–32位英文字母、数字或下划线。');
  return value.trim().toLowerCase();
}
// These are login identifiers, not verified personal email addresses; no mail is sent.
export const accountEmail = (username: string) => `${createHash('sha256').update(username).digest('hex')}@accounts.sine-fine.invalid`;
export const privateHash = (value: string, secret: string) => createHmac('sha256', secretKey(secret)).update(value).digest('hex');
export const newRecoveryCode = () => randomBytes(24).toString('hex').match(/.{1,8}/g)!.join('-');
export function recoveryMatches(code: unknown, expected: string, userId: string, secret: string) {
  if (typeof code !== 'string' || !/^[a-fA-F0-9-]{48,53}$/.test(code)) return false;
  const hash = privateHash(`recovery:${userId}:${code.replaceAll('-', '').toLowerCase()}`, secret);
  return expected.length === 64 && timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}
