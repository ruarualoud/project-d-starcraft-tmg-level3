// Actual726 was handed two resolved v600 failures as current v601 failures.
// Reconstruct only that constructor call; no paid or Native replay.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterExperimentReviewRevisionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const stateSnapshot=JSON.stringify(state);
const store={get:async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'))};
const review=state.work.find(w=>w.id.endsWith(':source-recheck:ability-fields-v601'));
assert.equal(review.status,'evidence_ready');
const owner=state.work.find(w=>w.id===review.experimentSourceReviewOf);
assert(owner.inputs.failedSourceClaim1&&owner.inputs.failedSourceClaim2,'actual stale inherited inputs must exist');
const fixture={...state,work:state.work.filter(w=>w.id!==owner.id+':source-revision')};
const next=await createRosterExperimentReviewRevisionV1({state:fixture,owner,store});
const feedback=Object.entries(next.inputs).filter(([key])=>/^failedSourceClaim\d+$/u.test(key));
assert.equal(feedback.length,1,'only the one current failed ability matrix may be active feedback');
assert.equal(feedback[0][1].id,'role:'+review.id+':rule-fields:0');
assert.equal(next.inputs.rejectedConclusion.id,'role:'+owner.id);
assert.equal(next.inputs.sourceReview.id,'role:'+review.id);
assert.deepEqual(next.inputs.question,owner.inputs.question,'do not drop the actual strategic question');
assert.equal(next.experimentReviewRound,4,'history is not reset');
// The live daemon legitimately advances the external checkpoint concurrently.
// This read-only constructor must preserve its input, not freeze that daemon.
assert.equal(JSON.stringify(state),stateSnapshot);
console.log(JSON.stringify({status:'passed',removedResolvedFeedback:2,currentFailures:1,
  questionPreserved:true,round:4,providerCalls:0,nativeCalls:0,productionWrites:0}));
