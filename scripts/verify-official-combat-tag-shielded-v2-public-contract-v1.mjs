#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialCombatTagShieldedRangedV2,
  enumerateOfficialCombatTagShieldedRangedV2,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-combat-tag-shielded-ranged-executor-v2.mjs";
import { createOfficialCommandCenterDataset, getOfficialCurrentProductRecord } from
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
  unitRecordKeys: [
    "army_units:adept",
    "army_units:goliath",
    "army_units:marine",
    "army_units:stalker",
  ],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
  reserveDeployData: true,
});
export const matchBinding = {
  bindingHash: "7".repeat(64),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: "8".repeat(64) },
};

const UNIT = Object.freeze({
  "army_units:goliath": {
    name: "Goliath", combatTags: ["armoured", "ground", "mechanical"],
    combatTag: "ground", supply: 2, base: 3.15,
  },
  "army_units:marine": {
    name: "Marine", combatTags: ["biological", "ground", "light"],
    combatTag: "ground", supply: 0, base: 1.26,
  },
  "army_units:adept": {
    name: "Adept", combatTags: ["biological", "ground", "light"],
    combatTag: "ground", supply: 0, base: 1.575,
  },
  "army_units:stalker": {
    name: "Stalker", combatTags: ["armoured", "ground", "mechanical"],
    combatTag: "ground", supply: 1, base: 3.15,
  },
  "army_units:point_defense_drone": {
    name: "Point Defense Drone", combatTags: ["armoured", "flying", "mechanical"],
    combatTag: "flying", supply: 0, base: 1.26,
  },
});

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
  const scope = UNIT[input.recordKey];
  const record = getOfficialCurrentProductRecord(dataset, input.recordKey);
  return {
    id: input.id,
    name: scope.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    officialPayloadHash: record.payloadHash,
    sizeCharacteristic: input.recordKey === "army_units:stalker" ? 3 : 1,
    currentModels: 1,
    maxModels: 1,
    currentSupply: scope.supply,
    destroyedModelIds: [],
    isOnField: true,
    isDestroyed: false,
    combatTag: scope.combatTag,
    combatTags: [...scope.combatTags],
    statuses: [...(input.statuses || [])],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: [],
    damageMarker: Number(input.damageMarker || 0),
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(`${input.id}-m1`, input.xInches, input.yInches, scope.base)],
  };
}

export function battleState() {
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
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
      unit({ id: "p1-goliath", sideKey: "player1",
        recordKey: "army_units:goliath", xInches: 4, yInches: 10 }),
      unit({ id: "p1-marine", sideKey: "player1",
        recordKey: "army_units:marine", xInches: 4, yInches: 20 }),
      unit({ id: "p2-adept", sideKey: "player2",
        recordKey: "army_units:adept", xInches: 10, yInches: 10,
        statuses: ["shielded"] }),
      unit({ id: "p2-stalker", sideKey: "player2",
        recordKey: "army_units:stalker", xInches: 10, yInches: 20,
        statuses: ["shielded"] }),
      unit({ id: "p2-pdd", sideKey: "player2",
        recordKey: "army_units:point_defense_drone", xInches: 10, yInches: 15 }),
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

assert.equal(liveReport.commandSnapshot.snapshotHash,
  "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61");
assert.equal(dataset.datasetHash,
  "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "c99e9cda71451e2fffe366c2eaa80a3067ea5beaaa99c0552740da06f95f755b");

const candidates = enumerateOfficialCombatTagShieldedRangedV2(battleState(), {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
assert.equal(candidates.length, 5);
assert.equal(candidates.every((candidate) => (
  candidate.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID
    && candidate.dataAdapterReceiptHash.length === 64
)), true);
const marineAdept = candidates.find((candidate) => (
  candidate.attackProfileKey === "army_units:marine::assault::C-14 rifle"
    && candidate.targetId === "p2-adept"
));
assert.ok(marineAdept);
const applied = applyOfficialCombatTagShieldedRangedV2(
  battleState(),
  action(marineAdept),
  { matchBinding, postRevision: 1,
    chanceReveals: Array.from({ length: marineAdept.chance.count }, () => 1) },
);
assert.equal(applied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  gameplayDataBundle.gameplayDataBundleHash);
assert.equal(applied.dataAdapterReceipt.silentCompatibilityAllowed, false);
const forged = action(marineAdept);
forged.dataAdapterReceiptHash = "0".repeat(64);
assert.throws(() => applyOfficialCombatTagShieldedRangedV2(
  battleState(), forged,
  { matchBinding,
    chanceReveals: Array.from({ length: marineAdept.chance.count }, () => 1) },
), /COMBAT_TAG_SHIELDED_V2_ACTION_STALE/u);

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_combat_tag_shielded_v2_public_contract_v1",
  sourceSnapshotHash: liveReport.commandSnapshot.snapshotHash,
  datasetHash: dataset.datasetHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  candidateCount: candidates.length,
  currentBundleRestored: true,
  staleActionRejected: true,
  repositoryFallbackUsed: false,
  silentCompatibilityUsed: false,
  trainingTruth: false,
}, null, 2));
