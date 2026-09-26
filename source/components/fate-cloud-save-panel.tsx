'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useFate } from './fate-provider';
import { summarizeFateSave, type FateBackup } from '@/lib/fate-backup';
import { lifeTime } from '@/lib/fate-life';
import {
  CLOUD_SAVE_PATH,
  CloudSaveError,
  MAX_CLOUD_SAVE_BYTES,
  parseCloudSaveView,
  type CloudSaveSlot,
  type CloudSaveView,
  type CloudSaveWrite,
} from '@/lib/fate-cloud-save';
import styles from './fate-cloud-save.module.css';

function dateLabel(value: string | null) {
  return value === null
    ? '未记录时间'
    : new Date(value).toLocaleString('zh-CN');
}
function Snapshot({ backup }: { backup: FateBackup }) {
  const summary = summarizeFateSave(backup.save);
  return (
    <div className={styles.snapshot}>
      <h4>{backup.title}</h4>
      <p>快照时间：{dateLabel(backup.createdAt)}</p>
      <dl>
        <div>
          <dt>故事时间</dt>
          <dd>
            {summary.minutes === null
              ? '尚未开始日常'
              : lifeTime(summary.minutes)}
          </dd>
        </div>
        <div>
          <dt>对话 / 日常记录</dt>
          <dd>
            {summary.conversations} 轮 / {summary.events} 条
          </dd>
        </div>
        <div>
          <dt>有补充的人物</dt>
          <dd>{summary.people} 人</dd>
        </div>
      </dl>
      {backup.save.worldNote && (
        <p>
          世界补充：{backup.save.worldNote.slice(0, 100)}
          {backup.save.worldNote.length > 100 ? '…' : ''}
        </p>
      )}
    </div>
  );
}
type UploadPreview = CloudSaveWrite & { previous: CloudSaveSlot | null };

export default function FateCloudSavePanel({
  title,
  onPreview,
  onDownload,
}: {
  title: string;
  onPreview: (backup: FateBackup, source: string) => void;
  onDownload: (backup: FateBackup) => void;
}) {
  const { loaded, exportBackup, cloudConfigured, cloudUsername } = useFate();
  const [cloud, setCloud] = useState<CloudSaveView | null>(null);
  const [draft, setDraft] = useState<UploadPreview | null>(null);
  const [busy, setBusy] = useState<'read' | 'upload' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsConnection, setNeedsConnection] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );

  async function requestCloud(upload?: UploadPreview) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(upload ? 'upload' : 'read');
    setDraft(null);
    setError('');
    setMessage('');
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const body = upload
        ? JSON.stringify({
            backup: upload.backup,
            expectedRevision: upload.expectedRevision,
            expectedAccount: upload.expectedAccount,
          } satisfies CloudSaveWrite)
        : undefined;
      if (
        body &&
        new TextEncoder().encode(body).byteLength > MAX_CLOUD_SAVE_BYTES
      )
        throw new Error('这份进度超过云端 5 MB 上限，请下载存档文件保留。');
      const response = await fetch(CLOUD_SAVE_PATH, {
        method: upload ? 'PUT' : 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        ...(body
          ? { headers: { 'Content-Type': 'application/json' }, body }
          : {}),
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const problem = value as { error?: unknown; code?: unknown } | null;
        throw new CloudSaveError(
          typeof problem?.error === 'string'
            ? problem.error
            : '云端操作未完成，请重新读取。',
          response.status,
          typeof problem?.code === 'string' ? problem.code : 'unavailable',
        );
      }
      const next = parseCloudSaveView(value);
      if (active.current !== controller) return;
      setCloud(next);
      setNeedsConnection(false);
      setMessage(
        upload
          ? '这份快照已保存到云端。当前设备的进度没有改变。'
          : next.slot
            ? '已读取云端快照，当前设备的进度没有改变。'
            : '这个账号还没有云端进度，可以准备首次上传。',
      );
    } catch (value) {
      if (active.current !== controller) return;
      // A failed response can follow a committed upload. Always reread before another write.
      setCloud(null);
      setNeedsConnection(
        value instanceof CloudSaveError &&
          ['unauthenticated', 'not_configured'].includes(value.code),
      );
      setError(
        controller.signal.aborted
          ? '云端响应超时。保存结果尚未确认，请重新读取云端进度后再操作。'
          : value instanceof Error
            ? value.message
            : '云端操作未完成，请重新读取。',
      );
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) {
        active.current = null;
        setBusy(null);
      }
    }
  }
  function prepareUpload() {
    if (!cloud || !loaded || active.current) return;
    try {
      const backup = exportBackup(title);
      setDraft({
        backup,
        expectedRevision: cloud.slot?.revision ?? null,
        expectedAccount: cloud.username,
        previous: cloud.slot,
      });
      setError('');
      setMessage('');
    } catch (value) {
      setError(
        value instanceof Error ? value.message : '未能准备这份进度，请重试。',
      );
    }
  }
  const showConnect =
    needsConnection ||
    (!cloud && (!cloudUsername || cloudConfigured === false));
  return (
    <section
      className={styles.panel}
      aria-labelledby="cloud-save-title"
      aria-busy={busy !== null}
    >
      <div className={styles.heading}>
        <Cloud size={23} strokeWidth={1.3} />
        <div>
          <span>ANOTHER WINDOW</span>
          <h2 id="cloud-save-title">把故事带到另一台设备</h2>
        </div>
      </div>
      <p className={styles.note}>
        同一游戏账号保留一份云端进度。先读取，再选择上传或恢复；游戏不会自动同步。云端快照只包含游戏资料，不包含
        AI 连接密钥。
      </p>
      {showConnect && (
        <p className={styles.note}>
          {cloudConfigured === false
            ? '云端服务尚未配置，本地备份与文件下载仍可使用。'
            : '登录已有游戏账号，即可读取或保存云端进度。'}{' '}
          <Link href="/fate/connect">打开游戏账号设置</Link>
        </p>
      )}
      <div className={styles.buttons}>
        <button
          type="button"
          onClick={() => void requestCloud()}
          disabled={busy !== null}
        >
          <RefreshCw size={15} />
          {busy === 'read'
            ? '正在读取…'
            : cloud
              ? '重新读取云端进度'
              : '读取云端进度'}
        </button>
        {cloud && (
          <span className={styles.account}>云端账号：{cloud.username}</span>
        )}
      </div>
      {cloud && (
        <div className={styles.remote}>
          {cloud.slot ? (
            <>
              <h3>云端现有快照</h3>
              <p className={styles.note}>
                云端保存时间：{dateLabel(cloud.slot.updatedAt)} · 第{' '}
                {cloud.slot.revision} 版
              </p>
              <Snapshot backup={cloud.slot.backup} />
            </>
          ) : (
            <p className={styles.note}>
              云端位置为空，首次上传会创建一份进度。
            </p>
          )}
          <div className={styles.buttons}>
            <button
              type="button"
              onClick={prepareUpload}
              disabled={!loaded || busy !== null}
            >
              <CloudUpload size={15} />
              准备上传当前进度
            </button>
            {cloud.slot && (
              <button
                type="button"
                disabled={!loaded || busy !== null}
                onClick={() => {
                  if (cloud.slot)
                    onPreview(
                      cloud.slot.backup,
                      `云端账号 ${cloud.username} · 云端保存于 ${dateLabel(cloud.slot.updatedAt)}`,
                    );
                }}
              >
                <CloudDownload size={15} />
                预览恢复这份云进度
              </button>
            )}
            {cloud.slot && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  if (cloud.slot) onDownload(cloud.slot.backup);
                }}
              >
                <Download size={15} />
                下载云端快照
              </button>
            )}
          </div>
        </div>
      )}
      {draft && (
        <section
          className={styles.confirm}
          aria-labelledby="cloud-upload-title"
        >
          <h3 id="cloud-upload-title">
            确认发送到账号 {draft.expectedAccount}
          </h3>
          <div className={styles.comparison}>
            <div>
              <h3>即将上传的本地快照</h3>
              <Snapshot backup={draft.backup} />
            </div>
            <div>
              <h3>
                {draft.previous ? '将被替换的云端快照' : '首次保存到云端'}
              </h3>
              {draft.previous ? (
                <>
                  <p className={styles.note}>
                    云端保存时间：{dateLabel(draft.previous.updatedAt)} · 第{' '}
                    {draft.previous.revision} 版
                  </p>
                  <Snapshot backup={draft.previous.backup} />
                </>
              ) : (
                <p className={styles.note}>当前云端位置为空。</p>
              )}
            </div>
          </div>
          <p className={styles.note}>
            本次发送上方准备时的快照。
            {draft.previous
              ? '确认后，旧的云端快照会被替换；如需保留，请先使用上方「下载云端快照」。'
              : '当前设备的进度保持不变。'}
            如果云端已被另一台设备更新，本次上传会停止，并请你重新选择。
          </p>
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void requestCloud(draft)}
              disabled={busy !== null}
            >
              <CloudUpload size={15} />
              {draft.previous ? '确认替换云端快照' : '确认上传这份快照'}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={busy !== null}
            >
              暂时不上传
            </button>
          </div>
        </section>
      )}
      <div aria-live="polite">
        {busy === 'upload' && (
          <p className={styles.note}>正在保存已确认的快照…</p>
        )}
        {message && <p className={styles.success}>{message}</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
