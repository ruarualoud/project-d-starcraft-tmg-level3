import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialAbilityTimingPriorityDataBundleV1 } from
  "../source-data/official-ability-timing-priority-data-bundle-v1.mjs";
import { verifyOfficialKeywordSpecialAbilityDataBundleV1 } from
  "../source-data/official-keyword-special-ability-data-bundle-v1.mjs";
import {
  certifyOfficialAbilityTimingPriorityPlanV1,
  officialAbilityTimingPriorityProcedureKindsV1,
} from "./official-ability-timing-priority-rules-kernel-v1.mjs";

export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID =
  "authority.ability-timing-priority-rules-v1";
export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE =
  "resolve_ability_timing_priority_rules_procedure";
export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PARAMETER_KIND =
  "official_ability_timing_priority_rules_choice_v1";
export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_ability_timing_priority_rules_pending_v1";

export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:end-of-round-effect-resolution-order",
  "rule-atom:reaction-ability-default-end-round-expiry",
  "rule-atom:simultaneous-reaction-active-player-priority",
  "rule-atom:singleton:core-10-3-cross-player-passive-priority:755236fd6f17",
  "rule-atom:singleton:core-10-3-simultaneous-own-passive-order:09c645dd7331",
  "rule-atom:singleton:core-10-4-ability-type-comparison-table:227f781dcc17",
].sort());
export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_ATOM_IDS =
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_NEW_ATOM_IDS;
export const OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialAbilityTimingPriorityProcedureKindsV1());

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
  const abilityBundle = state?.officialKeywordSpecialAbilityDataBundle;
  const timingBundle = state?.officialAbilityTimingPriorityDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("ABILITY_TIMING_PRIORITY_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialKeywordSpecialAbilityDataBundleV1(abilityBundle);
  verifyOfficialAbilityTimingPriorityDataBundleV1(timingBundle, abilityBundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("ABILITY_TIMING_PRIORITY_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return { timingBundle, abilityBundle };
}

function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey, players: state.players,
    abilityTimingPriorityRulesHistory: state.abilityTimingPriorityRulesHistory || [],
    lastAbilityTimingPriorityRulesResolution:
      state.lastAbilityTimingPriorityRulesResolution || null,
    officialAbilityTimingPriorityDataBundle:
      state.officialAbilityTimingPriorityDataBundle,
    officialKeywordSpecialAbilityDataBundle:
      state.officialKeywordSpecialAbilityDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialAbilityTimingPriorityRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const { timingBundle, abilityBundle } = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("ABILITY_TIMING_PRIORITY_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialAbilityTimingPriorityPlanV1({ plan: { ...plan, sideKey },
      procedureKind, timingDataBundle: timingBundle, abilityDataBundle: abilityBundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("ABILITY_TIMING_PRIORITY_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PENDING_SCHEMA,
    stage: "choose_certified_ability_timing_priority_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `ability-timing-priority-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_ability_timing_priority_rules_kernel_v1",
      exactOfficialTimingAndAbilityIndexesBound: true,
      arbitraryEffectExecutionClaimed: false,
      clientSuppliedPriorityDurationOrComparisonAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    timingDataBundleHash: timingBundle.bundleHash,
    abilityDataBundleHash: abilityBundle.bundleHash,
    stateProjectionHash: "", sourceRefreshPerformed: false,
    repositoryFallbackUsed: false, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const { timingBundle, abilityBundle } = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.timingDataBundleHash !== timingBundle.bundleHash
    || pending.abilityDataBundleHash !== abilityBundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.exactOfficialTimingAndAbilityIndexesBound !== true
    || pending.rulesCertificate?.arbitraryEffectExecutionClaimed !== false
    || pending.rulesCertificate?.clientSuppliedPriorityDurationOrComparisonAccepted !== false
    || pending.sourceRefreshPerformed !== false || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) fail("ABILITY_TIMING_PRIORITY_PENDING_INVALID");
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      clientSuppliedPriorityDurationOrComparisonAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_ability_timing_priority_primitive_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialAbilityTimingPriorityRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE,
      executorId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialAbilityTimingPriorityRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("ABILITY_TIMING_PRIORITY_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("ABILITY_TIMING_PRIORITY_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return { action: {
    actionType: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    abilityTimingPriorityPlan: {
      schema: "starcraft_tmg_official_ability_timing_priority_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash,
      arbitraryEffectExecutionPerformed: false, trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialAbilityTimingPriorityRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_ACTION_ATOM_IDS])) {
    fail("ABILITY_TIMING_PRIORITY_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.abilityTimingPriorityPlan?.choiceId;
  const expected = instantiateOfficialAbilityTimingPriorityRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("ABILITY_TIMING_PRIORITY_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const result = {
    schema: "starcraft_tmg_official_ability_timing_priority_rules_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    arbitraryEffectExecutionPerformed: false,
    clientSuppliedPriorityDurationOrComparisonAccepted: false, trainingTruth: false,
  };
  state.lastAbilityTimingPriorityRulesResolution = result;
  state.abilityTimingPriorityRulesHistory = Array.isArray(
    state.abilityTimingPriorityRulesHistory,
  ) ? state.abilityTimingPriorityRulesHistory : [];
  state.abilityTimingPriorityRulesHistory.push(clone(result));
  const event = { type: "ability_timing_priority_rules_resolved",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "ability_timing_priority_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_ability_timing_priority_rules_transition_v1",
    executorId: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_ability_timing_priority_primitive_resolved",
    trainingTruth: false };
}
