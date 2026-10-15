import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BookOpen, Feather, Plus } from 'lucide-react';
import { WorldHeader, WorldFooter } from '@/components/world-navigation';
import { runtimeArt } from '@/lib/fate-runtime-art';
import styles from '@/components/world-entry.module.css';

export const metadata: Metadata = {
  title: '人类社会 · SINE FINE｜无终之庭',
  description: '走进冬木，或从海风小镇、星灯学园、远星栖所开始创造自己的世界。',
};
export default function HumanWorldsPage() {
  return (
    <div className={styles.shell}>
      <WorldHeader active="worlds" />
      <main className={styles.main}>
        <Link className={styles.breadcrumb} href="/">
          <ArrowLeft size={14} /> 世界入口
        </Link>
        <div className={styles.modesIntro}>
          <div>
            <p className={styles.eyebrow}>YOUR WORLDS</p>
            <h1>选择一个世界</h1>
          </div>
          <p>走进冬木，或开始自己的创作。</p>
        </div>
        <div className={styles.modesGrid}>
          <section
            className={styles.existingMode}
            aria-labelledby="existing-title"
          >
            <div className={styles.modeHeading}>
              <BookOpen size={18} strokeWidth={1.4} />
              <h2 id="existing-title">现有世界</h2>
            </div>
            <article className={styles.fateCard}>
              <div className={styles.fateImage}>
                <Image
                  src={runtimeArt(
                    '/fate/city-art/miyama-residential-west-soft-v2.png',
                  )}
                  alt="冬木住宅坡道，街旁树影与日式院墙"
                  fill
                  preload
                  unoptimized
                  sizes="(max-width: 1000px) 92vw, 55vw"
                  style={{ objectFit: 'cover', objectPosition: 'center 60%' }}
                />
                <span className={styles.imageTag}>FATE</span>
                <span className={styles.imageWordmark}>冬木市</span>
              </div>
              <div className={styles.fateDetails}>
                <div className={styles.fateTitle}>
                  <h3>冬木的一天</h3>
                  <span className={styles.available}>
                    <span /> 可进入
                  </span>
                </div>
                <p>在街区与住宅间行走，观察居民的日常，也可以选择一位角色。</p>
                <div className={styles.fateActions}>
                  <Link className={styles.enterWorld} href="/fate/street">
                    走进冬木 <ArrowUpRight size={18} />
                  </Link>
                  <Link href="/fate/connect">
                    对话设置 <ArrowUpRight size={13} />
                  </Link>
                  <Link href="/fate/world">
                    世界与人物 <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            </article>
            <div className={styles.templateWorlds}>
              <h3>
                从模板开始 <small>原创 · 可修改</small>
              </h3>
              <Link href="/create?template=coastal">
                <span>
                  <strong>海风小镇</strong>
                  <small>修船、烹饪与沿海生活</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
              <Link href="/create?template=academy">
                <span>
                  <strong>星灯学园</strong>
                  <small>魔法背景下的研习与相遇</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
              <Link href="/create?template=orbital">
                <span>
                  <strong>远星栖所</strong>
                  <small>空间站里的远航居民</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </section>
          <section className={styles.freeMode} aria-labelledby="free-title">
            <div className={styles.modeHeading}>
              <Feather size={18} strokeWidth={1.4} />
              <h2 id="free-title">自由创造</h2>
            </div>
            <div className={styles.blankWorld}>
              <div className={styles.blankCross}>
                <Plus size={26} strokeWidth={1} />
              </div>
              <h3>从一张白纸开始</h3>
              <p>设定世界、人物与生活规则。</p>
              <Link className={styles.createLink} href="/create">
                开始创造 <ArrowUpRight size={16} />
              </Link>
            </div>
            <p className={styles.pendingNote}>
              本浏览器最多保存 8
              个独立世界。背景文字用于记录设定，日常按生活规则推进，无需连接
              AI。
            </p>
          </section>
        </div>
      </main>
      <WorldFooter />
    </div>
  );
}
