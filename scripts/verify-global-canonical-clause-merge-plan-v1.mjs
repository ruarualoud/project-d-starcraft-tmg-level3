#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createGlobalCanonicalClauseMergePlanV1,
  verifyGlobalCanonicalClauseMergePlanV1,
} from "../packages/rule-atoms/global-canonical-clause-merge-plan-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const TARGET_BATCH_SIZE = 96;

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const denominator = (await report("core-clause-candidate-denominator-report.json")).denominator;
const coverageIndex = (await report("core-semantic-clause-coverage-index-report.json")).index;
const partLedgers = [
  (await report("part-2-semantic-clause-ledger-report.json")).ledger,
  (await report("part-3-semantic-clause-ledger-report.json")).ledger,
  (await report("part-4-semantic-clause-ledger-report.json")).ledger,
  (await report("part-5-semantic-clause-ledger-report.json")).ledger,
  (await report("part-6-semantic-clause-ledger-report.json")).ledger,
  (await report("part-7-semantic-clause-ledger-report.json")).ledger,
  (await report("part-8f-semantic-clause-batch-ledger-report.json")).merge.fullPartLedger,
  (await report("part-9c-semantic-clause-batch-ledger-report.json")).merge.fullPartLedger,
  (await report("part-10-semantic-clause-ledger-report.json")).ledger,
  (await report("part-11f-semantic-clause-batch-ledger-report.json")).merge.fullPartLedger,
  (await report("part-12-semantic-clause-ledger-report.json")).ledger,
];
const faqSupplemental = (await report(
  "official-faq-supplemental-clause-v3-report.json",
)).reconciliation;
const input = { denominator, coverageIndex, partLedgers, faqSupplemental, targetBatchSize: TARGET_BATCH_SIZE };
const plan = createGlobalCanonicalClauseMergePlanV1(input);
const audit = verifyGlobalCanonicalClauseMergePlanV1({ ...input, plan });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("plan_binds_complete_core_and_faq_dependencies", () => {
  assert.equal(plan.coreSemanticCoverageIndexHash, coverageIndex.coverageIndexHash);
  assert.equal(plan.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(plan.faqSupplementalReconciliationHash, faqSupplemental.reconciliationHash);
  assert.equal(plan.partLedgerHashes.length, 11);
});

check("combined_local_clause_denominator_is_exact", () => {
  assert.equal(audit.counts.localClauses, 1093);
  assert.equal(audit.counts.coreLocalClauses, 1090);
  assert.equal(audit.counts.faqLocalClauses, 3);
  assert.equal(audit.counts.duplicateLocalClauseIds, 0);
  assert.equal(audit.counts.unassignedLocalClauses, 0);
  assert.equal(audit.counts.duplicateBatchAssignments, 0);
});

check("combined_disposition_denominator_is_preserved", () => {
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 115,
    review_required: 978,
    quarantined: 0,
  });
});

check("high_confidence_duplicate_hints_are_complete_but_non_authoritative", () => {
  assert.equal(audit.counts.potentialMergeGroups, 14);
  assert.equal(audit.counts.potentialMergeClauseRefs, 28);
  assert.equal(audit.counts.uniquePotentialMergeClauses, 28);
  assert.deepEqual(audit.counts.groupsByEvidenceKind, {
    exact_source_hash_set: 9,
    normalized_review_title: 5,
  });
  assert.ok(plan.potentialMergeGroups.every((group) => group.autoMergeAllowed === false));
});

check("known_repeated_race_tag_source_is_a_review_group", () => {
  assert.ok(plan.potentialMergeGroups.some((group) => (
    group.evidenceKind === "exact_source_hash_set"
      && group.localClauseIds.includes("core:2.4.1:race-tags")
      && group.localClauseIds.includes("core:11:race-tag-set")
  )));
});

check("known_repeated_supply_title_is_a_review_group", () => {
  assert.ok(plan.potentialMergeGroups.some((group) => (
    group.evidenceKind === "normalized_review_title"
      && group.localClauseIds.includes("core:8.3.2:available-supply-formula")
      && group.localClauseIds.includes("core:11:available-supply-formula")
  )));
});

check("review_batches_partition_every_clause_without_an_eight_batch_cap", () => {
  assert.equal(plan.reviewBatches.length, 19);
  assert.equal(plan.reviewBatches[0].batchKind, "potential_merge_groups");
  assert.equal(plan.reviewBatches[0].localClauseIds.length, 28);
  assert.ok(plan.reviewBatches.length > 8);
  assert.ok(plan.reviewBatches.every((batch) => batch.localClauseIds.length > 0));
});

check("ordinary_core_batches_keep_each_remaining_anchor_together", () => {
  const batchByClause = new Map(plan.reviewBatches.flatMap((batch) => (
    batch.localClauseIds.map((clauseId) => [clauseId, batch.batchId])
  )));
  const potential = new Set(plan.reviewBatches[0].localClauseIds);
  for (const ledger of partLedgers) {
    const byAnchor = new Map();
    for (const clause of ledger.canonicalClauses) {
      if (potential.has(clause.clauseId)) continue;
      if (!byAnchor.has(clause.anchorId)) byAnchor.set(clause.anchorId, []);
      byAnchor.get(clause.anchorId).push(clause.clauseId);
    }
    for (const clauseIds of byAnchor.values()) {
      assert.equal(new Set(clauseIds.map((clauseId) => batchByClause.get(clauseId))).size, 1);
    }
  }
});

check("plan_contains_only_hashes_and_identifiers_not_rule_prose", () => {
  const serialized = JSON.stringify(plan);
  for (const forbidden of ["\"title\"", "\"text\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

check("plan_is_input_order_independent", () => {
  const reversed = [...partLedgers].reverse();
  assert.equal(createGlobalCanonicalClauseMergePlanV1({
    ...input,
    partLedgers: reversed,
  }).planHash, plan.planHash);
});

check("missing_or_tampered_corpus_fails_closed", () => {
  assert.throws(() => createGlobalCanonicalClauseMergePlanV1({
    ...input,
    partLedgers: partLedgers.slice(0, -1),
  }), /global_canonical_merge_part_ledger_set_mismatch/);
  const tamperedFaq = structuredClone(faqSupplemental);
  tamperedFaq.supplementalClauses[0].disposition = "review_required";
  assert.throws(() => createGlobalCanonicalClauseMergePlanV1({
    ...input,
    faqSupplemental: tamperedFaq,
  }), /global_canonical_merge_faq_hash_mismatch/);
});

check("batch_size_is_operational_and_validated", () => {
  assert.equal(plan.targetBatchSize, TARGET_BATCH_SIZE);
  assert.throws(() => createGlobalCanonicalClauseMergePlanV1({
    ...input,
    targetBatchSize: 0,
  }), /global_canonical_merge_target_batch_size_invalid/);
});

check("merge_plan_grants_no_canonical_rules_skill_or_training_authority", () => {
  assert.equal(plan.globalCanonicalClauseCount, null);
  assert.equal(plan.reviewStatus, "global_canonical_mapping_review_pending");
  assert.equal(plan.rulesEligible, false);
  assert.equal(plan.canAffectRules, false);
  assert.equal(plan.ctx2skillPromotionEligible, false);
  assert.equal(plan.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_merge_plan_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  plan,
  audit,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "pending_reviewed_global_mapping_rule_atoms_and_replay",
    promotions: [],
    blocks: plan.blocks,
    remainingRuleGaps: 1093,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-merge-plan-v1-report.json"),
  `${JSON.stringify(reportBody, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: reportBody.schema,
  acceptancePassed: reportBody.acceptancePassed,
  acceptanceTotal: reportBody.acceptanceTotal,
  failures,
  planHash: plan.planHash,
  counts: audit.counts,
  reviewBatchCount: plan.reviewBatches.length,
  globalCanonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
