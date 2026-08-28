#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialMissionMarkerControlV3,
  enumerateOfficialMissionMarkerControlActionsV3,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v3.mjs";
import {
  createOfficialSupplyLossLedgerV1,
} from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  applyOfficialVictoryPointScoringV2,
  enumerateOfficialVictoryPointScoringActionsV2,
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
  "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55";

function marker(number, controlSideKey = null) {
  return {
    id: `mission-marker-${number}`,
    number,
    xInches: 5 + ((number - 1) * 10),
    yInches: 6,
    diameterMillimeters: 32,
    elevation: "ground",
    isActivated: true,
    controlSideKey,
    factionIndicatorSideKey: controlSideKey,
  };
}

function state(gameplayDataBundle, missionSetupBinding, supplyLossLedger) {
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
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    supplyLossLedger,
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
        marker(1, "player1"),
        marker(2, "player1"),
        marker(3, "player2"),
        marker(4, "player2"),
        marker(5, "player1"),
      ],
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [],
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
const initialState = state(gameplayDataBundle, missionSetupBinding, supplyLossLedger);
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: CURRENT_RUNTIME_HASH },
};

const markerCandidate = enumerateOfficialMissionMarkerControlActionsV3(initialState, {
  sideKey: "player1",
  matchBinding,
})[0];
assert.ok(markerCandidate);
const markerTransition = applyOfficialMissionMarkerControlV3(
  initialState,
  executableAction(markerCandidate),
  { matchBinding, postRevision: 1 },
);

const scoringCandidate = enumerateOfficialVictoryPointScoringActionsV2(
  markerTransition.state,
  { sideKey: "player1", matchBinding },
)[0];
assert.ok(scoringCandidate);
const exactAction = executableAction(scoringCandidate);
assert.doesNotThrow(() => applyOfficialVictoryPointScoringV2(
  markerTransition.state,
  exactAction,
  { matchBinding, postRevision: 2 },
));

const forgedAction = structuredClone(exactAction);
forgedAction.ruleAtomIds = [];
forgedAction.scoringResolution.breakdowns.player1.markerVp = 999;
forgedAction.callerInjectedAuthority = true;
assert.throws(
  () => applyOfficialVictoryPointScoringV2(
    markerTransition.state,
    forgedAction,
    { matchBinding, postRevision: 2 },
  ),
  /VP_SCORING_V2_ACTION_MISMATCH/u,
);
