'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Coffee,
  House,
  ImageIcon,
  Minus,
  Move,
  Plus,
  RotateCcw,
  RotateCw,
  Scan,
  Square,
} from 'lucide-react';
import { STUDY_VIEWS, type StreetStudyView } from '@/lib/fate-art-3d-layout';
import type { StudyController } from '@/lib/fate-art-3d-runtime';
import styles from './fate-art-sample-3d.module.css';

const VIEW_ICONS = { street: Scan, house: House, cafe: Coffee };

export default function FateArtSample3D() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<StudyController | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [view, setView] = useState<StreetStudyView | 'free'>('street');
  const [rotating, setRotating] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const surface = host.current;
    if (!surface) return;
    const abort = new AbortController();
    let mounted: StudyController | null = null;
    async function setup() {
      try {
        const { mountStreetStudy } = await import('@/lib/fate-art-3d-runtime');
        if (abort.signal.aborted || !surface) return;
        mounted = await mountStreetStudy(
          surface,
          setView,
          (message) => {
            setFailure(message);
            setReady(false);
          },
          abort.signal,
          () => setRotating(false),
        );
        if (abort.signal.aborted) {
          mounted?.dispose();
          return;
        }
        controller.current = mounted;
        setReady(Boolean(mounted));
      } catch {
        if (!abort.signal.aborted) {
          setFailure('3D画面未能加载。请重试，或先查看2D小样。');
          setReady(false);
        }
      }
    }
    void setup();
    return () => {
      abort.abort();
      mounted?.dispose();
      controller.current = null;
    };
  }, [attempt]);

  function choose(next: StreetStudyView) {
    setRotating(false);
    controller.current?.view(next);
  }
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.brand}>SINE FINE</span>
          <h1>3D 街道小样</h1>
        </div>
        <nav className={styles.links} aria-label="美术对照">
          <Link href="/fate/art-sample">
            <ImageIcon size={16} />
            2D 小样
          </Link>
          <Link href="/fate/street">
            <ArrowLeft size={16} />
            返回游戏
          </Link>
        </nav>
      </header>
      <section className={styles.stage} aria-label="住宅与咖啡店场景预览">
        <div className={styles.canvas} ref={host} />
        <div className={styles.sceneTitle}>
          <span className={styles.sun} />
          住宅街<span className={styles.season}>初夏的午后</span>
        </div>
        <fieldset className={styles.tools} aria-label="镜头调整">
          <button
            type="button"
            title="缩小"
            aria-label="缩小3D场景"
            disabled={!ready}
            onClick={() => controller.current?.zoom(1 / 1.2)}
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            title="放大"
            aria-label="放大3D场景"
            disabled={!ready}
            onClick={() => controller.current?.zoom(1.2)}
          >
            <Plus size={18} />
          </button>
          <span className={styles.divider} />
          <button
            type="button"
            title="向左旋转"
            aria-label="向左旋转镜头"
            disabled={!ready}
            onClick={() => controller.current?.rotate(Math.PI / 6)}
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            title="向右旋转"
            aria-label="向右旋转镜头"
            disabled={!ready}
            onClick={() => controller.current?.rotate(-Math.PI / 6)}
          >
            <RotateCw size={18} />
          </button>
        </fieldset>
        <div className={styles.hint} id="street-study-controls">
          <Move size={17} />
          <span>
            拖动旋转 · 右键拖动平移 · 滚轮缩放
            <span className={styles.touchHint}>
              触屏：单指旋转，双指移动或缩放
            </span>
          </span>
        </div>
        {!ready && (
          <output className={styles.loading}>
            {failure ? (
              <>
                <p>{failure}</p>
                <button
                  type="button"
                  onClick={() => {
                    setFailure(null);
                    setRotating(false);
                    setAttempt((n) => n + 1);
                  }}
                >
                  重新加载
                </button>
                <Link href="/fate/art-sample">查看 2D 小样</Link>
              </>
            ) : (
              <>
                <span className={styles.loadingDot} />
                <p>正在铺开街道…</p>
              </>
            )}
          </output>
        )}
      </section>
      <footer className={styles.footer}>
        <fieldset className={styles.views} aria-label="场景构图">
          {STUDY_VIEWS.map((item) => {
            const Icon = VIEW_ICONS[item.id];
            return (
              <button
                key={item.id}
                type="button"
                disabled={!ready}
                aria-pressed={view === item.id}
                onClick={() => choose(item.id)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={!ready}
            aria-pressed={rotating}
            onClick={() => {
              const next = !rotating;
              setRotating(next);
              controller.current?.autoRotate(next);
            }}
          >
            {rotating ? <Square size={16} /> : <RotateCw size={16} />}
            {rotating ? '停下环视' : '缓慢环视'}
          </button>
        </fieldset>
        <p className={styles.note}>
          场景与镜头对照小样
          <span>人物与行走动作另行制作；不改变日常进度。</span>
        </p>
      </footer>
    </main>
  );
}
