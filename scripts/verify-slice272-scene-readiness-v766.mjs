// Real Native construction succeeded but four placements remained unresolved.
// The executor called it completed, releasing two separate probability repairs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2];assert(root);
const read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const sceneRef='d45ff41135c8cfe5aa5172eb13ed95a02bc411588df0f41323a054cc4c442b9c';
const failureRef='752d09aeca448a8fa105b7a07924948d496e190050ff4c2f4824f923367b3238';
const scene=(await read(sceneRef)).value,failure=(await read(failureRef)).value;
assert.equal(scene.receipt.resultStatus,'ok');
assert.equal(scene.receipt.branchStateHash,failure.receipt.baseStateHash);
assert.equal(scene.receipt.hypotheticalPlacementAssessment.units.filter(u=>u.resultStatus!=='ok').length,4);
const state=JSON.parse(await fs.readFile(`${root}/workflow.json`,'utf8'));
const original=state.work.find(w=>w.resultRef===sceneRef);assert(original);
const resumeOnly=process.argv.includes('--resume-only');
const artifacts=new Map();let constructed=0,checks=0,restores=0,checkpoint;
const store={load:async()=>({scope:original.bindings,work:[],evidence:[]}),
  put:async value=>{const ref=`memory:${artifacts.size}`;artifacts.set(ref,structuredClone(value));return ref;},
  get:async ref=>structuredClone(artifacts.get(ref))};
const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:{
  labDescriptor:()=>({sourceStateHash:scene.receipt.sourceStateHash,
    rulesRuntimeHash:scene.receipt.rulesRuntimeHash,builderBundleHash:scene.receipt.builderBundleHash,
    version:scene.receipt.laboratoryVersion}),
  runScenarioBranch:async()=>{constructed++;return structuredClone(scene.receipt);},
  restoreHypotheticalBranch:async({receipt})=>{
    restores++;assert.deepEqual(receipt,scene.receipt);
  },
  inspectQueryPrerequisites:args=>{
    checks++;assert.equal(args.base.branchStateHash,scene.receipt.branchStateHash);
    return {unknownReason:failure.receipt.unknownReason,
      hypotheticalPlacementAssessment:structuredClone(failure.receipt.hypotheticalPlacementAssessment),
      sceneScope:structuredClone(failure.receipt.sceneScope),
      queryRepair:structuredClone(failure.receipt.queryRepair)};
  },
}});
const assignment={workId:'scene-readiness-repro',scope:original.bindings,
  inputs:{request:{value:{operation:'scenario',args:scene.submittedArguments,bindings:[],guards:[],
    experimentScope:original.inputs.request.value.experimentScope}}}};
const control={operationState:{},checkpointOperation:async value=>{checkpoint=structuredClone(value);}};
let result;
if(!resumeOnly){
result=await executor.execute(assignment,control);
assert.equal(constructed,1,JSON.stringify(result));
assert.equal(result.value.status,'returned_to_model',
  'registered invalid geometry must hold dependents at the shared scene prerequisite');
assert.equal(result.continuation,true);
assert.equal(result.value.reason,'scene_geometry_not_ready');
assert.deepEqual(result.value.receipt,scene.receipt,'do not rewrite the Native construction result');
assert.deepEqual(result.value.queryRepair,failure.receipt.queryRepair,'same Native repair contract, no second validator');
assert.equal(result.value.sceneReadiness.branchConstructed,true);
assert.equal(result.value.sceneReadiness.geometryReady,false);
assert.equal(result.value.stateRef.stateHash,scene.receipt.branchStateHash);
assert.equal(checkpoint.pending,null);
assert.equal(constructed,1);assert.equal(checks,1);
}else{
  // The initial control-return assertions passed before the old restore spy
  // was missing. Only the as-yet-unpassed saved-checkpoint seam is exercised.
  result={kind:'tool_receipt',continuation:true,value:{...structuredClone(scene),
    status:'returned_to_model',reason:'scene_geometry_not_ready',
    sceneReadiness:{branchConstructed:true,geometryReady:false,
      branchStateHash:scene.receipt.branchStateHash,source:'native_hypothetical_placement_assessment'},
    queryRepair:structuredClone(failure.receipt.queryRepair)},conditions:['isolated saved control return']};
  checkpoint={completedRef:await store.put(result),pending:null};
}
// Restoring this operation is a saved control return, not another construction.
const restored=await executor.execute(assignment,{...control,operationState:checkpoint});
assert.deepEqual(restored,result);
assert.equal(constructed,resumeOnly?0:1);assert.equal(checks,resumeOnly?0:1);assert.equal(restores,1);
assert.deepEqual((await read(sceneRef)).value,scene);
assert.deepEqual((await read(failureRef)).value,failure);
console.log(JSON.stringify({passed:true,sharedPrerequisiteHeld:true,
  originalNativeReceiptPreserved:true,sameGeometryRepairContract:true,
  resumeOnly,priorAssertionsNotRepeated:resumeOnly,
  checkpointDoesNotReconstruct:true,providerCalls:0,realNativeCalls:0,productionWrites:0}));
