import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import {
  applyOfficialStandardMoveV1,
  enumerateOfficialStandardMoveV1,
  instantiateOfficialStandardMoveV1,
  OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_PARAMETER_KIND,
} from "./official-standard-move-executor-v1.mjs";

export const OFFICIAL_ASSAULT_RUN_EXECUTOR_ID = "authority.assault-run-v1";
export const OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ASSAULT_RUN_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ASSAULT_RUN_ACTION_TYPE = "run";
export const OFFICIAL_ASSAULT_RUN_PARAMETER_KIND = "official_assault_run_path_v1";

export const OFFICIAL_ASSAULT_RUN_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-unengaged-action-permissions:2ca966d92d94",
  "rule-atom:singleton:core-12-4-run-action-summary:744d8ba4de15",
  "rule-atom:singleton:core-8-6-1-assault-action-choice:55a40f973065",
  "rule-atom:singleton:core-8-7-1-run-action-definition:7462efd93e26",
  "rule-atom:singleton:core-8-7-1-run-move-procedure:1164c0f98ad5",
  "rule-atom:singleton:core-8-7-1-run-move-restrictions:e9b7030d76e4",
].sort());

export const OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_ASSAULT_RUN_NEW_ATOM_IDS,
    ...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
  ]),
].sort());
export const OFFICIAL_ASSAULT_RUN_EXECUTOR_ATOM_IDS =
  OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS;

const LEGACY_EXECUTOR_ARTIFACT_HASH =
  "e7c349f74524883e8205502d3afbe586737c0c938ce644fd3113916f86dfe56f";
const HASH = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) {
  return hashStarcraftTmgContract(without(value, [field]));
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

function sourceBinding(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.auditHash !== hashBody(audit, "auditHash")
    || audit.repositoryFallbackAllowed !== false
    || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== audit.snapshotHash
    || bundle?.normalizedDatasetHash !== audit.normalizedDatasetHash
    || bundle?.repositoryFallbackAllowed !== false
    || bundle?.trainingTruth !== false) {
    fail("ASSAULT_RUN_SOURCE_LOCK_BINDING_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_assault_run_adapter_receipt_v1",
    sourceLockHash: audit.lockHash,
    sourceLockAuditHash: audit.auditHash,
    sourceSnapshotHash: audit.snapshotHash,
    normalizedDatasetHash: audit.normalizedDatasetHash,
    gameplayDataBundleHash: bundle.gameplayDataBundleHash,
    legacyExecutorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    legacyExecutorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
    legacyExecutorArtifactHash: LEGACY_EXECUTOR_ARTIFACT_HASH,
    compatibilityMode: "explicit_assault_to_frozen_standard_move_adapter",
    silentCompatibilityUsed: false,
    repositoryFallbackAllowed: false,
    trainingTruth: false,
  };
  return { ...body, adapterReceiptHash: hashStarcraftTmgContract(body) };
}

function phaseReady(state, sideKey) {
  if (state?.phase !== "assault") fail("ASSAULT_RUN_WRONG_PHASE");
  if (state?.activeSideKey !== sideKey) fail("ASSAULT_RUN_NOT_ACTIVE_SIDE");
  if (state?.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("ASSAULT_RUN_SIDE_PASSED");
  }
  const choice = state?.phaseFirstActorByRound?.[`${state.round}:assault`];
  if (!object(choice)
    || choice.round !== Number(state.round)
    || choice.phase !== "assault"
    || !["player1", "player2"].includes(choice.chosenFirstActorSideKey)) {
    fail("ASSAULT_RUN_INITIATIVE_UNRESOLVED");
  }
}

function eligible(piece, sideKey) {
  return piece?.sideKey === sideKey
    && piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0
    && piece?.officialUnitRecordKey === "army_units:marine"
    && piece?.activatedPhases?.movement === true
    && piece?.activatedPhases?.assault !== true;
}

function syntheticMovementState(state, sideKey) {
  phaseReady(state, sideKey);
  sourceBinding(state);
  const synthetic = clone(state);
  synthetic.phase = "movement";
  synthetic.players[sideKey].passedPhases = {
    ...clone(synthetic.players[sideKey].passedPhases || {}),
    movement: synthetic.players[sideKey].passedPhases?.assault === true,
  };
  synthetic.phaseFirstActorByRound[`${synthetic.round}:movement`] = {
    round: Number(synthetic.round),
    phase: "movement",
    markerHolderSideKey: state.phaseFirstActorByRound[`${state.round}:assault`]
      .markerHolderSideKey,
    chosenFirstActorSideKey: state.phaseFirstActorByRound[`${state.round}:assault`]
      .chosenFirstActorSideKey,
  };
  for (const piece of synthetic.pieces || []) {
    piece.activatedPhases = {
      movement: false,
      assault: false,
      combat: false,
      ...clone(piece.activatedPhases || {}),
      movement: piece.activatedPhases?.assault === true,
    };
  }
  return synthetic;
}

function mapDomain(domain, binding) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    parameterKind: OFFICIAL_ASSAULT_RUN_PARAMETER_KIND,
    phase: "assault",
    actionType: OFFICIAL_ASSAULT_RUN_ACTION_TYPE,
    executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS],
    constraints: {
      ...clone(domain.constraints),
      movementSideActivationMarkerRequired: true,
      assaultSideActivationMarkerMustBeAbsent: true,
      standardMovementRestrictionsApply: true,
      sourceLockHash: binding.sourceLockHash,
      sourceLockAuditHash: binding.sourceLockAuditHash,
      dataAdapterReceiptHash: binding.adapterReceiptHash,
    },
    rulesTruth: "official_current_marine_assault_run_parameter_domain_v1",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function diagnostic(sideKey, pieceId, error) {
  return {
    actionType: OFFICIAL_ASSAULT_RUN_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId,
    ruleAtomIds: [...OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_assault_run_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function legacyDomains(state, options) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const synthetic = syntheticMovementState(state, sideKey);
  const legacy = enumerateOfficialStandardMoveV1(synthetic, {
    ...options,
    sideKey,
  });
  return { sideKey, synthetic, legacy, binding: sourceBinding(state) };
}

export function enumerateOfficialAssaultRunV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const eligibleIds = new Set((state?.pieces || [])
    .filter((piece) => eligible(piece, sideKey))
    .map((piece) => String(piece.id)));
  try {
    const { legacy, binding } = legacyDomains(state, options);
    return {
      candidates: legacy.candidates
        .filter((candidate) => eligibleIds.has(String(candidate.pieceId)))
        .map((candidate) => diagnostic(sideKey, candidate.pieceId,
          candidate.disabledReason || "ASSAULT_RUN_DISABLED")),
      parameterDomains: legacy.parameterDomains
        .filter((domain) => eligibleIds.has(String(domain.pieceId)))
        .map((domain) => mapDomain(domain, binding)),
    };
  } catch (error) {
    return {
      candidates: options.includeDisabled === true
        ? [...eligibleIds].map((pieceId) => diagnostic(sideKey, pieceId, error))
        : [],
      parameterDomains: [],
    };
  }
}

function expected(state, domain, options) {
  const current = enumerateOfficialAssaultRunV1(state, {
    sideKey: domain?.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const mapped = current.parameterDomains.find((entry) => entry.domainId === domain?.domainId);
  if (!mapped || !isDeepStrictEqual(mapped, domain)) fail("ASSAULT_RUN_PARAMETER_DOMAIN_STALE");
  const { synthetic, legacy, binding } = legacyDomains(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const legacyDomain = legacy.parameterDomains.find((entry) => entry.pieceId === domain.pieceId);
  if (!legacyDomain || legacyDomain.parameterKind !== OFFICIAL_STANDARD_MOVE_PARAMETER_KIND) {
    fail("ASSAULT_RUN_PARAMETER_DOMAIN_STALE");
  }
  return { synthetic, legacyDomain, binding };
}

function mapAction(legacyAction, domain, binding) {
  const runPlanBody = {
    schemaVersion: "starcraft_tmg_official_assault_run_plan_v1",
    ...without(clone(legacyAction.movePlan), ["schemaVersion", "movePlanHash"]),
    legacyMovePlanHash: legacyAction.movePlan.movePlanHash,
    sourceLockHash: binding.sourceLockHash,
    sourceLockAuditHash: binding.sourceLockAuditHash,
    dataAdapterReceiptHash: binding.adapterReceiptHash,
    movementSideActivationMarkerRequired: true,
    assaultSideActivationMarkerWritten: true,
    trainingTruth: false,
  };
  const runPlan = { ...runPlanBody, runPlanHash: hashStarcraftTmgContract(runPlanBody) };
  return {
    actionType: OFFICIAL_ASSAULT_RUN_ACTION_TYPE,
    sideKey: domain.sideKey,
    phase: "assault",
    pieceId: domain.pieceId,
    runPlan,
    ruleAtomIds: [...OFFICIAL_ASSAULT_RUN_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION,
  };
}

export function instantiateOfficialAssaultRunV1(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_ASSAULT_RUN_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_ASSAULT_RUN_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION) {
    fail("ASSAULT_RUN_PARAMETER_DOMAIN_INVALID");
  }
  const { synthetic, legacyDomain, binding } = expected(state, domain, options);
  const legacy = instantiateOfficialStandardMoveV1(
    synthetic,
    legacyDomain,
    parameters,
    { matchBinding: options.matchBinding },
  );
  return {
    schemaVersion: "starcraft_tmg_official_assault_run_parameter_instantiation_v1",
    canonicalParameters: clone(legacy.canonicalParameters),
    action: mapAction(legacy.action, domain, binding),
    rulesTruth: "official_current_marine_assault_run_instantiation_v1",
    frozenSemanticKernel:
      `${OFFICIAL_STANDARD_MOVE_EXECUTOR_ID}@${OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}

function legacyAction(runAction, legacyDomain) {
  const movePlan = {
    schemaVersion: "starcraft_tmg_official_standard_move_plan_v1",
    ...without(clone(runAction.runPlan), [
      "schemaVersion", "runPlanHash", "legacyMovePlanHash", "sourceLockHash",
      "sourceLockAuditHash", "dataAdapterReceiptHash",
      "movementSideActivationMarkerRequired", "assaultSideActivationMarkerWritten",
    ]),
    movePlanHash: runAction.runPlan.legacyMovePlanHash,
  };
  return {
    actionType: "move",
    sideKey: legacyDomain.sideKey,
    phase: "movement",
    pieceId: legacyDomain.pieceId,
    movePlan,
    ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  };
}

export function applyOfficialAssaultRunV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_ASSAULT_RUN_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_ASSAULT_RUN_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION
    || !object(actionInput.runPlan)) {
    fail("ASSAULT_RUN_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialAssaultRunV1(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => entry.pieceId === actionInput.pieceId);
  if (!domain) fail("ASSAULT_RUN_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialAssaultRunV1(stateInput, domain, {
    leadingModelId: actionInput.runPlan.leadingModelId,
    path: actionInput.runPlan.canonicalPath?.points?.slice(1),
    placements: actionInput.runPlan.placementSequence,
  }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), instantiated.action)) {
    fail("ASSAULT_RUN_ACTION_STALE");
  }
  const { synthetic, legacyDomain } = expected(stateInput, domain, options);
  const moved = applyOfficialStandardMoveV1(
    synthetic,
    legacyAction(instantiated.action, legacyDomain),
    { ...options, matchBinding: options.matchBinding },
  );
  const state = clone(stateInput);
  const beforePiece = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  const afterPiece = moved.state.pieces.find((piece) => piece.id === actionInput.pieceId);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  piece.models = clone(afterPiece.models);
  piece.xInches = afterPiece.xInches;
  piece.yInches = afterPiece.yInches;
  piece.statuses = clone(afterPiece.statuses);
  piece.inCoherency = afterPiece.inCoherency;
  piece.lastLeadingModelId = afterPiece.lastLeadingModelId;
  piece.lastRunPlanHash = actionInput.runPlan.runPlanHash;
  piece.activatedPhases = {
    ...clone(beforePiece.activatedPhases || {}),
    movement: true,
    assault: true,
  };
  const events = [{
    type: "unit_assault_ran",
    sideKey: actionInput.sideKey,
    pieceId: actionInput.pieceId,
    leadingModelId: actionInput.runPlan.leadingModelId,
    runPlanHash: actionInput.runPlan.runPlanHash,
    legacyMovePlanHash: actionInput.runPlan.legacyMovePlanHash,
    distanceTravelledInches: actionInput.runPlan.distanceTravelledInches,
    speedAllowanceInches: actionInput.runPlan.speedAllowanceInches,
    movementSideActivationMarkerPreserved: true,
    assaultSideActivationMarkerWritten: true,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round),
    phase: "assault",
    action: clone(instantiated.action),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_assault_run_transition_v1",
    executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(instantiated.action),
    settlementRequired: true,
    rulesTruth: "official_current_marine_assault_run_exact_subset_v1",
    frozenSemanticKernel:
      `${OFFICIAL_STANDARD_MOVE_EXECUTOR_ID}@${OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
