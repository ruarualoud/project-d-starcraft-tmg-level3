// Reproduce the live inspector's repeated evidence x read-history scan.
// Actual directory/read history, isolated observation-only state; no paid calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=process.argv[2],saved=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const rawReads=structuredClone(saved.reads),consumer=rawReads.at(-1).consumer;
// Directory semantics are independent of the work graph. Do not restore or run
// paid work just to measure this shared observation seam.
const state={...saved,work:[],events:[],reads:structuredClone(rawReads)};
let visits=0,writes=0;
for(const read of state.reads){const value=read.consumer;
  Object.defineProperty(read,'consumer',{enumerable:true,get(){visits++;return value;}});}
const run=await createRosterDecisionWorkflowV1({store:{load:async()=>state,
  get:async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8')),
  save:async()=>{writes++;}},execute:async()=>{throw Error('Unexpected execution');}});
const original=structuredClone(state.evidence);
function expected(forConsumer){return original.map(e=>{
  const readPaths=rawReads.filter(r=>r.consumer===forConsumer&&r.evidenceId===e.id).map(r=>r.pointer);
  const current=Object.entries(e.bindings||{}).every(([k,v])=>Object.hasOwn(state.scope,k)&&state.scope[k]===v);
  return {...structuredClone(e),validity:current?'current':'historical',readPaths,
    access:e.availability==='missing'?'missing':e.availability==='unsupported'?'unsupported'
      :readPaths.includes('')?'read':readPaths.length?'partially_read':'available_unread'};
});}
visits=0;const started=performance.now(),observed=await run.inspect(consumer),elapsedMs=performance.now()-started;
const actualVisits=visits;
assert.deepEqual(observed.evidence,expected(consumer),'Exact old directory values, ordering and permissions must remain');
assert.equal(actualVisits,rawReads.length,
  `Inspector must scan read history once, not once per evidence: ${actualVisits} visits / ${rawReads.length} rows / ${original.length} evidence`);
visits=0;const observer=await run.inspect('observer');
assert.deepEqual(observer.evidence,expected('observer'));
assert.equal(visits,rawReads.length,'Another consumer gets its own exact read boundary');
observed.evidence[0].title='caller mutation';observed.evidence[0].readPaths.push('/not-read');
assert.deepEqual(state.evidence,original,'Returned directory cannot mutate the underlying registry');
const repeat=await run.inspect(consumer);assert.deepEqual(repeat.evidence,expected(consumer));
assert.equal(writes,0);assert.equal(JSON.stringify(state.reads),JSON.stringify(rawReads));
console.log(JSON.stringify({pass:true,evidence:original.length,reads:rawReads.length,
  oldReadVisits:original.length*rawReads.length,newReadVisits:actualVisits,elapsedMs,
  directoryExactlyEqual:true,consumerIsolation:true,returnedCopyIsolated:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,fullWorkflowSpeedup:'not_measured'}));
