// Two actual r2 blockers: raw vs audited roster view; typed stateRef bound to base.
// Immutable production inputs, in-memory adapter, no new model/rules execution.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1,projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import * as refs from '../packages/roster-strategist/roster-workflow-state-reference-v1.mjs';
const [root,out,aRoot]=process.argv.slice(2),clone=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const draft=await get('bc04b820357f4f32e3c08e3d043b8d28f09d26ba6eba900fbdf21d00d0e41d3b');
const verdict=await get(draft.builderVerdictRef);
const work=state.work.find(w=>w.resultRef==='2a379a667b7cf9547e7048bbb7bddb5f721e21e29285a6d2a7b13d1634bfd874');
const failed=await get(work.resultRef),assignment=await get(work.inputRef);
const before=JSON.stringify({state,draft,verdict,failed,assignment}),checks=[],steps=[];
async function check(name,fn){try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:e.message});}console.log(JSON.stringify(checks.at(-1)));}
await check('native-audited-draft-and-readiness-agree',async()=>{
  const result=assessRosterWorkflowReadinessV1({draft,verdict});
  assert.equal(result.mechanicalFacts.planAndBuilderDescribeSameArmy,true,'same Native-audited r2 roster falsely mismatches');
  assert.deepEqual(result.mechanicalBlockers.map(e=>e.code).sort(),['requested_mineral_target_unmet','unit_purposes_missing','card_purposes_missing'].sort());
  const changed=clone(draft);changed.plan.rosterCandidate.units[0].compositionKind='large';
  assert.equal(assessRosterWorkflowReadinessV1({draft:changed,verdict}).mechanicalFacts.planAndBuilderDescribeSameArmy,false);
  const wrong=clone(draft);wrong.plan.rosterCandidate.units[0].upgradeSelections[0].purchasableUpgradeProfileId='wrong-profile';
  assert.equal(assessRosterWorkflowReadinessV1({draft:wrong,verdict}).mechanicalFacts.planAndBuilderDescribeSameArmy,false);
  const stale=clone(verdict);stale.candidateHash='0'.repeat(64);
  assert.equal(assessRosterWorkflowReadinessV1({draft,verdict:stale}).mechanicalFacts.planAndBuilderDescribeSameArmy,false);
  const missing=clone(verdict);missing.audit.units.pop();
  assert.ok(assessRosterWorkflowReadinessV1({draft,verdict:missing}).mechanicalBlockers.some(e=>e.code==='native_candidate_projection_invalid'));
  if(aRoot){const aState=JSON.parse(await fs.readFile(aRoot+'/workflow.json','utf8'));
    const aDraft=JSON.parse(await fs.readFile(aRoot+'/artifacts/'+aState.draftRef+'.json','utf8'));
    const aVerdict=JSON.parse(await fs.readFile(aRoot+'/artifacts/'+aDraft.builderVerdictRef+'.json','utf8'));
    const aResult=assessRosterWorkflowReadinessV1({draft:aDraft,verdict:aVerdict});
    assert.equal(aResult.mechanicalFacts.planAndBuilderDescribeSameArmy,true,'old valid name-addressed A must not acquire a false mismatch');
    steps.push({stage:'existing_A_address_view',revision:aDraft.revision,result:aResult});}
  steps.push({stage:'actual_B_readiness',result});
  return {actualMinerals:1760,remainingBudget:240,missingPurposesStillBlock:true,negativeCases:4};
});
await check('actual-bound-state-reference-reaches-same-native-parent',async()=>{
  let captured,calls=0;const memory=new Map();
  const store={load:async()=>clone(state),get:async ref=>memory.has(ref)?clone(memory.get(ref)):get(ref),put:async v=>{const ref=hash(v);memory.set(ref,clone(v));return ref;}};
  const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),runFormationSelectionBranch:async args=>{
    calls++;captured=clone(args);throw Object.assign(Error('FIXTURE_NATIVE_BOUNDARY_REACHED'),{code:'FIXTURE_NATIVE_BOUNDARY_REACHED'});
  }};
  const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory,store});
  const result=await executor.execute(clone(assignment),{operationState:{},checkpointOperation:async()=>{}});
  assert.equal(calls,1,JSON.stringify({code:result.value?.code,detail:result.value?.detail}));
  assert.deepEqual(captured.base,{kind:'source'});assert.equal(captured.selections.length,1);
  assert.equal(captured.selections[0].formationOptionId,(await get(assignment.inputs.binding0.resultRef)).value.receipt.queryReceipt.result.formationOptions[0].formationOptionId);
  const normalize=refs.normalizeRosterWorkflowStateReferenceArgumentsV1;
  const source=assignment.inputs.binding0.value,branch={...source,stateHash:'a'.repeat(64)};
  const normalized=normalize({base:branch});assert.deepEqual(normalized.args.stateRef,branch);
  assert.deepEqual(refs.resolveRosterWorkflowStateReferenceV1(normalized.args,{sourceStateHash:source.sourceStateHash}).base,{kind:'branch',branchStateHash:branch.stateHash});
  assert.throws(()=>normalize({base:source,stateRef:branch}),/STATE_REF_CONFLICT/);
  assert.throws(()=>normalize({base:{...source,stateHash:'bad'}}),/STATE_REF_INVALID/);
  assert.throws(()=>refs.resolveRosterWorkflowStateReferenceV1(normalize({base:source,contextRef:'wrong'}).args,{sourceStateHash:source.sourceStateHash}),/STATE_REF_CONFLICT/);
  assert.throws(()=>refs.resolveRosterWorkflowStateReferenceV1(normalize({base:source}).args,{sourceStateHash:'f'.repeat(64)}),/STATE_REF_SOURCE_MISMATCH/);
  assert.deepEqual(normalize({base:{kind:'source'}}),{args:{base:{kind:'source'}},binding:null});
  const recovery=projectRosterWorkflowToolRepairV1(failed.value);
  assert.equal(recovery.repairContractVersion,3);assert.ok(recovery.inputProblem);
  steps.push({stage:'same_adapter_actual_bound_input',assignment,nativeBoundary:captured,result,recovery});
  return {nativeBoundaryCalls:calls,successfulOperationReplayed:false,negativeCases:4,originalSelectionUnchanged:true};
});
assert.equal(JSON.stringify({state,draft,verdict,failed,assignment}),before);
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),checks,steps,actualProviderCalls:0,nativeCalls:0,productionWrites:0,formalPlans:0},null,2));
process.exitCode=checks.every(c=>c.pass)?0:1;
