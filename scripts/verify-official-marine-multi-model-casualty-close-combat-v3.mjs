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
  applyOfficialMarineMultiModelCasualtyCloseCombatV3,
  enumerateOfficialMarineMultiModelCasualtyCloseCombatV3,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE,
  OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE,
} from
  "../packages/rule-atoms/official-marine-multi-model-casualty-close-combat-executor-v3.mjs";
import {
  createOfficialMarineMultiModelCasualtyRelationshipExtensionV3,
} from
  "../packages/rule-atoms/official-marine-multi-model-casualty-relationship-contract-v3.mjs";
import {
  createOfficialMarineMultiModelCasualtyRuleSliceV3,
  verifyOfficialMarineMultiModelCasualtyRuleSliceV3,
} from
  "../packages/rule-atoms/official-marine-multi-model-casualty-rule-slice-v3.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV2,
} from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-denominator-v2.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING,
} from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
} from
  "../packages/rule-atoms/official-marine-multi-model-stimpack-active-executor-v3.mjs";
import { createOfficialMultiModelCasualtyResolutionKernelV1 } from
  "../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialMarineMultiModelCasualtyFixtureV1 } from
  "./support/official-marine-multi-model-casualty-fixture-v1.mjs";

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
  }
  throw lastError;
}

const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-marine-multi-model-stimpack-close-combat-v2-report.json",
), "utf8"));
const slice = createOfficialMarineMultiModelCasualtyRuleSliceV3({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMarineMultiModelCasualtyRuleSliceV3({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual({
  slice: slice.sliceHash,
  catalogue: slice.catalogueHash,
  runtime: audit.runtimeHash,
  graph: audit.graphHash,
}, {
  slice: "a52b9b24bcdc8d2626949b2927238bf4ee9f3b9cff9a8d55494d1b6390012778",
  catalogue: "cebc6dfffb91c73557ae23c33eea3d0bf54a79017d583a2d98348c99e95b2fac",
  runtime: "e115118c04d60794ccc0372972e98b7c6c4e1fe0d9012676c0a1408ae2e02cb7",
  graph: "761ce316ce328224aa21d3f4f3d49eceb2a30b595a75409d97f50a6934c321e0",
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
  executors: 40,
  stateContracts: 7,
  stateContractDebt: 33,
});
acceptance.push("slice47_freezes_without_mutating_rule_atoms");

const fixture = await createOfficialMarineMultiModelCasualtyFixtureV1({
  attackerUpgradeNames: ["Bayonet"],
});
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71",
  cardsVersion: "69",
  rulesVersion: "48",
});
assert.equal(fixture.gameplayDataBundle.repositoryFallbackAllowed, false);
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const matchBinding = fixture.createMatchBinding(runtime.descriptor.runtimeHash);
const denominator = createOfficialMarineMultiModelCloseCombatDenominatorV2();
const plan = denominator.plan({
  state: fixture.state,
  sideKey: fixture.attackerSideKey,
  attackerPieceId: fixture.attackerPieceId,
  targetPieceId: fixture.targetPieceId,
  matchBinding,
});
assert.equal(plan.attackDice, 4);
assert.deepEqual(plan.fightingModelIds, [`${fixture.attackerPieceId}-m1`]);
assert.deepEqual(plan.supportingModelIds, [`${fixture.attackerPieceId}-m2`]);
assert.equal(plan.targetLedger.currentModels, 6);
acceptance.push("both_live_ledgers_and_bayonet_rank_pool_are_exact");

const ordinaryAttack = runtime.enumerate(fixture.state, {
  sideKey: fixture.attackerSideKey,
  matchBinding,
}).candidates.find((entry) => (
  entry.executorId === OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(ordinaryAttack);
const attackApplied = runtime.apply(fixture.state, action(ordinaryAttack), {
  matchBinding,
  chanceReveals: [6, 6, 6, 6, 1, 1, 1, 1],
});
assert.equal(attackApplied.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA);
assert.equal(attackApplied.state.activeSideKey, fixture.defenderSideKey);
assert.equal(attackApplied.state.pendingAction.casualtyDomain.casualtyCount, 2);
assert.equal(attackApplied.state.pendingAction.casualtyDomain.legalSelections.length, 20);
assert.equal(attackApplied.state.pendingAction.casualtyDomain.legalSelections.some((entry) => (
  entry.casualtyModelIds.includes(`${fixture.targetPieceId}-m1`)
)), false);
assert.equal(runtime.enumerate(attackApplied.state, {
  sideKey: fixture.attackerSideKey,
  matchBinding,
}).candidates.length, 0);
acceptance.push("defender_owns_exact_twenty_legal_ordered_casualty_choices");

const stalePending = structuredClone(attackApplied.state);
stalePending.pieces.find((entry) => entry.id === fixture.targetPieceId)
  .models[1].xInches += 0.1;
assert.throws(() => enumerateOfficialMarineMultiModelCasualtyCloseCombatV3(
  stalePending,
  {
    sideKey: fixture.defenderSideKey,
    matchBinding,
    throwOnError: true,
  },
), /PENDING_STATE_DRIFT/u);
acceptance.push("pending_domain_rejects_ledger_or_geometry_drift");

const casualtyCandidates = runtime.enumerate(attackApplied.state, {
  sideKey: fixture.defenderSideKey,
  matchBinding,
}).candidates;
assert.equal(casualtyCandidates.length, 20);
const casualtyApplied = runtime.apply(
  attackApplied.state,
  action(casualtyCandidates[0]),
  { matchBinding },
);
const targetAfter = casualtyApplied.state.pieces.find((entry) => (
  entry.id === fixture.targetPieceId
));
assert.equal(targetAfter.currentModels, 4);
assert.equal(targetAfter.currentSupply, 1);
assert.equal(targetAfter.destroyedModelIds.length, 2);
assert.equal(targetAfter.damageMarker, 0);
assert.notEqual(
  casualtyApplied.events[0].preEngagementGraphHash,
  casualtyApplied.events[0].postEngagementGraphHash,
);
acceptance.push("casualty_writeback_updates_ledger_supply_damage_and_engagement_graph");

const residualFixture = await createOfficialMarineMultiModelCasualtyFixtureV1({
  defenderDamageMarker: 1,
});
const residualBinding = residualFixture.createMatchBinding(runtime.descriptor.runtimeHash);
const residualCandidate = enumerateOfficialMarineMultiModelCasualtyCloseCombatV3(
  residualFixture.state,
  { sideKey: residualFixture.attackerSideKey, matchBinding: residualBinding },
)[0];
const residual = applyOfficialMarineMultiModelCasualtyCloseCombatV3(
  residualFixture.state,
  action(residualCandidate),
  { matchBinding: residualBinding, chanceReveals: [1, 1, 1, 1] },
);
assert.equal(residual.state.pendingAction, undefined);
assert.equal(residual.state.pieces.find((entry) => (
  entry.id === residualFixture.targetPieceId
)).damageMarker, 1);
acceptance.push("zero_incoming_damage_preserves_residual_marker");

const stimpackFixture = await createOfficialMarineMultiModelCasualtyFixtureV1({
  attackerUpgradeNames: ["Bayonet", "Stimpack"],
});
const resource = getOfficialCurrentProductRecord(
  stimpackFixture.dataset,
  "tactical_cards:terran_armed_forces",
);
stimpackFixture.state.phase = "movement";
stimpackFixture.state.phaseFirstActorByRound["2:movement"] = {
  round: 2,
  phase: "movement",
  markerHolderSideKey: stimpackFixture.attackerSideKey,
  chosenFirstActorSideKey: stimpackFixture.attackerSideKey,
};
stimpackFixture.state.cardResources[stimpackFixture.attackerSideKey] = [{
  id: `${stimpackFixture.attackerSideKey}-terran-armed-forces`,
  sideKey: stimpackFixture.attackerSideKey,
  officialCardRecordKey: "tactical_cards:terran_armed_forces",
  cardKind: "faction",
  sourceRecordHash: resource.sourceRecordHash,
  resource: 1,
  resourceType: "CP",
  readiness: "ready",
  face: "up",
  activeEffects: [],
}];
const stimpackBinding = stimpackFixture.createMatchBinding(runtime.descriptor.runtimeHash);
const activeCandidate = runtime.enumerate(stimpackFixture.state, {
  sideKey: stimpackFixture.attackerSideKey,
  matchBinding: stimpackBinding,
}).candidates.find((entry) => (
  entry.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID
    && entry.abilityWindow === "before_action"
));
assert.ok(activeCandidate);
const activated = runtime.apply(
  stimpackFixture.state,
  action(activeCandidate),
  { matchBinding: stimpackBinding },
).state;
activated.phase = "combat";
activated.activeSideKey = stimpackFixture.attackerSideKey;
activated.firstPlayerSideKey = stimpackFixture.attackerSideKey;
activated.phaseFirstActorByRound["2:combat"] = {
  round: 2,
  phase: "combat",
  markerHolderSideKey: stimpackFixture.attackerSideKey,
  chosenFirstActorSideKey: stimpackFixture.attackerSideKey,
};
activated.players.player1.passedPhases = {};
activated.players.player2.passedPhases = {};
activated.pieces.forEach((piece) => { piece.activatedPhases.combat = false; });
delete activated.pendingAction;
denominator.plan({
  state: activated,
  sideKey: stimpackFixture.attackerSideKey,
  attackerPieceId: stimpackFixture.attackerPieceId,
  targetPieceId: stimpackFixture.targetPieceId,
  matchBinding: stimpackBinding,
});
enumerateOfficialMarineMultiModelCasualtyCloseCombatV3(activated, {
  sideKey: stimpackFixture.attackerSideKey,
  matchBinding: stimpackBinding,
  throwOnError: true,
});
const stimpackEnumeration = runtime.enumerate(activated, {
  sideKey: stimpackFixture.attackerSideKey,
  matchBinding: stimpackBinding,
});
const stimpackAttack = stimpackEnumeration.candidates.find((entry) => (
  entry.executorId === OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(stimpackAttack, JSON.stringify(stimpackEnumeration));
const precisionOpened = runtime.apply(activated, action(stimpackAttack), {
  matchBinding: stimpackBinding,
  chanceReveals: [6, 6, 6, 6, 1, 1, 1, 1],
});
assert.equal(precisionOpened.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_SCHEMA);
const precisionChoice = runtime.enumerate(precisionOpened.state, {
  sideKey: stimpackFixture.attackerSideKey,
  matchBinding: stimpackBinding,
}).candidates.find((entry) => (
  entry.actionType
    === OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE
));
const casualtyOpened = runtime.apply(
  precisionOpened.state,
  action(precisionChoice),
  { matchBinding: stimpackBinding },
);
assert.equal(casualtyOpened.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA);
const defenderChoice = runtime.enumerate(casualtyOpened.state, {
  sideKey: stimpackFixture.defenderSideKey,
  matchBinding: stimpackBinding,
}).candidates[0];
const stimpackSettled = runtime.apply(
  casualtyOpened.state,
  action(defenderChoice),
  { matchBinding: stimpackBinding },
);
assert.equal(stimpackSettled.state.pendingAction, undefined);
acceptance.push("stimpack_precision_then_defender_casualty_three_stage_path_executes");

const player2Fixture = await createOfficialMarineMultiModelCasualtyFixtureV1({
  attackerSideKey: "player2",
  attackerUpgradeNames: ["Bayonet"],
});
const player2Binding = player2Fixture.createMatchBinding(runtime.descriptor.runtimeHash);
assert.ok(runtime.enumerate(player2Fixture.state, {
  sideKey: "player2",
  matchBinding: player2Binding,
}).candidates.some((entry) => (
  entry.executorId === OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
)));
acceptance.push("both_player_seats_receive_the_same_authority_path");

const relationshipExtension = createOfficialMarineMultiModelCasualtyRelationshipExtensionV3({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const relationshipGraph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: relationshipExtension,
});
const relationshipAudit = auditRuleRelationshipGraphV1(relationshipGraph);
assert.equal(relationshipAudit.counts.nodes, 5157);
assert.equal(relationshipAudit.counts.edges, 20090);
assert.equal(relationshipAudit.counts.blockingGaps, 0);
const brokenExtension = structuredClone(relationshipExtension);
brokenExtension.edges = brokenExtension.edges.filter((entry) => (
  entry.provenance !== "official_part12_engagement_preservation"
));
const brokenAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: brokenExtension,
}));
assert.equal(brokenAudit.valid, false);
assert.ok(brokenAudit.gaps.requiredEdgeGaps.length > 0);
assert.ok(brokenAudit.gaps.requiredPathGaps.length > 0);
acceptance.push("relationship_gate_blocks_missing_source_domain_or_test_path");

const refereeKeys = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-marine-multi-model-casualty-referee-v3",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

function authorityEnvelope(engine, state) {
  return engine.createEnvelope({
    roomId: "official-marine-multi-model-casualty-room",
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-s47", content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-marine-multi-model-s47", content: fixture.gameplayDataBundle },
      geometryArtifact: {
        artifactId: "official-marine-multi-model-geometry-s47",
        content: { kind: "geometry-artifact", geometryVersion: "multi_model_casualty_v1" },
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

const authorityState = structuredClone(fixture.state);
authorityState.pieces.find((entry) => entry.id === fixture.targetPieceId).damageMarker = 1;
let authority;
let initialEnvelope;
let authorityAttackApplied;
for (let attempt = 1; attempt <= 32; attempt += 1) {
  const candidateEngine = authorityEngine(`ticket-11-s47-seal-${attempt}`);
  const candidateEnvelope = authorityEnvelope(candidateEngine, authorityState);
  const attackCreds = credentials(candidateEngine, candidateEnvelope, fixture.attackerSideKey, 1);
  const attackPreview = previewFor(
    candidateEngine,
    candidateEnvelope,
    attackCreds,
    (entry) => entry.executorId
      === OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  );
  const applied = applyPreview(
    candidateEngine,
    candidateEnvelope,
    attackCreds,
    attackPreview,
    `s47-authority-attack-${attempt}`,
  );
  if (applied.envelope.state.pendingAction?.schema
    === OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA) {
    authority = candidateEngine;
    initialEnvelope = candidateEnvelope;
    authorityAttackApplied = applied;
    break;
  }
}
assert.ok(authorityAttackApplied, "authority chance search did not expose a casualty choice");
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v15" }));
const defenderCreds = credentials(
  authority,
  authorityAttackApplied.envelope,
  fixture.defenderSideKey,
  2,
);
const casualtyPreview = previewFor(
  authority,
  authorityAttackApplied.envelope,
  defenderCreds,
  (entry) => entry.actionType === OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE,
);
const authorityCasualtyApplied = applyPreview(
  authority,
  authorityAttackApplied.envelope,
  defenderCreds,
  casualtyPreview,
  "s47-authority-casualty",
);
const journal = [authorityAttackApplied.receipt, authorityCasualtyApplied.receipt];

function registerReplayDependencies(engine, envelope) {
  for (const [kind, content] of [
    ["sourceSnapshot", fixture.snapshot],
    ["dataSnapshot", fixture.gameplayDataBundle],
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
      geometryVersion: "multi_model_casualty_v1",
    }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v15" }],
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

const replayAuthority = authorityEngine("ticket-11-s47-rotated-seal");
registerReplayDependencies(replayAuthority, initialEnvelope);
const replayed = replayAuthority.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityCasualtyApplied.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal.at(-1).events.push({ type: "forged_multi_model_casualty" });
assert.equal(replayAuthority.replay({
  initialEnvelope,
  journal: tamperedJournal,
}).reason, "SIGNATURE_INVALID");
acceptance.push("authority_v15_ed25519_replay_survives_hmac_rotation_and_tamper_fails");

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
acceptance.push("no_skill_dsh_memory_muzero_or_training_promotion_in_slice47");

assert.equal(acceptance.length, 12);
const casualtyKernel = createOfficialMultiModelCasualtyResolutionKernelV1();
const report = {
  schema: "starcraft_tmg_official_marine_multi_model_casualty_verification_v3",
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
    actionSchemaVersion: "hybrid_legal_space_v15",
    journalReceipts: journal.length,
    replayStateHash: replayed.envelope.stateHash,
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
  rulesTruth: "official_current_multi_model_casualty_runtime_and_relationship_gate_frozen",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-marine-multi-model-casualty-v3-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  verifier: "official-marine-multi-model-casualty-close-combat-v3",
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
