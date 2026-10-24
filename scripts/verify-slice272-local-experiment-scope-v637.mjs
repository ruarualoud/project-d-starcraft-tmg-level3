// Actual1285's valid geometry batch has no explicit decision scope/record lane.
// Reproduce that admission gap before adding the new user-required boundary.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const reply=JSON.parse(await fs.readFile(path.join(run,'1285.reply.json'),'utf8'));
const actual=reply.output.workOrders[0],directory=state.evidence.map((e,i)=>({...e,number:i+1}));
assert.throws(()=>compileRosterWorkflowExperimentV1({order:actual,scope:state.scope,
  namespace:'isolated-v637-missing-scope',evidenceDirectory:directory}),
  e=>e.code==='ROSTER_EXPERIMENT_SCOPE_REQUIRED',
  'BUG: a new private scene can execute without a bounded question, declared participants or separate scenario-memory lane');
const policy=await import('../packages/roster-strategist/roster-experiment-scope-v1.mjs');
const scope={kind:'firepower_comparison',decisionQuestion:'Compare the named units against Queen/Corpser under one fixed geometry.',
  decisionImpact:'Retain or revise the named anti-heavy component purposes, not a full-match claim.',
  participantUnitIds:['u_goliath_1','u_marine_1','u_medic_1','player2-queen','player2-corpser'],
  scenarioDescription:'The source phase/terrain and the chosen joint formation remain explicit conditional premises.',
  stopPredicate:'Return after the named per-attacker exchange; do not advance rounds.',
  collectScenarioExperience:true};
const order={...structuredClone(actual),experimentScope:scope};
const jobs=compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'isolated-v637-scoped',evidenceDirectory:directory});
assert(jobs.every(j=>JSON.stringify(j.inputs.request.value.experimentScope)===JSON.stringify(scope)));
assert.throws(()=>policy.validateRosterExperimentScopeV1({...scope,kind:'whole_match'}),e=>e.code==='ROSTER_EXPERIMENT_SCOPE_KIND_FORBIDDEN');
assert.throws(()=>policy.assertRosterLocalNativeTransitionV1({scope,parent:{round:1},successor:{round:2},action:{actionType:'end_round'}}),
  e=>e.code==='ROSTER_EXPERIMENT_CROSS_ROUND_SIMULATION_FORBIDDEN');
assert.doesNotThrow(()=>policy.assertRosterLocalNativeTransitionV1({scope,parent:{round:1},successor:{round:1},
  action:{actionType:'deploy',pieceId:'u_goliath_1'}}));
assert.throws(()=>policy.assertRosterLocalNativeTransitionV1({scope,parent:{round:1},successor:{round:1},
  action:{actionType:'move',pieceId:'undeclared-unit'}}),e=>e.code==='ROSTER_EXPERIMENT_UNDECLARED_PARTICIPANT');
let calls=0,captured;
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),runScenarioBranch:async args=>{
  calls++;captured=args;return {resultStatus:'ok',branchStateHash:'a'.repeat(64)};}};
const store={load:async()=>({events:[],work:[]}),get:async()=>{throw Error('UNEXPECTED_READ');},put:async()=> 'memory-only'};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
const args={spec:{kind:'hypothetical_geometry',phase:'assault',placements:[]}};
const request={operation:'scenario',args,publicReason:'Fixture admission only',orderId:'scope-admission',purpose:scope.decisionQuestion,
  scenarioAssumptions:['Conditional fixture'],stopAndReturnToModelWhen:scope.stopPredicate,bindings:[],guards:[],resultGuards:[]};
const assignment=experimentScope=>({workId:'isolated-v637-runtime',scope:state.scope,
  inputs:{request:{value:{...request,...(experimentScope?{experimentScope}:{})}}}});
const denied=await executor.execute(assignment(null),{operationState:{},checkpointOperation:async()=>{}});
assert.equal(denied.value.code,'ROSTER_EXPERIMENT_SCOPE_REQUIRED');assert.equal(calls,0);
const accepted=await executor.execute(assignment(scope),{operationState:{},checkpointOperation:async()=>{}});
assert.equal(calls,1);assert.equal(captured.executionScope.kind,scope.kind);
assert.equal(accepted.value.experimentOrigin.recordKind,'conditional_scenario_candidate');
assert.equal(accepted.value.experimentOrigin.mayWriteLiveRoomMemory,false);
assert.equal(accepted.value.experimentOrigin.mayAutoPromoteSkill,false);
assert.equal(accepted.value.experimentOrigin.trainingTruth,false);
assert.equal(accepted.value.experimentOrigin.question,scope.decisionQuestion);
assert.equal(accepted.value.experimentOrigin.stopPredicate,scope.stopPredicate);
console.log(JSON.stringify({passed:true,actualOrder:1285,scopeRequiredAtCompileAndRuntime:true,
  declaredLocalSceneAllowed:true,crossRoundAndUndeclaredActionDenied:true,
  explicitConditionalRecordLane:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0,
  runtimeMethodWasStub:true,realFullMatchWasNotRun:true}));
