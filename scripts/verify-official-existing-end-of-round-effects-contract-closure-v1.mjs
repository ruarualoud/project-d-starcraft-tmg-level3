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
import { createOfficialCharacteristicStatusKernelV1 } from
  "../packages/rule-atoms/official-characteristic-status-kernel-v1.mjs";
import {
  applyOfficialEndOfRoundEffectsV2,
  enumerateOfficialEndOfRoundEffectsActionsV2,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v2.mjs";
import {
  applyOfficialEndOfRoundEffectsV5,
  enumerateOfficialEndOfRoundEffectsActionsV5,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v5.mjs";
import {
  createOfficialEndOfRoundEffectsRelationshipExtensionV1,
  OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-end-of-round-effects-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingEndOfRoundEffectsContractClosureRuleSliceV1,
  verifyOfficialExistingEndOfRoundEffectsContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-end-of-round-effects-contract-closure-rule-slice-v1.mjs";
import {
  enumerateOfficialEndOfRoundEffectsActionsV3,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
} from "../packages/rule-atoms/official-optical-flare-lifecycle-executors-v1.mjs";
import { createOfficialMarineStimpackKernelV1 } from
  "../packages/rule-atoms/official-marine-stimpack-kernel-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
} from "../packages/rule-atoms/official-stimpack-lifecycle-executors-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";

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
const OCCURRED_AT = "2026-08-28T18:00:00.000Z";
const PREVIOUS_RUNTIME_HASH =
  "ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64";
const CURRENT_RUNTIME_HASH =
  "ec37637bc787d6d5870db5c02fa84f53b077d54f177542bd8282b710f42eb089";
const SOURCE_HASHES = Object.freeze({
  v2: "caa175ef74bbeec6b35d40f3c8d415854b11457b06907e3351179539de8043b4",
  v3: "d62804ddf7c8d3fb4967f0788258f568a53a6921b321e533a95ab7222c1d40e5",
  v4: "76ebc98d1575861414f247208ffc7735a9741bd0425c3fc12807737269a1fd02",
  v5: "635f99841c23eaacc0a5a9cb01f9648f29ca5b5d4943216b5a9c92c953e9faea",
});
const OFFICIAL_URLS = Object.freeze({
  coreRules: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  versions:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/system_metadata/versions",
  part11:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/rules_sections/FuahgilWtc8nccVSp2Vv",
  academy:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/tactical_cards/academy",
  terranArmedForces:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/tactical_cards/terran_armed_forces",
});
const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const HISTORICAL_STIMPACK_EVIDENCE_HASH =
  "fabab4a7880fe51501f3f5fc79c971f2c21d22d68f604408059a14dfc4e32a5e";
const HISTORICAL_OPTICAL_FLARE_EVIDENCE_HASH =
  "bf12fff56ffd9e78ade815712b9c641633cca3c8ca80ecaeb679aa5bf9a31f03";
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

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function executableAction(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function documentHash(document) {
  return createHash("sha256")
    .update(`${canonicalStarcraftTmgJson(document)}\n`)
    .digest("hex");
}

async function fetchOfficialBytes(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`${kind} HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw lastError;
}

async function fetchOfficialJson(url, kind) {
  return JSON.parse(new TextDecoder().decode(await fetchOfficialBytes(url, kind)));
}

function localDocument(payload, suffix) {
  const document = payload.documents.find((entry) => entry.name.endsWith(suffix));
  assert.ok(document, `local document missing: ${suffix}`);
  return document;
}

function liveMarine(id, sideKey, xInches) {
  return {
    id,
    sideKey,
    name: "Marine",
    officialUnitRecordKey: "army_units:marine",
    selectedUpgradeNames: [],
    currentModels: 1,
    maxModels: 7,
    currentSupply: 0,
    damageMarker: 0,
    statuses: [],
    combatEffects: [],
    isOnField: true,
    isDestroyed: false,
    models: [{
      id: `${id}-model`,
      xInches,
      yInches: 1,
      isOnField: true,
      isDestroyed: false,
    }],
    activatedPhases: { movement: true, assault: true, combat: true },
  };
}

function endOfRoundState(gameplayDataBundle, missionSetupBinding) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: { player1: 4, player2: 3 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    scoringCleanupProgress: {
      schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
      round: 2,
      completedSteps: [
        "determine_mission_marker_control",
        "score_victory_points",
        "check_end_game_conditions",
      ],
      currentStep: "resolve_end_of_round_effects",
      controlResolutionHash: "3".repeat(64),
      scoringResolutionHash: "4".repeat(64),
      endGameResolutionHash: "5".repeat(64),
      trainingTruth: false,
    },
    board: { effectMarkers: [] },
    cardResources: { player1: [], player2: [] },
    pieces: [
      liveMarine("player1-marine", "player1", 1),
      liveMarine("player2-marine", "player2", 8),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function opticalFlareState(baseState) {
  const state = clone(baseState);
  const pair = createOfficialCharacteristicStatusKernelV1().createOpticalFlareStatus({
    round: state.round,
    sourceSideKey: "player1",
    sourcePieceId: "player1-marine",
    targetPieceId: "player2-marine",
    abilityResolutionHash: "6".repeat(64),
  });
  state.pieces.find((piece) => piece.id === "player2-marine").statuses.push(pair.status);
  state.board.effectMarkers.push(pair.marker);
  return state;
}

function stimpackState(baseState) {
  const state = clone(baseState);
  const pair = createOfficialMarineStimpackKernelV1().createStatus({
    round: state.round,
    sourceSideKey: "player1",
    sourcePieceId: "player1-marine",
    abilityResolutionHash: "7".repeat(64),
  });
  const piece = state.pieces.find((row) => row.id === "player1-marine");
  piece.statuses.push(pair.status);
  piece.damageMarker = 2;
  state.board.effectMarkers.push(pair.marker);
  return state;
}

function protectedState(state) {
  return clone({
    round: state.round,
    phase: state.phase,
    activeSideKey: state.activeSideKey,
    firstPlayerSideKey: state.firstPlayerSideKey,
    players: state.players,
    pieces: state.pieces,
    scores: state.scores,
    board: state.board,
    cardResources: state.cardResources,
    officialGameplayDataBundle: state.officialGameplayDataBundle,
    officialMissionSetupBinding: state.officialMissionSetupBinding,
    gameOver: state.gameOver,
    terminal: state.terminal,
    winner: state.winner,
    terminalReason: state.terminalReason,
  });
}

function candidates(runtime, state, matchBinding, sideKey = "player1", includeDisabled = false) {
  return runtime.enumerate(state, {
    sideKey,
    includeDisabled,
    matchBinding,
  }).candidates;
}

function credentials(engine, envelope, suffix) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `end-of-round-v5-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `end-of-round-v5-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function applyFinite(engine, envelope, credential, executorId, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: credential.seatAuthority });
  const finite = legal.finiteActions.find((entry) => entry.action.executorId === executorId);
  assert.ok(finite, JSON.stringify(legal.disabledDiagnostics));
  const preview = engine.preview({
    envelope,
    seatAuthority: credential.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credential.seatAuthority,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: credential.seatAuthority,
    controlLease: credential.controlLease,
    idempotencyKey,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { legal, finite, preview, confirmation, applied };
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
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v18" },
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
    content:
      `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}`
      + "\n\nThis development artifact preserves the rules identity used by the match.",
  });
}

const previousReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-hold-position-end-game-contract-closure-v1-report.json",
  ),
  "utf8",
));
const previousSlice = previousReport.slice;
const historicalStimpackReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-marine-stimpack-rule-slice-v1-report.json"),
  "utf8",
));
const historicalOpticalFlareReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-academy-optical-flare-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialExistingEndOfRoundEffectsContractClosureRuleSliceV1({
  previousSlice,
});
const sliceAudit = verifyOfficialExistingEndOfRoundEffectsContractClosureRuleSliceV1({
  previousSlice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const previousRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousSlice.catalogue,
});
const relationshipExtension = createOfficialEndOfRoundEffectsRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: relationshipExtension,
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);

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
const baseState = endOfRoundState(gameplayDataBundle, missionSetupBinding);
const opticalState = opticalFlareState(baseState);
const boostedState = stimpackState(baseState);
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const previousMatchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: previousRuntime.descriptor.runtimeHash },
};

check("slice_catalogue_runtime_graph_and_421_atom_denominator_are_exact", () => {
  assert.equal(slice.sliceHash,
    "4b23af8627bed2e3b8f3820e84dea2c0ab710d2085e2a16defbe84584a6da014");
  assert.equal(slice.catalogueHash,
    "47f128f34764e9c6a15193dfe1a99906290ea5073da8033d1a7296e8e8d67dd9");
  assert.equal(runtime.descriptor.runtimeHash, CURRENT_RUNTIME_HASH);
  assert.equal(graph.graphHash,
    "52f9ad4f03f3249149693f243a0f1e789864634d030cd3ff432a2ea8fb6baff1");
  assert.equal(sliceAudit.counts.executableRuleAtoms, 421);
  assert.equal(sliceAudit.counts.changedAtoms, 5);
  assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
});

check("state_contract_coverage_moves_to_160_strict_81_partial_180_none", () => {
  assert.equal(graphAudit.valid, true);
  assert.equal(graphAudit.counts.executors, 42);
  assert.equal(graphAudit.counts.declaredStateContractExecutors, 20);
  assert.equal(graphAudit.counts.stateContractMissingExecutors, 22);
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 160,
    partialContractAtoms: 81,
    noContractAtoms: 180,
    executors: 42,
    declaredStateContractExecutors: 20,
    missingStateContractExecutors: 22,
  });
});

check("empty_queue_v2_and_current_v5_share_exact_dynamic_lineage", () => {
  const v2Candidate = enumerateOfficialEndOfRoundEffectsActionsV2(baseState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const v5Candidate = enumerateOfficialEndOfRoundEffectsActionsV5(baseState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.deepEqual(v2Candidate.ruleAtomIds, [...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS]);
  assert.deepEqual(v5Candidate.ruleAtomIds, [...OFFICIAL_END_OF_ROUND_EFFECTS_V2_ATOM_IDS]);
  assert.deepEqual(
    protectedState(applyOfficialEndOfRoundEffectsV2(
      baseState,
      executableAction(v2Candidate),
      { matchBinding },
    ).state),
    protectedState(baseState),
  );
  const current = applyOfficialEndOfRoundEffectsV5(
    baseState,
    executableAction(v5Candidate),
    { matchBinding },
  );
  assert.equal(current.state.endOfRoundEffectHistory.at(-1).effectCount, 0);
  assert.equal(current.state.scoringCleanupProgress.currentStep, "cleanup_and_refresh");
});

check("optical_flare_v3_persists_and_current_v5_preserves_v3_lineage", () => {
  const frozenV3Candidate = enumerateOfficialEndOfRoundEffectsActionsV3(opticalState, {
    sideKey: "player1",
    matchBinding,
    includeDisabled: true,
  })[0];
  const v5Candidate = enumerateOfficialEndOfRoundEffectsActionsV5(opticalState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.equal(frozenV3Candidate.isEnabled, false);
  assert.equal(frozenV3Candidate.disabledReason,
    "OPTICAL_FLARE_LIFECYCLE_LATEST_OFFICIAL_DATA_REQUIRED");
  assert.deepEqual(v5Candidate.ruleAtomIds,
    [...OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS]);
  const historicalEvidence = {
    schema: historicalOpticalFlareReport.schema,
    acceptancePassed: historicalOpticalFlareReport.acceptancePassed,
    acceptanceTotal: historicalOpticalFlareReport.acceptanceTotal,
    historicalRuntimeHash: historicalOpticalFlareReport.historicalRuntimeHash,
    currentRuntimeHash: historicalOpticalFlareReport.runtime.runtimeHash,
    authorityFixture: historicalOpticalFlareReport.authorityFixture,
    officialSourceSnapshotHash: historicalOpticalFlareReport.officialSourceSnapshotHash,
    officialDatasetHash: historicalOpticalFlareReport.officialDatasetHash,
    rulesTruth: historicalOpticalFlareReport.rulesTruth,
    trainingTruth: historicalOpticalFlareReport.trainingTruth,
  };
  assert.equal(hashStarcraftTmgContract(historicalEvidence),
    HISTORICAL_OPTICAL_FLARE_EVIDENCE_HASH);
  assert.equal(historicalOpticalFlareReport.acceptancePassed, 13);
  assert.equal(historicalOpticalFlareReport.acceptanceTotal, 13);
  const v5Applied = applyOfficialEndOfRoundEffectsV5(
    opticalState,
    executableAction(v5Candidate),
    { matchBinding },
  );
  assert.equal(v5Applied.state.pieces[1].statuses.length, 1);
  assert.equal(v5Applied.state.board.effectMarkers.length, 1);
});

check("stimpack_current_v5_preserves_status_marker_and_non_lethal_damage", () => {
  const candidate = candidates(runtime, boostedState, matchBinding).find((entry) => (
    entry.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID
  ));
  assert.ok(candidate);
  assert.deepEqual(candidate.ruleAtomIds,
    [...OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS]);
  const applied = runtime.apply(boostedState, executableAction(candidate), { matchBinding });
  assert.deepEqual(protectedState(applied.state), protectedState(boostedState));
  assert.equal(applied.events[0].damageMarkerRetained, 2);
  assert.equal(applied.state.pieces[0].statuses.length, 1);
  assert.equal(applied.state.board.effectMarkers.length, 1);
});

check("forged_action_wrong_seat_stale_progress_and_unknown_status_fail_closed", () => {
  const candidate = enumerateOfficialEndOfRoundEffectsActionsV5(baseState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  const action = executableAction(candidate);
  for (const forged of [
    { ...clone(action), ruleAtomIds: ["rule-atom:forged"] },
    { ...clone(action), callerDiagnostic: "forged" },
    { ...clone(action), details: { callerAuthored: true } },
  ]) {
    assert.throws(
      () => applyOfficialEndOfRoundEffectsV5(baseState, forged, { matchBinding }),
      /END_OF_ROUND_V5_ACTION_MISMATCH/u,
    );
  }
  assert.equal(enumerateOfficialEndOfRoundEffectsActionsV5(baseState, {
    sideKey: "player2",
    matchBinding,
  }).length, 0);
  const stale = clone(baseState);
  stale.scoringCleanupProgress.currentStep = "cleanup_and_refresh";
  assert.equal(enumerateOfficialEndOfRoundEffectsActionsV5(stale, {
    sideKey: "player1",
    matchBinding,
  }).length, 0);
  const unknown = clone(baseState);
  unknown.pieces[0].statuses.push({ schema: "unknown_future_status_v1" });
  assert.equal(enumerateOfficialEndOfRoundEffectsActionsV5(unknown, {
    sideKey: "player1",
    matchBinding,
  }).length, 0);
});

check("relationship_query_reaches_judges_and_removed_invalidation_edge_blocks_audit", () => {
  const ids = OFFICIAL_END_OF_ROUND_EFFECTS_RELATIONSHIP_NODE_IDS_V1;
  const query = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.officialGameplayDataBundle,
    targetNodeIds: [ids.staleProofTest],
    relationships: ["projects_to", "derives", "verified_by"],
    maxDepth: 5,
  });
  assert.deepEqual(query.reachedNodeIds, [ids.staleProofTest]);
  const requiredEdge = graph.coverageScopes
    .find((scope) => scope.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID)
    .requiredEdges.find((edge) => edge.relationship === "invalidates");
  const brokenBody = without(clone(graph), ["graphHash"]);
  brokenBody.edges = brokenBody.edges.filter((edge) => edge.edgeId !== requiredEdge.edgeId);
  const broken = { ...brokenBody, graphHash: hashStarcraftTmgContract(brokenBody) };
  assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(runtimeValue, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtimeValue,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      ...refereeKeys,
      keyId: "ticket-11-end-of-round-v5-key",
      hmacSecret,
    },
  });
}

function createEnvelope(engine, roomId, state) {
  return engine.createEnvelope({
    roomId,
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
    state,
  });
}

const engine = authority(runtime, "ticket-11-end-of-round-v5-hmac-v1");
const initialEnvelope = createEnvelope(
  engine,
  "official-existing-end-of-round-effects-contract-room",
  boostedState,
);
const authorityApplied = applyFinite(
  engine,
  initialEnvelope,
  credentials(engine, initialEnvelope, "current"),
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
  "end-of-round-v5-apply",
);

check("authority_legal_preview_confirm_apply_uses_v5_and_ed25519", () => {
  assert.equal(authorityApplied.applied.receipt.action.executorId,
    OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID);
  assert.deepEqual(authorityApplied.applied.receipt.action.ruleAtomIds,
    [...OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS]);
  assert.equal(authorityApplied.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.equal(authorityApplied.applied.envelope.state.pieces[0].damageMarker, 2);
  assert.equal(authorityApplied.applied.envelope.state.scoringCleanupProgress.currentStep,
    "cleanup_and_refresh");
});

check("current_receipt_replays_after_hmac_rotation_and_tamper_fails", () => {
  const replayEngine = authority(runtime, "ticket-11-end-of-round-v5-hmac-rotated");
  registerReplayDependencies(
    replayEngine,
    initialEnvelope,
    runtime,
    liveReport.commandSnapshot,
    gameplayDataBundle,
  );
  const replayed = replayEngine.replay({
    initialEnvelope,
    journal: [authorityApplied.applied.receipt],
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, authorityApplied.applied.envelope.stateHash);
  const tampered = clone(authorityApplied.applied.receipt);
  tampered.events.push({ type: "forged_end_of_round" });
  assert.equal(replayEngine.replay({ initialEnvelope, journal: [tampered] }).reason,
    "SIGNATURE_INVALID");
});

const executorSources = {
  v2: await readFile(path.join(
    ROOT,
    "packages/rule-atoms/official-end-of-round-effects-executor-v2.mjs",
  )),
  v3: await readFile(path.join(
    ROOT,
    "packages/rule-atoms/official-optical-flare-lifecycle-executors-v1.mjs",
  )),
  v4: await readFile(path.join(
    ROOT,
    "packages/rule-atoms/official-stimpack-lifecycle-executors-v1.mjs",
  )),
  v5: await readFile(path.join(
    ROOT,
    "packages/rule-atoms/official-end-of-round-effects-executor-v5.mjs",
  )),
};

check("frozen_v2_v3_v4_sources_runtime_display_and_historical_replay_remain_exact", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(executorSources).map(([key, value]) => (
    [key, contentHash(value)]
  ))), SOURCE_HASHES);
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  const historicalCandidate = candidates(
    previousRuntime,
    boostedState,
    previousMatchBinding,
    "player1",
    true,
  ).find((entry) => entry.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID);
  assert.equal(historicalCandidate.isEnabled, false);
  assert.equal(historicalCandidate.disabledReason,
    "STIMPACK_LIFECYCLE_LATEST_OFFICIAL_DATA_REQUIRED");
  const historicalEvidence = {
    schema: historicalStimpackReport.schema,
    acceptancePassed: historicalStimpackReport.acceptancePassed,
    acceptanceTotal: historicalStimpackReport.acceptanceTotal,
    historicalRuntimeHash: historicalStimpackReport.historicalRuntimeHash,
    currentRuntimeHash: historicalStimpackReport.runtime.runtimeHash,
    authorityFixture: {
      actionSchemaVersion: historicalStimpackReport.authorityFixture.actionSchemaVersion,
      player1JournalReceipts:
        historicalStimpackReport.authorityFixture.player1JournalReceipts,
      player2JournalReceipts:
        historicalStimpackReport.authorityFixture.player2JournalReceipts,
      ed25519ReplayAfterHmacRotationVerified: historicalStimpackReport.acceptance.includes(
        "ed25519_replay_survives_hmac_rotation_for_both_seats_and_rejects_tamper",
      ),
    },
    officialSourceSnapshotHash: historicalStimpackReport.officialSourceSnapshotHash,
    officialDatasetHash: historicalStimpackReport.officialDatasetHash,
    rulesTruth: historicalStimpackReport.rulesTruth,
    trainingTruth: historicalStimpackReport.trainingTruth,
  };
  assert.equal(hashStarcraftTmgContract(historicalEvidence),
    HISTORICAL_STIMPACK_EVIDENCE_HASH);
  assert.deepEqual(without(historicalStimpackReport.authorityFixture, [
    "player1ReplayStateHash",
    "player2ReplayStateHash",
  ]), {
    actionSchemaVersion: "hybrid_legal_space_v10",
    player1JournalReceipts: 2,
    player2JournalReceipts: 1,
  });
  assert.match(historicalStimpackReport.authorityFixture.player1ReplayStateHash,
    /^[a-f0-9]{64}$/u);
  assert.match(historicalStimpackReport.authorityFixture.player2ReplayStateHash,
    /^[a-f0-9]{64}$/u);
  assert.equal(historicalStimpackReport.acceptancePassed, 16);
  assert.equal(historicalStimpackReport.acceptanceTotal, 16);
  assert.equal(previousSlice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(slice.catalogue.executorManifest.some((entry) => (
    entry.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID
  )), false);
});

const liveOfficial = {
  coreRules: await fetchOfficialBytes(OFFICIAL_URLS.coreRules, "coreRules"),
  versions: await fetchOfficialJson(OFFICIAL_URLS.versions, "versions"),
  part11: await fetchOfficialJson(OFFICIAL_URLS.part11, "part11"),
  academy: await fetchOfficialJson(OFFICIAL_URLS.academy, "academy"),
  terranArmedForces: await fetchOfficialJson(
    OFFICIAL_URLS.terranArmedForces,
    "terranArmedForces",
  ),
};

check("latest_official_core_part11_cards_and_71_69_48_data_are_live_current", () => {
  assert.equal(contentHash(liveOfficial.coreRules), CORE_RULES_HASH);
  assert.deepEqual(dataset.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
  assert.equal(documentHash(liveOfficial.versions),
    previousReport.liveOfficialRevalidation.hashes.versions);
  assert.equal(documentHash(liveOfficial.part11), documentHash(localDocument(
    firestorePayloads.rules_sections,
    "/rules_sections/FuahgilWtc8nccVSp2Vv",
  )));
  assert.equal(documentHash(liveOfficial.academy), documentHash(localDocument(
    firestorePayloads.tactical_cards,
    "/tactical_cards/academy",
  )));
  assert.equal(documentHash(liveOfficial.terranArmedForces), documentHash(localDocument(
    firestorePayloads.tactical_cards,
    "/tactical_cards/terran_armed_forces",
  )));
});

check("ctx2skill_harness_dsh_memory_and_training_lanes_remain_closed", () => {
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
  assert.equal(JSON.stringify(slice).includes("dsh"), false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_existing_end_of_round_effects_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  sliceAudit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph: {
    graphHash: graph.graphHash,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  },
  graphAudit,
  coverage,
  previousCoverage: previousReport.coverage,
  frozenExecutorSourceHashes: SOURCE_HASHES,
  liveOfficialRevalidation: {
    urls: OFFICIAL_URLS,
    hashes: {
      coreRules: contentHash(liveOfficial.coreRules),
      versions: documentHash(liveOfficial.versions),
      part11: documentHash(liveOfficial.part11),
      academy: documentHash(liveOfficial.academy),
      terranArmedForces: documentHash(liveOfficial.terranArmedForces),
    },
    dataVersions: dataset.dataVersions,
    repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "v5_three_branch_and_authority_replay_passed_with_v2_v3_v4_frozen"
      : "blocked",
    promotions: [],
    blocks: failures.map((entry) => entry.id),
    remainingRuleGaps: 491,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
    harnessToolsCalled: [
      "read_board_state",
      "list_legal_actions",
      "preview_action",
      "apply_action_after_user_confirmation",
      "replay_room",
    ],
    uiTraceEvidence: "authority_eor_trace_only_browser_and_device_ui_pending",
    agentDecisionEvidence: "exact_empty_optical_and_stimpack_branch_selection",
    memoryTraceEvidence: { refs: [], promotionAttempted: false },
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: slice.harness.rollbackOrDemotionRules,
    userVisibleChecks: slice.harness.userVisibleChecks,
  },
  rulesTruth: "end_of_round_effects_v2_v3_v5_contracts_exact",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-end-of-round-effects-contract-closure-v1-report.json",
  ),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures: report.failures,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: report.graph.graphHash,
  coverage: report.coverage.counts,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
