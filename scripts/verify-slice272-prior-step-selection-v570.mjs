// Actual75 needs solve -> select within one batch, before any evidence number
// exists. This tests compilation/binding against its saved Native solver result.
// Native geometry is not revalidated or simulated by this adapter-level test.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const reply=JSON.parse(await fs.readFile(path.join(dir,'75.reply.json'),'utf8'));
const fixture=structuredClone(reply.output.workOrders[0]);
fixture.steps[1].argumentsJson=JSON.stringify({selections:[{fromStepId:'solve-formation',optionIndex:0}]});
fixture.steps[1].bindings=fixture.steps[1].bindings.filter(b=>b.argumentPointer==='/stateRef');
const failed=state.work.findLast(w=>w.id.endsWith(':apply-formation')&&w.repairGeneration===3);
const namespace=failed.id.slice(0,-':apply-formation'.length);
const jobs=compileRosterWorkflowExperimentV1({order:fixture,scope:state.scope,namespace,evidenceDirectory:state.evidence});
const job=jobs[1],dependency=job.inputs.formationSource0;
assert.equal(dependency?.id,jobs[0].id,'same-batch selection must create an actual predecessor dependency');
assert.equal(dependency.pointer,'/value');
const memory=new Map(),get=async ref=>memory.has(ref)?memory.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const source=state.work.find(w=>w.id===jobs[0].id),sourceValue=(await get(source.resultRef)).value;
assert.equal(sourceValue.receipt.queryReceipt.result.optionCount,1);
let received;
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),
  runFormationSelectionBranch:async args=>{received=args;return {resultStatus:'ok'};}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store:{load:async()=>state,get,
  put:async value=>{const ref=`test:${memory.size}`;memory.set(ref,structuredClone(value));return ref;}}});
const inputs={request:{value:job.inputs.request.value},formationSource0:{source:'work',workId:source.id,resultRef:source.resultRef,value:sourceValue}};
for(const [name,input]of Object.entries(job.inputs))if(name.startsWith('binding')){
  const w=state.work.find(w=>w.id===input.id),v=await get(w.resultRef);
  let value=v;for(const key of input.pointer.split('/').slice(1))value=value[key];
  inputs[name]={source:'work',workId:w.id,resultRef:w.resultRef,value};
}
const result=await executor.execute({workId:job.id,inputs},{checkpointOperation:async()=>{}});
assert.equal(result.value.status,'completed');
assert.equal(received.selections[0].receipt.receiptHash,sourceValue.receipt.receiptHash);
assert.equal(received.selections[0].formationOptionId,sourceValue.receipt.queryReceipt.result.formationOptions[0].formationOptionId);
assert.equal(received.base.branchStateHash,sourceValue.receipt.baseStateHash);
const invalid=structuredClone(fixture);invalid.steps[1].argumentsJson=JSON.stringify({selections:[{fromStepId:'future',optionIndex:0}]});
assert.throws(()=>compileRosterWorkflowExperimentV1({order:invalid,scope:state.scope,namespace,evidenceDirectory:state.evidence}),/NOT_PRIOR_STEP/);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({passed:true,actualReply:75,sameBatchSourceBound:true,selectedSavedNativeOption:true,
  futureReferenceRejected:true,nativeGeometryRetested:false,providerCalls:0,productionWrites:0}));
