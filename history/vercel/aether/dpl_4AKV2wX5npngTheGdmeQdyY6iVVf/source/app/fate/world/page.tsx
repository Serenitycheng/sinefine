import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { WorldHeader, WorldFooter } from '@/components/world-navigation';
import { FateWorldEditor } from '@/components/fate-world-editor';
import { FATE_OPENING } from '@/lib/fate-world';
import entry from '@/components/world-entry.module.css';
import styles from '@/components/fate-world.module.css';

export const metadata: Metadata = {
  title: '冬木 · 世界设定｜SINE FINE',
  description:
    '保留熟悉的性格与关系，让 21 位 Fate 角色继续生活。你可以随时补充这个世界的规则。',
};

export default function FateWorldPage() {
  return (
    <div className={entry.shell}>
      <WorldHeader active="worlds" />
      <main className={styles.main}>
        <Link className={entry.breadcrumb} href="/worlds">
          <ArrowLeft size={14} /> 人类社会 / Fate
        </Link>
        <div className={styles.intro}>
          <div>
            <p className={entry.eyebrow}>F U Y U K I / WORLD NOTES</p>
            <h1>
              过去仍在，
              <br />
              <em>明天未定。</em>
            </h1>
            <p className={styles.lead}>
              熟悉的他们，在这里继续生活。
              <br />
              由你留下最初的设定，也为变化留出余地。
            </p>
          </div>
          <div className={styles.summary}>
            <span>THE STORY CONTINUES</span>
            <strong>
              21 <small>位角色 · 同一座冬木</small>
            </strong>
            <p>ZERO + UNLIMITED BLADE WORKS</p>
            <Link href="/fate/street">
              回到街道 <ArrowUpRight size={17} />
            </Link>
            <br />
            <Link href="/fate/saves">
              存档与备份 <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <section aria-labelledby="opening-title" className={styles.opening}>
          <div className={styles.sectionTitle}>
            <span>01</span>
            <h2 id="opening-title">当前开局</h2>
            <small>已确认的基础</small>
          </div>
          <div className={styles.rules}>
            {FATE_OPENING.map((rule, index) => (
              <article key={rule.title}>
                <span>0{index + 1}</span>
                <h3>{rule.title}</h3>
                <p>{rule.detail}</p>
              </article>
            ))}
          </div>
        </section>
        <FateWorldEditor />
      </main>
      <WorldFooter />
    </div>
  );
}
