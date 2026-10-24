import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const plan=JSON.parse(formal.planSerialized);
assert.equal(formal.status,'planned');
assert.equal(formal.planReview.status,'failed');
assert.equal(formal.planReview.failure.code,'DEBUG_BOUNDARY_INSPECTION_REQUIRED');
for(const dispatchStatus of ['completed','sending']) {
 const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan',
  'openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion',
  'selectionJustificationPolicyVersion'].map(k=>[k,saved[k]])),
  status:saved.status,blockingFinding:null,iterations:[],observations:[],pendingDecision:null,
  teachFeedback:Object.fromEntries(['disposition','acceptanceBlocked','feedbackReason','teachSessionId'].map(k=>[k,saved.teachFeedback?.[k]])),
  teachFeedbackHistory:(saved.teachFeedbackHistory||[]).map(h=>({teachSessionId:h.teachSessionId,disposition:h.disposition}))};
 const teach={...Object.fromEntries(['sessionId','status','failure','progress','planningMode','setup',
  'agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview'].map(k=>[k,formal[k]])),plan,
  providerDispatches:[{...formal.providerDispatches.at(-1),status:dispatchStatus}],retainedReplyCount:formal.publicOutputs.length};
 const calls=[];
 const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[state],read:async()=>structuredClone(state),
  resume:async()=>{calls.push('wrong_selector');throw Error('WRONG_SELECTOR');}},
  workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_REBUILD');},listSessions:async()=>({sessions:[teach]}),
   readSession:()=>teach,startPlanning(){throw Error('NO_INITIAL_PLAN_RESTART');},
   reviewFinalPlan:async id=>{calls.push('source_review');assert.equal(id,teach.sessionId);throw Error('CAPTURED_REVIEW_OWNER');},
   revisePlan(){throw Error('NO_UNREQUESTED_REVISION');},teachPlanFramework(){throw Error('NO_UNREQUESTED_TEACH');}},
  promoteTeachPlan(){throw Error('NO_REPROMOTION');}});
 await journey.run(state.sessionId);
 for(let i=0;i<100&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
 const result=await journey.read(state.sessionId);
 assert.equal(result.stoppedReason,dispatchStatus==='completed'?'CAPTURED_REVIEW_OWNER':'DEBUG_BOUNDARY_INSPECTION_REQUIRED');
 assert.deepEqual(calls,dispatchStatus==='completed'?['source_review']:[]);
}
console.log(JSON.stringify({pass:true,actual352:true,sourceReviewOwnerPreserved:true,unknownDispatchNotRetried:true,
  providerCalls:0,rosterOrPlanMutations:0,originalWrites:0}));
