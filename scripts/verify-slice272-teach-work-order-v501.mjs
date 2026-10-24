// Reproduce the concrete scheduler bug: a scoped Teach proposal currently sends
// every formal claim to the text editor, even when the proposal requires Builder.
// Use the current stored Plan/candidate, with explicit completed-Teach fixtures.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
import {rosterPublicClaimTextEntriesV1} from '../packages/roster-strategist/roster-public-claim-paths-v1.mjs';
const [stateFile,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const formal=JSON.parse(await fs.readFile(formalFile,'utf8'));
const plan=JSON.parse(formal.planSerialized);
const target=rosterPublicClaimTextEntriesV1(plan).find(([path])=>path.startsWith('scoreRoute.'))[0];
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message.slice(0,600)});}}
async function route(mode){
  const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan',
    'openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion',
    'selectionJustificationPolicyVersion','teachFeedback','teachFeedbackHistory'].map(k=>[k,saved[k]])),
    status:'active',blockingFinding:null,iterations:[],observations:[],pendingDecision:null};
  const workOrder={schema:'roster_teach_revision_work_order_v1',sourcePlanHash:plan.planHash,
    status:'proposed_not_applied',planClaimPaths:mode==='plan'?[target]:[],
    rosterDecisionRequired:mode==='roster',engineeringQuestionIds:[],unresolvedQuestionIds:[],
    questionWork:[{questionId:'scope-1',route:mode==='roster'?'roster_plan_revision':'plan_revision',
      claimPaths:mode==='plan'?[target]:[],publicReason:'Apply the evidence-backed change only at its actual owner.'}]};
  const view={...Object.fromEntries(['sessionId','planningMode','setup','agentSelectedCandidateHash',
    'agentSelectedStrategySource','lockedRoster','planReview'].map(k=>[k,formal[k]])),status:'planned',plan,
    teachFramework:{status:'completed',planHash:plan.planHash,investigationCompleted:true,
      issueLedger:{questions:[{questionId:'scope-1',status:'revision_proposed'}]},
      ...(mode!=='missing'?{revisionWorkOrder:workOrder}:{})}};
  const calls=[];
  const journey=createAgentSelectedRosterJourneyV1({
    iterativeDraft:{start(){},listSessions:()=>[state],read:async()=>structuredClone(state),
      resume:async()=>{calls.push('unexpected_selector_call');throw Error('STOP');},
      attachTeachFeedback:async(id,feedback)=>{calls.push('strategy_feedback');
        assert.equal(id,state.sessionId);assert.deepEqual(feedback.teachFramework.revisionWorkOrder,workOrder);
        throw Error('CAPTURED_FEEDBACK');}},
    workspaceService:{createAgentSelectedTeachSession(){throw Error('DO_NOT_REBUILD');},
      listSessions:async()=>({sessions:[view]}),readSession:()=>structuredClone(view),
      readPlanningExperience:()=>({teachFramework:{revisionWorkOrder:workOrder},publicRounds:[]}),
      reviewFinalPlan(){throw Error('DO_NOT_RERUN_SOURCE_REVIEW');},
      teachPlanFramework:async(id,request)=>{calls.push('scope_planning');
        assert.equal(request.revisionWorkOrderOnly,true);throw Error('CAPTURED_SCOPE');},
      revisePlan:async(id,request)=>{calls.push('formal_plan_tools');
        assert.equal(mode,'plan','roster/missing scope must not go straight to the text editor');
        assert.deepEqual(request.targetedClaimPaths,[target]);throw Error('CAPTURED_SCOPED_EDIT');}},
    promoteTeachPlan(){throw Error('DO_NOT_REPROMOTE');}});
  await journey.run(state.sessionId);
  for(let i=0;i<60&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
  const result=await journey.read(state.sessionId);
  assert.equal(result.running,false,'route must settle at the captured product operation');
  assert.equal(result.stoppedReason,mode==='plan'?'CAPTURED_SCOPED_EDIT':mode==='roster'?'CAPTURED_FEEDBACK':'CAPTURED_SCOPE');
  assert.deepEqual(calls,[mode==='plan'?'formal_plan_tools':mode==='roster'?'strategy_feedback':'scope_planning']);
}
await check('one scoped Plan issue does not expand to every claim',()=>route('plan'));
await check('roster proposal reaches strategic owner before text revision',()=>route('roster'));
await check('legacy completed Teach requests a scope, not a blanket rewrite',()=>route('missing'));
// New contract tests run after the concrete old-route reproduction is fixed.
let work;
try{work=await import('../packages/roster-strategist/roster-teach-revision-work-order-v1.mjs');}
catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
if(work)await check('work-order contract preserves unresolved facts, scope and preset authority',()=>{
  const state={agenda:{questions:[{questionId:'q',claim:'conditional route'}]},
    synthesis:{answers:[{questionId:'q',disposition:'revise',publicReason:'revise route',evidenceRefs:[]}],
      proposedPlanChanges:['revise route'],proposedRosterChanges:[]}};
  const request=work.prepareRosterTeachRevisionWorkOrderV1({plan,state,rosterEditAuthority:'preset_immutable'});
  const value={publicReason:'Scoped correction',questionWork:[{questionId:'q',route:'plan_revision',claimPaths:[target],publicReason:'Correct this route.'}]};
  const order=work.buildRosterTeachRevisionWorkOrderV1(request,value);
  assert.deepEqual(order.planClaimPaths,[target]);assert.equal(order.sourcePlanHash,plan.planHash);
  assert.equal(order.status,'proposed_not_applied');assert.equal(order.rosterDecisionRequired,false);
  assert.throws(()=>work.buildRosterTeachRevisionWorkOrderV1(request,{...value,questionWork:[{...value.questionWork[0],claimPaths:['army.units.0']}]}));
  assert.throws(()=>work.buildRosterTeachRevisionWorkOrderV1(request,{...value,questionWork:[{...value.questionWork[0],route:'roster_plan_revision',claimPaths:[]}]}));
  const unresolved=work.prepareRosterTeachRevisionWorkOrderV1({plan,state:{...state,
    synthesis:{...state.synthesis,answers:[{...state.synthesis.answers[0],disposition:'unresolved'}]}},rosterEditAuthority:'agent_may_reselect_after_evidence'});
  assert.throws(()=>work.buildRosterTeachRevisionWorkOrderV1(unresolved,{...value,questionWork:[{...value.questionWork[0],route:'keep',claimPaths:[]}]}));
  const revision=work.buildRosterTeachRevisionWorkOrderV1(unresolved,value);
  assert.deepEqual(revision.unresolvedQuestionIds,['q']);
  assert.equal(revision.acceptanceGranted,false);
  assert.equal(work.prepareRosterTeachRevisionWorkOrderV1({plan,state:{...state,revisionWorkOrder:order},rosterEditAuthority:'preset_immutable'}),null);
});
console.log(JSON.stringify({checks,currentPlanHash:plan.planHash,scopedPath:target,providerCalls:0,
  nativeExecutions:0,storedStateMutations:0},null,2));
assert.ok(checks.every(c=>c.ok),'Teach work-order routing regression');
