#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAxisAlignedFullCoverTerrainV1 } from
  "../packages/rule-atoms/official-bounded-full-cover-los-kernel-v1.mjs";
import {
  applyOfficialGoliathScatterRangedBatchV2,
  enumerateOfficialGoliathScatterRangedBatchV2,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-goliath-scatter-ranged-batch-executor-v2.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build/source-intake/official-rules/command-center/firestore",
);
const liveReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
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
export const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:goliath", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
  reserveDeployData: true,
});
export const matchBinding = {
  bindingHash: "7".repeat(64),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: "8".repeat(64) },
};

const AUTOCANNON = "army_units:goliath::assault::Autocannon";
const SCATTER = "army_units:goliath::assault::Scatter Missiles";
const UNDERBELLY = "army_units:goliath::assault::Underbelly Machine Gun";
const ALL_PROFILES = [AUTOCANNON, SCATTER, UNDERBELLY];

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

function unit(input) {
  const goliath = input.recordKey === "army_units:goliath";
  return {
    id: input.id,
    name: goliath ? "Goliath" : "Marine",
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: goliath
      ? "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16"
      : "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    sizeCharacteristic: goliath ? 3 : 1,
    currentModels: 1,
    maxModels: 1,
    currentSupply: goliath ? 2 : 0,
    destroyedModelIds: [],
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: input.statuses || [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: input.upgrades || [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(
      `${input.id}-m1`, input.xInches, input.yInches, goliath ? 3.15 : 1.26,
    )],
  };
}

export function battleState() {
  const terrain = createOfficialAxisAlignedFullCoverTerrainV1({
    id: "full-cover-wall",
    xInches: 12,
    yInches: 18,
    widthInches: 4,
    heightInches: 12,
    effectiveSize: 3,
  });
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    phaseFirstActorByRound: {
      "2:assault": { round: 2, phase: "assault", markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1" },
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
      terrain: [terrain],
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
      unit({ id: "p1-goliath", sideKey: "player1",
        recordKey: "army_units:goliath", xInches: 4, yInches: 18,
        upgrades: ["Scatter Missiles"] }),
      unit({ id: "p2-goliath-a", sideKey: "player2",
        recordKey: "army_units:goliath", xInches: 4, yInches: 28 }),
      unit({ id: "p2-goliath-b", sideKey: "player2",
        recordKey: "army_units:goliath", xInches: 4, yInches: 8 }),
      unit({ id: "p2-marine-stationary", sideKey: "player2",
        recordKey: "army_units:marine", xInches: 22, yInches: 18,
        statuses: ["stationary"] }),
      unit({ id: "p2-marine-moved", sideKey: "player2",
        recordKey: "army_units:marine", xInches: 28, yInches: 18 }),
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

function protectedHash(state) {
  return hashStarcraftTmgContract({
    scores: state.scores,
    missionMarkers: state.board.missionMarkers,
    effectMarkers: state.board.effectMarkers,
    selectedUpgradeNames: state.pieces.map((piece) => piece.selectedUpgradeNames),
    statuses: state.pieces.map((piece) => piece.statuses),
    officialGameplayDataBundle: state.officialGameplayDataBundle,
    officialMissionSetupBinding: state.officialMissionSetupBinding,
    terminal: state.terminal,
    gameOver: state.gameOver,
    winner: state.winner,
    terminalReason: state.terminalReason,
  });
}

assert.equal(liveReport.commandSnapshot.snapshotHash,
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61");
assert.equal(dataset.datasetHash,
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "bf09bd38b9984cb8f1dbc1f6e83d6ad8d436c469433f05ce1af33ba9636f8133");
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);

const initialState = battleState();
const initialProtected = protectedHash(initialState);
const initialBatches = enumerateOfficialGoliathScatterRangedBatchV2(initialState, {
  sideKey: "player1", matchBinding, throwOnError: true,
});
assert.equal(initialBatches.length, 32);
assert.equal(initialBatches.every((candidate) => (
  candidate.executorId === OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID
    && candidate.dataAdapterReceiptHash.length === 64
)), true);
assert.equal(new Set(initialBatches.map((candidate) => (
  candidate.selectedBatchProfileKeys.join("+")
))).size, 7);

const stationary = initialBatches.find((candidate) => (
  candidate.attackProfileKey === SCATTER
    && candidate.targetId === "p2-marine-stationary"
    && candidate.selectedBatchProfileKeys.length === 1
));
assert.ok(stationary);
assert.equal(stationary.lineOfSightStatus, "blocked_by_full_cover");
assert.equal(stationary.indirectFireUsed, true);
assert.equal(stationary.lockedInAdditionalRateOfAttack, 6);
assert.equal(stationary.effectiveRateOfAttack, 12);
const single = applyOfficialGoliathScatterRangedBatchV2(
  initialState,
  action(stationary),
  { matchBinding, postRevision: 1,
    chanceReveals: Array.from({ length: stationary.chance.count }, () => 1) },
);
assert.equal(single.sequenceComplete, true);
assert.equal(single.dataAdapterReceipt.silentCompatibilityAllowed, false);
assert.equal(single.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);
assert.equal(protectedHash(single.state), initialProtected);

const forged = action(stationary);
forged.dataAdapterReceiptHash = "0".repeat(64);
assert.throws(() => applyOfficialGoliathScatterRangedBatchV2(
  initialState,
  forged,
  { matchBinding,
    chanceReveals: Array.from({ length: stationary.chance.count }, () => 1) },
), /GOLIATH_SCATTER_V2_ACTION_STALE/u);

const fullFirst = initialBatches.find((candidate) => (
  candidate.attackProfileKey === SCATTER
    && candidate.targetId === "p2-marine-stationary"
    && candidate.selectedBatchProfileKeys.join("|") === ALL_PROFILES.join("|")
));
assert.ok(fullFirst);
const first = applyOfficialGoliathScatterRangedBatchV2(
  battleState(),
  action(fullFirst),
  { matchBinding,
    chanceReveals: Array.from({ length: fullFirst.chance.count }, () => 1) },
);
assert.equal(first.sequenceComplete, false);
assert.deepEqual(first.state.pendingRangedAttackSequence.remainingBatchProfileKeys,
  [AUTOCANNON, UNDERBELLY]);
const secondCandidate = enumerateOfficialGoliathScatterRangedBatchV2(first.state, {
  sideKey: "player1", matchBinding, throwOnError: true,
}).find((candidate) => (
  candidate.attackProfileKey === AUTOCANNON && candidate.targetId === "p2-goliath-a"
));
assert.ok(secondCandidate);
const second = applyOfficialGoliathScatterRangedBatchV2(
  first.state,
  action(secondCandidate),
  { matchBinding,
    chanceReveals: Array.from({ length: secondCandidate.chance.count }, () => 1) },
);
assert.equal(second.sequenceComplete, false);
const thirdCandidate = enumerateOfficialGoliathScatterRangedBatchV2(second.state, {
  sideKey: "player1", matchBinding, throwOnError: true,
}).find((candidate) => (
  candidate.attackProfileKey === UNDERBELLY && candidate.targetId === "p2-goliath-b"
));
assert.ok(thirdCandidate);
const third = applyOfficialGoliathScatterRangedBatchV2(
  second.state,
  action(thirdCandidate),
  { matchBinding,
    chanceReveals: Array.from({ length: thirdCandidate.chance.count }, () => 1) },
);
assert.equal(third.sequenceComplete, true);
assert.equal(third.state.pendingRangedAttackSequence, undefined);
assert.equal(third.state.pieces[0].activatedPhases.assault, true);

const drifted = battleState();
drifted.officialGameplayDataBundle = {
  ...structuredClone(drifted.officialGameplayDataBundle),
  gameplayDataBundleHash: "0".repeat(64),
};
assert.deepEqual(enumerateOfficialGoliathScatterRangedBatchV2(drifted, {
  sideKey: "player1", matchBinding,
}), []);

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_goliath_scatter_v2_public_contract_v1",
  sourceSnapshotHash: liveReport.commandSnapshot.snapshotHash,
  datasetHash: dataset.datasetHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  candidateCount: initialBatches.length,
  profileSubsetCount: 7,
  sequentialBatchLengths: [1, 2, 3],
  currentBundleRestored: true,
  staleActionRejected: true,
  repositoryFallbackUsed: false,
  silentCompatibilityUsed: false,
  trainingTruth: false,
}, null, 2));
