import { alternateOfficialPhaseActivationV1 } from '../rule-atoms/official-phase-activation-availability-v1.mjs';
import { readOfficialBeforeEvadeReactionModifierV1 } from './official-reaction-family-adapter-v1.mjs';
import { resolveOfficialDodgeTransferCountsV1 } from '../rule-atoms/official-dodge-resolution-kernel-v1.mjs';
import { hasOfficialNonLethalStandardDamagePolicyV1 } from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { readOfficialRangedCasualtyContextV1 } from './official-ranged-casualty-context-v1.mjs';
import { hasOfficialPinpointEngagementPolicyV1 } from '../rule-atoms/official-pinpoint-engagement-policy-v1.mjs';
import { findOfficialBombardTargetingBindingV1, resolveOfficialBombardTargetingContextV1 }
  from './official-bombard-targeting-v1.mjs';
import { hasOfficialPrintedIndirectFireEvadePolicyV1, projectOfficialRangedDeclarationProfileV1 }
  from '../rule-atoms/official-ranged-declaration-keywords-v1.mjs';
import { planOfficialArmourThresholdV1 } from "../rule-atoms/official-armour-threshold-policy-v1.mjs";
import { recordOfficialArmourRollV1, hasOfficialArmourRollOrdinalPolicyV1, resolveOfficialArmourRollActivationIdV1 } from "../rule-atoms/official-armour-roll-ordinal-v1.mjs";
import { projectOfficialRangedTerrainForLosV1 as terrainAsOrdinaryForLos } from './official-ranged-terrain-projection-v1.mjs';
import { usesWave3FaqClarifications } from '../rule-atoms/official-wave3-faq-clarifications-v1.mjs';
import { hasOfficialIndomitableRangedPolicyV1, hasOfficialIndomitableTemplateBatchPolicyV1,
  OFFICIAL_INDOMITABLE_RANGED_POLICY_V1 } from '../rule-atoms/official-indomitable-ranged-policy-v1.mjs';
import { hasOfficialModeBoundRangedTargetPolicyV1, OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1 }
  from '../rule-atoms/official-mode-bound-ranged-target-policy-v1.mjs';
import { isDeepStrictEqual, types as nodeUtilTypes } from "node:util";
import { inspectOfficialArmourChoiceV1, resolveOfficialArmourChoiceV1 } from
  '../rule-atoms/official-armour-choice-kernel-v1.mjs';
import { isOfficialSiegeModeWeaponEligibleV1 } from
  "../rule-atoms/official-status-stay-in-play-rules-kernel-v1.mjs";
import { createHash } from "node:crypto";
import { constants as bufferConstants } from "node:buffer";
import { resolveOfficialCoordinatedStrikeOriginV1, hasOfficialCoordinatedStrikeCurrentConsumerV1 }
  from '../rule-atoms/official-coordinated-strike-policy-v1.mjs';
import { verifyOfficialGeneratedUnitDataBundleV2 } from '../source-data/official-generated-unit-data-bundle-v2.mjs';

import { hashStarcraftTmgContract, canonicalStarcraftTmgJson,
  STARCRAFT_TMG_HASH_ALGORITHM } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import {
  createOfficialModelBaseFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import {
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS,
} from "../rule-atoms/official-elevation-effective-size-rules-executor-v1.mjs";
import {
  createOfficialElevatedLineOfSightBatchV1,
  evaluateOfficialElevatedLineOfSightV1,
  evaluateOfficialElevatedLineOfSightBatchV1,
  canonicalNativeOfficialElevatedLosResultV1,
} from "../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { createOfficialMultiModelCasualtyResolutionKernelV1 } from
  "../rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../rule-atoms/official-contextual-supply-projection-v1.mjs";
import { resolveOfficialMissionMarkerControlV2,
  createOfficialMissionMarkerControlUnitBatchV2 } from
  "../rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS,
} from "../rule-atoms/official-ranged-attack-executor-v6.mjs";
import {
  OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS, isOfficialRosterAttackProfileFieldedV1,
} from "../rule-atoms/official-weapon-replacement-loadout-v1.mjs";
import { recordOfficialSupplyLossesV1, verifyOfficialSupplyLossLedgerV1 } from
  "../rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  getOfficialAttackProfileV1, getOfficialAttackProfileV3,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import { createOfficialAttackProfileCatalogueV2 } from
  "../source-data/official-attack-profile-catalogue-v2.mjs";
import { getOfficialCombatProfileV1, verifyOfficialCombatProfileBundleV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import {
  assertOfficialSelectedRosterCoreActionWindowV1,
  consumeOfficialSelectedRosterFirstWeaponModifierV1,
  openOfficialSelectedRosterAfterActionWindowV1,
  resolveOfficialSelectedRosterAbilityModifiersV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";
import {
  consumeOfficialCharacteristicStatusFirstWeaponEffectsV1,
  consumeOfficialCharacteristicStatusFirstGameWeaponV1,
  hasOfficialHiddenRangedAndEvadePolicyV1,
  isOfficialBurrowedCoreActorV1,
  projectOfficialCharacteristicStatusFamilyModifiersV1, projectOfficialRangedReactionHitPenaltyV1,
  resolveOfficialEffectiveCombatProfileV1,
  synchronizeOfficialEffectiveHitPointWoundsV1,
} from "./official-characteristic-status-family-adapter-v1.mjs";
import { projectOfficialRangedFamilyModifiersV1 } from
  "./official-ranged-family-projection-v1.mjs";
import {
  consumeOfficialBattlefieldAssetFirstWeaponEffectsV1,
  projectOfficialBattlefieldAssetFamilyModifiersV1,
} from "./official-battlefield-asset-family-adapter-v1.mjs";
import { projectOfficialStalkerFuryV1, projectOfficialMatchLifecycleFamilyModifiersV1 } from
  "./official-match-lifecycle-family-adapter-v1.mjs";
import {
  consumeOfficialProtossUniqueFirstWeaponEffectV1,
  projectOfficialProtossUniqueFamilyModifiersV1,
} from "./official-protoss-unique-family-adapter-v1.mjs";
import {createOfficialReactionFamilyAdapterV1,openOfficialReactionFamilyWindowV1,
  consumeOfficialReactionFamilyResolutionV1, projectOfficialLungeRangedTargetDesignationV1} from './official-reaction-family-adapter-v1.mjs';
import {resolveOfficialTotalDamagePoolReductionV1} from '../rule-atoms/official-total-damage-reaction-kernel-v1.mjs';
import { hasOfficialShieldedLifecyclePolicyV1 } from '../source-data/official-shielded-lifecycle-policy-v1.mjs';
import { collectOfficialShieldedDependentCleanupV1 } from '../rule-atoms/official-status-stay-in-play-rules-kernel-v1.mjs';
import { projectOfficialAttackTargetWeaponDamageCapV1, projectOfficialAttackTargetFixedEvadeV1,
  projectOfficialAttackTargetEvadeEligibilityV1 } from './official-attack-target-reaction-context-v1.mjs';
import { readOfficialOverwatchAttackGrantV1, getOfficialOverwatchSourceSpecV1 } from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { allowsOfficialSpawnRoundSpecialAbilityV1 } from '../rule-atoms/official-spawn-round-ability-lock-v1.mjs';

// A conditional trigger query shares the live target evaluator. Its opaque
// context is module-local and cannot be supplied as a Native action parameter.
const OVERWATCH_PROBES = new WeakSet();

export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID =
  "starcraft-tmg-official-selected-roster-ranged-action-runtime-v1";
export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION = "1.9.0";
export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE = "ranged_attack";
export const OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE =
  "finish_ranged_attack_sequence";
export const OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_ACTION_TYPE =
  OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE;
export const OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND =
  "official_selected_roster_ranged_target_v1";
export const OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND =
  "official_selected_roster_ranged_casualty_selection_v1";
export const OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA =
  "starcraft_tmg_official_selected_roster_ranged_plan_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const CASUALTY_KERNEL = createOfficialMultiModelCasualtyResolutionKernelV1();
// Only privately cloned/frozen native preparations or preview batches register here. Public states,
// enumerations and caller-supplied domains cannot opt into verified reuse.
const PREVIEW_CONTEXTS_BY_OWNED_STATE = new WeakMap();
// Two complete, privately owned snapshots only. A caller's hash/ID/prepared
// object never grants reuse: current source checks, a complete state hash and
// deep value equality are required on every public enumeration invocation.
const NATIVE_RANGED_PREPARATIONS = new Map();
const NATIVE_PREPARATION_BY_ENUMERATION = new WeakMap();
const RULE_ATOM_IDS = Object.freeze([...new Set([
  ...OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS,
  ...OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
  ...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS,
])].sort((left, right) => left.localeCompare(right)));
const CONTEXTUAL_EFFECT_ATOM_IDS = new Set([
  "attack-effect:indirect-fire-v1", "attack-effect:instant-v1",
  "attack-effect:locked-in-v1", "attack-effect:pinpoint-v1",
  "attack-effect:sidearm-v1", "attack-effect:specialist-v1",
]);

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
function plainRangedDataTree(value, active = new WeakSet(), complete = new WeakSet()) {
  if (value === null || typeof value !== "object") {
    return ["string", "boolean", "undefined"].includes(typeof value)
      || (typeof value === "number" && Number.isFinite(value))
      || value === null;
  }
  if (nodeUtilTypes.isProxy(value) || active.has(value)) return false;
  if (complete.has(value)) return true;
  const prototype = Object.getPrototypeOf(value);
  const nativeArray = Array.isArray(value);
  if (nativeArray ? prototype !== Array.prototype
    : prototype !== Object.prototype && prototype !== null) return false;
  // Inspect the same complete own-key set, without allocating a descriptor map
  // and an entries array for every node of a large terrain/state tree.
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== "string")) return false;
  active.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    const nativeArrayLength = nativeArray && key === "length";
    // structuredClone omits non-enumerable data properties. Such callers must
    // retain the original scalar path, never prepare an incomplete snapshot.
    if (!descriptor || !("value" in descriptor) || (!descriptor.enumerable && !nativeArrayLength)
      || !plainRangedDataTree(descriptor.value, active, complete)) {
      active.delete(value);
      return false;
    }
  }
  active.delete(value);
  complete.add(value);
  return true;
}

function nativeRangedPreparationFromVerifiedState(state, options) {
  // Existing readonly batches already own their snapshot and diagnostic lane.
  // Keep that path unchanged rather than importing another batch's contexts.
  if (PREVIEW_CONTEXTS_BY_OWNED_STATE.has(state)
    || !plainRangedDataTree(state) || !plainRangedDataTree(options)) return null;
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("SELECTED_RANGED_SIDE_INVALID", sideKey);
  const key = `${sideKey}:${options.includeDisabled === true}:${hashStarcraftTmgContract(state)}`;
  const prior = NATIVE_RANGED_PREPARATIONS.get(key);
  if (prior && isDeepStrictEqual(state, prior.snapshot)) {
    NATIVE_RANGED_PREPARATIONS.delete(key);
    NATIVE_RANGED_PREPARATIONS.set(key, prior);
    return prior;
  }
  // No caller code/getter can run during this copy; the guard above inspects
  // data descriptors without invoking them. Never freeze the mutable caller.
  const snapshot = freezeDeep(clone(state));
  PREVIEW_CONTEXTS_BY_OWNED_STATE.set(snapshot, { contexts: new Map(), observe: null });
  const enumeration = enumerateRangedFromVerifiedState(snapshot, options);
  const prepared = Object.freeze({ snapshot, enumeration });
  NATIVE_PREPARATION_BY_ENUMERATION.set(enumeration, prepared);
  NATIVE_RANGED_PREPARATIONS.set(key, prepared);
  while (NATIVE_RANGED_PREPARATIONS.size > 2) {
    NATIVE_RANGED_PREPARATIONS.delete(NATIVE_RANGED_PREPARATIONS.keys().next().value);
  }
  return prepared;
}

function nativeContextStateForEnumeration(state, enumeration) {
  const prepared = NATIVE_PREPARATION_BY_ENUMERATION.get(enumeration);
  // The identity is module-private, and the COMPLETE current state must still
  // match. A previously returned public enumeration is not a prepared argument.
  return prepared && plainRangedDataTree(state)
    && isDeepStrictEqual(state, prepared.snapshot) ? prepared.snapshot : state;
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}
function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("SELECTED_RANGED_SIDE_INVALID", sideKey);
}
function phaseReady(state, sideKey, overwatch = readOfficialOverwatchAttackGrantV1(state)?.sideKey === sideKey) {
  if (state.phase !== "assault" || state.activeSideKey !== sideKey
    || !overwatch && state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("SELECTED_RANGED_PHASE_UNAVAILABLE", sideKey);
  }
  const choice = state.phaseFirstActorByRound?.[`${state.round}:assault`];
  if (!object(choice) || choice.round !== Number(state.round)
    || choice.phase !== "assault" || !SIDE_KEYS.has(choice.chosenFirstActorSideKey)) {
    fail("SELECTED_RANGED_PHASE_INITIATIVE_UNRESOLVED");
  }
}
import { currentOfficialSelectedRosterRangedSequenceV1 } from './official-ranged-sequence-state-v1.mjs';
export { currentOfficialSelectedRosterRangedSequenceV1 } from './official-ranged-sequence-state-v1.mjs';
const pendingSequence = currentOfficialSelectedRosterRangedSequenceV1;
function pendingCasualtyChoice(state) {
  const pending = readOfficialRangedCasualtyContextV1(state);
  if (pending) verifyOfficialCurrentProductCasualtyDomainV1(pending.casualtyDomain);
  return pending;
}

function modelPositionForStrategy(model) {
  const xMilliInches = Number.isFinite(Number(model?.xInches))
    ? Math.round(Number(model.xInches) * 1000)
    : Number.isFinite(Number(model?.xMilliInches))
      ? Number(model.xMilliInches) : null;
  const yMilliInches = Number.isFinite(Number(model?.yInches))
    ? Math.round(Number(model.yInches) * 1000)
    : Number.isFinite(Number(model?.yMilliInches))
      ? Number(model.yMilliInches) : null;
  return { xMilliInches, yMilliInches,
    baseRotationDegrees: Number(model?.baseRotationDegrees || 0) };
}

function formationEnvelopeForStrategicModels(models) {
  const positioned = models.map((model) => ({
    modelId: model.modelId || model.id,
    ...modelPositionForStrategy(model),
  })).filter((model) => Number.isFinite(model.xMilliInches)
    && Number.isFinite(model.yMilliInches));
  if (positioned.length === 0) return null;
  const x = positioned.map((model) => model.xMilliInches);
  const y = positioned.map((model) => model.yMilliInches);
  return {
    modelCount: positioned.length,
    minXMilliInches: Math.min(...x),
    maxXMilliInches: Math.max(...x),
    minYMilliInches: Math.min(...y),
    maxYMilliInches: Math.max(...y),
    widthMilliInches: Math.max(...x) - Math.min(...x),
    heightMilliInches: Math.max(...y) - Math.min(...y),
    modelBaseFootprintsExcludedFromEnvelope: true,
  };
}

function strategicMovementProfile(state, target) {
  const route = state.officialActionRouteCatalogue?.units?.find((entry) =>
    entry.pieceId === target.id
      && entry.recordKey === target.officialUnitRecordKey);
  const movement = route?.movementProfile;
  if (!movement) return null;
  const multiModelInches = Number(movement.multiModelSpeedInches);
  const singleModelInches = Number(movement.singleModelSpeedInches);
  if (!Number.isFinite(multiModelInches)
    || !Number.isFinite(singleModelInches)) return null;
  return {
    printedSourceValue: movement.sourceValue || null,
    multiModelInches,
    singleModelInches,
    currentPrintedInches: Number(target.currentModels) === 1
      ? singleModelInches : multiModelInches,
    modifiersRequireFreshLegalSpace: true,
  };
}

function currentMeleeRanks(state, target) {
  try {
    if (!activePiece(target)) return {
      status: "not_on_battlefield",
      fightingModelIds: [], supportingModelIds: [], contributingModelIds: [],
    };
    const graph = deriveOfficialEngagementGraphV2(state);
    const fightingModelIds = activeModels(target).filter((model) => (
      graph.modelEdges.some((edge) => (
        edge.leftUnitId === target.id && edge.leftModelId === model.id
          || edge.rightUnitId === target.id && edge.rightModelId === model.id
      ))
    )).map((model) => model.id).sort();
    const fighting = new Set(fightingModelIds);
    const supportingModelIds = activeModels(target).filter((model) => (
      !fighting.has(model.id) && activeModels(target).some((friend) => (
        fighting.has(friend.id)
          && baseGapInches(state, target, model, target, friend) <= 0.001
      ))
    )).map((model) => model.id).sort();
    return {
      status: "exact_current_geometry",
      engagementGraphHash: graph.graphHash,
      fightingModelIds,
      supportingModelIds,
      contributingModelIds:
        [...fightingModelIds, ...supportingModelIds].sort(),
    };
  } catch (error) {
    return {
      status: "unknown",
      reason: String(error?.message || error).split(":")[0],
      fightingModelIds: [], supportingModelIds: [], contributingModelIds: [],
    };
  }
}

function projectMissionMarkerControl(state, ownedImmutableState = false, controlBatch = null) {
  try {
    // Only the private query batch can supply an owned immutable snapshot.
    // The Rules resolver owns its terrain projection; changing this root's
    // phase needs no second copy of every unit/catalogue/terrain payload.
    const projected = ownedImmutableState ? { ...state } : clone(state);
    projected.phase = "cleanup";
    const resolution = controlBatch ? controlBatch.resolvePieces(projected.pieces)
      : resolveOfficialMissionMarkerControlV2({
      state: projected,
      terrainLosDataBundle: projected.officialTerrainLosDataBundle,
      matchBinding: {
        rulesRuntimeBinding: {
          runtimeHash: projected.officialMissionRuntimeDescriptor?.runtimeHash,
        },
      },
    });
    return {
      status: "exact_current_geometry",
      controlResolutionHash: resolution.controlResolutionHash,
      markerResults: clone(resolution.markerResults),
    };
  } catch (error) {
    return {
      status: "unknown",
      reason: String(error?.message || error).split(":")[0],
      markerResults: [],
    };
  }
}

function casualtyProjectedState(state, targetPieceId, casualtyModelIds,
  ownedImmutableState = false) {
  const projected = ownedImmutableState ? { ...state,
    pieces: state.pieces.map(piece => piece.id === targetPieceId ? clone(piece) : piece),
  } : clone(state);
  const target = projected.pieces.find((piece) => piece.id === targetPieceId);
  if (!target) fail("SELECTED_RANGED_CASUALTY_TARGET_UNKNOWN", targetPieceId);
  const casualties = new Set(casualtyModelIds);
  for (const model of target.models) {
    if (!casualties.has(model.id)) continue;
    model.isDestroyed = true;
    model.isOnField = false;
  }
  target.destroyedModelIds = [...new Set([
    ...(target.destroyedModelIds || []), ...casualties,
  ])].sort();
  target.currentModels = activeModels(target).length;
  const profile = getOfficialCombatProfileV1(
    projected.officialCombatProfileBundle, target.officialUnitRecordKey);
  target.currentSupply = exactCurrentSupply(profile, target.currentModels);
  if (target.currentModels === 0) {
    target.isDestroyed = true;
    target.isOnField = false;
  }
  return ownedImmutableState ? freezeDeep(projected) : projected;
}

function missionMarkerControlConsequences(
  state, targetPieceId, casualtyModelIds, prepared = null,
  ownedPostCasualtyState = null,
) {
  const before = prepared ? prepared.missionControlBefore()
    : projectMissionMarkerControl(state);
  const after = ownedPostCasualtyState
    ? prepared.missionControl(ownedPostCasualtyState)
    : projectMissionMarkerControl(casualtyProjectedState(
      state, targetPieceId, casualtyModelIds));
  if (before.status !== "exact_current_geometry"
    || after.status !== "exact_current_geometry") {
    return {
      status: "unknown",
      beforeReason: before.reason || null,
      afterReason: after.reason || null,
      markers: [],
    };
  }
  const afterById = new Map(after.markerResults.map((row) => [row.markerId, row]));
  return {
    status: "exact_current_geometry",
    beforeControlResolutionHash: before.controlResolutionHash,
    afterControlResolutionHash: after.controlResolutionHash,
    markers: before.markerResults.map((beforeMarker) => {
      const afterMarker = afterById.get(beforeMarker.markerId);
      const beforeUnit = beforeMarker.contestingUnitsBySide
        ?.[state.pieces.find((piece) => piece.id === targetPieceId)?.sideKey]
        ?.find((unit) => unit.unitId === targetPieceId) || null;
      const afterUnit = afterMarker?.contestingUnitsBySide
        ?.[state.pieces.find((piece) => piece.id === targetPieceId)?.sideKey]
        ?.find((unit) => unit.unitId === targetPieceId) || null;
      return {
        markerId: beforeMarker.markerId,
        beforeEligibleModelIds: clone(beforeUnit?.eligibleModelIds || []),
        afterEligibleModelIds: clone(afterUnit?.eligibleModelIds || []),
        targetUnitContestsBefore: Boolean(beforeUnit),
        targetUnitContestsAfter: Boolean(afterUnit),
        supplyTotalsBefore: clone(beforeMarker.supplyTotals),
        supplyTotalsAfter: clone(afterMarker?.supplyTotals || null),
        controllerBefore: beforeMarker.nextControlSideKey,
        controllerAfter: afterMarker?.nextControlSideKey || null,
        controllerChangedByCasualtySelection:
          beforeMarker.nextControlSideKey !== afterMarker?.nextControlSideKey,
        resultBefore: beforeMarker.result,
        resultAfter: afterMarker?.result || null,
      };
    }),
  };
}

function tacticalMassProjection(state, targetPieceId) {
  try {
    const target = state.pieces.find((piece) => piece.id === targetPieceId);
    if (!target || !activePiece(target)) return {
      status: "not_applicable",
      reason: "target_not_active_on_battlefield",
    };
    const graph = deriveOfficialEngagementGraphV2(state);
    const engagedEnemyUnitIds = [...new Set(graph.modelEdges.flatMap((edge) => {
      if (edge.leftUnitId === targetPieceId) return [edge.rightUnitId];
      if (edge.rightUnitId === targetPieceId) return [edge.leftUnitId];
      return [];
    }))].sort();
    if (engagedEnemyUnitIds.length === 0) return {
      status: "not_applicable",
      reason: "not_currently_engaged",
      engagementGraphHash: graph.graphHash,
      engagedEnemyUnitIds: [],
    };
    const own = projectOfficialContextualSupplyValueV1({
      state, pieceId: targetPieceId, context: "disengage_check",
    });
    const enemyRows = engagedEnemyUnitIds.map((pieceId) =>
      projectOfficialContextualSupplyValueV1({
        state, pieceId, context: "disengage_check",
      }));
    const combinedEnemyEffectiveSupply = enemyRows.reduce((sum, row) =>
      sum + Number(row.effectiveSupply), 0);
    return {
      status: "exact_current_geometry",
      engagementGraphHash: graph.graphHash,
      engagedEnemyUnitIds,
      ownEffectiveSupply: Number(own.effectiveSupply),
      enemyEffectiveSupplyByUnit: Object.fromEntries(enemyRows.map((row) => [
        row.pieceId, Number(row.effectiveSupply),
      ])),
      combinedEnemyEffectiveSupply,
      tacticalMass: Number(own.effectiveSupply) > combinedEnemyEffectiveSupply,
      followingAssaultPenaltyAvoided:
        Number(own.effectiveSupply) > combinedEnemyEffectiveSupply,
    };
  } catch (error) {
    return {
      status: "unknown",
      reason: String(error?.message || error).split(":")[0],
    };
  }
}

function strategicLossContext(state, target) {
  const profileRows = activeProfilesFor(state, target).profiles.map((profile) => {
    const contributingModelIds = contributingModelIdsFor(
      state, target, profile).sort();
    return {
      profileKey: profile.profileKey,
      weaponName: profile.weaponName,
      contributingModelIds,
      printedRateOfAttackPerContributor: Number(profile.rateOfAttack),
      printedHitThreshold: Number(profile.hitThreshold),
      printedDamagePerConfirmedDie: Number(profile.damage),
      printedHitDiceBeforeModifiers:
        contributingModelIds.length * Number(profile.rateOfAttack),
      surge: clone(profile.surge || null),
      exactCurrentDiceAndDamageRequireFreshLegalSpace: true,
    };
  });
  const active = activeModels(target);
  const catalogueV2 = state.officialAttackProfileCatalogueV2
    || createOfficialAttackProfileCatalogueV2({
      previousCatalogue: state.officialAttackProfileCatalogue,
    });
  const fieldedMelee = catalogueV2.profiles.filter((profile) => (
    profile.recordKey === target.officialUnitRecordKey
      && profile.phase === "combat"
      && profile.range.kind === "engagement"
      && isOfficialRosterAttackProfileFieldedV1(state, target, profile)
  ));
  const replacedMelee = new Set(fieldedMelee.filter((profile) =>
    profile.linkedTo !== "-").map((profile) =>
    normalizedName(profile.linkedTo)));
  const meleeProfileRows = fieldedMelee.filter((profile) =>
    !replacedMelee.has(normalizedName(profile.weaponName))).map((profile) => ({
    profileKey: profile.profileKey,
    weaponName: profile.weaponName,
    potentialContributingModelIds: active.map((model) => model.id).sort(),
    printedRateOfAttackPerContributor: Number(profile.rateOfAttack),
    printedHitThreshold: Number(profile.hitThreshold),
    printedDamagePerConfirmedDie: Number(profile.damage),
    exactContributorsDependOnFutureEngagementAndCloseRanks: true,
  })).sort((left, right) => left.profileKey.localeCompare(right.profileKey));
  const movementProfile = strategicMovementProfile(state, target);
  const meleeRanks = currentMeleeRanks(state, target);
  const currentMeleeProfiles = meleeProfileRows.map((profile) => ({
    profileKey: profile.profileKey,
    weaponName: profile.weaponName,
    fightingModelIds: clone(meleeRanks.fightingModelIds),
    supportingModelIds: clone(meleeRanks.supportingModelIds),
    contributingModelIds: clone(meleeRanks.contributingModelIds),
    printedRateOfAttackPerContributor:
      profile.printedRateOfAttackPerContributor,
    printedHitDice: meleeRanks.contributingModelIds.length
      * profile.printedRateOfAttackPerContributor,
    printedHitThreshold: profile.printedHitThreshold,
    printedDamagePerConfirmedDie: profile.printedDamagePerConfirmedDie,
    contributionGeometryStatus: meleeRanks.status,
    contributionGeometryReason: meleeRanks.reason || null,
    engagementGraphHash: meleeRanks.engagementGraphHash || null,
    closeRanksFutureGeometryExcluded: true,
  }));
  return {
    unitId: target.id,
    movementProfile,
    movementCharacteristicInches:
      movementProfile?.currentPrintedInches ?? null,
    movementCharacteristicMayChangeAtSingleModelThreshold:
      Boolean(movementProfile
        && movementProfile.multiModelInches !== movementProfile.singleModelInches),
    formationEnvelopeBefore: formationEnvelopeForStrategicModels(active),
    models: active.map((model) => ({
      modelId: model.id,
      position: modelPositionForStrategy(model),
      wasLeadingModel: model.id === target.leadingModelId,
      assignedUpgradeNames: clone(
        target.assignedUpgradeByModelId?.[model.id] || []),
      rangedContributions: profileRows.filter((profile) =>
        profile.contributingModelIds.includes(model.id)).map((profile) => ({
        profileKey: profile.profileKey,
        weaponName: profile.weaponName,
        printedRateOfAttack: profile.printedRateOfAttackPerContributor,
        printedHitThreshold: profile.printedHitThreshold,
        printedDamagePerConfirmedDie:
          profile.printedDamagePerConfirmedDie,
      })),
      meleePotentialContributions: meleeProfileRows.map((profile) => ({
        profileKey: profile.profileKey,
        weaponName: profile.weaponName,
        exactContributionDependsOnFutureEngagementAndCloseRanks: true,
      })),
    })).sort((left, right) => left.modelId.localeCompare(right.modelId)),
    profileContributorsBefore: profileRows,
    meleePotentialContributorsBefore: meleeProfileRows,
    currentMeleeContributorsBefore: currentMeleeProfiles,
    markerControlUsesCurrentSupplyAndAtLeastOneEligibleModelWithinThreeInches:
      true,
    exactObjectiveControlRequiresFreshRulesProjection: true,
    rulesAuthority: true,
    trainingTruth: false,
  };
}

function strategicLossOption(pending, selection, state, prepared = null) {
  const context = pending.targetStrategicLossContext || { models: [] };
  const casualties = new Set(selection.casualtyModelIds || []);
  const lostModels = (context.models || []).filter((model) =>
    casualties.has(model.modelId));
  const remainingModels = (context.models || []).filter((model) =>
    !casualties.has(model.modelId));
  const profileLosses = (context.profileContributorsBefore || []).map((profile) => {
    const lostContributorModelIds = profile.contributingModelIds.filter((modelId) =>
      casualties.has(modelId));
    return {
      profileKey: profile.profileKey,
      weaponName: profile.weaponName,
      contributingModelCountBefore: profile.contributingModelIds.length,
      lostContributorModelIds,
      contributingModelCountAfter: profile.contributingModelIds.length
        - lostContributorModelIds.length,
      printedHitDiceBefore: profile.printedHitDiceBeforeModifiers,
      printedHitDiceAfter: (profile.contributingModelIds.length
        - lostContributorModelIds.length)
          * profile.printedRateOfAttackPerContributor,
      printedHitDiceLost: lostContributorModelIds.length
        * profile.printedRateOfAttackPerContributor,
      printedHitThreshold: profile.printedHitThreshold,
      printedDamagePerConfirmedDie: profile.printedDamagePerConfirmedDie,
      contributionCompletelyLost: lostContributorModelIds.length
        === profile.contributingModelIds.length,
      exactFutureDiceRequireFreshLegalSpace: true,
    };
  });
  const meleePotentialLosses = (
    context.meleePotentialContributorsBefore || []).map((profile) => {
    const lostPotentialContributorModelIds =
      profile.potentialContributingModelIds.filter((modelId) =>
        casualties.has(modelId));
    return {
      profileKey: profile.profileKey,
      weaponName: profile.weaponName,
      potentialContributingModelCountBefore:
        profile.potentialContributingModelIds.length,
      lostPotentialContributorModelIds,
      potentialContributingModelCountAfter:
        profile.potentialContributingModelIds.length
          - lostPotentialContributorModelIds.length,
      printedPotentialHitDiceLost: lostPotentialContributorModelIds.length
        * profile.printedRateOfAttackPerContributor,
      printedHitThreshold: profile.printedHitThreshold,
      printedDamagePerConfirmedDie: profile.printedDamagePerConfirmedDie,
      exactFutureDiceRequireEngagementAndFreshLegalSpace: true,
    };
  });
  const currentMeleeLosses = (
    context.currentMeleeContributorsBefore || []).map((profile) => {
    const lostContributorModelIds = profile.contributingModelIds.filter(
      (modelId) => casualties.has(modelId));
    return {
      ...clone(profile),
      lostContributorModelIds,
      contributingModelCountBefore: profile.contributingModelIds.length,
      contributingModelCountAfter: profile.contributingModelIds.length
        - lostContributorModelIds.length,
      printedHitDiceAfter: (profile.contributingModelIds.length
        - lostContributorModelIds.length)
          * profile.printedRateOfAttackPerContributor,
      printedHitDiceLost: lostContributorModelIds.length
        * profile.printedRateOfAttackPerContributor,
      exactForCurrentGeometry: profile.contributionGeometryStatus
        === "exact_current_geometry",
    };
  });
  const formationEnvelopeAfter = formationEnvelopeForStrategicModels(
    remainingModels.map((model) => ({
      id: model.modelId,
      xMilliInches: model.position?.xMilliInches,
      yMilliInches: model.position?.yMilliInches,
      baseRotationDegrees: model.position?.baseRotationDegrees,
    })),
  );
  const currentPrintedMovement = context.movementProfile
    ?.currentPrintedInches ?? null;
  const movementAfter = remainingModels.length === 0
    ? 0 : remainingModels.length === 1
      ? context.movementProfile?.singleModelInches ?? null
      : context.movementProfile?.multiModelInches ?? null;
  const postCasualtyState = casualtyProjectedState(
    state, pending.targetPieceId, selection.casualtyModelIds, Boolean(prepared));
  const tacticalMassBefore = prepared
    ? prepared.tacticalMassBefore(pending.targetPieceId)
    : tacticalMassProjection(state, pending.targetPieceId);
  const tacticalMassAfter = tacticalMassProjection(
    postCasualtyState, pending.targetPieceId);
  return {
    lostModels: clone(lostModels),
    remainingModelIds: remainingModels.map((model) => model.modelId),
    rangedContributionLosses: profileLosses,
    meleePotentialContributionLosses: meleePotentialLosses,
    currentMeleeContributionLosses: currentMeleeLosses,
    formationEnvelopeBefore: clone(context.formationEnvelopeBefore || null),
    formationEnvelopeAfter,
    formationReachChanged: JSON.stringify(context.formationEnvelopeBefore || null)
      !== JSON.stringify(formationEnvelopeAfter),
    printedMovementCharacteristicBeforeInches: currentPrintedMovement,
    printedMovementCharacteristicAfterInches: movementAfter,
    printedMovementCharacteristicDeltaInches:
      currentPrintedMovement === null || movementAfter === null
        ? null : movementAfter - currentPrintedMovement,
    movementCharacteristicChangedByCasualtySelection:
      currentPrintedMovement === null || movementAfter === null
        ? null : movementAfter !== currentPrintedMovement,
    movementModifiersRequireFreshLegalSpace: true,
    movementAndPlacementReachMustBeResolvedFromSurvivorFootprints: true,
    missionMarkerControlConsequences: missionMarkerControlConsequences(
      state, pending.targetPieceId, selection.casualtyModelIds, prepared,
      prepared ? postCasualtyState : null),
    tacticalMassConsequences: {
      before: tacticalMassBefore,
      after: tacticalMassAfter,
      changed: tacticalMassBefore.status === "exact_current_geometry"
        && tacticalMassAfter.status === "exact_current_geometry"
        ? tacticalMassBefore.tacticalMass !== tacticalMassAfter.tacticalMass
        : null,
    },
    exactObjectiveControlRequiresFreshRulesProjection: false,
  };
}

function destroyedSupplyVictoryPointRate(state) {
  const recordKey = state?.mission?.recordKey
    || state?.selectedMission?.profile?.recordKey;
  const mission = (state?.officialMissionEffectCatalogue?.missions || [])
    .find((entry) => entry.missionRef?.recordKey === recordKey);
  const rule = (mission?.scoring?.commonRules || []).find((entry) =>
    entry.kind === "destroyed_enemy_supply_vp");
  return rule ? Number(rule.vpPerDestroyedEnemySupply || 0) : null;
}

// Shared loss/selection projection; the caller supplies only its transport identity.
export function createOfficialSelectedRosterCasualtyChoiceContextV1(state, target) {
  return {
    currentSupplyBefore: Number(target.currentSupply),
    targetLeadingModelId: target.leadingModelId || null,
    targetSquadProfile: clone(getOfficialCombatProfileV1(
      state.officialCombatProfileBundle, target.officialUnitRecordKey).squadProfile || []),
    targetStrategicLossContext: strategicLossContext(state, target),
    destroyedSupplyVictoryPointRate: destroyedSupplyVictoryPointRate(state),
  };
}

export function createOfficialSelectedRosterCasualtyChoiceDomainV1(
  pending, state, owner,
) {
  return casualtyChoiceDomain(pending, state, owner);
}

function casualtyChoiceDomain(pending, state, owner = {}) {
  // Catalogue construction is also a casualty strategy batch. The original
  // query path shared immutable map/control facts, but enumeration and exact
  // instantiation rebuilt them for every selection (C9:306 choices). Keep all
  // original outcomes and stale-domain checks; only share private owned inputs.
  const snapshot = freezeDeep(clone(state));
  const prepared = createCasualtyStrategyContextFromOwnedState(snapshot);
  const explicitModelSelection = pending.casualtyDomain.selectionMode
    === "explicit_model_ids";
  const strategicSupplyAfter = (currentModels) =>
    Array.isArray(pending.targetSquadProfile)
      && pending.targetSquadProfile.length > 0
      ? exactCurrentSupply({ squadProfile: pending.targetSquadProfile },
        currentModels)
      : null;
  const supplyDelta = (currentSupplyAfter) =>
    pending.currentSupplyBefore === undefined
      || pending.currentSupplyBefore === null
      || currentSupplyAfter === null
      ? null : Number(pending.currentSupplyBefore) - currentSupplyAfter;
  const parameterSchema = explicitModelSelection ? {
    type: "object",
    required: ["casualtyModelIds"],
    casualtyModelIds: {
      type: "array",
      items: {
        enum: clone(
          pending.casualtyDomain.selectionContract.candidateModelIds,
        ),
      },
      minItems: pending.casualtyDomain.casualtyCount,
      maxItems: pending.casualtyDomain.casualtyCount,
      uniqueItems: true,
      orderedRemovalRequired:
        pending.casualtyDomain.selectionContract.orderedRemovalRequired,
    },
  } : {
    type: "object",
    required: ["casualtySelectionHash"],
    casualtySelectionHash: {
      enum: pending.casualtyDomain.legalSelections.map((entry) => (
        entry.selectionHash
      )),
    },
  };
  const explicitCurrentModelsAfter = Math.max(0,
    Number(pending.targetStrategicLossContext?.models?.length || 0)
      - Number(pending.casualtyDomain.casualtyCount || 0));
  const explicitCurrentSupplyAfter = strategicSupplyAfter(
    explicitCurrentModelsAfter);
  const explicitSupplyLost = supplyDelta(explicitCurrentSupplyAfter);
  const explicitMovementProfile =
    pending.targetStrategicLossContext?.movementProfile || null;
  const explicitMovementBefore =
    explicitMovementProfile?.currentPrintedInches ?? null;
  const explicitMovementAfter = explicitCurrentModelsAfter === 0
    ? 0 : explicitCurrentModelsAfter === 1
      ? explicitMovementProfile?.singleModelInches ?? null
      : explicitMovementProfile?.multiModelInches ?? null;
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: owner.parameterKind || OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND,
    actionType: owner.actionType || OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_ACTION_TYPE,
    sideKey: pending.defenderSideKey,
    phase: owner.phase || "assault",
    pieceId: pending.targetPieceId,
    executorId: owner.executorId || OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    executorVersion: owner.executorVersion || OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...(owner.ruleAtomIds || RULE_ATOM_IDS)],
    parameterSchema,
    constraints: {
      pendingHash: pending.pendingHash,
      attackerSideKey: pending.attackerSideKey,
      defenderSideKey: pending.defenderSideKey,
      attackerPieceId: pending.attackerPieceId,
      targetPieceId: pending.targetPieceId,
      casualtyDomainHash: pending.casualtyDomainHash,
      casualtyCount: pending.casualtyDomain.casualtyCount,
      selectionMode: pending.casualtyDomain.selectionMode
        || "enumerated_hashes",
      selectionContract: clone(
        pending.casualtyDomain.selectionContract || null,
      ),
      legalSelectionCount: pending.casualtyDomain.legalSelectionCount
        ?? pending.casualtyDomain.legalSelections.length,
      materializedSelectionCount:
        pending.casualtyDomain.legalSelections.length,
      legalSelections: clone(pending.casualtyDomain.legalSelections),
      strategicLossOptions: pending.casualtyDomain.legalSelections.map(
        (selection) => {
          const currentSupplyAfter = strategicSupplyAfter(
            selection.remainingModelIds.length);
          const supplyLost = supplyDelta(currentSupplyAfter);
          return {
            ...strategicLossOption(pending, selection, snapshot, prepared),
            selectionHash: selection.selectionHash,
            casualtyModelIds: clone(selection.casualtyModelIds),
            remainingModelIds: clone(selection.remainingModelIds),
            currentModelsAfter: selection.remainingModelIds.length,
            currentSupplyBefore: pending.currentSupplyBefore ?? null,
            currentSupplyAfter,
            supplyLost,
            availableSupplyFreed: supplyLost,
            missionMarkerControlSupplyContributionBefore:
              pending.currentSupplyBefore ?? null,
            missionMarkerControlSupplyContributionAfter: currentSupplyAfter,
            missionMarkerControlSupplyContributionLost: supplyLost,
            mayStillControlUncontestedMarkerAtSupplyZero:
              selection.remainingModelIds.length > 0
                && currentSupplyAfter === 0,
            attackerVictoryPointsFromSupplyLoss:
              pending.destroyedSupplyVictoryPointRate === null
                || supplyLost === null ? null
                : supplyLost * pending.destroyedSupplyVictoryPointRate,
            supplyControlStrengthChanged:
              supplyLost === null ? null : supplyLost !== 0,
            leadingModelRemoved:
              selection.casualtyModelIds.includes(pending.targetLeadingModelId),
            lostPotentialModelContributors: clone(selection.casualtyModelIds),
            futureAttackDiceRequireFreshLegalSpace: true,
            formationReachAndContactCoverageMustBeRecomputed: true,
            objectiveInteractionMustBeRecomputed: true,
            rulesAuthority: true,
            trainingTruth: false,
          };
        }),
      explicitSelectionStrategicContract: explicitModelSelection ? {
        casualtyCount: pending.casualtyDomain.casualtyCount,
        candidateModelIds: clone(
          pending.casualtyDomain.selectionContract.candidateModelIds),
        candidateLossModels: clone((pending.targetStrategicLossContext?.models || [])
          .filter((model) => pending.casualtyDomain.selectionContract
            .candidateModelIds.includes(model.modelId))),
        currentModelsAfter: explicitCurrentModelsAfter,
        currentSupplyBefore: pending.currentSupplyBefore ?? null,
        currentSupplyAfter: explicitCurrentSupplyAfter,
        supplyLost: explicitSupplyLost,
        availableSupplyFreed: explicitSupplyLost,
        missionMarkerControlSupplyContributionBefore:
          pending.currentSupplyBefore ?? null,
        missionMarkerControlSupplyContributionAfter:
          explicitCurrentSupplyAfter,
        missionMarkerControlSupplyContributionLost: explicitSupplyLost,
        mayStillControlUncontestedMarkerAtSupplyZero:
          explicitCurrentModelsAfter > 0 && explicitCurrentSupplyAfter === 0,
        printedMovementCharacteristicBeforeInches: explicitMovementBefore,
        printedMovementCharacteristicAfterInches: explicitMovementAfter,
        printedMovementCharacteristicDeltaInches:
          explicitMovementBefore === null || explicitMovementAfter === null
            ? null : explicitMovementAfter - explicitMovementBefore,
        movementCharacteristicChangedByCasualtySelection:
          explicitMovementBefore === null || explicitMovementAfter === null
            ? null : explicitMovementAfter !== explicitMovementBefore,
        movementModifiersRequireFreshLegalSpace: true,
        profileContributorsBefore: clone(
          pending.targetStrategicLossContext?.profileContributorsBefore || []),
        meleePotentialContributorsBefore: clone(
          pending.targetStrategicLossContext
            ?.meleePotentialContributorsBefore || []),
        exactLossListKnownAfterDefenderSelection: true,
        futureAttackDiceRequireFreshLegalSpace: true,
        formationReachAndContactCoverageMustBeRecomputed: true,
        objectiveInteractionMustBeRecomputed: true,
        rulesAuthority: true,
        trainingTruth: false,
      } : null,
      defenderOwnsSelection: true,
    },
    confirmationClass: "explicit_human",
    searchAndStrategyExcludedFromAuthority: true,
    rulesTruth: owner.rulesTruth || "official_defender_owned_ranged_casualty_selection",
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    domainId: `sc-domain-${hashStarcraftTmgContract(body)}` });
}
function verifyRuntimeState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces) || state.pieces.length < 1) {
    fail("SELECTED_RANGED_STATE_SCOPE_INVALID");
  }
  verifyOfficialAttackProfileCatalogueV1(state.officialAttackProfileCatalogue);
  verifyOfficialCombatProfileBundleV1(state.officialCombatProfileBundle);
  verifyOfficialTerrainLosDataBundleV1(state.officialTerrainLosDataBundle);
  hasOfficialIndomitableRangedPolicyV1(state);
  hasOfficialModeBoundRangedTargetPolicyV1(state);
  hasOfficialCoordinatedStrikeCurrentConsumerV1(state);
  const runtimeHash = state.officialMissionRuntimeDescriptor?.runtimeHash;
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round), rulesRuntimeHash: runtimeHash,
  });
  for (const piece of state.pieces) {
    if (!state.officialAttackProfileCatalogue.unitRecordKeys
      .includes(piece.officialUnitRecordKey)
      || !state.officialCombatProfileBundle.profilesByRecordKey?.[piece.officialUnitRecordKey]
      || !Array.isArray(piece.models)
      || (activePiece(piece) && activeModels(piece).length !== Number(piece.currentModels))) {
      fail("SELECTED_RANGED_MODEL_DENOMINATOR_INVALID", piece.id);
    }
  }
}
function replacementWeaponNames(state, piece, phase = "assault") {
  const catalogue = state.officialAttackProfileCatalogue;
  const replacementNames = new Set(catalogue.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey && profile.phase === phase
      && profile.linkedTo !== "-"
  )).map((profile) => profile.weaponName));
  return (piece.selectedUpgradeNames || []).filter((name) => replacementNames.has(name));
}
function normalizedName(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function effectById(profile, effectAtomId) {
  return profile.declarationWeaponEffects?.effects.find(entry => entry.effectAtomId === effectAtomId)
    || profile.effects.find((entry) => entry.effectAtomId === effectAtomId) || null;
}
function profileRuleAtomIds(profile, state) {
  const atoms = effectById(profile, 'attack-effect:concentrated-fire-v1')
    ? [...RULE_ATOM_IDS, 'rule-atom:singleton:core-11-concentrated-fire-casualty-cap:3753f38b416e'].sort()
    : [...RULE_ATOM_IDS];
  const boundAtoms = state && hasOfficialIndomitableRangedPolicyV1(state)
    ? [...atoms, OFFICIAL_INDOMITABLE_RANGED_POLICY_V1.ruleAtomId].sort() : atoms;
  return state && hasOfficialModeBoundRangedTargetPolicyV1(state)
    ? [...boundAtoms, OFFICIAL_MODE_BOUND_RANGED_TARGET_POLICY_V1.ruleAtomId].sort() : boundAtoms;
}
function selectedUpgradeFor(piece, profile) {
  return (piece.selectedUpgrades || []).find((entry) => normalizedName(
    entry.upgradeName || entry.name) === normalizedName(profile.weaponName)) || null;
}
function specialistModelIds(piece, profile) {
  if (!effectById(profile, "attack-effect:specialist-v1")) return [];
  const selected = selectedUpgradeFor(piece, profile);
  const nominated = String(selected?.nominatedModelId || "");
  if (nominated) return [nominated];
  return Object.entries(piece.assignedUpgradeByModelId || {}).filter(([, names]) => (
    (names || []).map(normalizedName).includes(normalizedName(profile.weaponName))
  )).map(([modelId]) => modelId).sort();
}
function contributingModelIdsFor(state, piece, profile, { activeOnly = true } = {}) {
  const modelIds = (activeOnly ? activeModels(piece) : piece.models.filter((model) => (
    model.isDestroyed !== true
  ))).map((model) => model.id);
  const specialist = specialistModelIds(piece, profile).filter((id) => modelIds.includes(id));
  if (effectById(profile, "attack-effect:specialist-v1")) return specialist;
  const replacements = state.officialAttackProfileCatalogue.profiles.filter((entry) => (
    entry.recordKey === piece.officialUnitRecordKey && entry.phase === "assault"
      && isOfficialRosterAttackProfileFieldedV1(state, piece, entry)
      && normalizedName(entry.linkedTo) === normalizedName(profile.weaponName)
  ));
  if (replacements.some((entry) => !effectById(entry, "attack-effect:specialist-v1"))) {
    return [];
  }
  const excluded = new Set(replacements.flatMap((entry) => specialistModelIds(piece, entry)));
  return modelIds.filter((id) => !excluded.has(id));
}
function loadoutFor(state, piece, { activeOnly = true } = {}) {
  const profiles = state.officialAttackProfileCatalogue.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey && profile.phase === "assault"
      && isOfficialRosterAttackProfileFieldedV1(state, piece, profile)
      && contributingModelIdsFor(state, piece, profile, { activeOnly }).length > 0
  ));
  if (profiles.length === 0) return null;
  return seal({
    schema: "starcraft_tmg_official_current_product_ranged_loadout_v1",
    pieceId: piece.id,
    recordKey: piece.officialUnitRecordKey,
    phase: "assault",
    selectedWeaponUpgradeNames: replacementWeaponNames(state, piece),
    profileGroups: profiles.map((profile) => ({
      profileKey: profile.profileKey,
      profileHash: profile.profileHash,
      contributingModelIds: contributingModelIdsFor(
        state, piece, profile, { activeOnly }).sort(),
      sidearm: Boolean(effectById(profile, "attack-effect:sidearm-v1")),
      specialist: Boolean(effectById(profile, "attack-effect:specialist-v1")),
    })).sort((left, right) => left.profileKey.localeCompare(right.profileKey)),
    rulesTruth: "official_current_product_model_weapon_loadout_projection",
    trainingTruth: false,
  }, "loadoutHash");
}
function activeProfilesFor(state, piece, options = {}) {
  const phaseProfiles = state.officialAttackProfileCatalogue.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey && profile.phase === "assault"
  ));
  if (phaseProfiles.length === 0) return { loadout: null, profiles: [] };
  const loadout = loadoutFor(state, piece, options);
  if (!loadout) return { loadout: null, profiles: [] };
  return { loadout, profiles: loadout.profileGroups.map((group) => (
    getOfficialAttackProfileV1(state.officialAttackProfileCatalogue, group.profileKey)
  )).map(profile => projectOfficialRangedDeclarationProfileV1(state, piece.id, profile))
    .filter((profile) => profile.range.kind === "inches"
    && isOfficialSiegeModeWeaponEligibleV1(state, piece, profile.weaponName)) };
}

export function projectOfficialSelectedRosterRangedContributionV1(
  state, pieceId,
) {
  const firepower = projectOfficialSelectedRosterRangedFirepowerV1(
    state, pieceId,
  );
  const piece = (state?.pieces || []).find((entry) => entry.id === pieceId);
  const context = strategicLossContext(state, piece);
  return freezeDeep({
    schemaVersion:
      "starcraft_tmg_official_selected_roster_ranged_contribution_v1",
    pieceId,
    profiles: clone(firepower.profiles),
    models: clone(context.models),
    formationEnvelopeBefore: clone(context.formationEnvelopeBefore),
    movementProfile: clone(context.movementProfile),
    meleePotentialProfiles: clone(
      context.meleePotentialContributorsBefore || []),
    currentMeleeProfiles: clone(
      context.currentMeleeContributorsBefore || []),
    exactFutureDiceRequireFreshLegalSpace: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

export function projectOfficialSelectedRosterRangedFirepowerV1(
  state, pieceId,
) {
  const piece = (state?.pieces || []).find((entry) => entry.id === pieceId);
  if (!piece) fail("SELECTED_RANGED_CONTRIBUTION_PIECE_UNKNOWN", pieceId);
  const { profiles } = activeProfilesFor(state, piece, { activeOnly: true });
  return freezeDeep({
    schemaVersion:
      "starcraft_tmg_official_selected_roster_ranged_firepower_v1",
    pieceId,
    profiles: profiles.map((profile) => ({
      profileKey: profile.profileKey,
      weaponName: profile.weaponName,
      contributingModelIds: contributingModelIdsFor(
        state, piece, profile, { activeOnly: true }).sort(),
      printedRateOfAttackPerContributor: Number(profile.rateOfAttack),
      printedHitThreshold: Number(profile.hitThreshold),
      printedDamagePerConfirmedDie: Number(profile.damage),
      surge: clone(profile.surge || null),
    })).sort((left, right) => left.profileKey.localeCompare(right.profileKey)),
    exactCurrentContributors: true,
    futureLegalSpaceStillRequired: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

export function projectOfficialSelectedRosterCasualtyStrategyV1(
  state, pieceId, casualtyModelIds,
) {
  return projectCasualtyStrategy(state, pieceId, casualtyModelIds);
}

function projectCasualtyStrategy(state, pieceId, casualtyModelIds, prepared = null) {
  const target = (state?.pieces || []).find((entry) => entry.id === pieceId);
  if (!target) fail("SELECTED_RANGED_CONTRIBUTION_PIECE_UNKNOWN", pieceId);
  const casualties = [...new Set((casualtyModelIds || []).map(String))].sort();
  const currentIds = activeModels(target).map((model) => model.id).sort();
  if (casualties.some((modelId) => !currentIds.includes(modelId))) {
    fail("SELECTED_RANGED_CASUALTY_MODEL_UNKNOWN", casualties.join("|"));
  }
  const key = JSON.stringify([pieceId, casualties]);
  if (prepared?.strategies.has(key)) return prepared.strategies.get(key);
  const result = freezeDeep({
    schemaVersion:
      "starcraft_tmg_official_selected_roster_casualty_strategy_v1",
    pieceId,
    casualtyModelIds: casualties,
    ...strategicLossOption({
      targetPieceId: pieceId,
      targetStrategicLossContext: prepared ? prepared.lossContext(target)
        : strategicLossContext(state, target),
    }, {
      casualtyModelIds: casualties,
      remainingModelIds: currentIds.filter((modelId) =>
        !casualties.includes(modelId)),
    }, state, prepared),
    rulesAuthority: true,
    trainingTruth: false,
  });
  prepared?.strategies.set(key, result);
  return result;
}

// Private immutable query ownership is essential: no caller-supplied prepared
// facts, cross-revision cache, mutable Room reference or weapon outcome is trusted.
// Every new loss still gets its full post-casualty geometry/control projection.
export function createOfficialSelectedRosterCasualtyStrategyBatchV1(state) {
  const snapshot = freezeDeep(clone(state));
  return createCasualtyStrategyBatchFromOwnedState(snapshot);
}

function createCasualtyStrategyContextFromOwnedState(snapshot) {
  const lossContexts = new Map();
  const tacticalMass = new Map();
  let beforeControl;
  let controlBatch;
  const prepared = {
    strategies: new Map(),
    lossContext(target) {
      if (!lossContexts.has(target.id)) {
        lossContexts.set(target.id, freezeDeep(strategicLossContext(snapshot, target)));
      }
      return lossContexts.get(target.id);
    },
    missionControlBefore() {
      if (beforeControl === undefined) {
        beforeControl = freezeDeep(prepared.missionControl(snapshot));
      }
      return beforeControl;
    },
    missionControl(state) {
      controlBatch ||= createOfficialMissionMarkerControlUnitBatchV2({
        state: { ...snapshot, phase: "cleanup" },
        terrainLosDataBundle: snapshot.officialTerrainLosDataBundle,
        matchBinding: { rulesRuntimeBinding: {
          runtimeHash: snapshot.officialMissionRuntimeDescriptor?.runtimeHash,
        } },
      });
      return projectMissionMarkerControl(state, true, controlBatch);
    },
    tacticalMassBefore(pieceId) {
      if (!tacticalMass.has(pieceId)) {
        tacticalMass.set(pieceId, freezeDeep(tacticalMassProjection(snapshot, pieceId)));
      }
      return tacticalMass.get(pieceId);
    },
  };
  return prepared;
}

function createCasualtyStrategyBatchFromOwnedState(snapshot) {
  const prepared = createCasualtyStrategyContextFromOwnedState(snapshot);
  return Object.freeze({
    project(pieceId, casualtyModelIds) {
      return projectCasualtyStrategy(snapshot, pieceId, casualtyModelIds, prepared);
    },
  });
}
function profilesAllowedByPending(state, piece, profiles) {
  const pending = pendingSequence(state);
  if (!pending) return profiles;
  if (pending.pieceId !== piece.id) return [];
  const ordinaryUsed = new Set(pending.ordinaryModelIdsUsed);
  return profiles.filter((profile) => {
    if (pending.usedProfileKeys.includes(profile.profileKey)) return false;
    if (effectById(profile, "attack-effect:sidearm-v1")) return true;
    return contributingModelIdsFor(state, piece, profile).some((id) => (
      !ordinaryUsed.has(id)));
  });
}
function graphHasUnitPair(graph, leftUnitId, rightUnitId) {
  return graph.modelEdges.some((edge) => (
    edge.leftUnitId === leftUnitId && edge.rightUnitId === rightUnitId
      || edge.leftUnitId === rightUnitId && edge.rightUnitId === leftUnitId
  ));
}
function indomitableCrossEngagementFor(state, piece, target, attackerEngaged, targetEngaged) {
  if (!hasOfficialIndomitableRangedPolicyV1(state) || attackerEngaged === targetEngaged) return undefined;
  const sourcePiece = attackerEngaged ? piece : target;
  const modifiers = projectOfficialCharacteristicStatusFamilyModifiersV1(
    state.officialCharacteristicStatusFamilySourceBundle, state,
    { pieceId: sourcePiece.id, context: { attackKind: 'ranged', targetPieceId: target.id, attackerPieceId: piece.id } });
  if (!modifiers.crossEngagementTargetingAllowed) return undefined;
  const sourceRoute = state.officialCharacteristicStatusFamilySourceBundle.routes.find(row =>
    row.recordKey === sourcePiece.officialUnitRecordKey && row.effectKind === 'indomitable');
  return { sourcePieceId: sourcePiece.id, sourceDefinitionId: sourceRoute.definitionId,
    direction: attackerEngaged ? 'engaged_source_attacks_unengaged_enemy' : 'unengaged_enemy_attacks_engaged_source',
    defenderGainsEvadeEligibility: modifiers.crossEngagementDefenderEvadeEligible };
}

function assertAssaultContext(state, sideKey, piece, target, graph, profile, probe) {
  const grant = readOfficialOverwatchAttackGrantV1(state);
  const granted = grant?.sourcePieceId === piece?.id && grant.targetPieceId === target?.id
    && grant.profileKey === profile?.profileKey;
  const probing = OVERWATCH_PROBES.has(probe) && probe.pieceId === piece?.id
    && probe.targetId === target?.id && profile?.profileKey === probe.profileKey;
  if (grant && !granted && !probing) {
    fail('SELECTED_RANGED_OVERWATCH_SCOPE_PROHIBITED', String(piece?.id || ''));
  }
  if (probing) phaseReady({ ...state, activeSideKey: sideKey }, sideKey, true);
  else phaseReady(state, sideKey, granted);
  const pending = pendingSequence(state);
  if (pending && (pending.sideKey !== sideKey || pending.pieceId !== piece?.id
    || pending.usedProfileKeys.includes(profile?.profileKey))) {
    fail("SELECTED_RANGED_PENDING_SEQUENCE_ROUTE_INVALID", String(piece?.id || ""));
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("SELECTED_RANGED_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (isOfficialBurrowedCoreActorV1(state, piece)) fail("SELECTED_RANGED_BURROWED_ATTACK_PROHIBITED", piece.id);
  if (piece.isStructure === true && !granted && !probing) {
    fail("SELECTED_RANGED_STRUCTURE_CANNOT_PERFORM_ACTIONS", piece.id);
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("SELECTED_RANGED_TARGET_UNAVAILABLE", String(target?.id || ""));
  }
  const targetTags = new Set([target.combatTag, ...(target.combatTags || [])]
    .map(normalizedName).filter(Boolean));
  const normalizedTargetTags = (profile?.targetTags || []).map(normalizedName);
  if (!normalizedTargetTags.includes("all")
    && !normalizedTargetTags.some((tag) => targetTags.has(tag))) {
    fail("SELECTED_RANGED_TARGET_TAG_PROHIBITED", target.id);
  }
  if (piece.activatedPhases?.assault === true && !granted && !probing) {
    fail("SELECTED_RANGED_UNIT_ALREADY_ACTIVATED", piece.id);
  }
  if (!granted && !probing) assertOfficialSelectedRosterCoreActionWindowV1(
    state, sideKey, piece.id, "assault");
  const restriction = piece.disengageAssaultRestriction;
  if (restriction?.rangedAttackProhibited === true) {
    fail("SELECTED_RANGED_POST_DISENGAGE_PROHIBITED", piece.id);
  }
  const attackerEngaged = graph.engagedUnitIds.includes(piece.id);
  const targetEngaged = graph.engagedUnitIds.includes(target.id);
  const mutuallyEngaged = graphHasUnitPair(graph, piece.id, target.id);
  const pinpoint = Boolean(effectById(profile, "attack-effect:pinpoint-v1"));
  const pinpointEngagementOverride = pinpoint && targetEngaged
    && (!attackerEngaged || Boolean(profile.declarationWeaponEffects) || hasOfficialPinpointEngagementPolicyV1(state));
  if (hasOfficialModeBoundRangedTargetPolicyV1(state) && mutuallyEngaged
    && projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id }).prohibitsRangedTargetingEngagedEnemies) {
    fail('SELECTED_RANGED_POINT_BLANK_ENGAGED_TARGET_PROHIBITED', target.id);
  }
  const indomitableCrossEngagement = indomitableCrossEngagementFor(state, piece, target, attackerEngaged, targetEngaged);
  if ((!attackerEngaged && targetEngaged && !pinpointEngagementOverride && !indomitableCrossEngagement)
    || (attackerEngaged && !mutuallyEngaged && !pinpointEngagementOverride && !indomitableCrossEngagement)) {
    fail("SELECTED_RANGED_ENGAGEMENT_TARGET_PROHIBITED", target.id);
  }
  return { attackerEngaged, targetEngaged, mutuallyEngaged,
    pinpointTargetOverrideApplied: pinpointEngagementOverride,
    ...(indomitableCrossEngagement ? { indomitableCrossEngagement } : {}) };
}

function lineOfSightFor(state, attacker, attackerModel, target, targetModel,
  adapted = terrainAsOrdinaryForLos(state), preparedResult = null) {
  const result = preparedResult || evaluateOfficialElevatedLineOfSightV1({
    state: adapted.projected, attacker, attackerModelId: attackerModel.id,
    target, targetModelId: targetModel.id,
    dataBundle: state.officialTerrainLosDataBundle,
  });
  const body = {
    schemaVersion: "starcraft_tmg_selected_roster_ranged_los_v1",
    result, elevatedLineOfSightResultHash: result.resultHash,
    grassTerrainIds: adapted.grassTerrainIds,
    grassAdaptedToOrdinarySizeTwoCoverRules: adapted.grassTerrainIds.length > 0,
    visible: result.visible,
    highGroundEvadeEligible: result.highGroundEvadeEligible,
    blockingTerrainIds: result.blockingTerrainIds,
    sourceRefreshPerformed: false,
    rulesTruth: "official_elevated_los_with_grass_cover_adapter",
    trainingTruth: false,
  };
  const nativeResultText = canonicalNativeOfficialElevatedLosResultV1(result);
  if (nativeResultText === null) return seal(body, "lineOfSightHash");
  // The complete result has already been canonically serialized by its owning
  // kernel. Only that exact immutable object's private bytes can be reused;
  // foreign/dynamic/prepared values remain on the original generic path.
  const fields = Object.keys(body).sort().map(key => `${JSON.stringify(key)}:${
    key === "result" ? nativeResultText : canonicalStarcraftTmgJson(body[key])}`);
  const bodyCharacters = 2 + Math.max(0, fields.length - 1)
    + fields.reduce((total, value) => total + value.length, 0);
  if (bodyCharacters > bufferConstants.MAX_STRING_LENGTH) throw new RangeError("Invalid string length");
  const digest = createHash(STARCRAFT_TMG_HASH_ALGORITHM).update("{");
  let separator = "";
  for (const text of fields) {
    digest.update(separator).update(text);
    separator = ",";
  }
  return freezeDeep({ ...body, lineOfSightHash: digest.update("}").digest("hex") });
}
function baseGapInches(state, leftPiece, leftModel, rightPiece, rightModel) {
  const relation = evaluateOfficialPhysicalFootprintRelationV1({
    left: createOfficialModelBaseFootprintV1({
      piece: leftPiece,
      model: leftModel,
      dataBundle: state.officialModelBaseGeometryDataBundle,
    }),
    right: createOfficialModelBaseFootprintV1({
      piece: rightPiece,
      model: rightModel,
      dataBundle: state.officialModelBaseGeometryDataBundle,
    }),
  });
  return Number((relation.minimumSeparationMilliInches / 1000).toFixed(3));
}
function createEnumerationPhysicalGeometryBatch(state) {
  // Private to ONE synchronous enumeration. Ordered piece AND model references
  // identify a physical pair; public IDs are not a cache key across snapshots.
  // Retain only the small fields candidateGeometry actually consumes, not the
  // full per-terrain assessment body that is already bound by lineOfSightHash.
  let adapted = null;
  let elevatedGeometry = null;
  const byPiece = new WeakMap();
  function adaptedTerrain() {
    return adapted ||= terrainAsOrdinaryForLos(state);
  }
  function elevatedGeometryBatch() {
    return elevatedGeometry ||= createOfficialElevatedLineOfSightBatchV1({
      state: adaptedTerrain().projected,
      dataBundle: state.officialTerrainLosDataBundle,
    });
  }
  function pairCache(piece, attackerModel, target) {
    let byModel = byPiece.get(piece);
    if (!byModel) byPiece.set(piece, byModel = new WeakMap());
    let byTarget = byModel.get(attackerModel);
    if (!byTarget) byModel.set(attackerModel, byTarget = new WeakMap());
    let byTargetModel = byTarget.get(target);
    if (!byTargetModel) byTarget.set(target, byTargetModel = new WeakMap());
    return byTargetModel;
  }
  function distancesFor(piece, target, modelPairs) {
    return modelPairs.map(({ attackerModel, targetModel }) => {
      const cache = pairCache(piece, attackerModel, target);
      if (!cache.has(targetModel)) cache.set(targetModel, freezeDeep({
        distanceInches: baseGapInches(state, piece, attackerModel, target, targetModel),
      }));
      return cache.get(targetModel).distanceInches;
    });
  }
  function verifyPairs(piece, target, modelPairs) {
    const missing = modelPairs.filter(({ attackerModel, targetModel }) => (
      !pairCache(piece, attackerModel, target).get(targetModel)?.inputsValidated
    ));
    if (missing.length === 0) return;
    elevatedGeometryBatch().verifyInputs(
      missing.map(({ attackerModel, targetModel }) => ({
        attacker: piece, attackerModelId: attackerModel.id,
        target, targetModelId: targetModel.id })));
    for (const { attackerModel, targetModel } of missing) {
      const cache = pairCache(piece, attackerModel, target);
      cache.set(targetModel, freezeDeep({ ...cache.get(targetModel), inputsValidated: true }));
    }
  }
  function forPairs(piece, target, modelPairs) {
    const terrain = adaptedTerrain();
    const missing = [];
    const scheduled = new Map();
    for (const { attackerModel, targetModel } of modelPairs) {
      const cache = pairCache(piece, attackerModel, target);
      if (cache.get(targetModel)?.lineOfSightHash) continue;
      let models = scheduled.get(cache);
      if (!models) scheduled.set(cache, models = new Set());
      if (!models.has(targetModel)) {
        models.add(targetModel);
        missing.push({ attackerModel, targetModel, cache });
      }
    }
    const rows = missing.length === 0 ? []
      : elevatedGeometryBatch().project(
        missing.map(({ attackerModel, targetModel }) => ({
          attacker: piece, attackerModelId: attackerModel.id,
          target, targetModelId: targetModel.id })), (result, index) => {
          const { attackerModel, targetModel, cache } = missing[index];
          const los = lineOfSightFor(
            state, piece, attackerModel, target, targetModel, terrain, result,
          );
          return freezeDeep({
            distanceInches: cache.get(targetModel)?.distanceInches
              ?? baseGapInches(state, piece, attackerModel, target, targetModel),
            visible: los.visible, highGroundEvadeEligible: los.highGroundEvadeEligible,
            lineOfSightHash: los.lineOfSightHash, blockingTerrainIds: los.blockingTerrainIds,
            inputsValidated: true,
          });
        });
    // Publish only after all pairs succeed: a later native failure must not
    // leave a partially accepted visibility batch in the private pair cache.
    for (const [index, { targetModel, cache }] of missing.entries()) {
      cache.set(targetModel, rows[index]);
    }
    return modelPairs.map(({ attackerModel, targetModel }) => (
      pairCache(piece, attackerModel, target).get(targetModel)
    ));
  }
  return { adaptedTerrain, distancesFor, verifyPairs, forPairs };
}
function maximumRangeFor(profile, characteristicModifiers, rangedModifiers) {
  const printedNormal = Number(profile.range.normalRangeInches);
  const rangeModifier = Number(characteristicModifiers.rangeModifier || 0);
  const normalRangeInches = Math.max(0, printedNormal + rangeModifier);
  const printedLong = Number(effectById(
    profile, "attack-effect:long-range-v1")?.parameters?.maximumRangeInches || 0);
  const grantedLong = Number(rangedModifiers.longRangeMaximumInches || 0);
  const maximumRangeInches = characteristicModifiers.longRangeAllowed === false
    ? normalRangeInches
    : Math.max(normalRangeInches, printedLong, grantedLong);
  return { printedNormalRangeInches: printedNormal, normalRangeInches,
    maximumRangeInches, rangeModifier,
    longRangeSuppressed: characteristicModifiers.longRangeAllowed === false };
}
function candidateGeometry(state, piece, target, profile, characteristicModifiers,
  rangedModifiers, physicalGeometry = null, actingOrigin = null, bombard = null) {
  const pairs = [];
  const measuringPiece = actingOrigin?.piece || piece;
  const firingModelId = actingOrigin ? activeModels(piece)[0]?.id : null;
  const adapted = physicalGeometry?.adaptedTerrain() || terrainAsOrdinaryForLos(state);
  const ranges = actingOrigin ? { printedNormalRangeInches: profile.range.normalRangeInches,
    normalRangeInches: actingOrigin.rangeMilliInches / 1000, maximumRangeInches: actingOrigin.rangeMilliInches / 1000,
    rangeModifier: 0, longRangeSuppressed: true } : maximumRangeFor(profile, characteristicModifiers, rangedModifiers);
  const indirectFire = !actingOrigin && Boolean(effectById(profile, "attack-effect:indirect-fire-v1"));
  const hiddenTarget = !bombard && hasOfficialHiddenRangedAndEvadePolicyV1(state) && statusNamed(target, 'hidden')
    && !projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle,
      state, { pieceId: target.id, context: { attackerPieceId: piece.id, targetPieceId: target.id, attackKind: 'ranged' } }).hiddenSuppressedByDetection;
  const contributingModelIds = new Set(contributingModelIdsFor(state, piece, profile));
  const measuringModels = actingOrigin ? [actingOrigin.model]
    : activeModels(piece).filter(entry => contributingModelIds.has(entry.id));
  const modelPairs = measuringModels.flatMap((attackerModel) => activeModels(target).map((targetModel) => (
    { attackerModel, targetModel }
  )));
  if (!bombard && physicalGeometry && modelPairs.length > 0
    && physicalGeometry.distancesFor(piece, target, modelPairs)
      .every((distance) => distance > ranges.maximumRangeInches)) {
    // A necessary condition is false for EVERY contributing physical model
    // pair. Validate original inputs, then retain the original rejection;
    // no positive visibility/cover/attack fact is inferred from this shortcut.
    physicalGeometry.verifyPairs(piece, target, modelPairs);
    fail("SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE", target.id);
  }
  const physicalPairs = physicalGeometry?.forPairs(piece, target, modelPairs);
  const bombardAssessments = new Map((bombard?.measurement.assessments || []).map(row => [row.modelId, row]));
  const losResults = (physicalPairs || modelPairs.length === 0) ? []
    : evaluateOfficialElevatedLineOfSightBatchV1({ state: adapted.projected,
      dataBundle: state.officialTerrainLosDataBundle,
      queries: modelPairs.map(({ attackerModel, targetModel }) => ({
        attacker: measuringPiece, attackerModelId: attackerModel.id,
        target, targetModelId: targetModel.id })) });
  for (const [index, { attackerModel, targetModel }] of modelPairs.entries()) {
    const lineOfSight = physicalPairs?.[index] || lineOfSightFor(
      state, measuringPiece, attackerModel, target, targetModel, adapted, losResults[index],
    );
    const distanceInches = physicalPairs?.[index].distanceInches ?? baseGapInches(
      state, measuringPiece, attackerModel, target, targetModel,
    );
    pairs.push({ attackerModelId: firingModelId || attackerModel.id, targetModelId: targetModel.id,
      ...(actingOrigin ? { actingUnitId: measuringPiece.id, actingModelId: attackerModel.id } : {}),
      distanceInches, withinMaximumRange: bombard ? bombardAssessments.get(targetModel.id).within
        : distanceInches <= ranges.maximumRangeInches && (!hiddenTarget || distanceInches <= 4),
      rangeBand: bombard || distanceInches <= ranges.normalRangeInches ? "normal" : "extended",
      visible: lineOfSight.visible, highGroundEvadeEligible:
        lineOfSight.highGroundEvadeEligible,
      lineOfSightHash: lineOfSight.lineOfSightHash,
      blockingTerrainIds: lineOfSight.blockingTerrainIds });
  }
  const eligiblePairs = pairs.filter((pair) => (pair.visible || indirectFire || bombard)
    && pair.withinMaximumRange);
  const eligibleAttackerModelIds = [...new Set(eligiblePairs.map((pair) => (
    pair.attackerModelId
  )))].sort();
  const visibleTargetModelIds = [...new Set(eligiblePairs.map((pair) => (
    pair.targetModelId
  )))].sort();
  if (eligibleAttackerModelIds.length === 0 || visibleTargetModelIds.length === 0) {
    fail("SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE", target.id);
  }
  const modelAttackRows = eligibleAttackerModelIds.map((modelId) => {
    const row = eligiblePairs.filter((pair) => pair.attackerModelId === modelId)
      .sort((left, right) => left.distanceInches - right.distanceInches)[0];
    return { attackerModelId: modelId, targetModelId: row.targetModelId,
      distanceInches: row.distanceInches, rangeBand: row.rangeBand,
      targetVisible: row.visible, indirectLineOfSightIgnored: !row.visible && indirectFire,
      ...(bombard ? { bombardLineOfSightIgnored: !row.visible } : {}) };
  });
  const distanceInches = Math.max(...modelAttackRows.map((entry) => entry.distanceInches));
  return freezeDeep({ pairs, eligibleAttackerModelIds, visibleTargetModelIds,
    modelAttackRows, distanceInches, ...ranges,
    indirectFire, ...(hiddenTarget ? { hiddenTargetingRangeInches: 4 } : {}),
    ...(bombard ? { bombard: clone(bombard) } : {}),
    ...(actingOrigin ? { coordinatedStrikeOrigin: { unitId: actingOrigin.unitId, modelId: actingOrigin.modelId,
      sourcePieceId: piece.id, sourceDefinitionId: actingOrigin.sourceDefinitionId,
      sourceEffectHash: actingOrigin.sourceEffectHash, rangeMilliInches: actingOrigin.rangeMilliInches } } : {}),
    fullModelPairDenominatorAssessed: true });
}
function statusNamed(piece, expected) {
  return (piece?.statuses || []).some((entry) => normalizedName(
    typeof entry === "string" ? entry : entry?.statusName || entry?.name) === normalizedName(expected));
}
function diceValue(expression, outcome) {
  if (expression === "D3") return Math.ceil(outcome / 2);
  if (expression === "D3+1") return Math.ceil(outcome / 2) + 1;
  if (expression === "D6") return outcome;
  fail("SELECTED_RANGED_SURGE_DICE_UNSUPPORTED", String(expression || ""));
}
function templateHitDice(profile, geometry, rateOfAttackModifier, lockedBonus = 0, weaponHitPenalty = 0) {
  const batch = geometry.templateBatch;
  const count = Math.max(0, batch.affectedModelIds.length + (batch.mainTarget
    ? profile.templateWeapon.mainTargetRateModifier + rateOfAttackModifier : 0));
  const row = geometry.modelAttackRows[0];
  return Array.from({ length: count }, (_, ordinal) => ({
    dieId: row.attackerModelId + ':template:' + ordinal,
    attackerModelId: row.attackerModelId,
    targetModelId: batch.affectedModelIds[ordinal % batch.affectedModelIds.length],
    distanceInches: row.distanceInches, rangeBand: row.rangeBand,
    hitThreshold: Math.max(2, Math.min(6, Number(profile.hitThreshold) + weaponHitPenalty + (row.rangeBand === 'extended' ? 1 : 0))),
    burstFireApplied: false, lockedInApplied: lockedBonus > 0,
  }));
}

function batchProfile(profile, geometry, attackerModifiers, rangedModifiers,
  targetModifiers, matchLifecycleModifiers, protossModifiers, target,
  pointDefenseRemovedDieIds = [], weaponDamageCap = null) {
  const burst = effectById(profile, "attack-effect:burst-fire-v1");
  const locked = effectById(profile, "attack-effect:locked-in-v1");
  const printedInstant = Boolean(effectById(profile, "attack-effect:instant-v1"));
  const instant = printedInstant || matchLifecycleModifiers.instant === true
    || protossModifiers.firstWeaponInstant === true;
  const targetStationary = statusNamed(target, "stationary");
  const templateBatch = geometry.templateBatch;
  if (Boolean(profile.templateWeapon) !== Boolean(templateBatch)) fail('SELECTED_RANGED_TEMPLATE_GEOMETRY_REQUIRED');
  const printedRateOfAttack = templateBatch ? null : Number(profile.rateOfAttack);
  const rateOfAttackModifier = templateBatch && !templateBatch.mainTarget ? 0
    : Number(attackerModifiers.rateOfAttackModifier || 0);
  const templateLockedBonus = profile.declarationWeaponEffects && templateBatch?.mainTarget && locked && targetStationary
    ? Number(locked.parameters.additionalRateOfAttack) : 0;
  const weaponHitPenalty = Number(attackerModifiers.weaponHitPenalty || 0);
  let hitDice = templateBatch ? templateHitDice(profile, geometry, rateOfAttackModifier + templateLockedBonus, templateLockedBonus, weaponHitPenalty)
    : geometry.modelAttackRows.flatMap((row) => {
    const burstBonus = burst && row.distanceInches
      <= Number(burst.parameters.maximumDistanceInches)
      ? Number(burst.parameters.additionalRateOfAttack) : 0;
    const lockedBonus = locked && targetStationary
      ? Number(locked.parameters.additionalRateOfAttack) : 0;
    const dice = Math.max(0, printedRateOfAttack + rateOfAttackModifier
      + burstBonus + lockedBonus);
    return Array.from({ length: dice }, (_, ordinal) => ({
      dieId: `${row.attackerModelId}:attack:${ordinal + 1}`,
      attackerModelId: row.attackerModelId,
      targetModelId: row.targetModelId,
      distanceInches: row.distanceInches,
      rangeBand: row.rangeBand,
      hitThreshold: Math.max(2, Math.min(6,
        Number(profile.hitThreshold) + weaponHitPenalty + (row.rangeBand === "extended" ? 1 : 0))),
      burstFireApplied: burstBonus > 0,
      lockedInApplied: lockedBonus > 0,
    }));
  });
  const guardianReduction = Math.max(0, -Number(targetModifiers.attackPoolModifier || 0));
  hitDice = hitDice.sort((left, right) => left.hitThreshold - right.hitThreshold
    || left.dieId.localeCompare(right.dieId));
  const guardianRemovedDice = hitDice.slice(0, Math.min(hitDice.length,
    guardianReduction));
  hitDice = hitDice.slice(guardianRemovedDice.length);
  const selectedPointDefenseSourceIds = clone(
    rangedModifiers.pointDefense?.selectedSourcePieceIds || []);
  const pointDefenseCapacity = instant ? 0
    : Number(rangedModifiers.pointDefense?.maximumDiceRemovedPerSource || 0)
      * selectedPointDefenseSourceIds.length;
  const selectedPointDefenseDieIds = [...new Set(
    (pointDefenseRemovedDieIds || []).map(String))].sort();
  const completedPointDefense = rangedModifiers.completedPointDefense;
  const completedPointDefenseDieIds = completedPointDefense?.removedDieIds || [];
  const availablePointDefenseDieIds = hitDice.map((entry) => entry.dieId);
  if ((instant && selectedPointDefenseSourceIds.length > 0)
    || selectedPointDefenseDieIds.length > pointDefenseCapacity
    || selectedPointDefenseDieIds.some((id) => !availablePointDefenseDieIds.includes(id))
    || (instant && completedPointDefenseDieIds.length > 0)
    || completedPointDefenseDieIds.some(id => !availablePointDefenseDieIds.includes(id))) {
    fail("SELECTED_RANGED_POINT_DEFENSE_SELECTION_INVALID");
  }
  const allPointDefenseDieIds = [...new Set([...selectedPointDefenseDieIds, ...completedPointDefenseDieIds])].sort();
  const pointDefenseRemovedDice = hitDice.filter((entry) => allPointDefenseDieIds.includes(entry.dieId));
  hitDice = hitDice.filter((entry) => !allPointDefenseDieIds.includes(entry.dieId));
  const removedAttackDice = [...guardianRemovedDice, ...pointDefenseRemovedDice];
  const baseSurge = profile.surge ? clone(profile.surge) : null;
  const surge = templateBatch ? (templateBatch.mainTarget && baseSurge
    ? { ...baseSurge, diceExpression: 'BT', fixedResult: templateBatch.affectedModelIds.length } : null)
    : targetModifiers.surgeDice && targetModifiers.surgeTypes?.length > 0
    ? { targetTags: clone(targetModifiers.surgeTypes),
      diceExpression: targetModifiers.surgeDice }
    : baseSurge ? { ...baseSurge,
      diceExpression: rangedModifiers.surgeDiceOverride || baseSurge.diceExpression }
      : null;
  const printedAntiEvade = Math.max(0, ...profile.effects.filter((entry) => (
    entry.effectAtomId === "attack-effect:anti-evade-v1"
  )).map((entry) => -Number(entry.parameters.evadeThresholdModifier || 0)));
  const antiEvade = Math.max(printedAntiEvade, Number(attackerModifiers.antiEvade || 0));
  const criticalHit = Math.max(0, Number(attackerModifiers.criticalHit || 0),
    ...profile.effects.filter((entry) => entry.effectAtomId === "attack-effect:critical-hit-v1")
      .map((entry) => Number(entry.parameters.bypassArmourDice
        ?? entry.parameters.additionalHits ?? 0)));
  const pierce = effectById(profile, "attack-effect:pierce-v1");
  const printedPierceDamage = pierce && target.combatTags?.includes(pierce.parameters.targetTag)
    ? Number(pierce.parameters.damage) : Number(profile.damage);
  const firstGamePierce = attackerModifiers.firstGameWeaponPierce;
  const pierceDamagePerDie = firstGamePierce?.remainingUses === 1
    && target.combatTags?.includes(firstGamePierce.targetTag)
    ? Math.max(printedPierceDamage, firstGamePierce.damage) : printedPierceDamage;
  const uncappedDamagePerDie = attackerModifiers.damageSetTo ?? pierceDamagePerDie;
  const damagePerDie = weaponDamageCap
    ? Math.min(uncappedDamagePerDie, weaponDamageCap.maximumWeaponDamage) : uncappedDamagePerDie;
  const body = {
    schema: "starcraft_tmg_official_current_product_ranged_batch_profile_v1",
    sourceProfileKey: profile.profileKey,
    sourceProfileHash: profile.profileHash,
    ...(weaponHitPenalty ? { weaponHitPenalty, printedHitThreshold: profile.hitThreshold } : {}),
    weaponName: profile.weaponName,
    targetTags: clone(profile.targetTags),
    printedRateOfAttack,
    rateOfAttackModifier,
    hitDice,
    removedAttackDice,
    attackPoolDiceBeforeRemoval: hitDice.length + removedAttackDice.length,
    attackPoolDice: hitDice.length,
    attackPoolRemoval: {
      guardianShieldDice: guardianRemovedDice.length,
      pointDefenseDice: pointDefenseRemovedDice.length,
      pointDefenseSourcePieceIds: selectedPointDefenseSourceIds,
      pointDefenseRemovedDieIds: allPointDefenseDieIds,
      ...(completedPointDefense ? { pointDefenseSourcesConsumedBeforeRoll: completedPointDefense.sourcePieceIds } : {}),
      pointDefenseAvailableSourcePieceIds: instant ? [] : clone(
        rangedModifiers.pointDefense?.availableSourcePieceIds || []),
      pointDefenseChoiceCapacity: pointDefenseCapacity,
      controllerChoiceAuthority: "defender_explicit_die_selection",
    },
    targetStationary,
    surge,
    antiEvade,
    criticalHit,
    precision: Number(attackerModifiers.precision || 0),
    damagePerDie,
    ...(weaponDamageCap ? { weaponDamageCap: clone(weaponDamageCap), uncappedDamagePerDie } : {}),
    pierceMatched: pierceDamagePerDie !== Number(profile.damage),
    ...(attackerModifiers.damageSetTo === undefined ? {} : {
      damageSetToApplied: attackerModifiers.damageSetTo,
      ...(attackerModifiers.damageCharacteristicSource ? {
        damageCharacteristicSource: clone(attackerModifiers.damageCharacteristicSource) } : {}) }),
    instant,
    printedInstant,
    instantGrantedByMatchLifecycle: !printedInstant
      && matchLifecycleModifiers.instant === true,
    instantGrantedByProtossFirstWeapon: !printedInstant
      && protossModifiers.firstWeaponInstant === true,
    instantSourceDefinitionId: matchLifecycleModifiers.instantSourceDefinitionId || null,
    protossInstantSourceDefinitionIds:
      clone(protossModifiers.sourceDefinitionIds || []),
    indirectFire: Boolean(effectById(profile, "attack-effect:indirect-fire-v1")),
    sidearm: Boolean(effectById(profile, "attack-effect:sidearm-v1")),
    pinpoint: Boolean(effectById(profile, "attack-effect:pinpoint-v1")),
    specialist: Boolean(effectById(profile, "attack-effect:specialist-v1")),
    ...(templateBatch ? { templateBatch: clone(templateBatch) } : {}),
    sourceEffectAtomIds: [...profile.effects, ...(profile.declarationWeaponEffects?.effects || [])].map((entry) => entry.effectAtomId),
    contextualEffectsConsumedByBatchCompiler: profile.effects.filter((entry) => (
      CONTEXTUAL_EFFECT_ATOM_IDS.has(entry.effectAtomId))).map((entry) => entry.effectAtomId),
    rulesTruth: "official_current_product_same_profile_same_target_batch",
    trainingTruth: false,
  };
  return seal(body, "profileHash");
}
function createMechanicalPlan(profileForBatch, targetProfile, geometry,
  evadeEligible, authoritativeEvadeReason) {
  const fixedEvade = targetProfile.fixedEvade;
  const effectiveEvadeThreshold = fixedEvade ? fixedEvade.evadeThreshold : targetProfile.evadeThreshold === null ? null
    : Math.max(2, Math.min(6, Number(targetProfile.evadeThreshold)
      + Number(profileForBatch.antiEvade || 0)));
  const maximumHits = profileForBatch.hitDice.length;
  const layout = { hit: maximumHits, surge: profileForBatch.surge
    && !Number.isSafeInteger(profileForBatch.surge.fixedResult) ? 1 : 0,
    armour: maximumHits, evade: evadeEligible ? maximumHits : 0 };
  return seal({
    schema: "starcraft_tmg_official_current_product_ranged_resolution_plan_v1",
    profileKey: profileForBatch.sourceProfileKey,
    profileHash: profileForBatch.profileHash,
    profile: clone(profileForBatch),
    target: { armourThreshold: targetProfile.armourThreshold,
      evadeThreshold: targetProfile.evadeThreshold,
      combatTags: clone(targetProfile.combatTags) },
    modelAttackRows: clone(geometry.modelAttackRows),
    distanceInches: geometry.distanceInches,
    normalRangeInches: geometry.normalRangeInches,
    maximumRangeInches: geometry.maximumRangeInches,
    rangeBand: geometry.modelAttackRows.some((entry) => entry.rangeBand === "extended")
      ? "mixed_or_extended" : "normal",
    effectiveHitThreshold: null,
    printedRateOfAttack: profileForBatch.printedRateOfAttack,
    effectiveRateOfAttack: profileForBatch.attackPoolDice,
    evade: { eligible: evadeEligible,
      eligibilityReason: authoritativeEvadeReason,
      baseThreshold: targetProfile.evadeThreshold,
      antiEvade: fixedEvade ? 0 : profileForBatch.antiEvade,
      ...(fixedEvade ? { fixedEvade, characteristicUnmodifiable: true } : {}),
      effectiveThreshold: effectiveEvadeThreshold,
      naturalOneAlwaysFails: true, naturalSixAlwaysSucceeds: true },
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: layout.hit + layout.surge + layout.armour + layout.evade,
      layout, revealOrder: ["hit", "surge", "armour", "evade"] },
    reactionPolicy: profileForBatch.instant
      ? { enemyDeclarationAllowed: false, enemyResolutionAllowed: false }
      : { enemyDeclarationAllowed: true, enemyResolutionAllowed: true },
    trainingTruth: false,
  }, "planHash");
}
function resolveMechanicalPlan(plan, reveals, { armourRollOnly = false, hitRollOnly = false, exactEvadeDiceCount } = {}) {
  if (!object(plan)
    || plan.schema !== "starcraft_tmg_official_current_product_ranged_resolution_plan_v1"
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("SELECTED_RANGED_MECHANICAL_PLAN_INVALID");
  }
  const maxEvadeDice = plan.chance.layout.evade;
  if (exactEvadeDiceCount !== undefined && (!Number.isSafeInteger(exactEvadeDiceCount)
    || exactEvadeDiceCount < 0 || exactEvadeDiceCount > maxEvadeDice)) fail('SELECTED_RANGED_EVADE_COUNT_INVALID');
  const expectedCount = hitRollOnly ? plan.chance.layout.hit + plan.chance.layout.surge
    : plan.chance.count - maxEvadeDice + (armourRollOnly ? 0 : exactEvadeDiceCount ?? maxEvadeDice);
  if (!Array.isArray(reveals) || reveals.length !== expectedCount) {
    fail("SELECTED_RANGED_CHANCE_REVEALS_REQUIRED");
  }
  const rolls = reveals.map((value) => Number(object(value) ? value.outcome : value));
  if (rolls.some((value) => !Number.isSafeInteger(value) || value < 1 || value > 6)) {
    fail("SELECTED_RANGED_CHANCE_REVEAL_INVALID");
  }
  let offset = 0;
  const hitRolls = rolls.slice(offset, offset += plan.chance.layout.hit);
  const surgeRolls = rolls.slice(offset, offset += plan.chance.layout.surge);
  const armourRolls = rolls.slice(offset, offset += plan.chance.layout.armour);
  const evadeRolls = rolls.slice(offset, offset + plan.chance.layout.evade);
  const successfulHitDieIndices = hitRolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll, index }) => rollSucceeds(
      roll, plan.profile.hitDice[index].hitThreshold)).map(({ index }) => index);
  const hits = successfulHitDieIndices.length;
  const surgeResults = Number.isSafeInteger(plan.profile.surge?.fixedResult)
    ? [plan.profile.surge.fixedResult] : surgeRolls.map((roll) => diceValue(
      plan.profile.surge.diceExpression, roll));
  const surgeMatched = Boolean(plan.profile.surge)
    && plan.profile.surge.targetTags.some((tag) => plan.target.combatTags.includes(tag));
  const surgeCapacity = surgeMatched
    ? surgeResults.reduce((sum, value) => sum + value, 0) : 0;
  const criticalHitCapacity = Number(plan.profile.criticalHit || 0);
  const bypassedArmourHits = Math.min(hits, surgeCapacity + criticalHitCapacity);
  const armourDice = hits - bypassedArmourHits;
  const resolvedArmourRolls = armourRolls.slice(0, armourDice);
  const armourSaves = resolvedArmourRolls.filter((roll) => (
    rollSucceeds(roll, plan.target.armourThreshold))).length;
  const damagePoolBeforeEvade = bypassedArmourHits + armourDice - armourSaves;
  const evadeDice = plan.evade.eligible ? damagePoolBeforeEvade : 0;
  const resolvedEvadeRolls = evadeRolls.slice(0, evadeDice);
  const evadeSaves = resolvedEvadeRolls.filter((roll) => (
    rollSucceeds(roll, plan.evade.effectiveThreshold))).length;
  const confirmedDamageDice = damagePoolBeforeEvade - evadeSaves;
  return seal({
    schema: "starcraft_tmg_official_current_product_ranged_resolution_v1",
    planHash: plan.planHash,
    reveals: rolls,
    stages: {
      declaration: { profileKey: plan.profileKey,
        profileHash: plan.profileHash, distanceInches: plan.distanceInches,
        rangeBand: plan.rangeBand },
      hit: { dice: hitRolls.length, rolls: hitRolls, threshold: null,
        thresholdByDieIndex: plan.profile.hitDice.map((entry) => entry.hitThreshold),
        successfulHitDieIndices, hits },
      effects: { appliedEffectAtomIds: clone(plan.profile.sourceEffectAtomIds),
        surgeRolls, surgeResults, surgeMatched, surgeCapacity,
        criticalHitCapacity, bypassedArmourHits,
        antiEvadeApplied: plan.evade.antiEvade > 0 && plan.evade.eligible,
        antiEvadeModifier: plan.evade.antiEvade,
        burstFireApplied: plan.profile.hitDice.some((entry) => entry.burstFireApplied),
        lockedInApplied: plan.profile.hitDice.some((entry) => entry.lockedInApplied),
        attackPoolRemoval: clone(plan.profile.attackPoolRemoval),
        printedRateOfAttack: plan.profile.printedRateOfAttack,
        effectiveRateOfAttack: plan.profile.attackPoolDice,
        pierceMatched: plan.profile.pierceMatched,
        pierceDamage: plan.profile.pierceMatched ? plan.profile.damagePerDie : null },
      armour: { dice: armourDice, rolls: resolvedArmourRolls,
        unusedPreallocatedRolls: armourRolls.slice(armourDice),
        threshold: plan.target.armourThreshold, saves: armourSaves },
      evade: { eligible: plan.evade.eligible,
        eligibilityReason: plan.evade.eligibilityReason,
        dice: evadeDice, rolls: resolvedEvadeRolls,
        unusedPreallocatedRolls: evadeRolls.slice(evadeDice),
        effectiveThreshold: plan.evade.effectiveThreshold,
        damagePoolBeforeEvade, saves: evadeSaves, confirmedDamageDice },
      damage: { damagePoolDice: confirmedDamageDice,
        damagePerDie: plan.profile.damagePerDie,
        totalDamage: confirmedDamageDice * plan.profile.damagePerDie },
    },
    trainingTruth: false,
  }, "resolutionHash");
}
function planAttackResolution(state, piece, target, profile, geometry, targetProfile,
  engagement, graph, choices = {}) {
  const targetReactionEvade = projectOfficialAttackTargetEvadeEligibilityV1(state, {
    pieceId: piece.id, targetId: target.id, profileKey: profile.profileKey, sourceProfileHash: profile.profileHash });
  const highGroundEvadeEligible = geometry.pairs.some((pair) => (
    pair.visible && pair.withinMaximumRange && pair.highGroundEvadeEligible
  ));
  const selectedTargetModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, target, { attackerPieceId: piece.id, weaponName: profile.weaponName,
      damageKind: "ranged_attack" });
  const characteristicTargetModifiers = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: target.id, context: { attackerPieceId: piece.id,
        weaponName: profile.weaponName, damageKind: "ranged_attack",
        attackKind: "ranged", targetPieceId: target.id } },
    ) : {};
  const rangedAttackOrdinalAgainstTargetInRound = 1 + (state.rangedActionHistory || [])
    .filter((entry) => Number(entry.round) === Number(state.round)
      && entry.targetId === target.id).length;
  const battlefieldTargetModifiers = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: target.id, context: { attackerPieceId: piece.id,
        targetPieceId: target.id, damageKind: "ranged_attack", attackKind: "ranged",
        weaponName: profile.weaponName, rangedAttackOrdinalAgainstTargetInRound } },
    ) : {};
  // An absent modifier means no eligibility. Keep this Rules-owned fact a
  // boolean across Native JSON persistence and exact action reconstruction.
  const indirectEvade = Boolean(effectById(profile, 'attack-effect:indirect-fire-v1')
    && (profile.declarationWeaponEffects || (!profile.templateWeapon && hasOfficialPrintedIndirectFireEvadePolicyV1(state)))
    && !geometry.pairs.some(pair => pair.visible && pair.withinMaximumRange));
  const evadeEligible = targetProfile.evadeThreshold !== null
    && Boolean(engagement.targetEngaged || highGroundEvadeEligible
      || engagement.indomitableCrossEngagement?.defenderGainsEvadeEligibility
      || selectedTargetModifiers.evadeEligible || targetReactionEvade?.evadeEligible
      || characteristicTargetModifiers.eligibleEvadeAgainstAllAttacks
      || battlefieldTargetModifiers.eligibleEvadeAgainstRanged || indirectEvade);
  const authoritativeEvadeReason = !evadeEligible ? "none"
    : indirectEvade ? 'indirect_fire_without_line_of_sight'
    : engagement.indomitableCrossEngagement?.defenderGainsEvadeEligibility
      ? 'indomitable_cross_engagement'
    : selectedTargetModifiers.evadeEligible || targetReactionEvade?.evadeEligible
      || characteristicTargetModifiers.eligibleEvadeAgainstAllAttacks
      || battlefieldTargetModifiers.eligibleEvadeAgainstRanged
      ? "active_or_passive_ability_evade_eligibility"
      : engagement.targetEngaged && highGroundEvadeEligible
      ? "target_engaged_or_all_high_ground"
      : engagement.targetEngaged
        ? "target_engaged_and_suffering_ranged_damage"
        : "target_all_high_ground_and_attack_originates_lower";
  const selectedAttackerModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, piece, { attackerPieceId: piece.id, weaponName: profile.weaponName,
      damageKind: "ranged_attack" });
  const characteristicAttackerModifiers = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { attackerPieceId: piece.id,
        targetPieceId: target.id, weaponName: profile.weaponName,
        damageKind: "ranged_attack", attackKind: "ranged" } },
    ) : {};
  const battlefieldAttackerModifiers = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: piece.id, context: { attackerPieceId: piece.id,
        targetPieceId: target.id, weaponName: profile.weaponName,
        damageKind: "ranged_attack", attackKind: "ranged" } },
    ) : {};
  const weaponHitPenalty = Math.max(Number(characteristicAttackerModifiers.weaponHitPenalty || 0),
    projectOfficialRangedReactionHitPenaltyV1(state, piece));
  const attackerAbilityModifiers = {
    precision: Math.max(Number(selectedAttackerModifiers.precision || 0),
      Number(characteristicAttackerModifiers.precision || 0),
      Number(battlefieldAttackerModifiers.precision || 0)),
    antiEvade: Number(characteristicAttackerModifiers.antiEvade || 0),
    criticalHit: Math.max(Number(characteristicAttackerModifiers.criticalHit || 0),
      Number(battlefieldAttackerModifiers.criticalHit || 0)),
    rateOfAttackModifier: Number(characteristicAttackerModifiers.rateOfAttackModifier || 0),
    ...(weaponHitPenalty ? { weaponHitPenalty } : {}),
    ...(characteristicAttackerModifiers.firstGameWeaponPierce ? {
      firstGameWeaponPierce: characteristicAttackerModifiers.firstGameWeaponPierce } : {}),
    ...(characteristicAttackerModifiers.damageSetTo === null || characteristicAttackerModifiers.damageSetTo === undefined
      ? {} : { damageSetTo: characteristicAttackerModifiers.damageSetTo,
        ...(characteristicAttackerModifiers.damageCharacteristicSource ? {
          damageCharacteristicSource: characteristicAttackerModifiers.damageCharacteristicSource } : {}) }),
  };
  const rangedModifiers = state.officialRangedFamilySourceBundle
    ? projectOfficialRangedFamilyModifiersV1(
      state.officialRangedFamilySourceBundle, state,
      { pieceId: piece.id, context: { targetPieceId: target.id,
        weaponName: profile.weaponName, profileKey: profile.profileKey,
        templateSpillover: geometry.templateBatch?.mainTarget === false,
        pointDefenseSourcePieceIds: choices.pointDefenseSourcePieceIds || [],
        distanceInches: Math.min(...geometry.modelAttackRows.map((entry) => (
          entry.distanceInches))) } },
    ) : {};
  const targetModifiers = {
    attackPoolModifier: Number(characteristicTargetModifiers.attackPoolModifier || 0),
    surgeTypes: clone(characteristicAttackerModifiers.surgeTypes || []),
    surgeDice: characteristicAttackerModifiers.surgeDice || null,
  };
  const matchLifecycleModifiers = state.officialMatchLifecycleFamilySourceBundle
    ? projectOfficialMatchLifecycleFamilyModifiersV1(
      state.officialMatchLifecycleFamilySourceBundle, state,
      { pieceId: piece.id, targetPieceId: target.id,
        weaponName: profile.weaponName },
    ) : state.officialStalkerFurySource ? projectOfficialStalkerFuryV1(state,piece,target,profile.weaponName,state.officialStalkerFurySource) : {};
  const protossModifiers = state.officialProtossUniqueFamilySourceBundle
    ? projectOfficialProtossUniqueFamilyModifiersV1(
      state.officialProtossUniqueFamilySourceBundle, state,
      { pieceId: piece.id, attackKind: "ranged", weaponName: profile.weaponName },
    ) : {};
  const profileForBatch = batchProfile(profile, geometry, attackerAbilityModifiers,
    rangedModifiers, targetModifiers, matchLifecycleModifiers, protossModifiers, target,
    choices.pointDefenseRemovedDieIds || [], projectOfficialAttackTargetWeaponDamageCapV1(state, {
      pieceId: piece.id, targetId: target.id, profileKey: profile.profileKey, sourceProfileHash: profile.profileHash }));
  const fixedEvade = projectOfficialAttackTargetFixedEvadeV1(state, {
    pieceId: piece.id, targetId: target.id, profileKey: profile.profileKey, sourceProfileHash: profile.profileHash });
  const mechanicalPlan = createMechanicalPlan(profileForBatch, {
    ...targetProfile,
    armourThreshold: planOfficialArmourThresholdV1(state, targetProfile.armourThreshold, battlefieldTargetModifiers.armourModifier || 0),
    ...(fixedEvade ? { fixedEvade } : {}),
    evadeThreshold: fixedEvade ? fixedEvade.evadeThreshold : targetProfile.evadeThreshold === null ? null
      : Math.max(2, Number(targetProfile.evadeThreshold)
        - Number(selectedTargetModifiers.evadeModifier || 0)
        - Number(battlefieldTargetModifiers.evadeModifier || 0)
        - Number(targetReactionEvade?.evadeModifier || 0)),
  }, geometry, evadeEligible, authoritativeEvadeReason);
  return { mechanicalPlan, profileForBatch, evadeEligible,
    authoritativeEvadeReason, highGroundEvadeEligible,
    abilityModifiers: { ...selectedTargetModifiers,
      ...characteristicTargetModifiers,
      ...(battlefieldTargetModifiers.dodge ? { dodge: Math.max(Number(selectedTargetModifiers.dodge || 0),
        Number(characteristicTargetModifiers.dodge || 0), battlefieldTargetModifiers.dodge) } : {}),
      evadeModifier: Number(selectedTargetModifiers.evadeModifier || 0)
        + Number(battlefieldTargetModifiers.evadeModifier || 0) + Number(targetReactionEvade?.evadeModifier || 0),
      armourModifier: Number(battlefieldTargetModifiers.armourModifier || 0),
      battlefieldAssetDefinitionIds:
        battlefieldTargetModifiers.applicableDefinitionIds || [] },
    attackerAbilityModifiers: { ...attackerAbilityModifiers,
      battlefieldAssetDefinitionIds:
        battlefieldAttackerModifiers.applicableDefinitionIds || [] },
    rangedModifiers };
}
function previewContextKey(sideKey, pieceId, targetId, profileKey, choices = {}, attackMode) {
  return JSON.stringify([sideKey, pieceId, targetId,
    profileKey, choices.pointDefenseSourcePieceIds || [],
    choices.pointDefenseRemovedDieIds || [], ...(attackMode ? [attackMode] : [])]);
}
function geometryForProfile(state, piece, target, profile, physicalGeometry, attackMode) {
  const characteristicModifiers = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { weaponName: profile.weaponName,
        targetPieceId: target.id, attackKind: "ranged" } },
    ) : {};
  const rangedModifiers = state.officialRangedFamilySourceBundle
    ? projectOfficialRangedFamilyModifiersV1(
      state.officialRangedFamilySourceBundle, state,
      { pieceId: piece.id, context: { weaponName: profile.weaponName,
        targetPieceId: target.id } },
    ) : {};
  const bombard = attackMode === 'bombard' ? resolveOfficialBombardTargetingContextV1(state, piece, target, profile) : null;
  return candidateGeometry(state, piece, target, profile,
    characteristicModifiers, rangedModifiers, physicalGeometry, null, bombard);
}

export function inspectOfficialSelectedRosterRangedTargetGeometryV1({ state, pieceId, targetUnitId, profileKey, spotterModelId, attackMode }) {
  verifyRuntimeState(state);
  const piece = state.pieces.find(row => row.id === pieceId);
  const target = state.pieces.find(row => row.id === targetUnitId);
  const profile = projectOfficialRangedDeclarationProfileV1(state, pieceId,
    getOfficialAttackProfileV3(state.officialAttackProfileCatalogue, profileKey));
  if (!piece || profile.recordKey !== piece.officialUnitRecordKey
    || profile.sourceRecordHash !== piece.sourceRecordHash || profile.payloadHash !== piece.officialPayloadHash) {
    fail("SELECTED_RANGED_PROFILE_PIECE_MISMATCH");
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  const engagement = assertAssaultContext(state, piece.sideKey, piece, target, graph, profile);
  if (!isOfficialSiegeModeWeaponEligibleV1(state, piece, profile.weaponName)) {
    fail("SELECTED_RANGED_MODE_WEAPON_UNAVAILABLE");
  }
  if (spotterModelId !== undefined && (profile.recordKey !== 'army_units:siege_tank'
    || profile.weaponName !== 'Shock Cannon')) throw Error('COORDINATED_STRIKE_WEAPON_UNAVAILABLE');
  const origin = spotterModelId === undefined ? null
    : resolveOfficialCoordinatedStrikeOriginV1(state, piece.id, spotterModelId);
  if (attackMode !== undefined && attackMode !== 'bombard') throw Error('SELECTED_RANGED_ATTACK_MODE_INVALID');
  if (origin && attackMode) throw Error('SELECTED_RANGED_ATTACK_MODE_ORIGIN_CONFLICT');
  const geometry = origin ? candidateGeometry(state, piece, target, profile, {}, {}, null, origin)
    : geometryForProfile(state, piece, target, profile, null, attackMode);
  return freezeDeep({ profile, engagement, geometry });
}

function contextFor(state, sideKey, piece, target, profileKey, shared = {}) {
  if (shared.attackMode !== undefined && shared.attackMode !== 'bombard') fail('SELECTED_RANGED_ATTACK_MODE_INVALID');
  const prepared = PREVIEW_CONTEXTS_BY_OWNED_STATE.get(state);
  const contextKey = prepared ? previewContextKey(sideKey, piece.id, target.id,
    profileKey, shared.pointDefenseChoices, shared.attackMode) : null;
  const observe = (kind) => {
    if (typeof prepared?.observe !== "function") return;
    try { prepared.observe({ stage: kind, sideKey, pieceId: piece.id,
      targetUnitId: target.id, profileKey }); } catch { /* Diagnostics only. */ }
  };
  if (prepared?.contexts.has(contextKey)) {
    observe("ranged_preview_context_reused");
    return prepared.contexts.get(contextKey);
  }
  observe("ranged_preview_context_started");
  const graph = shared.graph || deriveOfficialEngagementGraphV2(state);
  const { loadout, profiles: allProfiles } = shared.loadoutAndProfiles
    || activeProfilesFor(state, piece);
  const profiles = profilesAllowedByPending(state, piece, allProfiles);
  const profile = profiles.find((entry) => entry.profileKey === profileKey);
  if (!profile) fail("SELECTED_RANGED_PROFILE_UNAVAILABLE", profileKey);
  const engagement = assertAssaultContext(state, sideKey, piece, target, graph, profile, shared.overwatchProbe);
  if (effectById(profile, "attack-effect:bulky-v1") && engagement.attackerEngaged) {
    fail("ATTACK_BULKY_ENGAGED_PROHIBITION", piece.id);
  }
  const targetProfile = resolveOfficialEffectiveCombatProfileV1(state, target);
  observe("ranged_preview_geometry_started");
  const geometry = geometryForProfile(state, piece, target, profile, shared.physicalGeometry, shared.attackMode);
  observe("ranged_preview_geometry_completed");
  observe("ranged_preview_plan_started");
  const attack = planAttackResolution(
    state, piece, target, profile, geometry, targetProfile, engagement, graph,
    shared.pointDefenseChoices || {},
  );
  observe("ranged_preview_plan_completed");
  const context = { graph, engagement, loadout, profile, targetProfile, geometry, ...attack };
  if (prepared) {
    // The enum and later previews use identical native context on this one
    // owned snapshot. Non-default point-defense choices have separate keys.
    prepared.contexts.set(contextKey, freezeDeep(context));
    observe("ranged_preview_context_constructed");
  }
  return context;
}
function domainFor(state, sideKey, piece, profile, targets, attackMode) {
  const pointDefenseSourceIds = [...new Set(targets.flatMap((entry) => (
    entry.context.profileForBatch.attackPoolRemoval
      .pointDefenseAvailableSourcePieceIds || [])))].sort();
  const pointDefenseDieIds = [...new Set(targets.flatMap((entry) => (
    entry.context.profileForBatch.hitDice.map((die) => die.dieId))))].sort();
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND,
    actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    sideKey, phase: "assault", pieceId: piece.id,
    profileKey: profile.profileKey, weaponName: profile.weaponName,
    ...(attackMode ? { attackMode } : {}),
    executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    ruleAtomIds: profileRuleAtomIds(profile, state),
    parameterSchema: { type: "object", required: ["targetUnitId", ...(attackMode ? ['attackMode'] : [])],
      ...(attackMode ? { attackMode: { const: attackMode } } : {}),
      targetUnitId: { enum: targets.map((entry) => entry.target.id).sort() },
      pointDefenseSourcePieceIds: { type: "array", uniqueItems: true,
        items: { enum: pointDefenseSourceIds }, default: [] },
      pointDefenseRemovedDieIds: { type: "array", uniqueItems: true,
        items: { enum: pointDefenseDieIds }, default: [] } },
    constraints: {
      targetPlans: targets.map((entry) => ({
        targetUnitId: entry.target.id,
        attackPlanHash: entry.context.mechanicalPlan.planHash,
        chance: clone(entry.context.mechanicalPlan.chance),
        eligibleAttackerModelIds: entry.context.geometry.eligibleAttackerModelIds,
        visibleTargetModelIds: entry.context.geometry.visibleTargetModelIds,
        targetEngaged: entry.context.engagement.targetEngaged,
        highGroundEvadeEligible: entry.context.highGroundEvadeEligible,
        ...(entry.context.geometry.bombard ? { bombard: clone(entry.context.geometry.bombard) } : {}),
        pointDefenseChoice: {
          defenderSideKey: entry.target.sideKey,
          availableSourcePieceIds: clone(entry.context.profileForBatch
            .attackPoolRemoval.pointDefenseAvailableSourcePieceIds || []),
          removableDieIds: entry.context.profileForBatch.hitDice
            .map((die) => die.dieId).sort(),
          maximumDiceRemovedPerSelectedSource: 2,
          mayDecline: true,
        },
      })).sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId)),
      attackProfileCatalogueHash: state.officialAttackProfileCatalogue.catalogueHash,
      combatProfileBundleHash: state.officialCombatProfileBundle.bundleHash,
      terrainLosDataBundleHash: state.officialTerrainLosDataBundle.bundleHash,
      engagementGraphHash: targets[0].context.graph.graphHash,
      fullModelPairVisibilityAndRangeDenominator: true,
    },
    confirmationClass: pointDefenseSourceIds.length > 0
      ? "defender_choice_then_agent_owned_auto_apply_or_human_direct_choice"
      : "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_ranged_target_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function diagnostic(sideKey, piece, profile, error) {
  return freezeDeep({
    actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    sideKey, phase: "assault", pieceId: piece.id,
    profileKey: profile?.profileKey || null, weaponName: profile?.weaponName || null,
    executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
    score: 0, details: { trainingTruth: false },
  });
}

export function enumerateOfficialSelectedRosterRangedActionsV1(state, options = {}) {
  verifyRuntimeState(state);
  const prepared = nativeRangedPreparationFromVerifiedState(state, options);
  return prepared?.enumeration || enumerateRangedFromVerifiedState(state, options);
}

const RANGED_TARGET_UNAVAILABLE_CODES = new Set([
  "SELECTED_RANGED_PENDING_SEQUENCE_ROUTE_INVALID",
  "SELECTED_RANGED_UNIT_UNAVAILABLE",
  "SELECTED_RANGED_STRUCTURE_CANNOT_PERFORM_ACTIONS",
  "SELECTED_RANGED_BURROWED_ATTACK_PROHIBITED",
  'SELECTED_RANGED_OVERWATCH_SCOPE_PROHIBITED',
  "SELECTED_RANGED_TARGET_UNAVAILABLE",
  "SELECTED_RANGED_TARGET_TAG_PROHIBITED",
  "SELECTED_RANGED_UNIT_ALREADY_ACTIVATED",
  "SELECTED_ABILITY_CORE_ACTION_WINDOW_INVALID",
  "SELECTED_RANGED_POST_DISENGAGE_PROHIBITED",
  "SELECTED_RANGED_ENGAGEMENT_TARGET_PROHIBITED",
  'SELECTED_RANGED_POINT_BLANK_ENGAGED_TARGET_PROHIBITED',
  "SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE",
  "BOMBARD_TARGET_OUTSIDE_AREA",
  "ATTACK_BULKY_ENGAGED_PROHIBITION",
]);

export function inspectOfficialAutoTurretOverwatchShotV1(state, { sourcePieceId, targetPieceId } = {}) {
  verifyRuntimeState(state);
  const source = state.pieces.find(row => row.id === sourcePieceId);
  const target = state.pieces.find(row => row.id === targetPieceId);
  const route = state.officialReactionFamilySourceBundle?.routes.find(row =>
    row.effectKind === 'overwatch_ranged_attack' && row.recordKey === source?.officialUnitRecordKey);
  const spec = getOfficialOverwatchSourceSpecV1(route?.definitionId);
  if (!route || !spec || source?.officialUnitRecordKey !== route.recordKey || !target) {
    throw Error('OVERWATCH_SHOT_SOURCE_OR_TARGET_REQUIRED');
  }
  if (state.phase !== 'assault') return { legal: false, ruleCode: 'SELECTED_RANGED_PHASE_UNAVAILABLE' };
  if (!allowsOfficialSpawnRoundSpecialAbilityV1(state, source, route.abilityName)) {
    return { legal: false, ruleCode: 'SPAWN_ROUND_ABILITY_LOCKED', sourcePieceId, targetPieceId };
  }
  const probe = { pieceId: sourcePieceId, targetId: targetPieceId, profileKey: spec.profileKey };
  OVERWATCH_PROBES.add(probe);
  // Only the acting seat is projected. All geometry, tags, profiles and statuses
  // remain the actual facts evaluated by the same live contextFor function.
  const projected = { ...state, activeSideKey: source.sideKey };
  try {
    const context = contextFor(projected, source.sideKey, source, target, spec.profileKey,
      { overwatchProbe: probe });
    return { legal: true, ruleCode: null, sourcePieceId, targetPieceId,
      sourceProfileHash: context.profile.profileHash, geometry: clone(context.geometry),
      hypotheticalTrigger: 'enemy_unit_activation_end', mutationAuthority: false, trainingTruth: false };
  } catch (error) {
    const ruleCode = String(error.code || error.message).split(':')[0];
    if (!RANGED_TARGET_UNAVAILABLE_CODES.has(ruleCode)) throw error;
    return { legal: false, ruleCode, sourcePieceId, targetPieceId, mutationAuthority: false, trainingTruth: false };
  } finally { OVERWATCH_PROBES.delete(probe); }
}
function enumerateRangedFromVerifiedState(state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("SELECTED_RANGED_SIDE_INVALID", sideKey);
  const parameterDomains = [];
  const candidates = [];
  const casualtyPending = pendingCasualtyChoice(state);
  if (casualtyPending) {
    if (casualtyPending.defenderSideKey === sideKey) {
      parameterDomains.push(casualtyChoiceDomain(casualtyPending, state));
    }
    return freezeDeep({
      schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
      runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
      runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
      candidates,
      parameterDomains,
      completeForSelectedRangedRoutes: true,
      pendingDefenderCasualtyChoice: true,
      searchAndStrategyExcludedFromAuthority: true,
      trainingTruth: false,
    });
  }
  const pending = pendingSequence(state);
  if (pending && pending.sideKey === sideKey) {
    candidates.push(freezeDeep({
      actionType: OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE,
      sideKey, phase: "assault", pieceId: pending.pieceId,
      sequenceHash: pending.sequenceHash,
      executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
      isEnabled: true, disabledReason: null, score: 0,
      details: { completedBatchCount: pending.completedBatches.length,
        voluntaryStopAllowedBetweenBatches: true, trainingTruth: false },
    }));
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  const physicalGeometry = createEnumerationPhysicalGeometryBatch(state);
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey && livePiece(entry)
      && (!pending || pending.pieceId === entry.id)
  ))) {
    let profiles = [];
    let loadoutAndProfiles = null;
    try {
      loadoutAndProfiles = activeProfilesFor(
        state, piece, { activeOnly: activePiece(piece) },
      );
      profiles = profilesAllowedByPending(
        state, piece, loadoutAndProfiles.profiles);
      phaseReady(state, sideKey);
    } catch (error) {
      if (!["SELECTED_RANGED_PHASE_UNAVAILABLE",
        "SELECTED_RANGED_PHASE_INITIATIVE_UNRESOLVED"].includes(
        String(error.code || error.message || "").split(":")[0])) throw error;
      if (options.includeDisabled === true) candidates.push(diagnostic(sideKey, piece, null, error));
      continue;
    }
    for (const profile of profiles) {
      const modes = findOfficialBombardTargetingBindingV1(state, piece, profile) ? [undefined, 'bombard'] : [undefined];
      for (const attackMode of modes) {
        const targets = [];
        let firstError = null;
        for (const target of state.pieces.filter((entry) => (
          entry.sideKey === otherSide(sideKey) && activePiece(entry)
        ))) {
          try {
            targets.push({ target, context: contextFor(
              state, sideKey, piece, target, profile.profileKey,
              { graph, loadoutAndProfiles, physicalGeometry, attackMode },
            ) });
          } catch (error) {
            // Only a known rules prohibition means "not a legal target". Missing
            // data, broken geometry or unsupported adapters must reach the caller.
            if (!RANGED_TARGET_UNAVAILABLE_CODES.has(
              String(error.code || error.message || "").split(":")[0])) throw error;
            firstError ||= error;
          }
        }
        if (targets.length > 0) {
          parameterDomains.push(domainFor(state, sideKey, piece, profile, targets, attackMode));
        } else if (options.includeDisabled === true) {
          candidates.push(diagnostic(sideKey, piece, profile,
            firstError || new Error("SELECTED_RANGED_NO_TARGET")));
        }
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    candidates: candidates.sort((left, right) => (
      `${left.pieceId}:${left.profileKey}`.localeCompare(`${right.pieceId}:${right.profileKey}`)
    )),
    parameterDomains: parameterDomains.sort((left, right) => (
      `${left.pieceId}:${left.profileKey}`.localeCompare(`${right.pieceId}:${right.profileKey}`)
    )),
    completeForSelectedRangedRoutes: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}

function instantiateCasualtyParameters(pending, parameters) {
  if (!object(parameters)) fail("SELECTED_RANGED_CASUALTY_PARAMETER_DOMAIN_INVALID");
  const explicitModelSelection = pending.casualtyDomain.selectionMode
    === "explicit_model_ids";
  if (Object.keys(parameters).some((key) => explicitModelSelection
    ? key !== "casualtyModelIds" : key !== "casualtySelectionHash")) {
    fail("SELECTED_RANGED_CASUALTY_PARAMETER_DOMAIN_INVALID");
  }
  const casualtyModelIds = explicitModelSelection
    ? clone(parameters.casualtyModelIds) : null;
  const casualtySelectionHash = explicitModelSelection
    ? resolveOfficialCurrentProductCasualtyDomainV1(
      pending.casualtyDomain,
      "",
      casualtyModelIds,
    ).selectionHash
    : String(parameters.casualtySelectionHash || "");
  if (!explicitModelSelection
    && !pending.casualtyDomain.legalSelections.some(selection =>
      selection.selectionHash === casualtySelectionHash)) {
    fail("SELECTED_RANGED_CASUALTY_SELECTION_STALE");
  }
  const canonicalParameters = explicitModelSelection
    ? { casualtyModelIds } : { casualtySelectionHash };
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters,
    action: {
      actionType: OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_ACTION_TYPE,
      resolutionStage: "defender_casualty_selection",
      sideKey: pending.defenderSideKey,
      phase: "assault",
      pieceId: pending.targetPieceId,
      attackerPieceId: pending.attackerPieceId,
      pendingHash: pending.pendingHash,
      casualtyDomainHash: pending.casualtyDomainHash,
      casualtySelectionHash,
      ...(explicitModelSelection ? { casualtyModelIds } : {}),
      ruleAtomIds: [...RULE_ATOM_IDS],
      executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    },
    rulesTruth: "official_defender_owned_ranged_casualty_selection",
    trainingTruth: false,
  });
}

export function instantiateOfficialSelectedRosterRangedActionV1(
  state, domain, parameters,
) {
  verifyRuntimeState(state);
  return instantiateRangedFromVerifiedState(state, domain, parameters);
}

function instantiateRangedFromVerifiedState(
  state, domain, parameters, preparedEnumeration = null,
) {
  if (domain?.parameterKind
    === OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_PARAMETER_KIND) {
    const pending = pendingCasualtyChoice(state);
    const current = pending ? casualtyChoiceDomain(pending, state) : null;
    if (!current || !isDeepStrictEqual(current, domain) || !object(parameters)) {
      fail("SELECTED_RANGED_CASUALTY_PARAMETER_DOMAIN_INVALID");
    }
    return instantiateCasualtyParameters(pending, parameters);
  }
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || domain.executorVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || !object(parameters)
    || Object.keys(parameters).some((key) => !["targetUnitId",
      "pointDefenseSourcePieceIds", "pointDefenseRemovedDieIds", "attackMode"].includes(key))) {
    fail("SELECTED_RANGED_PARAMETER_DOMAIN_INVALID");
  }
  const enumeration = preparedEnumeration
    || enumerateOfficialSelectedRosterRangedActionsV1(state, {
    sideKey: domain.sideKey, includeDisabled: true,
  });
  const current = enumeration.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SELECTED_RANGED_PARAMETER_DOMAIN_STALE");
  }
  if (parameters.attackMode !== domain.attackMode) fail('SELECTED_RANGED_ATTACK_MODE_INVALID');
  const { targetUnitId } = parameters;
  if (typeof targetUnitId !== "string") {
    fail("SELECTED_RANGED_TARGET_PARAMETER_INVALID");
  }
  if (!domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)) {
    fail("SELECTED_RANGED_TARGET_PARAMETER_INVALID", targetUnitId);
  }
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const target = state.pieces.find((entry) => entry.id === targetUnitId);
  const pointDefenseSourcePieceIds = [...new Set(
    (parameters.pointDefenseSourcePieceIds || []).map(String))].sort();
  const pointDefenseRemovedDieIds = [...new Set(
    (parameters.pointDefenseRemovedDieIds || []).map(String))].sort();
  const targetPlan = domain.constraints.targetPlans.find((entry) => (
    entry.targetUnitId === targetUnitId));
  const pointDefenseChoice = targetPlan.pointDefenseChoice;
  if (pointDefenseSourcePieceIds.some((id) => (
    !pointDefenseChoice.availableSourcePieceIds.includes(id)))
    || pointDefenseRemovedDieIds.some((id) => (
      !pointDefenseChoice.removableDieIds.includes(id)))
    || pointDefenseRemovedDieIds.length
      > pointDefenseSourcePieceIds.length
        * pointDefenseChoice.maximumDiceRemovedPerSelectedSource) {
    fail("SELECTED_RANGED_POINT_DEFENSE_PARAMETER_INVALID");
  }
  const canonicalParameters = { targetUnitId,
    pointDefenseSourcePieceIds, pointDefenseRemovedDieIds, ...(domain.attackMode ? { attackMode: domain.attackMode } : {}) };
  const contextState = plainRangedDataTree(parameters)
    ? nativeContextStateForEnumeration(state, enumeration) : state;
  const contextPiece = contextState === state ? piece
    : contextState.pieces.find(entry => entry.id === piece.id);
  const contextTarget = contextState === state ? target
    : contextState.pieces.find(entry => entry.id === target.id);
  const context = contextFor(contextState, domain.sideKey, contextPiece, contextTarget, domain.profileKey, {
    pointDefenseChoices: canonicalParameters,
    attackMode: domain.attackMode,
  });
  const planBody = {
    schemaVersion: OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA,
    semanticVersion: "1.0.0", sideKey: domain.sideKey,
    pieceId: piece.id, targetUnitId, profileKey: context.profile.profileKey,
    sourceProfileHash: context.profile.profileHash,
    batchProfileHash: context.profileForBatch.profileHash,
    weaponName: context.profile.weaponName, domainId: domain.domainId,
    ...(domain.attackMode ? { attackMode: domain.attackMode, bombard: clone(context.geometry.bombard) } : {}),
    canonicalParameters,
    weaponLoadoutHash: context.loadout.loadoutHash,
    attackPlanHash: context.mechanicalPlan.planHash,
    chance: clone(context.mechanicalPlan.chance),
    eligibleAttackerModelIds: context.geometry.eligibleAttackerModelIds,
    visibleTargetModelIds: context.geometry.visibleTargetModelIds,
    modelPairEvidence: clone(context.geometry.pairs),
    representativeMaximumContributingDistanceInches: context.geometry.distanceInches,
    engagementGraphHash: context.graph.graphHash,
    attackerEngaged: context.engagement.attackerEngaged,
    targetEngaged: context.engagement.targetEngaged,
    ...(context.engagement.indomitableCrossEngagement ? {
      indomitableCrossEngagement: clone(context.engagement.indomitableCrossEngagement) } : {}),
    highGroundEvadeEligible: context.highGroundEvadeEligible,
    abilityEvadeModifier: context.abilityModifiers.evadeModifier,
    activePrecisionValue: context.attackerAbilityModifiers.precision,
    activeAntiEvadeValue: context.attackerAbilityModifiers.antiEvade,
    activeCriticalHitValue: context.attackerAbilityModifiers.criticalHit,
    attackPoolRemoval: clone(context.profileForBatch.attackPoolRemoval),
    reactionPolicy: clone(context.mechanicalPlan.reactionPolicy),
    evadeEligible: context.evadeEligible,
    evadeEligibilityReason: context.authoritativeEvadeReason,
    mechanicalEvadeAdapterUsed: context.evadeEligible
      && context.authoritativeEvadeReason
        !== "target_engaged_and_suffering_ranged_damage",
    fullModelPairVisibilityAndRangeDenominator: true,
    mixedStandardAndLongRangeHitGroupsExact: true,
    perModelBurstFireAndLockedInExact: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_ranged_action_instantiation",
    trainingTruth: false,
  };
  const rangedPlan = seal(planBody, "rangedPlanHash");
  const action = freezeDeep({
    actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    sideKey: domain.sideKey, phase: "assault", pieceId: piece.id,
    targetId: target.id, weaponName: context.profile.weaponName,
    rangedPlan, ruleAtomIds: profileRuleAtomIds(context.profile, state),
    executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
  });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_selected_roster_ranged_action_instantiation",
    trainingTruth: false,
  });
}

export function previewOfficialSelectedRosterRangedActionV1(state, domain, parameters) {
  const instantiated = instantiateOfficialSelectedRosterRangedActionV1(
    state, domain, parameters,
  );
  return previewRangedInstantiation(instantiated);
}

// Read-only queries on one fixed counterfactual need one COMPLETE enumeration,
// not a fresh all-side enumeration per target/profile. Never accept a caller's
// enumeration as authority: this factory derives its own from a private snapshot.
export function createOfficialSelectedRosterRangedPreviewBatchV1(state, options = {}) {
  const snapshot = freezeDeep(clone(state));
  return createRangedPreviewBatchFromOwnedState(snapshot, options);
}

function createRangedPreviewBatchFromOwnedState(snapshot, options) {
  PREVIEW_CONTEXTS_BY_OWNED_STATE.set(snapshot, { contexts: new Map(),
    observe: typeof options.observeContext === "function" ? options.observeContext : null });
  const enumeration = enumerateOfficialSelectedRosterRangedActionsV1(snapshot, {
    ...options, includeDisabled: true,
  });
  return Object.freeze({
    enumeration,
    preview(domain, parameters) {
      return previewRangedInstantiation(instantiateRangedFromVerifiedState(
        snapshot, domain, parameters, enumeration,
      ));
    },
    // Internal readonly CPU work only. A domain/parameter still passes the
    // COMPLETE native instantiation above; callers cannot supply a context.
    // Transfer the same native facts to the owned worker instead of recomputing
    // geometry after the parent has already done it on this fixed snapshot.
    previewWork(domain, parameters) {
      const instantiated = instantiateRangedFromVerifiedState(
        snapshot, domain, parameters, enumeration);
      const action = instantiated.action;
      const chanceContext = PREVIEW_CONTEXTS_BY_OWNED_STATE.get(snapshot).contexts
        .get(previewContextKey(action.sideKey, action.pieceId, action.targetId,
          action.rangedPlan.profileKey, action.rangedPlan.canonicalParameters, action.rangedPlan.attackMode));
      if (!chanceContext) fail("SELECTED_RANGED_OWNED_PREVIEW_CONTEXT_MISSING");
      return freezeDeep({ preview: previewRangedInstantiation(instantiated), chanceContext });
    },
  });
}

// One in-process readonly query owns one COMPLETE fixed snapshot. Its native
// preview, chance and casualty projections cannot substitute caller-provided
// state/context. The standalone and transferred-worker factories above/below
// still own and validate independent copies at their external seams.
export function createOfficialSelectedRosterRangedQueryBatchV1(state, options = {}) {
  const snapshot = freezeDeep(clone(state));
  const previews = createRangedPreviewBatchFromOwnedState(snapshot, options);
  const casualties = createCasualtyStrategyBatchFromOwnedState(snapshot);
  return Object.freeze({
    snapshot,
    enumeration: previews.enumeration,
    projectCasualty: casualties.project,
    // Exact selected-target diagnosis uses the SAME context/geometry routine as
    // menu/preview. An enumeration's first disabled target is not this proof.
    targetAvailability({pieceId,profileKey,targetUnitId,attackMode}) {
      const piece=snapshot.pieces.find(p=>p.id===pieceId),target=snapshot.pieces.find(p=>p.id===targetUnitId);
      if(!piece||!target)fail('SELECTED_RANGED_TARGET_DIAGNOSTIC_ID_INVALID');
      try {
        contextFor(snapshot,options.sideKey||snapshot.activeSideKey,piece,target,profileKey,{attackMode});
        return freezeDeep({pieceId,profileKey,targetUnitId,available:true,reason:null});
      } catch(error) {
        const reason=String(error.message).split(':')[0];
        if(!['SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE','BOMBARD_TARGET_OUTSIDE_AREA','BOMBARD_ATTACK_MODE_UNAVAILABLE'].includes(reason))throw error;
        return freezeDeep({pieceId,profileKey,targetUnitId,available:false,reason});
      }
    },
    previewWork(domain, parameters) {
      // Both action and context were just derived by the SAME native private
      // batch, not imported from a worker. Retain their actual owned objects;
      // no public flags, IDs or hashes authorize snapshot/context reuse.
      const work = previews.previewWork(domain, parameters);
      return Object.freeze({
        preview: work.preview,
        // Read-only branch transition from the SAME owned/verified snapshot as
        // preview. No caller state, context or resolved chance can be injected.
        // Uses exactly the public Apply continuation, including defender windows.
        applyChance(transitionOptions = {}) {
          const chance = resolveRangedChanceWithContext(snapshot,
            work.preview.action, transitionOptions, work.chanceContext);
          return applyVerifiedRangedChance(snapshot, work.preview.action,
            chance, transitionOptions);
        },
        createChanceResolver(resolverOptions = {}) {
          const startedAtMs = Date.now();
          const resolver = fixedRangedChanceResolver(
            snapshot, work.preview.action, work.chanceContext);
          try { resolverOptions.observeContext?.({
            stage: "ranged_chance_context_reused_from_preview",
            pieceId: work.preview.action.pieceId,
            targetUnitId: work.preview.action.targetId,
            startedAtMs, completedAtMs: Date.now(),
          }); } catch { /* Diagnostics only. */ }
          return resolver;
        },
      });
    },
  });
}

function previewRangedInstantiation(instantiated) {
  return seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    chance: clone(instantiated.action.rangedPlan.chance),
    eligibleAttackerModelIds:
      instantiated.action.rangedPlan.eligibleAttackerModelIds,
    visibleTargetModelIds: instantiated.action.rangedPlan.visibleTargetModelIds,
    mutationApplied: false, rulesAuthority: true,
    rulesTruth: "official_selected_roster_ranged_preview",
    trainingTruth: false,
  }, "previewHash");
}

function rangedChanceContextForAction(state, action) {
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const target = state.pieces.find((entry) => entry.id === action.targetId);
  return contextFor(
    state, action.sideKey, piece, target, action.rangedPlan.profileKey, {
      pointDefenseChoices: action.rangedPlan.canonicalParameters,
      attackMode: action.rangedPlan.attackMode,
    },
  );
}

// Owned choice continuations re-read the same legal action before splitting its
// dice into hit and defence stages. No caller-supplied combat context is used.
export function inspectOfficialSelectedRosterRangedActionContextV1(state, action) {
  const domain = enumerateOfficialSelectedRosterRangedActionsV1(state, {
    sideKey: action.sideKey,
  }).parameterDomains.find(row => row.domainId === action.rangedPlan?.domainId);
  const current = domain && instantiateOfficialSelectedRosterRangedActionV1(
    state, domain, action.rangedPlan.canonicalParameters);
  if (!current || !isDeepStrictEqual(current.action, action)) {
    fail("SELECTED_RANGED_ACTION_STALE");
  }
  return rangedChanceContextForAction(state, action);
}

export function resolveOfficialSelectedRosterRangedChanceV1(
  state, action, options = {},
) {
  return resolveRangedChanceWithContext(state, action, options,
    rangedChanceContextForAction(state, action));
}

// Probability sampling changes only dice/Precision choices, not the board,
// loadout or LOS. Own one private snapshot per experiment; never cache it by
// public unit ids or reuse it across Room revisions. The scalar API above keeps
// reading its caller's current state on every independent resolution.
export function createOfficialSelectedRosterRangedChanceResolverV1(state, action, options = {}) {
  const startedAtMs = Date.now();
  const snapshot = freezeDeep(clone(state));
  const fixedAction = freezeDeep(clone(action));
  const context = freezeDeep(rangedChanceContextForAction(snapshot, fixedAction));
  try { options.observeContext?.({ stage: "ranged_chance_context_constructed",
    pieceId: fixedAction.pieceId, targetUnitId: fixedAction.targetId,
    startedAtMs, completedAtMs: Date.now() }); } catch { /* Diagnostics only. */ }
  return fixedRangedChanceResolver(snapshot, fixedAction, context);
}

// Private readonly-work protocol, never consumed by public preview/Apply or a
// query argument. The Room adapter produced this native context and transferred
// it alongside its validated preview to a worker owning that same frozen state.
// Keep independent owned copies and the original resolver/sample stream. These
// consistency checks catch an internal crossed job; they grant no Rules authority.
export function createOfficialSelectedRosterRangedWorkChanceResolverV1(
  state, action, preparedContext, options = {},
) {
  const startedAtMs = Date.now();
  const snapshot = freezeDeep(clone(state));
  const fixedAction = freezeDeep(clone(action));
  const context = freezeDeep(clone(preparedContext));
  const plan = fixedAction.rangedPlan;
  if (!context || !plan
    || context.mechanicalPlan?.planHash !== plan.attackPlanHash
    || context.profile?.profileKey !== plan.profileKey
    || context.profile?.profileHash !== plan.sourceProfileHash
    || context.profileForBatch?.profileHash !== plan.batchProfileHash
    || context.loadout?.loadoutHash !== plan.weaponLoadoutHash
    || context.graph?.graphHash !== plan.engagementGraphHash
    || !isDeepStrictEqual(context.geometry?.pairs, plan.modelPairEvidence)
    || !isDeepStrictEqual(context.geometry?.eligibleAttackerModelIds,
      plan.eligibleAttackerModelIds)
    || !isDeepStrictEqual(context.geometry?.visibleTargetModelIds,
      plan.visibleTargetModelIds)) {
    fail("SELECTED_RANGED_OWNED_CHANCE_CONTEXT_MISMATCH");
  }
  try { options.observeContext?.({ stage: "ranged_chance_context_reused_from_preview",
    pieceId: fixedAction.pieceId, targetUnitId: fixedAction.targetId,
    startedAtMs, completedAtMs: Date.now() }); } catch { /* Diagnostics only. */ }
  return fixedRangedChanceResolver(snapshot, fixedAction, context);
}

function fixedRangedChanceResolver(snapshot, fixedAction, context) {
  const resolve = (options = {}) => resolveRangedChanceWithContext(
    snapshot, fixedAction, options, context,
  );
  return Object.freeze(Object.assign(resolve, {
    resolvePool: (options = {}) => resolveRangedPoolWithContext(context, options),
    casualtyDomainForResolution: (resolution) => rangedCasualtyDomainForResolution(
      snapshot, fixedAction, context, resolution,
    ),
  }));
}

function resolveRangedChanceWithContext(state, action, options, context) {
  context = armourReactionContext(state, action, context, options);
  const evadeModifier = readOfficialBeforeEvadeReactionModifierV1(state, action, action.targetId, options.beforeEvadeReactionTriggerHash);
  const { resolution } = resolveRangedPoolWithContext(context, options, { evadeModifier });
  const casualtyDomain = rangedCasualtyDomainForResolution(
    state, action, context, resolution,
  );
  return freezeDeep({ context, resolution, casualtyDomain });
}

export function inspectOfficialSelectedRosterEvadeDemandV1(state, action, context, options) {
  const defenceContext = armourReactionContext(state, action, context, options);
  const { resolution } = resolveRangedPoolWithContext(defenceContext, options, { armourRollOnly: true });
  return { count: resolution.stages.evade.dice, modifiable: defenceContext.mechanicalPlan.evade.characteristicUnmodifiable !== true };
}

function resolveRangedPoolWithContext(context, options, { armourRollOnly = false, hitRollOnly = false, evadeModifier = 0 } = {}) {
  const { exactEvadeDiceCount } = options;
  const mechanicalResolution = resolveMechanicalPlan(
    context.mechanicalPlan, options.chanceReveals, { armourRollOnly, hitRollOnly, exactEvadeDiceCount },
  );
  const stages = clone(mechanicalResolution.stages);
  const precisionValue = Number(context.attackerAbilityModifiers.precision || 0);
  const failedHitDieIndices = stages.hit.rolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll, index }) => !rollSucceeds(
      roll, stages.hit.thresholdByDieIndex[index]))
    .map(({ index }) => index);
  const convertedFailedHitDieIndices = [...new Set(
    (options.precisionConvertedFailedHitDieIndices || []).map(Number),
  )].sort((left, right) => left - right);
  if (convertedFailedHitDieIndices.length > precisionValue
    || convertedFailedHitDieIndices.some((index) => (
      !Number.isSafeInteger(index) || !failedHitDieIndices.includes(index)))) {
    fail("SELECTED_RANGED_PRECISION_SELECTION_INVALID");
  }
  const dodge = Number(context.abilityModifiers.dodge || 0);
  if (convertedFailedHitDieIndices.length > 0 || dodge > 0) {
    const originalHits = stages.hit.hits;
    const hits = originalHits + convertedFailedHitDieIndices.length;
    const surgeCapacity = stages.effects.surgeMatched
      ? stages.effects.surgeResults.reduce((sum, value) => sum + value, 0) : 0;
    const dodgeCounts = resolveOfficialDodgeTransferCountsV1({ armourPoolDice: hits, reduction: dodge, transferRequests: [
      { effectAtomId: 'attack-effect:surge-armour-bypass-v1', requestedDice: surgeCapacity },
      { effectAtomId: 'attack-effect:critical-hit-v1', requestedDice: Number(stages.effects.criticalHitCapacity || 0) },
    ] });
    const bypassedArmourHits = dodgeCounts.transferredDamagePoolDice;
    const armourDice = hits - bypassedArmourHits;
    const armourRolls = [...stages.armour.rolls,
      ...stages.armour.unusedPreallocatedRolls];
    const resolvedArmourRolls = armourRolls.slice(0, armourDice);
    const armourSaves = resolvedArmourRolls.filter((roll) => (
      rollSucceeds(roll, stages.armour.threshold))).length;
    const damagePoolBeforeEvade = bypassedArmourHits + armourDice - armourSaves;
    const evadeDice = stages.evade.eligible ? damagePoolBeforeEvade : 0;
    const evadeRolls = [...stages.evade.rolls, ...stages.evade.unusedPreallocatedRolls];
    const resolvedEvadeRolls = evadeRolls.slice(0, evadeDice);
    const evadeSaves = resolvedEvadeRolls.filter((roll) => (
      rollSucceeds(roll, stages.evade.effectiveThreshold))).length;
    const confirmedDamageDice = damagePoolBeforeEvade - evadeSaves;
    stages.hit = { ...stages.hit, originalHits, hits,
      failedHitDieIndices, convertedFailedHitDieIndices,
      precisionConvertedHits: convertedFailedHitDieIndices.length };
    stages.effects = { ...stages.effects, bypassedArmourHits,
      precisionApplied: convertedFailedHitDieIndices.length > 0, precisionValue,
      convertedDiceCountAsHitsForAllPurposes: true,
      ...(dodge > 0 ? { dodge, dodgeCounts } : {}) };
    stages.armour = { ...stages.armour, dice: armourDice,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(armourDice), saves: armourSaves };
    stages.evade = { ...stages.evade, dice: evadeDice,
      rolls: resolvedEvadeRolls,
      unusedPreallocatedRolls: evadeRolls.slice(evadeDice),
      damagePoolBeforeEvade, saves: evadeSaves, confirmedDamageDice };
    stages.damage = { ...stages.damage, damagePoolDice: confirmedDamageDice,
      totalDamage: confirmedDamageDice * stages.damage.damagePerDie };
  } else {
    stages.hit.failedHitDieIndices = failedHitDieIndices;
    stages.hit.convertedFailedHitDieIndices = [];
    stages.effects.precisionApplied = false;
    stages.effects.precisionValue = precisionValue;
  }
  if (options.toughConvertedFailedArmourDieIndices !== undefined) {
    applyToughArmourSelection(context, stages, options.toughConvertedFailedArmourDieIndices);
  }
  if (exactEvadeDiceCount !== undefined && stages.evade.dice !== exactEvadeDiceCount) {
    fail('SELECTED_RANGED_EVADE_COUNT_INVALID');
  }
  if (evadeModifier) {
    const planned = context.mechanicalPlan.evade;
    if (planned.characteristicUnmodifiable || !stages.evade.eligible || !stages.evade.dice) {
      fail('SELECTED_RANGED_EVADE_REACTION_NOT_APPLICABLE');
    }
    const effectiveThreshold = Math.max(2, Math.min(6, Number(planned.baseThreshold) + planned.antiEvade - evadeModifier));
    const saves = stages.evade.rolls.filter(roll => rollSucceeds(roll, effectiveThreshold)).length;
    const remaining = stages.evade.damagePoolBeforeEvade - saves;
    stages.evade = { ...stages.evade, effectiveThreshold, reactionRollModifier: evadeModifier, saves, confirmedDamageDice: remaining };
    stages.damage = { ...stages.damage, damagePoolDice: remaining, totalDamage: remaining * stages.damage.damagePerDie };
  }
  stages.evade.eligibilityReason = context.authoritativeEvadeReason;
  const resolution = seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_resolution_v1",
    mechanicalResolutionHash: mechanicalResolution.resolutionHash,
    attackPlanHash: context.mechanicalPlan.planHash,
    authoritativeEvadeReason: context.authoritativeEvadeReason,
    stages, reveals: clone(mechanicalResolution.reveals),
    precisionChoiceDomain: { failedHitDieIndices,
      maximumConvertedDice: Math.min(precisionValue, failedHitDieIndices.length),
      selectedFailedHitDieIndices: convertedFailedHitDieIndices,
      mayDecline: true },
    rulesTruth: "official_selected_roster_ranged_pool_resolution",
    trainingTruth: false,
  }, "resolutionHash");
  return freezeDeep({ context, resolution });
}

function applyToughArmourSelection(context, stages, selected) {
  const tough = Number(context.abilityModifiers.tough || 0);
  let choice;
  try {
    choice = resolveOfficialArmourChoiceV1({ rolls: stages.armour.rolls,
      threshold: stages.armour.threshold, tough, convertedFailedDieIndices: selected });
  } catch (error) {
    if (error.message === 'ARMOUR_SELECTION_INVALID') fail('SELECTED_RANGED_TOUGH_SELECTION_INVALID');
    throw error;
  }
  const armourSaves = choice.saves;
  const damagePoolBeforeEvade = stages.effects.bypassedArmourHits + stages.armour.dice - armourSaves;
  const evadeDice = stages.evade.eligible ? damagePoolBeforeEvade : 0;
  const allEvadeRolls = [...stages.evade.rolls, ...stages.evade.unusedPreallocatedRolls];
  const evadeRolls = allEvadeRolls.slice(0, evadeDice);
  const evadeSaves = evadeRolls.filter(roll => rollSucceeds(roll, stages.evade.effectiveThreshold)).length;
  const confirmedDamageDice = damagePoolBeforeEvade - evadeSaves;
  stages.armour = { ...stages.armour, ...choice };
  stages.evade = { ...stages.evade, dice: evadeDice, rolls: evadeRolls,
    unusedPreallocatedRolls: allEvadeRolls.slice(evadeDice),
    damagePoolBeforeEvade, saves: evadeSaves, confirmedDamageDice };
  stages.damage = { ...stages.damage, damagePoolDice: confirmedDamageDice,
    totalDamage: confirmedDamageDice * stages.damage.damagePerDie };
}

// Only actual Native hit/Surge/Armour reveals are accepted here. Evade has not
// been generated yet, so this projection exposes no damage or Evade outcome.
export function inspectOfficialSelectedRosterArmourChoiceV1(context, options) {
  const { resolution } = resolveRangedPoolWithContext(context, options, { armourRollOnly: true });
  const armour = resolution.stages.armour;
  const tough = Number(context.abilityModifiers.tough || 0);
  const facts = inspectOfficialArmourChoiceV1({ rolls: armour.rolls, threshold: armour.threshold, tough });
  return freezeDeep(seal({ schema: 'starcraft_tmg_ranged_armour_choice_facts_v1',
    attackPlanHash: context.mechanicalPlan.planHash, armour: clone(armour),
    tough, failedDieIndices: facts.failedDieIndices, maximumConvertedDice: facts.maximumConvertedDice,
    evadeDiceRolled: false, trainingTruth: false }, 'factsHash'));
}

// The actual hit/Surge prefix determines the Armour pool before any defence roll.
export function inspectOfficialSelectedRosterArmourDemandV1(context, options) {
  const { resolution } = resolveRangedPoolWithContext(context, options, { hitRollOnly: true });
  return freezeDeep(seal({ schema: 'starcraft_tmg_ranged_armour_demand_v1',
    attackPlanHash: context.mechanicalPlan.planHash,
    hits: resolution.stages.hit.hits, armourDice: resolution.stages.armour.dice,
    bypassedArmourHits: resolution.stages.effects.bypassedArmourHits,
    defenceDiceRolled: false, trainingTruth: false }, 'factsHash'));
}

function armourReactionContext(state, action, context, options = {}, targetId = action.targetId) {
  const triggerHash = options.beforeArmourReactionTriggerHash;
  if (triggerHash === undefined) return context;
  const resolution = (state.officialReactionResolutionHistory || []).find(row => row.triggerHash === triggerHash);
  const source = state.officialReactionFamilySourceBundle;
  const target = state.pieces.find(row => row.id === targetId);
  const validEffect = effect => {
    const route = source?.routes.find(row => row.definitionId === effect.definitionId);
    if (!route || effect.targetPieceId !== targetId
      || !['armour_tough', 'armour_dodge'].includes(effect.effectKind) || route.effectKind !== effect.effectKind
      || route.sourceFeatureHash !== effect.sourceFeatureHash || effect.sideKey !== target?.sideKey
      || Number(route.tough || 0) !== Number(effect.tough || 0)
      || Number(route.dodge || 0) !== Number(effect.dodge || 0)
      || effect.effectHash !== hashStarcraftTmgContract(without(effect, ['effectHash']))) return false;
    if (route.sourceKind === 'unit_feature') {
      return effect.sourceInstanceId === targetId && route.recordKey === target.officialUnitRecordKey;
    }
    return route.sourceKind === 'card_feature' && (state.cardResources[target.sideKey] || []).some(card =>
      card.cardInstanceId === effect.sourceInstanceId && card.officialCardRecordKey === route.recordKey);
  };
  if (source?.schema !== 'starcraft_tmg_official_reaction_family_source_bundle_v2'
    || !resolution || resolution.consumedByHost === true || resolution.triggerKind !== 'before_armour_roll'
    || resolution.sourceActionHash !== hashStarcraftTmgContract(action)
    || resolution.round !== Number(state.round) || resolution.phase !== state.phase
    || resolution.activeSideKey !== action.sideKey
    || resolution.resolutionHash !== hashStarcraftTmgContract(without(resolution, ['resolutionHash']))
    || resolution.effects.some(effect => !validEffect(effect))) {
    fail('SELECTED_RANGED_ARMOUR_REACTION_BINDING_INVALID');
  }
  const dodge = Math.max(0, ...resolution.effects.map(effect => Number(effect.dodge || 0)));
  return { ...context, abilityModifiers: { ...context.abilityModifiers,
    tough: Math.max(Number(context.abilityModifiers.tough || 0),
      ...resolution.effects.map(effect => Number(effect.tough || 0))),
    ...(dodge > 0 ? { dodge: Math.max(Number(context.abilityModifiers.dodge || 0), dodge) } : {}) } };
}

function rangedCasualtyDomainForResolution(state, action, context, resolution) {
  const target = state.pieces.find((entry) => entry.id === action.targetId);
  return createOfficialCurrentProductCasualtyDomainV1({
    targetPiece: target, targetProfile: context.targetProfile,
    discardAtConcentratedFireCap: usesWave3FaqClarifications(state),
    incomingDamage: Number(resolution.stages.damage.totalDamage),
    nonLethalStandardDamagePolicy: state.officialNonLethalStandardDamagePolicy,
    damagePoolReduction: resolution.stages.damage.reactionDamagePool || null,
    visibleModelIds: context.geometry.visibleTargetModelIds,
    engagementGraph: context.graph, attackResolutionHash: resolution.resolutionHash,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash,
    ...(effectById(context.profile, 'attack-effect:concentrated-fire-v1')
      ? { maximumCasualties: effectById(context.profile, 'attack-effect:concentrated-fire-v1').parameters.maximumCasualties } : {}),
  });
}

export function createOfficialCurrentProductCasualtyDomainV1(input) {
  const targetPiece = input.targetPiece;
  const hitPoints = Number(input.targetProfile.hitPoints);
  const shieldValue = Number(input.targetProfile.shield || 0);
  const priorDamageMarker = Number(targetPiece.damageMarker || 0);
  const incomingDamage = Number(input.incomingDamage);
  const shieldedBefore = shieldValue > 0 && statusNamed(targetPiece, "shielded");
  const shieldCapacityApplied = shieldValue > 0
    && targetPiece.firstModelShieldCapacityApplied !== false;
  const firstModelHitPoints = hitPoints + (shieldCapacityApplied ? shieldValue : 0);
  const pool = input.damagePoolReduction;
  if (pool && (pool.priorDamageMarker !== priorDamageMarker
    || pool.incomingDamage !== incomingDamage
    || pool.resolutionHash !== hashStarcraftTmgContract(without(pool,['resolutionHash'])))) {
    fail('SELECTED_RANGED_DAMAGE_POOL_BINDING_INVALID');
  }
  const totalDamage = pool ? pool.totalDamageAfterReduction : priorDamageMarker + incomingDamage;
  // NON-LETHAL can leave a valid marker above HP. An attack that deals no
  // standard damage must not turn that marker into casualties. The explicit
  // frozen policy gates the correction, retaining old Room wire results.
  const deferredNonLethal = hasOfficialNonLethalStandardDamagePolicyV1({
    officialNonLethalStandardDamagePolicy: input.nonLethalStandardDamagePolicy,
  }) && incomingDamage === 0;
  const uncappedCasualtyCount = deferredNonLethal || totalDamage < firstModelHitPoints ? 0
    : 1 + Math.floor((totalDamage - firstModelHitPoints) / hitPoints);
  const remainder = deferredNonLethal || totalDamage < firstModelHitPoints
    ? totalDamage : (totalDamage - firstModelHitPoints) % hitPoints;
  const projected = clone(targetPiece);
  projected.damageMarker = 0;
  const equivalentDamage = uncappedCasualtyCount === 0
    ? 0 : uncappedCasualtyCount * hitPoints + remainder;
  const baseDomain = CASUALTY_KERNEL.createDomain({
    targetPiece: projected, targetHitPoints: hitPoints, priorDamageMarker: 0,
    incomingDamage: equivalentDamage, visibleModelIds: input.visibleModelIds,
    engagementGraph: input.engagementGraph,
    attackResolutionHash: input.attackResolutionHash,
    rulesRuntimeHash: input.rulesRuntimeHash,
    ...(input.maximumCasualties !== undefined ? { maximumCasualties: input.maximumCasualties } : {}),
  });
  const casualtyCount = baseDomain.casualtyCount;
  const capReached = input.discardAtConcentratedFireCap && incomingDamage > 0
    && Number.isInteger(input.maximumCasualties) && casualtyCount === input.maximumCasualties;
  const discardRemainder = baseDomain.targetDestroyed || capReached
    || (baseDomain.casualtyCount < uncappedCasualtyCount);
  const postDamageMarker = discardRemainder ? 0 : remainder;
  const discardedOverflowDamage = discardRemainder
    ? Math.max(0, totalDamage - (casualtyCount === 0 ? 0
      : firstModelHitPoints + ((casualtyCount - 1) * hitPoints))) : 0;
  const shieldedAfter = deferredNonLethal ? shieldedBefore : shieldedBefore && casualtyCount === 0
    && postDamageMarker <= shieldValue;
  const legalSelections = baseDomain.legalSelections.map((selection) => {
    const body = { ...clone(without(selection, ["selectionHash"])),
      postDamageMarker, discardedOverflowDamage, shieldedAfter };
    return { ...body, selectionHash: hashStarcraftTmgContract(body) };
  });
  return seal({
    schema: "starcraft_tmg_official_current_product_casualty_domain_v1",
    baseDomain,
    targetPieceId: targetPiece.id,
    targetHitPoints: hitPoints,
    shieldValue,
    shieldedBefore,
    shieldCapacityApplied,
    firstModelHitPoints,
    priorDamageMarker,
    incomingDamage,
    ...(pool ? {damagePoolReduction:clone(pool)} : {}),
    totalDamage,
    casualtyCount,
    postDamageMarker,
    discardedOverflowDamage,
    shieldedAfter,
    targetDestroyed: baseDomain.targetDestroyed,
    visibleModelIds: clone(input.visibleModelIds),
    selectionMode: baseDomain.selectionMode || "enumerated_hashes",
    selectionContract: clone(baseDomain.selectionContract || null),
    legalSelectionCount: baseDomain.legalSelectionCount
      ?? legalSelections.length,
    materializedSelectionCount: legalSelections.length,
    legalSelections,
    rulesTruth: "official_current_product_shielded_and_multi_model_casualty_domain",
    trainingTruth: false,
  }, "domainHash");
}
function verifyOfficialCurrentProductCasualtyDomainV1(domain) {
  if (!object(domain)
    || domain.schema !== "starcraft_tmg_official_current_product_casualty_domain_v1"
    || domain.domainHash !== hashStarcraftTmgContract(without(domain, ["domainHash"]))) {
    fail("SELECTED_RANGED_CASUALTY_DOMAIN_INVALID");
  }
  return domain;
}
export function resolveOfficialCurrentProductCasualtyDomainV1(
  domain, selectionHash, casualtyModelIds = null,
) {
  verifyOfficialCurrentProductCasualtyDomainV1(domain);
  let selection = domain.legalSelections.find((entry) => (
    entry.selectionHash === selectionHash));
  if (Array.isArray(casualtyModelIds)) {
    const baseResolution = CASUALTY_KERNEL.resolve({
      domain: domain.baseDomain,
      casualtyModelIds,
    });
    const body = {
      schema: "starcraft_tmg_official_multi_model_casualty_selection_v1",
      targetPieceId: domain.targetPieceId,
      casualtyModelIds: clone(baseResolution.casualtyModelIds),
      remainingModelIds: clone(baseResolution.remainingModelIds),
      remainingEngagedEnemyUnitIds: clone(
        baseResolution.remainingEngagedEnemyUnitIds,
      ),
      postDamageMarker: domain.postDamageMarker,
      targetDestroyed: domain.targetDestroyed,
      discardedOverflowDamage: domain.discardedOverflowDamage,
      trainingTruth: false,
      shieldedAfter: domain.shieldedAfter,
    };
    const explicitSelection = {
      ...body,
      selectionHash: hashStarcraftTmgContract(body),
    };
    if (selectionHash && selectionHash !== explicitSelection.selectionHash) {
      fail("SELECTED_RANGED_CASUALTY_SELECTION_STALE");
    }
    selection = explicitSelection;
  }
  if (!selection) fail("SELECTED_RANGED_CASUALTY_SELECTION_STALE");
  return seal({
    schema: "starcraft_tmg_official_current_product_casualty_resolution_v1",
    domainHash: domain.domainHash,
    selectionHash,
    targetPieceId: domain.targetPieceId,
    casualtyModelIds: clone(selection.casualtyModelIds),
    remainingModelIds: clone(selection.remainingModelIds),
    remainingEngagedEnemyUnitIds: clone(selection.remainingEngagedEnemyUnitIds),
    postDamageMarker: selection.postDamageMarker,
    targetDestroyed: selection.targetDestroyed,
    discardedOverflowDamage: selection.discardedOverflowDamage,
    shieldedBefore: domain.shieldedBefore,
    shieldedAfter: selection.shieldedAfter,
    trainingTruth: false,
  }, "resolutionHash");
}

function exactCurrentSupply(profile, currentModels) {
  if (currentModels === 0) return 0;
  const tier = profile.squadProfile.find((entry) => (
    entry.minimumModels !== null && currentModels >= entry.minimumModels
      && currentModels <= entry.maximumModels
  ));
  if (!tier) fail("SELECTED_RANGED_SUPPLY_TIER_UNAVAILABLE", String(currentModels));
  return Number(tier.supply);
}
function sideHasAvailableAssaultActivation(state, sideKey) {
  if (state.players?.[sideKey]?.passedPhases?.assault === true) return false;
  return state.pieces.some((piece) => (
    piece.sideKey === sideKey && activePiece(piece)
      && piece.activatedPhases?.assault !== true
  ));
}
function consumeRestriction(piece, state, action) {
  const restriction = piece.disengageAssaultRestriction;
  if (!restriction) return null;
  const historyEntry = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_consumption_v1",
    restrictionHash: restriction.restrictionHash,
    declaredRound: restriction.declaredRound,
    consumedRound: Number(state.round), consumedPhase: "assault",
    consumedByActionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    consumedByActionHash: hashStarcraftTmgContract(action),
    tacticalMass: restriction.tacticalMass,
    rangedAttackWasProhibited: restriction.rangedAttackProhibited,
    trainingTruth: false,
  };
  piece.disengageAssaultRestrictionHistory = Array.isArray(
    piece.disengageAssaultRestrictionHistory,
  ) ? piece.disengageAssaultRestrictionHistory : [];
  piece.disengageAssaultRestrictionHistory.push(historyEntry);
  delete piece.disengageAssaultRestriction;
  return { type: "post_disengage_assault_restriction_consumed",
    pieceId: piece.id, restrictionHash: historyEntry.restrictionHash,
    consumedByActionType: historyEntry.consumedByActionType,
    consumedByActionHash: historyEntry.consumedByActionHash,
    tacticalMass: historyEntry.tacticalMass, trainingTruth: false };
}

function advanceRangedBatch(state, action, piece, profile, modelIds, completedBatch, priorSequence) {
  const priorOrdinaryModelIds = clone(priorSequence?.ordinaryModelIdsUsed || []);
  const sidearm = Boolean(effectById(profile, 'attack-effect:sidearm-v1'));
  const sequence = seal({
    schema: 'starcraft_tmg_official_current_product_ranged_sequence_v1',
    sideKey: action.sideKey, pieceId: piece.id, round: Number(state.round), phase: state.phase,
    usedProfileKeys: [...new Set([...(priorSequence?.usedProfileKeys || []), profile.profileKey])].sort(),
    ordinaryModelIdsUsed: sidearm ? priorOrdinaryModelIds
      : [...new Set([...priorOrdinaryModelIds, ...modelIds])].sort(),
    sidearmProfileKeysUsed: [...new Set([...(priorSequence?.sidearmProfileKeysUsed || []),
      ...(sidearm ? [profile.profileKey] : [])])].sort(),
    completedBatches: [...(priorSequence?.completedBatches || []), completedBatch],
    rulesTruth: 'official_current_product_sequential_ranged_batches', trainingTruth: false,
  }, 'sequenceHash');
  state.pendingCurrentProductRangedSequence = clone(sequence);
  const remainingProfiles = profilesAllowedByPending(state, piece, activeProfilesFor(state, piece).profiles);
  const sequenceContinues = remainingProfiles.length > 0;
  piece.activatedPhases = { movement: false, assault: false, combat: false,
    ...(piece.activatedPhases || {}), assault: !sequenceContinues };
  if (sequenceContinues) state.activeSideKey = action.sideKey;
  else {
    delete state.pendingCurrentProductRangedSequence;
    if (!openOfficialSelectedRosterAfterActionWindowV1(state, action.sideKey, piece.id, 'assault')) {
      alternateOfficialPhaseActivationV1(state, action.sideKey, 'assault', sideHasAvailableAssaultActivation);
    }
  }
  return { sequenceHash: sequence.sequenceHash, sequenceContinues,
    remainingProfileKeys: remainingProfiles.map(entry => entry.profileKey).sort() };
}

// The target can lose its last model while paying a target-selected reaction.
// Consume the declared batch without creating a dice or casualty receipt; keep
// the same remaining-weapon and activation lifecycle as a settled batch.
export function skipOfficialSelectedRosterDestroyedTargetBatchV1(state, action, receipt) {
  const target = state.pieces.find(row => row.id === action.targetId);
  const source = state.pieces.find(row => row.id === action.pieceId);
  const profile = activeProfilesFor(state, source).profiles.find(row => row.profileKey === action.rangedPlan.profileKey);
  if (!state.officialConsumePaymentPolicy || !target?.isDestroyed || target.currentModels !== 0
    || !profile || profile.profileHash !== action.rangedPlan.sourceProfileHash
    || receipt?.sacrificePieceId !== target.id || receipt.unitDestroyed !== true) {
    fail('SELECTED_RANGED_DESTROYED_TARGET_SKIP_INVALID');
  }
  const priorSequence = pendingSequence(state);
  const event = { type: 'ranged_batch_skipped', sideKey: action.sideKey, pieceId: source.id,
    targetId: target.id, profileKey: profile.profileKey, reason: 'target_destroyed_by_consume_payment',
    paymentReceiptHash: receipt.paymentReceiptHash, diceRolled: false, trainingTruth: false };
  Object.assign(event, advanceRangedBatch(state, action, source, profile, action.rangedPlan.eligibleAttackerModelIds,
    { profileKey: profile.profileKey, targetId: target.id, skipped: true,
      reason: event.reason, paymentReceiptHash: receipt.paymentReceiptHash }, priorSequence));
  state.log.at(-1).events.push(clone(event));
  return event;
}

function requireCurrentRangedFinishAction(stateInput, actionInput) {
  const pending = pendingSequence(stateInput);
  if (!pending || !object(actionInput)
    || actionInput.actionType !== OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || actionInput.executorVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || actionInput.sideKey !== pending.sideKey || actionInput.pieceId !== pending.pieceId
    || actionInput.sequenceHash !== pending.sequenceHash) {
    fail("SELECTED_RANGED_FINISH_ACTION_INVALID");
  }
  const current = enumerateOfficialSelectedRosterRangedActionsV1(stateInput, {
    sideKey: pending.sideKey, includeDisabled: true,
  }).candidates.find((entry) => entry.isEnabled === true
    && entry.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE);
  const currentAction = current ? without(current, [
    "isEnabled", "disabledReason", "score", "details",
  ]) : null;
  if (!currentAction || !isDeepStrictEqual(currentAction, actionInput)) {
    fail("SELECTED_RANGED_FINISH_ACTION_STALE");
  }
  return { pending, action: currentAction };
}

export function finishOfficialSelectedRosterRangedSequenceV1(
  stateInput, actionInput, options = {},
) {
  const { pending } = requireCurrentRangedFinishAction(stateInput, actionInput);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === pending.pieceId);
  piece.activatedPhases = { movement: false, assault: false, combat: false,
    ...(piece.activatedPhases || {}), assault: true };
  delete state.pendingCurrentProductRangedSequence;
  const events = [{ type: "ranged_attack_sequence_finished",
    sideKey: pending.sideKey, pieceId: pending.pieceId,
    completedBatchCount: pending.completedBatches.length,
    voluntaryStop: true, trainingTruth: false }];
  if (!openOfficialSelectedRosterAfterActionWindowV1(
    state, pending.sideKey, pending.pieceId, "assault", { actionPerformed: false })) {
    state.activeSideKey = alternateOfficialPhaseActivationV1(
      state, pending.sideKey, 'assault', sideHasAvailableAssaultActivation) ?? pending.sideKey;
  }
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(actionInput), events: clone(events) });
  return freezeDeep({ ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_ranged_finish_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0), state,
    action: clone(actionInput), events,
    rulesTruth: "official_current_product_ranged_sequence_finish",
    trainingTruth: false });
}

function openOfficialSelectedRosterRangedCasualtyChoiceV1(
  stateInput, actionInput, chance, options = {},
) {
  const state = clone(stateInput);
  const pendingBody = {
    schema:
      "starcraft_tmg_official_current_product_ranged_casualty_choice_v1",
    semanticVersion: "1.1.0",
    round: Number(state.round),
    phase: state.phase,
    attackerSideKey: actionInput.sideKey,
    defenderSideKey: otherSide(actionInput.sideKey),
    attackerPieceId: actionInput.pieceId,
    targetPieceId: actionInput.targetId,
    attackAction: clone(actionInput),
    attackActionHash: hashStarcraftTmgContract(actionInput),
    attackResolutionHash: chance.resolution.resolutionHash,
    resolvedChance: clone(chance),
    chanceReveals: clone(chance.resolution.reveals),
    casualtyDomain: clone(chance.casualtyDomain),
    casualtyDomainHash: chance.casualtyDomain.domainHash,
    currentSupplyBefore: Number(state.pieces.find((entry) =>
      entry.id === actionInput.targetId)?.currentSupply || 0),
    targetLeadingModelId: state.pieces.find((entry) =>
      entry.id === actionInput.targetId)?.leadingModelId || null,
    targetSquadProfile: clone(chance.context.targetProfile.squadProfile || []),
    targetStrategicLossContext: strategicLossContext(state,
      state.pieces.find((entry) => entry.id === actionInput.targetId)),
    destroyedSupplyVictoryPointRate:
      destroyedSupplyVictoryPointRate(state),
    defenderOwnsSelection: true,
    rulesTruth: "official_defender_owned_ranged_casualty_selection",
    trainingTruth: false,
  };
  const pending = {
    ...pendingBody,
    pendingHash: hashStarcraftTmgContract(pendingBody),
  };
  state.pendingCurrentProductRangedCasualtyChoice = pending;
  state.activeSideKey = pending.defenderSideKey;
  const events = [{
    type: "ranged_attack_roll_resolved_pending_defender_casualty",
    attackerSideKey: pending.attackerSideKey,
    defenderSideKey: pending.defenderSideKey,
    attackerPieceId: pending.attackerPieceId,
    targetPieceId: pending.targetPieceId,
    attackResolutionHash: pending.attackResolutionHash,
    casualtyDomainHash: pending.casualtyDomainHash,
    casualtyCount: pending.casualtyDomain.casualtyCount,
    legalSelectionCount: pending.casualtyDomain.legalSelectionCount,
    materializedSelectionCount: pending.casualtyDomain.legalSelections.length,
    chanceReveals: clone(pending.chanceReveals),
    stages: clone(chance.resolution.stages),
    pendingHash: pending.pendingHash,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: state.phase,
    action: clone(actionInput),
    events: clone(events),
  });
  return freezeDeep({
    ok: true,
    schemaVersion:
      "starcraft_tmg_selected_roster_ranged_casualty_pending_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    action: clone(actionInput),
    events,
    rulesTruth: "official_defender_owned_ranged_casualty_selection",
    trainingTruth: false,
  });
}

// A policy has already chosen native casualty parameters. The rich UI catalogue
// is not authority: derive the SAME action from the verified native pending
// domain and use the SAME settlement, without computing unused strategic menus.
// External receipts/actions/contexts cannot be supplied as trusted inputs.
export function applyOfficialSelectedRosterRangedCasualtyParametersV1(
  stateInput, parameters, options = {},
) {
  verifyRuntimeState(stateInput);
  const pending = pendingCasualtyChoice(stateInput);
  if (!pending) fail("SELECTED_RANGED_CASUALTY_ACTION_INVALID");
  const current = instantiateCasualtyParameters(pending, parameters);
  return settleVerifiedCasualtyChoice(stateInput, current.action, pending, options);
}

export function applyOfficialSelectedRosterRangedCasualtyChoiceV1(
  stateInput, actionInput, options = {},
) {
  const pending = pendingCasualtyChoice(stateInput);
  if (!pending || !object(actionInput)
    || actionInput.actionType
      !== OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_ACTION_TYPE
    || actionInput.resolutionStage !== "defender_casualty_selection"
    || actionInput.executorId
      !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || actionInput.executorVersion
      !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || actionInput.sideKey !== pending.defenderSideKey
    || actionInput.pieceId !== pending.targetPieceId
    || actionInput.attackerPieceId !== pending.attackerPieceId
    || actionInput.pendingHash !== pending.pendingHash
    || actionInput.casualtyDomainHash !== pending.casualtyDomainHash) {
    fail("SELECTED_RANGED_CASUALTY_ACTION_INVALID");
  }
  // The defender already chose a native selection. Rebuilding the rich UI
  // catalogue here (and again inside instantiate) has no bearing on legality
  // and makes replay repeat all alternative geometry/strategy calculations.
  // Retain runtime checks, current-pending membership and full action equality.
  verifyRuntimeState(stateInput);
  const casualtyParameters = Array.isArray(actionInput.casualtyModelIds)
    ? { casualtyModelIds: actionInput.casualtyModelIds }
    : { casualtySelectionHash: actionInput.casualtySelectionHash };
  const current = instantiateCasualtyParameters(pending, casualtyParameters);
  if (!isDeepStrictEqual(current.action, actionInput)) {
    fail("SELECTED_RANGED_CASUALTY_ACTION_STALE");
  }
  return settleVerifiedCasualtyChoice(stateInput, actionInput, pending, options);
}

function settleVerifiedCasualtyChoice(stateInput, actionInput, pending, options) {
  const restored = clone(stateInput);
  delete restored.pendingCurrentProductRangedCasualtyChoice;
  restored.activeSideKey = pending.attackerSideKey;
  const settled = settleOfficialSelectedRosterRangedResolvedChanceV1(
    restored,
    pending.attackAction,
    pending.resolvedChance,
    {
      ...options,
      chanceReveals: clone(pending.chanceReveals),
      casualtySelectionHash: actionInput.casualtySelectionHash,
      casualtyModelIds: clone(actionInput.casualtyModelIds || null),
    },
  );
  const state = clone(settled.state);
  const resolutionEvent = {
    type: "ranged_defender_casualty_selection_resolved",
    attackerSideKey: pending.attackerSideKey,
    defenderSideKey: pending.defenderSideKey,
    attackerPieceId: pending.attackerPieceId,
    targetPieceId: pending.targetPieceId,
    pendingHash: pending.pendingHash,
    casualtyDomainHash: pending.casualtyDomainHash,
    casualtySelectionHash: actionInput.casualtySelectionHash,
    casualtyModelIds: clone(actionInput.casualtyModelIds || null),
    defenderOwnedSelection: true,
    trainingTruth: false,
  };
  const events = [resolutionEvent, ...clone(settled.events || [])];
  const lastLog = state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(actionInput);
    lastLog.events = clone(events);
  }
  return freezeDeep({
    ok: true,
    schemaVersion:
      "starcraft_tmg_selected_roster_ranged_casualty_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    action: clone(actionInput),
    events,
    rulesTruth: "official_defender_owned_ranged_casualty_selection",
    trainingTruth: false,
  });
}

export function openOfficialSelectedRosterDamageReceivedWindowV1(state, action, {
  targetPieceId, incomingDamage, enemyReactionAllowed, outsideActivation = false,
}) {
  if (Number(incomingDamage) <= 0 || !state.officialReactionFamilySourceBundle) return null;
  const bundle=state.officialReactionFamilySourceBundle;
  const adapter=createOfficialReactionFamilyAdapterV1(bundle);
  const activationId=outsideActivation ? null : state.officialRepeatedActivationIdentityPolicy
    ? resolveOfficialArmourRollActivationIdV1(state,action.pieceId) : state.selectedRosterActivationWindow
      ? `${Number(state.round)}:${state.phase}:${state.selectedRosterActivationWindow.sideKey}:${state.selectedRosterActivationWindow.pieceId}`
      : `${Number(state.round)}:${state.phase}:${action.sideKey}:${action.pieceId}`;
  const sourceActionHash=hashStarcraftTmgContract(action);
  const opened=openOfficialReactionFamilyWindowV1(bundle,state,{
    triggerKind:'damage_received',activeSideKey:action.sideKey,phase:state.phase,
    activationId,sourceActionHash,resumeActionHash:sourceActionHash,
    context:{attackerPieceId:action.pieceId,actorPieceId:action.pieceId,
      targetPieceId,affectedPieceId:targetPieceId,validTargetUnitIds:[targetPieceId],
      incomingDamage,enemyReactionAllowed}});
  const [firstSide, secondSide] = opened.state.pendingOfficialReactionWindow.prioritySideKeys;
  const first=adapter.legalSpace(opened.state,{sideKey:firstSide});
  const pass=first.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
  const defender=pass ? adapter.apply(opened.state,{action:adapter.preview(opened.state,
    {domain:pass,parameters:{}}).action}) : null;
  const second=defender ? adapter.legalSpace(defender.state,{sideKey:secondSide}) : null;
  const hasReaction=[...first.parameterDomains,...(second?.parameterDomains||[])]
    .some(d=>d.actionType==='resolve_reaction_family_ability');
  return hasReaction ? opened : null; // No optional choice is invented or paid.
}

export function openOfficialSelectedRosterRangedDamageReactionV1(state,action,chance) {
  const incomingDamage = chance.resolution.stages.damage.totalDamage;
  if (Number(incomingDamage) <= 0 || !state.officialReactionFamilySourceBundle) return null;
  if (state.pendingCurrentProductRangedDamageReaction)
    fail('SELECTED_RANGED_DAMAGE_REACTION_ALREADY_PENDING');
  const opened = openOfficialSelectedRosterDamageReceivedWindowV1(state, action, {
    targetPieceId: action.targetId, incomingDamage,
    enemyReactionAllowed: action.rangedPlan.reactionPolicy?.enemyDeclarationAllowed !== false,
  });
  if (!opened) return null;
  const next=clone(opened.state);
  next.pendingCurrentProductRangedDamageReaction=seal({
    schema:'starcraft_tmg_official_ranged_damage_reaction_checkpoint_v1',
    attackAction:clone(action),resolvedChance:clone(chance),
    triggerHash:next.pendingOfficialReactionWindow.triggerHash,
    sourceActionHash:next.pendingOfficialReactionWindow.sourceActionHash,round:Number(state.round),phase:state.phase,
    rulesTruth:'native_ranged_damage_before_casualty_checkpoint',trainingTruth:false,
  },'checkpointHash');
  next.activeSideKey=next.pendingOfficialReactionWindow.prioritySideKeys[0];
  return freezeDeep({...opened,state:next,action:clone(action),
    runtimeId:OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion:OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION});
}

function applyNativeDamageReactionProjection(state,action,resolvedChance,projection) {
  const chance=clone(resolvedChance);
  const target=state.pieces.find(p=>p.id===action.targetId);
  const pool=resolveOfficialTotalDamagePoolReductionV1({
    priorDamageMarker:Number(target.damageMarker||0),
    incomingDamage:Number(chance.resolution.stages.damage.totalDamage),
    requestedReduction:projection.damageReduction,
    minimumDamage:projection.minimumDamage,
    reductionSourceHash:projection.resolutionHash});
  const stages=clone(chance.resolution.stages);
  stages.damage.reactionDamagePool=clone(pool);
  chance.resolution=seal({...without(chance.resolution,['resolutionHash']),stages,
    damageReactionResolutionHash:projection.resolutionHash},'resolutionHash');
  chance.casualtyDomain=rangedCasualtyDomainForResolution(state,action,chance.context,chance.resolution);
  return freezeDeep(chance);
}

export function validateOfficialRangedDamageReactionChoicesV1(choices) {
  const keys=['sideKey','choiceKind','definitionId','sourceInstanceId','paymentCardInstanceIds'];
  if (!Array.isArray(choices)||choices.length!==2||new Set(choices.map(c=>c?.sideKey)).size!==2
    ||choices.some(c=>!object(c)||!SIDE_KEYS.has(c.sideKey)
      ||Object.keys(c).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(c,k))
      ||!['pass','reaction'].includes(c.choiceKind)||!Array.isArray(c.paymentCardInstanceIds)
      ||c.paymentCardInstanceIds.some(id=>typeof id!=='string'||!id)
      ||new Set(c.paymentCardInstanceIds).size!==c.paymentCardInstanceIds.length
      ||(c.choiceKind==='pass'?(c.definitionId!==null||c.sourceInstanceId!==null||c.paymentCardInstanceIds.length!==0)
        :typeof c.definitionId!=='string'||!c.definitionId||typeof c.sourceInstanceId!=='string'||!c.sourceInstanceId))) {
    fail('SELECTED_RANGED_DAMAGE_REACTION_POLICY_INVALID');
  }
  return clone(choices);
}

// Read-only counterfactual policy on one actual sampled roll. Reuses the SAME
// window, payment, effect and pooled-casualty implementation as public Apply.
// No implicit best reaction, replacement choice or full-match continuation.
export function resolveOfficialSelectedRosterRangedDamageReactionPolicyV1({state,action,chance,choices}) {
  const selected=validateOfficialRangedDamageReactionChoicesV1(choices);
  const opened=openOfficialSelectedRosterRangedDamageReactionV1(state,action,chance);
  if (!opened) {
    if (Number(chance.resolution.stages.damage.totalDamage)>0
      &&selected.some(c=>c.choiceKind!=='pass')) fail('SELECTED_RANGED_DAMAGE_REACTION_CHOICE_NOT_LEGAL');
    return {chance,effects:[],payments:[],cardExhaustions:[],nativeReactionResolutionHash:null,
      positiveDamageTriggered:false,trainingTruth:false};
  }
  const adapter=createOfficialReactionFamilyAdapterV1(state.officialReactionFamilySourceBundle);
  let current=opened.state;
  const events=[];
  while (current.pendingOfficialReactionWindow) {
    const window=current.pendingOfficialReactionWindow;
    const sideKey=window.prioritySideKeys[window.priorityIndex];
    const choice=selected.find(c=>c.sideKey===sideKey);
    const domains=adapter.legalSpace(current,{sideKey}).parameterDomains;
    const domain=domains.find(d=>choice.choiceKind==='pass'
      ?d.actionType==='pass_reaction_family_window'
      :d.actionType==='resolve_reaction_family_ability'&&d.definitionId===choice.definitionId
        &&d.sourceInstanceId===choice.sourceInstanceId
        &&isDeepStrictEqual(d.parameterSchema.paymentCardInstanceIds.const,
          [...choice.paymentCardInstanceIds].sort()));
    if (!domain) fail('SELECTED_RANGED_DAMAGE_REACTION_CHOICE_NOT_LEGAL',sideKey);
    const parameters=choice.choiceKind==='pass'?{}:{paymentCardInstanceIds:choice.paymentCardInstanceIds};
    const result=adapter.apply(current,{action:adapter.preview(current,{domain,parameters}).action});
    events.push(...result.events.map(e=>({...e,policySideKey:sideKey})));current=result.state;
  }
  const consumed=consumeOfficialReactionFamilyResolutionV1(current,
    opened.state.pendingOfficialReactionWindow.triggerHash);
  const payments=events.filter(e=>e.type==='reaction_resource_paid').map(e=>({
    sideKey:e.policySideKey,
    resourceType:e.resourceType,cost:e.resourceCost,printedCost:e.printedResourceCost,
    exhaustedCardInstanceIds:clone(e.exhaustedCardInstanceIds)}));
  const cardExhaustions=Object.entries(state.cardResources||{}).flatMap(([sideKey,cards])=>cards
    .filter(c=>c.readiness==='ready'&&consumed.state.cardResources[sideKey].find(n=>n.cardInstanceId===c.cardInstanceId)?.readiness==='exhausted')
    .map(c=>({sideKey,cardInstanceId:c.cardInstanceId,resourceType:c.resourceType,printedResource:c.resource})));
  return freezeDeep({chance:applyNativeDamageReactionProjection(consumed.state,action,chance,consumed.projection),
    effects:clone(consumed.projection.effects),payments,cardExhaustions,
    nativeReactionResolutionHash:consumed.projection.resolutionHash,
    positiveDamageTriggered:true,trainingTruth:false});
}

// Called after the real reaction adapter closes BOTH priority choices. The
// recorded dice are not rolled again and payment is not replayed. A casualty
// choice stores this resolved chance and returns here only through settlement.
export function resumeOfficialSelectedRosterRangedDamageReactionV1(stateInput,options={}) {
  const pending=stateInput.pendingCurrentProductRangedDamageReaction;
  if (!pending || stateInput.pendingOfficialReactionWindow) return null;
  if (pending.schema!=='starcraft_tmg_official_ranged_damage_reaction_checkpoint_v1'
    || pending.checkpointHash!==hashStarcraftTmgContract(without(pending,['checkpointHash']))
    || pending.sourceActionHash!==hashStarcraftTmgContract(pending.attackAction)
    || pending.round!==Number(stateInput.round) || pending.phase!==stateInput.phase) {
    fail('SELECTED_RANGED_DAMAGE_REACTION_CHECKPOINT_INVALID');
  }
  const consumed=consumeOfficialReactionFamilyResolutionV1(stateInput,pending.triggerHash);
  const state=clone(consumed.state);
  delete state.pendingCurrentProductRangedDamageReaction;
  state.activeSideKey=pending.attackAction.sideKey;
  const chance=applyNativeDamageReactionProjection(state,pending.attackAction,pending.resolvedChance,consumed.projection);
  const pool=chance.resolution.stages.damage.reactionDamagePool;
  const settled=settleOfficialSelectedRosterRangedResolvedChanceV1(state,
    pending.attackAction,chance,options);
  const next=clone(settled.state);
  const event={type:'ranged_damage_reaction_resumed',triggerHash:pending.triggerHash,
    reactionResolutionHash:consumed.projection.resolutionHash,
    damagePool:clone(pool),chanceReusedWithoutReroll:true,trainingTruth:false};
  if (next.log?.length) next.log.at(-1).events=[event,...(next.log.at(-1).events||[])];
  return freezeDeep({...settled,state:next,events:[event,...settled.events]});
}

export function applyOfficialSelectedRosterRangedActionV1(
  stateInput, actionInput, options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || actionInput.executorVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || actionInput.rangedPlan?.schemaVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA) {
    fail("SELECTED_RANGED_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialSelectedRosterRangedActionsV1(stateInput, {
    sideKey: actionInput.sideKey, includeDisabled: true,
  });
  const domain = enumeration.parameterDomains.find((entry) =>
    entry.domainId === actionInput.rangedPlan.domainId);
  if (!domain) fail("SELECTED_RANGED_PARAMETER_DOMAIN_STALE");
  // Enumeration already verified this state, and no mutation or caller hook
  // occurs before instantiation. Reuse only this private local result; public
  // callers cannot supply prepared facts or bypass the exact action comparison.
  const current = instantiateRangedFromVerifiedState(
    stateInput, domain, actionInput.rangedPlan.canonicalParameters, enumeration,
  );
  if (!isDeepStrictEqual(current.action, actionInput)) {
    fail("SELECTED_RANGED_ACTION_STALE");
  }
  const chanceState = nativeContextStateForEnumeration(stateInput, enumeration);
  const chance = resolveOfficialSelectedRosterRangedChanceV1(chanceState, actionInput, options);
  return applyVerifiedRangedChance(stateInput, actionInput, chance, options);
}

function applyVerifiedRangedChance(stateInput, actionInput, chance, options) {
  const state = hasOfficialArmourRollOrdinalPolicyV1(stateInput) ? clone(stateInput) : stateInput;
  recordOfficialArmourRollV1(state, { action: actionInput, targetPieceId: actionInput.targetId,
    poolDice: chance.resolution.stages.armour.dice });
  const interrupted = openOfficialSelectedRosterRangedDamageReactionV1(state,actionInput,chance);
  if (interrupted) return interrupted;
  return settleOfficialSelectedRosterRangedResolvedChanceV1(state,actionInput,chance,options);
}

export function applyOfficialSelectedRosterResolvedDamageV1(state, target, targetProfile, casualty) {
  const shieldedLifecycle = hasOfficialShieldedLifecyclePolicyV1(state);
  for (const modelId of casualty.casualtyModelIds) {
    const model = target.models.find((entry) => entry.id === modelId);
    model.isDestroyed = true;
    model.isOnField = false;
    model.damage = targetProfile.hitPoints;
    model.remainingWounds = 0;
  }
  target.destroyedModelIds = target.models.filter((model) => model.isDestroyed === true)
    .map((model) => model.id).sort();
  target.currentModels = casualty.remainingModelIds.length;
  target.currentSupply = exactCurrentSupply(
    targetProfile, target.currentModels,
  );
  target.damageMarker = casualty.postDamageMarker;
  if (casualty.casualtyModelIds.length > 0) {
    target.firstModelShieldCapacityApplied = false;
  }
  if (casualty.shieldedBefore && !casualty.shieldedAfter) {
    target.statuses = (target.statuses || []).filter((entry) => normalizedName(
      typeof entry === "string" ? entry : entry?.statusName || entry?.name) !== "shielded");
    if (shieldedLifecycle) {
      const cleanup = collectOfficialShieldedDependentCleanupV1(state, target, { includeCurrentProductEffects: true });
      Object.assign(target, cleanup.set);
      if (cleanup.removeEffectMarkerIds.length) {
        state.board.effectMarkers = state.board.effectMarkers.filter(marker => !cleanup.removeEffectMarkerIds.includes(marker.id));
      }
      state.officialShieldedLifecycleHistory = state.officialShieldedLifecycleHistory || [];
      state.officialShieldedLifecycleHistory.push({ pieceId: target.id, round: Number(state.round), phase: state.phase,
        reason: casualty.casualtyModelIds.length ? 'first_model_removed' : 'total_damage_exceeds_shield_value',
        policyHash: state.officialShieldedLifecyclePolicy.policyHash,
        endedEffects: cleanup.endedEffects, removedEffectMarkerIds: cleanup.removeEffectMarkerIds, trainingTruth: false });
    }
  }
  target.isDestroyed = casualty.targetDestroyed;
  target.isOnField = !casualty.targetDestroyed;
  if (casualty.targetDestroyed) target.isInReserves = false;
  const firstRemainingModel = target.models.find((model) => (
    casualty.remainingModelIds.includes(model.id)));
  if (firstRemainingModel) {
    const remainingCapacity = Number(targetProfile.hitPoints)
      + (target.firstModelShieldCapacityApplied
        ? Number(targetProfile.shield || 0) : 0);
    firstRemainingModel.damage = casualty.postDamageMarker;
    firstRemainingModel.remainingWounds = Math.max(0,
      remainingCapacity - casualty.postDamageMarker);
  }
  synchronizeOfficialEffectiveHitPointWoundsV1(state, target, { includeUnmodifiedProfiles: shieldedLifecycle });
}

export function createOfficialSelectedRosterTemplateBatchContextV1({ state, pieceId, targetUnitId, profileKey, geometry }) {
  verifyRuntimeState(state);
  const piece = state.pieces.find(row => row.id === pieceId);
  const target = state.pieces.find(row => row.id === targetUnitId);
  const profile = projectOfficialRangedDeclarationProfileV1(state, pieceId,
    getOfficialAttackProfileV3(state.officialAttackProfileCatalogue, profileKey));
  if (!piece || !target || profile.templateWeapon?.templateType !== 'blast'
    || profile.recordKey !== piece.officialUnitRecordKey || !geometry.templateBatch
    || profile.sourceRecordHash !== piece.sourceRecordHash || profile.payloadHash !== piece.officialPayloadHash) {
    fail('SELECTED_RANGED_TEMPLATE_SOURCE_INVALID');
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  const engagement = { attackerEngaged: graph.engagedUnitIds.includes(piece.id),
    targetEngaged: graph.engagedUnitIds.includes(target.id), mutuallyEngaged: graphHasUnitPair(graph, piece.id, target.id) };
  if (hasOfficialIndomitableTemplateBatchPolicyV1(state)) {
    const crossEngagement = indomitableCrossEngagementFor(state, piece, target, engagement.attackerEngaged, engagement.targetEngaged);
    if (crossEngagement) engagement.indomitableCrossEngagement = crossEngagement;
  }
  const targetProfile = resolveOfficialEffectiveCombatProfileV1(state, target);
  return freezeDeep({ profile, targetProfile, geometry, graph, engagement,
    ...planAttackResolution(state, piece, target, profile, geometry, targetProfile, engagement, graph) });
}

export function completeOfficialSelectedRosterStandaloneRangedWeaponV1(state, action) {
  const piece = state.pieces.find(row => row.id === action.pieceId);
  consumeOfficialSelectedRosterFirstWeaponModifierV1(state, piece.id, action.weaponName);
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle
    ? consumeOfficialCharacteristicStatusFirstWeaponEffectsV1(state, piece.id, 'ranged',action.weaponName) : [];
  const battlefield = state.officialBattlefieldAssetFamilySourceBundle
    ? consumeOfficialBattlefieldAssetFirstWeaponEffectsV1(state, piece.id, action.weaponName) : null;
  const protoss = state.officialProtossUniqueFamilySourceBundle
    ? consumeOfficialProtossUniqueFirstWeaponEffectV1(state, piece.id, action.weaponName) : [];
  const restriction = consumeRestriction(piece, state, action);
  piece.activatedPhases = { ...(piece.activatedPhases || {}), assault: true };
  if (!activePiece(piece) && state.selectedRosterActivationWindow?.pieceId === piece.id) {
    delete state.selectedRosterActivationWindow;
  }
  const afterAction = activePiece(piece) && openOfficialSelectedRosterAfterActionWindowV1(state, action.sideKey, piece.id, 'assault');
  state.activeSideKey = afterAction ? action.sideKey : (alternateOfficialPhaseActivationV1(
    state, action.sideKey, 'assault', sideHasAvailableAssaultActivation) ?? action.sideKey);
  return [{ type: 'ranged_weapon_completed', pieceId: piece.id,
    consumedCharacteristicFirstWeaponEffects: characteristic,
    consumedBattlefieldAssetFirstWeaponEffects: battlefield?.consumedEffectHashes || [],
    consumedProtossFirstWeaponEffects: protoss, trainingTruth: false }, ...(restriction ? [restriction] : [])];
}

export { resolveRangedChanceWithContext as resolveOfficialSelectedRosterBatchChanceV1,
  armourReactionContext as projectOfficialSelectedRosterArmourReactionContextV1,
  applyNativeDamageReactionProjection as applyOfficialRangedDamageReactionProjectionV1 };

export function removeOfficialPointDefenseSourceV1(state, sourceId, protectedTargetId, removedDiceCount) {
  if (!Number.isSafeInteger(removedDiceCount) || removedDiceCount < 0 || removedDiceCount > 2) {
    fail('SELECTED_RANGED_POINT_DEFENSE_REMOVAL_COUNT_INVALID');
  }
  const source = state.pieces.find(row => row.id === sourceId);
  if (!source || !activePiece(source)) return null;
  source.currentModels = 0;
  source.currentSupply = 0;
  source.isDestroyed = true;
  source.isOnField = false;
  source.isInReserves = false;
  source.destroyedModelIds = source.models.map(model => model.id).sort();
  for (const model of source.models) {
    model.isDestroyed = true;
    model.isOnField = false;
    model.remainingWounds = 0;
  }
  return { type: 'point_defense_drone_removed', pieceId: source.id, protectedTargetId,
    attackPoolDiceRemoved: removedDiceCount, trainingTruth: false };
}

function settleOfficialSelectedRosterRangedResolvedChanceV1(stateInput,actionInput,chance,options={}) {
  const selectionHash = String(options.casualtySelectionHash
    || (chance.casualtyDomain.legalSelections.length === 1
      ? chance.casualtyDomain.legalSelections[0].selectionHash : ""));
  const casualtyModelIds = Array.isArray(options.casualtyModelIds)
    ? options.casualtyModelIds : null;
  if (!selectionHash && !casualtyModelIds) {
    return openOfficialSelectedRosterRangedCasualtyChoiceV1(
      stateInput, actionInput, chance, options,
    );
  }
  const casualty = resolveOfficialCurrentProductCasualtyDomainV1(
    chance.casualtyDomain, selectionHash, casualtyModelIds);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const beforeSupply = Number(target.currentSupply);
  applyOfficialSelectedRosterResolvedDamageV1(state, target, chance.context.targetProfile, casualty);
  const consumedFirstGameWeaponUses = consumeOfficialCharacteristicStatusFirstGameWeaponV1(state, {
    pieceId: piece.id, weaponName: actionInput.weaponName,
    sourceProfileHash: actionInput.rangedPlan.sourceProfileHash,
    attackResolutionHash: chance.resolution.resolutionHash,
  });
  const priorSequence = pendingSequence(stateInput);
  if (!priorSequence) consumeOfficialSelectedRosterFirstWeaponModifierV1(state, piece.id, actionInput.weaponName);
  const consumedCharacteristicEffects = !priorSequence
    && state.officialCharacteristicStatusFamilySourceBundle
    ? consumeOfficialCharacteristicStatusFirstWeaponEffectsV1(
      state, piece.id, "ranged",actionInput.weaponName) : [];
  const consumedBattlefieldAssetEffects = !priorSequence
    && state.officialBattlefieldAssetFamilySourceBundle
    ? consumeOfficialBattlefieldAssetFirstWeaponEffectsV1(state, piece.id, actionInput.weaponName) : null;
  const consumedProtossFirstWeaponEffects = !priorSequence
    && state.officialProtossUniqueFamilySourceBundle
    ? consumeOfficialProtossUniqueFirstWeaponEffectV1(state, piece.id, actionInput.weaponName) : [];
  const pointDefenseSourcePieceIds = chance.context.profileForBatch.instant
    ? [] : clone(chance.context.profileForBatch.attackPoolRemoval
      .pointDefenseSourcePieceIds || []);
  const pointDefenseEvents = [];
  let remainingPointDefenseDice = Number(
    chance.context.profileForBatch.attackPoolRemoval.pointDefenseDice || 0);
  for (const sourceId of pointDefenseSourcePieceIds) {
    const removedBySource = Math.min(2, remainingPointDefenseDice);
    const event = removeOfficialPointDefenseSourceV1(state, sourceId, target.id, removedBySource);
    if (event) {
      remainingPointDefenseDice -= removedBySource;
      pointDefenseEvents.push(event);
    }
  }
  const restrictionEvent = consumeRestriction(piece, state, actionInput);
  const rangedTargetDesignation = projectOfficialLungeRangedTargetDesignationV1(stateInput, actionInput);
  const rangedEvent = {
    type: "ranged_attack", sideKey: actionInput.sideKey,
    ...(rangedTargetDesignation ? { rangedTargetDesignation } : {}),
    pieceId: piece.id, targetId: target.id,
    weaponName: actionInput.weaponName,
    sourceProfileHash: actionInput.rangedPlan.sourceProfileHash,
    batchProfileHash: actionInput.rangedPlan.batchProfileHash,
    attackPlanHash: actionInput.rangedPlan.attackPlanHash,
    attackResolutionHash: chance.resolution.resolutionHash,
    casualtyDomainHash: chance.casualtyDomain.domainHash,
    ...(actionInput.rangedPlan.attackMode ? { attackMode: actionInput.rangedPlan.attackMode,
      bombard: clone(actionInput.rangedPlan.bombard) } : {}),
    casualtyResolutionHash: casualty.resolutionHash,
    ...(chance.casualtyDomain.baseDomain.maximumCasualties !== undefined ? { concentratedFire: {
      maximumCasualties: chance.casualtyDomain.baseDomain.maximumCasualties,
      uncappedCasualtyCount: chance.casualtyDomain.baseDomain.uncappedCasualtyCount,
      discardedOverflowDamage: casualty.discardedOverflowDamage,
    } } : {}),
    eligibleAttackerModelIds: actionInput.rangedPlan.eligibleAttackerModelIds,
    visibleTargetModelIds: actionInput.rangedPlan.visibleTargetModelIds,
    chanceReveals: chance.resolution.reveals,
    stages: chance.resolution.stages,
    casualtyModelIds: casualty.casualtyModelIds,
    postDamageMarker: casualty.postDamageMarker,
    targetDestroyed: casualty.targetDestroyed,
    shieldedBefore: casualty.shieldedBefore,
    shieldedAfter: casualty.shieldedAfter,
    pointDefenseSourcePieceIds,
    consumedCharacteristicFirstWeaponEffects: consumedCharacteristicEffects,
    ...(consumedFirstGameWeaponUses.length ? { consumedFirstGameWeaponUses } : {}),
    consumedBattlefieldAssetFirstWeaponEffects:
      consumedBattlefieldAssetEffects?.consumedEffectHashes || [],
    consumedProtossFirstWeaponEffects,
    currentSupplyBefore: beforeSupply,
    currentSupplyAfter: Number(target.currentSupply),
    evadeEligibilityReason: actionInput.rangedPlan.evadeEligibilityReason,
    ...(actionInput.rangedPlan.indomitableCrossEngagement ? {
      indomitableCrossEngagement: clone(actionInput.rangedPlan.indomitableCrossEngagement) } : {}),
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    trainingTruth: false,
  };
  const events = [rangedEvent, ...pointDefenseEvents,
    ...(restrictionEvent ? [restrictionEvent] : [])];
  Object.assign(rangedEvent, advanceRangedBatch(state, actionInput, piece, chance.context.profile,
    chance.context.geometry.eligibleAttackerModelIds, {
      profileKey: chance.context.profile.profileKey, targetId: target.id,
      attackResolutionHash: chance.resolution.resolutionHash, casualtyResolutionHash: casualty.resolutionHash,
    }, priorSequence));
  const supply = recordOfficialSupplyLossesV1({
    stateBefore: stateInput, stateAfter: state, action: actionInput, events,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash,
  });
  state.supplyLossLedger = clone(supply.ledger);
  events.push(...supply.supplyLossEvents.map(clone));
  state.rangedActionHistory = Array.isArray(state.rangedActionHistory)
    ? state.rangedActionHistory : [];
  state.rangedActionHistory.push({
    round: Number(state.round), phase: state.phase, pieceId: piece.id,
    targetId: target.id, rangedPlanHash: actionInput.rangedPlan.rangedPlanHash,
    resolutionHash: chance.resolution.resolutionHash,
    casualtyResolutionHash: casualty.resolutionHash, trainingTruth: false,
  });
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(actionInput), events: clone(events) });
  return freezeDeep({
    ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_ranged_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0), state,
    action: clone(actionInput), events,
    rulesTruth: "official_selected_roster_ranged_transition",
    trainingTruth: false,
  });
}

export function queryOfficialSelectedRosterRangedActionV1(input = {}) {
  const state = input.state;
  const request = input.request;
  const queryKind = String(request?.queryKind || request?.kind || "");
  if (!["instantiate_parameterized_action", "line_of_sight_and_attack_pool",
    "resolve_chance_and_casualty_domain"].includes(queryKind)) {
    fail("SELECTED_RANGED_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  const domain = enumerateOfficialSelectedRosterRangedActionsV1(state, {
    sideKey: request.sideKey || state.activeSideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === request.domainId);
  if (!domain) fail("SELECTED_RANGED_QUERY_DOMAIN_STALE");
  const preview = previewOfficialSelectedRosterRangedActionV1(
    state, domain, request.parameters || {},
  );
  const chance = queryKind === "resolve_chance_and_casualty_domain"
    ? resolveOfficialSelectedRosterRangedChanceV1(state, preview.action, {
      chanceReveals: request.chanceReveals,
      precisionConvertedFailedHitDieIndices:
        request.precisionConvertedFailedHitDieIndices,
    }) : null;
  return seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_query_v1",
    semanticVersion: "1.0.0", ok: true, precision: "exact",
    queryKind, domainId: domain.domainId,
    result: { preview, action: preview.action,
      resolution: chance?.resolution || null,
      casualtyDomain: chance?.casualtyDomain || null },
    source: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false,
  }, "queryReceiptHash");
}

export function applyOfficialSelectedRosterRangedRuntimeActionV1(
  state, action, options = {},
) {
  if (action?.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE) {
    return finishOfficialSelectedRosterRangedSequenceV1(
      state, action, options,
    );
  }
  if (action?.resolutionStage === "defender_casualty_selection") {
    return applyOfficialSelectedRosterRangedCasualtyChoiceV1(
      state, action, options,
    );
  }
  return applyOfficialSelectedRosterRangedActionV1(state, action, options);
}

export function createOfficialSelectedRosterRangedActionRuntimeV1(state) {
  verifyRuntimeState(state);
  const selectedRecordKeys = new Set(state.pieces.map(piece => piece.officialUnitRecordKey));
  const morphProfiles = new Map((state.officialRespawnMorphDataBundle?.currentMorphCarriers ?? [])
    .map(row => [row.createdUnitProfile.recordKey, row.createdUnitProfile]));
  const generatedBundle = state.officialGeneratedUnitDataBundle;
  if (generatedBundle) verifyOfficialGeneratedUnitDataBundleV2(generatedBundle);
  const generatedProfiles = new Map((generatedBundle?.profiles ?? []).map(profile => [profile.recordKey, profile]));
  // Capability registration describes source profiles the executor can serve.
  // Current mode, upgrades and activation eligibility still gate each menu.
  const supportedProfileKeys = new Set(state.officialAttackProfileCatalogue.profiles
    .filter(profile => {
      const producedUnit = morphProfiles.get(profile.recordKey) ?? generatedProfiles.get(profile.recordKey);
      const isDefaultProducedWeapon = producedUnit && producedUnit.sourceRecordHash === profile.sourceRecordHash
        && producedUnit.payloadHash === profile.payloadHash
        && isOfficialRosterAttackProfileFieldedV1(state, { selectedUpgradeNames: [] }, profile);
      return (selectedRecordKeys.has(profile.recordKey) || isDefaultProducedWeapon)
        && profile.phase === 'assault' && profile.range.kind === 'inches';
    })
    .map(profile => profile.profileKey));
  const noRangedUnitIds = [];
  const routes = [];
  for (const piece of state.pieces) {
    const { loadout, profiles } = activeProfilesFor(state, piece, { activeOnly: false });
    if (profiles.length === 0) noRangedUnitIds.push(piece.id);
    for (const profile of profiles) routes.push({
      routeId: `${piece.id}:${profile.profileKey}`,
      pieceId: piece.id, officialUnitRecordKey: piece.officialUnitRecordKey,
      actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE, phase: "assault",
      profileKey: profile.profileKey, profileHash: profile.profileHash,
      weaponName: profile.weaponName, loadoutHash: loadout.loadoutHash,
      routeStatus: "executable_exact",
      executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
      ruleAtomIds: profileRuleAtomIds(profile, state),
    });
  }
  routes.sort((left, right) => left.routeId.localeCompare(right.routeId));
  noRangedUnitIds.sort();
  const pendingTemplateRoutes = state.pieces.flatMap(piece =>
    (state.officialAttackProfileCatalogue.templateProfiles || []).filter(profile =>
      profile.recordKey === piece.officialUnitRecordKey && isOfficialRosterAttackProfileFieldedV1(state, piece, profile))
      .map(profile => ({ pieceId: piece.id, profileKey: profile.profileKey,
        weaponName: profile.weaponName, requirement: profile.executionRequirement })));
  const descriptor = seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_runtime_descriptor_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    selectedUnitCount: state.pieces.length,
    selectedRangedUnitCount: new Set(routes.map((route) => route.pieceId)).size,
    selectedRangedRouteCount: routes.length,
    selectedNoRangedUnitCount: noRangedUnitIds.length,
    noRangedUnitIds, unsupportedSelectedRangedRouteCount: pendingTemplateRoutes.length,
    ...(pendingTemplateRoutes.length ? { pendingTemplateRoutes } : {}),
    routes, actions: [OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
      OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE],
    geometryScope: "current_product_scale_bound_bases_certified_terrain_v1",
    terrainLosProjectionPolicy: "movement_kind_independent_los_v2",
    enumerationFailurePolicy: "known_rules_rejections_only_v1",
    arbitraryRosterClosureClaimed: false,
    fullModelPairVisibilityAndRangeDenominator: true,
    elevatedAndGrassLineOfSightExact: true,
    multiModelAttackPoolAndCasualtySelectionExact: true,
    paidUnselectedAdditionalWeaponsFilteredFromLoadout: true,
    supplyLossLedgerIntegrated: true,
    activeEvadeModifiersApplied: true,
    activePrecisionValueExposedToChoiceLifecycle: true,
    defenderPointDefenseChoiceBoundIntoActionPlan: true,
    sequentialWeaponBatchesAndVoluntaryFinishExact: true,
    afterActionAbilityWindowIntegrated: true,
    damageReactionBeforeCasualtyIntegrated: true,
    legalSpacePreviewApplyAndQueryShareInstantiation: true,
    sourceRefreshPerformed: false, productionRoomEligible: false,
    rulesTruth: "official_selected_roster_ranged_runtime",
    trainingTruth: false,
  }, "runtimeHash");
  return freezeDeep({ descriptor,
    enumerate: enumerateOfficialSelectedRosterRangedActionsV1,
    instantiate: instantiateOfficialSelectedRosterRangedActionV1,
    preview: previewOfficialSelectedRosterRangedActionV1,
    previewFinish(state, action) {
      return freezeDeep({ action: requireCurrentRangedFinishAction(state, action).action, chanceRequests: [] });
    },
    resolveChance: resolveOfficialSelectedRosterRangedChanceV1,
    inspectEvadeDemand: (state, action, options) => inspectOfficialSelectedRosterEvadeDemandV1(
      state, action, inspectOfficialSelectedRosterRangedActionContextV1(state, action), options),
    inspectContext: inspectOfficialSelectedRosterRangedActionContextV1,
    inspectArmourDemand: (state, action, options) => inspectOfficialSelectedRosterArmourDemandV1(
      inspectOfficialSelectedRosterRangedActionContextV1(state, action), options),
    inspectArmour: (state, action, options) => inspectOfficialSelectedRosterArmourChoiceV1(
      armourReactionContext(state, action, inspectOfficialSelectedRosterRangedActionContextV1(state, action), options), options),
    supportsProfile: profileKey => supportedProfileKeys.has(profileKey),
    skipDestroyedTargetBatch: skipOfficialSelectedRosterDestroyedTargetBatchV1,
    apply: applyOfficialSelectedRosterRangedRuntimeActionV1,
    query: queryOfficialSelectedRosterRangedActionV1 });
}

export function verifyOfficialSelectedRosterRangedRuntimeDescriptorV1(descriptor) {
  if (!object(descriptor)
    || descriptor.runtimeId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || descriptor.runtimeVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || descriptor.runtimeHash !== hashStarcraftTmgContract(
      without(descriptor, ["runtimeHash"]))
    || !Number.isSafeInteger(descriptor.selectedUnitCount)
    || descriptor.selectedUnitCount < 1
    || !Number.isSafeInteger(descriptor.selectedRangedUnitCount)
    || descriptor.selectedRangedUnitCount < 0
    || !Number.isSafeInteger(descriptor.selectedRangedRouteCount)
    || descriptor.selectedRangedRouteCount < 0
    || !Number.isSafeInteger(descriptor.selectedNoRangedUnitCount)
    || descriptor.selectedNoRangedUnitCount < 0
    || descriptor.selectedRangedUnitCount + descriptor.selectedNoRangedUnitCount
      !== descriptor.selectedUnitCount
    || descriptor.unsupportedSelectedRangedRouteCount !== (descriptor.pendingTemplateRoutes?.length || 0)
    || descriptor.routes?.length !== descriptor.selectedRangedRouteCount
    || descriptor.noRangedUnitIds?.length !== descriptor.selectedNoRangedUnitCount
    || new Set(descriptor.routes.map((entry) => entry.pieceId)).size
      !== descriptor.selectedRangedUnitCount
    || descriptor.fullModelPairVisibilityAndRangeDenominator !== true
    || descriptor.defenderPointDefenseChoiceBoundIntoActionPlan !== true
    || descriptor.sequentialWeaponBatchesAndVoluntaryFinishExact !== true
    || descriptor.legalSpacePreviewApplyAndQueryShareInstantiation !== true
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.trainingTruth !== false) {
    fail("SELECTED_RANGED_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
