// Concrete regression: r23 repeated the exact r21 Marine deploy, then omitted
// the already completed relocation from its method's Native transition index.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {findCompletedRosterNativeSpatialActionV1,projectCompletedRosterNativeTransitionsV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map(),checks=[];
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(state);
const store={get,put,load:async()=>state};
const input=await get('2d6a56ec78b2329741ddae6e16bc1fb603500db27e70462182741c402ce3e61c');
const descriptor=copy(input.inputs.tools.value.laboratory),candidateInput=copy(input.inputs.draft.value.candidateInput);
const oldRef='39ea9c3a16d6f3f44395554a7fb70c0de9a48fdfa3e824ccb6d8a2a3af994912';
const newRef='b6393e46d49bb38112ebe161acf8c56d4633343c60046b5d819b515363f6b11a';
const earlier=await get(oldRef),later=await get(newRef);
assert.deepEqual(earlier.value.receipt.nativeAction,later.value.receipt.nativeAction);
assert.deepEqual(earlier.value.receipt.nativeCanonicalParameters,later.value.receipt.nativeCanonicalParameters);
const check=async(name,fn)=>{try{await fn();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.message});}};
input.inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:input,state,readArtifact:get});
let op={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'offline-v989',deliberation:{deliberate:async request=>{
  captured=request;throw Error('CAPTURE_ONLY');}}});
const control={get operationState(){return copy(op);},checkpointOperation:async v=>{op=copy(v);},
  readEvidence:async(id,pointer)=>{const e=input.evidenceDirectory.find(e=>e.id===id);assert(e);
    let value=await get(e.artifactRef);for(const token of pointer.split('/').slice(1))value=value[token.replaceAll('~1','/').replaceAll('~0','~')];
    return {status:'read',evidenceId:id,pointer,kind:e.kind,conditions:e.conditions??[],validity:e.validity,value};},
  publishContext:async(value,meta={})=>{const ref=await put(value),id='offline-v989:'+ref;
    let index=input.evidenceDirectory.findIndex(e=>e.id===id);if(index<0){index=input.evidenceDirectory.length;
      input.evidenceDirectory.push({id,artifactRef:ref,title:meta.title??'Saved context',kind:meta.kind??'interpretation',
        validity:'current',bindings:copy(state.scope),conditions:meta.conditions??[],availability:'available',readPaths:[]});}
    return {...input.evidenceDirectory[index],evidenceNumber:index+1,
      ...(meta.includeDirectory?{evidenceDirectory:copy(input.evidenceDirectory)}:{})};}};
try{await execute(input,control);}catch(e){if(e.message!=='CAPTURE_ONLY')throw e;}
await check('actual_request_retains_prior_investigation_relocation',async()=>{
  const rows=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.completedNativeTransitions.value;
  assert(rows.some(r=>r.parentStateHash===later.value.stateRef.stateHash&&r.actionType==='resolve_relocation_ability'),
    'Current method omitted the existing same-source Go! Go! Go! successor from the previous investigation');
  const keys=rows.map(r=>JSON.stringify([r.contextRef,r.parentStateHash,r.successorStateHash,r.nativeActionInputHash]));
  assert.equal(new Set(keys).size,keys.length,'Resolution aliases must not become separate experiments');
});
const toolWork=state.work.find(w=>w.resultRef===newRef),assignment=await get(toolWork.inputRef);
let nativeCalls=0,toolOp=null;
const tool=createRosterWorkflowLaboratoryExecutorV1({store,getCandidateInput:async()=>candidateInput,laboratory:{
  labDescriptor:()=>copy(descriptor),runScenarioBranch:async()=>{nativeCalls++;return copy(earlier.value.receipt);},
  restoreNativeActionBranch:async()=>{throw Error('Must not replay or restore duplicate action');}}});
const toolControl={get operationState(){return copy(toolOp);},checkpointOperation:async value=>{toolOp=copy(value);}};
await check('duplicate_action_stops_before_native',async()=>{
  await assert.rejects(()=>tool.execute(assignment,toolControl),e=>e.message==='ROSTER_WORKFLOW_TOOL_NO_PROGRESS');
  assert.equal(nativeCalls,0);assert.equal(toolOp.noProgressStop.originalResultRef,oldRef);
  assert.equal(toolOp.noProgressStop.newObservation,false);
});
if(toolOp?.noProgressStop)await check('cold_resume_preserves_stop',async()=>{
  const cold=copy(toolOp);await assert.rejects(()=>tool.execute(assignment,{operationState:cold,
    checkpointOperation:async()=>{throw Error('Cold stop must not dispatch');}}),e=>e.message==='ROSTER_WORKFLOW_TOOL_NO_PROGRESS');
  assert.equal(nativeCalls,0);
});
await check('changed_world_or_action_is_not_a_duplicate',async()=>{
  const base={store,descriptor,args:later.value.request,contextRef:null,scope:state.scope,excludeWorkId:toolWork.id};
  assert.equal(await findCompletedRosterNativeSpatialActionV1({...base,scope:{...state.scope,army:'other-army'}}),null);
  assert.equal(await findCompletedRosterNativeSpatialActionV1({...base,descriptor:{...descriptor,version:'other-version'}}),null);
  assert.equal(await findCompletedRosterNativeSpatialActionV1({...base,descriptor:{...descriptor,rulesRuntimeHash:'other-rules'}}),null);
  assert.equal(await findCompletedRosterNativeSpatialActionV1({...base,contextRef:'another-context'}),null);
  const args=copy(base.args);args.base.branchStateHash='another-parent';
  assert.equal(await findCompletedRosterNativeSpatialActionV1({...base,args}),null);
  const changed=copy(base.args),action=JSON.parse(changed.argumentsJson);action.parameters.path[0].xMilliInches++;
  changed.argumentsJson=JSON.stringify(action);
  assert.equal(await findCompletedRosterNativeSpatialActionV1({...base,args:changed}),null);
  assert.deepEqual(await projectCompletedRosterNativeTransitionsV1({state:{...state,scope:{...state.scope,map:'another-map'}},store,descriptor}),[]);
});
assert.equal(hash(state),before);assert.deepEqual(earlier,await get(oldRef));assert.deepEqual(later,await get(newRef));
console.log(JSON.stringify({checks,nativeCalls,providerCalls:0,productionWrites:0}));
assert(checks.every(c=>c.ok),'Concrete repeated-action/omitted-evidence regression remains');
