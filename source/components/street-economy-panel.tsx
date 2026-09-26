'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { fatePerson, isPartner, STREET_PARTNERS } from '@/lib/fate-cast';
import { SUPPLIES, type SupplyId } from '@/lib/fate-belongings';
import { DAILY_BUDGET, SUPPLY_PRICES } from '@/lib/fate-economy';
import { lifeTime, type DailyLife } from '@/lib/fate-life';
import styles from './street-economy.module.css';

export function StreetEconomyPanel({ life }: { life: DailyLife }) {
  const [selected, setSelected] =
    useState<(typeof STREET_PARTNERS)[number]>('saber');
  const account = life.economy.accounts[selected];
  const person = fatePerson(selected, life.waverStage)!;
  return (
    <section className={styles.ledger} aria-labelledby="life-economy-title">
      <h3 id="life-economy-title">
        <Wallet size={15} />
        生活账本
      </h3>
      <label htmlFor="life-economy-person">查看谁的账本</label>
      <select
        id="life-economy-person"
        value={selected}
        onChange={(event) => {
          if (isPartner(event.target.value)) setSelected(event.target.value);
        }}
      >
        {STREET_PARTNERS.map((id) => (
          <option key={id} value={id}>
            {fatePerson(id, life.waverStage)!.name}
          </option>
        ))}
      </select>
      <div className={styles.balance}>
        <span>{person.name}的余额</span>
        <strong>
          {account.balance}
          <small> 生活点</small>
        </strong>
      </div>
      <p>
        每个故事日补入 {DAILY_BUDGET}{' '}
        生活点，结余保留。购物完成时付款；预算不足就先做别的事，基础餐食照常供应。
      </p>
      <details>
        <summary>日用品价目</summary>
        <ul className={styles.prices}>
          {(Object.keys(SUPPLY_PRICES) as SupplyId[]).map((item) => (
            <li key={item}>
              <span>{SUPPLIES[item]}</span>
              <b>{SUPPLY_PRICES[item]} 点</b>
            </li>
          ))}
        </ul>
        <p>生活点是游戏内的日常预算，不涉及充值或真实货币。</p>
      </details>
      <h4>最近收支</h4>
      {account.recent.length ? (
        <ol className={styles.entries} aria-label={`${person.name}最近收支`}>
          {account.recent
            .slice()
            .reverse()
            .map((entry, index) => (
              <li
                key={`${entry.minute}-${entry.kind}-${entry.choice ?? index}`}
              >
                <div>
                  <span>
                    {entry.kind === 'budget'
                      ? '生活预算'
                      : `购买${entry.item ? SUPPLIES[entry.item] : '日用品'}`}
                  </span>
                  <b
                    className={
                      entry.amount >= 0 ? styles.income : styles.expense
                    }
                  >
                    {entry.amount > 0 ? '+' : ''}
                    {entry.amount}
                  </b>
                </div>
                <small>
                  {lifeTime(entry.minute)} · 结余 {entry.balance} 点
                </small>
              </li>
            ))}
        </ol>
      ) : (
        <p>还没有收支记录。</p>
      )}
      <p className={styles.note}>
        保留最近 20 笔，随存档保存。离开页面时日常暂停。
      </p>
    </section>
  );
}
