'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useFate } from './fate-provider';
import {
  FATE_LIBRARY_KEY,
  backupFilename,
  serializeFateBackup,
} from '@/lib/fate-backup';
import { FATE_STORAGE_KEY } from '@/lib/fate-state';
import styles from './fate-storage-notice.module.css';

function download(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function FateStorageNotice() {
  const fate = useFate();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  if (!fate.loaded || fate.storageStatus === 'ready') return null;
  function run(action: () => void) {
    try {
      action();
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '操作未完成，记录保持不变。',
      );
    }
  }
  return (
    <aside className={styles.notice} aria-label="Fate 存档保护">
      <p role="alert">{fate.storageNotice}</p>
      <div className={styles.actions}>
        {fate.storageStatus !== 'unreadable' && (
          <button
            onClick={() =>
              run(() => {
                const backup = fate.exportBackup('本页未同步的进度');
                download(serializeFateBackup(backup), backupFilename(backup));
              })
            }
          >
            下载本页进度
          </button>
        )}
        <button
          onClick={() =>
            run(() => {
              const raw =
                localStorage.getItem(FATE_LIBRARY_KEY) ??
                localStorage.getItem(FATE_STORAGE_KEY);
              if (raw === null) throw new Error('浏览器中没有原始记录。');
              download(raw, 'sinefine-fate-original.json');
            })
          }
        >
          下载浏览器原始记录
        </button>
        {fate.storageStatus === 'temporary' && (
          <button onClick={() => run(fate.retryPersistence)}>
            重试保存本页
          </button>
        )}
        <button onClick={() => setConfirm(!confirm)}>读取最新进度</button>
        <Link href="/fate/saves">查看存档</Link>
      </div>
      {confirm && (
        <div className={styles.confirm}>
          <p>
            读取后日常保持暂停。若本页与最新进度不同，会先把本页进度保留为一份备份；最多保留
            3 份。损坏记录或保存失败时不替换。
          </p>
          <div className={styles.actions}>
            <button
              onClick={() =>
                run(() => {
                  fate.reloadLocal();
                  setConfirm(false);
                })
              }
            >
              保留本页并读取最新
            </button>
            <button onClick={() => setConfirm(false)}>取消</button>
          </div>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
