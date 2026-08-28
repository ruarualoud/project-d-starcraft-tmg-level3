#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { canonicalStarcraftTmgJson } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
  applyOfficialActivationPassV1,
  enumerateOfficialActivationPassActionsV1,
} from "../packages/rule-atoms/official-activation-pass-executor-v1.mjs";
import {
  createOfficialActivationPassRelationshipExtensionV1,
  OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-activation-pass-relationship-contract-v1.mjs";
import {
  createOfficialExistingActivationPassContractClosureRuleSliceV1,
  verifyOfficialExistingActivationPassContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-activation-pass-contract-closure-rule-slice-v1.mjs";
import {
  createOfficialPhaseInitiativeRelationshipExtensionV1,
} from "../packages/rule-atoms/official-phase-initiative-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  auditExecutableAtomStateContractCoverageV1,
} from "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-28T00:00:00.000Z";
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
    yInches: id.endsWith("2") ? 18 : 12,
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
    statuses: [],
    activatedPhases: {
      movement: movementActivated,
      assault: false,
      combat: false,
    },
  };
}

function stateFixture({ phaseChoice = true, allMovementActivated = false } = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player2",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: phaseChoice ? {
      "2:movement": {
        round: 2,
        phase: "movement",
        markerHolderSideKey: "player2",
        chosenFirstActorSideKey: "player1",
      },
    } : {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
    board: { widthInches: 54, heightInches: 36, terrain: [], effectMarkers: [] },
    cardResources: { player1: [], player2: [] },
    pieces: [
      piece("p1-unit-1", "player1", allMovementActivated),
      piece("p1-unit-2", "player1", allMovementActivated),
      piece("p2-unit-1", "player2", allMovementActivated),
      piece("p2-unit-2", "player2", allMovementActivated),
    ],
    log: [],
  };
}

function credentials(engine, envelope, sideKey) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `activation-contract-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `activation-contract-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function applyPass(engine, envelope, access, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: access.seatAuthority });
  const row = legal.finiteActions.find((entry) => entry.action.actionType === "pass");
  assert.ok(row, "pass must be present in current LegalSpace");
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
  path.join(OUTPUT_DIR, "official-existing-executor-contract-closure-v1-report.json"),
  "utf8",
));
const catalogue = previousReport.slice.catalogue;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const previousExtension = createOfficialPhaseInitiativeRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const previousGraph = createRuleRelationshipGraphV1({
  catalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);
const extension = createOfficialActivationPassRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_ACTIVATION_PASS_RELATIONSHIP_NODE_IDS_V1;
const slice = createOfficialExistingActivationPassContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingActivationPassContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});

check("activation_pass_closes_ten_existing_atoms_without_changing_421", () => {
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 79,
    partialContractAtoms: 106,
    noContractAtoms: 236,
    executors: 42,
    declaredStateContractExecutors: 10,
    missingStateContractExecutors: 32,
  });
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 89,
    partialContractAtoms: 106,
    noContractAtoms: 226,
    executors: 42,
    declaredStateContractExecutors: 11,
    missingStateContractExecutors: 31,
  });
  assert.equal(
    graphAudit.gaps.stateContractMissingExecutorIds.includes(
      OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
    ),
    false,
  );
  assert.deepEqual(sliceAudit.counts, {
    executableRuleAtoms: 421,
    reviewRequiredRuleAtoms: 491,
    displayOnlyRuleAtoms: 114,
    changedAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 0,
    declaredStateContractExecutors: 11,
    stateContractMissingExecutors: 31,
    strictCompleteAtoms: 89,
    partialContractAtoms: 106,
    noContractAtoms: 226,
  });
});

check("pass_state_and_phase_choice_reach_the_exact_judge_contracts", () => {
  const availabilityImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.pieces,
    targetNodeIds: [ids.optionalMandatoryTest],
    relationships: ["derives", "includes", "verified_by"],
    maxDepth: 5,
  });
  assert.ok(availabilityImpact.paths.every((entry) => entry.reached));
  const handoffImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.passAction,
    targetNodeIds: [ids.phaseCompletionTest, ids.replayTest],
    relationships: ["derives", "writes", "verified_by"],
    maxDepth: 5,
  });
  assert.ok(handoffImpact.paths.every((entry) => entry.reached));
  const phaseChoiceImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.phaseFirstActorByRound,
    targetNodeIds: [ids.phaseChoiceGateTest],
    relationships: ["gates", "verified_by"],
    maxDepth: 3,
  });
  assert.ok(phaseChoiceImpact.paths.every((entry) => entry.reached));
});

check("missing_pass_invalidation_or_judge_edge_blocks_the_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "activation_pass_state_invalidation_v1"
      && entry.provenance !== "activation_pass_judge_v1"
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

check("availability_classifies_optional_or_mandatory_but_never_gates_pass", () => {
  const optional = enumerateOfficialActivationPassActionsV1(stateFixture(), {
    sideKey: "player1",
  });
  assert.equal(optional[0].details.passKind, "optional");
  const mandatoryState = stateFixture({ allMovementActivated: true });
  const mandatory = enumerateOfficialActivationPassActionsV1(mandatoryState, {
    sideKey: "player1",
  });
  assert.equal(mandatory[0].details.passKind, "mandatory");
  assert.equal(optional[0].actionType, "pass");
  assert.equal(mandatory[0].actionType, "pass");
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-existing-activation-pass-contract-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

const engine = authority("ticket-11-existing-activation-pass-hmac-v1");
const blockedEnvelope = engine.createEnvelope({
  roomId: "official-existing-activation-pass-choice-gate-room",
  dataVersion: "71/69/48",
  state: stateFixture({ phaseChoice: false }),
});
const blockedPlayer1 = credentials(engine, blockedEnvelope, "player1");

check("phase_first_actor_choice_is_required_before_pass", () => {
  const legal = engine.legalSpace(blockedEnvelope, {
    seatAuthority: blockedPlayer1.seatAuthority,
  });
  assert.equal(legal.finiteActions.some((entry) => (
    entry.action.actionType === "pass"
  )), false);
});

const initialEnvelope = engine.createEnvelope({
  roomId: "official-existing-activation-pass-contract-room",
  dataVersion: "71/69/48",
  state: stateFixture({ allMovementActivated: true }),
});
const player1 = credentials(engine, initialEnvelope, "player1");
const player2 = credentials(engine, initialEnvelope, "player2");
const firstPass = applyPass(
  engine,
  initialEnvelope,
  player1,
  "existing-activation-pass-player1-v1",
);
const secondPass = applyPass(
  engine,
  firstPass.applied.envelope,
  player2,
  "existing-activation-pass-player2-v1",
);

check("first_pass_sets_marker_and_second_pass_completes_phase_without_overwriting_it", () => {
  assert.equal(firstPass.applied.receipt.events.find((entry) => (
    entry.type === "pass"
  ))?.passKind, "mandatory");
  assert.equal(firstPass.applied.envelope.state.firstPlayerSideKey, "player1");
  assert.equal(firstPass.applied.envelope.state.activeSideKey, "player2");
  assert.equal(secondPass.applied.envelope.state.phase, "assault");
  assert.equal(secondPass.applied.envelope.state.firstPlayerSideKey, "player1");
  assert.equal(secondPass.applied.envelope.state.activeSideKey, "player1");
  assert.ok(secondPass.applied.receipt.events.some((entry) => (
    entry.type === "phase_advanced"
  )));
  const nextLegal = engine.legalSpace(secondPass.applied.envelope, {
    seatAuthority: player1.seatAuthority,
  });
  assert.equal(nextLegal.finiteActions.some((entry) => (
    entry.action.actionType === "pass"
  )), false);
  assert.ok(nextLegal.finiteActions.every((entry) => (
    entry.action.actionType === "choose_first_actor"
  )));
});

check("two_ed25519_receipts_replay_after_hmac_rotation_and_tamper_fails", () => {
  const replayEngine = authority("ticket-11-existing-activation-pass-hmac-rotated-v1");
  registerReplayDependencies(replayEngine, initialEnvelope, runtime);
  const journal = [firstPass.applied.receipt, secondPass.applied.receipt];
  const replayed = replayEngine.replay({ initialEnvelope, journal });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, secondPass.applied.envelope.stateHash);
  const tampered = clone(journal);
  tampered[1].events.push({ type: "forged_activation_pass" });
  assert.equal(replayEngine.replay({
    initialEnvelope,
    journal: tampered,
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
  schema: "starcraft_tmg_existing_activation_pass_contract_closure_verification_v1",
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
      ? "activation_pass_receipts_replay_after_hmac_rotation"
      : "failed",
    promotions: [],
    blocks: ["31_existing_executors_still_require_state_contracts"],
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
    uiTraceEvidence: ["pass-hidden-until-phase-first-actor-choice"],
    agentDecisionEvidence: ["availability-classifies-but-does-not-gate-pass"],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing-state-invalidation-or-judge-edge-removes-contract",
      "receipt-replay-or-signature-failure-removes-contract",
    ],
    userVisibleChecks: ["first-passer-marker-and-automatic-phase-handoff"],
  },
  rulesTruth: "frozen_activation_pass_executor_with_explicit_state_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-activation-pass-contract-closure-v1-report.json",
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
