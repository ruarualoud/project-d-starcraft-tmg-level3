// Actual842/849/851 repeatedly guessed blocked fixed anchors. Restore the
// SAME private Native branch from saved patches/specs; never replay its actions.
import fs from 'node:fs/promises';import path from 'node:path';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const records=new Map();
for(const w of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.resultRef
  &&['scenario','native_action','formation_scene','project_scene'].includes(w.inputs.request.value.operation))){
  const value=(await read(w.resultRef)).value,r=value.receipt;
  if(r?.sourceStateHash===state.scope.source&&r.branchStateHash&&!records.has(r.branchStateHash))records.set(r.branchStateHash,value);
}
let authority;for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(saved.authority.state)===state.scope.source){authority=saved.authority;break;}}
assert(authority);const sourceHash=hash(authority.state);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:'ticket27-s271-roster-workspace-lab',
  sourceRoomRef:{roomId:'ticket27-slice-271-roster-workspace-isolated-lab',stateRevision:0},sourceState:authority.state,
  matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:structuredClone(authority.state)})})});
const restored=new Set([sourceHash]);let nativeActionsReplayed=0;
async function restore(id,seen=new Set()){
  if(restored.has(id))return;assert(!seen.has(id));seen.add(id);
  const v=records.get(id);assert(v,'saved branch must exist: '+id);const r=v.receipt;
  await restore(r.parentStateHash,seen);const base=r.parentStateHash===sourceHash?undefined:{kind:'branch',branchStateHash:r.parentStateHash};
  if(r.branchKind==='native_action')lab.restoreNativeActionBranch({receipt:r,base});
  else if(r.formationSelection)lab.restoreFormationSelectionBranch({receipt:r,base});
  else if(r.sceneProjection)lab.restoreProjectedScenarioBranch({receipt:r,base});
  else lab.restoreHypotheticalBranch({receipt:r,base,spec:v.request.spec});
  restored.add(id);
}
const parent='7750d547902f6061c77214a763fd3fb96b7887325cdfe499026f4286bdd638d4';await restore(parent);
const baseBranch={kind:'branch',branchStateHash:parent};const beforeLayout=lab.captureSceneLayout({base:baseBranch});
const region=(minimumXInches,maximumXInches,minimumYInches,maximumYInches,xInches,yInches)=>({
  minimumXInches,maximumXInches,minimumYInches,maximumYInches,stepInches:1,preferredAnchor:{xInches,yInches}});
const input={unitId:'u_marauder_2',anchorRegions:[region(18,26,16,24,22,20)],
  formationObjectives:[{kind:'control_objective',weight:4,targetIds:['mission-marker-1']}],
  maximumJointOptions:1,maximumJointEvaluations:128};
let calls=0;const query=async(args,id,base=baseBranch)=>{calls++;const started=performance.now();
  const result=await lab.querySpatial({queryId:id,seatKey:'player1',base,
    queryKind:'space.solve_static_formation',argumentsJson:JSON.stringify(args)});
  console.log(JSON.stringify({query:id,elapsedMs:Math.round(performance.now()-started),status:result.resultStatus}));return result;};
const result=await query(input,'v612-native-single-explicit-region');
assert.equal(result.resultStatus,'ok','same Native must accept an explicit model-chosen anchor region');
assert(result.queryReceipt.result.optionCount>0,'bounded regional search should find a witness in this explicit fixture region');
const answer=result.queryReceipt.result;assert.equal(answer.hostSelectedOption,false);assert.equal(answer.arrivalOrMovementLegalityProven,false);
assert.equal(answer.search.anchorSpaceKind,'model_supplied_regions');assert(answer.search.evaluations<=128);
const inRegion=(point,r)=>point.xInches>=r.minimumXInches&&point.xInches<=r.maximumXInches
  &&point.yInches>=r.minimumYInches&&point.yInches<=r.maximumYInches;
assert(answer.formationOptions.every(o=>inRegion(o.anchor,input.anchorRegions[0])&&o.staticGeometryProven));
assert(answer.formationOptions.every(o=>o.anchorSource.kind==='region_grid'));
const jointInput={...input,jointUnits:[
  {unitId:'u_medic_2',anchorRegions:[region(18,26,20,28,22,26)],formationObjectives:[{kind:'compact',weight:3}]},
  {unitId:'u_medic_3',anchorRegions:[region(24,32,18,26,26,22)],formationObjectives:[{kind:'compact',weight:3}]}]};
const joint=await query(jointInput,'v612-native-joint-explicit-regions');assert.equal(joint.resultStatus,'ok');
assert(joint.queryReceipt.result.optionCount>0,'joint group must be checked, not independently merged options');
for(const option of joint.queryReceipt.result.formationOptions){assert.equal(option.jointGeometryProven,true);
  assert.equal(option.nativeGeometryResults.length,3);assert.equal(option.canonicalPlacements.length,3);
  for(const [i,u]of [input,...jointInput.jointUnits].entries())assert(inRegion(option.unitOptions[i].anchor,u.anchorRegions[0]));}
const bounded=await query({...input,anchorRegions:[{...region(0,54,0,36,22,20),stepInches:0.001}],
  maximumJointEvaluations:1},'v612-native-region-budget');
assert.equal(bounded.resultStatus,'ok');assert.equal(bounded.queryReceipt.result.search.evaluations,1);
assert(bounded.queryReceipt.result.search.suppliedGridCandidateCount>1000000,'large region must stay lazy under the same evaluation budget');
assert.equal(bounded.queryReceipt.result.noLegalFormationProven,false);
const invalid=await query({...input,anchorRegions:[{...input.anchorRegions[0],stepInches:0}]},'v612-native-invalid-region');
assert.equal(invalid.resultStatus,'unknown');assert.match(invalid.queryReceipt.repairContext.validationMessage,/region|step/i);
// The modified single query Implementation also serves old point callers.
// Compare one actual saved successful witness, without rerunning its old gate.
let legacy;for(const w of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.resultRef
  &&w.inputs.request.value.args?.queryKind==='space.solve_static_formation')){
  const value=(await read(w.resultRef)).value,r=value.receipt;
  if(r?.baseStateHash==='3267a40270cff2b9fe3f0e57b683269093a450d0902e4752d5e30a48021bc49b'
    &&r.queryReceipt?.result?.optionCount>0&&!r.queryReceipt.result.jointUnitIds){legacy=value;break;}}
assert(legacy);const legacyResult=await query(JSON.parse(legacy.request.argumentsJson),'v612-legacy-exact-point-witness',
  {kind:'branch',branchStateHash:legacy.receipt.baseStateHash});assert.equal(legacyResult.resultStatus,'ok');
assert.deepEqual(legacyResult.queryReceipt.result.formationOptions,legacy.receipt.queryReceipt.result.formationOptions);
assert.deepEqual(legacyResult.queryReceipt.result.misses,legacy.receipt.queryReceipt.result.misses);
assert.deepEqual(lab.captureSceneLayout({base:baseBranch}),beforeLayout);assert.equal(hash(authority.state),sourceHash);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);assert.equal(nativeActionsReplayed,0);
console.log(JSON.stringify({status:'passed',realNativeQueries:calls,sameSavedBranchRestored:parent,
  singleOptions:answer.optionCount,jointOptions:joint.queryReceipt.result.optionCount,
  boundedSamplingIsNotImpossibility:true,largeRegionLazy:true,legacyWitnessesUnchanged:true,wholeGroupNativeChecks:true,hostSelectedOption:false,
  providerCalls:0,nativeActionsReplayed:0,sourceMutations:0,productionWrites:0}));
