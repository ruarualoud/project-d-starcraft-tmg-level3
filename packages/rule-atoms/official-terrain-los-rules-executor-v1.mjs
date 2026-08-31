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
import { certifyOfficialTerrainLosPlanV1 } from
  "./official-terrain-los-rules-kernel-v1.mjs";

export const OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID = "authority.terrain-los-rules-v1";
export const OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_TERRAIN_LOS_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE =
  "resolve_terrain_los_rules_procedure";
export const OFFICIAL_TERRAIN_LOS_RULES_PARAMETER_KIND =
  "official_terrain_los_rules_choice_v1";
export const OFFICIAL_TERRAIN_LOS_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_terrain_los_rules_pending_v1";

export const OFFICIAL_TERRAIN_LOS_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:elevation-dead-zone-core",
  "rule-atom:elevation-dead-zone-with-close-quarters-exception",
  "rule-atom:independent-terrain-cover-assessment",
  "rule-atom:line-of-sight-direct-cover",
  "rule-atom:singleton:core-11-blocking-terrain-movement-independent:4debb5e68095",
  "rule-atom:singleton:core-11-line-of-sight-close-quarters-exception:41560f4a3af3",
  "rule-atom:singleton:core-11-line-of-sight-terrain-apertures:2d08a975e771",
  "rule-atom:singleton:core-11-visible-cover-assessment:8c7fafdf2d74",
  "rule-atom:singleton:core-7-1-1-close-quarters:5ec4b9923083",
  "rule-atom:singleton:core-7-1-1-cover-overview:f89d25036b5a",
  "rule-atom:singleton:core-7-1-1-full-cover:3fa6dfe2c6d0",
  "rule-atom:singleton:core-7-1-2-top-down-terrain-surface:9c9046cbee8b",
  "rule-atom:singleton:core-7-1-blocking-terrain-cover-check:9edeb5b5d575",
  "rule-atom:singleton:core-7-1-movement-opening-distinction:16876f6a574c",
  "rule-atom:singleton:core-7-1-setup-footprint-agreement:c96ce7921f4c",
  "rule-atom:singleton:core-8-5-3-large-terrain-blocking:f39dc3595690",
  "rule-atom:singleton:core-8-5-3-leading-model-terrain-size:802d5efefde7",
  "rule-atom:singleton:core-8-5-3-small-terrain-interaction:dfe95e5f4a53",
  "rule-atom:terrain-footprint-and-openings",
].sort());
export const OFFICIAL_TERRAIN_LOS_RULES_ACTION_ATOM_IDS =
  OFFICIAL_TERRAIN_LOS_RULES_NEW_ATOM_IDS;
export const OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_TERRAIN_LOS_RULES_NEW_ATOM_IDS;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
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
    fail("TERRAIN_LOS_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialTerrainLosDataBundleV1(terrainData);
  if (matchBinding) {
    const contentHash = matchBinding.dependencies?.geometryArtifact?.contentHash;
    if (contentHash !== hashStarcraftTmgContract(terrainData)
      || (matchBinding.geometryArtifactHash !== undefined
        && matchBinding.geometryArtifactHash !== contentHash)) {
      fail("TERRAIN_LOS_GEOMETRY_ARTIFACT_BINDING_INVALID");
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

export function openOfficialTerrainLosRulesPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  const dataBundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !["leading_model_terrain_check", "line_of_sight_check"].includes(procedureKind)
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("TERRAIN_LOS_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  if (!activePiece(actor)
    || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)) {
    fail("TERRAIN_LOS_ACTOR_INVALID");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialTerrainLosPlanV1({ state, actor, plan, procedureKind, dataBundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("TERRAIN_LOS_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_TERRAIN_LOS_RULES_PENDING_SCHEMA,
    stage: "choose_certified_terrain_or_line_of_sight_plan",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `terrain-los-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      geometryAuthority: "official_terrain_los_rules_kernel_v1",
      currentOfficialProfileCount: dataBundle.profiles.length,
      productionQuarantined: true },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    terrainDataBundleHash: dataBundle.bundleHash,
    stateProjectionHash: "", productionQuarantined: true, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}
function verifyPending(state, matchBinding = null) {
  verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_TERRAIN_LOS_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("TERRAIN_LOS_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_TERRAIN_LOS_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE, pieceId: pending.actorUnitId,
    executorId: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_TERRAIN_LOS_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      productionQuarantined: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_terrain_movement_cover_and_visibility_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
export function enumerateOfficialTerrainLosRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_TERRAIN_LOS_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE,
      executorId: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_TERRAIN_LOS_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}
export function instantiateOfficialTerrainLosRulesV1(state, domain, parameters,
  options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("TERRAIN_LOS_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("TERRAIN_LOS_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return { action: {
    actionType: OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: expected.pieceId,
    terrainLosRulesPlan: { schema: "starcraft_tmg_official_terrain_los_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_TERRAIN_LOS_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      visible: choice.result.visible ?? null,
      productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
export function applyOfficialTerrainLosRulesV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_TERRAIN_LOS_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_TERRAIN_LOS_RULES_ACTION_ATOM_IDS])) fail("TERRAIN_LOS_ACTION_INVALID");
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.terrainLosRulesPlan?.choiceId;
  const expected = instantiateOfficialTerrainLosRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("TERRAIN_LOS_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const result = { schema: "starcraft_tmg_official_terrain_los_rules_resolution_v1",
    actorUnitId: pending.actorUnitId, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    productionQuarantined: true, trainingTruth: false };
  state.lastTerrainLosRulesResolution = result;
  const event = { type: "terrain_los_rules_resolved", sideKey: pending.sideKey,
    actorUnitId: pending.actorUnitId, procedureKind: choice.procedureKind,
    result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "terrain_los_rules_resolution", round: Number(state.round),
    phase: state.phase, sideKey: pending.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_terrain_los_rules_transition_v1",
    executorId: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_TERRAIN_LOS_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_terrain_movement_cover_and_visibility_resolved",
    trainingTruth: false };
}
