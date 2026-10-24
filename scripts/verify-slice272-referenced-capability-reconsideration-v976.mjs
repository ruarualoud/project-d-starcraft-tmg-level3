// Actual stopped v974 investigate decision: evidence reference rather than a
// copied post-revision decision; summary delivered, current navigation absent.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const goal=original.work.find(w=>w.id.endsWith(':capability-delivery-reconsideration:v1:investigation')&&w.status==='ready');
assert(goal&&goal.inputs.decision.source==='evidence'&&!goal.operationState);
const producer=original.work.find(w=>w.id===goal.investigationFor);
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const produced=await get(producer.resultRef),before=hash(original);
let state={...copy(original),events:original.events.filter(e=>e.type!=='result_saved')};
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const options={workflowStore:store,scope:state.scope,sessionId:'offline-v976',
  laboratory:{labDescriptor:()=>({laboratoryId:'offline-v976',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    querySpatial:async()=>assert.fail('No Native query')},deliberation:{deliberate:async()=>assert.fail('No Provider')}};
let run=await createRosterDecisionWorkspaceRunV1(options);
const command={goalId:goal.id,expectedSourceReplyRef:produced.value.originalReplyRef,
  expectedDraftRevision:original.draftRevision,requiredDeliveryVersion:2,
  reason:'Current capability summary was delivered, but exact current contract navigation was missing and old contract 940 was selected as current.'};
const returned=await run.reconsiderUnstartedInvestigationCapabilities(command);
const held=state.work.find(w=>w.id===goal.id),author=state.work.find(w=>w.id===returned.decisionId);
assert.equal(returned.planApproved,false);
assert.equal(state.draftRef,original.draftRef);
assert.deepEqual(author.inputs.heldInvestigation.value,produced.value);
assert.equal(author.inputs.capabilityDeliveryRepair.value.requiredDeliveryVersion,2);
assert.equal(author.inputs.capabilityDeliveryRepair.value.sourceResultRef,producer.resultRef);
const graph=createRosterWorkflowGraphV1(state);
assert.equal(graph.canRun(held.id),false);assert.equal(graph.canRun(author.id),true);
const count=state.work.length,eventCount=state.events.length;
run=await createRosterDecisionWorkspaceRunV1(options);
assert.equal((await run.reconsiderUnstartedInvestigationCapabilities(command)).decisionId,author.id);
assert.equal(state.work.length,count);assert.equal(state.events.length,eventCount);
await assert.rejects(run.reconsiderUnstartedInvestigationCapabilities({...command,expectedSourceReplyRef:'f'.repeat(64)}));
assert.equal(hash(original),before);
console.log(JSON.stringify({ok:true,checks:['actual_evidence_decision_resolved_without_rewrite',
  'summary_not_confused_with_navigation_delivery','native_hold_and_normal_author','cold_resume_idempotent','wrong_reply_denied'],
  providerCalls:0,nativeCalls:0,productionWrites:0,planChanged:false,historyReset:false}));
