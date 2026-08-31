import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { certifyOfficialGapPlaceGeometryPlanV1 } from
  "./official-gap-place-geometry-kernel-v1.mjs";

export const OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID =
  "authority.gap-place-geometry-v1";
export const OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_GAP_PLACE_GEOMETRY_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE =
  "resolve_gap_place_geometry_procedure";
export const OFFICIAL_GAP_PLACE_GEOMETRY_PARAMETER_KIND =
  "official_gap_place_geometry_choice_v1";
export const OFFICIAL_GAP_PLACE_GEOMETRY_PENDING_SCHEMA =
  "starcraft_tmg_official_gap_place_geometry_pending_v1";

export const OFFICIAL_GAP_PLACE_GEOMETRY_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:place-legal-enemy-separated-endpoint",
  "rule-atom:singleton:core-11-place-assault-engagement-exception:b2f75577cf88",
  "rule-atom:singleton:core-11-place-leading-model-nomination:bbddcaa11c80",
  "rule-atom:singleton:core-11-place-leading-model-range:9ad753ad3c88",
  "rule-atom:singleton:core-11-place-nonmovement-geometry:eec5afaa1eb1",
  "rule-atom:singleton:core-11-place-unit-coherency:35fc148020b7",
  "rule-atom:singleton:core-4-6-clearance-versus-placement:26e711f2f791",
  "rule-atom:singleton:core-4-6-flying-gap-bypass:85f83601b2b2",
  "rule-atom:singleton:core-4-6-flying-legal-endpoint:f55f2771aa7d",
  "rule-atom:singleton:core-4-6-gap-clearance-movement-scope:3070f79e3f23",
  "rule-atom:singleton:core-4-6-gap-definition:3ce7a04079f3",
  "rule-atom:singleton:core-4-6-large-size-clearance:7166b3666467",
  "rule-atom:singleton:core-4-6-passable-opening-agreement:ca0bba7d26a9",
  "rule-atom:singleton:core-4-6-small-size-clearance:0a3945d21665",
  "rule-atom:singleton:core-4-6-terrain-opening-gap:187a6763eb07",
].sort());
export const OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_ATOM_IDS =
  OFFICIAL_GAP_PLACE_GEOMETRY_NEW_ATOM_IDS;
export const OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ATOM_IDS =
  OFFICIAL_GAP_PLACE_GEOMETRY_NEW_ATOM_IDS;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function verifySourceLock(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle?.repositoryFallbackAllowed !== false || bundle?.trainingTruth !== false) {
    fail("GAP_PLACE_SOURCE_LOCK_BINDING_INVALID");
  }
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    pieces: (state.pieces || []).map((piece) => without(piece, [
      "usedActiveAbilities", "usedReactions", "selectedUpgrades", "abilities",
    ])),
    board: without(state.board || {}, ["centerMarkers"]),
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialGapPlaceGeometryPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  verifySourceLock(state);
  const procedureKind = String(procedure.procedureKind || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !["gap_traversal", "place"].includes(procedureKind)
    || procedure.candidatePlansComplete !== true
    || procedure.geometryDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("GAP_PLACE_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  if (!activePiece(actor)
    || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)) {
    fail("GAP_PLACE_ACTOR_INVALID");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialGapPlaceGeometryPlanV1({ state, actor, plan, procedureKind,
      movementType: procedure.movementType,
      maxDistanceMilliInches: procedure.maxDistanceMilliInches })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("GAP_PLACE_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_GAP_PLACE_GEOMETRY_PENDING_SCHEMA,
    stage: "choose_certified_gap_or_place_geometry",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `gap-place-${entry.planHash}` }))
      .sort((a, b) => a.choiceId.localeCompare(b.choiceId)),
    geometryCertificate: { candidatePlansComplete: true,
      geometryDenominatorComplete: true,
      geometryAuthority: "rules_owned_gap_place_geometry_kernel_v1",
      productionQuarantined: true },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    stateProjectionHash: "", productionQuarantined: true, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}
function verifyPending(state) {
  verifySourceLock(state);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_GAP_PLACE_GEOMETRY_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.geometryCertificate?.candidatePlansComplete !== true
    || pending.geometryCertificate?.geometryDenominatorComplete !== true
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("GAP_PLACE_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_GAP_PLACE_GEOMETRY_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE,
    pieceId: pending.actorUnitId,
    executorId: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
    executorVersion: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      productionQuarantined: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_gap_clearance_and_place_geometry_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
export function enumerateOfficialGapPlaceGeometryV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_GAP_PLACE_GEOMETRY_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE,
      executorId: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
      executorVersion: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}
export function instantiateOfficialGapPlaceGeometryV1(
  state, domain, parameters, options = {},
) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("GAP_PLACE_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("GAP_PLACE_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  const leading = choice.placements.find((entry) => entry.modelId === choice.leadingModelId);
  return { action: {
    actionType: OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: expected.pieceId,
    to: { xInches: inches(leading.xMilliInches), yInches: inches(leading.yMilliInches) },
    geometryPlan: { schema: "starcraft_tmg_official_gap_place_geometry_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_ATOM_IDS],
    executorId: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
    executorVersion: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
export function applyOfficialGapPlaceGeometryV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_GAP_PLACE_GEOMETRY_ACTION_ATOM_IDS])) fail("GAP_PLACE_ACTION_INVALID");
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.geometryPlan?.choiceId;
  const expected = instantiateOfficialGapPlaceGeometryV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("GAP_PLACE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const actor = state.pieces.find((piece) => piece.id === pending.actorUnitId);
  for (const placement of choice.placements) {
    const model = actor.models.find((entry) => entry.id === placement.modelId);
    model.xInches = inches(placement.xMilliInches);
    model.yInches = inches(placement.yMilliInches);
  }
  const result = { schema: "starcraft_tmg_official_gap_place_geometry_resolution_v1",
    actorUnitId: actor.id, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash,
    leadingModelId: choice.leadingModelId, movementType: choice.movementType,
    sizeCharacteristic: choice.sizeCharacteristic, flying: choice.flying,
    placements: clone(choice.placements), gaps: clone(choice.gaps),
    placeSemantics: clone(choice.placeSemantics),
    productionQuarantined: true, trainingTruth: false };
  state.lastGapPlaceGeometryResolution = result;
  const event = { type: "gap_place_geometry_resolved", sideKey: actor.sideKey,
    actorUnitId: actor.id, result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "gap_place_geometry_resolution", round: Number(state.round),
    phase: state.phase, sideKey: actor.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_gap_place_geometry_transition_v1",
    executorId: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_ID,
    executorVersion: OFFICIAL_GAP_PLACE_GEOMETRY_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_gap_clearance_and_place_geometry_resolved",
    trainingTruth: false };
}
