export const NATURE_STORAGE_KEY = 'sinefine-nature-v1';
export const NATURE_BACKUP_KEY = `${NATURE_STORAGE_KEY}-backup`;
export const NATURE_ORIGINAL_RECOVERY_KEY = `${NATURE_STORAGE_KEY}-original-recovery`;
export const NATURE_WIDTH = 18;
export const NATURE_HEIGHT = 12;
export const NATURE_CAPS = { grazer: 72, predator: 18 } as const;
export const MAX_NATURE_TICK = 1_000_000;
const PATCH_COUNT = NATURE_WIDTH * NATURE_HEIGHT;
const MAX_LOG = 60;
const MAX_HISTORY = 96;

export type NatureSpecies = 'grazer' | 'predator';
export type NatureWeather = 'sun' | 'cloud' | 'rain' | 'dry';
export type NatureParameters = {
  rainfall: number;
  fertility: number;
  refuge: number;
};
export type NatureAnimal = {
  id: number;
  species: NatureSpecies;
  x: number;
  y: number;
  energy: number;
  age: number;
  cooldown: number;
};
export type NatureSnapshot = {
  tick: number;
  plants: number;
  grazers: number;
  predators: number;
  water: number;
};
export type NatureEvent = {
  id: number;
  tick: number;
  kind: 'weather' | 'life' | 'care';
  text: string;
};
export type NatureWorld = {
  seed: string;
  rng: number;
  tick: number;
  nextId: number;
  nextEvent: number;
  weather: NatureWeather;
  water: number;
  parameters: NatureParameters;
  patches: number[];
  animals: NatureAnimal[];
  events: NatureEvent[];
  history: NatureSnapshot[];
  births: number;
  deaths: number;
};
export type NatureIntervention = 'water' | 'seed' | NatureSpecies;
export const NATURE_WEATHER: Record<NatureWeather, string> = {
  sun: '晴朗',
  cloud: '多云',
  rain: '降雨',
  dry: '干热',
};
export const NATURE_DEFAULTS: NatureParameters = {
  rainfall: 55,
  fertility: 100,
  refuge: 40,
};
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

function random(world: NatureWorld) {
  world.rng = (Math.imul(world.rng, 1664525) + 1013904223) >>> 0;
  return world.rng / 4294967296;
}
function addEvent(world: NatureWorld, kind: NatureEvent['kind'], text: string) {
  // Compact identifiers before the storage bound; retained records stay ordered.
  if (world.nextEvent >= 1_000_000_000) {
    world.events.forEach((event, index) => {
      event.id = index + 1;
    });
    world.nextEvent = world.events.length + 1;
  }
  world.events.push({ id: world.nextEvent++, tick: world.tick, kind, text });
  world.events = world.events.slice(-MAX_LOG);
}
function addAnimal(
  world: NatureWorld,
  species: NatureSpecies,
  parent?: NatureAnimal,
) {
  if (world.nextId >= 1_000_000_000) {
    world.animals.forEach((animal, index) => {
      animal.id = index + 1;
    });
    world.nextId = world.animals.length + 1;
  }
  world.animals.push({
    id: world.nextId++,
    species,
    x: parent
      ? clamp(parent.x + Math.floor(random(world) * 3) - 1, 0, NATURE_WIDTH - 1)
      : Math.floor(random(world) * NATURE_WIDTH),
    y: parent
      ? clamp(
          parent.y + Math.floor(random(world) * 3) - 1,
          0,
          NATURE_HEIGHT - 1,
        )
      : Math.floor(random(world) * NATURE_HEIGHT),
    energy: 65,
    age: parent ? 0 : Math.floor(random(world) * 35),
    cooldown: 12,
  });
}
export function natureSnapshot(world: NatureWorld): NatureSnapshot {
  return {
    tick: world.tick,
    plants: world.patches.reduce((sum, amount) => sum + amount, 0),
    grazers: world.animals.filter((animal) => animal.species === 'grazer')
      .length,
    predators: world.animals.filter((animal) => animal.species === 'predator')
      .length,
    water: world.water,
  };
}
function remember(world: NatureWorld) {
  const point = natureSnapshot(world);
  if (world.history.at(-1)?.tick === point.tick)
    world.history[world.history.length - 1] = point;
  else world.history.push(point);
  world.history = world.history.slice(-MAX_HISTORY);
}
export function natureTime(tick: number) {
  return `第 ${Math.floor(tick / 6) + 1} 天 · ${String((tick % 6) * 4).padStart(2, '0')}:00`;
}
export function createNatureWorld(seed = 'quiet-valley'): NatureWorld {
  const normalized = seed.trim();
  if (!normalized || normalized.length > 40)
    throw new Error('种子需为 1–40 个字符。');
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index++)
    hash = Math.imul(hash ^ normalized.charCodeAt(index), 16777619);
  const world: NatureWorld = {
    seed: normalized,
    rng: hash >>> 0,
    tick: 0,
    nextId: 1,
    nextEvent: 1,
    weather: 'cloud',
    water: 68,
    parameters: { ...NATURE_DEFAULTS },
    patches: [],
    animals: [],
    events: [],
    history: [],
    births: 0,
    deaths: 0,
  };
  world.patches = Array.from(
    { length: PATCH_COUNT },
    () => Math.floor(random(world) * 6) + 2,
  );
  for (let index = 0; index < 24; index++) addAnimal(world, 'grazer');
  for (let index = 0; index < 5; index++) addAnimal(world, 'predator');
  addEvent(
    world,
    'life',
    '山谷苏醒：草木、24 只草食动物与 5 只捕食者，在这里开始生活。',
  );
  remember(world);
  return world;
}

/** One bounded, deterministic four-hour turn. No wall-clock or browser dependencies. */
export function stepNature(input: NatureWorld): NatureWorld {
  if (input.tick >= MAX_NATURE_TICK) return input;
  const world = structuredClone(input);
  world.tick++;
  if (world.tick % 6 === 1) {
    const roll = random(world),
      rain = world.parameters.rainfall / 100;
    const weather =
      roll < rain * 0.7
        ? 'rain'
        : roll < rain * 0.7 + 0.24
          ? 'cloud'
          : roll > 0.76 + rain * 0.2
            ? 'dry'
            : 'sun';
    if (weather !== world.weather)
      addEvent(
        world,
        'weather',
        `天气转为${NATURE_WEATHER[weather]}，水分与植物生长随之变化。`,
      );
    world.weather = weather;
  }
  const supply = { rain: 17, cloud: -1, sun: -4, dry: -8 }[world.weather];
  world.water =
    Math.round(
      clamp(world.water + supply - world.animals.length * 0.025, 0, 100) * 10,
    ) / 10;
  for (let index = 0; index < PATCH_COUNT; index++) {
    const roll = random(world);
    if (world.water < 18 && roll < 0.32)
      world.patches[index] = Math.max(0, world.patches[index] - 1);
    else if (
      world.water >= 18 &&
      roll <
        ((0.22 * world.parameters.fertility) / 100) *
          Math.min(world.water / 60, 1.3)
    )
      world.patches[index] = Math.min(9, world.patches[index] + 1);
  }
  const dead = new Set<number>();
  let born = 0,
    hunted = 0,
    lost = 0;
  const grazers = world.animals.filter((animal) => animal.species === 'grazer');
  const predators = world.animals.filter(
    (animal) => animal.species === 'predator',
  );
  for (const animal of grazers) {
    let best = -Infinity,
      target = { x: animal.x, y: animal.y };
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = animal.x + dx,
          y = animal.y + dy;
        if (x < 0 || y < 0 || x >= NATURE_WIDTH || y >= NATURE_HEIGHT) continue;
        const threat = predators.some(
          (predator) => Math.abs(predator.x - x) + Math.abs(predator.y - y) < 3,
        )
          ? 3
          : 0;
        const score =
          world.patches[y * NATURE_WIDTH + x] + random(world) * 2 - threat;
        if (score > best) {
          best = score;
          target = { x, y };
        }
      }
    animal.x = target.x;
    animal.y = target.y;
    const index = animal.y * NATURE_WIDTH + animal.x;
    const eaten = Math.min(2, world.patches[index]);
    world.patches[index] -= eaten;
    animal.energy = clamp(
      animal.energy - 8 - (world.water < 15 ? 10 : 0) + eaten * 7,
      0,
      100,
    );
  }
  for (const animal of predators) {
    const prey = grazers
      .filter((item) => !dead.has(item.id) && item.energy > 0)
      .sort(
        (a, b) =>
          Math.abs(a.x - animal.x) +
          Math.abs(a.y - animal.y) -
          Math.abs(b.x - animal.x) -
          Math.abs(b.y - animal.y),
      )[0];
    animal.energy = Math.max(0, animal.energy - 5 - (world.water < 15 ? 7 : 0));
    if (prey) {
      animal.x += Math.sign(prey.x - animal.x);
      animal.y += Math.sign(prey.y - animal.y);
      if (
        Math.abs(prey.x - animal.x) + Math.abs(prey.y - animal.y) <= 1 &&
        random(world) > 0.28 + world.parameters.refuge / 160
      ) {
        dead.add(prey.id);
        hunted++;
        animal.energy = Math.min(100, animal.energy + 42);
      }
    } else {
      animal.x = clamp(
        animal.x + Math.floor(random(world) * 3) - 1,
        0,
        NATURE_WIDTH - 1,
      );
      animal.y = clamp(
        animal.y + Math.floor(random(world) * 3) - 1,
        0,
        NATURE_HEIGHT - 1,
      );
    }
  }
  for (const animal of world.animals) {
    animal.age++;
    animal.cooldown = Math.max(0, animal.cooldown - 1);
    if (
      !dead.has(animal.id) &&
      (animal.energy <= 0 ||
        animal.age >= (animal.species === 'grazer' ? 180 : 270))
    ) {
      dead.add(animal.id);
      lost++;
    }
  }
  world.animals = world.animals.filter((animal) => !dead.has(animal.id));
  const count = {
    grazer: world.animals.filter((animal) => animal.species === 'grazer')
      .length,
    predator: world.animals.filter((animal) => animal.species === 'predator')
      .length,
  };
  // Snapshot eligible parents before adding newborns to the live population.
  const parents = world.animals.filter((animal) => animal.age >= 12);
  for (const animal of parents) {
    if (
      animal.energy < 79 ||
      animal.age < 12 ||
      animal.cooldown > 0 ||
      count[animal.species] >= NATURE_CAPS[animal.species]
    )
      continue;
    if (random(world) < (animal.species === 'grazer' ? 0.24 : 0.12)) {
      animal.energy -= 28;
      animal.cooldown = animal.species === 'grazer' ? 12 : 24;
      addAnimal(world, animal.species, animal);
      count[animal.species]++;
      born++;
    }
  }
  world.births = Math.min(1_000_000_000, world.births + born);
  world.deaths = Math.min(1_000_000_000, world.deaths + hunted + lost);
  if (born)
    addEvent(
      world,
      'life',
      `${born} 个新生命诞生。食物与精力充足时，种群有机会繁衍。`,
    );
  if (hunted)
    addEvent(world, 'life', `${hunted} 只草食动物被捕食，捕食者获得了食物。`);
  if (lost)
    addEvent(world, 'life', `${lost} 只动物因缺乏食物、水分或寿命结束而离开。`);
  for (const species of ['grazer', 'predator'] as const)
    if (
      input.animals.some((animal) => animal.species === species) &&
      !count[species]
    )
      addEvent(
        world,
        'life',
        `${species === 'grazer' ? '草食动物' : '捕食者'}在山谷中暂时消失。你可以调整环境后重新引入。`,
      );
  remember(world);
  return world;
}

export function setNatureParameters(
  input: NatureWorld,
  parameters: NatureParameters,
): NatureWorld {
  validateParameters(parameters);
  const world = structuredClone(input);
  world.parameters = { ...parameters };
  addEvent(
    world,
    'care',
    `环境已调整：降雨倾向 ${parameters.rainfall}%，生长速度 ${parameters.fertility}%，庇护密度 ${parameters.refuge}%。`,
  );
  return world;
}
export function interveneNature(
  input: NatureWorld,
  action: NatureIntervention,
): NatureWorld {
  const world = structuredClone(input);
  if (action === 'water') {
    const added = Math.min(25, 100 - world.water);
    world.water = Math.round((world.water + added) * 10) / 10;
    addEvent(world, 'care', `补充水源，山谷水分增加 ${Math.round(added)} 点。`);
  } else if (action === 'seed') {
    const before = natureSnapshot(world).plants;
    for (let index = 0; index < 36; index++) {
      const patch = Math.floor(random(world) * PATCH_COUNT);
      world.patches[patch] = Math.min(9, world.patches[patch] + 3);
    }
    addEvent(
      world,
      'care',
      `播下一些种子，植物资源增加 ${natureSnapshot(world).plants - before}。`,
    );
  } else {
    const count = world.animals.filter(
      (animal) => animal.species === action,
    ).length;
    const added = Math.min(
      action === 'grazer' ? 6 : 2,
      NATURE_CAPS[action] - count,
    );
    for (let index = 0; index < added; index++) addAnimal(world, action);
    addEvent(
      world,
      'care',
      added
        ? `引入 ${added} 只${action === 'grazer' ? '草食动物' : '捕食者'}，它们开始寻找食物。`
        : '这类动物已经达到山谷的观察上限。',
    );
  }
  remember(world);
  return world;
}

function record(
  value: unknown,
  keys: string[],
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label}格式不正确。`);
  const object = value as Record<string, unknown>;
  if (
    Object.keys(object).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(object, key))
  )
    throw new Error(`${label}字段不完整或包含未知字段。`);
  return object;
}
function validateParameters(value: unknown): asserts value is NatureParameters {
  const parameters = record(
    value,
    ['rainfall', 'fertility', 'refuge'],
    '环境参数',
  );
  if (
    !integer(parameters.rainfall, 0, 100) ||
    !integer(parameters.fertility, 20, 180) ||
    !integer(parameters.refuge, 0, 80)
  )
    throw new Error('环境参数超出范围。');
}
function boundedNumber(value: unknown, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max
  );
}
export function parseNatureSave(raw: string): NatureWorld {
  if (raw.length > 1_000_000)
    throw new Error('文件过大，请选择自然界导出的进度文件。');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('文件不是有效的 JSON 进度。');
  }
  const save = record(parsed, ['format', 'version', 'world'], '进度');
  if (save.format !== 'sinefine-nature' || save.version !== 1)
    throw new Error('这不是受支持的自然界进度，不能导入其他模式的存档。');
  const world = record(
    save.world,
    [
      'seed',
      'rng',
      'tick',
      'nextId',
      'nextEvent',
      'weather',
      'water',
      'parameters',
      'patches',
      'animals',
      'events',
      'history',
      'births',
      'deaths',
    ],
    '世界',
  );
  if (
    typeof world.seed !== 'string' ||
    !world.seed.trim() ||
    world.seed.length > 40 ||
    !integer(world.rng, 0, 4294967295) ||
    !integer(world.tick, 0, MAX_NATURE_TICK) ||
    !integer(world.nextId, 1, 1_000_000_000) ||
    !integer(world.nextEvent, 1, 1_000_000_000) ||
    !boundedNumber(world.water, 100) ||
    typeof world.weather !== 'string' ||
    !Object.hasOwn(NATURE_WEATHER, world.weather) ||
    !integer(world.births, 0, 1_000_000_000) ||
    !integer(world.deaths, 0, 1_000_000_000)
  )
    throw new Error('世界状态超出范围。');
  validateParameters(world.parameters);
  if (
    !Array.isArray(world.patches) ||
    world.patches.length !== PATCH_COUNT ||
    world.patches.some((patch) => !integer(patch, 0, 9))
  )
    throw new Error('植被地图不完整或超出范围。');
  if (!Array.isArray(world.animals) || world.animals.length > 90)
    throw new Error('动物数量超出范围。');
  const ids = new Set<number>(),
    counts = { grazer: 0, predator: 0 };
  for (const value of world.animals) {
    const animal = record(
      value,
      ['id', 'species', 'x', 'y', 'energy', 'age', 'cooldown'],
      '动物',
    );
    if (
      !integer(animal.id, 1, world.nextId - 1) ||
      ids.has(animal.id) ||
      (animal.species !== 'grazer' && animal.species !== 'predator') ||
      !integer(animal.x, 0, NATURE_WIDTH - 1) ||
      !integer(animal.y, 0, NATURE_HEIGHT - 1) ||
      !integer(animal.energy, 0, 100) ||
      !integer(animal.age, 0, 270) ||
      !integer(animal.cooldown, 0, 24)
    )
      throw new Error('动物状态不正确或标识重复。');
    ids.add(animal.id);
    counts[animal.species]++;
  }
  if (
    counts.grazer > NATURE_CAPS.grazer ||
    counts.predator > NATURE_CAPS.predator
  )
    throw new Error('种群超过山谷容量。');
  if (!Array.isArray(world.events) || world.events.length > MAX_LOG)
    throw new Error('日志数量超出范围。');
  let lastEvent = 0,
    lastEventTick = 0;
  for (const value of world.events) {
    const event = record(value, ['id', 'tick', 'kind', 'text'], '日志');
    if (
      !integer(event.id, lastEvent + 1, world.nextEvent - 1) ||
      !integer(event.tick, lastEventTick, world.tick) ||
      typeof event.kind !== 'string' ||
      !['weather', 'life', 'care'].includes(event.kind) ||
      typeof event.text !== 'string' ||
      !event.text.trim() ||
      event.text.length > 220
    )
      throw new Error('日志内容不正确。');
    lastEvent = event.id;
    lastEventTick = event.tick;
  }
  if (
    !Array.isArray(world.history) ||
    !world.history.length ||
    world.history.length > MAX_HISTORY
  )
    throw new Error('观察记录数量不正确。');
  let lastTick = -1;
  for (const value of world.history) {
    const point = record(
      value,
      ['tick', 'plants', 'grazers', 'predators', 'water'],
      '观察记录',
    );
    if (
      !integer(point.tick, lastTick + 1, world.tick) ||
      !integer(point.plants, 0, PATCH_COUNT * 9) ||
      !integer(point.grazers, 0, NATURE_CAPS.grazer) ||
      !integer(point.predators, 0, NATURE_CAPS.predator) ||
      !boundedNumber(point.water, 100)
    )
      throw new Error('观察记录超出范围或时间顺序错误。');
    lastTick = point.tick;
  }
  const result = world as unknown as NatureWorld;
  const final = result.history.at(-1)!,
    expected = natureSnapshot(result);
  if (
    Object.keys(expected).some(
      (key) =>
        final[key as keyof NatureSnapshot] !==
        expected[key as keyof NatureSnapshot],
    )
  )
    throw new Error('最新观察记录与当前世界不一致。');
  return result;
}
export function serializeNature(world: NatureWorld) {
  return JSON.stringify({ format: 'sinefine-nature', version: 1, world });
}
export type NatureStorage = Pick<Storage, 'getItem' | 'setItem'>;
export class NatureStorageConflict extends Error {
  constructor() {
    super('预览期间另一页更新了进度，本次替换已取消。请重新读取并预览。');
    this.name = 'NatureStorageConflict';
  }
}
/** Backup must succeed before replacing the current save; callers keep their state on failure. */
export function replaceNatureSave(
  storage: NatureStorage,
  next: NatureWorld,
  current?: NatureWorld,
  expectedRaw?: string | null,
) {
  const serialized = serializeNature(next);
  parseNatureSave(serialized);
  const raw = storage.getItem(NATURE_STORAGE_KEY);
  if (expectedRaw !== undefined && raw !== expectedRaw)
    throw new NatureStorageConflict();
  const previous = current ? serializeNature(current) : raw;
  if (current && previous !== null) parseNatureSave(previous);
  let damaged = false;
  if (raw !== null) {
    try {
      parseNatureSave(raw);
    } catch {
      damaged = true;
    }
  }
  // Keep damaged bytes separately so a usable in-memory world is recoverable too.
  if (damaged && raw !== null)
    storage.setItem(NATURE_ORIGINAL_RECOVERY_KEY, raw);
  if (previous !== null) storage.setItem(NATURE_BACKUP_KEY, previous);
  if (storage.getItem(NATURE_STORAGE_KEY) !== raw)
    throw new NatureStorageConflict();
  storage.setItem(NATURE_STORAGE_KEY, serialized);
  return serialized;
}
