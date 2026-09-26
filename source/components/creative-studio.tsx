'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Download,
  Feather,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  CREATIVE_TEMPLATES,
  CREATIVE_TRAITS,
  CREATIVE_STORAGE_KEY,
  activateCreativeWorld,
  advanceCreativeWorld,
  createCreativeBackup,
  createCreativeWorld,
  creativeTemplateDraft,
  creativeTime,
  creativePlaceName,
  emptyCreativeLibrary,
  readCreativeBackupText,
  readCreativeLibrarySnapshot,
  removeCreativeWorld,
  restoreCreativeLibrary,
  restoreCreativeRecovery,
  serializeCreativeBackup,
  updateCreativeRules,
  updateCreativeWorldDetails,
  upsertCreativeWorld,
  writeCreativeLibrary,
  type CreativeBackup,
  type CreativeLibrary,
  type CreativePlace,
  type CreativeRules,
  type CreativeTemplateId,
  type CreativeWorld,
  type CreativeWorldDraft,
} from '@/lib/creative-world';
import styles from './creative-studio.module.css';

const STORAGE_KEY = CREATIVE_STORAGE_KEY;
const PLACES: CreativePlace[] = ['home', 'work', 'table', 'square', 'study'];

function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : '操作未完成，原进度保持不变。';
}

export function CreativeStudio({
  initialTemplate,
}: {
  initialTemplate: CreativeTemplateId;
}) {
  const [library, setLibrary] = useState<CreativeLibrary>(emptyCreativeLibrary);
  const libraryRef = useRef(library);
  const rawRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const writable = useRef(false);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const requestedTemplate = useRef(initialTemplate !== 'custom');
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [speed, setSpeed] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [preview, setPreview] = useState<CreativeBackup | null>(null);
  const [reading, setReading] = useState(false);
  const readingRef = useRef(false);
  const [confirm, setConfirm] = useState<'recovery' | 'delete' | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  const fileGeneration = useRef(0);
  const commitRef = useRef<(next: CreativeLibrary) => boolean>(() => false);
  const world =
    library.worlds.find((entry) => entry.id === library.activeId) ?? null;
  const resident =
    world?.residents.find((entry) => entry.id === selectedId) ??
    world?.residents[0];
  const busy = !!preview || !!confirm;
  const locked = !ready || blocked || busy || reading;

  const pause = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
  }, []);
  const invalidateFileRead = useCallback(() => {
    fileGeneration.current++;
    readingRef.current = false;
  }, []);
  const load = useCallback(() => {
    pause();
    invalidateFileRead();
    setReading(false);
    restoreFocus.current = false;
    setPreview(null);
    setConfirm(null);
    setEditing(false);
    try {
      const { library: next, raw } = readCreativeLibrarySnapshot(localStorage);
      rawRef.current = raw;
      libraryRef.current = next;
      setLibrary(next);
      writable.current = true;
      setBlocked(false);
      setCreating(
        next.worlds.length === 0 ||
          (requestedTemplate.current && next.worlds.length < 8),
      );
      requestedTemplate.current = false;
      setError('');
      setNotice('本地记录已读取。世界停在你离开的时刻。');
    } catch (reason) {
      writable.current = false;
      setBlocked(true);
      setError(
        `无法读取记录：${errorText(reason)} 原始记录未被覆盖，可先下载保留。`,
      );
    }
    setReady(true);
  }, [pause, invalidateFileRead]);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) load();
    });
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if (event.storageArea !== localStorage) return;
      runningRef.current = false;
      writable.current = false;
      invalidateFileRead();
      setReading(false);
      restoreFocus.current = false;
      setRunning(false);
      setBlocked(true);
      setPreview(null);
      setConfirm(null);
      setError(
        '另一个页面更新了自由世界记录。请重新读取后再继续，避免覆盖另一页的进度。',
      );
    }
    window.addEventListener('storage', onStorage);
    return () => {
      alive = false;
      runningRef.current = false;
      writable.current = false;
      invalidateFileRead();
      window.removeEventListener('storage', onStorage);
    };
  }, [load, invalidateFileRead]);

  function commit(next: CreativeLibrary) {
    if (!writable.current || readingRef.current) return false;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== rawRef.current) {
        writable.current = false;
        setBlocked(true);
        throw new Error('另一页已更新记录，请重新读取后继续。');
      }
      rawRef.current = writeCreativeLibrary(localStorage, next);
      libraryRef.current = next;
      setLibrary(next);
      setError('');
      return true;
    } catch (reason) {
      pause();
      setError(
        `保存未完成：${errorText(reason)} 本次操作未应用，请先导出已有进度。`,
      );
      return false;
    }
  }
  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (!runningRef.current || !writable.current) return;
      try {
        const current = libraryRef.current;
        const active = current.worlds.find(
          (entry) => entry.id === current.activeId,
        );
        if (active)
          commitRef.current(
            upsertCreativeWorld(current, advanceCreativeWorld(active, speed)),
          );
      } catch (reason) {
        runningRef.current = false;
        setRunning(false);
        setError(errorText(reason));
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [running, speed]);

  useEffect(() => {
    if (preview || confirm) previewRef.current?.focus();
    else if (!reading && restoreFocus.current) {
      restoreFocus.current = false;
      const previous = returnFocusRef.current;
      if (previous?.isConnected && !previous.disabled) previous.focus();
      else importButtonRef.current?.focus();
    }
  }, [preview, confirm, reading]);

  function act(operation: () => CreativeLibrary, message: string) {
    if (readingRef.current) return false;
    pause();
    try {
      if (!commit(operation())) return false;
      setNotice(message);
      return true;
    } catch (reason) {
      setError(errorText(reason));
      return false;
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !writable.current) return;
    pause();
    setEditing(false);
    setConfirm(null);
    setPreview(null);
    const generation = ++fileGeneration.current;
    readingRef.current = true;
    setReading(true);
    setError('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('备份不能超过 2 MB。');
      const text = await file.text();
      if (generation !== fileGeneration.current || !writable.current) return;
      const backup = readCreativeBackupText(text);
      pause();
      setConfirm(null);
      setPreview(backup);
      setError('');
    } catch (reason) {
      if (generation === fileGeneration.current) {
        restoreFocus.current = true;
        setError(`无法导入：${errorText(reason)}`);
      }
    } finally {
      if (generation === fileGeneration.current) {
        readingRef.current = false;
        setReading(false);
      }
    }
  }

  function exportLibrary() {
    try {
      downloadText(
        serializeCreativeBackup(createCreativeBackup(libraryRef.current)),
        'sinefine-creative-worlds.json',
      );
      setNotice('已生成自由世界备份，请妥善保留下载的文件。');
    } catch (reason) {
      setError(errorText(reason));
    }
  }

  return (
    <main className={styles.studio}>
      <Link className={styles.back} href="/worlds">
        <ArrowLeft size={14} /> 人类社会
      </Link>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>THE UNWRITTEN / CREATIVE WORLDS</p>
          <h1>给想象一处居所。</h1>
          <p>写下世界的开端，让人物从寻常的一天开始生活。</p>
        </div>
        <span className={styles.localBadge}>
          <span /> 本地规则模拟 · 独立存档
        </span>
      </header>
      <output className={styles.notice}>
        {!ready ? '正在读取本地记录…' : notice}
      </output>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {reading && (
        <div className={styles.toolbar}>
          <output aria-live="polite">正在读取备份，日常已暂停…</output>
          <button
            onClick={() => {
              invalidateFileRead();
              restoreFocus.current = true;
              setReading(false);
              setNotice('已取消读取，现有世界没有改变。');
            }}
          >
            取消读取
          </button>
        </div>
      )}
      {blocked && (
        <div className={styles.toolbar}>
          <button onClick={load}>
            <RotateCcw size={15} /> 重新读取本地记录
          </button>
          <button
            onClick={() => {
              try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) downloadText(raw, 'sinefine-creative-original.json');
              } catch (reason) {
                setError(errorText(reason));
              }
            }}
          >
            下载原始记录
          </button>
        </div>
      )}
      <div className={styles.libraryBar}>
        <label>
          我的世界{' '}
          <select
            aria-label="切换世界"
            value={library.activeId ?? ''}
            disabled={locked || library.worlds.length === 0}
            onChange={(event) => {
              if (
                act(
                  () =>
                    activateCreativeWorld(
                      libraryRef.current,
                      event.target.value,
                    ),
                  '已切换世界，当前为暂停状态。',
                )
              ) {
                setCreating(false);
                setEditing(false);
                setSelectedId('');
                window.history.replaceState(null, '', '/create');
              }
            }}
          >
            <option value="" disabled>
              尚未创建世界
            </option>
            {library.worlds.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <span>{library.worlds.length} / 8</span>
        <button
          disabled={locked || library.worlds.length >= 8}
          onClick={() => {
            pause();
            setCreating(true);
            setEditing(false);
          }}
        >
          <Plus size={15} /> 新建世界
        </button>
        <div className={styles.archiveActions}>
          <button
            disabled={!ready || library.worlds.length === 0}
            onClick={exportLibrary}
          >
            <Download size={15} /> 导出
          </button>
          <button
            ref={importButtonRef}
            disabled={locked}
            onClick={(event) => {
              pause();
              returnFocusRef.current = event.currentTarget;
              fileRef.current?.click();
            }}
          >
            <Upload size={15} /> 导入
          </button>
          <button
            disabled={locked || !library.recovery}
            onClick={(event) => {
              pause();
              returnFocusRef.current = event.currentTarget;
              setConfirm('recovery');
            }}
          >
            取回保护备份
          </button>
          <input
            ref={fileRef}
            className={styles.hidden}
            type="file"
            accept=".json,application/json"
            aria-label="选择自由世界备份"
            disabled={locked}
            onChange={chooseFile}
          />
        </div>
      </div>
      {busy && (
        <section
          className={styles.confirm}
          ref={previewRef}
          tabIndex={-1}
          aria-labelledby="restore-title"
        >
          <p className={styles.eyebrow}>PLEASE REVIEW</p>
          <h2 id="restore-title">
            {preview
              ? '恢复前，请核对这份备份'
              : confirm === 'delete'
                ? '删除这个世界？'
                : '取回上一次保护的进度？'}
          </h2>
          {preview ? (
            <>
              <p>即将替换整个自由世界库。现有世界会保留为一份保护备份。</p>
              <ul>
                {preview.worlds.map((entry) => (
                  <li key={entry.id}>
                    {entry.name} · {entry.residents.length} 人 ·{' '}
                    {creativeTime(entry.minutes)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              {confirm === 'delete'
                ? `将删除「${world?.name}」。删除前会保留一份保护备份，可取回整个世界库；这会替换上一份保护备份。`
                : '当前自由世界库也会保留为新的保护备份。'}
            </p>
          )}
          <div className={styles.toolbar}>
            <button
              className={styles.primary}
              disabled={blocked}
              onClick={() => {
                const done = act(
                  () =>
                    preview
                      ? restoreCreativeLibrary(libraryRef.current, preview)
                      : confirm === 'delete' && world
                        ? removeCreativeWorld(libraryRef.current, world.id)
                        : restoreCreativeRecovery(libraryRef.current),
                  preview
                    ? '备份已恢复，之前的世界库已保护。'
                    : confirm === 'delete'
                      ? '世界已删除，删除前的世界库已保留为保护备份。'
                      : '保护备份已取回。',
                );
                if (done) {
                  restoreFocus.current = true;
                  setPreview(null);
                  setConfirm(null);
                  setCreating(libraryRef.current.worlds.length === 0);
                  setEditing(false);
                  setSelectedId('');
                }
              }}
            >
              {!preview && confirm === 'delete' ? '确认删除' : '确认恢复'}
            </button>
            <button
              onClick={() => {
                restoreFocus.current = true;
                setPreview(null);
                setConfirm(null);
              }}
            >
              取消
            </button>
          </div>
        </section>
      )}
      {creating && !busy && (
        <WorldDraftForm
          initialTemplate={initialTemplate}
          disabled={locked}
          onCancel={
            world
              ? () => {
                  setCreating(false);
                  window.history.replaceState(null, '', '/create');
                }
              : undefined
          }
          onCreate={(draft) => {
            if (
              act(
                () =>
                  upsertCreativeWorld(
                    libraryRef.current,
                    createCreativeWorld(draft),
                  ),
                '世界已创建并保存。可以开始观察了。',
              )
            ) {
              setCreating(false);
              setSelectedId('');
              window.history.replaceState(null, '', '/create');
            }
          }}
        />
      )}
      {!creating && world && (
        <>
          <section className={styles.worldHeading}>
            <div>
              <p className={styles.eyebrow}>
                {
                  CREATIVE_TEMPLATES.find(
                    (template) => template.id === world.template,
                  )?.genre
                }{' '}
                / {world.residents.length} 位居民
              </p>
              <h2>{world.name}</h2>
              <p>{world.premise}</p>
            </div>
            <div className={styles.clock}>
              <strong>{creativeTime(world.minutes)}</strong>
              <span>
                {running ? `日常进行中 · ${speed}×` : '暂停中 · 刷新后保持暂停'}
              </span>
            </div>
          </section>
          <div className={styles.toolbar}>
            <button
              className={styles.primary}
              disabled={locked || editing}
              onClick={() => {
                if (readingRef.current || !writable.current) return;
                if (running) pause();
                else {
                  runningRef.current = true;
                  setRunning(true);
                  setNotice('日常正在推进，变化会自动保存。');
                }
              }}
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? '暂停日常' : '开始日常'}
            </button>
            <button
              disabled={locked || running || editing}
              onClick={() =>
                act(
                  () =>
                    upsertCreativeWorld(
                      libraryRef.current,
                      advanceCreativeWorld(world, 1),
                    ),
                  '已推进 10 分钟并保存。',
                )
              }
            >
              推进 10 分钟
            </button>
            <label>
              速度{' '}
              <select
                aria-label="日常速度"
                value={speed}
                disabled={locked}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                <option value={1}>1×</option>
                <option value={4}>4×</option>
              </select>
            </label>
            <button
              disabled={locked}
              onClick={() => {
                pause();
                setEditing(!editing);
              }}
            >
              {editing ? '收起设定' : '编辑世界与规则'}
            </button>
            <button
              className={styles.subtle}
              disabled={locked}
              onClick={(event) => {
                pause();
                returnFocusRef.current = event.currentTarget;
                setConfirm('delete');
              }}
            >
              删除此世界
            </button>
          </div>
          {editing && !busy && (
            <WorldSettings
              key={world.id}
              world={world}
              disabled={locked}
              onSave={(details, rules) => {
                const current = libraryRef.current.worlds.find(
                  (entry) => entry.id === world.id,
                );
                if (
                  current &&
                  act(
                    () =>
                      upsertCreativeWorld(
                        libraryRef.current,
                        updateCreativeRules(
                          updateCreativeWorldDetails(current, details),
                          rules,
                        ),
                      ),
                    '世界、人物与生活规则已保存。',
                  )
                )
                  setEditing(false);
              }}
            />
          )}
          <div className={styles.observation}>
            <section
              className={styles.mapPanel}
              aria-labelledby="daily-map-title"
            >
              <div className={styles.panelTitle}>
                <h3 id="daily-map-title">日常地图</h3>
                <span>点击居民，看看此刻的生活</span>
              </div>
              <div className={styles.map}>
                {PLACES.map((place, index) => (
                  <section
                    key={place}
                    className={`${styles.place} ${styles[place]}`}
                  >
                    <span className={styles.placeNumber}>0{index + 1}</span>
                    <h4>{creativePlaceName(world.template, place)}</h4>
                    <div className={styles.people}>
                      {world.residents
                        .filter((entry) => entry.action.place === place)
                        .map((entry) => (
                          <button
                            key={entry.id}
                            aria-pressed={resident?.id === entry.id}
                            aria-label={`观察${entry.name}`}
                            onClick={() => setSelectedId(entry.id)}
                            title={`${entry.name} · ${entry.action.label}`}
                          >
                            <span>{entry.name.slice(0, 1)}</span>
                            <small>{entry.name}</small>
                          </button>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className={styles.caption}>
                位置按人物正在进行的活动展示。生活在这里相遇，故事由你记录。
              </p>
            </section>
            {resident && (
              <aside className={styles.resident} aria-label="人物近况">
                <p className={styles.eyebrow}>A LIFE IN THIS WORLD</p>
                <h3>{resident.name}</h3>
                <p className={styles.role}>{resident.role}</p>
                <div className={styles.traits}>
                  {resident.traits.map((trait) => (
                    <span key={trait}>
                      {CREATIVE_TRAITS.find((item) => item.id === trait)?.label}
                    </span>
                  ))}
                </div>
                <p className={styles.thought}>{resident.action.text}</p>
                <dl className={styles.stats}>
                  {(
                    [
                      ['饥饿', resident.hunger],
                      ['精力', resident.energy],
                      ['社交需要', 100 - resident.social],
                      ['心情', resident.mood],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        <meter
                          aria-label={`${resident.name}的${label}`}
                          min={0}
                          max={100}
                          value={value}
                        />
                        {Math.round(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.caption}>
                  饥饿与社交需要越高，越需要照顾。
                </p>
                <p className={styles.budget}>
                  生活费 <strong>{resident.money}</strong> 点
                </p>
                <div className={styles.goal}>
                  <small>想做的事</small>
                  <p>{resident.goal}</p>
                </div>
                <div className={styles.relations}>
                  <h4>相遇的痕迹</h4>
                  {world.relationships
                    .filter(
                      (relationship) =>
                        relationship.a === resident.id ||
                        relationship.b === resident.id,
                    )
                    .slice()
                    .sort((a, b) => b.closeness - a.closeness)
                    .slice(0, 4)
                    .map((relationship) => (
                      <p key={`${relationship.a}-${relationship.b}`}>
                        <span>
                          {
                            world.residents.find(
                              (entry) =>
                                entry.id ===
                                (relationship.a === resident.id
                                  ? relationship.b
                                  : relationship.a),
                            )?.name
                          }
                        </span>
                        <span>熟悉度 {Math.round(relationship.closeness)}</span>
                      </p>
                    ))}
                </div>
              </aside>
            )}
          </div>
          <section className={styles.journal} aria-labelledby="journal-title">
            <div className={styles.panelTitle}>
              <h3 id="journal-title">
                <BookOpen size={17} /> 这一页的日常
              </h3>
              <span>最近 {Math.min(world.events.length, 40)} 条</span>
            </div>
            <ol>
              {world.events
                .slice(-40)
                .reverse()
                .map((entry) => (
                  <li key={entry.id}>
                    <time>{creativeTime(entry.minute)}</time>
                    <p>{entry.text}</p>
                  </li>
                ))}
            </ol>
          </section>
        </>
      )}
      <p className={styles.footnote}>
        世界背景与人物目标作为创作设定保留。当前行为由本地生活规则决定，不会把任意文字变成新机制。自由世界备份包含整个世界库；Fate
        与自然界分别保存。
      </p>
    </main>
  );
}

function RuleFields({
  value,
  onChange,
  disabled,
}: {
  value: CreativeRules;
  onChange: (rules: CreativeRules) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className={styles.rules} disabled={disabled}>
      <legend>生活规则</legend>
      <div className={styles.ruleFields}>
        <label>
          每日工作时长（小时）
          <input
            type="number"
            min={0}
            max={12}
            step={1}
            required
            value={value.workHours}
            onChange={(event) =>
              onChange({ ...value, workHours: Number(event.target.value) })
            }
          />
        </label>
        <label>
          每次用餐花费（点）
          <input
            type="number"
            min={0}
            max={30}
            step={1}
            required
            value={value.mealCost}
            onChange={(event) =>
              onChange({ ...value, mealCost: Number(event.target.value) })
            }
          />
        </label>
        <label>
          每日生活补贴（点）
          <input
            type="number"
            min={0}
            max={200}
            step={1}
            required
            value={value.dailyAllowance}
            onChange={(event) =>
              onChange({ ...value, dailyAllowance: Number(event.target.value) })
            }
          />
        </label>
      </div>
      <p>
        工作从 9 点起安排，每工作 10 分钟获得 2
        点。补贴在世界创建时和之后的每日零点发放；规则修改从此刻之后生效。
      </p>
    </fieldset>
  );
}

function PeopleFields({
  residents,
  onChange,
  disabled,
  removable,
}: {
  residents: CreativeWorldDraft['residents'];
  onChange: (residents: CreativeWorldDraft['residents']) => void;
  disabled: boolean;
  removable: boolean;
}) {
  return (
    <fieldset className={styles.peopleForm} disabled={disabled}>
      <legend>
        世界中的人 <small>{residents.length} / 12</small>
      </legend>
      {residents.map((person, index) => (
        <div className={styles.personForm} key={index}>
          <div className={styles.personNumber}>
            人物 {String(index + 1).padStart(2, '0')}
            {removable && residents.length > 1 && (
              <button
                type="button"
                aria-label={`移除人物${index + 1}`}
                onClick={() =>
                  onChange(residents.filter((_, at) => at !== index))
                }
              >
                移除
              </button>
            )}
          </div>
          <div className={styles.personRow}>
            <label>
              姓名
              <input
                required
                maxLength={32}
                value={person.name}
                onChange={(event) =>
                  onChange(
                    residents.map((entry, at) =>
                      at === index
                        ? { ...entry, name: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </label>
            <label>
              身份 / 职业
              <input
                required
                maxLength={80}
                value={person.role}
                onChange={(event) =>
                  onChange(
                    residents.map((entry, at) =>
                      at === index
                        ? { ...entry, role: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </label>
          </div>
          <label>
            想做的事
            <input
              required
              maxLength={160}
              value={person.goal}
              onChange={(event) =>
                onChange(
                  residents.map((entry, at) =>
                    at === index
                      ? { ...entry, goal: event.target.value }
                      : entry,
                  ),
                )
              }
            />
          </label>
          <div className={styles.traitFields}>
            <span>性格 · 选择 1–3 项</span>
            {CREATIVE_TRAITS.map((trait) => (
              <label key={trait.id} title={trait.description}>
                <input
                  type="checkbox"
                  checked={person.traits.includes(trait.id)}
                  disabled={
                    !person.traits.includes(trait.id) &&
                    person.traits.length >= 3
                  }
                  onChange={(event) =>
                    onChange(
                      residents.map((entry, at) =>
                        at === index
                          ? {
                              ...entry,
                              traits: event.target.checked
                                ? [...entry.traits, trait.id]
                                : entry.traits.filter((id) => id !== trait.id),
                            }
                          : entry,
                      ),
                    )
                  }
                />
                {trait.label}
              </label>
            ))}
          </div>
        </div>
      ))}
      {removable && (
        <button
          type="button"
          disabled={disabled || residents.length >= 12}
          onClick={() =>
            onChange([
              ...residents,
              {
                name: '',
                role: '居民',
                goal: '了解这个世界',
                traits: ['curious'],
              },
            ])
          }
        >
          <Plus size={15} /> 添加人物
        </button>
      )}
    </fieldset>
  );
}

function WorldDraftForm({
  initialTemplate,
  disabled,
  onCancel,
  onCreate,
}: {
  initialTemplate: CreativeTemplateId;
  disabled: boolean;
  onCancel?: () => void;
  onCreate: (draft: CreativeWorldDraft) => void;
}) {
  const [draft, setDraft] = useState(() =>
    creativeTemplateDraft(initialTemplate),
  );
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate(draft);
  }
  return (
    <section className={styles.editor}>
      <div className={styles.panelTitle}>
        <h2>
          <Feather size={20} /> 从一个开端开始
        </h2>
        <span>模板中的名字与设定都可以改写</span>
      </div>
      <div className={styles.templates}>
        {CREATIVE_TEMPLATES.map((template) => (
          <button
            type="button"
            key={template.id}
            aria-pressed={draft.template === template.id}
            disabled={disabled}
            onClick={() => setDraft(creativeTemplateDraft(template.id))}
          >
            <small>{template.genre}</small>
            <strong>{template.name}</strong>
            <span>{template.description}</span>
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={disabled} className={styles.worldFields}>
          <legend>写下世界的设定</legend>
          <label>
            世界名称
            <input
              required
              maxLength={40}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label>
            故事背景
            <textarea
              required
              maxLength={1200}
              rows={3}
              value={draft.premise}
              onChange={(event) =>
                setDraft({ ...draft, premise: event.target.value })
              }
            />
          </label>
          <p>这里记录世界观与故事背景。可执行的日常机制由下方生活规则决定。</p>
        </fieldset>
        <PeopleFields
          residents={draft.residents}
          disabled={disabled}
          removable
          onChange={(residents) => setDraft({ ...draft, residents })}
        />
        <RuleFields
          value={draft.rules}
          onChange={(rules) => setDraft({ ...draft, rules })}
          disabled={disabled}
        />
        <div className={styles.toolbar}>
          <button type="submit" className={styles.primary} disabled={disabled}>
            创建并进入世界 <ArrowUpRight size={16} />
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}>
              返回已有世界
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

type Details = Parameters<typeof updateCreativeWorldDetails>[1];
function WorldSettings({
  world,
  disabled,
  onSave,
}: {
  world: CreativeWorld;
  disabled: boolean;
  onSave: (details: Details, rules: CreativeRules) => void;
}) {
  const [details, setDetails] = useState<Details>({
    name: world.name,
    premise: world.premise,
    residents: world.residents.map(({ id, name, role, goal, traits }) => ({
      id,
      name,
      role,
      goal,
      traits: [...traits],
    })),
  });
  const [rules, setRules] = useState({ ...world.rules });
  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(details, rules);
      }}
    >
      <h3>改写设定，保留已经发生的生活</h3>
      <fieldset disabled={disabled} className={styles.worldFields}>
        <legend>世界设定</legend>
        <label>
          世界名称
          <input
            required
            maxLength={40}
            value={details.name}
            onChange={(event) =>
              setDetails({ ...details, name: event.target.value })
            }
          />
        </label>
        <label>
          故事背景
          <textarea
            required
            maxLength={1200}
            rows={3}
            value={details.premise}
            onChange={(event) =>
              setDetails({ ...details, premise: event.target.value })
            }
          />
        </label>
      </fieldset>
      <PeopleFields
        residents={details.residents}
        disabled={disabled}
        removable={false}
        onChange={(residents) =>
          setDetails({
            ...details,
            residents: residents.map((resident, index) => ({
              ...resident,
              id: details.residents[index].id,
            })),
          })
        }
      />
      <RuleFields value={rules} onChange={setRules} disabled={disabled} />
      <button className={styles.primary} disabled={disabled} type="submit">
        保存设定与规则
      </button>
    </form>
  );
}
