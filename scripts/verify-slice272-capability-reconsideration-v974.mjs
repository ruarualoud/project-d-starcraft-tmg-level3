// Actual unstarted r23 investigation produced by an author lacking current
// capabilities. In-memory product Run only; no Provider, Native or disk writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const remaining=process.argv.includes('--remaining-dispatch');
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
assert.equal(original.draftRevision,23);
const goal=original.work.find(w=>w.id.endsWith(':followup:r23')&&w.status==='ready');
assert(goal&&!goal.inputRef&&!goal.operationState);
const before=hash(original),get=async ref=>{
  if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
let state={...copy(original),events:original.events.filter(e=>e.type!=='result_saved')};
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const options={workflowStore:store,scope:state.scope,sessionId:'offline-v974',
  laboratory:{labDescriptor:()=>({laboratoryId:'offline-v974',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    querySpatial:async()=>assert.fail('No Native')},deliberation:{deliberate:async()=>assert.fail('No Provider')}};
let run=await createRosterDecisionWorkspaceRunV1(options);
if(!remaining)assert.equal(typeof run.reconsiderUnstartedInvestigationCapabilities,'function',
  'The actual unstarted inquiry must be held and returned to its author after confirmed capability-delivery repair, not executed from the obsolete decision');
const command={goalId:goal.id,expectedSourceReplyRef:goal.inputs.decision.value.originalReplyRef,
  expectedDraftRevision:23,reason:'Current tool capability delivery was absent from the producing strategy request; now repaired.'};
const returned=await run.reconsiderUnstartedInvestigationCapabilities(command);
const held=state.work.find(w=>w.id===goal.id),author=state.work.find(w=>w.id===returned.decisionId);
if(!remaining){
assert.equal(returned.planApproved,false);
assert.equal(state.draftRef,original.draftRef);
assert.equal(held.investigationHandoff.decisionId,author.id);
assert.equal(author.investigationFrontierOf,held.id);
assert.equal(author.role,'roster_workflow_strategy_decision');
assert.equal(author.status,'ready');
assert.deepEqual(author.inputs.heldInvestigation.value,goal.inputs.decision.value);
assert.equal(author.inputs.capabilityDeliveryRepair.value.factApproved,false);
}
assert.equal(createRosterWorkflowGraphV1(state).canRun(held.id),false);
assert.equal(createRosterWorkflowGraphV1(state).canRun(author.id),true);
const count=state.work.length,events=state.events.length;
run=await createRosterDecisionWorkspaceRunV1(options);
const replay=await run.reconsiderUnstartedInvestigationCapabilities(command);
assert.equal(replay.decisionId,returned.decisionId);
assert.equal(state.work.length,count);
assert.equal(state.events.length,events);
await assert.rejects(run.reconsiderUnstartedInvestigationCapabilities({...command,expectedSourceReplyRef:'f'.repeat(64)}));
await assert.rejects(run.reconsiderUnstartedInvestigationCapabilities({...command,expectedDraftRevision:24}));
assert.equal(hash(original),before);
console.log(JSON.stringify({ok:true,checks:['actual_source_gap_recognized','pending_method_held_original_retained',
  'same_product_strategy_owner_enqueued','cold_resume_idempotent','wrong_source_and_revision_rejected'],
  providerCalls:0,nativeCalls:0,productionWrites:0,planChanged:false,historyReset:false}));
