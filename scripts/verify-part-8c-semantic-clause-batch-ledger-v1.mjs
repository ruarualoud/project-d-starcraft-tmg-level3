#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8a-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8b-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8c-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-8-semantic-batch-plan-v1.mjs";
import {
  createPartSemanticClauseBatchLedger,
  createPartSemanticFullMergeStatus,
  mergePartSemanticBatchLedgers,
  verifyPartSemanticClauseBatchLedger,
} from "../packages/rule-atoms/part-semantic-clause-batch-ledger-v1.mjs";
import { createPartSemanticBatchPlan } from "../packages/rule-atoms/part-semantic-review-batch-plan-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominator = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"),
  "utf8",
)).denominator;
const packet = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "part-8-semantic-review-packet.json"),
  "utf8",
));
const batchPlan = createPartSemanticBatchPlan({
  denominator,
  reviewedPlan: OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1,
});
const ledger8a = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1,
});
const ledger8b = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1,
});

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const ledger = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseBatchLedger({ denominator, batchPlan, ledger });
const mergeStatus = createPartSemanticFullMergeStatus({
  denominator,
  batchPlan,
  batchLedgers: [ledger, ledger8b, ledger8a],
});

check("part_8c_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "8");
  assert.equal(ledger.batchId, "part-8c");
  assert.equal(ledger.reviewPacketHash, packet.packetHash);
  assert.equal(ledger.batchPlanHash, batchPlan.batchPlanHash);
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
});

check("all_97_batch_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceAnchors, 5);
  assert.equal(audit.counts.sourceCandidates, 97);
  assert.equal(audit.counts.classifiedCandidates, 97);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_8c_has_54_reviewed_semantic_boundaries", () => {
  assert.equal(audit.counts.canonicalClauses, 54);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 6,
    review_required: 48,
    quarantined: 0,
  });
});

check("target_surge_and_casualty_boundaries_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:8.7.3:target-visible-range")?.candidateOrdinals, [10, 11]);
  assert.deepEqual(byId.get("core:8.7.4:surge-match-bypass")?.candidateOrdinals, [34, 35, 36]);
  assert.deepEqual(byId.get("core:8.7.4:casualty-removal-threshold")?.candidateOrdinals, [55, 56]);
});

check("structural_parent_is_accounted_without_a_fake_clause", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, ["core:numbered:8.7"]);
  assert.equal(audit.counts.clauseBearingAnchors, 4);
  assert.equal(audit.counts.structuralContainers, 1);
});

check("batch_ledger_contains_no_official_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("gaps_dependency_drift_and_incomplete_merge_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(2, 1);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: gap,
  }), /part_semantic_batch_candidate_coverage_invalid/);
  const drift = structuredClone(OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1);
  drift.reviewPacketHash = "0".repeat(64);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: drift,
  }), /part_semantic_batch_binding_dependency_mismatch/);
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan,
    batchLedgers: [ledger8a, ledger8b, ledger],
  }), /part_semantic_full_merge_incomplete/);
});

check("three_reviewed_batches_still_grant_no_global_rule_skill_or_training_authority", () => {
  assert.deepEqual(mergeStatus.reviewedBatchIds, ["part-8a", "part-8b", "part-8c"]);
  assert.deepEqual(mergeStatus.pendingBatchIds, ["part-8d", "part-8e", "part-8f"]);
  assert.equal(mergeStatus.counts.reviewedCandidates, 250);
  assert.equal(mergeStatus.counts.pendingCandidates, 214);
  assert.equal(mergeStatus.counts.reviewedCanonicalClauses, 154);
  assert.equal(mergeStatus.fullPartLedgerHash, null);
  assert.equal(mergeStatus.globalCoverageEligible, false);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_8c_semantic_clause_batch_ledger_verification_v1",
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
  path.join(OUTPUT_DIR, "part-8c-semantic-clause-batch-ledger-report.json"),
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
