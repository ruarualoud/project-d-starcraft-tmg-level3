import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";
import { enumerateOfficialReserveDeployV1 } from
  "../packages/rule-atoms/official-reserve-deploy-executor-v1.mjs";
import {
  applyOfficialReserveDeployV2,
  enumerateOfficialReserveDeployV2,
  instantiateOfficialReserveDeployV2,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V2_PARAMETER_KIND,
} from "../packages/rule-atoms/official-reserve-deploy-executor-v2.mjs";
import {
  applyOfficialStartOfRoundV2,
  enumerateOfficialStartOfRoundActionsV2,
} from "../packages/rule-atoms/official-start-of-round-executor-v2.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build/source-intake/official-rules/command-center/firestore",
);
const RUNTIME_HASH =
  "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99";

function clone(value) {
  return structuredClone(value);
}

function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function card(profile, sideKey, suffix, readiness = "ready") {
  return {
    id: `${sideKey}-${suffix}`,
    sideKey,
    officialCardRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    cardKind: profile.cardKind,
    readiness,
    face: readiness === "ready" ? "up" : "down",
    activeEffects: [],
    startOfRoundEffects: [],
  };
}

function marineModel(id, isOnField, xInches = 0, yInches = 0) {
  return {
    id,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    xInches,
    yInches,
    isOnField,
    isDestroyed: false,
  };
}

function marine(profile, input) {
  return {
    id: input.id,
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels: input.currentModels,
    currentSupply: input.currentSupply,
    isOnField: input.isOnField,
    isDestroyed: false,
    statuses: [],
    selectedUpgradeNames: [],
    startOfRoundEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: Array.from({ length: input.currentModels }, (_unused, index) => marineModel(
      `${input.id}-m${index + 1}`,
      input.isOnField,
      input.isOnField ? 30 + (index * 2) : 0,
      input.isOnField ? input.yInches : 0,
    )),
  };
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
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
  reserveDeployData: true,
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const profile = gameplayDataBundle.combatProfileBundle.profiles[0];
const [academy, armedForces] = gameplayDataBundle.cleanupCardBundle.profiles;
const startState = {
  schemaVersion: "starcraft_tmg_state_v0",
  round: 3,
  phase: "start_of_round",
  activeSideKey: null,
  firstPlayerSideKey: "player1",
  firstPassSideByPhase: {},
  phaseFirstActorByRound: {},
  players: {
    player1: { sideKey: "player1", passedPhases: {} },
    player2: { sideKey: "player2", passedPhases: {} },
  },
  scores: { player1: 3, player2: 4 },
  officialGameplayDataBundle: gameplayDataBundle,
  officialMissionSetupBinding: missionSetupBinding,
  cleanupRefreshHistory: [{
    schema: "starcraft_tmg_official_cleanup_refresh_history_entry_v5",
    round: 2,
    branch: "empty",
    cleanupResolutionHash: "3".repeat(64),
    preCleanupMaterialHash: "4".repeat(64),
    retainedMaterialHash: "5".repeat(64),
    statusCleanupHash: "6".repeat(64),
    removedStatusEffectHashes: [],
    removedMarkerHashes: [],
    refreshedCardCount: 0,
    resetActivationPieceCount: 0,
    clearedReactionUsageEntryCount: 0,
    clearedAcademyReactionUsageEntryCount: 0,
    damageMarkersRetained: true,
    trainingTruth: false,
  }],
  determineInitiativeHistory: [{
    schema: "starcraft_tmg_official_determine_initiative_history_entry_v1",
    round: 2,
    nextRound: 3,
    previousFirstPlayerSideKey: "player2",
    nextFirstPlayerSideKey: "player1",
    scores: { player1: 3, player2: 4 },
    initiativeMode: "trailing_player",
    rollOff: null,
    initiativeResolutionHash: "7".repeat(64),
    trainingTruth: false,
  }],
  board: {
    widthInches: 54,
    heightInches: 36,
    missionMarkers: [],
    effectMarkers: [],
    tokens: [],
    markers: [],
    terrain: [],
    accessPoints: [],
  },
  cardResources: {
    player1: [card(academy, "player1", "academy", "exhausted")],
    player2: [card(armedForces, "player2", "armed-forces")],
  },
  pieces: [
    marine(profile, {
      id: "p1-reserve",
      sideKey: "player1",
      currentModels: 4,
      currentSupply: 1,
      isOnField: false,
    }),
    marine(profile, {
      id: "p2-live",
      sideKey: "player2",
      currentModels: 4,
      currentSupply: 1,
      isOnField: true,
      yInches: 28,
    }),
  ],
  startOfRoundHistory: [],
  gameOver: false,
  terminal: false,
  winner: "",
  terminalReason: "",
  log: [],
};
const matchBinding = {
  bindingHash: hashStarcraftTmgContract({ kind: "reserve-deploy-v2-public-contract" }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: RUNTIME_HASH },
};

const startActions = enumerateOfficialStartOfRoundActionsV2(startState, {
  sideKey: "player1",
  matchBinding,
});
assert.equal(startActions.length, 1);
const started = applyOfficialStartOfRoundV2(
  startState,
  executableAction(startActions[0]),
  { matchBinding },
);
const initiativeActions = enumerateOfficialPhaseInitiativeActionsV1(started.state, {
  sideKey: "player1",
});
const choosePlayer1 = initiativeActions.find((entry) => (
  entry.chosenFirstActorSideKey === "player1"
));
assert.ok(choosePlayer1);
const movement = applyOfficialPhaseInitiativeV1(
  started.state,
  executableAction(choosePlayer1),
).state;

const acceptance = [];
const current = enumerateOfficialReserveDeployV2(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(current.parameterDomains.length, 1, JSON.stringify(current.candidates));
const domain = current.parameterDomains[0];
assert.equal(domain.parameterKind, OFFICIAL_RESERVE_DEPLOY_V2_PARAMETER_KIND);
assert.equal(domain.executorId, OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID);
acceptance.push("current_v2_consumes_real_start_and_phase_handoffs");

const forgedStart = clone(movement);
forgedStart.startOfRoundHistory.at(-1).roundSupplyStateHash = "f".repeat(64);
assert.equal(enumerateOfficialReserveDeployV1(forgedStart, {
  sideKey: "player1",
  matchBinding,
}).parameterDomains.length, 1);
const forgedStartDisabled = enumerateOfficialReserveDeployV2(forgedStart, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(forgedStartDisabled.parameterDomains.length, 0);
assert.equal(forgedStartDisabled.candidates[0].disabledReason,
  "RESERVE_DEPLOY_V2_START_OF_ROUND_HANDOFF_INVALID");
acceptance.push("frozen_v1_forged_start_supply_hash_is_rejected_by_current_v2");

const forgedInitiative = clone(movement);
forgedInitiative.phaseFirstActorByRound["3:movement"].markerHolderSideKey = "player2";
assert.equal(enumerateOfficialReserveDeployV1(forgedInitiative, {
  sideKey: "player1",
  matchBinding,
}).parameterDomains.length, 1);
const forgedInitiativeDisabled = enumerateOfficialReserveDeployV2(forgedInitiative, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(forgedInitiativeDisabled.parameterDomains.length, 0);
assert.equal(forgedInitiativeDisabled.candidates[0].disabledReason,
  "RESERVE_DEPLOY_V2_PHASE_HANDOFF_INVALID");
acceptance.push("frozen_v1_forged_phase_marker_holder_is_rejected_by_current_v2");

const parameters = {
  leadingModelId: "p1-reserve-m1",
  entryAlongEdgeMilliInches: 10_000,
  path: [{ xMilliInches: 10_000, yMilliInches: 3_000 }],
  placements: [
    { modelId: "p1-reserve-m2", xMilliInches: 8_000, yMilliInches: 3_000 },
    { modelId: "p1-reserve-m3", xMilliInches: 10_000, yMilliInches: 5_000 },
    { modelId: "p1-reserve-m4", xMilliInches: 12_000, yMilliInches: 3_000 },
  ],
};
const instantiated = instantiateOfficialReserveDeployV2(
  movement,
  domain,
  parameters,
  { matchBinding },
);
for (const forged of [
  { ...clone(instantiated.action), ruleAtomIds: ["rule-atom:forged"] },
  { ...clone(instantiated.action), callerDiagnostic: "forged" },
]) {
  assert.throws(
    () => applyOfficialReserveDeployV2(movement, forged, { matchBinding }),
    /RESERVE_DEPLOY_V2_ACTION_MISMATCH/u,
  );
}
const applied = applyOfficialReserveDeployV2(
  movement,
  instantiated.action,
  { matchBinding },
);
assert.equal(applied.ok, true);
assert.equal(applied.executorId, OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID);
assert.equal(applied.state.pieces[0].isOnField, true);
assert.equal(applied.state.pieces[0].activatedPhases.movement, true);
assert.equal(applied.state.officialRoundSupplyState.onTableSupplyBySide.player1, 1);
assert.equal(applied.state.officialRoundSupplyState.reserveSupplyBySide.player1, 0);
assert.equal(applied.state.log.at(-1).action.executorId,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID);
acceptance.push("current_v2_exact_action_applies_deploy_supply_and_v2_log_identity");

console.log(JSON.stringify({
  schema: "starcraft_tmg_reserve_deploy_v2_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  executorId: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  ruleAtomCount: domain.ruleAtomIds.length,
  trainingTruth: false,
}, null, 2));
