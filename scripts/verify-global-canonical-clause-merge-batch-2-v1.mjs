#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_2_BINDING_V1 } from "../content/global-canonical-clause-merge-batch-2-binding-v1.mjs";
import {
  createGlobalCanonicalClauseSemanticMergeBatchV1,
  verifyGlobalCanonicalClauseSemanticMergeBatchV1,
} from "../packages/rule-atoms/global-canonical-clause-semantic-merge-batch-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const plan = (await report("global-canonical-clause-merge-plan-v1-report.json")).plan;
const previousBatch = (await report("global-canonical-clause-merge-batch-1-v1-report.json")).batch;
const expansion = (await report(
  "global-canonical-clause-semantic-candidate-expansion-v1-report.json",
)).expansion;
const input = {
  plan,
  previousBatch,
  expansion,
  reviewedBinding: GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_2_BINDING_V1,
};
const batch = createGlobalCanonicalClauseSemanticMergeBatchV1(input);
const audit = verifyGlobalCanonicalClauseSemanticMergeBatchV1({ ...input, batch });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("batch_binds_the_plan_previous_batch_and_semantic_candidate_expansion", () => {
  assert.equal(batch.globalMergePlanHash, plan.planHash);
  assert.equal(batch.previousBatchHash, previousBatch.batchHash);
  assert.equal(batch.semanticCandidateExpansionHash, expansion.expansionHash);
});

check("all_twenty_seven_candidate_groups_receive_one_human_decision", () => {
  assert.equal(audit.counts.candidateGroups, 27);
  assert.equal(audit.counts.reviewedCandidateGroups, 27);
  assert.equal(audit.counts.unreviewedCandidateGroups, 0);
  assert.equal(audit.counts.duplicateCandidateGroupDecisions, 0);
});

check("all_fifty_four_candidate_clauses_are_mapped_once", () => {
  assert.equal(audit.counts.candidateLocalClauses, 54);
  assert.equal(audit.counts.mappedLocalClauses, 54);
  assert.equal(audit.counts.unmappedLocalClauses, 0);
  assert.equal(audit.counts.duplicateLocalClauseMappings, 0);
});

check("human_review_merges_twenty_one_equivalences_and_keeps_six_context_pairs", () => {
  assert.equal(audit.counts.mergeEquivalentGroups, 21);
  assert.equal(audit.counts.keepDistinctGroups, 6);
  assert.equal(audit.counts.batchCanonicalClauses, 33);
  assert.equal(audit.counts.localToCanonicalReduction, 21);
});

check("phase_card_type_and_trigger_contexts_remain_distinct", () => {
  for (const groupId of [
    "semantic-candidate:2670bacafd21d14c581b",
    "semantic-candidate:2db6ef2d91d5da19da0b",
    "semantic-candidate:4993b362d890d7f83610",
    "semantic-candidate:8c64f67030e95ab133c4",
    "semantic-candidate:d0f9e2a59663f483ab74",
    "semantic-candidate:de9c8b78cebbc9cb5731",
  ]) {
    assert.equal(batch.groupDecisions.find((decision) => decision.groupId === groupId)?.decision,
      "keep_distinct_context");
  }
});

check("ocr_variants_and_repeated_semantics_merge_with_complete_provenance", () => {
  const positive = batch.canonicalClauses.find((clause) => (
    clause.canonicalClauseId === "canonical:positive-modifier-direction"
  ));
  assert.deepEqual(positive.sourceLocalClauseIds, [
    "core:11:positive-modifier",
    "core:3.4:positive-modifier",
  ]);
  const groundSize = batch.canonicalClauses.find((clause) => (
    clause.canonicalClauseId === "canonical:ground-level-effective-size"
  ));
  assert.deepEqual(groundSize.sourceLocalClauseIds, [
    "core:11:effective-size-ground-level-restatement",
    "core:11:ground-level-effective-size",
  ]);
});

check("display_only_examples_can_merge_but_never_gain_rule_atom_eligibility", () => {
  const example = batch.canonicalClauses.find((clause) => (
    clause.canonicalClauseId === "canonical:reaction-limit-examples"
  ));
  assert.equal(example.disposition, "display_only");
  assert.equal(example.eligibleForRuleAtomMapping, false);
  assert.equal(example.executable, false);
});

check("every_canonical_clause_retains_hash_bound_source_rows_without_rule_prose", () => {
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
  const serialized = JSON.stringify(batch);
  for (const forbidden of ["\"title\"", "\"text\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

check("unknown_duplicate_incomplete_or_drifted_review_evidence_fails_closed", () => {
  const unknown = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_2_BINDING_V1);
  unknown.groupDecisions[0].groupId = "semantic-candidate:unknown";
  assert.throws(() => createGlobalCanonicalClauseSemanticMergeBatchV1({
    ...input,
    reviewedBinding: unknown,
  }), /semantic_merge_batch_unknown_candidate_group/);

  const duplicate = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_2_BINDING_V1);
  duplicate.groupDecisions[1].groupId = duplicate.groupDecisions[0].groupId;
  assert.throws(() => createGlobalCanonicalClauseSemanticMergeBatchV1({
    ...input,
    reviewedBinding: duplicate,
  }), /semantic_merge_batch_duplicate_candidate_group_decision/);

  const incomplete = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_2_BINDING_V1);
  incomplete.groupDecisions.pop();
  assert.throws(() => createGlobalCanonicalClauseSemanticMergeBatchV1({
    ...input,
    reviewedBinding: incomplete,
  }), /semantic_merge_batch_candidate_group_coverage_incomplete/);

  const drifted = structuredClone(batch);
  drifted.canonicalClauses[0].canonicalSemanticClass = "permission";
  assert.throws(() => verifyGlobalCanonicalClauseSemanticMergeBatchV1({
    ...input,
    batch: drifted,
  }), /semantic_merge_batch_hash_mismatch/);
});

check("review_decision_order_does_not_change_batch_identity", () => {
  const reversed = structuredClone(GLOBAL_CANONICAL_CLAUSE_MERGE_BATCH_2_BINDING_V1);
  reversed.groupDecisions.reverse();
  assert.equal(createGlobalCanonicalClauseSemanticMergeBatchV1({
    ...input,
    reviewedBinding: reversed,
  }).batchHash, batch.batchHash);
});

check("second_partial_batch_updates_cumulative_counts_without_granting_authority", () => {
  assert.equal(batch.batchReviewedLocalClauseCount, 54);
  assert.equal(batch.cumulativeReviewedLocalClauseCount, 82);
  assert.equal(batch.remainingLocalClauseCount, 1011);
  assert.equal(batch.batchCanonicalClauseCount, 33);
  assert.equal(batch.cumulativeCanonicalClauseCount, 49);
  assert.equal(batch.globalCanonicalClauseCount, null);
  assert.equal(batch.rulesEligible, false);
  assert.equal(batch.canAffectRules, false);
  assert.equal(batch.ctx2skillPromotionEligible, false);
  assert.equal(batch.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_merge_batch_2_verification_v1",
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
    remainingRuleGaps: 1011,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-merge-batch-2-v1-report.json"),
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
