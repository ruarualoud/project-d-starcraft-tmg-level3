#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialExistingRangedAttackV6ContractClosureRuleSliceV1,
  verifyOfficialExistingRangedAttackV6ContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-ranged-attack-v6-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRangedAttackV6RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-ranged-attack-v6-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build/source-intake/official-rules/command-center/firestore",
);
const EXPECTED = Object.freeze({
  sliceHash: "17733ad254b5c934673c137966a24e18ddaf7ac679a4754bffb8fb25a2c42c07",
  catalogueHash: "43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b",
  runtimeHash: "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41",
  graphHash: "306ec6a496ff0201f13a155e02872c0305b726853e59e92c7364421b30f7f363",
  sourceSnapshotHash: "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61",
  datasetHash: "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63",
  gameplayDataBundleHash:
    "d149c151be6d8680a6f4d07ae8c8b7b6f191f27d19c2d9ddf27beaf5e53024c3",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const SOURCE_HASHES = Object.freeze({
  "official-ranged-attack-executor-v1.mjs":
    "e4e78de4ea7a6d25004782b4b3bf578b66b709f5118e70a2619dbdb12fd98e8a",
  "official-ranged-attack-executor-v2.mjs":
    "eee1f96b22fac752efa5f38b775fea9b6dbae5f403335bd91ba3b444b8193a43",
  "official-ranged-attack-executor-v3.mjs":
    "bef6437f9e8e8c95689d8721fcb1b5e4d301814ccc989d4e39be897729dad023",
  "official-ranged-attack-executor-v4.mjs":
    "f0ed70aa1feb9be03c16846e68f0afa45566a282a0cb8c27bfcf0c368716be15",
  "official-ranged-attack-executor-v5.mjs":
    "0f8686afa25f896378fd24d4e6d6e654216f903a57aabfcffffee967fa1f4d16",
  "official-ranged-attack-executor-v6.mjs":
    "6f259c6eca381c5e75e94c802a1555c2aeaafe23c8edece9fd375f05bb90a07f",
  "official-ranged-attack-rule-slice-v1.mjs":
    "5481ab6f820f6edb32eec215d7203795d6879fcc22f01048e8fd0dd7a015f6bc",
  "official-ranged-attack-rule-slice-v2.mjs":
    "1a74ebd490750c5a8b023246a5c99e8ede9af52aaf2a4178ee443e6c87cd3f2b",
  "official-ranged-attack-rule-slice-v3.mjs":
    "34bb0e0561c04756d9326156c519db3b3cb3b58d6f22b8662fb823cdfa225a51",
  "official-ranged-attack-rule-slice-v4.mjs":
    "51aa02a774392d41ee6963d4d9a7863c6113d191da34bdb148e29ad1a4a90d4a",
  "official-ranged-attack-rule-slice-v5.mjs":
    "0ba0224e14272f633c11dbc4976cf53c654fab46418a0f58ce1e685f680532e9",
  "official-ranged-attack-rule-slice-v6.mjs":
    "2e54daae2ef334b0745b0a9791cece33ee73dea258cb799071b959ca0df87ac4",
  "official-movement-v5-medpack-v2-relationship-contract-v1.mjs":
    "c3e640a9d418aea21e58da93a6d3112ac42dc3c6912c8b8212ce330a909d75e4",
  "official-ranged-attack-v6-relationship-contract-v1.mjs":
    "a8218447cbedfacbfae6ed408e06d26e0d2e76017c327a2a2abf9fc18a54ea33",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const acceptance = [];
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-medic-medpack-v2-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingRangedAttackV6ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingRangedAttackV6ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash, EXPECTED.sliceHash);
assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
assert.equal(sliceAudit.counts.changedAtoms, 0);
assert.deepEqual(slice.catalogue, previousReport.slice.catalogue);
acceptance.push("slice_67_is_exact_and_does_not_mutate_any_existing_rule_atom");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(slice.catalogueHash, EXPECTED.catalogueHash);
assert.equal(runtime.descriptor.runtimeHash, EXPECTED.runtimeHash);
assert.equal(runtime.descriptor.executableRuleAtomCount, 421);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 605);
assert.equal(runtime.descriptor.productionRoomEligible, false);
acceptance.push("current_catalogue_and_runtime_are_byte_identical_to_slice_66");

const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: createOfficialRangedAttackV6RelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  }),
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(graph.graphHash, EXPECTED.graphHash);
assert.equal(graph.nodes.length, 7866);
assert.equal(graph.edges.length, 25020);
assert.equal(graph.coverageScopes.length, 30);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 288,
  partialContractAtoms: 79,
  noContractAtoms: 54,
  executors: 42,
  declaredStateContractExecutors: 31,
  missingStateContractExecutors: 11,
});
acceptance.push("ranged_v6_full_delegated_state_contract_and_coverage_are_frozen");

const sourceHashes = {};
for (const [fileName, expectedHash] of Object.entries(SOURCE_HASHES)) {
  const actualHash = sha256(await readFile(path.join(ROOT, "packages/rule-atoms", fileName)));
  assert.equal(actualHash, expectedHash, fileName);
  sourceHashes[fileName] = actualHash;
}
acceptance.push("ranged_attack_v1_through_v6_executor_and_rule_slice_bytes_are_frozen");

const liveReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
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
  unitRecordKeys: ["army_units:jim_raynor", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
assert.equal(liveReport.commandSnapshot.snapshotHash, EXPECTED.sourceSnapshotHash);
assert.deepEqual(liveReport.commandSnapshot.dataVersions, EXPECTED.dataVersions);
assert.equal(dataset.datasetHash, EXPECTED.datasetHash);
assert.equal(gameplayDataBundle.gameplayDataBundleHash, EXPECTED.gameplayDataBundleHash);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_official_71_69_48_raynor_and_marine_data_is_bound_without_fallback");

assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
assert.equal(slice.versionReassignedRuleAtomIds.length, 0);
assert.equal(slice.sliceForecast.newlyStrictAtomCount, 23);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.rulesEligible, false);
assert.equal(slice.productionRoomEligible, false);
assert.equal(slice.trainingTruth, false);
acceptance.push("rules_skill_dsh_muzero_and_training_authority_remain_separate");

const report = {
  schema: "starcraft_tmg_existing_ranged_attack_v6_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  slice,
  sliceAudit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph: {
    graphHash: graph.graphHash,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    scopes: graph.coverageScopes.length,
  },
  graphAudit,
  coverage,
  sourceHashes,
  liveOfficialRevalidation: {
    sourceSnapshotHash: liveReport.commandSnapshot.snapshotHash,
    datasetHash: dataset.datasetHash,
    gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
    dataVersions: dataset.dataVersions,
    repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "ranged_attack_v6_current_contract_and_frozen_v1_through_v6_history",
  trainingTruth: false,
};
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-ranged-attack-v6-contract-closure-v1-report.json",
), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: graph.graphHash,
  coverage: coverage.counts,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
