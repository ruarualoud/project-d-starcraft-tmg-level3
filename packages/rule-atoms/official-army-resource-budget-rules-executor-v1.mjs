import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialArmyResourceBudgetDataBundleV1 } from
  "../source-data/official-army-resource-budget-data-bundle-v1.mjs";
import {
  certifyOfficialArmyResourceBudgetPlanV1,
  officialArmyResourceBudgetProcedureKindsV1,
} from "./official-army-resource-budget-rules-kernel-v1.mjs";

export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID =
  "authority.army-resource-budget-rules-v1";
export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE =
  "resolve_army_resource_budget_rules_procedure";
export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PARAMETER_KIND =
  "official_army_resource_budget_rules_choice_v1";
export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_army_resource_budget_rules_pending_v1";

export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:purchased-tactical-and-faction-cards-face-up",
  "rule-atom:singleton:core-9-1-3-mineral-budget-cap:011229d13c89",
  "rule-atom:singleton:core-9-1-3-mineral-unit-purchases:3a43c0da5f8e",
  "rule-atom:singleton:core-9-1-3-unspent-minerals-lost:040ae0b82d09",
  "rule-atom:singleton:core-9-1-4-no-resource-conversion:c418a19abfed",
  "rule-atom:singleton:core-9-1-4-unspent-vespene-lost:0784938522c0",
  "rule-atom:singleton:core-9-1-4-vespene-tactical-purchases:ecd3bbfcc379",
  "rule-atom:singleton:core-9-1-5-army-reference-cost-cross-reference:214b65d5bbc7",
  "rule-atom:singleton:core-9-1-5-tactical-card-slot-purchase:90a83fb46ad7",
  "rule-atom:singleton:core-9-1-8-team-mineral-budget:a8f47de17209",
  "rule-atom:singleton:core-9-1-army-resource-overview:9e9cc1c4ef8a",
].sort());
export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_ATOM_IDS =
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS;
export const OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialArmyResourceBudgetProcedureKindsV1());

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
  const bundle = state?.officialArmyResourceBudgetDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("ARMY_RESOURCE_BUDGET_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialArmyResourceBudgetDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("ARMY_RESOURCE_BUDGET_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}

function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    players: state.players,
    armyBuildingEngagementScale: state.armyBuildingEngagementScale || null,
    armyBuildingConfigurationBySide: state.armyBuildingConfigurationBySide || {},
    armyResourceBudgetsBySide: state.armyResourceBudgetsBySide || {},
    teamMineralBudgetAgreement: state.teamMineralBudgetAgreement || null,
    armyCardOpenInformationBySide: state.armyCardOpenInformationBySide || {},
    armyResourceBudgetRulesHistory: state.armyResourceBudgetRulesHistory || [],
    lastArmyResourceBudgetRulesResolution:
      state.lastArmyResourceBudgetRulesResolution || null,
    officialArmyResourceBudgetDataBundle: state.officialArmyResourceBudgetDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialArmyResourceBudgetRulesPendingV1(stateInput,
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
    fail("ARMY_RESOURCE_BUDGET_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialArmyResourceBudgetPlanV1({ plan: { ...plan, sideKey },
      procedureKind, armyResourceBudgetDataBundle: bundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("ARMY_RESOURCE_BUDGET_PLAN_ID_DUPLICATE");
  }
  const body = { schema: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PENDING_SCHEMA,
    stage: "choose_certified_army_resource_budget_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `army-resource-budget-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_army_resource_budget_rules_kernel_v1",
      exactCurrentTacticalUnitCompositionAndUpgradePricesBound: true,
      exactRationalVespeneLimitNoInventedRounding: true,
      factionTagSlotAndUniqueAuditReusedFromSlice102: true,
      completeCompositionUpgradeAndFieldingLegalityDeferredToSlice: 104,
      unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
      clientSuppliedCostsTotalsOrVisibilityAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    dataBundleHash: bundle.bundleHash, stateProjectionHash: "",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false, trainingTruth: false };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding); const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.dataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate
      ?.exactCurrentTacticalUnitCompositionAndUpgradePricesBound !== true
    || pending.rulesCertificate?.exactRationalVespeneLimitNoInventedRounding !== true
    || pending.rulesCertificate?.factionTagSlotAndUniqueAuditReusedFromSlice102 !== true
    || pending.rulesCertificate
      ?.completeCompositionUpgradeAndFieldingLegalityDeferredToSlice !== 104
    || pending.rulesCertificate?.unitEquipmentAndRosterDisclosureDeferredToSlice !== 105
    || pending.rulesCertificate?.clientSuppliedCostsTotalsOrVisibilityAccepted !== false
    || pending.sourceRefreshPerformed !== false || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) fail("ARMY_RESOURCE_BUDGET_PENDING_INVALID");
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      clientSuppliedCostsTotalsOrVisibilityAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_army_resource_budget_conformance", trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialArmyResourceBudgetRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  try {
    const domain = domainFor(state, options); parameterDomains.push(domain);
    candidates.push({ actionType: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE,
      sideKey: domain.sideKey, phase: domain.phase, pieceId: "",
      ruleAtomIds: [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { parameterized: true, parameterKind: domain.parameterKind,
        procedureKind: domain.constraints.procedureKind, trainingTruth: false } });
  } catch (error) {
    if (!options.includeDisabled) return { candidates, parameterDomains };
    candidates.push({ actionType: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey || ""),
      phase: String(state?.phase || ""), pieceId: "",
      executorId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false } });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialArmyResourceBudgetRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("ARMY_RESOURCE_BUDGET_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("ARMY_RESOURCE_BUDGET_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId));
  return { action: { actionType: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    armyResourceBudgetPlan: { schema:
      "starcraft_tmg_official_army_resource_budget_rules_plan_v1",
    choiceId: choice.choiceId, planHash: choice.planHash,
    procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash, trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialArmyResourceBudgetRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_ACTION_ATOM_IDS])) {
    fail("ARMY_RESOURCE_BUDGET_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.armyResourceBudgetPlan?.choiceId;
  const expected = instantiateOfficialArmyResourceBudgetRulesV1(stateInput, domain,
    { choiceId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("ARMY_RESOURCE_BUDGET_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  if (choice.procedureKind === "army_resource_budget") {
    state.armyResourceBudgetsBySide = object(state.armyResourceBudgetsBySide)
      ? state.armyResourceBudgetsBySide : {};
    state.armyResourceBudgetsBySide[pending.sideKey] = clone(choice.result);
  } else if (choice.procedureKind === "team_mineral_budget") {
    state.teamMineralBudgetAgreement = clone(choice.result);
  } else {
    state.armyCardOpenInformationBySide = object(state.armyCardOpenInformationBySide)
      ? state.armyCardOpenInformationBySide : {};
    state.armyCardOpenInformationBySide[pending.sideKey] = clone(choice.result);
  }
  const resolution = { schema:
    "starcraft_tmg_official_army_resource_budget_rules_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    rulesOwnedArmyBuildingMutationApplied: true,
    clientSuppliedCostsTotalsOrVisibilityAccepted: false, trainingTruth: false };
  state.lastArmyResourceBudgetRulesResolution = resolution;
  state.armyResourceBudgetRulesHistory = Array.isArray(state.armyResourceBudgetRulesHistory)
    ? state.armyResourceBudgetRulesHistory : [];
  state.armyResourceBudgetRulesHistory.push(clone(resolution));
  const event = { type: "army_resource_budget_rules_resolved",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    result: clone(resolution), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "army_resource_budget_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_army_resource_budget_rules_transition_v1",
    executorId: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ARMY_RESOURCE_BUDGET_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_army_resource_budget_resolved", trainingTruth: false };
}
