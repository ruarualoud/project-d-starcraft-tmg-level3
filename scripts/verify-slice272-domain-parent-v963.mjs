// Actual omitted-parent solver request. Inject only the Native port; assert
// the production executor's exact routed state/arguments, not game legality.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterWorkflowDelegatedScenesV1,bindRosterWorkflowDelegatedSceneV1} from '../packages/roster-strategist/roster-workflow-state-reference-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),before=hash(state);
const bad=state.work.find(w=>w.resultRef==='7c1ec6dc403e5b11be8df49e9969aa8dd771bad7fe5428bf0e89a2bc9ab079c3');assert.ok(bad);
const failed=(await get('e2663191836829e1988a50acfef82f04196d12358017394c91c150dbf3084f6d')).value;
const selected=failed.inputBindings.find(b=>b.argumentPointer==='/selection').value;
const fullRef=selected.stateRef,domainId=selected.action.domainId,args=bad.inputs.request.value.args;
const owner=state.work.find(w=>w.id===bad.experimentOwnerId),descriptor=owner.inputs.tools.value.laboratory;
const draft=await get(state.draftRef),calls=[];
const executor=createRosterWorkflowLaboratoryExecutorV1({
  laboratory:{labDescriptor:()=>descriptor,querySpatial:async request=>{
    calls.push(copy(request));return {resultStatus:'ok',sourceStateHash:descriptor.sourceStateHash,
      baseStateHash:request.base?.branchStateHash??descriptor.sourceStateHash,
      queryKind:request.queryKind,queryReceipt:{resultStatus:'ok'}};}},
  getCandidateInput:async()=>draft.candidateInput,
  store:{load:async()=>state,get,put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}}});
const result=await executor.execute({workId:bad.id,scope:bad.bindings,inputs:{request:{value:copy(bad.inputs.request.value)}}},
  {operationState:{},checkpointOperation:async()=>{}});
assert.equal(calls.length,1);
assert.deepEqual(calls[0].base,{kind:'branch',branchStateHash:fullRef.stateHash},
  'An exact-domain repair prerequisite must retain the selected Native parent, not silently use the initial scene');
assert.deepEqual(result.value.submittedArguments,args);
assert.deepEqual(JSON.parse(calls[0].argumentsJson),args.queryArguments);
assert.equal(result.value.inputBindings.find(b=>b.normalization==='delegated_current_domain_parent_v1')?.sourceResultRef,
  'e2663191836829e1988a50acfef82f04196d12358017394c91c150dbf3084f6d');
const scenes=await projectRosterWorkflowDelegatedScenesV1({state,workId:bad.id,readArtifact:get});
assert.ok(scenes.some(s=>s.selectedDomainId===domainId&&s.stateRef.stateHash===fullRef.stateHash));
assert.deepEqual(bindRosterWorkflowDelegatedSceneV1({args:{...args,base:{kind:'source'}},scenes}).args,{...args,base:{kind:'source'}});
assert.deepEqual(bindRosterWorkflowDelegatedSceneV1({args:{...args,stateRef:fullRef},scenes}).args,{...args,stateRef:fullRef});
assert.deepEqual(bindRosterWorkflowDelegatedSceneV1({args,scenes:[]}).args,args);
assert.throws(()=>bindRosterWorkflowDelegatedSceneV1({args:{...args,queryArguments:{...args.queryArguments,domainId:'different'}},scenes}),
  e=>e.code==='ROSTER_WORKFLOW_DELEGATED_DOMAIN_MISMATCH');
assert.throws(()=>bindRosterWorkflowDelegatedSceneV1({args,scenes:[...scenes,{...scenes[0],selectedDomainId:domainId,
  stateRef:{...fullRef,stateHash:'f'.repeat(64)}}]}),e=>e.code==='ROSTER_WORKFLOW_DELEGATED_SCENE_AMBIGUOUS');
assert.equal(hash(state),before);
console.log(JSON.stringify({pass:true,checks:['actual_tool_executor_retains_selected_parent','model_query_parameters_unchanged',
  'exact_binding_provenance','explicit_sources_preserved','unknown_and_conflicting_domains_not_guessed'],
  realNativeCalls:0,realProviderCalls:0,productionWrites:0}));
