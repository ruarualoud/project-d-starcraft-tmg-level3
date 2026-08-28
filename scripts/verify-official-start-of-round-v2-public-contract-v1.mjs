import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { enumerateOfficialStartOfRoundActionsV1 } from
  "../packages/rule-atoms/official-start-of-round-executor-v1.mjs";
import {
  applyOfficialStartOfRoundV2,
  enumerateOfficialStartOfRoundActionsV2,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
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
  "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7";

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

function marine(profile, id, sideKey, currentModels, currentSupply, isOnField) {
  return {
    id,
    sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels,
    currentSupply,
    isOnField,
    isDestroyed: false,
    statuses: [],
    selectedUpgradeNames: [],
    startOfRoundEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
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
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const profile = gameplayDataBundle.combatProfileBundle.profiles[0];
const [academy, armedForces] = gameplayDataBundle.cleanupCardBundle.profiles;
const state = {
  schemaVersion: "starcraft_tmg_state_v0",
  round: 3,
  phase: "start_of_round",
  activeSideKey: null,
  firstPlayerSideKey: "player2",
  firstPassSideByPhase: {},
  phaseFirstActorByRound: {},
  players: {
    player1: { sideKey: "player1", passedPhases: {} },
    player2: { sideKey: "player2", passedPhases: {} },
  },
  scores: { player1: 4, player2: 3 },
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
    previousFirstPlayerSideKey: "player1",
    nextFirstPlayerSideKey: "player2",
    scores: { player1: 4, player2: 3 },
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
    marine(profile, "player1-live", "player1", 6, 1, true),
    marine(profile, "player1-reserve", "player1", 9, 2, false),
    marine(profile, "player2-live", "player2", 9, 2, true),
  ],
  gameOver: false,
  terminal: false,
  winner: "",
  terminalReason: "",
  log: [],
};
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: RUNTIME_HASH },
};

const acceptance = [];
const current = enumerateOfficialStartOfRoundActionsV2(state, {
  sideKey: "player2",
  matchBinding,
});
assert.equal(current.length, 1);
assert.equal(current[0].executorId, OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID);
assert.deepEqual(current[0].ruleAtomIds, [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS]);
acceptance.push("current_v2_exposes_the_exact_thirteen_atom_start_window");

const forgedHistory = clone(state);
forgedHistory.determineInitiativeHistory[0].round = 999;
forgedHistory.determineInitiativeHistory[0].scores = { player1: 999, player2: 999 };
forgedHistory.determineInitiativeHistory[0].initiativeMode = "caller_forged";
assert.equal(enumerateOfficialStartOfRoundActionsV1(forgedHistory, {
  sideKey: "player2",
  matchBinding,
}).length, 1);
const disabled = enumerateOfficialStartOfRoundActionsV2(forgedHistory, {
  sideKey: "player2",
  matchBinding,
  includeDisabled: true,
});
assert.equal(disabled.length, 1);
assert.equal(disabled[0].isEnabled, false);
assert.equal(disabled[0].disabledReason, "START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID");
acceptance.push("frozen_v1_history_gap_is_rejected_by_current_v2");

const action = executableAction(current[0]);
for (const forged of [
  { ...clone(action), ruleAtomIds: ["rule-atom:forged"] },
  { ...clone(action), callerDiagnostic: "forged" },
  { ...clone(action), startOfRoundResolution: {
    ...clone(action.startOfRoundResolution),
    firstPlayerSideKey: "player1",
  } },
]) {
  assert.throws(
    () => applyOfficialStartOfRoundV2(state, forged, { matchBinding }),
    /START_OF_ROUND_V2_ACTION_MISMATCH/u,
  );
}
acceptance.push("current_v2_apply_exact_matches_a_fresh_server_enumeration");

const sourceDrift = clone(state);
sourceDrift.officialGameplayDataBundle.sourceSnapshotHash = "f".repeat(64);
const sourceDisabled = enumerateOfficialStartOfRoundActionsV2(sourceDrift, {
  sideKey: "player2",
  matchBinding,
  includeDisabled: true,
});
assert.equal(sourceDisabled[0].isEnabled, false);
assert.equal(sourceDisabled[0].disabledReason,
  "START_OF_ROUND_V2_LATEST_OFFICIAL_DATA_REQUIRED");
acceptance.push("current_v2_rejects_current_official_source_or_binding_drift");

console.log(JSON.stringify({
  schema: "starcraft_tmg_start_of_round_v2_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  executorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  ruleAtomCount: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS.length,
  trainingTruth: false,
}, null, 2));
