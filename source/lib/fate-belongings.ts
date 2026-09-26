import {
  STREET_PARTNERS,
  fatePerson,
  isPartner,
  type PartnerId,
  type WaverStage,
} from './fate-cast';
import type { DailyLife, LifeAction, LifePlan } from './fate-life';
import { lifeRoutine } from './fate-habits';
import { canAfford, purchaseSupply, SUPPLY_PRICES } from './fate-economy';

export const SUPPLIES = {
  groceries: '一篮时蔬',
  parts: '修理零件',
  paper: '纸笔',
  book: '读物',
} as const;
export type SupplyId = keyof typeof SUPPLIES;
export const BOOKS = {
  saber: '料理与饮食随笔',
  rin: '魔术理论参考',
  shirou: '日用器具维修读本',
  sakura: '生活散文集',
  kiritsugu: '旅行随笔',
  irisviel: '城市见闻读物',
  illya: '图画故事书',
  taiga: '英语教学参考',
  diarmuid: '现代生活读本',
  cu: '河川与垂钓读物',
  waver: '魔术基础参考',
  'waver-adult': '术式分析资料',
  iskandar: '世界地理图册',
  medea: '结构与纹样图册',
  kuzuki: '教学参考读物',
  gilgamesh: '器物与审美图录',
  medusa: '静夜文学选集',
  tokiomi: '魔术传承与理论札记',
  kirei: '伦理与人性读本',
  kariya: '寻常生活纪事',
  emiya: '料理技法与火候随笔',
  natalia: '旅途观察手记',
} as const;
export type BookId = keyof typeof BOOKS;
type Hobby = 'read' | 'study' | 'repair' | 'cook';
export type Belongings = {
  groceries: number;
  parts: number;
  paper: number;
  book: { topic: BookId; progress: number; volume: number } | null;
  condition: number;
  repairs: number;
  notes: number;
  booksRead: number;
  dishes: number;
  wish: SupplyId | null;
  next: Hobby | null;
};
export type ItemEvent = {
  person: PartnerId;
  kind:
    | 'bought'
    | 'read'
    | 'noted'
    | 'repaired'
    | 'cooked'
    | 'wanted'
    | 'browsed';
  item: SupplyId;
};
export type ItemLog = (text: string, event: ItemEvent) => void;
const followup: Record<SupplyId, Hobby> = {
  groceries: 'cook',
  parts: 'repair',
  paper: 'study',
  book: 'read',
};
const count = (n: number) => Math.min(999999, n + 1);
export function emptyBelongings(): Belongings {
  return {
    groceries: 0,
    parts: 0,
    paper: 0,
    book: null,
    condition: 60,
    repairs: 0,
    notes: 0,
    booksRead: 0,
    dishes: 0,
    wish: null,
    next: null,
  };
}
export function createBelongings() {
  return Object.fromEntries(
    STREET_PARTNERS.map((id) => [id, emptyBelongings()]),
  ) as Record<PartnerId, Belongings>;
}
export function deviceName(id: PartnerId) {
  const addedDevices: Partial<Record<PartnerId, string>> = {
    gilgamesh: '书桌台灯',
    medusa: '床头阅读灯',
    tokiomi: '书房台灯',
    kirei: '门廊灯',
    kariya: '便携手电',
    emiya: '厨房计时器',
    natalia: '旅行手电',
  };
  if (addedDevices[id]) return addedDevices[id];
  return id === 'shirou'
    ? '旧台灯'
    : id === 'kiritsugu'
      ? '便携收音机'
      : id === 'diarmuid'
        ? '随身扣件'
        : '阅读灯';
}
export function bookTopic(id: PartnerId, stage: WaverStage): BookId {
  return id === 'waver' && stage === 'adult' ? 'waver-adult' : id;
}
function needs(s: Belongings, item: SupplyId) {
  return item === 'book'
    ? !s.book || s.book.progress >= 100
    : s[item] < (item === 'groceries' ? 3 : 4);
}
function usable(s: Belongings, hobby: Hobby) {
  return hobby === 'read'
    ? Boolean(s.book && s.book.progress < 100)
    : hobby === 'repair'
      ? s.parts > 0 && s.condition < 90
      : hobby === 'study'
        ? s.paper > 0
        : s.groceries > 0;
}
export function belongingsPlan(
  life: DailyLife,
  id: PartnerId,
): LifePlan | undefined {
  const s = life.belongings[id];
  if (s.wish && needs(s, s.wish) && canAfford(life.economy, id, s.wish))
    return {
      action: 'shop',
      reason: `手头想做的事还缺${SUPPLIES[s.wish]}，先去店里挑选，再回来继续。`,
    };
  if (s.next && usable(s, s.next))
    return {
      action: s.next,
      reason: `${lifeRoutine(id, life.waverStage).reasons[s.next]} ${s.next === 'read' ? `带上刚买的《${BOOKS[s.book!.topic]}》，接着读。` : s.next === 'repair' ? `刚补好的零件，可以用来修理${deviceName(id)}。` : s.next === 'study' ? '纸笔已备齐，把自己的想法认真写下来。' : '用买回的时蔬做一份配菜。'}`,
    };
  return undefined;
}
export function shoppingChoice(
  life: DailyLife,
  id: PartnerId,
): SupplyId | undefined {
  const s = life.belongings[id],
    weights = lifeRoutine(id, life.waverStage).weights;
  if (s.wish && needs(s, s.wish) && canAfford(life.economy, id, s.wish))
    return s.wish;
  const candidates = (Object.keys(SUPPLIES) as SupplyId[])
    .filter((item) => needs(s, item))
    .sort((a, b) => {
      const score = (item: SupplyId) =>
        item === 'book'
          ? weights.read
          : item === 'paper'
            ? weights.study - s.paper * 0.4
            : item === 'parts'
              ? weights.repair + (s.condition < 50 ? 0.5 : 0) - s.parts * 0.7
              : weights.cook +
                (life.people[id].hunger > 40 ? 0.4 : 0) -
                s.groceries * 0.7;
      return score(b) - score(a);
    });
  return (
    candidates.find((item) => canAfford(life.economy, id, item)) ??
    candidates[0]
  );
}
function want(
  life: DailyLife,
  id: PartnerId,
  item: SupplyId,
  text: string,
  log: ItemLog,
) {
  const s = life.belongings[id];
  if (s.wish === item) return;
  s.wish = item;
  log(`${fatePerson(id, life.waverStage)!.name}${text}`, {
    person: id,
    kind: 'wanted',
    item,
  });
}
/** Only called for an actually running, uncontrolled resident, after conversation holds. */
export function advanceBelongings(
  life: DailyLife,
  id: PartnerId,
  elapsed: number,
  log: ItemLog,
) {
  const s = life.belongings[id],
    action = life.people[id].activity;
  s.condition = Math.max(0, s.condition - elapsed * 0.005);
  if (
    action?.kind === 'read' &&
    action.meeting === undefined &&
    action.phase === 'doing' &&
    s.book &&
    s.book.progress < 100
  ) {
    s.book.progress = Math.min(
      100,
      s.book.progress + Math.min(elapsed, Math.max(0, action.remaining)) / 1.05,
    );
    if (s.book.progress >= 100) {
      s.booksRead = count(s.booksRead);
      log(
        `${fatePerson(id, life.waverStage)!.name}读到了《${BOOKS[s.book.topic]}》这一册的最后一页，把书签收了起来。`,
        { person: id, kind: 'read', item: 'book' },
      );
    }
  }
}
/** Completion is the transaction boundary: cancelling or merely walking never grants items or repairs. */
export function finishInterest(
  life: DailyLife,
  id: PartnerId,
  action: LifeAction,
  log: ItemLog,
) {
  const s = life.belongings[id],
    name = fatePerson(id, life.waverStage)!.name;
  if (s.next === action) s.next = null;
  if (action === 'shop') {
    const item = shoppingChoice(life, id);
    if (!item) {
      log(`${name}逛了逛店，手头的东西已经够用，这次没有买。`, {
        person: id,
        kind: 'browsed',
        item: 'book',
      });
      return;
    }
    const purchase = purchaseSupply(
      life.economy,
      id,
      item,
      life.minutes,
      life.people[id].choices,
    );
    if (purchase === 'duplicate') return;
    if (purchase === 'insufficient') {
      log(
        `${name}看了看${SUPPLIES[item]}，这次的生活点不够，先保留打算，去做些别的事。`,
        {
          person: id,
          kind: 'browsed',
          item,
        },
      );
      return;
    }
    if (item === 'book')
      s.book = {
        topic: bookTopic(id, life.waverStage),
        progress: 0,
        volume: Math.min(999999, (s.book?.volume ?? 0) + 1),
      };
    else
      s[item] = Math.min(
        item === 'groceries' ? 3 : 4,
        s[item] + (item === 'paper' ? 2 : 1),
      );
    if (s.wish === item) s.wish = null;
    s.next = followup[item];
    log(
      `${name}花了 ${SUPPLY_PRICES[item]} 生活点，挑好了${item === 'book' ? `《${BOOKS[s.book!.topic]}》` : SUPPLIES[item]}，带在身边，准备之后${{ book: '阅读', groceries: '做菜', parts: '修理', paper: '整理笔记' }[item]}。`,
      { person: id, kind: 'bought', item },
    );
  } else if (action === 'read') {
    if (!s.book) {
      want(
        life,
        id,
        'book',
        '翻阅了店里的公共读物，想挑一本感兴趣的书带着慢慢读。',
        log,
      );
      return;
    }
    log(
      `${name}合上了《${BOOKS[s.book.topic]}》，${s.book.progress >= 100 ? '这一册已经读完，留待日后翻看' : `书签留在约${Math.floor(s.book.progress)}%处，下次可以接着读`}。`,
      { person: id, kind: 'read', item: 'book' },
    );
  } else if (action === 'study') {
    if (!s.paper) {
      want(
        life,
        id,
        'paper',
        '梳理了手头的思路，发现需要补些纸笔才能记下新内容。',
        log,
      );
      return;
    }
    s.paper--;
    s.notes = count(s.notes);
    log(
      `${name}用一份纸笔整理好一页${id === 'taiga' || id === 'kuzuki' || (id === 'waver' && life.waverStage === 'adult') ? '教学札记' : id === 'rin' || id === 'medea' || id === 'waver' ? '推论笔记' : '生活札记'}，收在自己的资料里。`,
      { person: id, kind: 'noted', item: 'paper' },
    );
  } else if (action === 'repair') {
    if (s.condition >= 90) {
      log(`${name}检查了${deviceName(id)}，状态良好，暂时不用更换零件。`, {
        person: id,
        kind: 'browsed',
        item: 'parts',
      });
      return;
    }
    if (!s.parts) {
      want(
        life,
        id,
        'parts',
        `检查了${deviceName(id)}，想补些零件再动手修理。`,
        log,
      );
      return;
    }
    s.parts--;
    s.condition = Math.min(100, s.condition + 45);
    s.repairs = count(s.repairs);
    log(
      `${name}用一份零件修好了${deviceName(id)}的磨损部位，完好程度恢复到${Math.round(s.condition)}%。`,
      { person: id, kind: 'repaired', item: 'parts' },
    );
  }
}
export function finishSideDish(
  life: DailyLife,
  id: PartnerId,
  log: ItemLog,
): boolean {
  const s = life.belongings[id];
  if (!s.groceries) return false;
  s.groceries--;
  s.dishes = count(s.dishes);
  if (s.next === 'cook') s.next = null;
  log(
    `${fatePerson(id, life.waverStage)!.name}用带回的一篮时蔬做好了一份配菜，和这餐一起吃。`,
    { person: id, kind: 'cooked', item: 'groceries' },
  );
  return true;
}
export function belongingsSummary(life: DailyLife, id: PartnerId) {
  const s = life.belongings[id];
  return `时蔬 ${s.groceries} 篮 · 零件 ${s.parts} 份 · 纸笔 ${s.paper} 份；${s.book ? `《${BOOKS[s.book.topic]}》第${s.book.volume}册，已读${Math.floor(s.book.progress)}%` : '还没有自购读物'}；${deviceName(id)}完好${Math.round(s.condition)}%；已整理${s.notes}页札记、修理${s.repairs}次、做配菜${s.dishes}份${s.wish ? `；想补${SUPPLIES[s.wish]}` : ''}。`;
}
export function parseItemEvent(value: unknown): ItemEvent {
  const e = value as ItemEvent;
  if (
    !e ||
    !isPartner(e.person) ||
    ![
      'bought',
      'read',
      'noted',
      'repaired',
      'cooked',
      'wanted',
      'browsed',
    ].includes(e.kind) ||
    !Object.hasOwn(SUPPLIES, e.item)
  )
    throw new Error('物品经历无效');
  return { person: e.person, kind: e.kind, item: e.item };
}
export function parseBelongings(
  value: unknown,
  requiredIds: readonly PartnerId[] = STREET_PARTNERS,
): Record<PartnerId, Belongings> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('随身物品无效');
  const data = value as Record<PartnerId, Belongings>,
    result = createBelongings();
  const integer = (n: number, max: number) =>
    Number.isSafeInteger(n) && n >= 0 && n <= max;
  for (const id of requiredIds) {
    const s = data[id];
    if (
      !s ||
      !integer(s.groceries, 3) ||
      !integer(s.parts, 4) ||
      !integer(s.paper, 4) ||
      ![s.notes, s.repairs, s.booksRead, s.dishes].every((n) =>
        integer(n, 999999),
      ) ||
      !Number.isFinite(s.condition) ||
      s.condition < 0 ||
      s.condition > 100 ||
      (s.wish !== null && !Object.hasOwn(SUPPLIES, s.wish)) ||
      (s.next !== null && !['read', 'study', 'repair', 'cook'].includes(s.next))
    )
      throw new Error('随身物品无效');
    if (
      s.book !== null &&
      (!s.book ||
        !Object.hasOwn(BOOKS, s.book.topic) ||
        !Number.isFinite(s.book.progress) ||
        s.book.progress < 0 ||
        s.book.progress > 100 ||
        !integer(s.book.volume, 999999) ||
        s.book.volume < 1 ||
        s.booksRead > s.book.volume)
    )
      throw new Error('读物进度无效');
    result[id] = {
      groceries: s.groceries,
      parts: s.parts,
      paper: s.paper,
      book: s.book
        ? {
            topic: s.book.topic,
            progress: s.book.progress,
            volume: s.book.volume,
          }
        : null,
      condition: s.condition,
      repairs: s.repairs,
      notes: s.notes,
      booksRead: s.booksRead,
      dishes: s.dishes,
      wish: s.wish,
      next: s.next,
    };
  }
  return result;
}
