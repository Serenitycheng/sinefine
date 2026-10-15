import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Leaf, PenLine } from 'lucide-react';
import { WorldHeader, WorldFooter } from '@/components/world-navigation';
import { runtimeArt } from '@/lib/fate-runtime-art';
import styles from '@/components/world-entry.module.css';

export default function WorldEntryPage() {
  return (
    <div className={styles.shell}>
      <WorldHeader active="home" />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>YOUR WORLDS</p>
            <h1>今天，去哪里？</h1>
          </div>
          <Link className={styles.textLink} href="/worlds">
            全部世界 <ArrowUpRight size={15} />
          </Link>
        </div>
        <Link
          className={styles.fuyukiCard}
          href="/fate/street"
          aria-label="走进冬木街道"
        >
          <Image
            src={runtimeArt(
              '/fate/city-art/miyama-residential-west-soft-v2.png',
            )}
            alt="柔和午光中的冬木住宅坡道"
            fill
            preload
            unoptimized
            sizes="(max-width: 640px) 92vw, calc(100vw - 200px)"
            style={{ objectFit: 'cover', objectPosition: 'center 60%' }}
          />
          <div className={styles.heroCaption}>
            <div>
              <small>FATE · 冬木市</small>
              <h2>冬木的一天</h2>
              <p>街道漫游 · 人物与住宅</p>
            </div>
            <span className={styles.heroEnter}>
              走进冬木 <ArrowUpRight size={18} />
            </span>
          </div>
        </Link>
        <section className={styles.worldSection} aria-labelledby="other-worlds">
          <h2 id="other-worlds">其他世界</h2>
          <div className={styles.worldGrid}>
            <Link className={styles.worldCard} href="/nature">
              <Leaf size={25} strokeWidth={1.2} />
              <div>
                <h3>自然界</h3>
                <p>观察植物、动物与天气的变化</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
            <Link className={styles.worldCard} href="/create">
              <PenLine size={25} strokeWidth={1.2} />
              <div>
                <h3>创造世界</h3>
                <p>设定人物与生活，或从模板开始</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <WorldFooter />
    </div>
  );
}
