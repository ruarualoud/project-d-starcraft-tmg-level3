// Concrete integration gaps after v991: no HTTP control route, and the product
// loop treats an explicitly held/handed-off stop as an active global failure.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {createRosterPlanningWorkspaceHttpAdapterV1,ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix}
  from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
const directory=await fs.mkdtemp(path.join(process.cwd(),'build/slice272-product-no-progress-v992-'));
const scope={army:'a'.repeat(64)},base={bindings:scope,inputs:{}};
const state={schema:'roster_decision_workflow_v1',scope,draftRevision:1,draftRef:'d'.repeat(64),
  work:[{...base,id:'goal',role:'roster_workflow_experiment_planner',status:'evidence_ready',experimentGoalId:'goal',
    investigationHandoff:{decisionId:'author',reportRef:'handoff'}},
  {...base,id:'method',role:'roster_workflow_experiment_planner',status:'evidence_ready',experimentGoalId:'goal'},
  {...base,id:'summary',role:'roster_workflow_fact_summary',status:'needs_repair',experimentOwnerId:'method',
    failure:{code:'ROSTER_WORKFLOW_ROLE_NO_PROGRESS'},operationState:{noProgressStop:{reason:'repeated_inspection_only_batch'}},
    noProgressHandoffRef:'handoff'},
  {...base,id:'author',role:'roster_workflow_strategy_decision',status:'ready',investigationFrontierOf:'goal'}],
  evidence:[{id:'product:builder-menu'}],events:[]};
const draft={revision:1,mode:'editable',plan:null,candidateInput:{units:[],mineralBudget:2000,scaleId:'Standard'}};
let advanceCount=0,handoffCalls=[],entered,release;
const reached=new Promise(r=>{entered=r;}),continueStep=new Promise(r=>{release=r;});
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
  readiness:async()=>({activeWork:[{id:'author'}],mechanicalReady:false,mechanicalBlockers:[]}),
  reconsiderParticipantConfiguration:async()=>({scheduled:[]}),
  readArtifact:async()=>{throw Error('UNEXPECTED_ARTIFACT_READ');},
  handoffRepeatedInspection:async input=>{handoffCalls.push(structuredClone(input));return {
    decisionId:'author',reportRef:'handoff',planApproved:false,alreadyHeld:handoffCalls.length>1};},
  advance:async()=>{if(++advanceCount===2){entered();await continueStep;}return {state:structuredClone(state),ran:['author']};},
  finalAssessment:async()=>({readyForRelease:false,stoppedReviewDomains:[]})};
const journey=await createRosterDecisionProductJourneyV1({directory,openWorkflow:async()=>run,
  prepareSeed:async()=>({mode:'editable',setup:{factionRecordKey:'test',opponentFactionRecordKey:'test'},candidateInput:draft.candidateInput}),
  liveAvailable:()=>true});
const adapter=createRosterPlanningWorkspaceHttpAdapterV1({service:{descriptor:()=>({}),startPlanning:async()=>{}},decisionJourney:journey});
const created=await journey.create({}),id=created.workflowId,checks=[];
const check=async(name,fn)=>{try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message});}
  console.log(JSON.stringify({completedGate:checks.at(-1)}));};
const policy={authorizationId:'standing-user-post-fix',workId:'summary',expectedOwnerResultRef:'b'.repeat(64),
  engineeringChangeId:'v991-explicit-no-progress-owner-return',reason:'Source-preserving return after repair'};
const post=body=>adapter.handle({method:'POST',pathname:prefix+'/workflows/'+id+'/handoff-no-progress',body});
await check('web_app_route_reaches_shared_run_once_and_preserves_trace',async()=>{
  const result=await post(policy);assert.equal(result.status,202);assert.equal(result.response.handoff.decisionId,'author');
  assert.equal(result.response.workflow.running,false,'control return must not auto-start models');
  assert.equal(handoffCalls.length,1);assert.equal(handoffCalls[0].workId,'summary');
  assert.equal(handoffCalls[0].expectedOwnerResultRef,policy.expectedOwnerResultRef);
  assert.equal((await journey.trace(id)).filter(e=>e.kind==='no_progress_owner_handoff').length,1);
});
if(!process.argv.includes('--remaining'))await check('invalid_authorization_does_not_touch_run',async()=>{
  const before=handoffCalls.length;assert((await post({...policy,authorizationId:''})).status>=400);
  assert.equal(handoffCalls.length,before);
});
await check('held_acknowledged_stop_does_not_reblock_product_after_owner_step',async()=>{
  await journey.start(id);await Promise.race([reached,delay(500)]);
  const count=advanceCount,closing=journey.close();release();await closing;
  assert.equal(count,2,'product stopped after the first author step on the already handed-off old failure');
  assert.equal((await journey.read(id)).status,'paused');
});
console.log(JSON.stringify({checks,directory,advanceCount,realProviderCalls:0,nativeCalls:0,productionWrites:0,
  coreHandoffStubbed:true,scope:'actual HTTP and background product loop, not strategy acceptance'}));
assert(checks.every(c=>c.ok));
