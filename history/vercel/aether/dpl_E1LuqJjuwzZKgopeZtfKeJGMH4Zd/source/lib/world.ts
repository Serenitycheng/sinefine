export type Action =
  | '休息'
  | '进食'
  | '工作'
  | '学习魔法'
  | '散步'
  | '交谈'
  | '治疗'
  | '驯养'
  | '参与事件';
export type EventKind = '日常' | '关系' | '魔法' | '人生' | '世界' | '特殊事件';
export type Resident = {
  id: string;
  name: string;
  age: number;
  sex: '女' | '男';
  focus: boolean;
  alive: boolean;
  sprite: number;
  job: string;
  traits: string[];
  backstory: string;
  goal: string;
  thought: string;
  source: 'local' | 'ai';
  health: number;
  energy: number;
  hunger: number;
  mood: number;
  mana: number;
  money: number;
  talent: number;
  magic: number;
  school: string;
  empathy: number;
  ambition: number;
  curiosity: number;
  x: number;
  y: number;
  target: string;
  action: Action;
  home: string;
  relations: Record<string, number>;
  memories: string[];
  partner?: string;
  parents: string[];
  children: string[];
  born: number;
  death?: number;
  belief: number;
  dragon: number;
  lastBirth: number;
  route?: { x: number; y: number }[];
  aiUntil?: number;
  aiTarget?: string;
};
export type LifeEvent = {
  id: string;
  time: number;
  kind: EventKind;
  text: string;
  people: string[];
  important: boolean;
  source: 'local' | 'ai' | 'user';
};
export type Rules = {
  magicCost: number;
  learning: number;
  foodPrice: number;
  wage: number;
  inherit: number;
  tax: number;
  equalFood: boolean;
  dragonBan: boolean;
  freeHealing: boolean;
};
export type RulePatch = Partial<Rules>;
export type RuleRecord = {
  id: string;
  text: string;
  patch: RulePatch;
  time: number;
};
export type SpecialEvent = {
  name: string;
  description: string;
  count: number;
  duration: number;
  reward: number;
  objective: '研究' | '合作' | '竞技';
  minMagic: number;
  active: boolean;
  start: number;
  participants: string[];
  scores: Record<string, number>;
  finished: boolean;
  winner?: string;
};
export type Organization = {
  id: string;
  name: string;
  purpose: string;
  founder: string;
  members: string[];
  time: number;
};
export type World = {
  version: 1;
  name: string;
  seed: number;
  minutes: number;
  residents: Resident[];
  events: LifeEvent[];
  rules: Rules;
  ruleHistory: RuleRecord[];
  weather: '晴朗' | '小雨' | '星辉';
  food: number;
  treasury: number;
  organizations: Organization[];
  special: SpecialEvent;
  nextId: number;
  archiveCount: number;
  stats: { births: number; deaths: number; interventions: number };
};
export const PLACES = [
  { id: 'home-a', name: '晨曦公寓', x: 15, y: 39, type: '住宅' },
  { id: 'home-b', name: '梧桐里', x: 36, y: 39, type: '住宅' },
  { id: 'academy', name: '星灯学舍', x: 74, y: 38, type: '学习' },
  { id: 'park', name: '微光广场', x: 46, y: 65, type: '公共' },
  { id: 'cafe', name: '转角咖啡', x: 13, y: 68, type: '商业' },
  { id: 'market', name: '日常集市', x: 30, y: 88, type: '商业' },
  { id: 'clinic', name: '白铃诊所', x: 67, y: 90, type: '医疗' },
  { id: 'garden', name: '龙息庭院', x: 77, y: 84, type: '生态' },
  { id: 'library', name: '街角书屋', x: 38, y: 86, type: '公共' },
  { id: 'home-c', name: '银杏公寓', x: 24, y: 19, type: '住宅' },
];
export const JOBS = [
  '花艺师',
  '咖啡师',
  '程序员',
  '教师',
  '店员',
  '医师',
  '研究员',
  '自由职业者',
  '园艺师',
  '魔法学徒',
];
export const TRAITS = [
  '温和',
  '好奇',
  '谨慎',
  '外向',
  '固执',
  '慷慨',
  '独立',
  '敏感',
  '有野心',
  '乐观',
];
export const SCHOOLS = ['治愈', '自然', '光', '风', '塑形'];
export const DEFAULT_RULES: Rules = {
  magicCost: 12,
  learning: 1,
  foodPrice: 8,
  wage: 32,
  inherit: 0.55,
  tax: 0.08,
  equalFood: false,
  dragonBan: false,
  freeHealing: false,
};
export const clamp = (n: number, low = 0, high = 100) =>
  Math.max(low, Math.min(high, n));
export function random(w: World) {
  w.seed = (Math.imul(w.seed, 1664525) + 1013904223) >>> 0;
  return w.seed / 4294967296;
}
export function pick<T>(w: World, items: T[]): T {
  return items[Math.floor(random(w) * items.length)];
}
export function dateText(minutes: number, short = false) {
  const d = Math.floor(minutes / 1440),
    year = 1 + Math.floor(d / 360),
    day = d % 360,
    month = Math.floor(day / 30) + 1,
    date = (day % 30) + 1;
  return short
    ? `${year}年 ${month}月${date}日`
    : `星历 ${year}年 · ${month}月${date}日`;
}
export function clockText(minutes: number) {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(Math.floor(minutes) % 60).padStart(2, '0')}`;
}
export function event(
  w: World,
  kind: EventKind,
  text: string,
  people: string[] = [],
  important = false,
  source: LifeEvent['source'] = 'local',
) {
  const e: LifeEvent = {
    id: `e${w.nextId++}`,
    time: w.minutes,
    kind,
    text,
    people,
    important,
    source,
  };
  w.events.unshift(e);
  for (const id of people) {
    const p = w.residents.find((r) => r.id === id);
    if (p) {
      p.memories.unshift(e.id);
      p.memories = p.memories.slice(0, p.focus ? 300 : 30);
    }
  }
  if (w.events.length > 5000) {
    const kept = w.events
      .filter((x, i) => i < 2500 || x.important)
      .slice(0, 4500);
    w.archiveCount += w.events.length - kept.length;
    w.events = kept;
  }
  return e;
}
const names = [
  '月見 澪',
  '朝霧 悠真',
  '七瀬 凛',
  '桐谷 蓮',
  '星宮 紗夜',
  '白石 奏太',
  '花森 結衣',
  '神崎 遥斗',
  '雨宮 詩音',
  '橘 颯真',
  '小鳥遊 杏',
  '水瀬 律',
  '藤咲 葵',
  '天野 陽',
  '雪村 ほのか',
  '如月 蒼',
  '綾瀬 美月',
  '高槻 伊織',
  '椎名 透',
  '浅羽 晴',
];
const surnames = [
  '佐倉',
  '青葉',
  '秋山',
  '一ノ瀬',
  '東雲',
  '結城',
  '宮崎',
  '春日',
  '若宮',
  '神楽',
  '桜庭',
  '篠原',
  '黒瀬',
  '望月',
  '小泉',
  '日向',
];
const given = [
  'あかり',
  '優奈',
  '奏',
  '千夏',
  '陽菜',
  '拓海',
  '蓮',
  '結月',
  'はるか',
  '悠',
  '凪',
  'ひなた',
  '莉央',
  '翔',
  '紬',
  '蒼空',
];
export function createResident(
  w: World,
  opts: Partial<Resident> = {},
): Resident {
  const index = w.residents.length,
    id = `p${w.nextId++}`,
    home = pick(w, ['home-a', 'home-b', 'home-c']),
    pos = PLACES.find((p) => p.id === home)!;
  const p: Resident = {
    id,
    name: index < 20 ? names[index] : `${pick(w, surnames)} ${pick(w, given)}`,
    age: 18 + Math.floor(random(w) * 43),
    sex: index % 2 === 0 ? '女' : '男',
    focus: index < 20,
    alive: true,
    sprite: index % 16,
    job: JOBS[index % JOBS.length],
    traits: [pick(w, TRAITS), pick(w, TRAITS)],
    backstory: '带着自己的打算搬进微光街区，希望在这里找到生活的节奏。',
    goal: pick(w, [
      '想把自己的小店经营好',
      '想学会一种真正有用的魔法',
      '想结交可以信任的朋友',
      '想存下足够的钱，过安稳的生活',
      '想理解魔法如何改变城市',
    ]),
    thought: '今天想先在街区走走，看看有什么新鲜事。',
    source: 'local',
    health: 92,
    energy: 75 + random(w) * 20,
    hunger: 75,
    mood: 65 + random(w) * 25,
    mana: 50 + random(w) * 50,
    money: 120 + Math.floor(random(w) * 280),
    talent: 20 + random(w) * 70,
    magic: random(w) * 25,
    school: SCHOOLS[index % 5],
    empathy: random(w),
    ambition: random(w),
    curiosity: random(w),
    x: pos.x + (random(w) - 0.5) * 5,
    y: pos.y + (random(w) - 0.5) * 2,
    target: 'park',
    action: '散步',
    home,
    relations: {},
    memories: [],
    parents: [],
    children: [],
    born: w.minutes,
    belief: 0,
    dragon: 0,
    lastBirth: -10000000,
    ...opts,
  };
  w.residents.push(p);
  return p;
}
export function newWorld(seed = 20260905): World {
  const w: World = {
    version: 1,
    name: '微光街区',
    seed,
    minutes: 480,
    residents: [],
    events: [],
    rules: { ...DEFAULT_RULES },
    ruleHistory: [],
    weather: '晴朗',
    food: 800,
    treasury: 1000,
    organizations: [],
    special: {
      name: '星灯共鸣',
      description:
        '街区出现了一种新的魔力共鸣。受邀者可以研究它、交换发现，也可以独自争取成果。',
      count: 7,
      duration: 14,
      reward: 500,
      objective: '研究',
      minMagic: 0,
      active: false,
      start: 0,
      participants: [],
      scores: {},
      finished: false,
    },
    nextId: 1,
    archiveCount: 0,
    stats: { births: 0, deaths: 0, interventions: 0 },
  };
  for (let i = 0; i < 80; i++) createResident(w);
  const a = w.residents[0];
  a.age = 24;
  a.job = '花艺师';
  a.traits = ['好奇', '温和'];
  a.school = '自然';
  a.curiosity = 0.9;
  a.empathy = 0.8;
  a.goal = '想开一家会在夜晚发光的花店。';
  a.thought = '学会一点自然魔法，也许能让花期再长一些。';
  a.backstory =
    '从普通的园艺课程开始接触自然魔法。刚搬来街区，正在寻找可以开花店的地方。';
  for (let i = 0; i < 20; i++) {
    const p = w.residents[i],
      q = w.residents[(i + 1) % 20];
    p.relations[q.id] = 15 + Math.floor(random(w) * 25);
    q.relations[p.id] = p.relations[q.id];
  }
  event(
    w,
    '世界',
    '微光街区开始了新的一天。80 位居民在这里生活，其中 20 位值得你慢慢认识。',
    [],
    true,
  );
  event(
    w,
    '人生',
    '月見 澪搬进晨曦公寓，带来了一箱花种和开店的想法。',
    [a.id],
    true,
  );
  return w;
}
export function moveResidents(w: World, step = 10) {
  w.minutes += step;
  for (const p of w.residents) {
    if (!p.alive) continue;
    const pos = PLACES.find((x) => x.id === p.target) || PLACES[3],
      dx = pos.x - p.x,
      dy = pos.y - p.y,
      d = Math.hypot(dx, dy);
    if (d > 1) {
      const travel = Math.min(d, step * 0.2);
      p.x += (dx / d) * travel;
      p.y += (dy / d) * travel;
    } else p.target = pick(w, PLACES).id;
  }
  return w;
}
