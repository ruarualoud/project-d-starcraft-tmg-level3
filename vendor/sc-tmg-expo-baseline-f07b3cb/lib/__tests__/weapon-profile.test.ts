import { describe, expect, it } from 'vitest';
import { sanitizeWeaponProfile, normalizeDataPackage, normalizeUnitCard } from '../weapon-profile';
import type { UnitCard, WeaponProfile } from '../types';

describe('weapon profile sanitization', () => {
  it('cleans leaked SURGE and PIERCE text out of Marauder damage while preserving Pierce keyword', () => {
    const broken: WeaponProfile = {
      name: 'Quad K12',
      range: '12',
      target: 'Ground',
      roa: '3',
      hit: '3+',
      dmg: '1\nSURGE: Armoured (D3)\n\nPIERCE Armoured (2)',
      surge: 'Armoured (D3)',
      keywords: '',
      phase: 'Assault Phase',
    };

    const fixed = sanitizeWeaponProfile(
      broken,
      'RANGE: 12 | TARGET: Ground | RoA: 3 | HIT: 3+ | DMG: 1\nSURGE: Armoured (D3)\n\nPIERCE Armoured (2)'
    );

    expect(fixed.dmg).toBe('1');
    expect(fixed.surge).toBe('Armoured (D3)');
    expect(fixed.keywords).toContain('PIERCE ARMOURED (2)');
  });

  it('keeps Stalker weapon damage as 2 instead of swallowing the surge line', () => {
    const broken: WeaponProfile = {
      name: 'Particle Disruptors',
      range: '12',
      target: 'All',
      roa: '4',
      hit: '3+',
      dmg: '2\nSURGE: Armoured (D3)',
      surge: 'Armoured (D3)',
      keywords: '',
      phase: 'Assault Phase',
    };

    const fixed = sanitizeWeaponProfile(
      broken,
      'RANGE: 12 | TARGET: All | RoA: 4 | HIT: 3+ | DMG: 2\nSURGE: Armoured (D3)'
    );

    expect(fixed.dmg).toBe('2');
    expect(fixed.surge).toBe('Armoured (D3)');
  });

  it('normalizes legacy stored unit data on load without requiring a resync', () => {
    const unit: UnitCard = {
      id: 'marauder',
      name: 'Marauder',
      faction: 'Terran',
      unitType: 'Core',
      stats: { hp: 5, armor: 4 },
      upgrades: [
        {
          name: 'Quad K12',
          description: 'RANGE: 12 | TARGET: Ground | RoA: 3 | HIT: 3+ | DMG: 1\nSURGE: Armoured (D3)\n\nPIERCE Armoured (2)',
          costS: 0,
          costL: 0,
          weapon: {
            name: 'Quad K12',
            range: '12',
            target: 'Ground',
            roa: '3',
            hit: '3+',
            dmg: '1\nSURGE: Armoured (D3)\n\nPIERCE Armoured (2)',
            surge: 'Armoured (D3)',
            keywords: '',
          },
        },
      ],
    };

    const fixed = normalizeUnitCard(unit);
    expect(fixed.upgrades[0].weapon?.dmg).toBe('1');
    expect(fixed.upgrades[0].weapon?.keywords).toContain('PIERCE ARMOURED (2)');
  });

  it('normalizes imported data packages before they enter app state', () => {
    const fixed = normalizeDataPackage({
      version: 1,
      exportedAt: 1,
      units: [
        {
          id: 'stalker',
          name: 'Stalker',
          faction: 'Protoss',
          unitType: 'Core',
          stats: { hp: 6, shield: 3, armor: 4, evade: 6 },
          upgrades: [
            {
              name: 'Particle Disruptors',
              description: 'RANGE: 12 | TARGET: All | RoA: 4 | HIT: 3+ | DMG: 2\nSURGE: Armoured (D3)',
              costS: 0,
              costL: 0,
              weapon: {
                name: 'Particle Disruptors',
                range: '12',
                target: 'All',
                roa: '4',
                hit: '3+',
                dmg: '2\nSURGE: Armoured (D3)',
                surge: 'Armoured (D3)',
                keywords: '',
              },
            },
          ],
        },
      ],
      cards: [],
      gameCards: [],
    });

    expect(fixed.units[0].upgrades[0].weapon?.dmg).toBe('2');
    expect(fixed.units[0].upgrades[0].weapon?.surge).toBe('Armoured (D3)');
  });
});
