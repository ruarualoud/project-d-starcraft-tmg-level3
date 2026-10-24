// Actual v992 paid author response: two retained source inputs exist, but the
// return selector loses them and the settlement ignores the Host control return.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowFrontierResponseV1,createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {createRosterWorkflowFrontierReturnsV1} from '../packages/roster-strategist/roster-workflow-frontier-return-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),checks=[],remaining=process.argv.includes('--remaining');
const source=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8'));
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
let local=copy(source),captured=null,calls=0;
const store={get,put,load:async()=>copy(local),save:async value=>{local=copy(value);}};
const frontier=source.work.find(w=>w.id.endsWith(':48db98425cf42c95:strategy-frontier'));assert(frontier?.draftOutcomeRef);
const check=async(name,fn)=>{if(remaining&&name!=='real_role_request_cannot_reauthorize_closed_experiment')return;
  try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message});}
  console.log(JSON.stringify({completedGate:checks.at(-1)}));};
const expected=[frontier.inputs.originalObservation.id,frontier.inputs.repeatedObservation.id].sort();
await check('actual_control_return_sources_are_not_selected_by_field_name',async()=>{
  assert.deepEqual(rosterWorkflowFrontierResponseV1({state:source,frontier,response:frontier}).facts.map(([,i])=>i.id).sort(),expected);
});
const jobs=await createRosterWorkflowFrontierReturnsV1({state:source,readArtifact:get});
const job=jobs.find(j=>j.resumesStrategyFrontierOf===frontier.id);
await check('actual_retained_author_decision_returns_to_original_question_without_approval',async()=>{
  assert(job,'paid author control decision has no next owner');
  assert.equal(job.inputs.scopedStrategyReturn.value.factsApproved,false);
  assert.equal(job.inputs.scopedStrategyReturn.value.closedNoProgressMethod,true);
  assert.deepEqual(Object.entries(job.inputs).filter(([k])=>k.startsWith('returnedQuestionFact')).map(([,i])=>i.id).sort(),expected);
  assert.equal(job.inputs.strategyResolution.id,'role:'+frontier.id);
});
if(job){
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'offline-v993',deliberation:{deliberate:async request=>{
    captured=request;calls++;throw Object.assign(Error('CAPTURE_ONLY'),{dispatchOutcome:'not_dispatched'});
  }}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  await workflow.dispatch({type:'enqueue',work:[job]});
  await check('enqueue_consumes_only_exact_handed_off_stop_and_preserves_old_records',async()=>{
    const state=await workflow.inspect(),stop=state.work.find(w=>w.noProgressHandoffRef===source.work.find(w=>w.id===frontier.investigationFrontierOf).investigationHandoff.reportRef);
    assert.equal(stop.status,'returned_to_owner');assert(stop.operationState.noProgressStop);
    assert.equal(stop.resultRef,null);assert.equal(stop.noProgressResolutionWorkId,job.id);
    assert.equal(createRosterWorkflowGraphV1(state).canRun(job.id),true);
    assert.deepEqual(state.work.find(w=>w.id===frontier.id),frontier);
  });
  const ran=await workflow.dispatch({type:'run_ready',workIds:[job.id],concurrency:1});
  if(!captured)console.log(JSON.stringify({requestBoundaryDiagnostic:ran}));
  await check('real_role_request_cannot_reauthorize_closed_experiment',async()=>{
    assert.equal(calls,1);assert(captured,'next role never reached its actual request boundary');
    assert(!captured.responseFormat.schema.properties.action.enum.includes('finish'));
    assert.equal(captured.responseFormat.schema.properties.workOrders.maxItems,0);
    const workOrders=captured.responseFormat.schema.properties.workOrders;
    const emptyOnly={type:'object',properties:{workOrders},required:['workOrders'],additionalProperties:false};
    assert.equal(validate(emptyOnly,{workOrders:[]}).ok,true);
    assert(validate(emptyOnly,{workOrders:[{}]}).issues.some(issue=>issue.code==='array_too_long'));
    assert(captured.userMessage.includes('closed without reauthorization'));
  });
  await check('mismatched_control_receipt_does_not_gain_return_authority',async()=>{
    const changed=copy(source),f=changed.work.find(w=>w.id===frontier.id);
    f.inputs.noProgressBoundary.value.retainedObservation.originalResultRef='not-the-original';
    assert.equal(rosterWorkflowFrontierResponseV1({state:changed,frontier:f,response:f}).facts.length,0);
  });
}
console.log(JSON.stringify({checks,injectedModelCalls:calls,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
assert(checks.every(c=>c.ok));
