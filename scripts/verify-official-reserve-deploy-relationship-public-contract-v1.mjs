import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialExistingReserveDeployContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-reserve-deploy-contract-closure-rule-slice-v1.mjs";
import {
  createOfficialReserveDeployRelationshipExtensionV1,
  OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_SCOPE_ID,
} from "../packages/rule-atoms/official-reserve-deploy-relationship-contract-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-reserve-deploy-executor-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
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
  "build/ticket-11-rule-atoms-v1/official-existing-start-of-round-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingReserveDeployContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const extension = createOfficialReserveDeployRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const audit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const ids = OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_NODE_IDS_V1;
const acceptance = [];

assert.equal(graph.graphHash,
  "afd540544a397b5c1a55c305477d57a2c2bf713fcadb8fd6834e5e1358e9a2f8");
assert.equal(graph.nodes.length, 6328);
assert.equal(graph.edges.length, 22319);
assert.equal(audit.valid, true);
assert.equal(audit.declaredScopesValid, true);
assert.equal(audit.counts.blockingGaps, 0);
acceptance.push("current_graph_identity_and_all_declared_scopes_are_exact");

assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 216,
  partialContractAtoms: 67,
  noContractAtoms: 138,
  executors: 42,
  declaredStateContractExecutors: 26,
  missingStateContractExecutors: 16,
});
const currentExecutor = coverage.executorCoverage.find((entry) => (
  entry.executorId === OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID
));
assert.equal(currentExecutor.stateContractDeclared, true);
assert.deepEqual(
  [...currentExecutor.executableAtomIds].sort(),
  [...OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS].sort(),
);
assert.ok(OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS.every((atomId) => (
  coverage.strictCompleteAtomIds.includes(atomId)
)));
acceptance.push("all_thirty_reserve_deploy_consumed_atoms_are_strict_complete");

const forgedStart = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.startOfRoundHistory,
  targetNodeIds: [ids.forgedStartTest],
  relationships: ["projects_to", "verified_by"],
  maxDepth: 3,
});
const forgedPhase = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.phaseFirstActorByRound,
  targetNodeIds: [ids.forgedPhaseTest],
  relationships: ["projects_to", "verified_by"],
  maxDepth: 3,
});
assert.deepEqual(forgedStart.reachedNodeIds, [ids.forgedStartTest]);
assert.deepEqual(forgedPhase.reachedNodeIds, [ids.forgedPhaseTest]);
acceptance.push("start_and_phase_handoffs_reach_their_exact_negative_judges");

const supply = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.officialRoundSupplyState,
  targetNodeIds: [ids.supplyLineageTest, ids.replayTest],
  relationships: ["projects_to", "derives", "verified_by"],
  maxDepth: 7,
});
const geometry = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.board,
  targetNodeIds: [ids.geometryTest, ids.replayTest],
  relationships: ["projects_to", "derives", "verified_by"],
  maxDepth: 7,
});
assert.ok(supply.paths.every((entry) => entry.reached));
assert.ok(geometry.paths.every((entry) => entry.reached));
acceptance.push("supply_and_geometry_material_reach_judge_and_replay_evidence");

const scope = extension.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_SCOPE_ID
));
const broken = structuredClone(extension);
const required = scope.requiredEdges.find((entry) => (
  entry.from === ids.startOfRoundHistory && entry.to === ids.startHandoff
));
broken.edges = broken.edges.filter((entry) => !(
  entry.from === required.from
    && entry.relationship === required.relationship
    && entry.to === required.to
    && entry.provenance === required.provenance
));
const brokenAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: broken,
}));
assert.equal(brokenAudit.declaredScopesValid, false);
assert.ok(brokenAudit.gaps.requiredEdgeGaps.some((entry) => (
  entry.includes(OFFICIAL_RESERVE_DEPLOY_RELATIONSHIP_SCOPE_ID)
)));
acceptance.push("missing_required_handoff_edge_blocks_the_declared_scope");

assert.ok(graph.nodes.some((entry) => entry.nodeId === ids.historicalV1Executor));
assert.ok(graph.nodes.some((entry) => entry.nodeId === ids.currentV2Executor));
assert.ok(graph.edges.some((entry) => (
  entry.from === ids.historicalV1Executor
    && entry.relationship === "superseded_by"
    && entry.to === ids.currentV2Executor
)));
acceptance.push("historical_v1_and_current_v2_ancestry_remain_queryable");

console.log(JSON.stringify({
  schema: "starcraft_tmg_reserve_deploy_relationship_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  graphHash: graph.graphHash,
  graphNodes: graph.nodes.length,
  graphEdges: graph.edges.length,
  strictCompleteAtoms: coverage.counts.strictCompleteAtoms,
  missingStateContractExecutors: coverage.counts.missingStateContractExecutors,
  trainingTruth: false,
}, null, 2));
