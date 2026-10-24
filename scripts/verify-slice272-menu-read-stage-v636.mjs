// Actual1289 saw precise feedback but the schema still allowed the same finish.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const saved=JSON.parse(await fs.readFile(path.join(run,'1289.request.json'),'utf8')).request;
const paidBytes=await fs.readFile(path.join(run,'1289.reply.json'),'utf8'),paid=JSON.parse(paidBytes);
const assignment=saved.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id===assignment.workId),directory=state.evidence.map((e,i)=>({...e,number:i+1}));
const memory=new Map(),store={load:async()=>state,get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):
  JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const readSaved=async(evidenceId,pointer)=>{let value=await store.get(directory.find(e=>e.id===evidenceId).artifactRef);
  if(value.schema==='roster_workflow_receipt_view_v1'&&pointer.startsWith('/receipt/'))value=await store.get(directory.find(e=>e.id===value.evidenceId).artifactRef);
  for(const key of pointer.split('/').slice(1)){if(!Object.hasOwn(value??{},key))return {evidenceId,pointer,status:'path_missing'};value=value[key];}
  return {evidenceId,pointer,status:'read',value};};
const marker=Error('CAPTURE_ONLY');let request;
const capture=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v636',deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},
  onRequest:async r=>{request=r;throw marker;}});
const observe=async operationState=>{await assert.rejects(()=>capture({...assignment,evidenceDirectory:directory},
  {operationState,checkpointOperation:async()=>{},readEvidence:readSaved}),e=>e===marker);return request;};
const first=await observe(work.operationState);
assert(!first.responseFormat.schema.properties.action.enum.includes('finish'),
  'BUG: precise missing-menu correction still permits resubmitting the same unread Native action');
assert(first.responseFormat.schema.properties.action.enum.includes('read'));
assert(first.responseFormat.schema.properties.action.enum.includes('conclude'),'honest control return remains available');
assert(first.promptNodes.find(n=>n.kind==='required_choice_menu_read').issues.some(i=>i.availableSavedMenus.some(m=>m.evidenceNumber===2222)));
let checkpoint;
const readReply={...structuredClone(paid),output:{action:'read',publicReason:'Read the registered same-state inspection menu before choosing an action.',
  reads:[{evidenceNumber:2222,pointer:'/receipt/actionSpace'}],catalogueQueries:[],workOrders:[],unresolvedQuestions:[],conclusion:null}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v636',deliberation:{deliberate:async()=>readReply}});
await execute({...assignment,evidenceDirectory:directory},{operationState:{...structuredClone(work.operationState),consecutiveCorrections:0,correctionLimit:3},
  checkpointOperation:async s=>{checkpoint=s;},readEvidence:readSaved});
const next=await observe(checkpoint);
assert(next.responseFormat.schema.properties.action.enum.includes('finish'),'actual same-state menu delivery re-enables author choice');
assert(!next.promptNodes.some(n=>n.kind==='required_choice_menu_read'));
const unrelated=structuredClone(checkpoint);
unrelated.reads=unrelated.reads.filter(r=>r.evidenceId!==directory[2221].id);
const stillBlocked=await observe(unrelated);
assert(!stillBlocked.responseFormat.schema.properties.action.enum.includes('finish'),'missing/wrong old source must not clear the read requirement');
assert.equal(await fs.readFile(path.join(run,'1289.reply.json'),'utf8'),paidBytes);
console.log(JSON.stringify({passed:true,actualPaidReply:1289,wrongSourceRequiresReadOrControlReturn:true,
  actualMenuDeliveryReenablesChoice:true,oldMissingReadDoesNotClearRequirement:true,
  paidReplyUnchanged:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
