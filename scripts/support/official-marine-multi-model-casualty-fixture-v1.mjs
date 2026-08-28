import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../../packages/source-data/official-gameplay-data-bundle-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);

function supplyAt(count) {
  if (count <= 3) return 0;
  if (count <= 6) return 1;
  return 2;
}

function model(id, position, active) {
  return {
    id,
    xInches: position.xInches,
    yInches: position.yInches,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: active,
    isDestroyed: !active,
  };
}

function createMarine(dataset, input) {
  const source = getOfficialCurrentProductRecord(dataset, "army_units:marine");
  const positions = input.positions || [];
  const models = Array.from({ length: input.maxModels }, (_, index) => {
    const active = index < input.currentModels;
    const position = positions[index] || {
      xInches: input.baseX + (index * 3),
      yInches: input.baseY,
    };
    return model(`${input.id}-m${index + 1}`, position, active);
  });
  return {
    id: input.id,
    name: source.payload.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash: source.sourceRecordHash,
    officialPayloadHash: source.payloadHash,
    currentModels: input.currentModels,
    maxModels: input.maxModels,
    currentSupply: supplyAt(input.currentModels),
    destroyedModelIds: models.filter((entry) => entry.isDestroyed).map((entry) => entry.id),
    isOnField: true,
    isInReserves: false,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: [...(input.selectedUpgradeNames || [])],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: input.damageMarker || 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models,
  };
}

export async function createOfficialMarineMultiModelCasualtyFixtureV1(input = {}) {
  const basePayloads = Object.fromEntries(await Promise.all([
    "army_units",
    "faction_cards",
    "rules_sections",
    "tactical_cards",
  ].map(async (collectionId) => [
    collectionId,
    JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
  ])));
  const driftReport = JSON.parse(await readFile(
    path.join(OUTPUT_DIR, "official-command-center-community-drift-v2-report.json"),
    "utf8",
  ));
  const firstFactionApplication = applyOfficialCommandCenterFirestoreDelta({
    basePayload: basePayloads.faction_cards,
    delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
  });
  const secondFactionApplication = applyOfficialCommandCenterFirestoreDelta({
    basePayload: firstFactionApplication.firestorePayload,
    delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1,
  });
  const snapshot = driftReport.currentOfficialSnapshot.snapshot;
  const dataset = createOfficialCommandCenterDataset({
    snapshot,
    firestorePayloads: {
      ...basePayloads,
      faction_cards: secondFactionApplication.firestorePayload,
    },
  });
  const gameplayDataBundle = createOfficialGameplayDataBundleV1({
    snapshot,
    dataset,
    unitRecordKeys: ["army_units:medic", "army_units:marine"],
    missionRecordKey: "faction_cards:mission_hold_position",
    cleanupCardRecordKeys: [
      "tactical_cards:academy",
      "tactical_cards:terran_armed_forces",
    ],
  });
  const attackerSideKey = input.attackerSideKey || "player1";
  const defenderSideKey = attackerSideKey === "player1" ? "player2" : "player1";
  const attackerMaxModels = input.attackerMaxModels || 6;
  const attackerCurrentModels = input.attackerCurrentModels || attackerMaxModels;
  const defenderMaxModels = input.defenderMaxModels || 6;
  const defenderCurrentModels = input.defenderCurrentModels || defenderMaxModels;
  const attackerPositions = input.attackerPositions || [
    { xInches: 18.74, yInches: 10 },
    { xInches: 17.48, yInches: 10 },
  ];
  const defenderPositions = input.defenderPositions || [
    { xInches: 20, yInches: 10 },
    { xInches: 22.5, yInches: 10 },
    { xInches: 25, yInches: 10 },
    { xInches: 27.5, yInches: 10 },
    { xInches: 30, yInches: 10 },
    { xInches: 32.5, yInches: 10 },
  ];
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "combat",
    activeSideKey: attackerSideKey,
    firstPlayerSideKey: attackerSideKey,
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      [`2:combat`]: {
        round: 2,
        phase: "combat",
        markerHolderSideKey: attackerSideKey,
        chosenFirstActorSideKey: attackerSideKey,
      },
    },
    players: {
      player1: { sideKey: "player1", faction: "Terran", passedPhases: {} },
      player2: { sideKey: "player2", faction: "Terran", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    activeAbilityUseHistory: [],
    board: {
      widthInches: 54,
      heightInches: 36,
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
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
      createMarine(dataset, {
        id: `${attackerSideKey}-attacker`,
        sideKey: attackerSideKey,
        maxModels: attackerMaxModels,
        currentModels: attackerCurrentModels,
        baseX: 4,
        baseY: 20,
        positions: attackerPositions,
        selectedUpgradeNames: input.attackerUpgradeNames || [],
        damageMarker: input.attackerDamageMarker || 0,
      }),
      createMarine(dataset, {
        id: `${defenderSideKey}-target`,
        sideKey: defenderSideKey,
        maxModels: defenderMaxModels,
        currentModels: defenderCurrentModels,
        baseX: 40,
        baseY: 10,
        positions: defenderPositions,
        selectedUpgradeNames: [],
        damageMarker: input.defenderDamageMarker || 0,
      }),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
  return {
    snapshot,
    dataset,
    gameplayDataBundle,
    state,
    attackerSideKey,
    defenderSideKey,
    attackerPieceId: `${attackerSideKey}-attacker`,
    targetPieceId: `${defenderSideKey}-target`,
    createMatchBinding(runtimeHash) {
      return {
        dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
        rulesRuntimeBinding: { runtimeHash },
      };
    },
  };
}
