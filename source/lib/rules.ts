import { type World, type Rules, type RulePatch, event } from './world';
export const RULE_META: Record<
  keyof Rules,
  { label: string; min?: number; max?: number; step?: number; unit?: string }
> = {
  magicCost: { label: '每小时施法精力消耗', min: 0, max: 50, step: 1 },
  learning: { label: '魔法学习速度', min: 0.1, max: 10, step: 0.1, unit: '倍' },
  foodPrice: { label: '一份食物价格', min: 0, max: 100, step: 1, unit: '星币' },
  wage: { label: '每日标准工资', min: 0, max: 500, step: 1, unit: '星币' },
  inherit: { label: '天赋遗传权重', min: 0, max: 1, step: 0.05 },
  tax: { label: '收入税率', min: 0, max: 0.8, step: 0.01 },
  equalFood: { label: '食物免费公共分配' },
  dragonBan: { label: '禁止私人驯龙' },
  freeHealing: { label: '诊所免费治疗' },
};
export function validatePatch(input: unknown): RulePatch {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('规则格式不正确。');
  const result: RulePatch = {};
  for (const [k, v] of Object.entries(input)) {
    if (!Object.hasOwn(RULE_META, k)) throw Error(`暂不支持规则：${k}`);
    const key = k as keyof Rules,
      meta = RULE_META[key];
    if (meta.min === undefined) {
      if (typeof v !== 'boolean') throw Error(`${meta.label}需要开启或关闭。`);
      (result as Record<string, unknown>)[key] = v;
    } else {
      if (
        typeof v !== 'number' ||
        !Number.isFinite(v) ||
        v < meta.min ||
        v > meta.max!
      )
        throw Error(`${meta.label}须介于${meta.min}和${meta.max}之间。`);
      (result as Record<string, unknown>)[key] = v;
    }
  }
  if (!Object.keys(result).length) throw Error('没有可应用的规则。');
  return result;
}
export function parseLocalRule(text: string): {
  patch: RulePatch;
  explanation: string;
  unsupported: string[];
} {
  const clauses = text
      .split(/[；;。\n]/)
      .map((x) => x.trim())
      .filter(Boolean),
    patch: RulePatch = {},
    unsupported: string[] = [];
  for (const s of clauses) {
    let matched = false;
    const put = (key: keyof Rules, value: unknown) => {
      (patch as Record<string, unknown>)[key] = value;
      matched = true;
    };
    if (/^(所有)?食物(必须)?(免费|平均|公共)(分配|供应|供给)?$/.test(s))
      put('equalFood', true);
    else if (/^(取消|关闭)(食物)?(免费|平均|公共)分配$/.test(s))
      put('equalFood', false);
    else if (/^(禁止|不允许)(私人)?(驯龙|养龙|饲养龙)$/.test(s))
      put('dragonBan', true);
    else if (/^(允许|恢复)(私人)?(驯龙|养龙|饲养龙)$/.test(s))
      put('dragonBan', false);
    else if (/^(诊所|医疗|治疗)(实行)?免费(治疗)?$/.test(s))
      put('freeHealing', true);
    else if (/^(取消免费治疗|诊所恢复收费)$/.test(s)) put('freeHealing', false);
    else {
      const m = s.match(
        /^(施法消耗|施法精力消耗|魔法消耗|食物价格|每日工资|工资|学习速度|魔法学习速度|遗传权重|税率)(?:改为|设为|为|设置为|是|=|：|:)?\s*(\d+(?:\.\d+)?)\s*(%|倍|星币|点)?$/,
      );
      if (m) {
        const keys: Record<string, keyof Rules> = {
          施法消耗: 'magicCost',
          施法精力消耗: 'magicCost',
          魔法消耗: 'magicCost',
          食物价格: 'foodPrice',
          每日工资: 'wage',
          工资: 'wage',
          学习速度: 'learning',
          魔法学习速度: 'learning',
          遗传权重: 'inherit',
          税率: 'tax',
        };
        put(keys[m[1]], Number(m[2]) / (m[3] === '%' ? 100 : 1));
      }
    }
    if (!matched) unsupported.push(s);
  }
  return {
    patch: Object.keys(patch).length ? validatePatch(patch) : {},
    explanation:
      '本地可识别明确的数值与制度设置。尚未识别的句子需要改写，或连接 AI 后解释。',
    unsupported,
  };
}
export function applyRule(w: World, text: string, patch: unknown) {
  const valid = validatePatch(patch);
  for (const [k, v] of Object.entries(valid))
    (w.rules as unknown as Record<string, unknown>)[k] = v;
  w.ruleHistory.unshift({
    id: `r${w.nextId++}`,
    text: text.slice(0, 2000),
    patch: valid,
    time: w.minutes,
  });
  w.ruleHistory = w.ruleHistory.slice(0, 100);
  event(w, '世界', `世界规则更新：${text.slice(0, 200)}`, [], true, 'user');
}
