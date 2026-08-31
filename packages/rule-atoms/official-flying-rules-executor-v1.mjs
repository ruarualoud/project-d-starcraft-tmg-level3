import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { certifyOfficialFlyingRulePlanV1 } from "./official-flying-rules-kernel-v1.mjs";

export const OFFICIAL_FLYING_RULES_EXECUTOR_ID = "authority.flying-rules-v1";
export const OFFICIAL_FLYING_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_FLYING_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_FLYING_RULES_ACTION_TYPE = "resolve_flying_rules_procedure";
export const OFFICIAL_FLYING_RULES_PARAMETER_KIND = "official_flying_rules_choice_v1";
export const OFFICIAL_FLYING_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_flying_rules_pending_v1";

export const OFFICIAL_FLYING_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:flight-stand-bottom-is-measurement-base",
  "rule-atom:flying-base-pass-through",
  "rule-atom:flying-charge-and-charged-prohibition",
  "rule-atom:flying-cover-and-line-of-sight-effective-size",
  "rule-atom:flying-cover-effective-size",
  "rule-atom:flying-enemy-endpoint-separation",
  "rule-atom:flying-engagement-and-endpoint-restrictions",
  "rule-atom:flying-high-ground-cover-prohibition",
  "rule-atom:flying-line-of-sight-and-cover-composite",
  "rule-atom:flying-movement-path-permissions",
  "rule-atom:flying-retained-direct-cover-and-dead-zone",
  "rule-atom:singleton:core-11-flying-combat-phase-prohibition:603862c33dba",
  "rule-atom:singleton:core-11-flying-cover-and-effective-size-summary:fa785c63e755",
  "rule-atom:singleton:core-11-flying-grass-endpoint-removal:0b20baf2fc62",
  "rule-atom:singleton:core-11-flying-grass-interaction:c57c210c7cc2",
  "rule-atom:singleton:core-11-flying-grass-passover-exception:fd3a638a8ea3",
  "rule-atom:singleton:core-11-flying-horizontal-point-to-point-movement:dcae652cf6d7",
  "rule-atom:singleton:core-11-flying-terrain-movement-immunity:93c27353a4a8",
  "rule-atom:singleton:core-11-flying-tradeoff-summary:de17740f24f1",
  "rule-atom:singleton:core-4-4-flying-coherency-links:46c89297fd45",
  "rule-atom:singleton:core-7-1-3-flying-origin:51a7ee48c826",
  "rule-atom:singleton:core-7-1-4-flying-effective-size:3a74628e46b0",
  "rule-atom:singleton:core-7-1-4-flying-ignore-full-cover:14db6521cbe3",
  "rule-atom:singleton:core-8-5-3-flying-grass-interaction:96deb4b3cb2c",
].sort());
export const OFFICIAL_FLYING_RULES_ACTION_ATOM_IDS = OFFICIAL_FLYING_RULES_NEW_ATOM_IDS;
export const OFFICIAL_FLYING_RULES_EXECUTOR_ATOM_IDS = OFFICIAL_FLYING_RULES_NEW_ATOM_IDS;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function verifySourceLock(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle?.repositoryFallbackAllowed !== false || bundle?.trainingTruth !== false) {
    fail("FLYING_SOURCE_LOCK_BINDING_INVALID");
  }
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    pieces: (state.pieces || []).map((piece) => without(piece, [
      "usedActiveAbilities", "usedReactions", "selectedUpgrades", "abilities",
    ])),
    board: without(state.board || {}, ["centerMarkers"]),
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialFlyingRulesPendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  verifySourceLock(state);
  const procedureKind = String(procedure.procedureKind || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !["move", "cover_check"].includes(procedureKind)
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("FLYING_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  if (!activePiece(actor)
    || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)) {
    fail("FLYING_ACTOR_INVALID");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialFlyingRulePlanV1({ state, actor, plan, procedureKind })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("FLYING_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_FLYING_RULES_PENDING_SCHEMA,
    stage: "choose_certified_flying_rules_plan",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `flying-rules-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true, rulesDenominatorComplete: true,
      geometryAuthority: "official_flying_rules_kernel_v1",
      currentOfficialMovableFlyingCarrierAvailable: false,
      productionQuarantined: true },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    stateProjectionHash: "", productionQuarantined: true, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}
function verifyPending(state) {
  verifySourceLock(state);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_FLYING_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("FLYING_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_FLYING_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_FLYING_RULES_ACTION_TYPE, pieceId: pending.actorUnitId,
    executorId: OFFICIAL_FLYING_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_FLYING_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_FLYING_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      productionQuarantined: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_flying_movement_cover_and_participation_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
export function enumerateOfficialFlyingRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_FLYING_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_FLYING_RULES_ACTION_TYPE,
      executorId: OFFICIAL_FLYING_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_FLYING_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_FLYING_RULES_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}
export function instantiateOfficialFlyingRulesV1(state, domain, parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("FLYING_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => entry.choiceId === parameters.choiceId)) {
    fail("FLYING_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId
  ));
  const leading = choice.procedureKind === "move"
    ? choice.placements.find((entry) => entry.modelId === choice.leadingModelId) : null;
  return { action: {
    actionType: OFFICIAL_FLYING_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: expected.pieceId,
    ...(leading ? { to: { xInches: inches(leading.xMilliInches),
      yInches: inches(leading.yMilliInches) } } : {}),
    flyingRulesPlan: { schema: "starcraft_tmg_official_flying_rules_plan_v1",
      choiceId: choice.choiceId, planHash: choice.planHash,
      procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_FLYING_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_FLYING_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_FLYING_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: { choiceId: choice.choiceId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
export function applyOfficialFlyingRulesV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_FLYING_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_FLYING_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_FLYING_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_FLYING_RULES_ACTION_ATOM_IDS])) fail("FLYING_ACTION_INVALID");
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.flyingRulesPlan?.choiceId;
  const expected = instantiateOfficialFlyingRulesV1(
    stateInput, domain, { choiceId }, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("FLYING_ACTION_STALE");
  }
  const pending = verifyPending(stateInput);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const state = clone(stateInput); state.pendingAction = null;
  const actor = state.pieces.find((piece) => piece.id === pending.actorUnitId);
  if (choice.procedureKind === "move") {
    for (const placement of choice.placements) {
      const model = actor.models.find((entry) => entry.id === placement.modelId);
      model.xInches = inches(placement.xMilliInches);
      model.yInches = inches(placement.yMilliInches);
    }
    for (const terrainId of choice.grass.removedAtEndpointTerrainIds) {
      const terrain = state.board.terrain.find((entry) => entry.id === terrainId);
      terrain.isRemoved = true;
      terrain.removedBy = { rule: "flying_endpoint_on_grass", actorUnitId: actor.id,
        round: Number(state.round), phase: state.phase };
    }
  }
  const result = {
    schema: "starcraft_tmg_official_flying_rules_resolution_v1",
    actorUnitId: actor.id, procedureKind: choice.procedureKind,
    planId: choice.planId, planHash: choice.planHash,
    ...(choice.procedureKind === "move" ? {
      leadingModelId: choice.leadingModelId, movementType: choice.movementType,
      horizontalPointToPointDistance: choice.horizontalPointToPointDistance,
      measurementBases: clone(choice.measurementBases), placements: clone(choice.placements),
      coherencyLinks: clone(choice.coherencyLinks), transit: clone(choice.transit),
      endpoint: clone(choice.endpoint), grass: clone(choice.grass),
    } : { targetUnitId: choice.targetUnitId, coverResult: clone(choice.coverResult) }),
    restrictions: clone(choice.restrictions),
    currentOfficialMovableFlyingCarrierAvailable: false,
    productionQuarantined: true, trainingTruth: false,
  };
  state.lastFlyingRulesResolution = result;
  const event = { type: "flying_rules_resolved", sideKey: actor.sideKey,
    actorUnitId: actor.id, procedureKind: choice.procedureKind,
    result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "flying_rules_resolution", round: Number(state.round),
    phase: state.phase, sideKey: actor.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_flying_rules_transition_v1",
    executorId: OFFICIAL_FLYING_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_FLYING_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_flying_movement_cover_and_participation_resolved",
    trainingTruth: false };
}
