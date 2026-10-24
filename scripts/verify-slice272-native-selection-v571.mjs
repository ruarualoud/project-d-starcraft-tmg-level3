// Actual78 combined a deploy domain with a different, geometry-only parent.
// Prove the source-bound adapter using that saved request; no Native reexecution.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const reply=JSON.parse(await fs.readFile(path.join(dir,'78.reply.json'),'utf8'));
const fixture=structuredClone(reply.output.workOrders[0]),params=JSON.parse(fixture.steps[0].argumentsJson).action.parameters;
fixture.steps[0].argumentsJson=JSON.stringify({selection:{sourceEvidenceNumber:279,kind:'domain',index:2,parameters:params}});
fixture.steps[0].bindings=[];
const compile=order=>compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'test571',evidenceDirectory:state.evidence});
const jobs=compile(fixture),sourceId=state.evidence[278].id.replace(/^tool(?:-view)?:/,'');
assert.equal(jobs[0].inputs.nativeActionSource?.id,sourceId,'action selection must bind the exact inspected menu and its parent together');
const memory=new Map(),get=async ref=>memory.has(ref)?memory.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const source=state.work.find(w=>w.id===sourceId),sourceValue=(await get(source.resultRef)).value;
let received,calls=0;
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source}),
  runScenarioBranch:async args=>{received=args;calls++;return {resultStatus:'ok'};}},
  store:{load:async()=>state,get,put:async value=>{const ref=`test:${memory.size}`;memory.set(ref,structuredClone(value));return ref;}}});
const execute=async job=>executor.execute({workId:job.id,inputs:{request:{value:job.inputs.request.value},
  nativeActionSource:{source:'work',workId:sourceId,resultRef:source.resultRef,value:sourceValue}}},{checkpointOperation:async()=>{}});
const result=await execute(jobs[0]);
assert.equal(result.value.status,'completed');
assert.equal(received.base.branchStateHash,sourceValue.receipt.baseStateHash);
assert.equal(received.seatKey,'player1');
assert.deepEqual(JSON.parse(received.argumentsJson),{domainId:sourceValue.receipt.actionSpace.parameterDomains[2].domainId,parameters:params});
assert.equal(result.value.inputBindings[0].sourceWorkId,sourceId);
assert.deepEqual(result.value.submittedArguments,JSON.parse(fixture.steps[0].argumentsJson));
const finite=structuredClone(fixture);finite.steps[0].argumentsJson=JSON.stringify({selection:{sourceEvidenceNumber:279,kind:'finite',index:0}});
await execute(compile(finite)[0]);
assert.deepEqual(JSON.parse(received.argumentsJson),{actionKey:sourceValue.receipt.actionSpace.finiteActions[0].proposal.actionKey});
const sameBatch=structuredClone(fixture);sameBatch.steps.unshift({stepId:'inspect-source',operation:'inspect',argumentsJson:'{}',bindings:[],guards:[],publicReason:'Read selected parent'});
sameBatch.steps[1].argumentsJson=JSON.stringify({selection:{fromStepId:'inspect-source',kind:'domain',index:2,parameters:params}});
assert.equal(compile(sameBatch)[1].inputs.nativeActionSource.id,'test571:inspect-source');
for(const bad of [
  {selection:{sourceEvidenceNumber:279,kind:'finite',index:0,parameters:params}},
  {selection:{sourceEvidenceNumber:279,kind:'domain',index:2}},
  {selection:{sourceEvidenceNumber:279,kind:'domain',index:2,parameters:params},stateRef:sourceValue.stateRef},
  {selection:{sourceEvidenceNumber:279,fromStepId:'inspect-source',kind:'domain',index:2,parameters:params}},
]){const order=structuredClone(fixture);order.steps[0].argumentsJson=JSON.stringify(bad);assert.throws(()=>compile(order),/NATIVE_SELECTION/);}
const outOfRange=structuredClone(fixture);outOfRange.steps[0].argumentsJson=JSON.stringify({selection:{sourceEvidenceNumber:279,kind:'finite',index:999999}});
const missing=await execute(compile(outOfRange)[0]);
assert.equal(missing.value.status,'returned_to_model');assert.equal(missing.value.executed,false);
assert.equal(calls,2,'invalid selection must never invoke Native');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({passed:true,actualReply:78,exactParentMenuSeatBound:true,parametersUnchanged:true,
  finiteAndDomainCovered:true,sameBatchDependency:true,conflictingParentRejected:true,missingChoiceReturned:true,
  nativeRulesRetested:false,providerCalls:0,productionWrites:0}));
