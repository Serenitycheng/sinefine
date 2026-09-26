'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Download,
  Upload,
  BookmarkPlus,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import { useFate } from './fate-provider';
import FateCloudSavePanel from './fate-cloud-save-panel';
import {
  backupFilename,
  readFateBackupFile,
  serializeFateBackup,
  summarizeFateSave,
  type FateBackup,
} from '@/lib/fate-backup';
import { lifeTime } from '@/lib/fate-life';
import { FATE_ORIGINAL_RECOVERY_KEY } from '@/lib/fate-local-session';
import type { FateSave } from '@/lib/fate-state';
import styles from './fate-saves.module.css';

function dateLabel(value: string | null) {
  if (value === null) return '原备份时间未记录';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function SaveSummary({ save }: { save: FateSave }) {
  const summary = summarizeFateSave(save);
  return (
    <div className={styles.stats}>
      <div>
        <small>故事时间</small>
        <strong>
          {summary.minutes === null
            ? '尚未开始日常'
            : lifeTime(summary.minutes)}
        </strong>
      </div>
      <div>
        <small>保留的对话</small>
        <strong>
          {summary.conversations}
          <span> 轮</span>
        </strong>
      </div>
      <div>
        <small>日常记录</small>
        <strong>
          {summary.events}
          <span> 条</span>
        </strong>
      </div>
      <div>
        <small>有补充的人物</small>
        <strong>
          {summary.people}
          <span> 人</span>
        </strong>
      </div>
    </div>
  );
}
function downloadBackup(backup: FateBackup) {
  const url = URL.createObjectURL(
    new Blob([serializeFateBackup(backup)], {
      type: 'application/json;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFilename(backup);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function FateSaveManager() {
  const fate = useFate();
  const [title, setTitle] = useState('我的冬木');
  const [pending, setPending] = useState<{
    backup: FateBackup;
    source: string;
  } | null>(null);
  const [reading, setReading] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const readVersion = useRef(0),
    preview = useRef<HTMLElement>(null);
  useEffect(() => {
    const version = readVersion;
    version.current++;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setPending(null);
      setReading(false);
    });
    return () => {
      alive = false;
      version.current++;
    };
  }, [fate.saveRevision]);
  useEffect(() => {
    if (pending) preview.current?.scrollIntoView({ block: 'nearest' });
  }, [pending]);
  function showError(value: unknown) {
    setError(
      value instanceof Error ? value.message : '操作未能完成，原进度没有改变。',
    );
    setMessage('');
  }
  function download(backup: FateBackup) {
    try {
      downloadBackup(backup);
      setError('');
      setMessage('已发起下载，请在浏览器的下载记录中查看文件。');
    } catch (value) {
      showError(value);
    }
  }
  function keepCheckpoint() {
    try {
      fate.checkpoint(title);
      setError('');
      setMessage(
        fate.persistent
          ? '当前进度已保留在备份列表中。'
          : '当前进度已暂存在本次页面，建议同时下载一份文件。',
      );
    } catch (value) {
      showError(value);
    }
  }
  async function selectFile(file: File) {
    const version = ++readVersion.current;
    setPending(null);
    setReading(true);
    setError('');
    setMessage('');
    try {
      const backup = await readFateBackupFile(file);
      if (version === readVersion.current)
        setPending({ backup, source: file.name });
    } catch (value) {
      if (version === readVersion.current) showError(value);
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }
  function selectCheckpoint(backup: FateBackup, source = '浏览器中保留的备份') {
    readVersion.current++;
    setReading(false);
    setError('');
    setMessage('');
    setPending({ backup, source });
  }
  function restore() {
    if (!pending) return;
    try {
      fate.restoreBackup(pending.backup);
      readVersion.current++;
      setPending(null);
      setError('');
      setMessage(
        fate.storageStatus === 'unreadable'
          ? '已恢复有效备份，无法读取的旧记录已保留为原文，可在下方下载。'
          : fate.persistent
            ? '已恢复所选存档，原进度已保留为「恢复前的进度」。回到街道后，点击开始继续。'
            : '已在当前页面恢复，原进度也暂存在备份列表中；浏览器原始记录未被覆盖。请下载文件保留这份进度。',
      );
    } catch (value) {
      showError(value);
    }
  }
  return (
    <>
      <section className={styles.current} aria-labelledby="current-save-title">
        <div className={styles.sectionHead}>
          <div>
            <span>CURRENT STORY</span>
            <h2 id="current-save-title">正在继续的冬木</h2>
          </div>
          <Link href="/fate/street">
            回到街道 <ArrowUpRight size={16} />
          </Link>
        </div>
        {fate.storageStatus === 'unreadable' ? (
          <p className={styles.note}>
            尚未读到有效进度。原始记录仍在，可在下方导入有效备份。
          </p>
        ) : fate.loaded ? (
          <SaveSummary save={fate.save} />
        ) : (
          <p className={styles.note}>正在读取现有进度…</p>
        )}
        <p className={styles.note}>
          {fate.storageNotice ||
            '游戏自动保存当前进度。手动备份可以留住某个时刻，下载文件可以带到另一台设备。'}
        </p>
      </section>
      <div className={styles.actionGrid}>
        <section className={styles.card} aria-labelledby="keep-save-title">
          <BookmarkPlus size={22} strokeWidth={1.3} />
          <h2 id="keep-save-title">留住这一刻</h2>
          <p>
            保留在浏览器中，或者下载成文件。世界设定、人物补充、对话与日常进度一起保存。
          </p>
          <label htmlFor="fate-backup-title">给这份备份起个名字</label>
          <input
            id="fate-backup-title"
            value={title}
            maxLength={60}
            disabled={!fate.loaded}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：第一次街角相遇"
          />
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.primary}
              onClick={keepCheckpoint}
              disabled={!fate.loaded || fate.storageBlocked}
            >
              <BookmarkPlus size={15} />
              {fate.persistent ? '保留当前进度' : '暂存当前进度'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => download(fate.exportBackup(title))}
              disabled={!fate.loaded || fate.storageStatus === 'unreadable'}
            >
              <Download size={15} />
              下载存档文件
            </button>
          </div>
          <small>
            最近保留 3 份；新增时替换最早的一份。下载的文件不受此数量限制。
          </small>
        </section>
        <section className={styles.card} aria-labelledby="import-save-title">
          <Upload size={22} strokeWidth={1.3} />
          <h2 id="import-save-title">接着一份故事</h2>
          <p>
            选择以前下载的存档，先查看摘要，再决定是否恢复。选中文件不会立即改动当前进度。
          </p>
          <label htmlFor="fate-import-file">选择 Fate 存档文件</label>
          <input
            id="fate-import-file"
            type="file"
            accept=".json,application/json"
            disabled={!fate.loaded || fate.storageStatus === 'conflict'}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void selectFile(file);
            }}
          />
          {reading && <output className={styles.note}>正在检查文件…</output>}
          <small>
            支持本站导出的存档与旧版 Fate 原始存档，最大 5
            MB。文件仅在本机读取，不会上传。
          </small>
        </section>
      </div>
      <FateCloudSavePanel
        title={title}
        onPreview={selectCheckpoint}
        onDownload={download}
      />
      <div className={styles.feedback} aria-live="polite">
        {message && (
          <output className={styles.success}>
            <Check size={15} />
            {message}
          </output>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
      {pending && (
        <section
          ref={preview}
          className={styles.preview}
          aria-labelledby="restore-preview-title"
        >
          <div className={styles.sectionHead}>
            <div>
              <span>BEFORE YOU RETURN</span>
              <h2 id="restore-preview-title">
                准备恢复：{pending.backup.title}
              </h2>
            </div>
            <button
              onClick={() => setPending(null)}
              className={styles.dismiss}
              aria-label="取消恢复"
            >
              <X size={19} />
            </button>
          </div>
          <p className={styles.note}>
            {pending.source} · 备份时间：{dateLabel(pending.backup.createdAt)}
          </p>
          <SaveSummary save={pending.backup.save} />
          {pending.backup.save.worldNote && (
            <p className={styles.excerpt}>
              世界补充：{pending.backup.save.worldNote.slice(0, 160)}
              {pending.backup.save.worldNote.length > 160 ? '…' : ''}
            </p>
          )}
          <p className={styles.restoreNote}>
            {fate.storageStatus === 'unreadable'
              ? '确认后恢复这份有效备份。无法读取的旧记录会先保留为一份可下载的原文，替换之前的原文保护副本；原文不保证能恢复。'
              : '恢复后，当前世界设定、人物补充、对话和日常进度会一起切换到这份存档。原进度会自动保留在下方列表，需要时可以恢复回来。'}
          </p>
          {fate.storageStatus === 'temporary' && (
            <p className={styles.error}>
              浏览器目前无法保存：这次恢复与备份仅在当前页面有效。请下载文件保留，刷新后可能回到原进度。
            </p>
          )}
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.primary}
              onClick={restore}
              disabled={fate.storageStatus === 'conflict'}
            >
              <RotateCcw size={15} />
              保留当前进度并恢复
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setPending(null)}
            >
              暂时不恢复
            </button>
          </div>
        </section>
      )}
      <section
        className={styles.checkpoints}
        aria-labelledby="checkpoints-title"
      >
        <div className={styles.sectionHead}>
          <div>
            <span>BOOKMARKS</span>
            <h2 id="checkpoints-title">保留的时刻</h2>
          </div>
          <span className={styles.counter}>{fate.checkpoints.length} / 3</span>
        </div>
        {!fate.checkpoints.length ? (
          <div className={styles.empty}>
            <BookmarkPlus size={26} strokeWidth={1} />
            <p>还没有手动备份。</p>
            <small>可以先为现在的冬木留一个书签。</small>
          </div>
        ) : (
          <ol className={styles.list}>
            {fate.checkpoints.map((backup) => (
              <li key={backup.id}>
                <div className={styles.savedTitle}>
                  <h3>{backup.title}</h3>
                  <time dateTime={backup.createdAt ?? undefined}>
                    {dateLabel(backup.createdAt)}
                  </time>
                </div>
                <SaveSummary save={backup.save} />
                <div className={styles.buttons}>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => selectCheckpoint(backup)}
                    disabled={fate.storageBlocked}
                  >
                    <RotateCcw size={14} />
                    查看并恢复
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => download(backup)}
                  >
                    <Download size={14} />
                    下载这份备份
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className={styles.footerNote}>
        备份文件不含 DeepSeek 连接密钥，导入也不会开启自主 AI
        或重置本次调用额度。恢复后的日常从暂停开始。浏览器备份与当前存档仍在本机，重要的进度建议同时下载文件保存。
      </p>
      {fate.hasOriginalRecovery && (
        <section className={styles.card} aria-label="原始记录保护">
          <h2>保留的原始记录</h2>
          <p>
            这份原文来自最近一次无法读取的记录恢复，供排查或另行保留，不是可直接导入的游戏备份。
          </p>
          <button
            className={styles.secondary}
            onClick={() => {
              try {
                const raw = localStorage.getItem(FATE_ORIGINAL_RECOVERY_KEY);
                if (raw === null) throw new Error('原文保护副本已不存在。');
                const url = URL.createObjectURL(
                  new Blob([raw], { type: 'application/json' }),
                );
                const link = document.createElement('a');
                link.href = url;
                link.download = 'sinefine-fate-original-recovery.json';
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (value) {
                showError(value);
              }
            }}
          >
            下载保护的原始记录
          </button>
        </section>
      )}
    </>
  );
}
