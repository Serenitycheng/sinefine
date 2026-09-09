'use client';
import { useState } from 'react';
import { STREET_PARTNERS, fatePerson, type PartnerId } from '@/lib/fate-cast';
import {
  bondSummary,
  appointmentSummary,
  currentAppointment,
} from '@/lib/fate-social';
import { lifeTime, type DailyLife } from '@/lib/fate-life';
import styles from './street-life.module.css';

export function StreetSocialPanel({ life }: { life: DailyLife }) {
  const [watched, setWatched] = useState<PartnerId>('illya');
  const bonds = Object.values(life.bonds).filter(
    (b) =>
      (b.a === watched || b.b === watched) &&
      (b.stage === null || b.stage === life.waverStage),
  );
  const appointments = life.appointments
    .filter((a) => [a.a, a.b].includes(watched) && currentAppointment(life, a))
    .slice(-4);
  return (
    <section className={styles.ai} aria-label="相处与约定">
      <h3>相处与约定</h3>
      <p>记下共同经历，慢慢影响之后的相处。原有身份与关系仍然保留。</p>
      <label>
        观察谁的相处
        <select
          aria-label="观察谁的相处"
          value={watched}
          onChange={(e) => setWatched(e.target.value as PartnerId)}
        >
          {STREET_PARTNERS.map((id) => (
            <option key={id} value={id}>
              {fatePerson(id, life.waverStage)!.name}
            </option>
          ))}
        </select>
      </label>
      <p>关系起点：{fatePerson(watched, life.waverStage)!.relations}</p>
      {appointments.length ? (
        <div className={styles.eventReason}>
          {appointments.map((a) => (
            <p key={a.id}>{appointmentSummary(a, life.waverStage)}</p>
          ))}
        </div>
      ) : (
        <p>暂时没有明确约好的见面。</p>
      )}
      {!bonds.length && <p>来到街区后的共同记忆，会从接下来的相处开始记录。</p>}
      {bonds.map((b) => (
        <details key={`${b.a}:${b.b}`} className={styles.belongings}>
          <summary>
            与{fatePerson(b.a === watched ? b.b : b.a, life.waverStage)!.name}
            的相处
          </summary>
          <p>{bondSummary(b, watched)}</p>
          {b.memories
            .filter((m) => m.id >= b.cutoff)
            .slice(-3)
            .reverse()
            .map((m) => (
              <div className={styles.eventReason} key={m.id}>
                <small>
                  {lifeTime(m.minute)} ·{' '}
                  {m.source === 'deepseek'
                    ? 'DeepSeek 交谈'
                    : m.source === 'preset'
                      ? '本地交谈'
                      : '相处结果记录'}
                </small>
                <p>{m.text}</p>
                {m.quotes.map((q, i) => (
                  <p key={i}>
                    <b>{fatePerson(q.speaker, life.waverStage)!.name}：</b>
                    {q.text}
                  </p>
                ))}
                {m.impressions.map((i) => (
                  <small key={i.person}>
                    {fatePerson(i.person, life.waverStage)!.name}的交谈印象：
                    {i.kind === 'care' ? '感受到关心' : '有些话让人在意'}。{' '}
                  </small>
                ))}
              </div>
            ))}
          {!b.memories.some((m) => m.id >= b.cutoff) && (
            <p>关系设定已调整，之后的相处会按新的设定继续。</p>
          )}
        </details>
      ))}
      <p>
        双方明确同意的散步、看书或吃饭，会成为见面安排。课堂、身体需要和你的接管可能让约定延后；到场并相处后才算履行。
      </p>
    </section>
  );
}
