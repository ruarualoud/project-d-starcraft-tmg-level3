// Real B answered its one source dispute but retained unrelated map unknowns.
// Trace the same product return into independent source review without calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowFrontierReturnsV1} from '../packages/roster-strategist/roster-workflow-frontier-return-v1.mjs';
import {rosterSourceReviewRepairStageV1,rosterSourceRepairInformationErrorV1} from '../packages/roster-strategist/roster-experiment-source-repair-v1.mjs';
import {createRosterExperimentSourceReviewV1,assessRosterExperimentConclusionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
let state=clone(original);const memory=new Map();
const get=async ref=>memory.has(ref)?clone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>clone(state),save:async s=>{state=clone(s);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,clone(value));return ref;}};
const frontier=original.work.find(w=>w.resultRef==='544a0271fef7955c4cb34e613cf8bdf90bdc3b5b43c1fbc8164ab2574bb8fd27');
const owner=original.work.find(w=>w.id===frontier.investigationOwnerId);
const goal=original.work.find(w=>w.id===frontier.investigationFrontierOf);
const decision=(await get(frontier.resultRef)).value.decisions[0];
const question=frontier.inputs.investigationFrontier.value.unresolvedQuestions[0];
const report={pass:false,checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const jobs=await createRosterWorkflowFrontierReturnsV1({state,readArtifact:get});
  const job=jobs.find(j=>j.experimentGoalId===goal.id);
  assert.ok(job,'completed local response must return despite unrelated global pending facts');
  assert.equal(job.experimentReviewRound,owner.experimentReviewRound,'source review budget must survive return');
  assert.deepEqual(job.inputs.sameSourceReviewRequest.value.questions.map(q=>q.question),[question]);
  assert.equal(job.inputs.sameSourceReviewRequest.value.factsApproved,false);
  assert.equal(job.inputs.sameSourceReviewRequest.value.parentReviewStillRequired,true);
  const delivered=clone(job.inputs);
  for(const input of Object.values(delivered))if(input.source==='evidence'){
    const e=state.evidence.find(e=>e.id===input.id);assert.ok(e,input.id);
    input.value=await get(e.artifactRef);input.evidenceId=e.id;input.status='read';input.validity='current';input.kind=e.kind;
  }
  const stage=rosterSourceReviewRepairStageV1(delivered);
  assert.equal(stage.phase,'source_claim_correction');
  assert.ok(stage.necessaryQuestions.some(q=>q.question===question),'recheck is not factual closure');
  const source=(await get(owner.resultRef)).value.coordination.proposedConclusion;
  const output={action:'conclude',conclusion:source};
  const directory=state.evidence.map((e,i)=>({...e,number:i+1}));
  assert.equal(await rosterSourceRepairInformationErrorV1({stage,output,inputs:delivered,directory,store}),null);
  const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('No Provider/Native execution');}});
  await workflow.dispatch({type:'enqueue',work:[job]});
  assert.ok(state.work.some(w=>w.id===job.id),'actual core accepts the scoped return');
  // Inject a candidate answer only; absence of independent review must deny acceptance.
  const returned=state.work.find(w=>w.id===job.id);
  const refs=source.evidenceNumbers.map(n=>({id:directory[n-1].id,artifactRef:directory[n-1].artifactRef}));
  const result={kind:'proposal',value:{experimentConclusion:{...clone(source),evidenceRefs:refs},workOrders:[],failedWorkOrders:[],unresolvedQuestions:[]}};
  returned.resultRef=await store.put(result);returned.status='evidence_ready';
  const assessment=await assessRosterExperimentConclusionV1({state,owner:returned,store});
  assert.equal(assessment.acceptedForStrategy,false);
  const review=await createRosterExperimentSourceReviewV1({state,owner:returned,result,store});
  assert.ok(review&&review.experimentSourceReviewOf===returned.id);
  assert.equal(state.draftRef,original.draftRef);
  assert.ok(decision.requiredData.length>0&&decision.nextInvestigation===null);
  report.checks.push({name:'local-response-to-independent-review-with-global-unknowns-preserved',pass:true,
    originalQuestion:question,sourceReviewRound:job.experimentReviewRound,reviewId:review.id,reviewNotYetRun:true});
  // A pending local fact, an explicit new investigation, or a reused request
  // cannot use this new partial-return path.
  for(const kind of ['pending_local_fact','explicit_investigation','already_requested']){
    const bad=clone(original);let resultOverride;
    if(kind==='already_requested')bad.work.push({...clone(job),id:'already-requested',status:'evidence_ready'});
    else{
      resultOverride=clone(await get(frontier.resultRef));const d=resultOverride.value.decisions[0];
      if(kind==='pending_local_fact')d.dataQuestions.find(q=>q.question===question).classification='necessary_fact';
      else d.nextInvestigation={questionNumbers:[1],publicReason:'explicit new investigation'};
    }
    const actual=await createRosterWorkflowFrontierReturnsV1({state:bad,
      readArtifact:async ref=>ref===frontier.resultRef&&resultOverride?resultOverride:get(ref)});
    assert.ok(!actual.some(j=>j.experimentGoalId===goal.id),kind);
  }
  assert.deepEqual(JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),original);
  report.checks.push({name:'pending-local-or-explicit-next-work-not-overridden',pass:true,negativeCases:3});
  report.pass=true;
}catch(error){report.error={message:error.message,code:error.code,stack:error.stack?.split('\n').slice(0,5)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
