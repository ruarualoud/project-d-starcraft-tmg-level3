import { verifyOfficialSpawnRoundAbilityLockPolicyV1, allowsOfficialSpawnRoundSpecialAbilityV1 } from '../rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import { readOfficialFactionUnitConversionV1 } from '../rule-atoms/official-faction-unit-conversion-v1.mjs';
import { createOfficialArtanisDashContinuationV1 } from './official-artanis-second-charge-v1.mjs';
import { getOfficialReleaseWave3CommunityGeometryV1 } from '../source-data/official-wave3-community-geometry-v1.mjs';
import { createOfficialPsionicStormSourceRulesV1 } from './official-psionic-storm-source-rules-v1.mjs';
import { createOfficialReleaseAssaultEffectOrderV1 } from './official-release-assault-effect-order-v1.mjs';
import { createOfficialPsionicStormPhaseEndV1 } from './official-psionic-storm-phase-end-v1.mjs';
import { cleanupOfficialPsionicStormTokensV1, createOfficialPsionicStormCastRuntimeV1, createOfficialRegisteredStormCastAdapterV1 }
  from './official-psionic-storm-cast-runtime-v1.mjs';
import { createOfficialRavenSeekerMissileRulesV1 } from './official-raven-seeker-missile-v1.mjs';
import { createOfficialRavenSeekerPhaseEndRuntimeV1 } from './official-raven-seeker-phase-end-v1.mjs';
import { assertOfficialKhassarIndependentRangedRoutesV1, canOfficialKhassarDelegateUnitRecordV1, sharesKhassarFactionSideV1,
  createOfficialKhassarAbilityAdapterV1, createOfficialKhassarChargeV1, createOfficialKhassarEligibilityV1, createOfficialKhassarFightV1,
  createOfficialKhassarMovementV1, createOfficialKhassarShotV1 }
  from './official-khassar-de-templari-v1.mjs';
import { createOfficialAncestralWisdomRuntimeV1 } from './official-ancestral-wisdom-runtime-v1.mjs';
import { createOfficialFriendlySupplyLossReactionRuntimeV1 } from './official-friendly-supply-loss-reaction-v1.mjs';
import { OFFICIAL_OUR_MINDS_AS_ONE_ATOM_ID } from './official-our-minds-as-one-v1.mjs';
import { OFFICIAL_KHALAS_GIFT_ATOM_ID } from './official-khalas-gift-v1.mjs';
import { createOfficialExecutorsWillRuntimeV1 } from './official-executors-will-v1.mjs';
import { createOfficialSummonedCombatEligibilityPolicyV1 } from '../source-data/official-summoned-combat-eligibility-policy-v1.mjs';
import { projectOfficialUnitRestrictionsV1, OFFICIAL_UNIT_RESTRICTION_ATOM_IDS } from '../rule-atoms/official-unit-restrictions-v1.mjs';
import { hasOfficialPinpointEngagementPolicyV1, createOfficialPinpointEngagementPolicyV1,
  OFFICIAL_PINPOINT_ENGAGEMENT_POLICY_V1 } from '../rule-atoms/official-pinpoint-engagement-policy-v1.mjs';
import { createOfficialHoloRoundEndSourceV1 } from '../source-data/official-holo-round-end-source-v1.mjs';
import { createOfficialHoloRoundEndRuntimeV1 } from './official-holo-round-end-runtime-v1.mjs';
import { createOfficialDarkSwarmTokenLifecycleV1 } from './official-dark-swarm-token-lifecycle-v1.mjs';
import { createOfficialConsumePaymentSourceV1, queryOfficialConsumePaymentOptionsV1 }
  from './official-consume-payment-facts-v1.mjs';
import { createOfficialPlagueCoverageRuntimeV1 } from './official-plague-coverage-v1.mjs';
import { createOfficialPlagueRuntimeV1 } from './official-plague-runtime-v1.mjs';
import { OFFICIAL_OPTICAL_FLARE_DEFINITION_ID, OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID, OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID, verifyOfficialTargetedActiveAbilityPolicyV1 }
  from './official-targeted-active-ability-policy-v1.mjs';
import { createOfficialFeedbackCompletionV1, OFFICIAL_FEEDBACK_COMPLETION_ATOM_ID,
  OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1 } from './official-feedback-completion-v1.mjs';
import { hasOfficialNonLethalDamagePolicyV1, hasOfficialNonLethalStandardDamagePolicyV1 }
  from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { createOfficialConsumePaymentPolicyV1, createOfficialConsumePaymentAdapterV1 }
  from './official-consume-payment-runtime-v1.mjs';
import { OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID, OFFICIAL_DARK_SWARM_REACTION_ATOM_ID }
  from './official-dark-swarm-reaction-facts-v1.mjs';
import { createOfficialAbilitySourcePhasePolicyV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialStructureSourceV1 } from '../source-data/official-structure-source-v1.mjs';
import { createOfficialProtossSupportBundleV2, createOfficialArtanisCommanderBundleV2, createOfficialKhalaiActivationSourceBundleV2, createOfficialProtossUniqueFamilyAdapterV1,
  createOfficialProtossUniqueFamilyDefinitionBindingsV1, OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID }
  from './official-protoss-unique-family-adapter-v1.mjs';
import { createOfficialDomineeringPresenceSourceBundleV2, createOfficialZergUniqueFamilyAdapterV1,
  createOfficialLairPredationSourceBundleV1, OFFICIAL_LAIR_PREDATION_ID, OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID,
  createOfficialZergUniqueFamilyDefinitionBindingsV1 } from './official-zerg-unique-family-adapter-v1.mjs';
import { createOfficialStructureFamilyAdapterV1 } from './official-structure-family-adapter-v1.mjs';
import { createOfficialDecoySourceV1 } from '../source-data/official-decoy-source-v1.mjs';
import { createOfficialDecoyFamilyAdapterV1 } from './official-decoy-family-adapter-v1.mjs';
import { createOfficialMissionSupplyProfileV2 } from '../source-data/official-mission-supply-profile-v2.mjs';
import { createOfficialSummonDataBundleV2, OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID }
  from '../source-data/official-summon-data-bundle-v1.mjs';
import { createOfficialSummonedActionRuntimeV1 } from './official-summoned-action-runtime-v1.mjs';
import { createOfficialGeneratedUnitDataBundleV2, verifyOfficialGeneratedUnitDataBundleV2 }
  from '../source-data/official-generated-unit-data-bundle-v2.mjs';
import { createOfficialCleanupContinuationRuntimeV1 } from './official-cleanup-continuation-runtime-v1.mjs';
import { createOfficialRespawnMorphDataBundleV2, OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID,
  OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID, OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE }
  from '../source-data/official-respawn-morph-data-bundle-v1.mjs';
import { createOfficialRangedDeclarationReactionRuntimeV1 } from './official-ranged-declaration-reaction-runtime-v1.mjs';
import { createOfficialRangedLungeContinuationV1, OFFICIAL_RANGED_LUNGE_CONTINUATION_KIND }
  from './official-ranged-lunge-continuation-v1.mjs';
import { createOfficialTerranFreedomFightersBundleV2, createOfficialTerranMissionSupplyBundleV2, createOfficialTerranUniqueFamilyAdapterV1,
  createOfficialTerranUniqueFamilyDefinitionBindingsV1 } from './official-terran-unique-family-adapter-v1.mjs';
import { createOfficialChargeDeclarationReactionRuntimeV1 } from './official-charge-declaration-reaction-runtime-v1.mjs';
import { createOfficialAutoTurretOverwatchRuntimeV1 } from './official-auto-turret-overwatch-runtime-v1.mjs';
import { OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID } from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { createOfficialRangedCardRefreshRuntimeV1 } from './official-ranged-card-refresh-runtime-v1.mjs';
import { createOfficialPersonalTransportSourceV1, createOfficialPersonalTransportRuntimeV1 }
  from './official-personal-transport-runtime-v1.mjs';
import { hasOfficialRangedDeclarationPolicyV1 } from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { hasOfficialCoordinatedStrikeCurrentConsumerV1 } from '../rule-atoms/official-coordinated-strike-policy-v1.mjs';
import { hasOfficialFaqReactionPolicyV13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { hasOfficialStructureTargetingPolicyV13, OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 }
  from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import { OFFICIAL_FIRST_GAME_WEAPON_USE_ATOM_ID,
  hasOfficialCharacteristicConsumerPolicyV1, hasOfficialDetectionHiddenLossPolicyV1,
  consumeOfficialDetectionHiddenStatusesV1, consumeOfficialDamageWeaponHitDebuffsV1,
  OFFICIAL_DAMAGE_WEAPON_HIT_DEBUFF_ATOM_ID, OFFICIAL_RAVEN_CORVID_REACTOR_DEFINITION_ID,
  OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1, hasOfficialArmourThresholdPolicyV1 } from "../rule-atoms/official-armour-threshold-policy-v1.mjs";
import { hasOfficialTemplateBatchOrderPolicyV13, allowsOfficialTemplateAdaptiveBatchOrderV13 }
  from '../rule-atoms/official-template-batch-order-policy-v13.mjs';
import { OFFICIAL_INDOMITABLE_RANGED_POLICY_V1, hasOfficialIndomitableRangedPolicyV1 } from '../rule-atoms/official-indomitable-ranged-policy-v1.mjs';
import { hasOfficialModeBoundRangedTargetPolicyV1 } from '../rule-atoms/official-mode-bound-ranged-target-policy-v1.mjs';
import { createOfficialReactionFamilySourceBundleV2, createOfficialReactionFamilyAdapterV1,
  createOfficialReactionFamilyDefinitionBindingsV1, openOfficialOpticalFlareRestorationWindowV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';
import { createOfficialBattlefieldAssetFamilySourceBundleV2, createOfficialBattlefieldModifierComponentAdapterV1,
  createOfficialCreepCardComponentAdapterV2 } from "./official-battlefield-asset-family-adapter-v1.mjs";
import { hasOfficialArmourRollOrdinalPolicyV1, OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1 } from "../rule-atoms/official-armour-roll-ordinal-v1.mjs";
import { createOfficialBlastTemplateAttackRuntimeV1 } from './official-blast-template-attack-runtime-v1.mjs';
import { createOfficialRangedPrecisionChoiceRuntimeV1 } from './official-ranged-precision-choice-runtime-v1.mjs';
import { createOfficialPointDefenseChoiceRuntimeV1 } from './official-point-defense-choice-runtime-v1.mjs';
import { createOfficialAttackTargetReactionRuntimeV1 } from './official-attack-target-reaction-runtime-v1.mjs';
import { createOfficialRangedFamilySourceBundleV2, createOfficialRangedModifierComponentAdapterV1 }
  from './official-ranged-family-adapter-v1.mjs';
import { createOfficialZagaraPsionicLinkSourceV1, createOfficialZagaraPsionicLinkAdapterV1,
  createOfficialStalkerFurySourceV1, createOfficialStalkerFuryAdapterV1,
  createOfficialQueenPsionicLinkSourceV1, createOfficialQueenPsionicLinkAdapterV1 }
  from './official-match-lifecycle-family-adapter-v1.mjs';
import { createOfficialRosterWeaponComponentAdapterV1 } from './official-roster-weapon-component-adapter-v1.mjs';
import { createOfficialBlastTemplateCoverageRuntimeV1 } from './official-blast-template-coverage-runtime-v1.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hasOfficialMeleeSidearmPolicyV1, readOfficialMeleeSidearmSequenceV1 }
  from './official-melee-sidearm-sequence-v1.mjs';
import { createOfficialPoisonousEssencePhaseEndRuntimeV1 } from './official-poisonous-essence-phase-end-v1.mjs';
import { hasOfficialActionStatusLifecyclePolicyV1, OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V1 }
  from '../rule-atoms/official-action-status-lifecycle-policy-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { createOfficialSelectedRosterAbilityCoverageV2 } from './official-selected-roster-ability-coverage-v2.mjs';
import { getOfficialReleaseBattlefieldAssetComponentProfileV2 } from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialForceWallTraversalPolicyV1, OFFICIAL_FORCE_WALL_PLACEMENT_ATOM_ID,
  OFFICIAL_FORCE_WALL_TRAVERSAL_ATOM_ID, OFFICIAL_PSI_LIGHTNING_ATOM_ID, OFFICIAL_TELEKINETIC_PUSH_ATOM_ID } from './official-force-wall-v1.mjs';
import { createOfficialAbilityEffectRuntimeV1, createOfficialSelectedRosterCommanderComponentAdapterV1,
  createOfficialSelectedRosterAbilityAdapterV1, createOfficialSelectedRosterAbilityDefinitionBindingsV1 }
  from './official-ability-effect-runtime-v1.mjs';
import { createOfficialCharacteristicStatusFamilyAdapterV1,
  createOfficialCharacteristicStatusFamilyDefinitionBindingsV1,
  OFFICIAL_RAVEN_INTERNAL_TECH_MODULE_DEFINITION_ID,
  createOfficialCharacteristicStatusFamilySourceBundleV2 } from './official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialSelectedRosterSpatialActionRuntimeV1 } from './official-selected-roster-spatial-action-runtime-v1.mjs';
import { listOfficialUnsupportedActionRoutesV1 } from './official-standard-action-route-catalogue-v1.mjs';
import { createOfficialSelectedRosterRangedActionRuntimeV1, resumeOfficialSelectedRosterRangedDamageReactionV1 }
  from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { openOfficialChargeRollReactionV1, finishOfficialChargeRollReactionV1, createOfficialSelectedRosterMeleeActionRuntimeV1,
  OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA } from './official-selected-roster-melee-action-runtime-v1.mjs';
import { createOfficialSabotageDronePhaseEndRuntimeV1 } from './official-sabotage-drone-phase-end-v1.mjs';
import {PHOTON_OVERCHARGE_ID, createPhotonOverchargeEntryV1} from './official-photon-overcharge-entry-v1.mjs';
import { createOfficialAutomaticHitsRuntimeV1 } from './official-automatic-hits-runtime-v1.mjs';
import { createOfficialMeleePoolChoiceRuntimeV1, createOfficialAutomaticHitsPoolChoiceRuntimeV1 } from './official-melee-pool-choice-runtime-v1.mjs';
import { createOfficialMeleeFamilySourceBundleV2, createOfficialMeleeModifierComponentAdapterV1 }
  from './official-melee-family-adapter-v1.mjs';
import { createOfficialSelectedRosterAbilityRuntimeV1, createOfficialSelectedRosterAbilitySourceBundleV1,
  TASSADAR_COMMANDER_DEFINITION_ID, ZAGARA_COMMANDER_DEFINITION_ID } from './official-selected-roster-ability-runtime-v1.mjs';
import { createOfficialUnitLifecycleFamilySourceBundleV2, createOfficialUnitLifecycleFamilyAdapterV1,
  createOfficialUnitLifecycleFamilyDefinitionBindingsV1, OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID }
  from './official-unit-lifecycle-family-adapter-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from './official-release-roster-state-v2.mjs';
import { createOfficialShieldedLifecyclePolicyV1, hasOfficialShieldedLifecyclePolicyV1 }
  from '../source-data/official-shielded-lifecycle-policy-v1.mjs';
import { createOfficialRelocationFamilySourceBundleV2, createOfficialRelocationFamilyAdapterV1,
  createOfficialRelocationFamilyDefinitionBindingsV1 } from './official-relocation-family-adapter-v1.mjs';
import { createOfficialPostPlaceReactionRuntimeV1 } from './official-post-place-reaction-runtime-v1.mjs';
import { createOfficialHiddenLossReactionRuntimeV1 } from './official-hidden-loss-reaction-runtime-v1.mjs';
import { createOfficialCorrosiveBileSourceV1, createOfficialCorrosiveBileRuntimeV1 } from './official-corrosive-bile-runtime-v1.mjs';
import { createOfficialBombardSourceV1, createOfficialBombardRuntimeV1 } from './official-bombard-runtime-v1.mjs';
import { createOfficialDarkSwarmPlacementSourceV1, createOfficialDarkSwarmPlacementRuntimeV1 }
  from './official-dark-swarm-placement-v1.mjs';
import { hasOfficialBombardTargetingPolicyV1, OFFICIAL_BOMBARD_TARGETING_ATOM_ID } from './official-bombard-targeting-v1.mjs';
import { createOfficialBombardReplacementRuntimeV1 } from './official-bombard-replacement-v1.mjs';
import { createOfficialCorrosiveBileResolutionRuntimeV1 } from './official-corrosive-bile-resolution-runtime-v1.mjs';
import { createOfficialCorrosiveBileUpgradeSourceV1 } from './official-corrosive-bile-upgrades-v1.mjs';
import { createOfficialPsionicTransferSourceV1, createOfficialTokenLeadingTransferSourceV2,
  createOfficialPsionicTransferRuntimeV1 } from './official-psionic-transfer-runtime-v1.mjs';
import { getOfficialDisplacementMovementGeometryV1 } from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { createOfficialPsionicTransferRoundEndRuntimeV1 } from './official-psionic-transfer-round-end-v1.mjs';
import { createOfficialPsionicDisplacementQueryV1 } from './official-psionic-displacement-query-v1.mjs';
import { createOfficialPsionicDisplacementRuntimeV1 } from './official-psionic-displacement-runtime-v1.mjs';
import { createOfficialBattlefieldDisplacementSourceV1, createOfficialBattlefieldDisplacementProducerV1 }
  from './official-battlefield-displacement-source-v1.mjs';
import { consumeOfficialBattlefieldAssetMovementLifecycleV1 } from './official-battlefield-asset-family-adapter-v1.mjs';
import { verifyOfficialBattlefieldTokenMarkerRegistryV1 } from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13, OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1,
  hasOfficialLargeTerrainRemovalPolicyV1, inspectOfficialLargeMovementSourceV1 } from '../rule-atoms/official-movement-clearance-contract-v13.mjs';
import { hasOfficialImpactAllocationPolicyV13, OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 }
  from '../rule-atoms/official-impact-allocation-policy-v13.mjs';

const runtimeId = 'starcraft-tmg-characteristic-status-component-v2';
const runtimeVersion = '2.0.1';
const atomId = 'rule-atom:characteristic-status-family-ability-dispatch-v2';
const seal = (body, field) => Object.freeze({ ...body, [field]: hash(body) });

// Native bridge for a source-reviewed release component. The same family and
// IR router are used by complete match composition. Full match admission is
// deliberately represented by a separate capability coverage release.
export function createOfficialCharacteristicStatusComponentRuntimeV2({ context, definitionIds, spatialState, sourceDefinitionIds,
  exclusiveRangedContinuation = false, includeRanged = false, includeTemplateAttacks = false, includePrecisionChoices = false,
  includePointDefenseChoices = false, includeArmourChoices = false, includeMelee = false, includeHits = false,
  includeArmourOrdinals = false, includeArmourReactions = false, includeTargetReactions = false,
  includeTemplateBatchOrder = false, weaponDefinitionIds: requestedWeaponDefinitionIds = [], includeZagaraCommander = false,
  includeTransfusionTemplateOwner = true, includeTransfusionMeleeOwner = true, includeKhassarEligibility = false,
  includeKhassarMovement = false, includeKhassarRun = false, includeKhassarCharge = false, includeKhassarShot = false,
  includeKhassarFight = false, includeKhassarTargetReactions = false, includeKhassarArmourReactions = false,
  includeKhassarDamageReactions = false, includeKhassarChargeDeclaration = false, includeKhassarLegalDomainQuery = false,
  includeKhassarRegisteredExecution = false, includeReleaseKhassar = false, includeKhassarEndActivationOverwatch = false, includeKhassarSupplyLoss = false,
  includePsionicStormSourceRules = false, selectedStormDefinitionIds, includeSelectedRosterAbilityCoverage = false,
  includePsionicStormGeometryEvidence = false, includePsionicStormPhaseEnd = false,
  includePsionicStormPhaseEndDefence = false, includePsionicStormAssaultDamage = false, includePsionicStormAssaultOrder = false, includeSharedAssaultEffectOrder = false, includeAdditionalAssaultEffectOrder = false, includePsionicStormMovementPass = false, includePsionicStormEquivalentNameOverlap = false, includePsionicStormNamedOverlapChoices = false, includePsionicStormCast = false, includePsionicStormTokenCleanup = false, includePsionicStormAssaultSameName = false, includeRavenSeekerMissileRules = false,
  includeRavenSeekerPaidImpact = false, includeRavenSeekerPhaseEnd = false, includeReleaseRosterActions = false, includeStandaloneFreedomFighters = false,
   includeReleaseOpticalFlareRestoration = false, includeReleaseSentryGuardianShield = false, includeReleasePhaseControl = false, includeReleaseZergTargetReactions = false, includeReleaseBileAssaultOrder = false, includeReleaseMoundAssaultOrder = false, includeReleaseReactiveCreep = false, includeReleaseMalignantCreep = false, includeReleaseInheritedHitsReactions = false, includeMixedRosterReactions = false, includeIndependentSupportReactions = false, includeBilePhysicalPlacement = false, includeReleaseBeaconLifecycle = false, includeReleaseQueenPsionicLink = false,
   includeReleaseQueenDomineering = false, includeReleaseLairPredation = false, includeReleaseOverseerChargeReaction = false, includeBeforeRangedEvadeReaction = false,
     includeBeforeMeleeEvadeReaction = false, includeBeforeHitsEvadeReaction = false,
     includeAutomaticHitsDefenceContinuation = false, includeBeforeTemplateEvadeReaction = false,
    includeIndependentRangedLungeOwner = false, includeLungeDirectContinuation = false, includeLungeDeferredReaction = false,
    includeLungeOverwatchContinuation = false, includeLungeCertifiedFormation = false,
    includeLungeCertifiedForwardDetour = false, includeLungeCertifiedMultiModelDetour = false,
    includeLungeCertifiedLeaderWitness = false, includeLungeJointObstacleProof = false, includeLungeAxisLeaderBound = false } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  if (!context.resources?.abilityIdentities) throw Error('CHARACTERISTIC_COMPONENT_ABILITY_IDENTITIES_REQUIRED');
  if (includeTemplateBatchOrder !== hasOfficialTemplateBatchOrderPolicyV13(spatialState)
    || includeTemplateBatchOrder && !includeTemplateAttacks) throw Error('CHARACTERISTIC_TEMPLATE_BATCH_ORDER_CONSUMER_REQUIRED');
  if (spatialState?.officialGeneratedUnitDataBundle) verifyOfficialGeneratedUnitDataBundleV2(spatialState.officialGeneratedUnitDataBundle);
  const generatedUnits = spatialState?.officialGeneratedUnitDataBundle
    ? createOfficialGeneratedUnitDataBundleV2({ context,
      recordKeys: spatialState.officialGeneratedUnitDataBundle.profiles.map(row => row.recordKey) }) : null;
  if (generatedUnits && !isDeepStrictEqual(generatedUnits, spatialState.officialGeneratedUnitDataBundle)) {
    throw Error('CHARACTERISTIC_GENERATED_UNIT_SOURCE_MISMATCH');
  }
  const sourcePhasePolicy = spatialState?.officialAbilitySourcePhasePolicy !== undefined
    ? createOfficialAbilitySourcePhasePolicyV1({ dataset: context.dataset,
      includeInlineCardPhases: spatialState.officialAbilitySourcePhasePolicy.version === '1.1.0' }) : null;
  if (sourcePhasePolicy && !isDeepStrictEqual(sourcePhasePolicy, spatialState.officialAbilitySourcePhasePolicy)) {
    throw Error('CHARACTERISTIC_ABILITY_PHASE_POLICY_MISMATCH');
  }
  const args = { dataset: context.dataset, identityCatalogue: context.resources.abilityIdentities,
    ...(sourceDefinitionIds === undefined ? {} : { sourceDefinitionIds }),
    ...(sourcePhasePolicy ? { sourcePhasePolicy } : {}) };
  const actionStatusLifecycle = spatialState ? hasOfficialActionStatusLifecyclePolicyV1(spatialState) : false;
  const source = createOfficialAbilityEffectIrCatalogueV1(args);
  if (includeRavenSeekerPaidImpact && !includeRavenSeekerMissileRules) throw Error('RAVEN_SEEKER_MISSILE_SOURCE_RULES_REQUIRED');
  const ravenSeekerRules = includeRavenSeekerMissileRules
    ? createOfficialRavenSeekerMissileRulesV1({ context, catalogue: source, includePaidImpact: includeRavenSeekerPaidImpact }) : null;
  const includeKhassarCombatExecution = includeKhassarShot || includeKhassarFight;
  const includeKhassarSpatialExecution = includeKhassarMovement || includeKhassarRun || includeKhassarCharge || includeKhassarCombatExecution;
  if ((includeKhassarEligibility || includeKhassarSpatialExecution) && (!spatialState || !includeRanged || !includeMelee)) {
    throw Error('KHASSAR_NATIVE_ACTION_CONSUMERS_REQUIRED');
  }
  if ((includeKhassarLegalDomainQuery || includeKhassarRegisteredExecution) && !includeKhassarFight) {
    throw Error('KHASSAR_LEGAL_DOMAIN_EXECUTION_REQUIRED');
  }
  const khassarEligibility = includeKhassarEligibility || includeKhassarSpatialExecution
    ? createOfficialKhassarEligibilityV1({ catalogue: source, enumerate,
      includeLegalDomains: includeKhassarLegalDomainQuery || includeKhassarRegisteredExecution }) : null;
  const rosterRangedWeapons = spatialState?.officialRosterRangedWeaponSourceBundle;
  if (rosterRangedWeapons && (!includeRanged || !isDeepStrictEqual(rosterRangedWeapons,
    createOfficialRangedFamilySourceBundleV2({ catalogue: source, definitionIds: rosterRangedWeapons.definitionIds,
      attackProfileCatalogue: spatialState.officialAttackProfileCatalogue }))
    || rosterRangedWeapons.routes.some(route => route.effectKind !== 'weapon'))) {
    throw Error('CHARACTERISTIC_ROSTER_RANGED_WEAPON_SOURCE_MISMATCH');
  }
  const weaponDefinitionIds = rosterRangedWeapons
    ? [...new Set([...requestedWeaponDefinitionIds, ...rosterRangedWeapons.definitionIds])].sort()
    : requestedWeaponDefinitionIds;
  const tassadarCommanderEnabled = spatialState?.officialTassadarCommanderEnabled === true;
  const commanderIds = [
    ...(includeZagaraCommander ? [ZAGARA_COMMANDER_DEFINITION_ID] : []),
    ...(tassadarCommanderEnabled ? [TASSADAR_COMMANDER_DEFINITION_ID] : []),
  ];
  const commanderDefinitions = commanderIds.map(id => source.definitions.find(row => row.definitionId === id));
  if (commanderIds.length && (commanderDefinitions.some(row => !row)
    || (includeZagaraCommander && spatialState?.officialZagaraCommanderEnabled !== true)
    || !isDeepStrictEqual(createOfficialSelectedRosterAbilitySourceBundleV1({ dataset: context.dataset, state: spatialState }),
      spatialState.officialSelectedRosterAbilitySourceBundle))) {
    throw Error(tassadarCommanderEnabled ? 'TASSADAR_COMMANDER_RUNTIME_SOURCE_MISMATCH' : 'ZAGARA_COMMANDER_RUNTIME_SOURCE_MISMATCH');
  }
  const [commanderDefinition] = commanderDefinitions;
  const commanderAdapter = commanderDefinitions.length ? createOfficialSelectedRosterCommanderComponentAdapterV1(
    spatialState.officialSelectedRosterAbilitySourceBundle, commanderDefinitions.map(row => row.sourceFeatureHash)) : null;
  const zagaraPsionicLink = spatialState?.officialZagaraPsionicLinkSource
    ? createOfficialZagaraPsionicLinkSourceV1(source) : null;
  if (zagaraPsionicLink && !isDeepStrictEqual(zagaraPsionicLink, spatialState.officialZagaraPsionicLinkSource)) {
    throw Error('ZAGARA_PSIONIC_LINK_SOURCE_MISMATCH');
  }
  const zagaraPsionicLinkAdapter = zagaraPsionicLink ? createOfficialZagaraPsionicLinkAdapterV1(zagaraPsionicLink) : null;
  const queenPsionicLink = includeReleaseQueenPsionicLink && spatialState?.officialQueenPsionicLinkSource
    ? createOfficialQueenPsionicLinkSourceV1(source) : null;
  if (queenPsionicLink && !isDeepStrictEqual(queenPsionicLink, spatialState.officialQueenPsionicLinkSource)) {
    throw Error('QUEEN_PSIONIC_LINK_SOURCE_MISMATCH');
  }
  const fury = includeReleaseRosterActions && spatialState?.officialStalkerFurySource ? createOfficialStalkerFurySourceV1(source) : null;
  if (fury && !isDeepStrictEqual(fury,spatialState.officialStalkerFurySource)) throw Error('STALKER_FURY_SOURCE_MISMATCH');
  const furyAdapter = fury ? createOfficialStalkerFuryAdapterV1(fury) : null;
  const queenPsionicLinkAdapter = queenPsionicLink ? createOfficialQueenPsionicLinkAdapterV1(queenPsionicLink) : null;
  const installedPredation = includeReleaseLairPredation && spatialState?.officialZergUniqueFamilySourceBundle?.definitionIds?.includes(OFFICIAL_LAIR_PREDATION_ID)
    ? spatialState.officialZergUniqueFamilySourceBundle : null;
  const installedQueen = includeReleaseQueenDomineering && spatialState?.officialQueenDomineeringPresenceSourceBundle;
  if (installedPredation && !includeMelee) throw Error('LAIR_PREDATION_MELEE_CONSUMER_REQUIRED');
  const installedZergUnique = installedPredation || installedQueen;
  const zergUniqueBundle = installedPredation
    ? createOfficialLairPredationSourceBundleV1(source, { includeQueen: installedPredation.definitionIds.includes(OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID) })
    : installedQueen ? createOfficialDomineeringPresenceSourceBundleV2(source) : null;
  if (zergUniqueBundle && !isDeepStrictEqual(zergUniqueBundle, installedZergUnique)) {
    throw Error(installedPredation ? 'LAIR_PREDATION_SOURCE_MISMATCH' : 'CHARACTERISTIC_QUEEN_DOMINEERING_SOURCE_MISMATCH');
  }
  const zergUniqueAdapter = zergUniqueBundle ? createOfficialZergUniqueFamilyAdapterV1(zergUniqueBundle) : null;
  const zergUniqueRuntimeKind = installedPredation ? 'zerg_unique' : 'queen_domineering_presence';
  const consumePaymentSource = spatialState?.officialConsumePaymentSourceBundle
    ? createOfficialConsumePaymentSourceV1({ catalogue: source }) : null;
  if (consumePaymentSource && !isDeepStrictEqual(consumePaymentSource, spatialState.officialConsumePaymentSourceBundle)) {
    throw Error('CHARACTERISTIC_CONSUME_PAYMENT_SOURCE_MISMATCH');
  }
  const consumePayment = spatialState?.officialConsumePaymentPolicy ? createOfficialConsumePaymentAdapterV1(consumePaymentSource) : null;
  if (consumePayment && !isDeepStrictEqual(createOfficialConsumePaymentPolicyV1({ context, source: consumePaymentSource,
    consumerScope: spatialState.officialConsumePaymentPolicy.consumerScope,
    templateSurvivorsOnly: spatialState.officialConsumePaymentPolicy.templateAffectedModelsPolicy === 'surviving_declared_models',
    combatLifecycleCoexistence: spatialState.officialConsumePaymentPolicy.combatLifecycleCoexistence === true,
    activeAbilityPayment: spatialState.officialConsumePaymentPolicy.activeAbilityPayment === true }),
    spatialState.officialConsumePaymentPolicy)) throw Error('CHARACTERISTIC_CONSUME_PAYMENT_POLICY_MISMATCH');
  const consumeTemplatePayment = consumePayment
    && spatialState.officialConsumePaymentPolicy.consumerScope === 'numeric_and_template_attack_target_reaction';
  const survivingTemplateModels = consumeTemplatePayment
    && spatialState.officialConsumePaymentPolicy.templateAffectedModelsPolicy === 'surviving_declared_models';
  const consumeCombatLifecycle = consumePayment && spatialState.officialConsumePaymentPolicy.combatLifecycleCoexistence === true;
  const plagueCoverage = spatialState?.officialPlagueCoverageSourceBundle
    ? createOfficialPlagueCoverageRuntimeV1({ context, catalogue: source, state: spatialState }) : null;
  const plague = spatialState?.officialPlagueResolutionPolicy
    ? createOfficialPlagueRuntimeV1({ context, coverage: plagueCoverage, state: spatialState }) : null;
  const nonLethalStandardDamage = hasOfficialNonLethalStandardDamagePolicyV1(spatialState);
  if (nonLethalStandardDamage && !hasOfficialNonLethalDamagePolicyV1(spatialState)) {
    throw Error('CHARACTERISTIC_NON_LETHAL_SOURCE_REQUIRED');
  }
  if (spatialState?.officialHoloRoundEndSourceBundle && spatialState?.officialUnitRoundEndSourceBundle) {
    throw Error('CHARACTERISTIC_ROUND_END_SOURCE_AMBIGUOUS');
  }
  const selectedRoundEndSource = spatialState?.officialUnitRoundEndSourceBundle || spatialState?.officialHoloRoundEndSourceBundle;
  const holoRoundEndSource = selectedRoundEndSource ? createOfficialHoloRoundEndSourceV1({
    context, catalogue: source, definitionIds: selectedRoundEndSource.definitionIds }) : null;
  if (holoRoundEndSource && (!isDeepStrictEqual(holoRoundEndSource, selectedRoundEndSource)
    || Boolean(spatialState.officialUnitRoundEndSourceBundle) !== (holoRoundEndSource.version === '1.1.0'))) {
    throw Error('CHARACTERISTIC_HOLO_ROUND_END_SOURCE_MISMATCH');
  }
  const holoRoundEnd = holoRoundEndSource ? createOfficialHoloRoundEndRuntimeV1({ source: holoRoundEndSource,
    scheduledByMatch: spatialState.officialPsionicTransferRoundEndPolicy?.sharedRoundEnd === true,
    refreshState: state => refreshOfficialReleaseRosterDerivedStateV2({ context, state }) }) : null;
  const decoySource = spatialState?.officialDecoySourceBundle ? createOfficialDecoySourceV1({ catalogue: source }) : null;
  if (decoySource && !isDeepStrictEqual(decoySource, spatialState.officialDecoySourceBundle)) {
    throw Error('CHARACTERISTIC_DECOY_SOURCE_MISMATCH');
  }
  const decoyAdapter = decoySource ? createOfficialDecoyFamilyAdapterV1(decoySource) : null;
  const structureSource = spatialState?.officialStructureSourceBundle
    ? createOfficialStructureSourceV1({ catalogue: source,
      definitionIds: spatialState.officialStructureSourceBundle.definitionIds }) : null;
  if (structureSource && !isDeepStrictEqual(structureSource, spatialState.officialStructureSourceBundle)) {
    throw Error('CHARACTERISTIC_STRUCTURE_SOURCE_MISMATCH');
  }
  if (structureSource && structureSource.definitions.some(definition => !generatedUnits?.profiles
    .some(profile => profile.recordKey === definition.recordKey && profile.isStructure))) {
    throw Error('CHARACTERISTIC_STRUCTURE_GENERATED_SOURCE_REQUIRED');
  }
  const structureAdapter = structureSource ? createOfficialStructureFamilyAdapterV1(structureSource) : null;
  const summonedCombatEligibility = spatialState?.officialSummonedCombatEligibilityPolicy
    ? createOfficialSummonedCombatEligibilityPolicyV1({ context }) : null;
  if (summonedCombatEligibility && (!includeMelee || !spatialState.officialSummonDataBundle
    || !isDeepStrictEqual(summonedCombatEligibility, spatialState.officialSummonedCombatEligibilityPolicy))) {
    throw Error('CHARACTERISTIC_SUMMONED_COMBAT_ELIGIBILITY_MISMATCH');
  }
  const personalSource = spatialState?.officialPersonalTransportSourceBundle
    ? createOfficialPersonalTransportSourceV1({ context }) : null;
  if (personalSource && !isDeepStrictEqual(personalSource, spatialState.officialPersonalTransportSourceBundle)) {
    throw Error('CHARACTERISTIC_PERSONAL_TRANSPORT_SOURCE_MISMATCH');
  }
  const personalTransport = personalSource ? createOfficialPersonalTransportRuntimeV1({ context, source: personalSource,
    spatialRuntime: () => spatial,
    refreshState: next => refreshOfficialReleaseRosterDerivedStateV2({ context, state: next }) }) : null;
  const transferSource = spatialState?.officialPsionicTransferSourceBundle;
  const transferRoutes = transferSource?.schema === 'starcraft_tmg_token_leading_transfer_source_v2' ? transferSource.routes : null;
  const deepTunnel = transferRoutes?.some(row => row.tokenKind === 'ravager_burrow');
  const adeptShade = transferRoutes?.some(row => row.recordKey === 'army_units:adept');
  const psionicSource = transferSource
    ? transferRoutes ? createOfficialTokenLeadingTransferSourceV2({ catalogue: source,
      includeAdept: adeptShade, includeDeepTunnel: deepTunnel,
      includePsionicTransfer: transferRoutes.some(row => row.recordKey === 'army_units:nerazim_watchers__adept_') })
      : createOfficialPsionicTransferSourceV1({ catalogue: source }) : null;
  if (psionicSource && !isDeepStrictEqual(psionicSource, spatialState.officialPsionicTransferSourceBundle)) {
    throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_SOURCE_MISMATCH');
  }
  const psionicSourceDestruction = Boolean(spatialState?.officialPsionicSourceLifecyclePolicy);
  if (psionicSourceDestruction && !psionicSource) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_PRODUCER_REQUIRED');
  if (psionicSource) verifyOfficialBattlefieldTokenMarkerRegistryV1(spatialState.officialBattlefieldTokenMarkerRegistry,
    spatialState.officialBattlefieldTokenMarkerRulesDataBundle, spatialState.officialDeploymentGeometryBinding);
  const psionicRoundEndEnabled = Boolean(spatialState?.officialPsionicTransferRoundEndPolicy);
  const psionicPlaceReactions = spatialState?.officialPsionicTransferRoundEndPolicy?.postPlaceReactionsEnabled === true;
  const outsidePlaceReactions = spatialState?.officialPsionicTransferRoundEndPolicy?.outsideActivationReactions === true;
  const closeRanksReactions = (spatialState?.officialBattlefieldDisplacementPolicy
    || spatialState?.officialPsionicDisplacementPolicy)?.closeRanksReactionsReady === true;
  if (spatialState?.officialCharacteristicConsumerPolicy?.cleanupHiddenLossBeforeRefresh
    && !hasOfficialFaqReactionPolicyV13(spatialState)) throw Error('CHARACTERISTIC_CLEANUP_HIDDEN_FAQ_POLICY_REQUIRED');
  if (outsidePlaceReactions && !hasOfficialFaqReactionPolicyV13(spatialState)) throw Error('CHARACTERISTIC_OUTSIDE_PLACE_FAQ_POLICY_REQUIRED');
  if (psionicRoundEndEnabled && !psionicSource) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_PRODUCER_REQUIRED');
  const psionic = psionicSource ? createOfficialPsionicTransferRuntimeV1({ context, source: psionicSource, state: spatialState,
    roundEndConsumerReady: psionicRoundEndEnabled, displacementConsumerReady: Boolean(spatialState?.officialBattlefieldDisplacementPolicy
      || spatialState?.officialPsionicDisplacementPolicy),
    closeRanksConsumerReady: (spatialState?.officialBattlefieldDisplacementPolicy
      || spatialState?.officialPsionicDisplacementPolicy)?.closeRanksConsumerReady === true }) : null;
  const psionicRoundEnd = psionicRoundEndEnabled ? createOfficialPsionicTransferRoundEndRuntimeV1({
    context, source: psionicSource, producer: psionic, state: spatialState,
    readPostPlaceParent: current => postPlaceReactions?.pending(current),
    readHiddenLossParent: current => hiddenLossReactions?.roundEndParent(current) }) : null;
  const bileSource = spatialState?.officialCorrosiveBileSourceBundle
    ? createOfficialCorrosiveBileSourceV1({ catalogue: source }) : null;
  const bombardSource = spatialState?.officialBombardSourceBundle ? createOfficialBombardSourceV1({ catalogue: source }) : null;
  if (bombardSource) verifyOfficialBattlefieldTokenMarkerRegistryV1(spatialState.officialBattlefieldTokenMarkerRegistry,
    spatialState.officialBattlefieldTokenMarkerRulesDataBundle, spatialState.officialDeploymentGeometryBinding);
  const bombard = bombardSource ? createOfficialBombardRuntimeV1({ context, source: bombardSource, state: spatialState }) : null;
  const darkSwarmSource = spatialState?.officialDarkSwarmPlacementSourceBundle
    ? createOfficialDarkSwarmPlacementSourceV1({ catalogue: source }) : null;
  if (darkSwarmSource) verifyOfficialBattlefieldTokenMarkerRegistryV1(spatialState.officialBattlefieldTokenMarkerRegistry,
    spatialState.officialBattlefieldTokenMarkerRulesDataBundle, spatialState.officialDeploymentGeometryBinding);
  const darkSwarmPlacement = darkSwarmSource ? createOfficialDarkSwarmPlacementRuntimeV1({
    context, source: darkSwarmSource, state: spatialState }) : null;
  const darkSwarmLifecycle = spatialState?.officialDarkSwarmTokenLifecyclePolicy
    ? createOfficialDarkSwarmTokenLifecycleV1({ context, source: darkSwarmSource, state: spatialState }) : null;
  const bombardTargeting = spatialState ? hasOfficialBombardTargetingPolicyV1(spatialState) : false;
  if (bileSource && !isDeepStrictEqual(bileSource, spatialState.officialCorrosiveBileSourceBundle)) {
    throw Error('CHARACTERISTIC_CORROSIVE_BILE_SOURCE_MISMATCH');
  }
  const bileUpgrades = spatialState?.officialCorrosiveBileUpgradeSourceBundle
    ? createOfficialCorrosiveBileUpgradeSourceV1({ context, catalogue: source,
      definitionIds: spatialState.officialCorrosiveBileUpgradeSourceBundle.routes.map(route => route.definitionId) }) : null;
  if (bileUpgrades && (!bileSource || !spatialState.officialCorrosiveBileDamagePolicy
    || !isDeepStrictEqual(bileUpgrades, spatialState.officialCorrosiveBileUpgradeSourceBundle))) {
    throw Error('CHARACTERISTIC_CORROSIVE_BILE_UPGRADE_SOURCE_MISMATCH');
  }
  if (bileSource) verifyOfficialBattlefieldTokenMarkerRegistryV1(spatialState.officialBattlefieldTokenMarkerRegistry,
    spatialState.officialBattlefieldTokenMarkerRulesDataBundle, spatialState.officialDeploymentGeometryBinding);
  const bileDamage = Boolean(spatialState?.officialCorrosiveBileDamagePolicy);
  if (bileDamage && (!bileSource || !includeHits)) throw Error('CHARACTERISTIC_CORROSIVE_BILE_HITS_CONSUMER_REQUIRED');
  const bile = bileSource ? createOfficialCorrosiveBileRuntimeV1({ context, source: bileSource, state: spatialState,
    usePhysicalPlacement: includeBilePhysicalPlacement,
    ...(bileDamage ? { damageConsumerReady: true } : {}) }) : null;
  const bileResolution = bileDamage ? createOfficialCorrosiveBileResolutionRuntimeV1({ context,
    source: bileSource, producer: bile, state: spatialState, includeSharedOrder: includeSharedAssaultEffectOrder || includeReleaseBileAssaultOrder }) : null;
  const relocationBundle = spatialState?.officialRelocationFamilySourceBundle?.schema
    === 'starcraft_tmg_official_relocation_family_source_bundle_v2'
    ? createOfficialRelocationFamilySourceBundleV2({ catalogue: source,
      definitionIds: spatialState.officialRelocationFamilySourceBundle.definitionIds }) : null;
  if (relocationBundle && !isDeepStrictEqual(relocationBundle, spatialState.officialRelocationFamilySourceBundle)) {
    throw Error('CHARACTERISTIC_RELOCATION_SOURCE_MISMATCH');
  }
  const relocationAdapter = relocationBundle ? createOfficialRelocationFamilyAdapterV1(relocationBundle) : null;
  const reservePlaceSource = relocationBundle?.routes.some(route => route.effectKind === 'entry_edge_place') === true;
  const vilelingBurrow = relocationBundle?.definitionIds.includes('unit:vileling__zergling_/burrow-ambush-movement-phase@1');
  const defilerBurrow = relocationBundle?.definitionIds.includes('unit:defiler/burrow-ambush-movement-phase@1');
  const shieldedLifecycle = hasOfficialShieldedLifecyclePolicyV1(spatialState || {});
  if (shieldedLifecycle && !isDeepStrictEqual(spatialState.officialShieldedLifecyclePolicy,
    createOfficialShieldedLifecyclePolicyV1({ context }))) {
    throw Error('CHARACTERISTIC_SHIELDED_LIFECYCLE_SOURCE_MISMATCH');
  }
  const unitLifecycleBundle = spatialState?.officialUnitLifecycleFamilySourceBundle?.schema
    === 'starcraft_tmg_official_unit_lifecycle_family_source_bundle_v2'
    ? createOfficialUnitLifecycleFamilySourceBundleV2({ catalogue: source,
      definitionIds: spatialState.officialUnitLifecycleFamilySourceBundle.definitionIds }) : null;
  if (unitLifecycleBundle && !isDeepStrictEqual(unitLifecycleBundle, spatialState.officialUnitLifecycleFamilySourceBundle)) {
    throw Error('CHARACTERISTIC_UNIT_LIFECYCLE_SOURCE_MISMATCH');
  }
  const cocoonRespawn = unitLifecycleBundle?.compilerScope === 'current_release_cocoon_spawn_larva_subset';
  const cocoonMorph = unitLifecycleBundle?.definitionIds.includes('card:cocoon/ravager-morph-any@1');
  const respawnDefinitionIds = (unitLifecycleBundle?.definitionIds ?? []).filter(id =>
    id === OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID || id === OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID);
  const vilelingRespawn = respawnDefinitionIds.includes(OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID);
  const swarmlingRespawn = respawnDefinitionIds.includes(OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID);
  const combinedRespawn = respawnDefinitionIds.length > 1
    || spatialState?.officialRespawnMorphDataBundle?.compilerScope === OFFICIAL_COMBINED_UNIT_RECONSTITUTION_SCOPE;
  const respawnOptions = combinedRespawn || (cocoonMorph && respawnDefinitionIds.length) ? { respawnDefinitionIds }
    : respawnDefinitionIds.length ? { respawnDefinitionId: respawnDefinitionIds[0] } : {};
  const holoSummonRoutes = (unitLifecycleBundle?.routes || []).filter(route => route.effectKind === 'summon_unit'
    && route.createdUnitRecordKey === 'army_units:holo_decoy');
  const holoSummon = holoSummonRoutes.length > 0;
  const summonIds = (unitLifecycleBundle?.routes || []).filter(route => route.effectKind === 'summon_unit')
    .map(route => route.definitionId);
  const roachlingSummon = summonIds.includes(OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID);
  const summonSource = summonIds.length ? createOfficialSummonDataBundleV2({ context, definitionIds: summonIds }) : null;
  const immediateSummonedMove = summonSource?.currentDeploymentDefinitions.some(definition => definition.immediateMoveAuthorized);
  if (summonSource && !isDeepStrictEqual(summonSource, spatialState.officialSummonDataBundle)) {
    throw Error('CHARACTERISTIC_SUMMON_SOURCE_MISMATCH');
  }
  if ((cocoonRespawn || cocoonMorph || respawnDefinitionIds.length || combinedRespawn)
    && !isDeepStrictEqual(spatialState.officialRespawnMorphDataBundle,
      createOfficialRespawnMorphDataBundleV2({ context, includeMorph: cocoonMorph, ...respawnOptions }))) {
    throw Error('CHARACTERISTIC_RESPAWN_SOURCE_MISMATCH');
  }
  if (unitLifecycleBundle?.generatedRangedDefinitionIds.length && (!includePointDefenseChoices || !includeRanged)) {
    throw Error('CHARACTERISTIC_UNIT_LIFECYCLE_POINT_DEFENSE_CONSUMER_REQUIRED');
  }
  const missionSupplySource = summonSource ? createOfficialMissionSupplyProfileV2({ context,
    missionRecordKey: spatialState.officialMissionSupplyProfile?.recordKey }) : null;
  if (missionSupplySource && !isDeepStrictEqual(missionSupplySource, spatialState.officialMissionSupplyProfile)) {
    throw Error('CHARACTERISTIC_SUMMON_MISSION_SOURCE_MISMATCH');
  }
  const unitLifecycleAdapter = unitLifecycleBundle ? createOfficialUnitLifecycleFamilyAdapterV1(unitLifecycleBundle) : null;
  const installedTerranSupply = spatialState?.officialTerranUniqueFamilySourceBundle;
  let terranSupplyBundle = null;
  if (includeReleaseRosterActions && ['2.1.0','2.2.0'].includes(installedTerranSupply?.semanticVersion)) {
    terranSupplyBundle = createOfficialTerranMissionSupplyBundleV2(source, installedTerranSupply.definitionIds);
  } else if (includeReleaseRosterActions && includeStandaloneFreedomFighters && installedTerranSupply?.semanticVersion === '2.0.0') {
    terranSupplyBundle = createOfficialTerranFreedomFightersBundleV2(source);
  }
  if (terranSupplyBundle && !isDeepStrictEqual(terranSupplyBundle, installedTerranSupply)) {
    throw Error('CHARACTERISTIC_TERRAN_MISSION_SUPPLY_SOURCE_MISMATCH');
  }
  const terranSupplyAdapter = terranSupplyBundle ? createOfficialTerranUniqueFamilyAdapterV1(terranSupplyBundle) : null;
  const installedProtoss = spatialState?.officialProtossUniqueFamilySourceBundle;
  const khalaiBundle = includeReleaseRosterActions && installedProtoss?.semanticVersion === '2.2.0'
    ? createOfficialProtossSupportBundleV2(source,installedProtoss.definitionIds)
    : includeReleaseRosterActions && installedProtoss?.semanticVersion === '2.1.0'
    ? createOfficialArtanisCommanderBundleV2(source, installedProtoss.definitionIds.includes(OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID))
    : includeReleaseRosterActions && installedProtoss?.semanticVersion === '2.0.0'
    && installedProtoss.definitionIds.includes(OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID)
    ? createOfficialKhalaiActivationSourceBundleV2(source) : null;
  if (khalaiBundle && !isDeepStrictEqual(khalaiBundle, installedProtoss)) {
    throw Error('CHARACTERISTIC_KHALAI_ACTIVATION_SOURCE_MISMATCH');
  }
  const khalaiAdapter = khalaiBundle ? createOfficialProtossUniqueFamilyAdapterV1(khalaiBundle) : null;
  const reactionBundle = spatialState?.officialReactionFamilySourceBundle?.schema
    === 'starcraft_tmg_official_reaction_family_source_bundle_v2'
    ? createOfficialReactionFamilySourceBundleV2({ catalogue: source,
      definitionIds: spatialState.officialReactionFamilySourceBundle.definitionIds }) : null;
  if (reactionBundle && !isDeepStrictEqual(reactionBundle, spatialState.officialReactionFamilySourceBundle)) {
    throw Error('CHARACTERISTIC_REACTION_SOURCE_MISMATCH');
  }
  const afterChargeRoll = reactionBundle?.routes.some(route => route.nativeChargeDie || route.nativeChargeDistance) === true;
  if (afterChargeRoll && (!includeMelee || !includeReleaseOverseerChargeReaction || !hasOfficialFaqReactionPolicyV13(spatialState))) {
    throw Error('AFTER_CHARGE_ROLL_CONSUMER_REQUIRED');
  }
  const feedbackReactionTiming = spatialState?.officialFeedbackReactionTimingPolicy;
  const reactionAdapter = reactionBundle ? createOfficialReactionFamilyAdapterV1(reactionBundle, feedbackReactionTiming
    ? { afterApply: (before, result, action) => feedback.afterReaction(before, result, action) } : {}) : null;
  if (includeLungeDirectContinuation && (!includeRanged || !reactionAdapter
    || !reactionBundle.routes.some(route => route.requiresRangedTargetSnapshot) || !hasOfficialFaqReactionPolicyV13(spatialState))) {
    throw Error('LUNGE_CONTINUATION_SOURCE_REQUIRED');
  }
  if (includeLungeDeferredReaction && !includeLungeDirectContinuation) throw Error('LUNGE_CONTINUATION_SOURCE_REQUIRED');
  if (includeLungeOverwatchContinuation && (!includeLungeDeferredReaction
    || !reactionBundle?.routes.some(route => route.activationEndOwner === 'current_source_v1'))) {
    throw Error('LUNGE_OVERWATCH_CONTINUATION_SOURCE_REQUIRED');
  }
  if (includeLungeCertifiedFormation && !includeLungeDeferredReaction) {
    throw Error('LUNGE_CERTIFIED_FORMATION_CONTINUATION_REQUIRED');
  }
  if (includeLungeCertifiedForwardDetour && !includeLungeCertifiedFormation) {
    throw Error('LUNGE_CERTIFIED_FORWARD_CONTINUATION_REQUIRED');
  }
  if (includeLungeCertifiedMultiModelDetour && !includeLungeCertifiedForwardDetour) {
    throw Error('LUNGE_CERTIFIED_MULTI_MODEL_DETOUR_CONTINUATION_REQUIRED');
  }
  if (includeLungeCertifiedLeaderWitness && !includeLungeCertifiedMultiModelDetour) {
    throw Error('LUNGE_CERTIFIED_LEADER_WITNESS_CONTINUATION_REQUIRED');
  }
  if (includeLungeJointObstacleProof && !includeLungeCertifiedLeaderWitness) {
    throw Error('LUNGE_JOINT_OBSTACLE_PROOF_REQUIRES_CERTIFIED_CONTINUATION');
  }
  const lunge = includeLungeDirectContinuation ? createOfficialRangedLungeContinuationV1(reactionAdapter,
    { deferBehindOwnedReaction: includeLungeDeferredReaction, includeOverwatch: includeLungeOverwatchContinuation,
      certifiedMultiModel: includeLungeCertifiedFormation, certifiedForwardDetour: includeLungeCertifiedForwardDetour,
      certifiedMultiModelDetour: includeLungeCertifiedMultiModelDetour,
      certifiedLeaderWitness: includeLungeCertifiedLeaderWitness, certifiedJointObstacles: includeLungeJointObstacleProof,
      certifiedAxisLeaderBound: includeLungeAxisLeaderBound }) : null;
  const ancestralWisdom = reactionBundle?.definitionIds.some(id => id === 'card:templar_archives/ancestral-wisdom-any@1' || id === 'card:academy/advanced-training-any@1')
    ? createOfficialAncestralWisdomRuntimeV1({ reactionBundle }) : null;
  if (ancestralWisdom && !hasOfficialFaqReactionPolicyV13(spatialState)) throw Error('ANCESTRAL_WISDOM_FAQ_REACTION_POLICY_REQUIRED');
  const friendlySupplyLossReaction = reactionBundle?.routes.some(route => route.triggerKind === 'friendly_supply_reduced')
    ? createOfficialFriendlySupplyLossReactionRuntimeV1({ reactionBundle }) : null;
  if (friendlySupplyLossReaction && (!hasOfficialFaqReactionPolicyV13(spatialState) || !includeRanged && !includeMelee && !includeHits)) {
    throw Error('FRIENDLY_SUPPLY_LOSS_REACTION_CONSUMERS_REQUIRED');
  }
  const zagaraTransfusion = reactionBundle?.routes.find(
    route => route.definitionId === 'unit:zagara/transfusion-any-phase@1');
  const photonRoute = reactionBundle?.routes.find(r=>r.definitionId===PHOTON_OVERCHARGE_ID);
  const photonEntry = photonRoute ? createPhotonOverchargeEntryV1(reactionBundle,photonRoute,reactionAdapter) : null;
  const zealousRound = reactionBundle?.routes.find(route=>route.definitionId==='unit:zealot/zealous-round-assault-phase@1');
  const hallucination = reactionBundle?.routes.some(route=>route.rangedDeclarationOnly) === true;
  const medicLifeSupport = includeMixedRosterReactions && reactionBundle?.routes.find(
    route => route.definitionId === 'unit:medic/life-support-any-phase@1');
  if (zagaraTransfusion && !includeRanged) throw Error('TRANSFUSION_DAMAGE_CONSUMER_REQUIRED');
  const transfusionStructureFaq = Boolean(zagaraTransfusion && hasOfficialStructureTargetingPolicyV13(spatialState));
  const darkSwarmReaction = reactionBundle?.definitionIds.includes(OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID) === true;
  if (darkSwarmReaction && (!darkSwarmPlacement || !includeTargetReactions)) {
    throw Error('DARK_SWARM_REACTION_TOKEN_AND_TARGET_CONSUMERS_REQUIRED');
  }
  if (consumePayment && (!plague || darkSwarmReaction) && (!darkSwarmReaction || !darkSwarmLifecycle || !includeRanged
    || Boolean(includeTemplateAttacks) !== Boolean(consumeTemplatePayment) || includeMelee && !consumeCombatLifecycle)) {
    throw Error('CONSUME_NUMERIC_TARGET_REACTION_CONSUMER_REQUIRED');
  }
  if (consumeCombatLifecycle && (!includeMelee || darkSwarmReaction && reactionBundle.routes.find(route =>
    route.definitionId === OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID)?.phase !== 'assault')) {
    throw Error('CONSUME_COMBAT_COEXISTENCE_PHASE_BINDING_REQUIRED');
  }
  const declarationSource = reactionBundle?.routes.some(route => route.effectKind === 'ranged_declaration_keywords') === true;
  const inheritedRangedHitDebuff = includeReleaseRosterActions
    && reactionBundle?.routes.some(route => route.persistentRangedHitDebuff) === true;
  const headShotSource = reactionBundle?.definitionIds.includes('unit:nova_stealth_mode/head-shot-assault-phase@1') === true;
  const plasmaArmourSource = reactionBundle?.routes.some(route => ['card:robotics_facility/plasma-shields-any@1', 'card:robotics_facility/plasma-shields-any@2'].includes(route.definitionId)) === true;
  if (plasmaArmourSource && !includeArmourReactions) throw Error('PLASMA_SHIELDS_ARMOUR_CONSUMER_REQUIRED');
  const alloyArmourSource = reactionBundle?.routes.some(route => ['card:vanadium_plating/crystalline-alloy-any@1', 'card:vanadium_plating/crystalline-alloy-any@2'].includes(route.definitionId)) === true;
  if (alloyArmourSource && !includeArmourReactions) throw Error('CRYSTALLINE_ALLOY_ARMOUR_CONSUMER_REQUIRED');
  const vehiclePlatingSource = reactionBundle?.routes.some(route => ['card:armory/vehicle-plating-any@1', 'card:armory/vehicle-plating-any@2'].includes(route.definitionId)) === true;
  if (vehiclePlatingSource && !includeArmourReactions) throw Error('VEHICLE_PLATING_ARMOUR_CONSUMER_REQUIRED');
  if (declarationSource !== hasOfficialRangedDeclarationPolicyV1(spatialState)) throw Error('RANGED_DECLARATION_POLICY_SOURCE_REQUIRED');
  const hiddenLossReactions = reactionBundle?.routes.some(route => route.effectKind === 'hidden_loss_might')
    ? createOfficialHiddenLossReactionRuntimeV1({ reactionBundle, bindCloseRanksParent: closeRanksReactions,
      observeActionPerformedHiddenLoss: spatialState?.officialActionStatusLifecyclePolicy?.observeHiddenLossBeforePassives === true,
      bindCleanupParent: Boolean(spatialState?.officialCleanupContinuationPolicy),
      hasUnsettledAction: current => Boolean(
      current.pendingAction || current.pendingCurrentProductRangedCasualtyChoice
      || precisionChoices?.hasPending(current) || meleeChoices?.hasPending(current) || hitsChoices?.hasPending(current)
      || hits?.hasPending(current) || targetReactions?.pending(current) || pointDefenseChoices?.hasPending(current)) }) : null;
  if (closeRanksReactions && (!hiddenLossReactions || !hasOfficialCharacteristicConsumerPolicyV1(spatialState))) {
    throw Error('CHARACTERISTIC_CLOSE_RANKS_REACTION_CONSUMERS_REQUIRED');
  }
  const postPlaceSource = reactionBundle?.routes.some(route => route.triggerKind === 'after_place') === true;
  if (postPlaceSource && !relocationAdapter && !psionicPlaceReactions) throw Error('CHARACTERISTIC_POST_PLACE_PRODUCER_REQUIRED');
  if (psionicPlaceReactions && !postPlaceSource) throw Error('CHARACTERISTIC_PSIONIC_POST_PLACE_REACTION_SOURCE_REQUIRED');
  const postPlaceReactions = postPlaceSource ? createOfficialPostPlaceReactionRuntimeV1({ reactionBundle,
    ...(reservePlaceSource ? { includeEntryEdgePlace: true } : {}),
    ...(psionicPlaceReactions ? { includeTokenLeadingPlace: true } : {}),
    ...(outsidePlaceReactions ? { includeOutsideActivationTiming: true } : {}) }) : null;
  const targetDamageCapSource = reactionBundle?.routes.some(route => route.effectKind === 'weapon_damage_characteristic_cap') === true;
  const fixedEvadeSource = reactionBundle?.routes.some(route => route.effectKind === 'fixed_evade_characteristic') === true;
  const instinctiveReaction = reactionBundle?.routes.find(route => route.meleeDeclarationOnly);
  const khassarMeleeDamageContinuation = Boolean(includeKhassarFight && includeKhassarTargetReactions
    && includeKhassarDamageReactions && instinctiveReaction && reactionBundle.routes
      .filter(route => route.triggerKind === 'attack_target_selected').every(route => route.meleeDeclarationOnly));
  const khassarRangedDamageContinuation = Boolean(includeKhassarShot && includeKhassarTargetReactions
    && includeKhassarDamageReactions && darkSwarmReaction && reactionBundle.routes
      .filter(route => route.triggerKind === 'attack_target_selected').every(route => route.requiresSharedFriendlyDarkSwarmToken));
  const khassarTargetDamageContinuation = khassarMeleeDamageContinuation || khassarRangedDamageContinuation;
  const releaseZergTargets = includeReleaseZergTargetReactions && includeTargetReactions
    && Boolean(instinctiveReaction || darkSwarmReaction);
  if (includeReleaseZergTargetReactions && !releaseZergTargets) throw Error('RELEASE_ZERG_TARGET_REACTION_SOURCE_REQUIRED');
  const independentFixedDamage = route => includeIndependentSupportReactions && includeRanged && includeMelee
    && includeTransfusionMeleeOwner && route.triggerKind === 'damage_received' && route.effectKind === 'damage_reduce_fixed'
    && ['unit:queen/transfusion-any-phase@1','card:daelaam/dae-uhl-any@1'].includes(route.definitionId);
  const independentRestoration = route => includeIndependentSupportReactions && includeReleaseOpticalFlareRestoration
    && route.triggerKind === 'debuff_received' && route.effectKind === 'remove_debuffs'
    && (!includeHits || includeReleaseInheritedHitsReactions);
  const supportDamage = Boolean(zealousRound || hallucination && reactionBundle.routes.some(route=>route.definitionId==='card:daelaam/dae-uhl-any@1')
    || reactionBundle?.routes.some(independentFixedDamage));
  const ownsMeleeDamageContinuation = supportDamage || khassarMeleeDamageContinuation || Boolean(releaseZergTargets && instinctiveReaction && zagaraTransfusion);
  const ownsRangedDamageContinuation = supportDamage || khassarRangedDamageContinuation || inheritedRangedHitDebuff
    || Boolean(releaseZergTargets && darkSwarmReaction && zagaraTransfusion);
  const hasIndependentReleaseOwner = route => releaseZergTargets && (
    route.definitionId === zagaraTransfusion?.definitionId
    || headShotSource && route.effectKind === 'ranged_declaration_keywords'
    || route.chargeDeclarationOwner === 'current_source_v1'
    || lunge && route.requiresRangedTargetSnapshot
    || includeBeforeRangedEvadeReaction && includeBeforeMeleeEvadeReaction && route.triggerKind === 'before_evade_roll'
  );
  if (fixedEvadeSource && !includeTargetReactions) throw Error('CHARACTERISTIC_FIXED_EVADE_TARGET_REACTION_CONSUMER_REQUIRED');
  if (instinctiveReaction && (!includeTargetReactions || !includeMelee)) {
    throw Error('ZAGARA_INSTINCTIVE_REACTION_MELEE_CONSUMER_REQUIRED');
  }
  if (includeTargetReactions && (!(targetDamageCapSource || fixedEvadeSource || darkSwarmReaction || instinctiveReaction || hallucination) || reactionBundle.routes.some(route => route.triggerKind !== 'attack_target_selected'
    && !(route.triggerKind === 'before_armour_roll' && includeArmourReactions)
    && !(afterChargeRoll && (route.nativeChargeDie || route.nativeChargeDistance))
    && !hasIndependentReleaseOwner(route)
    && !independentFixedDamage(route) && !independentRestoration(route)
    && !(hallucination && includeReleaseOpticalFlareRestoration && route.triggerKind==='debuff_received' && route.effectKind==='remove_debuffs')
    && !(photonEntry && route===photonRoute)
    && !(supportDamage && (route.definitionId===zealousRound?.definitionId || route.definitionId==='card:daelaam/dae-uhl-any@1'))
    && !(khassarTargetDamageContinuation && route.definitionId === zagaraTransfusion?.definitionId)
    && !(postPlaceSource && route.triggerKind === 'after_place')
    && !(friendlySupplyLossReaction && route.triggerKind === 'friendly_supply_reduced')
    && !(ancestralWisdom && route.triggerKind === 'ability_cost_payment')
    && !(fixedEvadeSource && hiddenLossReactions && route.triggerKind === 'hidden_lost'))
    || !includeRanged && !includeMelee
    || includeMelee && !includeArmourReactions
    || includeTemplateAttacks && (!includePrecisionChoices || !includeArmourChoices || !includeArmourReactions)
    || includeHits && !fixedEvadeSource && !releaseZergTargets && !(photonEntry && hallucination))) throw Error('CHARACTERISTIC_TARGET_REACTION_NUMERIC_CONSUMER_REQUIRED');
  const meleeArmourReactions = includeArmourReactions && includeMelee;
  if (includeArmourReactions && (!reactionAdapter || !includeRanged && !includeMelee && !includeHits
    || includeRanged && (!includePrecisionChoices || !includeArmourChoices)
    || targetDamageCapSource && !includeTargetReactions)) throw Error('CHARACTERISTIC_NUMERIC_ARMOUR_REACTION_CONSUMERS_REQUIRED');
  if (meleeArmourReactions && !includeRanged && reactionBundle.routes.some(route => route.triggerKind !== 'before_armour_roll'
    && !(includeTargetReactions && route.triggerKind === 'attack_target_selected')
    && !(postPlaceSource && route.triggerKind === 'after_place')
    && !(friendlySupplyLossReaction && route.triggerKind === 'friendly_supply_reduced')
    && !(ancestralWisdom && route.triggerKind === 'ability_cost_payment')
    && !(fixedEvadeSource && hiddenLossReactions && route.triggerKind === 'hidden_lost'))) {
    throw Error('CHARACTERISTIC_MELEE_ARMOUR_REACTION_SOURCE_REQUIRED');
  }
  if (includePointDefenseChoices) {
    if (!includePrecisionChoices || !spatialState?.officialRangedFamilySourceBundle) {
      throw Error('CHARACTERISTIC_POINT_DEFENSE_SOURCE_AND_CHOICES_REQUIRED');
    }
    const expected = createOfficialRangedFamilySourceBundleV2({ catalogue: source,
      definitionIds: spatialState.officialRangedFamilySourceBundle.definitionIds,
      attackProfileCatalogue: spatialState.officialAttackProfileCatalogue });
    if (!isDeepStrictEqual(expected, spatialState.officialRangedFamilySourceBundle)) {
      throw Error('CHARACTERISTIC_POINT_DEFENSE_SOURCE_MISMATCH');
    }
  }
  const modifierOnly = Array.isArray(definitionIds) && definitionIds.length === 0
    && (commanderAdapter || plagueCoverage || darkSwarmPlacement || structureSource || holoRoundEnd || decoySource || personalTransport || psionic || relocationBundle || unitLifecycleBundle || reactionBundle || spatialState?.officialBattlefieldAssetFamilySourceBundle?.schema
      === 'starcraft_tmg_official_battlefield_asset_family_source_bundle_v2'
      || includeMelee && spatialState?.officialMeleeFamilySourceBundle?.schema
        === 'starcraft_tmg_official_melee_family_source_bundle_v2'
      || includeMelee && spatialState?.officialMeleeWeaponSourceBundle?.schema
        === 'starcraft_tmg_official_melee_family_source_bundle_v2'
      || weaponDefinitionIds.length > 0);
  const bundle = modifierOnly ? null : createOfficialCharacteristicStatusFamilySourceBundleV2({ catalogue: source,
    definitionIds, canonicalResourceTypes: spatialState?.officialCharacteristicStatusFamilySourceBundle?.resourceTypeContract === 'card_payment_CP_BM_PE_v1'
      || includeHits || includeArmourOrdinals
      || spatialState?.officialBattlefieldAssetFamilySourceBundle?.schema === 'starcraft_tmg_official_battlefield_asset_family_source_bundle_v2' });
  const characteristicRoutes = bundle?.routes || [];
  const ravenMissile = characteristicRoutes.find(route => route.definitionId === OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID);
  const guardianShield = includeReleaseSentryGuardianShield && characteristicRoutes.some(route => route.effectKind === 'guardian_shield');
  const ourDutyIsUnending = characteristicRoutes.some(route => route.effectKind === 'our_duty_is_unending');
  const ourMindsAsOne = characteristicRoutes.find(route => route.effectKind === 'our_minds_as_one');
  if (includePsionicStormGeometryEvidence && !includePsionicStormSourceRules) {
    throw Error('PSIONIC_STORM_SOURCE_RULES_REQUIRED');
  }
  const stormBattlefieldAssetProfile = includePsionicStormGeometryEvidence
    ? getOfficialReleaseBattlefieldAssetComponentProfileV2(context) : null;
  const stormCommunityGeometry = stormBattlefieldAssetProfile ? getOfficialReleaseWave3CommunityGeometryV1(context) : null;
  const psionicStormSourceRules = includePsionicStormSourceRules
    ? createOfficialPsionicStormSourceRulesV1({ catalogue: source, battlefieldAssetProfile: stormBattlefieldAssetProfile,
      communityGeometry: stormCommunityGeometry, selectedDefinitionIds: selectedStormDefinitionIds }) : null;
  if (psionicStormSourceRules && !spatialState) throw Error('PSIONIC_STORM_SOURCE_STATE_REQUIRED');
  if ((includePsionicStormPhaseEndDefence || includePsionicStormAssaultDamage) && !includePsionicStormPhaseEnd) {
    throw Error('PSIONIC_STORM_PHASE_END_DEFENCE_CONSUMER_REQUIRED');
  }
  const stormOrderSource = includePsionicStormAssaultOrder
    ? context.dataset.recordsByKey['rules_sections:iuUyObNTQ2M8xK4IUqzC'] : null;
  if (includePsionicStormAssaultOrder && (!includePsionicStormAssaultDamage || !stormOrderSource)) {
    throw Error('PSIONIC_STORM_ASSAULT_DAMAGE_AND_ORDER_SOURCE_REQUIRED');
  }
  const khalasGift = characteristicRoutes.find(route => route.effectKind === 'khalas_gift');
  const executorsWillRoute = characteristicRoutes.find(route => route.effectKind === 'executors_will');
  const executorsWill = executorsWillRoute ? createOfficialExecutorsWillRuntimeV1(executorsWillRoute) : null;
  const forceWall = characteristicRoutes.find(route => route.effectKind === 'force_wall_pair');
  const forceWallProfile = forceWall ? getOfficialReleaseBattlefieldAssetComponentProfileV2(context) : null;
  if (forceWall && (!forceWallProfile.componentEvidence.force_wall
    || !isDeepStrictEqual(forceWallProfile, spatialState?.officialBattlefieldAssetComponentProfile))) {
    throw Error('FORCE_WALL_COMPONENT_PROFILE_MISMATCH');
  }
  const forceWallTraversal = spatialState?.officialForceWallTraversalPolicy;
  if (forceWallTraversal && !isDeepStrictEqual(forceWallTraversal,
    createOfficialForceWallTraversalPolicyV1(spatialState, forceWall))) {
    throw Error('FORCE_WALL_TRAVERSAL_POLICY_MISMATCH');
  }
  const telekineticPush = characteristicRoutes.find(route => route.effectKind === 'force_wall_push');
  if (telekineticPush && !forceWallTraversal) throw Error('TELEKINETIC_PUSH_FORCE_WALL_TRAVERSAL_REQUIRED');
  const psiLightning = characteristicRoutes.find(route => route.effectKind === 'force_wall_lightning');
  if (psiLightning && !forceWallTraversal) throw Error('PSI_LIGHTNING_FORCE_WALL_TRAVERSAL_REQUIRED');
  const farsight = characteristicRoutes.find(route => route.effectKind === 'farsight_evade_eligibility');
  const targetedAbilityPolicy = verifyOfficialTargetedActiveAbilityPolicyV1(context, spatialState || {});
  if (khalasGift && !targetedAbilityPolicy?.definitionIds.includes(khalasGift.definitionId)) {
    throw Error('KHALAS_GIFT_TARGETED_ACTIVE_ABILITY_POLICY_REQUIRED');
  }
  const selectedAbilityRoutes = spatialState?.officialSelectedRosterAbilitySourceBundle?.routes ?? [];
  if (targetedAbilityPolicy?.definitionIds.some(id => !characteristicRoutes.some(route => route.definitionId === id)
    && !selectedAbilityRoutes.some(route => route.definitionId === id))) {
    throw Error('TARGETED_ACTIVE_ABILITY_ROUTE_REQUIRED');
  }
  const feedback = characteristicRoutes.some(route => route.effectKind === 'feedback')
    ? createOfficialFeedbackCompletionV1({ context, bundle, catalogue: source, state: spatialState }) : null;
  if (feedback && feedback.sourceDefinitionIds.some(id => !targetedAbilityPolicy?.definitionIds.includes(id))) {
    throw Error('FEEDBACK_TARGETING_POLICY_REQUIRED');
  }
  if (feedbackReactionTiming && (!feedback || !isDeepStrictEqual(feedbackReactionTiming, OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1))) {
    throw Error('FEEDBACK_REACTION_TIMING_POLICY_MISMATCH');
  }
  const releaseOrderedAssault = includeReleaseBileAssaultOrder || includeReleaseMoundAssaultOrder;
  const additionalAssaultProviders = includeAdditionalAssaultEffectOrder || releaseOrderedAssault;
  const poisonousEssence = characteristicRoutes.some(route => route.effectKind === 'poisonous_essence')
    ? createOfficialPoisonousEssencePhaseEndRuntimeV1({ context, source: bundle, state: spatialState,
      includeSharedOrder: additionalAssaultProviders }) : null;
  if (Boolean(spatialState?.officialPoisonousEssencePolicy) !== Boolean(poisonousEssence)) {
    throw Error('POISONOUS_ESSENCE_SOURCE_REQUIRED');
  }
  const sabotageDronePhaseEnd = characteristicRoutes.some(route => route.effectKind === 'unit_phase_end_hits')
    ? createOfficialSabotageDronePhaseEndRuntimeV1({ context, source: bundle, state: spatialState,
      includeSharedOrder: additionalAssaultProviders }) : null;
  if (sabotageDronePhaseEnd && (!includeHits || !structureSource)) {
    throw Error('SABOTAGE_DRONE_PHASE_END_CONSUMERS_REQUIRED');
  }
  const voidSeekerHidden = characteristicRoutes.some(route => route.definitionId === 'card:void_seeker/anakh-su-n-any@1');
  if (voidSeekerHidden && !actionStatusLifecycle) throw Error('VOID_SEEKER_HIDDEN_ACTION_LIFECYCLE_REQUIRED');
  const largeMovementSource = characteristicRoutes.some(route => route.effectKind === 'large_movement');
  const semanticSpatialQueries = Boolean(spatialState) && (Boolean(forceWallTraversal)
    || characteristicRoutes.some(route =>
      ['coherency_projection', 'large_movement', 'infested_drop_entry_edge'].includes(route.effectKind)));
  const indomitableRanged = spatialState ? hasOfficialIndomitableRangedPolicyV1(spatialState) : false;
  const modeBoundTargeting = spatialState ? hasOfficialModeBoundRangedTargetPolicyV1(spatialState) : false;
  if (modeBoundTargeting && !includeRanged) throw Error('CHARACTERISTIC_MODE_BOUND_TARGET_RANGED_CONSUMER_REQUIRED');
  if (indomitableRanged !== characteristicRoutes.some(row => row.effectKind === 'indomitable')
    || indomitableRanged && !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle)) {
    throw Error('CHARACTERISTIC_INDOMITABLE_SOURCE_POLICY_MISMATCH');
  }
  if (includeArmourChoices && (!includeRanged || !includePrecisionChoices)
    || characteristicRoutes.some(route => route.effectKind === 'conditional_tough') && !includeArmourChoices && !includeMelee && !includeHits) {
    throw Error('CHARACTERISTIC_ARMOUR_CHOICE_CONSUMER_REQUIRED');
  }
  if (characteristicRoutes.some(route => route.effectKind === 'automatic_hits_engaged') && !includeHits) {
    throw Error('CHARACTERISTIC_HITS_CONSUMER_REQUIRED');
  }
  if (includeHits && !spatialState) throw Error('CHARACTERISTIC_HITS_STATE_REQUIRED');
  if (includeHits && !bundle) throw Error('CHARACTERISTIC_HITS_SOURCE_REQUIRED');
  if (includeArmourOrdinals !== (spatialState ? hasOfficialArmourRollOrdinalPolicyV1(spatialState) : false)) {
    throw Error('CHARACTERISTIC_ARMOUR_ORDINAL_POLICY_REQUIRED');
  }
  const seekerCast = characteristicRoutes.find(route => route.definitionId === OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID);
  if (seekerCast && (!includeRavenSeekerPhaseEnd || !includeRavenSeekerPaidImpact || !includeHits
    || !spatialState?.officialTerrainLosDataBundle || !hasOfficialStructureTargetingPolicyV13(spatialState)
    || !targetedAbilityPolicy?.definitionIds.includes(seekerCast.definitionId))) {
    throw Error('RAVEN_SEEKER_MISSILE_FULL_CONTINUATION_REQUIRED');
  }
  if (seekerCast && (psiLightning || ravenSeekerRules == null || (!additionalAssaultProviders
    && (poisonousEssence || sabotageDronePhaseEnd || bileResolution)))) {
    throw Error('RAVEN_SEEKER_MISSILE_CAST_MIXED_ORDER_UNRESOLVED');
  }
  const authorizeSeekerCast = seekerCast ? (state, actor) => state.phase === 'movement'
    && actor.officialUnitRecordKey === seekerCast.recordKey
    && !(state.characteristicStatusAbilityHistory || []).some(row =>
      row.definitionId === seekerCast.definitionId && row.round === Number(state.round)
      && (!state.officialSeekerAssaultTiming || row.pieceId === actor.id)) : null;
  const canRestoreFlare = includeReleaseOpticalFlareRestoration && reactionBundle?.routes.some(route =>
    route.triggerKind === 'debuff_received' && route.effectKind === 'remove_debuffs');
  const adapter = bundle ? createOfficialCharacteristicStatusFamilyAdapterV1(bundle, { authorizeSeekerCast,
    ...(canRestoreFlare ? { afterApply: transition => openOfficialOpticalFlareRestorationWindowV1(
      reactionBundle, transition, { recordSource: true }) } : {}) }) : null;
  let weaponAdapter = null;
  if (spatialState && !isDeepStrictEqual(spatialState.officialModelGapTransitPolicy,
    OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13)) throw Error('CHARACTERISTIC_SPATIAL_GAP_POLICY_REQUIRED');
  const spatial = spatialState ? createOfficialSelectedRosterSpatialActionRuntimeV1(spatialState) : null;
  const summonedActions = summonSource ? createOfficialSummonedActionRuntimeV1({ summonDataBundle: summonSource,
    spatialRuntime: spatial, combatEligibilityPolicy: summonedCombatEligibility,
    refreshState: next => refreshOfficialReleaseRosterDerivedStateV2({ context, state: next }) }) : null;
  if (spatialState?.officialPsionicDisplacementQueryPolicy && !psionic) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_PRODUCER_REQUIRED');
  const battlefieldDisplacementSource = spatialState?.officialBattlefieldDisplacementSourceBundle
    ? createOfficialBattlefieldDisplacementSourceV1({ state: spatialState }) : null;
  const displacementSource = battlefieldDisplacementSource || psionicSource;
  const displacementProducer = battlefieldDisplacementSource ? createOfficialBattlefieldDisplacementProducerV1({
    source: battlefieldDisplacementSource, state: spatialState, tokenLeadingProducer: psionic }) : psionic;
  const displacementKind = battlefieldDisplacementSource ? 'battlefield_displacement' : 'psionic_displacement';
  const displacementPolicy = spatialState?.officialBattlefieldDisplacementPolicy || spatialState?.officialPsionicDisplacementPolicy;
  if (battlefieldDisplacementSource && (!spatialState.officialBattlefieldDisplacementQueryPolicy || !displacementPolicy)) {
    throw Error('BATTLEFIELD_DISPLACEMENT_CONSUMERS_REQUIRED');
  }
  const displacementQuery = (spatialState?.officialBattlefieldDisplacementQueryPolicy
    || spatialState?.officialPsionicDisplacementQueryPolicy) ? createOfficialPsionicDisplacementQueryV1({
    context, source: displacementSource, producer: displacementProducer, spatial, state: spatialState,
    executionConsumerReady: Boolean(displacementPolicy),
    prepareMovement: displacementPolicy?.movementQueriesReady
      ? (current, request) => prepareDisplacementMovementQuery(current, request) : null }) : null;
  const displacement = displacementPolicy ? createOfficialPsionicDisplacementRuntimeV1({
    context, source: displacementSource, producer: displacementProducer, queryPort: displacementQuery, state: spatialState,
    applyOriginal: (current, kind, original, options) => applySource(current, wrapAction(current, original, kind, true), options),
    projectCloseRanksMovement: (current, original) => melee.projectCloseRanksMovement(current, original),
    prepareFightContinuation: (current, original, choices) => prepareDisplacedFightContinuation(current, original, choices),
    fightContinuationChoices: (current, original) => displacedFightContinuationContext(current, original).schema,
    readHiddenLossParent: current => hiddenLossReactions?.closeRanksParent(current),
    applyFightContinuation: (current, action, options) => applySource(current, action, options) }) : null;
  const activation = spatialState ? createOfficialSelectedRosterAbilityRuntimeV1(spatialState) : null;
  const largeRemoval = spatial && hasOfficialLargeTerrainRemovalPolicyV1(spatialState);
  if (largeMovementSource) {
    if (!largeRemoval) throw Error('CHARACTERISTIC_LARGE_MOVEMENT_CONSUMER_REQUIRED');
    for (const piece of spatialState.pieces.filter(row => characteristicRoutes.some(route =>
      route.effectKind === 'large_movement' && route.recordKey === row.officialUnitRecordKey))) {
      inspectOfficialLargeMovementSourceV1(spatialState, piece);
    }
  }
  if (includeRanged && !spatialState) throw Error('CHARACTERISTIC_RANGED_STATE_REQUIRED');
  const ranged = includeRanged ? createOfficialSelectedRosterRangedActionRuntimeV1(spatialState) : null;
  if (bombardTargeting && (!ranged || !weaponDefinitionIds.includes('unit:bile_launcher/bile-bomb-assault-phase@1'))) {
    throw Error('BOMBARD_TARGETING_RANGED_WEAPON_CONSUMER_REQUIRED');
  }
  if (includeMelee && (!spatialState?.officialAttackProfileCatalogueV2
    || spatialState.officialAttackProfileCatalogueV2.previousCatalogueHash !== spatialState.officialAttackProfileCatalogue.catalogueHash)) {
    throw Error('CHARACTERISTIC_MELEE_SOURCE_CATALOGUE_REQUIRED');
  }
  const transfusionMelee = Boolean((zagaraTransfusion || medicLifeSupport || supportDamage) && includeMelee && includeTransfusionMeleeOwner
    && !['3.126.0', '3.127.0', '3.128.0'].includes(context.resources.rulesRuntime?.runtimeVersion));
  const melee = includeMelee ? createOfficialSelectedRosterMeleeActionRuntimeV1(spatialState, {
    includeDamageReceivedReaction: transfusionMelee,
  }) : null;
  const meleeSidearm = spatialState ? hasOfficialMeleeSidearmPolicyV1(spatialState) : false;
  if (meleeSidearm && !melee) throw Error('CHARACTERISTIC_MELEE_SIDEARM_CONSUMER_REQUIRED');
  if (spatialState?.officialMeleeWeaponSourceBundle && !melee) throw Error('CHARACTERISTIC_MELEE_WEAPON_CONSUMER_REQUIRED');
  const meleeWeaponBundle = spatialState?.officialMeleeWeaponSourceBundle
    ? createOfficialMeleeFamilySourceBundleV2({ catalogue: source,
      definitionIds: spatialState.officialMeleeWeaponSourceBundle.definitionIds,
      attackProfileCatalogueV2: spatialState.officialAttackProfileCatalogueV2 }) : null;
  if (meleeWeaponBundle && !isDeepStrictEqual(meleeWeaponBundle, spatialState.officialMeleeWeaponSourceBundle)) {
    throw Error('CHARACTERISTIC_MELEE_WEAPON_SOURCE_MISMATCH');
  }
  const meleeModifierBundle = melee && spatialState.officialMeleeFamilySourceBundle
    ? createOfficialMeleeFamilySourceBundleV2({ catalogue: source,
      definitionIds: spatialState.officialMeleeFamilySourceBundle.definitionIds,
      attackProfileCatalogueV2: spatialState.officialAttackProfileCatalogueV2 }) : null;
  if (meleeModifierBundle && !isDeepStrictEqual(meleeModifierBundle, spatialState.officialMeleeFamilySourceBundle)) {
    throw Error('CHARACTERISTIC_MELEE_MODIFIER_SOURCE_MISMATCH');
  }
  const meleeModifierAdapter = meleeModifierBundle ? createOfficialMeleeModifierComponentAdapterV1(meleeModifierBundle) : null;
  const battlefieldModifierBundle = spatialState?.officialBattlefieldAssetFamilySourceBundle?.schema
    === 'starcraft_tmg_official_battlefield_asset_family_source_bundle_v2'
    ? createOfficialBattlefieldAssetFamilySourceBundleV2({ catalogue: source,
      definitionIds: spatialState.officialBattlefieldAssetFamilySourceBundle.definitionIds }) : null;
  if (battlefieldModifierBundle && !isDeepStrictEqual(battlefieldModifierBundle, spatialState.officialBattlefieldAssetFamilySourceBundle)) {
    throw Error('CHARACTERISTIC_BATTLEFIELD_MODIFIER_SOURCE_MISMATCH');
  }
  const reactiveCreepTokens = battlefieldModifierBundle?.routes.some(route =>
    (route.recordKey === 'tactical_cards:reactive_creep' || includeReleaseMalignantCreep && route.recordKey === 'tactical_cards:malignant_creep')
    && ['creep_stay_displacement', 'creep_removal'].includes(route.effectKind));
  if (reactiveCreepTokens) {
    const hasTumorProducer = battlefieldModifierBundle.routes.some(route => route.effectKind === 'creep_token_place')
      || spatialState.officialUnitLifecycleFamilySourceBundle?.routes.some(route => route.effectKind === 'spawn_creep_tumor');
    const nativeTokensBound = battlefieldDisplacementSource?.sources.some(row => row.kind === 'creep_card');
    const missingConsumer = includeReleaseReactiveCreep || includeReleaseMalignantCreep
      ? (hasTumorProducer && !nativeTokensBound) || (bombardSource && !spatialState.officialBombardRemovalLifecyclePolicy)
      : !battlefieldDisplacementSource || !spatialState.officialBombardRemovalLifecyclePolicy;
    if (missingConsumer) throw Error('REACTIVE_CREEP_TOKEN_CONSUMERS_REQUIRED');
  }
  if (includeReleaseMalignantCreep && !melee) throw Error('MALIGNANT_CREEP_CHARGE_CONSUMER_REQUIRED');
  const reactiveTissue = battlefieldModifierBundle?.routes.some(route => route.effectKind === 'on_creep_dodge');
  if (reactiveTissue && (!ranged || !melee)) throw Error('REACTIVE_TISSUE_ATTACK_CONSUMERS_REQUIRED');
  if (Boolean(battlefieldModifierBundle) !== (spatialState ? hasOfficialArmourThresholdPolicyV1(spatialState) : false)) {
    throw Error('CHARACTERISTIC_ARMOUR_THRESHOLD_POLICY_REQUIRED');
  }
  const activeBattlefieldAssets = battlefieldModifierBundle?.routes.some(route => route.actionKind === 'active_ability') === true;
  const battlefieldModifierAdapter = battlefieldModifierBundle && (activeBattlefieldAssets
    ? createOfficialCreepCardComponentAdapterV2(battlefieldModifierBundle)
    : createOfficialBattlefieldModifierComponentAdapterV1(battlefieldModifierBundle));
  const meleeAtomIds = [...new Set((melee?.descriptor.routes || []).flatMap(row => row.ruleAtomIds))].sort();
  // The first 3.2.0 engineering release signed its Charge prefix with an
  // incomplete Impact catalogue. Retain that exact manifest for read/replay;
  // corrected candidates get a new release binding with the full policy atom.
  const legacyImpactCatalogue = meleeModifierAdapter && context.resources.rulesRuntime?.runtimeVersion === '3.2.0';
  const impactPolicyAtoms = melee && hasOfficialImpactAllocationPolicyV13(spatialState) && !legacyImpactCatalogue
    ? [OFFICIAL_IMPACT_ALLOCATION_POLICY_V13.ruleAtomId] : [];
  const rangedAtomIds = [...new Set((ranged?.descriptor.routes || []).flatMap(row => row.ruleAtomIds))].sort();
  const templateCoverage = ranged && spatialState.officialBlastTemplateGeometryAsset
    ? createOfficialBlastTemplateCoverageRuntimeV1({ state: spatialState, unitTargetEligibility: includeTemplateAttacks }) : null;
  if (includeTemplateAttacks && !templateCoverage) throw Error('CHARACTERISTIC_TEMPLATE_GEOMETRY_REQUIRED');
  const templateAttack = includeTemplateAttacks
    ? createOfficialBlastTemplateAttackRuntimeV1({ state: spatialState, coverageRuntime: templateCoverage,
      precisionChoiceSupported: includePrecisionChoices, pointDefenseChoiceSupported: includePointDefenseChoices,
      armourChoiceSupported: includeArmourChoices, armourReactionSupported: includeArmourReactions }) : null;
  const transfusionTemplate = Boolean((zagaraTransfusion || reactionBundle?.routes.some(independentFixedDamage)) && templateAttack && includeTransfusionTemplateOwner);
  const ownsTemplateDamageReaction = state => (transfusionTemplate || lunge || includeBeforeTemplateEvadeReaction)
    && templateAttack?.ownsDamageReactionWindow(state);
  const rangedDeclaration = declarationSource ? createOfficialRangedDeclarationReactionRuntimeV1({ state: spatialState,
    reactionAdapter, templateRuntime: templateAttack, rangedRuntime: ranged }) : null;
  const applyWeapon = (kind, state, action, options) => weaponAdapter?.bindingFor(action)
    ? router.dispatch({ operation: 'apply', adapterId: weaponAdapter.descriptor.adapterId,
      state, request: { action, options } })
    : { ranged, template: templateAttack, melee }[kind].apply(state, action, options);
  if (includeBeforeMeleeEvadeReaction && (!melee || !reactionAdapter)) {
    throw Error('BEFORE_MELEE_EVADE_STAGED_CONSUMER_REQUIRED');
  }
  const meleeChoices = melee ? createOfficialMeleePoolChoiceRuntimeV1({ delegate: meleeWeaponBundle
    ? { ...melee, apply: (state, action, options) => applyWeapon('melee', state, action, options) } : melee,
    includeBeforeEvadeReaction: includeBeforeMeleeEvadeReaction,
    ...(meleeArmourReactions || includeBeforeMeleeEvadeReaction ? { reactionAdapter, reactionBundle } : {}) }) : null;
  const choiceDelegates = weaponDefinitionIds.length ? {
    ranged: ranged && { ...ranged, apply: (state, action, options) => applyWeapon('ranged', state, action, options) },
    template: templateAttack && { ...templateAttack, apply: (state, action, options) => applyWeapon('template', state, action, options) },
  } : { ranged, template: templateAttack };
  const hasBeforeRangedEvadeReaction = includeBeforeRangedEvadeReaction || includeBeforeTemplateEvadeReaction;
  if (includeBeforeTemplateEvadeReaction && !templateAttack) throw Error('BEFORE_TEMPLATE_EVADE_CONSUMER_REQUIRED');
  if (hasBeforeRangedEvadeReaction && (!includePrecisionChoices || !includeArmourChoices || !reactionAdapter)) {
    throw Error('BEFORE_RANGED_EVADE_STAGED_CONSUMER_REQUIRED');
  }
  if (includePrecisionChoices && !ranged) throw Error('CHARACTERISTIC_PRECISION_RANGED_REQUIRED');
  const precisionChoices = includePrecisionChoices
    ? createOfficialRangedPrecisionChoiceRuntimeV1({ delegates: choiceDelegates,
      includeZeroPools: includePointDefenseChoices, includeArmourChoices, includeBeforeEvadeReaction: includeBeforeRangedEvadeReaction,
      includeBeforeTemplateEvadeReaction,
      ...(includeArmourReactions || hasBeforeRangedEvadeReaction ? { reactionAdapter, reactionBundle } : {}) }) : null;
  const pointDefenseChoices = includePointDefenseChoices
    ? createOfficialPointDefenseChoiceRuntimeV1({ delegates: choiceDelegates }) : null;
  const dashRoute=spatialState.officialArtanisDashEnabled && reactionBundle?.routes.find(r=>r.effectKind==='followup_second_charge');
  const artanisDash=dashRoute ? createOfficialArtanisDashContinuationV1({route:dashRoute,melee,reactionAdapter}) : null;
  const standRoute = spatialState?.officialArtanisStandEnabled && reactionBundle?.routes.find(r => r.effectKind === 'ranged_attack_redirect');
  const targetReactions = includeTargetReactions || inheritedRangedHitDebuff || standRoute
    ? createOfficialAttackTargetReactionRuntimeV1({ ranged, reactionAdapter, reactionBundle,
      ...(includeTemplateAttacks ? { template: templateAttack } : {}),
      ...(includeMelee && includeTargetReactions ? { melee } : {}),
      ...(inheritedRangedHitDebuff ? { includeRangedDeclarationHitDebuff: true } : {}),
      ...(standRoute ? { standRoute, includeRedirectSelection: spatialState.officialArtanisRedirectSelection === true } : {}),
      includeNestedChoices: includePrecisionChoices || includeMelee,
      ...(ownsMeleeDamageContinuation ? { includeMeleeDamageContinuation: true } : {}),
      ...(ownsRangedDamageContinuation ? { includeRangedDamageContinuation: true } : {}),
      ...(consumeTemplatePayment ? { preserveTemplateDeclaration: true } : {}),
      ...(consumeCombatLifecycle ? { phaseBoundCombatCoexistence: true } : {}),
      ...(consumePayment && darkSwarmLifecycle ? { afterReaction: (result, before) => darkSwarmLifecycle.afterTransition(result, before) } : {}) }) : null;
  if (includeRavenSeekerPhaseEnd && (!includeRavenSeekerPaidImpact || !includeHits || !bundle)) {
    throw Error('RAVEN_SEEKER_PHASE_END_NATIVE_HITS_REQUIRED');
  }
  const seekerPhaseEnd = includeRavenSeekerPhaseEnd ? createOfficialRavenSeekerPhaseEndRuntimeV1({ rules: ravenSeekerRules,
    includeSharedOrder: additionalAssaultProviders }) : null;
  if (includeAdditionalAssaultEffectOrder && !includeSharedAssaultEffectOrder) throw Error('SHARED_ASSAULT_EFFECT_ORDER_REQUIRED');
  const orderProviders = includeSharedAssaultEffectOrder || releaseOrderedAssault ? [
    { kind: 'bile_resolution', owner: bileResolution },
    ...(additionalAssaultProviders ? [
      { kind: 'seeker_phase_end', owner: seekerPhaseEnd },
      { kind: 'sabotage_phase_end', owner: sabotageDronePhaseEnd },
      { kind: 'poisonous_essence_end', owner: poisonousEssence },
    ] : []),
  ].filter(entry => entry.owner) : [];
  if (includeReleaseBileAssaultOrder && (!bileResolution || includeSharedAssaultEffectOrder
    || spatialState.officialReleaseBileAssaultTiming !== spatialState.officialCorrosiveBileDamagePolicy.policyHash)) {
    throw Error('RELEASE_BILE_ASSAULT_TIMING_BINDING_REQUIRED');
  }
  if (includeReleaseMoundAssaultOrder && (!poisonousEssence || includeSharedAssaultEffectOrder
    || spatialState.officialReleaseMoundAssaultTiming !== spatialState.officialPoisonousEssencePolicy.policyHash)) {
    throw Error('RELEASE_MOUND_ASSAULT_TIMING_BINDING_REQUIRED');
  }
  const releaseAssaultOrder = releaseOrderedAssault ? createOfficialReleaseAssaultEffectOrderV1(orderProviders) : null;
  if (includeSharedAssaultEffectOrder && (!stormOrderSource || !orderProviders.length)) {
    throw Error('SHARED_ASSAULT_EFFECT_ORDER_PARTICIPANT_REQUIRED');
  }
  const stormMovementSource = includePsionicStormMovementPass
    ? context.dataset.recordsByKey['rules_sections:iuUyObNTQ2M8xK4IUqzC'] : null;
  if (includePsionicStormMovementPass && (!includePsionicStormPhaseEnd || !stormMovementSource)) {
    throw Error('PSIONIC_STORM_MOVEMENT_PASS_SOURCE_REQUIRED');
  }
  const stormSameNameSource = includePsionicStormEquivalentNameOverlap
    ? context.dataset.recordsByKey['rules_sections:H3Fn8YSvEvpJZpT57qw1'] : null;
  if (includePsionicStormEquivalentNameOverlap && (!includePsionicStormMovementPass || !stormSameNameSource)) {
    throw Error('PSIONIC_STORM_SAME_NAME_SOURCE_REQUIRED');
  }
  const stormControllingPlayerSource = includePsionicStormNamedOverlapChoices
    ? context.dataset.recordsByKey['rules_sections:FuahgilWtc8nccVSp2Vv'] : null;
  if (includePsionicStormNamedOverlapChoices && (!stormSameNameSource || !stormControllingPlayerSource)) {
    throw Error('PSIONIC_STORM_CONTROLLING_PLAYER_SOURCE_REQUIRED');
  }
  if (includePsionicStormAssaultSameName && (!includePsionicStormPhaseEnd || !stormOrderSource || !stormControllingPlayerSource)) {
    throw Error('PSIONIC_STORM_ASSAULT_SAME_NAME_SOURCE_REQUIRED');
  }
  const stormPhaseEnd = includePsionicStormPhaseEnd ? createOfficialPsionicStormPhaseEndV1({
    sourceRules: psionicStormSourceRules, geometry: stormCommunityGeometry, state: spatialState,
    includeDefence: includePsionicStormPhaseEndDefence, includeAssault: includePsionicStormAssaultDamage,
    ...(stormOrderSource ? { orderSource: stormOrderSource } : {}), orderProviders,
    ...(stormMovementSource ? { movementTimingSource: stormMovementSource } : {}),
    ...(stormSameNameSource ? { sameNameSource: stormSameNameSource } : {}),
    ...(stormControllingPlayerSource ? { controllingPlayerSource: stormControllingPlayerSource } : {}),
    includeAssaultSameName: includePsionicStormAssaultSameName,
  }) : null;
  const stormCast = includePsionicStormCast ? createOfficialPsionicStormCastRuntimeV1({
    sourceRules: psionicStormSourceRules, phaseEnd: stormPhaseEnd }) : null;
  const overwatchSource = reactionBundle?.routes.some(route => route.activationEndOwner === 'current_source_v1');
  const hitOwners = [photonEntry?.sourceAuthority, bileResolution?.sourceAuthority, sabotageDronePhaseEnd?.sourceAuthority,
    seekerPhaseEnd?.sourceAuthority, stormPhaseEnd?.sourceAuthority].filter(Boolean);
  const evadeGrantOwners = hitOwners.filter(owner => owner.evadeGrant);
  const hitsAuthority = hitOwners.length > 1 ? {
    schema: 'starcraft_tmg_automatic_hits_source_authority_v1',
    sourceBundleHash: hash(hitOwners.map(owner => owner.sourceBundleHash)), reactionTiming: 'outside_activation',
    ...(hitOwners.some(owner => owner.resolvedDirectDamage) ? { resolvedDirectDamage: true } : {}),
    ...(photonEntry ? {timingFor:parent=>hitOwners.find(owner=>owner.owns(parent))?.reactionTiming} : {}),
    owns: parent => hitOwners.some(owner => owner.owns(parent)),
    validate: (current, parent) => hitOwners.find(owner => owner.owns(parent))?.validate(current, parent) === true,
    ...(evadeGrantOwners.length ? { evadeGrant: {
      authorityHash: hash(evadeGrantOwners.map(owner => owner.evadeGrant.authorityHash)),
      applies: (current, parent, targetUnitId) =>
        hitOwners.find(owner => owner.owns(parent))?.evadeGrant?.applies(current, parent, targetUnitId) === true,
    } } : {}),
  } : hitOwners[0];
  if (includePsionicStormAssaultDamage && zagaraTransfusion && !hasOfficialFaqReactionPolicyV13(spatialState)) {
    throw Error('PSIONIC_STORM_OUTSIDE_ACTIVATION_REACTION_POLICY_REQUIRED');
  }
  const inheritedHitsDamage = includeReleaseInheritedHitsReactions && includeHits && reactionBundle?.routes.some(route =>
    route.triggerKind === 'damage_received' && ['unit:queen/transfusion-any-phase@1', 'unit:medic/life-support-any-phase@1'].includes(route.definitionId));
  const inheritedRestoration = includeReleaseInheritedHitsReactions && includeReleaseRosterActions && reactionBundle?.routes.some(route =>
    route.triggerKind === 'debuff_received' && route.effectKind === 'remove_debuffs');
  const transfusionHits = Boolean(zagaraTransfusion && includeHits
    && !['3.126.0', '3.127.0', '3.128.0', '3.129.0'].includes(context.resources.rulesRuntime?.runtimeVersion));
  if (includeAutomaticHitsDefenceContinuation && !includeBeforeHitsEvadeReaction) {
    throw Error('AUTOMATIC_HITS_BEFORE_EVADE_REQUIRED');
  }
  if (includeBeforeHitsEvadeReaction && (!includeHits || !reactionAdapter)) {
    throw Error('BEFORE_HITS_EVADE_STAGED_CONSUMER_REQUIRED');
  }
  const hits = includeHits || psiLightning || includePsionicStormAssaultDamage ? createOfficialAutomaticHitsRuntimeV1({ sourceBundle: bundle, state: spatialState, includeArmourReactions,
    includeDamageReceivedReaction: Boolean(medicLifeSupport || supportDamage) || inheritedHitsDamage || transfusionHits || Boolean((psiLightning || includePsionicStormAssaultDamage) && zagaraTransfusion)
      || includeBeforeHitsEvadeReaction && reactionBundle.routes.some(route => route.triggerKind === 'damage_received'),
    includeEvadeEligibility: Boolean(farsight) || includeBeforeHitsEvadeReaction,
    includeBeforeEvadeReaction: includeBeforeHitsEvadeReaction,
    consumeDefenceBeforeFollowUp: includeAutomaticHitsDefenceContinuation,
    independentlyOwnedReactionTriggers: [...(photonEntry ? ['reserve_entered_non_entry'] : []), ...(afterChargeRoll ? ['after_charge_roll'] : []), ...(spatialState?.officialReleaseDroneAssaultTiming
      && reactionBundle?.routes.some(route => route.chargeDeclarationOwner === 'current_source_v1') ? ['charge_declared'] : []),
      ...((standRoute || rangedDeclaration && headShotSource || includeReleaseBileAssaultOrder && inheritedRangedHitDebuff && targetReactions) ? ['ranged_attack_declared'] : []),
      ...(overwatchSource && (spatialState.officialTurretActivationEndOwner === 'overwatch_v1'
        || seekerCast && spatialState.officialSeekerAssaultTiming) ? ['unit_activation_ended'] : []),
      ...(hiddenLossReactions ? ['hidden_lost'] : []),
      ...(postPlaceReactions ? ['after_place'] : []), ...(targetReactions ? ['attack_target_selected'] : []),
      ...(friendlySupplyLossReaction ? ['friendly_supply_reduced'] : []),
      ...(ancestralWisdom ? ['ability_cost_payment'] : []),
      ...((includeBeforeHitsEvadeReaction || includeIndependentRangedLungeOwner) && lunge ? ['after_ranged_attack_resolved'] : []),
      ...((inheritedRestoration || includeBeforeHitsEvadeReaction && reactionBundle.routes.some(route => route.triggerKind === 'debuff_received'))
        ? ['debuff_received'] : [])],
    ...(hitsAuthority ? { sourceAuthority: hitsAuthority } : {}) }) : null;
  const hitsChoices = includeHits ? createOfficialAutomaticHitsPoolChoiceRuntimeV1({ delegate: hits,
    includeBeforeEvadeReaction: includeBeforeHitsEvadeReaction,
    ...(includeArmourReactions || includeBeforeHitsEvadeReaction ? { reactionAdapter, reactionBundle } : {}) }) : null;
  const weaponBundle = weaponDefinitionIds.length ? createOfficialRangedFamilySourceBundleV2({ catalogue: source,
    definitionIds: weaponDefinitionIds, attackProfileCatalogue: spatialState?.officialAttackProfileCatalogue }) : null;
  if (headShotSource && (!ranged || !actionStatusLifecycle
    || !weaponBundle?.definitionIds.includes('unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1'))) {
    throw Error('HEAD_SHOT_WEAPON_AND_STATUS_CONSUMERS_REQUIRED');
  }
  const cardRefreshSource = characteristicRoutes.some(route => route.effectKind === 'ranged_card_refresh');
  if (cardRefreshSource && (!ranged || !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle)
    || !weaponBundle?.definitionIds.includes('unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1'))) {
    throw Error('RANGED_CARD_REFRESH_NATIVE_CONSUMERS_REQUIRED');
  }
  const cardRefresh = cardRefreshSource ? createOfficialRangedCardRefreshRuntimeV1({ context, bundle, state: spatialState,
    hasUnsettledAction: current => Boolean(current.pendingAction || current.pendingCurrentProductRangedCasualtyChoice
      || current.pendingOfficialReactionWindow || precisionChoices?.hasPending(current)
      || targetReactions?.pending(current) || pointDefenseChoices?.hasPending(current)
      || hiddenLossReactions?.pending(current) || rangedDeclaration?.pending(current)
      || summonedActions?.pending(current)) }) : null;
  const bombardReplacement = spatialState?.officialBombardReplacementPolicy ? createOfficialBombardReplacementRuntimeV1({ context,
    state: spatialState, hasUnsettledAttack: current => Boolean(current.pendingAction || current.pendingCurrentProductRangedCasualtyChoice
      || current.pendingOfficialReactionWindow || precisionChoices?.hasPending(current) || targetReactions?.pending(current)
      || pointDefenseChoices?.hasPending(current) || hiddenLossReactions?.pending(current) || rangedDeclaration?.pending(current)) }) : null;
  const bombardRemovalLifecycle = Boolean(spatialState?.officialBombardRemovalLifecyclePolicy);
  if (bombardReplacement && !bombardTargeting) throw Error('BOMBARD_REPLACEMENT_TARGETING_CONSUMER_REQUIRED');
  if (weaponBundle || meleeWeaponBundle) weaponAdapter = createOfficialRosterWeaponComponentAdapterV1({ bundle: weaponBundle,
    meleeBundle: meleeWeaponBundle, delegates: { ranged, template: templateAttack, melee } });
  const registeredKhassar = includeKhassarRegisteredExecution ? createOfficialKhassarAbilityAdapterV1({
    eligibility: khassarEligibility,
    legalSpace: (state, options) => ({
      candidates: [],
      parameterDomains: enumerate(state, options).parameterDomains.filter(domain =>
        domain.definitionId === khassarEligibility.descriptor.definitionId),
      unsupportedDiagnostics: [],
    }),
    preview: (state, request) => instantiateKhassarDomain(state, request.domain, request.parameters),
    apply: (state, request) => applyKhassarDeclaration(state, request.action, request.options),
    query: queryKhassarEligibility,
  }) : null;
  const registeredStorm = selectedStormDefinitionIds?.length ? createOfficialRegisteredStormCastAdapterV1({
    sourceRules: psionicStormSourceRules, castRuntime: stormCast,
    legalSpace: (state, options) => ({ candidates: [], unsupportedDiagnostics: [],
      parameterDomains: enumerate(state, options).parameterDomains.filter(domain => domain.sourceRuntimeKind === 'storm_cast') }),
    preview: (state, {domain, parameters}) => {
      if (domain?.sourceRuntimeKind !== 'storm_cast') throw Error('PSIONIC_STORM_CAST_DOMAIN_REQUIRED');
      return instantiate(state, domain, parameters);
    },
    apply: (state, {action, options}) => {
      if (action?.sourceRuntimeKind !== 'storm_cast') throw Error('PSIONIC_STORM_CAST_ACTION_REQUIRED');
      return apply(state, action, options);
    },
    query: (state, request) => {
      if (![stormCast.descriptor.queryKind, stormPhaseEnd.descriptor.queryKind, psionicStormSourceRules.descriptor.queryKind]
        .includes(request?.queryKind)) throw Error('PSIONIC_STORM_QUERY_REQUIRED');
      return query(state, request);
    },
  }) : null;
  const selectedAbilitySource = spatialState?.officialSelectedRosterAbilitySourceBundle;
  const selectedAbilityAdapter = includeReleaseRosterActions && selectedAbilitySource?.compilerScope === 'explicit_source_subset'
    ? createOfficialSelectedRosterAbilityAdapterV1(selectedAbilitySource) : null;
  if (selectedAbilityAdapter && commanderAdapter) throw Error('CHARACTERISTIC_SELECTED_ABILITY_OWNER_OVERLAP');
  const selectedAbilityBindings = selectedAbilityAdapter ? createOfficialSelectedRosterAbilityDefinitionBindingsV1(selectedAbilitySource) : [];
  const rangedModifierSource = includeReleaseRosterActions ? spatialState?.officialRangedFamilySourceBundle : null;
  const rangedModifierAdapter = rangedModifierSource && createOfficialRangedModifierComponentAdapterV1(rangedModifierSource,
    { includePointDefense: includePointDefenseChoices });
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ ...args,
    executionBindings: [...(structureAdapter?.definitionBindings || []), ...(decoyAdapter?.definitionBindings || []), ...(bundle ? createOfficialCharacteristicStatusFamilyDefinitionBindingsV1(bundle) : []),
      ...(holoRoundEnd?.definitionBindings || []),
      ...(bile?.definitionBindings || []),
      ...(bombard?.definitionBindings || []),
      ...(darkSwarmPlacement?.definitionBindings || []),
      ...(consumePayment?.definitionBindings || []),
      ...(commanderAdapter?.definitionBindings || []), ...selectedAbilityBindings, ...(rangedModifierAdapter?.definitionBindings || []),
      ...(zagaraPsionicLinkAdapter?.definitionBindings || []), ...(queenPsionicLinkAdapter?.definitionBindings || []), ...(furyAdapter?.definitionBindings || []),
      ...(plague?.definitionBindings || []),
      ...(psionic?.definitionBindings || []),
      ...(personalTransport?.definitionBindings || []),
      ...(unitLifecycleBundle ? createOfficialUnitLifecycleFamilyDefinitionBindingsV1(unitLifecycleBundle) : []),
      ...(terranSupplyBundle ? createOfficialTerranUniqueFamilyDefinitionBindingsV1(terranSupplyBundle) : []),
      ...(zergUniqueBundle ? createOfficialZergUniqueFamilyDefinitionBindingsV1(zergUniqueBundle) : []),
      ...(khalaiBundle ? createOfficialProtossUniqueFamilyDefinitionBindingsV1(khalaiBundle) : []),
      ...(relocationBundle ? createOfficialRelocationFamilyDefinitionBindingsV1(relocationBundle) : []),
      ...(reactionBundle ? createOfficialReactionFamilyDefinitionBindingsV1(reactionBundle) : []),
      ...(meleeModifierAdapter?.definitionBindings || []), ...(battlefieldModifierAdapter?.definitionBindings || []),
      ...(weaponAdapter?.definitionBindings || []), ...(registeredStorm?.definitionBindings || []), ...(registeredKhassar?.definitionBindings || [])] });
  const router = createOfficialAbilityEffectRuntimeV1({ catalogue, adapters: [...(structureAdapter ? [structureAdapter] : []), ...(decoyAdapter ? [decoyAdapter] : []), ...(adapter ? [adapter] : []),
    ...(consumePayment ? [consumePayment] : []),
    ...(commanderAdapter ? [commanderAdapter] : []),
    ...(selectedAbilityAdapter ? [selectedAbilityAdapter] : []), ...(rangedModifierAdapter ? [rangedModifierAdapter] : []),
    ...(zagaraPsionicLinkAdapter ? [zagaraPsionicLinkAdapter] : []), ...(queenPsionicLinkAdapter ? [queenPsionicLinkAdapter] : []), ...(furyAdapter ? [furyAdapter] : []),
    ...(plague ? [plague] : []),
    ...(holoRoundEnd ? [holoRoundEnd] : []),
    ...(personalTransport ? [personalTransport] : []),
    ...(bile ? [bile] : []),
    ...(bombard ? [bombard] : []),
    ...(darkSwarmPlacement ? [darkSwarmPlacement] : []),
    ...(psionic ? [psionic] : []),
    ...(relocationAdapter ? [relocationAdapter] : []),
    ...(unitLifecycleAdapter ? [unitLifecycleAdapter] : []),
    ...(terranSupplyAdapter ? [terranSupplyAdapter] : []),
    ...(zergUniqueAdapter ? [zergUniqueAdapter] : []),
    ...(khalaiAdapter ? [khalaiAdapter] : []),
    ...(reactionAdapter ? [reactionAdapter] : []),
    ...(meleeModifierAdapter ? [meleeModifierAdapter] : []), ...(battlefieldModifierAdapter ? [battlefieldModifierAdapter] : []), ...(weaponAdapter ? [weaponAdapter] : []),
    ...(registeredStorm ? [registeredStorm] : []), ...(registeredKhassar ? [registeredKhassar] : [])] });
  const pendingTemplateRoutes = (ranged?.descriptor.pendingTemplateRoutes || []).filter(row =>
    !templateAttack?.descriptor.routes.some(route => route.pieceId === row.pieceId && route.profileKey === row.profileKey));
  const actionStatusVersion = actionStatusLifecycle
    ? { '1.0.0': '3.32.0', '1.1.0': '3.33.0', '1.2.0': '3.67.0' }[spatialState.officialActionStatusLifecyclePolicy.version] : null;
  const currentCharacteristicConsumers = hasOfficialCharacteristicConsumerPolicyV1(spatialState);
  const targetedMeleeCritical = characteristicRoutes.some(route => route.effectKind === 'targeted_melee_critical');
  const markedTargetFirstWeapon = characteristicRoutes.some(route => route.effectKind === 'marked_target_first_weapon');
  if (markedTargetFirstWeapon && (!ranged || !melee || !precisionChoices
    || !currentCharacteristicConsumers)) {
    throw Error('MARK_FOR_DEATH_ALL_WEAPONS_CONSUMER_REQUIRED');
  }
  const markerAreas = characteristicRoutes.some(route => route.effectKind === 'marker_speed_debuff');
  const coordinatedStrike = characteristicRoutes.some(route => route.effectKind === 'coordinated_strike');
  const currentCoordinatedStrike = hasOfficialCoordinatedStrikeCurrentConsumerV1(spatialState);
  if (coordinatedStrike && !currentCoordinatedStrike
    && context.resources.rulesRuntime.runtimeVersion === '3.54.0') throw Error('COORDINATED_STRIKE_CURRENT_CONSUMER_REQUIRED');
  if (coordinatedStrike && (!ranged || !templateAttack)) throw Error('COORDINATED_STRIKE_TEMPLATE_CONSUMER_REQUIRED');
  if (spatialState?.characteristicAreaEffects?.length && !markerAreas) throw Error('CHARACTERISTIC_AREA_SOURCE_BUNDLE_REQUIRED');
  if (markerAreas && !currentCharacteristicConsumers) throw Error('CHARACTERISTIC_AREA_MOVEMENT_CONSUMER_REQUIRED');
  const targetReactionOwnerComposition = fixedEvadeSource && (Boolean(hiddenLossReactions) || includeHits);
  const stationaryFirstRanged = characteristicRoutes.some(route => route.requiresStationary === true
    && route.effectKind === 'first_weapon_keyword' && route.weaponScope === 'ranged');
  if (stationaryFirstRanged && (!ranged || !precisionChoices)) {
    throw Error('STATIONARY_FIRST_RANGED_PRECISION_CONSUMER_REQUIRED');
  }
  if (stationaryFirstRanged && !spatialState.officialSiegeModeDataBundle
    && context.resources.rulesRuntime.runtimeVersion === '3.57.0') {
    throw Error('STATIONARY_FIRST_RANGED_MODE_DEPENDENCY_REQUIRED');
  }
  const cleanupHiddenLoss = Boolean(spatialState?.officialCharacteristicConsumerPolicy?.cleanupHiddenLossBeforeRefresh);
  const cleanupConsumerReady = (cleanupHiddenLoss ? Boolean(hiddenLossReactions) : Boolean(holoRoundEnd))
    || bombardRemovalLifecycle && !reactionBundle?.routes.some(route => route.effectKind === 'hidden_loss_might')
    || darkSwarmLifecycle && (!cleanupHiddenLoss || releaseZergTargets)
      && !reactionBundle?.routes.some(route => route.effectKind === 'hidden_loss_might')
    || registeredStorm && !reactionBundle?.routes.some(route => route.effectKind === 'hidden_loss_might')
    || (guardianShield || forceWallTraversal || executorsWill || khalasGift || ourMindsAsOne || ourDutyIsUnending || ravenMissile) && !cleanupHiddenLoss;
  const cleanupContinuation = spatialState?.officialCleanupContinuationPolicy ? createOfficialCleanupContinuationRuntimeV1({
    context, policy: spatialState.officialCleanupContinuationPolicy,
    expire: current => {
      if (!cleanupConsumerReady) {
        throw Error('CLEANUP_CONTINUATION_HIDDEN_CONSUMER_REQUIRED');
      }
      if (psionicRoundEnd && (psionicRoundEnd.pending(current) || psionicRoundEnd.hasOutstanding(current))) {
        throw Error('PSIONIC_TRANSFER_ROUND_END_CHOICES_REQUIRED');
      }
      const prepared = psionicRoundEnd ? psionicRoundEnd.cleanup(current) : current;
      const expired = router.dispatch({ operation: 'lifecycle', state: prepared, request: { eventKind: 'cleanup_and_refresh' } });
      return bombardRemovalLifecycle ? bombardReplacement.prepareCleanup(expired) : expired;
    },
    finalizeEffects: current => {
      const afterStorm = includePsionicStormTokenCleanup ? cleanupOfficialPsionicStormTokensV1(current) : current;
      const finalized = bombardRemovalLifecycle ? bombardReplacement.cleanupTokens(afterStorm)
        : darkSwarmLifecycle ? darkSwarmLifecycle.cleanup(afterStorm) : afterStorm;
      return activation.cleanup(finalized);
    },
    refresh: current => refreshOfficialReleaseRosterDerivedStateV2({ context, state: current }),
    hasPendingReaction: current => Boolean(hiddenLossReactions?.pending(current) || current.pendingOfficialReactionWindow
      || bombardRemovalLifecycle && bombardReplacement.pending(current)),
  }) : null;
  if (includePsionicStormTokenCleanup && (!includePsionicStormCast || !cleanupContinuation)) {
    throw Error('PSIONIC_STORM_CLEANUP_CONSUMER_REQUIRED');
  }
  if (cleanupContinuation && !cleanupConsumerReady) {
    throw Error('CLEANUP_CONTINUATION_HIDDEN_CONSUMER_REQUIRED');
  }
  const superStimpack = characteristicRoutes.some(route => route.abilityName === 'Super Stimpack');
  const griffinSupport = unitLifecycleBundle?.definitionIds.includes('card:nova_covert_ops/griffin-support-any@1');
  if (griffinSupport && !generatedUnits?.profiles.some(profile => profile.recordKey === 'army_units:sabotage_drone')) {
    throw Error('GRIFFIN_SUPPORT_GENERATED_UNIT_SOURCE_REQUIRED');
  }
  const suppressionShells = reactionBundle?.routes.some(route => route.chargeDeclarationOwner === 'current_source_v1');
  const chargeDeclaration = suppressionShells ? createOfficialChargeDeclarationReactionRuntimeV1({
    state: spatialState, reactionAdapter, melee,
    ...(includeKhassarChargeDeclaration ? { projectReadyState: (state, declaration) =>
      khassarCharge.projectDeclaredRoll(state, declaration) } : {}),
  }) : null;
  if (spatialState.pendingOfficialChargeDeclaration && !chargeDeclaration) {
    throw Error('CHARGE_DECLARATION_REACTION_SOURCE_REQUIRED');
  }
  if (overwatchSource && (!ranged || !precisionChoices || !includeArmourChoices || !activation
    || !structureSource?.definitionIds.includes('unit:auto_turret/structure-any-phase@1')
    || !weaponBundle?.definitionIds.includes(OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID))) {
    throw Error('OVERWATCH_WEAPON_STRUCTURE_AND_DEFENCE_CONSUMERS_REQUIRED');
  }
  const overwatch = overwatchSource ? createOfficialAutoTurretOverwatchRuntimeV1({
    state: spatialState, reactionAdapter,
    hasUnsettledAction: current => Boolean(current.pendingAction || current.pendingCurrentProductRangedCasualtyChoice
      || current.pendingCurrentProductRangedSequence || current.pendingOfficialReactionWindow
      || precisionChoices?.hasPending(current) || pointDefenseChoices?.pending(current)
      || meleeChoices?.hasPending(current) || hitsChoices?.hasPending(current) || cardRefresh?.pending(current)),
  }) : null;
  if (spatialState.pendingOfficialAutoTurretOverwatch && !overwatch) throw Error('OVERWATCH_SOURCE_REQUIRED');
  const ravenDeployTurret = unitLifecycleBundle?.routes.find(row => row.definitionId === OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID);
  if (ravenDeployTurret && (!overwatch || !generatedUnits?.profiles.some(profile => profile.recordKey === 'army_units:auto_turret')
    || !holoRoundEndSource?.definitionIds.includes('unit:auto_turret/timed-life-any-phase@1'))) {
    throw Error('RAVEN_DEPLOY_AUTO_TURRET_CONSUMERS_REQUIRED');
  }
  const ravenTurretShrapnel = characteristicRoutes.find(route => route.definitionId === OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID);
  if (ravenTurretShrapnel && !ravenDeployTurret) throw Error('RAVEN_TURRET_SHRAPNEL_DEPLOYMENT_SOURCE_REQUIRED');
  const commandoStimpack = characteristicRoutes.some(route =>
    route.definitionId === 'unit:spec_ops_marauder__marauder_/commando-stimpack-movement-phase@1');
  const specOpsArmour = characteristicRoutes.some(route =>
    route.definitionId === 'unit:spec_ops_marauder__marauder_/spec-ops-armour-any-phase@1');
  const specOpsWeapons = [...(weaponBundle?.definitionIds || []), ...(meleeWeaponBundle?.definitionIds || [])]
    .some(id => id.startsWith('unit:spec_ops_marauder__marauder_/'));
  const specOpsFoundation = commandoStimpack || specOpsArmour || specOpsWeapons;
  const magrailMunitions = characteristicRoutes.some(route =>
    route.effectKind === 'first_game_weapon_pierce');
  if (magrailMunitions && (!ranged || !weaponBundle?.definitionIds.includes(
    'unit:spec_ops_marauder__marauder_/quad-k12-assault-phase@1'))) {
    throw Error('MAGRAIL_MUNITIONS_QUAD_CONSUMER_REQUIRED');
  }
  if (commandoStimpack && (!ranged || !melee || !precisionChoices || !currentCharacteristicConsumers)) {
    throw Error('COMMANDO_STIMPACK_ALL_WEAPONS_CONSUMER_REQUIRED');
  }
  if (specOpsArmour && !actionStatusLifecycle) throw Error('SPEC_OPS_ARMOUR_ACTION_LIFECYCLE_REQUIRED');
  if (superStimpack && (!ranged || !melee || !precisionChoices || !currentCharacteristicConsumers)) {
    throw Error('SUPER_STIMPACK_ALL_WEAPONS_CONSUMER_REQUIRED');
  }
  const novaVision = characteristicRoutes.some(route => ['Ghost Visor', 'Tactical Stealth Suit'].includes(route.abilityName));
  const detectionHiddenLoss = hasOfficialDetectionHiddenLossPolicyV1(spatialState);
  if (detectionHiddenLoss && (!currentCharacteristicConsumers
    || !spatialState.officialCharacteristicConsumerPolicy.hiddenRangedTargeting
    || !characteristicRoutes.some(route => route.effectKind === 'detection_aura'))) {
    throw Error('DETECTION_HIDDEN_LOSS_CONSUMERS_REQUIRED');
  }
  if (novaVision && (!ranged || !currentCharacteristicConsumers
    || !spatialState.officialCharacteristicConsumerPolicy.hiddenRangedTargeting
    || characteristicRoutes.some(route => route.abilityName === 'Ghost Visor') && !detectionHiddenLoss)) {
    throw Error('NOVA_VISION_CONSUMERS_REQUIRED');
  }
  const ravenCorvid = characteristicRoutes.find(route => route.definitionId === OFFICIAL_RAVEN_CORVID_REACTOR_DEFINITION_ID);
  if (ravenCorvid && !ravenMissile) throw Error('RAVEN_CORVID_REACTOR_TARGETED_ABILITY_CONSUMER_REQUIRED');
  if (ravenMissile && (!ranged || !melee || !currentCharacteristicConsumers
    || !spatialState?.officialTerrainLosDataBundle || !hasOfficialStructureTargetingPolicyV13(spatialState)
    || !targetedAbilityPolicy?.definitionIds.includes(ravenMissile.definitionId))) {
    throw Error('RAVEN_ANTI_ARMOUR_MISSILE_NATIVE_CONSUMERS_REQUIRED');
  }
  const ravenDetection = characteristicRoutes.some(route => route.definitionId === 'unit:raven/detection-any-phase@1');
  const bileLauncherDetection = characteristicRoutes.some(route => route.definitionId === 'unit:bile_launcher/detection-any-phase@1');
  const bileLauncherCreep = battlefieldModifierBundle?.definitionIds.includes('unit:bile_launcher/source-of-creep-any-phase@1');
  if (bileLauncherDetection && !detectionHiddenLoss) throw Error('BILE_LAUNCHER_DETECTION_CONSUMER_REQUIRED');
  if (ravenDetection && (!ranged || !currentCharacteristicConsumers || !detectionHiddenLoss
    || !spatialState.officialCharacteristicConsumerPolicy.hiddenRangedTargeting)) {
    throw Error('RAVEN_DETECTION_HIDDEN_LOSS_CONSUMERS_REQUIRED');
  }
  const lethalHologram = characteristicRoutes.some(route => route.effectKind === 'target_near_source_weapon_keyword');
  if (lethalHologram && (!ranged || !melee || !precisionChoices || !currentCharacteristicConsumers
    || !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle))) {
    throw Error('LETHAL_HOLOGRAM_ALL_WEAPONS_CONSUMER_REQUIRED');
  }
  const twilightWarpIn = relocationBundle?.definitionIds.includes('unit:twilight_templar__high_templar_/warp-in-movement-phase@1');
  const phaseReactorSuit = relocationBundle?.routes.some(route => route.definitionId === 'unit:nova_assault_mode/phase-reactor-suit-assault-phase@1') === true;
  const novaWeaponRegistration = weaponBundle?.routes.some(route => ['unit:nova_assault_mode/hellfire-shotgun-assault-phase@1',
    'unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1'].includes(route.definitionId));
  const novaCharge = meleeModifierBundle?.definitionIds.includes('unit:nova_assault_mode/devastating-charge-assault-phase@1');
  if (novaCharge && !hasOfficialImpactAllocationPolicyV13(spatialState)) throw Error('NOVA_CHARGE_IMPACT_ALLOCATION_POLICY_REQUIRED');
  const zagaraImpactId = 'unit:zagara/devastating-charge-assault-phase@1';
  const zagaraIndomitable = characteristicRoutes.find(route =>
    route.definitionId === 'unit:zagara/indomitable-assault-phase@1');
  if (zagaraIndomitable && !ranged) throw Error('ZAGARA_INDOMITABLE_RANGED_CONSUMER_REQUIRED');
  const zagaraBroodmother = characteristicRoutes.find(route => route.effectKind === 'broodmother_army_buff');
  if (farsight && (!ranged || !melee || !currentCharacteristicConsumers
    || !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle))) {
    throw Error('FARSIGHT_ATTACK_CONSUMERS_REQUIRED');
  }
  const scourgeQueen = characteristicRoutes.find(route => route.effectKind === 'scourge_queen');
  if (scourgeQueen && (!melee || !currentCharacteristicConsumers
    || !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle))) {
    throw Error('SCOURGE_QUEEN_MELEE_CONSUMER_REQUIRED');
  }
  const ravenInternalTechModule = characteristicRoutes.find(route =>
    route.definitionId === OFFICIAL_RAVEN_INTERNAL_TECH_MODULE_DEFINITION_ID);
  if (ravenInternalTechModule && (!spatial || !spatialState.officialDeploymentGeometryBinding
    || !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle))) {
    throw Error('RAVEN_INTERNAL_TECH_MODULE_SPATIAL_SOURCE_REQUIRED');
  }
  const zagaraInfestedDrop = characteristicRoutes.find(route => route.effectKind === 'infested_drop_entry_edge');
  if (zagaraInfestedDrop && (!spatial
    || !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle))) {
    throw Error('ZAGARA_INFESTED_DROP_SPATIAL_SOURCE_REQUIRED');
  }
  if (zagaraBroodmother && (!ranged || !melee || !precisionChoices || !includeArmourChoices
    || !currentCharacteristicConsumers)) {
    throw Error('ZAGARA_BROODMOTHER_COMBAT_CONSUMERS_REQUIRED');
  }
  const zagaraCombatDefinitionIds = [
    ...(weaponBundle?.definitionIds || []), ...(meleeWeaponBundle?.definitionIds || []),
    ...(meleeModifierBundle?.definitionIds || []), ...(zagaraIndomitable ? [zagaraIndomitable.definitionId] : []),
  ].filter(id => id.startsWith('unit:zagara/'));
  if (zagaraCombatDefinitionIds.includes(zagaraImpactId) && !hasOfficialImpactAllocationPolicyV13(spatialState)) {
    throw Error('ZAGARA_CHARGE_IMPACT_ALLOCATION_POLICY_REQUIRED');
  }
  const vilelingPrefix = 'unit:vileling__zergling_/';
  const bileLauncherBurrow = relocationBundle?.definitionIds.includes('unit:bile_launcher/burrow-ambush-movement-phase@1');
  const bileLauncherWeapon = weaponBundle?.definitionIds.includes('unit:bile_launcher/bile-bomb-assault-phase@1');
  const pinpointEngagement = hasOfficialPinpointEngagementPolicyV1(spatialState);
  if (pinpointEngagement) createOfficialPinpointEngagementPolicyV1({ context });
  if (bileLauncherWeapon && (!ranged || !precisionChoices || !includeArmourChoices)) {
    throw Error('BILE_BOMB_RANGED_DEFENCE_CONSUMERS_REQUIRED');
  }
  const unitRestrictions = characteristicRoutes.some(route => ['unit_restrictions', 'cannot_gain_burrowed'].includes(route.effectKind));
  const tunnelNetwork = unitLifecycleBundle?.definitionIds.includes('card:defiler_mound/tunnel-network-any@1');
  if (unitRestrictions && !isDeepStrictEqual(bundle, spatialState.officialCharacteristicStatusFamilySourceBundle)) {
    throw Error('UNIT_RESTRICTION_SOURCE_BINDING_INVALID');
  }
  if (unitRestrictions && !melee) throw Error('UNIT_RESTRICTION_IMPACT_CONSUMER_REQUIRED');
  const damageHitDebuff = characteristicRoutes.some(route => route.effectKind === 'damage_inflicted_weapon_hit_debuff');
  if (damageHitDebuff && (!melee || !ranged)) throw Error('VILELING_HIT_DEBUFF_CONSUMERS_REQUIRED');
  const vilelingFoundation = [...characteristicRoutes.map(route => route.definitionId),
    ...(meleeModifierBundle?.definitionIds || []), ...(meleeWeaponBundle?.definitionIds || [])]
    .some(id => id.startsWith(vilelingPrefix));
  const defilerMeleeDefinitionIds = [
    ...(meleeModifierBundle?.definitionIds || []), ...(meleeWeaponBundle?.definitionIds || []),
  ].filter(id => ['unit:defiler/devastating-charge-assault-phase@1', 'unit:defiler/claws-combat-phase@1'].includes(id));
  const defilerMeleeFoundation = defilerMeleeDefinitionIds.length > 0;
  if (defilerMeleeDefinitionIds.includes('unit:defiler/devastating-charge-assault-phase@1')
    && !hasOfficialImpactAllocationPolicyV13(spatialState)) throw Error('DEFILER_IMPACT_ALLOCATION_POLICY_REQUIRED');
  if (characteristicRoutes.some(route => route.definitionId === vilelingPrefix + 'metabolic-boost-assault-phase@1')
    && (!melee || !currentCharacteristicConsumers)) throw Error('VILELING_CHARGE_CONSUMER_REQUIRED');
  if (meleeModifierBundle?.definitionIds.includes(vilelingPrefix + 'devastating-charge-assault-phase@1')
    && !hasOfficialImpactAllocationPolicyV13(spatialState)) throw Error('VILELING_IMPACT_ALLOCATION_POLICY_REQUIRED');
  const componentVersion = poisonousEssence ? '3.124.0' : meleeSidearm ? '3.123.0' : nonLethalStandardDamage ? '3.122.0' : plague ? '3.121.0' : plagueCoverage ? '3.120.0' : consumeCombatLifecycle ? '3.119.0' : survivingTemplateModels ? '3.118.0' : consumeTemplatePayment ? '3.117.0' : consumePayment ? '3.116.0' : defilerMeleeFoundation ? '3.115.0' : darkSwarmReaction && hasOfficialFaqReactionPolicyV13(spatialState) ? '3.114.0' : consumePaymentSource ? '3.113.0' : darkSwarmReaction ? '3.112.0' : darkSwarmLifecycle ? '3.111.0' : darkSwarmPlacement ? '3.110.0' : defilerBurrow ? '3.109.0' : battlefieldDisplacementSource ? '3.108.0' : bombardRemovalLifecycle ? '3.107.0' : bombardReplacement ? '3.106.0' : bombardTargeting ? '3.105.0' : bombard ? '3.104.0' : pinpointEngagement ? '3.103.0' : bileLauncherWeapon ? '3.102.0' : unitRestrictions || tunnelNetwork ? '3.101.0' : bileLauncherBurrow ? '3.100.0' : bileLauncherDetection || bileLauncherCreep ? '3.99.0' : damageHitDebuff ? '3.98.0' : vilelingBurrow ? '3.97.0' : vilelingRespawn ? '3.96.0' : vilelingFoundation ? '3.95.0' : markedTargetFirstWeapon ? '3.94.0' : overwatch ? '3.93.0' : holoRoundEndSource?.version === '1.1.0' ? '3.92.0' : sabotageDronePhaseEnd ? '3.91.0' : structureSource ? '3.90.0' : griffinSupport ? '3.89.0' : suppressionShells ? '3.88.0' : magrailMunitions ? '3.87.0' : specOpsFoundation ? '3.86.0' : headShotSource ? '3.85.0' : cardRefresh ? '3.84.0' : novaCharge ? '3.83.0' : novaWeaponRegistration ? '3.82.0' : ravenDetection ? '3.81.0' : holoRoundEnd ? '3.80.0' : sourcePhasePolicy ? '3.79.0' : summonedCombatEligibility ? '3.78.0' : lethalHologram ? '3.77.0' : decoySource ? '3.76.0' : holoSummon ? '3.75.0' : generatedUnits ? '3.74.0' : phaseReactorSuit ? '3.73.0' : novaVision || detectionHiddenLoss ? '3.72.0' : superStimpack ? '3.71.0' : alloyArmourSource ? '3.70.0' : cleanupContinuation ? '3.69.0' : personalTransport ? '3.68.0' : voidSeekerHidden && spatialState.officialActionStatusLifecyclePolicy.version === '1.2.0' ? '3.67.0' : voidSeekerHidden ? '3.66.0' : largeMovementSource ? '3.65.0' : deepTunnel ? '3.64.0' : vehiclePlatingSource ? '3.63.0' : psionicSourceDestruction ? '3.62.0' : cocoonMorph ? '3.61.0' : cocoonRespawn ? '3.60.0' : plasmaArmourSource ? '3.58.0' : stationaryFirstRanged ? spatialState.officialSiegeModeDataBundle ? '3.57.0' : '3.56.0' : rangedDeclaration ? '3.55.0' : currentCoordinatedStrike ? '3.54.0' : coordinatedStrike ? '3.53.0' : modeBoundTargeting ? '3.52.0' : markerAreas ? '3.51.0' : targetReactionOwnerComposition ? '3.50.0' : spatialState?.officialCharacteristicConsumerPolicy?.hiddenRangedTargeting === true ? '3.49.0' : fixedEvadeSource ? '3.48.0' : targetedMeleeCritical ? '3.47.0' : characteristicRoutes.some(route => route.effectKind === 'hidden_after_action') ? '3.46.0' : spatialState?.officialCharacteristicConsumerPolicy?.cleanupHiddenLossBeforeRefresh ? '3.45.0' : closeRanksReactions ? '3.44.0' : outsidePlaceReactions ? '3.43.0' : currentCharacteristicConsumers ? '3.42.0' : hiddenLossReactions ? '3.41.0' : psionicPlaceReactions ? '3.40.0' : spatialState?.officialPsionicDisplacementPolicy?.movementQueriesReady ? '3.39.0' : spatialState?.officialPsionicDisplacementPolicy?.closeRanksConsumerReady ? '3.38.0' : displacement ? '3.37.0' : displacementQuery ? '3.36.0' : psionicRoundEnd ? '3.35.0' : psionic ? '3.34.0' : actionStatusVersion || (bileUpgrades ? '3.31.0' : bileResolution ? bileResolution.descriptor.outsideActivationReactions ? '3.30.0' : '3.28.0' : bile ? '3.27.0' : reservePlaceSource ? '3.26.0' : semanticSpatialQueries ? '3.25.0' : relocationBundle ? '3.24.0' : shieldedLifecycle ? '3.23.0' : unitLifecycleBundle ? '3.22.0' : targetReactions && pointDefenseChoices ? '3.21.0' : includeHits && includeArmourReactions ? '3.20.0' : targetReactions && includeMelee ? '3.19.0' : meleeArmourReactions ? '3.18.0' : targetReactions && includeTemplateAttacks ? '3.17.0' : includeArmourReactions && includeTemplateAttacks ? '3.16.0' : includeTemplateBatchOrder ? allowsOfficialTemplateAdaptiveBatchOrderV13(spatialState) ? '3.15.0' : '3.14.0' : targetReactions ? includePrecisionChoices ? '3.13.0' : '3.12.0' : targetDamageCapSource ? '3.11.0' : meleeWeaponBundle ? '3.10.0' : indomitableRanged ? '3.9.0' : characteristicRoutes.some(route => route.weaponCondition) ? '3.8.0'
    : includeArmourReactions ? '3.7.0' : reactionAdapter ? '3.6.0' : battlefieldModifierAdapter ? '3.5.0' : includeArmourOrdinals ? '3.4.0' : includeHits ? '3.3.0' : meleeModifierAdapter ? legacyImpactCatalogue ? '3.2.0' : '3.2.1'
    : includeMelee ? impactPolicyAtoms.length ? '3.1.1' : '3.1.0' : includeArmourChoices ? '3.0.0' : characteristicRoutes.some(route => route.effectKind === 'target_size_damage') ? '2.9.0'
    : weaponAdapter ? '2.8.0' : pointDefenseChoices ? '2.7.0' : precisionChoices ? '2.6.0' : templateAttack ? '2.5.0' : templateCoverage ? '2.4.0' : ranged ? '2.3.1' : largeRemoval ? '2.2.0' : spatial ? '2.1.0' : runtimeVersion);
  const khassarOverwatch = includeKhassarEndActivationOverwatch && includeReleaseKhassar
    && overwatch?.descriptor.triggerKind === 'unit_activation_ended' && overwatch.descriptor.outsideActivation;
  if (includeKhassarSpatialExecution && (overwatch && !khassarOverwatch || hiddenLossReactions)) {
    throw Error('KHASSAR_MOVEMENT_DEFERRED_REACTION_COMPOSITION_REQUIRED');
  }
  if (includeKhassarTargetReactions && (!includeKhassarCombatExecution || !targetReactions)) {
    throw Error('KHASSAR_TARGET_REACTION_SOURCE_REQUIRED');
  }
  if (includeKhassarArmourReactions && (!includeKhassarCombatExecution || !includeArmourReactions
    || !reactionBundle?.routes.some(route => route.triggerKind === 'before_armour_roll'))) {
    throw Error('KHASSAR_ARMOUR_REACTION_SOURCE_REQUIRED');
  }
  if (includeKhassarDamageReactions && (!(includeKhassarCharge || includeKhassarCombatExecution) || !transfusionMelee
    || includeKhassarTargetReactions && !khassarTargetDamageContinuation || includeKhassarArmourReactions)) {
    throw Error('KHASSAR_DAMAGE_REACTION_SOURCE_AND_INDEPENDENT_WINDOW_REQUIRED');
  }
  if (includeKhassarChargeDeclaration && (!(includeKhassarCharge || includeKhassarCombatExecution) || !chargeDeclaration)) {
    throw Error('KHASSAR_CHARGE_DECLARATION_SOURCE_REQUIRED');
  }
  // Delegation grants a basic phase action. The payment/Flare windows belong to activated abilities;
  // a shooter-only change on an opposing unit cannot modify any eligible delegated attack.
  const khassarSupplyLoss = includeReleaseKhassar && includeKhassarSupplyLoss ? friendlySupplyLossReaction : null;
  const independentKhassarReaction = route => includeReleaseKhassar && (
    (khassarOverwatch && route.activationEndOwner === 'current_source_v1' && route.triggerKind === 'unit_activation_ended')
    || (ancestralWisdom && route.triggerKind === 'ability_cost_payment')
    || (canRestoreFlare && route.triggerKind === 'debuff_received' && route.effectKind === 'remove_debuffs'
      && !damageHitDebuff && !inheritedRangedHitDebuff)
    || (rangedDeclaration && headShotSource && route.definitionId === 'unit:nova_stealth_mode/head-shot-assault-phase@1'
      && route.sourceMustEqualTarget && !canOfficialKhassarDelegateUnitRecordV1(spatialState, route.recordKey))
  );
  const unsupportedKhassarReactions = (includeKhassarCharge || includeKhassarCombatExecution) ? reactionBundle?.routes.filter(route =>
    !(includeKhassarTargetReactions && route.triggerKind === 'attack_target_selected')
    && !(includeKhassarArmourReactions && route.triggerKind === 'before_armour_roll')
    && !(includeKhassarDamageReactions && (route === zagaraTransfusion || route === medicLifeSupport))
    && !(includeMixedRosterReactions && (
      (route.nativeChargeDie || route.nativeChargeDistance) && afterChargeRoll && !sharesKhassarFactionSideV1(spatialState, route.recordKey)
      || route.effectKind === 'evade_roll_modifier' && includeBeforeRangedEvadeReaction && includeBeforeMeleeEvadeReaction
      || route.requiresRangedTargetSnapshot && lunge && includeLungeDeferredReaction))
    && !(includeKhassarChargeDeclaration && route.chargeDeclarationOwner === 'current_source_v1')
    && !(khassarSupplyLoss && route.definitionId === khassarSupplyLoss.descriptor.definitionId)
    && !independentKhassarReaction(route)) : [];
  if (unsupportedKhassarReactions?.length) {
    throw Object.assign(Error('KHASSAR_CHARGE_REACTION_COMPOSITION_REQUIRED'), {
      code: 'KHASSAR_CHARGE_REACTION_COMPOSITION_REQUIRED',
      detail: {pendingReactions: unsupportedKhassarReactions.map(({definitionId,triggerKind})=>({definitionId,triggerKind}))},
    });
  }
  const khassarWithIndependentTemplates = Boolean(includeKhassarCombatExecution && templateAttack);
  const khassarWithIndependentCardRefresh = Boolean(includeKhassarCombatExecution && cardRefresh);
  if (khassarWithIndependentTemplates || khassarWithIndependentCardRefresh) {
    assertOfficialKhassarIndependentRangedRoutesV1(spatialState, {
      templateRoutes: templateAttack?.descriptor.routes || [],
      refreshRecordKey: cardRefresh
        ? characteristicRoutes.find(route => route.definitionId === cardRefresh.descriptor.definitionId).recordKey
        : null,
    });
  }
  const independentTemplateWindowPending = state => khassarWithIndependentTemplates
    && (templateAttack.hasPending(state) || rangedDeclaration?.pending(state));
  const khassarAttackOptions = { eligibility: khassarEligibility, enumerateNative,
    instantiateNative: instantiate, applyNative: apply, includeDamageReactions: includeKhassarDamageReactions,
    ...(khassarSupplyLoss ? { supplyLossReaction: khassarSupplyLoss } : {}),
    ...(includeMixedRosterReactions && lunge ? { rangedLunge: lunge } : {}),
    ...(includeKhassarTargetReactions ? { targetReactions } : {}) };
  const khassarShot = includeKhassarCombatExecution ? createOfficialKhassarShotV1(khassarAttackOptions) : null;
  const khassarFight = includeKhassarFight ? createOfficialKhassarFightV1(khassarAttackOptions) : null;
  const khassarAttacks = [khassarShot, khassarFight].filter(Boolean);
  const attackOwnerFor = kind => khassarAttacks.find(owner => owner.descriptor.sourceRuntimeKind === kind);
  const khassarCharge = includeKhassarCharge || includeKhassarCombatExecution ? createOfficialKhassarChargeV1({
    ...khassarAttackOptions, ...(includeKhassarChargeDeclaration ? { chargeDeclaration } : {}),
  }) : null;
  const khassarMovement = includeKhassarSpatialExecution ? createOfficialKhassarMovementV1({
    eligibility: khassarEligibility, state: spatialState, includeRun: includeKhassarRun || includeKhassarCharge || includeKhassarCombatExecution,
    enumerateNative, instantiateNative: instantiate, applyNative: apply,
  }) : null;
  const version = includeReleaseMoundAssaultOrder ? '3.221.0' : includeBilePhysicalPlacement && bile ? '3.220.0' : psionicRoundEnd?.scheduledEffects ? '3.219.0' : includeReleaseBileAssaultOrder ? '3.218.0' : releaseZergTargets ? '3.217.0' : includePsionicStormAssaultSameName ? '3.216.0'
    : includePsionicStormTokenCleanup ? '3.215.0'
    : includePsionicStormNamedOverlapChoices ? '3.214.0'
    : stormCast ? '3.213.0'
    : includePsionicStormEquivalentNameOverlap ? '3.212.0'
    : includeBeforeTemplateEvadeReaction ? '3.211.0'
    : includeAutomaticHitsDefenceContinuation ? '3.210.0'
    : includeBeforeHitsEvadeReaction ? '3.209.0' : includeBeforeMeleeEvadeReaction ? '3.208.0'
    : includeBeforeRangedEvadeReaction ? '3.207.0' : includePsionicStormMovementPass ? '3.206.0' : includeAdditionalAssaultEffectOrder ? '3.205.0' : includeSharedAssaultEffectOrder ? '3.204.0' : includePsionicStormAssaultOrder ? '3.203.0' : includePsionicStormAssaultDamage ? '3.202.0' : includePsionicStormPhaseEndDefence ? '3.201.0' : stormPhaseEnd ? '3.200.0' : includeLungeJointObstacleProof ? '3.199.0' : zergUniqueAdapter ? '3.198.0' : includeLungeCertifiedLeaderWitness ? '3.197.0' : includeLungeCertifiedMultiModelDetour ? '3.196.0' : includeLungeCertifiedForwardDetour ? '3.195.0' : includeLungeCertifiedFormation ? '3.194.0' : includeLungeOverwatchContinuation ? '3.193.0' : includeLungeDeferredReaction ? '3.192.0' : lunge ? templateAttack ? '3.191.0' : '3.190.0' : khalaiBundle ? '3.189.0' : includeReleasePhaseControl ? '3.188.0' : includeReleaseRosterActions ? '3.187.0' : roachlingSummon ? '3.186.0' : registeredKhassar ? '3.185.0' : includeSelectedRosterAbilityCoverage ? '3.184.0' : includeKhassarLegalDomainQuery ? '3.183.0' : khassarWithIndependentCardRefresh ? '3.182.0' : khassarWithIndependentTemplates ? '3.181.0' : ravenInternalTechModule ? '3.180.0' : ravenTurretShrapnel ? '3.179.0' : ravenDeployTurret ? '3.178.0' : seekerCast ? '3.177.0' : seekerPhaseEnd ? '3.176.0' : includeRavenSeekerPaidImpact ? '3.175.0' : ravenSeekerRules ? '3.174.0' : ravenCorvid ? '3.173.0' : ravenMissile ? '3.172.0' : stormBattlefieldAssetProfile ? '3.171.0' : psionicStormSourceRules ? '3.170.0' : khassarRangedDamageContinuation ? '3.169.0' : khassarMeleeDamageContinuation ? '3.168.0' : includeKhassarChargeDeclaration ? '3.167.0' : includeKhassarDamageReactions ? '3.166.0' : includeKhassarArmourReactions ? '3.165.0' : includeKhassarTargetReactions ? '3.164.0' : khassarFight ? '3.163.0' : khassarShot ? '3.162.0' : khassarCharge ? '3.161.0' : includeKhassarRun ? '3.160.0' : khassarMovement ? '3.159.0' : khassarEligibility ? '3.158.0' : ourDutyIsUnending ? '3.157.0' : ancestralWisdom ? '3.156.0' : friendlySupplyLossReaction ? '3.155.0' : twilightWarpIn ? '3.154.0' : ourMindsAsOne ? '3.153.0' : khalasGift ? '3.152.0' : executorsWill ? '3.151.0' : psiLightning ? '3.150.0' : telekineticPush ? '3.149.0' : forceWallTraversal ? '3.148.0' : forceWall ? '3.147.0'
  : tassadarCommanderEnabled ? '3.146.0' : feedback ? feedbackReactionTiming ? '3.145.0' : '3.144.0'
  : farsight ? targetedAbilityPolicy ? hits ? '3.143.0' : '3.142.0' : hits ? '3.141.0' : '3.140.0'
  : scourgeQueen ? '3.139.0' : reactiveTissue ? '3.138.0' : reactiveCreepTokens ? '3.137.0' : instinctiveReaction ? '3.136.0' : zagaraInfestedDrop ? '3.135.0' : zagaraBroodmother ? '3.134.0' : zagaraPsionicLink ? '3.133.0' : zagaraIndomitable ? '3.132.0' : zagaraCombatDefinitionIds.length ? '3.131.0'
    : transfusionHits ? '3.130.0' : transfusionMelee ? '3.129.0'
    : transfusionTemplate ? '3.128.0' : transfusionStructureFaq ? '3.127.0' : zagaraTransfusion ? '3.126.0'
    : commanderAdapter ? '3.125.0' : componentVersion;
  const spawnRoundLockPolicies = (unitLifecycleBundle?.routes || []).flatMap(route =>
    route.spawnRoundAbilityLockPolicy ? [route.spawnRoundAbilityLockPolicy] : []);
  spawnRoundLockPolicies.forEach(verifyOfficialSpawnRoundAbilityLockPolicyV1);
  for (const piece of (spatialState?.pieces || []).filter(row => row.officialSpawnRoundAbilityLock)) {
    allowsOfficialSpawnRoundSpecialAbilityV1(spatialState, piece, 'Structure');
    if (!spawnRoundLockPolicies.some(policy => policy.policyHash === piece.officialSpawnRoundAbilityLock.policy.policyHash)) {
      throw Error('SPAWN_ROUND_LOCK_RUNTIME_POLICY_REQUIRED');
    }
  }
  const factionConversions = (spatialState?.pieces || []).map(readOfficialFactionUnitConversionV1).filter(Boolean);
  for (const binding of factionConversions) {
    if (binding.policy.sourceBinding.releaseId !== context.manifest.releaseId
      || binding.policy.sourceBinding.normalizedDatasetHash !== context.dataset.datasetHash
      || binding.policy.sourceBinding.sourceSnapshotHash !== context.snapshot.snapshotHash) {
      throw Error('FACTION_UNIT_CONVERSION_RELEASE_MISMATCH');
    }
  }
  const factionArmyConversionPolicies = [...new Map(factionConversions.map(binding => [binding.policy.policyHash, {
    policyHash: binding.policy.policyHash, definitionId: binding.policy.definitionId, sourceFeatureHash: binding.policy.sourceFeatureHash,
  }])).values()].sort((a, b) => a.policyHash.localeCompare(b.policyHash));
  const ruleAtomIds = [...new Set([atomId, ...spawnRoundLockPolicies.map(policy => policy.ruleAtomId), ...factionConversions.flatMap(binding => binding.policy.atomIds), ...(stormCast?.descriptor.ruleAtomIds || []), ...(stormPhaseEnd?.descriptor.ruleAtomIds || []), ...(forceWall ? [OFFICIAL_FORCE_WALL_PLACEMENT_ATOM_ID] : []), ...(forceWallTraversal ? [OFFICIAL_FORCE_WALL_TRAVERSAL_ATOM_ID] : []), ...(telekineticPush ? [OFFICIAL_TELEKINETIC_PUSH_ATOM_ID] : []), ...(psiLightning ? [OFFICIAL_PSI_LIGHTNING_ATOM_ID] : []), ...(poisonousEssence?.descriptor.ruleAtomIds || []), ...(plague?.descriptor.ruleAtomIds || []), ...(darkSwarmReaction ? [OFFICIAL_DARK_SWARM_REACTION_ATOM_ID] : []), ...(darkSwarmLifecycle?.descriptor.ruleAtomIds || []), ...(darkSwarmPlacement?.descriptor.ruleAtomIds || []), ...(bombardReplacement?.descriptor.ruleAtomIds || []), ...(bombardTargeting ? [OFFICIAL_BOMBARD_TARGETING_ATOM_ID] : []), ...(bombard?.descriptor.ruleAtomIds || []), ...(pinpointEngagement ? [OFFICIAL_PINPOINT_ENGAGEMENT_POLICY_V1.ruleAtomId] : []), ...(unitRestrictions ? OFFICIAL_UNIT_RESTRICTION_ATOM_IDS : []), ...(damageHitDebuff ? [OFFICIAL_DAMAGE_WEAPON_HIT_DEBUFF_ATOM_ID] : []), ...(overwatch?.descriptor.ruleAtomIds || []), ...(sabotageDronePhaseEnd?.descriptor.ruleAtomIds || []), ...(structureSource?.ruleAtomIds || []), ...(chargeDeclaration?.descriptor.ruleAtomIds || []), ...(magrailMunitions ? [OFFICIAL_FIRST_GAME_WEAPON_USE_ATOM_ID] : []), ...(cardRefresh?.descriptor.ruleAtomIds || []), ...(holoRoundEnd?.descriptor.ruleAtomIds || []), ...(summonedCombatEligibility ? [summonedCombatEligibility.ruleAtomId] : []), ...(lethalHologram ? ['rule-atom:holo-lethal-hologram-weapon-precision-v1'] : []), ...(decoySource?.ruleAtomIds || []), ...(summonedActions?.descriptor.ruleAtomIds || []), ...(cleanupContinuation?.descriptor.ruleAtomIds || []), ...(personalTransport?.descriptor.ruleAtomIds || []), ...(cocoonMorph ? spatialState.officialRespawnMorphDataBundle.ruleClauses.map(row => row.atomId)
    : (cocoonRespawn || vilelingRespawn || swarmlingRespawn) ? spatialState.officialRespawnMorphDataBundle.ruleClauses
    .filter(row => row.clauseId.startsWith('core:11:respawn-')).map(row => row.atomId) : []), ...(rangedDeclaration?.descriptor.ruleAtomIds || []), ...(currentCoordinatedStrike
    ? spatialState.officialSiegeModeDataBundle.ruleClauses.map(row => row.atomId) : []), ...(displacement?.descriptor.ruleAtomIds || []), ...(displacementQuery ? [displacementQuery.descriptor.ruleAtomId] : []), ...(psionicRoundEnd?.descriptor.ruleAtomIds || []), ...(psionic?.descriptor.ruleAtomIds || []), ...(actionStatusLifecycle ? [OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V1.ruleAtomId] : []), ...(bileResolution?.descriptor.ruleAtomIds || []), ...(bileResolution?.descriptor.faqReactionRuleAtomId ? [bileResolution.descriptor.faqReactionRuleAtomId] : []), ...(bile?.descriptor.ruleAtomIds || []), ...(indomitableRanged ? [OFFICIAL_INDOMITABLE_RANGED_POLICY_V1.ruleAtomId] : []), ...(battlefieldModifierAdapter ? [OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1.ruleAtomId] : []), ...(includeArmourOrdinals ? [OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1.ruleAtomId] : []), ...rangedAtomIds, ...meleeAtomIds, ...impactPolicyAtoms, ...(hits?.descriptor.ruleAtomIds || []), ...(hitsChoices?.descriptor.ruleAtomIds || []), ...(meleeChoices?.descriptor.ruleAtomIds || []), ...(pointDefenseChoices?.descriptor.ruleAtomIds || []), ...(targetReactions?.descriptor.ruleAtomIds || []), ...(precisionChoices?.descriptor.ruleAtomIds || []), ...(templateAttack?.descriptor.ruleAtomIds || []), ...(largeRemoval ? [OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1.ruleAtomId] : []), ...(spatial?.descriptor.routes || []).flatMap(row => row.ruleAtomIds),
    ...(spatial ? [OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13.ruleAtomId,
      ...(spatialState.officialStatusStayInPlayDataBundle?.ruleClauses || []).map(row => row.atomId)] : []),
    ...(feedback ? [OFFICIAL_FEEDBACK_COMPLETION_ATOM_ID] : []), ...(executorsWill?.descriptor.ruleAtomIds || []),
    ...(khalasGift ? [OFFICIAL_KHALAS_GIFT_ATOM_ID] : []),
    ...(ourMindsAsOne ? [OFFICIAL_OUR_MINDS_AS_ONE_ATOM_ID] : []),
    ...(friendlySupplyLossReaction ? [friendlySupplyLossReaction.descriptor.ruleAtomId] : []),
    ...(ancestralWisdom ? [ancestralWisdom.descriptor.ruleAtomId] : []),
    ...(khassarMovement?.descriptor.ruleAtomIds || []), ...(khassarCharge?.descriptor.ruleAtomIds || []),
    ...khassarAttacks.flatMap(owner => owner.descriptor.ruleAtomIds)])].sort();
  const actionTypes = [...(stormCast && !stormCast.descriptor.awaitingCenterMeasurement ? [stormCast.descriptor.actionType] : []),
    ...(stormPhaseEnd?.descriptor.actions || []), ...(seekerPhaseEnd?.descriptor.actionTypes || []), ...khassarAttacks.flatMap(owner => owner.descriptor.actionTypes), ...(khassarCharge?.descriptor.actionTypes || []), ...(khassarMovement?.descriptor.actionTypes || []), ...(ancestralWisdom?.descriptor.actions || []), ...(executorsWill?.descriptor.actions || []), ...(poisonousEssence?.descriptor.actions || []),...(bombardReplacement?.descriptor.actions || []), ...(sabotageDronePhaseEnd?.descriptor.actions || []), ...(chargeDeclaration ? ['roll_declared_charge'] : []), ...(cardRefresh?.descriptor.actions || []), ...(holoRoundEnd?.descriptor.actions || []), ...(immediateSummonedMove ? ['decline_summoned_move'] : []), ...(cleanupContinuation?.descriptor.actions || []),...(personalTransport ? ['resolve_personal_transport'] : []), ...(rangedDeclaration?.descriptor.actions || []),...(adapter ? ['resolve_characteristic_status_ability'] : []), ...(spatial?.descriptor.actions || []),
    ...(psionic ? transferRoutes ? [...new Set(psionicSource.routes.map(row => row.actionType))] : ['set_psionic_transfer_shade'] : []),
    ...(psionicRoundEnd?.descriptor.actions || []),
    ...(bileResolution?.descriptor.actions || []),
    ...(bile ? ['set_corrosive_bile'] : []),
      ...(bombard ? ['set_bile_bomb'] : []),
    ...(darkSwarmPlacement ? ['set_dark_swarm'] : []),
    ...(plague ? ['cast_plague'] : []),
    ...(plague || selectedAbilityAdapter ? ['use_active_ability'] : []),
    ...(unitLifecycleAdapter ? ['resolve_unit_lifecycle_ability'] : []),
    ...(terranSupplyAdapter ? ['resolve_terran_unique_ability'] : []),
    ...(zergUniqueAdapter ? ['resolve_zerg_unique_ability'] : []),
    ...(khalaiAdapter ? ['resolve_protoss_unique_ability'] : []),
    ...(activeBattlefieldAssets ? ['resolve_battlefield_asset_ability'] : []),
    ...(includeReleaseBeaconLifecycle && battlefieldModifierBundle?.routes.some(route =>
        route.ventralSacsLanding === true || route.reserveBeaconLanding === true)
      ? ['resolve_unit_lifecycle_consumer'] : []),
    ...(relocationAdapter ? ['resolve_relocation_ability'] : []),
    ...(reactionAdapter ? ['resolve_reaction_family_ability', 'pass_reaction_family_window'] : []),
    ...(targetReactions?.descriptor.actions || []),
    ...(spatial ? ['finish_activation'] : []), ...(ranged?.descriptor.actions || []), ...(templateAttack?.descriptor.actions || []),
    ...(precisionChoices?.descriptor.actions || []), ...(pointDefenseChoices?.descriptor.actions || []),
    ...(melee?.descriptor.actions || []), ...(meleeChoices?.descriptor.actions || []),
    ...(hits?.descriptor.actions || []), ...(hitsChoices?.descriptor.actions || [])];
  const sourceBundleHash = bundle?.bundleHash || battlefieldModifierBundle?.bundleHash || reactionBundle?.bundleHash
      || meleeModifierBundle?.bundleHash || weaponBundle?.bundleHash || meleeWeaponBundle?.bundleHash
      || (plague ? spatialState.officialPlagueCoverageSourceBundle.bundleHash : undefined) || darkSwarmSource?.bundleHash || (psionicRoundEnd ? psionicSource?.bundleHash : undefined) || (cocoonRespawn || cocoonMorph || vilelingRespawn || swarmlingRespawn || holoSummon ? unitLifecycleBundle.bundleHash : undefined);
  const selectedRosterAbilityCoverage = includeSelectedRosterAbilityCoverage
    ? createOfficialSelectedRosterAbilityCoverageV2({ context, catalogue, state: spatialState,
      componentOwners: [khassarMovement, khassarCharge, ...khassarAttacks].filter(Boolean).map(owner => owner.descriptor),
    }) : null;
  const descriptor = seal({ schema: 'starcraft_tmg_official_executable_rule_runtime_v1',
    ...(spawnRoundLockPolicies.length ? { spawnRoundAbilityLockPolicies: spawnRoundLockPolicies } : {}),
    ...(factionArmyConversionPolicies.length ? { factionArmyConversionPolicies } : {}),
    ...(selectedRosterAbilityCoverage ? { selectedRosterAbilityCoverage } : {}),
    mode: 'official_executable_catalogue', gameId: 'starcraft-tmg', runtimeId, runtimeVersion: version,
    ...(plague ? { plagueRuntime: plague.descriptor, plagueConsumerReady: true } : {}),
    ...(nonLethalStandardDamage ? { nonLethalStandardDamagePolicyHash: hash(spatialState.officialNonLethalStandardDamagePolicy),
      nonLethalStandardDamageConsumerScope: 'ranged_melee_and_automatic_hits' } : {}),
    ...(meleeSidearm ? { meleeSidearmPolicyHash: spatialState.officialMeleeSidearmPolicy.policyHash,
      meleeSidearmConsumerScope: 'source_bound_single_model_defiler_melee_batches' } : {}),
    ...(plagueCoverage ? { plagueCoverageQuery: plagueCoverage.descriptor } : {}),
    rulesVersion: 'official-release-characteristic-status-component-v2', catalogueHash: catalogue.catalogueHash,
    ...(defilerMeleeFoundation ? { defilerMeleeDefinitionIds, defilerMeleeConsumerScope: 'native_charge_impact_and_claws' } : {}),
    ...(consumePaymentSource ? { consumePaymentQuery: { sourceBundleHash: consumePaymentSource.bundleHash,
      queryKind: 'consume_payment_options', abilityTimingValidated: false, sacrificeConsumerReady: Boolean(consumePayment) } } : {}),
    ...(consumePayment ? { consumePaymentPolicyHash: spatialState.officialConsumePaymentPolicy.policyHash,
      consumePaymentRuntime: consumePayment.descriptor,
      consumePaymentConsumerScope: spatialState.officialConsumePaymentPolicy.consumerScope } : {}),
    ...(lunge ? { rangedLungeContinuation: { version: '1.0.0',
      scope: includeLungeCertifiedFormation ? 'certified_direct_leader_and_formation' : 'certified_single_model_direct_geometry',
      reactionBundleHash: reactionBundle.bundleHash,
      ...(includeLungeDeferredReaction ? { deferredBehindOwnedReaction: true } : {}),
      ...(includeLungeOverwatchContinuation ? { overwatchUsesOutsideActivationIdentity: true } : {}),
      ...(includeLungeCertifiedForwardDetour ? { certifiedSingleModelGroundForwardDetour: true } : {}),
      ...(includeLungeCertifiedMultiModelDetour ? { certifiedMultiModelGroundForwardDetour: true } : {}),
      ...(includeLungeCertifiedLeaderWitness ? { certifiedSpeedLimitedLeaderWitness: true } : {}),
      ...(includeLungeJointObstacleProof ? { certifiedJointGroundObstacleBound: true } : {}),
      ...(includeLungeAxisLeaderBound ? { certifiedRectangleToCircleGridBound: true } : {}),
      ...(templateAttack ? { templateDamageWindowOwner: 'native_blast_template' } : {}) } } : {}),
    ...(overwatch ? { overwatchRuntime: overwatch.descriptor } : {}),
    ...(sabotageDronePhaseEnd ? { sabotageDronePhaseEndRuntime: sabotageDronePhaseEnd.descriptor } : {}),
    ...(poisonousEssence ? { poisonousEssenceRuntime: poisonousEssence.descriptor } : {}),
    ...(commanderAdapter ? { commanderDefinitionId: commanderDefinition.definitionId,
      commanderSourceFeatureHash: commanderDefinition.sourceFeatureHash,
      commanderAbilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(tassadarCommanderEnabled ? { commanderDefinitions: commanderDefinitions.map(({ definitionId, sourceFeatureHash }) => ({
      definitionId, sourceFeatureHash,
    })) } : {}),
    ...(zagaraTransfusion ? { transfusionDefinitionId: zagaraTransfusion.definitionId,
      transfusionConsumerScope: transfusionTemplate ? 'source_bound_numeric_and_template_damage_before_allocation'
        : 'source_bound_ranged_damage_before_allocation' } : {}),
    ...(transfusionMelee ? { transfusionMeleeConsumerScope: 'source_bound_fight_and_impact_before_allocation' } : {}),
    ...(transfusionHits ? { transfusionHitsConsumerScope: 'source_bound_automatic_hits_before_allocation' } : {}),
    ...(transfusionStructureFaq ? { structureTargetingPolicy: OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 } : {}),
    ...(cardRefresh ? { rangedCardRefreshRuntime: cardRefresh.descriptor } : {}),
    ...(sourcePhasePolicy ? { abilitySourcePhasePolicyHash: sourcePhasePolicy.policyHash } : {}),
    ...(holoRoundEndSource?.version === '1.1.0' ? { unitRoundEndSourceBundleHash: holoRoundEndSource.bundleHash,
      unitRoundEndDefinitionIds: holoRoundEndSource.definitionIds, unitRoundEndRuntime: holoRoundEnd.descriptor }
      : holoRoundEnd ? { holoRoundEndSourceBundleHash: holoRoundEndSource.bundleHash,
        holoRoundEndDefinitionIds: holoRoundEndSource.definitionIds, holoRoundEndRuntime: holoRoundEnd.descriptor } : {}),
    ...(summonedCombatEligibility ? { summonedCombatEligibilityPolicyHash: summonedCombatEligibility.policyHash } : {}),
    ...(structureSource ? { structureSourceBundleHash: structureSource.bundleHash,
      structureDefinitionIds: structureSource.definitionIds,
      structureConsumerScope: 'activation_actions_contextual_supply_marker_control_and_unit_recipients' } : {}),
    ...(decoySource ? { decoySourceBundleHash: decoySource.bundleHash, decoyDefinitionId: decoySource.definitionId } : {}),
    ...(summonedActions ? { summonedActionRuntime: summonedActions.descriptor, summonDataBundleHash: summonSource.bundleHash, missionSupplyProfileHash: missionSupplySource.profileHash } : {}),
    ...(generatedUnits ? { generatedUnitDataBundleHash: generatedUnits.bundleHash,
      generatedUnitRecordKeys: generatedUnits.profiles.map(row => row.recordKey) } : {}),
    ...(detectionHiddenLoss ? { detectionHiddenLossPolicy: structuredClone(spatialState.officialDetectionHiddenLossPolicy) } : {}),
    executorManifest: [{ executorId: runtimeId, executorVersion: version,
      actionTypes: includeArmourReactions || targetReactions ? [...new Set(actionTypes)] : actionTypes }],
    executableRuleAtomIds: ruleAtomIds, executableRuleAtomCount: ruleAtomIds.length, nonExecutableRuleAtomCount: 0,
    legalSpaceComplete: true, legalSpaceScope: includeHits ? 'characteristic_spatial_and_automatic_hits_component' : includeMelee ? 'characteristic_spatial_and_melee_component' : templateAttack ? 'characteristic_spatial_numeric_and_blast_component' : ranged ? 'characteristic_spatial_and_numeric_ranged_component' : spatial ? 'characteristic_and_spatial_component'
      : 'explicit_characteristic_status_component',
    ...(includeReleasePhaseControl ? { releasePhaseControlOwnedByNativeMenu: true } : {}),
    ...(includeReleaseRosterActions ? { releaseRosterActionAssembly: true,
      selectedRosterAbilitySourceHash: selectedAbilitySource?.bundleHash,
      releaseRangedModifierSourceHash: rangedModifierSource?.bundleHash } : {}),
    ...(currentCoordinatedStrike ? { coordinatedStrikeConsumerPolicy: structuredClone(spatialState.officialCoordinatedStrikeConsumerPolicy),
      siegeModeDataBundleHash: spatialState.officialSiegeModeDataBundle.bundleHash } : {}),
    ...(rangedDeclaration ? { rangedDeclarationRuntime: rangedDeclaration.descriptor } : {}),
    ...(chargeDeclaration ? { chargeDeclarationRuntime: chargeDeclaration.descriptor } : {}),
    ...(artanisDash ? {secondChargeSource:dashRoute.routeHash} : {}),
    ...(standRoute ? {rangedRedirectSource:standRoute.routeHash} : {}),
    ...(afterChargeRoll ? { afterChargeRollReaction: 'committed_higher_die_v1' } : {}),
    ...(stationaryFirstRanged && spatialState.officialSiegeModeDataBundle
      ? { siegeModeDependencyHash: spatialState.officialSiegeModeDataBundle.bundleHash } : {}),
    fullMatchCoverage: false, productionRoomEligible: false, legacyCompatibilityUsed: false,
    ctx2skillPromotionEligible: false, currentProductAbilityExactCount: commanderDefinitions.length + (structureSource?.definitions.length || 0) + (holoRoundEndSource?.definitions.length || 0) + (decoySource ? 1 : 0) + (personalTransport ? 1 : 0) + (psionicSource?.definitions.length || 0) + (bile ? 1 : 0) + (bileUpgrades?.routes.length || 0) + (bundle?.routeCount || 0) + (relocationBundle?.routeCount || 0) + (unitLifecycleBundle?.routeCount || 0) + (weaponBundle?.routeCount || 0) + (meleeWeaponBundle?.routeCount || 0) + (meleeModifierBundle?.routeCount || 0) + (battlefieldModifierBundle?.routeCount || 0) + (reactionBundle?.routeCount || 0),
    currentProductAbilityPendingCount: catalogue.denominator.pendingFamilyAdapter,
    ...(sourceBundleHash ? { sourceBundleHash } : {}),
    ...(indomitableRanged ? { indomitableRangedPolicy: structuredClone(spatialState.officialIndomitableRangedPolicy) } : {}),
    ...(reactionAdapter ? { reactionSourceBundleHash: reactionBundle.bundleHash,
      reactionDefinitionIds: reactionBundle.definitionIds, abilityRouterHash: router.descriptor.runtimeHash,
      reactionTriggerProductionPending: !includeArmourReactions && !targetReactions, reactionParentContinuationPending: !includeArmourReactions && !targetReactions,
      ...(targetDamageCapSource ? { reactionNativeConsumerScope: 'source_and_declared_target_window',
        weaponDamageCapAttackConsumerPending: !targetReactions,
        ...(targetReactions ? { reactionNativeConsumerScope: includeMelee
          ? 'melee_declared_targets_with_per_target_armour' : includeTemplateAttacks
          ? 'numeric_and_template_primary_target_with_armour_choices' : includePrecisionChoices
          ? 'numeric_ranged_target_precision_and_armour_choices' : 'single_numeric_ranged_target_declaration',
          targetReactionRuntimeHash: targetReactions.descriptor.runtimeHash } : {}) } : {}),
      ...(includeArmourReactions && !targetReactions ? { reactionNativeConsumerScope: meleeArmourReactions
        ? 'melee_each_declared_target_before_armour' : includeTemplateAttacks
          ? 'numeric_and_template_current_batch_before_armour' : 'numeric_ranged_before_armour' } : {}) } : {}),
    ...(spatial ? { spatialRuntimeHash: spatial.descriptor.runtimeHash,
      activationRuntimeHash: activation.descriptor.runtimeHash,
      modelGapTransitPolicy: spatialState.officialModelGapTransitPolicy } : {}),
    ...(shieldedLifecycle ? { shieldedLifecyclePolicyHash: spatialState.officialShieldedLifecyclePolicy.policyHash,
      shieldedLifecycleScope: 'source_bound_initial_wounds_and_shared_casualty_commit',
      shieldedNativeWholeRoundPending: true } : {}),
    ...(relocationAdapter ? { relocationSourceBundleHash: relocationBundle.bundleHash,
      relocationDefinitionIds: relocationBundle.definitionIds,
      relocationConsumerScope: reservePlaceSource ? 'source_bound_direct_and_reserve_entry_place' : 'source_bound_blink_and_void_blink_paid_direct_place',
      ...(postPlaceReactions ? { postPlaceReactionRuntime: postPlaceReactions.descriptor } : {}) } : {}),
    ...(hiddenLossReactions ? { hiddenLossReactionRuntime: hiddenLossReactions.descriptor } : {}),
    ...(cleanupContinuation ? { cleanupContinuationRuntime: cleanupContinuation.descriptor } : {}),
    ...(currentCharacteristicConsumers ? { characteristicConsumerPolicy: spatialState.officialCharacteristicConsumerPolicy } : {}),
    ...(bile ? { corrosiveBileSourceBundleHash: bileSource.bundleHash,
      corrosiveBileProducerRuntime: bile.descriptor, corrosiveBileDamageConsumerPending: !bileResolution,
      ...(bileResolution ? { corrosiveBileResolutionRuntime: bileResolution.descriptor } : {}),
      abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(bombard ? { bombardSourceBundleHash: bombardSource.bundleHash, bombardRuntime: bombard.descriptor,
      abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(bombardTargeting ? { bombardTargetingPolicy: spatialState.officialBombardTargetingPolicy,
      bombardTargetingConsumerReady: true } : {}),
    ...(bombardReplacement ? { bombardReplacementRuntime: bombardReplacement.descriptor,
      bombardPostAttackReplacementConsumerReady: true } : {}),
    ...(bombardRemovalLifecycle ? { bombardRemovalLifecycleReady: true } : {}),
    ...(darkSwarmPlacement ? { darkSwarmPlacementRuntime: darkSwarmPlacement.descriptor,
      darkSwarmPlacementConsumerReady: true } : {}),
    ...(darkSwarmLifecycle ? { darkSwarmTokenLifecycle: darkSwarmLifecycle.descriptor } : {}),
    ...(darkSwarmReaction ? { darkSwarmReactionConsumerReady: true,
      darkSwarmReactionScope: 'card_payment_and_shared_token_attack_target_evade',
      ...(hasOfficialFaqReactionPolicyV13(spatialState) ? { darkSwarmRepeatablePolicyReady: true } : {}) } : {}),
    ...(battlefieldDisplacementSource ? { battlefieldDisplacementSourceBundleHash: battlefieldDisplacementSource.bundleHash,
      battlefieldDisplacementRuntime: displacement.descriptor,
      battlefieldDisplacementQuery: displacementQuery.descriptor } : {}),
    ...(psionic ? { psionicTransferSourceBundleHash: psionicSource.bundleHash,
      psionicTransferRuntime: psionic.descriptor, psionicTransferConsumerScope: adeptShade ? 'source_owned_adept_and_selected_token_transfers' : deepTunnel
        ? 'source_bound_shade_and_burrow_token_leading_transfer' : 'shade_production_and_farsight',
      psionicTransferDisplacementPending: !displacement, psionicTransferRoundEndPending: !psionicRoundEnd,
      ...(displacement ? { psionicDisplacementRuntime: displacement.descriptor,
        psionicDisplacementCompleteMovementKindCoverage: false } : {}),
      ...(psionicRoundEnd ? { psionicTransferRoundEndRuntime: psionicRoundEnd.descriptor } : {}),
      ...(psionicSourceDestruction ? { psionicSourceDestructionPolicyHash: spatialState.officialPsionicSourceLifecyclePolicy.policyHash,
        psionicSourceDestructionConsumerReady: true } : {}),
      abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(displacementQuery ? { psionicDisplacementQuery: displacementQuery.descriptor } : {}),
    ...(inheritedRangedHitDebuff ? { inheritedRangedDeclarationReactionRuntimeHash: targetReactions.descriptor.runtimeHash } : {}),
    ...(terranSupplyAdapter ? { terranMissionSupplySourceBundleHash: terranSupplyBundle.bundleHash,
      terranMissionSupplyDefinitionIds: terranSupplyBundle.definitionIds } : {}),
    ...(zergUniqueAdapter ? { [installedPredation ? 'zergUniqueSourceBundleHash' : 'queenDomineeringSourceBundleHash']: zergUniqueBundle.bundleHash } : {}),
    ...(swarmlingRespawn ? { swarmlingRespawnDataHash: spatialState.officialRespawnMorphDataBundle.bundleHash } : {}),
    ...(unitLifecycleAdapter ? { unitLifecycleSourceBundleHash: unitLifecycleBundle.bundleHash,
      unitLifecycleDefinitionIds: unitLifecycleBundle.definitionIds, unitLifecycleAdapterVersion: unitLifecycleAdapter.descriptor.adapterVersion,
      unitLifecycleConsumerScope: roachlingSummon ? 'roachling_native_summon_and_linked_activation' : ravenDeployTurret ? 'raven_capacity_set_structure_with_caster_anchor' : vilelingRespawn ? 'vileling_native_respawn_on_creep_and_supply_bracket' : includeReleaseBeaconLifecycle && swarmlingRespawn ? 'swarmling_native_respawn_on_creep_and_supply_bracket' : holoSummon ? 'holo_decoy_native_summon_and_authorized_move' : cocoonMorph ? 'cocoon_morph_unit_replacement_and_round_activation_lock' : cocoonRespawn ? 'cocoon_spawn_larva_native_respawn' : 'rapid_ingress_native_producer_and_round_end_hook',
      unitLifecycleNativeMatchPhaseAdmissionPending: true } : {}),
    ...(ranged ? { rangedRuntimeHash: ranged.descriptor.runtimeHash, pendingTemplateRoutes } : {}),
    ...(zagaraCombatDefinitionIds.length ? { zagaraCombatDefinitionIds: [...new Set(zagaraCombatDefinitionIds)].sort() } : {}),
    ...(zagaraPsionicLink ? { zagaraPsionicLinkSourceHash: zagaraPsionicLink.routeHash } : {}),
    ...(queenPsionicLink ? { queenPsionicLinkSourceHash: queenPsionicLink.routeHash } : {}),
    ...(zagaraBroodmother ? { zagaraBroodmotherSourceHash: zagaraBroodmother.routeHash } : {}),
    ...(farsight ? { farsightSourceHash: farsight.routeHash } : {}),
    ...(forceWall ? { forceWallSourceHash: forceWall.routeHash, forceWallComponentProfileHash: forceWallProfile.profileHash,
      forceWallScope: forceWallTraversal ? 'pair_placement_swept_crossing_and_cleanup' : 'pair_placement_only',
      ...(forceWallTraversal ? { forceWallTraversalPolicyHash: forceWallTraversal.policyHash } : {}) } : {}),
    ...(telekineticPush ? { telekineticPushSourceHash: telekineticPush.routeHash } : {}),
    ...(psiLightning ? { psiLightningSourceHash: psiLightning.routeHash, psiLightningDirectDamage: true } : {}),
    ...(executorsWill ? { executorsWill: executorsWill.descriptor } : {}),
    ...(khalasGift ? { khalasGiftSourceRouteHash: khalasGift.routeHash } : {}),
    ...(ourMindsAsOne ? { ourMindsAsOnePaymentSourceRouteHash: ourMindsAsOne.routeHash } : {}),
    ...(friendlySupplyLossReaction ? { friendlySupplyLossReaction: friendlySupplyLossReaction.descriptor } : {}),
    ...(ancestralWisdom ? { ancestralWisdomPaymentRuntime: ancestralWisdom.descriptor } : {}),
    ...(psionicStormSourceRules ? { psionicStormSourceRules: psionicStormSourceRules.descriptor } : {}),
    ...(stormPhaseEnd ? { stormPhaseEnd: stormPhaseEnd.descriptor } : {}),
    ...(stormCast ? { stormCast: stormCast.descriptor } : {}),
    ...(includePsionicStormTokenCleanup ? { stormTokenCleanup: 'official_8_9_5_token_and_center' } : {}),
    ...(khassarEligibility ? { khassarEligibilityQuery: khassarEligibility.descriptor } : {}),
    ...(registeredKhassar ? { khassarRegisteredExecution: registeredKhassar.descriptor } : {}),
    ...(khassarSupplyLoss ? { khassarFriendlySupplyLoss: khassarSupplyLoss.descriptor.sourceRouteHash } : {}),
    ...(khassarOverwatch ? { khassarOverwatchAfterActivation: overwatch.descriptor.triggerKind } : {}),
    ...(khassarMovement ? { khassarMovementRuntime: khassarMovement.descriptor } : {}),
    ...(khassarCharge ? { khassarChargeRuntime: khassarCharge.descriptor } : {}),
    ...(khassarShot ? { khassarShotRuntime: khassarShot.descriptor } : {}),
    ...(khassarWithIndependentTemplates ? { khassarIndependentTemplateRuntimeHash: templateAttack.descriptor.runtimeHash } : {}),
    ...(khassarWithIndependentCardRefresh ? { khassarIndependentCardRefreshRuntimeHash: cardRefresh.descriptor.runtimeHash } : {}),
    ...(khassarFight ? { khassarFightRuntime: khassarFight.descriptor } : {}),
    ...(targetedAbilityPolicy ? { targetedActiveAbilityPolicyHash: targetedAbilityPolicy.policyHash } : {}),
    ...(ravenMissile ? { ravenAntiArmourMissileSourceRouteHash: ravenMissile.routeHash } : {}),
    ...(ravenCorvid ? { ravenCorvidReactorSourceRouteHash: ravenCorvid.routeHash } : {}),
    ...(ravenSeekerRules ? { ravenSeekerMissileRules: ravenSeekerRules.descriptor } : {}),
    ...(seekerPhaseEnd ? { seekerPhaseEnd: seekerPhaseEnd.descriptor } : {}),
    ...(seekerCast ? { ravenSeekerCastSourceRouteHash: seekerCast.routeHash } : {}),
    ...(ravenDeployTurret ? { ravenDeployAutoTurretSourceRouteHash: ravenDeployTurret.routeHash } : {}),
    ...(ravenTurretShrapnel ? { ravenTurretShrapnelSourceRouteHash: ravenTurretShrapnel.routeHash } : {}),
    ...(ravenInternalTechModule ? { ravenInternalTechModuleSourceRouteHash: ravenInternalTechModule.routeHash } : {}),
    ...(feedback ? { feedbackSourceDefinitionIds: feedback.sourceDefinitionIds } : {}),
    ...(feedbackReactionTiming ? { feedbackReactionTimingPolicyHash: hash(feedbackReactionTiming) } : {}),
    ...(scourgeQueen ? { zagaraScourgeQueenSourceHash: scourgeQueen.routeHash } : {}),
    ...(zagaraInfestedDrop ? { zagaraInfestedDropSourceHash: zagaraInfestedDrop.routeHash } : {}),
    ...(instinctiveReaction ? { zagaraInstinctiveReactionSourceHash: instinctiveReaction.routeHash } : {}),
    ...(battlefieldModifierAdapter ? { battlefieldModifierSourceBundleHash: battlefieldModifierBundle.bundleHash,
      battlefieldModifierDefinitionIds: battlefieldModifierBundle.definitionIds,
      armourThresholdPolicy: OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1, abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(khalaiAdapter ? { khalaiActivationSourceBundleHash: khalaiBundle.bundleHash,
      abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(includeArmourOrdinals ? { armourRollOrdinalPolicy: OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1 } : {}),
    ...(hits ? { automaticHitsRuntimeHash: hits.descriptor.runtimeHash,
      ...(hitsChoices ? { hitsChoiceRuntimeHash: hitsChoices.descriptor.runtimeHash } : {}),
      automaticHitsAdditionalReactionsPending: !includeArmourReactions } : {}),
    ...(melee ? { meleeRuntimeHash: melee.descriptor.runtimeHash, meleeChoiceRuntimeHash: meleeChoices.descriptor.runtimeHash } : {}),
    ...(meleeModifierAdapter ? { meleeModifierSourceBundleHash: meleeModifierBundle.bundleHash,
      meleeModifierDefinitionIds: meleeModifierBundle.definitionIds, abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(templateCoverage ? { templateCoverageRuntimeHash: templateCoverage.descriptor.runtimeHash,
      templateDamageResolutionPending: !templateAttack } : {}),
    ...(templateAttack ? { templateAttackRuntimeHash: templateAttack.descriptor.runtimeHash,
      templateOptionalChoiceConsumersPending: templateAttack.descriptor.unresolvedOptionalChoiceConsumers } : {}),
    ...(precisionChoices ? { precisionChoiceRuntimeHash: precisionChoices.descriptor.runtimeHash } : {}),
    ...(pointDefenseChoices ? { pointDefenseChoiceRuntimeHash: pointDefenseChoices.descriptor.runtimeHash,
      pointDefenseSourceBundleHash: spatialState.officialRangedFamilySourceBundle.bundleHash } : {}),
    ...(pointDefenseChoices && targetReactions ? { pointDefenseTargetConsumerScope: 'coexisting_disjoint_source_windows',
      overlappingTargetPointDefenseConsumerPending: true } : {}),
    ...(weaponBundle ? { weaponSourceBundleHash: weaponBundle.bundleHash,
      weaponDefinitionIds: weaponBundle.definitionIds, abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(meleeWeaponBundle ? { meleeWeaponSourceBundleHash: meleeWeaponBundle.bundleHash,
      meleeWeaponDefinitionIds: meleeWeaponBundle.definitionIds, abilityRouterHash: router.descriptor.runtimeHash } : {}),
    ...(largeRemoval ? { largeTerrainRemovalPolicy: spatialState.officialLargeTerrainRemovalPolicy } : {}),
    ...(semanticSpatialQueries ? { spatialSemanticQueryVersion: '1.0.0',
      spatialSemanticQueryKinds: ['legal_full_path_movement', 'coherency_after_candidate_placement'] } : {}),
    trainingTruth: false }, 'runtimeHash');
  function wrapDomain(sourceDomain, sourceRuntimeKind = 'ability') {
    const body = { ...sourceDomain, executorId: runtimeId, executorVersion: version,
      ...(weaponAdapter?.bindingForDomain(sourceDomain) || {}),
      sourceDomain, ruleAtomIds: sourceDomain.ruleAtomIds || (sourceRuntimeKind === 'template'
        ? templateAttack.descriptor.ruleAtomIds : [atomId]),
      ...((spatial || poisonousEssence || seekerPhaseEnd || stormPhaseEnd) ? { sourceRuntimeKind } : {}) };
    if (displacement && ['spatial', 'melee', 'relocation'].includes(sourceRuntimeKind)) {
      body.parameterSchema = { ...body.parameterSchema, tokenDisplacements: { type: 'array', optional: true,
        requiredWhen: battlefieldDisplacementSource ? 'actual_leading_model_overlaps_source_token'
          : 'actual_leading_model_overlaps_source_shade', controller: 'moving_leading_model_controller',
        items: { type: 'object', required: ['tokenId', 'coordinate'], tokenId: { type: 'current_source_token_handle' },
          coordinate: { coordinateUnit: 'milli-inch', required: ['xMilliInches', 'yMilliInches'] } } } };
    }
    delete body.domainId;
    return { ...body, domainId: `sc-domain-${hash(body)}` };
  }
  function assertRoundEndReactionParent(state) {
    holoRoundEnd?.pending(state);
    cleanupContinuation?.pending(state);
    if (outsidePlaceReactions && state.pendingPsionicTransferRoundEnd) psionicRoundEnd.pending(state);
    if (closeRanksReactions) {
      hiddenLossReactions.pending(state);
      displacement.pending(state);
    }
  }
  function assertTargetedAbilityPolicy(state) {
    if (!isDeepStrictEqual(state.officialTargetedActiveAbilityPolicy ?? null, targetedAbilityPolicy)) {
      throw Error('TARGETED_ACTIVE_ABILITY_LOS_POLICY_MISMATCH');
    }
    if (!isDeepStrictEqual(state.officialFeedbackReactionTimingPolicy, feedbackReactionTiming)) {
      throw Error('FEEDBACK_REACTION_TIMING_POLICY_MISMATCH');
    }
  }
  function khassarAttackContinuation(state) {
    for (const owner of khassarAttacks) {
      const parent = owner.pending(state);
      if (parent) return { owner, parent };
    }
    return null;
  }
  function enumerate(state, options = {}) {
    assertTargetedAbilityPolicy(state);
    const parent = ancestralWisdom?.pending(state);
    if (parent?.stage === 'reaction') return meleeEnumeration(state, reactionAdapter.legalSpace(state, options), 'reaction');
    const chargeParent = khassarCharge?.pending(state);
    const ordinary = enumerateNative(state, options);
    if (chargeParent || khassarAttacks.some(owner => owner.isOpeningProjection(state))) return ordinary;
    const attack = khassarAttackContinuation(state);
    if (attack) return attack.owner.continuationMenu(state, ordinary, attack.parent);
    if (parent?.stage === 'authorized') return ancestralWisdom.authorizedMenu(state, ordinary);
    // A signed damage sequence owns the choices through casualty selection.
    // Quoting an unrelated payment here changes the facts bound to that choice.
    if (state.pendingOfficialAutomaticHits || state.pendingOfficialHitsPoolChoice
      || (state.officialWave3FaqClarificationsHash && (state.pendingOfficialMeleePoolChoice
        || state.pendingOfficialRangedPrecisionChoice || state.pendingCurrentProductRangedCasualtyChoice
        || (state.pendingAction?.schema === OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA
          && state.pendingAction.stage === 'defender_casualty_selection')))) return ordinary;
    const menu = ancestralWisdom ? ancestralWisdom.extend(state, ordinary, options, enumerateNative) : ordinary;
    if (!khassarMovement || state.pendingOfficialReactionWindow || khassarOverwatch && overwatch.pending(state)
      || summonedActions?.pending(state)
      || executorsWill?.offer(state) || cardRefresh?.pending(state) || independentTemplateWindowPending(state)
      || khassarShot && (state.pendingCurrentProductRangedSequence || state.pendingCurrentProductRangedCasualtyChoice
        || precisionChoices?.hasPending(state))
      || khassarFight && (state.pendingOfficialMeleeSidearmSequence || meleeChoices?.hasPending(state))) return menu;
    const domains = [
      ...khassarMovement.movementDomains(state, options).map(domain => wrapDomain(domain, khassarMovement.descriptor.sourceRuntimeKind)),
      ...(khassarCharge?.domains(state, options) || []).map(domain => wrapDomain(domain, khassarCharge.descriptor.sourceRuntimeKind)),
      ...khassarAttacks.flatMap(owner => owner.domains(state, options).map(domain => wrapDomain(domain, owner.descriptor.sourceRuntimeKind))),
    ];
    return domains.length ? { ...menu, parameterDomains: [...menu.parameterDomains, ...domains] } : menu;
  }
  function enumerateNative(state, options = {}) {
    if (photonEntry && state.pendingOfficialReactionWindow?.triggerKind==='reserve_entered_non_entry') {
      return {...meleeEnumeration(state,reactionAdapter.legalSpace(state,options),'reaction'),releasePhaseControl:'blocked'};
    }
    if (artanisDash?.ownsDeclaration(state)) {
      return {...meleeEnumeration(state,artanisDash.enumerate(state,options),'melee'), releasePhaseControl:'blocked'};
    }
    if (afterChargeRoll && state.pendingOfficialReactionWindow?.triggerKind === 'after_charge_roll') {
      return { ...meleeEnumeration(state, reactionAdapter.legalSpace(state, options), 'reaction'), releasePhaseControl: 'blocked' };
    }
    if (lunge?.pending(state)) return meleeEnumeration(state, lunge.enumerate(state, options), OFFICIAL_RANGED_LUNGE_CONTINUATION_KIND);
    if (friendlySupplyLossReaction?.ownsWindow(state)) {
      return meleeEnumeration(state, reactionAdapter.legalSpace(state, options), 'reaction');
    }
    if (bombardReplacement?.ownsWindow(state)) return meleeEnumeration(state, bombardReplacement.enumerate(state, options), 'bombard_replacement');
    if (cardRefresh?.ownsWindow(state)) return meleeEnumeration(state, cardRefresh.enumerate(state, options), 'ranged_card_refresh');
    const parent = summonedActions?.pending(state);
    if (parent?.purpose === 'immediate_move' && !state.pendingOfficialReactionWindow) {
      return meleeEnumeration(state, summonedActions.enumerate(state, options), 'summoned_action');
    }
    const coreMenu = enumerateCore(state, options);
    const menu = overwatch ? overwatch.filterEnumeration(state, coreMenu) : coreMenu;
    if (holoRoundEnd && (holoRoundEnd.pending(state) || holoRoundEnd.canStart(state))) return menu;
    const filtered = summonedActions ? summonedActions.filterEnumeration(state, menu) : menu;
    if (includeReleasePhaseControl && (parent || overwatch?.pending(state))) {
      return { ...filtered, releasePhaseControl: 'blocked' };
    }
    if (stormPhaseEnd?.canUsePass?.(state)) {
      const pass = meleeEnumeration(state, { candidates: stormPhaseEnd.enumeratePass(state, options), parameterDomains: [] }, 'storm_phase_pass');
      return { ...filtered, candidates: [...filtered.candidates, ...pass.candidates],
        ...(includeReleasePhaseControl ? { releaseNativePassOwned: true } : {}) };
    }
    return filtered;
  }
  function assertSeekerPhaseEndOrder(state) {
    if (poisonousEssence?.canStart(state) || sabotageDronePhaseEnd?.pending(state) || sabotageDronePhaseEnd?.canStart(state)
      || bileResolution?.pending(state) || bileResolution?.canStart(state)) {
      throw Error('RAVEN_SEEKER_PHASE_END_MIXED_ORDER_UNRESOLVED');
    }
  }
  function assertStormPhaseEndOrder(state) {
    if (includePsionicStormAssaultDamage && !includeAdditionalAssaultEffectOrder && state.phase === 'assault'
      && (seekerPhaseEnd?.canStart(state) || poisonousEssence?.canStart(state) || sabotageDronePhaseEnd?.canStart(state)
        || (!includeSharedAssaultEffectOrder && bileResolution?.canStart(state)))) throw Error('PSIONIC_STORM_MIXED_ASSAULT_END_ORDER_REQUIRED');
  }
  function enumerateCore(state, options = {}) {
    const declared = rangedDeclaration?.pending(state);
    assertRoundEndReactionParent(state);
    if (holoRoundEnd && (holoRoundEnd.pending(state) || holoRoundEnd.canStart(state))) {
      return meleeEnumeration(state, holoRoundEnd.enumerate(state, options), 'holo_round_end');
    }
    if (hiddenLossReactions?.ownsWindow(state)) {
      return meleeEnumeration(state, reactionAdapter.legalSpace(state, options), 'reaction');
    }
    if (displacement?.pending(state)) {
      return meleeEnumeration(state, displacement.enumerate(state), displacementKind);
    }
    const tokenLeadingReaction = psionicPlaceReactions
      && postPlaceReactions?.pending(state)?.sourceKind === 'psionic_token_leading';
    if (!tokenLeadingReaction && psionicRoundEnd && (psionicRoundEnd.pending(state) || psionicRoundEnd.canStart(state))) {
      return meleeEnumeration(state, psionicRoundEnd.enumerate(state, options), 'psionic_round_end');
    }
    if (postPlaceReactions?.pending(state) && !state.pendingOfficialReactionWindow) {
      throw Error('CHARACTERISTIC_POST_PLACE_REACTION_CONTINUATION_REQUIRED');
    }
    if (['reaction','redirect'].includes(targetReactions?.pending(state)?.stage)) {
      const result = targetReactions.enumerate(state, options);
      return result.readyAttack ? meleeEnumeration(state, { candidates: [{ ...result.readyAttack, isEnabled: true }], parameterDomains: [] }, 'ranged')
        : meleeEnumeration(state, result, 'target_reaction');
    }
    if (ownsTemplateDamageReaction(state)) {
      return meleeEnumeration(state, templateAttack.enumerate(state, options), 'template');
    }
    if (state.pendingOfficialReactionWindow && ((transfusionMelee && state.pendingOfficialMeleeDamageReaction)
      || hits?.ownsDamageReactionWindow?.(state))) {
      return meleeEnumeration(state, reactionAdapter.legalSpace(state, options), 'reaction');
    }
    if (reactionAdapter && state.pendingOfficialReactionWindow && !precisionChoices?.hasPending(state)
      && !meleeChoices?.hasPending(state) && !hitsChoices?.hasPending(state)) {
      return meleeEnumeration(state, reactionAdapter.legalSpace(state, options), 'reaction');
    }
    if (chargeDeclaration?.pending(state)) {
      return meleeEnumeration(state, chargeDeclaration.enumerate(state, options), 'charge_declaration');
    }
    if (cleanupContinuation && state.phase === 'cleanup') {
      return meleeEnumeration(state, { candidates: cleanupContinuation.candidates(state, options).map(row => ({ ...row, isEnabled: true })), parameterDomains: [] }, 'cleanup');
    }
    if (hitsChoices?.hasPending(state)) return meleeEnumeration(state, hitsChoices.enumerate(state, options), 'hits_choice');
    if (hits?.hasPending(state)) return meleeEnumeration(state, hits.enumerate(state, options), 'hits');
    if (releaseAssaultOrder?.pending(state) && !releaseAssaultOrder.resolvingChild(state)) {
      const menu = meleeEnumeration(state, { candidates: [], parameterDomains: [] }, 'bile_resolution');
      for (const { kind, action } of releaseAssaultOrder.candidates(state, options.sideKey ?? state.activeSideKey)) {
        menu.candidates.push(...meleeEnumeration(state, { candidates: [action], parameterDomains: [] }, kind).candidates);
      }
      return menu;
    }
    if (stormPhaseEnd?.pending(state)) {
      assertStormPhaseEndOrder(state);
      const menu = stormPhaseEnd.enumerate(state, options);
      if (!includeSharedAssaultEffectOrder) return meleeEnumeration(state, menu, 'storm_phase_end');
      const result = meleeEnumeration(state, { candidates: [], parameterDomains: [] }, 'storm_phase_end');
      for (const { phaseEndSourceKind = 'storm_phase_end', ...candidate } of menu.candidates) {
        result.candidates.push(...meleeEnumeration(state, { candidates: [candidate], parameterDomains: [] }, phaseEndSourceKind).candidates);
      }
      return result;
    }
    if (seekerPhaseEnd?.canStart(state)) {
      assertSeekerPhaseEndOrder(state);
      return meleeEnumeration(state, seekerPhaseEnd.enumerate(state, options), 'seeker_phase_end');
    }
    if (poisonousEssence?.canStart(state)) {
      if (sabotageDronePhaseEnd?.pending(state) || sabotageDronePhaseEnd?.canStart(state)
        || bileResolution?.pending(state) || bileResolution?.canStart(state)) {
        throw Error('POISONOUS_ESSENCE_PHASE_END_ORDER_COMPOSITION_REQUIRED');
      }
      return meleeEnumeration(state, poisonousEssence.enumerate(state, options), 'poisonous_essence_end');
    }
    if (sabotageDronePhaseEnd?.pending(state)) {
      return meleeEnumeration(state, sabotageDronePhaseEnd.enumerate(state, options), 'sabotage_phase_end');
    }
    if (bileResolution && (bileResolution.pending(state) || bileResolution.canStart(state))) {
      return meleeEnumeration(state, bileResolution.enumerate(state, options), 'bile_resolution');
    }
    if (sabotageDronePhaseEnd?.canStart(state)) {
      return meleeEnumeration(state, sabotageDronePhaseEnd.enumerate(state, options), 'sabotage_phase_end');
    }
    if (meleeChoices?.hasPending(state)) return meleeEnumeration(state, meleeChoices.enumerate(state, options), 'melee_choice');
    if (precisionChoices?.hasPending(state)) {
      const pending = precisionChoices.enumerate(state, options);
      return { schemaVersion: 'starcraft_tmg_official_executable_legal_enumeration_v1',
        candidates: pending.candidates.map(row => ({
          ...wrapAction(state, Object.fromEntries(Object.entries(row)
            .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key))), 'precision'),
          isEnabled: true, disabledReason: '' })),
        parameterDomains: pending.parameterDomains.map(row => wrapDomain(row, 'precision')),
        unsupportedDiagnostics: [], legalSpaceComplete: true, developmentSubset: false, trainingTruth: false };
    }
    if (targetReactions?.pending(state)?.stage === 'ready' && !templateAttack?.hasPending(state)) {
      const result = targetReactions.enumerate(state, options);
      return meleeEnumeration(state, { candidates: result.readyAttack ? [{ ...result.readyAttack, isEnabled: true }] : [],
        parameterDomains: result.parameterDomains || [] }, result.readyAttackKind || 'ranged');
    }
    if (pointDefenseChoices?.pending(state)) {
      const pending = pointDefenseChoices.enumerate(state, options);
      return { schemaVersion: 'starcraft_tmg_official_executable_legal_enumeration_v1',
        candidates: pending.readyAttack ? [{
          ...wrapAction(state, pending.readyAttack.action, pending.readyAttack.kind), isEnabled: true, disabledReason: '' }] : [],
        parameterDomains: pending.parameterDomains.map(row => wrapDomain(row, 'point_defense')),
        unsupportedDiagnostics: [], legalSpaceComplete: true, developmentSubset: false, trainingTruth: false };
    }
    if (templateAttack?.hasPending(state)) {
      const pending = templateAttack.enumerate(state, options);
      return { schemaVersion: 'starcraft_tmg_official_executable_legal_enumeration_v1',
        candidates: (pending.candidates || []).map(row => ({ ...wrapAction(state, Object.fromEntries(Object.entries(row)
          .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key))), 'template'),
          isEnabled: true, disabledReason: '' })),
        parameterDomains: pending.parameterDomains.map(row => wrapDomain(row, 'template')),
        unsupportedDiagnostics: [], legalSpaceComplete: true, developmentSubset: false, trainingTruth: false };
    }
    if (headShotSource && declared && state.pendingCurrentProductRangedCasualtyChoice) {
      return meleeEnumeration(state, ranged.enumerate(state, options), 'ranged');
    }
    if (declared) {
      const kind = rangedDeclaration.attackKind(state, declared.pieceId);
      const targetMenu = (kind === 'ranged' ? ranged : templateAttack).enumerate(state, options);
      return meleeEnumeration(state, { ...targetMenu, parameterDomains: targetMenu.parameterDomains.filter(row =>
        row.pieceId === declared.pieceId && (kind !== 'ranged' || row.weaponName === declared.profileKey.split('::').at(-1))) }, kind);
    }
    if (exclusiveRangedContinuation && ranged && (state.pendingCurrentProductRangedCasualtyChoice || state.pendingCurrentProductRangedSequence)) {
      return meleeEnumeration(state, ranged.enumerate(state, options), 'ranged');
    }
    if (includeLungeOverwatchContinuation && overwatch?.pending(state)?.stage === 'attack') {
      return meleeEnumeration(state, ranged.enumerate(state, options), 'ranged');
    }
    if (executorsWill?.offer(state)) {
      return meleeEnumeration(state, { candidates: executorsWill.candidates(state, options)
        .map(row => ({ ...row, isEnabled: true })), parameterDomains: [] }, 'executors_will');
    }
    const fighting = melee?.enumerate(state, options);
    if (melee && state.pendingAction?.schema === OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA) {
      return meleeEnumeration(state, fighting, 'melee');
    }
    if (melee && readOfficialMeleeSidearmSequenceV1(state)) return meleeEnumeration(state, fighting, 'melee');
    const template = templateAttack?.enumerate(state, options);
    const shooting = ranged?.enumerate(state, options);
    const rangedPending = ranged && (state.pendingCurrentProductRangedCasualtyChoice || state.pendingCurrentProductRangedSequence);
    const result = rangedPending ? { parameterDomains: [] } : adapter ? adapter.legalSpace(state, options) : { parameterDomains: [] };
    const movement = rangedPending ? null : spatial?.enumerate(state, options);
    const finishing = rangedPending ? null : activation?.enumerate(state, options);
    const life = rangedPending ? null : unitLifecycleAdapter?.legalSpace(state, options);
    const terranSupply = rangedPending ? null : terranSupplyAdapter?.legalSpace(state, options);
    const zergUnique = rangedPending ? null : zergUniqueAdapter?.legalSpace(state, options);
    const khalai = rangedPending ? null : khalaiAdapter?.legalSpace(state, options);
    const assets = !rangedPending && activeBattlefieldAssets ? battlefieldModifierAdapter.legalSpace(state, options) : null;
    const relocation = rangedPending ? null : relocationAdapter?.legalSpace(state, options);
    const bileMenu = rangedPending ? null : bile?.legalSpace(state, options);
    const bombardMenu = rangedPending ? null : bombard?.legalSpace(state, options);
    const darkSwarmMenu = rangedPending ? null : darkSwarmPlacement?.legalSpace(state, options);
    const plagueMenu = rangedPending ? null : plague?.legalSpace(state, options);
    const stormCastMenu = rangedPending ? null : stormCast?.legalSpace(state, options);
    const psionicMenu = rangedPending ? null : psionic?.legalSpace(state, options);
    const pendingTemplates = new Set(pendingTemplateRoutes
      .map(row => JSON.stringify([row.pieceId, row.weaponName])));
    const diagnostics = ranged ? listOfficialUnsupportedActionRoutesV1(state.officialActionRouteCatalogue,
      { sideKey: options.sideKey || state.activeSideKey, phase: state.phase })
      .filter(row => pendingTemplates.has(JSON.stringify([row.action.pieceId, row.action.abilityName])))
      .map(row => ({ ...row, disabledReason: templateCoverage
        && row.action.abilityName === state.officialBlastTemplateGeometryAsset.scope.weaponName
        && state.pieces.some(piece => piece.id === row.action.pieceId
          && piece.officialUnitRecordKey === state.officialBlastTemplateGeometryAsset.scope.recordKey)
        ? 'OFFICIAL_TEMPLATE_DAMAGE_RUNTIME_REQUIRED' : 'OFFICIAL_TEMPLATE_GEOMETRY_AND_RUNTIME_REQUIRED' })) : [];
    return { schemaVersion: 'starcraft_tmg_official_executable_legal_enumeration_v1',
      candidates: (shooting?.candidates || []).filter(row => row.isEnabled !== false).map(row => {
        const sourceAction = Object.fromEntries(Object.entries(row).filter(([key]) =>
          !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
        return { ...wrapAction(state, sourceAction, 'ranged'), isEnabled: true, disabledReason: '' };
      }),
      parameterDomains: [...(rangedDeclaration?.enumerate(state, options).parameterDomains || []).map(row => wrapDomain(row, 'ranged_declaration')),
        ...(personalTransport?.enumerate(state, options).parameterDomains || []).map(row => wrapDomain(row, 'personal_transport')),
        ...result.parameterDomains.map(row => wrapDomain(row)),
        ...(bileMenu?.parameterDomains || []).map(row => wrapDomain(row, 'corrosive_bile')),
        ...(bombardMenu?.parameterDomains || []).map(row => wrapDomain(row, 'bombard')),
        ...(darkSwarmMenu?.parameterDomains || []).map(row => wrapDomain(row, 'dark_swarm_placement')),
        ...(plagueMenu?.parameterDomains || []).map(row => wrapDomain(row, 'plague')),
        ...(stormCastMenu?.parameterDomains || []).map(row => wrapDomain(row, 'storm_cast')),
        ...(psionicMenu?.parameterDomains || []).map(row => wrapDomain(row, 'psionic_transfer')),
        ...(life?.parameterDomains || []).map(row => wrapDomain(row, 'unit_lifecycle')),
        ...(terranSupply?.parameterDomains || []).map(row => wrapDomain(row, 'terran_mission_supply')),
        ...(zergUnique?.parameterDomains || []).map(row => wrapDomain(row, zergUniqueRuntimeKind)),
        ...(khalai?.parameterDomains || []).map(row => wrapDomain(row, 'khalai_activation')),
        ...(assets?.parameterDomains || []).map(row => wrapDomain(row, 'battlefield_asset')),
        ...(relocation?.parameterDomains || []).map(row => wrapDomain(row, 'relocation')),
        ...(movement?.parameterDomains || []).map(row => wrapDomain(row, 'spatial')),
        ...(shooting?.parameterDomains || []).filter(row => !headShotSource
          || rangedDeclaration.attackKind(state, row.pieceId) !== 'ranged'
          || !rangedDeclaration.ownsUnit(state, state.pieces.find(piece => piece.id === row.pieceId))).map(row => wrapDomain(row, 'ranged')),
        ...(template?.parameterDomains || []).filter(row => !rangedDeclaration?.ownsUnit(state, state.pieces.find(piece => piece.id === row.pieceId)))
          .map(row => wrapDomain(row, 'template')),
        ...(fighting?.parameterDomains || []).map(row => wrapDomain(row,
          chargeDeclaration && row.actionType === 'charge' ? 'charge_declaration' : 'melee')),
        ...(finishing?.parameterDomains || []).filter(row => row.actionType === 'finish_activation'
          || row.actionType === 'use_active_ability' && (selectedAbilityAdapter || plague && row.abilityName === 'Combat Shield'))
          .map(row => wrapDomain(row, 'activation'))],
      ...(includeReleasePhaseControl && !rangedPending && !state.pendingAction && !state.pendingOfficialReactionWindow
        ? { releasePhaseControl: state.selectedRosterActivationWindow?.stage === 'before_action' ? 'mission_only'
          : state.selectedRosterActivationWindow ? 'blocked' : 'open' } : {}),
      unsupportedDiagnostics: diagnostics, legalSpaceComplete: true, developmentSubset: false, trainingTruth: false };
  }
  function meleeEnumeration(state, source, kind) {
    return { schemaVersion: 'starcraft_tmg_official_executable_legal_enumeration_v1',
      candidates: (source.candidates || []).filter(row => row.isEnabled !== false).map(row => ({
        ...wrapAction(state, Object.fromEntries(Object.entries(row)
          .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key))), kind),
        isEnabled: true, disabledReason: '' })),
      parameterDomains: source.parameterDomains.map(row => wrapDomain(row, kind)),
      unsupportedDiagnostics: source.unsupportedDiagnostics || [], legalSpaceComplete: true,
      developmentSubset: false, trainingTruth: false };
  }
  function assertRangedContinuationOwner(state, entry) {
    if (!exclusiveRangedContinuation || entry.sourceRuntimeKind === 'ranged'
      || !(state.pendingCurrentProductRangedCasualtyChoice || state.pendingCurrentProductRangedSequence)) return;
    const menu = enumerate(state, {sideKey: entry.sideKey});
    const admitted = [...menu.candidates,...menu.parameterDomains].some(option => option.sourceRuntimeKind === entry.sourceRuntimeKind);
    if (!admitted) throw Error('RELEASE_RANGED_CONTINUATION_REQUIRED');
  }
  function instantiate(state, domain, parameters) {
    assertRangedContinuationOwner(state, domain);
    const prepared = instantiateNative(state, domain, parameters);
    const parent = ancestralWisdom?.pending(state);
    if (parent?.stage === 'authorized'
      && !isDeepStrictEqual(prepared.canonicalParameters, parent.canonicalParameters)) {
      throw Error('ANCESTRAL_WISDOM_PAYMENT_PARAMETERS_MISMATCH');
    }
    return prepared;
  }
  function khassarDeclarationOwner(kind) {
    const attack = attackOwnerFor(kind);
    if (attack) return { owner: attack, kind: 'ATTACK', planFor: attack.planFor };
    if (khassarCharge?.descriptor.sourceRuntimeKind === kind && khassarCharge) {
      return { owner: khassarCharge, kind: 'CHARGE', planFor: action => action.chargeDelegationPlan };
    }
    if (khassarMovement?.descriptor.sourceRuntimeKind === kind && khassarMovement) {
      return { owner: khassarMovement, kind: 'MOVEMENT', planFor: action => action.movementPlan };
    }
    return null;
  }
  function instantiateKhassarDomain(state, domain, parameters) {
    const binding = khassarDeclarationOwner(domain?.sourceRuntimeKind);
    if (!binding) throw Error('KHASSAR_DOMAIN_OWNER_REQUIRED');
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains
      .find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) throw Error('KHASSAR_' + binding.kind + '_DOMAIN_STALE');
    const value = binding.owner.instantiate(state, current.sourceDomain, parameters);
    return { canonicalParameters: value.canonicalParameters,
      action: wrapAction(state, value.action, domain.sourceRuntimeKind) };
  }
  function instantiateNative(state, domain, parameters) {
    if (domain.sourceRuntimeKind === OFFICIAL_RANGED_LUNGE_CONTINUATION_KIND && lunge) {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('LUNGE_REACTION_DOMAIN_STALE');
      const prepared = lunge.prepare(state, current.sourceDomain, parameters);
      return { canonicalParameters: prepared.canonicalParameters, action: wrapAction(state, prepared.action, domain.sourceRuntimeKind) };
    }
    if (khassarDeclarationOwner(domain.sourceRuntimeKind)) {
      return registeredKhassar ? router.dispatch({ operation: 'preview', state,
        adapterId: registeredKhassar.descriptor.adapterId, request: { domain, parameters } })
        : instantiateKhassarDomain(state, domain, parameters);
    }
    if (ancestralWisdom && domain.sourceRuntimeKind === ancestralWisdom.descriptor.intentKind) {
      const prepared = ancestralWisdom.prepare(state, domain, parameters, enumerateNative, instantiate);
      return { canonicalParameters: prepared.canonicalParameters,
        action: wrapAction(state, prepared.action, ancestralWisdom.descriptor.intentKind) };
    }
    if (domain.sourceRuntimeKind === 'storm_cast') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = stormCast.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'storm_cast') };
    }
    if (domain.sourceRuntimeKind === 'plague') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = plague.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'plague') };
    }
    if (domain.sourceRuntimeKind === 'bombard_replacement') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = bombardReplacement.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'bombard_replacement') };
    }
    if (domain.sourceRuntimeKind === 'bombard') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = bombard.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'bombard') };
    }
    if (domain.sourceRuntimeKind === 'dark_swarm_placement') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = darkSwarmPlacement.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'dark_swarm_placement') };
    }
    if (domain.sourceRuntimeKind === 'charge_declaration') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = chargeDeclaration.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'charge_declaration') };
    }
    if (domain.sourceRuntimeKind === 'ranged_card_refresh') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = cardRefresh.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'ranged_card_refresh') };
    }
    if (domain.sourceRuntimeKind === 'holo_round_end') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const prepared = holoRoundEnd.instantiate(state, domain.sourceDomain, parameters);
      return { ...prepared, action: wrapAction(state, prepared.action, 'holo_round_end') };
    }
    if (domain.sourceRuntimeKind === 'summoned_action') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const prepared = summonedActions.instantiate(state, domain.sourceDomain, parameters);
      return { ...prepared, action: wrapAction(state, prepared.action, 'summoned_action') };
    }
    if (domain.sourceRuntimeKind === 'personal_transport') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const prepared = personalTransport.instantiate(state, domain.sourceDomain, parameters);
      return { ...prepared, action: wrapAction(state, prepared.action, 'personal_transport') };
    }
    if (domain.sourceRuntimeKind === 'ranged_declaration') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = rangedDeclaration.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'ranged_declaration') };
    }
    if (!hiddenLossReactions?.ownsWindow(state) && displacement?.pending(state)
      && domain.sourceRuntimeKind !== displacementKind) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_CONTINUATION_REQUIRED');
    let tokenChoices;
    if (displacement && ['spatial', 'melee', 'relocation'].includes(domain.sourceRuntimeKind)) {
      const split = displacement.split(parameters);
      parameters = split.coreParameters;
      tokenChoices = split.choices;
    }
    if (domain.sourceRuntimeKind === 'psionic_round_end') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = psionicRoundEnd.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'psionic_round_end') };
    }
    if (domain.sourceRuntimeKind === displacementKind) {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = displacement.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, displacementKind) };
    }
    if (domain.sourceRuntimeKind === 'psionic_transfer') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const preview = router.dispatch({ operation: 'preview', adapterId: psionic.descriptor.adapterId,
        state, request: { domain: domain.sourceDomain, parameters } });
      return { canonicalParameters: preview.canonicalParameters, action: wrapAction(state, preview.action, 'psionic_transfer') };
    }
    if (domain.sourceRuntimeKind === 'sabotage_phase_end') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const value = sabotageDronePhaseEnd.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: value.canonicalParameters, action: wrapAction(state, value.action, 'sabotage_phase_end') };
    }
    if (domain.sourceRuntimeKind === 'bile_resolution') {
      const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const instantiated = bileResolution.instantiate(state, domain.sourceDomain, parameters);
      return { canonicalParameters: instantiated.canonicalParameters, action: wrapAction(state, instantiated.action, 'bile_resolution') };
    }
    if (domain.sourceRuntimeKind === 'corrosive_bile') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      const preview = router.dispatch({ operation: 'preview', adapterId: bile.descriptor.adapterId,
        state, request: { domain: domain.sourceDomain, parameters } });
      return { canonicalParameters: preview.canonicalParameters, action: wrapAction(state, preview.action, 'corrosive_bile') };
    }
    if (domain.sourceRuntimeKind === 'reaction') {
      const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
      if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
      if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)
        || Object.keys(parameters).some(key => !domain.sourceDomain.parameterSchema.required.includes(key))) {
        throw Error('CHARACTERISTIC_REACTION_SEMANTIC_PARAMETERS_REQUIRED');
      }
      const preview = router.dispatch({ operation: 'preview', adapterId: reactionAdapter.descriptor.adapterId,
        state, request: { domain: domain.sourceDomain, parameters } });
      return { canonicalParameters: preview.action.reactionPlan.canonicalParameters,
        action: wrapAction(state, preview.action, 'reaction') };
    }
    if (!['spatial', 'activation', 'unit_lifecycle', 'battlefield_asset', 'relocation', 'ranged', 'template', 'precision', 'point_defense', 'target_reaction', 'melee', 'melee_choice', 'hits', 'hits_choice'].includes(domain.sourceRuntimeKind) && (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)
      || Object.keys(parameters).some(key => !['activeUnitId', 'paymentCardInstanceIds', 'targetUnitId',
        ...(domain.sourceDomain?.effectKind === 'automatic_hits_engaged' ? ['targetOrder'] : []),
        ...(domain.sourceDomain?.effectKind === 'executors_will' ? ['targetUnitIds'] : []),
        ...(domain.sourceDomain?.effectKind === 'our_duty_is_unending' ? ['refreshCardInstanceIds'] : []),
        ...(domain.sourceDomain?.effectKind === 'broodmother_army_buff' ? ['broodmotherEffect'] : []),
        ...(['force_wall_pair', 'force_wall_push'].includes(domain.sourceDomain?.effectKind) ? ['positions'] : []),
        ...(domain.sourceDomain?.effectKind === 'marker_speed_debuff' ? ['coordinate'] : [])].includes(key)))) {
      throw Error('CHARACTERISTIC_COMPONENT_SEMANTIC_PARAMETERS_REQUIRED');
    }
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) throw Error('CHARACTERISTIC_COMPONENT_DOMAIN_STALE');
    if (domain.sourceRuntimeKind === 'battlefield_asset') {
      const preview = battlefieldModifierAdapter.preview(state, { domain: domain.sourceDomain, parameters });
      return { canonicalParameters: structuredClone(preview.action.battlefieldAssetPlan.canonicalParameters),
        action: wrapAction(state, preview.action, 'battlefield_asset') };
    }
    if (domain.sourceRuntimeKind === 'terran_mission_supply') {
      const preview = terranSupplyAdapter.preview(state, { domain: domain.sourceDomain, parameters });
      return { canonicalParameters: preview.action.terranUniquePlan.canonicalParameters,
        action: wrapAction(state, preview.action, 'terran_mission_supply') };
    }
    if (domain.sourceRuntimeKind === zergUniqueRuntimeKind) {
      const preview = zergUniqueAdapter.preview(state, { domain: domain.sourceDomain, parameters });
      return { canonicalParameters: preview.action.zergUniquePlan.canonicalParameters,
        action: wrapAction(state, preview.action, zergUniqueRuntimeKind) };
    }
    if (domain.sourceRuntimeKind === 'khalai_activation') {
      const preview = khalaiAdapter.preview(state, { domain: domain.sourceDomain, parameters });
      return { canonicalParameters: preview.action.protossUniquePlan.canonicalParameters,
        action: wrapAction(state, preview.action, 'khalai_activation') };
    }
    if (domain.sourceRuntimeKind === 'unit_lifecycle') {
      const preview = unitLifecycleAdapter.preview(state, { domain: domain.sourceDomain, parameters });
      const canonical = preview.action.unitLifecyclePlan.canonicalParameters;
      if (domain.sourceDomain.definitionId === OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID) {
        return { canonicalParameters: { activeUnitId: canonical.activeUnitId,
          paymentCardInstanceIds: canonical.paymentCardInstanceIds, parentContactModelId: canonical.parentContactModelId,
          placementPlan: canonical.placementPlan }, action: wrapAction(state, preview.action, 'unit_lifecycle') };
      }
      if (holoSummonRoutes.some(route => route.definitionId === domain.sourceDomain.definitionId)) return { canonicalParameters: { activeUnitId: canonical.activeUnitId,
        paymentCardInstanceIds: canonical.paymentCardInstanceIds, coordinate: canonical.coordinate },
        action: wrapAction(state, preview.action, 'unit_lifecycle') };
      return { canonicalParameters: { activeUnitId: canonical.activeUnitId,
        paymentCardInstanceIds: canonical.paymentCardInstanceIds, coordinate: canonical.coordinate,
        ...((cocoonRespawn || cocoonMorph || vilelingRespawn || swarmlingRespawn) && domain.sourceDomain.effectKind === 'respawn_models' && canonical.placementPlan
          ? { placementPlan: canonical.placementPlan } : {}),
        ...(cocoonMorph && canonical.sourceModelId ? { sourceModelId: canonical.sourceModelId } : {}) },
        action: wrapAction(state, preview.action, 'unit_lifecycle') };
    }
    if (['spatial', 'melee', 'relocation'].includes(domain.sourceRuntimeKind)) {
      const preview = instantiateMovementCore(state, domain, parameters);
      return finishInstantiation(state, preview.action, domain.sourceRuntimeKind, preview.canonicalParameters, tokenChoices);
    }
    if (['activation', 'ranged', 'template', 'precision', 'point_defense', 'target_reaction', 'melee_choice', 'hits', 'hits_choice'].includes(domain.sourceRuntimeKind)) {
      const delegate = { activation, ranged, template: templateAttack, precision: precisionChoices,
        point_defense: pointDefenseChoices, target_reaction: targetReactions, melee_choice: meleeChoices, hits, hits_choice: hitsChoices }[domain.sourceRuntimeKind];
      const instantiated = ['ranged', 'template'].includes(domain.sourceRuntimeKind)
        && weaponAdapter?.bindingForDomain(domain.sourceDomain)
        ? weaponAdapter.preview(state, { domain: domain.sourceDomain, parameters })
        : delegate.instantiate(state, domain.sourceDomain, parameters);
      return finishInstantiation(state, instantiated.action, domain.sourceRuntimeKind, instantiated.canonicalParameters, tokenChoices);
    }
    if (!adapter) throw Error("CHARACTERISTIC_COMPONENT_ABILITY_SOURCE_REQUIRED");
    const preview = adapter.preview(state, { domain: domain.sourceDomain, parameters });
    const sourceAction = preview.action;
    return { canonicalParameters: sourceAction.characteristicStatusPlan.canonicalParameters,
      action: wrapAction(state, sourceAction, 'ability') };
  }
  function finishInstantiation(state, sourceAction, kind, canonicalParameters, tokenChoices) {
    const prepared = tokenChoices !== undefined ? displacement.prepare(state, kind, sourceAction, tokenChoices) : null;
    return { canonicalParameters: { ...canonicalParameters, ...(tokenChoices?.length ? { tokenDisplacements: tokenChoices } : {}) },
      action: prepared ? wrapAction(state, prepared.action, displacementKind) : wrapAction(state, sourceAction, kind) };
  }
  function instantiateMovementCore(state, domain, parameters) {
    if (domain.sourceRuntimeKind === 'relocation') {
      const value = relocationAdapter.preview(state, { domain: domain.sourceDomain, parameters });
      return { ...value, canonicalParameters: value.action.relocationPlan.canonicalParameters };
    }
    const delegate = domain.sourceRuntimeKind === 'spatial' ? spatial : melee;
    return domain.sourceRuntimeKind === 'melee' && weaponAdapter?.bindingForDomain(domain.sourceDomain)
      ? weaponAdapter.preview(state, { domain: domain.sourceDomain, parameters })
      : delegate.instantiate(state, domain.sourceDomain, parameters);
  }
  function selectDisplacementMovementDomain(state, request) {
    const domains = enumerate(state).parameterDomains.filter(row => row.pieceId === request.pieceId
      && row.actionType === request.actionType && ['spatial', 'melee', 'relocation'].includes(row.sourceRuntimeKind)
      && (request.definitionId === undefined || row.definitionId === request.definitionId)
      && (request.weaponName === undefined || row.weaponName === request.weaponName));
    if (!domains.length) throw Error('PSIONIC_DISPLACEMENT_MOVEMENT_DOMAIN_UNAVAILABLE');
    if (domains.length > 1) throw Error('PSIONIC_DISPLACEMENT_MOVEMENT_DOMAIN_AMBIGUOUS');
    return domains[0];
  }
  function prepareDisplacementMovementQuery(state, request) {
    const domain = selectDisplacementMovementDomain(state, request);
    const value = instantiateMovementCore(state, domain, request.parameters);
    const geometry = getOfficialDisplacementMovementGeometryV1(value.action);
    if (!geometry?.finalModelPositions) throw Error('PSIONIC_DISPLACEMENT_MOVEMENT_REQUIRED');
    const projected = value.action.meleePlan?.closeRanksGeometry
      ? melee.projectCloseRanksMovement(state, value.action)
      : applySource(state, wrapAction(state, value.action, domain.sourceRuntimeKind, true), {}).state;
    return { action: value.action, geometry, state: projected, sideKey: domain.sideKey };
  }
  function displacedFightContinuationContext(state, original) {
    if (!melee) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_MELEE_REQUIRED');
    const plan = original.meleePlan;
    const domain = melee.enumerate(state).parameterDomains.find(row => row.actionType === 'fight'
      && row.pieceId === original.pieceId && row.profileKey === plan.profileKey);
    if (!domain) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_FIGHT_UNAVAILABLE');
    const parameters = { closeRanksMode: 'decline', allocations: plan.allocations,
      ...(plan.canonicalParameters.surgeTargetUnitId ? { surgeTargetUnitId: plan.canonicalParameters.surgeTargetUnitId } : {}),
      ...(plan.canonicalParameters.criticalTargetUnitId ? { criticalTargetUnitId: plan.canonicalParameters.criticalTargetUnitId } : {}) };
    const schema = { type: 'object', additionalProperties: false, required: [], properties: {} };
    if (closeRanksReactions) {
      const allocatedTargets = plan.allocations.map(row => row.targetUnitId);
      for (const field of ['surgeTargetUnitId', 'criticalTargetUnitId']) {
        if (!domain.parameterSchema.required.includes(field) || parameters[field]) continue;
        const allowed = domain.parameterSchema.properties[field].enum.filter(id => allocatedTargets.includes(id));
        if (allowed.length === 1) parameters[field] = allowed[0];
        else {
          schema.required.push(field);
          schema[field] = { type: 'string', enum: allowed };
          schema.properties[field] = schema[field];
        }
      }
    }
    return { domain, parameters, schema };
  }
  function prepareDisplacedFightContinuation(state, original, choices = {}) {
    const { domain, parameters, schema } = displacedFightContinuationContext(state, original);
    if (!choices || typeof choices !== 'object' || Array.isArray(choices)
      || Object.keys(choices).length !== schema.required.length
      || schema.required.some(field => !schema[field].enum.includes(choices[field]))) {
      throw Error('PSIONIC_DISPLACEMENT_CONTINUATION_CHOICES_INVALID');
    }
    Object.assign(parameters, choices);
    const prepared = weaponAdapter?.bindingForDomain(domain)
      ? weaponAdapter.preview(state, { domain, parameters }) : melee.instantiate(state, domain, parameters);
    if (!isDeepStrictEqual(prepared.action.meleePlan.contributingModelIds, original.meleePlan.contributingModelIds)
      || prepared.action.meleePlan.attackDice !== original.meleePlan.attackDice) {
      throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_ATTACK_CONTRIBUTION_CHANGED');
    }
    return wrapAction(state, prepared.action, 'melee');
  }
  function wrapAction(state, sourceAction, sourceRuntimeKind, validatedDisplacement = false) {
    if (!validatedDisplacement) displacementProducer?.assertEndpoint(state, sourceAction);
    if (targetReactions && ['ranged', 'template', 'melee'].includes(sourceRuntimeKind)) {
      const intercepted = targetReactions.intercept(state, sourceAction);
      if (intercepted) {
        if (!intercepted.standDeclaration && pointDefenseChoices?.intercept(state, sourceRuntimeKind, sourceAction)) {
          throw Error('CHARACTERISTIC_TARGET_POINT_DEFENSE_OVERLAP_CONSUMER_REQUIRED');
        }
        return wrapAction(state, intercepted, 'target_reaction');
      }
    }
    if (sourceRuntimeKind === 'hits' && hitsChoices) {
      const intercepted = hitsChoices.intercept(state, sourceAction);
      if (intercepted) return wrapAction(state, intercepted, 'hits_choice');
    }
    if (sourceRuntimeKind === 'melee' && meleeChoices) {
      const intercepted = meleeChoices.intercept(state, sourceAction);
      if (intercepted) return wrapAction(state, intercepted, 'melee_choice');
    }
    if (pointDefenseChoices && ['ranged', 'template'].includes(sourceRuntimeKind)) {
      const intercepted = pointDefenseChoices.intercept(state, sourceRuntimeKind, sourceAction);
      if (intercepted) return wrapAction(state, intercepted, 'point_defense');
    }
    if (precisionChoices && ['ranged', 'template'].includes(sourceRuntimeKind)) {
      const intercepted = precisionChoices.intercept(state, sourceRuntimeKind, sourceAction);
      if (intercepted) return wrapAction(state, intercepted, 'precision');
    }
    return { actionType: sourceAction.actionType, sideKey: sourceAction.sideKey, phase: sourceAction.phase,
        ...(sourceAction.pieceId !== undefined ? { pieceId: sourceAction.pieceId } : {}),
        ...(weaponAdapter?.bindingFor(sourceAction) || {}),
        ...(sourceAction.abilityName !== undefined ? { abilityName: sourceAction.abilityName } : {}),
        executorId: runtimeId, executorVersion: version, ruleAtomIds: sourceAction.ruleAtomIds || (sourceRuntimeKind === 'ranged' ? rangedAtomIds
          : sourceRuntimeKind === 'template' ? templateAttack.descriptor.ruleAtomIds : [atomId]),
        sourceAction, sourceActionHash: hash(sourceAction),
        ...((sourceAction.chance || sourceAction.rangedPlan?.chance)
          ? { chance: sourceAction.chance || sourceAction.rangedPlan.chance } : {}),
        ...((spatial || poisonousEssence || seekerPhaseEnd || stormPhaseEnd) ? { sourceRuntimeKind } : {}) };
  }
  function applySource(state, action, options) {
    if (action.executorId !== runtimeId || action.executorVersion !== version
      || action.sourceActionHash !== hash(action.sourceAction)) throw Error('CHARACTERISTIC_COMPONENT_ACTION_INVALID');
    if (lunge?.pending(state)) {
      if (action.sourceRuntimeKind !== OFFICIAL_RANGED_LUNGE_CONTINUATION_KIND) throw Error('LUNGE_REACTION_CHOICE_REQUIRED');
      return lunge.apply(state, action.sourceAction, options);
    }
    if (action.sourceRuntimeKind === OFFICIAL_RANGED_LUNGE_CONTINUATION_KIND) throw Error('LUNGE_REACTION_ACTION_STALE');
    if (ancestralWisdom?.pending(state)?.stage === 'reaction') {
      if (action.sourceRuntimeKind !== 'reaction') throw Error('ANCESTRAL_WISDOM_REACTION_CHOICE_REQUIRED');
      return ancestralWisdom.complete(router.dispatch({ operation: 'apply', adapterId: reactionAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } }));
    }
    if (ancestralWisdom && action.sourceRuntimeKind === ancestralWisdom.descriptor.intentKind) {
      return ancestralWisdom.open(state, action.sourceAction, enumerate, enumerateNative, instantiate);
    }
    ancestralWisdom?.assertAuthorizedCast(state, action, enumerate, instantiate);
    if (friendlySupplyLossReaction?.ownsWindow(state)) {
      if (action.sourceRuntimeKind !== 'reaction') throw Error('FRIENDLY_SUPPLY_LOSS_REACTION_CHOICE_REQUIRED');
      return friendlySupplyLossReaction.complete(router.dispatch({ operation: 'apply', adapterId: reactionAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } }));
    }
    if (action.sourceRuntimeKind === 'executors_will') {
      if (!executorsWill) throw Error('EXECUTORS_WILL_CONSUMER_REQUIRED');
      const current = enumerate(state).candidates.find(row => row.sourceRuntimeKind === 'executors_will'
        && row.sourceActionHash === action.sourceActionHash);
      if (!current) throw Error('EXECUTORS_WILL_CHOICE_NOT_AVAILABLE');
      return executorsWill.apply(state, action.sourceAction);
    }
    if (executorsWill?.offer(state) && enumerate(state).candidates.some(row => row.sourceRuntimeKind === 'executors_will')) {
      throw Error('EXECUTORS_WILL_CHOICE_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'storm_cast') {
      if (!stormCast) throw Error('PSIONIC_STORM_CAST_CONSUMER_REQUIRED');
      return stormCast.apply(state, action.sourceAction, options);
    }
    if (action.sourceRuntimeKind === 'storm_phase_pass') {
      if (!stormPhaseEnd?.applyPass || !enumerateNative(state, { sideKey: action.sideKey }).candidates.some(row =>
        row.sourceRuntimeKind === 'storm_phase_pass' && row.sourceActionHash === action.sourceActionHash)) {
        throw Error('PSIONIC_STORM_PASS_UNAVAILABLE');
      }
      return stormPhaseEnd.applyPass(state, action.sourceAction, options);
    }
    if (releaseAssaultOrder?.pending(state) && !releaseAssaultOrder.resolvingChild(state)) {
      return releaseAssaultOrder.apply(state, action.sourceRuntimeKind, action.sourceAction, options);
    }
    if (stormPhaseEnd?.pending(state)) {
      if (includeSharedAssaultEffectOrder) {
        const legal = stormPhaseEnd.enumerate(state, { sideKey: action.sideKey }).candidates.some(({ phaseEndSourceKind = 'storm_phase_end', isEnabled, ...candidate }) =>
          phaseEndSourceKind === action.sourceRuntimeKind && isEnabled && isDeepStrictEqual(candidate, action.sourceAction));
        if (!legal) throw Error('SHARED_ASSAULT_EFFECT_ORDER_CHOICE_REQUIRED');
        const provider = orderProviders.find(entry => entry.kind === action.sourceRuntimeKind);
        if (provider) return provider.owner.apply(state, action.sourceAction, options);
      } else if (action.sourceRuntimeKind !== 'storm_phase_end') throw Error('PSIONIC_STORM_PHASE_END_CONTINUATION_REQUIRED');
    } else if (action.sourceAction?.actionType?.startsWith('resolve_ordered_') || action.sourceAction?.orderedEffect === true) {
      throw Error('SHARED_ASSAULT_EFFECT_ORDER_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'storm_phase_end') {
      if (!stormPhaseEnd) throw Error('PSIONIC_STORM_PHASE_END_SOURCE_REQUIRED');
      assertStormPhaseEndOrder(state);
      const result = stormPhaseEnd.apply(state, action.sourceAction, options);
      if (!stormPhaseEnd.sourceAuthority || !result.state.pendingOfficialAutomaticHits) return result;
      const damage = hits.resolveDirectDamage(result.state, action.sourceAction, options);
      return { ...result, state: damage.state, events: [...result.events, ...damage.events] };
    }
    if (seekerPhaseEnd?.canStart(state)) {
      assertSeekerPhaseEndOrder(state);
      if (action.sourceRuntimeKind !== 'seeker_phase_end') throw Error('RAVEN_SEEKER_PHASE_END_CONTINUATION_REQUIRED');
      return seekerPhaseEnd.apply(state, action.sourceAction, options);
    }
    if (action.sourceRuntimeKind === 'seeker_phase_end') throw Error('RAVEN_SEEKER_PHASE_END_ACTION_STALE');
    if (seekerPhaseEnd?.pending(state) && !['hits', 'hits_choice', 'reaction'].includes(action.sourceRuntimeKind)) {
      throw Error('RAVEN_SEEKER_PHASE_END_HITS_CONTINUATION_REQUIRED');
    }
    if (poisonousEssence?.canStart(state) && action.sourceRuntimeKind !== 'poisonous_essence_end') {
      throw Error('POISONOUS_ESSENCE_PHASE_END_CONTINUATION_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'poisonous_essence_end') {
      if (!poisonousEssence) throw Error('POISONOUS_ESSENCE_SOURCE_REQUIRED');
      if (sabotageDronePhaseEnd?.pending(state) || sabotageDronePhaseEnd?.canStart(state)
        || bileResolution?.pending(state) || bileResolution?.canStart(state)) {
        throw Error('POISONOUS_ESSENCE_PHASE_END_ORDER_COMPOSITION_REQUIRED');
      }
      return poisonousEssence.apply(state, action.sourceAction);
    }
    if (bombardReplacement?.ownsWindow(state) && action.sourceRuntimeKind !== 'bombard_replacement') {
      throw Error('BOMBARD_REPLACEMENT_CONTINUATION_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'bombard_replacement') {
      if (!bombardReplacement) throw Error('BOMBARD_REPLACEMENT_CONSUMER_REQUIRED');
      return bombardReplacement.apply(state, action.sourceAction, options);
    }
    const hitsDamageParent = state.pendingOfficialReactionWindow && hits?.ownsDamageReactionWindow?.(state);
    if (sabotageDronePhaseEnd?.pending(state) && !hitsDamageParent
      && !['sabotage_phase_end', 'hits', 'hits_choice'].includes(action.sourceRuntimeKind)) {
      throw Error('SABOTAGE_DRONE_PHASE_END_CONTINUATION_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'sabotage_phase_end') {
      if (!sabotageDronePhaseEnd) throw Error('SABOTAGE_DRONE_PHASE_END_SOURCE_REQUIRED');
      return sabotageDronePhaseEnd.apply(state, action.sourceAction, options);
    }
    const chargeParent = chargeDeclaration?.pending(state);
    if (action.sourceRuntimeKind === 'charge_declaration') {
      if (!chargeDeclaration) throw Error('CHARGE_DECLARATION_REACTION_SOURCE_REQUIRED');
      return chargeDeclaration.apply(state, action.sourceAction, options);
    }
    if (chargeParent && action.sourceRuntimeKind !== 'reaction'
      || chargeDeclaration && action.sourceRuntimeKind === 'melee' && action.sourceAction.actionType === 'charge') {
      throw Error('CHARGE_DECLARATION_REACTION_CONTINUATION_REQUIRED');
    }
    if (cardRefresh?.ownsWindow(state)) {
      if (action.sourceRuntimeKind !== 'ranged_card_refresh') throw Error('RANGED_CARD_REFRESH_CHOICE_REQUIRED');
      return cardRefresh.apply(state, action.sourceAction);
    }
    if (action.sourceRuntimeKind === 'ranged_card_refresh') throw Error('RANGED_CARD_REFRESH_WINDOW_REQUIRED');
    if (holoRoundEnd && (holoRoundEnd.pending(state) || holoRoundEnd.canStart(state))) {
      if (action.sourceRuntimeKind !== 'holo_round_end') throw Error('HOLO_ROUND_END_CHOICES_REQUIRED');
      return holoRoundEnd.apply(state, action.sourceAction, options);
    }
    if (action.sourceRuntimeKind === 'holo_round_end') throw Error('HOLO_ROUND_END_PHASE_OR_STEP_INVALID');
    if (action.sourceRuntimeKind === 'summoned_action') {
      if (!summonedActions) throw Error('CHARACTERISTIC_SUMMONED_ACTION_CONSUMER_REQUIRED');
      return summonedActions.apply(state, action.sourceAction, options);
    }
    if (action.sourceRuntimeKind === 'personal_transport') {
      return personalTransport.apply(state, { action: action.sourceAction, options });
    }
    if (action.sourceRuntimeKind === 'cleanup') {
      if (!cleanupContinuation) throw Error('CLEANUP_CONTINUATION_POLICY_REQUIRED');
      return cleanupContinuation.apply(state, action.sourceAction, options);
    }
    const declared = rangedDeclaration?.pending(state);
    if (action.sourceRuntimeKind === 'ranged_declaration') return rangedDeclaration.apply(state, action.sourceAction, options);
    const declaredDamageWindow = releaseZergTargets && zagaraTransfusion && state.pendingCurrentProductRangedDamageReaction
      && state.pendingOfficialReactionWindow?.triggerKind === 'damage_received';
    if (declared && !(declaredDamageWindow && action.sourceRuntimeKind === 'reaction') && !['template', ...(headShotSource ? ['ranged'] : []), 'precision', 'point_defense', 'target_reaction'].includes(action.sourceRuntimeKind)) {
      throw Error('RANGED_DECLARATION_ATTACK_CONTINUATION_REQUIRED');
    }
    if (!declared && action.sourceRuntimeKind === 'template' && action.sourceAction.actionType === 'blast_template_attack'
      && rangedDeclaration?.ownsUnit(state, state.pieces.find(piece => piece.id === action.pieceId))) throw Error('RANGED_DECLARATION_REQUIRED');
    const numericDeclarationAttack = headShotSource && action.sourceRuntimeKind === 'ranged'
      && action.sourceAction.actionType === 'ranged_attack'
      && action.sourceAction.resolutionStage !== 'defender_casualty_selection';
    if (numericDeclarationAttack && !declared
      && rangedDeclaration.ownsUnit(state, state.pieces.find(piece => piece.id === action.pieceId))) throw Error('RANGED_DECLARATION_REQUIRED');
    if (numericDeclarationAttack && declared
      && action.sourceAction.rangedPlan?.profileKey !== declared.profileKey) throw Error('RANGED_DECLARATION_WEAPON_BINDING_INVALID');
    const hiddenLossReaction = hiddenLossReactions?.ownsWindow(state);
    const tokenLeadingReaction = hiddenLossReaction || psionicPlaceReactions
      && postPlaceReactions?.pending(state)?.sourceKind === 'psionic_token_leading';
    if (tokenLeadingReaction && action.sourceRuntimeKind !== 'reaction') {
      throw Error(hiddenLossReaction ? 'HIDDEN_LOSS_REACTION_CONTINUATION_REQUIRED'
        : 'PSIONIC_TRANSFER_ROUND_END_PLACE_REACTION_REQUIRED');
    }
    if (action.sourceRuntimeKind === displacementKind) {
      if (!displacement) throw Error('CHARACTERISTIC_PSIONIC_DISPLACEMENT_CONSUMER_REQUIRED');
      return displacement.apply(state, action.sourceAction, options);
    }
    if (!hiddenLossReaction && displacement?.pending(state)) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_CONTINUATION_REQUIRED');
    if (!tokenLeadingReaction && psionicRoundEnd && (psionicRoundEnd.pending(state) || psionicRoundEnd.canStart(state))
      && action.sourceRuntimeKind !== 'psionic_round_end') throw Error('PSIONIC_TRANSFER_ROUND_END_CHOICES_REQUIRED');
    if (action.sourceRuntimeKind === 'psionic_round_end') {
      if (!psionicRoundEnd) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_ROUND_END_CONSUMER_REQUIRED');
      const result = psionicRoundEnd.apply(state, action.sourceAction, options);
      const refreshed = { ...result, state: refreshOfficialReleaseRosterDerivedStateV2({ context, state: result.state }) };
      return psionicPlaceReactions && action.sourceAction.actionType === 'choose_psionic_transfer_round_end'
        && action.sourceAction.canonicalParameters.choice === 'place'
        ? postPlaceReactions.open(refreshed, action.sourceAction) : refreshed;
    }
    if (bileResolution?.pending(state) && !hitsDamageParent
      && !['bile_resolution', 'hits', 'hits_choice'].includes(action.sourceRuntimeKind)) {
      throw Error('CHARACTERISTIC_CORROSIVE_BILE_RESOLUTION_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'bile_resolution') {
      if (!bileResolution) throw Error('CHARACTERISTIC_CORROSIVE_BILE_RESOLUTION_REQUIRED');
      return bileResolution.apply(state, action.sourceAction, options);
    }
    const targetParent = targetReactions?.pending(state);
    const postPlaceParent = postPlaceReactions?.pending(state);
    const meleeDamageParent = transfusionMelee && state.pendingOfficialMeleeDamageReaction;
    const rangedDamageParent = (zagaraTransfusion || medicLifeSupport || supportDamage || inheritedRangedHitDebuff && targetParent?.stage === 'ready')
      && state.pendingCurrentProductRangedDamageReaction;
    if (postPlaceParent && !state.pendingOfficialReactionWindow) throw Error('CHARACTERISTIC_POST_PLACE_REACTION_CONTINUATION_REQUIRED');
    if (targetParent?.stage === 'ready' && !meleeDamageParent && !(ownsRangedDamageContinuation && rangedDamageParent)) {
      targetReactions.assertContinuation(state, action.sourceRuntimeKind, action.sourceAction);
    }
    if (reactionAdapter && state.pendingOfficialReactionWindow) {
      const beforeEvade = state.pendingOfficialReactionWindow.triggerKind === 'before_evade_roll';
      const owner = targetParent?.stage === 'reaction' ? 'target_reaction'
        : ownsTemplateDamageReaction(state) ? 'template'
        : meleeDamageParent || hitsDamageParent || ownsRangedDamageContinuation && rangedDamageParent ? 'reaction'
        : (includeArmourReactions || hasBeforeRangedEvadeReaction && beforeEvade)
          && precisionChoices?.hasPending(state) ? 'precision'
        : (meleeArmourReactions || includeBeforeMeleeEvadeReaction && beforeEvade)
          && meleeChoices?.hasPending(state) ? 'melee_choice'
        : (includeArmourReactions || includeBeforeHitsEvadeReaction && beforeEvade)
          && hitsChoices?.hasPending(state) ? 'hits_choice' : 'reaction';
      if (action.sourceRuntimeKind !== owner) throw Error('CHARACTERISTIC_REACTION_WINDOW_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'reaction') {
      if (!reactionAdapter) throw Error('CHARACTERISTIC_REACTION_SOURCE_REQUIRED');
      const result = router.dispatch({ operation: 'apply', adapterId: reactionAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
      const next = structuredClone(result.state);
      const window = next.pendingOfficialReactionWindow;
      next.activeSideKey = window ? window.prioritySideKeys[window.priorityIndex]
        : state.pendingOfficialReactionWindow.activeSideKey;
      const transition = { ...result, state: next };
      const priorWindow = state.pendingOfficialReactionWindow;
      if (photonEntry && priorWindow.triggerKind==='reserve_entered_non_entry') return photonEntry.finish(state,transition);
      if (artanisDash && priorWindow.triggerKind==='after_successful_charge') return artanisDash.finishReaction(state,transition);
      if (canRestoreFlare && !window && priorWindow.triggerKind === 'debuff_received'
        && priorWindow.context.sourceDefinitionId === OFFICIAL_OPTICAL_FLARE_DEFINITION_ID) {
        return { ...transition, state: consumeOfficialReactionFamilyResolutionV1(next, priorWindow.triggerHash).state };
      }
      if (afterChargeRoll && state.pendingOfficialReactionWindow?.triggerKind === 'after_charge_roll') {
        return finishOfficialChargeRollReactionV1(state, transition, reactionAdapter, options);
      }
      if (hitsDamageParent && !window) {
        const resumed = hits.resumeDamageReaction(next, options);
        const withSabotage = sabotageDronePhaseEnd ? sabotageDronePhaseEnd.afterHits(resumed) : resumed;
        const withBile = bileResolution ? bileResolution.afterHits(withSabotage) : withSabotage;
        const completed = seekerPhaseEnd ? seekerPhaseEnd.afterHits(withBile) : withBile;
        return { ...transition, state: completed.state, events: [...transition.events, ...completed.events] };
      }
      if (meleeDamageParent && window && ownsMeleeDamageContinuation && targetParent?.stage === 'ready') {
        return targetReactions.completeAttack(transition, targetParent);
      }
      if (meleeDamageParent && !window) {
        const resumed = melee.resumeDamageReaction(next, options);
        const completed = targetParent?.stage === 'ready'
          && (ownsMeleeDamageContinuation || !resumed.state.pendingOfficialMeleeDamageReaction)
          ? targetReactions.completeAttack(resumed, targetParent) : resumed;
        return { ...transition, state: completed.state, events: [...transition.events, ...completed.events] };
      }
      if (rangedDamageParent && window && ownsRangedDamageContinuation && targetParent?.stage === 'ready') {
        return targetReactions.completeAttack(transition, targetParent);
      }
      if (rangedDamageParent && !window) {
        const resumed = resumeOfficialSelectedRosterRangedDamageReactionV1(next, options);
        const completed = ownsRangedDamageContinuation && targetParent?.stage === 'ready'
          ? targetReactions.completeAttack(resumed, targetParent) : resumed;
        return { ...transition, state: completed.state, events: [...transition.events, ...completed.events] };
      }
      if (chargeParent) return chargeDeclaration.afterReaction(transition);
      return postPlaceParent ? postPlaceReactions.complete(transition) : transition;
    }
    if (targetParent?.stage === 'redirect' && action.sourceRuntimeKind !== 'target_reaction') throw Error('ARTANIS_REDIRECT_TARGET_REQUIRED');
    if (action.sourceRuntimeKind === 'target_reaction') {
      if (!targetReactions) throw Error('CHARACTERISTIC_TARGET_REACTION_CONSUMER_REQUIRED');
      return targetReactions.apply(state, action.sourceAction, options);
    }
    if (!targetParent && ['ranged', 'template', 'melee'].includes(action.sourceRuntimeKind) && targetReactions?.intercept(state, action.sourceAction)) {
      throw Error('CHARACTERISTIC_TARGET_REACTION_DECLARATION_REQUIRED');
    }
    if (weaponAdapter) {
      const binding = weaponAdapter.bindingFor(action.sourceAction) || {};
      if (['sourceDefinitionId', 'sourceFeatureHash', 'weaponSourceRouteHash'].some(key => action[key] !== binding[key])) {
        throw Error('CHARACTERISTIC_COMPONENT_WEAPON_BINDING_INVALID');
      }
    }
    if (hitsChoices?.hasPending(state) && action.sourceRuntimeKind !== 'hits_choice') {
      throw Error('CHARACTERISTIC_HITS_POOL_WINDOW_REQUIRED');
    }
    if (!hitsChoices?.hasPending(state) && hits?.hasPending(state) && action.sourceRuntimeKind !== 'hits_choice'
      && action.sourceRuntimeKind !== 'hits') throw Error('CHARACTERISTIC_HITS_WINDOW_REQUIRED');
    if (action.sourceRuntimeKind === 'hits' && hitsChoices?.intercept(state, action.sourceAction)) {
      throw Error('CHARACTERISTIC_HITS_POOL_SEQUENCE_REQUIRED');
    }
    const defenceParent = pointDefenseChoices?.pending(state);
    if (defenceParent?.stage === 'choice' && action.sourceRuntimeKind !== 'point_defense') {
      throw Error('CHARACTERISTIC_POINT_DEFENSE_WINDOW_REQUIRED');
    }
    if (defenceParent?.stage === 'ready') {
      if (['ranged', 'template'].includes(action.sourceRuntimeKind)) {
        pointDefenseChoices.assertReadyAttack(state, action.sourceRuntimeKind, action.sourceAction);
      } else if (action.sourceRuntimeKind === 'precision') {
        if (!precisionChoices.hasPending(state)) pointDefenseChoices.assertReadyAttack(state,
          action.sourceAction.delegateKind, action.sourceAction.attackAction);
      } else throw Error('CHARACTERISTIC_POINT_DEFENSE_DECLARED_ATTACK_REQUIRED');
    } else if (!defenceParent && pointDefenseChoices && ['ranged', 'template'].includes(action.sourceRuntimeKind)
      && pointDefenseChoices.intercept(state, action.sourceRuntimeKind, action.sourceAction)) {
      throw Error('CHARACTERISTIC_POINT_DEFENSE_WINDOW_REQUIRED');
    }
    if (precisionChoices?.hasPending(state) && action.sourceRuntimeKind !== 'precision') {
      throw Error('CHARACTERISTIC_PRECISION_WINDOW_REQUIRED');
    }
    if (meleeChoices?.hasPending(state) && action.sourceRuntimeKind !== 'melee_choice') {
      throw Error('CHARACTERISTIC_MELEE_POOL_WINDOW_REQUIRED');
    }
    if (action.sourceRuntimeKind === 'melee' && meleeChoices?.intercept(state, action.sourceAction)) {
      throw Error('CHARACTERISTIC_MELEE_POOL_SEQUENCE_REQUIRED');
    }
    if (precisionChoices && ['ranged', 'template'].includes(action.sourceRuntimeKind)
      && precisionChoices.intercept(state, action.sourceRuntimeKind, action.sourceAction)) {
      throw Error('CHARACTERISTIC_PRECISION_ROLL_SEQUENCE_REQUIRED');
    }
    const delegate = { spatial, activation, ranged, template: templateAttack, precision: precisionChoices,
      point_defense: pointDefenseChoices, melee, melee_choice: meleeChoices, hits, hits_choice: hitsChoices }[action.sourceRuntimeKind];
    if (action.sourceRuntimeKind === 'plague') {
      if (!plague) throw Error('PLAGUE_EXECUTION_CONSUMER_REQUIRED');
      const result = router.dispatch({ operation: 'apply', adapterId: plague.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
      return { ...result, state: refreshOfficialReleaseRosterDerivedStateV2({ context, state: result.state }) };
    }
    if (action.sourceRuntimeKind === 'battlefield_asset') {
      if (!activeBattlefieldAssets) throw Error('CHARACTERISTIC_BATTLEFIELD_ASSET_CONSUMER_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: battlefieldModifierAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'terran_mission_supply') {
      if (!terranSupplyAdapter) throw Error('CHARACTERISTIC_TERRAN_MISSION_SUPPLY_CONSUMER_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: terranSupplyAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'unit_lifecycle') {
      if (!unitLifecycleAdapter) throw Error('CHARACTERISTIC_UNIT_LIFECYCLE_CONSUMER_REQUIRED');
      const result = router.dispatch({ operation: 'apply', adapterId: unitLifecycleAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
      return { ...result, state: refreshOfficialReleaseRosterDerivedStateV2({ context, state: result.state }) };
    }
    if (action.sourceRuntimeKind === zergUniqueRuntimeKind) {
      if (!zergUniqueAdapter) throw Error('CHARACTERISTIC_QUEEN_DOMINEERING_SOURCE_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: zergUniqueAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'khalai_activation') {
      if (!khalaiAdapter) throw Error('CHARACTERISTIC_KHALAI_ACTIVATION_SOURCE_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: khalaiAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'corrosive_bile') {
      if (!bile) throw Error('CHARACTERISTIC_CORROSIVE_BILE_CONSUMER_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: bile.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'bombard') {
      if (!bombard) throw Error('BOMBARD_PLACEMENT_CONSUMER_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: bombard.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'dark_swarm_placement') {
      if (!darkSwarmPlacement) throw Error('DARK_SWARM_PLACEMENT_CONSUMER_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: darkSwarmPlacement.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'psionic_transfer') {
      if (!psionic) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_CONSUMER_REQUIRED');
      return router.dispatch({ operation: 'apply', adapterId: psionic.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    }
    if (action.sourceRuntimeKind === 'relocation') {
      if (!relocationAdapter) throw Error('CHARACTERISTIC_RELOCATION_CONSUMER_REQUIRED');
      const applied = router.dispatch({ operation: 'apply', adapterId: relocationAdapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
      const result = { ...applied, state: refreshOfficialReleaseRosterDerivedStateV2({ context, state: applied.state }) };
      return postPlaceReactions ? postPlaceReactions.open(result, action.sourceAction) : result;
    }
    if (!delegate && !['ranged', 'template'].includes(action.sourceRuntimeKind) && !adapter) {
      throw Error('CHARACTERISTIC_COMPONENT_ABILITY_SOURCE_REQUIRED');
    }
    const result = ['ranged', 'template', 'melee'].includes(action.sourceRuntimeKind)
      ? applyWeapon(action.sourceRuntimeKind, state, action.sourceAction, options)
      : delegate ? delegate.apply(state, action.sourceAction, options)
      : router.dispatch({ operation: 'apply', adapterId: adapter.descriptor.adapterId,
        state, request: { action: action.sourceAction, options } });
    const completed = targetParent?.stage === 'ready'
      && (ownsMeleeDamageContinuation || !result.state.pendingOfficialMeleeDamageReaction)
      ? targetReactions.completeAttack(result, targetParent)
      : defenceParent?.stage === 'ready' ? pointDefenseChoices.completeAttack(result) : result;
    const updated = selectedAbilityAdapter && action.sourceRuntimeKind === 'activation'
      && completed.state.pieces.length !== state.pieces.length
      ? { ...completed, state: refreshOfficialReleaseRosterDerivedStateV2({ context, state: completed.state }) } : completed;
    const withSabotage = sabotageDronePhaseEnd ? sabotageDronePhaseEnd.afterHits(updated) : updated;
    const withBile = bileResolution ? bileResolution.afterHits(withSabotage) : withSabotage;
    return seekerPhaseEnd ? seekerPhaseEnd.afterHits(withBile) : withBile;
  }
  function applyKhassarDeclaration(state, action, options) {
    const binding = khassarDeclarationOwner(action?.sourceRuntimeKind);
    if (!binding) throw Error('KHASSAR_ACTION_OWNER_REQUIRED');
    const plan = binding.planFor(action.sourceAction || {});
    const domain = enumerate(state, { sideKey: action.sideKey }).parameterDomains.find(row =>
      row.sourceRuntimeKind === action.sourceRuntimeKind && row.sourceDomain.domainId === plan?.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(state, domain, plan.parameters).action, action)) {
      throw Error('KHASSAR_' + binding.kind + '_ACTION_INVALID');
    }
    return binding.owner.open
      ? binding.owner.open(state, action.sourceAction, options)
      : binding.owner.apply(state, action.sourceAction, options);
  }
  function apply(state,action,options) {
    artanisDash?.assertAction(state,action);
    const applied=applyNative(state,action,options);
    const dash=artanisDash ? artanisDash.afterTransition(state,applied) : applied;
    return photonEntry ? photonEntry.afterTransition(state,dash,action) : dash;
  }
  function applyNative(state, action, options) {
    assertRangedContinuationOwner(state, action);
    assertTargetedAbilityPolicy(state);
    const attack = khassarAttackContinuation(state);
    if (attack) attack.owner.assertNativeContinuation(state, action, attack.parent);
    const chargeParent = khassarCharge?.pending(state);
    if (chargeParent) khassarCharge.assertNativeContinuation(state, action, chargeParent);
    if (khassarDeclarationOwner(action.sourceRuntimeKind)) {
      if (khassarOverwatch) overwatch.assertContinuation(state, action);
      return registeredKhassar ? router.dispatch({ operation: 'apply', state,
        adapterId: registeredKhassar.descriptor.adapterId, request: { action, options } })
        : applyKhassarDeclaration(state, action, options);
    }
    if (ancestralWisdom?.pending(state)?.stage === 'reaction'
      || friendlySupplyLossReaction?.ownsWindow(state)) {
      let outcome = applySource(state, action, options);
      if (khassarSupplyLoss?.ownsWindow(state)) {
        if (attack) outcome = attack.owner.afterTransition(outcome, attack.parent);
        else if (chargeParent) outcome = khassarCharge.afterTransition(outcome, chargeParent);
      }
      return includeLungeDeferredReaction ? lunge.afterAttack(state, outcome) : outcome;
    }
    overwatch?.assertContinuation(state, action);
    const roundEndOwned = action.sourceRuntimeKind === 'holo_round_end'
      && (holoRoundEnd?.pending(state) || holoRoundEnd?.canStart(state));
    if (!roundEndOwned) summonedActions?.assertAction(state, action);
    assertRoundEndReactionParent(state);
    displacementProducer?.assertEndpoint(state, action.sourceAction);
    const outcome = applySource(state, action, options);
    const native = afterChargeRoll ? openOfficialChargeRollReactionV1(outcome, reactionAdapter) : outcome;
    const applied = ancestralWisdom ? ancestralWisdom.finishAuthorizedCast(state, native) : native;
    const lightning = psiLightning && action.sourceRuntimeKind === 'ability'
      && action.sourceAction?.definitionId === psiLightning.definitionId
      ? hits.resolveDirectDamage(applied.state, action.sourceAction, options) : null;
    const resolved = lightning ? { ...applied, state: lightning.state, events: [...applied.events, ...lightning.events] } : applied;
    const withDebuff = damageHitDebuff ? consumeOfficialDamageWeaponHitDebuffsV1(bundle, resolved) : resolved;
    const result = feedback ? feedback.afterTransition(state, withDebuff, action) : withDebuff;
    const detected = detectionHiddenLoss ? consumeOfficialDetectionHiddenStatusesV1(bundle, result.state) : null;
    let observed = result;
    if (detected?.events.length) {
      if ((detected.state.log?.length || 0) > (state.log?.length || 0)) {
        const last = detected.state.log.at(-1);
        last.events = [...(last.events || []), ...detected.events];
      }
      observed = { ...result, state: detected.state, events: [...result.events, ...detected.events] };
    }
    if (battlefieldDisplacementSource) {
      const original = action.sourceRuntimeKind === OFFICIAL_RANGED_LUNGE_CONTINUATION_KIND
        ? action.sourceAction?.moveAction : action.sourceAction?.originalAction || action.sourceAction;
      if (original && getOfficialDisplacementMovementGeometryV1(original)) {
        const movementAction = { ...original, actionType: original.chargeResolutionPlan ? 'charge' : original.actionType };
        const lifecycle = consumeOfficialBattlefieldAssetMovementLifecycleV1(observed.state, movementAction);
        observed = { ...observed, state: lifecycle.state, events: [...observed.events, ...lifecycle.events] };
      }
    }
    const projected = psionic ? psionic.afterTransition(observed) : observed;
    const completed = hiddenLossReactions ? hiddenLossReactions.afterTransition(state, projected, action) : projected;
    const advanced = cleanupContinuation ? cleanupContinuation.afterTransition(completed) : completed;
    const completedTransition = rangedDeclaration ? rangedDeclaration.afterTransition(advanced) : advanced;
    const summoned = summonedActions ? summonedActions.afterTransition(state, completedTransition) : completedTransition;
    const refreshed = cardRefresh ? cardRefresh.afterTransition(summoned) : summoned;
    const watched = overwatch ? overwatch.afterTransition(state, refreshed, action) : refreshed;
    const bombardCompleted = bombardReplacement ? bombardReplacement.afterTransition(watched, state) : watched;
    const finalized = darkSwarmLifecycle ? darkSwarmLifecycle.afterTransition(bombardCompleted, state) : bombardCompleted;
    const alternated = executorsWill ? executorsWill.afterTransition(state, finalized) : finalized;
    const afterLoss = friendlySupplyLossReaction ? friendlySupplyLossReaction.afterTransition(state, alternated, action) : alternated;
    // A delegated shot may open Lunge between weapon batches or after the last batch.
    // Keep the original activation until the defender has used or passed the bound reaction.
    if (includeMixedRosterReactions && attack?.owner === khassarShot && lunge) {
      const withLunge = lunge.afterAttack(state, afterLoss, {
        capture: includeLungeOverwatchContinuation || !includeLungeDeferredReaction || overwatch?.pending(state)?.stage !== 'attack',
      });
      const continued = attack.owner.afterTransition(withLunge, attack.parent);
      return stormPhaseEnd?.afterTransition ? stormPhaseEnd.afterTransition(continued) : continued;
    }
    const resumed = attack ? attack.owner.afterTransition(afterLoss, attack.parent)
      : chargeParent ? khassarCharge.afterTransition(afterLoss, chargeParent) : afterLoss;
    const afterLunge = lunge ? lunge.afterAttack(state, resumed, {
      capture: includeLungeOverwatchContinuation || !includeLungeDeferredReaction || overwatch?.pending(state)?.stage !== 'attack',
    }) : resumed;
    return stormPhaseEnd?.afterTransition ? stormPhaseEnd.afterTransition(afterLunge) : afterLunge;
  }
  function queryKhassarEligibility(state, request) {
    assertTargetedAbilityPolicy(state);
    if (independentTemplateWindowPending(state) || khassarWithIndependentCardRefresh && cardRefresh.pending(state)) {
      throw Error('KHASSAR_REPLACED_ACTION_WINDOW_UNAVAILABLE');
    }
    return khassarEligibility.query(state, request);
  }
  function query(state, request) {
    if (ravenSeekerRules && request?.queryKind && [ravenSeekerRules.descriptor.queryKind,
      ravenSeekerRules.descriptor.paidImpactQueryKind].includes(request.queryKind)) {
      return ravenSeekerRules.query(state, request);
    }
    assertTargetedAbilityPolicy(state);
    if (stormCast && request?.queryKind === stormCast.descriptor.queryKind) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) throw Error('PSIONIC_STORM_CAST_QUERY_INVALID');
      if (stormCast.descriptor.awaitingCenterMeasurement) throw Error('WAVE3_COMMUNITY_STORM_MARKER_DIAMETER_REQUIRED');
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'storm_cast' && row.pieceId === request.pieceId);
      if (!domain) throw Error('PSIONIC_STORM_CAST_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (stormPhaseEnd && request?.queryKind === stormPhaseEnd.descriptor.queryKind) {
      return stormPhaseEnd.query(state, request);
    }
    if (psionicStormSourceRules && request?.queryKind === psionicStormSourceRules.descriptor.queryKind) {
      return psionicStormSourceRules.query(state, request);
    }
    if (khassarEligibility && request?.queryKind === khassarEligibility.descriptor.queryKind) {
      return registeredKhassar ? router.dispatch({ operation: 'query', state,
        adapterId: registeredKhassar.descriptor.adapterId, request }) : queryKhassarEligibility(state, request);
    }
    if (psiLightning && request?.queryKind === 'psi_lightning_coverage') {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId'].includes(key))) throw Error('PSI_LIGHTNING_QUERY_ARGUMENTS_INVALID');
      const domain = enumerate(state).parameterDomains.find(row => row.definitionId === psiLightning.definitionId
        && row.pieceId === request.pieceId);
      if (!domain) throw Error('PSI_LIGHTNING_DOMAIN_UNAVAILABLE');
      return seal({ result: domain.constraints.psiLightning, stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (commanderAdapter && request?.queryKind === 'contextual_supply') {
      const { queryKind, ...args } = request;
      const result = router.dispatch({ operation: 'query', adapterId: commanderAdapter.descriptor.adapterId,
        state, request: args });
      return seal({ result, stateHash: hash(state), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'plague_cast_preview' && plague) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) throw Error('PLAGUE_QUERY_SEMANTIC_ONLY');
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'plague' && row.pieceId === request.pieceId);
      if (!domain) throw Error('PLAGUE_CAST_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'plague_template_coverage' && plagueCoverage) {
      return plagueCoverage.query(state, request);
    }
    if (request?.queryKind === 'consume_payment_options' && consumePaymentSource) {
      return queryOfficialConsumePaymentOptionsV1({ source: consumePaymentSource, state, request });
    }
    if (request?.queryKind === 'bombard_replacement_status' && bombardReplacement) {
      if (Object.keys(request).some(key => key !== 'queryKind')) throw Error('BOMBARD_REPLACEMENT_QUERY_SEMANTIC_ONLY');
      return seal({ pending: bombardReplacement.pending(state), ownsWindow: bombardReplacement.ownsWindow(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'bombard_creep_placement_preview' && bombardReplacement) {
      if (Object.keys(request).some(key => !['queryKind', 'parameters'].includes(key))) throw Error('BOMBARD_REPLACEMENT_QUERY_SEMANTIC_ONLY');
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'bombard_replacement');
      if (!domain) throw Error('BOMBARD_REPLACEMENT_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'bombard_status' && bombard) {
      if (Object.keys(request).some(key => key !== 'queryKind')) throw Error('BOMBARD_QUERY_SEMANTIC_ONLY');
      return bombard.query(state);
    }
    if (request?.queryKind === 'bombard_placement_preview' && bombard) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) throw Error('BOMBARD_QUERY_SEMANTIC_ONLY');
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'bombard' && row.pieceId === request.pieceId);
      if (!domain) throw Error('BOMBARD_PLACEMENT_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'dark_swarm_placement_preview' && darkSwarmPlacement) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) throw Error('DARK_SWARM_QUERY_SEMANTIC_ONLY');
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'dark_swarm_placement' && row.pieceId === request.pieceId);
      if (!domain) throw Error('DARK_SWARM_PLACEMENT_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'dark_swarm_status' && darkSwarmPlacement) {
      if (Object.keys(request).join(',') !== 'queryKind') throw Error('DARK_SWARM_QUERY_SEMANTIC_ONLY');
      return darkSwarmPlacement.query(state);
    }
    if (overwatch && request?.queryKind === 'auto_turret_overwatch') return overwatch.query(state, request);
    if (poisonousEssence && request?.queryKind === 'poisonous_essence_phase_end') {
      if (Object.keys(request).some(key => key !== 'queryKind')) throw Error('POISONOUS_ESSENCE_QUERY_SEMANTIC_ONLY');
      return poisonousEssence.query(state);
    }
    if (sabotageDronePhaseEnd && request?.queryKind === 'sabotage_drone_phase_end') {
      if (Object.keys(request).some(key => !['queryKind', 'sourcePieceId'].includes(key))) {
        throw Error('SABOTAGE_DRONE_QUERY_PARAMETERS_INVALID');
      }
      return sabotageDronePhaseEnd.query(state, request.sourcePieceId ? { sourcePieceId: request.sourcePieceId } : {});
    }
    if (structureAdapter && request?.queryKind === 'structure_constraints') {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId'].includes(key))) {
        throw Error('CHARACTERISTIC_STRUCTURE_QUERY_PARAMETERS_INVALID');
      }
      return router.dispatch({ operation: 'query', adapterId: structureAdapter.descriptor.adapterId,
        state, request: { pieceId: request.pieceId } });
    }
    if (request?.queryKind === 'ranged_card_refresh_status' && cardRefresh) {
      if (Object.keys(request).some(key => key !== 'queryKind')) throw Error('RANGED_CARD_REFRESH_QUERY_SEMANTIC_ONLY');
      return seal({ schema: 'starcraft_tmg_ranged_card_refresh_status_v1', stateHash: hash(state),
        result: { pending: cardRefresh.pending(state), ownsWindow: cardRefresh.ownsWindow(state),
          choices: cardRefresh.enumerate(state).parameterDomains.map(row => row.parameterSchema.cardInstanceId.enum) },
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (holoRoundEnd && ['holo_round_end_status', 'unit_round_end_status'].includes(request?.queryKind)) return holoRoundEnd.query(state, request);
    if (holoRoundEnd && request?.queryKind === 'holo_round_end_placement_preview') {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) {
        throw Error('HOLO_ROUND_END_QUERY_SEMANTIC_ONLY');
      }
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'holo_round_end'
        && row.pieceId === request.pieceId);
      if (!domain) throw Error('HOLO_SURPRISE_DOMAIN_UNAVAILABLE');
      return seal({ schema: 'starcraft_tmg_holo_round_end_preview_v1', stateHash: hash(state),
        result: instantiate(state, domain, request.parameters), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'decoy_constraints' && decoyAdapter) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId'].includes(key))) throw Error('DECOY_QUERY_SEMANTIC_ONLY');
      return router.dispatch({ operation: 'query', adapterId: decoyAdapter.descriptor.adapterId,
        state, request: { pieceId: request.pieceId } });
    }
    if (summonedActions && ['summoned_action_options', 'summoned_move_preview'].includes(request?.queryKind)) {
      if (Object.keys(request).some(key => !['queryKind', 'parameters'].includes(key))
        || request.queryKind === 'summoned_action_options' && request.parameters !== undefined) throw Error('SUMMONED_ACTION_QUERY_SEMANTIC_ONLY');
      const menu = enumerate(state);
      let result;
      if (request.queryKind === 'summoned_action_options') result = { parent: summonedActions.pending(state), menu };
      else {
        const domain = menu.parameterDomains.find(row => row.sourceRuntimeKind === 'summoned_action');
        if (!domain) throw Error('SUMMONED_ACTION_MOVE_UNAVAILABLE');
        result = instantiate(state, domain, request.parameters);
      }
      return seal({ schema: 'starcraft_tmg_summoned_action_query_v1', stateHash: hash(state),
        result, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'cleanup_continuation_status' && cleanupContinuation) return cleanupContinuation.query(state, request);
    if (['personal_transport_options', 'personal_transport_preview'].includes(request?.queryKind) && personalTransport) {
      const result = personalTransport.query(state, request);
      const { queryReceiptHash: sourceQueryReceiptHash, ...body } = result;
      const projected = request.queryKind === 'personal_transport_preview'
        ? { ...result.result, action: wrapAction(state, result.result.action, 'personal_transport') }
        : { ...result.result, parameterDomains: result.result.parameterDomains.map(row => wrapDomain(row, 'personal_transport')) };
      return seal({ ...body, result: projected, sourceQueryReceiptHash }, 'queryReceiptHash');
    }
    rangedDeclaration?.pending(state);
    if (request?.queryKind === 'ranged_declaration_options' && rangedDeclaration) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId'].includes(key))) throw Error('RANGED_DECLARATION_QUERY_SEMANTIC_ONLY');
      return seal({ result: rangedDeclaration.enumerate(state).parameterDomains.filter(row => !request.pieceId || row.pieceId === request.pieceId), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    assertRoundEndReactionParent(state);
    postPlaceReactions?.pending(state);
    if (displacementQuery && request?.queryKind === displacementQuery.descriptor.queryKind) return displacementQuery.query(state, request);
    if (displacement && request?.queryKind === (battlefieldDisplacementSource
      ? 'battlefield_displacement_preview' : 'psionic_displacement_preview')) {
      const generic = displacementPolicy?.movementQueriesReady;
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'actionType', 'parameters',
        ...(generic ? ['definitionId', 'weaponName'] : [])].includes(key))) {
        throw Error('PSIONIC_DISPLACEMENT_QUERY_PARAMETERS_INVALID');
      }
      const domain = generic ? selectDisplacementMovementDomain(state, request)
        : enumerate(state).parameterDomains.find(row => row.pieceId === request.pieceId && row.actionType === request.actionType
        && ['spatial', 'melee', 'relocation'].includes(row.sourceRuntimeKind));
      if (!domain) throw Error('PSIONIC_DISPLACEMENT_MOVEMENT_DOMAIN_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (psionicRoundEnd && request?.queryKind === 'psionic_transfer_round_end') {
      if (Object.keys(request).length !== 1) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_QUERY_PARAMETERS_INVALID');
      return seal({ result: { parent: psionicRoundEnd.pending(state), canStart: psionicRoundEnd.canStart(state),
        menu: psionicRoundEnd.enumerate(state) }, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (psionicRoundEnd && request?.queryKind === 'psionic_transfer_round_end_preview') {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_QUERY_PARAMETERS_INVALID');
      }
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'psionic_round_end' && row.pieceId === request.pieceId);
      if (!domain) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (psionic && request?.queryKind === 'psionic_transfer_projection') {
      if (Object.keys(request).length !== 1) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_QUERY_PARAMETERS_INVALID');
      return psionic.query(state);
    }
    if (psionic && request?.queryKind === 'psionic_transfer_placement_preview') {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_QUERY_PARAMETERS_INVALID');
      }
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'psionic_transfer' && row.pieceId === request.pieceId);
      if (!domain) throw Error('CHARACTERISTIC_PSIONIC_TRANSFER_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (bileResolution && request?.queryKind === 'corrosive_bile_resolution') {
      if (Object.keys(request).length !== 1) throw Error('CHARACTERISTIC_CORROSIVE_BILE_QUERY_PARAMETERS_INVALID');
      return seal({ result: bileResolution.pending(state), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (bile && request?.queryKind === 'corrosive_bile_projection') {
      if (Object.keys(request).length !== 1) throw Error('CHARACTERISTIC_CORROSIVE_BILE_QUERY_PARAMETERS_INVALID');
      return bile.query(state);
    }
    if (bile && request?.queryKind === 'corrosive_bile_placement_preview') {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_CORROSIVE_BILE_QUERY_PARAMETERS_INVALID');
      }
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'corrosive_bile' && row.pieceId === request.pieceId);
      if (!domain) throw Error('CHARACTERISTIC_CORROSIVE_BILE_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (semanticSpatialQueries && ['legal_full_path_movement', 'coherency_after_candidate_placement'].includes(request?.queryKind)) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'actionType', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_SPATIAL_QUERY_PARAMETERS_INVALID');
      }
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'spatial'
        && row.pieceId === request.pieceId && row.actionType === request.actionType);
      if (!domain) throw Error('CHARACTERISTIC_SPATIAL_QUERY_DOMAIN_UNAVAILABLE');
      const preview = instantiate(state, domain, request.parameters);
      const plan = preview.action.sourceAction.spatialPlan;
      return seal({ schemaVersion: 'starcraft_tmg_component_spatial_preview_v1',
        queryKind: request.queryKind, result: { ...preview,
          coherencyPlacementResultHash: plan.coherencyPlacementResultHash, terrainResultHash: plan.terrainResultHash },
        stateHash: hash(state), rulesAuthority: true, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'relocation_preview' && relocationAdapter) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'definitionId', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_RELOCATION_QUERY_PARAMETERS_INVALID');
      }
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'relocation'
        && row.pieceId === request.pieceId && (request.definitionId === undefined || row.definitionId === request.definitionId));
      if (!domain) throw Error('CHARACTERISTIC_RELOCATION_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ schemaVersion: 'starcraft_tmg_relocation_preview_v2', result: instantiate(state, domain, request.parameters),
        stateHash: hash(state), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'unit_lifecycle_placement_preview' && unitLifecycleAdapter) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'definitionId', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_UNIT_LIFECYCLE_QUERY_PARAMETERS_INVALID');
      }
      const matches = enumerate(state).parameterDomains.filter(row => row.sourceRuntimeKind === 'unit_lifecycle'
        && row.pieceId === request.pieceId && (request.definitionId === undefined || row.definitionId === request.definitionId));
      if (matches.length > 1) throw Error('CHARACTERISTIC_UNIT_LIFECYCLE_QUERY_DEFINITION_REQUIRED');
      const [domain] = matches;
      if (!domain) throw Error('CHARACTERISTIC_UNIT_LIFECYCLE_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ schemaVersion: 'starcraft_tmg_unit_lifecycle_placement_preview_v1', result: instantiate(state, domain, request.parameters),
        stateHash: hash(state), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'blast_template_next_batch_preview' && includeTemplateBatchOrder) {
      if (precisionChoices?.hasPending(state) || pointDefenseChoices?.pending(state)
        || targetReactions?.pending(state)?.stage === 'reaction') {
        throw Error('BLAST_TEMPLATE_NEXT_BATCH_UNAVAILABLE');
      }
      const preview = templateAttack.query(state, request);
      return seal({ ...Object.fromEntries(Object.entries(preview).filter(([key]) => key !== 'queryReceiptHash')),
        result: { canonicalParameters: preview.result.canonicalParameters,
          action: wrapAction(state, preview.result.action, 'template') }, stateHash: hash(state) }, 'queryReceiptHash');
    }
    if (reactionAdapter && ['reaction_window', 'reaction_resolution'].includes(request?.queryKind)) {
      if (Object.keys(request).some(key => !['queryKind', 'triggerHash'].includes(key))) {
        throw Error('CHARACTERISTIC_REACTION_QUERY_PARAMETERS_INVALID');
      }
      return router.dispatch({ operation: 'query', adapterId: reactionAdapter.descriptor.adapterId, state, request });
    }
    if (request?.queryKind === 'ranged_attack_preview' && targetReactions?.pending(state)?.stage === 'ready'
      && !precisionChoices?.hasPending(state) && !state.pendingCurrentProductRangedCasualtyChoice) {
      const parent = targetReactions.pending(state);
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'weaponName', 'parameters'].includes(key))
        || request.pieceId !== parent.pieceId || request.weaponName !== parent.sourceAction.weaponName
        || !request.parameters || Object.keys(request.parameters).some(key => !['targetUnitId', 'attackMode'].includes(key))
        || request.parameters.targetUnitId !== parent.targetId
        || request.parameters.attackMode !== parent.sourceAction.rangedPlan?.attackMode) throw Error('CHARACTERISTIC_TARGET_QUERY_BINDING_INVALID');
      return seal({ schemaVersion: 'starcraft_tmg_ranged_attack_preview_v1',
        result: { canonicalParameters: structuredClone(parent.sourceAction.rangedPlan.canonicalParameters),
          action: wrapAction(state, targetReactions.readyAttack(state), 'ranged') },
        stateHash: hash(state), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'unit_restrictions' && unitRestrictions) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId'].includes(key))) {
        throw Error('UNIT_RESTRICTION_QUERY_PARAMETERS_INVALID');
      }
      return seal({ result: projectOfficialUnitRestrictionsV1(state, request.pieceId),
        stateHash: hash(state), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'ranged_family_projection' && rangedModifierAdapter) {
      return router.dispatch({ operation: 'query', adapterId: rangedModifierAdapter.descriptor.adapterId, state, request });
    }
    if (request?.queryKind === 'battlefield_modifiers' && battlefieldModifierAdapter) {
      const charge = includeReleaseMalignantCreep && request.actionType === 'charge';
      const shadeTarget = request.targetPieceId !== undefined && battlefieldModifierBundle.routes.some(route => route.requiresOwnAdeptShade)
        && state.pieces.some(piece => piece.id === request.targetPieceId);
      if (Object.keys(request).some(key => !['queryKind', 'pieceId'].includes(key) && !(key === 'actionType' && charge)
        && !(key === 'targetPieceId' && shadeTarget && !charge))) {
        throw Error('CHARACTERISTIC_BATTLEFIELD_MODIFIER_QUERY_INVALID');
      }
      return router.dispatch({ operation: 'query', adapterId: battlefieldModifierAdapter.descriptor.adapterId,
        state, request: { ...(activeBattlefieldAssets ? { queryKind: 'battlefield_asset_projection' } : {}),
          pieceId: request.pieceId, ...(charge ? { context: { actionType: 'charge' } } : {}),
          ...(shadeTarget ? { context: { targetPieceId: request.targetPieceId } } : {}) } });
    }
    if (request?.queryKind === 'melee_modifiers' && meleeModifierAdapter) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId'].includes(key))) throw Error('CHARACTERISTIC_MELEE_MODIFIER_QUERY_INVALID');
      return router.dispatch({ operation: 'query', adapterId: meleeModifierAdapter.descriptor.adapterId,
        state, request: { pieceId: request.pieceId } });
    }
    if (request?.queryKind === 'melee_action_preview' && melee) {
      if (Object.keys(request).some(key => !['queryKind', 'actionType', 'pieceId', 'weaponName', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_MELEE_QUERY_PARAMETERS_INVALID');
      }
      const domains = enumerate(state).parameterDomains.filter(row => ['melee', 'charge_declaration'].includes(row.sourceRuntimeKind)
        && row.actionType === request.actionType && row.pieceId === request.pieceId
        && (request.weaponName === undefined || row.weaponName === request.weaponName));
      if (meleeSidearm && domains.length > 1 && request.weaponName === undefined) {
        throw Error('CHARACTERISTIC_MELEE_QUERY_WEAPON_REQUIRED');
      }
      const domain = domains[0];
      if (!domain) throw Error('CHARACTERISTIC_MELEE_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ schemaVersion: 'starcraft_tmg_melee_action_preview_v1', result: instantiate(state, domain, request.parameters),
        stateHash: hash(state), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'blast_template_attack_preview' && (pointDefenseChoices || includeArmourChoices || includeTemplateBatchOrder)) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_TEMPLATE_QUERY_PARAMETERS_INVALID');
      }
      const domain = enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'template'
        && row.pieceId === request.pieceId);
      if (!domain) throw Error('CHARACTERISTIC_TEMPLATE_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ schemaVersion: 'starcraft_tmg_blast_template_attack_preview_v2',
        result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request?.queryKind === 'ranged_precision_preview' && precisionChoices
      || request?.queryKind === 'ranged_attack_preview' && (ranged || pointDefenseChoices || includeArmourChoices || targetReactions)) {
      if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'weaponName', 'parameters'].includes(key))) {
        throw Error('CHARACTERISTIC_PRECISION_QUERY_PARAMETERS_INVALID');
      }
      const domain = enumerate(state).parameterDomains.find(row => ['ranged', 'template'].includes(row.sourceRuntimeKind)
        && row.pieceId === request.pieceId && row.weaponName === request.weaponName
        && row.attackMode === request.parameters?.attackMode);
      if (!domain) throw Error('CHARACTERISTIC_PRECISION_QUERY_DOMAIN_UNAVAILABLE');
      return seal({ schemaVersion: request.queryKind === 'ranged_attack_preview'
        ? 'starcraft_tmg_ranged_attack_preview_v1' : 'starcraft_tmg_ranged_precision_preview_v1',
        result: instantiate(state, domain, request.parameters), stateHash: hash(state),
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    const queryRuntime = request?.queryKind === 'blast_template_attack_preview' && templateAttack ? templateAttack
      : request?.queryKind === 'blast_template_coverage' && templateCoverage ? templateCoverage : adapter;
    if (!queryRuntime) throw Error('CHARACTERISTIC_COMPONENT_QUERY_UNSUPPORTED');
    return queryRuntime.query(state, request);
  }
  function lifecycle(state, request) {
    if (lunge?.pending(state) || lunge?.hasDeferredTrigger(state)) throw Error('LUNGE_REACTION_CHOICE_REQUIRED');
    if (seekerPhaseEnd && (seekerPhaseEnd.pending(state) || seekerPhaseEnd.canStart(state))) {
      throw Error('RAVEN_SEEKER_PHASE_END_CONTINUATION_REQUIRED');
    }
    if (poisonousEssence?.canStart(state)) throw Error('POISONOUS_ESSENCE_PHASE_END_CONTINUATION_REQUIRED');
    if (overwatch?.pending(state)) throw Error('OVERWATCH_CONTINUATION_REQUIRED');
    if (sabotageDronePhaseEnd && (sabotageDronePhaseEnd.pending(state) || sabotageDronePhaseEnd.canStart(state))) {
      throw Error('SABOTAGE_DRONE_PHASE_END_CONTINUATION_REQUIRED');
    }
    if (afterChargeRoll && state.pendingOfficialReactionWindow?.triggerKind === 'after_charge_roll') throw Error('AFTER_CHARGE_ROLL_CONTINUATION_REQUIRED');
    if (chargeDeclaration && (chargeDeclaration.pending(state)
      || state.pendingAction?.stage === 'resolve_charge_after_roll')) {
      throw Error('CHARGE_DECLARATION_REACTION_CONTINUATION_REQUIRED');
    }
    if (cardRefresh?.pending(state)) throw Error('RANGED_CARD_REFRESH_CHOICE_REQUIRED');
    if (friendlySupplyLossReaction?.pending(state)) throw Error('FRIENDLY_SUPPLY_LOSS_REACTION_CHOICE_REQUIRED');
    if (ancestralWisdom?.pending(state)) throw Error('ANCESTRAL_WISDOM_PAYMENT_CONTINUATION_REQUIRED');
    if (holoRoundEnd && ['round_end', 'cleanup_and_refresh'].includes(request.eventKind)
      && (holoRoundEnd.pending(state) || holoRoundEnd.canStart(state))) throw Error('HOLO_ROUND_END_CHOICES_REQUIRED');
    if (cleanupContinuation && request.eventKind === 'cleanup_and_refresh') {
      const candidate = cleanupContinuation.candidates(state).find(row => row.actionType === 'resolve_current_product_cleanup_refresh');
      if (!candidate) throw Error('CLEANUP_CONTINUATION_PHASE_OR_STEP_INVALID');
      return apply(state, wrapAction(state, candidate, 'cleanup'), {});
    }
    if (rangedDeclaration?.pending(state)) throw Error('RANGED_DECLARATION_ATTACK_CONTINUATION_REQUIRED');
    if (hiddenLossReactions?.pending(state)) throw Error('HIDDEN_LOSS_REACTION_CONTINUATION_REQUIRED');
    if (closeRanksReactions && displacement.pending(state)) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_CONTINUATION_REQUIRED');
    if (!guardianShield && !ourMindsAsOne && !khalasGift && !executorsWill && !forceWallTraversal && !feedback && !farsight && !scourgeQueen && !zagaraBroodmother && !poisonousEssence && !overwatch && !sabotageDronePhaseEnd && !holoRoundEnd && !unitLifecycleAdapter && !bileUpgrades && !psionicRoundEnd && !hiddenLossReactions && !targetedMeleeCritical && !markedTargetFirstWeapon && !vilelingFoundation && !defilerMeleeFoundation && !markerAreas && !coordinatedStrike && !stationaryFirstRanged && !plasmaArmourSource && !alloyArmourSource && !superStimpack && !commandoStimpack && !chargeDeclaration) throw Error('CHARACTERISTIC_UNIT_LIFECYCLE_CONSUMER_REQUIRED');
    if (psionicRoundEnd && request.eventKind === 'round_end'
      && (psionicRoundEnd.pending(state) || psionicRoundEnd.hasOutstanding(state))) throw Error('PSIONIC_TRANSFER_ROUND_END_CHOICES_REQUIRED');
    const prepared = psionicRoundEnd && request.eventKind === 'cleanup_and_refresh' ? psionicRoundEnd.cleanup(state) : state;
    const result = router.dispatch({ operation: 'lifecycle', state: prepared, request });
    const observeCleanup = request.eventKind === 'cleanup_and_refresh'
      && spatialState?.officialCharacteristicConsumerPolicy?.cleanupHiddenLossBeforeRefresh && hiddenLossReactions;
    const observed = observeCleanup ? hiddenLossReactions.afterTransition(state, result, {
      actionType: 'characteristic_status_lifecycle', eventKind: request.eventKind,
      sideKey: state.firstPlayerSideKey, phase: state.phase,
    }) : result;
    if (observeCleanup && hiddenLossReactions.pending(observed.state)) {
      throw Error('CHARACTERISTIC_CLEANUP_HIDDEN_REACTION_CONTINUATION_UNSUPPORTED');
    }
    const next = request.eventKind === 'cleanup_and_refresh' ? activation.cleanup(observed.state) : observed.state;
    return { ...observed, state: refreshOfficialReleaseRosterDerivedStateV2({ context, state: next }) };
  }
  return Object.freeze({ descriptor, bundle, catalogue, adapter, spatial, ranged, templateCoverage, templateAttack,
    ...(poisonousEssence ? { poisonousEssence } : {}),
    ...(overwatch ? { overwatch } : {}),
    ...(holoRoundEndSource?.version === '1.1.0' ? { unitRoundEnd: holoRoundEnd, unitRoundEndSource: holoRoundEndSource }
      : holoRoundEnd ? { holoRoundEnd, holoRoundEndSource } : {}),
    ...(decoyAdapter ? { decoySource, decoyAdapter } : {}),
    ...(summonedActions ? { summonedActions, summonSource } : {}),
    ...(personalTransport ? { personalTransport } : {}),
    ...(cleanupContinuation ? { cleanupContinuation } : {}),
    ...(rangedDeclaration ? { rangedDeclaration } : {}),
    ...(chargeDeclaration ? { chargeDeclaration } : {}),
    ...(cardRefresh ? { cardRefresh } : {}),
    ...(unitLifecycleAdapter ? { unitLifecycleBundle, unitLifecycleAdapter } : {}),
    ...(releaseZergTargets && darkSwarmLifecycle || guardianShield || ourMindsAsOne || khalasGift || executorsWill || forceWallTraversal || feedback || farsight || scourgeQueen || zagaraBroodmother || poisonousEssence || overwatch || sabotageDronePhaseEnd || holoRoundEnd || unitLifecycleAdapter || bileUpgrades || psionicRoundEnd || hiddenLossReactions || targetedMeleeCritical || markedTargetFirstWeapon || vilelingFoundation || defilerMeleeFoundation || markerAreas || coordinatedStrike || stationaryFirstRanged || plasmaArmourSource || alloyArmourSource || superStimpack || commandoStimpack || chargeDeclaration ? { lifecycle } : {}),
    ...(relocationAdapter ? { relocationBundle, relocationAdapter, postPlaceReactions } : {}),
    ...(reactionAdapter ? { reactionBundle, reactionAdapter, router } : {}),
    ...(registeredStorm ? { router, registeredStorm } : {}),
    ...(registeredKhassar ? { router, registeredKhassar } : {}),
    ...(hiddenLossReactions ? { hiddenLossReactions } : {}),
    precisionChoices, pointDefenseChoices, ...(targetReactions ? { targetReactions } : {}), ...(hits ? { hits, hitsChoices } : {}), ...(melee ? { melee, meleeChoices } : {}),
    ...(meleeModifierAdapter ? { meleeModifierBundle, meleeModifierAdapter, router } : {}),
    ...(battlefieldModifierAdapter ? { battlefieldModifierBundle, battlefieldModifierAdapter, router } : {}),
    ...(weaponAdapter ? { weaponBundle, weaponAdapter, router } : {}),
    ...(meleeWeaponBundle ? { meleeWeaponBundle } : {}),
    ...(lunge?.completeMove ? { completeLungeMove: (state, domain, parameters) =>
      lunge.completeMove(state, domain.sourceDomain, parameters) } : {}),
    ...(stormPhaseEnd ? { stormPhaseEnd } : {}),
    ...(releaseAssaultOrder ? { releaseAssaultOrder } : {}),
    ...(bombardRemovalLifecycle ? { observeBombardCreatorLoss(before, transition) {
      const state = transition.state;
      const hasDestroyedSource = state.officialBombardBindings?.some(binding => !binding.consumed
        && state.pieces.some(piece => piece.id === binding.sourcePieceId && piece.isDestroyed && piece.currentModels === 0));
      return hasDestroyedSource ? bombardReplacement.afterTransition(transition, before) : transition;
    } } : {}),
    ...(psionicRoundEnd?.scheduledEffects ? { tokenRoundEnd: psionicRoundEnd } : {}),
    enumerate, instantiate, apply, query });
}
