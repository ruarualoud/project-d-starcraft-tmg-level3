import { OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID } from './official-ancestral-wisdom-payment-v1.mjs';
import {createOfficialStukovContextualSupplyRoutesV1} from '../source-data/official-stukov-infestation-source-v1.mjs';
import {OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1} from '../rule-atoms/official-repeated-activation-identity-v1.mjs';
import { OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID } from './official-our-minds-as-one-v1.mjs';
import { OFFICIAL_KHALAS_GIFT_DEFINITION_ID } from './official-khalas-gift-v1.mjs';
import { createOfficialCleanupContinuationPolicyV1 } from './official-cleanup-continuation-runtime-v1.mjs';
import { createOfficialConsumePaymentSourceV1 } from './official-consume-payment-facts-v1.mjs';
import { createOfficialConsumePaymentPolicyV1 } from './official-consume-payment-runtime-v1.mjs';
import { createOfficialPlagueCoverageSourceV1 } from './official-plague-coverage-v1.mjs';
import { createOfficialPlagueResolutionPolicyV1 } from './official-plague-runtime-v1.mjs';
import { createOfficialMeleeSidearmPolicyV1, OFFICIAL_DEFILER_SIDEARM_DEFINITION_IDS }
  from './official-melee-sidearm-sequence-v1.mjs';
import { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1, OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1,
  hasOfficialNonLethalDamagePolicyV1 } from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { OFFICIAL_RANGED_DECLARATION_POLICY_V1, OFFICIAL_RANGED_DECLARATION_POLICY_V2 }
  from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V1, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V2, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3 }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1 }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1 } from "../rule-atoms/official-armour-threshold-policy-v1.mjs";
import { OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2, OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3 }
  from '../rule-atoms/official-action-status-lifecycle-policy-v1.mjs';
import { OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13, hasOfficialTemplateBatchOrderPolicyV13 }
  from '../rule-atoms/official-template-batch-order-policy-v13.mjs';
import { createOfficialReactionFamilySourceBundleV2 } from './official-reaction-family-adapter-v1.mjs';
import { createOfficialCharacteristicStatusFamilySourceBundleV2 } from './official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialPoisonousEssencePolicyV1, OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID }
  from './official-poisonous-essence-phase-end-v1.mjs';
import { OFFICIAL_INDOMITABLE_RANGED_POLICY_V1, OFFICIAL_INDOMITABLE_RANGED_POLICY_V2 } from '../rule-atoms/official-indomitable-ranged-policy-v1.mjs';
import { OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1 } from '../rule-atoms/official-mode-bound-ranged-target-policy-v1.mjs';
import { OFFICIAL_COORDINATED_STRIKE_POLICY_V2 } from '../rule-atoms/official-coordinated-strike-policy-v1.mjs';
import { OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1 } from '../rule-atoms/official-movement-clearance-contract-v13.mjs';
import { createOfficialSiegeModeDataBundleV2 } from '../source-data/official-status-stay-in-play-data-bundle-v1.mjs';
import { createOfficialBattlefieldAssetFamilySourceBundleV2 } from "./official-battlefield-asset-family-adapter-v1.mjs";
import { OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1 } from "../rule-atoms/official-armour-roll-ordinal-v1.mjs";
import { verifyOfficialBlastTemplateGeometryAssetV1 } from './official-blast-template-coverage-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { getOfficialReleaseModelBaseGeometryBundleV2 } from '../source-data/official-model-base-geometry-data-bundle-v1.mjs';
import { createOfficialGeneratedUnitDataBundleV2 } from '../source-data/official-generated-unit-data-bundle-v2.mjs';
import { createOfficialStructureSourceV1 } from '../source-data/official-structure-source-v1.mjs';
import { OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 } from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import { createOfficialSabotageDronePhaseEndPolicyV1, OFFICIAL_SABOTAGE_DRONE_PHASE_END_DEFINITION_ID }
  from './official-sabotage-drone-phase-end-v1.mjs';
import { createOfficialSummonDataBundleV2 } from '../source-data/official-summon-data-bundle-v1.mjs';
import { createOfficialDecoySourceV1 } from '../source-data/official-decoy-source-v1.mjs';
import { createOfficialHoloRoundEndSourceV1 } from '../source-data/official-holo-round-end-source-v1.mjs';
import { OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID } from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 } from '../rule-atoms/official-impact-allocation-policy-v13.mjs';
import { createOfficialSummonedCombatEligibilityPolicyV1 } from '../source-data/official-summoned-combat-eligibility-policy-v1.mjs';
import { createOfficialRosterDisclosureDataBundleV2 } from '../source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { createOfficialCombatProfileBundleV1 } from '../source-data/official-combat-profile-bundle-v1.mjs';
import { createOfficialAttackProfileCatalogueV3 } from '../source-data/official-attack-profile-catalogue-v1.mjs';
import { createOfficialAttackProfileCatalogueV2 } from '../source-data/official-attack-profile-catalogue-v2.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialMeleeFamilySourceBundleV2 } from './official-melee-family-adapter-v1.mjs';
import { createOfficialPsionicSourceLifecyclePolicyV1 } from '../source-data/official-psionic-source-lifecycle-policy-v1.mjs';
import { createOfficialRespawnMorphDataBundleV2, OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID,
  OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID } from '../source-data/official-respawn-morph-data-bundle-v1.mjs';
import { createOfficialUnitLifecycleFamilySourceBundleV2 } from './official-unit-lifecycle-family-adapter-v1.mjs';
import { createOfficialRangedFamilySourceBundleV2 } from './official-ranged-family-adapter-v1.mjs';
import { createOfficialZagaraPsionicLinkSourceV1 } from './official-match-lifecycle-family-adapter-v1.mjs';
import { createOfficialPinpointEngagementPolicyV1 } from '../rule-atoms/official-pinpoint-engagement-policy-v1.mjs';
import { createOfficialTerrainLosDataBundleV2 } from '../source-data/official-terrain-los-data-bundle-v1.mjs';
import { getOfficialReleaseUnitCardSupplyDataBundleV2 } from '../source-data/official-unit-card-supply-data-bundle-v1.mjs';
import { createOfficialShieldedLifecyclePolicyV1 } from '../source-data/official-shielded-lifecycle-policy-v1.mjs';
import { createOfficialRelocationFamilySourceBundleV2 } from './official-relocation-family-adapter-v1.mjs';
import { createOfficialPersonalTransportSourceV1 } from './official-personal-transport-runtime-v1.mjs';
import { createOfficialCorrosiveBileSourceV1 } from './official-corrosive-bile-runtime-v1.mjs';
import { createOfficialBombardSourceV1 } from './official-bombard-runtime-v1.mjs';
import { createOfficialDarkSwarmPlacementSourceV1 } from './official-dark-swarm-placement-v1.mjs';
import { createOfficialDarkSwarmTokenLifecyclePolicyV1 } from './official-dark-swarm-token-lifecycle-v1.mjs';
import { createOfficialBombardTargetingPolicyV1 } from './official-bombard-targeting-v1.mjs';
import { createOfficialBombardReplacementPolicyV1 } from './official-bombard-replacement-v1.mjs';
import { createOfficialBombardRemovalLifecyclePolicyV1 } from './official-bombard-removal-lifecycle-v1.mjs';
import { createOfficialCorrosiveBileDamagePolicyV1 } from './official-corrosive-bile-resolution-runtime-v1.mjs';
import { createOfficialCorrosiveBileUpgradeSourceV1 } from './official-corrosive-bile-upgrades-v1.mjs';
import { createOfficialPsionicTransferSourceV1, createOfficialTokenLeadingTransferSourceV2 } from './official-psionic-transfer-runtime-v1.mjs';
import { createOfficialPsionicTransferRoundEndPolicyV1 } from './official-psionic-transfer-round-end-v1.mjs';
import { createOfficialPsionicDisplacementQueryPolicyV1, createOfficialBattlefieldDisplacementQueryPolicyV1 }
  from './official-psionic-displacement-query-v1.mjs';
import { createOfficialPsionicDisplacementPolicyV1, createOfficialBattlefieldDisplacementPolicyV1 }
  from './official-psionic-displacement-runtime-v1.mjs';
import { createOfficialBattlefieldDisplacementSourceV1 } from './official-battlefield-displacement-source-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { getOfficialReleaseBattlefieldAssetComponentProfileV2 } from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { OFFICIAL_EXECUTORS_WILL_DEFINITION_ID } from './official-executors-will-v1.mjs';
import { OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_PSI_LIGHTNING_DEFINITION_ID, createOfficialForceWallTraversalPolicyV1,
  getOfficialForceWallFootprintV1 } from './official-force-wall-v1.mjs';
import { synchronizeOfficialEffectiveHitPointWoundsV1 } from './official-characteristic-status-family-adapter-v1.mjs';
import { resolveOfficialRosterRegistryAuditV1 } from '../rule-atoms/official-roster-disclosure-rules-kernel-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialRoomCardResourcesV1, createOfficialRoomPieceFromRosterUnitV1 } from './official-standard-room-factory-v1.mjs';
import { createOfficialStandardActionRouteCatalogueV1 } from './official-standard-action-route-catalogue-v1.mjs';
import { createOfficialSelectedRosterAbilitySourceBundleV1,
  createOfficialSelectedRosterAbilityRuntimeV1, verifyOfficialSelectedRosterAbilitySourceBundleV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';
import { OFFICIAL_FEEDBACK_DEFINITION_IDS, OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID,
  OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID,
  createOfficialTargetedActiveAbilityPolicyV1, selectOfficialTargetedActiveDefinitionIdsV1 }
  from './official-targeted-active-ability-policy-v1.mjs';
import { OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1 } from './official-feedback-completion-v1.mjs';

// Shared selected-roster construction for candidate release components. This
// produces reserves and source-bound instances. Deployment and match setup are
// separate Native operations, owned by their respective product runtimes.
export function createOfficialReleaseRosterStateV2({ context, candidatesBySide, legacyDisclosurePolicy, blastTemplateGeometryAsset,
  sourceDefinitionIds,includeRepeatedActivationIdentity=false,
  attackProfileRecordKeys,
  includeMelee = false, includeArmourOrdinals = false, meleeModifierDefinitionIds, battlefieldModifierDefinitionIds,
  reactionDefinitionIds, characteristicDefinitionIds, canonicalResourceTypes = false, meleeWeaponDefinitionIds,
  rangedWeaponDefinitionIds,
  includeTemplateBatchOrder = false, templateBatchOrderPolicy, unitLifecycleDefinitionIds,
  includeShieldedLifecycle = false, relocationDefinitionIds, includeCorrosiveBile = false, includeCorrosiveBileDamage = false,
  includeCorrosiveBileOutsideActivationReactions = includeCorrosiveBileDamage, corrosiveBileUpgradeDefinitionIds,
  includeActionPerformedStatusLifecycle = false, includePsionicTransfer = false, includePsionicTransferRoundEnd = false,
  includePsionicDisplacementQueries = false, includePsionicDisplacement = false,
  includePsionicCloseRanksDisplacement = false, includePsionicDisplacementMovementQueries = false,
  includePsionicCloseRanksReactions = false,
  includePsionicTransferRoundEndReactions = false, includeCharacteristicConsumers = false,
  includeHiddenExpiryCleanup = false, includeHiddenRangedAndEvade = false, includeIndomitableTemplateBatches = false,
  includePsionicTransferOutsideActivationReactions = false, includePsionicSourceDestructionCleanup = false,
  includeDeepTunnel = false, includePersonalTransport = false, includeCleanupReactionContinuation = false,
  includeForceWallTraversal = false, includePsionicStormAssaultDamage = false,
  includeDetectionHiddenLoss = false, additionalGeneratedUnitRecordKeys = [], includeHoloDecoyRules = false,
  includeSummonedCombatEligibility = characteristicDefinitionIds?.includes('unit:holo_decoy/lethal-hologram-any-phase@1') === true,
  unitRoundEndDefinitionIds, structureDefinitionIds, includeAbilitySourcePhases = unitRoundEndDefinitionIds !== undefined,
  includeImpactAllocation = false, includePinpointEngagementOverride = false, includeBombardPlacement = false,
  includeBombardTargeting = false, includeBombardReplacement = false, includeBombardRemovalLifecycle = false,
  includeBattlefieldDisplacement = false, includeGestateDarkSwarm = false, includeDarkSwarmLifecycle = false,
  includeConsumePaymentQuotes = false, includeConsumePayment = false, includePlagueCoverage = false, includePlague = false,
  includeKhassarMovement = false,
  includeNonLethalStandardDamage = includePlague || includeKhassarMovement || includePsionicStormAssaultDamage
    || characteristicDefinitionIds?.includes(OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID) === true
    || characteristicDefinitionIds?.some(id => OFFICIAL_FEEDBACK_DEFINITION_IDS.includes(id)
      || /^unit:infested_(marine|trooper)\/plagued-munitions-assault-phase@1$/u.test(id)) === true,
  includeMeleeSidearm, includeZagaraCommander = false, includeTassadarCommander = false,
  includeZagaraPsionicLink = false, includeStructureTargeting = false,
  consumePaymentScope = 'numeric_attack_target_reaction' } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  const pinpointPolicy = includePinpointEngagementOverride ? createOfficialPinpointEngagementPolicyV1({ context }) : null;
  const bundle = context.resources?.armyBuilder;
  const port = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: bundle, releaseContext: context });
  const includeInlineCardPhases = sourceDefinitionIds !== undefined
    || reactionDefinitionIds?.includes('card:zagara_s_swarm/instinctive-reaction-any@1') === true;
  const sourcePhasePolicy = includeAbilitySourcePhases || includeInlineCardPhases
    ? createOfficialAbilitySourcePhasePolicyV1({ dataset: context.dataset, includeInlineCardPhases }) : null;
  let compiledAbilityCatalogue;
  function abilityCatalogue() {
    compiledAbilityCatalogue ??= createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
      identityCatalogue: context.resources.abilityIdentities, ...(sourcePhasePolicy ? { sourcePhasePolicy } : {}),
      ...(sourceDefinitionIds === undefined ? {} : { sourceDefinitionIds }) });
    return compiledAbilityCatalogue;
  }
  const geometry = getOfficialReleaseModelBaseGeometryBundleV2(context);
  const disclosure = createOfficialRosterDisclosureDataBundleV2({ dataset: context.dataset,
    snapshot: context.snapshot, releaseContext: context, unitCompositionUpgradeDataBundle: bundle,
    legacyPolicyBundle: legacyDisclosurePolicy });
  if (!candidatesBySide || Object.keys(candidatesBySide).sort().join(',') !== 'player1,player2') {
    throw Error('RELEASE_ROSTER_TWO_SIDES_REQUIRED');
  }
  const audits = {};
  const players = {};
  for (const sideKey of ['player1', 'player2']) {
    const candidate = candidatesBySide[sideKey];
    if (candidate.sideKey !== sideKey) throw Error('RELEASE_ROSTER_SIDE_MISMATCH');
    const verdict = port.evaluateRosterCandidate(candidate);
    if (verdict.status !== 'legal') throw Object.assign(Error('RELEASE_ROSTER_CANDIDATE_ILLEGAL'), { verdict });
    audits[sideKey] = verdict.audit;
    players[sideKey] = { faction: context.dataset.recordsByKey[candidate.factionRecordKey].payload.faction,
      passedPhases: {} };
  }
  const registry = resolveOfficialRosterRegistryAuditV1({ state: { players },
    rosterDisclosureDataBundle: disclosure, procedureKind: 'roster_registry_audit',
    rosterSetComplete: true, rulesOwnedRosterProjectionRequested: true,
    teamGame: false, armyCompositionUpgradeAuditsBySide: audits });
  const pieces = ['player1', 'player2'].flatMap(sideKey => registry.rostersByPlayer[sideKey].units.map(unit =>
    createOfficialRoomPieceFromRosterUnitV1(context.dataset, geometry,
      { bundle: disclosure, result: registry }, sideKey, unit)));
  const cardResources = Object.fromEntries(['player1', 'player2'].map(sideKey =>
    [sideKey, createOfficialRoomCardResourcesV1(context.dataset, registry, sideKey)]));
  const lifecycle = unitLifecycleDefinitionIds === undefined ? null : createOfficialUnitLifecycleFamilySourceBundleV2({
    catalogue: abilityCatalogue(),
    definitionIds: unitLifecycleDefinitionIds });
  if (!Array.isArray(additionalGeneratedUnitRecordKeys)
    || additionalGeneratedUnitRecordKeys.some(key => typeof key !== 'string' || !key.startsWith('army_units:'))
    || new Set(additionalGeneratedUnitRecordKeys).size !== additionalGeneratedUnitRecordKeys.length) {
    throw Error('RELEASE_ROSTER_GENERATED_RECORDS_INVALID');
  }
  const roundEndSource = unitRoundEndDefinitionIds === undefined ? null : createOfficialHoloRoundEndSourceV1({
    context, catalogue: abilityCatalogue(), definitionIds: unitRoundEndDefinitionIds });
  const sabotageDronePhaseEnd = characteristicDefinitionIds?.includes(OFFICIAL_SABOTAGE_DRONE_PHASE_END_DEFINITION_ID) === true;
  const autoTurretOverwatch = reactionDefinitionIds?.includes(OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID) === true;
  const defaultStructureDefinitions = [
    ...(sabotageDronePhaseEnd ? ['unit:sabotage_drone/structure-any-phase@1'] : []),
    ...(autoTurretOverwatch ? ['unit:auto_turret/structure-any-phase@1'] : []),
  ];
  const selectedStructureDefinitions = structureDefinitionIds
    ?? (defaultStructureDefinitions.length ? defaultStructureDefinitions : undefined);
  const structureSource = selectedStructureDefinitions === undefined ? null
    : createOfficialStructureSourceV1({ catalogue: abilityCatalogue(), definitionIds: selectedStructureDefinitions });
  const generatedRecordKeys = [...new Set([...(lifecycle?.generatedUnitRecordKeys || []),
    ...(roundEndSource?.generatedUnitRecordKeys || []), ...(structureSource?.definitions.map(row => row.recordKey) || []),
    ...additionalGeneratedUnitRecordKeys])];
  const otherGeneratedRecordKeys = generatedRecordKeys.filter(key => context.dataset.recordsByKey[key]?.payload.unitType === 'Other');
  // Morph results such as Ravager retain their dedicated source contract.
  if (additionalGeneratedUnitRecordKeys.some(key => !otherGeneratedRecordKeys.includes(key))) {
    throw Error('RELEASE_ROSTER_GENERATED_RECORD_NOT_OTHER');
  }
  const recordKeys = [...new Set([...pieces.map(piece => piece.officialUnitRecordKey), ...generatedRecordKeys])];
  const state = { players, pieces, cardResources, armyCompositionUpgradeAuditsBySide: audits,
    ...(pinpointPolicy ? { officialPinpointEngagementPolicy: pinpointPolicy } : {}),
    officialRosterRegistryResult: registry, officialRosterDisclosureDataBundle: disclosure,
    officialModelBaseGeometryDataBundle: geometry,
    officialUnitCardSupplyDataBundle: getOfficialReleaseUnitCardSupplyDataBundleV2(context),
    officialCardBuildPaymentDataBundle: bundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.cardDataBundle,
    officialCombatProfileBundle: createOfficialCombatProfileBundleV1({ dataset: context.dataset,
      snapshot: context.snapshot, recordKeys }),
    trainingTruth: false };
  if (sourcePhasePolicy) state.officialAbilitySourcePhasePolicy = sourcePhasePolicy;
  if (otherGeneratedRecordKeys.length) {
    state.officialGeneratedUnitDataBundle = createOfficialGeneratedUnitDataBundleV2({ context, recordKeys: otherGeneratedRecordKeys });
  }
  if (structureSource) state.officialStructureSourceBundle = structureSource;
  const summons = lifecycle?.routes.filter(row => row.effectKind === 'summon_unit') || [];
  if (summons.some(row => row.createdUnitRecordKey === 'army_units:holo_decoy')) {
    state.officialSummonDataBundle = createOfficialSummonDataBundleV2({ context, definitionIds: summons.map(row => row.definitionId) });
  }
  if (includeHoloDecoyRules) {
    if (!recordKeys.includes('army_units:holo_decoy')) throw Error('RELEASE_ROSTER_DECOY_PROFILE_REQUIRED');
    state.officialDecoySourceBundle = createOfficialDecoySourceV1({ catalogue: abilityCatalogue() });
  }
  if (includeSummonedCombatEligibility) {
    if (!includeMelee || !state.officialSummonDataBundle) throw Error('RELEASE_ROSTER_SUMMONED_COMBAT_CONSUMERS_REQUIRED');
    state.officialSummonedCombatEligibilityPolicy = createOfficialSummonedCombatEligibilityPolicyV1({ context });
  }
  if (includeArmourOrdinals) state.officialArmourRollOrdinalPolicy = structuredClone(OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1);
  if (attackProfileRecordKeys !== undefined && (!Array.isArray(attackProfileRecordKeys)
    || new Set(attackProfileRecordKeys).size !== attackProfileRecordKeys.length
    || attackProfileRecordKeys.some(key => !recordKeys.includes(key))
    || pieces.some(piece => !attackProfileRecordKeys.includes(piece.officialUnitRecordKey)))) {
    throw Error('RELEASE_ROSTER_ATTACK_PROFILE_SELECTION_INVALID');
  }
  if (attackProfileRecordKeys !== undefined && recordKeys.some(key => !attackProfileRecordKeys.includes(key))
    && context.allowEngineeringEstimatedGeometry !== true) {
    throw Error('RELEASE_ROSTER_PARTIAL_GENERATED_WEAPONS_ENGINEERING_ONLY');
  }
  state.officialAttackProfileCatalogue = createOfficialAttackProfileCatalogueV3({ context,
    recordKeys: attackProfileRecordKeys ?? [...new Set(recordKeys)] });
  if (attackProfileRecordKeys !== undefined) state.officialUnadmittedGeneratedWeaponRecords = recordKeys
    .filter(key => !attackProfileRecordKeys.includes(key));
  if (rangedWeaponDefinitionIds !== undefined) {
    state.officialRosterRangedWeaponSourceBundle = createOfficialRangedFamilySourceBundleV2({
      catalogue: abilityCatalogue(), definitionIds: rangedWeaponDefinitionIds,
      attackProfileCatalogue: state.officialAttackProfileCatalogue,
    });
    if (state.officialRosterRangedWeaponSourceBundle.routes.some(route => route.effectKind !== 'weapon')) {
      throw Error('RELEASE_ROSTER_RANGED_WEAPON_SOURCE_REQUIRED');
    }
  }
  if (lifecycle) {
    state.officialUnitLifecycleFamilySourceBundle = lifecycle;
    if (lifecycle.generatedRangedDefinitionIds.length) state.officialRangedFamilySourceBundle = createOfficialRangedFamilySourceBundleV2({
      catalogue: abilityCatalogue(),
      definitionIds: lifecycle.generatedRangedDefinitionIds, attackProfileCatalogue: state.officialAttackProfileCatalogue });
  }
  const unitRespawnIds = (lifecycle?.definitionIds ?? []).filter(id =>
    id === OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID || id === OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID);
  if (unitRespawnIds.includes(OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID)
    && lifecycle.compilerScope !== 'current_release_vileling_reconstitution_subset') {
    state.officialRespawnMorphDataBundle = createOfficialRespawnMorphDataBundleV2({ context,
      respawnDefinitionIds: unitRespawnIds });
  } else if (['current_release_cocoon_spawn_larva_subset', 'current_release_cocoon_morph_subset',
    'current_release_vileling_reconstitution_subset'].includes(lifecycle?.compilerScope)) {
    state.officialRespawnMorphDataBundle = createOfficialRespawnMorphDataBundleV2({ context,
      includeMorph: lifecycle.compilerScope === 'current_release_cocoon_morph_subset',
      ...(lifecycle.compilerScope === 'current_release_vileling_reconstitution_subset'
        ? { respawnDefinitionId: lifecycle.definitionIds[0] } : {}) });
  }
  if (characteristicDefinitionIds !== undefined) {
    state.officialCharacteristicStatusFamilySourceBundle = createOfficialCharacteristicStatusFamilySourceBundleV2({
      catalogue: abilityCatalogue(),
      definitionIds: characteristicDefinitionIds, canonicalResourceTypes: canonicalResourceTypes || sabotageDronePhaseEnd
        || reactionDefinitionIds?.includes(OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID) });
    const stukovSupplyRoutes=createOfficialStukovContextualSupplyRoutesV1(state.officialCharacteristicStatusFamilySourceBundle);
    if(stukovSupplyRoutes.length)state.officialContextualSupplyModifierRoutes=[...(state.officialContextualSupplyModifierRoutes||[]),...stukovSupplyRoutes];
    if(includeRepeatedActivationIdentity){
      if(!characteristicDefinitionIds.includes(OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1.sourceDefinitionId))throw Error('REPEATED_ACTIVATION_ADMIRAL_SOURCE_REQUIRED');
      state.officialRepeatedActivationIdentityPolicy=structuredClone(OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1);
    }
    if (characteristicDefinitionIds.includes(OFFICIAL_FORCE_WALL_DEFINITION_ID)) {
      state.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
      getOfficialForceWallFootprintV1(state);
    }
    const targetedAbilityIds = selectOfficialTargetedActiveDefinitionIdsV1(characteristicDefinitionIds);
    if (targetedAbilityIds.length) {
      state.officialTargetedActiveAbilityPolicy = createOfficialTargetedActiveAbilityPolicyV1({
        context, definitionIds: targetedAbilityIds,
      });
    }
    if (characteristicDefinitionIds.includes(OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID)) {
      state.officialPoisonousEssencePolicy = createOfficialPoisonousEssencePolicyV1({ context,
        source: state.officialCharacteristicStatusFamilySourceBundle });
      state.officialNonLethalDamagePolicy = structuredClone(OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1);
    }
    if (characteristicDefinitionIds.some(id => OFFICIAL_FEEDBACK_DEFINITION_IDS.includes(id))) {
      state.officialNonLethalDamagePolicy = structuredClone(OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1);
      state.officialFeedbackReactionTimingPolicy = structuredClone(OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1);
    }
    if (sabotageDronePhaseEnd) {
      state.officialSabotageDronePhaseEndPolicy = createOfficialSabotageDronePhaseEndPolicyV1({ context,
        source: state.officialCharacteristicStatusFamilySourceBundle });
      state.officialFaqReactionPolicy = structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
    }
    if (state.officialCharacteristicStatusFamilySourceBundle.routes.some(row => row.effectKind === 'indomitable')) {
      state.officialIndomitableRangedPolicy = structuredClone(includeIndomitableTemplateBatches
        ? OFFICIAL_INDOMITABLE_RANGED_POLICY_V2 : OFFICIAL_INDOMITABLE_RANGED_POLICY_V1);
    }
    if (state.officialCharacteristicStatusFamilySourceBundle.routes.some(row => row.effectKind === 'ranged_engaged_target_prohibition')) {
      state.officialModeBoundRangedTargetPolicy = structuredClone(OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1);
    }
    if (state.officialCharacteristicStatusFamilySourceBundle.routes.some(row => row.effectKind === 'coordinated_strike')) {
      state.officialCoordinatedStrikeConsumerPolicy = structuredClone(OFFICIAL_COORDINATED_STRIKE_POLICY_V2);
    }
    if (state.officialCharacteristicStatusFamilySourceBundle.routes.some(row => row.effectKind === 'large_movement')) {
      state.officialLargeTerrainRemovalPolicy = structuredClone(OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1);
    }
  }
  if (includeForceWallTraversal) {
    const route = state.officialCharacteristicStatusFamilySourceBundle?.routes.find(row =>
      row.definitionId === OFFICIAL_FORCE_WALL_DEFINITION_ID);
    state.officialForceWallTraversalPolicy = createOfficialForceWallTraversalPolicyV1(state, route);
  }
  if (includeCleanupReactionContinuation || includeBombardRemovalLifecycle) {
    const hasCharacteristicCleanupConsumer = state.officialCharacteristicStatusFamilySourceBundle?.routes.some(route =>
      [OFFICIAL_EXECUTORS_WILL_DEFINITION_ID, OFFICIAL_KHALAS_GIFT_DEFINITION_ID,
        OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID, 'card:templar_caste/our-duty-is-unending-any@1',
        OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID].includes(route.definitionId));
    if (!includeHiddenExpiryCleanup && !state.officialForceWallTraversalPolicy
      && !(includeCleanupReactionContinuation && hasCharacteristicCleanupConsumer)) {
      throw Error('RELEASE_ROSTER_CLEANUP_EXPIRY_POLICY_REQUIRED');
    }
    state.officialCleanupContinuationPolicy = createOfficialCleanupContinuationPolicyV1({ context });
  }
  if (roundEndSource) {
    state[roundEndSource.version === '1.1.0' ? 'officialUnitRoundEndSourceBundle' : 'officialHoloRoundEndSourceBundle'] = roundEndSource;
    state.officialCleanupContinuationPolicy = createOfficialCleanupContinuationPolicyV1({ context });
  }
  if (includeIndomitableTemplateBatches && !state.officialIndomitableRangedPolicy) throw Error('RELEASE_ROSTER_INDOMITABLE_TEMPLATE_SOURCE_REQUIRED');
  if (includeCharacteristicConsumers) {
    if (!state.officialCharacteristicStatusFamilySourceBundle) throw Error('RELEASE_ROSTER_CHARACTERISTIC_SOURCE_REQUIRED');
    state.officialCharacteristicConsumerPolicy = structuredClone(includeHiddenRangedAndEvade
      ? OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3 : includeHiddenExpiryCleanup
      ? OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V2 : OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V1);
  }
  if (includeDetectionHiddenLoss) {
    if (!includeHiddenRangedAndEvade
      || !state.officialCharacteristicStatusFamilySourceBundle?.routes.some(route => route.effectKind === 'detection_aura')) {
      throw Error('RELEASE_ROSTER_DETECTION_CONSUMERS_REQUIRED');
    }
    state.officialDetectionHiddenLossPolicy = structuredClone(OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1);
  }
  if ((includeHiddenExpiryCleanup || includeHiddenRangedAndEvade) && !includeCharacteristicConsumers) throw Error('RELEASE_ROSTER_CHARACTERISTIC_CONSUMERS_REQUIRED');
  if (includeHiddenExpiryCleanup || includeHiddenRangedAndEvade) state.officialFaqReactionPolicy = structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
  if (includeMelee) state.officialAttackProfileCatalogueV2 = createOfficialAttackProfileCatalogueV2({
    previousCatalogue: state.officialAttackProfileCatalogue });
  const selectedSidearm = pieces.some(piece => piece.officialUnitRecordKey === 'army_units:defiler'
    && piece.selectedUpgradeNames.some(name => String(name).toLowerCase() === 'cancerous bite'));
  const meleeSidearm = includeMeleeSidearm ?? (includeMelee && selectedSidearm);
  if (meleeSidearm && (!includeMelee || !selectedSidearm)) throw Error('RELEASE_ROSTER_MELEE_SIDEARM_PURCHASE_REQUIRED');
  if (meleeSidearm) state.officialMeleeSidearmPolicy = createOfficialMeleeSidearmPolicyV1({ context,
    catalogue: state.officialAttackProfileCatalogueV2 });
  const selectedMeleeWeaponDefinitionIds = meleeSidearm
    ? [...new Set([...(meleeWeaponDefinitionIds || []), ...OFFICIAL_DEFILER_SIDEARM_DEFINITION_IDS])]
    : meleeWeaponDefinitionIds;
  if (includeImpactAllocation) {
    if (!includeMelee) throw Error('RELEASE_ROSTER_IMPACT_MELEE_REQUIRED');
    state.officialImpactAllocationPolicy = structuredClone(OFFICIAL_IMPACT_ALLOCATION_POLICY_V13);
  }
  if (meleeModifierDefinitionIds !== undefined) {
    if (!includeMelee) throw Error('RELEASE_ROSTER_MELEE_CATALOGUE_REQUIRED');
    state.officialMeleeFamilySourceBundle = createOfficialMeleeFamilySourceBundleV2({
      catalogue: abilityCatalogue(), definitionIds: meleeModifierDefinitionIds,
      attackProfileCatalogueV2: state.officialAttackProfileCatalogueV2 });
  }
  if (selectedMeleeWeaponDefinitionIds !== undefined) {
    if (!includeMelee) throw Error('RELEASE_ROSTER_MELEE_CATALOGUE_REQUIRED');
    state.officialMeleeWeaponSourceBundle = createOfficialMeleeFamilySourceBundleV2({
      catalogue: abilityCatalogue(), definitionIds: selectedMeleeWeaponDefinitionIds,
      attackProfileCatalogueV2: state.officialAttackProfileCatalogueV2 });
  }
  if (battlefieldModifierDefinitionIds !== undefined) {
    state.officialBattlefieldAssetFamilySourceBundle = createOfficialBattlefieldAssetFamilySourceBundleV2({
      catalogue: abilityCatalogue(), definitionIds: battlefieldModifierDefinitionIds });
    state.officialArmourThresholdPolicy = structuredClone(OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1);
  }
  if (blastTemplateGeometryAsset) {
    verifyOfficialBlastTemplateGeometryAssetV1(blastTemplateGeometryAsset, state.officialAttackProfileCatalogue);
    state.officialBlastTemplateGeometryAsset = structuredClone(blastTemplateGeometryAsset);
  }
  if (includeTemplateBatchOrder) {
    if (!blastTemplateGeometryAsset) throw Error('RELEASE_ROSTER_TEMPLATE_BATCH_ORDER_GEOMETRY_REQUIRED');
    state.officialTemplateBatchOrderPolicy = structuredClone(templateBatchOrderPolicy === undefined
      ? OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13 : templateBatchOrderPolicy);
    hasOfficialTemplateBatchOrderPolicyV13(state);
  } else if (templateBatchOrderPolicy !== undefined) {
    throw Error('RELEASE_ROSTER_TEMPLATE_BATCH_ORDER_POLICY_WITHOUT_CONSUMER');
  }
  if (reactionDefinitionIds !== undefined) {
    state.officialReactionFamilySourceBundle = createOfficialReactionFamilySourceBundleV2({
      catalogue: abilityCatalogue(), definitionIds: reactionDefinitionIds });
    if (state.officialReactionFamilySourceBundle.routes.some(route => route.effectKind === 'ranged_declaration_keywords')) {
      state.officialRangedDeclarationPolicy = structuredClone(state.officialReactionFamilySourceBundle.definitionIds
        .includes('unit:nova_stealth_mode/head-shot-assault-phase@1')
        ? OFFICIAL_RANGED_DECLARATION_POLICY_V2 : OFFICIAL_RANGED_DECLARATION_POLICY_V1);
    }
    if (state.officialReactionFamilySourceBundle.routes.some(route => route.definitionId === OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID
      || ['hidden_loss_might', 'fixed_evade_characteristic', 'ranged_declaration_keywords', 'refresh_after_friendly_supply_loss'].includes(route.effectKind)
      || route.requiresSharedFriendlyDarkSwarmToken === true
      || route.chargeDeclarationOwner === 'current_source_v1' || route.activationEndOwner === 'current_source_v1')) {
      state.officialFaqReactionPolicy = structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
    }
  }
  if (state.officialCharacteristicStatusFamilySourceBundle?.routes.some(route =>
    ['mode_toggle', 'coordinated_strike'].includes(route.effectKind))
    || state.officialReactionFamilySourceBundle?.routes.some(route => route.effectKind === 'ranged_declaration_keywords' && route.requiresSiegeMode)) {
    state.officialSiegeModeDataBundle = createOfficialSiegeModeDataBundleV2({ context });
  }
  if (relocationDefinitionIds !== undefined) {
    state.officialRelocationFamilySourceBundle = createOfficialRelocationFamilySourceBundleV2({
      catalogue: abilityCatalogue(), definitionIds: relocationDefinitionIds });
  }
  if (includePersonalTransport) {
    state.officialPersonalTransportSourceBundle = createOfficialPersonalTransportSourceV1({ context });
  }
  if (includeCorrosiveBile) {
    state.officialCorrosiveBileSourceBundle = createOfficialCorrosiveBileSourceV1({
      catalogue: abilityCatalogue() });
    state.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
  }
  if (includeBombardPlacement) {
    state.officialBombardSourceBundle = createOfficialBombardSourceV1({ catalogue: abilityCatalogue() });
    state.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
  }
  if (includeGestateDarkSwarm) {
    state.officialDarkSwarmPlacementSourceBundle = createOfficialDarkSwarmPlacementSourceV1({ catalogue: abilityCatalogue() });
    state.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
  }
  if (includePlagueCoverage || includePlague) {
    if (!blastTemplateGeometryAsset) throw Error('PLAGUE_COVERAGE_TEMPLATE_GEOMETRY_REQUIRED');
    state.officialPlagueCoverageSourceBundle = createOfficialPlagueCoverageSourceV1({ context, catalogue: abilityCatalogue() });
  }
  if (includeConsumePaymentQuotes || includeConsumePayment || includePlagueCoverage || includePlague) {
    state.officialConsumePaymentSourceBundle = createOfficialConsumePaymentSourceV1({ catalogue: abilityCatalogue() });
  }
  if (includeConsumePayment || includePlague) {
    state.officialConsumePaymentPolicy = createOfficialConsumePaymentPolicyV1({ context,
      source: state.officialConsumePaymentSourceBundle, consumerScope: consumePaymentScope,
      templateSurvivorsOnly: consumePaymentScope === 'numeric_and_template_attack_target_reaction',
      combatLifecycleCoexistence: includeMelee, activeAbilityPayment: includePlague });
  }
  if (includePlague) {
    state.officialPlagueResolutionPolicy = createOfficialPlagueResolutionPolicyV1({ context,
      source: state.officialPlagueCoverageSourceBundle });
    state.officialNonLethalDamagePolicy = structuredClone(OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1);
  }
  if (includeKhassarMovement) {
    if (context.manifest.source.references.core?.byteHash !== OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1.sourceCoreByteHash) {
      throw Error('RELEASE_ROSTER_KHASSAR_NON_LETHAL_SOURCE_MISMATCH');
    }
    state.officialNonLethalDamagePolicy = structuredClone(OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1);
  }
  if (includePsionicStormAssaultDamage) {
    if (context.manifest.source.references.core?.byteHash !== OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1.sourceCoreByteHash) {
      throw Error('RELEASE_ROSTER_STORM_NON_LETHAL_SOURCE_MISMATCH');
    }
    state.officialNonLethalDamagePolicy = structuredClone(OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1);
  }
  if (state.officialCharacteristicStatusFamilySourceBundle?.routes.some(r=>r.effectKind==='plagued_munitions')) {
    if(context.manifest.source.references.core?.byteHash!==OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1.sourceCoreByteHash)
      throw Error('RELEASE_ROSTER_MUNITIONS_NON_LETHAL_SOURCE_MISMATCH');
    state.officialNonLethalDamagePolicy=structuredClone(OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1);
  }
  if (includeNonLethalStandardDamage) {
    if (!hasOfficialNonLethalDamagePolicyV1(state)) throw Error('RELEASE_ROSTER_NON_LETHAL_SOURCE_REQUIRED');
    state.officialNonLethalStandardDamagePolicy = structuredClone(OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1);
  }
  if (includeDarkSwarmLifecycle) {
    if (!includeGestateDarkSwarm) throw Error('DARK_SWARM_LIFECYCLE_PLACEMENT_REQUIRED');
    state.officialDarkSwarmTokenLifecyclePolicy = createOfficialDarkSwarmTokenLifecyclePolicyV1({ context,
      source: state.officialDarkSwarmPlacementSourceBundle });
    state.officialCleanupContinuationPolicy = createOfficialCleanupContinuationPolicyV1({ context });
  }
  if (includeBombardTargeting) {
    if (!includeBombardPlacement) throw Error('BOMBARD_TARGETING_PLACEMENT_SOURCE_REQUIRED');
    state.officialBombardTargetingPolicy = createOfficialBombardTargetingPolicyV1({ source: state.officialBombardSourceBundle });
  }
  if (includeBombardReplacement) {
    if (!includeBombardTargeting) throw Error('BOMBARD_REPLACEMENT_TARGETING_CONSUMER_REQUIRED');
    state.officialBombardReplacementPolicy = createOfficialBombardReplacementPolicyV1({ source: state.officialBombardSourceBundle });
  }
  if (includeBombardRemovalLifecycle) {
    if (!includeBombardReplacement) throw Error('BOMBARD_REMOVAL_REPLACEMENT_CONSUMER_REQUIRED');
    state.officialBombardRemovalLifecyclePolicy = createOfficialBombardRemovalLifecyclePolicyV1({ context,
      source: state.officialBombardSourceBundle });
  }
  if (includeActionPerformedStatusLifecycle) {
    const anakh = state.officialCharacteristicStatusFamilySourceBundle?.routes.some(
      route => route.definitionId === 'card:void_seeker/anakh-su-n-any@1');
    state.officialActionStatusLifecyclePolicy = structuredClone(anakh
      ? OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3 : OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2);
  }
  const tokenLeading = includePsionicTransfer || includeDeepTunnel;
  if (includeDeepTunnel && (!includePsionicTransferRoundEnd || !includePsionicDisplacement
    || !includePsionicSourceDestructionCleanup)) throw Error('RELEASE_ROSTER_DEEP_TUNNEL_CONSUMERS_REQUIRED');
  if (tokenLeading) {
    state.officialPsionicTransferSourceBundle = (includeDeepTunnel
      ? createOfficialTokenLeadingTransferSourceV2 : createOfficialPsionicTransferSourceV1)({
      includePsionicTransfer,
      catalogue: abilityCatalogue() });
    state.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
  }
  if (includePsionicSourceDestructionCleanup) {
    if (!tokenLeading) throw Error('RELEASE_ROSTER_PSIONIC_TRANSFER_PRODUCER_REQUIRED');
    state.officialPsionicSourceLifecyclePolicy = createOfficialPsionicSourceLifecyclePolicyV1({ context, includeDeepTunnel });
  }
  if (includePsionicTransferRoundEnd) {
    if (!tokenLeading) throw Error('RELEASE_ROSTER_PSIONIC_TRANSFER_PRODUCER_REQUIRED');
    state.officialPsionicTransferRoundEndPolicy = createOfficialPsionicTransferRoundEndPolicyV1({
      context, source: state.officialPsionicTransferSourceBundle, includePostPlaceReactions: includePsionicTransferRoundEndReactions,
      includeOutsideActivationReactions: includePsionicTransferOutsideActivationReactions });
  }
  if (includePsionicTransferRoundEndReactions && !includePsionicTransferRoundEnd) {
    throw Error('RELEASE_ROSTER_PSIONIC_ROUND_END_REQUIRED');
  }
  if (includePsionicTransferOutsideActivationReactions && !includePsionicTransferRoundEndReactions) {
    throw Error('RELEASE_ROSTER_PSIONIC_POST_PLACE_REACTION_REQUIRED');
  }
  if (includePsionicTransferOutsideActivationReactions) state.officialFaqReactionPolicy = structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
  if (includePsionicTransferRoundEndReactions && !state.officialReactionFamilySourceBundle?.routes.some(
    route => route.triggerKind === 'after_place' && route.effectKind === 'post_place_heal')) {
    throw Error('RELEASE_ROSTER_PSIONIC_POST_PLACE_REACTION_SOURCE_REQUIRED');
  }
  if (includePsionicDisplacementQueries || includePsionicDisplacement) {
    if (!tokenLeading) throw Error('RELEASE_ROSTER_PSIONIC_TRANSFER_PRODUCER_REQUIRED');
    state.officialPsionicDisplacementQueryPolicy = createOfficialPsionicDisplacementQueryPolicyV1({ context,
      source: state.officialPsionicTransferSourceBundle });
  }
  if (includePsionicDisplacement) {
    state.officialPsionicDisplacementPolicy = createOfficialPsionicDisplacementPolicyV1({ context,
      source: state.officialPsionicTransferSourceBundle, includeCloseRanks: includePsionicCloseRanksDisplacement,
      includeMovementQueries: includePsionicDisplacementMovementQueries, includeCloseRanksReactions: includePsionicCloseRanksReactions });
  }
  if (includePsionicCloseRanksDisplacement && (!includePsionicDisplacement || !includeMelee)) {
    throw Error('RELEASE_ROSTER_CLOSE_RANKS_DISPLACEMENT_CONSUMERS_REQUIRED');
  }
  if (includePsionicCloseRanksReactions && (!includePsionicCloseRanksDisplacement || !includeCharacteristicConsumers
    || !state.officialReactionFamilySourceBundle?.routes.some(route => route.effectKind === 'hidden_loss_might'))) {
    throw Error('RELEASE_ROSTER_CLOSE_RANKS_REACTION_CONSUMERS_REQUIRED');
  }
  if (includePsionicDisplacementMovementQueries && !includePsionicDisplacement) {
    throw Error('RELEASE_ROSTER_DISPLACEMENT_EXECUTION_REQUIRED');
  }
  if (includeCorrosiveBileDamage) {
    if (!includeCorrosiveBile) throw Error('RELEASE_ROSTER_CORROSIVE_BILE_PRODUCER_REQUIRED');
    state.officialCorrosiveBileDamagePolicy = createOfficialCorrosiveBileDamagePolicyV1({ context,
      source: state.officialCorrosiveBileSourceBundle, outsideActivationReactions: includeCorrosiveBileOutsideActivationReactions });
  }
  if (corrosiveBileUpgradeDefinitionIds !== undefined) {
    if (!includeCorrosiveBileDamage) throw Error('RELEASE_ROSTER_CORROSIVE_BILE_UPGRADE_CONSUMER_REQUIRED');
    state.officialCorrosiveBileUpgradeSourceBundle = createOfficialCorrosiveBileUpgradeSourceV1({ context,
      catalogue: abilityCatalogue(), definitionIds: corrosiveBileUpgradeDefinitionIds });
  }
  if (includeCorrosiveBileOutsideActivationReactions) {
    if (!includeCorrosiveBileDamage) throw Error('RELEASE_ROSTER_CORROSIVE_BILE_DAMAGE_REQUIRED');
    state.officialFaqReactionPolicy = structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
  }
  if (includePsionicStormAssaultDamage) state.officialFaqReactionPolicy = structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: context.dataset, state });
  state.officialTerrainLosDataBundle = createOfficialTerrainLosDataBundleV2({ context });
  if (includeZagaraCommander) state.officialZagaraCommanderEnabled = true;
  if (includeTassadarCommander) state.officialTassadarCommanderEnabled = true;
  if (includeZagaraPsionicLink) {
    if (!recordKeys.includes('army_units:zagara')) throw Error('RELEASE_ROSTER_ZAGARA_SOURCE_REQUIRED');
    state.officialZagaraPsionicLinkSource = createOfficialZagaraPsionicLinkSourceV1(abilityCatalogue());
  }
  if (includeStructureTargeting) state.officialStructureTargetingPolicy = structuredClone(OFFICIAL_STRUCTURE_TARGETING_POLICY_V13);
  state.officialSelectedRosterAbilitySourceBundle = createOfficialSelectedRosterAbilitySourceBundleV1({
    dataset: context.dataset, state });
  state.officialSelectedRosterAbilityRuntimeDescriptor = createOfficialSelectedRosterAbilityRuntimeV1(state).descriptor;
  if (includeBattlefieldDisplacement) {
    state.officialBattlefieldDisplacementSourceBundle = createOfficialBattlefieldDisplacementSourceV1({ state });
    state.officialBattlefieldDisplacementQueryPolicy = createOfficialBattlefieldDisplacementQueryPolicyV1({ context,
      source: state.officialBattlefieldDisplacementSourceBundle });
    state.officialBattlefieldDisplacementPolicy = createOfficialBattlefieldDisplacementPolicyV1({ context,
      source: state.officialBattlefieldDisplacementSourceBundle, includeCloseRanks: includeMelee,
      includeMovementQueries: true, includeCloseRanksReactions: includeMelee
        && state.officialReactionFamilySourceBundle?.routes.some(route => route.effectKind === 'hidden_loss_might') === true });
  }
  if (includeShieldedLifecycle || includePlague || includeKhassarMovement
    || characteristicDefinitionIds?.includes(OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID)
    || characteristicDefinitionIds?.includes(OFFICIAL_PSI_LIGHTNING_DEFINITION_ID)
    || characteristicDefinitionIds?.includes(OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID)
    || characteristicDefinitionIds?.some(id => OFFICIAL_FEEDBACK_DEFINITION_IDS.includes(id))) {
    state.officialShieldedLifecyclePolicy = createOfficialShieldedLifecyclePolicyV1({ context });
    for (const piece of state.pieces) {
      synchronizeOfficialEffectiveHitPointWoundsV1(state, piece, { includeUnmodifiedProfiles: true });
    }
  }
  return { state, sourceBinding: { releaseId: context.manifest.releaseId,
    manifestHash: context.manifest.manifestHash, normalizedDatasetHash: context.dataset.datasetHash,
    sourceSnapshotHash: context.snapshot.snapshotHash },
    rosterConstructionHash: hash({ registryHash: registry.resultHash, pieces, cardResources }),
    completeMatchSetup: false, productionRoomEligible: false, trainingTruth: false };
}

export function refreshOfficialReleaseRosterDerivedStateV2({ context, state }) {
  assertOfficialReleaseSourceV2(context, context || {});
  const next = structuredClone(state);
  next.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: context.dataset, state: next });
  const previousBundle = next.officialSelectedRosterAbilitySourceBundle;
  let definitionIdsBySourceHash;
  if (previousBundle?.compilerScope === 'explicit_source_subset') {
    verifyOfficialSelectedRosterAbilitySourceBundleV1(previousBundle);
    definitionIdsBySourceHash = new Map(previousBundle.routes.map(route => [route.sourceFeatureHash, route.definitionId]));
  }
  next.officialSelectedRosterAbilitySourceBundle = createOfficialSelectedRosterAbilitySourceBundleV1({
    dataset: context.dataset, state: next, definitionIdsBySourceHash,
  });
  next.officialSelectedRosterAbilityRuntimeDescriptor = createOfficialSelectedRosterAbilityRuntimeV1(next).descriptor;
  return next;
}
