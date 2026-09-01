import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialRespawnCarrierV1,
  verifyOfficialRespawnMorphDataBundleV1,
} from "../source-data/official-respawn-morph-data-bundle-v1.mjs";
import { resolveOfficialCurrentSupplyValueV1 } from
  "./official-unit-card-supply-rules-kernel-v1.mjs";
import {
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialCoherencyPlacementV1,
} from "./official-model-base-geometry-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = new Set(["morph_availability", "respawn_models"]);
const HASH = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function result(body) { return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) }); }
function pieceFor(state, pieceId) {
  const piece = state?.pieces?.find((entry) => entry.id === pieceId);
  if (!piece) fail("RESPAWN_MORPH_PIECE_REQUIRED", String(pieceId || ""));
  return piece;
}
function eventForHash(state, eventHash, code) {
  if (!HASH.test(String(eventHash || ""))) fail(code);
  const matches = (state.log || []).flatMap((entry) => entry?.events || [])
    .filter((event) => hashStarcraftTmgContract(event) === eventHash);
  if (matches.length !== 1) fail(code, String(eventHash || ""));
  return matches[0];
}
function exactSupply(bundle, piece, currentModels) {
  const resolved = resolveOfficialCurrentSupplyValueV1({
    unitCardSupplyDataBundle: bundle.unitCardSupplyDataBundle,
    recordKey: piece.officialUnitRecordKey, currentModels,
    isDestroyed: currentModels === 0, rulesOwnedCurrentModelCountRequested: true,
  });
  return resolved;
}
function activeModel(model) { return model?.isDestroyed !== true && model?.isOnField !== false; }
function placedGhost(state, piece, model, placement, stagedPiece, bundle) {
  const ghostId = `respawn-placement:${piece.id}:${model.id}`;
  const ghostModel = { ...model, isDestroyed: false, isOnField: true,
    xInches: Number(placement.xMilliInches) / 1000,
    yInches: Number(placement.yMilliInches) / 1000,
    baseRotationDegrees: Number(placement.rotationDegrees || 0) };
  const ghost = { ...piece, id: ghostId, currentModels: 1, currentSupply: 0,
    isDestroyed: false, isOnField: true, models: [ghostModel] };
  const projected = structuredClone(state);
  projected.pieces = projected.pieces.map((entry) => (
    entry.id === piece.id ? structuredClone(stagedPiece) : entry
  )).concat(ghost);
  const geometry = evaluateOfficialCoherencyPlacementV1({ state: projected,
    actor: ghost, dataBundle: bundle.modelBaseGeometryDataBundle,
    plan: { planId: `respawn-placement-${piece.id}-${model.id}`,
      leadingModelId: model.id, placements: [{ modelId: model.id,
      outcome: "placed", xMilliInches: Number(placement.xMilliInches),
      yMilliInches: Number(placement.yMilliInches),
      rotationDegrees: Number(placement.rotationDegrees || 0) }],
    currentlyEngagedEnemyUnitIds: [] } });
  return { projected, ghost, ghostModel, geometry };
}

export function resolveOfficialMorphAvailabilityV1(input = {}) {
  const bundle = input.respawnMorphDataBundle;
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  if (input.procedureKind !== "morph_availability"
    || input.rulesOwnedAvailabilityRequested !== true
    || input.clientSuppliedCarrier !== undefined) fail("MORPH_AVAILABILITY_REQUEST_INVALID");
  return result({ schema: "starcraft_tmg_official_morph_availability_v1",
    procedureKind: "morph_availability", currentCarrierCount: 0,
    currentCarrierRecordKeys: [], actionAvailable: false,
    coreContractExecutable: true,
    coreContract: { sufficientAvailableSupplyRequired: true,
      newModelBaseToBaseWithActiveUnitRequired: true,
      removeExactlyPrintedXSourceModels: true, newModelFormsNewUnit: true,
      enemySeparationMilliInches: 1000, activationLockedForRemainderOfRound: true },
    reason: "no_current_official_morph_carrier_in_fixed_source_lock",
    mutation: { piecePatches: [] }, clientSuppliedCarrierAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialRespawnModelsV1(input = {}) {
  const bundle = input.respawnMorphDataBundle;
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  const state = input.state; const piece = pieceFor(state, input.pieceId);
  const carrier = getOfficialRespawnCarrierV1(bundle, piece.officialUnitRecordKey);
  if (input.procedureKind !== "respawn_models" || piece.isDestroyed === true
    || piece.isOnField !== true || Number(piece.currentModels) < 1
    || !Array.isArray(piece.models) || !Array.isArray(piece.destroyedModelIds)
    || input.rulesOwnedRespawnRequested !== true
    || input.clientSuppliedSupplyResult !== undefined
    || input.clientSuppliedMutation !== undefined) fail("RESPAWN_REQUEST_INVALID");
  const currentModels = piece.models.filter(activeModel);
  if (currentModels.length !== Number(piece.currentModels)) fail("RESPAWN_MODEL_COUNT_DRIFT");
  const destroyedModels = piece.models.filter((model) => (
    model.isDestroyed === true && model.isOnField === false
      && piece.destroyedModelIds.includes(model.id)
  ));
  const event = eventForHash(state, input.triggerEventHash,
    "RESPAWN_EFFECT_TRIGGER_REQUIRED");
  if (event.type !== "special_ability_resolved" || event.sideKey !== piece.sideKey
    || event.pieceId !== piece.id || event.abilityName !== carrier.definitionName
    || event.abilityDefinitionHash !== carrier.definitionHash
    || event.effectKeyword !== "RESPAWN") fail("RESPAWN_EFFECT_TRIGGER_INVALID");
  const onCreep = (piece.derivedKeywords || []).includes("on_creep");
  const respawnLimit = onCreep ? carrier.onCreepRespawnValue : carrier.baseRespawnValue;
  if (event.baseRespawnValue !== carrier.baseRespawnValue
    || event.onCreepRespawnValue !== carrier.onCreepRespawnValue) {
    fail("RESPAWN_EFFECT_TRIGGER_INVALID");
  }
  const plan = input.placementPlan;
  if (!object(plan) || !Array.isArray(plan.placements)
    || !Array.isArray(plan.returnedModelIds)
    || plan.returnedModelIds.length > respawnLimit
    || plan.placements.length !== plan.returnedModelIds.length
    || new Set(plan.returnedModelIds).size !== plan.returnedModelIds.length
    || new Set(plan.placements.map((entry) => entry.modelId)).size !== plan.placements.length
    || plan.returnedModelIds.some((id) => !destroyedModels.some((model) => model.id === id))
    || plan.placements.some((entry) => !plan.returnedModelIds.includes(entry.modelId)
      || !Number.isSafeInteger(Number(entry.xMilliInches))
      || !Number.isSafeInteger(Number(entry.yMilliInches)))) {
    fail("RESPAWN_PLACEMENT_PLAN_INVALID");
  }
  const beforeSupply = exactSupply(bundle, piece, currentModels.length);
  if (Number(piece.currentSupply) !== beforeSupply.currentSupplyValue) {
    fail("RESPAWN_CURRENT_SUPPLY_STATE_DRIFT");
  }
  const afterSupply = exactSupply(bundle, piece,
    currentModels.length + plan.returnedModelIds.length);
  if (afterSupply.currentSupplyValue > beforeSupply.currentSupplyValue) {
    fail("RESPAWN_SUPPLY_BRACKET_INCREASE");
  }
  const originalExistingIds = new Set(currentModels.map((model) => model.id));
  let stagedPiece = structuredClone(piece);
  const placementRows = [];
  for (const modelId of plan.returnedModelIds) {
    const model = destroyedModels.find((entry) => entry.id === modelId);
    const placement = plan.placements.find((entry) => entry.modelId === modelId);
    let ghost;
    try {
      ghost = placedGhost(state, piece, model, placement, stagedPiece, bundle);
    } catch (error) {
      fail("RESPAWN_MODEL_CANNOT_BE_SET_LEGALLY",
        `${modelId}:${String(error?.message || error).split(":")[0]}`);
    }
    const contactModelId = String(placement.contactModelId || "");
    if (!originalExistingIds.has(contactModelId)) {
      fail("RESPAWN_EXISTING_MODEL_CONTACT_REQUIRED", modelId);
    }
    const contact = evaluateOfficialBaseMeasurementV1({ state: ghost.projected,
      source: { kind: "model", unitId: ghost.ghost.id, modelId },
      target: { kind: "model", unitId: piece.id, modelId: contactModelId },
      dataBundle: bundle.modelBaseGeometryDataBundle });
    if (contact.baseToBaseContact !== true) {
      fail("RESPAWN_EXISTING_MODEL_CONTACT_REQUIRED", modelId);
    }
    const setModel = { ...model, isDestroyed: false, isOnField: true,
      xInches: Number(placement.xMilliInches) / 1000,
      yInches: Number(placement.yMilliInches) / 1000,
      baseRotationDegrees: Number(placement.rotationDegrees || 0) };
    stagedPiece.models = stagedPiece.models.map((entry) => (
      entry.id === modelId ? setModel : entry
    ));
    stagedPiece.currentModels += 1;
    stagedPiece.destroyedModelIds = stagedPiece.destroyedModelIds.filter((id) => id !== modelId);
    placementRows.push({ modelId, contactModelId,
      xMilliInches: Number(placement.xMilliInches),
      yMilliInches: Number(placement.yMilliInches),
      rotationDegrees: Number(placement.rotationDegrees || 0),
      geometryResultHash: ghost.geometry.resultHash,
      contactMeasurementHash: contact.resultHash });
  }
  stagedPiece.currentSupply = beforeSupply.currentSupplyValue;
  return result({ schema: "starcraft_tmg_official_respawn_models_resolution_v1",
    procedureKind: "respawn_models", pieceId: piece.id, sideKey: piece.sideKey,
    triggerEventHash: input.triggerEventHash, abilityDefinitionHash: carrier.definitionHash,
    onCreep, respawnLimit, destroyedModelDenominator: destroyedModels.map((model) => model.id).sort(),
    requestedReturnCount: plan.returnedModelIds.length,
    returnedModelIds: [...plan.returnedModelIds], placementRows,
    currentModelsBefore: currentModels.length, currentModelsAfter: stagedPiece.currentModels,
    currentSupplyBefore: beforeSupply.currentSupplyValue,
    currentSupplyAfter: afterSupply.currentSupplyValue,
    supplyBracketUnchanged: afterSupply.currentSupplyValue <= beforeSupply.currentSupplyValue,
    returnedModelsBaseToBaseWithExistingModel: true,
    returnedModelsOutsideEnemyEngagementRange: true,
    illegallyPlaceableModelsCannotBeReturned: true,
    fullyDestroyedUnitReturnAllowed: false,
    mutation: { piecePatches: [{ pieceId: piece.id,
      expectedBeforePieceHash: hashStarcraftTmgContract(piece),
      set: { models: stagedPiece.models, currentModels: stagedPiece.currentModels,
        currentSupply: stagedPiece.currentSupply,
        destroyedModelIds: stagedPiece.destroyedModelIds } }] },
    clientSuppliedMutationAccepted: false, trainingTruth: false });
}

export function certifyOfficialRespawnMorphPlanV1(input = {}) {
  const bundle = input.respawnMorphDataBundle; const plan = input.plan;
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  const procedureKind = String(input.procedureKind || "");
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("RESPAWN_MORPH_PLAN_INVALID");
  const planId = String(plan.planId || "").trim();
  if (!planId) fail("RESPAWN_MORPH_PLAN_INVALID");
  const shared = { ...plan.input, respawnMorphDataBundle: bundle };
  const resolution = procedureKind === "respawn_models"
    ? resolveOfficialRespawnModelsV1(shared)
    : resolveOfficialMorphAvailabilityV1(shared);
  const body = { schema: "starcraft_tmg_official_respawn_morph_plan_certificate_v1",
    planId, procedureKind, inputHash: hashStarcraftTmgContract(plan.input),
    result: resolution, rulesOwnedInputsComplete: true,
    clientSuppliedResultAccepted: false, trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function officialRespawnMorphProcedureKindsV1() { return [...PROCEDURE_KINDS]; }
