import Link from 'next/link';
import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import styles from './world-entry.module.css';
export function WorldHeader({ active }: { active: 'home' | 'worlds' }) {
  return (
    <header className={styles.header}>
      <Link
        className={styles.brand}
        href="/"
        aria-label="SINE FINE 无中之庭，世界入口"
      >
        <span className={styles.brandMark}>
          S<span>/</span>F
        </span>
        <span className={styles.brandText}>
          无中之庭<small>SINE FINE</small>
        </span>
      </Link>
      <nav className={styles.nav} aria-label="主要导航">
        <Link href="/" aria-current={active === 'home' ? 'page' : undefined}>
          世界入口
        </Link>
        <Link
          href="/worlds"
          aria-current={active === 'worlds' ? 'page' : undefined}
        >
          人类社会
        </Link>
      </nav>
      <div className={styles.headerLinks}>
        <Link className={styles.settingsLink} href="/fate/connect">
          <SlidersHorizontal size={15} />
          <span>AI 设置</span>
        </Link>
        <Link
          className={styles.quickEntry}
          href="/fate/street"
          aria-label="进入冬木街道"
        >
          进入冬木 <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}
export function WorldFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <span>SINE FINE</span>
        <p>故事未定，日常继续。</p>
      </div>
      <Link href="/prototype">
        早期街区原型 <ArrowUpRight size={13} />
      </Link>
      <small>无中之庭 · 持续制作中</small>
    </footer>
  );
}
