#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
  OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS,
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
} from "../packages/rule-atoms/official-hold-position-end-game-executor-v1.mjs";
import {
  createOfficialHoldPositionEndGameRuleSliceV1,
  verifyOfficialHoldPositionEndGameRuleSliceV1,
} from "../packages/rule-atoms/official-hold-position-end-game-rule-slice-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v2.mjs";
import { createOfficialSupplyLossLedgerV1 } from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
} from "../packages/rule-atoms/official-victory-point-scoring-executor-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialMissionSetupBindingV1,
} from "../packages/source-data/official-mission-setup-binding-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";
const HISTORICAL_SCORING_SLICE_HASH =
  "5a0e912234f656bcf51f8c9b9bd28b56c21faaf0298fb3256225b41911828cc2";
const HISTORICAL_SCORING_CATALOGUE_HASH =
  "f831bab25b4a82c1ae56ce90a5c2e964616696b8c34df2ea828d5f4539a8df38";
const HISTORICAL_SCORING_RUNTIME_HASH =
  "61a688b603947d9f3e6b913caf8b973dbf28da1e012b033c1aaa5b2a8adf4039";

function marker(number, controlSideKey) {
  return {
    id: `mission-marker-${number}`,
    number,
    xInches: 5 + ((number - 1) * 10),
    yInches: 6,
    diameterMillimeters: 32,
    elevation: "ground",
    isActivated: true,
    controlSideKey,
    factionIndicatorSideKey: controlSideKey,
  };
}

function liveModel(id, xInches, yInches) {
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

function liveMarine(id, sideKey, xInches, yInches) {
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    formationSize: "small",
    selectedUpgradeNames: [],
    combatTag: "ground",
    currentModels: 1,
    maxModels: 7,
    currentSupply: 0,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [liveModel(`${id}-model`, xInches, yInches)],
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

function cleanupState(input) {
  const markerControl = input.markerControl || {
    1: "player1",
    2: "player1",
    3: "player2",
    4: "player2",
    5: "player1",
  };
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: { combat: "player1" },
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: structuredClone(input.scores),
    officialGameplayDataBundle: input.gameplayDataBundle,
    officialMissionSetupBinding: input.missionSetupBinding,
    supplyLossLedger: structuredClone(input.supplyLossLedger),
    board: {
      widthInches: 54,
      heightInches: 12,
      missionMarkerControlGeometry: {
        schemaVersion: "starcraft_tmg_mission_marker_control_geometry_v1",
        markerCoordinatesComplete: true,
        markerFootprintsComplete: true,
        markerElevationsComplete: true,
        lineOfSightTerrainComplete: true,
      },
      missionMarkers: [1, 2, 3, 4, 5].map((number) => (
        marker(number, markerControl[number] ?? null)
      )),
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      liveMarine("p1-live-unit", "player1", 0.63, 0.63),
      liveMarine("p2-live-unit", "player2", 53.37, 11.37),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

async function officialData() {
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
  return {
    snapshot: liveReport.commandSnapshot,
    dataset: createOfficialCommandCenterDataset({
      snapshot: liveReport.commandSnapshot,
      firestorePayloads,
    }),
  };
}

function credentials(engine, envelope, sideKey, suffix, options = {}) {
  const authority = engine.issueSeatAuthority({
    grantId: `end-game-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: options.roleMode || "player",
    principalType: options.principalType || "human",
    capabilities: options.capabilities || ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `end-game-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function finiteAction(space, actionType) {
  return space.finiteActions.find((entry) => entry.action.actionType === actionType);
}

function applyFinite(engine, envelope, credentialsInput, actionType, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: credentialsInput.authority });
  const finite = finiteAction(legal, actionType);
  assert.ok(
    finite,
    `${actionType} must be present in LegalSpace: ${JSON.stringify(legal.disabledDiagnostics)}`,
  );
  const preview = engine.preview({
    envelope,
    seatAuthority: credentialsInput.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credentialsInput.authority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: credentialsInput.authority,
    controlLease: credentialsInput.lease,
    idempotencyKey,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { legal, finite, preview, confirmation, applied };
}

function envelopeFor(engine, roomId, snapshot, gameplayDataBundle, state) {
  return engine.createEnvelope({
    roomId,
    dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
      dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
    },
    state,
  });
}

function runScoringPrefix(engine, initial, suffix) {
  const markerStep = applyFinite(
    engine,
    initial,
    credentials(engine, initial, "player1", `${suffix}-marker`),
    OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
    `${suffix}-marker`,
  );
  const scoringStep = applyFinite(
    engine,
    markerStep.applied.envelope,
    credentials(engine, markerStep.applied.envelope, "player1", `${suffix}-score`),
    OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
    `${suffix}-score`,
  );
  return { markerStep, scoringStep };
}

function runEndGameStep(engine, scoringEnvelope, suffix) {
  return applyFinite(
    engine,
    scoringEnvelope,
    credentials(engine, scoringEnvelope, "player1", `${suffix}-end-game`),
    OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
    `${suffix}-end-game`,
  );
}

const scoringReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-victory-point-scoring-rule-slice-v1-report.json"),
  "utf8",
));
assert.equal(scoringReport.slice.sliceHash, HISTORICAL_SCORING_SLICE_HASH);
assert.equal(scoringReport.slice.catalogueHash, HISTORICAL_SCORING_CATALOGUE_HASH);
assert.equal(scoringReport.runtime.runtimeHash, HISTORICAL_SCORING_RUNTIME_HASH);

const endGameSlice = createOfficialHoldPositionEndGameRuleSliceV1({
  previousSlice: scoringReport.slice,
});
const audit = verifyOfficialHoldPositionEndGameRuleSliceV1({
  previousSlice: scoringReport.slice,
  slice: endGameSlice,
});
assert.deepEqual(audit.counts, {
  sourceClauses: 1093,
  ruleAtoms: 1026,
  executableRuleAtoms: 162 + OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS.length,
  reviewRequiredRuleAtoms: 750 - OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS.length,
  displayOnlyRuleAtoms: 114,
  newlyExecutableRuleAtoms: OFFICIAL_HOLD_POSITION_END_GAME_ATOM_IDS.length,
  changedNonTargetAtoms: 0,
  executableContractGaps: 0,
  evidenceGaps: 0,
});

const { snapshot, dataset } = await officialData();
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
});
assert.equal(gameplayDataBundle.missionScoringProfile.specialLeadWinThreshold, 10);
assert.equal(
  gameplayDataBundle.missionScoringProfile.sourceRecordHash,
  "70c391e589555f7b124a381572ad4b1272cb22b6fbcc6c140171e68ea1f18cfa",
);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);

const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: endGameSlice.catalogue });
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({
    kind: "mission-draft-receipt",
    selectedMissionRecordKey: "faction_cards:mission_hold_position",
  }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({
    kind: "deployment-draft-receipt",
    selectedDeploymentRecordKey: "faction_cards:deployment_no_mans_land",
  }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const supplyLossLedger = createOfficialSupplyLossLedgerV1({
  round: 2,
  rulesRuntimeHash: rulesRuntime.descriptor.runtimeHash,
});

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-hold-position-end-game-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-hold-position-end-game-seal-v1",
  },
});

const nonTerminalInitial = envelopeFor(
  engine,
  "official-hold-position-non-terminal-room",
  snapshot,
  gameplayDataBundle,
  cleanupState({
    gameplayDataBundle,
    missionSetupBinding,
    supplyLossLedger,
    scores: { player1: 0, player2: 0 },
  }),
);
const nonTerminalPrefix = runScoringPrefix(engine, nonTerminalInitial, "non-terminal");
assert.deepEqual(nonTerminalPrefix.scoringStep.applied.envelope.state.scores, {
  player1: 4,
  player2: 3,
});
const nonTerminalStep = runEndGameStep(
  engine,
  nonTerminalPrefix.scoringStep.applied.envelope,
  "non-terminal",
);
assert.equal(nonTerminalStep.finite.action.executorId, OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID);
assert.deepEqual(nonTerminalStep.finite.action.endGameResolution.beforeScores, {
  player1: 4,
  player2: 3,
});
assert.equal(nonTerminalStep.finite.action.endGameResolution.outcome, "continue");
assert.equal(nonTerminalStep.applied.envelope.state.gameOver, false);
assert.equal(nonTerminalStep.applied.envelope.state.terminal, false);
assert.equal(
  nonTerminalStep.applied.envelope.state.scoringCleanupProgress.currentStep,
  "resolve_end_of_round_effects",
);

const player1TerminalInitial = envelopeFor(
  engine,
  "official-hold-position-player1-terminal-room",
  snapshot,
  gameplayDataBundle,
  cleanupState({
    gameplayDataBundle,
    missionSetupBinding,
    supplyLossLedger,
    scores: { player1: 9, player2: 0 },
  }),
);
const player1TerminalPrefix = runScoringPrefix(engine, player1TerminalInitial, "player1-terminal");
assert.deepEqual(player1TerminalPrefix.scoringStep.applied.envelope.state.scores, {
  player1: 13,
  player2: 3,
});
const player1TerminalStep = runEndGameStep(
  engine,
  player1TerminalPrefix.scoringStep.applied.envelope,
  "player1-terminal",
);
assert.equal(player1TerminalStep.applied.envelope.state.gameOver, true);
assert.equal(player1TerminalStep.applied.envelope.state.terminal, true);
assert.equal(player1TerminalStep.applied.envelope.state.winner, "player1");
assert.equal(
  player1TerminalStep.applied.envelope.state.terminalReason,
  "mission_hold_position_special_lead_10_plus",
);
assert.equal(player1TerminalStep.applied.envelope.state.scoringCleanupProgress.currentStep, "terminal");
assert.equal(player1TerminalStep.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");

const terminalLegal = engine.legalSpace(player1TerminalStep.applied.envelope, {
  seatAuthority: credentials(
    engine,
    player1TerminalStep.applied.envelope,
    "player1",
    "terminal-read",
  ).authority,
});
assert.equal(terminalLegal.finiteActions.length, 0);
assert.deepEqual(terminalLegal.terminal, {
  gameOver: true,
  winner: "player1",
  reason: "mission_hold_position_special_lead_10_plus",
  endGameResolutionHash:
    player1TerminalStep.applied.envelope.state.endGameResolutionHistory.at(-1)
      .endGameResolutionHash,
});

const player2TerminalInitial = envelopeFor(
  engine,
  "official-hold-position-player2-terminal-room",
  snapshot,
  gameplayDataBundle,
  cleanupState({
    gameplayDataBundle,
    missionSetupBinding,
    supplyLossLedger,
    scores: { player1: 0, player2: 3 },
    markerControl: {
      1: "player2",
      2: "player2",
      3: "player2",
      4: "player2",
      5: "player2",
    },
  }),
);
const player2TerminalPrefix = runScoringPrefix(engine, player2TerminalInitial, "player2-terminal");
assert.deepEqual(player2TerminalPrefix.scoringStep.applied.envelope.state.scores, {
  player1: 0,
  player2: 10,
});
const player2TerminalStep = runEndGameStep(
  engine,
  player2TerminalPrefix.scoringStep.applied.envelope,
  "player2-terminal",
);
assert.equal(player2TerminalStep.applied.envelope.state.winner, "player2");

const replay = engine.replay({
  initialEnvelope: player1TerminalInitial,
  journal: [
    player1TerminalPrefix.markerStep.applied.receipt,
    player1TerminalPrefix.scoringStep.applied.receipt,
    player1TerminalStep.applied.receipt,
  ],
});
assert.equal(replay.ok, true, JSON.stringify(replay));
assert.equal(replay.envelope.stateHash, player1TerminalStep.applied.envelope.stateHash);

const opponent = credentials(
  engine,
  nonTerminalPrefix.scoringStep.applied.envelope,
  "player1",
  "opponent",
  {
    roleMode: "opponent",
    principalType: "model",
    capabilities: ["read_legal_space", "preview", "apply"],
  },
);
const opponentLegal = engine.legalSpace(nonTerminalPrefix.scoringStep.applied.envelope, {
  seatAuthority: opponent.authority,
});
const opponentFinite = finiteAction(opponentLegal, OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE);
assert.ok(opponentFinite);
const opponentPreview = engine.preview({
  envelope: nonTerminalPrefix.scoringStep.applied.envelope,
  seatAuthority: opponent.authority,
  proposal: { kind: "finite", actionKey: opponentFinite.actionKey },
});
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
const opponentApply = engine.apply({
  envelope: nonTerminalPrefix.scoringStep.applied.envelope,
  expectedStateRevision: nonTerminalPrefix.scoringStep.applied.envelope.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponent.authority,
  controlLease: opponent.lease,
  idempotencyKey: "ticket-11-end-game-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");

const tamperedHistoryState = structuredClone(nonTerminalPrefix.scoringStep.applied.envelope.state);
tamperedHistoryState.victoryPointScoringHistory.at(-1).scoringResolutionHash = "0".repeat(64);
const tamperedHistoryEnvelope = envelopeFor(
  engine,
  "official-hold-position-tampered-scoring-history-room",
  snapshot,
  gameplayDataBundle,
  tamperedHistoryState,
);
const tamperedHistoryCredentials = credentials(
  engine,
  tamperedHistoryEnvelope,
  "player1",
  "tampered-history",
);
const tamperedHistoryLegal = engine.legalSpace(tamperedHistoryEnvelope, {
  seatAuthority: tamperedHistoryCredentials.authority,
});
assert.equal(
  finiteAction(tamperedHistoryLegal, OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE),
  undefined,
);
assert.ok(tamperedHistoryLegal.disabledDiagnostics.some((entry) => (
  entry.disabledReason === "END_GAME_SCORING_HISTORY_INVALID"
)));

const eliminationScopeState = structuredClone(nonTerminalPrefix.scoringStep.applied.envelope.state);
eliminationScopeState.pieces = eliminationScopeState.pieces.filter((piece) => (
  piece.sideKey !== "player2"
));
const eliminationScopeEnvelope = envelopeFor(
  engine,
  "official-hold-position-elimination-scope-room",
  snapshot,
  gameplayDataBundle,
  eliminationScopeState,
);
const eliminationScopeCredentials = credentials(
  engine,
  eliminationScopeEnvelope,
  "player1",
  "elimination-scope",
);
const eliminationScopeLegal = engine.legalSpace(eliminationScopeEnvelope, {
  seatAuthority: eliminationScopeCredentials.authority,
});
assert.equal(
  finiteAction(eliminationScopeLegal, OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE),
  undefined,
);
assert.ok(eliminationScopeLegal.disabledDiagnostics.some((entry) => (
  entry.disabledReason === "END_GAME_ARMY_TERMINAL_SCOPE_UNRESOLVED"
)));

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: scoringReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_SCORING_RUNTIME_HASH);
assert.equal(endGameSlice.ctx2skill.skillsGenerated.length, 0);
assert.equal(endGameSlice.ctx2skill.promotions.length, 0);
assert.equal(endGameSlice.trainingTruth, false);

const acceptance = [
  "catalogue_promotes_only_special_win_and_end_game_check_atoms",
  "latest_official_hold_position_special_lead_threshold_is_hash_bound",
  "both_armies_have_live_battlefield_witnesses_before_bounded_check",
  "non_terminal_score_advances_to_end_of_round_effects",
  "player1_lead_of_exactly_ten_ends_the_game",
  "player2_lead_of_exactly_ten_ends_the_game",
  "terminal_state_exposes_no_legal_actions_and_one_terminal_summary",
  "terminal_receipt_is_ed25519_signed",
  "three_step_cleanup_prefix_replays_exactly",
  "opponent_model_can_preview_but_cannot_confirm_or_apply",
  "tampered_scoring_history_fails_closed",
  "army_elimination_scope_is_not_silently_ignored",
  "round_limit_and_final_scoring_are_not_claimed",
  "historical_scoring_catalogue_and_runtime_remain_frozen",
  "no_skill_dsh_muzero_or_training_promotion_occurs",
];
const report = {
  schema: "starcraft_tmg_official_hold_position_end_game_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  missionScoringProfileHash: gameplayDataBundle.missionScoringProfile.missionScoringProfileHash,
  slice: endGameSlice,
  audit,
  runtime: rulesRuntime.descriptor,
  historicalSliceHash: scoringReport.slice.sliceHash,
  historicalCatalogueHash: scoringReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: endGameSlice.ctx2skill,
  harness: endGameSlice.harness,
  rulesTruth: "official_hold_position_standard_round_two_special_lead_check_only",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-hold-position-end-game-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  officialSourceSnapshotHash: report.officialSourceSnapshotHash,
  officialDatasetHash: report.officialDatasetHash,
  dataVersions: report.dataVersions,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtomCount: report.audit.counts.executableRuleAtoms,
  newlyExecutableRuleAtomCount: report.audit.counts.newlyExecutableRuleAtoms,
  historicalSliceHash: report.historicalSliceHash,
  historicalCatalogueHash: report.historicalCatalogueHash,
  historicalRuntimeHash: report.historicalRuntimeHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));
