'use client';
import { useState } from 'react';
import {
  FATE_HOMES,
  HUMAN_HOMES,
  defaultHousing,
  homeOf,
  type FateHousing,
} from '@/lib/fate-housing';
import { FATE_CAST, fatePerson } from '@/lib/fate-cast';
import { useFate } from './fate-provider';
import styles from './fate-world.module.css';

export function FateHousingEditor() {
  const { save, loaded, setHousing } = useFate();
  const housing = save.life?.housing ?? defaultHousing();
  const stage = save.life?.waverStage ?? 'young';
  const [error, setError] = useState('');
  function update(value: FateHousing) {
    try {
      setHousing(value);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '住处未能保存');
    }
  }
  return (
    <section
      id="homes"
      className={styles.worldNotes}
      aria-labelledby="housing-title"
    >
      <div className={styles.sectionTitle}>
        <h2 id="housing-title">住处与家人</h2>
        <small>回家有去处，相处有缘由</small>
      </div>
      <div className={styles.noteGrid}>
        <div>
          <h3>生活从谁和谁住在一起开始。</h3>
          <p>
            切嗣、爱丽丝菲尔和伊莉雅同住新居；士郎在卫宫宅生活，切嗣会不时回来探望。从者随当前选择的御主居住。
          </p>
          <p>
            有多位御主的角色，这里先采用下方显示的居住安排，可自由调整；这不强制改写原作契约或恋爱关系。
          </p>
          <p>
            住址会影响回家、休息、做饭和室内相遇。目前用街道入口与状态呈现，独立室内画面待制作。
          </p>
          {Object.entries(FATE_HOMES).map(([id, home]) => {
            const residents = FATE_CAST.filter(
              (p) => homeOf(p.id, housing) === id,
            );
            return residents.length ? (
              <p key={id}>
                <b>{home.name}</b>
                <br />
                {residents.map((p) => fatePerson(p.id, stage)!.name).join('、')}
              </p>
            ) : null;
          })}
        </div>
        <fieldset className={styles.field} disabled={!loaded}>
          <legend>同住安排 · 自动保存</legend>
          <label>
            <input
              type="checkbox"
              checked={housing.sistersTogether}
              onChange={(e) =>
                update({ ...housing, sistersTogether: e.target.checked })
              }
            />{' '}
            让樱与凛一起住在远坂宅
          </label>
          <p>
            关闭时樱住在间桐宅。与樱关联的从者会随她搬家；同住不会直接消除姐妹之间的心结。
          </p>
          {Object.entries(housing.masters).map(([servant, master]) => (
            <label key={servant}>
              {fatePerson(servant, stage)!.name}随谁居住
              <select
                value={master}
                onChange={(e) =>
                  update({
                    ...housing,
                    masters: { ...housing.masters, [servant]: e.target.value },
                  })
                }
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 8,
                  marginTop: 6,
                  background: '#f3f0e8',
                  color: '#25382e',
                  border: '1px solid #b9bda9',
                  borderRadius: 4,
                }}
              >
                {Object.keys(HUMAN_HOMES).map((id) => (
                  <option key={id} value={id}>
                    {fatePerson(id, stage)?.name ?? '肯尼斯（住处预留）'}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {error && <p role="alert">{error}</p>}
        </fieldset>
      </div>
    </section>
  );
}
