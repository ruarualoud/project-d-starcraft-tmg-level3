import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "../../packages/rule-atoms/official-round-supply-state-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialImpactProfileV1 } from
  "../../packages/source-data/official-impact-profile-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../../packages/source-data/official-mission-setup-binding-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./official-development-tranche-source-lock-fixture-v1.mjs";

function goliath(record, input) {
  return {
    id: input.id,
    name: record.payload.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: record.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    officialPayloadHash: record.payloadHash,
    currentModels: 1,
    maxModels: 1,
    currentSupply: 2,
    destroyedModelIds: [],
    isOnField: true,
    isInReserves: false,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["armoured", "ground", "mechanical"],
    statuses: [],
    selectedUpgradeNames: [],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: Number(input.damageMarker || 0),
    activatedPhases: {
      movement: false,
      assault: input.assaultActivated === true,
      combat: false,
    },
    models: [{
      id: `${input.id}-model-1`,
      xInches: Number(input.xInches),
      yInches: Number(input.yInches),
      baseShape: "round",
      baseWidthInches: 3.15,
      baseDepthInches: 3.15,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
      isOnField: true,
      isDestroyed: false,
    }],
  };
}

export async function createOfficialImpactAfterChargeFixtureV1(input = {}) {
  const root = String(input.root || "");
  const runtimeHash = String(input.runtimeHash || "");
  const artifacts = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
  const gameplayDataBundle = createOfficialGameplayDataBundleV1({
    snapshot: artifacts.snapshot,
    dataset: artifacts.dataset,
    unitRecordKeys: ["army_units:goliath", "army_units:marine"],
    missionRecordKey: "faction_cards:mission_hold_position",
    reserveDeployData: true,
    attackProfileData: true,
  });
  const missionSetupBinding = createOfficialMissionSetupBindingV1({
    gameplayDataBundle,
    missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "slice-76-mission-draft" }),
    deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "slice-76-deployment-draft" }),
    seatColorAssignment: { player1: "red", player2: "blue" },
  });
  const officialImpactProfile = createOfficialImpactProfileV1({
    snapshot: artifacts.snapshot,
    dataset: artifacts.dataset,
  });
  const record = getOfficialCurrentProductRecord(artifacts.dataset, "army_units:goliath");

  function battleState(options = {}) {
    const round = Number(options.round || 2);
    const activeSideKey = options.activeSideKey || "player1";
    const pieces = (options.pieces || [
      { id: "p1-goliath", sideKey: "player1", xInches: 5, yInches: 18 },
      { id: "p2-target-a", sideKey: "player2", xInches: 12, yInches: 16.5 },
      { id: "p2-target-b", sideKey: "player2", xInches: 12, yInches: 19.5 },
    ]).map((entry) => goliath(record, entry));
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
      officialDevelopmentTrancheSourceLockAudit: artifacts.audit,
      officialImpactProfile,
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

  return {
    ...artifacts,
    gameplayDataBundle,
    missionSetupBinding,
    officialImpactProfile,
    battleState,
  };
}
