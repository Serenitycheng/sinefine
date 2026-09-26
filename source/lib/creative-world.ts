export const CREATIVE_STORAGE_KEY = 'sinefine-creative-worlds-v1';
export const MAX_CREATIVE_WORLDS = 8;
export const MAX_CREATIVE_RESIDENTS = 12;
export const MAX_CREATIVE_EVENTS = 160;
export const MAX_CREATIVE_IMPORT_BYTES = 2 * 1024 * 1024;
export const CREATIVE_STEP_MINUTES = 10;
const MAX_MINUTES = 1440 * 365 * 100;
const MAX_MONEY = 100000;
const MAX_STEPS = 144;
const MAX_LIBRARY_BYTES = 2 * MAX_CREATIVE_IMPORT_BYTES;

export type CreativeTemplateId = 'coastal' | 'academy' | 'orbital' | 'custom';
export type CreativeTrait = 'curious' | 'kind' | 'steady' | 'active' | 'quiet';
export type CreativePlace = 'home' | 'work' | 'table' | 'square' | 'study';
export type CreativeActionId =
  | 'sleep'
  | 'eat'
  | 'work'
  | 'talk'
  | 'explore'
  | 'pursue'
  | 'rest';
export type CreativeRules = {
  workHours: number;
  mealCost: number;
  dailyAllowance: number;
};
export type CreativeResidentDraft = {
  name: string;
  role: string;
  goal: string;
  traits: CreativeTrait[];
};
export type CreativeWorldDraft = {
  template: CreativeTemplateId;
  name: string;
  premise: string;
  rules: CreativeRules;
  residents: CreativeResidentDraft[];
};
export type CreativeAction = {
  id: CreativeActionId;
  label: string;
  text: string;
  place: CreativePlace;
  since: number;
};
export type CreativeResident = CreativeResidentDraft & {
  id: string;
  hunger: number;
  energy: number;
  social: number;
  mood: number;
  money: number;
  action: CreativeAction;
};
export type CreativeRelationship = {
  a: string;
  b: string;
  closeness: number;
  lastTalk: number | null;
};
export type CreativeEventKind =
  | 'world'
  | 'action'
  | 'conversation'
  | 'income'
  | 'rules'
  | 'details';
export type CreativeEvent = {
  id: number;
  minute: number;
  kind: CreativeEventKind;
  people: string[];
  text: string;
};
export type CreativeWorld = {
  version: 1;
  id: string;
  template: CreativeTemplateId;
  name: string;
  premise: string;
  createdAt: string;
  rules: CreativeRules;
  minutes: number;
  allowanceDay: number;
  rng: number;
  nextEventId: number;
  residents: CreativeResident[];
  relationships: CreativeRelationship[];
  events: CreativeEvent[];
};
export type CreativeRecovery = {
  savedAt: string;
  activeId: string | null;
  worlds: CreativeWorld[];
};
export type CreativeLibrary = {
  version: 1;
  activeId: string | null;
  worlds: CreativeWorld[];
  recovery: CreativeRecovery | null;
};
export type CreativeBackup = {
  format: 'sinefine/creative-worlds';
  version: 1;
  createdAt: string;
  activeId: string | null;
  worlds: CreativeWorld[];
};
export type CreativeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const CREATIVE_TRAITS: readonly {
  id: CreativeTrait;
  label: string;
  description: string;
}[] = [
  {
    id: 'curious',
    label: '好奇',
    description: '更常探索周围，探索时心情恢复更多。',
  },
  {
    id: 'kind',
    label: '温和',
    description: '更想与人交流，相处时关系更容易靠近。',
  },
  {
    id: 'steady',
    label: '踏实',
    description: '更愿意投入自己的目标，工作时心情较稳定。',
  },
  {
    id: 'active',
    label: '活跃',
    description: '更常外出，精力充足时心情更好，也更容易饿。',
  },
  {
    id: 'quiet',
    label: '安静',
    description: '更享受独处，社交需求下降较慢，休息更有效。',
  },
];
export const CREATIVE_TEMPLATES: readonly {
  id: CreativeTemplateId;
  name: string;
  genre: string;
  description: string;
}[] = [
  {
    id: 'coastal',
    name: '海风小镇',
    genre: '现代',
    description: '码头、旧书店与海边广场，记录邻里细小的相遇。',
  },
  {
    id: 'academy',
    name: '星灯学园',
    genre: '魔法',
    description: '在灯火与星图之间研习，分享庭院、温室与书页里的日常。',
  },
  {
    id: 'orbital',
    name: '远星栖所',
    genre: '太空',
    description: '维护一座远行栖所，在有限空间里照顾彼此的日常。',
  },
  {
    id: 'custom',
    name: '自由创造',
    genre: '自定义',
    description: '从名称、设定与人物开始，写下属于自己的日常。',
  },
];
const actions: Record<
  CreativeActionId,
  { label: string; place: CreativePlace }
> = {
  sleep: { label: '睡眠', place: 'home' },
  eat: { label: '用餐', place: 'table' },
  work: { label: '工作', place: 'work' },
  talk: { label: '交谈', place: 'square' },
  explore: { label: '探索', place: 'square' },
  pursue: { label: '投入目标', place: 'study' },
  rest: { label: '休息', place: 'home' },
};
const places: Record<CreativeTemplateId, Record<CreativePlace, string>> = {
  coastal: {
    home: '海边住处',
    work: '码头与街边工坊',
    table: '海风食堂',
    square: '潮汐广场',
    study: '旧书店',
  },
  academy: {
    home: '星灯宿舍',
    work: '学园事务室',
    table: '学园餐厅',
    square: '星灯庭院',
    study: '星图阅览室',
  },
  orbital: {
    home: '居住舱',
    work: '维护舱',
    table: '公共餐舱',
    square: '观景环廊',
    study: '资料舱',
  },
  custom: {
    home: '住处',
    work: '工作区',
    table: '餐桌',
    square: '公共广场',
    study: '书房',
  },
};
export function creativePlaceName(
  template: CreativeTemplateId,
  place: CreativePlace,
) {
  return places[template][place];
}
export function creativeTime(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const clock = minutes % 1440;
  return `第 ${day} 天 ${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
}

function object(
  value: unknown,
  keys: readonly string[],
  message: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(message);
  const result = value as Record<string, unknown>;
  const actual = Object.keys(result);
  if (
    actual.length !== keys.length ||
    !actual.every((key) => keys.includes(key))
  )
    throw new Error(message);
  return result;
}
function int(
  value: unknown,
  min: number,
  max: number,
  message: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(message);
  return value;
}
function string(
  value: unknown,
  max: number,
  message: string,
  empty = false,
): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (!empty && !value.trim())
  )
    throw new Error(message);
  return value;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(value))
    throw new Error('创作存档编号无效。');
  return value;
}
function date(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 40 ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error('创作存档时间无效。');
  return value;
}
function templateId(value: unknown): CreativeTemplateId {
  if (!CREATIVE_TEMPLATES.some((item) => item.id === value))
    throw new Error('创作世界的模板无效。');
  return value as CreativeTemplateId;
}
function traits(value: unknown): CreativeTrait[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 3 ||
    new Set(value).size !== value.length ||
    !value.every((item) => CREATIVE_TRAITS.some((trait) => trait.id === item))
  )
    throw new Error('每位人物请选择 1 至 3 个不同特质。');
  return [...value] as CreativeTrait[];
}
function residentDetails(
  value: Record<string, unknown>,
): CreativeResidentDraft {
  return {
    name: string(value.name, 32, '人物名字需要 1 至 32 个字符。'),
    role: string(value.role, 80, '人物身份需要 1 至 80 个字符。'),
    goal: string(value.goal, 160, '人物目标需要 1 至 160 个字符。'),
    traits: traits(value.traits),
  };
}
export function parseCreativeRules(value: unknown): CreativeRules {
  const x = object(
    value,
    ['workHours', 'mealCost', 'dailyAllowance'],
    '世界规则不完整。',
  );
  return {
    workHours: int(x.workHours, 0, 12, '每日工作时间须为 0 至 12 的整数。'),
    mealCost: int(x.mealCost, 0, 30, '一次用餐花费须为 0 至 30 的整数。'),
    dailyAllowance: int(
      x.dailyAllowance,
      0,
      200,
      '每日生活费须为 0 至 200 的整数。',
    ),
  };
}
export function parseCreativeWorldDraft(value: unknown): CreativeWorldDraft {
  const x = object(
    value,
    ['template', 'name', 'premise', 'rules', 'residents'],
    '世界草稿不完整。',
  );
  if (
    !Array.isArray(x.residents) ||
    x.residents.length < 1 ||
    x.residents.length > MAX_CREATIVE_RESIDENTS
  )
    throw new Error('每个世界需要 1 至 12 位人物。');
  return {
    template: templateId(x.template),
    name: string(x.name, 40, '世界名字需要 1 至 40 个字符。').trim(),
    premise: string(x.premise, 1200, '世界设定最多 1200 个字符。', true),
    rules: parseCreativeRules(x.rules),
    residents: x.residents.map((item) =>
      residentDetails(
        object(item, ['name', 'role', 'goal', 'traits'], '人物草稿不完整。'),
      ),
    ),
  };
}
export function creativeTemplateDraft(
  template: CreativeTemplateId,
): CreativeWorldDraft {
  templateId(template);
  const base = {
    template,
    rules: { workHours: 6, mealCost: 8, dailyAllowance: 35 },
  };
  switch (template) {
    case 'coastal':
      return {
        ...base,
        name: '海风小镇',
        premise:
          '一座没有赶路压力的海边小镇。潮汐广场连接码头、旧书店与居民的家，大家在普通日子里慢慢熟悉彼此。',
        residents: [
          {
            name: '林汐',
            role: '旧书店店员',
            goal: '整理出一张小镇读书地图',
            traits: ['curious', 'quiet'],
          },
          {
            name: '陈舟',
            role: '木船修理师',
            goal: '修好一艘可以带邻居出海的小船',
            traits: ['steady', 'kind'],
          },
          {
            name: '许禾',
            role: '海风食堂厨师',
            goal: '收集大家记忆里的家常菜',
            traits: ['kind', 'active'],
          },
        ],
      };
    case 'academy':
      return {
        ...base,
        name: '星灯学园',
        premise:
          '一所收藏星图与微光故事的魔法学园。清晨的温室、午后的阅览室和入夜点亮的庭院，陪伴学徒与居民的研习、工作与相聚。',
        residents: [
          {
            name: '澄羽',
            role: '星图学徒',
            goal: '为第一次星灯观测准备一本笔记',
            traits: ['curious', 'steady'],
          },
          {
            name: '米洛',
            role: '温室照料员',
            goal: '让每位新生都有一盆自己照顾的植物',
            traits: ['kind', 'quiet'],
          },
          {
            name: '铃青',
            role: '学园信使',
            goal: '记住每一条连接庭院的小路',
            traits: ['active', 'curious'],
          },
        ],
      };
    case 'orbital':
      return {
        ...base,
        name: '远星栖所',
        premise:
          '远航途中的一座太空栖所。维护舱、资料舱与公共餐舱组成日常，居民通过工作、散步和交谈照顾有限空间中的生活。',
        residents: [
          {
            name: '陆遥',
            role: '栖所维修员',
            goal: '让观景环廊的照明稳定下来',
            traits: ['steady', 'quiet'],
          },
          {
            name: '诺安',
            role: '生态记录员',
            goal: '为共享花园记录第一轮完整生长',
            traits: ['curious', 'kind'],
          },
          {
            name: '伊岚',
            role: '航行联络员',
            goal: '组织一次面向家乡的故事分享',
            traits: ['active', 'kind'],
          },
        ],
      };
    case 'custom':
      return {
        ...base,
        name: '我的自由世界',
        premise: '',
        residents: [
          {
            name: '小岚',
            role: '新居民',
            goal: '找到一件想慢慢完成的事',
            traits: ['curious'],
          },
          {
            name: '阿宁',
            role: '新居民',
            goal: '结识一位愿意分享日常的朋友',
            traits: ['kind'],
          },
        ],
      };
  }
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));
function random(world: CreativeWorld) {
  world.rng = (Math.imul(world.rng, 1664525) + 1013904223) >>> 0;
  return world.rng / 4294967296;
}
function event(
  world: CreativeWorld,
  kind: CreativeEventKind,
  text: string,
  people: string[] = [],
) {
  if (world.nextEventId >= 1e9)
    throw new Error('世界事件已到达保存上限，请先导出留念。');
  world.events.push({
    id: world.nextEventId++,
    minute: world.minutes,
    kind,
    people: [...people],
    text,
  });
  if (world.events.length > MAX_CREATIVE_EVENTS)
    world.events.splice(0, world.events.length - MAX_CREATIVE_EVENTS);
}
function setAction(
  world: CreativeWorld,
  person: CreativeResident,
  action: CreativeActionId,
  text: string,
) {
  const changed = person.action.id !== action;
  person.action = {
    id: action,
    ...actions[action],
    text,
    since: changed ? world.minutes : person.action.since,
  };
  if (changed && action !== 'talk')
    event(world, 'action', `${person.name}：${text}`, [person.id]);
}
export function createCreativeWorld(
  draft: CreativeWorldDraft,
  options: { id?: string; seed?: number; now?: Date } = {},
): CreativeWorld {
  const clean = parseCreativeWorldDraft(draft);
  const world: CreativeWorld = {
    version: 1,
    id: id(options.id ?? `creative-${crypto.randomUUID()}`),
    template: clean.template,
    name: clean.name,
    premise: clean.premise,
    createdAt: (options.now ?? new Date()).toISOString(),
    rules: clean.rules,
    minutes: 480,
    allowanceDay: 0,
    rng: int(
      options.seed ?? crypto.getRandomValues(new Uint32Array(1))[0],
      0,
      4294967295,
      '世界种子无效。',
    ),
    nextEventId: 1,
    residents: clean.residents.map((person, index) => ({
      ...person,
      id: `p${index + 1}`,
      hunger: 28 + (index % 4) * 3,
      energy: 80,
      social: 72,
      mood: 65,
      money: clean.rules.dailyAllowance,
      action: {
        id: 'rest',
        ...actions.rest,
        text: '安顿下来，准备开始今天的生活。',
        since: 480,
      },
    })),
    relationships: [],
    events: [],
  };
  for (let i = 0; i < world.residents.length; i++)
    for (let j = i + 1; j < world.residents.length; j++) {
      const [a, b] = [world.residents[i].id, world.residents[j].id].sort();
      world.relationships.push({ a, b, closeness: 20, lastTalk: null });
    }
  event(
    world,
    'world',
    `${world.name}的日常开始了。每位人物已领取今天的 ${world.rules.dailyAllowance} 点生活费。`,
    world.residents.map((p) => p.id),
  );
  return world;
}

export function parseCreativeWorld(value: unknown): CreativeWorld {
  const x = object(
    value,
    [
      'version',
      'id',
      'template',
      'name',
      'premise',
      'createdAt',
      'rules',
      'minutes',
      'allowanceDay',
      'rng',
      'nextEventId',
      'residents',
      'relationships',
      'events',
    ],
    '创作世界格式不完整或版本不受支持。',
  );
  if (x.version !== 1) throw new Error('创作世界版本不受支持。');
  const minutes = int(x.minutes, 480, MAX_MINUTES, '故事时间无效。');
  if (minutes % CREATIVE_STEP_MINUTES)
    throw new Error('故事时间不符合 10 分钟步长。');
  const nextEventId = int(x.nextEventId, 2, 1e9, '世界事件编号无效。');
  if (x.allowanceDay !== Math.floor(minutes / 1440))
    throw new Error('每日生活费记录与故事日期不一致。');
  if (
    !Array.isArray(x.residents) ||
    x.residents.length < 1 ||
    x.residents.length > MAX_CREATIVE_RESIDENTS
  )
    throw new Error('世界人物数量无效。');
  const residents: CreativeResident[] = x.residents.map((raw) => {
    const p = object(
      raw,
      [
        'id',
        'name',
        'role',
        'goal',
        'traits',
        'hunger',
        'energy',
        'social',
        'mood',
        'money',
        'action',
      ],
      '人物状态不完整。',
    );
    const a = object(
      p.action,
      ['id', 'label', 'text', 'place', 'since'],
      '人物行动不完整。',
    );
    if (typeof a.id !== 'string' || !Object.hasOwn(actions, a.id))
      throw new Error('人物行动无效。');
    const actionId = a.id as CreativeActionId;
    if (
      a.label !== actions[actionId].label ||
      a.place !== actions[actionId].place
    )
      throw new Error('人物行动地点不一致。');
    const since = int(a.since, 480, minutes, '人物行动时间无效。');
    if (since % CREATIVE_STEP_MINUTES) throw new Error('人物行动时间无效。');
    return {
      id: id(p.id),
      ...residentDetails(p),
      hunger: int(p.hunger, 0, 100, '人物饥饿值无效。'),
      energy: int(p.energy, 0, 100, '人物精力值无效。'),
      social: int(p.social, 0, 100, '人物社交值无效。'),
      mood: int(p.mood, 0, 100, '人物心情值无效。'),
      money: int(p.money, 0, MAX_MONEY, '人物生活费无效。'),
      action: {
        id: actionId,
        ...actions[actionId],
        text: string(a.text, 400, '人物行动描述无效。'),
        since,
      },
    };
  });
  const ids = new Set(residents.map((p) => p.id));
  if (ids.size !== residents.length) throw new Error('人物编号重复。');
  const pairKeys = new Set<string>();
  if (
    !Array.isArray(x.relationships) ||
    x.relationships.length !== (residents.length * (residents.length - 1)) / 2
  )
    throw new Error('人物关系数量无效。');
  const relationships = x.relationships.map((raw): CreativeRelationship => {
    const r = object(
      raw,
      ['a', 'b', 'closeness', 'lastTalk'],
      '人物关系不完整。',
    );
    const a = id(r.a),
      b = id(r.b),
      key = `${a}|${b}`;
    if (!ids.has(a) || !ids.has(b) || a >= b || pairKeys.has(key))
      throw new Error('人物关系引用无效。');
    pairKeys.add(key);
    const lastTalk =
      r.lastTalk === null
        ? null
        : int(r.lastTalk, 480, minutes, '关系交谈时间无效。');
    if (lastTalk !== null && lastTalk % CREATIVE_STEP_MINUTES)
      throw new Error('关系交谈时间无效。');
    return {
      a,
      b,
      closeness: int(r.closeness, 0, 100, '人物关系值无效。'),
      lastTalk,
    };
  });
  if (
    !Array.isArray(x.events) ||
    !x.events.length ||
    x.events.length > MAX_CREATIVE_EVENTS
  )
    throw new Error('世界事件数量无效。');
  let previousId = 0,
    previousMinute = 0;
  const events = x.events.map((raw): CreativeEvent => {
    const e = object(
      raw,
      ['id', 'minute', 'kind', 'people', 'text'],
      '世界事件不完整。',
    );
    const eventId = int(e.id, 1, nextEventId - 1, '世界事件编号无效。');
    const minute = int(e.minute, 480, minutes, '世界事件时间无效。');
    if (
      eventId <= previousId ||
      minute < previousMinute ||
      minute % CREATIVE_STEP_MINUTES
    )
      throw new Error('世界事件顺序无效。');
    previousId = eventId;
    previousMinute = minute;
    if (
      typeof e.kind !== 'string' ||
      ![
        'world',
        'action',
        'conversation',
        'income',
        'rules',
        'details',
      ].includes(e.kind)
    )
      throw new Error('世界事件类型无效。');
    if (
      !Array.isArray(e.people) ||
      e.people.length > residents.length ||
      new Set(e.people).size !== e.people.length ||
      !e.people.every((person) => typeof person === 'string' && ids.has(person))
    )
      throw new Error('世界事件人物无效。');
    return {
      id: eventId,
      minute,
      kind: e.kind as CreativeEventKind,
      people: [...e.people] as string[],
      text: string(e.text, 600, '世界事件文字无效。'),
    };
  });
  if (previousId !== nextEventId - 1)
    throw new Error('下一条世界事件编号不连续。');
  return {
    version: 1,
    id: id(x.id),
    template: templateId(x.template),
    name: string(x.name, 40, '世界名字无效。'),
    premise: string(x.premise, 1200, '世界设定无效。', true),
    createdAt: date(x.createdAt),
    rules: parseCreativeRules(x.rules),
    minutes,
    allowanceDay: Math.floor(minutes / 1440),
    rng: int(x.rng, 0, 4294967295, '世界种子无效。'),
    nextEventId,
    residents,
    relationships,
    events,
  };
}

function step(world: CreativeWorld) {
  world.minutes += CREATIVE_STEP_MINUTES;
  const day = Math.floor(world.minutes / 1440);
  if (day > world.allowanceDay) {
    const due = (day - world.allowanceDay) * world.rules.dailyAllowance;
    for (const person of world.residents)
      person.money = clamp(person.money + due, 0, MAX_MONEY);
    world.allowanceDay = day;
    event(
      world,
      'income',
      `新的一天，每位人物收到 ${due} 点生活费。`,
      world.residents.map((p) => p.id),
    );
  }
  const clock = world.minutes % 1440;
  const night = clock >= 1320 || clock < 360;
  for (const person of world.residents) {
    const has = (trait: CreativeTrait) => person.traits.includes(trait);
    person.hunger = clamp(person.hunger + (has('active') ? 3 : 2));
    person.energy = clamp(person.energy - 2);
    person.social = clamp(
      person.social -
        (has('kind') ? 2 : has('quiet') && world.minutes % 20 !== 0 ? 0 : 1),
    );
    if (night || person.energy <= 18) {
      setAction(
        world,
        person,
        'sleep',
        `在${creativePlaceName(world.template, 'home')}睡觉，补回精力。`,
      );
      person.energy = clamp(person.energy + 13);
      person.mood = clamp(person.mood + 1);
    } else if (person.hunger >= 60 && person.money >= world.rules.mealCost) {
      person.money -= world.rules.mealCost;
      person.hunger = clamp(person.hunger - 52);
      person.energy = clamp(person.energy + 5);
      person.mood = clamp(person.mood + 4);
      setAction(
        world,
        person,
        'eat',
        `在${creativePlaceName(world.template, 'table')}用餐，花费 ${world.rules.mealCost} 点生活费。`,
      );
    } else if (
      clock >= 540 &&
      clock < 540 + world.rules.workHours * 60 &&
      person.energy >= 30
    ) {
      person.money = clamp(person.money + 2, 0, MAX_MONEY);
      person.energy = clamp(person.energy - 2);
      person.mood = clamp(person.mood + (has('steady') ? 1 : -1));
      setAction(
        world,
        person,
        'work',
        `在${creativePlaceName(world.template, 'work')}完成${person.role}的日常工作，每 10 分钟获得 2 点生活费。`,
      );
    } else if (person.energy < 45 || person.hunger >= 80) {
      person.energy = clamp(person.energy + (has('quiet') ? 10 : 8));
      person.mood = clamp(person.mood + (person.hunger >= 80 ? -3 : 2));
      setAction(
        world,
        person,
        'rest',
        person.hunger >= 80
          ? '先在住处休息，等生活费充足后再用餐。'
          : `在${creativePlaceName(world.template, 'home')}休息片刻。`,
      );
    } else {
      const explore =
        random(world) < (has('curious') || has('active') ? 0.55 : 0.25);
      if (explore) {
        person.mood = clamp(person.mood + (has('curious') ? 4 : 2));
        setAction(
          world,
          person,
          'explore',
          `去${creativePlaceName(world.template, 'square')}走走，看看今天有什么变化。`,
        );
      } else {
        person.mood = clamp(
          person.mood + (has('steady') || has('quiet') ? 3 : 1),
        );
        setAction(
          world,
          person,
          'pursue',
          `在${creativePlaceName(world.template, 'study')}为「${person.goal}」做一点准备。`,
        );
      }
    }
    if (person.hunger >= 80) person.mood = clamp(person.mood - 2);
    if (person.social <= 20) person.mood = clamp(person.mood - 1);
    if (has('active') && person.energy >= 60)
      person.mood = clamp(person.mood + 1);
  }
  if (night) return;
  const available = world.residents.filter(
    (p) => ['explore', 'pursue', 'rest'].includes(p.action.id) && p.hunger < 80,
  );
  const paired = new Set<string>();
  for (const person of available) {
    if (paired.has(person.id) || person.social > 55) continue;
    const candidates = available.filter((other) => {
      if (other.id === person.id || paired.has(other.id)) return false;
      const pair = world.relationships.find(
        (r) =>
          r.a === [person.id, other.id].sort()[0] &&
          r.b === [person.id, other.id].sort()[1],
      )!;
      return pair.lastTalk === null || world.minutes - pair.lastTalk >= 60;
    });
    if (!candidates.length) continue;
    const other = candidates[Math.floor(random(world) * candidates.length)];
    const [a, b] = [person.id, other.id].sort();
    const relationship = world.relationships.find(
      (r) => r.a === a && r.b === b,
    )!;
    relationship.closeness = clamp(
      relationship.closeness +
        (person.traits.includes('kind') || other.traits.includes('kind')
          ? 6
          : 4),
    );
    relationship.lastTalk = world.minutes;
    paired.add(person.id);
    paired.add(other.id);
    for (const [speaker, listener] of [
      [person, other],
      [other, person],
    ]) {
      speaker.social = clamp(speaker.social + 24);
      speaker.mood = clamp(speaker.mood + 5);
      setAction(
        world,
        speaker,
        'talk',
        `在${creativePlaceName(world.template, 'square')}与${listener.name}聊聊彼此的近况。`,
      );
    }
    event(
      world,
      'conversation',
      `${person.name}与${other.name}交换近况：一方提到「${person.goal.slice(0, 70)}」，另一方分享「${other.goal.slice(0, 70)}」。他们又熟悉了一点。`,
      [person.id, other.id],
    );
  }
}
export function advanceCreativeWorld(
  world: CreativeWorld,
  steps = 1,
): CreativeWorld {
  int(steps, 0, MAX_STEPS, '每次只能推进 0 至 144 个十分钟。');
  const next = parseCreativeWorld(world);
  if (
    next.minutes + steps * CREATIVE_STEP_MINUTES > MAX_MINUTES ||
    next.nextEventId + steps * 40 > 1e9
  )
    throw new Error('世界已到达可保存的时间上限，请导出留念。');
  for (let i = 0; i < steps; i++) step(next);
  return next;
}
export function updateCreativeRules(
  world: CreativeWorld,
  rules: CreativeRules,
): CreativeWorld {
  const next = parseCreativeWorld(world);
  const clean = parseCreativeRules(rules);
  if (JSON.stringify(clean) === JSON.stringify(next.rules)) return next;
  next.rules = clean;
  event(
    next,
    'rules',
    `世界规则调整：每日工作 ${clean.workHours} 小时，用餐 ${clean.mealCost} 点，下次午夜起每日生活费 ${clean.dailyAllowance} 点。`,
  );
  return next;
}
export function updateCreativeWorldDetails(
  world: CreativeWorld,
  details: {
    name: string;
    premise: string;
    residents: (CreativeResidentDraft & { id: string })[];
  },
): CreativeWorld {
  const next = parseCreativeWorld(world);
  const x = object(
    details,
    ['name', 'premise', 'residents'],
    '世界详情不完整。',
  );
  if (
    !Array.isArray(x.residents) ||
    x.residents.length !== next.residents.length
  )
    throw new Error('创建后只能编辑现有人物，不能增删人物。');
  const changes = x.residents.map((raw) => {
    const p = object(
      raw,
      ['id', 'name', 'role', 'goal', 'traits'],
      '人物详情不完整。',
    );
    return { id: id(p.id), ...residentDetails(p) };
  });
  if (
    new Set(changes.map((p) => p.id)).size !== next.residents.length ||
    changes.some(
      (p) => !next.residents.some((existing) => existing.id === p.id),
    )
  )
    throw new Error('不能更换或重复人物编号。');
  next.name = string(x.name, 40, '世界名字需要 1 至 40 个字符。').trim();
  next.premise = string(x.premise, 1200, '世界设定最多 1200 个字符。', true);
  next.residents = next.residents.map((p) => ({
    ...p,
    ...changes.find((change) => change.id === p.id)!,
  }));
  event(
    next,
    'details',
    '世界设定与人物介绍已更新，已有生活状态和相处记录继续保留。',
  );
  return next;
}

function archive(
  value: unknown,
  activeValue: unknown,
): { worlds: CreativeWorld[]; activeId: string | null } {
  if (!Array.isArray(value) || value.length > MAX_CREATIVE_WORLDS)
    throw new Error('最多保留 8 个原创世界。');
  const worlds = value.map(parseCreativeWorld);
  const ids = new Set(worlds.map((world) => world.id));
  if (ids.size !== worlds.length) throw new Error('原创世界编号重复。');
  if (
    (worlds.length === 0 && activeValue !== null) ||
    (worlds.length > 0 &&
      (typeof activeValue !== 'string' || !ids.has(activeValue)))
  )
    throw new Error('当前世界引用无效。');
  return { worlds, activeId: activeValue as string | null };
}
export function emptyCreativeLibrary(): CreativeLibrary {
  return { version: 1, activeId: null, worlds: [], recovery: null };
}
export function parseCreativeLibrary(value: unknown): CreativeLibrary {
  const x = object(
    value,
    ['version', 'activeId', 'worlds', 'recovery'],
    '原创世界档案格式无效。',
  );
  if (x.version !== 1) throw new Error('原创世界档案版本不受支持。');
  let recovery: CreativeRecovery | null = null;
  if (x.recovery !== null) {
    const r = object(
      x.recovery,
      ['savedAt', 'activeId', 'worlds'],
      '恢复前保护副本已损坏。',
    );
    recovery = { savedAt: date(r.savedAt), ...archive(r.worlds, r.activeId) };
  }
  return { version: 1, ...archive(x.worlds, x.activeId), recovery };
}
export function upsertCreativeWorld(
  library: CreativeLibrary,
  world: CreativeWorld,
): CreativeLibrary {
  const next = parseCreativeLibrary(library),
    clean = parseCreativeWorld(world);
  const index = next.worlds.findIndex((item) => item.id === clean.id);
  if (index === -1) {
    if (next.worlds.length >= MAX_CREATIVE_WORLDS)
      throw new Error('最多保留 8 个原创世界，请先导出或删除一个。');
    next.worlds.push(clean);
  } else next.worlds[index] = clean;
  next.activeId = clean.id;
  return next;
}
export function activateCreativeWorld(
  library: CreativeLibrary,
  worldId: string,
): CreativeLibrary {
  const next = parseCreativeLibrary(library);
  if (!next.worlds.some((world) => world.id === worldId))
    throw new Error('没有找到这份原创世界。');
  next.activeId = worldId;
  return next;
}
export function removeCreativeWorld(
  library: CreativeLibrary,
  worldId: string,
  now = new Date(),
): CreativeLibrary {
  const next = parseCreativeLibrary(library);
  if (!next.worlds.some((world) => world.id === worldId))
    throw new Error('没有找到这份原创世界。');
  next.recovery = {
    savedAt: now.toISOString(),
    activeId: next.activeId,
    worlds: next.worlds.map(parseCreativeWorld),
  };
  next.worlds = next.worlds.filter((world) => world.id !== worldId);
  if (next.activeId === worldId) next.activeId = next.worlds[0]?.id ?? null;
  return next;
}
export function readCreativeLibrary(storage: CreativeStorage): CreativeLibrary {
  return readCreativeLibrarySnapshot(storage).library;
}
export function readCreativeLibrarySnapshot(storage: CreativeStorage): {
  library: CreativeLibrary;
  raw: string | null;
} {
  const raw = storage.getItem(CREATIVE_STORAGE_KEY);
  if (raw === null) return { library: emptyCreativeLibrary(), raw };
  if (new TextEncoder().encode(raw).byteLength > MAX_LIBRARY_BYTES)
    throw new Error('原创世界档案过大，原记录未改变。');
  try {
    return { library: parseCreativeLibrary(JSON.parse(raw)), raw };
  } catch {
    throw new Error('本地原创世界档案已损坏或版本不受支持，原记录未覆盖。');
  }
}
export function writeCreativeLibrary(
  storage: CreativeStorage,
  library: CreativeLibrary,
): string {
  const clean = parseCreativeLibrary(library);
  // Never turn a failed initial read into a write of an empty/default archive.
  readCreativeLibrary(storage);
  const text = JSON.stringify(clean);
  if (new TextEncoder().encode(text).byteLength > MAX_LIBRARY_BYTES)
    throw new Error('原创世界档案过大，请先导出保存。');
  storage.setItem(CREATIVE_STORAGE_KEY, text);
  return text;
}
export function createCreativeBackup(
  library: CreativeLibrary,
  now = new Date(),
): CreativeBackup {
  const clean = parseCreativeLibrary(library);
  return {
    format: 'sinefine/creative-worlds',
    version: 1,
    createdAt: now.toISOString(),
    activeId: clean.activeId,
    worlds: clean.worlds,
  };
}
export function parseCreativeBackup(value: unknown): CreativeBackup {
  const x = object(
    value,
    ['format', 'version', 'createdAt', 'activeId', 'worlds'],
    '这不是有效的原创世界备份。',
  );
  if (x.format !== 'sinefine/creative-worlds' || x.version !== 1)
    throw new Error(
      '这不是当前支持的原创世界备份；Fate 与旧原型存档不能在这里恢复。',
    );
  return {
    format: 'sinefine/creative-worlds',
    version: 1,
    createdAt: date(x.createdAt),
    ...archive(x.worlds, x.activeId),
  };
}
export function serializeCreativeBackup(backup: CreativeBackup): string {
  const text = JSON.stringify(parseCreativeBackup(backup));
  if (new TextEncoder().encode(text).byteLength > MAX_CREATIVE_IMPORT_BYTES)
    throw new Error('原创世界备份超过 2 MB。');
  return text;
}
export function readCreativeBackupText(text: string): CreativeBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_CREATIVE_IMPORT_BYTES)
    throw new Error('原创世界备份最大支持 2 MB。');
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('无法读取这份原创世界备份。');
  }
  return parseCreativeBackup(data);
}
export function restoreCreativeLibrary(
  library: CreativeLibrary,
  backup: CreativeBackup,
  now = new Date(),
): CreativeLibrary {
  const previous = parseCreativeLibrary(library),
    clean = parseCreativeBackup(backup);
  return {
    version: 1,
    activeId: clean.activeId,
    worlds: clean.worlds,
    recovery: {
      savedAt: now.toISOString(),
      activeId: previous.activeId,
      worlds: previous.worlds,
    },
  };
}
export function restoreCreativeRecovery(
  library: CreativeLibrary,
  now = new Date(),
): CreativeLibrary {
  const current = parseCreativeLibrary(library);
  if (!current.recovery) throw new Error('还没有恢复前的保护副本。');
  return {
    version: 1,
    activeId: current.recovery.activeId,
    worlds: current.recovery.worlds,
    recovery: {
      savedAt: now.toISOString(),
      activeId: current.activeId,
      worlds: current.worlds,
    },
  };
}
