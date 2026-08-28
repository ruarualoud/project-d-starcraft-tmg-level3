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
  OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID,
  OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-cleanup-refresh-executor-v1.mjs";
import {
  createOfficialCleanupRefreshRuleSliceV1,
  verifyOfficialCleanupRefreshRuleSliceV1,
} from "../packages/rule-atoms/official-cleanup-refresh-rule-slice-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE } from "../packages/rule-atoms/official-hold-position-end-game-executor-v1.mjs";
import { OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE } from "../packages/rule-atoms/official-mission-marker-control-executor-v2.mjs";
import { createOfficialSupplyLossLedgerV1 } from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import { OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE } from "../packages/rule-atoms/official-victory-point-scoring-executor-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
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
const HISTORICAL_EOR_SLICE_HASH =
  "9e5609659d0f51d1dd696ce56f746b6ae27e5aaa4ab7cb01a12635f69b8d78de";
const HISTORICAL_EOR_CATALOGUE_HASH =
  "0a697bcbc01cea1f3bd44ea1be06a33e8c4103f4c7a05e4d3ebf2b3d6da42e9c";
const HISTORICAL_EOR_RUNTIME_HASH =
  "a331acde4d25a2a121f6b0707e6a34828370c768510487fdcfc40b47e872a85f";
const ACADEMY_RECORD_KEY = "tactical_cards:academy";
const ACADEMY_SOURCE_RECORD_HASH =
  "fa44c19baa21f3c6c9d983a11b61cd9e8e7ed5904e74fea2cbca7931109fc939";
const TERRAN_ARMED_FORCES_RECORD_KEY = "tactical_cards:terran_armed_forces";
const TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH =
  "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5";

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

function liveMarine(id, sideKey, xInches, yInches, damageMarker) {
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
    damageMarker,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [liveModel(`${id}-model`, xInches, yInches)],
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

function cardResource(input) {
  return {
    id: input.id,
    sideKey: input.sideKey,
    cardKind: input.cardKind,
    officialCardRecordKey: input.officialCardRecordKey,
    sourceRecordHash: input.sourceRecordHash,
    readiness: input.readiness,
    face: input.readiness === "exhausted" ? "down" : "up",
    activeEffects: [],
  };
}

function cleanupState(input) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: { combat: "player1" },
    phaseFirstActorByRound: {
      "2:movement": "player1",
      "2:assault": "player2",
      "2:combat": "player1",
    },
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: { player1: 0, player2: 0 },
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
      missionMarkers: [
        marker(1, "player1"),
        marker(2, "player1"),
        marker(3, "player2"),
        marker(4, "player2"),
        marker(5, "player1"),
      ],
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
      tokens: [],
      markers: [],
    },
    cardResources: {
      player1: [
        cardResource({
          id: "p1-academy",
          sideKey: "player1",
          cardKind: "tactical",
          officialCardRecordKey: ACADEMY_RECORD_KEY,
          sourceRecordHash: ACADEMY_SOURCE_RECORD_HASH,
          readiness: "exhausted",
        }),
        cardResource({
          id: "p1-terran-armed-forces",
          sideKey: "player1",
          cardKind: "faction",
          officialCardRecordKey: TERRAN_ARMED_FORCES_RECORD_KEY,
          sourceRecordHash: TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH,
          readiness: "ready",
        }),
      ],
      player2: [
        cardResource({
          id: "p2-academy",
          sideKey: "player2",
          cardKind: "tactical",
          officialCardRecordKey: ACADEMY_RECORD_KEY,
          sourceRecordHash: ACADEMY_SOURCE_RECORD_HASH,
          readiness: "ready",
        }),
        cardResource({
          id: "p2-terran-armed-forces",
          sideKey: "player2",
          cardKind: "faction",
          officialCardRecordKey: TERRAN_ARMED_FORCES_RECORD_KEY,
          sourceRecordHash: TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH,
          readiness: "exhausted",
        }),
      ],
    },
    pieces: [
      liveMarine("p1-live-unit", "player1", 0.63, 0.63, 2),
      liveMarine("p2-live-unit", "player2", 53.37, 11.37, 1),
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

function credentials(engine, envelope, suffix, options = {}) {
  const authority = engine.issueSeatAuthority({
    grantId: `cleanup-refresh-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: options.sideKey || "player1",
    roleMode: options.roleMode || "player",
    principalType: options.principalType || "human",
    capabilities: options.capabilities
      || ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `cleanup-refresh-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, actionType, suffix) {
  const access = credentials(engine, envelope, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legal.finiteActions.find((entry) => entry.action.actionType === actionType);
  assert.ok(finite, `${actionType} missing: ${JSON.stringify(legal.disabledDiagnostics)}`);
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
    idempotencyKey: `cleanup-refresh-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { finite, preview, confirmed, applied };
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

function disabledReason(engine, envelope, actionType, expectedReason, suffix) {
  const access = credentials(engine, envelope, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  assert.equal(
    legal.finiteActions.some((entry) => entry.action.actionType === actionType),
    false,
  );
  assert.ok(
    legal.disabledDiagnostics.some((entry) => (
      entry.action?.actionType === actionType && entry.disabledReason === expectedReason
    )),
    JSON.stringify(legal.disabledDiagnostics),
  );
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-end-of-round-effects-rule-slice-v1-report.json"),
  "utf8",
));
assert.equal(previousReport.slice.sliceHash, HISTORICAL_EOR_SLICE_HASH);
assert.equal(previousReport.slice.catalogueHash, HISTORICAL_EOR_CATALOGUE_HASH);
assert.equal(previousReport.runtime.runtimeHash, HISTORICAL_EOR_RUNTIME_HASH);
const acceptance = [];

const slice = createOfficialCleanupRefreshRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialCleanupRefreshRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 170);
assert.equal(audit.counts.newlyExecutableRuleAtoms, OFFICIAL_CLEANUP_REFRESH_NEW_ATOM_IDS.length);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 742);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_only_four_cleanup_refresh_atoms_and_version_reassigns_eor");

const { snapshot, dataset } = await officialData();
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [ACADEMY_RECORD_KEY, TERRAN_ARMED_FORCES_RECORD_KEY],
});
assert.equal(gameplayDataBundle.sourceSnapshotHash, snapshot.snapshotHash);
assert.equal(gameplayDataBundle.normalizedDatasetHash, dataset.datasetHash);
assert.deepEqual(
  gameplayDataBundle.cleanupCardBundle.profiles.map((profile) => ({
    recordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    cardKind: profile.cardKind,
    endOfRoundEffectCount: profile.endOfRoundEffects.length,
  })),
  [
    {
      recordKey: ACADEMY_RECORD_KEY,
      sourceRecordHash: ACADEMY_SOURCE_RECORD_HASH,
      cardKind: "tactical",
      endOfRoundEffectCount: 0,
    },
    {
      recordKey: TERRAN_ARMED_FORCES_RECORD_KEY,
      sourceRecordHash: TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH,
      cardKind: "faction",
      endOfRoundEffectCount: 0,
    },
  ],
);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("current_official_cards_are_exactly_hash_bound_without_repository_fallback");

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
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: runtime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-cleanup-refresh-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-cleanup-refresh-seal-v1",
  },
});
const initial = envelopeForState(
  engine,
  "official-cleanup-refresh-room",
  snapshot,
  gameplayDataBundle,
  cleanupState({ gameplayDataBundle, missionSetupBinding, supplyLossLedger }),
);
const markerStep = applyFinite(
  engine,
  initial,
  OFFICIAL_MISSION_MARKER_CONTROL_V2_ACTION_TYPE,
  "marker",
);
const scoringStep = applyFinite(
  engine,
  markerStep.applied.envelope,
  OFFICIAL_VICTORY_POINT_SCORING_ACTION_TYPE,
  "scoring",
);
const endGameStep = applyFinite(
  engine,
  scoringStep.applied.envelope,
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
  "end-game",
);
const eorStep = applyFinite(
  engine,
  endGameStep.applied.envelope,
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  "eor-with-cards",
);
assert.equal(eorStep.finite.action.executorId, OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID);
assert.equal(eorStep.finite.action.effectQueueProof.effectCount, 0);
assert.equal(eorStep.finite.action.effectQueueProof.sourceCoverage.cardSourcesComplete, true);
assert.equal(eorStep.finite.action.effectQueueProof.cardSourceMaterial.length, 4);
assert.equal(
  eorStep.applied.envelope.state.scoringCleanupProgress.currentStep,
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
);
acceptance.push("eor_v2_proves_exact_supported_cards_have_no_active_end_of_round_effects");

const beforeCleanup = structuredClone(eorStep.applied.envelope.state);
const cleanupStep = applyFinite(
  engine,
  eorStep.applied.envelope,
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
  "cleanup-refresh",
);
assert.equal(cleanupStep.finite.action.executorId, OFFICIAL_CLEANUP_REFRESH_EXECUTOR_ID);
assert.equal(cleanupStep.preview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const afterCleanup = cleanupStep.applied.envelope.state;
assert.equal(afterCleanup.scoringCleanupProgress.currentStep, "determine_initiative");
assert.equal(afterCleanup.activeSideKey, null);
assert.deepEqual(afterCleanup.firstPassSideByPhase, {});
assert.deepEqual(afterCleanup.players.player1.passedPhases, {});
assert.deepEqual(afterCleanup.players.player2.passedPhases, {});
assert.deepEqual(afterCleanup.phaseFirstActorByRound, beforeCleanup.phaseFirstActorByRound);
assert.ok(afterCleanup.pieces.every((piece) => (
  piece.activatedPhases.movement === false
    && piece.activatedPhases.assault === false
    && piece.activatedPhases.combat === false
)));
assert.ok(Object.values(afterCleanup.cardResources).flat().every((card) => (
  card.readiness === "ready" && card.face === "up"
)));
assert.deepEqual(afterCleanup.scores, beforeCleanup.scores);
assert.deepEqual(afterCleanup.board, beforeCleanup.board);
assert.deepEqual(
  afterCleanup.pieces.map((piece) => ({
    id: piece.id,
    currentModels: piece.currentModels,
    currentSupply: piece.currentSupply,
    damageMarker: piece.damageMarker,
    models: piece.models,
  })),
  beforeCleanup.pieces.map((piece) => ({
    id: piece.id,
    currentModels: piece.currentModels,
    currentSupply: piece.currentSupply,
    damageMarker: piece.damageMarker,
    models: piece.models,
  })),
);
assert.equal(afterCleanup.cleanupRefreshHistory.at(-1).trainingTruth, false);
assert.equal(cleanupStep.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("cleanup_resets_round_state_refreshes_cards_and_preserves_board_damage_score_history");

const invalidEorMutations = [
  ["unknown-card-source", (state) => {
    state.cardResources.player1[0].sourceRecordHash = "0".repeat(64);
  }],
  ["face-readiness-mismatch", (state) => {
    state.cardResources.player1[0].face = "up";
  }],
  ["active-card-effect", (state) => {
    state.cardResources.player1[0].activeEffects.push({ id: "unknown-effect" });
  }],
  ["piece-status", (state) => state.pieces[0].statuses.push("temporary-status")],
  ["effect-marker", (state) => state.board.effectMarkers.push({ id: "effect-marker-1" })],
];
for (const [suffix, mutate] of invalidEorMutations) {
  const state = structuredClone(endGameStep.applied.envelope.state);
  mutate(state);
  disabledReason(
    engine,
    envelopeForState(engine, `cleanup-invalid-eor-${suffix}`, snapshot, gameplayDataBundle, state),
    OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
    "END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED",
    `invalid-eor-${suffix}`,
  );
}
acceptance.push("unknown_cards_mismatched_faces_active_effects_statuses_and_effect_markers_fail_closed");

for (const [suffix, field] of [["token", "tokens"], ["marker", "markers"]]) {
  const state = structuredClone(beforeCleanup);
  state.board[field].push({ id: `unsupported-${suffix}` });
  disabledReason(
    engine,
    envelopeForState(engine, `cleanup-unsupported-${suffix}`, snapshot, gameplayDataBundle, state),
    OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
    "CLEANUP_REFRESH_SOURCE_SCOPE_UNRESOLVED",
    `unsupported-${suffix}`,
  );
}
acceptance.push("generic_token_and_marker_denominators_fail_closed_until_creation_lineage_exists");

const enumeratedCleanup = runtime.enumerate(beforeCleanup, {
  sideKey: "player1",
  includeDisabled: false,
  matchBinding: eorStep.applied.envelope.matchBinding,
}).candidates.find((candidate) => candidate.actionType === OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE);
assert.ok(enumeratedCleanup);
const staleCleanupState = structuredClone(beforeCleanup);
staleCleanupState.cardResources.player1[0].readiness = "ready";
staleCleanupState.cardResources.player1[0].face = "up";
assert.throws(
  () => runtime.apply(staleCleanupState, enumeratedCleanup, {
    postRevision: 5,
    matchBinding: eorStep.applied.envelope.matchBinding,
  }),
  /CLEANUP_REFRESH_RESOLUTION_STALE/u,
);
acceptance.push("cleanup_resolution_is_state_bound_and_rejects_stale_card_material");

const wrongProgress = structuredClone(beforeCleanup);
wrongProgress.scoringCleanupProgress.currentStep = "determine_initiative";
disabledReason(
  engine,
  envelopeForState(engine, "cleanup-wrong-progress", snapshot, gameplayDataBundle, wrongProgress),
  OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE,
  "CLEANUP_REFRESH_PROGRESS_INVALID",
  "wrong-progress",
);
acceptance.push("out_of_order_or_tampered_cleanup_progress_fails_closed");

const opponent = credentials(engine, eorStep.applied.envelope, "opponent", {
  roleMode: "opponent",
  principalType: "model",
  capabilities: ["read_legal_space", "preview", "apply"],
});
const opponentLegal = engine.legalSpace(eorStep.applied.envelope, {
  seatAuthority: opponent.authority,
});
const opponentFinite = opponentLegal.finiteActions.find((entry) => (
  entry.action.actionType === OFFICIAL_CLEANUP_REFRESH_ACTION_TYPE
));
assert.ok(opponentFinite);
const opponentPreview = engine.preview({
  envelope: eorStep.applied.envelope,
  seatAuthority: opponent.authority,
  proposal: { kind: "finite", actionKey: opponentFinite.actionKey },
});
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const opponentApply = engine.apply({
  envelope: eorStep.applied.envelope,
  expectedStateRevision: eorStep.applied.envelope.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponent.authority,
  controlLease: opponent.lease,
  idempotencyKey: "ticket-11-cleanup-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");
acceptance.push("opponent_model_can_preview_but_cannot_confirm_or_apply_cleanup");

const replayEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: runtime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-cleanup-refresh-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-cleanup-refresh-rotated-seal-v2",
  },
});
for (const [kind, content] of [
  ["sourceSnapshot", snapshot],
  ["dataSnapshot", gameplayDataBundle],
  ["rulesArtifact", {
    kind: "rules-artifact",
    rulesVersion: runtime.descriptor.rulesVersion,
    rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
  }],
  ["executorArtifact", {
    kind: "executor-artifact",
    authorityVersion: "starcraft_tmg_authority_v2",
    rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
    catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
    executorManifest: runtime.descriptor.executorManifest,
  }],
  ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "fixed_point_round_base_v1" }],
  ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v1" }],
]) {
  replayEngine.registerDependency({
    kind,
    artifactId: initial.matchBinding.dependencies[kind].artifactId,
    content,
  });
}
replayEngine.registerDependency({
  kind: "rulesDisplay",
  artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
  mediaType: "text/markdown",
  locale: "en",
  content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
});
const journal = [
  markerStep.applied.receipt,
  scoringStep.applied.receipt,
  endGameStep.applied.receipt,
  eorStep.applied.receipt,
  cleanupStep.applied.receipt,
];
const rotatedReplay = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(rotatedReplay.ok, true, JSON.stringify(rotatedReplay));
assert.equal(rotatedReplay.envelope.stateHash, cleanupStep.applied.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal.at(-1).events.push({ type: "forged_cleanup_refresh" });
const tamperedReplay = replayEngine.replay({ initialEnvelope: initial, journal: tamperedJournal });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("five_step_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_EOR_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 166);
acceptance.push("historical_slice14_catalogue_runtime_and_rules_display_remain_frozen");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_cleanup_refresh_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  supportedCardSourceRecordHashes: {
    [ACADEMY_RECORD_KEY]: ACADEMY_SOURCE_RECORD_HASH,
    [TERRAN_ARMED_FORCES_RECORD_KEY]: TERRAN_ARMED_FORCES_SOURCE_RECORD_HASH,
  },
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_supported_cleanup_refresh_with_exact_current_cards_only",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-cleanup-refresh-rule-slice-v1-report.json"),
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
