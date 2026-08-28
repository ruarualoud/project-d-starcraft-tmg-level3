import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  enumerateOfficialDisengageCasualtyV1,
} from "../packages/rule-atoms/official-disengage-casualty-executor-v1.mjs";
import {
  applyOfficialDisengageV3,
  enumerateOfficialDisengageV3,
  instantiateOfficialDisengageV3,
  OFFICIAL_DISENGAGE_V3_ACTION_ATOM_IDS,
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V3_PARAMETER_KIND,
} from "../packages/rule-atoms/official-disengage-executor-v3.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";
import {
  applyOfficialStartOfRoundV3,
  enumerateOfficialStartOfRoundActionsV3,
} from "../packages/rule-atoms/official-start-of-round-executor-v3.mjs";
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
  "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043";

function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
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
  cardResources: { player1: [], player2: [] },
  pieces: [
    marine(profile, {
      id: "p1-live",
      sideKey: "player1",
      positions: [
        { xInches: 10, yInches: 10 },
        { xInches: 8, yInches: 10 },
        { xInches: 10, yInches: 8 },
        { xInches: 8, yInches: 8 },
      ],
    }),
    marine(profile, {
      id: "p2-live",
      sideKey: "player2",
      positions: [{ xInches: 12, yInches: 10 }],
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
  bindingHash: hashStarcraftTmgContract({ kind: "disengage-v3-public-contract-red" }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: RUNTIME_HASH },
};
const started = applyOfficialStartOfRoundV3(
  startState,
  executableAction(enumerateOfficialStartOfRoundActionsV3(startState, {
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

const current = enumerateOfficialDisengageCasualtyV1(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(current.parameterDomains.length, 1, JSON.stringify(current.candidates));
const acceptance = [];
const v3 = enumerateOfficialDisengageV3(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(v3.parameterDomains.length, 1, JSON.stringify(v3.candidates));
const domain = v3.parameterDomains[0];
assert.equal(domain.parameterKind, OFFICIAL_DISENGAGE_V3_PARAMETER_KIND);
assert.equal(domain.executorId, OFFICIAL_DISENGAGE_V3_EXECUTOR_ID);
assert.match(domain.constraints.currentAuthorityLineageHash, /^[a-f0-9]{64}$/u);
acceptance.push("current_v3_consumes_real_start_phase_supply_and_engaged_unit_domain");

const forged = structuredClone(movement);
forged.phaseFirstActorByRound["3:movement"].markerHolderSideKey = "player2";
const forgedCurrent = enumerateOfficialDisengageCasualtyV1(forged, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(
  forgedCurrent.parameterDomains.length,
  1,
  "frozen disengage v2 is immutable and keeps the public RED defect",
);
const forgedV3 = enumerateOfficialDisengageV3(forged, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(forgedV3.parameterDomains.length, 0);
assert.equal(forgedV3.candidates[0].disabledReason, "DISENGAGE_V3_PHASE_HANDOFF_INVALID");
acceptance.push("frozen_v2_forged_phase_handoff_is_rejected_by_current_v3");

const forgedStart = structuredClone(movement);
forgedStart.startOfRoundHistory.at(-1).roundSupplyStateHash = "f".repeat(64);
assert.equal(enumerateOfficialDisengageCasualtyV1(forgedStart, {
  sideKey: "player1",
  matchBinding,
}).parameterDomains.length, 1);
const forgedStartV3 = enumerateOfficialDisengageV3(forgedStart, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(forgedStartV3.parameterDomains.length, 0);
assert.equal(forgedStartV3.candidates[0].disabledReason,
  "DISENGAGE_V3_START_OF_ROUND_HANDOFF_INVALID");
acceptance.push("frozen_v2_forged_start_supply_hash_is_rejected_by_current_v3");

const instantiated = instantiateOfficialDisengageV3(movement, domain, {
  leadingModelId: "p1-live-m1",
  leadingOutcome: "placed",
  path: [{ xMilliInches: 6_000, yMilliInches: 10_000 }],
  placements: [
    { modelId: "p1-live-m2", outcome: "placed", xMilliInches: 8_000, yMilliInches: 10_000 },
    { modelId: "p1-live-m3", outcome: "placed", xMilliInches: 6_000, yMilliInches: 12_000 },
    { modelId: "p1-live-m4", outcome: "placed", xMilliInches: 4_000, yMilliInches: 10_000 },
  ],
}, { matchBinding });
for (const forgedAction of [
  { ...structuredClone(instantiated.action), ruleAtomIds: ["rule-atom:forged"] },
  { ...structuredClone(instantiated.action), callerDiagnostic: "forged" },
]) {
  assert.throws(
    () => applyOfficialDisengageV3(movement, forgedAction, { matchBinding }),
    /DISENGAGE_V3_ACTION_MISMATCH/u,
  );
}
const applied = applyOfficialDisengageV3(
  movement,
  instantiated.action,
  { matchBinding },
);
assert.equal(applied.ok, true);
assert.equal(applied.executorId, OFFICIAL_DISENGAGE_V3_EXECUTOR_ID);
assert.equal(applied.state.pieces[0].activatedPhases.movement, true);
assert.equal(applied.state.pieces[0].models[0].xInches, 6);
assert.equal(applied.state.log.at(-1).action.executorId, OFFICIAL_DISENGAGE_V3_EXECUTOR_ID);
assert.equal(applied.silentCompatibilityUsed, false);
acceptance.push("current_v3_exact_action_applies_and_logs_v3_without_silent_compatibility");

console.log(JSON.stringify({
  schema: "starcraft_tmg_disengage_v3_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
  executorAtomCount: OFFICIAL_DISENGAGE_V3_EXECUTOR_ATOM_IDS.length,
  actionAtomCount: OFFICIAL_DISENGAGE_V3_ACTION_ATOM_IDS.length,
  trainingTruth: false,
}, null, 2));
