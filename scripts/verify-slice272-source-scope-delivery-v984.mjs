// Actual v982 fact role: eligible immutable source omitted while a used
// successor's sourceEligible=false was generalized to tool unavailability.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowFactInquiryV1} from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(state);
const work=state.work.find(w=>w.id.endsWith(':capability-delivery-reconsideration:v2:investigation'));
const assignment=await get(work.inputRef),sourceId='tool:discovery:r23:context';
// Product Run applies this projection after loading inputRef; a stored raw
// assignment is not yet the complete role input (in particular question).
Object.assign(assignment.inputs,await projectRosterWorkflowFactInquiryV1({work:assignment,state,readArtifact:get}));
const source=assignment.evidenceDirectory.find(e=>e.id===sourceId);assert(source);
const sourceValue=await get(source.artifactRef),sourceBefore=hash(sourceValue);
assert.equal(sourceValue.receipt.scenarioConstruction.firstRoundInitialization.sourceEligible,true);
let operation=copy(work.operationState),captured;const fetched=[];
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>copy(state)},sessionId:'offline-v984',
  deliberation:{deliberate:async request=>{captured=request;throw Error('CAPTURE_ONLY');}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async value=>{operation=copy(value);},
  readEvidence:async(id,pointer)=>{fetched.push({id,pointer});
    const entry=assignment.evidenceDirectory.find(e=>e.id===id);assert(entry);
    let value=await get(entry.artifactRef);
    for(const token of pointer.split('/').slice(1)){const key=token.replaceAll('~1','/').replaceAll('~0','~');assert(Object.hasOwn(value,key));value=value[key];}
    return {status:'read',evidenceId:id,pointer,kind:entry.kind,conditions:entry.conditions??[],validity:entry.validity,value};},
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v984:'+ref;
    let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Saved context',kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
try{await execute(assignment,control);}catch(error){if(error.message!=='CAPTURE_ONLY')throw error;}
assert(captured);
const inputs=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const context=inputs.currentSourceContext?.value;
if(!process.argv.includes('--remaining')){
assert.equal(context?.sourceEvidenceId,sourceId,'The actual fact request must identify its current immutable root, not only old successors');
const rows=captured.promptNodes.find(n=>n.kind==='exact_read_results').results;
for(const pointer of ['/stateRef','/receipt/phase','/receipt/round','/receipt/scenarioConstruction/firstRoundInitialization']){
  const row=rows.find(r=>r.evidenceId===sourceId&&r.pointer===pointer);assert(row,`Exact source delivery missing: ${pointer}`);
  assert.equal(row.status,'read');assert(fetched.some(r=>r.id===sourceId&&r.pointer===pointer));
}
assert.equal(rows.find(r=>r.evidenceId===sourceId&&r.pointer.endsWith('firstRoundInitialization')).value.sourceEligible,true);
assert.equal(context.approvesArrival,false);assert.equal(context.replacesSelectedSuccessor,false);
}
const boundary=captured.promptNodes.find(n=>n.kind==='authorized_inquiry_window');assert(boundary);
assert.deepEqual(boundary.authorization,inputs.question.value.authorization);
assert.equal(boundary.originalGoalResolved,false);assert.equal(boundary.permissionToExpand,false);
assert.deepEqual(inputs.question.value.necessaryQuestions,assignment.inputs.question.value.necessaryQuestions);
assert.equal(inputs.question.value.authorization.questionNumbers.length,1);
const {projectRosterWorkflowRootContextReferenceV1:project}=await import('../packages/roster-strategist/roster-workflow-read-context-v1.mjs');
const directory=assignment.evidenceDirectory.map((e,i)=>({...e,number:i+1}));
assert.equal(await project({directory:directory.filter(e=>e.id===sourceId).map(e=>({...e,bindings:{...e.bindings,army:'other'}})),scope:state.scope,store:{get}}),null);
const bad=copy(sourceValue);bad.stateRef.stateHash='used-successor';const badRef=await put(bad);
assert.equal(await project({directory:directory.filter(e=>e.id===sourceId).map(e=>({...e,artifactRef:badRef})),scope:state.scope,store:{get}}),null);
assert.equal(hash(state),before);assert.equal(hash(await get(source.artifactRef)),sourceBefore);
assert(operation.reads.length>=work.operationState.reads.length,'Never replace the retained incremental read ledger');
console.log(JSON.stringify({ok:true,mode:process.argv.includes('--remaining')?'remaining_only':'all',
  checks:[...(!process.argv.includes('--remaining')?['actual_fact_executor_delivers_current_root','eligibility_from_original_native_receipt']:[]),
  'explicit_local_window_and_original_goal_preserved','wrong_army_and_branch_rejected','no_arrival_or_reset_authority','source_and_read_ledger_unchanged'],
  providerCalls:0,nativeCalls:0,productionWrites:0}));
