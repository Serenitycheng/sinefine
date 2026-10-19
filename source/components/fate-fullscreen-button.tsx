'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import {
  GAME_FULLSCREEN_CHANGE,
  immersiveGame,
  setImmersiveGame,
} from '@/lib/fate-fullscreen';

export function FateFullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const update = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      setImmersive(immersiveGame());
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && immersiveGame()) {
        setImmersiveGame(false);
      }
    };
    update();
    document.addEventListener('fullscreenchange', update);
    document.addEventListener(GAME_FULLSCREEN_CHANGE, update);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener(GAME_FULLSCREEN_CHANGE, update);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  const toggle = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (immersiveGame()) setImmersiveGame(false);
      else if (
        document.fullscreenEnabled &&
        document.documentElement.requestFullscreen
      ) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          setImmersiveGame(true);
        }
      } else setImmersiveGame(true);
    } catch {
      // A rejected exit must leave the control in its actual browser state.
      setFullscreen(Boolean(document.fullscreenElement));
    } finally {
      pending.current = false;
    }
  };
  const active = fullscreen || immersive;
  const label = fullscreen
    ? '退出全屏'
    : immersive
      ? '退出沉浸模式'
      : '全屏游玩';
  return (
    <button
      type="button"
      aria-label={label}
      title={active ? `${label}（Esc）` : '全屏游玩；不支持时使用沉浸模式'}
      aria-pressed={active}
      onClick={() => void toggle()}
    >
      {active ? <Minimize size={17} /> : <Maximize size={17} />}
    </button>
  );
}
