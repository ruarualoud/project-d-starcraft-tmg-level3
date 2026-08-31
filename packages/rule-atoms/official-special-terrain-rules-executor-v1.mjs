import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import { certifyOfficialSpecialTerrainPlanV1 } from
  "./official-special-terrain-rules-kernel-v1.mjs";

export const OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID =
  "authority.special-terrain-rules-v1";
export const OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_SPECIAL_TERRAIN_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE =
  "resolve_special_terrain_rules_procedure";
export const OFFICIAL_SPECIAL_TERRAIN_RULES_PARAMETER_KIND =
  "official_special_terrain_rules_choice_v1";
export const OFFICIAL_SPECIAL_TERRAIN_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_special_terrain_rules_pending_v1";

export const OFFICIAL_SPECIAL_TERRAIN_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-access-point-elevation-change:a5c3fcad63e9",
  "rule-atom:singleton:core-11-grass-destruction-lifecycle:5bca22db079a",
  "rule-atom:singleton:core-11-grass-movement-and-los:f0d23547e829",
  "rule-atom:singleton:core-11-grass-size:16a487ad2ae3",
  "rule-atom:singleton:core-11-impassable-terrain-definition:a200351f5530",
  "rule-atom:singleton:core-11-impassable-terrain-movement-prohibition:9c9e563fcdff",
  "rule-atom:singleton:core-11-leading-model-gap-clearance:16a27136f699",
  "rule-atom:singleton:core-11-size-zero-one-terrain-pass:9899398e5428",
  "rule-atom:singleton:core-8-5-3-access-point-definition:3eebc06b9e1f",
  "rule-atom:singleton:core-8-5-3-elevation-access-point:a3733adda9c6",
  "rule-atom:singleton:core-8-5-3-gap-clearance-reference:dcfe3acc7ac7",
  "rule-atom:singleton:core-8-5-3-grass-interaction:e5fba9a82cf0",
  "rule-atom:singleton:core-8-5-3-ramp-movement:058a7cee7079",
].sort());
export const OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_ATOM_IDS =
  OFFICIAL_SPECIAL_TERRAIN_RULES_NEW_ATOM_IDS;
export const OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_SPECIAL_TERRAIN_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = Object.freeze([
  "special_terrain_movement_check", "grass_line_of_sight_check",
]);

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
function verifySourceAndData(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const terrainData = state?.officialTerrainLosDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("SPECIAL_TERRAIN_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialTerrainLosDataBundleV1(terrainData);
  if (matchBinding) {
    const contentHash = matchBinding.dependencies?.geometryArtifact?.contentHash;
    if (contentHash !== hashStarcraftTmgContract(terrainData)
      || (matchBinding.geometryArtifactHash !== undefined
        && matchBinding.geometryArtifactHash !== contentHash)) {
      fail("SPECIAL_TERRAIN_GEOMETRY_ARTIFACT_BINDING_INVALID");
    }
  }
  return terrainData;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    pieces: (state.pieces || []).map((piece) => without(piece, [
      "usedActiveAbilities", "usedReactions", "selectedUpgrades", "abilities",
    ])),
    board: without(state.board || {}, ["centerMarkers"]),
    officialTerrainLosDataBundle: state.officialTerrainLosDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialSpecialTerrainRulesPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  const dataBundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.includes(procedureKind)
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("SPECIAL_TERRAIN_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  if (!activePiece(actor)
    || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)) {
    fail("SPECIAL_TERRAIN_ACTOR_INVALID");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialSpecialTerrainPlanV1({ state, actor, plan, procedureKind, dataBundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("SPECIAL_TERRAIN_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_SPECIAL_TERRAIN_RULES_PENDING_SCHEMA,
    stage: "choose_certified_special_terrain_rules_plan",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `special-terrain-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      geometryAuthority: "official_special_terrain_rules_kernel_v1",
      gapAdapter: "official_gap_place_geometry_kernel_v1",
      flyingAdapter: "official_flying_rules_kernel_v1",
      terrainLosAdapter: "official_terrain_los_rules_kernel_v1",
      productionQuarantinedUntilSlice87ArbitraryGeometry: true },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    terrainDataBundleHash: dataBundle.bundleHash,
    stateProjectionHash: "",
    productionQuarantinedUntilSlice87ArbitraryGeometry: true,
    trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}
function verifyPending(state, matchBinding = null) {
  verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_SPECIAL_TERRAIN_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.productionQuarantinedUntilSlice87ArbitraryGeometry !== true
    || pending.trainingTruth !== false) {
    fail("SPECIAL_TERRAIN_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_SPECIAL_TERRAIN_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE,
    pieceId: pending.actorUnitId,
    executorId: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      productionQuarantinedUntilSlice87ArbitraryGeometry: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_special_terrain_and_access_point_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialSpecialTerrainRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_SPECIAL_TERRAIN_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE,
      executorId: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialSpecialTerrainRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("SPECIAL_TERRAIN_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("SPECIAL_TERRAIN_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  const leading = choice.procedureKind === "special_terrain_movement_check"
    ? choice.result.placements.find((entry) => (
      entry.modelId === choice.result.leadingModelId
    )) : null;
  return { action: {
    actionType: OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: expected.pieceId,
    ...(leading ? { to: { xInches: inches(leading.xMilliInches),
      yInches: inches(leading.yMilliInches) } } : {}),
    specialTerrainRulesPlan: {
      schema: "starcraft_tmg_official_special_terrain_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      grassRemovedTerrainIds: choice.result.grassRemovedTerrainIds || [],
      visible: choice.result.visible ?? null,
      productionQuarantinedUntilSlice87ArbitraryGeometry: true,
      trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialSpecialTerrainRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_SPECIAL_TERRAIN_RULES_ACTION_ATOM_IDS])) {
    fail("SPECIAL_TERRAIN_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.specialTerrainRulesPlan?.choiceId;
  const expected = instantiateOfficialSpecialTerrainRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("SPECIAL_TERRAIN_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const actor = state.pieces.find((piece) => piece.id === pending.actorUnitId);
  if (choice.procedureKind === "special_terrain_movement_check") {
    for (const placement of choice.result.placements) {
      const model = actor.models.find((entry) => entry.id === placement.modelId);
      model.xInches = inches(placement.xMilliInches);
      model.yInches = inches(placement.yMilliInches);
      model.elevation = placement.elevation;
      model.supportTerrainIds = [...placement.supportTerrainIds];
    }
    for (const terrainId of choice.result.grassRemovedTerrainIds) {
      const terrain = state.board.terrain.find((entry) => entry.id === terrainId);
      terrain.isRemoved = true;
      terrain.removedBy = { rule: "official_grass_movement_or_endpoint",
        actorUnitId: actor.id, round: Number(state.round), phase: state.phase };
    }
  }
  const result = {
    schema: "starcraft_tmg_official_special_terrain_rules_resolution_v1",
    actorUnitId: actor.id, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash,
    result: clone(choice.result),
    productionQuarantinedUntilSlice87ArbitraryGeometry: true,
    trainingTruth: false,
  };
  state.lastSpecialTerrainRulesResolution = result;
  const event = { type: "special_terrain_rules_resolved", sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind: choice.procedureKind,
    result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "special_terrain_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_special_terrain_rules_transition_v1",
    executorId: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIAL_TERRAIN_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_special_terrain_and_access_point_resolved",
    trainingTruth: false };
}
