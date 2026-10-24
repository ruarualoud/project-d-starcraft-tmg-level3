// Offline single-step diagnostics at production seams. Injected Provider/Builder
// data proves communication/control flow ONLY, never strategy or live legality.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterSourceClaimReviewV1,assessRosterSourceClaimReviewV1} from '../packages/roster-strategist/roster-workflow-source-claims-v1.mjs';
import {rosterReviewProofCitationErrorsV1} from '../packages/roster-strategist/roster-review-proof-context-v1.mjs';
import {applyRosterWorkflowDraftV1,ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterUnresolvedQueryReturnV1} from '../packages/roster-strategist/roster-tool-proof-scope-v1.mjs';

const output=path.resolve(process.argv[2]);
const prior=process.argv[3]?JSON.parse(await fs.readFile(process.argv[3],'utf8')):null;
const savedDraft=process.argv[4];
const scope={source:'injected-source',rules:'injected-rules',map:'injected-map',army:'injected-army',plan:'injected-plan'};
const copy=value=>JSON.parse(JSON.stringify(value));
const results=[],steps=[];
const record=(stage,input,output)=>steps.push({step:steps.length+1,stage,input:copy(input),output:copy(output)});
async function check(id,fn){
  const passed=prior?.results.find(r=>r.id===id&&r.pass);
  if(passed){results.push({...passed,inheritedFrom:process.argv[3]});return;}
  try{const detail=await fn();results.push({id,pass:true,...detail});}
  catch(error){results.push({id,pass:false,error:error.message,stack:error.stack?.split('\n').slice(0,5)});}
  console.log(JSON.stringify(results.at(-1)));
}
function memoryStore(){let state=null;const artifacts=new Map();return {
  load:async()=>copy(state),save:async value=>{state=copy(value);},
  put:async value=>{const transport=copy(value),ref=hash(transport);artifacts.set(ref,transport);return ref;},
  get:async ref=>{assert.ok(artifacts.has(ref),'Missing artifact '+ref);return copy(artifacts.get(ref));},
  state:()=>copy(state),artifacts,
};}
const fact=(number=1)=>({action:'finish',publicReason:'读取后仅解释指定工具事实',reads:[],findings:[
  {statement:'测试观察值为7',status:'observed',evidenceNumbers:[number],conditions:['注入夹具，不是真实游戏证据']}],});
async function roleHarness(outputs){
  const store=memoryStore(),requests=[];
  const provider={deliberate:async request=>{
    const index=requests.length;requests.push(copy(request));
    const response=copy(typeof outputs==='function'?outputs(request,index):outputs[index]);
    assert.ok(response,'No scripted reply for '+index);
    record('模型请求／注入回复',request,response);
    return {output:response,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,
      sessionId:request.sessionId,roundIndex:request.roundIndex,outputHash:hash(response),
      outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
  }};
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'debug-v856',deliberation:provider});
  let workflow=await createRosterDecisionWorkflowV1({store,execute});
  await workflow.dispatch({type:'initialize',scope});
  await workflow.dispatch({type:'publish_evidence',id:'fact',title:'注入的局部工具观察',kind:'tool_receipt',bindings:scope,conditions:['synthetic'],value:{quantity:7}});
  await workflow.dispatch({type:'enqueue',work:[{id:'fact-role',role:'roster_workflow_fact_summary',bindings:scope,
    inputs:{task:{source:'literal',value:{question:'仅解释已保存的数量，不做新实验'}}}}]});
  return {store,requests,get workflow(){return workflow;},async step(resume=false){
    if(resume)await workflow.dispatch({type:'continue_work',workId:'fact-role'});
    const before=store.state();await workflow.dispatch({type:'run_ready',workIds:['fact-role'],concurrency:1});
    const work=store.state().work.find(w=>w.id==='fact-role');record('真实调度单步',before,work);return work;
  },async cold(){workflow=await createRosterDecisionWorkflowV1({store,execute});}};
}

await check('P2/read-is-normal-tool-handoff',async()=>{
  const h=await roleHarness([fact(),fact()]);
  const first=await h.step();
  assert.equal(first.operationState.evidenceReadHandoffs.length,1);
  const firstResult=first.resultRef?await h.store.get(first.resultRef):null;
  assert.notEqual(firstResult?.value?.acceptanceGranted,true);
  await h.cold();const second=await h.step(true);
  assert.equal(second.status,'evidence_ready',JSON.stringify(second.failure));
  assert.equal(h.requests.length,2,'New evidence still requires one actual consumer decision');
  assert.equal(h.requests[1].promptNodes.some(n=>n.kind==='local_contract_feedback'),false,
    'A successful immutable read is not a model failure');
  assert.ok(h.requests[1].promptNodes.some(n=>n.kind==='evidence_delivery_handoff'));
  assert.equal(second.operationState.correction,null);
  return {providerCalls:0,scriptedCalls:2,coldBoundary:true};
});

await check('P5/semantic-error-survives-read',async()=>{
  const broken={...fact(),findings:[]};
  const h=await roleHarness([broken,fact(),fact()]);
  const one=await h.step();assert.equal(one.operationState.consecutiveCorrections,1);
  const two=await h.step(true);
  assert.equal(two.operationState.consecutiveCorrections,1,'Fetching a citation must not renew a failed conclusion budget');
  const three=await h.step(true);assert.equal(three.status,'evidence_ready',JSON.stringify(three.failure));
  assert.equal(three.operationState.consecutiveCorrections,0,'A validated conclusion closes the correction');
  return {providerCalls:0,scriptedCalls:3};
});

async function claimFixture(answer='观察一是7。观察二是8。观察三是9。只适用于此局部场景。不是整局获胜证明。'){
  const store=memoryStore(),sourceRef=await store.put({quantity:7,second:8,third:9});
  const owner={id:'author',bindings:scope,resultRef:await store.put({value:{experimentConclusion:{answer}}})};
  const projection={id:'view:fact',bindings:scope,value:{sourceEvidenceId:'fact',sourceArtifactRef:sourceRef}};
  const sources=[{projection,originalNumber:1,citedNumbers:[1],kind:'tool_receipt',title:'注入事实'}];
  const state={scope,draftRevision:1,work:[],evidence:[{id:'fact',artifactRef:sourceRef,bindings:scope},
    {id:'role:author',artifactRef:owner.resultRef,bindings:scope}]};
  const root={id:'review',role:'roster_workflow_final_review',bindings:scope,inputs:{
    question:{source:'literal',value:{question:'核对此局部观察'}},
    review:{source:'literal',value:{obligations:[{checkId:'source_fidelity',criterion:'每个数字须忠于原观察'},
      {checkId:'question_coverage',criterion:'只覆盖局部问题'}]}}}};
  const result=await createRosterSourceClaimReviewV1({state,owner,conclusion:{answer},sources,root,store});
  record('来源审核真实任务编译',{answer,root},result);
  return {store,state,owner,result,sources,root,answer};
}

await check('P2/one-source-block-not-one-call-per-sentence',async()=>{
  const f=await claimFixture();
  assert.equal(f.result.materialSegments.map(s=>s.text).join(''),f.answer,'No assertion discarded');
  assert.equal(f.result.materialClaims.length,5,'All five exact assertions remain independently judged');
  assert.equal(f.result.claimReviews.length,1,'Same-source independent checks should share one bounded role task');
  const obligations=f.result.claimReviews[0].inputs.review.value.obligations;
  assert.equal(obligations.length,5);assert.equal(new Set(obligations.map(c=>c.checkId)).size,5);
  assert.ok(f.result.materialClaims.every(c=>obligations.some(o=>o.checkId===c.checkBinding.checkId)));
  return {oldTasks:5,newTasks:f.result.claimReviews.length,assertions:5};
});

await check('P2/batch-self-citation-remains-rejected',async()=>{
  const f=await claimFixture();const job=f.result.claimReviews[0];
  const errors=await rosterReviewProofCitationErrorsV1({inputs:job.inputs,directory:f.state.evidence,
    checks:job.inputs.review.value.obligations.map(o=>({checkId:o.checkId,evidenceNumbers:[2]})),readArtifact:f.store.get});
  assert.equal(errors.length,job.inputs.review.value.obligations.length,'Batching cannot waive independent source proof');
});

await check('P2/new-batch-normal-reply-and-independent-failure',async()=>{
  const f=await claimFixture(),job=f.result.claimReviews[0];
  assert.equal(job.materialClaimBatch.length,5);
  const selfErrors=await rosterReviewProofCitationErrorsV1({inputs:job.inputs,directory:f.state.evidence,
    checks:job.inputs.review.value.obligations.map(o=>({checkId:o.checkId,evidenceNumbers:[2]})),readArtifact:f.store.get});
  assert.equal(selfErrors.length,5,'Every batched check rejects self-citation');
  const store=memoryStore(),requests=[];
  const runner=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'batch-v856',deliberation:{deliberate:async request=>{
    requests.push(copy(request));
    const payload={action:'finish',publicReason:'注入逐项判定，不证明真实内容',reads:[],checks:
      job.inputs.review.value.obligations.map((o,i)=>({checkId:`q${i+1}`,verdict:i===2?'requires_revision':'supported',
        publicReason:'测试判定 '+i,evidenceNumbers:[1],conditions:[],dataQuestions:[]}))};
    record('批量审核实际prompt／注入独立判定',request,payload);
    return {output:payload,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
      roundIndex:request.roundIndex,outputHash:hash(payload),outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
  }}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute:runner});
  await workflow.dispatch({type:'initialize',scope});
  await workflow.dispatch({type:'publish_evidence',id:'fact',title:'注入原件',kind:'tool_receipt',bindings:scope,conditions:['synthetic'],value:{quantity:7,second:8,third:9}});
  await workflow.dispatch({type:'publish_evidence',id:'role:author',title:'待审文本',kind:'proposal',bindings:scope,conditions:['synthetic'],value:{answer:f.answer}});
  await workflow.dispatch({type:'enqueue',work:[job]});
  await workflow.dispatch({type:'run_ready',workIds:[job.id],concurrency:1});
  await workflow.dispatch({type:'continue_work',workId:job.id});
  await workflow.dispatch({type:'run_ready',workIds:[job.id],concurrency:1});
  const done=store.state().work.find(w=>w.id===job.id);
  assert.equal(done.status,'evidence_ready',JSON.stringify(done.failure??done.operationState.correction));
  const verdict=await store.get(done.resultRef);
  assert.deepEqual(verdict.value.checks.map(c=>c.checkId),job.materialClaimBatch.map(b=>b.checkId),'All q-handles map back to original identities');
  f.state.work=[{...job,status:'evidence_ready',resultRef:await f.store.put(verdict)}];
  f.result.resultRef=await f.store.put({value:{checks:[{checkId:'question_coverage',verdict:'supported',publicReason:'注入覆盖通过',evidenceNumbers:[1],dataQuestions:[]}]}});
  const rejected=await assessRosterSourceClaimReviewV1({state:f.state,review:f.result,store:f.store});
  assert.equal(rejected.acceptedForStrategy,false,'Four passes cannot waive a failed claim');
  assert.ok(rejected.failedClaimReviewIds.includes(job.id));
  const good=copy(verdict);good.value.checks[2].verdict='supported';
  f.state.work[0].resultRef=await f.store.put(good);
  const accepted=await assessRosterSourceClaimReviewV1({state:f.state,review:f.result,store:f.store});
  assert.equal(accepted.acceptedForStrategy,true,'Explicit controlled passes compose; not a production approval');
  const duplicate=copy(good);duplicate.value.checks[4]=copy(duplicate.value.checks[0]);
  f.state.work[0].resultRef=await f.store.put(duplicate);
  assert.equal((await assessRosterSourceClaimReviewV1({state:f.state,review:f.result,store:f.store})).acceptedForStrategy,false);
  record('实际主张组合器',{failedCheck:3,duplicateCheck:true},{rejected,accepted});
  return {scriptedCalls:requests.length,actualProviderCalls:0};
});

await check('P2/batch-overflow-is-partitioned-not-truncated',async()=>{
  const f=await claimFixture(Array.from({length:25},(_,i)=>`原件中这个局部观察仍须逐项核对${i+100}。`).join(''));
  assert.equal(f.result.materialClaims.length,25);
  assert.equal(f.result.claimReviews.length,3);
  assert.equal(f.result.claimReviews.reduce((n,j)=>n+j.inputs.review.value.obligations.length,0),25);
  assert.equal(f.result.materialSegments.map(s=>s.text).join(''),f.answer);
  return {assertions:25,tasks:3,noTruncation:true};
});

await check('P3/unknown-not-negative-and-no-full-match',async()=>{
  const unresolved=projectRosterUnresolvedQueryReturnV1({operation:'probability',receipt:{resultStatus:'unknown',unknownReason:'no_supported_attack'}});
  assert.equal(unresolved.factAnswered,false);assert.equal(unresolved.nativeRetryAuthorized,false);
  const order={orderId:'forbidden',purpose:'注入越界方法',scenarioAssumptions:[],completionStepId:'scene',
    experimentScope:{kind:'fixed_scenario_tactic',decisionQuestion:'局部问题',decisionImpact:'局部Plan',participantUnitIds:[],scenarioDescription:'注入',stopPredicate:'此局部结束',collectScenarioExperience:false,hypothesisTest:null,comparisonBinding:null},
    stopAndReturnToModelWhen:'局部结束',steps:[{stepId:'scene',operation:'scenario',argumentsJson:JSON.stringify({spec:{kind:'rules_lifecycle',lifecycleSteps:2}}),bindings:[],guards:[],publicReason:'测试禁止多回合模拟'}]};
  assert.throws(()=>compileRosterWorkflowExperimentV1({order,scope,namespace:'offline'}),/ROSTER_EXPERIMENT_AUTOMATIC_LIFECYCLE_FORBIDDEN/);
  record('未知与越界控制返回',{order},{unresolved,notExecuted:true});
  return {nativeCalls:0,productionWrites:0};
});

await check('P4/actual-joint-commit-not-author-prose',async()=>{
  assert.ok(savedDraft,'Read-only current draft fixture required');
  const original=JSON.parse(await fs.readFile(savedDraft,'utf8'));
  const makeMutation=()=>({unitsToUpsert:[],unitIdsToRemove:[],tacticalCardRecordKeys:null,rosterBranchSelection:null,rosterCandidateSelection:null,
    plan:Object.fromEntries(Object.keys(ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1.properties.plan.properties).map(k=>[k,null])),retainedSectionReasons:[]});
  let audits=0;const builderPort={evaluateRosterCandidate:()=>{audits++;return {status:'legal',auditResultHash:hash('injected-audit'),verdictHash:hash('injected-verdict'),summary:{mineralSpent:2000,vespeneSpent:170}};}};
  for(const mode of ['fixed','editable']){
    const draft={...copy(original),mode},before=copy(draft),mutation=makeMutation();
    const prose=applyRosterWorkflowDraftV1({draft,expectedRevision:draft.revision,mutation,publicReason:'我已采纳一个新表（故意只说不操作）',builderPort});
    assert.equal(prose.applied,false);assert.deepEqual(draft,before);
    mutation.plan.publicSummaryText='离线注入：根据局部反例修正计划；不是策略改善证明。';
    const actual=applyRosterWorkflowDraftV1({draft,expectedRevision:draft.revision,mutation,publicReason:'明确Plan变更',builderPort});
    assert.equal(actual.applied,true);assert.equal(actual.receipt.armyChanged,false);assert.equal(actual.receipt.acceptanceGranted,false);
    assert.equal(actual.draft.plan.planVersion,draft.plan.planVersion+1);
    assert.throws(()=>applyRosterWorkflowDraftV1({draft:actual.draft,expectedRevision:draft.revision,mutation,publicReason:'过期',builderPort}),/STALE_REVISION/);
    record('军表／Plan真实提交函数（Builder回执注入）',{mode,mutation,beforeRevision:draft.revision},actual.receipt);
  }
  assert.equal(audits,4);return {injectedBuilder:true,productionWrites:0,productionPlansAccepted:0};
});

const report={schema:'slice272_step_debug_v856',generatedAt:new Date().toISOString(),
  passed:results.every(r=>r.pass),actualProviderCalls:0,productionWrites:0,productionPlansAccepted:0,
  scope:'Production seams and scripted communication, NOT full product or strategy acceptance',results,steps};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,passed:report.passed,passedCount:results.filter(r=>r.pass).length,total:results.length}));
if(!report.passed)process.exitCode=1;
