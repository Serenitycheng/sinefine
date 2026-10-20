'use client';

import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { ArrowLeft, ChevronDown, Menu, Pause, Play, X } from 'lucide-react';
import styles from './fate-play-hud.module.css';

export type PlayHudRenderer = (location: string, tools: ReactNode) => ReactNode;

export function FatePlayPanel({
  open,
  onOpenChange,
  title,
  wide = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal
        container={
          typeof document !== 'undefined' &&
          document.fullscreenElement instanceof HTMLElement
            ? document.fullscreenElement
            : undefined
        }
      >
        <DialogPrimitive.Backdrop className={styles.backdrop} />
        <DialogPrimitive.Popup
          className={`${styles.panel} ${wide ? styles.wide : ''}`}
        >
          <div className={styles.heading}>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className={styles.close}
              aria-label={`关闭${title}`}
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** One quiet set of controls; the painting keeps the rest of the screen. */
export function FatePlayHud({
  person,
  portrait,
  location,
  time,
  observing,
  onChoose,
  onBack,
  running,
  disabled,
  onToggleRunning,
  menuOpen,
  onMenuChange,
  children,
}: {
  person: string;
  portrait?: ReactNode;
  location: string;
  time: string;
  observing: boolean;
  onChoose?: () => void;
  onBack?: () => void;
  running: boolean;
  disabled: boolean;
  onToggleRunning: () => void;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const identity = (
    <>
      {onBack ? <ArrowLeft size={18} /> : portrait}
      <span className={styles.identityText}>
        <strong>
          {onBack ? '冬木地图' : `${observing ? '旁观 · ' : ''}${person}`}
        </strong>
        <small>
          <span>{location}</span>
          <time>{time}</time>
        </small>
      </span>
      {!onBack && onChoose && <ChevronDown size={14} />}
    </>
  );
  return (
    <>
      <header className={styles.hud} data-play-hud>
        {onBack || onChoose ? (
          <button
            type="button"
            className={styles.identity}
            onClick={onBack ?? onChoose}
            aria-label={onBack ? '返回街区' : '切换人物'}
          >
            {identity}
          </button>
        ) : (
          <div className={styles.identity}>{identity}</div>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.play} ${running ? styles.running : ''}`}
            aria-label={running ? '暂停日常' : '开始日常'}
            onClick={onToggleRunning}
            disabled={disabled}
            title="开始日常后，居民会按自己的安排生活；你随时可以自由行动。"
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            <span>{running ? '暂停' : '开始日常'}</span>
          </button>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="游戏菜单"
            aria-expanded={menuOpen}
            onClick={() => onMenuChange(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <FatePlayPanel open={menuOpen} onOpenChange={onMenuChange} title="菜单">
        {children}
      </FatePlayPanel>
    </>
  );
}
