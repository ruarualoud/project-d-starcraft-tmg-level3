// Concrete regression: real replies528/534 request the same marker-control
// observation. Exercise the PRODUCT executor; the Native spy is not Rules proof.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
import {projectRosterRepeatedObservationContextV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const root=process.cwd(),base=root+'/build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner';
const savedState=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const ref='ef4ac95f81e4794336bf13a8dd41df97624a470c7801c4b5c3b20c8906f422a4';
const saved=JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8'));
const source=savedState.work.find(w=>w.resultRef===ref);
assert.equal(saved.value.status,'completed');
assert.equal(saved.value.receipt.queryKind,'mission_marker_control');
const descriptor=Object.fromEntries(['sourceStateHash','builderBundleHash','rulesRuntimeHash'].map(k=>[k,saved.value.receipt[k]]));
async function execute({changeRequest=()=>{},changeSource=()=>{},resultGuards=[]}={}){
  const original=structuredClone(saved),prior=structuredClone(source);
  changeSource(original,prior);
  const values=new Map([[ref,original]]),state={scope:savedState.scope,work:[prior],evidence:[]};
  let calls=0,checkpoint;
  const store={load:async()=>state,get:async id=>values.get(id),put:async value=>{values.set('new',value);return 'new';}};
  const laboratory={labDescriptor:()=>descriptor,querySpatial:async()=>{calls++;return structuredClone(saved.value.receipt);}};
  const tool=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
  const args=structuredClone(saved.value.request);delete args.queryId;changeRequest(args);
  const assignment={workId:'regression:new-label',scope:savedState.scope,inputs:{request:{value:{operation:'spatial',args,bindings:[],guards:[],resultGuards}}}};
  const result=await tool.execute(assignment,{checkpointOperation:async op=>{checkpoint=structuredClone(op);}});
  return {calls,result,checkpoint};
}
const repeated=await execute();
assert.equal(repeated.calls,0,'identical completed Native query must be reused, not executed again');
assert.deepEqual(repeated.result.value.receipt,saved.value.receipt,'original receipt, identity and scope must remain byte-value equivalent');
assert.equal(repeated.result.value.executed,false);
assert.equal(repeated.result.value.queryReuse.newObservation,false);
assert.equal(repeated.result.value.queryReuse.originalResultRef,ref);
assert.equal(repeated.result.value.status,'completed');
assert.equal(repeated.checkpoint.pending,undefined);
const view=projectRosterWorkflowReceiptViewV1({evidenceId:'tool:repeated',...repeated.result});
assert.deepEqual(view.queryReuse,repeated.result.value.queryReuse,'chunked view must disclose reuse');
const guarded=await execute({resultGuards:[{pointer:'/value/receipt/resultStatus',expected:'unknown'}]});
assert.equal(guarded.calls,0);
assert.equal(guarded.result.value.reason,'postcondition_mismatch','reuse must not bypass a new explicit postcondition');
const owner={id:'next-owner',experimentGoalId:'map-goal',inputs:{batchToolSource0:{source:'evidence',id:'tool-view:reused'}}};
const progress=await projectRosterRepeatedObservationContextV1({assignment:{workId:owner.id},store:{
  load:async()=>({work:[owner,{id:'reused',resultRef:'reuse'}],evidence:[{id:'tool-view:reused'}]}),get:async()=>repeated.result}});
assert.equal(progress.repeated.length,1);
assert.equal(progress.repeated[0].newObservation,false);
assert.equal(progress.repeated[0].sourceEvidenceNumber,1);
const cases=[
  {name:'changed filter',changeRequest:a=>{a.argumentsJson=JSON.stringify({...JSON.parse(a.argumentsJson),markerIds:['mission-marker-1']});}},
  {name:'changed branch',changeRequest:a=>{a.base.branchStateHash='different-state';}},
  {name:'changed source',changeSource:s=>{s.value.receipt.sourceStateHash='different-source';}},
  {name:'changed runtime',changeSource:s=>{s.value.receipt.rulesRuntimeHash='different-rules';}},
  {name:'changed bindings',changeSource:(_s,w)=>{w.bindings.army='different-army';}},
  {name:'unresolved old receipt',changeSource:s=>{s.value.status='returned_to_model';s.value.receipt.resultStatus='unknown';}},
];
for(const c of cases)assert.equal((await execute(c)).calls,1,c.name+' must not reuse');
const reordered=await execute({changeRequest:a=>{const v=JSON.parse(a.argumentsJson);a.argumentsJson=JSON.stringify({unitIds:v.unitIds,markerIds:v.markerIds},null,2);}});
assert.equal(reordered.calls,0,'JSON formatting/key order is not a different query');
console.log(JSON.stringify({passed:true,concreteRequests:[528,534],originalResultRef:ref,reusedWithoutNativeCalls:true,
  negativeCases:cases.map(c=>c.name),originalReceiptPreserved:true,providerCalls:0,productionWrites:0,
  proves:'Deterministic read-only reuse and scope isolation; NOT Teach convergence or strategy improvement'}));
