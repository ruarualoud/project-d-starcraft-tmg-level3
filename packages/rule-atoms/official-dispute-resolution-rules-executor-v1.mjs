import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialDisputeResolutionRulesDataBundleV1 } from
  "../source-data/official-dispute-resolution-rules-data-bundle-v1.mjs";
import {
  createOfficialProvisionalRulingChoicesV1,
  createOfficialSimultaneousEliminationDisputeV1,
  resolveOfficialPostMatchRulingVerificationV1,
  resolveOfficialRulesDisputeRollOffV1,
} from "./official-dispute-resolution-rules-kernel-v1.mjs";

export const OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID =
  "authority.dispute-resolution-rules-v1";
export const OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_DISPUTE_RESOLUTION_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_TYPE =
  "resolve_rules_dispute_procedure";

export const OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-12-9-continue-after-provisional-ruling:0e982d041bc4",
  "rule-atom:singleton:core-12-9-post-match-ruling-verification:45d659d8e2bc",
  "rule-atom:singleton:core-12-9-provisional-ruling-owner:ff5a3f124ebb",
  "rule-atom:singleton:core-12-9-unresolved-dispute-rolloff:0fa3cdc56e75",
].sort());
export const OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_ATOM_IDS =
  OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS;
export const OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_DISPUTE_RESOLUTION_RULES_NEW_ATOM_IDS;

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
function executableAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function validateHash(value, code) {
  if (!/^[a-f0-9]{64}$/u.test(String(value || ""))) fail(code);
  return String(value);
}
function baseContext(state, options = {}) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const scoring = state?.officialScoringFinalizationRulesDataBundle;
  const bundle = state?.officialDisputeResolutionRulesDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("DISPUTE_RESOLUTION_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialDisputeResolutionRulesDataBundleV1(bundle);
  if (bundle.gameplayDataBundleHash !== gameplay.gameplayDataBundleHash
    || bundle.scoringFinalizationRulesDataBundleHash !== scoring?.bundleHash) {
    fail("DISPUTE_RESOLUTION_DATA_LINEAGE_INVALID");
  }
  if (options.matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (options.matchBinding.dataSnapshotHash !== dataHash
      || options.matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("DISPUTE_RESOLUTION_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  const participantIds = Object.keys(state.players || {}).sort();
  if (participantIds.length !== 2) fail("DISPUTE_RESOLUTION_PARTICIPANTS_INVALID");
  return { state, gameplay, scoring, bundle, participantIds };
}
function plan(procedureKind, value = {}) {
  const body = { schema: "starcraft_tmg_official_dispute_resolution_plan_v1",
    procedureKind, ...clone(value), clientSuppliedWholeStateAccepted: false,
    canonicalRulesMutationAllowed: false, trainingTruth: false };
  return { ...body, planHash: hashStarcraftTmgContract(body) };
}
function action(context, procedurePlan, sideKey, chance = null) {
  return { actionType: OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_TYPE,
    sideKey, phase: context.state.phase, pieceId: "",
    disputeResolutionPlan: procedurePlan,
    ...(chance ? { chance } : {}),
    ruleAtomIds: [...OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION };
}
function enabled(row, details = {}) {
  return { ...row, isEnabled: true, disabledReason: "", score: 100,
    details: { ...details, manualAdjudication: true,
      eligibleForTraining: false, trainingTruth: false } };
}
function openDisputeActions(context, options) {
  const state = context.state;
  if (state.pendingRulesDispute || state.pendingProvisionalRuling
    || (state.provisionalRulings || []).some((entry) => !entry.verificationHash)
    || state.gameOver === true || state.terminal === true) return [];
  const dispute = createOfficialSimultaneousEliminationDisputeV1({
    disputeResolutionRulesDataBundle: context.bundle, state });
  if (String(options.sideKey || "") !== dispute.coordinatorSideKey) return [];
  const p = plan("open_simultaneous_elimination_dispute", {
    disputeHash: dispute.disputeHash });
  return [enabled(action(context, p, dispute.coordinatorSideKey), {
    procedureKind: p.procedureKind,
    disputeKind: dispute.disputeKind,
    coordinatorOwnsRuling: false,
    rulingOptionIds: dispute.rulingOptions.map((entry) => entry.optionId),
  })];
}
function rollOffActions(context, options) {
  const dispute = context.state.pendingRulesDispute;
  if (!object(dispute) || context.state.pendingProvisionalRuling) return [];
  validateHash(dispute.disputeHash, "PENDING_RULES_DISPUTE_HASH_INVALID");
  if (String(options.sideKey || "") !== dispute.coordinatorSideKey) return [];
  const attempt = Number(dispute.rollOffAttempt);
  const p = plan("rules_dispute_roll_off", {
    disputeHash: dispute.disputeHash, attempt,
    participantIds: clone(dispute.participantIds) });
  return [enabled(action(context, p, dispute.coordinatorSideKey, {
    kind: "fixed_roll_sequence", faces: 6, count: 4,
    layout: { [dispute.participantIds[0]]: 2, [dispute.participantIds[1]]: 2 },
    revealOrder: dispute.participantIds.flatMap((id) => (
      [`${id}:die:1`, `${id}:die:2`])),
    tiePolicy: context.bundle.disputeContract.tiePolicy,
  }), { procedureKind: p.procedureKind, disputeHash: dispute.disputeHash,
    authorityChanceOnly: true } )];
}
function provisionalRulingActions(context, options) {
  const pending = context.state.pendingProvisionalRuling;
  const dispute = context.state.pendingRulesDispute;
  if (!object(pending) || !object(dispute)) return [];
  if (pending.disputeHash !== dispute.disputeHash
    || String(options.sideKey || "") !== pending.rollOffWinnerSideKey) return [];
  return createOfficialProvisionalRulingChoicesV1({
    disputeResolutionRulesDataBundle: context.bundle,
    dispute, rollOffWinnerSideKey: pending.rollOffWinnerSideKey,
  }).map((choice) => {
    const p = plan("record_provisional_ruling_and_continue", {
      disputeHash: dispute.disputeHash,
      rollOffHash: pending.rollOffHash,
      choice,
    });
    return enabled(action(context, p, pending.rollOffWinnerSideKey), {
      procedureKind: p.procedureKind,
      rulingOwnerSideKey: choice.rulingOwnerSideKey,
      optionId: choice.option.optionId,
      specificInstanceOnly: true,
      continueAfterProvisionalRuling: true,
    });
  });
}
function unverifiedRuling(state) {
  return (state.provisionalRulings || []).find((entry) => !entry.verificationHash) || null;
}
function postMatchVerificationActions(context, options) {
  const state = context.state;
  const ruling = unverifiedRuling(state);
  if (!ruling || (state.gameOver !== true && state.terminal !== true)) return [];
  if (String(options.sideKey || "") !== ruling.verificationCoordinatorSideKey) return [];
  return ["ruling_confirmed", "ruling_corrected", "verification_unresolved"]
    .map((verificationOutcome) => {
      const verification = resolveOfficialPostMatchRulingVerificationV1({
        disputeResolutionRulesDataBundle: context.bundle,
        provisionalRuling: ruling, verificationOutcome });
      const p = plan("record_post_match_ruling_verification", {
        rulingHash: ruling.rulingHash, verificationOutcome,
        verificationHash: verification.verificationHash });
      return enabled(action(context, p, ruling.verificationCoordinatorSideKey), {
        procedureKind: p.procedureKind, rulingHash: ruling.rulingHash,
        verificationOutcome, historicalReceiptRewritten: false,
      });
    });
}

export function enumerateOfficialDisputeResolutionRulesV1(state, options = {}) {
  try {
    const context = baseContext(state, options);
    let rows;
    if (object(state.pendingProvisionalRuling)) {
      rows = provisionalRulingActions(context, options);
    } else if (object(state.pendingRulesDispute)) {
      rows = rollOffActions(context, options);
    } else if (unverifiedRuling(state)) {
      rows = postMatchVerificationActions(context, options);
    } else {
      rows = openDisputeActions(context, options);
    }
    return rows;
  } catch (error) {
    if (options.includeDisabled !== true) return [];
    return [{ actionType: OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey
        || state?.firstPlayerSideKey || ""), phase: String(state?.phase || ""),
      pieceId: "", disputeResolutionPlan: null,
      ruleAtomIds: [...OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0], score: 0,
      details: { eligibleForTraining: false, trainingTruth: false } }];
  }
}

function selectExpected(state, actionInput, options) {
  const rows = enumerateOfficialDisputeResolutionRulesV1(state, {
    ...options, sideKey: actionInput.sideKey, includeDisabled: false });
  const expected = rows.find((row) => row.disputeResolutionPlan?.planHash
    === actionInput.disputeResolutionPlan?.planHash);
  if (!expected || !isDeepStrictEqual(executableAction(expected), actionInput)) {
    fail("DISPUTE_RESOLUTION_ACTION_STALE");
  }
  return expected;
}
function appendResolution(state, actionInput, resolution, events) {
  state.lastDisputeResolutionRulesResolution = clone(resolution);
  state.disputeResolutionRulesHistory =
    Array.isArray(state.disputeResolutionRulesHistory)
      ? state.disputeResolutionRulesHistory : [];
  state.disputeResolutionRulesHistory.push(clone(resolution));
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "dispute_resolution_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actionInput.sideKey,
    action: clone(actionInput), events: clone(events),
    manualAdjudication: true, eligibleForTraining: false, trainingTruth: false });
  state.manualAdjudicationUsed = true;
  state.eligibleForTraining = false;
  state.trainingTruth = false;
}

export function applyOfficialDisputeResolutionRulesV1(stateInput,
  actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_DISPUTE_RESOLUTION_RULES_ACTION_ATOM_IDS])) {
    fail("DISPUTE_RESOLUTION_ACTION_INVALID");
  }
  const expected = selectExpected(stateInput, actionInput, options);
  const context = baseContext(stateInput, options);
  const state = clone(stateInput);
  const procedureKind = actionInput.disputeResolutionPlan.procedureKind;
  let resolution;
  let events;
  if (procedureKind === "open_simultaneous_elimination_dispute") {
    const dispute = createOfficialSimultaneousEliminationDisputeV1({
      disputeResolutionRulesDataBundle: context.bundle, state });
    if (dispute.disputeHash !== actionInput.disputeResolutionPlan.disputeHash) {
      fail("DISPUTE_RESOLUTION_ACTION_STALE");
    }
    state.pendingRulesDispute = clone(dispute);
    resolution = { schema: "starcraft_tmg_official_dispute_resolution_result_v1",
      procedureKind, disputeHash: dispute.disputeHash,
      disputeKind: dispute.disputeKind, nextProcedure: "rules_dispute_roll_off",
      manualAdjudication: true, trainingTruth: false };
    events = [{ type: "unresolved_rules_dispute_opened",
      disputeHash: dispute.disputeHash, disputeKind: dispute.disputeKind,
      coordinatorSideKey: dispute.coordinatorSideKey,
      eligibleForTraining: false, trainingTruth: false }];
  } else if (procedureKind === "rules_dispute_roll_off") {
    const dispute = state.pendingRulesDispute;
    const rollOff = resolveOfficialRulesDisputeRollOffV1({
      disputeResolutionRulesDataBundle: context.bundle,
      participantIds: dispute.participantIds,
      attempt: dispute.rollOffAttempt,
      chanceReveals: options.chanceReveals });
    state.rulesDisputeRollOffHistory = Array.isArray(state.rulesDisputeRollOffHistory)
      ? state.rulesDisputeRollOffHistory : [];
    state.rulesDisputeRollOffHistory.push(clone(rollOff));
    if (rollOff.outcome === "tie") {
      state.pendingRulesDispute = { ...clone(dispute),
        rollOffAttempt: Number(dispute.rollOffAttempt) + 1 };
      const body = without(state.pendingRulesDispute, ["disputeHash"]);
      state.pendingRulesDispute.disputeHash = hashStarcraftTmgContract(body);
    } else {
      state.pendingProvisionalRuling = {
        schema: "starcraft_tmg_official_pending_provisional_ruling_v1",
        disputeHash: dispute.disputeHash,
        rollOffHash: rollOff.rollOffHash,
        rollOffWinnerSideKey: rollOff.winnerSideKey,
        specificInstanceOnly: true,
        eligibleForTraining: false, trainingTruth: false };
    }
    resolution = { schema: "starcraft_tmg_official_dispute_resolution_result_v1",
      procedureKind, disputeHash: dispute.disputeHash, rollOff,
      nextProcedure: rollOff.nextProcedure,
      manualAdjudication: true, trainingTruth: false };
    events = [{ type: rollOff.outcome === "tie"
        ? "rules_dispute_roll_off_tied" : "rules_dispute_roll_off_resolved",
      disputeHash: dispute.disputeHash, rollOffHash: rollOff.rollOffHash,
      winnerSideKey: rollOff.winnerSideKey,
      eligibleForTraining: false, trainingTruth: false }];
  } else if (procedureKind === "record_provisional_ruling_and_continue") {
    const dispute = state.pendingRulesDispute;
    const pending = state.pendingProvisionalRuling;
    const choice = actionInput.disputeResolutionPlan.choice;
    if (choice.disputeHash !== dispute.disputeHash
      || choice.rulingOwnerSideKey !== pending.rollOffWinnerSideKey) {
      fail("PROVISIONAL_RULING_CHOICE_STALE");
    }
    const recordBody = {
      schema: "starcraft_tmg_official_provisional_ruling_record_v1",
      disputeHash: dispute.disputeHash,
      disputeKind: dispute.disputeKind,
      rollOffHash: pending.rollOffHash,
      rulingOwnerSideKey: choice.rulingOwnerSideKey,
      selectedOption: clone(choice.option),
      verificationCoordinatorSideKey: dispute.coordinatorSideKey,
      specificInstanceOnly: true,
      continueAfterProvisionalRuling: true,
      postMatchVerificationRequired: true,
      canonicalRulesMutationAllowed: false,
      manualAdjudication: true,
      eligibleForTraining: false,
      trainingTruth: false,
    };
    const record = { ...recordBody, rulingHash: hashStarcraftTmgContract(recordBody) };
    state.provisionalRulings = Array.isArray(state.provisionalRulings)
      ? state.provisionalRulings : [];
    state.provisionalRulings.push(record);
    delete state.pendingRulesDispute;
    delete state.pendingProvisionalRuling;
    const beforeScores = dispute.specificInstance.beforeScores;
    state.scores = clone(beforeScores);
    if (choice.option.effectKind === "terminal_winner") {
      state.scores[choice.option.winnerSideKey] += Number(choice.option.survivorVpAward);
      state.winner = choice.option.winnerSideKey;
      state.terminalReason = "provisional_ruling_simultaneous_elimination";
    } else if (choice.option.effectKind === "terminal_draw") {
      state.winner = "";
      state.terminalReason = "provisional_ruling_simultaneous_elimination_draw";
    } else {
      fail("PROVISIONAL_RULING_EFFECT_KIND_UNSUPPORTED");
    }
    state.gameOver = true;
    state.terminal = true;
    state.activeSideKey = null;
    state.scoringCleanupProgress = { ...clone(state.scoringCleanupProgress),
      currentStep: "terminal", provisionalRulingHash: record.rulingHash,
      trainingTruth: false };
    resolution = { schema: "starcraft_tmg_official_dispute_resolution_result_v1",
      procedureKind, disputeHash: dispute.disputeHash,
      rulingHash: record.rulingHash,
      rulingOwnerSideKey: record.rulingOwnerSideKey,
      selectedOptionId: record.selectedOption.optionId,
      continuedAfterProvisionalRuling: true,
      terminalOutcome: state.winner || "draw",
      manualAdjudication: true, trainingTruth: false };
    events = [{ type: "provisional_ruling_recorded_and_play_continued",
      disputeHash: dispute.disputeHash, rulingHash: record.rulingHash,
      rulingOwnerSideKey: record.rulingOwnerSideKey,
      selectedOptionId: record.selectedOption.optionId,
      resultingTerminalOutcome: state.winner || "draw",
      eligibleForTraining: false, trainingTruth: false }];
  } else if (procedureKind === "record_post_match_ruling_verification") {
    const ruling = unverifiedRuling(state);
    if (!ruling || ruling.rulingHash !== actionInput.disputeResolutionPlan.rulingHash
      || state.gameOver !== true || state.terminal !== true) {
      fail("POST_MATCH_RULING_VERIFICATION_WINDOW_INVALID");
    }
    const verification = resolveOfficialPostMatchRulingVerificationV1({
      disputeResolutionRulesDataBundle: context.bundle,
      provisionalRuling: ruling,
      verificationOutcome: actionInput.disputeResolutionPlan.verificationOutcome });
    if (verification.verificationHash
      !== actionInput.disputeResolutionPlan.verificationHash) {
      fail("POST_MATCH_RULING_VERIFICATION_STALE");
    }
    ruling.verificationHash = verification.verificationHash;
    state.rulingVerifications = Array.isArray(state.rulingVerifications)
      ? state.rulingVerifications : [];
    state.rulingVerifications.push(clone(verification));
    resolution = { schema: "starcraft_tmg_official_dispute_resolution_result_v1",
      procedureKind, rulingHash: ruling.rulingHash,
      verification, historicalAsPlayedOutcomePreserved: true,
      manualAdjudication: true, trainingTruth: false };
    events = [{ type: "post_match_provisional_ruling_verified",
      rulingHash: ruling.rulingHash,
      verificationHash: verification.verificationHash,
      verificationOutcome: verification.verificationOutcome,
      historicalAsPlayedReceiptRewritten: false,
      eligibleForTraining: false, trainingTruth: false }];
  } else {
    fail("DISPUTE_RESOLUTION_PROCEDURE_KIND_INVALID");
  }
  const resolutionBody = { ...resolution,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    canonicalRulesMutationAccepted: false, eligibleForTraining: false };
  resolution = { ...resolutionBody,
    resolutionHash: hashStarcraftTmgContract(resolutionBody) };
  appendResolution(state, actionInput, resolution, events);
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_dispute_resolution_transition_v1",
    executorId: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISPUTE_RESOLUTION_RULES_EXECUTOR_VERSION,
    state, events, action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_dispute_procedure_with_typed_provisional_ruling_resolved",
    trainingTruth: false };
}
