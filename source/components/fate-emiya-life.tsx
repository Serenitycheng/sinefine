'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fatePerson } from '@/lib/fate-cast';
import { lifeTime } from '@/lib/fate-life';
import type { PartnerId } from '@/lib/fate-cast';
import { activeMeal, homeMealSummary } from '@/lib/fate-meals';
import { EMIYA_ROOMS } from '@/lib/fate-emiya-house';
import { EMIYA_TOPICS } from '@/lib/fate-emiya-household';
import {
  EMIYA_LIFE_KEY,
  EmiyaLifeSession,
  parseEmiyaLifeSave,
} from '@/lib/fate-emiya-life';
import FateEmiyaHouse from './fate-emiya-house';
import styles from './fate-emiya-house.module.css';

export default function FateEmiyaLifePlaytest() {
  const [session, setSession] = useState<EmiyaLifeSession | null>(null);
  const [open, setOpen] = useState(true);
  const [notice, setNotice] = useState('正在打开试玩记录…');
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(EMIYA_LIFE_KEY);
        setSession(
          new EmiyaLifeSession(
            raw ? parseEmiyaLifeSave(JSON.parse(raw)) : undefined,
          ),
        );
        setNotice('试玩记录只保存在本机。');
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : '试玩记录未能载入，原记录保留。',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const persist = useCallback(() => {
    if (!session) return;
    try {
      localStorage.setItem(EMIYA_LIFE_KEY, JSON.stringify(session.save()));
      setNotice('试玩记录已保存。');
    } catch {
      setNotice('试玩记录暂未保存；可点击重新保存。');
    }
  }, [session]);
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(persist, 15000);
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', persist);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', persist);
      persist();
    };
  }, [session, persist]);
  if (!session || !open)
    return (
      <main className={styles.lifeLanding}>
        <h1>卫宫宅 · 家庭生活试玩</h1>
        <p>{notice}</p>
        {session && (
          <button type="button" onClick={() => setOpen(true)}>
            回到卫宫宅
          </button>
        )}
        <Link href="/fate/city-art">回到街区预览</Link>
      </main>
    );
  return (
    <FateEmiyaLifeScene
      session={session}
      notice={notice}
      onSave={persist}
      onExit={() => {
        persist();
        setOpen(false);
      }}
    />
  );
}

/** The same scene uses either the isolated adapter or the formal save owner. */
export function FateEmiyaLifeScene({
  session,
  notice,
  onSave,
  onExit,
  formal = false,
  suspended = false,
}: {
  session: EmiyaLifeSession;
  notice: string;
  onSave: () => void;
  onExit: () => void;
  formal?: boolean;
  suspended?: boolean;
}) {
  const [selected, setSelected] = useState<PartnerId | null>(null);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const selectResident = useCallback((id: PartnerId) => {
    setSelected(id);
    setHouseholdOpen(true);
  }, []);
  const [residentRequest, setResidentRequest] = useState<{
    id: PartnerId;
    serial: number;
  } | null>(null);
  const [actionRequest, setActionRequest] = useState<{
    id: string;
    serial: number;
  } | null>(null);
  return (
    <FateEmiyaHouse
      life={session}
      suspended={suspended}
      lifeLabel={formal ? '卫宫士郎 · 家庭生活' : undefined}
      onResidentSelect={selectResident}
      residentRequest={residentRequest}
      actionRequest={actionRequest}
      lifeInteractions={
        <EmiyaHouseholdPanel
          session={session}
          selected={selected}
          expanded={householdOpen}
          onExpandedChange={setHouseholdOpen}
          onApproach={(id) => {
            setSelected(id);
            setHouseholdOpen(false);
            setResidentRequest((previous) => ({
              id,
              serial: (previous?.serial ?? 0) + 1,
            }));
          }}
          onTask={(id) => {
            setHouseholdOpen(false);
            setActionRequest((previous) => ({
              id,
              serial: (previous?.serial ?? 0) + 1,
            }));
          }}
          onSave={onSave}
        />
      }
      onExit={onExit}
      lifeControls={
        <EmiyaLifeControls
          session={session}
          notice={notice}
          onSave={onSave}
          formal={formal}
        />
      }
    />
  );
}

function EmiyaHouseholdPanel({
  session,
  selected,
  onApproach,
  onSave,
  onTask,
  expanded,
  onExpandedChange,
}: {
  session: EmiyaLifeSession;
  selected: PartnerId | null;
  onApproach: (id: PartnerId) => void;
  onSave: () => void;
  onTask: (id: string) => void;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
}) {
  const [, refresh] = useState(0);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => refresh((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const bodies = session.house.all();
  const meal = session.life.meals.find(
    (meal) => meal.home === 'emiya' && activeMeal(session.life, meal.id),
  );
  const chosen = bodies.find((body) => body.id === selected);
  const invitation = session.household.invitations.findLast(
    (i) => i.person === selected,
  );
  const help = session.household.help;
  const reminder = session.household.notices.findLast(
    (n) => session.life.minutes - n.minute <= 30,
  );
  const previous = session.life.events.findLast(
    (event) =>
      event.interaction?.speaker === 'shirou' &&
      event.interaction.target === selected,
  );
  return (
    <details
      className={styles.household}
      open={expanded}
      onToggle={(event) => onExpandedChange(event.currentTarget.open)}
    >
      <summary>
        屋内居民 ·{' '}
        {bodies.length
          ? bodies.map((body) => fatePerson(body.id)?.name).join('、')
          : '暂时没人'}
      </summary>
      <div className={styles.householdBody}>
        <p>
          {meal
            ? homeMealSummary(session.life, meal)
            : session.hasFood()
              ? '餐桌上留着家常饭。'
              : '桌上还没有备好的饭。'}
        </p>
        <p>
          {session.household.table.dirty
            ? '餐桌还有碗筷，等大家吃完后再收拾。'
            : session.household.table.set
              ? '碗筷已摆好，家人的位置也留好了。'
              : '餐桌是干净的。'}
        </p>
        {reminder && (
          <output
            className={styles.householdNotice}
            data-life-notice={reminder.key}
          >
            {fatePerson(reminder.person)?.name}：{reminder.text}
          </output>
        )}
        <div>
          {bodies.map((body) => (
            <button
              type="button"
              key={body.id}
              onClick={() => onApproach(body.id)}
            >
              {fatePerson(body.id)?.name} · {EMIYA_ROOMS[body.room].name}
              {body.phase === 'walking'
                ? '（走动中）'
                : body.phase === 'leaving'
                  ? '（出门中）'
                  : ''}
            </button>
          ))}
        </div>
        {selected && (
          <p>
            {chosen
              ? `${fatePerson(selected)?.name}：${session.life.people[selected].activity?.reason ?? '稍歇一会儿。'}`
              : '这位居民已经出门。'}
          </p>
        )}
        {invitation && (
          <p data-life-invitation={invitation.status}>
            {invitation.status === 'walking'
              ? `家人正在沿路过来${!session.running ? '；时间已暂停，继续时间后才会行走' : ''}。`
              : invitation.status === 'seated'
                ? '家人已实际到餐桌，等你一起吃。'
                : invitation.reply}
          </p>
        )}
        {selected && (
          <button
            type="button"
            onClick={() => {
              const result = session.talk(selected);
              setMessage(result.message);
              refresh((value) => value + 1);
              if (result.ok) onSave();
            }}
          >
            聊几句
          </button>
        )}
        {selected && (
          <details className={styles.householdOptions}>
            <summary>聊天、邀约与小帮忙</summary>
            <div className={styles.householdButtons}>
              {EMIYA_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    const result = session.talk(selected, topic.id);
                    setMessage(result.message);
                    refresh((v) => v + 1);
                    if (result.ok) onSave();
                  }}
                >
                  {topic.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const result = session.inviteToMeal(selected);
                  setMessage(result.message);
                  refresh((v) => v + 1);
                  onSave();
                }}
              >
                叫家人吃饭
              </button>
              {invitation?.status === 'walking' && (
                <button
                  type="button"
                  onClick={() => {
                    const result = session.cancelInvitation(selected);
                    setMessage(result.message);
                    refresh((v) => v + 1);
                    onSave();
                  }}
                >
                  这次先不等
                </button>
              )}
              {(['set-table', 'clear-table'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    const result = session.requestHelp(id, selected);
                    setMessage(result.message);
                    refresh((v) => v + 1);
                    if (result.ok) {
                      onTask(id);
                      onSave();
                    }
                  }}
                >
                  {id === 'set-table' ? '请帮忙摆碗筷' : '一起收拾餐桌'}
                </button>
              ))}
            </div>
          </details>
        )}
        {help && (
          <p data-life-cooperation={help.activity}>
            和{fatePerson(help.person)?.name}
            {help.activity === 'set-table' ? '摆碗筷' : '收拾餐桌'}：
            {session.life.people[help.person].activity?.kind === 'eat'
              ? '等家人吃完，再一起动手。'
              : '等你到桌旁就位。'}{' '}
            <button
              type="button"
              onClick={() => {
                session.cancelHelp();
                onTask('stop');
                setMessage('这次共同家务先放下，没有完成收益。');
                refresh((v) => v + 1);
                onSave();
              }}
            >
              放下这件事
            </button>
          </p>
        )}
        <output aria-live="polite">{message}</output>
        {previous?.interaction && (
          <div className={styles.householdConversation}>
            <p>士郎：{previous.interaction.message}</p>
            <p>
              {fatePerson(previous.interaction.target)?.name}：
              {previous.interaction.reply}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

function EmiyaLifeControls({
  session,
  notice,
  onSave,
  formal = false,
}: {
  session: EmiyaLifeSession;
  notice: string;
  onSave: () => void;
  formal?: boolean;
}) {
  const [, refresh] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => refresh((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const person = session.life.people.shirou;
  return (
    <details className={styles.lifeDetails}>
      <summary data-life-minute={session.life.minutes}>
        {lifeTime(session.life.minutes)} · 饥饿 {Math.round(person.hunger)} ·
        精力 {Math.round(person.energy)}
      </summary>
      <div className={styles.lifePanel}>
        <p>
          控制士郎。用餐 20 分钟、和室休息 20 分钟、小睡 60 分钟；阅读 35
          分钟、笔记 40 分钟、备餐 45
          分钟。到位并完成动作后才经过这段时间，其他居民同时继续日常。
        </p>
        <div className={styles.lifeButtons}>
          <button
            type="button"
            onClick={() => {
              session.toggleRunning();
              refresh((value) => value + 1);
            }}
          >
            {session.running ? '暂停日常' : '继续日常'}
          </button>
          <button
            type="button"
            onClick={() => {
              session.wait(30);
              refresh((value) => value + 1);
              onSave();
            }}
          >
            等半小时
          </button>
          <button type="button" onClick={onSave}>
            {formal ? '保存进度' : '保存试玩记录'}
          </button>
        </div>
        <ul aria-label="卫宫宅居民的实际日常">
          {session.residents().map((resident) => (
            <li
              key={resident.id}
              data-life-resident={resident.id}
              data-life-presence={resident.presence}
            >
              {fatePerson(resident.id, session.life.waverStage)?.name} ·{' '}
              {resident.status}
            </li>
          ))}
        </ul>
        <output>
          {notice}
          {formal ? '' : ' 原游戏记录保留。'}
        </output>
      </div>
    </details>
  );
}
