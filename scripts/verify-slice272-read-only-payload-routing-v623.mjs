// Actual opponent_and_counters repeated a valid catalogue-only payload with
// action=read three times. Revalidate that paid reply; do not buy another label.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const raw=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(raw),memory=new Map();
const store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;},load:async()=>structuredClone(state)};
const work=state.work.find(w=>w.id==='review-resolution:r6:opponent_and_counters');assert.equal(work.failure.code,'ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED');
const originalCall=work.operationState.calls.at(-1),request=await store.get(originalCall.requestRef),paid=await store.get(originalCall.replyRef);
assert.equal(paid.output.action,'read');assert.equal(paid.output.reads.length,0);assert.equal(paid.output.catalogueQueries.length,3);
const assignment={...request.promptNodes[0],evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))};
let simulatedCalls=0,readCount=0,mockOutput,lastCheckpoint;
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'routing-fixture-only',store,
  deliberation:{deliberate:async q=>{simulatedCalls++;return {output:structuredClone(mockOutput),receipt:{contextHash:q.contextHash}};}},onRequest:async()=>{},onReply:async()=>{}});
const control=operationState=>({operationState,checkpointOperation:async value=>{lastCheckpoint=structuredClone(value);},
  readEvidence:async(evidenceId,pointer)=>{readCount++;const e=state.evidence.find(e=>e.id===evidenceId);assert(e);assert.equal(pointer,'');
    return {status:'read',evidenceId,pointer,value:await store.get(e.artifactRef),validity:'current'};}});
const op=structuredClone(work.operationState);op.revalidateReplyRef=originalCall.replyRef;op.consecutiveCorrections=0;
const result=await execute(assignment,control(op));
assert.equal(result.value.status,'catalogue_search_completed','BUG: valid read-only payload is trapped in a discriminator-only model correction loop');
assert.equal(result.value.queryCount,3);assert.equal(simulatedCalls,0);assert.equal(readCount,0);
assert.equal(lastCheckpoint.calls.length,work.operationState.calls.length,'revalidation must not add a paid call');
assert(result.value.outputProjection.some(p=>p.rule==='read_only_payload_discriminator_v1'));
const current=state.evidence.findIndex(e=>e.id.startsWith('draft:r6:plan:counterResponses'));assert(current>=0);
mockOutput={...structuredClone(paid.output),action:'catalogue',reads:[{evidenceNumber:current+1,pointer:''}]};
const opMixed=structuredClone(work.operationState);opMixed.correction=null;opMixed.consecutiveCorrections=0;
const mixed=await execute(assignment,control(opMixed));
assert.equal(mixed.value.status,'read_and_catalogue_completed');assert.equal(mixed.value.queryCount,3);assert.equal(readCount,1);
assert(lastCheckpoint.reads.some(r=>r.evidenceId===state.evidence[current].id));assert.equal(lastCheckpoint.catalogueSearches.length,(opMixed.catalogueSearches?.length??0)+3);
// A mutation/proposal mixed into reads is NOT normalized or executed.
const proposal=JSON.parse(await fs.readFile(path.join(dir,'1037.reply.json'),'utf8')).output.workOrders[0];
mockOutput={...structuredClone(mockOutput),action:'read',workOrders:[proposal]};
const rejected=await execute(assignment,control(opMixed));
assert.equal(rejected.value.status,'needs_local_correction');assert.equal(readCount,1,'write+read ambiguity must not execute even the read prefix');
assert.deepEqual(await store.get(originalCall.replyRef),paid,'never hand-edit paid output');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),raw);
console.log(JSON.stringify({passed:true,actualPaidReplyRevalidated:true,actualQueriesPreserved:3,mixedIndependentReadAndSearch:true,
  ambiguousWriteRejected:true,newProviderCalls:0,simulatedCalls,productionWrites:0}));
