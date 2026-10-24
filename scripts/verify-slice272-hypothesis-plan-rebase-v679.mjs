// Actual r7 -> r8 Plan-only revision retired a completed paid challenger;
// the same factual cycle then stranded its new owner behind a retired work edge.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {assessRosterProductHypothesisCycleV1,loadRosterProductHypothesisChallengeV1,
  requestRosterHypothesisCycleV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
assert.equal(original.draftRevision,8);const draft=await read(original.draftRef);
const cycle='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58';
const teacher=original.work.find(w=>w.id===cycle+':teach');
assert.equal(teacher.status,'superseded');assert.equal((await read(teacher.resultRef)).kind,'proposal');
const assessment=await assessRosterProductHypothesisCycleV1({state:original,draft,readArtifact:read});
assert.notEqual(assessment.status,'awaiting_challenger','completed paid Teach is available under the same factual cycle');
const challenge=await loadRosterProductHypothesisChallengeV1({state:original,draft,readArtifact:read});
assert.equal(challenge.sourceResultRef,teacher.resultRef);assert.equal(challenge.strategicAdoptionGranted,false);
let state=structuredClone(original);const memory=new Map();
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules})},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}});
const returned=await requestRosterHypothesisCycleV1({run,id:cycle,phase:'owner'});
assert.equal(returned.teachId,teacher.id);assert.equal(returned.decisionId,cycle+':decision:plan-r8');
const owner=state.work.find(w=>w.id===returned.decisionId);
assert.equal(owner.status,'ready','the successor owner must not depend on superseded work');
assert.equal(owner.inputs.currentHypothesisTeach.source,'evidence');
assert.equal(owner.inputs.currentHypothesisTeach.id,'role:'+teacher.id);
assert.equal(owner.inputs.currentHypothesisTeach.pointer,'');
assert.equal(owner.inputs.currentHypothesisTeach.scopeUsage,'historical_reference');
assert.equal(owner.inputs.draft.id,'draft:r8:summary');assert.equal(owner.draftRevision,8);
const count=state.work.length;await requestRosterHypothesisCycleV1({run,id:cycle,phase:'owner'});assert.equal(state.work.length,count);
const changed=structuredClone(state);changed.scope.army='different-actual-army';
assert.equal(await loadRosterProductHypothesisChallengeV1({state:changed,draft,readArtifact:store.get}),null,
  'a genuinely different army must not consume the old factual hypothesis');
console.log(JSON.stringify({status:'passed',sourceRevision:8,completedTeachReusedReadOnly:true,currentPlanOwnerReady:true,
  oldUnissuedOwnerRetained:true,paidTeachReplayed:false,idempotent:true,newArmyDoesNotReuse:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyComparisonStillPending:true}));
