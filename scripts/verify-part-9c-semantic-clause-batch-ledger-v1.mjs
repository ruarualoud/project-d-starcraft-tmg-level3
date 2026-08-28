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
  path.join(OUTPUT_DIR, "part-9-semantic-review-packet.json"),
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
const part9Bindings = [
  OFFICIAL_PART_9A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_9B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_9C_SEMANTIC_REVIEW_BINDING_V1,
];
const part9 = createBatchMerge(OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1, part9Bindings);
const ledger = part9.batchLedgers.at(-1);
const audit = verifyPartSemanticClauseBatchLedger({
  denominator,
  batchPlan: part9.batchPlan,
  ledger,
});
const mergeStatus = createPartSemanticFullMergeStatus({
  denominator,
  batchPlan: part9.batchPlan,
  batchLedgers: part9.batchLedgers.toReversed(),
});
const partAudit = verifyPartSemanticClauseLedger({
  denominator,
  ledger: part9.merge.fullPartLedger,
});
const priorPartLedgers = [
  OFFICIAL_PART_2_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_3_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_4_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_5_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_6_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_7_SEMANTIC_REVIEW_BINDING_V1,
].map((reviewedBinding) => createPartSemanticClauseLedger({ denominator, reviewedBinding }));
const coverage = createCoreSemanticClauseCoverageIndex({
  denominator,
  ledgers: [
    ...priorPartLedgers,
    part8.merge.fullPartLedger,
    part9.merge.fullPartLedger,
  ],
});
const coverageAudit = verifyCoreSemanticClauseCoverageIndex({ denominator, index: coverage });

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("part_9c_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "9");
  assert.equal(ledger.batchId, "part-9c");
  assert.equal(ledger.reviewPacketHash, packet.packetHash);
  assert.equal(ledger.batchPlanHash, part9.batchPlan.batchPlanHash);
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
});

check("all_59_batch_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceAnchors, 3);
  assert.equal(audit.counts.sourceCandidates, 59);
  assert.equal(audit.counts.classifiedCandidates, 59);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_9c_has_45_reviewed_semantic_boundaries", () => {
  assert.equal(audit.counts.canonicalClauses, 45);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 6,
    review_required: 39,
    quarantined: 0,
  });
});

check("draft_marker_and_terrain_boundaries_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:9.2:draft-colour-choice")?.candidateOrdinals, [6, 7]);
  assert.deepEqual(byId.get("core:9.2:draft-control-choice")?.candidateOrdinals, [8, 9]);
  assert.deepEqual(byId.get("core:9.2:mission-selection")?.candidateOrdinals, [11, 12, 13]);
  assert.equal(byId.get("core:9.2:deployment-process-and-tip")?.disposition, "review_required");
  assert.deepEqual(byId.get("core:9.2:marker-affinity-map")?.candidateOrdinals, [20, 21, 22]);
  assert.deepEqual(byId.get("core:9.3:terrain-quadrant-distribution")?.candidateOrdinals,
    [22, 23, 24]);
});

check("all_three_batches_unlock_only_the_verified_full_part_merge", () => {
  assert.equal(mergeStatus.fullPartMergeEligible, true);
  assert.deepEqual(mergeStatus.pendingBatchIds, []);
  assert.equal(mergeStatus.counts.reviewedCandidates, 156);
  assert.equal(mergeStatus.counts.reviewedCanonicalClauses, 115);
  assert.match(part9.merge.fullPartLedgerHash, /^[a-f0-9]{64}$/u);
  assert.equal(part9.merge.fullPartLedgerHash, part9.merge.fullPartLedger.ledgerHash);
  assert.equal(part9.merge.globalCoverageEligible, true);
  assert.equal(part9.merge.rulesEligible, false);
  assert.equal(part9.merge.trainingTruth, false);
});

check("merged_part_9_ledger_covers_the_exact_full_part_denominator", () => {
  assert.equal(partAudit.counts.sourceAnchors, 15);
  assert.equal(partAudit.counts.clauseBearingAnchors, 15);
  assert.equal(partAudit.counts.structuralContainers, 0);
  assert.equal(partAudit.counts.sourceCandidates, 156);
  assert.equal(partAudit.counts.classifiedCandidates, 156);
  assert.equal(partAudit.counts.canonicalClauses, 115);
  assert.deepEqual(partAudit.counts.byDisposition, {
    executable: 0,
    display_only: 18,
    review_required: 97,
    quarantined: 0,
  });
});

check("complete_part_9_enters_global_coverage_without_granting_rule_authority", () => {
  assert.deepEqual(coverage.coveredSourceParts, ["2", "3", "4", "5", "6", "7", "8", "9"]);
  assert.deepEqual(coverage.uncoveredSourceParts, ["10", "11", "12"]);
  assert.equal(coverageAudit.counts.coveredSourceAnchors, 100);
  assert.equal(coverageAudit.counts.classifiedSourceCandidates, 1119);
  assert.equal(coverageAudit.counts.remainingSourceCandidates, 519);
  assert.equal(coverageAudit.counts.reviewedPartCanonicalClauses, 669);
  assert.deepEqual(coverageAudit.counts.byDisposition, {
    executable: 0,
    display_only: 107,
    review_required: 562,
    quarantined: 0,
  });
  assert.equal(coverage.globalCanonicalClauseCount, null);
  assert.equal(coverage.rulesEligible, false);
  assert.equal(coverage.ctx2skillPromotionEligible, false);
  assert.equal(coverage.trainingTruth, false);
});

check("gaps_tamper_and_partial_part_promotion_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_9C_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(1, 1);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan: part9.batchPlan,
    reviewedBinding: gap,
  }), /part_semantic_batch_candidate_coverage_invalid/);
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan: part9.batchPlan,
    batchLedgers: part9.batchLedgers.slice(0, -1),
  }), /part_semantic_full_merge_incomplete/);
  const tamper = structuredClone(part9.batchLedgers[0]);
  tamper.sourceCandidateCount += 1;
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan: part9.batchPlan,
    batchLedgers: [tamper, ...part9.batchLedgers.slice(1)],
  }), /part_semantic_batch_ledger_hash_mismatch/);
});

check("merged_and_global_artifacts_contain_no_official_rule_prose", () => {
  const serialized = JSON.stringify({ merge: part9.merge, coverage });
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_9c_semantic_clause_batch_ledger_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  ledger,
  audit,
  mergeStatus,
  merge: part9.merge,
  partAudit,
  coverage,
  coverageAudit,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "part-9c-semantic-clause-batch-ledger-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  batchLedgerHash: ledger.batchLedgerHash,
  fullPartLedgerHash: part9.merge.fullPartLedgerHash,
  coverageIndexHash: coverage.coverageIndexHash,
  batchCounts: audit.counts,
  partCounts: partAudit.counts,
  coverageCounts: coverageAudit.counts,
  uncoveredSourceParts: coverage.uncoveredSourceParts,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
