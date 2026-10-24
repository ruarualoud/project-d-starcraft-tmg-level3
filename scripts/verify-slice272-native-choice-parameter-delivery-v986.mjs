// Real deployment choice received only the shallow Native domain schema,
// although its exact inspect receipt already contained the submission contract.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterNativeChoiceSourcesV1 as project} from '../packages/roster-strategist/roster-native-choice-sources-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {inspectStarcraftTmgActionParametersV1} from '../packages/online-agent-session/action-parameter-contract-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):
  JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),stateBefore=hash(state);
const oldRequest=await get('92b80c7b49f93fdad19524e927ee38c8b0070563bad0a4131b0c96be852e03a1');
const sent=oldRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const work=state.work.find(w=>w.id===sent.workId),assignment=await get(work.inputRef);
const originalRef='51cbf205ac60676002dd2d792ce8842996563e79f467aaf7a46b9c618c85b347',original=await get(originalRef);
const originalHash=hash(original),contracts=original.value.receipt.actionParameterContracts;
const domain=original.value.receipt.actionSpace.parameterDomains.find(d=>d.pieceId==='marine-1'&&d.actionType==='deploy');
const bad=JSON.parse((await get('e1822bfff50363c7186c0f759cfb44dda41e77289a95bbef9f13634f2cd74b87')).output.selection.parametersJson);
if(!process.argv.includes('--remaining')){
assert.equal(JSON.stringify(oldRequest.promptNodes).includes('xMilliInches'),false);
assert(inspectStarcraftTmgActionParametersV1(domain,bad).fieldIssues.some(i=>i.fieldPath.endsWith('.xMilliInches')));
const projected=await project({assignment,state,readArtifact:get});
assert(projected.nativeChoiceParameterContracts0,'Same-receipt parameter contract was not delivered');
assert.deepEqual(projected.nativeChoiceParameterContracts0?.value,contracts,
  'Native choice must receive the exact sibling submission contracts, not only shallow domain names');
assert.equal(projected.nativeChoiceParameterContracts0.pointer,'/receipt/actionParameterContracts');
assert.equal(projected.nativeChoiceParameterContracts0.evidenceId,projected.nativeChoiceSource0.evidenceId);
assert.deepEqual(projected.nativeChoiceSource0.value,original.value.receipt.actionSpace);
assert(contracts[domain.domainId].fieldContracts.path.items.required.includes('xMilliInches'));
}
// The same product source projection must actually reach the role request.
assignment.inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
let operation={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store:{get,put,load:async()=>state},sessionId:'offline-v986',
  deliberation:{deliberate:async request=>{captured=request;throw Error('CAPTURE_ONLY');}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async value=>{operation=copy(value);},
  readEvidence:async(id,pointer)=>{const entry=assignment.evidenceDirectory.find(e=>e.id===id);assert(entry);
    let value=await get(entry.artifactRef);for(const token of pointer.split('/').slice(1)){
      const key=token.replaceAll('~1','/').replaceAll('~0','~');assert(Object.hasOwn(value,key));value=value[key];}
    return {status:'read',evidenceId:id,pointer,kind:entry.kind,conditions:entry.conditions??[],validity:entry.validity,value};},
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v986:'+ref;
    let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Saved context',kind:metadata.kind??'interpretation',validity:'current',bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
try{await execute(assignment,control);}catch(error){if(error.message!=='CAPTURE_ONLY')throw error;}
assert(captured?.promptNodes.some(n=>n.kind==='native_choice_command'));
const delivered=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.nativeChoiceParameterContracts0;
assert(delivered?.value,'Actual role request lost the exact parameter contract');
assert.equal(hash(delivered.value),hash(contracts),'Actual role request changed the exact parameter contract');
assert.equal(delivered.value[domain.domainId].doesNotProveProposalLegal,true);
assert(inspectStarcraftTmgActionParametersV1(domain,bad).valid===false,'Delivery must not silently fix old model parameters');
assert.deepEqual(await project({assignment:{...assignment,scope:{...assignment.scope,army:'wrong-army'}},state,readArtifact:get}),{});
const pending=state.work.find(w=>w.id===work.choiceOf),wrongMenu=copy(original);
wrongMenu.value.stateRef.stateHash='wrong-successor';
assert.deepEqual(await project({assignment,state,readArtifact:async ref=>ref===originalRef?wrongMenu:get(ref)}),{});
const legacy=copy(original);delete legacy.value.receipt.actionParameterContracts;
const legacyInputs=await project({assignment,state,readArtifact:async ref=>ref===originalRef?legacy:get(ref)});
assert(!legacyInputs.nativeChoiceParameterContracts0,'Do not silently rebuild a missing historical contract');
assert(pending,'Real saved choice ownership is required');
assert.equal(hash(state),stateBefore);assert.equal(hash(await get(originalRef)),originalHash);
assert.equal(hash(oldRequest),hash(await get('92b80c7b49f93fdad19524e927ee38c8b0070563bad0a4131b0c96be852e03a1')));
console.log(JSON.stringify({ok:true,mode:process.argv.includes('--remaining')?'remaining_only':'full',checks:[
  ...(process.argv.includes('--remaining')?[]:['actual_saved_missing_field_reproduced','exact_native_contract_sibling_delivered']),
  'normal_product_source_projection_and_role_request','same_menu_and_source_identity','wrong_army_and_parent_rejected',
  'old_params_still_rejected_no_geometry_approval','originals_and_workflow_unchanged'],providerCalls:0,nativeCalls:0,productionWrites:0}));
