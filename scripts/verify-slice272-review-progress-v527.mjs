// Actual r10 retained Plan + empty requiredData must not erase final obligations.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {assessRosterWorkflowReadinessV1,createRosterWorkflowReviewResolutionV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const draft=await get(state.draftRef),verdict=await get(draft.builderVerdictRef);
const ready=assessRosterWorkflowReadinessV1({draft,verdict,work:state.work});
const assessment=JSON.parse(await fs.readFile(path.join(run,'final-assessment-resume-1792356163606.json'),'utf8'));
const jobs=createRosterWorkflowReviewResolutionV1({state,assessment,readiness:ready});
assert.equal(jobs.length,3,'completed investigation + retain cannot leave mandatory failed review domains with no next owner');
assert.ok(jobs.every(w=>w.role==='roster_workflow_final_review'),'reassess only failed domains against returned facts, not all six');
assert.deepEqual(jobs.map(w=>w.reviewDomain).sort(),['combat_and_losses','map_and_arrival','plan_continuity']);
for(const job of jobs){
  assert.ok(job.inputs.resolutionDecision,'must deliver the actual retention proposal, not erase it');
  assert.ok(Object.keys(job.inputs).some(k=>k.startsWith('newFact')),'must deliver actual domain facts');
  assert.equal(job.reviewRound,2);
}
const updated={...state,work:[...state.work,...jobs]};
assert.equal(createRosterWorkflowReviewResolutionV1({state:updated,assessment,readiness:ready}).length,0,'polling cannot duplicate a review wave');
console.log(JSON.stringify({pass:true,checks:5,providerCalls:0,nativeExecutions:0,productionWrites:0}));
