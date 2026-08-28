#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-2-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_3_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-3-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_4_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-4-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-5-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-6-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-7-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8a-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8b-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8c-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8D_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8d-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8e-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8F_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8f-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-8-semantic-batch-plan-v1.mjs";
import { OFFICIAL_PART_9A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-9a-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_9B_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-9b-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_9C_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-9c-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-9-semantic-batch-plan-v1.mjs";
import { OFFICIAL_PART_10_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-10-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11a-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11b-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11C_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11c-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11D_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11d-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11E_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11e-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11F_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11f-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-11-semantic-batch-plan-v1.mjs";
import { OFFICIAL_PART_12_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-12-semantic-review-binding-v1.mjs";
import {
  createCoreSemanticClauseCoverageIndex,
  verifyCoreSemanticClauseCoverageIndex,
} from "../packages/rule-atoms/core-semantic-clause-coverage-index-v1.mjs";
import {
  createPartSemanticClauseBatchLedger,
  mergePartSemanticBatchLedgers,
} from "../packages/rule-atoms/part-semantic-clause-batch-ledger-v1.mjs";
import { createPartSemanticClauseLedger } from "../packages/rule-atoms/part-semantic-clause-ledger-v1.mjs";
import { createPartSemanticBatchPlan } from "../packages/rule-atoms/part-semantic-review-batch-plan-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"),
  "utf8",
)).denominator;
const priorPartLedgers = [
  OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_3_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_4_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1,
].map((reviewedBinding) => createPartSemanticClauseLedger({ denominator, reviewedBinding }));
function createBatchMerge(reviewedPlan, bindings) {
  const batchPlan = createPartSemanticBatchPlan({ denominator, reviewedPlan });
  const batchLedgers = bindings.map((reviewedBinding) => (
    createPartSemanticClauseBatchLedger({ denominator, batchPlan, reviewedBinding })
  ));
  return mergePartSemanticBatchLedgers({ denominator, batchPlan, batchLedgers });
}

const part8Merge = createBatchMerge(OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1, [
  OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8D_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8F_SEMANTIC_REVIEW_BINDING_V1,
]);
const part9Merge = createBatchMerge(OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1, [
  OFFICIAL_PART_9A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_9B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_9C_SEMANTIC_REVIEW_BINDING_V1,
]);
const part10Ledger = createPartSemanticClauseLedger({
  denominator,
  reviewedBinding: OFFICIAL_PART_10_SEMANTIC_REVIEW_BINDING_V1,
});
const part11Merge = createBatchMerge(OFFICIAL_PART_11_SEMANTIC_BATCH_PLAN_V1, [
  OFFICIAL_PART_11A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11C_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11D_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11E_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11F_SEMANTIC_REVIEW_BINDING_V1,
]);
const part12Ledger = createPartSemanticClauseLedger({
  denominator,
  reviewedBinding: OFFICIAL_PART_12_SEMANTIC_REVIEW_BINDING_V1,
});
const ledgers = [
  ...priorPartLedgers,
  part8Merge.fullPartLedger,
  part9Merge.fullPartLedger,
  part10Ledger,
  part11Merge.fullPartLedger,
  part12Ledger,
];

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const index = createCoreSemanticClauseCoverageIndex({ denominator, ledgers });
const audit = verifyCoreSemanticClauseCoverageIndex({ denominator, index });

check("coverage_index_is_exactly_source_pinned", () => {
  assert.equal(index.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(index.sourceContentHash, denominator.sourceSnapshot.contentHash);
  assert.match(index.coverageIndexHash, /^[a-f0-9]{64}$/u);
});

check("parts_2_through_12_are_covered_in_source_order", () => {
  assert.deepEqual(index.coveredSourceParts,
    ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  assert.deepEqual(index.partLedgers.map((entry) => entry.ledgerHash), [
    "175b2768adf96b97d24d0451a2ddeef5d092246adfb93d32e291059b0041e3fa",
    "d3ee04980fd186b98563d7ab277f46209893f0e3fc0988e22d889a25dc113bd3",
    "edcb189dbfb35fd9261825dc18eb6b3b6c420e220551466b6dd688b0e351905b",
    "bb3c7fce07ebf452ca5117d9e89b07e2c95d8636c3b4d4743ce5ac1934e561ce",
    "957b948b329eb4c2f56b0beff21a36baae7b749e5b92ad1ff11aa0ed56051745",
    "31f7701dbec939bcb16a529aba2ff4e892ac60fd314462f62d708ac3e3853972",
    "962bd34a27a7299616b8e76f8b359c442c91aea4220ee20e461eff4f465f686b",
    "82863e7da00f6475602fa6cc4f1cdb5280226a840fb3fccc494bbc79251e62e0",
    "a2e5163192a96a086ab112287b1038c953c87ba97a0a63c81719b3374cb5d93e",
    "f274940689d2d02ccf2ae4d0b0d7d51e07c65389a3a264eedea1d59aa64f69b9",
    "5a456480ca1600ae79ec80b7472bed6d8539e2e3a70d3542a6bb3731c67a9b99",
  ]);
});

check("combined_candidate_coverage_is_exact", () => {
  assert.equal(audit.counts.totalSourceCandidates, 1638);
  assert.equal(audit.counts.classifiedSourceCandidates, 1638);
  assert.equal(audit.counts.remainingSourceCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
  assert.equal(audit.counts.outOfDenominatorAssignments, 0);
});

check("combined_anchor_coverage_is_exact", () => {
  assert.equal(audit.counts.totalSourceAnchors, 192);
  assert.equal(audit.counts.coveredSourceAnchors, 192);
  assert.equal(audit.counts.remainingSourceAnchors, 0);
  assert.equal(audit.counts.coveredStructuralContainers, 4);
});

check("local_canonical_counts_do_not_become_global_count", () => {
  assert.equal(audit.counts.reviewedPartCanonicalClauses, 1090);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 114,
    review_required: 976,
    quarantined: 0,
  });
  assert.equal(index.globalCanonicalClauseCount, null);
});

check("all_unreviewed_parts_are_explicit", () => {
  assert.deepEqual(index.uncoveredSourceParts, []);
  assert.equal(index.coverageStatus, "all_part_boundaries_reviewed_global_merge_pending");
  assert.equal(index.blocks.includes("uncovered_core_source_parts"), false);
});

check("duplicate_part_ledger_fails_closed", () => {
  assert.throws(() => createCoreSemanticClauseCoverageIndex({
    denominator,
    ledgers: [ledgers[0], ...ledgers],
  }), /core_semantic_duplicate_part_ledger/);
});

check("ledger_or_index_tamper_fails_closed", () => {
  const ledgerTamper = structuredClone(ledgers[0]);
  ledgerTamper.sourceCandidateCount += 1;
  assert.throws(() => createCoreSemanticClauseCoverageIndex({
    denominator,
    ledgers: [ledgerTamper, ...ledgers.slice(1)],
  }), /part_semantic_ledger_hash_mismatch/);
  const indexTamper = structuredClone(index);
  indexTamper.partLedgers[0].canonicalClauseCount += 1;
  assert.throws(() => verifyCoreSemanticClauseCoverageIndex({ denominator, index: indexTamper }),
    /core_semantic_coverage_index_hash_mismatch/);
});

check("coverage_index_embeds_no_rule_text", () => {
  const serialized = JSON.stringify(index);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
  assert.equal(serialized.includes("standard six-sided dice"), false);
});

check("global_authority_skill_and_training_remain_blocked", () => {
  assert.equal(index.rulesEligible, false);
  assert.equal(index.canAffectRules, false);
  assert.equal(index.ctx2skillPromotionEligible, false);
  assert.equal(index.trainingTruth, false);
  assert.equal(index.blocks.includes("uncovered_core_source_parts"), false);
  assert.ok(index.blocks.includes("faq_exact_candidate_clause_reconciliation_pending"));
  assert.ok(index.blocks.includes("rule_atom_mapping_pending"));
  assert.ok(index.blocks.includes("judge_and_replay_evidence_pending"));
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_core_semantic_clause_coverage_index_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  index,
  audit,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "core-semantic-clause-coverage-index-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  coverageIndexHash: index.coverageIndexHash,
  coveredSourceParts: index.coveredSourceParts,
  uncoveredSourceParts: index.uncoveredSourceParts,
  counts: audit.counts,
  globalCanonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
