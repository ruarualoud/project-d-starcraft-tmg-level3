// Actual B preflight -> narrow factual inquiry -> source review -> SAME design.
// Scripted answers only; no production state, paid calls or Native execution.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [reportFile,directory,priorFile]=process.argv.slice(2),copy=structuredClone;
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null;
const source=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const readSource=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const draft=await readSource(source.draftRef),results=[],steps=[];
async function check(id,fn){
  const old=prior?.results.find(r=>r.id===id&&r.pass);if(old){results.push({...old,inheritedFrom:priorFile});return;}
  try{results.push({id,pass:true,...await fn()});}catch(e){results.push({id,pass:false,error:e.message,stack:e.stack?.split('\n').slice(0,5)});}
  console.log(JSON.stringify(results.at(-1)));
}
async function classified(){return assessRosterProductHypothesisCycleV1({state:source,draft,readArtifact:readSource});}
async function inquiryRequest(){
  const cycle=await classified(),calls=[];
  await progressRosterProductComparisonV1({run:new Proxy({},{get:(_,name)=>async args=>{calls.push({name,args});}}),state:source,draft,cycle});
  steps.push({kind:'preflight_next_stage',cycle,calls});
  assert.equal(calls.length,1);assert.equal(calls[0].name,'requestExperiment','Facts require inquiry, not another design rewrite');
  return {cycle,request:calls[0].args};
}
await check('real-B-two-missing-facts-route-to-investigation-not-design-v4',async()=>{
  const {cycle,request}=await inquiryRequest();
  assert.equal(cycle.comparisonStopped,false);
  assert.equal(cycle.comparisonPreflightAccepted,false);
  assert.equal(request.inputs.preflightPrerequisites.value.questions.length,2);
  assert.equal(request.inputs.preflightPrerequisites.value.sourceReviewWorkId,cycle.comparisonPreflightWorkId);
  assert.equal(request.inputs.comparisonPurpose,undefined,'Prerequisite inquiry must not inherit the whole comparison obligation');
  return {questions:request.inputs.preflightPrerequisites.value.questions,designUnchanged:true};
});
await check('fact-answer-needs-independent-review-before-same-design-recheck',async()=>{
  const {cycle,request}=await inquiryRequest(),artifacts=new Map();let state=copy(source);
  const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
    put:async value=>{const ref=hash(value);artifacts.set(ref,copy(value));return ref;},
    get:async ref=>artifacts.has(ref)?copy(artifacts.get(ref)):readSource(ref)};
  const owner={id:request.id,role:'roster_workflow_experiment_planner',experimentGoalId:request.id,
    status:'evidence_ready',bindings:copy(source.scope),inputs:copy(request.inputs),
    resultRef:await store.put({kind:'proposal',value:{experimentConclusion:{status:'answered',answer:'注入：两条前置事实分别有来源回答',evidenceRefs:[]},unresolvedQuestions:[]}})};
  state.work.push(owner);
  const assess=()=>assessRosterProductHypothesisCycleV1({state,draft,readArtifact:store.get});
  let pending=await assess();assert.equal(pending.comparisonPrerequisites?.accepted,false);
  const review={id:owner.id+':source-review:v2',role:'roster_workflow_final_review',experimentSourceReviewOf:owner.id,
    status:'evidence_ready',bindings:copy(owner.bindings),inputs:{},resultRef:await store.put({kind:'proposal',value:{checks:
      ['source_fidelity','question_coverage'].map(checkId=>({checkId,verdict:'supported',dataQuestions:[],publicReason:'注入的独立来源/覆盖审核；不计真实事实证据'}))}})};
  state.work.push(review);
  for(const work of [owner,review])state.evidence.push({id:'role:'+work.id,title:'Injected prerequisite boundary',kind:'proposal',
    bindings:work.bindings,artifactRef:work.resultRef,conditions:['Offline injected source verdict, not real Rules proof'],availability:'available'});
  const after=await assess();assert.equal(after.comparisonPrerequisites?.accepted,true);
  assert.equal(after.comparisonPreflightAccepted,false,'Facts do not approve experiment design');
  const laboratory={labDescriptor:()=>({sourceStateHash:source.scope.source,rulesRuntimeHash:source.scope.rules,builderBundleHash:hash('fixture')})};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope:source.scope,sessionId:'v868-offline',
    createDraftContext:async()=>({scope:source.scope,laboratory}),deliberation:{deliberate:async()=>{throw Error('No Provider call');}}});
  const out=await progressRosterProductComparisonV1({run,state:copy(state),draft,cycle:after});
  assert.equal(out.scheduled.length,1);
  const next=(await run.inspect()).work.find(w=>w.id===out.scheduled[0]);
  assert.equal(next.role,'roster_workflow_final_review');
  assert.equal(next.comparisonPurposeResultRef,cycle.comparisonPurposeResultRef);
  assert.equal(next.designReviewRound,3,'No design version or previous failure counter reset');
  assert.equal(next.prerequisiteReviewRound,1);
  assert.equal(next.inputs.prerequisiteFacts.id,'role:'+owner.id);
  assert.equal(next.inputs.prerequisiteFactsReview.id,'role:'+review.id);
  assert.equal((await run.currentDraft()).revision,draft.revision);
  steps.push({kind:'source_review_then_preflight',owner,review,next});
  // Forged or stale return cannot enter the recheck API.
  await assert.rejects(()=>run.requestStrategicComparisonDesignReview({id:'forged-recheck',cycleId:cycle.id,
    purposeWorkId:cycle.comparisonPurposeWorkId,purposeResultRef:cycle.comparisonPurposeResultRef,designReviewRound:3,
    prerequisiteReturn:{...after.comparisonPrerequisites,sourceReviewWorkId:'unrelated'}}));
  return {providerCalls:0,nativeCalls:0,designUnchanged:true,armyPlanUnchanged:true};
});
await fs.writeFile(reportFile,JSON.stringify({passed:results.every(r=>r.pass),results,steps,providerCalls:0,nativeCalls:0,productionWrites:0,formalPlans:0},null,2)+'\n');
if(results.some(r=>!r.pass))process.exitCode=1;
