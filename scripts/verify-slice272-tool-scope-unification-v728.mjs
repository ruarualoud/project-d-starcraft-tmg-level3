// Reproduce concrete gaps: probability has no proof binding, formation/projection
// drop the declared local scope, and an assigned comparison can omit its identity.
// Actual saved sources are read-only; the laboratory Adapter below is a scope spy,
// not a Native geometry/strategy proof.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1,compileRosterWorkflowExperimentV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {bindRosterComparisonStepV1} from '../packages/roster-strategist/roster-comparison-observation-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 as nativeContracts}
  from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
const root=path.resolve(process.argv[2]);
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const original=JSON.stringify(state),memory=new Map(),failures=[];
const read=async ref=>memory.has(ref)?structuredClone(memory.get(ref))
  :JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const check=async(name,fn)=>{try{await fn();console.log(JSON.stringify({name,passed:true}));}
  catch(error){failures.push({name,message:error.message});console.log(JSON.stringify({name,passed:false,message:error.message}));}};
const work=state.work.find(w=>w.resultRef==='6da5583f4fb03a67cb43720cf16db5f5c5db2583252de121925934ce8126fce5');
assert(work,'exact saved successful static option required');
const value=(await read(work.resultRef)).value,receipt=value.receipt;
const option=receipt.queryReceipt.result.formationOptions[0];
const scope={kind:'fixed_scenario_tactic',decisionQuestion:'Compare this retained local placement.',
  decisionImpact:'Only the declared comparison, no full game.',
  participantUnitIds:option.jointUnitIds??[option.pieceId],scenarioDescription:'Exact retained source and explicit selected option.',
  stopPredicate:'Return after the selected local observation.',collectScenarioExperience:false,hypothesisTest:null,comparisonBinding:null};
let formationArgs,projectionArgs;
const laboratory={labDescriptor:()=>({sourceStateHash:receipt.sourceStateHash}),
  runFormationSelectionBranch:async args=>{formationArgs=args;return {resultStatus:'ok'};},
  captureSceneLayout:()=>({sourceStateHash:receipt.sourceStateHash}),
  runProjectedScenarioBranch:async args=>{projectionArgs=args;return {resultStatus:'ok'};},
  queryProbability:async()=>({resultStatus:'ok'}),queryThreatExchange:async()=>({resultStatus:'ok'})};
const store={load:async()=>structuredClone(state),get:read,
  put:async value=>{const ref='memory:'+memory.size;memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
const execute=(operation,args)=>executor.execute({workId:'v728:'+operation,scope:state.scope,
  inputs:{request:{value:{operation,args,experimentScope:scope,bindings:[],guards:[],resultGuards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
await check('formation_scope_reaches_selected_native_adapter',async()=>{
  const result=await execute('formation_scene',{base:{kind:'branch',branchStateHash:receipt.baseStateHash},
    selections:[{sourceWorkId:work.id,formationOptionId:option.formationOptionId}]});
  assert.equal(result.value.status,'completed',JSON.stringify(result.value));
  assert.deepEqual(formationArgs.executionScope,scope);
});
await check('projection_scope_reaches_selected_native_adapter',async()=>{
  const result=await execute('project_scene',{base:{kind:'source'},
    referenceStateRef:{schema:'roster_workflow_state_ref_v1',contextRef:null,
      sourceStateHash:receipt.sourceStateHash,stateHash:receipt.sourceStateHash},
    changedUnits:[],unlistedUnits:'off_table'});
  assert.equal(result.value.status,'completed',JSON.stringify(result.value));
  assert.deepEqual(projectionArgs.executionScope,scope);
});
await check('probability_and_exchange_use_native_proof_contract',()=>{
  for(const [operation,queryKind]of [['probability','attack_probability'],['threat_exchange','fire_zone_exchange']]){
    const bound=bindRosterComparisonStepV1({observationStepIds:['measure']},{stepId:'measure',operation},{});
    assert.equal(bound.toolProofScope?.proves,nativeContracts[queryKind].proves);
    assert.equal(bound.toolProofScope?.doesNotProve,nativeContracts[queryKind].doesNotProve);
    const advertised=executor.descriptor().operations.find(row=>row.operation===operation);
    assert.deepEqual(advertised.proofScope,bound.toolProofScope);
  }
});
await check('assigned_comparison_cannot_drop_observation_identity',async()=>{
  const source=state.evidence[172],purpose=(await read(source.artifactRef)).proposals[0].comparisonPurpose;
  const order={orderId:'missing-binding',purpose:'Use actual assigned purpose',scenarioAssumptions:[],
    experimentScope:scope,stopAndReturnToModelWhen:scope.stopPredicate,completionStepId:'',
    steps:[{stepId:'measure',operation:'threat_exchange',argumentsJson:'{}',bindings:[],guards:[],publicReason:'Measure'}]};
  assert.throws(()=>compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'v728-unbound',
    evidenceDirectory:state.evidence,comparisonPurpose:{status:'read',evidenceId:source.id,evidenceNumber:173,value:purpose}}),
    error=>error.code==='ROSTER_COMPARISON_BINDING_INVALID');
});
assert.equal(JSON.stringify(state),original);
console.log(JSON.stringify({passed:!failures.length,failures,providerCalls:0,nativeCalls:0,
  productionWrites:0,laboratoryWasScopeSpy:true,formalPlanAccepted:false}));
if(failures.length)process.exitCode=1;
