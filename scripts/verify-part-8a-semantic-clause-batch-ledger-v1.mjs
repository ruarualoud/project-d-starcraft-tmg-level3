#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8a-semantic-review-binding-v1.mjs";
import { createCoreSemanticClauseCoverageIndex } from "../packages/rule-atoms/core-semantic-clause-coverage-index-v1.mjs";
import {
  createPartSemanticClauseBatchLedger,
  createPartSemanticFullMergeStatus,
  mergePartSemanticBatchLedgers,
  verifyPartSemanticClauseBatchLedger,
} from "../packages/rule-atoms/part-semantic-clause-batch-ledger-v1.mjs";
import { createPartSemanticBatchPlan } from "../packages/rule-atoms/part-semantic-review-batch-plan-v1.mjs";
import { OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-8-semantic-batch-plan-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"),
  "utf8",
)).denominator;
const reviewPacket = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "part-8-semantic-review-packet.json"),
  "utf8",
));
const batchPlan = createPartSemanticBatchPlan({
  denominator,
  reviewedPlan: OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1,
});

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const ledger = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseBatchLedger({ denominator, batchPlan, ledger });
const mergeStatus = createPartSemanticFullMergeStatus({
  denominator,
  batchPlan,
  batchLedgers: [ledger],
});

check("part_8a_is_pinned_to_the_current_official_packet_and_batch_plan", () => {
  assert.equal(ledger.sourcePart, "8");
  assert.equal(ledger.batchId, "part-8a");
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
  assert.equal(ledger.batchPlanHash, batchPlan.batchPlanHash);
});

check("all_59_batch_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceAnchors, 11);
  assert.equal(audit.counts.sourceCandidates, 59);
  assert.equal(audit.counts.classifiedCandidates, 59);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_8a_has_41_reviewed_semantic_boundaries", () => {
  assert.equal(audit.counts.canonicalClauses, 41);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 9,
    review_required: 32,
    quarantined: 0,
  });
});

check("important_multi_candidate_boundaries_remain_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:8.2.1:pass-lockout-and-completion")?.candidateOrdinals, [4, 5]);
  assert.deepEqual(byId.get("core:8.3.1:final-round-unlimited-supply")?.candidateOrdinals, [5, 6]);
  assert.deepEqual(byId.get("core:8.4:start-effect-order")?.candidateOrdinals, [5, 6, 7]);
});

check("batch_ledger_contains_no_official_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("coverage_gap_overlap_and_dependency_drift_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(0, 1);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: gap,
  }), /part_semantic_batch_candidate_coverage_invalid/);

  const overlap = structuredClone(OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1);
  overlap.clauses[1].candidateOrdinalStart = overlap.clauses[0].candidateOrdinalStart;
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: overlap,
  }), /part_semantic_batch_candidate_coverage_invalid/);

  const drift = structuredClone(OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1);
  drift.batchPlanHash = "0".repeat(64);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: drift,
  }), /part_semantic_batch_binding_dependency_mismatch/);
});

check("partial_batch_cannot_enter_full_part_or_global_coverage", () => {
  assert.deepEqual(mergeStatus.reviewedBatchIds, ["part-8a"]);
  assert.deepEqual(mergeStatus.pendingBatchIds, [
    "part-8b", "part-8c", "part-8d", "part-8e", "part-8f",
  ]);
  assert.equal(mergeStatus.counts.reviewedCandidates, 59);
  assert.equal(mergeStatus.counts.pendingCandidates, 405);
  assert.equal(mergeStatus.fullPartLedgerHash, null);
  assert.equal(mergeStatus.globalCoverageEligible, false);
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan,
    batchLedgers: [ledger],
  }), /part_semantic_full_merge_incomplete/);
  assert.throws(() => createCoreSemanticClauseCoverageIndex({
    denominator,
    ledgers: [ledger],
  }), /part_semantic_ledger_schema_invalid/);
});

check("rule_skill_and_training_authority_stay_blocked", () => {
  assert.equal(ledger.fullPartLedgerEligible, false);
  assert.equal(ledger.globalCoverageEligible, false);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.canAffectRules, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_8a_semantic_clause_batch_ledger_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  ledger,
  audit,
  mergeStatus,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "part-8a-semantic-clause-batch-ledger-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  batchLedgerHash: ledger.batchLedgerHash,
  counts: audit.counts,
  mergeStatus,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
