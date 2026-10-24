// Cold-state counterpart to v749: stop ONLY the already-enqueued unauthorized
// query branch, without converting its unknown into a successful observation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const original=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const duplicate=original.work.find(w=>w.resultRef==='d6b758a9565f33ec6e138fa9f8a0d69a50f42322d2795c6eb67f31117e0183c0');
assert.ok(duplicate);
const owner=original.work.find(w=>w.id===duplicate.experimentOwnerId);
const target=original.work.find(w=>w.id===owner.choiceOf);
assert.equal(target.status,'evidence_ready');
let checkpoint=structuredClone(original);
const memory=new Map(),store={load:async()=>structuredClone(checkpoint),save:async s=>{checkpoint=structuredClone(s);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('must not execute tools/provider');}});
const command={type:'return_out_of_scope_choice_branch',workId:duplicate.id};
const result=await workflow.dispatch(command);
assert.equal(result.returned,true);
const graph=createRosterWorkflowGraphV1(checkpoint);
assert.equal(graph.isActive(duplicate.id),false);
const members=createRosterWorkflowGraphV1(original).descendants(duplicate.id,{kinds:['execution','repair','choice','continuation']});
for(const member of members){
  const after=checkpoint.work.find(w=>w.id===member.id);
  assert.equal(graph.isActive(after.id),false);
  assert.equal(after.resultRef,member.resultRef,'original errors/replies are retained');
  assert.deepEqual(after.operationState,member.operationState,'costs, calls and repair counts are retained');
}
const affected=new Set(members.map(w=>w.id));
for(const before of original.work.filter(w=>!affected.has(w.id))){
  const after=checkpoint.work.find(w=>w.id===before.id);
  assert.equal(after.resultRef,before.resultRef);
  assert.equal(after.status,before.status,'parent/original query remains unchanged');
}
assert.equal((await workflow.dispatch(command)).alreadyReturned,true);
const report=await store.get(result.reportRef);
assert.equal(report.nativeQueryAutomaticallyResolved,false);
assert.equal(report.planApproved,false);
// An in-flight descendant cannot be retired; this must be an atomic refusal.
checkpoint=structuredClone(original);
checkpoint.work.find(w=>w.id===members.at(-1).id).operationState={pending:{requestRef:'inflight'}};
const busy=await createRosterDecisionWorkflowV1({store,execute:async()=>{}});
await assert.rejects(()=>busy.dispatch(command),e=>e.code==='ROSTER_WORKFLOW_CHOICE_RETURN_UNSAFE');
console.log(JSON.stringify({pass:true,returned:members.length,parentPreserved:true,unknownPreserved:true,
  pendingRejected:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
