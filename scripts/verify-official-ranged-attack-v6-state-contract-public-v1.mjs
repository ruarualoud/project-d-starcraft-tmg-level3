#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-medic-medpack-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialRangedAttackV6RelationshipExtensionV1,
  OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1,
  OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_SCOPE_ID,
} from "../packages/rule-atoms/official-ranged-attack-v6-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previousReport = JSON.parse(await readFile(path.join(
  ROOT,
  "build/ticket-11-rule-atoms-v1",
  "official-existing-stimpack-move-v2-contract-closure-v1-report.json",
), "utf8"));
const slice66 = createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice66.catalogue });
const extension = createOfficialRangedAttackV6RelationshipExtensionV1({
  catalogueHash: slice66.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({
  catalogue: slice66.catalogue,
  extension,
});
const audit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);

assert.equal(audit.valid, true);
assert.equal(audit.declaredScopesValid, true);
assert.equal(audit.counts.blockingGaps, 0);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 288,
  partialContractAtoms: 79,
  noContractAtoms: 54,
  executors: 42,
  declaredStateContractExecutors: 31,
  missingStateContractExecutors: 11,
});
assert.equal(coverage.missingExecutorIds.includes("authority.ranged-attack-v6"), false);

const scope = graph.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_SCOPE_ID
));
assert.ok(scope);
for (const testNodeId of Object.values(
  OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1.tests,
)) {
  assert.equal(scope.evidenceTestNodeIds.includes(testNodeId), true, testNodeId);
}

const missingEdge = scope.requiredEdges.find((edge) => (
  edge.from === OFFICIAL_RANGED_ATTACK_V6_RELATIONSHIP_NODE_IDS_V1.event
    && edge.relationship === "writes"
));
assert.ok(missingEdge);
const brokenExtension = {
  ...extension,
  edges: extension.edges.filter((edge) => !(
    edge.scopeId === missingEdge.scopeId
      && edge.from === missingEdge.from
      && edge.relationship === missingEdge.relationship
      && edge.to === missingEdge.to
  )),
};
const brokenAudit = auditRuleRelationshipGraphV1(createRuleRelationshipGraphV1({
  catalogue: slice66.catalogue,
  extension: brokenExtension,
}));
assert.equal(brokenAudit.valid, false);
assert.ok(brokenAudit.counts.blockingGaps > 0);

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_ranged_attack_v6_state_contract_public_verification_v1",
  graphHash: graph.graphHash,
  coverage: coverage.counts,
  missingEdgeRejected: true,
  trainingTruth: false,
}, null, 2));
