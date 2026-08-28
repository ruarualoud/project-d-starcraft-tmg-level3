#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCharacteristicStatusKernelV1 } from
  "../packages/rule-atoms/official-characteristic-status-kernel-v1.mjs";
import {
  applyOfficialCleanupRefreshV5 as applyCurrent,
  enumerateOfficialCleanupRefreshActionsV5 as enumerateCurrent,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ID as CURRENT_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_VERSION as CURRENT_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-cleanup-refresh-executor-v5.mjs";
import {
  applyOfficialEndOfRoundEffectsV5,
  enumerateOfficialEndOfRoundEffectsActionsV5,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v5.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS,
} from "../packages/rule-atoms/official-optical-flare-lifecycle-executors-v1.mjs";
import { createOfficialMarineStimpackKernelV1 } from
  "../packages/rule-atoms/official-marine-stimpack-kernel-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);

function executableAction(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

function liveMarine(id, sideKey, xInches) {
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    selectedUpgradeNames: [],
    currentModels: 1,
    maxModels: 7,
    currentSupply: 0,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [{
      id: `${id}-model`,
      xInches,
      yInches: 1,
      isOnField: true,
      isDestroyed: false,
    }],
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

async function officialData() {
  const report = JSON.parse(await readFile(
    path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"),
    "utf8",
  ));
  const firestorePayloads = Object.fromEntries(await Promise.all([
    "army_units",
    "faction_cards",
    "rules_sections",
    "tactical_cards",
  ].map(async (collectionId) => [
    collectionId,
    JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
  ])));
  const dataset = createOfficialCommandCenterDataset({
    snapshot: report.commandSnapshot,
    firestorePayloads,
  });
  return { snapshot: report.commandSnapshot, dataset };
}

const { snapshot, dataset } = await officialData();
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const preEndOfRoundState = {
  schemaVersion: "starcraft_tmg_state_v0",
  round: 2,
  phase: "cleanup",
  activeSideKey: null,
  firstPlayerSideKey: "player1",
  players: {
    player1: { sideKey: "player1", passedPhases: { combat: true } },
    player2: { sideKey: "player2", passedPhases: { combat: true } },
  },
  scores: { player1: 4, player2: 3 },
  officialGameplayDataBundle: gameplayDataBundle,
  officialMissionSetupBinding: missionSetupBinding,
  scoringCleanupProgress: {
    schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
    round: 2,
    completedSteps: [
      "determine_mission_marker_control",
      "score_victory_points",
      "check_end_game_conditions",
    ],
    currentStep: "resolve_end_of_round_effects",
    controlResolutionHash: "3".repeat(64),
    scoringResolutionHash: "4".repeat(64),
    endGameResolutionHash: "5".repeat(64),
    trainingTruth: false,
  },
  board: {
    missionMarkers: [],
    effectMarkers: [],
    tokens: [],
    markers: [],
  },
  cardResources: { player1: [], player2: [] },
  pieces: [
    liveMarine("player1-marine", "player1", 1),
    liveMarine("player2-marine", "player2", 8),
  ],
  firstPassSideByPhase: { combat: "player1" },
  phaseFirstActorByRound: { "2": { combat: "player2" } },
  gameOver: false,
  terminal: false,
  winner: "",
  terminalReason: "",
  log: [],
};
const options = {
  sideKey: "player1",
  matchBinding: { dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle) },
};
const endOfRoundCandidate = enumerateOfficialEndOfRoundEffectsActionsV5(
  preEndOfRoundState,
  options,
)[0];
assert.ok(endOfRoundCandidate);
const state = applyOfficialEndOfRoundEffectsV5(
  preEndOfRoundState,
  executableAction(endOfRoundCandidate),
  options,
).state;

const candidate = enumerateCurrent(state, { ...options, includeDisabled: true })[0];
assert.equal(candidate?.isEnabled, true, JSON.stringify(candidate));
assert.equal(candidate.executorId, CURRENT_EXECUTOR_ID);
assert.equal(candidate.executorVersion, CURRENT_EXECUTOR_VERSION);
const action = executableAction(candidate);
const accepted = applyCurrent(state, action, options);
assert.equal(accepted.ok, true);
assert.equal(accepted.state.scoringCleanupProgress.currentStep, "determine_initiative");

assert.throws(
  () => applyCurrent(state, {
    ...structuredClone(action),
    ruleAtomIds: ["rule-atom:forged-cleanup-lineage"],
  }, options),
  /CLEANUP_REFRESH_V5_ACTION_MISMATCH/u,
);
assert.throws(
  () => applyCurrent(state, {
    ...structuredClone(action),
    callerDiagnostic: "forged",
  }, options),
  /CLEANUP_REFRESH_V5_ACTION_MISMATCH/u,
);
assert.throws(
  () => applyCurrent(state, {
    ...structuredClone(action),
    details: { callerAuthored: true },
  }, options),
  /CLEANUP_REFRESH_V5_ACTION_MISMATCH/u,
);

function cleanupStatusBranch(kind) {
  const statusState = structuredClone(preEndOfRoundState);
  if (kind === "optical_flare") {
    const pair = createOfficialCharacteristicStatusKernelV1().createOpticalFlareStatus({
      round: statusState.round,
      sourceSideKey: "player1",
      sourcePieceId: "player1-marine",
      targetPieceId: "player2-marine",
      abilityResolutionHash: "6".repeat(64),
    });
    statusState.pieces[1].statuses.push(pair.status);
    statusState.board.effectMarkers.push(pair.marker);
  } else {
    const pair = createOfficialMarineStimpackKernelV1().createStatus({
      round: statusState.round,
      sourceSideKey: "player1",
      sourcePieceId: "player1-marine",
      abilityResolutionHash: "7".repeat(64),
    });
    statusState.pieces[0].statuses.push(pair.status);
    statusState.pieces[0].damageMarker = 2;
    statusState.board.effectMarkers.push(pair.marker);
  }
  const eorCandidate = enumerateOfficialEndOfRoundEffectsActionsV5(statusState, options)[0];
  assert.ok(eorCandidate, kind);
  const cleanupState = applyOfficialEndOfRoundEffectsV5(
    statusState,
    executableAction(eorCandidate),
    options,
  ).state;
  const cleanupCandidate = enumerateCurrent(cleanupState, options)[0];
  assert.ok(cleanupCandidate, kind);
  const applied = applyCurrent(
    cleanupState,
    executableAction(cleanupCandidate),
    options,
  );
  return { cleanupCandidate, applied };
}

const optical = cleanupStatusBranch("optical_flare");
assert.deepEqual(optical.cleanupCandidate.ruleAtomIds,
  [...OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ATOM_IDS]);
assert.ok(optical.applied.state.pieces.every((piece) => piece.statuses.length === 0));
assert.equal(optical.applied.state.board.effectMarkers.length, 0);

const stimpack = cleanupStatusBranch("stimpack");
assert.deepEqual(stimpack.cleanupCandidate.ruleAtomIds,
  [...OFFICIAL_CLEANUP_REFRESH_V5_EXECUTOR_ATOM_IDS]);
assert.ok(stimpack.applied.state.pieces.every((piece) => piece.statuses.length === 0));
assert.equal(stimpack.applied.state.board.effectMarkers.length, 0);
assert.equal(stimpack.applied.state.pieces[0].damageMarker, 2);

const wrongSide = enumerateCurrent(state, {
  ...options,
  sideKey: "player2",
  includeDisabled: true,
})[0];
assert.equal(wrongSide.isEnabled, false);
assert.equal(wrongSide.disabledReason, "CLEANUP_REFRESH_V5_FIRST_PLAYER_ONLY");
const unknown = structuredClone(state);
unknown.pieces[0].statuses.push({ schema: "unknown_future_status_v1" });
assert.equal(enumerateCurrent(unknown, options).length, 0);

console.log(JSON.stringify({
  schema: "starcraft_tmg_cleanup_refresh_v5_public_contract_verification_v1",
  acceptancePassed: 12,
  acceptanceTotal: 12,
  currentExecutorId: CURRENT_EXECUTOR_ID,
  currentExecutorVersion: CURRENT_EXECUTOR_VERSION,
  trainingTruth: false,
}, null, 2));
