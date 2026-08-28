#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialEndOfRoundEffectsV5 as applyCurrent,
  enumerateOfficialEndOfRoundEffectsActionsV5 as enumerateCurrent,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID as CURRENT_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION as CURRENT_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v5.mjs";
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
const state = {
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
  board: { effectMarkers: [] },
  cardResources: { player1: [], player2: [] },
  pieces: [
    liveMarine("player1-marine", "player1", 1),
    liveMarine("player2-marine", "player2", 8),
  ],
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
const candidate = enumerateCurrent(state, { ...options, includeDisabled: true })[0];
assert.equal(candidate?.isEnabled, true, JSON.stringify(candidate));
assert.equal(candidate.executorId, CURRENT_EXECUTOR_ID);
assert.equal(candidate.executorVersion, CURRENT_EXECUTOR_VERSION);
const action = executableAction(candidate);
const accepted = applyCurrent(state, action, options);
assert.equal(accepted.ok, true);

assert.throws(
  () => applyCurrent(state, {
    ...structuredClone(action),
    ruleAtomIds: ["rule-atom:forged-end-of-round-lineage"],
  }, options),
  /END_OF_ROUND_V5_ACTION_MISMATCH/u,
);
assert.throws(
  () => applyCurrent(state, {
    ...structuredClone(action),
    callerDiagnostic: "forged",
  }, options),
  /END_OF_ROUND_V5_ACTION_MISMATCH/u,
);
assert.throws(
  () => applyCurrent(state, {
    ...structuredClone(action),
    details: { callerAuthored: true },
  }, options),
  /END_OF_ROUND_V5_ACTION_MISMATCH/u,
);

console.log(JSON.stringify({
  schema: "starcraft_tmg_end_of_round_effects_v5_public_contract_verification_v1",
  acceptancePassed: 4,
  acceptanceTotal: 4,
  currentExecutorId: CURRENT_EXECUTOR_ID,
  currentExecutorVersion: CURRENT_EXECUTOR_VERSION,
  trainingTruth: false,
}, null, 2));
