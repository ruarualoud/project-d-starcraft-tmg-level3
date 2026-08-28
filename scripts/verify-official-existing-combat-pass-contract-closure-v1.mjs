#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalStarcraftTmgJson,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createOfficialCombatPassRelationshipExtensionV1,
  OFFICIAL_COMBAT_PASS_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-combat-pass-relationship-contract-v1.mjs";
import {
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-combat-pass-executor-v2.mjs";
import {
  applyOfficialCombatPassV3,
  enumerateOfficialCombatPassV3Actions,
  OFFICIAL_COMBAT_PASS_V3_ATOM_IDS,
  OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-combat-pass-executor-v3.mjs";
import { createOfficialAssaultHoldRelationshipExtensionV1 } from
  "../packages/rule-atoms/official-assault-hold-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialExistingCombatPassContractClosureRuleSliceV1,
  verifyOfficialExistingCombatPassContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-combat-pass-contract-closure-rule-slice-v1.mjs";
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
const OCCURRED_AT = "2026-08-28T14:00:00.000Z";
const PREVIOUS_RUNTIME_HASH =
  "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a";
const PREVIOUS_EXECUTOR_SOURCE_HASH =
  "8043c50a8a3aae9fc7dd556f14ae6da817690ae2ef5fed1605c20e9c59dd9b32";
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

function model(id, xInches, input = {}) {
  return {
    id,
    xInches,
    yInches: 10,
    baseShape: "round",
    baseWidthInches: 1,
    baseDepthInches: 1,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isDestroyed: false,
    ...input,
  };
}

function piece(id, sideKey, xInches, input = {}) {
  return {
    id,
    sideKey,
    name: id,
    combatTag: "ground",
    currentModels: 1,
    maxModels: 1,
    currentSupply: 1,
    isOnField: true,
    isDestroyed: false,
    models: [model(`${id}-model`, xInches)],
    activatedPhases: { movement: true, assault: true, combat: false },
    statuses: ["fixture-status"],
    damageMarker: 1,
    ...input,
  };
}

function stateFixture({
  phaseChoice = true,
  phaseChoiceMarkerHolder = "player1",
  player1Passed = false,
  player2Passed = false,
  engaged = false,
  player1Activated = false,
} = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "combat",
    activeSideKey: player1Passed ? "player2" : "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: phaseChoice ? {
      "2:combat": {
        round: 2,
        phase: "combat",
        markerHolderSideKey: phaseChoiceMarkerHolder,
        chosenFirstActorSideKey: "player1",
      },
    } : {},
    players: {
      player1: {
        sideKey: "player1",
        passedPhases: player1Passed ? { combat: true } : {},
      },
      player2: {
        sideKey: "player2",
        passedPhases: player2Passed ? { combat: true } : {},
      },
    },
    scores: { player1: 2, player2: 1 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
    board: {
      widthInches: 54,
      heightInches: 36,
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
      terrain: [],
      accessPoints: [],
      effectMarkers: [{ id: "fixture-effect" }],
      tokens: [{ id: "fixture-token" }],
      markers: [{ id: "fixture-marker" }],
    },
    cardResources: {
      player1: [{ id: "p1-card", currentResource: 2, maxResource: 2 }],
      player2: [{ id: "p2-card", currentResource: 1, maxResource: 2 }],
    },
    pieces: [
      piece("p1-unit", "player1", 10, {
        activatedPhases: {
          movement: true,
          assault: true,
          combat: player1Activated,
        },
      }),
      piece("p2-unit", "player2", engaged ? 11 : 20),
    ],
    log: [],
  };
}

function protectedState(state) {
  return clone({
    board: state.board,
    pieces: state.pieces,
    scores: state.scores,
    cardResources: state.cardResources,
    firstPlayerSideKey: state.firstPlayerSideKey,
    phaseFirstActorByRound: state.phaseFirstActorByRound,
  });
}

function credentials(engine, envelope, sideKey) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `combat-pass-contract-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `combat-pass-contract-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function applyPass(engine, envelope, access, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: access.seatAuthority });
  const row = legal.finiteActions.find((entry) => (
    entry.action.actionType === "pass"
      && entry.action.executorId === OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID
  ));
  assert.ok(row, "Combat Pass v3 must be present in the exact LegalSpace");
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
    "official-existing-assault-hold-contract-closure-v1-report.json",
  ),
  "utf8",
));
const previousCatalogue = previousReport.slice.catalogue;
const previousRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousCatalogue,
});
const previousExtension = createOfficialAssaultHoldRelationshipExtensionV1({
  catalogueHash: previousCatalogue.catalogueHash,
  runtimeHash: previousRuntime.descriptor.runtimeHash,
});
const previousGraph = createRuleRelationshipGraphV1({
  catalogue: previousCatalogue,
  extension: previousExtension,
});
const previousCoverage = auditExecutableAtomStateContractCoverageV1(previousGraph);
const slice = createOfficialExistingCombatPassContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingCombatPassContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
const catalogue = slice.catalogue;
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
const extension = createOfficialCombatPassRelationshipExtensionV1({
  catalogueHash: catalogue.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_COMBAT_PASS_RELATIONSHIP_NODE_IDS_V1;

check("combat_pass_v3_reassigns_34_old_atoms_and_closes_27_to_strict", () => {
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.deepEqual(previousCoverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 95,
    partialContractAtoms: 103,
    noContractAtoms: 223,
    executors: 42,
    declaredStateContractExecutors: 13,
    missingStateContractExecutors: 29,
  });
  assert.deepEqual(coverage.counts, {
    executableAtoms: 421,
    strictCompleteAtoms: 122,
    partialContractAtoms: 80,
    noContractAtoms: 219,
    executors: 42,
    declaredStateContractExecutors: 14,
    missingStateContractExecutors: 28,
  });
  const transitions = new Map();
  for (const atomId of OFFICIAL_COMBAT_PASS_V3_ATOM_IDS) {
    const before = previousCoverage.atomCoverage.find((entry) => entry.atomId === atomId)
      ?.contractStatus;
    const after = coverage.atomCoverage.find((entry) => entry.atomId === atomId)
      ?.contractStatus;
    const key = `${before}->${after}`;
    transitions.set(key, (transitions.get(key) || 0) + 1);
  }
  assert.deepEqual(Object.fromEntries([...transitions].sort()), {
    "none->strict_complete": 4,
    "partial->partial": 7,
    "partial->strict_complete": 23,
  });
  assert.deepEqual(sliceAudit.counts, {
    executableRuleAtoms: 421,
    reviewRequiredRuleAtoms: 491,
    displayOnlyRuleAtoms: 114,
    changedAtoms: 34,
    changedNonTargetAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 34,
    declaredStateContractExecutors: 14,
    stateContractMissingExecutors: 28,
    strictCompleteAtoms: 122,
    partialContractAtoms: 80,
    noContractAtoms: 219,
  });
});

check("engagement_choice_action_and_apply_paths_reach_judge_contracts", () => {
  const impact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: ids.board,
    targetNodeIds: [
      ids.engagementGateTest,
      ids.exactActionTest,
      ids.handoffTest,
      ids.cleanupTest,
      ids.replayTest,
    ],
    relationships: [
      "projects_to",
      "derives",
      "gates",
      "includes",
      "writes",
      "verified_by",
    ],
    maxDepth: 9,
  });
  assert.ok(impact.paths.every((entry) => entry.reached));
  assert.equal(graphAudit.valid, true);
});

check("missing_combat_pass_invalidation_or_judge_edges_blocks_scope", () => {
  const broken = clone(extension);
  broken.edges = broken.edges.filter((entry) => (
    entry.provenance !== "combat_pass_state_invalidation_v1"
      && entry.provenance !== "combat_pass_judge_v1"
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

const directInitial = stateFixture();
const directCandidate = enumerateOfficialCombatPassV3Actions(directInitial, {
  sideKey: "player1",
})[0];
const directAction = executableAction(directCandidate);

check("public_apply_rejects_forged_version_lineage_and_extra_fields", () => {
  assert.equal(directCandidate.executorId, OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID);
  assert.equal(directCandidate.executorVersion, OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION);
  for (const forged of [
    { ...directAction, executorVersion: "999.0.0" },
    { ...directAction, ruleAtomIds: [] },
    { ...directAction, forgedField: "must-not-be-normalized-away" },
  ]) {
    assert.throws(
      () => applyOfficialCombatPassV3(directInitial, forged),
      /COMBAT_PASS_V3_ACTION_(?:INVALID|MISMATCH)/u,
    );
  }
});

check("fresh_combat_first_actor_choice_is_required_and_exact", () => {
  const missing = stateFixture({ phaseChoice: false });
  assert.equal(enumerateOfficialCombatPassV3Actions(missing, {
    sideKey: "player1",
  }).length, 0);
  assert.equal(enumerateOfficialCombatPassV3Actions(missing, {
    sideKey: "player1",
    includeDisabled: true,
  })[0].disabledReason, "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_REQUIRED");
  const malformed = stateFixture({ phaseChoiceMarkerHolder: "player2" });
  assert.equal(enumerateOfficialCombatPassV3Actions(malformed, {
    sideKey: "player1",
    includeDisabled: true,
  })[0].disabledReason, "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_INVALID");
});

check("remaining_live_unactivated_engaged_unit_blocks_pass", () => {
  const engaged = stateFixture({ engaged: true });
  assert.equal(enumerateOfficialCombatPassV3Actions(engaged, {
    sideKey: "player1",
  }).length, 0);
  assert.equal(enumerateOfficialCombatPassV3Actions(engaged, {
    sideKey: "player1",
    includeDisabled: true,
  })[0].disabledReason, "COMBAT_PASS_ENGAGED_UNIT_REMAINS");
  const completed = stateFixture({ engaged: true, player1Activated: true });
  assert.equal(enumerateOfficialCombatPassV3Actions(completed, {
    sideKey: "player1",
  }).length, 1);
});

let directFirst;
let directSecond;
check("direct_two_pass_lifecycle_preserves_protected_state_and_enters_cleanup", () => {
  const protectedBefore = protectedState(directInitial);
  directFirst = applyOfficialCombatPassV3(directInitial, directAction);
  assert.equal(directFirst.state.phase, "combat");
  assert.equal(directFirst.state.activeSideKey, "player2");
  assert.equal(directFirst.state.players.player1.passedPhases.combat, true);
  assert.deepEqual(protectedState(directFirst.state), protectedBefore);
  const secondAction = executableAction(enumerateOfficialCombatPassV3Actions(
    directFirst.state,
    { sideKey: "player2" },
  )[0]);
  assert.ok(secondAction.ruleAtomIds.length > directAction.ruleAtomIds.length);
  assert.throws(
    () => applyOfficialCombatPassV3(directFirst.state, directAction),
    /COMBAT_PASS_V3_ACTION_(?:INVALID|MISMATCH|STALE)/u,
  );
  directSecond = applyOfficialCombatPassV3(directFirst.state, secondAction);
  assert.equal(directSecond.state.phase, "cleanup");
  assert.equal(directSecond.state.activeSideKey, null);
  assert.equal(directSecond.state.players.player2.passedPhases.combat, true);
  assert.deepEqual(protectedState(directSecond.state), protectedBefore);
});

const refereeKeys = generateKeyPairSync("ed25519");
function authority(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-existing-combat-pass-contract-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

const engine = authority("ticket-11-existing-combat-pass-hmac-v1");
const blockedEnvelope = engine.createEnvelope({
  roomId: "official-existing-combat-pass-choice-gate-room",
  dataVersion: "71/69/48",
  state: stateFixture({ phaseChoice: false }),
});
const blockedPlayer1 = credentials(engine, blockedEnvelope, "player1");

check("authority_exposes_only_phase_choice_before_combat_pass", () => {
  const legal = engine.legalSpace(blockedEnvelope, {
    seatAuthority: blockedPlayer1.seatAuthority,
  });
  assert.equal(legal.finiteActions.some((entry) => (
    entry.action.executorId === OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID
  )), false);
  assert.ok(legal.finiteActions.every((entry) => (
    entry.action.actionType === "choose_first_actor"
  )));
});

const initialEnvelope = engine.createEnvelope({
  roomId: "official-existing-combat-pass-contract-room",
  dataVersion: "71/69/48",
  state: stateFixture(),
});
const player1 = credentials(engine, initialEnvelope, "player1");
const player2 = credentials(engine, initialEnvelope, "player2");
let authorityFirst;
let authoritySecond;
try {
  authorityFirst = applyPass(
    engine,
    initialEnvelope,
    player1,
    "existing-combat-pass-player1-v1",
  );
  authoritySecond = applyPass(
    engine,
    authorityFirst.applied.envelope,
    player2,
    "existing-combat-pass-player2-v1",
  );
} catch (error) {
  acceptance.push({
    id: "authority_legal_preview_apply_precondition",
    passed: false,
    error: String(error?.stack || error),
  });
}

check("authority_two_passes_bind_v3_lineage_graph_hash_and_cleanup", () => {
  assert.ok(authorityFirst);
  assert.ok(authoritySecond);
  assert.equal(
    authorityFirst.applied.receipt.action.executorId,
    OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
  );
  assert.equal(
    authoritySecond.applied.receipt.action.executorId,
    OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
  );
  assert.ok(authorityFirst.applied.receipt.events.some((entry) => (
    entry.type === "combat_pass"
      && entry.engagementGraphSchema === "starcraft_tmg_official_engagement_graph_v2"
      && /^[a-f0-9]{64}$/u.test(entry.engagementGraphHash)
  )));
  assert.ok(authoritySecond.applied.receipt.events.some((entry) => (
    entry.type === "phase_advanced" && entry.phase === "cleanup"
  )));
  assert.equal(authoritySecond.applied.envelope.state.phase, "cleanup");
});

check("v3_receipts_replay_after_hmac_rotation_and_tamper_fails", () => {
  assert.ok(authorityFirst);
  assert.ok(authoritySecond);
  const replayEngine = authority("ticket-11-existing-combat-pass-hmac-rotated-v1");
  registerReplayDependencies(replayEngine, initialEnvelope, runtime);
  const journal = [
    authorityFirst.applied.receipt,
    authoritySecond.applied.receipt,
  ];
  const replayed = replayEngine.replay({ initialEnvelope, journal });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, authoritySecond.applied.envelope.stateHash);
  const tampered = clone(journal[1]);
  tampered.events.push({ type: "forged_combat_pass" });
  assert.equal(replayEngine.replay({
    initialEnvelope,
    journal: [journal[0], tampered],
  }).reason, "SIGNATURE_INVALID");
});

const v2Source = await readFile(
  path.join(ROOT, "packages", "rule-atoms", "official-combat-pass-executor-v2.mjs"),
);
const previousRulesDisplayBinding = initialEnvelope.matchBinding.rulesDisplayBinding;

check("v2_source_runtime_and_historical_rules_display_remain_frozen", () => {
  assert.equal(previousRuntime.descriptor.runtimeHash, PREVIOUS_RUNTIME_HASH);
  assert.equal(
    previousCatalogue.executorManifest.some((entry) => (
      entry.executorId === OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID
        && entry.executorVersion === "2.0.0"
    )),
    true,
  );
  assert.equal(
    catalogue.executorManifest.some((entry) => (
      entry.executorId === OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID
    )),
    false,
  );
  assert.equal(contentHash(v2Source), PREVIOUS_EXECUTOR_SOURCE_HASH);
  assert.equal(previousRulesDisplayBinding.locale, "en");
  assert.ok(previousRulesDisplayBinding.artifactId);
  assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
  assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
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
  schema: "starcraft_tmg_existing_combat_pass_contract_closure_verification_v1",
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
  frozenHistoricalV2: {
    executorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
    executorVersion: "2.0.0",
    sourceHash: contentHash(v2Source),
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
  versionReassignedRuleAtomIds: [...OFFICIAL_COMBAT_PASS_V3_ATOM_IDS],
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length === 0
      ? "v3_receipts_replay_after_hmac_rotation_and_v2_runtime_remains_frozen"
      : "failed",
    promotions: [],
    blocks: ["28_existing_executors_still_require_state_contracts"],
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
    uiTraceEvidence: ["combat-pass-hidden-until-phase-first-actor-choice"],
    agentDecisionEvidence: [
      "exact-zero-remaining-engaged-unit-pass-denominator",
      "forged-version-lineage-and-extra-fields-fail-closed",
    ],
    memoryTraceEvidence: "no_memory_write_or_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing-state-invalidation-or-judge-edge-removes-contract",
      "public-apply-exactness-or-receipt-replay-failure-removes-contract",
    ],
    userVisibleChecks: ["first-pass-handoff-and-second-pass-cleanup"],
  },
  rulesTruth: "combat_pass_v3_exact_public_action_and_state_contract",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-existing-combat-pass-contract-closure-v1-report.json",
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
  catalogueHash: report.catalogueHash,
  runtimeHash: report.runtimeHash,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
