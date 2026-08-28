import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-stimpack-move-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialMovementV4RelationshipExtensionV1,
  OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS,
} from "../packages/rule-atoms/official-movement-v4-relationship-contract-v1.mjs";
import {
  createOfficialStimpackMoveV2RelationshipExtensionV1,
  OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID,
} from "../packages/rule-atoms/official-stimpack-move-v2-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";

const previousReport = JSON.parse(await readFile(
  new URL("../build/ticket-11-rule-atoms-v1/"
    + "official-existing-movement-v3-contract-closure-v1-report.json", import.meta.url),
  "utf8",
));
const slice = createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const extension = createOfficialStimpackMoveV2RelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const audit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const movement = OFFICIAL_MOVEMENT_V4_RELATIONSHIP_NODE_IDS_V1;
const stimpack = OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_NODE_IDS_V1;
const acceptance = [];

assert.equal(graph.graphHash,
  "1fbbe7c6f361ed9dceefe5d3d59cba25617f17c399e00a671ccb98018c8dbb7a");
assert.equal(graph.nodes.length, 7242);
assert.equal(graph.edges.length, 23949);
assert.equal(graph.coverageScopes.length, 28);
assert.equal(audit.valid, true);
assert.equal(audit.declaredScopesValid, true);
assert.equal(audit.counts.blockingGaps, 0);
acceptance.push("current_graph_identity_and_all_slice_65_scopes_are_exact");

assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 236,
  partialContractAtoms: 57,
  noContractAtoms: 128,
  executors: 42,
  declaredStateContractExecutors: 29,
  missingStateContractExecutors: 13,
});
acceptance.push("four_v4_scopes_replace_v3_and_stimpack_v2_closes_one_partial_atom");

const loadoutImpact = queryRuleRelationshipImpactV1(graph, {
  startNodeId: movement.selectedUpgradeNames,
  targetNodeIds: [movement.publicTest, movement.replayTest],
  relationships: ["projects_to", "derives", "verified_by"],
  maxDepth: 8,
});
assert.ok(loadoutImpact.paths.every((entry) => entry.reached));
acceptance.push("selected_upgrade_loadout_reaches_current_domain_and_replay_judges");

for (const [historical, current] of [
  [movement.historicalStartV3Executor, movement.currentStartV4Executor],
  [movement.historicalReserveV3Executor, movement.currentReserveV4Executor],
  [movement.historicalStandardV3Executor, movement.currentStandardV4Executor],
  [movement.historicalDisengageV3Executor, movement.currentDisengageV4Executor],
  [stimpack.historicalExecutor, stimpack.currentExecutor],
]) {
  assert.ok(graph.nodes.some((entry) => entry.nodeId === historical), historical);
  assert.ok(graph.nodes.some((entry) => entry.nodeId === current), current);
  assert.ok(graph.edges.some((entry) => (
    entry.from === historical
      && entry.relationship === "superseded_by"
      && entry.to === current
  )), `${historical}->${current}`);
}
acceptance.push("frozen_v1_v3_to_current_v2_v4_ancestry_remains_queryable");

const brokenLoadout = structuredClone(extension);
const standardScope = brokenLoadout.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.standardMove
));
const requiredLoadoutEdge = standardScope.requiredEdges.find((entry) => (
  entry.from === movement.selectedUpgradeNames
    && entry.relationship === "projects_to"
    && entry.to === movement.currentAuthorityLineage
));
assert.ok(requiredLoadoutEdge);
brokenLoadout.edges = brokenLoadout.edges.filter((entry) => !(
  entry.from === requiredLoadoutEdge.from
    && entry.relationship === requiredLoadoutEdge.relationship
    && entry.to === requiredLoadoutEdge.to
    && entry.scopeId === requiredLoadoutEdge.scopeId
    && entry.provenance === requiredLoadoutEdge.provenance
));
const brokenLoadoutAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: brokenLoadout,
}));
assert.equal(brokenLoadoutAudit.declaredScopesValid, false);
assert.ok(brokenLoadoutAudit.gaps.requiredEdgeGaps.some((entry) => (
  entry.includes(OFFICIAL_MOVEMENT_V4_RELATIONSHIP_SCOPE_IDS.standardMove)
)));
acceptance.push("missing_selected_loadout_projection_blocks_standard_move_v4_scope");

const movementOnly = createOfficialMovementV4RelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
assert.equal(movementOnly.coverageScopes.some((entry) => (
  entry.scopeId === OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID
)), false);
const brokenStimpack = structuredClone(extension);
const stimpackScope = brokenStimpack.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID
));
const paymentEdge = stimpackScope.requiredEdges.find((entry) => (
  entry.from === stimpack.cardReadiness
    && entry.relationship === "gates"
    && entry.to === stimpack.stimpackDomain
));
assert.ok(paymentEdge);
brokenStimpack.edges = brokenStimpack.edges.filter((entry) => !(
  entry.from === paymentEdge.from
    && entry.relationship === paymentEdge.relationship
    && entry.to === paymentEdge.to
    && entry.scopeId === paymentEdge.scopeId
    && entry.provenance === paymentEdge.provenance
));
const brokenStimpackAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: brokenStimpack,
}));
assert.equal(brokenStimpackAudit.declaredScopesValid, false);
assert.ok(brokenStimpackAudit.gaps.requiredEdgeGaps.some((entry) => (
  entry.includes(OFFICIAL_STIMPACK_MOVE_V2_RELATIONSHIP_SCOPE_ID)
)));
acceptance.push("missing_stimpack_payment_gate_blocks_stimpack_move_v2_scope");

console.log(JSON.stringify({
  schema: "starcraft_tmg_movement_v4_relationship_public_contract_verification_v1",
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
