// Actual paid173: finish + explicit read + unread citation should fetch the
// selected immutable evidence, then request confirmation, not repeat the error.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/p4-from-empty');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const number=process.argv[3]??'173';
const request=JSON.parse(await fs.readFile(path.join(dir,`${number}.request.json`),'utf8'));
const work=state.work.find(w=>w.id===request.request.promptNodes[0].workId);
const assignment=await get(work.inputRef),reply=JSON.parse(await fs.readFile(path.join(dir,`${number}.reply.json`),'utf8'));
const saved=new Map([['recorded173',reply]]);let reads=[],operation;
const store={get:async ref=>saved.has(ref)?structuredClone(saved.get(ref)):get(ref),
 put:async v=>{const id='memory-'+saved.size;saved.set(id,structuredClone(v));return id;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'offline-actual173',
 deliberation:{deliberate:()=>{throw Error('NO_NEW_PROVIDER_CALL');}}});
const before=structuredClone(work.operationState);before.pending=null;before.revalidateReplyRef='recorded173';before.consecutiveCorrections=0;
const result=await execute(assignment,{operationState:before,checkpointOperation:async v=>{operation=structuredClone(v);},
 readEvidence:async(id,pointer)=>{reads.push({id,pointer});const e=assignment.evidenceDirectory.find(e=>e.id===id);
   return {status:'read',evidenceId:id,pointer,kind:e.kind,validity:e.validity,value:await get(e.artifactRef)};}});
assert.equal(result.value.status,'evidence_reads_pending_recheck','valid selected evidence must be read, not sent through another format-only retry');
assert.equal(reads.length,1,'explicit and citation reads of the same source are deduplicated');
assert.equal(result.continuation,true,'new evidence requires a new model confirmation, not silent acceptance');
assert.equal(operation.consecutiveCorrections,0,'actual read progress is not a format failure');
assert.deepEqual(reply,JSON.parse(await fs.readFile(path.join(dir,`${number}.reply.json`),'utf8')),'paid reply unchanged');
console.log(JSON.stringify({pass:true,checks:5,providerCalls:0,nativeExecutions:0,productionWrites:0}));
