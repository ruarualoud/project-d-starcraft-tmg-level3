// Concrete production failure: all three model-selected regions were objects;
// the successful paid correction changed ONLY each object to a one-item list.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {prepareStaticFormationAnchorSpaceV1} from '../packages/online-agent-session/static-formation-anchor-space-v1.mjs';
import {normalizeRosterFormationQueryInputV1} from '../packages/roster-strategist/roster-formation-query-input-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const badId='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1:study:order0:scene-b:completed-method-handoff:order0:repair-choice:order0:apply-joint:observed-choice:order0:solve-joint-regions';
const bad=state.work.find(work=>work.id===badId),good=state.work.find(work=>work.id===badId+':input-repair:order0:solve-joint-regions-array');
assert.ok(bad&&good);
const artifact=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const failure=(await artifact('f9c27d70e4b7c395fa96508ab8f666be052496fefdcc62576e6fabcebdd11709')).value;
assert.equal(failure.receipt.unknownReason,'STATIC_FORMATION_ARGUMENTS_INVALID');
const success=(await artifact(good.resultRef)).value;assert.equal(success.receipt.resultStatus,'ok');
const expected=JSON.parse(success.request.argumentsJson);
const source={...structuredClone(bad.inputs.request.value.args),base:structuredClone(success.request.base)};
assert.equal(Array.isArray(source.queryArguments.anchorRegions),false);
const snapshot=JSON.stringify(source),memory=new Map();let sequence=0,adapterCalls=0;
const store={load:async()=>({...state,work:[],evidence:[]}),get:async ref=>memory.get(ref),
  put:async value=>{const ref='fixture-'+(++sequence);memory.set(ref,structuredClone(value));return ref;}};
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),querySpatial:async args=>{
  adapterCalls++;const input=JSON.parse(args.argumentsJson);
  prepareStaticFormationAnchorSpaceV1(input);
  for(const unit of input.jointUnits??[])prepareStaticFormationAnchorSpaceV1(unit);
  return {sourceStateHash:state.scope.source,baseStateHash:args.base.branchStateHash,
    resultStatus:'ok',queryKind:args.queryKind,sourceValidatorOnly:true};
}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
const execute=args=>executor.execute({workId:'fixture-regions-'+sequence,scope:state.scope,
  inputs:{request:{value:{operation:'spatial',args,bindings:[],guards:[],resultGuards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
const result=await execute(source);
assert.equal(result.value.status,'completed','actual singleton regions should reach the unchanged Native validator without another model call');
assert.deepEqual(JSON.parse(result.value.request.argumentsJson),expected,
  'canonical payload equals the actual successful paid correction, not a new layout or different bounds');
assert.deepEqual(result.value.submittedArguments,source);assert.equal(JSON.stringify(source),snapshot);
assert.ok(result.value.inputBindings.some(binding=>binding.changes?.length===3));
const canonical={queryKind:source.queryKind,argumentsJson:JSON.stringify(expected)};
assert.deepEqual(normalizeRosterFormationQueryInputV1(canonical),{args:canonical,normalizations:[]},'already-canonical arrays are unchanged');
const priorCalls=adapterCalls,invalid=structuredClone(source);invalid.queryArguments.anchorRegions.stepInches=0;
const rejected=await execute(invalid);
assert.equal(rejected.value.status,'returned_to_model');assert.equal(rejected.value.nativeSuccess,false);
assert.equal(adapterCalls,priorCalls,'bad numeric regions are rejected by the same source validator, never repaired by inventing a step');
const other={...canonical,queryKind:'attack_probability'};
assert.deepEqual(normalizeRosterFormationQueryInputV1(other),{args:other,normalizations:[]});
console.log(JSON.stringify({passed:true,actualFailedAndSuccessfulInputs:true,primaryAndJointRegionsCanonicalized:true,
  exactSuccessfulNativePayload:true,originalChoicesPreserved:true,invalidBoundsNotApproximated:true,
  adapterFixtureCalls:adapterCalls,nativeSolverCalls:0,providerCalls:0,productionWrites:0}));
