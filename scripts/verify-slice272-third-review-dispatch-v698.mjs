// Actual fixed r12 stopped BEFORE queued round-3 reviewers could execute.
// "review_not_completed" is pending work, not a third negative judgement.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {assessRosterWorkflowFinalReviewsV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const base=path.join(process.cwd(),'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const pending=state.work.filter(w=>w.reviewDomain&&w.reviewRound===3&&w.status!=='evidence_ready');
assert.ok(pending.some(w=>w.reviewDomain==='map_and_arrival'));
assert.ok(pending.some(w=>w.reviewDomain==='plan_continuity'));
const reviews=[];
for(const w of state.work.filter(w=>w.reviewDomain&&w.role==='roster_workflow_final_review'&&w.status==='evidence_ready'&&w.resultRef))
  reviews.push({workId:w.id,resultRef:w.resultRef,value:(await get(w.resultRef)).value});
const readiness={mechanicalReady:true,mechanicalBlockers:[],mechanicalFacts:{},strategyQuestions:[],
  activeWork:pending.map(w=>({id:w.id,role:w.role,status:w.status}))};
const actual=assessRosterWorkflowFinalReviewsV1({state,readiness,reviews});
assert.equal(actual.stoppedReviewDomains.length,0,'queued round 3 must execute before it can count as a third failed review');
assert.equal(actual.readyForRelease,false,'pending reviewers still block release');
const finished=structuredClone(state),completed=[...reviews];
for(const w of pending){const row=finished.work.find(r=>r.id===w.id);row.status='evidence_ready';row.resultRef='controlled-failed-review';
  completed.push({workId:w.id,resultRef:row.resultRef,value:{checks:w.inputs.review.value.obligations.map(o=>({checkId:o.checkId,
    verdict:'needs_evidence',publicReason:'CONTROLLED third-failure fixture',requiredData:['missing fact']}))}});}
const stopped=assessRosterWorkflowFinalReviewsV1({state:finished,readiness:{...readiness,activeWork:[]},reviews:completed});
assert.ok(stopped.stoppedReviewDomains.some(d=>d.domain==='map_and_arrival'));
assert.ok(stopped.stoppedReviewDomains.some(d=>d.domain==='plan_continuity'));
console.log(JSON.stringify({passed:true,actualPendingThirdReviewsUsed:true,pendingNotFailure:true,pendingStillBlocksRelease:true,
  completedThirdFailureStillStops:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
