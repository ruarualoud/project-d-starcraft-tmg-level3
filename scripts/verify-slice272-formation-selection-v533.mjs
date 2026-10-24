// Actual212 queried static candidates, then treated the unchanged parent as
// repaired. Exercise the new explicit model-selection seam with that receipt.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]);
const base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const work=state.work.find(w=>w.id.endsWith('repair-goliath-formation-3'));
const original=await get(work.resultRef),receipt=original.value.receipt;
const option=receipt.queryReceipt.result.formationOptions[0];
const args={base:{kind:'branch',branchStateHash:receipt.baseStateHash},
  selections:[{sourceWorkId:work.id,formationOptionId:option.formationOptionId}]};
const order={orderId:'actual212-selected-candidate',purpose:'Explicit selection, not another candidate query',scenarioAssumptions:['Select actual returned first option for this diagnostic only; not a strategic recommendation'],
  steps:[{stepId:'apply-selection',operation:'formation_scene',argumentsJson:JSON.stringify(args),bindings:[],guards:[],publicReason:'Model selection applies exact candidate, preserving other units'}],
  stopAndReturnToModelWhen:'After complete scene geometry assessment',completionStepId:''};
const compiled=compileRosterWorkflowExperimentV1({order,scope:{},namespace:'v533'});
assert.equal(compiled.length,1);
console.log('explicit selection operation compiles');

// Exact frozen source and original native runtime, no live room or provider.
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(saved.authority.state)===receipt.sourceStateHash){authority=saved.authority;break;}
}
assert.ok(authority,'actual candidate source is retained');
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const makeLab=()=>createPregameSceneLaboratoryV1({laboratoryId:receipt.laboratoryId,sourceRoomRef:receipt.sourceRoomRef,
  sourceState:authority.state,matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:structuredClone(authority.state)})})});
const branches=new Map();
for(const w of state.work){
  if(w.role!=='roster_workflow_tool'||!w.resultRef)continue;
  const value=(await get(w.resultRef)).value;
  if(value?.receipt?.branchStateHash&&value.receipt.sourceStateHash===receipt.sourceStateHash)branches.set(value.receipt.branchStateHash,value);
}
function restore(lab,stateHash){
  if(stateHash===receipt.sourceStateHash)return;
  const saved=branches.get(stateHash);assert.ok(saved,'retain exact ancestor, never re-run');
  restore(lab,saved.receipt.parentStateHash);
  const method=saved.receipt.branchKind==='native_action'?'restoreNativeActionBranch':'restoreHypotheticalBranch';
  lab[method]({receipt:saved.receipt,spec:saved.request.spec,base:saved.request.base});
}
const lab=makeLab();restore(lab,receipt.baseStateHash);
const parent=lab.describeQueryContext({base:args.base});
const memory=new Map();const store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
let savedOperation;
const control={operationState:{},checkpointOperation:async v=>{savedOperation=structuredClone(v);}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
const assignment={workId:'v533:apply-selection',inputs:compiled[0].inputs};
const result=await executor.execute(assignment,control);
assert.equal(result.value.status,'completed',JSON.stringify(result.value));
const applied=result.value.receipt;
assert.notEqual(applied.branchStateHash,receipt.baseStateHash);
const after=lab.describeQueryContext({base:{kind:'branch',branchStateHash:applied.branchStateHash}});
const beforeUnit=parent.availableUnits.find(u=>u.unitId===option.pieceId);
const afterUnit=after.availableUnits.find(u=>u.unitId===option.pieceId);
assert.notDeepEqual(afterUnit.models,beforeUnit.models);
for(const position of option.canonicalPlacement.modelPositions){
  const model=afterUnit.models.find(m=>m.modelId===position.modelId);
  assert.equal(model.xInches,position.xInches);assert.equal(model.yInches,position.yInches);
}
assert.deepEqual(after.availableUnits.filter(u=>u.unitId!==option.pieceId),parent.availableUnits.filter(u=>u.unitId!==option.pieceId));
assert.deepEqual(lab.describeQueryContext({base:args.base}),parent,'parent immutable');
assert.equal(applied.formationSelection.hostSelectedOption,false);
assert.equal(applied.formationSelection.arrivalOrMovementLegalityProven,false);
const previousFailures=branches.get(receipt.baseStateHash).receipt.hypotheticalPlacementAssessment.units.filter(u=>u.resultStatus!=='ok'&&u.pieceId!==option.pieceId);
for(const failed of previousFailures)assert.notEqual(applied.hypotheticalPlacementAssessment.units.find(u=>u.pieceId===failed.pieceId)?.resultStatus,'ok','unselected invalid units cannot disappear from assessment');
const combat=await lab.querySpatial({queryId:'v533:new-scene-combat',base:{kind:'branch',branchStateHash:applied.branchStateHash},queryKind:'fire_zone_exchange',argumentsJson:'{}'});
assert.equal(combat.baseStateHash,applied.branchStateHash);
assert.equal(combat.resultStatus,'unknown','other failed units still prevent combat evidence');
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
const cold=makeLab();restore(cold,receipt.baseStateHash);
const coldExecutor=createRosterWorkflowLaboratoryExecutorV1({laboratory:cold,store});
const resumed=await coldExecutor.execute(assignment,{operationState:savedOperation,checkpointOperation:async()=>{throw Error('unexpected replay');}});
assert.deepEqual(resumed,result);
assert.deepEqual(cold.describeQueryContext({base:{kind:'branch',branchStateHash:applied.branchStateHash}}),after);
const invalid=structuredClone(assignment);invalid.inputs.request.value.args.selections[0].formationOptionId='not-a-candidate';
const denied=await executor.execute(invalid,{operationState:{},checkpointOperation:async()=>{}});
assert.equal(denied.continuation,true);assert.equal(denied.value.queryRepair?.correctable,true);
assert.equal(denied.value.nativeSuccess,false);
assert.deepEqual(await get(work.resultRef),original,'immutable actual paid/tool evidence unchanged');
console.log(JSON.stringify({pass:true,selectedPiece:option.pieceId,oldPosition:beforeUnit.models,newPosition:afterUnit.models,
  unselectedFailuresRetained:previousFailures.length,sourceMutation:0,coldRestoreWithoutReplay:true,providerCalls:0,productionWrites:0,
  fullCombatProven:false,strategicImprovementProven:false}));
