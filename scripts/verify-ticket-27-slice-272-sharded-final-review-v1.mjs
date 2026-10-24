#!/usr/bin/env node

// Concrete regression: a fresh 44-component Teach plan made the single
// comprehensive review return Provider `status=incomplete`. No paid call here.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewRosterFinalPlanV3 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";

const draftPath = process.argv[2];
assert.ok(draftPath, "saved fresh Teach draft required");
const draft = JSON.parse(readFileSync(draftPath, "utf8"));
const plan = JSON.parse(draft.planSerialized);
assert.equal(plan.componentPurposes.length, 44);
const targetPaths = new Set();
let callCount = 0;
const review = await reviewRosterFinalPlanV3({
  plan, sessionId: "ticket27-s272-sharded-review-regression",
  toolReceipts: draft.toolReceipts,
  deliberation: { deliberate: async (request) => {
    callCount += 1;
    const sources = request.promptNodes.find((node) =>
      node.kind === "frozen-plan-claims")?.sources;
    const reference = request.promptNodes.find((node) =>
      node.kind === "frozen-plan-cross-claim-index")?.sources;
    assert.ok(sources.length > 0 && sources.length <= 8);
    assert.equal(reference.length, 51);
    assert.match(request.userMessage,
      /High requires a materially false rule, timing, unit, scoring or legality assertion/);
    assert.match(request.userMessage,
      /An omitted risk, unmentioned alternative, conditional intent, or missing caution is at most Medium/);
    for (const source of sources) {
      assert.ok(!targetPaths.has(source.path));
      targetPaths.add(source.path);
    }
    return { output: {
      schemaVersion: "starcraft_tmg_roster_final_plan_review_shard_v1",
      roundKind: "final_plan_review",
      findings: (callCount === 1
        ? Array.from({ length: 26 }, (_, index) =>
          sources[index % sources.length]) : sources).map((source) => ({
        claimPath: source.path, claimQuote: source.text.slice(0, 24),
        category: "other", severity: "medium",
        publicReason: "Bounded source-coverage probe only.",
        correctionQuestion: "Is this exact claim supportable?",
      })),
      publicSummary: "Bounded cited review probe.",
      reviewedClaimPaths: sources.map((source) => source.path),
      hasUnreportedMaterialFindings: false,
    }, receipt: { receiptHash: `no-provider-shard-${callCount}` } };
  } },
});
assert.equal(callCount, 7);
assert.equal(targetPaths.size, 51);
assert.equal(review.reviewedClaimCount, 51);
assert.equal(review.shardCount, 7);
assert.ok(review.findings.length >= 51);
assert.equal(review.capacityOverflowAccepted, 2);
assert.equal(review.trainingTruth, false);
process.stdout.write("SHARDED_FINAL_REVIEW_V1_OK\n");
