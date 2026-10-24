// The actual duplicate handoff was saved before v718 prevented its creation.
// Exercise the SAME projection -> workflow-command seam used on cold resume.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as handoffs from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';

const run=path.resolve(process.argv[2]);
const base=path.join(run,'workspace/decision-workflows/decision-a6d75905-a910-49a7-b260-f6eb8f7558d5');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
assert.ok(!original.work.some(work=>work.status==='running'||work.operationState?.pending),'actual run must have saved its operation boundary');
const id=original.work.find(work=>work.id.endsWith(':apply-concentrated-formation:completed-method-handoff')).id;
assert.equal(original.work.find(work=>work.id===id).status,'needs_model_choice');
let state=structuredClone(original),puts=0,executed=[];
const reports=new Map();
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>reports.has(ref)?structuredClone(reports.get(ref))
    :JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref='isolated-v719-'+(++puts);reports.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async work=>{
  executed.push(work.id);return {kind:'proposal',value:{publicReason:'isolated dispatch probe; not a model or Native result'}};
}});
const before=await workflow.inspect();
const commands=handoffs.createRosterWorkflowCompletedMethodOwnerReturnsV1?.({state:before})??[];
for(const command of commands)await workflow.dispatch(command);
if((await workflow.inspect()).work.find(work=>work.id===id).status==='needs_model_choice')
  await workflow.dispatch({type:'continue_work',workId:id});
await workflow.dispatch({type:'run_ready',concurrency:2,workIds:[id]});
assert.deepEqual(executed,[],'retained duplicate must cede to its progressing original owner instead of buying another reply');
assert.equal(commands.length,1,'one precise ownership correction, not a whole experiment retirement');
const after=await workflow.inspect(),old=before.work.find(work=>work.id===id),returned=after.work.find(work=>work.id===id);
assert.equal(returned.status,'returned_to_owner');
assert.equal(returned.resultRef,old.resultRef);
assert.deepEqual(returned.operationState,old.operationState,'all paid replies/reads/counters survive');
const report=await store.get(returned.branchReturnRef);
assert.equal(report.kind,'retained_method_handoff_yield');
assert.equal(report.nativeQueryAutomaticallyResolved,false);
assert.equal(report.historyReset,false);
for(const work of before.work.filter(work=>work.id!==id))
  assert.deepEqual(after.work.find(value=>value.id===work.id),work,'unrelated/original method must not change');
assert.deepEqual(handoffs.createRosterWorkflowCompletedMethodOwnerReturnsV1({state:after}),[],'cold resume is idempotent');
// The state machine also validates explicit same-question ownership itself.
for(const patch of [{replacementOwnerId:'product:initial-army-and-plan'},{workId:commands[0].replacementOwnerId}]){
  let invalid=structuredClone(before);
  const badStore={...store,load:async()=>structuredClone(invalid),save:async value=>{invalid=structuredClone(value);}};
  const bad=await createRosterDecisionWorkflowV1({store:badStore,execute:async()=>{throw Error('must not execute');}});
  await assert.rejects(bad.dispatch({...commands[0],...patch}),/ROSTER_WORKFLOW_METHOD_OWNER_YIELD_INVALID/);
}
const pending=structuredClone(before);pending.work.find(work=>work.id===id).operationState.pending={requestRef:'unreconciled'};
assert.deepEqual(handoffs.createRosterWorkflowCompletedMethodOwnerReturnsV1({state:pending}),[],
  'an issued unknown request cannot be retired or reissued by this ownership repair');
console.log(JSON.stringify({passed:true,actualRetainedDuplicate:true,normalDispatchUsed:true,
  repliesReadsCountersAndOriginalMethodsPreserved:true,pendingNotRetired:true,idempotent:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
