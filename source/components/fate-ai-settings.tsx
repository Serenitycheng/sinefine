'use client';
import { useState, type SubmitEvent } from 'react';
import { Check, Cloud, KeyRound, LoaderCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFate } from './fate-provider';
import styles from './fate-conversation.module.css';

export function FateAISettings({ onClose }: { onClose: () => void }) {
  const ctx = useFate();
  const [action, setAction] = useState<'login' | 'signup' | 'recover'>('login');
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [recovery, setRecovery] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmDelete, setConfirmDelete] = useState(false);
  const disabled = busy || ctx.checkingConnection;
  async function run(operation: () => Promise<void>) {
    if (disabled) return;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作暂未完成，请重试。');
    } finally {
      setBusy(false);
    }
  }
  function authenticate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await ctx.accountAction(action, {
        username,
        password,
        ...(action === 'recover' ? { recoveryCode: recovery } : {}),
      });
      setPassword('');
      setRecovery('');
    });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={styles.settings} style={{ maxWidth: 540 }}>
        <div className={styles.kicker}>
          <KeyRound size={17} /> 账号与连接
        </div>
        <DialogTitle className={styles.title}>对话设置</DialogTitle>
        <DialogDescription>
          {ctx.cloudConfigured === false
            ? '填写 DeepSeek 密钥，在本浏览器中与人物交谈。'
            : '保存到游戏账号后，换到 Chrome 或其他浏览器，登录同一账号即可恢复。'}
        </DialogDescription>
        <section
          className={styles.cloudAccount}
          aria-label="游戏账号与长期连接"
        >
          {ctx.cloudConfigured === false ? (
            <>
              <b>本浏览器连接</b>
              <p className={styles.note}>
                云端账号暂未开放。你可以在下方连接
                DeepSeek，并选择记住此浏览器；本地日常和存档可正常使用。
              </p>
            </>
          ) : ctx.cloudUsername ? (
            <>
              <div className={styles.cloudHeading}>
                <b>
                  <Cloud size={16} /> {ctx.cloudUsername}
                </b>
                <button
                  disabled={disabled}
                  onClick={() => void run(ctx.logout)}
                >
                  退出此浏览器
                </button>
              </div>
              <p className={ctx.cloudSaved ? styles.success : styles.note}>
                {ctx.cloudSaved
                  ? '密钥已保存在游戏账号中'
                  : '账号已登录，可在「存档与备份」使用云端进度；也可在下方配置 AI 连接。'}
              </p>
              {ctx.cloudSaved && !ctx.cloudMode && (
                <button
                  className={styles.secondary}
                  disabled={disabled}
                  onClick={() => void run(ctx.useCloudConnection)}
                >
                  恢复账号中已保存的连接
                </button>
              )}
            </>
          ) : (
            <>
              <b>游戏账号 · 跨浏览器保存</b>
              <div className={styles.accountTabs}>
                {(['login', 'signup', 'recover'] as const).map((id) => (
                  <button
                    key={id}
                    aria-pressed={action === id}
                    disabled={disabled}
                    onClick={() => {
                      setAction(id);
                      setError('');
                    }}
                  >
                    {id === 'login'
                      ? '登录'
                      : id === 'signup'
                        ? '创建账号'
                        : '找回账号'}
                  </button>
                ))}
              </div>
              <form onSubmit={authenticate} className={styles.settingsForm}>
                <label htmlFor="game-username">游戏用户名</label>
                <input
                  id="game-username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  pattern="[a-zA-Z0-9_]{3,32}"
                  minLength={3}
                  maxLength={32}
                  required
                  disabled={disabled}
                  placeholder="3–32位英文字母、数字或下划线"
                />
                {action === 'recover' && (
                  <>
                    <label htmlFor="game-recovery">
                      创建账号时保存的恢复码
                    </label>
                    <input
                      id="game-recovery"
                      type="password"
                      autoComplete="off"
                      value={recovery}
                      onChange={(e) => setRecovery(e.target.value)}
                      maxLength={53}
                      required
                      disabled={disabled}
                    />
                  </>
                )}
                <label htmlFor="game-password">
                  {action === 'recover' ? '新的登录密码' : '登录密码'}
                </label>
                <input
                  id="game-password"
                  type="password"
                  autoComplete={
                    action === 'login' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={10}
                  maxLength={128}
                  required
                  disabled={disabled}
                  placeholder="至少10个字符，不要填写 DeepSeek 密钥"
                />
                <button
                  className={styles.secondary}
                  disabled={disabled}
                  type="submit"
                >
                  {action === 'login'
                    ? '登录游戏账号'
                    : action === 'signup'
                      ? '创建账号并登录'
                      : '用恢复码设置新密码'}
                </button>
              </form>
              <p className={styles.note}>
                这是游戏自己的账号，不是 DeepSeek
                账号。无需邮箱；创建后请保留恢复码。游戏进度自动保存在本浏览器，可在「存档与备份」手动上传或恢复云端进度。
              </p>
            </>
          )}
          {ctx.recoveryCode && (
            <div className={styles.recoveryBox}>
              <b>请保存账号恢复码</b>
              <p>
                忘记密码时，用用户名和这份恢复码找回账号。恢复码只在此处展示，请勿发到聊天里。
              </p>
              <code>{ctx.recoveryCode}</code>
              <button
                className={styles.secondary}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(ctx.recoveryCode)
                    .catch(() => setError('未能复制，请手动选中恢复码复制。'));
                }}
              >
                复制恢复码
              </button>
              <button
                className={styles.secondary}
                onClick={ctx.dismissRecoveryCode}
              >
                我已保存，收起恢复码
              </button>
            </div>
          )}
        </section>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(ctx.verifyConnection);
          }}
          className={styles.settingsForm}
        >
          <label htmlFor="deepseek-key">
            {ctx.cloudMode ? '更换 DeepSeek 密钥（可选）' : 'DeepSeek API 密钥'}
          </label>
          <input
            id="deepseek-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={ctx.apiKey}
            onChange={(e) => {
              ctx.setApiKey(e.target.value);
              setError('');
            }}
            disabled={disabled}
            maxLength={256}
            placeholder={
              ctx.cloudMode
                ? '密钥已保存在账号中，无需重新填写'
                : '粘贴你的 DeepSeek API 密钥'
            }
          />
          <p className={styles.note}>
            保存到账号后，密钥会在云端加密保留，仅用于你自己的连接，不会返回到网页。密钥不会进入人物对话或导出的存档。
          </p>
          {ctx.cloudUsername && !ctx.cloudMode && (
            <button
              className={styles.primary}
              type="button"
              disabled={disabled || ctx.apiKey.trim().length < 8}
              onClick={() => void run(ctx.saveToCloud)}
            >
              <Cloud size={16} />{' '}
              {ctx.cloudSaved
                ? '验证并替换账号中的密钥'
                : '验证并保存到游戏账号'}
            </button>
          )}
          <button
            className={
              ctx.cloudUsername && !ctx.cloudMode
                ? styles.secondary
                : styles.primary
            }
            disabled={
              disabled || (!ctx.cloudMode && ctx.apiKey.trim().length < 8)
            }
            type="submit"
          >
            {disabled ? (
              <LoaderCircle size={16} className={styles.spinner} />
            ) : ctx.verified ? (
              <Check size={16} />
            ) : (
              <KeyRound size={16} />
            )}
            {disabled
              ? '正在处理…'
              : ctx.cloudMode
                ? '验证已保存的云端连接'
                : '验证连接并读取模型'}
          </button>
          {!ctx.cloudMode && (
            <>
              <label className={styles.remember}>
                <input
                  type="checkbox"
                  checked={ctx.rememberKey}
                  disabled={disabled}
                  onChange={(e) => ctx.setRememberKey(e.target.checked)}
                />
                仅记住此浏览器，下次自动连接
              </label>
              <p className={styles.note}>
                此选项只保存在当前浏览器，换浏览器不共享；需要跨浏览器恢复时，请登录并保存到游戏账号。
              </p>
            </>
          )}
          {ctx.verified && (
            <>
              <output className={styles.success}>
                连接已验证，可以开始交谈。
              </output>
              <label htmlFor="deepseek-model">对话模型</label>
              <select
                id="deepseek-model"
                value={ctx.model}
                disabled={disabled}
                onChange={(e) =>
                  void run(() => ctx.chooseModel(e.target.value))
                }
              >
                {ctx.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </>
          )}
        </form>
        {ctx.connectionNotice && (
          <output className={styles.note}>{ctx.connectionNotice}</output>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.note}>
          手动发送，或由你开启自主 AI
          后才会生成对话；本次页面合计最多20次。登录不会清空日常，也不会重置调用计数。
        </p>
        <div className={styles.usage}>
          本次已发送 {ctx.requests} 次 · 已返回用量{' '}
          {ctx.tokens.toLocaleString()} tokens
        </div>
        <button className={styles.secondary} onClick={onClose}>
          回到街道
        </button>
        {!ctx.cloudMode && (
          <button
            className={styles.secondary}
            onClick={ctx.clearConnection}
            disabled={disabled || !ctx.apiKey}
          >
            清除此浏览器的密钥并断开
          </button>
        )}
        {ctx.cloudUsername && ctx.cloudSaved && (
          <div className={styles.cloudDelete}>
            {confirmDelete ? (
              <>
                <p className={styles.note}>
                  将从此账号删除保存的密钥；其他浏览器也会失去这份连接。你仍可重新填写保存。
                </p>
                <button
                  className={styles.secondary}
                  disabled={disabled}
                  onClick={() =>
                    void run(async () => {
                      await ctx.deleteCloudConnection();
                      setConfirmDelete(false);
                    })
                  }
                >
                  确认删除账号中的密钥
                </button>
                <button
                  className={styles.secondary}
                  disabled={disabled}
                  onClick={() => setConfirmDelete(false)}
                >
                  保留
                </button>
              </>
            ) : (
              <button
                disabled={disabled}
                onClick={() => setConfirmDelete(true)}
              >
                删除账号中保存的密钥
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
