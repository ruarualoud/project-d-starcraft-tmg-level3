// Actual B14 completed paid shard; local inheritance of B13 source-only proof
// failed. Reuse the precise recorded context, without another Provider call.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { reviewRosterFinalPlanV3, verifyRosterFinalPlanReviewAdjudicationV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const base=process.argv[2];const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const row=cfg.rows.find(r=>r.arm==='B'),file=row.dataDirectory+'/drafts/'+row.sessionId+'.json';
const before=await fs.readFile(file,'utf8'),d=JSON.parse(before),plan=JSON.parse(d.planSerialized);
assert.equal(plan.planVersion,14);
const previous=d.planVersionHistory.map(s=>JSON.parse(s)).find(p=>p.planVersion===13);
const prior=d.planReviewHistory.find(r=>r.status==='completed'&&r.planHash===previous.planHash&&r.review.reviewAdjudication?.reconciliation?.policyVersion===11);
assert(prior);
let reused=0;
const review=await reviewRosterFinalPlanV3({plan,sessionId:d.sessionId,
  armyAudit:d.working.verdict.audit,toolReceipts:d.toolReceipts,
  selectedCandidateInputHash:hash(d.selectedCandidateInput),
  selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
  selectionJustificationPolicyVersion:d.agentSelectedStrategySource.selectionJustificationPolicyVersion,
  incrementalFrom:{plan:previous,review:prior.review},relatedRepairClaimPaths:['scoreRoute.routeText'],
  allowFullReviewOnDependencyChange:false,adaptiveReview:true,
  deliberation:{async deliberate(request){const saved=d.publicOutputs.findLast(o=>o.roundKind==='final_plan_review'
      &&o.contextHash===request.contextHash&&hash(o.sanitizedOutput)===o.outputHash);
    assert(saved,'exact paid context required; never substitute or repurchase');reused++;
    return {output:saved.sanitizedOutput,receipt:{contextHash:request.contextHash,paidProviderCall:false,retainedPaidReply:true}};}}});
assert.equal(reused,1);verifyRosterFinalPlanReviewAdjudicationV1({plan,review});
assert.equal(review.incrementalReview.newReviewedClaimCount,1);
const proofDecisions=review.reviewAdjudication.decisions.filter(d=>d.sourceProof);
assert.equal(proofDecisions.length,2);
const bad=structuredClone(review);bad.reviewAdjudication.decisions.find(d=>d.sourceProof).sourceProof.premiseFacts.numbers[0].value+=1;
const {reviewHash,...body}=bad;bad.reviewHash=hash(body);
assert.throws(()=>verifyRosterFinalPlanReviewAdjudicationV1({plan,review:bad}),/ADJUDICATION_INVALID/);
assert.equal(await fs.readFile(file,'utf8'),before);
console.log(JSON.stringify({status:'PASS',exactPaidShardReused:reused,sourceOnlyProofsInherited:2,
  fabricatedSourceStillRejected:true,originalDraftUnchanged:true,providerCalls:0,roomActions:0}));
