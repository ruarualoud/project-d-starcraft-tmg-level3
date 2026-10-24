// Actual B failure: declared large/upgraded arm, but selected the unchanged
// small unit via root context. Exercise the product executor before Native.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const read=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const state=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const saved=await read('178c8ab7db47177ec35f583d88f229ed042819e7e0704af0458cb88979958a81');
  const source=state.work.find(w=>w.resultRef==='178c8ab7db47177ec35f583d88f229ed042819e7e0704af0458cb88979958a81');
  const draft=await read(state.draftRef),candidate=draft.candidateInput;
  const small=candidate.units.find(u=>u.unitInstanceId==='marauder-2');
  const large={...structuredClone(candidate.units.find(u=>u.unitInstanceId==='marauder-1')),unitInstanceId:'marauder-2'};
  assert.equal(small.compositionKind,'small');assert.equal(large.compositionKind,'large');
  const bytes=JSON.stringify({source,saved,candidate}),artifacts=new Map();let calls=0,sequence=0;
  const descriptor={schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',laboratoryId:'configuration-test',
    sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules};
  const laboratory={labDescriptor:()=>descriptor,runScenarioBranch:async()=>{calls++;return structuredClone(saved.value.receipt);}};
  const store={load:async()=>({work:[],evidence:[]}),put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');artifacts.set(ref,structuredClone(value));return ref;},
    get:async ref=>artifacts.get(ref)??read(ref)};
  const tool=createRosterWorkflowLaboratoryExecutorV1({laboratory,store,getCandidateInput:async()=>structuredClone(candidate)});
  async function execute(configurations,configurationBinding){
    const request=structuredClone(source.inputs.request.value);
    if(configurations!==undefined)request.experimentScope.participantConfigurations=structuredClone(configurations);
    if(configurationBinding)request.comparisonBinding.participantConfigurations=structuredClone(configurationBinding);
    return tool.execute({workId:`configuration-probe-${sequence++}`,scope:source.bindings,inputs:{request:{value:request}}},
      {operationState:null,checkpointOperation:async()=>{}});
  }
  const missing=await execute();
  assert.equal(missing.value.code,'ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_REQUIRED',
    'actual B comparison must not execute with an unbound declared configuration');
  assert.equal(calls,0);assert.equal(missing.value.executed,false);
  const wrong=await execute([large]);
  assert.equal(wrong.value.code,'ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_MISMATCH');
  assert.equal(calls,0);assert.equal(wrong.value.queryRepair.actualConfigurations[0].compositionKind,'small');
  assert.ok(wrong.value.queryRepair.differences.some(d=>d.field==='compositionKind'));
  assert.ok(wrong.value.queryRepair.differences.some(d=>d.field==='upgrades'));
  report.checks.push('saved B request cannot run before author binds configuration; explicit large/upgrades mismatch returned before Native');
  const matched=await execute([small]);
  assert.equal(matched.value.status,'completed');assert.equal(calls,1);
  assert.equal(matched.value.participantConfigurationCheck.status,'matched');
  assert.deepEqual(matched.value.participantConfigurationCheck.actualConfigurations,[small]);
  assert.equal(matched.value.receipt.branchStateHash,saved.value.receipt.branchStateHash);
  assert.equal(matched.value.participantConfigurationCheck.strategyApproved,false);
  const inherited=await execute(undefined,[small]);
  assert.equal(inherited.value.status,'completed');assert.equal(calls,2);
  const conflicting=await execute([large],[small]);
  assert.equal(conflicting.value.code,'ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_CONFLICT');assert.equal(calls,2);
  const absent=await execute([{...large,unitInstanceId:'not-in-selected-context'}]);
  assert.equal(absent.value.code,'ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_MISMATCH');assert.equal(calls,2);
  assert.equal(JSON.stringify({source,saved,candidate}),bytes);
  report.checks.push('matched exact selection is executed unchanged; inherited repair expectation retained; conflicting/absent unit rejected; no original mutation');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-participant-configuration-v906-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
