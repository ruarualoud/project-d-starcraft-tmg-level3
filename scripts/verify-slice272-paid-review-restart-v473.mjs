import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createAgentSelectedRosterJourneyV1} from '../packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs';
import {rosterTeachIssueLedgerV1} from '../packages/roster-strategist/roster-planning-workflow-v1.mjs';
const s=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const d=JSON.parse(await fs.readFile(process.argv[3],'utf8')),fw=d.teachFramework;
assert(d.progress.rounds.some(r=>r.roundKind==='final_plan_review'&&r.paidProviderCall===true));
for(const failureCode of ['ROSTER_WORKSPACE_REVIEW_INTERRUPTED_BY_RESTART','OTHER_UNRESOLVED_REVIEW_ERROR']) {
 const state={...Object.fromEntries(['sessionId','revision','frozenContext','mineralBudget','currentCandidate','plan',
  'openingDeploymentSchedule','arrivalPublicRevision','teachFeedbackPolicy','modelContextVersion',
  'selectionJustificationPolicyVersion','teachFeedback','teachFeedbackHistory'].map(k=>[k,s[k]])),
  status:'active',blockingFinding:null,iterations:[],observations:[],pendingDecision:null};
 const teach={...Object.fromEntries(['sessionId','planningMode','setup','agentSelectedCandidateHash',
   'agentSelectedStrategySource','lockedRoster'].map(k=>[k,d[k]])),status:'planned',plan:JSON.parse(d.planSerialized),
  progress:{rounds:d.progress.rounds.map(r=>({roundKind:r.roundKind,paidProviderCall:r.paidProviderCall}))},
  planReview:{...d.planReview,status:'failed',failure:{code:failureCode}},
  teachFramework:{status:fw.status,planHash:fw.planHash,appliedToPlanHash:fw.appliedToPlanHash,
   investigationCompleted:fw.state.investigation.completed,issueLedger:rosterTeachIssueLedgerV1(fw)}};
 const calls=[];
 const j=createAgentSelectedRosterJourneyV1({iterativeDraft:{start(){},listSessions:()=>[state],read:async()=>state,
   resume:async()=>{throw Error('NO_SELECTOR');}},workspaceService:{createAgentSelectedTeachSession(){throw Error('NO_REBUILD');},
   listSessions:async()=>({sessions:[teach]}),readSession:()=>teach,revisePlan(){throw Error('NO_REPEAT_EDIT');},
   reviewFinalPlan:async()=>{calls.push('existing_review_reconciliation_port');throw Error('CAPTURED_REVIEW_RECOVERY');}},
   promoteTeachPlan(){throw Error('NO_REPROMOTE');}});
 await j.run(state.sessionId);
 for(let i=0;i<30&&(await j.read(state.sessionId)).running;i++)await setImmediate();
 assert.equal((await j.read(state.sessionId)).stoppedReason,
   failureCode==='ROSTER_WORKSPACE_REVIEW_INTERRUPTED_BY_RESTART'?'CAPTURED_REVIEW_RECOVERY':failureCode);
 assert.equal(calls.length,failureCode==='ROSTER_WORKSPACE_REVIEW_INTERRUPTED_BY_RESTART'?1:0);
}
console.log(JSON.stringify({pass:true,actualPaidBoundary:321,routes:2,providerCalls:0,nativeCalls:0,originalWrites:0}));
