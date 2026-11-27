import { officialSecondChargeGrantV1, isOfficialSecondChargeResolutionV1 } from './official-artanis-second-charge-v1.mjs';
import { alternateOfficialPhaseActivationV1 } from '../rule-atoms/official-phase-activation-availability-v1.mjs';
import { readOfficialBeforeEvadeReactionModifierV1 } from './official-reaction-family-adapter-v1.mjs';
import { consumeOfficialForceWallCrossingsV1 } from './official-force-wall-v1.mjs';
import { canOfficialUnitChargeV1, canOfficialUnitsEngageV1 } from '../rule-atoms/official-decoy-rules-v1.mjs';
import { resolveOfficialDodgeTransferCountsV1 } from '../rule-atoms/official-dodge-resolution-kernel-v1.mjs';
import { hasOfficialMeleeSidearmPolicyV1, isOfficialMeleeSidearmCarrierV1,
  readOfficialMeleeSidearmSequenceV1, isOfficialMeleeSidearmProfileAllowedV1, recordOfficialMeleeSidearmBatchV1,
  OFFICIAL_MELEE_SIDEARM_ATOM_ID, OFFICIAL_MELEE_SIDEARM_FINISH_ACTION } from './official-melee-sidearm-sequence-v1.mjs';
import { hasOfficialCharacteristicConsumerPolicyV1, isOfficialBurrowedCoreActorV1,
  projectOfficialHorizontalCoherencyV1, resolveOfficialMovementSpeedV1,
  consumeOfficialCharacteristicBurrowedMovementV1, requiresOfficialBurrowedCloseRanksV1 } from './official-characteristic-status-family-adapter-v1.mjs';
import { planOfficialArmourThresholdV1, consumeOfficialArmourThresholdV1 } from "../rule-atoms/official-armour-threshold-policy-v1.mjs";
import { recordOfficialArmourRollV1, resolveOfficialArmourRollActivationIdV1 } from "../rule-atoms/official-armour-roll-ordinal-v1.mjs";
import { resolveOfficialTotalDamagePoolReductionV1 } from "../rule-atoms/official-total-damage-reaction-kernel-v1.mjs";
import { consumeOfficialReactionFamilyResolutionV1 } from "./official-reaction-family-adapter-v1.mjs";
import {proveOfficialChargeClosestPositionV1} from '../rule-atoms/official-charge-closest-position-proof-v1.mjs';
import { hasOfficialImpactAllocationPolicyV13, OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 } from '../rule-atoms/official-impact-allocation-policy-v13.mjs';
import { projectOfficialUnitRestrictionsV1 } from '../rule-atoms/official-unit-restrictions-v1.mjs';
import { isOfficialRosterAttackProfileFieldedV1 } from '../rule-atoms/official-weapon-replacement-loadout-v1.mjs';
import { verifyOfficialSummonDataBundleV1 } from '../source-data/official-summon-data-bundle-v1.mjs';
import { isDeepStrictEqual } from "node:util";
import { projectOfficialAttackTargetWeaponDamageCapV1, projectOfficialAttackTargetFixedEvadeV1,
  projectOfficialAttackTargetEvadeEligibilityV1 } from './official-attack-target-reaction-context-v1.mjs';
import { inspectOfficialArmourChoiceV1, resolveOfficialArmourChoiceV1 } from
  '../rule-atoms/official-armour-choice-kernel-v1.mjs';
import { assertOfficialSiegeModeActionAllowedV1, isOfficialSiegeModeWeaponEligibleV1 } from
  "../rule-atoms/official-status-stay-in-play-rules-kernel-v1.mjs";
import { canonicalOfficialGapInputsV1, officialGapInputContractV1 } from './official-selected-roster-spatial-parameter-contract-v1.mjs';
import { canonicalOfficialSelectedRosterAttackAllocationsV1 as canonicalAllocations,
  createOfficialSelectedRosterFightParameterSchemaV1 }
  from "./official-selected-roster-attack-allocation-contract-v1.mjs";
import { canonicalOfficialSelectedRosterChargeParametersV1 } from
  "./official-selected-roster-charge-parameter-contract-v1.mjs";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ATOM_IDS,
} from "../rule-atoms/official-close-combat-attack-executor-v8.mjs";
import { createOfficialCriticalHitResolutionKernelV2 } from
  "../rule-atoms/official-critical-hit-resolution-kernel-v2.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import { evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1 } from
  "../rule-atoms/official-charge-occupied-cross-section-proof-v1.mjs";
import {
  OFFICIAL_IMPACT_EXECUTOR_ATOM_IDS,
} from "../rule-atoms/official-impact-executor-v1.mjs";
import { createOfficialInstantAttackEffectKernelV1 } from
  "../rule-atoms/official-instant-attack-effect-kernel-v1.mjs";
import {
  createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS,
} from "../rule-atoms/official-marine-charge-executor-v2.mjs";
import { recordOfficialSupplyLossesV1, verifyOfficialSupplyLossLedgerV1 } from
  "../rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV2,
  getOfficialAttackProfileV2,
  verifyOfficialAttackProfileCatalogueV2,
} from "../source-data/official-attack-profile-catalogue-v2.mjs";
import {
  getOfficialCombatProfileV1,
  verifyOfficialCombatProfileBundleV1,
} from "../source-data/official-combat-profile-bundle-v1.mjs";
import {
  assertOfficialSelectedRosterCoreActionWindowV1,
  consumeOfficialSelectedRosterFirstWeaponModifierV1,
  openOfficialSelectedRosterAfterActionWindowV1,
  resolveOfficialSelectedRosterAbilityModifiersV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";
import {
  consumeOfficialCharacteristicStatusFirstWeaponEffectsV1,
  projectOfficialCharacteristicStatusFamilyModifiersV1,
  resolveOfficialEffectiveCombatProfileV1,
} from "./official-characteristic-status-family-adapter-v1.mjs";
import { projectOfficialMeleeFamilyModifiersV1 } from
  "./official-melee-family-projection-v1.mjs";
import {
  consumeOfficialBattlefieldAssetFirstWeaponEffectsV1,
  projectOfficialBattlefieldAssetFamilyModifiersV1,
} from "./official-battlefield-asset-family-adapter-v1.mjs";
import {
  applyOfficialSelectedRosterResolvedDamageV1,
  createOfficialCurrentProductCasualtyDomainV1,
  resolveOfficialCurrentProductCasualtyDomainV1,
  createOfficialSelectedRosterCasualtyChoiceContextV1,
  createOfficialSelectedRosterCasualtyChoiceDomainV1,
  projectOfficialSelectedRosterArmourReactionContextV1,
  openOfficialSelectedRosterDamageReceivedWindowV1,
} from "./official-selected-roster-ranged-action-runtime-v1.mjs";
import {
  validateOfficialSelectedRosterRelocationGeometryV1, applyOfficialLargeTerrainRemovalV1,
} from "./official-selected-roster-spatial-action-runtime-v1.mjs";
import { verifyOfficialStandardActionRouteCatalogueV1 } from
  "./official-standard-action-route-catalogue-v1.mjs";
import { projectOfficialZergUniqueFamilyModifiersV1 } from
  "./official-zerg-unique-family-adapter-v1.mjs";
import {
  consumeOfficialProtossUniqueFirstWeaponEffectV1,
  projectOfficialProtossUniqueFamilyModifiersV1,
} from "./official-protoss-unique-family-adapter-v1.mjs";

export const OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID =
  "starcraft-tmg-official-selected-roster-melee-action-runtime-v1";
// Compatible correctness fix: preserve the accepted action/domain wire identity.
// The new positive certificate has its own version; prior accepted actions replay unchanged.
export const OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION = "2.5.0";
export const OFFICIAL_SELECTED_ROSTER_CHARGE_DECLARATION_PARAMETER_KIND =
  "official_selected_roster_charge_declaration_v1";
export const OFFICIAL_SELECTED_ROSTER_CHARGE_RESOLUTION_PARAMETER_KIND =
  "official_selected_roster_charge_resolution_v1";
export const OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND =
  "official_selected_roster_impact_allocation_v1";
export const OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND =
  "official_selected_roster_fight_v1";
export const OFFICIAL_SELECTED_ROSTER_MELEE_CASUALTY_PARAMETER_KIND =
  "official_selected_roster_melee_casualty_selection_v1";
export const OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA =
  "starcraft_tmg_official_selected_roster_melee_pending_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const CHARGE_ATOMS = Object.freeze([...new Set([
  ...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS,
])].sort());
const IMPACT_ATOMS = Object.freeze([...new Set([
  ...OFFICIAL_IMPACT_EXECUTOR_ATOM_IDS,
])].sort());
const FIGHT_ATOMS = Object.freeze([...new Set([
  ...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ATOM_IDS,
])].sort());
const fightAtoms = state => hasOfficialMeleeSidearmPolicyV1(state) ? [...FIGHT_ATOMS, OFFICIAL_MELEE_SIDEARM_ATOM_ID].sort() : [...FIGHT_ATOMS];
const CRITICAL_HIT = createOfficialCriticalHitResolutionKernelV2();
const INSTANT = createOfficialInstantAttackEffectKernelV1();
const TOLERANCE = 1;

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
function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("SELECTED_MELEE_SIDE_INVALID", sideKey);
}
function milli(value, code = "SELECTED_MELEE_GEOMETRY_INVALID") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function modelPoint(model) {
  return { xMilliInches: milli(model?.xInches), yMilliInches: milli(model?.yInches) };
}
function modelFootprint(model) {
  const width = milli(model?.baseWidthInches);
  const depth = milli(model?.baseDepthInches);
  const shape = String(model?.baseShape || "").toLowerCase();
  if (!["round", "rectangle", "measured_contour"].includes(shape)
    || width <= 0 || depth <= 0
    || (shape === "round" && Math.abs(width - depth) > TOLERANCE)) {
    fail("SELECTED_MELEE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  return createOfficialPhysicalFootprintV1({
    objectId: String(model.id),
    kind: "model_base",
    shape,
    center: modelPoint(model),
    widthMilliInches: width,
    depthMilliInches: depth,
    rotationDegrees: model.baseRotationDegrees ?? model.rotationDegrees ?? 0,
    ...(shape === "measured_contour"
      ? { localVerticesMilliInches: model.baseLocalVerticesMilliInches } : {}),
  });
}
function modelRadius(model) {
  const footprint = modelFootprint(model);
  return footprint.shape === "round"
    ? footprint.radiusMilliInches
    : Math.ceil(Math.hypot(
      footprint.widthMilliInches,
      footprint.depthMilliInches,
    ) / 2);
}
function verifyDeclaredBase(piece, model, dataBundle, hasBoundContour) {
  if (hasBoundContour || model?.baseShape === "measured_contour") {
    createOfficialModelBaseFootprintV1({
      piece, model, dataBundle,
      position: { xMilliInches: 0, yMilliInches: 0 },
    });
    return;
  }
  const width = milli(model?.baseWidthInches);
  const depth = milli(model?.baseDepthInches);
  const shape = String(model?.baseShape || "").toLowerCase();
  if (width <= 0 || depth <= 0 || !["round", "rectangle"].includes(shape)
    || (shape === "round" && Math.abs(width - depth) > TOLERANCE)) {
    fail("SELECTED_MELEE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
}
function centreDistance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function baseGap(left, right) {
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: modelFootprint(left),
    right: modelFootprint(right),
  }).minimumSeparationMilliInches;
}
function edgeForModel(graph, unitId, modelId) {
  return graph.modelEdges.filter((edge) => (
    edge.leftUnitId === unitId && edge.leftModelId === modelId
      || edge.rightUnitId === unitId && edge.rightModelId === modelId
  ));
}
function enemyUnitId(edge, ownUnitId) {
  return edge.leftUnitId === ownUnitId ? edge.rightUnitId : edge.leftUnitId;
}
function graphEnemyUnitIds(graph, unitId) {
  return [...new Set(graph.modelEdges.filter((edge) => (
    edge.leftUnitId === unitId || edge.rightUnitId === unitId
  )).map((edge) => enemyUnitId(edge, unitId)))].sort();
}
function graphHasUnitPair(graph, left, right) {
  return graph.modelEdges.some((edge) => (
    edge.leftUnitId === left && edge.rightUnitId === right
      || edge.leftUnitId === right && edge.rightUnitId === left
  ));
}
function statusNamed(piece, names) {
  const targets = new Set(names.map(normalizedName));
  return (piece.statuses || []).some((status) => targets.has(normalizedName(
    typeof status === "string" ? status : String(status.statusName || status.name
      || status.statusId || status.effectId || status.kind || status.schema || ""),
  )));
}
function verifyRuntimeState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces) || state.pieces.length < 1) {
    fail("SELECTED_MELEE_STATE_SCOPE_INVALID");
  }
  verifyOfficialStandardActionRouteCatalogueV1(state.officialActionRouteCatalogue);
  verifyOfficialCombatProfileBundleV1(state.officialCombatProfileBundle);
  const catalogueV2 = state.officialAttackProfileCatalogueV2
    || createOfficialAttackProfileCatalogueV2({
      previousCatalogue: state.officialAttackProfileCatalogue,
    });
  verifyOfficialAttackProfileCatalogueV2(catalogueV2);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round),
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor?.runtimeHash,
  });
  const geometry = state.officialModelBaseGeometryDataBundle;
  const contourRecordKeys = geometry?.supportedOfficialBaseShapes?.includes("measured_contour")
    ? new Set(geometry.profiles.filter(({ baseShape }) => baseShape === "measured_contour")
      .map(({ recordKey }) => recordKey))
    : null;
  for (const piece of state.pieces) {
    if (!state.officialCombatProfileBundle.profilesByRecordKey
      ?.[piece.officialUnitRecordKey]
      || !catalogueV2.unitRecordKeys.includes(piece.officialUnitRecordKey)
      || !Array.isArray(piece.models)
      || (activePiece(piece) && activeModels(piece).length !== Number(piece.currentModels))) {
      fail("SELECTED_MELEE_MODEL_DENOMINATOR_INVALID", piece.id);
    }
    const hasBoundContour = contourRecordKeys?.has(piece.officialUnitRecordKey);
    for (const model of piece.models) verifyDeclaredBase(piece, model, geometry, hasBoundContour);
  }
  return catalogueV2;
}
function phaseReady(state, sideKey, phase) {
  if (state.phase !== phase || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.[phase] === true) {
    fail("SELECTED_MELEE_PHASE_UNAVAILABLE", `${sideKey}:${phase}`);
  }
  const choice = state.phaseFirstActorByRound?.[`${state.round}:${phase}`];
  if (!object(choice) || choice.round !== Number(state.round)
    || choice.phase !== phase || !SIDE_KEYS.has(choice.chosenFirstActorSideKey)) {
    fail("SELECTED_MELEE_PHASE_INITIATIVE_UNRESOLVED", phase);
  }
}
function routeUnit(state, piece) {
  const unit = state.officialActionRouteCatalogue.units.find((entry) => (
    entry.pieceId === piece.id
  ));
  if (!unit || unit.recordKey !== piece.officialUnitRecordKey) {
    fail("SELECTED_MELEE_ROUTE_PROFILE_STALE", piece.id);
  }
  return unit;
}
function currentSpeed(state, piece) {
  const movement = routeUnit(state, piece).movementProfile;
  const printed = Number(piece.currentModels) === 1
    ? Number(movement.singleModelSpeedInches)
    : Number(movement.multiModelSpeedInches);
  const selected = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, piece, { actionType: state.phase });
  const current = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: state.phase } },
    ) : {};
  const battlefield = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: state.phase } },
    ) : {};
  return resolveOfficialMovementSpeedV1(printed, [selected, current, battlefield]);
}
function coherencyRange(state, piece) {
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle;
  if (state.officialRosterDisclosureDataBundle?.sourceBinding && characteristic) {
    return projectOfficialHorizontalCoherencyV1(characteristic, state, { pieceId: piece.id }).horizontalCoherencyMilliInches;
  }
  const current = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: state.phase } },
    ) : {};
  return Math.max(
    milli(routeUnit(state, piece).movementProfile.horizontalCoherencyInches),
    Number(current.horizontalCoherencyMilliInches || 0),
  );
}
function normalizedName(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function combatProfiles(state, piece, catalogueV2 = verifyRuntimeState(state)) {
  const all = catalogueV2.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey
      && profile.phase === "combat"
      && profile.range.kind === "engagement"
      && isOfficialRosterAttackProfileFieldedV1(state, piece, profile)
  ));
  const replaced = new Set(all.filter((profile) => profile.linkedTo !== "-")
    .map((profile) => normalizedName(profile.linkedTo)));
  return all.filter((profile) => !replaced.has(normalizedName(profile.weaponName)))
    .sort((left, right) => left.profileKey.localeCompare(right.profileKey));
}
function pending(state, stage) {
  const value = state.pendingAction;
  if (!object(value)
    || value.schema !== OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA
    || value.stage !== stage
    || value.pendingHash !== hashStarcraftTmgContract(without(value, ["pendingHash"]))
    || value.round !== Number(state.round)
    || value.phase !== state.phase
    || value.sideKey !== state.activeSideKey) {
    fail("SELECTED_MELEE_PENDING_INVALID", stage);
  }
  return value;
}
function diagnostic(sideKey, phase, pieceId, actionType, error, context = {}) {
  return freezeDeep({ actionType, sideKey, phase, pieceId,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0, details: { ...clone(context),
      rulesTruth: "official_selected_melee_fail_closed",
      trainingTruth: false } });
}
function chargeContext(state, sideKey, piece) {
  phaseReady(state, sideKey, "assault");
  if (!activePiece(piece) || piece.sideKey !== sideKey
    || piece.isStructure === true || piece.combatTag !== "ground"
    || piece.combatTags?.includes("flying")) {
    fail("SELECTED_MELEE_CHARGE_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (isOfficialBurrowedCoreActorV1(state, piece)) fail("SELECTED_MELEE_BURROWED_CHARGE_PROHIBITED", piece.id);
  const second = officialSecondChargeGrantV1(state,piece);
  if (!second && piece.activatedPhases?.assault === true) {
    fail("SELECTED_MELEE_CHARGE_ALREADY_ACTIVATED", piece.id);
  }
  if (!canOfficialUnitChargeV1(state, piece)) fail('SELECTED_MELEE_DECOY_CANNOT_CHARGE', piece.id);
  if (routeUnit(state, piece).coreMovementProhibitedByNullSpeed === true) {
    fail('SELECTED_MELEE_NULL_SPEED_CHARGE_PROHIBITED', piece.id);
  }
  assertOfficialSiegeModeActionAllowedV1(state, piece, "charge");
  if (!second) assertOfficialSelectedRosterCoreActionWindowV1(
    state, sideKey, piece.id, "assault");
  if (piece.disengageAssaultRestriction?.chargeProhibited === true) {
    fail("SELECTED_MELEE_POST_DISENGAGE_CHARGE_PROHIBITED", piece.id);
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  if (!second && graph.engagedUnitIds.includes(piece.id)) {
    fail("SELECTED_MELEE_CHARGE_REQUIRES_UNENGAGED", piece.id);
  }
  const targets = state.pieces.filter((target) => (
    target.sideKey === otherSide(sideKey) && activePiece(target)
      && (!second || (!second.previousTargets.includes(target.id) && (!second.targetId || target.id===second.targetId)))
      && target.combatTag === "ground" && !target.combatTags?.includes("flying")
      && canOfficialUnitsEngageV1(state, piece, target)
  ));
  if (targets.length === 0) fail("SELECTED_MELEE_CHARGE_TARGET_UNAVAILABLE");
  return { graph, targets };
}
function chargeDeclarationDomain(state, sideKey, piece) {
  const context = chargeContext(state, sideKey, piece);
  const modifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, piece, { actionType: "charge" });
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: "charge" } },
    ) : {};
  const battlefield = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: "charge" } },
    ) : {};
  const chargeRoll = characteristic.chargeDistanceRoll
    || { diceCount: 1, keepHighest: 1, addTo: "speed" };
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_CHARGE_DECLARATION_PARAMETER_KIND,
    actionType: "charge", sideKey, phase: "assault", pieceId: piece.id,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...CHARGE_ATOMS],
    parameterSchema: { type: "object", required: ["leadingModelId", "targets"],
      targetUnitCount: { minimum: 1, maximum: null },
      oneTargetModelPerTargetUnit: true },
    constraints: {
      leadingModelIds: activeModels(piece).map((model) => model.id).sort(),
      eligibleTargetModelIdsByUnitId: Object.fromEntries(context.targets.map((target) => (
        [target.id, activeModels(target).map((model) => model.id).sort()]
      ))),
      speedInches: currentSpeed(state, piece),
      chargeDistanceModifier: modifiers.chargeDistanceModifier,
      impactHitModifier: Number(modifiers.impactHitModifier || 0)
        + Number(characteristic.impactHitModifier || 0)
        + Number(battlefield.impactHitModifier || 0),
      chargeDistanceRoll: clone(chargeRoll),
      lineOfSightRequired: false, groundOnly: true,
      targetsDeclaredBeforeChance: true,
      activeChargeModifiersApplied: true,
      engagementGraphHash: context.graph.graphHash,
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_charge_declaration_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function instantiateChargeDeclaration(state, domain, parameters) {
  const { leadingModelId, targets } = canonicalOfficialSelectedRosterChargeParametersV1(domain, parameters);
  const plan = seal({
    schemaVersion: "starcraft_tmg_selected_roster_charge_declaration_plan_v1",
    semanticVersion: "1.0.0", sideKey: domain.sideKey,
    pieceId: domain.pieceId, leadingModelId, targets,
    speedInches: domain.constraints.speedInches,
    chargeDistanceModifier: domain.constraints.chargeDistanceModifier,
    impactHitModifier: domain.constraints.impactHitModifier,
    chargeDistanceRoll: clone(domain.constraints.chargeDistanceRoll),
    activeChargeModifiersApplied: true,
    domainId: domain.domainId,
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: Number(domain.constraints.chargeDistanceRoll.diceCount),
      layout: { charge: Number(domain.constraints.chargeDistanceRoll.diceCount) },
      revealOrder: ["charge"] },
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_charge_declaration",
    trainingTruth: false,
  }, "chargePlanHash");
  const action = freezeDeep({ actionType: "charge", sideKey: domain.sideKey,
    phase: "assault", pieceId: domain.pieceId, chargePlan: plan,
    chance: clone(plan.chance), ruleAtomIds: [...CHARGE_ATOMS],
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: { leadingModelId, targets }, action,
    rulesTruth: "official_selected_roster_charge_declaration", trainingTruth: false });
}
function revealDice(value, count, code) {
  if (!Array.isArray(value) || value.length !== count) fail(code);
  return value.map((entry) => {
    const faces = object(entry) ? Number(entry.faces) : 6;
    const outcome = object(entry) ? Number(entry.outcome) : Number(entry);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail(code);
    }
    return outcome;
  });
}
const OCCUPIED_PATH_FAILURE = "occupied_cross_section_distance_shortfall";

function supplementalChargePathFailure(state, current) {
  // Existing distance/spread failures keep their exact historical domain.
  // This supplements the BASE melee path used by production v1 -> v6; a v4
  // wrapper elsewhere is not evidence that the live parent received the proof.
  if (current.chargePlan.targets.length !== 1) return null;
  const piece = state.pieces.find(entry => entry.id === current.pieceId);
  const leading = activeModels(piece).find(entry =>
    entry.id === current.chargePlan.leadingModelId);
  const declared = current.chargePlan.targets[0];
  const target = state.pieces.find(entry => entry.id === declared.unitId);
  const targetModel = activeModels(target).find(entry => entry.id === declared.modelId);
  if (Math.max(0, baseGap(leading, targetModel) - 1000)
    > current.maxDistanceMilliInches + TOLERANCE) return null;
  const proof = evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1(state, current);
  return proof.allLegalChargePathsExcluded === true
    && proof.allActiveTargetModelsCovered === true
    && proof.omittedConstraintsCanOnlyEnlargeDomain === true
    && proof.certificateKind === OCCUPIED_PATH_FAILURE ? proof : null;
}

// Read-only pre-declaration evidence, not a new action or a second executor.
// Feed the canonical declaration into the SAME failure proof used after rolls.
// No failed finite formation search is a proof, and no straight-line distance
// alone certifies a successful path or a complete remaining-model placement.
export function inspectOfficialSelectedRosterChargePathEvidenceV1(state, chargePlan) {
  const roll = chargePlan.chargeDistanceRoll;
  const maximumRoll = roll.keepHighest ? 6 : Number(roll.diceCount) * 6;
  const maximum = milli(chargePlan.speedInches
    + chargePlan.chargeDistanceModifier + maximumRoll);
  const current = { stage: "resolve_charge_after_roll", pieceId: chargePlan.pieceId,
    chargePlan, maxDistanceMilliInches: maximum };
  const piece = state.pieces.find(entry => entry.id === chargePlan.pieceId);
  const leading = activeModels(piece).find(entry => entry.id === chargePlan.leadingModelId);
  const distances = chargePlan.targets.map(reference => {
    const target = state.pieces.find(entry => entry.id === reference.unitId);
    const model = activeModels(target).find(entry => entry.id === reference.modelId);
    const distance = baseGap(leading, model);
    return { ...clone(reference), baseEdgeDistanceMilliInches: distance,
      minimumMoveToEngageMilliInches: Math.max(0, distance - 1000) };
  });
  const distanceFailure = distances.some(entry =>
    entry.minimumMoveToEngageMilliInches > maximum + TOLERANCE);
  const proof = distanceFailure ? null : supplementalChargePathFailure(state, current);
  return freezeDeep({
    schemaVersion: "starcraft_tmg_selected_charge_path_evidence_v1",
    pieceId: piece.id, leadingModelId: leading.id,
    declaredTargets: clone(chargePlan.targets), targetDistances: distances,
    maximumDistanceMilliInches: maximum,
    distanceScope: "nominated_leader_to_declared_target_models",
    pathStatus: distanceFailure || proof ? "certain_failure" : "unknown",
    pathLowerBoundMilliInches: proof
      ? Math.min(...proof.targetCertificates.map(entry => entry.lowerBoundMilliInches))
      : distanceFailure ? Math.max(...distances.map(entry =>
        entry.minimumMoveToEngageMilliInches)) : null,
    failureKind: distanceFailure ? "distance_shortfall" : proof ? OCCUPIED_PATH_FAILURE : null,
    failureCertificateHash: proof ? hashStarcraftTmgContract(proof) : null,
    declarationLegalityUnchanged: true,
    everyDiceResultFails: Boolean(distanceFailure || proof),
    successCertified: false,
    completeFormationPlacementChecked: false,
    distanceDoesNotProvePath: true,
    otherLeadingModelsNotCertifiedByThisEvidence: true,
    executionProofSource: "official_selected_roster_melee_failure_rules",
    rulesAuthority: true, mutationAuthority: false, trainingTruth: false,
  });
}

function chargeResolutionDomain(state) {
  const current = pending(state, "resolve_charge_after_roll");
  const piece = state.pieces.find((entry) => entry.id === current.pieceId);
  const pathFailure = supplementalChargePathFailure(state, current);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_CHARGE_RESOLUTION_PARAMETER_KIND,
    actionType: "resolve_charge", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...CHARGE_ATOMS],
    parameterSchema: pathFailure ? {
      type: "object", ...officialGapInputContractV1(state), required: ["outcome", "failureProof"],
      outcome: ["failure"], failureProofKind: OCCUPIED_PATH_FAILURE,
    } : { type: "object", ...officialGapInputContractV1(state), required: ["outcome"],
      outcome: ["success", "failure"],
      successRequires: ["path", "placements"],
      failureRequires: ["failureProof"] },
    constraints: {
      pendingHash: current.pendingHash,
      leadingModelId: current.chargePlan.leadingModelId,
      declaredTargets: clone(current.chargePlan.targets),
      chargeRoll: current.chargeRoll,
      speedInches: current.chargePlan.speedInches,
      chargeDistanceModifier: current.chargePlan.chargeDistanceModifier,
      maxDistanceMilliInches: current.maxDistanceMilliInches,
      exactRemainingPlacementCount: activeModels(piece).length - 1,
      coherencyRangeMilliInches: coherencyRange(state, piece),
      acceptedFailureProofs: pathFailure ? [OCCUPIED_PATH_FAILURE]
        : ["distance_shortfall", "declared_target_spread"],
      ...(pathFailure ? {
        certificateSchemaVersion: pathFailure.schemaVersion,
        certificateHash: hashStarcraftTmgContract(pathFailure),
        allActiveTargetModelsCovered: true,
      } : {}),
      allDeclaredTargetsMustBeEngaged: true,
      undeclaredEnemyEngagementProhibited: true,
      remainingPlacementPriority: ["base_to_base", "engagement", "coherency"],
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_charge_post_roll_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function relocationParameters(state, parameters) {
  return { leadingModelId: parameters.leadingModelId,
    path: parameters.path, placements: parameters.placements,
    elevationTransitions: parameters.elevationTransitions || [],
    ...canonicalOfficialGapInputsV1(state, parameters) };
}
function applyGeometry(stateInput, pieceId, geometry) {
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === pieceId);
  for (const placement of geometry.finalModelPositions) {
    const model = piece.models.find((entry) => entry.id === placement.modelId);
    model.xInches = inches(placement.xMilliInches);
    model.yInches = inches(placement.yMilliInches);
    model.elevation = placement.elevation;
    model.supportTerrainIds = clone(placement.supportTerrainIds || []);
    model.baseRotationDegrees = placement.rotationDegrees || 0;
    model.adjacentAccessPointIds = (state.board.accessPoints || []).filter((access) => {
      const raw = access.footprint || {};
      const rectangle = { minX: Number(raw.minXMilliInches),
        maxX: Number(raw.maxXMilliInches), minY: Number(raw.minYMilliInches),
        maxY: Number(raw.maxYMilliInches) };
      if (!Object.values(rectangle).every(Number.isSafeInteger)) return false;
      const x = Math.max(rectangle.minX,
        Math.min(placement.xMilliInches, rectangle.maxX));
      const y = Math.max(rectangle.minY,
        Math.min(placement.yMilliInches, rectangle.maxY));
      const accessFootprint = createOfficialPhysicalFootprintV1({
        objectId: String(access.accessPointId || access.id),
        kind: "access_point",
        shape: "rectangle",
        center: {
          xMilliInches: Math.round((rectangle.minX + rectangle.maxX) / 2),
          yMilliInches: Math.round((rectangle.minY + rectangle.maxY) / 2),
        },
        widthMilliInches: rectangle.maxX - rectangle.minX,
        depthMilliInches: rectangle.maxY - rectangle.minY,
        rotationDegrees: 0,
      });
      return evaluateOfficialPhysicalFootprintRelationV1({
        left: modelFootprint(model),
        right: accessFootprint,
      }).minimumSeparationMilliInches <= TOLERANCE;
    }).map((entry) => entry.accessPointId || entry.id).sort();
  }
  const leading = geometry.finalModelPositions.find((entry) => (
    entry.modelId === geometry.leadingModelId
  ));
  piece.xInches = inches(leading.xMilliInches);
  piece.yInches = inches(leading.yMilliInches);
  piece.lastLeadingModelId = geometry.leadingModelId;
  applyOfficialLargeTerrainRemovalV1(state, piece, geometry.largeTerrainRemoval);
  consumeOfficialForceWallCrossingsV1(state, geometry.crossedForceWallTokenIds);
  for (const terrainId of geometry.grassRemovedTerrainIds || []) {
    const terrain = state.board.terrain.find((entry) => entry.id === terrainId);
    if (terrain) terrain.isRemoved = true;
  }
  return state;
}
function assertNoOverlap(state, piece) {
  for (const own of activeModels(piece)) {
    for (const otherPiece of state.pieces.filter((entry) => (
      entry.id !== piece.id && activePiece(entry)
    ))) {
      for (const other of activeModels(otherPiece)) {
        if (evaluateOfficialPhysicalFootprintRelationV1({
          left: modelFootprint(own),
          right: modelFootprint(other),
        }).overlappingInteriors) {
          fail("SELECTED_MELEE_CHARGE_BASE_OVERLAP", `${own.id}:${other.id}`);
        }
      }
    }
  }
}
function validateChargeSuccess(state, current, parameters) {
  const piece = state.pieces.find((entry) => entry.id === current.pieceId);
  const geometry = validateOfficialSelectedRosterRelocationGeometryV1({
    state, actionType: "charge", pieceId: piece.id,
    maxDistanceMilliInches: current.maxDistanceMilliInches,
    coherencyRangeMilliInches: coherencyRange(state, piece),
    currentlyEngagedEnemyUnitIds: [],
    parameters: relocationParameters(state, { ...parameters,
      leadingModelId: current.chargePlan.leadingModelId }),
  });
  const projected = applyGeometry(state, piece.id, geometry);
  const projectedPiece = projected.pieces.find((entry) => entry.id === piece.id);
  assertNoOverlap(projected, projectedPiece);
  const graph = deriveOfficialEngagementGraphV2(projected);
  const declaredUnitIds = current.chargePlan.targets.map((entry) => entry.unitId).sort();
  const actualUnitIds = graphEnemyUnitIds(graph, piece.id);
  if (!declaredUnitIds.every((unitId) => actualUnitIds.includes(unitId))) {
    fail("SELECTED_MELEE_CHARGE_ALL_TARGETS_NOT_ENGAGED");
  }
  const undeclared = actualUnitIds.filter((unitId) => !declaredUnitIds.includes(unitId));
  if (undeclared.length > 0) {
    fail("SELECTED_MELEE_CHARGE_UNDECLARED_ENEMY_ENGAGEMENT", undeclared.join(","));
  }
  const leadingEdges = edgeForModel(graph, piece.id, current.chargePlan.leadingModelId);
  if (!declaredUnitIds.every((unitId) => leadingEdges.some((edge) => (
    enemyUnitId(edge, piece.id) === unitId
  )))) {
    fail("SELECTED_MELEE_CHARGE_LEADING_MODEL_TARGET_ENGAGEMENT_REQUIRED");
  }
  const allLeadingBaseToBase = declaredUnitIds.every((unitId) => leadingEdges.some((edge) => (
    enemyUnitId(edge, piece.id) === unitId
      && Number(edge.horizontalBaseGapMilliInches) <= TOLERANCE
  )));
  // A short, obstacle-limited charge may already be the closest legal position.
  // This positive certificate replaces the old unconditional short-path veto.
  const requiresShortPathCertificate = !allLeadingBaseToBase
    && geometry.distanceTravelledMilliInches < current.maxDistanceMilliInches - TOLERANCE;
  const closestPositionProof = requiresShortPathCertificate
    ? proveOfficialChargeClosestPositionV1(state, modelPoint(activeModels(projectedPiece)
      .find(model => model.id === current.chargePlan.leadingModelId)), current) : null;
  if (requiresShortPathCertificate && !closestPositionProof.closestPositionProven) {
    fail("SELECTED_MELEE_CHARGE_CLOSEST_POSITION_REQUIRED", closestPositionProof.reason);
  }
  const priorities = activeModels(projectedPiece).filter((model) => (
    model.id !== current.chargePlan.leadingModelId
  )).map((model) => {
    const edges = edgeForModel(graph, piece.id, model.id).filter((edge) => (
      declaredUnitIds.includes(enemyUnitId(edge, piece.id))
    ));
    return { modelId: model.id,
      priority: edges.some((edge) => Number(edge.horizontalBaseGapMilliInches)
        <= TOLERANCE) ? "base_to_base"
        : edges.length > 0 ? "engagement" : "coherency" };
  });
  return { geometry, projected, graph, declaredUnitIds,
    allLeadingBaseToBase, closestPositionProof, priorities };
}
function failureProof(state, current, proof) {
  const piece = state.pieces.find((entry) => entry.id === current.pieceId);
  const leading = activeModels(piece).find((entry) => (
    entry.id === current.chargePlan.leadingModelId
  ));
  const targets = current.chargePlan.targets.map((entry) => {
    const target = state.pieces.find((row) => row.id === entry.unitId);
    const model = activeModels(target).find((row) => row.id === entry.modelId);
    return { ...entry, model, minimumMoveToEngageMilliInches:
      Math.max(0, baseGap(leading, model) - 1000) };
  });
  const kind = String(proof?.kind || "");
  if (kind === OCCUPIED_PATH_FAILURE) {
    const certificate = supplementalChargePathFailure(state, current);
    if (!certificate) fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID", kind);
    return { kind, certificateSchemaVersion: certificate.schemaVersion,
      certificateHash: hashStarcraftTmgContract(certificate),
      certificateKind: certificate.certificateKind,
      leadingModelId: certificate.leadingModelId,
      declaredTargetUnitId: certificate.declaredTargetUnitId,
      targetCertificates: clone(certificate.targetCertificates),
      maximumChargeDistanceMilliInches: current.maxDistanceMilliInches,
      recomputedByRules: true, trainingTruth: false };
  }
  if (kind === "distance_shortfall") {
    const impossible = targets.filter((entry) => (
      entry.minimumMoveToEngageMilliInches > current.maxDistanceMilliInches + TOLERANCE
    ));
    if (impossible.length === 0) fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID");
    return { kind, impossibleTargetUnitIds: impossible.map((entry) => entry.unitId).sort(),
      maximumChargeDistanceMilliInches: current.maxDistanceMilliInches };
  }
  if (kind === "declared_target_spread" && targets.length > 1) {
    const incompatiblePairs = [];
    for (let left = 0; left < targets.length; left += 1) {
      for (let right = left + 1; right < targets.length; right += 1) {
        const a = targets[left]; const b = targets[right];
        const aReach = modelRadius(leading) + modelRadius(a.model) + 1000;
        const bReach = modelRadius(leading) + modelRadius(b.model) + 1000;
        if (centreDistance(modelPoint(a.model), modelPoint(b.model))
          > aReach + bReach + TOLERANCE) {
          incompatiblePairs.push([a.unitId, b.unitId].sort());
        }
      }
    }
    if (incompatiblePairs.length === 0) {
      fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID");
    }
    return { kind, incompatibleTargetUnitPairs: incompatiblePairs.sort() };
  }
  fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID", kind);
}
function instantiateChargeResolution(state, domain, parameters) {
  const gapInputs = canonicalOfficialGapInputsV1(state, parameters ?? {});
  const current = pending(state, "resolve_charge_after_roll");
  const outcome = String(parameters?.outcome || "");
  const allowed = new Set(["outcome", "path", "placements", "failureProof",
    "elevationTransitions", "gapMouths", "coherencyGapMouths"]);
  if (!object(parameters) || Object.keys(parameters).some((key) => !allowed.has(key))
    || !domain.parameterSchema.outcome.includes(outcome)) {
    fail("SELECTED_MELEE_CHARGE_RESOLUTION_PARAMETERS_INVALID");
  }
  if (domain.parameterSchema.failureProofKind === OCCUPIED_PATH_FAILURE
    && (Object.keys(parameters).sort().join(",") !== "failureProof,outcome"
      || !object(parameters.failureProof)
      || Object.keys(parameters.failureProof).join(",") !== "kind"
      || parameters.failureProof.kind !== OCCUPIED_PATH_FAILURE)) {
    fail("SELECTED_MELEE_CHARGE_RESOLUTION_PARAMETERS_INVALID");
  }
  const success = outcome === "success"
    ? validateChargeSuccess(state, current, parameters) : null;
  const proof = outcome === "failure"
    ? failureProof(state, current, parameters.failureProof) : null;
  if (parameters.failureProof?.kind === OCCUPIED_PATH_FAILURE
    && (domain.parameterSchema.failureProofKind !== OCCUPIED_PATH_FAILURE
      || proof?.certificateHash !== domain.constraints.certificateHash)) {
    fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID", OCCUPIED_PATH_FAILURE);
  }
  const plan = seal({
    schemaVersion: "starcraft_tmg_selected_roster_charge_resolution_plan_v1",
    semanticVersion: "1.0.0", sideKey: current.sideKey,
    pieceId: current.pieceId, outcome, pendingHash: current.pendingHash,
    declarationChargePlanHash: current.chargePlan.chargePlanHash,
    chargeRoll: current.chargeRoll,
    maxDistanceMilliInches: current.maxDistanceMilliInches,
    domainId: domain.domainId,
    canonicalParameters: { outcome,
      ...(outcome === "success" ? {
        path: clone(parameters.path), placements: clone(parameters.placements),
        elevationTransitions: clone(parameters.elevationTransitions || []),
        ...gapInputs,
      } : { failureProof: clone(parameters.failureProof) }) },
    geometry: success?.geometry || null,
    postEngagementGraphHash: success?.graph.graphHash || null,
    declaredTargetUnitIds: current.chargePlan.targets.map((entry) => entry.unitId).sort(),
    allLeadingBaseToBase: success?.allLeadingBaseToBase ?? false,
    remainingPlacementPriorities: success?.priorities || [],
    failureProof: proof,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_charge_resolution",
    trainingTruth: false,
  }, "chargeResolutionPlanHash");
  const action = freezeDeep({ actionType: "resolve_charge", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId, chargeResolutionPlan: plan,
    chance: null, ruleAtomIds: [...CHARGE_ATOMS],
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: clone(plan.canonicalParameters),
    action, rulesTruth: "official_selected_roster_charge_resolution",
    trainingTruth: false });
}
function impactDomain(state) {
  const current = pending(state, "resolve_mandatory_impact");
  const faqImpact = hasOfficialImpactAllocationPolicyV13(state);
  const targetUnitIds = current.targetUnitIds;
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.1.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND,
    actionType: "resolve_impact", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...IMPACT_ATOMS, ...(faqImpact ? [OFFICIAL_IMPACT_ALLOCATION_POLICY_V13.ruleAtomId] : [])],
    parameterSchema: { type: "object", required: ["allocations"],
      allocations: { type: "array", minItems: 1,
        items: { type: "object",
          required: ["modelId", "targetUnitId", "dice"],
          additionalProperties: false,
          properties: {
            modelId: { type: "string" },
            targetUnitId: { type: "string" },
            dice: { type: "integer", minimum: 1 },
          } } },
      allocationUnit: "impact_die_per_eligible_model", targetUnitIds,
      eligibleModels: clone(current.eligibleImpactModels),
      exactTotal: current.impactDice,
      singleTargetForcedAllocation: targetUnitIds.length === 1 },
    constraints: { pendingHash: current.pendingHash,
      ...(faqImpact ? { unitTargetingRequired: false, structuresMayReceiveImpact: true } : {}),
      impactDice: current.impactDice,
      baseHitThreshold: current.baseHitThreshold,
      hitRollModifier: current.hitRollModifier,
      effectiveHitThreshold: current.effectiveHitThreshold,
      targetUnitIds, damage: 1, surge: null,
      rollTargetsSeparately: true },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_impact_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function canonicalImpactAllocations(value, eligibleModels) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("SELECTED_MELEE_IMPACT_ALLOCATION_INVALID");
  }
  const models = new Map(eligibleModels.map((entry) => [entry.modelId, entry]));
  const seen = new Set();
  const rows = value.map((entry) => {
    const modelId = String(entry?.modelId || "");
    const targetUnitId = String(entry?.targetUnitId || "");
    const dice = Number(entry?.dice);
    const eligible = models.get(modelId);
    const key = `${modelId}:${targetUnitId}`;
    if (!eligible || !eligible.eligibleTargetUnitIds.includes(targetUnitId)
      || seen.has(key) || !Number.isSafeInteger(dice) || dice <= 0
      || Object.keys(entry || {}).some((name) => (
        !["modelId", "targetUnitId", "dice"].includes(name)))) {
      fail("SELECTED_MELEE_IMPACT_ALLOCATION_INVALID", key);
    }
    seen.add(key);
    return { modelId, targetUnitId, dice };
  }).sort((left, right) => `${left.modelId}:${left.targetUnitId}`.localeCompare(
    `${right.modelId}:${right.targetUnitId}`));
  for (const eligible of eligibleModels) {
    const allocated = rows.filter((entry) => entry.modelId === eligible.modelId)
      .reduce((sum, entry) => sum + entry.dice, 0);
    if (allocated !== eligible.impactDice
      || (eligible.eligibleTargetUnitIds.length === 1
        && rows.filter((entry) => entry.modelId === eligible.modelId).length !== 1)) {
      fail("SELECTED_MELEE_IMPACT_MODEL_ALLOCATION_TOTAL_INVALID", eligible.modelId);
    }
  }
  return rows;
}
function impactChancePlan(state, current, allocations) {
  const faqImpact = hasOfficialImpactAllocationPolicyV13(state);
  const targets = allocations.map((allocation) => {
    const target = state.pieces.find((entry) => entry.id === allocation.targetUnitId);
    const profile = getOfficialCombatProfileV1(
      state.officialCombatProfileBundle, target.officialUnitRecordKey);
    const modifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
      state, target, { attackerPieceId: current.pieceId,
        damageKind: "enemy_special_ability", weaponName: "IMPACT" });
    const characteristic = state.officialCharacteristicStatusFamilySourceBundle
      ? projectOfficialCharacteristicStatusFamilyModifiersV1(
        state.officialCharacteristicStatusFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: current.pieceId,
          targetPieceId: target.id, damageKind: "enemy_special_ability",
          attackKind: "impact", weaponName: "IMPACT" } },
      ) : {};
    const battlefield = state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: current.pieceId,
          targetPieceId: target.id, damageKind: "enemy_special_ability",
          attackKind: "impact", weaponName: "IMPACT" } },
      ) : {};
    const evadeEligible = profile.evadeThreshold !== null
      && Boolean(modifiers.evadeEligible
        || characteristic.eligibleEvadeAgainstAllAttacks);
    const evadeThreshold = profile.evadeThreshold === null ? null
      : Math.max(2, Number(profile.evadeThreshold) - modifiers.evadeModifier);
    return { targetUnitId: target.id, dice: allocation.dice,
      ...(profile.profileHash === undefined ? {}
        : { targetProfileHash: profile.profileHash }),
      armourThreshold: planOfficialArmourThresholdV1(state, profile.armourThreshold, battlefield.armourModifier || 0), evadeThreshold,
      evadeEligible,
      evadeModifier: modifiers.evadeModifier,
      layout: { hit: allocation.dice, ...(faqImpact ? { surge: 0 } : {}), armour: allocation.dice,
        evade: evadeEligible ? allocation.dice : 0 } };
  });
  const layout = { hit: targets.reduce((sum, target) => sum + target.layout.hit, 0),
    armour: targets.reduce((sum, target) => sum + target.layout.armour, 0),
    evade: targets.reduce((sum, target) => sum + target.layout.evade, 0) };
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_impact_chance_plan_v1",
    semanticVersion: faqImpact ? '1.2.0' : "1.1.0", impactDice: current.impactDice,
    ...(faqImpact ? { unitTargetingRequired: false, structuresMayReceiveImpact: true } : {}),
    baseHitThreshold: current.baseHitThreshold,
    hitRollModifier: current.hitRollModifier,
    effectiveHitThreshold: current.effectiveHitThreshold,
    targets, chance: { kind: "fixed_roll_sequence", faces: 6,
      count: Object.values(layout).reduce((sum, value) => sum + value, 0),
      layout, revealOrder: ["target_order", "hit", "armour", "evade"] },
    rulesTruth: "official_selected_roster_impact_chance_plan",
    trainingTruth: false }, "impactPlanHash");
}
function instantiateImpact(state, domain, parameters) {
  const current = pending(state, "resolve_mandatory_impact");
  if (!object(parameters) || Object.keys(parameters).some((key) => key !== "allocations")) {
    fail("SELECTED_MELEE_IMPACT_PARAMETERS_INVALID");
  }
  const modelAllocations = canonicalImpactAllocations(
    parameters.allocations, current.eligibleImpactModels);
  const allocations = current.targetUnitIds.map((targetUnitId) => ({
    targetUnitId,
    dice: modelAllocations.filter((entry) => entry.targetUnitId === targetUnitId)
      .reduce((sum, entry) => sum + entry.dice, 0),
  })).filter((entry) => entry.dice > 0);
  const impactPlan = impactChancePlan(state, current, allocations);
  const action = freezeDeep({ actionType: "resolve_impact", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId, allocations,
    modelAllocations,
    pendingHash: current.pendingHash, impactPlan,
    chance: clone(impactPlan.chance), ruleAtomIds: [...IMPACT_ATOMS,
      ...(hasOfficialImpactAllocationPolicyV13(state) ? [OFFICIAL_IMPACT_ALLOCATION_POLICY_V13.ruleAtomId] : [])],
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: { allocations: modelAllocations }, action,
    rulesTruth: "official_selected_roster_impact_instantiation",
    trainingTruth: false });
}
function fightingRanks(state, piece, graph) {
  const fightingModelIds = activeModels(piece).filter((model) => (
    edgeForModel(graph, piece.id, model.id).length > 0
  )).map((model) => model.id).sort();
  const fighting = new Set(fightingModelIds);
  const supportingModelIds = activeModels(piece).filter((model) => (
    !fighting.has(model.id) && activeModels(piece).some((friend) => (
      fighting.has(friend.id) && baseGap(model, friend) <= TOLERANCE
    ))
  )).map((model) => model.id).sort();
  return { fightingModelIds, supportingModelIds,
    contributingModelIds: [...fightingModelIds, ...supportingModelIds].sort() };
}
function applyCloseRanksGeometry(stateInput, pieceId, geometry, events = []) {
  const state = applyGeometry(stateInput, pieceId, geometry);
  const piece = state.pieces.find(row => row.id === pieceId);
  if (requiresOfficialBurrowedCloseRanksV1(state, piece)) {
    consumeOfficialCharacteristicBurrowedMovementV1(state, piece, events);
    if (requiresOfficialBurrowedCloseRanksV1(state, piece)) fail("SELECTED_MELEE_BURROW_STATUS_NOT_REMOVED", pieceId);
    events.push({ type: "close_ranks_resolved", pieceId, burrowedRemoved: true,
      geometryHash: hashStarcraftTmgContract(geometry), trainingTruth: false });
  }
  return state;
}

function closeRanksProjection(state, piece, graph, parameters) {
  const mode = String(parameters.closeRanksMode || "decline");
  if (readOfficialMeleeSidearmSequenceV1(state) && (mode !== 'decline'
    || ['leadingModelId', 'path', 'placements', 'elevationTransitions', 'gapMouths', 'coherencyGapMouths']
      .some(key => Object.hasOwn(parameters, key)))) fail('MELEE_SIDEARM_CLOSE_RANKS_ALREADY_RESOLVED');
  if (mode === "decline") {
    if (requiresOfficialBurrowedCloseRanksV1(state, piece)) fail("SELECTED_MELEE_BURROWED_CLOSE_RANKS_REQUIRED", piece.id);
    return { state, graph, geometry: null };
  }
  if (mode !== "move") fail("SELECTED_MELEE_CLOSE_RANKS_MODE_INVALID", mode);
  const startEnemyUnitIds = graphEnemyUnitIds(graph, piece.id);
  const leadingModelId = String(parameters.leadingModelId || "");
  const leading = activeModels(piece).find((model) => model.id === leadingModelId);
  if (!leading || edgeForModel(graph, piece.id, leading.id).some((edge) => (
    Number(edge.horizontalBaseGapMilliInches) <= TOLERANCE
  ))) {
    fail("SELECTED_MELEE_CLOSE_RANKS_LEADER_PINNED", leadingModelId);
  }
  const pinned = new Set(activeModels(piece).filter((model) => (
    edgeForModel(graph, piece.id, model.id).some((edge) => (
      Number(edge.horizontalBaseGapMilliInches) <= TOLERANCE
    ))
  )).map((model) => model.id));
  const geometry = validateOfficialSelectedRosterRelocationGeometryV1({
    state, actionType: "close_ranks", pieceId: piece.id,
    maxDistanceMilliInches: 3000,
    coherencyRangeMilliInches: coherencyRange(state, piece),
    currentlyEngagedEnemyUnitIds: startEnemyUnitIds,
    parameters: relocationParameters(state, parameters),
  });
  const projected = applyCloseRanksGeometry(state, piece.id, geometry);
  const projectedPiece = projected.pieces.find((entry) => entry.id === piece.id);
  assertNoOverlap(projected, projectedPiece);
  for (const modelId of pinned) {
    const before = activeModels(piece).find((model) => model.id === modelId);
    const after = activeModels(projectedPiece).find((model) => model.id === modelId);
    if (centreDistance(modelPoint(before), modelPoint(after)) > TOLERANCE) {
      fail("SELECTED_MELEE_CLOSE_RANKS_PINNED_MODEL_MOVED", modelId);
    }
  }
  const postGraph = deriveOfficialEngagementGraphV2(projected);
  const postEnemyUnitIds = graphEnemyUnitIds(postGraph, piece.id);
  if (!startEnemyUnitIds.every((id) => postEnemyUnitIds.includes(id))) {
    fail("SELECTED_MELEE_CLOSE_RANKS_EXISTING_ENGAGEMENT_LOST");
  }
  if (postEnemyUnitIds.some((id) => !startEnemyUnitIds.includes(id))) {
    fail("SELECTED_MELEE_CLOSE_RANKS_NEW_ENGAGEMENT_PROHIBITED");
  }
  const enemies = state.pieces.filter((entry) => startEnemyUnitIds.includes(entry.id))
    .flatMap((entry) => activeModels(entry));
  const beforeGap = Math.min(...enemies.map((model) => baseGap(leading, model)));
  const afterLeading = activeModels(projectedPiece).find((model) => model.id === leading.id);
  const afterGap = Math.min(...enemies.map((model) => baseGap(afterLeading, model)));
  if (afterGap >= beforeGap - TOLERANCE) {
    fail("SELECTED_MELEE_CLOSE_RANKS_MUST_END_CLOSER");
  }
  return { state: projected, graph: postGraph, geometry };
}
function fightContext(state, sideKey, piece, catalogueV2, profileKey) {
  phaseReady(state, sideKey, "combat");
  if (!activePiece(piece) || piece.sideKey !== sideKey
    || piece.isStructure === true || piece.combatTag !== "ground"
    || piece.combatTags?.includes("flying")) {
    fail("SELECTED_MELEE_FIGHT_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (piece.activatedPhases?.combat === true) {
    fail("SELECTED_MELEE_FIGHT_ALREADY_ACTIVATED", piece.id);
  }
  if (!isOfficialMeleeSidearmProfileAllowedV1(state, piece, profileKey)) fail('MELEE_SIDEARM_PROFILE_ALREADY_USED_OR_NOT_OWNER');
  assertOfficialSelectedRosterCoreActionWindowV1(
    state, sideKey, piece.id, "combat");
  const graph = deriveOfficialEngagementGraphV2(state);
  const targetUnitIds = graphEnemyUnitIds(graph, piece.id);
  if (targetUnitIds.length === 0) fail("SELECTED_MELEE_FIGHT_REQUIRES_ENGAGEMENT");
  const profile = combatProfiles(state, piece, catalogueV2).find((entry) => (
    entry.profileKey === profileKey));
  if (!profile) fail("SELECTED_MELEE_COMBAT_PROFILE_UNAVAILABLE", String(profileKey || ""));
  if (!isOfficialSiegeModeWeaponEligibleV1(state, piece, profile.weaponName)) {
    fail("SELECTED_MELEE_SIEGE_MODE_WEAPON_PROHIBITED", profile.weaponName);
  }
  const eligibleTargetUnitIds = targetUnitIds.filter((unitId) => {
    const target = state.pieces.find((entry) => entry.id === unitId);
    const tags = new Set([target.combatTag, ...(target.combatTags || [])]
      .map(normalizedName).filter(Boolean));
    return profile.targetTags.some((tag) => tags.has(normalizedName(tag)));
  });
  if (eligibleTargetUnitIds.length === 0) {
    fail("SELECTED_MELEE_FIGHT_TARGET_TAG_PROHIBITED", piece.id);
  }
  return { graph, targetUnitIds: eligibleTargetUnitIds, profile };
}
function fightDomain(state, sideKey, piece, catalogueV2, profileKey) {
  const context = fightContext(state, sideKey, piece, catalogueV2, profileKey);
  const ranks = fightingRanks(state, piece, context.graph);
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { weaponName: context.profile.weaponName,
        attackKind: "close_combat", damageKind: "close_combat" } },
    ) : {};
  const effectiveRateOfAttack = Math.max(0, Number(context.profile.rateOfAttack)
    + Number(characteristic.rateOfAttackModifier || 0));
  const effects = fightEffectContext(state, piece, context.profile);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND,
    actionType: "fight", sideKey, phase: "combat", pieceId: piece.id,
    profileKey: context.profile.profileKey, weaponName: context.profile.weaponName,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: fightAtoms(state),
    parameterSchema: createOfficialSelectedRosterFightParameterSchemaV1({
      ...officialGapInputContractV1(state),
      targetUnitIds: context.targetUnitIds,
      leadingModelIds: activeModels(piece).map(model => model.id).sort(),
      surgeRequired: Boolean(effects.surge), criticalRequired: Boolean(effects.critical),
      conditionalCriticalTargetUnitIds: (effects.conditionalCriticalHitValues || [])
        .filter(row => context.targetUnitIds.includes(row.targetUnitId)).map(row => row.targetUnitId),
    }),
    constraints: { engagementGraphHash: context.graph.graphHash,
      targetUnitIds: context.targetUnitIds,
      ...(effects.conditionalCriticalHitValues?.length ? { conditionalCriticalHitValues: effects.conditionalCriticalHitValues,
        uniqueConditionalCriticalTargetBoundByHost: true } : {}),
      printedRateOfAttack: context.profile.rateOfAttack,
      declineCloseRanksFightingModelIds: ranks.fightingModelIds,
      declineCloseRanksSupportingModelIds: ranks.supportingModelIds,
      declineCloseRanksContributingModelIds: ranks.contributingModelIds,
      declineCloseRanksEffectiveRateOfAttack: effectiveRateOfAttack,
      declineCloseRanksAttackDice:
        ranks.contributingModelIds.length * effectiveRateOfAttack,
      sourceProfileHash: context.profile.profileHash,
      ...(characteristic.weaponHitPenalty ? { printedHitThreshold: context.profile.hitThreshold,
        weaponHitPenalty: characteristic.weaponHitPenalty,
        effectiveHitThreshold: Math.min(6, Math.max(2, Number(context.profile.hitThreshold) + characteristic.weaponHitPenalty)) } : {}),
      optionalCloseRanksDistanceMilliInches: readOfficialMeleeSidearmSequenceV1(state) ? 0 : 3000,
      fightingAndSupportingRanksDerivedAfterCloseRanks: true,
      allocationDeclaredBeforeHitRoll: true,
      surgeDieCannotBeSplit: true,
      criticalHitTransfersExistingDiceOnly: true,
      enemyReactionAllowed: !effects.instant,
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_fight_domain",
    trainingTruth: false,
  };
  const sequence = readOfficialMeleeSidearmSequenceV1(state);
  if (sequence) {
    body.parameterSchema.closeRanksMode = ['decline'];
    body.parameterSchema.properties.closeRanksMode.enum = ['decline'];
    body.parameterSchema.conditionalRequiredFields = [];
    body.constraints.meleeSidearmSequenceHash = sequence.sequenceHash;
  } else if (requiresOfficialBurrowedCloseRanksV1(state, piece)) {
    body.parameterSchema.closeRanksMode = ["move"];
    body.parameterSchema.properties.closeRanksMode.enum = ["move"];
    body.constraints.closeRanksRequiredForAttack = true;
    body.constraints.declineCloseRanksFightingModelIds = [];
    body.constraints.declineCloseRanksSupportingModelIds = [];
    body.constraints.declineCloseRanksContributingModelIds = [];
    body.constraints.declineCloseRanksAttackDice = 0;
  }
  return seal(body, "domainId");
}
// The public domain and post-Close-Ranks executor share this effect owner.
// Printed and granted effects must not have separate required-field policies.
function fightEffectContext(state, attacker, profile, targetPieceId = null) {
  const surge = profile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:surge-armour-bypass-v1"
  ));
  const printedCritical = profile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:critical-hit-v1"
  ));
  const battlefieldAttacker = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: attacker.id, context: { attackerPieceId: attacker.id,
        weaponName: profile.weaponName, damageKind: "close_combat",
        attackKind: "close_combat" } },
    ) : {};
  const characteristicAttacker = state.officialCharacteristicStatusFamilySourceBundle && hasOfficialCharacteristicConsumerPolicyV1(state)
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: attacker.id, context: { weaponName: profile.weaponName, attackKind: 'close_combat',
        ...(targetPieceId ? { targetPieceId } : {}) } }) : {};
  const grantedCritical = Math.max(Number(battlefieldAttacker.criticalHit || 0), Number(characteristicAttacker.criticalHit || 0));
  const useGrantedCritical = Number(characteristicAttacker.criticalHit || 0) > Number(printedCritical?.parameters?.bypassArmourDice || 0);
  const critical = (!useGrantedCritical && printedCritical) || (grantedCritical > 0 ? {
    effectAtomId: "attack-effect:critical-hit-v1", sourceKind: "weapon_keyword",
    parameters: { bypassArmourDice: grantedCritical },
  } : null);
  const printedInstant = profile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:instant-v1"
  ));
  const zerg = state.officialZergUniqueFamilySourceBundle
    ? projectOfficialZergUniqueFamilyModifiersV1(
      state.officialZergUniqueFamilySourceBundle, state,
      { pieceId: attacker.id, attackKind: "close_combat", weaponPhase: "combat",
        weaponName: profile.weaponName })
    : { closeCombatInstant: false, sourceDefinitionIds: [] };
  const protoss = state.officialProtossUniqueFamilySourceBundle
    ? projectOfficialProtossUniqueFamilyModifiersV1(
      state.officialProtossUniqueFamilySourceBundle, state,
      { pieceId: attacker.id, attackKind: "close_combat",
        weaponName: profile.weaponName })
    : { firstWeaponInstant: false, sourceDefinitionIds: [] };
  const characteristicInstantId = characteristicAttacker.closeCombatInstantSourceDefinitionId;
  const instant = printedInstant || (zerg.closeCombatInstant
    || protoss.firstWeaponInstant || characteristicInstantId ? {
    effectAtomId: "attack-effect:instant-v1", sourceKind: "weapon_keyword", parameters: {},
  } : null);
  const instantSourceDefinitionIds = [...new Set([...zerg.sourceDefinitionIds, ...protoss.sourceDefinitionIds,
    ...(characteristicInstantId ? [characteristicInstantId] : [])])].sort();
  return { surge, printedCritical, critical, printedInstant, instant, instantSourceDefinitionIds,
    ...(characteristicAttacker.conditionalCriticalHitValues?.length
      ? { conditionalCriticalHitValues: characteristicAttacker.conditionalCriticalHitValues } : {}) };
}
function fightChancePlan(state, attacker, profile, allocations, surgeTargetUnitId,
  criticalTargetUnitId) {
  const hitModifiers = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle,
      state, { pieceId: attacker.id, context: { weaponName: profile.weaponName, attackKind: 'close_combat' } }) : {};
  const { surge, printedCritical, critical, printedInstant, instant, instantSourceDefinitionIds }
    = fightEffectContext(state, attacker, profile, criticalTargetUnitId || null);
  if (Boolean(surge) !== Boolean(surgeTargetUnitId)
    || Boolean(critical) !== Boolean(criticalTargetUnitId)) {
    fail("SELECTED_MELEE_EFFECT_TARGET_REQUIRED");
  }
  const targets = allocations.map((allocation) => {
    const target = state.pieces.find((entry) => entry.id === allocation.targetUnitId);
    const targetProfile = resolveOfficialEffectiveCombatProfileV1(state, target);
    const targetModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
      state, target, { attackerPieceId: attacker.id,
        damageKind: "close_combat", weaponName: profile.weaponName });
    const characteristicTarget = state.officialCharacteristicStatusFamilySourceBundle
      ? projectOfficialCharacteristicStatusFamilyModifiersV1(
        state.officialCharacteristicStatusFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const characteristicAttacker = state.officialCharacteristicStatusFamilySourceBundle
      ? projectOfficialCharacteristicStatusFamilyModifiersV1(
        state.officialCharacteristicStatusFamilySourceBundle, state,
        { pieceId: attacker.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const selectedAttacker = resolveOfficialSelectedRosterAbilityModifiersV1(
      state, attacker, { attackerPieceId: attacker.id, targetPieceId: target.id,
        damageKind: "close_combat", weaponName: profile.weaponName });
    const battlefieldTarget = state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const battlefieldAttackerForTarget = state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: attacker.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const targetReactionEvade = projectOfficialAttackTargetEvadeEligibilityV1(state, { pieceId: attacker.id,
      targetId: target.id, profileKey: profile.profileKey, sourceProfileHash: profile.profileHash });
    const evadeEligible = targetProfile.evadeThreshold !== null
      && Boolean(targetModifiers.evadeEligible || targetReactionEvade?.evadeEligible
        || characteristicTarget.eligibleEvadeAgainstAllAttacks);
    const fixedEvade = projectOfficialAttackTargetFixedEvadeV1(state, { pieceId: attacker.id,
      targetId: target.id, profileKey: profile.profileKey, sourceProfileHash: profile.profileHash });
    const evadeThreshold = fixedEvade ? fixedEvade.evadeThreshold : targetProfile.evadeThreshold === null ? null
      : Math.max(2, Math.min(6, Number(targetProfile.evadeThreshold)
        - Number(targetModifiers.evadeModifier || 0)
        - Number(targetReactionEvade?.evadeModifier || 0)
        + Number(characteristicAttacker.antiEvade || 0)));
    const pierce = profile.effects.find((effect) => (
      effect.effectAtomId === "attack-effect:pierce-v1"));
    const pierceMatched = Boolean(pierce?.parameters?.targetTag
      && targetProfile.combatTags.includes(pierce.parameters.targetTag));
    const uncappedDamagePerDie = Number(characteristicAttacker.damageSetTo
      || (pierceMatched ? pierce.parameters.damage : profile.damage));
    const weaponDamageCap = projectOfficialAttackTargetWeaponDamageCapV1(state, { pieceId: attacker.id,
      targetId: target.id, profileKey: profile.profileKey, sourceProfileHash: profile.profileHash });
    const damagePerDie = weaponDamageCap ? Math.min(uncappedDamagePerDie, weaponDamageCap.maximumWeaponDamage) : uncappedDamagePerDie;
    return { targetUnitId: target.id, dice: allocation.dice,
      ...(targetProfile.profileHash === undefined ? {}
        : { targetProfileHash: targetProfile.profileHash }),
      armourThreshold: planOfficialArmourThresholdV1(state, targetProfile.armourThreshold, battlefieldTarget.armourModifier || 0),
      ...(battlefieldTarget.dodge ? { passiveDodge: battlefieldTarget.dodge } : {}),
      evadeEligible,
      evadeModifier: Number(targetModifiers.evadeModifier || 0) + Number(targetReactionEvade?.evadeModifier || 0),
      antiEvade: Number(characteristicAttacker.antiEvade || 0),
      evadeThreshold,
      ...(fixedEvade ? { fixedEvade, evadeCharacteristicUnmodifiable: true } : {}),
      precision: Math.max(Number(selectedAttacker.precision || 0),
        Number(characteristicAttacker.precision || 0),
        Number(battlefieldAttackerForTarget.precision || 0)),
      damagePerDie,
      ...(weaponDamageCap ? { weaponDamageCap, uncappedDamagePerDie } : {}),
      damageSetToApplied: characteristicAttacker.damageSetTo || null,
      pierceMatched,
      surge: surgeTargetUnitId === target.id,
      criticalHit: criticalTargetUnitId === target.id,
      layout: { hit: allocation.dice,
        surge: surgeTargetUnitId === target.id ? 1 : 0,
        armour: allocation.dice,
        evade: evadeEligible ? allocation.dice : 0 } };
  });
  // SIDEARM controls batch eligibility, not Critical Hit dice transfer. Keep
  // the full source hash in the outer fight plan and project only the effect
  // owned by this kernel; its strict single-effect contract stays unchanged.
  const sidearmCritical = Boolean(critical && isOfficialMeleeSidearmCarrierV1(state, attacker)
    && profile.profileKey === state.officialMeleeSidearmPolicy.sidearmProfileKey);
  const criticalProfile = critical && (critical !== printedCritical || sidearmCritical) ? (() => {
    const body = { ...without(profile, ["profileHash"]),
      profileKey: `${profile.profileKey}:${sidearmCritical ? 'sidearm-critical' : 'orders-critical'}`, effects: [critical],
      ...(sidearmCritical ? { sourceProfileHash: profile.profileHash } : {}) };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  })() : profile;
  const criticalPlan = critical ? CRITICAL_HIT.plan({ profile: criticalProfile,
    attackPoolDice: allocations.find((entry) => (
      entry.targetUnitId === criticalTargetUnitId
    )).dice,
    targetDodge: { present: false, reduction: 0,
      source: "target_official_profile_and_effect_state" } }) : null;
  const instantProfile = instant && !printedInstant ? (() => {
    const body = { ...without(profile, ["profileHash"]),
      profileKey: `${profile.profileKey}:runtime-instant`,
      effects: [...profile.effects, instant],
      runtimeGrantedEffectDefinitionIds: instantSourceDefinitionIds };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  })() : profile;
  const instantPlan = instant ? INSTANT.plan({ profile: instantProfile }) : null;
  const layout = { hit: targets.reduce((sum, target) => sum + target.layout.hit, 0),
    surge: targets.reduce((sum, target) => sum + target.layout.surge, 0),
    armour: targets.reduce((sum, target) => sum + target.layout.armour, 0),
    evade: targets.reduce((sum, target) => sum + target.layout.evade, 0) };
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_fight_chance_plan_v1",
    semanticVersion: "1.1.0", profileKey: profile.profileKey,
    profileHash: profile.profileHash, targets,
    ...(hitModifiers.weaponHitPenalty ? { printedHitThreshold: profile.hitThreshold,
      weaponHitPenalty: hitModifiers.weaponHitPenalty,
      effectiveHitThreshold: Math.min(6, Math.max(2, Number(profile.hitThreshold) + hitModifiers.weaponHitPenalty)) } : {}),
    surgeTargetUnitId: surgeTargetUnitId || null,
    criticalTargetUnitId: criticalTargetUnitId || null,
    criticalHitPlan: criticalPlan,
    instantPlan,
    instantSourceDefinitionIds: printedInstant ? [] : instantSourceDefinitionIds,
    enemyReactionDeclarationAllowed: !instant,
    enemyReactionResolutionAllowed: !instant,
    activePrecisionValue: Math.max(0, ...targets.map((entry) => entry.precision)),
    precisionChoicePolicy: "failed_hit_die_indices_up_to_active_precision_value",
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: Object.values(layout).reduce((sum, value) => sum + value, 0),
      layout, revealOrder: ["target_order", "hit", "surge", "armour", "evade"] },
    rulesTruth: "official_selected_roster_fight_chance_plan",
    trainingTruth: false }, "fightChancePlanHash");
}
function instantiateFight(state, domain, parameters, catalogueV2) {
  const gapInputs = canonicalOfficialGapInputsV1(state, parameters ?? {});
  const allowed = new Set(["closeRanksMode", "allocations", "surgeTargetUnitId",
    "criticalTargetUnitId", "leadingModelId", "path", "placements",
    "elevationTransitions", "gapMouths", "coherencyGapMouths"]);
  if (!object(parameters) || Object.keys(parameters).some((key) => !allowed.has(key))) {
    fail("SELECTED_MELEE_FIGHT_PARAMETERS_INVALID");
  }
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const initial = fightContext(
    state, domain.sideKey, piece, catalogueV2, domain.profileKey);
  const projection = closeRanksProjection(state, piece, initial.graph, parameters);
  const ranks = fightingRanks(projection.state,
    projection.state.pieces.find((entry) => entry.id === piece.id), projection.graph);
  if (ranks.contributingModelIds.length === 0) {
    fail("SELECTED_MELEE_FIGHT_RANK_EMPTY");
  }
  const targetUnitIds = graphEnemyUnitIds(projection.graph, piece.id)
    .filter((unitId) => initial.targetUnitIds.includes(unitId));
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, projection.state,
      { pieceId: piece.id, context: { weaponName: initial.profile.weaponName,
        attackKind: "close_combat", damageKind: "close_combat" } },
    ) : {};
  const effectiveRateOfAttack = Math.max(0, Number(initial.profile.rateOfAttack)
    + Number(characteristic.rateOfAttackModifier || 0));
  const attackDice = ranks.contributingModelIds.length * effectiveRateOfAttack;
  const allocations = canonicalAllocations(parameters.allocations,
    targetUnitIds, attackDice, "SELECTED_MELEE_FIGHT_ALLOCATION_INVALID");
  const surgeTargetUnitId = String(parameters.surgeTargetUnitId || "");
  const emerged = requiresOfficialBurrowedCloseRanksV1(state, piece);
  const attackState = emerged ? projection.state : state;
  const attacker = emerged ? attackState.pieces.find(row => row.id === piece.id) : piece;
  const effects = fightEffectContext(attackState, attacker, initial.profile);
  const allocatedConditional = (effects.conditionalCriticalHitValues || [])
    .filter(row => allocations.some(allocation => allocation.targetUnitId === row.targetUnitId));
  const criticalTargetUnitId = String(parameters.criticalTargetUnitId
    || (!effects.critical && allocatedConditional.length === 1 ? allocatedConditional[0].targetUnitId : ''));
  if ((surgeTargetUnitId && !allocations.some((entry) => (
    entry.targetUnitId === surgeTargetUnitId
  ))) || (criticalTargetUnitId && !allocations.some((entry) => (
    entry.targetUnitId === criticalTargetUnitId
  )))) {
    fail("SELECTED_MELEE_EFFECT_TARGET_INVALID");
  }
  const chancePlan = fightChancePlan(attackState, attacker, initial.profile, allocations,
    surgeTargetUnitId, criticalTargetUnitId);
  const canonicalParameters = { closeRanksMode: String(parameters.closeRanksMode),
    allocations, surgeTargetUnitId: surgeTargetUnitId || null,
    criticalTargetUnitId: criticalTargetUnitId || null,
    ...(projection.geometry ? { leadingModelId: String(parameters.leadingModelId),
      path: clone(parameters.path), placements: clone(parameters.placements),
      elevationTransitions: clone(parameters.elevationTransitions || []),
      ...gapInputs } : {}) };
  const plan = seal({ schemaVersion: "starcraft_tmg_selected_roster_fight_plan_v1",
    semanticVersion: "1.0.0", sideKey: domain.sideKey, pieceId: piece.id,
    domainId: domain.domainId, canonicalParameters,
    profileKey: initial.profile.profileKey,
    sourceProfileHash: initial.profile.profileHash,
    weaponName: initial.profile.weaponName,
    ...(isOfficialMeleeSidearmCarrierV1(state, piece) ? { sidearmPolicyHash: state.officialMeleeSidearmPolicy.policyHash,
      previousSequenceHash: readOfficialMeleeSidearmSequenceV1(state)?.sequenceHash || null } : {}),
    closeRanksMode: canonicalParameters.closeRanksMode,
    closeRanksGeometry: projection.geometry,
    preEngagementGraphHash: initial.graph.graphHash,
    attackEngagementGraphHash: projection.graph.graphHash,
    fightingModelIds: ranks.fightingModelIds,
    supportingModelIds: ranks.supportingModelIds,
    contributingModelIds: ranks.contributingModelIds,
    printedRateOfAttack: initial.profile.rateOfAttack,
    effectiveRateOfAttack,
    attackDice, allocations,
    fightChancePlan: chancePlan,
    fullFightingAndSupportingRankDenominator: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_fight_plan",
    trainingTruth: false }, "fightPlanHash");
  const action = freezeDeep({ actionType: "fight", sideKey: domain.sideKey,
    phase: "combat", pieceId: piece.id, weaponName: initial.profile.weaponName,
    meleePlan: plan, chance: clone(chancePlan.chance), ruleAtomIds: fightAtoms(state),
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_selected_roster_fight_instantiation",
    trainingTruth: false });
}

export function enumerateOfficialSelectedRosterMeleeActionsV1(state, options = {}) {
  const catalogueV2 = verifyRuntimeState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("SELECTED_MELEE_SIDE_INVALID", sideKey);
  const candidates = [];
  const parameterDomains = [];
  const sequence = readOfficialMeleeSidearmSequenceV1(state);
  if (state.pendingAction?.schema === OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA) {
    if (state.pendingAction.sideKey !== sideKey) return freezeDeep({ candidates,
      parameterDomains, pendingOwnedBySideKey: state.pendingAction.sideKey,
      trainingTruth: false });
    try {
      parameterDomains.push(state.pendingAction.stage === "defender_casualty_selection"
        ? meleeCasualtyChoiceDomain(state)
        : state.pendingAction.stage === "resolve_charge_after_roll"
          ? chargeResolutionDomain(state) : impactDomain(state));
    } catch (error) {
      if (options.includeDisabled === true) {
        const actionType = state.pendingAction.stage === "resolve_charge_after_roll"
          ? "resolve_charge" : "resolve_impact";
        candidates.push(diagnostic(sideKey, state.phase,
          state.pendingAction.pieceId, actionType, error,
          { pendingStage: state.pendingAction.stage }));
      }
      else throw error;
    }
    return freezeDeep({ schemaVersion:
      "starcraft_tmg_official_executable_legal_enumeration_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    candidates, parameterDomains, pendingActionOnly: true,
    searchAndStrategyExcludedFromAuthority: true, trainingTruth: false });
  }
  if (sequence) {
    if (sideKey !== sequence.sideKey) return freezeDeep({ candidates, parameterDomains, pendingOwnedBySideKey: sequence.sideKey, trainingTruth: false });
    candidates.push({ actionType: OFFICIAL_MELEE_SIDEARM_FINISH_ACTION, sideKey, phase: state.phase,
      pieceId: sequence.pieceId, sequenceHash: sequence.sequenceHash, executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION, ruleAtomIds: fightAtoms(state),
      isEnabled: true, disabledReason: '' });
  }
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey && livePiece(entry) && (!sequence || entry.id === sequence.pieceId)
  ))) {
    if (state.phase === "assault") {
      try {
        parameterDomains.push(chargeDeclarationDomain(state, sideKey, piece));
      } catch (error) {
        if (options.includeDisabled === true) candidates.push(diagnostic(sideKey,
          state.phase, piece.id, "charge", error));
      }
    } else if (state.phase === "combat") {
      const profiles = combatProfiles(state, piece, catalogueV2);
      for (const profile of profiles) {
        try {
          parameterDomains.push(fightDomain(
            state, sideKey, piece, catalogueV2, profile.profileKey));
        } catch (error) {
          if (options.includeDisabled === true) candidates.push(diagnostic(sideKey,
            state.phase, piece.id, "fight", error,
            { profileKey: profile.profileKey }));
        }
      }
    }
  }
  return freezeDeep({ schemaVersion:
    "starcraft_tmg_official_executable_legal_enumeration_v1",
  runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
  runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
  candidates: candidates.sort((left, right) => left.pieceId.localeCompare(right.pieceId)),
  parameterDomains: parameterDomains.sort((left, right) => (
    `${left.pieceId}:${left.parameterKind}`.localeCompare(
      `${right.pieceId}:${right.parameterKind}`)
  )), completeForSelectedChargeImpactAndFightRoutes: true,
  searchAndStrategyExcludedFromAuthority: true, trainingTruth: false });
}

export function instantiateOfficialSelectedRosterMeleeActionV1(
  state, domain, parameters,
) {
  const catalogueV2 = verifyRuntimeState(state);
  if (!object(domain)
    || domain.executorId !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID
    || domain.executorVersion !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION) {
    fail("SELECTED_MELEE_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialSelectedRosterMeleeActionsV1(state, {
    sideKey: domain.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SELECTED_MELEE_PARAMETER_DOMAIN_STALE");
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_CHARGE_DECLARATION_PARAMETER_KIND) {
    return instantiateChargeDeclaration(state, domain, parameters);
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_CHARGE_RESOLUTION_PARAMETER_KIND) {
    return instantiateChargeResolution(state, domain, parameters);
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND) {
    return instantiateImpact(state, domain, parameters);
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND) {
    return instantiateFight(state, domain, parameters, catalogueV2);
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_MELEE_CASUALTY_PARAMETER_KIND) {
    return instantiateMeleeCasualtyChoice(state, domain, parameters);
  }
  fail("SELECTED_MELEE_PARAMETER_KIND_UNSUPPORTED", domain.parameterKind);
}

export function previewOfficialSelectedRosterMeleeActionV1(state, domain, parameters) {
  const instantiated = instantiateOfficialSelectedRosterMeleeActionV1(
    state, domain, parameters,
  );
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_melee_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    chance: clone(instantiated.action.chance), mutationApplied: false,
    rulesAuthority: true,
    rulesTruth: "official_selected_roster_melee_preview",
    trainingTruth: false }, "previewHash");
}
function sideHasActivation(state, sideKey, phase) {
  if (state.players?.[sideKey]?.passedPhases?.[phase] === true) return false;
  return state.pieces.some((piece) => piece.sideKey === sideKey && activePiece(piece)
    && piece.activatedPhases?.[phase] !== true);
}
function alternate(state, sideKey, phase) {
  alternateOfficialPhaseActivationV1(state, sideKey, phase, sideHasActivation);
}
function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}
function surgeValue(expression, roll) {
  if (expression === "D3") return Math.ceil(roll / 2);
  if (expression === "D3+1") return Math.ceil(roll / 2) + 1;
  if (expression === "D6") return roll;
  fail("SELECTED_MELEE_SURGE_EXPRESSION_UNSUPPORTED", expression);
}
function currentTargetTough(state, action, targetId, kind, options = {}) {
  const baseTough = state.officialCharacteristicStatusFamilySourceBundle
    ? Number(projectOfficialCharacteristicStatusFamilyModifiersV1(
    state.officialCharacteristicStatusFamilySourceBundle, state, {
      pieceId: targetId, context: { attackerPieceId: action.pieceId, targetPieceId: targetId,
        attackKind: kind === 'fight' ? 'close_combat' : 'impact',
        damageKind: kind === 'fight' ? 'close_combat' : 'enemy_special_ability',
        weaponName: kind === 'fight' ? action.weaponName : 'IMPACT' },
    }).tough || 0) : 0;
  const triggerHash = options.beforeArmourReactionTriggerHashesByTarget?.[targetId];
  if (triggerHash === undefined) return baseTough;
  const projected = projectOfficialSelectedRosterArmourReactionContextV1(state, action,
    { abilityModifiers: { tough: baseTough } }, { beforeArmourReactionTriggerHash: triggerHash }, targetId);
  return projected.abilityModifiers.tough;
}

function resolvePools(state, action, plan, options, kind, preparedGraph = null, { armourOnly = false, hitOnly = false } = {}) {
  const profile = kind === "fight"
    ? getOfficialAttackProfileV2(state.officialAttackProfileCatalogueV2,
      action.meleePlan.profileKey) : null;
  const { exactEvadeDiceCountsByTarget, beforeEvadeReactionTriggerHashesByTarget } = options;
  for (const targets of [exactEvadeDiceCountsByTarget, beforeEvadeReactionTriggerHashesByTarget]) {
    if (targets !== undefined && (!object(targets)
      || Object.keys(targets).some(id => !plan.targets.some(row => row.targetUnitId === id)))) {
      fail('SELECTED_MELEE_EVADE_TARGET_INVALID');
    }
  }
  const evadeCountFor = target => {
    const count = exactEvadeDiceCountsByTarget?.[target.targetUnitId];
    if (exactEvadeDiceCountsByTarget === undefined) return target.layout.evade;
    if (!Number.isSafeInteger(count) || count < 0 || count > target.layout.evade) fail('SELECTED_MELEE_EVADE_COUNT_INVALID');
    return count;
  };
  const total = exactEvadeDiceCountsByTarget === undefined ? plan.chance.count
    : plan.targets.reduce((sum, row) => sum + row.layout.hit + (row.layout.surge || 0) + row.layout.armour + evadeCountFor(row), 0);
  const rolls = revealDice(options.chanceReveals, total, "SELECTED_MELEE_CHANCE_REVEALS_INVALID");
  let offset = 0;
  const graph = preparedGraph || deriveOfficialEngagementGraphV2(state);
  const rows = [];
  let precisionRemaining = kind === "fight" ? Number(plan.activePrecisionValue || 0) : 0;
  const toughChoices = options.toughConvertedFailedDieIndicesByTarget;
  const reactionTriggers = options.beforeArmourReactionTriggerHashesByTarget;
  if (reactionTriggers !== undefined && (!object(reactionTriggers)
    || Object.keys(reactionTriggers).some(id => !plan.targets.some(row => row.targetUnitId === id)))) {
    fail('SELECTED_MELEE_ARMOUR_REACTION_TARGET_INVALID');
  }
  if (toughChoices !== undefined && (!object(toughChoices)
    || Object.keys(toughChoices).some(id => !plan.targets.some(row => row.targetUnitId === id)))) {
    fail('SELECTED_MELEE_TOUGH_SELECTION_INVALID');
  }
  for (const targetPlan of plan.targets) {
    const target = state.pieces.find((entry) => entry.id === targetPlan.targetUnitId);
    const targetProfile = resolveOfficialEffectiveCombatProfileV1(state, target);
    const hitRolls = rolls.slice(offset, offset += targetPlan.layout.hit);
    const surgeRolls = rolls.slice(offset, offset += targetPlan.layout.surge);
    const armourRolls = rolls.slice(offset, offset += targetPlan.layout.armour);
    const evadeRolls = rolls.slice(offset, offset += evadeCountFor(targetPlan));
    const hitThreshold = kind === "impact"
      ? plan.effectiveHitThreshold : Number(plan.effectiveHitThreshold ?? profile.hitThreshold);
    const failedHitDieIndices = hitRolls.map((roll, index) => ({ roll, index }))
      .filter(({ roll }) => !rollSucceeds(roll, hitThreshold))
      .map(({ index }) => index);
    const convertedFailedHitDieIndices = kind === "fight"
      ? [...new Set((options.precisionConvertedFailedDieIndicesByTarget
        ?.[target.id] || []).map(Number))].sort((left, right) => left - right) : [];
    if (convertedFailedHitDieIndices.length > precisionRemaining
      || convertedFailedHitDieIndices.length > Number(targetPlan.precision || 0)
      || convertedFailedHitDieIndices.some((index) => (
        !Number.isSafeInteger(index) || !failedHitDieIndices.includes(index)))) {
      fail("SELECTED_MELEE_PRECISION_SELECTION_INVALID", target.id);
    }
    precisionRemaining -= convertedFailedHitDieIndices.length;
    const hits = hitRolls.filter((roll) => rollSucceeds(roll, hitThreshold)).length
      + convertedFailedHitDieIndices.length;
    let bypassedArmourDice = 0;
    let criticalReceipt = null;
    if (targetPlan.criticalHit) {
      criticalReceipt = CRITICAL_HIT.resolve(plan.criticalHitPlan, {
        attackPoolHits: hits,
      });
      bypassedArmourDice += criticalReceipt.bypassedArmourDice;
    }
    let surgeResult = 0;
    if (targetPlan.surge) {
      const surge = profile.effects.find((effect) => (
        effect.effectAtomId === "attack-effect:surge-armour-bypass-v1"
      ));
      const matched = surge.parameters.targetTags.some((tag) => (
        targetProfile.combatTags.includes(tag)
      ));
      surgeResult = matched ? surgeValue(surge.parameters.diceExpression,
        surgeRolls[0]) : 0;
      bypassedArmourDice += Math.min(hits - bypassedArmourDice, surgeResult);
    }
    const reactionTrigger = reactionTriggers?.[target.id];
    const passiveDodge = targetPlan.passiveDodge || 0;
    const dodge = reactionTrigger ? Number(projectOfficialSelectedRosterArmourReactionContextV1(state, action,
      { abilityModifiers: { dodge: passiveDodge } },
      { beforeArmourReactionTriggerHash: reactionTrigger }, target.id).abilityModifiers.dodge || 0) : passiveDodge;
    const dodgeCounts = dodge > 0 ? resolveOfficialDodgeTransferCountsV1({ armourPoolDice: hits, reduction: dodge, transferRequests: [
      { effectAtomId: 'attack-effect:surge-armour-bypass-v1', requestedDice: surgeResult },
      { effectAtomId: 'attack-effect:critical-hit-v1', requestedDice: criticalReceipt?.bypassedArmourDice || 0 },
    ] }) : null;
    if (dodgeCounts) bypassedArmourDice = dodgeCounts.transferredDamagePoolDice;
    const armourDice = hits - bypassedArmourDice;
    if (hitOnly) {
      rows.push({ target, targetProfile, demand: { targetUnitId: target.id, hits, armourDice, bypassedArmourDice } });
      continue;
    }
    const usedArmourRolls = armourRolls.slice(0, armourDice);
    const armourThreshold = consumeOfficialArmourThresholdV1(state, targetPlan.armourThreshold, targetProfile.armourThreshold);
    let armourSaves = usedArmourRolls.filter((roll) => (
      rollSucceeds(roll, armourThreshold)
    )).length;
    let toughChoice = null;
    if (toughChoices && Object.hasOwn(toughChoices, target.id)) {
      toughChoice = resolveOfficialArmourChoiceV1({ rolls: usedArmourRolls,
        threshold: armourThreshold, tough: currentTargetTough(state, action, target.id, kind, options),
        convertedFailedDieIndices: toughChoices[target.id] });
      armourSaves = toughChoice.saves;
    }
    const damageBeforeEvade = bypassedArmourDice + armourDice - armourSaves;
    const usedEvadeRolls = evadeRolls.slice(0, damageBeforeEvade);
    if (exactEvadeDiceCountsByTarget !== undefined && evadeRolls.length !== (targetPlan.evadeEligible ? damageBeforeEvade : 0)) {
      fail('SELECTED_MELEE_EVADE_COUNT_INVALID');
    }
    const evadeReaction = readOfficialBeforeEvadeReactionModifierV1(state, action, target.id,
      beforeEvadeReactionTriggerHashesByTarget?.[target.id]);
    if (evadeReaction && (!usedEvadeRolls.length || targetPlan.evadeCharacteristicUnmodifiable)) fail('SELECTED_MELEE_EVADE_REACTION_INVALID');
    const evadeThreshold = evadeReaction ? Math.max(2, Math.min(6, targetProfile.evadeThreshold
      - Number(targetPlan.evadeModifier || 0) + Number(targetPlan.antiEvade || 0) - evadeReaction)) : targetPlan.evadeThreshold;
    const evadeSaves = usedEvadeRolls.filter(roll => rollSucceeds(roll, evadeThreshold)).length;
    const damagePerDie = kind === "impact" ? 1 : Number(targetPlan.damagePerDie);
    const totalDamage = (damageBeforeEvade - evadeSaves) * damagePerDie;
    const resolution = seal({ schemaVersion:
      `starcraft_tmg_selected_roster_${kind}_target_resolution_v1`,
    targetUnitId: target.id, hitRolls, hitThreshold, hits,
    activePrecisionValue: kind === "fight" ? Number(plan.activePrecisionValue || 0) : 0,
    failedHitDieIndices, convertedFailedHitDieIndices,
    hitRollModifier: kind === "impact" ? plan.hitRollModifier : 0,
    surgeRolls, surgeResult,
    criticalHitResolutionHash: criticalReceipt?.resolutionHash || null,
    bypassedArmourDice, armourDice, armourRolls: usedArmourRolls,
      ...(dodgeCounts ? { dodge, dodgeCounts } : {}),
    unusedPreallocatedArmourRolls: armourRolls.slice(armourDice),
    armourThreshold, armourSaves,
    ...(toughChoice ? { originalArmourSaves: toughChoice.originalSaves,
      toughValue: toughChoice.toughValue, failedArmourDieIndices: toughChoice.failedDieIndices,
      convertedFailedArmourDieIndices: toughChoice.convertedFailedDieIndices } : {}),
    evadeDice: usedEvadeRolls.length, evadeRolls: usedEvadeRolls,
    evadeEligible: targetPlan.evadeEligible,
    evadeModifier: targetPlan.evadeModifier,
    evadeThreshold, evadeSaves,
    ...(evadeReaction ? { evadeReactionModifier: evadeReaction } : {}),
    damagePerDie, totalDamage,
    rulesTruth: `official_selected_roster_${kind}_pool_resolution`,
    trainingTruth: false }, "resolutionHash");
    if (armourOnly) {
      rows.push({ target, targetProfile, resolution });
      continue;
    }
    const casualtyDomain = createOfficialCurrentProductCasualtyDomainV1({
      targetPiece: target, targetProfile, incomingDamage: totalDamage,
      nonLethalStandardDamagePolicy: state.officialNonLethalStandardDamagePolicy,
      visibleModelIds: activeModels(target).map((model) => model.id),
      engagementGraph: graph, attackResolutionHash: resolution.resolutionHash,
      rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
    rows.push({ target, targetProfile, resolution, casualtyDomain });
  }
  return { rolls, rows };
}
function selectionFor(row, options) {
  const requested = options.casualtySelectionHashesByTarget?.[row.target.id];
  const modelIds = options.casualtyModelIdsByTarget?.[row.target.id];
  const hash = String(requested || (row.casualtyDomain.legalSelections.length === 1
    ? row.casualtyDomain.legalSelections[0].selectionHash : ""));
  if (!hash && !Array.isArray(modelIds)) {
    fail("SELECTED_MELEE_CASUALTY_SELECTION_REQUIRED", row.target.id);
  }
  return resolveOfficialCurrentProductCasualtyDomainV1(
    row.casualtyDomain, hash, Array.isArray(modelIds) ? modelIds : null);
}

function meleeCasualtyChoiceDomain(state) {
  const current = pending(state, "defender_casualty_selection");
  return createOfficialSelectedRosterCasualtyChoiceDomainV1(current, state, {
    parameterKind: OFFICIAL_SELECTED_ROSTER_MELEE_CASUALTY_PARAMETER_KIND,
    actionType: current.attackAction.actionType,
    phase: current.phase,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: current.attackAction.ruleAtomIds,
    rulesTruth: "official_defender_owned_melee_casualty_selection",
  });
}

function instantiateMeleeCasualtyChoice(state, domain, parameters) {
  const current = pending(state, "defender_casualty_selection");
  const explicit = current.casualtyDomain.selectionMode === "explicit_model_ids";
  const key = explicit ? "casualtyModelIds" : "casualtySelectionHash";
  if (!object(parameters) || Object.keys(parameters).some(field => field !== key)) {
    fail("SELECTED_MELEE_CASUALTY_PARAMETERS_INVALID");
  }
  const resolved = resolveOfficialCurrentProductCasualtyDomainV1(
    current.casualtyDomain, explicit ? "" : String(parameters.casualtySelectionHash || ""),
    explicit ? parameters.casualtyModelIds : null);
  const canonicalParameters = explicit
    ? { casualtyModelIds: clone(resolved.casualtyModelIds) }
    : { casualtySelectionHash: resolved.selectionHash };
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters,
    action: {
      actionType: domain.actionType, resolutionStage: "defender_casualty_selection",
      sideKey: current.defenderSideKey, phase: current.phase,
      pieceId: current.targetPieceId, attackerPieceId: current.attackerPieceId,
      pendingHash: current.pendingHash, casualtyDomainHash: current.casualtyDomainHash,
      casualtySelectionHash: resolved.selectionHash,
      ...(explicit ? { casualtyModelIds: clone(resolved.casualtyModelIds) } : {}),
      ruleAtomIds: clone(domain.ruleAtomIds),
      executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    }, rulesTruth: "official_defender_owned_melee_casualty_selection", trainingTruth: false });
}

function nextMeleeCasualtyPending(state, body, row) {
  const pendingBody = { ...body,
    sideKey: body.defenderSideKey, pieceId: row.target.id,
    targetPieceId: row.target.id, casualtyDomain: clone(row.casualtyDomain),
    casualtyDomainHash: row.casualtyDomain.domainHash,
    ...createOfficialSelectedRosterCasualtyChoiceContextV1(state,
      state.pieces.find(piece => piece.id === row.target.id)),
  };
  return { ...pendingBody, pendingHash: hashStarcraftTmgContract(pendingBody) };
}

function openMeleeCasualtyChoice(baseState, action, resolved, options, kind) {
  const selected = clone(options.casualtySelectionHashesByTarget || {});
  const selectedModelIds = clone(options.casualtyModelIdsByTarget || {});
  const missing = resolved.rows.filter(row => {
    if (selected[row.target.id] || Array.isArray(selectedModelIds[row.target.id])
      || row.casualtyDomain.legalSelections.length === 1) {
      selectionFor(row, options); // Invalid caller selections remain a real rejection.
      return false;
    }
    return true;
  });
  if (missing.length === 0) return null;
  const state = clone(baseState);
  const body = {
    schema: OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA,
    stage: "defender_casualty_selection", round: Number(state.round), phase: state.phase,
    attackerSideKey: action.sideKey, defenderSideKey: otherSide(action.sideKey),
    attackerPieceId: action.pieceId, attackAction: clone(action),
    attackActionHash: hashStarcraftTmgContract(action), kind,
    originalPendingAction: clone(state.pendingAction || null),
    chanceReveals: clone(resolved.rolls), resolvedPools: clone(resolved),
    casualtySelectionHashesByTarget: selected,
    casualtyModelIdsByTarget: selectedModelIds,
    defenderOwnsSelection: true, trainingTruth: false,
  };
  state.pendingAction = nextMeleeCasualtyPending(state, body, missing[0]);
  state.activeSideKey = body.defenderSideKey;
  const event = {
    type: "melee_attack_roll_resolved_pending_defender_casualty",
    attackerSideKey: body.attackerSideKey, defenderSideKey: body.defenderSideKey,
    attackerPieceId: body.attackerPieceId, targetPieceId: missing[0].target.id,
    pendingHash: state.pendingAction.pendingHash,
    chanceReveals: clone(resolved.rolls), stages: clone(missing[0].resolution),
    casualtyDomainHash: missing[0].casualtyDomain.domainHash,
    casualtyCount: missing[0].casualtyDomain.casualtyCount,
    legalSelectionCount: missing[0].casualtyDomain.legalSelectionCount,
    trainingTruth: false,
  };
  appendLog(state, action, [event]);
  return { state, events: [event] };
}

function applyMeleeCasualtyChoice(stateInput, action, options) {
  const current = pending(stateInput, "defender_casualty_selection");
  const selected = { ...current.casualtySelectionHashesByTarget,
    [current.targetPieceId]: action.casualtySelectionHash };
  const selectedModelIds = { ...current.casualtyModelIdsByTarget,
    ...(Array.isArray(action.casualtyModelIds)
      ? { [current.targetPieceId]: clone(action.casualtyModelIds) } : {}) };
  const state = clone(stateInput);
  const events = [{ type: "melee_defender_casualty_selection_resolved",
    attackerSideKey: current.attackerSideKey, defenderSideKey: current.defenderSideKey,
    attackerPieceId: current.attackerPieceId, targetPieceId: current.targetPieceId,
    pendingHash: current.pendingHash, casualtyDomainHash: current.casualtyDomainHash,
    casualtySelectionHash: action.casualtySelectionHash,
    casualtyModelIds: clone(resolveOfficialCurrentProductCasualtyDomainV1(
      current.casualtyDomain, action.casualtySelectionHash,
      action.casualtyModelIds || null).casualtyModelIds),
    defenderOwnedSelection: true, trainingTruth: false }];
  const next = current.resolvedPools.rows.find(row => !selected[row.target.id]
    && !Array.isArray(selectedModelIds[row.target.id])
    && row.casualtyDomain.legalSelections.length !== 1);
  if (next) {
    const body = { ...without(current, ["pendingHash"]),
      casualtySelectionHashesByTarget: selected,
      casualtyModelIdsByTarget: selectedModelIds };
    state.pendingAction = nextMeleeCasualtyPending(state, body, next);
    events.push({ type: "melee_attack_roll_resolved_pending_defender_casualty",
      attackerSideKey: current.attackerSideKey, defenderSideKey: current.defenderSideKey,
      attackerPieceId: current.attackerPieceId, targetPieceId: next.target.id,
      pendingHash: state.pendingAction.pendingHash, stages: clone(next.resolution),
      casualtyDomainHash: next.casualtyDomain.domainHash,
      casualtyCount: next.casualtyDomain.casualtyCount,
      legalSelectionCount: next.casualtyDomain.legalSelectionCount, trainingTruth: false });
    appendLog(state, action, events);
    return { state, events };
  }
  if (current.originalPendingAction) state.pendingAction = clone(current.originalPendingAction);
  else delete state.pendingAction;
  state.activeSideKey = current.attackerSideKey;
  // Dice and pool resolutions are retained: selecting removals never re-rolls.
  const settled = settleDamageAction(state, state, current.attackAction,
    { ...options, casualtySelectionHashesByTarget: selected,
      casualtyModelIdsByTarget: selectedModelIds }, current.kind,
    current.resolvedPools);
  const combined = [...events, ...settled.events];
  const log = settled.state.log.at(-1);
  log.action = clone(action); log.events = clone(combined);
  return { state: settled.state, events: combined };
}
function consumeRestriction(piece, state, action) {
  if (!piece.disengageAssaultRestriction) return null;
  const restriction = piece.disengageAssaultRestriction;
  const event = { type: "post_disengage_assault_restriction_consumed",
    pieceId: piece.id, restrictionHash: restriction.restrictionHash,
    consumedByActionType: action.actionType,
    consumedByActionHash: hashStarcraftTmgContract(action),
    tacticalMass: restriction.tacticalMass, trainingTruth: false };
  delete piece.disengageAssaultRestriction;
  return event;
}
function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`,
    round: Number(state.round), phase: state.phase,
    action: clone(action), events: clone(events) });
}
function applyChargeDeclaration(stateInput, action, options) {
  const rolls = revealDice(options.chanceReveals, action.chance.count,
    "SELECTED_MELEE_CHARGE_ROLL_REQUIRED");
  const roll = action.chargePlan.chargeDistanceRoll.keepHighest
    ? Math.max(...rolls) : rolls.reduce((sum, value) => sum + value, 0);
  const state = clone(stateInput);
  const pendingBody = { schema: OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA,
    stage: "resolve_charge_after_roll", round: Number(state.round),
    phase: "assault", sideKey: action.sideKey, pieceId: action.pieceId,
    chargePlan: clone(action.chargePlan), chargeRoll: roll,
    chargeRolls: clone(rolls),
    maxDistanceMilliInches: milli(action.chargePlan.speedInches
      + action.chargePlan.chargeDistanceModifier + roll),
    openedAtRevision: Number(options.postRevision || 0),
    sourceRefreshPerformed: false, trainingTruth: false };
  const value = { ...pendingBody,
    pendingHash: hashStarcraftTmgContract(pendingBody) };
  state.pendingAction = value;
  const event = { type: "charge_declared_and_rolled", sideKey: action.sideKey,
    pieceId: action.pieceId, chargePlanHash: action.chargePlan.chargePlanHash,
    chargeRoll: roll, chargeRolls: clone(rolls),
    maxDistanceMilliInches: value.maxDistanceMilliInches,
    pendingHash: value.pendingHash, trainingTruth: false };
  appendLog(state, action, [event]);
  return { state, events: [event] };
}
export function openOfficialChargeRollReactionV1(transition, adapter) {
  const state = transition.state;
  const rolled = transition.events.find(event => event.type === "charge_declared_and_rolled");
  if (!rolled) return transition;
  const charge = pending(state, "resolve_charge_after_roll");
  if (rolled.pendingHash !== charge.pendingHash || !charge.chargeRolls.length) {
    fail("AFTER_CHARGE_ROLL_SOURCE_MISMATCH");
  }
  const opened = adapter.openReactionWindow(state, {
    triggerKind: "after_charge_roll", activeSideKey: charge.sideKey, phase: charge.phase,
    activationId: resolveOfficialArmourRollActivationIdV1(state, charge.pieceId),
    sourceActionHash: charge.chargePlan.chargePlanHash, resumeActionHash: charge.pendingHash,
    context: { targetPieceId: charge.pieceId, chargingPieceId: charge.pieceId,
      chargeRoll: charge.chargeRoll, maxDistanceMilliInches: charge.maxDistanceMilliInches,
      enemyReactionAllowed: false },
  });
  const choices = adapter.legalSpace(opened.state).parameterDomains;
  if (!choices.some(domain => domain.actionType !== "pass_reaction_family_window")) return transition;
  return { ...transition, state: opened.state, events: [...transition.events, ...opened.events] };
}

export function finishOfficialChargeRollReactionV1(before, transition, adapter, options) {
  const owner = before.pendingOfficialReactionWindow;
  const original = pending(before, "resolve_charge_after_roll");
  if (owner.resumeActionHash !== original.pendingHash || owner.context.chargingPieceId !== original.pieceId) {
    fail("AFTER_CHARGE_ROLL_PENDING_MISMATCH");
  }
  // Only the charging side is eligible for this card. Advance the other side
  // through the ordinary reaction pass so the signed resolution retains it.
  const remaining = adapter.legalSpace(transition.state).parameterDomains;
  if (remaining.length !== 1 || remaining[0].actionType !== "pass_reaction_family_window"
    || remaining[0].sideKey === original.sideKey) fail("AFTER_CHARGE_ROLL_OPPOSING_WINDOW_INVALID");
  const passing = adapter.preview(transition.state, { domain: remaining[0], parameters: {} });
  const closed = adapter.apply(transition.state, { action: passing.action });
  const consumed = adapter.consumeReactionWindow(closed.state, { triggerHash: owner.triggerHash });
  const state = clone(consumed.state);
  state.activeSideKey = original.sideKey;
  const events = [...transition.events, ...closed.events];
  const extra = consumed.projection.chargeAdditionalDice;
  if (extra === 1) {
    const [additionalRoll] = revealDice(options.chanceReveals, 1, "AFTER_CHARGE_ROLL_EXTRA_D6_REQUIRED");
    const best = Math.max(original.chargeRoll, additionalRoll);
    const body = { ...without(original, ["pendingHash"]), chargeRoll: best,
      chargeRolls: [...original.chargeRolls, additionalRoll],
      maxDistanceMilliInches: milli(original.chargePlan.speedInches + original.chargePlan.chargeDistanceModifier + best) };
    state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
    const event = { type: "additional_charge_die_resolved", pieceId: original.pieceId,
      triggerHash: owner.triggerHash, originalRoll: original.chargeRoll, additionalRoll, keptRoll: best,
      maxDistanceMilliInches: body.maxDistanceMilliInches, pendingHash: state.pendingAction.pendingHash, trainingTruth: false };
    appendLog(state, { actionType: "additional_charge_die_resolved" }, [event]);
    events.push(event);
  } else if (extra !== 0) fail("AFTER_CHARGE_ROLL_UNSUPPORTED_EXTRA_DICE");
  const added = consumed.projection.chargeDistanceModifier;
  if (added) {
    if (added !== 1 || !consumed.projection.effects.some(effect =>
      ['card:observer/gravitic-boosters-any@1', 'card:observer/gravitic-boosters-any@2'].includes(effect.definitionId))) fail('CHARGE_DISTANCE_REACTION_SOURCE_MISMATCH');
    const adjusted = state.pendingAction;
    const body = { ...without(adjusted, ['pendingHash']), maxDistanceMilliInches: adjusted.maxDistanceMilliInches + milli(added) };
    state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
    const event = { type: 'charge_distance_increased', pieceId: original.pieceId, triggerHash: owner.triggerHash,
      modifierInches: added, maxDistanceMilliInches: body.maxDistanceMilliInches, pendingHash: state.pendingAction.pendingHash };
    appendLog(state, {actionType: 'charge_distance_increased'}, [event]);
    events.push(event);
  }
  return { ...transition, state, events };
}

function impactEligibility(state, piece, declaredTargetUnitIds) {
  const modifiers = projectOfficialMeleeFamilyModifiersV1(
    state.officialMeleeFamilySourceBundle, state, { pieceId: piece.id });
  if (!modifiers.devastatingCharge) return null;
  const allowedTargets = new Set(declaredTargetUnitIds.filter((unitId) => {
    const target = state.pieces.find((entry) => entry.id === unitId);
    const battlefield = target && state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: piece.id,
          targetPieceId: target.id, attackKind: "impact" } },
      ) : {};
    return activePiece(target) && !projectOfficialUnitRestrictionsV1(state, target.id).impactImmune
      && (!statusNamed(target, ["hidden"])
      || battlefield.hiddenSuppressedByDetection === true);
  }));
  const graph = deriveOfficialEngagementGraphV2(state);
  const fighting = new Map();
  for (const model of activeModels(piece)) {
    const targets = [...new Set(edgeForModel(graph, piece.id, model.id)
      .map((edge) => enemyUnitId(edge, piece.id))
      .filter((unitId) => allowedTargets.has(unitId)))].sort();
    if (targets.length > 0) fighting.set(model.id, targets);
  }
  const eligibleImpactModels = activeModels(piece).flatMap((model) => {
    let eligibleTargetUnitIds = fighting.get(model.id) || [];
    let rank = "fighting";
    if (eligibleTargetUnitIds.length === 0) {
      rank = "supporting";
      eligibleTargetUnitIds = [...new Set(activeModels(piece).filter((friend) => (
        friend.id !== model.id && fighting.has(friend.id)
          && baseGap(model, friend) <= TOLERANCE
      )).flatMap((friend) => fighting.get(friend.id)))].sort();
    }
    if (eligibleTargetUnitIds.length === 0) return [];
    return [{ modelId: model.id, rank, eligibleTargetUnitIds,
      baseImpactDice: modifiers.devastatingCharge.impactDicePerEligibleModel,
      additionalImpactDice: modifiers.additionalImpactDicePerEligibleModel,
      impactDice: modifiers.devastatingCharge.impactDicePerEligibleModel
        + modifiers.additionalImpactDicePerEligibleModel }];
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  return { modifiers, graphHash: graph.graphHash, eligibleImpactModels,
    targetUnitIds: [...new Set(eligibleImpactModels.flatMap((entry) => (
      entry.eligibleTargetUnitIds)))].sort() };
}
// The v2 match runtime reuses this already-established failed-Charge settlement
// only after its own versioned domain has recomputed and sealed the proof.
export function applyOfficialSelectedRosterChargeResolutionTransitionV1(
  stateInput, action,
) {
  const current = pending(stateInput, "resolve_charge_after_roll");
  const plan = action.chargeResolutionPlan;
  let state = plan.outcome === "success"
    ? applyGeometry(stateInput, action.pieceId, plan.geometry) : clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  piece.activatedPhases = { movement: false, assault: false, combat: false,
    ...(piece.activatedPhases || {}), assault: true };
  const restrictionEvent = consumeRestriction(piece, state, action);
  const events = [{ type: plan.outcome === "success"
    ? "charge_succeeded" : "charge_failed", sideKey: action.sideKey,
  pieceId: action.pieceId, chargeResolutionPlanHash: plan.chargeResolutionPlanHash,
  chargeRoll: plan.chargeRoll, declaredTargetUnitIds: plan.declaredTargetUnitIds,
  modelPositionsChanged: plan.outcome === "success",
  ...(plan.geometry?.crossedForceWallTokenIds ? { removedForceWallTokenIds: plan.geometry.crossedForceWallTokenIds } : {}),
  failureProof: plan.failureProof, trainingTruth: false }];
  if (restrictionEvent) events.push(restrictionEvent);
  const impact = plan.outcome === "success" && !isOfficialSecondChargeResolutionV1(stateInput,piece.id)
    ? impactEligibility(state, piece, plan.declaredTargetUnitIds) : null;
  if (impact?.eligibleImpactModels.length > 0) {
    const profile = impact.modifiers.devastatingCharge;
    const impactHitModifier = Number(current.chargePlan.impactHitModifier || 0);
    const impactDice = impact.eligibleImpactModels.reduce((sum, entry) => (
      sum + entry.impactDice), 0);
    const pendingBody = { schema: OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA,
      stage: "resolve_mandatory_impact", round: Number(state.round),
      phase: "assault", sideKey: action.sideKey, pieceId: action.pieceId,
      targetUnitIds: impact.targetUnitIds,
      eligibleImpactModels: clone(impact.eligibleImpactModels),
      impactEligibilityGraphHash: impact.graphHash,
      abilityName: profile.abilityName, impactDice,
      impactDicePerEligibleModel: profile.impactDicePerEligibleModel,
      additionalImpactDicePerEligibleModel:
        impact.modifiers.additionalImpactDicePerEligibleModel,
      sourceDefinitionId: profile.definitionId,
      sourceFeatureHash: profile.sourceFeatureHash,
      baseHitThreshold: profile.hitThreshold,
      hitRollModifier: impactHitModifier,
      effectiveHitThreshold: Math.max(2, profile.hitThreshold
        - impactHitModifier),
      chargeResolutionPlanHash: plan.chargeResolutionPlanHash,
      activeChargeModifiersApplied: true,
      sourceRefreshPerformed: false, trainingTruth: false };
    state.pendingAction = { ...pendingBody,
      pendingHash: hashStarcraftTmgContract(pendingBody) };
    events.push({ type: "impact_triggered_after_successful_charge",
      sideKey: action.sideKey, pieceId: action.pieceId,
      targetUnitIds: impact.targetUnitIds, impactDice,
      eligibleImpactModels: clone(impact.eligibleImpactModels),
      hitThreshold: profile.hitThreshold,
      pendingHash: state.pendingAction.pendingHash, trainingTruth: false });
  } else {
    delete state.pendingAction;
    if (!openOfficialSelectedRosterAfterActionWindowV1(
      state, action.sideKey, piece.id, "assault")) {
      alternate(state, action.sideKey, "assault");
    }
  }
  state.chargeActionHistory = Array.isArray(state.chargeActionHistory)
    ? state.chargeActionHistory : [];
  state.chargeActionHistory.push({ round: Number(state.round),
    pieceId: piece.id, outcome: plan.outcome,
    chargeResolutionPlanHash: plan.chargeResolutionPlanHash,
    trainingTruth: false });
  appendLog(state, action, events);
  return { state, events };
}
const meleeDamageReactionSchema = "starcraft_tmg_official_melee_damage_reaction_checkpoint_v1";

function openNextMeleeDamageReaction(state, action, resolvedPools, kind, fromIndex) {
  for (let targetIndex = fromIndex; targetIndex < resolvedPools.rows.length; targetIndex += 1) {
    const { target, resolution } = resolvedPools.rows[targetIndex];
    const opened = openOfficialSelectedRosterDamageReceivedWindowV1(state, action, {
      targetPieceId: target.id,
      incomingDamage: resolution.totalDamage,
      enemyReactionAllowed: kind === "impact" || action.meleePlan.fightChancePlan.enemyReactionDeclarationAllowed,
    });
    if (!opened) continue;
    const next = clone(opened.state);
    const window = next.pendingOfficialReactionWindow;
    next.pendingOfficialMeleeDamageReaction = seal({
      schema: meleeDamageReactionSchema, attackAction: clone(action), kind, targetIndex,
      resolvedPools: clone(resolvedPools), triggerHash: window.triggerHash,
      round: Number(state.round), phase: state.phase, trainingTruth: false,
    }, "checkpointHash");
    next.activeSideKey = window.prioritySideKeys[0];
    return { ...opened, state: next };
  }
  return null;
}

function resumeMeleeDamageReaction(stateInput, options) {
  const saved = stateInput.pendingOfficialMeleeDamageReaction;
  if (!saved || stateInput.pendingOfficialReactionWindow || saved.schema !== meleeDamageReactionSchema
    || saved.round !== Number(stateInput.round) || saved.phase !== stateInput.phase
    || saved.checkpointHash !== hashStarcraftTmgContract(without(saved, ["checkpointHash"]))) {
    fail("SELECTED_MELEE_DAMAGE_REACTION_CHECKPOINT_INVALID");
  }
  const consumed = consumeOfficialReactionFamilyResolutionV1(stateInput, saved.triggerHash);
  const state = clone(consumed.state);
  delete state.pendingOfficialMeleeDamageReaction;
  const action = saved.attackAction;
  state.activeSideKey = action.sideKey;
  const resolved = clone(saved.resolvedPools);
  const row = resolved.rows[saved.targetIndex];
  const target = state.pieces.find(piece => piece.id === row.target.id);
  const damagePool = resolveOfficialTotalDamagePoolReductionV1({
    priorDamageMarker: Number(target.damageMarker || 0),
    incomingDamage: row.resolution.totalDamage,
    requestedReduction: consumed.projection.damageReduction,
    minimumDamage: consumed.projection.minimumDamage,
    reductionSourceHash: consumed.projection.resolutionHash,
  });
  row.resolution = seal({ ...without(row.resolution, ["resolutionHash"]),
    reactionDamagePool: damagePool, damageReactionResolutionHash: consumed.projection.resolutionHash,
  }, "resolutionHash");
  row.casualtyDomain = createOfficialCurrentProductCasualtyDomainV1({
    targetPiece: target, targetProfile: row.targetProfile,
    incomingDamage: row.resolution.totalDamage, damagePoolReduction: damagePool,
    nonLethalStandardDamagePolicy: state.officialNonLethalStandardDamagePolicy,
    visibleModelIds: activeModels(target).map(model => model.id),
    engagementGraph: deriveOfficialEngagementGraphV2(state),
    attackResolutionHash: row.resolution.resolutionHash,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash,
  });
  const result = openNextMeleeDamageReaction(state, action, resolved, saved.kind, saved.targetIndex + 1)
    || openMeleeCasualtyChoice(state, action, resolved, options, saved.kind)
    || settleDamageAction(state, state, action, options, saved.kind, resolved);
  const event = { type: "melee_damage_reaction_resumed", sourceActionType: action.actionType,
    targetPieceId: target.id, triggerHash: saved.triggerHash, damagePool,
    chanceReusedWithoutReroll: true, trainingTruth: false };
  result.state.log.at(-1).events.unshift(clone(event));
  return { ...result, events: [event, ...result.events] };
}

function applyDamageAction(stateInput, action, options, kind, includeDamageReceivedReaction) {
  const plan = kind === "impact" ? action.impactPlan : action.meleePlan.fightChancePlan;
  const closeRanksEvents = [];
  const baseState = kind === "fight" && action.meleePlan.closeRanksGeometry
    ? applyCloseRanksGeometry(stateInput, action.pieceId, action.meleePlan.closeRanksGeometry, closeRanksEvents)
    : clone(stateInput);
  const resolved = resolvePools(baseState, action, plan, options, kind);
  for (const row of resolved.rows) recordOfficialArmourRollV1(baseState, {
    action, targetPieceId: row.target.id, poolDice: row.resolution.armourDice });
  const reaction = includeDamageReceivedReaction && openNextMeleeDamageReaction(baseState, action, resolved, kind, 0);
  const result = reaction || openMeleeCasualtyChoice(baseState, action, resolved, options, kind)
    || settleDamageAction(stateInput, baseState, action, options, kind, resolved);
  if (!closeRanksEvents.length) return result;
  if ((result.state.log?.length || 0) > (stateInput.log?.length || 0)) {
    result.state.log.at(-1).events.unshift(...clone(closeRanksEvents));
  }
  return { ...result, events: [...closeRanksEvents, ...result.events] };
}
function settleDamageAction(stateInput, baseState, action, options, kind, resolved) {
  const plan = kind === "impact" ? action.impactPlan : action.meleePlan.fightChancePlan;
  const state = clone(baseState);
  const events = [];
  for (const row of resolved.rows) {
    const casualty = selectionFor(row, options);
    const target = state.pieces.find((entry) => entry.id === row.target.id);
    const beforeSupply = Number(target.currentSupply);
    applyOfficialSelectedRosterResolvedDamageV1(state, target, row.targetProfile, casualty);
    events.push({ type: kind === "fight" ? "close_combat_attack" : "impact_damage",
      sideKey: action.sideKey, pieceId: action.pieceId, targetId: target.id,
      weaponName: kind === "fight" ? action.weaponName : "IMPACT",
      resolutionHash: row.resolution.resolutionHash,
      casualtyDomainHash: row.casualtyDomain.domainHash,
      casualtyResolutionHash: casualty.resolutionHash,
      stages: clone(row.resolution), casualtyModelIds: casualty.casualtyModelIds,
      postDamageMarker: casualty.postDamageMarker,
      currentSupplyBefore: beforeSupply,
      currentSupplyAfter: Number(target.currentSupply),
      targetDestroyed: casualty.targetDestroyed,
      enemyReactionAllowed: kind === "fight"
        ? plan.enemyReactionDeclarationAllowed : true,
      trainingTruth: false });
  }
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const sidearmBatch = kind === 'fight' && isOfficialMeleeSidearmCarrierV1(state, piece);
  if (kind === "fight") {
    if (!sidearmBatch) piece.activatedPhases = { movement: false, assault: false, combat: false,
      ...(piece.activatedPhases || {}), combat: true };
    consumeOfficialSelectedRosterFirstWeaponModifierV1(state, piece.id, action.weaponName);
    if (state.officialCharacteristicStatusFamilySourceBundle) {
      consumeOfficialCharacteristicStatusFirstWeaponEffectsV1(
        state, piece.id, "close_combat",action.weaponName);
    }
    if (state.officialBattlefieldAssetFamilySourceBundle) {
      consumeOfficialBattlefieldAssetFirstWeaponEffectsV1(state, piece.id, action.weaponName);
    }
    if (state.officialProtossUniqueFamilySourceBundle) {
      const consumed = consumeOfficialProtossUniqueFirstWeaponEffectV1(
        state, piece.id, action.weaponName);
      if (consumed.length > 0) {
        events.push({ type: "protoss_first_weapon_instant_consumed",
          pieceId: piece.id, consumedEffects: consumed, trainingTruth: false });
      }
    }
  } else {
    delete state.pendingAction;
  }
  const recorded = recordOfficialSupplyLossesV1({ stateBefore: stateInput,
    stateAfter: state, action, events,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
  state.supplyLossLedger = clone(recorded.ledger);
  events.push(...recorded.supplyLossEvents.map(clone));
  const activationPhase = kind === "fight" ? "combat" : "assault";
  let continuingSidearm = false;
  if (sidearmBatch) {
    state.activeSideKey = action.sideKey;
    const sequence = recordOfficialMeleeSidearmBatchV1(state, action);
    const remainingProfileKeys = activePiece(piece) ? combatProfiles(state, piece, state.officialAttackProfileCatalogueV2)
      .filter(profile => {
        try {
          fightContext(state, action.sideKey, piece, state.officialAttackProfileCatalogueV2, profile.profileKey);
          return fightingRanks(state, piece, deriveOfficialEngagementGraphV2(state)).contributingModelIds.length > 0;
        } catch { return false; }
      }).map(profile => profile.profileKey).sort() : [];
    continuingSidearm = remainingProfileKeys.length > 0;
    events.push({ type: 'melee_sidearm_batch_completed', sideKey: action.sideKey, pieceId: piece.id,
      sequenceHash: sequence.sequenceHash, usedProfileKeys: clone(sequence.usedProfileKeys), remainingProfileKeys,
      trainingTruth: false });
    if (!continuingSidearm) {
      delete state.pendingOfficialMeleeSidearmSequence;
      piece.activatedPhases = { movement: false, assault: false, ...(piece.activatedPhases || {}), combat: true };
    }
  }
  if (!continuingSidearm) {
    if (!openOfficialSelectedRosterAfterActionWindowV1(
      state, action.sideKey, piece.id, activationPhase)) {
      alternate(state, action.sideKey, activationPhase);
    }
  }
  const historyKey = kind === "fight" ? "fightActionHistory" : "impactActionHistory";
  state[historyKey] = Array.isArray(state[historyKey]) ? state[historyKey] : [];
  state[historyKey].push({ round: Number(state.round), phase: state.phase,
    pieceId: action.pieceId,
    planHash: kind === "fight" ? action.meleePlan.fightPlanHash
      : action.impactPlan.impactPlanHash,
    targetResolutionHashes: resolved.rows.map((row) => row.resolution.resolutionHash),
    trainingTruth: false });
  appendLog(state, action, events);
  return { state, events };
}

function verifyMeleeAction(stateInput, actionInput) {
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID
    || actionInput.executorVersion !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION) {
    fail("SELECTED_MELEE_ACTION_INVALID");
  }
  const domain = enumerateOfficialSelectedRosterMeleeActionsV1(stateInput, {
    sideKey: actionInput.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => (
    entry.domainId === (actionInput.chargePlan?.domainId
      || actionInput.chargeResolutionPlan?.domainId
      || actionInput.meleePlan?.domainId)
      || (actionInput.pendingHash !== undefined
        && entry.constraints?.pendingHash === actionInput.pendingHash)
      || (actionInput.chargeResolutionPlan?.pendingHash !== undefined
        && entry.constraints?.pendingHash
          === actionInput.chargeResolutionPlan.pendingHash)
  ));
  if (!domain) fail("SELECTED_MELEE_PARAMETER_DOMAIN_STALE");
  const parameters = actionInput.resolutionStage === "defender_casualty_selection"
    ? (Array.isArray(actionInput.casualtyModelIds)
      ? { casualtyModelIds: actionInput.casualtyModelIds }
      : { casualtySelectionHash: actionInput.casualtySelectionHash })
    : actionInput.chargePlan
    ? { leadingModelId: actionInput.chargePlan.leadingModelId,
      targets: actionInput.chargePlan.targets }
    : actionInput.chargeResolutionPlan
      ? actionInput.chargeResolutionPlan.canonicalParameters
      : actionInput.actionType === "resolve_impact"
        ? { allocations: actionInput.modelAllocations }
        : actionInput.meleePlan.canonicalParameters;
  const expected = instantiateOfficialSelectedRosterMeleeActionV1(
    stateInput, domain, parameters,
  );
  if (!isDeepStrictEqual(expected.action, actionInput)) {
    fail("SELECTED_MELEE_ACTION_STALE");
  }
}

function meleePoolWork(stateInput, action) {
  verifyMeleeAction(stateInput, action);
  const kind = action.actionType === 'fight' ? 'fight' : action.actionType === 'resolve_impact' ? 'impact' : null;
  if (!kind || action.resolutionStage === 'defender_casualty_selection') fail('SELECTED_MELEE_POOL_ACTION_REQUIRED');
  const state = kind === 'fight' && action.meleePlan.closeRanksGeometry
    ? applyCloseRanksGeometry(stateInput, action.pieceId, action.meleePlan.closeRanksGeometry) : stateInput;
  return { state, kind, plan: kind === 'fight' ? action.meleePlan.fightChancePlan : action.impactPlan };
}

export function inspectOfficialSelectedRosterMeleeActionContextV1(stateInput, action) {
  const { state, kind, plan } = meleePoolWork(stateInput, action);
  const profile = kind === 'fight' ? getOfficialAttackProfileV2(state.officialAttackProfileCatalogueV2
    || createOfficialAttackProfileCatalogueV2({ previousCatalogue: state.officialAttackProfileCatalogue }), action.meleePlan.profileKey) : null;
  return freezeDeep({ kind, poolPlan: plan, targets: plan.targets.map(row => ({
    targetUnitId: row.targetUnitId, sideKey: state.pieces.find(piece => piece.id === row.targetUnitId).sideKey,
    layout: clone(row.layout), hitThreshold: kind === 'fight' ? Number(plan.effectiveHitThreshold ?? profile.hitThreshold) : plan.effectiveHitThreshold,
    precision: Number(row.precision || 0), tough: currentTargetTough(state, action, row.targetUnitId, kind),
  })), precision: Number(plan.activePrecisionValue || 0) });
}

export function inspectOfficialSelectedRosterMeleeArmourChoiceV1(stateInput, action, request, evadeSelection = null) {
  if (!object(request) || Object.keys(request).some(key => !['targetUnitId', 'hitRolls', 'surgeRolls',
    'armourRolls', 'convertedFailedHitDieIndices', 'beforeArmourReactionTriggerHash'].includes(key))) fail('SELECTED_MELEE_ARMOUR_REQUEST_INVALID');
  const { state, kind, plan } = meleePoolWork(stateInput, action);
  const target = plan.targets.find(row => row.targetUnitId === request.targetUnitId);
  if (!target) fail('SELECTED_MELEE_ARMOUR_TARGET_INVALID');
  for (const [key, count] of [['hitRolls', target.layout.hit], ['surgeRolls', target.layout.surge || 0], ['armourRolls', target.layout.armour]]) {
    revealDice(request[key], count, 'SELECTED_MELEE_ARMOUR_REVEALS_INVALID');
  }
  const projectionTarget = { ...target, layout: { ...target.layout, evade: 0 } };
  const reveals = [...request.hitRolls, ...request.surgeRolls, ...request.armourRolls];
  const projection = { ...plan, targets: [projectionTarget], chance: { ...plan.chance, count: reveals.length } };
  const reactionOptions = request.beforeArmourReactionTriggerHash === undefined ? {}
    : { beforeArmourReactionTriggerHashesByTarget: { [target.targetUnitId]: request.beforeArmourReactionTriggerHash } };
  const { rows } = resolvePools(state, action, projection, { ...reactionOptions, chanceReveals: reveals,
    precisionConvertedFailedDieIndicesByTarget: { [target.targetUnitId]: request.convertedFailedHitDieIndices || [] },
    ...(evadeSelection !== null ? { toughConvertedFailedDieIndicesByTarget: { [target.targetUnitId]: evadeSelection } } : {}) },
  kind, null, { armourOnly: true });
  const resolution = rows[0].resolution;
  if (evadeSelection !== null) return { count: target.evadeEligible
    ? resolution.bypassedArmourDice + resolution.armourDice - resolution.armourSaves : 0,
    modifiable: target.evadeCharacteristicUnmodifiable !== true };
  const tough = currentTargetTough(state, action, target.targetUnitId, kind, reactionOptions);
  const facts = inspectOfficialArmourChoiceV1({ rolls: resolution.armourRolls,
    threshold: resolution.armourThreshold, tough });
  return freezeDeep(seal({ schema: 'starcraft_tmg_melee_armour_choice_facts_v1', targetUnitId: target.targetUnitId,
    armourRolls: resolution.armourRolls, armourThreshold: resolution.armourThreshold,
    originalSaves: facts.originalSaves, failedDieIndices: facts.failedDieIndices,
    tough, maximumConvertedDice: facts.maximumConvertedDice, evadeDiceRolled: false }, 'factsHash'));
}

export function inspectOfficialSelectedRosterMeleeArmourDemandV1(stateInput, action, request) {
  if (!object(request) || Object.keys(request).some(key => !['targetUnitId', 'hitRolls', 'surgeRolls',
    'convertedFailedHitDieIndices'].includes(key))) fail('SELECTED_MELEE_ARMOUR_DEMAND_REQUEST_INVALID');
  const { state, kind, plan } = meleePoolWork(stateInput, action);
  const target = plan.targets.find(row => row.targetUnitId === request.targetUnitId);
  if (!target) fail('SELECTED_MELEE_ARMOUR_TARGET_INVALID');
  revealDice(request.hitRolls, target.layout.hit, 'SELECTED_MELEE_ARMOUR_REVEALS_INVALID');
  revealDice(request.surgeRolls, target.layout.surge || 0, 'SELECTED_MELEE_ARMOUR_REVEALS_INVALID');
  const projectionTarget = { ...target, layout: { ...target.layout, armour: 0, evade: 0 } };
  const reveals = [...request.hitRolls, ...request.surgeRolls];
  const projection = { ...plan, targets: [projectionTarget], chance: { ...plan.chance, count: reveals.length } };
  const resolved = resolvePools(state, action, projection, { chanceReveals: reveals,
    precisionConvertedFailedDieIndicesByTarget: { [target.targetUnitId]: request.convertedFailedHitDieIndices || [] } },
  kind, null, { hitOnly: true });
  return freezeDeep(seal({ schema: 'starcraft_tmg_melee_armour_demand_v1', ...resolved.rows[0].demand,
    defenceDiceRolled: false, trainingTruth: false }, 'factsHash'));
}

export function resolveOfficialSelectedRosterMeleeChanceV1(stateInput, action, options) {
  const { state, kind, plan } = meleePoolWork(stateInput, action);
  const resolved = resolvePools(state, action, plan, options, kind);
  return freezeDeep({ rows: resolved.rows.map(row => ({ targetUnitId: row.target.id,
    targetProfile: row.targetProfile, resolution: row.resolution, casualtyDomain: row.casualtyDomain })) });
}

function finishSidearmSequence(stateInput, action) {
  const sequence = readOfficialMeleeSidearmSequenceV1(stateInput);
  const candidate = enumerateOfficialSelectedRosterMeleeActionsV1(stateInput, { sideKey: action.sideKey }).candidates
    .find(row => row.actionType === OFFICIAL_MELEE_SIDEARM_FINISH_ACTION);
  if (!sequence || !candidate || !isDeepStrictEqual(without(candidate, ['isEnabled', 'disabledReason', 'score', 'details']), action)) {
    fail('MELEE_SIDEARM_FINISH_STALE');
  }
  const state = clone(stateInput), piece = state.pieces.find(row => row.id === sequence.pieceId);
  delete state.pendingOfficialMeleeSidearmSequence;
  piece.activatedPhases = { movement: false, assault: false, ...(piece.activatedPhases || {}), combat: true };
  if (!openOfficialSelectedRosterAfterActionWindowV1(state, sequence.sideKey, piece.id, 'combat')) {
    alternate(state, sequence.sideKey, 'combat');
  }
  const events = [{ type: 'melee_sidearm_sequence_finished', pieceId: piece.id, sideKey: sequence.sideKey,
    sequenceHash: sequence.sequenceHash, usedProfileKeys: clone(sequence.usedProfileKeys), voluntarilyStopped: true, trainingTruth: false }];
  appendLog(state, action, events);
  return { state, events };
}
export function applyOfficialSelectedRosterMeleeActionV1(stateInput, actionInput, options = {},
  includeDamageReceivedReaction = false) {
  const finishing = actionInput?.actionType === OFFICIAL_MELEE_SIDEARM_FINISH_ACTION;
  if (!finishing) verifyMeleeAction(stateInput, actionInput);
  let result;
  if (finishing) {
    result = finishSidearmSequence(stateInput, actionInput);
  } else if (actionInput.resolutionStage === "defender_casualty_selection") {
    result = applyMeleeCasualtyChoice(stateInput, actionInput, options);
  } else if (actionInput.actionType === "charge") {
    result = applyChargeDeclaration(stateInput, actionInput, options);
  } else if (actionInput.actionType === "resolve_charge") {
    result = applyOfficialSelectedRosterChargeResolutionTransitionV1(
      stateInput, actionInput);
  } else if (actionInput.actionType === "resolve_impact") {
    result = applyDamageAction(stateInput, actionInput, options, "impact", includeDamageReceivedReaction);
  } else if (actionInput.actionType === "fight") {
    result = applyDamageAction(stateInput, actionInput, options, "fight", includeDamageReceivedReaction);
  } else fail("SELECTED_MELEE_ACTION_TYPE_UNSUPPORTED", actionInput.actionType);
  return freezeDeep({ ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_melee_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0),
    state: result.state, action: clone(actionInput), events: result.events,
    rulesTruth: "official_selected_roster_melee_transition",
    trainingTruth: false });
}

// Expose the same verified movement used by Fight without rolling its pools.
// The caller owns committing this projection and the later Fight continuation.
export function projectOfficialSelectedRosterCloseRanksMovementV1(state, action) {
  verifyMeleeAction(state, action);
  if (action.actionType !== 'fight' || !action.meleePlan.closeRanksGeometry) {
    fail('SELECTED_MELEE_CLOSE_RANKS_GEOMETRY_REQUIRED');
  }
  return applyCloseRanksGeometry(state, action.pieceId, action.meleePlan.closeRanksGeometry);
}

// A read-only chance query owns ONE immutable Native action/geometry. Reuse the
// same resolver as Apply; callers cannot inject a profile, graph or damage.
export function createOfficialSelectedRosterMeleeChanceResolverV1(state, domain, parameters) {
  const snapshot = freezeDeep(clone(state));
  const preview = previewOfficialSelectedRosterMeleeActionV1(snapshot, domain, parameters);
  if (preview.action.actionType !== "fight") fail("SELECTED_MELEE_CHANCE_FIGHT_REQUIRED");
  const action = preview.action;
  const chanceState = freezeDeep(action.meleePlan.closeRanksGeometry
    ? applyCloseRanksGeometry(snapshot, action.pieceId, action.meleePlan.closeRanksGeometry) : snapshot);
  const graph = deriveOfficialEngagementGraphV2(chanceState);
  return Object.freeze({
    preview, snapshot: chanceState,
    resolve(options = {}) {
      const resolved = resolvePools(chanceState, action, action.meleePlan.fightChancePlan,
        options, "fight", graph);
      return freezeDeep({ rows: resolved.rows.map(row => ({
        targetUnitId: row.target.id, targetProfile: row.targetProfile,
        resolution: row.resolution, casualtyDomain: row.casualtyDomain,
      })) });
    },
  });
}

export function queryOfficialSelectedRosterMeleeActionV1(input = {}) {
  const state = input.state; const request = input.request;
  const queryKind = String(request?.queryKind || request?.kind || "");
  if (!new Set(["instantiate_parameterized_action", "charge_geometry",
    "fight_ranks_and_attack_pool", "resolve_chance_and_casualty_domains"])
    .has(queryKind)) fail("SELECTED_MELEE_QUERY_KIND_UNSUPPORTED", queryKind);
  const domain = enumerateOfficialSelectedRosterMeleeActionsV1(state, {
    sideKey: request.sideKey || state.activeSideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === request.domainId);
  if (!domain) fail("SELECTED_MELEE_QUERY_DOMAIN_STALE");
  const preview = previewOfficialSelectedRosterMeleeActionV1(
    state, domain, request.parameters || {},
  );
  let chance = null;
  if (queryKind === "resolve_chance_and_casualty_domains"
    && ["fight", "resolve_impact"].includes(preview.action.actionType)) {
    const action = preview.action;
    let chanceState = state;
    if (action.actionType === "fight" && action.meleePlan.closeRanksGeometry) {
      chanceState = applyCloseRanksGeometry(state, action.pieceId,
        action.meleePlan.closeRanksGeometry);
    }
    chance = resolvePools(chanceState, action,
      action.actionType === "fight" ? action.meleePlan.fightChancePlan
        : action.impactPlan,
      { chanceReveals: request.chanceReveals },
      action.actionType === "fight" ? "fight" : "impact");
  }
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_melee_query_v1",
    semanticVersion: "1.0.0", ok: true, precision: "exact",
    queryKind, domainId: domain.domainId,
    result: { preview, action: preview.action,
      resolutions: chance?.rows.map((entry) => entry.resolution) || null,
      casualtyDomains: chance?.rows.map((entry) => entry.casualtyDomain) || null },
    source: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialSelectedRosterMeleeActionRuntimeV1(state, { includeDamageReceivedReaction = false } = {}) {
  const catalogueV2 = verifyRuntimeState(state);
  const routes = state.pieces.flatMap((piece) => {
    const profiles = combatProfiles(state, piece, catalogueV2);
    const tags = new Set([piece.combatTag, ...(piece.combatTags || [])]
      .map(normalizedName).filter(Boolean));
    const ground = tags.has("ground") && !tags.has("flying");
    const impact = projectOfficialMeleeFamilyModifiersV1(
      state.officialMeleeFamilySourceBundle, state, { pieceId: piece.id })
      .devastatingCharge;
    return [
      ...(ground ? [{ routeId: `${piece.id}:charge`, pieceId: piece.id,
        officialUnitRecordKey: piece.officialUnitRecordKey,
        actionType: "charge", phase: "assault", routeStatus: "executable_exact",
        executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
        executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
        ruleAtomIds: [...CHARGE_ATOMS] }] : []),
      ...profiles.map((profile) => ({
        routeId: `${piece.id}:fight:${profile.profileKey}`, pieceId: piece.id,
        officialUnitRecordKey: piece.officialUnitRecordKey,
        actionType: "fight", phase: "combat", profileKey: profile.profileKey,
        profileHash: profile.profileHash, weaponName: profile.weaponName,
        routeStatus: "executable_exact",
        executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
        executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
        ruleAtomIds: fightAtoms(state) })),
      ...(impact ? [{
        routeId: `${piece.id}:impact:devastating-charge`, pieceId: piece.id,
        officialUnitRecordKey: piece.officialUnitRecordKey,
        actionType: "resolve_impact", phase: "assault",
        profile: clone(impact),
        routeStatus: "executable_exact",
        executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
        executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
        ruleAtomIds: [...IMPACT_ATOMS],
      }] : []),
    ];
  }).sort((left, right) => left.routeId.localeCompare(right.routeId));
  const descriptor = seal({
    schemaVersion: "starcraft_tmg_selected_roster_melee_runtime_descriptor_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    selectedUnitCount: state.pieces.length,
    selectedChargeRouteCount: routes.filter((route) => route.actionType === "charge").length,
    selectedFightRouteCount: routes.filter((route) => route.actionType === "fight").length,
    selectedImpactRouteCount: routes.filter((route) => (
      route.actionType === "resolve_impact"
    )).length,
    unsupportedSelectedChargeImpactFightRouteCount: 0,
    routes, actions: ["charge", "resolve_charge", "resolve_impact", "fight",
      ...(hasOfficialMeleeSidearmPolicyV1(state) ? [OFFICIAL_MELEE_SIDEARM_FINISH_ACTION] : [])],
    ...(hasOfficialMeleeSidearmPolicyV1(state) ? { meleeSidearmPolicyHash: state.officialMeleeSidearmPolicy.policyHash,
      sidearmConsumerScope: 'source_bound_single_model_defiler_melee_batches' } : {}),
    stagedChargeChoicePointsExact: true,
    fullBaseChargeAndCloseRanksGeometryExact: true,
    fightingAndSupportingRankDenominatorExact: true,
    multiEnemyAllocationAndCasualtySelectionExact: true,
    criticalHitExistingDiceTransferExact: true,
    instantReactionProhibitionExact: true,
    surgeArmourBypassExact: true,
    supplyLossLedgerIntegrated: true,
    activeCardModifiersApplied: ["Stimpack", "Combat Shield",
      "Leap", "Adrenal Overload", "Wild Mutation"],
    precisionChoiceUsesFailedHitDieIndices: true,
    afterActionAbilityWindowIntegrated: true,
    legalSpacePreviewApplyAndQueryShareInstantiation: true,
    arbitraryRosterClosureClaimed: true,
    sourceRefreshPerformed: false, productionRoomEligible: true,
    rulesTruth: "official_current_product_charge_impact_fight_runtime",
    trainingTruth: false,
  }, "runtimeHash");
  const supportedProfiles = new Set(routes.filter(route => route.actionType === 'fight').map(route => route.profileKey));
  const summonBundle = state.officialSummonDataBundle;
  const generatedByRecord = new Map((state.officialRespawnMorphDataBundle?.currentMorphCarriers ?? [])
    .map(row => [row.createdUnitProfile.recordKey, row.createdUnitProfile]));
  if (summonBundle?.schema === 'starcraft_tmg_official_summon_data_bundle_v2') {
    verifyOfficialSummonDataBundleV1(summonBundle);
    for (const profile of summonBundle.summonedUnitProfiles) generatedByRecord.set(profile.recordKey, profile);
  }
  if (generatedByRecord.size) {
    for (const profile of catalogueV2.profiles) {
      const source = generatedByRecord.get(profile.recordKey);
      if (source && source.sourceRecordHash === profile.sourceRecordHash && source.payloadHash === profile.payloadHash
        && profile.phase === 'combat' && profile.range.kind === 'engagement'
        && isOfficialRosterAttackProfileFieldedV1(state, { selectedUpgradeNames: [] }, profile)) {
        supportedProfiles.add(profile.profileKey);
      }
    }
  }
  return freezeDeep({ descriptor, supportsProfile: key => supportedProfiles.has(key),
    enumerate: enumerateOfficialSelectedRosterMeleeActionsV1,
    instantiate: instantiateOfficialSelectedRosterMeleeActionV1,
    preview: previewOfficialSelectedRosterMeleeActionV1,
    apply: (current, action, options) => applyOfficialSelectedRosterMeleeActionV1(current, action, options,
      includeDamageReceivedReaction),
    ...(includeDamageReceivedReaction ? { resumeDamageReaction: resumeMeleeDamageReaction } : {}),
    inspectContext: inspectOfficialSelectedRosterMeleeActionContextV1,
    inspectArmour: inspectOfficialSelectedRosterMeleeArmourChoiceV1,
    inspectEvadeDemand: (state, action, request, selection) =>
      inspectOfficialSelectedRosterMeleeArmourChoiceV1(state, action, request, selection),
    inspectArmourDemand: inspectOfficialSelectedRosterMeleeArmourDemandV1,
    resolveChance: resolveOfficialSelectedRosterMeleeChanceV1,
    projectCloseRanksMovement: projectOfficialSelectedRosterCloseRanksMovementV1,
    query: queryOfficialSelectedRosterMeleeActionV1 });
}

export function verifyOfficialSelectedRosterMeleeRuntimeDescriptorV1(descriptor) {
  if (!object(descriptor)
    || descriptor.runtimeId !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID
    || descriptor.runtimeVersion !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION
    || descriptor.runtimeHash !== hashStarcraftTmgContract(
      without(descriptor, ["runtimeHash"]))
    || !Number.isSafeInteger(descriptor.selectedUnitCount)
    || descriptor.selectedUnitCount < 1
    || descriptor.selectedChargeRouteCount !== descriptor.routes.filter((entry) => (
      entry.actionType === "charge")).length
    || descriptor.selectedFightRouteCount !== descriptor.routes.filter((entry) => (
      entry.actionType === "fight")).length
    || descriptor.selectedImpactRouteCount !== descriptor.routes.filter((entry) => (
      entry.actionType === "resolve_impact")).length
    || descriptor.unsupportedSelectedChargeImpactFightRouteCount !== 0
    || descriptor.routes?.length !== descriptor.selectedChargeRouteCount
      + descriptor.selectedFightRouteCount + descriptor.selectedImpactRouteCount
    || descriptor.stagedChargeChoicePointsExact !== true
    || descriptor.fullBaseChargeAndCloseRanksGeometryExact !== true
    || descriptor.legalSpacePreviewApplyAndQueryShareInstantiation !== true
    || descriptor.arbitraryRosterClosureClaimed !== true
    || descriptor.productionRoomEligible !== true
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.trainingTruth !== false) {
    fail("SELECTED_MELEE_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
