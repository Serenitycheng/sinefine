import { STREET_PARTNERS, type PartnerId } from './fate-cast';
import type { SupplyId } from './fate-belongings';

/** Fictional living points, not wages, real-world currency or prices. Basic meals remain free. */
export const DAILY_BUDGET = 100;
export const MAX_BALANCE = 999999;
export const MAX_ECONOMY_ENTRIES = 20;
export const SUPPLY_PRICES: Record<SupplyId, number> = {
  groceries: 18,
  parts: 24,
  paper: 12,
  book: 30,
};
export type EconomyEntry = {
  minute: number;
  kind: 'budget' | 'purchase';
  amount: number;
  balance: number;
  item?: SupplyId;
  choice?: number;
};
export type EconomyAccount = {
  balance: number;
  lastBudgetDay: number;
  lastShopChoice: number | null;
  recent: EconomyEntry[];
};
export type Economy = { accounts: Record<PartnerId, EconomyAccount> };

const integer = (
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= max;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
function dayOf(minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1e9)
    throw new Error('生活账本时间无效');
  return Math.floor(minutes / 1440);
}
function record(account: EconomyAccount, entry: EconomyEntry) {
  account.recent = [...account.recent, entry].slice(-MAX_ECONOMY_ENTRIES);
}

/** An old save starts here on its current game day; no historic allowance is backfilled. */
export function createEconomy(minutes: number): Economy {
  const day = dayOf(minutes);
  return {
    accounts: Object.fromEntries(
      STREET_PARTNERS.map((id) => [
        id,
        {
          balance: DAILY_BUDGET,
          lastBudgetDay: day,
          lastShopChoice: null,
          recent: [
            {
              minute: minutes,
              kind: 'budget',
              amount: DAILY_BUDGET,
              balance: DAILY_BUDGET,
            },
          ],
        },
      ]),
    ) as Record<PartnerId, EconomyAccount>,
  };
}

/** Call only after running simulation time advances. A skipped day does not earn offline income. */
export function advanceEconomy(economy: Economy, minutes: number): void {
  const day = dayOf(minutes);
  for (const id of STREET_PARTNERS) {
    const account = economy.accounts[id];
    if (day <= account.lastBudgetDay) continue;
    const amount = Math.min(DAILY_BUDGET, MAX_BALANCE - account.balance);
    account.lastBudgetDay = day;
    if (!amount) continue;
    account.balance += amount;
    record(account, {
      minute: minutes,
      kind: 'budget',
      amount,
      balance: account.balance,
    });
  }
}

export function canAfford(
  economy: Economy,
  id: PartnerId,
  item: SupplyId,
): boolean {
  return economy.accounts[id].balance >= SUPPLY_PRICES[item];
}

/** One completion token per actor: retries, including after reload, cannot buy twice. */
export function purchaseSupply(
  economy: Economy,
  id: PartnerId,
  item: SupplyId,
  minutes: number,
  choice: number,
): 'bought' | 'insufficient' | 'duplicate' {
  dayOf(minutes);
  const account = economy.accounts[id];
  if (
    !integer(choice) ||
    !integer(account.balance, MAX_BALANCE) ||
    !Object.hasOwn(SUPPLY_PRICES, item)
  )
    throw new Error('购物账目无效');
  if (account.lastShopChoice !== null && choice <= account.lastShopChoice)
    return 'duplicate';
  account.lastShopChoice = choice;
  if (!canAfford(economy, id, item)) return 'insufficient';
  const amount = -SUPPLY_PRICES[item];
  account.balance += amount;
  record(account, {
    minute: minutes,
    kind: 'purchase',
    amount,
    balance: account.balance,
    item,
    choice,
  });
  return 'bought';
}

/** Strict read: validate chronology, receipt amounts and running balances without granting money. */
export function parseEconomy(value: unknown, minutes: number): Economy {
  const day = dayOf(minutes);
  if (!object(value) || !object(value.accounts))
    throw new Error('生活账本无效');
  const result = {} as Record<PartnerId, EconomyAccount>;
  for (const id of STREET_PARTNERS) {
    const account = value.accounts[id];
    if (
      !object(account) ||
      !integer(account.balance, MAX_BALANCE) ||
      !integer(account.lastBudgetDay, day) ||
      (account.lastShopChoice !== null && !integer(account.lastShopChoice)) ||
      !Array.isArray(account.recent) ||
      account.recent.length < 1 ||
      account.recent.length > MAX_ECONOMY_ENTRIES
    )
      throw new Error('生活账本无效');
    const recent: EconomyEntry[] = [];
    let previousMinute = -1;
    let previousBalance: number | undefined;
    let budgetDay = -1;
    let purchaseChoice = -1;
    for (const entry of account.recent) {
      if (
        !object(entry) ||
        typeof entry.minute !== 'number' ||
        !Number.isFinite(entry.minute) ||
        entry.minute < 0 ||
        entry.minute > minutes ||
        entry.minute < previousMinute ||
        !integer(entry.balance, MAX_BALANCE) ||
        !Number.isSafeInteger(entry.amount) ||
        typeof entry.amount !== 'number' ||
        entry.amount === 0
      )
        throw new Error('收支记录无效');
      const before = entry.balance - entry.amount;
      if (
        !integer(before, MAX_BALANCE) ||
        (previousBalance !== undefined && before !== previousBalance)
      )
        throw new Error('收支余额不一致');
      if (entry.kind === 'budget') {
        const entryDay = Math.floor(entry.minute / 1440);
        if (
          entry.amount !== Math.min(DAILY_BUDGET, MAX_BALANCE - before) ||
          entryDay <= budgetDay ||
          entryDay > account.lastBudgetDay ||
          entry.item !== undefined ||
          entry.choice !== undefined
        )
          throw new Error('每日预算记录无效');
        budgetDay = entryDay;
        recent.push({
          minute: entry.minute,
          kind: 'budget',
          amount: entry.amount,
          balance: entry.balance,
        });
      } else if (entry.kind === 'purchase') {
        if (
          typeof entry.item !== 'string' ||
          !Object.hasOwn(SUPPLY_PRICES, entry.item) ||
          entry.amount !== -SUPPLY_PRICES[entry.item as SupplyId] ||
          !integer(entry.choice) ||
          entry.choice <= purchaseChoice ||
          account.lastShopChoice === null ||
          entry.choice > account.lastShopChoice
        )
          throw new Error('购物收支记录无效');
        purchaseChoice = entry.choice;
        recent.push({
          minute: entry.minute,
          kind: 'purchase',
          amount: entry.amount,
          balance: entry.balance,
          item: entry.item as SupplyId,
          choice: entry.choice,
        });
      } else throw new Error('收支类型无效');
      previousMinute = entry.minute;
      previousBalance = entry.balance;
    }
    if (previousBalance !== account.balance)
      throw new Error('当前余额与账本不一致');
    result[id] = {
      balance: account.balance,
      lastBudgetDay: account.lastBudgetDay,
      lastShopChoice: account.lastShopChoice as number | null,
      recent,
    };
  }
  return { accounts: result };
}

export function economySummary(economy: Economy, id: PartnerId): string {
  const account = economy.accounts[id];
  return `余额 ${account.balance} 生活点；每日预算 ${DAILY_BUDGET} 点（游戏设定，非真实物价）；基础餐食不扣生活点。`;
}
