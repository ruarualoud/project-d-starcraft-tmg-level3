/**
 * StarCraft TMG Combat Rules Configuration
 *
 * 所有战斗规则参数化，方便后续规则更新时只改这个文件。
 * 基于三池系统: Attack Pool → Armour Pool → Damage Pool
 */

// ============================================================
// 骰子基础规则
// ============================================================
export const DICE_RULES = {
  /** 标准骰子面数 */
  standardDie: 6,
  /** D3: 1-2=1, 3-4=2, 5-6=3 */
  d3Map: [0, 1, 1, 2, 2, 3, 3] as readonly number[],
  /** 目标值下限 (2+) */
  minTargetNumber: 2,
  /** 目标值上限 (6+) */
  maxTargetNumber: 6,
  /** 自然6永远成功 */
  naturalSuccessValue: 6,
  /** 自然1永远失败 */
  naturalFailValue: 1,
  /** 空值标记 (表示没有该能力) */
  nullValue: '-',
} as const;

// ============================================================
// 战斗流程定义
// ============================================================
export interface CombatPhaseConfig {
  name: string;
  description: string;
}

/** 战斗解算的5个步骤 */
export const COMBAT_STEPS: CombatPhaseConfig[] = [
  { name: 'attack_roll', description: '攻击骰: 模型数 × RoA → 掷骰 vs 命中值 → 成功进入护甲池' },
  { name: 'surge_resolve', description: '暴击解算: 如果Surge类型匹配目标Combat Tag → Surge骰结果数量的骰子从护甲池直接进入伤害池' },
  { name: 'armour_roll', description: '护甲骰: 防御方掷护甲池中所有骰子 vs 护甲值 → 成功移除，失败进入伤害池' },
  { name: 'evade_roll', description: '闪避骰: (如果有资格) 防御方掷伤害池中骰子 vs 闪避值 → 成功移除' },
  { name: 'damage_resolve', description: '伤害结算: 剩余骰子 × 武器伤害值 = 总伤害 → 按HP移除模型' },
];

// ============================================================
// 关键词效果配置
// ============================================================
export type KeywordEffectType =
  | 'pierce'               // 对特定tag提升伤害
  | 'critical_hit'         // 从护甲池直接移到伤害池
  | 'dodge'                // 减少surge/critical_hit移动的骰子
  | 'anti_evade'           // 降低目标闪避值
  | 'burst_fire'           // 近距离增加RoA
  | 'concentrated_fire'    // 限制最大击杀数
  | 'impact'               // 冲锋后额外攻击骰
  | 'impact_bonus'         // 冲锋时额外增加IMPACT骰
  | 'sidearm'              // 可额外使用的武器
  | 'spillover'            // 模板武器溢出伤害
  | 'tough'                // 改变失败护甲骰为成功
  | 'indirect_fire'        // 忽略视线
  | 'pinpoint'             // 可攻击交战中的敌人
  | 'precision'            // 失败攻击骰变成功进入护甲池
  | 'long_range'           // 延长射程但命中-1
  | 'locked_in'            // 目标本回合未移动时增加RoA
  | 'titan_killers'        // 对大型目标将伤害视为更高值
  | 'hidden';              // 隐蔽

export interface KeywordConfig {
  id: KeywordEffectType;
  name: string;
  /** 关键词描述 */
  description: string;
  /** 是否影响攻击计算 */
  affectsCombat: boolean;
  /** 在哪个步骤生效 */
  activeStep: string;
  /** 参数说明 */
  paramDescription: string;
}

export const KEYWORD_CONFIGS: KeywordConfig[] = [
  {
    id: 'pierce',
    name: 'PIERCE',
    description: '攻击指定Combat Tag的单位时，武器伤害视为X',
    affectsCombat: true,
    activeStep: 'damage_resolve',
    paramDescription: '[TAG] X 或 TAG (X) - TAG为目标Combat Tag, X为替代伤害值',
  },
  {
    id: 'critical_hit',
    name: 'CRITICAL HIT',
    description: '将X个骰子从护甲池直接移到伤害池，绕过护甲',
    affectsCombat: true,
    activeStep: 'surge_resolve',
    paramDescription: '(X) - X为移动的骰子数',
  },
  {
    id: 'dodge',
    name: 'DODGE',
    description: '减少Surge/Critical Hit从护甲池移到伤害池的骰子数X个',
    affectsCombat: true,
    activeStep: 'surge_resolve',
    paramDescription: '(X) - X为减少的骰子数',
  },
  {
    id: 'anti_evade',
    name: 'ANTI-EVADE',
    description: '目标闪避骰受-X修正',
    affectsCombat: true,
    activeStep: 'evade_roll',
    paramDescription: '(X) - X为闪避修正值',
  },
  {
    id: 'burst_fire',
    name: 'BURST FIRE',
    description: '在Y"范围内，武器RoA增加X',
    affectsCombat: true,
    activeStep: 'attack_roll',
    paramDescription: 'Y" (X) - Y为距离, X为增加的RoA',
  },
  {
    id: 'concentrated_fire',
    name: 'CONCENTRATED FIRE',
    description: '最多移除X个模型，多余伤害丢弃',
    affectsCombat: true,
    activeStep: 'damage_resolve',
    paramDescription: '(X) - X为最大击杀模型数',
  },
  {
    id: 'impact',
    name: 'IMPACT',
    description: '成功冲锋后，每个合格模型生成X个Impact骰，命中值Y',
    affectsCombat: true,
    activeStep: 'attack_roll',
    paramDescription: '(X) Y - X为骰子数, Y为命中值',
  },
  {
    id: 'impact_bonus',
    name: 'IMPACT BONUS',
    description: '成功冲锋并结算IMPACT时，每个合格模型额外生成X个Impact骰',
    affectsCombat: true,
    activeStep: 'attack_roll',
    paramDescription: '(X) - X为每个模型额外增加的IMPACT骰数',
  },
  {
    id: 'sidearm',
    name: 'SIDEARM',
    description: '模型可以在正常武器之外额外使用此武器（单独批次）',
    affectsCombat: true,
    activeStep: 'attack_roll',
    paramDescription: '无参数',
  },
  {
    id: 'tough',
    name: 'TOUGH',
    description: '将最多X个失败的护甲骰结果改为成功',
    affectsCombat: true,
    activeStep: 'armour_roll',
    paramDescription: '(X) - X为可改变的骰子数',
  },
  {
    id: 'precision',
    name: 'PRECISION',
    description: '命中骰后，将最多X个失败的攻击骰移入护甲池作为成功',
    affectsCombat: true,
    activeStep: 'attack_roll',
    paramDescription: '(X) - X为可移动的骰子数',
  },
  {
    id: 'hidden',
    name: 'HIDDEN',
    description: '4"外不能被远程攻击；免疫IMPACT；可对所有攻击闪避',
    affectsCombat: true,
    activeStep: 'evade_roll',
    paramDescription: '无参数',
  },
  {
    id: 'indirect_fire',
    name: 'INDIRECT FIRE',
    description: '忽略视线选择目标；如果目标不可见，目标可以闪避',
    affectsCombat: true,
    activeStep: 'evade_roll',
    paramDescription: '无参数',
  },
  {
    id: 'pinpoint',
    name: 'PINPOINT',
    description: '可以攻击交战中的敌方单位',
    affectsCombat: false,
    activeStep: 'attack_roll',
    paramDescription: '无参数',
  },
  {
    id: 'spillover',
    name: 'SPILLOVER',
    description: '模板武器命中主目标单位外的模型',
    affectsCombat: false,
    activeStep: 'damage_resolve',
    paramDescription: '无参数',
  },
  {
    id: 'long_range',
    name: 'LONG RANGE',
    description: '延长射程到X"，但超出正常射程命中-1',
    affectsCombat: true,
    activeStep: 'attack_roll',
    paramDescription: '(X) - X为延长后的射程',
  },
  {
    id: 'locked_in',
    name: 'LOCKED IN',
    description: '目标本回合未移动时，武器RoA增加X',
    affectsCombat: true,
    activeStep: 'attack_roll',
    paramDescription: '(X) - X为增加的RoA',
  },
  {
    id: 'titan_killers',
    name: 'TITAN KILLERS',
    description: '近战攻击 Size 达到阈值的目标时，武器伤害视为X',
    affectsCombat: true,
    activeStep: 'damage_resolve',
    paramDescription: 'N+ (X) - 目标 Size 至少为 N 时，伤害视为 X',
  },
];

// ============================================================
// 通用标准化工具
// ============================================================
export function normalizeTagName(tag: string): string {
  const clean = (tag || '').trim().replace(/^\[|\]$/g, '');
  const upper = clean.toUpperCase();
  if (!upper) return '';
  if (upper === 'ARMORED') return 'ARMOURED';
  if (upper === 'ARMOURED') return 'ARMOURED';
  if (upper === 'AIR') return 'FLYING';
  return upper;
}

export function splitTagList(value: string): string[] {
  return (value || '')
    .split(',')
    .map(part => normalizeTagName(part))
    .filter(Boolean);
}

// ============================================================
// 关键词解析工具
// ============================================================
export interface ParsedKeyword {
  type: KeywordEffectType;
  params: Record<string, number | string>;
}

function pushUniqueKeyword(target: ParsedKeyword[], item: ParsedKeyword) {
  const signature = `${item.type}:${JSON.stringify(item.params)}`;
  const exists = target.some(existing => `${existing.type}:${JSON.stringify(existing.params)}` === signature);
  if (!exists) target.push(item);
}

/** 从关键词字符串解析出结构化的关键词列表 */
export function parseKeywords(keywordsStr: string): ParsedKeyword[] {
  if (!keywordsStr) return [];
  const results: ParsedKeyword[] = [];
  const kw = keywordsStr.toUpperCase();

  // PIERCE [TAG] X / PIERCE TAG (X)
  for (const match of kw.matchAll(/PIERCE\s*(?:\[([^\]]+)\]\s*(\d+)|([A-Z' -]+?)\s*\((\d+)\))/g)) {
    const rawTag = match[1] || match[3] || '';
    const rawDamage = match[2] || match[4] || '0';
    pushUniqueKeyword(results, {
      type: 'pierce',
      params: { tag: normalizeTagName(rawTag), damage: parseInt(rawDamage, 10) },
    });
  }

  // CRITICAL HIT (X)
  for (const match of kw.matchAll(/CRITICAL\s*HIT\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, { type: 'critical_hit', params: { count: parseInt(match[1], 10) } });
  }

  // DODGE (X)
  for (const match of kw.matchAll(/DODGE\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, { type: 'dodge', params: { count: parseInt(match[1], 10) } });
  }

  // ANTI-EVADE (X)
  for (const match of kw.matchAll(/ANTI[- ]?EVADE\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, { type: 'anti_evade', params: { modifier: parseInt(match[1], 10) } });
  }

  // BURST FIRE Y" (X)
  for (const match of kw.matchAll(/BURST\s*FIRE\s*(\d+)\s*"?\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, {
      type: 'burst_fire',
      params: { range: parseInt(match[1], 10), bonus: parseInt(match[2], 10) },
    });
  }

  // CONCENTRATED FIRE (X)
  for (const match of kw.matchAll(/CONCENTRATED\s*FIRE\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, { type: 'concentrated_fire', params: { maxKills: parseInt(match[1], 10) } });
  }

  // IMPACT (X) Y / IMPACT (X) Y+
  for (const match of kw.matchAll(/IMPACT\s*\((\d+)\)\s*(\d+)\+?/g)) {
    pushUniqueKeyword(results, {
      type: 'impact',
      params: { dice: parseInt(match[1], 10), hit: parseInt(match[2], 10) },
    });
  }

  // IMPACT BONUS (X)
  for (const match of kw.matchAll(/IMPACT\s*BONUS\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, {
      type: 'impact_bonus',
      params: { dice: parseInt(match[1], 10) },
    });
  }

  // SIDEARM
  if (kw.includes('SIDEARM')) pushUniqueKeyword(results, { type: 'sidearm', params: {} });

  // TOUGH (X)
  for (const match of kw.matchAll(/TOUGH\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, { type: 'tough', params: { count: parseInt(match[1], 10) } });
  }

  // PRECISION (X)
  for (const match of kw.matchAll(/PRECISION\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, { type: 'precision', params: { count: parseInt(match[1], 10) } });
  }

  // HIDDEN
  if (kw.includes('HIDDEN')) pushUniqueKeyword(results, { type: 'hidden', params: {} });

  // INDIRECT FIRE
  if (kw.includes('INDIRECT FIRE')) pushUniqueKeyword(results, { type: 'indirect_fire', params: {} });

  // PINPOINT
  if (kw.includes('PINPOINT')) pushUniqueKeyword(results, { type: 'pinpoint', params: {} });

  // SPILLOVER
  if (kw.includes('SPILLOVER')) pushUniqueKeyword(results, { type: 'spillover', params: {} });

  // LONG RANGE (X) / LONG RANGE X"
  for (const match of kw.matchAll(/LONG\s*RANGE\s*(?:\((\d+)\s*"?\)|(\d+)\s*"?)/g)) {
    const value = match[1] || match[2];
    pushUniqueKeyword(results, { type: 'long_range', params: { range: parseInt(value, 10) } });
  }

  // LOCKED IN (X)
  for (const match of kw.matchAll(/LOCKED\s*IN\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, { type: 'locked_in', params: { bonus: parseInt(match[1], 10) } });
  }

  // TITAN KILLERS 3+ (2)
  for (const match of kw.matchAll(/TITAN\s*KILLERS\s*(\d+)\+\s*\((\d+)\)/g)) {
    pushUniqueKeyword(results, {
      type: 'titan_killers',
      params: { minSize: parseInt(match[1], 10), damage: parseInt(match[2], 10) },
    });
  }

  return results;
}

// ============================================================
// Combat Tag 定义
// ============================================================
export const COMBAT_TAGS = [
  'GROUND',
  'FLYING',
  'LIGHT',
  'ARMOURED',
  'BIOLOGICAL',
  'MECHANICAL',
  'PSIONIC',
  'MASSIVE',
  'HEROIC',
  'STRUCTURE',
] as const;
export type CombatTag = typeof COMBAT_TAGS[number];

/** 从单位tags字符串中提取全部Combat Tag */
export function extractCombatTags(tags: string): CombatTag[] {
  const normalized = splitTagList(tags);
  return normalized.filter((tag): tag is CombatTag => (COMBAT_TAGS as readonly string[]).includes(tag));
}

/** 兼容旧代码：优先返回飞行，否则返回地面 */
export function extractCombatTag(tags: string): 'Ground' | 'Flying' {
  const allTags = extractCombatTags(tags);
  return allTags.includes('FLYING') ? 'Flying' : 'Ground';
}

// ============================================================
// Surge 解析
// ============================================================
export interface ParsedSurge {
  surgeTags: CombatTag[];
  surgeDieText: string | null;
}

/** 解析 Surge 字符串，例如 "Light, Armoured (D3+1)" */
export function parseSurge(surgeStr: string | undefined): ParsedSurge {
  if (!surgeStr || surgeStr.trim() === '-' || surgeStr.trim() === '') {
    return { surgeTags: [], surgeDieText: null };
  }

  const trimmed = surgeStr.trim();
  const dieMatch = trimmed.match(/\(([^)]+)\)\s*$/);
  const legacyDieMatch = trimmed.match(/\b(D3(?:\s*\+\s*\d+)?|D6(?:\s*\+\s*\d+)?)\b\s*$/i);
  const dieText = dieMatch
    ? dieMatch[1].trim().toUpperCase().replace(/\s+/g, '')
    : legacyDieMatch
    ? legacyDieMatch[1].trim().toUpperCase().replace(/\s+/g, '')
    : null;
  const tagPart = dieMatch
    ? trimmed.slice(0, dieMatch.index).trim()
    : legacyDieMatch
    ? trimmed.slice(0, legacyDieMatch.index).trim()
    : trimmed;

  const surgeTags = splitTagList(tagPart)
    .map(tag => (tag === 'ANTI-GROUND' ? 'GROUND' : tag))
    .map(tag => (tag === 'ANTI-AIR' || tag === 'ANTI-FLYING' ? 'FLYING' : tag))
    .filter((tag): tag is CombatTag => (COMBAT_TAGS as readonly string[]).includes(tag));

  return { surgeTags, surgeDieText: dieText };
}

// ============================================================
// 线上数据的武器关键词提取
// ============================================================
const WEAPON_KEYWORD_PATTERNS: RegExp[] = [
  /ANTI[- ]?EVADE\s*\(\d+\)/g,
  /BURST\s*FIRE\s*\d+\s*"?\s*\(\d+\)/g,
  /CONCENTRATED\s*FIRE\s*\(\d+\)/g,
  /CRITICAL\s*HIT\s*\(\d+\)/g,
  /DODGE\s*\(\d+\)/g,
  /IMPACT\s*\(\d+\)\s*\d+\+?/g,
  /IMPACT\s*BONUS\s*\(\d+\)/g,
  /INDIRECT\s*FIRE/g,
  /LOCKED\s*IN\s*\(\d+\)/g,
  /LONG\s*RANGE\s*(?:\(\d+\s*"?\)|\d+\s*"?)/g,
  /TITAN\s*KILLERS\s*\d+\+\s*\(\d+\)/g,
  /PIERCE\s*(?:\[[^\]]+\]\s*\d+|[A-Z' -]+?\s*\(\d+\))/g,
  /PINPOINT/g,
  /PRECISION\s*\(\d+\)/g,
  /SIDEARM/g,
  /SPILLOVER/g,
  /TOUGH\s*\(\d+\)/g,
];

export function extractWeaponKeywords(desc: string): string {
  if (!desc) return '';
  const upper = desc.toUpperCase();
  const found: string[] = [];

  for (const pattern of WEAPON_KEYWORD_PATTERNS) {
    for (const match of upper.matchAll(pattern)) {
      const value = match[0].replace(/\s+/g, ' ').trim();
      if (!found.includes(value)) found.push(value);
    }
  }

  return found.join(', ');
}

// ============================================================
// 游戏回合配置
// ============================================================
export const GAME_CONFIG = {
  /** 最大回合数 */
  maxRounds: 5,
  /** 每回合4个阶段 */
  phases: ['Movement', 'Assault', 'Combat', 'Scoring'] as const,
  /** 默认矿物上限 */
  defaultMinerals: 500,
  /** 气矿比例 */
  gasRatio: 0.10,
} as const;

// ============================================================
// 规则版本
// ============================================================
export const RULES_VERSION = {
  version: '0.1 beta',
  lastUpdated: '2026-02-28',
  source: 'StarCraft TMG Beta Rules v0.1 (28 Feb 2026) + live Firestore data cross-check',
} as const;
