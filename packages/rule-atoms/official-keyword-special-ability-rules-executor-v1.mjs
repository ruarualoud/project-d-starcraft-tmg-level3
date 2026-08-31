import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialKeywordSpecialAbilityDataBundleV1 } from
  "../source-data/official-keyword-special-ability-data-bundle-v1.mjs";
import {
  certifyOfficialKeywordSpecialAbilityPlanV1,
  officialKeywordSpecialAbilityProcedureKindsV1,
} from "./official-keyword-special-ability-rules-kernel-v1.mjs";

export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID =
  "authority.keyword-special-ability-rules-v1";
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE =
  "resolve_keyword_special_ability_rules_procedure";
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PARAMETER_KIND =
  "official_keyword_special_ability_rules_choice_v1";
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_keyword_special_ability_rules_pending_v1";

export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-10-1-same-name-nonstacking:4014b356f571",
  "rule-atom:singleton:core-10-1-token-marker-not-target:5ddbe008bd24",
  "rule-atom:singleton:core-10-1-untargeted-los-exemption:55165babda42",
  "rule-atom:singleton:core-10-2-ability-type-summary-table:9eff0b0b43ed",
  "rule-atom:singleton:core-11-repeatable-use-permission:202261e65742",
  "rule-atom:singleton:core-11-same-named-special-ability-nonstack:e5088bff9106",
  "rule-atom:singleton:core-11-special-ability-categories:6340000d25e5",
  "rule-atom:singleton:core-11-special-ability-definition:efff992aafa2",
  "rule-atom:singleton:core-2-6-1-keyword-format:4875f7979ba3",
  "rule-atom:singleton:core-2-6-1-keyword-meaning:a4a6bf787177",
  "rule-atom:singleton:core-2-6-1-keyword-no-stack:5af3766b661b",
  "rule-atom:singleton:core-2-6-1-numeric-keyword-highest:b7554a796219",
  "rule-atom:singleton:core-2-7-ability-category-summary:f7a8a1ab1778",
].sort());
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_ATOM_IDS =
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_NEW_ATOM_IDS;
export const OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialKeywordSpecialAbilityProcedureKindsV1());

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
  const bundle = state?.officialKeywordSpecialAbilityDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("KEYWORD_SPECIAL_ABILITY_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("KEYWORD_SPECIAL_ABILITY_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey, players: state.players,
    keywordSpecialAbilityRulesHistory: state.keywordSpecialAbilityRulesHistory || [],
    lastKeywordSpecialAbilityRulesResolution:
      state.lastKeywordSpecialAbilityRulesResolution || null,
    officialKeywordSpecialAbilityDataBundle:
      state.officialKeywordSpecialAbilityDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialKeywordSpecialAbilityRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const dataBundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind)
    || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0
    || procedure.candidatePlans.length > 64) {
    fail("KEYWORD_SPECIAL_ABILITY_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialKeywordSpecialAbilityPlanV1({
      plan: { ...plan, sideKey }, procedureKind, dataBundle,
    })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("KEYWORD_SPECIAL_ABILITY_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PENDING_SCHEMA,
    stage: "choose_certified_keyword_special_ability_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `keyword-special-ability-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: {
      candidatePlansComplete: true,
      rulesDenominatorComplete: true,
      registryAuthority: "official_keyword_special_ability_rules_kernel_v1",
      exactOfficialKeywordAndAbilityIndexesBound: true,
      clientSuppliedMeaningCategoryOrResultAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    keywordSpecialAbilityDataBundleHash: dataBundle.bundleHash,
    stateProjectionHash: "",
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
    trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.keywordSpecialAbilityDataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.exactOfficialKeywordAndAbilityIndexesBound !== true
    || pending.rulesCertificate?.clientSuppliedMeaningCategoryOrResultAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) {
    fail("KEYWORD_SPECIAL_ABILITY_PENDING_INVALID");
  }
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE,
    pieceId: "",
    executorId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player",
    },
    constraints: {
      pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind,
      choices: clone(pending.choices),
      clientSuppliedMeaningCategoryOrResultAccepted: false,
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_keyword_special_ability_primitive_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialKeywordSpecialAbilityRulesV1(state,
  options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema
    !== OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    parameterDomains.push(domainFor(state, options));
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE,
      executorId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialKeywordSpecialAbilityRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("KEYWORD_SPECIAL_ABILITY_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => (
      entry.choiceId === parameters.choiceId
    ))) {
    fail("KEYWORD_SPECIAL_ABILITY_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return { action: {
    actionType: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    keywordSpecialAbilityPlan: {
      schema: "starcraft_tmg_official_keyword_special_ability_rules_plan_v1",
      choiceId: choice.choiceId,
      planHash: choice.planHash,
      procedureKind: choice.procedureKind,
      pendingHash: state.pendingAction.pendingHash,
    },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash,
      clientSuppliedMeaningCategoryOrResultAccepted: false,
      trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialKeywordSpecialAbilityRulesV1(stateInput,
  actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_ACTION_ATOM_IDS])) {
    fail("KEYWORD_SPECIAL_ABILITY_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.keywordSpecialAbilityPlan?.choiceId;
  const expected = instantiateOfficialKeywordSpecialAbilityRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("KEYWORD_SPECIAL_ABILITY_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput);
  state.pendingAction = null;
  const result = {
    schema: "starcraft_tmg_official_keyword_special_ability_rules_resolution_v1",
    sideKey: pending.sideKey,
    procedureKind: choice.procedureKind,
    planId: choice.planId,
    planHash: choice.planHash,
    result: clone(choice.result),
    clientSuppliedMeaningCategoryOrResultAccepted: false,
    trainingTruth: false,
  };
  state.lastKeywordSpecialAbilityRulesResolution = result;
  state.keywordSpecialAbilityRulesHistory = Array.isArray(
    state.keywordSpecialAbilityRulesHistory,
  ) ? state.keywordSpecialAbilityRulesHistory : [];
  state.keywordSpecialAbilityRulesHistory.push(clone(result));
  const event = {
    type: "keyword_special_ability_rules_resolved",
    sideKey: pending.sideKey,
    procedureKind: choice.procedureKind,
    result: clone(result), trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "keyword_special_ability_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_keyword_special_ability_rules_transition_v1",
    executorId: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_keyword_special_ability_primitive_resolved",
    trainingTruth: false };
}
