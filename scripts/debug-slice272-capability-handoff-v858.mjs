// Whole failed-order path: injected Provider -> real role/compiler -> product
// workspace scheduler -> control return -> strategic frontier. No live calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const reportFile=process.argv[2],draft=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const prior=process.argv[4]?JSON.parse(await fs.readFile(process.argv[4],'utf8')):null;
const copy=value=>JSON.parse(JSON.stringify(value)),results=[],steps=[];
const scope=Object.fromEntries(['source','rules','map','army','plan'].map(k=>[k,hash(k)]));
const selector={fromEvidenceNumber:1,fromStepId:'',attackerUnitId:'goliath',targetUnitId:'target',weaponName:'Ares'};
const args={metric:'sequential_combined_volley_casualties',operator:'greater_than',minimumDifference:0,left:selector,right:selector};
function order(parameters){return {orderId:'bounded-test',purpose:'比较局部指标，不模拟整局',scenarioAssumptions:['局部假设'],
  experimentScope:{kind:'firepower_comparison',decisionQuestion:'两种配置的局部联合伤亡有差别吗？',decisionImpact:'决定一个升级是否值得',
    participantUnitIds:['goliath','target'],scenarioDescription:'冻结局部场景',stopPredicate:'单个局部比较返回',collectScenarioExperience:false,hypothesisTest:null,comparisonBinding:null},
  steps:[{stepId:'compare',operation:'compare_observations',argumentsJson:JSON.stringify(parameters),bindings:[],guards:[],publicReason:'选择工具支持的比较'}],
  completionStepId:'compare',stopAndReturnToModelWhen:'回答后返回作者'};}
async function fixture(parameters){
  let state=null,calls=0;const artifacts=new Map(),requests=[];
  const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
    put:async value=>{value=copy(value);const ref=hash(value);artifacts.set(ref,value);return ref;},
    get:async ref=>{assert.ok(artifacts.has(ref),'Missing '+ref);return copy(artifacts.get(ref));}};
  const laboratory={labDescriptor:()=>({sourceStateHash:scope.source,rulesRuntimeHash:scope.rules,builderBundleHash:hash('builder')})};
  const deliberation={deliberate:async request=>{
    calls++;requests.push(copy(request));
    assert.equal(calls,1,'No paid-format retry may be used to discover the already-known capability gap');
    const output={action:'finish',publicReason:'离线注入：提出一个局部实验',reads:[],catalogueQueries:[],workOrders:[order(parameters)],unresolvedQuestions:[],conclusion:null};
    steps.push({kind:'provider_input_output',request,output});
    return {output,receipt:{contextHash:request.contextHash,sessionId:request.sessionId,roundKind:request.roundKind,
      roundIndex:request.roundIndex,outputContractRef:copy(request.responseFormat.outputContractRef),outputHash:hash(output),paidProviderCall:false,trainingTruth:false}};
  }};
  const make=()=>createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope,sessionId:'injection-v858',deliberation,
    createDraftContext:async()=>({scope,laboratory}),builderPort:{evaluateRosterCandidate:()=>{throw Error('No draft edit authorized');}}});
  const run=await make();
  await run.initializeDraft({candidateInput:copy(draft.candidateInput),plan:copy(draft.plan),provenance:copy(draft.provenance),mode:'fixed'});
  await run.enqueue([{id:'experiment',role:'roster_workflow_experiment_planner',bindings:scope,experimentGoalId:'experiment',
    inputs:{question:{source:'literal',value:{question:'完成当前一个局部比较；不扩大实验范围'}}}}]);
  return {run,store,requests,get calls(){return calls;},make,async advance(){
    const before=await run.inspect();const out=await run.advance({concurrency:1});
    steps.push({kind:'workspace_step',beforeWork:before.work,afterWork:out.state.work,ran:out.ran});return out.state;
  }};
}
async function check(id,fn){const passed=prior?.results.find(r=>r.id===id&&r.pass);if(passed){results.push({...passed,inheritedFrom:process.argv[4]});return;}
  try{results.push({id,pass:true,...await fn()});}catch(e){results.push({id,pass:false,error:e.message,stack:e.stack?.split('\n').slice(0,5)});}
  console.log(JSON.stringify(results.at(-1)));}

await check('P1P5/capability-diagnostic-preserved-and-owner-returned',async()=>{
  const h=await fixture(args),first=await h.advance(),owner=first.work.find(w=>w.id==='experiment');
  assert.equal(owner.status,'evidence_ready',JSON.stringify(owner.failure));
  const rejected=await h.store.get(owner.resultRef),failure=rejected.value.failedWorkOrders[0];
  assert.equal(failure.error.queryRepair?.correctable,false,'Compiler diagnostic must survive the role envelope');
  const child=first.work.find(w=>w.orderRepairOf==='experiment');
  assert.ok(child.inputs.orderFailureReturn,'A capability gap is a typed return, not a format-repair prompt');
  const second=await h.advance();
  assert.equal(h.calls,1,'The return uses no model call');
  const done=second.work.find(w=>w.id===child.id),body=await h.store.get(done.resultRef);
  assert.equal(done.status,'evidence_ready');
  assert.equal(body.value.coordination.kind,'work_order_capability_return');
  assert.equal(body.value.experimentConclusion.status,'blocked');
  assert.equal(body.value.experimentConclusion.acceptanceGranted,false);
  const frontier=second.work.find(w=>w.investigationFrontierOf==='experiment');
  assert.equal(frontier?.role,'roster_workflow_strategy_decision','Only the owner may change the objective');
  assert.equal(frontier.inputs.investigationFrontier.value.returnReason,'experimental_capability_unavailable');
  assert.equal(frontier.inputs.unavailableCapabilities.value[0].failure.error.code,'ROSTER_MEASUREMENT_METRIC_UNSUPPORTED');
  assert.equal(second.work.filter(w=>w.role==='roster_workflow_tool').length,0);
  const cold=await h.make();
  assert.deepEqual((await cold.inspect()).work.map(w=>[w.id,w.status]),second.work.map(w=>[w.id,w.status]));
  assert.equal(h.calls,1);
  return {scriptedCalls:1,actualProviderCalls:0,nativeCalls:0};
});
await check('P5/parameter-error-retains-local-correction-lane',async()=>{
  const h=await fixture({...args,metric:'expectedCasualties',minimumDifference:-1}),state=await h.advance();
  const owner=state.work.find(w=>w.id==='experiment'),failure=(await h.store.get(owner.resultRef)).value.failedWorkOrders[0];
  assert.equal(failure.error.queryRepair?.correctable,true);
  const child=state.work.find(w=>w.orderRepairOf==='experiment');
  assert.ok(child.inputs.task.value.failedOrder);assert.equal(child.inputs.orderFailureReturn,undefined);
  assert.equal(child.orderRepairGeneration,1);assert.equal(h.calls,1);
});
await fs.writeFile(reportFile,JSON.stringify({passed:results.every(r=>r.pass),results,steps,
  providerCalls:0,nativeCalls:0,productionWrites:0,productionPlansAccepted:0},null,2)+'\n');
console.log(JSON.stringify({reportFile,passed:results.every(r=>r.pass)}));
if(results.some(r=>!r.pass))process.exitCode=1;
