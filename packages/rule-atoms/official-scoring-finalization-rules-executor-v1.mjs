import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialScoringFinalizationRulesDataBundleV1 } from
  "../source-data/official-scoring-finalization-rules-data-bundle-v1.mjs";
import { deriveOfficialBattlefieldMarkerViewsV1 } from
  "./official-battlefield-token-marker-rules-kernel-v1.mjs";
import { resolveOfficialFinalReserveDestructionV1 } from
  "./official-reserve-lifecycle-rules-kernel-v1.mjs";
import {
  createOfficialInitialFirstPlayerAssignmentChoicesV1,
  resolveOfficialArmyEliminationV1,
  resolveOfficialInitialFirstPlayerRollOffV1,
  resolveOfficialRoundLimitFinalScoreV1,
} from "./official-scoring-finalization-rules-kernel-v1.mjs";

export const OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID =
  "authority.scoring-finalization-rules-v1";
export const OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_SCORING_FINALIZATION_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE =
  "resolve_scoring_finalization_rules_procedure";

export const OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:round-one-first-player-assignment",
  "rule-atom:singleton:core-11-first-player-marker-definition:b91df1325f67",
  "rule-atom:singleton:core-11-first-player-marker-transfer-timing:bbb700cb2417",
  "rule-atom:singleton:core-11-initial-first-player-marker-assignment:e4ad6170454b",
  "rule-atom:singleton:core-12-6-control-supply-step:7bd4906aecf0",
  "rule-atom:singleton:core-12-6-control-tie-contested:440f5350445f",
  "rule-atom:singleton:core-12-6-higher-control-total:db050b31a5f0",
  "rule-atom:singleton:core-6-2-marker-control:f832dbd83fb0",
  "rule-atom:singleton:core-8-10-highest-vp-winner:aa3dbd3a25ab",
  "rule-atom:singleton:core-8-10-mission-score-total:d211a95f7761",
  "rule-atom:singleton:core-8-10-tiebreaker-and-draw:41184b7bed03",
  "rule-atom:singleton:core-8-9-3-army-elimination-terminal:55b652e42766",
  "rule-atom:singleton:core-8-9-3-round-limit-terminal:da87c7b7f16b",
  "rule-atom:singleton:core-8-9-3-survivor-vp-award:c9f136bdf880",
].sort());
export const OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_ATOM_IDS =
  OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS;
export const OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_SCORING_FINALIZATION_RULES_NEW_ATOM_IDS;

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
function baseContext(state, options = {}) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const bundle = state?.officialScoringFinalizationRulesDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("SCORING_FINALIZATION_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialScoringFinalizationRulesDataBundleV1(bundle);
  if (bundle.gameplayDataBundleHash !== gameplay.gameplayDataBundleHash
    || bundle.reserveLifecycleDataBundleHash
      !== state.officialReserveLifecycleDataBundle?.bundleHash
    || bundle.battlefieldTokenMarkerRulesDataBundleHash
      !== state.officialBattlefieldTokenMarkerRulesDataBundle?.bundleHash) {
    fail("SCORING_FINALIZATION_DATA_LINEAGE_INVALID");
  }
  if (options.matchBinding) {
    const dataHash = hashStarcraftTmgContract(gameplay);
    if (options.matchBinding.dataSnapshotHash !== dataHash
      || options.matchBinding.dependencies?.dataSnapshot?.contentHash !== dataHash) {
      fail("SCORING_FINALIZATION_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  const participantIds = Object.keys(state.players || {}).sort();
  if (participantIds.length !== 2) fail("SCORING_FINALIZATION_PARTICIPANTS_INVALID");
  return { state, bundle, gameplay, participantIds };
}
function setupStage(state) {
  return String(state?.officialBattlefieldSetup?.stage || "");
}
function rollOffAttempt(state) {
  return (state.initialFirstPlayerRollOffHistory || []).length + 1;
}
function plan(procedureKind, value = {}) {
  const body = { schema: "starcraft_tmg_official_scoring_finalization_plan_v1",
    procedureKind, ...clone(value), clientSuppliedRuleResultAccepted: false,
    trainingTruth: false };
  return { ...body, planHash: hashStarcraftTmgContract(body) };
}
function action(context, procedurePlan, sideKey, chance = null) {
  return { actionType: OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE,
    sideKey, phase: context.state.phase, pieceId: "",
    scoringFinalizationPlan: procedurePlan,
    ...(chance ? { chance } : {}),
    ruleAtomIds: [...OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION };
}
function rollOffActions(context, options) {
  const state = context.state;
  if (state.rulesProcedureMode !== true || state.pendingAction
    || state.phase !== "pre_game"
    || setupStage(state)
      !== "battlefield_token_marker_registry_complete_ticket_11_slice_110_pending") {
    return [];
  }
  const sideKey = context.participantIds[0];
  if (String(options.sideKey || state.activeSideKey || "") !== sideKey) return [];
  const attempt = rollOffAttempt(state);
  const p = plan("initial_first_player_roll_off", { attempt,
    participantIds: context.participantIds,
    setupBindingHash: state.officialBattlefieldTokenMarkerRegistry?.registryHash || null });
  return [{ ...action(context, p, sideKey, { kind: "fixed_roll_sequence", faces: 6,
    count: 4, layout: { [context.participantIds[0]]: 2,
      [context.participantIds[1]]: 2 },
    revealOrder: context.participantIds.flatMap((id) => [`${id}:die:1`, `${id}:die:2`]),
    tiePolicy: context.bundle.firstPlayerContract.tiePolicy }),
  isEnabled: true, disabledReason: "", score: 100,
  details: { procedureKind: p.procedureKind, authorityChanceOnly: true,
    visualScaleAffectsRulesGeometry: false, trainingTruth: false } }];
}
function assignmentActions(context, options) {
  const state = context.state;
  if (state.rulesProcedureMode !== true || state.pendingAction
    || state.phase !== "pre_game"
    || setupStage(state) !== "initial_first_player_roll_off_complete_assignment_pending"
    || !object(state.initialFirstPlayerAssignmentPending)) return [];
  const winner = state.initialFirstPlayerAssignmentPending.rollOffWinnerSideKey;
  if (String(options.sideKey || state.activeSideKey || "") !== winner) return [];
  return createOfficialInitialFirstPlayerAssignmentChoicesV1({
    scoringFinalizationRulesDataBundle: context.bundle,
    participantIds: context.participantIds, rollOffWinnerSideKey: winner,
  }).map((choice) => {
    const p = plan("assign_initial_first_player_marker", { choice,
      rollOffHash: state.initialFirstPlayerAssignmentPending.rollOffHash });
    return { ...action(context, p, winner), isEnabled: true, disabledReason: "",
      score: 100, details: { procedureKind: p.procedureKind,
        assignedFirstPlayerSideKey: choice.assignedFirstPlayerSideKey,
        winnerMayAssignEitherParticipant: true, trainingTruth: false } };
  });
}
function reserveResolution(context) {
  const state = context.state;
  const existing = state.finalReserveDestructionLedger;
  if (object(existing)) {
    if (existing.consumedByFinalScoringSlice110 !== false
      || existing.ledgerHash !== hashStarcraftTmgContract(without(existing, ["ledgerHash"]))) {
      fail("FINAL_RESERVE_DESTRUCTION_LEDGER_INVALID");
    }
    const vpBySide = Object.fromEntries(context.participantIds.map((sideKey) => [sideKey,
      existing.entries.filter((entry) => entry.creditedEnemySideKey === sideKey)
        .reduce((sum, entry) => sum + Number(entry.destroyedEnemySupplyVp || 0), 0)]));
    return { existing: true, entries: clone(existing.entries),
      destroyedEnemySupplyVpBySide: vpBySide, mutation: null,
      resultHash: existing.ledgerHash };
  }
  return { existing: false, ...resolveOfficialFinalReserveDestructionV1({
    procedureKind: "final_scoring_reserve_destruction",
    state, reserveLifecycleDataBundle: state.officialReserveLifecycleDataBundle,
    unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle,
    rulesOwnedStateRequested: true, finalScoringPhaseStart: true,
    gameEndingByRoundLimit: true, specialVictoryAlreadyEnded: false,
  }) };
}
function cleanupActions(context, options) {
  const state = context.state;
  if (state.phase !== "cleanup" || state.pendingAction
    || state.gameOver === true || state.terminal === true
    || String(options.sideKey || "") !== String(state.firstPlayerSideKey || "")) return [];
  const progress = state.scoringCleanupProgress;
  if (!object(progress) || progress.round !== Number(state.round)) return [];
  if (Number(state.round) === context.bundle.terminalContract.roundLimit
    && progress.currentStep === "score_victory_points") {
    const reserve = reserveResolution(context);
    const resolution = resolveOfficialRoundLimitFinalScoreV1({
      scoringFinalizationRulesDataBundle: context.bundle, state,
      finalReserveVpBySide: reserve.destroyedEnemySupplyVpBySide,
    });
    const p = plan("round_limit_final_scoring", {
      controlResolutionHash: progress.controlResolutionHash,
      finalReserveResultHash: reserve.resultHash,
      finalScoreResolutionHash: resolution.finalScoreResolutionHash,
      finalReserveExistingLedger: reserve.existing,
    });
    return [{ ...action(context, p, state.firstPlayerSideKey),
      isEnabled: true, disabledReason: "", score: 100,
      details: { procedureKind: p.procedureKind,
        finalScoreResolution: clone(resolution),
        reserveResolution: clone(reserve),
        rulesGeometryUnit: "inch", frontendPixelsConsumed: false,
        trainingTruth: false } }];
  }
  if (progress.currentStep === "check_end_game_conditions") {
    const resolution = resolveOfficialArmyEliminationV1({
      scoringFinalizationRulesDataBundle: context.bundle, state });
    if (!resolution.terminal) return [];
    const p = plan("army_elimination_terminal", {
      eliminationResolutionHash: resolution.eliminationResolutionHash });
    return [{ ...action(context, p, state.firstPlayerSideKey),
      isEnabled: true, disabledReason: "", score: 110,
      details: { procedureKind: p.procedureKind,
        eliminationResolution: clone(resolution), trainingTruth: false } }];
  }
  return [];
}

export function enumerateOfficialScoringFinalizationRulesV1(state, options = {}) {
  try {
    const context = baseContext(state, options);
    const rows = [...rollOffActions(context, options),
      ...assignmentActions(context, options), ...cleanupActions(context, options)];
    return rows;
  } catch (error) {
    if (options.includeDisabled !== true) return [];
    return [{ actionType: OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey
        || state?.firstPlayerSideKey || ""), phase: String(state?.phase || ""), pieceId: "",
      scoringFinalizationPlan: null,
      ruleAtomIds: [...OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0], score: 0,
      details: { trainingTruth: false } }];
  }
}

function selectExpected(state, actionInput, options) {
  const rows = enumerateOfficialScoringFinalizationRulesV1(state, {
    ...options, sideKey: actionInput.sideKey, includeDisabled: false });
  const expected = rows.find((row) => row.scoringFinalizationPlan?.planHash
    === actionInput.scoringFinalizationPlan?.planHash);
  if (!expected || !isDeepStrictEqual(executableAction(expected), actionInput)) {
    fail("SCORING_FINALIZATION_ACTION_STALE");
  }
  return expected;
}
function applyPiecePatches(state, patches) {
  for (const patch of patches || []) {
    const piece = state.pieces.find((entry) => entry?.id === patch.pieceId);
    if (!piece || hashStarcraftTmgContract(piece) !== patch.expectedBeforePieceHash) {
      fail("SCORING_FINALIZATION_RESERVE_PATCH_STALE", String(patch.pieceId || ""));
    }
    Object.assign(piece, clone(patch.set || {}));
    for (const field of patch.deleteFields || []) delete piece[field];
    for (const modelPatch of patch.modelPatches || []) {
      const model = piece.models?.find((entry) => entry?.id === modelPatch.modelId);
      if (!model) fail("SCORING_FINALIZATION_RESERVE_MODEL_PATCH_STALE");
      Object.assign(model, clone(modelPatch.set || {}));
      for (const field of modelPatch.deleteFields || []) delete model[field];
    }
  }
}
function appendResolution(state, actionInput, resolution, events) {
  state.lastScoringFinalizationRulesResolution = clone(resolution);
  state.scoringFinalizationRulesHistory =
    Array.isArray(state.scoringFinalizationRulesHistory)
      ? state.scoringFinalizationRulesHistory : [];
  state.scoringFinalizationRulesHistory.push(clone(resolution));
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "scoring_finalization_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actionInput.sideKey,
    action: clone(actionInput), events: clone(events), trainingTruth: false });
}

export function applyOfficialScoringFinalizationRulesV1(stateInput,
  actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_SCORING_FINALIZATION_RULES_ACTION_ATOM_IDS])) {
    fail("SCORING_FINALIZATION_ACTION_INVALID");
  }
  const expected = selectExpected(stateInput, actionInput, options);
  const context = baseContext(stateInput, options);
  const state = clone(stateInput);
  const procedureKind = actionInput.scoringFinalizationPlan.procedureKind;
  let resolution; let events;
  if (procedureKind === "initial_first_player_roll_off") {
    const rollOff = resolveOfficialInitialFirstPlayerRollOffV1({
      scoringFinalizationRulesDataBundle: context.bundle,
      participantIds: context.participantIds,
      attempt: actionInput.scoringFinalizationPlan.attempt,
      chanceReveals: options.chanceReveals });
    state.initialFirstPlayerRollOffHistory =
      Array.isArray(state.initialFirstPlayerRollOffHistory)
        ? state.initialFirstPlayerRollOffHistory : [];
    state.initialFirstPlayerRollOffHistory.push(clone(rollOff));
    if (rollOff.outcome === "winner") {
      state.initialFirstPlayerAssignmentPending = {
        schema: "starcraft_tmg_official_initial_first_player_assignment_pending_v1",
        rollOffWinnerSideKey: rollOff.winnerSideKey,
        rollOffHash: rollOff.rollOffHash, trainingTruth: false };
      state.activeSideKey = rollOff.winnerSideKey;
      state.officialBattlefieldSetup = { ...clone(state.officialBattlefieldSetup),
        stage: "initial_first_player_roll_off_complete_assignment_pending" };
    }
    resolution = { schema: "starcraft_tmg_official_scoring_finalization_resolution_v1",
      procedureKind, rollOff, setupStageAfter: setupStage(state),
      trainingTruth: false };
    events = [{ type: rollOff.outcome === "tie"
        ? "initial_first_player_roll_off_tied"
        : "initial_first_player_roll_off_resolved",
      rollOffHash: rollOff.rollOffHash, winnerSideKey: rollOff.winnerSideKey,
      nextProcedure: rollOff.nextProcedure, trainingTruth: false }];
  } else if (procedureKind === "assign_initial_first_player_marker") {
    const choice = actionInput.scoringFinalizationPlan.choice;
    state.firstPlayerSideKey = choice.assignedFirstPlayerSideKey;
    state.activeSideKey = choice.assignedFirstPlayerSideKey;
    delete state.initialFirstPlayerAssignmentPending;
    state.officialBattlefieldMarkerViewsAtSetup = deriveOfficialBattlefieldMarkerViewsV1({
      registry: state.officialBattlefieldTokenMarkerRegistry,
      pieces: state.pieces,
      missionMarkers: state.officialMissionMarkerPlacement.missionMarkers,
      firstPlayerSideKey: state.firstPlayerSideKey });
    state.officialBattlefieldSetup = { ...clone(state.officialBattlefieldSetup),
      stage: "scoring_finalization_rules_complete_ticket_11_slice_111_pending",
      initialFirstPlayerSideKey: state.firstPlayerSideKey,
      firstPlayerMarkerViewHash: state.officialBattlefieldMarkerViewsAtSetup.viewHash };
    resolution = { schema: "starcraft_tmg_official_scoring_finalization_resolution_v1",
      procedureKind, rollOffWinnerSideKey: choice.winnerSideKey,
      assignedFirstPlayerSideKey: choice.assignedFirstPlayerSideKey,
      firstPlayerMarkerViewHash: state.officialBattlefieldMarkerViewsAtSetup.viewHash,
      setupStageAfter: setupStage(state), trainingTruth: false };
    events = [{ type: "initial_first_player_marker_assigned",
      assignedBySideKey: choice.winnerSideKey,
      firstPlayerSideKey: choice.assignedFirstPlayerSideKey,
      markerViewHash: resolution.firstPlayerMarkerViewHash, trainingTruth: false }];
  } else if (procedureKind === "army_elimination_terminal") {
    const elimination = expected.details.eliminationResolution;
    state.scores = clone(elimination.resultingScores);
    state.gameOver = true; state.terminal = true;
    state.winner = elimination.survivingSideKey;
    state.terminalReason = elimination.terminalReason;
    state.activeSideKey = null;
    state.scoringCleanupProgress = { ...clone(state.scoringCleanupProgress),
      currentStep: "terminal", eliminationResolutionHash:
        elimination.eliminationResolutionHash, trainingTruth: false };
    resolution = { schema: "starcraft_tmg_official_scoring_finalization_resolution_v1",
      procedureKind, elimination, outcome: "winner",
      winnerSideKey: elimination.survivingSideKey, trainingTruth: false };
    events = [{ type: "army_elimination_game_end",
      winnerSideKey: elimination.survivingSideKey,
      survivorVpAward: elimination.survivorVpAward,
      finalScore: clone(state.scores), trainingTruth: false }];
  } else if (procedureKind === "round_limit_final_scoring") {
    const reserve = expected.details.reserveResolution;
    if (!reserve.existing) {
      applyPiecePatches(state, reserve.mutation.piecePatches);
      const body = { schema: "starcraft_tmg_official_final_reserve_destruction_ledger_v1",
        round: Number(state.round), entries: clone(reserve.entries),
        entryDenominatorComplete: true,
        consumedByFinalScoringSlice110: true, trainingTruth: false };
      state.finalReserveDestructionLedger = { ...body,
        ledgerHash: hashStarcraftTmgContract(body) };
    } else {
      const body = without(clone(state.finalReserveDestructionLedger), ["ledgerHash"]);
      body.consumedByFinalScoringSlice110 = true;
      state.finalReserveDestructionLedger = { ...body,
        ledgerHash: hashStarcraftTmgContract(body) };
    }
    const finalScore = expected.details.finalScoreResolution;
    state.scores = clone(finalScore.resultingScores);
    state.gameOver = true; state.terminal = true;
    state.winner = finalScore.winnerSideKey || "";
    state.terminalReason = finalScore.terminalReason;
    state.activeSideKey = null;
    state.scoringCleanupProgress = { ...clone(state.scoringCleanupProgress),
      completedSteps: [...new Set([...(state.scoringCleanupProgress.completedSteps || []),
        "score_victory_points", "check_end_game_conditions"])],
      currentStep: "terminal",
      finalScoreResolutionHash: finalScore.finalScoreResolutionHash,
      trainingTruth: false };
    resolution = { schema: "starcraft_tmg_official_scoring_finalization_resolution_v1",
      procedureKind, finalReserveResultHash: reserve.resultHash,
      finalScore, outcome: finalScore.outcome,
      winnerSideKey: finalScore.winnerSideKey, trainingTruth: false };
    events = [{ type: "round_limit_final_score_game_end",
      outcome: finalScore.outcome, winnerSideKey: finalScore.winnerSideKey,
      finalScore: clone(finalScore.resultingScores),
      finalReserveUnitIds: reserve.entries.map((entry) => entry.pieceId).sort(),
      trainingTruth: false }];
  } else {
    fail("SCORING_FINALIZATION_PROCEDURE_KIND_INVALID");
  }
  const resolutionBody = { ...resolution,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    frontendPixelGeometryAccepted: false };
  resolution = { ...resolutionBody,
    resolutionHash: hashStarcraftTmgContract(resolutionBody) };
  appendResolution(state, actionInput, resolution, events);
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_scoring_finalization_transition_v1",
    executorId: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_SCORING_FINALIZATION_RULES_EXECUTOR_VERSION,
    state, events, action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_first_player_control_terminal_and_final_score_resolved",
    trainingTruth: false };
}
