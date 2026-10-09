'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fatePerson } from '@/lib/fate-cast';
import { lifeTime } from '@/lib/fate-life';
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
  const persist = () => {
    if (!session) return;
    try {
      localStorage.setItem(EMIYA_LIFE_KEY, JSON.stringify(session.save()));
      setNotice('试玩记录已保存。');
    } catch {
      setNotice('试玩记录暂未保存；可点击重新保存。');
    }
  };
  useEffect(() => {
    if (!session) return;
    const save = () => {
      try {
        localStorage.setItem(EMIYA_LIFE_KEY, JSON.stringify(session.save()));
      } catch {
        setNotice('试玩记录暂未保存；可点击重新保存。');
      }
    };
    const timer = window.setInterval(save, 15000);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', save);
      save();
    };
  }, [session]);
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
    <FateEmiyaHouse
      life={session}
      onExit={() => {
        persist();
        setOpen(false);
      }}
      lifeControls={
        <EmiyaLifeControls session={session} notice={notice} onSave={persist} />
      }
    />
  );
}

function EmiyaLifeControls({
  session,
  notice,
  onSave,
}: {
  session: EmiyaLifeSession;
  notice: string;
  onSave: () => void;
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
            保存试玩记录
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
        <output>{notice} 原游戏记录保留。</output>
      </div>
    </details>
  );
}
