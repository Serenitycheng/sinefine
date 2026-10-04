'use client';
import { useState } from 'react';
import { fatePerson, type PartnerId } from '@/lib/fate-cast';
import { lifeTime, type DailyLife } from '@/lib/fate-life';
import {
  memorySummary,
  visibleMemories,
  type PersonalMemory,
} from '@/lib/fate-memory';
import styles from './street-life.module.css';

const filters = [
  { id: 'all', label: '全部' },
  { id: 'preference', label: '偏好' },
  { id: 'experience', label: '经历' },
  { id: 'appointment', label: '约定' },
] as const;
export function StreetMemoryPanel({
  life,
  person,
}: {
  life: DailyLife;
  person: PartnerId;
}) {
  const [filter, setFilter] = useState<'all' | PersonalMemory['kind']>('all');
  const [count, setCount] = useState(6);
  const records = Object.values(life.bonds)
    .filter(
      (b) =>
        [b.a, b.b].includes(person) &&
        (b.stage === null || b.stage === life.waverStage),
    )
    .flatMap((b) =>
      visibleMemories(b).map((m) => ({
        key: `${b.a}:${b.b}:${m.id}`,
        memory: m,
      })),
    )
    .sort((a, b) => b.memory.eventId - a.memory.eventId);
  const selected = records.filter(
    ({ memory: m }) => filter === 'all' || m.kind === filter,
  );
  const outings =
    filter === 'all' || filter === 'experience'
      ? life.publicOutings.completed
          .filter(
            (item) =>
              item.actor === person &&
              !item.companion &&
              (item.stage === null || item.stage === life.waverStage),
          )
          .slice(-6)
          .reverse()
      : [];
  return (
    <section className={styles.personalMemories} aria-label="个人记忆">
      <h4>{fatePerson(person, life.waverStage)!.name}记住的事</h4>
      <p>明确偏好、约定与重要经历单独保留；普通闲聊不会把它们挤掉。</p>
      <div className={styles.memoryFilters} aria-label="筛选个人记忆">
        {filters.map((f) => (
          <button
            key={f.id}
            aria-pressed={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setCount(6);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {!selected.length && !outings.length && (
        <p className={styles.memoryEmpty}>
          {filter === 'all'
            ? '还没有留下重要记忆。可以先聊聊兴趣，或约下一次见面。'
            : '还没有这一类记忆。没有发生的事不会提前记下来。'}
        </p>
      )}
      <ul className={styles.memoryList}>
        {outings.map((item) => (
          <li key={`outing-${item.id}`}>
            <small>{lifeTime(item.completedAt)} · 自己经历的事</small>
            <p>{item.summary}</p>
            <small>本人实际完成的活动；其他人不会自动知道。</small>
          </li>
        ))}
        {selected.slice(0, count).map(({ key, memory: m }) => (
          <li key={key}>
            <small>
              {lifeTime(m.minute)} ·{' '}
              {m.kind === 'preference'
                ? '本人表达'
                : m.kind === 'appointment'
                  ? '双方约定'
                  : m.person
                    ? '交谈经历'
                    : '实际经历'}
            </small>
            <p>{memorySummary(m, life.waverStage)}</p>
            <details>
              <summary>依据与知情者</summary>
              <p>
                知道这件事的人：
                {m.knownBy
                  .map((id) => fatePerson(id, life.waverStage)!.name)
                  .join('、')}
                。未参与的人不会自动知道。
              </p>
              {m.kind === 'appointment' && (
                <p>最近状态：{lifeTime(m.updatedAt)}</p>
              )}
              {m.quotes.length ? (
                m.quotes.map((q, i) => (
                  <blockquote key={i}>
                    <b>{fatePerson(q.speaker, life.waverStage)!.name}：</b>
                    {q.text}
                  </blockquote>
                ))
              ) : (
                <p>依据：实际到场的共同活动记录。</p>
              )}
              <small>
                来源：
                {m.source === 'deepseek'
                  ? 'DeepSeek 交谈'
                  : m.source === 'preset'
                    ? '本地交谈'
                    : '实际日常记录'}
              </small>
            </details>
          </li>
        ))}
      </ul>
      {selected.length > count && (
        <button
          className={styles.moreMemories}
          onClick={() => setCount((n) => n + 6)}
        >
          再看几件事
        </button>
      )}
      <p className={styles.memoryNote}>
        每对人物保留最近 8 项明确偏好、4 项约定及 12
        项重要经历；同一偏好以最近一次明确表达为准。
      </p>
    </section>
  );
}
