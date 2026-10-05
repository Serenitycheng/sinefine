'use client';
import { useState } from 'react';
import { isPartner, fatePerson } from '@/lib/fate-cast';
import {
  currentAppointment,
  liveAppointment,
  MEETUPS,
} from '@/lib/fate-social';
import { currentPastime, livePastime } from '@/lib/fate-pastimes';
import { deviceName } from '@/lib/fate-belongings';
import { lifeTime } from '@/lib/fate-life';
import type { StreetLife } from './use-street-life';
import type { LifeSection } from './street-life-panel';
import styles from './street-life.module.css';
export function LifeReminder({
  life,
  controlled,
  onOpen,
}: {
  life: StreetLife;
  controlled: string | null;
  onOpen: (section: LifeSection) => void;
}) {
  const [notice, setNotice] = useState<{ key: string; text: string } | null>(
    null,
  );
  if (!isPartner(controlled)) return null;
  const plan = life.view.appointments.find(
    (a) =>
      currentAppointment(life.view, a) &&
      liveAppointment(a) &&
      [a.a, a.b].includes(controlled),
  );
  const pastime = life.view.pastimes?.find(
    (p) =>
      currentPastime(life.view, p) && livePastime(p) && p.host === controlled,
  );
  const name =
    plan &&
    fatePerson(plan.a === controlled ? plan.b : plan.a, life.view.waverStage)!
      .name;
  const noticeKey = plan
    ? `${controlled}:${plan.id}:${plan.status}:${plan.stage}`
    : '';
  const repairStep = pastime?.work
    ? { diagnose: '了解问题', adjust: '一起处理', test: '实际试用' }[
        pastime.work.stage
      ]
    : null;
  if (!plan && !pastime)
    return (
      <div className={styles.reminder}>
        <span>今天想做点什么？</span>
        <button onClick={() => onOpen('activities')}>
          打开手账 · 邀请吃饭 / 帮个小忙
        </button>
      </div>
    );
  return (
    <div className={styles.reminder} aria-label="眼前的安排">
      <span>
        {plan
          ? `${lifeTime(plan.start)} · 与${name}在${MEETUPS[plan.activity].place}${MEETUPS[plan.activity].label}`
          : pastime?.phase === 'ready'
            ? '餐食已准备好 · 还需要当面邀请'
            : repairStep
              ? `检修${deviceName(pastime!.target)} · 下一步：${repairStep}`
              : `一起检修中 · ${Math.floor(pastime?.progress ?? 0)} / 12 分钟`}
      </span>
      {plan && (
        <button
          onClick={() =>
            setNotice({
              key: noticeKey,
              text: life.manageAppointment(plan.id, 'attend').message,
            })
          }
        >
          前往赴约
        </button>
      )}
      <button onClick={() => onOpen(pastime ? 'activities' : 'memories')}>
        {repairStep ? '继续检修' : '查看手账'}
      </button>
      {!life.running && !repairStep && pastime?.phase !== 'ready' && (
        <button onClick={life.toggleRunning}>继续日常</button>
      )}
      {notice?.key === noticeKey && <output>{notice.text}</output>}
    </div>
  );
}
