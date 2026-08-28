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
import {
  applyOfficialCleanupRefreshV5,
  enumerateOfficialCleanupRefreshActionsV5,
} from "../packages/rule-atoms/official-cleanup-refresh-executor-v5.mjs";
import {
  enumerateOfficialDetermineInitiativeActionsV1,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
} from "../packages/rule-atoms/official-determine-initiative-executor-v1.mjs";
import {
  applyOfficialDetermineInitiativeV2,
  enumerateOfficialDetermineInitiativeActionsV2,
  OFFICIAL_DETERMINE_INITIATIVE_V2_DETERMINISTIC_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_V2_ROLL_OFF_ATOM_IDS,
} from "../packages/rule-atoms/official-determine-initiative-executor-v2.mjs";
import {
  createOfficialDetermineInitiativeRelationshipExtensionV1,
  OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1,
} from
  "../packages/rule-atoms/official-determine-initiative-relationship-contract-v1.mjs";
import {
  applyOfficialEndOfRoundEffectsV5,
  enumerateOfficialEndOfRoundEffectsActionsV5,
} from "../packages/rule-atoms/official-end-of-round-effects-executor-v5.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingDetermineInitiativeContractClosureRuleSliceV1,
  verifyOfficialExistingDetermineInitiativeContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-determine-initiative-contract-closure-rule-slice-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from
  "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
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
const OCCURRED_AT = "2026-08-28T21:00:00.000Z";
const SLICE_HASH = "54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448";
const PREVIOUS_SLICE_HASH =
  "23d6385e012107abd6e2ad5b51d05f053d81e5a6833ad4afa09eaee3cc3b5d10";
const CATALOGUE_HASH =
  "b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38";
const RUNTIME_HASH = "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7";
const GRAPH_HASH = "25fbf95e92e6be04ebaad41a1b7a2edf77423ddb885f21d8134ddb18969b07e8";
const FROZEN_V1_EXECUTOR_SOURCE_HASH =
  "ab28fe849bd9f3736dae0c8fcc589d26cd546d9cadb80b17e64757a5fd9fec3f";
const CURRENT_V2_EXECUTOR_SOURCE_HASH =
  "4a5b3a7b01b9621bf444637b7c2d9a83854c63d9873625add8d3f538ddf37c9c";
const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v19",
});
const OFFICIAL_URLS = Object.freeze({
  coreRules: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  versions:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/system_metadata/versions",
  holdPosition:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/"
    + "starcrafttmgbeta/documents/faction_cards/mission_hold_position",
});
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
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
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

function endOfRoundState({
  gameplayDataBundle,
  missionSetupBinding,
  runtimeHash,
  round = 2,
  scores = { player1: 4, player2: 3 },
}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round,
    phase: "cleanup",
    activeSideKey: null,
    firstPlayerSideKey: "player1",
    players: {
      player1: { sideKey: "player1", passedPhases: { combat: true } },
      player2: { sideKey: "player2", passedPhases: { combat: true } },
    },
    scores: clone(scores),
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
    scoringCleanupProgress: {
      schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
      round,
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
    supplyLossLedger: createOfficialSupplyLossLedgerV1({
      round,
      rulesRuntimeHash: runtimeHash,
    }),
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: true, player2: true },
    board: {
      missionMarkers: [{ id: "hold-position-center", controlledBy: "player1" }],
      effectMarkers: [],
      tokens: [],
      markers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      liveMarine("player1-marine", "player1", 1),
      liveMarine("player2-marine", "player2", 8),
    ],
    firstPassSideByPhase: { combat: "player1" },
    phaseFirstActorByRound: { [String(round)]: { combat: "player2" } },
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function toDetermineInitiativeState(state, matchBinding) {
  const eorCandidate = enumerateOfficialEndOfRoundEffectsActionsV5(state, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.ok(eorCandidate, "end-of-round candidate missing");
  const afterEor = applyOfficialEndOfRoundEffectsV5(
    state,
    executableAction(eorCandidate),
    { matchBinding },
  ).state;
  const cleanupCandidate = enumerateOfficialCleanupRefreshActionsV5(afterEor, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.ok(cleanupCandidate, "cleanup candidate missing");
  return applyOfficialCleanupRefreshV5(
    afterEor,
    executableAction(cleanupCandidate),
    { matchBinding },
  ).state;
}

function credentials(engine, envelope, suffix, roleMode = "player", principalType = "human") {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `determine-initiative-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode,
    principalType,
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `determine-initiative-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function applyFinite(engine, envelope, credential, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: credential.seatAuthority });
  const finite = legal.finiteActions.find((entry) => (
    entry.action.executorId === OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID
  ));
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
    actionSchema: ACTION_SCHEMA_CONTENT,
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
  path.join(OUTPUT_DIR, "official-existing-cleanup-refresh-contract-closure-v1-report.json"),
  "utf8",
));
const historicalReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-determine-initiative-rule-slice-v1-report.json"),
  "utf8",
));
const previousSlice = previousReport.slice;
const slice = createOfficialExistingDetermineInitiativeContractClosureRuleSliceV1({
  previousSlice,
});
const sliceAudit = verifyOfficialExistingDetermineInitiativeContractClosureRuleSliceV1({
  previousSlice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const extension = createOfficialDetermineInitiativeRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
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
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const lowerScoreState = toDetermineInitiativeState(endOfRoundState({
  gameplayDataBundle,
  missionSetupBinding,
  runtimeHash: runtime.descriptor.runtimeHash,
  scores: { player1: 4, player2: 3 },
}), matchBinding);
const tiedState = toDetermineInitiativeState(endOfRoundState({
  gameplayDataBundle,
  missionSetupBinding,
  runtimeHash: runtime.descriptor.runtimeHash,
  scores: { player1: 4, player2: 4 },
}), matchBinding);

check("slice59_is_exact_input_and_slice60_rebinds_only_six_existing_atoms", () => {
  assert.equal(previousSlice.sliceHash, PREVIOUS_SLICE_HASH);
  assert.equal(slice.sliceHash, SLICE_HASH);
  assert.equal(slice.catalogueHash, CATALOGUE_HASH);
  assert.equal(runtime.descriptor.runtimeHash, RUNTIME_HASH);
  assert.equal(graph.graphHash, GRAPH_HASH);
  assert.equal(sliceAudit.counts.executableRuleAtoms, 421);
  assert.equal(sliceAudit.counts.changedAtoms, 6);
  assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
  assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 6);
});

check("coverage_moves_six_none_atoms_to_strict_and_24_of_42_contracts", () => {
  assert.equal(graphAudit.valid, true);
  assert.equal(graphAudit.counts.nodes, 6_014);
  assert.equal(graphAudit.counts.edges, 21_880);
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 173,
    partialContractAtoms: 78,
    noContractAtoms: 170,
    executors: 42,
    declaredStateContractExecutors: 24,
    missingStateContractExecutors: 18,
  });
  assert.ok(OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS.every((atomId) => (
    coverage.strictCompleteAtomIds.includes(atomId)
  )));
});

check("current_v2_exact_action_rejects_forged_lineage_extra_fields_and_stale_score", () => {
  const candidate = enumerateOfficialDetermineInitiativeActionsV2(lowerScoreState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.ok(candidate);
  const action = executableAction(candidate);
  for (const forged of [
    { ...clone(action), ruleAtomIds: ["rule-atom:forged"] },
    { ...clone(action), callerDiagnostic: "forged" },
    { ...clone(action), details: { callerAuthored: true } },
  ]) {
    assert.throws(
      () => applyOfficialDetermineInitiativeV2(lowerScoreState, forged, { matchBinding }),
      /DETERMINE_INITIATIVE_V2_ACTION_MISMATCH/u,
    );
  }
  const stale = clone(lowerScoreState);
  stale.scores = { player1: 8, player2: 3 };
  assert.throws(
    () => applyOfficialDetermineInitiativeV2(stale, action, { matchBinding }),
    /DETERMINE_INITIATIVE_V2_ACTION_MISMATCH/u,
  );
});

check("lower_vp_branch_assigns_marker_opens_round_three_and_preserves_protected_state", () => {
  const candidate = enumerateOfficialDetermineInitiativeActionsV2(lowerScoreState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.deepEqual(candidate.ruleAtomIds,
    [...OFFICIAL_DETERMINE_INITIATIVE_V2_DETERMINISTIC_ATOM_IDS]);
  assert.equal(candidate.chance, undefined);
  const protectedBefore = clone({
    players: lowerScoreState.players,
    pieces: lowerScoreState.pieces,
    board: lowerScoreState.board,
    scores: lowerScoreState.scores,
    cardResources: lowerScoreState.cardResources,
    officialGameplayDataBundle: lowerScoreState.officialGameplayDataBundle,
    officialMissionSetupBinding: lowerScoreState.officialMissionSetupBinding,
    cleanupRefreshHistory: lowerScoreState.cleanupRefreshHistory,
  });
  const applied = applyOfficialDetermineInitiativeV2(
    lowerScoreState,
    executableAction(candidate),
    { matchBinding },
  );
  assert.equal(applied.state.round, 3);
  assert.equal(applied.state.phase, "start_of_round");
  assert.equal(applied.state.firstPlayerSideKey, "player2");
  assert.equal(applied.state.activeSideKey, null);
  assert.equal(applied.state.scoringCleanupProgress, undefined);
  assert.equal(applied.state.supplyLossLedger.round, 3);
  assert.deepEqual({
    players: applied.state.players,
    pieces: applied.state.pieces,
    board: applied.state.board,
    scores: applied.state.scores,
    cardResources: applied.state.cardResources,
    officialGameplayDataBundle: applied.state.officialGameplayDataBundle,
    officialMissionSetupBinding: applied.state.officialMissionSetupBinding,
    cleanupRefreshHistory: applied.state.cleanupRefreshHistory,
  }, protectedBefore);
});

check("tied_vp_uses_hidden_four_d6_shape_and_a_new_attempt_after_tie", () => {
  const candidate = enumerateOfficialDetermineInitiativeActionsV2(tiedState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.deepEqual(candidate.chance, {
    kind: "fixed_roll_sequence",
    faces: 6,
    count: 4,
    layout: { initiativePlayer1: 2, initiativePlayer2: 2 },
  });
  assert.deepEqual(candidate.ruleAtomIds, [...new Set([
    "rule-atom:singleton:core-8-9-6-begin-next-round:59794c52142e",
    ...OFFICIAL_DETERMINE_INITIATIVE_V2_ROLL_OFF_ATOM_IDS,
  ])].sort());
  const first = applyOfficialDetermineInitiativeV2(
    tiedState,
    executableAction(candidate),
    {
      matchBinding,
      chanceReveals: [1, 2, 1, 2].map((outcome, counter) => ({
        counter,
        faces: 6,
        outcome,
      })),
    },
  );
  assert.equal(first.state.round, 2);
  assert.equal(first.state.scoringCleanupProgress.initiativeRollOffAttempt, 1);
  const retry = enumerateOfficialDetermineInitiativeActionsV2(first.state, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.equal(retry.initiativeResolution.rollOffAttempt, 2);
  assert.notEqual(retry.initiativeResolutionHash, candidate.initiativeResolutionHash);
  const winner = applyOfficialDetermineInitiativeV2(
    first.state,
    executableAction(retry),
    {
      matchBinding,
      chanceReveals: [1, 1, 6, 6].map((outcome, counter) => ({
        counter,
        faces: 6,
        outcome,
      })),
    },
  );
  assert.equal(winner.state.round, 3);
  assert.equal(winner.state.firstPlayerSideKey, "player2");
  assert.equal(winner.state.initiativeRollOffHistory.length, 2);
});

check("wrong_seat_progress_runtime_and_chance_material_fail_closed", () => {
  assert.equal(enumerateOfficialDetermineInitiativeActionsV2(lowerScoreState, {
    sideKey: "player2",
    matchBinding,
  }).length, 0);
  const wrongProgress = clone(lowerScoreState);
  wrongProgress.scoringCleanupProgress.currentStep = "cleanup_and_refresh";
  assert.equal(enumerateOfficialDetermineInitiativeActionsV2(wrongProgress, {
    sideKey: "player1",
    matchBinding,
  }).length, 0);
  assert.equal(enumerateOfficialDetermineInitiativeActionsV2(lowerScoreState, {
    sideKey: "player1",
    matchBinding: {
      ...matchBinding,
      rulesRuntimeBinding: { runtimeHash: "f".repeat(64) },
    },
  }).length, 0);
  const tiedCandidate = enumerateOfficialDetermineInitiativeActionsV2(tiedState, {
    sideKey: "player1",
    matchBinding,
  })[0];
  assert.throws(
    () => applyOfficialDetermineInitiativeV2(
      tiedState,
      executableAction(tiedCandidate),
      { matchBinding },
    ),
    /DETERMINE_INITIATIVE_CHANCE_REVEALS_REQUIRED/u,
  );
});

check("relationship_paths_reach_judges_and_missing_invalidation_breaks_audit", () => {
  const ids = OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1;
  const chancePath = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.scores,
    targetNodeIds: [ids.hiddenChanceTest],
    relationships: ["derives", "includes", "verified_by"],
    maxDepth: 5,
  });
  assert.deepEqual(chancePath.reachedNodeIds, [ids.hiddenChanceTest]);
  const scope = graph.coverageScopes.find((entry) => (
    entry.executorId === OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID
  ));
  const requiredEdge = scope.requiredEdges.find((edge) => edge.relationship === "invalidates");
  const brokenBody = without(clone(graph), ["graphHash"]);
  brokenBody.edges = brokenBody.edges.filter((edge) => edge.edgeId !== requiredEdge.edgeId);
  const broken = { ...brokenBody, graphHash: hashStarcraftTmgContract(brokenBody) };
  assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      ...refereeKeys,
      keyId: "ticket-11-determine-initiative-key",
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

const engine = authority("ticket-11-determine-initiative-hmac-v1");
const lowerEnvelope = createEnvelope(
  engine,
  "official-existing-determine-initiative-lower-room",
  lowerScoreState,
);
const lowerAuthority = applyFinite(
  engine,
  lowerEnvelope,
  credentials(engine, lowerEnvelope, "lower"),
  "determine-initiative-lower-vp",
);

check("authority_legal_preview_confirm_apply_uses_v19_and_ed25519", () => {
  assert.equal(lowerAuthority.legal.schemaVersion, "starcraft_tmg_authority_v2.legal-space");
  assert.equal(lowerEnvelope.matchBinding.dependencies.actionSchema.contentHash,
    hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT));
  assert.equal(lowerAuthority.preview.preview.core.chanceTicket, null);
  assert.equal(lowerAuthority.applied.receipt.action.executorId,
    OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID);
  assert.equal(lowerAuthority.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
  assert.equal(lowerAuthority.applied.envelope.state.round, 3);
  assert.equal(lowerAuthority.applied.envelope.state.phase, "start_of_round");
});

const tiedEnvelope = createEnvelope(
  engine,
  "official-existing-determine-initiative-tied-room",
  tiedState,
);
const tiedAuthority = applyFinite(
  engine,
  tiedEnvelope,
  credentials(engine, tiedEnvelope, "tied"),
  "determine-initiative-tied-vp",
);

check("authority_hides_rolls_until_apply_then_seals_four_reveals", () => {
  assert.equal(tiedAuthority.preview.preview.core.result.chancePending, true);
  assert.equal(tiedAuthority.preview.preview.core.chanceTicket.outcomesHidden, true);
  assert.equal(tiedAuthority.preview.preview.core.chanceTicket.tickets.length, 4);
  assert.ok(tiedAuthority.preview.preview.core.chanceTicket.tickets.every((ticket) => (
    ticket.outcomeHidden === true && ticket.outcome === undefined
  )));
  assert.equal(tiedAuthority.applied.receipt.chanceReveal.reveals.length, 4);
  assert.equal(tiedAuthority.applied.receipt.chanceReveal.shortTermSeal,
    "hmac_sha256_chance_outcome");
  assert.equal(tiedAuthority.applied.receipt.chanceReveal.longTermIntegrity,
    "accepted_receipt_ed25519_signature");
});

check("opponent_can_preview_but_cannot_confirm_or_apply", () => {
  const opponent = credentials(engine, lowerEnvelope, "opponent", "opponent", "model");
  const legal = engine.legalSpace(lowerEnvelope, { seatAuthority: opponent.seatAuthority });
  const finite = legal.finiteActions.find((entry) => (
    entry.action.executorId === OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID
  ));
  assert.ok(finite);
  const preview = engine.preview({
    envelope: lowerEnvelope,
    seatAuthority: opponent.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
  assert.equal(engine.confirmPreview({
    envelope: lowerEnvelope,
    preview: preview.preview,
    seatAuthority: opponent.seatAuthority,
    occurredAt: OCCURRED_AT,
  }).reason, "CAPABILITY_DENIED");
  assert.equal(engine.apply({
    envelope: lowerEnvelope,
    expectedStateRevision: lowerEnvelope.stateRevision,
    preview: preview.preview,
    seatAuthority: opponent.seatAuthority,
    controlLease: opponent.controlLease,
    idempotencyKey: "opponent-forbidden",
    occurredAt: OCCURRED_AT,
  }).reason, "CAPABILITY_DENIED");
});

check("deterministic_and_chance_receipts_replay_after_hmac_rotation_and_reject_tamper", () => {
  const replayEngine = authority("ticket-11-determine-initiative-hmac-rotated");
  for (const envelope of [lowerEnvelope, tiedEnvelope]) {
    registerReplayDependencies(
      replayEngine,
      envelope,
      runtime,
      liveReport.commandSnapshot,
      gameplayDataBundle,
    );
  }
  const lowerReplay = replayEngine.replay({
    initialEnvelope: lowerEnvelope,
    journal: [lowerAuthority.applied.receipt],
  });
  assert.equal(lowerReplay.ok, true, JSON.stringify(lowerReplay));
  assert.equal(lowerReplay.envelope.stateHash, lowerAuthority.applied.envelope.stateHash);
  const tiedReplay = replayEngine.replay({
    initialEnvelope: tiedEnvelope,
    journal: [tiedAuthority.applied.receipt],
  });
  assert.equal(tiedReplay.ok, true, JSON.stringify(tiedReplay));
  assert.equal(tiedReplay.envelope.stateHash, tiedAuthority.applied.envelope.stateHash);
  const tampered = clone(tiedAuthority.applied.receipt);
  tampered.chanceReveal.reveals[0].outcome =
    tampered.chanceReveal.reveals[0].outcome === 6 ? 5 : 6;
  assert.equal(replayEngine.replay({
    initialEnvelope: tiedEnvelope,
    journal: [tampered],
  }).reason, "SIGNATURE_INVALID");
});

const frozenV1ExecutorSource = await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-determine-initiative-executor-v1.mjs",
));
const currentV2ExecutorSource = await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-determine-initiative-executor-v2.mjs",
));

check("frozen_v1_rejects_current_cleanup_v5_while_v2_and_old_display_remain_explicit", () => {
  assert.equal(contentHash(frozenV1ExecutorSource), FROZEN_V1_EXECUTOR_SOURCE_HASH);
  assert.equal(contentHash(currentV2ExecutorSource), CURRENT_V2_EXECUTOR_SOURCE_HASH);
  assert.equal(enumerateOfficialDetermineInitiativeActionsV1(lowerScoreState, {
    sideKey: "player1",
    matchBinding,
  }).length, 0);
  assert.equal(enumerateOfficialDetermineInitiativeActionsV2(lowerScoreState, {
    sideKey: "player1",
    matchBinding,
  }).length, 1);
  assert.equal(historicalReport.acceptancePassed, 11);
  assert.equal(historicalReport.acceptanceTotal, 11);
  assert.equal(historicalReport.runtime.executorManifest.some((entry) => (
    entry.executorId === OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID
      && entry.executorVersion === "1.0.0"
  )), true);
  assert.equal(slice.historicalCompatibility.previousExecutorSourceMutationAllowed, false);
  assert.equal(slice.historicalCompatibility.rulesRuntimeChanged, true);
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
});

const liveOfficial = {
  coreRules: await fetchOfficialBytes(OFFICIAL_URLS.coreRules, "coreRules"),
  versions: await fetchOfficialJson(OFFICIAL_URLS.versions, "versions"),
  holdPosition: await fetchOfficialJson(OFFICIAL_URLS.holdPosition, "holdPosition"),
};

check("latest_official_core_hold_position_and_71_69_48_data_are_live_current", () => {
  assert.equal(contentHash(liveOfficial.coreRules), CORE_RULES_HASH);
  assert.deepEqual(dataset.dataVersions, {
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  });
  assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
  assert.equal(documentHash(liveOfficial.versions),
    previousReport.liveOfficialRevalidation.hashes.versions);
  assert.equal(documentHash(liveOfficial.holdPosition), documentHash(localDocument(
    firestorePayloads.faction_cards,
    "/faction_cards/mission_hold_position",
  )));
});

check("ctx2skill_harness_dsh_memory_and_training_lanes_remain_closed", () => {
  assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.deepEqual(slice.harness.memoryTraceEvidence,
    { refs: [], promotionAttempted: false });
  assert.equal(slice.rulesEligible, false);
  assert.equal(slice.productionRoomEligible, false);
  assert.equal(slice.trainingTruth, false);
  assert.equal(JSON.stringify(slice).includes("deepseek-harness"), false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_existing_determine_initiative_contract_closure_verification_v1",
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
  frozenExecutorSourceHash: FROZEN_V1_EXECUTOR_SOURCE_HASH,
  currentExecutorSourceHash: CURRENT_V2_EXECUTOR_SOURCE_HASH,
  liveOfficialRevalidation: {
    urls: OFFICIAL_URLS,
    hashes: {
      coreRules: contentHash(liveOfficial.coreRules),
      versions: documentHash(liveOfficial.versions),
      holdPosition: documentHash(liveOfficial.holdPosition),
    },
    dataVersions: dataset.dataVersions,
    repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  },
  authorityFixture: {
    actionSchemaVersion: ACTION_SCHEMA_CONTENT.schemaVersion,
    executorId: lowerAuthority.applied.receipt.action.executorId,
    deterministicReceiptSignatureAlgorithm:
      lowerAuthority.applied.receipt.refereeSignature.signatureAlgorithm,
    chanceReceiptSignatureAlgorithm:
      tiedAuthority.applied.receipt.refereeSignature.signatureAlgorithm,
    chanceRevealCount: tiedAuthority.applied.receipt.chanceReveal.reveals.length,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "determine_initiative_v2_current_and_frozen_v1_historical_replay_passed"
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
    uiTraceEvidence:
      "authority_initiative_trace_only_browser_and_device_ui_pending",
    agentDecisionEvidence:
      "exact_lower_vp_or_tied_hidden_two_d6_branch_selection",
    memoryTraceEvidence: { refs: [], promotionAttempted: false },
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: slice.harness.rollbackOrDemotionRules,
    userVisibleChecks: slice.harness.userVisibleChecks,
  },
  rulesTruth:
    "determine_initiative_v2_current_cleanup_v5_exact_with_frozen_v1_historical_isolation",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR,
    "official-existing-determine-initiative-contract-closure-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    schema: report.schema,
    acceptancePassed: report.acceptancePassed,
    acceptanceTotal: report.acceptanceTotal,
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
    graphHash: graph.graphHash,
    coverage: coverage.counts,
    actionSchemaVersion: report.authorityFixture.actionSchemaVersion,
    rulesTruth: report.rulesTruth,
    trainingTruth: false,
  }, null, 2));
}
