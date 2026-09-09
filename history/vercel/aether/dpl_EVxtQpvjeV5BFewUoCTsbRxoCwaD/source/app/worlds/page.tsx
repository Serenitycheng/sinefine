import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Feather,
  Footprints,
  MessageCircle,
  Plus,
} from 'lucide-react';
import { WorldHeader, WorldFooter } from '@/components/world-navigation';
import styles from '@/components/world-entry.module.css';
export const metadata: Metadata = {
  title: '人类社会 · SINE FINE｜无中之庭',
  description:
    '选择熟悉的世界，走入角色们的日常。首个开放世界：Fate 冬木街道。',
};
export default function HumanWorldsPage() {
  return (
    <div className={styles.shell}>
      <WorldHeader active="worlds" />
      <main className={`${styles.main} ${styles.modesMain}`}>
        <Link className={styles.breadcrumb} href="/">
          <ArrowLeft size={14} /> 世界入口
        </Link>
        <div className={styles.modesIntro}>
          <div>
            <p className={styles.eyebrow}>HUMANITY / 02</p>
            <h1>每个人，都有自己的故事。</h1>
          </div>
          <p>
            选择一个已有的世界，
            <br />
            或者从你的想象开始。
          </p>
        </div>
        <div className={styles.modesGrid}>
          <section
            className={styles.existingMode}
            aria-labelledby="existing-title"
          >
            <div className={styles.modeHeading}>
              <BookOpen size={18} strokeWidth={1.4} />
              <h2 id="existing-title">现有世界观</h2>
              <span>01 / 已开放</span>
            </div>
            <p className={styles.modeDescription}>
              保留熟悉的人物与背景，让他们拥有属于这里的生活。
            </p>
            <article className={styles.fateCard}>
              <div className={styles.fateImage}>
                <Image
                  src="/fate/street/street.png"
                  alt="Fate 世界的冬木生活街道，住宅门前与街角咖啡店"
                  fill
                  preload
                  sizes="(max-width: 850px) 92vw, 60vw"
                  style={{ objectFit: 'cover', objectPosition: 'center 68%' }}
                />
                <span className={styles.imageTag}>冬木 · 生活街道</span>
                <span className={styles.imageWordmark}>
                  Fate<span>ANOTHER ORDINARY DAY</span>
                </span>
              </div>
              <div className={styles.fateDetails}>
                <div className={styles.fateTitle}>
                  <div>
                    <p className={styles.eyebrow}>
                      ZERO + UNLIMITED BLADE WORKS
                    </p>
                    <h3>从冬木的一段午后开始</h3>
                  </div>
                  <span className={styles.available}>
                    <span /> 可进入
                  </span>
                </div>
                <p>
                  走过住宅门前，在小店旁停留。
                  <br />
                  遇见
                  Saber、凛、士郎、樱、切嗣、爱丽丝菲尔、伊莉雅与藤村老师，聊聊今天，也聊聊你眼中的世界。
                </p>
                <div className={styles.featureRow}>
                  <span>
                    <Footprints size={14} />
                    三位主控可切换
                  </span>
                  <span>
                    <MessageCircle size={14} />
                    DeepSeek 角色交谈
                  </span>
                </div>
                <div className={styles.fateActions}>
                  <Link className={styles.enterWorld} href="/fate/street">
                    走进冬木 <ArrowUpRight size={18} />
                  </Link>
                  <Link href="/fate/connect">
                    设置 AI 对话 <ArrowUpRight size={13} />
                  </Link>
                  <Link href="/fate/world">
                    世界与人物设定 <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            </article>
            <div className={styles.moreWorlds}>
              <Plus size={16} />
              <span>其他世界观</span>
              <small>待后续逐一制作</small>
            </div>
          </section>
          <section className={styles.freeMode} aria-labelledby="free-title">
            <div className={styles.modeHeading}>
              <Feather size={18} strokeWidth={1.4} />
              <h2 id="free-title">自由创造</h2>
              <span className={styles.pending}>待开放</span>
            </div>
            <p className={styles.modeDescription}>
              由你设定世界、人物与最初的规则。
            </p>
            <div className={styles.blankWorld}>
              <div className={styles.blankCross}>
                <Plus size={26} strokeWidth={1} />
              </div>
              <span>AN UNWRITTEN WORLD</span>
              <h3>为你的想象留一页空白。</h3>
              <p>世界观 · 人物 · 自然语言规则</p>
              <button disabled>创作入口尚未开放</button>
            </div>
            <p className={styles.pendingNote}>
              此模式保留位置，完成 Fate 日常系统后再制作。
            </p>
          </section>
        </div>
        <aside className={styles.scopeNote}>
          <span>当前可体验</span>
          <p>
            街道漫游、八人的自主日常、切换主控与交谈；也可编辑世界与首批 21
            人的设定。Saber
            与凛已支持自主日常、行动理由与相遇记录；完整阵容将逐步接入。
          </p>
        </aside>
      </main>
      <WorldFooter />
    </div>
  );
}
