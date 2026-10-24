// Concrete stop: B/r16 has four completed reviews; an explicit user-granted
// author revision + final review must not reset history or grant infinite tries.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as cycleModule from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const [directory,output]=process.argv.slice(2);
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const readArtifact=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const draft=await readArtifact(original.draftRef);
const assess=state=>cycleModule.assessRosterProductHypothesisCycleV1({state,draft,readArtifact});
const checks=[];
try{
  const before=await assess(original);
  assert.equal(before.comparisonClosureReviewCount,4);assert.equal(before.comparisonStopped,true);
  assert.equal(typeof cycleModule.authorizeRosterComparisonContinuationV1,'function',
    'No same-product one-shot continuation port exists for the explicit authorization');
  const review=original.work.findLast(w=>w.comparisonClosureCycleId===before.id&&w.status==='evidence_ready');
  const policy={authorizationId:'injected-user-once-v941',sourceReviewResultRef:review.resultRef};
  const state=structuredClone(original);let requests=0;
  const run={readArtifact,requestDecision:async value=>{
    requests++;state.work.push({...structuredClone(value),role:'roster_workflow_strategy_decision',status:'ready'});
  }};
  await cycleModule.authorizeRosterComparisonContinuationV1({run,state,draft,policy});
  const pending=await assess(state);
  assert.equal(pending.comparisonClosureReviewCount,4);assert.equal(pending.comparisonStopped,false);
  assert.equal(pending.comparisonClosureReviewLimit,5);
  assert.deepEqual(state.work.slice(0,original.work.length),original.work);
  assert(state.work.at(-1).inputs.comparisonClosureReview,'Author receives exact rejected review');
  checks.push('actual_fourth_rejection_gets_one_author_task_without_history_reset');
  await cycleModule.authorizeRosterComparisonContinuationV1({run,state,draft,policy});
  assert.equal(requests,1);checks.push('repeat_same_authorization_is_idempotent');
  const forged=structuredClone(state);forged.work.at(-1).inputs.comparisonReviewAuthorization.value.sourceReviewResultRef='wrong';
  assert.equal((await assess(forged)).comparisonStopped,true);
  await assert.rejects(()=>cycleModule.authorizeRosterComparisonContinuationV1({run,state:original,draft,
    policy:{...policy,sourceReviewResultRef:'wrong'}}),/SOURCE_MISMATCH/);
  checks.push('authorization_is_bound_to_exact_rejected_source');
  const fifth=structuredClone(state);
  fifth.work.push({...structuredClone(review),id:review.id+':injected-fifth'});
  const stopped=await assess(fifth);
  assert.equal(stopped.comparisonClosureReviewCount,5);assert.equal(stopped.comparisonStopped,true);
  checks.push('fifth_rejection_stops_without_a_sixth_review');
  const busy=structuredClone(original);busy.work.at(-1).status='running';
  await assert.rejects(()=>cycleModule.authorizeRosterComparisonContinuationV1({run,state:busy,draft,policy}),/WRITER_BUSY/);
  checks.push('active_operation_is_not_reauthorized');
  await fs.writeFile(output,JSON.stringify({pass:true,checks,providerCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');
  console.log(JSON.stringify({pass:true,checks}));
}catch(error){
  await fs.writeFile(output,JSON.stringify({pass:false,checks,error:error.message,providerCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');
  console.log(JSON.stringify({pass:false,error:error.message}));process.exitCode=1;
}
