// Concrete r21 failure: rejected blocker coverage recirculated the same
// original inquiry through three fact authors instead of returning the dispute.
// Frozen originals, actual public Run, memory-only writes; no model or Native.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {assessRosterExperimentConclusionV1,createRosterExperimentReviewRevisionV1}
  from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [directory,mode]=process.argv.slice(2),copy=structuredClone;
const disk=async ref=>JSON.parse(await fs.readFile(`${directory}/artifacts/${ref}.json`,'utf8'));
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const review=original.work.find(w=>w.resultRef==='8992e087bb46d4ba7682c21326d1335e0b2aa51d1952677df0611ef76ea18ce5');
assert(review,'actual third review is required');
const owner=original.work.find(w=>w.id===review.experimentSourceReviewOf);
const paidReview=await disk(review.resultRef),paidOwner=await disk(owner.resultRef);
const immutable=JSON.stringify({paidReview,paidOwner});
const question=review.inputs.question.value.necessaryQuestions[0];
const assess=async(body=paidReview,selectedReview=review,selectedOwner=owner)=>assessRosterExperimentConclusionV1({
  state:{...original,work:original.work.map(w=>w.id===review.id?selectedReview:w)},owner:selectedOwner,
  store:{get:ref=>ref===review.resultRef?copy(body):disk(ref)}});
if(mode!=='remaining'){
const result=await assess();
assert.equal(result.status,'source_control_dispute','The repeated rejected blocker must leave the fact-rewrite loop');
assert.equal(result.capabilityBlockerVerified,false);
assert.equal(result.acceptedForStrategy,false);
assert.equal(result.sourceControlDispute.originalResultRef,owner.resultRef);
assert.equal(result.sourceControlDispute.reviewResultRef,review.resultRef);
assert.deepEqual(result.sourceControlDispute.checks,paidReview.value.checks);
assert.equal(result.sourceControlDispute.unresolvedQuestions[0].question,question);
assert.equal(result.sourceControlDispute.unresolvedQuestions[0].classification,'necessary_fact');
assert.equal(result.sourceControlDispute.unresolvedQuestions[0].resolved,false);
assert.deepEqual(result.conclusion,paidOwner.value.experimentConclusion);
assert.equal((await assess(paidReview,review,{...owner,experimentReviewRound:0})).status,'source_control_dispute',
  'The routing must stop on the first matching dispute, not wait for three failed rewrites');
assert.equal(await createRosterExperimentReviewRevisionV1({state:original,owner,store:{get:disk}}),null);
console.log(JSON.stringify({check:'actual-review-returns-dispute-not-accepted-facts-or-fourth-rewrite',pass:true}));

const changed=edit=>{const body=copy(paidReview);edit(body.value.checks);return body;};
assert.equal((await assess(changed(c=>c[0].verdict='requires_revision'))).status,'requires_revision');
assert.equal((await assess(changed(c=>c[1].dataQuestions.push({question:'A new unmeasured local fact',
  classification:'necessary_fact',publicReason:'Not the original inquiry',evidenceNumbers:[]})))).status,'requires_revision');
assert.equal((await assess(changed(c=>c[1].evidenceRefs[0].artifactRef='wrong-artifact'))).status,'requires_revision');
assert.equal((await assess(paidReview,{...review,capabilityBlockerResultRef:'another-answer'})).status,'awaiting_source_review');
assert.equal((await assess(paidReview,{...review,bindings:{...review.bindings,map:'stale'}})).status,'awaiting_source_review');
assert.equal((await assess(paidReview,{...review,inputs:{...review.inputs,question:{source:'literal',value:{task:question}}}})).status,'requires_revision');
console.log(JSON.stringify({check:'new-facts-wrong-source-stale-review-and-untyped-question-do-not-take-dispute-route',pass:true}));
}

// This fixture tests control scheduling, not Native scene restoration. Keep
// every work/result/evidence and non-restore event; omit only the restore ledger
// consumed by the laboratory constructor. No recorded action is re-executed.
let state={...copy(original),events:original.events.filter(e=>e.type!=='result_saved')};const memory=new Map();
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
  get:async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref),
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const options={workflowStore:store,scope:state.scope,sessionId:'offline-v967',
  laboratory:{labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'offline-v967',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){assert.fail('No Native call in control routing');}},
  deliberation:{deliberate:async()=>assert.fail('No Provider call in control routing')}};
let run=await createRosterDecisionWorkspaceRunV1(options);
await run.summarizeExperiment({id:'offline-v967-sync',question:'Unexecuted synchronization probe',toolWorkIds:[]});
const id=owner.id+':strategy-frontier',job=state.work.find(w=>w.id===id);
assert(job,'Product Run must schedule the existing strategic owner lane');
assert.equal(job.role,'roster_workflow_strategy_decision');
assert.deepEqual(job.inputs.sourceControlDispute.value.checks,paidReview.value.checks);
assert.equal(job.inputs.sourceControlDispute.value.originalResultRef,owner.resultRef);
assert.equal(job.inputs.sourceControlDispute.value.unresolvedQuestions[0].question,question);
assert.equal(job.inputs.sourceControlDispute.value.unresolvedQuestions[0].resolved,false);
assert.equal(job.inputs.disputedSourceReview.id,'role:'+review.id);
assert.equal(job.inputs.investigationFrontier.value.returnReason,'source_control_dispute');
assert.deepEqual(job.inputs.previousBatch.value.controlConclusion,paidOwner.value.experimentConclusion);
assert.deepEqual(job.inputs.investigationFrontier.value.unresolvedQuestions,paidOwner.value.unresolvedQuestions);
assert.equal(state.work.find(w=>w.id===owner.experimentGoalId).investigationHandoff.decisionId,id);
assert(!state.work.some(w=>w.id===owner.id+':source-revision'));
assert.equal(state.draftRef,original.draftRef);assert.equal(state.draftRevision,21);
console.log(JSON.stringify({check:'actual-Run-holds-fact-loop-and-delivers-both-original-positions-to-one-author',pass:true}));
run=await createRosterDecisionWorkspaceRunV1(options);
await run.summarizeExperiment({id:'offline-v967-cold-sync',question:'Unexecuted cold synchronization probe',toolWorkIds:[]});
assert.equal(state.work.filter(w=>w.id===id).length,1);
assert.equal(state.work.find(w=>w.id===owner.id).resultRef,owner.resultRef);
assert.equal(state.work.find(w=>w.id===review.id).resultRef,review.resultRef);
assert.equal(JSON.stringify({paidReview,paidOwner}),immutable);
console.log(JSON.stringify({pass:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  coldResumeDuplicates:0,historyRewritten:false,questionResolved:false,finalPlanApproved:false}));
