import { extractWeaponKeywords } from './combat-rules';
import type { DataPackage, UnitCard, Upgrade, WeaponProfile } from './types';

function firstInlineValue(value: string | undefined | null, fallback = '-'): string {
  if (!value) return fallback;
  const cleaned = String(value)
    .split(/\r?\n/)[0]
    .split('|')[0]
    .trim();
  return cleaned || fallback;
}

function extractField(desc: string, label: 'RANGE' | 'TARGET' | 'RoA' | 'HIT' | 'DMG' | 'SURGE'): string | undefined {
  const match = desc.match(new RegExp(`${label}:\\s*([^|\\n\\r]+)`, 'i'));
  return match?.[1]?.trim();
}

export function sanitizeWeaponProfile(weapon: WeaponProfile, description = ''): WeaponProfile {
  const dmg = firstInlineValue(weapon.dmg);
  const descSurge = extractField(description, 'SURGE');
  const leakedSurge = extractField(String(weapon.dmg || ''), 'SURGE');
  const surge = firstInlineValue(descSurge || weapon.surge || leakedSurge || '', '');

  const keywordSource = [
    description,
    weapon.keywords || '',
    String(weapon.dmg || ''),
    String(weapon.surge || ''),
  ].filter(Boolean).join('\n');
  const extractedKeywords = extractWeaponKeywords(keywordSource);
  const keywords = [weapon.keywords || '', extractedKeywords]
    .filter(Boolean)
    .join(', ')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .filter((part, index, arr) => arr.indexOf(part) === index)
    .join(', ');

  return {
    ...weapon,
    range: firstInlineValue(weapon.range),
    target: firstInlineValue(weapon.target),
    roa: firstInlineValue(weapon.roa, '1'),
    hit: firstInlineValue(weapon.hit),
    dmg,
    surge,
    keywords,
  };
}

export function normalizeUpgrade(upgrade: Upgrade): Upgrade {
  if (!upgrade.weapon) return upgrade;
  return {
    ...upgrade,
    weapon: sanitizeWeaponProfile(upgrade.weapon, upgrade.description || ''),
  };
}

export function normalizeUnitCard(unit: UnitCard): UnitCard {
  return {
    ...unit,
    upgrades: (unit.upgrades || []).map(normalizeUpgrade),
  };
}

export function normalizeUnitCards(units: UnitCard[]): UnitCard[] {
  return (units || []).map(normalizeUnitCard);
}

export function normalizeDataPackage(pkg: DataPackage): DataPackage {
  return {
    ...pkg,
    units: normalizeUnitCards(pkg.units || []),
  };
}
