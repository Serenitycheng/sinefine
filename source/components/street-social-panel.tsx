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
import { behaviorNotes } from '@/lib/fate-memory-behavior';
import { StreetMemoryPanel } from './street-memory-panel';

export function StreetSocialPanel({
  life,
  controlled,
  onAppointment,
}: {
  life: DailyLife;
  controlled: string | null;
  onAppointment: (
    id: number,
    action: 'attend' | 'cancel',
  ) => { ok: boolean; message: string };
}) {
  const [watched, setWatched] = useState<PartnerId>(
    STREET_PARTNERS.includes(controlled as PartnerId)
      ? (controlled as PartnerId)
      : 'illya',
  );
  const [notice, setNotice] = useState('');
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
          onChange={(e) => {
            setWatched(e.target.value as PartnerId);
            setNotice('');
          }}
        >
          {STREET_PARTNERS.map((id) => (
            <option key={id} value={id}>
              {fatePerson(id, life.waverStage)!.name}
            </option>
          ))}
        </select>
      </label>
      <p>关系起点：{fatePerson(watched, life.waverStage)!.relations}</p>
      <StreetMemoryPanel
        key={`${watched}:${life.waverStage}`}
        life={life}
        person={watched}
      />
      {behaviorNotes(life, watched).map((note) => (
        <p key={note}>{note}</p>
      ))}
      {notice && <output>{notice}</output>}
      {appointments.length ? (
        <div className={styles.eventReason}>
          {appointments.map((a) => (
            <div key={a.id}>
              <p>{appointmentSummary(a, life.waverStage)}</p>
              {['pending', 'meeting'].includes(a.status) && (
                <>
                  <p>
                    已相处 {Math.floor(a.shared)} / 10 分钟 ·{' '}
                    {a.attending === controlled
                      ? '你已选择参加，离开现场会暂停计时'
                      : '玩家需主动参加；NPC 会自行赴约'}
                  </p>
                  {[a.a, a.b].includes(controlled as PartnerId) && (
                    <div className={styles.speeds}>
                      <button
                        type="button"
                        onClick={() =>
                          setNotice(onAppointment(a.id, 'attend').message)
                        }
                      >
                        前往赴约
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNotice(onAppointment(a.id, 'cancel').message)
                        }
                      >
                        告知取消
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
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
