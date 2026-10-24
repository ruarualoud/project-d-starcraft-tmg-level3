// Actual independent Marine solutions overlapped when combined. Exercise the
// shared Native query + static application + marker-control seam on that scene.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),phase=process.argv[3]??'observation';
const base=path.join(run,'workspace/decision-workflows/projection-owner'),state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const target='cbbe98c7a430253f87eb3df6131d3a0cdea380b72c83e45c848fca57d8f107d0';
let authority;for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(saved.authority.state)===state.scope.source){authority=saved.authority;break;}}
assert.ok(authority);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:'ticket27-s271-roster-workspace-lab',
  sourceRoomRef:{roomId:'ticket27-slice-271-roster-workspace-isolated-lab',stateRevision:0},sourceState:authority.state,
  matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:structuredClone(authority.state)})})});
const branches=new Map(),anchors=new Map(['u_marine_1','u_marine_2'].map(id=>[id,new Map()]));
for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.resultRef)){
  const value=(await get(work.resultRef)).value;
  if(value.receipt?.sourceStateHash!==state.scope.source)continue;
  if(value.receipt.branchStateHash)branches.set(value.receipt.branchStateHash,value);
  if(work.id.startsWith('p5-current-obligations-v577:r2:map_and_arrival:owner:owner:owner:order0:control-marker1')
    &&value.receipt.queryKind==='space.solve_static_formation')for(const option of value.receipt.queryReceipt?.result?.formationOptions??[]){
    if(anchors.has(option.pieceId))anchors.get(option.pieceId).set(JSON.stringify(option.anchor),option.anchor);}}
const restored=new Set([state.scope.source]);
function restore(id){if(restored.has(id))return;const value=branches.get(id);assert.ok(value,'saved branch '+id);
  restore(value.receipt.parentStateHash??value.receipt.baseStateHash);
  if(value.receipt.branchKind==='native_action')lab.restoreNativeActionBranch({receipt:value.receipt,base:value.request.base});
  else if(value.operation==='formation_scene')lab.restoreFormationSelectionBranch({receipt:value.receipt,base:value.request.base});
  else if(value.operation==='project_scene')lab.restoreProjectedScenarioBranch({receipt:value.receipt,base:value.request.base});
  else lab.restoreHypotheticalBranch({receipt:value.receipt,spec:value.request.spec,base:value.request.base});restored.add(id);}
restore(target);
const prior=lab.inspectQueryPrerequisites({base:{kind:'branch',branchStateHash:target},queryKind:'mission_marker_control'});
assert.match(prior.unknownReason,/MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP/);
const primary=[...anchors.get('u_marine_1').values()],other=[...anchors.get('u_marine_2').values()];
assert.ok(primary.length&&other.length,'actual model-selected alternative anchors required');
const receipt=await lab.querySpatial({queryId:'actual-joint-static-v588',base:{kind:'branch',branchStateHash:target},seatKey:'player1',
  queryKind:'space.solve_static_formation',argumentsJson:JSON.stringify({unitId:'u_marine_1',anchors:primary,
    jointUnits:[{unitId:'u_marine_2',anchors:other}],maximumJointOptions:2,maximumJointEvaluations:64})});
await fs.writeFile(path.join(root,`build/slice272-joint-static-v588-${phase}.json`),JSON.stringify({target,primary,other,receipt},null,2));
assert.equal(receipt.resultStatus,'ok','joint intent must use the same Native static geometry query, not be rejected as unknown fields');
const options=receipt.queryReceipt.result.formationOptions;assert.ok(options.length>0,'the actual alternative anchor set must yield a joint witness');
assert.ok(options.every(o=>o.jointGeometryProven&&o.canonicalPlacements.length===2));
const applied=lab.runFormationSelectionBranch({branchId:'explicit-scripted-joint-choice-v588',base:{kind:'branch',branchStateHash:target},
  selections:[{receipt,formationOptionId:options[0].formationOptionId}]});
assert.ok(applied.hypotheticalPlacementAssessment.units.every(u=>u.resultStatus==='ok'));
const control=await lab.querySpatial({queryId:'actual-joint-control-v588',base:{kind:'branch',branchStateHash:applied.branchStateHash},
  seatKey:'player1',queryKind:'mission_marker_control',argumentsJson:JSON.stringify({markerIds:['mission-marker-1'],unitIds:['u_marine_1','u_marine_2','u_goliath_1']})});
assert.equal(control.resultStatus,'ok');assert.equal(control.queryReceipt.result.awardedVictoryPoints,false);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
console.log(JSON.stringify({passed:true,actualOverlappingScene:target,anchors:[primary.length,other.length],
  jointOptions:options.length,wholeGroupApplied:true,nativeMarkerControl:true,scriptedChoiceNotAgentStrategy:true,
  sourceMutations:0,providerCalls:0,productionWrites:0}));
