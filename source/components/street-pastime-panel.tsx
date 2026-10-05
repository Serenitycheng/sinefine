'use client';
import { useState } from 'react';
import { Utensils, Wrench, ArrowRight, MapPin } from 'lucide-react';
import {
  STREET_PARTNERS,
  fatePerson,
  isPartner,
  type PartnerId,
} from '@/lib/fate-cast';
import {
  currentPastime,
  livePastime,
  pastimeSummary,
  type PastimeCommand,
} from '@/lib/fate-pastimes';
import { knownPreferences } from '@/lib/fate-memory-behavior';
import { deviceName } from '@/lib/fate-belongings';
import type { StreetLife } from './use-street-life';
import styles from './street-life.module.css';

export function StreetPastimePanel({
  life,
  controlled,
}: {
  life: StreetLife;
  controlled: string | null;
}) {
  const [target, setTarget] = useState<PartnerId>(
    controlled === 'illya'
      ? 'kiritsugu'
      : controlled === 'kiritsugu' || controlled === 'irisviel'
        ? 'illya'
        : controlled === 'shirou'
          ? 'sakura'
          : 'shirou',
  );
  const [notice, setNotice] = useState<{ text: string; scope: string } | null>(
    null,
  );
  const [kind, setKind] = useState<'meal' | 'repair'>('meal');
  if (!isPartner(controlled))
    return (
      <section className={styles.pastimes}>
        <span>SMALL MOMENTS</span>
        <h3>一起做点事</h3>
        <p>
          先在下方选择居民并「进入角色」，就能邀请吃饭或帮一个小忙。不连接 AI
          也可以玩。
        </p>
      </section>
    );
  const current = life.view.pastimes?.find(
    (p) =>
      p.host === controlled && currentPastime(life.view, p) && livePastime(p),
  );
  const selected = current?.target ?? target;
  const noticeScope = current ? `${current.id}:${current.phase}` : 'none';
  const showNotice = (text: string) => setNotice({ text, scope: noticeScope });
  const name = fatePerson(selected, life.view.waverStage)!.name;
  const recent =
    life.view.pastimes
      ?.filter(
        (p) =>
          [p.host, p.target].includes(controlled) &&
          currentPastime(life.view, p) &&
          !livePastime(p),
      )
      .slice(-3)
      .reverse() ?? [];
  const doAction = (command: PastimeCommand) =>
    showNotice(life.pastime(command, selected).message);
  const status = life.interaction(selected);
  const notes = knownPreferences(life.view, controlled, selected).slice(0, 2);
  const supplies = life.view.belongings[controlled];
  const appointment =
    current?.appointment === undefined
      ? undefined
      : life.view.appointments.find((a) => a.id === current.appointment);
  return (
    <section className={styles.pastimes} aria-label="一起做点事">
      <span>SMALL MOMENTS</span>
      <h3>一起做点事</h3>
      <p>一顿饭，一件顺手帮上的小事。相处过后，他们会记得。</p>
      <label htmlFor="pastime-person">想和谁一起</label>
      <select
        id="pastime-person"
        value={selected}
        disabled={!!current}
        onChange={(e) => {
          setTarget(e.target.value as PartnerId);
          setNotice(null);
        }}
      >
        {STREET_PARTNERS.filter((id) => id !== controlled).map((id) => (
          <option key={id} value={id}>
            {fatePerson(id, life.view.waverStage)!.name}
          </option>
        ))}
      </select>
      {notes.length > 0 && (
        <p className={styles.hint}>
          你记得：
          {notes
            .map(
              (p) =>
                `${name}${p.preference === 'like' ? '喜欢' : '不喜欢'}${p.subject}`,
            )
            .join('；')}
          。
        </p>
      )}
      {current ? (
        <div className={styles.activityCard}>
          <h4>{pastimeSummary(life.view, current)}</h4>
          <p>{current.reply}</p>
          {current.phase === 'ready' && (
            <>
              <p>{status.message}</p>
              <div className={styles.activityButtons}>
                <button onClick={() => doAction('go-target')}>
                  <MapPin size={15} />
                  去找对方
                </button>
                <button
                  disabled={!status.ok}
                  onClick={() => doAction('invite')}
                >
                  亲口邀请
                </button>
              </div>
            </>
          )}
          {current.phase === 'invited' && (
            <>
              <p>
                约定的时间到来后，双方在咖啡店一起吃十分钟。可以开启日常，或到场后主动度过等待和用餐时间。
              </p>
              <button
                onClick={() =>
                  showNotice(
                    life.manageAppointment(current.appointment!, 'attend')
                      .message,
                  )
                }
              >
                前往赴约 <ArrowRight size={15} />
              </button>
              <button onClick={() => doAction('wait-meal')}>
                {appointment?.status === 'meeting'
                  ? '坐下，度过这顿饭'
                  : '到店后，度过等待时间'}
              </button>
              <p className={styles.hint}>
                这是主动安排这段时间；其他人照常生活。双方实际同桌才会留下共同用餐的记忆。
              </p>
            </>
          )}
          {current.phase === 'active' && (
            <>
              <progress
                max={12}
                value={current.progress}
                aria-label="检修进度"
              />
              {current.work ? (
                <>
                  <ol className={styles.repairSteps} aria-label="检修步骤">
                    {(['diagnose', 'adjust', 'test'] as const).map(
                      (step, index) => (
                        <li
                          key={step}
                          aria-current={
                            current.work?.stage === step ? 'step' : undefined
                          }
                        >
                          {index + 1} ·{' '}
                          {['了解问题', '一起处理', '实际试用'][index]}
                        </li>
                      ),
                    )}
                  </ol>
                  <div className={styles.activityButtons}>
                    {current.work.stage === 'diagnose' ? (
                      <>
                        <button
                          disabled={!status.ok}
                          onClick={() => doAction('repair-listen')}
                        >
                          先听对方说哪里不好用 · 3 分钟
                        </button>
                        <button
                          disabled={!status.ok}
                          onClick={() => doAction('repair-look')}
                        >
                          先从外观检查 · 3 分钟
                        </button>
                      </>
                    ) : current.work.stage === 'adjust' ? (
                      <button
                        disabled={!status.ok}
                        onClick={() => doAction('repair-adjust')}
                      >
                        {current.choice === 'replace'
                          ? '一起处理连接处，更换零件'
                          : '一起调整松动的连接处'}{' '}
                        · 6 分钟
                      </button>
                    ) : (
                      <button
                        disabled={!status.ok}
                        onClick={() => doAction('repair-test')}
                      >
                        让对方试用，确认结果 · 3 分钟
                      </button>
                    )}
                  </div>
                  {!status.ok && <p>{status.message}</p>}
                  <p className={styles.hint}>
                    选择每一步后直接度过所需时间；先听清使用时的问题，检查会更仔细。试用前不算完成。
                  </p>
                </>
              ) : (
                <p>
                  已一起动手 {Math.floor(current.progress)} / 12
                  分钟。开启日常并留在对方身边；离开或换人会暂停，超时会收起。
                </p>
              )}
            </>
          )}
          {!life.running && !current.work && current.phase !== 'ready' && (
            <button onClick={life.toggleRunning}>开始日常，继续这段时间</button>
          )}
          <button
            className={styles.quietButton}
            onClick={() => doAction('cancel')}
          >
            这次先放下
          </button>
        </div>
      ) : (
        <>
          <fieldset className={styles.activityTabs} aria-label="选择小活动">
            <button
              aria-pressed={kind === 'meal'}
              onClick={() => setKind('meal')}
            >
              <Utensils size={16} />
              一起吃饭
            </button>
            <button
              aria-pressed={kind === 'repair'}
              onClick={() => setKind('repair')}
            >
              <Wrench size={16} />
              帮忙修理
            </button>
          </fieldset>
          {kind === 'meal' ? (
            <div className={styles.activityCard}>
              <h4>先把两个人的位置留好</h4>
              <p>① 在咖啡店准备 → ② 走近邀请 → ③ 按约到场 → ④ 饭后聊聊。</p>
              <button onClick={() => doAction('go-cafe')}>
                <MapPin size={15} />
                沿街去咖啡店
              </button>
              <div className={styles.activityButtons}>
                <button onClick={() => doAction('prepare-simple')}>
                  备好免费简餐
                </button>
                <button
                  disabled={supplies.groceries < 1}
                  onClick={() => doAction('prepare-vegetable')}
                >
                  带一份时蔬 · 消耗 1 篮
                </button>
              </div>
              <p className={styles.hint}>
                时蔬 {supplies.groceries}{' '}
                篮。材料在准备时消耗；不用额外配菜也能完整一起吃饭。
              </p>
            </div>
          ) : (
            <div className={styles.activityCard}>
              <h4>
                {name}的{deviceName(selected)}
              </h4>
              <p>
                器具状况 {Math.round(life.view.belongings[selected].condition)}{' '}
                / 100。先走近征询意愿，再一起动手。
              </p>
              <p>{status.message}</p>
              <button onClick={() => doAction('go-target')}>
                <MapPin size={15} />
                去找对方
              </button>
              <div className={styles.activityButtons}>
                <button
                  disabled={!status.ok}
                  onClick={() => doAction('repair-inspect')}
                >
                  一起检查 · 免费
                </button>
                <button
                  disabled={!status.ok || supplies.parts < 1}
                  onClick={() => doAction('repair-replace')}
                >
                  更换零件 · 消耗 1 份
                </button>
              </div>
              <p className={styles.hint}>
                免费检查可调整松动；更换零件改善更多。了解问题、一起处理、实际试用，共十二分钟。
              </p>
            </div>
          )}
          <details className={styles.materials}>
            <summary>
              准备材料 · 零件 {supplies.parts} / 时蔬 {supplies.groceries}
            </summary>
            <p>在商店门口购买；仅使用游戏生活点。</p>
            <div className={styles.activityButtons}>
              <button onClick={() => doAction('go-shops')}>去商店</button>
              <button onClick={() => doAction('buy-parts')}>
                零件 · 24 点
              </button>
              <button onClick={() => doAction('buy-groceries')}>
                时蔬 · 18 点
              </button>
            </div>
          </details>
        </>
      )}
      {notice?.scope === noticeScope && notice.text !== current?.reply && (
        <output className={styles.actionNotice}>{notice.text}</output>
      )}
      {!current && recent[0] && (
        <output className={styles.actionNotice}>
          <b>{pastimeSummary(life.view, recent[0])}</b>
          <br />
          {recent[0].reply}
        </output>
      )}
      {recent.length > 0 && (
        <details className={styles.materials}>
          <summary>最近一起做过的事</summary>
          {recent.map((p) => (
            <div key={p.id}>
              <h4>{pastimeSummary(life.view, p)}</h4>
              <p>{p.reply}</p>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
