// Actual v886 paid response: an explicit blocked conclusion, empty execution
// lists, and the wrong finish discriminator. No new Provider/Native execution.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const original=clone(state),artifacts=new Map(),get=async ref=>artifacts.has(ref)?clone(artifacts.get(ref))
  :JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>clone(state),save:async s=>{state=clone(s);},get,
  put:async value=>{const ref=hash(value);artifacts.set(ref,clone(value));return ref;}};
let report;
try{
  const work=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='744c5f4a97dfd60c9a212a3780a32bf8d65b717d4775a879950c65442efe557a');
  assert.ok(work,'Actual stopped source must exist');
  const call=work.operationState.calls.at(-1),request=await get(call.requestRef),reply=await get(call.replyRef);
  const recovery=projectRosterWorkflowSavedSchemaRevalidationV1({work,request,reply});
  assert.equal(recovery?.repairKind,'explicit_experiment_conclusion_discriminator');
  for(const field of ['workOrders','reads','catalogueQueries']){
    const ambiguous=clone(reply);ambiguous.output[field]=[{notEmpty:true}];
    assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,request,reply:ambiguous}),null);
  }
  const semantic=clone(work);semantic.operationState.correction.errors.push({code:'native_fact_value_mismatch'});
  assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work:semantic,request,reply}),null);
  let calls=0;
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:request.sessionId,
    deliberation:{deliberate:async()=>{calls++;throw Error('Paid output may not be regenerated');}}});
  const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const workflow=await createRosterDecisionWorkflowV1({store,execute:(a,c)=>executor({...a,inputs:clone(inputs)},c)});
  await workflow.dispatch({type:'revalidate_role_reply',workId:work.id,reason:'v887 explicit conclusion source routing repair'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=await workflow.inspect(),item=after.work.find(w=>w.id===work.id);
  assert.equal(item.status,'evidence_ready',JSON.stringify(item.failure));
  const result=await get(item.resultRef),conclusion=result.value.experimentConclusion;
  assert.equal(conclusion.status,'blocked');assert.equal(conclusion.answer,reply.output.conclusion.answer);
  assert.deepEqual(result.value.unresolvedQuestions,reply.output.unresolvedQuestions);
  assert.equal(conclusion.acceptanceGranted,false);assert.equal(result.value.acceptanceGranted,false);
  assert.ok(result.value.outputProjection.some(p=>p.rule==='explicit_experiment_conclusion_discriminator_v1'));
  assert.equal(calls,0);assert.deepEqual(item.operationState.calls,work.operationState.calls);
  assert.equal(after.draftRef,original.draftRef);assert.equal(after.acceptanceGranted,false);
  report={pass:true,negativeCases:4,providerCalls:calls,nativeCalls:0,productionWrites:0,
    originalReplyRef:call.replyRef,recovery,result,workStatus:item.status,formalPlans:0};
}catch(error){report={pass:false,error:error.message};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({pass:report.pass,error:report.error,negativeCases:report.negativeCases,
  providerCalls:report.providerCalls,nativeCalls:report.nativeCalls,workStatus:report.workStatus}));
