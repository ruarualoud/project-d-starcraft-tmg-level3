/**
 * Tests for the weapon classification logic used in the Versus Panel.
 * Validates melee/ranged weapon detection and phase-based filtering.
 */
import { describe, it, expect } from 'vitest';
import type { WeaponProfile, UnitCard, Upgrade } from '../types';

// Replicate the classification logic from tools.tsx
function isWeaponMelee(w: WeaponProfile): boolean {
  const r = (w.range || '').toLowerCase().trim();
  if (r === 'melee' || r === '0' || r === '-' || r === '') return true;
  const phase = (w.phase || '').toLowerCase();
  if (phase === 'combat') return true;
  return false;
}

function isWeaponRanged(w: WeaponProfile): boolean {
  return !isWeaponMelee(w);
}

function getUnitWeapons(unit: UnitCard): WeaponProfile[] {
  return unit.upgrades.filter(u => u.weapon).map(u => u.weapon!);
}

function getUnitMeleeWeapons(unit: UnitCard): WeaponProfile[] {
  return getUnitWeapons(unit).filter(isWeaponMelee);
}

function getUnitRangedWeapons(unit: UnitCard): WeaponProfile[] {
  return getUnitWeapons(unit).filter(isWeaponRanged);
}

// Helper to create a weapon profile
function makeWeapon(overrides: Partial<WeaponProfile>): WeaponProfile {
  return {
    name: 'Test Weapon',
    range: '12',
    target: 'Ground',
    roa: '2',
    hit: '3+',
    dmg: '1',
    ...overrides,
  };
}

// Helper to create a unit with weapons
function makeUnit(weapons: WeaponProfile[]): UnitCard {
  const upgrades: Upgrade[] = weapons.map((w, i) => ({
    name: w.name,
    description: '',
    costS: 0,
    costL: 0,
    weapon: w,
  }));
  return {
    id: 'test-unit',
    name: 'Test Unit',
    faction: 'Terran',
    unitType: 'Core',
    stats: { hp: 1, armor: 4 },
    upgrades,
  };
}

describe('Weapon Classification', () => {
  it('should classify melee weapons by range "melee"', () => {
    const w = makeWeapon({ range: 'melee', name: 'Power Blade' });
    expect(isWeaponMelee(w)).toBe(true);
    expect(isWeaponRanged(w)).toBe(false);
  });

  it('should classify melee weapons by range "Melee" (case insensitive)', () => {
    const w = makeWeapon({ range: 'Melee', name: 'Psi Blade' });
    expect(isWeaponMelee(w)).toBe(true);
  });

  it('should classify melee weapons by range "0"', () => {
    const w = makeWeapon({ range: '0', name: 'Claws' });
    expect(isWeaponMelee(w)).toBe(true);
  });

  it('should classify melee weapons by range "-"', () => {
    const w = makeWeapon({ range: '-', name: 'Fists' });
    expect(isWeaponMelee(w)).toBe(true);
  });

  it('should classify melee weapons by empty range', () => {
    const w = makeWeapon({ range: '', name: 'Bite' });
    expect(isWeaponMelee(w)).toBe(true);
  });

  it('should classify melee weapons by phase "combat"', () => {
    const w = makeWeapon({ range: '2', phase: 'combat', name: 'Short Blade' });
    expect(isWeaponMelee(w)).toBe(true);
  });

  it('should classify ranged weapons by numeric range', () => {
    const w = makeWeapon({ range: '12', name: 'Gauss Rifle' });
    expect(isWeaponRanged(w)).toBe(true);
    expect(isWeaponMelee(w)).toBe(false);
  });

  it('should classify ranged weapons with assault phase', () => {
    const w = makeWeapon({ range: '8', phase: 'assault', name: 'Plasma Gun' });
    expect(isWeaponRanged(w)).toBe(true);
  });

  it('should classify ranged weapons with range string like "24"', () => {
    const w = makeWeapon({ range: '24', name: 'Siege Tank Cannon' });
    expect(isWeaponRanged(w)).toBe(true);
  });
});

describe('Unit Weapon Extraction', () => {
  it('should extract all weapons from unit upgrades', () => {
    const meleeW = makeWeapon({ range: 'melee', name: 'Blade' });
    const rangedW = makeWeapon({ range: '12', name: 'Rifle' });
    const unit = makeUnit([meleeW, rangedW]);

    const all = getUnitWeapons(unit);
    expect(all).toHaveLength(2);
  });

  it('should separate melee and ranged weapons', () => {
    const meleeW = makeWeapon({ range: 'melee', name: 'Blade' });
    const rangedW = makeWeapon({ range: '12', name: 'Rifle' });
    const rangedW2 = makeWeapon({ range: '8', name: 'Pistol' });
    const unit = makeUnit([meleeW, rangedW, rangedW2]);

    expect(getUnitMeleeWeapons(unit)).toHaveLength(1);
    expect(getUnitRangedWeapons(unit)).toHaveLength(2);
  });

  it('should handle units with no weapons', () => {
    const unit: UnitCard = {
      id: 'empty',
      name: 'Empty Unit',
      faction: 'Zerg',
      unitType: 'Core',
      stats: { hp: 1 },
      upgrades: [{ name: 'Buff', description: 'Some buff', costS: 10, costL: 20 }],
    };

    expect(getUnitWeapons(unit)).toHaveLength(0);
    expect(getUnitMeleeWeapons(unit)).toHaveLength(0);
    expect(getUnitRangedWeapons(unit)).toHaveLength(0);
  });

  it('should handle units with only melee weapons', () => {
    const w1 = makeWeapon({ range: 'melee', name: 'Claw' });
    const w2 = makeWeapon({ range: '0', name: 'Bite' });
    const unit = makeUnit([w1, w2]);

    expect(getUnitMeleeWeapons(unit)).toHaveLength(2);
    expect(getUnitRangedWeapons(unit)).toHaveLength(0);
  });

  it('should handle units with only ranged weapons', () => {
    const w1 = makeWeapon({ range: '12', name: 'Rifle' });
    const w2 = makeWeapon({ range: '24', name: 'Cannon' });
    const unit = makeUnit([w1, w2]);

    expect(getUnitMeleeWeapons(unit)).toHaveLength(0);
    expect(getUnitRangedWeapons(unit)).toHaveLength(2);
  });
});
