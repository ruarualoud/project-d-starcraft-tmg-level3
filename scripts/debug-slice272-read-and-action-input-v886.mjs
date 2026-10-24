// Two actual product stops: explicit reads labelled finish; invalid Native
// action envelope escaping as fatal despite no dispatch. Frozen inputs only.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const [aRoot,bRoot,out]=process.argv.slice(2),clone=structuredClone,checks=[],steps=[];
async function fixture(root){let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));const original=clone(state),memory=new Map();
  const get=async ref=>memory.has(ref)?clone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
  return {original,get,store:{load:async()=>clone(state),save:async v=>{state=clone(v);},get,
    put:async v=>{const ref=hash(v);memory.set(ref,clone(v));return ref;}}};}
async function check(name,fn){try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:e.message});}console.log(JSON.stringify(checks.at(-1)));}
await check('actual-paid-read-only-reply-cold-revalidation',async()=>{
  const f=await fixture(aRoot),work=f.original.work.find(w=>w.operationState?.correction?.originalReplyRef==='c62dd33063c169b24e37014ea79eb4e8e0a601bc00968cad600829e3633b6db0');
  const call=work.operationState.calls.at(-1),request=await f.get(call.requestRef),reply=await f.get(call.replyRef);
  const plan=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
  assert.equal(plan?.repairKind,'read_only_payload_discriminator');
  const changed=clone(reply);changed.output.workOrders=[{orderId:'not-a-read'}];
  assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:changed,request}),null);
  const meaningful=clone(reply);meaningful.output.conclusion={status:'answered'};
  assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:meaningful,request}),null);
  const semantic=clone(work);semantic.operationState.correction.errors.push({code:'native_fact_value_mismatch'});
  assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work:semantic,reply,request}),null);
  let providerCalls=0;const execute=createRosterWorkflowReadRoleExecutorV1({store:f.store,sessionId:request.sessionId,
    deliberation:{deliberate:async()=>{providerCalls++;throw Error('No paid replay allowed');}}});
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const workflow=await createRosterDecisionWorkflowV1({store:f.store,execute:(a,c)=>execute({...a,inputs:clone(inputs)},c)});
  await workflow.dispatch({type:'revalidate_role_reply',workId:work.id,reason:'Concrete v886 read-only discriminator source repair'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=await workflow.inspect(),w=after.work.find(w=>w.id===work.id),result=await f.get(w.resultRef);
  assert.equal(providerCalls,0);assert.notEqual(w.status,'needs_repair',JSON.stringify(w.failure));
  assert.equal(result.value.status,'reads_completed');assert.equal(result.continuation,true);
  assert.equal(result.value.newReadCount,0);assert.equal(result.value.preparationReturned,true);
  assert.ok(result.value.outputProjection.some(p=>p.rule==='completed_read_preparation_return_v1'));
  assert.deepEqual(w.operationState.calls,work.operationState.calls);assert.equal(after.draftRef,f.original.draftRef);
  assert.equal(after.acceptanceGranted,false);steps.push({stage:'A',plan,status:w.status,result,oldReplyRef:call.replyRef});
  return {providerCalls,paidReplyReused:true,conclusionAccepted:false,negativeCases:3};
});
await check('native-envelope-error-remains-correctable-before-dispatch',async()=>{
  const f=await fixture(bRoot),work=f.original.work.find(w=>w.failure?.code==='ROSTER_WORKFLOW_NATIVE_ACTION_INPUT_INVALID');
  const assignment=await f.get(work.inputRef);let nativeCalls=0;
  const executor=createRosterWorkflowLaboratoryExecutorV1({store:f.store,laboratory:{labDescriptor:()=>({sourceStateHash:f.original.scope.source}),
    runScenarioBranch:async()=>{nativeCalls++;throw Error('Invalid envelope must not execute');}}});
  const reply=await executor.execute(clone(assignment),{operationState:{},checkpointOperation:async()=>{}});
  assert.equal(reply.continuation,true);assert.equal(reply.value.executed,false);
  assert.equal(reply.value.queryRepair.sourceContract,'roster_workflow_native_action_input_v1');
  const workflow=await createRosterDecisionWorkflowV1({store:f.store,execute:(a,c)=>executor.execute({...a,inputs:clone(assignment.inputs)},c)});
  const recovery=await workflow.dispatch({type:'reconcile_unissued_input_failures'});
  assert.ok(recovery.routed.includes(work.id));
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=await workflow.inspect(),w=after.work.find(w=>w.id===work.id);
  assert.equal(w.status,'needs_model_choice');assert.equal(w.failure,null);assert.equal(nativeCalls,0);
  assert.equal(w.failureHistory.at(-1).failure.code,work.failure.code);
  assert.equal((await workflow.dispatch({type:'reconcile_unissued_input_failures'})).routed.length,0);
  for(const field of ['unknown_outcome','pending']){
    const n=await fixture(bRoot),s=clone(n.original),bad=s.work.find(w=>w.id===work.id);
    if(field==='unknown_outcome')bad.failure.dispatchOutcome='unknown';else bad.operationState={pending:{dispatchKey:'unknown'}};
    await n.store.save(s);const g=await createRosterDecisionWorkflowV1({store:n.store,execute:()=>{throw Error('No execute');}});
    assert.ok(!(await g.dispatch({type:'reconcile_unissued_input_failures'})).routed.includes(work.id));
  }
  assert.equal(after.draftRef,f.original.draftRef);steps.push({stage:'B',reply,recovery,status:w.status});
  return {nativeCalls,oldFailurePreserved:true,negativeCases:2};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),checks,steps,actualProviderCalls:0,nativeCalls:0,productionWrites:0,formalPlans:0},null,2));
process.exitCode=checks.every(c=>c.pass)?0:1;
