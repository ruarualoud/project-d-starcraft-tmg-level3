#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-9-semantic-batch-plan-v1.mjs";
import {
  createPartSemanticBatchPlan,
  verifyPartSemanticBatchPlan,
} from "../packages/rule-atoms/part-semantic-review-batch-plan-v1.mjs";

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

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const plan = createPartSemanticBatchPlan({
  denominator,
  reviewedPlan: OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1,
});
const audit = verifyPartSemanticBatchPlan({ denominator, plan });

check("part_9_batch_plan_is_source_pinned", () => {
  assert.equal(plan.sourcePart, "9");
  assert.equal(plan.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(plan.reviewPacketHash, packet.packetHash);
  assert.match(plan.batchPlanHash, /^[a-f0-9]{64}$/u);
});

check("three_batches_partition_all_15_anchors", () => {
  assert.equal(plan.batches.length, 3);
  assert.equal(audit.counts.sourceAnchors, 15);
  assert.equal(audit.counts.assignedAnchors, 15);
  assert.equal(audit.counts.unassignedAnchors, 0);
  assert.equal(audit.counts.duplicateAnchorAssignments, 0);
});

check("batch_candidate_denominators_are_fixed", () => {
  assert.deepEqual(plan.batches.map((batch) => batch.candidateCount), [32, 65, 59]);
  assert.equal(audit.counts.sourceCandidates, 156);
  assert.equal(audit.counts.assignedCandidates, 156);
});

check("part_9_has_no_structural_only_anchor", () => {
  assert.deepEqual(plan.batches.flatMap((batch) => batch.structuralContainerAnchorIds), []);
});

check("gap_overlap_or_dependency_drift_fails_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1);
  gap.batches[0].anchorIds.pop();
  assert.throws(() => createPartSemanticBatchPlan({ denominator, reviewedPlan: gap }),
    /part_semantic_batch_anchor_partition_invalid/);
  const overlap = structuredClone(OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1);
  overlap.batches[1].anchorIds.push(overlap.batches[0].anchorIds[0]);
  assert.throws(() => createPartSemanticBatchPlan({ denominator, reviewedPlan: overlap }),
    /part_semantic_batch_anchor_partition_invalid/);
  const drift = structuredClone(OFFICIAL_PART_9_SEMANTIC_BATCH_PLAN_V1);
  drift.coreClauseCandidateDenominatorHash = "0".repeat(64);
  assert.throws(() => createPartSemanticBatchPlan({ denominator, reviewedPlan: drift }),
    /part_semantic_batch_plan_dependency_mismatch/);
});

check("batch_plan_cannot_enter_rules_skill_or_training", () => {
  assert.equal(plan.fullPartLedgerHash, null);
  assert.equal(plan.globalCoverageEligible, false);
  assert.equal(plan.rulesEligible, false);
  assert.equal(plan.ctx2skillPromotionEligible, false);
  assert.equal(plan.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_part_9_semantic_batch_plan_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  plan,
  audit,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "part-9-semantic-batch-plan-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  batchPlanHash: plan.batchPlanHash,
  batches: plan.batches.map(({ batchId, anchorCount, candidateCount }) => ({
    batchId,
    anchorCount,
    candidateCount,
  })),
  counts: audit.counts,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
