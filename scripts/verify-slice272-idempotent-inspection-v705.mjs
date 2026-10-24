// Actual successful complete read was converted to a failure solely because
// the same experiment had already observed it, spawning geometry repairs.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const artifact=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const old=(await artifact('d0647b7292261412d85a9d7dcd5c431fad05ce7b95d1eccb7d1d3080e3d763d7')).value;
assert.equal(old.reason,'repeated_inspection_without_new_information');
assert.equal(old.queryReuse.newObservation,false);
const prior=(await artifact(old.queryReuse.originalResultRef)).value;
assert.equal(prior.status,'completed');assert.deepEqual(old.receipt,prior.receipt);assert.deepEqual(old.request,prior.request);
const originalId='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1:study:order0:scene-b:input-repair:order0:repair-choice:order0:inspect-applied-scene';
assert.ok(state.work.some(work=>work.id===originalId));
const memory=new Map();let serial=0,inspectorCalls=0,currentReceipt=structuredClone(old.receipt);
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):artifact(ref),
  put:async value=>{const ref='fixture-'+(++serial);memory.set(ref,JSON.parse(JSON.stringify(value)));return ref;}};
const laboratory={labDescriptor:()=>({sourceStateHash:old.receipt.sourceStateHash}),
  describeQueryContext:async()=>{inspectorCalls++;return structuredClone(currentReceipt);}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
const execute=(resultGuards=[])=>executor.execute({workId:originalId,scope:state.scope,
  inputs:{request:{value:{operation:'inspect',args:structuredClone(old.request),bindings:[],guards:[],resultGuards}}}},
  {operationState:{},checkpointOperation:async()=>{}});
const snapshot=JSON.stringify(state),result=await execute();
assert.equal(result.value.status,'completed','identical successful inspect is not a tool failure');
assert.notEqual(result.continuation,true);assert.deepEqual(result.value.receipt,old.receipt);
assert.equal(result.value.queryReuse.newObservation,false,'do not call an identical read new experimental evidence');
assert.equal(result.value.queryReuse.originalResultRef,old.queryReuse.originalResultRef);
assert.equal(result.value.queryRepair,undefined,'no fabricated input repair for a successful read');
const mismatch=await execute([{pointer:'/value/receipt/phase',expected:'nonexistent-phase'}]);
assert.equal(mismatch.value.status,'returned_to_model');assert.equal(mismatch.value.reason,'postcondition_mismatch');
currentReceipt={...currentReceipt,capabilities:{...currentReceipt.capabilities,changedContractFixture:true}};
const changed=await execute();assert.equal(changed.value.status,'completed');
assert.equal(changed.value.queryReuse,undefined,'same state hash with changed contracts is genuinely new information');
assert.equal(JSON.stringify(state),snapshot,'no original work, result, scope or history is rewritten');
console.log(JSON.stringify({passed:true,actualIdenticalRead:true,successfulReadNotError:true,
  noNewObservationPreserved:true,realPostconditionFailureStillStops:true,changedContractNotHidden:true,
  inspectorFixtureCalls:inspectorCalls,nativeCalls:0,providerCalls:0,productionWrites:0}));
