// Actual B/r19 read firstRoundInitialization but claimed no usable capability.
// A negative capability claim must receive source checking before author handoff.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterExperimentSourceReviewV1,assessRosterExperimentConclusionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const remainingOnly=process.argv[4]==='remaining';
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const originalOwner=original.work.find(w=>w.id==='product:after-teach:r19:subject-v1:investigation');
  const commit=original.events.find(e=>e.type==='draft_committed'&&e.revision===19);
  const memory=new Map(),cache=new Map();
  let state={...copy(original),scope:copy(originalOwner.bindings),draftRevision:19,draftRef:commit.draftRef,events:[],
    evidence:original.evidence.filter(e=>e.id!=='question-directory:'+originalOwner.id),
    work:[{...copy(originalOwner),status:'evidence_ready',investigationHandoff:undefined,operationState:null}]};
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    get:async ref=>{if(memory.has(ref))return copy(memory.get(ref));if(!cache.has(ref))cache.set(ref,
      JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));return copy(cache.get(ref));},
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const owner=state.work[0],result=await store.get(owner.resultRef);
  assert.equal(result.value.experimentConclusion.status,'blocked');
  const review=await createRosterExperimentSourceReviewV1({state,owner,result,store});
  if(!remainingOnly){
  assert(review,'Actual blocked capability interpretation bypasses independent source review');
  assert.equal(review.capabilityBlockerResultRef,owner.resultRef);
  assert.equal(review.inputs.review.value.blockedClaimReviewVersion,1);
  assert.match(JSON.stringify(review),/unread|unavailable/);
  report.checks.push('actual_blocked_answer_has_scoped_source_review_not_automatic_handoff');
  const before=await assessRosterExperimentConclusionV1({state,owner,store});
  assert.equal(before.status,'awaiting_source_review');assert.equal(before.acceptedForStrategy,false);
  }
  const laboratory={labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'v946-no-native',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){throw Error('NO_NATIVE_EXECUTION');}};
  const options={workflowStore:store,laboratory,scope:state.scope,sessionId:'v946-blocked-source',
    deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}};
  let run;
  if(remainingOnly){
    // Reconstruct only the already-proven queued-review boundary in memory.
    // Do not repeat the four passed checks or their Run synchronization.
    const {sourceProjections,...job}=review;
    for(const projection of sourceProjections)if(!state.evidence.some(e=>e.id===projection.id)){
      const {value,...entry}=projection;state.evidence.push({...entry,artifactRef:await store.put(value)});
    }
    state.work.push({...job,status:'ready'});
  }else{
    run=await createRosterDecisionWorkspaceRunV1(options);
    await run.summarizeExperiment({id:'v946:sync',question:'Unexecuted synchronization probe',toolWorkIds:[]});
  }
  const queued=state.work.find(w=>w.capabilityBlockerResultRef===owner.resultRef);
  if(!remainingOnly){
  assert(queued);assert.equal(state.work.filter(w=>w.role==='roster_workflow_strategy_decision').length,0);
  assert.equal(state.work.find(w=>w.id===owner.id).investigationHandoff,undefined);
  report.checks.push('public_Run_waits_for_negative_claim_review_before_strategic_return');
  }
  const baseline=copy(state);
  const reviewed={kind:'proposal',conditions:['Injected scoped public source review; not Plan approval'],value:{publicReason:'Injected independent source verdict',checks:[
    {checkId:'source_fidelity',verdict:'supported',requiredData:[],requiredDecisions:[],evidenceRefs:result.value.experimentConclusion.evidenceRefs},
    {checkId:'question_coverage',verdict:'supported',requiredData:[],requiredDecisions:[],evidenceRefs:result.value.experimentConclusion.evidenceRefs}]}};
  let selected;
  if(!remainingOnly){
  selected=state.work.find(w=>w.id===queued.id);selected.status='evidence_ready';selected.resultRef=await store.put(reviewed);
  const accepted=await assessRosterExperimentConclusionV1({state,owner,store});
  assert.equal(accepted.status,'blocked');assert.equal(accepted.capabilityBlockerVerified,true);
  assert.equal(accepted.acceptedForStrategy,false);
  report.checks.push('verified_blocker_remains_blocked_and_never_becomes_an_answer_or_Plan_pass');
  selected.capabilityBlockerResultRef='wrong-original';
  assert.equal((await assessRosterExperimentConclusionV1({state,owner,store})).capabilityBlockerVerified,false);
  report.checks.push('wrong_original_verdict_is_not_reused');
  }
  state=copy(baseline);selected=state.work.find(w=>w.id===queued.id);
  reviewed.value.checks[0]={...reviewed.value.checks[0],verdict:'requires_revision',
    publicReason:'The original contract contains firstRoundInitialization; an initial pending scene is not a capability absence.'};
  selected.status='evidence_ready';selected.resultRef=await store.put(reviewed);
  assert.equal((await assessRosterExperimentConclusionV1({state,owner,store})).status,'requires_revision');
  run=await createRosterDecisionWorkspaceRunV1(options);
  await run.summarizeExperiment({id:'v946:rejected',question:'Unexecuted synchronization probe',toolWorkIds:[]});
  const repair=state.work.find(w=>w.experimentReviewOf===owner.id);
  assert(repair);assert.equal(repair.inputs.sourceReview.id,'role:'+queued.id);
  assert.equal(repair.inputs.rejectedConclusion.id,'role:'+owner.id);
  assert.equal(state.work.filter(w=>w.role==='roster_workflow_strategy_decision').length,0);
  assert.equal(state.draftRef,commit.draftRef);assert.equal(state.work.find(w=>w.id===owner.id).resultRef,owner.resultRef);
  report.checks.push('negative_claim_rejection_returns_exact_feedback_to_fact_owner_without_Plan_or_source_rewrite');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack?.split('\n').slice(0,7);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
