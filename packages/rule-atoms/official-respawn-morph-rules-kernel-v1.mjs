import { projectOfficialDeploymentSupplyV1 } from "./official-deployment-supply-projection-v1.mjs";
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
  if (bundle.currentMorphCarriers.length) fail("MORPH_ACTION_AVAILABILITY_REQUIRES_SOURCE_BOUND_RUNTIME");
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
  const carrier = getOfficialRespawnCarrierV1(bundle, piece.officialUnitRecordKey, input.sourceDefinitionId);
  if (input.procedureKind !== "respawn_models" || piece.isDestroyed === true
    || piece.isOnField !== true || Number(piece.currentModels) < 1
    || !Array.isArray(piece.models) || !Array.isArray(piece.destroyedModelIds)
    || input.rulesOwnedRespawnRequested !== true
    || input.clientSuppliedSupplyResult !== undefined
    || input.clientSuppliedMutation !== undefined) fail("RESPAWN_REQUEST_INVALID");
  if (carrier.targetUnitProfile && (piece.sourceRecordHash !== carrier.targetUnitProfile.sourceRecordHash
    || piece.officialPayloadHash !== carrier.targetUnitProfile.payloadHash
    || piece.models.length > carrier.targetUnitProfile.maximumModels)) fail("RESPAWN_UNIT_SOURCE_DRIFT");
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
    || event.effectKeyword !== "RESPAWN"
    || (carrier.definitionId && event.sourceDefinitionId !== carrier.definitionId)) fail("RESPAWN_EFFECT_TRIGGER_INVALID");
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
      baseRotationDegrees: Number(placement.rotationDegrees || 0),
      ...(carrier.targetUnitProfile ? { damage: 0, remainingWounds: carrier.targetUnitProfile.hitPoints } : {}) };
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

// Unit identity and Supply are common facts for LegalSpace, preview and apply.
// Source-card timing and the exact physical placement remain in the family runtime.
export function projectOfficialMorphPrerequisitesV2({ state, respawnMorphDataBundle: bundle, pieceId } = {}) {
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  const carrier = bundle.currentMorphCarriers.find(row => row.definitionId === "card:cocoon/ravager-morph-any@1");
  const actor = pieceFor(state, pieceId);
  const sourceProfile = carrier?.sourceUnitProfiles.find(row => row.recordKey === actor.officialUnitRecordKey);
  if (!carrier || !sourceProfile || !activeModel(actor) || actor.isOnField !== true || actor.currentModels < 1
    || actor.sideKey !== state.activeSideKey || actor.isStructure === true
    || actor.sourceRecordHash !== sourceProfile.sourceRecordHash || actor.officialPayloadHash !== sourceProfile.payloadHash) {
    fail("MORPH_SOURCE_UNIT_INVALID");
  }
  const models = actor.models.filter(activeModel);
  if (models.length !== Number(actor.currentModels)) fail("MORPH_SOURCE_MODEL_COUNT_DRIFT");
  const beforeSupply = exactSupply(bundle, actor, models.length);
  if (beforeSupply.currentSupplyValue !== Number(actor.currentSupply)) fail("MORPH_SOURCE_SUPPLY_DRIFT");
  const requested = resolveOfficialCurrentSupplyValueV1({ unitCardSupplyDataBundle: bundle.unitCardSupplyDataBundle,
    recordKey: carrier.createdUnitProfile.recordKey, currentModels: carrier.createdModels,
    isDestroyed: false, rulesOwnedCurrentModelCountRequested: true });
  const pool = projectOfficialDeploymentSupplyV1(state, actor.sideKey);
  if (pool.mode !== "unlimited" && (!Number.isSafeInteger(pool.available) || pool.available < requested.currentSupplyValue)) {
    fail("MORPH_AVAILABLE_SUPPLY_INSUFFICIENT");
  }
  return result({ schema: "starcraft_tmg_official_morph_prerequisites_v2", pieceId, sideKey: actor.sideKey,
    sourceDefinitionId: carrier.definitionId, sourceModelIds: models.map(row => row.id).sort(),
    createdUnitRecordKey: carrier.createdUnitProfile.recordKey, createdModels: carrier.createdModels,
    sourceSupplyBefore: beforeSupply.currentSupplyValue, requestedSupply: requested.currentSupplyValue,
    poolBefore: pool, sourceRemovalNotPrecredited: true, availabilityScope: "source_identity_and_preplacement_supply",
    trainingTruth: false });
}

export function resolveOfficialMorphUnitV2({ state, respawnMorphDataBundle: bundle, pieceId, sourceModelId, createdPiece } = {}) {
  const prerequisites = projectOfficialMorphPrerequisitesV2({ state, respawnMorphDataBundle: bundle, pieceId });
  const actor = pieceFor(state, pieceId); const carrier = bundle.currentMorphCarriers[0];
  if (!prerequisites.sourceModelIds.includes(sourceModelId)) fail("MORPH_SOURCE_MODEL_INVALID");
  const createdProfile = carrier.createdUnitProfile;
  if (!object(createdPiece) || state.pieces.some(row => row.id === createdPiece.id)
    || createdPiece.officialUnitRecordKey !== createdProfile.recordKey
    || createdPiece.sourceRecordHash !== createdProfile.sourceRecordHash || createdPiece.officialPayloadHash !== createdProfile.payloadHash
    || createdPiece.sideKey !== actor.sideKey || createdPiece.currentModels !== 1 || createdPiece.models?.length !== 1
    || createdPiece.currentSupply !== prerequisites.requestedSupply || createdPiece.sizeCharacteristic !== createdProfile.sizeCharacteristic
    || createdPiece.isOnField !== true || createdPiece.isDestroyed !== false
    || createdPiece.models[0].remainingWounds !== createdProfile.hitPoints
    || createdPiece.officialMorphActivationLock?.round !== Number(state.round)
    || createdPiece.officialMorphActivationLock?.sourceDefinitionId !== carrier.definitionId
    || createdPiece.officialMorphActivationLock?.sourcePieceId !== actor.id) fail("MORPH_CREATED_UNIT_SOURCE_DRIFT");
  const models = structuredClone(actor.models).map(model => model.id === sourceModelId ? {
    ...model, isDestroyed: true, isOnField: false, remainingWounds: 0, removalCause: "morph",
  } : model);
  const remaining = models.filter(activeModel);
  const afterSupply = exactSupply(bundle, actor, remaining.length);
  const sourceProfile = carrier.sourceUnitProfiles.find(row => row.recordKey === actor.officialUnitRecordKey);
  const damageMarker = Math.max(0, ...remaining.map(model => Number(model.damage
    ?? Math.max(0, sourceProfile.hitPoints - Number(model.remainingWounds ?? sourceProfile.hitPoints)))));
  const patch = { models, currentModels: remaining.length, currentSupply: afterSupply.currentSupplyValue,
    isDestroyed: remaining.length === 0, isOnField: remaining.length > 0, isInReserves: false, damageMarker,
    morphedModelIds: [...(actor.morphedModelIds || []), sourceModelId] };
  return result({ schema: "starcraft_tmg_official_morph_unit_resolution_v2", pieceId, sideKey: actor.sideKey,
    sourceDefinitionId: carrier.definitionId, removedModelId: sourceModelId,
    createdPieceId: createdPiece.id, sourceSupplyBefore: prerequisites.sourceSupplyBefore,
    sourceSupplyAfter: afterSupply.currentSupplyValue, createdSupply: prerequisites.requestedSupply,
    poolBefore: prerequisites.poolBefore, sourceUnitFullyRemoved: remaining.length === 0,
    enemyKillCredit: 0, removalCause: "morph", returnedDestroyedModel: false,
    mutation: { sourcePiecePatch: { pieceId, expectedBeforePieceHash: hashStarcraftTmgContract(actor), set: patch },
      createdPiece: structuredClone(createdPiece) }, trainingTruth: false });
}
