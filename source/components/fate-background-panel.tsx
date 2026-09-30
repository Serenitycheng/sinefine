'use client';
import { useFate } from './fate-provider';
import { backgroundDay } from '@/lib/fate-background';
import type { useBackgroundLife } from './use-background-life';
import styles from './fate-background-panel.module.css';

export function FateBackgroundPanel({
  background,
}: {
  background: ReturnType<typeof useBackgroundLife>;
}) {
  const fate = useFate();
  const { view, loading, busy, conflict, notice, start, stop, refresh } =
    background;
  const session = view?.session;
  const spent =
    session?.budgetDay === backgroundDay()
      ? session.spentMicros / 1_000_000
      : 0;
  return (
    <section className={styles.panel} aria-label="关闭网页后的后台日常">
      <div className={styles.top}>
        <div>
          <strong>后台日常 · 每 30 分钟</strong>
          <p>
            关闭网页后，居民继续行动和 AI 交谈。每天最多
            ¥5，达到预算后次日继续。
          </p>
        </div>
        {session?.enabled ? (
          <button disabled={busy || loading} onClick={() => void stop()}>
            暂停后台并接回进度
          </button>
        ) : (
          <button
            disabled={
              busy ||
              loading ||
              !view ||
              !fate.cloudSaved ||
              fate.storageBlocked
            }
            onClick={() => void start()}
          >
            开启后台代管
          </button>
        )}
      </div>
      <div className={styles.status} aria-live="polite">
        {loading
          ? '正在读取后台状态…'
          : busy
            ? '正在保存并切换进度…'
            : session?.enabled
              ? `云端代管中 · 今日保守计费 ¥${spent.toFixed(3)} / ¥5 · 已推进 ${session.rounds} 轮`
              : '后台未运行'}
        {session?.enabled && (
          <span>
            下轮预计{' '}
            {new Date(session.nextRunAt).toLocaleString('zh-CN', {
              timeZone: 'Asia/Shanghai',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
      {session?.enabled && (
        <p>
          当前画面保留最近同步的进度。接回后可继续操控人物；后台期间人物按自己的作息活动，室内停留的受控人物保持原位。
        </p>
      )}
      {!fate.cloudSaved && (
        <p>请先在「AI 设置」登录游戏账号，并保存 DeepSeek 连接。</p>
      )}
      {(notice || session?.notice) && (
        <output className={styles.notice}>{notice || session?.notice}</output>
      )}
      {conflict && (
        <div className={styles.conflict}>
          <p>本地与后台进度已分开。接回云端会先保留一份本地备份。</p>
          <button disabled={busy} onClick={() => void stop()}>
            接回云端并暂停后台
          </button>
          <button disabled={busy} onClick={() => void stop(true)}>
            保留本地并停止后台
          </button>
        </div>
      )}
      {fate.cloudUsername && (
        <button
          className={styles.refresh}
          disabled={loading || busy}
          onClick={() => void refresh()}
        >
          刷新后台状态
        </button>
      )}
    </section>
  );
}
