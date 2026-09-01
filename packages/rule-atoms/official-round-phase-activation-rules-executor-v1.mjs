import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialRoundPhaseActivationDataBundleV1 } from
  "../source-data/official-round-phase-activation-data-bundle-v1.mjs";
import {
  certifyOfficialRoundPhaseActivationPlanV1,
  officialRoundPhaseActivationProcedureKindsV1,
} from "./official-round-phase-activation-rules-kernel-v1.mjs";

export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID =
  "authority.round-phase-activation-rules-v1";
export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE =
  "resolve_round_phase_activation_rules_procedure";
export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PARAMETER_KIND =
  "official_round_phase_activation_rules_choice_v1";
export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_round_phase_activation_rules_pending_v1";

export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:general-unit-activation-alternation",
  "rule-atom:one-phase-action-per-activation",
  "rule-atom:singleton:core-12-2-round-phase-summary:b8f6169b9144",
  "rule-atom:singleton:core-8-1-phase-order:e3324f3a077a",
  "rule-atom:singleton:core-8-1-round-limit:f50686cb73d6",
  "rule-atom:singleton:core-8-2-alternating-activation-phases:113115ac121a",
  "rule-atom:singleton:core-8-4-1-on-table-action-choice:8246f987c914",
].sort());
export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_ATOM_IDS =
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_NEW_ATOM_IDS;
export const OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialRoundPhaseActivationProcedureKindsV1());

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }

function verifySourceAndData(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const bundle = state?.officialRoundPhaseActivationDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("ROUND_PHASE_ACTIVATION_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialRoundPhaseActivationDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("ROUND_PHASE_ACTIVATION_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}

function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    firstPlayerSideKey: state.firstPlayerSideKey, players: state.players,
    pieces: state.pieces,
    roundPhaseActivationRulesHistory: state.roundPhaseActivationRulesHistory || [],
    lastRoundPhaseActivationRulesResolution:
      state.lastRoundPhaseActivationRulesResolution || null,
    officialRoundPhaseActivationDataBundle: state.officialRoundPhaseActivationDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialRoundPhaseActivationRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput); const bundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("ROUND_PHASE_ACTIVATION_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialRoundPhaseActivationPlanV1({ plan: { ...plan, sideKey },
      procedureKind, roundPhaseActivationDataBundle: bundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("ROUND_PHASE_ACTIVATION_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PENDING_SCHEMA,
    stage: "choose_certified_round_phase_activation_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `round-phase-activation-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_round_phase_activation_rules_kernel_v1",
      maximumRounds: 5, strictFourPhaseOrder: true,
      alternatingActivationPhases: ["movement", "assault", "combat"],
      oneUnitAndOnePhaseActionPerActivation: true,
      atomicExecutorsStillOwnActionLegality: true,
      completeCurrentLegalSpaceClaimed: false,
      clientSuppliedSequenceMenuOrFinalTurnAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    roundPhaseActivationDataBundleHash: bundle.bundleHash,
    stateProjectionHash: "", sourceRefreshPerformed: false,
    repositoryFallbackUsed: false, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding); const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.roundPhaseActivationDataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.maximumRounds !== 5
    || pending.rulesCertificate?.strictFourPhaseOrder !== true
    || pending.rulesCertificate?.oneUnitAndOnePhaseActionPerActivation !== true
    || pending.rulesCertificate?.atomicExecutorsStillOwnActionLegality !== true
    || pending.rulesCertificate?.completeCurrentLegalSpaceClaimed !== false
    || pending.rulesCertificate?.clientSuppliedSequenceMenuOrFinalTurnAccepted !== false
    || pending.sourceRefreshPerformed !== false || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) fail("ROUND_PHASE_ACTIVATION_PENDING_INVALID");
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      completeCurrentLegalSpaceClaimed: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_round_phase_activation_primitive_conformance",
    trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialRoundPhaseActivationRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    const domain = domainFor(state, options);
    if (String(options.sideKey || state.activeSideKey || "") !== domain.sideKey) {
      fail("ROUND_PHASE_ACTIVATION_WRONG_SIDE");
    }
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE,
      executorId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialRoundPhaseActivationRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("ROUND_PHASE_ACTIVATION_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("ROUND_PHASE_ACTIVATION_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return { action: {
    actionType: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    roundPhaseActivationPlan: {
      schema: "starcraft_tmg_official_round_phase_activation_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash, completeCurrentLegalSpaceClaimed: false,
      trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialRoundPhaseActivationRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_ACTION_ATOM_IDS])) {
    fail("ROUND_PHASE_ACTIVATION_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.roundPhaseActivationPlan?.choiceId;
  const expected = instantiateOfficialRoundPhaseActivationRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("ROUND_PHASE_ACTIVATION_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const resolution = {
    schema: "starcraft_tmg_official_round_phase_activation_rules_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    completeCurrentLegalSpaceClaimed: false,
    clientSuppliedSequenceMenuOrFinalTurnAccepted: false, trainingTruth: false,
  };
  state.lastRoundPhaseActivationRulesResolution = resolution;
  state.roundPhaseActivationRulesHistory = Array.isArray(
    state.roundPhaseActivationRulesHistory,
  ) ? state.roundPhaseActivationRulesHistory : [];
  state.roundPhaseActivationRulesHistory.push(clone(resolution));
  const event = { type: "round_phase_activation_rules_resolved",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    result: clone(resolution), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "round_phase_activation_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_round_phase_activation_rules_transition_v1",
    executorId: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ROUND_PHASE_ACTIVATION_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_round_phase_activation_primitive_resolved",
    trainingTruth: false };
}
