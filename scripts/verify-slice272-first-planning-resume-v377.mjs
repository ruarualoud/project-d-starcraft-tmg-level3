import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const raw=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const state={...Object.fromEntries(['sessionId','revision','status','blockingFinding',
  'frozenContext','mineralBudget','currentCandidate','plan','openingDeploymentSchedule',
  'arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion'].map(k=>[k,raw[k]])),
  iterations:[],observations:[],teachFeedbackHistory:[],pendingDecision:null};
const saved=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const teach={...Object.fromEntries(['sessionId','status','planningMode','setup','failure',
  'agentSelectedCandidateHash','agentSelectedStrategySource','progress','providerDispatches'].map(k=>[k,saved[k]])),
  retainedReplyCount:saved.publicOutputs.length,plan:null,
  lockedRoster:{baselinePlanId:saved.lockedRoster.baselinePlan.planId}};
assert.equal(teach.failure.code,'ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART');
assert.equal(teach.retainedReplyCount,0);
async function exercise(value) {
  const calls=[];
  const journey=createAgentSelectedRosterJourneyV1({
    iterativeDraft:{start(){},read:async()=>structuredClone(state),listSessions:()=>[state],
      resume(){throw Error('NO_NEW_SELECTION');},
      proposeSchedule:async()=>({status:'rules_audited'}),
      reviseSchedulePublicPlan:async()=>({status:'unit_references_verified'})},
    workspaceService:{listSessions:async()=>({sessions:[value]}),readSession:()=>structuredClone(value),
      createAgentSelectedTeachSession(){throw Error('NO_NEW_SESSION');},
      startPlanning:async(id,options)=>{calls.push({id,options});throw Error('RESUMED_ORIGINAL');},
      reviewFinalPlan(){},revisePlan(){},teachPlanFramework(){}},promoteTeachPlan(){}
  });
  await journey.run(state.sessionId);
  for(let i=0;i<50&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
  return {calls,reason:(await journey.read(state.sessionId)).stoppedReason};
}
const actual=await exercise(teach);
assert.equal(actual.reason,'RESUMED_ORIGINAL','Real zero-dispatch restart must resume the same formal session');
assert.deepEqual(actual.calls,[{id:teach.sessionId,options:{resume:true}}]);
for(const extra of [{providerDispatches:[{status:'sending'}]},
  {progress:{rounds:[{status:'running'}]}},{retainedReplyCount:1}]) {
  const blocked=await exercise({...teach,...extra});
  assert.equal(blocked.calls.length,0,'Ambiguous or nonempty old runs cannot use the unsent lane');
}
console.log(JSON.stringify({status:'passed',actualRestart:true,unknownDispatchBlocked:true,providerCalls:0}));
