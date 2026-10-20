'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { PlayHudRenderer } from './fate-play-hud';
import { runtimeArt } from '@/lib/fate-runtime-art';
import { FateHouseScene, type HouseSession } from './fate-city-interior';
import { FORMAL_HOUSE_PLANS } from '@/lib/fate-formal-house-plans';
import { previewPresentation } from '@/lib/fate-preview-presentation';
import { fatePerson, type PartnerId } from '@/lib/fate-cast';
import { HOME_CARE, type HomeCareAction } from '@/lib/fate-self-care';
import { lifePeriod } from '@/lib/fate-life';
import {
  currentPublicOuting,
  publicOutingChoices,
  publicOutingTitle,
} from '@/lib/fate-public-outings';
import type {
  HouseGameSession,
  HouseResidentBody,
  HousePublicCommand,
} from '@/lib/fate-house-game';
import type { CityPoint } from '@/lib/fate-city-layout';
import { houseResidentSprite, formalHousePlan } from '@/lib/fate-house-sprites';
import styles from './fate-city-interior.module.css';
import { houseGaitFrame } from '@/lib/fate-house-walk';
import { FateArtRig } from './fate-art-rig';

function ResidentBody({
  body,
  session,
  walkTo,
  disabled,
}: {
  body: HouseResidentBody;
  session: HouseGameSession;
  walkTo: (point: CityPoint, id?: string | null) => void;
  disabled: boolean;
}) {
  const phase = houseGaitFrame(body.id, body.travelled, body.walking);
  const sprite = houseResidentSprite(
    body.id,
    body.direction,
    phase,
    session.life.waverStage,
    session.home,
  );
  if (!sprite) return null;
  const plan = FORMAL_HOUSE_PLANS[session.home];
  const scene = plan.rooms[body.room].scene;
  const p = previewPresentation(scene, body.point, sprite),
    scale = p.spriteScale;
  const name = fatePerson(body.id, session.life.waverStage)!.name;
  return (
    <button
      type="button"
      className={`${styles.actor} ${styles.resident}`}
      aria-label={`靠近${name}交谈`}
      disabled={disabled || !session.personInside(body.id)}
      data-house-resident={body.id}
      data-resident-x={body.point.x}
      data-resident-y={body.point.y}
      data-resident-frame={phase}
      style={{
        left: p.body.x,
        top: p.body.y,
        width: p.body.width,
        height: p.body.height,
        zIndex: Math.round(p.layer) + 10,
      }}
      onClick={() => {
        const point = session.residentApproach(body.id);
        if (point) walkTo(point, `resident:${body.id}`);
      }}
    >
      <span
        className={styles.shadow}
        style={{
          left: p.foot.x - p.body.x - 32,
          top: p.foot.y - p.body.y - 7,
          transform: `scale(${p.spriteScale / sprite.scale})`,
        }}
      />
      {sprite.rig ? (
        <FateArtRig
          sprite={sprite}
          scale={scale}
          left={p.foot.x - p.body.x}
          top={p.foot.y - p.body.y}
        />
      ) : (
        <span
          className={styles.sprite}
          style={{
            left: p.foot.x - p.body.x,
            top: p.foot.y - p.body.y,
            width: sprite.cellWidth * scale,
            height: sprite.cellHeight * scale,
            backgroundImage: `url(${runtimeArt(sprite.file)})`,
            backgroundSize: `${sprite.imageWidth * scale}px ${sprite.imageHeight * scale}px`,
            backgroundPosition: `${-sprite.cropX * scale}px ${-sprite.cropY * scale}px`,
            clipPath: sprite.clip
              ? `polygon(${sprite.clip.map(([x, y]) => `${(x / sprite.cellWidth) * 100}% ${(y / sprite.cellHeight) * 100}%`).join(',')})`
              : undefined,
            transform: `translate(${-sprite.anchorX * scale}px,${-sprite.anchorY * scale}px)${sprite.mirror ? ' scaleX(-1)' : ''}`,
          }}
        />
      )}
    </button>
  );
}

export default function FateHouseGame({
  session,
  suspended,
  notice,
  onSave,
  onExit,
  onTalk,
  onCare,
  onPublic,
  autonomy,
  hud,
  uiPaused = false,
}: {
  session: HouseGameSession;
  suspended: boolean;
  notice: string;
  autonomy?: ReactNode;
  hud?: PlayHudRenderer;
  uiPaused?: boolean;
  onSave: () => void;
  onExit: () => void;
  onTalk: (id: PartnerId) => { ok: boolean; message: string };
  onCare: (action: HomeCareAction) => { ok: boolean; message: string };
  onPublic: (command: HousePublicCommand) => { ok: boolean; message: string };
}) {
  const [, redraw] = useState(0);
  const signature = useRef('');
  const [arrivalAnchor, setArrivalAnchor] = useState<CityPoint | undefined>(
    undefined,
  );
  const plan = useMemo(
    () =>
      formalHousePlan(
        session.home,
        session.controlled,
        session.life.waverStage,
      ),
    [session.home, session.controlled, session.life.waverStage],
  );
  const currentRoom = session.location.room;
  const house: HouseSession = {
    plan,
    room: currentRoom,
    entry: session.location.point,
    actor: session.controlled,
    zoom: session.zoom,
    arrivalAnchor,
    onActor: () => {},
    onZoom: (value) => {
      if (suspended) return;
      session.setZoom(value);
      redraw((n) => n + 1);
      onSave();
    },
    onDoor: (door, anchor) => {
      if (!session.door(door)) return false;
      setArrivalAnchor(anchor);
      if (!door.to) onExit();
      else {
        redraw((n) => n + 1);
        onSave();
      }
      return true;
    },
    formal: {
      direction: session.direction,
      action: session.action,
      suspended,
      uiPaused,
      walkPace: session.walkPace,
      tick: (dt) => {
        session.tick(dt);
        const next = `${Math.floor(session.life.minutes)}:${session.running}:${session.bodies.map((b) => `${b.id}:${b.room}:${b.point.x}:${b.point.y}:${b.walking}:${b.direction}`).join('|')}`;
        const changed = next !== signature.current;
        signature.current = next;
        return changed;
      },
      move: (point, direction, action) =>
        session.move(point, direction, action),
      occupied: () => session.occupied(),
      constrain: (from, to) => session.constrain(from, to),
      nearest: () =>
        session.bodies
          .filter(
            (b) =>
              session.personInside(b.id) &&
              b.room === session.location.room &&
              Math.hypot(
                b.point.x - session.location.point.x,
                b.point.y - session.location.point.y,
              ) <= 85,
          )
          .sort(
            (a, b) =>
              Math.hypot(
                a.point.x - session.location.point.x,
                a.point.y - session.location.point.y,
              ) -
              Math.hypot(
                b.point.x - session.location.point.x,
                b.point.y - session.location.point.y,
              ),
          )[0]?.id ?? null,
      talk: (id) => onTalk(id).message,
      bodies: (walkTo) =>
        session.bodies
          .filter((body) => body.room === currentRoom)
          .map((body) => (
            <ResidentBody
              key={body.id}
              body={body}
              session={session}
              walkTo={walkTo}
              disabled={suspended}
            />
          )),
      art: () =>
        session.bodies
          .filter((body) => body.room === currentRoom)
          .flatMap((body) =>
            (['down', 'left', 'right', 'up'] as const)
              .map(
                (direction) =>
                  houseResidentSprite(
                    body.id,
                    direction,
                    1,
                    session.life.waverStage,
                    session.home,
                  )?.file,
              )
              .filter((file): file is string => Boolean(file)),
          ),
      controls: ({ walkTo, stop, say }) => (
        <div className={styles.formalLife}>
          <div className={styles.spots}>
            {!hud && (
              <>
                {' '}
                <span>
                  {lifePeriod(session.life.minutes)} ·{' '}
                  {Math.floor(session.life.minutes / 60) % 24}:
                  {String(Math.floor(session.life.minutes) % 60).padStart(
                    2,
                    '0',
                  )}
                </span>
                <button
                  type="button"
                  disabled={suspended}
                  onClick={() => {
                    session.toggleRunning();
                    redraw((n) => n + 1);
                  }}
                >
                  {session.running ? '暂停日常' : '开始日常'}
                </button>
              </>
            )}
            {(['meal', 'rest', 'nap', 'sleep'] as HomeCareAction[])
              .filter((action) => currentRoom === session.careRoom(action))
              .map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={suspended}
                  onClick={() => {
                    stop();
                    say(onCare(action).message);
                  }}
                >
                  {HOME_CARE[action].label}
                </button>
              ))}
            <button type="button" disabled={suspended} onClick={onSave}>
              保存
            </button>
          </div>
          {autonomy}
          <PublicControls
            session={session}
            disabled={suspended}
            run={(command) => {
              stop();
              say(onPublic(command).message);
              redraw((n) => n + 1);
            }}
          />
          <div className={styles.spots}>
            {session
              .residents()
              .filter((p) => p.presence !== 'controlled')
              .map((person) => {
                const body = session.bodies.find((b) => b.id === person.id);
                const name = fatePerson(
                  person.id,
                  session.life.waverStage,
                )!.name;
                return body?.room === currentRoom &&
                  person.presence === 'inside' ? (
                  <button
                    key={person.id}
                    type="button"
                    disabled={suspended}
                    onClick={() => {
                      const point = session.residentApproach(person.id);
                      if (point) walkTo(point, `resident:${person.id}`);
                    }}
                  >
                    {name}
                  </button>
                ) : (
                  <span key={person.id}>
                    {name} ·{' '}
                    {body && person.presence !== 'inside'
                      ? '离屋中'
                      : body
                        ? plan.rooms[body.room].scene.room
                        : person.presence === 'arriving'
                          ? '回家途中'
                          : person.presence === 'inside'
                            ? '在家'
                            : '外出'}
                  </span>
                );
              })}
          </div>
          {notice && <output>{notice}</output>}
        </div>
      ),
    },
  };
  return <FateHouseScene house={house} onExit={onExit} hud={hud} />;
}

function PublicControls({
  session,
  disabled,
  run,
}: {
  session: HouseGameSession;
  disabled: boolean;
  run: (command: HousePublicCommand) => void;
}) {
  if (
    session.home === 'school' &&
    ['classroom', 'library', 'staffroom'].includes(session.location.room)
  )
    return (
      <div className={styles.spots}>
        <button disabled={disabled} onClick={() => run({ type: 'study' })}>
          自习
        </button>
      </div>
    );
  if (session.home === 'shops' && session.location.room === 'hall')
    return (
      <div className={styles.spots}>
        <button disabled={disabled} onClick={() => run({ type: 'shop' })}>
          购买日用品
        </button>
      </div>
    );
  if (session.home !== 'cafe') return null;
  const outing = currentPublicOuting(session.life, session.controlled),
    seatedArea = ['hall', 'window'].includes(session.location.room);
  if (!outing)
    return seatedArea ? (
      <div className={styles.spots}>
        <button
          disabled={disabled}
          onClick={() => run({ type: 'order', order: 'set-meal' })}
        >
          点一份定食
        </button>
        <button
          disabled={disabled}
          onClick={() => run({ type: 'order', order: 'tea' })}
        >
          喝杯热茶
        </button>
      </div>
    ) : null;
  if (outing.kind !== 'cafe') return null;
  return (
    <div className={styles.spots}>
      <span>{publicOutingTitle(outing)}</span>
      <progress
        aria-label="店内小歇进度"
        max={outing.total}
        value={outing.progress}
      />
      {publicOutingChoices(outing).map((choice) => (
        <button
          key={choice.id}
          disabled={disabled || !seatedArea}
          onClick={() => run({ type: 'choose', choice: choice.id })}
        >
          {choice.label}
        </button>
      ))}
      {outing.phase === 'ready' && (
        <button
          disabled={disabled || !seatedArea}
          onClick={() => run({ type: 'finish' })}
        >
          收起餐具
        </button>
      )}
      <button disabled={disabled} onClick={() => run({ type: 'cancel' })}>
        取消小歇
      </button>
    </div>
  );
}
