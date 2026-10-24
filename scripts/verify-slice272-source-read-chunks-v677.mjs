// Reproduce the actual 13-read / HTTP400 context overflow without a Provider.
// Every delivered child remains exact; an omitted parent stays explicitly unread.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const work=state.work.find(w=>w.id==='review-resolution:r12:combat_and_losses:method:84c9e330df28a9d0:strategy-frontier:investigation:method:2d6d2da07d4cf306');
const request=await read('79d0791034ebff357ed35ed2bf96873ca8e69f4289383a8ffa32ac9ea2c1c7a3');
assert.equal(work.operationState.pending.requestRef,'79d0791034ebff357ed35ed2bf96873ca8e69f4289383a8ffa32ac9ea2c1c7a3');
const memory=new Map(),store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const directory=state.evidence.map((e,i)=>({number:i+1,...e}));
const collected=await Promise.all(work.operationState.reads.map(async row=>({...await read(row.resultRef),
  evidenceNumber:directory.find(e=>e.id===row.evidenceId).number})));
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const before=JSON.stringify(request.promptNodes.find(n=>n.kind==='exact_read_results')).length;
const next=await projectRosterWorkflowReadContextV1({collected,operation:structuredClone(work.operationState),directory,store,
  assignmentInputs:assignment.inputs});
const after=JSON.stringify({exact:next.exactReads,navigation:next.sourceReadNavigation}).length;
assert(after<before/4,'large fetched bodies must become exact child deliveries + explicit navigation, not another full request');
assert(next.sourceReadNavigation.length>0);
assert(!next.exactReads.some(r=>r.evidenceNumber===919&&r.pointer===''),'the deferred inspect root must not claim full delivery');
for(const number of [930,932,934,936,938,940,942,944,946,948,950,952]){
  const original=collected.find(r=>r.evidenceNumber===number);
  const optionCount=next.exactReads.find(r=>r.evidenceNumber===number&&r.pointer==='/receipt/queryReceipt/result/optionCount');
  assert(optionCount,'selected formation optionCount must be actually delivered');
  assert.deepEqual(optionCount.value,original.value.optionCount);
  const misses=next.sourceReadNavigation.find(r=>r.evidenceNumber===number&&r.pointer==='/receipt/queryReceipt/result/misses');
  assert(misses,'every large misses array retains an exact retrievable address');
  assert.equal(misses.status,'fetched_not_delivered');
  assert.equal(misses.characters,JSON.stringify(original.value.misses).length);
  assert(!next.deliveredReads.some(r=>r.evidenceNumber===number&&r.pointer==='/receipt/queryReceipt/result'),
    'fetching a parent is NOT evidence of delivering it to the model');
}
// Every original leaf is covered by an exact equal child OR a retrievable node.
let leafCount=0;
for(const row of collected){
  const delivered=next.exactReads.filter(r=>r.evidenceId===row.evidenceId);
  const deferred=next.sourceReadNavigation.filter(r=>r.evidenceId===row.evidenceId);
  function check(value,pointer){
    const whole=delivered.find(r=>r.pointer===pointer);
    if(whole){assert.deepEqual(whole.value,value);return;}
    if(deferred.some(r=>r.pointer===pointer))return;
    assert(value&&typeof value==='object','uncovered leaf at '+pointer);
    for(const [key,child]of Object.entries(value)){leafCount++;check(child,pointer+'/'+key.replaceAll('~','~0').replaceAll('/','~1'));}
  }
  check(row.value,row.pointer);
}
console.log(JSON.stringify({status:'passed',actualFetchedSourceCount:collected.length,beforeCharacters:before,afterCharacters:after,
  fullParentNotFalselyDelivered:true,exactFormationScalarsPreserved:true,retrievableLargeSectionsPreserved:true,coverageNodes:leafCount,
  providerCalls:0,nativeCalls:0,productionWrites:0,doesNotProveModelStrategyOrProviderAcceptance:true}));
