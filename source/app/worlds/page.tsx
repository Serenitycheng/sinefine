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
  title: '人类社会 · SINE FINE｜无终之庭',
  description:
    '走进 Fate 冬木，或从海风小镇、星灯学园、远星栖所开始创造自己的世界。',
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
              <span>FATE + 3 个原创模板</span>
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
                  遇见 Saber、凛、士郎、韦伯、吉尔伽美什等 21 位居民，
                  聊聊今天，也聊聊你眼中的世界。
                </p>
                <div className={styles.featureRow}>
                  <span>
                    <Footprints size={14} />
                    自由切换主控
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
            <div className={styles.templateWorlds}>
              <h3>
                其他世界观 <small>原创 · 可修改模板</small>
              </h3>
              <Link href="/create?template=coastal">
                <span>
                  <strong>海风小镇</strong>
                  <small>修船、烹饪与沿海的慢生活</small>
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
                  <small>远航居民在空间站的日常</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </section>
          <section className={styles.freeMode} aria-labelledby="free-title">
            <div className={styles.modeHeading}>
              <Feather size={18} strokeWidth={1.4} />
              <h2 id="free-title">自由创造</h2>
              <span className={styles.available}>本地创作已开放</span>
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
              <p>世界观 · 原创人物 · 可调生活规则</p>
              <Link className={styles.createLink} href="/create">
                开始创造 <ArrowUpRight size={16} />
              </Link>
            </div>
            <p className={styles.pendingNote}>
              最多保存 8
              个独立世界。设定文字用于记录故事背景；日常按明确的生活规则推进，无需连接
              AI。
            </p>
          </section>
        </div>
        <aside className={styles.scopeNote}>
          <span>当前可体验</span>
          <p>
            Fate 支持 21
            人日常、住宅、交谈与生活账本。原创世界支持人物设定、生活观察与独立存档；自然界可从世界入口进入。各模式当前均可在本浏览器体验。
          </p>
        </aside>
      </main>
      <WorldFooter />
    </div>
  );
}
