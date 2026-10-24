#!/usr/bin/env node

// Saved 2000-point plan regression: the versioned reviewer must receive all
// component claims and accept more than the former six-finding ceiling.
// The injected deliberation makes no Provider call.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { reviewRosterFinalPlanV2 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";

const artifactPath = process.argv[2];
assert.ok(artifactPath, "saved claim-repair artifact required");
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const plan = artifact.plan;
assert.equal(plan.componentPurposes.length, 44);

let capturedRequest;
const review = await reviewRosterFinalPlanV2({ plan,
  sessionId: "ticket27-s272-comprehensive-review-saved-plan-probe",
  deliberation: { deliberate: async (request) => {
    capturedRequest = request;
    const sources = request.promptNodes.find((node) =>
      node.kind === "frozen-plan-claims")?.sources;
    const findings = sources.slice(0, 7).map((source) => ({
      claimPath: source.path,
      claimQuote: source.text.slice(0, 24),
      category: "other", severity: "medium",
      publicReason: "Concrete contract-capacity probe only.",
      correctionQuestion: "Can this cited claim be reviewed?",
    }));
    return { output: {
      schemaVersion: "starcraft_tmg_roster_final_plan_review_v2",
      roundKind: "final_plan_review", findings,
      publicSummary: "Seven cited findings retained for contract probe.",
    }, receipt: { receiptHash: "zero-provider-probe" } };
  } },
});

const sources = capturedRequest.promptNodes.find((node) =>
  node.kind === "frozen-plan-claims")?.sources;
assert.equal(sources.filter((source) => source.path.startsWith(
  "componentPurposes.")).length, 44);
assert.equal(new Set(sources.map((source) => source.path)).size,
  sources.length);
assert.equal(capturedRequest.responseFormat.schema.properties.findings
  .maxItems, 64);
assert.equal(review.findings.length, 7);
assert.equal(review.schema, "starcraft_tmg_roster_final_plan_review_v2");
assert.ok(!capturedRequest.userMessage.includes("at most six"));
process.stdout.write("COMPREHENSIVE_FINAL_REVIEW_V2_OK\n");
