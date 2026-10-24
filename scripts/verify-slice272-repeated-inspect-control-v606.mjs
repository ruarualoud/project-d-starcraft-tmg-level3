// Actual773 calls an identical parent/menu a new query. A notice alone did not
// stop its successful-batch->owner->same-query cycle. Exercise the real executor.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const saved=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const original=saved.work.findLast(w=>w.role==='roster_workflow_tool'&&w.status==='evidence_ready'
  &&w.id.includes('map_and_arrival')&&w.inputs.request.value.operation==='inspect');
const actual=JSON.parse(await fs.readFile(path.join(base,'artifacts',original.resultRef+'.json'),'utf8'));
const prior={...original,experimentOwnerId:'fixture-prior-owner'},work={id:'fixture-current-inspect',experimentOwnerId:'fixture-current-owner'};
const priorOwner={id:'fixture-prior-owner',experimentGoalId:'fixture-same-question'},owner={id:'fixture-current-owner',experimentGoalId:'fixture-same-question'};
const state={...saved,work:[prior,priorOwner,owner,work]},memory=new Map([[prior.resultRef,actual]]);let seq=0,calls=0;
const store={load:async()=>state,get:async ref=>memory.get(ref),put:async value=>{const ref='fixture-'+(++seq);memory.set(ref,JSON.parse(JSON.stringify(value)));return ref;}};
const lab={labDescriptor:()=>({sourceStateHash:saved.scope.source}),describeQueryContext:async()=>{calls++;return structuredClone(actual.value.receipt);}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
const assignment={workId:work.id,scope:saved.scope,inputs:{request:{value:{operation:'inspect',args:actual.value.request,bindings:[],guards:[],resultGuards:[]}}}};
const result=await executor.execute(assignment,{operationState:{},checkpointOperation:async()=>{}});
assert.equal(result.continuation,true,'same question + identical current observation must not become another successful progress batch');
assert.equal(result.value.queryRepair.reasonCode,'EXPERIMENT_REPEATS_COMPLETE_INSPECTION');assert.equal(result.value.queryRepair.originalQueryNotAnswered,true);
assert.deepEqual(result.value.receipt,actual.value.receipt,'no Native fact is changed or called rules-illegal');
assert.equal(result.value.queryReuse.newObservation,false);assert.equal(calls,1);
owner.experimentGoalId='fixture-other-question';
const other=await executor.execute(assignment,{operationState:{},checkpointOperation:async()=>{}});
assert.equal(other.continuation,undefined,'another question can legitimately receive the same observation');
assert.equal(other.value.status,'completed');
console.log(JSON.stringify({status:'passed',realExecutor:true,sameGoalNoProgressReturned:true,otherGoalNotRejected:true,
  receiptUnchanged:true,nativeAdapterFixtureCalls:calls,providerCalls:0,realNativeCalls:0,productionWrites:0}));
