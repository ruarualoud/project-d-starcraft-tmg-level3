#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalStarcraftTmgJson } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
  OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
  applyOfficialMovementHoldV1,
  enumerateOfficialMovementHoldActionsV1,
} from "../packages/rule-atoms/official-movement-hold-executor-v1.mjs";
import {
  createOfficialMovementHoldRelationshipExtensionV1,
  OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-movement-hold-relationship-contract-v1.mjs";
import {
  createOfficialExistingMovementHoldContractClosureRuleSliceV1,
  verifyOfficialExistingMovementHoldContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-movement-hold-contract-closure-rule-slice-v1.mjs";
import { createOfficialActivationPassRelationshipExtensionV1 } from
  "../packages/rule-atoms/official-activation-pass-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-28T12:00:00.000Z";
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

async function fetchOfficialJson(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`${kind} HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function piece(id, sideKey, movementActivated = false) {
  return {
    id,
    sideKey,
    name: id,
    xInches: sideKey === "player1" ? 10 : 30,
    yInches: 12,
    currentModels: 3,
    maxModels: 3,
    isOnField: true,
    isDestroyed: false,
    speed: 6,
    baseMm: 32,
    weapons: [{
      name: "Fixture Rifle",
      range: 12,
      hit: "4+",
      roa: 1,
      damage: 1,
      phase: "assault",
    }],
    abilities: [],
    statuses: ["fixture-status"],
    damageMarker: 1,
    activatedPhases: {
      movement: movementActivated,
      assault: false,
      combat: false,
    },
  };
}

function stateFixture({
  phaseChoice = true,
  player2Passed = false,
  secondPlayer1Piece = false,
} = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: phaseChoice ? {
      "2:movement": {
        round: 2,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    } : {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: {
        sideKey: "player2",
        passedPhases: player2Passed ? { movement: true } : {},
      },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
    board: { widthInches: 54, heightInches: 36, terrain: [], effectMarkers: [] },
    cardResources: {
      player1: [{ id: "p1-card", currentResource: 2, maxResource: 2 }],
      player2: [],
    },
    pieces: [
      piece("p1-unit-1", "player1"),
      ...(secondPlayer1Piece ? [piece("p1-unit-2", "player1")] : []),
      piece("p2-unit-1", "player2", player2Passed),
    ],
    log: [],
  };
}

function credentials(engine, envelope, sideKey) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `movement-hold-contract-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `movement-hold-contract-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function applyHold(engine, envelope, access, pieceId, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: access.seatAuthority });
  const row = legal.finiteActions.find((entry) => (
    entry.action.actionType === "hold" && entry.action.pieceId === pieceId
  ));
  assert.ok(row, `Hold must be present for ${pieceId}`);
  const previewed = engine.preview({
    envelope,
    seatAuthority: access.seatAuthority,
    proposal: { kind: "finite", actionKey: row.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(previewed.ok, true, JSON.stringify(previewed));
  let confirmation;
  if (previewed.preview.core.confirmationPolicy.requiresExplicitHuman) {
    const confirmed = engine.confirmPreview({
      envelope,
      preview: previewed.preview,
      seatAuthority: access.seatAuthority,
      occurredAt: OCCURRED_AT,
    });
    assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
    confirmation = confirmed.confirmation;
  }
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: previewed.preview,
    confirmation,
    seatAuthority: access.seatAuthority,
    controlLease: access.controlLease,
    idempotencyKey,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { legal, row, previewed, applied };
}

function registerReplayDependencies(engine, envelope, runtime) {
  const contents = {
    sourceSnapshot: {
      kind: "development-source-snapshot",
      gameId: "starcraft-tmg",
      dataVersion: "71/69/48",
    },
    dataSnapshot: {
      kind: "development-data-snapshot",
      gameId: "starcraft-tmg",
      dataVersion: "71/69/48",
    },
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
    "official-existing-activation-pass-contract-closure-v1-report.json",
  ),
  "utf8",
));
const catalogue = previousReport.slice.catalogue;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const previousExtension = createOfficialActivationPassRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const previousGraph = createRuleRelationshipGraphV1({
  catalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);
const extension = createOfficialMovementHoldRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_MOVEMENT_HOLD_RELATIONSHIP_NODE_IDS_V1;
const slice = createOfficialExistingMovementHoldContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingMovementHoldContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});

check("movement_hold_closes_three_partial_atoms_without_changing_421", () => {
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 89,
    partialContractAtoms: 106,
    noContractAtoms: 226,
    executors: 42,
    declaredStateContractExecutors: 11,
    missingStateContractExecutors: 31,
  });
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 92,
    partialContractAtoms: 103,
    noContractAtoms: 226,
    executors: 42,
    declaredStateContractExecutors: 12,
    missingStateContractExecutors: 30,
  });
  for (const atomId of OFFICIAL_MOVEMENT_HOLD_ATOM_IDS) {
    assert.equal(
      previousCoverage.atomCoverage.find((entry) => entry.atomId === atomId)
        ?.contractStatus,
      "partial",
    );
    assert.equal(
      coverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus,
      "strict_complete",
    );
  }
  assert.deepEqual(sliceAudit.counts, {
    executableRuleAtoms: 421,
    reviewRequiredRuleAtoms: 491,
    displayOnlyRuleAtoms: 114,
    changedAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 0,
    declaredStateContractExecutors: 12,
    stateContractMissingExecutors: 30,
    strictCompleteAtoms: 92,
    partialContractAtoms: 103,
    noContractAtoms: 226,
  });
});

check("piece_eligibility_and_hold_handoff_reach_their_judge_contracts", () => {
  const eligibility = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.pieces,
    targetNodeIds: [ids.exactActionTest, ids.noOpTest],
    relationships: [
      "projects_to",
      "derives",
      "includes",
      "writes",
      "verified_by",
    ],
    maxDepth: 6,
  });
  assert.ok(eligibility.paths.every((entry) => entry.reached));
  const handoff = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.holdAction,
    targetNodeIds: [ids.handoffTest, ids.phaseCompletionTest, ids.replayTest],
    relationships: ["derives", "writes", "verified_by"],
    maxDepth: 6,
  });
  assert.ok(handoff.paths.every((entry) => entry.reached));
});

check("missing_hold_invalidation_or_judge_edge_blocks_the_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "movement_hold_state_invalidation_v1"
      && entry.provenance !== "movement_hold_judge_v1"
  ));
  const brokenAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
    catalogue,
    extension: broken,
  }));
  assert.equal(brokenAudit.valid, false);
  assert.ok(brokenAudit.gaps.requiredEdgeGaps.length > 0);
  assert.ok(brokenAudit.gaps.requiredPathGaps.length > 0);
  assert.ok(brokenAudit.gaps.evidenceTestGaps.length > 0);
});

check("direct_hold_is_exactly_one_active_piece_and_preserves_non_hold_state", () => {
  const before = stateFixture({ secondPlayer1Piece: true });
  const legal = enumerateOfficialMovementHoldActionsV1(before, {
    sideKey: "player1",
  });
  assert.deepEqual(legal.map((entry) => entry.pieceId), ["p1-unit-1", "p1-unit-2"]);
  assert.equal(enumerateOfficialMovementHoldActionsV1(before, {
    sideKey: "player2",
  }).length, 0);
  const protectedBefore = clone({
    board: before.board,
    scores: before.scores,
    cardResources: before.cardResources,
    positions: before.pieces.map((entry) => [entry.id, entry.xInches, entry.yInches]),
    statuses: before.pieces.map((entry) => [entry.id, entry.statuses]),
    damage: before.pieces.map((entry) => [entry.id, entry.damageMarker]),
  });
  const applied = applyOfficialMovementHoldV1(before, {
    actionType: "hold",
    sideKey: "player1",
    pieceId: "p1-unit-1",
  });
  assert.equal(applied.state.pieces[0].activatedPhases.movement, true);
  assert.equal(applied.state.activeSideKey, "player2");
  assert.deepEqual({
    board: applied.state.board,
    scores: applied.state.scores,
    cardResources: applied.state.cardResources,
    positions: applied.state.pieces.map((entry) => [entry.id, entry.xInches, entry.yInches]),
    statuses: applied.state.pieces.map((entry) => [entry.id, entry.statuses]),
    damage: applied.state.pieces.map((entry) => [entry.id, entry.damageMarker]),
  }, protectedBefore);
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-existing-movement-hold-contract-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

const engine = authority("ticket-11-existing-movement-hold-hmac-v1");
const blockedEnvelope = engine.createEnvelope({
  roomId: "official-existing-movement-hold-choice-gate-room",
  dataVersion: "71/69/48",
  state: stateFixture({ phaseChoice: false }),
});
const blockedPlayer1 = credentials(engine, blockedEnvelope, "player1");

check("phase_first_actor_choice_is_required_before_hold", () => {
  const legal = engine.legalSpace(blockedEnvelope, {
    seatAuthority: blockedPlayer1.seatAuthority,
  });
  assert.equal(legal.finiteActions.some((entry) => (
    entry.action.actionType === "hold"
  )), false);
  assert.ok(legal.finiteActions.every((entry) => (
    entry.action.actionType === "choose_first_actor"
  )));
});

const initialEnvelope = engine.createEnvelope({
  roomId: "official-existing-movement-hold-contract-room",
  dataVersion: "71/69/48",
  state: stateFixture({ player2Passed: true }),
});
const player1 = credentials(engine, initialEnvelope, "player1");
const held = applyHold(
  engine,
  initialEnvelope,
  player1,
  "p1-unit-1",
  "existing-movement-hold-player1-v1",
);

check("last_hold_after_opponent_pass_completes_phase_and_requires_fresh_choice", () => {
  assert.equal(held.applied.envelope.state.pieces[0].activatedPhases.movement, true);
  assert.equal(held.applied.envelope.state.phase, "assault");
  assert.equal(held.applied.envelope.state.activeSideKey, "player1");
  assert.equal(held.applied.envelope.state.firstPlayerSideKey, "player1");
  assert.ok(held.applied.receipt.events.some((entry) => (
    entry.type === "hold"
  )));
  assert.ok(held.applied.receipt.events.some((entry) => (
    entry.type === "phase_activation_markers_completed"
  )));
  assert.ok(held.applied.receipt.events.some((entry) => (
    entry.type === "phase_advanced"
  )));
  const nextLegal = engine.legalSpace(held.applied.envelope, {
    seatAuthority: player1.seatAuthority,
  });
  assert.ok(nextLegal.finiteActions.length > 0);
  assert.ok(nextLegal.finiteActions.every((entry) => (
    entry.action.actionType === "choose_first_actor"
  )));
});

check("movement_hold_receipt_replays_after_hmac_rotation_and_tamper_fails", () => {
  const replayEngine = authority("ticket-11-existing-movement-hold-hmac-rotated-v1");
  registerReplayDependencies(replayEngine, initialEnvelope, runtime);
  const replayed = replayEngine.replay({
    initialEnvelope,
    journal: [held.applied.receipt],
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, held.applied.envelope.stateHash);
  const tampered = clone(held.applied.receipt);
  tampered.events.push({ type: "forged_movement_hold" });
  assert.equal(replayEngine.replay({
    initialEnvelope,
    journal: [tampered],
  }).reason, "SIGNATURE_INVALID");
});

const liveDocuments = {};
for (const [kind, url] of Object.entries(previousReport.liveOfficialRevalidation.urls)) {
  liveDocuments[kind] = await fetchOfficialJson(url, kind);
}

check("live_official_71_69_48_and_bound_documents_remain_current", () => {
  const versions = liveDocuments.versions.fields;
  assert.deepEqual({
    unitsVersion: versions.unitsVersion.integerValue,
    cardsVersion: versions.cardsVersion.integerValue,
    rulesVersion: versions.rulesVersion.integerValue,
  }, {
    unitsVersion: "71",
    cardsVersion: "69",
    rulesVersion: "48",
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(liveDocuments).map(([kind, document]) => (
      [kind, documentHash(document)]
    ))),
    previousReport.liveOfficialRevalidation.hashes,
  );
  assert.equal(previousReport.liveOfficialRevalidation.repositoryFallbackUsed, false);
});

const failures = acceptance.filter((entry) => !entry.passed);
const report = {
  schema: "starcraft_tmg_existing_movement_hold_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  liveOfficialRevalidation: {
    urls: previousReport.liveOfficialRevalidation.urls,
    hashes: Object.fromEntries(Object.entries(liveDocuments).map(([kind, document]) => (
      [kind, documentHash(document)]
    ))),
    repositoryFallbackUsed: false,
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
  versionReassignedRuleAtomIds: [],
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "movement_hold_receipt_replays_after_hmac_rotation"
      : "failed",
    promotions: [],
    blocks: ["30_existing_executors_still_require_state_contracts"],
    remainingRuleGaps: 491,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt"],
    harnessToolsCalled: [
      "list_legal_actions",
      "preview_action",
      "apply_action_after_user_confirmation",
      "replay_room",
      "query_rule_relationship_impact",
    ],
    uiTraceEvidence: ["hold-hidden-until-phase-first-actor-choice"],
    agentDecisionEvidence: ["exact-active-unactivated-piece-hold-denominator"],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing-state-invalidation-or-judge-edge-removes-contract",
      "receipt-replay-or-signature-failure-removes-contract",
    ],
    userVisibleChecks: ["hold-activation-and-automatic-phase-handoff"],
  },
  rulesTruth: "frozen_movement_hold_executor_with_explicit_state_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-movement-hold-contract-closure-v1-report.json",
  ),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  previousGraphHash: report.previousGraphHash,
  graphHash: graph.graphHash,
  previousCoverage: previousCoverage.counts,
  coverage: coverage.counts,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
