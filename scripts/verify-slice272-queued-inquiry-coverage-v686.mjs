// Existing queued coverage must receive the corrected exact question too;
// fixing only creation of future reviews leaves the saved product stop wrong.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
let state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const target=state.work.findLast(w=>w.role==='roster_workflow_final_review'&&w.experimentSourceReviewOf&&w.status==='ready');
assert(target);const originalInputs=structuredClone(target.inputs);
for(const w of state.work)if(w.id!==target.id&&!w.resultRef){w.status='superseded';w.inputRef??='controlled-fixture-not-dispatchable';}
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const owner=state.work.find(w=>w.id===target.experimentSourceReviewOf);
const parentEvidence=state.evidence.find(e=>e.id===owner.inputs.decision.id);
const expected=(await read(parentEvidence.artifactRef)).decisions[0].requiredData;
assert(expected.length);const memory=new Map();
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let observed;
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:'controlled-v686-coverage',
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
    restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async request=>{observed=request;throw Object.assign(Error('CONTROLLED_REQUEST_CAPTURED'),{dispatchOutcome:'not_dispatched'});}}});
await run.advance({concurrency:1});
const assignment=observed?.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.equal(assignment?.workId,target.id);
assert.deepEqual(assignment.inputs.question?.value?.necessaryQuestions,expected,
  'The queued product coverage must judge the exact same pending comparison and source questions');
assert.deepEqual(state.work.find(w=>w.id===target.id).inputs,originalInputs,'Saved original assignment remains auditable');
console.log(JSON.stringify({status:'passed',existingQueuedCoverageUsesExactQuestion:true,
  originalSavedInputUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
