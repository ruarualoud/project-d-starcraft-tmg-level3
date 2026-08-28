#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_11A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11a-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-11b-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_11_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-11-semantic-batch-plan-v1.mjs";
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
  path.join(OUTPUT_DIR, "part-11-semantic-review-packet.json"),
  "utf8",
));
const batchPlan = createPartSemanticBatchPlan({
  denominator,
  reviewedPlan: OFFICIAL_PART_11_SEMANTIC_BATCH_PLAN_V1,
});

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const part11aLedger = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_11A_SEMANTIC_REVIEW_BINDING_V1,
});
const ledger = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseBatchLedger({ denominator, batchPlan, ledger });
const mergeStatus = createPartSemanticFullMergeStatus({
  denominator,
  batchPlan,
  batchLedgers: [part11aLedger, ledger],
});

check("part_11b_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "11");
  assert.equal(ledger.batchId, "part-11b");
  assert.equal(ledger.reviewPacketHash, packet.packetHash);
  assert.equal(ledger.batchPlanHash, batchPlan.batchPlanHash);
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
});

check("all_43_batch_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceAnchors, 12);
  assert.equal(audit.counts.sourceCandidates, 43);
  assert.equal(audit.counts.classifiedCandidates, 43);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_11b_has_38_reviewed_semantic_boundaries", () => {
  assert.equal(audit.counts.canonicalClauses, 38);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 0,
    review_required: 38,
    quarantined: 0,
  });
});

check("critical_displacement_dodge_and_elevation_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:11:critical-hit-resolution")?.candidateOrdinals, [1, 2]);
  assert.deepEqual(byId.get("core:11:displacement-contact-resolution")?.candidateOrdinals,
    [2, 3]);
  assert.deepEqual(byId.get("core:11:dodge-surge-reduction")?.candidateOrdinals, [1, 2]);
  assert.deepEqual(byId.get("core:11:elevation-level-map")?.candidateOrdinals, [1, 2, 3]);
  assert.deepEqual(byId.get("core:11:engaged-terrain-block")?.candidateOrdinals, [3]);
});

check("all_twelve_batch_anchors_are_clause_bearing", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, []);
  assert.equal(audit.counts.clauseBearingAnchors, 12);
  assert.equal(audit.counts.structuralContainers, 0);
});

check("batch_ledger_contains_no_official_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("gaps_dependency_drift_and_incomplete_merge_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(2, 1);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: gap,
  }), /part_semantic_batch_candidate_coverage_invalid/);
  const drift = structuredClone(OFFICIAL_PART_11B_SEMANTIC_REVIEW_BINDING_V1);
  drift.reviewPacketHash = "0".repeat(64);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: drift,
  }), /part_semantic_batch_binding_dependency_mismatch/);
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan,
    batchLedgers: [part11aLedger, ledger],
  }), /part_semantic_full_merge_incomplete/);
});

check("two_reviewed_batches_grant_no_global_rule_skill_or_training_authority", () => {
  assert.deepEqual(mergeStatus.reviewedBatchIds, ["part-11a", "part-11b"]);
  assert.deepEqual(mergeStatus.pendingBatchIds,
    ["part-11c", "part-11d", "part-11e", "part-11f"]);
  assert.equal(mergeStatus.counts.reviewedCandidates, 94);
  assert.equal(mergeStatus.counts.pendingCandidates, 257);
  assert.equal(mergeStatus.counts.reviewedCanonicalClauses, 82);
  assert.equal(mergeStatus.fullPartLedgerHash, null);
  assert.equal(mergeStatus.globalCoverageEligible, false);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_11b_semantic_clause_batch_ledger_verification_v1",
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
  path.join(OUTPUT_DIR, "part-11b-semantic-clause-batch-ledger-report.json"),
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
