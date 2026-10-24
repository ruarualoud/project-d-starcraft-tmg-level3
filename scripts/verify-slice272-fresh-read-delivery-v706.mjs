// Actual parent has 23 successful fetches but repeatedly fills the delivery
// window with old prefixes, starving even the 2403-byte Raynor source.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id==='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1:study:method:9fb3246ac365b292');
assert.ok(work);
const store={get:async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'))};
const directory=state.evidence.map((entry,index)=>({number:index+1,...entry}));
const collected=await Promise.all(work.operationState.reads.map(async row=>({
  ...await store.get(row.resultRef),evidenceNumber:directory.find(e=>e.id===row.evidenceId)?.number})));
const number=11,source=directory[number-1],raw=collected.find(row=>row.evidenceId===source.id&&row.pointer==='');
assert.equal(raw.status,'read','actual source was fetched successfully');
assert.equal(JSON.stringify(raw.value).length,2403,'freeze the concrete small source, not a synthetic payload');
const originalOperation=JSON.stringify(work.operationState);
const context=await projectRosterWorkflowReadContextV1({collected,operation:work.operationState,directory,store});
const delivered=context.exactReads.find(row=>row.evidenceId===source.id&&row.pointer===''&&row.status==='read');
assert.ok(delivered,'an unread small source must precede repeated large prefixes in the real bounded delivery window');
assert.deepEqual(delivered.value,raw.value,'body contents are unchanged');
const required=[11,814,816,1246,1252,1572,1573,1581,1589];
for(const n of required)assert.ok(context.deliveredReads.some(row=>row.status==='read'&&row.evidenceId===directory[n-1].id),
  'previously starved source has actual delivered content: '+n);
const key=row=>JSON.stringify([row.evidenceId,row.pointer]);
for(const row of context.previousDeliveredReads.filter(row=>row.status==='read')){
  const retained=context.deliveredReads.find(read=>key(read)===key(row));
  assert.ok(retained,'prior completed delivery qualification survives');assert.deepEqual(retained.value,row.value);
}
const omitted=context.sourceReadNavigation.find(row=>row.status==='fetched_not_delivered'&&row.valueType==='array');
assert.ok(omitted,'large undelivered arrays remain navigable, not silently approved');
assert.equal(context.deliveredReads.some(row=>row.status==='read'&&key(row)===key(omitted)),false);
assert.equal(JSON.stringify(work.operationState),originalOperation,'projection does not mark fetched data delivered or rewrite history');
console.log(JSON.stringify({passed:true,actualStarvedParent:true,freshSmallSourceDelivered:true,
  requiredSourcesWithActualContent:required.length,previousDeliveryPreserved:true,unseenArraysNotApproved:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
