import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
import {rosterTeachIssueLedgerV1} from '../packages/roster-strategist/roster-planning-workflow-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const formal=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const plan=JSON.parse(formal.planSerialized),fw=formal.teachFramework;
const teach={...Object.fromEntries(['sessionId','status','failure','progress','planningMode','setup',
  'agentSelectedCandidateHash','agentSelectedStrategySource','lockedRoster','planReview'].map(k=>[k,formal[k]])),plan,
  teachFramework:{status:fw.status,planHash:fw.planHash,investigationCompleted:fw.state.investigation.completed,
    factProbeContinuation:fw.state.investigation.factProbeContinuation,issueLedger:rosterTeachIssueLedgerV1(fw)}};
assert.equal(teach.failure.code,'ROSTER_WORKSPACE_RUN_INTERRUPTED_BY_RESTART');
assert.equal(teach.progress.rounds.length,0);
assert(teach.teachFramework.issueLedger.questions.some(q=>q.status==='revision_proposed'));
for(const pending of [false,true]) {
  const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan',
    'openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion',
    'selectionJustificationPolicyVersion','teachFeedback','teachFeedbackHistory'].map(k=>[k,saved[k]])),
    status:'active',blockingFinding:null,iterations:[],observations:[],pendingDecision:pending?saved.pendingDecision:null};
  const calls=[];
  const journey=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[state],
    read:async()=>structuredClone(state),releaseUnsentDecision:async()=>{calls.push('release_verified_unsent');state.pendingDecision=null;return structuredClone(state);},
    resume:async()=>{calls.push('wrong_selector');throw Error('CAPTURED_WRONG_OWNER');}},
    workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_REBUILD');},listSessions:async()=>({sessions:[teach]}),
      readSession:()=>structuredClone(teach),reviewFinalPlan(){throw Error('NO_REPEAT_REVIEW');},
      teachPlanFramework(){throw Error('NO_REPEAT_TEACH');},
      revisePlan:async(id,request)=>{calls.push('formal_revision');assert.equal(id,teach.sessionId);
        assert.equal(request.revisionPurpose,'teach_feedback_revision_v1');assert.equal(request.sourceTeachPlanHash,plan.planHash);
        throw Error('CAPTURED_CORRECT_OWNER');}},promoteTeachPlan(){throw Error('NO_REPROMOTION');}});
  await journey.run(state.sessionId);
  for(let i=0;i<30&&(await journey.read(state.sessionId)).running;i++)await setImmediate();
  const result=await journey.read(state.sessionId);
  assert.equal(result.stoppedReason,'CAPTURED_CORRECT_OWNER',JSON.stringify(calls));
  assert.deepEqual(calls,[...(pending?['release_verified_unsent']:[]),'formal_revision']);
}
console.log(JSON.stringify({pass:true,actualBug:319,routes:2,armyRebuilds:0,providerCalls:0,nativeCalls:0,originalWrites:0}));
