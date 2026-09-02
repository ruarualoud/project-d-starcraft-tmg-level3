/**
 * StarCraft TMG Combat Engine
 *
 * Uses the official three-pool flow:
 * Attack Pool -> Armour Pool -> Damage Pool.
 * All outputs are expectations rather than random simulations.
 */

import { DICE_RULES, extractCombatTags, normalizeTagName, parseKeywords, parseSurge, type ParsedKeyword } from './combat-rules';
import type { WeaponProfile, UnitStats } from './types';

// ============================================================
// Input / output types
// ============================================================

export interface CombatInput {
  weapon: WeaponProfile;
  attackerModels: number;
  attackerKeywords: string;
  weaponKeywords: string;
  defenderStats: UnitStats;
  defenderKeywords: string;
  defenderTags: string;
  defenderModels: number;
  /** +X = easier, -X = harder */
  hitModifier: number;
  inBurstRange: boolean;
  isCharge: boolean;
  /** Explicit evade permission from selected upgrades / states */
  defenderCanEvade: boolean;
  /** Attack kind matters for evade eligibility */
  attackKind?: 'ranged' | 'melee';
  /** Target is engaged when suffering a ranged attack -> eligible to evade */
  targetEngaged?: boolean;
  /** Relevant for INDIRECT FIRE */
  targetVisible?: boolean;
  /** Relevant for LOCKED IN */
  targetMovedThisRound?: boolean;
}

export interface StepDetail {
  step: string;
  label: string;
  value: number;
  description: string;
}

export interface CombatResult {
  totalAttackDice: number;
  hitProbability: number;
  baseExpectedHits: number;
  bonusExpectedHits: number;
  expectedHits: number;
  expectedSurgeBypassed: number;
  expectedCriticalBypassed: number;
  expectedBypassedDamagePoolDice: number;
  armourSaveProbability: number;
  expectedArmourSaves: number;
  expectedDamagePoolFromArmour: number;
  expectedDamagePoolBeforeEvade: number;
  evadeSaveProbability: number;
  expectedEvadeSaves: number;
  expectedDamagePoolDice: number;
  damagePerDie: number;
  expectedTotalDamage: number;
  expectedKills: number;
  steps: StepDetail[];
  activeKeywords: { name: string; effect: string }[];
  summary: string;
}

// ============================================================
// Helpers
// ============================================================

function rollSuccessProbability(targetNumber: number): number {
  const clamped = Math.max(DICE_RULES.minTargetNumber, Math.min(DICE_RULES.maxTargetNumber, targetNumber));
  const rawProb = (7 - clamped) / 6;
  return Math.max(1 / 6, Math.min(5 / 6, rawProb));
}

function parseTargetNumber(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value;
  if (!value || value === '-') return 7;
  const match = String(value).match(/(\d+)\+?/);
  return match ? parseInt(match[1], 10) : 4;
}

function parseExpectedValue(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value;
  if (!value || value === '-') return 0;
  const upper = String(value).toUpperCase().trim();

  const d3Plus = upper.match(/D3\s*\+\s*(\d+)/);
  if (d3Plus) return 2 + parseInt(d3Plus[1], 10);

  const d6Plus = upper.match(/D6\s*\+\s*(\d+)/);
  if (d6Plus) return 3.5 + parseInt(d6Plus[1], 10);

  if (upper === 'D3') return 2;
  if (upper === 'D6') return 3.5;

  const num = parseFloat(upper);
  return Number.isNaN(num) ? 0 : num;
}

function isNullStat(value: unknown): boolean {
  return value == null || value === '' || value === '-';
}

function formatNum(value: number): string {
  return value.toFixed(1);
}

function keywordOfType(keywords: ParsedKeyword[], type: ParsedKeyword['type']): ParsedKeyword | undefined {
  return keywords.find(k => k.type === type);
}

function countKeywordValue(keywords: ParsedKeyword[], type: ParsedKeyword['type'], key: string): number {
  return keywords
    .filter(k => k.type === type)
    .reduce((sum, k) => sum + Number(k.params[key] || 0), 0);
}

function maxKeywordValue(keywords: ParsedKeyword[], type: ParsedKeyword['type'], key: string): number {
  return keywords
    .filter(k => k.type === type)
    .reduce((max, k) => Math.max(max, Number(k.params[key] || 0)), 0);
}

function keywordOfTypeByValue(
  keywords: ParsedKeyword[],
  type: ParsedKeyword['type'],
  key: string,
): ParsedKeyword | undefined {
  const matches = keywords.filter(k => k.type === type);
  if (matches.length === 0) return undefined;
  return matches.reduce((best, current) =>
    Number(current.params[key] || 0) > Number(best.params[key] || 0) ? current : best,
  );
}

function highestMatchingPierce(keywords: ParsedKeyword[], defenderTags: string): ParsedKeyword | undefined {
  const matches = keywords.filter(k => k.type === 'pierce' && hasMatchingTag(defenderTags, String(k.params.tag || '')));
  if (matches.length === 0) return undefined;
  return matches.reduce((best, current) =>
    Number(current.params.damage || 0) > Number(best.params.damage || 0) ? current : best,
  );
}

function highestTitanKillers(keywords: ParsedKeyword[], defenderSize: number): ParsedKeyword | undefined {
  const matches = keywords.filter(k => k.type === 'titan_killers' && defenderSize >= Number(k.params.minSize || 0));
  if (matches.length === 0) return undefined;
  return matches.reduce((best, current) =>
    Number(current.params.damage || 0) > Number(best.params.damage || 0) ? current : best,
  );
}

function minDamagePerModel(stats: UnitStats): number {
  return Math.max(1, (parseExpectedValue(stats.hp) || 1) + parseExpectedValue(stats.shield));
}

function maxCasualtiesFromDamage(totalDamage: number, stats: UnitStats, defenderModels: number): number {
  const perModel = minDamagePerModel(stats);
  return Math.min(defenderModels, totalDamage > 0 ? Math.floor(totalDamage / perModel) : 0);
}

function expectedCasualtiesFromDamage(totalDamage: number, stats: UnitStats, defenderModels: number): number {
  const perModel = minDamagePerModel(stats);
  if (perModel <= 0) return 0;
  return Math.min(defenderModels, totalDamage / perModel);
}

function roundsToDestroyFromDamage(totalDamagePerRound: number, stats: UnitStats, defenderModels: number): number {
  const totalDurability = minDamagePerModel(stats) * defenderModels;
  return totalDamagePerRound > 0 ? totalDurability / totalDamagePerRound : Infinity;
}

function roundsToDestroyFromKills(killsPerRound: number, defenderModels: number): number {
  return killsPerRound > 0 ? defenderModels / killsPerRound : Infinity;
}

function formatRounds(value: number): string {
  return Number.isFinite(value) ? formatNum(value) : '∞';
}

function formatSummaryValue(value: number): string {
  return Number.isFinite(value) ? formatNum(value) : '∞';
}

function firstFinite(...values: number[]): number {
  return values.find(v => Number.isFinite(v)) ?? Infinity;
}

function choosePreferredRounds(roundsByDamage: number, roundsByKills: number): number {
  return firstFinite(roundsByDamage, roundsByKills);
}

function describeRoundsToDestroy(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  const roundsByDamage = roundsToDestroyFromDamage(totalDamagePerRound, stats, models);
  const roundsByKills = roundsToDestroyFromKills(killsPerRound, models);
  return choosePreferredRounds(roundsByDamage, roundsByKills);
}

function modelDurability(stats: UnitStats): number {
  return minDamagePerModel(stats);
}

function totalDurability(stats: UnitStats, models: number): number {
  return modelDurability(stats) * models;
}

function cappedExpectedKills(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return Math.min(expectedCasualtiesFromDamage(totalDamage, stats, defenderModels), maxKills);
}

function maxRemovableModels(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return Math.min(maxCasualtiesFromDamage(totalDamage, stats, defenderModels), maxKills);
}

function describeDamageToKills(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): string {
  const expected = cappedExpectedKills(totalDamage, stats, defenderModels, maxKills);
  const removable = maxRemovableModels(totalDamage, stats, defenderModels, maxKills);
  return `${formatNum(totalDamage)} expected damage -> ${formatNum(expected)} expected kills (up to ${formatNum(removable)} guaranteed casualties)`;
}

function roundsToTarget(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return describeRoundsToDestroy(totalDamagePerRound, killsPerRound, stats, models);
}

function explainRounds(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  const byDamage = roundsToDestroyFromDamage(totalDamagePerRound, stats, models);
  const byKills = roundsToDestroyFromKills(killsPerRound, models);
  const chosen = roundsToTarget(totalDamagePerRound, killsPerRound, stats, models);
  return `${formatSummaryValue(chosen)} rounds to destroy (damage clock ${formatRounds(byDamage)}, kill clock ${formatRounds(byKills)})`;
}

function damagePoolDiceAfterDefence(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return armourPoolToDamage + bypassedDamageDice;
}

function resolveExpectedKills(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return cappedExpectedKills(totalDamage, stats, defenderModels, maxKills);
}

function resolveRoundedAttackDice(models: number, roa: number): number {
  return Math.max(0, Math.round(models * roa));
}

function resolveExpectedHits(totalAttackDice: number, hitProbability: number): number {
  return totalAttackDice * hitProbability;
}

function describeDurability(stats: UnitStats): number {
  return modelDurability(stats);
}

function resolveTotalDurability(stats: UnitStats, models: number): number {
  return totalDurability(stats, models);
}

function explainExpectedKills(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): string {
  return describeDamageToKills(totalDamage, stats, defenderModels, maxKills);
}

function evadeEligibleDamagePool(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return damagePoolDiceAfterDefence(armourPoolToDamage, bypassedDamageDice);
}

function chosenRoundsToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return roundsToTarget(totalDamagePerRound, killsPerRound, stats, models);
}

function summaryRounds(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return explainRounds(totalDamagePerRound, killsPerRound, stats, models);
}

function expectedKillsFromDamage(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return resolveExpectedKills(totalDamage, stats, defenderModels, maxKills);
}

function defenderDurability(stats: UnitStats, defenderModels: number): number {
  return resolveTotalDurability(stats, defenderModels);
}

function defenderHpPerModel(stats: UnitStats): number {
  return describeDurability(stats);
}

function attackDiceCount(models: number, roa: number): number {
  return resolveRoundedAttackDice(models, roa);
}

function expectedHitCount(totalAttackDice: number, hitProbability: number): number {
  return resolveExpectedHits(totalAttackDice, hitProbability);
}

function damagePoolBeforeEvade(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return evadeEligibleDamagePool(armourPoolToDamage, bypassedDamageDice);
}

function matchupRoundsToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return chosenRoundsToKill(totalDamagePerRound, killsPerRound, stats, models);
}

function matchupRoundsSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return summaryRounds(totalDamagePerRound, killsPerRound, stats, models);
}

function defenderTotalHp(stats: UnitStats, defenderModels: number): number {
  return defenderDurability(stats, defenderModels);
}

function expectedCasualties(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return expectedKillsFromDamage(totalDamage, stats, defenderModels, maxKills);
}

function durabilityPerModel(stats: UnitStats): number {
  return defenderHpPerModel(stats);
}

function totalAttackPool(models: number, roa: number): number {
  return attackDiceCount(models, roa);
}

function expectedSuccessfulHits(totalAttackDice: number, hitProbability: number): number {
  return expectedHitCount(totalAttackDice, hitProbability);
}

function damageDiceBeforeEvade(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return damagePoolBeforeEvade(armourPoolToDamage, bypassedDamageDice);
}

function matchupTimeToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return matchupRoundsToKill(totalDamagePerRound, killsPerRound, stats, models);
}

function matchupTimeSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return matchupRoundsSummary(totalDamagePerRound, killsPerRound, stats, models);
}

function totalHpAcrossModels(stats: UnitStats, models: number): number {
  return defenderTotalHp(stats, models);
}

function expectedModelKills(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return expectedCasualties(totalDamage, stats, defenderModels, maxKills);
}

function hpPerModel(stats: UnitStats): number {
  return durabilityPerModel(stats);
}

function attackPoolSize(models: number, roa: number): number {
  return totalAttackPool(models, roa);
}

function hitExpectation(totalAttackDice: number, hitProbability: number): number {
  return expectedSuccessfulHits(totalAttackDice, hitProbability);
}

function totalDamagePoolBeforeEvade(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return damageDiceBeforeEvade(armourPoolToDamage, bypassedDamageDice);
}

function timeToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return matchupTimeToKill(totalDamagePerRound, killsPerRound, stats, models);
}

function timeToKillSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return matchupTimeSummary(totalDamagePerRound, killsPerRound, stats, models);
}

function totalHp(stats: UnitStats, models: number): number {
  return totalHpAcrossModels(stats, models);
}

function expectedKillsValue(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return expectedModelKills(totalDamage, stats, defenderModels, maxKills);
}

function durabilityValue(stats: UnitStats): number {
  return hpPerModel(stats);
}

function attackDiceValue(models: number, roa: number): number {
  return attackPoolSize(models, roa);
}

function expectedHitsValue(totalAttackDice: number, hitProbability: number): number {
  return hitExpectation(totalAttackDice, hitProbability);
}

function damagePoolValue(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return totalDamagePoolBeforeEvade(armourPoolToDamage, bypassedDamageDice);
}

function preferredRoundsToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return timeToKill(totalDamagePerRound, killsPerRound, stats, models);
}

function preferredRoundsSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return timeToKillSummary(totalDamagePerRound, killsPerRound, stats, models);
}

function durabilityTotal(stats: UnitStats, models: number): number {
  return totalHp(stats, models);
}

function calculatedExpectedKills(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return expectedKillsValue(totalDamage, stats, defenderModels, maxKills);
}

function modelDurabilityValue(stats: UnitStats): number {
  return durabilityValue(stats);
}

function totalAttackDiceValue(models: number, roa: number): number {
  return attackDiceValue(models, roa);
}

function calculatedExpectedHits(totalAttackDice: number, hitProbability: number): number {
  return expectedHitsValue(totalAttackDice, hitProbability);
}

function combinedDamagePool(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return damagePoolValue(armourPoolToDamage, bypassedDamageDice);
}

function preferredRoundEstimate(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return preferredRoundsToKill(totalDamagePerRound, killsPerRound, stats, models);
}

function preferredRoundSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return preferredRoundsSummary(totalDamagePerRound, killsPerRound, stats, models);
}

function totalDurabilityValue(stats: UnitStats, models: number): number {
  return durabilityTotal(stats, models);
}

function expectedKillsResolved(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return calculatedExpectedKills(totalDamage, stats, defenderModels, maxKills);
}

function perModelDurability(stats: UnitStats): number {
  return modelDurabilityValue(stats);
}

function roundedAttackDice(models: number, roa: number): number {
  return totalAttackDiceValue(models, roa);
}

function resolvedExpectedHits(totalAttackDice: number, hitProbability: number): number {
  return calculatedExpectedHits(totalAttackDice, hitProbability);
}

function resolvedDamagePool(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return combinedDamagePool(armourPoolToDamage, bypassedDamageDice);
}

function resolvedRoundsToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return preferredRoundEstimate(totalDamagePerRound, killsPerRound, stats, models);
}

function resolvedRoundsSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return preferredRoundSummary(totalDamagePerRound, killsPerRound, stats, models);
}

function totalUnitDurability(stats: UnitStats, models: number): number {
  return totalDurabilityValue(stats, models);
}

function resolvedExpectedKillsValue(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return expectedKillsResolved(totalDamage, stats, defenderModels, maxKills);
}

function durabilityPerSingleModel(stats: UnitStats): number {
  return perModelDurability(stats);
}

function finalAttackDice(models: number, roa: number): number {
  return roundedAttackDice(models, roa);
}

function finalExpectedHits(totalAttackDice: number, hitProbability: number): number {
  return resolvedExpectedHits(totalAttackDice, hitProbability);
}

function finalDamagePool(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return resolvedDamagePool(armourPoolToDamage, bypassedDamageDice);
}

function finalRoundsToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return resolvedRoundsToKill(totalDamagePerRound, killsPerRound, stats, models);
}

function finalRoundsSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return resolvedRoundsSummary(totalDamagePerRound, killsPerRound, stats, models);
}

function unitDurability(stats: UnitStats, models: number): number {
  return totalUnitDurability(stats, models);
}

function finalExpectedKillsValue(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return resolvedExpectedKillsValue(totalDamage, stats, defenderModels, maxKills);
}

function singleModelDurability(stats: UnitStats): number {
  return durabilityPerSingleModel(stats);
}

function combatAttackDice(models: number, roa: number): number {
  return finalAttackDice(models, roa);
}

function combatExpectedHits(totalAttackDice: number, hitProbability: number): number {
  return finalExpectedHits(totalAttackDice, hitProbability);
}

function combatDamagePool(armourPoolToDamage: number, bypassedDamageDice: number): number {
  return finalDamagePool(armourPoolToDamage, bypassedDamageDice);
}

function combatRoundsToKill(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): number {
  return finalRoundsToKill(totalDamagePerRound, killsPerRound, stats, models);
}

function combatRoundsSummary(totalDamagePerRound: number, killsPerRound: number, stats: UnitStats, models: number): string {
  return finalRoundsSummary(totalDamagePerRound, killsPerRound, stats, models);
}

function combatUnitDurability(stats: UnitStats, models: number): number {
  return unitDurability(stats, models);
}

function combatExpectedKills(totalDamage: number, stats: UnitStats, defenderModels: number, maxKills: number): number {
  return finalExpectedKillsValue(totalDamage, stats, defenderModels, maxKills);
}

function combatModelDurability(stats: UnitStats): number {
  return singleModelDurability(stats);
}

function hasMatchingTag(targetTags: string, requiredTag: string): boolean {
  const normalizedRequired = normalizeTagName(requiredTag);
  return extractCombatTags(targetTags).includes(normalizedRequired as any);
}

interface DamagePathResult {
  armourSaveProbability: number;
  expectedArmourSaves: number;
  armourPoolToDamage: number;
  damagePoolBeforeEvade: number;
  evadeSaveProbability: number;
  expectedEvadeSaves: number;
  finalDamageDice: number;
}

function resolveDefencePath(args: {
  armourPoolDice: number;
  bypassedDamageDice: number;
  defenderStats: UnitStats;
  defenderKeywords: ParsedKeyword[];
  canEvade: boolean;
  antiEvadeModifier: number;
}): DamagePathResult {
  const { armourPoolDice, bypassedDamageDice, defenderStats, defenderKeywords, canEvade, antiEvadeModifier } = args;

  let armourSaveProbability = 0;
  let expectedArmourSaves = 0;
  let armourPoolToDamage = armourPoolDice;

  if (!isNullStat(defenderStats.armor) && parseExpectedValue(defenderStats.armor) > 0 && parseTargetNumber(defenderStats.armor) <= 6) {
    const armourTarget = parseTargetNumber(defenderStats.armor);
    armourSaveProbability = rollSuccessProbability(armourTarget);
    const expectedFails = armourPoolDice * (1 - armourSaveProbability);
    const toughBonus = Math.min(maxKeywordValue(defenderKeywords, 'tough', 'count'), expectedFails);
    expectedArmourSaves = Math.min(armourPoolDice, armourPoolDice * armourSaveProbability + toughBonus);
    armourPoolToDamage = Math.max(0, armourPoolDice - expectedArmourSaves);
  }

  const damagePoolBeforeEvade = combatDamagePool(armourPoolToDamage, bypassedDamageDice);
  let evadeSaveProbability = 0;
  let expectedEvadeSaves = 0;
  let finalDamageDice = damagePoolBeforeEvade;

  if (canEvade && !isNullStat(defenderStats.evade) && parseExpectedValue(defenderStats.evade) > 0 && parseTargetNumber(defenderStats.evade) <= 6) {
    let evadeTarget = parseTargetNumber(defenderStats.evade) + antiEvadeModifier;
    evadeTarget = Math.max(DICE_RULES.minTargetNumber, Math.min(DICE_RULES.maxTargetNumber, evadeTarget));
    evadeSaveProbability = rollSuccessProbability(evadeTarget);
    expectedEvadeSaves = Math.min(damagePoolBeforeEvade, damagePoolBeforeEvade * evadeSaveProbability);
    finalDamageDice = Math.max(0, damagePoolBeforeEvade - expectedEvadeSaves);
  }

  return {
    armourSaveProbability,
    expectedArmourSaves,
    armourPoolToDamage,
    damagePoolBeforeEvade,
    evadeSaveProbability,
    expectedEvadeSaves,
    finalDamageDice,
  };
}

function inferAttackKind(weapon: WeaponProfile, explicit?: 'ranged' | 'melee'): 'ranged' | 'melee' {
  if (explicit) return explicit;
  const range = (weapon.range || '').toUpperCase().trim();
  const phase = (weapon.phase || '').toUpperCase().trim();
  if (range === 'E' || range === 'MELEE' || range === '0' || phase === 'COMBAT PHASE') return 'melee';
  return 'ranged';
}

// ============================================================
// Main calculation
// ============================================================

export function calculateCombatExpectation(input: CombatInput): CombatResult {
  const steps: StepDetail[] = [];
  const activeKeywords: { name: string; effect: string }[] = [];

  const attackKind = inferAttackKind(input.weapon, input.attackKind);
  const baseRoA = parseExpectedValue(input.weapon.roa);
  const baseHitTarget = parseTargetNumber(input.weapon.hit);
  const baseDamage = parseExpectedValue(input.weapon.dmg);
  const parsedSurge = parseSurge(input.weapon.surge);

  const attackerKeywords = parseKeywords(input.attackerKeywords);
  const weaponKeywords = parseKeywords(input.weaponKeywords);
  const defenderKeywords = parseKeywords(input.defenderKeywords);
  const allAttackerKeywords = [...attackerKeywords, ...weaponKeywords];
  const defenderCombatTags = extractCombatTags(input.defenderTags);

  // ---------- Step 1: Attack pool ----------
  let effectiveRoA = baseRoA;
  let effectiveHitTarget = baseHitTarget - (input.hitModifier || 0);

  const burstFire = keywordOfType(allAttackerKeywords, 'burst_fire');
  if (burstFire && input.inBurstRange) {
    const bonus = Number(burstFire.params.bonus || 0);
    effectiveRoA += bonus;
    activeKeywords.push({
      name: 'BURST FIRE',
      effect: `Target is inside burst range, so RoA increases by ${bonus}.`,
    });
  }

  const lockedIn = keywordOfType(allAttackerKeywords, 'locked_in');
  if (lockedIn && !input.targetMovedThisRound) {
    const bonus = Number(lockedIn.params.bonus || 0);
    effectiveRoA += bonus;
    activeKeywords.push({
      name: 'LOCKED IN',
      effect: `Target has not moved this round, so RoA increases by ${bonus}.`,
    });
  }

  const longRange = keywordOfType(allAttackerKeywords, 'long_range');
  if (longRange) {
    activeKeywords.push({
      name: 'LONG RANGE',
      effect: `Extended maximum range to ${longRange.params.range}". Apply hit penalty through the hit modifier when attacking beyond normal range.`,
    });
  }

  effectiveHitTarget = Math.max(DICE_RULES.minTargetNumber, Math.min(DICE_RULES.maxTargetNumber, effectiveHitTarget));

  const totalAttackDice = combatAttackDice(input.attackerModels, effectiveRoA);
  const hitProbability = rollSuccessProbability(effectiveHitTarget);
  const baseExpectedHits = combatExpectedHits(totalAttackDice, hitProbability);
  let expectedHits = baseExpectedHits;
  let bonusExpectedHits = 0;

  steps.push({
    step: 'attack_roll',
    label: 'Attack Roll',
    value: expectedHits,
    description: `${input.attackerModels} models × ${effectiveRoA.toFixed(1)} RoA = ${totalAttackDice} dice, hitting on ${effectiveHitTarget}+ (${(hitProbability * 100).toFixed(0)}%) for ${formatNum(expectedHits)} expected hits.`,
  });

  const precision = keywordOfTypeByValue(allAttackerKeywords, 'precision', 'count');
  if (precision) {
    const bonus = Math.min(Number(precision.params.count || 0), Math.max(0, totalAttackDice - expectedHits));
    bonusExpectedHits = bonus;
    expectedHits += bonus;
    activeKeywords.push({
      name: `PRECISION (${precision.params.count})`,
      effect: `${formatNum(bonus)} failed attack dice are converted into hits before Surge.`,
    });
  }

  // ---------- Step 1b: Impact (separate path, no Surge, damage 1) ----------
  let expectedImpactDamage = 0;
  const impact = keywordOfType(allAttackerKeywords, 'impact');
  const defenderIsHidden = defenderKeywords.some(k => k.type === 'hidden');
  if (impact && input.isCharge && !defenderIsHidden) {
    const impactBonusPerModel = maxKeywordValue(allAttackerKeywords, 'impact_bonus', 'dice');
    const impactDicePerModel = Number(impact.params.dice || 0) + impactBonusPerModel;
    const impactHitTarget = parseTargetNumber(String(impact.params.hit || 0));
    const impactPool = Math.max(0, input.attackerModels * impactDicePerModel);
    const impactHitProbability = rollSuccessProbability(impactHitTarget);
    const impactHits = impactPool * impactHitProbability;

    if (impactBonusPerModel > 0) {
      activeKeywords.push({
        name: `IMPACT BONUS (${impactBonusPerModel})`,
        effect: `Each attacking model adds ${impactBonusPerModel} extra IMPACT die, for ${impactDicePerModel} IMPACT dice per model total.`,
      });
    }

    const impactCanEvade = Boolean(
      input.defenderCanEvade ||
      defenderIsHidden ||
      (attackKind === 'ranged' && input.targetEngaged)
    );

    const impactResolution = resolveDefencePath({
      armourPoolDice: impactHits,
      bypassedDamageDice: 0,
      defenderStats: input.defenderStats,
      defenderKeywords,
      canEvade: impactCanEvade,
      antiEvadeModifier: 0,
    });

    expectedImpactDamage = impactResolution.finalDamageDice;
    activeKeywords.push({
      name: `IMPACT (${impact.params.dice}) ${impact.params.hit}+`,
      effect: `Charge deals an additional ${formatNum(expectedImpactDamage)} expected damage after defence rolls.`,
    });
  } else if (impact && input.isCharge && defenderIsHidden) {
    activeKeywords.push({
      name: 'HIDDEN',
      effect: 'Hidden targets are immune to IMPACT.',
    });
  }

  // ---------- Step 2: Resolve Surge and Critical Hit ----------
  let armourPoolDice = expectedHits;
  let expectedSurgeBypassed = 0;
  let expectedCriticalBypassed = 0;
  let dodgeBudget = maxKeywordValue(defenderKeywords, 'dodge', 'count');

  if (parsedSurge.surgeTags.length > 0 && parsedSurge.surgeDieText) {
    const surgeMatches = parsedSurge.surgeTags.some(tag => defenderCombatTags.includes(tag));
    if (surgeMatches) {
      const rawSurgeMove = Math.min(parseExpectedValue(parsedSurge.surgeDieText), armourPoolDice);
      const dodgeUsed = Math.min(dodgeBudget, rawSurgeMove);
      const appliedSurgeMove = Math.max(0, rawSurgeMove - dodgeUsed);
      dodgeBudget -= dodgeUsed;
      expectedSurgeBypassed += appliedSurgeMove;
      armourPoolDice -= appliedSurgeMove;
      activeKeywords.push({
        name: `SURGE (${parsedSurge.surgeTags.join(', ')})`,
        effect: `Target tags match, so ${formatNum(appliedSurgeMove)} dice bypass Armour${dodgeUsed > 0 ? ` after DODGE prevents ${formatNum(dodgeUsed)}` : ''}.`,
      });
    } else {
      activeKeywords.push({
        name: `SURGE (${parsedSurge.surgeTags.join(', ')})`,
        effect: `No matching defender combat tag, so Surge is ignored.`,
      });
    }
  }

  const criticalHit = keywordOfTypeByValue(allAttackerKeywords, 'critical_hit', 'count');
  if (criticalHit) {
    const rawCritMove = Math.min(Number(criticalHit.params.count || 0), armourPoolDice);
    const dodgeUsed = Math.min(dodgeBudget, rawCritMove);
    const appliedCritMove = Math.max(0, rawCritMove - dodgeUsed);
    dodgeBudget -= dodgeUsed;
    expectedCriticalBypassed += appliedCritMove;
    armourPoolDice -= appliedCritMove;
    activeKeywords.push({
      name: `CRITICAL HIT (${criticalHit.params.count})`,
      effect: `${formatNum(appliedCritMove)} dice bypass Armour${dodgeUsed > 0 ? ` after DODGE prevents ${formatNum(dodgeUsed)}` : ''}.`,
    });
  }

  steps.push({
    step: 'surge_resolve',
    label: 'Resolve Surge',
    value: expectedSurgeBypassed + expectedCriticalBypassed,
    description: `${formatNum(expectedSurgeBypassed + expectedCriticalBypassed)} expected dice bypass Armour and move directly into the Damage Pool.${expectedSurgeBypassed > 0 ? ` Surge contributes ${formatNum(expectedSurgeBypassed)}.` : ''}${expectedCriticalBypassed > 0 ? ` Critical Hit contributes ${formatNum(expectedCriticalBypassed)}.` : ''}`,
  });

  // ---------- Step 3 / 4: Defence and Evade ----------
  const antiEvadeModifier = maxKeywordValue(allAttackerKeywords, 'anti_evade', 'modifier');
  if (antiEvadeModifier > 0) {
    activeKeywords.push({
      name: `ANTI-EVADE (${antiEvadeModifier})`,
      effect: `Evade target number becomes harder by ${antiEvadeModifier}.`,
    });
  }

  const canEvade = Boolean(
    input.defenderCanEvade ||
    defenderIsHidden ||
    (attackKind === 'ranged' && input.targetEngaged) ||
    (allAttackerKeywords.some(k => k.type === 'indirect_fire') && input.targetVisible === false)
  );

  if (canEvade) {
    if (input.defenderCanEvade) {
      activeKeywords.push({
        name: 'EVADE ACCESS',
        effect: 'Defender has an explicit ability or selected state that grants an Evade Roll.',
      });
    } else if (defenderIsHidden) {
      activeKeywords.push({
        name: 'HIDDEN',
        effect: 'Hidden grants an Evade Roll against every attack.',
      });
    } else if (attackKind === 'ranged' && input.targetEngaged) {
      activeKeywords.push({
        name: 'ENGAGED TARGET',
        effect: 'Engaged targets may make an Evade Roll against ranged attacks.',
      });
    } else if (allAttackerKeywords.some(k => k.type === 'indirect_fire') && input.targetVisible === false) {
      activeKeywords.push({
        name: 'INDIRECT FIRE',
        effect: 'A non-visible target of Indirect Fire may make an Evade Roll.',
      });
    }
  }

  const defence = resolveDefencePath({
    armourPoolDice,
    bypassedDamageDice: expectedSurgeBypassed + expectedCriticalBypassed,
    defenderStats: input.defenderStats,
    defenderKeywords,
    canEvade,
    antiEvadeModifier,
  });

  steps.push({
    step: 'armour_roll',
    label: 'Armour Roll',
    value: defence.armourPoolToDamage,
    description: isNullStat(input.defenderStats.armor)
      ? `No Armour value, so all ${formatNum(armourPoolDice)} dice continue to the Damage Pool.`
      : `${formatNum(armourPoolDice)} dice roll against Armour ${input.defenderStats.armor}; ${formatNum(defence.expectedArmourSaves)} are saved and ${formatNum(defence.armourPoolToDamage)} continue to the Damage Pool.`,
  });

  steps.push({
    step: 'evade_roll',
    label: 'Evade Roll',
    value: defence.expectedEvadeSaves,
    description: canEvade && !isNullStat(input.defenderStats.evade)
      ? `${formatNum(defence.damagePoolBeforeEvade)} dice in the Damage Pool roll against Evade ${Math.max(DICE_RULES.minTargetNumber, Math.min(DICE_RULES.maxTargetNumber, parseTargetNumber(input.defenderStats.evade) + antiEvadeModifier))}+; ${formatNum(defence.expectedEvadeSaves)} are evaded and ${formatNum(defence.finalDamageDice)} remain.`
      : 'Defender is not eligible to make an Evade Roll for this attack.',
  });

  // ---------- Step 5: Damage ----------
  let damagePerDie = baseDamage;

  const defenderSize = parseExpectedValue(input.defenderStats.size);
  const titanKillers = attackKind === 'melee' ? highestTitanKillers(allAttackerKeywords, defenderSize) : undefined;
  if (titanKillers) {
    damagePerDie = Math.max(damagePerDie, Number(titanKillers.params.damage || baseDamage));
    activeKeywords.push({
      name: `TITAN KILLERS ${titanKillers.params.minSize}+ (${titanKillers.params.damage})`,
      effect: `Defender size ${defenderSize} meets the threshold, so damage per die becomes ${damagePerDie}.`,
    });
  }

  const pierce = highestMatchingPierce(allAttackerKeywords, input.defenderTags);
  if (pierce) {
    damagePerDie = Number(pierce.params.damage || baseDamage);
    activeKeywords.push({
      name: `PIERCE ${pierce.params.tag} (${pierce.params.damage})`,
      effect: `Defender matches the required tag, so damage per die becomes ${damagePerDie}.`,
    });
  }

  const mainExpectedDamage = defence.finalDamageDice * damagePerDie;
  const expectedTotalDamage = mainExpectedDamage + expectedImpactDamage;

  const concentratedFire = keywordOfType(allAttackerKeywords, 'concentrated_fire');
  const maxKills = concentratedFire ? Number(concentratedFire.params.maxKills || Infinity) : Infinity;
  if (concentratedFire) {
    activeKeywords.push({
      name: `CONCENTRATED FIRE (${concentratedFire.params.maxKills})`,
      effect: `This attack cannot remove more than ${concentratedFire.params.maxKills} models.`,
    });
  }

  const hpPerModel = combatModelDurability(input.defenderStats);
  let expectedKills = combatExpectedKills(expectedTotalDamage, input.defenderStats, input.defenderModels, maxKills);

  steps.push({
    step: 'damage_resolve',
    label: 'Resolve Damage',
    value: expectedTotalDamage,
    description: `${formatNum(defence.finalDamageDice)} damage-pool dice × ${damagePerDie} damage${expectedImpactDamage > 0 ? ` + ${formatNum(expectedImpactDamage)} IMPACT damage` : ''} = ${formatNum(expectedTotalDamage)} expected total damage, or ${formatNum(expectedKills)} expected kills.`,
  });

  const summary = [
    `${totalAttackDice} attack dice on ${effectiveHitTarget}+ -> ${formatNum(expectedHits)} hits`,
    expectedSurgeBypassed + expectedCriticalBypassed > 0
      ? `${formatNum(expectedSurgeBypassed + expectedCriticalBypassed)} dice bypass Armour (${formatNum(expectedSurgeBypassed)} Surge + ${formatNum(expectedCriticalBypassed)} Critical Hit)`
      : '',
    !isNullStat(input.defenderStats.armor) ? `${formatNum(defence.expectedArmourSaves)} Armour saves` : 'No Armour save',
    canEvade && !isNullStat(input.defenderStats.evade) ? `${formatNum(defence.expectedEvadeSaves)} Evade saves` : 'No Evade roll',
    `${formatNum(defence.finalDamageDice)} remaining dice × ${damagePerDie} damage${expectedImpactDamage > 0 ? ` + ${formatNum(expectedImpactDamage)} IMPACT` : ''}`,
    explainExpectedKills(expectedTotalDamage, input.defenderStats, input.defenderModels, maxKills),
  ].filter(Boolean).join('\n');

  return {
    totalAttackDice,
    hitProbability,
    baseExpectedHits,
    bonusExpectedHits,
    expectedHits,
    expectedSurgeBypassed,
    expectedCriticalBypassed,
    expectedBypassedDamagePoolDice: expectedSurgeBypassed + expectedCriticalBypassed,
    armourSaveProbability: defence.armourSaveProbability,
    expectedArmourSaves: defence.expectedArmourSaves,
    expectedDamagePoolFromArmour: defence.armourPoolToDamage,
    expectedDamagePoolBeforeEvade: defence.damagePoolBeforeEvade,
    evadeSaveProbability: defence.evadeSaveProbability,
    expectedEvadeSaves: defence.expectedEvadeSaves,
    expectedDamagePoolDice: defence.finalDamageDice,
    damagePerDie,
    expectedTotalDamage,
    expectedKills,
    steps,
    activeKeywords,
    summary,
  };
}

// ============================================================
// Matchup analysis (two-way)
// ============================================================

export interface MatchupSideConfig {
  hitModifier?: number;
  inBurstRange?: boolean;
  isCharge?: boolean;
  defenderCanEvade?: boolean;
  attackKind?: 'ranged' | 'melee';
  targetEngaged?: boolean;
  targetVisible?: boolean;
  targetMovedThisRound?: boolean;
}

export interface MatchupResult {
  unitAName: string;
  unitBName: string;
  aToBResults: { weaponName: string; result: CombatResult }[];
  bToAResults: { weaponName: string; result: CombatResult }[];
  totalDmgAtoB: number;
  totalDmgBtoA: number;
  totalKillsAtoB: number;
  totalKillsBtoA: number;
  roundsToKillB: number;
  roundsToKillA: number;
  advantage: 'A' | 'B' | 'even';
  summary: string;
}

export interface MatchupInput {
  unitAName: string;
  unitAWeapons: WeaponProfile[];
  unitAModels: number;
  unitAStats: UnitStats;
  unitAKeywords: string;
  unitATags: string;
  unitAConfig?: MatchupSideConfig;
  unitBName: string;
  unitBWeapons: WeaponProfile[];
  unitBModels: number;
  unitBStats: UnitStats;
  unitBKeywords: string;
  unitBTags: string;
  unitBConfig?: MatchupSideConfig;
}

export function calculateMatchup(input: MatchupInput): MatchupResult {
  const aToBResults = input.unitAWeapons.map(w => {
    const result = calculateCombatExpectation({
      weapon: w,
      attackerModels: input.unitAModels,
      attackerKeywords: input.unitAKeywords,
      weaponKeywords: w.keywords || '',
      defenderStats: input.unitBStats,
      defenderKeywords: input.unitBKeywords,
      defenderTags: input.unitBTags,
      defenderModels: input.unitBModels,
      hitModifier: input.unitAConfig?.hitModifier || 0,
      inBurstRange: input.unitAConfig?.inBurstRange || false,
      isCharge: input.unitAConfig?.isCharge || false,
      defenderCanEvade: input.unitAConfig?.defenderCanEvade || false,
      attackKind: input.unitAConfig?.attackKind,
      targetEngaged: input.unitAConfig?.targetEngaged || false,
      targetVisible: input.unitAConfig?.targetVisible ?? true,
      targetMovedThisRound: input.unitAConfig?.targetMovedThisRound || false,
    });
    return { weaponName: w.name || 'Unnamed Weapon', result };
  });

  const bToAResults = input.unitBWeapons.map(w => {
    const result = calculateCombatExpectation({
      weapon: w,
      attackerModels: input.unitBModels,
      attackerKeywords: input.unitBKeywords,
      weaponKeywords: w.keywords || '',
      defenderStats: input.unitAStats,
      defenderKeywords: input.unitAKeywords,
      defenderTags: input.unitATags,
      defenderModels: input.unitAModels,
      hitModifier: input.unitBConfig?.hitModifier || 0,
      inBurstRange: input.unitBConfig?.inBurstRange || false,
      isCharge: input.unitBConfig?.isCharge || false,
      defenderCanEvade: input.unitBConfig?.defenderCanEvade || false,
      attackKind: input.unitBConfig?.attackKind,
      targetEngaged: input.unitBConfig?.targetEngaged || false,
      targetVisible: input.unitBConfig?.targetVisible ?? true,
      targetMovedThisRound: input.unitBConfig?.targetMovedThisRound || false,
    });
    return { weaponName: w.name || 'Unnamed Weapon', result };
  });

  const totalDmgAtoB = aToBResults.reduce((sum, item) => sum + item.result.expectedTotalDamage, 0);
  const totalDmgBtoA = bToAResults.reduce((sum, item) => sum + item.result.expectedTotalDamage, 0);
  const totalKillsAtoB = aToBResults.reduce((sum, item) => sum + item.result.expectedKills, 0);
  const totalKillsBtoA = bToAResults.reduce((sum, item) => sum + item.result.expectedKills, 0);

  const totalHpB = totalHp(input.unitBStats, input.unitBModels);
  const totalHpA = totalHp(input.unitAStats, input.unitAModels);

  const roundsToKillB = combatRoundsToKill(totalDmgAtoB, totalKillsAtoB, input.unitBStats, input.unitBModels);
  const roundsToKillA = combatRoundsToKill(totalDmgBtoA, totalKillsBtoA, input.unitAStats, input.unitAModels);

  const advantage: 'A' | 'B' | 'even' =
    roundsToKillB < roundsToKillA ? 'A' :
    roundsToKillA < roundsToKillB ? 'B' : 'even';

  const summary = advantage === 'A'
    ? `${input.unitAName} has the advantage (${formatSummaryValue(roundsToKillB)} rounds to kill vs ${formatSummaryValue(roundsToKillA)} rounds to die).`
    : advantage === 'B'
    ? `${input.unitBName} has the advantage (${formatSummaryValue(roundsToKillA)} rounds to kill vs ${formatSummaryValue(roundsToKillB)} rounds to die).`
    : 'The matchup is roughly even.';

  return {
    unitAName: input.unitAName,
    unitBName: input.unitBName,
    aToBResults,
    bToAResults,
    totalDmgAtoB,
    totalDmgBtoA,
    totalKillsAtoB,
    totalKillsBtoA,
    roundsToKillB,
    roundsToKillA,
    advantage,
    summary,
  };
}
