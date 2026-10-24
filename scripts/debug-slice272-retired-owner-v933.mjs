// Reproduce the actual r14 post-commit handoff against the product wrapper.
// All checkpoint writes stay in memory; no model or Rules calls are allowed.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  let state=copy(original);const memory=new Map();
  // Native restoration is outside this scheduling bug. Preserve all work and
  // evidence, but do not replay old laboratory restore events into the stub.
  state.events=state.events.filter(e=>state.work.find(w=>w.id===e.workId)?.role!=='roster_workflow_tool');
  const startEvents=state.events.length;
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const goal=state.work.find(w=>w.experimentScopePolicy==='frozen_comparison_v1'&&w.status==='evidence_ready'&&w.id.endsWith(':purpose:v2:study'));
  const owners=state.work.filter(w=>w.experimentGoalId===goal.id&&w.role==='roster_workflow_experiment_planner');
  assert.equal(owners.at(-1).status,'superseded');
  const obsolete=owners.findLast(w=>w.status==='evidence_ready');
  assert.equal(state.work.find(w=>w.id===obsolete.id+':strategy-frontier').status,'superseded');
  const lab={labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'v933-readonly-no-native',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){throw Error('NO_NATIVE_EXECUTION');}};
  const options={workflowStore:store,laboratory:lab,scope:state.scope,sessionId:'v933-post-commit-probe',
    deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}};
  const run=await createRosterDecisionWorkspaceRunV1(options);
  // This public method synchronizes the same product state before enqueuing a
  // harmless unexecuted summary. The original bug throws during synchronize.
  await run.summarizeExperiment({id:'v933-sync-probe',question:{goal:'unexecuted synchronization probe'},toolWorkIds:[]});
  assert.equal(state.draftRevision,original.draftRevision);
  assert.equal(state.work.find(w=>w.id===goal.id).investigationHandoff,undefined);
  assert(!state.events.slice(startEvents).some(e=>e.type==='investigation_returned_to_strategy'));
  report.checks.push('r14_product_sync_does_not_reactivate_superseded_frontier');
  await assert.rejects(run.returnInvestigation({goalId:goal.id,reason:'probe stale fallback'}),/INVESTIGATION_OWNER_REQUIRED/);
  report.checks.push('explicit_return_uses_same_latest_owner_boundary');
  const reopened=await createRosterDecisionWorkspaceRunV1(options);
  await reopened.summarizeExperiment({id:'v933-cold-sync-probe',question:{goal:'unexecuted cold synchronization probe'},toolWorkIds:[]});
  assert.equal(state.work.find(w=>w.id===goal.id).investigationHandoff,undefined);
  assert.equal(state.work.find(w=>w.id===obsolete.id+':strategy-frontier').status,'superseded');
  assert.deepEqual(JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),original);
  report.checks.push('cold_sync_preserves_fact_sources_and_retired_decision');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack?.split('\n').slice(0,8);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
