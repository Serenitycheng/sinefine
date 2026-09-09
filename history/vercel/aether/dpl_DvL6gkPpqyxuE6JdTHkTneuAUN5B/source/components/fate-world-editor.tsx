'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Feather } from 'lucide-react';
import {
  FATE_CAST,
  fatePerson,
  isPartner,
  type WaverStage,
} from '@/lib/fate-cast';
import { useFate } from './fate-provider';
import styles from './fate-world.module.css';

export function FateWorldEditor() {
  const { save, loaded, storageNotice, updateSettings, setWaverStage } =
    useFate();
  const [selected, setSelected] = useState('kiritsugu');
  const stage = save.life?.waverStage ?? 'young';
  const [stageError, setStageError] = useState('');
  const person = fatePerson(selected, stage)!;
  function changeStage(value: WaverStage) {
    try {
      setWaverStage(value);
      setStageError('');
    } catch (error) {
      setStageError(
        error instanceof Error ? error.message : '暂时无法保存，请重试。',
      );
    }
  }
  const characterNote = save.characterNotes[selected] || '';
  const relationshipNote = save.relationshipNotes[selected] || '';
  function setNote(
    field: 'characterNotes' | 'relationshipNotes',
    note: string,
  ) {
    updateSettings({ ...save, [field]: { ...save[field], [selected]: note } });
  }

  return (
    <>
      <section
        aria-labelledby="world-notes-title"
        className={styles.worldNotes}
      >
        <div className={styles.sectionTitle}>
          <span>02</span>
          <h2 id="world-notes-title">世界的补充页</h2>
          <small>随时可以续写</small>
        </div>
        <div className={styles.noteGrid}>
          <div>
            <Feather size={23} strokeWidth={1.2} />
            <h3>用你自己的话，写下规则。</h3>
            <p>
              例如居民如何生活、共同经历过什么，或暂时不想发生的事。没有写到的部分沿用上方开局。
            </p>
            <p>日后想确定谁记得哪些往事，也可以在这里补充。</p>
          </div>
          <div className={styles.field}>
            <label htmlFor="fate-world-note">世界补充</label>
            <textarea
              id="fate-world-note"
              rows={6}
              maxLength={2000}
              disabled={!loaded}
              value={save.worldNote}
              onChange={(event) =>
                updateSettings({ ...save, worldNote: event.target.value })
              }
              placeholder="例如：魔术可以用于普通生活；居民暂时不主动发起圣杯战争。"
              aria-describedby="world-note-help"
            />
            <div className={styles.fieldFoot}>
              <span id="world-note-help">
                留空即可沿用当前开局；修改用于之后的 AI 对话与自主决策。
              </span>
              <small>{save.worldNote.length}/2000</small>
            </div>
          </div>
        </div>
      </section>
      <section
        id="waver-form"
        aria-labelledby="waver-form-title"
        className={styles.worldNotes}
      >
        <div className={styles.sectionTitle}>
          <h2 id="waver-form-title">韦伯的两个时期</h2>
          <small>同一人物 · 只出现一位</small>
        </div>
        <div className={styles.noteGrid}>
          <div>
            <h3>{fatePerson('waver', stage)!.name}</h3>
            <p>
              青年与成年各有对应的立绘、小人、性格和经历。位置、身体状态与人物补充共用，对话按时期保留。
            </p>
            <p>切换后日常会暂停，你可以回到街道继续。此前的记录仍会保留。</p>
            <a
              href={fatePerson('waver', stage)!.portraits[0].file}
              target="_blank"
              rel="noreferrer"
            >
              查看当前立绘 ↗
            </a>
          </div>
          <fieldset className={styles.field} disabled={!loaded}>
            <legend>选择当前时期</legend>
            <label>
              <input
                type="radio"
                name="waver-stage"
                checked={stage === 'young'}
                onChange={() => changeStage('young')}
              />{' '}
              Fate/Zero · 青年韦伯
            </label>
            <label>
              <input
                type="radio"
                name="waver-stage"
                checked={stage === 'adult'}
                onChange={() => changeStage('adult')}
              />{' '}
              成年 · 君主埃尔梅罗二世
            </label>
            {stageError && <p role="alert">{stageError}</p>}
          </fieldset>
        </div>
      </section>
      <section aria-labelledby="people-title" className={styles.people}>
        <div className={styles.sectionTitle}>
          <span>03</span>
          <h2 id="people-title">人物与关系</h2>
          <small>21 人 · 可逐个调整</small>
        </div>
        <p className={styles.sectionNote}>
          先保留原有性格与关系。你可以补充或改写，也可以暂时留白，让之后的生活来改变他们。
        </p>
        <div className={styles.peopleGrid}>
          <nav className={styles.roster} aria-label="选择要编辑的 Fate 人物">
            {FATE_CAST.map((p, index) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={selected === p.id}
                onClick={() => setSelected(p.id)}
              >
                <span className={styles.personNumber}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  {fatePerson(p.id, stage)!.name}
                  <small>{fatePerson(p.id, stage)!.role}</small>
                </span>
                {save.characterNotes[p.id] || save.relationshipNotes[p.id] ? (
                  <Check size={14} aria-label="已有补充" />
                ) : null}
              </button>
            ))}
          </nav>
          <div className={styles.personPanel}>
            <div className={styles.personHeading}>
              <div>
                <p>{person.english}</p>
                <h3>{person.name}</h3>
              </div>
              <span>
                {isPartner(selected) ? '已在街道登场' : '已入选 · 等待登场'}
              </span>
            </div>
            <div className={styles.original}>
              <h4>性格与原有联系</h4>
              <div className={styles.traits}>
                {person.traits.map((trait) => (
                  <span key={trait}>{trait}</span>
                ))}
              </div>
              <p>{person.bio}</p>
              <p>{person.relations}</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="fate-character-note">人物补充</label>
              <textarea
                id="fate-character-note"
                rows={4}
                maxLength={1000}
                disabled={!loaded}
                value={characterNote}
                onChange={(event) =>
                  setNote('characterNotes', event.target.value)
                }
                placeholder={`写下${person.name}的性格变化、生活习惯、愿望或个人经历。`}
              />
              <div className={styles.fieldFoot}>
                <span>明确写出的改变会优先于原有人设。</span>
                <small>{characterNote.length}/1000</small>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="fate-relationship-note">关系补充</label>
              <textarea
                id="fate-relationship-note"
                rows={4}
                maxLength={1000}
                disabled={!loaded}
                value={relationshipNote}
                onChange={(event) =>
                  setNote('relationshipNotes', event.target.value)
                }
                placeholder="写清涉及的人物，以及彼此现在的关系、态度或共同经历。"
              />
              <div className={styles.fieldFoot}>
                <span>写清双方态度，可避免两份人物设定相互矛盾。</span>
                <small>{relationshipNote.length}/1000</small>
              </div>
            </div>
            <button
              className={styles.reset}
              type="button"
              disabled={!loaded || (!characterNote && !relationshipNote)}
              onClick={() =>
                updateSettings({
                  ...save,
                  characterNotes: { ...save.characterNotes, [selected]: '' },
                  relationshipNotes: {
                    ...save.relationshipNotes,
                    [selected]: '',
                  },
                })
              }
            >
              清除{person.name}的补充，沿用原设定
            </button>
          </div>
        </div>
      </section>
      <aside className={styles.saveBar}>
        <div>
          <output>
            {!loaded
              ? '正在读取本地设定…'
              : storageNotice || '修改自动保存在当前浏览器'}
          </output>
          <p>
            编辑不会调用 AI。街道人物的下一次 DeepSeek
            对话会读取最新设定，包括对其他人物的调整。预设台词保持固定，已发生的对话保留。
          </p>
          <p>
            Saber、凛、士郎、樱、切嗣、爱丽丝菲尔、伊莉雅、藤村老师、两位 Lancer
            与韦伯已支持自主日常；其余人物的登场和长期关系变化将接着制作。存档暂不跨设备同步。
          </p>
        </div>
        <Link href="/fate/street">
          带着设定，回到冬木 <ArrowUpRight size={17} />
        </Link>
      </aside>
    </>
  );
}
