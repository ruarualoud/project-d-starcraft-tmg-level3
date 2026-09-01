import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  getOfficialSummonedUnitProfileV1,
  verifyOfficialSummonDataBundleV1,
} from "../source-data/official-summon-data-bundle-v1.mjs";
import { resolveOfficialCurrentSupplyValueV1 } from
  "./official-unit-card-supply-rules-kernel-v1.mjs";
import {
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialCoherencyPlacementV1,
} from "./official-model-base-geometry-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "summon_activation", "summon_deployment", "summon_placement", "summon_supply",
  "summoned_unit_classification", "summoned_unit_relationships",
]);
const PHASES = new Set(["movement", "assault", "combat"]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const result = String(value || "").trim(); if (!result) fail(code); return result;
}
function result(body) { return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) }); }
function bundleFor(input) {
  const bundle = input.summonDataBundle; verifyOfficialSummonDataBundleV1(bundle); return bundle;
}
function live(piece) { return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0; }
function active(piece) { return live(piece) && piece?.isOnField === true; }
function pieceFor(state, pieceId, code = "SUMMON_UNIT_REQUIRED") {
  const piece = state?.pieces?.find((entry) => entry.id === pieceId);
  if (!piece) fail(code, String(pieceId || "")); return piece;
}
function exactCurrentSupply(bundle, piece) {
  const resolution = resolveOfficialCurrentSupplyValueV1({
    unitCardSupplyDataBundle: bundle.unitCardSupplyDataBundle,
    recordKey: piece.officialUnitRecordKey, currentModels: Number(piece.currentModels),
    isDestroyed: piece.isDestroyed === true,
    rulesOwnedCurrentModelCountRequested: true,
  });
  if (Number(piece.currentSupply) !== resolution.currentSupplyValue) {
    fail("SUMMON_CURRENT_SUPPLY_STATE_DRIFT", piece.id);
  }
  return resolution;
}
function eventForHash(state, eventHash, code) {
  const hash = String(eventHash || "");
  if (!/^[a-f0-9]{64}$/u.test(hash)) fail(code);
  const events = (state.log || []).flatMap((entry) => entry?.events || []);
  const matches = events.filter((event) => hashStarcraftTmgContract(event) === hash);
  if (matches.length !== 1) fail(code, hash);
  return matches[0];
}
function footprintBounds(footprint) {
  if (footprint.shape === "round") return {
    minY: footprint.center.yMilliInches - footprint.radiusMilliInches,
    maxY: footprint.center.yMilliInches + footprint.radiusMilliInches,
  };
  return { minY: Math.min(...footprint.vertices.map((entry) => entry.yMilliInches)),
    maxY: Math.max(...footprint.vertices.map((entry) => entry.yMilliInches)) };
}
function phaseMarker(piece, phase) {
  return { ...(piece.activatedPhases || {}), [phase]: true };
}

export function resolveOfficialSummonedUnitClassificationV1(input = {}) {
  const bundle = bundleFor(input);
  const recordKey = nonEmpty(input.recordKey, "SUMMONED_UNIT_PROFILE_REQUIRED");
  const profile = getOfficialSummonedUnitProfileV1(bundle, recordKey);
  if (input.rulesOwnedClassificationRequested !== true
    || input.clientSuppliedArmyListEligibility !== undefined
    || input.clientSuppliedReserveStatus !== undefined) {
    fail("SUMMONED_UNIT_CLASSIFICATION_REQUEST_INVALID");
  }
  return result({ schema: "starcraft_tmg_official_summoned_unit_classification_v1",
    recordKey, unitName: profile.unitName,
    includedInArmyListDuringArmyBuilding: false, armySlotType: null, armySlotCount: 0,
    startsInReserves: false, regularDeploymentAllowed: false,
    deploymentAuthority: "special_ability_only", printedMineralCost: 0,
    fieldableDuringArmyBuilding: false, exactCurrentOfficialProfile: true,
    clientSuppliedClassificationAccepted: false, trainingTruth: false });
}

export function resolveOfficialSummonSupplyV1(input = {}) {
  const bundle = bundleFor(input); const state = input.state;
  const sideKey = nonEmpty(input.sideKey, "SUMMON_SIDE_REQUIRED");
  const summoned = pieceFor(state, input.summonedPieceId);
  getOfficialSummonedUnitProfileV1(bundle, summoned.officialUnitRecordKey);
  if (!object(state?.players?.[sideKey]) || summoned.sideKey !== sideKey
    || summoned.isOnField === true || summoned.isInReserves === true || !live(summoned)
    || input.rulesOwnedSupplyRequested !== true
    || input.clientSuppliedAvailableSupply !== undefined
    || input.clientSuppliedSummonedCurrentSupply !== undefined) {
    fail("SUMMON_SUPPLY_REQUEST_INVALID");
  }
  const gameplay = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplay);
  const mission = gameplay.missionScoringProfile;
  const round = Number(state.round);
  if (!Number.isSafeInteger(round) || round < 1 || round > mission.gameLengthRounds) {
    fail("SUMMON_ROUND_INVALID");
  }
  const summonedSupply = exactCurrentSupply(bundle, summoned);
  const fieldedRows = (state.pieces || []).filter((piece) => (
    piece.sideKey === sideKey && piece.id !== summoned.id && active(piece)
  )).map((piece) => {
    const supply = exactCurrentSupply(bundle, piece);
    return { pieceId: piece.id, recordKey: piece.officialUnitRecordKey,
      currentModels: piece.currentModels, currentSupplyValue: supply.currentSupplyValue,
      currentSupplyResolutionHash: supply.resultHash };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  const totalCurrentSupplyBefore = fieldedRows.reduce((sum, row) => (
    sum + row.currentSupplyValue), 0);
  const finalRound = round === mission.gameLengthRounds;
  const supplyPool = finalRound ? null
    : mission.startingSupply + (mission.extraSupplyPerRound * (round - 1));
  if (!finalRound && totalCurrentSupplyBefore > supplyPool) fail("SUMMON_SUPPLY_STATE_OVER_CAP");
  const availableSupplyBefore = finalRound ? null : supplyPool - totalCurrentSupplyBefore;
  const totalCurrentSupplyAfter = totalCurrentSupplyBefore + summonedSupply.currentSupplyValue;
  const summonAllowed = finalRound || totalCurrentSupplyAfter <= supplyPool;
  return result({ schema: "starcraft_tmg_official_summon_supply_resolution_v1",
    round, sideKey, summonedPieceId: summoned.id,
    summonedRecordKey: summoned.officialUnitRecordKey,
    summonedCurrentModels: summoned.currentModels,
    summonedCurrentSupplyValue: summonedSupply.currentSupplyValue,
    summonedCurrentSupplyResolutionHash: summonedSupply.resultHash,
    supplyMode: finalRound ? "unlimited" : "finite", supplyPool,
    totalCurrentSupplyBefore, totalCurrentSupplyAfter, availableSupplyBefore,
    summonAllowed, sufficientAvailableSupply: summonAllowed,
    fieldedUnitRows: fieldedRows,
    fieldedUnitRowsHash: hashStarcraftTmgContract(fieldedRows),
    onlyBattlefieldCurrentSupplyCounts: true, summonedSupplyCountsAfterDeployment: true,
    clientSuppliedSupplyAccepted: false, trainingTruth: false });
}

export function resolveOfficialSummonPlacementV1(input = {}) {
  const bundle = bundleFor(input); const state = input.state;
  const sideKey = nonEmpty(input.sideKey, "SUMMON_SIDE_REQUIRED");
  const parent = pieceFor(state, input.parentPieceId, "SUMMON_PARENT_REQUIRED");
  const summoned = pieceFor(state, input.summonedPieceId);
  const plan = input.placementPlan;
  getOfficialSummonedUnitProfileV1(bundle, summoned.officialUnitRecordKey);
  if (!object(plan) || input.rulesOwnedPlacementRequested !== true
    || input.clientSuppliedPlacementResult !== undefined
    || parent.sideKey !== sideKey || summoned.sideKey !== sideKey || !active(parent)
    || summoned.isOnField === true || summoned.isInReserves === true || !live(summoned)
    || !Array.isArray(summoned.models)
    || summoned.models.filter((model) => model.isDestroyed !== true).length
      !== Number(summoned.currentModels)) fail("SUMMON_PLACEMENT_REQUEST_INVALID");
  const projected = structuredClone(summoned);
  projected.isOnField = true; projected.isInReserves = false;
  projected.models = projected.models.map((model) => ({ ...model,
    isOnField: model.isDestroyed !== true }));
  const projectedState = structuredClone(state);
  projectedState.pieces = projectedState.pieces
    .filter((piece) => piece.id !== projected.id).concat(projected);
  const placement = evaluateOfficialCoherencyPlacementV1({ state: projectedState,
    actor: projected, plan, dataBundle: bundle.modelBaseGeometryDataBundle });
  if (placement.casualtyModelIds.length !== 0 || placement.inCoherency !== true) {
    fail("SUMMON_ALL_MODELS_MUST_BE_PLACED_IN_COHERENCY");
  }
  for (const row of placement.placements) {
    const model = projected.models.find((entry) => entry.id === row.modelId);
    model.xInches = row.footprint.center.xMilliInches / 1000;
    model.yInches = row.footprint.center.yMilliInches / 1000;
    model.baseRotationDegrees = row.footprint.rotationDegrees;
  }
  const tempState = { ...projectedState,
    pieces: projectedState.pieces.map((piece) => piece.id === projected.id ? projected : piece) };
  const contact = evaluateOfficialBaseMeasurementV1({ state: tempState,
    source: { kind: "model", unitId: parent.id,
      modelId: nonEmpty(input.parentContactModelId, "SUMMON_PARENT_CONTACT_MODEL_REQUIRED") },
    target: { kind: "model", unitId: projected.id, modelId: placement.leadingModelId },
    dataBundle: bundle.modelBaseGeometryDataBundle });
  if (contact.baseToBaseContact !== true) fail("SUMMON_LEADING_MODEL_PARENT_B2B_REQUIRED");
  const color = state.officialMissionSetupBinding?.seatColorAssignment?.[sideKey];
  if (!['red', 'blue'].includes(color)) fail("SUMMON_DEPLOYMENT_COLOR_REQUIRED", sideKey);
  const opponentColor = color === "red" ? "blue" : "red";
  const boardHeight = Math.round(Number(state.board?.heightInches) * 1000);
  const depth = bundle.ruleConstants.zoneOfInfluenceDepthMilliInches;
  if (!Number.isSafeInteger(boardHeight) || boardHeight <= depth) fail("SUMMON_BOARD_INVALID");
  for (const row of placement.placements) {
    const bounds = footprintBounds(row.footprint);
    const violation = opponentColor === "red" ? bounds.minY <= depth : bounds.maxY >= boardHeight - depth;
    if (violation) fail("SUMMON_OPPONENT_ZONE_OF_INFLUENCE", row.modelId);
  }
  const finalModelPositions = placement.placements.map((row) => ({
    modelId: row.modelId, xMilliInches: row.footprint.center.xMilliInches,
    yMilliInches: row.footprint.center.yMilliInches,
    rotationDegrees: row.footprint.rotationDegrees,
    footprintHash: row.footprint.footprintHash,
  }));
  return result({ schema: "starcraft_tmg_official_summon_placement_resolution_v1",
    sideKey, parentPieceId: parent.id, summonedPieceId: summoned.id,
    leadingModelId: placement.leadingModelId,
    parentContactModelId: input.parentContactModelId,
    finalModelPositions, placementResultHash: placement.resultHash,
    parentContactMeasurementHash: contact.resultHash,
    leadingModelBaseToBaseWithParent: true, remainingModelsInCoherency: true,
    enemyEngagementRangeExcluded: true, opponentColor,
    opponentZoneOfInfluenceExcluded: true,
    allCurrentRoundAndRectangularBaseGeometryChecked: true,
    clientSuppliedPlacementResultAccepted: false, trainingTruth: false });
}

export function resolveOfficialSummonDeploymentV1(input = {}) {
  const bundle = bundleFor(input); const state = input.state;
  const sideKey = nonEmpty(input.sideKey, "SUMMON_SIDE_REQUIRED");
  const parent = pieceFor(state, input.parentPieceId, "SUMMON_PARENT_REQUIRED");
  const summoned = pieceFor(state, input.summonedPieceId);
  const definition = bundle.summonKeywordDefinition;
  if (summoned.officialUnitRecordKey !== "army_units:roachling"
    || parent.officialUnitRecordKey !== definition.recordKey) {
    fail("SUMMON_KEYWORD_CURRENT_CARRIER_MISMATCH");
  }
  const trigger = eventForHash(state, input.triggerEventHash,
    "SUMMON_SPECIAL_ABILITY_TRIGGER_REQUIRED");
  if (trigger.type !== "special_ability_resolved" || trigger.sideKey !== sideKey
    || trigger.pieceId !== parent.id || trigger.abilityName !== definition.definitionName
    || trigger.abilityDefinitionHash !== definition.definitionHash
    || trigger.summonedUnitRecordKey !== summoned.officialUnitRecordKey) {
    fail("SUMMON_SPECIAL_ABILITY_TRIGGER_INVALID");
  }
  const supply = resolveOfficialSummonSupplyV1({ state, summonDataBundle: bundle,
    sideKey, summonedPieceId: summoned.id, rulesOwnedSupplyRequested: true });
  if (!supply.summonAllowed) fail("SUMMON_INSUFFICIENT_AVAILABLE_SUPPLY");
  const placement = resolveOfficialSummonPlacementV1({ state, summonDataBundle: bundle,
    sideKey, parentPieceId: parent.id, summonedPieceId: summoned.id,
    parentContactModelId: input.parentContactModelId,
    placementPlan: input.placementPlan, rulesOwnedPlacementRequested: true });
  const modelPositions = new Map(placement.finalModelPositions.map((entry) => [entry.modelId, entry]));
  const models = summoned.models.map((model) => {
    const position = modelPositions.get(model.id);
    if (!position) fail("SUMMON_PLACEMENT_MODEL_INVALID", model.id);
    return { ...model, xInches: position.xMilliInches / 1000,
      yInches: position.yMilliInches / 1000,
      baseRotationDegrees: position.rotationDegrees, isOnField: true };
  });
  const set = { isOnField: true, isInReserves: false, isSummoned: true,
    summonParentPieceId: parent.id, summonTriggerEventHash: input.triggerEventHash,
    summonedInRound: Number(state.round), summonedInPhase: state.phase,
    currentSupply: supply.summonedCurrentSupplyValue,
    activatedPhases: phaseMarker(summoned, state.phase),
    summonActivationLock: { round: Number(state.round), phase: state.phase }, models };
  return result({ schema: "starcraft_tmg_official_summon_deployment_resolution_v1",
    sideKey, parentPieceId: parent.id, summonedPieceId: summoned.id,
    triggerEventHash: input.triggerEventHash,
    summonDefinitionHash: definition.definitionHash,
    supplyResolutionHash: supply.resultHash, placementResolutionHash: placement.resultHash,
    activationMarkerSetForSummoningPhase: true,
    mutation: { piecePatches: [{ pieceId: summoned.id,
      expectedBeforePieceHash: hashStarcraftTmgContract(summoned), set }] },
    specialAbilityOnlyDeployment: true, regularDeploymentRulesUsed: false,
    stateMutationDerivedOnlyByRulesKernel: true, trainingTruth: false });
}

export function resolveOfficialSummonActivationV1(input = {}) {
  const bundle = bundleFor(input); const state = input.state;
  const summoned = pieceFor(state, input.summonedPieceId);
  getOfficialSummonedUnitProfileV1(bundle, summoned.officialUnitRecordKey);
  if (!active(summoned) || summoned.isSummoned !== true
    || !PHASES.has(String(state.phase || ""))
    || input.rulesOwnedActivationRequested !== true
    || input.clientSuppliedActivationEligibility !== undefined) {
    fail("SUMMON_ACTIVATION_REQUEST_INVALID");
  }
  const sameSummoningPhase = Number(summoned.summonedInRound) === Number(state.round)
    && summoned.summonedInPhase === state.phase;
  const parent = state.pieces?.find((entry) => entry.id === summoned.summonParentPieceId);
  const parentPresent = active(parent);
  let parentActivationEventHash = null;
  let sequence = sameSummoningPhase ? "summoning_phase_locked"
    : parentPresent ? "immediately_after_parent_before_opponent" : "normal_activation";
  if (!sameSummoningPhase && parentPresent) {
    const event = eventForHash(state, input.parentActivationEventHash,
      "SUMMON_PARENT_ACTIVATION_END_EVENT_REQUIRED");
    if (event.type !== "unit_activation_ended" || event.pieceId !== parent.id
      || event.sideKey !== summoned.sideKey || Number(event.round) !== Number(state.round)
      || event.phase !== state.phase || event.opponentActivationStarted === true) {
      fail("SUMMON_PARENT_ACTIVATION_END_EVENT_INVALID");
    }
    parentActivationEventHash = input.parentActivationEventHash;
  }
  return result({ schema: "starcraft_tmg_official_summon_activation_resolution_v1",
    round: Number(state.round), phase: state.phase, summonedPieceId: summoned.id,
    parentPieceId: summoned.summonParentPieceId, parentPresent,
    sameSummoningPhase, activationEligible: !sameSummoningPhase,
    activationSequence: sequence, parentActivationEventHash,
    activationMarkerFromSummoningPhaseEnforced: sameSummoningPhase,
    mustPrecedeOpponentNextActivation: !sameSummoningPhase && parentPresent,
    parentAbsentAllowsNormalActivation: !sameSummoningPhase && !parentPresent,
    clientSuppliedActivationEligibilityAccepted: false, trainingTruth: false });
}

export function resolveOfficialSummonedUnitRelationshipsV1(input = {}) {
  const bundle = bundleFor(input); const state = input.state;
  const piece = pieceFor(state, input.summonedPieceId);
  getOfficialSummonedUnitProfileV1(bundle, piece.officialUnitRecordKey);
  if (piece.isSummoned !== true || !live(piece)
    || input.rulesOwnedRelationshipsRequested !== true
    || input.clientSuppliedScoreOrReserveStatus !== undefined) {
    fail("SUMMONED_UNIT_RELATIONSHIP_REQUEST_INVALID");
  }
  const supply = exactCurrentSupply(bundle, piece);
  return result({ schema: "starcraft_tmg_official_summoned_unit_relationships_v1",
    summonedPieceId: piece.id, recordKey: piece.officialUnitRecordKey,
    friendlySideKey: piece.sideKey, treatedAsFriendlyForAllRules: piece.isOnField === true,
    isInReserves: false, mayBeSelectedAsReserveUnit: false,
    includedInFinalScore: false, excludedFromFinalScore: true,
    currentSupplyValue: supply.currentSupplyValue,
    countsTowardTotalCurrentSupply: piece.isOnField === true,
    currentSupplyResolutionHash: supply.resultHash,
    clientSuppliedRelationshipsAccepted: false, trainingTruth: false });
}

export function certifyOfficialSummonPlanV1(input = {}) {
  const bundle = input.summonDataBundle; const plan = input.plan;
  const procedureKind = String(input.procedureKind || "");
  verifyOfficialSummonDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("SUMMON_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "SUMMON_PLAN_INVALID");
  const shared = { ...plan.input, summonDataBundle: bundle };
  let resolution;
  if (procedureKind === "summoned_unit_classification") {
    resolution = resolveOfficialSummonedUnitClassificationV1(shared);
  } else if (procedureKind === "summon_supply") {
    resolution = resolveOfficialSummonSupplyV1(shared);
  } else if (procedureKind === "summon_placement") {
    resolution = resolveOfficialSummonPlacementV1(shared);
  } else if (procedureKind === "summon_deployment") {
    resolution = resolveOfficialSummonDeploymentV1(shared);
  } else if (procedureKind === "summon_activation") {
    resolution = resolveOfficialSummonActivationV1(shared);
  } else resolution = resolveOfficialSummonedUnitRelationshipsV1(shared);
  const body = { schema: "starcraft_tmg_official_summon_plan_certificate_v1",
    planId, procedureKind, sideKey: String(plan.sideKey || ""),
    summonDataBundleHash: bundle.bundleHash, result: resolution,
    rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialSummonPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialSummonPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) fail("SUMMON_PLAN_CERTIFICATE_DRIFT");
  return true;
}

export function officialSummonProcedureKindsV1() { return [...PROCEDURE_KINDS].sort(); }
