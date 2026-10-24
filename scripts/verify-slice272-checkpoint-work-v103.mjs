// Specific observed performance defect: the workspace discards save.recordHash
// but every checkpoint still clones and canonically hashes the entire history.
// Only an isolated copy of the real B draft is saved. No model/Room operations.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createRosterPlanningDraftStoreV1} from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
const base=process.argv[2];
const source=process.argv[3] || base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json';
const directory=await fs.mkdtemp(path.join(base,'checkpoint-v103-'));
const session=JSON.parse(await fs.readFile(source,'utf8'));
const sourceSnapshot=JSON.stringify(session);
const store=createRosterPlanningDraftStoreV1({directory});
const start=performance.now();
const receipt=await store.save(structuredClone(session),{includeRecordHash:false,compact:true});
const durationMs=performance.now()-start;
const written=await fs.readFile(receipt.path,'utf8');
const summary={directory,durationMs,inputJsonBytes:Buffer.byteLength(sourceSnapshot),savedBytes:Buffer.byteLength(written),
  unconsumedHashComputed:typeof receipt.recordHash==='string',providerCalls:0,roomActions:0};
console.log(JSON.stringify(summary));
assert.equal(receipt.recordHash,null,'workspace checkpoint must skip its explicitly unconsumed full-history hash');
assert.deepEqual(JSON.parse(written),session,'all paid/history/Plan fields must survive the compact checkpoint');
assert.equal(JSON.stringify(session),sourceSnapshot,'save must not mutate its source session');
assert.equal((await fs.stat(receipt.path)).mode&0o777,0o600);
console.log(JSON.stringify({status:'PASS',exactHistoryPreserved:true,privateAtomicStoreUsed:true,...summary}));
