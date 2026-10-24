// Reproduce B's exact extra triggerTrigger alongside identical triggerText.
// No model call, no candidate application, no production-state write.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as projection from '../packages/structured-generation/schema-owned-field-projection-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
import {projectRosterWorkflowSavedSchemaRevalidationV1,createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.findLast(w=>w.role==='roster_workflow_strategy_decision'&&w.status==='needs_repair');
const call=work.operationState.calls.at(-1),reply=await get(call.replyRef),request=await get(call.requestRef);
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const passed=prior?.checks.find(c=>c.name===name&&c.pass);
  if(passed){checks.push({...passed,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{message:e.message,stack:e.stack}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');
  console.log(JSON.stringify({...checks.at(-1),...(!checks.at(-1).pass?{error:checks.at(-1).error.message.slice(0,500)}:{})}));}
await check('actual-paid-extra-is-exactly-redundant-and-schema-projects-without-strategy-edit',()=>{
  assert.equal(validate(request.responseFormat.schema,reply.output).ok,false);
  const before=JSON.stringify(reply.output);
  const p=projection.projectSchemaDuplicateFieldsV1(reply.output,request.responseFormat.schema);
  assert.equal(validate(request.responseFormat.schema,p.output).ok,true);
  assert.equal(p.projection.length,1);
  const expected=copy(reply.output);delete expected.decisions[0].mutation.plan.invalidationTriggers[1].triggerTrigger;
  assert.deepEqual(p.output,expected);assert.equal(JSON.stringify(reply.output),before);
  return {onlyRedundantFieldRemoved:true,canonicalPlanUnchanged:true,projection:p.projection};
});
await check('conflict-unique-content-ambiguous-and-open-objects-not-silently-discarded',()=>{
  const closed={type:'object',properties:{text:{type:'string'},other:{type:'string'}},additionalProperties:false};
  for(const value of [{text:'a',other:'b',extra:'different'},{other:'b',extra:'a'},
    {text:'a',other:'a',extra:'a'},{text:'',other:'b',extra:''}]){
    const p=projection.projectSchemaDuplicateFieldsV1(value,closed);assert.deepEqual(p.output,value);assert.equal(p.projection.length,0);}
  const value={text:'a',extra:'a'};
  assert.deepEqual(projection.projectSchemaDuplicateFieldsV1(value,{...closed,additionalProperties:true}).output,value);
  const union={anyOf:[closed,{...closed,properties:{text:{type:'string'}}}]};
  assert.equal(projection.projectSchemaDuplicateFieldsV1(value,union).projection.length,0);
  return {negativeCases:6};
});
await check('saved-paid-answer-reenters-normal-role-without-provider-or-draft-mutation',async()=>{
  const plan=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
  assert.equal(plan?.repairKind,'schema_duplicate_field_projection');assert.equal(plan.providerReplayed,false);
  let state=copy(saved),providerCalls=0;const memory=new Map();
  const store={load:async()=>copy(state),save:async v=>{state=copy(v);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v878-saved-reply',
    deliberation:{deliberate:async()=>{providerCalls++;throw Error('No Provider replay');}}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute:executor});
  await workflow.dispatch({type:'revalidate_role_reply',workId:work.id,reason:'Exact redundant schema field; full normal semantic checks remain'});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  const after=state.work.find(w=>w.id===work.id);
  assert.equal(providerCalls,0);assert.equal(after.operationState.calls.length,work.operationState.calls.length);
  assert.ok(!after.operationState.correction?.errors?.some(e=>e.code==='schema'),JSON.stringify(after.operationState.correction));
  assert.ok(['evidence_ready','needs_model_choice'].includes(after.status),after.status+':'+JSON.stringify(after.failure));
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);
  return {providerCalls,status:after.status,nextErrors:after.operationState.correction?.errors?.map(e=>e.code)??[],
    planUnchanged:true,notStrategyApproval:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),complete:true,checks,
  source:{root,workId:work.id,requestRef:call.requestRef,replyRef:call.replyRef},actualProviderCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(c=>c.pass)?0:1;
