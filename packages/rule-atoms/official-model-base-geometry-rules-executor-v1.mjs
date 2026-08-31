import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialModelBaseGeometryDataBundleV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { certifyOfficialModelBaseGeometryPlanV1 } from
  "./official-model-base-geometry-rules-kernel-v1.mjs";

export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID =
  "authority.model-base-geometry-rules-v1";
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE =
  "resolve_model_base_geometry_rules_procedure";
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PARAMETER_KIND =
  "official_model_base_geometry_rules_choice_v1";
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_model_base_geometry_rules_pending_v1";

export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-leading-model-nomination-duration:79d886f8c086",
  "rule-atom:singleton:core-11-wholly-within-no-partial-overlap:8e18e5a95777",
  "rule-atom:singleton:core-11-wholly-within-rule-uses:f3eaa7054a7c",
  "rule-atom:singleton:core-11-within-wholly-distinction:6e9f7feec372",
  "rule-atom:singleton:core-2-1-base-rules-interface:27699d591cae",
  "rule-atom:singleton:core-2-1-miniature-aesthetic-exclusion:71e743765645",
  "rule-atom:singleton:core-2-1-model-definition:7f827d3147c0",
  "rule-atom:singleton:core-2-2-cohesion-and-coherency:dedc199f71ba",
  "rule-atom:singleton:core-2-3-base-rules-interface:5632a46a8f63",
  "rule-atom:singleton:core-2-3-correct-base-size:1384122400d1",
  "rule-atom:singleton:core-2-3-scenic-customization-boundary:d1c11765f64b",
  "rule-atom:singleton:core-2-3-wobbly-model-position:d968118c812d",
  "rule-atom:singleton:core-4-1-base-contact-zero:5224ead02002",
  "rule-atom:singleton:core-4-1-ignore-overhang:52251fba5736",
  "rule-atom:singleton:core-4-1-measurement-unit:2498caa3eb7d",
  "rule-atom:singleton:core-4-1-model-distance:c61d87a2ca0d",
  "rule-atom:singleton:core-4-1-premeasurement:6c030743f7ac",
  "rule-atom:singleton:core-4-1-token-marker-distance:aeb723978481",
  "rule-atom:singleton:core-4-4-in-coherency-mission-capability:79a5b599e9a1",
  "rule-atom:singleton:core-4-4-placement-link-casualty:1f1f7378357e",
  "rule-atom:unit-wholly-within-definition",
].sort());
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_ATOM_IDS =
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_NEW_ATOM_IDS;
export const OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_MODEL_BASE_GEOMETRY_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = Object.freeze([
  "measurement_check", "within_wholly_within_check",
  "coherency_placement_check", "wobbly_position_agreement",
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
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function hashBody(value, field) {
  return hashStarcraftTmgContract(without(value, [field]));
}
function verifySourceAndData(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const bundle = state?.officialModelBaseGeometryDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("MODEL_BASE_GEOMETRY_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialModelBaseGeometryDataBundleV1(bundle);
  if (matchBinding) {
    const contentHash = matchBinding.dependencies?.geometryArtifact?.contentHash;
    if (contentHash !== hashStarcraftTmgContract(bundle)
      || (matchBinding.geometryArtifactHash !== undefined
        && matchBinding.geometryArtifactHash !== contentHash)) {
      fail("MODEL_BASE_GEOMETRY_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    players: state.players,
    pieces: (state.pieces || []).map((piece) => without(piece, [
      "usedActiveAbilities", "usedReactions", "selectedUpgrades", "abilities",
    ])),
    board: without(state.board || {}, ["centerMarkers"]),
    officialModelBaseGeometryDataBundle: state.officialModelBaseGeometryDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialModelBaseGeometryRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const dataBundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.includes(procedureKind)
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("MODEL_BASE_GEOMETRY_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  if (!activePiece(actor)
    || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)) {
    fail("MODEL_BASE_GEOMETRY_ACTOR_INVALID");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialModelBaseGeometryPlanV1({ state, actor, plan,
      procedureKind, dataBundle })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("MODEL_BASE_GEOMETRY_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PENDING_SCHEMA,
    stage: "choose_certified_model_base_geometry_plan",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `model-base-geometry-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      geometryAuthority: "official_model_base_geometry_rules_kernel_v1",
      officialProfileDenominatorComplete: true,
      supportedOfficialBaseShapes: ["rectangle", "round"],
      currentOfficialBaseGeometryProductionQuarantineLifted: true },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    modelBaseGeometryDataBundleHash: dataBundle.bundleHash,
    stateProjectionHash: "",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}
function verifyPending(state, matchBinding = null) {
  verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.officialProfileDenominatorComplete !== true
    || pending.rulesCertificate?.currentOfficialBaseGeometryProductionQuarantineLifted
      !== true
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) {
    fail("MODEL_BASE_GEOMETRY_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE,
    pieceId: pending.actorUnitId,
    executorId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      currentOfficialBaseGeometryProductionQuarantineLifted: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_model_base_geometry_measurement_and_coherency_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialModelBaseGeometryRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_MODEL_BASE_GEOMETRY_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE,
      executorId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialModelBaseGeometryRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("MODEL_BASE_GEOMETRY_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("MODEL_BASE_GEOMETRY_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  return { action: {
    actionType: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: expected.pieceId,
    modelBaseGeometryRulesPlan: {
      schema: "starcraft_tmg_official_model_base_geometry_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      inCoherency: choice.result.inCoherency ?? null,
      distanceMilliInches: choice.result.distanceMilliInches ?? null,
      currentOfficialBaseGeometryProductionQuarantineLifted: true,
      trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialModelBaseGeometryRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_MODEL_BASE_GEOMETRY_RULES_ACTION_ATOM_IDS])) {
    fail("MODEL_BASE_GEOMETRY_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.modelBaseGeometryRulesPlan?.choiceId;
  const expected = instantiateOfficialModelBaseGeometryRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("MODEL_BASE_GEOMETRY_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const actor = state.pieces.find((piece) => piece.id === pending.actorUnitId);
  if (choice.procedureKind === "coherency_placement_check") {
    for (const placement of choice.result.placements) {
      const model = actor.models.find((entry) => entry.id === placement.modelId);
      model.xInches = inches(placement.footprint.center.xMilliInches);
      model.yInches = inches(placement.footprint.center.yMilliInches);
      model.baseRotationDegrees = placement.footprint.rotationDegrees;
    }
    for (const modelId of choice.result.casualtyModelIds) {
      const model = actor.models.find((entry) => entry.id === modelId);
      model.isDestroyed = true; model.isOnField = false;
      actor.destroyedModelIds = [...new Set([...(actor.destroyedModelIds || []), modelId])]
        .sort();
    }
    actor.currentModels = actor.models.filter((entry) => (
      entry.isDestroyed !== true && entry.isOnField !== false
    )).length;
    actor.coherencyStatus = {
      schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
      status: choice.result.inCoherency ? "in_coherency" : "out_of_coherency",
      isOutOfCoherency: !choice.result.inCoherency,
      checkedAfterRepositioningAction: true,
      leadingModelNominationEnded: true,
      resultHash: choice.result.resultHash,
    };
    delete actor.leadingModelId;
    delete actor.leadingModelNomination;
  } else if (choice.procedureKind === "wobbly_position_agreement") {
    const model = actor.models.find((entry) => entry.id === choice.result.modelId);
    model.xInches = inches(choice.result.agreedPosition.xMilliInches);
    model.yInches = inches(choice.result.agreedPosition.yMilliInches);
    model.baseRotationDegrees = choice.result.agreedPosition.rotationDegrees;
    model.wobblyPositionAgreement = clone(choice.result);
  }
  const result = {
    schema: "starcraft_tmg_official_model_base_geometry_rules_resolution_v1",
    actorUnitId: actor.id, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash,
    result: clone(choice.result),
    currentOfficialBaseGeometryProductionQuarantineLifted: true,
    trainingTruth: false,
  };
  state.lastModelBaseGeometryRulesResolution = result;
  const event = { type: "model_base_geometry_rules_resolved", sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind: choice.procedureKind,
    result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "model_base_geometry_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_model_base_geometry_rules_transition_v1",
    executorId: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_MODEL_BASE_GEOMETRY_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_model_base_geometry_measurement_and_coherency_resolved",
    trainingTruth: false };
}
