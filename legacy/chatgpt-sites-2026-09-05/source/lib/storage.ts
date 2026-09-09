import { type World, PLACES, DEFAULT_RULES } from './world';
import { validatePatch } from './rules';
const SAVE_KEY = 'lumen-world-v1',
  SNAPSHOT_KEY = 'lumen-snapshots-v1';
function object(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
function strings(x: unknown, max = 500) {
  return (
    Array.isArray(x) &&
    x.length <= max &&
    x.every((s) => typeof s === 'string' && s.length <= 2500)
  );
}
function number(x: unknown, min = -Infinity, max = Infinity) {
  return typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
}
export function validateWorld(data: unknown): World {
  if (
    !object(data) ||
    data.version !== 1 ||
    !number(data.minutes, 0, 1440 * 360 * 10000) ||
    !number(data.seed, 0, 4294967295) ||
    !number(data.nextId, 1) ||
    !Array.isArray(data.residents) ||
    data.residents.length > 2000 ||
    !data.residents.length ||
    !Array.isArray(data.events) ||
    data.events.length > 5000 ||
    !object(data.rules) ||
    !Array.isArray(data.organizations) ||
    !Array.isArray(data.ruleHistory) ||
    !object(data.special) ||
    !object(data.stats)
  )
    throw Error('这不是有效的微光街区存档，原世界未改动。');
  const ids = new Set<string>();
  for (const p of data.residents) {
    if (!object(p)) throw Error('居民资料损坏。');
    for (const key of [
      'id',
      'name',
      'job',
      'backstory',
      'goal',
      'thought',
      'school',
      'home',
      'target',
      'action',
    ])
      if (typeof p[key] !== 'string' || (p[key] as string).length > 3000)
        throw Error('居民文字资料损坏。');
    if (ids.has(p.id as string)) throw Error('居民编号重复。');
    ids.add(p.id as string);
    for (const key of [
      'age',
      'health',
      'energy',
      'hunger',
      'mood',
      'mana',
      'money',
      'talent',
      'magic',
      'empathy',
      'ambition',
      'curiosity',
      'x',
      'y',
      'born',
      'belief',
      'dragon',
      'lastBirth',
      'sprite',
    ])
      if (!number(p[key], -1e10, 1e12)) throw Error('居民状态资料损坏。');
    if (
      typeof p.alive !== 'boolean' ||
      typeof p.focus !== 'boolean' ||
      !['local', 'ai'].includes(String(p.source)) ||
      !strings(p.traits, 10) ||
      !strings(p.memories) ||
      !strings(p.parents, 4) ||
      !strings(p.children, 300) ||
      !object(p.relations) ||
      Object.values(p.relations).some((v) => !number(v, -100, 100)) ||
      !PLACES.some((x) => x.id === p.target) ||
      !PLACES.some((x) => x.id === p.home) ||
      !['女', '男'].includes(String(p.sex))
    )
      throw Error('居民关系或行为资料损坏。');
    if (
      p.route !== undefined &&
      (!Array.isArray(p.route) ||
        p.route.length > 100 ||
        p.route.some(
          (q) => !object(q) || !number(q.x, 0, 100) || !number(q.y, 0, 100),
        ))
    )
      throw Error('居民位置资料损坏。');
  }
  const eventIds = new Set();
  for (const e of data.events) {
    if (
      !object(e) ||
      typeof e.id !== 'string' ||
      eventIds.has(e.id) ||
      typeof e.text !== 'string' ||
      e.text.length > 5000 ||
      !number(e.time, 0) ||
      !strings(e.people, 500) ||
      !['日常', '关系', '魔法', '人生', '世界', '特殊事件'].includes(
        String(e.kind),
      ) ||
      !['local', 'ai', 'user'].includes(String(e.source)) ||
      typeof e.important !== 'boolean'
    )
      throw Error('事件记录损坏。');
    eventIds.add(e.id);
  }
  validatePatch(data.rules);
  for (const key of Object.keys(DEFAULT_RULES))
    if (!Object.hasOwn(data.rules, key)) throw Error('规则资料不完整。');
  const s = data.special;
  if (
    typeof s.name !== 'string' ||
    typeof s.description !== 'string' ||
    !number(s.count, 2, 20) ||
    !number(s.duration, 1, 360) ||
    !number(s.reward, 0, 10000) ||
    !number(s.minMagic, 0, 100) ||
    !number(s.start, 0) ||
    !strings(s.participants, 20) ||
    !object(s.scores) ||
    Object.values(s.scores).some((v) => !number(v, 0)) ||
    typeof s.active !== 'boolean' ||
    typeof s.finished !== 'boolean' ||
    !['研究', '合作', '竞技'].includes(String(s.objective))
  )
    throw Error('特殊事件资料损坏。');
  for (const o of data.organizations)
    if (
      !object(o) ||
      typeof o.id !== 'string' ||
      typeof o.name !== 'string' ||
      typeof o.purpose !== 'string' ||
      typeof o.founder !== 'string' ||
      !strings(o.members, 500) ||
      !number(o.time, 0)
    )
      throw Error('组织资料损坏。');
  for (const r of data.ruleHistory) {
    if (
      !object(r) ||
      typeof r.id !== 'string' ||
      typeof r.text !== 'string' ||
      !number(r.time, 0)
    )
      throw Error('规则历史损坏。');
    validatePatch(r.patch);
  }
  if (
    typeof data.name !== 'string' ||
    data.name.length > 100 ||
    !['晴朗', '小雨', '星辉'].includes(String(data.weather)) ||
    !number(data.food, 0, 10000) ||
    !number(data.treasury, 0) ||
    !number(data.archiveCount, 0) ||
    !number(data.stats.births, 0) ||
    !number(data.stats.deaths, 0) ||
    !number(data.stats.interventions, 0)
  )
    throw Error('世界状态资料损坏。');
  return data as unknown as World;
}
export function loadWorld() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? validateWorld(JSON.parse(raw)) : null;
}
export function saveWorld(w: World) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(w));
  } catch {
    throw Error('浏览器存储空间不足，请导出存档保存到电脑。');
  }
}
export type Snapshot = {
  id: string;
  label: string;
  created: string;
  world: World;
};
export function loadSnapshots(): Snapshot[] {
  try {
    const data = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (x: unknown) =>
          object(x) &&
          typeof x.id === 'string' &&
          typeof x.label === 'string' &&
          typeof x.created === 'string',
      )
      .map((x: Snapshot) => ({ ...x, world: validateWorld(x.world) }))
      .slice(0, 3);
  } catch {
    return [];
  }
}
export function addSnapshot(w: World, label: string) {
  const items = [
    {
      id: `s${Date.now()}`,
      label,
      created: new Date().toLocaleString('zh-CN'),
      world: structuredClone(w),
    },
    ...loadSnapshots(),
  ].slice(0, 3);
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(items));
  } catch {
    throw Error('快照空间不足，请导出存档。');
  }
  return items;
}
export function downloadWorld(w: World) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(w)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `微光街区-${Math.floor(w.minutes / 1440) + 1}天.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
