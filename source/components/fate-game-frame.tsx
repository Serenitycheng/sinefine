'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gameViewportSize } from '@/lib/fate-game-viewport';
import styles from './fate-game-frame.module.css';

/** Keep the interactive canvas at the painting's aspect ratio on wide screens. */
export function FateGameFrame({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const size = gameViewportSize(
        entry.contentRect.width,
        entry.contentRect.height,
      );
      element.style.setProperty('--game-canvas-width', `${size.width}px`);
      element.style.setProperty('--game-canvas-height', `${size.height}px`);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={frame} className={styles.frame} data-game-frame>
      {children}
    </div>
  );
}
