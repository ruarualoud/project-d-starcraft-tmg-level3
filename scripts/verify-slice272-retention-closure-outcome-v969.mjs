// Actual r22 retention was saved but silently lost before closure review.
// Replay only that handoff through the public product Run, entirely in memory.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {resolveRosterComparisonClosureRequestV1} from '../packages/roster-strategist/roster-comparison-closure-v1.mjs';
import {createRosterWorkflowNonRevisionOutcomeV1} from '../packages/roster-strategist/roster-workflow-decision-records-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone;
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
assert.equal(original.draftRevision,22);
const author=original.work.find(w=>w.id.endsWith('closure-reconsider:r22'));
assert(author?.draftOutcomeRef&&author.resultRef);
const authored=await disk(author.resultRef),outcome=await disk(author.draftOutcomeRef);
const handoff=authored.value.comparisonClosureHandoff,decision=authored.value.decisions[0];
assert.equal(outcome.status,'retain');assert.equal(Object.hasOwn(outcome,'acceptanceGranted'),false);
const cycle={id:handoff.cycleId,comparisonPurposeWorkId:handoff.purposeWorkId,
  comparisonPurposeResultRef:handoff.purposeResultRef};
const frozen=hash(original),source=hash(outcome);
const resolved=await resolveRosterComparisonClosureRequestV1({state:original,cycle,readArtifact:disk,authorWorkId:author.id});
assert(resolved,'Actual retained closure request was silently ignored because its producer omitted acceptanceGranted');
assert.deepEqual(resolved.request,handoff.request);
assert.deepEqual(resolved.questions,handoff.questions);
const current=createRosterWorkflowNonRevisionOutcomeV1(decision);
assert.equal(current.acceptanceGranted,false,'The producer must explicitly declare non-acceptance');
assert.deepEqual(current.decision,outcome.decision);
console.log(JSON.stringify({check:'actual-saved-and-current-produced-retention-resolve-without-approval',pass:true}));

for(const [name,changed] of [
  ['explicit-approval',{...outcome,acceptanceGranted:true}],
  ['null-approval',{...outcome,acceptanceGranted:null}],
  ['wrong-decision',{...outcome,decision:{...outcome.decision,publicReason:'not the saved author decision'}}],
  ['not-retained',{...outcome,status:'investigate'}],
  ['changed-draft',{...outcome,draftUnchanged:false}],
]){
  const read=async ref=>ref===author.draftOutcomeRef?changed:disk(ref);
  assert.equal(await resolveRosterComparisonClosureRequestV1({state:original,cycle,readArtifact:read,authorWorkId:author.id}),null,name);
}
const stale=copy(original);stale.scope.map='different-map';
assert.equal(await resolveRosterComparisonClosureRequestV1({state:stale,cycle,readArtifact:disk,authorWorkId:author.id}),null);
console.log(JSON.stringify({check:'explicit-approval-wrong-decision-and-stale-dependencies-still-rejected',pass:true}));

// Native restoration is unrelated: this gate makes no Native/Provider call.
let state={...copy(original),events:original.events.filter(e=>e.type!=='result_saved')};
const memory=new Map(),cache=new Map();
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
  get:async ref=>{if(memory.has(ref))return copy(memory.get(ref));if(!cache.has(ref))cache.set(ref,await disk(ref));return copy(cache.get(ref));},
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const options={workflowStore:store,scope:state.scope,sessionId:'offline-v969',
  laboratory:{labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'offline-v969',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){assert.fail('No Native execution');}},
  deliberation:{deliberate:async()=>assert.fail('No Provider execution')}};
let run=await createRosterDecisionWorkspaceRunV1(options);
const scheduled=await run.requestComparisonClosureReview({cycleId:cycle.id,authorWorkId:author.id});
assert.deepEqual(scheduled.scheduled,[resolved.reviewId]);
const review=state.work.find(w=>w.id===resolved.reviewId);
assert.deepEqual(review.inputs.closureScope.value.request,handoff.request);
assert.equal(review.comparisonClosureResultRef,author.resultRef);
assert.equal(review.status,'ready');assert.equal(review.resultRef,null);
run=await createRosterDecisionWorkspaceRunV1(options);
assert.deepEqual((await run.requestComparisonClosureReview({cycleId:cycle.id,authorWorkId:author.id})).scheduled,[]);
assert.equal(state.work.filter(w=>w.id===resolved.reviewId).length,1);
assert.equal(state.draftRef,original.draftRef);assert.equal(state.acceptanceGranted,false);
assert.equal(hash(original),frozen);assert.equal(hash(await disk(author.draftOutcomeRef)),source);
console.log(JSON.stringify({pass:true,check:'public-Run-and-cold-resume-enqueue-one-review-not-another-study',
  providerCalls:0,nativeCalls:0,productionWrites:0,originalOutcomeRewritten:false,planApproved:false}));
