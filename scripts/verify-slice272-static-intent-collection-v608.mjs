// Actual808 retained a single formation objective; static Native wants an
// array. Exercise the real workflow executor and the actual Native validator,
// not a hand-written approximation of its accepted fields/kinds/defaults.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {normalizeExplicitStaticFormationObjectivesV1} from '../packages/online-agent-session/formation-intent-contract-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const stopped=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'
  &&w.inputs.request.value.operation==='spatial'&&w.inputs.request.value.args.queryKind==='space.solve_static_formation');
const failure=JSON.parse(await fs.readFile(path.join(base,'artifacts',stopped.resultRef+'.json'),'utf8')).value;
const source=failure.submittedArguments;assert(!Array.isArray(source.queryArguments.formationObjectives));
const snapshot=JSON.stringify(source),memory=new Map();let seq=0,nativeAdapterCalls=0;
const store={load:async()=>({...state,work:[]}),get:async ref=>memory.get(ref),put:async v=>{const ref='fixture-'+(++seq);memory.set(ref,JSON.parse(JSON.stringify(v)));return ref;}};
const lab={labDescriptor:()=>({sourceStateHash:state.scope.source}),querySpatial:async args=>{
  nativeAdapterCalls++;const input=JSON.parse(args.argumentsJson);
  normalizeExplicitStaticFormationObjectivesV1(input.formationObjectives);
  for(const unit of input.jointUnits??[])normalizeExplicitStaticFormationObjectivesV1(unit.formationObjectives);
  return {sourceStateHash:state.scope.source,baseStateHash:args.base.branchStateHash,
    resultStatus:'ok',queryKind:args.queryKind,fixtureTransportValidationOnly:true};}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
const execute=args=>executor.execute({workId:'fixture-static-intent-'+seq,scope:state.scope,
  inputs:{request:{value:{operation:'spatial',args,bindings:[],guards:[],resultGuards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
const result=await execute(source);
assert.equal(result.value.status,'completed','actual808 singleton intent must reach the unchanged Native array validator');
const canonical=JSON.parse(result.value.request.argumentsJson);
assert.deepEqual(canonical.formationObjectives,[source.queryArguments.formationObjectives]);
assert.deepEqual(result.value.submittedArguments,source);assert.equal(JSON.stringify(source),snapshot);
assert(result.value.inputBindings.some(b=>b.normalization==='static_formation_intent_collection_v1'));
const joint=structuredClone(source);joint.queryArguments.jointUnits=[{unitId:'fixture-other-unit',anchors:[{xInches:10,yInches:24}],
  formationObjectives:{kind:'screen',weight:5,targetIds:['u_marauder_1']}}];
const jr=await execute(joint);assert.deepEqual(JSON.parse(jr.value.request.argumentsJson).jointUnits[0].formationObjectives,
  [joint.queryArguments.jointUnits[0].formationObjectives]);
const priorCalls=nativeAdapterCalls,bad=structuredClone(source);bad.queryArguments.formationObjectives.kind='invented_intent';
const br=await execute(bad);assert.equal(br.value.status,'returned_to_model');assert.equal(br.value.nativeSuccess,false);
assert.equal(nativeAdapterCalls,priorCalls,'unsupported intent rejected with the real validator before dispatch, never balanced');
console.log(JSON.stringify({status:'passed',actual808Preserved:true,primaryAndJointSingletonsNormalized:true,
  unsupportedIntentNotApproximated:true,nativeAdapterFixtureCalls:nativeAdapterCalls,
  realNativeSolverCalls:0,providerCalls:0,productionWrites:0}));
