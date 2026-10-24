import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const [stateFile,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const formal=JSON.parse(await fs.readFile(formalFile,'utf8'));
const teach={...Object.fromEntries(['sessionId','status','planningMode','setup',
 'agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview']
 .map(k=>[k,formal[k]])),plan:JSON.parse(formal.planSerialized)};
// Inspect the saved actual feedback on both ordinary entry and a settled
// pre-decision boundary. No stored state is changed and no Provider is used.
async function verify(resumeFeedback) {
 const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget',
  'currentCandidate','plan','openingDeploymentSchedule','arrivalPublicRevision',
  'teachFeedbackPolicy','modelContextVersion','selectionJustificationPolicyVersion',
  'teachFeedback','teachFeedbackHistory'].map(k=>[k,saved[k]])),iterations:[],observations:[],pendingDecision:null,
  status:resumeFeedback?'active':'paused',
  blockingFinding:resumeFeedback?null:'ITERATIVE_ROSTER_FINAL_REVIEW_BLOCKED'};
 const calls=[];
 const journey=createAgentSelectedRosterJourneyV1({
  iterativeDraft:{start(){},listSessions(){return [state];},read:async()=>structuredClone(state),
   resume:async()=>{calls.push('wrong_provisional_selector');throw Error('CAPTURED_WRONG_OWNER');},
   attachTeachFeedback:async()=>{calls.push('wrong_provisional_feedback');throw Error('CAPTURED_WRONG_OWNER');},
   proposeSchedule:async()=>({status:'rules_audited'}),
   reviseSchedulePublicPlan:async()=>({status:'unit_references_verified'})},
  workspaceService:{createAgentSelectedTeachSession(){throw Error('DO_NOT_REBUILD');},
   listSessions:async()=>({sessions:[{sessionId:teach.sessionId,planningMode:teach.planningMode}]}),
   readSession:()=>structuredClone(teach),readPlanningExperience:()=>({publicRounds:[]}),
   reviewFinalPlan(){throw Error('DO_NOT_RERUN_COMPLETED_REVIEW');},
   revisePlan:async(id,request)=>{calls.push('formal_plan_tools');
    assert.equal(id,teach.sessionId);assert(request.targetedClaimPaths.includes('componentPurposes.marine-1'));
    throw Error('CAPTURED_CORRECT_OWNER');}},promoteTeachPlan(){throw Error('DO_NOT_REPROMOTE');}});
 await journey.run(state.sessionId);
 for(let i=0;i<30&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
 const view=await journey.read(state.sessionId);
 assert.equal(view.stoppedReason,'CAPTURED_CORRECT_OWNER',`Formal source repair was routed to a tool unable to edit its field: ${calls}`);
 assert.deepEqual(calls,['formal_plan_tools']);
}
await verify(false);await verify(true);
console.log(JSON.stringify({pass:true,checks:2,formalClaimEditedByOwningTools:true,noArmyRebuild:true,providerCalls:0}));
