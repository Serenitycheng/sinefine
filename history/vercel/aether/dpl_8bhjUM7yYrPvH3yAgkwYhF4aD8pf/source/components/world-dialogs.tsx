'use client';
import { useState, type ReactNode } from 'react';
import {
  Sparkles,
  ArrowRight,
  CloudRain,
  Sun,
  Heart,
  Coins,
  Package,
  Download,
  Upload,
  Save,
  RotateCcw,
  Check,
  Plus,
  Globe2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  type World,
  type Resident,
  type Rules,
  type RulePatch,
  type SpecialEvent,
  SCHOOLS,
  clamp,
  event,
  createResident,
  newWorld,
  dateText,
} from '@/lib/world';
import { intervene, startSpecial } from '@/lib/simulation';
import { RULE_META, parseLocalRule, applyRule } from '@/lib/rules';
import {
  downloadWorld,
  addSnapshot,
  loadSnapshots,
  validateWorld,
  type Snapshot,
} from '@/lib/storage';
import { type useWorld } from '@/hooks/use-world';
type Context = ReturnType<typeof useWorld>;
export type Modal =
  | 'rules'
  | 'special'
  | 'intervene'
  | 'settings'
  | 'person'
  | 'add'
  | 'save'
  | 'time'
  | 'worlds'
  | null;
export function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(String(v));
      }}
      items={options}
    >
      <SelectTrigger className="choice" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
function ErrorText({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
const TITLES: Record<NonNullable<Modal>, [string, string]> = {
  rules: ['世界规则', '自然规律直接生效，社会制度允许人物作出不同选择。'],
  special: [
    '特殊设定',
    '给一部分居民新的身份和目标，观察它与普通生活如何交织。',
  ],
  intervene: ['介入世界', '一次微小的变化，也可能改变某个人的一生。'],
  settings: ['连接与偏好', '接入 DeepSeek，让重点居民根据自己的经历作出决定。'],
  person: ['人物设定', '设定是起点，接下来的人生由生活展开。'],
  add: ['一位新的居民', '留下名字与性格，也可以让系统生成起点。'],
  save: ['保存这个世界', '存档保存在当前浏览器，可导出到电脑随时带走。'],
  time: ['让时间走远一点', '压缩日常决策，逐日计算变化，回顾期间的重要经历。'],
  worlds: ['你的世界', '每个世界都可以有自己的生活方式与特殊设定。'],
};
export function WorldDialog({
  modal,
  close,
  ctx,
  person,
  onCreated,
}: {
  modal: Modal;
  close: () => void;
  ctx: Context;
  person: Resident;
  onCreated: (id: string) => void;
}) {
  if (!modal) return null;
  const title = TITLES[modal];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="world-dialog">
        <DialogTitle className="dialog-title">{title[0]}</DialogTitle>
        <DialogDescription className="dialog-description">
          {title[1]}
        </DialogDescription>
        <div className="dialog-body">
          {modal === 'rules' ? (
            <RulesEditor ctx={ctx} />
          ) : modal === 'special' ? (
            <SpecialEditor ctx={ctx} />
          ) : modal === 'intervene' ? (
            <Intervention ctx={ctx} person={person} />
          ) : modal === 'settings' ? (
            <Settings ctx={ctx} />
          ) : modal === 'person' || modal === 'add' ? (
            <PersonEditor
              ctx={ctx}
              person={modal === 'person' ? person : undefined}
              done={(id) => {
                onCreated(id);
                close();
              }}
            />
          ) : modal === 'save' ? (
            <Saves ctx={ctx} />
          ) : modal === 'time' ? (
            <TimeTravel ctx={ctx} close={close} />
          ) : (
            <WorldPicker ctx={ctx} close={close} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function RulesEditor({ ctx }: { ctx: Context }) {
  const [text, setText] = useState(''),
    [preview, setPreview] = useState<{
      patch: RulePatch;
      explanation: string;
      unsupported: string[];
    } | null>(null),
    [error, setError] = useState(''),
    [draft, setDraft] = useState<Rules>({ ...ctx.world.rules });
  async function interpret() {
    setError('');
    setPreview(null);
    try {
      if (!text.trim()) throw Error('先写下一条你想改变的规则。');
      const result = ctx.ai.connected
        ? (await ctx.aiRequest('rules', { text })).result
        : parseLocalRule(text);
      setPreview(result);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function apply(text: string, patch: RulePatch) {
    try {
      ctx.commit((w) => applyRule(w, text, patch));
      setDraft({ ...ctx.worldRef.current.rules });
      setPreview(null);
      ctx.notify('规则已生效，后续行动将按新规则计算。');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Tabs defaultValue="language">
      <TabsList>
        <TabsTrigger value="language">用语言设定</TabsTrigger>
        <TabsTrigger value="values">基础规律</TabsTrigger>
        <TabsTrigger value="history">变更记录</TabsTrigger>
      </TabsList>
      <TabsContent value="language">
        <Field label="你想改变什么？">
          <textarea
            rows={4}
            value={text}
            maxLength={2000}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            placeholder="例如：施法消耗改为8；诊所免费治疗"
          />
        </Field>
        <div className="example-row">
          {['施法消耗改为8', '诊所免费治疗', '禁止私人驯龙', '税率设为15%'].map(
            (s) => (
              <button
                key={s}
                onClick={() => {
                  setText(s);
                  setPreview(null);
                }}
              >
                {s}
              </button>
            ),
          )}
        </div>
        <p className="panel-hint">
          {ctx.ai.connected
            ? '使用 DeepSeek 解释规则，确认理解后才会应用。'
            : '未连接 AI：目前可识别上方示例形式。更自由的表达可在连接后解释。'}
        </p>
        <button
          className="primary-button"
          disabled={ctx.busy || !text.trim()}
          onClick={interpret}
        >
          <Sparkles size={16} />
          {ctx.busy ? '解释中…' : '解释这条规则'}
        </button>
        {preview && (
          <div className="rule-preview">
            <h3>将发生的变化</h3>
            {Object.entries(preview.patch).map(([k, v]) => (
              <p key={k}>
                {RULE_META[k as keyof Rules].label}
                <b>{typeof v === 'boolean' ? (v ? '开启' : '关闭') : v}</b>
              </p>
            ))}
            <small>{preview.explanation}</small>
            {preview.unsupported.length > 0 && (
              <div className="form-error">
                以下内容尚不能执行，请改写后重新解释：
                {preview.unsupported.join('；')}
              </div>
            )}
            <button
              className="gold-button"
              disabled={
                !!preview.unsupported.length ||
                !Object.keys(preview.patch).length
              }
              onClick={() => apply(text, preview.patch)}
            >
              <Check size={15} />
              确认并应用
            </button>
          </div>
        )}
      </TabsContent>
      <TabsContent value="values">
        <div className="form-grid">
          {Object.entries(RULE_META)
            .filter(([, m]) => m.min !== undefined)
            .map(([k, m]) => (
              <Field key={k} label={m.label} hint={m.unit}>
                <input
                  type="number"
                  min={m.min}
                  max={m.max}
                  step={m.step}
                  value={Number(draft[k as keyof Rules])}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [k]: e.target.value === '' ? 0 : Number(e.target.value),
                    }))
                  }
                />
              </Field>
            ))}
        </div>
        {Object.entries(RULE_META)
          .filter(([, m]) => m.min === undefined)
          .map(([k, m]) => (
            <Toggle
              key={k}
              label={m.label}
              checked={!!draft[k as keyof Rules]}
              onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
          ))}
        <button
          className="gold-button"
          onClick={() => apply('调整基础规律与社会制度', draft)}
        >
          应用基础规则
        </button>
      </TabsContent>
      <TabsContent value="history">
        {ctx.world.ruleHistory.length ? (
          ctx.world.ruleHistory.map((r) => (
            <div className="memory-card" key={r.id}>
              <small>{dateText(r.time, true)}</small>
              <p>{r.text}</p>
              <div className="trait-row">
                {Object.keys(r.patch).map((k) => (
                  <span key={k}>{RULE_META[k as keyof Rules].label}</span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="empty-message">
            尚未修改规则。这个世界保留着最初的起点。
          </p>
        )}
      </TabsContent>
      <ErrorText error={error} />
    </Tabs>
  );
}
function SpecialEditor({ ctx }: { ctx: Context }) {
  const [s, setS] = useState({ ...ctx.world.special }),
    [error, setError] = useState('');
  const active = ctx.world.special;
  function start() {
    setError('');
    try {
      ctx.commit((w) => startSpecial(w, s));
      ctx.notify('特殊事件已经开始，参与者将自行决定投入多少精力。');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      {active.active ? (
        <>
          <div className="event-banner">
            <Sparkles />
            <div>
              <h3>{active.name}</h3>
              <p>
                第{' '}
                {Math.max(
                  1,
                  Math.floor((ctx.world.minutes - active.start) / 1440) + 1,
                )}{' '}
                / {active.duration} 天 · {active.objective}目标
              </p>
            </div>
            <span className="live-dot" />
          </div>
          <p className="panel-hint">{active.description}</p>
          <div className="participant-list">
            {active.participants
              .slice()
              .sort((a, b) => (active.scores[b] || 0) - (active.scores[a] || 0))
              .map((id, i) => (
                <div key={id}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <b>{ctx.world.residents.find((p) => p.id === id)?.name}</b>
                  <small>{(active.scores[id] || 0).toFixed(1)} 成果</small>
                </div>
              ))}
          </div>
          <button
            className="soft-button"
            onClick={() => {
              ctx.commit((w) => {
                w.special.active = false;
                w.special.finished = true;
                event(
                  w,
                  '特殊事件',
                  `你提前结束了「${w.special.name}」，此次不结算奖励。`,
                  w.special.participants,
                  true,
                  'user',
                );
              });
              ctx.notify('事件已结束。');
            }}
          >
            提前结束事件
          </button>
        </>
      ) : (
        <>
          <Field label="事件名称">
            <input
              value={s.name}
              maxLength={40}
              onChange={(e) => setS({ ...s, name: e.target.value })}
            />
          </Field>
          <Field
            label="世界中的特殊设定"
            hint="这段描述影响 AI 对动机的理解。实际结果由下方目标、参与条件和结算规则计算。"
          >
            <textarea
              rows={3}
              value={s.description}
              maxLength={1200}
              onChange={(e) => setS({ ...s, description: e.target.value })}
            />
          </Field>
          <Field label="参与者的主要目标">
            <Choice
              label="事件目标"
              value={s.objective}
              onChange={(v) =>
                setS({ ...s, objective: v as SpecialEvent['objective'] })
              }
              options={[
                { value: '研究', label: '研究 · 知识、魔法与好奇心' },
                { value: '合作', label: '合作 · 信任、关系与互助' },
                { value: '竞技', label: '竞技 · 能力、精力与进取心' },
              ]}
            />
          </Field>
          <div className="form-grid">
            {[
              ['参与人数', 'count', 2, 20],
              ['持续天数', 'duration', 1, 360],
              ['最低魔法等级', 'minMagic', 0, 100],
              ['优胜奖励（星币）', 'reward', 0, 10000],
            ].map(([label, key, min, max]) => (
              <Field label={String(label)} key={String(key)}>
                <input
                  type="number"
                  min={Number(min)}
                  max={Number(max)}
                  value={Number(s[key as keyof SpecialEvent])}
                  onChange={(e) =>
                    setS({ ...s, [key]: Number(e.target.value) })
                  }
                />
              </Field>
            ))}
          </div>
          <div className="info-note">
            从符合条件的成年居民中选取参与者。他们可投入时间积累成果，也可优先过自己的生活。期限结束时，成果最高的存活参与者获得奖励。
          </div>
          {active.finished && (
            <p className="panel-hint">
              上一事件已结束
              {active.winner
                ? `，优胜者：${ctx.world.residents.find((p) => p.id === active.winner)?.name}`
                : ''}
              。
            </p>
          )}
          <button
            className="gold-button"
            onClick={start}
            disabled={!s.name.trim()}
          >
            <Sparkles size={16} />
            开启这项设定
          </button>
        </>
      )}
      <ErrorText error={error} />
    </>
  );
}
function Intervention({ ctx, person }: { ctx: Context; person: Resident }) {
  const [target, setTarget] = useState('all');
  return (
    <>
      <Field label="影响范围">
        <Choice
          label="干预范围"
          value={target}
          onChange={setTarget}
          options={[
            { value: 'all', label: '整个街区' },
            { value: person.id, label: person.name },
          ]}
        />
      </Field>
      <div className="intervention-grid">
        {[
          {
            kind: '物资',
            icon: Package,
            label: '送来一批物资',
            desc: '公共食物 +300',
          },
          {
            kind: '星币',
            icon: Coins,
            label: '一份意外之财',
            desc: '每位对象 +100 星币',
          },
          {
            kind: '治愈',
            icon: Heart,
            label: '悄悄施以治愈',
            desc: '健康 +40',
          },
          {
            kind: '晴朗',
            icon: Sun,
            label: '让天空放晴',
            desc: '改变整个街区天气',
          },
          {
            kind: '小雨',
            icon: CloudRain,
            label: '下一场小雨',
            desc: '改变整个街区天气',
          },
          {
            kind: '星辉',
            icon: Sparkles,
            label: '降下星辉',
            desc: '一次不寻常的天象',
          },
        ].map(({ kind, icon: Icon, label, desc }) => (
          <button
            className="intervention-card"
            key={kind}
            onClick={() => {
              try {
                ctx.commit((w) =>
                  intervene(
                    w,
                    kind as Parameters<typeof intervene>[1],
                    ['物资', '晴朗', '小雨', '星辉'].includes(kind) ||
                      target === 'all'
                      ? undefined
                      : target,
                  ),
                );
                ctx.notify('变化已发生。居民可能会注意到这次干预。');
              } catch (e) {
                ctx.notify((e as Error).message);
              }
            }}
          >
            <Icon />
            <strong>{label}</strong>
            <small>{desc}</small>
          </button>
        ))}
      </div>
      <p className="panel-hint">
        居民不会自动知道真相。察觉、怀疑与信仰会在他们各自的经历中积累。天气当前影响街区氛围与异常感知。
      </p>
    </>
  );
}
function Settings({ ctx }: { ctx: Context }) {
  const [error, setError] = useState('');
  async function connect() {
    setError('');
    try {
      const data = await ctx.aiRequest('test', {});
      const models = data.models;
      if (!models?.length) throw Error('账户没有返回可用模型。');
      ctx.setAi((a) => ({
        ...a,
        models,
        model: models.includes(a.model)
          ? a.model
          : models.find((m: string) => m.includes('flash')) || models[0],
        connected: true,
      }));
      ctx.notify('DeepSeek 密钥已通过验证，请选择模型并开启自主决策。');
    } catch (e) {
      ctx.setAi((a) => ({ ...a, connected: false, enabled: false }));
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="provider-card">
        <Sparkles size={26} />
        <div>
          <strong>DeepSeek</strong>
          <small>{ctx.ai.connected ? '连接已验证' : '等待连接'}</small>
        </div>
        <span className={ctx.ai.connected ? 'connection good' : 'connection'}>
          {ctx.ai.connected ? '可用' : '未连接'}
        </span>
      </div>
      <Field
        label="API 密钥"
        hint="密钥仅保存在当前页面内存中，不进入存档。请求经本站转发至 DeepSeek，刷新后需重新填写。"
      >
        <input
          type="password"
          autoComplete="off"
          placeholder="sk-…"
          value={ctx.ai.key}
          onChange={(e) =>
            ctx.setAi((a) => ({
              ...a,
              key: e.target.value.trim(),
              connected: false,
              enabled: false,
            }))
          }
        />
      </Field>
      <button
        className="primary-button"
        onClick={connect}
        disabled={ctx.busy || !ctx.ai.key}
      >
        {ctx.busy ? '连接中…' : '验证连接并读取模型'}
      </button>
      <ErrorText error={error} />
      {ctx.ai.models.length > 0 && (
        <Field label="使用模型">
          <Choice
            label="DeepSeek 模型"
            value={ctx.ai.model}
            onChange={(v) => ctx.setAi((a) => ({ ...a, model: v }))}
            options={ctx.ai.models.map((m) => ({ value: m, label: m }))}
          />
        </Field>
      )}
      <Toggle
        label="让重点居民自主调用 AI"
        checked={ctx.ai.enabled}
        onChange={(v) => {
          if (v && !ctx.ai.connected) {
            setError('请先验证连接。');
            return;
          }
          ctx.setAi((a) => ({ ...a, enabled: v }));
        }}
        hint="世界运行时约每20秒处理最多4位居民。24倍速度及长时间快进使用本地规则。"
      />
      <Field
        label="本次页面最多调用次数"
        hint="达到上限后停止自动调用。验证模型列表不计入生成次数；失败的生成请求也计入次数。"
      >
        <input
          type="number"
          min={1}
          max={500}
          value={ctx.ai.limit}
          onChange={(e) =>
            ctx.setAi((a) => ({
              ...a,
              limit: Math.round(clamp(Number(e.target.value), 1, 500)),
            }))
          }
        />
      </Field>
      <div className="usage-line">
        <span>
          已请求 <b>{ctx.ai.calls} 次</b>
        </span>
        <span>
          已返回用量 <b>{ctx.ai.tokens.toLocaleString()} tokens</b>
        </span>
      </div>
      <p className="panel-hint">
        费用以 DeepSeek 账单为准。连接成功后，可以先在人物面板点击一次“AI
        决定”体验。
      </p>
      <Toggle
        label="重要事件自动暂停"
        checked={ctx.autoPause}
        onChange={ctx.setAutoPause}
        hint="重点居民的人生变化、特殊事件结算时暂停。"
      />
    </>
  );
}
function PersonEditor({
  ctx,
  person,
  done,
}: {
  ctx: Context;
  person?: Resident;
  done: (id: string) => void;
}) {
  const [d, setD] = useState({
      name: person?.name || '',
      age: person?.age ? Math.floor(person.age) : 24,
      job: person?.job || '自由职业者',
      traits: person?.traits.join('、') || '好奇、温和',
      backstory: person?.backstory || '',
      goal: person?.goal || '想在街区找到自己的生活。',
      school: person?.school || '自然',
      talent: person?.talent || 50,
      magic: person?.magic || 0,
    }),
    [description, setDescription] = useState(''),
    [error, setError] = useState('');
  async function generate() {
    setError('');
    try {
      const r = (await ctx.aiRequest('character', { text: description }))
        .result;
      setD({
        ...d,
        name: String(r.name || d.name).slice(0, 40),
        age: clamp(Number(r.age) || 24, 18, 90),
        job: String(r.job || d.job).slice(0, 40),
        traits: Array.isArray(r.traits)
          ? r.traits.map(String).slice(0, 4).join('、')
          : d.traits,
        backstory: String(r.backstory || '').slice(0, 1000),
        goal: String(r.goal || d.goal).slice(0, 300),
        school: SCHOOLS.includes(r.school) ? r.school : '自然',
        talent: clamp(Number(r.talent) || 50),
        magic: clamp(Number(r.magic) || 0),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function save() {
    setError('');
    try {
      if (person && !d.name.trim()) throw Error('请给人物保留一个名字。');
      const traits = d.traits
          .split(/[,，、]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 4),
        text = [d.backstory, ...traits].join(' ');
      const patch: Partial<Resident> = {
        age: clamp(d.age, 0, 100),
        job: d.job.slice(0, 40),
        traits: traits.length ? traits : ['温和'],
        backstory: d.backstory.slice(0, 1000),
        goal: d.goal.slice(0, 300),
        school: d.school,
        talent: clamp(d.talent),
        magic: clamp(d.magic),
        empathy: /温和|慷慨|善良|互助/.test(text)
          ? 0.8
          : /冷漠|自私/.test(text)
            ? 0.15
            : 0.5,
        curiosity: /好奇|探索|研究/.test(text)
          ? 0.85
          : /保守|谨慎/.test(text)
            ? 0.25
            : 0.5,
        ambition: /野心|胜利|权力|进取/.test(text) ? 0.85 : 0.4,
      };
      if (d.name.trim()) patch.name = d.name.trim().slice(0, 40);
      let id = '';
      ctx.commit((w) => {
        if (person) {
          const p = w.residents.find((p) => p.id === person.id)!;
          Object.assign(p, patch);
          id = p.id;
          event(
            w,
            '世界',
            `你调整了${p.name}的人物设定。`,
            [p.id],
            true,
            'user',
          );
        } else {
          if (w.residents.filter((p) => p.alive).length >= 200)
            throw Error('当前街区已达到200名在世居民。');
          const p = createResident(w, { ...patch, focus: true });
          id = p.id;
          event(
            w,
            '人生',
            `${p.name}来到微光街区，带着新的故事与打算。`,
            [p.id],
            true,
            'user',
          );
        }
      });
      done(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Field label="用自然语言描述人物（可选）">
        <textarea
          rows={2}
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="一位姓月見、喜欢照顾植物、好奇却有点怕生的自然系魔法学徒……"
        />
      </Field>
      <button
        className="soft-button"
        disabled={!ctx.ai.connected || !description.trim() || ctx.busy}
        onClick={generate}
      >
        <Sparkles size={14} />用 AI 填写设定
      </button>
      <div className="form-grid">
        <Field label="姓名">
          <input
            value={d.name}
            maxLength={40}
            onChange={(e) => setD({ ...d, name: e.target.value })}
            placeholder="留空自动生成日语名"
          />
        </Field>
        <Field label="年龄">
          <input
            type="number"
            min={0}
            max={100}
            value={d.age}
            onChange={(e) => setD({ ...d, age: Number(e.target.value) })}
          />
        </Field>
        <Field label="职业">
          <input
            value={d.job}
            maxLength={40}
            onChange={(e) => setD({ ...d, job: e.target.value })}
          />
        </Field>
        <Field label="魔法领域">
          <Choice
            label="魔法领域"
            value={d.school}
            onChange={(v) => setD({ ...d, school: v })}
            options={SCHOOLS.map((s) => ({ value: s, label: s }))}
          />
        </Field>
      </div>
      <Field
        label="性格"
        hint="用顿号分隔。温和、好奇、谨慎、自私、有野心等词会影响本地行为；完整描述也会供 AI 参考。"
      >
        <input
          value={d.traits}
          maxLength={100}
          onChange={(e) => setD({ ...d, traits: e.target.value })}
        />
      </Field>
      <Field label="背景与人物设定">
        <textarea
          rows={3}
          value={d.backstory}
          maxLength={1000}
          onChange={(e) => setD({ ...d, backstory: e.target.value })}
        />
      </Field>
      <Field label="想要的生活">
        <input
          value={d.goal}
          maxLength={300}
          onChange={(e) => setD({ ...d, goal: e.target.value })}
        />
      </Field>
      <div className="form-grid">
        <Field label="魔法天赋（0—100）">
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(d.talent)}
            onChange={(e) => setD({ ...d, talent: Number(e.target.value) })}
          />
        </Field>
        <Field label="已有魔法等级（0—100）">
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(d.magic)}
            onChange={(e) => setD({ ...d, magic: Number(e.target.value) })}
          />
        </Field>
      </div>
      <ErrorText error={error} />
      <button className="gold-button" onClick={save}>
        {person ? '应用人物设定' : '让这位居民加入街区'}
      </button>
    </>
  );
}
function Saves({ ctx }: { ctx: Context }) {
  const [items, setItems] = useState<Snapshot[]>(() => loadSnapshots()),
    [pending, setPending] = useState<World | null>(null),
    [error, setError] = useState('');
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw Error('存档文件过大。');
      const w = validateWorld(JSON.parse(await file.text()));
      setPending(w);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="save-actions">
        <button
          className="primary-button"
          onClick={() => {
            if (ctx.save()) ctx.notify('当前世界已保存到本机浏览器。');
          }}
        >
          <Save size={16} />
          保存当前世界
        </button>
        <button
          className="soft-button"
          onClick={() => downloadWorld(ctx.worldRef.current)}
        >
          <Download size={16} />
          导出存档
        </button>
        <label className="soft-button file-button">
          <Upload size={16} />
          导入存档
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <div className="section-title">
        <h3>关键时刻</h3>
        <button
          className="text-button"
          onClick={() => {
            try {
              setItems(
                addSnapshot(
                  ctx.worldRef.current,
                  dateText(ctx.worldRef.current.minutes, true),
                ),
              );
              ctx.notify('快照已保存。');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Plus size={14} />
          保留快照
        </button>
      </div>
      <p className="panel-hint">
        本机保留最近3个快照。回到旧快照前会先保留当前世界。
      </p>
      {items.map((s) => (
        <div className="snapshot-row" key={s.id}>
          <div>
            <b>{s.label}</b>
            <small>{s.created}</small>
          </div>
          <button className="soft-button" onClick={() => setPending(s.world)}>
            <RotateCcw size={14} />
            回到此刻
          </button>
        </div>
      ))}
      {!items.length && <p className="empty-message">还没有保存的关键时刻。</p>}
      <ErrorText error={error} />
      <ConfirmWorld
        pending={pending}
        cancel={() => setPending(null)}
        confirm={() => {
          if (!pending) return;
          try {
            setItems(addSnapshot(ctx.worldRef.current, '恢复前的世界'));
            ctx.resetWorld(structuredClone(pending));
            ctx.save();
            setPending(null);
            ctx.notify('世界已恢复，时间暂停在这个时刻。');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </>
  );
}
function ConfirmWorld({
  pending,
  cancel,
  confirm,
}: {
  pending: World | null;
  cancel: () => void;
  confirm: () => void;
}) {
  return (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>切换到这个时刻？</AlertDialogTitle>
        <AlertDialogDescription>
          将加载 {pending ? dateText(pending.minutes) : ''}{' '}
          的世界。当前进度会先保存为快照。
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>留在现在</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>保存并切换</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function TimeTravel({ ctx, close }: { ctx: Context; close: () => void }) {
  return (
    <>
      <Toggle
        label="遇到关注的重要事件就停下"
        checked={ctx.autoPause}
        onChange={ctx.setAutoPause}
        hint="重点居民组建家庭、生育、成年、死亡，以及特殊事件结束。"
      />
      <div className="time-options">
        {[
          { days: 1, label: '明天', desc: '推进 1 天' },
          { days: 30, label: '一个月后', desc: '推进 30 天' },
          { days: 360, label: '一年后', desc: '推进 360 天' },
          { days: 3600, label: '十年后', desc: '推进 10 年' },
        ].map((o) => (
          <button
            key={o.days}
            onClick={() => {
              close();
              void ctx.fastForward(o.days);
            }}
          >
            <strong>{o.label}</strong>
            <small>{o.desc}</small>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
      <div className="info-note">
        长时间推进使用本地规则，不额外调用
        AI。人物仍会经历工作、关系变化、魔法成长与生老病死。结束后生成期间回顾。星历每年360天。
      </div>
    </>
  );
}
function WorldPicker({ ctx, close }: { ctx: Context; close: () => void }) {
  const [pending, setPending] = useState<World | null>(null),
    [error, setError] = useState('');
  return (
    <>
      <div className="world-card">
        <img src="/town.png" alt="微光街区" />
        <div>
          <span className="focus-tag">当前世界</span>
          <h3>微光街区</h3>
          <p>现代生活 · 魔法学习 · 自主居民</p>
          <small>
            {ctx.world.residents.filter((p) => p.alive).length} 位居民 ·{' '}
            {dateText(ctx.world.minutes, true)}
          </small>
        </div>
      </div>
      <button
        className="soft-button"
        onClick={() =>
          setPending(newWorld(Math.floor(Math.random() * 4294967295)))
        }
      >
        <Globe2 size={16} />
        用新的起点重开街区
      </button>
      <p className="panel-hint">
        第一版提供这一个可玩的背景。其他世界、作品角色包和自然生态演化会在后续扩展；现阶段可以自行编辑角色与特殊设定。
      </p>
      <ErrorText error={error} />
      <ConfirmWorld
        pending={pending}
        cancel={() => setPending(null)}
        confirm={() => {
          if (!pending) return;
          try {
            addSnapshot(ctx.worldRef.current, '重开前的世界');
            ctx.resetWorld(pending);
            ctx.save();
            setPending(null);
            close();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </>
  );
}
