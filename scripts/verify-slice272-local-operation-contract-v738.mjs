// Reproduce a product contract contradiction and an operation-type bypass:
// scenario advertises lifecycle/native_action although this product permits
// only explicit local geometry there. No Provider, Native or production writes.
import assert from 'node:assert/strict';
import {describePregameWorkflowInputContractsV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const scope={kind:'fixed_scenario_tactic',decisionQuestion:'Measure one declared local action.',
  decisionImpact:'Compare the local result before adopting a Plan choice.',
  participantUnitIds:['unit-a'],scenarioDescription:'One frozen local scene.',
  stopPredicate:'Return after the declared local observation.',collectScenarioExperience:false,
  hypothesisTest:null,comparisonBinding:null};
const order=spec=>({orderId:'local',purpose:'Local operation contract reproduction',
  scenarioAssumptions:[],experimentScope:scope,completionStepId:'scene',
  stopAndReturnToModelWhen:'After this local step',
  steps:[{stepId:'scene',operation:'scenario',argumentsJson:JSON.stringify({spec}),
    bindings:[],guards:[],publicReason:'No automatic lifecycle authorization.'}]});
const failures=[];
async function check(name,run){try{await run();}catch(error){failures.push({name,error:error.code??error.message});}}
await check('discovery-has-only-local-geometry',()=>{
  const spec=describePregameWorkflowInputContractsV1().scenario.specContract;
  assert.deepEqual(spec.properties.kind.enum,['hypothetical_geometry']);
  assert.equal(spec.properties.lifecycleSteps.maximum,0);
});
await check('compiler-rejects-native-action-laundered-as-scenario',()=>{
  assert.throws(()=>compileRosterWorkflowExperimentV1({order:order({kind:'native_action'}),
    scope:{source:'source'},namespace:'v738'}),e=>e.code==='ROSTER_EXPERIMENT_SCENARIO_KIND_FORBIDDEN');
});
await check('executor-enforces-same-contract-before-dispatch',async()=>{
  let calls=0;const artifacts=new Map();
  const executor=createRosterWorkflowLaboratoryExecutorV1({
    laboratory:{labDescriptor:()=>({sourceStateHash:'source'}),
      runScenarioBranch:async()=>{calls++;return {resultStatus:'ok'};}},
    store:{load:async()=>({work:[],evidence:[]}),get:async ref=>artifacts.get(ref),
      put:async value=>{const ref=String(artifacts.size);artifacts.set(ref,structuredClone(value));return ref;}}});
  const result=await executor.execute({workId:'v738:execution',scope:{source:'source'},inputs:{
    request:{value:{operation:'scenario',args:{spec:{kind:'native_action'}},experimentScope:scope,
      bindings:[],guards:[],resultGuards:[]}}}},
    {operationState:{},checkpointOperation:async()=>{}});
  assert.equal(calls,0);
  assert.equal(result.value.code,'ROSTER_EXPERIMENT_SCENARIO_KIND_FORBIDDEN');
  assert.equal(result.value.executed,false);
  assert.equal(result.value.queryRepair.correctable,true);
});
await check('ordinary-local-geometry-remains-supported',()=>{
  const jobs=compileRosterWorkflowExperimentV1({order:order({kind:'hypothetical_geometry',
    placements:[{pieceId:'unit-a',xInches:12,yInches:12}]}),scope:{source:'source'},namespace:'v738:valid'});
  assert.equal(jobs[0].inputs.request.value.operation,'scenario');
  assert.equal(jobs[0].inputs.request.value.args.spec.placements[0].xInches,12);
});
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
