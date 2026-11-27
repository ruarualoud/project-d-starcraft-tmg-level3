import { OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13 } from '../rule-atoms/official-relocation-geometry-policy-v13.mjs';
import { OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13, projectOfficialHighGroundFinalPlacementStateV13 } from '../rule-atoms/official-high-ground-final-placement-policy-v13.mjs';
import { createOfficialForceWallTraversalPolicyV1, OFFICIAL_FORCE_WALL_DEFINITION_ID,
  OFFICIAL_TELEKINETIC_PUSH_DEFINITION_ID, OFFICIAL_PSI_LIGHTNING_DEFINITION_ID } from './official-force-wall-v1.mjs';
import { OFFICIAL_PSIONIC_STORM_DEFINITION_IDS } from './official-psionic-storm-source-rules-v1.mjs';
import { OFFICIAL_KHALAS_GIFT_DEFINITION_ID } from './official-khalas-gift-v1.mjs';
import { OFFICIAL_EXECUTORS_WILL_DEFINITION_ID } from './official-executors-will-v1.mjs';
import { OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID } from './official-ancestral-wisdom-payment-v1.mjs';
import { OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID } from './official-our-minds-as-one-v1.mjs';
import { createOfficialFeedbackCompletionV1, OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1 } from './official-feedback-completion-v1.mjs';
import { createOfficialDarkSwarmPlacementSourceV1, createOfficialDarkSwarmPlacementRuntimeV1, OFFICIAL_GESTATE_DARK_SWARM_DEFINITION_ID } from './official-dark-swarm-placement-v1.mjs';
import { createOfficialDarkSwarmTokenLifecyclePolicyV1 } from './official-dark-swarm-token-lifecycle-v1.mjs';
import { createOfficialCleanupContinuationPolicyV1 } from './official-cleanup-continuation-runtime-v1.mjs';
import { OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID } from './official-dark-swarm-reaction-facts-v1.mjs';
import { createOfficialConsumePaymentSourceV1, OFFICIAL_CONSUME_DEFINITION_ID } from './official-consume-payment-facts-v1.mjs';
import { createOfficialConsumePaymentPolicyV1, createOfficialConsumePaymentAdapterV1 } from './official-consume-payment-runtime-v1.mjs';
import { createOfficialTokenLeadingTransferSourceV2, createOfficialPsionicTransferSourceV1, createOfficialPsionicTransferRuntimeV1 } from './official-psionic-transfer-runtime-v1.mjs';
import { createOfficialPersonalTransportSourceV1 } from './official-personal-transport-runtime-v1.mjs';
import { createOfficialPsionicTransferRoundEndPolicyV1 } from './official-psionic-transfer-round-end-v1.mjs';
import { createOfficialPsionicSourceLifecyclePolicyV1 } from '../source-data/official-psionic-source-lifecycle-policy-v1.mjs';
import { createOfficialCorrosiveBileSourceV1, createOfficialCorrosiveBileRuntimeV1 } from './official-corrosive-bile-runtime-v1.mjs';
import { OFFICIAL_BOMBARD_DEFINITION_ID, createOfficialBombardSourceV1, createOfficialBombardRuntimeV1 } from './official-bombard-runtime-v1.mjs';
import { OFFICIAL_DEFILER_BITE_DEFINITION_ID, createOfficialMeleeSidearmPolicyV1 } from './official-melee-sidearm-sequence-v1.mjs';
import { isOfficialRosterAttackProfileFieldedV1 } from '../rule-atoms/official-weapon-replacement-loadout-v1.mjs';
import { createOfficialBombardTargetingPolicyV1 } from './official-bombard-targeting-v1.mjs';
import { createOfficialBombardReplacementPolicyV1 } from './official-bombard-replacement-v1.mjs';
import { createOfficialBombardRemovalLifecyclePolicyV1 } from './official-bombard-removal-lifecycle-v1.mjs';
import { createOfficialCorrosiveBileDamagePolicyV1 } from './official-corrosive-bile-resolution-runtime-v1.mjs';
import { createOfficialCorrosiveBileUpgradeSourceV1 } from './official-corrosive-bile-upgrades-v1.mjs';
import { getOfficialReleaseBattlefieldAssetComponentProfileV2 } from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialAutomaticHitsRuntimeV1, createOfficialAutomaticHitsContinuationAdapterV1 }
  from './official-automatic-hits-runtime-v1.mjs';
import { createOfficialAutomaticHitsPoolChoiceRuntimeV1 } from './official-melee-pool-choice-runtime-v1.mjs';
import { createOfficialBlastTemplateAttackRuntimeV1 } from './official-blast-template-attack-runtime-v1.mjs';
import { createOfficialBlastTemplateCoverageRuntimeV1 } from './official-blast-template-coverage-runtime-v1.mjs';
import { createOfficialSiegeModeDataBundleV2 } from '../source-data/official-status-stay-in-play-data-bundle-v1.mjs';
import { OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13 } from '../rule-atoms/official-template-batch-order-policy-v13.mjs';
import { createOfficialZagaraPsionicLinkSourceV1, createOfficialZagaraPsionicLinkAdapterV1, ZAGARA_PSIONIC_LINK_DEFINITION_ID,
  STALKER_FURY_ID, createOfficialStalkerFurySourceV1, createOfficialStalkerFuryAdapterV1,
  createOfficialQueenPsionicLinkSourceV1, createOfficialQueenPsionicLinkAdapterV1,
  OFFICIAL_QUEEN_PSIONIC_LINK_DEFINITION_ID } from './official-match-lifecycle-family-adapter-v1.mjs';
import { createOfficialDomineeringPresenceSourceBundleV2, createOfficialZergUniqueFamilyAdapterV1,
  createOfficialZergUniqueFamilyDefinitionBindingsV1, OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID,
  createOfficialLairPredationSourceBundleV1, OFFICIAL_LAIR_PREDATION_ID }
  from './official-zerg-unique-family-adapter-v1.mjs';
import { OFFICIAL_FEEDBACK_DEFINITION_IDS, OFFICIAL_FARSIGHT_ACTIVE_DEFINITION_ID, OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID, OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID, OFFICIAL_MEDPACK_DEFINITION_ID, OFFICIAL_OPTICAL_FLARE_DEFINITION_ID, OFFICIAL_KERRIGAN_TARGETED_ACTIVE_DEFINITION_IDS,
  createOfficialTargetedActiveAbilityPolicyV1, selectOfficialBoundTargetedActiveDefinitionIdsV1 }
  from './official-targeted-active-ability-policy-v1.mjs';
import { createOfficialUnitLifecycleFamilyAdapterV1, createOfficialUnitLifecycleFamilyDefinitionBindingsV1,
  createOfficialUnitLifecycleFamilySourceBundleV2, OFFICIAL_DEFILER_TUNNEL_NETWORK_ID, OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID, OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID,
  OFFICIAL_RAPID_INGRESS_DEFINITION_ID, OFFICIAL_POINT_DEFENSE_LASER_DEFINITION_ID, OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID,
  OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID, OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID, OFFICIAL_PYLON_WARP_IN_DEFINITION_ID }
  from './official-unit-lifecycle-family-adapter-v1.mjs';
import { consumeOfficialBattlefieldAssetMovementLifecycleV1, createOfficialBattlefieldAssetFamilySourceBundleV2,
  OFFICIAL_OVERSIGHT_MODE_ID, OFFICIAL_VENTRAL_SACS_DEFINITION_ID, OFFICIAL_WARP_PRISM_WARP_CONDUIT_DEFINITION_ID, OFFICIAL_DROPSHIP_DUST_OFF_DEFINITION_ID,
  OFFICIAL_PYLON_WARP_CONDUIT_DEFINITION_ID, OFFICIAL_PYLON_INGENUITY_DEFINITION_ID, OFFICIAL_SENTRY_FORCE_FIELD_DEFINITIONS,
  createOfficialCreepCardComponentAdapterV2, createOfficialBattlefieldModifierComponentAdapterV1 }
  from './official-battlefield-asset-family-adapter-v1.mjs';
import { createOfficialBattlefieldDisplacementProducerV1, createOfficialBattlefieldDisplacementSourceV1 }
  from './official-battlefield-displacement-source-v1.mjs';
import { createOfficialBattlefieldDisplacementQueryPolicyV1, createOfficialPsionicDisplacementQueryV1 }
  from './official-psionic-displacement-query-v1.mjs';
import { createOfficialBattlefieldDisplacementPolicyV1, createOfficialPsionicDisplacementRuntimeV1 }
  from './official-psionic-displacement-runtime-v1.mjs';
import { OFFICIAL_INDOMITABLE_RANGED_POLICY_V1, OFFICIAL_INDOMITABLE_RANGED_POLICY_V2 }
  from '../rule-atoms/official-indomitable-ranged-policy-v1.mjs';
import { OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1 } from '../rule-atoms/official-mode-bound-ranged-target-policy-v1.mjs';
import { OFFICIAL_COORDINATED_STRIKE_POLICY_V2 } from '../rule-atoms/official-coordinated-strike-policy-v1.mjs';
import { OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1 } from '../rule-atoms/official-movement-clearance-contract-v13.mjs';
import { OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID, OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID } from '../rule-atoms/official-charge-speed-debuff-policy-v1.mjs';
import { OFFICIAL_RANGED_DECLARATION_POLICY_V1, OFFICIAL_RANGED_DECLARATION_POLICY_V2 } from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2, OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3 } from '../rule-atoms/official-action-status-lifecycle-policy-v1.mjs';
import { createOfficialSabotageDronePhaseEndPolicyV1, OFFICIAL_SABOTAGE_DRONE_PHASE_END_DEFINITION_ID } from './official-sabotage-drone-phase-end-v1.mjs';
import { OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1 } from '../rule-atoms/official-armour-threshold-policy-v1.mjs';
import { OFFICIAL_PLAGUE_DEFINITION_ID, createOfficialPlagueCoverageSourceV1, createOfficialPlagueCoverageRuntimeV1 }
  from './official-plague-coverage-v1.mjs';
import { createOfficialPlagueResolutionPolicyV1, createOfficialPlagueRuntimeV1 } from './official-plague-runtime-v1.mjs';
import { createOfficialPoisonousEssencePolicyV1, OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID } from './official-poisonous-essence-phase-end-v1.mjs';
import { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1, OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1 } from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { createOfficialShieldedLifecyclePolicyV1 } from '../source-data/official-shielded-lifecycle-policy-v1.mjs';
import { OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 } from '../rule-atoms/official-impact-allocation-policy-v13.mjs';
import { createOfficialPinpointEngagementPolicyV1 } from '../rule-atoms/official-pinpoint-engagement-policy-v1.mjs';
import { createOfficialPrintedIndirectFireEvadePolicyV1 } from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { createOfficialDecoySourceV1 } from '../source-data/official-decoy-source-v1.mjs';
import { createOfficialHoloRoundEndSourceV1 } from '../source-data/official-holo-round-end-source-v1.mjs';
import { OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID, OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID } from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialGeneratedUnitDataBundleV2 } from '../source-data/official-generated-unit-data-bundle-v2.mjs';
import { createOfficialStructureSourceV1 } from '../source-data/official-structure-source-v1.mjs';
import { createOfficialStructureFamilyAdapterV1 } from './official-structure-family-adapter-v1.mjs';
import { createOfficialProtossSupportBundleV2, ARTANIS_COMMANDER_ID, createOfficialArtanisCommanderBundleV2, createOfficialKhalaiActivationSourceBundleV2, createOfficialProtossUniqueFamilyAdapterV1,
  createOfficialProtossUniqueFamilyDefinitionBindingsV1, OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID }
  from './official-protoss-unique-family-adapter-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { OFFICIAL_ROACHLING_BURROW_RESTRICTION_DEFINITION_ID } from '../rule-atoms/official-unit-restrictions-v1.mjs';
import { createOfficialSummonDataBundleV2, OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID }
  from '../source-data/official-summon-data-bundle-v1.mjs';
import { createOfficialMissionSupplyProfileV2 } from '../source-data/official-mission-supply-profile-v2.mjs';
import { createOfficialSummonedCombatEligibilityPolicyV1 } from '../source-data/official-summoned-combat-eligibility-policy-v1.mjs';
import { createOfficialRoundSupplyStateV1, verifyOfficialRoundSupplyStateV1 } from '../rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialAbilityEffectRuntimeV1, createOfficialSelectedRosterAbilityAdapterV1,
  createOfficialSelectedRosterAbilityDefinitionBindingsV1 } from './official-ability-effect-runtime-v1.mjs';
import { createOfficialCharacteristicStatusFamilyAdapterV1, createOfficialCharacteristicStatusFamilyDefinitionBindingsV1,
  createOfficialCharacteristicStatusFamilySourceBundleV2, synchronizeOfficialEffectiveHitPointWoundsV1, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V1, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V6,
  OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1, OFFICIAL_RAVEN_INTERNAL_TECH_MODULE_DEFINITION_ID, OFFICIAL_RAVEN_CORVID_REACTOR_DEFINITION_ID, OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID } from './official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialMeleeFamilySourceBundleV2, createOfficialMeleeModifierComponentAdapterV1 }
  from './official-melee-family-adapter-v1.mjs';
import { createOfficialRangedFamilySourceBundleV2, createOfficialRangedModifierComponentAdapterV1 } from './official-ranged-family-adapter-v1.mjs';
import { OFFICIAL_KHASSAR_DE_TEMPLARI_ID } from './official-khassar-de-templari-v1.mjs';
import { createOfficialRosterWeaponComponentAdapterV1 } from './official-roster-weapon-component-adapter-v1.mjs';
import { createOfficialTerranFreedomFightersBundleV2, createOfficialTerranMissionSupplyBundleV2,
  OFFICIAL_ADDITIONAL_SUPPLY_DEPOTS_DEFINITION_ID, OFFICIAL_MEDIC_FACILITIES_ID, createOfficialTerranUniqueFamilyAdapterV1,
  createOfficialTerranUniqueFamilyDefinitionBindingsV1 } from './official-terran-unique-family-adapter-v1.mjs';
import { createOfficialSelectedRosterAbilityCoverageV2 } from './official-selected-roster-ability-coverage-v2.mjs';
import { createOfficialRespawnMorphDataBundleV2, OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID,
  OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID, OFFICIAL_COCOON_MORPH_DEFINITION_ID,
  OFFICIAL_COCOON_RESPAWN_DEFINITION_ID } from '../source-data/official-respawn-morph-data-bundle-v1.mjs';
import { createOfficialSelectedRosterAbilityRuntimeV1, createOfficialSelectedRosterAbilitySourceBundleV1,
  JIM_RAYNOR_COMMANDER_DEFINITION_ID, OFFICIAL_OMEGA_NETWORK_CARD_DEFINITION_ID }
  from './official-selected-roster-ability-runtime-v1.mjs';
import { createOfficialSelectedRosterMeleeActionRuntimeV1 } from './official-selected-roster-melee-action-runtime-v1.mjs';
import { createOfficialSelectedRosterRangedActionRuntimeV1, resumeOfficialSelectedRosterRangedDamageReactionV1 }
  from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { OFFICIAL_PNEUMATIZED_CARAPACE_ID, OFFICIAL_EVOLUTION_CARAPACE_ID, OFFICIAL_BROOD_INSTINCT_DEFINITION_ID, OFFICIAL_DEBILITATING_SALIVA_DEFINITION_ID, OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID,
  createOfficialReactionFamilyAdapterV1, createOfficialReactionFamilyDefinitionBindingsV1,
  createOfficialReactionFamilySourceBundleV2, openOfficialOpticalFlareRestorationWindowV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';
import { createOfficialRelocationFamilyAdapterV1, createOfficialRelocationFamilyDefinitionBindingsV1,
  createOfficialRelocationFamilySourceBundleV2, isOfficialReviewedReserveAmbushV2, OFFICIAL_LEAPING_STRIKE_DEFINITION_ID, OFFICIAL_RAYNOR_PICKUP_DEFINITION_ID } from './official-relocation-family-adapter-v1.mjs';
import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 } from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1 } from './official-singleton-summon-identity-v1.mjs';
import { createOfficialSelectedRosterSpatialActionRuntimeV1 } from './official-selected-roster-spatial-action-runtime-v1.mjs';
import { OFFICIAL_CREEP_FOOTPRINT_MEASUREMENT_V1 } from './official-current-product-state-facts-v1.mjs';

// Printed effects owned by the numeric weapon delegates. Pinpoint and
// Indirect Fire also require their source-bound policies for this release.
const bileLauncherDetectionId = 'unit:bile_launcher/detection-any-phase@1';
const bileLauncherCreepId = 'unit:bile_launcher/source-of-creep-any-phase@1';
const bileLauncherCharacteristicIds = new Set([bileLauncherDetectionId, 'unit:bile_launcher/biological-structure-any-phase@1',
  'unit:bile_launcher/indomitable-assault-phase@1']);
const ravenDetectionId = 'unit:raven/detection-any-phase@1';
const novaModeCharacteristicIds = new Set([
  ...['stealth', 'assault'].flatMap(mode => ['ghost-visor-any-phase', 'super-stimpack-movement-phase']
    .map(suffix => 'unit:nova_' + mode + '_mode/' + suffix + '@1')),
  'unit:nova_stealth_mode/tactical-stealth-suit-any-phase@1',
]);
const novaSharedCharacteristicIds = new Set([
  'card:nova_covert_ops/mark-for-death-any@1',
  'unit:spec_ops_marauder__marauder_/commando-stimpack-movement-phase@1',
  'unit:spec_ops_marauder__marauder_/magrail-munitions-assault-phase@1',
  'unit:spec_ops_marauder__marauder_/spec-ops-armour-any-phase@1',
]);
const ravenCharacteristics = new Set([ravenDetectionId, OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID, OFFICIAL_RAVEN_CORVID_REACTOR_DEFINITION_ID,
  OFFICIAL_RAVEN_INTERNAL_TECH_MODULE_DEFINITION_ID, OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID]);
const supportedNumericWeaponEffects = {
  assault: new Set([
    'attack-effect:long-range-v1', 'attack-effect:surge-armour-bypass-v1',
    'attack-effect:pierce-v1', 'attack-effect:sidearm-v1', 'attack-effect:pinpoint-v1',
    'attack-effect:anti-evade-v1', 'attack-effect:bulky-v1', 'attack-effect:burst-fire-v1',
    'attack-effect:critical-hit-v1', 'attack-effect:specialist-v1', 'attack-effect:instant-v1',
    'attack-effect:indirect-fire-v1', 'attack-effect:locked-in-v1',
  ]),
  combat: new Set(['attack-effect:surge-armour-bypass-v1', 'attack-effect:critical-hit-v1', 'attack-effect:instant-v1']),
};

// These existing executors have been verified against the frozen current-product
// source. Require the identity alias to that source before reusing a route.
const legacySourceSnapshotHash = '8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105';
const commanderReferenceId = 'unit:kerrigan/commander-any-phase@1';
const zagaraArmyCharacteristicIds = new Set([
  'unit:zagara/infested-drop-movement-phase@1',
  'unit:zagara/broodmother-movement-phase@1',
  'card:zagara_s_swarm/scourge-queen-any@1',
]);
const equivalentCommanderIds = [JIM_RAYNOR_COMMANDER_DEFINITION_ID,
  'unit:zagara/commander-any-phase@1', 'unit:tassadar/commander-any-phase@1'];
const reusableSelectedAbilityIds = new Set([
  commanderReferenceId,
  ...OFFICIAL_KERRIGAN_TARGETED_ACTIVE_DEFINITION_IDS,
  OFFICIAL_OMEGA_NETWORK_CARD_DEFINITION_ID,
  'unit:marine/stimpack-movement-phase@1',
  'unit:marine/combat-shield-movement-phase@1',
  'unit:kerrigan_swarm_raptor__zergling_/leap-assault-phase@1',
  'unit:kerrigan_swarm_raptor__zergling_/adrenal-overload-assault-phase@1',
  'card:terran_armed_forces/tactical-retreat-any@1',
  'card:terran_armed_forces/terran-tenacity-any@1',
  'card:kerrigan_s_swarm/wild-mutation-any@1',
  'card:kerrigan_s_swarm/zerg-creep-any@1',
  'card:accelerating_creep/speed-on-creep-any@1',
]);

const inheritedSwarmCharacteristicIds = new Set([
  'unit:raptor__zergling_/adrenal-glands-combat-phase@1',
  'unit:roach/hydriodic-bile-assault-phase@1',
  'unit:zergling/adrenal-glands-combat-phase@1',
  'card:evolution_chamber/extended-claws-any@1',
  'card:roach_warren/nasty-surprise-any@1',
  'card:spawning_pool/feral-rage-any@1',
]);
const lairCreepPlacementId = 'card:lair/creep-spread-any@1';
const roachGlialReconstitutionId = 'unit:roach/glial-reconstitution-movement-phase@1';

const inheritedHydriodicBileIds = new Set([
  'unit:corpser__roach_/hydriodic-bile-assault-phase@1',
  'unit:vile__roach_/hydriodic-bile-assault-phase@1',
]);
const inheritedRoachStatusIds = new Set(['corpser__roach_', 'roach', 'vile__roach_']
  .flatMap(unit => [`unit:${unit}/burrow-any-phase@1`, `unit:${unit}/regeneration-assault-phase@1`]));
const inheritedRelocationIds = new Set([
  OFFICIAL_LEAPING_STRIKE_DEFINITION_ID,
  'unit:stalker/blink-movement-phase@1',
  ...['corpser__roach_', 'roach', 'vile__roach_'].map(unit => `unit:${unit}/tunneling-claws-any-phase@1`),
  ...['corpser__roach_', 'roach', 'vile__roach_', 'swarmling__zergling_'].map(unit => `unit:${unit}/burrow-ambush-movement-phase@1`),
]);
const protossSupportCharacteristics = new Set([
  'card:forge/ground-weapons-any@1',
  'card:gate_chronoboosted/quick-strikes-any@1',
  'card:gate_chronoboosted/zealous-charge-any@1',
  'card:twilight_council/weapons-of-the-firstborn-any@1',
  'card:warp_gate/quick-strikes-any@1',
  'unit:adept/guidance-assault-phase@1',
  'unit:adept/resonating-glaives-assault-phase@1',
  'unit:stalker/path-of-shadows-any-phase@1',
  'unit:zealot/we-stand-as-one-combat-phase@1',
]);
const protossStrategicRecalls = ['card:nexus/strategic-recall-any@1', 'card:overcharged_nexus/strategic-recall-any@1'];
const zealotLegEnhancements = 'unit:zealot/leg-enhancements-movement-phase@1';
const supportRangedCards = new Set([
  'card:armory/vehicle-weapons-any@1',
  'card:barracks__tech_lab_/let-s-have-a-blast-any@1',
  'card:engineering_bay/infantry-weapons-any@1'
]);
const supportRelocationCards = new Set([
  'card:barracks/go-go-go-any@1',
  'card:barracks__tech_lab_/go-go-go-any@1',
  'card:orbital_command/comsat-station-any@1'
]);
const supportReactions = [
  'card:armory/vehicle-plating-any@1',
  'card:engineering_bay/infantry-armor-any@1',
  'card:vanadium_plating/crystalline-alloy-any@1',
  'card:academy/advanced-training-any@1'
];
const inheritedMovementCardIds = new Set(["card:barracks__proxy_/armed-and-ready-any@1", "card:barracks__proxy_/go-go-go-any@1", "card:spawning_pool__six_pool_/timing-push-any@1"]);
const movementCardCompanionIds = new Set(['card:spawning_pool__six_pool_/feral-rage-any@1',
  'unit:zergling/metabolic-boost-assault-phase@1']);
const zealotChargeId = 'unit:zealot/charge-assault-phase@1';
const siegeTankImpactId = 'unit:siege_tank/devastating-charge-assault-phase@1';
const siegeTankCharacteristicIds = new Set([
  'card:factory__tech_lab_/field-repair-any@1',
  'card:factory__tech_lab_/pound-em-flat-any@1',
  'unit:siege_tank/aftershock-rounds-assault-phase@1',
  'unit:siege_tank/heavy-plating-any-phase@1',
  'unit:siege_tank/indomitable-assault-phase@1',
  'unit:siege_tank/large-any-phase@1',
  'unit:siege_tank/point-blank-assault-phase@1',
]);
const inheritedCharacteristicIds = new Set([
  'card:factory/field-repair-any@1',
  'unit:hydralisk/ancillary-carapace-any-phase@1',
  'unit:raptor__zergling_/adrenal-overload-assault-phase@1',
  'unit:raptor__zergling_/metabolic-boost-assault-phase@1',
  'unit:swarmling__zergling_/metabolic-boost-assault-phase@1',
]);
const slugthrowerId = 'unit:marine/slugthrower-assault-phase@1';
const inheritedReserveAndKhalaiRelocations = new Set([
  'unit:raynor_s_raider__marine_/raiders-roll-movement-phase@1',
  'unit:raynor_s_raider__marine_/rapid-reinforcements-movement-phase@1',
  'unit:praetor_guard__zealot_/leg-enhancements-movement-phase@1',
]);
const praetorCharacteristics = new Set(['charge-assault-phase', 'shield-overcharge-any-phase',
  'precognition-combat-phase', 'titan-killers-combat-phase'].map(key => 'unit:praetor_guard__zealot_/' + key + '@1'));
const infantryCharacteristics = new Set(['unit:marauder/kinetic-foam-any-phase@1',
  'unit:marauder/stimpack-movement-phase@1','unit:raynor_s_raider__marine_/stimpack-movement-phase@1',
  'unit:raynor_s_raider__marine_/slugthrower-assault-phase@1']);
const veteranArmourId = 'unit:marauder/veteran-of-tarsonis-any-phase@1';
const reusedGoliathAbilityIds = new Set([
  'unit:goliath/ares-class-targeting-system-any-phase@1',
  'unit:goliath/indomitable-assault-phase@1',
  'unit:goliath/target-lock-movement-phase@1',
]);
const zergSwarmRapidBurrowingId = 'card:zerg_swarm/rapid-burrowing-any@1';
const stabilizerMedpacksId = 'unit:medic/stabilizer-medpacks-any-phase@1';
const fragGrenadesId = 'unit:marine/grenades-frag-assault-phase@1';
const groovedSpinesId = 'unit:hydralisk/grooved-spines-assault-phase@1';
const missileAttacksId = 'card:hydralisk_den/missile-attacks-any@1';
const creepPlacementIds = new Set(['card:hatchery/creep-spread-any@1', 'card:overlord/excrete-creep-any@1']);
const reactiveCreepIds = [
  'card:reactive_creep/creep-removal-any@1',
  'card:reactive_creep/living-glob-of-tissue-any@1',
  'card:reactive_creep/reactive-tissue-any@1'
];
const assetDefinitionIds = [...creepPlacementIds, 'card:accelerating_creep/living-glob-of-tissue-any@1', 'card:accelerating_creep/creep-removal-any@1',
  'unit:queen/creep-speed-any-phase@1', 'unit:hydralisk/lurking-any-phase@1',
  'unit:corpser__roach_/glial-reconstitution-movement-phase@1',
  'unit:vile__roach_/glial-reconstitution-movement-phase@1', 'unit:jim_raynor/orders-movement-phase@1'];


function bindNonLethalDamage(actionState, context) {
  actionState.officialNonLethalDamagePolicy = OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1;
  actionState.officialNonLethalStandardDamagePolicy = OFFICIAL_NON_LETHAL_STANDARD_DAMAGE_POLICY_V1;
  bindShieldHealth(actionState, context);
}

function bindShieldHealth(actionState, context) {
  actionState.officialShieldedLifecyclePolicy = createOfficialShieldedLifecyclePolicyV1({ context });
  actionState.pieces = structuredClone(actionState.pieces);
  for (const piece of actionState.pieces) {
    synchronizeOfficialEffectiveHitPointWoundsV1(actionState, piece, { includeUnmodifiedProfiles: true });
  }
}

function createOfficialCreepDisplacementSpatialActions({ producer, runtime, spatial }) {
  function preparePlainMovement(state, action, options) {
    const move = spatial.apply(state, action, options);
    producer.assertEndpoint(move.state, action);
    return move;
  }

  function instantiate(state, domain, parameters) {
    const { coreParameters, choices } = runtime.split(parameters);
    const value = spatial.instantiate(state, domain, coreParameters);
    const displaced = runtime.prepare(state, 'spatial', value.action, choices);
    if (displaced) return { ...value, action: displaced.action };
    preparePlainMovement(state, value.action);
    return value;
  }

  function apply(state, action, options) {
    const displaced = action.executorId === runtime.descriptor.runtimeId;
    const move = displaced ? runtime.apply(state, action, options) : preparePlainMovement(state, action, options);
    const lifecycle = consumeOfficialBattlefieldAssetMovementLifecycleV1(move.state,
      displaced ? action.originalAction : action);
    if (!lifecycle.events.length) return move;
    const events = [...move.events, ...lifecycle.events];
    lifecycle.state.log.at(-1).events = structuredClone(events);
    return { ...move, state: lifecycle.state, events };
  }

  return Object.freeze({ enumerate: spatial.enumerate, instantiate, apply });
}

export function createOfficialReleaseRoomAbilityRuntimeV2({ context, state, useEquippedWeapons = false, useReleaseWideAbilityPhases = false,
  includeInheritedMovementCards = false, includeInheritedCharacteristics = false,

  includeInheritedMissionSupply = false, includeInheritedRangedHitDebuff = false, includeInheritedRespawn = false,
  includeInheritedVentralSacs = false, includeWarpPrism = false, includeZealotCharge = false,
  includeDropship = false, includeKhalai = false, includeInheritedLunge = false, includeQueenDomineering = false,
  includeWave3Vileling = false, includeCocoonMorph = false, includeZergSwarmBurrow = false,
  includeZergSwarmBroodInstinct = false, includeSiegeTankCoverage = false, includeRaynorFactionCards = false, includeRaven = false, includeRavenSeeker = false, includeNovaShared = false, includeNovaModes = false, includeNovaHolo = false, includeNovaStealthShooting = false,
  includeZagaraMeleeAndArmour = false, includeZagaraCreep = false, includeZagaraArmyAbilities = false, includeZergTargetReactions = false, includeRavagerImpact = false, includeRavagerBile = false, includeRavagerTunnel = false, includeBilePhysicalPlacement = false, includeWave3SupportAmbush = false, includeBileLauncherPassives = false, includeBombard = false, includeBombardPhysicalPlacement = false, includeDefilerBite = false, includeDefilerMound = false, includeReactiveCreep = false, includePlague = false,
  includeInheritedReserveAmbush = false, includeMalignantCreep = false, includeInheritedSwarmUpgrades = false, includeSwarmDefenceCards = false, includeLairPredation = false, includeOverseerChargeReaction = false, includeOmegaWormDetection = false, includeCreepFootprintGeometry = false, includeOmegaWormStructure = false, includeCreepMovementQueries = false, includeTemplarFarsight = false, includeTemplarAbilityPayment = false, includeAncestralWisdom = false, bindEmptyActivationSource = false, includeTassadarSupport = false, includeTassadarWalls = false,
  includeTemplarCasteRefresh = false, includeSentryGuardianShield = false, includeSentryRestoration = false, includeSentryForceField = false, includeTwilightTemplar = false, includeReleaseStorm = false, includeZeratulMobility = false, includeZeratulCombat = false, includeNerazimConcealment = false, includeNerazimNative = false, includeNerazimSupport = false, includeVoidSeeker = false, includeImmortal = false, includeAdept = false, includeHighGroundFinalPlacement = false,
  includeSelectedReserveAmbush = false, includeInheritedTerranInfantry = false, includeInheritedReserveAndKhalai = false,
  includeArtanisReactions = false, includeTankCoordinatedStrike = false, includeSupportWeapons = false, includeTerranSupportCards = false, includeDroneGliding = false, includeArtanisStand = false, includeRedirectSelection = false, includeProtossSupport = false,
  reportEffectiveAbilityRange = false, composeSelectedNative }) {
  const manifest = assertOfficialReleaseSourceV2(context, context || {});
  const identityCatalogue = context.resources?.abilityIdentities;
  const integrity = manifest.components.abilityIdentities?.integrity;
  if (integrity?.field !== 'identityCatalogueHash' || !identityCatalogue
    || integrity.value !== identityCatalogue.identityCatalogueHash) {
    throw Error('OFFICIAL_RELEASE_ROOM_ABILITY_IDENTITIES_REQUIRED');
  }
  const { dataset } = context;
  const hasRaven = includeRaven && state.pieces.some(piece => piece.officialUnitRecordKey === 'army_units:raven');
  const novaFaction = includeNovaShared && Object.values(state.cardResources || {}).flat()
    .some(card => card.officialCardRecordKey === 'tactical_cards:nova_covert_ops');
  const hasSpecOps = includeNovaShared && state.pieces.some(piece => piece.officialUnitRecordKey === 'army_units:spec_ops_marauder__marauder_');
  const defiler = includeZergTargetReactions && state.pieces.some(piece => piece.officialUnitRecordKey === 'army_units:defiler');
  const zagaraFaction = includeZergTargetReactions && Object.values(state.cardResources || {}).flat()
    .some(card => card.officialCardRecordKey === 'tactical_cards:zagara_s_swarm');
  const mound = includeDefilerMound && Object.values(state.cardResources || {}).flat()
    .some(card => card.officialCardRecordKey === 'tactical_cards:defiler_mound');
  const lair = includeLairPredation && Object.values(state.cardResources || {}).flat()
    .some(card => card.officialCardRecordKey === 'tactical_cards:lair');
  const overseer = includeOverseerChargeReaction && Object.values(state.cardResources || {}).flat()
    .some(card => card.officialCardRecordKey === 'tactical_cards:overseer');
  const hasSupportCards = includeTerranSupportCards && Object.values(state.cardResources || {}).flat().some(
    card => ['academy', 'armory', 'engineering_bay', 'vanadium_plating', 'barracks', 'barracks__tech_lab_', 'orbital_command'].includes(card.officialCardRecordKey?.split(':')[1]));
  const hasProtossSupportCards = includeProtossSupport && Object.values(state.cardResources ?? {}).flat().some(card =>
    ['forge','gate_chronoboosted','twilight_council','warp_gate','nexus','overcharged_nexus','observer','power_field'].includes(card.officialCardRecordKey?.split(':')[1]));
  const inlineCardPhases = useReleaseWideAbilityPhases || hasProtossSupportCards || hasSupportCards || zagaraFaction || mound || lair || overseer;
  const useSourcePhases = inlineCardPhases || hasRaven || novaFaction || hasSpecOps || defiler;
  const sourceInput = { dataset, identityCatalogue, ...(useSourcePhases ? { sourcePhasePolicy: createOfficialAbilitySourcePhasePolicyV1({ dataset, includeInlineCardPhases: inlineCardPhases }) } : {}) };
  const source = createOfficialAbilityEffectIrCatalogueV1(sourceInput);
  const rosterRegistry = state.rosterRegistryResolution ?? state.officialRosterRegistryResult;
  const coverageInput = { context, state, rosterRegistry, useEquippedWeapons };
  const inventory = createOfficialSelectedRosterAbilityCoverageV2({ ...coverageInput, catalogue: source });
  const selected = new Set(inventory.definitions.map(row => row.definitionId));
  const holoIds = includeNovaHolo ? ['stealth', 'assault']
    .map(mode => 'unit:nova_' + mode + '_mode/holo-decoy-movement-phase@1').filter(id => selected.has(id)) : [];
  const headShotId = 'unit:nova_stealth_mode/head-shot-assault-phase@1';
  const headShot = includeNovaStealthShooting && selected.has(headShotId);
  const novaChargeId = 'unit:nova_assault_mode/devastating-charge-assault-phase@1';
  const additionalImpactIds = includeZagaraMeleeAndArmour ? new Set([
    'unit:zagara/devastating-charge-assault-phase@1', 'unit:defiler/devastating-charge-assault-phase@1',
    ...(includeRavagerImpact ? ['unit:ravager/devastating-charge-assault-phase@1'] : []),
    ...(includeZeratulCombat ? ['unit:zeratul/devastating-charge-assault-phase@1'] : []),
  ].filter(id => selected.has(id))) : new Set();
  const immortal = includeImmortal && state.pieces.some(piece => piece.officialUnitRecordKey === 'army_units:immortal');
  if (immortal && selected.has('unit:immortal/devastating-charge-assault-phase@1')) {
    additionalImpactIds.add('unit:immortal/devastating-charge-assault-phase@1');
  }
  const novaSuitId = 'unit:nova_assault_mode/phase-reactor-suit-assault-phase@1';
  const griffinSupport = novaFaction && selected.has(OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID);
  const ravenTurret = hasRaven && selected.has(OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID);
  const vilelingPrefix = 'unit:vileling__zergling_/';
  const vileling = includeWave3Vileling && selected.has(vilelingPrefix + 'squadron-any-phase@1');
  const vilelingCharacteristics = new Set([
    vilelingPrefix + 'metabolic-boost-assault-phase@1',
    vilelingPrefix + 'debilitating-claws-combat-phase@1',
  ]);
  const { officialAttackProfileCatalogue: attackProfileCatalogue,
    officialAttackProfileCatalogueV2: attackProfileCatalogueV2 } = state;
  const summonRoachling = selected.has(OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID) && identityCatalogue.aliases.some(row =>
    row.definitionId === OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID && row.sourceSnapshotHash === legacySourceSnapshotHash);
  const cocoonMorph = includeCocoonMorph && selected.has(OFFICIAL_COCOON_MORPH_DEFINITION_ID)
    && selected.has(OFFICIAL_COCOON_RESPAWN_DEFINITION_ID);
  if (includeRavagerImpact && cocoonMorph) additionalImpactIds.add('unit:ravager/devastating-charge-assault-phase@1');
  const roachlingClawsId = 'unit:roachling/claws-combat-phase@1';
  const biteProfile = attackProfileCatalogueV2?.profilesByProfileKey['army_units:defiler::combat::Cancerous Bite'];
  const paidBite = includeDefilerBite && selected.has(OFFICIAL_DEFILER_BITE_DEFINITION_ID) && biteProfile
    && state.pieces.some(piece => piece.officialUnitRecordKey === biteProfile.recordKey
      && isOfficialRosterAttackProfileFieldedV1(state, piece, biteProfile));
  const weaponCandidates = [];
  for (const row of source.definitions) {
    if ((!selected.has(row.definitionId) && !(summonRoachling && row.definitionId === roachlingClawsId)
      && !(cocoonMorph && row.recordKey === 'army_units:ravager')
      && !(ravenTurret && row.definitionId === OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID))
      || row.activationKind !== 'weapon') continue;
    const profile = attackProfileCatalogue.profilesByProfileKey[[row.recordKey, row.phase, row.definitionName].join('::')];
    const allowed = supportedNumericWeaponEffects[row.phase];
    if (profile && allowed && profile.effects.every(effect => allowed.has(effect.effectAtomId)
      || (immortal && row.recordKey === 'army_units:immortal' && row.phase === 'assault' && effect.effectAtomId === 'attack-effect:concentrated-fire-v1')
      || (includeProtossSupport && row.definitionId === 'unit:adept/glaive-strike-combat-phase@1' && effect.effectAtomId === 'attack-effect:pierce-v1')
      || (paidBite && row.definitionId === OFFICIAL_DEFILER_BITE_DEFINITION_ID && effect.effectAtomId === 'attack-effect:sidearm-v1'))) {
      weaponCandidates.push({ definitionId: row.definitionId, profile });
    }
  }
  const spatial = createOfficialSelectedRosterSpatialActionRuntimeV1(state);
  let spatialInput = state;
  if (includeHighGroundFinalPlacement) {
    const policy = OFFICIAL_HIGH_GROUND_FINAL_PLACEMENT_POLICY_V13;
    if (manifest.source.references?.faq?.byteHash !== policy.sourceFaqByteHash
      || manifest.source.references?.core?.byteHash !== policy.sourceCoreByteHash) {
      throw Error('HIGH_GROUND_FINAL_PLACEMENT_RELEASE_SOURCE_MISMATCH');
    }
    spatialInput = projectOfficialHighGroundFinalPlacementStateV13(state, policy);
  }
  const actionState = { ...spatialInput, officialSelectedRosterSpatialRuntimeDescriptor: spatial.descriptor };
  if (includeCreepFootprintGeometry) actionState.officialCreepRangeMeasurement = OFFICIAL_CREEP_FOOTPRINT_MEASUREMENT_V1;
  if (immortal && !actionState.officialShieldedLifecyclePolicy) bindShieldHealth(actionState, context);
  if (paidBite) actionState.officialMeleeSidearmPolicy = createOfficialMeleeSidearmPolicyV1({ context, catalogue: attackProfileCatalogueV2 });
  if (useSourcePhases) actionState.officialAbilitySourcePhasePolicy = sourceInput.sourcePhasePolicy;
  const selectedWeaponEffects = new Set(weaponCandidates.flatMap(({ profile }) => profile.effects.map(effect => effect.effectAtomId)));
  if (selectedWeaponEffects.has('attack-effect:pinpoint-v1')) {
    actionState.officialPinpointEngagementPolicy = createOfficialPinpointEngagementPolicyV1({ context });
  }
  if (selectedWeaponEffects.has('attack-effect:indirect-fire-v1')) {
    actionState.officialPrintedIndirectFireEvadePolicy = createOfficialPrintedIndirectFireEvadePolicyV1({ context });
  }
  const asset = context.resources?.blastTemplateGeometry;
  const templateComponent = manifest.components.blastTemplateGeometry;
  const plague = includePlague && defiler && selected.has(OFFICIAL_PLAGUE_DEFINITION_ID);
  const templateIds = asset ? source.definitions.filter(row => selected.has(row.definitionId)
    && row.phase === 'assault' && row.activationKind === 'weapon'
    && row.recordKey === asset.scope.recordKey && row.definitionName === asset.scope.weaponName
    && attackProfileCatalogue.templateProfiles.some(profile =>
      profile.profileKey === [row.recordKey, row.phase, row.definitionName].join('::')))
    .map(row => row.definitionId) : [];
  const modeId = 'unit:siege_tank/mode-transformation-movement-phase@1';
  if (templateIds.length || plague) {
    if (!asset || templateComponent?.integrity?.field !== 'assetHash'
      || templateComponent.integrity.value !== asset.assetHash
      || asset.sourceSnapshotHash !== context.snapshot.snapshotHash
      || asset.normalizedDatasetHash !== dataset.datasetHash
      || (templateIds.length && !selected.has(modeId))) throw Error('OFFICIAL_RELEASE_TEMPLATE_SOURCE_REQUIRED');
    actionState.officialBlastTemplateGeometryAsset = asset;
  }
  if (templateIds.length) {
    actionState.officialTemplateBatchOrderPolicy = structuredClone(OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13);
    actionState.officialSiegeModeDataBundle = createOfficialSiegeModeDataBundleV2({ context });
  }
  const adapters = [];
  const executionBindings = [];
  const inheritedSelectedIds = new Set(identityCatalogue.aliases
    .filter(row => row.sourceSnapshotHash === legacySourceSnapshotHash && selected.has(row.definitionId))
    .map(row => row.definitionId));
  const ravagerBile = includeRavagerBile && (cocoonMorph || selected.has('unit:ravager/corrosive-bile-movement-phase@1'));
  if (ravagerBile) {
    const bile = createOfficialCorrosiveBileSourceV1({ catalogue: source });
    actionState.officialCorrosiveBileSourceBundle = bile;
    actionState.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
    actionState.officialCorrosiveBileDamagePolicy = createOfficialCorrosiveBileDamagePolicyV1({ context, source: bile, outsideActivationReactions: true });
    actionState.officialReleaseBileAssaultTiming = actionState.officialCorrosiveBileDamagePolicy.policyHash;
    actionState.officialFaqReactionPolicy = OFFICIAL_FAQ_REACTION_POLICY_V13;
    const upgradeIds = ['unit:ravager/bloated-bile-ducts-any-phase@1', 'unit:ravager/potent-bile-assault-phase@1']
      .filter(id => selected.has(id));
    if (upgradeIds.length) actionState.officialCorrosiveBileUpgradeSourceBundle =
      createOfficialCorrosiveBileUpgradeSourceV1({ context, catalogue: source, definitionIds: upgradeIds });
    const adapter = createOfficialCorrosiveBileRuntimeV1({ context, source: bile, state: actionState,
      damageConsumerReady: true, usePhysicalPlacement: includeBilePhysicalPlacement });
    adapters.push(adapter);
    executionBindings.push(...adapter.definitionBindings);
  }
  const bombard = includeBombard && selected.has(OFFICIAL_BOMBARD_DEFINITION_ID);
  if (bombard) {
    const binding = createOfficialBombardSourceV1({ catalogue: source });
    actionState.officialBombardSourceBundle = binding;
    if (includeBombardPhysicalPlacement) actionState.officialReleaseBombardPhysicalPlacement = binding.bundleHash;
    actionState.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
    actionState.officialBombardTargetingPolicy = createOfficialBombardTargetingPolicyV1({ source: binding });
    actionState.officialBombardReplacementPolicy = createOfficialBombardReplacementPolicyV1({ source: binding });
    actionState.officialBombardRemovalLifecyclePolicy = createOfficialBombardRemovalLifecyclePolicyV1({ context, source: binding });
    actionState.officialCleanupContinuationPolicy = createOfficialCleanupContinuationPolicyV1({ context });
    const adapter = createOfficialBombardRuntimeV1({ context, source: binding, state: actionState });
    adapters.push(adapter);
    executionBindings.push(...adapter.definitionBindings);
  }
  const gestate = defiler && selected.has(OFFICIAL_GESTATE_DARK_SWARM_DEFINITION_ID);
  if (gestate) {
    const placement = createOfficialDarkSwarmPlacementSourceV1({ catalogue: source });
    actionState.officialDarkSwarmPlacementSourceBundle = placement;
    actionState.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
    actionState.officialDarkSwarmTokenLifecyclePolicy = createOfficialDarkSwarmTokenLifecyclePolicyV1({ context, source: placement });
    actionState.officialCleanupContinuationPolicy = createOfficialCleanupContinuationPolicyV1({ context });
    const adapter = createOfficialDarkSwarmPlacementRuntimeV1({ context, source: placement, state: actionState });
    adapters.push(adapter);
    executionBindings.push(...adapter.definitionBindings);
  }
  if (defiler && selected.has(OFFICIAL_CONSUME_DEFINITION_ID)) {
    const payment = createOfficialConsumePaymentSourceV1({ catalogue: source });
    actionState.officialConsumePaymentSourceBundle = payment;
    actionState.officialConsumePaymentPolicy = createOfficialConsumePaymentPolicyV1({ context, source: payment,
      consumerScope: templateIds.length ? 'numeric_and_template_attack_target_reaction' : 'numeric_attack_target_reaction',
      templateSurvivorsOnly: templateIds.length > 0, combatLifecycleCoexistence: true, activeAbilityPayment: plague });
    const adapter = createOfficialConsumePaymentAdapterV1(payment);
    adapters.push(adapter);
    executionBindings.push(...adapter.definitionBindings);
  }
  const rapidIngress = includeRaynorFactionCards && selected.has(OFFICIAL_RAPID_INGRESS_DEFINITION_ID);
  const pylonProducer = includeKhalai && inheritedSelectedIds.has(OFFICIAL_PYLON_WARP_IN_DEFINITION_ID);
  const zergTargetIds = includeZergTargetReactions
    ? ['card:zagara_s_swarm/instinctive-reaction-any@1', OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID].filter(id => selected.has(id)) : [];
  const damageReactionIds = [
    ...(includeProtossSupport && selected.has('unit:zealot/zealous-round-assault-phase@1') ? ['unit:zealot/zealous-round-assault-phase@1'] : []),
    ...(includeZergTargetReactions && selected.has('unit:zagara/transfusion-any-phase@1') ? ['unit:zagara/transfusion-any-phase@1'] : []),
    ...['unit:medic/life-support-any-phase@1', 'unit:queen/transfusion-any-phase@1'].filter(id => selected.has(id)),
    ...['card:daelaam/dae-uhl-any@1'].filter(id => inheritedSelectedIds.has(id)),
  ];
  const restorationIds = ['unit:medic/restoration-any-phase@1', 'unit:queen/restoration-any-phase@1',
    ...(includeSentryRestoration ? ['unit:sentry/restoration-any-phase@1'] : [])]
    .filter(id => selected.has(id));
  const declarationReactionIds = includeInheritedRangedHitDebuff && inheritedSelectedIds.has(OFFICIAL_DEBILITATING_SALIVA_DEFINITION_ID)
    ? [OFFICIAL_DEBILITATING_SALIVA_DEFINITION_ID] : [];
  const lungeIds = includeInheritedLunge && inheritedSelectedIds.has(OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID)
    ? [OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID] : [];
  const broodInstinct = includeZergSwarmBroodInstinct && selected.has(OFFICIAL_BROOD_INSTINCT_DEFINITION_ID);
  const carapace = includeSwarmDefenceCards && inheritedSelectedIds.has(OFFICIAL_EVOLUTION_CARAPACE_ID);
  const afterChargeRoll = includeOverseerChargeReaction && inheritedSelectedIds.has(OFFICIAL_PNEUMATIZED_CARAPACE_ID);
  const wisdom = includeAncestralWisdom && selected.has(OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID);
  const mightId = 'card:nerazim/might-of-the-nerazim-any@1';
  const visionId = 'unit:zeratul/prophetic-vision-any-phase@1';
  const plasmaId = 'card:robotics_facility/plasma-shields-any@1';
  const nerazimReactions = includeNerazimSupport ? [mightId, visionId, plasmaId].filter(id => selected.has(id)) : [];
  const might = nerazimReactions.includes(mightId), vision = nerazimReactions.includes(visionId), plasma = nerazimReactions.includes(plasmaId);
  const twilightReactionId = 'unit:twilight_templar__high_templar_/bound-by-the-khala-any-phase@1';
  const twilightReactions = includeTwilightTemplar && selected.has(twilightReactionId) ? [twilightReactionId] : [];
  const immortalDefences = immortal ? ['unit:immortal/improved-barrier-any-phase@1','unit:immortal/shield-overcharge-any-phase@1']
    .filter(id => selected.has(id)) : [];
  const supportReactionIds = includeProtossSupport ? ['card:forge/ground-armor-any@1','card:power_field/guardian-shell-any@1',
    'card:overcharged_nexus/photon-overcharge-any@1','card:observer/gravitic-boosters-any@1','card:twilight_council/veil-of-shadows-any@1','unit:sentry/hallucination-assault-phase@1'].filter(id=>selected.has(id)) : [];
  const reactionDefinitionIds = [...supportReactionIds,...(includeTerranSupportCards ? supportReactions.filter(id => selected.has(id)) : []), ...immortalDefences, ...nerazimReactions, ...twilightReactions, ...(wisdom ? [OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID] : []), ...zergTargetIds, ...(afterChargeRoll ? [OFFICIAL_PNEUMATIZED_CARAPACE_ID] : []), ...(carapace ? [OFFICIAL_EVOLUTION_CARAPACE_ID] : []), ...(headShot ? [headShotId] : []), ...(hasSpecOps && selected.has(OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID) ? [OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID] : []), ...damageReactionIds, ...restorationIds, ...declarationReactionIds, ...lungeIds,
    ...(broodInstinct ? [OFFICIAL_BROOD_INSTINCT_DEFINITION_ID] : []), ...(ravenTurret ? [OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID] : [])];
  if (includeInheritedTerranInfantry && inheritedSelectedIds.has(OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID)) {
    reactionDefinitionIds.push(OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID);
  }
  const standId = 'unit:artanis/hierarch-s-stand-assault-phase@1';
  if (includeArtanisStand && inheritedSelectedIds.has(standId)) {
    reactionDefinitionIds.push(standId);
    actionState.officialArtanisStandEnabled = true;
    if (includeRedirectSelection) actionState.officialArtanisRedirectSelection = true;
  }
  if (includeArtanisReactions && inheritedSelectedIds.has('unit:artanis/lightning-dash-assault-phase@1')) {
    reactionDefinitionIds.push('unit:artanis/lightning-dash-assault-phase@1');
    actionState.officialArtanisDashEnabled=true;
  }
  const tankShells = includeSupportWeapons && templateIds.length
    ? ['unit:siege_tank/shaped-blast-assault-phase@1','unit:siege_tank/smart-shells-assault-phase@1'].filter(id=>selected.has(id))
    : [];
  reactionDefinitionIds.push(...tankShells);
  const reactionBundle = reactionDefinitionIds.length
    ? createOfficialReactionFamilySourceBundleV2({ catalogue: source, definitionIds: reactionDefinitionIds })
    : null;
  if (reactionBundle) {
    actionState.officialReactionFamilySourceBundle = reactionBundle;
    if (headShot || tankShells.length) {
      actionState.officialRangedDeclarationPolicy = headShot ? OFFICIAL_RANGED_DECLARATION_POLICY_V2 : OFFICIAL_RANGED_DECLARATION_POLICY_V1;
      actionState.officialActionStatusLifecyclePolicy = OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2;
    }
    actionState.officialFaqReactionPolicy = structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13);
    actionState.officialStructureTargetingPolicy = structuredClone(OFFICIAL_STRUCTURE_TARGETING_POLICY_V13);
  }

  const selectedAssetIds = [...assetDefinitionIds,
    ...(includeTerranSupportCards ? ['card:orbital_command/scanner-sweep-any@1'] : []),
    ...(includeProtossSupport ? ['card:observer/surveillance-any@1'] : []),
    ...(includeInheritedTerranInfantry ? [veteranArmourId] : []),
    ...(includeSwarmDefenceCards ? [OFFICIAL_OVERSIGHT_MODE_ID] : []),
    ...(includeInheritedSwarmUpgrades ? [lairCreepPlacementId, roachGlialReconstitutionId] : []),
    ...(includeInheritedVentralSacs ? [OFFICIAL_VENTRAL_SACS_DEFINITION_ID] : []),
    ...(includeWarpPrism ? [OFFICIAL_WARP_PRISM_WARP_CONDUIT_DEFINITION_ID] : []),
    ...(includeDropship ? [OFFICIAL_DROPSHIP_DUST_OFF_DEFINITION_ID] : [])]
    .filter(id => inheritedSelectedIds.has(id));
  if (includeMalignantCreep) {
    for (const id of inheritedSelectedIds) {
      if (id.startsWith('card:malignant_creep/')) selectedAssetIds.push(id);
    }
  }
  if (includeReactiveCreep) selectedAssetIds.push(...reactiveCreepIds.filter(id => selected.has(id)));
  const bileLauncherCreep = includeBileLauncherPassives && selected.has(bileLauncherCreepId);
  if (bileLauncherCreep) selectedAssetIds.push(bileLauncherCreepId);
  const sentryFields = includeSentryForceField
    ? Object.keys(OFFICIAL_SENTRY_FORCE_FIELD_DEFINITIONS).filter(id => inheritedSelectedIds.has(id)) : [];
  if (includeAdept && selected.has('unit:adept/psionic-presence-any-phase@1')) selectedAssetIds.push('unit:adept/psionic-presence-any-phase@1');
  if (sentryFields.length) {
    actionState.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
    selectedAssetIds.push(...sentryFields);
  }
  const omegaCreep = includeCreepFootprintGeometry && inheritedSelectedIds.has(OFFICIAL_OMEGA_NETWORK_CARD_DEFINITION_ID);
  if (omegaCreep) selectedAssetIds.push('unit:omega_worm/source-of-creep-any-phase@1');
  if (pylonProducer) selectedAssetIds.push(OFFICIAL_PYLON_WARP_CONDUIT_DEFINITION_ID, OFFICIAL_PYLON_INGENUITY_DEFINITION_ID);
  const rapidBurrowing = includeZergSwarmBurrow && selected.has(zergSwarmRapidBurrowingId);
  const darknessId = 'card:nerazim/darkness-descends-any@1';
  const supportActives = includeNerazimSupport ? [darknessId,'card:gateway/quick-strikes-any@1'].filter(id => selected.has(id)) : [];
  const anakhId = 'card:void_seeker/anakh-su-n-any@1';
  const anakh = includeVoidSeeker && selected.has(anakhId);
  const personalTransport = includeVoidSeeker && selected.has('card:void_seeker/personal-transport-any@1');
  const concealmentIds = includeNerazimConcealment ? ['unit:nerazim_watchers__adept_/path-of-shadows-any-phase@1',
    'unit:zeratul/one-with-the-shadows-any-phase@1'].filter(id => selected.has(id)) : [];
  const sentencedId = 'unit:zeratul/sentenced-to-death-movement-phase@1';
  const sentenced = includeZeratulCombat && selected.has(sentencedId);
  const voidPrisonId = 'unit:zeratul/void-prison-movement-phase@1';
  const voidPrison = includeZeratulMobility && selected.has(voidPrisonId);
  const shadowStrikeId = 'unit:zeratul/shadow-strike-combat-phase@1';
  const guardianId = 'unit:sentry/guardian-shield-movement-phase@1';
  const guardianShield = includeSentryGuardianShield && inheritedSelectedIds.has(guardianId);
  const ourDutyId = 'card:templar_caste/our-duty-is-unending-any@1';
  const ourDuty = includeTemplarCasteRefresh && selected.has(ourDutyId);
  const wallIds = includeTassadarWalls
    ? [OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_PSI_LIGHTNING_DEFINITION_ID, OFFICIAL_TELEKINETIC_PUSH_DEFINITION_ID].filter(id => selected.has(id)) : [];
  const tassadarSupportIds = includeTassadarSupport
    ? [OFFICIAL_KHALAS_GIFT_DEFINITION_ID, OFFICIAL_EXECUTORS_WILL_DEFINITION_ID].filter(id => selected.has(id)) : [];
  const ourMinds = includeTemplarAbilityPayment && selected.has(OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID);
  const feedbackIds = includeTemplarAbilityPayment ? OFFICIAL_FEEDBACK_DEFINITION_IDS.filter(id => selected.has(id)) : [];
  const farsight = includeTemplarFarsight && selected.has(OFFICIAL_FARSIGHT_ACTIVE_DEFINITION_ID);
  const zagaraArmySelected = includeZagaraArmyAbilities && [...zagaraArmyCharacteristicIds].some(id => selected.has(id));
  const immortalPassives = immortal ? ['unit:immortal/indomitable-assault-phase@1','unit:immortal/for-the-ancients-assault-phase@1',
    'unit:immortal/fury-unyielding-assault-phase@1'] : [];
  const characteristicIds = source.definitions.filter(row => selected.has(row.definitionId)
    && (((row.definitionId === slugthrowerId || row.definitionId === OFFICIAL_MEDPACK_DEFINITION_ID
      || row.definitionId === OFFICIAL_OPTICAL_FLARE_DEFINITION_ID
      || reusedGoliathAbilityIds.has(row.definitionId) || inheritedHydriodicBileIds.has(row.definitionId)
      || (includeInheritedReserveAndKhalai && inheritedSelectedIds.has(row.definitionId) && praetorCharacteristics.has(row.definitionId))
      || (includeInheritedTerranInfantry && infantryCharacteristics.has(row.definitionId))
      || (includeInheritedSwarmUpgrades && inheritedSwarmCharacteristicIds.has(row.definitionId))
      || inheritedRoachStatusIds.has(row.definitionId) || row.definitionId === missileAttacksId
       || row.definitionId === 'card:hatchery/lie-in-wait-any@1'
       || (includeTerranSupportCards && supportRangedCards.has(row.definitionId))
       || (includeProtossSupport && protossSupportCharacteristics.has(row.definitionId))
       || (includeInheritedMovementCards && movementCardCompanionIds.has(row.definitionId))
       || (includeInheritedCharacteristics && inheritedCharacteristicIds.has(row.definitionId))
       || (includeZealotCharge && row.definitionId === zealotChargeId))
      && inheritedSelectedIds.has(row.definitionId))
      || (row.definitionId === modeId && templateIds.length)
      || (includeTankCoordinatedStrike && templateIds.length && row.definitionId === OFFICIAL_COORDINATED_STRIKE_POLICY_V2.definitionId)
      || (includeNovaShared && novaSharedCharacteristicIds.has(row.definitionId))
      || (includeNovaModes && novaModeCharacteristicIds.has(row.definitionId))
      || (includeNovaStealthShooting && row.definitionId === 'unit:nova_stealth_mode/operational-efficiency-assault-phase@1')
      || (mound && row.definitionId === OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID)
      || (ourMinds && row.definitionId === OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID)
      || feedbackIds.includes(row.definitionId) || tassadarSupportIds.includes(row.definitionId) || wallIds.includes(row.definitionId)
      || (ourDuty && row.definitionId === ourDutyId) || (guardianShield && row.definitionId === guardianId)
      || (farsight && row.definitionId === OFFICIAL_FARSIGHT_ACTIVE_DEFINITION_ID)
      || (zagaraArmySelected && zagaraArmyCharacteristicIds.has(row.definitionId))
      || (includeZagaraMeleeAndArmour && row.definitionId === 'unit:zagara/indomitable-assault-phase@1')
      || (includeBileLauncherPassives && bileLauncherCharacteristicIds.has(row.definitionId))
      || (hasRaven && ravenCharacteristics.has(row.definitionId))
      || (hasRaven && includeRavenSeeker && row.definitionId === OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID)
      || (includeSiegeTankCoverage && siegeTankCharacteristicIds.has(row.definitionId))
      || immortalPassives.includes(row.definitionId) || (anakh && row.definitionId === anakhId) || supportActives.includes(row.definitionId) || concealmentIds.includes(row.definitionId)
      || (sentenced && row.definitionId === sentencedId)
      || (voidPrison && row.definitionId === voidPrisonId)
      || row.definitionId === shadowStrikeId
      || (rapidBurrowing && row.definitionId === zergSwarmRapidBurrowingId)
      || (vileling && vilelingCharacteristics.has(row.definitionId))
      || (row.sourceKind === 'unit_feature' && row.activationKind === 'passive' && row.phase === 'any'
        && ['Squadron', 'Raptor Strain'].includes(row.definitionName))))
    .map(row => row.definitionId);
  // The army selects the faction card; its summoned unit is absent from the initial roster.
  const omegaWormDetector = includeOmegaWormDetection && inheritedSelectedIds.has(OFFICIAL_OMEGA_NETWORK_CARD_DEFINITION_ID);
  if (omegaWormDetector) characteristicIds.push('unit:omega_worm/detection-any-phase@1');
  if (holoIds.length) characteristicIds.push('unit:holo_decoy/lethal-hologram-any-phase@1');
  if (griffinSupport) characteristicIds.push(OFFICIAL_SABOTAGE_DRONE_PHASE_END_DEFINITION_ID);
  if (summonRoachling) characteristicIds.push(OFFICIAL_ROACHLING_BURROW_RESTRICTION_DEFINITION_ID);
  if (characteristicIds.length) {
    const bundle = createOfficialCharacteristicStatusFamilySourceBundleV2({ catalogue: source,
      definitionIds: characteristicIds, canonicalResourceTypes: anakh || supportActives.length > 0 || concealmentIds.length > 0 || sentenced || voidPrison || guardianShield || ourDuty || wallIds.length > 0 || tassadarSupportIds.length > 0 || farsight || ourMinds || feedbackIds.length > 0 || ravagerBile || zagaraArmySelected || useSourcePhases || selectedAssetIds.length > 0
        || characteristicIds.includes(shadowStrikeId) || characteristicIds.includes(zealotChargeId) });
    actionState.officialCharacteristicStatusFamilySourceBundle = bundle;
    if (includeInheritedTerranInfantry && characteristicIds.some(id => infantryCharacteristics.has(id))) {
      actionState.officialCharacteristicConsumerPolicy ??= OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3;
      if (bundle.routes.some(route => route.effectKind === 'stimpack' && route.nonLethalDamage > 0)) {
        bindNonLethalDamage(actionState, context);
      }
    }
    if (wallIds.includes(OFFICIAL_FORCE_WALL_DEFINITION_ID)) {
      actionState.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
      const wall = bundle.routes.find(route => route.definitionId === OFFICIAL_FORCE_WALL_DEFINITION_ID);
      actionState.officialForceWallTraversalPolicy = createOfficialForceWallTraversalPolicyV1(actionState, wall);
    }
    if (mound && characteristicIds.includes(OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID)) {
      const policy = createOfficialPoisonousEssencePolicyV1({ context, source: bundle });
      actionState.officialPoisonousEssencePolicy = policy;
      actionState.officialReleaseMoundAssaultTiming = policy.policyHash;
      bindNonLethalDamage(actionState, context);
    }
    if (includeRavenSeeker && characteristicIds.includes(OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID)) {
      actionState.officialSeekerAssaultTiming = { definitionId: OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID, sourceBundleHash: bundle.bundleHash };
    }
    if (griffinSupport) {
      actionState.officialSabotageDronePhaseEndPolicy = createOfficialSabotageDronePhaseEndPolicyV1({ context, source: bundle });
      actionState.officialReleaseDroneAssaultTiming = actionState.officialSabotageDronePhaseEndPolicy.policyHash;
      actionState.officialFaqReactionPolicy = OFFICIAL_FAQ_REACTION_POLICY_V13;
    }
    if (includeNovaShared && characteristicIds.some(id => novaSharedCharacteristicIds.has(id)
      || (includeNovaModes && novaModeCharacteristicIds.has(id)))) {
      actionState.officialCharacteristicConsumerPolicy = OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3;
      if (hasSpecOps) actionState.officialActionStatusLifecyclePolicy = OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2;
    }
    if (might || vision || supportActives.includes(darknessId)) {
      actionState.officialCharacteristicConsumerPolicy = OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3;
      actionState.officialFaqReactionPolicy = OFFICIAL_FAQ_REACTION_POLICY_V13;
      if (might) actionState.officialCleanupContinuationPolicy ??= createOfficialCleanupContinuationPolicyV1({ context });
    }
    if (anakh) actionState.officialActionStatusLifecyclePolicy = OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3;
    else if (concealmentIds.length) actionState.officialActionStatusLifecyclePolicy ??= OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V2;
    if (anakh || concealmentIds.length || sentenced || voidPrison || guardianShield || ourDuty || farsight || ourMinds || feedbackIds.length || tassadarSupportIds.length || zagaraArmySelected) {
      actionState.officialCharacteristicConsumerPolicy ??= OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V1;
    }
    if (feedbackIds.length) {
      bindNonLethalDamage(actionState, context);
      actionState.officialFeedbackReactionTimingPolicy = OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1;
    }
    if (wallIds.includes(OFFICIAL_PSI_LIGHTNING_DEFINITION_ID) && !actionState.officialShieldedLifecyclePolicy) {
      bindShieldHealth(actionState, context);
    }
    if (includeInheritedCharacteristics && bundle.routes.some(route => route.effectKind === 'first_armour_tough')) {
      actionState.officialArmourRollOrdinalPolicy = OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1;
    }
    if (omegaWormDetector || characteristicIds.includes(bileLauncherDetectionId) || (hasRaven && characteristicIds.includes(ravenDetectionId))
      || (includeNovaModes && bundle.routes.some(row => row.abilityName === 'Ghost Visor' && row.effectKind === 'detection_aura'))) {
      actionState.officialCharacteristicConsumerPolicy = OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3;
      actionState.officialDetectionHiddenLossPolicy = OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1;
      actionState.officialFaqReactionPolicy = OFFICIAL_FAQ_REACTION_POLICY_V13;
    }
    if (vileling || rapidBurrowing || characteristicIds.some(id => inheritedRoachStatusIds.has(id))) {
      actionState.officialCharacteristicConsumerPolicy = OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V6;
    }
    if (bundle.routes.some(route => route.effectKind === 'indomitable')) {
      actionState.officialIndomitableRangedPolicy = includeSiegeTankCoverage && templateIds.length
        ? OFFICIAL_INDOMITABLE_RANGED_POLICY_V2 : OFFICIAL_INDOMITABLE_RANGED_POLICY_V1;
    }
    if (includeSiegeTankCoverage && bundle.routes.some(route => route.effectKind === 'ranged_engaged_target_prohibition')) {
      actionState.officialModeBoundRangedTargetPolicy = OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1;
    }
    if (includeTankCoordinatedStrike && bundle.routes.some(route => route.definitionId === OFFICIAL_COORDINATED_STRIKE_POLICY_V2.definitionId)) {
      actionState.officialCoordinatedStrikeConsumerPolicy = OFFICIAL_COORDINATED_STRIKE_POLICY_V2;
    }
    if (includeSiegeTankCoverage && bundle.routes.some(route => route.effectKind === 'large_movement')) {
      actionState.officialLargeTerrainRemovalPolicy = OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1;
    }
    adapters.push(createOfficialCharacteristicStatusFamilyAdapterV1(bundle,
      restorationIds.length ? { afterApply: transition => openOfficialOpticalFlareRestorationWindowV1(reactionBundle, transition) } : {}));
    executionBindings.push(...createOfficialCharacteristicStatusFamilyDefinitionBindingsV1(bundle));
  }
  if (plague) {
    if (!actionState.officialPoisonousEssencePolicy) bindNonLethalDamage(actionState, context);
    const coverageSource = createOfficialPlagueCoverageSourceV1({ context, catalogue: source });
    actionState.officialPlagueCoverageSourceBundle = coverageSource;
    actionState.officialPlagueResolutionPolicy = createOfficialPlagueResolutionPolicyV1({ context, source: coverageSource });
    const coverage = createOfficialPlagueCoverageRuntimeV1({ context, catalogue: source, state: actionState });
    const cast = createOfficialPlagueRuntimeV1({ context, coverage, state: actionState });
    adapters.push(cast);
    executionBindings.push(...cast.definitionBindings);
  }
  if (includeInheritedReserveAndKhalai && actionState.officialCharacteristicConsumerPolicy?.cleanupHiddenLossBeforeRefresh) {
    actionState.officialFaqReactionPolicy = OFFICIAL_FAQ_REACTION_POLICY_V13;
  }
  if (includeDroneGliding && ravenTurret) actionState.officialTurretActivationEndOwner = 'overwatch_v1';
  const relocationIds = [...inheritedSelectedIds].filter(id => inheritedRelocationIds.has(id)
    || (includeInheritedReserveAmbush && isOfficialReviewedReserveAmbushV2(id))
    || (includeTerranSupportCards && supportRelocationCards.has(id))
    || (includeProtossSupport && id === zealotLegEnhancements)
    || (includeInheritedMovementCards && inheritedMovementCardIds.has(id))
    || (includeInheritedReserveAndKhalai && inheritedReserveAndKhalaiRelocations.has(id))
    || (includeWarpPrism && id === 'card:warp_prism/phase-any@1'));
  const voidBlinkId = 'unit:zeratul/void-blink-assault-phase@1';
  if (includeZeratulMobility && selected.has(voidBlinkId)) relocationIds.push(voidBlinkId);
  const twilightWarpId = 'unit:twilight_templar__high_templar_/warp-in-movement-phase@1';
  if (includeTwilightTemplar && selected.has(twilightWarpId)) relocationIds.push(twilightWarpId);
  const vilelingBurrow = vilelingPrefix + 'burrow-ambush-movement-phase@1';
  if (includeRaynorFactionCards && selected.has(OFFICIAL_RAYNOR_PICKUP_DEFINITION_ID)) relocationIds.push(OFFICIAL_RAYNOR_PICKUP_DEFINITION_ID);
  if (includeNovaHolo && selected.has(novaSuitId)) relocationIds.push(novaSuitId);
  if (vileling && selected.has(vilelingBurrow)) relocationIds.push(vilelingBurrow);
  if (includeWave3SupportAmbush) {
    for (const id of ['unit:bile_launcher/burrow-ambush-movement-phase@1', 'unit:defiler/burrow-ambush-movement-phase@1']) {
      if (selected.has(id)) relocationIds.push(id);
    }
  }
  // Paid upgrades may be absent from both the inherited aliases and the base roster.
  // Reuse the relocation compiler's reviewed sources for every selected reserve ambush.
  if (includeSelectedReserveAmbush) {
    for (const id of selected) {
      if (isOfficialReviewedReserveAmbushV2(id) && !relocationIds.includes(id)) relocationIds.push(id);
    }
  }
  if (includeInheritedReserveAndKhalai && relocationIds.some(id => inheritedReserveAndKhalaiRelocations.has(id) || id === zealotLegEnhancements)) {
    actionState.officialRelocationGeometryPolicy = OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13;
  }
  if (rapidIngress && includeDroneGliding) relocationIds.push('unit:point_defense_drone/gliding-any-phase@1');
  if (relocationIds.length) {
    const bundle = createOfficialRelocationFamilySourceBundleV2({ catalogue: source, definitionIds: relocationIds });
    actionState.officialRelocationFamilySourceBundle = bundle;
    adapters.push(createOfficialRelocationFamilyAdapterV1(bundle));
    executionBindings.push(...createOfficialRelocationFamilyDefinitionBindingsV1(bundle));
  }
  const modifierIds = [fragGrenadesId, stabilizerMedpacksId, groovedSpinesId,
    ...(includeSupportWeapons ? ['unit:medic/a-13-flash-grenade-launcher-any-phase@1'] : []),
    ...(includeInheritedTerranInfantry ? ['unit:marauder/laser-targeting-systems-assault-phase@1',
      'unit:raynor_s_raider__marine_/grenades-frag-assault-phase@1'] : [])]
    .filter(id => inheritedSelectedIds.has(id));
  if (rapidIngress) modifierIds.push(OFFICIAL_POINT_DEFENSE_LASER_DEFINITION_ID);
  if (modifierIds.length) {
    const bundle = createOfficialRangedFamilySourceBundleV2({ catalogue: source, definitionIds: modifierIds,
      ...(rapidIngress ? { attackProfileCatalogue } : {}) });
    actionState.officialRangedFamilySourceBundle = bundle;
    const modifier = createOfficialRangedModifierComponentAdapterV1(bundle, { includePointDefense: rapidIngress });
    adapters.push(modifier);
    executionBindings.push(...modifier.definitionBindings);
  }
  const registeredRangedModifierCount = executionBindings.length;
  let assetBindings = [];
  if (selectedAssetIds.length) {
    const bundle = createOfficialBattlefieldAssetFamilySourceBundleV2({ catalogue: source, definitionIds: selectedAssetIds });
    actionState.officialBattlefieldAssetFamilySourceBundle = bundle;
    actionState.officialArmourThresholdPolicy = OFFICIAL_ARMOUR_THRESHOLD_POLICY_V1;
    const creepCardModifier = bundle.routes.some(route =>
      (includeReactiveCreep && route.recordKey === 'tactical_cards:reactive_creep')
      || (includeMalignantCreep && route.recordKey === 'tactical_cards:malignant_creep'));
    const assets = (bileLauncherCreep || omegaCreep || creepCardModifier || selectedAssetIds.includes(veteranArmourId) || bundle.routes.some(route => route.requiresOwnAdeptShade)) && !bundle.routes.some(route => route.actionKind === 'active_ability')
      ? createOfficialBattlefieldModifierComponentAdapterV1(bundle) : createOfficialCreepCardComponentAdapterV2(bundle);
    assetBindings = assets.definitionBindings;
    adapters.push(assets);
    executionBindings.push(...assetBindings);
  }
  const omegaStructure = includeOmegaWormStructure && inheritedSelectedIds.has(OFFICIAL_OMEGA_NETWORK_CARD_DEFINITION_ID);
  if (pylonProducer || ravenTurret || griffinSupport || omegaStructure) {
    const generated = [...(griffinSupport ? ['army_units:sabotage_drone'] : []), ...(pylonProducer ? ['army_units:pylon'] : []), ...(ravenTurret ? ['army_units:auto_turret'] : [])];
    const structuresToBind = [...(griffinSupport ? ['unit:sabotage_drone/structure-any-phase@1'] : []), ...(pylonProducer ? ['unit:pylon/structure-any-phase@1'] : []), ...(ravenTurret ? ['unit:auto_turret/structure-any-phase@1'] : [])];
    if (omegaStructure) {
      generated.push('army_units:omega_worm');
      structuresToBind.push('unit:omega_worm/structure-any-phase@1');
    }
    actionState.officialGeneratedUnitDataBundle = createOfficialGeneratedUnitDataBundleV2({ context,
      recordKeys: [...new Set([...(state.officialGeneratedUnitDataBundle?.profiles.map(row => row.recordKey) ?? []), ...generated])] });
    actionState.officialStructureSourceBundle = createOfficialStructureSourceV1({ catalogue: source,
      definitionIds: [...new Set([...(state.officialStructureSourceBundle?.definitionIds ?? []), ...structuresToBind])] });
    const structures = createOfficialStructureFamilyAdapterV1(actionState.officialStructureSourceBundle);
    adapters.push(structures);
    executionBindings.push(...structures.definitionBindings);
  }
  if (holoIds.length) {
    const recordKeys = [...new Set([...(actionState.officialGeneratedUnitDataBundle?.profiles || []).map(row => row.recordKey), 'army_units:holo_decoy'])];
    actionState.officialGeneratedUnitDataBundle = createOfficialGeneratedUnitDataBundleV2({ context, recordKeys });
    actionState.officialDecoySourceBundle = createOfficialDecoySourceV1({ catalogue: source });
  }
  if (ravenTurret || holoIds.length) {
    const definitionIds = [...(ravenTurret ? ['unit:auto_turret/timed-life-any-phase@1'] : []),
      ...(holoIds.length ? ['unit:holo_decoy/timed-life-any-phase@1', 'unit:holo_decoy/surprise-any-phase@1'] : [])];
    const end = createOfficialHoloRoundEndSourceV1({ context, catalogue: source, definitionIds });
    actionState[ravenTurret ? 'officialUnitRoundEndSourceBundle' : 'officialHoloRoundEndSourceBundle'] = end;
  }
  if (includeProtossSupport && selected.has(STALKER_FURY_ID)) {
    const route=createOfficialStalkerFurySourceV1(source);
    actionState.officialStalkerFurySource=route;
    const adapter=createOfficialStalkerFuryAdapterV1(route);
    adapters.push(adapter); executionBindings.push(...adapter.definitionBindings);
  }
  const khalaiFaction = includeKhalai && inheritedSelectedIds.has(OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID);
  const artanisCommander = includeInheritedReserveAndKhalai && inheritedSelectedIds.has(ARTANIS_COMMANDER_ID);
  const protossCards = includeProtossSupport ? ['card:nexus/ancient-pride-any@1','card:warp_gate/warp-in-any@1'].filter(id=>selected.has(id)) : [];
  if (khalaiFaction || artanisCommander || protossCards.length) {
    const bundle = protossCards.length ? createOfficialProtossSupportBundleV2(source,[...protossCards,
      ...(artanisCommander?[ARTANIS_COMMANDER_ID]:[]), ...(khalaiFaction?[OFFICIAL_KHALAI_ACTIVATION_CHAIN_DEFINITION_ID]:[])]) : artanisCommander ? createOfficialArtanisCommanderBundleV2(source, khalaiFaction)
      : createOfficialKhalaiActivationSourceBundleV2(source);
    if (artanisCommander) {
      actionState.officialContextualSupplyModifierRoutes = [
        ...(actionState.officialContextualSupplyModifierRoutes || []).filter(r=>r.definitionId !== ARTANIS_COMMANDER_ID),
        bundle.routes.find(r=>r.definitionId === ARTANIS_COMMANDER_ID),
      ];
    }
    actionState.officialProtossUniqueFamilySourceBundle = bundle;
    adapters.push(createOfficialProtossUniqueFamilyAdapterV1(bundle));
    executionBindings.push(...createOfficialProtossUniqueFamilyDefinitionBindingsV1(bundle));
  }
  if (includeZagaraArmyAbilities && selected.has(ZAGARA_PSIONIC_LINK_DEFINITION_ID)) {
    const route = createOfficialZagaraPsionicLinkSourceV1(source);
    actionState.officialZagaraPsionicLinkSource = route;
    const adapter = createOfficialZagaraPsionicLinkAdapterV1(route);
    adapters.push(adapter);
    executionBindings.push(...adapter.definitionBindings);
  }
  if (selected.has(OFFICIAL_QUEEN_PSIONIC_LINK_DEFINITION_ID)) {
    const route = createOfficialQueenPsionicLinkSourceV1(source);
    actionState.officialQueenPsionicLinkSource = route;
    const adapter = createOfficialQueenPsionicLinkAdapterV1(route);
    adapters.push(adapter);
    executionBindings.push(...adapter.definitionBindings);
  }
  const queenPresenceSelected = selected.has(OFFICIAL_DOMINEERING_PRESENCE_DEFINITION_ID);
  const predationSelected = includeLairPredation && inheritedSelectedIds.has(OFFICIAL_LAIR_PREDATION_ID);
  if (queenPresenceSelected || predationSelected) {
    const bundle = predationSelected
      ? createOfficialLairPredationSourceBundleV1(source, { includeQueen: queenPresenceSelected })
      : createOfficialDomineeringPresenceSourceBundleV2(source);
    if (predationSelected) actionState.officialZergUniqueFamilySourceBundle = bundle;
    else if (includeQueenDomineering) actionState.officialQueenDomineeringPresenceSourceBundle = bundle;
    adapters.push(createOfficialZergUniqueFamilyAdapterV1(bundle));
    executionBindings.push(...createOfficialZergUniqueFamilyDefinitionBindingsV1(bundle));
  }
  const freedomFightersId = 'unit:jim_raynor/freedom-fighters-any-phase@1';
  const depotSelected = includeInheritedMissionSupply
    && inheritedSelectedIds.has(OFFICIAL_ADDITIONAL_SUPPLY_DEPOTS_DEFINITION_ID);
  const freedomSelected = inheritedSelectedIds.has(freedomFightersId);
  let supplyBindings = [];
  const medicFacilities = includeTerranSupportCards && inheritedSelectedIds.has(OFFICIAL_MEDIC_FACILITIES_ID);
  if (depotSelected || freedomSelected || medicFacilities) {
    const definitionIds = [...(depotSelected ? [OFFICIAL_ADDITIONAL_SUPPLY_DEPOTS_DEFINITION_ID] : []),
      ...(medicFacilities ? [OFFICIAL_MEDIC_FACILITIES_ID] : []),
      ...(freedomSelected ? [freedomFightersId] : [])];
    const bundle = depotSelected || medicFacilities ? createOfficialTerranMissionSupplyBundleV2(source, definitionIds)
      : createOfficialTerranFreedomFightersBundleV2(source);
    actionState.officialTerranUniqueFamilySourceBundle = bundle;
    actionState.officialContextualSupplyModifierRoutes = [
      ...(actionState.officialContextualSupplyModifierRoutes || []).filter(route => !bundle.definitionIds.includes(route.definitionId)),
      ...bundle.routes,
    ];
    supplyBindings = createOfficialTerranUniqueFamilyDefinitionBindingsV1(bundle);
    adapters.push(createOfficialTerranUniqueFamilyAdapterV1(bundle));
    executionBindings.push(...supplyBindings);
  }
  let lifecycleBindings = [];
  const summonIds = [...holoIds, ...(summonRoachling ? [OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID] : [])];
  if (summonIds.length) {
    actionState.officialSummonDataBundle = createOfficialSummonDataBundleV2({ context, definitionIds: summonIds });
    actionState.officialSummonedCombatEligibilityPolicy = createOfficialSummonedCombatEligibilityPolicyV1({ context });
    const missionSupplyProfile = createOfficialMissionSupplyProfileV2({
      context, missionRecordKey: actionState.officialMissionSetupBinding?.missionRecordKey,
    });
    if (actionState.officialMissionSupplyProfile
      && actionState.officialMissionSupplyProfile.profileHash !== missionSupplyProfile.profileHash) {
      throw Error('OFFICIAL_RELEASE_ROOM_SUMMON_MISSION_SOURCE_MISMATCH');
    }
    const rulesRuntimeHash = actionState.supplyLossLedger.rulesRuntimeHash;
    const supplyInput = { state: actionState, missionSupplyProfile, rulesRuntimeHash };
    if (actionState.officialMissionSupplyProfile) {
      verifyOfficialRoundSupplyStateV1({ ...supplyInput, roundSupplyState: actionState.officialRoundSupplyState });
    } else {
      actionState.officialMissionSupplyProfile = missionSupplyProfile;
      actionState.officialRoundSupplyState = createOfficialRoundSupplyStateV1(supplyInput);
    }
  }
  const lifecycleIds = [OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID, 'card:daelaam/mass-recall-any@1',
    ...(summonRoachling ? [OFFICIAL_ROACHLING_INFESTATION_DEFINITION_ID] : []),
    ...(pylonProducer ? [OFFICIAL_PYLON_WARP_IN_DEFINITION_ID] : []),
    ...(includeDropship ? [OFFICIAL_DROPSHIP_STRAP_IN_DEFINITION_ID] : [])]
    .filter(id => inheritedSelectedIds.has(id));
  if (includeInheritedReserveAndKhalai && inheritedSelectedIds.has('unit:artanis/phase-prism-movement-phase@1')) {
    lifecycleIds.push('unit:artanis/phase-prism-movement-phase@1');
  }
  if (includeProtossSupport) lifecycleIds.push(...protossStrategicRecalls.filter(id => selected.has(id)));
  lifecycleIds.push(...holoIds);
  if (mound && selected.has(OFFICIAL_DEFILER_TUNNEL_NETWORK_ID)) lifecycleIds.push(OFFICIAL_DEFILER_TUNNEL_NETWORK_ID);
  if (griffinSupport) lifecycleIds.push(OFFICIAL_GRIFFIN_SUPPORT_DEFINITION_ID);
  if (ravenTurret) lifecycleIds.push(OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID);
  if (rapidIngress) {
    lifecycleIds.push(OFFICIAL_RAPID_INGRESS_DEFINITION_ID);
    actionState.officialGeneratedUnitDataBundle = createOfficialGeneratedUnitDataBundleV2({ context,
      recordKeys: [...new Set([...(actionState.officialGeneratedUnitDataBundle?.profiles.map(row => row.recordKey) || []), 'army_units:point_defense_drone'])] });
  }
  if (inheritedSelectedIds.has(OFFICIAL_OMEGA_NETWORK_CARD_DEFINITION_ID)) {
    lifecycleIds.push(OFFICIAL_OMEGA_WORM_NETWORK_DEFINITION_ID);
  }
  const respawnDefinitionIds = [];
  if (includeInheritedRespawn && inheritedSelectedIds.has(OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID)) {
    respawnDefinitionIds.push(OFFICIAL_SWARMLING_RECONSTITUTION_DEFINITION_ID);
  }
  if (vileling && selected.has(OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID)) {
    respawnDefinitionIds.push(OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID);
  }
  if (cocoonMorph) {
    actionState.officialRespawnMorphDataBundle = createOfficialRespawnMorphDataBundleV2({ context, includeMorph: true,
      ...(respawnDefinitionIds.length ? { respawnDefinitionIds } : {}) });
    lifecycleIds.push(OFFICIAL_COCOON_MORPH_DEFINITION_ID, OFFICIAL_COCOON_RESPAWN_DEFINITION_ID, ...respawnDefinitionIds);
  } else if (respawnDefinitionIds.length) {
    const respawnOptions = respawnDefinitionIds.includes(OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID)
      ? { respawnDefinitionIds } : { respawnDefinitionId: respawnDefinitionIds[0] };
    actionState.officialRespawnMorphDataBundle = createOfficialRespawnMorphDataBundleV2({ context, ...respawnOptions });
    lifecycleIds.push(...respawnDefinitionIds);
  }
  if (lifecycleIds.length) {
    const bundle = createOfficialUnitLifecycleFamilySourceBundleV2({ catalogue: source, definitionIds: lifecycleIds });
    actionState.officialUnitLifecycleFamilySourceBundle = bundle;
    lifecycleBindings = createOfficialUnitLifecycleFamilyDefinitionBindingsV1(bundle);
    adapters.push(createOfficialUnitLifecycleFamilyAdapterV1(bundle));
    executionBindings.push(...lifecycleBindings);
  }
  // Mandatory IMPACT is consumed by the melee resolution path, rather than
  // the active ability bundle that supplies temporary Charge modifiers.
  const vilelingImpact = vilelingPrefix + 'devastating-charge-assault-phase@1';
  const devastatingChargeIds = source.definitions.filter(row => (inheritedSelectedIds.has(row.definitionId)
    || additionalImpactIds.has(row.definitionId)
    || includeNovaHolo && row.definitionId === novaChargeId && selected.has(row.definitionId)
    || vileling && row.definitionId === vilelingImpact && selected.has(row.definitionId)
    || includeSiegeTankCoverage && row.definitionId === siegeTankImpactId && selected.has(row.definitionId))
    && row.definitionName === 'Devastating Charge' && row.phase === 'assault'
    && row.activationKind === 'passive').map(row => row.definitionId);
  const zealotImpactBonus = 'unit:zealot/my-life-for-aiur-any-phase@1';
  if (includeProtossSupport && selected.has(zealotImpactBonus)) devastatingChargeIds.push(zealotImpactBonus);
  if (devastatingChargeIds.length) {
    const bundle = createOfficialMeleeFamilySourceBundleV2({ catalogue: source, attackProfileCatalogueV2,
      definitionIds: devastatingChargeIds });
    actionState.officialMeleeFamilySourceBundle = bundle;
    // The selected-roster and characteristic projections share the effect list.
    // New release assemblies consume IMPACT effects from their own families.
    actionState.officialChargeImpactEffectOwnersV1 = true;
    if (devastatingChargeIds.some(id => id === vilelingImpact || id === siegeTankImpactId || id === novaChargeId || additionalImpactIds.has(id))) {
      actionState.officialImpactAllocationPolicy = OFFICIAL_IMPACT_ALLOCATION_POLICY_V13;
    }
    const impact = createOfficialMeleeModifierComponentAdapterV1(bundle);
    adapters.push(impact);
    executionBindings.push(...impact.definitionBindings);
  }

  const template = templateIds.length ? createOfficialBlastTemplateAttackRuntimeV1({ state: actionState,
    coverageRuntime: createOfficialBlastTemplateCoverageRuntimeV1({ state: actionState, unitTargetEligibility: true }),
  }) : null;
  const hits = characteristicIds.includes(shadowStrikeId) ? createOfficialAutomaticHitsRuntimeV1({
    state: actionState, sourceBundle: actionState.officialCharacteristicStatusFamilySourceBundle,
    includeDamageReceivedReaction: damageReactionIds.length > 0,
    includeArmourReactions: plasma,
    includeEvadeEligibility: farsight || broodInstinct,
    includeBeforeEvadeReaction: broodInstinct, consumeDefenceBeforeFollowUp: broodInstinct,
    independentlyOwnedReactionTriggers: [...(might ? ['hidden_lost'] : []), ...(headShot ? ['ranged_attack_declared'] : []),
      ...(restorationIds.length ? ['debuff_received'] : []),
      ...(vision || zergTargetIds.length || broodInstinct && declarationReactionIds.length ? ['attack_target_selected'] : []),
      ...(broodInstinct && lungeIds.length ? ['after_ranged_attack_resolved'] : [])],
  }) : null;
  const hitsAdapter = hits && createOfficialAutomaticHitsContinuationAdapterV1({
    hits, pool: createOfficialAutomaticHitsPoolChoiceRuntimeV1({ delegate: hits,
      ...(broodInstinct ? { includeBeforeEvadeReaction: true,
        reactionAdapter: createOfficialReactionFamilyAdapterV1(reactionBundle), reactionBundle } : {}) }),
  });
  if (hitsAdapter) adapters.push(hitsAdapter);
  const ranged = createOfficialSelectedRosterRangedActionRuntimeV1(actionState);
  const melee = createOfficialSelectedRosterMeleeActionRuntimeV1(actionState, {
    includeDamageReceivedReaction: damageReactionIds.length > 0,
  });
  const feedback = feedbackIds.length ? createOfficialFeedbackCompletionV1({
    context, bundle: actionState.officialCharacteristicStatusFamilySourceBundle, catalogue: source, state: actionState,
  }) : null;
  const reactionAdapter = reactionBundle && createOfficialReactionFamilyAdapterV1(reactionBundle, {
    afterApply(before, resolved, action, options) {
      const transition = feedback ? feedback.afterReaction(before, resolved, action) : resolved;
      if (template?.ownsDamageReactionWindow(before)) {
        const resumed = template.resumeDamageReaction(transition, options);
        return { ...transition, state: resumed.state, events: resumed.events };
      }
      const state = { ...transition.state };
      const window = state.pendingOfficialReactionWindow;
      if (window) {
        state.activeSideKey = window.prioritySideKeys[window.priorityIndex];
        return { ...transition, state };
      }
      if (hits?.ownsDamageReactionWindow?.(before)) {
        state.activeSideKey = before.pendingOfficialReactionWindow.activeSideKey;
        const resumed = hits.resumeDamageReaction(state, options);
        return { ...transition, state: resumed.state, events: [...transition.events, ...resumed.events] };
      }
      const rangedParent = state.pendingCurrentProductRangedDamageReaction;
      const meleeParent = state.pendingOfficialMeleeDamageReaction;
      if (rangedParent && meleeParent) throw Error('OFFICIAL_RELEASE_DAMAGE_REACTION_PARENT_CONFLICT');
      const resumed = rangedParent ? resumeOfficialSelectedRosterRangedDamageReactionV1(state, options)
        : meleeParent ? melee.resumeDamageReaction(state, options) : null;
      if (resumed) return { ...transition, state: resumed.state, events: [...transition.events, ...resumed.events] };
      const prior = before.pendingOfficialReactionWindow;
      state.activeSideKey = prior.resumeActiveSideKey ?? prior.activeSideKey;
      if (prior.triggerKind !== 'debuff_received') return { ...transition, state };
      const consumed = consumeOfficialReactionFamilyResolutionV1(state, prior.triggerHash);
      return { ...transition, state: consumed.state };
    },
  });
  if (reactionAdapter) {
    adapters.push(reactionAdapter);
    executionBindings.push(...createOfficialReactionFamilyDefinitionBindingsV1(reactionBundle));
  }
  const rangedIds = [];
  const meleeIds = [];
  let intrinsicEffectWeaponCount = 0;
  for (const { definitionId, profile } of weaponCandidates) {
    if (profile.phase === 'assault' && ranged.supportsProfile(profile.profileKey)) rangedIds.push(definitionId);
    else if (profile.phase === 'combat' && melee.supportsProfile(profile.profileKey)) meleeIds.push(definitionId);
    else continue;
    if (profile.effects.length) intrinsicEffectWeaponCount++;
  }
  const provenSelectedAbilityIds = new Set(identityCatalogue.aliases
    .filter(row => row.sourceSnapshotHash === legacySourceSnapshotHash
      && reusableSelectedAbilityIds.has(row.definitionId))
    .map(row => row.definitionId));
  if (provenSelectedAbilityIds.has(commanderReferenceId)) {
    const identitiesById = new Map(identityCatalogue.definitions.map(row => [row.definitionId, row]));
    const reference = identitiesById.get(commanderReferenceId);
    for (const id of equivalentCommanderIds) {
      if (reference && identitiesById.get(id)?.behaviorHash === reference.behaviorHash) {
        provenSelectedAbilityIds.add(id);
      }
    }
  }
  if (includeNovaModes) {
    for (const mode of ['stealth', 'assault']) {
      const id = 'unit:nova_' + mode + '_mode/battle-preparation-any-phase@1';
      if (selected.has(id)) provenSelectedAbilityIds.add(id);
    }
  }
  for (const [enabled, faction] of [[includeZergSwarmBurrow, 'zerg_swarm'], [includeZagaraCreep, 'zagara_s_swarm']]) {
    const id = 'card:' + faction + '/zerg-creep-any@1';
    if (!enabled || !selected.has(id)) continue;
    const creepBuild = source.definitions.find(row => row.definitionId === id);
    if (creepBuild?.sourceText !== 'Zerg Creep <Passive> <Any Phase>: During Army Building, select exactly one Creep Card and add it to their Army List, paying its listed cost (if any).'
      || creepBuild.recordKey !== 'tactical_cards:' + faction || creepBuild.sourceKind !== 'card_feature'
      || creepBuild.activationKind !== 'passive' || creepBuild.phase !== 'any') {
      throw Error('OFFICIAL_ZERG_SWARM_CREEP_BUILD_SOURCE_MISMATCH');
    }
    provenSelectedAbilityIds.add(creepBuild.definitionId);
  }
  const definitionIdsBySourceHash = new Map(inventory.definitions
    .filter(row => provenSelectedAbilityIds.has(row.definitionId))
    .map(row => [row.sourceFeatureHash, row.definitionId]));
  const selectedAbilityBundle = createOfficialSelectedRosterAbilitySourceBundleV1({
    dataset, state: actionState, definitionIdsBySourceHash, projectOmegaWormSize: omegaWormDetector,
  });
  const selectedBindings = createOfficialSelectedRosterAbilityDefinitionBindingsV1(selectedAbilityBundle);
  executionBindings.push(...selectedBindings);
  // Native finish/cleanup uses this verified bundle even when every selected ability belongs to another adapter.
  if (bindEmptyActivationSource || selectedBindings.length || gestate || actionState.officialCharacteristicConsumerPolicy?.burrowedCombatCloseRanks === true) {
    actionState.officialSelectedRosterAbilitySourceBundle = selectedAbilityBundle;
    if (selectedAbilityBundle.routes.some(route => route.definitionId === OFFICIAL_OMEGA_NETWORK_CARD_DEFINITION_ID)) {
      actionState.officialSingletonSummonIdentityPolicy = OFFICIAL_SINGLETON_SUMMON_IDENTITY_POLICY_V1;
    }
    actionState.officialSelectedRosterAbilityRuntimeDescriptor =
      createOfficialSelectedRosterAbilityRuntimeV1(actionState).descriptor;
    adapters.push(createOfficialSelectedRosterAbilityAdapterV1(selectedAbilityBundle));
  }
  if (reportEffectiveAbilityRange && selected.has('unit:medic/a-13-flash-grenade-launcher-any-phase@1')) {
    actionState.officialEffectiveAbilityRangeDisclosure = true;
  }
  const targetedIds = selectOfficialBoundTargetedActiveDefinitionIdsV1(actionState);
  if (targetedIds.length) {
    actionState.officialTargetedActiveAbilityPolicy = createOfficialTargetedActiveAbilityPolicyV1({ context, definitionIds: targetedIds });
  }
  let creepDisplacement = null;
  const nativeCreep = (selectedAssetIds.includes('card:accelerating_creep/living-glob-of-tissue-any@1')
    || selectedAssetIds.includes('card:reactive_creep/living-glob-of-tissue-any@1')
    || selectedAssetIds.includes('card:malignant_creep/living-glob-of-tissue-any@1'))
    && (lifecycleIds.includes(OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID) || actionState.officialBattlefieldAssetFamilySourceBundle?.routes.some(route => route.effectKind === 'creep_token_place'));
  const tunnel = includeRavagerTunnel && (cocoonMorph || selected.has('unit:ravager/deep-tunnel-movement-phase@1'));
  const shade = includeNerazimNative && selected.has('unit:nerazim_watchers__adept_/psionic-transfer-movement-phase@1');
  if (shade && !selected.has('unit:nerazim_watchers__adept_/nerazim-farsight-any-phase@1')) {
    throw Error('OFFICIAL_RELEASE_WATCHERS_SHADE_FARSIGHT_SOURCE_REQUIRED');
  }
  const adeptTransfer = includeAdept && selected.has('unit:adept/psionic-transfer-movement-phase@1');
  if (tunnel || shade || adeptTransfer) {
    const transfer = tunnel || adeptTransfer
      ? createOfficialTokenLeadingTransferSourceV2({ catalogue: source, includePsionicTransfer: shade, includeAdept: adeptTransfer, includeDeepTunnel: tunnel })
      : createOfficialPsionicTransferSourceV1({ catalogue: source });
    actionState.officialPsionicTransferSourceBundle = transfer;
    actionState.officialBattlefieldAssetComponentProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
    actionState.officialPsionicSourceLifecyclePolicy = createOfficialPsionicSourceLifecyclePolicyV1({ context, includeDeepTunnel: tunnel });
    const afterPlace = actionState.officialReactionFamilySourceBundle?.routes.some(route => route.triggerKind === 'after_place') === true;
    actionState.officialPsionicTransferRoundEndPolicy = createOfficialPsionicTransferRoundEndPolicyV1({ context, source: transfer,
      sharedRoundEnd: true, includePostPlaceReactions: afterPlace, includeOutsideActivationReactions: afterPlace });
    const producer = createOfficialPsionicTransferRuntimeV1({ context, source: transfer, state: actionState,
      roundEndConsumerReady: true, displacementConsumerReady: true, closeRanksConsumerReady: true });
    adapters.push(producer);
    executionBindings.push(...producer.definitionBindings);
  }
  if (gestate || tunnel || shade || adeptTransfer || bombard || (nativeCreep && includeCreepMovementQueries)) {
    const source = createOfficialBattlefieldDisplacementSourceV1({ state: actionState, includeNativeCreep: nativeCreep });
    actionState.officialBattlefieldDisplacementSourceBundle = source;
    actionState.officialBattlefieldDisplacementQueryPolicy = createOfficialBattlefieldDisplacementQueryPolicyV1({ context, source });
    actionState.officialBattlefieldDisplacementPolicy = createOfficialBattlefieldDisplacementPolicyV1({ context, source,
      includeMovementQueries: true, includeCloseRanks: true, includeCloseRanksReactions: might });
  } else if (nativeCreep) {
    const source = createOfficialBattlefieldDisplacementSourceV1({ state: actionState, includeNativeCreep: true });
    actionState.officialBattlefieldDisplacementSourceBundle = source;
    actionState.officialBattlefieldDisplacementPolicy = createOfficialBattlefieldDisplacementPolicyV1({ context, source });
    actionState.officialBattlefieldDisplacementQueryPolicy = createOfficialBattlefieldDisplacementQueryPolicyV1({ context, source });
    const producer = createOfficialBattlefieldDisplacementProducerV1({ state: actionState, source });
    const queryPort = createOfficialPsionicDisplacementQueryV1({ context, source, producer, spatial, state: actionState,
      executionConsumerReady: true });
    const runtime = createOfficialPsionicDisplacementRuntimeV1({ context, source, producer, queryPort, state: actionState,
      applyOriginal(current, kind, action, options) {
        if (kind !== 'spatial') throw Error('OFFICIAL_RELEASE_CREEP_DISPLACEMENT_MOVEMENT_KIND_UNSUPPORTED');
        return spatial.apply(current, action, options);
      } });
    const spatialActions = createOfficialCreepDisplacementSpatialActions({ producer, runtime, spatial });
    creepDisplacement = Object.freeze({ producer, queryPort, spatialActions });
  }
  let templateContinuationAdapterId;
  if (rangedIds.length || meleeIds.length || templateIds.length) {
    const bundle = rangedIds.length || templateIds.length ? createOfficialRangedFamilySourceBundleV2({
      catalogue: source, attackProfileCatalogue, definitionIds: [...rangedIds, ...templateIds],
    }) : null;
    const meleeBundle = meleeIds.length ? createOfficialMeleeFamilySourceBundleV2({
      catalogue: source, attackProfileCatalogueV2, definitionIds: meleeIds,
    }) : null;
    if (meleeBundle && (useEquippedWeapons || summonRoachling && meleeBundle.definitionIds.includes(roachlingClawsId))) {
      actionState.officialMeleeWeaponSourceBundle = meleeBundle;
    }
    const weapons = createOfficialRosterWeaponComponentAdapterV1({
      bundle, meleeBundle, delegates: { ranged, melee, template }, includeRangedContinuations: true,
      includeMeleeContinuations: damageReactionIds.length > 0, includeTemplateContinuations: Boolean(template),
    });
    executionBindings.push(...weapons.definitionBindings);
    adapters.push(weapons);
    if (template) templateContinuationAdapterId = weapons.descriptor.adapterId;
  }
  let composedNative;
  const khassarSelected = selected.has(OFFICIAL_KHASSAR_DE_TEMPLARI_ID);
  const stormIds = includeReleaseStorm ? OFFICIAL_PSIONIC_STORM_DEFINITION_IDS.filter(id => selected.has(id)) : [];
  if (personalTransport) actionState.officialPersonalTransportSourceBundle = createOfficialPersonalTransportSourceV1({ context });
  const inspectSelectedNative = adeptTransfer || immortal || includeNerazimNative && (personalTransport || anakh || shade || selected.has(shadowStrikeId) || nerazimReactions.length || supportActives.length);
  if (composeSelectedNative && (khassarSelected || stormIds.length || inspectSelectedNative)) {
    if (stormIds.length && !actionState.officialCleanupContinuationPolicy) {
      actionState.officialCleanupContinuationPolicy = createOfficialCleanupContinuationPolicyV1({ context });
    }
    if ((khassarSelected || stormIds.length) && !actionState.officialNonLethalStandardDamagePolicy) bindNonLethalDamage(actionState, context);
    const weaponIds = new Set([...rangedIds, ...templateIds]);
    const weaponDefinitionIds = source.definitions.filter(row => weaponIds.has(row.definitionId)
      && row.phase === 'assault' && row.activationKind === 'weapon').map(row => row.definitionId);
    composedNative = composeSelectedNative(actionState, weaponDefinitionIds, { khassar: khassarSelected, stormIds });
    for (const adapter of [personalTransport && composedNative.nativeActions.personalTransport, khassarSelected && composedNative.nativeActions.registeredKhassar,
      stormIds.length > 0 && composedNative.nativeActions.registeredStorm].filter(Boolean)) {
      adapters.push(adapter);
      executionBindings.push(...adapter.definitionBindings);
    }
  }
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ ...sourceInput, executionBindings });
  const runtime = createOfficialAbilityEffectRuntimeV1({ catalogue, adapters,
    reactionWindowAdapterId: reactionAdapter?.descriptor.adapterId, templateContinuationAdapterId,
    automaticHitsContinuationAdapterId: hitsAdapter?.descriptor.adapterId });
  const coverage = createOfficialSelectedRosterAbilityCoverageV2({ ...coverageInput, catalogue });

  if (inspectSelectedNative && composedNative) {
    const native = new Set(composedNative.nativeActions.catalogue.definitions
      .filter(row => row.execution.status === 'executable_exact').map(row => row.definitionId));
    for (const row of coverage.definitions) {
      if (row.registrationStatus === 'executable_exact' && !native.has(row.definitionId)) {
        throw Error('OFFICIAL_RELEASE_NATIVE_DEFINITION_BINDING_REQUIRED:' + row.definitionId);
      }
    }
  }
  return { state: actionState, source, catalogue, runtime, coverage, selectedAbilityBundle, creepDisplacement, composedNative,
    registeredActiveCount: [...selectedBindings, ...assetBindings, ...lifecycleBindings, ...supplyBindings]
      .filter(binding => binding.capability === 'authoritative_action').length,
    registeredPassiveCount: registeredRangedModifierCount + devastatingChargeIds.length
      + [...selectedBindings, ...assetBindings, ...supplyBindings].filter(binding => binding.capability === 'automatic_consumer').length,
    intrinsicEffectWeaponCount,
    rangedWeaponCount: rangedIds.length, meleeWeaponCount: meleeIds.length };
}

function releaseRoomAbilityAdmissionError(context, assembly, code) {
  const { source, runtime, coverage, registeredActiveCount, registeredPassiveCount, intrinsicEffectWeaponCount,
    rangedWeaponCount, meleeWeaponCount } = assembly;
  const pendingSelectedDefinitionIds = coverage.definitions
    .filter(row => row.registrationStatus !== 'executable_exact').map(row => row.definitionId);
  const error = Error(code);
  error.code = code;
  error.detail = {
    releaseId: context.manifest.releaseId, sourceCatalogueHash: source.catalogueHash,
    releaseDefinitionCount: source.definitions.length, runtimeHash: runtime.descriptor.runtimeHash,
    registeredNumericWeaponCount: rangedWeaponCount + meleeWeaponCount, registeredActiveCount, registeredPassiveCount,
    rangedWeaponCount, meleeWeaponCount, intrinsicEffectWeaponCount,
    selectedDefinitionCount: coverage.definitions.length,
    pendingSelectedDefinitionCount: pendingSelectedDefinitionIds.length,
    pendingSelectedDefinitionIds,
  };
  throw error;
}

export function prepareOfficialReleaseRoomAbilityAssemblyV2(input) {
  const assembly = createOfficialReleaseRoomAbilityRuntimeV2(input);
  if (assembly.coverage.pendingDefinitionCount) {
    releaseRoomAbilityAdmissionError(input.context, assembly, 'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING');
  }
  return assembly;
}

export function requireOfficialReleaseRoomAbilityRuntimeV2({ context, state }) {
  const assembly = prepareOfficialReleaseRoomAbilityAssemblyV2({ context, state, useEquippedWeapons: true,
    includeInheritedMovementCards: true, includeInheritedCharacteristics: true, includeInheritedMissionSupply: true,
    includeInheritedRangedHitDebuff: true, includeInheritedRespawn: true, includeInheritedVentralSacs: true,
    includeWarpPrism: true, includeZealotCharge: true, includeDropship: true, includeKhalai: true });
  // Opening components require the complete Match, including lifecycle
  // successors and reconstruction against the bound release.
  releaseRoomAbilityAdmissionError(context, assembly, 'OFFICIAL_RELEASE_ROOM_FULL_RUNTIME_REQUIRED');
}
