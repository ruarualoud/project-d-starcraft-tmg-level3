import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
import { projectOfficialFaqReactionStateV13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { projectOfficialNonLethalDamageStateV1 } from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { projectOfficialStructureTargetingStateV13 } from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import { projectOfficialMissionRoundStartStateV13 } from '../rule-atoms/official-mission-round-start-policy-v13.mjs';
import { projectOfficialAbilityReferenceStateV13 } from '../rule-atoms/official-ability-reference-policy-v13.mjs';
import { projectOfficialImpactAllocationStateV13 } from '../rule-atoms/official-impact-allocation-policy-v13.mjs';
import { projectOfficialRelocationGeometryStateV13 } from '../rule-atoms/official-relocation-geometry-policy-v13.mjs';
import { projectOfficialHighGroundFinalPlacementStateV13 } from '../rule-atoms/official-high-ground-final-placement-policy-v13.mjs';
import { projectOfficialModelGapTransitStateV13 } from '../rule-atoms/official-model-gap-transit-policy-v13.mjs';

export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V7_ID =
  'starcraft-tmg-official-current-product-match-runtime-v7';

export function createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime, faqReactionPolicy,
  nonLethalDamagePolicy, structureTargetingPolicy, missionRoundStartPolicy, abilityReferencePolicy,
  impactAllocationPolicy, relocationGeometryPolicy, highGroundFinalPlacementPolicy, modelGapTransitPolicy } = {}) {
  const prior = legacyRuntime?.descriptor;
  if (!prior?.runtimeHash || typeof legacyRuntime.enumerate !== 'function'
    || typeof legacyRuntime.instantiate !== 'function' || typeof legacyRuntime.apply !== 'function') {
    throw new Error('FAQ_REACTION_BASE_RUNTIME_REQUIRED');
  }
  const { runtimeHash: ignored, ...body } = prior;
  if (hashStarcraftTmgContract(body) !== prior.runtimeHash) {
    throw new Error('FAQ_REACTION_BASE_RUNTIME_INVALID');
  }
  // Validate before exposing a runtime and retain our own immutable policy.
  const policy = Object.freeze({ ...projectOfficialFaqReactionStateV13({}, faqReactionPolicy)
    .officialFaqReactionPolicy });
  const damagePolicy = nonLethalDamagePolicy ? Object.freeze({
    ...projectOfficialNonLethalDamageStateV1({}, nonLethalDamagePolicy).officialNonLethalDamagePolicy,
    ruleAtomIds: Object.freeze([...nonLethalDamagePolicy.ruleAtomIds]),
  }) : null;
  const targetingPolicy = structureTargetingPolicy ? Object.freeze({
    ...projectOfficialStructureTargetingStateV13({}, structureTargetingPolicy).officialStructureTargetingPolicy,
  }) : null;
  const missionPolicy = missionRoundStartPolicy ? Object.freeze({
    ...projectOfficialMissionRoundStartStateV13({}, missionRoundStartPolicy).officialMissionRoundStartPolicy,
  }) : null;
  const referencePolicy = abilityReferencePolicy ? Object.freeze({
    ...projectOfficialAbilityReferenceStateV13({}, abilityReferencePolicy).officialAbilityReferencePolicy,
    ruleAtomIds: Object.freeze([...abilityReferencePolicy.ruleAtomIds]),
  }) : null;
  const impactPolicy = impactAllocationPolicy ? Object.freeze({
    ...projectOfficialImpactAllocationStateV13({}, impactAllocationPolicy).officialImpactAllocationPolicy,
  }) : null;
  const geometryPolicy = relocationGeometryPolicy ? Object.freeze({
    ...projectOfficialRelocationGeometryStateV13({}, relocationGeometryPolicy).officialRelocationGeometryPolicy,
  }) : null;
  const highGroundPolicy = highGroundFinalPlacementPolicy ? Object.freeze({
    ...projectOfficialHighGroundFinalPlacementStateV13({}, highGroundFinalPlacementPolicy).officialHighGroundFinalPlacementPolicy,
  }) : null;
  const gapPolicy = modelGapTransitPolicy ? Object.freeze({
    ...projectOfficialModelGapTransitStateV13({}, modelGapTransitPolicy).officialModelGapTransitPolicy,
  }) : null;
  // Native must register the finite action before Engine binds its executor.
  if (hashStarcraftTmgContract(prior.missionRoundStartPolicy || null)
    !== hashStarcraftTmgContract(missionPolicy)) {
    throw new Error('MISSION_ROUND_START_BASE_POLICY_MISMATCH');
  }
  const ruleAtomIds = [...new Set([...prior.executableRuleAtomIds, policy.ruleAtomId,
    ...(damagePolicy?.ruleAtomIds || []), ...(targetingPolicy ? [targetingPolicy.ruleAtomId] : []),
    ...(missionPolicy ? [missionPolicy.ruleAtomId] : []), ...(referencePolicy?.ruleAtomIds || []),
    ...(impactPolicy ? [impactPolicy.ruleAtomId] : []),
    ...(geometryPolicy ? [geometryPolicy.ruleAtomId] : []),
    ...(highGroundPolicy ? [highGroundPolicy.ruleAtomId] : []),
    ...(gapPolicy ? [gapPolicy.ruleAtomId] : [])])].sort();
  const descriptorBody = {
    ...body,
    runtimeId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V7_ID,
    runtimeVersion: gapPolicy?.version === '2.0.0' ? '1.9.0' : gapPolicy ? '1.8.0' : highGroundPolicy ? '1.7.0' : geometryPolicy ? '1.6.0' : impactPolicy ? '1.5.0' : referencePolicy ? '1.4.0' : missionPolicy ? '1.3.0' : targetingPolicy ? '1.2.0' : damagePolicy ? '1.1.0' : '1.0.0',
    rulesVersion: gapPolicy?.version === '2.0.0' ? 'official-current-product-faq-physical-gap-transit-v13-v7'
      : gapPolicy ? 'official-current-product-faq-model-gap-transit-v13-v7'
      : highGroundPolicy ? 'official-current-product-faq-high-ground-placement-v13-v7'
      : geometryPolicy ? 'official-current-product-faq-relocation-geometry-v13-v7'
      : impactPolicy ? 'official-current-product-faq-impact-v13-v7'
      : referencePolicy ? 'official-current-product-faq-ability-references-v13-v7'
      : missionPolicy ? 'official-current-product-faq-mission-start-v13-v7'
      : targetingPolicy ? 'official-current-product-faq-structure-v13-v7'
      : damagePolicy ? 'official-current-product-faq-reactions-nonlethal-v13-v7'
      : 'official-current-product-faq-reactions-v13-v7',
    legacyRuntimeHash: prior.runtimeHash,
    faqReactionPolicy: policy,
    ...(damagePolicy ? { nonLethalDamagePolicy: damagePolicy } : {}),
    ...(targetingPolicy ? { structureTargetingPolicy: targetingPolicy } : {}),
    ...(missionPolicy ? { missionRoundStartPolicy: missionPolicy } : {}),
    ...(referencePolicy ? { abilityReferencePolicy: referencePolicy } : {}),
    ...(impactPolicy ? { impactAllocationPolicy: impactPolicy } : {}),
    ...(geometryPolicy ? { relocationGeometryPolicy: geometryPolicy } : {}),
    ...(highGroundPolicy ? { highGroundFinalPlacementPolicy: highGroundPolicy } : {}),
    ...(gapPolicy ? { modelGapTransitPolicy: gapPolicy } : {}),
    faqImplementedEntryIds: ['faq-v1.3:55', 'faq-v1.3:86', ...(targetingPolicy ? ['faq-v1.3:56'] : []),
      ...(missionPolicy ? ['faq-v1.3:22'] : []), ...(referencePolicy ? ['faq-v1.3:66', 'faq-v1.3:67'] : []),
      ...(impactPolicy ? ['faq-v1.3:73'] : []), ...(geometryPolicy ? ['faq-v1.3:59'] : []),
      ...(highGroundPolicy ? ['faq-v1.3:15', 'faq-v1.3:16'] : []),
      ...(gapPolicy ? ['faq-v1.3:6'] : [])],
    executableRuleAtomIds: ruleAtomIds,
    executableRuleAtomCount: ruleAtomIds.length,
    catalogueHash: hashStarcraftTmgContract({ legacyCatalogueHash: prior.catalogueHash, policy,
      ...(damagePolicy ? { nonLethalDamagePolicy: damagePolicy } : {}),
      ...(targetingPolicy ? { structureTargetingPolicy: targetingPolicy } : {}),
      ...(missionPolicy ? { missionRoundStartPolicy: missionPolicy } : {}),
      ...(referencePolicy ? { abilityReferencePolicy: referencePolicy } : {}),
      ...(impactPolicy ? { impactAllocationPolicy: impactPolicy } : {}),
      ...(geometryPolicy ? { relocationGeometryPolicy: geometryPolicy } : {}),
      ...(highGroundPolicy ? { highGroundFinalPlacementPolicy: highGroundPolicy } : {}),
      ...(gapPolicy ? { modelGapTransitPolicy: gapPolicy } : {}) }),
    productionRoomEligible: false,
  };
  const descriptor = Object.freeze({ ...descriptorBody,
    runtimeHash: hashStarcraftTmgContract(descriptorBody) });
  function project(state) {
    let projected = projectOfficialFaqReactionStateV13(state, policy);
    if (damagePolicy) projected = projectOfficialNonLethalDamageStateV1(projected, damagePolicy);
    else if (state.officialNonLethalDamagePolicy !== undefined) {
      throw new Error('NON_LETHAL_DAMAGE_RUNTIME_POLICY_REQUIRED');
    }
    if (targetingPolicy) projected = projectOfficialStructureTargetingStateV13(projected, targetingPolicy);
    else if (state.officialStructureTargetingPolicy !== undefined) {
      throw new Error('STRUCTURE_TARGETING_RUNTIME_POLICY_REQUIRED');
    }
    if (missionPolicy) projected = projectOfficialMissionRoundStartStateV13(projected, missionPolicy);
    else if (state.officialMissionRoundStartPolicy !== undefined) {
      throw new Error('MISSION_ROUND_START_RUNTIME_POLICY_REQUIRED');
    }
    if (referencePolicy) projected = projectOfficialAbilityReferenceStateV13(projected, referencePolicy);
    else if (state.officialAbilityReferencePolicy !== undefined) {
      throw new Error('ABILITY_REFERENCE_RUNTIME_POLICY_REQUIRED');
    }
    if (impactPolicy) projected = projectOfficialImpactAllocationStateV13(projected, impactPolicy);
    else if (state.officialImpactAllocationPolicy !== undefined) {
      throw new Error('IMPACT_ALLOCATION_RUNTIME_POLICY_REQUIRED');
    }
    if (geometryPolicy) projected = projectOfficialRelocationGeometryStateV13(projected, geometryPolicy);
    else if (state.officialRelocationGeometryPolicy !== undefined) {
      throw new Error('RELOCATION_GEOMETRY_RUNTIME_POLICY_REQUIRED');
    }
    if (highGroundPolicy) projected = projectOfficialHighGroundFinalPlacementStateV13(projected, highGroundPolicy);
    else if (state.officialHighGroundFinalPlacementPolicy !== undefined) {
      throw new Error('HIGH_GROUND_FINAL_PLACEMENT_RUNTIME_POLICY_REQUIRED');
    }
    if (gapPolicy) projected = projectOfficialModelGapTransitStateV13(projected, gapPolicy);
    else if (state.officialModelGapTransitPolicy !== undefined) {
      throw new Error('MODEL_GAP_TRANSIT_RUNTIME_POLICY_REQUIRED');
    }
    return projected;
  }
  return Object.freeze({
    descriptor,
    legacyRuntimeDescriptor: prior,
    compositionEvidence: legacyRuntime.compositionEvidence,
    missionRuntimeDescriptor: legacyRuntime.missionRuntimeDescriptor,
    enumerate(state, options = {}) {
      return { ...legacyRuntime.enumerate(project(state), options), rulesRuntimeHash: descriptor.runtimeHash };
    },
    instantiate(state, domain, parameters, options = {}) {
      return legacyRuntime.instantiate(project(state), domain, parameters, options);
    },
    apply(state, action, options = {}) {
      return { ...legacyRuntime.apply(project(state), action, options),
        runtimeId: descriptor.runtimeId, runtimeVersion: descriptor.runtimeVersion };
    },
  });
}
