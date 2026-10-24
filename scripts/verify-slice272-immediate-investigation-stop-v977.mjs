// The actual v976 first reply already repeated the held authorization, but
// production fetched citations and paid for another correction before stopping.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const directory=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),originalHash=hash(original);
const request=await get('4e706daf2bca78fa8a605c55423dee68ed016e62a527a377e863630a55d87cfe');
const assignment=await get('e9e8e2fae5affa7f8fea670873b247230e6e87d0347992996e6380e359f3fe7b');
assignment.inputs=copy(request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs);
const actual=await get('bc188c1fd8eb0737780ffd0f4fbe99db5a2cffae5921e888c5235b0c491f7ffb');
let operation=null,calls=0,reads=0;
const store={load:async()=>copy(original),get,put};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'offline-v977',
  deliberation:{deliberate:async q=>{calls++;return {output:copy(actual.output),receipt:{
    contextHash:q.contextHash,roundKind:q.roundKind,sessionId:q.sessionId,roundIndex:q.roundIndex,
    outputHash:hash(actual.output)}};}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async op=>{operation=copy(op);},
  readEvidence:async(id,pointer)=>{reads++;const entry=assignment.evidenceDirectory.find(e=>e.id===id);
    let value=await get(entry.artifactRef);
    for(const key of pointer.split('/').slice(1).map(k=>k.replaceAll('~1','/').replaceAll('~0','~')))value=value[key];
    return {status:'read',evidenceId:id,pointer,artifactRef:entry.artifactRef,value};},
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v977:'+ref;
    let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Test context',kind:metadata.kind??'interpretation',validity:'current',
      bindings:copy(original.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
await assert.rejects(execute(assignment,control),e=>e.message==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
assert.equal(operation.noProgressStop.reason,'unchanged_investigation_authorization');
assert.equal(operation.noProgressStop.stoppedAtTurn,1);
assert.equal(calls,1);assert.equal(reads,0,'Do not fetch citations to repeat an already diagnosed loop');
assert.equal(operation.calls.length,1);
assert.deepEqual((await get(operation.calls[0].replyRef)).output,actual.output);
assert.equal(operation.noProgressStop.acceptanceGranted,false);
const stopped=copy(operation);
await assert.rejects(execute(assignment,control),e=>e.message==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
assert.equal(calls,1);assert.deepEqual(operation,stopped);
assert.equal(hash(original),originalHash);
console.log(JSON.stringify({ok:true,checks:['actual_first_reply_stops_before_reads_or_correction',
  'paid_reply_preserved','cold_resume_cannot_repeat'],injectedCalls:calls,providerCalls:0,nativeCalls:0,
  productionWrites:0,planApproved:false}));
