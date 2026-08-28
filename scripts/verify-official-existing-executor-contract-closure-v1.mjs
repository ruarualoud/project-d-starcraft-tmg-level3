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
  createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-stimpack-casualty-relationship-contract-v5.mjs";
import {
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";
import {
  createOfficialPhaseInitiativeRelationshipExtensionV1,
  OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-phase-initiative-relationship-contract-v1.mjs";
import {
  createOfficialExistingExecutorContractClosureRuleSliceV1,
  verifyOfficialExistingExecutorContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-executor-contract-closure-rule-slice-v1.mjs";
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
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
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

async function fetchOfficial(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response.json();
      lastError = new Error(`${kind} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function stateFixture(phase = "assault") {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase,
    activeSideKey: "player2",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    board: { widthInches: 54, heightInches: 36, terrain: [], accessPoints: [] },
    pieces: [],
    log: [],
  };
}

function credentials(engine, envelope, seatKey) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `existing-contract-${seatKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `existing-contract-${seatKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

const previousReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-marine-multi-enemy-stimpack-casualty-v5-report.json",
  ),
  "utf8",
));
const catalogue = previousReport.slice.catalogue;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const previousExtension =
  createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5({
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
const previousGraph = createRuleRelationshipGraphV1({
  catalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);

check("frozen_421_baseline_is_split_into_strict_partial_and_uncontracted_atoms", () => {
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 76,
    partialContractAtoms: 106,
    noContractAtoms: 239,
    executors: 42,
    declaredStateContractExecutors: 9,
    missingStateContractExecutors: 33,
  });
  assert.equal(
    previousCoverage.strictCompleteAtomIds.length
      + previousCoverage.partialContractAtomIds.length
      + previousCoverage.noContractAtomIds.length,
    421,
  );
});

const extension = createOfficialPhaseInitiativeRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_PHASE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1;
const slice = createOfficialExistingExecutorContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingExecutorContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});

check("slice_50_retains_all_421_atoms_runtime_and_historical_display_exactly", () => {
  assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
  assert.equal(slice.catalogueHash, catalogue.catalogueHash);
  assert.equal(slice.ruleRelationshipGraphBinding.graphHash, graph.graphHash);
  assert.equal(slice.historicalCompatibility.rulesRuntimeChanged, false);
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.deepEqual(slice.newlyExecutableRuleAtomIds, []);
  assert.deepEqual(slice.versionReassignedRuleAtomIds, []);
  assert.deepEqual(slice.executorIds, []);
  assert.deepEqual(sliceAudit.counts, {
    executableRuleAtoms: 421,
    reviewRequiredRuleAtoms: 491,
    displayOnlyRuleAtoms: 114,
    changedAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 0,
    declaredStateContractExecutors: 10,
    stateContractMissingExecutors: 32,
    strictCompleteAtoms: 79,
    partialContractAtoms: 106,
    noContractAtoms: 236,
  });
});

check("phase_initiative_is_a_real_tenth_state_contract_not_an_atom_recount", () => {
  assert.equal(graphAudit.valid, true);
  assert.equal(graphAudit.declaredScopesValid, true);
  assert.equal(graphAudit.counts.executableRuleAtoms, 421);
  assert.equal(graphAudit.counts.executors, 42);
  assert.equal(graphAudit.counts.declaredStateContractExecutors, 10);
  assert.equal(graphAudit.counts.stateContractMissingExecutors, 32);
  assert.equal(
    graphAudit.gaps.stateContractMissingExecutorIds.includes(
      OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
    ),
    false,
  );
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 79,
    partialContractAtoms: 106,
    noContractAtoms: 236,
    executors: 42,
    declaredStateContractExecutors: 10,
    missingStateContractExecutors: 32,
  });
});

check("marker_phase_and_existing_choice_reach_the_exact_judge_contracts", () => {
  const markerImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.firstPlayerSideKey,
    targetNodeIds: [ids.markerHolderTest, ids.applyTest],
    relationships: ["gates", "includes", "writes", "verified_by"],
    maxDepth: 5,
  });
  assert.ok(markerImpact.paths.every((entry) => entry.reached));
  const staleImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.phaseFirstActorByRound,
    targetNodeIds: [ids.freshChoiceTest],
    relationships: ["invalidates", "verified_by"],
    maxDepth: 3,
  });
  assert.deepEqual(staleImpact.reachedNodeIds, [ids.freshChoiceTest]);
});

check("missing_state_invalidation_or_judge_edge_blocks_the_declared_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "phase_choice_state_invalidation_v1"
      && entry.provenance !== "phase_initiative_judge_v1"
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

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-existing-phase-contract-referee-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

function registerReplayDependencies(replayEngine, envelope) {
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

const engine = authority("ticket-11-existing-phase-contract-hmac-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-existing-phase-contract-room",
  dataVersion: "71/69/48",
  state: stateFixture(),
});
const player1 = credentials(engine, initialEnvelope, "player1");
const player2 = credentials(engine, initialEnvelope, "player2");

check("only_marker_holder_sees_both_exact_choices_even_when_active_side_differs", () => {
  const holder = engine.legalSpace(initialEnvelope, {
    seatAuthority: player1.seatAuthority,
  });
  const nonHolder = engine.legalSpace(initialEnvelope, {
    seatAuthority: player2.seatAuthority,
  });
  assert.deepEqual(holder.finiteActions.map((entry) => (
    entry.action.chosenFirstActorSideKey
  )).sort(), ["player1", "player2"]);
  assert.equal(nonHolder.finiteActions.length, 0);
});

const legal = engine.legalSpace(initialEnvelope, { seatAuthority: player1.seatAuthority });
const opponentFirst = legal.finiteActions.find((entry) => (
  entry.action.actionType === "choose_first_actor"
    && entry.action.chosenFirstActorSideKey === "player2"
));
assert.ok(opponentFirst);
const previewed = engine.preview({
  envelope: initialEnvelope,
  seatAuthority: player1.seatAuthority,
  proposal: { kind: "finite", actionKey: opponentFirst.actionKey },
});
assert.equal(previewed.ok, true, JSON.stringify(previewed));
const confirmed = engine.confirmPreview({
  envelope: initialEnvelope,
  preview: previewed.preview,
  seatAuthority: player1.seatAuthority,
});
assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
const applied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision,
  preview: previewed.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: player1.seatAuthority,
  controlLease: player1.controlLease,
  idempotencyKey: "existing-phase-contract-apply-v1",
});
assert.equal(applied.ok, true, JSON.stringify(applied));

check("apply_writes_choice_and_active_side_without_changing_marker_holder", () => {
  assert.equal(applied.envelope.state.activeSideKey, "player2");
  assert.equal(applied.envelope.state.firstPlayerSideKey, "player1");
  assert.deepEqual(applied.envelope.state.phaseFirstActorByRound["2:assault"], {
    round: 2,
    phase: "assault",
    markerHolderSideKey: "player1",
    chosenFirstActorSideKey: "player2",
  });
});

check("ed25519_receipt_replays_after_hmac_rotation_and_tamper_fails", () => {
  const replayEngine = authority("ticket-11-existing-phase-contract-hmac-rotated-v1");
  registerReplayDependencies(replayEngine, initialEnvelope);
  const replayed = replayEngine.replay({
    initialEnvelope,
    journal: [applied.receipt],
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
  const tampered = clone(applied.receipt);
  tampered.events.push({ type: "forged_phase_choice" });
  assert.equal(replayEngine.replay({
    initialEnvelope,
    journal: [tampered],
  }).reason, "SIGNATURE_INVALID");
});

const liveDocuments = Object.fromEntries(await Promise.all(Object.entries(
  previousReport.liveOfficialRevalidation.urls,
).map(async ([kind, url]) => [kind, await fetchOfficial(url, kind)])));

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
  schema: "starcraft_tmg_existing_executor_contract_closure_verification_v1",
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
      ? "phase_initiative_receipt_replays_after_hmac_rotation"
      : "failed",
    promotions: [],
    blocks: ["32_existing_executors_still_require_state_contracts"],
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
    uiTraceEvidence: ["marker-holder-sees-two-exact-first-actor-choices"],
    agentDecisionEvidence: ["non-marker-seat-cannot-choose-first-actor"],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing-state-invalidation-or-judge-edge-removes-contract",
      "receipt-replay-or-signature-failure-removes-contract",
    ],
    userVisibleChecks: ["chosen-seat-becomes-active-with-marker-holder-unchanged"],
  },
  rulesTruth: "frozen_phase_initiative_executor_with_explicit_state_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-existing-executor-contract-closure-v1-report.json"),
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
