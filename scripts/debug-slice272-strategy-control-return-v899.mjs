// Reproduce B's real completed strategic decision stranded behind unrelated
// pending questions. Exercise the product scheduler AND core, never a Provider.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowFrontierReturnsV1} from '../packages/roster-strategist/roster-workflow-frontier-return-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {assessRosterExperimentConclusionV1,createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
let state=clone(original);const memory=new Map();
const get=async ref=>memory.has(ref)?clone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>clone(state),save:async s=>{state=clone(s);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,clone(value));return ref;}};
const frontier=original.work.find(w=>w.resultRef==='190deeb446e44aa24932e090a505d9a789ec210a0b5fd1c9af85939c40495359');
assert.ok(frontier,'real B decision fixture');
const owner=original.work.find(w=>w.id===frontier.investigationOwnerId);
const goal=original.work.find(w=>w.id===frontier.investigationFrontierOf);
const response=await get(frontier.resultRef),outcome=await get(frontier.draftOutcomeRef);
const report={pass:false,checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  assert.ok(response.value.decisions[0].requiredData.length>0);
  const jobs=await createRosterWorkflowFrontierReturnsV1({state,readArtifact:get});
  const job=jobs.find(j=>j.resumesStrategyFrontierOf===frontier.id);
  assert.ok(job,'a completed local strategic choice must return without certifying global facts');
  const contract=job.inputs.scopedStrategyReturn.value;
  assert.equal(contract.factsApproved,false);
  assert.equal(contract.questionResolutionGranted,false);
  assert.equal(contract.parentReviewStillRequired,true);
  assert.deepEqual(contract.originalQuestions,frontier.inputs.investigationFrontier.value.unresolvedQuestions);
  assert.equal(job.experimentReviewRound,owner.experimentReviewRound??0);
  assert.equal(job.inputs.strategyResolution.id,'role:'+frontier.id);
  assert.equal(job.inputs.sameSourceReviewRequest,undefined,'old edge-specific recheck permission must not leak into a new ordinary return');
  const execute=async()=>{throw Error('No Provider or Native execution permitted');};
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  const forged=clone(job);forged.inputs.scopedStrategyReturn.value.factsApproved=true;
  await assert.rejects(workflow.dispatch({type:'enqueue',work:[forged]}),/ROSTER_WORKFLOW_STRATEGY_RETURN_INVALID/);
  await workflow.dispatch({type:'enqueue',work:[job]});
  assert.ok(state.work.some(w=>w.id===job.id));
  assert.equal(state.draftRef,original.draftRef);
  assert.equal(state.acceptanceGranted,original.acceptanceGranted);
  assert.deepEqual(await get(frontier.resultRef),response,'original questions and author claims unchanged');
  assert.deepEqual(await get(frontier.draftOutcomeRef),outcome,'pending ledger is not erased');
  const cold=await createRosterDecisionWorkflowV1({store,execute});
  assert.ok(cold);
  assert.ok(!(await createRosterWorkflowFrontierReturnsV1({state,readArtifact:get})).some(j=>j.resumesStrategyFrontierOf===frontier.id),'cold restoration must not repeat this return');
  // A scripted answered label on the returned task is not source acceptance.
  const returned=state.work.find(w=>w.id===job.id);
  const candidate=clone(await get(owner.resultRef));
  candidate.value.experimentConclusion.status='answered';
  returned.resultRef=await store.put(candidate);returned.status='evidence_ready';
  const assessment=await assessRosterExperimentConclusionV1({state,owner:returned,store});
  assert.equal(assessment.acceptedForStrategy,false);
  const review=await createRosterExperimentSourceReviewV1({state,owner:returned,result:candidate,store});
  assert.ok(review&&review.experimentSourceReviewOf===returned.id,'independent source/coverage review still required');
  report.checks.push({name:'real-strategy-response-returns-without-factual-or-release-approval',pass:true,
    originalQuestion:contract.originalQuestions,remainingFacts:response.value.decisions[0].requiredData.length,
    reviewId:review.id,reviewNotExecuted:true,coreRejectsForgedApproval:true,coldIdempotent:true});
  for(const kind of ['new_investigation','no_explicit_choice','pending_dispatch','source_review_challenge']){
    const bad=clone(original),decision=clone(response),ownResult=clone(await get(owner.resultRef));
    if(kind==='new_investigation')decision.value.decisions[0].nextInvestigation={questionNumbers:[1],publicReason:'New bounded inquiry'};
    if(kind==='no_explicit_choice')decision.value.decisions[0].decidedHere=[];
    if(kind==='pending_dispatch')bad.work.find(w=>w.id===frontier.id).operationState={pending:true};
    if(kind==='source_review_challenge')ownResult.value.coordination={kind:'source_interpretation_challenge',diagnostic:{questions:contract.originalQuestions}};
    const actual=await createRosterWorkflowFrontierReturnsV1({state:bad,readArtifact:async ref=>
      ref===frontier.resultRef?decision:ref===owner.resultRef?ownResult:get(ref)});
    assert.ok(!actual.some(j=>j.resumesStrategyFrontierOf===frontier.id),kind);
  }
  report.checks.push({name:'no-new-inquiry-or-source-review-bypass',pass:true,negativeCases:4});
  assert.deepEqual(JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),original);
  report.pass=true;
}catch(error){report.error={message:error.message,code:error.code,stack:error.stack?.split('\n').slice(0,5)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
