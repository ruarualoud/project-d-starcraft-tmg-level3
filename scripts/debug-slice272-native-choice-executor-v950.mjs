// Reproduce the product entry skipping native choice commands unless the role
// has a local correction. Saved work-order corrections are NORMAL role calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2],memory=new Map(),copy=structuredClone;
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.requestRef==='5fdf2621dd061a573602f443ad91bfbb69f12eea0bce0a2883970ea447a32ddc'));
const assignment=await get(work.inputRef);
let calls=0,saved;
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v950',store:{load:async()=>state,get,put},deliberation:{deliberate:async request=>{
  calls++;assert.equal(request.responseFormat.schemaName,'roster_native_choice_command_v1','actual executor must prepare normal choice calls, not only local correction turns');
  const output={action:'select',publicReason:'Explicit injected selection of saved menu1850 entry0.',reads:[],catalogueQueries:[],
    selection:{sourceEvidenceNumber:1850,kind:'finite',index:0,parametersJson:null,outcomeJson:null},conclusion:null,unresolvedQuestions:[]};
  return {output,receipt:{providerKind:'offline_injection',contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
    roundIndex:request.roundIndex,outputHash:hash(output),outputContractRef:request.responseFormat.outputContractRef}};
}}});
const control={operationState:null,checkpointOperation:async op=>{saved=copy(op);},readEvidence:async (id,pointer)=>{
  const entry=assignment.evidenceDirectory.find(e=>e.id===id);assert.ok(entry);
  assert.ok(id.endsWith(':inspect-start-of-round'));
  let value=(await get('4bf06ffe111cc0b3a91003181c0432a706f43da14f932de951f7cc1e193cc16e')).value;
  for(const key of pointer.split('/').slice(1)){assert.ok(Object.hasOwn(value,key));value=value[key];}
  return {status:'read',evidenceId:id,pointer,kind:'tool_receipt',value,conditions:entry.conditions,validity:'current'};
},publishContext:async(value,metadata={})=>{
  const ref=await put(value),id='offline-v950:'+ref;let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
  if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,title:metadata.title??'Offline context',
    kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
  return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};
}};
const result=await execute(assignment,control);
assert.equal(saved.correction,null,'source reads may continue; command decoding must not enter format repair');
assert.ok(result.continuation||result.value.workOrders?.length===1);
console.log(JSON.stringify({pass:true,calls,nativeCalls:0,providerCalls:0,productionWrites:0,status:result.value.status??'choice_submitted',projection:result.value.outputProjection}));
