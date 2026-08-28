#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_3_BINDING_V1 } from "../content/global-canonical-clause-merge-batch-3-binding-v1.mjs";
import {
  createGlobalCanonicalClauseContainmentMergeBatchV1,
  verifyGlobalCanonicalClauseContainmentMergeBatchV1,
} from "../packages/rule-atoms/global-canonical-clause-containment-merge-batch-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const plan = (await report("global-canonical-clause-merge-plan-v1-report.json")).plan;
const previousBatch = (await report("global-canonical-clause-merge-batch-2-v1-report.json")).batch;
const expansion = (await report(
  "global-canonical-clause-containment-candidate-expansion-v1-report.json",
)).expansion;
const input = {
  plan,
  previousBatch,
  expansion,
  reviewedBinding: GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_3_BINDING_V1,
};
const batch = createGlobalCanonicalClauseContainmentMergeBatchV1(input);
const audit = verifyGlobalCanonicalClauseContainmentMergeBatchV1({ ...input, batch });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("batch_binds_the_second_batch_and_containment_candidate_expansion", () => {
  assert.equal(batch.globalMergePlanHash, plan.planHash);
  assert.equal(batch.previousBatchHash, previousBatch.batchHash);
  assert.equal(batch.containmentCandidateExpansionHash, expansion.expansionHash);
});

check("all_thirty_one_connected_candidate_groups_receive_one_decision", () => {
  assert.equal(audit.counts.candidateGroups, 31);
  assert.equal(audit.counts.reviewedCandidateGroups, 31);
  assert.equal(audit.counts.unreviewedCandidateGroups, 0);
  assert.equal(audit.counts.duplicateCandidateGroupDecisions, 0);
});

check("all_sixty_nine_containment_candidate_clauses_are_mapped_once", () => {
  assert.equal(audit.counts.candidateLocalClauses, 69);
  assert.equal(audit.counts.mappedLocalClauses, 69);
  assert.equal(audit.counts.unmappedLocalClauses, 0);
  assert.equal(audit.counts.duplicateLocalClauseMappings, 0);
});

check("human_review_merges_seven_equivalences_and_keeps_twenty_four_related_contexts", () => {
  assert.equal(audit.counts.mergeEquivalentGroups, 7);
  assert.equal(audit.counts.keepDistinctGroups, 24);
  assert.equal(audit.counts.batchCanonicalClauses, 62);
  assert.equal(audit.counts.localToCanonicalReduction, 7);
});

check("partial_overlap_and_same_shape_different_scope_groups_remain_distinct", () => {
  for (const groupId of [
    "containment-candidate:8fe424f1dff6564fd005",
    "containment-candidate:c7ca501d0c464a4e2965",
    "containment-candidate:b19b212f6545a4b6df18",
    "containment-candidate:fed77ead2ca946f912ba",
    "containment-candidate:cca382e18f53ae087e5d",
  ]) {
    assert.equal(batch.groupDecisions.find((decision) => decision.groupId === groupId)?.decision,
      "keep_distinct_context");
  }
});

check("true_summary_and_ocr_equivalences_merge_with_all_provenance", () => {
  assert.deepEqual(batch.canonicalClauses.find((clause) => (
    clause.canonicalClauseId === "canonical:uncontested-zero-supply-control"
  )).sourceLocalClauseIds, [
    "core:6.2:supply-zero-control",
    "core:8.9.1:zero-supply-control",
  ]);
  assert.deepEqual(batch.canonicalClauses.find((clause) => (
    clause.canonicalClauseId === "canonical:round-one-first-player-assignment"
  )).sourceLocalClauseIds, [
    "core:12.1:first-round-initiative-rolloff",
    "core:8.2.2:round-one-first-player-assignment",
  ]);
});

check("canonical_rows_are_hash_bound_and_contain_no_source_or_title_prose", () => {
  for (const clause of batch.canonicalClauses) {
    assert.match(clause.sourceBindingHash, /^[a-f0-9]{64}$/u);
    assert.equal(clause.sourceLocalClauseIds.length, clause.sourceRows.length);
  }
  const serialized = JSON.stringify(batch);
  for (const forbidden of ["\"title\"", "\"text\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

check("unknown_duplicate_incomplete_or_drifted_review_evidence_fails_closed", () => {
  const unknown = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_3_BINDING_V1);
  unknown.groupDecisions[0].groupId = "containment-candidate:unknown";
  assert.throws(() => createGlobalCanonicalClauseContainmentMergeBatchV1({
    ...input,
    reviewedBinding: unknown,
  }), /containment_merge_batch_unknown_candidate_group/);

  const duplicate = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_3_BINDING_V1);
  duplicate.groupDecisions[1].groupId = duplicate.groupDecisions[0].groupId;
  assert.throws(() => createGlobalCanonicalClauseContainmentMergeBatchV1({
    ...input,
    reviewedBinding: duplicate,
  }), /containment_merge_batch_duplicate_candidate_group_decision/);

  const incomplete = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_3_BINDING_V1);
  incomplete.groupDecisions.pop();
  assert.throws(() => createGlobalCanonicalClauseContainmentMergeBatchV1({
    ...input,
    reviewedBinding: incomplete,
  }), /containment_merge_batch_candidate_group_coverage_incomplete/);

  const drifted = structuredClone(batch);
  drifted.canonicalClauses[0].canonicalSemanticClass = "permission";
  assert.throws(() => verifyGlobalCanonicalClauseContainmentMergeBatchV1({
    ...input,
    batch: drifted,
  }), /containment_merge_batch_hash_mismatch/);
});

check("decision_order_does_not_change_batch_identity", () => {
  const reversed = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_3_BINDING_V1);
  reversed.groupDecisions.reverse();
  assert.equal(createGlobalCanonicalClauseContainmentMergeBatchV1({
    ...input,
    reviewedBinding: reversed,
  }).batchHash, batch.batchHash);
});

check("third_partial_batch_updates_cumulative_counts_without_granting_authority", () => {
  assert.equal(batch.batchReviewedLocalClauseCount, 69);
  assert.equal(batch.cumulativeReviewedLocalClauseCount, 151);
  assert.equal(batch.remainingLocalClauseCount, 942);
  assert.equal(batch.batchCanonicalClauseCount, 62);
  assert.equal(batch.cumulativeCanonicalClauseCount, 111);
  assert.equal(batch.globalCanonicalClauseCount, null);
  assert.equal(batch.rulesEligible, false);
  assert.equal(batch.canAffectRules, false);
  assert.equal(batch.ctx2skillPromotionEligible, false);
  assert.equal(batch.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_merge_batch_3_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  batch,
  audit,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "pending_remaining_global_mapping_rule_atoms_and_replay",
    promotions: [],
    blocks: batch.blocks,
    remainingRuleGaps: 942,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-merge-batch-3-v1-report.json"),
  `${JSON.stringify(reportBody, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: reportBody.schema,
  acceptancePassed: reportBody.acceptancePassed,
  acceptanceTotal: reportBody.acceptanceTotal,
  failures,
  batchHash: batch.batchHash,
  counts: audit.counts,
  globalCanonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
