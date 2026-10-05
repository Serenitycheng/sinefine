'use client';

import { useState } from 'react';
import { Armchair, BedDouble, Soup } from 'lucide-react';
import { homeOf, type HomeId } from '@/lib/fate-housing';
import { isPartner } from '@/lib/fate-cast';
import {
  HOME_CARE,
  homeCarePlan,
  type HomeCareAction,
} from '@/lib/fate-self-care';
import { roomPoint } from '@/lib/fate-indoor-layout';
import type { DailyLife } from '@/lib/fate-life';
import type { Point } from '@/lib/street';
import styles from './fate-interior.module.css';

export function StreetCarePanel({
  life,
  controlled,
  home,
  onAction,
  onWalkTo,
}: {
  life: DailyLife;
  controlled: string | null;
  home: HomeId;
  onAction: (action: HomeCareAction) => { ok: boolean; message: string };
  onWalkTo: (point: Point) => void;
}) {
  const [notice, setNotice] = useState('');
  if (
    !isPartner(controlled) ||
    homeOf(controlled, life.housing) !== home ||
    life.indoor?.actor !== controlled
  )
    return null;
  const person = life.people[controlled];
  const rooms = {
    table: { label: '餐桌', Icon: Soup, point: { x: 620, y: 190 } },
    lounge: { label: '起居间', Icon: Armchair, point: { x: 238, y: 186 } },
    rest: { label: '休息间', Icon: BedDouble, point: { x: 610, y: 395 } },
  };
  const warning = (Object.keys(HOME_CARE) as HomeCareAction[])
    .map((action) => homeCarePlan(life, controlled, action))
    .find((plan) => plan.ok && plan.warning)?.warning;
  return (
    <section className={styles.selfCare} aria-label="照顾自己">
      <div className={styles.careHeading}>
        <h3>留一点时间给自己</h3>
        <span>
          饥饿 {Math.round(person.hunger)} · 精力 {Math.round(person.energy)}
        </span>
      </div>
      <p>
        走到餐桌可以吃饭，起居间可以歇脚，休息间可以睡觉。选择后直接度过这段时间，屋外的日常也会继续。
      </p>
      <div className={styles.careRooms}>
        {(['table', 'lounge', 'rest'] as const).map((zone) => {
          const room = rooms[zone];
          return (
            <div key={zone}>
              <button
                type="button"
                className={styles.careWalk}
                onClick={() => {
                  setNotice('');
                  onWalkTo(roomPoint(home, zone, room.point));
                }}
              >
                <room.Icon size={15} />
                走到{room.label}
              </button>
              {(Object.keys(HOME_CARE) as HomeCareAction[])
                .filter((action) => HOME_CARE[action].room === zone)
                .map((action) => {
                  const plan = homeCarePlan(life, controlled, action);
                  return (
                    <button
                      key={action}
                      type="button"
                      disabled={!plan.ok}
                      title={plan.message}
                      onClick={() => setNotice(onAction(action).message)}
                    >
                      {HOME_CARE[action].label}
                      {action !== 'sleep' && (
                        <small>{HOME_CARE[action].minutes} 分钟</small>
                      )}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
      <p>
        晚上八点后可睡到次日七点；白天可以小睡。未结束的小活动需先完成或收起。
      </p>
      {warning && <p className={styles.careWarning}>{warning}</p>}
      {notice && <output className={styles.careNotice}>{notice}</output>}
    </section>
  );
}
