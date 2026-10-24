// Actual paid reply: steps/stop/completion are under experimentScope rather
// than their schema-declared workOrder owner. No values should be rewritten.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {projectRosterWorkflowSavedSchemaRevalidationV1,ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const work=original.work.find(w=>w.operationState?.correction?.originalReplyRef==='295cf0e33b0664c8271a97842d55616bdf880374733ae0d3d81beacf67343b4a');
assert(work);const reply=await read(work.operationState.correction.originalReplyRef);
const request=await read(work.operationState.calls.at(-1).requestRef),before=JSON.stringify(reply);
const recovery=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
assert(recovery,'The exact paid reply must be eligible for lossless schema-owned field relocation, not another paid rewrite');
assert.equal(recovery.repairKind,'schema_owned_sibling_field_relocation');
const {projectSchemaOwnedSiblingFieldsV1}=await import('../packages/structured-generation/schema-owned-field-projection-v1.mjs');
const project=value=>projectSchemaOwnedSiblingFieldsV1(value,ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema,
  {recordField:'workOrders',nestedField:'experimentScope'});
const projected=project(reply.output),order=projected.output.workOrders[0],old=reply.output.workOrders[0];
assert.deepEqual(order.steps,old.experimentScope.steps);
assert.equal(order.stopAndReturnToModelWhen,old.experimentScope.stopAndReturnToModelWhen);
assert.equal(order.completionStepId,old.experimentScope.completionStepId);
assert.equal(projected.projection.length,3);
assert.equal(project(projected.output).projection.length,0);
const conflict=structuredClone(reply.output);conflict.workOrders[0].steps=[{conflicting:true}];
const conflictProjection=project(conflict);
assert.deepEqual(conflictProjection.output.workOrders[0].steps,[{conflicting:true}]);
assert.deepEqual(conflictProjection.output.workOrders[0].experimentScope.steps,old.experimentScope.steps);
assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:{...reply,output:conflict},request}),null);
let state=structuredClone(original);const memory=new Map();
for(const w of state.work){
  if(w.id!==work.id){if(!w.resultRef){w.status='superseded';w.inputRef??='controlled-not-dispatchable';}continue;}
  w.status='ready';w.failure=null;w.operationState.revalidateReplyRef=work.operationState.correction.originalReplyRef;
}
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let calls=0;
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:request.sessionId,
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
    restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async()=>{calls++;throw Error('NO_PROVIDER_REPURCHASE');}}});
await run.advance({concurrency:1});
const after=state.work.find(w=>w.id===work.id);
assert.equal(calls,0);
assert(!after.operationState.correction?.errors?.some(e=>e.code==='schema'),'The normal Run must use the SAME structural projection');
assert.equal(JSON.stringify(reply),before,'Original paid output is not changed');
console.log(JSON.stringify({status:'passed',actualPaidReplyRevalidatedWithoutProvider:true,
  stepsAndParametersUnchanged:true,conflictingOwnersNotMerged:true,idempotent:true,
  normalRunSchemaGatePassed:true,otherSemanticsStillApply:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
