// Reproduce event10508's real NO_READY_WORK receiving boundary, not a new game.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {isRosterWorkOrderCapabilityReturnV1} from '../packages/roster-strategist/roster-workflow-order-failure-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone;
const source=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const read=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const result=await read('4e8626c0281e54c9f55c4d615c8edf21fb2637df5c4055dce17b75d0de292edc');
const failure=result.value.failedWorkOrders[0],original=hash(result),draft=await read(source.draftRef);
assert.equal(failure.error.detail.issue,'work_after_delegated_completion');
assert.equal(isRosterWorkOrderCapabilityReturnV1(failure,{exhaustedLocalRepair:true}),true,
  'An exhausted child must return its exact method/scope dispute to the owner, not leave no ready work');
assert.equal(isRosterWorkOrderCapabilityReturnV1(failure),false,'Before exhaustion keep the normal local repair');
for(const edit of [f=>{f.error.dispatchOutcome='dispatched';},f=>{f.error.detail.operationAllowed=false;},
  f=>{f.error.detail.choiceContract=null;},f=>{f.order.steps=f.order.steps.filter(s=>s.operation!=='native_action');}]){
  const changed=copy(failure);edit(changed);
  assert.equal(isRosterWorkOrderCapabilityReturnV1(changed,{exhaustedLocalRepair:true}),false);
}
let state=null,providerCalls=0;const artifacts=new Map();
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
  put:async value=>{const ref=hash(value);artifacts.set(ref,copy(value));return ref;},
  get:async ref=>{assert.ok(artifacts.has(ref),'Missing receiver fixture source '+ref);return copy(artifacts.get(ref));}};
const laboratory={labDescriptor:()=>({sourceStateHash:source.scope.source,rulesRuntimeHash:source.scope.rules,builderBundleHash:hash('offline')})};
const make=()=>createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope:source.scope,sessionId:'v960-offline',
  createDraftContext:async()=>({scope:source.scope,laboratory}),
  deliberation:{deliberate:async()=>{providerCalls++;throw Error('Control return cannot buy a new correction');}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('No roster edit authorized');}}});
const run=await make();
await run.initializeDraft({candidateInput:copy(draft.candidateInput),plan:copy(draft.plan),provenance:copy(draft.provenance),mode:'fixed'});
await run.enqueue([{id:'experiment',role:'roster_workflow_experiment_planner',bindings:source.scope,experimentGoalId:'experiment',
  orderRepairGeneration:3,orderRepairLimit:3,
  inputs:{question:{source:'literal',value:'同一个单Marine有界路线问题；不模拟整场对局'}}}]);
const owner=state.work.find(w=>w.id==='experiment');owner.status='evidence_ready';owner.resultRef=await store.put(copy(result));
state.evidence.push({id:'role:experiment',title:'Actual saved scope refusal',kind:'proposal',bindings:copy(source.scope),
  artifactRef:owner.resultRef,conditions:result.conditions,availability:'available'});
const restored=await make(),out=await restored.advance({concurrency:1});
const child=out.state.work.find(w=>w.orderRepairOf==='experiment');assert.ok(child?.inputs.orderFailureReturn);
assert.equal(child.status,'evidence_ready');assert.equal(providerCalls,0);
const returned=(await store.get(child.resultRef)).value;
assert.deepEqual(returned.coordination.failure,failure);
assert.equal(returned.coordination.kind,'work_order_delegation_return');
assert.equal(returned.coordination.nativeRetryAuthorized,false);assert.equal(returned.coordination.planApprovalGranted,false);
const frontier=out.state.work.find(w=>w.investigationFrontierOf==='experiment');
assert.equal(frontier?.role,'roster_workflow_strategy_decision');
assert.equal(frontier.inputs.delegationBoundaryRequests.value[0].failure.error.detail.issue,'work_after_delegated_completion');
assert.equal(frontier.inputs.unavailableCapabilities,undefined);
assert.equal(out.state.work.filter(w=>w.role==='roster_workflow_tool').length,0);
const cold=await make();assert.deepEqual((await cold.inspect()).work.map(w=>[w.id,w.status]),out.state.work.map(w=>[w.id,w.status]));
assert.equal(hash(result),original);
console.log(JSON.stringify({pass:true,checks:['exhausted_scope_failure_returns_owner_not_infinite_local_retry',
  'product_scheduler_preserves_original_method_and_queues_one_owner',
  'cold_restore_no_tool_or_provider_replay_and_no_fact_approval'],providerCalls,nativeCalls:0,productionWrites:0}));
