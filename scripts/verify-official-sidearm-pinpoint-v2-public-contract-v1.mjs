#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  applyOfficialSidearmPinpointRangedBatchV2,
  enumerateOfficialSidearmPinpointRangedBatchV2,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-sidearm-pinpoint-ranged-batch-executor-v2.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";
import {
  gameplayDataBundle,
  matchBinding,
} from "./verify-official-goliath-scatter-v2-public-contract-v1.mjs";

export { gameplayDataBundle, matchBinding };

const AUTOCANNON = "army_units:goliath::assault::Autocannon";
const HAYWIRE = "army_units:goliath::assault::Haywire Missiles";
const UNDERBELLY = "army_units:goliath::assault::Underbelly Machine Gun";
const ALL_PROFILES = [AUTOCANNON, HAYWIRE, UNDERBELLY];
const BOTH_SIDEARMS = [HAYWIRE, UNDERBELLY];

function action(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function model(id, xInches, yInches, baseWidthInches) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches,
    baseDepthInches: baseWidthInches,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: true,
    isDestroyed: false,
  };
}

function goliath(id, sideKey, xInches, yInches, selectedUpgradeNames = []) {
  return {
    id,
    name: "Goliath",
    sideKey,
    officialUnitRecordKey: "army_units:goliath",
    sourceRecordHash:
      "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16",
    currentModels: 1,
    maxModels: 1,
    currentSupply: 2,
    destroyedModelIds: [],
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames,
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(`${id}-m1`, xInches, yInches, 3.15)],
  };
}

function marine(id, sideKey, xInches, yInches) {
  return {
    id,
    name: "Marine",
    sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash:
      "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    currentModels: 1,
    maxModels: 1,
    currentSupply: 0,
    destroyedModelIds: [],
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(`${id}-m1`, xInches, yInches, 1.26)],
  };
}

export function battleState() {
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    phaseFirstActorByRound: {
      "2:assault": {
        round: 2,
        phase: "assault",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    board: {
      widthInches: 36,
      heightInches: 36,
      missionMarkers: [],
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
      tokens: [],
      markers: [],
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      goliath("p1-goliath", "player1", 5, 5, ["Haywire Missiles"]),
      marine("p1-engager", "player1", 13.465, 5),
      marine("p2-engaged-marine", "player2", 12.205, 5),
      goliath("p2-goliath-a", "player2", 5, 17),
      goliath("p2-goliath-b", "player2", 17, 5),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
  state.officialMissionSetupBinding = createOfficialMissionSetupBindingV1({
    gameplayDataBundle,
    missionDraftReceiptHash: "1".repeat(64),
    deploymentDraftReceiptHash: "2".repeat(64),
    seatColorAssignment: { player1: "red", player2: "blue" },
  });
  return state;
}

const candidates = enumerateOfficialSidearmPinpointRangedBatchV2(battleState(), {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
assert.equal(candidates.length, 20);
assert.equal(candidates.every((candidate) => (
  candidate.executorId === OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID
    && candidate.dataAdapterReceiptHash.length === 64
)), true);
assert.equal(new Set(candidates.map((candidate) => (
  candidate.selectedBatchProfileKeys.join("+")
))).size, 7);
assert.deepEqual([...new Set(candidates.filter((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
)).map((candidate) => candidate.targetId))], ["p2-engaged-marine"]);
assert.equal(candidates.filter((candidate) => (
  [AUTOCANNON, HAYWIRE].includes(candidate.attackProfileKey)
)).every((candidate) => candidate.targetId.startsWith("p2-goliath-")), true);

const first = candidates.find((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
    && JSON.stringify(candidate.selectedBatchProfileKeys) === JSON.stringify(BOTH_SIDEARMS)
));
assert.ok(first);
const afterFirst = applyOfficialSidearmPinpointRangedBatchV2(
  battleState(),
  action(first),
  { matchBinding, postRevision: 1,
    chanceReveals: Array.from({ length: first.chance.count }, () => 1) },
);
assert.equal(afterFirst.sequenceComplete, false);
assert.deepEqual(afterFirst.state.pendingRangedAttackSequence.remainingBatchProfileKeys,
  [HAYWIRE]);
assert.equal(afterFirst.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);
const second = enumerateOfficialSidearmPinpointRangedBatchV2(afterFirst.state, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
}).find((candidate) => candidate.targetId === "p2-goliath-a");
assert.ok(second);
const afterSecond = applyOfficialSidearmPinpointRangedBatchV2(
  afterFirst.state,
  action(second),
  { matchBinding, postRevision: 2,
    chanceReveals: Array.from({ length: second.chance.count }, () => 1) },
);
assert.equal(afterSecond.sequenceComplete, true);
assert.equal(afterSecond.state.pendingRangedAttackSequence, undefined);

const forged = action(candidates.find((candidate) => (
  candidate.attackProfileKey === AUTOCANNON
    && JSON.stringify(candidate.selectedBatchProfileKeys) === JSON.stringify(ALL_PROFILES)
)));
forged.dataAdapterReceiptHash = "0".repeat(64);
assert.throws(() => applyOfficialSidearmPinpointRangedBatchV2(
  battleState(), forged,
  { matchBinding,
    chanceReveals: Array.from({ length: forged.chance.count }, () => 1) },
), /SIDEARM_PINPOINT_V2_ACTION_STALE/u);

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_sidearm_pinpoint_v2_public_contract_v1",
  sourceSnapshotHash: gameplayDataBundle.sourceSnapshotHash,
  datasetHash: gameplayDataBundle.normalizedDatasetHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  candidateCount: candidates.length,
  profileSubsetCount: 7,
  pinpointTargetCount: 1,
  currentBundleRestored: true,
  staleActionRejected: true,
  repositoryFallbackUsed: false,
  silentCompatibilityUsed: false,
  trainingTruth: false,
}, null, 2));
