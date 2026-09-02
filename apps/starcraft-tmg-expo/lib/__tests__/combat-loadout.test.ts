import { describe, expect, it } from 'vitest';

import { calculateCombatExpectation } from '../combat-engine';
import { deriveCombatEffects, getOptionalUpgrades, getWeaponLoadout } from '../combat-loadout';
import type { UnitCard } from '../types';

const marauder: UnitCard = {
  id: 'marauder',
  name: 'Marauder',
  faction: 'Terran',
  unitType: 'Core',
  stats: { hp: 5, armor: 4, evade: 6, speed: 4, shield: 0, size: '2' },
  keywords: '',
  tags: 'Armoured, Biological, Ground',
  upgrades: [
    {
      name: 'Stimpack',
      description: 'This Unit suffers NON-LETHAL DAMAGE (2). This Unit gains BUFF Speed (3). Additionally, its Quad K12 and all Close Combat Weapons gain PRECISION (2).',
      phase: 'Movement Phase',
      costS: 0,
      costL: 0,
      activation: '<Active>\n(1 Command Point)',
      linkedTo: '',
    },
    {
      name: 'Quad K12',
      description: 'RANGE: 12 | TARGET: Ground | RoA: 3 | HIT: 3+ | DMG: 1\nSURGE: Armoured (D3)\n\nPIERCE Armoured (2)',
      phase: 'Assault Phase',
      costS: 0,
      costL: 0,
      activation: '',
      linkedTo: '-',
      weapon: {
        name: 'Quad K12',
        range: '12',
        target: 'Ground',
        roa: '3',
        hit: '3+',
        dmg: '1',
        surge: 'Armoured (D3)',
        keywords: 'PIERCE Armoured (2)',
      },
    },
    {
      name: 'Strike',
      description: 'RANGE: E | TARGET: Ground | RoA: 2 | HIT: 4+ | DMG: 1',
      phase: 'Combat Phase',
      costS: 0,
      costL: 0,
      activation: '',
      linkedTo: '-',
      weapon: {
        name: 'Strike',
        range: 'E',
        target: 'Ground',
        roa: '2',
        hit: '4+',
        dmg: '1',
        surge: '',
        keywords: '',
      },
    },
  ],
};

describe('combat-loadout activation handling', () => {
  it('treats zero-cost active abilities like Stimpack as selectable instead of always active', () => {
    const options = getOptionalUpgrades(marauder);
    expect(options.map(option => option.upgrade.name)).toContain('Stimpack');

    const weaponsWithoutStim = getWeaponLoadout(marauder, []);
    expect(weaponsWithoutStim.map(item => item.weapon.name)).toEqual(['Quad K12', 'Strike']);

    const quadWithoutStim = deriveCombatEffects({
      unit: marauder,
      selectedUpgradeIndexes: [],
      selectedWeapon: weaponsWithoutStim[0].weapon,
      attackKind: 'ranged',
      sourceUnitEngaged: false,
    });
    expect(quadWithoutStim.weaponKeywords).not.toContain('PRECISION (2)');

  });
});

describe('combat-engine contribution breakdowns', () => {
  it('splits natural hits, precision bonus, armour-fail pool, and bypass pool contributions', () => {
    const result = calculateCombatExpectation({
      weapon: {
        name: 'Quad K12',
        range: '12',
        target: 'Ground',
        roa: '3',
        hit: '3+',
        dmg: '1',
        surge: 'Armoured (D3)',
        keywords: '',
      },
      attackerModels: 2,
      attackerKeywords: '',
      weaponKeywords: 'PRECISION (2), PIERCE Armoured (2)',
      defenderStats: { hp: 6, shield: 3, armor: 4, evade: 0, speed: 0, size: '2' },
      defenderKeywords: '',
      defenderTags: 'Armoured, Ground, Mechanical',
      defenderModels: 1,
      hitModifier: 0,
      inBurstRange: false,
      isCharge: false,
      defenderCanEvade: false,
    });

    expect(result.baseExpectedHits).toBeCloseTo(4, 5);
    expect(result.bonusExpectedHits).toBeCloseTo(2, 5);
    expect(result.expectedHits).toBeCloseTo(6, 5);
    expect(result.expectedSurgeBypassed).toBeCloseTo(2, 5);
    expect(result.expectedCriticalBypassed).toBeCloseTo(0, 5);
    expect(result.expectedBypassedDamagePoolDice).toBeCloseTo(2, 5);
    expect(result.expectedDamagePoolFromArmour).toBeCloseTo(2, 5);
    expect(result.expectedDamagePoolBeforeEvade).toBeCloseTo(4, 5);
    expect(result.expectedDamagePoolDice).toBeCloseTo(4, 5);
    expect(result.expectedTotalDamage).toBeCloseTo(8, 5);
  });
});
