'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Pause,
  Play,
  Globe2,
  Sparkles,
  Users,
  BookOpen,
  Settings2,
  ChevronDown,
  Clock3,
  ArrowUpRight,
  Save,
  ScrollText,
  Orbit,
  Search,
  Plus,
  FastForward,
  Check,
  ChevronsRight,
} from 'lucide-react';
import { useWorld } from '@/hooks/use-world';
import {
  type EventKind,
  type LifeEvent,
  type World,
  dateText,
  clockText,
} from '@/lib/world';
import { GameMap, Sprite } from '@/components/game-map';
import { ResidentPanel } from '@/components/resident-panel';
import { WorldDialog, Choice, type Modal } from '@/components/world-dialogs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
export default function Home() {
  const ctx = useWorld(),
    { world, playing, setPlaying, speed, setSpeed } = ctx;
  const [selected, setSelected] = useState(world.residents[0].id),
    [view, setView] = useState<'map' | 'residents' | 'history'>('map'),
    [modal, setModal] = useState<Modal>(null),
    [zoom, setZoom] = useState(1),
    [following, setFollowing] = useState(false),
    [query, setQuery] = useState(''),
    [roster, setRoster] = useState('focus'),
    [category, setCategory] = useState('全部'),
    [important, setImportant] = useState(false),
    [historyLimit, setHistoryLimit] = useState(60);
  const person =
      world.residents.find((p) => p.id === selected) || world.residents[0],
    alive = world.residents.filter((p) => p.alive),
    focused = alive.filter((p) => p.focus);
  const open = useCallback(
    (m: Modal) => {
      setPlaying(false);
      setModal(m);
    },
    [setPlaying],
  );
  const select = useCallback((id: string) => setSelected(id), []);
  const apiRef = useRef({ ctx, select, setView });
  apiRef.current = { ctx, select, setView };
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const add = (tool: unknown) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {}
    };
    add({
      name: 'read_lumen_world',
      title: '查看微光街区',
      description: '读取当前世界时间、重点居民和最近重要事件，不修改世界。',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw Error('此工具不接受额外参数。');
        const w = apiRef.current.ctx.worldRef.current;
        return {
          time: dateText(w.minutes) + ' ' + clockText(w.minutes),
          residents: w.residents
            .filter((p) => p.focus)
            .map((p) => ({
              id: p.id,
              name: p.name,
              age: Math.floor(p.age),
              alive: p.alive,
              action: p.action,
            })),
          events: w.events
            .filter((e) => e.important)
            .slice(0, 8)
            .map((e) => e.text),
        };
      },
    });
    add({
      name: 'inspect_lumen_resident',
      title: '观察一位居民',
      description: '按居民id选择人物并打开街区观察视图，不改变人物行为。',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: unknown) => {
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).some((k) => k !== 'id')
        )
          throw Error('只接受居民id。');
        const id = (input as { id?: unknown })?.id;
        if (typeof id !== 'string') throw Error('需要居民id。');
        const p = apiRef.current.ctx.worldRef.current.residents.find(
          (p) => p.id === id,
        );
        if (!p) throw Error('居民不存在。');
        apiRef.current.select(id);
        apiRef.current.setView('map');
        await new Promise((r) => requestAnimationFrame(r));
        return { id: p.id, name: p.name, goal: p.goal, action: p.action };
      },
    });
    return () => life.abort();
  }, []);
  const shownResidents = world.residents.filter(
    (p) =>
      (roster === 'all' ||
        (roster === 'focus' && p.focus) ||
        (roster === 'background' && !p.focus) ||
        (roster === 'departed' && !p.alive)) &&
      (roster === 'departed' || p.alive) &&
      `${p.name} ${p.job} ${p.traits.join(' ')}`.includes(query),
  );
  const history = world.events.filter(
    (e) =>
      (category === '全部' || e.kind === category) &&
      (!important || e.important) &&
      (!query || e.text.includes(query)),
  );
  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={22} />
          </div>
          <div>
            <strong>无中之庭</strong>
            <small>SINE FINE</small>
          </div>
          <span className="alpha">初生世界</span>
        </div>
        <button className="world-picker" onClick={() => open('worlds')}>
          <Globe2 size={16} />
          现代魔法世界
          <ChevronDown size={14} />
        </button>
        <div className="top-actions">
          <Link href="/fate/street" className="street-entry">走进冬木街道 <ArrowUpRight size={15}/></Link>
          <button
            className="connection-button"
            onClick={() => open('settings')}
          >
            <span className="mode-dot">
              {ctx.ai.enabled && ctx.ai.connected && speed <= 4
                ? 'AI 自主生活'
                : '本地模拟'}
            </span>
            <Settings2 size={14} />
          </button>
          <button
            className="icon-button"
            aria-label="保存与存档"
            onClick={() => open('save')}
          >
            <Save size={18} />
          </button>
        </div>
      </header>
      <SidebarProvider className="workspace">
        <Sidebar collapsible="none" className="rail">
          <SidebarContent>
            <SidebarMenu>
              {[
                { id: 'map', icon: Globe2, label: '街区' },
                { id: 'residents', icon: Users, label: '居民' },
                { id: 'history', icon: BookOpen, label: '故事' },
              ].map(({ id, icon: Icon, label }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    className={`rail-btn ${view === id ? 'active' : ''}`}
                    onClick={() => {
                      setView(id as typeof view);
                      setQuery('');
                    }}
                    title={label}
                    aria-label={label}
                    isActive={view === id}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="rail-divider" />
            <SidebarMenu>
              {[
                { id: 'rules', icon: ScrollText, label: '规则' },
                { id: 'special', icon: Orbit, label: '设定' },
              ].map(({ id, icon: Icon, label }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    className="rail-btn"
                    onClick={() => open(id as Modal)}
                    title={label}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <button
              className="rail-btn"
              onClick={() => open('settings')}
              title="设置"
            >
              <Settings2 />
              <span>设置</span>
            </button>
          </SidebarFooter>
        </Sidebar>
        <section className="world-column">
          <div className="world-heading">
            <div>
              <div className="eyebrow">
                WORLD 001 /{' '}
                {view === 'map'
                  ? '正在观察'
                  : view === 'residents'
                    ? '街区居民'
                    : '世界编年史'}
              </div>
              <h1>
                {view === 'map'
                  ? '生活，自有它的走向'
                  : view === 'residents'
                    ? '每个人，都有自己的故事'
                    : '后来，发生了这些事'}
                <span className="live-dot" />
              </h1>
            </div>
            <button
              className="gold-button"
              onClick={() => open(view === 'residents' ? 'add' : 'intervene')}
            >
              {view === 'residents' ? (
                <Plus size={16} />
              ) : (
                <Sparkles size={16} />
              )}{' '}
              {view === 'residents' ? '加入居民' : '介入世界'}
            </button>
          </div>
          {view === 'map' ? (
            <>
              <GameMap
                world={world}
                selected={person.id}
                onSelect={select}
                zoom={zoom}
                setZoom={setZoom}
                following={following}
                setFollowing={setFollowing}
              />
              <div className="time-bar">
                <div className="time-controls">
                  <button
                    className="play-button"
                    disabled={!ctx.ready || ctx.progress !== null}
                    onClick={() => setPlaying(!playing)}
                    aria-label={playing ? '暂停世界' : '开始世界'}
                    title="空格键暂停 / 继续"
                  >
                    {playing ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                  {[1, 4, 24].map((n) => (
                    <button
                      key={n}
                      className={speed === n ? 'speed active' : 'speed'}
                      onClick={() => setSpeed(n)}
                      aria-label={`${n}倍速度`}
                    >
                      {n}×
                    </button>
                  ))}
                  <span className="time-divider" />
                  <span className="muted">
                    <Clock3 size={15} />
                    {playing ? '时间正在流动' : '世界已暂停'}
                  </span>
                </div>
                <button className="text-button" onClick={() => open('time')}>
                  <FastForward size={15} />
                  时间远行
                </button>
              </div>
              {world.special.active && (
                <button
                  className="active-event"
                  onClick={() => open('special')}
                >
                  <Orbit size={17} />
                  <b>{world.special.name}</b>
                  <span>
                    {world.special.count} 位参与者 · 第
                    {Math.floor((world.minutes - world.special.start) / 1440) +
                      1}
                    天
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              )}
              <section className="timeline-preview">
                <div className="section-title">
                  <h2>
                    <span className="live-dot" />
                    街区此刻
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => {
                      setView('history');
                      setQuery('');
                    }}
                  >
                    所有故事 <ArrowUpRight size={13} />
                  </button>
                </div>
                {world.events.slice(0, 4).map((e) => (
                  <FeedRow
                    key={e.id}
                    event={e}
                    select={(id) => setSelected(id)}
                  />
                ))}
              </section>
              <div className="world-status">
                <span>
                  <Check size={12} />
                  {ctx.saving}
                </span>
                <span>
                  食物 {Math.floor(world.food)} · 组织{' '}
                  {world.organizations.length} · 新生 {world.stats.births}
                </span>
              </div>
            </>
          ) : view === 'residents' ? (
            <>
              <div className="content-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="搜索居民"
                    placeholder="寻找名字、职业或性格…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Choice
                  label="居民类别"
                  value={roster}
                  onChange={setRoster}
                  options={[
                    { value: 'focus', label: `重点居民 · ${focused.length}` },
                    { value: 'all', label: `全体在世 · ${alive.length}` },
                    { value: 'background', label: '背景居民' },
                    { value: 'departed', label: '已故居民' },
                  ]}
                />
              </div>
              <div className="resident-grid">
                {shownResidents.slice(0, 200).map((p) => (
                  <button
                    className={`resident-card ${p.id === person.id ? 'selected' : ''}`}
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                  >
                    <div className="resident-card-art">
                      <Sprite index={p.sprite} className="card-portrait" />
                      {p.focus && <span>★</span>}
                    </div>
                    <div>
                      <h3>{p.name}</h3>
                      <p>
                        {Math.floor(p.age)} 岁 · {p.job}
                      </p>
                      <small>
                        {p.alive ? p.action : '故事已落幕'} · {p.school}系
                      </small>
                      <div className="trait-row">
                        {p.traits.map((t, i) => (
                          <span key={i}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {!shownResidents.length && (
                <p className="empty-message">没有找到符合条件的居民。</p>
              )}
            </>
          ) : (
            <>
              <div className="content-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="搜索世界事件"
                    placeholder="搜索人物、事件或关键词…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHistoryLimit(60);
                    }}
                  />
                </div>
                <Choice
                  label="事件类别"
                  value={category}
                  onChange={(v) => {
                    setCategory(v);
                    setHistoryLimit(60);
                  }}
                  options={[
                    '全部',
                    '日常',
                    '关系',
                    '魔法',
                    '人生',
                    '世界',
                    '特殊事件',
                  ].map((v) => ({ value: v, label: v }))}
                />
              </div>
              <label className="history-filter">
                <Switch
                  checked={important}
                  onCheckedChange={setImportant}
                  aria-label="只看重要事件"
                />
                只看重要事件<span>{history.length} 条记录</span>
              </label>
              <div className="chronicle">
                {history.slice(0, historyLimit).map((e) => (
                  <FeedRow key={e.id} event={e} fullDate select={select} />
                ))}
              </div>
              {history.length > historyLimit && (
                <button
                  className="soft-button load-more"
                  onClick={() => setHistoryLimit((n) => n + 60)}
                >
                  继续翻阅 <ChevronDown size={15} />
                </button>
              )}
              {!history.length && (
                <p className="empty-message">这段故事还没有发生。</p>
              )}
              {world.archiveCount > 0 && (
                <p className="panel-hint">
                  已有 {world.archiveCount}{' '}
                  条较早记录被压缩。定期导出存档可以保留不同阶段的完整快照。
                </p>
              )}
              <div className="society-section">
                <div className="section-title">
                  <h2>自行形成的组织</h2>
                  <span className="muted">{world.organizations.length}</span>
                </div>
                {world.organizations.length ? (
                  world.organizations.map((o) => (
                    <div className="organization" key={o.id}>
                      <h3>{o.name}</h3>
                      <p>{o.purpose}</p>
                      <small>
                        {o.members
                          .map(
                            (id) =>
                              world.residents.find((p) => p.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                  ))
                ) : (
                  <p className="panel-hint">
                    当居民有了共同兴趣、足够的信任与能力，可能会提出建立组织。
                  </p>
                )}
              </div>
            </>
          )}
        </section>
        <ResidentPanel
          key={person.id}
          person={person}
          world={world}
          onSelect={select}
          onEdit={() => open('person')}
          onFollow={() => ctx.follow(person.id, !person.focus)}
          onTrack={() => {
            setView('map');
            setFollowing(true);
            setZoom(1.75);
          }}
          onAi={() => void ctx.runAi(person)}
          busy={ctx.busy}
          aiReady={ctx.ai.connected}
        />
      </SidebarProvider>
      <WorldDialog
        key={`${modal}-${modal === 'person' ? person.id : ''}`}
        modal={modal}
        close={() => setModal(null)}
        ctx={ctx}
        person={person}
        onCreated={(id) => {
          setSelected(id);
          setView('map');
        }}
      />
      <Dialog open={ctx.progress !== null} onOpenChange={() => {}}>
        <DialogContent
          className="world-dialog compact-dialog"
          showCloseButton={false}
        >
          <DialogTitle>时间正在远行</DialogTitle>
          <DialogDescription>
            居民的生活会逐日推进，可以随时在当前进度停下。
          </DialogDescription>
          <Progress
            value={(ctx.progress || 0) * 100}
            aria-label="时间推进进度"
          />
          <div className="progress-bottom">
            <span>{Math.round((ctx.progress || 0) * 100)}%</span>
            <button className="soft-button" onClick={ctx.cancelFast}>
              在这里停下
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!ctx.recap}
        onOpenChange={(o) => {
          if (!o) ctx.setRecap(null);
        }}
      >
        <DialogContent className="world-dialog">
          <DialogTitle>在你远望的这段时间</DialogTitle>
          <DialogDescription>
            {ctx.recap
              ? `${dateText(ctx.recap.from, true)} → ${dateText(ctx.recap.to, true)}${ctx.recap.stopped ? ' · 已在途中停下' : ''}`
              : ''}
          </DialogDescription>
          {ctx.recap && (
            <div className="dialog-body">
              <div className="recap-stats">
                <div>
                  <strong>
                    {Math.floor((ctx.recap.to - ctx.recap.from) / 1440)}
                  </strong>
                  <span>天过去了</span>
                </div>
                <div>
                  <strong>{ctx.recap.births}</strong>
                  <span>新生命</span>
                </div>
                <div>
                  <strong>{ctx.recap.deaths}</strong>
                  <span>离别</span>
                </div>
              </div>
              {ctx.recap.important.length ? (
                ctx.recap.important
                  .map((id) => world.events.find((e) => e.id === id))
                  .filter(Boolean)
                  .map((e) => (
                    <div className="memory-card" key={e!.id}>
                      <small>
                        {dateText(e!.time, true)} · {e!.kind}
                      </small>
                      <p>{e!.text}</p>
                    </div>
                  ))
              ) : (
                <p className="empty-message">
                  这段时间平静地过去了。日常经历已记入世界编年史。
                </p>
              )}
              <button
                className="gold-button"
                onClick={() => {
                  ctx.setRecap(null);
                  setView('history');
                  setQuery('');
                }}
              >
                翻阅这段故事 <ArrowRightIcon />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {ctx.notice && (
        <div className="toast-message" role="status">
          <Sparkles size={17} />
          <span>{ctx.notice}</span>
        </div>
      )}
    </main>
  );
}
function ArrowRightIcon() {
  return <ChevronsRight size={16} />;
}
function FeedRow({
  event: e,
  select,
  fullDate = false,
}: {
  event: LifeEvent;
  select: (id: string) => void;
  fullDate?: boolean;
}) {
  return (
    <div className={`feed-row ${e.important ? 'important' : ''}`}>
      <time>
        {fullDate ? (
          <>
            {dateText(e.time, true)}
            <br />
            {clockText(e.time)}
          </>
        ) : (
          clockText(e.time)
        )}
      </time>
      <span className={`event-category kind-${e.kind}`}>{e.kind}</span>
      <p>
        {e.text}
        {e.source === 'ai' && <small className="ai-label">AI</small>}
      </p>
      {e.people.length > 0 ? (
        <button
          className="icon-button"
          onClick={() => select(e.people[0])}
          aria-label="查看相关居民"
        >
          <ArrowUpRight size={14} />
        </button>
      ) : (
        <span className="feed-spacer" />
      )}
    </div>
  );
}
