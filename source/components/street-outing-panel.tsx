'use client';

import { useState } from 'react';
import { Coffee, Leaf, Bird, MapPin } from 'lucide-react';
import {
  fatePerson,
  isPartner,
  STREET_PARTNERS,
  type PartnerId,
} from '@/lib/fate-cast';
import { DISTRICT_PLACES } from '@/lib/fate-district';
import { knownPreferences } from '@/lib/fate-memory-behavior';
import {
  currentPublicOuting,
  publicOutingChoices,
  publicOutingInstructions,
  publicOutingPoint,
  publicOutingTitle,
  type CafeOrder,
  type PublicOutingKind,
} from '@/lib/fate-public-outings';
import type { ActorId, Point } from '@/lib/street';
import type { StreetLife } from './use-street-life';
import styles from './street-outing-panel.module.css';

export function StreetOutingPanel({
  daily,
  actor,
  place,
  control,
  arrived,
  onWalk,
}: {
  daily: StreetLife;
  actor: ActorId;
  place: 'cafe' | 'park';
  control: boolean;
  arrived: boolean;
  onWalk: (point: Point) => void;
}) {
  const [notice, setNotice] = useState('');
  const [companion, setCompanion] = useState('');
  const life = daily.view;
  const outing = currentPublicOuting(life, actor);
  const latest = life.publicOutings.completed.findLast(
    (item) =>
      item.actor === actor &&
      item.place === place &&
      (item.stage === null || item.stage === life.waverStage),
  );
  const run = (command: Parameters<StreetLife['outing']>[0]) => {
    const result = daily.outing(command);
    setNotice(!result.ok || command.type === 'cancel' ? result.message : '');
  };
  if (!control || !isPartner(actor))
    return <p>进入一位居民，走到这里后安排一段小日常。</p>;
  if (outing)
    return (
      <div className={styles.panel}>
        <small>
          {outing.kind === 'cafe'
            ? '街角小歇'
            : `河岸观察 · 第 ${outing.step + 1} / 2 站`}
        </small>
        <h3>{publicOutingTitle(outing)}</h3>
        <p>{publicOutingInstructions(life, outing)}</p>
        {outing.companion && (
          <p>同行：{fatePerson(outing.companion, life.waverStage)!.name}</p>
        )}
        <progress
          aria-label="这段活动的进度"
          value={outing.progress}
          max={outing.kind === 'cafe' && !outing.choice ? 3 : outing.total}
        />
        {!daily.running && (
          <button onClick={daily.toggleRunning}>
            继续日常，让这段时光流动
          </button>
        )}
        {outing.kind !== 'cafe' && outing.phase === 'ongoing' && (
          <button onClick={() => onWalk(publicOutingPoint(outing))}>
            <MapPin size={14} /> 走到第 {outing.step + 1} 处观察点
          </button>
        )}
        {publicOutingChoices(outing).map((choice) => (
          <button
            key={choice.id}
            onClick={() => run({ type: 'choose', choice: choice.id })}
          >
            {choice.label}
          </button>
        ))}
        {outing.phase === 'ready' && (
          <button onClick={() => run({ type: 'interact' })}>
            {outing.kind === 'cafe'
              ? '收起餐具，结束小歇'
              : outing.step === 0
                ? '看看这里的线索'
                : '记下这次发现'}
          </button>
        )}
        <button
          className={styles.quiet}
          onClick={() => run({ type: 'cancel' })}
        >
          这次先放下
        </button>
        <p>离开、进屋或换人会暂停；连续 60 个游戏分钟无法继续会收起。</p>
        {notice && <output aria-live="polite">{notice}</output>}
      </div>
    );
  const needs = life.people[actor];
  const preferences = knownPreferences(life, actor)
    .filter((item) => /饭|餐|茶|蔬|散步|安静/.test(item.subject))
    .slice(0, 2);
  const candidates = STREET_PARTNERS.filter(
    (id) =>
      id !== actor &&
      !daily.isInside(id) &&
      Math.hypot(
        life.positions[id].x - life.positions[actor].x,
        life.positions[id].y - life.positions[actor].y,
      ) <= 75 &&
      Math.hypot(
        life.positions[id].x - DISTRICT_PLACES.park.x,
        life.positions[id].y - DISTRICT_PLACES.park.y,
      ) <= 75,
  );
  const start = (kind: PublicOutingKind, order?: CafeOrder) =>
    run({
      type: 'start',
      kind,
      order,
      ...(kind !== 'cafe' && candidates.includes(companion as PartnerId)
        ? { companion: companion as PartnerId }
        : {}),
    });
  return (
    <div className={styles.panel}>
      <p className={styles.needs}>
        饥饿 {Math.round(needs.hunger)} · 精力 {Math.round(needs.energy)}
      </p>
      {preferences.length > 0 && (
        <p>
          记得自己说过：
          {preferences
            .map(
              (item) =>
                `${item.preference === 'like' ? '喜欢' : '不喜欢'}${item.subject}`,
            )
            .join('、')}
          。
        </p>
      )}
      {!arrived && <p>先走到这里，再开始。活动途中可以自由离开。</p>}
      {place === 'cafe' ? (
        <>
          <button
            className={styles.option}
            disabled={!arrived}
            onClick={() => start('cafe', 'set-meal')}
          >
            <Coffee size={17} />
            <span>
              <b>饭团定食</b>
              <small>免费 · 好好吃一餐，缓解饥饿</small>
            </span>
          </button>
          <button
            className={styles.option}
            disabled={!arrived || life.belongings[actor].groceries < 1}
            onClick={() => start('cafe', 'vegetables')}
          >
            <Leaf size={17} />
            <span>
              <b>加一份时蔬</b>
              <small>消耗 1 篮食材 · 更饱足的配餐</small>
            </span>
          </button>
          <button
            className={styles.option}
            disabled={!arrived}
            onClick={() => start('cafe', 'tea')}
          >
            <Coffee size={17} />
            <span>
              <b>热茶歇脚</b>
              <small>免费 · 恢复精神，不能代替吃饭</small>
            </span>
          </button>
          <p>
            入座后选自己的节奏；实际留场用完才记入经历。食材点单时使用，中止不返还。
          </p>
        </>
      ) : (
        <>
          <label>
            这次和谁走？
            <select
              aria-label="河岸散步同行人"
              value={
                candidates.includes(companion as PartnerId) ? companion : ''
              }
              onChange={(event) => setCompanion(event.target.value)}
            >
              <option value="">自己慢慢走</option>
              {candidates.map((id) => (
                <option key={id} value={id}>
                  {fatePerson(id, life.waverStage)!.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className={styles.option}
            disabled={!arrived}
            onClick={() => start('river')}
          >
            <Leaf size={17} />
            <span>
              <b>沿河听风</b>
              <small>两处观察点 · 留意风、水声与河面</small>
            </span>
          </button>
          <button
            className={styles.option}
            disabled={!arrived}
            onClick={() => start('birds')}
          >
            <Bird size={17} />
            <span>
              <b>寻找河岸的小鸟</b>
              <small>听到线索后，决定如何接近</small>
            </span>
          </button>
          <p>
            走到现场、停下观察，再决定下一步。同行的人也要实际到场；当天只结算一次。
          </p>
        </>
      )}
      {notice && <output aria-live="polite">{notice}</output>}
      {latest && (
        <div className={styles.keepsake}>
          <small>留在手账里</small>
          <p>{latest.summary}</p>
        </div>
      )}
    </div>
  );
}
