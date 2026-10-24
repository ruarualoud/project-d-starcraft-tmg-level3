// Real v984 request still inlines old capability conclusions/global comparison
// context into one bounded method choice. Verify lossless, callable deferral.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {focusRosterWorkflowCorrectionRequestV1 as focus} from '../packages/roster-strategist/roster-workflow-correction-context-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const request=await get('ed72726f96e3600fa260dbc146959011c7d6eb657ae410d682d0f5fe0bfaa405'),before=hash(request);
const sent=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const sourceNumber=request.roleCommunication.evidenceNumbers.length+1;
const publish=async value=>({id:'offline-v985',evidenceNumber:sourceNumber,artifactRef:await put(value),title:'Exact deferred background',kind:'interpretation'});
const result=await focus({request,publishContext:publish}),next=result.request;
const inputs=next.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.equal(inputs.priorInvestigationConclusion0.source,'deferred_context',
  'Old capability conclusions must be retrievable background, not this fact method answer template');
assert.equal(inputs.decisionEvidenceDirectory.source,'deferred_context');
assert.deepEqual(inputs.question,sent.inputs.question,'Never erase the parent question or change its authorization');
for(const key of ['currentSourceContext','currentArmyConfiguration','tools'])assert.deepEqual(inputs[key],sent.inputs[key]);
assert.deepEqual(next.promptNodes.find(n=>n.kind==='exact_read_results'),request.promptNodes.find(n=>n.kind==='exact_read_results'));
assert(next.promptNodes.some(n=>n.kind==='authorized_inquiry_window'));
const scope=next.promptNodes.find(n=>n.kind==='fact_method_context');assert(scope);
const original=await get(result.source.artifactRef);
for(const {name,pointer}of scope.deferred){
  if(!name.startsWith('input:'))continue;
  let value=original;for(const token of pointer.split('/').slice(1))value=value[token.replaceAll('~1','/').replaceAll('~0','~')];
  assert.deepEqual(value,sent.inputs[name.slice(6)],`Unrecoverable original ${name}`);
}
assert.equal(scope.globalObligationsRemoved,false);assert.equal(scope.acceptanceGranted,false);
assert.equal(hash(request),before);
// The actual role must use the shared projector during ordinary confirmation,
// not only when a local_contract_feedback happens to be present.
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),stateBefore=hash(state);
const work=state.work.find(w=>w.id===sent.workId),assignment=await get(work.inputRef);
assignment.inputs=copy(sent.inputs);
let operation=copy(work.operationState),captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>copy(state)},sessionId:'offline-v985',
  deliberation:{deliberate:async q=>{captured=q;throw Error('CAPTURE_ONLY');}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async v=>{operation=copy(v);},
  readEvidence:async()=>assert.fail('Existing source fields must remain in the incremental ledger'),
  publishContext:async(value,meta={})=>{const ref=await put(value),id='offline-v985:'+ref;
    let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:meta.title??'Saved context',kind:meta.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
      ...(meta.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
try{await execute(assignment,control);}catch(error){if(error.message!=='CAPTURE_ONLY')throw error;}
assert(captured?.promptNodes.some(n=>n.kind==='fact_method_context'),'Ordinary product role request missed the projector');
assert.deepEqual(captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.question,sent.inputs.question);
assert.equal(hash(state),stateBefore);
console.log(JSON.stringify({ok:true,checks:['old_interpretations_deferred_verbatim','current_authority_and_exact_sources_unchanged',
  'same_local_authorization_and_parent_obligation','ordinary_role_executor_wired','no_production_changes'],
  requestCharactersBefore:JSON.stringify(request).length,requestCharactersAfter:JSON.stringify(next).length,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
