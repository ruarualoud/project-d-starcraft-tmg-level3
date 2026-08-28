import { readFile } from "node:fs/promises";
import path from "node:path";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "../../packages/rule-atoms/official-round-supply-state-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../../packages/source-data/official-mission-setup-binding-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../../packages/source-data/official-command-center-snapshot-delta-v1.mjs";

function supplyFor(currentModels) {
  if (currentModels >= 1 && currentModels <= 3) return 0;
  if (currentModels >= 4 && currentModels <= 6) return 1;
  if (currentModels >= 7 && currentModels <= 9) return 2;
  throw new Error("CHARGE_FIXTURE_MODEL_COUNT_UNSUPPORTED");
}

function model(id, point) {
  return {
    id,
    xInches: Number(point.xInches),
    yInches: Number(point.yInches),
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

export async function createOfficialMarineChargeFixtureV1(input = {}) {
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
    unitRecordKeys: ["army_units:marine"],
    missionRecordKey: "faction_cards:mission_hold_position",
    cleanupCardRecordKeys: ["tactical_cards:academy", "tactical_cards:terran_armed_forces"],
    reserveDeployData: true,
  });
  const missionSetupBinding = createOfficialMissionSetupBindingV1({
    gameplayDataBundle,
    missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "charge-mission-draft" }),
    deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "charge-deployment-draft" }),
    seatColorAssignment: { player1: "red", player2: "blue" },
  });
  const marineRecord = getOfficialCurrentProductRecord(dataset, "army_units:marine");

  function marine(pieceInput) {
    const positions = pieceInput.positions;
    const currentModels = positions.length;
    const maxModels = Number(pieceInput.maxModels || currentModels);
    return {
      id: pieceInput.id,
      name: marineRecord.payload.name,
      sideKey: pieceInput.sideKey,
      officialUnitRecordKey: "army_units:marine",
      sourceRecordHash: marineRecord.sourceRecordHash,
      officialPayloadHash: marineRecord.payloadHash,
      currentModels,
      maxModels,
      currentSupply: supplyFor(currentModels),
      destroyedModelIds: Array.from(
        { length: maxModels - currentModels },
        (_unused, index) => `${pieceInput.id}-destroyed-${currentModels + index + 1}`,
      ),
      isOnField: true,
      isInReserves: false,
      isDestroyed: false,
      combatTag: "ground",
      combatTags: ["biological", "ground", "light"],
      statuses: [...(pieceInput.statuses || [])],
      selectedUpgradeNames: [],
      combatEffects: [],
      assaultEffects: [],
      damageMarker: 0,
      activatedPhases: {
        movement: pieceInput.movementActivated === true,
        assault: false,
        combat: false,
      },
      models: positions.map((point, index) => model(
        `${pieceInput.id}-model-${index + 1}`,
        point,
      )),
    };
  }

  function battleState(options = {}) {
    const activeSideKey = options.activeSideKey || "player1";
    const round = Number(options.round || 2);
    const pieces = (options.pieces || [
      {
        id: "p1-charge",
        sideKey: "player1",
        positions: [
          { xInches: 5, yInches: 10 },
          { xInches: 5, yInches: 12 },
        ],
      },
      {
        id: "p2-target-a",
        sideKey: "player2",
        positions: [{ xInches: 12, yInches: 9.37 }],
      },
      {
        id: "p2-target-b",
        sideKey: "player2",
        positions: [{ xInches: 12, yInches: 10.63 }],
      },
    ]).map(marine);
    const state = {
      schemaVersion: "starcraft_tmg_state_v0",
      round,
      phase: "assault",
      activeSideKey,
      firstPlayerSideKey: activeSideKey,
      firstPassSideByPhase: {},
      phaseFirstActorByRound: {
        [`${round}:assault`]: {
          round,
          phase: "assault",
          markerHolderSideKey: activeSideKey,
          chosenFirstActorSideKey: activeSideKey,
        },
      },
      players: {
        player1: { sideKey: "player1", faction: "Terran", passedPhases: {} },
        player2: { sideKey: "player2", faction: "Terran", passedPhases: {} },
      },
      scores: { player1: 0, player2: 0 },
      officialGameplayDataBundle: gameplayDataBundle,
      officialMissionSetupBinding: missionSetupBinding,
      activeAbilityUseHistory: [],
      board: {
        widthInches: 54,
        heightInches: 36,
        missionMarkers: structuredClone(
          gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.geometry.missionMarkers,
        ),
        terrain: [],
        accessPoints: [],
        tokens: [],
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
      pieces,
      startOfRoundHistory: [],
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
    state.startOfRoundHistory.push({
      round,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      trainingTruth: false,
    });
    return state;
  }

  return { snapshot, dataset, gameplayDataBundle, missionSetupBinding, battleState };
}
