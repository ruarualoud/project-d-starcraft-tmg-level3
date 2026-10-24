// Concrete v989 result: exact duplicate inspect 14229c5a queued a new paid
// summary. Also reproduce the scheduler issuing another job after no-progress.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRepeatedInspectionOnlyBatchV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),checks=[];
const original=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(original);
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const check=async(name,fn)=>{try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message});}};
const summary=original.work.find(w=>w.id.endsWith(':method:48db98425cf42c95:order0:summary'));assert(summary);
let local=copy(original),calls=0;
const store={get,put,load:async()=>copy(local),save:async v=>{local=copy(v);}};
const role=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'offline-v990',deliberation:{deliberate:async()=>{
  calls++;throw Object.assign(Error('CAPTURE_ONLY'),{dispatchOutcome:'not_dispatched'});}}});
const workflow=await createRosterDecisionWorkflowV1({store,execute:role});
await workflow.dispatch({type:'run_ready',concurrency:1,workIds:[summary.id]});
await check('pure_repeated_inspect_does_not_buy_summary',async()=>{
  const current=(await workflow.inspect()).work.find(w=>w.id===summary.id);
  assert.equal(current.failure?.code,'ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
  assert.equal(current.operationState.noProgressStop.reason,'repeated_inspection_only_batch');
  assert.equal(calls,0);
});

// Small independent scheduler fixture; no model, laboratory or real store.
const scope={army:'army',plan:'plan',rules:'rules',map:'map',source:'source'};
let saved={schema:'roster_decision_workflow_v1',scope,evidence:[],reads:[],events:[],acceptanceGranted:false,
  work:['first','must-not-start'].map(id=>({id,role:'roster_workflow_fact_summary',status:'ready',bindings:scope,inputs:{}}))};
const scheduled=[],schedulerStore={get,put,load:async()=>copy(saved),save:async v=>{saved=copy(v);}};
const scheduler=await createRosterDecisionWorkflowV1({store:schedulerStore,execute:async(a,control)=>{
  scheduled.push(a.workId);
  if(a.workId==='first'){
    await control.checkpointOperation({noProgressStop:{version:1,reason:'concrete-repeated-confirmation'}});
    throw Object.assign(Error('ROSTER_WORKFLOW_ROLE_NO_PROGRESS'),{dispatchOutcome:'completed_no_progress'});
  }
  return {kind:'interpretation',value:{},conditions:[]};
}});
await scheduler.dispatch({type:'run_ready',concurrency:1});
await check('stop_unissued_sibling_immediately',async()=>assert.deepEqual(scheduled,['first']));
await check('cold_scheduler_keeps_batch_stop',async()=>{
  const cold=await createRosterDecisionWorkflowV1({store:schedulerStore,execute:async()=>{throw Error('MUST_NOT_DISPATCH');}});
  await assert.rejects(()=>cold.dispatch({type:'run_ready'}),e=>e.code==='ROSTER_WORKFLOW_NO_PROGRESS_STOP');
});
await check('new_observation_or_new_operation_not_blocked',async()=>{
  const source=original.work.find(w=>w.experimentOwnerId===summary.experimentOwnerId&&w.role==='roster_workflow_tool');
  const body=await get(source.resultRef),changed=copy(body);delete changed.value.queryReuse;
  const changedState=copy(original);changedState.work.find(w=>w.id===source.id).resultRef=await put(changed);
  assert.equal(await projectRepeatedInspectionOnlyBatchV1({state:changedState,workId:summary.id,store}),null);
  const extended=copy(original);extended.work.push({...copy(source),id:'new-observation-prerequisite',status:'ready',
    inputs:{request:{source:'literal',value:{operation:'probability'}}},resultRef:null});
  assert.equal(await projectRepeatedInspectionOnlyBatchV1({state:extended,workId:summary.id,store}),null);
});
assert.equal(hash(original),before);
console.log(JSON.stringify({checks,injectedProviderCalls:calls,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
assert(checks.every(c=>c.ok),'Repeated confirmation or queue stop remains broken');
