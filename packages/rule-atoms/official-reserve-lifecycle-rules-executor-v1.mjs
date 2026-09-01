import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialReserveLifecycleDataBundleV1 } from
  "../source-data/official-reserve-lifecycle-data-bundle-v1.mjs";
import { verifyOfficialUnitCardSupplyDataBundleV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "./official-round-supply-state-v1.mjs";
import {
  officialReserveLifecycleProcedureKindsV1,
  resolveOfficialReserveLifecycleProcedureV1,
} from "./official-reserve-lifecycle-rules-kernel-v1.mjs";

export const OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID =
  "authority.reserve-lifecycle-rules-v1";
export const OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_RESERVE_LIFECYCLE_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE =
  "resolve_reserve_lifecycle_procedure";
export const OFFICIAL_RESERVE_LIFECYCLE_RULES_PARAMETER_KIND =
  "official_reserve_lifecycle_choice_v1";
export const OFFICIAL_RESERVE_LIFECYCLE_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_reserve_lifecycle_pending_v1";

export const OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-reserves-definition:def5ecfde71d",
  "rule-atom:singleton:core-11-reserves-initial-state:56ccf0eeb9dc",
  "rule-atom:singleton:core-11-reserves-loadout-retention:c4b9ac534d94",
  "rule-atom:singleton:core-11-reserves-return-and-final-round:99a13b38d53a",
  "rule-atom:singleton:core-11-reserves-targeting-restriction:32c878cbc68b",
  "rule-atom:singleton:core-11-zone-of-influence-post-arrival:ac58e480793b",
  "rule-atom:singleton:core-8-10-final-reserve-destruction:c5770b3cff2e",
  "rule-atom:singleton:core-8-3-army-starts-in-reserves:769363d5e7ac",
  "rule-atom:singleton:core-8-5-5-left-token-removal:056f5f9896f8",
  "rule-atom:singleton:core-8-5-5-redeploy-abilities-resume:fc4316abdc36",
  "rule-atom:singleton:core-8-5-5-reserve-abilities-inactive:68e1286b3f4c",
  "rule-atom:singleton:core-8-5-5-reserve-activation-retained:bc4bfa3a14dd",
  "rule-atom:singleton:core-8-5-5-reserve-damage-retained:6aed35c2189a",
  "rule-atom:singleton:core-8-5-5-reserve-equipment-retained:d3d695aca513",
  "rule-atom:singleton:core-8-5-5-reserve-supply-release:7fae40b37bb5",
  "rule-atom:singleton:core-8-5-5-reserve-timed-effects-continue:f1e841504ed2",
  "rule-atom:singleton:core-8-5-5-return-to-reserves-definition:7c966e2f77f9",
].sort());
export const OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_ATOM_IDS =
  OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS;
export const OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_RESERVE_LIFECYCLE_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialReserveLifecycleProcedureKindsV1());

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
  const reserve = state?.officialReserveLifecycleDataBundle;
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
    fail("RESERVE_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialReserveLifecycleDataBundleV1(reserve);
  verifyOfficialUnitCardSupplyDataBundleV1(unitSupply);
  if (matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dataSnapshotHash !== dataHash
      || matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("RESERVE_LIFECYCLE_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return { reserve, unitSupply };
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey, players: state.players,
    pieces: state.pieces, board: state.board,
    officialRoundSupplyState: state.officialRoundSupplyState || null,
    reserveLifecycleHistory: state.reserveLifecycleHistory || [],
    finalReserveDestructionLedger: state.finalReserveDestructionLedger || null,
    log: state.log || [],
    officialReserveLifecycleDataBundle: state.officialReserveLifecycleDataBundle,
    officialUnitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialReserveLifecycleRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const { reserve, unitSupply } = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.rulesDenominatorComplete !== true
    || procedure.clientSuppliedMutation !== undefined) {
    fail("RESERVE_LIFECYCLE_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const kernelInput = {
    ...clone(procedure), sideKey, state,
    reserveLifecycleDataBundle: reserve,
    unitCardSupplyDataBundle: unitSupply,
    rulesOwnedStateRequested: true,
  };
  const resolved = resolveOfficialReserveLifecycleProcedureV1(kernelInput);
  const planBody = {
    schema: "starcraft_tmg_official_reserve_lifecycle_plan_v1",
    procedureKind, sideKey,
    procedureContextHash: hashStarcraftTmgContract(without(kernelInput, [
      "state", "reserveLifecycleDataBundle", "unitCardSupplyDataBundle",
    ])),
    result: resolved,
  };
  const plan = { ...planBody, planHash: hashStarcraftTmgContract(planBody) };
  const body = {
    schema: OFFICIAL_RESERVE_LIFECYCLE_RULES_PENDING_SCHEMA,
    stage: "confirm_rules_owned_reserve_lifecycle_transition",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: [{ ...plan, choiceId: `reserve-lifecycle-${plan.planHash}` }],
    rulesCertificate: {
      rulesDenominatorComplete: true,
      registryAuthority: "official_reserve_lifecycle_rules_kernel_v1",
      stateMutationDerivedOnlyByRulesKernel: true,
      loadoutDamageTimedEffectsAndActivationRetained: true,
      reserveAbilitiesInactiveAndPostArrivalAbilitiesResume: true,
      finalReserveDestructionLedgerRulesOwned: true,
      scoringCommitDeferredToSlice110: true,
      frozenReserveDeployV5OwnsArrivalGeometry: true,
      clientSuppliedMutationAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    reserveLifecycleDataBundleHash: reserve.bundleHash,
    unitCardSupplyDataBundleHash: unitSupply.bundleHash,
    stateProjectionHash: "", sourceRefreshPerformed: false,
    repositoryFallbackUsed: false, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const { reserve, unitSupply } = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_RESERVE_LIFECYCLE_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.reserveLifecycleDataBundleHash !== reserve.bundleHash
    || pending.unitCardSupplyDataBundleHash !== unitSupply.bundleHash
    || pending.choices?.length !== 1
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.stateMutationDerivedOnlyByRulesKernel !== true
    || pending.rulesCertificate
      ?.loadoutDamageTimedEffectsAndActivationRetained !== true
    || pending.rulesCertificate
      ?.reserveAbilitiesInactiveAndPostArrivalAbilitiesResume !== true
    || pending.rulesCertificate?.finalReserveDestructionLedgerRulesOwned !== true
    || pending.rulesCertificate?.scoringCommitDeferredToSlice110 !== true
    || pending.rulesCertificate?.frozenReserveDeployV5OwnsArrivalGeometry !== true
    || pending.rulesCertificate?.clientSuppliedMutationAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false || pending.trainingTruth !== false) {
    fail("RESERVE_LIFECYCLE_PENDING_INVALID");
  }
  const choice = pending.choices[0];
  if (choice.planHash !== hashStarcraftTmgContract(without(choice, [
    "planHash", "choiceId",
  ]))
    || choice.choiceId !== `reserve-lifecycle-${choice.planHash}`
    || choice.result?.resultHash !== hashBody(choice.result, "resultHash")) {
    fail("RESERVE_LIFECYCLE_PENDING_INVALID");
  }
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_RESERVE_LIFECYCLE_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind, choices: clone(pending.choices),
      scoringCommitDeferredToSlice110: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_reserve_lifecycle_state_transition",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialReserveLifecycleRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_RESERVE_LIFECYCLE_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    const domain = domainFor(state, options);
    if (String(options.sideKey || state.activeSideKey || "") !== domain.sideKey) {
      fail("RESERVE_LIFECYCLE_WRONG_SIDE");
    }
    parameterDomains.push(domain);
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE,
      executorId: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialReserveLifecycleRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("RESERVE_LIFECYCLE_PARAMETER_DOMAIN_STALE");
  }
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || parameters.choiceId !== expected.constraints.choices[0].choiceId) {
    fail("RESERVE_LIFECYCLE_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices[0];
  return {
    action: {
      actionType: OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE,
      sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
      reserveLifecyclePlan: {
        schema: "starcraft_tmg_official_reserve_lifecycle_action_plan_v1",
        choiceId: choice.choiceId, planHash: choice.planHash,
        procedureKind: choice.procedureKind,
        pendingHash: state.pendingAction.pendingHash,
      },
      domainId: domain.domainId,
      ruleAtomIds: [...OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { procedureKind: choice.procedureKind,
        resultHash: choice.result.resultHash,
        scoringCommitDeferredToSlice110: true, trainingTruth: false },
    },
    canonicalParameters: { choiceId: choice.choiceId },
  };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function applyPiecePatch(state, patch) {
  const piece = state.pieces.find((entry) => entry?.id === patch.pieceId);
  if (!piece || hashStarcraftTmgContract(piece) !== patch.expectedBeforePieceHash) {
    fail("RESERVE_LIFECYCLE_MUTATION_STALE", patch.pieceId);
  }
  Object.assign(piece, clone(patch.set || {}));
  for (const field of patch.deleteFields || []) delete piece[field];
  for (const modelPatch of patch.modelPatches || []) {
    const model = piece.models?.find((entry) => entry?.id === modelPatch.modelId);
    if (!model) fail("RESERVE_LIFECYCLE_MODEL_PATCH_STALE", modelPatch.modelId);
    Object.assign(model, clone(modelPatch.set || {}));
    for (const field of modelPatch.deleteFields || []) delete model[field];
  }
}
function removeExactArtifacts(entries, ids, code) {
  const remove = new Set(ids || []);
  if (remove.size !== (ids || []).length
    || [...remove].some((id) => !entries.some((entry) => entry?.id === id))) {
    fail(code);
  }
  return entries.filter((entry) => !remove.has(entry.id));
}
function runtimeHash(state, options) {
  const value = String(options.matchBinding?.rulesRuntimeBinding?.runtimeHash
    || state.officialRoundSupplyState?.rulesRuntimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    fail("RESERVE_LIFECYCLE_RUNTIME_HASH_REQUIRED");
  }
  return value;
}
function applyMutation(state, mutation, options) {
  for (const patch of mutation.piecePatches || []) applyPiecePatch(state, patch);
  state.board.tokens = removeExactArtifacts(state.board.tokens,
    mutation.removeBoardTokenIds || [], "RESERVE_LIFECYCLE_TOKEN_PATCH_STALE");
  state.board.effectMarkers = removeExactArtifacts(state.board.effectMarkers,
    mutation.removeEffectMarkerIds || [], "RESERVE_LIFECYCLE_MARKER_PATCH_STALE");
  if ((mutation.piecePatches || []).length > 0
    && Number(state.round) >= 2 && object(state.officialRoundSupplyState)) {
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
      state, gameplayDataBundle: state.officialGameplayDataBundle,
      rulesRuntimeHash: runtimeHash(state, options),
    });
  }
  if (Array.isArray(mutation.finalReserveDestructionLedgerEntries)) {
    const body = {
      schema: "starcraft_tmg_official_final_reserve_destruction_ledger_v1",
      round: Number(state.round), entries: clone(
        mutation.finalReserveDestructionLedgerEntries),
      entryDenominatorComplete: true, consumedByFinalScoringSlice110: false,
      trainingTruth: false,
    };
    state.finalReserveDestructionLedger = { ...body,
      ledgerHash: hashStarcraftTmgContract(body) };
  }
}

export function applyOfficialReserveLifecycleRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_RESERVE_LIFECYCLE_RULES_ACTION_ATOM_IDS])) {
    fail("RESERVE_LIFECYCLE_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.reserveLifecyclePlan?.choiceId;
  const expected = instantiateOfficialReserveLifecycleRulesV1(
    stateInput, domain, { choiceId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("RESERVE_LIFECYCLE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices[0];
  const state = clone(stateInput);
  state.pendingAction = null;
  const supplyBefore = state.officialRoundSupplyState?.roundSupplyStateHash || null;
  applyMutation(state, choice.result.mutation, options);
  const supplyAfter = state.officialRoundSupplyState?.roundSupplyStateHash || null;
  const resolution = {
    schema: "starcraft_tmg_official_reserve_lifecycle_resolution_v1",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    planHash: choice.planHash, result: clone(choice.result),
    roundSupplyStateHashBefore: supplyBefore,
    roundSupplyStateHashAfter: supplyAfter,
    stateMutationDerivedOnlyByRulesKernel: true,
    scoringCommitDeferredToSlice110:
      choice.procedureKind === "final_scoring_reserve_destruction",
    trainingTruth: false,
  };
  state.lastReserveLifecycleResolution = resolution;
  state.reserveLifecycleHistory = Array.isArray(state.reserveLifecycleHistory)
    ? state.reserveLifecycleHistory : [];
  state.reserveLifecycleHistory.push(clone(resolution));
  const eventTypes = {
    army_initial_reserves: "army_units_moved_to_initial_reserves",
    return_to_reserves: "unit_returned_to_reserves",
    reserve_targeting_restriction: "reserve_targeting_restriction_resolved",
    post_arrival_state: "reserve_post_arrival_state_resolved",
    final_scoring_reserve_destruction: "final_reserve_units_destroyed",
  };
  const event = {
    type: eventTypes[choice.procedureKind], sideKey: pending.sideKey,
    procedureKind: choice.procedureKind, resultHash: choice.result.resultHash,
    affectedPieceIds: (choice.result.mutation.piecePatches || [])
      .map((entry) => entry.pieceId).sort(),
    roundSupplyStateHashBefore: supplyBefore,
    roundSupplyStateHashAfter: supplyAfter,
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "reserve_lifecycle_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_reserve_lifecycle_transition_v1",
    executorId: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_LIFECYCLE_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_reserve_lifecycle_state_transition_resolved",
    trainingTruth: false,
  };
}
