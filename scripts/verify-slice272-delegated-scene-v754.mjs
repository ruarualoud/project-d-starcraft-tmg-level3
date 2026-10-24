// Actual f438 -> dfa59 dropped the candidate qualifier in a nested repair.
// Exercise the production executor, retaining the actual task graph and input.
// Native ports are injected: this proves routing, not geometry or strategy.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=path.resolve(process.argv[2]),before=await fs.readFile(path.join(root,'workflow.json'),'utf8');
const original=JSON.parse(before),memory=new Map();
const read=async ref=>memory.get(ref)??JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const bad=original.work.find(w=>w.resultRef==='dfa59fec1c7a4a35fbedc57989d420777555a2d3a19a40c7be0db2d968c8a832');
assert(bad);
const owner=original.work.find(w=>w.id===bad.experimentOwnerId);
const graph=createRosterWorkflowGraphV1(original),targets=graph.pendingChain(owner.id);
const fullRef=targets[0].inputs.request.value.args.stateRef;
const creationRef='a93913243bfb171ee60aee002cdd56be6fea4133dda2eb3f92185b8443d26046';
const creation=(await read(creationRef)).value.receipt;
const parent=owner.inputs.tools.value.laboratory;
assert.equal(fullRef.contextRef,creation.contextRef);
let state=structuredClone(original);
const calls=[];
const store={load:async()=>state,get:read,put:async value=>{const ref=hash(value);memory.set(ref,value);return ref;}};
function laboratory(descriptor){
  return {labDescriptor:()=>descriptor,querySpatial:async args=>{
    calls.push({source:descriptor.sourceStateHash,args:structuredClone(args)});
    if(descriptor.sourceStateHash!==fullRef.sourceStateHash||args.base.branchStateHash!==fullRef.stateHash)
      throw Object.assign(Error('PREGAME_LAB_BRANCH_UNKNOWN'),{code:'PREGAME_LAB_BRANCH_UNKNOWN'});
    return {resultStatus:'ok',sourceStateHash:descriptor.sourceStateHash,baseStateHash:args.base.branchStateHash,
      queryKind:args.queryKind,queryReceipt:{resultStatus:'ok'}};
  }};
}
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:laboratory(parent),store,
  getCandidateInput:async()=>creation.candidateInput,
  builderPort:{evaluateRosterCandidate:async()=>creation.audit},
  createCandidateLaboratory:async()=>laboratory(creation.laboratory)});
const creationWork=original.work.find(w=>w.resultRef===creationRef);
await executor.restore({workflowState:{work:[creationWork],
  events:[{type:'result_saved',workId:creationWork.id,resultRef:creationRef}]}});
async function execute(args){
  return executor.execute({workId:bad.id,scope:bad.bindings,inputs:{request:{value:{
    ...structuredClone(bad.inputs.request.value),args:structuredClone(args)}}}},
  {operationState:{},checkpointOperation:async()=>{}});
}
const args=bad.inputs.request.value.args;
const actual=await execute(args);
assert.equal(actual.value.status,'completed','actual omitted qualifier must reach its delegated candidate, not default army');
assert.equal(actual.value.contextRef,fullRef.contextRef);
assert.deepEqual(actual.value.submittedArguments,args,'never rewrite the model original');
assert.deepEqual(actual.value.stateRef,fullRef);
assert.equal(calls.at(-1).source,fullRef.sourceStateHash);
assert.deepEqual(JSON.parse(calls.at(-1).args.argumentsJson),args.queryArguments,'no Host-chosen geometry');
assert.deepEqual(actual.value.inputBindings.find(b=>b.normalization==='delegated_scene_identity_v1').value,fullRef);
const {projectRosterWorkflowDelegatedScenesV1,bindRosterWorkflowDelegatedSceneV1}=
  await import('../packages/roster-strategist/roster-workflow-state-reference-v1.mjs');
const scenes=await projectRosterWorkflowDelegatedScenesV1({state,workId:owner.id,readArtifact:read});
assert(scenes.some(x=>x.sourceWorkId===targets[0].id&&x.stateRef.stateHash===fullRef.stateHash));
assert.deepEqual(bindRosterWorkflowDelegatedSceneV1({args:{...args,contextRef:null},scenes}).args,{...args,contextRef:null});
assert.deepEqual(bindRosterWorkflowDelegatedSceneV1({args:{stateRef:fullRef},scenes}).args,{stateRef:fullRef});
assert.deepEqual(bindRosterWorkflowDelegatedSceneV1({args:{...args,base:{kind:'source'}},scenes}).args,
  {...args,base:{kind:'source'}},'no guessed source from absent branch identity');
const other={...args,base:{kind:'branch',branchStateHash:'f'.repeat(64)}};
assert.deepEqual(bindRosterWorkflowDelegatedSceneV1({args:other,scenes}).args,other,'new branch cannot inherit by proximity');
assert.throws(()=>bindRosterWorkflowDelegatedSceneV1({args,scenes:[...scenes,
  {stateRef:{...fullRef,contextRef:'candidate:ambiguous'},sourceWorkId:'other'}]}),
  e=>e.code==='ROSTER_WORKFLOW_DELEGATED_SCENE_AMBIGUOUS');
const explicit=await execute({...args,contextRef:null});
assert.equal(explicit.value.code,'PREGAME_LAB_BRANCH_UNKNOWN','explicit root selection is preserved, not silently repaired');
state=structuredClone(original);delete state.work.find(w=>w.id===bad.id).experimentOwnerId;
assert.deepEqual(await projectRosterWorkflowDelegatedScenesV1({state,workId:bad.id,readArtifact:read}),[]);
state=structuredClone(original);state.scope={...state.scope,source:'e'.repeat(64)};
assert.deepEqual(await projectRosterWorkflowDelegatedScenesV1({state,workId:bad.id,readArtifact:read}),[]);
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),before);
assert.deepEqual((await read(bad.resultRef)).value.submittedArguments,args);
console.log(JSON.stringify({passed:true,actualExecutorCandidateRouting:true,exactArgumentsPreserved:true,
  explicitOverridePreserved:true,ambiguousUnknownStaysUnknown:true,coldGraphScopeChecks:true,
  providerCalls:0,realNativeCalls:0,productionWrites:0}));
