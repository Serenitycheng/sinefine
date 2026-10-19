'use client';
import { useEffect, type RefObject } from 'react';
import styles from './fate-play-chrome.module.css';
import {
  GAME_FULLSCREEN_CHANGE,
  immersiveGame,
  setImmersiveGame,
} from '@/lib/fate-fullscreen';

export function usePlayChrome(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      root.dataset.gameChrome = 'visible';
      clearTimeout(timer);
      if (document.fullscreenElement || immersiveGame())
        timer = setTimeout(() => {
          const active = document.activeElement;
          if (
            active?.matches(
              'button:focus-visible,select:focus-visible,summary:focus-visible,input:focus-visible',
            )
          )
            return;
          root.dataset.gameChrome = 'idle';
        }, 2800);
    };
    const fullscreen = () => {
      root.dataset.gameImmersive = String(immersiveGame());
      root.dataset.gameFullscreen = String(
        Boolean(document.fullscreenElement) || immersiveGame(),
      );
      reveal();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'Escape') reveal();
    };
    root.addEventListener('pointermove', reveal, { passive: true });
    root.addEventListener('pointerdown', reveal, { passive: true });
    root.addEventListener('focusin', reveal);
    root.addEventListener('focusout', reveal);
    root.addEventListener('keydown', key);
    document.addEventListener('fullscreenchange', fullscreen);
    document.addEventListener(GAME_FULLSCREEN_CHANGE, fullscreen);
    fullscreen();
    return () => {
      clearTimeout(timer);
      root.removeEventListener('pointermove', reveal);
      root.removeEventListener('pointerdown', reveal);
      root.removeEventListener('focusin', reveal);
      root.removeEventListener('focusout', reveal);
      root.removeEventListener('keydown', key);
      document.removeEventListener('fullscreenchange', fullscreen);
      document.removeEventListener(GAME_FULLSCREEN_CHANGE, fullscreen);
      queueMicrotask(() => {
        if (
          !document.querySelector('[data-game-fullscreen]') &&
          immersiveGame()
        )
          setImmersiveGame(false);
      });
    };
  }, [ref]);
  return styles.shell;
}
