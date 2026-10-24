// Actual corrected formation_scene has a valid parent and selection, but the
// Host appends queryId to a branch-only interface and rejects its own field.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const source=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const id='review-resolution:r12:combat_and_losses:method:84c9e330df28a9d0:strategy-frontier:investigation:order0:apply-formation:observed-choice:order0:apply-formation:input-repair:order0:apply-formation';
const work=source.work.find(w=>w.id===id);assert(work);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const original=await get(work.resultRef);assert.equal(original.value.code,'ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID');
assert(original.value.request.base);assert.equal(original.value.request.queryId,id);
const memory=new Map(),store={load:async()=>structuredClone(source),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const calls=[],lab={labDescriptor:()=>({sourceStateHash:source.scope.source,rulesRuntimeHash:source.scope.rules}),
  runFormationSelectionBranch:async args=>{calls.push({kind:'formation',args:structuredClone(args)});
    return {resultStatus:'ok',branchKind:'static_formation',sourceStateHash:source.scope.source,
      baseStateHash:args.base.branchStateHash,branchStateHash:'a'.repeat(64)};},
  captureSceneLayout:()=>({controlled:true}),runProjectedScenarioBranch:async args=>{calls.push({kind:'projection',args:structuredClone(args)});
    return {resultStatus:'ok',branchKind:'projected_scenario',sourceStateHash:source.scope.source,
      baseStateHash:args.base.branchStateHash,branchStateHash:'b'.repeat(64)};}};
const execute=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
const inputs=structuredClone(work.inputs);
const at=(v,p)=>p.split('/').slice(1).reduce((o,k)=>o[k.replace(/~1/g,'/').replace(/~0/g,'~')],v);
for(const[key,input]of Object.entries(inputs))if(input.source==='work'){
  const prior=source.work.find(w=>w.id===input.id),value=await get(prior.resultRef);
  inputs[key]={...input,workId:prior.id,resultRef:prior.resultRef,value:at(value,input.pointer),status:'read'};
}
const result=await execute.execute({workId:id,scope:work.bindings,inputs},{operationState:{},checkpointOperation:async()=>{}});
assert.equal(result.value.status,'completed','Host queryId must not invalidate the actual corrected formation request');
assert.equal(calls.length,1);assert.equal(calls[0].kind,'formation');
assert.deepEqual(calls[0].args.base,original.value.request.base);
assert.equal(calls[0].args.branchId,id);
const solver=await get(source.work.find(w=>w.id===inputs.binding0.workId).resultRef);
assert.deepEqual(calls[0].args.selections[0].receipt,solver.value.receipt);
assert.equal(calls[0].args.selections[0].formationOptionId,solver.value.receipt.queryReceipt.result.formationOptions[0].formationOptionId);
assert(!Object.hasOwn(result.value.request,'queryId'));
// project_scene uses the same branch-only identity interface and had the same
// unconditional queryId injection. Only its call is controlled here.
const stateRef=original.value.submittedArguments.stateRef;
const projected=await execute.execute({workId:'controlled-project-v672',scope:source.scope,inputs:{request:{source:'literal',value:{
  ...structuredClone(inputs.request.value),operation:'project_scene',args:{stateRef,referenceStateRef:stateRef,changedUnits:[],unlistedUnits:'preserve'},
  bindings:[],formationSelectionSources:[],modelChoiceSources:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
assert.equal(projected.value.status,'completed');assert.equal(calls.length,2);assert.equal(calls[1].kind,'projection');
assert(!Object.hasOwn(projected.value.request,'queryId'));
const invalid=structuredClone(inputs);invalid.request.value.args.unexpectedModelArgument=true;
const rejected=await execute.execute({workId:'controlled-invalid-v672',scope:source.scope,inputs:invalid},
  {operationState:{},checkpointOperation:async()=>{}});
assert.equal(rejected.value.code,'ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID');assert.equal(calls.length,2);
console.log(JSON.stringify({status:'passed',actualFailedWork:id,exactParentAndSelectedSavedOptionPreserved:true,
  branchIdentityRetained:true,hostQueryIdNotLeakedToBranchMutations:true,unrecognizedModelFieldsStillRejected:true,
  actualExecutorUsed:true,providerCalls:0,nativeCalls:0,productionWrites:0,laboratoryCallsControlled:true,
  realNativeRecoveryStillPending:true}));
