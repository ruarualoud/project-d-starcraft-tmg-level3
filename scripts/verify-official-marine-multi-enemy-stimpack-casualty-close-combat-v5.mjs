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
  enumerateOfficialMarineMultiEnemyStimpackCasualtyCloseCombatV5,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_PENDING_SCHEMA,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_PRECISION_PENDING_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_CASUALTIES_ACTION_TYPE,
  OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_PRECISION_ACTION_TYPE,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-stimpack-casualty-close-combat-executor-v5.mjs";
import {
  createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-stimpack-casualty-relationship-contract-v5.mjs";
import {
  createOfficialMarineMultiEnemyStimpackCasualtyRuleSliceV5,
  verifyOfficialMarineMultiEnemyStimpackCasualtyRuleSliceV5,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-stimpack-casualty-rule-slice-v5.mjs";
import {
  createOfficialMarineMultiEnemyStimpackCloseCombatDenominatorV4,
} from
  "../packages/rule-atoms/official-marine-multi-enemy-stimpack-close-combat-denominator-v4.mjs";
import { createOfficialMarineMultiEnemyCloseCombatDenominatorV3 } from
  "../packages/rule-atoms/official-marine-multi-enemy-close-combat-denominator-v3.mjs";
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
import { createOfficialMarineMultiEnemyStimpackCasualtyFixtureV3 } from
  "./support/official-marine-multi-enemy-stimpack-casualty-fixture-v3.mjs";

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
  "official-marine-multi-enemy-casualty-v4-report.json",
), "utf8"));
const slice = createOfficialMarineMultiEnemyStimpackCasualtyRuleSliceV5({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMarineMultiEnemyStimpackCasualtyRuleSliceV5({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual({
  slice: slice.sliceHash,
  catalogue: slice.catalogueHash,
  runtime: audit.runtimeHash,
  graph: audit.graphHash,
}, {
  slice: "03daff75c35c1686074cec94a070554385d3f2a27ad55aa9c696305ad0179b45",
  catalogue: "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  runtime: "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
  graph: "23168b8a038438cf68c34d0510c950e86519473049fe58ad18ddb245de06953d",
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
  executors: 42,
  stateContracts: 9,
  stateContractDebt: 33,
});
assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
acceptance.push("slice49_freezes_as_a_zero_atom_composition_slice");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineMultiEnemyStimpackCasualtyFixtureV3();
fixture.state.pieces.find((piece) => piece.id === fixture.targetPieceId).damageMarker = 1;
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

assert.throws(() => createOfficialMarineMultiEnemyCloseCombatDenominatorV3().plan({
  state: fixture.state,
  sideKey: fixture.attackerSideKey,
  attackerPieceId: fixture.attackerPieceId,
  targetPieceId: fixture.targetPieceId,
  matchBinding,
}), /MARINE_MULTI_ENEMY_V3_(?:COMBAT_SCOPE_UNSUPPORTED|STIMPACK_SCOPE_PENDING)/u);
const denominator = createOfficialMarineMultiEnemyStimpackCloseCombatDenominatorV4();
const plan = denominator.plan({
  state: fixture.state,
  sideKey: fixture.attackerSideKey,
  attackerPieceId: fixture.attackerPieceId,
  targetPieceId: fixture.targetPieceId,
  matchBinding,
});
assert.equal(plan.stimpacked, true);
assert.equal(plan.coEngagerPieceId, fixture.coEngagerPieceId);
assert.deepEqual(plan.coEngagerPairPlan.unitWideLoadout.selectedUpgradeNames, []);
assert.equal(plan.coEngagerPairPlan.stimpacked, false);
assert.equal(plan.weapon.weaponName, "Bayonet");
assert.equal(plan.attackDice, 4);
assert.equal(plan.precisionValue, 3);
assert.deepEqual(plan.targetEngagedEnemyUnitIds, fixture.targetEngagedEnemyUnitIds);
acceptance.push("v4_denominator_isolates_selected_stimpack_from_clean_coengager");

const attackCandidates = runtime.enumerate(fixture.state, {
  sideKey: fixture.attackerSideKey,
  matchBinding,
}).candidates.filter((candidate) => (
  candidate.executorId
    === OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
));
assert.equal(attackCandidates.length, 1);
const attack = attackCandidates[0];
assert.equal(attack.pieceId, fixture.attackerPieceId);
assert.equal(attack.coEngagerPieceId, fixture.coEngagerPieceId);
assert.equal(attack.details.attackDice, 4);
acceptance.push("runtime_exposes_only_the_stimpacked_selected_attacker_pool");

const precisionOpened = runtime.apply(
  fixture.state,
  action(attack),
  { matchBinding, chanceReveals: [6, 2, 2, 2, 1, 1, 1, 1] },
);
assert.equal(precisionOpened.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_PRECISION_PENDING_SCHEMA);
assert.equal(precisionOpened.state.activeSideKey, fixture.attackerSideKey);
const precisionLegal = runtime.enumerate(precisionOpened.state, {
  sideKey: fixture.attackerSideKey,
  matchBinding,
});
assert.equal(precisionLegal.stateSummary.pendingMarineMultiEnemyStimpackPrecisionHash,
  precisionOpened.state.pendingAction.pendingHash);
assert.equal(precisionLegal.stateSummary.pendingMarineMultiEnemyStimpackPrecisionCoEngagerPieceId,
  fixture.coEngagerPieceId);
assert.equal(precisionLegal.candidates.length, 8);
const declinePrecision = precisionLegal.candidates.find((choice) => (
  choice.convertedCount === 0
));
assert.ok(declinePrecision);
const casualtyOpened = runtime.apply(
  precisionOpened.state,
  action(declinePrecision),
  { matchBinding },
);
assert.equal(casualtyOpened.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_PENDING_SCHEMA);
assert.equal(casualtyOpened.state.activeSideKey, fixture.defenderSideKey);
const casualtyLegal = runtime.enumerate(casualtyOpened.state, {
  sideKey: fixture.defenderSideKey,
  matchBinding,
});
assert.equal(casualtyLegal.stateSummary.pendingMarineMultiEnemyStimpackCasualtyHash,
  casualtyOpened.state.pendingAction.pendingHash);
assert.equal(casualtyLegal.candidates.length, 2);
assert.deepEqual(casualtyLegal.candidates.map((entry) => entry.casualtyModelIds), [
  [`${fixture.targetPieceId}-m1`],
  [`${fixture.targetPieceId}-m3`],
]);
assert.equal(casualtyLegal.candidates.some((entry) => (
  entry.casualtyModelIds.includes(`${fixture.targetPieceId}-m2`)
)), false);
acceptance.push("fight_precision_then_defender_casualty_is_a_strict_three_stage_domain");

const settled = runtime.apply(
  casualtyOpened.state,
  action(casualtyLegal.candidates[0]),
  { matchBinding },
);
const targetAfter = settled.state.pieces.find((piece) => (
  piece.id === fixture.targetPieceId
));
assert.equal(targetAfter.currentModels, 2);
assert.equal(targetAfter.currentSupply, 0);
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
acceptance.push("settlement_preserves_both_engagements_and_activation_isolation");

const maximumPrecision = precisionLegal.candidates.find((choice) => (
  choice.convertedCount === 3
));
assert.ok(maximumPrecision);
const maximumConverted = runtime.apply(
  precisionOpened.state,
  action(maximumPrecision),
  { matchBinding },
);
assert.equal(maximumConverted.attackResolution.hit.precisionConvertedHits, 3);
assert.equal(maximumConverted.attackResolution.hit.hits, 4);
assert.equal(declinePrecision.convertedFailedDieIndices.length, 0);
acceptance.push("precision_domain_contains_zero_and_maximum_three_conversions");

for (const [label, mutate] of [
  ["geometry", (state) => {
    state.pieces.find((piece) => piece.id === fixture.coEngagerPieceId).models[0].xInches += 0.01;
  }],
  ["status", (state) => {
    state.pieces.find((piece) => piece.id === fixture.attackerPieceId).statuses = [];
  }],
  ["marker", (state) => { state.board.effectMarkers = []; }],
  ["history", (state) => { state.activeAbilityUseHistory = []; }],
]) {
  const stale = structuredClone(precisionOpened.state);
  mutate(stale);
  assert.throws(() => enumerateOfficialMarineMultiEnemyStimpackCasualtyCloseCombatV5(
    stale,
    { sideKey: fixture.attackerSideKey, matchBinding, throwOnError: true },
  ), /(?:PENDING_STATE_DRIFT|STATUS_STALE|STIMPACK)/u, label);
}
const staleCasualty = structuredClone(casualtyOpened.state);
staleCasualty.pieces.find((piece) => (
  piece.id === fixture.coEngagerPieceId
)).models[0].xInches += 0.01;
assert.throws(() => enumerateOfficialMarineMultiEnemyStimpackCasualtyCloseCombatV5(
  staleCasualty,
  { sideKey: fixture.defenderSideKey, matchBinding, throwOnError: true },
), /PENDING_STATE_DRIFT/u);
acceptance.push("geometry_status_marker_history_and_casualty_drift_fail_closed");

const strikeFixture = await createOfficialMarineMultiEnemyStimpackCasualtyFixtureV3({
  attackerUpgradeNames: ["Stimpack"],
});
strikeFixture.state.pieces.find((piece) => piece.id === strikeFixture.targetPieceId).damageMarker = 1;
const strikeBinding = strikeFixture.createMatchBinding(runtime.descriptor.runtimeHash);
const strikePlan = denominator.plan({
  state: strikeFixture.state,
  sideKey: strikeFixture.attackerSideKey,
  attackerPieceId: strikeFixture.attackerPieceId,
  targetPieceId: strikeFixture.targetPieceId,
  matchBinding: strikeBinding,
});
assert.equal(strikePlan.weapon.weaponName, "Strike");
assert.equal(strikePlan.attackDice, 2);
assert.ok(runtime.enumerate(strikeFixture.state, {
  sideKey: strikeFixture.attackerSideKey,
  matchBinding: strikeBinding,
}).candidates.some((candidate) => (
  candidate.executorId
    === OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
)));
acceptance.push("strike_and_bayonet_plus_stimpack_loadouts_are_both_executable");

const player2Fixture = await createOfficialMarineMultiEnemyStimpackCasualtyFixtureV3({
  attackerSideKey: "player2",
});
player2Fixture.state.pieces.find((piece) => piece.id === player2Fixture.targetPieceId).damageMarker = 1;
const player2Binding = player2Fixture.createMatchBinding(runtime.descriptor.runtimeHash);
assert.ok(runtime.enumerate(player2Fixture.state, {
  sideKey: "player2",
  matchBinding: player2Binding,
}).candidates.some((candidate) => (
  candidate.executorId
    === OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
    && candidate.pieceId === player2Fixture.attackerPieceId
)));
acceptance.push("both_player_seats_receive_the_same_three_stage_runtime_path");

const relationshipExtension =
  createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
const relationshipGraph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: relationshipExtension,
});
const relationshipAudit = auditRuleRelationshipGraphV1(relationshipGraph);
assert.equal(relationshipAudit.counts.nodes, 5195);
assert.equal(relationshipAudit.counts.edges, 20413);
assert.equal(relationshipAudit.counts.executors, 42);
assert.equal(relationshipAudit.counts.declaredStateContractExecutors, 9);
assert.equal(relationshipAudit.counts.blockingGaps, 0);
const brokenExtension = structuredClone(relationshipExtension);
brokenExtension.edges = brokenExtension.edges.filter((entry) => (
  entry.provenance !== "precision_damage_to_casualty_domain_v5"
    && entry.to !== "judge_test:marine-multi-enemy-stimpack-precision-casualty-three-stage"
));
const brokenAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: brokenExtension,
}));
assert.equal(brokenAudit.valid, false);
assert.ok(brokenAudit.gaps.requiredEdgeGaps.length > 0);
assert.ok(brokenAudit.gaps.requiredPathGaps.length > 0);
acceptance.push("relationship_gate_blocks_a_slice_missing_precision_to_casualty_edges");

const refereeKeys = generateKeyPairSync("ed25519");

function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-marine-multi-enemy-stimpack-referee-v5",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

function authorityEnvelope(engine, authorityFixture, label, state) {
  return engine.createEnvelope({
    roomId: `official-marine-multi-enemy-stimpack-${label}-room`,
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: {
        artifactId: `official-command-center-s49-${label}`,
        content: authorityFixture.snapshot,
      },
      dataSnapshot: {
        artifactId: `official-marine-multi-enemy-stimpack-s49-${label}`,
        content: authorityFixture.gameplayDataBundle,
      },
      geometryArtifact: {
        artifactId: `official-marine-multi-enemy-stimpack-geometry-s49-${label}`,
        content: {
          kind: "geometry-artifact",
          geometryVersion: "multi_enemy_stimpack_casualty_v3",
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
      geometryVersion: "multi_enemy_stimpack_casualty_v3",
    }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v17" }],
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
  let precisionApplied;
  for (let attempt = 1; attempt <= 32; attempt += 1) {
    const candidateEngine = authorityEngine(`ticket-11-s49-${label}-seal-${attempt}`);
    const candidateEnvelope = authorityEnvelope(
      candidateEngine,
      authorityFixture,
      label,
      authorityState,
    );
    const attackCreds = credentials(
      candidateEngine,
      candidateEnvelope,
      authorityFixture.attackerSideKey,
      attempt * 10 + 1,
    );
    const attackPreview = previewFor(
      candidateEngine,
      candidateEnvelope,
      attackCreds,
      (entry) => entry.executorId
        === OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
        && entry.pieceId === authorityFixture.attackerPieceId,
    );
    const candidateAttack = applyPreview(
      candidateEngine,
      candidateEnvelope,
      attackCreds,
      attackPreview,
      `s49-${label}-authority-attack-${attempt}`,
    );
    assert.equal(candidateAttack.envelope.state.pendingAction?.schema,
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_PRECISION_PENDING_SCHEMA);
    const precisionCreds = credentials(
      candidateEngine,
      candidateAttack.envelope,
      authorityFixture.attackerSideKey,
      attempt * 10 + 2,
    );
    const maximumConvertedCount = Math.min(
      3,
      candidateAttack.envelope.state.pendingAction.hitReveal.failedHitDieIndices.length,
    );
    const precisionPreview = previewFor(
      candidateEngine,
      candidateAttack.envelope,
      precisionCreds,
      (entry) => entry.actionType
        === OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_PRECISION_ACTION_TYPE
        && entry.convertedCount === maximumConvertedCount,
    );
    const candidatePrecision = applyPreview(
      candidateEngine,
      candidateAttack.envelope,
      precisionCreds,
      precisionPreview,
      `s49-${label}-authority-precision-${attempt}`,
    );
    const preservingSelection = candidatePrecision.envelope.state.pendingAction
      ?.casualtyDomain?.legalSelections?.find((entry) => (
        JSON.stringify(entry.remainingEngagedEnemyUnitIds)
          === JSON.stringify(authorityFixture.targetEngagedEnemyUnitIds)
      ));
    if (candidatePrecision.envelope.state.pendingAction?.schema
      === OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_PENDING_SCHEMA
      && preservingSelection) {
      authority = candidateEngine;
      initialEnvelope = candidateEnvelope;
      attackApplied = candidateAttack;
      precisionApplied = candidatePrecision;
      break;
    }
  }
  assert.ok(precisionApplied,
    `${label} authority chance search did not expose a defender casualty choice`);
  assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
    hashStarcraftTmgContract({
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v17",
    }));
  const defenderCreds = credentials(
    authority,
    precisionApplied.envelope,
    authorityFixture.defenderSideKey,
    999,
  );
  const preservingSelection = precisionApplied.envelope.state.pendingAction
    .casualtyDomain.legalSelections.find((entry) => (
      JSON.stringify(entry.remainingEngagedEnemyUnitIds)
        === JSON.stringify(authorityFixture.targetEngagedEnemyUnitIds)
    ));
  assert.ok(preservingSelection);
  const casualtyPreview = previewFor(
    authority,
    precisionApplied.envelope,
    defenderCreds,
    (entry) => entry.actionType
      === OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_CASUALTIES_ACTION_TYPE
      && entry.casualtySelectionHash === preservingSelection.selectionHash,
  );
  const casualtyApplied = applyPreview(
    authority,
    precisionApplied.envelope,
    defenderCreds,
    casualtyPreview,
    `s49-${label}-authority-casualty`,
  );
  const journal = [
    attackApplied.receipt,
    precisionApplied.receipt,
    casualtyApplied.receipt,
  ];
  const replayAuthority = authorityEngine(`ticket-11-s49-${label}-rotated-seal`);
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
tamperedJournal.at(-1).events.push({ type: "forged_multi_enemy_stimpack_casualty" });
assert.equal(player1Authority.replayAuthority.replay({
  initialEnvelope: player1Authority.initialEnvelope,
  journal: tamperedJournal,
}).reason, "SIGNATURE_INVALID");
acceptance.push("authority_v17_both_seats_three_ed25519_receipts_replay_after_hmac_rotation");

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
acceptance.push("no_skill_dsh_memory_muzero_or_training_promotion_in_slice49");

assert.equal(acceptance.length, 13);
const casualtyKernel = createOfficialMultiModelCasualtyResolutionKernelV1();
const report = {
  schema:
    "starcraft_tmg_official_marine_multi_enemy_stimpack_casualty_verification_v5",
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
    actionSchemaVersion: "hybrid_legal_space_v17",
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
  rulesTruth:
    "official_current_multi_enemy_stimpack_precision_casualty_runtime_and_relationship_gate_frozen",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR,
    "official-marine-multi-enemy-stimpack-casualty-v5-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  verifier: "official-marine-multi-enemy-stimpack-casualty-close-combat-v5",
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
