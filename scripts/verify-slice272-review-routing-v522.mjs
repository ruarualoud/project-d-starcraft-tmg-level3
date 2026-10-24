// Actual r10 review false-positive + missing review-to-work handoff.
// Read-only source fixtures; no Provider, native execution or production writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as readiness from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const run=path.resolve(process.argv[2]);
const base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const draft=await get(state.draftRef),verdict=await get(draft.builderVerdictRef);
const ready=readiness.assessRosterWorkflowReadinessV1({draft,verdict});
assert.equal(ready.mechanicalFacts?.planAndBuilderDescribeSameArmy,true,
  'different digest domains must have an explicit exact same-army verdict, not trigger another audit');
const changed=structuredClone(draft);changed.plan.rosterCandidate.units[0].compositionKind='large';
const bad=readiness.assessRosterWorkflowReadinessV1({draft:changed,verdict});
assert.ok(bad.mechanicalBlockers.some(x=>x.code==='plan_candidate_not_current'),'a real mismatch must still fail');
const assessment=JSON.parse(await fs.readFile(path.join(run,'final-assessment-resume-1792356163606.json'),'utf8'));
const jobs=readiness.createRosterWorkflowReviewResolutionV1({state,assessment,readiness:ready});
assert.deepEqual(jobs.map(x=>x.reviewDomain).sort(),['combat_and_losses','map_and_arrival','plan_continuity']);
assert.ok(jobs.every(x=>x.role==='roster_workflow_experiment_planner'&&x.resolutionGroupId==='review-resolution:r10'));
for(const job of jobs){
  assert.equal(job.inputs.mechanics.value.planAndBuilderDescribeSameArmy,true);
  assert.ok(job.inputs.reviewIssues.value.every(i=>i.workId.endsWith(job.reviewDomain)));
}
const active={...state,work:[...state.work,...jobs]};
assert.equal(readiness.createRosterWorkflowReviewResolutionV1({state:active,assessment,readiness:ready}).length,0,
  'restoring or polling must not duplicate the work');
console.log(JSON.stringify({pass:true,checks:6,providerCalls:0,nativeExecutions:0,productionWrites:0}));
