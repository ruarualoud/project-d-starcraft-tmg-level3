#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8a-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8b-semantic-review-binding-v1.mjs";
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
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const ledger8a = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1,
});
const ledger = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseBatchLedger({ denominator, batchPlan, ledger });
const mergeStatus = createPartSemanticFullMergeStatus({
  denominator,
  batchPlan,
  batchLedgers: [ledger, ledger8a],
});

check("part_8b_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "8");
  assert.equal(ledger.batchId, "part-8b");
  assert.equal(ledger.reviewPacketHash, reviewPacket.packetHash);
  assert.equal(ledger.batchPlanHash, batchPlan.batchPlanHash);
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
});

check("all_94_batch_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceAnchors, 9);
  assert.equal(audit.counts.sourceCandidates, 94);
  assert.equal(audit.counts.classifiedCandidates, 94);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_8b_has_59_reviewed_semantic_boundaries", () => {
  assert.equal(audit.counts.canonicalClauses, 59);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 6,
    review_required: 53,
    quarantined: 0,
  });
});

check("movement_disengage_and_reserve_lifecycles_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:8.5.3:grass-interaction")?.candidateOrdinals, [21, 22, 23]);
  assert.deepEqual(byId.get("core:8.5.4:leading-model-disengage-failure")?.candidateOrdinals, [6, 7]);
  assert.deepEqual(byId.get("core:8.5.5:reserve-timed-effects-continue")?.candidateOrdinals, [21, 22]);
  assert.deepEqual(byId.get("core:8.5.5:reserve-abilities-inactive")?.candidateOrdinals, [23, 24, 25]);
});

check("structural_parent_is_accounted_without_a_fake_clause", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, ["core:numbered:8.5"]);
  assert.equal(audit.counts.clauseBearingAnchors, 8);
  assert.equal(audit.counts.structuralContainers, 1);
});

check("batch_ledger_contains_no_official_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("gaps_scope_drift_and_incomplete_merge_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(1, 1);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: gap,
  }), /part_semantic_batch_candidate_coverage_invalid/);
  const scopeDrift = structuredClone(OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1);
  scopeDrift.anchorIds[1] = "core:numbered:8.4.2";
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: scopeDrift,
  }), /part_semantic_batch_binding_anchor_scope_mismatch/);
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan,
    batchLedgers: [ledger8a, ledger],
  }), /part_semantic_full_merge_incomplete/);
});

check("two_reviewed_batches_still_grant_no_global_rule_skill_or_training_authority", () => {
  assert.deepEqual(mergeStatus.reviewedBatchIds, ["part-8a", "part-8b"]);
  assert.deepEqual(mergeStatus.pendingBatchIds, [
    "part-8c", "part-8d", "part-8e", "part-8f",
  ]);
  assert.equal(mergeStatus.counts.reviewedCandidates, 153);
  assert.equal(mergeStatus.counts.pendingCandidates, 311);
  assert.equal(mergeStatus.counts.reviewedCanonicalClauses, 100);
  assert.equal(mergeStatus.fullPartLedgerHash, null);
  assert.equal(mergeStatus.globalCoverageEligible, false);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_8b_semantic_clause_batch_ledger_verification_v1",
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
  path.join(OUTPUT_DIR, "part-8b-semantic-clause-batch-ledger-report.json"),
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
