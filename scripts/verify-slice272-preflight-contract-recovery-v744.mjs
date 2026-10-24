// Concrete stopped r3 preflight: Host sent a Plan-owned generic review contract.
// Recovery must preserve the design and old counters and be available only once.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as purpose from '../packages/roster-strategist/roster-comparison-purpose-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1}
  from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {createRosterComparisonPreflightWorkV1}
  from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(process.argv[2]),before=await fs.readFile(path.join(root,'workflow.json'),'utf8');
const state=JSON.parse(before),readArtifact=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const draft=await readArtifact(state.draftRef),review=state.work.at(-1);
assert.equal(review.resultRef,'a66afd200d6b293f97e03a2ad283dbca153b443ec07d982001368cfe873b95e6');
const failures=[];
async function check(name,run){try{await run();}catch(e){failures.push({name,error:e.message});}}
await check('one-exact-host-contract-recovery-not-new-design-or-reset',async()=>{
  const cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact});
  assert.equal(cycle.comparisonPreflightStopped,true);
  assert.equal(cycle.comparisonPreflightContractRepair.sourceWorkId,review.id);
  const calls=[];
  const result=await progressRosterProductComparisonV1({run:{
    requestStrategicComparisonDesignReview:async args=>calls.push(args)
  },state,draft,cycle});
  assert.equal(calls.length,1);
  assert.equal(calls[0].purposeResultRef,review.comparisonPurposeResultRef);
  assert.equal(calls[0].designReviewRound,3);
  assert.equal(calls[0].contractRepair.sourceWorkId,review.id);
  const queued=createRosterComparisonPreflightWorkV1({...calls[0],current:state,
    toolDescriptor:review.inputs.tools.value});
  assert.equal(queued.comparisonPreflightContractRepairOf,review.id);
  assert.equal(queued.controlledRecovery.historyReset,false);
  assert.equal(queued.inputs.proposedDesign.id,review.inputs.proposedDesign.id);
  assert.equal(result.scheduled[0],calls[0].id);
  assert.deepEqual(await progressRosterProductComparisonV1({run:{},state:{
    ...state,work:[...state.work,{id:calls[0].id}]
  },draft,cycle}),{scheduled:[]});
});
await check('do-not-repeat-current-contract-or-pending-or-recovery',async()=>{
  const args={work:review,readArtifact};
  assert.equal(await purpose.rosterComparisonPreflightContractRepairV1({
    ...args,work:{...review,comparisonPreflightContractRepairOf:review.id}}),null);
  assert.equal(await purpose.rosterComparisonPreflightContractRepairV1({
    ...args,work:{...review,operationState:{...review.operationState,pending:{requestId:'pending'}}}}),null);
  const reader=async ref=>{
    const value=await readArtifact(ref);
    return ref===review.operationState.calls.at(-1).requestRef
      ?{...value,promptNodes:[...value.promptNodes,{kind:'authored_choice_subject',
        subject:{kind:'comparison_design',evidenceId:review.inputs.proposedDesign.id}}]}:value;
  };
  assert.equal(await purpose.rosterComparisonPreflightContractRepairV1({...args,readArtifact:reader}),null);
});
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
