import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialPlayerControlRelationshipDataBundleV1 } from
  "../source-data/official-player-control-relationship-data-bundle-v1.mjs";
import { certifyOfficialPlayerControlRelationshipPlanV1 } from
  "./official-player-control-relationship-rules-kernel-v1.mjs";

export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID =
  "authority.player-control-relationship-rules-v1";
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE =
  "resolve_player_control_relationship_rules_procedure";
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PARAMETER_KIND =
  "official_player_control_relationship_rules_choice_v1";
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_player_control_relationship_rules_pending_v1";

export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:active-player-definition",
  "rule-atom:controlling-player-composite-definition",
  "rule-atom:controlling-player-decision-authority",
  "rule-atom:controlling-player-definition",
  "rule-atom:enemy-team-ownership-definition",
  "rule-atom:enemy-unit-basic-definition",
  "rule-atom:singleton:core-11-enemy-targeting-and-rule-use:b66da2d26523",
  "rule-atom:singleton:core-11-friendly-rule-uses:37e356d70193",
  "rule-atom:singleton:core-11-friendly-team-ownership:030d1207d147",
  "rule-atom:singleton:core-11-friendly-unit-self:cf7dc20c0e8d",
  "rule-atom:singleton:core-2-2-army-unit-definition:ac9bd53b4174",
  "rule-atom:singleton:core-2-5-role-taxonomy:5a0f8cdf1fa1",
  "rule-atom:singleton:core-2-5-team-friendly-status:d340419ad805",
  "rule-atom:singleton:core-2-6-2-specific-over-general:ca760c3271ca",
  "rule-atom:transferred-control-owner-equivalence",
].sort());
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_ATOM_IDS =
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_NEW_ATOM_IDS;
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = Object.freeze([
  "attack_target_relationship_check",
  "relationship_query",
  "role_authority_query",
  "rule_precedence_query",
]);

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
  const bundle = state?.officialPlayerControlRelationshipDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("PLAYER_CONTROL_RELATIONSHIP_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialPlayerControlRelationshipDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("PLAYER_CONTROL_RELATIONSHIP_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey,
    players: state.players,
    pieces: (state.pieces || []).map((piece) => ({
      id: piece.id, sideKey: piece.sideKey, ownerSideKey: piece.ownerSideKey,
      controllerSideKey: piece.controllerSideKey,
      models: (piece.models || []).map((model) => ({ id: model.id,
        isOnField: model.isOnField, isDestroyed: model.isDestroyed })),
    })),
    tokens: state.board?.tokens || [],
    cardResources: state.cardResources || {},
    officialRulePrecedenceRegistry: state.officialRulePrecedenceRegistry || null,
    officialPlayerControlRelationshipDataBundle:
      state.officialPlayerControlRelationshipDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialPlayerControlRelationshipRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const dataBundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.includes(procedureKind)
    || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0
    || procedure.candidatePlans.length > 64) {
    fail("PLAYER_CONTROL_RELATIONSHIP_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialPlayerControlRelationshipPlanV1({
      state, plan, procedureKind, dataBundle,
    })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("PLAYER_CONTROL_RELATIONSHIP_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PENDING_SCHEMA,
    stage: "choose_certified_player_control_relationship_plan",
    round: Number(state.round), phase: state.phase, sideKey,
    procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `player-control-relationship-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: {
      candidatePlansComplete: true,
      rulesDenominatorComplete: true,
      relationshipAuthority: "official_player_control_relationship_rules_kernel_v1",
      activePlayerControllerTeamAndPrecedenceComplete: true,
      clientSuppliedRelationshipTruthAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    playerControlRelationshipDataBundleHash: dataBundle.bundleHash,
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
    || pending.schema !== OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.playerControlRelationshipDataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.activePlayerControllerTeamAndPrecedenceComplete !== true
    || pending.rulesCertificate?.clientSuppliedRelationshipTruthAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) {
    fail("PLAYER_CONTROL_RELATIONSHIP_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE,
    pieceId: "",
    executorId: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_ATOM_IDS],
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
      clientSuppliedRelationshipTruthAccepted: false,
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_player_control_relationship_and_precedence_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialPlayerControlRelationshipRulesV1(state,
  options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema
    !== OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    parameterDomains.push(domainFor(state, options));
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE,
      executorId: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialPlayerControlRelationshipRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("PLAYER_CONTROL_RELATIONSHIP_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => (
      entry.choiceId === parameters.choiceId
    ))) {
    fail("PLAYER_CONTROL_RELATIONSHIP_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return { action: {
    actionType: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE,
    sideKey: expected.sideKey,
    phase: expected.phase,
    pieceId: "",
    playerControlRelationshipPlan: {
      schema: "starcraft_tmg_official_player_control_relationship_rules_plan_v1",
      choiceId: choice.choiceId,
      planHash: choice.planHash,
      procedureKind: choice.procedureKind,
      pendingHash: state.pendingAction.pendingHash,
    },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION,
    isEnabled: true,
    disabledReason: "",
    score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.result.resultHash,
      clientSuppliedRelationshipTruthAccepted: false,
      trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialPlayerControlRelationshipRulesV1(stateInput,
  actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_ACTION_ATOM_IDS])) {
    fail("PLAYER_CONTROL_RELATIONSHIP_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.playerControlRelationshipPlan?.choiceId;
  const expected = instantiateOfficialPlayerControlRelationshipRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("PLAYER_CONTROL_RELATIONSHIP_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput);
  state.pendingAction = null;
  const result = {
    schema: "starcraft_tmg_official_player_control_relationship_rules_resolution_v1",
    sideKey: pending.sideKey,
    procedureKind: choice.procedureKind,
    planId: choice.planId,
    planHash: choice.planHash,
    result: clone(choice.result),
    clientSuppliedRelationshipTruthAccepted: false,
    trainingTruth: false,
  };
  state.lastPlayerControlRelationshipRulesResolution = result;
  const event = {
    type: "player_control_relationship_rules_resolved",
    sideKey: pending.sideKey,
    procedureKind: choice.procedureKind,
    result: clone(result),
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "player_control_relationship_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_player_control_relationship_rules_transition_v1",
    executorId: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_player_control_relationship_and_precedence_resolved",
    trainingTruth: false };
}
