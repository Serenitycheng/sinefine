'use client';
import { Pause, Play, BookOpen, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { LIFE_IDS, lifeTime, lifeStatus, lifeHabits } from '@/lib/fate-life';
import { fatePerson } from '@/lib/fate-cast';
import type { ActorId } from '@/lib/street';
import type { StreetLife } from './use-street-life';
import styles from './street-life.module.css';

export function LifeControls({
  life,
  disabled,
  open,
  onToggle,
}: {
  life: StreetLife;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.clock}>
        <span />
        {lifeTime(life.view.minutes)}
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
      <div className={styles.speeds} aria-label="日常速度">
        {([1, 4] as const).map((speed) => (
          <button
            type="button"
            key={speed}
            aria-pressed={life.speed === speed}
            onClick={() => life.changeSpeed(speed)}
          >
            {speed}×
          </button>
        ))}
      </div>
      <span className={styles.state}>
        {life.busy
          ? '正在思考 · 日常暂歇'
          : life.running
            ? '日常正在继续'
            : '日常已暂停 · 可自由漫游'}
      </span>
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
export function LifePanel({
  life,
  controlled,
  verified,
  storageNotice,
  onSettings,
  onClose,
}: {
  life: StreetLife;
  controlled: ActorId | null;
  verified: boolean;
  storageNotice: string;
  onSettings: () => void;
  onClose: () => void;
}) {
  return (
    <aside
      id="street-life-panel"
      className={styles.panel}
      aria-label="人物日常与事件记录"
    >
      <div className={styles.heading}>
        <div>
          <span>AN ORDINARY DAY</span>
          <h2>他们的今天</h2>
        </div>
        <button onClick={onClose} aria-label="收起日常面板">
          <X size={18} />
        </button>
      </div>
      <p className={styles.intro}>
        性格与习惯决定倾向，身体状态影响选择。接管人物时，该人物的自主行动暂停。
      </p>
      {LIFE_IDS.map((id) => {
        const person = life.view.people[id];
        return (
          <section
            className={styles.person}
            key={id}
            aria-label={`${fatePerson(id, life.view.waverStage)!.name}的日常`}
          >
            <div className={styles.personTop}>
              <h3>{fatePerson(id, life.view.waverStage)!.name}</h3>
              <span>{controlled === id ? '由你控制' : lifeStatus(person)}</span>
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
                  lifeHabits(id, life.view.waverStage)}
            </p>
            <small className={styles.source}>
              {person.activity?.source === 'deepseek'
                ? 'DeepSeek 选择'
                : '需求 + 性格习惯'}
            </small>
          </section>
        );
      })}
      <section className={styles.ai} aria-labelledby="autonomous-ai-title">
        <h3 id="autonomous-ai-title">
          <Sparkles size={14} />
          自主 AI
        </h3>
        <p>
          在行动选择与相遇时询问
          DeepSeek，读取你的人设调整和近期经历。关闭时按基础性格、习惯与需求继续。
        </p>
        {verified ? (
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={life.auto}
              onChange={(e) => life.changeAuto(e.target.checked)}
            />
            启用自主决策与相遇回复
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
      <section className={styles.journal} aria-labelledby="life-journal-title">
        <div className={styles.journalTitle}>
          <h3 id="life-journal-title">日常记录</h3>
          <small>相遇 {life.view.encounters} 次</small>
        </div>
        {!life.view.events.length && (
          <p className={styles.empty}>
            点击「开始日常」，看看他们今天会做什么。
          </p>
        )}
        <ol>
          {life.view.events
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
                    <p>
                      <b>
                        {
                          fatePerson(
                            event.dialogue.speaker,
                            event.dialogue.waverStage ?? 'young',
                          )!.name
                        }
                      </b>
                      {event.dialogue.message}
                      <small>本地话题</small>
                    </p>
                    <p>
                      <b>
                        {
                          fatePerson(
                            event.dialogue.target,
                            event.dialogue.waverStage ?? 'young',
                          )!.name
                        }
                      </b>
                      {event.dialogue.reply}
                      <small>
                        {event.dialogue.source === 'deepseek'
                          ? 'DeepSeek 回复'
                          : '预设回复'}
                      </small>
                    </p>
                  </div>
                )}
              </li>
            ))}
        </ol>
      </section>
      <p className={styles.fine}>
        {storageNotice ||
          '时间、状态和最近 80 条日常记录自动保存在此浏览器。重新进入后点击开始继续，不计算离线时间。'}
      </p>
      <Link href="/fate/saves" className={styles.backupLink}>
        存档与备份 · 保留或恢复进度
      </Link>
      <p className={styles.fine}>
        当前为十一人的自主日常。做饭、休息和整理笔记在住宅内完成，以状态呈现；检修以活动记录呈现，室内画面、器具物品和花销结算待制作。自然语言设定用于
        AI，基础行为尚不解释任意文字规则。
      </p>
    </aside>
  );
}
