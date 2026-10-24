// Concrete downstream gaps found while stepping the new handoff: the real
// feedback writer drops revisionWorkOrder; Journey then reclaims the same work.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createIterativeRosterPlanSessionV1} from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
const [stateFile,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const formal=JSON.parse(await fs.readFile(formalFile,'utf8'));
const plan=JSON.parse(formal.planSerialized);
const base={...Object.fromEntries(['schema','sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan',
  'openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion',
  'selectionJustificationPolicyVersion'].map(k=>[k,saved[k]])),status:'active',blockingFinding:null,
  iterations:[],observations:[],pendingDecision:null,teachFeedback:null,teachFeedbackHistory:[]};
const order={schema:'roster_teach_revision_work_order_v1',sourcePlanHash:plan.planHash,
  status:'proposed_not_applied',planClaimPaths:[],rosterDecisionRequired:true,
  engineeringQuestionIds:[],unresolvedQuestionIds:[],questionWork:[{questionId:'scope-1',
    route:'roster_plan_revision',claimPaths:[],publicReason:'Compare an army alternative using retained evidence.'}]};
const teach={...Object.fromEntries(['sessionId','planningMode','setup','agentSelectedCandidateHash',
  'agentSelectedStrategySource','lockedRoster','planReview','selectionJustification'].map(k=>[k,formal[k]])),
  status:'planned',plan,teachFramework:{status:'completed',planHash:plan.planHash,policyVersion:'strategy_inquiry_v2',
    investigationCompleted:true,revisionWorkOrder:order,issueLedger:{questions:[{questionId:'scope-1',status:'revision_proposed'}]},
    state:{phase:'completed',framework:{},coverage:[],agenda:{questions:[{questionId:'scope-1',axisIds:[],claim:'compare alternatives'}]},
      evidence:[],investigation:{completed:true},synthesis:{answers:[{questionId:'scope-1',disposition:'revise',evidenceRefs:[],publicReason:'Compare alternatives.'}]},revisionWorkOrder:order}}};
const checks=[];
async function check(name,fn){if(process.argv.includes('--consume-only')&&name.startsWith('real feedback'))return;
  try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message.slice(0,500)});}}
await check('real feedback writer retains the typed order and delivers a changed order',async()=>{
  let current=structuredClone(base);
  const no=()=>{throw Error('NO_MODEL_OR_NATIVE');};
  const session=createIterativeRosterPlanSessionV1({store:{load:async()=>structuredClone(current),save:async(id,value)=>{current=value;}},
    model:{decide:no},builder:{evaluate:no},tools:{query:no},review:{final:no}});
  await session.attachTeachFeedback(base.sessionId,teach);
  assert.deepEqual(current.teachFeedback.teachFramework.revisionWorkOrder,order);
  const revised=structuredClone(teach);revised.teachFramework.state.revisionWorkOrder.publicReason='New work on the same Plan';
  await session.attachTeachFeedback(base.sessionId,revised);
  assert.equal(current.teachFeedback.teachFramework.revisionWorkOrder.publicReason,'New work on the same Plan');
  assert.equal(current.teachFeedbackHistory.length,2);
});
await check('delivered army work reaches selector once instead of reattaching forever',async()=>{
  let current=structuredClone(base),attachments=0,selectionCalls=0;
  const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[current],read:async()=>structuredClone(current),
    attachTeachFeedback:async()=>{attachments++;if(attachments>1)throw Error('DUPLICATE_HANDOFF');
      current.teachFeedback={disposition:'pending',teachSessionId:teach.sessionId,candidateHash:current.currentCandidate.candidateHash,
        taughtPlan:plan,teachFramework:{revisionWorkOrder:order}};return structuredClone(current);},
    resume:async()=>{selectionCalls++;throw Error('CAPTURED_SELECTOR');}},
    workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_REBUILD');},listSessions:async()=>({sessions:[teach]}),
      readSession:()=>structuredClone(teach),readPlanningExperience:()=>({teachFramework:teach.teachFramework,publicRounds:[]}),
      reviewFinalPlan(){throw Error('NO_REVIEW');},revisePlan(){throw Error('NO_EDIT');},
      teachPlanFramework(){throw Error('NO_RETEACH');}},promoteTeachPlan(){throw Error('NO_PROMOTE');}});
  await journey.run(base.sessionId);
  for(let i=0;i<80&&(await journey.read(base.sessionId)).running;i++)await setImmediate();
  assert.equal((await journey.read(base.sessionId)).stoppedReason,'CAPTURED_SELECTOR');
  assert.equal(attachments,1);assert.equal(selectionCalls,1);
});
console.log(JSON.stringify({checks,providerCalls:0,nativeCalls:0,originalWrites:0},null,2));
assert.ok(checks.every(c=>c.ok),'typed handoff must survive persistence and be consumed');
