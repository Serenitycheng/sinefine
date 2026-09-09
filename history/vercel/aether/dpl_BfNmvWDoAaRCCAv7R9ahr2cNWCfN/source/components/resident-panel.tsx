'use client';
import {
  Sparkles,
  Heart,
  Leaf,
  Focus,
  Pencil,
  Star,
  ArrowUpRight,
} from 'lucide-react';
import { type World, type Resident, PLACES, dateText } from '@/lib/world';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sprite } from './game-map';
export function ResidentPanel({
  person: p,
  world,
  onSelect,
  onEdit,
  onFollow,
  onTrack,
  onAi,
  busy,
  aiReady,
}: {
  person: Resident;
  world: World;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onFollow: () => void;
  onTrack: () => void;
  onAi: () => void;
  busy: boolean;
  aiReady: boolean;
}) {
  const friends = Object.entries(p.relations)
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({
      p: world.residents.find((q) => q.id === id),
      value,
    }))
    .filter((x) => x.p)
    .slice(0, 12);
  const memories = p.memories
    .map((id) => world.events.find((e) => e.id === id))
    .filter(Boolean);
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span>一个人的世界</span>
        <button
          className="icon-button"
          onClick={onEdit}
          aria-label="编辑人物设定"
        >
          <Pencil size={15} />
        </button>
      </div>
      <div className="profile-cover">
        <Sprite index={p.sprite} className="portrait" />
      </div>
      <div className="profile-body">
        <div className="person-name">
          <h2>{p.name}</h2>
          <button
            className={`focus-tag ${p.focus ? 'is-focus' : ''}`}
            onClick={onFollow}
          >
            {p.focus ? '★ 重点观察' : '☆ 加入观察'}
          </button>
        </div>
        <p className="muted">
          {Math.floor(p.age)} 岁 · {p.job} · {p.school}系
          {!p.alive ? ' · 已故' : ''}
        </p>
        <div className="trait-row">
          {p.traits.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="profile-actions">
          <button className="soft-button" onClick={onTrack} disabled={!p.alive}>
            <Focus size={14} />
            跟随
          </button>
          <button
            className="soft-button"
            onClick={onAi}
            disabled={!p.alive || !p.focus || busy || !aiReady}
            title={!aiReady ? '先在设置中连接 DeepSeek' : ''}
          >
            <Sparkles size={14} />
            {busy ? '思考中…' : 'AI 决定'}
          </button>
        </div>
        <Tabs defaultValue="now" className="profile-tabs">
          <TabsList>
            <TabsTrigger value="now">此刻</TabsTrigger>
            <TabsTrigger value="relations">关系</TabsTrigger>
            <TabsTrigger value="memories">经历</TabsTrigger>
          </TabsList>
          <TabsContent value="now">
            <div className="thought">
              <Sparkles size={15} />
              <p>“{p.alive ? p.thought : '我的故事，已经留在了这里。'}”</p>
              <small>
                决策理由 · {p.source === 'ai' ? 'DeepSeek' : '本地模拟'}
              </small>
            </div>
            <div className="needs-grid">
              {[
                ['健康', p.health],
                ['精力', p.energy],
                ['饱腹', p.hunger],
                ['心情', p.mood],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>
                    {label}
                    <b>{Math.round(Number(value))}</b>
                  </span>
                  <div className="meter">
                    <i
                      style={{
                        width: `${value}%`,
                        background: Number(value) < 25 ? '#e59683' : undefined,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="status-line">
              <span>
                <Leaf size={15} />
                魔法 · {p.school}
              </span>
              <b>
                {Math.floor(p.magic)} 级 / 天赋 {Math.round(p.talent)}
              </b>
            </div>
            <div className="meter magic">
              <i style={{ width: `${p.magic}%` }} />
            </div>
            <div className="mini-stats">
              <span>
                资产 <b>{Math.floor(p.money)} 星币</b>
              </span>
              <span>
                魔力 <b>{Math.round(p.mana)}</b>
              </span>
            </div>
            <div className="profile-section">
              <h3>正在做什么</h3>
              <p>
                <span className="live-dot" />
                {p.alive
                  ? `${p.action} · ${PLACES.find((x) => x.id === p.target)?.name}`
                  : `于${dateText(p.death || 0, true)}离世`}
              </p>
            </div>
            <div className="profile-section">
              <h3>想要的生活</h3>
              <p>{p.goal}</p>
            </div>
            <div className="profile-section">
              <h3>故事的开头</h3>
              <p className="muted">{p.backstory}</p>
            </div>
            {p.belief > 0 && (
              <div className="profile-section">
                <h3>关于你的存在</h3>
                <p>
                  {p.belief > 60
                    ? '相信街区受到某种存在的影响。'
                    : p.belief > 30
                      ? '正在寻找那些异常变化之间的联系。'
                      : '注意到一些难以解释的巧合。'}
                </p>
              </div>
            )}
            {p.dragon > 0 && (
              <div className="profile-section">
                <h3>与龙的关系</h3>
                <p>
                  {p.dragon >= 60 ? '获得了幼龙的信任' : '正在慢慢建立信任'} ·{' '}
                  {Math.round(p.dragon)} / 100
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="relations">
            <div className="profile-section">
              <h3>家庭</h3>
              {!p.partner && !p.parents.length && !p.children.length ? (
                <p className="muted">新的联系还在生活中形成。</p>
              ) : (
                <div className="family-list">
                  {[
                    ...(p.partner ? [{ id: p.partner, label: '伴侣' }] : []),
                    ...p.parents.map((id) => ({ id, label: '父母' })),
                    ...p.children.map((id) => ({ id, label: '子女' })),
                  ].map(({ id, label }) => {
                    const q = world.residents.find((q) => q.id === id);
                    return q ? (
                      <button
                        className="relation-row"
                        key={`${label}${id}`}
                        onClick={() => onSelect(id)}
                      >
                        <span>{label}</span>
                        <b>
                          {q.name}
                          {!q.alive ? ' · 已故' : ''}
                        </b>
                        <ArrowUpRight size={13} />
                      </button>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div className="profile-section">
              <h3>相识的人</h3>
              {friends.length ? (
                friends.map(({ p: q, value }) => (
                  <button
                    className="relation-card"
                    key={q!.id}
                    onClick={() => onSelect(q!.id)}
                  >
                    <Sprite index={q!.sprite} className="small-portrait" />
                    <span>
                      <b>{q!.name}</b>
                      <small>
                        {value > 65
                          ? '亲密'
                          : value > 35
                            ? '朋友'
                            : value < 0
                              ? '有些隔阂'
                              : '相识'}
                        {!q!.alive ? ' · 已故' : ''}
                      </small>
                    </span>
                    <span className={value < 0 ? 'negative' : 'positive'}>
                      {Math.round(value)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="muted">还没有记录到熟悉的人。</p>
              )}
            </div>
            {world.organizations
              .filter((o) => o.members.includes(p.id))
              .map((o) => (
                <div className="profile-section" key={o.id}>
                  <h3>{o.name}</h3>
                  <p>{o.purpose}</p>
                </div>
              ))}
          </TabsContent>
          <TabsContent value="memories">
            <p className="panel-hint">
              保留最近经历与重要人生记录。完整世界事件可在编年史中回看。
            </p>
            {memories.length ? (
              memories.slice(0, 35).map((e) => (
                <div className="memory-card" key={e!.id}>
                  <small>
                    {dateText(e!.time, true)} · {e!.kind}
                  </small>
                  <p>{e!.text}</p>
                  {e!.source === 'ai' && <span className="ai-label">AI</span>}
                </div>
              ))
            ) : (
              <p className="empty-message">故事才刚刚开始。</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
