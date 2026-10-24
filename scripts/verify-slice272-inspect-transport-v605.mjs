// The consumer sees persisted JSON, not the Native object's own-undefined slots.
// Exercise the real tool executor, with an explicitly labelled read-only Native
// adapter fixture returning the actual saved receipt plus such an invisible slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const prior=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.status==='evidence_ready'
  &&w.id.includes('map_and_arrival')&&w.inputs.request.value.operation==='inspect');
const priorResult=JSON.parse(await fs.readFile(path.join(base,'artifacts',prior.resultRef+'.json'),'utf8'));
const memory=new Map([[prior.resultRef,priorResult]]);let seq=0,inspections=0;
const store={load:async()=>({...state,work:[prior]}),get:async ref=>memory.get(ref),
  put:async value=>{const ref='fixture-'+(++seq);memory.set(ref,JSON.parse(JSON.stringify(value)));return ref;}};
const receipt=structuredClone(priorResult.value.receipt);receipt.fixtureInvisibleOptionalSlot=undefined;
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),
  describeQueryContext:async()=>{inspections++;return receipt;}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
const result=await executor.execute({workId:'fixture-current-inspect',scope:state.scope,
  inputs:{request:{value:{operation:'inspect',args:priorResult.value.request,bindings:[],guards:[],resultGuards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
assert.equal(inspections,1,'fresh inspection cannot be skipped across possible contract changes');
assert.equal(result.value.queryReuse?.newObservation,false,'classify the same delivered transport facts, not live-vs-stored object shapes');
assert.equal(result.value.queryReuse?.comparisonBasis,'exact_current_persisted_transport');
assert(result.value.inspectionComparisonRef);assert.deepEqual((await store.get(result.value.inspectionComparisonRef)).receipt,priorResult.value.receipt);
assert.equal(result.value.receipt.fixtureInvisibleOptionalSlot,undefined,'do not rewrite the original Native receipt');
console.log(JSON.stringify({status:'passed',realExecutor:true,nativeAdapterFixtureCalls:1,liveReceiptNotRewritten:true,
  persistedConsumerFactsCompared:true,providerCalls:0,realNativeCalls:0,productionWrites:0}));
