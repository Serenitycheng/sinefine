import { House, Utensils, ArrowRight } from 'lucide-react';
import { fatePerson, isPartner } from '@/lib/fate-cast';
import { FATE_HOMES, homeOf, type HomeId } from '@/lib/fate-housing';
import type { DailyLife } from '@/lib/fate-life';
import styles from './street-life.module.css';

export function StreetDayPlan({
  life,
  controlled,
  onHome,
  onActivities,
}: {
  life: DailyLife;
  controlled: string | null;
  onHome: (home: HomeId) => void;
  onActivities: () => void;
}) {
  if (!isPartner(controlled)) return null;
  const person = life.people[controlled];
  const home = homeOf(controlled, life.housing);
  const lastCare = life.events.findLast((e) => e.care?.person === controlled);
  return (
    <section className={styles.dayPlan} aria-label="今天怎么过">
      <span>A LITTLE DAY</span>
      <h3>{fatePerson(controlled, life.waverStage)!.name}的今天</h3>
      <p>
        先照顾好自己，再找个人一起吃饭或帮个小忙。晚上回家，看看今天留下了什么。
      </p>
      <div className={styles.bodyNeeds}>
        <label>
          饥饿 <b>{Math.round(person.hunger)}</b>
          <meter
            min={0}
            max={100}
            value={person.hunger}
            aria-label="当前人物饥饿程度"
          />
        </label>
        <label>
          精力 <b>{Math.round(person.energy)}</b>
          <meter
            min={0}
            max={100}
            value={person.energy}
            aria-label="当前人物精力"
          />
        </label>
      </div>
      <div className={styles.activityButtons}>
        <button type="button" onClick={() => onHome(home)}>
          <House size={15} />回{FATE_HOMES[home].name}吃饭 / 休息
        </button>
        <button type="button" onClick={onActivities}>
          <Utensils size={15} />
          找个人一起做事
          <ArrowRight size={14} />
        </button>
      </div>
      <p className={styles.hint}>
        日常开启后饥饿和疲劳才会变化；暂停时可以慢慢考虑。不会因为状态偏低强制接管人物。
      </p>
      {lastCare && <p className={styles.dayReflection}>{lastCare.text}</p>}
    </section>
  );
}
