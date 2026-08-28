import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1,
  OFFICIAL_MOVEMENT_V4_MIGRATED_ATOM_IDS,
  OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS,
  verifyOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-stimpack-move-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialStimpackMoveV2RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-stimpack-move-v2-relationship-contract-v1.mjs";
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
  sliceHash: "4f92a8afde13bf27cbe8a32c3df1cfd1c02d4b1ca1894969a55eb7722c360b35",
  catalogueHash: "d378ecc5f91753d80251dbf37ecdee1c17cdf3a36c001f9855cbb896d588faa9",
  runtimeHash: "51f3d865c2dde8735a8b6f58248d91207d03370b9ac0f0f04a8786c5e7c31241",
  graphHash: "1fbbe7c6f361ed9dceefe5d3d59cba25617f17c399e00a671ccb98018c8dbb7a",
  sourceSnapshotHash: "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61",
  datasetHash: "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63",
  gameplayDataBundleHash: "1e620d2e44804653b2c5d37025c71c17f2daf670f4e76daefa196dc609430ca7",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const SOURCE_HASHES = Object.freeze({
  "official-start-of-round-executor-v3.mjs":
    "17513af588bc785f2701a3ebaee4b2735430f589784e4dee8cf53ae1fe8e51e7",
  "official-reserve-deploy-executor-v3.mjs":
    "941894cd17903d011992dc20ef5f6a922a394ea6f360f469b701fd51aa9acbe7",
  "official-standard-move-executor-v3.mjs":
    "269287263a780ab5bd914bc358ea108e9d75e58b0baa20c57567a05548b041df",
  "official-disengage-executor-v3.mjs":
    "85f1a6a37467ceb31cbcd8a40e3105a8576ed4cf51d593d075630c76aad83072",
  "official-stimpack-move-consumer-executor-v1.mjs":
    "62ea6efe7b3b6c77df284fc0ede25e8d6e919940bdddf585c4271fa48669a3f6",
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
  "official-current-movement-authority-lineage-v2.mjs":
    "6a99bea3a199b1924aa3c53e38f331aa2430a769258fb7d838cc04156d7b850d",
  "official-current-movement-frozen-loadout-adapter-v1.mjs":
    "c6e99c9d3d12a92f97b77fd64f82cfd2165da712d74b090505dd5005561e421d",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const acceptance = [];
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-movement-v3-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash, EXPECTED.sliceHash);
assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
assert.equal(slice.versionReassignedRuleAtomIds.length, 64);
assert.equal(OFFICIAL_MOVEMENT_V4_MIGRATED_ATOM_IDS.length, 63);
assert.deepEqual(
  [...slice.versionReassignedRuleAtomIds].sort(),
  [...OFFICIAL_SLICE_65_MIGRATED_ATOM_IDS].sort(),
);
assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
acceptance.push("slice_64_is_exact_and_only_the_64_declared_existing_atoms_migrate");

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
acceptance.push("current_catalogue_runtime_and_five_executor_replacements_are_exact");

const extension = createOfficialStimpackMoveV2RelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(graph.graphHash, EXPECTED.graphHash);
assert.equal(graph.nodes.length, 7242);
assert.equal(graph.edges.length, 23949);
assert.equal(graph.coverageScopes.length, 28);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 236,
  partialContractAtoms: 57,
  noContractAtoms: 128,
  executors: 42,
  declaredStateContractExecutors: 29,
  missingStateContractExecutors: 13,
});
acceptance.push("relationship_graph_and_strict_partial_none_denominators_are_frozen");

const sourceHashes = {};
for (const [fileName, expectedHash] of Object.entries(SOURCE_HASHES)) {
  const actualHash = sha256(await readFile(path.join(ROOT, "packages/rule-atoms", fileName)));
  assert.equal(actualHash, expectedHash, fileName);
  sourceHashes[fileName] = actualHash;
}
acceptance.push("frozen_v1_v3_and_current_v2_v4_source_bytes_are_exact");

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
  unitRecordKeys: ["army_units:marine"],
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
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  EXPECTED.gameplayDataBundleHash);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_official_71_69_48_data_is_bound_without_repository_fallback");

assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
assert.equal(slice.sliceForecast.compatibilityOnlyMigratedExistingAtomCount, 63);
assert.equal(slice.sliceForecast.newlyStrictAtomCount, 1);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.rulesEligible, false);
assert.equal(slice.productionRoomEligible, false);
assert.equal(slice.trainingTruth, false);
acceptance.push("rules_skill_dsh_muzero_and_training_authority_remain_separate");

const report = {
  schema: "starcraft_tmg_existing_stimpack_move_v2_contract_closure_verification_v1",
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
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult:
      "start_v4_movement_v4_stimpack_v2_and_frozen_v1_v3_replay_required",
    promotions: [],
    blocks: ["thirteen_executor_contracts_and_185_non_strict_atoms_remain"],
    remainingRuleGaps: 491,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
    harnessToolsCalled: ["list_legal_actions", "preview_action",
      "apply_action_after_user_confirmation", "replay_room"],
    uiTraceEvidence: "authority_contract_trace_only_browser_and_device_ui_pending",
    agentDecisionEvidence: "rules_owned_exact_v23_action_and_signed_receipt",
    memoryTraceEvidence: { refs: [], promotionAttempted: false },
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "source_loadout_lineage_graph_or_replay_drift_quarantines_slice_65",
    ],
    userVisibleChecks: [
      "current LegalSpace exposes only v4 movement and Stimpack Move v2",
      "historical v1-v3 rule identities remain queryable",
    ],
  },
  rulesTruth: "slice_65_contract_evidence_only",
  productionTruth: false,
  trainingTruth: false,
};
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-stimpack-move-v2-contract-closure-v1-report.json",
), `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: graph.graphHash,
  coverage: coverage.counts,
  migratedExistingAtoms: slice.versionReassignedRuleAtomIds.length,
  repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  trainingTruth: false,
}, null, 2));
