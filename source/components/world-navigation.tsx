import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Leaf,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import styles from './world-entry.module.css';

export function WorldHeader({
  active,
}: {
  active: 'home' | 'worlds' | 'saves';
}) {
  return (
    <>
      <aside className={styles.rail}>
        <Link className={styles.mark} href="/" aria-label="SINE FINE 世界入口">
          <Leaf size={22} strokeWidth={1.3} />
        </Link>
        <nav aria-label="主要导航">
          <Link
            href="/"
            aria-current={
              active === 'home' || active === 'worlds' ? 'page' : undefined
            }
          >
            <Compass size={20} strokeWidth={1.4} />
            <span>世界</span>
          </Link>
          <Link href="/fate/street">
            <MapPin size={20} strokeWidth={1.4} />
            <span>冬木</span>
          </Link>
          <Link
            href="/fate/saves"
            aria-current={active === 'saves' ? 'page' : undefined}
          >
            <BookOpen size={20} strokeWidth={1.4} />
            <span>存档</span>
          </Link>
        </nav>
        <Link
          className={styles.railSettings}
          href="/fate/connect"
          aria-label="AI 设置"
        >
          <SlidersHorizontal size={20} strokeWidth={1.4} />
          <span>设置</span>
        </Link>
      </aside>
      <header className={styles.header}>
        <Link
          className={styles.brand}
          href="/"
          aria-label="SINE FINE 无终之庭，世界入口"
        >
          SINE FINE <span>无终之庭</span>
        </Link>
        <Link className={styles.quickEntry} href="/fate/street">
          进入冬木 <ArrowUpRight size={15} />
        </Link>
      </header>
    </>
  );
}

export function WorldFooter() {
  return (
    <footer className={styles.footer}>
      <span>SINE FINE · 无终之庭</span>
      <Link href="/worlds">
        人类社会 <ArrowUpRight size={13} />
      </Link>
      <Link href="/nature">
        自然界 <ArrowUpRight size={13} />
      </Link>
    </footer>
  );
}
