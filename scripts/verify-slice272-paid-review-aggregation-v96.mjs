// Reproduce local aggregation of the completed, already-paid A7 shard.
// No Provider sends, no new review judgments and no live Room mutation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reviewRosterFinalPlanV3, verifyRosterFinalPlanReviewAdjudicationV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base = process.argv[2];
const d = JSON.parse(await readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const versions = [...d.planVersionHistory, d.planSerialized].map(JSON.parse);
const plan = versions.find(p => p.planVersion === 7), previous = versions.find(p => p.planVersion === 6);
const old = [...d.planReviewHistory, d.planReview].find(r => r.planHash === previous.planHash && r.status === 'completed');
const outputs = d.publicOutputs.filter(o => o.roundKind === 'final_plan_review');
let replayed = 0;
const review = await reviewRosterFinalPlanV3({ plan, sessionId: d.sessionId,
  incrementalFrom: { plan: previous, review: old.review },
  armyAudit: d.working.verdict.audit, toolReceipts: d.toolReceipts,
  selectedCandidateInputHash: hash(d.selectedCandidateInput),
  selectionUnitRules: d.teachFramework.context.sourceFacts.selectionUnitRules,
  relatedRepairClaimPaths: [], adaptiveReview: true, allowFullReviewOnDependencyChange: false,
  deliberation: { async deliberate(request) {
    const paid = outputs.findLast(o => o.contextHash === request.contextHash);
    assert(paid, 'Must reuse the exact saved paid context; never invent a new review');
    assert.equal(paid.sanitizedOutput.reviewedClaimPaths.length, 4);
    replayed++;
    return { output: structuredClone(paid.sanitizedOutput), receipt: { contextHash: paid.contextHash } };
  } } });
assert.equal(replayed, 1);
assert.equal(review.incrementalReview.newReviewedClaimCount, 4);
const effective = verifyRosterFinalPlanReviewAdjudicationV1({ plan, review });
assert.equal(effective.unresolvedHighCount, 0);
assert.equal(review.reviewAdjudication.decisions.length, old.review.reviewAdjudication.decisions.length);
const changed = structuredClone(review);
const proof = changed.reviewAdjudication.decisions.find(d => d.sourceProof)?.sourceProof;
assert(proof);
proof.claimText += ' invalid inherited claim';
const { reviewHash: ignored, ...body } = changed;
changed.reviewHash = hash(body);
assert.throws(() => verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: changed }), /ADJUDICATION_INVALID/);
console.log(JSON.stringify({ status: 'PASS', exactPaidShardReused: true,
  newReviewedClaims: 4, retainedDecisions: review.reviewAdjudication.decisions.length,
  effective, changedProofRejected: true, providerCalls: 0, roomActions: 0 }));
