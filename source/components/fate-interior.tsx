'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowUpRight,
  Armchair,
  BedDouble,
  BookOpen,
  House,
  MessageCircle,
  Moon,
  Soup,
  Sun,
  Users,
} from 'lucide-react';
import { fateArtwork, fatePerson, type PartnerId } from '@/lib/fate-cast';
import { FATE_HOMES, type HomeId } from '@/lib/fate-housing';
import { interiorResidents, type InteriorZone } from '@/lib/fate-interior';
import {
  lifePeriod,
  lifeTime,
  recentLifeEvents,
  type DailyLife,
} from '@/lib/fate-life';
import { activeMeal, homeMealSummary } from '@/lib/fate-meals';
import { BOOKS } from '@/lib/fate-belongings';
import type { ActorId } from '@/lib/street';
import styles from './fate-interior.module.css';

export type InteriorView = HomeId | 'directory';

const rooms = [
  { id: 'lounge', name: '起居间', detail: '坐下来，聊一会儿', Icon: Armchair },
  { id: 'table', name: '厨房与餐桌', detail: '留一份家常饭', Icon: Soup },
  { id: 'study', name: '书桌', detail: '阅读、研习与笔记', Icon: BookOpen },
  { id: 'rest', name: '休息间', detail: '把忙碌留在门外', Icon: BedDouble },
] satisfies {
  id: InteriorZone;
  name: string;
  detail: string;
  Icon: typeof House;
}[];

function PersonPortrait({ id, life }: { id: PartnerId; life: DailyLife }) {
  const person = fatePerson(id, life.waverStage)!;
  const artwork = fateArtwork(person);
  return artwork ? (
    <Image
      src={artwork.file}
      alt=""
      fill
      sizes="(max-width: 640px) 100px, 150px"
      unoptimized
      className={styles.portraitImage}
    />
  ) : (
    <span className={styles.initial}>{person.name.slice(0, 1)}</span>
  );
}

export function FateInterior({
  view,
  life,
  controlled,
  running,
  onVisit,
  onReturn,
  onTalk,
  onStreet,
}: {
  view: InteriorView;
  life: DailyLife;
  controlled: ActorId | null;
  running: boolean;
  onVisit: (home: InteriorView) => void;
  onReturn: () => void;
  onTalk: (id: PartnerId) => void;
  onStreet: (id: PartnerId) => void;
}) {
  const [selectedId, setSelectedId] = useState<PartnerId | null>(null);
  const detail = useRef<HTMLElement>(null);
  const homes = Object.entries(FATE_HOMES) as [
    HomeId,
    (typeof FATE_HOMES)[HomeId],
  ][];
  const residents =
    view === 'directory' ? [] : interiorResidents(life, view, controlled);
  const inside = residents.filter((person) => person.presence === 'inside');
  const away = residents.filter((person) => person.presence !== 'inside');
  const selected =
    residents.find((person) => person.id === selectedId) ?? inside[0];
  const person = selected ? fatePerson(selected.id, life.waverStage)! : null;
  const state = selected ? life.people[selected.id] : null;
  const sleeping =
    state?.activity?.kind === 'sleep' && selected?.presence === 'inside';
  const meal = life.meals.find(
    (item) => item.home === view && activeMeal(life, item.id),
  );
  const book = selected ? life.belongings[selected.id].book : null;
  const night = lifePeriod(life.minutes) === '夜间';

  function visit(home: InteriorView) {
    setSelectedId(null);
    onVisit(home);
  }

  function selectResident(id: PartnerId) {
    setSelectedId(id);
    detail.current?.scrollIntoView({
      block: window.matchMedia('(max-width: 760px)').matches
        ? 'start'
        : 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }

  return (
    <section
      className={`${styles.interior} ${night ? styles.night : ''}`}
      aria-label="住宅室内观察"
    >
      <header className={styles.header}>
        <button type="button" onClick={onReturn} className={styles.back}>
          <ArrowLeft size={16} />
          返回街道
        </button>
        <div className={styles.heading}>
          <span>FUYUKI · AT HOME</span>
          <h2>
            {view === 'directory' ? '灯光里的日常' : FATE_HOMES[view].name}
          </h2>
        </div>
        <span className={styles.clock}>
          {night ? <Moon size={15} /> : <Sun size={15} />}
          {lifeTime(life.minutes)}
          <small>{running ? '日常继续中' : '日常已暂停'}</small>
        </span>
      </header>

      {view === 'directory' ? (
        <div className={styles.directory}>
          <p className={styles.intro}>
            选一处住宅，看看他们此刻的生活。住在一起，也有各自外出的一天。
          </p>
          <div className={styles.homes}>
            {homes.map(([id, home], index) => {
              const people = interiorResidents(life, id, controlled);
              const present = people.filter(
                (item) => item.presence === 'inside',
              );
              const household = people.filter((item) => !item.visitor);
              return (
                <button
                  type="button"
                  key={id}
                  className={styles.homeCard}
                  onClick={() => visit(id)}
                  aria-label={`查看${home.name}，${present.length}人在屋内`}
                >
                  <span
                    className={styles.homeIllustration}
                    data-style={index % 3}
                    aria-hidden="true"
                  >
                    <span className={styles.homeWindow} />
                    <span className={styles.homePlant} />
                    <span className={styles.homeDesk} />
                    <span className={styles.homeNumber}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <span className={styles.homeCopy}>
                    <strong>{home.name}</strong>
                    <span>
                      <i
                        className={
                          present.length ? styles.occupiedDot : styles.emptyDot
                        }
                      />
                      {present.length} 人在屋内 <ArrowUpRight size={15} />
                    </span>
                    <small>
                      {household
                        .map(
                          (item) => fatePerson(item.id, life.waverStage)!.name,
                        )
                        .join('、') || '暂未有街道居民入住'}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.homeView}>
          <div className={styles.homeToolbar}>
            <button type="button" onClick={() => visit('directory')}>
              <House size={15} />
              所有住宅
            </button>
            <label className={styles.homeSelect}>
              <span className={styles.srOnly}>选择住宅</span>
              <select
                value={view}
                onChange={(event) => visit(event.target.value as HomeId)}
              >
                {homes.map(([id, home]) => (
                  <option key={id} value={id}>
                    {home.name}
                  </option>
                ))}
              </select>
            </label>
            <span>
              <Users size={14} />
              {inside.length} 人在屋内
            </span>
          </div>
          <div className={styles.homeContent}>
            <div className={styles.roomsColumn}>
              <div className={styles.floorplan} aria-label="房间与当前活动">
                {rooms.map(({ id, name, detail, Icon }) => {
                  const occupants = inside.filter((item) => item.zone === id);
                  return (
                    <section
                      key={id}
                      className={`${styles.room} ${styles[id]}`}
                      aria-label={name}
                    >
                      <div className={styles.roomWall} aria-hidden="true">
                        <span />
                      </div>
                      <div className={styles.furniture} aria-hidden="true" />
                      <header>
                        <Icon size={16} />
                        <h3>{name}</h3>
                      </header>
                      <div className={styles.roomPeople}>
                        {occupants.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            className={styles.resident}
                            aria-pressed={selected?.id === item.id}
                            aria-label={`观察${fatePerson(item.id, life.waverStage)!.name}：${item.status}`}
                            onClick={() => selectResident(item.id)}
                          >
                            <span className={styles.residentArt}>
                              <PersonPortrait id={item.id} life={life} />
                            </span>
                            <strong>
                              {fatePerson(item.id, life.waverStage)!.name}
                            </strong>
                            <small>
                              {item.visitor ? '来访 · ' : ''}
                              {life.people[item.id].activity?.kind === 'sleep'
                                ? '正在睡觉'
                                : item.status.split(' · ')[0]}
                            </small>
                          </button>
                        ))}
                        {!occupants.length && (
                          <p className={styles.emptyRoom}>
                            {detail}
                            <small>此刻无人</small>
                          </p>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
              <p className={styles.sceneNote}>
                点击房间里的人物，看看近况。他们会按自己的日常进出。
              </p>
              {meal && (
                <p className={styles.mealNote}>
                  <Soup size={18} />
                  <span>{homeMealSummary(life, meal)}</span>
                </p>
              )}
              <section
                className={styles.away}
                aria-label="外出与正在回家的人物"
              >
                <h3>
                  门外的脚步 <span>{away.length}</span>
                </h3>
                {away.length ? (
                  <div className={styles.awayPeople}>
                    {away.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectResident(item.id)}
                        aria-pressed={selected?.id === item.id}
                      >
                        <span className={styles.awayPortrait}>
                          <PersonPortrait id={item.id} life={life} />
                        </span>
                        <span>
                          <strong>
                            {fatePerson(item.id, life.waverStage)!.name}
                          </strong>
                          <small>
                            {item.presence === 'arriving'
                              ? item.visitor
                                ? '正在来访'
                                : '正在回家'
                              : item.presence === 'controlled'
                                ? '由你接管'
                                : '正在外出'}{' '}
                            · {item.status}
                          </small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>目前没有外出的同住居民。</p>
                )}
              </section>
            </div>
            <aside
              ref={detail}
              className={styles.detail}
              aria-label="所选人物近况"
            >
              {selected && person && state ? (
                <>
                  <div className={styles.detailPortrait}>
                    <PersonPortrait id={selected.id} life={life} />
                  </div>
                  <div className={styles.detailCopy}>
                    <span className={styles.presence}>
                      {selected.presence === 'inside'
                        ? selected.visitor
                          ? '来家里作客'
                          : '此刻在屋内'
                        : '此刻不在屋内'}
                    </span>
                    <h3>{person.name}</h3>
                    <p className={styles.status}>{selected.status}</p>
                    <p>
                      {state.activity?.reason ||
                        '给自己一点时间，决定接下来做什么。'}
                    </p>
                    <div className={styles.needs}>
                      <label>
                        精力
                        <meter min={0} max={100} value={state.energy} />
                        {Math.round(state.energy)}
                      </label>
                      <label>
                        饥饿
                        <meter min={0} max={100} value={state.hunger} />
                        {Math.round(state.hunger)}
                      </label>
                    </div>
                    {book && (
                      <p className={styles.book}>
                        <BookOpen size={14} />
                        随身读物：《{BOOKS[book.topic]}》 ·{' '}
                        {Math.round(book.progress)}%
                      </p>
                    )}
                    {selected.presence === 'inside' ? (
                      <>
                        <button
                          className={styles.talk}
                          type="button"
                          disabled={sleeping}
                          onClick={() => onTalk(selected.id)}
                        >
                          {sleeping ? (
                            <Moon size={15} />
                          ) : (
                            <MessageCircle size={15} />
                          )}
                          {sleeping ? '暂不打扰休息' : '以管理员身份交谈'}
                        </button>
                        <small className={styles.talkHint}>
                          {sleeping
                            ? '可以静静观察，醒来后再聊。'
                            : '交谈时日常暂歇，结束后沿用当前进度。'}
                        </small>
                      </>
                    ) : (
                      <button
                        className={styles.talk}
                        type="button"
                        onClick={() => onStreet(selected.id)}
                      >
                        <ArrowUpRight size={15} />
                        回街道跟随此人
                      </button>
                    )}
                    <div className={styles.recent}>
                      <h4>最近的生活</h4>
                      {recentLifeEvents(life, selected.id)
                        .slice(-2)
                        .map((event) => (
                          <p key={event.id}>
                            <time>
                              {lifeTime(event.minute).split(' · ')[1]}
                            </time>
                            {event.text}
                          </p>
                        ))}
                      {!recentLifeEvents(life, selected.id).length && (
                        <p>新的日常还在慢慢发生。</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.emptyDetail}>
                  <Armchair size={38} />
                  <h3>屋里很安静</h3>
                  <p>
                    有人回来时，会出现在对应的房间。也可以点选外出的人，看看他们正在做什么。
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
