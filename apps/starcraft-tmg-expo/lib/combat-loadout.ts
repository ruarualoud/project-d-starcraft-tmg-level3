import { extractWeaponKeywords, parseKeywords } from './combat-rules';
import type { UnitCard, Upgrade, WeaponProfile } from './types';

export interface WeaponLoadout {
  weapon: WeaponProfile;
  upgradeIndex: number;
  sourceUpgrade: Upgrade;
  isSelected: boolean;
}

export interface CombatDerivedEffects {
  unitKeywords: string;
  weaponKeywords: string;
  explicitEvade: boolean;
  notes: string[];
}

function uniq(items: string[]): string[] {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

function splitWeaponNames(text: string): string[] {
  return text
    .split(/,| and /i)
    .map(part => part.replace(/weapons?/gi, '').replace(/weapon/gi, '').replace(/['’]s/gi, '').trim())
    .filter(Boolean);
}

function upgradeIsOptional(upgrade: Upgrade): boolean {
  return (upgrade.costS || 0) > 0 || (upgrade.costL || 0) > 0;
}

function upgradeActivationKind(upgrade: Upgrade): 'passive' | 'active' | 'reaction' | 'other' {
  const activation = (upgrade.activation || '').toUpperCase();
  if (activation.includes('<PASSIVE>')) return 'passive';
  if (activation.includes('<ACTIVE>')) return 'active';
  if (activation.includes('<REACTION>')) return 'reaction';
  return 'other';
}

function upgradeRequiresSelection(upgrade: Upgrade): boolean {
  if (upgrade.weapon) return upgradeIsOptional(upgrade);
  if (upgradeIsOptional(upgrade)) return true;
  return upgradeActivationKind(upgrade) !== 'passive';
}

export function getWeaponLoadout(unit: UnitCard, selectedUpgradeIndexes: number[]): WeaponLoadout[] {
  const selectedSet = new Set(selectedUpgradeIndexes);
  return unit.upgrades
    .map((upgrade, index) => ({ upgrade, index }))
    .filter(({ upgrade }) => !!upgrade.weapon)
    .filter(({ upgrade, index }) => !upgradeRequiresSelection(upgrade) || selectedSet.has(index))
    .map(({ upgrade, index }) => ({
      weapon: upgrade.weapon!,
      upgradeIndex: index,
      sourceUpgrade: upgrade,
      isSelected: selectedSet.has(index) || !upgradeRequiresSelection(upgrade),
    }));
}

function keywordTextToList(text: string): string[] {
  if (!text) return [];
  return text
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function descriptionGrantsEvade(description: string, attackKind: 'ranged' | 'melee', sourceUnitEngaged: boolean): boolean {
  const upper = description.toUpperCase();
  if (upper.includes('EVADE ROLL AGAINST EVERY ATTACK') || upper.includes('EVADE ROLL AGAINST ALL ATTACKS')) return true;
  if (upper.includes('EVADE ROLL AGAINST ANY CLOSE COMBAT ATTACK') && attackKind === 'melee') return true;
  if (upper.includes('EVADE ROLL AGAINST THOSE ATTACKS') && upper.includes('WHILE ENGAGED') && sourceUnitEngaged) return true;
  return false;
}

function descriptionGrantedKeywordsForWeapon(description: string, selectedWeapon: WeaponProfile, attackKind: 'ranged' | 'melee'): string[] {
  const upper = description.toUpperCase();
  const derived: string[] = [];

  if (upper.includes('GAIN')) {
    const keywordTail = upper.slice(upper.indexOf('GAIN'));
    const extracted = extractWeaponKeywords(keywordTail);
    const extractedList = keywordTextToList(extracted);

    const weaponNameUpper = (selectedWeapon.name || '').toUpperCase();
    const isMelee = attackKind === 'melee';
    const isRanged = attackKind === 'ranged';

    const explicitWeaponMatch = upper.match(/(?:THIS UNIT[’'S ]+|ITS\s+)(.+?)\s+WEAPONS?\s+GAIN/i);
    if (explicitWeaponMatch) {
      const names = splitWeaponNames(explicitWeaponMatch[1].toUpperCase());
      if (names.some(name => weaponNameUpper.includes(name))) {
        derived.push(...extractedList);
      }
    }

    if (upper.includes('ALL CLOSE COMBAT WEAPONS GAIN') && isMelee) {
      derived.push(...extractedList);
    }

    if (upper.includes('ALL RANGED WEAPONS GAIN') && isRanged) {
      derived.push(...extractedList);
    }

    if (upper.includes('THIS WEAPON GAINS')) {
      derived.push(...extractedList);
    }
  }

  const impactMatch = upper.match(/RESOLVE THE IMPACT\s*\((\d+)\)\s*(\d+)\+?\s*EFFECT/);
  if (impactMatch && attackKind === 'melee') {
    derived.push(`IMPACT (${impactMatch[1]}) ${impactMatch[2]}+`);
  }

  const impactBonusMatch = upper.match(/EACH ELIGIBLE MODEL GENERATES\s*(\d+)\s*ADDITIONAL IMPACT DIE/);
  if (impactBonusMatch && attackKind === 'melee') {
    derived.push(`IMPACT BONUS (${impactBonusMatch[1]})`);
  }

  const titanKillersMatch = upper.match(/TARGET IS SIZE\s*(\d+)\s*OR LARGER,?\s*THE WEAPON[’'S ]+DAMAGE CHARACTERISTIC IS TREATED AS\s*(\d+)/);
  if (titanKillersMatch && attackKind === 'melee') {
    derived.push(`TITAN KILLERS ${titanKillersMatch[1]}+ (${titanKillersMatch[2]})`);
  }

  return uniq(derived);
}

function descriptionGrantedUnitKeywords(description: string): string[] {
  const upper = description.toUpperCase();
  if (!upper.includes('THIS UNIT GAINS') && !upper.includes('UNIT GAINS')) return [];
  return uniq(keywordTextToList(extractWeaponKeywords(upper)));
}

function upgradeIsActive(upgrade: Upgrade, index: number, selectedSet: Set<number>): boolean {
  return selectedSet.has(index) || !upgradeRequiresSelection(upgrade);
}

export function deriveUnitCombatEffects(params: {
  unit: UnitCard;
  selectedUpgradeIndexes: number[];
  attackKind: 'ranged' | 'melee';
  sourceUnitEngaged: boolean;
}): Omit<CombatDerivedEffects, 'weaponKeywords'> {
  const { unit, selectedUpgradeIndexes, attackKind, sourceUnitEngaged } = params;
  const selectedSet = new Set(selectedUpgradeIndexes);
  const baseUnitKeywords = keywordTextToList(unit.keywords || '');
  const notes: string[] = [];
  let explicitEvade = false;
  const extraUnitKeywords: string[] = [];

  unit.upgrades.forEach((upgrade, index) => {
    if (!upgradeIsActive(upgrade, index, selectedSet)) return;
    const description = upgrade.description || '';

    const unitGrant = descriptionGrantedUnitKeywords(description);
    if (unitGrant.length > 0) {
      extraUnitKeywords.push(...unitGrant);
      notes.push(`${upgrade.name}: ${unitGrant.join(', ')}`);
    }

    if (descriptionGrantsEvade(description, attackKind, sourceUnitEngaged)) {
      explicitEvade = true;
      notes.push(`${upgrade.name}: grants Evade Roll in current context`);
    }
  });

  const unitKeywords = uniq([...baseUnitKeywords, ...extraUnitKeywords]).join(', ');
  const normalizedUnitKeywords = parseKeywords(unitKeywords).length > 0 ? uniq([...keywordTextToList(unit.keywords || ''), ...keywordTextToList(unitKeywords)]).join(', ') : unitKeywords;

  return {
    unitKeywords: normalizedUnitKeywords,
    explicitEvade,
    notes: uniq(notes),
  };
}

export function deriveCombatEffects(params: {
  unit: UnitCard;
  selectedUpgradeIndexes: number[];
  selectedWeapon: WeaponProfile;
  attackKind: 'ranged' | 'melee';
  sourceUnitEngaged: boolean;
}): CombatDerivedEffects {
  const { unit, selectedUpgradeIndexes, selectedWeapon, attackKind, sourceUnitEngaged } = params;
  const unitEffects = deriveUnitCombatEffects({ unit, selectedUpgradeIndexes, attackKind, sourceUnitEngaged });
  const selectedSet = new Set(selectedUpgradeIndexes);
  const baseWeaponKeywords = keywordTextToList(selectedWeapon.keywords || '');
  const notes = [...unitEffects.notes];
  const extraWeaponKeywords: string[] = [];

  unit.upgrades.forEach((upgrade, index) => {
    if (!upgradeIsActive(upgrade, index, selectedSet)) return;
    const description = upgrade.description || '';
    const weaponGrant = descriptionGrantedKeywordsForWeapon(description, selectedWeapon, attackKind);
    if (weaponGrant.length > 0) {
      extraWeaponKeywords.push(...weaponGrant);
      notes.push(`${upgrade.name}: ${weaponGrant.join(', ')} -> ${selectedWeapon.name}`);
    }
  });

  const weaponKeywords = uniq([...baseWeaponKeywords, ...extraWeaponKeywords]).join(', ');
  const normalizedWeaponKeywords = parseKeywords(weaponKeywords).length > 0 ? uniq([...keywordTextToList(selectedWeapon.keywords || ''), ...keywordTextToList(weaponKeywords)]).join(', ') : weaponKeywords;

  return {
    unitKeywords: unitEffects.unitKeywords,
    weaponKeywords: normalizedWeaponKeywords,
    explicitEvade: unitEffects.explicitEvade,
    notes: uniq(notes),
  };
}

export function getOptionalUpgrades(unit: UnitCard): Array<{ upgrade: Upgrade; index: number }> {
  return unit.upgrades
    .map((upgrade, index) => ({ upgrade, index }))
    .filter(({ upgrade }) => upgradeRequiresSelection(upgrade));
}
