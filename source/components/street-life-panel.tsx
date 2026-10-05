'use client';
import { useState } from 'react';
import { Pause, Play, BookOpen, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  LIFE_IDS,
  LIFE_ACTIONS,
  LIFE_PLACES,
  lifeTime,
  lifeStatus,
  lifeHabits,
} from '@/lib/fate-life';
import { fatePerson, isPartner, type PartnerId } from '@/lib/fate-cast';
import { dialogueLines } from '@/lib/fate-dialogue';
import { homeMealSummary } from '@/lib/fate-meals';
import { belongingsSummary, BOOKS, deviceName } from '@/lib/fate-belongings';
import { agendaSummary, dutyIds, weekdayName } from '@/lib/fate-schedule';
import { FATE_HOMES, type HomeId } from '@/lib/fate-housing';
import { StreetDayPlan } from './street-day-plan';
import type { ActorId } from '@/lib/street';
import type { StreetLife } from './use-street-life';
import styles from './street-life.module.css';
import { StreetPastimePanel } from './street-pastime-panel';
import { StreetSocialPanel } from './street-social-panel';
import { StreetEconomyPanel } from './street-economy-panel';
import { conversationSummary } from '@/lib/fate-social';
import {
  FATE_CLOCK_SPEEDS,
  FATE_WALK_PACES,
  clockSpeedLabel,
  parseFateClockSpeed,
  parseFateWalkPace,
  walkPaceLabel,
  type FateWalkPace,
} from '@/lib/fate-clock';

export function LifeControls({
  life,
  disabled,
  open,
  onToggle,
  verified,
  onSettings,
  walkPace,
  onWalkPace,
}: {
  life: StreetLife;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
  verified: boolean;
  onSettings: () => void;
  walkPace: FateWalkPace;
  onWalkPace: (value: FateWalkPace) => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.clock}>
        <span />
        {lifeTime(life.view.minutes)} · {weekdayName(life.view.minutes)}
      </div>
      <button
        type="button"
        className={styles.play}
        onClick={life.toggleRunning}
        disabled={disabled}
      >
        {life.running ? <Pause size={14} /> : <Play size={14} />}
        {life.running ? '暂停日常' : '开始日常'}
      </button>
      <div className={styles.paceControls}>
        <label className={styles.paceField}>
          <span>时间流速</span>
          <select
            aria-label="时间流速"
            disabled={disabled}
            value={life.speed}
            onChange={(event) =>
              life.changeSpeed(parseFateClockSpeed(event.target.value))
            }
            title={clockSpeedLabel(life.speed)}
          >
            {FATE_CLOCK_SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}× · {clockSpeedLabel(speed)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.paceField}>
          <span>人物走速</span>
          <select
            aria-label="人物走速"
            disabled={disabled}
            value={walkPace}
            onChange={(event) =>
              onWalkPace(parseFateWalkPace(event.target.value))
            }
            title="只调整人物走路速度，时间流速保持不变"
          >
            {FATE_WALK_PACES.map((pace) => (
              <option key={pace} value={pace}>
                {walkPaceLabel(pace)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <span className={styles.state}>
        {life.busy
          ? '正在思考 · 日常暂歇'
          : life.running
            ? '日常正在继续'
            : '点击开始，旁观他们的一天'}
      </span>
      <button
        type="button"
        className={styles.play}
        aria-pressed={life.auto}
        disabled={disabled}
        onClick={() => (verified ? life.changeAuto(!life.auto) : onSettings())}
        title={`开启后同时启动居民日常；交谈使用 DeepSeek 额度，最多 ${life.limit} 次，平时的行程由人物习惯决定`}
      >
        <Sparkles size={14} />
        {life.auto
          ? `AI 自主交谈 · ${life.used}/${life.limit}`
          : '开启 AI 自主交谈'}
      </button>
      <button
        type="button"
        className={styles.records}
        aria-expanded={open}
        aria-controls="street-life-panel"
        onClick={onToggle}
      >
        <BookOpen size={15} />
        {open ? '收起日常' : '日常与记录'}
      </button>
    </div>
  );
}
export type LifeSection = 'today' | 'activities' | 'memories' | 'records';

export function LifePanel({
  section,
  onSectionChange: setSection,
  life,
  controlled,
  verified,
  storageNotice,
  onSettings,
  onClose,
  onHome,
}: {
  section: LifeSection;
  onSectionChange: (section: LifeSection) => void;
  life: StreetLife;
  controlled: ActorId | null;
  verified: boolean;
  storageNotice: string;
  onSettings: () => void;
  onClose: () => void;
  onHome: (home: HomeId) => void;
}) {
  const [allEvents, setAllEvents] = useState(false);
  const [personFilter, setPersonFilter] = useState<PartnerId | 'all' | 'care'>(
    isPartner(controlled) ? controlled : 'all',
  );
  const needsCare = (id: PartnerId) =>
    life.view.people[id].hunger >= 85 || life.view.people[id].energy <= 10;
  const urgent = LIFE_IDS.filter(needsCare);
  const visiblePeople = LIFE_IDS.filter(
    (id) =>
      personFilter === 'all' ||
      (personFilter === 'care' ? needsCare(id) : id === personFilter),
  );
  return (
    <aside
      id="street-life-panel"
      className={styles.panel}
      aria-label="人物日常与事件记录"
    >
      <div className={styles.heading}>
        <div>
          <span>AN ORDINARY DAY</span>
          <h2>日常手账</h2>
        </div>
        <button onClick={onClose} aria-label="收起日常面板">
          <X size={18} />
        </button>
      </div>
      <nav className={styles.notebookNav} aria-label="手账栏目">
        {(
          [
            ['today', '居民近况'],
            ['activities', '一起做事'],
            ['memories', '记忆与约定'],
            ['records', '记录与设置'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={section === id}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className={styles.intro}>
        日常{life.running ? '正在继续' : '已暂停'} ·{' '}
        {controlled
          ? '这位人物的行动由你决定'
          : '选择人物只跟随镜头，居民自行生活'}
        。
      </p>
      {section === 'activities' && (
        <StreetPastimePanel
          key={controlled ?? 'observe'}
          life={life}
          controlled={controlled}
        />
      )}
      {section === 'memories' && (
        <StreetSocialPanel
          key={controlled ?? 'observe'}
          life={life.view}
          controlled={controlled}
          onAppointment={life.manageAppointment}
        />
      )}
      {section === 'today' && (
        <>
          <StreetDayPlan
            life={life.view}
            controlled={controlled}
            onHome={onHome}
            onActivities={() => setSection('activities')}
          />
          <section className={styles.lifeOverview} aria-label="居民生活概况">
            <div className={styles.overviewTop}>
              <span>日常正在{life.running ? '继续' : '暂停'}</span>
              <button type="button" onClick={() => setPersonFilter('care')}>
                {urgent.length
                  ? `${urgent.length} 人需要照顾身体`
                  : '大家的身体状态尚好'}
              </button>
            </div>
            <p>
              基础餐食在家和咖啡店都可用；居民会优先就近吃饭，早晚也能回家同桌用餐。
            </p>
            <label htmlFor="life-person-filter">查看人物</label>
            <select
              id="life-person-filter"
              value={personFilter}
              onChange={(e) =>
                setPersonFilter(e.target.value as PartnerId | 'all' | 'care')
              }
            >
              <option value="all">所有居民</option>
              <option value="care">需要照顾身体的人物</option>
              {LIFE_IDS.map((id) => (
                <option key={id} value={id}>
                  {fatePerson(id, life.view.waverStage)!.name}
                </option>
              ))}
            </select>
          </section>
          {personFilter === 'all' && (
            <>
              <details className={styles.scheduleFold}>
                <summary>今日固定作息</summary>
                <section className={styles.ai} aria-label="今日作息">
                  <h3>今日作息 · {weekdayName(life.view.minutes)}</h3>
                  <p>
                    周一至周五有固定课业，周末自由安排。穗群原学园位于深山町；到校后以状态呈现，学园室内暂未开放。
                  </p>
                  {LIFE_IDS.filter(
                    (id) => dutyIds(id, life.view.waverStage).length > 0,
                  ).map((id) => (
                    <div key={id} className={styles.eventReason}>
                      <b>{fatePerson(id, life.view.waverStage)!.name}</b>
                      <p>
                        {controlled === id
                          ? '由你接管 · 自主作息暂停'
                          : agendaSummary(life.view, id)}
                      </p>
                    </div>
                  ))}
                </section>
              </details>
              <section className={styles.ai} aria-label="家中的餐桌">
                <h3>家中的餐桌</h3>
                {life.view.meals.filter(
                  (meal) => meal.day === Math.floor(life.view.minutes / 1440),
                ).length === 0 ? (
                  <p>
                    早饭从 07:00、晚饭从 18:00
                    开始准备。有人忙着或不在家，也可以晚些吃。
                  </p>
                ) : (
                  life.view.meals
                    .filter(
                      (meal) =>
                        meal.day === Math.floor(life.view.minutes / 1440),
                    )
                    .map((meal) => (
                      <div key={meal.id} className={styles.eventReason}>
                        <b>{FATE_HOMES[meal.home].name}</b>
                        <p>{homeMealSummary(life.view, meal)}</p>
                      </div>
                    ))
                )}
              </section>
            </>
          )}
          {visiblePeople.length === 0 && (
            <p className={styles.empty}>
              目前没有需要优先照顾身体的人物。可以切回所有居民，继续看看他们的一天。
            </p>
          )}
          {visiblePeople.map((id) => {
            const person = life.view.people[id];
            const things = life.view.belongings[id];
            const activity = person.activity;
            const place = activity
              ? activity.school
                ? LIFE_PLACES.school.name
                : activity.home
                  ? FATE_HOMES[activity.home].name
                  : LIFE_PLACES[LIFE_ACTIONS[activity.kind].place].name
              : null;
            return (
              <section
                className={styles.person}
                key={id}
                aria-label={`${fatePerson(id, life.view.waverStage)!.name}的日常`}
              >
                <div className={styles.personTop}>
                  <h3>{fatePerson(id, life.view.waverStage)!.name}</h3>
                  <span>
                    {controlled === id
                      ? '由你控制'
                      : life.view.pastimes?.some(
                            (p) =>
                              p.kind === 'repair' &&
                              p.phase === 'active' &&
                              p.target === id &&
                              p.host === controlled,
                          )
                        ? '正在一起检修器具'
                        : lifeStatus(person)}
                  </span>
                </div>
                <div className={styles.needs}>
                  {[
                    { label: '饥饿', value: person.hunger },
                    { label: '精力', value: person.energy },
                    { label: '想与人相处', value: person.social },
                  ].map((need) => (
                    <label key={need.label}>
                      {need.label}
                      <meter
                        min={0}
                        max={100}
                        value={need.value}
                        aria-label={`${need.label} ${Math.round(need.value)}`}
                      />
                      <small>{Math.round(need.value)}</small>
                    </label>
                  ))}
                </div>
                <p className={styles.reason}>
                  {controlled === id
                    ? '自主选择暂时交给你。'
                    : person.activity?.reason ||
                      '暂时没有特别安排，按身体状态与自己的兴趣选择下一件事。'}
                </p>
                {activity && controlled !== id && (
                  <p className={styles.activityDetail}>
                    <b>{place}</b>
                    <span>
                      {activity.phase === 'going'
                        ? '正在路上 · 抵达后开始活动'
                        : activity.waiting
                          ? '等饭做好 · 还未开始用餐'
                          : activity.kind === 'sleep'
                            ? '正在睡眠 · 逐渐恢复精力'
                            : `正在活动 · 预计还需 ${Math.max(1, Math.ceil(activity.remaining))} 分钟`}
                    </span>
                  </p>
                )}
                <small className={styles.source}>
                  {person.activity?.source === 'deepseek'
                    ? 'DeepSeek 选择'
                    : '需求 + 性格习惯'}
                </small>
                <details className={styles.belongings}>
                  <summary>性格与生活习惯</summary>
                  <p>{lifeHabits(id, life.view.waverStage)}</p>
                </details>
                <details className={styles.belongings}>
                  <summary>随身物品与兴趣</summary>
                  <p>
                    时蔬 {things.groceries} 篮 · 零件 {things.parts} 份 · 纸笔{' '}
                    {things.paper} 份
                  </p>
                  {things.book ? (
                    <label>
                      《{BOOKS[things.book.topic]}》 · 第 {things.book.volume}{' '}
                      册
                      <progress
                        max={100}
                        value={things.book.progress}
                        aria-label="阅读进度"
                      />
                      <span>已读 {Math.floor(things.book.progress)}%</span>
                    </label>
                  ) : (
                    <p>还没有自购读物，可以先翻阅店里的公共读物。</p>
                  )}
                  <p>
                    {deviceName(id)} · 完好 {Math.round(things.condition)}%
                  </p>
                  <p>
                    读完 {things.booksRead} 册 · 札记 {things.notes} 页 · 修理{' '}
                    {things.repairs} 次 · 配菜 {things.dishes} 份
                  </p>
                  {things.wish && (
                    <p>{belongingsSummary(life.view, id).split('；').at(-1)}</p>
                  )}
                </details>
              </section>
            );
          })}
        </>
      )}
      {section === 'records' && (
        <>
          <StreetEconomyPanel life={life.view} />
          <details className={styles.scheduleFold}>
            <summary>AI 自主交谈设置</summary>
            <section
              className={styles.ai}
              aria-labelledby="autonomous-ai-title"
            >
              <h3 id="autonomous-ai-title">
                <Sparkles size={14} />
                自主 AI
              </h3>
              <p>
                DeepSeek
                参考双方性格、背景、住处与真实经历，生成四到六句交谈。额度优先用于相遇，至多四分之一用于人物的下一项行动；其余行动按习惯与需求推进。
              </p>
              {verified ? (
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={life.auto}
                    onChange={(e) => life.changeAuto(e.target.checked)}
                  />
                  启用 AI 自主交谈
                </label>
              ) : (
                <button className={styles.connect} onClick={onSettings}>
                  连接 DeepSeek 后开启
                </button>
              )}
              <div className={styles.budget}>
                <label htmlFor="life-ai-limit">本次街道上限</label>
                <select
                  id="life-ai-limit"
                  value={life.limit}
                  onChange={(e) => life.changeLimit(Number(e.target.value))}
                >
                  {[3, 5, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} 次
                    </option>
                  ))}
                </select>
                <span>已用 {life.used} 次</span>
              </div>
              <p className={styles.fine}>
                开启后会消耗你的 API 额度；两次调用至少间隔 30
                秒。与手动对话共用本次页面 20
                次上限。达到上限后按基础规则继续，暂停或切走页面会停止请求。
              </p>
              {life.used >= life.limit && (
                <output className={styles.notice}>
                  已达自主 AI 上限，基础日常继续。
                </output>
              )}
              {life.notice && (
                <output className={styles.notice}>{life.notice}</output>
              )}
            </section>
          </details>
          <section
            className={styles.journal}
            aria-labelledby="life-journal-title"
          >
            <div className={styles.journalTitle}>
              <h3 id="life-journal-title">日常记录</h3>
              <small>相遇 {life.view.encounters} 次</small>
            </div>
            <label className={styles.eventFilter}>
              <input
                type="checkbox"
                checked={allEvents}
                onChange={(e) => setAllEvents(e.target.checked)}
              />
              也显示普通行动过程
            </label>
            {!life.view.events.length && (
              <p className={styles.empty}>
                点击「开始日常」，看看他们今天会做什么。
              </p>
            )}
            <ol>
              {life.view.events
                .filter((e) => allEvents || !e.decision)
                .slice()
                .reverse()
                .map((event) => (
                  <li key={event.id}>
                    <time>{lifeTime(event.minute)}</time>
                    <p>{event.text}</p>
                    {event.decision && (
                      <div className={styles.eventReason}>
                        <small>
                          {event.decision.source === 'deepseek'
                            ? 'DeepSeek 决策'
                            : '性格与习惯'}
                        </small>
                        {event.decision.reason}
                      </div>
                    )}
                    {event.dialogue && (
                      <div className={styles.dialogue}>
                        {dialogueLines(event.dialogue).map((turn, i) => (
                          <p key={i}>
                            <b>
                              {
                                fatePerson(
                                  turn.speaker,
                                  event.dialogue!.waverStage ?? 'young',
                                )!.name
                              }
                            </b>
                            {turn.text}
                          </p>
                        ))}
                        <small>
                          {event.dialogue.source === 'deepseek'
                            ? 'DeepSeek 自主交谈'
                            : '本地编写的相遇'}
                        </small>
                      </div>
                    )}
                    {event.conversation &&
                      (event.conversation.invitation ||
                        event.conversation.effects.impressions.length > 0 ||
                        (event.conversation.effects.preferences?.length ?? 0) >
                          0) && (
                        <div
                          className={styles.eventReason}
                          aria-label="交谈结果"
                        >
                          <small>交谈结果</small>
                          {conversationSummary(
                            event.conversation,
                            event.waverStage ?? life.view.waverStage,
                          ).map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      )}
                  </li>
                ))}
            </ol>
          </section>
        </>
      )}
      <p className={styles.fine}>
        {storageNotice ||
          '时间、状态和最近 80 条日常记录自动保存在此浏览器。重新进入后点击开始继续，不计算离线时间。'}
      </p>
      <Link href="/fate/saves" className={styles.backupLink}>
        存档与备份 · 保留或恢复进度
      </Link>
      {section === 'records' && (
        <p className={styles.fine}>
          当前为二十一人的自主日常。可从「住宅」查看屋内生活；购物完成后结算生活点，物品、账本和使用进度随存档保留。时蔬用于添配菜，基础餐食仍照常供应。普通修理与笔记不直接提升战斗能力。自然语言设定用于
          AI，基础行为尚不解释任意文字规则。
        </p>
      )}
    </aside>
  );
}
