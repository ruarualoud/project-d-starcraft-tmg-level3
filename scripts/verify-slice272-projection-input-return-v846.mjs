// Actual e9165: an unsupported projection field stranded needs_model_choice.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1,projectRosterWorkflowToolRepairV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowToolReturnWorkV1}
  from '../packages/roster-strategist/roster-workflow-tool-return-v1.mjs';
const root=process.argv[2];
const ref='b3699331d79573d1b4ba23aadfc5deceffb175fe6e4602f4b3b28f91ea41e2c5';
const raw=await fs.readFile(root+'/artifacts/'+ref+'.json','utf8');
const failure=JSON.parse(raw).value;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.resultRef===ref);
assert.ok(work);
const repair=projectRosterWorkflowToolRepairV1(failure);
assert.equal(repair?.correctable,true,'actual saved input rejection must produce a model repair, not NO_READY_WORK');
assert.deepEqual(repair.inputProblem.unsupportedArguments,['targetContextRef']);
assert.deepEqual(repair.inputProblem.missingArguments,['changedUnits','unlistedUnits']);
assert.equal(repair.originalQueryNotAnswered,true);
assert.match(repair.instruction,/stateRef/);
const make=(s,w=work)=>createRosterWorkflowToolReturnWorkV1({state:s,work:w,failure,
  queryRepair:repair,toolDescriptor:{fixtureOnly:true},sourceInputs:{}});
const returned=make(state);
assert.ok(returned,'same product recovery constructor must schedule the correction');
assert.equal(returned.repairOf,work.id);
assert.deepEqual(returned.inputs.task.value.originalWork,work.inputs.request.value);
assert.equal(make({...state,work:[...state.work,returned]}),null,'cold sync is idempotent');
assert.equal(make(state,{...work,operationState:{pending:{requestRef:'pending-fixture'}}}),null);

// Execute at the actual adapter boundary, with Native replaced by a sentinel.
// No production storage or Rules calls; the exact input must fail before capture.
let captures=0,projections=0,next=0;
const objects=new Map();
const laboratory={labDescriptor:()=>({sourceStateHash:failure.request.referenceStateRef.sourceStateHash}),
  captureSceneLayout:()=>{captures++;return {};},
  runProjectedScenarioBranch:()=>{projections++;throw Object.assign(Error('fixture_native_boundary'),{code:'fixture_native_boundary'});}};
const store={load:async()=>({work:[],evidence:[],scope:work.bindings}),
  put:async value=>{const id=String(++next);objects.set(id,structuredClone(value));return id;},
  get:async id=>objects.get(id)};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
const execute=async args=>executor.execute({workId:'projection-input-v846',scope:work.bindings,
  inputs:{request:{value:{...work.inputs.request.value,args,bindings:[],guards:[],resultGuards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
const actual=await execute(structuredClone(failure.submittedArguments));
assert.equal(actual.value.code,'ROSTER_WORKFLOW_SCENE_PROJECTION_INPUT_INVALID');
assert.deepEqual(executor.projectRepair(actual.value),repair,'fresh and retained failure use identical source validation');
assert.equal(captures,0);assert.equal(projections,0);
const valid={referenceStateRef:failure.submittedArguments.referenceStateRef,changedUnits:[],unlistedUnits:'off_table'};
const injections=[{...valid,unexpectedField:true},
  {referenceStateRef:valid.referenceStateRef,unlistedUnits:'off_table'},
  {...valid,changedUnits:['goliath-1']},
  {...valid,changedUnits:[{unitId:'goliath-1',mode:'repack_at_reference_anchor'},{unitId:'goliath-1',mode:'repack_at_reference_anchor'}]},
  {...valid,unlistedUnits:'keep'},
  {...valid,referenceStateRef:null}];
for(const args of injections){
  const result=await execute(args);
  assert.equal(result.continuation,true);
  assert.equal(executor.projectRepair(result.value)?.correctable,true);
  assert.equal(captures,0);assert.equal(projections,0);
}
const boundary=await execute(valid);
assert.equal(boundary.value.code,'fixture_native_boundary');
assert.equal(captures,1);assert.equal(projections,1);
assert.equal(executor.projectRepair(boundary.value),null,'unknown execution faults are not reclassified as input errors');
assert.equal(projectRosterWorkflowToolRepairV1({...failure,nativeSuccess:true,status:'completed'}),null);
assert.equal(projectRosterWorkflowToolRepairV1({...failure,operation:'native_action'}),null);
assert.equal(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'),raw);
console.log(JSON.stringify({passed:true,actualSavedFailureRecovered:true,sameFreshAndSavedInputContract:true,
  correctionScheduled:true,coldSyncIdempotent:true,pendingProtected:true,invalidInputInjections:6,
  validInputReachesExistingNativeBoundary:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
