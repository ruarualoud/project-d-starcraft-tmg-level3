#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
} from "../packages/rule-atoms/official-cleanup-refresh-executor-v1.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
} from "../packages/rule-atoms/official-determine-initiative-executor-v1.mjs";
import {
  createOfficialDetermineInitiativeRuleSliceV1,
  verifyOfficialDetermineInitiativeRuleSliceV1,
} from "../packages/rule-atoms/official-determine-initiative-rule-slice-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from "../packages/rule-atoms/official-hold-position-end-game-executor-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from "../packages/rule-atoms/official-mission-marker-control-executor-v2.mjs";
import { createOfficialSupplyLossLedgerV1 } from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from "../packages/rule-atoms/official-victory-point-scoring-executor-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from "../packages/source-data/official-mission-setup-binding-v1.mjs";

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
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);
const HASH_E = "e".repeat(64);

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

function postCleanupState(input = {}) {
  const round = Number(input.round || 2);
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      [`${round}:movement`]: {
        round,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: structuredClone(input.scores || { player1: 5, player2: 3 }),
    supplyDestroyedThisRound: { player1: 2, player2: 1 },
    scoringResolvedThisPhase: { player1: true, player2: true },
    officialGameplayDataBundle: input.gameplayDataBundle,
    officialMissionSetupBinding: input.missionSetupBinding,
    supplyLossLedger: structuredClone(input.supplyLossLedger),
    scoringCleanupProgress: {
      schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
      round,
      completedSteps: [
        OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
        OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
        OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
        OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
        OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
      ],
      currentStep: OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
      initiatingSideKey: "player1",
      controlResolutionHash: HASH_A,
      scoringResolutionHash: HASH_B,
      endGameResolutionHash: HASH_C,
      effectQueueProofHash: HASH_D,
      cleanupResolutionHash: HASH_E,
      trainingTruth: false,
    },
    cleanupRefreshHistory: [{
      schema: "starcraft_tmg_official_cleanup_refresh_history_entry_v1",
      round,
      cleanupResolutionHash: HASH_E,
      preCleanupMaterialHash: HASH_A,
      retainedMaterialHash: HASH_B,
      refreshedCardCount: 0,
      resetActivationPieceCount: 2,
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
      {
        id: "p1-live-unit",
        sideKey: "player1",
        currentModels: 1,
        currentSupply: 0,
        isOnField: true,
        isDestroyed: false,
        activatedPhases: { movement: false, assault: false, combat: false },
      },
      {
        id: "p2-live-unit",
        sideKey: "player2",
        currentModels: 1,
        currentSupply: 0,
        isOnField: true,
        isDestroyed: false,
        activatedPhases: { movement: false, assault: false, combat: false },
      },
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function credentials(engine, envelope, sideKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `determine-initiative-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `determine-initiative-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function envelopeForState(engine, roomId, snapshot, gameplayDataBundle, state) {
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

function assertDisabled(engine, envelope, sideKey, expectedReason, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  assert.equal(legal.finiteActions.some((entry) => (
    entry.action.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
  )), false);
  if (expectedReason) {
    assert.ok(legal.disabledDiagnostics.some((entry) => (
      entry.action?.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
        && entry.disabledReason === expectedReason
    )), `${suffix}:${expectedReason}:${JSON.stringify(legal.disabledDiagnostics)}`);
  }
}

function applyDetermine(engine, envelope, sideKey, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legal.finiteActions.find((entry) => (
    entry.action.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
  ));
  assert.ok(finite, JSON.stringify(legal.disabledDiagnostics));
  const preview = engine.preview({
    envelope,
    seatAuthority: access.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: access.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: access.authority,
    controlLease: access.lease,
    idempotencyKey: `determine-initiative-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { finite, preview, confirmed, applied };
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-cleanup-refresh-rule-slice-v1-report.json"),
  "utf8",
));
const acceptance = [];
const slice = createOfficialDetermineInitiativeRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialDetermineInitiativeRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 176);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 736);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_only_six_determine_initiative_atoms");

const { snapshot, dataset } = await officialData();
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
});
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
assert.equal(gameplayDataBundle.missionScoringProfile.extraSupplyPerRound, 2);
assert.equal(gameplayDataBundle.missionScoringProfile.markerScoringStartsRound, 2);
acceptance.push("latest_official_hold_position_data_is_hash_bound_without_repository_fallback");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
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
  rulesRuntimeHash: runtime.descriptor.runtimeHash,
});
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-determine-initiative-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function createTiedEnvelope(candidateEngine) {
  return candidateEngine.createEnvelope({
    roomId: "official-determine-initiative-tied-room",
    dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
      dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
    },
    state: postCleanupState({
      gameplayDataBundle,
      missionSetupBinding,
      supplyLossLedger,
      scores: { player1: 4, player2: 4 },
    }),
  });
}

function firstTieFixture() {
  for (let candidateIndex = 0; candidateIndex < 4_096; candidateIndex += 1) {
    const hmacSecret = `ticket-11-determine-initiative-tie-fixture-${candidateIndex}`;
    const candidateEngine = authoritativeEngine(hmacSecret);
    const envelope = createTiedEnvelope(candidateEngine);
    const candidateAccess = credentials(candidateEngine, envelope, "player1", "tie-search");
    const candidateLegal = candidateEngine.legalSpace(envelope, {
      seatAuthority: candidateAccess.authority,
    });
    const candidateAction = candidateLegal.finiteActions.find((entry) => (
      entry.action.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
    ));
    assert.ok(candidateAction, JSON.stringify(candidateLegal.disabledDiagnostics));
    const candidatePreview = candidateEngine.preview({
      envelope,
      seatAuthority: candidateAccess.authority,
      proposal: { kind: "finite", actionKey: candidateAction.actionKey },
    });
    assert.equal(candidatePreview.ok, true, JSON.stringify(candidatePreview));
    const outcomes = candidatePreview.preview.core.chanceTicket.tickets.map((ticket) => {
      const revealed = candidateEngine.revealChanceTicket(ticket);
      assert.equal(revealed.ok, true, JSON.stringify(revealed));
      return revealed.outcome;
    });
    if (outcomes[0] + outcomes[1] === outcomes[2] + outcomes[3]) {
      return { engine: candidateEngine, envelope, outcomes };
    }
  }
  throw new Error("DETERMINE_INITIATIVE_TIE_FIXTURE_NOT_FOUND");
}

const engine = authoritativeEngine("ticket-11-determine-initiative-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-determine-initiative-trailing-player-room",
  dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
  },
  state: postCleanupState({ gameplayDataBundle, missionSetupBinding, supplyLossLedger }),
});
const access = credentials(engine, initial, "player1", "trailing-player");
const legal = engine.legalSpace(initial, { seatAuthority: access.authority });
const finite = legal.finiteActions.find((entry) => (
  entry.action.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
));
assert.ok(finite, JSON.stringify(legal.disabledDiagnostics));
assert.equal(finite.action.executorId, OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID);
assert.equal(finite.action.chance, undefined);
const preview = engine.preview({
  envelope: initial,
  seatAuthority: access.authority,
  proposal: { kind: "finite", actionKey: finite.actionKey },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
assert.equal(preview.preview.core.chanceTicket, null);
const confirmed = engine.confirmPreview({
  envelope: initial,
  preview: preview.preview,
  seatAuthority: access.authority,
});
assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
const applied = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "determine-initiative-trailing-player",
});
assert.equal(applied.ok, true, JSON.stringify(applied));
assert.equal(applied.envelope.state.round, 3);
assert.equal(applied.envelope.state.phase, "start_of_round");
assert.equal(applied.envelope.state.firstPlayerSideKey, "player2");
assert.equal(applied.envelope.state.activeSideKey, null);
assert.equal(applied.envelope.state.scoringCleanupProgress, undefined);
assert.equal(applied.envelope.state.supplyLossLedger.round, 3);
assert.deepEqual(applied.envelope.state.supplyDestroyedThisRound, {
  player1: 0,
  player2: 0,
});
assert.deepEqual(applied.envelope.state.scoringResolvedThisPhase, {
  player1: false,
  player2: false,
});
const nextAccess = credentials(engine, applied.envelope, "player2", "start-of-round-closed");
const nextLegal = engine.legalSpace(applied.envelope, {
  seatAuthority: nextAccess.authority,
});
assert.equal(nextLegal.finiteActions.filter((entry) => (
  entry.action.actionType === "choose_first_actor"
)).length, 0);
acceptance.push("lower_vp_receives_marker_and_round_advances_to_closed_start_window");

const tieFixture = firstTieFixture();
const tiedEngine = tieFixture.engine;
const tiedInitial = tieFixture.envelope;
const tiedAccess = credentials(tiedEngine, tiedInitial, "player1", "tied-preview");
const tiedLegal = tiedEngine.legalSpace(tiedInitial, { seatAuthority: tiedAccess.authority });
const tiedFinite = tiedLegal.finiteActions.find((entry) => (
  entry.action.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
));
assert.ok(tiedFinite, JSON.stringify(tiedLegal.disabledDiagnostics));
assert.deepEqual(tiedFinite.action.chance, {
  kind: "fixed_roll_sequence",
  faces: 6,
  count: 4,
  layout: { initiativePlayer1: 2, initiativePlayer2: 2 },
});
const tiedPreview = tiedEngine.preview({
  envelope: tiedInitial,
  seatAuthority: tiedAccess.authority,
  proposal: { kind: "finite", actionKey: tiedFinite.actionKey },
});
assert.equal(tiedPreview.ok, true, JSON.stringify(tiedPreview));
assert.equal(tiedPreview.preview.core.result.chancePending, true);
assert.deepEqual(tiedPreview.preview.core.result.events, []);
assert.equal(tiedPreview.preview.core.chanceTicket.outcomesHidden, true);
assert.equal(tiedPreview.preview.core.chanceTicket.tickets.length, 4);
assert.ok(tiedPreview.preview.core.chanceTicket.tickets.every((ticket) => (
  ticket.outcomeHidden === true && ticket.outcome === undefined
)));
const tiedConfirmed = tiedEngine.confirmPreview({
  envelope: tiedInitial,
  preview: tiedPreview.preview,
  seatAuthority: tiedAccess.authority,
});
assert.equal(tiedConfirmed.ok, true, JSON.stringify(tiedConfirmed));
const tiedApplied = tiedEngine.apply({
  envelope: tiedInitial,
  expectedStateRevision: tiedInitial.stateRevision,
  preview: tiedPreview.preview,
  confirmation: tiedConfirmed.confirmation,
  seatAuthority: tiedAccess.authority,
  controlLease: tiedAccess.lease,
  idempotencyKey: "determine-initiative-tied-attempt-1",
});
assert.equal(tiedApplied.ok, true, JSON.stringify(tiedApplied));
assert.equal(tiedApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(tiedApplied.receipt.chanceReveal.shortTermSeal, "hmac_sha256_chance_outcome");
assert.equal(tiedApplied.receipt.chanceReveal.longTermIntegrity, "accepted_receipt_ed25519_signature");
const tiedRolls = tiedApplied.receipt.chanceReveal.reveals.map((reveal) => reveal.outcome);
assert.equal(tiedRolls.length, 4);
assert.ok(tiedRolls.every((roll) => Number.isSafeInteger(roll) && roll >= 1 && roll <= 6));
assert.deepEqual(tiedRolls, tieFixture.outcomes);
const tiedPlayer1Total = tiedRolls[0] + tiedRolls[1];
const tiedPlayer2Total = tiedRolls[2] + tiedRolls[3];
assert.equal(tiedPlayer1Total, tiedPlayer2Total);
assert.equal(tiedApplied.envelope.state.round, 2);
assert.equal(tiedApplied.envelope.state.phase, "cleanup");
assert.equal(tiedApplied.envelope.state.firstPlayerSideKey, "player1");
assert.equal(
  tiedApplied.envelope.state.scoringCleanupProgress.currentStep,
  OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE,
);
assert.equal(tiedApplied.envelope.state.scoringCleanupProgress.initiativeRollOffAttempt, 1);
const tiedAttemptReceipts = [tiedApplied.receipt];
const tiedAttemptRolls = [tiedRolls];
let tiedEnvelope = tiedApplied.envelope;
let previousChanceBundleHash = tiedApplied.receipt.chanceReveal.ticketBundleHash;
while (tiedEnvelope.state.phase === "cleanup") {
  assert.ok(tiedAttemptReceipts.length < 32, "deterministic tie retry fixture did not terminate");
  const attemptNumber = tiedAttemptReceipts.length + 1;
  const retryAccess = credentials(tiedEngine, tiedEnvelope, "player1", `tied-retry-${attemptNumber}`);
  const retryLegal = tiedEngine.legalSpace(tiedEnvelope, { seatAuthority: retryAccess.authority });
  const retryFinite = retryLegal.finiteActions.find((entry) => (
    entry.action.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
  ));
  assert.ok(retryFinite, JSON.stringify(retryLegal.disabledDiagnostics));
  assert.equal(retryFinite.action.initiativeResolution.rollOffAttempt, attemptNumber);
  const retryPreview = tiedEngine.preview({
    envelope: tiedEnvelope,
    seatAuthority: retryAccess.authority,
    proposal: { kind: "finite", actionKey: retryFinite.actionKey },
  });
  assert.equal(retryPreview.ok, true, JSON.stringify(retryPreview));
  assert.notEqual(retryPreview.preview.core.chanceTicket.bundleHash, previousChanceBundleHash);
  assert.equal(retryPreview.preview.core.chanceTicket.outcomesHidden, true);
  const retryConfirmed = tiedEngine.confirmPreview({
    envelope: tiedEnvelope,
    preview: retryPreview.preview,
    seatAuthority: retryAccess.authority,
  });
  assert.equal(retryConfirmed.ok, true, JSON.stringify(retryConfirmed));
  const retryApplied = tiedEngine.apply({
    envelope: tiedEnvelope,
    expectedStateRevision: tiedEnvelope.stateRevision,
    preview: retryPreview.preview,
    confirmation: retryConfirmed.confirmation,
    seatAuthority: retryAccess.authority,
    controlLease: retryAccess.lease,
    idempotencyKey: `determine-initiative-tied-attempt-${attemptNumber}`,
  });
  assert.equal(retryApplied.ok, true, JSON.stringify(retryApplied));
  const retryRolls = retryApplied.receipt.chanceReveal.reveals
    .map((reveal) => reveal.outcome);
  tiedAttemptReceipts.push(retryApplied.receipt);
  tiedAttemptRolls.push(retryRolls);
  previousChanceBundleHash = retryApplied.receipt.chanceReveal.ticketBundleHash;
  tiedEnvelope = retryApplied.envelope;
}
assert.equal(tiedEnvelope.state.round, 3);
assert.equal(tiedEnvelope.state.phase, "start_of_round");
assert.equal(tiedEnvelope.state.initiativeRollOffHistory.length, tiedAttemptReceipts.length);
assert.equal(
  tiedEnvelope.state.determineInitiativeHistory.at(-1).rollOff.winnerSideKey,
  tiedEnvelope.state.firstPlayerSideKey,
);
acceptance.push("tied_vp_uses_hidden_two_d6_tickets_and_new_attempt_until_winner");

assertDisabled(
  engine,
  initial,
  "player2",
  "DETERMINE_INITIATIVE_FIRST_PLAYER_ONLY",
  "wrong-seat",
);
for (const [suffix, expectedReason, mutate] of [
  ["wrong-phase", null, (state) => {
    state.phase = "movement";
  }],
  ["active-side", "DETERMINE_INITIATIVE_STATE_INVALID", (state) => {
    state.activeSideKey = "player1";
  }],
  ["wrong-progress", "DETERMINE_INITIATIVE_PROGRESS_INVALID", (state) => {
    state.scoringCleanupProgress.currentStep = OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE;
  }],
  ["invalid-score", "DETERMINE_INITIATIVE_SCORE_INVALID", (state) => {
    state.scores.player1 = -1;
  }],
  ["terminal", null, (state) => {
    state.terminal = true;
    state.gameOver = true;
    state.winner = "player1";
    state.terminalReason = "fixture";
  }],
]) {
  const state = structuredClone(initial.state);
  mutate(state);
  assertDisabled(
    engine,
    envelopeForState(engine, `determine-initiative-${suffix}`, snapshot, gameplayDataBundle, state),
    "player1",
    expectedReason,
    suffix,
  );
}
acceptance.push("wrong_seat_phase_progress_score_active_or_terminal_state_fails_closed");

const round4Ledger = createOfficialSupplyLossLedgerV1({
  round: 4,
  rulesRuntimeHash: runtime.descriptor.runtimeHash,
});
const round4Initial = envelopeForState(
  engine,
  "determine-initiative-round-four",
  snapshot,
  gameplayDataBundle,
  postCleanupState({
    round: 4,
    gameplayDataBundle,
    missionSetupBinding,
    supplyLossLedger: round4Ledger,
    scores: { player1: 1, player2: 2 },
  }),
);
const round5 = applyDetermine(engine, round4Initial, "player1", "round-four-to-five");
assert.equal(round5.applied.envelope.state.round, 5);
assert.equal(round5.applied.envelope.state.phase, "start_of_round");
const unsupportedRound5State = postCleanupState({
  round: 5,
  gameplayDataBundle,
  missionSetupBinding,
  supplyLossLedger: createOfficialSupplyLossLedgerV1({
    round: 5,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  }),
});
assertDisabled(
  engine,
  envelopeForState(
    engine,
    "determine-initiative-round-five-unsupported",
    snapshot,
    gameplayDataBundle,
    unsupportedRound5State,
  ),
  "player1",
  "DETERMINE_INITIATIVE_ROUND_UNSUPPORTED",
  "round-five-unsupported",
);
acceptance.push("round_four_advances_to_round_five_but_post_round_five_advance_is_rejected");

const tiedRuntimeAction = runtime.enumerate(tiedInitial.state, {
  sideKey: "player1",
  includeDisabled: false,
  matchBinding: tiedInitial.matchBinding,
}).candidates.find((candidate) => (
  candidate.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
));
assert.ok(tiedRuntimeAction);
const {
  details: _tiedDetails,
  isEnabled: _tiedEnabled,
  disabledReason: _tiedDisabledReason,
  score: _tiedScore,
  ...tiedActionInput
} = tiedRuntimeAction;
assert.throws(
  () => runtime.apply(tiedInitial.state, tiedActionInput, {
    postRevision: 1,
    matchBinding: tiedInitial.matchBinding,
  }),
  /DETERMINE_INITIATIVE_CHANCE_REVEALS_REQUIRED/u,
);
assert.throws(
  () => runtime.apply(tiedInitial.state, tiedActionInput, {
    postRevision: 1,
    matchBinding: tiedInitial.matchBinding,
    chanceReveals: [
      { counter: 0, faces: 6, outcome: 1 },
      { counter: 1, faces: 6, outcome: 1 },
      { counter: 2, faces: 6, outcome: 1 },
      { counter: 4, faces: 6, outcome: 1 },
    ],
  }),
  /DETERMINE_INITIATIVE_CHANCE_REVEAL_INVALID/u,
);
const staleTiedState = structuredClone(tiedInitial.state);
staleTiedState.scores = { player1: 5, player2: 5 };
assert.throws(
  () => runtime.apply(staleTiedState, tiedActionInput, {
    postRevision: 1,
    matchBinding: tiedInitial.matchBinding,
    chanceReveals: tiedRolls.map((outcome, counter) => ({ counter, faces: 6, outcome })),
  }),
  /DETERMINE_INITIATIVE_RESOLUTION_STALE/u,
);
acceptance.push("missing_invalid_or_state_stale_roll_off_material_is_rejected");

const opponentAuthority = engine.issueSeatAuthority({
  grantId: "determine-initiative-opponent-grant",
  roomId: initial.roomId,
  matchBindingHash: initial.matchBindingHash,
  seatKey: "player1",
  roleMode: "opponent",
  principalType: "model",
  capabilities: ["read_legal_space", "preview", "apply"],
});
const opponentLease = engine.issueControlLease({
  seatAuthority: opponentAuthority,
  sessionId: "determine-initiative-opponent-session",
  leaseFence: 1,
  issuedAtRoomRevision: initial.stateRevision,
});
const opponentLegal = engine.legalSpace(initial, { seatAuthority: opponentAuthority });
const opponentFinite = opponentLegal.finiteActions.find((entry) => (
  entry.action.actionType === OFFICIAL_DETERMINE_INITIATIVE_ACTION_TYPE
));
assert.ok(opponentFinite);
const opponentPreview = engine.preview({
  envelope: initial,
  seatAuthority: opponentAuthority,
  proposal: { kind: "finite", actionKey: opponentFinite.actionKey },
});
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const opponentConfirm = engine.confirmPreview({
  envelope: initial,
  preview: opponentPreview.preview,
  seatAuthority: opponentAuthority,
});
assert.equal(opponentConfirm.ok, false);
assert.equal(opponentConfirm.reason, "CAPABILITY_DENIED");
const opponentApply = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponentAuthority,
  controlLease: opponentLease,
  idempotencyKey: "determine-initiative-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");
acceptance.push("opponent_model_can_preview_but_cannot_confirm_or_apply_initiative");

function registerReplayDependencies(replayEngine, envelope) {
  for (const [kind, content] of [
    ["sourceSnapshot", snapshot],
    ["dataSnapshot", gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: envelope.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: envelope.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: envelope.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "fixed_point_round_base_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v1" }],
  ]) {
    replayEngine.registerDependency({
      kind,
      artifactId: envelope.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  replayEngine.registerDependency({
    kind: "rulesDisplay",
    artifactId: envelope.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const replayEngine = authoritativeEngine("ticket-11-determine-initiative-rotated-seal-v2");
registerReplayDependencies(replayEngine, initial);
const deterministicReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: [applied.receipt],
});
assert.equal(deterministicReplay.ok, true, JSON.stringify(deterministicReplay));
assert.equal(deterministicReplay.envelope.stateHash, applied.envelope.stateHash);
const tiedReplay = replayEngine.replay({
  initialEnvelope: tiedInitial,
  journal: tiedAttemptReceipts,
});
assert.equal(tiedReplay.ok, true, JSON.stringify(tiedReplay));
assert.equal(tiedReplay.envelope.stateHash, tiedEnvelope.stateHash);
const tamperedJournal = structuredClone(tiedAttemptReceipts);
tamperedJournal[0].chanceReveal.reveals[0].outcome =
  tamperedJournal[0].chanceReveal.reveals[0].outcome === 6 ? 5 : 6;
const tamperedReplay = replayEngine.replay({
  initialEnvelope: tiedInitial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tampered_chance_receipt");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(
  historicalRuntime.descriptor.runtimeHash,
  "3bed86bac0c0f521f719171bda1d6b4b5933ba5187750d8552d885848a471ef4",
);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 170);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
acceptance.push("historical_slice15_catalogue_runtime_and_rules_display_remain_frozen");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_determine_initiative_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  liveOfficialRevalidation: {
    checkedAt: "2026-08-25T06:01:31.005Z",
    dataVersions: { cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" },
    officialProductCandidateCount: 83,
    officialProductGameplayDriftCount: 0,
    communityDisplayOnlyMetadataDrift: [
      {
        documentId: "3TLSupHClPWA8DGwSkhm",
        field: "upvotes",
        frozenValue: 58,
        liveValue: 59,
        liveUpdateTime: "2026-08-24T16:21:32.661613Z",
      },
      {
        documentId: "qbBhCOE79NqHUC1lz8eK",
        field: "upvotes",
        frozenValue: 8,
        liveValue: 9,
        liveUpdateTime: "2026-08-24T16:22:50.084324Z",
      },
    ],
    frozenFullRawSnapshotIsByteLatest: false,
    rulesInputImpact: "none_display_only_community_metadata_isolated",
    architectureGap:
      "separate_official_gameplay_projection_identity_from_community_display_hot_metadata",
  },
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  rollOffEvidence: {
    firstAttemptRolls: tiedRolls,
    firstAttemptTotals: { player1: tiedPlayer1Total, player2: tiedPlayer2Total },
    attemptRolls: tiedAttemptRolls,
    attemptCount: tiedAttemptRolls.length,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_determine_initiative_and_fail_closed_start_of_round_window",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-determine-initiative-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  firstTiedRolls: tiedRolls,
  tiedAttemptCount: tiedAttemptRolls.length,
  rulesEligible: false,
  trainingTruth: false,
}, null, 2));
