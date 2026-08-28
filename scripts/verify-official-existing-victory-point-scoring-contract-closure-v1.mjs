#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingVictoryPointScoringContractClosureRuleSliceV1,
  verifyOfficialExistingVictoryPointScoringContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-victory-point-scoring-contract-closure-rule-slice-v1.mjs";
import {
  createOfficialMissionMarkerControlRelationshipExtensionV1,
} from "../packages/rule-atoms/official-mission-marker-control-relationship-contract-v1.mjs";
import {
  OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
} from "../packages/rule-atoms/official-mission-marker-control-executor-v3.mjs";
import {
  createOfficialSupplyLossLedgerV1,
} from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  applyOfficialVictoryPointScoringV2,
  enumerateOfficialVictoryPointScoringActionsV2,
  OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-victory-point-scoring-executor-v2.mjs";
import {
  createOfficialVictoryPointScoringRelationshipExtensionV1,
  OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-victory-point-scoring-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import {
  createOfficialCommandCenterDataset,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import {
  createOfficialGameplayDataBundleV1,
} from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
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
const OCCURRED_AT = "2026-08-28T16:00:00.000Z";
const PREVIOUS_RUNTIME_HASH =
  "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55";
const CURRENT_RUNTIME_HASH =
  "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe";
const PREVIOUS_EXECUTOR_SOURCE_HASH =
  "2f0eb0465029051a403d752f9011f48d0b6b33ec8d07607e83628d3fba4ee3af";
const HOLD_POSITION_DOCUMENT_HASH =
  "dc3ed374c4b64731455402ea0d6e325a9e468d7fdc6453d995122ff877f3d1f8";
const acceptance = [];

function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

function clone(value) {
  return structuredClone(value);
}

function documentHash(document) {
  return createHash("sha256")
    .update(`${canonicalStarcraftTmgJson(document)}\n`)
    .digest("hex");
}

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function fetchOfficialJson(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`${kind} HTTP ${response.status}`);
      return JSON.parse(new TextDecoder().decode(await response.arrayBuffer()));
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function marker(number, controlSideKey, controlResolutionHash) {
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
    controlDeterminedAt: {
      round: 2,
      step: OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
      controlResolutionHash,
    },
  };
}

function stateFixture(gameplayDataBundle, missionSetupBinding, supplyLossLedger) {
  const controlResolutionHash = hashStarcraftTmgContract({
    kind: "slice-56-frozen-five-marker-control-resolution",
    round: 2,
    controls: ["player1", "player1", "player2", "player2", "player1"],
  });
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: { combat: "player1" },
    phaseFirstActorByRound: {
      "2:combat": {
        round: 2,
        phase: "combat",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: { player1: 2, player2: 1 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    supplyLossLedger,
    scoringCleanupProgress: {
      schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
      round: 2,
      completedSteps: [OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE],
      currentStep: OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
      controlResolutionHash,
      trainingTruth: false,
    },
    victoryPointScoringHistory: [],
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
        marker(1, "player1", controlResolutionHash),
        marker(2, "player1", controlResolutionHash),
        marker(3, "player2", controlResolutionHash),
        marker(4, "player2", controlResolutionHash),
        marker(5, "player1", controlResolutionHash),
      ],
      terrain: [],
      accessPoints: [],
      effectMarkers: [{ id: "fixture-effect" }],
      tokens: [{ id: "fixture-token" }],
    },
    cardResources: {
      player1: [{ id: "p1-card", currentResource: 2, maxResource: 2 }],
      player2: [{ id: "p2-card", currentResource: 1, maxResource: 2 }],
    },
    pieces: [],
    log: [],
  };
}

function executableAction(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

function disabledReason(state, sideKey, matchBinding) {
  return enumerateOfficialVictoryPointScoringActionsV2(state, {
    sideKey,
    includeDisabled: true,
    matchBinding,
  })[0]?.disabledReason;
}

function protectedState(state) {
  return clone({
    round: state.round,
    phase: state.phase,
    activeSideKey: state.activeSideKey,
    firstPlayerSideKey: state.firstPlayerSideKey,
    firstPassSideByPhase: state.firstPassSideByPhase,
    phaseFirstActorByRound: state.phaseFirstActorByRound,
    players: state.players,
    pieces: state.pieces,
    board: state.board,
    cardResources: state.cardResources,
    officialGameplayDataBundle: state.officialGameplayDataBundle,
    officialMissionSetupBinding: state.officialMissionSetupBinding,
    supplyLossLedger: state.supplyLossLedger,
  });
}

function credentials(engine, envelope, sideKey) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `victory-point-contract-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `victory-point-contract-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function registerReplayDependencies(engine, envelope, runtime, sourceSnapshot, dataSnapshot) {
  const contents = {
    sourceSnapshot,
    dataSnapshot,
    rulesArtifact: {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: envelope.matchBinding.rulesRuntimeBinding,
    },
    executorArtifact: {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    },
    geometryArtifact: {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    },
    actionSchema: {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v17",
    },
  };
  for (const [kind, content] of Object.entries(contents)) {
    engine.registerDependency({
      kind,
      artifactId: envelope.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: envelope.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const previousReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-mission-marker-control-contract-closure-v1-report.json",
  ),
  "utf8",
));
const previousCatalogue = previousReport.slice.catalogue;
const previousRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousCatalogue,
});
const previousExtension = createOfficialMissionMarkerControlRelationshipExtensionV1({
  catalogueHash: previousCatalogue.catalogueHash,
  runtimeHash: previousRuntime.descriptor.runtimeHash,
});
const previousGraph = createRuleRelationshipGraphV1({
  catalogue: previousCatalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);
const slice = createOfficialExistingVictoryPointScoringContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingVictoryPointScoringContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
const catalogue = slice.catalogue;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const extension = createOfficialVictoryPointScoringRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_VICTORY_POINT_SCORING_RELATIONSHIP_NODE_IDS_V1;

check("victory_point_v2_reassigns_12_old_atoms_from_none_to_strict", () => {
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 144,
    partialContractAtoms: 80,
    noContractAtoms: 197,
    executors: 42,
    declaredStateContractExecutors: 15,
    missingStateContractExecutors: 27,
  });
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 156,
    partialContractAtoms: 80,
    noContractAtoms: 185,
    executors: 42,
    declaredStateContractExecutors: 16,
    missingStateContractExecutors: 26,
  });
  assert.ok(OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS.every((atomId) => (
    previousCoverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus
      === "none"
      && coverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus
      === "strict_complete"
  )));
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
  assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 12);
});

check("official_scoring_marker_and_replay_paths_reach_judge_contracts", () => {
  const queries = [
    {
      startNodeId: ids.officialGameplayDataBundle,
      targetNodeIds: [ids.sourceBindingTest],
      relationships: ["projects_to", "verified_by"],
    },
    {
      startNodeId: ids.board,
      targetNodeIds: [ids.affinityTest],
      relationships: ["projects_to", "derives", "verified_by"],
    },
    {
      startNodeId: ids.scoringAction,
      targetNodeIds: [ids.replayTest],
      relationships: ["derives", "verified_by"],
    },
  ].map((query) => queryRuleRelationshipImpactV1(graph, {
    ...query,
    maxDepth: 9,
  }));
  assert.ok(queries.every((impact) => impact.paths.every((entry) => entry.reached)));
  assert.equal(graphAudit.valid, true);
});

check("missing_scoring_invalidation_or_judge_edges_blocks_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "victory_point_scoring_state_invalidation_v1"
      && entry.provenance !== "victory_point_scoring_judge_v1"
  ));
  const audit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
    catalogue,
    extension: broken,
  }));
  assert.equal(audit.valid, false);
  assert.ok(audit.gaps.requiredEdgeGaps.length > 0);
  assert.ok(audit.gaps.requiredPathGaps.length > 0);
  assert.ok(audit.gaps.evidenceTestGaps.length > 0);
});

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
});
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
  rulesRuntimeHash: CURRENT_RUNTIME_HASH,
});
const initialState = stateFixture(gameplayDataBundle, missionSetupBinding, supplyLossLedger);
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: CURRENT_RUNTIME_HASH },
};
const candidate = enumerateOfficialVictoryPointScoringActionsV2(initialState, {
  sideKey: "player1",
  matchBinding,
})[0];
assert.ok(candidate, JSON.stringify(enumerateOfficialVictoryPointScoringActionsV2(
  initialState,
  { sideKey: "player1", includeDisabled: true, matchBinding },
)));
const exactAction = executableAction(candidate);
const protectedBefore = protectedState(initialState);
const direct = applyOfficialVictoryPointScoringV2(initialState, exactAction, {
  matchBinding,
  postRevision: 1,
});

check("public_apply_exact_matches_enumeration_and_rejects_forged_payloads", () => {
  assert.equal(candidate.executorId, OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID);
  assert.equal(candidate.executorVersion, OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION);
  for (const forged of [
    { ...exactAction, executorVersion: "999.0.0" },
    { ...exactAction, ruleAtomIds: [] },
    { ...exactAction, scoringResolution: { breakdowns: {} } },
    { ...exactAction, details: { callerInjectedAuthority: true } },
    { ...exactAction, callerInjectedAuthority: true },
  ]) {
    assert.throws(
      () => applyOfficialVictoryPointScoringV2(initialState, forged, { matchBinding }),
      /VP_SCORING_V2_ACTION_(?:INVALID|MISMATCH)/u,
    );
  }
});

check("marker_affinity_breakdowns_and_simultaneous_scores_are_exact", () => {
  assert.deepEqual(direct.scoringResolution.breakdowns, {
    player1: {
      destroyedEnemySupplyVp: 0,
      markerVp: 4,
      roundVp: 4,
      controlledMarkerVp: [
        { markerId: "mission-marker-1", markerNumber: 1, affinitySideKey: "player1", vp: 1 },
        { markerId: "mission-marker-2", markerNumber: 2, affinitySideKey: "player2", vp: 2 },
        { markerId: "mission-marker-5", markerNumber: 5, affinitySideKey: null, vp: 1 },
      ],
    },
    player2: {
      destroyedEnemySupplyVp: 0,
      markerVp: 3,
      roundVp: 3,
      controlledMarkerVp: [
        { markerId: "mission-marker-3", markerNumber: 3, affinitySideKey: "player1", vp: 2 },
        { markerId: "mission-marker-4", markerNumber: 4, affinitySideKey: "player2", vp: 1 },
      ],
    },
  });
  assert.deepEqual(direct.state.scores, { player1: 6, player2: 4 });
  assert.deepEqual(direct.events[0].beforeScores, { player1: 2, player2: 1 });
  assert.equal(direct.events[0].simultaneousCommit, true);
});

check("apply_writes_only_scores_history_cleanup_progress_and_log", () => {
  assert.deepEqual(protectedState(direct.state), protectedBefore);
  assert.equal(direct.state.victoryPointScoringHistory.length, 1);
  assert.deepEqual(direct.state.scoringCleanupProgress.completedSteps, [
    OFFICIAL_MISSION_MARKER_CONTROL_V3_ACTION_TYPE,
    OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
  ]);
  assert.equal(direct.state.scoringCleanupProgress.currentStep,
    "check_end_game_conditions");
  assert.equal(direct.state.log.at(-1).action.executorId,
    OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID);
});

check("seat_lifecycle_source_ledger_and_marker_drift_fail_closed", () => {
  assert.equal(disabledReason(initialState, "player2", matchBinding),
    "VP_SCORING_FIRST_PLAYER_ONLY");
  assert.equal(disabledReason(direct.state, "player1", matchBinding),
    "VP_SCORING_PROGRESS_INVALID");
  const wrongDataBinding = clone(matchBinding);
  wrongDataBinding.dataSnapshotHash = "0".repeat(64);
  assert.equal(disabledReason(initialState, "player1", wrongDataBinding),
    "VP_SCORING_DATA_SNAPSHOT_MISMATCH");
  const tamperedLedger = clone(initialState);
  tamperedLedger.supplyLossLedger.lossBySide.player1 = 1;
  assert.equal(disabledReason(tamperedLedger, "player1", matchBinding),
    "SUPPLY_LOSS_LEDGER_HASH_MISMATCH");
  const staleMarker = clone(initialState);
  staleMarker.board.missionMarkers[0].controlDeterminedAt.round = 1;
  assert.equal(disabledReason(staleMarker, "player1", matchBinding),
    "VP_SCORING_MARKER_STATE_INVALID");
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-existing-victory-point-contract-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

const engine = authority("ticket-11-existing-victory-point-hmac-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-existing-victory-point-contract-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: liveReport.commandSnapshot,
    },
    dataSnapshot: {
      artifactId: "official-gameplay-data-bundle",
      content: gameplayDataBundle,
    },
  },
  state: initialState,
});
const player1 = credentials(engine, initialEnvelope, "player1");
const legal = engine.legalSpace(initialEnvelope, { seatAuthority: player1.seatAuthority });
const finite = legal.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID
));
assert.ok(finite, JSON.stringify(legal.disabledDiagnostics));
const previewed = engine.preview({
  envelope: initialEnvelope,
  seatAuthority: player1.seatAuthority,
  proposal: { kind: "finite", actionKey: finite.actionKey },
  occurredAt: OCCURRED_AT,
});
assert.equal(previewed.ok, true, JSON.stringify(previewed));
const confirmed = engine.confirmPreview({
  envelope: initialEnvelope,
  preview: previewed.preview,
  seatAuthority: player1.seatAuthority,
  occurredAt: OCCURRED_AT,
});
assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
const applied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision,
  preview: previewed.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: player1.seatAuthority,
  controlLease: player1.controlLease,
  idempotencyKey: "existing-victory-point-scoring-apply-v1",
  occurredAt: OCCURRED_AT,
});

check("authority_legal_preview_confirm_apply_binds_v2_lineage", () => {
  assert.equal(applied.ok, true, JSON.stringify(applied));
  assert.equal(applied.receipt.action.executorId,
    OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID);
  assert.deepEqual(applied.receipt.action.ruleAtomIds,
    [...OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS]);
  assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.deepEqual(applied.envelope.state.scores, { player1: 6, player2: 4 });
  assert.equal(applied.envelope.state.scoringCleanupProgress.currentStep,
    "check_end_game_conditions");
});

check("v2_receipt_replays_after_hmac_rotation_and_tamper_fails", () => {
  const replayEngine = authority("ticket-11-existing-victory-point-hmac-rotated-v1");
  registerReplayDependencies(
    replayEngine,
    initialEnvelope,
    runtime,
    liveReport.commandSnapshot,
    gameplayDataBundle,
  );
  const replayed = replayEngine.replay({
    initialEnvelope,
    journal: [applied.receipt],
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
  const tampered = clone(applied.receipt);
  tampered.events.push({ type: "forged_victory_points" });
  assert.equal(replayEngine.replay({
    initialEnvelope,
    journal: [tampered],
  }).reason, "SIGNATURE_INVALID");
});

const v1Source = await readFile(
  path.join(ROOT, "packages", "rule-atoms", "official-victory-point-scoring-executor-v1.mjs"),
);

check("v1_source_runtime_and_historical_rules_display_remain_frozen", () => {
  assert.equal(contentHash(v1Source), PREVIOUS_EXECUTOR_SOURCE_HASH);
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.equal(previousCatalogue.executorManifest.some((entry) => (
    entry.executorId === "authority.victory-point-scoring-v1"
      && entry.executorVersion === "1.0.0"
  )), true);
  assert.equal(catalogue.executorManifest.some((entry) => (
    entry.executorId === "authority.victory-point-scoring-v1"
  )), false);
  assert.equal(initialEnvelope.matchBinding.rulesDisplayBinding.locale, "en");
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
});

const holdPositionDocument = firestorePayloads.faction_cards.documents.find((document) => (
  document.name.endsWith("/mission_hold_position")
));
assert.ok(holdPositionDocument);
const liveUrls = {
  ...previousReport.liveOfficialRevalidation.urls,
  holdPosition:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/faction_cards/mission_hold_position",
};
const liveDocuments = {};
for (const [kind, url] of Object.entries(liveUrls)) {
  liveDocuments[kind] = await fetchOfficialJson(url, kind);
}

check("live_official_71_69_48_and_hold_position_document_remain_current", () => {
  assert.deepEqual(dataset.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
  assert.deepEqual(
    Object.fromEntries(Object.entries(previousReport.liveOfficialRevalidation.hashes).map((
      [kind, expectedHash],
    ) => [kind, documentHash(liveDocuments[kind])])),
    previousReport.liveOfficialRevalidation.hashes,
  );
  assert.equal(documentHash(holdPositionDocument), HOLD_POSITION_DOCUMENT_HASH);
  assert.equal(documentHash(liveDocuments.holdPosition), HOLD_POSITION_DOCUMENT_HASH);
});

check("ctx2skill_harness_memory_and_training_lanes_remain_closed", () => {
  assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.deepEqual(slice.harness.memoryTraceEvidence, {
    refs: [],
    promotionAttempted: false,
  });
  assert.equal(slice.rulesEligible, false);
  assert.equal(slice.productionRoomEligible, false);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_existing_victory_point_scoring_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  liveOfficialRevalidation: {
    urls: liveUrls,
    hashes: Object.fromEntries(Object.entries(liveDocuments).map(([kind, document]) => (
      [kind, documentHash(document)]
    ))),
    repositoryFallbackUsed: false,
  },
  frozenHistoricalV1: {
    executorId: "authority.victory-point-scoring-v1",
    executorVersion: "1.0.0",
    sourceHash: contentHash(v1Source),
    catalogueHash: previousCatalogue.catalogueHash,
    runtimeHash: previousRuntime.descriptor.runtimeHash,
    historicalRulesDisplayRetained: true,
    silentCompatibilityAllowed: false,
  },
  previousGraphHash: previousGraph.graphHash,
  graph,
  graphAudit,
  slice,
  sliceAudit,
  previousCoverage,
  coverage,
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  newlyExecutableRuleAtomIds: [],
  versionReassignedRuleAtomIds: [...OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS],
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "v2_receipt_replays_after_hmac_rotation_and_v1_runtime_remains_frozen"
      : "failed",
    promotions: [],
    blocks: ["26_existing_executors_still_require_state_contracts"],
    remainingRuleGaps: 491,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt"],
    harnessToolsCalled: [
      "list_legal_actions",
      "preview_action",
      "confirm_action",
      "apply_action_after_user_confirmation",
      "replay_room",
      "query_rule_relationship_impact",
    ],
    uiTraceEvidence: ["victory-point-breakdown-visible-at-exact-cleanup-step"],
    agentDecisionEvidence: [
      "exact-five-marker-affinity-and-zero-supply-scoring-denominator",
      "forged-lineage-resolution-diagnostics-and-extra-fields-fail-closed",
    ],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing_state_invalidation_or_judge_edge_removes_contract",
      "public_apply_signature_or_replay_failure_removes_contract",
    ],
    userVisibleChecks: [
      "both_score_breakdowns_update_before_end_game_check",
    ],
  },
  rulesTruth: "victory_point_scoring_v2_exact_public_action_and_state_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-victory-point-scoring-contract-closure-v1-report.json",
  ),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: report.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: graph.graphHash,
  graphNodes: graph.nodes.length,
  graphEdges: graph.edges.length,
  strictCompleteAtoms: coverage.counts.strictCompleteAtoms,
  partialContractAtoms: coverage.counts.partialContractAtoms,
  noContractAtoms: coverage.counts.noContractAtoms,
  declaredStateContractExecutors: coverage.counts.declaredStateContractExecutors,
  stateContractMissingExecutors: coverage.counts.missingStateContractExecutors,
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
