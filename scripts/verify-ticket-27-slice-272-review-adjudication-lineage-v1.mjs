#!/usr/bin/env node

// Saved fresh-2000 failure: V2's three High findings are quoted but omit
// qualifying source text, and the Room currently caps a valid four-revision
// plan at three. No Provider or Room mutation occurs in this verifier.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterFinalPlanReviewAdjudicationV1,
  verifyRosterFinalPlanReviewAdjudicationV1 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { verifyAgentScheduledRosterPlanRevisionLineageV1 } from
  "../packages/roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const base = "build/ticket-27-slice-272-iterative-live-v1/"
  + "agent-selected-teach-f1047bc9848e12ef-";
const cycle = `${base}cycle-component-purpose-20260929-`;
const read = (name) => JSON.parse(readFileSync(name, "utf8"));
const plans = [
  read(`${base}claim-repair-v1.json`).plan,
  read(`${base}claim-repair-v2.json`).plan,
  read(`${cycle}claim-repair-v1.json`).plan,
  read(`${cycle}claim-repair-v2.json`).plan,
];
const plan = plans.at(-1);
const sourceReview = read(`${cycle}revised-review-v2.json`);
const high = sourceReview.findings.map((finding, index) =>
  ({ finding, index })).filter(({ finding }) =>
    finding.severity === "high");
assert.equal(high.length, 3);
assert.equal(plan.revisions.length, 4);

const decisions = [
  { findingIndex: high[0].index,
    findingHash: hashStarcraftTmgContract(high[0].finding),
    effectiveSeverity: "medium",
    publicReason: "The same plan makes the opening placement conditional "
      + "on actual board geometry, not a verified exact move.",
    counterEvidence: [{ claimPath: "deploymentConcept.deploymentConceptText",
      claimQuote: "Every route length above is a certified base-access "
        + "witness, not an exact move or formation proof, so treat each "
        + "arrival-round marker claim as conditional on the actual board "
        + "and re-check before committing." }] },
  { findingIndex: high[1].index,
    findingHash: hashStarcraftTmgContract(high[1].finding),
    effectiveSeverity: "medium",
    publicReason: "Loss of the holder can explicitly concede the marker; "
      + "the plan never promises a replacement body.",
    counterEvidence: [{ claimPath: "deploymentConcept.reinforcementPolicyText",
      claimQuote: "the marker it was meant to hold must be covered by an "
        + "already-arrived unit or conceded for that round." }] },
  { findingIndex: high[2].index,
    findingHash: hashStarcraftTmgContract(high[2].finding),
    effectiveSeverity: "medium",
    publicReason: "The Marine purpose starts in round three; the earlier "
      + "Goliath screen is conditional and explicitly absent when contested.",
    counterEvidence: [{ claimPath: "deploymentConcept.reinforcementPolicyText",
      claimQuote: "if the temple axis is contested, the marker-1 pair "
        + "fights from the marker itself and no separate rear screen is "
        + "claimed for that round." }] },
];
const adjudicated = createRosterFinalPlanReviewAdjudicationV1({
  plan, review: sourceReview, decisions,
});
assert.equal(adjudicated.findings.filter((finding) =>
  finding.severity === "high").length, 3);
const resolution = verifyRosterFinalPlanReviewAdjudicationV1({
  plan, review: adjudicated,
});
assert.equal(resolution.unresolvedHighCount, 0);
assert.equal(resolution.reclassifiedMediumCount, 3);
assert.equal(adjudicated.reviewAdjudication.parentReviewHash,
  sourceReview.reviewHash);
assert.throws(() => createRosterFinalPlanReviewAdjudicationV1({
  plan, review: sourceReview,
  decisions: [{ ...decisions[0], counterEvidence: [{
    claimPath: "deploymentConcept.deploymentConceptText",
    claimQuote: "invented qualifier",
  }] }, ...decisions.slice(1)],
}), /ROSTER_FINAL_REVIEW_ADJUDICATION_INVALID/u);

const lineage = verifyAgentScheduledRosterPlanRevisionLineageV1({
  initialPlanHash: plans[0].revisions[0].previousPlanHash,
  initialPlanVersion: 1,
  intermediatePlans: plans.slice(0, -1),
  finalPlan: plan,
});
assert.equal(lineage.revisionCount, 4);
assert.throws(() => verifyAgentScheduledRosterPlanRevisionLineageV1({
  initialPlanHash: plans[0].revisions[0].previousPlanHash,
  initialPlanVersion: 1,
  intermediatePlans: [plans[0], plans[2]],
  finalPlan: plan,
}), /AGENT_SCHEDULED_REVISION_LINEAGE_INVALID/u);

// The exact product admission path must pass review/lineage and reach its
// read-only Room boundary. A deliberately absent Room proves no mutation.
const root = path.resolve(import.meta.dirname, "..");
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root, overrideRoot: process.env.TICKET27_S271_FIXTURE_ROOT || null,
});
const product = await createRosterPlanningProductModuleV1({
  root, fixtureRoot,
  dataDirectory: path.join(root, "build/ticket-27-slice-272-iterative-live-v1"),
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  enableIterativeDraft: true,
  deliberationFactory: { createForRun: async () => {
    throw new Error("FOCUSED_ROOM_ADMISSION_MUST_NOT_CALL_PROVIDER");
  } },
});
const iterativeSessionId = "iterative-standard-2000-fresh-b-v1";
const teachSessionId = "agent-selected-teach-standard-2000-fresh-b-v2";
const handoff = await product.iterativeDraft.prepareTeachHandoff(
  iterativeSessionId);
const scope = { gameId: "starcraft-tmg", roomId: "admission-probe",
  matchBindingHash: "0".repeat(64), seatKey: "player1" };
let roomReads = 0;
const roomRuntime = { readRoom: async () => {
  roomReads += 1;
  return { ok: false };
} };
const input = { iterativeSessionId, teachSessionId, plan,
  finalReview: adjudicated, priorPlans: plans.slice(0, -1), handoff,
  roomRuntime, roomId: scope.roomId, seatToken: "probe", scope };
await assert.rejects(product.prepareAgentSelectedTeachPlanForRoom(input),
  /AGENT_SELECTED_TEACH_ROOM_READ_FAILED/u);
assert.equal(roomReads, 1);
await assert.rejects(product.prepareAgentSelectedTeachPlanForRoom({
  ...input, priorPlans: [plans[0], plans[2]],
}), /AGENT_SCHEDULED_REVISION_LINEAGE_INVALID/u);
assert.equal(roomReads, 1);
process.stdout.write("REVIEW_ADJUDICATION_AND_FOUR_REVISION_LINEAGE_OK\n");
