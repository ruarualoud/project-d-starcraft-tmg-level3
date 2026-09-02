import type { TacticalCard, UnitCard, WeaponProfile } from './types';
import { extractWeaponKeywords } from './combat-rules';

export type CardCombatEffectKind = 'weapon_keywords' | 'unit_keywords';

export interface CardCombatEffect {
  id: string;
  sourceCardId: string;
  sourceCardName: string;
  boostName: string;
  description: string;
  kind: CardCombatEffectKind;
  appliesTo: 'attacker' | 'defender';
  attackKinds: Array<'ranged' | 'melee'>;
  weaponKeywords?: string[];
  unitKeywords?: string[];
  requiredTags?: string[];
}

function uniq(items: string[]): string[] {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

function parseRequiredTags(text: string): string[] {
  const tags: string[] = [];
  if (text.includes('GROUND UNIT')) tags.push('Ground');
  if (text.includes('BIOLOGICAL UNIT')) tags.push('Biological');
  if (text.includes('MECHANICAL UNIT')) tags.push('Mechanical');
  if (text.includes('ARMOURED UNIT') || text.includes('ARMORED UNIT')) tags.push('Armoured');
  return tags;
}

function splitKeywords(text: string): string[] {
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeTags(unit: UnitCard): string[] {
  return (unit.tags || '')
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function parseCardCombatEffects(cards: TacticalCard[]): CardCombatEffect[] {
  const effects: CardCombatEffect[] = [];

  cards.forEach(card => {
    (card.boosts || []).forEach((boost, boostIndex) => {
      const description = boost.description || '';
      const upper = description.toUpperCase();
      const extractedKeywords = splitKeywords(extractWeaponKeywords(upper));
      const requiredTags = parseRequiredTags(upper);

      if (extractedKeywords.length > 0 && (upper.includes('FIRST RANGED WEAPON USED') || upper.includes('ALL RANGED WEAPONS') || upper.includes('RANGED WEAPON USED'))) {
        effects.push({
          id: `${card.id}:${boostIndex}:ranged`,
          sourceCardId: card.id,
          sourceCardName: card.name,
          boostName: boost.name,
          description,
          kind: 'weapon_keywords',
          appliesTo: 'attacker',
          attackKinds: ['ranged'],
          weaponKeywords: extractedKeywords,
          requiredTags,
        });
      }

      if (extractedKeywords.length > 0 && (upper.includes('FIRST CLOSE COMBAT WEAPON USED') || upper.includes('ALL CLOSE COMBAT WEAPONS') || upper.includes('CLOSE COMBAT WEAPONS GAIN') || upper.includes('CLOSE COMBAT WEAPON USED'))) {
        effects.push({
          id: `${card.id}:${boostIndex}:melee`,
          sourceCardId: card.id,
          sourceCardName: card.name,
          boostName: boost.name,
          description,
          kind: 'weapon_keywords',
          appliesTo: 'attacker',
          attackKinds: ['melee'],
          weaponKeywords: extractedKeywords,
          requiredTags,
        });
      }

      if (upper.includes('ARMOUR ROLL') && extractedKeywords.some(keyword => keyword.startsWith('TOUGH'))) {
        effects.push({
          id: `${card.id}:${boostIndex}:defender-armour`,
          sourceCardId: card.id,
          sourceCardName: card.name,
          boostName: boost.name,
          description,
          kind: 'unit_keywords',
          appliesTo: 'defender',
          attackKinds: ['ranged', 'melee'],
          unitKeywords: extractedKeywords.filter(keyword => keyword.startsWith('TOUGH')),
          requiredTags,
        });
      }
    });
  });

  return effects;
}

export function effectMatchesUnit(effect: CardCombatEffect, unit: UnitCard): boolean {
  if (!effect.requiredTags || effect.requiredTags.length === 0) return true;
  const unitTags = normalizeTags(unit);
  return effect.requiredTags.every(tag => unitTags.includes(tag.toLowerCase()));
}

export function applyCardCombatEffects(params: {
  baseUnitKeywords: string;
  baseWeaponKeywords: string;
  selectedEffects: CardCombatEffect[];
  unit: UnitCard;
  attackKind: 'ranged' | 'melee';
}): { unitKeywords: string; weaponKeywords: string; notes: string[] } {
  const { baseUnitKeywords, baseWeaponKeywords, selectedEffects, unit, attackKind } = params;
  const unitKeywordList = splitKeywords(baseUnitKeywords || '');
  const weaponKeywordList = splitKeywords(baseWeaponKeywords || '');
  const notes: string[] = [];

  selectedEffects.forEach(effect => {
    if (!effect.attackKinds.includes(attackKind)) return;
    if (!effectMatchesUnit(effect, unit)) return;

    if (effect.kind === 'unit_keywords' && effect.unitKeywords) {
      unitKeywordList.push(...effect.unitKeywords);
      notes.push(`${effect.sourceCardName} / ${effect.boostName}: ${effect.unitKeywords.join(', ')}`);
    }

    if (effect.kind === 'weapon_keywords' && effect.weaponKeywords) {
      weaponKeywordList.push(...effect.weaponKeywords);
      notes.push(`${effect.sourceCardName} / ${effect.boostName}: ${effect.weaponKeywords.join(', ')}`);
    }
  });

  return {
    unitKeywords: uniq(unitKeywordList).join(', '),
    weaponKeywords: uniq(weaponKeywordList).join(', '),
    notes: uniq(notes),
  };
}
