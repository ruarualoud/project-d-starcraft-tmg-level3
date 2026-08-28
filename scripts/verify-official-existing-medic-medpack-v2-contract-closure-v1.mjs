import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1,
  OFFICIAL_MEDIC_MEDPACK_V2_MIGRATED_ATOM_IDS,
  OFFICIAL_MOVEMENT_V5_MIGRATED_ATOM_IDS,
  OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS,
  OFFICIAL_STIMPACK_MOVE_V3_MIGRATED_ATOM_IDS,
  verifyOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-medic-medpack-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementV5MedpackV2RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-movement-v5-medpack-v2-relationship-contract-v1.mjs";
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
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build/source-intake/official-rules/command-center/firestore",
);
const EXPECTED = Object.freeze({
  sliceHash: "7d0fcef7965258264378de98b0bb1820be94638700b55975fa69ed8a440e210b",
  catalogueHash: "43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b",
  runtimeHash: "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41",
  graphHash: "488194f777c1b6c00b601b02d07a7aa28c11537bd4535266e465ee687562d23f",
  sourceSnapshotHash: "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61",
  datasetHash: "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63",
  gameplayDataBundleHash: "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const SOURCE_HASHES = Object.freeze({
  "official-start-of-round-executor-v4.mjs":
    "c6740381da68a6ab641cc9c91c320f1f0da6579e1c0fde897a2471f071239d9d",
  "official-reserve-deploy-executor-v4.mjs":
    "ddb810797b93748b9c01ae4fec11a9ff03acf4ed62a037bd4260603d96e6381a",
  "official-standard-move-executor-v4.mjs":
    "ee183fe4311e4eb9972b360ba526afc8042aa623f03482727add5b2bfb8eb3b8",
  "official-disengage-executor-v4.mjs":
    "baa16b33c8e71ae6342b323ce953f43d9b934ebd5737994ca4bbe6a67026c81d",
  "official-stimpack-move-consumer-executor-v2.mjs":
    "d8007bf3b955d59aa406481c55e88d2feb3495628bddf5cd5b9cc21c21596198",
  "official-medic-medpack-active-executor-v1.mjs":
    "6d861c63e1b9403dda31384c6a722ae66de4fc92654b96e827376003e3dd5a31",
  "official-start-of-round-executor-v5.mjs":
    "46e9de11c86b3c37bd709bc761ea3c1cb6f94c68c82d36cdec51bad61a03386e",
  "official-reserve-deploy-executor-v5.mjs":
    "65e683a86d04c111421d3b2ce71b992545a3a31c3d3965d20fb99302b2557122",
  "official-standard-move-executor-v5.mjs":
    "843e0a22530bd09a2712f0ebf9d03b63f3ef0fd83cf49f86cda1deeb2487ff3c",
  "official-disengage-executor-v5.mjs":
    "2d5e0c23ef1c563f8e8fc57f6ea01fcb11a0ef91003bb2f951a262737a16fc1d",
  "official-stimpack-move-consumer-executor-v3.mjs":
    "c31828f04a869a9cc29f468cd4133b08c600d03cb9d70d5dbf985be559f24929",
  "official-medic-medpack-active-executor-v2.mjs":
    "c967bf9fd03965e7bc1611549403dbf8255c47df5cf4702f15e52a0199dea259",
  "official-current-movement-authority-lineage-v3.mjs":
    "ca2ba60f90af942549a00a15dd86a213f9a25e41a4c7a2e30e8f26bb2112577d",
  "official-current-movement-frozen-loadout-adapter-v2.mjs":
    "cc4c453fc97c00bf01566eb435192f71cd2fc1381ed6a9861083862c878609b3",
  "official-movement-v5-medpack-v2-relationship-contract-v1.mjs":
    "c3e640a9d418aea21e58da93a6d3112ac42dc3c6912c8b8212ce330a909d75e4",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const acceptance = [];
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-stimpack-move-v2-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash, EXPECTED.sliceHash);
assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
assert.equal(OFFICIAL_MOVEMENT_V5_MIGRATED_ATOM_IDS.length, 63);
assert.equal(OFFICIAL_STIMPACK_MOVE_V3_MIGRATED_ATOM_IDS.length, 1);
assert.equal(OFFICIAL_MEDIC_MEDPACK_V2_MIGRATED_ATOM_IDS.length, 29);
assert.equal(OFFICIAL_SLICE_66_MIGRATED_ATOM_IDS.length, 93);
assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
acceptance.push("slice_66_is_exact_and_only_the_93_declared_existing_atoms_migrate");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(slice.catalogueHash, EXPECTED.catalogueHash);
assert.equal(runtime.descriptor.runtimeHash, EXPECTED.runtimeHash);
const currentIds = new Set(runtime.descriptor.executorManifest.map((entry) => entry.executorId));
for (const executorId of slice.executorIds) assert.equal(currentIds.has(executorId), true);
for (const executorId of slice.historicalCompatibility.frozenExecutorIds) {
  assert.equal(currentIds.has(executorId), false);
}
assert.equal(runtime.descriptor.executableRuleAtomCount, 421);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 605);
assert.equal(runtime.descriptor.productionRoomEligible, false);
acceptance.push("current_catalogue_runtime_and_six_executor_replacements_are_exact");

const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: createOfficialMovementV5MedpackV2RelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  }),
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(graph.graphHash, EXPECTED.graphHash);
assert.equal(graph.nodes.length, 7847);
assert.equal(graph.edges.length, 24939);
assert.equal(graph.coverageScopes.length, 29);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 265,
  partialContractAtoms: 40,
  noContractAtoms: 116,
  executors: 42,
  declaredStateContractExecutors: 30,
  missingStateContractExecutors: 12,
});
acceptance.push("relationship_graph_and_strict_partial_none_denominators_are_frozen");

const sourceHashes = {};
for (const [fileName, expectedHash] of Object.entries(SOURCE_HASHES)) {
  const actualHash = sha256(await readFile(path.join(ROOT, "packages/rule-atoms", fileName)));
  assert.equal(actualHash, expectedHash, fileName);
  sourceHashes[fileName] = actualHash;
}
acceptance.push("frozen_v1_v2_v4_and_current_v2_v3_v5_source_bytes_are_exact");

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
  unitRecordKeys: ["army_units:marine", "army_units:medic"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
  reserveDeployData: true,
});
assert.equal(liveReport.commandSnapshot.snapshotHash, EXPECTED.sourceSnapshotHash);
assert.deepEqual(liveReport.commandSnapshot.dataVersions, EXPECTED.dataVersions);
assert.equal(dataset.datasetHash, EXPECTED.datasetHash);
assert.equal(gameplayDataBundle.gameplayDataBundleHash, EXPECTED.gameplayDataBundleHash);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_official_71_69_48_medic_and_marine_data_is_bound_without_fallback");

assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
assert.equal(slice.sliceForecast.compatibilityOnlyMigratedExistingAtomCount, 64);
assert.equal(slice.sliceForecast.newlyStrictAtomCount, 29);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.rulesEligible, false);
assert.equal(slice.productionRoomEligible, false);
assert.equal(slice.trainingTruth, false);
acceptance.push("rules_skill_dsh_muzero_and_training_authority_remain_separate");

const report = {
  schema: "starcraft_tmg_existing_medic_medpack_v2_contract_closure_verification_v1",
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
  rulesTruth: "movement_v5_stimpack_v3_and_medic_medpack_v2_contract_evidence",
  trainingTruth: false,
};
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-medic-medpack-v2-contract-closure-v1-report.json",
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
