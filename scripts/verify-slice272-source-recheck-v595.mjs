// Actual599 passed a causal overclaim. An explicit pending source recheck must
// suspend this acceptance without overwriting/replaying the earlier review.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {assessRosterExperimentConclusionV1,createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const base=process.cwd()+'/build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner';
const state=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8'));
const owner=state.work.filter(w=>w.experimentGoalId==='p5-current-obligations-v577:r2:component_choices').at(-1);
const original=await assessRosterExperimentConclusionV1({state,owner,store:{get}});
assert.equal(original.acceptedForStrategy,true,'fixture must be actual old accepted599');
const recheck={id:owner.id+':source-recheck:causal-comparison-scope-v594',role:'roster_workflow_final_review',
  experimentSourceReviewOf:owner.id,status:'ready',sourceReviewRecheckOf:original.reviewId};
const next={...state,work:[...state.work,recheck]};
const assessment=await assessRosterExperimentConclusionV1({state:next,owner,store:{get}});
assert.equal(assessment.acceptedForStrategy,false,'pending exact recheck must suspend the old acceptance');
assert.equal(assessment.status,'awaiting_source_review');
const revised=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get},reviewId:recheck.id});
assert.ok(revised,'same owner can receive one explicit new criterion review with its own identity');
assert.equal(revised.id,recheck.id);
assert.ok(revised.sourceProjections.some(p=>p.id.endsWith(':v2')),'new scope projection IDs must not alias old v1 indexes');
const failed={value:{checks:[{checkId:'source_fidelity',verdict:'requires_revision',requiredData:['causal effect not measured']},
  {checkId:'question_coverage',verdict:'needs_evidence',requiredData:['defensive support probe']} ]}};
const failedState={...state,work:[...state.work,{...recheck,status:'evidence_ready',resultRef:'new-failed-review'}]};
const rejected=await assessRosterExperimentConclusionV1({state:failedState,owner,store:{get:r=>r==='new-failed-review'?failed:get(r)}});
assert.equal(rejected.status,'requires_revision');
assert.equal(rejected.acceptedForStrategy,false);
assert.equal(rejected.reviewId,recheck.id);
assert.equal((await assessRosterExperimentConclusionV1({state,owner,store:{get}})).acceptedForStrategy,true,
  'read-only fixture old history must remain exact; no source was overwritten');
console.log(JSON.stringify({passed:true,concreteReply:599,pendingAndRejectedRecheckBlocksAdoption:true,
  oldReviewPreserved:true,explicitDistinctReviewIdentity:true,sourceProjectionVersion:2,
  providerCalls:0,productionWrites:0,proves:'Targeted recheck selection, not corrected actual strategic conclusion'}));
