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
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v1.mjs";
import {
  createOfficialEndOfRoundEffectsRuleSliceV1,
  verifyOfficialEndOfRoundEffectsRuleSliceV1,
} from "../packages/rule-atoms/official-end-of-round-effects-rule-slice-v1.mjs";
import {
  OFFICIAL_HOLD_POSITION_END_GAME_ACTION_TYPE,
} from "../packages/rule-atoms/official-hold-position-end-game-executor-v1.mjs";
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
const HISTORICAL_END_GAME_SLICE_HASH =
  "fa488e3cf26cd88fa8a7c47402141868feb5429833f93848a2f9cc367b88f51a";
const HISTORICAL_END_GAME_CATALOGUE_HASH =
  "b6d22dc9a2bb0f8f8c377ba3368744760c0e686a73f0103f5dd3270694439c3c";
const HISTORICAL_END_GAME_RUNTIME_HASH =
  "58fac9defcb7639eba2e8822c6a284d593c3c5e88275d94d17298fb265a15b71";

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

function credentials(engine, envelope, suffix, options = {}) {
  const authority = engine.issueSeatAuthority({
    grantId: `eor-${suffix}-grant`,
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
    sessionId: `eor-${suffix}-session`,
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
    idempotencyKey: `eor-${suffix}`,
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

function disabledReason(engine, envelope, expectedReason, suffix) {
  const access = credentials(engine, envelope, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  assert.equal(
    legal.finiteActions.some((entry) => (
      entry.action.actionType === OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE
    )),
    false,
  );
  assert.ok(
    legal.disabledDiagnostics.some((entry) => entry.disabledReason === expectedReason),
    JSON.stringify(legal.disabledDiagnostics),
  );
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-hold-position-end-game-rule-slice-v1-report.json"),
  "utf8",
));
assert.equal(previousReport.slice.sliceHash, HISTORICAL_END_GAME_SLICE_HASH);
assert.equal(previousReport.slice.catalogueHash, HISTORICAL_END_GAME_CATALOGUE_HASH);
assert.equal(previousReport.runtime.runtimeHash, HISTORICAL_END_GAME_RUNTIME_HASH);
const acceptance = [];

const slice = createOfficialEndOfRoundEffectsRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialEndOfRoundEffectsRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 166);
assert.equal(audit.counts.newlyExecutableRuleAtoms, OFFICIAL_END_OF_ROUND_EFFECTS_NEW_ATOM_IDS.length);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 746);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_only_two_empty_window_atoms_without_order_atom");

const { snapshot, dataset } = await officialData();
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
});
assert.equal(gameplayDataBundle.sourceSnapshotHash, snapshot.snapshotHash);
assert.equal(gameplayDataBundle.normalizedDatasetHash, dataset.datasetHash);
assert.equal(
  gameplayDataBundle.combatProfileBundle.profiles[0].sourceRecordHash,
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
);
assert.equal(
  gameplayDataBundle.missionScoringProfile.sourceRecordHash,
  "70c391e589555f7b124a381572ad4b1272cb22b6fbcc6c140171e68ea1f18cfa",
);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("current_official_marine_and_hold_position_sources_are_hash_bound_without_fallback");
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
    keyId: "ticket-11-end-of-round-effects-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-end-of-round-effects-seal-v1",
  },
});
const initial = envelopeForState(
  engine,
  "official-end-of-round-empty-queue-room",
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
assert.equal(endGameStep.applied.envelope.state.gameOver, false);
const eorStep = applyFinite(
  engine,
  endGameStep.applied.envelope,
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  "empty-queue",
);
assert.equal(eorStep.finite.action.executorId, OFFICIAL_END_OF_ROUND_EFFECTS_EXECUTOR_ID);
assert.equal(eorStep.finite.action.effectQueueProof.effectCount, 0);
assert.equal(eorStep.finite.action.effectQueueProof.queueComplete, true);
assert.deepEqual(eorStep.finite.action.effectQueueProof.entries, []);
assert.deepEqual(
  eorStep.finite.action.effectQueueProof.excludedRuleAtomIds,
  ["rule-atom:end-of-round-effect-resolution-order"],
);
const proofBody = structuredClone(eorStep.finite.action.effectQueueProof);
delete proofBody.effectQueueProofHash;
assert.equal(
  hashStarcraftTmgContract(proofBody),
  eorStep.finite.action.effectQueueProofHash,
);
assert.equal(
  eorStep.applied.envelope.state.scoringCleanupProgress.currentStep,
  "cleanup_and_refresh",
);
assert.deepEqual(eorStep.applied.envelope.state.scores, { player1: 4, player2: 3 });
assert.equal(
  eorStep.applied.envelope.state.endOfRoundEffectHistory.at(-1).effectCount,
  0,
);
assert.equal(eorStep.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("complete_supported_empty_queue_is_proven_and_advances_to_cleanup_refresh");

const beforeEorState = endGameStep.applied.envelope.state;
assert.deepEqual(eorStep.applied.envelope.state.scores, beforeEorState.scores);
assert.deepEqual(eorStep.applied.envelope.state.pieces, beforeEorState.pieces);
assert.deepEqual(eorStep.applied.envelope.state.board, beforeEorState.board);
assert.deepEqual(eorStep.applied.envelope.state.cardResources, beforeEorState.cardResources);
assert.equal(eorStep.applied.receipt.events.length, 1);
assert.equal(
  eorStep.applied.receipt.events[0].type,
  "end_of_round_effect_window_resolved",
);
acceptance.push("empty_effect_window_preserves_gameplay_material_and_emits_one_auditable_event");

const unsupportedMutations = [
  ["selected-upgrade", (state) => state.pieces[0].selectedUpgradeNames.push("Stimpack")],
  ["status", (state) => state.pieces[0].statuses.push("temporary-status")],
  ["combat-effect", (state) => state.pieces[0].combatEffects.push("temporary-effect")],
  ["card-resource", (state) => state.cardResources.player1.push({ id: "card-1" })],
  ["effect-marker", (state) => state.board.effectMarkers.push({ id: "effect-marker-1" })],
  ["unknown-unit", (state) => {
    state.pieces[0].officialUnitRecordKey = "army_units:unknown";
  }],
];
for (const [suffix, mutate] of unsupportedMutations) {
  const state = structuredClone(beforeEorState);
  mutate(state);
  const envelope = envelopeForState(
    engine,
    `official-end-of-round-${suffix}-room`,
    snapshot,
    gameplayDataBundle,
    state,
  );
  disabledReason(
    engine,
    envelope,
    "END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED",
    suffix,
  );
}
acceptance.push("selected_upgrades_cards_statuses_effects_markers_and_unknown_units_fail_closed");

const wrongProgressState = structuredClone(beforeEorState);
wrongProgressState.scoringCleanupProgress.currentStep = "cleanup_and_refresh";
const wrongProgressEnvelope = envelopeForState(
  engine,
  "official-end-of-round-wrong-progress-room",
  snapshot,
  gameplayDataBundle,
  wrongProgressState,
);
disabledReason(
  engine,
  wrongProgressEnvelope,
  "END_OF_ROUND_EFFECTS_PROGRESS_INVALID",
  "wrong-progress",
);
acceptance.push("out_of_order_or_tampered_cleanup_progress_fails_closed");

const driftBundle = structuredClone(gameplayDataBundle);
driftBundle.combatProfileBundle.profiles[0].sourceRecordHash = "0".repeat(64);
driftBundle.combatProfileBundle.profilesByRecordKey = Object.fromEntries(
  driftBundle.combatProfileBundle.profiles.map((profile) => [profile.recordKey, profile]),
);
const {
  bundleHash: _oldCombatHash,
  profilesByRecordKey: _oldProfileIndex,
  ...combatBundleBody
} = driftBundle.combatProfileBundle;
driftBundle.combatProfileBundle.bundleHash = hashStarcraftTmgContract(combatBundleBody);
const { gameplayDataBundleHash: _oldGameplayHash, ...gameplayBundleBody } = driftBundle;
driftBundle.gameplayDataBundleHash = hashStarcraftTmgContract(gameplayBundleBody);
const driftMissionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle: driftBundle,
  missionDraftReceiptHash: missionSetupBinding.missionDraftReceiptHash,
  deploymentDraftReceiptHash: missionSetupBinding.deploymentDraftReceiptHash,
  seatColorAssignment: missionSetupBinding.seatColorAssignment,
});
const driftState = structuredClone(beforeEorState);
driftState.officialGameplayDataBundle = driftBundle;
driftState.officialMissionSetupBinding = driftMissionSetupBinding;
const driftEnvelope = envelopeForState(
  engine,
  "official-end-of-round-source-drift-room",
  snapshot,
  driftBundle,
  driftState,
);
disabledReason(
  engine,
  driftEnvelope,
  "END_OF_ROUND_EFFECTS_SOURCE_SCOPE_UNRESOLVED",
  "source-drift",
);
acceptance.push("official_unit_source_record_drift_requires_a_new_executor_version");

const opponent = credentials(
  engine,
  endGameStep.applied.envelope,
  "opponent",
  {
    roleMode: "opponent",
    principalType: "model",
    capabilities: ["read_legal_space", "preview", "apply"],
  },
);
const opponentLegal = engine.legalSpace(endGameStep.applied.envelope, {
  seatAuthority: opponent.authority,
});
const opponentFinite = opponentLegal.finiteActions.find((entry) => (
  entry.action.actionType === OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE
));
assert.ok(opponentFinite);
const opponentPreview = engine.preview({
  envelope: endGameStep.applied.envelope,
  seatAuthority: opponent.authority,
  proposal: { kind: "finite", actionKey: opponentFinite.actionKey },
});
assert.equal(opponentPreview.ok, true, JSON.stringify(opponentPreview));
assert.equal(opponentPreview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
const opponentApply = engine.apply({
  envelope: endGameStep.applied.envelope,
  expectedStateRevision: endGameStep.applied.envelope.stateRevision,
  preview: opponentPreview.preview,
  seatAuthority: opponent.authority,
  controlLease: opponent.lease,
  idempotencyKey: "ticket-11-eor-opponent-must-not-apply",
});
assert.equal(opponentApply.ok, false);
assert.equal(opponentApply.reason, "CAPABILITY_DENIED");
acceptance.push("opponent_model_can_preview_but_cannot_confirm_or_apply");

const replayEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: runtime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
  cryptoOptions: {
    keyId: "ticket-11-end-of-round-effects-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-end-of-round-effects-rotated-seal-v2",
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
];
const rotatedReplay = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(rotatedReplay.ok, true, JSON.stringify(rotatedReplay));
assert.equal(rotatedReplay.envelope.stateHash, eorStep.applied.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal.at(-1).events.push({ type: "forged_end_of_round_effect" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("four_step_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_END_GAME_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 164);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("historical_end_game_catalogue_runtime_and_display_contract_remain_frozen");
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_end_of_round_effects_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  supportedUnitSourceRecordHash:
    gameplayDataBundle.combatProfileBundle.profiles[0].sourceRecordHash,
  supportedMissionSourceRecordHash:
    gameplayDataBundle.missionScoringProfile.sourceRecordHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_supported_complete_empty_end_of_round_effect_queue_only",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-end-of-round-effects-rule-slice-v1-report.json"),
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
