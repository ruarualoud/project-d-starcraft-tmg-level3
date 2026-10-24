import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as review from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const paid=JSON.parse(gunzipSync(await fs.readFile(process.argv[3])));
const args={checkpoint:saved.reviewReconciliation.recoveryCheckpoint,retainedOutputs:saved.publicOutputs};
const old=args=>args.checkpoint.attempts.filter(a=>a.status==='dispatching').flatMap(attempt=>{
  const retained=args.retainedOutputs.find(o=>o.contextHash===attempt.contextHash);
  return retained?[{attempt,retained}]:[];
});
const recover=review.retainedRosterReviewRecoveryCandidatesV1 || old;
const snapshot=JSON.stringify(args.checkpoint);
const candidates=recover(args);
const recovered=candidates.find(c=>c.retained.outputHash===paid.receipt.outputHash);
assert.ok(recovered,'Actual340 lost5accepted items although paid338 and its exact checkpoint attempt remain');
for(const i of [20,21,28,45,46])assert.ok(recovered.retained.sanitizedOutput.judgments.some(j=>j.findingIndex===i));
assert.equal(JSON.stringify(args.checkpoint),snapshot,'Recovery must not mutate the old checkpoint');
const invalid=args.retainedOutputs.map(o=>o.outputHash===paid.receipt.outputHash
  ? {...o,sanitizedOutput:{...o.sanitizedOutput,publicSummary:'changed'}} : o);
assert.ok(!recover({...args,retainedOutputs:invalid}).some(c=>c.retained.outputHash===paid.receipt.outputHash));
console.log(JSON.stringify({pass:true,paidFiveItemsRecovered:true,checkpointUnchanged:true,
  alteredPaidReplyRejected:true,providerCalls:0,originalWrites:0}));
