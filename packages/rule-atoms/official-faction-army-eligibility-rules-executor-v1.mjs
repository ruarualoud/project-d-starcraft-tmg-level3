import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialFactionArmyEligibilityDataBundleV1 } from
  "../source-data/official-faction-army-eligibility-data-bundle-v1.mjs";
import {
  certifyOfficialFactionArmyEligibilityPlanV1,
  officialFactionArmyEligibilityProcedureKindsV1,
} from "./official-faction-army-eligibility-rules-kernel-v1.mjs";

export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID =
  "authority.faction-army-eligibility-rules-v1";
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE =
  "resolve_faction_army_eligibility_rules_procedure";
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PARAMETER_KIND =
  "official_faction_army_eligibility_rules_choice_v1";
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_faction_army_eligibility_rules_pending_v1";

export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:army-building-faction-tag-eligibility",
  "rule-atom:faction-card-special-ability-field",
  "rule-atom:faction-card-tag-eligibility",
  "rule-atom:faction-tag-unit-allegiance",
  "rule-atom:race-faction-tag-set",
  "rule-atom:singleton:core-11-army-slot-capacity:1fc66d359039",
  "rule-atom:singleton:core-11-army-slot-types:fdea1de495a6",
  "rule-atom:singleton:core-11-faction-initial-army-slots:d85ff42c4c18",
  "rule-atom:singleton:core-11-faction-tags-definition:3a2df61a250b",
  "rule-atom:singleton:core-11-tactical-extra-army-slots:0c4f9de1e102",
  "rule-atom:singleton:core-11-unit-army-slot-occupancy:7aeaa6a98a16",
  "rule-atom:singleton:core-5-4-faction-card-identity:bd1d9ade39d2",
  "rule-atom:singleton:core-5-4-faction-card-slots:375d8114dd4b",
  "rule-atom:singleton:core-5-4-faction-card-tags:87c0f823d785",
  "rule-atom:singleton:core-9-1-1-engagement-scale-agreement:972897dc93d1",
  "rule-atom:singleton:core-9-1-2-all-tags-must-match:7cc09e31867e",
  "rule-atom:singleton:core-9-1-2-any-tag-mismatch:6ddbccb04328",
  "rule-atom:singleton:core-9-1-2-card-faction-tags:00c9a7d2275c",
  "rule-atom:singleton:core-9-1-2-faction-card-basis:bf8f5368125d",
  "rule-atom:singleton:core-9-1-2-fewer-tags-eligible:ba35ea81600d",
  "rule-atom:singleton:core-9-1-2-race-faction-selection:d17616e3b627",
  "rule-atom:singleton:core-9-1-4-engagement-scale-table:9f348270c2b7",
  "rule-atom:sub-faction-tag-classification",
  "rule-atom:unused-army-slots-lost",
].sort());
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_ATOM_IDS =
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS;
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialFactionArmyEligibilityProcedureKindsV1());

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
  const bundle = state?.officialFactionArmyEligibilityDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("FACTION_ARMY_ELIGIBILITY_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("FACTION_ARMY_ELIGIBILITY_DATA_ARTIFACT_BINDING_INVALID");
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
    factionArmyEligibilityRulesHistory: state.factionArmyEligibilityRulesHistory || [],
    lastFactionArmyEligibilityRulesResolution:
      state.lastFactionArmyEligibilityRulesResolution || null,
    officialFactionArmyEligibilityDataBundle: state.officialFactionArmyEligibilityDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialFactionArmyEligibilityRulesPendingV1(stateInput,
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
    fail("FACTION_ARMY_ELIGIBILITY_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialFactionArmyEligibilityPlanV1({ plan: { ...plan, sideKey },
      procedureKind, factionArmyEligibilityDataBundle: bundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("FACTION_ARMY_ELIGIBILITY_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PENDING_SCHEMA,
    stage: "choose_certified_faction_army_eligibility_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `faction-army-eligibility-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_faction_army_eligibility_rules_kernel_v1",
      exactCurrentFactionCardTacticalAndUnitProfilesBound: true,
      unitSubFactionKeywordFieldBound: true,
      completeResourceBudgetDeferredToSlice: 103,
      completeCompositionCostAndUpgradeValidationDeferredToSlice: 104,
      clientSuppliedTagsEligibilityScaleOrSlotTotalsAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    dataBundleHash: bundle.bundleHash, stateProjectionHash: "",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding); const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.dataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.exactCurrentFactionCardTacticalAndUnitProfilesBound !== true
    || pending.rulesCertificate?.unitSubFactionKeywordFieldBound !== true
    || pending.rulesCertificate?.completeResourceBudgetDeferredToSlice !== 103
    || pending.rulesCertificate?.completeCompositionCostAndUpgradeValidationDeferredToSlice !== 104
    || pending.rulesCertificate
      ?.clientSuppliedTagsEligibilityScaleOrSlotTotalsAccepted !== false
    || pending.sourceRefreshPerformed !== false || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) fail("FACTION_ARMY_ELIGIBILITY_PENDING_INVALID");
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      clientSuppliedTagsEligibilityScaleOrSlotTotalsAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_faction_army_eligibility_conformance",
    trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialFactionArmyEligibilityRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  try {
    const domain = domainFor(state, options); parameterDomains.push(domain);
    candidates.push({ actionType: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE,
      sideKey: domain.sideKey, phase: domain.phase, pieceId: "",
      ruleAtomIds: [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { parameterized: true, parameterKind: domain.parameterKind,
        procedureKind: domain.constraints.procedureKind, trainingTruth: false } });
  } catch (error) {
    if (!options.includeDisabled) return { candidates, parameterDomains };
    candidates.push({ actionType: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey || ""),
      phase: String(state?.phase || ""), pieceId: "",
      executorId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false } });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialFactionArmyEligibilityRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("FACTION_ARMY_ELIGIBILITY_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("FACTION_ARMY_ELIGIBILITY_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId));
  return { action: {
    actionType: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    factionArmyEligibilityPlan: {
      schema: "starcraft_tmg_official_faction_army_eligibility_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash, trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialFactionArmyEligibilityRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_ACTION_ATOM_IDS])) {
    fail("FACTION_ARMY_ELIGIBILITY_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.factionArmyEligibilityPlan?.choiceId;
  const expected = instantiateOfficialFactionArmyEligibilityRulesV1(stateInput, domain,
    { choiceId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("FACTION_ARMY_ELIGIBILITY_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  state.armyBuildingConfigurationBySide = object(state.armyBuildingConfigurationBySide)
    ? state.armyBuildingConfigurationBySide : {};
  const sideConfiguration = object(state.armyBuildingConfigurationBySide[pending.sideKey])
    ? state.armyBuildingConfigurationBySide[pending.sideKey] : {};
  if (choice.procedureKind === "engagement_scale_agreement") {
    state.armyBuildingEngagementScale = clone(choice.result.scale);
  } else if (choice.procedureKind === "faction_card_selection") {
    sideConfiguration.factionCard = clone(choice.result.factionCard);
  } else if (choice.procedureKind === "faction_tag_eligibility") {
    sideConfiguration.factionEligibility = clone(choice.result);
  } else if (choice.procedureKind === "army_slot_audit") {
    sideConfiguration.armySlotAudit = clone(choice.result);
  }
  state.armyBuildingConfigurationBySide[pending.sideKey] = sideConfiguration;
  const resolution = {
    schema: "starcraft_tmg_official_faction_army_eligibility_rules_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    rulesOwnedArmyBuildingMutationApplied: true,
    clientSuppliedTagsEligibilityScaleOrSlotTotalsAccepted: false,
    trainingTruth: false };
  state.lastFactionArmyEligibilityRulesResolution = resolution;
  state.factionArmyEligibilityRulesHistory =
    Array.isArray(state.factionArmyEligibilityRulesHistory)
      ? state.factionArmyEligibilityRulesHistory : [];
  state.factionArmyEligibilityRulesHistory.push(clone(resolution));
  const event = { type: "faction_army_eligibility_rules_resolved",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    result: clone(resolution), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "faction_army_eligibility_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_faction_army_eligibility_rules_transition_v1",
    executorId: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_FACTION_ARMY_ELIGIBILITY_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_faction_army_eligibility_resolved", trainingTruth: false };
}
