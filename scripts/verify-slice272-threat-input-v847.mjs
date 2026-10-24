// Actual e9285 request: targetUnitIds was silently dropped by Native.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1,compileRosterWorkflowExperimentV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import * as source from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const root=process.argv[2];
const ref='7a2f1a16046f9a0d1f4a5bff7e8964103dcdeaf39809ccb951e9919580e38d80';
const raw=await fs.readFile(root+'/artifacts/'+ref+'.json','utf8');
const value=JSON.parse(raw).value;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.resultRef===ref);
assert.ok(work);
const args=structuredClone(value.request);delete args.queryId;
let seen=[],next=0;
const objects=new Map();
const laboratory={labDescriptor:()=>({sourceStateHash:value.receipt.sourceStateHash}),
  queryThreatExchange:async input=>{seen.push(structuredClone(input));
    throw Object.assign(Error('fixture_native_boundary'),{code:'fixture_native_boundary'});}};
const store={load:async()=>({work:[],evidence:[],scope:work.bindings}),
  put:async v=>{const id=String(++next);objects.set(id,structuredClone(v));return id;},
  get:async id=>objects.get(id)};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
const execute=async input=>executor.execute({workId:'threat-input-v847',scope:work.bindings,
  inputs:{request:{value:{...work.inputs.request.value,args:input,bindings:[],guards:[],resultGuards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
const actual=await execute(args);
assert.deepEqual(seen[0]?.targetIds,args.targetUnitIds,'explicit target selection must reach the Native-consumed field');
assert.equal(seen[0].targetUnitIds,undefined);
assert.equal(seen[0].queryKind,undefined);
assert.deepEqual(actual.value.submittedArguments,args,'paid/original arguments are not rewritten');
assert.ok(actual.value.inputBindings.some(b=>b.normalization==='pregame_threat_exchange_input_v1'));
assert.equal(actual.value.code,'fixture_native_boundary');

const normalize=source.normalizePregameThreatExchangeInputV1;
const canonical={base:args.base,subjectUnitIds:['goliath-1'],targetIds:args.targetUnitIds,
  seatKey:'player1',maximumRelations:4,sampleBudget:36};
assert.deepEqual(normalize(canonical).query,canonical);
assert.deepEqual(normalize({...canonical,targetUnitIds:canonical.targetIds}).query,canonical);
assert.deepEqual(normalize(args).query,{base:args.base,targetIds:args.targetUnitIds});
const invalid=[{...canonical,targetUnitIds:['different-target']},
  {...canonical,targetIds:'player2-kerrigan-raptor'},
  {...canonical,subjectUnitIds:[null]},
  {...canonical,targetIds:['']},
  {...canonical,queryKind:'attack_probability'},
  {...canonical,targets:['player2-kerrigan-raptor']}];
const count=seen.length;
for(const input of invalid){
  const failed=await execute(input);
  assert.equal(failed.value.executed,false);
  assert.equal(failed.value.nativeSuccess,false);
  assert.equal(failed.value.queryRepair.correctable,true);
  assert.equal(failed.value.queryRepair.originalQueryNotAnswered,true);
  assert.equal(failed.value.queryRepair.sourceContract,'pregame_threat_exchange_input_v1');
  assert.throws(()=>normalize(input),error=>error.code===failed.value.code);
}
assert.equal(seen.length,count,'invalid queries never reach Native or become measurements');
const compile=input=>compileRosterWorkflowExperimentV1({scope:work.bindings,namespace:'threat-input-v847',
  order:{orderId:'same-question',purpose:'Verify exact selected threat target',
    scenarioAssumptions:work.inputs.request.value.scenarioAssumptions,
    experimentScope:work.inputs.request.value.experimentScope,stopAndReturnToModelWhen:'Return the single measurement',
    completionStepId:'exchange',steps:[{stepId:'exchange',operation:'threat_exchange',
      argumentsJson:JSON.stringify(input),bindings:[],guards:[],resultGuards:[]}]}});
assert.throws(()=>compile(invalid[0]),error=>error.code==='PREGAME_LAB_THREAT_EXCHANGE_INPUT_INVALID');
const compiled=compile(args);
assert.deepEqual(compiled[0].inputs.request.value.args,args,'compiler retains raw fields for explicit bindings');
assert.equal(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'),raw);
console.log(JSON.stringify({passed:true,actualTargetForwarded:true,sourceContractShared:true,
  invalidInjections:invalid.length,rawArgumentsPreserved:true,compilerValidated:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
