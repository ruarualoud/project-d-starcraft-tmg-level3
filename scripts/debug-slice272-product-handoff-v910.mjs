// Actual v909 A stop: product appended tools/readiness after the authoritative
// recovery contract was generated. Exercise the real workspace wrapper, not
// only a hand-constructed enqueue against the core. No paid call or Native work.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {projectRosterConfigurationReconsiderationV1} from '../packages/roster-strategist/roster-configuration-reconsideration-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone,checks=[];
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
try{
  let state=copy(original);const memory=new Map();
  // Unrelated completed tool history is not replayed in this scheduling fixture.
  // Keep all work, sources, decisions and bindings exactly as captured.
  state.events=state.events.filter(e=>state.work.find(w=>w.id===e.workId)?.role!=='roster_workflow_tool');
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const expected=await projectRosterConfigurationReconsiderationV1({state,readArtifact:store.get});
  assert.ok(expected?.inputs.actionAvailabilityContractChange,'use actual A blocker');
  const lab={labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'v910-readonly-no-native',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){throw Error('NO_NATIVE_EXECUTION');}};
  const options={workflowStore:store,laboratory:lab,scope:state.scope,
    sessionId:'v910-captured-product-probe',deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}};
  const run=await createRosterDecisionWorkspaceRunV1(options);
  const expectedInputs={...copy(expected.inputs),tools:{source:'literal',value:run.tools()},
    requirements:{source:'literal',value:await run.readiness()}};
  const wrongTools={...copy(expected),inputs:copy(expectedInputs)};
  wrongTools.inputs.tools.value.laboratory.laboratoryId='synthetic-stale-tools';
  await assert.rejects(run.enqueue([wrongTools]),/RECONSIDERATION_INVALID/);
  const wrongReadiness={...copy(expected),inputs:copy(expectedInputs)};
  wrongReadiness.inputs.requirements.value={readyForRelease:true};
  await assert.rejects(run.enqueue([wrongReadiness]),/RECONSIDERATION_INVALID/);
  checks.push('real_workspace_core_rejects_changed_tools_or_readiness');
  const scheduled=await run.reconsiderParticipantConfiguration();
  assert.deepEqual(scheduled.scheduled,[expected.id]);
  const enqueued=state.work.find(w=>w.id===expected.id);
  assert.deepEqual(enqueued.inputs,expectedInputs,'product and core must validate the same complete current input');
  assert.equal(enqueued.inputs.tools.value.laboratory.laboratoryId,'v910-readonly-no-native');
  checks.push('actual_workspace_recovery_accepts_complete_current_tools_readiness_contract');
  const reopened=await createRosterDecisionWorkspaceRunV1(options);
  assert.deepEqual((await reopened.reconsiderParticipantConfiguration()).scheduled,[]);
  assert.deepEqual(state.work.find(w=>w.id===expected.id).inputs,expectedInputs);
  assert.equal(state.work.find(w=>w.id===expected.investigationFrontierOf).investigationHandoff.decisionId,expected.id);
  checks.push('cold_workspace_reopen_preserves_owner_and_inputs_without_second_handoff');
  assert.deepEqual(JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),original);
  const report={pass:true,checks,providerCalls:0,nativeCalls:0,productionWrites:0,
    actualProductWrapper:true,originalReplyAndHistoryUnchanged:true};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){const report={pass:false,checks,error:error.message,stack:error.stack?.split('\n').slice(0,6)};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;}
