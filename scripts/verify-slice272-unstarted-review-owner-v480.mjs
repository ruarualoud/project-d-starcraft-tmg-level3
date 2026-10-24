import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as policy from '../packages/roster-strategist/roster-review-catalogue-transport-v1.mjs';
const original=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const checkpoint=original.reviewReconciliation.recoveryCheckpoint;
assert.notEqual(checkpoint.contextHash,original.providerDispatches.at(-1).contextHash);
assert.equal(original.reviewReconciliation.failure.code,'DEBUG_BOUNDARY_INSPECTION_REQUIRED');
const allows=policy.isUndispatchedCurrentRosterReviewV1 || (()=>false);
assert.equal(allows(original),true,'Current unsent request must not inherit previous rejected dispatch');
const sample={sessionId:original.sessionId,status:original.status,planReview:original.planReview,
  reviewReconciliation:original.reviewReconciliation,providerDispatches:original.providerDispatches.slice(-1),publicOutputs:[]};
for(const status of ['reserved','sending','ambiguous','response_rejected','completed']) {
  assert.equal(allows({...sample,providerDispatches:[...sample.providerDispatches,{status,contextHash:checkpoint.contextHash}]}),false);
}
assert.equal(allows({...sample,publicOutputs:[{contextHash:checkpoint.contextHash}]}),false);
assert.equal(allows({...sample,planReview:{...sample.planReview,planHash:'other'}}),false);
console.log(JSON.stringify({pass:true,currentUnsentOwner:true,unsafeCasesRejected:7,providerCalls:0,originalWrites:0}));
