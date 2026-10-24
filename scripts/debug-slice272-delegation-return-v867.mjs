// Replay the actual compiler refusal through the product scheduler. All state
// below is isolated memory; no Provider, Native operation or production write.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {serializeRosterWorkOrderFailureV1,isRosterWorkOrderCapabilityReturnV1} from '../packages/roster-strategist/roster-workflow-order-failure-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [reportFile,sourceDirectory,priorFile]=process.argv.slice(2);
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null;
const source=JSON.parse(await fs.readFile(sourceDirectory+'/workflow.json','utf8'));
const read=async ref=>JSON.parse(await fs.readFile(sourceDirectory+'/artifacts/'+ref+'.json','utf8'));
const draft=await read(source.draftRef),results=[],steps=[];
let saved;
for(const work of source.work){
  if(!work.resultRef)continue;
  const result=await read(work.resultRef);
  const failure=result.value?.failedWorkOrders?.find(f=>f.error?.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED'
    &&f.error.detail?.issue==='operation_not_delegated'&&f.error.detail.operation==='formation_scene');
  if(failure){saved={work,result,failure};break;}
}
assert.ok(saved,'Actual failed model order required');
const copy=structuredClone;
function recompile(){
  try{compileRosterWorkflowExperimentV1({order:saved.failure.order,scope:source.scope,namespace:'replay',
    choiceContract:saved.failure.error.detail.choiceContract});}
  catch(error){return {order:copy(saved.failure.order),error:serializeRosterWorkOrderFailureV1(error)};}
  throw Error('Undelegated method must not execute');
}
async function check(id,fn){
  const old=prior?.results.find(row=>row.id===id&&row.pass);
  if(old){results.push({...old,inheritedFrom:priorFile});return;}
  try{results.push({id,pass:true,...await fn()});}
  catch(error){results.push({id,pass:false,error:error.message,stack:error.stack?.split('\n').slice(0,5)});}
  console.log(JSON.stringify(results.at(-1)));
}
await check('actual-compiler-refusal-is-control-return',()=>{
  const failure=recompile();
  steps.push({kind:'actual_order_compiler',input:saved.failure.order,output:failure});
  assert.equal(failure.error.code,saved.failure.error.code);
  assert.deepEqual(failure.order,saved.failure.order);
  assert.equal(isRosterWorkOrderCapabilityReturnV1(failure),true,'Permission boundary must not become a format retry');
});
await check('product-scheduler-returns-permission-to-owner-without-model-retry',async()=>{
  let state=null,calls=0;const artifacts=new Map();
  const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
    put:async value=>{const ref=hash(value);artifacts.set(ref,copy(value));return ref;},
    get:async ref=>{assert.ok(artifacts.has(ref),'Missing fixture artifact '+ref);return copy(artifacts.get(ref));}};
  const laboratory={labDescriptor:()=>({sourceStateHash:source.scope.source,rulesRuntimeHash:source.scope.rules,builderBundleHash:hash('fixture')})};
  const make=()=>createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope:source.scope,sessionId:'v867-offline',
    createDraftContext:async()=>({scope:source.scope,laboratory}),
    deliberation:{deliberate:async()=>{calls++;throw Error('Permission return must not buy a format reply');}},
    builderPort:{evaluateRosterCandidate:()=>{throw Error('No roster edit authorized');}}});
  const run=await make();
  await run.initializeDraft({candidateInput:copy(draft.candidateInput),plan:copy(draft.plan),provenance:copy(draft.provenance),mode:'fixed'});
  await run.enqueue([{id:'experiment',role:'roster_workflow_experiment_planner',bindings:source.scope,experimentGoalId:'experiment',
    inputs:{question:{source:'literal',value:'原局部控制比较，不扩大目标'}}}]);
  // Inject the saved compiler result at the exact receiving boundary. Earlier
  // Native/model execution is NOT replayed or counted as newly proven here.
  const body={kind:'proposal',value:{...copy(saved.result.value),failedWorkOrders:[recompile()],workOrders:[]},conditions:copy(saved.result.conditions)};
  const owner=state.work.find(w=>w.id==='experiment');
  owner.status='evidence_ready';owner.resultRef=await store.put(body);
  state.evidence.push({id:'role:experiment',title:'Actual saved refusal replay',kind:'proposal',bindings:copy(source.scope),
    artifactRef:owner.resultRef,conditions:body.conditions,availability:'available'});
  steps.push({kind:'receiver_injection',workId:owner.id,sourceWorkId:saved.work.id,result:body});
  // The workflow owns an in-memory snapshot. Recreate it after fixture
  // injection, exactly as a cold restore loads the persisted receiving state.
  const restored=await make();
  const out=await restored.advance({concurrency:1});
  steps.push({kind:'receiver_after',state:out.state});
  const child=out.state.work.find(w=>w.orderRepairOf==='experiment');
  assert.ok(child?.inputs.orderFailureReturn,'Permission refusal must enter deterministic return');
  assert.equal(calls,0);assert.equal(child.status,'evidence_ready');
  const returned=(await store.get(child.resultRef)).value;
  assert.equal(returned.coordination.kind,'work_order_delegation_return');
  assert.equal(returned.coordination.nativeRetryAuthorized,false);
  assert.equal(returned.coordination.planApprovalGranted,false);
  assert.deepEqual(returned.coordination.failure.order,saved.failure.order);
  const frontier=out.state.work.find(w=>w.investigationFrontierOf==='experiment');
  assert.equal(frontier?.role,'roster_workflow_strategy_decision');
  assert.equal(frontier.inputs.investigationFrontier.value.returnReason,'experimental_method_requires_authorization');
  assert.equal(frontier.inputs.unavailableCapabilities,undefined,'Available tool must not be mislabeled globally unavailable');
  assert.equal(frontier.inputs.delegationBoundaryRequests.value[0].failure.error.detail.operation,'formation_scene');
  assert.equal(out.state.work.filter(w=>w.role==='roster_workflow_tool').length,0);
  const cold=await make();
  assert.deepEqual((await cold.inspect()).work.map(w=>[w.id,w.status]),out.state.work.map(w=>[w.id,w.status]));
  return {providerCalls:calls,nativeCalls:0,actualOrderPreserved:true,coldRestore:true};
});
await check('invalid-or-post-completion-orders-do-not-gain-control-return',()=>{
  const failure=recompile();
  for(const change of [f=>{f.error.dispatchOutcome='dispatched';},
    f=>{f.error.detail.issue='work_after_delegated_completion';f.error.detail.operationAllowed=true;},
    f=>{f.error.detail.choiceContract=null;},f=>{f.error.code='ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID';}]){
    const mutated=copy(failure);change(mutated);assert.equal(isRosterWorkOrderCapabilityReturnV1(mutated),false);
  }
});
await fs.writeFile(reportFile,JSON.stringify({passed:results.every(r=>r.pass),results,steps,
  sourceWorkId:saved.work.id,sourceResultRef:saved.work.resultRef,providerCalls:0,nativeCalls:0,productionWrites:0,formalPlans:0},null,2)+'\n');
if(results.some(r=>!r.pass))process.exitCode=1;
