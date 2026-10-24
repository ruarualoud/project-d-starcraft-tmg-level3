// Reproduce two actual fresh-run outcomes: completed invalid_candidate and a
// retained empty-baseline branch failure with no standard repair contract.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1,projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {queryRosterBudgetBranchesV1} from '../packages/roster-strategist/roster-budget-branch-query-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const [editable,fixed]=process.argv.slice(2),root=process.cwd();
const readRun=async directory=>{const run=JSON.parse(await fs.readFile(path.join(directory,'product-run.json'),'utf8'));
  const base=path.join(directory,'workspace/decision-workflows',run.workflowId);
  return {state:JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),
    get:async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'))};};
const e=await readRun(editable),f=await readRun(fixed);
const failed=e.state.work.find(w=>w.id.endsWith('method:0997b9577ea24d1c:order0:branches-from-empty'));assert.ok(failed);
const retained=await e.get(failed.resultRef),original=JSON.stringify(retained);
assert.equal(failed.status,'needs_model_choice');assert.equal(retained.value.queryRepair,null);
assert.ok(projectRosterWorkflowToolRepairV1(retained.value)?.correctable,'the retained exact baseline failure must enter the existing standard input-repair lane');
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const port=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
assert.throws(()=>queryRosterBudgetBranchesV1({...retained.value.request,armyBuilderPort:port}),error=>
  error.code==='ROSTER_BUDGET_BRANCH_BASELINE_NOT_RULES_LEGAL'&&error.queryRepair?.correctable
  &&error.detail?.baselineAudit?.status==='invalid_candidate','new source errors must retain the actual baseline rejection');
const badWork=e.state.work.find(w=>w.resultRef&&w.id.endsWith('order0:audit-minimal-marine-fixed'));assert.ok(badWork);
const assignment=await e.get(badWork.inputRef),memory=new Map();let next=0;
const store={load:async()=>({work:[],events:[],scope:assignment.scope}),get:async ref=>memory.has(ref)?memory.get(ref):e.get(ref),
  put:async value=>{const ref='outcome-memory-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const laboratory={labDescriptor:()=>({sourceStateHash:assignment.scope.source,rulesRuntimeHash:assignment.scope.rules,
  builderBundleHash:port.portDescriptor().unitCompositionUpgradeDataBundleHash})};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store,builderPort:port,getCandidateInput:async()=>assignment.inputs.request.value.args.candidateInput});
const result=await executor.execute(assignment,{operationState:{},checkpointOperation:async()=>{}});
assert.equal(result.continuation,true);assert.equal(result.value.status,'returned_to_model');
assert.equal(result.value.receipt.status,'invalid_candidate');assert.equal(result.value.nativeRulesExecuted,false);
assert.ok(result.value.queryRepair.correctable);assert.ok(result.value.queryRepair.candidateInputContract);
// Use a real saved legal Native audit as a cached response, not a new Rules run.
const legalWork=f.state.work.find(w=>w.id==='product:initial-army-and-plan:investigation:order0:audit-draft');assert.ok(legalWork);
const legal=await f.get(legalWork.resultRef);assert.equal(legal.value.receipt.status,'legal');
const saved=await store.put(legal);const resumed=await executor.execute(assignment,{operationState:{completedRef:saved},checkpointOperation:async()=>{}});
assert.notEqual(resumed.continuation,true);assert.equal(resumed.value.status,'completed');assert.deepEqual(resumed.value.receipt,legal.value.receipt);
assert.equal(JSON.stringify(retained),original);
console.log(JSON.stringify({passed:true,retainedFailureRoutesToStandardRepair:true,invalidAddressNotCompleted:true,
  realLegalReceiptUnchanged:true,originalRetainedFailureUnchanged:true,providerCalls:0,nativeArmyAudits:0,productionWrites:0,
  actualAutomaticProductionRecoveryProven:false,strategyImprovementProven:false}));
