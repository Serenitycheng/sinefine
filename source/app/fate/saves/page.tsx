import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WorldHeader, WorldFooter } from '@/components/world-navigation';
import FateSaveManager from '@/components/fate-save-manager';
import entry from '@/components/world-entry.module.css';
import styles from '@/components/fate-saves.module.css';

export const metadata: Metadata = {
  title: '存档与备份 · SINE FINE｜无终之庭',
  description: '留住冬木的一段日常。下载、导入和恢复你的 Fate 存档。',
};
export default function FateSavesPage() {
  return (
    <div className={entry.shell}>
      <WorldHeader active="worlds" />
      <main className={styles.main}>
        <Link href="/fate/world" className={entry.breadcrumb}>
          <ArrowLeft size={14} /> Fate / 世界设定
        </Link>
        <div className={styles.intro}>
          <p className={entry.eyebrow}>F U Y U K I / SAVED DAYS</p>
          <h1>让日常，有处可寻。</h1>
          <p>
            留下一份此刻的冬木，
            <br />
            也为下一次回来，保存故事的起点。
          </p>
        </div>
        <FateSaveManager />
      </main>
      <WorldFooter />
    </div>
  );
}
