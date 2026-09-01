import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import {
  certifyOfficialUnitCompositionUpgradePlanV1,
  officialUnitCompositionUpgradeProcedureKindsV1,
} from "./official-unit-composition-upgrade-rules-kernel-v1.mjs";

export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID =
  "authority.unit-composition-upgrade-rules-v1";
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE =
  "resolve_unit_composition_upgrade_rules_procedure";
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PARAMETER_KIND =
  "official_unit_composition_upgrade_rules_choice_v1";
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_unit_composition_upgrade_rules_pending_v1";

export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-12-10-composition-option-effects:2ff8639c4d1d",
  "rule-atom:singleton:core-12-10-select-one-composition-option:69ee83be80eb",
  "rule-atom:singleton:core-12-10-upgrade-cost-listing:a43c9551b89c",
  "rule-atom:singleton:core-12-10-upgrade-unit-wide-default:4d82cdad8e53",
  "rule-atom:singleton:core-2-2-composition-card-count:9d8508d77bd4",
  "rule-atom:singleton:core-9-1-6-composition-cost-cross-reference:a2f03ae6d09b",
  "rule-atom:singleton:core-9-1-6-composition-option-cost-model-count:0955034b0cd8",
  "rule-atom:singleton:core-9-1-6-composition-option-selection:5dbd74dac335",
  "rule-atom:singleton:core-9-1-6-composition-options-cross-reference:70ef929290b3",
  "rule-atom:singleton:core-9-1-6-eligible-unit-slot-fill:cc0a84fa8c36",
  "rule-atom:singleton:core-9-1-6-mineral-cost-payment:e6d68b526a77",
  "rule-atom:starting-supply-slot-cost",
  "rule-atom:singleton:core-9-1-6-unlisted-model-count-forbidden:5a9ecd7d1c49",
  "rule-atom:singleton:core-9-1-7-distinct-upgrade-entry-limit:b0770ffd1c23",
  "rule-atom:singleton:core-9-1-7-upgrade-list-source:f78665cffca8",
  "rule-atom:singleton:core-9-1-7-upgrade-purchase-and-cost:d799dafd888c",
].sort());
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_ATOM_IDS =
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS;
export const OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialUnitCompositionUpgradeProcedureKindsV1());

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
  const bundle = state?.officialUnitCompositionUpgradeDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("UNIT_COMPOSITION_UPGRADE_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("UNIT_COMPOSITION_UPGRADE_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}

function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    players: state.players,
    armyBuildingConfigurationBySide: state.armyBuildingConfigurationBySide || {},
    armyResourceBudgetsBySide: state.armyResourceBudgetsBySide || {},
    unitCompositionSelectionsBySide: state.unitCompositionSelectionsBySide || {},
    unitUpgradeSelectionsBySide: state.unitUpgradeSelectionsBySide || {},
    armyCompositionUpgradeAuditsBySide:
      state.armyCompositionUpgradeAuditsBySide || {},
    unitCompositionUpgradeRulesHistory:
      state.unitCompositionUpgradeRulesHistory || [],
    lastUnitCompositionUpgradeRulesResolution:
      state.lastUnitCompositionUpgradeRulesResolution || null,
    officialUnitCompositionUpgradeDataBundle:
      state.officialUnitCompositionUpgradeDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialUnitCompositionUpgradeRulesPendingV1(stateInput,
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
    fail("UNIT_COMPOSITION_UPGRADE_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialUnitCompositionUpgradePlanV1({
      plan: { ...plan, input: { ...plan.input, sideKey } }, procedureKind,
      unitCompositionUpgradeDataBundle: bundle,
    })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("UNIT_COMPOSITION_UPGRADE_PLAN_ID_DUPLICATE");
  }
  const body = { schema: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PENDING_SCHEMA,
    stage: "choose_certified_unit_composition_upgrade_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `unit-composition-upgrade-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_unit_composition_upgrade_rules_kernel_v1",
      exact22Unit28Composition52PurchasableUpgradeDenominatorBound: true,
      exactlyOneListedCompositionAndCurrentSupplySlotCostBound: true,
      distinctUpgradeEntriesAndSpecialistModelsBound: true,
      slice102FactionSlotAuditAndSlice103ResourceBudgetReused: true,
      completeCompositionUpgradeAndFieldingLegalityExecutable: true,
      unitEquipmentAndRosterDisclosureDeferredToSlice: 105,
      clientSuppliedCountsSupplyCostsOrApplicationAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    dataBundleHash: bundle.bundleHash, stateProjectionHash: "",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false, trainingTruth: false };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.dataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate
      ?.exact22Unit28Composition52PurchasableUpgradeDenominatorBound !== true
    || pending.rulesCertificate
      ?.exactlyOneListedCompositionAndCurrentSupplySlotCostBound !== true
    || pending.rulesCertificate?.distinctUpgradeEntriesAndSpecialistModelsBound !== true
    || pending.rulesCertificate
      ?.slice102FactionSlotAuditAndSlice103ResourceBudgetReused !== true
    || pending.rulesCertificate
      ?.completeCompositionUpgradeAndFieldingLegalityExecutable !== true
    || pending.rulesCertificate?.unitEquipmentAndRosterDisclosureDeferredToSlice !== 105
    || pending.rulesCertificate
      ?.clientSuppliedCountsSupplyCostsOrApplicationAccepted !== false
    || pending.sourceRefreshPerformed !== false || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) fail("UNIT_COMPOSITION_UPGRADE_PENDING_INVALID");
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      clientSuppliedCountsSupplyCostsOrApplicationAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_unit_composition_upgrade_conformance",
    trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialUnitCompositionUpgradeRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  try {
    const domain = domainFor(state, options); parameterDomains.push(domain);
    candidates.push({ actionType: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE,
      sideKey: domain.sideKey, phase: domain.phase, pieceId: "",
      ruleAtomIds: [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { parameterized: true, parameterKind: domain.parameterKind,
        procedureKind: domain.constraints.procedureKind, trainingTruth: false } });
  } catch (error) {
    if (!options.includeDisabled) return { candidates, parameterDomains };
    candidates.push({ actionType: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey || ""),
      phase: String(state?.phase || ""), pieceId: "",
      executorId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false } });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialUnitCompositionUpgradeRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("UNIT_COMPOSITION_UPGRADE_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("UNIT_COMPOSITION_UPGRADE_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId));
  return { action: {
    actionType: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    unitCompositionUpgradePlan: { schema:
      "starcraft_tmg_official_unit_composition_upgrade_rules_plan_v1",
    choiceId: choice.choiceId, planHash: choice.planHash,
    procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash, trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialUnitCompositionUpgradeRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_ACTION_ATOM_IDS])) {
    fail("UNIT_COMPOSITION_UPGRADE_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.unitCompositionUpgradePlan?.choiceId;
  const expected = instantiateOfficialUnitCompositionUpgradeRulesV1(stateInput, domain,
    { choiceId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("UNIT_COMPOSITION_UPGRADE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  if (choice.procedureKind === "unit_composition_selection") {
    state.unitCompositionSelectionsBySide = object(state.unitCompositionSelectionsBySide)
      ? state.unitCompositionSelectionsBySide : {};
    state.unitCompositionSelectionsBySide[pending.sideKey] = object(
      state.unitCompositionSelectionsBySide[pending.sideKey])
      ? state.unitCompositionSelectionsBySide[pending.sideKey] : {};
    state.unitCompositionSelectionsBySide[pending.sideKey]
      [choice.result.unitInstanceId] = clone(choice.result);
  } else if (choice.procedureKind === "unit_upgrade_selection") {
    state.unitUpgradeSelectionsBySide = object(state.unitUpgradeSelectionsBySide)
      ? state.unitUpgradeSelectionsBySide : {};
    state.unitUpgradeSelectionsBySide[pending.sideKey] = object(
      state.unitUpgradeSelectionsBySide[pending.sideKey])
      ? state.unitUpgradeSelectionsBySide[pending.sideKey] : {};
    state.unitUpgradeSelectionsBySide[pending.sideKey]
      [choice.result.unitInstanceId] = clone(choice.result);
  } else {
    state.armyCompositionUpgradeAuditsBySide = object(
      state.armyCompositionUpgradeAuditsBySide)
      ? state.armyCompositionUpgradeAuditsBySide : {};
    state.armyCompositionUpgradeAuditsBySide[pending.sideKey] = clone(choice.result);
    state.armyResourceBudgetsBySide = object(state.armyResourceBudgetsBySide)
      ? state.armyResourceBudgetsBySide : {};
    state.armyResourceBudgetsBySide[pending.sideKey] = clone(
      choice.result.armyResourceBudgetResult);
  }
  const resolution = { schema:
    "starcraft_tmg_official_unit_composition_upgrade_rules_resolution_v1",
  sideKey: pending.sideKey, procedureKind: choice.procedureKind,
  planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
  rulesOwnedArmyBuildingMutationApplied: true,
  clientSuppliedCountsSupplyCostsOrApplicationAccepted: false,
  trainingTruth: false };
  state.lastUnitCompositionUpgradeRulesResolution = resolution;
  state.unitCompositionUpgradeRulesHistory = Array.isArray(
    state.unitCompositionUpgradeRulesHistory)
    ? state.unitCompositionUpgradeRulesHistory : [];
  state.unitCompositionUpgradeRulesHistory.push(clone(resolution));
  const event = { type: "unit_composition_upgrade_rules_resolved",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    result: clone(resolution), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "unit_composition_upgrade_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_unit_composition_upgrade_rules_transition_v1",
    executorId: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_UNIT_COMPOSITION_UPGRADE_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_unit_composition_upgrade_resolved", trainingTruth: false };
}
