import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const module=await import('../packages/roster-strategist/roster-final-plan-review-v1.mjs');
const contexts=[saved.reviewReconciliation,...saved.reviewReconciliationHistory||[]]
 .filter(r=>r.sourceReviewHash===saved.planReview.review.reviewHash)
 .flatMap(r=>(r.recoveryCheckpoint?.attempts||[]).map(a=>a.contextHash));
const count=module.countRosterReviewDispatchesV1;
// Legacy service uses its pre-dispatch reservations, not the durable sender ledger.
const actual=count?count({contexts,dispatches:saved.providerDispatches,
 fallback:saved.reviewReconciliation.freshCallsUsed}):saved.reviewReconciliation.freshCallsUsed;
assert.equal(actual,1,'081 and 083 never reached the persisted-before-send gateway; only082 was sent');
assert.equal(count({contexts,dispatches:[...saved.providerDispatches,
 {requestId:'uncertain-real-send',contextHash:contexts[0],status:'unknown'}],fallback:3}),2,
 'An uncertain recorded send must still count; no silent retry');
assert.equal(count({contexts,dispatches:undefined,fallback:3}),3,'Legacy missing ledger cannot reset limits');
console.log(JSON.stringify({pass:true,checks:3,actualSendCount:actual,unknownSendCounted:true,providerCalls:0}));
