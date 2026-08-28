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
  enumerateOfficialMarineMultiEnemyCasualtyCloseCombatV4,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_PENDING_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_CASUALTIES_ACTION_TYPE,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-casualty-close-combat-executor-v4.mjs";
import {
  createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-casualty-relationship-contract-v4.mjs";
import {
  createOfficialMarineMultiEnemyCasualtyRuleSliceV4,
  verifyOfficialMarineMultiEnemyCasualtyRuleSliceV4,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-casualty-rule-slice-v4.mjs";
import { createOfficialMarineMultiEnemyCloseCombatDenominatorV3 } from
  "../packages/rule-atoms/official-marine-multi-enemy-close-combat-denominator-v3.mjs";
import { createOfficialMarineMultiModelCloseCombatDenominatorV2 } from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-denominator-v2.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING,
} from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-denominator-v1.mjs";
import { createOfficialMultiModelCasualtyResolutionKernelV1 } from
  "../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialMarineMultiEnemyCasualtyFixtureV2 } from
  "./support/official-marine-multi-enemy-casualty-fixture-v2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  part8:
    `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part8DocumentId}`,
  part12:
    `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part12DocumentId}`,
});
const acceptance = [];

function action(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...result
  } = candidate;
  return result;
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

function targetEnemyUnitIds(graph, targetPieceId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === targetPieceId) return [edge.rightUnitId];
    if (edge.rightUnitId === targetPieceId) return [edge.leftUnitId];
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-marine-multi-model-casualty-v3-report.json",
), "utf8"));
const slice = createOfficialMarineMultiEnemyCasualtyRuleSliceV4({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMarineMultiEnemyCasualtyRuleSliceV4({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual({
  slice: slice.sliceHash,
  catalogue: slice.catalogueHash,
  runtime: audit.runtimeHash,
  graph: audit.graphHash,
}, {
  slice: "69452cbf2adbf5c067f6996c09f748ac739bd0c606a0226c01b1184e13ed4211",
  catalogue: "98312255b197471e93b8b9b0a141b694743bcbef880830b7bdb4bf60736a0cf3",
  runtime: "dfa25995e03e98ddd5b1fab855dcc9744312b2599ca3452e4364ab2db34d79d6",
  graph: "575e804e7172e1bad1bab42b3058484b46e22952486c4409ef9acb1219691f6b",
});
assert.deepEqual({
  executable: audit.counts.executableRuleAtoms,
  review: audit.counts.reviewRequiredRuleAtoms,
  display: audit.counts.displayOnlyRuleAtoms,
  executors: audit.counts.executors,
  stateContracts: audit.counts.declaredStateContractExecutors,
  stateContractDebt: audit.counts.stateContractMissingExecutors,
}, {
  executable: 421,
  review: 491,
  display: 114,
  executors: 41,
  stateContracts: 8,
  stateContractDebt: 33,
});
assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
acceptance.push("slice48_freezes_as_a_zero_atom_composition_slice");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineMultiEnemyCasualtyFixtureV2();
const matchBinding = fixture.createMatchBinding(runtime.descriptor.runtimeHash);
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71",
  cardsVersion: "69",
  rulesVersion: "48",
});
assert.equal(fixture.gameplayDataBundle.repositoryFallbackAllowed, false);
assert.deepEqual(fixture.targetEngagedEnemyUnitIds, [
  fixture.attackerPieceId,
  fixture.coEngagerPieceId,
].sort((left, right) => left.localeCompare(right)));

assert.throws(() => createOfficialMarineMultiModelCloseCombatDenominatorV2().plan({
  state: fixture.state,
  sideKey: fixture.attackerSideKey,
  attackerPieceId: fixture.attackerPieceId,
  targetPieceId: fixture.targetPieceId,
  matchBinding,
}), /MARINE_MULTI_MODEL_V2_COMBAT_SCOPE_UNSUPPORTED/u);
const denominator = createOfficialMarineMultiEnemyCloseCombatDenominatorV3();
const plan = denominator.plan({
  state: fixture.state,
  sideKey: fixture.attackerSideKey,
  attackerPieceId: fixture.attackerPieceId,
  targetPieceId: fixture.targetPieceId,
  matchBinding,
});
assert.equal(plan.coEngagerPieceId, fixture.coEngagerPieceId);
assert.deepEqual(plan.targetEngagedEnemyUnitIds, fixture.targetEngagedEnemyUnitIds);
assert.deepEqual(plan.fightingModelIds, [
  `${fixture.attackerPieceId}-m1`,
  `${fixture.attackerPieceId}-m2`,
]);
assert.equal(plan.attackDice, 2);
assert.equal(plan.trainingTruth, false);
acceptance.push("three_unit_denominator_binds_both_enemy_units_and_selected_ranks");

const attackCandidates = runtime.enumerate(fixture.state, {
  sideKey: fixture.attackerSideKey,
  matchBinding,
}).candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
));
assert.equal(attackCandidates.length, 2);
const attack = attackCandidates.find((candidate) => (
  candidate.pieceId === fixture.attackerPieceId
));
assert.ok(attack);
assert.equal(attack.coEngagerPieceId, fixture.coEngagerPieceId);
assert.equal(attack.details.attackDice, 2);
acceptance.push("runtime_exposes_each_eligible_attacker_without_pool_cross_contamination");

const attacked = runtime.apply(
  fixture.state,
  action(attack),
  { matchBinding, chanceReveals: [6, 6, 1, 1] },
);
assert.equal(attacked.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_PENDING_SCHEMA);
assert.equal(attacked.state.activeSideKey, fixture.defenderSideKey);
assert.equal(attacked.state.pendingAction.casualtyDomain.casualtyCount, 1);
assert.deepEqual(attacked.state.pendingAction.casualtyDomain.legalSelections.map((entry) => (
  entry.casualtyModelIds
)), [
  [`${fixture.targetPieceId}-m1`],
  [`${fixture.targetPieceId}-m3`],
]);
assert.equal(attacked.state.pendingAction.casualtyDomain.legalSelections.some((entry) => (
  entry.casualtyModelIds.includes(`${fixture.targetPieceId}-m2`)
)), false);
assert.equal(runtime.enumerate(attacked.state, {
  sideKey: fixture.attackerSideKey,
  matchBinding,
}).candidates.length, 0);
acceptance.push("defender_choice_preserves_each_specific_enemy_unit_engagement");

const stalePending = structuredClone(attacked.state);
stalePending.pieces.find((entry) => (
  entry.id === fixture.coEngagerPieceId
)).models[0].xInches += 0.01;
assert.throws(() => enumerateOfficialMarineMultiEnemyCasualtyCloseCombatV4(
  stalePending,
  {
    sideKey: fixture.defenderSideKey,
    matchBinding,
    throwOnError: true,
  },
), /MARINE_MULTI_ENEMY_CASUALTY_PENDING_STATE_DRIFT/u);
acceptance.push("coengager_geometry_drift_invalidates_the_open_choice");

const casualty = runtime.enumerate(attacked.state, {
  sideKey: fixture.defenderSideKey,
  matchBinding,
}).candidates[0];
const settled = runtime.apply(attacked.state, action(casualty), { matchBinding });
const targetAfter = settled.state.pieces.find((piece) => (
  piece.id === fixture.targetPieceId
));
assert.equal(targetAfter.currentModels, 2);
assert.equal(targetAfter.currentSupply, 0);
assert.equal(targetAfter.destroyedModelIds.length, 4);
assert.equal(targetAfter.damageMarker, 0);
assert.deepEqual(settled.casualtyResolution.remainingEngagedEnemyUnitIds,
  fixture.targetEngagedEnemyUnitIds);
assert.deepEqual(targetEnemyUnitIds(settled.engagementGraph, fixture.targetPieceId),
  fixture.targetEngagedEnemyUnitIds);
assert.equal(settled.state.pieces.find((piece) => (
  piece.id === fixture.attackerPieceId
)).activatedPhases.combat, true);
assert.equal(settled.state.pieces.find((piece) => (
  piece.id === fixture.coEngagerPieceId
)).activatedPhases.combat, false);
acceptance.push("settlement_updates_ledger_and_rederives_the_three_unit_graph");

const bayonetFixture = await createOfficialMarineMultiEnemyCasualtyFixtureV2({
  attackerUpgradeNames: ["Bayonet"],
});
const bayonetBinding = bayonetFixture.createMatchBinding(runtime.descriptor.runtimeHash);
const bayonetPlan = denominator.plan({
  state: bayonetFixture.state,
  sideKey: bayonetFixture.attackerSideKey,
  attackerPieceId: bayonetFixture.attackerPieceId,
  targetPieceId: bayonetFixture.targetPieceId,
  matchBinding: bayonetBinding,
});
assert.equal(bayonetPlan.weapon.weaponName, "Bayonet");
assert.equal(bayonetPlan.attackDice, 4);
acceptance.push("bayonet_rate_of_attack_scales_only_the_selected_fighting_models");

const stimpackFixture = await createOfficialMarineMultiEnemyCasualtyFixtureV2({
  attackerUpgradeNames: ["Stimpack"],
});
const stimpackBinding = stimpackFixture.createMatchBinding(runtime.descriptor.runtimeHash);
assert.throws(() => denominator.plan({
  state: stimpackFixture.state,
  sideKey: stimpackFixture.attackerSideKey,
  attackerPieceId: stimpackFixture.attackerPieceId,
  targetPieceId: stimpackFixture.targetPieceId,
  matchBinding: stimpackBinding,
}), /STIMPACK/u);
assert.equal(runtime.enumerate(stimpackFixture.state, {
  sideKey: stimpackFixture.attackerSideKey,
  matchBinding: stimpackBinding,
}).candidates.some((candidate) => (
  candidate.executorId === OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
)), false);
acceptance.push("multi_enemy_stimpack_scope_fails_closed_instead_of_silent_compatibility");

const player2Fixture = await createOfficialMarineMultiEnemyCasualtyFixtureV2({
  attackerSideKey: "player2",
});
const player2Binding = player2Fixture.createMatchBinding(runtime.descriptor.runtimeHash);
assert.ok(runtime.enumerate(player2Fixture.state, {
  sideKey: "player2",
  matchBinding: player2Binding,
}).candidates.some((candidate) => (
  candidate.executorId === OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
    && candidate.pieceId === player2Fixture.attackerPieceId
)));
acceptance.push("both_player_seats_receive_the_same_runtime_path");

const relationshipExtension = createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const relationshipGraph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: relationshipExtension,
});
const relationshipAudit = auditRuleRelationshipGraphV1(relationshipGraph);
assert.equal(relationshipAudit.counts.nodes, 5172);
assert.equal(relationshipAudit.counts.edges, 20239);
assert.equal(relationshipAudit.counts.blockingGaps, 0);
const brokenExtension = structuredClone(relationshipExtension);
brokenExtension.edges = brokenExtension.edges.filter((entry) => (
  entry.provenance !== "official_specific_enemy_engagement_preservation_v4"
    && entry.to !== "judge_test:marine-multi-enemy-specific-engagement-preservation-runtime"
));
const brokenAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: brokenExtension,
}));
assert.equal(brokenAudit.valid, false);
assert.ok(brokenAudit.gaps.requiredEdgeGaps.length > 0);
assert.ok(brokenAudit.gaps.requiredPathGaps.length > 0);
acceptance.push("relationship_gate_blocks_a_slice_missing_its_source_to_test_path");

const refereeKeys = generateKeyPairSync("ed25519");

function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-marine-multi-enemy-casualty-referee-v4",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

function authorityEnvelope(engine, authorityFixture, label, state) {
  return engine.createEnvelope({
    roomId: `official-marine-multi-enemy-casualty-${label}-room`,
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: {
        artifactId: `official-command-center-s48-${label}`,
        content: authorityFixture.snapshot,
      },
      dataSnapshot: {
        artifactId: `official-marine-multi-enemy-s48-${label}`,
        content: authorityFixture.gameplayDataBundle,
      },
      geometryArtifact: {
        artifactId: `official-marine-multi-enemy-geometry-s48-${label}`,
        content: {
          kind: "geometry-artifact",
          geometryVersion: "multi_enemy_casualty_v2",
        },
      },
    },
    state,
  });
}

function credentials(engine, envelope, seatKey, fence) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `${envelope.roomId}-${seatKey}-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority,
    sessionId: `${envelope.roomId}-${seatKey}-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, lease };
}

function previewFor(engine, envelope, creds, predicate) {
  const legal = engine.legalSpace(envelope, { seatAuthority: creds.seatAuthority });
  const finite = legal.finiteActions.find((entry) => predicate(entry.action));
  assert.ok(finite, JSON.stringify(legal));
  const preview = engine.preview({
    envelope,
    seatAuthority: creds.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  return preview.preview;
}

function applyPreview(engine, envelope, creds, preview, idempotencyKey) {
  const confirmation = engine.confirmPreview({
    envelope,
    preview,
    seatAuthority: creds.seatAuthority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview,
    confirmation: confirmation.confirmation,
    seatAuthority: creds.seatAuthority,
    controlLease: creds.lease,
    idempotencyKey,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

function registerReplayDependencies(engine, envelope, authorityFixture) {
  for (const [kind, content] of [
    ["sourceSnapshot", authorityFixture.snapshot],
    ["dataSnapshot", authorityFixture.gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: envelope.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", {
      kind: "geometry-artifact",
      geometryVersion: "multi_enemy_casualty_v2",
    }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v16" }],
  ]) {
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

async function runAuthorityFlow(authorityFixture, label) {
  const authorityState = structuredClone(authorityFixture.state);
  authorityState.pieces.find((entry) => (
    entry.id === authorityFixture.targetPieceId
  )).damageMarker = 1;
  let authority;
  let initialEnvelope;
  let attackApplied;
  for (let attempt = 1; attempt <= 32; attempt += 1) {
    const candidateEngine = authorityEngine(`ticket-11-s48-${label}-seal-${attempt}`);
    const candidateEnvelope = authorityEnvelope(
      candidateEngine,
      authorityFixture,
      label,
      authorityState,
    );
    const attackerCreds = credentials(
      candidateEngine,
      candidateEnvelope,
      authorityFixture.attackerSideKey,
      1,
    );
    const attackPreview = previewFor(
      candidateEngine,
      candidateEnvelope,
      attackerCreds,
      (entry) => entry.executorId
        === OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
        && entry.pieceId === authorityFixture.attackerPieceId,
    );
    const applied = applyPreview(
      candidateEngine,
      candidateEnvelope,
      attackerCreds,
      attackPreview,
      `s48-${label}-authority-attack-${attempt}`,
    );
    if (applied.envelope.state.pendingAction?.schema
      === OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_PENDING_SCHEMA) {
      authority = candidateEngine;
      initialEnvelope = candidateEnvelope;
      attackApplied = applied;
      break;
    }
  }
  assert.ok(attackApplied, `${label} authority chance search did not expose a casualty choice`);
  assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
    hashStarcraftTmgContract({
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v16",
    }));
  const defenderCreds = credentials(
    authority,
    attackApplied.envelope,
    authorityFixture.defenderSideKey,
    2,
  );
  const casualtyPreview = previewFor(
    authority,
    attackApplied.envelope,
    defenderCreds,
    (entry) => entry.actionType === OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_CASUALTIES_ACTION_TYPE,
  );
  const casualtyApplied = applyPreview(
    authority,
    attackApplied.envelope,
    defenderCreds,
    casualtyPreview,
    `s48-${label}-authority-casualty`,
  );
  const journal = [attackApplied.receipt, casualtyApplied.receipt];
  const replayAuthority = authorityEngine(`ticket-11-s48-${label}-rotated-seal`);
  registerReplayDependencies(replayAuthority, initialEnvelope, authorityFixture);
  const replayed = replayAuthority.replay({ initialEnvelope, journal });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.envelope.stateHash, casualtyApplied.envelope.stateHash);
  assert.deepEqual(
    casualtyApplied.receipt.events[0].remainingEngagedEnemyUnitIds,
    authorityFixture.targetEngagedEnemyUnitIds,
  );
  assert.equal(casualtyApplied.envelope.state.pieces.find((piece) => (
    piece.id === authorityFixture.attackerPieceId
  )).activatedPhases.combat, true);
  assert.equal(casualtyApplied.envelope.state.pieces.find((piece) => (
    piece.id === authorityFixture.coEngagerPieceId
  )).activatedPhases.combat, false);
  return {
    initialEnvelope,
    finalEnvelope: casualtyApplied.envelope,
    journal,
    replayAuthority,
    replayed,
  };
}

const player1Authority = await runAuthorityFlow(fixture, "player1");
const player2Authority = await runAuthorityFlow(player2Fixture, "player2");
const tamperedJournal = structuredClone(player1Authority.journal);
tamperedJournal.at(-1).events.push({ type: "forged_multi_enemy_casualty" });
assert.equal(player1Authority.replayAuthority.replay({
  initialEnvelope: player1Authority.initialEnvelope,
  journal: tamperedJournal,
}).reason, "SIGNATURE_INVALID");
acceptance.push("authority_v16_two_seat_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const liveDocuments = Object.fromEntries(await Promise.all(Object.entries(URLS).map(
  async ([kind, url]) => [kind, await fetchOfficial(url, kind)],
)));
const versions = liveDocuments.versions.fields;
assert.deepEqual({
  unitsVersion: versions.unitsVersion.integerValue,
  cardsVersion: versions.cardsVersion.integerValue,
  rulesVersion: versions.rulesVersion.integerValue,
}, OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.dataVersions);
assert.equal(documentHash(liveDocuments.marine),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.marineDocumentHash);
assert.equal(documentHash(liveDocuments.part8),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part8DocumentHash);
assert.equal(documentHash(liveDocuments.part12),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part12DocumentHash);
acceptance.push("live_official_units71_cards69_rules48_binding_matches");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_memory_muzero_or_training_promotion_in_slice48");

assert.equal(acceptance.length, 13);
const casualtyKernel = createOfficialMultiModelCasualtyResolutionKernelV1();
const report = {
  schema: "starcraft_tmg_official_marine_multi_enemy_casualty_verification_v4",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    urls: URLS,
    hashes: Object.fromEntries(Object.entries(liveDocuments).map(([key, document]) => (
      [key, documentHash(document)]
    ))),
    repositoryFallbackUsed: false,
  },
  slice,
  audit,
  runtime: runtime.descriptor,
  denominator: denominator.descriptor,
  casualtyKernel: casualtyKernel.descriptor,
  relationshipGraph: {
    graphHash: relationshipGraph.graphHash,
    nodeCount: relationshipGraph.nodes.length,
    edgeCount: relationshipGraph.edges.length,
    audit: relationshipAudit,
    negativeGapGate: {
      valid: brokenAudit.valid,
      requiredEdgeGaps: brokenAudit.gaps.requiredEdgeGaps.length,
      requiredPathGaps: brokenAudit.gaps.requiredPathGaps.length,
    },
  },
  authorityFixture: {
    actionSchemaVersion: "hybrid_legal_space_v16",
    player1JournalReceipts: player1Authority.journal.length,
    player2JournalReceipts: player2Authority.journal.length,
    player1ReplayStateHash: player1Authority.replayed.envelope.stateHash,
    player2ReplayStateHash: player2Authority.replayed.envelope.stateHash,
    bothSeatsChecked: true,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: previousReport.runtime.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  skillGeneration: false,
  dshUsed: false,
  muzeroTrainingTruth: false,
  rulesTruth: "official_current_multi_enemy_casualty_runtime_and_relationship_gate_frozen",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-marine-multi-enemy-casualty-v4-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  verifier: "official-marine-multi-enemy-casualty-close-combat-v4",
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: audit.runtimeHash,
  graphHash: relationshipGraph.graphHash,
  graphNodes: relationshipGraph.nodes.length,
  graphEdges: relationshipGraph.edges.length,
  executableRuleAtoms: audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: audit.counts.displayOnlyRuleAtoms,
  executors: audit.counts.executors,
  stateContracts: audit.counts.declaredStateContractExecutors,
  stateContractDebt: audit.counts.stateContractMissingExecutors,
  actionSchemaVersion: report.authorityFixture.actionSchemaVersion,
  officialVersions: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.dataVersions,
  failures: [],
}, null, 2));
