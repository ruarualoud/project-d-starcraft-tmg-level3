import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createOfficialExistingMovementV3ContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-movement-v3-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialMovementV3RelationshipExtensionV1,
  OFFICIAL_MOVEMENT_V3_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS,
} from "../packages/rule-atoms/official-movement-v3-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";

const previousReport = JSON.parse(await readFile(
  new URL("../build/ticket-11-rule-atoms-v1/"
    + "official-existing-standard-move-contract-closure-v1-report.json", import.meta.url),
  "utf8",
));
const slice = createOfficialExistingMovementV3ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const extension = createOfficialMovementV3RelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const audit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const id = OFFICIAL_MOVEMENT_V3_RELATIONSHIP_NODE_IDS_V1;
const acceptance = [];

assert.equal(graph.graphHash,
  "37055400db59c426f8bd5fb20fc23a8e416b9ed7804255c3bf1bc7b6e77d731a");
assert.equal(graph.nodes.length, 6820);
assert.equal(graph.edges.length, 23101);
assert.equal(audit.valid, true);
assert.equal(audit.declaredScopesValid, true);
assert.equal(audit.counts.blockingGaps, 0);
acceptance.push("current_graph_identity_and_all_v3_declared_scopes_are_exact");

assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 235,
  partialContractAtoms: 58,
  noContractAtoms: 128,
  executors: 42,
  declaredStateContractExecutors: 28,
  missingStateContractExecutors: 14,
});
acceptance.push("four_v3_scopes_replace_three_current_v2_scopes_without_count_inflation");

const supplyImpact = queryRuleRelationshipImpactV1(graph, {
  startNodeId: id.supplyLossLedger,
  targetNodeIds: [id.supplyLineageTest, id.replayTest],
  relationships: ["projects_to", "verified_by", "derives"],
  maxDepth: 8,
});
assert.ok(supplyImpact.paths.every((entry) => entry.reached));
acceptance.push("supply_loss_ledger_reaches_lineage_and_replay_judges");

for (const [historical, current] of [
  [id.historicalStartV2Executor, id.currentStartV3Executor],
  [id.historicalReserveV2Executor, id.currentReserveV3Executor],
  [id.historicalStandardV2Executor, id.currentStandardV3Executor],
  [id.historicalDisengageV2Executor, id.currentDisengageV3Executor],
]) {
  assert.ok(graph.nodes.some((entry) => entry.nodeId === historical));
  assert.ok(graph.nodes.some((entry) => entry.nodeId === current));
  assert.ok(graph.edges.some((entry) => (
    entry.from === historical
      && entry.relationship === "superseded_by"
      && entry.to === current
  )));
}
acceptance.push("all_frozen_v2_to_current_v3_ancestry_is_queryable");

const broken = structuredClone(extension);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.disengage
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === id.supplyLossLedger && entry.to === id.currentSupplyLossLineage
));
broken.edges = broken.edges.filter((entry) => !(
  entry.from === required.from
    && entry.relationship === required.relationship
    && entry.to === required.to
    && entry.scopeId === required.scopeId
    && entry.provenance === required.provenance
));
const brokenAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: broken,
}));
assert.equal(brokenAudit.declaredScopesValid, false);
assert.ok(brokenAudit.gaps.requiredEdgeGaps.some((entry) => (
  entry.includes(OFFICIAL_MOVEMENT_V3_RELATIONSHIP_SCOPE_IDS.disengage)
)));
acceptance.push("missing_required_supply_lineage_edge_blocks_disengage_scope");

console.log(JSON.stringify({
  schema: "starcraft_tmg_movement_v3_relationship_public_contract_verification_v1",
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
