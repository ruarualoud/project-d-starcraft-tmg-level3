import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialExistingStartOfRoundContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-start-of-round-contract-closure-rule-slice-v1.mjs";
import {
  createOfficialStartOfRoundRelationshipExtensionV1,
  OFFICIAL_START_OF_ROUND_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-start-of-round-relationship-contract-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-start-of-round-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previousReport = JSON.parse(await readFile(path.join(
  ROOT,
  "build/ticket-11-rule-atoms-v1/"
    + "official-existing-determine-initiative-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingStartOfRoundContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const acceptance = [];

assert.equal(
  previousReport.slice.sliceHash,
  "54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448",
);
assert.equal(
  previousReport.catalogueHash,
  "b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38",
);
assert.equal(
  previousReport.runtimeHash,
  "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7",
);
acceptance.push("slice60_current_release_is_the_only_input_baseline");

const extension = createOfficialStartOfRoundRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension,
});
const audit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(graph.graphHash,
  "62e894083bdf2d4e52601f9bc3d17da857d7954b40033ac3d481498dfaa4ee5e");
assert.equal(audit.valid, true);
assert.equal(audit.declaredScopesValid, true);
assert.equal(audit.counts.blockingGaps, 0);
assert.equal(audit.counts.declaredStateContractExecutors, 25);
assert.equal(audit.counts.stateContractMissingExecutors, 17);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 186,
  partialContractAtoms: 78,
  noContractAtoms: 157,
  executors: 42,
  declaredStateContractExecutors: 25,
  missingStateContractExecutors: 17,
});
acceptance.push("start_of_round_closes_one_contract_and_thirteen_existing_atoms");

const executorCoverage = coverage.executorCoverage.find((entry) => (
  entry.executorId === OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID
));
assert.ok(executorCoverage);
assert.equal(executorCoverage.stateContractDeclared, true);
assert.deepEqual(
  executorCoverage.executableAtomIds,
  [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS].sort(),
);
assert.ok(executorCoverage.executableAtomIds.every((atomId) => (
  coverage.strictCompleteAtomIds.includes(atomId)
)));
acceptance.push("all_thirteen_existing_start_of_round_atoms_are_strict_complete");

const ids = OFFICIAL_START_OF_ROUND_RELATIONSHIP_NODE_IDS_V1;
const supplyPath = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.pieces,
  targetNodeIds: [ids.finiteSupplyTest],
  relationships: ["projects_to", "derives", "verified_by"],
  maxDepth: 4,
});
assert.deepEqual(supplyPath.reachedNodeIds, [ids.finiteSupplyTest]);
acceptance.push("piece_material_has_a_public_finite_supply_evidence_path");

const replayPath = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.exactAction,
  targetNodeIds: [ids.replayTest],
  relationships: ["derives", "verified_by"],
  maxDepth: 4,
});
assert.deepEqual(replayPath.reachedNodeIds, [ids.replayTest]);
acceptance.push("exact_start_action_has_a_public_replay_evidence_path");

const forbiddenScoreWrite = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.resolvedEvent,
  targetNodeIds: [ids.scores],
  relationships: ["writes"],
  maxDepth: 2,
});
assert.deepEqual(forbiddenScoreWrite.reachedNodeIds, []);
assert.equal(graph.relationshipAuthority, "derived_audit_evidence_only");
assert.equal(graph.rulesAuthority, false);
assert.equal(graph.trainingTruth, false);
acceptance.push("start_transition_preserves_scores_and_graph_has_no_rules_authority");

console.log(JSON.stringify({
  schema: "starcraft_tmg_start_of_round_relationship_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  graphHash: graph.graphHash,
  graphNodes: graph.nodes.length,
  graphEdges: graph.edges.length,
  coverage: coverage.counts,
  trainingTruth: false,
}, null, 2));
