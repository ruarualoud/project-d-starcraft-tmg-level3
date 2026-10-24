// Real v585 solver returned six Rules-instantiated candidates. The workflow
// still requires retyping their parameters instead of selecting the option.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const directory=path.resolve(process.argv[2]),base=path.join(directory,'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const source=state.work.find(w=>w.id.endsWith(':solve-formation-typed')&&w.status==='evidence_ready');
const original=await read(source.resultRef),value=original.value;
const options=value.receipt.queryReceipt.result.formationOptions;assert.ok(options.length>1);
const sourceNumber=state.evidence.findIndex(e=>e.id==='tool:'+source.id)+1;
const args={selection:{sourceEvidenceNumber:sourceNumber,kind:'formation',index:0}};
const order={orderId:'native-option',purpose:'Explicit scripted option choice, not a strategy or Native re-validation',
  scenarioAssumptions:[],completionStepId:'deploy',stopAndReturnToModelWhen:'After Native result',steps:[{
    stepId:'deploy',operation:'native_action',argumentsJson:JSON.stringify(args),bindings:[],guards:[],publicReason:'Select saved whole Native option'}]};
const [job]=compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'v586',evidenceDirectory:state.evidence});
const memory=new Map();let nativeCalls=0,received;
const store={load:async()=>state,get:async ref=>memory.get(ref)??read(ref),put:async v=>{
  const ref='memory:'+memory.size;memory.set(ref,structuredClone(v));return ref;}};
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),runScenarioBranch:async input=>{
  nativeCalls++;received=input;return {resultStatus:'ok',sourceStateHash:state.scope.source,
    baseStateHash:input.base.branchStateHash,branchStateHash:'a'.repeat(64),branchKind:'native_action'};}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
async function execute(compiled,selectedValue=value){const inputs={};for(const [name,input]of Object.entries(compiled.inputs))
  inputs[name]=input.source==='literal'?input:{workId:source.id,resultRef:source.resultRef,value:selectedValue};
  return executor.execute({workId:compiled.id,scope:state.scope,inputs},{operationState:null,checkpointOperation:async()=>{}});}
const result=await execute(job);assert.equal(result.value.status,'completed');assert.equal(nativeCalls,1);
assert.deepEqual(JSON.parse(received.argumentsJson),{domainId:options[0].domainId,parameters:options[0].canonicalParameters});
assert.equal(received.base.branchStateHash,value.receipt.baseStateHash);assert.equal(received.seatKey,value.receipt.seatKey);
const staticSource=structuredClone(value);staticSource.receipt.queryKind='space.solve_static_formation';
const staticRejected=await execute(job,staticSource);assert.equal(staticRejected.continuation,true);assert.equal(nativeCalls,1);
const ambiguous=structuredClone(order);ambiguous.steps[0].argumentsJson=JSON.stringify({selection:{sourceEvidenceNumber:sourceNumber,
  kind:'formation',match:{pieceId:'u_marine_2'}}});
const [ambiguousJob]=compileRosterWorkflowExperimentV1({order:ambiguous,scope:state.scope,namespace:'ambiguous',evidenceDirectory:state.evidence});
assert.equal((await execute(ambiguousJob)).continuation,true);assert.equal(nativeCalls,1);
const future=structuredClone(order);future.steps[0].argumentsJson=JSON.stringify({selection:{fromStepId:'solve',kind:'formation',index:0}});
const [futureJob]=compileRosterWorkflowExperimentV1({order:future,scope:state.scope,namespace:'future',evidenceDirectory:state.evidence,
  priorSteps:[{stepId:'solve',workId:source.id}]});
const waiting=await execute(futureJob);assert.equal(waiting.value.status,'awaiting_model_choice');
assert.equal(waiting.value.sourceReads[0].requiresInspect,undefined);assert.equal(nativeCalls,1);
assert.deepEqual(await read(source.resultRef),original);
console.log(JSON.stringify({passed:true,actualNativeCandidateCount:options.length,explicitWholeOptionSelection:true,
  canonicalParametersUnchanged:true,staticAndAmbiguousRejected:true,futureMenuNotExecuted:true,
  providerCalls:0,productionWrites:0,realNativeExecution:false}));
