// Concrete stop: the model bound a domain ID over the whole argumentsJson,
// destroying its query object. Exercise the product compiler/executor seam.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const failed=state.work.findLast(w=>w.id.startsWith('p5-current-obligations-v577:r2:map_and_arrival:owner:')
  &&w.role==='roster_workflow_tool'&&w.repairGeneration===3&&w.inputs.request.value.operation==='spatial');
assert.ok(failed,'actual invalid nested JSON stop required');
const original=await get(failed.resultRef);
assert.equal(original.value.receipt.unknownReason,'SCENE_QUERY_ARGUMENTS_JSON_INVALID');
assert.equal(typeof JSON.parse(original.value.inputBindings[0].priorValue),'object');
assert.throws(()=>JSON.parse(original.value.request.argumentsJson));
const sourceWorkId=original.value.inputBindings[0].sourceWorkId;
const source=state.work.find(w=>w.id===sourceWorkId),sourceValue=await get(source.resultRef);
const sourceNumber=state.evidence.findIndex(e=>e.id==='tool:'+sourceWorkId)+1;
assert.ok(sourceNumber>0);
const queryArguments=JSON.parse(original.value.inputBindings[0].priorValue);delete queryArguments.domainId;
const args={selection:{sourceEvidenceNumber:sourceNumber,kind:'domain',match:{actionType:'deploy',pieceId:'u_marine_2'}},
  queryKind:'space.solve_formation',queryArguments};
const order={orderId:'typed-native-query',purpose:'Same model-selected query, source-owned identity without JSON-string binding',
  scenarioAssumptions:[],stopAndReturnToModelWhen:'After exact query result',completionStepId:'solve',steps:[{
    stepId:'solve',operation:'spatial',argumentsJson:JSON.stringify(args),bindings:[],guards:[],publicReason:'Preserve the original model intent'}]};
const [job]=compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'v585',evidenceDirectory:state.evidence});
const memory=new Map();let queryCalls=0,received;
const store={load:async()=>state,get:async ref=>memory.get(ref)??get(ref),put:async value=>{
  const ref='memory:'+memory.size;memory.set(ref,structuredClone(value));return ref;}};
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),querySpatial:async input=>{
  queryCalls++;received={...input,parsed:JSON.parse(input.argumentsJson)};
  return {resultStatus:'ok',baseStateHash:input.base.branchStateHash,sourceStateHash:state.scope.source,queryKind:input.queryKind};}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
async function execute(compiled){const inputs={};for(const [name,input]of Object.entries(compiled.inputs)){
  inputs[name]=input.source==='literal'?input:{source:input.source,workId:source.id,resultRef:source.resultRef,value:sourceValue.value};}
  return executor.execute({workId:compiled.id,scope:state.scope,inputs},{operationState:null,checkpointOperation:async()=>{}});}
const result=await execute(job);
assert.equal(result.value.status,'completed','typed query must reach the Native port as a valid JSON object, not a raw domain ID');
const domain=sourceValue.value.receipt.actionSpace.parameterDomains.find(d=>d.actionType==='deploy'&&d.pieceId==='u_marine_2');
assert.deepEqual(received.parsed,{...queryArguments,domainId:domain.domainId});
assert.equal(received.base.branchStateHash,sourceValue.value.receipt.baseStateHash);
assert.equal(received.seatKey,domain.sideKey);assert.equal(queryCalls,1);
assert.equal(executor.projectRepair(original.value).correctable,true);
const future=structuredClone(order);future.steps[0].argumentsJson=JSON.stringify({...args,
  selection:{fromStepId:'new-inspect',kind:'domain',match:{actionType:'deploy',pieceId:'u_marine_2'}}});
const [futureJob]=compileRosterWorkflowExperimentV1({order:future,scope:state.scope,namespace:'future',
  evidenceDirectory:state.evidence,priorSteps:[{stepId:'new-inspect',workId:source.id}]});
const waiting=await execute(futureJob);assert.equal(waiting.value.status,'awaiting_model_choice');assert.equal(queryCalls,1);
const conflict=structuredClone(order);conflict.steps[0].argumentsJson=JSON.stringify({...args,argumentsJson:'{}'});
assert.throws(()=>compileRosterWorkflowExperimentV1({order:conflict,scope:state.scope,namespace:'conflict',evidenceDirectory:state.evidence}),
  /TYPED_SCENE_QUERY/);
console.log(JSON.stringify({passed:true,actualInvalidJsonStop:failed.id,originalIntentUnchanged:true,
  sourceOwnsParentSeatDomain:true,unknownFutureMenuNotExecuted:true,providerCalls:0,productionWrites:0,realNative:false}));
