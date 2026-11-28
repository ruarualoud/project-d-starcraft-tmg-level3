import { allowsOfficialInfestationReactionV1 } from '../rule-atoms/official-infestation-restrictions-v1.mjs';
import {OFFICIAL_CORRODE_ARMOUR_ID,OFFICIAL_CORRODE_ARMOUR_REACTION_COMPONENTS_V1} from '../source-data/official-corrode-armour-source-v1.mjs';
import {applyOfficialCorrodeArmourDebuffV1,applyOfficialBurrowStatusV1} from './official-characteristic-status-family-adapter-v1.mjs';
import {OFFICIAL_ADDED_STATUS_REACTIONS_V1,resolveOfficialAddedCardReactionTargetsV1} from './official-added-card-reaction-facts-v1.mjs';
import { allowsOfficialSpawnRoundSpecialAbilityV1 } from '../rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import { OFFICIAL_OCULAR_OVERWATCH_DEFINITION_ID } from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { OFFICIAL_INFESTATION_TRANSFER_DEFINITION_ID, resolveOfficialInfestationTransferTargetsV1,
  applyOfficialInfestationTransferStatusV1,applyOfficialInfestationDebuffV1 } from './official-infestation-transfer-facts-v1.mjs';
import { WAVE4_REACTION_REVISIONS } from '../../content/source-releases/wave4-20261127/ability-review-v1.mjs';
import { projectOfficialRangedFamilyModifiersV1 } from './official-ranged-family-projection-v1.mjs';
import { OFFICIAL_OPTICAL_FLARE_DEFINITION_ID } from './official-targeted-active-ability-policy-v1.mjs';
import { OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID } from './official-ancestral-wisdom-payment-v1.mjs';
import { listOfficialNonUniqueExhaustedTacticalCardIdsV1 } from './official-ranged-card-refresh-runtime-v1.mjs';
import { quoteOfficialUnitAbilityModifiersV1, consumeOfficialUnitAbilityModifiersV1 } from './official-unit-ability-payment-modifiers-v1.mjs';
import { isDeepStrictEqual } from "node:util";
import { deriveOfficialEngagementGraphV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { evaluateOfficialElevatedLineOfSightV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID, projectOfficialDarkSwarmReactionFactsV1 }
  from './official-dark-swarm-reaction-facts-v1.mjs';
import { enumerateOfficialConsumePaymentChoicesV1, prepareOfficialConsumePaymentV1, applyOfficialConsumePaymentV1 }
  from './official-consume-payment-runtime-v1.mjs';
import { OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID, OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID } from '../rule-atoms/official-charge-speed-debuff-policy-v1.mjs';
import { OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID, readOfficialOverwatchAttackGrantV1 }
  from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { applyOfficialHiddenLossCharacteristicEffectsV1, applyOfficialRangedReactionHitDebuffV1 }
  from './official-characteristic-status-family-adapter-v1.mjs';

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { resolveOfficialAbilityResourcePaymentV1 } from
  "../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import { verifyOfficialAbilityEffectIrCatalogueV1 } from
  "../source-data/official-ability-effect-ir-v1.mjs";
import { verifyOfficialCurrentProductAbilityDenominatorV1 } from
  "./official-current-product-ability-denominator-v1.mjs";
import { resolveOfficialMatchLifecycleAbilityResourceCostV1, quoteOfficialSelectedUnitPsionicLinkV1 } from
  "./official-match-lifecycle-family-adapter-v1.mjs";
import { hasOfficialFaqReactionPolicyV13 } from
  "../rule-atoms/official-faq-reaction-policy-v13.mjs";
import { allowsOfficialAbilityUnitRecipientV13, hasOfficialStructureTargetingPolicyV13 } from
  "../rule-atoms/official-structure-targeting-policy-v13.mjs";

export const OFFICIAL_REACTION_FAMILY_ADAPTER_ID =
  "official-reaction-family-adapter-v1";
export const OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION = "1.0.0";
export const OFFICIAL_REACTION_FAMILY_BUNDLE_SCHEMA =
  "starcraft_tmg_official_reaction_family_source_bundle_v1";
export const OFFICIAL_REACTION_FAMILY_PARAMETER_KIND =
  "official_reaction_family_choice_v1";
export const OFFICIAL_REACTION_FAMILY_WINDOW_SCHEMA =
  "starcraft_tmg_official_reaction_family_window_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const TRIGGER_KINDS = new Set([
  'before_casualty_batch',
  "ability_cost_payment",
  "after_charge_roll",
  "after_place",
  "after_ranged_attack_resolved",
  "after_successful_charge",
  "attack_target_selected",
  "before_armour_roll",
  "before_evade_roll",
  "charge_declared",
  "damage_received",
  "debuff_received",
  "friendly_supply_reduced",
  "infested_enemy_removed",
  "hidden_lost",
  "ranged_attack_declared",
  "reserve_entered_non_entry",
  "unit_activation_ended",
  'unit_action_ended',
]);
const EXPECTED_ARCHETYPE_COUNTS = Object.freeze({
  armour_dodge: 1,
  armour_tough: 4,
  charge_distance_add: 1,
  charge_roll_advantage: 1,
  charge_speed_debuff: 1,
  damage_reduce_by_nearby_models: 1,
  damage_reduce_fixed: 2,
  damage_reduce_mark_activated: 1,
  evade_eligibility: 1,
  evade_roll_modifier: 1,
  followup_move_towards_attacker: 1,
  followup_second_charge: 1,
  post_place_heal: 1,
  ranged_attack_hit_debuff: 1,
  ranged_attack_redirect: 1,
  remove_debuffs: 3,
  reserve_entry_hits: 1,
  resource_cost_discount: 1,
});

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
function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("REACTION_FAMILY_SIDE_INVALID", sideKey);
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && model?.isOnField !== false);
}
function tags(piece) {
  return new Set([piece?.combatTag, ...(piece?.combatTags || [])]
    .map(normalized).filter(Boolean));
}
function modelRadius(model) {
  const width = Number(model?.baseWidthInches || 0);
  const depth = Number(model?.baseDepthInches || width);
  return Math.max(width, depth) / 2;
}
function modelGap(left, right) {
  return Math.max(0, Math.hypot(Number(left.xInches) - Number(right.xInches),
    Number(left.yInches) - Number(right.yInches))
    - modelRadius(left) - modelRadius(right));
}
function unitWithin(left, right, rangeInches) {
  const distances = liveModels(left).flatMap((leftModel) => liveModels(right).map(
    (rightModel) => modelGap(leftModel, rightModel)));
  return distances.length > 0 && Math.min(...distances) <= Number(rangeInches) + 0.001;
}
function engaged(state, piece) {
  return (state.pieces || []).some((enemy) => enemy.sideKey !== piece.sideKey
    && activePiece(enemy) && unitWithin(piece, enemy, 0));
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
  const match = String(definition.activationText || "").match(
    /\((\d+)\s+(Command Point|Biomass|Psionic Energy)\)/iu);
  if (!match) return { resourceType: null, resourceCost: 0 };
  const name = normalized(match[2]);
  return { resourceType: name === "command point" ? "CP"
    : name === "biomass" ? "BM" : "PE", resourceCost: Number(match[1]) };
}
function routeBase(definition, spec) {
  return {
    schema: "starcraft_tmg_official_reaction_definition_route_v1",
    semanticVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
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

function compileRoute(definition) {
  const name = definition.definitionName;
  const text = definition.sourceText;
  let spec = null;
  if (["Ground Armor", "Infantry Armor", "Vehicle Plating", "Carapace"].includes(name)
    && /before a Friendly (?:[A-Za-z]+ )?Unit makes an Armour Roll.+TOUGH \(1\)/iu
      .test(text)) {
    const requiredTargetTag = name === "Ground Armor" ? "ground"
      : name === "Infantry Armor" ? "biological"
        : name === "Vehicle Plating" ? "mechanical" : null;
    spec = { effectKind: "armour_tough", triggerKind: "before_armour_roll",
      requiredTargetTag, tough: 1, effectDuration: "this_roll" };
  } else if (name === "Guardian Shell"
    && /Friendly Ground Unit makes an Armour Roll.+DODGE \(2\)/iu.test(text)) {
    spec = { effectKind: "armour_dodge", triggerKind: "before_armour_roll",
      requiredTargetTag: "ground", dodge: 2, effectDuration: "this_roll" };
  } else if (name === "Hierarch’s Stand"
    && /another Friendly Unit Within 8.+redirect the attack/iu.test(text)) {
    spec = { effectKind: "ranged_attack_redirect",
      triggerKind: "ranged_attack_declared", rangeInches: 8,
      requiresAnotherFriendlyTarget: true, requiresValidRedirectTarget: true,
      redirectedTargetEvadeEligible: true, effectDuration: "activation_end" };
  } else if (name === "Lightning Dash"
    && /successful Charge action.+second Charge action.+different Enemy Unit/iu.test(text)) {
    spec = { effectKind: "followup_second_charge",
      triggerKind: "after_successful_charge", differentEnemyRequired: true,
      ignoresEngagedChargeRestriction: true,
      devastatingChargeSecondTriggerAllowed: false, effectDuration: "followup_action" };
  } else if (name === "Restoration"
    && /Friendly Unit Within 4.+Remove all DEBUFFS/iu.test(text)) {
    spec = { effectKind: "remove_debuffs", triggerKind: "debuff_received",
      rangeInches: 4, removesAllDebuffs: true, effectDuration: "immediate" };
  } else if (name === "Veil of Shadows"
    && /after a Friendly Unit resolves a PLACE effect.+HEAL \(2\)/iu.test(text)) {
    spec = { effectKind: "post_place_heal", triggerKind: "after_place",
      heal: 2, effectDuration: "immediate" };
  } else if (name === "Life Support"
    && /another Friendly Biological Unit suffers Damage Within 4/iu.test(text)) {
    spec = { effectKind: "damage_reduce_by_nearby_models",
      triggerKind: "damage_received", rangeInches: 4,
      requiresAnotherFriendlyTarget: true, requiredTargetTag: "biological",
      reductionPerInRangeModel: 1, minimumDamage: 0,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Advanced Training"
    && /Friendly Support Unit activates a Special Ability that costs CP/iu.test(text)) {
    spec = { effectKind: "resource_cost_discount",
      triggerKind: "ability_cost_payment", requiredTargetTag: "support",
      discountedResourceType: "CP", resourceCostReduction: 1,
      minimumResourceCost: 0, oncePerRound: true,
      exhaustSourceCard: false, effectDuration: "this_payment" };
  } else if (name === "Dae’Uhl"
    && /Friendly Unit receives Damage.+reduce the Total Damage by 2.+minimum of 1/iu.test(text)) {
    spec = { effectKind: "damage_reduce_fixed", triggerKind: "damage_received",
      damageReduction: 2, minimumDamage: 1,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Transfusion"
    && /another Friendly Biological Unit.+suffers Damage Within 4.+by 2/iu.test(text)) {
    spec = { effectKind: "damage_reduce_fixed", triggerKind: "damage_received",
      rangeInches: 4, requiresAnotherFriendlyTarget: true,
      requiredTargetTag: "biological", structuresAllowed: true,
      damageReduction: 2, minimumDamage: 0,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Photon Overcharge"
    && /Enemy Unit enters the battlefield from Reserves.+other than its own Entry Edge.+HITS 3 \(1\)/iu.test(text)) {
    spec = { effectKind: "reserve_entry_hits",
      triggerKind: "reserve_entered_non_entry", automaticHits: 3,
      damagePerHit: 1, effectDuration: "immediate" };
  } else if (name === "Zealous Round"
    && /not Activated and receives Damage.+count this Unit as Activated.+reduce.+by 2/iu.test(text)) {
    spec = { effectKind: "damage_reduce_mark_activated",
      triggerKind: "damage_received", damageReduction: 2, minimumDamage: 0,
      sourceMustEqualTarget: true, requiresNotActivated: true,
      effectDuration: "this_damage_allocation" };
  } else if (name === "Brood Instinct"
    && /before a Friendly Unit makes an Evade Roll.+\+1 Modifier/iu.test(text)) {
    spec = { effectKind: "evade_roll_modifier", triggerKind: "before_evade_roll",
      evadeModifier: 1, effectDuration: "this_roll" };
  } else if (name === "Lunge"
    && /another Friendly Unit Within 10.+target of a Ranged Attack.+after the attack.+Move action Directly Towards/iu.test(text)) {
    spec = { effectKind: "followup_move_towards_attacker",
      triggerKind: "after_ranged_attack_resolved", rangeInches: 10,
      requiresAnotherFriendlyTarget: true, requiresUnengagedSource: true,
      destinationConstraint: "directly_towards_attacker",
      movementDistanceSource: "current_speed", effectDuration: "followup_action" };
  } else if (name === "Pneumatized Carapace"
    && /after a Friendly Unit rolls a D6 for Charge Distance.+additional D6.+higher result/iu.test(text)) {
    spec = { effectKind: "charge_roll_advantage", triggerKind: "after_charge_roll",
      additionalDice: 1, keepHighest: 1, effectDuration: "this_charge_roll" };
  } else if (name === "Gravitic Boosters"
    && /after a Friendly Unit rolls a D6 for Charge Distance.+Add 1/iu.test(text)) {
    spec = { effectKind: "charge_distance_add", triggerKind: "after_charge_roll",
      chargeDistanceModifier: 1, effectDuration: "this_charge_roll" };
  } else if (name === "Concussive Shells"
    && /Enemy declares a Charge against a Friendly Unit Within 8.+DEBUFF Speed \(2\)/iu.test(text)) {
    spec = { effectKind: "charge_speed_debuff", triggerKind: "charge_declared",
      rangeInches: 8, speedModifier: -2, effectDuration: "cleanup_and_refresh" };
  } else if (name === "Debilitating Saliva"
    && /Enemy Unit Within 8.+declares a Ranged Attack.+DEBUFF Hit \(1\)/iu.test(text)) {
    spec = { effectKind: "ranged_attack_hit_debuff",
      triggerKind: "ranged_attack_declared", rangeInches: 8,
      hitModifier: -1, effectDuration: "cleanup_and_refresh" };
  } else if (name === "Hallucination"
    && /Enemy Unit declares a Ranged Attack against a Friendly Unit Within 4.+eligible.+Evade Roll/iu.test(text)) {
    spec = { effectKind: "evade_eligibility",
      triggerKind: "ranged_attack_declared", rangeInches: 4,
      evadeEligible: true, effectDuration: "this_attack" };
  }
  if (!spec) fail("REACTION_DEFINITION_COMPILER_UNRECOGNIZED",
    `${definition.recordKey}:${name}`);
  return seal(routeBase(definition, spec), "routeHash");
}

export function createOfficialReactionFamilySourceBundleV1(input = {}) {
  const { catalogue, denominator } = input;
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  verifyOfficialCurrentProductAbilityDenominatorV1(denominator);
  if (denominator.sourceCatalogueHash !== catalogue.catalogueHash) {
    fail("REACTION_SOURCE_CATALOGUE_DENOMINATOR_DRIFT");
  }
  const pendingIds = new Set(denominator.gapDefinitionIds);
  const owned = denominator.definitions.filter((entry) => (
    entry.plannedOwnerSlice === 236 && pendingIds.has(entry.definitionId)));
  const definitions = owned.map((entry) => catalogue.definitions.find((candidate) => (
    candidate.definitionId === entry.definitionId)));
  if (definitions.length !== 24 || definitions.some((entry) => !entry)) {
    fail("REACTION_SOURCE_DENOMINATOR_INVALID", String(definitions.length));
  }
  const routes = definitions.map(compileRoute).sort((left, right) => (
    left.definitionId.localeCompare(right.definitionId)));
  const archetypeCounts = Object.fromEntries([...new Set(routes.map((entry) => (
    entry.effectKind)))].sort().map((kind) => [kind, routes.filter((entry) => (
    entry.effectKind === kind)).length]));
  const body = {
    schema: OFFICIAL_REACTION_FAMILY_BUNDLE_SCHEMA,
    semanticVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash,
    sourceDenominatorHash: denominator.denominatorHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash,
    dataVersions: { ...catalogue.dataVersions },
    routeCount: routes.length,
    archetypeCounts,
    triggerKinds: [...new Set(routes.map((entry) => entry.triggerKind))].sort(),
    routes,
    definitionIds: routes.map((entry) => entry.definitionId),
    coveredSourceFeatureHashes: routes.map((entry) => entry.sourceFeatureHash).sort(),
    compilerDenominatorComplete: true,
    activePlayerReactionPriorityFirst: true,
    oneReactionPerPlayerPerActivation: true,
    sameNamedReactionPerSourceUnitPerRound: true,
    exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_reaction_source_compiler",
    trainingTruth: false,
  };
  const bundle = seal(body, "bundleHash");
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  return bundle;
}

export const OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID = 'unit:hydralisk/lunge-assault-phase@1';
export const OFFICIAL_DEBILITATING_SALIVA_DEFINITION_ID = 'unit:vile__roach_/debilitating-saliva-any-phase@1';

export const OFFICIAL_BROOD_INSTINCT_DEFINITION_ID = 'card:zerg_swarm/brood-instinct-any@1';

export const OFFICIAL_PNEUMATIZED_CARAPACE_ID = 'card:overseer/pneumatized-carapace-any@1';
export const OFFICIAL_EVOLUTION_CARAPACE_ID = 'card:evolution_chamber/carapace-any@1';

export const ARTANIS_STAND_DEFINITION_ID = 'unit:artanis/hierarch-s-stand-assault-phase@1';
export const ARTANIS_DASH_DEFINITION_ID = 'unit:artanis/lightning-dash-assault-phase@1';
const LEGACY_REVIEWED_REACTION_COMPONENTS_V2 = Object.freeze({
  'card:overcharged_nexus/photon-overcharge-any@1': Object.freeze({
    recordKey:'tactical_cards:overcharged_nexus',sourceKind:'card_feature',resourceType:null,resourceCost:0,abilityName:'Photon Overcharge',
    sourceText:"Photon Overcharge <Reaction> <Any Phase>: Use when an Enemy Unit enters the battlefield from Reserves via a location other than its own Entry Edge. That Unit immediately suffers HITS 3 (1).",
    spec:Object.freeze({effectKind:'reserve_entry_hits',triggerKind:'reserve_entered_non_entry',automaticHits:3,damagePerHit:1,effectDuration:'immediate'}),
  }),
  "unit:sentry/hallucination-assault-phase@1": Object.freeze({
    recordKey: "army_units:sentry", sourceKind: 'unit_feature', resourceType: 'PE', resourceCost: 0, phase: 'assault',
    abilityName: "Hallucination", sourceText: "When an Enemy Unit declares a Ranged Attack against a Friendly Unit Within 4\", the targeted Friendly Unit is eligible to make an Evade Roll against that attack.",
    spec: Object.freeze({"effectKind":"evade_eligibility","triggerKind":"attack_target_selected","rangedDeclarationOnly":true,"rangeInches":4,"modelRangeGeometryV2":true,"evadeEligible":true,"effectDuration":"this_attack"}),
  }),
  "unit:zealot/zealous-round-assault-phase@1": Object.freeze({
    recordKey: "army_units:zealot", sourceKind: 'unit_feature', resourceType: 'PE', resourceCost: 0, phase: 'assault',
    abilityName: "Zealous Round", sourceText: "When this Unit is not Activated and receives Damage, the controlling player may count this Unit as Activated in this Phase (flip its Activation Marker) to reduce the Total Damage by 2.",
    spec: Object.freeze({"effectKind":"damage_reduce_mark_activated","triggerKind":"damage_received","damageReduction":2,"minimumDamage":0,"sourceMustEqualTarget":true,"requiresNotActivated":true,"effectDuration":"this_damage_allocation"}),
  }),
  "card:forge/ground-armor-any@1": Object.freeze({
    recordKey: "tactical_cards:forge", sourceKind: 'card_feature', resourceType: null, resourceCost: 0, phase: "any",
    abilityName: "Ground Armor", sourceText: "Ground Armor <Reaction> <Any Phase>: Use before a Friendly Ground Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.",
    spec: Object.freeze({"effectKind":"armour_tough","triggerKind":"before_armour_roll","requiredTargetTag":"ground","tough":1,"effectDuration":"this_roll"}),
  }),
  "card:observer/gravitic-boosters-any@1": Object.freeze({
    recordKey: "tactical_cards:observer", sourceKind: 'card_feature', resourceType: null, resourceCost: 0, phase: "assault",
    abilityName: "Gravitic Boosters", sourceText: "Gravitic Boosters <Reaction> <Assault Phase>: Use after a Friendly Unit rolls a D6 for Charge Distance. Add 1 to the Charge Distance for this Unit.",
    spec: Object.freeze({"effectKind":"charge_distance_add","triggerKind":"after_charge_roll","chargeDistanceModifier":1,"nativeChargeDistance":true,"effectDuration":"this_charge_roll"}),
  }),
  "card:power_field/guardian-shell-any@1": Object.freeze({
    recordKey: "tactical_cards:power_field", sourceKind: 'card_feature', resourceType: null, resourceCost: 0, phase: "any",
    abilityName: "Guardian Shell", sourceText: "Guardian Shell <Reaction> <Any Phase>: Use before a Friendly Ground Unit makes an Armour Roll. That Unit gains DODGE (2) for this roll.",
    spec: Object.freeze({"effectKind":"armour_dodge","triggerKind":"before_armour_roll","requiredTargetTag":"ground","dodge":2,"effectDuration":"this_roll"}),
  }),
  [ARTANIS_STAND_DEFINITION_ID]: Object.freeze({
    recordKey:'army_units:artanis', sourceKind:'unit_feature', phase:'assault', abilityName:'Hierarch’s Stand',
    resourceType:'PE', resourceCost:1,
    sourceText:'When another Friendly Unit Within 8" is declared as the target of a Ranged Attack and this Unit is a valid target, redirect the attack to this Unit. This Unit is eligible to make an Evade Roll against the redirected attack. This Special Ability remains active until the End of the current Activation.',
    spec:Object.freeze({ effectKind:'ranged_attack_redirect', triggerKind:'ranged_attack_declared', rangeInches:8,
      requiresAnotherFriendlyTarget:true, requiresValidRedirectTarget:true, modelRangeGeometryV2:true,
      redirectedTargetEvadeEligible:true, effectDuration:'activation_end' }),
  }),
  [ARTANIS_DASH_DEFINITION_ID]: Object.freeze({
    recordKey:'army_units:artanis', sourceKind:'unit_feature', phase:'assault', abilityName:'Lightning Dash',
    resourceType:'PE', resourceCost:1,
    sourceText:'After this Unit resolves a successful Charge action, it may declare a second Charge action against a different Enemy Unit, ignoring the restriction on Charging while Engaged. The Devastating Charge ability does not trigger a second time.',
    spec:Object.freeze({ effectKind:'followup_second_charge', triggerKind:'after_successful_charge', differentEnemyRequired:true,
      ignoresEngagedChargeRestriction:true, devastatingChargeSecondTriggerAllowed:false, effectDuration:'followup_action' }),
  }),
  [OFFICIAL_PNEUMATIZED_CARAPACE_ID]: Object.freeze({
    recordKey: 'tactical_cards:overseer', sourceKind: 'card_feature', resourceType: null,
    phase: 'assault', abilityName: 'Pneumatized Carapace', resourceCost: 0,
    sourceText: "Pneumatized Carapace <Reaction> <Assault Phase>: Use after a Friendly Unit rolls a D6 for Charge Distance. Roll an additional D6 and use the higher result to calculate the total Charge Distance.",
    spec: Object.freeze({ effectKind: 'charge_roll_advantage', triggerKind: 'after_charge_roll',
      additionalDice: 1, keepHighest: 1, effectDuration: 'this_charge_roll', nativeChargeDie: true }),
  }),
  [OFFICIAL_EVOLUTION_CARAPACE_ID]: Object.freeze({
    recordKey: 'tactical_cards:evolution_chamber', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Carapace', resourceCost: 0,
    sourceText: "Carapace <Reaction> <Any Phase>: Use before a Friendly Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.",
    spec: Object.freeze({ effectKind: 'armour_tough', triggerKind: 'before_armour_roll',
      requiredTargetTag: null, tough: 1, effectDuration: 'this_roll' }),
  }),
  [OFFICIAL_BROOD_INSTINCT_DEFINITION_ID]: Object.freeze({
    recordKey: 'tactical_cards:zerg_swarm', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Brood Instinct', resourceCost: 0,
    sourceText: 'Brood Instinct <Reaction> <Any Phase>: Use before a Friendly Unit makes an Evade Roll. Apply a +1 Modifier to that roll.',
    spec: Object.freeze({ effectKind: 'evade_roll_modifier', triggerKind: 'before_evade_roll',
      requiresNonemptyEvadePool: true, evadeModifier: 1, effectDuration: 'this_roll' }),
  }),
  [OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:hydralisk', sourceKind: 'unit_feature', phase: 'assault',
    resourceType: 'BM', resourceCost: 1, abilityName: 'Lunge',
    sourceText: 'When another Friendly Unit Within 10" is the target of a Ranged Attack, after the attack is fully resolved, this Unit, if Unengaged, may perform a Move action Directly Towards the attacking Unit.',
    spec: Object.freeze({ effectKind: 'followup_move_towards_attacker', triggerKind: 'after_ranged_attack_resolved',
      rangeInches: 10, requiresAnotherFriendlyTarget: true, requiresUnengagedSource: true,
      engagementGeometryVersion: 2, requiresRangedTargetSnapshot: true,
      destinationConstraint: 'directly_towards_attacker', movementDistanceSource: 'current_speed',
      effectDuration: 'followup_action' }),
  }),
  [OFFICIAL_DEBILITATING_SALIVA_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:vile__roach_', sourceKind: 'unit_feature', resourceType: 'BM',
    abilityName: 'Debilitating Saliva', resourceCost: 1,
    sourceText: "Use when an Enemy Unit Within 8\" of this Unit declares a Ranged Attack. Apply DEBUFF Hit (1) to each of that Unit's Ranged Weapons.",
    spec: Object.freeze({ effectKind: 'ranged_attack_hit_debuff', triggerKind: 'ranged_attack_declared',
      rangeInches: 8, hitModifier: -1, effectDuration: 'cleanup_and_refresh',
      modelRangeGeometryV2: true, persistentRangedHitDebuff: true }),
  }),
  'unit:medic/restoration-any-phase@1': Object.freeze({
    recordKey: 'army_units:medic', sourceKind: 'unit_feature', resourceType: 'CP',
    abilityName: 'Restoration', resourceCost: 1,
    sourceText: 'Use when a Friendly Unit Within 4" receives a DEBUFF. Remove all DEBUFFS from it.',
    spec: Object.freeze({ effectKind: 'remove_debuffs', triggerKind: 'debuff_received', rangeInches: 4,
      modelRangeGeometryV2: true, removesAllDebuffs: true, cleanseLinkedEffects: true, effectDuration: 'immediate' }),
  }),
  'unit:sentry/restoration-any-phase@1': Object.freeze({
    recordKey: 'army_units:sentry', sourceKind: 'unit_feature', resourceType: 'PE',
    abilityName: 'Restoration', resourceCost: 1,
    sourceText: 'Use when a Friendly Unit Within 4" receives a DEBUFF. Remove all DEBUFFS from it.',
    spec: Object.freeze({ effectKind: 'remove_debuffs', triggerKind: 'debuff_received', rangeInches: 4,
      modelRangeGeometryV2: true, removesAllDebuffs: true, cleanseLinkedEffects: true, effectDuration: 'immediate' }),
  }),
  'unit:queen/restoration-any-phase@1': Object.freeze({
    recordKey: 'army_units:queen', sourceKind: 'unit_feature', resourceType: 'BM',
    abilityName: 'Restoration', resourceCost: 1,
    sourceText: 'Use when a Friendly Unit Within 4" receives a DEBUFF. Remove all DEBUFFS from it.',
    spec: Object.freeze({ effectKind: 'remove_debuffs', triggerKind: 'debuff_received', rangeInches: 4,
      modelRangeGeometryV2: true, removesAllDebuffs: true, cleanseLinkedEffects: true, effectDuration: 'immediate' }),
  }),
  'card:zagara_s_swarm/instinctive-reaction-any@1': Object.freeze({
    recordKey: 'tactical_cards:zagara_s_swarm', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Instinctive Reaction', resourceCost: 0,
    sourceText: 'Instinctive Reaction <Reaction> <Any Phase>: Use when an Enemy Unit declares a Close Combat Attack against a Friendly Unit. That Friendly Unit becomes eligible to make an Evade Roll against that attack.',
    spec: Object.freeze({ effectKind: 'evade_eligibility', triggerKind: 'attack_target_selected',
      meleeDeclarationOnly: true, evadeEligible: true, effectDuration: 'this_attack' }),
  }),
  'unit:medic/life-support-any-phase@1': Object.freeze({
    recordKey: 'army_units:medic', sourceKind: 'unit_feature', resourceType: 'CP',
    abilityName: 'Life Support', resourceCost: 1,
    sourceText: "Use when another Friendly Biological Unit suffers Damage Within 4\". Reduce the Total Damage before allocation by 1 for each model in this Unit that is Within 4\" of the damaged Unit.",
    spec: Object.freeze({ effectKind: 'damage_reduce_by_nearby_models', triggerKind: 'damage_received',
      rangeInches: 4, requiresAnotherFriendlyTarget: true, requiredTargetTag: 'biological',
      modelRangeGeometryV2: true, reductionPerInRangeModel: 1, minimumDamage: 0,
      effectDuration: 'this_damage_allocation' }),
  }),
  'unit:queen/transfusion-any-phase@1': Object.freeze({
    recordKey: 'army_units:queen', sourceKind: 'unit_feature', resourceType: 'BM',
    abilityName: 'Transfusion', resourceCost: 1,
    sourceText: 'Use when another Friendly Biological Unit (including a Structure) suffers Damage Within 4". Reduce the Total Damage before allocation by 2.',
    spec: Object.freeze({ effectKind: 'damage_reduce_fixed', triggerKind: 'damage_received',
      rangeInches: 4, requiresAnotherFriendlyTarget: true, requiredTargetTag: 'biological',
      modelRangeGeometryV2: true, structuresAllowed: true, damageReduction: 2, minimumDamage: 0,
      effectDuration: 'this_damage_allocation' }),
  }),
  'unit:zagara/transfusion-any-phase@1': Object.freeze({
    recordKey: 'army_units:zagara', sourceKind: 'unit_feature', resourceType: 'BM',
    abilityName: 'Transfusion', resourceCost: 1,
    sourceText: 'Use when another Friendly Biological Unit (including a Structure) suffers Damage Within 4". Reduce the Total Damage before allocation by 2.',
    spec: Object.freeze({ effectKind: 'damage_reduce_fixed', triggerKind: 'damage_received',
      rangeInches: 4, requiresAnotherFriendlyTarget: true, requiredTargetTag: 'biological',
      structuresAllowed: true, damageReduction: 2, minimumDamage: 0, effectDuration: 'this_damage_allocation' }),
  }),
  [OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:defiler', sourceKind: 'unit_feature', resourceType: 'BM', phase: 'assault',
    abilityName: 'Dark Swarm', resourceCost: 1,
    sourceText: `REPEATABLE. Use when a Friendly Unit Within 4" of a Friendly Dark Swarm token is selected as the target of an attack. If this Unit is Within 4'' of the same token, the Targeted Friendly Unit is eligible to make an Evade Roll against that attack. If the targeted Unit is a Size 1, it gains a +1 Modifier to this Evade Roll.`,
    spec: Object.freeze({ effectKind: 'evade_eligibility', triggerKind: 'attack_target_selected',
      requiresSharedFriendlyDarkSwarmToken: true, evadeEligible: true, effectDuration: 'this_attack' }),
  }),
  [OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:auto_turret', sourceKind: 'unit_feature', resourceType: 'CP', phase: 'assault',
    abilityName: 'Overwatch', resourceCost: 0,
    sourceText: 'Use when an Enemy Unit ends its Activation Within 8" of this Unit. This Unit immediately performs a Ranged Attack against that Enemy Unit.',
    spec: Object.freeze({ effectKind: 'overwatch_ranged_attack', triggerKind: 'unit_activation_ended',
      rangeInches: 8, weaponName: 'Gauss Cannon', effectDuration: 'this_attack',
      activationEndOwner: 'current_source_v1', explicitStructureSource: true }),
  }),
  [OFFICIAL_OCULAR_OVERWATCH_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:infested_missile_turret', sourceKind: 'unit_feature', resourceType: 'BM', phase: 'assault',
    abilityName: 'Ocular Overwatch', resourceCost: 0,
    sourceText: 'When an Enemy Flying Unit ends its Activation Within 14". This Unit immediately performs a Ranged Attack against that Enemy Unit.',
    spec: Object.freeze({ effectKind: 'overwatch_ranged_attack', triggerKind: 'unit_activation_ended',
      rangeInches: 14, weaponName: 'Firefly Missiles', requiredTargetTag: 'flying', effectDuration: 'this_attack',
      activationEndOwner: 'current_source_v1', explicitStructureSource: true }),
  }),
  [OFFICIAL_INFESTATION_TRANSFER_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:infested_missile_turret', sourceKind: 'unit_feature', resourceType: 'BM',
    abilityName: 'Infestation', resourceCost: 0,
    sourceText: 'When the Supply of an Enemy Unit with the INFESTATION Status is reduced to 0, or when that Unit is Destroyed, you can apply the INFESTATION Status to another Enemy Unit Within 8" of that Unit. For the purposes of resolving Special Abilities, this effect is treated as a DEBUFF.',
    spec: Object.freeze({ effectKind: 'infestation_transfer', triggerKind: 'infested_enemy_removed',
      explicitStructureSource: true, transferRangeMilliInches: 8000 }),
  }),
  [OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:spec_ops_marauder__marauder_', sourceKind: 'unit_feature',
    resourceType: 'CP', phase: 'assault', abilityName: 'Suppression Shells', resourceCost: 1,
    sourceText: 'When an Enemy declares a Charge against a Friendly Unit Within 8", that Enemy gains DEBUFF Speed (3).',
    spec: Object.freeze({ effectKind: 'charge_speed_debuff', triggerKind: 'charge_declared',
      rangeInches: 8, speedModifier: -3, effectDuration: 'cleanup_and_refresh',
      chargeDeclarationOwner: 'current_source_v1', rangeAndLosSubject: 'declared_friendly_targets' }),
  }),
  [OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID]: Object.freeze({
    recordKey: 'army_units:marauder', sourceKind: 'unit_feature',
    resourceType: 'CP', phase: 'assault', abilityName: 'Concussive Shells', resourceCost: 1,
    sourceText: 'When an Enemy declares a Charge against a Friendly Unit Within 8", that Enemy gains DEBUFF Speed (2).',
    spec: Object.freeze({ effectKind: 'charge_speed_debuff', triggerKind: 'charge_declared',
      rangeInches: 8, speedModifier: -2, effectDuration: 'cleanup_and_refresh',
      chargeDeclarationOwner: 'current_source_v1', rangeAndLosSubject: 'declared_friendly_targets' }),
  }),
  'unit:nova_stealth_mode/head-shot-assault-phase@1': Object.freeze({
    recordKey: 'army_units:nova_stealth_mode', sourceKind: 'unit_feature', resourceType: 'CP', phase: 'assault',
    abilityName: 'Head Shot', resourceCost: 1,
    sourceText: "Once Per Game. While this Unit is Unengaged and has the Stationary Status, when it makes a Ranged Attack with its C-20A Canister Rifle, treat that weapon's Damage characteristic as 3, and it gains CONCENTRATED FIRE (1).",
    spec: Object.freeze({ effectKind: 'ranged_declaration_keywords', triggerKind: 'ranged_attack_declared',
      sourceMustEqualTarget: true, requiresStationary: true, requiresUnengagedSource: true,
      engagementGeometryVersion: 2, weaponName: 'C-20A Canister Rifle', oncePerGame: true,
      weaponDamage: 3, concentratedFire: 1, effectDuration: 'this_attack' }),
  }),
  'card:daelaam/dae-uhl-any@1': Object.freeze({
    recordKey: 'tactical_cards:daelaam', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Dae’Uhl', resourceCost: 0,
    sourceText: "Dae’Uhl <Reaction> <Any Phase>: When a Friendly Unit receives Damage, reduce the Total Damage by 2 (to a minimum of 1).",
    spec: Object.freeze({ effectKind: 'damage_reduce_fixed', triggerKind: 'damage_received',
      damageReduction: 2, minimumDamage: 1, effectDuration: 'this_damage_allocation' }),
  }),
  'card:engineering_bay/infantry-armor-any@1': Object.freeze({
    recordKey: 'tactical_cards:engineering_bay', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Infantry Armor', resourceCost: 0,
    sourceText: "Infantry Armor <Reaction> <Any Phase>: Use before a Friendly Biological Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.",
    spec: Object.freeze({effectKind:'armour_tough',triggerKind:'before_armour_roll',requiredTargetTag:'biological',tough:1,effectDuration:'this_roll'}),
  }),
  'card:academy/advanced-training-any@1': Object.freeze({
    recordKey: 'tactical_cards:academy', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Advanced Training', resourceCost: 0,
    sourceText: "Advanced Training <Reaction> <Any Phase>: Once per Round, when a Friendly Support Unit activates a Special Ability that costs CP, resolve that ability with its CP cost reduced by 1 (to a minimum of 0). Do not Exhaust this card.",
    spec: Object.freeze({effectKind:'resource_cost_discount',triggerKind:'ability_cost_payment',requiredTargetTag:'support',discountedResourceType:'CP',resourceCostReduction:1,minimumResourceCost:0,oncePerRound:true,exhaustSourceCard:false,effectDuration:'this_payment'}),
  }),
  'card:armory/vehicle-plating-any@1': Object.freeze({
    recordKey: 'tactical_cards:armory', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Vehicle Plating', resourceCost: 0,
    sourceText: 'Vehicle Plating <Reaction> <Any Phase>: Use before a Friendly Mechanical Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.',
    spec: Object.freeze({ effectKind: 'armour_tough', triggerKind: 'before_armour_roll',
      requiredTargetTag: 'mechanical', tough: 1, effectDuration: 'this_roll' }),
  }),
  'unit:siege_tank/shaped-blast-assault-phase@1': Object.freeze({
    recordKey: 'army_units:siege_tank', sourceKind: 'unit_feature', resourceType: 'CP', phase: 'assault',
    abilityName: 'Shaped Blast', resourceCost: 0,
    sourceText: 'Once per Game. When this Unit declares a Ranged Attack action. If this Unit has SIEGE MODE Status, its weapon gains PINPOINT and LOCKED IN (4).',
    spec: Object.freeze({ effectKind: 'ranged_declaration_keywords', triggerKind: 'ranged_attack_declared',
      sourceMustEqualTarget: true, requiresSiegeMode: true, oncePerGame: true,
      pinpoint: true, lockedIn: 4, effectDuration: 'this_attack' }),
  }),
  'unit:siege_tank/smart-shells-assault-phase@1': Object.freeze({
    recordKey: 'army_units:siege_tank', sourceKind: 'unit_feature', resourceType: 'CP', phase: 'assault',
    abilityName: 'Smart Shells', resourceCost: 0,
    sourceText: 'Once per Game. When this Unit declares a Ranged Attack action. If this Unit has SIEGE MODE Status, its weapon gains INDIRECT FIRE and LONG RANGE (24).',
    spec: Object.freeze({ effectKind: 'ranged_declaration_keywords', triggerKind: 'ranged_attack_declared',
      sourceMustEqualTarget: true, requiresSiegeMode: true, oncePerGame: true,
      indirectFire: true, longRangeInches: 24, effectDuration: 'this_attack' }),
  }),
  'unit:zeratul/prophetic-vision-any-phase@1': Object.freeze({
    recordKey: 'army_units:zeratul', sourceKind: 'unit_feature', resourceType: 'PE',
    abilityName: 'Prophetic Vision', resourceCost: 1,
    sourceText: "REPEATABLE. Use when this Unit is selected as the target of an attack. This Unit's Evade characteristic is treated as 4+ against this attack and cannot be modified.",
    spec: Object.freeze({ effectKind: 'fixed_evade_characteristic', triggerKind: 'attack_target_selected',
      sourceMustEqualTarget: true, evadeThreshold: 4, evadeUnmodifiable: true, effectDuration: 'this_attack' }),
  }),
  'card:nerazim/might-of-the-nerazim-any@1': Object.freeze({
    recordKey: 'tactical_cards:nerazim', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Might Of The Nerazim', resourceCost: 0,
    sourceText: 'Might Of The Nerazim <Reaction> <Any Phase>: If a Friendly Unit loses the HIDDEN Status, it gains Buff Speed (2) and its first Weapon used CRITICAL HIT (2).',
    spec: Object.freeze({ effectKind: 'hidden_loss_might', triggerKind: 'hidden_lost', speedModifier: 2,
      criticalHit: 2, effectDuration: 'until_end_of_round' }),
  }),
  'card:vanadium_plating/crystalline-alloy-any@1': Object.freeze({
    recordKey: 'tactical_cards:vanadium_plating', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Crystalline Alloy', resourceCost: 0,
    sourceText: 'Crystalline Alloy <Reaction> <Any Phase>:  Use before a Friendly Mechanical Unit makes an Armour Roll. That Unit gains DODGE (2) for this roll.',
    spec: Object.freeze({ effectKind: 'armour_dodge', triggerKind: 'before_armour_roll',
      requiredTargetTag: 'mechanical', dodge: 2, effectDuration: 'this_roll' }),
  }),
  'card:robotics_facility/plasma-shields-any@1': Object.freeze({
    recordKey: 'tactical_cards:robotics_facility', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Plasma Shields', resourceCost: 0,
    sourceText: 'Plasma Shields <Reaction> <Any Phase>: Use before a Friendly Mechanical Ground Unit makes an Armour Roll. If this Unit has the Shielded Status, it gains TOUGH (1) and DODGE (1) for this roll.',
    spec: Object.freeze({ effectKind: 'armour_tough', triggerKind: 'before_armour_roll',
      requiredTargetTags: Object.freeze(['mechanical', 'ground']), requiresShielded: true,
      tough: 1, dodge: 1, effectDuration: 'this_roll' }),
  }),
  'unit:twilight_templar__high_templar_/bound-by-the-khala-any-phase@1': Object.freeze({
    recordKey: 'army_units:twilight_templar__high_templar_', sourceKind: 'unit_feature', resourceType: 'PE',
    abilityName: 'Bound by the Khala', resourceCost: 0,
    sourceText: 'Use when the Current Supply Value of another Friendly Unit Within 8" of this Unit is reduced. Return one Non-Unique Exhausted Tactical Card to the Ready state.',
    spec: Object.freeze({ effectKind: 'refresh_after_friendly_supply_loss', triggerKind: 'friendly_supply_reduced',
      friendlySupplyLossRangeMilliInches: 8000, effectDuration: 'immediate' }),
  }),
  [OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID]: Object.freeze({
    recordKey: 'tactical_cards:templar_archives', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Ancestral Wisdom', resourceCost: 0,
    sourceText: 'Ancestral Wisdom <Reaction> <Any Phase>: Once per Round, when a Friendly Support Unit activates a Special Ability that costs PE, resolve that ability with its PE cost reduced by 1 (to a minimum of 0). Do not Exhaust this card.',
    spec: Object.freeze({ effectKind: 'resource_cost_discount', triggerKind: 'ability_cost_payment',
      discountedResourceType: 'PE', resourceCostReduction: 1, minimumResourceCost: 0,
      oncePerRound: true, exhaustSourceCard: false, effectDuration: 'this_payment' }),
  }),
  'unit:immortal/shield-overcharge-any-phase@1': Object.freeze({
    recordKey: 'army_units:immortal', sourceKind: 'unit_feature', resourceType: 'PE',
    abilityName: 'Shield Overcharge', resourceCost: 1,
    sourceText: 'Use before this Unit makes an Armour Roll. If this Unit has the Shielded Status, It gains TOUGH (2) for this roll.',
    spec: Object.freeze({ effectKind: 'armour_tough', triggerKind: 'before_armour_roll',
      sourceMustEqualTarget: true, requiresShielded: true, tough: 2, effectDuration: 'this_roll' }),
  }),
  'unit:immortal/improved-barrier-any-phase@1': Object.freeze({
    recordKey: 'army_units:immortal', sourceKind: 'unit_feature', resourceType: 'PE',
    abilityName: 'Improved Barrier', resourceCost: 0,
    sourceText: 'Use when this Unit is selected as the target of an attack. If this Unit has the Shielded Status, the Damage characteristic of the attacking weapon is treated as a maximum of 1 for this attack.',
    spec: Object.freeze({ effectKind: 'weapon_damage_characteristic_cap', triggerKind: 'attack_target_selected',
      sourceMustEqualTarget: true, requiresShielded: true, maximumWeaponDamage: 1, effectDuration: 'this_attack' }),
  }),
  'card:twilight_council/veil-of-shadows-any@1': Object.freeze({
    recordKey: 'tactical_cards:twilight_council', sourceKind: 'card_feature', resourceType: null,
    abilityName: 'Veil of Shadows', resourceCost: 0,
    sourceText: 'Veil of Shadows <Reaction> <Any Phase>: Use after a Friendly Unit resolves a PLACE effect. That Unit immediately resolves the HEAL (2) effect.',
    spec: Object.freeze({ effectKind: 'post_place_heal', triggerKind: 'after_place', heal: 2, effectDuration: 'immediate' }),
  }),
});

// New source revisions share the already-reviewed executable spec, while their
// identity and exact source text remain independent from the frozen Wave3 rows.
const REVIEWED_REACTION_COMPONENTS_V2 = Object.freeze({
  ...LEGACY_REVIEWED_REACTION_COMPONENTS_V2,
  ...OFFICIAL_ADDED_STATUS_REACTIONS_V1,
  ...OFFICIAL_DETONATION_REACTION_COMPONENTS_V1,
  ...OFFICIAL_CORRODE_ARMOUR_REACTION_COMPONENTS_V1,
  ...Object.fromEntries(WAVE4_REACTION_REVISIONS.map(({ previousDefinitionId, definitionId, sourceText }) =>
    [definitionId, Object.freeze({ ...LEGACY_REVIEWED_REACTION_COMPONENTS_V2[previousDefinitionId], sourceText })])),
});

function compileReviewedReactionRouteV2(definition) {
  const reviewed = REVIEWED_REACTION_COMPONENTS_V2[definition?.definitionId];
  if (!reviewed || definition.recordKey !== reviewed.recordKey
    || definition.definitionName !== reviewed.abilityName
    || definition.activationKind !== 'reaction' || definition.phase !== (reviewed.phase || 'any')
    || definition.sourceKind !== reviewed.sourceKind || definition.runtimeRole !== 'reaction'
    || definition.sourceText !== reviewed.sourceText) {
    fail('REACTION_COMPONENT_SOURCE_UNRECOGNIZED', definition?.definitionId);
  }
  const route = routeBase(definition, reviewed.spec);
  if (route.resourceType !== reviewed.resourceType || route.resourceCost !== reviewed.resourceCost) fail('REACTION_COMPONENT_RESOURCE_SOURCE_MISMATCH');
  return seal(route, 'routeHash');
}

function reviewedReactionCountsV2(routes) {
  return Object.fromEntries([...new Set(routes.map(route => route.effectKind))].sort()
    .map(kind => [kind, routes.filter(route => route.effectKind === kind).length]));
}

function reviewedReactionRouteValidV2(route) {
  const reviewed = REVIEWED_REACTION_COMPONENTS_V2[route?.definitionId];
  return Boolean(reviewed && route.recordKey === reviewed.recordKey
    && route.abilityName === reviewed.abilityName && route.sourceText === reviewed.sourceText
    && route.sourceKind === reviewed.sourceKind && route.runtimeRole === 'reaction'
    && route.activationKind === 'reaction' && route.phase === (reviewed.phase || 'any')
    && route.resourceType === reviewed.resourceType && route.resourceCost === reviewed.resourceCost
    && route.exactSourcePatternCompiled === true && route.arbitraryProseExecutionClaimed === false
    && route.trainingTruth === false
    && Object.entries(reviewed.spec).every(([key, value]) => isDeepStrictEqual(route[key], value))
    && route.routeHash === hashStarcraftTmgContract(without(route, ['routeHash'])));
}

export function createOfficialReactionFamilySourceBundleV2({ catalogue, definitionIds } = {}) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  if (!Array.isArray(definitionIds) || !definitionIds.length
    || new Set(definitionIds).size !== definitionIds.length) fail('REACTION_COMPONENT_DEFINITION_SELECTION_INVALID');
  const routes = definitionIds.map(id => compileReviewedReactionRouteV2(
    catalogue.definitions.find(row => row.definitionId === id))).sort((left, right) => left.definitionId.localeCompare(right.definitionId));
  const body = {
    schema: 'starcraft_tmg_official_reaction_family_source_bundle_v2',
    semanticVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, dataVersions: clone(catalogue.dataVersions),
    routeCount: routes.length, routes, definitionIds: routes.map(row => row.definitionId),
    coveredSourceFeatureHashes: routes.map(row => row.sourceFeatureHash).sort(),
    archetypeCounts: reviewedReactionCountsV2(routes), triggerKinds: [...new Set(routes.map(route => route.triggerKind))].sort(),
    scope: 'explicit_source_definition_set', compilerDenominatorComplete: false,
    activePlayerReactionPriorityFirst: true, oneReactionPerPlayerPerActivation: true,
    sameNamedReactionPerSourceUnitPerRound: true, exactSourcePatternsRequired: true,
    arbitraryProseExecutionClaimed: false, sourceRefreshPerformed: false,
    productionRoomEligible: false, trainingTruth: false,
  };
  const bundle = seal(body, 'bundleHash');
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  return bundle;
}

export function verifyOfficialReactionFamilySourceBundleV1(bundle) {
  if (bundle?.schema === 'starcraft_tmg_official_reaction_family_source_bundle_v2') {
    const routes = bundle.routes;
    if (bundle.semanticVersion !== OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION
      || !Array.isArray(routes) || routes.length === 0 || routes.length > Object.keys(REVIEWED_REACTION_COMPONENTS_V2).length
      || bundle.routeCount !== routes.length || routes.some(route => !reviewedReactionRouteValidV2(route))
      || new Set(routes.map(route => route.definitionId)).size !== routes.length
      || !isDeepStrictEqual(bundle.definitionIds, routes.map(route => route.definitionId).sort())
      || !isDeepStrictEqual(bundle.coveredSourceFeatureHashes, routes.map(route => route.sourceFeatureHash).sort())
      || bundle.scope !== 'explicit_source_definition_set' || bundle.compilerDenominatorComplete !== false
      || !isDeepStrictEqual(bundle.archetypeCounts, reviewedReactionCountsV2(routes))
      || !isDeepStrictEqual(bundle.triggerKinds, [...new Set(routes.map(route => route.triggerKind))].sort())
      || bundle.activePlayerReactionPriorityFirst !== true || bundle.oneReactionPerPlayerPerActivation !== true
      || bundle.sameNamedReactionPerSourceUnitPerRound !== true || bundle.exactSourcePatternsRequired !== true
      || bundle.arbitraryProseExecutionClaimed !== false || bundle.sourceRefreshPerformed !== false
      || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
      || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ['bundleHash']))) {
      fail('REACTION_COMPONENT_SOURCE_BUNDLE_INVALID');
    }
    return true;
  }
  if (!object(bundle) || bundle.schema !== OFFICIAL_REACTION_FAMILY_BUNDLE_SCHEMA
    || bundle.semanticVersion !== OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION
    || bundle.routeCount !== 24 || bundle.routes?.length !== 24
    || new Set(bundle.definitionIds || []).size !== 24
    || new Set(bundle.coveredSourceFeatureHashes || []).size !== 24
    || new Set(bundle.routes.map((entry) => entry.routeHash)).size !== 24
    || bundle.routes.some((entry) => !TRIGGER_KINDS.has(entry.triggerKind)
      || entry.activationKind !== "reaction" || entry.runtimeRole !== "reaction"
      || entry.exactSourcePatternCompiled !== true
      || entry.arbitraryProseExecutionClaimed !== false
      || entry.routeHash !== hashStarcraftTmgContract(without(entry, ["routeHash"])))
    || !isDeepStrictEqual(bundle.archetypeCounts, EXPECTED_ARCHETYPE_COUNTS)
    || bundle.compilerDenominatorComplete !== true
    || bundle.activePlayerReactionPriorityFirst !== true
    || bundle.oneReactionPerPlayerPerActivation !== true
    || bundle.sameNamedReactionPerSourceUnitPerRound !== true
    || bundle.exactSourcePatternsRequired !== true
    || bundle.arbitraryProseExecutionClaimed !== false
    || bundle.sourceRefreshPerformed !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("REACTION_SOURCE_BUNDLE_INVALID");
  }
  return true;
}

export function createOfficialReactionFamilyDefinitionBindingsV1(bundle) {
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  return freezeDeep(bundle.routes.map((route) => ({
    sourceFeatureHash: route.sourceFeatureHash,
    adapterId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    capability: "authoritative_reaction",
  })).sort((left, right) => left.sourceFeatureHash.localeCompare(right.sourceFeatureHash)));
}

function routeInstances(state, route) {
  if (route.sourceKind === "unit_feature") {
    return (state.pieces || []).filter((piece) => piece.officialUnitRecordKey === route.recordKey
      && activePiece(piece) && fieldedFeature(piece, route)).map((piece) => ({
      sourceInstanceId: piece.id, sideKey: piece.sideKey, sourcePiece: piece,
    }));
  }
  return Object.entries(state.cardResources || {}).flatMap(([sideKey, cards]) => (
    (cards || []).filter((card) => card.officialCardRecordKey === route.recordKey
      && card.readiness === "ready").map((card) => ({
      sourceInstanceId: card.cardInstanceId, sideKey, sourceCard: card,
    }))
  ));
}
function piece(state, id) {
  return (state.pieces || []).find((entry) => entry.id === id) || null;
}
function sourceUsedThisRound(state, route, instance) {
  return (state.officialReactionHistory || []).some((entry) => (
    Number(entry.round) === Number(state.round)
      && entry.sourceInstanceId === instance.sourceInstanceId
      && entry.abilityName === route.abilityName));
}
function sideUsedThisActivation(state, sideKey, activationId) {
  return (state.officialReactionHistory || []).some((entry) => (
    entry.sideKey === sideKey && entry.activationId === activationId));
}
function reactionUseBlocked(state, window, route, instance) {
  if (route.oncePerGame && (state.officialReactionHistory || []).some(entry =>
    entry.definitionId === route.definitionId && entry.sourceInstanceId === instance.sourceInstanceId)) return true;
  if (!hasOfficialFaqReactionPolicyV13(state)) {
    return sourceUsedThisRound(state, route, instance)
      || sideUsedThisActivation(state, instance.sideKey, window.activationId);
  }
  const repeatable = /\bREPEATABLE\b/iu.test(route.sourceText);
  if (!repeatable && sourceUsedThisRound(state, route, instance)) return true;
  const history = (state.officialReactionHistory || []).filter(entry =>
    entry.sideKey === instance.sideKey && Number(entry.round) === Number(window.round));
  if (window.timing === "outside_activation") {
    return history.some(entry => entry.timing === "outside_activation"
      && (entry.phase === window.phase || entry.triggerHash === window.triggerHash));
  }
  return history.some(entry => entry.activationId === window.activationId);
}
function targetFor(window, state) {
  return piece(state, window.context.targetPieceId || window.context.affectedPieceId
    || window.context.placedPieceId);
}
function attackerFor(window, state) {
  return piece(state, window.context.attackerPieceId
    || window.context.chargingPieceId || window.context.actorPieceId);
}
// Effect recipients are compiled from the exact reaction archetype. The Unit
// which caused a trigger can be a reference while another Unit receives the effect.
const REACTION_RECIPIENT_ROLES = Object.freeze({
  armour_dodge: "trigger_unit", armour_tough: "trigger_unit",
  weapon_damage_characteristic_cap: "trigger_unit", fixed_evade_characteristic: "trigger_unit",
  charge_distance_add: "trigger_unit", charge_roll_advantage: "trigger_unit",
  damage_reduce_by_nearby_models: "trigger_unit", damage_reduce_fixed: "trigger_unit",
  damage_reduce_mark_activated: "trigger_unit", evade_eligibility: "trigger_unit",
  evade_roll_modifier: "trigger_unit", post_place_heal: "trigger_unit",
  hidden_loss_might: "trigger_unit", ranged_declaration_keywords: "trigger_unit",
  remove_debuffs: "trigger_unit", reserve_entry_hits: "trigger_unit",
  charge_speed_debuff: "attacker_unit", ranged_attack_hit_debuff: "attacker_unit",
  ranged_attack_redirect: "source_unit", followup_second_charge: "source_unit",
  followup_move_towards_attacker: "source_unit", resource_cost_discount: "payment_reference",
  overwatch_ranged_attack: "source_unit",
  refresh_after_friendly_supply_loss: "source_unit",
  infestation_transfer: "source_unit",
  before_casualty_detonation: "source_unit",
  after_ranged_armour_debuff: "trigger_unit",
  selected_unit_burrow_toggle:'selected_unit', action_end_infestation_debuff:'selected_unit',
});
function reactionRecipient(state, window, route, instance) {
  const role = REACTION_RECIPIENT_ROLES[route.effectKind];
  if (!role) fail("REACTION_RECIPIENT_ROLE_UNCLASSIFIED", route.effectKind);
  const recipient = role === "source_unit" ? instance.sourcePiece
    : role === "attacker_unit" ? attackerFor(window, state) : targetFor(window, state);
  return { role, recipient };
}
function suppressionSubjects(state, window, route, source) {
  if (!source) return [];
  const targets = (window.context.declaredTargetUnitIds || []).map(id => piece(state, id))
    .filter(target => activePiece(target) && target.sideKey === source.sideKey);
  const { projected } = projectOfficialRangedTerrainForLosV1(state);
  return targets.filter(target => liveModels(source).some(model => evaluateOfficialWithinWhollyWithinV1({
    state, dataBundle: state.officialModelBaseGeometryDataBundle,
    source: { kind: 'model', unitId: source.id, modelId: model.id }, targetUnitId: target.id,
    rangeMilliInches: route.rangeInches * 1000,
  }).unitWithin) && (source.id === target.id || liveModels(source).some(model =>
    liveModels(target).some(targetModel => evaluateOfficialElevatedLineOfSightV1({ state: projected,
      attacker: source, attackerModelId: model.id, target, targetModelId: targetModel.id,
      dataBundle: state.officialTerrainLosDataBundle,
    }).visible)))).map(target => target.id).sort();
}
function routeEligible(state, window, route, instance) {
  if (instance.sourcePiece && !allowsOfficialSpawnRoundSpecialAbilityV1(state, instance.sourcePiece, route.abilityName)) return false;
  if (route.triggerKind !== window.triggerKind
    || (route.phase !== "any" && route.phase !== window.phase)
    || instance.sideKey !== window.prioritySideKeys[window.priorityIndex]
    || reactionUseBlocked(state, window, route, instance)) return false;
  if (window.context.enemyReactionAllowed === false
    && instance.sideKey !== window.activeSideKey) return false;
  const target = targetFor(window, state);
  const attacker = attackerFor(window, state);
  const source = instance.sourcePiece;
  if(route.addedCardStatusOwner)return resolveOfficialAddedCardReactionTargetsV1(state,window,route,instance.sideKey).length>0;
  const { role: virusRecipientRole, recipient: virusRecipient } = reactionRecipient(state, window, route, instance);
  if (!allowsOfficialInfestationReactionV1(state, { sideKey: instance.sideKey, sourcePieceId: source?.id,
    recipientPieceId: virusRecipientRole === 'payment_reference' ? null : virusRecipient?.id, abilityName: route.abilityName })) return false;
  if(route.effectKind==='before_casualty_detonation'){
    if(window.context.beforeCasualtyReservations
      ?!window.context.beforeCasualtyReservations.some(row=>row.targetPieceId===source?.id&&row.modelIds.length)
      :source?.id!==target?.id)return false;
    inspectOfficialDetonationFactsV1(state,source,route,window.context);return true;
  }
  if (route.effectKind === 'infestation_transfer') {
    return resolveOfficialInfestationTransferTargetsV1(state, window.context, source).length > 0;
  }
  if (route.effectKind === 'refresh_after_friendly_supply_loss') {
    return Boolean(source && window.context.eligibleSources?.some(row => row.sourcePieceId === source.id)
      && Number(source.structureRules?.specialAbilitiesDisabledThroughRound ?? -1) < Number(state.round)
      && khalaRefreshChoices(state, instance.sideKey).length);
  }
  if (route.requiresSharedFriendlyDarkSwarmToken
    && !projectOfficialDarkSwarmReactionFactsV1(state, source, target).length) return false;
  if (route.triggerKind === 'before_armour_roll'
    && (!activePiece(target) || target.isStructure === true)) return false;
  if (route.requiresNonemptyEvadePool && (!activePiece(target) || !Number.isSafeInteger(window.context.evadeDiceCount)
    || window.context.evadeDiceCount <= 0)) return false;
  if (hasOfficialStructureTargetingPolicyV13(state)) {
    const { role, recipient } = reactionRecipient(state, window, route, instance);
    if (role !== "payment_reference" && !(route.explicitStructureSource && recipient?.id === source?.id)
      && !allowsOfficialAbilityUnitRecipientV13(state, recipient)) return false;
  }
  if (route.requiresRangedTargetSnapshot) {
    const designation = window.context.rangedTargetDesignation;
    if (!designation || designation.schema !== 'starcraft_tmg_official_lunge_ranged_target_designation_v1'
      || designation.designationHash !== hashStarcraftTmgContract(without(designation, ['designationHash']))
      || designation.round !== window.round || designation.phase !== window.phase
      || designation.routeHash !== route.routeHash || designation.attackerPieceId !== attacker?.id
      || designation.targetPieceId !== target?.id || target?.sideKey !== source?.sideKey
      || !Array.isArray(designation.sourceUnitIds) || !designation.sourceUnitIds.includes(source?.id)) return false;
    return activePiece(source) && activePiece(attacker)
      && !deriveOfficialEngagementGraphV2(state).engagedUnitIds.includes(source.id);
  }
  if(route.effectKind==='after_ranged_armour_debuff'){
    const proof=window.context.corrodeRangedAttack;
    return Boolean(proof&&proof.proofHash===hashStarcraftTmgContract(without(proof,['proofHash']))
      &&proof.round===Number(state.round)&&proof.phase===state.phase&&proof.sourceFeatureHash===route.sourceFeatureHash
      &&activePiece(source)&&activePiece(target)&&source.id===window.context.actorPieceId
      &&source.id===proof.attackerPieceId&&source.sideKey!==target.sideKey&&target.id===proof.targetPieceId
      &&state.rangedActionHistory?.some(h=>h.pieceId===source.id&&h.targetId===target.id&&h.resolutionHash===proof.attackResolutionHash));
  }
  if (window.context.rangedHitDebuffOwnerV1 === true && route.effectKind === 'ranged_declaration_keywords') return false;
  if (route.persistentRangedHitDebuff) {
    return Boolean(window.context.rangedHitDebuffOwnerV1 === true && activePiece(source) && activePiece(attacker) && attacker.sideKey !== source.sideKey
      && reactionModelsWithin(state, source, attacker, route.rangeInches).length);
  }
  if (route.requiredTargetTag && (!target || !tags(target).has(route.requiredTargetTag))) {
    return false;
  }
  if (route.requiredTargetTags && (!activePiece(target) || target.isStructure === true
    || route.requiredTargetTags.some(tag => !tags(target).has(tag)))) return false;
  if (target && target.sideKey !== instance.sideKey
    && !["charge_speed_debuff", "ranged_attack_hit_debuff", "reserve_entry_hits", "overwatch_ranged_attack"]
      .includes(route.effectKind)) return false;
  if (route.effectKind === 'overwatch_ranged_attack') {
    return Boolean(source && target && target.sideKey !== source.sideKey
      && target.id === window.context.endedUnitId
      && (window.context.eligibleOverwatchSourceIds || []).includes(source.id)
      && (!window.context.overwatchWeaponProfilesBySource
        || window.context.overwatchWeaponProfilesBySource[source.id]?.definitionId === route.definitionId
          && window.context.overwatchWeaponProfilesBySource[source.id]?.profileKey === route.recordKey + '::assault::' + route.weaponName));
  }
  if (route.requiresAnotherFriendlyTarget && (!source || !target
    || source.id === target.id || source.sideKey !== target.sideKey)) return false;
  if (route.sourceMustEqualTarget && source?.id !== target?.id) return false;
  if (route.requiresSiegeMode && !(source?.statuses || []).some(entry => normalized(
    typeof entry === 'string' ? entry : entry?.statusName || entry?.name) === 'siege_mode')) return false;
  if (route.requiresStationary && !(source?.statuses || []).some(entry => normalized(
    typeof entry === 'string' ? entry : entry?.statusName || entry?.name) === 'stationary')) return false;
  if (route.weaponName && window.context.weaponProfileKey !== route.recordKey + '::assault::' + route.weaponName) return false;
  if (route.requiresShielded && !(target?.statuses || []).some(entry => normalized(
    typeof entry === 'string' ? entry : entry?.statusName || entry?.name) === 'shielded')) return false;
  if (route.requiresNotActivated && target?.activatedPhases?.[window.phase] === true) {
    return false;
  }
  if (route.effectKind === 'hidden_loss_might') {
    return activePiece(target) && target.id === window.context.lostHiddenPieceId
      && typeof window.context.hiddenLossEvidenceHash === 'string';
  }
  const rangedEnemy = route.effectKind === "ranged_attack_hit_debuff"
    ? attacker : target;
  if (route.rangeAndLosSubject === 'declared_friendly_targets') {
    if (!suppressionSubjects(state, window, route, source).length) return false;
  } else if (route.rangeInches) {
    if (!source || !rangedEnemy) return false;
    const within = route.modelRangeGeometryV2 === true
      ? reactionModelsWithin(state, source, rangedEnemy, route.rangeInches).length > 0
      : unitWithin(source, rangedEnemy, route.rangeInches);
    if (!within) return false;
  }
  if (route.requiresUnengagedSource && (route.engagementGeometryVersion === 2
    ? deriveOfficialEngagementGraphV2(state).engagedUnitIds.includes(source.id) : engaged(state, source))) return false;
  if (route.effectKind === "ranged_attack_redirect") {
    return Boolean(source && target && attacker && source.id !== target.id
      && (window.context.validTargetUnitIds || []).includes(source.id));
  }
  if (route.effectKind === "followup_second_charge") {
    return source?.id === window.context.chargingPieceId
      && (window.context.alternateEnemyUnitIds || []).length > 0;
  }
  if (route.effectKind === "remove_debuffs") {
    return Boolean(target && (target.statuses || []).some((entry) => normalized(
      typeof entry === "string" ? entry : entry.statusKind || entry.statusName)
      .includes("debuff")));
  }
  if (route.effectKind === "resource_cost_discount") {
    if (route.definitionId === OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID) {
      return Boolean(target?.armySlotType === "Support" && target.sideKey === instance.sideKey
        && window.context.resourceType === "PE" && window.context.resourceCost > 0
        && window.context.ancestralWisdomCardInstanceId === instance.sourceInstanceId);
    }
    if (route.definitionId === 'card:academy/advanced-training-any@1') {
      return Boolean(target && target.armySlotType === 'Support' && target.sideKey === instance.sideKey
        && window.context.resourceType === 'CP' && window.context.resourceCost > 0
        && window.context.ancestralWisdomCardInstanceId === instance.sourceInstanceId);
    }
    return Boolean(target && tags(target).has("support")
      && window.context.resourceType === "CP"
      && Number(window.context.resourceCost || 0) > 0);
  }
  if (route.effectKind === "reserve_entry_hits") {
    return Boolean(target && target.sideKey !== instance.sideKey
      && window.context.enteredFromReserves === true
      && window.context.enteredViaOwnEntryEdge === false);
  }
  if (["charge_speed_debuff", "ranged_attack_hit_debuff"].includes(route.effectKind)) {
    return Boolean(source && attacker && attacker.sideKey !== source.sideKey
      && target?.sideKey === source.sideKey);
  }
  if (route.effectKind === "evade_eligibility") {
    if (route.rangedDeclarationOnly && window.context.attackKind === 'melee') return false;
    if (route.meleeDeclarationOnly) return window.context.attackKind === 'melee'
      && Boolean(instance.sourceCard && activePiece(attacker) && activePiece(target)
        && attacker.sideKey !== instance.sideKey && target.sideKey === instance.sideKey);
    return Boolean(source && attacker && attacker.sideKey !== source.sideKey
      && target?.sideKey === source.sideKey);
  }
  return Boolean(target || route.effectKind === "followup_second_charge");
}
function cardById(state, sideKey, id) {
  return (state.cardResources?.[sideKey] || []).find((entry) => entry.cardInstanceId === id);
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
function resourceCostContract(state, route, sideKey, sourceInstanceId,
  options = {}) {
  if (options.usePsionicLink) {
    const quote = quoteOfficialSelectedUnitPsionicLinkV1(state, { sideKey, pieceId: sourceInstanceId,
      resourceType: route.resourceType, printedResourceCost: route.resourceCost, planHash: options.planHash },
    { consume: options.consume === true });
    if (!quote) fail("ZAGARA_PSIONIC_LINK_PAYMENT_UNAVAILABLE");
    return quote;
  }
  const cost = !route.resourceType ? freezeDeep({ resourceType: null,
    printedResourceCost: 0, resourceCostReduction: 0,
    effectiveResourceCost: 0, discountSourcePieceId: null,
    trainingTruth: false })
    : state.officialMatchLifecycleFamilySourceBundle
    ? resolveOfficialMatchLifecycleAbilityResourceCostV1(
      state.officialMatchLifecycleFamilySourceBundle, state,
      { sideKey, pieceId: sourceInstanceId, resourceType: route.resourceType,
        printedResourceCost: route.resourceCost,
        planHash: options.planHash || null },
      { consume: options.consume === true })
    : freezeDeep({ resourceType: route.resourceType,
      printedResourceCost: route.resourceCost, resourceCostReduction: 0,
      effectiveResourceCost: route.resourceCost, discountSourcePieceId: null,
      trainingTruth: false });
  return quoteOfficialUnitAbilityModifiersV1(state, sourceInstanceId, route.sourceKind, cost);
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
    } catch { /* Invalid resource subsets are absent from LegalSpace. */ }
  }
  return rows.sort((left, right) => left.join("|").localeCompare(right.join("|")));
}
function currentWindow(state) {
  const window = state.pendingOfficialReactionWindow;
  if (!window) return null;
  if (!object(window) || window.schema !== OFFICIAL_REACTION_FAMILY_WINDOW_SCHEMA
    || window.windowHash !== hashStarcraftTmgContract(without(window, ["windowHash"]))) {
    fail("REACTION_WINDOW_INVALID");
  }
  return window;
}
function khalaRefreshChoices(state, sideKey) {
  return listOfficialNonUniqueExhaustedTacticalCardIdsV1(state, sideKey,
    key => state.officialCardBuildPaymentDataBundle.cardProfiles.find(row => row.recordKey === key),
    'KHALA_REFRESH_CARD_BINDING_INVALID');
}

function domainFor(state, window, route, instance, paymentCardInstanceIds,
  resourceCost, consumeChoice = null) {
  const recipient = hasOfficialStructureTargetingPolicyV13(state)
    ? reactionRecipient(state, window, route, instance) : null;
  const followupTargets = route.effectKind === "followup_second_charge"
    ? [...window.context.alternateEnemyUnitIds].sort() : [];
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_REACTION_FAMILY_PARAMETER_KIND,
    actionType: "resolve_reaction_family_ability",
    definitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: instance.sourceInstanceId,
    sourceKind: route.sourceKind,
    sideKey: instance.sideKey,
    phase: state.phase,
    abilityName: route.abilityName,
    effectKind: route.effectKind,
    windowHash: window.windowHash,
    parameterSchema: { type: "object",
      required: ["paymentCardInstanceIds", ...(followupTargets.length > 0
        ? ["followupTargetUnitId"] : [])],
      paymentCardInstanceIds: { const: clone(paymentCardInstanceIds) },
      followupTargetUnitId: followupTargets.length > 0
        ? { enum: followupTargets } : null,
      ...(consumeChoice ? { sacrificePieceId: { const: consumeChoice.sacrificePieceId },
        sacrificeModelId: { enum: consumeChoice.sacrificeModelIds } } : {}) },
    constraints: { triggerKind: window.triggerKind,
      activationId: window.activationId,
      activePlayerResolvesFirst: window.timing !== "outside_activation",
      oneReactionPerPlayerPerActivation: window.timing !== "outside_activation",
      sameNamedReactionPerSourceUnitPerRound: true,
      ...(recipient ? { effectRecipientRole: recipient.role,
        effectRecipientPieceId: recipient.recipient?.id || null } : {}),
      ...(hasOfficialFaqReactionPolicyV13(state) ? {
        timing: window.timing,
        oneOutsideReactionPerPlayerPerPhase: true,
        firstPlayerMarkerHolderResolvesFirst: window.timing === "outside_activation",
        namedAbilityRoundLimitExempt: /\bREPEATABLE\b/iu.test(route.sourceText),
        sameNamedReactionPerSourceUnitPerRound: !/\bREPEATABLE\b/iu.test(route.sourceText),
      } : {}),
      sourceRouteHash: route.routeHash,
      ...(route.effectKind==='before_casualty_detonation'?{detonation:inspectOfficialDetonationFactsV1(state,instance.sourcePiece,route,window.context)}:{}),
      resourceCostsByChoice: { default: clone(resourceCost) } },
    executorId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    confirmationClass: "rules_owned_reaction_choice",
    rulesTruth: "official_current_product_reaction_parameter_domain",
    trainingTruth: false,
  };
  if (route.nativeChargeDie) {
    body.constraints.originalChargeRoll = window.context.chargeRoll;
    body.constraints.originalMaximumDistanceMilliInches = window.context.maxDistanceMilliInches;
    body.constraints.additionalDice = route.additionalDice;
    body.constraints.keepHighest = route.keepHighest;
  }
  if (route.effectKind === 'refresh_after_friendly_supply_loss') {
    body.parameterSchema.required.push('cardInstanceId');
    body.parameterSchema.cardInstanceId = { enum: khalaRefreshChoices(state, instance.sideKey) };
    body.constraints.friendlySupplyLosses = clone(window.context.eligibleSources.find(row =>
      row.sourcePieceId === instance.sourceInstanceId).losses);
  }
  if (route.effectKind === 'infestation_transfer') {
    body.parameterSchema.required.push('targetUnitId');
    body.parameterSchema.targetUnitId = { enum: resolveOfficialInfestationTransferTargetsV1(state, window.context, instance.sourcePiece) };
    body.constraints.fallenUnitId = window.context.infestationWitness.fallenPiece.id;
    body.constraints.triggerWitnessHash = window.context.infestationWitness.witnessHash;
  }
  if(route.addedCardStatusOwner){
    body.parameterSchema.required.push('targetUnitId');
    body.parameterSchema.targetUnitId={enum:resolveOfficialAddedCardReactionTargetsV1(state,window,route,instance.sideKey)};
    body.constraints.triggerWitnessHash=window.context.addedCardTrigger.witnessHash;
    body.constraints.effectRecipientRole='selected_unit';
    delete body.constraints.effectRecipientPieceId;
  }
  if (consumeChoice) body.parameterSchema.required.push('sacrificePieceId', 'sacrificeModelId');
  return seal(body, "domainId");
}
function passDomain(state, window) {
  return seal({ schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0", parameterKind: OFFICIAL_REACTION_FAMILY_PARAMETER_KIND,
    actionType: "pass_reaction_family_window", sideKey: window.prioritySideKeys[
      window.priorityIndex], phase: state.phase, windowHash: window.windowHash,
    parameterSchema: { type: "object", required: [] },
    constraints: { triggerKind: window.triggerKind,
      activationId: window.activationId, voluntaryPass: true },
    executorId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    confirmationClass: "rules_owned_reaction_pass",
    rulesTruth: "official_current_product_reaction_pass_domain",
    trainingTruth: false }, "domainId");
}
function enumerate(bundle, state, options = {}) {
  const window = currentWindow(state);
  const parameterDomains = [];
  if (!window) return freezeDeep({
    schemaVersion: "starcraft_tmg_official_reaction_legal_space_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: [], window: null,
    currentProductReactionDenominatorComplete: bundle.compilerDenominatorComplete,
    searchAndStrategyExcludedFromAuthority: true, trainingTruth: false });
  const sideKey = String(options.sideKey || window.prioritySideKeys[window.priorityIndex]);
  if (!SIDE_KEYS.has(sideKey)) fail("REACTION_FAMILY_SIDE_INVALID", sideKey);
  if (sideKey === window.prioritySideKeys[window.priorityIndex]) {
    parameterDomains.push(passDomain(state, window));
    for (const route of bundle.routes) {
      for (const instance of routeInstances(state, route)) {
        if (!routeEligible(state, window, route, instance)) continue;
        const resourceCost = resourceCostContract(state, route,
          instance.sideKey, instance.sourceInstanceId);
        for (const payment of paymentSelections(state, { ...route, resourceType: resourceCost.resourceType }, instance.sideKey,
          resourceCost.effectiveResourceCost)) {
          parameterDomains.push(domainFor(
            state, window, route, instance, payment, resourceCost));
        }
        if (resourceCost.effectiveResourceCost === route.resourceCost) {
          const reduced = quoteOfficialSelectedUnitPsionicLinkV1(state, { sideKey: instance.sideKey,
            pieceId: instance.sourceInstanceId, resourceType: route.resourceType, printedResourceCost: route.resourceCost });
          if (reduced) {
            for (const payment of paymentSelections(state, route, instance.sideKey, reduced.effectiveResourceCost)) {
              parameterDomains.push(domainFor(state, window, route, instance, payment, reduced));
            }
          }
          for (const choice of enumerateOfficialConsumePaymentChoicesV1(state, route,
            instance.sourceInstanceId, resourceCost.effectiveResourceCost)) {
            parameterDomains.push(domainFor(state, window, route, instance,
              choice.paymentCardInstanceIds, resourceCost, choice));
          }
        }
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_reaction_legal_space_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    candidates: [], parameterDomains: parameterDomains.sort((left, right) => (
      left.domainId.localeCompare(right.domainId))),
    window: clone(window),
    prioritySideKey: window.prioritySideKeys[window.priorityIndex],
    currentProductReactionDenominatorComplete: bundle.compilerDenominatorComplete,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}
function instantiate(bundle, state, domain, parameters = {}) {
  const current = enumerate(bundle, state, { sideKey: domain?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("REACTION_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters)) fail("REACTION_ACTION_INPUT_INVALID");
  const pass = domain.actionType === "pass_reaction_family_window";
  const route = pass ? null : bundle.routes.find((entry) => (
    entry.definitionId === domain.definitionId));
  const paymentCardInstanceIds = pass ? []
    : [...new Set((parameters.paymentCardInstanceIds || []).map(String))].sort();
  if (!pass && !isDeepStrictEqual(paymentCardInstanceIds,
    domain.parameterSchema.paymentCardInstanceIds.const)) {
    fail("REACTION_PAYMENT_SELECTION_INVALID");
  }
  const followupTargetUnitId = pass ? null
    : parameters.followupTargetUnitId === undefined ? null
      : String(parameters.followupTargetUnitId);
  if (!pass && domain.parameterSchema.followupTargetUnitId
    && !domain.parameterSchema.followupTargetUnitId.enum.includes(followupTargetUnitId)) {
    fail("REACTION_FOLLOWUP_TARGET_INVALID", followupTargetUnitId);
  }
  const canonicalParameters = pass ? {} : { paymentCardInstanceIds,
    ...(followupTargetUnitId ? { followupTargetUnitId } : {}) };
  if (!pass && (route.effectKind === 'infestation_transfer'||route.addedCardStatusOwner)) {
    if (!domain.parameterSchema.targetUnitId.enum.includes(parameters.targetUnitId)
      || Object.keys(parameters).some(key => !domain.parameterSchema.required.includes(key))) fail('INFESTATION_TRANSFER_TARGET_INVALID');
    canonicalParameters.targetUnitId = parameters.targetUnitId;
  }
  if (!pass && route.effectKind === 'refresh_after_friendly_supply_loss') {
    if (Object.keys(parameters).some(key => !domain.parameterSchema.required.includes(key))
      || !domain.parameterSchema.cardInstanceId.enum.includes(parameters.cardInstanceId)) {
      fail('KHALA_REFRESH_CARD_SELECTION_INVALID');
    }
    canonicalParameters.cardInstanceId = parameters.cardInstanceId;
  }
  const consume = !pass && domain.parameterSchema.sacrificePieceId;
  if (consume) {
    if (parameters.sacrificePieceId !== consume.const
      || !domain.parameterSchema.sacrificeModelId.enum.includes(parameters.sacrificeModelId)
      || Object.keys(parameters).some(key => !domain.parameterSchema.required.includes(key))) {
      fail('REACTION_CONSUME_SELECTION_INVALID');
    }
    canonicalParameters.sacrificePieceId = parameters.sacrificePieceId;
    canonicalParameters.sacrificeModelId = parameters.sacrificeModelId;
  } else if (parameters.sacrificePieceId !== undefined || parameters.sacrificeModelId !== undefined) {
    fail('REACTION_CONSUME_DOMAIN_REQUIRED');
  }
  const plan = seal({ schema: "starcraft_tmg_official_reaction_family_plan_v1",
    semanticVersion: "1.0.0", domainId: domain.domainId,
    windowHash: domain.windowHash, sideKey: domain.sideKey,
    actionType: domain.actionType,
    definitionId: route?.definitionId || null,
    sourceFeatureHash: route?.sourceFeatureHash || null,
    sourceInstanceId: domain.sourceInstanceId || null,
    abilityName: route?.abilityName || null,
    effectKind: route?.effectKind || "pass",
    canonicalParameters,
    ...(!pass && domain.constraints.resourceCostsByChoice.default.psionicLinkDefinitionId
      ? { usePsionicLink: true } : {}),
    ...(consume ? { consumePaymentPlan: prepareOfficialConsumePaymentV1(state, route,
      domain.sourceInstanceId, canonicalParameters) } : {}),
    sourceRouteHash: route?.routeHash || null,
    rulesTruth: "official_current_product_reaction_plan",
    trainingTruth: false }, "planHash");
  const action = freezeDeep({ actionType: domain.actionType,
    sideKey: domain.sideKey, phase: state.phase,
    definitionId: route?.definitionId || null,
    abilityName: route?.abilityName || null,
    reactionPlan: plan,
    ...(route?.nativeChargeDie ? { chance: { kind: 'fixed_roll_sequence', faces: 6, count: 1,
      layout: { charge: 1 }, revealOrder: ['charge'] } } : {}),
    executorId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    executorVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_current_product_reaction_instantiation",
    trainingTruth: false });
}
function preview(bundle, state, request = {}) {
  const instantiated = instantiate(bundle, state, request.domain,
    request.parameters || {});
  return seal({ schema: "starcraft_tmg_official_reaction_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    triggerContext: clone(currentWindow(state).context),
    confirmationClass: request.domain.confirmationClass,
    mutationApplied: false, rulesAuthority: true,
    rulesTruth: "official_current_product_reaction_preview",
    trainingTruth: false }, "previewHash");
}
function pay(state, route, action, events) {
  if (action.reactionPlan.consumePaymentPlan) return applyOfficialConsumePaymentV1(state, route, action, events);
  const ids = action.reactionPlan.canonicalParameters.paymentCardInstanceIds || [];
  const planHash = action.reactionPlan.planHash;
  const cost = resourceCostContract(state, route, action.sideKey,
    action.reactionPlan.sourceInstanceId, { planHash, consume: true, usePsionicLink: action.reactionPlan.usePsionicLink });
  if (route.resourceType) {
    const cards = ids.map((id) => cardById(state, action.sideKey, id));
    if (cards.some((entry) => !entry)) fail("REACTION_PAYMENT_CARD_UNKNOWN");
    const payment = resolveOfficialAbilityResourcePaymentV1({
      cardDataBundle: state.officialCardBuildPaymentDataBundle,
      resourceType: cost.resourceType, resourceCost: cost.effectiveResourceCost,
      selectedCardInstanceSetComplete: true,
      selectedCardInstances: cards.map((card) => paymentRef(state, card)),
    });
    for (const id of payment.selectedCardsExhaustOnCommit) {
      cardById(state, action.sideKey, id).readiness = "exhausted";
    }
    events.push({ type: "reaction_resource_paid", resourceType: cost.resourceType,
      resourceCost: cost.effectiveResourceCost,
      printedResourceCost: route.resourceCost,
      resourceCostReduction: cost.resourceCostReduction,
      discountSourcePieceId: cost.discountSourcePieceId,
      paymentResultHash: payment.resultHash,
      exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit,
      trainingTruth: false });
  } else if (route.sourceKind === "card_feature"
    && route.exhaustSourceCard !== false) {
    const card = cardById(state, action.sideKey, action.reactionPlan.sourceInstanceId);
    if (!card || card.readiness !== "ready") fail("REACTION_SOURCE_CARD_NOT_READY");
    card.readiness = "exhausted";
    events.push({ type: "reaction_source_card_exhausted",
      cardInstanceId: card.cardInstanceId, trainingTruth: false });
  }
  consumeOfficialUnitAbilityModifiersV1(state, cost, { definitionId: route.definitionId, planHash }, events);
}
function isDebuff(entry) {
  const value = normalized(typeof entry === "string" ? entry
    : `${entry.statusKind || ""} ${entry.statusName || entry.name || ""}`);
  return value.includes("debuff");
}
function healPiece(target, value) {
  const before = Number(target.damageMarker || 0);
  const after = Math.max(0, before - Number(value));
  const healed = before - after;
  target.damageMarker = after;
  const first = liveModels(target)[0];
  if (first) {
    first.damage = after;
    if (Number.isFinite(Number(first.remainingWounds))) {
      first.remainingWounds = Number(first.remainingWounds) + healed;
    }
  }
  return healed;
}
export function eligibleOfficialStandRecipientV1(state, route, source, target) {
  return route?.definitionId === ARTANIS_STAND_DEFINITION_ID && activePiece(source) && activePiece(target)
    && source.sideKey === target.sideKey && source.id !== target.id
    && reactionModelsWithin(state, source, target, route.rangeInches).length > 0;
}

function reactionModelsWithin(state, source, target, rangeInches) {
  return liveModels(source).filter(model => evaluateOfficialWithinWhollyWithinV1({
    state, dataBundle: state.officialModelBaseGeometryDataBundle,
    source: { kind: 'model', unitId: source.id, modelId: model.id }, targetUnitId: target.id,
    rangeMilliInches: rangeInches * 1000,
  }).unitWithin);
}

// Use the declared target's pre-casualty bases. For a template the designated
// target is independent of which batch the attacker resolves first.
export function projectOfficialLungeRangedTargetDesignationV1(state, action) {
  const route = state.officialReactionFamilySourceBundle?.routes?.find(row =>
    row.definitionId === OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID && row.requiresRangedTargetSnapshot);
  if (!route || state.phase !== route.phase) return null;
  const template = action.actionType === 'blast_template_attack';
  if (!template && action.actionType !== 'ranged_attack') return null;
  const targetId = template ? action.canonicalParameters?.primaryTargetUnitId : action.targetId;
  const attackBinding = template ? { templateDeclarationHash: action.templateDeclarationHash }
    : { attackPlanHash: action.rangedPlan?.attackPlanHash };
  if (!Object.values(attackBinding).every(value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value))) return null;
  const attacker = piece(state, action.pieceId);
  const target = piece(state, targetId);
  if (!activePiece(attacker) || !activePiece(target) || attacker.sideKey !== action.sideKey
    || target.sideKey === attacker.sideKey) return null;
  const sourceUnitIds = state.pieces.filter(source => source.id !== target.id
    && source.sideKey === target.sideKey && source.officialUnitRecordKey === route.recordKey
    && activePiece(source) && reactionModelsWithin(state, source, target, route.rangeInches).length)
    .map(source => source.id).sort();
  if (!sourceUnitIds.length) return null;
  return seal({ schema: 'starcraft_tmg_official_lunge_ranged_target_designation_v1',
    round: Number(state.round), phase: state.phase, routeHash: route.routeHash,
    ...attackBinding, attackerPieceId: attacker.id,
    targetPieceId: target.id, sourceUnitIds, trainingTruth: false }, 'designationHash');
}

// Accept the complete outcomes of the two native ranged producers. In particular,
// a template batch also emits ranged_attack, but only template completion carries
// the original target's designation and the matching primary resolution hashes.
export function projectOfficialRangedLungeTriggerV1(previous, transition, {
  scanNewLogEntries = false, includeOverwatch = false,
} = {}) {
  const state = transition.state;
  const route = state.officialReactionFamilySourceBundle?.routes.find(row =>
    row.definitionId === OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID && row.requiresRangedTargetSnapshot);
  if (!route || state.phase !== route.phase || previous.phase !== state.phase
    || Number(previous.round) !== Number(state.round)) return null;

  const previousLength = previous.log?.length || 0;
  if ((state.log?.length || 0) <= previousLength) return null;
  const logEntries = state.log.slice(scanNewLogEntries ? previousLength : -1);
  const event = transition.events.find(row => row.rangedTargetDesignation
    && ['ranged_attack', 'ranged_weapon_completed'].includes(row.type));
  if (!event || !logEntries.some(entry => entry.events.some(row => isDeepStrictEqual(event, row)))) return null;

  const designation = event.rangedTargetDesignation;
  const numeric = event.type === 'ranged_attack';
  const attackResolutionHash = numeric ? event.attackResolutionHash : event.primaryAttackResolutionHash;
  const casualtyResolutionHash = numeric ? event.casualtyResolutionHash : event.primaryCasualtyResolutionHash;
  if (designation.routeHash !== route.routeHash || designation.round !== Number(state.round)
    || designation.phase !== state.phase || designation.attackerPieceId !== event.pieceId
    || numeric && (designation.attackPlanHash !== event.attackPlanHash || designation.targetPieceId !== event.targetId)
    || ![numeric ? event.attackPlanHash : designation.templateDeclarationHash, attackResolutionHash,
      casualtyResolutionHash].every(value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value))) return null;

  const attacker = piece(state, event.pieceId);
  if (!activePiece(attacker)) return null;
  const overwatch = includeOverwatch ? readOfficialOverwatchAttackGrantV1(previous) : null;
  if (overwatch && (!numeric || event.pieceId !== overwatch.sourcePieceId || event.sideKey !== overwatch.sideKey
    || event.targetId !== overwatch.targetPieceId || event.stages?.declaration?.profileKey !== overwatch.profileKey)) return null;
  const overwatchOrigin = overwatch ? { overwatchTriggerHash: overwatch.triggerHash, overwatchGrantHash: overwatch.parentHash } : {};
  const sourceActionHash = hashStarcraftTmgContract({ designationHash: designation.designationHash,
    attackResolutionHash, casualtyResolutionHash, ...overwatchOrigin });
  return { triggerKind: route.triggerKind, activeSideKey: attacker.sideKey, phase: state.phase,
    activationId: overwatch ? null : resolveOfficialArmourRollActivationIdV1(previous, attacker.id), sourceActionHash,
    context: { actorPieceId: attacker.id, targetPieceId: designation.targetPieceId,
      rangedTargetDesignation: designation, attackResolutionHash, casualtyResolutionHash, ...overwatchOrigin } };
}

export function openOfficialRangedLungeTriggerV1(state, input) {
  if (!input || state.pendingOfficialReactionWindow) return null;
  const bundle = state.officialReactionFamilySourceBundle;
  const route = bundle?.routes.find(row => row.definitionId === OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID
    && row.routeHash === input.context.rangedTargetDesignation.routeHash);
  const attacker = piece(state, input.context.actorPieceId);
  if (!route || input.phase !== state.phase || input.context.rangedTargetDesignation.round !== Number(state.round)
    || !activePiece(attacker) || attacker.sideKey !== input.activeSideKey) return null;
  const { activeLegal, defenderLegal } = createOfficialReactionWindowOpportunityBatchV1({ state, bundle }).projectWindow(input);
  // Outside activation the first-player marker can give the defending side first priority.
  const options = input.activationId === null ? [activeLegal, defenderLegal] : [defenderLegal];
  if (!options.some(menu => menu.parameterDomains.some(domain => domain.definitionId === route.definitionId))) return null;
  const opened = openOfficialReactionFamilyWindowV1(bundle, state, input);
  return { ...opened, resumeSideKey: state.activeSideKey };
}

export function openOfficialRangedLungeWindowV1(previous, transition) {
  if (transition.state.pendingOfficialReactionWindow) return null;
  return openOfficialRangedLungeTriggerV1(transition.state, projectOfficialRangedLungeTriggerV1(previous, transition));
}

function reactionEffect(route, state, window, action) {
  const target = targetFor(window, state);
  const source = piece(state, action.reactionPlan.sourceInstanceId);
  const attacker = attackerFor(window, state);
  const effect = { schema: "starcraft_tmg_official_reaction_effect_v1",
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    sourceInstanceId: action.reactionPlan.sourceInstanceId,
    sideKey: action.sideKey, abilityName: route.abilityName,
    effectKind: route.effectKind, triggerKind: route.triggerKind,
    targetPieceId: target?.id || null, sourcePieceId: source?.id || null,
    attackerPieceId: attacker?.id || null,
    effectDuration: route.effectDuration,
    trainingTruth: false };
  if (route.effectKind === "armour_tough") {
    effect.tough = route.tough;
    if (route.dodge !== undefined) effect.dodge = route.dodge;
  }
  else if (route.effectKind === "armour_dodge") effect.dodge = route.dodge;
  else if (route.effectKind === "weapon_damage_characteristic_cap") effect.maximumWeaponDamage = route.maximumWeaponDamage;
  else if (route.effectKind === 'fixed_evade_characteristic') {
    effect.evadeThreshold = route.evadeThreshold; effect.evadeUnmodifiable = route.evadeUnmodifiable;
  }
  else if (route.effectKind === 'ranged_declaration_keywords') {
    effect.weaponProfileKey = window.context.weaponProfileKey;
    Object.assign(effect, { pinpoint: route.pinpoint === true, lockedIn: route.lockedIn || 0,
      indirectFire: route.indirectFire === true, longRangeInches: route.longRangeInches || 0 });
    if (route.weaponDamage !== undefined) effect.weaponDamage = route.weaponDamage;
    if (route.concentratedFire !== undefined) effect.concentratedFire = route.concentratedFire;
  }
  else if (route.effectKind === "ranged_attack_redirect") {
    effect.redirectTargetPieceId = source.id;
    effect.redirectedTargetEvadeEligible = true;
  } else if (route.effectKind === "followup_second_charge") {
    effect.followup = { actionType: "charge",
      actorPieceId: source.id,
      targetPieceId: action.reactionPlan.canonicalParameters.followupTargetUnitId,
      ignoresEngagedChargeRestriction: true,
      devastatingChargeSecondTriggerAllowed: false };
  } else if (route.effectKind === "remove_debuffs") {
    const removed = (target.statuses || []).filter(isDebuff);
    target.statuses = (target.statuses || []).filter((entry) => !isDebuff(entry));
    if (route.cleanseLinkedEffects) {
      const hashes = new Set(removed.map(entry => entry?.statusEffectHash).filter(Boolean));
      state.board.effectMarkers = (state.board.effectMarkers || [])
        .filter(entry => !hashes.has(entry.statusEffectHash));
      if (target.officialAbilityEffects) {
        target.officialAbilityEffects = target.officialAbilityEffects
          .filter(entry => !hashes.has(entry.linkedStatusEffectHash));
      }
    }
    effect.removedStatusCount = removed.length;
    effect.removedStatusHashes = removed.map((entry) => hashStarcraftTmgContract(entry));
  } else if (route.effectKind === "post_place_heal") {
    effect.healRequested = route.heal;
    effect.healApplied = healPiece(target, route.heal);
  } else if (route.effectKind === 'hidden_loss_might') {
    Object.assign(effect, applyOfficialHiddenLossCharacteristicEffectsV1(state, route, target,
      action.reactionPlan.sourceInstanceId), { speedModifier: route.speedModifier, criticalHit: route.criticalHit });
  } else if (route.effectKind === "damage_reduce_by_nearby_models") {
    const explicit = route.modelRangeGeometryV2 === true;
    const count = explicit ? reactionModelsWithin(state, source, target, route.rangeInches).length
      : liveModels(source).filter(model => liveModels(target)
        .some(targetModel => modelGap(model, targetModel) <= route.rangeInches + 0.001)).length;
    const bonus = explicit && state.officialRangedFamilySourceBundle
      ? projectOfficialRangedFamilyModifiersV1(state.officialRangedFamilySourceBundle, state,
        { pieceId: source.id, context: { abilityName: 'Life Support' } }).medpackAdditionalModelsWithinRange
      : 0;
    effect.damageReduction = (count + bonus) * route.reductionPerInRangeModel;
    effect.minimumDamage = route.minimumDamage;
  } else if (route.effectKind === "damage_reduce_fixed") {
    effect.damageReduction = route.damageReduction;
    effect.minimumDamage = route.minimumDamage;
  } else if (route.effectKind === "damage_reduce_mark_activated") {
    effect.damageReduction = route.damageReduction;
    effect.minimumDamage = route.minimumDamage;
    target.activatedPhases = { movement: false, assault: false, combat: false,
      ...(target.activatedPhases || {}), [window.phase]: true };
    effect.targetMarkedActivated = true;
  } else if (route.effectKind === "resource_cost_discount") {
    effect.resourceType = route.discountedResourceType;
    effect.resourceCostReduction = route.resourceCostReduction;
    effect.minimumResourceCost = route.minimumResourceCost;
  } else if (route.effectKind === "reserve_entry_hits") {
    effect.automaticHits = route.automaticHits;
    effect.damagePerHit = route.damagePerHit;
  } else if (route.effectKind === 'before_casualty_detonation') {
    const facts=inspectOfficialDetonationFactsV1(state,source,route,window.context);
    if(window.context.beforeCasualtyReservations)effect.targetPieceId=source.id;
    Object.assign(effect,{automaticHits:facts.hits,damagePerHit:facts.damagePerHit,detonationFacts:facts});
  } else if(route.effectKind==='after_ranged_armour_debuff'){
    Object.assign(effect,{armourPenalty:route.armourPenalty,corrodeArmourDebuff:applyOfficialCorrodeArmourDebuffV1(state,route,source,target,
      action.reactionPlan.planHash||hashStarcraftTmgContract(action))});
  } else if (route.effectKind === "evade_roll_modifier") {
    effect.evadeModifier = route.evadeModifier;
  } else if (route.effectKind === "followup_move_towards_attacker") {
    effect.followup = { actionType: "move", actorPieceId: source.id,
      targetPieceId: attacker.id,
      destinationConstraint: route.destinationConstraint,
      movementDistanceSource: route.movementDistanceSource };
  } else if (route.effectKind === "charge_roll_advantage") {
    effect.additionalDice = route.additionalDice;
    effect.keepHighest = route.keepHighest;
  } else if (route.effectKind === "charge_distance_add") {
    effect.chargeDistanceModifier = route.chargeDistanceModifier;
  } else if (route.effectKind === "charge_speed_debuff") {
    effect.speedModifier = route.speedModifier;
    if (route.rangeAndLosSubject === 'declared_friendly_targets') {
      effect.eligibleChargedFriendlyUnitIds = suppressionSubjects(state, window, route, source);
    }
  } else if (route.effectKind === "ranged_attack_hit_debuff") {
    effect.hitModifier = route.hitModifier;
  } else if (route.effectKind === "evade_eligibility") {
    effect.evadeEligible = true;
    if (route.requiresSharedFriendlyDarkSwarmToken) {
      const facts = projectOfficialDarkSwarmReactionFactsV1(state, source, target)[0];
      if (!facts) fail('DARK_SWARM_REACTION_FACTS_REQUIRED');
      effect.darkSwarmFacts = facts;
      effect.evadeModifier = facts.evadeModifier;
    }
  } else if (route.effectKind === 'refresh_after_friendly_supply_loss') {
    effect.refreshedCardInstanceId = action.reactionPlan.canonicalParameters.cardInstanceId;
  } else if (route.effectKind === 'overwatch_ranged_attack') {
    effect.weaponProfileKey = route.recordKey + '::assault::' + route.weaponName;
  } else if (route.effectKind === 'infestation_transfer') {
    const status = applyOfficialInfestationTransferStatusV1(state, route, source,
      action.reactionPlan.canonicalParameters.targetUnitId, window.context);
    effect.targetPieceId = status.targetPieceId;
    effect.statusEffectHash = status.statusEffectHash;
    effect.fallenUnitId = window.context.infestationWitness.fallenPiece.id;
    effect.triggerWitnessHash = window.context.infestationWitness.witnessHash;
  } else if(route.addedCardStatusOwner){
    const selected=piece(state,action.reactionPlan.canonicalParameters.targetUnitId),
      actor=piece(state,window.context.addedCardTrigger.pieceId);
    if(!resolveOfficialAddedCardReactionTargetsV1(state,window,route,action.sideKey).includes(selected?.id))fail('ADDED_CARD_REACTION_TARGET_INVALID');
    effect.targetPieceId=selected.id;
    effect.triggerWitnessHash=window.context.addedCardTrigger.witnessHash;
    if(route.effectKind==='selected_unit_burrow_toggle'){
      const burrowed=(selected.statuses||[]).some(s=>normalized(typeof s==='string'?s:s.statusName||s.name)==='burrowed'),events=[];
      applyOfficialBurrowStatusV1(state,route,selected,selected,burrowed?'lose':'gain',events);
      effect.burrowMode=burrowed?'lose':'gain';effect.statusEvents=events;
    }else{
      const status=applyOfficialInfestationDebuffV1(state,route,actor,selected,effect.triggerWitnessHash);
      effect.statusEffectHash=status.statusEffectHash;effect.infestedActorPieceId=actor.id;
    }
  }
  return seal(effect, "effectHash");
}
function closeOrAdvanceWindow(state, window, events) {
  const nextIndex = window.priorityIndex + 1;
  if (nextIndex < window.prioritySideKeys.length) {
    const next = seal({ ...without(window, ["windowHash"]), priorityIndex: nextIndex,
      stage: "awaiting_reaction" }, "windowHash");
    state.pendingOfficialReactionWindow = clone(next);
    events.push({ type: "reaction_priority_advanced",
      prioritySideKey: next.prioritySideKeys[next.priorityIndex],
      windowHash: next.windowHash, trainingTruth: false });
    return;
  }
  const resolution = seal({ schema: "starcraft_tmg_official_reaction_resolution_v1",
    semanticVersion: "1.0.0", triggerHash: window.triggerHash,
    sourceActionHash: window.sourceActionHash,
    resumeActionHash: window.resumeActionHash,
    activationId: window.activationId,
    triggerKind: window.triggerKind,
    round: Number(state.round), phase: state.phase,
    activeSideKey: window.activeSideKey,
    resolvedChoices: clone(window.resolvedChoices),
    effects: clone(window.effects),
    activePlayerReactionResolvedFirst: window.timing !== "outside_activation",
    oneReactionPerPlayerPerActivationEnforced: window.timing !== "outside_activation",
    ...(hasOfficialFaqReactionPolicyV13(state) ? {
      timing: window.timing,
      outsideActivationPhaseLimitEnforced: window.timing === "outside_activation",
    } : {}),
    consumedByHost: false,
    rulesTruth: "official_current_product_reaction_window_resolution",
    trainingTruth: false }, "resolutionHash");
  state.officialReactionResolutionHistory = state.officialReactionResolutionHistory || [];
  state.officialReactionResolutionHistory.push(clone(resolution));
  if (hasOfficialFaqReactionPolicyV13(state) && window.timing === "outside_activation") {
    state.activeSideKey = window.resumeActiveSideKey;
  }
  delete state.pendingOfficialReactionWindow;
  events.push({ type: "reaction_window_closed", triggerHash: window.triggerHash,
    resolutionHash: resolution.resolutionHash, effectCount: resolution.effects.length,
    resumeActionHash: resolution.resumeActionHash, trainingTruth: false });
}
function apply(bundle, stateInput, request = {}, copyOwnedPassState = null) {
  const action = request.action;
  const domainId = action?.reactionPlan?.domainId;
  const domain = enumerate(bundle, stateInput, { sideKey: action?.sideKey })
    .parameterDomains.find((entry) => entry.domainId === domainId);
  if (!domain) fail("REACTION_PARAMETER_DOMAIN_STALE");
  const expected = instantiate(bundle, stateInput, domain,
    action.reactionPlan.canonicalParameters);
  if (!isDeepStrictEqual(expected.action, action)) fail("REACTION_ACTION_STALE");
  const state = copyOwnedPassState
    && action.actionType === "pass_reaction_family_window"
    ? copyOwnedPassState(stateInput) : clone(stateInput);
  let window = currentWindow(state);
  const events = [];
  if (action.actionType === "pass_reaction_family_window") {
    window.resolvedChoices.push({ sideKey: action.sideKey, choice: "pass",
      planHash: action.reactionPlan.planHash, trainingTruth: false });
    events.push({ type: "reaction_priority_passed", sideKey: action.sideKey,
      triggerHash: window.triggerHash, trainingTruth: false });
  } else {
    const route = bundle.routes.find((entry) => entry.definitionId === action.definitionId);
    const instance = routeInstances(state, route).find((entry) => (
      entry.sourceInstanceId === action.reactionPlan.sourceInstanceId));
    if (!route || !instance || !routeEligible(state, window, route, instance)) {
      fail("REACTION_ROUTE_STALE", String(action.definitionId || ""));
    }
    const prePaymentEffect = action.reactionPlan.consumePaymentPlan ? reactionEffect(route, state, window, action) : null;
    if(prePaymentEffect&&hasOfficialConsumeBeforeCasualtyPolicyV1(state)){
      if(route.definitionId!=='unit:defiler/dark-swarm-assault-phase@1')fail('CONSUME_REACTION_OWNER_UNSUPPORTED');
      const staged=stageOfficialConsumePaymentV1({state,action,plan:action.reactionPlan.consumePaymentPlan,
        owner:{kind:'dark_swarm_reaction',prePaymentEffect,historyReservation:consumeReactionHistory(state,window,route,action,prePaymentEffect)},
        activationContext:{activeSideKey:window.activeSideKey,activationId:window.activationId}});
      return staged.consumeReceipt?resumeConsumeReaction(bundle,staged):staged;
    }
    const payment = pay(state, route, action, events);
    window = currentWindow(state);
    const effect = prePaymentEffect ? seal({ ...without(prePaymentEffect, ['effectHash']),
      consumePaymentReceiptHash: payment.paymentReceiptHash }, 'effectHash') : reactionEffect(route, state, window, action);
    if (effect.refreshedCardInstanceId) {
      const card = cardById(state, action.sideKey, effect.refreshedCardInstanceId);
      if (!card || !khalaRefreshChoices(state, action.sideKey).includes(card.cardInstanceId)) {
        fail('KHALA_REFRESH_CARD_SELECTION_INVALID');
      }
      card.readiness = 'ready';
      events.push({ type: 'friendly_supply_loss_card_refreshed', sideKey: action.sideKey,
        cardInstanceId: card.cardInstanceId, triggerHash: window.triggerHash, trainingTruth: false });
    }
    if (route.persistentRangedHitDebuff) {
      events.push(applyOfficialRangedReactionHitDebuffV1(state, route, instance.sourcePiece, attackerFor(window, state), effect));
    }
    window.effects.push(clone(effect));
    window.resolvedChoices.push({ sideKey: action.sideKey, choice: "reaction",
      definitionId: route.definitionId, sourceInstanceId: instance.sourceInstanceId,
      abilityName: route.abilityName, planHash: action.reactionPlan.planHash,
      effectHash: effect.effectHash, trainingTruth: false });
    state.officialReactionHistory = state.officialReactionHistory || [];
    state.officialReactionHistory.push({ round: Number(state.round), phase: state.phase,
      activationId: window.activationId, triggerHash: window.triggerHash,
      sideKey: action.sideKey, definitionId: route.definitionId,
      sourceInstanceId: instance.sourceInstanceId, abilityName: route.abilityName,
      ...(hasOfficialFaqReactionPolicyV13(state) ? { timing: window.timing } : {}),
      effectKind: route.effectKind, planHash: action.reactionPlan.planHash,
      effectHash: effect.effectHash, trainingTruth: false });
    events.push({ type: "reaction_ability_resolved", sideKey: action.sideKey,
      definitionId: route.definitionId, sourceInstanceId: instance.sourceInstanceId,
      effectKind: route.effectKind, effectHash: effect.effectHash,
      triggerHash: window.triggerHash, trainingTruth: false });
  }
  closeOrAdvanceWindow(state, window, events);
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(action), events: clone(events) });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_reaction_transition_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    postRevision: Number(request.options?.postRevision || 0),
    state: freezeDeep(state), action: clone(action), events,
    settlementRequired: false,
    rulesTruth: "official_current_product_reaction_transition",
    trainingTruth: false });
}

function consumeReactionHistory(state,window,route,action,effect){
  return{round:Number(state.round),phase:state.phase,activationId:window.activationId,triggerHash:window.triggerHash,
    sideKey:action.sideKey,definitionId:route.definitionId,sourceInstanceId:action.reactionPlan.sourceInstanceId,
    abilityName:route.abilityName,...(hasOfficialFaqReactionPolicyV13(state)?{timing:window.timing}:{}),
    effectKind:route.effectKind,planHash:action.reactionPlan.planHash,effectHash:effect.effectHash,trainingTruth:false};
}
function resumeConsumeReaction(bundle,result){
  const {consumeCheckpoint:cp,consumeReceipt:payment}=result,action=cp?.action;
  if(cp?.owner.kind!=='dark_swarm_reaction'||!payment||!action)fail('CONSUME_REACTION_PARENT_REQUIRED');
  const state=clone(result.state),window=currentWindow(state),route=bundle.routes.find(r=>r.definitionId===action.definitionId);
  if(!isDeepStrictEqual(window,cp.reactionWindow)||route?.definitionId!=='unit:defiler/dark-swarm-assault-phase@1'
    ||payment.paymentPlanHash!==cp.plan.paymentPlanHash)fail('CONSUME_REACTION_PARENT_MISMATCH');
  const effect=seal({...without(cp.owner.prePaymentEffect,['effectHash']),consumePaymentReceiptHash:payment.paymentReceiptHash},'effectHash');
  window.effects.push(clone(effect));
  window.resolvedChoices.push({sideKey:action.sideKey,choice:'reaction',definitionId:route.definitionId,
    sourceInstanceId:action.reactionPlan.sourceInstanceId,abilityName:route.abilityName,planHash:action.reactionPlan.planHash,
    effectHash:effect.effectHash,trainingTruth:false});
  const index=(state.officialReactionHistory||[]).findIndex(r=>isDeepStrictEqual(r,cp.owner.historyReservation));
  if(index<0)fail('CONSUME_REACTION_QUOTA_RESERVATION_MISSING');
  state.officialReactionHistory[index]=consumeReactionHistory(state,window,route,action,effect);
  const events=[...result.events,{type:'reaction_ability_resolved',sideKey:action.sideKey,definitionId:route.definitionId,
    sourceInstanceId:action.reactionPlan.sourceInstanceId,effectKind:route.effectKind,effectHash:effect.effectHash,
    triggerHash:window.triggerHash,trainingTruth:false}];
  closeOrAdvanceWindow(state,window,events);
  state.log||=[];state.log.push({id:'log-'+(state.log.length+1),round:Number(state.round),phase:state.phase,action:clone(action),events:clone(events.slice(result.events.length))});
  return{...result,state,events};
}

export function openOfficialOpticalFlareRestorationWindowV1(bundle, transition, { recordSource = false } = {}) {
  const applied = transition.events.find(event => event.type === 'range_debuff_applied');
  if (transition.action.definitionId !== OFFICIAL_OPTICAL_FLARE_DEFINITION_ID || !applied) return transition;
  return openAppliedAbilityDebuffRestorationWindow(bundle,transition,applied,{recordSource});
}
export function openOfficialInfestationSpreadRestorationWindowV1(bundle,transition){
  if(!['unit:stukov/spread-infestation-movement-phase@1','unit:infested_trooper/spread-infestation-any-phase@1'].includes(transition.action.definitionId))return transition;
  const applied=transition.events.find(event=>event.type==='infestation_status_applied');
  return applied?openAppliedAbilityDebuffRestorationWindow(bundle,transition,applied,{recordSource:true}):transition;
}
function openAppliedAbilityDebuffRestorationWindow(bundle,transition,applied,{recordSource}){
  const { state, action } = transition;
  const sourceActionHash = hashStarcraftTmgContract(action);
  const input = { triggerKind: 'debuff_received', activeSideKey: action.sideKey, phase: state.phase,
    activationId: resolveOfficialArmourRollActivationIdV1(state,action.pieceId), sourceActionHash,
    context: { actorPieceId: action.pieceId, targetPieceId: applied.targetPieceId, affectedPieceId: applied.targetPieceId,
      statusEffectHash: applied.statusEffectHash, ...(recordSource ? { sourceDefinitionId: action.definitionId } : {}) } };
  const { activeLegal, defenderLegal } = createOfficialReactionWindowOpportunityBatchV1({ state, bundle }).projectWindow(input);
  if (![...activeLegal.parameterDomains, ...defenderLegal.parameterDomains]
    .some(domain => domain.actionType === 'resolve_reaction_family_ability')) return transition;
  const opened = openOfficialReactionFamilyWindowV1(bundle, state, input);
  return { ...transition, state: opened.state, events: [...transition.events, ...opened.events] };
}

export function openOfficialReactionFamilyWindowV1(bundle, stateInput, input = {}) {
  return openReactionFamilyWindow(bundle, stateInput, input);
}

function openReactionFamilyWindow(bundle, stateInput, input = {}, copyOwnedState = null) {
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  if (currentWindow(stateInput)) fail("REACTION_WINDOW_ALREADY_OPEN");
  const triggerKind = String(input.triggerKind || "");
  const activeSideKey = String(input.activeSideKey || stateInput.activeSideKey || "");
  const phase = String(input.phase || stateInput.phase || "");
  const faqV13 = hasOfficialFaqReactionPolicyV13(stateInput);
  // The event Host supplies null only for an event occurring outside activation.
  // Existing Native attack producers already supply their activation identity.
  const outsideActivation = faqV13 && input.activationId === null;
  const activationId = outsideActivation ? null : String(input.activationId || "");
  const sourceActionHash = String(input.sourceActionHash || "");
  const resumeActionHash = String(input.resumeActionHash || sourceActionHash);
  if (!TRIGGER_KINDS.has(triggerKind) || !SIDE_KEYS.has(activeSideKey)
    || !phase || (!outsideActivation && !activationId) || !/^[a-f0-9]{64}$/u.test(sourceActionHash)
    || !/^[a-f0-9]{64}$/u.test(resumeActionHash) || !object(input.context)) {
    fail("REACTION_WINDOW_INPUT_INVALID", triggerKind);
  }
  if (faqV13 && phase !== stateInput.phase) fail("REACTION_WINDOW_PHASE_MISMATCH");
  const context = { ...clone(input.context), enemyReactionAllowed:
    input.context.enemyReactionAllowed !== false };
  if (outsideActivation && !SIDE_KEYS.has(stateInput.firstPlayerSideKey)) {
    fail("REACTION_FIRST_PLAYER_MARKER_REQUIRED");
  }
  const firstPriority = outsideActivation ? stateInput.firstPlayerSideKey : activeSideKey;
  const timing = outsideActivation ? "outside_activation" : "inside_activation";
  const triggerHash = hashStarcraftTmgContract({ triggerKind, activationId,
    sourceActionHash, context, ...(faqV13 ? { timing, round: Number(stateInput.round), phase } : {}) });
  const state = copyOwnedState ? copyOwnedState(stateInput) : clone(stateInput);
  const window = seal({ schema: OFFICIAL_REACTION_FAMILY_WINDOW_SCHEMA,
    semanticVersion: "1.0.0", triggerKind, triggerHash,
    sourceActionHash, resumeActionHash, activationId,
    round: Number(state.round), phase, activeSideKey,
    prioritySideKeys: [firstPriority, otherSide(firstPriority)],
    priorityIndex: 0, stage: "awaiting_reaction", context,
    resolvedChoices: [], effects: [],
    activePlayerReactionPriorityFirst: !outsideActivation,
    oneReactionPerPlayerPerActivation: !outsideActivation,
    ...(faqV13 ? { timing, resumeActiveSideKey: stateInput.activeSideKey ?? null,
      outsideActivationPhaseLimit: true,
      firstPlayerMarkerHolderPriorityFirst: outsideActivation } : {}),
    rulesTruth: "official_current_product_reaction_window",
    trainingTruth: false }, "windowHash");
  state.pendingOfficialReactionWindow = clone(window);
  const event = { type: "reaction_window_opened", triggerKind, triggerHash,
    windowHash: window.windowHash, activationId,
    prioritySideKey: firstPriority, sourceActionHash, resumeActionHash,
    trainingTruth: false };
  state.log = state.log || [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase, action: { actionType: "open_reaction_window", triggerKind,
      sourceActionHash }, events: [clone(event)] });
  return freezeDeep({ ok: true,
    schema: "starcraft_tmg_official_reaction_window_open_transition_v1",
    runtimeId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    runtimeVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    state: freezeDeep(state), events: [event],
    rulesTruth: "official_current_product_reaction_window_opened",
    trainingTruth: false });
}

// Readonly opportunity queries can open a window and pass its first priority
// without changing units, resources, terrain or source data. Own ONE complete
// immutable snapshot; copy every field these two native transitions can mutate.
// The callback stays private: public Apply/Open still copy their entire caller.
export function createOfficialReactionWindowOpportunityBatchV1(input = {}) {
  const snapshot = freezeDeep(structuredClone({ state: input.state,
    bundle: input.bundle || input.state?.officialReactionFamilySourceBundle }));
  verifyOfficialReactionFamilySourceBundleV1(snapshot.bundle);
  function copyOwnedWindowState(state) {
    const next = { ...state };
    for (const key of ["pendingOfficialReactionWindow", "log",
      "officialReactionResolutionHistory"]) {
      if (Object.hasOwn(state, key)) next[key] = clone(state[key]);
    }
    return next;
  }
  return Object.freeze({
    projectWindow(windowInput) {
      const opened = openReactionFamilyWindow(snapshot.bundle, snapshot.state,
        windowInput, copyOwnedWindowState);
      const activeLegal = enumerate(snapshot.bundle, opened.state, {
        sideKey: opened.state.pendingOfficialReactionWindow.prioritySideKeys[0],
      });
      const passDomain = activeLegal.parameterDomains.find(domain =>
        domain.actionType === "pass_reaction_family_window");
      let defenderLegal = { parameterDomains: [], prioritySideKey: null };
      if (passDomain) {
        const passPreview = preview(snapshot.bundle, opened.state, {
          domain: passDomain, parameters: {},
        });
        const advanced = apply(snapshot.bundle, opened.state, {
          action: passPreview.action,
        }, copyOwnedWindowState);
        const pending = advanced.state.pendingOfficialReactionWindow;
        defenderLegal = enumerate(snapshot.bundle, advanced.state, {
          sideKey: pending?.prioritySideKeys?.[pending?.priorityIndex],
        });
      }
      return freezeDeep({ activeLegal, defenderLegal });
    },
  });
}

export function readOfficialBeforeEvadeReactionModifierV1(state, action, targetUnitId, triggerHash) {
  if (triggerHash === undefined) return 0;
  const result = (state.officialReactionResolutionHistory || []).find(row => row.triggerHash === triggerHash);
  const target = state.pieces.find(row => row.id === targetUnitId);
  const routes = state.officialReactionFamilySourceBundle?.routes;
  if (!target || !result || result.consumedByHost || result.triggerKind !== 'before_evade_roll'
    || result.round !== Number(state.round) || result.phase !== state.phase || result.activeSideKey !== action.sideKey
    || result.sourceActionHash !== hashStarcraftTmgContract(action)
    || result.resolutionHash !== hashStarcraftTmgContract(without(result, ['resolutionHash']))) {
    fail('BEFORE_EVADE_REACTION_BINDING_INVALID');
  }
  for (const effect of result.effects) {
    const route = routes?.find(row => row.definitionId === effect.definitionId);
    const card = (state.cardResources?.[target.sideKey] || []).find(row => row.cardInstanceId === effect.sourceInstanceId);
    if (route?.effectKind !== 'evade_roll_modifier' || route.triggerKind !== result.triggerKind
      || route.sourceFeatureHash !== effect.sourceFeatureHash || route.evadeModifier !== effect.evadeModifier
      || effect.targetPieceId !== target.id || effect.sideKey !== target.sideKey || card?.officialCardRecordKey !== route.recordKey
      || effect.effectHash !== hashStarcraftTmgContract(without(effect, ['effectHash']))) {
      fail('BEFORE_EVADE_REACTION_EFFECT_INVALID');
    }
  }
  return Math.max(0, ...result.effects.map(effect => effect.evadeModifier));
}

export function projectOfficialReactionFamilyResolutionV1(state, triggerHash) {
  const resolution = (state.officialReactionResolutionHistory || []).find((entry) => (
    entry.triggerHash === triggerHash && entry.consumedByHost !== true));
  if (!resolution) return null;
  const effects = clone(resolution.effects);
  const damage = effects.filter((entry) => Number(entry.damageReduction || 0) > 0);
  return freezeDeep({ schema: "starcraft_tmg_official_reaction_projection_v1",
    triggerHash, resolutionHash: resolution.resolutionHash,
    redirectTargetPieceId: effects.find((entry) => entry.redirectTargetPieceId)
      ?.redirectTargetPieceId || null,
    tough: Math.max(0, ...effects.map((entry) => Number(entry.tough || 0))),
    dodge: Math.max(0, ...effects.map((entry) => Number(entry.dodge || 0))),
    evadeModifier: Math.max(0, ...effects.map((entry) => Number(entry.evadeModifier || 0))),
    evadeEligible: effects.some((entry) => entry.evadeEligible === true),
    ...(effects.some(entry => entry.effectKind === 'fixed_evade_characteristic')
      ? { evadeThresholdSetTo: 4, evadeUnmodifiable: true } : {}),
    hitModifier: effects.reduce((sum, entry) => sum + Number(entry.hitModifier || 0), 0),
    speedModifier: effects.reduce((sum, entry) => sum + Number(entry.speedModifier || 0), 0),
    chargeDistanceModifier: effects.reduce((sum, entry) => (
      sum + Number(entry.chargeDistanceModifier || 0)), 0),
    chargeAdditionalDice: effects.reduce((sum, entry) => (
      sum + Number(entry.additionalDice || 0)), 0),
    resourceCostReduction: effects.reduce((sum, entry) => (
      sum + Number(entry.resourceCostReduction || 0)), 0),
    damageReduction: damage.reduce((sum, entry) => sum + entry.damageReduction, 0),
    minimumDamage: Math.max(0, ...damage.map((entry) => Number(entry.minimumDamage || 0))),
    ...(effects.some(entry => entry.effectKind === 'weapon_damage_characteristic_cap') ? {
      maximumWeaponDamage: Math.min(...effects.filter(entry => entry.effectKind === 'weapon_damage_characteristic_cap')
        .map(entry => entry.maximumWeaponDamage)),
    } : {}),
    automaticHits: effects.reduce((sum, entry) => sum + Number(entry.automaticHits || 0), 0),
    followups: effects.flatMap((entry) => entry.followup ? [entry.followup] : []),
    effects, rulesAuthority: true, mutationAuthority: false,
    trainingTruth: false });
}

export function consumeOfficialReactionFamilyResolutionV1(stateInput, triggerHash) {
  const state = clone(stateInput);
  const index = (state.officialReactionResolutionHistory || []).findIndex((entry) => (
    entry.triggerHash === triggerHash && entry.consumedByHost !== true));
  if (index < 0) fail("REACTION_RESOLUTION_NOT_AVAILABLE", String(triggerHash || ""));
  const projection = projectOfficialReactionFamilyResolutionV1(state, triggerHash);
  const existing = state.officialReactionResolutionHistory[index];
  state.officialReactionResolutionHistory[index] = seal({
    ...without(existing, ["resolutionHash"]), consumedByHost: true,
    consumedAtRound: Number(state.round), consumedAtPhase: state.phase,
  }, "resolutionHash");
  return freezeDeep({ state: freezeDeep(state), projection,
    rulesTruth: "official_current_product_reaction_resolution_consumed",
    trainingTruth: false });
}

function query(state, request = {}) {
  const queryKind = String(request.queryKind || "reaction_window");
  if (!new Set(["reaction_window", "reaction_resolution"]).has(queryKind)) {
    fail("REACTION_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  const result = queryKind === "reaction_window" ? clone(currentWindow(state))
    : projectOfficialReactionFamilyResolutionV1(state, request.triggerHash);
  return seal({ schema: "starcraft_tmg_official_reaction_query_v1",
    semanticVersion: "1.0.0", queryKind, precision: "exact", result,
    source: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}
function lifecycle(stateInput, request = {}) {
  const eventKind = String(request.eventKind || "");
  if (!new Set(["activation_end", "round_end", "cleanup_and_refresh"])
    .has(eventKind)) return null;
  const state = clone(stateInput);
  if (eventKind === "cleanup_and_refresh") {
    state.officialReactionResolutionHistory = (
      state.officialReactionResolutionHistory || []).filter((entry) => (
      Number(entry.round) >= Number(state.round)));
  }
  return state;
}

export function createOfficialReactionFamilyAdapterV1(bundle, { afterApply } = {}) {
  verifyOfficialReactionFamilySourceBundleV1(bundle);
  const descriptor = freezeDeep({
    adapterId: OFFICIAL_REACTION_FAMILY_ADAPTER_ID,
    adapterVersion: OFFICIAL_REACTION_FAMILY_ADAPTER_VERSION,
    adapterKind: "exact_runtime",
    coveredDefinitionCount: bundle.routeCount,
    coveredSourceFeatureHashes: [...bundle.coveredSourceFeatureHashes],
    supportedOperations: ["legal_space", "preview", "apply", "query", "lifecycle",
      "open_reaction_window", "consume_reaction_window"],
    archetypeCounts: { ...bundle.archetypeCounts },
    sourceBundleHash: bundle.bundleHash,
    ...(bundle.schema === 'starcraft_tmg_official_reaction_family_source_bundle_v2'
      ? { sourceDefinitionScope: 'explicit_source_definition_set', fullFamilyCoverage: false } : {}),
    triggerWindowConsumerSeamExplicit: true,
    activePlayerReactionPriorityExact: true,
    oneReactionPerPlayerPerActivationExact: true,
    sameNamedReactionPerSourceUnitPerRoundExact: true,
    resourceAndCardPaymentExact: true,
    legalSpacePreviewApplyReplaySequencePreserved: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
  return freezeDeep({ descriptor,
    legalSpace: (state, options = {}) => enumerate(bundle, state, options),
    preview: (state, request = {}) => preview(bundle, state, request),
    apply: (state, request = {}) => {
      const result = apply(bundle, state, request);
      return afterApply ? freezeDeep(afterApply(state, result, request.action, request.options)) : result;
    },
    query: (state, request = {}) => query(state, request),
    lifecycle: (state, request = {}) => lifecycle(state, request),
    openReactionWindow: (state, request = {}) => (
      openOfficialReactionFamilyWindowV1(bundle, state, request)),
    consumeReactionWindow: (state, request = {}) => (
      consumeOfficialReactionFamilyResolutionV1(state, request.triggerHash)),
  });
}
import {OFFICIAL_DETONATION_REACTION_COMPONENTS_V1} from '../source-data/official-detonation-source-v1.mjs';
import {inspectOfficialDetonationFactsV1} from './official-detonation-facts-v1.mjs';
import {hasOfficialConsumeBeforeCasualtyPolicyV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';
import {stageOfficialConsumePaymentV1} from './official-consume-continuation-v1.mjs';
