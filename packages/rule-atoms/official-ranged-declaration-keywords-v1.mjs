import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialStatusStayInPlayDataBundleV1 } from '../source-data/official-status-stay-in-play-data-bundle-v1.mjs';

export const OFFICIAL_RANGED_DECLARATION_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_ranged_declaration_policy_v1', version: '1.0.0',
  effectKind: 'ranged_declaration_keywords', weaponName: 'Shock Cannon',
  ruleAtomIds: Object.freeze(['rule-atom:ranged-declaration-weapon-keyword-window-v1',
    'rule-atom:reaction-source-once-per-game-v1']),
  trainingTruth: false,
});
export const OFFICIAL_RANGED_DECLARATION_POLICY_V2 = Object.freeze({
  ...OFFICIAL_RANGED_DECLARATION_POLICY_V1, version: '1.1.0', weaponName: 'source_bound',
  numericWeaponsSupported: true,
  ruleAtomIds: Object.freeze([...OFFICIAL_RANGED_DECLARATION_POLICY_V1.ruleAtomIds,
    'rule-atom:singleton:core-11-concentrated-fire-casualty-cap:3753f38b416e']),
});
const printedIndirectFirePolicy = Object.freeze({
  schema: 'starcraft_tmg_printed_indirect_fire_evade_policy_v1',
  version: '1.0.0',
  sourceRecordKey: 'rules_sections:FuahgilWtc8nccVSp2Vv',
  sourceRecordHash: '985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7',
  outOfLineOfSightGrantsEvade: true,
  trainingTruth: false,
});

export function createOfficialPrintedIndirectFireEvadePolicyV1({ context }) {
  if (context.dataset.recordsByKey[printedIndirectFirePolicy.sourceRecordKey]?.sourceRecordHash
    !== printedIndirectFirePolicy.sourceRecordHash) throw Error('PRINTED_INDIRECT_FIRE_SOURCE_MISMATCH');
  return { ...printedIndirectFirePolicy };
}

export function hasOfficialPrintedIndirectFireEvadePolicyV1(state) {
  const policy = state.officialPrintedIndirectFireEvadePolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, printedIndirectFirePolicy)) throw Error('PRINTED_INDIRECT_FIRE_POLICY_INVALID');
  return true;
}

export const OFFICIAL_RANGED_DECLARATION_PARENT_KEY = 'pendingOfficialRangedAttackDeclaration';
const key = OFFICIAL_RANGED_DECLARATION_PARENT_KEY;
const withoutHash = parent => Object.fromEntries(Object.entries(parent).filter(([name]) => name !== 'parentHash'));

export function hasOfficialRangedDeclarationPolicyV1(state) {
  const policy = state?.officialRangedDeclarationPolicy;
  if (!policy) return false;
  const numeric = isDeepStrictEqual(policy, OFFICIAL_RANGED_DECLARATION_POLICY_V2);
  if ((!numeric && !isDeepStrictEqual(policy, OFFICIAL_RANGED_DECLARATION_POLICY_V1))
    || !state.officialReactionFamilySourceBundle?.routes.some(route => route.effectKind === policy.effectKind)) {
    throw Error('RANGED_DECLARATION_POLICY_SOURCE_REQUIRED');
  }
  const routes = state.officialReactionFamilySourceBundle.routes.filter(route => route.effectKind === policy.effectKind);
  if (numeric !== routes.some(route => route.definitionId === 'unit:nova_stealth_mode/head-shot-assault-phase@1')) {
    throw Error('RANGED_DECLARATION_NUMERIC_SOURCE_POLICY_REQUIRED');
  }
  if (!numeric || routes.some(route => route.requiresSiegeMode)) {
    if (!state.officialSiegeModeDataBundle) throw Error('RANGED_DECLARATION_MODE_DATA_REQUIRED');
    verifyOfficialStatusStayInPlayDataBundleV1(state.officialSiegeModeDataBundle);
    if (state.officialSiegeModeDataBundle.normalizedDatasetHash !== state.officialReactionFamilySourceBundle.normalizedDatasetHash) {
      throw Error('RANGED_DECLARATION_MODE_SOURCE_MISMATCH');
    }
  }
  return true;
}

export function readOfficialRangedDeclarationV1(state) {
  const parent = state[key];
  if (!parent) return null;
  const resolution = (state.officialReactionResolutionHistory || []).find(row => row.resolutionHash === parent.resolutionHash);
  if (!hasOfficialRangedDeclarationPolicyV1(state) || parent.schema !== 'starcraft_tmg_ranged_declaration_checkpoint_v1'
    || parent.parentHash !== hash(withoutHash(parent)) || parent.round !== Number(state.round)
    || parent.phase !== state.phase || parent.phase !== 'assault' || !Array.isArray(parent.keywordEffects)
    || !resolution || resolution.consumedByHost !== true || resolution.triggerKind !== 'ranged_attack_declared'
    || resolution.round !== parent.round || resolution.phase !== parent.phase || resolution.activeSideKey !== parent.sideKey
    || !isDeepStrictEqual(resolution.effects, parent.keywordEffects)
    || !state.pieces.some(piece => piece.id === parent.pieceId && piece.sideKey === parent.sideKey
      && piece.isOnField && !piece.isDestroyed)
    || parent.keywordEffects.some(effect => {
      const { effectHash, ...body } = effect;
      return effectHash !== hash(body) || effect.effectKind !== 'ranged_declaration_keywords'
        || effect.sourcePieceId !== parent.pieceId || effect.targetPieceId !== parent.pieceId
        || effect.weaponProfileKey !== parent.profileKey
        || !state.officialReactionFamilySourceBundle.routes.some(route => route.definitionId === effect.definitionId
          && route.sourceFeatureHash === effect.sourceFeatureHash && route.effectKind === effect.effectKind);
    })) throw Error('RANGED_DECLARATION_PARENT_INVALID');
  return parent;
}

export function projectOfficialRangedDeclarationProfileV1(state, pieceId, profile) {
  const parent = readOfficialRangedDeclarationV1(state);
  if (!parent || parent.pieceId !== pieceId || parent.profileKey !== profile.profileKey) return profile;
  if (parent.sourceProfileHash !== profile.profileHash) throw Error('RANGED_DECLARATION_PROFILE_SOURCE_MISMATCH');
  const effects = [];
  for (const source of parent.keywordEffects) {
    if (source.pinpoint) effects.push({ effectAtomId: 'attack-effect:pinpoint-v1', parameters: {} });
    if (source.lockedIn) effects.push({ effectAtomId: 'attack-effect:locked-in-v1',
      parameters: { additionalRateOfAttack: source.lockedIn } });
    if (source.indirectFire) effects.push({ effectAtomId: 'attack-effect:indirect-fire-v1', parameters: {} });
    if (source.longRangeInches) effects.push({ effectAtomId: 'attack-effect:long-range-v1',
      parameters: { maximumRangeInches: source.longRangeInches } });
    if (source.concentratedFire) effects.push({ effectAtomId: 'attack-effect:concentrated-fire-v1',
      parameters: { maximumCasualties: source.concentratedFire } });
  }
  // profileHash keeps the frozen source identity. Runtime grants have a separate binding.
  const weaponDamage = parent.keywordEffects.find(source => source.weaponDamage !== undefined)?.weaponDamage;
  return { ...profile, ...(weaponDamage !== undefined ? { damage: weaponDamage } : {}), declarationWeaponEffects: { effects,
    declarationHash: parent.parentHash, sourceEffectHashes: parent.keywordEffects.map(effect => effect.effectHash) } };
}
