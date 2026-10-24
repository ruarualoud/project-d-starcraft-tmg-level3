// The actual r5 already has discovery:r5:context, so the old early return
// prevents repaired budget capabilities from reaching the normal product Run.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await read(original.draftRef);assert.equal(draft.revision,5);
assert(original.work.some(w=>w.id==='discovery:r5:context'));
let state={...structuredClone(original),events:[]};const memory=new Map();
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:'controlled-budget-v675',
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules})},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('RULES_NOT_EXECUTED_BY_DISCOVERY_SCHEDULING');},
    enumerateArmyBuildingChoices:()=>{throw Error('DO_NOT_REBUILD_FROZEN_MENU');}},
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}}});
const oldCount=state.work.length;await run.prepareContext();
const added=state.work.slice(oldCount).filter(w=>w.role==='roster_workflow_tool'&&w.inputs.request.value.operation==='builder_branches');
assert.equal(added.length,1,'normal product must expose the repaired budget search even when the old context discovery already exists');
const budget=added[0],args=budget.inputs.request.value.args;
assert.equal(args.generationPolicy,'breadth_first_v2');assert.equal(args.startOffset,0);
assert.equal(budget.bindings.army,state.scope.army);assert.equal(budget.bindings.rules,state.scope.rules);
assert.equal(budget.bindings.source,state.scope.source);assert(!Object.hasOwn(budget.bindings,'plan'));
const afterFirst=state.work.length;await run.prepareContext();assert.equal(state.work.length,afterFirst);
// Controlled completion VIEW: prove the next normal decision is assigned the
// fresh source, without pretending that a query or model decision ran here.
const viewId='tool-view:'+budget.id;
await run.publishEvidence({id:viewId,title:'Controlled current budget view',kind:'tool_receipt',bindings:budget.bindings,
  conditions:['Controlled wiring fixture, no Rules/strategy assertion'],value:{schema:'controlled_current_budget_view',budgetBranchDirectory:[]}});
await run.requestDecision({id:'controlled-budget-consumer-v675',question:'Read the current budget options before choosing the next construction step.'});
let owner=(await run.inspect()).work.find(w=>w.id==='controlled-budget-consumer-v675');
assert.equal(owner.inputs.budgetOptions.id,viewId);
// Plan-only revision keeps the same candidate-specific read-only source.
state.scope.plan='controlled-new-plan-binding';state.draftRevision++;
const later=structuredClone(draft);later.revision++;later.plan.planHash=state.scope.plan;
state.draftRef=await store.put(later);
await run.prepareContext();
assert.equal(state.work.filter(w=>w.role==='roster_workflow_tool'&&w.inputs.request.value.operation==='builder_branches'
  &&w.inputs.request.value.args.generationPolicy==='breadth_first_v2').length,1);
console.log(JSON.stringify({status:'passed',sourceRevision:5,newBudgetWorkId:budget.id,
  repairedCapabilityDiscoveredAfterLegacyContext:true,oneDiscoveryPerFactualCandidate:true,
  planOnlyRevisionDoesNotRepeatBudgetSearch:true,normalDecisionAssignedFreshBudgetView:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,workflowStoreControlled:true,
  liveRulesQueryAndInheritedOwnerDeliveryStillPending:true}));
