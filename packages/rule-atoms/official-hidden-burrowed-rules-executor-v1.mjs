import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialHiddenBurrowedDataBundleV1 } from
  "../source-data/official-hidden-burrowed-data-bundle-v1.mjs";
import {
  officialHiddenBurrowedProcedureKindsV1,
  resolveOfficialHiddenBurrowedProcedureV1,
} from "./official-hidden-burrowed-rules-kernel-v1.mjs";

export const OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID =
  "authority.hidden-burrowed-rules-v1";
export const OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_HIDDEN_BURROWED_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE =
  "resolve_hidden_burrowed_procedure";
export const OFFICIAL_HIDDEN_BURROWED_RULES_PARAMETER_KIND =
  "official_hidden_burrowed_choice_v1";
export const OFFICIAL_HIDDEN_BURROWED_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_hidden_burrowed_pending_v1";

export const OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:burrowed-evade-per-targeting-attack",
  "rule-atom:burrowed-start-round-hidden-grant",
  "rule-atom:hidden-evade-per-targeting-attack",
  "rule-atom:singleton:core-11-burrowed-action-removes-status:a60280e0467d",
  "rule-atom:singleton:core-11-burrowed-action-whitelist:106ab3096fb0",
  "rule-atom:singleton:core-11-burrowed-disengage-supply-zero:f0139d240c94",
  "rule-atom:singleton:core-11-burrowed-enemy-attacks:17c4becf42f8",
  "rule-atom:singleton:core-11-burrowed-engaged-combat-sequence:8807e30b2918",
  "rule-atom:singleton:core-11-burrowed-gains-hidden:352b7e370acb",
  "rule-atom:singleton:core-11-burrowed-model-pass-through:25c368516295",
  "rule-atom:singleton:core-11-burrowed-removal-loses-hidden:638dfd9f9987",
  "rule-atom:singleton:core-11-burrowed-size-zero:08f6946cccf5",
  "rule-atom:singleton:core-11-burrowed-special-abilities:1368534de3cc",
  "rule-atom:singleton:core-11-burrowed-status-classification:1db02bc52a19",
  "rule-atom:singleton:core-11-hidden-impact-immunity:6ee45ab3f111",
  "rule-atom:singleton:core-11-hidden-status-classification:d980f58a9c10",
  "rule-atom:singleton:core-11-hidden-targeting-distance:e3f20ddd0ba8",
  "rule-atom:singleton:core-11-visible-hidden-distance-override:36b7d634f39d",
].sort());
export const OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_ATOM_IDS =
  OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS;
export const OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_HIDDEN_BURROWED_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialHiddenBurrowedProcedureKindsV1());

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
  const bundle = state?.officialHiddenBurrowedDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("HIDDEN_BURROWED_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialHiddenBurrowedDataBundleV1(bundle);
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("HIDDEN_BURROWED_DATA_ARTIFACT_BINDING_INVALID");
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

export function openOfficialHiddenBurrowedRulesPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  const bundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.rulesDenominatorComplete !== true
    || procedure.clientSuppliedMutation !== undefined) {
    fail("HIDDEN_BURROWED_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const kernelInput = { ...clone(procedure), sideKey, state,
    hiddenBurrowedDataBundle: bundle, rulesOwnedStateRequested: true };
  const resolved = resolveOfficialHiddenBurrowedProcedureV1(kernelInput);
  const planBody = {
    schema: "starcraft_tmg_official_hidden_burrowed_plan_v1",
    procedureKind, sideKey,
    procedureContextHash: hashStarcraftTmgContract(without(kernelInput, [
      "state", "hiddenBurrowedDataBundle",
    ])),
    result: resolved,
  };
  const plan = { ...planBody, planHash: hashStarcraftTmgContract(planBody) };
  const body = {
    schema: OFFICIAL_HIDDEN_BURROWED_RULES_PENDING_SCHEMA,
    stage: "confirm_rules_owned_hidden_burrowed_transition",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: [{ ...plan, choiceId: `hidden-burrowed-${plan.planHash}` }],
    rulesCertificate: {
      rulesDenominatorComplete: true,
      registryAuthority: "official_hidden_burrowed_rules_kernel_v1",
      stateMutationDerivedOnlyByRulesKernel: true,
      perAttackDefenseEventHashBound: true,
      baseEdgeGeometryRulesOwned: true,
      currentBurrowedCarrierQuarantined: true,
      existingConsumersFrozen: true,
      clientSuppliedMutationAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    hiddenBurrowedDataBundleHash: bundle.bundleHash,
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
    || pending.schema !== OFFICIAL_HIDDEN_BURROWED_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.hiddenBurrowedDataBundleHash !== bundle.bundleHash
    || pending.choices?.length !== 1
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.stateMutationDerivedOnlyByRulesKernel !== true
    || pending.rulesCertificate?.perAttackDefenseEventHashBound !== true
    || pending.rulesCertificate?.baseEdgeGeometryRulesOwned !== true
    || pending.rulesCertificate?.currentBurrowedCarrierQuarantined !== true
    || pending.rulesCertificate?.existingConsumersFrozen !== true
    || pending.rulesCertificate?.clientSuppliedMutationAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false || pending.trainingTruth !== false) {
    fail("HIDDEN_BURROWED_PENDING_INVALID");
  }
  const choice = pending.choices[0];
  if (choice.planHash !== hashStarcraftTmgContract(without(choice, ["planHash", "choiceId"]))
    || choice.choiceId !== `hidden-burrowed-${choice.planHash}`
    || choice.result?.resultHash !== hashBody(choice.result, "resultHash")) {
    fail("HIDDEN_BURROWED_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_HIDDEN_BURROWED_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE,
    pieceId: pending.choices[0].result.pieceId
      || pending.choices[0].result.targetPieceId || null,
    executorId: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      currentBurrowedCarrierQuarantined: true,
      existingConsumersFrozen: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_hidden_burrowed_rules_state_transition",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialHiddenBurrowedRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_HIDDEN_BURROWED_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    const domain = domainFor(state, options);
    if (String(options.sideKey || state.activeSideKey || "") !== domain.sideKey) {
      fail("HIDDEN_BURROWED_WRONG_SIDE");
    }
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE,
      executorId: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialHiddenBurrowedRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("HIDDEN_BURROWED_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || parameters.choiceId !== expected.constraints.choices[0].choiceId) {
    fail("HIDDEN_BURROWED_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices[0];
  return {
    action: {
      actionType: OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE,
      sideKey: expected.sideKey, phase: expected.phase,
      pieceId: expected.pieceId,
      hiddenBurrowedPlan: {
        schema: "starcraft_tmg_official_hidden_burrowed_action_plan_v1",
        choiceId: choice.choiceId, planHash: choice.planHash,
        procedureKind: choice.procedureKind,
        pendingHash: state.pendingAction.pendingHash,
      },
      domainId: domain.domainId,
      ruleAtomIds: [...OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { procedureKind: choice.procedureKind,
        resultHash: choice.result.resultHash,
        productionBurrowedCarrierAvailable: false, trainingTruth: false },
    },
    canonicalParameters: { choiceId: choice.choiceId },
  };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function applyMutation(state, mutation) {
  for (const piecePatch of mutation.piecePatches || []) {
    const piece = state.pieces.find((entry) => entry?.id === piecePatch.pieceId);
    if (!piece || hashStarcraftTmgContract(piece) !== piecePatch.expectedBeforePieceHash) {
      fail("HIDDEN_BURROWED_MUTATION_STALE", piecePatch.pieceId);
    }
    Object.assign(piece, clone(piecePatch.set || {}));
    for (const field of piecePatch.deleteFields || []) delete piece[field];
  }
  if ((mutation.removeBoardTokenIds || []).length > 0
    || (mutation.removeEffectMarkerIds || []).length > 0) {
    fail("HIDDEN_BURROWED_BOARD_MUTATION_UNSUPPORTED");
  }
}

export function applyOfficialHiddenBurrowedRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_HIDDEN_BURROWED_RULES_ACTION_ATOM_IDS])) {
    fail("HIDDEN_BURROWED_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.hiddenBurrowedPlan?.choiceId;
  const expected = instantiateOfficialHiddenBurrowedRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("HIDDEN_BURROWED_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices[0];
  const state = clone(stateInput);
  state.pendingAction = null;
  applyMutation(state, choice.result.mutation);
  const resolution = {
    schema: "starcraft_tmg_official_hidden_burrowed_resolution_v1",
    sideKey: pending.sideKey, pieceId: choice.result.pieceId
      || choice.result.targetPieceId || null,
    procedureKind: choice.procedureKind, planHash: choice.planHash,
    result: clone(choice.result), stateMutationDerivedOnlyByRulesKernel: true,
    productionBurrowedCarrierAvailable: false, trainingTruth: false,
  };
  state.lastHiddenBurrowedResolution = resolution;
  state.hiddenBurrowedHistory = Array.isArray(state.hiddenBurrowedHistory)
    ? state.hiddenBurrowedHistory : [];
  state.hiddenBurrowedHistory.push(clone(resolution));
  const event = {
    type: "hidden_burrowed_procedure_resolved", sideKey: pending.sideKey,
    pieceId: resolution.pieceId, procedureKind: choice.procedureKind,
    resultHash: choice.result.resultHash,
    attackEventHash: choice.result.attackEventHash || null,
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "hidden_burrowed_resolution", round: Number(state.round),
    phase: state.phase, sideKey: pending.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_hidden_burrowed_transition_v1",
    executorId: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_HIDDEN_BURROWED_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_hidden_burrowed_state_transition_resolved",
    trainingTruth: false,
  };
}
