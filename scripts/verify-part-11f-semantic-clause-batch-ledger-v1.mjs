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
import {
  createCoreSemanticClauseCoverageIndex,
  verifyCoreSemanticClauseCoverageIndex,
} from "../packages/rule-atoms/core-semantic-clause-coverage-index-v1.mjs";
import {
  createPartSemanticClauseBatchLedger,
  createPartSemanticFullMergeStatus,
  mergePartSemanticBatchLedgers,
  verifyPartSemanticClauseBatchLedger,
} from "../packages/rule-atoms/part-semantic-clause-batch-ledger-v1.mjs";
import {
  createPartSemanticClauseLedger,
  verifyPartSemanticClauseLedger,
} from "../packages/rule-atoms/part-semantic-clause-ledger-v1.mjs";
import { createPartSemanticBatchPlan } from "../packages/rule-atoms/part-semantic-review-batch-plan-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"),
  "utf8",
)).denominator;
const packet = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "part-11-semantic-review-packet.json"),
  "utf8",
));

function createBatchMerge(reviewedPlan, bindings) {
  const batchPlan = createPartSemanticBatchPlan({ denominator, reviewedPlan });
  const batchLedgers = bindings.map((reviewedBinding) => (
    createPartSemanticClauseBatchLedger({ denominator, batchPlan, reviewedBinding })
  ));
  return {
    batchPlan,
    batchLedgers,
    merge: mergePartSemanticBatchLedgers({ denominator, batchPlan, batchLedgers }),
  };
}

const part8 = createBatchMerge(OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1, [
  OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8D_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8F_SEMANTIC_REVIEW_BINDING_V1,
]);
const part9 = createBatchMerge(OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1, [
  OFFICIAL_PART_9A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_9B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_9C_SEMANTIC_REVIEW_BINDING_V1,
]);
const part11Bindings = [
  OFFICIAL_PART_11A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11C_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11D_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11E_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_11F_SEMANTIC_REVIEW_BINDING_V1,
];
const part11 = createBatchMerge(OFFICIAL_PART_11_SEMANTIC_BATCH_PLAN_V1, part11Bindings);
const ledger = part11.batchLedgers.at(-1);
const audit = verifyPartSemanticClauseBatchLedger({
  denominator,
  batchPlan: part11.batchPlan,
  ledger,
});
const mergeStatus = createPartSemanticFullMergeStatus({
  denominator,
  batchPlan: part11.batchPlan,
  batchLedgers: part11.batchLedgers.toReversed(),
});
const partAudit = verifyPartSemanticClauseLedger({
  denominator,
  ledger: part11.merge.fullPartLedger,
});
const priorPartLedgers = [
  OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_3_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_4_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1,
].map((reviewedBinding) => createPartSemanticClauseLedger({ denominator, reviewedBinding }));
const part10Ledger = createPartSemanticClauseLedger({
  denominator,
  reviewedBinding: OFFICIAL_PART_10_SEMANTIC_REVIEW_BINDING_V1,
});
const coverage = createCoreSemanticClauseCoverageIndex({
  denominator,
  ledgers: [
    ...priorPartLedgers,
    part8.merge.fullPartLedger,
    part9.merge.fullPartLedger,
    part10Ledger,
    part11.merge.fullPartLedger,
  ],
});
const coverageAudit = verifyCoreSemanticClauseCoverageIndex({ denominator, index: coverage });

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("part_11f_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "11");
  assert.equal(ledger.batchId, "part-11f");
  assert.equal(ledger.reviewPacketHash, packet.packetHash);
  assert.equal(ledger.batchPlanHash, part11.batchPlan.batchPlanHash);
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
});

check("all_61_batch_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceAnchors, 13);
  assert.equal(audit.counts.sourceCandidates, 61);
  assert.equal(audit.counts.classifiedCandidates, 61);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_11f_has_50_reviewed_semantic_boundaries", () => {
  assert.equal(audit.counts.canonicalClauses, 50);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 0,
    review_required: 50,
    quarantined: 0,
  });
});

check("status_summon_supply_and_distance_groups_are_atomic", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:11:status-definition")?.candidateOrdinals, [1, 2]);
  assert.deepEqual(byId.get("core:11:status-mode-markers")?.candidateOrdinals, [4, 5]);
  assert.deepEqual(byId.get("core:11:status-mode-stay-in-play")?.candidateOrdinals, [6]);
  assert.deepEqual(byId.get("core:11:status-effect-markers")?.candidateOrdinals, [7, 8]);
  assert.deepEqual(byId.get("core:11:status-effect-stay-in-play")?.candidateOrdinals, [9]);
  assert.deepEqual(byId.get("core:11:summon-supply-limit")?.candidateOrdinals, [9, 10]);
  assert.deepEqual(byId.get("core:11:supply-value-casualty-update")?.candidateOrdinals,
    [3, 4]);
  assert.deepEqual(byId.get("core:11:zone-of-influence-arrival-restriction")
    ?.candidateOrdinals, [2, 3]);
});

check("all_six_batches_unlock_only_the_verified_full_part_merge", () => {
  assert.equal(mergeStatus.fullPartMergeEligible, true);
  assert.deepEqual(mergeStatus.pendingBatchIds, []);
  assert.equal(mergeStatus.counts.reviewedAnchors, 73);
  assert.equal(mergeStatus.counts.reviewedCandidates, 351);
  assert.equal(mergeStatus.counts.reviewedCanonicalClauses, 300);
  assert.match(part11.merge.fullPartLedgerHash, /^[a-f0-9]{64}$/u);
  assert.equal(part11.merge.fullPartLedgerHash, part11.merge.fullPartLedger.ledgerHash);
  assert.equal(part11.merge.globalCoverageEligible, true);
  assert.equal(part11.merge.rulesEligible, false);
  assert.equal(part11.merge.trainingTruth, false);
});

check("merged_part_11_ledger_covers_the_exact_full_part_denominator", () => {
  assert.equal(partAudit.counts.sourceAnchors, 73);
  assert.equal(partAudit.counts.clauseBearingAnchors, 73);
  assert.equal(partAudit.counts.structuralContainers, 0);
  assert.equal(partAudit.counts.sourceCandidates, 351);
  assert.equal(partAudit.counts.classifiedCandidates, 351);
  assert.equal(partAudit.counts.canonicalClauses, 300);
  assert.deepEqual(partAudit.counts.byDisposition, {
    executable: 0,
    display_only: 0,
    review_required: 300,
    quarantined: 0,
  });
});

check("complete_part_11_enters_global_coverage_without_granting_rule_authority", () => {
  assert.deepEqual(coverage.coveredSourceParts,
    ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  assert.deepEqual(coverage.uncoveredSourceParts, ["12"]);
  assert.equal(coverageAudit.counts.coveredSourceAnchors, 180);
  assert.equal(coverageAudit.counts.remainingSourceAnchors, 12);
  assert.equal(coverageAudit.counts.classifiedSourceCandidates, 1539);
  assert.equal(coverageAudit.counts.remainingSourceCandidates, 99);
  assert.equal(coverageAudit.counts.reviewedPartCanonicalClauses, 1023);
  assert.deepEqual(coverageAudit.counts.byDisposition, {
    executable: 0,
    display_only: 109,
    review_required: 914,
    quarantined: 0,
  });
  assert.equal(coverage.globalCanonicalClauseCount, null);
  assert.equal(coverage.rulesEligible, false);
  assert.equal(coverage.ctx2skillPromotionEligible, false);
  assert.equal(coverage.trainingTruth, false);
});

check("gaps_tamper_and_partial_part_promotion_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_11F_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(1, 1);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan: part11.batchPlan,
    reviewedBinding: gap,
  }), /part_semantic_batch_candidate_coverage_invalid/);
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan: part11.batchPlan,
    batchLedgers: part11.batchLedgers.slice(0, -1),
  }), /part_semantic_full_merge_incomplete/);
  const tamper = structuredClone(part11.batchLedgers[0]);
  tamper.sourceCandidateCount += 1;
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan: part11.batchPlan,
    batchLedgers: [tamper, ...part11.batchLedgers.slice(1)],
  }), /part_semantic_batch_ledger_hash_mismatch/);
});

check("merged_and_global_artifacts_contain_no_official_rule_prose", () => {
  const serialized = JSON.stringify({ merge: part11.merge, coverage });
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_11f_semantic_clause_batch_ledger_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  ledger,
  audit,
  mergeStatus,
  merge: part11.merge,
  partAudit,
  coverage,
  coverageAudit,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "part-11f-semantic-clause-batch-ledger-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  batchLedgerHash: ledger.batchLedgerHash,
  fullPartLedgerHash: part11.merge.fullPartLedgerHash,
  coverageIndexHash: coverage.coverageIndexHash,
  batchCounts: audit.counts,
  partCounts: partAudit.counts,
  coverageCounts: coverageAudit.counts,
  uncoveredSourceParts: coverage.uncoveredSourceParts,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
