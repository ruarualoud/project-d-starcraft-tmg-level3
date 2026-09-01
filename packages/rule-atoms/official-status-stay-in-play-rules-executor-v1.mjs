import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialStatusStayInPlayDataBundleV1 } from
  "../source-data/official-status-stay-in-play-data-bundle-v1.mjs";
import {
  officialStatusStayInPlayProcedureKindsV1,
  resolveOfficialStatusStayInPlayProcedureV1,
} from "./official-status-stay-in-play-rules-kernel-v1.mjs";

export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID =
  "authority.status-stay-in-play-rules-v1";
export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE =
  "resolve_status_stay_in_play_procedure";
export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND =
  "official_status_stay_in_play_choice_v1";
export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_status_stay_in_play_pending_v1";

export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-on-creep-condition:71f40e4e561b",
  "rule-atom:singleton:core-11-on-creep-keyword:3462776dbb82",
  "rule-atom:singleton:core-11-on-creep-rule-uses:173b9839db96",
  "rule-atom:singleton:core-11-shielded-dependent-abilities:03c5e18dd1a9",
  "rule-atom:singleton:core-11-siege-mode-action-restrictions:0a3f79a5ceee",
  "rule-atom:singleton:core-11-siege-mode-other-weapons:b5e99bc22166",
  "rule-atom:singleton:core-11-siege-mode-profile-eligibility:492d22e13d51",
  "rule-atom:singleton:core-11-siege-mode-reserve-removal:11a2452c6254",
  "rule-atom:singleton:core-11-status-cleanup-persistence:06224d287247",
  "rule-atom:singleton:core-11-status-mode-markers:da984bafdab9",
  "rule-atom:singleton:core-11-stay-in-play-persistence:3fe0d315070d",
  "rule-atom:status-marker-stay-in-play",
].sort());
export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_ATOM_IDS =
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS;
export const OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_STATUS_STAY_IN_PLAY_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialStatusStayInPlayProcedureKindsV1());

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
function verifySourceAndData(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const bundle = state?.officialStatusStayInPlayDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("STATUS_STAY_IN_PLAY_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialStatusStayInPlayDataBundleV1(bundle);
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("STATUS_STAY_IN_PLAY_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    state: without(state, ["pendingAction"]),
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialStatusStayInPlayRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const bundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.rulesDenominatorComplete !== true
    || procedure.clientSuppliedMutation !== undefined) {
    fail("STATUS_STAY_IN_PLAY_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const kernelInput = { ...clone(procedure), sideKey, state,
    statusStayInPlayDataBundle: bundle, rulesOwnedStateRequested: true };
  const resolved = resolveOfficialStatusStayInPlayProcedureV1(kernelInput);
  const planBody = {
    schema: "starcraft_tmg_official_status_stay_in_play_plan_v1",
    procedureKind, sideKey,
    procedureContextHash: hashStarcraftTmgContract(without(kernelInput, [
      "state", "statusStayInPlayDataBundle",
    ])),
    result: resolved,
  };
  const plan = { ...planBody, planHash: hashStarcraftTmgContract(planBody) };
  const body = {
    schema: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PENDING_SCHEMA,
    stage: "confirm_rules_owned_status_stay_in_play_transition",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: [{ ...plan, choiceId: `status-stay-${plan.planHash}` }],
    rulesCertificate: {
      rulesDenominatorComplete: true,
      registryAuthority: "official_status_stay_in_play_rules_kernel_v1",
      stateMutationDerivedOnlyByRulesKernel: true,
      statusAndStayInPlayPersistenceExplicit: true,
      shieldedDependencyCleanupExplicit: true,
      siegeModeCurrentCarrierQuarantined: true,
      onCreepCreepTumorGeometryFailClosed: true,
      existingConsumersFrozen: true,
      clientSuppliedMutationAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    statusStayInPlayDataBundleHash: bundle.bundleHash,
    stateProjectionHash: "", sourceRefreshPerformed: false,
    repositoryFallbackUsed: false, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.statusStayInPlayDataBundleHash !== bundle.bundleHash
    || pending.choices?.length !== 1
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.stateMutationDerivedOnlyByRulesKernel !== true
    || pending.rulesCertificate?.statusAndStayInPlayPersistenceExplicit !== true
    || pending.rulesCertificate?.shieldedDependencyCleanupExplicit !== true
    || pending.rulesCertificate?.siegeModeCurrentCarrierQuarantined !== true
    || pending.rulesCertificate?.onCreepCreepTumorGeometryFailClosed !== true
    || pending.rulesCertificate?.existingConsumersFrozen !== true
    || pending.rulesCertificate?.clientSuppliedMutationAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false || pending.trainingTruth !== false) {
    fail("STATUS_STAY_IN_PLAY_PENDING_INVALID");
  }
  const choice = pending.choices[0];
  if (choice.planHash !== hashStarcraftTmgContract(without(choice, [
    "planHash", "choiceId",
  ]))
    || choice.choiceId !== `status-stay-${choice.planHash}`
    || choice.result?.resultHash !== hashBody(choice.result, "resultHash")) {
    fail("STATUS_STAY_IN_PLAY_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE,
    pieceId: pending.choices[0].result.pieceId || null,
    executorId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      currentSiegeCarrierQuarantined: true,
      creepTumorGeometryFailClosed: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_status_stay_in_play_rules_state_transition",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialStatusStayInPlayRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_STATUS_STAY_IN_PLAY_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    const domain = domainFor(state, options);
    if (String(options.sideKey || state.activeSideKey || "") !== domain.sideKey) {
      fail("STATUS_STAY_IN_PLAY_WRONG_SIDE");
    }
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE,
      executorId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialStatusStayInPlayRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("STATUS_STAY_IN_PLAY_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || parameters.choiceId !== expected.constraints.choices[0].choiceId) {
    fail("STATUS_STAY_IN_PLAY_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices[0];
  return {
    action: {
      actionType: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE,
      sideKey: expected.sideKey, phase: expected.phase,
      pieceId: choice.result.pieceId || null,
      statusStayInPlayPlan: {
        schema: "starcraft_tmg_official_status_stay_in_play_action_plan_v1",
        choiceId: choice.choiceId, planHash: choice.planHash,
        procedureKind: choice.procedureKind,
        pendingHash: state.pendingAction.pendingHash,
      },
      domainId: domain.domainId,
      ruleAtomIds: [...OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { procedureKind: choice.procedureKind,
        resultHash: choice.result.resultHash,
        productionSiegeCarrierAvailable: false,
        trainingTruth: false },
    },
    canonicalParameters: { choiceId: choice.choiceId },
  };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function applyPiecePatch(state, piecePatch) {
  const piece = state.pieces.find((entry) => entry?.id === piecePatch.pieceId);
  if (!piece || hashStarcraftTmgContract(piece) !== piecePatch.expectedBeforePieceHash) {
    fail("STATUS_STAY_IN_PLAY_MUTATION_STALE", piecePatch.pieceId);
  }
  Object.assign(piece, clone(piecePatch.set || {}));
  for (const field of piecePatch.deleteFields || []) delete piece[field];
}
function removeExact(entries, ids, code) {
  const remove = new Set(ids || []);
  if (remove.size !== (ids || []).length
    || [...remove].some((id) => !entries.some((entry) => entry?.id === id))) fail(code);
  return entries.filter((entry) => !remove.has(entry.id));
}
function applyMutation(state, mutation) {
  for (const piecePatch of mutation.piecePatches || []) {
    applyPiecePatch(state, piecePatch);
  }
  state.board.tokens = removeExact(state.board.tokens,
    mutation.removeBoardTokenIds || [], "STATUS_STAY_IN_PLAY_TOKEN_PATCH_STALE");
  state.board.effectMarkers = removeExact(state.board.effectMarkers,
    mutation.removeEffectMarkerIds || [], "STATUS_STAY_IN_PLAY_MARKER_PATCH_STALE");
}

export function applyOfficialStatusStayInPlayRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_STATUS_STAY_IN_PLAY_RULES_ACTION_ATOM_IDS])) {
    fail("STATUS_STAY_IN_PLAY_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.statusStayInPlayPlan?.choiceId;
  const expected = instantiateOfficialStatusStayInPlayRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("STATUS_STAY_IN_PLAY_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices[0];
  const state = clone(stateInput);
  state.pendingAction = null;
  applyMutation(state, choice.result.mutation);
  const resolution = {
    schema: "starcraft_tmg_official_status_stay_in_play_resolution_v1",
    sideKey: pending.sideKey, pieceId: choice.result.pieceId || null,
    procedureKind: choice.procedureKind, planHash: choice.planHash,
    result: clone(choice.result), stateMutationDerivedOnlyByRulesKernel: true,
    productionSiegeCarrierAvailable: false, trainingTruth: false,
  };
  state.lastStatusStayInPlayResolution = resolution;
  state.statusStayInPlayHistory = Array.isArray(state.statusStayInPlayHistory)
    ? state.statusStayInPlayHistory : [];
  state.statusStayInPlayHistory.push(clone(resolution));
  const event = {
    type: "status_stay_in_play_procedure_resolved",
    sideKey: pending.sideKey, pieceId: choice.result.pieceId || null,
    procedureKind: choice.procedureKind, resultHash: choice.result.resultHash,
    removedTokenIds: [...(choice.result.mutation.removeBoardTokenIds || [])],
    removedEffectMarkerIds: [...(choice.result.mutation.removeEffectMarkerIds || [])],
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "status_stay_in_play_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_status_stay_in_play_transition_v1",
    executorId: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_STATUS_STAY_IN_PLAY_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_status_stay_in_play_state_transition_resolved",
    trainingTruth: false,
  };
}
