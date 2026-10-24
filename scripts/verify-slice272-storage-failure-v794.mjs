// Reproduce the actual ENOSPC checkpoint/payload orphan without filling disk.
// Only this isolated process patches fs; the virtual fixture never touches disk.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';

const directory=path.resolve('build/slice272-v794-virtual-only');
const checkpoint=path.join(directory,'workflow.json');
const previous={revision:3,events:[{type:'saved_reply_revalidation'}]};
const payload=JSON.stringify({originalPaidReply:'kept verbatim'});
const ref=createHash('sha256').update(payload).digest('hex');
const artifact=path.join(directory,'artifacts',`${ref}.json`);
const originals=Object.fromEntries(['mkdir','writeFile','rename','unlink','access','readFile'].map(k=>[k,fs[k]]));
const cases=[['checkpoint write ENOSPC','save','write'],['checkpoint rename ENOSPC','save','rename'],
  ['payload write ENOSPC','put','write'],['payload rename ENOSPC','put','rename']];
const results=[];
try{
  for(const [name,operation,failureAt] of cases){
    const files=new Map([[checkpoint,JSON.stringify(previous)],[artifact,payload]]);
    const removals=[];
    const fault=Object.assign(new Error('disk full'),{code:'ENOSPC'});
    const missing=()=>Object.assign(new Error('missing'),{code:'ENOENT'});
    fs.mkdir=async()=>{};
    fs.writeFile=async(p,bytes,options)=>{
      assert.equal(options.flag,'wx');assert.equal(options.mode,0o600);
      files.set(p,failureAt==='write'?bytes.slice(0,11):bytes);
      if(failureAt==='write')throw fault;
    };
    fs.rename=async(from,to)=>{
      if(failureAt==='rename')throw fault;
      files.set(to,files.get(from));files.delete(from);
    };
    fs.unlink=async p=>{removals.push(p);if(!files.delete(p))throw missing();};
    fs.access=async p=>{if(!files.has(p))throw missing();};
    fs.readFile=async p=>{if(!files.has(p))throw missing();return files.get(p);};
    const store=createRosterDecisionWorkflowStoreV1({directory});
    try{
      let caught;
      try{await store[operation]({revision:4,newValue:'not committed'});}catch(error){caught=error;}
      assert.equal(caught,fault,'must retain the original storage failure');
      assert.deepEqual(await store.load(),previous,'previous complete checkpoint survives');
      assert.deepEqual(await store.get(ref),JSON.parse(payload),'paid original survives');
      assert.equal([...files.keys()].filter(p=>p.endsWith('.tmp')).length,0,'failed atomic write must not leave a temporary file');
      assert.equal(removals.length,1,'remove only the temporary file owned by this write');
      assert.ok(removals[0].startsWith(directory+'/')&&removals[0].endsWith('.tmp'));
      results.push({name,passed:true});
    }catch(error){results.push({name,passed:false,reason:error.message});}
  }
}finally{Object.assign(fs,originals);}
console.log(JSON.stringify({gate:'slice272-storage-failure-v794',results,providerCalls:0,productionWrites:0,realDiskWrites:0}));
if(results.some(result=>!result.passed))process.exitCode=1;
