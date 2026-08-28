#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialHoldPositionEndGameV2 as applyCurrentEndGame,
  enumerateOfficialHoldPositionEndGameActionsV2 as enumerateCurrentEndGame,
} from "../packages/rule-atoms/official-hold-position-end-game-executor-v2.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v3.mjs";
import {
  createOfficialSupplyLossLedgerV1,
} from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  applyOfficialVictoryPointScoringV2,
  enumerateOfficialVictoryPointScoringActionsV2,
  OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
} from "../packages/rule-atoms/official-victory-point-scoring-executor-v2.mjs";
import {
  createOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import {
  createOfficialMissionSetupBindingV1,
} from "../packages/source-data/official-mission-setup-binding-v1.mjs";

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
const CURRENT_RUNTIME_HASH =
  "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe";

function marker(number, sideKey, controlResolutionHash) {
  return {
    id: `mission-marker-${number}`,
    number,
    xInches: 5 + ((number - 1) * 10),
    yInches: 6,
    diameterMillimeters: 32,
    elevation: "ground",
    isActivated: true,
    controlSideKey: sideKey,
    factionIndicatorSideKey: sideKey,
    controlDeterminedAt: {
      round: 2,
      step: OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
      controlResolutionHash,
    },
  };
}

function liveMarine(id, sideKey, xInches) {
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    formationSize: "small",
    selectedUpgradeNames: [],
    combatTag: "ground",
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
      yInches: 0.63,
      baseShape: "round",
      baseWidthInches: 1.26,
      baseDepthInches: 1.26,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
      isOnField: true,
      isDestroyed: false,
    }],
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

function scoringState(gameplayDataBundle, missionSetupBinding, supplyLossLedger) {
  const controlResolutionHash = hashStarcraftTmgContract({
    kind: "slice-57-public-contract-control-resolution",
    controls: ["player1", "player1", "player2", "player2", "player1"],
  });
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: { combat: "player1" },
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: { player1: 10, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    supplyLossLedger,
    scoringCleanupProgress: {
      schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
      round: 2,
      completedSteps: [OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE],
      currentStep: OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
      controlResolutionHash,
      trainingTruth: false,
    },
    victoryPointScoringHistory: [],
    board: {
      widthInches: 54,
      heightInches: 12,
      missionMarkerControlGeometry: {
        schemaVersion: "starcraft_tmg_mission_marker_control_geometry_v1",
        markerCoordinatesComplete: true,
        markerFootprintsComplete: true,
        markerElevationsComplete: true,
        lineOfSightTerrainComplete: true,
      },
      missionMarkers: [
        marker(1, "player1", controlResolutionHash),
        marker(2, "player1", controlResolutionHash),
        marker(3, "player2", controlResolutionHash),
        marker(4, "player2", controlResolutionHash),
        marker(5, "player1", controlResolutionHash),
      ],
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
      tokens: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      liveMarine("p1-live", "player1", 0.63),
      liveMarine("p2-live", "player2", 53.37),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

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

const liveReport = JSON.parse(await readFile(
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
  snapshot: liveReport.commandSnapshot,
  firestorePayloads,
});
assert.deepEqual(dataset.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
});
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({
    kind: "mission-draft-receipt",
    selectedMissionRecordKey: "faction_cards:mission_hold_position",
  }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({
    kind: "deployment-draft-receipt",
    selectedDeploymentRecordKey: "faction_cards:deployment_no_mans_land",
  }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const supplyLossLedger = createOfficialSupplyLossLedgerV1({
  round: 2,
  rulesRuntimeHash: CURRENT_RUNTIME_HASH,
});
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: CURRENT_RUNTIME_HASH },
};
const beforeScoring = scoringState(
  gameplayDataBundle,
  missionSetupBinding,
  supplyLossLedger,
);
const scoringCandidate = enumerateOfficialVictoryPointScoringActionsV2(
  beforeScoring,
  { sideKey: "player1", matchBinding },
)[0];
assert.ok(scoringCandidate);
const scoringTransition = applyOfficialVictoryPointScoringV2(
  beforeScoring,
  executableAction(scoringCandidate),
  { matchBinding, postRevision: 1 },
);
assert.deepEqual(scoringTransition.state.scores, { player1: 14, player2: 3 });

const candidate = enumerateCurrentEndGame(scoringTransition.state, {
  sideKey: "player1",
  matchBinding,
})[0];
assert.ok(candidate);
const exactAction = executableAction(candidate);
assert.doesNotThrow(() => applyCurrentEndGame(
  scoringTransition.state,
  exactAction,
  { matchBinding, postRevision: 2 },
));

const forgedAction = structuredClone(exactAction);
forgedAction.ruleAtomIds = [];
forgedAction.details = { callerInjectedAuthority: true };
forgedAction.callerInjectedAuthority = true;
assert.throws(
  () => applyCurrentEndGame(
    scoringTransition.state,
    forgedAction,
    { matchBinding, postRevision: 2 },
  ),
  /END_GAME_V2_ACTION_MISMATCH/u,
);
