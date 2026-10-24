#!/usr/bin/env node

// Concrete saved-draft regression: the selected Rules map-route receipt must
// reach the independent final Teach review, not just the earlier comparison.
// No Provider call is made; the injected port captures the request.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { reviewRosterFinalPlanV1 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";

const draftPath = process.argv[2];
assert.ok(draftPath, "saved draft path required");
const draft = JSON.parse(readFileSync(draftPath, "utf8"));
const plan = JSON.parse(draft.planSerialized);
const selectedCandidateInputHash = hashStarcraftTmgContract(
  draft.selectedCandidateInput);
const selectedRoute = draft.toolReceipts.find((receipt) => (
  receipt.queryKind === "evaluate_roster_route"
    && receipt.candidateInputHash === selectedCandidateInputHash
    && receipt.sideId === plan.sideKey));
assert.ok(selectedRoute, "saved draft must contain selected route audit");
assert.ok(plan.toolReceiptReferences.some((reference) => (
  reference.receiptHash === selectedRoute.receiptHash)));

let request = null;
try {
  await reviewRosterFinalPlanV1({ plan, sessionId: draft.sessionId,
    toolReceipts: draft.toolReceipts, selectedCandidateInputHash,
    deliberation: { deliberate: async (value) => {
      request = value;
      throw new Error("CAPTURED_REVIEW_REQUEST");
    } },
  });
} catch (error) {
  if (error.message !== "CAPTURED_REVIEW_REQUEST") throw error;
}
assert.ok(request, "final review request was not built");
const facts = request.promptNodes.find((node) => (
  node.kind === "verified-structured-facts"))?.sourceFacts;
assert.equal(facts?.selectedMapRouteEvidence?.receiptHash,
  selectedRoute.receiptHash);
assert.equal(facts.selectedMapRouteEvidence.exactMoveOrDeploymentLegality,
  false);
assert.equal(facts.selectedMapRouteEvidence.units.length,
  plan.rosterCandidate.units.length);
assert.ok(facts.selectedMapRouteEvidence.units.every((unit) => (
  Number.isSafeInteger(unit.firstArrivalRound)
    && Array.isArray(unit.objectiveAccess))));
process.stdout.write("FINAL_REVIEW_SELECTED_MAP_ROUTE_CONTEXT_OK\n");
