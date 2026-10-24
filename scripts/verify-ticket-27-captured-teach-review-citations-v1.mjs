// Actual fresh B review said Teach's C1 receipt did not exist, even though
// the retained Product tool log contained its original, source-bound bytes.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildRosterFinalPlanVerifiedFactsV1 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [draftPath, resultPath, reportPath] = process.argv.slice(2);
const draftBytes = await fs.readFile(draftPath, "utf8");
const draft = JSON.parse(draftBytes);
const { plan } = JSON.parse(await fs.readFile(resultPath, "utf8"));
const originalPlan = JSON.stringify(plan);
const citedHash = "364f92df3e999822768cc36fee916e1891f40cde3d973988e9587b322a463cdd";
const original = draft.toolReceipts.find(x => x.receiptHash === citedHash);
assert(original);
assert(plan.scoreRoute.routeText.includes(citedHash));
const input = { plan, toolReceipts: draft.toolReceipts,
  selectedCandidateInputHash: hash(draft.selectedCandidateInput) };
const facts = buildRosterFinalPlanVerifiedFactsV1(input).sourceFacts;
const delivered = facts.citedReadOnlyQueryEvidence?.find(x =>
  x.receiptHash === citedHash);
assert(delivered,
  "review/revision must receive the real Teach receipt cited by the plan");
assert.deepEqual(delivered, original);
assert.equal(delivered.exactMoveOrDeploymentLegality, false);
assert.equal(delivered.reachabilityStatus, "certified_witness");
const { projectRosterTeachEvidenceReferencesV1 } = await import(
  "../packages/roster-strategist/roster-teach-evidence-port-v1.mjs");
const references = projectRosterTeachEvidenceReferencesV1([
  { challengeId: "C1-score-route-marker-priority", requestKind: "map_route",
    sourceReceipt: original },
  { challengeId: "C3-r4-focus-fire-probability", requestKind: "probability",
    sourceReceipt: null,
    unknownReasonCode: "PREGAME_LAB_PROBABILITY_TARGET_REQUIRED" },
], { toolId: "ticket27-s271-roster-workspace-lab" });
assert.equal(references[0].receiptHash, citedHash);
assert.equal(references[0].status, "attached");
assert.equal(references[1].status, "unknown");
assert.equal(references[1].receiptHash, null);
const tampered = structuredClone(original);
tampered.reachable = false;
const invalidFacts = buildRosterFinalPlanVerifiedFactsV1({ ...input,
  toolReceipts: draft.toolReceipts.map(x => x === original ? tampered : x),
}).sourceFacts;
assert(!invalidFacts.citedReadOnlyQueryEvidence.some(x =>
  x.receiptHash === citedHash), "tampered evidence must not become a fact");
const differentSource = { ...structuredClone(original), mapBinding: {
  ...original.mapBinding, sourceStateHash: "a".repeat(64) } };
delete differentSource.receiptHash;
differentSource.receiptHash = hash(differentSource);
const otherPlan = structuredClone(plan);
otherPlan.scoreRoute.routeText = otherPlan.scoreRoute.routeText.replaceAll(
  citedHash, differentSource.receiptHash);
const otherFacts = buildRosterFinalPlanVerifiedFactsV1({ ...input,
  plan: otherPlan, toolReceipts: [...draft.toolReceipts, differentSource],
}).sourceFacts;
assert(!otherFacts.citedReadOnlyQueryEvidence.some(x =>
  x.receiptHash === differentSource.receiptHash),
  "a valid hash from a different frozen scenario is not this plan's fact");
assert.equal(JSON.stringify(plan), originalPlan);
assert.equal(await fs.readFile(draftPath, "utf8"), draftBytes);
const report = { passed: true, actualPaidPlanAndRetainedTeachReceiptUsed: true,
  reviewAndRevisionShareSourceBoundEvidence: true,
  gridWitnessNotPromotedToExactMove: true,
  tamperedAndOtherSourceEvidenceExcluded: true, originalPlanUnchanged: true,
  providerCalls: 0, liveRoomWrites: 0, trainingTruth: false };
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
console.log(JSON.stringify(report));
