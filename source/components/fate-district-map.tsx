import type { ReactNode } from 'react';
import Image from 'next/image';
import { MapPin, Navigation, Users, X } from 'lucide-react';
import { type DistrictLandmark } from '@/lib/fate-district';
import {
  FORMAL_LANDMARKS as DISTRICT_LANDMARKS,
  formalPlaceImage,
} from '@/lib/fate-formal-buildings';
import { FATE_HOMES, type HomeId } from '@/lib/fate-housing';
import { fatePerson, STREET_PARTNERS, type PartnerId } from '@/lib/fate-cast';
import {
  lifePeriod,
  lifeStatus,
  occupiedHome,
  type DailyLife,
} from '@/lib/fate-life';
import { STREET, placeName, type ActorId } from '@/lib/street';
import type { PublicVisitAction } from '@/lib/fate-public-places';
import { FateCityScenery } from './fate-city-scenery';
import styles from './fate-district-map.module.css';

export function DistrictAtlas({
  life,
  active,
  onClose,
  onSelect,
  onFind,
}: {
  life: DailyLife;
  active: ActorId;
  onClose: () => void;
  onSelect: (landmark: DistrictLandmark) => void;
  onFind: (id: PartnerId) => void;
}) {
  return (
    <aside className={styles.atlas} aria-label="冬木市地图与人物定位">
      <header>
        <div>
          <small>FUYUKI CITY</small>
          <h2>冬木市地图</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭冬木市地图">
          <X size={18} />
        </button>
      </header>
      <div className={styles.miniature}>
        <FateCityScenery miniature period={lifePeriod(life.minutes)} />
        <svg
          viewBox={`0 0 ${STREET.width} ${STREET.height}`}
          className={styles.dots}
          aria-hidden="true"
        >
          {Object.entries(life.positions).map(([id, p]) => (
            <circle
              key={id}
              cx={p.x}
              cy={p.y}
              r={id === active ? 16 : 8}
              fill={id === active ? '#a4603d' : '#294f4c'}
              stroke="#fff7df"
              strokeWidth="3"
            />
          ))}
        </svg>
      </div>
      <p className={styles.legend}>
        <span /> 当前人物 <i /> 城市居民 · 含室内
      </p>
      <div className={styles.scroll}>
        <h3>
          <MapPin size={15} /> 地点 <span>{DISTRICT_LANDMARKS.length}</span>
        </h3>
        <div className={styles.places}>
          {DISTRICT_LANDMARKS.map((place) => (
            <button
              type="button"
              key={place.id}
              onClick={() => onSelect(place)}
            >
              <span>{place.name}</span>
              <small>
                {place.kind === 'home'
                  ? '住宅'
                  : place.kind === 'park'
                    ? '散步'
                    : '公共地点'}
              </small>
            </button>
          ))}
        </div>
        <h3>
          <Users size={15} /> 居民 <span>{STREET_PARTNERS.length}</span>
        </h3>
        <div className={styles.people}>
          {STREET_PARTNERS.map((id) => {
            const home = occupiedHome(life, id);
            return (
              <button
                type="button"
                key={id}
                onClick={() => onFind(id)}
                aria-label={`定位${fatePerson(id, life.waverStage)!.name}`}
              >
                <Navigation size={14} />
                <span>
                  <strong>{fatePerson(id, life.waverStage)!.name}</strong>
                  <small>
                    {home
                      ? FATE_HOMES[home].name
                      : placeName(life.positions[id])}
                  </small>
                  <em>{lifeStatus(life.people[id])}</em>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export function DistrictPlaceCard({
  place,
  control,
  traveler,
  arrived,
  onWalk,
  onTeleport,
  onVisit,
  onEnter,
  onEnterBuilding,
  onPublicAction,
  activity,
  shopLabel,
  shopAffordable,
  notice,
  onClose,
}: {
  place: DistrictLandmark;
  control: boolean;
  traveler: string;
  arrived: boolean;
  onWalk: () => void;
  onTeleport: () => void;
  onVisit: (home: HomeId) => void;
  onEnter: (home: HomeId) => void;
  onEnterBuilding?: () => void;
  onPublicAction: (action: PublicVisitAction, target?: PartnerId) => void;
  activity?: ReactNode;
  shopLabel: string | null;
  shopAffordable: boolean;
  notice: string;
  onClose: () => void;
}) {
  return (
    <section
      className={styles.placeCard}
      aria-label={`地点详情：${place.name}`}
    >
      <button
        type="button"
        className={styles.dismiss}
        onClick={onClose}
        aria-label="关闭地点详情"
      >
        <X size={16} />
      </button>
      <small>
        {place.kind === 'home'
          ? '住宅入口'
          : place.kind === 'park'
            ? '河岸公园'
            : '公共地点'}
      </small>
      <h2>{place.name}</h2>
      <Image
        className={styles.placeIllustration}
        src={formalPlaceImage(place)}
        alt={`${place.name}的近景插画`}
        width={600}
        height={338}
        sizes="(max-width: 800px) 260px, 280px"
      />
      <p>
        {place.kind === 'home'
          ? '观察屋里的日常，或沿道路走到门前。'
          : place.id === 'school'
            ? '居民按作息从这里进入学园。'
            : place.id === 'park'
              ? '在林荫路边散步，也可以约朋友相见。'
              : '居民会来这里用餐、阅读或购买日用品。'}
      </p>
      <div>
        {onEnterBuilding && control && arrived && (
          <button type="button" onClick={onEnterBuilding}>
            进入{place.name}
          </button>
        )}
        {place.kind === 'home' && (
          <>
            <button type="button" onClick={() => onVisit(place.id as HomeId)}>
              观察住宅
            </button>
            {control && arrived && (
              <button type="button" onClick={() => onEnter(place.id as HomeId)}>
                进入住宅
              </button>
            )}
          </>
        )}
        <button type="button" onClick={control && arrived ? onClose : onWalk}>
          {control
            ? arrived
              ? '回到街区'
              : '沿街前往'
            : `控制${traveler}沿街前往`}
        </button>
        <button
          type="button"
          onClick={onTeleport}
          disabled={!control}
          title={control ? `传送到${place.name}` : '先进入角色，再选择传送地点'}
        >
          传送到这里
        </button>
      </div>
      {place.kind !== 'home' && (
        <div className={styles.publicVisit}>
          <strong>到场活动</strong>
          {activity ??
            (control && arrived ? (
              <>
                {place.id === 'school' && (
                  <button type="button" onClick={() => onPublicAction('study')}>
                    在学园自习
                  </button>
                )}
                {place.id === 'shops' && (
                  <button
                    type="button"
                    disabled={!shopLabel || !shopAffordable}
                    onClick={() => onPublicAction('shop')}
                  >
                    {shopLabel
                      ? shopAffordable
                        ? shopLabel
                        : `${shopLabel} · 生活点不足`
                      : '随身用品已足'}
                  </button>
                )}
              </>
            ) : (
              <span>先进入角色，沿街走到地点附近即可互动。</span>
            ))}
          {notice && <output>{notice}</output>}
        </div>
      )}
      {!control && (
        <p className={styles.tip}>
          将控制{traveler}，镜头会跟随其沿连续道路前往。
        </p>
      )}
    </section>
  );
}
