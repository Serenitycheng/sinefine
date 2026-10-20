'use client';

import type { StreetLife } from './use-street-life';
import { dialogueLines } from '@/lib/fate-dialogue';
import { fatePerson } from '@/lib/fate-cast';
import styles from './fate-autonomy-controls.module.css';

export function FateAutonomyControls({
  life,
  verified,
  disabled,
  onSettings,
}: {
  life: StreetLife;
  verified: boolean;
  disabled: boolean;
  onSettings: () => void;
}) {
  const conversations = life.view.events.filter((e) => e.dialogue).slice(-3);
  return (
    <section
      className={styles.panel}
      aria-label="室内自主交谈"
      data-autonomy-enabled={life.auto}
      data-autonomy-busy={life.busy}
    >
      <div className={styles.controls}>
        <button
          type="button"
          aria-pressed={life.auto}
          disabled={disabled || (!verified && !life.auto)}
          onClick={() => life.changeAuto(!life.auto)}
        >
          {life.auto ? '关闭 AI 自主交谈' : '开启 AI 自主交谈'}
        </button>
        <span>
          本次已用 {life.used}/{life.limit}
        </span>
        <output aria-live="polite">
          {life.notice ||
            (life.busy
              ? '正在交谈…'
              : !verified
                ? '在 AI 设置中连接并验证后即可开启。'
                : life.auto
                  ? '相遇时交谈，沿用街道的次数限制。'
                  : '基础日常照常进行。')}
        </output>
        <button type="button" disabled={disabled} onClick={onSettings}>
          AI 设置
        </button>
      </div>
      {conversations.length > 0 && (
        <details>
          <summary>近期交谈</summary>
          <ol className={styles.conversations}>
            {conversations.map((event) => (
              <li
                key={event.id}
                data-autonomy-event={event.id}
                data-autonomy-source={event.dialogue!.source}
              >
                {dialogueLines(event.dialogue!).map((line, i) => (
                  <p key={i}>
                    {fatePerson(line.speaker, life.view.waverStage)?.name}：
                    {line.text}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
