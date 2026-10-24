import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const [iterativeFile,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(iterativeFile,'utf8')).value;
// Exercise routing, not repeated cloning of the multi-hundred-MB query archive.
const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan','openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion','selectionJustificationPolicyVersion','teachFeedback','teachFeedbackHistory','status','blockingFinding'].map(k=>[k,saved[k]])),
 iterations:[],observations:[],pendingDecision:saved.pendingDecision?{requestKey:saved.pendingDecision.requestKey}:null};
const source=JSON.parse(await fs.readFile(formalFile,'utf8'));
const view={...Object.fromEntries(['sessionId','status','planningMode','setup','agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview'].map(k=>[k,source[k]])),
 plan:JSON.parse(source.planSerialized),teachFramework:{status:source.teachFramework.status,planHash:source.teachFramework.planHash,failure:source.teachFramework.failure,investigationCompleted:false}};
assert.equal(view.teachFramework.failure.code,'ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART');
const calls=[];
const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[state],read:async()=>structuredClone(state),
 releaseUnsentDecision:async()=>{calls.push('release_unsent_only');state.pendingDecision=null;return structuredClone(state);},
 resume:async()=>{calls.push('wrong_selector');throw Error('WRONG_SELECTOR');}},
 workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_NEW_SESSION');},listSessions:async()=>({sessions:[view]}),readSession:()=>structuredClone(view),
 reviewFinalPlan(){throw Error('NO_PASSED_REVIEW_RERUN');},revisePlan(){throw Error('NO_NEW_REVISION');},
 teachPlanFramework:async(id,request)=>{assert.equal(id,view.sessionId);assert.equal(request.expectedPlanHash,view.plan.planHash);calls.push('resume_exact_current_teach');throw Error('CAPTURED_CORRECT_RESUME');}},
 promoteTeachPlan(){throw Error('NO_NEW_PROMOTION');}});
await journey.run(state.sessionId);
for(let i=0;i<40&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
assert.equal((await journey.read(state.sessionId)).stoppedReason,'CAPTURED_CORRECT_RESUME',calls.join(','));
assert.deepEqual(calls,['release_unsent_only','resume_exact_current_teach']);
console.log(JSON.stringify({pass:true,currentPlan:view.plan.planHash,calls,providerCalls:0,sourceWrites:0}));
