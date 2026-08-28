#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1 } from "../content/official-part-8-semantic-batch-plan-v1.mjs";
import { createPartSemanticBatchPlan, verifyPartSemanticBatchPlan } from "../packages/rule-atoms/part-semantic-review-batch-plan-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const denominator = JSON.parse(await readFile(path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"), "utf8")).denominator;
const packet = JSON.parse(await readFile(path.join(OUTPUT_DIR, "part-8-semantic-review-packet.json"), "utf8"));

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const plan = createPartSemanticBatchPlan({ denominator, reviewedPlan: OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1 });
const audit = verifyPartSemanticBatchPlan({ denominator, plan });

check("part_8_batch_plan_is_source_pinned", () => {
  assert.equal(plan.sourcePart, "8");
  assert.equal(plan.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(plan.reviewPacketHash, packet.packetHash);
  assert.match(plan.batchPlanHash, /^[a-f0-9]{64}$/u);
});
check("six_batches_partition_all_38_anchors", () => {
  assert.equal(plan.batches.length, 6);
  assert.equal(audit.counts.sourceAnchors, 38);
  assert.equal(audit.counts.assignedAnchors, 38);
  assert.equal(audit.counts.unassignedAnchors, 0);
  assert.equal(audit.counts.duplicateAnchorAssignments, 0);
});
check("batch_candidate_denominators_are_fixed", () => {
  assert.deepEqual(plan.batches.map((batch) => batch.candidateCount), [59, 94, 97, 81, 54, 79]);
  assert.equal(audit.counts.sourceCandidates, 464);
  assert.equal(audit.counts.assignedCandidates, 464);
});
check("structural_parents_stay_with_their_rule_families", () => {
  assert.deepEqual(plan.batches.find((batch) => batch.batchId === "part-8b")?.structuralContainerAnchorIds, ["core:numbered:8.5"]);
  assert.deepEqual(plan.batches.find((batch) => batch.batchId === "part-8c")?.structuralContainerAnchorIds, ["core:numbered:8.7"]);
});
check("gap_overlap_or_dependency_drift_fails_closed", () => {
  const gap = structuredClone(OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1);
  gap.batches[0].anchorIds.pop();
  assert.throws(() => createPartSemanticBatchPlan({ denominator, reviewedPlan: gap }), /part_semantic_batch_anchor_partition_invalid/);
  const overlap = structuredClone(OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1);
  overlap.batches[1].anchorIds.push(overlap.batches[0].anchorIds[0]);
  assert.throws(() => createPartSemanticBatchPlan({ denominator, reviewedPlan: overlap }), /part_semantic_batch_anchor_partition_invalid/);
  const drift = structuredClone(OFFICIAL_PART_8_SEMANTIC_BATCH_PLAN_V1);
  drift.coreClauseCandidateDenominatorHash = "0".repeat(64);
  assert.throws(() => createPartSemanticBatchPlan({ denominator, reviewedPlan: drift }), /part_semantic_batch_plan_dependency_mismatch/);
});
check("batch_plan_cannot_enter_global_coverage_or_promotion", () => {
  assert.equal(plan.fullPartLedgerHash, null);
  assert.equal(plan.globalCoverageEligible, false);
  assert.equal(plan.rulesEligible, false);
  assert.equal(plan.ctx2skillPromotionEligible, false);
  assert.equal(plan.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = { schema: "starcraft_tmg_part_8_semantic_batch_plan_verification_v1", generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length - failures.length, acceptanceTotal: acceptance.length, acceptance, failures, plan, audit, rulesTruth: false, trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "part-8-semantic-batch-plan-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema, acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal, failures, batchPlanHash: plan.batchPlanHash, batches: plan.batches.map(({ batchId, anchorCount, candidateCount }) => ({ batchId, anchorCount, candidateCount })), counts: audit.counts, rulesTruth: false, trainingTruth: false }, null, 2));
if (failures.length > 0) process.exitCode = 1;
