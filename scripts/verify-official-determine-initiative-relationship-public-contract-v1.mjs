import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialDetermineInitiativeRelationshipExtensionV1,
  OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-determine-initiative-relationship-contract-v1.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-determine-initiative-executor-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialExistingDetermineInitiativeContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-determine-initiative-contract-closure-rule-slice-v1.mjs";
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
  "build/ticket-11-rule-atoms-v1/official-existing-cleanup-refresh-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingDetermineInitiativeContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const acceptance = [];

assert.equal(
  previousReport.slice.sliceHash,
  "23d6385e012107abd6e2ad5b51d05f053d81e5a6833ad4afa09eaee3cc3b5d10",
);
assert.equal(
  previousReport.catalogueHash,
  "edda61ad6599cf032caa13476412c1a63897c63babb66000f028019f31cb75e6",
);
assert.equal(
  previousReport.runtimeHash,
  "8698853a5f4804ede9da31b8ee1ebf5e51173c5797b10b6ef730874c524aa79d",
);
acceptance.push("slice59_current_release_is_the_only_input_baseline");

const extension = createOfficialDetermineInitiativeRelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension,
});
const audit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(audit.valid, true);
assert.equal(audit.declaredScopesValid, true);
assert.equal(audit.counts.blockingGaps, 0);
assert.equal(audit.counts.declaredStateContractExecutors, 24);
assert.equal(audit.counts.stateContractMissingExecutors, 18);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 173,
  partialContractAtoms: 78,
  noContractAtoms: 170,
  executors: 42,
  declaredStateContractExecutors: 24,
  missingStateContractExecutors: 18,
});
acceptance.push("determine_initiative_closes_one_contract_and_six_existing_atoms");

const executorCoverage = coverage.executorCoverage.find((entry) => (
  entry.executorId === OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID
));
assert.ok(executorCoverage);
assert.equal(executorCoverage.stateContractDeclared, true);
assert.deepEqual(
  executorCoverage.executableAtomIds,
  [...OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS].sort(),
);
assert.ok(executorCoverage.executableAtomIds.every((atomId) => (
  coverage.strictCompleteAtomIds.includes(atomId)
)));
acceptance.push("all_six_existing_determine_initiative_atoms_are_strict_complete");

const ids = OFFICIAL_DETERMINE_INITIATIVE_RELATIONSHIP_NODE_IDS_V1;
const replayPath = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.exactAction,
  targetNodeIds: [ids.replayTest],
  relationships: ["derives", "verified_by"],
  maxDepth: 4,
});
assert.deepEqual(replayPath.reachedNodeIds, [ids.replayTest]);
acceptance.push("exact_action_has_a_public_replay_evidence_path");

const forbiddenScoreWrite = queryRuleRelationshipImpactV1(graph, {
  startNodeId: ids.initiativeDeterminedEvent,
  targetNodeIds: [ids.scores],
  relationships: ["writes"],
  maxDepth: 2,
});
assert.deepEqual(forbiddenScoreWrite.reachedNodeIds, []);
acceptance.push("initiative_transition_cannot_write_scores");

assert.equal(graph.relationshipAuthority, "derived_audit_evidence_only");
assert.equal(graph.rulesAuthority, false);
assert.equal(graph.trainingTruth, false);
acceptance.push("relationship_graph_cannot_become_rules_or_training_authority");

console.log(JSON.stringify({
  schema: "starcraft_tmg_determine_initiative_relationship_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  graphHash: graph.graphHash,
  coverage: coverage.counts,
  trainingTruth: false,
}, null, 2));
