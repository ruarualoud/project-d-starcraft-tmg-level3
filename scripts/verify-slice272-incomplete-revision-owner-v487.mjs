import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
import {rosterPlanRevisionRecoveryV1} from '../packages/roster-strategist/roster-plan-edit-recovery-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const plan=JSON.parse(formal.planSerialized);
const teach={...Object.fromEntries(['sessionId','status','failure','progress','planningMode','setup',
 'agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview','providerDispatches'].map(k=>[k,formal[k]])),plan,
 retainedReplyCount:formal.publicOutputs.length,
 planRevisionRecovery:rosterPlanRevisionRecoveryV1(formal,plan)};
assert.equal(teach.planRevisionRecovery.canContinue,true);
assert.equal(rosterPlanRevisionRecoveryV1(formal,{...plan,planHash:'e'.repeat(64)}).canContinue,false);
assert.equal(rosterPlanRevisionRecoveryV1({...formal,providerDispatches:formal.providerDispatches.map(d=>({...d,status:'sending'}))},plan).canContinue,false);
if(teach.failure.code==='ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE')
 assert.equal(rosterPlanRevisionRecoveryV1({...formal,failedProviderOutputs:formal.failedProviderOutputs.map(f=>({...f,providerIncompleteReason:'unreported'}))},plan).canContinue,false);
else assert.equal(rosterPlanRevisionRecoveryV1({...formal,publicOutputs:[]},plan).canContinue,false);
assert.ok(['ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE','DEBUG_BOUNDARY_INSPECTION_REQUIRED'].includes(teach.failure.code));
for(const pending of [false,true]) {
 const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan',
  'openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion',
  'selectionJustificationPolicyVersion','teachFeedback','teachFeedbackHistory'].map(k=>[k,saved[k]])),
  status:saved.status,blockingFinding:null,iterations:[],observations:[],pendingDecision:pending?
    (saved.pendingDecision || {requestKey:saved.unsentDecisionReleases.at(-1).requestKey,nextRevision:saved.revision+1,recoveryRequired:true}):null};
 // This routing reproduction needs identity/disposition, not87MB of unrelated
 // historical evidence cloned on every read. Preserve the actual owner keys.
 state.teachFeedback=Object.fromEntries(['disposition','acceptanceBlocked','feedbackReason','teachSessionId'].map(k=>[k,saved.teachFeedback?.[k]]));
 state.teachFeedbackHistory=(saved.teachFeedbackHistory||[]).map(h=>({teachSessionId:h.teachSessionId,disposition:h.disposition}));
 const calls=[];
 const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[state],
  read:async()=>structuredClone(state),releaseUnsentDecision:async()=>{calls.push('release_unsent');state.pendingDecision=null;return structuredClone(state);},
  resume:async()=>{calls.push('wrong_selector');throw Error('CAPTURED_WRONG_OWNER');}},
  workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_REBUILD');},listSessions:async()=>({sessions:[teach]}),
   startPlanning(){throw Error('WRONG_INITIAL_PLAN_RESTART');},
   readSession:()=>teach,reviewFinalPlan(){throw Error('NO_REPEAT_REVIEW');},
   teachPlanFramework(){throw Error('NO_REPEAT_TEACH');},
   revisePlan:async(id,request)=>{calls.push('formal_revision');assert.equal(id,teach.sessionId);
    assert.deepEqual(new Set(request.targetedClaimPaths),new Set(['deploymentConcept.threatTradeText','deploymentConcept.reinforcementPolicyText']));
    throw Error('CAPTURED_CORRECT_OWNER');}},promoteTeachPlan(){throw Error('NO_REPROMOTION');}});
 await journey.run(state.sessionId);
 for(let i=0;i<100&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
 const result=await journey.read(state.sessionId);
 assert.equal(result.stoppedReason,'CAPTURED_CORRECT_OWNER',JSON.stringify(calls));
 assert.deepEqual(calls,[...(pending?['release_unsent']:[]),'formal_revision']);
}
console.log(JSON.stringify({pass:true,actualBug:343,routes:2,armyRebuilds:0,providerCalls:0,originalWrites:0}));
