import { isDeepStrictEqual } from 'node:util';

export const OFFICIAL_ABILITY_REFERENCE_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_ability_reference_policy_v1',
  version: '1.0.0',
  sourceFaqByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  tacticalCardLos: 'explicit_rule_only',
  proximityIsTargeting: false,
  modelReferencesIncludeStructures: true,
  ruleAtomIds: Object.freeze([
    'rule-atom:faq-v1.3-tactical-card-los',
    'rule-atom:faq-v1.3-proximity-not-targeting',
  ]),
});

export function hasOfficialAbilityReferencePolicyV13(state) {
  const policy = state?.officialAbilityReferencePolicy;
  if (policy === undefined) return false;
  if (!isDeepStrictEqual(policy, OFFICIAL_ABILITY_REFERENCE_POLICY_V13)) {
    throw new Error('ABILITY_REFERENCE_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialAbilityReferenceStateV13(state, policy) {
  if (!isDeepStrictEqual(policy, OFFICIAL_ABILITY_REFERENCE_POLICY_V13)) {
    throw new Error('ABILITY_REFERENCE_POLICY_REQUIRED');
  }
  if (hasOfficialAbilityReferencePolicyV13(state)) return state;
  return { ...state, officialAbilityReferencePolicy: structuredClone(policy) };
}

// A physical presence can be a distance/collision reference even when a Unit
// effect cannot select it. Source and effect-recipient eligibility stay with
// their respective executors.
export function isOfficialAbilityModelPresenceV13(piece) {
  return piece?.isOnField === true && piece.isInReserves !== true
    && piece.isDestroyed !== true && Number(piece.currentModels) > 0
    && (piece.models || []).some(model => model.isOnField !== false && model.isDestroyed !== true);
}

export function officialAbilityReferenceConstraintsV13(state, route, referenceRoles = []) {
  if (!hasOfficialAbilityReferencePolicyV13(state)) return {};
  const productKind = route.sourceProductKind || state.officialAbilityEffectIrCatalogue?.definitions
    ?.find(definition => definition.sourceFeatureHash === route.sourceFeatureHash)?.sourceProductKind;
  const tacticalCard = productKind === 'tactical_card';
  if (!tacticalCard && referenceRoles.length === 0) return {};
  return { abilityReferences: {
    sourceFeatureHash: route.sourceFeatureHash,
    tacticalCard,
    resolutionLineOfSightRequired: tacticalCard ? route.lineOfSightRequired === true : null,
    references: referenceRoles.map(role => ({ role, selectsUnitTarget: false,
      lineOfSightRequired: route.lineOfSightRequired === true })),
    policyVersion: OFFICIAL_ABILITY_REFERENCE_POLICY_V13.version,
    trainingTruth: false,
  } };
}
