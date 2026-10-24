import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget',
 'currentCandidate','plan','openingDeploymentSchedule','arrivalPublicRevision',
 'teachFeedbackPolicy','modelContextVersion','selectionJustificationPolicyVersion',
 'teachFeedback','teachFeedbackHistory','status','blockingFinding'].map(k=>[k,saved[k]])),
 iterations:[],observations:[],pendingDecision:null};
const teach={...Object.fromEntries(['sessionId','status','planningMode','setup',
 'agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview','teachFramework']
 .map(k=>[k,formal[k]])),plan:JSON.parse(formal.planSerialized)};
assert.equal(teach.planReview.status,'completed');
assert(!teach.planReview.review.findings.some(f=>f.severity==='high'));
assert.equal(state.blockingFinding,'ITERATIVE_ROSTER_FORMAL_SOURCE_REPAIR_REQUIRED');
const calls=[];
const journey=createAgentSelectedRosterJourneyV1({
 iterativeDraft:{start(){},listSessions(){return [state];},read:async()=>structuredClone(state),
  resume:async()=>{calls.push('wrong_provisional_selector');throw Error('WRONG_OWNER');},
  proposeSchedule:async()=>{throw Error('DO_NOT_REPEAT_ARRIVALS');},
  reviseSchedulePublicPlan:async()=>{throw Error('DO_NOT_REPEAT_ARRIVALS');}},
 workspaceService:{createAgentSelectedTeachSession(){throw Error('DO_NOT_REBUILD');},
  listSessions:async()=>({sessions:[{sessionId:teach.sessionId,planningMode:teach.planningMode}]}),
  readSession:()=>structuredClone(teach),
  reviewFinalPlan(){throw Error('DO_NOT_RERUN_COMPLETED_REVIEW');},
  revisePlan(){throw Error('DO_NOT_REPAIR_ALREADY_CLEAN_REVIEW');},
  teachPlanFramework:async()=>{calls.push('resume_current_teach');throw Error('RIGHT_OWNER');}},
 promoteTeachPlan(){throw Error('DO_NOT_REPROMOTE');}});
await journey.run(state.sessionId);
for(let i=0;i<30&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
assert.equal((await journey.read(state.sessionId)).stoppedReason,'RIGHT_OWNER',`Actual103 returned to completed selector: ${calls}`);
assert.deepEqual(calls,['resume_current_teach']);
console.log(JSON.stringify({pass:true,actualPostReviewState:true,noNewSelectorOrArmyOrArrival:true,providerCalls:0}));
