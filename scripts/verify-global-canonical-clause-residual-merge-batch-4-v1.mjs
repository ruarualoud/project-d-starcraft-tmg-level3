#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GLOBAL_CANONICAL_CLAUSE_RESIDUAL_MERGE_BATCH_4_BINDING_V1 } from "../content/global-canonical-clause-residual-merge-batch-4-binding-v1.mjs";
import {
  createGlobalCanonicalClauseResidualMergeBatchV1,
  verifyGlobalCanonicalClauseResidualMergeBatchV1,
} from "../packages/rule-atoms/global-canonical-clause-residual-merge-batch-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const plan = (await report("global-canonical-clause-merge-plan-v1-report.json")).plan;
const previousBatches = await Promise.all([1, 2, 3].map(async (ordinal) => (
  (await report(`global-canonical-clause-merge-batch-${ordinal}-v1-report.json`)).batch
)));
const expansion = (await report(
  "global-canonical-clause-residual-candidate-expansion-v1-report.json",
)).expansion;
const input = {
  plan,
  previousBatches,
  expansion,
  reviewedBinding: GLOBAL_CANONICAL_CLAUSE_RESIDUAL_MERGE_BATCH_4_BINDING_V1,
};
const batch = createGlobalCanonicalClauseResidualMergeBatchV1(input);
const audit = verifyGlobalCanonicalClauseResidualMergeBatchV1({ ...input, batch });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("batch_binds_the_three_batch_chain_and_residual_candidate_denominator", () => {
  assert.equal(batch.globalMergePlanHash, plan.planHash);
  assert.deepEqual(batch.previousBatchHashes, previousBatches.map((item) => item.batchHash));
  assert.equal(batch.residualCandidateExpansionHash, expansion.expansionHash);
});

check("all_fifty_six_groups_receive_one_human_decision", () => {
  assert.equal(audit.counts.candidateGroups, 56);
  assert.equal(audit.counts.reviewedCandidateGroups, 56);
  assert.equal(audit.counts.unreviewedCandidateGroups, 0);
  assert.equal(audit.counts.duplicateCandidateGroupDecisions, 0);
  assert.equal(audit.counts.extendExistingGroups, 4);
  assert.equal(audit.counts.mergeNewEquivalentGroups, 12);
  assert.equal(audit.counts.keepDistinctGroups, 35);
  assert.equal(audit.counts.partitionGroups, 5);
});

check("only_the_one_hundred_eleven_remaining_candidate_clauses_are_mapped_once", () => {
  assert.equal(audit.counts.candidateRemainingLocalClauses, 111);
  assert.equal(audit.counts.mappedRemainingLocalClauses, 111);
  assert.equal(audit.counts.unmappedRemainingLocalClauses, 0);
  assert.equal(audit.counts.duplicateRemainingLocalMappings, 0);
  assert.equal(audit.counts.previouslyMappedLocalClauseRemaps, 0);
});

check("five_existing_canonicals_gain_six_alias_rows_without_mutating_old_evidence", () => {
  assert.equal(audit.counts.canonicalExtensions, 5);
  assert.equal(audit.counts.addedAliasLocalClauses, 6);
  assert.equal(audit.counts.changedPreviousSourceRows, 0);
  for (const extension of batch.canonicalExtensions) {
    assert.ok(extension.previousSourceLocalClauseIds.length > 0);
    assert.ok(extension.addedSourceLocalClauseIds.length > 0);
    assert.deepEqual(
      extension.sourceRows.slice(0, extension.previousSourceRows.length),
      extension.previousSourceRows,
    );
    assert.match(extension.previousSourceBindingHash, /^[a-f0-9]{64}$/u);
    assert.match(extension.sourceBindingHash, /^[a-f0-9]{64}$/u);
  }
});

check("partitioned_groups_do_not_smuggle_subset_or_wrong_scope_aliases", () => {
  const reserve = batch.groupDecisions.find((decision) => (
    decision.groupId === "residual-candidate:c25e288767ac3f810890"
  ));
  assert.equal(reserve.decision, "partition_context");
  assert.deepEqual(reserve.canonicalClauseIds, [
    "canonical:ability-target-range-and-line-of-sight",
    "canonical:active-ability-reserve-prohibition",
    "canonical:all-ability-types-reserve-inactivity",
    "canonical:passive-ability-reserve-inactivity",
  ]);
  assert.equal(reserve.canonicalClauseIds.includes("canonical:reaction-reserve-prohibition"), false);

  const supply = batch.groupDecisions.find((decision) => (
    decision.groupId === "residual-candidate:eb8df17354d0b74dda20"
  ));
  assert.equal(supply.decision, "partition_context");
  assert.ok(batch.canonicalExtensions.some((extension) => (
    extension.canonicalClauseId === "canonical:available-supply-formula"
      && extension.addedSourceLocalClauseIds.includes("core:12.4:available-supply-formula")
  )));
});

check("new_and_extended_rows_are_hash_bound_without_source_or_title_prose", () => {
  assert.equal(audit.counts.newCanonicalClauses, 84);
  assert.equal(audit.counts.newCanonicalSourceLocalClauses, 105);
  for (const clause of [...batch.newCanonicalClauses, ...batch.canonicalExtensions]) {
    assert.match(clause.sourceBindingHash, /^[a-f0-9]{64}$/u);
    assert.equal(clause.sourceLocalClauseIds.length, clause.sourceRows.length);
  }
  const serialized = JSON.stringify(batch);
  for (const forbidden of ["\"title\"", "\"text\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

check("unknown_remapped_duplicate_incomplete_or_drifted_review_evidence_fails_closed", () => {
  const unknownExtension = structuredClone(
    GLOBAL_CANONICAL_CLAUSE_RESIDUAL_MERGE_BATCH_4_BINDING_V1,
  );
  unknownExtension.groupDecisions[0].canonicalMappings[0].canonicalClauseId = "canonical:unknown";
  assert.throws(() => createGlobalCanonicalClauseResidualMergeBatchV1({
    ...input,
    reviewedBinding: unknownExtension,
  }), /residual_merge_batch_extension_canonical_unknown/);

  const remap = structuredClone(GLOBAL_CANONICAL_CLAUSE_RESIDUAL_MERGE_BATCH_4_BINDING_V1);
  remap.groupDecisions[0].canonicalMappings[0].sourceLocalClauseIds[0]
    = "core:4.4:out-of-coherency-mission-restriction";
  assert.throws(() => createGlobalCanonicalClauseResidualMergeBatchV1({
    ...input,
    reviewedBinding: remap,
  }), /residual_merge_batch_previously_mapped_local_clause/);

  const duplicate = structuredClone(GLOBAL_CANONICAL_CLAUSE_RESIDUAL_MERGE_BATCH_4_BINDING_V1);
  duplicate.groupDecisions[1].groupId = duplicate.groupDecisions[0].groupId;
  assert.throws(() => createGlobalCanonicalClauseResidualMergeBatchV1({
    ...input,
    reviewedBinding: duplicate,
  }), /residual_merge_batch_duplicate_candidate_group_decision/);

  const incomplete = structuredClone(GLOBAL_CANONICAL_CLAUSE_RESIDUAL_MERGE_BATCH_4_BINDING_V1);
  incomplete.groupDecisions.pop();
  assert.throws(() => createGlobalCanonicalClauseResidualMergeBatchV1({
    ...input,
    reviewedBinding: incomplete,
  }), /residual_merge_batch_candidate_group_coverage_incomplete/);

  const drifted = structuredClone(batch);
  drifted.newCanonicalClauses[0].canonicalSemanticClass = "permission";
  assert.throws(() => verifyGlobalCanonicalClauseResidualMergeBatchV1({
    ...input,
    batch: drifted,
  }), /residual_merge_batch_hash_mismatch/);
});

check("decision_order_does_not_change_batch_identity", () => {
  const reversed = structuredClone(GLOBAL_CANONICAL_CLAUSE_RESIDUAL_MERGE_BATCH_4_BINDING_V1);
  reversed.groupDecisions.reverse();
  assert.equal(createGlobalCanonicalClauseResidualMergeBatchV1({
    ...input,
    reviewedBinding: reversed,
  }).batchHash, batch.batchHash);
});

check("fourth_partial_batch_updates_counts_without_granting_authority", () => {
  assert.equal(batch.batchReviewedLocalClauseCount, 111);
  assert.equal(batch.cumulativeReviewedLocalClauseCount, 262);
  assert.equal(batch.remainingLocalClauseCount, 831);
  assert.equal(batch.batchNewCanonicalClauseCount, 84);
  assert.equal(batch.cumulativeCanonicalClauseCount, 195);
  assert.equal(batch.globalCanonicalClauseCount, null);
  assert.equal(batch.rulesEligible, false);
  assert.equal(batch.canAffectRules, false);
  assert.equal(batch.ctx2skillPromotionEligible, false);
  assert.equal(batch.replayEligible, false);
  assert.equal(batch.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_residual_merge_batch_4_verification_v1",
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
    remainingRuleGaps: 831,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-residual-merge-batch-4-v1-report.json"),
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
