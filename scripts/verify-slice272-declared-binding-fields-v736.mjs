// Actual corrected order bound /domainId from an explicit source, but lacked
// a redundant literal null. Compiler rejected it before any query could run.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=path.resolve(process.argv[2]);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const originalText=await fs.readFile(path.join(root,'workflow.json'),'utf8'),state=JSON.parse(originalText);
const owner=state.work.find(w=>w.orderRepairGeneration===3
  &&w.id.endsWith('prob-goliath:observed-choice:order-repair0:order-repair0:order-repair0'));
assert.ok(owner);
const result=await read(owner.resultRef),failed=result.value.failedWorkOrders[0],order=failed.order;
assert.equal(failed.error.code,'ROSTER_WORKFLOW_BINDING_TARGET_MISSING');
assert.equal(failed.error.detail.argumentPointer,'/domainId');
const entry=state.evidence[order.experimentScope.comparisonBinding.purposeEvidenceNumber-1];
const purpose=(await read(entry.artifactRef)).proposals[0].comparisonPurpose;
const compile=order=>compileRosterWorkflowExperimentV1({order,scope:owner.bindings,
  namespace:'v736-compile-only',evidenceDirectory:state.evidence,
  comparisonPurpose:{status:'read',evidenceId:entry.id,
    evidenceNumber:order.experimentScope.comparisonBinding.purposeEvidenceNumber,value:purpose}});
const failures=[];
try{
  const jobs=compile(order),probability=jobs.find(w=>w.inputs.request.value.operation==='probability');
  assert.ok(probability);
  assert.equal(Object.hasOwn(probability.inputs.request.value.args,'domainId'),false,
    'Host must not fabricate a selected weapon or rewrite the model proposal');
  assert.ok(probability.inputs.request.value.bindings.some(b=>b.pointer==='/domainId'));
  assert.ok(probability.inputs.request.value.modelChoiceSources?.length,
    'a future menu index must return to the model after observation, not blindly select a weapon');
  const unsupported=structuredClone(order);
  const step=unsupported.steps.find(s=>s.operation==='probability');
  step.bindings.find(b=>b.argumentPointer==='/domainId').argumentPointer='/inventedChoiceField';
  assert.throws(()=>compile(unsupported),e=>e.code==='ROSTER_WORKFLOW_BINDING_TARGET_MISSING');
  const saved=(await read('beb63d2728d824bc9addede29e924b0555725ab6a3ba4d146ed46060fb08fd55')).value;
  let received;const memory=new Map();
  const executor=createRosterWorkflowLaboratoryExecutorV1({
    laboratory:{labDescriptor:()=>({sourceStateHash:saved.receipt.sourceStateHash}),
      queryProbability:async args=>{received=args;return {resultStatus:'ok'};}},
    store:{load:async()=>state,get:async ref=>memory.get(ref)??await read(ref),
      put:async value=>{const ref='memory:'+memory.size;memory.set(ref,structuredClone(value));return ref;}}});
  const outcome=await executor.execute({workId:'v736:binding-execution-only',scope:state.scope,inputs:{
    request:{value:{operation:'probability',args:{attackerUnitId:saved.request.attackerUnitId,
      targetUnitId:saved.request.targetUnitId},experimentScope:order.experimentScope,
      bindings:[{name:'chosenDomain',pointer:'/domainId'}],guards:[],resultGuards:[]}},
    chosenDomain:{workId:'explicit-saved-choice',value:saved.request.domainId}}},
    {operationState:{},checkpointOperation:async()=>{}});
  assert.equal(received.domainId,saved.request.domainId);
  assert.equal(outcome.value.inputBindings[0].priorFieldPresent,false);
}catch(e){failures.push({case:'declared-dynamic-field-without-placeholder',error:e.code??e.message});}
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),originalText);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
