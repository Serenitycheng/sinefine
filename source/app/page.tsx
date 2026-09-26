import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUpRight,
  Leaf,
  MoveUpRight,
  Sparkles,
} from 'lucide-react';
import { WorldHeader, WorldFooter } from '@/components/world-navigation';
import styles from '@/components/world-entry.module.css';

export default function WorldEntryPage() {
  return (
    <div className={styles.shell}>
      <WorldHeader active="home" />
      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="entry-title">
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>
              <span /> A PLACE FOR UNWRITTEN STORIES
            </p>
            <h1 id="entry-title" className={styles.heroTitle}>
              SINE <em>FINE</em>
              <span>无终之庭</span>
            </h1>
            <p className={styles.lead}>
              给世界一个开始，
              <br />
              看看生活会走向哪里。
            </p>
            <p className={styles.introNote}>
              你可以在一旁观察，也可以走进其中。
              <br />
              一段相遇、一次选择，故事从日常里慢慢生长。
            </p>
            <a href="#worlds" className={styles.explore}>
              选择一个世界 <ArrowDown size={16} />
            </a>
          </div>
          <div className={styles.heroArt}>
            <div className={styles.artFrame}>
              <Image
                src="/fate/street/street.png"
                alt="午后树影落在冬木的住宅与街角小店前"
                fill
                preload
                sizes="(max-width: 760px) 92vw, 55vw"
                style={{ objectFit: 'cover', objectPosition: '55% 65%' }}
              />
              <div className={styles.artShade} />
              <div className={styles.artTop}>
                <span>WORLD 001</span>
                <span>冬木 · 午后</span>
              </div>
              <div className={styles.artBottom}>
                <div>
                  <small>故事的第一站</small>
                  <strong>寻常街角，也有无限可能。</strong>
                </div>
                <Link href="/fate/street" aria-label="进入冬木街道">
                  <ArrowUpRight size={23} />
                </Link>
              </div>
            </div>
            <div className={styles.artCaption}>
              <span>FATE / ZERO + UNLIMITED BLADE WORKS</span>
              <span>街道漫游 · 已开放</span>
            </div>
          </div>
        </section>
        <section
          id="worlds"
          className={styles.worldSection}
          aria-labelledby="worlds-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>CHOOSE YOUR WORLD</p>
              <h2 id="worlds-title">你想从哪里开始？</h2>
            </div>
            <p>两种世界，同样值得驻足的生命。</p>
          </div>
          <div className={styles.worldGrid}>
            <article className={`${styles.worldCard} ${styles.natureCard}`}>
              <div className={styles.cardTop}>
                <span className={styles.number}>01</span>
                <span className={styles.available}>
                  <span /> 本地生态已开放
                </span>
              </div>
              <Leaf className={styles.worldIcon} size={32} strokeWidth={1.1} />
              <p className={styles.cardEnglish}>NATURE</p>
              <h3>自然界</h3>
              <p className={styles.cardDescription}>
                从生存、进食与繁衍开始，
                <br />
                观察食物、水分与天气怎样改变这片生境。
              </p>
              <div className={styles.cardBase}>
                <span>植物 · 草食动物 · 捕食者</span>
                <Link href="/nature">
                  观察自然 <MoveUpRight size={16} />
                </Link>
              </div>
            </article>
            <article className={`${styles.worldCard} ${styles.humanCard}`}>
              <div className={styles.cardTop}>
                <span className={styles.number}>02</span>
                <span className={styles.available}>
                  <span /> Fate / 自由世界已开放
                </span>
              </div>
              <Sparkles
                className={styles.worldIcon}
                size={32}
                strokeWidth={1.1}
              />
              <p className={styles.cardEnglish}>HUMANITY</p>
              <h3>人类社会</h3>
              <p className={styles.cardDescription}>
                与熟悉的角色重逢，或构想自己的世界。
                <br />
                从普通的一天开始，观察人与人的相遇。
              </p>
              <div className={styles.cardBase}>
                <span>现有世界观 / 自由创造</span>
                <Link href="/worlds">
                  选择模式 <MoveUpRight size={16} />
                </Link>
              </div>
            </article>
          </div>
        </section>
      </main>
      <WorldFooter />
    </div>
  );
}
