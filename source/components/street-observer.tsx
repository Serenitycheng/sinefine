'use client';
import { useState } from 'react';
import Link from 'next/link';
import { fatePerson, isPartner, type PartnerId } from '@/lib/fate-cast';
import { dialogueLines } from '@/lib/fate-dialogue';
import { LIFE_IDS, lifeTime, lifeStatus, occupiedHome } from '@/lib/fate-life';
import type { ActorId } from '@/lib/street';
import { FATE_HOMES, homeOf } from '@/lib/fate-housing';
import type { StreetLife } from './use-street-life';
import styles from './street-life.module.css';

export function StreetObserver({
  life,
  onFocus,
  watched,
}: {
  life: StreetLife;
  onFocus: (id: PartnerId) => void;
  watched: ActorId;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const encounters = life.view.events.filter((e) => e.dialogue);
  const event = encounters.find((e) => e.id === selected) ?? encounters.at(-1);
  const index = event ? encounters.indexOf(event) : -1;
  const dialogue = event?.dialogue;
  const stage = dialogue?.waverStage ?? 'young';
  return (
    <aside
      className={`${styles.panel} ${styles.observer}`}
      aria-label="旁听人物自主交谈"
    >
      <div className={styles.heading}>
        <div>
          <span>LIFE, IN THEIR OWN WORDS</span>
          <h2>街头旁听</h2>
        </div>
        <small>{selected === null ? '随日常更新' : '回看记录'}</small>
      </div>
      <p className={styles.intro}>他们的交谈会出现在这里，你可以静静旁听。</p>
      {dialogue && event ? (
        <>
          <div className={styles.listenNames}>
            <time>{lifeTime(event.minute)}</time>
            <h3>
              {fatePerson(dialogue.speaker, stage)!.name}
              <span> × </span>
              {fatePerson(dialogue.target, stage)!.name}
            </h3>
            <button onClick={() => onFocus(dialogue.speaker)}>看看他们</button>
          </div>
          <div className={styles.listenSource}>
            {life.pendingDialogue === event.id
              ? 'DeepSeek 正在编写双方交谈…'
              : dialogue.source === 'deepseek'
                ? 'DeepSeek · 双方自主交谈'
                : '本地编写的相遇 · 尚非 AI 自由交谈'}
          </div>
          <div
            className={styles.dialogue}
            aria-live="polite"
            aria-atomic="true"
            aria-busy={life.pendingDialogue === event.id}
          >
            {dialogueLines(dialogue).map((turn, i) => (
              <p key={i}>
                <b>{fatePerson(turn.speaker, stage)!.name}</b>
                {turn.text}
              </p>
            ))}
          </div>
          <nav className={styles.listenNav} aria-label="回看自主交谈">
            <button
              disabled={index <= 0}
              onClick={() => setSelected(encounters[index - 1].id)}
            >
              上一段
            </button>
            <button
              disabled={index >= encounters.length - 1}
              onClick={() => setSelected(encounters[index + 1].id)}
            >
              下一段
            </button>
            <button
              aria-pressed={selected === null}
              onClick={() => setSelected(null)}
            >
              跟随最新
            </button>
          </nav>
        </>
      ) : (
        <p className={styles.empty}>
          点击「开始日常」，不用扮演任何人，也不用替他们输入台词。第一次相遇会出现在这里。
        </p>
      )}
      {isPartner(watched) && (
        <div className={styles.personPeek}>
          <b>{fatePerson(watched, life.view.waverStage)!.name}</b>
          <p>住在{FATE_HOMES[homeOf(watched, life.view.housing)].name}</p>
          <p>{lifeStatus(life.view.people[watched])}</p>
        </div>
      )}
      {!life.auto && (
        <p className={styles.fine}>
          目前使用本地相遇台词。连接 DeepSeek 并开启上方「AI
          自主交谈」，他们会根据双方关系和经历自由接话。
        </p>
      )}
      {life.auto && life.used >= life.limit && (
        <output className={styles.notice}>
          本次自主交谈额度已用完，本地日常继续。可在「日常与记录」查看上限。
        </output>
      )}
      {life.notice && <output className={styles.notice}>{life.notice}</output>}
      <details className={styles.homes}>
        <summary>住处与家人 · 谁回家了</summary>
        {Object.entries(FATE_HOMES).map(([id, home]) => {
          const residents = LIFE_IDS.filter(
            (p) => homeOf(p, life.view.housing) === id,
          );
          const present = LIFE_IDS.filter(
            (p) => occupiedHome(life.view, p) === id,
          );
          if (!residents.length && !present.length) return null;
          return (
            <section key={id}>
              <h3>{home.name}</h3>
              <p>
                同住：
                {residents
                  .map((p) => fatePerson(p, life.view.waverStage)!.name)
                  .join('、') || '尚无登场居民'}
              </p>
              <p>
                在家：
                {present
                  .map(
                    (p) =>
                      `${fatePerson(p, life.view.waverStage)!.name}${residents.includes(p) ? '' : '（来访）'}`,
                  )
                  .join('、') || '目前都不在家'}
              </p>
            </section>
          );
        })}
        <Link href="/fate/world#homes">调整姐妹同住与从者住处 ↗</Link>
      </details>
      <p className={styles.fine}>
        本地日常在离开页面或切到其他窗口时暂停；开启上方「后台代管」后，云端会继续推进。这里的记录随存档保留。
      </p>
    </aside>
  );
}
