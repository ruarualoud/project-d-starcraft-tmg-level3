// Concrete v234 ENOENT: two consumers rename the same temporary checkpoint.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createSerialJsonCheckpointV1 } from './support/serial-json-checkpoint-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red','green'].includes(phase));
const dest = base+'/common-v235-checkpoint-'+phase+'.private.json';
await (await fs.open(dest,'wx',0o600)).close();
const directory=await fs.mkdtemp(base+'/checkpoint-v235-'+phase+'-');
const target=directory+'/checkpoint.json', write=createSerialJsonCheckpointV1(target);
const payloads=Array.from({length:3},(_,version)=>({version,data:'checkpoint'.repeat(1000)}));
const results=await Promise.allSettled(payloads.map(write));
const report={phase,ok:false,providerCalls:0,results:results.map(r=>({status:r.status,code:r.reason?.code}))};
try {
  assert.equal(results.filter(r=>r.status==='rejected').length,0,'CONCURRENT_CHECKPOINT_RENAME_MUST_NOT_FAIL');
  assert.deepEqual(JSON.parse(await fs.readFile(target,'utf8')),payloads.at(-1),'last submitted checkpoint must win');
  report.ok=true;
}catch(error){report.failure=String(error.message);process.exitCode=1;}
await fs.writeFile(dest,JSON.stringify(report,null,2),{mode:0o600});
console.log(JSON.stringify(report));
