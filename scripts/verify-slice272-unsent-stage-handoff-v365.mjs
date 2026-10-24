import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createIterativeRosterPlanSessionV1} from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import {createIterativeRosterFlashModelPortV1} from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const raw=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const original={...Object.fromEntries(['schema','sessionId','revision','contextHash','frozenContext',
 'mineralBudget','modelContextVersion','currentCandidate','plan','status','blockingFinding','pendingDecision',
 'teachFeedback','teachFeedbackPolicy','selectionJustificationPolicyVersion','openingDeploymentSchedule',
 'arrivalPublicRevision'].map(k=>[k,raw[k]])),iterations:[],observations:[],teachFeedbackHistory:[]};
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
assert(original.pendingDecision,'Keep the real pending reservation that the previous fixture omitted');
async function fixture(confirmed) {
 let saved=structuredClone(original);const calls=[];
 const model=createIterativeRosterFlashModelPortV1({skillGuidance:{},missionEvidence:{},
  replyStore:{loadRetainedReply:async()=>null,retainReply:async()=>{throw Error('NO_MODEL_WRITE');}},
  deliberationFactory:{confirmUnsentRequest:async identity=>confirmed?{status:'not_dispatched',...identity}:{status:'unknown'},
   createForRun:async()=>{calls.push('wrong_selector_send');throw Error('WRONG_OWNER');}}});
 const rejectWrongOwner=async()=>{calls.push('wrong_selector_send');throw Error('WRONG_OWNER');};
 const session=createIterativeRosterPlanSessionV1({store:{load:async()=>saved,save:async(_,n)=>{saved=n;}},
  model:{...model,decide:rejectWrongOwner,recover:rejectWrongOwner},
  builder:{evaluate(){throw Error('NO_BUILDER');}},tools:{query(){throw Error('NO_QUERY');}},
  review:{draft:async s=>s,final(){throw Error('NO_ADMISSION');}}});
 if(!confirmed){
  if(session.releaseUnsentDecision)await session.releaseUnsentDecision(saved.sessionId);
  assert.deepEqual(saved.pendingDecision,original.pendingDecision);
  assert.equal(saved.revision,original.revision);return;
 }
 const teach={...Object.fromEntries(['sessionId','status','planningMode','setup',
  'agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview','teachFramework']
  .map(k=>[k,formal[k]])),plan:JSON.parse(formal.planSerialized)};
 const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{...session,prepare:undefined,listSessions(){return [saved];}},
  workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_REBUILD');},
   listSessions:async()=>({sessions:[{sessionId:teach.sessionId,planningMode:teach.planningMode}]}),
   readSession:()=>structuredClone(teach),reviewFinalPlan(){throw Error('NO_REVIEW_REPLAY');},
   revisePlan(){throw Error('NO_REPAIR_REPLAY');},
   teachPlanFramework:async()=>{calls.push('current_teach');throw Error('RIGHT_OWNER');}},
  promoteTeachPlan(){throw Error('NO_REPROMOTE');}});
 await journey.run(saved.sessionId);
 for(let i=0;i<80&&(await journey.read(saved.sessionId)).running;i++)await setImmediate();
 assert.equal((await journey.read(saved.sessionId)).stoppedReason,'RIGHT_OWNER','Actual pending reservation must settle before stage selection');
 assert.deepEqual(calls,['current_teach']);assert.equal(saved.pendingDecision,null);
 assert.equal(saved.revision,original.revision);
 assert.deepEqual(saved.plan,original.plan);assert.deepEqual(saved.currentCandidate,original.currentCandidate);
 assert.equal(saved.unsentDecisionReleases.at(-1).requestKey,original.pendingDecision.requestKey);
}
await fixture(true);await fixture(false);
console.log(JSON.stringify({pass:true,actualPendingRetainedInFixture:true,noProviderOrQueryCalls:true,
 unknownReservationPreserved:true,noRevisionArmyPlanMutation:true}));
