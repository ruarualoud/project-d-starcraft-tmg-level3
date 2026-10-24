// r22 actually lowered its VP targets using an invalid absence-of-measurement
// inference. The next product Teach/review must receive the exact commit basis.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone;
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
assert.equal(original.draftRevision,22,'freeze the actual unreviewed r22');
const draft=await disk(original.draftRef),receipt=draft.history.at(-1);
assert.equal(receipt.afterRevision,22);assert(receipt.publicReason.includes('measured absence'));
assert.equal(draft.plan.scoreRoute.scheduleStatus,'declared');
const originalHash=hash(original),draftHash=hash(draft);
let state={...copy(original),events:original.events.filter(e=>e.type!=='result_saved')};
const memory=new Map(),cache=new Map();
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
  get:async ref=>{if(memory.has(ref))return copy(memory.get(ref));if(!cache.has(ref))cache.set(ref,await disk(ref));return copy(cache.get(ref));},
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const options={workflowStore:store,scope:state.scope,sessionId:'offline-v968',
  laboratory:{labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'offline-v968',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){assert.fail('No Native execution');}},
  deliberation:{deliberate:async()=>assert.fail('No Provider execution')}};
let run=await createRosterDecisionWorkspaceRunV1(options);
await run.requestTeach({id:'offline-v968-teach',inputs:{draft:{source:'evidence',id:'draft:r22:summary',pointer:''}},
  question:{goal:'Review the actual changed scoring plan and its evidence.'}});
const teach=state.work.find(w=>w.id==='offline-v968-teach');
assert(teach.inputs.revisionReviewContext,'Actual product Teach lost the decision that changed the score route');
const context=teach.inputs.revisionReviewContext.value;
assert.deepEqual(context.receipt,receipt,'Do not summarize or repair the author reason');
assert.equal(context.draftRevision,22);assert.equal(context.sourceDraftRef,original.draftRef);
assert.equal(context.commitIsFactualApproval,false);
assert.equal(context.commitIsStrategyImprovement,false);
assert.equal(context.plannedTargetsAreObservations,false);
assert.equal(context.sourcePointer,'/history/'+(draft.history.length-1));
console.log(JSON.stringify({check:'product-Teach-receives-exact-unapproved-revision-reason-and-sources',pass:true}));
// Use a separate in-memory branch so the deliberately unexecuted Teach does
// not create unrelated readiness work. No saved original or Native is changed.
state={...copy(original),events:original.events.filter(e=>e.type!=='result_saved')};
run=await createRosterDecisionWorkspaceRunV1(options);
const reviews=await run.requestFinalReviews();assert.equal(reviews.scheduled.length,6);
for(const id of reviews.scheduled){
  const job=state.work.find(w=>w.id===id);
  assert.deepEqual(job.inputs.revisionReviewContext.value,context,'Every final domain uses the same immutable commit basis');
}
assert.equal(state.draftRef,original.draftRef);
assert.equal(hash(original),originalHash);assert.equal(hash(draft),draftHash);
console.log(JSON.stringify({pass:true,domains:reviews.scheduled.length,providerCalls:0,nativeCalls:0,
  productionWrites:0,originalReasonRewritten:false,planApproved:false}));
