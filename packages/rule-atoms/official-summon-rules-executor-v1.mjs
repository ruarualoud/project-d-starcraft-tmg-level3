import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialSummonDataBundleV1 } from
  "../source-data/official-summon-data-bundle-v1.mjs";
import {
  certifyOfficialSummonPlanV1,
  officialSummonProcedureKindsV1,
} from "./official-summon-rules-kernel-v1.mjs";

export const OFFICIAL_SUMMON_RULES_EXECUTOR_ID = "authority.summon-rules-v1";
export const OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_SUMMON_RULES_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SUMMON_RULES_ACTION_TYPE = "resolve_summon_rules_procedure";
export const OFFICIAL_SUMMON_RULES_PARAMETER_KIND = "official_summon_rules_choice_v1";
export const OFFICIAL_SUMMON_RULES_PENDING_SCHEMA = "starcraft_tmg_official_summon_rules_pending_v1";

export const OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-summon-initial-phase-activation-lock:cc62b705a3f1",
  "rule-atom:singleton:core-11-summon-parent-absent-activation:3516f00593a0",
  "rule-atom:singleton:core-11-summon-parent-linked-activation:f0a0b42b20d5",
  "rule-atom:singleton:core-11-summon-placement-and-coherency:ecad8dae6ba7",
  "rule-atom:singleton:core-11-summon-supply-limit:329009f4fbba",
  "rule-atom:singleton:core-11-summon-zone-of-influence:7d429718696c",
  "rule-atom:singleton:core-9-1-9-summoned-ability-only-deployment:1599708bbd02",
  "rule-atom:singleton:core-9-1-9-summoned-army-list-exclusion:730545c3e4c0",
  "rule-atom:singleton:core-9-1-9-summoned-current-supply:df7fa2baae79",
  "rule-atom:singleton:core-9-1-9-summoned-final-score-exclusion:17fa8b611480",
  "rule-atom:singleton:core-9-1-9-summoned-friendly-status:6caff4460881",
  "rule-atom:singleton:core-9-1-9-summoned-not-reserve:88525958409a",
  "rule-atom:summon-enemy-separation",
].sort());
export const OFFICIAL_SUMMON_RULES_ACTION_ATOM_IDS = OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS;
export const OFFICIAL_SUMMON_RULES_EXECUTOR_ATOM_IDS = OFFICIAL_SUMMON_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialSummonProcedureKindsV1());

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
  const bundle = state?.officialSummonDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("SUMMON_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialSummonDataBundleV1(bundle);
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("SUMMON_DATA_ARTIFACT_BINDING_INVALID");
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

export function openOfficialSummonRulesPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput); const bundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64
    || procedure.clientSuppliedMutation !== undefined) {
    fail("SUMMON_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => certifyOfficialSummonPlanV1({
    plan: { ...plan, sideKey }, procedureKind, summonDataBundle: bundle,
  })).map((entry) => ({ ...entry, choiceId: `summon-${entry.planHash}` }))
    .sort((left, right) => left.choiceId.localeCompare(right.choiceId));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("SUMMON_PLAN_ID_DUPLICATE");
  }
  const body = { schema: OFFICIAL_SUMMON_RULES_PENDING_SCHEMA,
    stage: "choose_certified_summon_plan", round: Number(state.round),
    phase: state.phase, sideKey, procedureKind, choices,
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_summon_rules_kernel_v1",
      exactCurrentSummonedUnitDenominatorBound: true,
      genericSummonDistinctFromCardSpecificDeployment: true,
      placementSupplyActivationAndRelationshipStateRulesOwned: true,
      clientSuppliedMutationAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    summonDataBundleHash: bundle.bundleHash, stateProjectionHash: "",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false, trainingTruth: false };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding); const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_SUMMON_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.summonDataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.exactCurrentSummonedUnitDenominatorBound !== true
    || pending.rulesCertificate?.genericSummonDistinctFromCardSpecificDeployment !== true
    || pending.rulesCertificate?.placementSupplyActivationAndRelationshipStateRulesOwned !== true
    || pending.rulesCertificate?.clientSuppliedMutationAccepted !== false
    || pending.sourceRefreshPerformed !== false || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) fail("SUMMON_PENDING_INVALID");
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_SUMMON_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_SUMMON_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_SUMMON_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      clientSuppliedMutationAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_summon_rules_owned_transition", trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialSummonRulesV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "");
  const candidates = []; const parameterDomains = [];
  try {
    const domain = domainFor(state, options);
    if (sideKey !== domain.sideKey) fail("SUMMON_WRONG_SIDE");
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_SUMMON_RULES_ACTION_TYPE, sideKey,
      phase: state?.phase || "", pieceId: "",
      executorId: OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_SUMMON_RULES_ACTION_ATOM_IDS], isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0], score: 0,
      details: { trainingTruth: false } });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialSummonRulesV1(state, domain, parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("SUMMON_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("SUMMON_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId));
  return { action: { actionType: OFFICIAL_SUMMON_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase,
    pieceId: choice.result.summonedPieceId || "",
    summonRulesPlan: { schema: "starcraft_tmg_official_summon_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId, ruleAtomIds: [...OFFICIAL_SUMMON_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash, trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}

function contractAction(value) { return without(value, ["isEnabled", "disabledReason", "score", "details"]); }
function applyMutation(state, mutation) {
  for (const patch of mutation?.piecePatches || []) {
    const piece = state.pieces.find((entry) => entry.id === patch.pieceId);
    if (!piece || hashStarcraftTmgContract(piece) !== patch.expectedBeforePieceHash) {
      fail("SUMMON_MUTATION_STALE", String(patch.pieceId || ""));
    }
    Object.assign(piece, clone(patch.set || {}));
  }
}

export function applyOfficialSummonRulesV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput) || actionInput.actionType !== OFFICIAL_SUMMON_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SUMMON_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_SUMMON_RULES_ACTION_ATOM_IDS])) fail("SUMMON_ACTION_INVALID");
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.summonRulesPlan?.choiceId;
  const expected = instantiateOfficialSummonRulesV1(stateInput, domain, { choiceId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("SUMMON_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  applyMutation(state, choice.result.mutation);
  const resolution = { schema: "starcraft_tmg_official_summon_rules_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    clientSuppliedMutationAccepted: false, trainingTruth: false };
  state.lastSummonRulesResolution = resolution;
  state.summonRulesHistory = Array.isArray(state.summonRulesHistory)
    ? state.summonRulesHistory : [];
  state.summonRulesHistory.push(clone(resolution));
  const event = { type: "summon_rules_resolved", sideKey: pending.sideKey,
    pieceId: choice.result.summonedPieceId || null,
    procedureKind: choice.procedureKind, resultHash: choice.result.resultHash,
    trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "summon_rules_resolution", round: Number(state.round),
    phase: state.phase, sideKey: pending.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true, schemaVersion: "starcraft_tmg_official_summon_rules_transition_v1",
    executorId: OFFICIAL_SUMMON_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SUMMON_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_summon_rules_resolved", trainingTruth: false };
}
