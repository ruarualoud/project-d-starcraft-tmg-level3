// Real post-solver choice re-authored parent inspect and confused Pareto index
// with formationOptions index. Keep this failure tied to the product role seam.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterNativeChoiceSourcesV1 as project} from '../packages/roster-strategist/roster-native-choice-sources-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterNativeChoiceCommandV1} from '../packages/roster-strategist/roster-native-choice-command-v1.mjs';
import {resolveRosterWorkflowNativeSelectionV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),before=hash(state);
const input=await get('f59b6aeb393f655d65457ca29311f526f5009e9dbc26206148cb470667df7ac9');
const original=await get('f5fd70b0f7e7fd6950561bb5b16b3c83effc8af555e866b5cd59420baed56f2f');
if(process.argv.includes('--lineage-only')){
  const pending=state.work.find(w=>w.id.endsWith('deploy-marine1:input-repair:order0:repair-choice:order-repair0:order0:select-deploy-option'));
  assert(pending,'Real queued selected action is required');
  const repair={id:'offline-v988-following-input-repair',role:input.role,repairOf:pending.id,
    bindings:copy(pending.bindings),inputs:{task:{source:'literal',value:{}}}};
  const next={...input,workId:repair.id,inputs:copy(repair.inputs)};
  const local={...state,work:[...state.work,repair]};
  const inherited=await project({assignment:next,state:local,readArtifact:get});
  assert(inherited.nativeChoiceTemplate,'The next input-repair must retain its same-state prerequisite source through saved ownership edges');
  assert.equal(hash(inherited.nativeChoiceFormationSource0.value),hash(original.value.receipt.queryReceipt.result));
  const changed=copy(pending);changed.inputs.request.value.args.stateRef.stateHash='another-parent';
  assert.deepEqual(await project({assignment:next,state:{...local,work:local.work.map(w=>w.id===changed.id?changed:w)},readArtifact:get}),{});
  assert.equal(hash(state),before);
  console.log(JSON.stringify({ok:true,checks:['following_repair_reuses_saved_prerequisite','changed_parent_rejected','state_unchanged'],providerCalls:0,nativeCalls:0,productionWrites:0}));
  process.exit(0);
}
const source=await project({assignment:input,state,readArtifact:get});
assert(source.nativeChoiceTemplate,'Post-solver native choice must not use the full work-order authoring schema');
const entry=source.nativeChoiceSources.value.entries.find(e=>e.kind==='formation');assert(entry);
const candidates=source.nativeChoiceFormationSource0.value;
assert.equal(hash(candidates),hash(original.value.receipt.queryReceipt.result));
assert.equal(entry.choices[3].formationOptionId,candidates.formationOptions[3].formationOptionId);
assert.equal(entry.choices[3].solverPolicyId,'fallback-advance');
assert.equal(entry.choices[2].solverPolicyId,'requested-left');
assert.deepEqual(await project({assignment:{...input,scope:{...input.scope,army:'wrong'}},state,readArtifact:get}),{});

input.inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:input,state,readArtifact:get});
let operation={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>state},sessionId:'offline-v988',
  deliberation:{deliberate:async request=>{captured=request;throw Error('CAPTURE_ONLY');}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async value=>{operation=copy(value);},
  readEvidence:async(id,pointer)=>{const e=input.evidenceDirectory.find(e=>e.id===id);assert(e);
    let value=await get(e.artifactRef);for(const token of pointer.split('/').slice(1)){
      const key=token.replaceAll('~1','/').replaceAll('~0','~');assert(Object.hasOwn(value,key));value=value[key];}
    return {status:'read',evidenceId:id,pointer,kind:e.kind,conditions:e.conditions??[],validity:e.validity,value};},
  publishContext:async(value,meta={})=>{const ref=await put(value),id='offline-v988:'+ref;
    let index=input.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=input.evidenceDirectory.length;input.evidenceDirectory.push({id,artifactRef:ref,
      title:meta.title??'Saved context',kind:meta.kind??'interpretation',validity:'current',bindings:copy(state.scope),
      conditions:meta.conditions??[],availability:'available',readPaths:[]});}
    return {...input.evidenceDirectory[index],evidenceNumber:index+1,
      ...(meta.includeDirectory?{evidenceDirectory:copy(input.evidenceDirectory)}:{})};}};
try{await execute(input,control);}catch(e){if(e.message!=='CAPTURE_ONLY')throw e;}
assert(captured.promptNodes.some(n=>n.kind==='native_choice_command'));
assert(!captured.responseFormat.schema.properties.workOrders,'Choice cannot author parent-owned steps');
assert.deepEqual(captured.responseFormat.schema.properties.selection.anyOf[0].properties.kind.enum,['formation']);
assert.equal(hash(captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.nativeChoiceFormationSource0.value),hash(candidates));
const projected=projectRosterNativeChoiceCommandV1({request:captured,output:{action:'select',
  publicReason:'Offline fixture explicitly selects candidate index 3; not a production strategic choice.',
  reads:[],catalogueQueries:[],selection:{sourceEvidenceNumber:entry.sourceEvidenceNumber,kind:'formation',index:3,parametersJson:null,outcomeJson:null},
  conclusion:null,unresolvedQuestions:[]}});
assert.deepEqual(projected.errors,[]);assert.equal(projected.output.workOrders[0].steps.length,1);
const args=JSON.parse(projected.output.workOrders[0].steps[0].argumentsJson);
const bound=resolveRosterWorkflowNativeSelectionV1(args,{workId:entry.sourceWorkId,value:original.value});
assert.equal(hash(bound.action.parameters),hash(candidates.formationOptions[3].canonicalParameters));
assert.equal(hash(bound.stateRef),hash(original.value.stateRef));
assert.equal(hash(state),before);
assert.equal(hash(original),hash(await get('f5fd70b0f7e7fd6950561bb5b16b3c83effc8af555e866b5cd59420baed56f2f')));
console.log(JSON.stringify({ok:true,checks:['same_dependency_source_and_parent','complete_candidates_delivered',
  'explicit_original_indices_not_pareto_indices','actual_role_narrow_schema','single_native_step_original_resolver',
  'wrong_army_rejected','originals_preserved'],providerCalls:0,nativeCalls:0,productionWrites:0}));
