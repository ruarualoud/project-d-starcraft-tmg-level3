// Actual1287 selected the Native action receipt2215 as a next-action menu.
// Exact saved inspection2222 already contains that menu on the SAME state.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const saved=JSON.parse(await fs.readFile(path.join(run,'1287.request.json'),'utf8')).request;
const paidBytes=await fs.readFile(path.join(run,'1287.reply.json'),'utf8'),paid=JSON.parse(paidBytes);
const assignment=saved.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id===assignment.workId),directory=state.evidence.map((e,i)=>({...e,number:i+1}));
const memory=new Map(),store={load:async()=>state,get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):
  JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const readSaved=async(evidenceId,pointer)=>{
  const entry=directory.find(e=>e.id===evidenceId);let value=await store.get(entry.artifactRef);
  if(value.schema==='roster_workflow_receipt_view_v1'&&pointer.startsWith('/receipt/'))
    value=await store.get(directory.find(e=>e.id===value.evidenceId).artifactRef);
  for(const part of pointer.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'))){
    if(!Object.hasOwn(value??{},part))return {evidenceId,pointer,status:'path_missing'};
    value=value[part];
  }
  return {evidenceId,pointer,status:'read',value};
};
const marker=Error('CAPTURE_ONLY');let request;
const capture=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v635',
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},onRequest:async r=>{request=r;throw marker;}});
await assert.rejects(()=>capture({...assignment,evidenceDirectory:directory},{operationState:work.operationState,
  checkpointOperation:async()=>{},readEvidence:readSaved}),e=>e===marker);
const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
const issue=feedback.errors.find(e=>e.number===2215);
assert.equal(issue?.code,'choice_menu_source_has_no_menu',
  'BUG: missing menu on a Native action receipt is reported as unread, repeatedly demanding a nonexistent pointer');
assert.equal(issue.observedOperation,'native_action');
assert.equal(issue.requiredPointer,null,'must not direct another read to the nonexistent path');
assert(issue.availableSavedMenus.some(m=>m.evidenceNumber===2222&&m.pointer==='/receipt/actionSpace'));
assert.equal(issue.menuBodiesDelivered,false);
assert.deepEqual(feedback.originalOutput,paid.output);

let checkpoint;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v635',deliberation:{deliberate:async()=>paid}});
const result=await execute({...assignment,evidenceDirectory:directory},{operationState:{...structuredClone(work.operationState),
  consecutiveCorrections:0,correctionLimit:3},checkpointOperation:async value=>{checkpoint=value;},
  readEvidence:readSaved});
assert.equal(result.value.status,'needs_local_correction');
assert(checkpoint.correction.errors.some(e=>e.code==='choice_menu_source_has_no_menu'));
assert.equal(checkpoint.consecutiveCorrections,1);
assert.equal(await fs.readFile(path.join(run,'1287.reply.json'),'utf8'),paidBytes);

// Same saved selection, but a normal fresh *unread* inspect menu remains the
// existing automatic-read + author-confirm path, not an execution permission.
const testProposal=structuredClone(paid);
for(const order of testProposal.output.workOrders)for(const step of order.steps){
  const args=JSON.parse(step.argumentsJson);
  if(args.selection?.sourceEvidenceNumber===2215){args.selection.sourceEvidenceNumber=2222;step.argumentsJson=JSON.stringify(args);}
}
const reads=[];
const correctSource=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v635-unread',
  deliberation:{deliberate:async()=>testProposal}});
const normal=await correctSource({...assignment,evidenceDirectory:directory},{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
  checkpointOperation:async()=>{},readEvidence:async(id,pointer)=>{reads.push({id,pointer});
    const entry=directory.find(e=>e.id===id),body=await store.get(entry.artifactRef);
    return {evidenceId:id,pointer,status:'read',value:body.receipt.actionSpace};}});
assert.equal(normal.value.status,'evidence_reads_pending_recheck');
assert.equal(reads.length,1);assert.equal(reads[0].id,directory[2221].id);
assert.equal(normal.value.conclusionAccepted,false);
console.log(JSON.stringify({passed:true,actualPaidReply:1287,wrongSourceRejectedPrecisely:true,
  existingSameStateMenuAvailableUnread:true,normalMenuReadStillRequiresAuthorConfirmation:true,
  originalPaidReplyUnchanged:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
