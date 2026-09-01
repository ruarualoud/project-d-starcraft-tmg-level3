import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialUnitDestructionLifecycleDataBundleV1 } from
  "../source-data/official-unit-destruction-lifecycle-data-bundle-v1.mjs";
import {
  officialUnitDestructionLifecycleProcedureKindsV1,
  resolveOfficialUnitDestructionLifecycleProcedureV1,
} from "./official-unit-destruction-lifecycle-rules-kernel-v1.mjs";

export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID =
  "authority.unit-destruction-lifecycle-rules-v1";
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE =
  "resolve_unit_destruction_lifecycle_procedure";
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PARAMETER_KIND =
  "official_unit_destruction_lifecycle_choice_v1";
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_unit_destruction_lifecycle_pending_v1";

export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-7-4-destroyed-unit-effects-end:5df7daf83bcc",
  "rule-atom:singleton:core-7-4-destroyed-unit-tokens:4a40d486b4c8",
  "rule-atom:singleton:core-7-4-outward-effects-remain:e83a36561141",
  "rule-atom:singleton:core-7-4-return-to-play:7ad8b444e6de",
  "rule-atom:singleton:core-7-4-unit-destroyed:e866879bfd22",
].sort());
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_ATOM_IDS =
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS;
export const OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialUnitDestructionLifecycleProcedureKindsV1());

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
  const bundle = state?.officialUnitDestructionLifecycleDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialUnitDestructionLifecycleDataBundleV1(bundle);
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("UNIT_DESTRUCTION_LIFECYCLE_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey, players: state.players,
    pieces: state.pieces, board: state.board,
    unitDestructionLifecycleHistory: state.unitDestructionLifecycleHistory || [],
    lastUnitDestructionLifecycleResolution:
      state.lastUnitDestructionLifecycleResolution || null,
    log: state.log || [],
    officialUnitDestructionLifecycleDataBundle:
      state.officialUnitDestructionLifecycleDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialUnitDestructionLifecycleRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const bundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.rulesDenominatorComplete !== true
    || procedure.clientSuppliedMutation !== undefined) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const kernelInput = { ...clone(procedure), sideKey, state,
    unitDestructionLifecycleDataBundle: bundle,
    rulesOwnedStateRequested: true };
  const resolved = resolveOfficialUnitDestructionLifecycleProcedureV1(kernelInput);
  const planBody = {
    schema: "starcraft_tmg_official_unit_destruction_lifecycle_plan_v1",
    procedureKind, sideKey,
    procedureContextHash: hashStarcraftTmgContract(without(kernelInput, [
      "state", "unitDestructionLifecycleDataBundle",
    ])),
    result: resolved,
  };
  const plan = { ...planBody, planHash: hashStarcraftTmgContract(planBody) };
  const body = {
    schema: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PENDING_SCHEMA,
    stage: "confirm_rules_owned_unit_destruction_lifecycle_transition",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: [{ ...plan, choiceId: `unit-destruction-${plan.planHash}` }],
    rulesCertificate: {
      rulesDenominatorComplete: true,
      registryAuthority: "official_unit_destruction_lifecycle_rules_kernel_v1",
      stateMutationDerivedOnlyByRulesKernel: true,
      localEffectsEndAndCreatedTokensCleaned: true,
      outwardEffectsPreservedUnlessExplicitlyEnding: true,
      destroyedUnitReturnRegistryFailClosed: true,
      positiveReturnExceptionsDeferredToSlice101: true,
      existingCasualtyConsumersFrozen: true,
      clientSuppliedMutationAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    unitDestructionLifecycleDataBundleHash: bundle.bundleHash,
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
    || pending.schema !== OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.unitDestructionLifecycleDataBundleHash !== bundle.bundleHash
    || pending.choices?.length !== 1
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.stateMutationDerivedOnlyByRulesKernel !== true
    || pending.rulesCertificate?.localEffectsEndAndCreatedTokensCleaned !== true
    || pending.rulesCertificate
      ?.outwardEffectsPreservedUnlessExplicitlyEnding !== true
    || pending.rulesCertificate?.destroyedUnitReturnRegistryFailClosed !== true
    || pending.rulesCertificate?.positiveReturnExceptionsDeferredToSlice101 !== true
    || pending.rulesCertificate?.existingCasualtyConsumersFrozen !== true
    || pending.rulesCertificate?.clientSuppliedMutationAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false || pending.trainingTruth !== false) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_PENDING_INVALID");
  }
  const choice = pending.choices[0];
  if (choice.planHash !== hashStarcraftTmgContract(without(choice, [
    "planHash", "choiceId",
  ]))
    || choice.choiceId !== `unit-destruction-${choice.planHash}`
    || choice.result?.resultHash !== hashBody(choice.result, "resultHash")) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE,
    pieceId: pending.choices[0].result.pieceId,
    executorId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      positiveReturnExceptionsDeferredToSlice101: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_unit_destruction_lifecycle_state_transition",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialUnitDestructionLifecycleRulesV1(state,
  options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema
    !== OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    const domain = domainFor(state, options);
    if (String(options.sideKey || state.activeSideKey || "") !== domain.sideKey) {
      fail("UNIT_DESTRUCTION_LIFECYCLE_WRONG_SIDE");
    }
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE,
      executorId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialUnitDestructionLifecycleRulesV1(state,
  domain, parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || parameters.choiceId !== expected.constraints.choices[0].choiceId) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices[0];
  return {
    action: {
      actionType: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE,
      sideKey: expected.sideKey, phase: expected.phase,
      pieceId: choice.result.pieceId,
      unitDestructionLifecyclePlan: {
        schema: "starcraft_tmg_official_unit_destruction_lifecycle_action_plan_v1",
        choiceId: choice.choiceId, planHash: choice.planHash,
        procedureKind: choice.procedureKind,
        pendingHash: state.pendingAction.pendingHash,
      },
      domainId: domain.domainId,
      ruleAtomIds: [...OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { procedureKind: choice.procedureKind,
        resultHash: choice.result.resultHash,
        positiveReturnExceptionsDeferredToSlice101: true,
        trainingTruth: false },
    },
    canonicalParameters: { choiceId: choice.choiceId },
  };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function applyPiecePatch(state, patch) {
  const piece = state.pieces.find((entry) => entry?.id === patch.pieceId);
  if (!piece || hashStarcraftTmgContract(piece) !== patch.expectedBeforePieceHash) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_MUTATION_STALE", patch.pieceId);
  }
  Object.assign(piece, clone(patch.set || {}));
  for (const field of patch.deleteFields || []) delete piece[field];
}
function removeExact(entries, ids, code) {
  const remove = new Set(ids || []);
  if (remove.size !== (ids || []).length
    || [...remove].some((id) => !entries.some((entry) => entry?.id === id))) {
    fail(code);
  }
  return entries.filter((entry) => !remove.has(entry.id));
}
function applyMutation(state, mutation) {
  for (const patch of mutation.piecePatches || []) applyPiecePatch(state, patch);
  for (const patch of mutation.outwardPiecePatches || []) applyPiecePatch(state, patch);
  state.board.tokens = removeExact(state.board.tokens,
    mutation.removeBoardTokenIds || [], "UNIT_DESTRUCTION_TOKEN_PATCH_STALE");
  state.board.effectMarkers = removeExact(state.board.effectMarkers,
    mutation.removeEffectMarkerIds || [], "UNIT_DESTRUCTION_MARKER_PATCH_STALE");
}

export function applyOfficialUnitDestructionLifecycleRulesV1(stateInput,
  actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType
      !== OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_TYPE
    || actionInput.executorId
      !== OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_ACTION_ATOM_IDS])) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.unitDestructionLifecyclePlan?.choiceId;
  const expected = instantiateOfficialUnitDestructionLifecycleRulesV1(
    stateInput, domain, { choiceId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("UNIT_DESTRUCTION_LIFECYCLE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices[0];
  const state = clone(stateInput);
  state.pendingAction = null;
  applyMutation(state, choice.result.mutation);
  const resolution = {
    schema: "starcraft_tmg_official_unit_destruction_lifecycle_resolution_v1",
    sideKey: pending.sideKey, pieceId: choice.result.pieceId,
    procedureKind: choice.procedureKind, planHash: choice.planHash,
    result: clone(choice.result), stateMutationDerivedOnlyByRulesKernel: true,
    positiveReturnExceptionsDeferredToSlice101: true, trainingTruth: false,
  };
  state.lastUnitDestructionLifecycleResolution = resolution;
  state.unitDestructionLifecycleHistory =
    Array.isArray(state.unitDestructionLifecycleHistory)
      ? state.unitDestructionLifecycleHistory : [];
  state.unitDestructionLifecycleHistory.push(clone(resolution));
  const event = {
    type: choice.procedureKind === "settle_unit_destruction"
      ? "unit_destruction_lifecycle_settled"
      : "destroyed_unit_return_restriction_resolved",
    sideKey: pending.sideKey, pieceId: choice.result.pieceId,
    procedureKind: choice.procedureKind, resultHash: choice.result.resultHash,
    removedTokenIds: [...(choice.result.mutation.removeBoardTokenIds || [])],
    removedEffectMarkerIds:
      [...(choice.result.mutation.removeEffectMarkerIds || [])],
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "unit_destruction_lifecycle_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_unit_destruction_lifecycle_transition_v1",
    executorId: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_unit_destruction_lifecycle_state_transition_resolved",
    trainingTruth: false,
  };
}
