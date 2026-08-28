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
import {
  enumerateOfficialStandardMoveV1,
} from "../packages/rule-atoms/official-standard-move-executor-v1.mjs";
import {
  applyOfficialStandardMoveV2,
  enumerateOfficialStandardMoveV2,
  instantiateOfficialStandardMoveV2,
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V2_PARAMETER_KIND,
} from "../packages/rule-atoms/official-standard-move-executor-v2.mjs";
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
  "f8cae053d340153b166c12c69e25f719e2b79b6abce78ba05a59f978248bb27c";

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

function marineModel(id, xInches, yInches) {
  return {
    id,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    xInches,
    yInches,
    isOnField: true,
    isDestroyed: false,
  };
}

function marine(profile, input) {
  return {
    id: input.id,
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels: input.positions.length,
    currentSupply: input.positions.length <= 3 ? 0 : 1,
    isOnField: true,
    isDestroyed: false,
    statuses: [],
    selectedUpgradeNames: [],
    startOfRoundEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: input.positions.map((position, index) => marineModel(
      `${input.id}-m${index + 1}`,
      position.xInches,
      position.yInches,
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
      id: "p1-live",
      sideKey: "player1",
      positions: [
        { xInches: 10, yInches: 10 },
        { xInches: 12, yInches: 10 },
        { xInches: 10, yInches: 12 },
        { xInches: 8, yInches: 10 },
      ],
    }),
    marine(profile, {
      id: "p2-live",
      sideKey: "player2",
      positions: [
        { xInches: 40, yInches: 28 },
        { xInches: 42, yInches: 28 },
        { xInches: 40, yInches: 30 },
        { xInches: 38, yInches: 28 },
      ],
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
  bindingHash: hashStarcraftTmgContract({ kind: "standard-move-v2-public-contract" }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: RUNTIME_HASH },
};

const started = applyOfficialStartOfRoundV2(
  startState,
  executableAction(enumerateOfficialStartOfRoundActionsV2(startState, {
    sideKey: "player1",
    matchBinding,
  })[0]),
  { matchBinding },
);
const initiative = enumerateOfficialPhaseInitiativeActionsV1(started.state, {
  sideKey: "player1",
}).find((entry) => entry.chosenFirstActorSideKey === "player1");
const movement = applyOfficialPhaseInitiativeV1(
  started.state,
  executableAction(initiative),
).state;

assert.equal(enumerateOfficialStandardMoveV1(movement, {
  sideKey: "player1",
  matchBinding,
}).parameterDomains.length, 1);
const acceptance = [];
const current = enumerateOfficialStandardMoveV2(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(current.parameterDomains.length, 1, JSON.stringify(current.candidates));
const domain = current.parameterDomains[0];
assert.equal(domain.parameterKind, OFFICIAL_STANDARD_MOVE_V2_PARAMETER_KIND);
assert.equal(domain.executorId, OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID);
assert.equal(domain.constraints.maxDistanceMilliInches, 4_000);
assert.equal(domain.constraints.modelIds.length, 4);
acceptance.push("current_v2_consumes_real_start_phase_and_unit_size_move_domain");

const forged = structuredClone(movement);
forged.phaseFirstActorByRound["3:movement"].markerHolderSideKey = "player2";
assert.equal(enumerateOfficialStandardMoveV1(forged, {
  sideKey: "player1",
  matchBinding,
}).parameterDomains.length, 1);
const forgedDisabled = enumerateOfficialStandardMoveV2(forged, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(forgedDisabled.parameterDomains.length, 0);
assert.equal(forgedDisabled.candidates[0].disabledReason,
  "STANDARD_MOVE_V2_PHASE_HANDOFF_INVALID");
acceptance.push("frozen_v1_forged_phase_handoff_is_rejected_by_current_v2");

const forgedStart = structuredClone(movement);
forgedStart.startOfRoundHistory.at(-1).roundSupplyStateHash = "f".repeat(64);
assert.equal(enumerateOfficialStandardMoveV1(forgedStart, {
  sideKey: "player1",
  matchBinding,
}).parameterDomains.length, 1);
const forgedStartDisabled = enumerateOfficialStandardMoveV2(forgedStart, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(forgedStartDisabled.parameterDomains.length, 0);
assert.equal(forgedStartDisabled.candidates[0].disabledReason,
  "STANDARD_MOVE_V2_START_OF_ROUND_HANDOFF_INVALID");
acceptance.push("frozen_v1_forged_start_supply_hash_is_rejected_by_current_v2");

const parameters = {
  leadingModelId: "p1-live-m1",
  path: [{ xMilliInches: 14_000, yMilliInches: 10_000 }],
  placements: [
    { modelId: "p1-live-m2", xMilliInches: 12_000, yMilliInches: 10_000 },
    { modelId: "p1-live-m3", xMilliInches: 14_000, yMilliInches: 12_000 },
    { modelId: "p1-live-m4", xMilliInches: 16_000, yMilliInches: 10_000 },
  ],
};
const instantiated = instantiateOfficialStandardMoveV2(
  movement,
  domain,
  parameters,
  { matchBinding },
);
for (const forgedAction of [
  { ...structuredClone(instantiated.action), ruleAtomIds: ["rule-atom:forged"] },
  { ...structuredClone(instantiated.action), callerDiagnostic: "forged" },
]) {
  assert.throws(
    () => applyOfficialStandardMoveV2(movement, forgedAction, { matchBinding }),
    /STANDARD_MOVE_V2_ACTION_MISMATCH/u,
  );
}
const applied = applyOfficialStandardMoveV2(
  movement,
  instantiated.action,
  { matchBinding },
);
assert.equal(applied.ok, true);
assert.equal(applied.executorId, OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID);
assert.equal(applied.state.pieces[0].activatedPhases.movement, true);
assert.equal(applied.state.pieces[0].models[0].xInches, 14);
assert.equal(applied.state.log.at(-1).action.executorId,
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID);
acceptance.push("current_v2_exact_action_applies_unit_scale_move_and_v2_log_identity");

console.log(JSON.stringify({
  schema: "starcraft_tmg_standard_move_v2_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  executorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
  executorAtomCount: 10,
  actionAtomCount: domain.ruleAtomIds.length,
  trainingTruth: false,
}, null, 2));
