'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './ui/dialog';
import StreetWalk from './street-walk';
import { useFate } from './fate-provider';
import { useBackgroundLife } from './use-background-life';
import { FateBackgroundPanel } from './fate-background-panel';
import { FateAISettings } from './fate-ai-settings';
import styles from './fate-street-session.module.css';

export default function FateStreetSession() {
  const { saveRevision, storageBlocked, save } = useFate();
  const background = useBackgroundLife();
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  if (storageBlocked)
    return (
      <main style={{ padding: '32px 24px', lineHeight: 1.9 }}>
        <h1>冬木的日常已暂停</h1>
        <p>请先处理上方的存档提示。读取最新进度后，可以回到街道继续。</p>
      </main>
    );
  return (
    <div className={styles.session}>
      <div className={styles.statusBar}>
        <output>
          {background.conflict
            ? '本地与后台进度待处理'
            : background.recoveryPending
              ? '后台状态待确认 · 请打开设置重试'
              : background.view?.session?.enabled
                ? '云端代管中 · 每 30 分钟推进'
                : background.suspended
                  ? '正在确认后台进度 · 本地暂歇'
                  : '本地日常'}
        </output>
        <button
          disabled={save.emiya?.active || save.house?.active}
          title={
            save.emiya?.active || save.house?.active
              ? '请先走回街道，再设置后台日常。'
              : undefined
          }
          onClick={() => setBackgroundOpen(true)}
        >
          后台日常设置
        </button>
      </div>
      <div className={styles.game} inert={background.suspended}>
        <StreetWalk
          key={saveRevision}
          suspended={background.suspended || backgroundOpen || accountOpen}
        />
      </div>
      <Dialog open={backgroundOpen} onOpenChange={setBackgroundOpen}>
        <DialogContent
          className={styles.backgroundDialog}
          showCloseButton={false}
        >
          <div className={styles.dialogHeading}>
            <DialogTitle>后台日常设置</DialogTitle>
            <DialogClose aria-label="关闭后台日常设置">关闭</DialogClose>
          </div>
          <DialogDescription>
            管理关闭网页后的日常与云端进度。
          </DialogDescription>
          <FateBackgroundPanel
            background={background}
            onSettings={() => {
              setBackgroundOpen(false);
              setAccountOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>
      {accountOpen && (
        <FateAISettings
          onClose={() => {
            setAccountOpen(false);
            setBackgroundOpen(true);
          }}
        />
      )}
    </div>
  );
}
