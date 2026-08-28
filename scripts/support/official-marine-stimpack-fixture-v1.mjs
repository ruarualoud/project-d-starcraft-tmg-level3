import { readFile } from "node:fs/promises";
import path from "node:path";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "../../packages/rule-atoms/official-round-supply-state-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../../packages/source-data/official-gameplay-data-bundle-v1.mjs";

function model(id, xInches, yInches) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: true,
    isDestroyed: false,
  };
}

export async function createOfficialMarineStimpackFixtureV1(input = {}) {
  const root = path.resolve(String(input.root || ""));
  const runtimeHash = String(input.runtimeHash || "");
  const firestoreDir = path.join(
    root,
    "build",
    "source-intake",
    "official-rules",
    "command-center",
    "firestore",
  );
  const basePayloads = Object.fromEntries(await Promise.all([
    "army_units",
    "faction_cards",
    "rules_sections",
    "tactical_cards",
  ].map(async (collectionId) => [
    collectionId,
    JSON.parse(await readFile(path.join(firestoreDir, `${collectionId}.json`), "utf8")),
  ])));
  const driftReport = JSON.parse(await readFile(
    path.join(
      root,
      "build",
      "ticket-11-rule-atoms-v1",
      "official-command-center-community-drift-v2-report.json",
    ),
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
    cleanupCardRecordKeys: ["tactical_cards:academy", "tactical_cards:terran_armed_forces"],
  });

  function record(recordKey) {
    return getOfficialCurrentProductRecord(dataset, recordKey);
  }

  function card(id, sideKey, readiness = "ready") {
    const source = record("tactical_cards:terran_armed_forces");
    return {
      id,
      sideKey,
      officialCardRecordKey: "tactical_cards:terran_armed_forces",
      cardKind: "faction",
      sourceRecordHash: source.sourceRecordHash,
      resource: 1,
      resourceType: "CP",
      readiness,
      face: readiness === "ready" ? "up" : "down",
      activeEffects: [],
    };
  }

  function marine(pieceInput) {
    const source = record("army_units:marine");
    return {
      id: pieceInput.id,
      name: source.payload.name,
      sideKey: pieceInput.sideKey,
      officialUnitRecordKey: "army_units:marine",
      sourceRecordHash: source.sourceRecordHash,
      officialPayloadHash: source.payloadHash,
      currentModels: 1,
      maxModels: 1,
      currentSupply: 0,
      destroyedModelIds: [],
      isOnField: true,
      isInReserves: false,
      isDestroyed: false,
      combatTag: "ground",
      combatTags: ["biological", "ground", "light"],
      statuses: [],
      selectedUpgradeNames: [...(pieceInput.selectedUpgradeNames || [])],
      combatEffects: [],
      assaultEffects: [],
      damageMarker: 0,
      activatedPhases: { movement: false, assault: false, combat: false },
      models: [model(
        `${pieceInput.id}-model`,
        pieceInput.xInches,
        pieceInput.yInches,
      )],
    };
  }

  function battleState(stimpackSide = "player1") {
    const normalSide = stimpackSide === "player1" ? "player2" : "player1";
    const state = {
      schemaVersion: "starcraft_tmg_state_v0",
      round: 2,
      phase: "movement",
      activeSideKey: stimpackSide,
      firstPlayerSideKey: stimpackSide,
      firstPassSideByPhase: {},
      phaseFirstActorByRound: {
        "2:movement": {
          round: 2,
          phase: "movement",
          markerHolderSideKey: stimpackSide,
          chosenFirstActorSideKey: stimpackSide,
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
      cardResources: {
        player1: [card("p1-taf", "player1")],
        player2: [card("p2-taf", "player2")],
      },
      pieces: [
        marine({
          id: `${stimpackSide}-stimpack-marine`,
          sideKey: stimpackSide,
          xInches: 2,
          yInches: 5,
          selectedUpgradeNames: ["Stimpack"],
        }),
        marine({
          id: `${normalSide}-normal-marine`,
          sideKey: normalSide,
          xInches: 20,
          yInches: 5,
        }),
      ],
      gameOver: false,
      terminal: false,
      winner: "",
      terminalReason: "",
      log: [],
    };
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
      state,
      gameplayDataBundle,
      rulesRuntimeHash: runtimeHash,
    });
    state.startOfRoundHistory = [{
      round: 2,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
    }];
    return state;
  }

  return { snapshot, dataset, gameplayDataBundle, battleState };
}
