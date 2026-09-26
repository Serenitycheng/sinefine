'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  Cloud,
  CloudRain,
  Download,
  Droplets,
  Leaf,
  Pause,
  PawPrint,
  Play,
  Rabbit,
  RotateCcw,
  SkipForward,
  Sprout,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import {
  createNatureWorld,
  interveneNature,
  MAX_NATURE_TICK,
  NATURE_BACKUP_KEY,
  NATURE_CAPS,
  NATURE_DEFAULTS,
  NATURE_HEIGHT,
  NATURE_ORIGINAL_RECOVERY_KEY,
  NATURE_STORAGE_KEY,
  NATURE_WEATHER,
  NATURE_WIDTH,
  natureSnapshot,
  natureTime,
  NatureStorageConflict,
  parseNatureSave,
  replaceNatureSave,
  serializeNature,
  setNatureParameters,
  stepNature,
  type NatureParameters,
  type NatureWorld as NatureState,
} from '@/lib/nature-world';
import styles from './nature-world.module.css';

const parameterControls = [
  {
    key: 'rainfall',
    title: '降雨倾向',
    min: 0,
    max: 100,
    hint: '越高越容易下雨，水源也更充足。',
  },
  {
    key: 'fertility',
    title: '植物生长',
    min: 20,
    max: 180,
    hint: '决定水分充足时，草木恢复的速度。',
  },
  {
    key: 'refuge',
    title: '草丛庇护',
    min: 0,
    max: 80,
    hint: '越密，草食动物越容易躲过捕食。',
  },
] as const;

function isDamagedRecord(raw: string | null) {
  if (raw === null) return false;
  try {
    parseNatureSave(raw);
    return false;
  } catch {
    return true;
  }
}

/* eslint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG scenes need image semantics and vector children, which an HTML img cannot contain. */
function ValleyMap({ world }: { world: NatureState }) {
  const summary = natureSnapshot(world);
  return (
    <svg
      viewBox="0 0 864 576"
      className={styles.valley}
      role="img"
      aria-label={`山谷地图：植物资源 ${summary.plants}，草食动物 ${summary.grazers} 只，捕食者 ${summary.predators} 只，水分 ${Math.round(world.water)}。`}
    >
      <defs>
        <pattern
          id="nature-paper"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="3" r=".65" fill="#516b44" opacity=".11" />
          <circle cx="12" cy="10" r=".5" fill="#516b44" opacity=".1" />
        </pattern>
        <linearGradient id="nature-ground" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e7e8c8" />
          <stop offset="1" stopColor="#cbd8b5" />
        </linearGradient>
      </defs>
      <rect width="864" height="576" fill="url(#nature-ground)" />
      <path
        d="M-35 73 Q148 -17 262 41 T586 31 T922 119 L910 389 Q720 472 582 415 T280 480 T-23 379Z"
        fill="#aabe9760"
      />
      <path
        d="M-40 431 Q183 382 311 496 T659 493 T915 411 L920 630 H-40Z"
        fill="#b5caa579"
      />
      <g fill="none" stroke="#6d886d" strokeWidth="1" opacity=".18">
        <path d="M-24 140 Q128 25 288 83 T628 80 T885 166" />
        <path d="M-20 161 Q128 46 288 104 T628 101 T885 187" />
        <path d="M-15 183 Q128 69 288 128 T628 122 T885 208" />
        <path d="M-25 459 Q174 362 343 487 T648 476 T897 437" />
        <path d="M-25 482 Q174 384 343 509 T648 498 T897 459" />
        <path d="M-25 507 Q174 408 343 533 T648 522 T897 483" />
      </g>
      <path
        d="M694 -24 Q639 79 703 135 T614 243 Q536 294 599 362 T576 479 T607 609"
        fill="none"
        stroke="#f4ecd1"
        strokeWidth="66"
      />
      <path
        d="M694 -24 Q639 79 703 135 T614 243 Q536 294 599 362 T576 479 T607 609"
        fill="none"
        stroke={world.water < 20 ? '#c0b893' : '#99bdb4'}
        strokeWidth={12 + world.water * 0.3}
      />
      <path
        d="M690 -24 Q635 79 699 135 T610 243 Q532 294 595 362 T572 479 T603 609"
        fill="none"
        stroke="#eef3d9"
        opacity=".45"
        strokeWidth="2"
        strokeDasharray="14 12"
      />
      <path
        d="M-20 346 Q162 216 359 315 T854 290"
        fill="none"
        stroke="#ece1b8"
        strokeWidth="14"
      />
      <path
        d="M-20 346 Q162 216 359 315 T854 290"
        fill="none"
        stroke="#b7a788"
        strokeWidth="1"
        strokeDasharray="3 7"
        opacity=".5"
      />
      <rect width="864" height="576" fill="url(#nature-paper)" />
      <g opacity={world.water < 18 ? 0.55 : 0.87}>
        {world.patches.map(
          (amount, index) =>
            amount > 0 && (
              <g
                key={index}
                transform={`translate(${(index % NATURE_WIDTH) * 46 + 19 + (index % 3) * 3},${Math.floor(index / NATURE_WIDTH) * 45 + 25})`}
              >
                <ellipse
                  cy="10"
                  rx={4 + amount * 1.2}
                  ry="3"
                  fill="#648155"
                  opacity=".13"
                />
                <path
                  d={
                    amount > 5
                      ? 'M0 -15 L-10 3 L-5 3 L-13 11 L13 11 L5 3 L10 3Z'
                      : 'M0 10 Q-12 -3 -9 -7 Q2 -6 0 10 M0 10 Q12 -1 9 -7 Q0 -4 0 10'
                  }
                  fill={amount > 5 ? '#637f52' : '#87a46a'}
                  stroke="#456448"
                  strokeWidth=".6"
                />
                <path d="M0 7V13" stroke="#6c7150" strokeWidth="1.5" />
              </g>
            ),
        )}
      </g>
      {world.animals.map((animal) => (
        <g
          key={animal.id}
          transform={`translate(${animal.x * 46 + 26 + (animal.id % 9)},${animal.y * 45 + 30 + (animal.id % 7)})`}
        >
          <title>{`${animal.species === 'grazer' ? '草食动物' : '捕食者'} · 精力 ${animal.energy}`}</title>
          <ellipse cy="7" rx="10" ry="4" fill="#253e33" opacity=".16" />
          {animal.species === 'grazer' ? (
            <>
              <ellipse
                cy="-6"
                cx="-3"
                rx="2.5"
                ry="6"
                fill="#f3e2bd"
                stroke="#765d3d"
                strokeWidth="1.2"
              />
              <ellipse
                cy="-6"
                cx="3"
                rx="2.5"
                ry="6"
                fill="#f3e2bd"
                stroke="#765d3d"
                strokeWidth="1.2"
              />
              <circle r="7" fill="#f9edcf" stroke="#755e41" strokeWidth="1.5" />
              <circle cx="2.5" cy="-1" r="1.2" fill="#3c4b36" />
            </>
          ) : (
            <>
              <path
                d="M-8 -9 L-1 -5 L8 -9 L8 2 L0 9 L-8 2Z"
                fill="#b96746"
                stroke="#78412f"
                strokeWidth="1.4"
              />
              <path d="M-5 1L0 7L5 1" fill="#eee0bb" />
              <circle cx="-3" cy="-1" r="1.1" fill="#4d382d" />
              <circle cx="3" cy="-1" r="1.1" fill="#4d382d" />
            </>
          )}
        </g>
      ))}
      <g
        transform="translate(810 53)"
        stroke="#5e7459"
        fill="none"
        opacity=".65"
      >
        <path d="M0 -18V18M-12 7L0-18L12 7" strokeWidth="1" />
        <text
          y="-25"
          textAnchor="middle"
          fill="#5e7459"
          stroke="none"
          fontSize="11"
          fontFamily="Georgia"
        >
          N
        </text>
      </g>
      {world.weather === 'rain' && (
        <g stroke="#eff7ed" strokeWidth="1.4" opacity=".6">
          {Array.from({ length: 36 }, (_, index) => (
            <path
              key={index}
              d={`M${(index * 139) % 850} ${(index * 73) % 550}l-5 15`}
            />
          ))}
        </g>
      )}
      {world.weather === 'dry' && (
        <rect width="864" height="576" fill="#ca983b" opacity=".1" />
      )}
    </svg>
  );
}

function PopulationChart({ world }: { world: NatureState }) {
  const series = [
    { key: 'plants', cap: NATURE_WIDTH * NATURE_HEIGHT * 9, color: '#6b8857' },
    { key: 'grazers', cap: NATURE_CAPS.grazer, color: '#b49457' },
    { key: 'predators', cap: NATURE_CAPS.predator, color: '#a96148' },
  ] as const;
  return (
    <svg
      viewBox="0 0 620 94"
      className={styles.chart}
      role="img"
      aria-label="近期植物、草食动物与捕食者的变化曲线，各自按观察上限归一化；精确数量见上方统计。"
    >
      {[15, 45, 75].map((y) => (
        <path
          key={y}
          d={`M0 ${y}H620`}
          stroke="#354d3020"
          strokeDasharray="3 5"
        />
      ))}
      {series.map(({ key, cap, color }) => (
        <polyline
          key={key}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={world.history
            .map(
              (point, index) =>
                `${world.history.length > 1 ? (index / (world.history.length - 1)) * 616 + 2 : 2},${85 - (point[key] / cap) * 75}`,
            )
            .join(' ')}
        />
      ))}
    </svg>
  );
}

/* eslint-enable jsx-a11y/prefer-tag-over-role */

export default function NatureWorld() {
  const [world, setWorld] = useState(() => createNatureWorld());
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [parameters, setParameters] = useState<NatureParameters>({
    ...NATURE_DEFAULTS,
  });
  const [seed, setSeed] = useState('quiet-valley');
  const [notice, setNotice] = useState('');
  const [canSave, setCanSave] = useState(false);
  const [corruptStored, setCorruptStored] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [damagedBackup, setDamagedBackup] = useState(false);
  const [hasOriginalRecovery, setHasOriginalRecovery] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState<{
    world: NatureState;
    title: string;
    rawAtPreview: string | null;
    keepCurrent?: boolean;
  } | null>(null);
  const savedRaw = useRef<string | null>(null);
  const importGeneration = useRef({ value: 0 });
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const summary = natureSnapshot(world);
  const preview = pending?.keepCurrent ? world : pending?.world;
  const active = running && world.tick < MAX_NATURE_TICK && !pending;
  const WeatherIcon =
    world.weather === 'rain'
      ? CloudRain
      : world.weather === 'cloud'
        ? Cloud
        : Sun;

  useEffect(() => {
    let alive = true;
    const imports = importGeneration.current;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        const raw = localStorage.getItem(NATURE_STORAGE_KEY);
        savedRaw.current = raw;
        const backup = localStorage.getItem(NATURE_BACKUP_KEY);
        setHasBackup(backup !== null);
        setDamagedBackup(isDamagedRecord(backup));
        setHasOriginalRecovery(
          localStorage.getItem(NATURE_ORIGINAL_RECOVERY_KEY) !== null,
        );
        if (raw !== null) {
          try {
            const restored = parseNatureSave(raw);
            setWorld(restored);
            setParameters(restored.parameters);
            setSeed(restored.seed);
            setNotice('已恢复上次观察，时间保持暂停。');
          } catch {
            setCorruptStored(true);
            throw new Error(
              '原有进度无法读取，已保留原文件。可先下载原始记录，再导入有效进度或开启新山谷。',
            );
          }
        }
        setCanSave(true);
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : '本地保存暂不可用，可以先导出进度。',
        );
      }
      setLoaded(true);
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key !== NATURE_STORAGE_KEY && event.key !== null) return;
      try {
        if (event.storageArea !== localStorage) return;
        // Events can arrive after another write. Compare the live record, not
        // an old event payload, before treating the local view as conflicted.
        if (localStorage.getItem(NATURE_STORAGE_KEY) === savedRaw.current)
          return;
      } catch {
        setRunning(false);
        setCanSave(false);
        setNotice(
          '浏览器暂时无法读取本地进度，已暂停保存。请先导出当前山谷留存。',
        );
        return;
      }
      imports.value++;
      setPending(null);
      setRunning(false);
      setCanSave(false);
      setConflict(true);
      setNotice(
        '另一标签页已更新进度，当前观察已暂停保存。可先导出当前山谷，再读取最新进度。',
      );
    };
    window.addEventListener('storage', onStorage);
    return () => {
      alive = false;
      imports.value++;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    // A queued simulation update may commit alongside opening a preview.
    // Keep its latest state in memory until cancel or confirmed replacement.
    if (!loaded || !canSave || pending) return;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      try {
        if (localStorage.getItem(NATURE_STORAGE_KEY) !== savedRaw.current) {
          setRunning(false);
          setCanSave(false);
          setConflict(true);
          setNotice(
            '另一标签页已更新进度，当前观察已暂停保存。可先导出当前山谷，再读取最新进度。',
          );
          return;
        }
        const raw = serializeNature(world);
        localStorage.setItem(NATURE_STORAGE_KEY, raw);
        savedRaw.current = raw;
      } catch {
        setCanSave(false);
        setNotice('本地空间不足或保存受限。当前观察仍在，请导出进度留存。');
      }
    });
    return () => {
      alive = false;
    };
  }, [world, loaded, canSave, pending]);

  useEffect(() => {
    if (!active || !loaded) return;
    const timer = window.setInterval(() => {
      if (document.hidden) {
        setRunning(false);
        return;
      }
      setWorld((current) => stepNature(current));
    }, 1400 / speed);
    const onVisibility = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, speed, loaded]);

  useEffect(() => {
    if (pending && !dialog.current?.open) dialog.current?.showModal();
    if (!pending && dialog.current?.open) dialog.current?.close();
  }, [pending]);

  function exportProgress() {
    const blob = new Blob([serializeNature(world)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sinefine-nature-day-${Math.floor(world.tick / 6) + 1}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('进度已导出。导入时会先展示预览。');
  }
  function downloadOriginal() {
    try {
      const raw = corruptStored
        ? savedRaw.current
        : (localStorage.getItem(NATURE_ORIGINAL_RECOVERY_KEY) ??
          localStorage.getItem(NATURE_BACKUP_KEY));
      if (raw === null) throw new Error('原始记录已不在此浏览器中。');
      const url = URL.createObjectURL(
        new Blob([raw], { type: 'text/plain;charset=utf-8' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'sinefine-nature-original-record.txt';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        '原始记录已下载，内容未经改动；损坏记录不能直接恢复为山谷进度。',
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : '原始记录下载失败，浏览器中的内容未改变。',
      );
    }
  }
  function readPreviewBaseline() {
    const baseline = savedRaw.current;
    if (localStorage.getItem(NATURE_STORAGE_KEY) !== baseline) {
      importGeneration.current.value++;
      setPending(null);
      setRunning(false);
      setCanSave(false);
      setConflict(true);
      setNotice(
        '另一标签页已更新进度。请先读取最新进度，再预览替换；当前观察可以先导出。',
      );
      return undefined;
    }
    return baseline;
  }
  async function importProgress(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (conflict) {
      setNotice(
        '请先读取另一标签页的最新进度，再导入新的山谷。当前观察可以先导出留存。',
      );
      return;
    }
    const generation = ++importGeneration.current.value;
    setRunning(false);
    try {
      if (file.size > 1_000_000)
        throw new Error('文件过大，请选择自然界导出的进度文件。');
      const raw = await file.text();
      if (generation !== importGeneration.current.value) return;
      const imported = parseNatureSave(raw);
      const baseline = readPreviewBaseline();
      if (baseline === undefined) return;
      setPending({
        world: imported,
        title: '导入这段山谷日常？',
        rawAtPreview: baseline,
      });
    } catch (error) {
      if (generation === importGeneration.current.value)
        setNotice(
          error instanceof Error
            ? error.message
            : '进度读取失败，当前山谷未改变。',
        );
    }
  }
  function previewBackup() {
    if (conflict) return;
    importGeneration.current.value++;
    setRunning(false);
    try {
      const baseline = readPreviewBaseline();
      if (baseline === undefined) return;
      const raw = localStorage.getItem(NATURE_BACKUP_KEY);
      if (raw === null) throw new Error('暂时没有可恢复的上一份进度。');
      setPending({
        world: parseNatureSave(raw),
        title: '恢复上一份进度？',
        rawAtPreview: baseline,
      });
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : '备份读取失败，当前山谷未改变。',
      );
    }
  }
  function previewNew() {
    if (conflict) return;
    importGeneration.current.value++;
    setRunning(false);
    try {
      const baseline = readPreviewBaseline();
      if (baseline === undefined) return;
      setPending({
        world: createNatureWorld(seed),
        title: '从种子开启新的山谷？',
        rawAtPreview: baseline,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '请检查种子。');
    }
  }
  function confirmReplacement() {
    if (!pending) return;
    try {
      if (localStorage.getItem(NATURE_STORAGE_KEY) !== pending.rawAtPreview) {
        setRunning(false);
        setCanSave(false);
        setConflict(true);
        setPending(null);
        setNotice(
          '预览期间另一页更新了进度，本次替换已取消。请重新读取并预览。',
        );
        return;
      }
      const next = pending.keepCurrent ? world : pending.world;
      const keptDamagedText = isDamagedRecord(pending.rawAtPreview);
      const serialized = replaceNatureSave(
        localStorage,
        next,
        world,
        pending.rawAtPreview,
      );
      savedRaw.current = serialized;
      setWorld(next);
      setParameters(next.parameters);
      setSeed(next.seed);
      setCanSave(true);
      setCorruptStored(false);
      setConflict(false);
      setHasBackup(true);
      setDamagedBackup(false);
      if (keptDamagedText) setHasOriginalRecovery(true);
      setRunning(false);
      setPending(null);
      setNotice(
        keptDamagedText
          ? '进度已恢复并暂停。本页原有山谷保留在「恢复上一份」，损坏原文另行保留，可下载留存。'
          : '进度已替换并暂停。替换前的内容保留在「恢复上一份」。',
      );
    } catch (error) {
      if (error instanceof NatureStorageConflict) {
        setRunning(false);
        setCanSave(false);
        setConflict(true);
        setPending(null);
        setNotice(error.message);
        return;
      }
      setNotice(
        '无法安全备份并替换进度，当前山谷保持不变。请先导出，再检查浏览器存储空间。',
      );
      setPending(null);
    }
  }
  function previewLatest() {
    importGeneration.current.value++;
    setRunning(false);
    try {
      const raw = localStorage.getItem(NATURE_STORAGE_KEY);
      const backup = localStorage.getItem(NATURE_BACKUP_KEY);
      const original = localStorage.getItem(NATURE_ORIGINAL_RECOVERY_KEY);
      setHasBackup(backup !== null);
      setDamagedBackup(isDamagedRecord(backup));
      setHasOriginalRecovery(original !== null);
      if (isDamagedRecord(raw)) {
        savedRaw.current = raw;
        setCorruptStored(true);
        setCanSave(false);
        setConflict(false);
        setPending(null);
        setNotice(
          '最新记录已损坏，本页山谷仍保留。可下载原文，或保留本页并恢复保存；也可导入有效进度、恢复上一份或开启新山谷。确认前不会替换原记录。',
        );
        return;
      }
      setPending({
        world: raw === null ? world : parseNatureSave(raw),
        title:
          raw === null
            ? '另一页已清空：保留当前山谷？'
            : '读取最新的山谷进度？',
        rawAtPreview: raw,
        keepCurrent: raw === null,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '最新进度读取失败。');
    }
  }
  function previewCurrent() {
    if (conflict || !corruptStored) return;
    importGeneration.current.value++;
    setRunning(false);
    try {
      const baseline = readPreviewBaseline();
      if (baseline === undefined) return;
      setPending({
        world,
        title: '保留本页山谷并恢复保存？',
        rawAtPreview: baseline,
        keepCurrent: true,
      });
    } catch {
      setNotice('浏览器暂时无法读取本地记录，请先导出本页山谷留存。');
    }
  }
  const unchanged = parameterControls.every(
    ({ key }) => parameters[key] === world.parameters[key],
  );

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="SINE FINE 无终之庭，返回首页"
        >
          <span>
            SINE <em>FINE</em>
          </span>
          <small>无终之庭</small>
        </Link>
        <nav aria-label="世界导航">
          <Link href="/">首页</Link>
          <Link href="/nature" aria-current="page">
            自然界
          </Link>
          <Link href="/worlds">
            人类世界 <ArrowUpRight size={13} />
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>WORLD 01 / A LITTLE WILD</p>
            <h1>山谷，自有它的节奏。</h1>
            <p>留意一场雨、一顿饱食，以及悄悄到来的新生命。</p>
          </div>
          <span className={styles.edition}>
            <Leaf size={19} strokeWidth={1.1} />
            <span>
              自然界<small>一处可以照料的小小生态</small>
            </span>
          </span>
        </div>
        {notice && (
          <output className={styles.notice}>
            {notice}
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="收起提示"
            >
              <X size={14} />
            </button>
          </output>
        )}
        <div className={styles.workspace}>
          <div className={styles.fieldColumn}>
            <section className={styles.field} aria-label="山谷观察">
              <div className={styles.fieldTop}>
                <div>
                  <span className={styles.eyebrow}>VALLEY OBSERVATORY</span>
                  <h2>
                    青苔山谷 <span>{NATURE_WEATHER[world.weather]}</span>
                  </h2>
                </div>
                <WeatherIcon size={28} strokeWidth={1.3} />
              </div>
              <div className={styles.map}>
                <ValleyMap world={world} />
                <div className={styles.mapTime}>
                  <span
                    className={active ? styles.liveDot : styles.pausedDot}
                  />
                  {natureTime(world.tick)}
                  <small>{active ? '观察进行中' : '时间已暂停'}</small>
                </div>
                <div className={styles.mapLabel}>
                  RIVER & MEADOW <span>溪流与草地</span>
                </div>
              </div>
              <div className={styles.legend}>
                <span>
                  <i className={styles.plantDot} />
                  草木
                </span>
                <span>
                  <i className={styles.grazerDot} />
                  草食动物
                </span>
                <span>
                  <i className={styles.predatorDot} />
                  捕食者
                </span>
                <small>每一步，山谷度过 4 小时</small>
              </div>
              <div className={styles.transport}>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!loaded || world.tick >= MAX_NATURE_TICK}
                  onClick={() => setRunning(!active)}
                >
                  {active ? <Pause size={15} /> : <Play size={15} />}
                  {active ? '暂停观察' : '开始观察'}
                </button>
                <button
                  type="button"
                  disabled={!loaded || active || world.tick >= MAX_NATURE_TICK}
                  onClick={() => setWorld(stepNature)}
                >
                  <SkipForward size={15} />
                  前进一步
                </button>
                <label className={styles.speed}>
                  流速
                  <select
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                  >
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                  </select>
                </label>
              </div>
            </section>
            <section className={styles.stats} aria-label="山谷现况">
              <div>
                <Leaf size={17} />
                <strong>{summary.plants}</strong>
                <span>植物资源</span>
              </div>
              <div>
                <Rabbit size={17} />
                <strong>
                  {summary.grazers}
                  <small> / {NATURE_CAPS.grazer}</small>
                </strong>
                <span>草食动物</span>
              </div>
              <div>
                <PawPrint size={17} />
                <strong>
                  {summary.predators}
                  <small> / {NATURE_CAPS.predator}</small>
                </strong>
                <span>捕食者</span>
              </div>
              <div>
                <Droplets size={17} />
                <strong>
                  {Math.round(world.water)}
                  <small> / 100</small>
                </strong>
                <span>水分储备</span>
              </div>
            </section>
            <section className={styles.trends} aria-label="近期变化">
              <div className={styles.sectionHeading}>
                <h2>生命的起伏</h2>
                <span>
                  新生 {world.births} · 离去 {world.deaths}
                </span>
              </div>
              <PopulationChart world={world} />
              <p>
                <span>{natureTime(world.history[0].tick)}</span>
                <span>各类数量占自身上限的比例</span>
                <span>现在</span>
              </p>
            </section>
            <section
              className={styles.journal}
              aria-labelledby="nature-journal-title"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>FIELD NOTES</span>
                  <h2 id="nature-journal-title">山谷手记</h2>
                </div>
                <span>最近 {world.events.length} 条</span>
              </div>
              <ol>
                {world.events.toReversed().map((event) => (
                  <li key={event.id} data-kind={event.kind}>
                    <span className={styles.eventDot} />
                    <div>
                      <time>{natureTime(event.tick)}</time>
                      <p>{event.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <aside className={styles.side} aria-label="照料与进度">
            <section className={styles.care}>
              <span className={styles.eyebrow}>A GENTLE INTERVENTION</span>
              <h2>改变一点，观察更多。</h2>
              <p>调整环境，让下一段日常向不同的方向生长。</p>
              <fieldset disabled={!loaded}>
                <legend className={styles.srOnly}>环境参数</legend>
                {parameterControls.map(({ key, title, min, max, hint }) => (
                  <label key={key} className={styles.parameter}>
                    <span>
                      {title}
                      <strong>{parameters[key]}%</strong>
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={5}
                      value={parameters[key]}
                      onChange={(event) =>
                        setParameters((current) => ({
                          ...current,
                          [key]: Number(event.target.value),
                        }))
                      }
                    />
                    <small>{hint}</small>
                  </label>
                ))}
                <button
                  type="button"
                  className={styles.apply}
                  disabled={unchanged}
                  onClick={() => {
                    setWorld((current) =>
                      setNatureParameters(current, parameters),
                    );
                    setNotice('环境参数已应用，从下一步开始影响日常。');
                  }}
                >
                  <Check size={14} />
                  {unchanged ? '环境参数已应用' : '应用环境参数'}
                </button>
              </fieldset>
              <div className={styles.careActions}>
                <button
                  type="button"
                  disabled={!loaded}
                  onClick={() =>
                    setWorld((current) => interveneNature(current, 'water'))
                  }
                >
                  <Droplets size={18} />
                  <span>
                    补充水源<small>水分 +25</small>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!loaded}
                  onClick={() =>
                    setWorld((current) => interveneNature(current, 'seed'))
                  }
                >
                  <Sprout size={18} />
                  <span>
                    播下种子<small>补充草木</small>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!loaded || summary.grazers >= NATURE_CAPS.grazer}
                  onClick={() =>
                    setWorld((current) => interveneNature(current, 'grazer'))
                  }
                >
                  <Rabbit size={18} />
                  <span>
                    引入草食动物<small>最多 +6 只</small>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={
                    !loaded || summary.predators >= NATURE_CAPS.predator
                  }
                  onClick={() =>
                    setWorld((current) => interveneNature(current, 'predator'))
                  }
                >
                  <PawPrint size={18} />
                  <span>
                    引入捕食者<small>最多 +2 只</small>
                  </span>
                </button>
              </div>
              <p className={styles.careNote}>
                缺水会抑制草木，也会消耗动物精力。食物充足时可能繁衍；没有食物、遭遇捕食或寿命结束时，生命也会离去。
              </p>
            </section>
            <section
              className={styles.progress}
              aria-labelledby="nature-progress-title"
            >
              <span className={styles.eyebrow}>KEEP A LITTLE HISTORY</span>
              <h2 id="nature-progress-title">把山谷留在这里</h2>
              <p className={styles.saveState}>
                <span className={canSave ? styles.liveDot : styles.pausedDot} />
                {!loaded
                  ? '正在读取进度'
                  : canSave
                    ? '自动保存在此浏览器'
                    : '自动保存不可用，请导出留存'}
              </p>
              <div className={styles.fileActions}>
                <button
                  type="button"
                  disabled={!loaded}
                  onClick={exportProgress}
                >
                  <Download size={14} />
                  导出进度
                </button>
                <button
                  type="button"
                  disabled={!loaded || conflict}
                  onClick={() => {
                    importGeneration.current.value++;
                    setRunning(false);
                    fileInput.current?.click();
                  }}
                >
                  <Upload size={14} />
                  导入进度
                </button>
              </div>
              <input
                ref={fileInput}
                className={styles.srOnly}
                type="file"
                accept=".json,application/json"
                aria-label="选择自然界进度文件"
                onChange={(event) => {
                  void importProgress(event);
                }}
              />
              <button
                className={styles.restore}
                type="button"
                disabled={!loaded || !hasBackup || damagedBackup || conflict}
                onClick={previewBackup}
              >
                <RotateCcw size={13} />
                恢复上一份
              </button>
              {corruptStored && !conflict && (
                <button
                  className={styles.apply}
                  type="button"
                  onClick={previewCurrent}
                >
                  <RotateCcw size={13} />
                  保留本页并恢复保存
                </button>
              )}
              {(corruptStored || damagedBackup || hasOriginalRecovery) && (
                <>
                  <button
                    className={styles.original}
                    type="button"
                    onClick={downloadOriginal}
                  >
                    <Download size={14} />
                    下载原始记录
                  </button>
                  <p className={styles.saveHint}>
                    损坏原文单独留存，无法直接恢复。下一次处理损坏记录前，请先下载旧原文。
                  </p>
                </>
              )}
              {conflict && (
                <button
                  className={styles.apply}
                  type="button"
                  onClick={previewLatest}
                >
                  <RotateCcw size={13} />
                  读取最新进度
                </button>
              )}
              <div className={styles.seedForm}>
                <label htmlFor="nature-seed">世界种子</label>
                <input
                  id="nature-seed"
                  value={seed}
                  maxLength={40}
                  onChange={(event) => setSeed(event.target.value)}
                />
                <small>相同种子与相同操作，会展开相同日常。</small>
                <button
                  type="button"
                  disabled={!loaded || !seed.trim() || conflict}
                  onClick={previewNew}
                >
                  开启新的山谷 <ArrowUpRight size={14} />
                </button>
              </div>
              <p className={styles.saveHint}>
                离开页面后时间暂停。导入或新建前，会先预览并保留替换前的进度。
              </p>
            </section>
          </aside>
        </div>
        <footer className={styles.footer}>
          <span>SINE FINE / 无终之庭</span>
          <p>一个可干预的简化生态，用来观察变化，不用于科学预测。</p>
          <Link href="/">
            返回首页 <ArrowUpRight size={13} />
          </Link>
        </footer>
      </main>
      <dialog
        ref={dialog}
        className={styles.dialog}
        onCancel={() => setPending(null)}
        aria-labelledby="nature-preview-title"
      >
        {pending && preview && (
          <>
            <span className={styles.eyebrow}>A NEW CHAPTER</span>
            <h2 id="nature-preview-title">{pending.title}</h2>
            <p>
              {isDamagedRecord(pending.rawAtPreview)
                ? '浏览器中的记录已损坏。确认后会单独保留损坏原文，并把本页山谷保留为可恢复备份。你也可以取消并先导出本页进度、下载原文。'
                : '当前时间会暂停。确认后，替换前的进度会保留为一份可恢复备份。'}
            </p>
            <dl>
              <div>
                <dt>种子</dt>
                <dd>{preview.seed}</dd>
              </div>
              <div>
                <dt>时间</dt>
                <dd>{natureTime(preview.tick)}</dd>
              </div>
              <div>
                <dt>种群</dt>
                <dd>
                  草食 {natureSnapshot(preview).grazers} · 捕食{' '}
                  {natureSnapshot(preview).predators}
                </dd>
              </div>
              <div>
                <dt>环境</dt>
                <dd>
                  {NATURE_WEATHER[preview.weather]} · 水分{' '}
                  {Math.round(preview.water)}
                </dd>
              </div>
            </dl>
            <div className={styles.dialogActions}>
              <button type="button" onClick={() => setPending(null)}>
                保留当前山谷
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={confirmReplacement}
              >
                确认并保留备份
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
