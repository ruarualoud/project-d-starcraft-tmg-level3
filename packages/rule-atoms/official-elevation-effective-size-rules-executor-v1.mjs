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
import { certifyOfficialElevationEffectiveSizePlanV1 } from
  "./official-elevation-effective-size-rules-kernel-v1.mjs";

export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID =
  "authority.elevation-effective-size-rules-v1";
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE =
  "resolve_elevation_effective_size_rules_procedure";
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PARAMETER_KIND =
  "official_elevation_effective_size_rules_choice_v1";
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_elevation_effective_size_rules_pending_v1";

export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:elevated-model-adds-supporting-terrain-size",
  "rule-atom:high-ground-effective-size",
  "rule-atom:mid-ground-effective-size",
  "rule-atom:singleton:core-11-effective-size-formula:b6981ada2b47",
  "rule-atom:singleton:core-11-stacked-terrain-effective-size:9d27f6a2d0bc",
  "rule-atom:singleton:core-4-1-elevation-distance:1facd32e1170",
  "rule-atom:singleton:core-7-1-2-model-effective-size:df67a1153986",
  "rule-atom:singleton:core-7-1-3-high-ground-evade:0711eafb82c1",
  "rule-atom:singleton:core-7-1-3-lower-elevation-origin:8ec28e91b388",
  "rule-atom:stacked-terrain-effective-size",
].sort());

export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_REUSED_FLYING_ATOM_IDS =
  Object.freeze([
    "rule-atom:flying-cover-and-line-of-sight-effective-size",
    "rule-atom:flying-cover-effective-size",
    "rule-atom:flying-high-ground-cover-prohibition",
    "rule-atom:flying-line-of-sight-and-cover-composite",
    "rule-atom:flying-retained-direct-cover-and-dead-zone",
  ].sort());

export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_NEW_ATOM_IDS,
  ...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_REUSED_FLYING_ATOM_IDS,
].sort());
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS;

const PROCEDURE_KINDS = Object.freeze([
  "effective_size_check",
  "horizontal_elevation_distance_check",
  "elevated_line_of_sight_check",
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
    fail("ELEVATION_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialTerrainLosDataBundleV1(terrainData);
  if (matchBinding) {
    const contentHash = matchBinding.dependencies?.geometryArtifact?.contentHash;
    if (contentHash !== hashStarcraftTmgContract(terrainData)
      || (matchBinding.geometryArtifactHash !== undefined
        && matchBinding.geometryArtifactHash !== contentHash)) {
      fail("ELEVATION_GEOMETRY_ARTIFACT_BINDING_INVALID");
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

export function openOfficialElevationEffectiveSizeRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const dataBundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.includes(procedureKind)
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("ELEVATION_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  if (!activePiece(actor)
    || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)) {
    fail("ELEVATION_ACTOR_INVALID");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialElevationEffectiveSizePlanV1({ state, actor, plan,
      procedureKind, dataBundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("ELEVATION_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PENDING_SCHEMA,
    stage: "choose_certified_elevation_effective_size_plan",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `elevation-effective-size-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      geometryAuthority: "official_elevation_effective_size_rules_kernel_v1",
      terrainGeometryAdapter: "official_terrain_los_rules_kernel_v1",
      flyingCoverAdapter: "official_flying_rules_kernel_v1",
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
    || pending.schema !== OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("ELEVATION_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE,
    pieceId: pending.actorUnitId,
    executorId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      productionQuarantined: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_elevation_effective_size_and_high_ground_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialElevationEffectiveSizeRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema
    !== OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE,
      executorId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialElevationEffectiveSizeRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("ELEVATION_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("ELEVATION_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return { action: {
    actionType: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: expected.pieceId,
    elevationEffectiveSizeRulesPlan: {
      schema: "starcraft_tmg_official_elevation_effective_size_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      effectiveSize: choice.result.subject?.effectiveSize ?? null,
      visible: choice.result.visible ?? null,
      highGroundEvadeEligible: choice.result.highGroundEvadeEligible ?? null,
      productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialElevationEffectiveSizeRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS])) {
    fail("ELEVATION_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.elevationEffectiveSizeRulesPlan?.choiceId;
  const expected = instantiateOfficialElevationEffectiveSizeRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("ELEVATION_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const result = {
    schema: "starcraft_tmg_official_elevation_effective_size_rules_resolution_v1",
    actorUnitId: pending.actorUnitId, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    productionQuarantined: true, trainingTruth: false };
  state.lastElevationEffectiveSizeRulesResolution = result;
  const event = { type: "elevation_effective_size_rules_resolved",
    sideKey: pending.sideKey, actorUnitId: pending.actorUnitId,
    procedureKind: choice.procedureKind, result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "elevation_effective_size_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_elevation_effective_size_rules_transition_v1",
    executorId: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_elevation_effective_size_and_high_ground_resolved",
    trainingTruth: false };
}
