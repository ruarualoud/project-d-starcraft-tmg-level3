import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialRespawnMorphDataBundleV1 } from
  "../source-data/official-respawn-morph-data-bundle-v1.mjs";
import {
  certifyOfficialRespawnMorphPlanV1,
  officialRespawnMorphProcedureKindsV1,
} from "./official-respawn-morph-rules-kernel-v1.mjs";

export const OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID =
  "authority.respawn-morph-rules-v1";
export const OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_RESPAWN_MORPH_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE =
  "resolve_respawn_morph_rules_procedure";
export const OFFICIAL_RESPAWN_MORPH_RULES_PARAMETER_KIND =
  "official_respawn_morph_rules_choice_v1";
export const OFFICIAL_RESPAWN_MORPH_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_respawn_morph_rules_pending_v1";

export const OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:morph-new-unit-enemy-separation",
  "rule-atom:respawn-enemy-separation",
  "rule-atom:singleton:core-11-morph-activation-lock:8a328b072f42",
  "rule-atom:singleton:core-11-morph-available-supply:332943c395d8",
  "rule-atom:singleton:core-11-morph-placement-and-removal:5c31bf9c3006",
  "rule-atom:singleton:core-11-respawn-base-contact:0cf66ae751af",
  "rule-atom:singleton:core-11-respawn-illegal-placement:a5467bf1bef4",
  "rule-atom:singleton:core-11-respawn-return-destroyed-models:4a93c5e7e4fe",
  "rule-atom:singleton:core-11-respawn-supply-bracket-limit:50e4a224b9e1",
].sort());
export const OFFICIAL_RESPAWN_MORPH_RULES_ACTION_ATOM_IDS =
  OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS;
export const OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialRespawnMorphProcedureKindsV1());
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
  const bundle = state?.officialRespawnMorphDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("RESPAWN_MORPH_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialRespawnMorphDataBundleV1(bundle);
  if (matchBinding) {
    const hash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== hash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== hash) {
      fail("RESPAWN_MORPH_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({ state: without(state, ["pendingAction"]),
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false });
}

export function openOfficialRespawnMorphRulesPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput); const bundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans) || procedure.candidatePlans.length < 1
    || procedure.candidatePlans.length > 64
    || procedure.clientSuppliedMutation !== undefined) {
    fail("RESPAWN_MORPH_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialRespawnMorphPlanV1({ plan, procedureKind,
      respawnMorphDataBundle: bundle })
  )).map((entry) => ({ ...entry, choiceId: `respawn-morph-${entry.planHash}` }))
    .sort((a, b) => a.choiceId.localeCompare(b.choiceId));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("RESPAWN_MORPH_PLAN_ID_DUPLICATE");
  }
  const body = { schema: OFFICIAL_RESPAWN_MORPH_RULES_PENDING_SCHEMA,
    stage: "choose_certified_respawn_morph_plan", round: Number(state.round),
    phase: state.phase, sideKey, procedureKind, choices,
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      registryAuthority: "official_respawn_morph_rules_kernel_v1",
      exactCurrentRespawnCarrierDenominatorBound: true,
      zeroCurrentMorphCarrierDenominatorBound: true,
      respawnSupplyGeometryAndMutationRulesOwned: true,
      fullyDestroyedUnitReturnRemainsForbidden: true,
      clientSuppliedMutationAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    respawnMorphDataBundleHash: bundle.bundleHash, stateProjectionHash: "",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false, trainingTruth: false };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding); const p = state?.pendingAction;
  if (!object(p) || p.schema !== OFFICIAL_RESPAWN_MORPH_RULES_PENDING_SCHEMA
    || p.pendingHash !== hashBody(p, "pendingHash")
    || p.stateProjectionHash !== stateProjection(state, p)
    || p.respawnMorphDataBundleHash !== bundle.bundleHash
    || p.rulesCertificate?.candidatePlansComplete !== true
    || p.rulesCertificate?.rulesDenominatorComplete !== true
    || p.rulesCertificate?.exactCurrentRespawnCarrierDenominatorBound !== true
    || p.rulesCertificate?.zeroCurrentMorphCarrierDenominatorBound !== true
    || p.rulesCertificate?.respawnSupplyGeometryAndMutationRulesOwned !== true
    || p.rulesCertificate?.fullyDestroyedUnitReturnRemainsForbidden !== true
    || p.rulesCertificate?.clientSuppliedMutationAccepted !== false
    || p.sourceRefreshPerformed !== false || p.repositoryFallbackUsed !== false
    || p.trainingTruth !== false) fail("RESPAWN_MORPH_PENDING_INVALID");
  return p;
}
function domainFor(state, options = {}) {
  const p = verifyPending(state, options.matchBinding);
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_RESPAWN_MORPH_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: p.round, phase: p.phase, sideKey: p.sideKey,
    actionType: OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE,
    pieceId: p.choices[0]?.result?.pieceId || "",
    executorId: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_RESPAWN_MORPH_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: p.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: p.pendingHash, stateProjectionHash: p.stateProjectionHash,
      procedureKind: p.procedureKind, choices: clone(p.choices),
      clientSuppliedMutationAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_respawn_morph_rules_owned_transition", trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialRespawnMorphRulesV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "");
  const candidates = []; const parameterDomains = [];
  try {
    const domain = domainFor(state, options);
    if (sideKey !== domain.sideKey) fail("RESPAWN_MORPH_WRONG_SIDE");
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE, sideKey,
      phase: state?.phase || "", pieceId: "",
      executorId: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_RESPAWN_MORPH_RULES_ACTION_ATOM_IDS], isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0], score: 0,
      details: { trainingTruth: false } });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialRespawnMorphRulesV1(state, domain, parameters,
  options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("RESPAWN_MORPH_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("RESPAWN_MORPH_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId));
  return { action: { actionType: OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase,
    pieceId: choice.result.pieceId || "",
    respawnMorphRulesPlan: { schema: "starcraft_tmg_official_respawn_morph_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId, ruleAtomIds: [...OFFICIAL_RESPAWN_MORPH_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash, trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function applyMutation(state, mutation) {
  for (const patch of mutation?.piecePatches || []) {
    const piece = state.pieces.find((entry) => entry.id === patch.pieceId);
    if (!piece || hashStarcraftTmgContract(piece) !== patch.expectedBeforePieceHash) {
      fail("RESPAWN_MORPH_MUTATION_STALE", String(patch.pieceId || ""));
    }
    Object.assign(piece, clone(patch.set || {}));
  }
}

export function applyOfficialRespawnMorphRulesV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RESPAWN_MORPH_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_RESPAWN_MORPH_RULES_ACTION_ATOM_IDS])) {
    fail("RESPAWN_MORPH_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.respawnMorphRulesPlan?.choiceId;
  const expected = instantiateOfficialRespawnMorphRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("RESPAWN_MORPH_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  applyMutation(state, choice.result.mutation);
  const resolution = { schema: "starcraft_tmg_official_respawn_morph_rules_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash, result: clone(choice.result),
    clientSuppliedMutationAccepted: false, trainingTruth: false };
  state.lastRespawnMorphRulesResolution = resolution;
  state.respawnMorphRulesHistory = Array.isArray(state.respawnMorphRulesHistory)
    ? state.respawnMorphRulesHistory : [];
  state.respawnMorphRulesHistory.push(clone(resolution));
  const event = { type: "respawn_morph_rules_resolved", sideKey: pending.sideKey,
    pieceId: choice.result.pieceId || null, procedureKind: choice.procedureKind,
    resultHash: choice.result.resultHash, trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "respawn_morph_rules_resolution", round: Number(state.round),
    phase: state.phase, sideKey: pending.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_respawn_morph_rules_transition_v1",
    executorId: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESPAWN_MORPH_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_respawn_morph_rules_resolved", trainingTruth: false };
}
