'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Compass,
  Feather,
  Flower2,
  Leaf,
  Plus,
  Settings2,
  Sun,
  X,
} from 'lucide-react';
import { runtimeArt } from '@/lib/fate-runtime-art';
import styles from './sinefine-design-preview.module.css';

const FateCityArt = dynamic(() => import('./fate-city-art'), {
  loading: () => <div className={styles.entering}>正在进入冬木…</div>,
});

const destinations = [
  { id: 'worlds', label: '世界', icon: Compass },
  { id: 'fuyuki', label: '冬木', icon: Flower2 },
  { id: 'journal', label: '手记', icon: BookOpen },
] as const;
type View = (typeof destinations)[number]['id'];
export default function SinefineDesignPreview() {
  const [view, setView] = useState<View>('worlds');
  const [settings, setSettings] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (settings && settingsDialog.current && !settingsDialog.current.open)
      settingsDialog.current.showModal();
  }, [settings]);
  return (
    <div className={styles.app} data-quiet={quiet}>
      <aside className={styles.rail} aria-label="主导航">
        <Link href="/" className={styles.mark} aria-label="Sinefine 首页">
          <Leaf size={25} strokeWidth={1.25} />
        </Link>
        <nav>
          {destinations.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
            >
              <Icon size={21} strokeWidth={1.4} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className={styles.settingsButton}
          aria-label="界面设置"
          onClick={() => setSettings(true)}
        >
          <Settings2 size={20} strokeWidth={1.4} />
        </button>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.wordmark}>
            SINE FINE <span>无终之庭</span>
          </Link>
          <div className={styles.previewLabel}>
            <span />
            界面预览
          </div>
          <Link href="/fate/city-art" className={styles.original}>
            <ArrowLeft size={14} />
            现有界面
          </Link>
        </header>
        {view === 'worlds' ? (
          <main className={styles.worlds}>
            <div className={styles.intro}>
              <div>
                <p className={styles.eyebrow}>你的世界</p>
                <h1>今天，去哪里？</h1>
              </div>
            </div>
            <button
              className={styles.fuyukiCard}
              type="button"
              onClick={() => setView('fuyuki')}
            >
              <Image
                src={runtimeArt(
                  '/fate/city-art/miyama-residential-west-soft-v2.png',
                )}
                alt="初夏的深山住宅街，树影落在院墙和安静的路面上"
                fill
                sizes="(max-width: 700px) 100vw, 80vw"
                unoptimized
                priority
              />
              <div className={styles.cardShade} />
              <span className={styles.chapter}>01 / FUYUKI</span>
              <div className={styles.cardTitle}>
                <span>冬木市</span>
                <p>深山町 · 初夏</p>
              </div>
              <span className={styles.enter}>
                进入街区 <ArrowUpRight size={20} />
              </span>
            </button>
            <div className={styles.below}>
              <p>
                <Sun size={16} strokeWidth={1.3} /> Fate · 冬木
              </p>
              <Link href="/worlds">
                其他世界 <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className={styles.folio}>
              <span>无终之庭</span>
              <span>WORLD / 01</span>
              <span></span>
            </div>
          </main>
        ) : view === 'fuyuki' ? (
          <section className={styles.play} aria-label="新版冬木界面">
            <FateCityArt appearance="paper" />
          </section>
        ) : (
          <main className={styles.journal}>
            <p className={styles.eyebrow}>手记</p>
            <h1>日常手记</h1>
            <p className={styles.journalIntro}></p>
            <div className={styles.notebook}>
              <div className={styles.pageNumber}>
                01 <span>／ 庭间</span>
              </div>
              <label htmlFor="garden-note">写下今天的事</label>
              <textarea
                id="garden-note"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="今天……"
              />
              <div className={styles.writeBottom}>
                <span>
                  <Feather size={16} />
                  预览手记，关闭即清除
                </span>
                <button
                  type="button"
                  disabled={!draft.trim()}
                  onClick={() => {
                    setNotes((old) => [draft.trim(), ...old]);
                    setDraft('');
                  }}
                >
                  <Plus size={15} />
                  留在这里
                </button>
              </div>
            </div>
            <div className={styles.notes}>
              {notes.length ? (
                notes.map((note, index) => (
                  <article key={`${index}-${note}`}>
                    <span>{String(notes.length - index).padStart(2, '0')}</span>
                    <p>{note}</p>
                  </article>
                ))
              ) : (
                <p>
                  <BookOpen size={20} strokeWidth={1.25} />
                  还没有手记
                </p>
              )}
            </div>
          </main>
        )}
      </div>
      {settings && (
        <dialog
          ref={settingsDialog}
          onCancel={() => setSettings(false)}
          aria-labelledby="garden-settings"
          className={styles.settings}
        >
          <button
            type="button"
            className={styles.close}
            aria-label="关闭界面设置"
            onClick={() => setSettings(false)}
            autoFocus
          >
            <X size={19} />
          </button>
          <p className={styles.eyebrow}>外观</p>
          <h2 id="garden-settings">界面设置</h2>
          <label>
            <span>
              减少界面动效<small>保留人物行走与操作反馈</small>
            </span>
            <input
              type="checkbox"
              checked={quiet}
              onChange={(event) => setQuiet(event.target.checked)}
            />
          </label>
          <button
            type="button"
            className={styles.done}
            onClick={() => setSettings(false)}
          >
            就这样
          </button>
        </dialog>
      )}
    </div>
  );
}
