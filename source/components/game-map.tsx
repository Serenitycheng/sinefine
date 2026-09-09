'use client';
import { memo, useState } from 'react';
import {
  Sun,
  CloudRain,
  Sparkles,
  Minus,
  Plus,
  Focus,
  MapPin,
} from 'lucide-react';
import { type World, PLACES, dateText, clockText } from '@/lib/world';
export function Sprite({
  index,
  className = '',
}: {
  index: number;
  className?: string;
}) {
  return (
    <span
      className={`sprite ${className}`}
      style={{
        backgroundPosition: `${((index % 4) * 100) / 3}% ${(Math.floor((index % 16) / 4) * 100) / 3}%`,
      }}
    />
  );
}
export const GameMap = memo(function GameMap({
  world,
  selected,
  onSelect,
  zoom,
  setZoom,
  following,
  setFollowing,
}: {
  world: World;
  selected: string;
  onSelect: (id: string) => void;
  zoom: number;
  setZoom: (n: number) => void;
  following: boolean;
  setFollowing: (b: boolean) => void;
}) {
  const [labels, setLabels] = useState(true),
    person = world.residents.find((p) => p.id === selected),
    hour = Math.floor(world.minutes / 60) % 24,
    night = hour < 6 || hour >= 19;
  const alive = world.residents.filter((p) => p.alive);
  return (
    <div className="map-frame">
      <div className="map-top">
        <span>
          {world.weather === '小雨' ? (
            <CloudRain size={16} />
          ) : world.weather === '星辉' ? (
            <Sparkles size={16} />
          ) : (
            <Sun size={16} />
          )}{' '}
          {world.weather} · {night ? '夜晚' : '白昼'}
        </span>
        <span>
          {dateText(world.minutes)}
          <b>{clockText(world.minutes)}</b>
        </span>
      </div>
      <div
        className={`map-view ${night ? 'night' : ''} ${world.weather === '星辉' ? 'starlit' : ''}`}
      >
        <div
          className="map-layer"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin:
              following && person ? `${person.x}% ${person.y}%` : '50% 50%',
          }}
        >
          <img
            className="town-map"
            src="/town.png"
            alt="微光街区：住宅、学舍、商店、公园、诊所与龙息庭院"
            draggable={false}
          />
          {labels &&
            PLACES.filter((p) =>
              ['park', 'academy', 'cafe', 'garden'].includes(p.id),
            ).map((p) => (
              <span
                key={p.id}
                className="place-label"
                style={{ left: `${p.x}%`, top: `${p.y - 9}%` }}
              >
                {p.name}
              </span>
            ))}
          {alive.map((p) => (
            <button
              key={p.id}
              className={`resident-dot ${p.focus ? 'focused' : ''} ${p.id === selected ? 'selected' : ''} ${p.age < 18 ? 'young' : ''}`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                zIndex:
                  p.id === selected
                    ? 220
                    : Math.round(p.y) + (p.focus ? 100 : 0),
              }}
              onClick={() => onSelect(p.id)}
              aria-label={`观察${p.name}，${p.action}`}
              title={`${p.name} · ${Math.floor(p.age)}岁 · ${p.action}`}
            >
              <Sprite index={p.sprite} className="tiny-sprite" />
              {p.id === selected && (
                <span className="name-tag">
                  {p.name}
                  {!p.alive ? ' · 已故' : ''}
                </span>
              )}
              {world.special.active &&
                world.special.participants.includes(p.id) && (
                  <span className="event-spark">✦</span>
                )}
            </button>
          ))}
          {world.weather === '小雨' && <div className="rain-overlay" />}
        </div>
        {following && person && (
          <span className="following-badge">
            <Focus size={12} />
            跟随 {person.name}
          </span>
        )}
      </div>
      <div className="map-bottom">
        <span>
          <i className="legend-dot" />
          重点 <b>{alive.filter((p) => p.focus).length}</b>
          <i className="legend-dot background" />
          居民 <b>{alive.length}</b>
        </span>
        <div className="map-tools">
          <button
            onClick={() => setLabels(!labels)}
            aria-label={labels ? '隐藏地点名称' : '显示地点名称'}
            title="地点名称"
          >
            <MapPin size={15} />
          </button>
          <button
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            disabled={zoom <= 1}
            aria-label="缩小地图"
          >
            <Minus size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
            disabled={zoom >= 2.5}
            aria-label="放大地图"
          >
            <Plus size={16} />
          </button>
          <button
            className={following ? 'tool-active' : ''}
            onClick={() => {
              setFollowing(!following);
              if (!following) setZoom(1.75);
            }}
            aria-label={following ? '停止跟随居民' : '跟随所选居民'}
          >
            <Focus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
