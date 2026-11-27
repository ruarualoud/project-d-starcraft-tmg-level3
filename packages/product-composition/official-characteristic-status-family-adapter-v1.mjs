import { compileOfficialUniversalCarrierSpecV1 } from '../source-data/official-universal-carrier-source-v1.mjs';
import {compileOfficialStukovInfestationSpecV1} from '../source-data/official-stukov-infestation-source-v1.mjs';
import {compileOfficialInfestedInfantrySpecV1} from '../source-data/official-infested-infantry-source-v1.mjs';
import {inspectOfficialUnitCreepProximityV1} from './official-current-product-state-facts-v1.mjs';
import {resolveOfficialInfestationActivationExchangeV1} from '../rule-atoms/official-infestation-activation-exchange-v1.mjs';
import { compileOfficialInfestationRestrictionSpecV1 } from '../rule-atoms/official-infestation-restrictions-v1.mjs';
import { allowsOfficialSpawnRoundSpecialAbilityV1 } from '../rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import { projectOfficialDeploymentSupplyV1 } from '../rule-atoms/official-deployment-supply-projection-v1.mjs';
import { listOfficialExhaustedTacticalCardIdsV1 } from './official-ranged-card-refresh-runtime-v1.mjs';
import { listOfficialPhaseActivationUnitIdsV1 } from '../rule-atoms/official-phase-activation-availability-v1.mjs';
import { OFFICIAL_KHALAS_GIFT_DEFINITION_ID, grantOfficialKhalasGiftV1, expireOfficialKhalasGiftV1 } from './official-khalas-gift-v1.mjs';
import { quoteOfficialUnitAbilityModifiersV1, consumeOfficialUnitAbilityModifiersV1 } from './official-unit-ability-payment-modifiers-v1.mjs';
import { OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID, expireOfficialOurMindsFirstAbilityV1 } from './official-our-minds-as-one-v1.mjs';
import { canOfficialUnitBeAbilityTargetV1 } from '../rule-atoms/official-decoy-rules-v1.mjs';
import { allowsOfficialAbilityUnitRecipientV13 } from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import { OFFICIAL_FEEDBACK_DEFINITION_IDS, OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID, OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID }
  from './official-targeted-active-ability-policy-v1.mjs';
import { OFFICIAL_RAVEN_SEEKER_MISSILE_SOURCE_TEXT } from './official-raven-seeker-missile-v1.mjs';
import { OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID } from './official-unit-lifecycle-family-adapter-v1.mjs';
import { OFFICIAL_EXECUTORS_WILL_DEFINITION_ID, markOfficialExecutorsWillTargetsV1, expireOfficialExecutorsWillV1 } from './official-executors-will-v1.mjs';
import { OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_FORCE_WALL_TOKEN_COUNT, OFFICIAL_PSI_LIGHTNING_DEFINITION_ID, OFFICIAL_TELEKINETIC_PUSH_DEFINITION_ID,
  applyOfficialForceWallPairV1, applyOfficialForceWallPushV1, expireOfficialForceWallsV1,
  getOfficialForceWallFootprintV1, inspectOfficialPsiLightningCoverageV1, prepareOfficialForceWallPairV1, prepareOfficialForceWallPushV1,
  readOfficialFriendlyForceWallsV1 }
  from './official-force-wall-v1.mjs';
import { projectOfficialUnitRestrictionsV1 } from '../rule-atoms/official-unit-restrictions-v1.mjs';
import { isDeepStrictEqual } from "node:util";
import { inspectOfficialLargeMovementSourceV1 } from '../rule-atoms/official-movement-clearance-contract-v13.mjs';
import { evaluateOfficialElevatedLineOfSightV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { inspectOfficialPotentBileArmourPenaltyV1 } from './official-corrosive-bile-upgrades-v1.mjs';
import { inspectOfficialArmourRollOrdinalsV1 } from "../rule-atoms/official-armour-roll-ordinal-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "../rule-atoms/official-engagement-graph-v2.mjs";
import { projectOfficialChargeSpeedDebuffV1 } from '../rule-atoms/official-charge-speed-debuff-policy-v1.mjs';
import { currentOfficialSelectedRosterRangedSequenceV1 } from './official-ranged-sequence-state-v1.mjs';

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import { evaluateOfficialBaseMeasurementV1, evaluateOfficialWithinWhollyWithinV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { getOfficialUnitCardInspectionProfileV1 } from
  "../source-data/official-roster-disclosure-data-bundle-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import { resolveOfficialBattlefieldAssetAbilityResourceCostV1 } from
  "./official-battlefield-asset-family-adapter-v1.mjs";
import { quoteOfficialSelectedUnitPsionicLinkV1 } from "./official-match-lifecycle-family-adapter-v1.mjs";
import { projectOfficialRangedFamilyModifiersV1 } from
  "./official-ranged-family-projection-v1.mjs";
import { createOfficialMarineStimpackKernelV1 } from
  "../rule-atoms/official-marine-stimpack-kernel-v1.mjs";
import { hasOfficialNonLethalDamagePolicyV1 } from
  "../rule-atoms/official-non-lethal-damage-policy-v1.mjs";
import { inspectOfficialCharacteristicAreaPlacementV1, applyOfficialCharacteristicAreaEffectV1,
  projectOfficialCharacteristicAreaEffectsV1, cleanupOfficialCharacteristicAreaEffectsV1 }
  from './official-characteristic-area-effect-v1.mjs';

export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID =
  "official-characteristic-status-family-adapter-v1";
export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION = "1.1.0";
export const OFFICIAL_RAVEN_CORVID_REACTOR_DEFINITION_ID = 'unit:raven/corvid-reactor-any-phase@1';
export const OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID = 'unit:raven/explosive-shrapnel-shells-assault-phase@1';
export const OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13 = Object.freeze({
  entry: 'faq-v1.3:79', byteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
});
export const OFFICIAL_RAVEN_INTERNAL_TECH_MODULE_DEFINITION_ID = 'unit:raven/internal-tech-module-movement-phase@1';
export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_characteristic_status_family_source_bundle_v1";
export const OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_PARAMETER_KIND =
  "official_characteristic_status_family_plan_v1";
export const OFFICIAL_FIRST_GAME_WEAPON_USE_ATOM_ID =
  'rule-atom:source-bound-first-weapon-attack-per-game-v1';

export const OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_characteristic_consumer_policy_v1', version: '1.0.0',
  movementSpeed: true, meleeCriticalHit: true, trainingTruth: false,
});
export const OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V2 = Object.freeze({
  ...OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V1, version: '1.1.0',
  cleanupHiddenLossBeforeRefresh: true,
});
export const OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3 = Object.freeze({
  ...OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V2, version: '1.2.0',
  hiddenRangedTargeting: true, hiddenEvadeEligibility: true,
});
export const OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V4 = Object.freeze({
  ...OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3, version: "1.3.0", burrowedCoreActions: true,
});
export const OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V5 = Object.freeze({
  ...OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V4, version: "1.4.0", burrowedBaseTransit: true,
});
export const OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V6 = Object.freeze({
  ...OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V5, version: "1.5.0", burrowedCombatCloseRanks: true,
});
export const OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_detection_hidden_loss_policy_v1', version: '1.0.0',
  sourceEffectKind: 'detection_aura', eventType: 'detection_hidden_lost',
  removeActualStatusAfterTransition: true, restoreOnLeavingAura: false,
  trainingTruth: false,
});
export function hasOfficialDetectionHiddenLossPolicyV1(state) {
  if (state?.officialDetectionHiddenLossPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialDetectionHiddenLossPolicy, OFFICIAL_DETECTION_HIDDEN_LOSS_POLICY_V1)) {
    fail('DETECTION_HIDDEN_LOSS_POLICY_INVALID');
  }
  return true;
}
export function hasOfficialHiddenRangedAndEvadePolicyV1(state) {
  return hasOfficialCharacteristicConsumerPolicyV1(state)
    && state.officialCharacteristicConsumerPolicy.hiddenRangedTargeting === true;
}
export function hasOfficialCharacteristicConsumerPolicyV1(state) {
  if (state?.officialCharacteristicConsumerPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialCharacteristicConsumerPolicy, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V1)
    && !isDeepStrictEqual(state.officialCharacteristicConsumerPolicy, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V2)
    && !isDeepStrictEqual(state.officialCharacteristicConsumerPolicy, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V3)
    && !isDeepStrictEqual(state.officialCharacteristicConsumerPolicy, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V4)
    && !isDeepStrictEqual(state.officialCharacteristicConsumerPolicy, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V5)
    && !isDeepStrictEqual(state.officialCharacteristicConsumerPolicy, OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V6)) {
    fail('CHARACTERISTIC_CONSUMER_POLICY_INVALID');
  }
  return true;
}

export function resolveOfficialMovementSpeedV1(printedSpeedInches, modifierSources) {
  // Named BUFF SPEED sources use their highest value. Separate printed
  // increases to the Speed characteristic add to that buff.
  const separateSpeedIncreases = modifierSources.some(source => source.speedCharacteristicIncrease !== undefined);
  const bonus = separateSpeedIncreases
    ? modifierSources.reduce((sum, source) => sum + Number(source.speedCharacteristicIncrease ?? source.onCreepSpeed ?? 0), 0)
      + Math.max(0, ...modifierSources.map(source => Number(source.speedBuff ?? source.speedModifier ?? 0)))
    : Math.max(0, ...modifierSources.map(source => Number(source.speedModifier || 0)));
  const penalty = Math.max(0, ...modifierSources.map(source => Number(source.speedPenalty || 0)));
  return Math.max(0, printedSpeedInches + bonus - penalty);
}

import { listOfficialCoordinatedStrikeOriginsV1, replaceOfficialCoordinatedStrikeEffectV1, hasOfficialCoordinatedStrikeCurrentConsumerV1 }
  from '../rule-atoms/official-coordinated-strike-policy-v1.mjs';

const SIDE_KEYS = new Set(["player1", "player2"]);
const STIMPACK_DAMAGE = createOfficialMarineStimpackKernelV1();
const QUERY_EFFECTS = new Set([
  'unit_restrictions',
  'first_game_weapon_pierce',
  'hidden_after_action',
  'ranged_card_refresh',
  "cannot_gain_burrowed", "charge_roll_advantage", "coherency_projection", "raptor_terrain_permission",
  "detection_aura", "evade_eligibility", "first_armour_tough",
  "hit_points_modifier", "indomitable", "passive_weapon_keyword",
  'target_near_source_weapon_keyword',
  'ranged_engaged_target_prohibition',
  "target_size_damage", "conditional_tough",
  "passive_weapon_surge", "slugthrower", "titan_killers", "we_stand_as_one",
]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  burrow_toggle: 3,
  cannot_gain_burrowed: 1,
  charge_roll_advantage: 5,
  coherency_projection: 5,
  detection_aura: 1,
  evade_eligibility: 1,
  first_armour_tough: 2,
  first_weapon_keyword: 11,
  fixed_heal: 1,
  grant_burrowed: 2,
  guardian_shield: 1,
  hidden_until_action: 1,
  hit_points_modifier: 1,
  impact_hit_modifier: 2,
  indomitable: 1,
  lose_burrowed: 1,
  medpack: 1,
  optical_flare: 1,
  passive_weapon_keyword: 4,
  passive_weapon_surge: 3,
  regeneration: 3,
  slugthrower: 2,
  speed_buff: 1,
  stimpack: 2,
  target_lock: 1,
  titan_killers: 1,
  we_stand_as_one: 1,
  weapon_characteristic_buff: 1,
});

import { bindGrantedWeapon, matchesGrantedWeapon, usesWave3FaqClarifications } from '../rule-atoms/official-wave3-faq-clarifications-v1.mjs';

const DEFAULT_ACTIVE_ABILITY_USE_TIMING = Object.freeze([
  "before_action", "after_action",
]);
const BEFORE_ACTION_ONLY_EFFECT_KINDS = new Set([
  "charge_roll_advantage",
]);
const BROODMOTHER_EFFECTS = Object.freeze({
  impact: Object.freeze({ minimumSize: 1, maximumSize: 1, impactHitModifier: 1 }),
  critical_hit: Object.freeze({ minimumSize: 2, maximumSize: 2, criticalHit: 1 }),
  tough: Object.freeze({ minimumSize: 3, maximumSize: null, tough: 1 }),
});

export function officialCharacteristicStatusUseTimingV1(effectKind) {
  return BEFORE_ACTION_ONLY_EFFECT_KINDS.has(String(effectKind || ""))
    ? Object.freeze(["before_action"])
    : DEFAULT_ACTIVE_ABILITY_USE_TIMING;
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function statusName(value) {
  return normalized(typeof value === "string" ? value
    : value?.statusName || value?.name || value?.statusKind);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && model?.isOnField !== false);
}
function tags(piece) {
  return new Set((piece?.combatTags || []).map(normalized));
}
function hasStatus(piece, name) {
  return (piece?.statuses || []).some((entry) => statusName(entry) === normalized(name));
}
function otherSide(sideKey) {
  return sideKey === "player1" ? "player2" : "player1";
}
function raceForPiece(state, piece) {
  const value = normalized(state.players?.[piece.sideKey]?.faction || "");
  if (value.includes("zerg") || value.includes("kerrigan")) return "zerg";
  if (value.includes("protoss") || value.includes("daelaam")) return "protoss";
  if (value.includes("terran") || value.includes("raynor")) return "terran";
  return "unknown";
}
function fieldedFeature(piece, route) {
  const selected = new Set((piece.selectedUpgradeNames || []).map(normalized));
  const equipment = new Set((piece.equipment || []).map((entry) => normalized(
    entry.equipmentName || entry.name)).filter(Boolean));
  const cost = piece.compositionKind === "large"
    ? Number(route.costByComposition?.large || 0)
    : Number(route.costByComposition?.small || 0);
  return cost === 0 || selected.has(normalized(route.abilityName))
    || equipment.has(normalized(route.abilityName));
}
function resourceSpec(definition) {
  if (definition.sourceKind === "card_feature") {
    return { resourceType: null, resourceCost: 0 };
  }
  const match = String(definition.activationText || "").match(
    /\((\d+)\s+(Command Point|Biomass|Psionic Energy)\)/iu);
  if (!match) return { resourceType: null, resourceCost: 0 };
  const resourceType = normalized(match[2]) === "command point" ? "CP"
    : normalized(match[2]) === "biomass" ? "BM" : "Energy";
  return { resourceType, resourceCost: Number(match[1]) };
}
function baseSpec(definition, spec) {
  return {
    schema: "starcraft_tmg_official_characteristic_status_definition_route_v1",
    semanticVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    definitionId: definition.definitionId,
    sourceFeatureHash: definition.sourceFeatureHash,
    recordKey: definition.recordKey,
    sourceKind: definition.sourceKind,
    sourceProductKind: definition.sourceProductKind,
    sourceName: definition.sourceName,
    abilityName: definition.definitionName,
    activationKind: definition.activationKind,
    runtimeRole: definition.runtimeRole,
    phase: definition.phase,
    timingHooks: [...definition.timingHooks],
    activationText: definition.activationText,
    costByComposition: definition.costByComposition
      ? { ...definition.costByComposition } : null,
    sourceText: definition.sourceText,
    ...resourceSpec(definition),
    ...spec,
    exactSourcePatternCompiled: true,
    arbitraryProseExecutionClaimed: false,
    trainingTruth: false,
  };
}
function weaponKeyword(effectKind, weaponScope, keyword, value, extra = {}) {
  return { effectKind, actionKind: effectKind === "first_weapon_keyword"
    ? "active_ability" : "query_modifier", weaponScope, keyword, value, ...extra };
}

function compileRoute(definition, { explicitRelease = false } = {}) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  const restrictionSpec = compileOfficialInfestationRestrictionSpecV1(definition) || compileOfficialUniversalCarrierSpecV1(definition)
    || compileOfficialStukovInfestationSpecV1(definition) || compileOfficialInfestedInfantrySpecV1(definition);
  if (restrictionSpec) return seal(baseSpec(definition, restrictionSpec), 'routeHash');
  let spec = null;
  if (definition.definitionId === OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID
    && definition.recordKey === 'army_units:raven' && name === 'Anti-Armour Missile'
    && definition.sourceKind === 'unit_feature' && definition.activationKind === 'active'
    && definition.phase === 'movement' && definition.activationText === '<Active>\n(1 Command Point)'
    && text === 'Select one Enemy Unit Within 12". Apply DEBUFF Armour (1).') {
    spec = { effectKind: 'raven_anti_armour_missile', actionKind: 'active_ability',
      targetKind: 'visible_enemy_within', rangeMilliInches: 12000, armourPenalty: 1,
      expiresAt: 'cleanup_and_refresh' };
  } else if (definition.definitionId === OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID
    && definition.recordKey === 'army_units:raven' && name === 'Seeker Missile'
    && definition.sourceKind === 'unit_feature' && definition.activationKind === 'active'
    && definition.phase === 'movement' && definition.activationText === '<Active>\n(1 Command Point)'
    && text === OFFICIAL_RAVEN_SEEKER_MISSILE_SOURCE_TEXT) {
    spec = { effectKind: 'raven_seeker_missile', actionKind: 'active_ability',
      targetKind: 'visible_enemy_within', rangeMilliInches: 12000 };
  } else if (definition.definitionId === OFFICIAL_RAVEN_CORVID_REACTOR_DEFINITION_ID
    && definition.recordKey === 'army_units:raven' && name === 'Corvid Reactor'
    && definition.sourceKind === 'unit_feature' && definition.activationKind === 'passive' && definition.phase === 'any'
    && text === 'This Unit may resolve its first Special Ability with the CP cost reduced by 1 if it targets the closest Enemy Unit.') {
    spec = { effectKind: 'raven_corvid_reactor', actionKind: 'query_modifier', commandPointReduction: 1 };
  } else if (definition.definitionId === OFFICIAL_RAVEN_INTERNAL_TECH_MODULE_DEFINITION_ID
    && definition.recordKey === 'army_units:raven' && name === 'Internal Tech Module'
    && definition.sourceKind === 'unit_feature' && definition.activationKind === 'passive' && definition.phase === 'movement'
    && text === 'When this Unit is nominated to deploy from Reserves, it may Deploy from any table edge that is not a player\'s Entry Edge. This Unit cannot be set Within 8" of any Enemy model.') {
    spec = { effectKind: 'raven_neutral_reserve_entry', actionKind: 'query_modifier',
      enemyExclusionRangeMilliInches: 8000 };
  } else if (definition.definitionId === OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID
    && definition.recordKey === 'army_units:raven' && name === 'Explosive Shrapnel Shells'
    && definition.sourceKind === 'unit_feature' && definition.activationKind === 'passive' && definition.phase === 'assault'
    && text === 'The Gauss Cannon of the Auto-Turret set by this Unit gains Surge Type: Light and S-Dice: D3+1.') {
    spec = { effectKind: 'raven_turret_shrapnel', actionKind: 'query_modifier',
      weaponScope: ['gauss cannon'], surgeTypes: ['light'], surgeDice: 'D3+1' };
  } else if (definition.definitionId === 'card:templar_caste/our-duty-is-unending-any@1'
    && definition.recordKey === 'tactical_cards:templar_caste' && definition.sourceKind === 'card_feature'
    && definition.activationKind === 'active' && definition.phase === 'any'
    && text === 'Our Duty is Unending <Active> <Any Phase>: Once per Game. Select up to two of your Exhausted Tactical Cards. Return them to the Ready state.') {
    spec = { effectKind: 'our_duty_is_unending', actionKind: 'active_ability', maxRefreshedCards: 2 };
  } else if (definition.definitionId === 'card:defiler_mound/poisonous-essence-any@1'
    && definition.recordKey === 'tactical_cards:defiler_mound' && definition.sourceKind === 'card_feature'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === 'Poisonous Essence <Active> <Movement Phase>: Set a Faction Indicator on the active Friendly Unit. At the end of the Assault Phase, all Biological Enemy Units Engaged with the marked Unit suffer NON-LETHAL DAMAGE (2).') {
    spec = { effectKind: 'poisonous_essence', actionKind: 'active_ability', nonLethalDamage: 2,
      expiresAt: 'cleanup_and_refresh', triggerPhase: 'assault' };
  } else if (name === 'Debilitating Claws' && definition.recordKey === 'army_units:vileling__zergling_'
    && definition.activationKind === 'passive' && definition.phase === 'combat'
    && text === "After an Enemy Unit suffers Damage from this Unit, apply DEBUFF Hit (1) to each of that Unit's Weapons.") {
    spec = { effectKind: 'damage_inflicted_weapon_hit_debuff', actionKind: 'system_lifecycle',
      runtimeRole: 'system_lifecycle', weaponHitPenalty: 1, weaponScope: 'all', expiresAt: 'cleanup_and_refresh' };
  } else if (name === 'Operational Efficiency' && definition.recordKey === 'army_units:nova_stealth_mode'
    && definition.activationKind === 'passive'
    && text === 'After this Unit fully resolves a Ranged Attack with its C-20A Canister Rifle, if the target Enemy Unit was Destroyed or its Current Supply Value was reduced, the active player may return one of their Exhausted non-Unique Tactical Cards to its Ready state.') {
    spec = { effectKind: 'ranged_card_refresh', actionKind: 'system_lifecycle',
      weaponName: 'C-20A Canister Rifle', trigger: 'after_ranged_attack_resolved', optional: true };
  } else if ((name === 'One With the Shadows' && definition.recordKey === 'army_units:zeratul'
    || name === 'Tactical Stealth Suit' && definition.recordKey === 'army_units:nova_stealth_mode')
    && definition.activationKind === 'passive'
    && text === 'After this Unit fully resolves an Action, it gains the HIDDEN Status.') {
    spec = { effectKind: 'hidden_after_action', actionKind: 'system_lifecycle',
      eventKind: 'action_completed', expiresAt: null };
  } else if (name === 'Coordinated Strike' && definition.recordKey === 'army_units:siege_tank'
    && definition.activationKind === 'active'
    && text === 'Target a Friendly Non-Engaged Unit on the battlefield (Line of Sight is not required). When this Unit resolves a Ranged Attack using the Shock Cannon weapon profile this Round, it may choose to ignore the weapon\'s standard Range characteristic. If it does, it may target an Enemy Unit that is Within 8" of, and Visible to, a model of the selected Friendly Unit, treating that model as the acting model.') {
    spec = { effectKind: 'coordinated_strike', actionKind: 'active_ability',
      targetKind: 'friendly_unengaged_battlefield', weaponScope: 'Shock Cannon',
      rangeMilliInches: 8000, lineOfSightRequired: false, expiresAt: 'cleanup_and_refresh' };
  } else if (name === 'Void Prison' && definition.recordKey === 'army_units:zeratul'
    && definition.activationKind === 'active'
    && text === 'Set a Faction Indicator on the battlefield Within 8" of this Unit. While Enemy Units are Within 2" of this Faction Indicator they suffer DEBUFF Speed (2).') {
    spec = { effectKind: 'marker_speed_debuff', actionKind: 'active_ability',
      placementRangeMilliInches: 8000, rangeMilliInches: 2000, speedPenalty: 2,
      expiresAt: 'cleanup_and_refresh' };
  } else if (name === "Shadow Strike" && definition.recordKey === "army_units:zeratul"
    && /^All Enemy Units Engaged with this Unit suffer HITS 4 \(1\)\.$/u.test(text.trim())) {
    spec = { effectKind: "automatic_hits_engaged", actionKind: "active_ability", hits: 4, damagePerHit: 1 };
  } else if (name === "Mode Transformation" && definition.recordKey === "army_units:siege_tank"
    && /gains or loses the SIEGE MODE Status\.[\s\S]+Size characteristic is treated as if it was 3\./u.test(text)) {
    spec = { effectKind: "mode_toggle", actionKind: "active_ability",
      modeStatusName: "siege_mode", effectiveSize: 3, expiresAt: null };
  } else if (name === 'Aftershock Rounds' && definition.recordKey === 'army_units:siege_tank'
    && /has the SIEGE MODE Status.+Damage characteristic is treated as equal to the Size characteristic of the current target Unit.+minimum of 1/isu.test(text)) {
    spec = { effectKind: 'target_size_damage', actionKind: 'query_modifier',
      requiresModeStatus: 'siege_mode', minimumDamage: 1 };
  } else if (name === 'Heavy Plating' && definition.recordKey === 'army_units:siege_tank'
    && /When this Unit resolves an Armour Roll, it gains TOUGH \(1\), provided it does not currently have the SIEGE MODE Status\./u.test(text)) {
    spec = { effectKind: 'conditional_tough', actionKind: 'query_modifier',
      excludedModeStatus: 'siege_mode', tough: 1 };
  } else if (definition.definitionId === 'unit:zagara/infested-drop-movement-phase@1'
    && definition.activationKind === 'passive' && definition.phase === 'movement'
    && text === 'The base of the Zagara counts as an Entry Edge. Each Round, Friendly Units with a combined Supply cost of 1 may be Deployed via this Entry Edge.') {
    spec = { effectKind: 'infested_drop_entry_edge', actionKind: 'query_modifier', supplyLimitPerRound: 1 };
  } else if (definition.definitionId === 'card:zagara_s_swarm/scourge-queen-any@1'
    && definition.sourceKind === 'card_feature' && definition.activationKind === 'active' && definition.phase === 'combat'
    && text === 'Scourge Queen <Active> <Combat Phase>: If the active Unit contains more models than the combined number of models in all Engaged Enemy Units, its Close Combat Weapons gain INSTANT and PRECISION (4).') {
    spec = { effectKind: 'scourge_queen', actionKind: 'active_ability',
      precision: 4, grantsCloseCombatInstant: true, expiresAt: 'cleanup_and_refresh' };
  } else if (definition.definitionId === 'unit:high_templar/farsight-movement-phase@1'
    && definition.sourceKind === 'unit_feature' && definition.activationKind === 'active' && definition.phase === 'movement'
    && definition.activationText === '<Active>\n(1 Psionic Energy)'
    && text === 'Target one Friendly Unit Within 12". Until the End of the Round, that Unit is eligible to make an Evade Roll against any attacks targeting it.') {
    spec = { effectKind: 'farsight_evade_eligibility', actionKind: 'active_ability',
      targetKind: 'friendly_within', rangeMilliInches: 12000, expiresAt: 'cleanup_and_refresh' };
  } else if (definition.definitionId === OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID
    && definition.recordKey === 'army_units:high_templar' && definition.sourceKind === 'unit_feature'
    && definition.activationKind === 'passive' && definition.phase === 'any'
    && text === [
      "While this Unit's Current Supply Value is 2, it gains the following effects:",
      'The first Special Ability resolved by this Unit each Round has its PE cost reduced by 1 (to a minimum of 0).',
      'Apply a +1 Modifier to the dice rolled for its Psionic Storm Special Ability.',
    ].join('\n')) {
    spec = { effectKind: 'our_minds_as_one', actionKind: 'query_modifier',
      requiredCurrentSupply: 2, firstAbilityPeReduction: 1, psionicStormRollModifier: 1 };
  } else if (definition.definitionId === OFFICIAL_KHALAS_GIFT_DEFINITION_ID
    && definition.recordKey === 'army_units:tassadar' && definition.sourceKind === 'unit_feature'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && definition.activationText === '<Active>\n(0 Psionic Energy)'
    && text === 'Target another Friendly Biological Unit Within 12". Until the End of the Round, that Unit resolves its first Special Ability with the cost reduced by 1 (to a minimum of 0).') {
    spec = { effectKind: 'khalas_gift', actionKind: 'active_ability', targetKind: 'another_friendly_biological_within',
      rangeMilliInches: 12000, resourceType: 'PE', resourceCost: 0, expiresAt: 'cleanup_and_refresh' };
  } else if (definition.definitionId === OFFICIAL_EXECUTORS_WILL_DEFINITION_ID
    && definition.recordKey === 'army_units:tassadar' && definition.sourceKind === 'unit_feature'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && definition.activationText === '<Active>\n(1 Psionic Energy)'
    && text === [
      'Target two Enemy Units on the battlefield (Line of Sight is not required) and place a Faction Indicator next to each of them.',
      'During the next Assault Phase, if either of these Units ends its Activation while its Faction Indicator remains on the battlefield, you may Activate two Friendly Units consecutively.',
      'Remove both Faction Indicators after any Enemy Unit completes its Activation in the following Assault Phase.',
    ].join('\n')) {
    spec = { effectKind: 'executors_will', actionKind: 'active_ability', targetKind: 'executors_will_enemies', resourceType: 'PE',
      lineOfSightRequired: false };
  } else if (definition.definitionId === OFFICIAL_FORCE_WALL_DEFINITION_ID
    && definition.recordKey === 'army_units:tassadar' && definition.sourceKind === 'unit_feature'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && definition.activationText === '<Active>\n(1 Psionic Energy)'
    && text === 'Set two Force Wall tokens Wholly Within 8" in an unoccupied space. Units of Size 2 or lower cannot move across the Force Wall. Models of Size 3 or more can move over it, and it\'s then removed.') {
    spec = { effectKind: 'force_wall_pair', actionKind: 'active_ability', tokenKind: 'force_wall',
      rangeMilliInches: 8000, resourceType: 'PE', expiresAt: 'cleanup_and_refresh' };
  } else if (definition.definitionId === OFFICIAL_TELEKINETIC_PUSH_DEFINITION_ID
    && definition.recordKey === 'army_units:tassadar' && definition.sourceKind === 'unit_feature'
    && definition.activationKind === 'active' && definition.phase === 'assault'
    && definition.activationText === '<Active>\n(1 Psionic Energy)'
    && text === 'Set each Friendly Force Wall token Wholly Within 6" of its current position.') {
    spec = { effectKind: 'force_wall_push', actionKind: 'active_ability',
      rangeMilliInches: 6000, resourceType: 'PE' };
  } else if (definition.definitionId === OFFICIAL_PSI_LIGHTNING_DEFINITION_ID
    && definition.recordKey === 'army_units:tassadar' && definition.sourceKind === 'unit_feature'
    && definition.activationKind === 'active' && definition.phase === 'assault'
    && definition.activationText === '<Active>\n(0 Psionic Energy)'
    && text === 'Each Unit Within 2" of one or more Friendly Force Wall tokens suffers 1 Damage.') {
    spec = { effectKind: 'force_wall_lightning', actionKind: 'active_ability',
      rangeMilliInches: 2000, damageAmount: 1, resourceType: 'PE' };
  } else if (OFFICIAL_FEEDBACK_DEFINITION_IDS.includes(definition.definitionId)
    && definition.sourceKind === 'unit_feature' && definition.activationKind === 'active' && definition.phase === 'movement'
    && definition.activationText === '<Active>\n(1 Psionic Energy)'
    && text === 'Target one Enemy Mechanical or Psionic Unit Within 8". Until the End of the Round, after that Unit resolves an Active or Reaction Special Ability (excluding abilities granted by a Tactical Card or Faction Card), it suffers NON-LETHAL DAMAGE (3).') {
    spec = { effectKind: 'feedback', actionKind: 'active_ability', targetKind: 'feedback_enemy',
      rangeMilliInches: 8000, nonLethalDamage: 3, expiresAt: 'cleanup_and_refresh' };
  } else if (definition.definitionId === 'unit:zagara/broodmother-movement-phase@1'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === [
      'Apply one of the following effects to all Friendly units (Line of Sight is not required). You cannot apply the effect chosen in the previous Game Round:',
      'Units of Size 1 gain a +1 Modifier to all IMPACT Rolls.',
      'All weapons of Size 2 Units gain CRITICAL HIT (1).',
      'Units of Size 3 or more gain TOUGH (1).',
    ].join('\n\n')) {
    spec = { effectKind: 'broodmother_army_buff', actionKind: 'active_ability',
      choices: BROODMOTHER_EFFECTS, lineOfSightRequired: false, expiresAt: 'cleanup_and_refresh' };
  } else if (["Adrenal Overload", "Extended Claws"].includes(name)
    && /\+1 Modifier to all IMPACT Hit Rolls/iu.test(text)) {
    spec = { effectKind: "impact_hit_modifier", actionKind: "active_ability",
      impactHitModifier: 1, expiresAt: "cleanup_and_refresh" };
  } else if (name === "Burrow" && /Unengaged.+gains or loses the Burrowed Status/iu.test(text)) {
    spec = { effectKind: "burrow_toggle", actionKind: "active_ability",
      requiresUnengaged: true, expiresAt: null };
  } else if (["Charge", "Metabolic Boost"].includes(name)
    && /Charge Distance.+roll 2D6 instead of D6.+higher result/iu.test(text)) {
    spec = { effectKind: "charge_roll_advantage",
      actionKind: "active_ability", diceCount: 2, keepHighest: 1,
      expiresAt: "cleanup_and_refresh" };
  } else if (definition.definitionId === 'unit:spec_ops_marauder__marauder_/magrail-munitions-assault-phase@1'
    && definition.activationKind === 'passive' && definition.phase === 'assault'
    && text === "This Unit's first Attack in the game with its Quad K12 gains PIERCE Armoured (3).") {
    spec = { effectKind: 'first_game_weapon_pierce', actionKind: 'query_modifier',
      weaponName: 'Quad K12', targetTag: 'armoured', damage: 3, resetScope: 'game' };
  } else if (["Feral Rage", "Quick Strikes"].includes(name)
    && /first Close Combat Weapon used gains PRECISION \(2\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "close_combat", "precision", 2,
      { expiresAt: "cleanup_and_refresh", remainingUses: 1 });
  } else if (name === "Pound 'em Flat!" && definition.recordKey === 'tactical_cards:factory__tech_lab_'
    && definition.activationKind === 'active' && definition.phase === 'assault'
    && text === "Pound 'em Flat! <Active> <Assault Phase>: If the active Mechanical Unit has the Stationary Status, its first Ranged Weapon used gains PRECISION (2).") {
    spec = weaponKeyword('first_weapon_keyword', 'ranged', 'precision', 2,
      { requiredActorTag: 'mechanical', requiresStationary: true,
        expiresAt: 'cleanup_and_refresh', remainingUses: 1 });
  } else if (name === "Field Repair" && /Mechanical Unit resolves the HEAL \(2\)/iu.test(text)) {
    spec = { effectKind: "fixed_heal", actionKind: "active_ability",
      healValue: 2, requiredActorTag: "mechanical", expiresAt: "immediate" };
  } else if (["Ground Weapons", "Infantry Weapons", "Vehicle Weapons"].includes(name)
    && /first Ranged Weapon used gain(?:s)? CRITICAL HIT \(1\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "critical_hit", 1,
      { requiredActorTag: name === "Ground Weapons" ? "ground"
        : name === "Infantry Weapons" ? "biological" : "mechanical",
      expiresAt: "cleanup_and_refresh", remainingUses: 1 });
  } else if (name === "Let's Have a Blast!"
    && /first Ranged Weapon used gain ANTI-EVADE \(1\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "anti_evade", 1,
      { requiredActorTag: "biological", expiresAt: "cleanup_and_refresh",
        remainingUses: 1 });
  } else if (name === "Missile Attacks"
    && /first Ranged Weapon used gains PRECISION \(1\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "precision", 1,
      { expiresAt: "cleanup_and_refresh", remainingUses: 1 });
  } else if (name === "Guardian Shield"
    && /Ranged Attacks targeting a Friendly Unit Within 4.+1 fewer die/iu.test(text)) {
    spec = { effectKind: "guardian_shield", actionKind: "active_ability",
      rangeMilliInches: 4000, attackPoolModifier: -1,
      lineOfSightRequired: false, expiresAt: "cleanup_and_refresh" };
  } else if (name === "Lie in Wait" && /Unengaged Ground Unit gains the Burrowed Status/iu.test(text)) {
    spec = { effectKind: "grant_burrowed", actionKind: "active_ability",
      requiredActorTag: "ground", requiresUnengaged: true, expiresAt: null };
  } else if (name === "Medpack" && /another Friendly Biological Unit Within 4.+HEAL \(X\)/iu.test(text)) {
    spec = { effectKind: "medpack", actionKind: "active_ability",
      targetKind: "another_friendly_biological_within", rangeMilliInches: 4000,
      expiresAt: "immediate" };
  } else if (name === "Nasty Surprise" && /Ground Unit loses the Burrowed Status/iu.test(text)) {
    spec = { effectKind: "lose_burrowed", actionKind: "active_ability",
      requiredActorTag: "ground", requiresBurrowed: true, expiresAt: "immediate" };
  } else if (definition.definitionId === 'unit:sabotage_drone/have-a-nice-day-assault-phase@1'
    && definition.recordKey === 'army_units:sabotage_drone' && definition.activationKind === 'passive'
    && definition.phase === 'assault'
    && text === 'At the End of the Assault Phase, target each Unit Within 3" of this Unit (including Units with the Structure ability) suffers HITS 5 (1). If an affected Unit has the Structure ability, that Unit suffers an additional HITS 5 (1).') {
    spec = { effectKind: 'unit_phase_end_hits', actionKind: 'system_lifecycle',
      sourceRecordHash: definition.sourceRecordHash, payloadHash: definition.payloadHash,
      rangeMilliInches: 3000, hits: 5, damagePerHit: 1, additionalStructureHits: 5,
      explicitStructureRecipients: true, timing: 'assault_end' };
  } else if (name === "Optical Flare"
    && /Enemy Unit Within 12.+DEBUFF Range \(4\).+cannot benefit from LONG RANGE/iu.test(text)) {
    spec = { effectKind: "optical_flare", actionKind: "active_ability",
      targetKind: "enemy_within", rangeMilliInches: 12000,
      characteristic: "range", modifier: -4, longRangeAllowed: false,
      expiresAt: "cleanup_and_refresh" };
  } else if (name === 'Spec Ops Armour' && definition.recordKey === 'army_units:spec_ops_marauder__marauder_'
    && definition.activationKind === 'active' && definition.phase === 'any'
    && text === 'This Unit gains the HIDDEN Status until it performs another action.') {
    spec = { effectKind: 'hidden_until_action', actionKind: 'active_ability', expiresAt: 'action_performed' };
  } else if (name === "Path of Shadows" && /gains HIDDEN Status until it performs another action/iu.test(text)) {
    spec = { effectKind: "hidden_until_action", actionKind: "active_ability",
      expiresAt: "action_performed" };
  } else if (name === "Anakh Su'n" && definition.recordKey === 'tactical_cards:void_seeker'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === "Anakh Su'n <Active> <Movement Phase>: This Unit gains the HIDDEN Status until it performs another action.") {
    spec = { effectKind: 'hidden_until_action', actionKind: 'active_ability',
      expiresAt: 'action_performed' };
  } else if (name === 'Darkness Descends' && definition.recordKey === 'tactical_cards:nerazim'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === 'Darkness Descends <Active> <Movement Phase>: The active Biological Unit gains the HIDDEN Status until the End of the Round.') {
    spec = { effectKind: 'hidden_until_round_end', actionKind: 'active_ability',
      requiredActorTag: 'biological', expiresAt: 'cleanup_and_refresh' };
  } else if (name === "Rapid Burrowing"
    && /Friendly, Unengaged Ground Zerg Unit.+gains the Burrowed Status.+already been Activated/iu.test(text)) {
    spec = { effectKind: "grant_burrowed", actionKind: "active_ability",
      targetKind: "friendly_ground_zerg_any_activation", requiredActorTag: "ground",
      requiredActorRace: "zerg", requiresUnengaged: true,
      alreadyActivatedAllowed: true, expiresAt: null };
  } else if (name === "Resonating Glaives" && /Glaive Cannon gains BUFF RoA \(1\)/iu.test(text)) {
    spec = { effectKind: "weapon_characteristic_buff", actionKind: "active_ability",
      weaponScope: "glaive cannon", characteristic: "roa", modifier: 1,
      expiresAt: "cleanup_and_refresh" };
  } else if (name === 'Commando Stimpack' && definition.recordKey === 'army_units:spec_ops_marauder__marauder_'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === 'This Unit gains BUFF Speed (3). Additionally, its Quad K12 and all Close Combat Weapons gain PRECISION (2).') {
    spec = { effectKind: 'stimpack', actionKind: 'active_ability', nonLethalDamage: 0,
      speedModifier: 3, precision: 2, rangedWeaponScope: 'quad k12', closeCombatWeaponScope: 'all',
      expiresAt: 'cleanup_and_refresh' };
  } else if (name === 'Super Stimpack'
    && ['army_units:nova_assault_mode', 'army_units:nova_stealth_mode'].includes(definition.recordKey)
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === 'This Unit gains BUFF Speed (2). Additionally, all its Weapons gain PRECISION (2).') {
    spec = { effectKind: 'stimpack', actionKind: 'active_ability',
      nonLethalDamage: 0, speedModifier: 2, precision: 2,
      rangedWeaponScope: 'all', closeCombatWeaponScope: 'all',
      expiresAt: 'cleanup_and_refresh' };
  } else if (name === "Stimpack"
    && /NON-LETHAL DAMAGE \(2\).+BUFF Speed \(3\).+PRECISION \((2|3)\)/iu.test(text)) {
    const precision = Number(text.match(/PRECISION \((2|3)\)/iu)[1]);
    spec = { effectKind: "stimpack", actionKind: "active_ability",
      nonLethalDamage: 2, speedModifier: 3, precision,
      rangedWeaponScope: /Quad K12/iu.test(text) ? "quad k12" : "c-14 rifle",
      closeCombatWeaponScope: "all", expiresAt: "cleanup_and_refresh" };
  } else if (name === 'Mark for Death' && definition.recordKey === 'tactical_cards:nova_covert_ops'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === 'Mark for Death <Active> <Movement Phase>: Target an Enemy Unit on the battlefield. When a Friendly Unit makes an Attack targeting that Unit, its first Melee or Ranged Weapon used gains CRITICAL HIT (1) and PRECISION (1).') {
    spec = { effectKind: 'marked_target_first_weapon', actionKind: 'active_ability',
      targetKind: 'enemy_battlefield', lineOfSightRequired: true,
      criticalHit: 1, precision: 1, expiresAt: 'cleanup_and_refresh' };
  } else if (name === 'Sentenced to Death' && definition.recordKey === 'army_units:zeratul'
    && definition.activationKind === 'active' && definition.phase === 'movement'
    && text === 'Target Enemy Unit on the battlefield. Whenever Zeratul makes a Close Combat Attack targeting the selected Unit, its weapon gains CRITICAL HIT (2).') {
    spec = { effectKind: 'targeted_melee_critical', actionKind: 'active_ability',
      targetKind: 'enemy_battlefield', lineOfSightRequired: true,
      weaponScope: 'all', keyword: 'critical_hit', value: 2, expiresAt: 'cleanup_and_refresh' };
  } else if (name === "Target Lock"
    && /Enemy Unit Within 12.+Friendly Goliath.+Autocannon.+D3\+1/iu.test(text)) {
    spec = { effectKind: "target_lock", actionKind: "active_ability",
      targetKind: explicitRelease ? 'visible_enemy_within' : "enemy_within", rangeMilliInches: 12000,
      ...(explicitRelease ? { lineOfSightRequired: true } : {}),
      friendlyRecordKey: "army_units:goliath", weaponScope: "autocannon",
      surgeTypes: ["light", "armoured"], surgeDice: "D3+1",
      expiresAt: "cleanup_and_refresh" };
  } else if (name === "Weapons of the Firstborn"
    && /Ground Unit.s first Ranged Weapon used gains BUFF Range \(4\)/iu.test(text)) {
    spec = weaponKeyword("first_weapon_keyword", "ranged", "buff_range", 4,
      { requiredActorTag: "ground", expiresAt: "cleanup_and_refresh",
        remainingUses: 1 });
  } else if (name === "Zealous Charge" && /Unit gains BUFF Speed \(2\)/iu.test(text)) {
    spec = { effectKind: "speed_buff", actionKind: "active_ability",
      speedModifier: 2, expiresAt: "cleanup_and_refresh" };
  } else if (name === "Adrenal Glands"
    && /Claws and Shredding Claws weapons gain PRECISION \(2\)/iu.test(text)) {
    spec = weaponKeyword("passive_weapon_keyword", ["claws", "shredding claws"],
      "precision", 2);
  } else if (name === "Ancillary Carapace"
    && /TOUGH \(1\) on the first Armour Roll of each Activation/iu.test(text)) {
    spec = { effectKind: "first_armour_tough", actionKind: "query_modifier",
      tough: 1, resetScope: "activation" };
  } else if (name === "Ares-Class Targeting System"
    && /Autocannon and Underbelly Machine Gun weapons gain PRECISION \(1\)/iu.test(text)) {
    spec = weaponKeyword("passive_weapon_keyword",
      ["autocannon", "underbelly machine gun"], "precision", 1);
  } else if (name === 'Fury Unyielding' && definition.recordKey === 'army_units:immortal'
    && text.trim() === 'While this Unit is Within 3" of a Mission Marker, its Ranged Weapons gain CRITICAL HIT (1) when targeting an Enemy Unit that is also Within 3" of that same Mission Marker.') {
    spec = weaponKeyword('passive_weapon_keyword', 'all', 'critical_hit', 1,
      { weaponCondition: { kind: 'same_mission_marker', rangeMilliInches: 3000, attackKind: 'ranged' } });
  } else if (name === 'For the Ancients' && definition.recordKey === 'army_units:immortal'
    && text.trim() === 'When this Unit makes a Ranged Attack, if the target Unit is more than 8" away, the attacking weapons gain PRECISION (1).') {
    spec = weaponKeyword('passive_weapon_keyword', 'all', 'precision', 1,
      { weaponCondition: { kind: 'target_beyond', rangeMilliInches: 8000, attackKind: 'ranged' } });
  } else if (name === 'Ghost Visor'
    && ['army_units:nova_assault_mode', 'army_units:nova_stealth_mode'].includes(definition.recordKey)
    && definition.activationKind === 'passive' && definition.phase === 'any'
    && text === 'While Enemy Units are Within 6" of this Unit, they lose the HIDDEN Status.') {
    spec = { effectKind: 'detection_aura', actionKind: 'query_modifier',
      rangeMilliInches: 6000, removesHidden: true };
  } else if (['army_units:raven', 'army_units:bile_launcher'].includes(definition.recordKey)
    && definition.definitionId === `unit:${definition.recordKey.slice('army_units:'.length)}/detection-any-phase@1`
    && name === 'Detection'
    && definition.activationKind === 'passive' && definition.phase === 'any'
    && text === 'While Enemy Units are Within 6" of this Unit, they lose the HIDDEN Status.') {
    spec = { effectKind: 'detection_aura', actionKind: 'query_modifier',
      rangeMilliInches: 6000, removesHidden: true };
  } else if (definition.definitionId === 'unit:infested_missile_turret/detection-any-phase@1'
    && definition.recordKey === 'army_units:infested_missile_turret' && name === 'Detection'
    && definition.activationKind === 'passive' && definition.phase === 'any'
    && text === 'While Enemy Units are Within 8" of this Unit, they lose the HIDDEN Status.') {
    spec = { effectKind: 'detection_aura', actionKind: 'query_modifier', rangeMilliInches: 8000, removesHidden: true };
  } else if (definition.definitionId === 'unit:holo_decoy/lethal-hologram-any-phase@1'
    && name === 'Lethal Hologram' && definition.recordKey === 'army_units:holo_decoy'
    && definition.activationKind === 'passive' && definition.phase === 'any'
    && text === 'All Weapons of Friendly Units targeting an Enemy Unit Within 4" of this Unit gain PRECISION (1).') {
    spec = weaponKeyword('target_near_source_weapon_keyword', 'all', 'precision', 1,
      { rangeMilliInches: 4000, sourceRecordHash: definition.sourceRecordHash, payloadHash: definition.payloadHash });
  } else if (name === "Detection"
    && /Enemy Units are Within 6.+lose HIDDEN Status/iu.test(text)) {
    spec = { effectKind: "detection_aura", actionKind: "query_modifier",
      rangeMilliInches: 6000, removesHidden: true };
  } else if (name === "Guidance"
    && /Glaive Cannon Ranged weapon gains ANTI-EVADE \(2\)/iu.test(text)) {
    spec = weaponKeyword("passive_weapon_keyword", ["glaive cannon"], "anti_evade", 2);
  } else if (name === "Hydriodic Bile"
    && /Acid Saliva weapon gains Surge Type: Light, and S Dice: D3\+1/iu.test(text)) {
    spec = { effectKind: "passive_weapon_surge", actionKind: "query_modifier",
      weaponScope: ["acid saliva"], surgeTypes: ["light"], surgeDice: "D3+1" };
  } else if (name === 'Point Blank' && definition.recordKey === 'army_units:siege_tank'
    && definition.activationKind === 'passive'
    && text === 'While this Unit has the SIEGE MODE Status, it cannot target Enemy Units it is Engaged with.') {
    spec = { effectKind: 'ranged_engaged_target_prohibition', actionKind: 'query_modifier', requiresModeStatus: 'siege_mode' };
  } else if (name === "Indomitable"
    && /While Engaged.+target and be targeted by Unengaged Enemy Units/iu.test(text)) {
    spec = { effectKind: "indomitable", actionKind: "query_modifier",
      crossEngagementTargetingAllowed: true, defenderEvadeEligible: true };
  } else if (name === "Kinetic Foam" && /Hit Points characteristic by 1/iu.test(text)) {
    spec = { effectKind: "hit_points_modifier", actionKind: "query_modifier",
      hitPointsModifier: 1 };
  } else if (name === "Precognition" && /eligible to make an Evade roll against all attacks/iu.test(text)) {
    spec = { effectKind: "evade_eligibility", actionKind: "query_modifier",
      allAttacks: true };
  } else if (name === "Regeneration"
    && /becomes Activated.+Burrowed Status.+HEAL \(2\)/iu.test(text)) {
    spec = { effectKind: "regeneration", actionKind: "system_lifecycle",
      eventKind: "activation_start", healValue: 2, requiresBurrowed: true };
  } else if (name === "Shield Overcharge"
    && /TOUGH \(2\) on the first Armour Roll each Round/iu.test(text)) {
    spec = { effectKind: "first_armour_tough", actionKind: "query_modifier",
      tough: 2, resetScope: "round" };
  } else if (name === "Slugthrower"
    && /Ranged Attack with a C-14 Rifle.+Within 8.+ANTI-EVADE \(1\)/iu.test(text)) {
    spec = { effectKind: "slugthrower", actionKind: "query_modifier",
      weaponScope: ["c-14 rifle"], rangeMilliInches: 8000,
      keyword: "anti_evade", value: 1 };
  } else if (name === 'Large' && definition.recordKey === 'army_units:siege_tank'
    && definition.activationKind === 'passive'
    && text === 'When this Unit\'s Leading Model moves, it cannot pass through physical gaps smaller than 3" wide, regardless of its size. If the Leading Model\'s path of travel passes through, or any model in this Unit ends its movement on a Size 0 or Size 1 Impassible Terrain piece (excluding Tokens) during any movement action, that terrain piece is immediately removed from the game.') {
    spec = { effectKind: 'large_movement', actionKind: 'query_modifier', phase: 'any', minimumGapMilliInches: 3000,
      terrainKind: 'impassable', terrainSizes: [0, 1], tokensExcluded: true };
  } else if (name === 'Raptor Strain' && definition.activationKind === 'passive' && definition.phase === 'any'
    && (definition.definitionId === 'unit:kerrigan_swarm_raptor__zergling_/raptor-strain-any-phase@1'
      || definition.definitionId === 'unit:raptor__zergling_/raptor-strain-any-phase@1')
    && text === 'This Unit can move through IMPASSABLE TERRAIN of Size 4 or less and change elevation without using ACCESS POINTS.') {
    spec = { effectKind: 'raptor_terrain_permission', actionKind: 'query_modifier',
      maximumImpassableTerrainSize: 4, mayChangeElevationWithoutAccessPoints: true };
  } else if (name === "Squadron" && /Horizontal Coherency is 4/iu.test(text)) {
    spec = { effectKind: "coherency_projection", actionKind: "query_modifier",
      horizontalCoherencyMilliInches: 4000 };
  } else if (name === "Titan Killers"
    && /Close Combat Attack.+target is Size 3 or larger.+Damage characteristic is treated as 2/iu.test(text)) {
    spec = { effectKind: "titan_killers", actionKind: "query_modifier",
      minimumTargetSize: 3, damageSetTo: 2 };
  } else if (definition.definitionId === 'unit:bile_launcher/biological-structure-any-phase@1'
    && definition.recordKey === 'army_units:bile_launcher' && name === 'Biological Structure'
    && definition.phase === 'any' && definition.activationKind === 'passive'
    && text === 'This Unit cannot gain the BURROWED Status, cannot be returned to Reserves, and is immune to the IMPACT keyword.') {
    spec = { effectKind: 'unit_restrictions', actionKind: 'query_modifier',
      cannotGainBurrowed: true, cannotReturnToReserves: true, impactImmune: true };
  } else if (name === "Underdeveloped Claws" && /cannot gain Burrowed Status/iu.test(text)) {
    spec = { effectKind: "cannot_gain_burrowed", actionKind: "query_modifier" };
  } else if (name === "We Stand as One"
    && /Close Combat Attack.+target is Engaged with at least 1 other Friendly Unit.+PRECISION \(2\)/iu.test(text)) {
    spec = { effectKind: "we_stand_as_one", actionKind: "query_modifier",
      keyword: "precision", value: 2, requiresOtherFriendlyEngagement: true };
  }
  if (!spec) fail("CHARACTERISTIC_STATUS_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(baseSpec(definition, spec), "routeHash");
}

export function createOfficialCharacteristicStatusFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("CHARACTERISTIC_STATUS_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pendingIds = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 233 && pendingIds.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 60 || definitions.some((entry) => !entry)) {
    fail("CHARACTERISTIC_STATUS_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(definition => compileRoute(definition)).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length,
    archetypeCounts,
    routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true,
    exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_characteristic_status_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle) {
  if (bundle?.schema === "starcraft_tmg_official_characteristic_status_family_source_bundle_v2") {
    if (bundle.routeCount < 1 || bundle.routes?.length !== bundle.routeCount
      || new Set(bundle.definitionIds).size !== bundle.routeCount
      || new Set(bundle.coveredSourceFeatureHashes).size !== bundle.routeCount
      || !isDeepStrictEqual(bundle.definitionIds, bundle.routes.map(row => row.definitionId))
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes,
        bundle.routes.map(row => row.sourceFeatureHash).sort())
      || bundle.routes.some(row => row.routeHash !== hashStarcraftTmgContract(without(row, ["routeHash"]))
        || row.exactSourcePatternCompiled !== true || row.arbitraryProseExecutionClaimed !== false)
      || bundle.scope !== "explicit_source_definition_set"
      || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
      fail("CHARACTERISTIC_STATUS_SOURCE_BUNDLE_V2_INVALID");
    }
    return true;
  }
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 60 || bundle.routes?.length !== 60
    || new Set(bundle.definitionIds || []).size !== 60
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 60
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 60
    || bundle.routes.some((entry) => entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("CHARACTERISTIC_STATUS_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

// Explicit admission of a source-reviewed subset during incremental release
// construction. Unselected definitions remain pending in the shared IR router.
export function createOfficialCharacteristicStatusFamilySourceBundleV2({ catalogue, definitionIds, canonicalResourceTypes = false } = {}) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  if (!Array.isArray(definitionIds) || !definitionIds.length
    || new Set(definitionIds).size !== definitionIds.length) {
    fail("CHARACTERISTIC_STATUS_DEFINITION_SELECTION_INVALID");
  }
  const useCanonicalResourceTypes = canonicalResourceTypes || definitionIds.some(id =>
    [OFFICIAL_KHALAS_GIFT_DEFINITION_ID, OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID].includes(id));
  const routes = definitionIds.map(id => {
    const definition = catalogue.definitions.find(row => row.definitionId === id);
    if (!definition) fail("CHARACTERISTIC_STATUS_DEFINITION_UNKNOWN", id);
    if (definition.definitionName === 'Squadron' && (definition.sourceKind !== 'unit_feature'
      || definition.activationKind !== 'passive' || definition.phase !== 'any'
      || definition.sourceText !== 'This Unit’s Horizontal Coherency is 4".')) {
      fail('CHARACTERISTIC_STATUS_SQUADRON_SOURCE_UNSUPPORTED', id);
    }
    if (id === 'card:zerg_swarm/rapid-burrowing-any@1'
      && (definition.recordKey !== 'tactical_cards:zerg_swarm' || definition.activationKind !== 'active'
        || definition.phase !== 'movement' || definition.sourceKind !== 'card_feature'
        || definition.sourceText !== 'Rapid Burrowing <Active> <Movement Phase>: Select one Friendly, Unengaged Ground Zerg Unit on the battlefield. That Unit gains the Burrowed Status, even if it has already been Activated this Round.')) {
      fail('CHARACTERISTIC_STATUS_RAPID_BURROWING_SOURCE_UNSUPPORTED', id);
    }
    const route = compileRoute(definition, { explicitRelease: true });
    return useCanonicalResourceTypes && route.resourceType === 'Energy'
      ? seal({ ...without(route, ['routeHash']), resourceType: 'PE' }, 'routeHash') : route;
  }).sort((a, b) => a.definitionId.localeCompare(b.definitionId));
  const bundle = seal({ schema: "starcraft_tmg_official_characteristic_status_family_source_bundle_v2",
    semanticVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
    routeCount: routes.length, routes, definitionIds: routes.map(row => row.definitionId),
    coveredSourceFeatureHashes: routes.map(row => row.sourceFeatureHash).sort(),
    archetypeCounts: Object.fromEntries([...new Set(routes.map(row => row.effectKind))].sort()
      .map(kind => [kind, routes.filter(row => row.effectKind === kind).length])),
    ...(useCanonicalResourceTypes ? { resourceTypeContract: 'card_payment_CP_BM_PE_v1' } : {}),
    scope: "explicit_source_definition_set", exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false, sourceRefreshPerformed: false,
    productionRoomEligible: false, trainingTruth: false,
  }, "bundleHash");
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  return bundle;
}

export function createOfficialCharacteristicStatusFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    capability: route.actionKind === "active_ability"
      ? "authoritative_action" : route.runtimeRole,
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function unitWithin(state, sourcePiece, targetPiece, rangeMilliInches) {
  // A reserve has no battlefield footprint. Keep invalid on-table geometry visible to the caller.
  if (state.officialSpatialAuraScope === 'battlefield_only_v1'
    && ((sourcePiece?.isInReserves === true && sourcePiece.isOnField === false)
      || (targetPiece?.isInReserves === true && targetPiece.isOnField === false))) {
    return { within: false, assessments: [] };
  }
  const assessments = liveModels(sourcePiece).map((model) => (
    evaluateOfficialWithinWhollyWithinV1({
      state,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      source: { kind: "model", unitId: sourcePiece.id, modelId: model.id },
      targetUnitId: targetPiece.id,
      rangeMilliInches,
    })
  ));
  return { within: assessments.some((entry) => entry.unitWithin), assessments };
}
function engagedWithEnemy(state, piece) {
  return (state.pieces || []).some((enemy) => enemy.sideKey !== piece.sideKey
    && activePiece(enemy) && tags(enemy).has("ground")
    && unitWithin(state, piece, enemy, 1000).within);
}
function passiveRoutesForPiece(bundle, state, piece) {
  return bundle.routes.filter((route) => route.recordKey === piece.officialUnitRecordKey
    && allowsOfficialSpawnRoundSpecialAbilityV1(state, piece, route.abilityName)
    && route.actionKind !== "active_ability" && fieldedFeature(piece, route)
    && activePiece(piece)
    && (route.effectKind === "structure"
      || Number(piece?.structureRules?.specialAbilitiesDisabledThroughRound
        ?? Number.NEGATIVE_INFINITY) < Number(state.round)));
}
export function resolveOfficialPassiveCharacteristicRoutesForPieceV1(bundle,state,piece){
  return passiveRoutesForPiece(bundle,state,piece);
}

export function resolveOfficialInfestedDropSourcesV1(state, sideKey) {
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  if (state.phase !== 'movement' || !bundle?.routes.some(row => row.effectKind === 'infested_drop_entry_edge')) {
    return [];
  }
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  return state.pieces.filter(piece => piece.sideKey === sideKey).flatMap(piece =>
    passiveRoutesForPiece(bundle, state, piece)
      .filter(route => route.effectKind === 'infested_drop_entry_edge')
      .map(route => ({ piece, route })));
}

export function resolveOfficialRavenReserveEntryRouteV1(state, piece) {
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  if (state.phase !== 'movement' || piece.officialUnitRecordKey !== 'army_units:raven'
    || piece.isInReserves !== true || piece.isOnField === true || !livePiece(piece)) return null;
  const route = bundle?.routes.find(row => row.definitionId === OFFICIAL_RAVEN_INTERNAL_TECH_MODULE_DEFINITION_ID);
  if (!route) return null;
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  return fieldedFeature(piece, route) ? route : null;
}

function firstGameWeaponUse(piece, route) {
  const uses = piece.officialFirstGameWeaponUses || [];
  if (!Array.isArray(uses) || uses.some(use => {
    const { useHash, ...body } = use;
    return use.schema !== 'starcraft_tmg_first_game_weapon_use_v1'
      || useHash !== hashStarcraftTmgContract(body) || use.pieceId !== piece.id;
  }) || new Set(uses.map(use => use.sourceDefinitionId)).size !== uses.length) {
    fail('FIRST_GAME_WEAPON_USE_HISTORY_INVALID', piece.id);
  }
  const used = uses.find(use => use.sourceDefinitionId === route.definitionId);
  if (used && (used.sourceFeatureHash !== route.sourceFeatureHash || used.weaponName !== route.weaponName)) {
    fail('FIRST_GAME_WEAPON_USE_SOURCE_MISMATCH', piece.id);
  }
  return used;
}

// The complete native batch owns this record. Queries and pending casualty
// choices retain the same first-attack modifier until that batch settles.
export function consumeOfficialCharacteristicStatusFirstGameWeaponV1(state, attack) {
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  const routes = bundle?.routes.filter(route => route.effectKind === 'first_game_weapon_pierce') || [];
  if (!routes.length) return [];
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  const piece = state.pieces.find(row => row.id === attack.pieceId);
  if (!piece) fail('FIRST_GAME_WEAPON_USE_PIECE_REQUIRED');
  const consumed = [];
  for (const route of routes.filter(row => row.recordKey === piece.officialUnitRecordKey
    && fieldedFeature(piece, row) && normalized(row.weaponName) === normalized(attack.weaponName))) {
    if (firstGameWeaponUse(piece, route)) continue;
    const profile = state.officialAttackProfileCatalogue.profiles.find(row =>
      row.recordKey === piece.officialUnitRecordKey && row.phase === 'assault'
      && row.weaponName === route.weaponName);
    if (!profile || attack.sourceProfileHash !== profile.profileHash || !attack.attackResolutionHash) {
      fail('FIRST_GAME_WEAPON_USE_ATTACK_SOURCE_REQUIRED', piece.id);
    }
    const used = seal({ schema: 'starcraft_tmg_first_game_weapon_use_v1',
      pieceId: piece.id, sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, weaponName: route.weaponName,
      sourceProfileHash: attack.sourceProfileHash, attackResolutionHash: attack.attackResolutionHash,
      round: Number(state.round), phase: state.phase, resetScope: 'game', trainingTruth: false }, 'useHash');
    piece.officialFirstGameWeaponUses = [...(piece.officialFirstGameWeaponUses || []), used];
    consumed.push(used);
  }
  return consumed;
}

export function applyOfficialAfterActionCharacteristicPassivesV1(state, pieceId) {
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  if (!bundle?.routes.some(route => route.effectKind === 'hidden_after_action')) return;
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  const piece = state.pieces.find(row => row.id === pieceId);
  if (!activePiece(piece)) return;
  for (const route of passiveRoutesForPiece(bundle, state, piece).filter(row => row.effectKind === 'hidden_after_action')) {
    const existing = piece.statuses?.find(row => row?.sourceDefinitionId === route.definitionId
      && statusName(row) === 'hidden' && row.expiresAt === null);
    const value = existing || status(route, state, piece, piece,
      { statusName: 'hidden', statusKind: 'status', expiresAt: null });
    if (!existing) {
      addStatus(piece, value);
      state.board.effectMarkers = [...(state.board.effectMarkers || []), markerFor(value)];
    }
    const history = state.characteristicAfterActionPassiveHistory || [];
    state.characteristicAfterActionPassiveHistory = [...history, seal({ round: Number(state.round), phase: state.phase,
      pieceId, sourceDefinitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
      ordinal: history.length + 1, granted: !existing, statusEffectHash: value.statusEffectHash, trainingTruth: false }, 'resolutionHash')];
  }
}

// Intrinsic HP belongs to the selected Unit, including models in reserves. It
// must not depend on having battlefield coordinates or on an aura query.
function hitPointRoutesForPiece(bundle, state, piece) {
  return (bundle?.routes || []).filter((route) => (
    route.recordKey === piece.officialUnitRecordKey
    && route.effectKind === "hit_points_modifier"
    && fieldedFeature(piece, route)
    && Number(piece?.structureRules?.specialAbilitiesDisabledThroughRound
      ?? Number.NEGATIVE_INFINITY) < Number(state.round)));
}

function resolveArmourPenalty(state, piece) {
  const potentBilePenalty = inspectOfficialPotentBileArmourPenaltyV1(state, piece);
  const missiles = (piece.statuses || []).filter(entry =>
    entry?.sourceDefinitionId === OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID);
  if (!missiles.length) return potentBilePenalty;
  const route = state.officialCharacteristicStatusFamilySourceBundle?.routes.find(
    entry => entry.definitionId === OFFICIAL_RAVEN_ANTI_ARMOUR_MISSILE_DEFINITION_ID);
  if (!route || missiles.length !== 1) fail('RAVEN_ANTI_ARMOUR_STATUS_SOURCE_INVALID', piece.id);
  const [missile] = missiles;
  if (missile.statusEffectHash !== hashStarcraftTmgContract(without(missile, ['statusEffectHash']))
    || missile.sourceAdapterId !== OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID
    || missile.sourceFeatureHash !== route.sourceFeatureHash || missile.targetPieceId !== piece.id
    || missile.sourceSideKey !== otherSide(piece.sideKey)
    || missile.statusKind !== 'debuff' || missile.characteristic !== 'armour'
    || missile.modifier !== -route.armourPenalty || missile.roundApplied !== Number(state.round)
    || missile.expiresAt !== route.expiresAt) fail('RAVEN_ANTI_ARMOUR_STATUS_INVALID', piece.id);
  return potentBilePenalty + route.armourPenalty;
}

export function resolveOfficialEffectiveCombatProfileV1(state, piece) {
  const base = getOfficialCombatProfileV1(
    state.officialCombatProfileBundle, piece.officialUnitRecordKey);
  const routes = hitPointRoutesForPiece(
    state.officialCharacteristicStatusFamilySourceBundle, state, piece);
  const hitPointsModifier = Math.max(0, ...routes.map((route) => route.hitPointsModifier));
  const armourPenalty = resolveArmourPenalty(state, piece);
  if (armourPenalty) {
    const { profileHash: baseProfileHash, ...body } = base;
    return seal({ ...body, baseProfileHash,
      effectiveProfileVersion: 'selected-unit-effective-armour-debuff-v1',
      hitPoints: Number(base.hitPoints) + hitPointsModifier, hitPointsModifier,
      hitPointModifierDefinitionIds: routes.map(route => route.definitionId).sort(),
      armourThreshold: Number(base.armourThreshold) + armourPenalty, armourPenalty,
    }, 'profileHash');
  }
  if (!hitPointsModifier) return base;
  const { profileHash: baseProfileHash, ...body } = base;
  return seal({ ...body, baseProfileHash,
    effectiveProfileVersion: "selected-unit-effective-hit-points-v1",
    hitPoints: Number(base.hitPoints) + hitPointsModifier, hitPointsModifier,
    hitPointModifierDefinitionIds: routes.map((route) => route.definitionId).sort(),
  }, "profileHash");
}

// Called only on owned setup/Apply state. DamageMarker remains the authority;
// repairing the derived display must neither heal damage nor revive casualties.
export function synchronizeOfficialEffectiveHitPointWoundsV1(state, piece, options = {}) {
  const routes = hitPointRoutesForPiece(
    state.officialCharacteristicStatusFamilySourceBundle, state, piece);
  if (!routes.length && options.includeUnmodifiedProfiles !== true) return;
  const profile = resolveOfficialEffectiveCombatProfileV1(state, piece);
  let first = true;
  for (const model of piece.models || []) {
    if (model.isDestroyed === true) {
      model.remainingWounds = 0;
      continue;
    }
    const damage = first ? Number(piece.damageMarker || 0) : 0;
    const capacity = Number(profile.hitPoints) + (first
      && piece.firstModelShieldCapacityApplied ? Number(profile.shield || 0) : 0);
    model.damage = damage;
    model.remainingWounds = Math.max(0, capacity - damage);
    first = false;
  }
}
function cannotGainBurrowed(bundle, state, piece) {
  return projectOfficialUnitRestrictionsV1(state, piece.id).cannotGainBurrowed
    || passiveRoutesForPiece(bundle, state, piece).some((route) => (
    route.effectKind === "cannot_gain_burrowed"));
}
function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => piece.officialUnitRecordKey === route.recordKey
      && allowsOfficialSpawnRoundSpecialAbilityV1(state, piece, route.abilityName)
      && livePiece(piece) && fieldedFeature(piece, route)).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, sourcePiece: piece,
    }));
  }
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey)
      .map((card) => ({ sourceInstanceId: card.cardInstanceId, sideKey, card }))
  ));
}
function usedThisRound(state, route, pieceId) {
  return (state.activeAbilityUseHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round) && entry.pieceId === pieceId
      && entry.abilityName === route.abilityName));
}
// A reserve nomination may start this unit's before-action window. Its owner
// must still deploy the same unit. An on-table activation uses the printed CP.
function reserveStimpackSource(state, route, actor) {
  if (route.definitionId !== 'unit:raynor_s_raider__marine_/stimpack-movement-phase@1'
    || actor?.isInReserves !== true || actor.isOnField === true || !livePiece(actor)
    || state.phase !== 'movement' || state.pendingAction || state.pendingOfficialReactionWindow
    || actor.activatedPhases?.movement || state.activeSideKey !== actor.sideKey) return null;
  const window = state.selectedRosterActivationWindow;
  if (window && (window.stage !== 'before_action' || window.pieceId !== actor.id
    || window.sideKey !== actor.sideKey || window.phase !== state.phase)) return null;
  const source = state.officialRelocationFamilySourceBundle?.routes.find(row =>
    row.definitionId === 'unit:raynor_s_raider__marine_/raiders-roll-movement-phase@1'
    && row.recordKey === actor.officialUnitRecordKey && row.effectKind === 'deployment_stimpack_discount');
  return source && projectOfficialDeploymentSupplyV1(state, actor.sideKey, actor.id).poolRequirementSatisfied ? source : null;
}
function activeTimingAvailable(state, route, sideKey, actor) {
  if (!SIDE_KEYS.has(sideKey) || state.activeSideKey !== sideKey
    || (route.phase !== "any" && state.phase !== route.phase)
    || state.players?.[sideKey]?.passedPhases?.[state.phase] === true
    || (!activePiece(actor) && !reserveStimpackSource(state, route, actor)) || actor.sideKey !== sideKey) return false;
  if (route.alreadyActivatedAllowed !== true
    && actor.activatedPhases?.[state.phase] === true
    && state.selectedRosterActivationWindow?.stage !== "after_action") return false;
  const window = state.selectedRosterActivationWindow;
  if (route.alreadyActivatedAllowed !== true && window
    && (window.sideKey !== sideKey || window.pieceId !== actor.id
      || window.phase !== state.phase)) return false;
  const windowStage = String(window?.stage || "before_action");
  if (!officialCharacteristicStatusUseTimingV1(route.effectKind)
    .includes(windowStage)) return false;
  return !usedThisRound(state, route, actor.id);
}
function actorMatches(state, route, actor) {
  if ((!activePiece(actor) && !reserveStimpackSource(state, route, actor)) || actor.isStructure === true) return false;
  if (route.requiredActorTag && !tags(actor).has(route.requiredActorTag)) return false;
  if (route.requiredActorRace && raceForPiece(state, actor) !== route.requiredActorRace) {
    return false;
  }
  if (route.requiresUnengaged === true && engagedWithEnemy(state, actor)) return false;
  if (route.requiresBurrowed === true && !hasStatus(actor, "burrowed")) return false;
  if (route.requiresStationary === true && !hasStatus(actor, 'stationary')) return false;
  if ((route.effectKind === "grant_burrowed"
    || route.effectKind === 'burrow_toggle' && !hasStatus(actor, 'burrowed')) && cannotGainBurrowed(
    state.officialCharacteristicStatusFamilySourceBundle, state, actor)) return false;
  return true;
}
function actionActors(state, route, instance) {
  if (route.sourceKind === "unit_feature") return [instance.sourcePiece];
  return (state.pieces || []).filter((piece) => piece.sideKey === instance.sideKey
    && actorMatches(state, route, piece));
}
function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => (
    entry.cardInstanceId === id));
}
function paymentRef(state, card) {
  const profile = getOfficialCardBuildPaymentProfileV1(
    state.officialCardBuildPaymentDataBundle, card.officialCardRecordKey);
  return { cardInstanceId: card.cardInstanceId,
    recordKey: card.officialCardRecordKey,
    sourceRecordHash: card.sourceRecordHash,
    payloadHash: card.officialPayloadHash,
    profileHash: profile.profileHash,
    isReady: card.readiness === "ready" };
}
function quoteCorvidReactor(state, actor, route, cost, eligibleTargets) {
  if (route.sourceKind !== 'unit_feature' || actor.officialUnitRecordKey !== 'army_units:raven'
    || cost.resourceType !== 'CP' || cost.effectiveResourceCost <= 0 || !eligibleTargets.length) return null;
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  const passive = bundle && passiveRoutesForPiece(bundle, state, actor).find(
    entry => entry.definitionId === OFFICIAL_RAVEN_CORVID_REACTOR_DEFINITION_ID);
  if (!passive || [state.activeAbilityUseHistory, state.unitLifecycleUseHistory].some(history =>
    history?.some(entry => entry.pieceId === actor.id && entry.sideKey === actor.sideKey))) return null;

  const distances = (state.pieces || []).filter(unit => unit.sideKey === otherSide(actor.sideKey)
    && activePiece(unit) && liveModels(unit).length).map(unit => ({
    unitId: unit.id,
    distance: Math.min(...liveModels(actor).flatMap(model => liveModels(unit).map(targetModel =>
      evaluateOfficialBaseMeasurementV1({
        state, dataBundle: state.officialModelBaseGeometryDataBundle,
        source: { kind: 'model', unitId: actor.id, modelId: model.id },
        target: { kind: 'model', unitId: unit.id, modelId: targetModel.id },
      }).distanceMilliInches))),
  }));
  const minimum = Math.min(...distances.map(row => row.distance));
  const qualifying = distances.filter(row => row.distance === minimum
    && eligibleTargets.includes(row.unitId)).map(row => row.unitId).sort();
  if (!qualifying.length) return null;
  const reduction = Math.min(passive.commandPointReduction, cost.effectiveResourceCost);
  return { targets: qualifying, cost: { ...cost, resourceCostReduction: cost.resourceCostReduction + reduction,
    effectiveResourceCost: cost.effectiveResourceCost - reduction, sourcePieceId: actor.id,
    corvidReactorDefinitionId: passive.definitionId } };
}
function resourceCostContract(state, route, sideKey, actor, options = {}) {
  if (options.usePsionicLink) {
    const quote = quoteOfficialSelectedUnitPsionicLinkV1(state, { sideKey, pieceId: actor.id,
      resourceType: route.resourceType, printedResourceCost: route.resourceCost, planHash: options.planHash },
    { consume: options.consume === true });
    if (!quote) fail("ZAGARA_PSIONIC_LINK_PAYMENT_UNAVAILABLE");
    return quote;
  }
  const cost = !route.resourceType ? freezeDeep({ resourceType: null,
    printedResourceCost: 0, resourceCostReduction: 0,
    effectiveResourceCost: 0, sourcePieceId: null, trainingTruth: false })
    : state.officialBattlefieldAssetFamilySourceBundle
    ? resolveOfficialBattlefieldAssetAbilityResourceCostV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { sideKey, pieceId: actor.id, resourceType: route.resourceType,
        printedResourceCost: route.resourceCost,
        planHash: options.planHash || null },
      { consume: options.consume === true })
    : freezeDeep({ resourceType: route.resourceType,
      printedResourceCost: route.resourceCost, resourceCostReduction: 0,
      effectiveResourceCost: route.resourceCost, sourcePieceId: null,
      trainingTruth: false });
  const unitCost = quoteOfficialUnitAbilityModifiersV1(state, actor.id, route.sourceKind, cost);
  const reserveDiscount = reserveStimpackSource(state, route, actor);
  if (reserveDiscount) {
    const effectiveResourceCost = Math.max(reserveDiscount.minimumResourceCost,
      unitCost.effectiveResourceCost - reserveDiscount.resourceCostReduction);
    return { ...unitCost, effectiveResourceCost, resourceCostReduction: route.resourceCost - effectiveResourceCost,
      sourcePieceId: actor.id };
  }
  if (!options.useCorvidReactor) return unitCost;
  const quote = quoteCorvidReactor(state, actor, route, unitCost, [options.targetUnitId]);
  if (!quote) fail('RAVEN_CORVID_REACTOR_PAYMENT_UNAVAILABLE');
  return quote.cost;
}
function paymentSelections(state, route, sideKey, effectiveResourceCost) {
  if (!route.resourceType || effectiveResourceCost === 0) return [[]];
  const cards = (state.cardResources?.[sideKey] || []).filter((entry) => (
    entry.readiness === "ready"));
  const rows = [];
  for (let mask = 0; mask < (1 << cards.length); mask += 1) {
    const selected = cards.filter((_, index) => (mask & (1 << index)) !== 0);
    try {
      resolveOfficialAbilityResourcePaymentV1({
        cardDataBundle: state.officialCardBuildPaymentDataBundle,
        resourceType: route.resourceType,
        resourceCost: effectiveResourceCost,
        selectedCardInstanceSetComplete: true,
        selectedCardInstances: selected.map((card) => paymentRef(state, card)),
      });
      rows.push(selected.map((entry) => entry.cardInstanceId).sort());
    } catch { /* Invalid subsets are absent from LegalSpace. */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function abilityRequiresLineOfSight(state, route) {
  return state.officialTargetedActiveAbilityPolicy?.definitionIds.includes(route.definitionId) === true;
}
export function isOfficialUnitVisibleForActiveAbilityV1(state, actor, target) {
  if (actor.id === target.id) return true;
  const { projected } = projectOfficialRangedTerrainForLosV1(state);
  return liveModels(actor).some(model => liveModels(target).some(targetModel =>
    evaluateOfficialElevatedLineOfSightV1({ state: projected, attacker: actor,
      attackerModelId: model.id, target, targetModelId: targetModel.id,
      dataBundle: state.officialTerrainLosDataBundle }).visible));
}
export function createOfficialVisibleEnemyWithinFilterV1(state, actor, rangeMilliInches) {
  const { projected } = projectOfficialRangedTerrainForLosV1(state);
  const models = liveModels(actor);
  return target => target.sideKey === otherSide(actor.sideKey)
    && activePiece(target) && allowsOfficialAbilityUnitRecipientV13(state, target)
    && models.some(model => evaluateOfficialWithinWhollyWithinV1({
      state, dataBundle: state.officialModelBaseGeometryDataBundle,
      source: { kind: 'model', unitId: actor.id, modelId: model.id }, targetUnitId: target.id,
      rangeMilliInches: hasStatus(target, 'hidden') ? Math.min(4000, rangeMilliInches) : rangeMilliInches,
    }).assessments.some(row => row.within && evaluateOfficialElevatedLineOfSightV1({
      state: projected, attacker: actor, attackerModelId: model.id, target,
      targetModelId: row.modelId, dataBundle: state.officialTerrainLosDataBundle,
    }).visible));
}
function effectiveAbilityRange(state, route, actor) {
  if (route.effectKind !== 'optical_flare' || !state.officialRangedFamilySourceBundle) return route.rangeMilliInches;
  const modifiers = projectOfficialRangedFamilyModifiersV1(state.officialRangedFamilySourceBundle, state,
    {pieceId: actor.id, context: {abilityName: route.abilityName}});
  return modifiers.opticalFlareRangeMilliInches ?? route.rangeMilliInches;
}
function targetIds(state, route, actor, rangeMilliInches) {
  if (route.targetKind === 'executors_will_enemies') {
    return state.pieces.filter(target => target.sideKey !== actor.sideKey && activePiece(target)
      && canOfficialUnitBeAbilityTargetV1(state, target)).map(target => target.id).sort();
  }
  if (route.targetKind === 'friendly_unengaged_battlefield') {
    const engaged = new Set(deriveOfficialEngagementGraphV2(state).engagedUnitIds);
    return (state.pieces || []).filter(target => target.sideKey === actor.sideKey
      && activePiece(target) && target.isStructure !== true && canOfficialUnitBeAbilityTargetV1(state, target) && !engaged.has(target.id))
      .map(target => target.id).sort();
  }
  if (route.targetKind === 'enemy_battlefield') {
    const { projected } = projectOfficialRangedTerrainForLosV1(state);
    return (state.pieces || []).filter(target => target.sideKey === otherSide(actor.sideKey)
      && activePiece(target) && target.isStructure !== true && canOfficialUnitBeAbilityTargetV1(state, target)
      && liveModels(actor).some(model => (!hasStatus(target, 'hidden')
        || evaluateOfficialWithinWhollyWithinV1({ state, dataBundle: state.officialModelBaseGeometryDataBundle,
          source: { kind: 'model', unitId: actor.id, modelId: model.id }, targetUnitId: target.id,
          rangeMilliInches: 4000 }).unitWithin)
        && liveModels(target).some(targetModel => evaluateOfficialElevatedLineOfSightV1({
        state: projected, attacker: actor, attackerModelId: model.id,
        target, targetModelId: targetModel.id, dataBundle: state.officialTerrainLosDataBundle,
      }).visible))).map(target => target.id).sort();
  }
  if (route.targetKind === "enemy_within" && !abilityRequiresLineOfSight(state, route)) {
    return (state.pieces || []).filter((target) => target.sideKey === otherSide(actor.sideKey)
      && activePiece(target) && target.isStructure !== true && canOfficialUnitBeAbilityTargetV1(state, target)
      && unitWithin(state, actor, target, rangeMilliInches).within)
      .map((entry) => entry.id).sort();
  }
  if (route.targetKind === 'visible_infected_enemy_within') {
    return (state.pieces || []).filter(createOfficialVisibleEnemyWithinFilterV1(state, actor, rangeMilliInches))
      .filter(target=>hasStatus(target,'infestation')).map(target=>target.id).sort();
  }
  if (route.targetKind === 'visible_enemy_within'
    || route.targetKind === 'enemy_within' && abilityRequiresLineOfSight(state, route)) {
    return (state.pieces || []).filter(createOfficialVisibleEnemyWithinFilterV1(state, actor, rangeMilliInches))
      .map(target => target.id).sort();
  }
  if (route.targetKind === 'friendly_within') {
    return (state.pieces || []).filter(target => target.sideKey === actor.sideKey
      && activePiece(target) && canOfficialUnitBeAbilityTargetV1(state, target)
      && unitWithin(state, actor, target, rangeMilliInches).within
      && (!abilityRequiresLineOfSight(state, route) || isOfficialUnitVisibleForActiveAbilityV1(state, actor, target)))
      .map(target => target.id).sort();
  }
  if (route.targetKind === 'feedback_enemy') {
    return (state.pieces || []).filter(target => target.sideKey === otherSide(actor.sideKey)
      && activePiece(target) && canOfficialUnitBeAbilityTargetV1(state, target)
      && (tags(target).has('mechanical') || tags(target).has('psionic'))
      && unitWithin(state, actor, target, rangeMilliInches).within && isOfficialUnitVisibleForActiveAbilityV1(state, actor, target))
      .map(target => target.id).sort();
  }
  if (route.targetKind === "another_friendly_biological_within") {
    return (state.pieces || []).filter((target) => target.sideKey === actor.sideKey
      && target.id !== actor.id && activePiece(target) && target.isStructure !== true && canOfficialUnitBeAbilityTargetV1(state, target)
      && tags(target).has("biological")
      && unitWithin(state, actor, target, route.rangeMilliInches).within
      && (!abilityRequiresLineOfSight(state, route) || isOfficialUnitVisibleForActiveAbilityV1(state, actor, target)))
      .map((entry) => entry.id).sort();
  }
  return [];
}
function admiralFriendlyIds(state,route,actor,enemy){
  return state.pieces.filter(target=>target.sideKey===actor.sideKey&&activePiece(target)
    &&tags(target).has('infested')&&!tags(target).has('unique')&&canOfficialUnitBeAbilityTargetV1(state,target)
    &&allowsOfficialAbilityUnitRecipientV13(state,target)
    &&unitWithin(state,enemy,target,route.friendlyRangeMilliInches).within
    &&isOfficialUnitVisibleForActiveAbilityV1(state,actor,target)).map(target=>target.id).sort();
}
function engagedEnemyIds(state, actor) {
  return [...new Set(deriveOfficialEngagementGraphV2(state).modelEdges
    .filter(edge => edge.leftUnitId === actor.id || edge.rightUnitId === actor.id)
    .map(edge => edge.leftUnitId === actor.id ? edge.rightUnitId : edge.leftUnitId))]
    .filter(id => state.pieces.some(piece => piece.id === id && piece.sideKey !== actor.sideKey && activePiece(piece)))
    .sort();
}
function dutyRefreshChoices(state, route, instance, actor) {
  if (route.effectKind !== 'our_duty_is_unending') return null;
  const window = state.selectedRosterActivationWindow;
  if (!['movement', 'assault', 'combat'].includes(state.phase)
    || state.pendingAction || state.pendingOfficialReactionWindow
    || (window ? window.round !== Number(state.round)
      : !listOfficialPhaseActivationUnitIdsV1(state, actor.sideKey).includes(actor.id))) {
    fail('OUR_DUTY_ACTIVATION_WINDOW_REQUIRED');
  }
  if ((state.activeAbilityUseHistory || []).some(entry => entry.sideKey === actor.sideKey
      && entry.routeId === route.definitionId)) fail('OUR_DUTY_ALREADY_USED_THIS_GAME');
  const profileFor = key => getOfficialCardBuildPaymentProfileV1(state.officialCardBuildPaymentDataBundle, key);
  const profile = profileFor(route.recordKey);
  if (profile.cardKind !== 'faction' || instance.card?.sourceRecordHash !== profile.sourceRecordHash
    || instance.card.officialPayloadHash !== profile.payloadHash) fail('OUR_DUTY_FACTION_CARD_BINDING_INVALID');
  return listOfficialExhaustedTacticalCardIdsV1(state, actor.sideKey, profileFor);
}
function routeAvailable(state, route, instance, actor, authorizeSeekerCast) {
  if (route.effectKind === 'raven_seeker_missile' && authorizeSeekerCast?.(state, actor) !== true) {
    fail('RAVEN_SEEKER_MISSILE_FULL_CONTINUATION_REQUIRED');
  }
  if (instance.card?.readiness !== undefined && instance.card.readiness !== "ready") {
    fail("CHARACTERISTIC_STATUS_SOURCE_CARD_NOT_READY", instance.sourceInstanceId);
  }
  if (!activeTimingAvailable(state, route, instance.sideKey, actor)
    || !actorMatches(state, route, actor)) {
    fail("CHARACTERISTIC_STATUS_ROUTE_UNAVAILABLE", actor.id);
  }
  if (route.effectKind === "automatic_hits_engaged" && engagedEnemyIds(state, actor).length === 0) {
    fail("CHARACTERISTIC_STATUS_TARGET_UNAVAILABLE", route.abilityName);
  }
  if (route.effectKind === 'force_wall_pair') getOfficialForceWallFootprintV1(state);
  if (route.effectKind === 'force_wall_push' && !readOfficialFriendlyForceWallsV1(state, actor.sideKey).length) {
    fail('FORCE_WALL_PUSH_NO_FRIENDLY_WALLS');
  }
  const lightningCoverage = route.effectKind === 'force_wall_lightning'
    ? inspectOfficialPsiLightningCoverageV1(state, route, actor) : null;
  if (lightningCoverage && !lightningCoverage.length) fail('PSI_LIGHTNING_NO_AFFECTED_UNITS');
  let modelComparison = null;
  if (route.effectKind === 'scourge_queen') {
    const engagedEnemyUnitIds = engagedEnemyIds(state, actor);
    const activeUnitModelCount = liveModels(actor).length;
    const engagedEnemyModelCount = state.pieces.filter(piece => engagedEnemyUnitIds.includes(piece.id))
      .reduce((sum, piece) => sum + liveModels(piece).length, 0);
    if (activeUnitModelCount <= engagedEnemyModelCount) {
      fail('SCOURGE_QUEEN_REQUIRES_STRICT_MODEL_ADVANTAGE', actor.id);
    }
    modelComparison = { activeUnitModelCount, engagedEnemyModelCount, engagedEnemyUnitIds };
  }
  const rangeMilliInches = effectiveAbilityRange(state, route, actor);
  const targets = targetIds(state, route, actor, rangeMilliInches);
  if (route.effectKind === 'executors_will' && targets.length < 2) fail('EXECUTORS_WILL_REQUIRES_TWO_ENEMY_UNITS');
  if (route.targetKind && route.targetKind !== "friendly_ground_zerg_any_activation"
    && targets.length === 0) fail("CHARACTERISTIC_STATUS_TARGET_UNAVAILABLE", route.abilityName);
  const resourceCost = resourceCostContract(
    state, route, instance.sideKey, actor);
  const costChoices = [{ cost: resourceCost, targets }];
  const corvid = quoteCorvidReactor(state, actor, route, resourceCost, targets);
  if (corvid) costChoices.push(corvid);
  if (route.sourceKind === "unit_feature" && resourceCost.effectiveResourceCost === route.resourceCost) {
    const reduced = quoteOfficialSelectedUnitPsionicLinkV1(state, { sideKey: instance.sideKey, pieceId: actor.id,
      resourceType: route.resourceType, printedResourceCost: route.resourceCost });
    if (reduced) costChoices.push({ cost: reduced, targets });
  }
  const refreshChoices = dutyRefreshChoices(state, route, instance, actor);
  const available = costChoices.map(({ cost, targets: eligibleTargets }) => ({ targets: eligibleTargets, refreshChoices, rangeMilliInches,
    payments: paymentSelections(state, { ...route, resourceType: cost.resourceType }, instance.sideKey, cost.effectiveResourceCost),
    resourceCostsByChoice: { default: cost },
    ...(modelComparison ? { modelComparison } : {}),
    ...(lightningCoverage ? { lightningCoverage } : {}),
  })).filter(choice => choice.payments.length > 0);
  if (available.length === 0) fail("CHARACTERISTIC_STATUS_PAYMENT_UNAVAILABLE");
  return available;
}
function stimpackDamageResolution(state, route, actor, abilityResolutionHash) {
  return STIMPACK_DAMAGE.resolveNonLethalDamage({ targetPieceId: actor.id,
    targetModelId: (actor.isInReserves && reserveStimpackSource(state, route, actor)
      ? actor.models.find(model => !model.isDestroyed) : liveModels(actor)[0])?.id, abilityResolutionHash,
    priorDamageMarker: Number(actor.damageMarker || 0), amount: route.nonLethalDamage,
    targetHitPoints: resolveOfficialEffectiveCombatProfileV1(state, actor).hitPoints });
}
function domainFor(state, route, instance, actor, available) {
  const coordinatedStrike = route.effectKind === 'coordinated_strike'
    && hasOfficialCoordinatedStrikeCurrentConsumerV1(state);
  const nonLethal = route.effectKind === "stimpack" && route.nonLethalDamage > 0
    && hasOfficialNonLethalDamagePolicyV1(state)
    ? stimpackDamageResolution(state, route, actor, hashStarcraftTmgContract({
      definitionId: route.definitionId, actorId: actor.id,
      round: Number(state.round), phase: state.phase,
      damageMarker: Number(actor.damageMarker || 0), purpose: "query_prediction",
    })) : null;
  const required = ["activeUnitId", "paymentCardInstanceIds"];
  const admiral=route.effectKind==='infestation_activation_exchange';
  if(admiral)required.push('friendlyUnitId');
  if (available.refreshChoices) required.push('refreshCardInstanceIds');
  const broodmotherChoices = route.effectKind === 'broodmother_army_buff'
    ? Object.keys(route.choices).filter(choice => !(state.activeAbilityUseHistory || []).some(entry =>
      entry.routeId === route.definitionId && entry.pieceId === actor.id && entry.sideKey === actor.sideKey
      && entry.round === Number(state.round) - 1 && entry.broodmotherEffect === choice))
    : null;
  if (broodmotherChoices) required.push('broodmotherEffect');
  if (route.effectKind === 'marker_speed_debuff') required.push('coordinate');
  const forceWall = route.effectKind === 'force_wall_pair';
  const pushWalls = route.effectKind === 'force_wall_push' ? readOfficialFriendlyForceWallsV1(state, actor.sideKey) : null;
  const wallCount = forceWall ? OFFICIAL_FORCE_WALL_TOKEN_COUNT : pushWalls?.length;
  if (wallCount) required.push('positions');
  const executorsWill = route.effectKind === 'executors_will';
  if (executorsWill) required.push("targetUnitIds");
  else if (available.targets.length > 0) required.push("targetUnitId");
  const hitsTargets = route.effectKind === "automatic_hits_engaged" ? engagedEnemyIds(state, actor) : null;
  if (hitsTargets?.length > 1) required.push("targetOrder");
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_PARAMETER_KIND,
    executorId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    actionType: "resolve_characteristic_status_ability",
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    parameterSchema: { type: "object", required,
      ...(hitsTargets?.length > 1 ? { targetOrder: { type: "array", uniqueItems: true,
        minItems: hitsTargets.length, maxItems: hitsTargets.length, items: { enum: hitsTargets } } } : {}),
      activeUnitId: { const: actor.id },
      paymentCardInstanceIds: { enum: clone(available.payments) },
      ...(admiral?{friendlyUnitId:{enum:['skip',...[...new Set(available.targets.flatMap(id=>
        admiralFriendlyIds(state,route,actor,state.pieces.find(p=>p.id===id))))].sort()]}}:{}),
      ...(available.refreshChoices ? { refreshCardInstanceIds: { type: 'array', minItems: 0,
        maxItems: route.maxRefreshedCards, uniqueItems: true, items: { enum: available.refreshChoices } } } : {}),
      ...(broodmotherChoices ? { broodmotherEffect: { enum: broodmotherChoices } } : {}),
      ...(route.effectKind === 'marker_speed_debuff' ? { coordinate: { type: 'object',
        required: ['xMilliInches', 'yMilliInches'], additionalProperties: false,
        properties: { xMilliInches: { type: 'integer', minimum: 0,
          maximum: Math.round(state.officialBattlefieldTokenMarkerRegistry.battlefield.widthInches * 1000) },
        yMilliInches: { type: 'integer', minimum: 0,
          maximum: Math.round(state.officialBattlefieldTokenMarkerRegistry.battlefield.heightInches * 1000) } } } } : {}),
      ...(wallCount ? { positions: { type: 'array', minItems: wallCount,
        maxItems: wallCount, items: { type: 'object', additionalProperties: false,
          required: ['xMilliInches', 'yMilliInches', 'rotationDegrees', ...(pushWalls ? ['tokenId'] : [])],
          properties: { xMilliInches: { type: 'integer' }, yMilliInches: { type: 'integer' },
            rotationDegrees: { type: 'number' },
            ...(pushWalls ? { tokenId: { enum: pushWalls.map(row => row.token.tokenId) } } : {}) } } } } : {}),
      ...(executorsWill ? { targetUnitIds: { type: 'array', minItems: 2, maxItems: 2, uniqueItems: true,
        items: { enum: clone(available.targets) } } } : {}),
      targetUnitId: !executorsWill && available.targets.length > 0
        ? { enum: clone(available.targets) } : null },
    constraints: { ...(executorsWill ? { executorsWill: { triggerPhase: 'assault', requiresLineOfSight: false,
      expiresAfterFirstEnemyActivation: true, consecutiveFriendlyActivations: 2 } } : {}), useTiming: [
      ...officialCharacteristicStatusUseTimingV1(route.effectKind),
    ],
      oncePerRoundPerUnitAndName: true,
      alreadyActivatedAllowed: route.alreadyActivatedAllowed === true,
      sourceCardInstanceId: instance.card?.cardInstanceId || null,
      resourceType: available.resourceCostsByChoice.default.resourceType, resourceCost: route.resourceCost,
      resourceCostsByChoice: clone(available.resourceCostsByChoice),
      ...(available.modelComparison ? { modelComparison: clone(available.modelComparison) } : {}),
      ...(broodmotherChoices ? { broodmotherEffects: clone(route.choices),
        affectedSide: 'friendly', affectedUnits: 'battlefield',
        lineOfSightRequired: false, expiresAt: route.expiresAt } : {}),
      rangeMilliInches: coordinatedStrike ? null :
        (state.officialEffectiveAbilityRangeDisclosure ? available.rangeMilliInches : route.rangeMilliInches) || null,
      ...(abilityRequiresLineOfSight(state, route) || (route.effectKind === 'target_lock' && route.lineOfSightRequired === true)
        ? { lineOfSightRequired: true } : {}),
      ...(coordinatedStrike ? { coordinatedStrike: { selectedUnitScope: 'battlefield',
        selectedUnitLineOfSightRequired: false, weaponName: route.weaponScope,
        actingModelRangeMilliInches: route.rangeMilliInches, enemyVisibilityFromActingModelRequired: true,
        printedWeaponRangeMayBeKept: true } } : {}),
      ...(route.effectKind === 'marker_speed_debuff' ? { placementRangeMilliInches: route.placementRangeMilliInches,
        areaEffect: { markerKind: 'faction_indicator', rangeMilliInches: route.rangeMilliInches,
          speedPenalty: route.speedPenalty, affectedSide: 'enemy', expiresAt: route.expiresAt } } : {}),
      ...(forceWall ? { forceWall: { ...getOfficialForceWallFootprintV1(state), count: OFFICIAL_FORCE_WALL_TOKEN_COUNT,
        whollyWithinMilliInches: route.rangeMilliInches, mutuallyUnoccupied: true,
        expiresAt: route.expiresAt } } : {}),
      ...(pushWalls ? { forceWallPush: { whollyWithinMilliInches: route.rangeMilliInches, source: 'each_current_wall_base',
        mutuallyUnoccupied: true, originByTokenId: Object.fromEntries(pushWalls.map(({ token }) => [token.tokenId, {
          coordinate: token.coordinate, baseRotationDegrees: token.baseRotationDegrees, tokenHash: token.tokenHash,
        }])) } } : {}),
      ...(available.lightningCoverage ? { psiLightning: { rangeMilliInches: route.rangeMilliInches,
        damagePerAffectedUnit: route.damageAmount, affectedUnits: clone(available.lightningCoverage),
        requiresAttackRolls: false, additiveAcrossWalls: false } } : {}),
      strategicImmediateValue: route.effectKind === "fixed_heal" ? {
        kind: "heal",
        targetPieceId: actor.id,
        damageMarkerBefore: Number(actor.damageMarker || 0),
        printedHeal: Number(route.healValue || 0),
        effectiveHeal: Math.min(Number(actor.damageMarker || 0),
          Number(route.healValue || 0)),
        zeroBenefit: Number(actor.damageMarker || 0) <= 0,
        rulesDerived: true,
        trainingTruth: false,
      } : null,
      ...(nonLethal ? { nonLethalDamage: {
        amount: nonLethal.nonLethalDamage,
        damageMarkerBefore: nonLethal.priorDamageMarker,
        damageMarkerAfter: nonLethal.postDamageMarker,
        immediateCasualtyRemoval: false,
      } } : {}),
      ...(hitsTargets ? { automaticHits: { targetUnitIds: hitsTargets, hits: route.hits, damagePerHit: route.damagePerHit } } : {}),
      sourceRouteHash: route.routeHash },
    confirmationClass: "rules_owned_direct_action",
    rulesTruth: "official_current_product_characteristic_status_parameter_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function enumerate(bundle, state, options = {}, authorizeSeekerCast = null) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("CHARACTERISTIC_STATUS_SIDE_INVALID", sideKey);
  const parameterDomains = [];
  const candidates = [];
  const catalogueScope = options.scope === "catalogue";
  for (const route of bundle.routes) {
    if (route.actionKind !== "active_ability") continue;
    for (const instance of routeInstances(state, route).filter((entry) => (
      catalogueScope || entry.sideKey === sideKey))) {
      for (const actor of actionActors(state, route, instance)) {
        try {
          for (const available of routeAvailable(state, route, instance, actor, authorizeSeekerCast)) {
            parameterDomains.push(domainFor(state, route, instance, actor, available));
          }
        } catch (error) {
          if (options.includeDisabled === true) candidates.push({
            actionType: "resolve_characteristic_status_ability",
            definitionId: route.definitionId,
            sourceInstanceId: instance.sourceInstanceId,
            pieceId: actor.id,
            sideKey: actor.sideKey,
            effectKind: route.effectKind,
            executorId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
            executorVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
            isEnabled: false,
            disabledReason: String(error?.message || error).split(":")[0],
            score: 0, details: { trainingTruth: false },
          });
        }
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_characteristic_status_legal_space_v1",
    runtimeId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    candidates: candidates.sort((left, right) => (
      `${left.definitionId}:${left.sourceInstanceId}:${left.pieceId}`.localeCompare(
        `${right.definitionId}:${right.sourceInstanceId}:${right.pieceId}`))),
    parameterDomains: parameterDomains.sort((left, right) => (
      left.domainId.localeCompare(right.domainId))),
    queryOnlyDefinitionIds: bundle.routes.filter((entry) => (
      entry.actionKind !== "active_ability")).map((entry) => entry.definitionId).sort(),
    currentProductCharacteristicStatusDenominatorComplete: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}

function instantiate(bundle, state, domain, parameters = {}, authorizeSeekerCast = null) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey,
    includeDisabled: true }, authorizeSeekerCast).parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("CHARACTERISTIC_STATUS_PARAMETER_DOMAIN_STALE");
  }
  const route = bundle.routes.find((entry) => entry.definitionId === domain.definitionId);
  const actor = state.pieces.find((entry) => entry.id === domain.pieceId);
  if (!route || !actor || !object(parameters)
    || parameters.activeUnitId !== actor.id) fail("CHARACTERISTIC_STATUS_ACTION_INPUT_INVALID");
  if (route.effectKind === 'poisonous_essence' && Object.keys(parameters)
    .some(key => !['activeUnitId', 'paymentCardInstanceIds'].includes(key))) {
    fail('POISONOUS_ESSENCE_SEMANTIC_ONLY');
  }
  const paymentCardInstanceIds = [...new Set((parameters.paymentCardInstanceIds || [])
    .map(String))].sort();
  if (!domain.parameterSchema.paymentCardInstanceIds.enum.some((entry) => (
    isDeepStrictEqual(entry, paymentCardInstanceIds)))) {
    fail("CHARACTERISTIC_STATUS_PAYMENT_SELECTION_INVALID");
  }
  const targetUnitId = parameters.targetUnitId === undefined
    ? null : String(parameters.targetUnitId);
  if (targetUnitId !== null && !domain.parameterSchema.targetUnitId) {
    fail("CHARACTERISTIC_STATUS_TARGET_SELECTION_INVALID", targetUnitId);
  }
  if (domain.parameterSchema.targetUnitId
    && !domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)) {
    fail("CHARACTERISTIC_STATUS_TARGET_SELECTION_INVALID", targetUnitId);
  }
  const refreshSelection = domain.parameterSchema.refreshCardInstanceIds;
  const refreshCardInstanceIds = parameters.refreshCardInstanceIds;
  if (refreshSelection && (!Array.isArray(refreshCardInstanceIds)
    || refreshCardInstanceIds.length > refreshSelection.maxItems
    || new Set(refreshCardInstanceIds).size !== refreshCardInstanceIds.length
    || refreshCardInstanceIds.some(id => !refreshSelection.items.enum.includes(id))
    || Object.keys(parameters).some(key => !['activeUnitId', 'paymentCardInstanceIds', 'refreshCardInstanceIds'].includes(key)))) {
    fail('OUR_DUTY_REFRESH_SELECTION_INVALID');
  }
  const targetUnitIds = parameters.targetUnitIds;
  if (route.effectKind === 'executors_will') {
    if (Object.keys(parameters).some(key => !['activeUnitId', 'paymentCardInstanceIds', 'targetUnitIds'].includes(key))
      || !Array.isArray(targetUnitIds) || targetUnitIds.length !== 2 || new Set(targetUnitIds).size !== 2
      || targetUnitIds.some(id => !domain.parameterSchema.targetUnitIds.items.enum.includes(id))) {
      fail('EXECUTORS_WILL_TARGET_SELECTION_INVALID');
    }
  } else if (targetUnitIds !== undefined) {
    fail('CHARACTERISTIC_STATUS_TARGET_SELECTION_INVALID');
  }
  let automaticHits = null;
  let friendlyUnitId;
  if(route.effectKind==='infestation_activation_exchange'){
    friendlyUnitId=parameters.friendlyUnitId;
    const enemy=state.pieces.find(p=>p.id===targetUnitId);
    if(!enemy||typeof friendlyUnitId!=='string'||(friendlyUnitId!=='skip'&&!admiralFriendlyIds(state,route,actor,enemy).includes(friendlyUnitId))
      ||Object.keys(parameters).some(k=>!['activeUnitId','paymentCardInstanceIds','targetUnitId','friendlyUnitId'].includes(k)))fail('ADMIRAL_FRIENDLY_SELECTION_INVALID');
  }else if(parameters.friendlyUnitId!==undefined)fail('CHARACTERISTIC_STATUS_UNEXPECTED_FRIENDLY_TARGET');
  const broodmotherEffect = parameters.broodmotherEffect;
  if (domain.parameterSchema.broodmotherEffect
    && !domain.parameterSchema.broodmotherEffect.enum.includes(broodmotherEffect)) {
    fail('CHARACTERISTIC_STATUS_BROODMOTHER_EFFECT_INVALID');
  }
  const areaPlacement = route.effectKind === 'marker_speed_debuff'
    ? inspectOfficialCharacteristicAreaPlacementV1({ state, route, actor, coordinate: parameters.coordinate }) : null;
  const forceWall = route.effectKind === 'force_wall_pair';
  const forceWallPush = route.effectKind === 'force_wall_push';
  if (route.effectKind === 'force_wall_lightning'
    && Object.keys(parameters).some(key => !['activeUnitId', 'paymentCardInstanceIds'].includes(key))) {
    fail('PSI_LIGHTNING_SEMANTIC_PARAMETERS_ONLY');
  }
  if ((forceWall || forceWallPush)
    && Object.keys(parameters).some(key => !['activeUnitId', 'paymentCardInstanceIds', 'positions'].includes(key))) {
    fail('FORCE_WALL_SEMANTIC_PARAMETERS_ONLY');
  }
  const forceWallPlacement = forceWall ? prepareOfficialForceWallPairV1(state, route, actor, parameters.positions)
    : forceWallPush ? prepareOfficialForceWallPushV1(state, route, actor, parameters.positions) : null;
  if (route.effectKind === "automatic_hits_engaged") {
    const targets = engagedEnemyIds(state, actor);
    const order = targets.length > 1 ? parameters.targetOrder : targets;
    if (!targets.length || !Array.isArray(order) || order.length !== targets.length
      || new Set(order).size !== targets.length || order.some(id => !targets.includes(id))
      || Object.keys(parameters).some(key => !["activeUnitId", "paymentCardInstanceIds", ...(targets.length > 1 ? ["targetOrder"] : [])].includes(key))) {
      fail("CHARACTERISTIC_STATUS_HITS_TARGET_ORDER_INVALID");
    }
    automaticHits = { targetUnitIds: clone(order), hits: route.hits, damagePerHit: route.damagePerHit };
  }
  const canonicalParameters = { activeUnitId: actor.id,
    ...(friendlyUnitId!==undefined?{friendlyUnitId}:{}),
    paymentCardInstanceIds, ...(targetUnitId ? { targetUnitId } : {}),
    ...(targetUnitIds ? { targetUnitIds: [...targetUnitIds].sort() } : {}),
    ...(refreshSelection ? { refreshCardInstanceIds: [...refreshCardInstanceIds].sort() } : {}),
    ...(domain.parameterSchema.broodmotherEffect ? { broodmotherEffect } : {}),
    ...(areaPlacement ? { coordinate: areaPlacement.coordinate } : {}),
    ...(forceWallPlacement ? { positions: forceWallPlacement.positions } : {}),
    ...(automaticHits && automaticHits.targetUnitIds.length > 1 ? { targetOrder: clone(automaticHits.targetUnitIds) } : {}) };
  const plan = seal({
    schema: "starcraft_tmg_official_characteristic_status_ability_plan_v1",
    semanticVersion: "1.0.0",
    domainId: domain.domainId,
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: domain.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    canonicalParameters,
    ...(domain.constraints.resourceCostsByChoice.default.psionicLinkDefinitionId ? { usePsionicLink: true } : {}),
    ...(domain.constraints.resourceCostsByChoice.default.corvidReactorDefinitionId ? { useCorvidReactor: true } : {}),
    ...(automaticHits ? { automaticHits } : {}),
    ...(domain.constraints.psiLightning ? { lightningCoverage: clone(domain.constraints.psiLightning.affectedUnits) } : {}),
    ...(domain.constraints.modelComparison ? { modelComparison: clone(domain.constraints.modelComparison) } : {}),
    sourceRouteHash: route.routeHash,
    rulesTruth: "official_current_product_characteristic_status_ability_plan",
    trainingTruth: false,
  }, "planHash");
  const action = freezeDeep({
    actionType: "resolve_characteristic_status_ability",
    sideKey: actor.sideKey,
    phase: state.phase,
    pieceId: actor.id,
    definitionId: route.definitionId,
    abilityName: route.abilityName,
    characteristicStatusPlan: plan,
    executorId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
  });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_characteristic_status_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}, authorizeSeekerCast = null) {
  const instantiated = instantiate(bundle, state, request.domain, request.parameters || {}, authorizeSeekerCast);
  return seal({
    schema: "starcraft_tmg_official_characteristic_status_preview_v1",
    semanticVersion: "1.0.0",
    action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    confirmationClass: request.domain.confirmationClass,
    mutationApplied: false,
    rulesAuthority: true,
    rulesTruth: "official_current_product_characteristic_status_preview",
    trainingTruth: false,
  }, "previewHash");
}
function status(route, state, actor, target, properties = {}) {
  const body = {
    schema: "starcraft_tmg_official_characteristic_status_effect_v1",
    statusName: properties.statusName,
    statusKind: properties.statusKind || "status",
    characteristic: properties.characteristic || null,
    modifier: properties.modifier ?? null,
    sourceSideKey: actor.sideKey,
    sourcePieceId: actor.id,
    targetPieceId: target.id,
    sourceDefinitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceAdapterId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    roundApplied: Number(state.round),
    expiresAt: properties.expiresAt ?? route.expiresAt ?? null,
    ...properties,
    trainingTruth: false,
  };
  return seal(body, "statusEffectHash");
}
function effect(route, state, actor, target, properties = {}) {
  const body = {
    schema: "starcraft_tmg_official_characteristic_status_runtime_effect_v1",
    effectId: hashStarcraftTmgContract({ round: state.round, phase: state.phase,
      sourceDefinitionId: route.definitionId, actorId: actor.id,
      targetId: target.id, ordinal: state.log?.length || 0 }).slice(0, 24),
    effectKind: route.effectKind,
    abilityName: route.abilityName,
    sourceSideKey: actor.sideKey,
    sourcePieceId: actor.id,
    targetPieceId: target.id,
    sourceDefinitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    roundApplied: Number(state.round),
    phaseApplied: state.phase,
    expiresAt: route.expiresAt ?? null,
    ...(route.effectKind === 'first_weapon_keyword' && usesWave3FaqClarifications(state) ? { bindFirstWeapon: true } : {}),
    ...properties,
    trainingTruth: false,
  };
  return seal(body, "effectHash");
}
function appendEffect(piece, value) {
  piece.officialAbilityEffects = piece.officialAbilityEffects || [];
  piece.officialAbilityEffects.push(value);
}
export function applyOfficialHiddenLossCharacteristicEffectsV1(state, route, target, sourceCardInstanceId) {
  if (route.effectKind !== 'hidden_loss_might' || route.speedModifier !== 2 || route.criticalHit !== 2
    || route.definitionId !== 'card:nerazim/might-of-the-nerazim-any@1') {
    fail('CHARACTERISTIC_HIDDEN_LOSS_SOURCE_REQUIRED');
  }
  const speed = effect({ ...route, effectKind: 'speed_buff', expiresAt: 'cleanup_and_refresh' }, state, target, target,
    { speedModifier: route.speedModifier, sourceCardInstanceId });
  const weapon = effect({ ...route, effectKind: 'first_weapon_keyword', expiresAt: 'cleanup_and_refresh' }, state, target, target,
    { weaponScope: 'all', keyword: 'critical_hit', value: route.criticalHit, remainingUses: 1, sourceCardInstanceId });
  appendEffect(target, speed);
  appendEffect(target, weapon);
  const markerStatus = status(route, state, target, target, { statusName: 'BUFF Speed (2)', statusKind: 'buff',
    characteristic: 'speed', modifier: route.speedModifier, expiresAt: 'cleanup_and_refresh', sourceCardInstanceId });
  addStatus(target, markerStatus);
  state.board.effectMarkers = state.board.effectMarkers || [];
  state.board.effectMarkers.push(markerFor(markerStatus));
  return { speedEffectHash: speed.effectHash, firstWeaponEffectHash: weapon.effectHash };
}
function addStatus(piece, value) {
  piece.statuses = piece.statuses || [];
  piece.statuses.push(value);
}
function removeStatus(piece, names) {
  const normalizedNames = new Set(names.map(normalized));
  piece.statuses = (piece.statuses || []).filter((entry) => (
    !normalizedNames.has(statusName(entry))));
}
function markerFor(value) {
  return seal({ schema: "starcraft_tmg_official_characteristic_status_marker_v1",
    id: `status-marker-${value.statusEffectHash.slice(0, 24)}`,
    markerType: value.statusKind,
    label: value.statusName,
    targetPieceId: value.targetPieceId,
    sourceDefinitionId: value.sourceDefinitionId,
    statusEffectHash: value.statusEffectHash,
    expiresAt: value.expiresAt,
    trainingTruth: false }, "markerHash");
}
function applyHeal(state, route, actor, target, healValue, events) {
  const before = Number(target.damageMarker || 0);
  const effectiveHeal = Math.min(before, Math.max(0, Number(healValue)));
  target.damageMarker = before - effectiveHeal;
  synchronizeOfficialEffectiveHitPointWoundsV1(state, target, { includeUnmodifiedProfiles: true });
  const resolution = seal({ schema: "starcraft_tmg_official_characteristic_status_heal_v1",
    sourceDefinitionId: route.definitionId, sourcePieceId: actor.id,
    targetPieceId: target.id, healValue: Number(healValue),
    damageMarkerBefore: before, effectiveHeal,
    discardedHeal: Number(healValue) - effectiveHeal,
    damageMarkerAfter: target.damageMarker,
    destroyedModelsReturned: 0, shieldedStatusRestored: false,
    rulesTruth: "official_heal_removes_accumulated_damage_only",
    trainingTruth: false }, "healResolutionHash");
  events.push({ type: "heal_resolved", targetPieceId: target.id,
    healResolutionHash: resolution.healResolutionHash,
    effectiveHeal, trainingTruth: false });
  return resolution;
}
function applyBurrow(state, route, actor, target, mode, events) {
  if (mode === "gain") {
    if (cannotGainBurrowed(state.officialCharacteristicStatusFamilySourceBundle, state, target)) {
      fail('UNIT_RESTRICTION_BURROWED_PROHIBITED', target.id);
    }
    if (!hasStatus(target, "burrowed")) {
      const burrowed = status(route, state, actor, target,
        { statusName: "burrowed", statusKind: "status", expiresAt: null });
      const hidden = status(route, state, actor, target,
        { statusName: "hidden", statusKind: "status", expiresAt: null,
          dependentOnStatusName: "burrowed" });
      addStatus(target, burrowed); addStatus(target, hidden);
      state.board.effectMarkers.push(markerFor(burrowed), markerFor(hidden));
    }
  } else {
    const removedHashes = new Set((target.statuses || []).filter((entry) => (
      ["burrowed", "hidden"].includes(statusName(entry)))).map((entry) => (
      entry.statusEffectHash)).filter(Boolean));
    removeStatus(target, ["burrowed", "hidden"]);
    state.board.effectMarkers = (state.board.effectMarkers || []).filter((entry) => (
      !removedHashes.has(entry.statusEffectHash)));
  }
  events.push({ type: `burrowed_status_${mode === "gain" ? "gained" : "removed"}`,
    targetPieceId: target.id, sourceDefinitionId: route.definitionId,
    hiddenStatusFollowsBurrowed: true, trainingTruth: false });
}
// This release consumes Burrowed in ordinary actions as well as active abilities.
export function isOfficialBurrowedCoreActorV1(state, piece) {
  return state.officialCharacteristicConsumerPolicy?.burrowedCoreActions === true
    && hasOfficialCharacteristicConsumerPolicyV1(state) && hasStatus(piece, "burrowed");
}

export function requiresOfficialBurrowedCloseRanksV1(state, piece) {
  return state.officialCharacteristicConsumerPolicy?.burrowedCombatCloseRanks === true
    && isOfficialBurrowedCoreActorV1(state, piece);
}

function applyRegenerationAtActivationStart(bundle, state, piece, events) {
  if (!piece || state.phase !== "assault" || !hasStatus(piece, "burrowed")) return;
  const route = bundle?.routes.find(entry => entry.effectKind === "regeneration"
    && entry.recordKey === piece.officialUnitRecordKey && fieldedFeature(piece, entry));
  const key = `${state.round}:${state.phase}:activation_start:${piece.id}`;
  if (route && !state.characteristicStatusLifecycleHistory?.some(entry => entry.lifecycleKey === key)) {
    applyHeal(state, route, piece, piece, route.healValue, events);
  }
}

export function consumeOfficialCharacteristicActivationStartV1(state, piece, events) {
  if (state.selectedRosterActivationWindow || piece.activatedPhases?.[state.phase]
    || !isOfficialBurrowedCoreActorV1(state, piece)) return;
  const startEvents = [];
  applyRegenerationAtActivationStart(state.officialCharacteristicStatusFamilySourceBundle, state, piece, startEvents);
  if (!startEvents.length) return;
  (state.characteristicStatusLifecycleHistory ??= []).push({
    lifecycleKey: `${state.round}:${state.phase}:activation_start:${piece.id}`,
    round: Number(state.round), phase: state.phase, eventKind: "activation_start",
    pieceId: piece.id, removedStatusEffectHashes: [], events: clone(startEvents), trainingTruth: false,
  });
  events.push(...startEvents);
}

export function consumeOfficialCharacteristicBurrowedMovementV1(state, piece, events) {
  if (!isOfficialBurrowedCoreActorV1(state, piece)) return;
  const route = state.officialCharacteristicStatusFamilySourceBundle.routes.find(entry =>
    entry.effectKind === "burrow_toggle" && entry.recordKey === piece.officialUnitRecordKey);
  if (route) applyBurrow(state, route, piece, piece, "lose", events);
}

function applyEffect(state, route, actor, action, events) {
  const targetId = action.characteristicStatusPlan.canonicalParameters.targetUnitId;
  const target = targetId ? state.pieces.find((entry) => entry.id === targetId) : actor;
  if (!target) fail("CHARACTERISTIC_STATUS_APPLY_TARGET_UNKNOWN", String(targetId || ""));
  if(route.effectKind==='infestation_spread'){
    const prior=(target.statuses||[]).filter(s=>statusName(s)==='infestation').map(s=>s.statusEffectHash).filter(Boolean);
    removeStatus(target,['infestation']);
    state.board.effectMarkers=(state.board.effectMarkers||[]).filter(m=>!prior.includes(m.statusEffectHash));
    const value=status(route,state,actor,target,{statusName:'INFESTATION',statusKind:'debuff',expiresAt:null});
    addStatus(target,value);state.board.effectMarkers.push(markerFor(value));
    events.push({type:'infestation_status_applied',sourcePieceId:actor.id,targetPieceId:target.id,
      sourceDefinitionId:route.definitionId,statusEffectHash:value.statusEffectHash,trainingTruth:false});
  }else if(route.effectKind==='infestation_activation_exchange'){
    const id=action.characteristicStatusPlan.canonicalParameters.friendlyUnitId;
    const resolution=resolveOfficialInfestationActivationExchangeV1({state,route,actor,enemy:target,
      friendly:id==='skip'?null:state.pieces.find(p=>p.id===id),eligibleFriendlyUnitIds:admiralFriendlyIds(state,route,actor,target)});
    state.officialInfestationActivationExchangeHistory=[...(state.officialInfestationActivationExchangeHistory||[]),resolution];
    events.push({type:'infestation_activation_exchanged',...resolution});
  }else if (route.effectKind === 'our_duty_is_unending') {
    const cardInstanceIds = action.characteristicStatusPlan.canonicalParameters.refreshCardInstanceIds;
    for (const cardInstanceId of cardInstanceIds) cardById(state, actor.sideKey, cardInstanceId).readiness = 'ready';
    events.push({ type: 'our_duty_tactical_cards_refreshed', sideKey: actor.sideKey,
      sourceDefinitionId: route.definitionId, cardInstanceIds, trainingTruth: false });
  } else if (route.effectKind === 'poisonous_essence') {
    if (!state.officialPoisonousEssencePolicy) fail('POISONOUS_ESSENCE_POLICY_REQUIRED');
    const value = status(route, state, actor, actor, { statusName: route.abilityName,
      statusKind: 'faction_indicator', effectKind: route.effectKind, nonLethalDamage: route.nonLethalDamage,
      triggerPhase: 'assault', expiresAt: 'cleanup_and_refresh' });
    addStatus(actor, value); state.board.effectMarkers.push(markerFor(value));
    events.push({ type: 'poisonous_essence_marked', pieceId: actor.id, sourceDefinitionId: route.definitionId,
      markHash: value.statusEffectHash, markerTargetPieceId: actor.id, triggerPhase: 'assault',
      expiresAt: 'cleanup_and_refresh', trainingTruth: false });
  } else if (route.effectKind === 'broodmother_army_buff') {
    const choice = action.characteristicStatusPlan.canonicalParameters.broodmotherEffect;
    const { minimumSize, maximumSize, ...modifiers } = route.choices[choice];
    const affectedPieceIds = [];
    for (const friendly of state.pieces) {
      if (friendly.sideKey !== actor.sideKey || !activePiece(friendly)) continue;
      const size = friendly.sizeCharacteristic;
      if (!Number.isSafeInteger(size) || size < 0) {
        fail('CHARACTERISTIC_STATUS_CURRENT_TARGET_SIZE_REQUIRED', friendly.id);
      }
      if (size < minimumSize || (maximumSize !== null && size > maximumSize)) continue;
      appendEffect(friendly, effect(route, state, actor, friendly, { choice, ...modifiers }));
      affectedPieceIds.push(friendly.id);
    }
    events.push({ type: 'broodmother_effect_applied', choice,
      affectedPieceIds: affectedPieceIds.sort(), expiresAt: route.expiresAt, trainingTruth: false });
  } else if (route.effectKind === "automatic_hits_engaged") {
    if (state.pendingOfficialAutomaticHits) fail("CHARACTERISTIC_STATUS_HITS_ALREADY_PENDING");
    state.pendingOfficialAutomaticHits = seal({
      schema: "starcraft_tmg_automatic_hits_source_checkpoint_v1", round: Number(state.round), phase: state.phase,
      sideKey: actor.sideKey, pieceId: actor.id, definitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, sourceRouteHash: route.routeHash,
      abilityName: route.abilityName, sourcePlanHash: action.characteristicStatusPlan.planHash,
      automaticHits: clone(action.characteristicStatusPlan.automaticHits), stage: "ready", trainingTruth: false,
    }, "parentHash");
    events.push({ type: "automatic_hits_declared", pieceId: actor.id, sourceDefinitionId: route.definitionId,
      automaticHits: clone(action.characteristicStatusPlan.automaticHits), hitRollRequired: false, surgeAllowed: false });
  } else if (route.effectKind === 'khalas_gift') {
    events.push(grantOfficialKhalasGiftV1(state, { source: actor, target, planHash: action.characteristicStatusPlan.planHash }));
  } else if (route.effectKind === 'executors_will') {
    events.push(markOfficialExecutorsWillTargetsV1(state, route, action, actor));
  } else if (route.effectKind === 'force_wall_pair') {
    applyOfficialForceWallPairV1(state, route, action, actor, events);
  } else if (route.effectKind === 'force_wall_push') {
    applyOfficialForceWallPushV1(state, route, action, actor, events);
  } else if (route.effectKind === 'force_wall_lightning') {
    if (state.pendingOfficialAutomaticHits) fail('PSI_LIGHTNING_ANOTHER_DAMAGE_SEQUENCE_PENDING');
    const plan = action.characteristicStatusPlan;
    state.pendingOfficialAutomaticHits = seal({
      schema: 'starcraft_tmg_automatic_hits_source_checkpoint_v1', round: Number(state.round), phase: state.phase,
      sideKey: actor.sideKey, pieceId: actor.id, definitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, sourceRouteHash: route.routeHash,
      abilityName: route.abilityName, sourcePlanHash: plan.planHash,
      directDamage: { damageAmount: route.damageAmount, targetUnitIds: plan.lightningCoverage.map(unit => unit.unitId),
        coverageHash: hashStarcraftTmgContract(plan.lightningCoverage) },
      stage: 'ready', trainingTruth: false,
    }, 'parentHash');
    events.push({ type: 'psi_lightning_declared', pieceId: actor.id, sourceDefinitionId: route.definitionId,
      coverage: clone(plan.lightningCoverage), mitigatedByAttackRolls: false, trainingTruth: false });
  } else if (route.effectKind === 'marker_speed_debuff') {
    const area = applyOfficialCharacteristicAreaEffectV1(state, route, actor, action.characteristicStatusPlan);
    events.push({ type: 'characteristic_area_created', sourceDefinitionId: route.definitionId,
      markerId: area.marker.markerId, coordinate: area.marker.coordinate, effectHash: area.effect.effectHash,
      rangeMilliInches: route.rangeMilliInches, speedPenalty: route.speedPenalty,
      expiresAt: route.expiresAt, trainingTruth: false });
  } else if (route.effectKind === 'coordinated_strike') {
    const value = effect(route, state, actor, target,
      { weaponScope: route.weaponScope, rangeMilliInches: route.rangeMilliInches });
    const replaced = replaceOfficialCoordinatedStrikeEffectV1(state, target, value);
    events.push({ type: 'coordinated_strike_applied', pieceId: actor.id, targetPieceId: target.id,
      sourceDefinitionId: route.definitionId, effectHash: value.effectHash, replaced,
      expiresAt: route.expiresAt, trainingTruth: false });
  } else if (route.effectKind === 'marked_target_first_weapon') {
    const value = effect(route, state, actor, target,
      { criticalHit: route.criticalHit, precision: route.precision });
    appendEffect(target, value);
    const markerStatus = status(route, state, actor, target,
      { statusName: route.abilityName, statusKind: 'effect' });
    addStatus(target, markerStatus);
    state.board.effectMarkers.push(markerFor(markerStatus));
    events.push({ type: 'marked_target_first_weapon_applied', pieceId: actor.id,
      targetPieceId: target.id, sourceDefinitionId: route.definitionId,
      effectHash: value.effectHash, statusEffectHash: markerStatus.statusEffectHash,
      criticalHit: route.criticalHit, precision: route.precision,
      resetScope: 'each_attack', expiresAt: route.expiresAt, trainingTruth: false });
  } else if (route.effectKind === 'targeted_melee_critical') {
    const value = effect(route, state, actor, target, { keyword: route.keyword, value: route.value, weaponScope: route.weaponScope });
    appendEffect(actor, value);
    const markerStatus = status(route, state, actor, target, { statusName: route.abilityName,
      statusKind: 'effect', expiresAt: route.expiresAt });
    addStatus(target, markerStatus); state.board.effectMarkers.push(markerFor(markerStatus));
    events.push({ type: 'targeted_melee_critical_applied', pieceId: actor.id, targetPieceId: target.id,
      sourceDefinitionId: route.definitionId, effectHash: value.effectHash, statusEffectHash: markerStatus.statusEffectHash,
      criticalHit: route.value, expiresAt: route.expiresAt, trainingTruth: false });
  } else if (route.effectKind === 'scourge_queen') {
    const value = effect(route, state, actor, actor);
    appendEffect(actor, value);
    events.push({ type: 'scourge_queen_applied', pieceId: actor.id,
      modelComparison: clone(action.characteristicStatusPlan.modelComparison),
      precision: route.precision, instant: route.grantsCloseCombatInstant,
      expiresAt: route.expiresAt, effectHash: value.effectHash, trainingTruth: false });
  } else if (route.effectKind === 'farsight_evade_eligibility') {
    const value = effect(route, state, actor, target);
    appendEffect(target, value);
    events.push({ type: 'farsight_applied', pieceId: actor.id, targetPieceId: target.id,
      sourceDefinitionId: route.definitionId, effectHash: value.effectHash,
      expiresAt: route.expiresAt, trainingTruth: false });
  } else if (route.effectKind === 'feedback') {
    const value = effect(route, state, actor, target);
    appendEffect(target, value);
    events.push({ type: 'feedback_applied', pieceId: actor.id, targetPieceId: target.id,
      sourceDefinitionId: route.definitionId, effectHash: value.effectHash,
      damageAfterCompletedUnitAbility: route.nonLethalDamage, expiresAt: route.expiresAt, trainingTruth: false });
  } else if (route.effectKind === "fixed_heal") {
    applyHeal(state, route, actor, target, route.healValue, events);
  } else if (route.effectKind === "mode_toggle") {
    const active = hasStatus(actor, route.modeStatusName);
    const profile = getOfficialUnitCardInspectionProfileV1(
      state.officialRosterDisclosureDataBundle, actor.officialUnitRecordKey);
    if (profile.sourceRecordHash !== actor.sourceRecordHash || profile.payloadHash !== actor.officialPayloadHash) {
      fail("CHARACTERISTIC_STATUS_MODE_UNIT_SOURCE_MISMATCH", actor.id);
    }
    const printedSize = Number(profile.unitCardPayload.stats.size);
    if (!Number.isSafeInteger(printedSize) || printedSize < 0) {
      fail("CHARACTERISTIC_STATUS_MODE_PRINTED_SIZE_INVALID", actor.id);
    }
    const removedHashes = new Set((actor.statuses || []).filter(entry => statusName(entry) === route.modeStatusName)
      .map(entry => entry.statusEffectHash));
    removeStatus(actor, [route.modeStatusName]);
    state.board.effectMarkers = state.board.effectMarkers.filter(entry => !removedHashes.has(entry.statusEffectHash));
    if (!active) {
      const value = status(route, state, actor, actor, { statusName: route.modeStatusName,
        statusKind: "mode", characteristic: "size", setTo: route.effectiveSize,
        expiresAt: null, stayInPlay: true });
      addStatus(actor, value);
      state.board.effectMarkers.push(markerFor(value));
    }
    actor.sizeCharacteristic = active ? printedSize : route.effectiveSize;
    events.push({ type: "unit_mode_transformed", pieceId: actor.id,
      sourceDefinitionId: route.definitionId, modeStatusName: route.modeStatusName,
      active: !active, printedSize, effectiveSize: actor.sizeCharacteristic, trainingTruth: false });
  } else if (route.effectKind === "medpack") {
    const modelCount = liveModels(actor).filter((model) => (
      evaluateOfficialWithinWhollyWithinV1({ state,
        dataBundle: state.officialModelBaseGeometryDataBundle,
        source: { kind: "model", unitId: actor.id, modelId: model.id },
        targetUnitId: target.id, rangeMilliInches: route.rangeMilliInches }).unitWithin
    )).length;
    const rangedProjection = state.officialRangedFamilySourceBundle
      ? projectOfficialRangedFamilyModifiersV1(
        state.officialRangedFamilySourceBundle, state,
        { pieceId: actor.id, context: { abilityName: route.abilityName } },
      ) : null;
    applyHeal(state, route, actor, target, modelCount
      + Number(rangedProjection?.medpackAdditionalModelsWithinRange || 0), events);
  } else if (route.effectKind === "burrow_toggle") {
    applyBurrow(state, route, actor, target,
      hasStatus(target, "burrowed") ? "lose" : "gain", events);
  } else if (route.effectKind === "grant_burrowed") {
    applyBurrow(state, route, actor, target, "gain", events);
  } else if (route.effectKind === "lose_burrowed") {
    applyBurrow(state, route, actor, target, "lose", events);
  } else if (['hidden_until_action', 'hidden_until_round_end'].includes(route.effectKind)) {
    const value = status(route, state, actor, actor,
      { statusName: "hidden", statusKind: "status", expiresAt: route.expiresAt });
    addStatus(actor, value); state.board.effectMarkers.push(markerFor(value));
    events.push({ type: "hidden_status_gained", targetPieceId: actor.id,
      statusEffectHash: value.statusEffectHash, expiresAt: route.expiresAt,
      trainingTruth: false });
  } else if (route.effectKind === "optical_flare") {
    const value = status(route, state, actor, target,
      { statusName: "DEBUFF Range (4)", statusKind: "debuff",
        characteristic: "range", modifier: -4, minimumValue: 0,
        appliesTo: "ranged_weapons", longRangeAllowed: false,
        expiresAt: "cleanup_and_refresh" });
    addStatus(target, value); state.board.effectMarkers.push(markerFor(value));
    appendEffect(target, effect(route, state, actor, target,
      { characteristic: "range", modifier: -4, minimumValue: 0,
        longRangeAllowed: false,
        ...(abilityRequiresLineOfSight(state, route) ? { linkedStatusEffectHash: value.statusEffectHash } : {}) }));
    events.push({ type: "range_debuff_applied", targetPieceId: target.id,
      statusEffectHash: value.statusEffectHash, trainingTruth: false });
  } else if (route.effectKind === 'raven_seeker_missile') {
    events.push({ type: 'raven_seeker_missile_declared', definitionId: route.definitionId,
      sourcePieceId: actor.id, targetUnitId: target.id, planHash: action.characteristicStatusPlan.planHash,
      resolvesAt: 'assault_phase_end', trainingTruth: false });
  } else if (route.effectKind === 'raven_anti_armour_missile') {
    const alreadyApplied = (target.statuses || []).some(entry => entry?.sourceDefinitionId === route.definitionId);
    if (alreadyApplied) {
      resolveArmourPenalty(state, target);
      events.push({ type: 'raven_anti_armour_debuff_already_active',
        targetPieceId: target.id, sourceDefinitionId: route.definitionId, trainingTruth: false });
    } else {
      const value = status(route, state, actor, target, { statusName: 'DEBUFF Armour (1)',
        statusKind: 'debuff', characteristic: 'armour', modifier: -route.armourPenalty });
      addStatus(target, value);
      state.board.effectMarkers = [...(state.board.effectMarkers || []), markerFor(value)];
      events.push({ type: 'raven_anti_armour_debuff_applied', targetPieceId: target.id, sourceDefinitionId: route.definitionId,
        statusEffectHash: value.statusEffectHash, expiresAt: route.expiresAt, trainingTruth: false });
    }
  } else if (route.effectKind === "stimpack") {
    const profile = resolveOfficialEffectiveCombatProfileV1(state, actor);
    const before = Number(actor.damageMarker || 0);
    const nonLethal = route.nonLethalDamage > 0 && hasOfficialNonLethalDamagePolicyV1(state)
      ? stimpackDamageResolution(state, route, actor, action.characteristicStatusPlan.planHash) : null;
    if (route.nonLethalDamage > 0) {
      actor.damageMarker = nonLethal ? nonLethal.postDamageMarker
        : Math.min(before + route.nonLethalDamage, Math.max(0, Number(profile.hitPoints) - 1));
      synchronizeOfficialEffectiveHitPointWoundsV1(state, actor);
    }
    const value = status(route, state, actor, actor,
      { statusName: `BUFF Speed (${route.speedModifier})`, statusKind: "buff",
        characteristic: "speed", modifier: route.speedModifier,
        expiresAt: "cleanup_and_refresh" });
    addStatus(actor, value); state.board.effectMarkers.push(markerFor(value));
    appendEffect(actor, effect(route, state, actor, actor,
      { speedModifier: route.speedModifier, precision: route.precision,
        rangedWeaponScope: route.rangedWeaponScope,
        closeCombatWeaponScope: route.closeCombatWeaponScope,
        nonLethalDamageApplied: actor.damageMarker - before }));
    events.push({ type: "stimpack_resolved", targetPieceId: actor.id,
      damageMarkerBefore: before, damageMarkerAfter: actor.damageMarker,
      ...(nonLethal ? { nonLethalResolutionHash: nonLethal.nonLethalResolutionHash,
        damageKind: "self_special_ability", casualtyRemovalDeferred: true } : {}),
      statusEffectHash: value.statusEffectHash, trainingTruth: false });
  } else {
    const value = effect(route, state, actor, target, {
      impactHitModifier: route.impactHitModifier ?? null,
      diceCount: route.diceCount ?? null,
      keepHighest: route.keepHighest ?? null,
      weaponScope: clone(route.weaponScope ?? null),
      keyword: route.keyword ?? null,
      value: route.value ?? null,
      remainingUses: route.remainingUses ?? null,
      characteristic: route.characteristic ?? null,
      modifier: route.modifier ?? null,
      speedModifier: route.speedModifier ?? null,
      rangeMilliInches: route.rangeMilliInches ?? null,
      attackPoolModifier: route.attackPoolModifier ?? null,
      lineOfSightRequired: route.lineOfSightRequired ?? null,
      surgeTypes: clone(route.surgeTypes ?? null),
      surgeDice: route.surgeDice ?? null,
      friendlyRecordKey: route.friendlyRecordKey ?? null,
    });
    appendEffect(target, value);
    if (route.effectKind === "speed_buff"
      || route.effectKind === "weapon_characteristic_buff") {
      const statusValue = status(route, state, actor, target,
        { statusName: route.effectKind === "speed_buff"
          ? `BUFF Speed (${route.speedModifier})` : `BUFF RoA (${route.modifier})`,
        statusKind: "buff", characteristic: route.effectKind === "speed_buff"
          ? "speed" : "roa", modifier: route.speedModifier ?? route.modifier,
        expiresAt: "cleanup_and_refresh" });
      addStatus(target, statusValue); state.board.effectMarkers.push(markerFor(statusValue));
    }
    events.push({ type: "characteristic_status_effect_applied",
      targetPieceId: target.id, effectKind: route.effectKind,
      effectHash: value.effectHash, trainingTruth: false });
  }
}
function pay(state, route, action, events) {
  const ids = action.characteristicStatusPlan.canonicalParameters.paymentCardInstanceIds;
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const planHash = action.characteristicStatusPlan.planHash;
  const cost = resourceCostContract(state, route, action.sideKey, actor,
    { planHash, consume: true, usePsionicLink: action.characteristicStatusPlan.usePsionicLink,
      useCorvidReactor: action.characteristicStatusPlan.useCorvidReactor,
      targetUnitId: action.characteristicStatusPlan.canonicalParameters.targetUnitId });
  if (route.resourceType) {
    const cards = ids.map((id) => cardById(state, action.sideKey, id));
    if (cards.some((entry) => !entry)) fail("CHARACTERISTIC_STATUS_PAYMENT_CARD_UNKNOWN");
    const payment = resolveOfficialAbilityResourcePaymentV1({
      cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType: cost.resourceType, resourceCost: cost.effectiveResourceCost,
      selectedCardInstanceSetComplete: true,
      selectedCardInstances: cards.map((card) => paymentRef(state, card)),
    });
    for (const id of payment.selectedCardsExhaustOnCommit) {
      cardById(state, action.sideKey, id).readiness = "exhausted";
    }
    events.push({ type: "ability_resource_paid", resourceType: cost.resourceType,
      resourceCost: cost.effectiveResourceCost,
      printedResourceCost: route.resourceCost,
      resourceCostReduction: cost.resourceCostReduction,
      discountSourcePieceId: cost.sourcePieceId,
      paymentResultHash: payment.resultHash,
      exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
      trainingTruth: false });
  } else if (route.sourceKind === "card_feature") {
    const card = cardById(state, action.sideKey,
      action.characteristicStatusPlan.sourceInstanceId);
    if (!card || card.readiness !== "ready") {
      fail("CHARACTERISTIC_STATUS_SOURCE_CARD_NOT_READY");
    }
    card.readiness = "exhausted";
    events.push({ type: "tactical_card_exhausted",
      cardInstanceId: card.cardInstanceId, trainingTruth: false });
  }
  consumeOfficialUnitAbilityModifiersV1(state, cost, { definitionId: route.definitionId, planHash }, events);
}
function apply(bundle, stateInput, request = {}, authorizeSeekerCast = null) {
  const action = request.action;
  const domainId = action?.characteristicStatusPlan?.domainId;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey,
    includeDisabled: true }, authorizeSeekerCast).parameterDomains.find((entry) => entry.domainId === domainId);
  if (!domain) fail("CHARACTERISTIC_STATUS_PARAMETER_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.characteristicStatusPlan.canonicalParameters, authorizeSeekerCast);
  if (!isDeepStrictEqual(expected.action, action)) fail("CHARACTERISTIC_STATUS_ACTION_STALE");
  const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
  const state = clone(stateInput);
  const actor = state.pieces.find((entry) => entry.id === action.pieceId);
  const events = [];
  if (route.alreadyActivatedAllowed !== true) consumeOfficialCharacteristicActivationStartV1(state, actor, events);
  pay(state, route, action, events);
  applyEffect(state, route, actor, action, events);
  state.activeAbilityUseHistory = state.activeAbilityUseHistory || [];
  state.activeAbilityUseHistory.push({
    useKey: `${state.round}:${route.abilityName}:${actor.id}`,
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    pieceId: actor.id, routeId: route.definitionId,
    abilityName: route.abilityName,
    planHash: action.characteristicStatusPlan.planHash,
    ...(route.effectKind === 'broodmother_army_buff'
      ? { broodmotherEffect: action.characteristicStatusPlan.canonicalParameters.broodmotherEffect } : {}),
    trainingTruth: false,
  });
  state.characteristicStatusAbilityHistory = state.characteristicStatusAbilityHistory || [];
  state.characteristicStatusAbilityHistory.push({ round: Number(state.round),
    phase: state.phase, sideKey: actor.sideKey, pieceId: actor.id,
    definitionId: route.definitionId, effectKind: route.effectKind,
    planHash: action.characteristicStatusPlan.planHash,
    events: clone(events), trainingTruth: false });
  if (route.alreadyActivatedAllowed !== true) {
    const prior = state.selectedRosterActivationWindow;
    state.selectedRosterActivationWindow = {
      schema: "starcraft_tmg_selected_roster_activation_window_v1",
      round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
      pieceId: actor.id, stage: prior?.stage || "before_action", trainingTruth: false };
  }
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_characteristic_status_transition_v1",
    runtimeId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    rulesTruth: "official_current_product_characteristic_status_transition",
    trainingTruth: false });
}

function weaponMatches(scope, weaponName) {
  if (scope === "all") return true;
  const values = Array.isArray(scope) ? scope : [scope];
  return values.map(normalized).includes(normalized(weaponName));
}
function activeEffects(piece) {
  return (piece?.officialAbilityEffects || []).filter((entry) => (
    entry?.effectHash && (entry?.sourceDefinitionId || entry?.sourceFeatureHash)));
}
export const OFFICIAL_DAMAGE_WEAPON_HIT_DEBUFF_ATOM_ID = 'rule-atom:source-bound-damage-weapon-hit-debuff-v1';

function weaponHitDebuffs(bundle, state, piece) {
  if (!activePiece(piece)) return [];
  return activeEffects(piece).filter(entry => entry.effectKind === 'damage_inflicted_weapon_hit_debuff'
    && entry.roundApplied === Number(state.round)).map(entry => {
    const route = bundle.routes.find(row => row.definitionId === entry.sourceDefinitionId
      && row.sourceFeatureHash === entry.sourceFeatureHash && row.effectKind === entry.effectKind);
    if (!route || entry.effectHash !== hashStarcraftTmgContract(without(entry, ['effectHash']))
      || entry.targetPieceId !== piece.id || entry.abilityName !== route.abilityName
      || entry.weaponHitPenalty !== route.weaponHitPenalty || entry.weaponScope !== 'all'
      || entry.phaseApplied !== 'combat' || entry.expiresAt !== 'cleanup_and_refresh'
      || !/^[a-f0-9]{64}$/u.test(entry.sourceAttackResolutionHash)) {
      fail('CHARACTERISTIC_WEAPON_HIT_DEBUFF_BINDING_INVALID');
    }
    return entry;
  });
}

export function applyOfficialRangedReactionHitDebuffV1(state, route, source, attacker, effect) {
  const value = status(route, state, source, attacker, { statusName: 'DEBUFF Hit (1)',
    statusKind: 'debuff', characteristic: 'hit', modifier: route.hitModifier, appliesTo: 'ranged_weapons',
    expiresAt: route.effectDuration, reactionEffectHash: effect.effectHash });
  addStatus(attacker, value);
  state.board.effectMarkers ||= [];
  state.board.effectMarkers.push(markerFor(value));
  return { type: 'ranged_reaction_hit_debuff_applied', sourcePieceId: source.id, targetPieceId: attacker.id,
    sourceDefinitionId: route.definitionId, statusEffectHash: value.statusEffectHash, modifier: route.hitModifier,
    expiresAt: value.expiresAt, trainingTruth: false };
}

export function projectOfficialRangedReactionHitPenaltyV1(state, attacker) {
  const activeStatuses = (attacker.statuses || []).filter(entry => entry?.reactionEffectHash
    && entry.characteristic === 'hit' && entry.appliesTo === 'ranged_weapons'
    && Number(entry.roundApplied) === Number(state.round));
  let penalty = 0;
  for (const entry of activeStatuses) {
    const route = state.officialReactionFamilySourceBundle?.routes.find(row =>
      row.persistentRangedHitDebuff && row.definitionId === entry.sourceDefinitionId
        && row.sourceFeatureHash === entry.sourceFeatureHash);
    const committed = state.officialReactionHistory?.some(row => row.round === Number(state.round)
      && row.effectHash === entry.reactionEffectHash && row.definitionId === entry.sourceDefinitionId
      && row.sourceInstanceId === entry.sourcePieceId && row.sideKey === entry.sourceSideKey);
    if (!route || !committed || entry.targetPieceId !== attacker.id || entry.modifier !== route.hitModifier
      || entry.expiresAt !== route.effectDuration || entry.statusKind !== 'debuff'
      || entry.statusEffectHash !== hashStarcraftTmgContract(without(entry, ['statusEffectHash']))) {
      fail('REACTION_RANGED_WEAPON_HIT_DEBUFF_BINDING_INVALID');
    }
    penalty = Math.max(penalty, -entry.modifier);
  }
  return penalty;
}

export function consumeOfficialDamageWeaponHitDebuffsV1(bundle, transition) {
  if (!bundle?.routes.some(route => route.effectKind === 'damage_inflicted_weapon_hit_debuff')
    || transition.state.phase !== 'combat') return transition;
  const attacks = (transition.events || []).filter(event => event.type === 'close_combat_attack'
    && Number(event.stages?.totalDamage || 0) > 0);
  if (!attacks.length) return transition;
  const state = clone(transition.state), events = [];
  for (const attack of attacks) {
    const source = state.pieces.find(piece => piece.id === attack.pieceId);
    const target = state.pieces.find(piece => piece.id === attack.targetId);
    if (!activePiece(source) || !activePiece(target) || source.sideKey === target.sideKey
      || source.sideKey !== attack.sideKey) continue;
    const route = passiveRoutesForPiece(bundle, state, source).find(row =>
      row.effectKind === 'damage_inflicted_weapon_hit_debuff' && row.phase === state.phase);
    if (!route || weaponHitDebuffs(bundle, state, target).some(entry => entry.abilityName === route.abilityName)) continue;
    if (!/^[a-f0-9]{64}$/u.test(attack.resolutionHash)) fail('CHARACTERISTIC_DAMAGE_EVIDENCE_REQUIRED');
    const value = effect(route, state, source, target, { weaponHitPenalty: route.weaponHitPenalty,
      weaponScope: 'all', sourceAttackResolutionHash: attack.resolutionHash });
    const markerStatus = status(route, state, source, target, { statusName: 'DEBUFF Hit (1)',
      statusKind: 'debuff', characteristic: 'hit', modifier: route.weaponHitPenalty, appliesTo: 'all_weapons' });
    appendEffect(target, value);
    addStatus(target, markerStatus);
    state.board.effectMarkers = state.board.effectMarkers || [];
    state.board.effectMarkers.push(markerFor(markerStatus));
    events.push({ type: 'weapon_hit_debuff_applied', ruleAtomId: OFFICIAL_DAMAGE_WEAPON_HIT_DEBUFF_ATOM_ID,
      sourcePieceId: source.id, targetPieceId: target.id, sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, sourceAttackResolutionHash: attack.resolutionHash,
      weaponHitPenalty: route.weaponHitPenalty, weaponScope: 'all', effectHash: value.effectHash,
      expiresAt: 'cleanup_and_refresh', trainingTruth: false });
  }
  if (!events.length) return transition;
  if (state.log?.length) state.log.at(-1).events = [...(state.log.at(-1).events || []), ...events];
  return { ...transition, state, events: [...(transition.events || []), ...events] };
}
function maximumKeyword(rows, keyword, weaponName) {
  return Math.max(0, ...rows.filter((entry) => entry.keyword === keyword
    && weaponMatches(entry.weaponScope, weaponName)).map((entry) => Number(entry.value || 0)));
}
function markedTargetFirstWeaponEffects(bundle, state, attacker, context) {
  const attackKind = normalized(context.attackKind);
  if (!['ranged', 'close_combat'].includes(attackKind)) return [];
  const routes = bundle.routes.filter(route => route.effectKind === 'marked_target_first_weapon');
  if (!routes.length) return [];
  if (attackKind === 'ranged') {
    const sequence = currentOfficialSelectedRosterRangedSequenceV1(state);
    if (sequence?.pieceId === attacker.id && sequence.sideKey === attacker.sideKey
      && sequence.completedBatches.length > 0) return [];
  }
  return (state.pieces || []).filter(target => activePiece(target)
    && target.sideKey !== attacker.sideKey).flatMap(target => activeEffects(target)
    .filter(entry => entry.effectKind === 'marked_target_first_weapon'
      && entry.sourceSideKey === attacker.sideKey && entry.targetPieceId === target.id
      && entry.roundApplied === Number(state.round)
      && routes.some(route => route.definitionId === entry.sourceDefinitionId
        && route.sourceFeatureHash === entry.sourceFeatureHash)));
}
function targetSize(state, targetPieceId) {
  const target = state.pieces.find((entry) => entry.id === targetPieceId);
  if (!target) return null;
  return Number(getOfficialCombatProfileV1(
    state.officialCombatProfileBundle, target.officialUnitRecordKey).sizeCharacteristic);
}
function targetEngagedWithOtherFriendly(state, actor, target) {
  return (state.pieces || []).some((piece) => piece.sideKey === actor.sideKey
    && piece.id !== actor.id && activePiece(piece)
    && unitWithin(state, piece, target, 1000).within);
}
function horizontalCoherencyFromPassives(passives) {
  return Math.max(3000, ...passives.filter((entry) => (
    entry.effectKind === "coherency_projection"))
    .map((entry) => entry.horizontalCoherencyMilliInches));
}

function conditionalWeaponFact(state, piece, route, context) {
  const condition = route.weaponCondition;
  const target = state.pieces.find(row => row.id === context.targetPieceId);
  const fact = { definitionId: route.definitionId, conditionKind: condition.kind,
    targetPieceId: target?.id || null, rangeMilliInches: condition.rangeMilliInches };
  if ((route.phase!=='any'&&state.phase !== route.phase) || !(condition.attackKinds?condition.attackKinds.includes(context.attackKind):context.attackKind===condition.attackKind)
    || !activePiece(target) || target.sideKey === piece.sideKey) {
    return { ...fact, applies: false, reason: 'outside_eligible_attack_context' };
  }
  if(condition.kind==='infestation_or_creep_proximity'){
    if(context.attackKind==='ranged'&&normalized(context.weaponName)!==condition.rangedWeaponName)
      return{...fact,applies:false,reason:'weapon_not_eligible_for_live_for_the_swarm'};
    const infected=hasStatus(target,'infestation');
    const creep=inspectOfficialUnitCreepProximityV1(state,target,{rangeMilliInches:condition.rangeMilliInches});
    return{...fact,applies:infected||creep.withinAnySource,targetInfested:infected,creepProximity:creep};
  }
  if (condition.kind === 'target_beyond') {
    const measured = unitWithin(state, piece, target, condition.rangeMilliInches);
    const minimumDistanceMilliInches = Math.min(...measured.assessments.flatMap(row =>
      row.assessments.map(model => model.minimumDistanceMilliInches)));
    return { ...fact, applies: !measured.within, minimumDistanceMilliInches,
      unitWithinThreshold: measured.within };
  }
  if (condition.kind === 'same_mission_marker') {
    const markerChecks = (state.board?.missionMarkers || [])
      .filter(marker => marker.isRemoved !== true && marker.isDestroyed !== true)
      .map(marker => {
        const input = { state, dataBundle: state.officialModelBaseGeometryDataBundle,
          source: { kind: 'mission_marker', id: marker.id }, rangeMilliInches: condition.rangeMilliInches };
        const attacker = evaluateOfficialWithinWhollyWithinV1({ ...input, targetUnitId: piece.id });
        const defender = evaluateOfficialWithinWhollyWithinV1({ ...input, targetUnitId: target.id });
        return { markerId: marker.id, attackerWithin: attacker.unitWithin, targetWithin: defender.unitWithin,
          attackerMinimumDistanceMilliInches: Math.min(...attacker.assessments.map(row => row.minimumDistanceMilliInches)),
          targetMinimumDistanceMilliInches: Math.min(...defender.assessments.map(row => row.minimumDistanceMilliInches)) };
      });
    const sharedMarkerIds = markerChecks.filter(row => row.attackerWithin && row.targetWithin).map(row => row.markerId).sort();
    return { ...fact, applies: sharedMarkerIds.length > 0, sharedMarkerIds, markerChecks };
  }
  fail('CHARACTERISTIC_STATUS_WEAPON_CONDITION_UNKNOWN', condition.kind);
}

function targetNearSourceWeaponChecks(bundle, state, piece, context) {
  const target = state.pieces.find(row => row.id === context.targetPieceId);
  return bundle.routes.filter(route => route.effectKind === 'target_near_source_weapon_keyword')
    .flatMap(route => state.pieces.filter(source => source.officialUnitRecordKey === route.recordKey
      && source.sideKey === piece.sideKey).map(source => {
      const fact = { sourcePieceId: source.id, sourceDefinitionId: route.definitionId,
        sourceFeatureHash: route.sourceFeatureHash, targetPieceId: target?.id || null,
        rangeMilliInches: route.rangeMilliInches, keyword: route.keyword, value: route.value };
      if (!activePiece(piece) || !activePiece(target) || target.sideKey === piece.sideKey
        || !['ranged', 'close_combat'].includes(context.attackKind)) {
        return { ...fact, applies: false, reason: 'outside_eligible_attack_context' };
      }
      if (!passiveRoutesForPiece(bundle, state, source).some(entry => entry.definitionId === route.definitionId)) {
        return { ...fact, applies: false, reason: 'source_inactive_or_ability_disabled' };
      }
      if (source.sourceRecordHash !== route.sourceRecordHash || source.officialPayloadHash !== route.payloadHash) {
        fail('CHARACTERISTIC_STATUS_AURA_SOURCE_MISMATCH', source.id);
      }
      const measured = unitWithin(state, source, target, route.rangeMilliInches);
      const minimumDistanceMilliInches = Math.min(...measured.assessments.flatMap(row =>
        row.assessments.map(model => model.minimumDistanceMilliInches)));
      return { ...fact, applies: measured.within, minimumDistanceMilliInches,
        reason: measured.within ? 'target_within_source_range' : 'target_outside_source_range' };
    })).sort((left, right) => `${left.sourcePieceId}:${left.sourceDefinitionId}`
      .localeCompare(`${right.sourcePieceId}:${right.sourceDefinitionId}`));
}

// Coherency is intrinsic to the selected Unit's fielded features, not a
// distance/aura query. A reserve-placement solver needs the post-entry rule
// before it has positions; it must not fabricate a positioned battlefield Unit
// merely to ask the full combat/visibility projection for this scalar.
export function projectOfficialHorizontalCoherencyV1(bundle, state, request) {
  const piece = state.pieces.find((entry) => entry.id === request.pieceId);
  if (!piece) fail("CHARACTERISTIC_STATUS_QUERY_PIECE_UNKNOWN", String(request.pieceId || ""));
  const projectedPiece = request.assumeDeployed === true
    ? { ...piece, isOnField: true, isInReserves: false } : piece;
  const passives = passiveRoutesForPiece(bundle, state, projectedPiece);
  return {
    pieceId: piece.id,
    ...(passives.some(route => route.effectKind === 'hidden_after_action') ? { gainsHiddenAfterCompletedAction: true } : {}),
    ...(bundle.routes.some(route => route.effectKind === 'large_movement' && route.recordKey === piece.officialUnitRecordKey)
      ? { largeMovement: inspectOfficialLargeMovementSourceV1(state, piece) } : {}),
    horizontalCoherencyMilliInches: horizontalCoherencyFromPassives(passives),
    hypotheticalDeployment: request.assumeDeployed === true && !activePiece(piece),
    spatialAurasEvaluated: false,
    trainingTruth: false,
  };
}

function ravenTurretShrapnel(bundle, state, turret, context) {
  if (turret.officialUnitRecordKey !== 'army_units:auto_turret' || !activePiece(turret)
    || turret.specialDeployment !== true || turret.specialDeploymentSourceDefinitionId !== OFFICIAL_RAVEN_DEPLOY_AUTO_TURRET_DEFINITION_ID
    || !turret.specialDeploymentSourcePieceId || state.phase !== 'assault'
    || normalized(context.attackKind) !== 'ranged') return null;
  const raven = state.pieces.find(piece => piece.id === turret.specialDeploymentSourcePieceId);
  if (!raven || raven.sideKey !== turret.sideKey || raven.officialUnitRecordKey !== 'army_units:raven') return null;
  const afterLoss = state.officialRavenDestroyedSourceFaq === OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13.entry
    && raven.isDestroyed === true && raven.isOnField === false && raven.currentModels === 0;
  if (afterLoss) {
    return bundle.routes.find(route => route.definitionId === OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID
      && fieldedFeature(raven, route) && weaponMatches(route.weaponScope, normalized(context.weaponName))) ?? null;
  }
  return passiveRoutesForPiece(bundle, state, raven).find(route =>
    route.definitionId === OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID
    && weaponMatches(route.weaponScope, normalized(context.weaponName))) ?? null;
}

export function projectOfficialCharacteristicStatusFamilyModifiersV1(
  bundle, state, request,
) {
  const piece = state.pieces.find((entry) => entry.id === request.pieceId);
  if (!piece) fail("CHARACTERISTIC_STATUS_QUERY_PIECE_UNKNOWN", String(request.pieceId || ""));
  const requestedContext = object(request.context) ? request.context : {};
  const ordinals = requestedContext.targetPieceId === piece.id && requestedContext.attackerPieceId
    ? inspectOfficialArmourRollOrdinalsV1(state, { targetPieceId: piece.id, attackerPieceId: requestedContext.attackerPieceId }) : null;
  const context = ordinals ? { ...requestedContext, ...ordinals } : requestedContext;
  const weaponName = normalized(context.weaponName);
  const passives = passiveRoutesForPiece(bundle, state, piece);
  const effects = activeEffects(piece);
  const farsight = activePiece(piece) && effects.some(entry => {
    if (entry.effectKind !== 'farsight_evade_eligibility' || entry.roundApplied !== Number(state.round)) return false;
    const route = bundle.routes.find(row => row.effectKind === entry.effectKind
      && row.definitionId === entry.sourceDefinitionId && row.sourceFeatureHash === entry.sourceFeatureHash);
    if (!route || entry.targetPieceId !== piece.id || entry.sourceSideKey !== piece.sideKey
      || entry.expiresAt !== route.expiresAt || entry.effectHash !== hashStarcraftTmgContract(without(entry, ['effectHash']))) {
      fail('CHARACTERISTIC_FARSIGHT_EFFECT_BINDING_INVALID');
    }
    return true;
  });
  const broodmotherEffects = effects.filter(entry => entry.effectKind === 'broodmother_army_buff'
    && entry.roundApplied === Number(state.round));
  const chargeSpeedDebuff = projectOfficialChargeSpeedDebuffV1(state, piece);
  const hitDebuffs = weaponHitDebuffs(bundle, state, piece);
  const firstGamePierce = passives.find(route => route.effectKind === 'first_game_weapon_pierce'
    && normalized(context.attackKind) === 'ranged' && normalized(route.weaponName) === weaponName);
  const firstGameWeaponPierce = firstGamePierce ? {
    sourceDefinitionId: firstGamePierce.definitionId, sourceFeatureHash: firstGamePierce.sourceFeatureHash,
    weaponName: firstGamePierce.weaponName, targetTag: firstGamePierce.targetTag,
    damage: firstGamePierce.damage, remainingUses: firstGameWeaponUse(piece, firstGamePierce) ? 0 : 1,
    resetScope: 'game',
  } : null;
  const targetingRestrictions = passives.filter(route => route.effectKind === 'ranged_engaged_target_prohibition')
    .map(route => ({ sourceDefinitionId: route.definitionId, requiredModeStatus: route.requiresModeStatus,
      phase: route.phase, active: state.phase === route.phase && hasStatus(piece, route.requiresModeStatus),
      selectedTargetCannotBeEngagedWithSource: true }));
  const conditionalWeaponChecks = passives.filter(entry => entry.weaponCondition)
    .map(entry => conditionalWeaponFact(state, piece, entry, context));
  const inactiveConditionalIds = new Set(conditionalWeaponChecks.filter(row => !row.applies).map(row => row.definitionId));
  const passiveWeapons = passives.filter((entry) => (
    entry.effectKind === "passive_weapon_keyword" && !inactiveConditionalIds.has(entry.definitionId)));
  const weaponAuraChecks = targetNearSourceWeaponChecks(bundle, state, piece, context);
  const applicableWeaponAuras = weaponAuraChecks.filter(entry => entry.applies);
  const firstWeapon = effects.filter((entry) => entry.effectKind === "first_weapon_keyword"
    && matchesGrantedWeapon(entry, weaponName, state.round)
    && (!context.attackKind || entry.weaponScope === 'all' || normalized(entry.weaponScope) === normalized(context.attackKind)));
  const markedFirstWeapons = markedTargetFirstWeaponEffects(bundle, state, piece, context);
  const markedCurrentTarget = markedFirstWeapons.filter(entry => entry.targetPieceId === context.targetPieceId);
  const stimpack = effects.filter((entry) => entry.effectKind === "stimpack");
  const scourgeQueen = normalized(context.attackKind) === 'close_combat'
    ? bundle.routes.find(route => route.effectKind === 'scourge_queen' && effects.some(entry =>
      entry.sourceDefinitionId === route.definitionId && entry.sourceFeatureHash === route.sourceFeatureHash
      && entry.sourcePieceId === piece.id && entry.targetPieceId === piece.id
      && entry.roundApplied === Number(state.round))) : null;
  const precision = Math.max(
    maximumKeyword(passiveWeapons, "precision", weaponName),
    scourgeQueen?.precision || 0,
    ...markedCurrentTarget.map(entry => entry.precision),
    ...applicableWeaponAuras.filter(entry => entry.keyword === 'precision').map(entry => entry.value),
    ...firstWeapon.filter((entry) => entry.keyword === "precision")
      .map((entry) => Number(entry.value || 0)),
    ...stimpack.filter((entry) => weaponMatches(entry.rangedWeaponScope, weaponName)
      || (normalized(context.attackKind) === "close_combat"
        && entry.closeCombatWeaponScope === "all"))
      .map((entry) => Number(entry.precision || 0)),
  );
  let antiEvade = Math.max(maximumKeyword(passiveWeapons, "anti_evade", weaponName),
    ...firstWeapon.filter((entry) => entry.keyword === "anti_evade")
      .map((entry) => Number(entry.value || 0)));
  const slug = passives.find((entry) => entry.effectKind === "slugthrower"
    && weaponMatches(entry.weaponScope, weaponName));
  if (slug && context.targetPieceId) {
    const target = state.pieces.find((entry) => entry.id === context.targetPieceId);
    if (target && unitWithin(state, piece, target, slug.rangeMilliInches).within) {
      antiEvade = Math.max(antiEvade, slug.value);
    }
  }
  const targetPiece = state.pieces.find((entry) => entry.id === context.targetPieceId);
  const conditionalCriticalHitValues = normalized(context.attackKind) === 'close_combat'
    ? [...effects.filter(entry => entry.effectKind === 'targeted_melee_critical' && entry.sourcePieceId === piece.id
      && entry.sourceSideKey === piece.sideKey
      && bundle.routes.some(route => route.definitionId === entry.sourceDefinitionId && route.effectKind === entry.effectKind)
      && state.pieces.some(target => target.id === entry.targetPieceId && target.sideKey !== piece.sideKey && activePiece(target)))
      .map(entry => ({ targetUnitId: entry.targetPieceId, value: entry.value, sourceDefinitionId: entry.sourceDefinitionId })),
      ...markedFirstWeapons.map(entry => ({ targetUnitId: entry.targetPieceId,
        value: entry.criticalHit, sourceDefinitionId: entry.sourceDefinitionId }))]
      .sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId)) : [];
  const targetLocks = activeEffects(targetPiece).filter((entry) => entry.effectKind === "target_lock"
      && entry.sourceSideKey === piece.sideKey
      && entry.targetPieceId === context.targetPieceId
      && piece.officialUnitRecordKey === entry.friendlyRecordKey
      && normalized(weaponName) === normalized(entry.weaponScope));
  const guardianSources = targetPiece ? (state.pieces || []).filter((source) => (
    source.sideKey === targetPiece.sideKey && activePiece(source)
      && activeEffects(source).some((entry) => entry.effectKind === "guardian_shield")
      && unitWithin(state, source, targetPiece, 4000).within
  )) : [];
  const detectionSources = (state.pieces || []).filter((source) => source.sideKey !== piece.sideKey
    && activePiece(source)
    && passiveRoutesForPiece(bundle, state, source).some((entry) => (
      entry.effectKind === "detection_aura"
      && unitWithin(state, source, piece, entry.rangeMilliInches).within)));
  const tough = Math.max(0, ...passives.filter(entry => entry.effectKind === 'conditional_tough'
    && !hasStatus(piece, entry.excludedModeStatus)).map(entry => entry.tough),
    ...broodmotherEffects.map(entry => entry.tough || 0),
    ...passives.filter((entry) => entry.effectKind === "first_armour_tough"
    && (entry.resetScope === "activation"
      ? Number(context.armourRollOrdinalInActivation) === 1
      : Number(context.armourRollOrdinalInRound) === 1)).map((entry) => entry.tough));
  const turretShrapnel = ravenTurretShrapnel(bundle, state, piece, context);
  const surgeRoute = passives.find((entry) => entry.effectKind === "passive_weapon_surge"
    && weaponMatches(entry.weaponScope, weaponName)) || turretShrapnel;
  const titan = passives.find((entry) => entry.effectKind === "titan_killers"
    && normalized(context.attackKind) === "close_combat"
    && targetSize(state, context.targetPieceId) >= entry.minimumTargetSize);
  const sizeDamage = passives.find(entry => entry.effectKind === 'target_size_damage'
    && entry.phase === state.phase && normalized(context.attackKind) === 'ranged'
    && hasStatus(piece, entry.requiresModeStatus) && targetPiece);
  const currentTargetSize = sizeDamage ? targetPiece.sizeCharacteristic : null;
  if (sizeDamage && (!Number.isSafeInteger(currentTargetSize) || currentTargetSize < 0)) {
    fail('CHARACTERISTIC_STATUS_CURRENT_TARGET_SIZE_REQUIRED', targetPiece.id);
  }
  const target = targetPiece;
  const stand = passives.find((entry) => entry.effectKind === "we_stand_as_one"
    && normalized(context.attackKind) === "close_combat" && target
    && targetEngagedWithOtherFriendly(state, piece, target));
  const charge = effects.find((entry) => entry.effectKind === "charge_roll_advantage");
  const optical = (piece.statuses || []).filter((entry) => (
    entry.sourceAdapterId === OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID
      && entry.statusKind === "debuff" && entry.characteristic === "range"));
  const armourPenalty = resolveArmourPenalty(state, piece);
  const coordinatedStrikeOrigins = bundle.routes.some(route => route.effectKind === 'coordinated_strike')
    ? listOfficialCoordinatedStrikeOriginsV1(state, piece.id) : null;
  const areaEffects = bundle.routes.some(route => route.effectKind === 'marker_speed_debuff')
    ? projectOfficialCharacteristicAreaEffectsV1(bundle, state, piece) : null;
  return {
    pieceId: piece.id,
    ...(bundle.routes.some(route => route.effectKind === 'large_movement' && route.recordKey === piece.officialUnitRecordKey)
      ? { largeMovement: inspectOfficialLargeMovementSourceV1(state, piece) } : {}),
    ...(passives.some(route => route.effectKind === 'hidden_after_action') ? { gainsHiddenAfterCompletedAction: true } : {}),
    ...(armourPenalty ? { armourPenalty } : {}),
    applicableDefinitionIds: [...new Set([...passives.filter(entry => !inactiveConditionalIds.has(entry.definitionId)
      && entry.effectKind !== 'target_near_source_weapon_keyword').map((entry) => entry.definitionId),
      ...(turretShrapnel ? [turretShrapnel.definitionId] : []),
      ...applicableWeaponAuras.map(entry => entry.sourceDefinitionId),
      ...effects.map((entry) => entry.sourceDefinitionId).filter(Boolean),
      ...(areaEffects || []).filter(entry => entry.applies).map(entry => entry.sourceDefinitionId)])].sort(),
    ...(conditionalWeaponChecks.length ? { conditionalWeaponChecks } : {}),
    ...(bundle.routes.some(route => route.effectKind === 'target_near_source_weapon_keyword') ? { weaponAuraChecks } : {}),
    ...(targetingRestrictions.length ? { rangedTargetingRestrictions: targetingRestrictions,
      prohibitsRangedTargetingEngagedEnemies: targetingRestrictions.some(row => row.active) } : {}),
    ...(hitDebuffs.length ? { weaponHitPenalty: Math.max(...hitDebuffs.map(entry => entry.weaponHitPenalty)),
      weaponHitDebuffSources: hitDebuffs.map(entry => ({ sourceDefinitionId: entry.sourceDefinitionId,
        sourceFeatureHash: entry.sourceFeatureHash, effectHash: entry.effectHash })) } : {}),
    speedModifier: Math.max(0, ...effects.map((entry) => Number(entry.speedModifier || 0))),
    ...(coordinatedStrikeOrigins ? { coordinatedStrikeOrigins } : {}),
    ...(scourgeQueen ? { closeCombatInstantSourceDefinitionId: scourgeQueen.definitionId } : {}),
    ...(areaEffects || chargeSpeedDebuff ? {
      speedPenalty: Math.max(chargeSpeedDebuff?.speedPenalty || 0, ...(areaEffects || []).map(entry => entry.speedPenalty)),
      ...(areaEffects ? { areaEffectChecks: areaEffects } : {}),
    } : {}),
    rangeModifier: Math.min(0, ...optical.map((entry) => Number(entry.modifier || 0)))
      + Math.max(0, ...firstWeapon.filter((entry) => entry.keyword === "buff_range")
        .map((entry) => Number(entry.value || 0))),
    rateOfAttackModifier: Math.max(0, ...effects.filter((entry) => (
      entry.effectKind === "weapon_characteristic_buff"
        && weaponMatches(entry.weaponScope, weaponName))).map((entry) => Number(entry.modifier || 0))),
    hitPointsModifier: Math.max(0, ...hitPointRoutesForPiece(bundle, state, piece)
      .map((entry) => entry.hitPointsModifier)),
    impactHitModifier: Math.max(0, ...effects.filter(entry =>
      (state.officialChargeImpactEffectOwnersV1 !== true
        || entry.schema === 'starcraft_tmg_official_characteristic_status_runtime_effect_v1')
      && (entry.effectKind !== 'broodmother_army_buff' || entry.roundApplied === Number(state.round)))
      .map(entry => Number(entry.impactHitModifier || 0))),
    precision: Math.max(precision, Number(stand?.value || 0)),
    antiEvade,
    ...(conditionalCriticalHitValues.length ? { conditionalCriticalHitValues } : {}),
    criticalHit: Math.max(maximumKeyword(passiveWeapons, 'critical_hit', weaponName), ...firstWeapon.filter((entry) => (
      entry.keyword === "critical_hit")).map((entry) => Number(entry.value || 0)),
      ...broodmotherEffects.map(entry => entry.criticalHit || 0),
      ...markedCurrentTarget.map(entry => entry.criticalHit),
      ...conditionalCriticalHitValues.filter(entry => entry.targetUnitId === context.targetPieceId).map(entry => entry.value)),
    tough,
    horizontalCoherencyMilliInches: horizontalCoherencyFromPassives(passives),
    eligibleEvadeAgainstAllAttacks: passives.some((entry) => (
      entry.effectKind === "evade_eligibility"))
      || farsight
      || hasOfficialHiddenRangedAndEvadePolicyV1(state) && hasStatus(piece, 'hidden') && detectionSources.length === 0,
    crossEngagementTargetingAllowed: passives.some((entry) => (
      entry.effectKind === "indomitable")),
    crossEngagementDefenderEvadeEligible: passives.some((entry) => (
      entry.effectKind === "indomitable")),
    cannotGainBurrowed: passives.some((entry) => (
      entry.effectKind === "cannot_gain_burrowed")),
    hiddenSuppressedByDetection: detectionSources.length > 0,
    detectingSourcePieceIds: detectionSources.map((entry) => entry.id).sort(),
    chargeDistanceRoll: charge ? { diceCount: charge.diceCount,
      keepHighest: charge.keepHighest, addTo: "speed" } : null,
    attackPoolModifier: guardianSources.length > 0
      && normalized(context.attackKind) === "ranged" ? -1 : 0,
    guardianShieldSourcePieceIds: guardianSources.map((entry) => entry.id).sort(),
    surgeTypes: targetLocks.length > 0 ? ["light", "armoured"]
      : clone(surgeRoute?.surgeTypes || []),
    surgeDice: targetLocks.length > 0 ? "D3+1" : surgeRoute?.surgeDice || null,
    damageSetTo: sizeDamage ? Math.max(sizeDamage.minimumDamage, currentTargetSize) : titan?.damageSetTo || null,
    ...(firstGameWeaponPierce ? { firstGameWeaponPierce } : {}),
    ...(sizeDamage ? { damageCharacteristicSource: { definitionId: sizeDamage.definitionId,
      characteristic: 'size', targetPieceId: targetPiece.id, currentValue: currentTargetSize,
      minimumDamage: sizeDamage.minimumDamage } } : {}),
    longRangeAllowed: optical.length > 0 ? false : null,
    firstWeaponEffectsRequireConsumerCommit: firstWeapon.filter(entry=>!entry.boundWeaponName).map((entry) => ({
      effectHash: entry.effectHash, remainingUses: entry.remainingUses,
      weaponScope: clone(entry.weaponScope), keyword: entry.keyword, value: entry.value })),
    modifierStackingPolicy: "same_numeric_keyword_uses_highest_value",
    consumerContract:
      "movement_ranged_melee_armour_visibility_runtimes_query_before_resolution",
    trainingTruth: false,
  };
}

export function consumeOfficialDetectionHiddenStatusesV1(bundle, stateInput) {
  if (!hasOfficialDetectionHiddenLossPolicyV1(stateInput)) return { state: stateInput, events: [] };
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  const removals = (stateInput.pieces || []).filter(piece => activePiece(piece) && hasStatus(piece, 'hidden'))
    .map(piece => ({ pieceId: piece.id, detection: projectOfficialCharacteristicStatusFamilyModifiersV1(
      bundle, stateInput, { pieceId: piece.id }) }))
    .filter(row => row.detection.hiddenSuppressedByDetection);
  if (!removals.length) return { state: stateInput, events: [] };
  const state = clone(stateInput);
  const events = [];
  for (const removal of removals) {
    const piece = state.pieces.find(row => row.id === removal.pieceId);
    const hashes = (piece.statuses || []).filter(row => statusName(row) === 'hidden')
      .map(row => row.statusEffectHash).filter(Boolean);
    removeStatus(piece, ['hidden']);
    state.board.effectMarkers = (state.board.effectMarkers || []).filter(marker =>
      !hashes.includes(marker.statusEffectHash)
      && !(marker.targetPieceId === piece.id && normalized(marker.label) === 'hidden'));
    const sources = removal.detection.detectingSourcePieceIds.flatMap(pieceId => {
      const source = state.pieces.find(row => row.id === pieceId);
      return passiveRoutesForPiece(bundle, state, source).filter(route => route.effectKind === 'detection_aura')
        .map(route => ({ pieceId, definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash }));
    });
    const event = seal({ type: 'detection_hidden_lost', targetPieceId: piece.id,
      detectingSources: sources, removedStatusEffectHashes: hashes,
      round: Number(state.round), phase: state.phase, trainingTruth: false }, 'resolutionHash');
    state.officialDetectionHiddenLossHistory = [...(state.officialDetectionHiddenLossHistory || []), event];
    events.push(event);
  }
  return { state, events };
}

export function consumeOfficialCharacteristicStatusFirstWeaponEffectsV1(
  state, pieceId, attackKind, weaponName,
) {
  const piece = (state?.pieces || []).find((entry) => entry.id === pieceId);
  if (!piece) fail("CHARACTERISTIC_STATUS_CONSUMER_PIECE_UNKNOWN", String(pieceId || ""));
  const expectedKind = normalized(attackKind);
  const consumed = [];
  piece.officialAbilityEffects = (piece.officialAbilityEffects || []).filter((entry) => {
    if (entry.effectKind !== "first_weapon_keyword"
      || (entry.weaponScope !== 'all' && normalized(entry.weaponScope) !== expectedKind)
      || Number(entry.remainingUses || 0) <= 0) return true;
    if(entry.bindFirstWeapon && entry.boundWeaponName)return true;
    consumed.push({ effectHash: entry.effectHash, sourceDefinitionId: entry.sourceDefinitionId,
      keyword: entry.keyword, value: entry.value });
    if(entry.bindFirstWeapon){
      Object.assign(entry, bindGrantedWeapon(entry, weaponName, state.round));
      return true;
    }
    entry.remainingUses = Number(entry.remainingUses) - 1;
    return entry.remainingUses > 0;
  });
  return freezeDeep(consumed.sort((left, right) => (
    left.effectHash.localeCompare(right.effectHash))));
}
function query(bundle, state, request = {}, authorizeSeekerCast = null) {
  const queryKind = String(request.queryKind || request.kind || "");
  if (queryKind === "instantiate_parameterized_action") {
    const domain = enumerate(bundle, state, { sideKey: request.sideKey
      || state.activeSideKey, includeDisabled: true }, authorizeSeekerCast).parameterDomains.find((entry) => (
      entry.domainId === request.domainId));
    if (!domain) fail("CHARACTERISTIC_STATUS_QUERY_DOMAIN_STALE");
    const result = preview(bundle, state, { domain, parameters: request.parameters || {} }, authorizeSeekerCast);
    return seal({ schema: "starcraft_tmg_official_characteristic_status_query_v1",
      semanticVersion: "1.0.0", queryKind, precision: "exact",
      result: { preview: result, action: result.action },
      source: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  if (queryKind === "definition_routes") {
    return seal({ schema: "starcraft_tmg_official_characteristic_status_query_v1",
      semanticVersion: "1.0.0", queryKind, precision: "exact",
      result: { routes: clone(bundle.routes), routeCount: bundle.routeCount },
      source: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
      rulesAuthority: true, mutationAuthority: false,
      sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
  }
  if (queryKind !== "characteristic_status_projection") {
    fail("CHARACTERISTIC_STATUS_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  return seal({ schema: "starcraft_tmg_official_characteristic_status_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact",
    result: projectOfficialCharacteristicStatusFamilyModifiersV1(bundle, state, request),
    source: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

function lifecycle(bundle, stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!["activation_start", "action_performed", "activation_end", "round_end",
    "cleanup_and_refresh"].includes(eventKind)) return null;
  const state = clone(stateInput);
  const events = [...cleanupOfficialCharacteristicAreaEffectsV1(bundle, state, eventKind),
    ...expireOfficialForceWallsV1(state, eventKind), ...expireOfficialExecutorsWillV1(state, eventKind),
    ...expireOfficialKhalasGiftV1(state, eventKind)];
  expireOfficialOurMindsFirstAbilityV1(state, eventKind);
  if (eventKind === "activation_start") {
    const piece = state.pieces.find(entry => entry.id === request.pieceId);
    applyRegenerationAtActivationStart(bundle, state, piece, events);
  }
  const expiringHashes = new Set();
  for (const piece of state.pieces || []) {
    piece.statuses = (piece.statuses || []).filter((entry) => {
      const targetedAction = eventKind === "action_performed"
        && request.pieceId && piece.id !== request.pieceId;
      const remove = entry.sourceAdapterId === OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID
        && entry.expiresAt === eventKind && !targetedAction;
      if (remove && entry.statusEffectHash) expiringHashes.add(entry.statusEffectHash);
      return !remove;
    });
  }
  state.board.effectMarkers = (state.board?.effectMarkers || []).filter((entry) => (
    !expiringHashes.has(entry.statusEffectHash)));
  for (const piece of state.pieces || []) {
    if (piece.officialAbilityEffects) {
      piece.officialAbilityEffects = piece.officialAbilityEffects.filter(
        entry => !expiringHashes.has(entry.linkedStatusEffectHash));
    }
  }
  if (events.length === 0 && expiringHashes.size === 0) return state;
  state.characteristicStatusLifecycleHistory =
    state.characteristicStatusLifecycleHistory || [];
  state.characteristicStatusLifecycleHistory.push({
    lifecycleKey: `${state.round}:${state.phase}:${eventKind}:${request.pieceId || "all"}`,
    round: Number(state.round), phase: state.phase, eventKind,
    pieceId: request.pieceId || null, removedStatusEffectHashes: [...expiringHashes].sort(),
    events: clone(events), trainingTruth: false });
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: { actionType: "characteristic_status_lifecycle",
      eventKind, pieceId: request.pieceId || null }, events: clone(events) });
  return state;
}

export function createOfficialCharacteristicStatusFamilyAdapterV1(bundle, { authorizeSeekerCast = null, afterApply } = {}) {
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_CHARACTERISTIC_STATUS_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    activeResourcePaymentExact: true,
    statusLifecycleExact: true,
    geometryRangeUsesCompleteBases: true,
    consumerQuerySeamExplicit: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
  return freezeDeep({
    descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options, authorizeSeekerCast),
    preview: (state, request = {}) => preview(bundle, state, request, authorizeSeekerCast),
    apply: (state, request = {}) => {
      const result = apply(bundle, state, request, authorizeSeekerCast);
      return afterApply ? freezeDeep(afterApply(result)) : result;
    },
    query: (state, request = {}) => query(bundle, state, request, authorizeSeekerCast),
    lifecycle: (state, request = {}) => lifecycle(bundle, state, request),
  });
}
