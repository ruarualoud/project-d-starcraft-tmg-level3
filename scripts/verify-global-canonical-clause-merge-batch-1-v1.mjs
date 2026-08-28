#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1 } from "../content/global-canonical-clause-merge-batch-1-binding-v1.mjs";
import {
  createGlobalCanonicalClauseMergeBatchV1,
  verifyGlobalCanonicalClauseMergeBatchV1,
} from "../packages/rule-atoms/global-canonical-clause-merge-batch-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const plan = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-merge-plan-v1-report.json"),
  "utf8",
)).plan;
const input = {
  plan,
  reviewedBinding: GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1,
};
const batch = createGlobalCanonicalClauseMergeBatchV1(input);
const audit = verifyGlobalCanonicalClauseMergeBatchV1({ ...input, batch });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("batch_binds_the_exact_global_merge_plan_and_review_batch", () => {
  assert.equal(batch.globalMergePlanHash, plan.planHash);
  assert.equal(batch.reviewBatchId, plan.reviewBatches[0].batchId);
  assert.equal(batch.reviewBatchKind, "potential_merge_groups");
});

check("all_fourteen_potential_merge_groups_receive_one_review_decision", () => {
  assert.equal(audit.counts.potentialMergeGroups, 14);
  assert.equal(audit.counts.reviewedMergeGroups, 14);
  assert.equal(audit.counts.unreviewedMergeGroups, 0);
  assert.equal(audit.counts.duplicateMergeGroupDecisions, 0);
});

check("all_twenty_eight_local_clauses_are_mapped_exactly_once", () => {
  assert.equal(audit.counts.reviewBatchLocalClauses, 28);
  assert.equal(audit.counts.mappedLocalClauses, 28);
  assert.equal(audit.counts.unmappedLocalClauses, 0);
  assert.equal(audit.counts.duplicateLocalClauseMappings, 0);
});

check("reviewed_equivalence_reduces_twenty_eight_local_clauses_to_sixteen", () => {
  assert.equal(audit.counts.mergeEquivalentGroups, 12);
  assert.equal(audit.counts.keepDistinctGroups, 2);
  assert.equal(audit.counts.batchCanonicalClauses, 16);
  assert.equal(audit.counts.localToCanonicalReduction, 12);
});

check("phase_scoped_hold_actions_remain_distinct", () => {
  const decision = batch.groupDecisions.find((item) => (
    item.groupId === "merge-candidate:exact_source_hash_set:11aee7a9ba49da4b"
  ));
  assert.equal(decision.decision, "keep_distinct_context");
  assert.deepEqual(decision.canonicalClauseIds, [
    "canonical:assault-phase-hold-action",
    "canonical:movement-phase-hold-action",
  ]);
});

check("general_faction_definition_and_card_eligibility_remain_distinct", () => {
  const decision = batch.groupDecisions.find((item) => (
    item.groupId === "merge-candidate:normalized_review_title:d6c3bf82427c70dd"
  ));
  assert.equal(decision.decision, "keep_distinct_context");
  assert.deepEqual(decision.canonicalClauseIds, [
    "canonical:faction-card-tag-eligibility",
    "canonical:faction-tag-unit-allegiance",
  ]);
});

check("exact_repeated_race_tag_sources_merge_with_both_provenance_links", () => {
  const clause = batch.canonicalClauses.find((item) => (
    item.canonicalClauseId === "canonical:race-faction-tag-set"
  ));
  assert.deepEqual(clause.sourceLocalClauseIds, [
    "core:11:race-tag-set",
    "core:2.4.1:race-tags",
  ]);
  assert.equal(clause.mergeDecision, "merge_equivalent");
});

check("every_canonical_clause_retains_hash_bound_source_rows", () => {
  for (const clause of batch.canonicalClauses) {
    assert.match(clause.sourceBindingHash, /^[a-f0-9]{64}$/u);
    assert.equal(clause.sourceLocalClauseIds.length, clause.sourceRows.length);
    assert.ok(clause.sourceRows.every((row) => (
      row.localClauseId
        && /^[a-f0-9]{64}$/u.test(row.sourceLedgerHash)
        && /^[a-f0-9]{64}$/u.test(row.sourceIdentitySetHash)
        && /^[a-f0-9]{64}$/u.test(row.semanticTitleHash)
    )));
  }
});

check("review_binding_contains_no_rule_or_faq_prose", () => {
  const serialized = JSON.stringify(batch);
  for (const forbidden of ["\"title\"", "\"text\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

check("unknown_duplicate_or_incomplete_decisions_fail_closed", () => {
  const unknown = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1);
  unknown.groupDecisions[0].groupId = "merge-candidate:unknown";
  assert.throws(() => createGlobalCanonicalClauseMergeBatchV1({
    plan,
    reviewedBinding: unknown,
  }), /global_canonical_batch_unknown_merge_group/);

  const duplicate = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1);
  duplicate.groupDecisions[1].groupId = duplicate.groupDecisions[0].groupId;
  assert.throws(() => createGlobalCanonicalClauseMergeBatchV1({
    plan,
    reviewedBinding: duplicate,
  }), /global_canonical_batch_duplicate_merge_group_decision/);

  const incomplete = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1);
  incomplete.groupDecisions.pop();
  assert.throws(() => createGlobalCanonicalClauseMergeBatchV1({
    plan,
    reviewedBinding: incomplete,
  }), /global_canonical_batch_merge_group_coverage_incomplete/);
});

check("canonical_or_dependency_drift_fails_closed", () => {
  const dependency = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1);
  dependency.globalMergePlanHash = "0".repeat(64);
  assert.throws(() => createGlobalCanonicalClauseMergeBatchV1({
    plan,
    reviewedBinding: dependency,
  }), /global_canonical_batch_binding_dependency_mismatch/);

  const canonicalDrift = structuredClone(batch);
  canonicalDrift.canonicalClauses[0].canonicalSemanticClass = "permission";
  assert.throws(() => verifyGlobalCanonicalClauseMergeBatchV1({
    ...input,
    batch: canonicalDrift,
  }), /global_canonical_batch_hash_mismatch/);
});

check("review_decision_order_does_not_change_content_identity", () => {
  const reversed = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_1_BINDING_V1);
  reversed.groupDecisions.reverse();
  assert.equal(createGlobalCanonicalClauseMergeBatchV1({
    plan,
    reviewedBinding: reversed,
  }).batchHash, batch.batchHash);
});

check("partial_batch_grants_no_global_rules_skill_or_training_authority", () => {
  assert.equal(batch.reviewedLocalClauseCount, 28);
  assert.equal(batch.remainingLocalClauseCount, 1065);
  assert.equal(batch.globalCanonicalClauseCount, null);
  assert.equal(batch.batchCanonicalClauseCount, 16);
  assert.equal(batch.mergeStatus, "partial_global_canonical_mapping_reviewed");
  assert.equal(batch.rulesEligible, false);
  assert.equal(batch.canAffectRules, false);
  assert.equal(batch.ctx2skillPromotionEligible, false);
  assert.equal(batch.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_merge_batch_1_verification_v1",
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
    remainingRuleGaps: 1065,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-merge-batch-1-v1-report.json"),
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
