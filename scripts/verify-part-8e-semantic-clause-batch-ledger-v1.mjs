#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8a-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8b-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8c-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8D_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8d-semantic-review-binding-v1.mjs";
import { OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1 } from "../content/official-part-8e-semantic-review-binding-v1.mjs";
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
const priorLedgers = [
  OFFICIAL_PART_8A_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8B_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8C_SEMANTIC_REVIEW_BINDING_V1,
  OFFICIAL_PART_8D_SEMANTIC_REVIEW_BINDING_V1,
].map((reviewedBinding) => createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding,
}));

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const ledger = createPartSemanticClauseBatchLedger({
  denominator,
  batchPlan,
  reviewedBinding: OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1,
});
const audit = verifyPartSemanticClauseBatchLedger({ denominator, batchPlan, ledger });
const mergeStatus = createPartSemanticFullMergeStatus({
  denominator,
  batchPlan,
  batchLedgers: [ledger, ...priorLedgers.toReversed()],
});

check("part_8e_is_pinned_to_current_official_evidence", () => {
  assert.equal(ledger.sourcePart, "8");
  assert.equal(ledger.batchId, "part-8e");
  assert.equal(ledger.reviewPacketHash, packet.packetHash);
  assert.equal(ledger.batchPlanHash, batchPlan.batchPlanHash);
  assert.equal(ledger.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
});

check("all_54_batch_candidates_are_classified_once", () => {
  assert.equal(audit.counts.sourceAnchors, 2);
  assert.equal(audit.counts.sourceCandidates, 54);
  assert.equal(audit.counts.classifiedCandidates, 54);
  assert.equal(audit.counts.unclassifiedCandidates, 0);
  assert.equal(audit.counts.duplicateCandidateAssignments, 0);
});

check("part_8e_has_36_reviewed_semantic_boundaries", () => {
  assert.equal(audit.counts.canonicalClauses, 36);
  assert.deepEqual(audit.counts.byDisposition, {
    executable: 0,
    display_only: 5,
    review_required: 31,
    quarantined: 0,
  });
});

check("combat_phase_rank_and_post_combat_boundaries_are_grouped", () => {
  const byId = new Map(ledger.canonicalClauses.map((clause) => [clause.clauseId, clause]));
  assert.deepEqual(byId.get("core:8.8:mandatory-combat-activation")?.candidateOrdinals, [4, 5]);
  assert.deepEqual(byId.get("core:8.8.1:close-ranks-leading-move")?.candidateOrdinals, [2, 3]);
  assert.deepEqual(byId.get("core:8.8.1:freed-unit-pass-state")?.candidateOrdinals, [32, 33]);
});

check("both_batch_anchors_are_clause_bearing", () => {
  assert.deepEqual(ledger.structuralContainerAnchorIds, []);
  assert.equal(audit.counts.clauseBearingAnchors, 2);
  assert.equal(audit.counts.structuralContainers, 0);
});

check("batch_ledger_contains_no_official_rule_prose", () => {
  const serialized = JSON.stringify(ledger);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("gaps_scope_drift_and_incomplete_merge_fail_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1);
  gap.clauses.splice(3, 1);
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: gap,
  }), /part_semantic_batch_candidate_coverage_invalid/);
  const scopeDrift = structuredClone(OFFICIAL_PART_8E_SEMANTIC_REVIEW_BINDING_V1);
  scopeDrift.anchorIds.reverse();
  assert.throws(() => createPartSemanticClauseBatchLedger({
    denominator,
    batchPlan,
    reviewedBinding: scopeDrift,
  }), /part_semantic_batch_binding_anchor_scope_mismatch/);
  assert.throws(() => mergePartSemanticBatchLedgers({
    denominator,
    batchPlan,
    batchLedgers: [...priorLedgers, ledger],
  }), /part_semantic_full_merge_incomplete/);
});

check("five_reviewed_batches_still_grant_no_global_rule_skill_or_training_authority", () => {
  assert.deepEqual(mergeStatus.reviewedBatchIds, [
    "part-8a", "part-8b", "part-8c", "part-8d", "part-8e",
  ]);
  assert.deepEqual(mergeStatus.pendingBatchIds, ["part-8f"]);
  assert.equal(mergeStatus.counts.reviewedCandidates, 385);
  assert.equal(mergeStatus.counts.pendingCandidates, 79);
  assert.equal(mergeStatus.counts.reviewedCanonicalClauses, 237);
  assert.equal(mergeStatus.fullPartLedgerHash, null);
  assert.equal(mergeStatus.globalCoverageEligible, false);
  assert.equal(ledger.rulesEligible, false);
  assert.equal(ledger.ctx2skillPromotionEligible, false);
  assert.equal(ledger.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_8e_semantic_clause_batch_ledger_verification_v1",
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
  path.join(OUTPUT_DIR, "part-8e-semantic-clause-batch-ledger-report.json"),
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
