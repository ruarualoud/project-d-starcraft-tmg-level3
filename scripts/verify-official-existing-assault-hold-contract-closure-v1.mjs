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
  OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS,
  OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID,
  OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION,
  applyOfficialAssaultHoldV2,
  enumerateOfficialAssaultHoldActionsV2,
} from "../packages/rule-atoms/official-assault-hold-executor-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingAssaultHoldContractClosureRuleSliceV1,
  verifyOfficialExistingAssaultHoldContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-assault-hold-contract-closure-rule-slice-v1.mjs";
import {
  createOfficialAssaultHoldRelationshipExtensionV1,
  OFFICIAL_ASSAULT_HOLD_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-assault-hold-relationship-contract-v1.mjs";
import { createOfficialMovementHoldRelationshipExtensionV1 } from
  "../packages/rule-atoms/official-movement-hold-relationship-contract-v1.mjs";
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
const OCCURRED_AT = "2026-08-28T13:00:00.000Z";
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

function restriction({ tacticalMass = false, round = 2 } = {}) {
  const body = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_v1",
    declaredRound: round,
    appliesToPhase: "assault",
    engagedEnemyUnitIds: ["p2-unit-1"],
    enemySupplyByUnit: { "p2-unit-1": 1 },
    ownCurrentSupply: tacticalMass ? 2 : 0,
    combinedEngagedEnemySupply: 1,
    tacticalMass,
    rangedAttackProhibited: !tacticalMass,
    chargeProhibited: !tacticalMass,
    evaluatedAtDeclaration: true,
    trainingTruth: false,
  };
  return { ...body, restrictionHash: hashStarcraftTmgContract(body) };
}

function piece(id, sideKey, input = {}) {
  return {
    id,
    sideKey,
    name: id,
    xInches: sideKey === "player1" ? 10 : 30,
    yInches: 12,
    currentModels: 3,
    maxModels: 3,
    currentSupply: 1,
    isOnField: true,
    isDestroyed: false,
    speed: 6,
    baseMm: 32,
    combatTag: "ground",
    weapons: [],
    abilities: [],
    statuses: ["fixture-status"],
    damageMarker: 1,
    activatedPhases: {
      movement: true,
      assault: input.assaultActivated === true,
      combat: false,
    },
    ...(input.disengageAssaultRestriction
      ? { disengageAssaultRestriction: input.disengageAssaultRestriction }
      : {}),
  };
}

function stateFixture({
  phaseChoice = true,
  player2Passed = false,
  secondPlayer1Piece = false,
  postDisengageRestriction = restriction(),
} = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: phaseChoice ? {
      "2:assault": {
        round: 2,
        phase: "assault",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    } : {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: {
        sideKey: "player2",
        passedPhases: player2Passed ? { assault: true } : {},
      },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
    board: {
      widthInches: 54,
      heightInches: 36,
      terrain: [],
      effectMarkers: [],
      tokens: [],
      markers: [],
      accessPoints: [],
    },
    cardResources: {
      player1: [{ id: "p1-card", currentResource: 2, maxResource: 2 }],
      player2: [],
    },
    pieces: [
      piece("p1-unit-1", "player1", {
        disengageAssaultRestriction: postDisengageRestriction,
      }),
      ...(secondPlayer1Piece ? [piece("p1-unit-2", "player1")] : []),
      piece("p2-unit-1", "player2", { assaultActivated: player2Passed }),
    ],
    log: [],
  };
}

const previousReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-movement-hold-contract-closure-v1-report.json",
  ),
  "utf8",
));
const catalogue = previousReport.slice.catalogue;
const runtimeHash = previousReport.runtimeHash;
const previousExtension = createOfficialMovementHoldRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash,
});
const previousGraph = createRuleRelationshipGraphV1({
  catalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);
const extension = createOfficialAssaultHoldRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_ASSAULT_HOLD_RELATIONSHIP_NODE_IDS_V1;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const slice = createOfficialExistingAssaultHoldContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingAssaultHoldContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});

check("assault_hold_closes_three_none_atoms_without_changing_421", () => {
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 92,
    partialContractAtoms: 103,
    noContractAtoms: 226,
    executors: 42,
    declaredStateContractExecutors: 12,
    missingStateContractExecutors: 30,
  });
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 95,
    partialContractAtoms: 103,
    noContractAtoms: 223,
    executors: 42,
    declaredStateContractExecutors: 13,
    missingStateContractExecutors: 29,
  });
  for (const atomId of OFFICIAL_ASSAULT_HOLD_V2_ATOM_IDS) {
    assert.equal(
      previousCoverage.atomCoverage.find((entry) => entry.atomId === atomId)
        ?.contractStatus,
      "none",
    );
    assert.equal(
      coverage.atomCoverage.find((entry) => entry.atomId === atomId)?.contractStatus,
      "strict_complete",
    );
  }
  assert.equal(graphAudit.valid, true);
  assert.deepEqual(sliceAudit.counts, {
    executableRuleAtoms: 421,
    reviewRequiredRuleAtoms: 491,
    displayOnlyRuleAtoms: 114,
    changedAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 0,
    declaredStateContractExecutors: 13,
    stateContractMissingExecutors: 29,
    strictCompleteAtoms: 95,
    partialContractAtoms: 103,
    noContractAtoms: 223,
  });
});

check("restriction_and_hold_paths_reach_all_judge_contracts", () => {
  const restrictionToJudge = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.postDisengageRestriction,
    targetNodeIds: [
      ids.exactActionTest,
      ids.restrictionLifecycleTest,
      ids.restrictionFailClosedTest,
    ],
    relationships: [
      "projects_to",
      "gates",
      "derives",
      "includes",
      "writes",
      "verified_by",
    ],
    maxDepth: 7,
  });
  assert.ok(restrictionToJudge.paths.every((entry) => entry.reached));
  const actionToJudge = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.holdAction,
    targetNodeIds: [
      ids.noOpTest,
      ids.handoffTest,
      ids.phaseCompletionTest,
      ids.replayTest,
    ],
    relationships: ["derives", "writes", "verified_by"],
    maxDepth: 7,
  });
  assert.ok(actionToJudge.paths.every((entry) => entry.reached));
});

check("missing_hold_invalidation_or_judge_edge_blocks_the_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "assault_hold_state_invalidation_v1"
      && entry.provenance !== "assault_hold_judge_v1"
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

check("direct_hold_is_exact_consumes_restriction_and_preserves_non_hold_state", () => {
  const before = stateFixture({ secondPlayer1Piece: true });
  const legal = enumerateOfficialAssaultHoldActionsV2(before, {
    sideKey: "player1",
  });
  assert.deepEqual(legal.map((entry) => entry.pieceId), ["p1-unit-1", "p1-unit-2"]);
  assert.ok(legal.every((entry) => (
    entry.executorId === OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID
      && entry.executorVersion === OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_VERSION
  )));
  assert.equal(enumerateOfficialAssaultHoldActionsV2(before, {
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
  const expectedRestrictionHash = before.pieces[0]
    .disengageAssaultRestriction.restrictionHash;
  const applied = applyOfficialAssaultHoldV2(before, executableAction(legal[0]));
  const heldPiece = applied.state.pieces[0];
  assert.equal(heldPiece.activatedPhases.assault, true);
  assert.equal(applied.state.activeSideKey, "player2");
  assert.equal(Object.hasOwn(heldPiece, "disengageAssaultRestriction"), false);
  assert.equal(heldPiece.disengageAssaultRestrictionHistory.length, 1);
  assert.equal(
    heldPiece.disengageAssaultRestrictionHistory[0].restrictionHash,
    expectedRestrictionHash,
  );
  assert.ok(applied.events.some((entry) => (
    entry.type === "post_disengage_assault_restriction_consumed"
      && entry.restrictionHash === expectedRestrictionHash
  )));
  assert.deepEqual({
    board: applied.state.board,
    scores: applied.state.scores,
    cardResources: applied.state.cardResources,
    positions: applied.state.pieces.map((entry) => [entry.id, entry.xInches, entry.yInches]),
    statuses: applied.state.pieces.map((entry) => [entry.id, entry.statuses]),
    damage: applied.state.pieces.map((entry) => [entry.id, entry.damageMarker]),
  }, protectedBefore);
});

check("malformed_or_stale_restriction_disables_hold_and_apply_fails_closed", () => {
  const malformed = restriction();
  malformed.restrictionHash = "0".repeat(64);
  const state = stateFixture({ postDisengageRestriction: malformed });
  assert.equal(enumerateOfficialAssaultHoldActionsV2(state, {
    sideKey: "player1",
  }).length, 0);
  const auditRows = enumerateOfficialAssaultHoldActionsV2(state, {
    sideKey: "player1",
    includeDisabled: true,
  });
  assert.equal(auditRows[0].disabledReason,
    "ASSAULT_HOLD_POST_DISENGAGE_RESTRICTION_INVALID");
  const validAction = executableAction(enumerateOfficialAssaultHoldActionsV2(
    stateFixture(),
    { sideKey: "player1" },
  )[0]);
  assert.throws(
    () => applyOfficialAssaultHoldV2(state, validAction),
    /ASSAULT_HOLD_V2_ACTION_STALE/u,
  );
  const stale = stateFixture({
    postDisengageRestriction: restriction({ round: 1 }),
  });
  assert.equal(enumerateOfficialAssaultHoldActionsV2(stale, {
    sideKey: "player1",
  }).length, 0);
});

function credentials(engine, envelope, sideKey) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `assault-hold-contract-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `assault-hold-contract-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function applyHold(engine, envelope, access, pieceId, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: access.seatAuthority });
  const row = legal.finiteActions.find((entry) => (
    entry.action.actionType === "hold"
      && entry.action.executorId === OFFICIAL_ASSAULT_HOLD_V2_EXECUTOR_ID
      && entry.action.pieceId === pieceId
  ));
  assert.ok(row, `Assault Hold v2 must be present for ${pieceId}`);
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

function registerReplayDependencies(engine, envelope) {
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

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-existing-assault-hold-contract-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

const engine = authority("ticket-11-existing-assault-hold-hmac-v1");
const blockedEnvelope = engine.createEnvelope({
  roomId: "official-existing-assault-hold-choice-gate-room",
  dataVersion: "71/69/48",
  state: stateFixture({ phaseChoice: false }),
});
const blockedPlayer1 = credentials(engine, blockedEnvelope, "player1");

check("authority_phase_first_actor_choice_is_required_before_hold", () => {
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
  roomId: "official-existing-assault-hold-contract-room",
  dataVersion: "71/69/48",
  state: stateFixture({ player2Passed: true }),
});
const player1 = credentials(engine, initialEnvelope, "player1");
let held;
try {
  held = applyHold(
    engine,
    initialEnvelope,
    player1,
    "p1-unit-1",
    "existing-assault-hold-player1-v1",
  );
} catch (error) {
  acceptance.push({
    id: "authority_legal_preview_apply_precondition",
    passed: false,
    error: String(error?.stack || error),
  });
}

check("last_hold_consumes_restriction_advances_to_combat_and_gates_next_phase", () => {
  assert.ok(held);
  assert.equal(held.applied.envelope.state.phase, "combat");
  assert.equal(held.applied.envelope.state.activeSideKey, "player1");
  assert.equal(held.applied.envelope.state.firstPlayerSideKey, "player1");
  const heldPiece = held.applied.envelope.state.pieces.find((entry) => (
    entry.id === "p1-unit-1"
  ));
  assert.equal(heldPiece.activatedPhases.assault, true);
  assert.equal(Object.hasOwn(heldPiece, "disengageAssaultRestriction"), false);
  assert.equal(heldPiece.disengageAssaultRestrictionHistory.length, 1);
  for (const eventType of [
    "hold",
    "post_disengage_assault_restriction_consumed",
    "phase_activation_markers_completed",
    "phase_advanced",
  ]) {
    assert.ok(held.applied.receipt.events.some((entry) => (
      entry.type === eventType
    )), `missing ${eventType}`);
  }
  const nextLegal = engine.legalSpace(held.applied.envelope, {
    seatAuthority: player1.seatAuthority,
  });
  assert.ok(nextLegal.finiteActions.length > 0);
  assert.ok(nextLegal.finiteActions.every((entry) => (
    entry.action.actionType === "choose_first_actor"
  )));
});

check("assault_hold_receipt_replays_after_hmac_rotation_and_tamper_fails", () => {
  assert.ok(held);
  const replayEngine = authority("ticket-11-existing-assault-hold-hmac-rotated-v1");
  registerReplayDependencies(replayEngine, initialEnvelope);
  const replayed = replayEngine.replay({
    initialEnvelope,
    journal: [held.applied.receipt],
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, held.applied.envelope.stateHash);
  const tampered = clone(held.applied.receipt);
  tampered.events.push({ type: "forged_assault_hold" });
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
  schema: "starcraft_tmg_existing_assault_hold_contract_closure_verification_v1",
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
      ? "assault_hold_receipt_replays_after_hmac_rotation"
      : "failed",
    promotions: [],
    blocks: ["29_existing_executors_still_require_state_contracts"],
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
    uiTraceEvidence: ["assault-hold-hidden-until-phase-first-actor-choice"],
    agentDecisionEvidence: [
      "exact-active-unactivated-piece-hold-denominator",
      "post-disengage-restriction-fails-closed-and-consumes-on-hold",
    ],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing-state-invalidation-or-judge-edge-removes-contract",
      "receipt-replay-or-signature-failure-removes-contract",
    ],
    userVisibleChecks: [
      "assault-hold-restriction-consumption-and-automatic-combat-handoff",
    ],
  },
  rulesTruth:
    "frozen_assault_hold_v2_executor_with_explicit_state_and_restriction_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-assault-hold-contract-closure-v1-report.json",
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
