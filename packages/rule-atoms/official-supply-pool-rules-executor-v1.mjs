import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialSupplyPoolDataBundleV1 } from
  "../source-data/official-supply-pool-data-bundle-v1.mjs";
import { verifyOfficialUnitCardSupplyDataBundleV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import {
  certifyOfficialSupplyPoolPlanV1,
  officialSupplyPoolProcedureKindsV1,
} from "./official-supply-pool-rules-kernel-v1.mjs";

export const OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID =
  "authority.supply-pool-rules-v1";
export const OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_SUPPLY_POOL_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE =
  "resolve_supply_pool_rules_procedure";
export const OFFICIAL_SUPPLY_POOL_RULES_PARAMETER_KIND =
  "official_supply_pool_rules_choice_v1";
export const OFFICIAL_SUPPLY_POOL_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_supply_pool_rules_pending_v1";

export const OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-8-3-1-round-one-supply:f897849a6c55",
  "rule-atom:singleton:core-8-3-2-casualties-free-supply:57d92ec7fddd",
  "rule-atom:singleton:core-8-3-3-deployment-card-cross-reference:f06e7aa2baa1",
  "rule-atom:singleton:core-8-4-available-supply-verification:d2772be00ae6",
  "rule-atom:supply-pool-capacity-definition",
].sort());
export const OFFICIAL_SUPPLY_POOL_RULES_ACTION_ATOM_IDS =
  OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS;
export const OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_SUPPLY_POOL_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialSupplyPoolProcedureKindsV1());

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
  const supplyPool = state?.officialSupplyPoolDataBundle;
  const unitSupply = state?.officialUnitCardSupplyDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false
    || gameplay?.trainingTruth !== false) {
    fail("SUPPLY_POOL_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialSupplyPoolDataBundleV1(supplyPool);
  verifyOfficialUnitCardSupplyDataBundleV1(unitSupply);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("SUPPLY_POOL_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return { supplyPool, unitSupply };
}

function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey, players: state.players,
    pieces: state.pieces,
    supplyPoolRulesHistory: state.supplyPoolRulesHistory || [],
    lastSupplyPoolRulesResolution: state.lastSupplyPoolRulesResolution || null,
    officialSupplyPoolDataBundle: state.officialSupplyPoolDataBundle,
    officialUnitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialSupplyPoolRulesPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  const { supplyPool, unitSupply } = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0
    || procedure.candidatePlans.length > 64) {
    fail("SUPPLY_POOL_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialSupplyPoolPlanV1({
      plan: { ...plan, sideKey }, procedureKind,
      supplyPoolDataBundle: supplyPool,
      unitCardSupplyDataBundle: unitSupply,
    })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("SUPPLY_POOL_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_SUPPLY_POOL_RULES_PENDING_SCHEMA,
    stage: "choose_certified_supply_pool_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({
      ...entry, choiceId: `supply-pool-${entry.planHash}`,
    })).sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: {
      candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_supply_pool_rules_kernel_v1",
      roundOneMissionSupplyCapacityRulesOwned: true,
      currentSupplyAlwaysRecalculatedFromOfficialUnitProfiles: true,
      reserveSupplyExcludedFromOnTableUsage: true,
      casualtySupplyReleaseRecalculatedFromCurrentModels: true,
      deploymentInfluenceZoneReferencesOfficialDeploymentCard: true,
      completeLaterRoundSupplyLifecycleClaimed: false,
      clientSuppliedCapacityUsageReleaseOrZoneAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    supplyPoolDataBundleHash: supplyPool.bundleHash,
    unitCardSupplyDataBundleHash: unitSupply.bundleHash,
    stateProjectionHash: "", sourceRefreshPerformed: false,
    repositoryFallbackUsed: false, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const { supplyPool, unitSupply } = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_SUPPLY_POOL_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.supplyPoolDataBundleHash !== supplyPool.bundleHash
    || pending.unitCardSupplyDataBundleHash !== unitSupply.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.roundOneMissionSupplyCapacityRulesOwned !== true
    || pending.rulesCertificate
      ?.currentSupplyAlwaysRecalculatedFromOfficialUnitProfiles !== true
    || pending.rulesCertificate?.reserveSupplyExcludedFromOnTableUsage !== true
    || pending.rulesCertificate?.casualtySupplyReleaseRecalculatedFromCurrentModels
      !== true
    || pending.rulesCertificate
      ?.deploymentInfluenceZoneReferencesOfficialDeploymentCard !== true
    || pending.rulesCertificate?.completeLaterRoundSupplyLifecycleClaimed !== false
    || pending.rulesCertificate
      ?.clientSuppliedCapacityUsageReleaseOrZoneAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) {
    fail("SUPPLY_POOL_PENDING_INVALID");
  }
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_SUPPLY_POOL_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_SUPPLY_POOL_RULES_ACTION_ATOM_IDS],
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
      completeLaterRoundSupplyLifecycleClaimed: false,
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_supply_pool_primitive_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialSupplyPoolRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_SUPPLY_POOL_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    const domain = domainFor(state, options);
    if (String(options.sideKey || state.activeSideKey || "") !== domain.sideKey) {
      fail("SUPPLY_POOL_WRONG_SIDE");
    }
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE,
      executorId: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_SUPPLY_POOL_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialSupplyPoolRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("SUPPLY_POOL_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => (
      entry.choiceId === parameters.choiceId
    ))) {
    fail("SUPPLY_POOL_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return {
    action: {
      actionType: OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE,
      sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
      supplyPoolPlan: {
        schema: "starcraft_tmg_official_supply_pool_rules_plan_v1",
        choiceId: choice.choiceId, planHash: choice.planHash,
        procedureKind: choice.procedureKind,
        pendingHash: state.pendingAction.pendingHash,
      },
      domainId: domain.domainId,
      ruleAtomIds: [...OFFICIAL_SUPPLY_POOL_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: {
        procedureKind: choice.procedureKind,
        resultHash: choice.result.resultHash,
        completeLaterRoundSupplyLifecycleClaimed: false,
        trainingTruth: false,
      },
    },
    canonicalParameters: { choiceId: choice.choiceId },
  };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialSupplyPoolRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SUPPLY_POOL_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_SUPPLY_POOL_RULES_ACTION_ATOM_IDS])) {
    fail("SUPPLY_POOL_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.supplyPoolPlan?.choiceId;
  const expected = instantiateOfficialSupplyPoolRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("SUPPLY_POOL_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const resolution = {
    schema: "starcraft_tmg_official_supply_pool_rules_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash,
    result: clone(choice.result),
    completeLaterRoundSupplyLifecycleClaimed: false,
    clientSuppliedCapacityUsageReleaseOrZoneAccepted: false,
    trainingTruth: false,
  };
  state.lastSupplyPoolRulesResolution = resolution;
  state.supplyPoolRulesHistory = Array.isArray(state.supplyPoolRulesHistory)
    ? state.supplyPoolRulesHistory : [];
  state.supplyPoolRulesHistory.push(clone(resolution));
  const event = {
    type: "supply_pool_rules_resolved", sideKey: pending.sideKey,
    procedureKind: choice.procedureKind, result: clone(resolution),
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    type: "supply_pool_rules_resolution", round: Number(state.round),
    phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false,
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_supply_pool_rules_transition_v1",
    executorId: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SUPPLY_POOL_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_supply_pool_primitive_resolved",
    trainingTruth: false,
  };
}
