import { describe, it, expect } from 'vitest';
import { calculateCombatExpectation, calculateMatchup, type CombatInput } from '../combat-engine';
import { parseKeywords, parseSurge, extractCombatTag } from '../combat-rules';

// ============================================================
// combat-rules.ts 测试
// ============================================================
describe('parseKeywords', () => {
  it('解析PIERCE关键词', () => {
    const result = parseKeywords('PIERCE [ARMORED] 3');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pierce');
    expect(result[0].params.tag).toBe('ARMOURED');
    expect(result[0].params.damage).toBe(3);
  });

  it('解析CRITICAL HIT关键词', () => {
    const result = parseKeywords('CRITICAL HIT (2)');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('critical_hit');
    expect(result[0].params.count).toBe(2);
  });

  it('解析DODGE关键词', () => {
    const result = parseKeywords('DODGE (1)');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('dodge');
    expect(result[0].params.count).toBe(1);
  });

  it('解析BURST FIRE关键词', () => {
    const result = parseKeywords('BURST FIRE 8" (2)');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('burst_fire');
    expect(result[0].params.range).toBe(8);
    expect(result[0].params.bonus).toBe(2);
  });

  it('解析TITAN KILLERS关键词', () => {
    const result = parseKeywords('TITAN KILLERS 3+ (2)');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('titan_killers');
    expect(result[0].params.minSize).toBe(3);
    expect(result[0].params.damage).toBe(2);
  });

  it('解析TOUGH关键词', () => {
    const result = parseKeywords('TOUGH (2)');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('tough');
    expect(result[0].params.count).toBe(2);
  });

  it('解析多个关键词', () => {
    const result = parseKeywords('HIDDEN, TOUGH (1), DODGE (2)');
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.some(k => k.type === 'hidden')).toBe(true);
    expect(result.some(k => k.type === 'tough')).toBe(true);
    expect(result.some(k => k.type === 'dodge')).toBe(true);
  });

  it('空字符串返回空数组', () => {
    expect(parseKeywords('')).toEqual([]);
  });
});

describe('parseSurge', () => {
  it('解析 Light, Armoured (D3+1)', () => {
    const result = parseSurge('Light, Armoured (D3+1)');
    expect(result.surgeTags).toEqual(['LIGHT', 'ARMOURED']);
    expect(result.surgeDieText).toBe('D3+1');
  });

  it('解析 Anti-Air (D6)', () => {
    const result = parseSurge('Anti-Air (D6)');
    expect(result.surgeTags).toEqual(['FLYING']);
    expect(result.surgeDieText).toBe('D6');
  });

  it('空字符串返回空结构', () => {
    const result = parseSurge('');
    expect(result.surgeTags).toEqual([]);
    expect(result.surgeDieText).toBeNull();
  });

  it('破折号返回空结构', () => {
    const result = parseSurge('-');
    expect(result.surgeTags).toEqual([]);
    expect(result.surgeDieText).toBeNull();
  });
});

describe('extractCombatTag', () => {
  it('默认返回Ground', () => {
    expect(extractCombatTag('')).toBe('Ground');
    expect(extractCombatTag('Infantry')).toBe('Ground');
  });

  it('Flying标签', () => {
    expect(extractCombatTag('Flying')).toBe('Flying');
    expect(extractCombatTag('Air, Heavy')).toBe('Flying');
  });
});

// ============================================================
// combat-engine.ts 测试
// ============================================================
describe('calculateCombatExpectation', () => {
  const baseInput: CombatInput = {
    weapon: {
      name: 'C-14 Gauss Rifle',
      range: '24',
      target: '1',
      roa: '2',
      hit: '4',
      dmg: '1',
      surge: '',
      keywords: '',
    },
    attackerModels: 4,
    attackerKeywords: '',
    weaponKeywords: '',
    defenderStats: { hp: 1, armor: 5, shield: 0, evade: 0, speed: 0 },
    defenderKeywords: '',
    defenderTags: 'Ground, Infantry',
    defenderModels: 4,
    hitModifier: 0,
    inBurstRange: false,
    isCharge: false,
    defenderCanEvade: false,
  };

  it('基本攻击计算正确', () => {
    const result = calculateCombatExpectation(baseInput);

    // 4模型 × 2 RoA = 8骰
    expect(result.totalAttackDice).toBe(8);

    // 4+命中 = 3/6 = 50%
    expect(result.hitProbability).toBeCloseTo(0.5, 1);

    // 8 × 0.5 = 4命中
    expect(result.expectedHits).toBeCloseTo(4, 0);

    // 无surge
    expect(result.expectedSurgeBypassed).toBe(0);

    // 护甲5+ = 2/6 ≈ 33%
    expect(result.armourSaveProbability).toBeCloseTo(1 / 3, 1);

    // 总伤害 > 0
    expect(result.expectedTotalDamage).toBeGreaterThan(0);

    // 有步骤详情
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('无护甲目标伤害更高', () => {
    const noArmor = {
      ...baseInput,
      defenderStats: { ...baseInput.defenderStats, armor: 0 },
    };
    const withArmor = calculateCombatExpectation(baseInput);
    const withoutArmor = calculateCombatExpectation(noArmor);

    expect(withoutArmor.expectedTotalDamage).toBeGreaterThan(withArmor.expectedTotalDamage);
  });

  it('命中修正影响命中率', () => {
    const buffed = {
      ...baseInput,
      hitModifier: 1, // +1 = 3+命中
    };
    const normal = calculateCombatExpectation(baseInput);
    const improved = calculateCombatExpectation(buffed);

    expect(improved.hitProbability).toBeGreaterThan(normal.hitProbability);
    expect(improved.expectedTotalDamage).toBeGreaterThan(normal.expectedTotalDamage);
  });

  it('Surge对匹配目标生效', () => {
    const withSurge: CombatInput = {
      ...baseInput,
      weapon: { ...baseInput.weapon, surge: 'Anti-Ground D3' },
    };
    const result = calculateCombatExpectation(withSurge);

    // 目标是Ground，Surge应该生效
    expect(result.expectedSurgeBypassed).toBeGreaterThan(0);
    expect(result.activeKeywords.some(k => k.name.includes('SURGE'))).toBe(true);
  });

  it('Surge对不匹配目标无效', () => {
    const withSurge: CombatInput = {
      ...baseInput,
      weapon: { ...baseInput.weapon, surge: 'Anti-Air D3' },
      defenderTags: 'Ground, Infantry',
    };
    const result = calculateCombatExpectation(withSurge);

    // 目标是Ground，Anti-Air不匹配
    expect(result.expectedSurgeBypassed).toBe(0);
  });

  it('BURST FIRE在范围内增加RoA', () => {
    const withBurst: CombatInput = {
      ...baseInput,
      weaponKeywords: 'BURST FIRE 8" (2)',
      inBurstRange: true,
    };
    const normal = calculateCombatExpectation(baseInput);
    const burst = calculateCombatExpectation(withBurst);

    // Burst Fire增加RoA，总攻击骰应该更多
    expect(burst.totalAttackDice).toBeGreaterThan(normal.totalAttackDice);
    expect(burst.activeKeywords.some(k => k.name.includes('BURST FIRE'))).toBe(true);
  });

  it('BURST FIRE不在范围内无效', () => {
    const withBurst: CombatInput = {
      ...baseInput,
      weaponKeywords: 'BURST FIRE 8" (2)',
      inBurstRange: false,
    };
    const normal = calculateCombatExpectation(baseInput);
    const burst = calculateCombatExpectation(withBurst);

    expect(burst.totalAttackDice).toBe(normal.totalAttackDice);
  });

  it('TOUGH增加护甲保存', () => {
    const withTough: CombatInput = {
      ...baseInput,
      defenderKeywords: 'TOUGH (2)',
    };
    const normal = calculateCombatExpectation(baseInput);
    const tough = calculateCombatExpectation(withTough);

    expect(tough.expectedArmourSaves).toBeGreaterThan(normal.expectedArmourSaves);
    expect(tough.expectedTotalDamage).toBeLessThan(normal.expectedTotalDamage);
  });

  it('闪避减少伤害', () => {
    const withEvade: CombatInput = {
      ...baseInput,
      defenderStats: { ...baseInput.defenderStats, evade: 4 },
      defenderCanEvade: true,
    };
    const normal = calculateCombatExpectation(baseInput);
    const evade = calculateCombatExpectation(withEvade);

    expect(evade.expectedEvadeSaves).toBeGreaterThan(0);
    expect(evade.expectedTotalDamage).toBeLessThan(normal.expectedTotalDamage);
  });

  it('击杀数不超过防御方模型数', () => {
    const overkill: CombatInput = {
      ...baseInput,
      attackerModels: 20,
      defenderModels: 2,
    };
    const result = calculateCombatExpectation(overkill);
    expect(result.expectedKills).toBeLessThanOrEqual(2);
  });

  it('PIERCE对匹配tag增加伤害', () => {
    const withPierce: CombatInput = {
      ...baseInput,
      weaponKeywords: 'PIERCE [ARMORED] 3',
      defenderTags: 'Ground, Armored',
    };
    const normal = calculateCombatExpectation(baseInput);
    const pierce = calculateCombatExpectation(withPierce);

    // PIERCE将伤害从1提升到3
    expect(pierce.damagePerDie).toBe(3);
    expect(pierce.expectedTotalDamage).toBeGreaterThan(normal.expectedTotalDamage);
  });

  it('基础武器DMG会直接作为每颗伤害池骰子的伤害值', () => {
    const dmgTwo: CombatInput = {
      ...baseInput,
      weapon: {
        ...baseInput.weapon,
        name: 'Particle Disruptors',
        roa: '4',
        hit: '3+',
        dmg: '2',
        surge: 'Armoured (D3)',
      },
      defenderTags: 'Armoured, Mechanical, Ground',
      defenderStats: { hp: 6, shield: 3, armor: 4, evade: 6, speed: 4 },
      defenderModels: 1,
    };
    const result = calculateCombatExpectation(dmgTwo);

    expect(result.damagePerDie).toBe(2);
    expect(result.expectedTotalDamage).toBeCloseTo(result.expectedDamagePoolDice * 2, 5);
  });

  it('PIERCE Armoured 会在劫掠者攻击装甲目标时把每颗伤害池骰子的伤害改为2', () => {
    const marauderIntoStalker: CombatInput = {
      ...baseInput,
      weapon: {
        ...baseInput.weapon,
        name: 'Quad K12',
        roa: '3',
        hit: '3+',
        dmg: '1',
        surge: 'Armoured (D3)',
      },
      weaponKeywords: 'PIERCE Armoured (2)',
      defenderTags: 'Armoured, Mechanical, Ground',
      defenderStats: { hp: 6, shield: 3, armor: 4, evade: 6, speed: 4 },
      defenderModels: 1,
    };
    const nonArmoured = calculateCombatExpectation({
      ...marauderIntoStalker,
      defenderTags: 'Light, Biological, Ground',
      defenderStats: { hp: 1, shield: 0, armor: 5, evade: 0, speed: 0 },
    });
    const armoured = calculateCombatExpectation(marauderIntoStalker);

    expect(armoured.damagePerDie).toBe(2);
    expect(nonArmoured.damagePerDie).toBe(1);
    expect(armoured.expectedTotalDamage).toBeGreaterThan(nonArmoured.expectedTotalDamage);
  });

  it('Surge 绕过护甲进入伤害池后，仍会计入最终伤害池骰子', () => {
    const result = calculateCombatExpectation({
      ...baseInput,
      attackerModels: 1,
      weapon: {
        ...baseInput.weapon,
        name: 'Quad K12 Test',
        roa: '6',
        hit: '3+',
        dmg: '2',
        surge: 'Armoured (D3)',
      },
      defenderTags: 'Armoured, Mechanical, Ground',
      defenderStats: { hp: 6, shield: 3, armor: 4, evade: 0, speed: 0 },
      defenderModels: 1,
    });

    expect(result.expectedHits).toBeCloseTo(4, 5);
    expect(result.expectedSurgeBypassed).toBeCloseTo(2, 5);
    expect(result.expectedArmourSaves).toBeCloseTo(1, 5);
    expect(result.expectedDamagePoolDice).toBeCloseTo(3, 5);
    expect(result.expectedTotalDamage).toBeCloseTo(6, 5);
  });

  it('Evade 会对包含 Surge / Critical Hit 绕过骰在内的整个伤害池生效', () => {
    const surgeResult = calculateCombatExpectation({
      ...baseInput,
      attackerModels: 1,
      weapon: {
        ...baseInput.weapon,
        name: 'Evade Surge Test',
        roa: '6',
        hit: '3+',
        dmg: '2',
        surge: 'Armoured (D3)',
      },
      defenderCanEvade: true,
      defenderTags: 'Armoured, Mechanical, Ground',
      defenderStats: { hp: 6, shield: 3, armor: 4, evade: 6, speed: 0 },
      defenderModels: 1,
    });

    const critResult = calculateCombatExpectation({
      ...baseInput,
      attackerModels: 1,
      weapon: {
        ...baseInput.weapon,
        name: 'Evade Crit Test',
        roa: '6',
        hit: '3+',
        dmg: '1',
        surge: '',
      },
      weaponKeywords: 'CRITICAL HIT (2)',
      defenderCanEvade: true,
      defenderTags: 'Ground, Infantry',
      defenderStats: { hp: 1, shield: 0, armor: 4, evade: 6, speed: 0 },
      defenderModels: 4,
    });

    expect(surgeResult.expectedEvadeSaves).toBeCloseTo(0.5, 5);
    expect(surgeResult.expectedDamagePoolDice).toBeCloseTo(2.5, 5);
    expect(surgeResult.expectedTotalDamage).toBeCloseTo(5, 5);
    expect(critResult.expectedEvadeSaves).toBeCloseTo(0.5, 5);
    expect(critResult.expectedDamagePoolDice).toBeCloseTo(2.5, 5);
    expect(critResult.expectedTotalDamage).toBeCloseTo(2.5, 5);
  });

  it('Titan Killers 会在近战攻击 Size 3+ 目标时把伤害改为2', () => {
    const titanKillers: CombatInput = {
      ...baseInput,
      weapon: {
        ...baseInput.weapon,
        name: 'Psi Blades',
        range: 'E',
        roa: '4',
        hit: '3+',
        dmg: '1',
        surge: 'Light (D3)',
      },
      weaponKeywords: 'TITAN KILLERS 3+ (2)',
      attackKind: 'melee',
      defenderStats: { hp: 4, shield: 0, armor: 5, evade: 0, speed: 0, size: '3' },
      defenderTags: 'Armoured, Ground',
      defenderModels: 1,
    };
    const smallTarget = calculateCombatExpectation({
      ...titanKillers,
      defenderStats: { hp: 1, shield: 0, armor: 5, evade: 0, speed: 0, size: '2' },
    });
    const largeTarget = calculateCombatExpectation(titanKillers);

    expect(smallTarget.damagePerDie).toBe(1);
    expect(largeTarget.damagePerDie).toBe(2);
    expect(largeTarget.expectedTotalDamage).toBeGreaterThan(smallTarget.expectedTotalDamage);
  });

  it('成功Charge时 IMPACT 会额外增加伤害', () => {
    const withImpact: CombatInput = {
      ...baseInput,
      weaponKeywords: 'IMPACT (3) 4+',
      isCharge: true,
      defenderTags: 'Ground, Light',
      defenderStats: { hp: 1, armor: 6, shield: 0, evade: 0, speed: 0 },
    };
    const withoutCharge = calculateCombatExpectation({ ...withImpact, isCharge: false });
    const withCharge = calculateCombatExpectation(withImpact);

    expect(withCharge.expectedTotalDamage).toBeGreaterThan(withoutCharge.expectedTotalDamage);
    expect(withCharge.activeKeywords.some(k => k.name.includes('IMPACT'))).toBe(true);
  });

  it('IMPACT BONUS 会增加冲锋时的额外 Impact 骰', () => {
    const baseImpact: CombatInput = {
      ...baseInput,
      weaponKeywords: 'IMPACT (3) 4+',
      isCharge: true,
      attackKind: 'melee',
      defenderTags: 'Ground, Light',
      defenderStats: { hp: 1, armor: 6, shield: 0, evade: 0, speed: 0 },
    };
    const normal = calculateCombatExpectation(baseImpact);
    const buffed = calculateCombatExpectation({
      ...baseImpact,
      weaponKeywords: 'IMPACT (3) 4+, IMPACT BONUS (1)',
    });

    expect(buffed.expectedTotalDamage).toBeGreaterThan(normal.expectedTotalDamage);
    expect(buffed.activeKeywords.some(k => k.name.includes('IMPACT BONUS'))).toBe(true);
  });
});

describe('calculateMatchup', () => {
  it('双向对抗计算正确', () => {
    const result = calculateMatchup({
      unitAName: 'Marine',
      unitAWeapons: [{
        name: 'C-14 Gauss Rifle',
        range: '24', target: '1', roa: '2', hit: '4', dmg: '1', surge: '', keywords: '',
      }],
      unitAModels: 4,
      unitAStats: { hp: 1, armor: 5, shield: 0, evade: 0, speed: 0 },
      unitAKeywords: '',
      unitATags: 'Ground, Infantry',
      unitBName: 'Zergling',
      unitBWeapons: [{
        name: 'Claws',
        range: '0', target: '1', roa: '2', hit: '4', dmg: '1', surge: '', keywords: '',
      }],
      unitBModels: 6,
      unitBStats: { hp: 1, armor: 6, shield: 0, evade: 0, speed: 0 },
      unitBKeywords: '',
      unitBTags: 'Ground, Light',
    });

    expect(result.unitAName).toBe('Marine');
    expect(result.unitBName).toBe('Zergling');
    expect(result.aToBResults.length).toBe(1);
    expect(result.bToAResults.length).toBe(1);
    expect(result.totalDmgAtoB).toBeGreaterThan(0);
    expect(result.totalDmgBtoA).toBeGreaterThan(0);
    expect(['A', 'B', 'even']).toContain(result.advantage);
    expect(result.summary).toBeTruthy();
  });

  it('无武器单位不产生伤害', () => {
    const result = calculateMatchup({
      unitAName: 'Marine',
      unitAWeapons: [{
        name: 'C-14 Gauss Rifle',
        range: '24', target: '1', roa: '2', hit: '4', dmg: '1', surge: '', keywords: '',
      }],
      unitAModels: 4,
      unitAStats: { hp: 1, armor: 5, shield: 0, evade: 0, speed: 0 },
      unitAKeywords: '',
      unitATags: 'Ground, Infantry',
      unitBName: 'Unarmed',
      unitBWeapons: [],
      unitBModels: 4,
      unitBStats: { hp: 1, armor: 5, shield: 0, evade: 0, speed: 0 },
      unitBKeywords: '',
      unitBTags: 'Ground',
    });

    expect(result.totalDmgBtoA).toBe(0);
    expect(result.totalDmgAtoB).toBeGreaterThan(0);
    expect(result.advantage).toBe('A');
  });
});
