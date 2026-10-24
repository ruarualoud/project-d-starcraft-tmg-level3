// Concrete P2/P4 regression: completed comparison + owner choice disappeared
// from the next overall decision. Real saved state, isolated memory writes,
// scripted Provider only. These results are not strategic-effectiveness proof.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {loadRosterProductHypothesisChallengeV1,assessRosterProductHypothesisCycleV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const base=process.argv[2],previous=process.argv[3];
const before=await fs.readFile(base+'/workflow.json','utf8'),original=JSON.parse(before);
const read=async ref=>JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8'));
const draft=await read(original.draftRef),cycle=await assessRosterProductHypothesisCycleV1({state:original,draft,readArtifact:read});
assert.equal(cycle.comparisonResolved,true);assert.equal(cycle.ownerReturned,true);
const targetId='product:after-teach:r4:subject-v1';
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,results=[];
async function check(name,fn){const done=prior?.results.find(x=>x.name===name&&x.pass);if(done){results.push({...done,inheritedFrom:previous});return;}
  if(process.argv[4]&&!name.includes(process.argv[4])){results.push({...prior.results.find(x=>x.name===name),inheritedFrom:previous});return;}
  try{const detail=await fn();results.push({name,pass:true,...detail});}catch(e){results.push({name,pass:false,error:e.message,stack:e.stack?.split('\n').slice(0,4)});}
  console.log(JSON.stringify(results.at(-1)));}
const clone=x=>structuredClone(x);
async function context(state=original,currentDraft=draft,role='roster_workflow_strategy_decision'){
  return loadRosterProductHypothesisChallengeV1({state,draft:currentDraft,readArtifact:read,role});
}
async function assertCurrent(value){
  const memory=value?.comparisonMemory;assert(memory,'completed comparison must accompany the original challenge');
  assert.equal(memory.ownerReturned,true);assert.equal(memory.comparisonResolved,true);
  assert.equal(memory.strategyImprovementProven,false);assert.equal(memory.acceptanceGranted,false);
  assert.equal(memory.experiment.resultRef,cycle.comparisonExperimentResultRef);
  assert.deepEqual(memory.experiment.conclusion,(await read(cycle.comparisonExperimentResultRef)).value.experimentConclusion);
  assert.deepEqual(memory.owner.decision,(await read(cycle.outcomeRef)).decision);
  assert.equal(memory.owner.outcomeRef,cycle.outcomeRef);
  assert.equal(memory.review.resultRef,cycle.comparisonReviewResultRef);
  assert.deepEqual(memory.review.checks,(await read(cycle.comparisonReviewResultRef)).value.checks);
  assert.equal(memory.experiment.conclusion.hypothesisAssessments[0].verdict,'inconclusive');
  assert.doesNotMatch(value.instruction,/Consider its concrete comparison NOW/u);
}
await check('真实产品下一决策：完整比较、限制和作者取舍进入最终请求',async()=>{
  let state=clone(original);const memory=new Map();let request;
  for(const w of state.work){if(w.id===targetId){w.status='ready';w.resultRef=null;w.draftOutcomeRef=null;w.failure=null;w.operationState=null;}
    else if(!['evidence_ready','superseded'].includes(w.status))w.status='superseded';}
  const store={load:async()=>clone(state),save:async x=>{state=clone(x);},get:async r=>memory.has(r)?clone(memory.get(r)):read(r),
    put:async x=>{const r=createHash('sha256').update(JSON.stringify(x)).digest('hex');memory.set(r,clone(x));return r;}};
  const candidates=new Map();
  for(const event of state.events.filter(e=>e.type==='result_saved')){
    const work=state.work.find(w=>w.id===event.workId);
    if(work?.inputs.request?.value?.operation!=='candidate_context')continue;
    const value=(await read(event.resultRef)).value,receipt=value.receipt?.resultStatus==='ok'?value.receipt:value.detail?.candidateReceipt;
    if(receipt)candidates.set(JSON.stringify(receipt.candidateInput),receipt);
  }
  const laboratory=descriptor=>({labDescriptor:()=>descriptor,restoreHypotheticalBranch:async()=>{},
    restoreFormationSelectionBranch:async()=>{},restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}});
  const savedCandidate=candidate=>{const receipt=candidates.get(JSON.stringify(candidate));assert(receipt,'restore only saved candidate');return receipt;};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:'synthetic-v830-no-network',
    laboratory:laboratory({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    createCandidateLaboratory:async candidate=>laboratory(savedCandidate(candidate).laboratory),
    builderPort:{evaluateRosterCandidate:candidate=>clone(savedCandidate(candidate).audit)},
    deliberation:{deliberate:async r=>{assert.equal(r.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId,targetId);request=r;
      throw Object.assign(Error('SYNTHETIC_CAPTURE_NO_PROVIDER_DISPATCH'),{dispatchOutcome:'not_dispatched'});}}});
  await run.advance({concurrency:1});assert(request,'actual product must reach the next role');
  await assertCurrent(request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.strategicHypothesisChallenge?.value);
  assert.equal(state.draftRef,original.draftRef);assert.equal(state.acceptanceGranted,false);
  return {requestCharacters:JSON.stringify(request).length};
});
await check('共用投影保留逐字结论、未知、原件和独立比较范围',async()=>{await assertCurrent(await context());});
for(const role of ['roster_workflow_local_teach','roster_workflow_experiment_planner'])await check('角色可读且不越权：'+role,async()=>{
  const value=await context(original,draft,role);await assertCurrent(value);assert.equal(value.consumerRole,role);
  assert.equal(value.mayAdoptStrategy,false);
});
for(const role of ['roster_workflow_final_review','roster_workflow_fact_summary','roster_workflow_tool'])await check('非规划角色不自动注入历史判断：'+role,async()=>{
  assert.equal(await context(original,draft,role),null);
});
for(const field of ['army','map','rules','source'])await check('跨版本不冒充当前：'+field,async()=>{
  const changed=clone(original);changed.scope[field]+='-injected-change';assert.equal(await context(changed),null);
});
await check('仅Plan修订保留实验和取舍但不冒充新Plan已审核',async()=>{
  const changed=clone(original);changed.scope.plan='new-plan-only';changed.draftRevision=draft.revision+1;
  const value=await context(changed,{...draft,revision:draft.revision+1});
  assert.equal(value.comparisonMemory.experiment.resultRef,cycle.comparisonExperimentResultRef);
  assert.equal(value.comparisonMemory.owner.outcomeRef,cycle.outcomeRef);
  assert.equal(value.comparisonMemory.comparisonResolved,false);
  assert.equal(value.comparisonMemory.owner.appliesToCurrentPlan,false);
  assert.equal(value.comparisonMemory.acceptanceGranted,false);
});
await check('未完成审核不能因旧resultRef存在而当已完成',async()=>{
  const changed=clone(original);changed.work.find(w=>w.id===cycle.comparisonReviewWorkId).status='running';
  const value=await context(changed);assert.equal(value.comparisonMemory.comparisonResolved,false);
  assert.equal(value.comparisonMemory.review,null);assert.equal(value.comparisonMemory.ownerReturned,true);
});
await check('未完成实验不发布旧结论为当前结果',async()=>{
  const changed=clone(original);changed.work.find(w=>w.id===cycle.comparisonExperimentOwnerWorkId).status='running';
  const value=await context(changed);assert.equal(value.comparisonMemory.experiment,null);
  assert.equal(value.comparisonMemory.ownerReturned,false);assert.equal(value.comparisonMemory.comparisonResolved,false);
});
await check('已提案但未正式产生作者outcome不冒充已采纳',async()=>{
  const changed=clone(original);for(const w of changed.work)if(w.role==='roster_workflow_strategy_decision')w.draftOutcomeRef=null;
  const value=await context(changed);assert.equal(value.comparisonMemory.ownerReturned,false);assert.equal(value.comparisonMemory.owner,null);
});
await check('正式原记录、军表、费用保持原样',async()=>{assert.equal(await fs.readFile(base+'/workflow.json','utf8'),before);});
const output={schema:'slice272_comparison_memory_fault_campaign_v830',status:results.every(x=>x.pass)?'passed':'failed',
  originalRun:base,originalEvent:original.events.at(-1)?.sequence,results,providerCalls:0,nativeCalls:0,productionWrites:0,
  syntheticModelResponsesAreNotStrategyEvidence:true};
const file=`build/slice272-v830-comparison-memory-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(output,null,2));
console.log(JSON.stringify({file,status:output.status,passed:results.filter(x=>x.pass).length,total:results.length}));
if(output.status==='failed')process.exitCode=1;
